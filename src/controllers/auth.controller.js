const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, fail } = require('../utils/response');

const signToken = (user) =>
  jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

const isNonEmptyString = (v) => typeof v === 'string' && v.length > 0;
const hasCredentials = (body) => isNonEmptyString(body?.email) && isNonEmptyString(body?.password);
const normalizeEmail = (email) => email.trim().toLowerCase();

exports.register = asyncHandler(async (req, res) => {
  if (!hasCredentials(req.body)) return fail(res, 400, 'email and password are required');
  const { password, firstName, lastName } = req.body;
  const email = normalizeEmail(req.body.email);

  const exists = await User.exists({ email });
  if (exists) return fail(res, 400, 'email already exists');

  const isFirstUser = (await User.countDocuments()) === 0;
  const access = isFirstUser ? { role: 'admin', approved: true } : {};

  const user = await User.create({ email, password, firstName, lastName, ...access });
  return created(res, user, isFirstUser ? 'registered as admin' : 'registered, waiting for approval');
});

exports.login = asyncHandler(async (req, res) => {
  if (!hasCredentials(req.body)) return fail(res, 400, 'email and password are required');
  const { password } = req.body;

  const user = await User.findOne({ email: normalizeEmail(req.body.email) }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return fail(res, 401, 'invalid email or password, please register');
  }
  if (!user.approved) return fail(res, 401, 'waiting for approval');

  return ok(res, { token: signToken(user), user });
});

exports.getUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  return ok(res, users);
});

const NAME_MAX_LENGTH = 50;
const PASSWORD_MIN_LENGTH = 6;

exports.getMe = (req, res) => ok(res, req.user);

exports.updateMe = asyncHandler(async (req, res) => {
  const errors = [];
  const updates = {};

  ['firstName', 'lastName'].forEach((field) => {
    const value = req.body?.[field];
    if (typeof value !== 'string' || !value.trim()) {
      errors.push(`${field} is required`);
    } else if (value.trim().length > NAME_MAX_LENGTH) {
      errors.push(`${field} must be up to ${NAME_MAX_LENGTH} characters`);
    } else {
      updates[field] = value.trim();
    }
  });
  if (errors.length) return fail(res, 400, 'validation error', errors);

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  return ok(res, user, 'profile updated');
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!isNonEmptyString(currentPassword) || !isNonEmptyString(newPassword)) {
    return fail(res, 400, 'current and new password are required');
  }
  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    return fail(res, 400, `password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    return fail(res, 400, 'current password is incorrect');
  }
  if (await user.comparePassword(newPassword)) {
    return fail(res, 400, 'new password must be different');
  }

  user.password = newPassword;
  await user.save();
  return ok(res, null, 'password changed');
});

exports.approveUser =asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
  if (!user) return fail(res, 400, 'user not found', null);
  return ok(res, user, 'approved');
});

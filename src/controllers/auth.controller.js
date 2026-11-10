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

exports.approveUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
  if (!user) return fail(res, 400, 'user not found', null);
  return ok(res, user, 'approved');
});

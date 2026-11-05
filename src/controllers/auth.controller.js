const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, fail } = require('../utils/response');

const signToken = (user) =>
  jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

// [POST] /api/v1/register  -> สมัครสมาชิก (สถานะ approved = false รอ Approve)
exports.register = asyncHandler(async (req, res) => {
  const { username, password, firstName, lastName } = req.body;
  if (!username || !password) return fail(res, 400, 'username and password are required');

  const exists = await User.exists({ username });
  if (exists) return fail(res, 400, 'username already exists');

  // ไม่รับ role / approved จาก body เพื่อกันการตั้งค่าตัวเองเป็น admin
  const user = await User.create({ username, password, firstName, lastName });
  return created(res, user, 'registered, waiting for approval');
});

// [POST] /api/v1/login
//  - ไม่มีข้อมูลในระบบ  -> 401 ให้ไปสมัครสมาชิก
//  - ยังไม่ได้รับ Approve -> 401 รอ Approve
//  - ผ่าน               -> 200 + token
exports.login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return fail(res, 400, 'username and password are required');

  const user = await User.findOne({ username }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return fail(res, 401, 'invalid username or password, please register');
  }
  if (!user.approved) return fail(res, 401, 'waiting for approval');

  return ok(res, { token: signToken(user), user });
});

// [PUT] /api/v1/users/:id/approve  (admin เท่านั้น)
exports.approveUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
  if (!user) return fail(res, 400, 'user not found', null);
  return ok(res, user, 'approved');
});

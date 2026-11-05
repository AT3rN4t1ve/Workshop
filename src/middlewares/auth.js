const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { fail } = require('../utils/response');

// ตรวจ JWT + ต้องเป็นผู้ใช้ที่ได้รับการ Approve แล้ว
async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return fail(res, 401, 'unauthorized');

  // จับเฉพาะ error ของ JWT เป็น 401
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return fail(res, 401, 'invalid or expired token');
  }

  // error จาก DB (เช่น MongoDB ล่ม) ส่งต่อให้ errorHandler ตอบ 500
  try {
    const user = await User.findById(payload.sub);
    if (!user) return fail(res, 401, 'unauthorized');
    if (!user.approved) return fail(res, 401, 'waiting for approval');
    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return fail(res, 401, 'forbidden: admin only');
  return next();
}

module.exports = { authenticate, requireAdmin };

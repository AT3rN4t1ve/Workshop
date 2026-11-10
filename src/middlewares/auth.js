const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { fail } = require('../utils/response');

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return fail(res, 401, 'unauthorized');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return fail(res, 401, 'invalid or expired token');
  }

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

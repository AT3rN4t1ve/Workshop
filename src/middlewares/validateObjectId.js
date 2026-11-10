const mongoose = require('mongoose');
const { fail } = require('../utils/response');

module.exports = (param = 'id') => (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params[param])) return fail(res, 400, 'not found', null);
  return next();
};

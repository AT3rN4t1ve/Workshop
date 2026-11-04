const { fail } = require('../utils/response');

function notFound(req, res) {
  return fail(res, 404, `route not found: ${req.method} ${req.originalUrl}`);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return fail(res, 400, 'validation error', errors);
  }
  if (err.code === 11000) {
    return fail(res, 400, `duplicate value: ${Object.keys(err.keyValue).join(', ')}`);
  }
  if (err.type === 'entity.parse.failed') {
    return fail(res, 400, 'invalid JSON body');
  }
  console.error(err);
  return fail(res, 500, 'internal server error');
}

module.exports = { notFound, errorHandler };

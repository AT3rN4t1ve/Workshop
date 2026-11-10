function send(res, status, message, data = null) {
  return res.status(status).json({ status, message, data });
}

const ok = (res, data, message = 'success') => send(res, 200, message, data);
const created = (res, data, message = 'success') => send(res, 201, message, data);
const fail = (res, status = 400, message = 'fail', data = null) => send(res, status, message, data);

module.exports = { send, ok, created, fail };

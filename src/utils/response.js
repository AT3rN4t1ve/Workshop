/**
 * รูปแบบ response มาตรฐานตาม flowchart
 * { status, message, data }
 *
 * - ไม่มีหลายรายการ      -> []        200
 * - มีหลายรายการ        -> [{..}]    200
 * - ไม่มีรายการเดียว     -> null      400
 * - มีรายการเดียว        -> {..}      200
 * - บันทึกสำเร็จ          -> {..}      201
 */
function send(res, status, message, data = null) {
  return res.status(status).json({ status, message, data });
}

const ok = (res, data, message = 'success') => send(res, 200, message, data);
const created = (res, data, message = 'success') => send(res, 201, message, data);
const fail = (res, status = 400, message = 'fail', data = null) => send(res, status, message, data);

module.exports = { send, ok, created, fail };

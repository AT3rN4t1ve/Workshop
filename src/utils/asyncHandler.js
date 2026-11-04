// ห่อ async controller ให้ส่ง error ไปที่ error middleware อัตโนมัติ
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

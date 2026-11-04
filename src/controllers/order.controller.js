const Product = require('../models/Product');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, fail } = require('../utils/response');

const populate = [
  { path: 'product', select: 'name price stock' },
  { path: 'user', select: 'username firstName lastName' },
];

// [GET] /api/v1/orders -> แสดง Order ทุกรายการ
exports.getOrders = asyncHandler(async (_req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 }).populate(populate);
  return ok(res, orders);
});

// [GET] /api/v1/products/:id/orders -> แสดง Order ทั้งหมดของ Product
exports.getProductOrders = asyncHandler(async (req, res) => {
  const exists = await Product.exists({ _id: req.params.id });
  if (!exists) return fail(res, 400, 'product not found', null);

  const orders = await Order.find({ product: req.params.id }).sort({ createdAt: -1 }).populate(populate);
  return ok(res, orders);
});

// [POST] /api/v1/products/:id/orders -> เพิ่ม Order ใน Product
//  เงื่อนไข: Order ต้องไม่เกินกว่าใน Stock Product
//   - ไม่ผ่าน -> ไม่สามารถเพิ่ม Order ได้ (400)
//   - ผ่าน   -> ตัด stock + บันทึก Order (201)
exports.createProductOrder = asyncHandler(async (req, res) => {
  const quantity = Number(req.body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) {
    return fail(res, 400, 'quantity must be an integer greater than 0');
  }

  const product = await Product.findById(req.params.id);
  if (!product) return fail(res, 400, 'product not found', null);

  // ตัด stock แบบ atomic: อัปเดตเฉพาะเมื่อ stock >= quantity กัน order ซ้อนพร้อมกันจนติดลบ
  const updated = await Product.findOneAndUpdate(
    { _id: product._id, stock: { $gte: quantity } },
    { $inc: { stock: -quantity } },
    { new: true }
  );
  if (!updated) {
    return fail(res, 400, `cannot create order: quantity exceeds stock (stock: ${product.stock})`);
  }

  try {
    const order = await Order.create({
      product: updated._id,
      user: req.user._id,
      quantity,
      unitPrice: updated.price,
      totalPrice: updated.price * quantity,
    });
    await order.populate(populate);
    return created(res, order);
  } catch (err) {
    // บันทึก order ไม่สำเร็จ -> คืน stock
    await Product.updateOne({ _id: updated._id }, { $inc: { stock: quantity } });
    throw err;
  }
});

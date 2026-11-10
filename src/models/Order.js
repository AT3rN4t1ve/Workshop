const mongoose = require('mongoose');

// สถานะของออเดอร์: รอรับ -> กำลังทำ -> เสร็จแล้ว (ยกเลิกได้ก่อนเสร็จ)
const STATUSES = ['pending', 'cooking', 'done', 'cancelled'];

const orderSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    // ชื่อสินค้า ณ เวลาที่สั่ง ไว้แสดงเมื่อ Product ถูกลบไปแล้ว (populate ได้ null)
    productName: { type: String, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quantity: { type: Number, required: true, min: 1 },
    // ตัวเลือกที่ลูกค้าเลือก เก็บชื่อและราคา ณ เวลาที่สั่ง เมนูถูกแก้ทีหลังไม่กระทบ
    options: {
      type: [
        new mongoose.Schema(
          {
            group: { type: String, required: true },
            choice: { type: String, required: true },
            price: { type: Number, min: 0, default: 0 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    note: { type: String, trim: true, maxlength: 200, default: '' },
    status: { type: String, enum: STATUSES, default: 'pending', index: true },
    unitPrice: { type: Number, required: true, min: 0 }, // ราคาเมนู + ตัวเลือก ต่อ 1 จาน
    totalPrice: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Order', orderSchema);
module.exports.STATUSES = STATUSES;

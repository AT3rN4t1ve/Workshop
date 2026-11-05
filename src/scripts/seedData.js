// เพิ่มข้อมูลตัวอย่างสำหรับเดโม: สินค้าร้านเครื่องเขียน + user ทดสอบ + Order ตัวอย่าง
// รันซ้ำได้: สินค้าที่ชื่อซ้ำจะถูกรีเซ็ตเป็นค่าเริ่มต้น, user ที่มีอยู่แล้วจะข้าม,
// Order ของสินค้าตัวอย่างจะถูกล้างแล้วสร้างใหม่ (stock จึงตรงกับ Order เสมอ)
// ใช้ `npm run seed:data -- --reset` ถ้าต้องการล้าง Product และ Order ทั้งหมดก่อน
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

const products = [
  { name: 'ปากกาลูกลื่น สีน้ำเงิน', description: 'หัว 0.5 mm', price: 15, stock: 50 },
  { name: 'สมุดโน้ต A5', description: '80 แผ่น ไม่มีเส้น', price: 45, stock: 30 },
  { name: 'ไฮไลท์ สีเหลือง', description: 'หัวตัด', price: 25, stock: 20 },
  { name: 'แฟ้มเอกสาร A4', description: 'สันกว้าง 2 นิ้ว', price: 89, stock: 10 },
  { name: 'เครื่องคิดเลข', description: '12 หลัก (stock น้อย ไว้เดโมเคสสั่งเกิน stock)', price: 350, stock: 2 },
];

const users = [
  { username: 'somchai', password: '123456', firstName: 'สมชาย', lastName: 'ใจดี', approved: true },
  { username: 'somying', password: '123456', firstName: 'สมหญิง', lastName: 'รักเรียน', approved: true },
  // ตั้งใจให้ยังไม่ approved ไว้เดโมเคส Login ได้ 403 และขั้นตอน Approve
  { username: 'newbie', password: '123456', firstName: 'มือใหม่', lastName: 'รออนุมัติ', approved: false },
];

// Order ตัวอย่าง (อ้างอิงด้วยชื่อ user + ชื่อสินค้า)
// เครื่องคิดเลขถูกซื้อไป 1 จาก 2 → เหลือ 1 ตอนเดโมสั่ง 2 ชิ้นจะได้ 400 ทันที
const orders = [
  { username: 'somchai', product: 'ปากกาลูกลื่น สีน้ำเงิน', quantity: 2 },
  { username: 'somchai', product: 'สมุดโน้ต A5', quantity: 1 },
  { username: 'somying', product: 'ไฮไลท์ สีเหลือง', quantity: 3 },
  { username: 'somying', product: 'ปากกาลูกลื่น สีน้ำเงิน', quantity: 5 },
  { username: 'somying', product: 'เครื่องคิดเลข', quantity: 1 },
];

(async () => {
  const reset = process.argv.includes('--reset');
  try {
    await connectDB();

    if (reset) {
      const o = await Order.deleteMany({});
      const p = await Product.deleteMany({});
      console.log(`Reset: deleted ${p.deletedCount} products, ${o.deletedCount} orders`);
    }

    console.log('\nProducts');
    for (const item of products) {
      const doc = await Product.findOneAndUpdate({ name: item.name }, item, {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      });
      console.log(`  ✓ ${doc.name}  ราคา ${doc.price}  stock ${doc.stock}  id ${doc._id}`);
    }

    console.log('\nUsers');
    for (const item of users) {
      const exists = await User.findOne({ username: item.username });
      if (exists) {
        console.log(`  - ${item.username} มีอยู่แล้ว (ข้าม)`);
        continue;
      }
      // ใช้ create เพื่อให้ pre('save') เข้ารหัส password
      await User.create(item);
      console.log(`  ✓ ${item.username} / ${item.password}  ${item.approved ? 'approved' : 'รอ Approve'}`);
    }

    // ---------- Orders ----------
    // ล้าง Order เดิมของสินค้าตัวอย่างก่อน (stock เพิ่งถูกรีเซ็ตด้านบน) แล้วสร้างใหม่ + ตัด stock จริง
    console.log('\nOrders');
    const seededProducts = await Product.find({ name: { $in: products.map((p) => p.name) } });
    const byName = Object.fromEntries(seededProducts.map((p) => [p.name, p]));
    await Order.deleteMany({ product: { $in: seededProducts.map((p) => p._id) } });

    for (const item of orders) {
      const user = await User.findOne({ username: item.username });
      const product = byName[item.product];
      if (!user || !product) {
        console.log(`  ! ข้าม ${item.username} → ${item.product} (ไม่พบ user หรือสินค้า)`);
        continue;
      }
      // ใช้เงื่อนไขเดียวกับ API: ตัด stock เฉพาะเมื่อ stock พอ
      const updated = await Product.findOneAndUpdate(
        { _id: product._id, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );
      if (!updated) {
        console.log(`  ! ข้าม ${item.username} → ${item.product} x${item.quantity} (stock ไม่พอ)`);
        continue;
      }
      await Order.create({
        product: updated._id,
        user: user._id,
        quantity: item.quantity,
        unitPrice: updated.price,
        totalPrice: updated.price * item.quantity,
      });
      console.log(
        `  ✓ ${item.username} สั่ง ${item.product} x${item.quantity} = ${updated.price * item.quantity} บาท  (stock เหลือ ${updated.stock})`
      );
    }

    console.log('\nDone');
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();

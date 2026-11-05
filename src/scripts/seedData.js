// เพิ่มข้อมูลตัวอย่างสำหรับเดโม: สินค้าร้านเครื่องเขียน + user ทดสอบ (approved แล้ว)
// รันซ้ำได้: สินค้าที่ชื่อซ้ำจะถูกอัปเดตกลับเป็นค่าเริ่มต้น, user ที่มีอยู่แล้วจะข้าม
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

    console.log('\nDone');
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();

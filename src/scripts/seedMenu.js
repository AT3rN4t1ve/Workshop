// เพิ่มเมนูตัวอย่างของร้านอาหารตามสั่ง (หมวดหมู่ + กลุ่มตัวเลือก)
//
//   node src/scripts/seedMenu.js            เพิ่ม/อัปเดตเมนูตัวอย่าง (เทียบจากชื่อเมนู) ข้อมูลอื่นไม่ถูกแตะ
//   node src/scripts/seedMenu.js --reset    ลบ Product และ Order ทั้งหมดก่อน แล้วค่อยเพิ่มเมนูตัวอย่าง
//
// ไม่ยุ่งกับ User — ผู้ใช้เดิมยัง login ได้ตามปกติ
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const Order = require('../models/Order');

// ---------- กลุ่มตัวเลือกที่ใช้ซ้ำหลายเมนู ----------
const choices = (...items) => items.map(([name, price = 0]) => ({ name, price }));

const meat = {
  name: 'เนื้อสัตว์',
  isRequired: true,
  isMultiple: false,
  choices: choices(['หมูสับ'], ['ไก่'], ['หมูชิ้น'], ['หมูกรอบ', 10], ['กุ้ง', 15], ['ทะเลรวม', 20]),
};
const size = {
  name: 'ขนาด',
  isRequired: true,
  isMultiple: false,
  choices: choices(['ธรรมดา'], ['พิเศษ', 10]),
};
const spicy = {
  name: 'ความเผ็ด',
  isRequired: false,
  isMultiple: false,
  choices: choices(['ไม่เผ็ด'], ['เผ็ดน้อย'], ['เผ็ดกลาง'], ['เผ็ดมาก']),
};
const extra = {
  name: 'เพิ่มเติม',
  isRequired: false,
  isMultiple: true,
  choices: choices(['ไข่ดาว', 10], ['ไข่เจียว', 10], ['ข้าวเพิ่ม', 5]),
};
const noodle = {
  name: 'เส้น',
  isRequired: true,
  isMultiple: false,
  choices: choices(['เส้นใหญ่'], ['เส้นเล็ก'], ['เส้นหมี่'], ['บะหมี่'], ['วุ้นเส้น']),
};
const sweet = {
  name: 'ความหวาน',
  isRequired: true,
  isMultiple: false,
  choices: choices(['หวานปกติ'], ['หวานน้อย'], ['ไม่หวาน']),
};

// ---------- เมนู ----------
const menu = [
  // ข้าวราด / จานเดียว
  { name: 'ข้าวกะเพรา', category: 'จานเดียว', description: 'กะเพราผัดไฟแรง ราดข้าวสวยร้อนๆ', price: 50, stock: 40, optionGroups: [meat, size, spicy, extra] },
  { name: 'ข้าวผัด', category: 'จานเดียว', description: 'ข้าวผัดหอมกระทะ เสิร์ฟพร้อมแตงกวาและมะนาว', price: 50, stock: 40, optionGroups: [meat, size, extra] },
  { name: 'ข้าวกระเทียมพริกไทย', category: 'จานเดียว', description: 'ผัดกระเทียมพริกไทยหอมๆ ราดข้าว', price: 50, stock: 30, optionGroups: [meat, size, extra] },
  { name: 'ข้าวพริกแกง', category: 'จานเดียว', description: 'ผัดพริกแกงถั่วฝักยาว รสจัดจ้าน', price: 50, stock: 30, optionGroups: [meat, size, spicy, extra] },
  { name: 'ข้าวไข่เจียว', category: 'จานเดียว', description: 'ไข่เจียวฟูกรอบ ราดข้าวสวย', price: 35, stock: 50, optionGroups: [
    { name: 'ใส่เพิ่ม', isRequired: false, isMultiple: true, choices: choices(['หมูสับ', 10], ['กุ้งสับ', 15], ['หอมใหญ่', 5]) },
    size,
  ] },
  { name: 'ข้าวหมูกรอบคะน้า', category: 'จานเดียว', description: 'คะน้าผัดหมูกรอบน้ำมันหอย', price: 60, stock: 4, optionGroups: [size, spicy, extra] },

  // เส้น
  { name: 'ผัดซีอิ๊ว', category: 'เส้น', description: 'ผัดซีอิ๊วใส่ไข่และคะน้า', price: 50, stock: 30, optionGroups: [noodle, meat, size] },
  { name: 'ราดหน้า', category: 'เส้น', description: 'ราดหน้าน้ำข้น เส้นผัดหอมกระทะ', price: 50, stock: 30, optionGroups: [noodle, meat, size] },
  { name: 'ผัดไทย', category: 'เส้น', description: 'ผัดไทยเส้นจันท์ ใส่ไข่ เสิร์ฟพร้อมผักเคียง', price: 55, stock: 25, optionGroups: [
    { name: 'เนื้อสัตว์', isRequired: true, isMultiple: false, choices: choices(['กุ้งแห้ง'], ['กุ้งสด', 15], ['ทะเลรวม', 20]) },
    size,
  ] },
  { name: 'สุกี้', category: 'เส้น', description: 'สุกี้วุ้นเส้น น้ำจิ้มสูตรร้าน', price: 55, stock: 25, optionGroups: [
    { name: 'แบบ', isRequired: true, isMultiple: false, choices: choices(['น้ำ'], ['แห้ง']) },
    meat,
    size,
  ] },

  // กับข้าว
  { name: 'ต้มยำ', category: 'กับข้าว', description: 'ต้มยำรสจัด หอมเครื่องสมุนไพร', price: 90, stock: 15, optionGroups: [
    { name: 'น้ำซุป', isRequired: true, isMultiple: false, choices: choices(['น้ำใส'], ['น้ำข้น']) },
    { name: 'เนื้อสัตว์', isRequired: true, isMultiple: false, choices: choices(['ไก่'], ['กุ้ง', 30], ['ทะเลรวม', 40]) },
    spicy,
  ] },
  { name: 'ผัดผักรวม', category: 'กับข้าว', description: 'ผักรวมผัดน้ำมันหอย', price: 60, stock: 20, optionGroups: [
    { name: 'เนื้อสัตว์', isRequired: false, isMultiple: false, choices: choices(['หมูชิ้น', 10], ['กุ้ง', 20], ['หมูกรอบ', 20]) },
  ] },
  { name: 'ไข่เจียวหมูสับ', category: 'กับข้าว', description: 'ไข่เจียวหมูสับจานใหญ่ สำหรับกินกับข้าว', price: 50, stock: 20, optionGroups: [] },

  // ของทานเล่น
  { name: 'ไข่ดาว', category: 'ของทานเล่น', description: 'ไข่ดาวทอดกรอบขอบ', price: 10, stock: 60, optionGroups: [
    { name: 'ความสุก', isRequired: true, isMultiple: false, choices: choices(['ไม่สุก'], ['สุกปานกลาง'], ['สุกมาก']) },
  ] },
  { name: 'ข้าวสวย', category: 'ของทานเล่น', description: 'ข้าวหอมมะลิหุงใหม่', price: 10, stock: 100, optionGroups: [] },

  // เครื่องดื่ม
  { name: 'ชาไทยเย็น', category: 'เครื่องดื่ม', description: 'ชาไทยเข้มข้น หอมมัน', price: 25, stock: 40, optionGroups: [sweet] },
  { name: 'ชามะนาว', category: 'เครื่องดื่ม', description: 'ชามะนาวเปรี้ยวหวาน ชื่นใจ', price: 25, stock: 40, optionGroups: [sweet] },
  { name: 'น้ำเปล่า', category: 'เครื่องดื่ม', description: 'น้ำดื่มขวดเย็น', price: 10, stock: 0, optionGroups: [] },
];

(async () => {
  const reset = process.argv.includes('--reset');
  try {
    await connectDB();

    if (reset) {
      const orders = await Order.deleteMany({});
      const products = await Product.deleteMany({});
      console.log(`Reset: deleted ${products.deletedCount} products, ${orders.deletedCount} orders`);
    }

    for (const item of menu) {
      const doc = await Product.findOneAndUpdate({ name: item.name }, item, {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      });
      const groups = doc.optionGroups.map((g) => g.name).join(', ') || '-';
      console.log(`  ✓ [${doc.category}] ${doc.name}  ฿${doc.price}  stock ${doc.stock}  ตัวเลือก: ${groups}`);
    }

    console.log(`\nDone: ${menu.length} menu items (total products: ${await Product.countDocuments()})`);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();

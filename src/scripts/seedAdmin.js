// สร้าง admin คนแรก (approved แล้ว) เพื่อใช้ approve ผู้ใช้คนอื่น
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin1234';
  try {
    await connectDB();
    const existing = await User.findOne({ username });
    if (existing) {
      existing.role = 'admin';
      existing.approved = true;
      await existing.save();
      console.log(`Admin "${username}" already exists — ensured role=admin, approved=true`);
    } else {
      await User.create({ username, password, role: 'admin', approved: true, firstName: 'Admin' });
      console.log(`Admin "${username}" created`);
    }
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();

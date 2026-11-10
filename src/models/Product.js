const mongoose = require('mongoose');

// ตัวเลือกย่อย 1 ตัว เช่น "หมูกรอบ" (+10 บาท)
const choiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, min: 0, default: 0 }, // ราคาที่บวกเพิ่มจากราคาเมนู
  },
  { _id: false }
);

// กลุ่มตัวเลือกของเมนู เช่น "เนื้อสัตว์", "ขนาด", "ท็อปปิ้ง"
const optionGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    isRequired: { type: Boolean, default: false }, // ลูกค้าต้องเลือกอย่างน้อย 1 อย่าง
    isMultiple: { type: Boolean, default: false }, // เลือกได้หลายอย่าง (เช่น ท็อปปิ้ง)
    choices: {
      type: [choiceSchema],
      validate: [
        { validator: (v) => v.length > 0, message: 'option group must have at least one choice' },
        { validator: (v) => new Set(v.map((c) => c.name)).size === v.length, message: 'duplicate choice name in option group' },
      ],
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, default: 'อื่นๆ' },
    imageUrl: { type: String, trim: true, default: '' },
    price: { type: Number, required: true, min: 0 }, // ราคาเริ่มต้น ยังไม่รวมตัวเลือก
    // จำนวนที่ยังขายได้ (จาน/ที่)
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: { validator: Number.isInteger, message: 'stock must be an integer' },
    },
    optionGroups: {
      type: [optionGroupSchema],
      default: [],
      validate: {
        validator: (v) => new Set(v.map((g) => g.name)).size === v.length,
        message: 'duplicate option group name',
      },
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Product', productSchema);

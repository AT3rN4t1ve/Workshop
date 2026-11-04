# Shop API (Express.js + MongoDB + Mongoose)

ระบบผู้ใช้ ↔ ร้านค้า ตาม flowchart: สมัครสมาชิก → รอ Approve → เข้าสู่ระบบ → จัดการ Product / Order (ตรวจ stock ก่อนบันทึก Order)

## ติดตั้งและรัน

```bash
npm install
cp .env.example .env          # แก้ MONGO_URI / JWT_SECRET ตามเครื่อง
npm run seed:admin            # สร้าง admin คนแรก (approved แล้ว) ไว้ approve คนอื่น
npm run dev                   # หรือ npm start
```

Base URL: `http://localhost:3000/api/v1`

## โครงสร้าง

```
src/
├── app.js / server.js
├── config/db.js
├── models/            User, Product, Order
├── controllers/       auth, product, order
├── routes/index.js
├── middlewares/       auth (JWT + approved), validateObjectId, errorHandler
├── utils/             response, asyncHandler
└── scripts/seedAdmin.js
```

## Response format

ทุก endpoint ตอบกลับรูปแบบเดียวกัน

```json
{ "status": 200, "message": "success", "data": [] }
```

| กรณี | data | status |
|---|---|---|
| ไม่มีหลายรายการ | `[]` | 200 |
| มีหลายรายการ | `[{...}, {...}]` | 200 |
| ไม่มีรายการเดียว | `null` | 400 |
| มีรายการเดียว | `{...}` | 200 |
| บันทึกสำเร็จ | `{...}` | 201 |

## Endpoints

| Method | Path | Auth | คำอธิบาย |
|---|---|---|---|
| POST | `/register` | - | สมัครสมาชิก (approved = false) |
| POST | `/login` | - | เข้าสู่ระบบ → ได้ JWT (ไม่มีบัญชี 401 / ยังไม่ Approve 403) |
| PUT | `/users/:id/approve` | admin | Approve ผู้ใช้ |
| GET | `/products` | user | แสดงรายการ Product ทั้งหมด |
| GET | `/products/:id` | user | ดูรายการ Product 1 รายการ |
| POST | `/products` | user | เพิ่มรายการ Product |
| PUT | `/products/:id` | user | แก้ไขรายการ Product |
| DELETE | `/products/:id` | user | ลบรายการ Product |
| GET | `/orders` | user | แสดง Order ทุกรายการ |
| GET | `/products/:id/orders` | user | แสดง Order ทั้งหมดของ Product |
| POST | `/products/:id/orders` | user | เพิ่ม Order ใน Product (quantity ต้องไม่เกิน stock) |

Route ที่ต้อง auth ให้ส่ง header `Authorization: Bearer <token>` และผู้ใช้ต้องได้รับการ Approve แล้ว

## ตัวอย่าง body

```jsonc
// POST /register
{ "username": "bob", "password": "123456", "firstName": "Bob", "lastName": "Lee" }

// POST /login
{ "username": "bob", "password": "123456" }

// POST /products, PUT /products/:id
{ "name": "Pen", "description": "Blue pen", "price": 10, "stock": 5 }

// POST /products/:id/orders
{ "quantity": 3 }
```

## Business rules

- เพิ่ม Order: ตัด stock แบบ atomic (`findOneAndUpdate` กับเงื่อนไข `stock >= quantity`) กัน order ที่ยิงพร้อมกันทำให้ stock ติดลบ ถ้าเกิน stock ตอบ 400 "cannot create order"
- Order เก็บ `unitPrice` / `totalPrice` ณ เวลาสั่ง ราคา Product เปลี่ยนทีหลังไม่กระทบ Order เดิม
- `/register` ไม่รับ `role` / `approved` จาก body กันการตั้งตัวเองเป็น admin
- id ผิดรูปแบบหรือไม่พบ → `data: null`, status 400 ตาม flowchart

# Shop API (Express.js + MongoDB + Mongoose)

ระบบผู้ใช้ ↔ ร้านค้า ตาม flowchart: สมัครสมาชิก → รอ Approve → เข้าสู่ระบบ → จัดการ Product / Order (ตรวจ stock ก่อนบันทึก Order)

## สิ่งที่ต้องมี

- Node.js
- MongoDB ที่รันอยู่ (ค่าเริ่มต้น `localhost:27017`) — connection string ยังไม่รองรับ username/password ของ MongoDB

## ติดตั้งและรัน

```bash
npm install
cp .env.example .env          # แก้ DB_Host / DB_Port / DB_Name / JWT_SECRET ตามเครื่อง (Windows cmd ใช้ copy .env.example .env)
npm run seed:admin            # สร้าง admin คนแรก (approved แล้ว) ไว้ approve คนอื่น
npm run seed:data             # (ไม่บังคับ) สินค้าตัวอย่าง 5 ชิ้น + user ทดสอบ 3 คน + Order ตัวอย่าง 5 รายการ
npm run seed:data -- --reset  # ล้าง Product/Order ทั้งหมดก่อน แล้วค่อยใส่ข้อมูลตัวอย่าง
npm run dev                   # หรือ npm start
```

Base URL: `http://localhost:3000/api/v1`

## Environment variables

| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `PORT` | `3000` | พอร์ตของ server |
| `DB_Host` | `localhost` | host ของ MongoDB |
| `DB_Port` | `27017` | port ของ MongoDB |
| `DB_Name` | `WorkShop` | ชื่อ database |
| `JWT_SECRET` | - | **ต้องตั้งค่า** ไม่งั้น server ไม่ยอมรัน |
| `JWT_EXPIRES_IN` | `1d` | อายุของ token |
| `ADMIN_USERNAME` | `admin` | username ของ admin ที่สร้างด้วย `seed:admin` |
| `ADMIN_PASSWORD` | `admin1234` | password ของ admin ที่สร้างด้วย `seed:admin` |

## บัญชีทดสอบ (จาก seed)

| username | password | สถานะ |
|---|---|---|
| `admin` | `admin1234` | admin, approved (จาก `seed:admin`) |
| `somchai` | `123456` | user, approved |
| `somying` | `123456` | user, approved |
| `newbie` | `123456` | user, **ยังไม่ Approve** ใช้ทดสอบ login ได้ 401 และขั้นตอน Approve |

หลัง seed สินค้า "เครื่องคิดเลข" จะเหลือ stock 1 ชิ้น ใช้ทดสอบการสั่งเกิน stock (สั่ง 2 ชิ้นจะได้ 400)

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
└── scripts/           seedAdmin, seedData
```

## Flow การทำงาน

### 1. Flow ของผู้ใช้ (สมัคร → Approve → ใช้งาน)

```mermaid
flowchart TD
    A["POST /register"] --> B["สร้าง User<br/>approved = false"]
    B --> C{"admin Approve แล้ว?<br/>PUT /users/:id/approve"}
    C -- ยัง --> D["POST /login → 401<br/>waiting for approval"]
    D --> C
    C -- แล้ว --> E["POST /login"]
    E --> F{"username / password ถูก?"}
    F -- ไม่ถูก / ไม่มีบัญชี --> G["401 ให้ไปสมัครสมาชิก"]
    F -- ถูก --> H["200 + JWT token"]
    H --> I["เรียก /products, /orders<br/>พร้อม Authorization: Bearer &lt;token&gt;"]
```

1. ผู้ใช้สมัครผ่าน `POST /register` → ระบบสร้าง User ที่ `approved = false` (role เป็น `user` เสมอ)
2. admin (สร้างจาก `npm run seed:admin`) login แล้วเรียก `PUT /users/:id/approve` เพื่อ Approve
3. ผู้ใช้ login ด้วย `POST /login` → ได้ JWT (อายุตาม `JWT_EXPIRES_IN`) ถ้ายังไม่ Approve จะได้ 401
4. ใช้ token ใน header `Authorization: Bearer <token>` เพื่อจัดการ Product / Order

### 2. เส้นทางของ request ภายใน server

```mermaid
flowchart LR
    R["Request"] --> M["cors → express.json → morgan<br/>(app.js)"]
    M --> RT["router /api/v1<br/>(routes/index.js)"]
    RT --> AU["authenticate<br/>ตรวจ JWT + approved"]
    AU --> AD["requireAdmin<br/>(เฉพาะ route approve)"]
    AD --> V["validateObjectId<br/>(route ที่มี :id)"]
    V --> CT["controller"]
    CT --> RES["ok / created / fail<br/>(utils/response)"]
    CT -. throw .-> EH["errorHandler"]
    RT -. ไม่มี route .-> NF["notFound → 400"]
```

| ขั้น | ไฟล์ | ทำอะไร | ถ้าไม่ผ่าน |
|---|---|---|---|
| 1 | `app.js` | เปิด CORS, แปลง JSON body, log request | JSON พัง → 400 `invalid JSON body` |
| 2 | `routes/index.js` | `/register`, `/login` ผ่านได้เลย ส่วน route อื่นต้องผ่าน `authenticate` | ไม่มี route → 400 `route not found` |
| 3 | `middlewares/auth.js` → `authenticate` | ตรวจ `Bearer` token, verify JWT, หา User, เช็ค `approved` แล้วใส่ `req.user` | 401 |
| 4 | `middlewares/auth.js` → `requireAdmin` | เช็ค `role === 'admin'` (ใช้กับ `/users/:id/approve`) | 401 `forbidden: admin only` |
| 5 | `middlewares/validateObjectId.js` | เช็คว่า `:id` เป็น ObjectId ที่ถูกรูปแบบ | 400 `data: null` |
| 6 | `controllers/*` | ทำงานกับ MongoDB ผ่าน Mongoose แล้วตอบด้วย `utils/response` | 400 ตามกรณี |
| 7 | `middlewares/errorHandler.js` | จับ error ที่ throw ออกมา (ผ่าน `asyncHandler`) | Validation / duplicate → 400, อื่นๆ → 500 |

### 3. Flow การเพิ่ม Order (`POST /products/:id/orders`)

```mermaid
flowchart TD
    S["รับ { quantity }"] --> Q{"quantity เป็นจำนวนเต็ม ≥ 1?"}
    Q -- ไม่ --> E1["400 quantity must be an integer"]
    Q -- ใช่ --> P{"พบ Product?"}
    P -- ไม่ --> E2["400 product not found (data: null)"]
    P -- พบ --> U{"ตัด stock แบบ atomic<br/>stock >= quantity?"}
    U -- ไม่พอ --> E3["400 cannot create order"]
    U -- พอ --> O["บันทึก Order<br/>unitPrice, totalPrice"]
    O -- สำเร็จ --> OK["201 + Order"]
    O -- ล้มเหลว --> RB["คืน stock แล้วส่ง error ต่อ"]
```

1. ตรวจ `quantity` ต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป
2. หา Product จาก `:id` ไม่พบ → 400
3. ตัด stock ด้วย `findOneAndUpdate({ stock: { $gte: quantity } }, { $inc: { stock: -quantity } })` ในคำสั่งเดียว ถ้า stock ไม่พอจะไม่มีการอัปเดต → 400
4. สร้าง Order โดยบันทึก `unitPrice` และ `totalPrice = price × quantity` ณ เวลาสั่ง
5. ถ้าบันทึก Order ไม่สำเร็จ จะคืน stock กลับให้ Product

### 4. ลำดับการลองใช้งาน

1. `npm run seed:admin` แล้ว `npm run dev`
2. `POST /register` สมัคร user ใหม่ → จด `_id` จาก response
3. `POST /login` ด้วย admin → ได้ token ของ admin
4. `PUT /users/<_id>/approve` ด้วย token ของ admin
5. `POST /login` ด้วย user ใหม่ → ได้ token ของ user
6. `POST /products` เพิ่มสินค้า → จด `_id` ของสินค้า
7. `POST /products/<productId>/orders` กับ `{ "quantity": 1 }` → stock ลดลง
8. `GET /orders` หรือ `GET /products/<productId>/orders` ดู Order ที่สร้าง

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

สถานะ status: 200 สำเร็จ · 201 สร้างสำเร็จ · 400 ไม่สำเร็จ · 401 ไม่มีสิทธิ์ · 500 ไม่ทราบสาเหตุ

กรณี error อื่นๆ

- Validation error → 400 และ `data` เป็น array ของข้อความ error เช่น `{ "status": 400, "message": "validation error", "data": ["..."] }`
- เรียก route ที่ไม่มีอยู่ → 400 `route not found`
- ไม่ส่ง token / token หมดอายุ / ยังไม่ Approve / ไม่ใช่ admin → 401 (ใช้ 401 ตาม flowchart ไม่ใช้ 403)

## Endpoints

| Method | Path | Auth | คำอธิบาย |
|---|---|---|---|
| POST | `/register` | - | สมัครสมาชิก (approved = false) |
| POST | `/login` | - | เข้าสู่ระบบ → ได้ JWT (ไม่มีบัญชี / ยังไม่ Approve → 401) |
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
// → 200 { "status": 200, "message": "success", "data": { "token": "<JWT>", "user": { ... } } }

// POST /products, PUT /products/:id
{ "name": "Pen", "description": "Blue pen", "price": 10, "stock": 5 }

// POST /products/:id/orders
{ "quantity": 3 }
```

Validation

- `username` ยาวอย่างน้อย 3 ตัวอักษรและห้ามซ้ำ, `password` ยาวอย่างน้อย 6 ตัวอักษร
- Product ต้องมี `name` และ `price`, ส่วน `price` และ `stock` ต้องไม่ติดลบ
- `quantity` ต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป

> เติม stock ใช้ `PUT /products/:id` กับ `{ "stock": 10 }` (ตั้งค่า stock ใหม่)

## Business rules

- เพิ่ม Order: ตัด stock แบบ atomic (`findOneAndUpdate` กับเงื่อนไข `stock >= quantity`) กัน order ที่ยิงพร้อมกันทำให้ stock ติดลบ ถ้าเกิน stock ตอบ 400 "cannot create order"
- Order เก็บ `unitPrice` / `totalPrice` ณ เวลาสั่ง ราคา Product เปลี่ยนทีหลังไม่กระทบ Order เดิม
- `/register` ไม่รับ `role` / `approved` จาก body กันการตั้งตัวเองเป็น admin
- id ผิดรูปแบบหรือไม่พบ → `data: null`, status 400 ตาม flowchart
- ลบ Product แล้ว Order เดิมของสินค้านั้นยังอยู่ แต่ field `product` ใน Order จะเป็น `null` ตอนดึงข้อมูล

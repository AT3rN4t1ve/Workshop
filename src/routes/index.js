const { Router } = require('express');
const auth = require('../controllers/auth.controller');
const product = require('../controllers/product.controller');
const order = require('../controllers/order.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const validateId = require('../middlewares/validateObjectId');

const router = Router();

// ---------- Auth ----------
router.post('/register', auth.register);
router.post('/login', auth.login);
router.get('/users', authenticate, requireAdmin, auth.getUsers);
router.put('/users/:id/approve', authenticate, requireAdmin, validateId(), auth.approveUser);

// ---------- ทุก route ด้านล่างต้อง login + approved แล้ว ----------
router.use(authenticate);

// Products: ทุกคนดูได้ แต่เพิ่ม/แก้ไข/ลบ ได้เฉพาะ admin
router.get('/products', product.getProducts);
router.post('/products', requireAdmin, product.createProduct);
router.get('/products/:id', validateId(), product.getProduct);
router.put('/products/:id', requireAdmin, validateId(), product.updateProduct);
router.delete('/products/:id', requireAdmin, validateId(), product.deleteProduct);

// Orders: admin เห็นทุกรายการ ส่วน user เห็นเฉพาะ Order ของตัวเอง (กรองใน controller)
router.get('/orders', order.getOrders);
router.get('/products/:id/orders', validateId(), order.getProductOrders);
router.post('/products/:id/orders', validateId(), order.createProductOrder);
// เปลี่ยนสถานะ: admin เดินสถานะได้ทั้งหมด ส่วน user ยกเลิกได้เฉพาะของตัวเองที่ยังรอรับ (ตรวจใน controller)
router.put('/orders/:id/status', validateId(), order.updateOrderStatus);

module.exports = router;

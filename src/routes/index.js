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
router.put('/users/:id/approve', authenticate, requireAdmin, validateId(), auth.approveUser);

// ---------- ทุก route ด้านล่างต้อง login + approved แล้ว ----------
router.use(authenticate);

// Products
router.get('/products', product.getProducts);
router.post('/products', product.createProduct);
router.get('/products/:id', validateId(), product.getProduct);
router.put('/products/:id', validateId(), product.updateProduct);
router.delete('/products/:id', validateId(), product.deleteProduct);

// Orders
router.get('/orders', order.getOrders);
router.get('/products/:id/orders', validateId(), order.getProductOrders);
router.post('/products/:id/orders', validateId(), order.createProductOrder);

module.exports = router;

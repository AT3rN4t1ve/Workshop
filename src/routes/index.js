const { Router } = require('express');
const auth = require('../controllers/auth.controller');
const product = require('../controllers/product.controller');
const order = require('../controllers/order.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const validateId = require('../middlewares/validateObjectId');

const router = Router();

router.post('/register', auth.register);
router.post('/login', auth.login);
router.get('/users', authenticate, requireAdmin, auth.getUsers);
router.put('/users/:id/approve', authenticate, requireAdmin, validateId(), auth.approveUser);

router.use(authenticate);

router.get('/products', product.getProducts);
router.post('/products', requireAdmin, product.createProduct);
router.get('/products/:id', validateId(), product.getProduct);
router.put('/products/:id', requireAdmin, validateId(), product.updateProduct);
router.delete('/products/:id', requireAdmin, validateId(), product.deleteProduct);

router.get('/orders', order.getOrders);
router.get('/products/:id/orders', validateId(), order.getProductOrders);
router.post('/products/:id/orders', validateId(), order.createProductOrder);
router.put('/orders/:id/status', validateId(), order.updateOrderStatus);

module.exports = router;

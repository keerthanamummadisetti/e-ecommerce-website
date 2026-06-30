const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/auth');

// Public endpoints
router.get('/', productController.getProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/category/:cat', productController.getProductsByCategory);
router.get('/:id', productController.getProductById);

// Secured endpoints (Admins and Sellers only)
router.get('/upload/presign', authenticate, authorize(['ADMIN', 'SELLER']), productController.getUploadLink);
router.post('/', authenticate, authorize(['ADMIN', 'SELLER']), productController.createProduct);
router.put('/:id', authenticate, authorize(['ADMIN', 'SELLER']), productController.updateProduct);
router.delete('/:id', authenticate, authorize(['ADMIN', 'SELLER']), productController.deleteProduct);

module.exports = router;

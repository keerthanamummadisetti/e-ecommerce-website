const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticate } = require('../middleware/auth');

// Apply authentication to all cart endpoints (allowing guest IDs starting with guest:)
router.get('/:userId', authenticate, cartController.getCart);
router.post('/:userId/items', authenticate, cartController.addItem);
router.put('/:userId/items/:itemId', authenticate, cartController.editItem);
router.delete('/:userId/items/:itemId', authenticate, cartController.removeItem);
router.delete('/:userId', authenticate, cartController.clearCart);
router.post('/:userId/merge', authenticate, cartController.mergeCart);
router.post('/:userId/checkout', authenticate, cartController.checkout);

module.exports = router;

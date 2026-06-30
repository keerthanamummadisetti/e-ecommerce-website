const axios = require('axios');
const { getRedisClient, getKafkaProducer } = require('../config/db');

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:8082';
const CART_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

const getCartKey = (userId) => `cart:${userId}`;

// Helper: Get cart helper
const fetchCart = async (userId) => {
  const redis = getRedisClient();
  const cartJson = await redis.get(getCartKey(userId));
  return cartJson ? JSON.parse(cartJson) : { userId, items: [] };
};

// Helper: Save cart helper
const saveCart = async (userId, cart) => {
  const redis = getRedisClient();
  await redis.set(getCartKey(userId), JSON.stringify(cart), { EX: CART_TTL });
};

// 1. GET Cart
const getCart = async (req, res) => {
  const { userId } = req.params;
  try {
    const cart = await fetchCart(userId);
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
};

// 2. ADD Item to Cart (with Real-time Price and Stock check)
const addItem = async (req, res) => {
  const { userId } = req.params;
  const { productId, quantity, variantSku } = req.body;

  if (!productId || !quantity) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'productId and quantity are required.' });
  }

  try {
    let productPrice = 10.0; // Resilient fallback default
    let productName = 'Default Product';
    let stockAvailable = 999;

    // Call Product Service to validate price and stock
    try {
      const response = await axios.get(`${PRODUCT_SERVICE_URL}/products/${productId}`, { timeout: 2000 });
      if (response.data) {
        productPrice = response.data.price;
        productName = response.data.name;
        stockAvailable = response.data.stock;
        
        // If variant sku is selected, check variant price/stock
        if (variantSku && response.data.variants) {
          const variant = response.data.variants.find(v => v.sku === variantSku);
          if (variant) {
            productPrice += (variant.priceOffset || 0);
            stockAvailable = variant.stock;
          }
        }
      }
    } catch (apiError) {
      console.warn(`Product Service not reachable (${PRODUCT_SERVICE_URL}). Proceeding with defaults for local testing.`, apiError.message);
    }

    if (quantity > stockAvailable) {
      return res.status(400).json({ error: 'INSUFFICIENT_STOCK', message: `Only ${stockAvailable} items available in stock.` });
    }

    const cart = await fetchCart(userId);
    const existingIndex = cart.items.findIndex(item => item.productId === productId && item.variantSku === variantSku);

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += Number(quantity);
      cart.items[existingIndex].price = productPrice; // Sync current price
    } else {
      cart.items.push({
        itemId: `${productId}_${variantSku || 'default'}`,
        productId,
        productName,
        quantity: Number(quantity),
        price: productPrice,
        variantSku
      });
    }

    await saveCart(userId, cart);
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
};

// 3. PUT Edit Item Quantity
const editItem = async (req, res) => {
  const { userId, itemId } = req.params;
  const { quantity } = req.body;

  if (quantity === undefined || quantity <= 0) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'quantity greater than 0 is required.' });
  }

  try {
    const cart = await fetchCart(userId);
    const itemIndex = cart.items.findIndex(item => item.itemId === itemId);

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity = Number(quantity);
      await saveCart(userId, cart);
      res.json(cart);
    } else {
      res.status(404).json({ error: 'ITEM_NOT_FOUND', message: 'Item not found in cart.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
};

// 4. DELETE Remove Item from Cart
const removeItem = async (req, res) => {
  const { userId, itemId } = req.params;
  try {
    const cart = await fetchCart(userId);
    cart.items = cart.items.filter(item => item.itemId !== itemId);
    await saveCart(userId, cart);
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
};

// 5. DELETE Clear Cart
const clearCart = async (req, res) => {
  const { userId } = req.params;
  try {
    const redis = getRedisClient();
    await redis.del(getCartKey(userId));
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
};

// 6. POST Merge Guest Cart
const mergeCart = async (req, res) => {
  const { userId } = req.params;
  const { guestUserId } = req.body;

  if (!guestUserId) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'guestUserId is required.' });
  }

  try {
    const userCart = await fetchCart(userId);
    const guestCart = await fetchCart(guestUserId);

    if (guestCart.items.length === 0) {
      return res.json(userCart);
    }

    // Merge logic
    guestCart.items.forEach(guestItem => {
      const existingIndex = userCart.items.findIndex(
        userItem => userItem.productId === guestItem.productId && userItem.variantSku === guestItem.variantSku
      );

      if (existingIndex > -1) {
        userCart.items[existingIndex].quantity += guestItem.quantity;
      } else {
        userCart.items.push(guestItem);
      }
    });

    await saveCart(userId, userCart);
    
    // Clear guest cart
    const redis = getRedisClient();
    await redis.del(getCartKey(guestUserId));

    res.json(userCart);
  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
};

// 7. POST Checkout (Triggers Kafka event)
const checkout = async (req, res) => {
  const { userId } = req.params;
  const { couponCode, shippingAddress } = req.body;

  if (!shippingAddress) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'shippingAddress is required.' });
  }

  try {
    const cart = await fetchCart(userId);
    if (cart.items.length === 0) {
      return res.status(400).json({ error: 'EMPTY_CART', message: 'Cart is empty. Cannot checkout.' });
    }

    // Calculate subtotal
    let subtotal = 0;
    cart.items.forEach(item => {
      subtotal += item.price * item.quantity;
    });

    // Discount calculations
    let discount = 0;
    if (couponCode === 'SAVE10') {
      discount = subtotal * 0.10;
    } else if (couponCode === 'SAVE20') {
      discount = subtotal * 0.20;
    }

    const totalAmount = Math.max(0, subtotal - discount);

    // Build checkout event matching CloudEvents specification
    const event = {
      specversion: '1.0',
      type: 'com.shopnow.cart.checkout_initiated',
      source: '/services/cart-service',
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      data: {
        cartId: `cart-${userId}-${Date.now()}`,
        userId,
        items: cart.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.price,
          variantSku: item.variantSku
        })),
        couponCode,
        subtotal: Number(subtotal.toFixed(2)),
        discount: Number(discount.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2)),
        shippingAddress,
        timestamp: new Date().toISOString()
      }
    };

    // Emit to Kafka topic: cart.checkout_initiated
    const producer = getKafkaProducer();
    await producer.send({
      topic: 'cart.checkout_initiated',
      messages: [
        {
          key: userId,
          value: JSON.stringify(event)
        }
      ]
    });

    // Clear user cart upon successful checkout initiation
    const redis = getRedisClient();
    await redis.del(getCartKey(userId));

    res.json({
      status: 'CHECKOUT_INITIATED',
      message: 'Checkout process has been initiated. Order is being processed.',
      checkoutDetails: event.data
    });

  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
};

module.exports = {
  getCart,
  addItem,
  editItem,
  removeItem,
  clearCart,
  mergeCart,
  checkout
};

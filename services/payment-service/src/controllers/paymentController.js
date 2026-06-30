const { getDBPool, getKafkaProducer } = require('../config/db');
const { getStripe } = require('../config/stripe');

// 1. Initiate Payment (Idempotent)
const initiatePayment = async (req, res) => {
  const { orderId, userId, amount, currency = 'usd', idempotencyKey } = req.body;

  if (!orderId || !userId || !amount || !idempotencyKey) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'orderId, userId, amount, and idempotencyKey are required.' });
  }

  const pool = getDBPool();
  try {
    // Check if payment already exists for this idempotency key
    const checkQuery = 'SELECT * FROM payments WHERE idempotency_key = $1';
    const checkResult = await pool.query(checkQuery, [idempotencyKey]);

    if (checkResult.rows.length > 0) {
      const existing = checkResult.rows[0];
      return res.json({
        paymentId: existing.id,
        status: existing.status,
        stripePaymentIntentId: existing.stripe_payment_intent_id,
        amount: existing.amount
      });
    }

    // Call Stripe SDK (or mock Stripe)
    const stripe = getStripe();
    // Stripe expects amount in cents/smallest currency unit
    const stripeAmount = Math.round(Number(amount) * 100); 
    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency,
      metadata: { orderId, userId },
      idempotencyKey // Pass to Stripe too
    });

    // Write transaction into PostgreSQL database
    const insertQuery = `
      INSERT INTO payments (order_id, user_id, amount, currency, status, stripe_payment_intent_id, idempotency_key)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const insertParams = [orderId, userId, amount, currency, 'PENDING', paymentIntent.id, idempotencyKey];
    const insertResult = await pool.query(insertQuery, insertParams);
    const newPayment = insertResult.rows[0];

    res.status(201).json({
      paymentId: newPayment.id,
      clientSecret: paymentIntent.client_secret,
      status: 'PENDING'
    });

  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
};

// 2. Confirm Payment & Publish Kafka Event
const confirmPayment = async (req, res) => {
  const { paymentId, paymentMethodId = 'pm_card_visa' } = req.body;

  if (!paymentId) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'paymentId is required.' });
  }

  const pool = getDBPool();
  try {
    const findQuery = 'SELECT * FROM payments WHERE id = $1';
    const findResult = await pool.query(findQuery, [paymentId]);

    if (findResult.rows.length === 0) {
      return res.status(404).json({ error: 'PAYMENT_NOT_FOUND', message: 'Payment record not found.' });
    }

    const payment = findResult.rows[0];
    if (payment.status === 'SUCCESS') {
      return res.json({ status: 'SUCCESS', paymentId });
    }

    const stripe = getStripe();
    let paymentIntent;
    
    try {
      // Simulate confirmation with Stripe (or mock Stripe)
      paymentIntent = await stripe.paymentIntents.confirm(payment.stripe_payment_intent_id, {
        payment_method: paymentMethodId
      });
    } catch (stripeError) {
      // If Stripe throws error, payment failed
      await pool.query('UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2', ['FAILED', paymentId]);
      await publishPaymentFailed(payment, stripeError.message);
      return res.status(400).json({ status: 'FAILED', message: stripeError.message });
    }

    if (paymentIntent.status === 'succeeded') {
      // 1. Update Database Status to SUCCESS
      await pool.query('UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2', ['SUCCESS', paymentId]);
      // 2. Emit Kafka event payment.success
      await publishPaymentSuccess(payment);
      res.json({ status: 'SUCCESS', paymentId });
    } else {
      await pool.query('UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2', ['FAILED', paymentId]);
      await publishPaymentFailed(payment, 'Payment intent failed check');
      res.status(400).json({ status: 'FAILED', message: 'Payment authorization failed' });
    }

  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
};

// 3. Refund Payment
const refundPayment = async (req, res) => {
  const { paymentId, amount, reason } = req.body;

  if (!paymentId) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'paymentId is required.' });
  }

  const pool = getDBPool();
  try {
    const findQuery = 'SELECT * FROM payments WHERE id = $1';
    const findResult = await pool.query(findQuery, [paymentId]);

    if (findResult.rows.length === 0) {
      return res.status(404).json({ error: 'PAYMENT_NOT_FOUND', message: 'Payment record not found.' });
    }

    const payment = findResult.rows[0];
    if (payment.status !== 'SUCCESS') {
      return res.status(400).json({ error: 'INVALID_STATE', message: 'Only successful payments can be refunded.' });
    }

    const stripe = getStripe();
    const refundAmount = amount ? Math.round(Number(amount) * 100) : Math.round(Number(payment.amount) * 100);
    
    // Call Stripe SDK (or mock Stripe)
    await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: refundAmount
    });

    // Update status in DB
    await pool.query('UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2', ['REFUNDED', paymentId]);
    
    res.json({ status: 'REFUNDED', paymentId, amount: amount || payment.amount });

  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
};

// 4. GET Queries
const getPaymentById = async (req, res) => {
  const { id } = req.params;
  const pool = getDBPool();
  try {
    const query = 'SELECT * FROM payments WHERE id = $1';
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'PAYMENT_NOT_FOUND', message: 'Payment record not found.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
};

const getPaymentByOrderId = async (req, res) => {
  const { orderId } = req.params;
  const pool = getDBPool();
  try {
    const query = 'SELECT * FROM payments WHERE order_id = $1';
    const result = await pool.query(query, [orderId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
};

// 5. Stripe Webhook (Async confirmations)
const stripeWebhook = async (req, res) => {
  const stripe = getStripe();
  const pool = getDBPool();
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // In production, we'd verify the signature:
    // event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    // For mock/local run, we read the body directly:
    event = req.body;
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const findQuery = 'SELECT * FROM payments WHERE stripe_payment_intent_id = $1';
    const findResult = await pool.query(findQuery, [paymentIntent.id]);

    if (findResult.rows.length > 0) {
      const payment = findResult.rows[0];
      if (payment.status !== 'SUCCESS') {
        await pool.query('UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2', ['SUCCESS', payment.id]);
        await publishPaymentSuccess(payment);
      }
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    const findQuery = 'SELECT * FROM payments WHERE stripe_payment_intent_id = $1';
    const findResult = await pool.query(findQuery, [paymentIntent.id]);

    if (findResult.rows.length > 0) {
      const payment = findResult.rows[0];
      if (payment.status !== 'FAILED') {
        await pool.query('UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2', ['FAILED', payment.id]);
        await publishPaymentFailed(payment, 'Webhook reported failure');
      }
    }
  }

  res.json({ received: true });
};

// --- Kafka Event Publishing Helpers ---

const publishPaymentSuccess = async (payment) => {
  const producer = getKafkaProducer();
  const event = {
    specversion: '1.0',
    type: 'com.shopnow.payment.success',
    source: '/services/payment-service',
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    time: new Date().toISOString(),
    datacontenttype: 'application/json',
    data: {
      paymentId: payment.id,
      orderId: payment.order_id,
      amount: Number(payment.amount),
      method: 'credit_card',
      timestamp: new Date().toISOString()
    }
  };

  try {
    await producer.send({
      topic: 'payment.success',
      messages: [
        {
          key: payment.order_id,
          value: JSON.stringify(event)
        }
      ]
    });
    console.log(`Kafka event payment.success published for Order: ${payment.order_id}`);
  } catch (error) {
    console.error('Failed to publish payment.success Kafka event:', error.message);
  }
};

const publishPaymentFailed = async (payment, reason) => {
  const producer = getKafkaProducer();
  const event = {
    specversion: '1.0',
    type: 'com.shopnow.payment.failed',
    source: '/services/payment-service',
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    time: new Date().toISOString(),
    datacontenttype: 'application/json',
    data: {
      paymentId: payment.id,
      orderId: payment.order_id,
      reason,
      timestamp: new Date().toISOString()
    }
  };

  try {
    await producer.send({
      topic: 'payment.failed',
      messages: [
        {
          key: payment.order_id,
          value: JSON.stringify(event)
        }
      ]
    });
    console.log(`Kafka event payment.failed published for Order: ${payment.order_id}`);
  } catch (error) {
    console.error('Failed to publish payment.failed Kafka event:', error.message);
  }
};

module.exports = {
  initiatePayment,
  confirmPayment,
  refundPayment,
  getPaymentById,
  getPaymentByOrderId,
  stripeWebhook
};

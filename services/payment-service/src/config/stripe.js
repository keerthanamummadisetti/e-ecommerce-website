const Stripe = require('stripe');

let stripeClient = null;

const initStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (secretKey) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2023-10-16' // Standard version for project
    });
    console.log('Stripe SDK initialized successfully.');
  } else {
    console.warn('Stripe secret key not found. Using Stripe Mock client.');
    stripeClient = createMockStripe();
  }
};

const getStripe = () => {
  if (!stripeClient) {
    initStripe();
  }
  return stripeClient;
};

// Mock implementation of Stripe for testing and local execution
const createMockStripe = () => {
  return {
    paymentIntents: {
      create: async (payload) => {
        // Mock payment intent creation
        const amount = payload.amount;
        const currency = payload.currency || 'usd';
        const idempotencyKey = payload.idempotencyKey;
        const client_secret = `pi_${Math.random().toString(36).substr(2, 9)}_secret_${Math.random().toString(36).substr(2, 9)}`;
        return {
          id: `pi_${Math.random().toString(36).substr(2, 9)}`,
          object: 'payment_intent',
          amount,
          currency,
          status: 'requires_payment_method',
          client_secret,
          metadata: payload.metadata || {}
        };
      },
      confirm: async (id, payload) => {
        // Mock payment confirmation
        return {
          id,
          object: 'payment_intent',
          status: 'succeeded',
          amount: 1000,
          currency: 'usd'
        };
      }
    },
    refunds: {
      create: async (payload) => {
        return {
          id: `re_${Math.random().toString(36).substr(2, 9)}`,
          object: 'refund',
          amount: payload.amount,
          status: 'succeeded',
          payment_intent: payload.payment_intent
        };
      }
    }
  };
};

module.exports = {
  getStripe
};

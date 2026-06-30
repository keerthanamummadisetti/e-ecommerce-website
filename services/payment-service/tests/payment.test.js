const request = require('supertest');
const app = require('../src/app');

// Mock DB, Kafka, Stripe
jest.mock('../src/config/db', () => {
  const mockPool = {
    query: jest.fn().mockResolvedValue({
      rows: [
        { id: 'pay_123', order_id: 'order_123', user_id: 'user_123', amount: 50.00, status: 'PENDING', stripe_payment_intent_id: 'pi_123', idempotency_key: 'idemp_key' }
      ]
    })
  };
  const mockKafka = {
    send: jest.fn().mockResolvedValue([{ topicName: 'payment.success', partition: 0 }])
  };
  return {
    connectDB: jest.fn().mockResolvedValue(true),
    getDBPool: () => mockPool,
    connectKafka: jest.fn().mockResolvedValue(true),
    getKafkaProducer: () => mockKafka
  };
});

jest.mock('../src/config/stripe', () => {
  const mockStripe = {
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_123', client_secret: 'secret_123' }),
      confirm: jest.fn().mockResolvedValue({ id: 'pi_123', status: 'succeeded' })
    }
  };
  return {
    getStripe: () => mockStripe
  };
});

describe('Payment API Endpoints', () => {
  it('should return UP for health check', async () => {
    const res = await request(app).get('/actuator/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'UP');
  });

  it('should initiate payment transaction', async () => {
    const res = await request(app)
      .post('/payments/initiate')
      .send({ orderId: 'order_123', userId: 'user_123', amount: 50.00, idempotencyKey: 'idemp_key' });
    
    expect(res.statusCode).toEqual(200); // Because query mock returns existing row
    expect(res.body).toHaveProperty('paymentId');
  });
});

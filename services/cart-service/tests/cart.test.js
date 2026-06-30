const request = require('supertest');
const app = require('../src/app');

// Mock Redis & Kafka to avoid actual connections in tests
jest.mock('../src/config/db', () => {
  const mockRedis = {
    get: jest.fn().mockResolvedValue(JSON.stringify({
      userId: 'test-user',
      items: [
        { itemId: 'prodA_default', productId: 'prodA', productName: 'Prod A', price: 29.99, quantity: 2 }
      ]
    })),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    on: jest.fn()
  };
  const mockKafka = {
    send: jest.fn().mockResolvedValue([{ topicName: 'cart.checkout_initiated', partition: 0 }])
  };
  return {
    connectRedis: jest.fn().mockResolvedValue(true),
    getRedisClient: () => mockRedis,
    connectKafka: jest.fn().mockResolvedValue(true),
    getKafkaProducer: () => mockKafka
  };
});

describe('Shopping Cart API Endpoints', () => {
  it('should return UP for health check', async () => {
    const res = await request(app).get('/actuator/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'UP');
  });

  it('should fetch user cart', async () => {
    const res = await request(app)
      .get('/cart/guest:123'); // Bypass JWT auth using guest: prefix
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('userId');
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  it('should clear cart successfully', async () => {
    const res = await request(app)
      .delete('/cart/guest:123');
    expect(res.statusCode).toEqual(204);
  });
});

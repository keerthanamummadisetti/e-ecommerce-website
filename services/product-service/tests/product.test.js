const request = require('supertest');
const app = require('../src/app');

// Mock db configurations to avoid actual connections during unit testing
jest.mock('../src/config/db', () => {
  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    on: jest.fn()
  };
  const mockKafka = {
    send: jest.fn().mockResolvedValue([{ topicName: 'product.created', partition: 0 }])
  };
  return {
    connectDB: jest.fn().mockResolvedValue(true),
    connectRedis: jest.fn().mockResolvedValue(true),
    getRedisClient: () => mockRedis,
    connectKafka: jest.fn().mockResolvedValue(true),
    getKafkaProducer: () => mockKafka
  };
});

// Mock Mongoose model
jest.mock('../src/models/Product', () => {
  const mockProducts = [
    { _id: '507f1f77bcf86cd799439011', name: 'Product A', category: 'electronics', price: 99.9, stock: 10, isFeatured: true }
  ];
  return {
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(mockProducts)
      }),
      limit: jest.fn().mockResolvedValue(mockProducts)
    }),
    findById: jest.fn().mockResolvedValue(mockProducts[0]),
    findByIdAndUpdate: jest.fn().mockResolvedValue(mockProducts[0]),
    findByIdAndDelete: jest.fn().mockResolvedValue(mockProducts[0])
  };
});

describe('Product Catalogue API Endpoints', () => {
  it('should return UP for health check', async () => {
    const res = await request(app).get('/actuator/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'UP');
  });

  it('should list products with pagination structure', async () => {
    const res = await request(app).get('/products');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('products');
    expect(Array.isArray(res.body.products)).toBe(true);
  });

  it('should fetch featured products list', async () => {
    const res = await request(app).get('/products/featured');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should fetch single product details', async () => {
    const res = await request(app).get('/products/507f1f77bcf86cd799439011');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('name', 'Product A');
  });
});

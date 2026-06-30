const mongoose = require('mongoose');
const { createClient } = require('redis');
const { Kafka, Partitioners } = require('kafkajs');

// MongoDB Connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/shopnow_product';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected successfully.');
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// Redis Connection with fallback mock
let redisClient = null;
const connectRedis = async () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  try {
    redisClient = createClient({ url: redisUrl });
    redisClient.on('error', (err) => console.warn('Redis Client Error', err.message));
    await redisClient.connect();
    console.log('Redis Connected successfully.');
  } catch (error) {
    console.warn('Redis not available. Using local in-memory fallback.', error.message);
    redisClient = createMockRedisClient();
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = createMockRedisClient();
  }
  return redisClient;
};

// Mock Redis Client for resilience
const createMockRedisClient = () => {
  const store = {};
  return {
    get: async (key) => store[key] || null,
    set: async (key, val, options) => {
      store[key] = val;
      return 'OK';
    },
    del: async (key) => {
      delete store[key];
      return 1;
    },
    connect: async () => {},
    on: () => {}
  };
};

// Kafka client and producer with fallback
let kafkaProducer = null;
const connectKafka = async () => {
  const kafkaBroker = process.env.KAFKA_BROKERS || 'localhost:9092';
  try {
    const kafka = new Kafka({
      clientId: 'product-service',
      brokers: [kafkaBroker]
    });
    kafkaProducer = kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner
    });
    await kafkaProducer.connect();
    console.log('Kafka Producer Connected successfully.');
  } catch (error) {
    console.warn('Kafka Broker not available. Using log-based producer fallback.', error.message);
    kafkaProducer = createMockKafkaProducer();
  }
};

const getKafkaProducer = () => {
  if (!kafkaProducer) {
    kafkaProducer = createMockKafkaProducer();
  }
  return kafkaProducer;
};

const createMockKafkaProducer = () => {
  return {
    connect: async () => {},
    send: async (payload) => {
      console.log(`[MockKafka] Emitted message to topic "${payload.topic}":`, JSON.stringify(payload.messages));
      return [{ topicName: payload.topic, partition: 0, errorCode: 0 }];
    },
    disconnect: async () => {}
  };
};

module.exports = {
  connectDB,
  connectRedis,
  getRedisClient,
  connectKafka,
  getKafkaProducer
};

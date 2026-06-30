const { createClient } = require('redis');
const { Kafka, Partitioners } = require('kafkajs');

let redisClient = null;

const connectRedis = async () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  try {
    redisClient = createClient({ url: redisUrl });
    redisClient.on('error', (err) => console.warn('Redis Client Error', err.message));
    await redisClient.connect();
    console.log('Redis Connected successfully for Cart.');
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

let kafkaProducer = null;
const connectKafka = async () => {
  const kafkaBroker = process.env.KAFKA_BROKERS || 'localhost:9092';
  try {
    const kafka = new Kafka({
      clientId: 'cart-service',
      brokers: [kafkaBroker]
    });
    kafkaProducer = kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner
    });
    await kafkaProducer.connect();
    console.log('Kafka Producer Connected successfully for Cart.');
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
  connectRedis,
  getRedisClient,
  connectKafka,
  getKafkaProducer
};

const { Pool } = require('pg');
const { Kafka, Partitioners } = require('kafkajs');

// PostgreSQL Connection
let pool = null;
const connectDB = async () => {
  const connectionString = process.env.SPRING_DATASOURCE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/shopnow_payment';
  
  try {
    pool = new Pool({ connectionString });
    // Check connection
    await pool.query('SELECT NOW()');
    console.log('PostgreSQL Connected successfully for Payment Service.');
    
    // Auto-create payments table if it does not exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL,
        user_id UUID NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        status VARCHAR(20) NOT NULL,
        stripe_payment_intent_id VARCHAR(255),
        idempotency_key VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Payments table verified/created.');
  } catch (error) {
    console.warn('PostgreSQL database not available for Payment. Falling back to local in-memory store.', error.message);
    pool = createMockPool();
  }
};

const getDBPool = () => {
  if (!pool) {
    pool = createMockPool();
  }
  return pool;
};

// In-Memory mock for database resilience
const createMockPool = () => {
  const store = [];
  return {
    query: async (text, params) => {
      // Simulate basic operations
      const cleanText = text.trim().toLowerCase();
      if (cleanText.includes('select * from payments where id =')) {
        const id = params[0];
        const res = store.find(p => p.id === id);
        return { rows: res ? [res] : [] };
      }
      if (cleanText.includes('select * from payments where order_id =')) {
        const orderId = params[0];
        const res = store.filter(p => p.order_id === orderId);
        return { rows: res };
      }
      if (cleanText.includes('select * from payments where idempotency_key =')) {
        const key = params[0];
        const res = store.find(p => p.idempotency_key === key);
        return { rows: res ? [res] : [] };
      }
      if (cleanText.includes('insert into payments')) {
        // [orderId, userId, amount, currency, status, stripeId, idempotencyKey]
        const newRecord = {
          id: require('crypto').randomUUID(),
          order_id: params[0],
          user_id: params[1],
          amount: params[2],
          currency: params[3] || 'USD',
          status: params[4],
          stripe_payment_intent_id: params[5],
          idempotency_key: params[6],
          created_at: new Date(),
          updated_at: new Date()
        };
        store.push(newRecord);
        return { rows: [newRecord] };
      }
      if (cleanText.includes('update payments set status =')) {
        // params: [status, stripeId, id] or [status, id]
        const status = params[0];
        const id = params[params.length - 1];
        const record = store.find(p => p.id === id);
        if (record) {
          record.status = status;
          if (params.length === 3) record.stripe_payment_intent_id = params[1];
          record.updated_at = new Date();
          return { rows: [record] };
        }
        return { rows: [] };
      }
      return { rows: [] };
    }
  };
};

// Kafka Connection
let kafkaProducer = null;
const connectKafka = async () => {
  const kafkaBroker = process.env.KAFKA_BROKERS || 'localhost:9092';
  try {
    const kafka = new Kafka({
      clientId: 'payment-service',
      brokers: [kafkaBroker]
    });
    kafkaProducer = kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner
    });
    await kafkaProducer.connect();
    console.log('Kafka Connected successfully for Payment Service.');
  } catch (error) {
    console.warn('Kafka not available for Payment. Using log-based publisher fallback.', error.message);
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
  getDBPool,
  connectKafka,
  getKafkaProducer
};

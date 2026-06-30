const { getKafkaProducer } = require('../config/db');

const publishProductCreated = async (product) => {
  const producer = getKafkaProducer();
  const event = {
    specversion: '1.0',
    type: 'com.shopnow.product.created',
    source: '/services/product-service',
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    time: new Date().toISOString(),
    datacontenttype: 'application/json',
    data: {
      productId: product.productId || product._id.toString(),
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
      timestamp: new Date().toISOString()
    }
  };

  try {
    await producer.send({
      topic: 'product.created',
      messages: [
        {
          key: event.data.productId,
          value: JSON.stringify(event)
        }
      ]
    });
    console.log(`Kafka event product.created published for ID: ${event.data.productId}`);
  } catch (error) {
    console.error('Failed to publish product.created Kafka event:', error.message);
  }
};

const publishProductUpdated = async (productId, changedFields) => {
  const producer = getKafkaProducer();
  const event = {
    specversion: '1.0',
    type: 'com.shopnow.product.updated',
    source: '/services/product-service',
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    time: new Date().toISOString(),
    datacontenttype: 'application/json',
    data: {
      productId,
      changedFields,
      timestamp: new Date().toISOString()
    }
  };

  try {
    await producer.send({
      topic: 'product.updated',
      messages: [
        {
          key: productId,
          value: JSON.stringify(event)
        }
      ]
    });
    console.log(`Kafka event product.updated published for ID: ${productId}`);
  } catch (error) {
    console.error('Failed to publish product.updated Kafka event:', error.message);
  }
};

module.exports = {
  publishProductCreated,
  publishProductUpdated
};

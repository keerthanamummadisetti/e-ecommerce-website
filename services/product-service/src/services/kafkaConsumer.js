const { Kafka } = require('kafkajs');
const Product = require('../models/Product');
const { getRedisClient } = require('../config/db');
const { publishProductUpdated } = require('./eventService');

const getProductDetailKey = (id) => `product:detail:${id}`;
const getProductFeaturedKey = () => 'product:featured';

const startReviewConsumer = async () => {
  const kafkaBroker = process.env.KAFKA_BROKERS || 'localhost:9092';
  const kafka = new Kafka({
    clientId: 'product-service-consumer',
    brokers: [kafkaBroker]
  });

  const consumer = kafka.consumer({ groupId: 'product-review-group' });

  // Resilient startup loop
  let connected = false;
  while (!connected) {
    try {
      await consumer.connect();
      console.log('Product Service Review Consumer connected to Kafka.');
      connected = true;
    } catch (err) {
      console.warn('Failed to connect Product Service Review Consumer to Kafka. Retrying in 10s...', err.message);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  try {
    await consumer.subscribe({ topic: 'review.created', fromBeginning: true });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const payload = JSON.parse(message.value.toString());
          const data = payload.data || {};
          const productId = data.productId;
          const rating = Number(data.rating);

          if (!productId || isNaN(rating)) {
            return;
          }

          console.log(`Processing review.created event for product: ${productId}, rating: ${rating}`);

          // Fetch product
          const product = await Product.findById(productId);
          if (product) {
            const currentCount = product.reviewCount || 0;
            const currentRating = product.averageRating || 0;
            
            const newCount = currentCount + 1;
            const newRating = ((currentRating * currentCount) + rating) / newCount;

            product.reviewCount = newCount;
            product.averageRating = Number(newRating.toFixed(2));

            await product.save();
            console.log(`Updated product ${productId}: reviewCount=${newCount}, averageRating=${product.averageRating}`);

            // Invalidate Redis cache
            try {
              const redis = getRedisClient();
              await redis.del(getProductDetailKey(productId));
              await redis.del(getProductFeaturedKey());
            } catch (cacheErr) {
              console.warn('Failed to invalidate Redis cache for product:', cacheErr.message);
            }

            // Sync with Search Service via product.updated Kafka event
            try {
              await publishProductUpdated(productId, {
                averageRating: product.averageRating,
                reviewCount: product.reviewCount
              });
            } catch (eventErr) {
              console.warn('Failed to publish product.updated sync event:', eventErr.message);
            }
          }
        } catch (err) {
          console.error('Error processing review event message:', err.message);
        }
      }
    });
  } catch (err) {
    console.error('Failed to run Product Service Review Consumer:', err.message);
  }
};

module.exports = {
  startReviewConsumer
};

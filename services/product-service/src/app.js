const express = require('express');
const cors = require('cors');
const { connectDB, connectRedis, connectKafka } = require('./config/db');
const productRoutes = require('./routes/productRoutes');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8082;

app.use(cors());
app.use(express.json());

// Main Resource Routing
app.use('/products', productRoutes);

// Health check endpoint (for K8s readiness/liveness and Prometheus monitoring)
app.get('/actuator/health', (req, res) => {
  res.json({ status: 'UP' });
});

// Local mock handler to accept simulated S3 uploads from S3 presigned URLs
app.put('/mock-upload/:key', (req, res) => {
  console.log(`[MockS3] Uploaded file with key: ${req.params.key}`);
  res.status(200).send({ message: 'Mock upload successful' });
});

const startServer = async () => {
  await connectDB();
  await connectRedis();
  await connectKafka();

  app.listen(PORT, () => {
    console.log(`Product Catalogue Service listening on port ${PORT}`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;

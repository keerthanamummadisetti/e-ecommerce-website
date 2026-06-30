const express = require('express');
const cors = require('cors');
const { connectRedis, connectKafka } = require('./config/db');
const cartRoutes = require('./routes/cartRoutes');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8086;

app.use(cors());
app.use(express.json());

// Routes
app.use('/cart', cartRoutes);

// Health check endpoint
app.get('/actuator/health', (req, res) => {
  res.json({ status: 'UP' });
});

const startServer = async () => {
  await connectRedis();
  await connectKafka();

  app.listen(PORT, () => {
    console.log(`Shopping Cart Service listening on port ${PORT}`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;

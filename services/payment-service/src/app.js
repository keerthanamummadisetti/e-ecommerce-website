const express = require('express');
const cors = require('cors');
const { connectDB, connectKafka } = require('./config/db');
const paymentRoutes = require('./routes/paymentRoutes');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8084;

app.use(cors());
app.use(express.json());

// Routes
app.use('/payments', paymentRoutes);

// Health check endpoint
app.get('/actuator/health', (req, res) => {
  res.json({ status: 'UP' });
});

const startServer = async () => {
  await connectDB();
  await connectKafka();

  app.listen(PORT, () => {
    console.log(`Payment Service listening on port ${PORT}`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;

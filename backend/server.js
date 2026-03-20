const express = require('express');
const cors = require('cors');
const { initSchema } = require('./src/models/schema');
const apiRoutes = require('./src/routes/api');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize Database Schema
initSchema();

// Routes
app.use('/api', apiRoutes);

// Port setup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend modular server running on port ${PORT}`);
});
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const showRoutes = require('./routes/shows');
const bookingRoutes = require('./routes/bookings');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Parsing Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging Middleware for SEQA audit & debugging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Serve Frontend Static Assets
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Health Check API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    system: 'Movie Ticket Booking System',
    timestamp: new Date().toISOString()
  });
});

// Mount REST API Routes
app.use('/api', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/shows', showRoutes);
app.use('/api/bookings', bookingRoutes);

// Fallback for Single Page Application routing (non-API paths)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: `API endpoint "${req.path}" not found.`
    });
  }
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Global Centralized Error Handler (prevents server crashes)
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

let serverInstance = null;

if (process.env.NODE_ENV !== 'test') {
  serverInstance = app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🎬 Movie Ticket Booking System is running!`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🛡️  Admin: admin@cinema.com | admin123`);
    console.log(`👤 User: sourish@gmail.com | user123`);
    console.log(`====================================================`);
  });
}

module.exports = { app, serverInstance };

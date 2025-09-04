const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();
const app = express();
const portfinder = require("portfinder");

// Import database connection (PostgreSQL)
const pool = require('./config/db');
const passport = require('./config/passport');

// Import Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
//app.use('/api/auth', authRoutes);
//app.use('/api/admin', adminRoutes);

//Initialize App
//const app = express();

// ===== MIDDLEWARE SETUP =====
// 1. Basic middleware first
app.use(cors());
app.use(express.json());

// 2. Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// 3. Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to PostgreSQL database at:', res.rows[0].now);
  }
});

// ===== ROUTES SETUP =====
// 4. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// 5. Static files (if serving frontend)
app.use(express.static('frontend'));

// Test route
app.get('/', (req, res) => {
  res.send('Auth API with PostgreSQL is running...');
});

// 6. Page routes (if serving HTML pages)
app.get('/reset-password', (req, res) => {
  res.sendFile('reset-password.html', { root: './frontend' });
});

app.get('/', (req, res) => {
  res.sendFile('landing.html', { root: './frontend' });
});

// ===== ERROR HANDLING =====
// 7. 404 handler (MUST BE LAST)
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: `Route ${req.originalUrl} not found` });
});

// 8. Start server
//const port = process.env.PORT || 5000;
//app.listen(port, () => {
  //console.log(`Server running on port ${port}...`);
//});
portfinder.basePort = process.env.PORT || 5005; // start here
portfinder.getPort((err, port) => {
  if (err) throw err;
  app.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
  });
});

// Error handling
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});
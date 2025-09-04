const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendWelcomeEmail } = require('../services/emailService');
const router = express.Router();
const { protect } = require('../middleware/auth');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../services/emailService');
const pool = require('../config/db');
const passport = require('../config/passport');


// SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 1) Check if user already exists - USING POSTGRESQL METHODS
    const existingUserByEmail = await User.findByEmail(email);
    const existingUserByUsername = await User.findByUsername(username);

    if (existingUserByEmail || existingUserByUsername) {
      return res.status(409).json({
        status: 'error',
        message: 'User already exists with this email or username.'
      });
    }

    // 2) Create new user
    const newUser = await User.create({ username, email, password });

    sendWelcomeEmail(email, username).catch(error => {
      console.error('Failed to send welcome email:', error);
      // Don't throw error - email failure shouldn't break signup
    });

    // 3) Generate JWT Token
    const token = jwt.sign(
      { userId: newUser.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // 4) Send response
    res.status(201).json({
      status: 'success',
      message: 'User created successfully!',
      token,
      data: { user: newUser }
    });

  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error during signup.' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) Check if user exists - USING POSTGRESQL METHOD
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email or password'
      });
    }

    // 2) Check if password is correct
    const isPasswordValid = await User.comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email or password'
      });
    }

    // 3) Generate JWT Token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // 4) Remove password from user object before sending
    const { password: _, ...userWithoutPassword } = user;

    // 5) Send response
    res.status(200).json({
      status: 'success',
      message: 'Logged in successfully!',
      token,
      data: { user: userWithoutPassword }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error during login.' });
  }
});
// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // 1) Find user
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ 
        status: 'success', 
        message: 'If the email exists, a reset link has been sent.' 
      });
    }
    
    // 2) Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour
    
    // 3) Store token in database (add these columns to users table)
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
      [resetToken, new Date(resetTokenExpiry), user.id]
    );
    
    // 4) Send email
    sendPasswordResetEmail(email, resetToken);
    
    res.json({
      status: 'success',
      message: 'If the email exists, a reset link has been sent.'
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Error processing reset request' 
    });
  }
});

// GET route to handle reset password links from email
router.get('/reset-password', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: 'Reset token is required'
      });
    }
    
    // Verify the token exists and is valid
    const result = await pool.query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
      [token]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token'
      });
    }
    
    // Instead of JSON, send an HTML page with a form
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reset Password</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
          .container { background: #f9f9f9; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          input, button { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px; }
          button { background: #667eea; color: white; border: none; cursor: pointer; }
          .success { color: green; }
          .error { color: red; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Reset Your Password</h2>
          <form id="resetForm">
            <input type="hidden" id="token" value="${token}">
            <input type="password" id="newPassword" placeholder="New password" required>
            <button type="submit">Reset Password</button>
          </form>
          <div id="message"></div>
        </div>
        
        <script>
          document.getElementById('resetForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const token = document.getElementById('token').value;
            const newPassword = document.getElementById('newPassword').value;
            const messageDiv = document.getElementById('message');
            
            try {
              const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, newPassword })
              });
              
              const data = await response.json();
              
              if (response.ok) {
                messageDiv.innerHTML = '<p class="success">✅ Password reset successfully! You can now login with your new password.</p>';
                document.getElementById('resetForm').reset();
              } else {
                messageDiv.innerHTML = '<p class="error">❌ ' + data.message + '</p>';
              }
            } catch (error) {
              messageDiv.innerHTML = '<p class="error">❌ Network error. Please try again.</p>';
            }
          });
        </script>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Reset password GET error:', error);
    res.status(500).send('Error loading reset page');
  }
});
// PROTECTED ROUTE - Get current user profile
router.get('/me', protect, async (req, res) => {
  try {
    // req.user is set by the protect middleware
    res.status(200).json({
      status: 'success',
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user profile'
    });
  }
});

// PROTECTED ROUTE - Update user profile (example)
router.put('/profile', protect, async (req, res) => {
  try {
    // Example update logic
    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating profile'
    });
  }
});

// Serve reset password page
router.get('/reset-password', (req, res) => {
  res.sendFile('reset-password.html', { root: './frontend' });
});

// TEST EMAIL ENDPOINT - Remove this in production!
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Test welcome email
    await sendWelcomeEmail(email, 'Test User');
    
    res.json({
      status: 'success',
      message: 'Test email sent! Check your inbox.'
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send test email'
    });
  }
});
console.log("Auth routes loaded!");
// Google OAuth Login
router.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email']
}));

// Google OAuth Callback
//router.get('/google/callback', 
  //passport.authenticate('google', { failureRedirect: '/login.html?error=auth_failed',
  //successRedirect: '/profile.html',
  //session: true
//}));
router.get("/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.send("Google login successful");
  });

// Logout route
router.get('/logout', 
  (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ status: 'error', message: 'Logout failed' });
    }
    res.redirect('/landing.html');
  });
});

// Get current user (for frontend)
router.get('/current-user', (req, res) => {
  if (req.user) {
    res.json({
      status: 'success',
      data: { user: req.user }
    });
  } else {
    res.status(401).json({
      status: 'error',
      message: 'Not authenticated'
    });
  }
});

module.exports = router;
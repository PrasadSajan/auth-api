const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./db');
const User = require('../models/User');


// Serialize user into session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    let user = await User.findByEmail(profile.emails[0].value);
    
    if (user) {
      // User exists, update Google ID if not set
      if (!user.google_id) {
        await pool.query(
          'UPDATE users SET google_id = $1, updated_at = NOW() WHERE id = $2',
          [profile.id, user.id]
        );
      }
      return done(null, user);
    }
    
    // Create new user
    const newUser = await User.create({
      username: profile.displayName.replace(/\s+/g, '').toLowerCase(),
      email: profile.emails[0].value,
      password: null, // No password for OAuth users
      google_id: profile.id
    });
    
    done(null, newUser);
  } catch (error) {
    done(error, null);
  }
}));

module.exports = passport;
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
  callbackURL: process.env.GOOGLE_CALLBACK
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    const name = profile.displayName;
    const picture = profile.photos[0].value;

    // Save or find user in PostgreSQL
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    let user;
    if (result.rows.length === 0) {
      const insert = await pool.query(
        "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
        [name, email,'GOOGLE_OAUTH']
      );
      user = insert.rows[0];
    } else {
      user = result.rows[0];
    }

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }

  console.log("Google callback URL being used:", process.env.GOOGLE_CALLBACK);
}));

module.exports = passport;
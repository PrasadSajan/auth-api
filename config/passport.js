const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
//const FacebookStrategy = require('passport-facebook').Strategy;
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

// Helper function to find or create user
const findOrCreateUser = async (profile, provider, done) => {
  try {
    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
    
    // Try to find user by provider ID first
    let user = await User.findByProviderId(provider, profile.id);
    
    if (user) {
      return done(null, user);
    }
    
    // Try to find by email (for existing users)
    if (email) {
      user = await User.findByEmail(email);
      if (user) {
        // Link existing account with this provider
        await User.linkProvider(user.id, provider, profile.id);
        return done(null, user);
      }
    }
    
    // Create new user
    const username = await generateUniqueUsername(profile.displayName || profile.username);
    
    const newUser = await User.create({
      username: username,
      email: email,
      password: null, // No password for OAuth users
      [`${provider}_id`]: profile.id
    });
    
    done(null, newUser);
  } catch (error) {
    done(error, null);
  }
};

// Generate unique username
const generateUniqueUsername = async (baseName) => {
  let username = baseName.toLowerCase().replace(/\s+/g, '');
  let counter = 1;
  let finalUsername = username;
  
  while (await User.findByUsername(finalUsername)) {
    finalUsername = `${username}${counter}`;
    counter++;
  }
  
  return finalUsername;
};

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

// GitHub Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL,
    scope: ['user:email']
  }, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;
    const username = profile.username;

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    let user;
    if (result.rows.length === 0) {
      const insert = await pool.query(
        "INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *",
        [username, email]
      );
      user = insert.rows[0];
    } else {
      user = result.rows[0];
    }

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

// Facebook Strategy
//if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  //passport.use(new FacebookStrategy({
    //clientID: process.env.FACEBOOK_APP_ID,
    //clientSecret: process.env.FACEBOOK_APP_SECRET,
    //callbackURL: process.env.FACEBOOK_CALLBACK_URL,
    //profileFields: ['id', 'emails', 'name', 'displayName']
  //}, async (accessToken, refreshToken, profile, done) => {
  //try {
    //const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;
    //const username = profile.username;

    //const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    //let user;
    //if (result.rows.length === 0) {
      //const insert = await pool.query(
        //"INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *",
        //[username, email]
      //);
      //user = insert.rows[0];
    //} else {
      //user = result.rows[0];
    //}

    //return done(null, user);
  //} catch (err) {
    //return done(err, null);
  //}
//}))};
}

module.exports = passport;
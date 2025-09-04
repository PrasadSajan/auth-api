const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
  // Find a user by email
  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const values = [email];
    const { rows } = await pool.query(query, values);
    return rows[0]; // returns the first user found or undefined
  },

  // Find a user by username
  async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const values = [username];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // Find a user by ID (without password)
  async findById(id) {
    const query = 'SELECT id, username, email, created_at, updated_at FROM users WHERE id = $1';
    const values = [id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // Create a new user
  async create(userData) {
    const { username, email, password } = userData;
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const query = `
      INSERT INTO users (username, email, password) 
      VALUES ($1, $2, $3) 
      RETURNING id, username, email, created_at, updated_at
    `;
    const values = [username, email, hashedPassword];
    const { rows } = await pool.query(query, values);
    return rows[0]; // returns the newly created user without the password
  },

  // Compare candidate password with hashed password
  async comparePassword(candidatePassword, hashedPassword) {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  }
};

module.exports = User;
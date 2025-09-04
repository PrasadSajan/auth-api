const express = require('express');
const pool = require('../config/db');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

const router = express.Router();

// Get all users (Admin only)
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    
    res.json({
      status: 'success',
      data: {
        users: result.rows,
        total: result.rowCount
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ status: 'error', message: 'Error fetching users' });
  }
});

// Get user by ID (Admin only)
router.get('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    
    res.json({
      status: 'success',
      data: { user: result.rows[0] }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ status: 'error', message: 'Error fetching user' });
  }
});

// Update user role (Admin only)
router.patch('/users/:id/role', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    // Validate role
    if (!['user', 'admin', 'moderator'].includes(role)) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Role must be user, admin, or moderator' 
      });
    }
    
    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, email, role',
      [role, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    
    res.json({
      status: 'success',
      message: 'User role updated successfully',
      data: { user: result.rows[0] }
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ status: 'error', message: 'Error updating user role' });
  }
});

// Delete user (Admin only)
router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Cannot delete your own account' 
      });
    }
    
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, username, email',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    
    res.json({
      status: 'success',
      message: 'User deleted successfully',
      data: { user: result.rows[0] }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ status: 'error', message: 'Error deleting user' });
  }
});

// Get system statistics (Admin only)
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
    const todayUsers = await pool.query(
      'SELECT COUNT(*) FROM users WHERE created_at::date = CURRENT_DATE'
    );
    const adminUsers = await pool.query(
      'SELECT COUNT(*) FROM users WHERE role = $1',
      ['admin']
    );
    
    res.json({
      status: 'success',
      data: {
        total_users: parseInt(totalUsers.rows[0].count),
        today_users: parseInt(todayUsers.rows[0].count),
        admin_users: parseInt(adminUsers.rows[0].count),
        regular_users: parseInt(totalUsers.rows[0].count) - parseInt(adminUsers.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ status: 'error', message: 'Error fetching statistics' });
  }
});

module.exports = router;
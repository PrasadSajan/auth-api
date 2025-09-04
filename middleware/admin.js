const adminOnly = (req, res, next) => {
  // Check if user exists and is admin
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

module.exports = { adminOnly };

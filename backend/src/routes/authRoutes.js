/**
 * Authentication Routes
 * Handles user login and session management
 */

const express = require('express');
const router = express.Router();
const data = require('../data/store');

/**
 * POST /api/auth/login
 * Authenticate user and return user details with role
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = data.users.find(
    u => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Return user info without password
  const { password: _, ...userWithoutPassword } = user;
  res.json({
    message: 'Login successful',
    user: userWithoutPassword
  });
});

/**
 * GET /api/auth/users
 * Get all users (for admin purposes)
 */
router.get('/users', (req, res) => {
  const usersWithoutPasswords = data.users.map(({ password, ...user }) => user);
  res.json(usersWithoutPasswords);
});

module.exports = router;

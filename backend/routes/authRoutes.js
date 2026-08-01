const express = require('express');
const router = express.Router();
const { register, login, getMe, resetPassword, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/reset-password', resetPassword);
router.post('/change-password', protect, changePassword);

module.exports = router;
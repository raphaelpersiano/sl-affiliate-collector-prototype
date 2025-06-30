const express = require('express');
const router = express.Router();

// Import semua router modular
const authRoutes = require('./auth');
const profileRoutes = require('./profile');
const leadsRoutes = require('./leads');
const disbursementRoutes = require('./disbursement');
const loanApplicationRoutes = require('./loanApplication');

// Gunakan masing-masing router
router.use(authRoutes);
router.use(profileRoutes);
router.use(leadsRoutes);
router.use(disbursementRoutes);
router.use(loanApplicationRoutes);

module.exports = router;

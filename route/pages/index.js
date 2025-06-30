require('dotenv').config();
const express = require('express');
const path = require('path');
const router = express.Router();

// Middleware auth sederhana
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  return res.redirect('/login');
}

// Halaman landing
router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// Halaman login
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, '../../public/login.html'));
});

// Halaman register
router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, '../../public/register.html'));
});

// Halaman dashboard (harus login)
router.get('/dashboard', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/dashboard.html'));
});

// Route untuk kirim config ke frontend
router.get('/config', (req, res) => {
  res.json({
    affiliateBaseUrl: process.env.AFFILIATE_BASE_URL
  });
});

// Halaman affiliate form
router.get('/form/:affiliateId', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/affiliate_form.html'));
});

// Halaman affiliate form success
router.get('/affiliate_form_success', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/affiliate_form_success.html'));
});

// Halaman disbursement
router.get('/disbursement', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/disbursement.html'));
});

module.exports = router;

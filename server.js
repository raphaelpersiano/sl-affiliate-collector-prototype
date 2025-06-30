require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Middleware dasar
app.use(session({
  secret: 'skor123',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 86400000 }
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware untuk autentikasi
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  return res.redirect('/login');
}
app.use((req, res, next) => {
  req.supabase = supabase;
  req.isAuthenticated = isAuthenticated;
  next();
});

// Routing terpisah
app.use('/', require('./route/pages'));
app.use('/api', require('./route/api'));

// Jalankan server
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});

const express = require('express');
const router = express.Router();

// Middleware auth
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  return res.redirect('/login');
}

// GET /api/user-data
router.get("/user-data", isAuthenticated, async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('affiliates')
      .select('name, affiliate_code, address, account_number, account_name, bank_name')
      .eq('user_id', req.session.user.id)
      .single();

    if (error) return res.status(500).json({ message: 'Gagal mengambil data pengguna.' });
    if (!data) return res.status(404).json({ message: 'Data tidak ditemukan.' });

    res.json({ ...req.session.user, ...data });
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data pengguna.' });
  }
});

// POST /api/update-profile
router.post("/update-profile", isAuthenticated, async (req, res) => {
  const { account_number, account_name, bank_name, address } = req.body;
  const userId = req.session.user.id;

  try {
    const { data, error } = await req.supabase
      .from('affiliates')
      .update({ account_number, account_name, bank_name, address, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select();

    if (error) throw error;
    res.json({ message: 'Profil berhasil diperbarui!', profile: data[0] });
  } catch (err) {
    res.status(500).json({ message: 'Gagal memperbarui profil.' });
  }
});

module.exports = router;

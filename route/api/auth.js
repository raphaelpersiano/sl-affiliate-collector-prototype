const express = require('express');
const router = express.Router();
const generateAffiliateCode = require('../../utils/generateAffiliateCode');

// Middleware
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  return res.redirect('/login');
}

// POST /api/google-login
router.post("/google-login", async (req, res) => {
  const { id_token } = req.body;
  const supabase = req.supabase;

  if (!id_token) return res.status(400).json({ message: "ID Token tidak ditemukan." });

  try {
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: "google", token: id_token });
    if (error) return res.status(401).json({ message: "Login Google gagal: " + error.message });

    const user = data.user;
    if (!user) return res.status(401).json({ message: "Pengguna tidak ditemukan." });

    let { data: profileData, error: profileError } = await supabase
      .from("affiliates")
      .select("name, affiliate_code")
      .eq("user_id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") return res.status(500).json({ message: "Gagal ambil profil." });

    if (!profileData) {
      let affiliateCode = generateAffiliateCode();
      let codeExists = true;
      while (codeExists) {
        const { data: existingCode } = await supabase
          .from("affiliates")
          .select("user_id")
          .eq("affiliate_code", affiliateCode)
          .single();
        if (existingCode) affiliateCode = generateAffiliateCode();
        else codeExists = false;
      }

      const userName = user.user_metadata.full_name || user.user_metadata.name || user.email;
      const { data: newProfile, error: insertError } = await supabase
        .from("affiliates")
        .insert([{ user_id: user.id, name: userName, affiliate_code: affiliateCode }])
        .select();
      if (insertError) return res.status(500).json({ message: "Gagal membuat profil." });
      profileData = newProfile[0];
    }

    req.session.user = {
      id: user.id,
      email: user.email,
      name: profileData.name,
      affiliate_code: profileData.affiliate_code
    };

    req.session.save(err => {
      if (err) return res.status(500).json({ message: "Gagal menyimpan sesi." });
      res.json({ message: "Login Google berhasil!", user: req.session.user });
    });

  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

// POST /api/register
router.post("/register", async (req, res) => {
  const supabase = req.supabase;
  const { name, phone, pin } = req.body;

  if (!name || !phone || !pin) return res.status(400).json({ message: 'Semua field wajib diisi.' });
  if (pin.length !== 6 || !/^[0-9]{6}$/.test(pin)) return res.status(400).json({ message: 'PIN harus 6 digit.' });

  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({ phone, password: pin });
    if (authError) return res.status(500).json({ message: 'Registrasi gagal: ' + authError.message });

    const user = authData.user;

    let affiliateCode = generateAffiliateCode();
    let codeExists = true;
    while (codeExists) {
      const { data: existingCode } = await supabase.from('affiliates').select('user_id').eq('affiliate_code', affiliateCode).single();
      if (existingCode) affiliateCode = generateAffiliateCode();
      else codeExists = false;
    }

    const { data: profileData, error: profileError } = await supabase
      .from('affiliates')
      .insert([{ user_id: user.id, name, affiliate_code: affiliateCode }])
      .select();
    if (profileError) {
      console.error('Insert error:', profileError);
      return res.status(500).json({ message: 'Gagal menyimpan profil.', detail: profileError.message });
    }

    req.session.user = {
      id: user.id,
      phone: user.phone,
      name,
      affiliate_code: affiliateCode
    };

    res.json({ message: 'Registrasi berhasil!', user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/login
router.post("/login", async (req, res) => {
  const { phone, pin } = req.body;
  const supabase = req.supabase;

  if (!phone || !pin) return res.status(400).json({ message: 'Nomor dan PIN wajib diisi.' });

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ phone, password: pin });
    if (authError) return res.status(401).json({ message: 'Login gagal: ' + authError.message });

    const user = authData.user;
    const { data: profileData } = await supabase
      .from('affiliates')
      .select('name, affiliate_code')
      .eq('user_id', user.id)
      .single();

    req.session.user = {
      id: user.id,
      phone: user.phone,
      name: profileData.name,
      affiliate_code: profileData.affiliate_code
    };

    res.json({ message: 'Login berhasil!', user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login gagal. Silakan coba lagi.' });
  }
});

// GET /api/logout
router.get("/logout", async (req, res) => {
  try {
    await req.supabase.auth.signOut();
    req.session.destroy(() => {
      res.redirect('/'); // 🔁 Redirect ke landing page
    });
  } catch (err) {
    res.status(500).json({ message: "Logout gagal." });
  }
});

module.exports = router;

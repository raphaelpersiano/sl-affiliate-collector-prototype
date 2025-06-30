const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const upload = multer({ dest: 'tmp/' });

// POST /api/admin/validate - Validasi password admin
router.post('/admin/validate', (req, res) => {
  const { password } = req.body;
  
  // Password admin (dalam production, sebaiknya menggunakan environment variable)
  const ADMIN_PASSWORD = 'admin123';
  
  if (!password) {
    return res.status(400).json({ error: 'Password diperlukan' });
  }
  
  if (password === ADMIN_PASSWORD) {
    // Dalam production, bisa menggunakan JWT token
    res.json({ 
      success: true, 
      message: 'Password admin valid',
      token: 'admin-session-' + Date.now() // Simple token untuk demo
    });
  } else {
    res.status(401).json({ 
      success: false, 
      error: 'Password admin salah' 
    });
  }
});

// Middleware auth sederhana
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  return res.redirect('/login');
}

// GET /api/disbursements - Mengambil data disbursement milik user yang login
router.get("/disbursements", isAuthenticated, async (req, res) => {
  const supabase = req.supabase;
  const userId = req.session.user?.id;

  try {
    if (!userId) {
      return res.status(404).json({ message: 'User ID tidak ditemukan dalam session.' });
    }

    // Join disbursements dengan leads, filter berdasarkan affiliate_id
    const { data: disbursements, error: disbursementError } = await supabase
      .from("disbursements")
      .select(`
        id,
        amount,
        disbursement_date,
        proof_url,
        leads!inner(
          id,
          full_name,
          whatsapp_number,
          affiliate_id
        )
      `)
      .eq('leads.affiliate_id', userId);

    if (disbursementError) {
      console.error('Error fetching disbursements:', disbursementError);
      return res.status(500).json({ error: disbursementError.message });
    }

    // Format data untuk frontend
    const formattedData = disbursements.map(disbursement => ({
      id: disbursement.id,
      name: disbursement.leads.full_name,
      phone: disbursement.leads.whatsapp_number,
      amount: disbursement.amount,
      date: disbursement.disbursement_date,
      proof: disbursement.proof_url
    }));

    res.json(formattedData);
  } catch (err) {
    console.error('Unhandled error in /api/disbursements route:', err);
    res.status(500).json({ error: "Gagal mengambil data disbursement." });
  }
});

// POST /api/disbursement
router.post("/disbursement", upload.single("proofFile"), async (req, res) => {
  const { lead_id, amount, disbursement_date } = req.body;
  const file = req.file;

  if (!lead_id || !amount || !disbursement_date || !file) {
    return res.status(400).json({ error: 'Lengkapi semua field dan file' });
  }

  const fileExt = path.extname(file.originalname);
  const newFileName = `${lead_id}_${Date.now()}${fileExt}`;
  const uploadPath = `disbursement-proof/${newFileName}`;

  try {
    // Use service role client to bypass RLS
    const { createClient } = require('@supabase/supabase-js');
    const supabaseServiceRole = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { error: uploadError } = await supabaseServiceRole
      .storage
      .from("sl-affiliate-collector")
      .upload(uploadPath, fs.createReadStream(file.path), {
        contentType: file.mimetype,
        duplex: "half",
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ error: uploadError.message });
    }

    const { data: publicUrlData } = supabaseServiceRole
      .storage
      .from("sl-affiliate-collector")
      .getPublicUrl(uploadPath);

    const { error: insertError } = await supabaseServiceRole
      .from("disbursements")
      .insert([{
        lead_id: lead_id,
        amount: parseFloat(amount),
        disbursement_date: disbursement_date,
        proof_url: publicUrlData.publicUrl,
      }]);

    fs.unlinkSync(file.path); // hapus file temp

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    res.json({ message: "Berhasil upload & simpan" });
  } catch (err) {
    console.error('Upload disbursement error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan saat upload.' });
  }
});

// DELETE /api/disbursement/:id - Hapus disbursement dan file proof
router.delete("/disbursement/:id", async (req, res) => {
  const disbursementId = req.params.id;

  try {
    // Use service role client to bypass RLS
    const { createClient } = require('@supabase/supabase-js');
    const supabaseServiceRole = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Ambil data disbursement untuk mendapatkan proof_url
    const { data: disbursement, error: fetchError } = await supabaseServiceRole
      .from("disbursements")
      .select("proof_url")
      .eq("id", disbursementId)
      .single();

    if (fetchError) {
      console.error('Error fetching disbursement:', fetchError);
      return res.status(404).json({ error: "Disbursement tidak ditemukan" });
    }

    // Hapus file dari storage jika ada
    if (disbursement.proof_url) {
      const fileName = disbursement.proof_url.split('/').pop();
      const { error: deleteFileError } = await supabaseServiceRole.storage
        .from('sl-affiliate-collector')
        .remove([`disbursement-proof/${fileName}`]);

      if (deleteFileError) {
        console.error('Error deleting file from storage:', deleteFileError);
        // Lanjutkan menghapus record meskipun file gagal dihapus
      }
    }

    // Hapus record dari database
    const { error: deleteError } = await supabaseServiceRole
      .from("disbursements")
      .delete()
      .eq("id", disbursementId);

    if (deleteError) {
      console.error('Error deleting disbursement:', deleteError);
      return res.status(500).json({ error: deleteError.message });
    }

    res.json({ message: "Disbursement berhasil dihapus" });
  } catch (err) {
    console.error('Unhandled error in DELETE /api/disbursement/:id route:', err);
    res.status(500).json({ error: "Gagal menghapus disbursement" });
  }
});

module.exports = router;


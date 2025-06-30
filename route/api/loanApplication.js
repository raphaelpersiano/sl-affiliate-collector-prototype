const express = require('express');
const router = express.Router();

// POST /api/submit-loan-application
router.post("/submit-loan-application", async (req, res) => {
  const { fullName, whatsappNumber, loanAmount, loanTypes, affiliateCode } = req.body;
  const supabase = req.supabase;

  if (!fullName || !whatsappNumber || !loanAmount || !loanTypes || !affiliateCode) {
    return res.status(400).json({ message: 'Semua kolom formulir harus diisi.' });
  }

  try {
    // Cari affiliate user_id berdasarkan affiliateCode
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('user_id')
      .eq('affiliate_code', affiliateCode)
      .single();

    if (affiliateError || !affiliate) {
      return res.status(400).json({ message: 'Kode affiliate tidak valid.' });
    }

    // Simpan data pengajuan
    const { data, error } = await supabase
      .from('leads')
      .insert([{
        full_name: fullName,
        whatsapp_number: whatsappNumber,
        loan_amount: loanAmount,
        loan_types: loanTypes,
        affiliate_id: affiliate.user_id
      }])
      .select();

    if (error) throw error;

    res.json({ message: 'Pengajuan berhasil diterima!', lead: data[0] });
  } catch (err) {
    console.error('Loan application error:', err);
    res.status(500).json({ message: 'Gagal mengirim pengajuan.' });
  }
});

module.exports = router;

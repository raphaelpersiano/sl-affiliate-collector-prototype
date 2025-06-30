const express = require('express');
const router = express.Router();

// Middleware auth sederhana
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  return res.redirect('/login');
}

// GET /api/leads
router.get("/leads", isAuthenticated, async (req, res) => {
  const supabase = req.supabase;
  const userId = req.session.user?.id;

  try {
    // Jika affiliate_id tidak ditemukan (misal kolomnya null), tangani
    if (!userId) {
        return res.status(404).json({ message: 'Affiliate ID tidak terdaftar untuk pengguna ini.' });
    }

    // Ambil data leads dengan left join ke disbursements untuk mendapatkan proof_url
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select(`
        id, 
        full_name, 
        whatsapp_number, 
        status,
        disbursements(proof_url)
      `)
      .eq('affiliate_id', userId); // Filter berdasarkan affiliate_id yang ditemukan

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return res.status(500).json({ error: leadsError.message });
    }

    // Format data untuk frontend
    const formattedLeads = leads.map(lead => ({
      id: lead.id,
      full_name: lead.full_name,
      whatsapp_number: lead.whatsapp_number,
      status: lead.status,
      proof_url: lead.disbursements && lead.disbursements.length > 0 ? lead.disbursements[0].proof_url : null
    }));

    res.json(formattedLeads); // Mengirimkan data leads yang sudah difilter
  } catch (err) {
    console.error('Unhandled error in /api/leads route:', err);
    res.status(500).json({ error: "Gagal mengambil data leads." });
  }
});

// POST /api/submit-loan-application - Menyimpan data leads baru
router.post("/submit-loan-application", async (req, res) => {
  const supabase = req.supabase;
  const { fullName, whatsappNumber, loanAmount, loanTypes, affiliateCode } = req.body;

  try {
    // Validasi input
    if (!fullName || !whatsappNumber || !loanAmount || !loanTypes || !affiliateCode) {
      return res.status(400).json({ error: 'Semua field wajib diisi.' });
    }

    // Cari affiliate berdasarkan kode affiliate
    const { data: affiliate, error: affiliateError } = await supabase
      .from("affiliates")
      .select("user_id")
      .eq('affiliate_code', affiliateCode) // Asumsi kode affiliate adalah nomor telepon user
      .single();

    if (affiliateError || !affiliate) {
      return res.status(404).json({ error: 'Kode affiliate tidak valid.' });
    }

    // Simpan data ke table leads
    const { data: newLead, error: insertError } = await supabase
      .from("leads")
      .insert([{
        full_name: fullName,
        whatsapp_number: whatsappNumber,
        loan_amount: loanAmount,
        loan_types: loanTypes,
        affiliate_id: affiliate.id,
        status: 'registration' // Status default
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting lead:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    res.json({ 
      message: 'Pengajuan berhasil dikirim!', 
      leadId: newLead.id 
    });
  } catch (err) {
    console.error('Unhandled error in /api/submit-loan-application route:', err);
    res.status(500).json({ error: "Gagal menyimpan data pengajuan." });
  }
});

// GET /api/leads/admin - Mengambil semua leads untuk admin (tanpa filter user)
router.get("/leads/admin", async (req, res) => {
  const supabase = req.supabase;

  try {
    // Ambil semua data leads dengan left join ke disbursements untuk mendapatkan proof_url dan amount
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select(`
        id, 
        full_name, 
        whatsapp_number, 
        status,
        loan_amount,
        loan_types,
        created_at,
        affiliate_id,
        disbursements(id, proof_url, amount)
      `)
      .order('created_at', { ascending: false }); // Urutkan berdasarkan tanggal terbaru

    if (leadsError) {
      console.error('Error fetching admin leads:', leadsError);
      return res.status(500).json({ error: leadsError.message });
    }

    // Hitung total amount dari semua disbursements
    let totalAmount = 0;
    leads.forEach(lead => {
      if (lead.disbursements && lead.disbursements.length > 0) {
        lead.disbursements.forEach(disbursement => {
          if (disbursement.amount) {
            totalAmount += parseFloat(disbursement.amount);
          }
        });
      }
    });

    // Ambil data affiliate untuk setiap lead
    const leadsWithAffiliate = await Promise.all(leads.map(async (lead) => {
      let affiliateName = 'Unknown';
      
      if (lead.affiliate_id) {
        const { data: affiliate } = await supabase
          .from("users")
          .select("full_name")
          .eq('id', lead.affiliate_id)
          .single();
        
        if (affiliate) {
          affiliateName = affiliate.full_name;
        }
      }

      return {
        id: lead.id,
        full_name: lead.full_name,
        whatsapp_number: lead.whatsapp_number,
        status: lead.status,
        loan_amount: lead.loan_amount,
        loan_types: lead.loan_types,
        affiliate_name: affiliateName,
        created_at: lead.created_at,
        proof_url: lead.disbursements && lead.disbursements.length > 0 ? lead.disbursements[0].proof_url : null,
        disbursement_id: lead.disbursements && lead.disbursements.length > 0 ? lead.disbursements[0].id : null
      };
    }));

    res.json({
      leads: leadsWithAffiliate,
      totalAmount: totalAmount
    });
  } catch (err) {
    console.error('Unhandled error in /api/leads/admin route:', err);
    res.status(500).json({ error: "Gagal mengambil data leads admin." });
  }
});

// PUT /api/leads/:id/status - Update status lead untuk admin
router.put("/leads/:id/status", async (req, res) => {
  const supabase = req.supabase;
  const leadId = req.params.id;
  const { status } = req.body;

  try {
    // Validasi status yang diizinkan
    const allowedStatuses = ['registration', 'consultation', 'payment', 'disbursement'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Status tidak valid." });
    }

    // Update status lead
    const { data, error } = await supabase
      .from("leads")
      .update({ status: status })
      .eq('id', leadId)
      .select()
      .single();

    if (error) {
      console.error('Error updating lead status:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: "Lead tidak ditemukan." });
    }

    res.json({ 
      message: "Status lead berhasil diupdate.", 
      lead: data 
    });
  } catch (err) {
    console.error('Unhandled error in update lead status:', err);
    res.status(500).json({ error: "Gagal mengupdate status lead." });
  }
});

module.exports = router;


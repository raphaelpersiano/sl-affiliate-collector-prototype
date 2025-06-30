document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const profileTab = document.getElementById('profileTab');
    const leadsTab = document.getElementById('leadsTab');
    const profileContent = document.getElementById('profileContent');
    const leadsContent = document.getElementById('leadsContent');
    const affiliateLinkInput = document.getElementById('affiliateLink');
    const copyLinkButton = document.getElementById('copyLinkButton');
    const qrcodeContainer = document.getElementById('qrcode');
    const logoutButton = document.getElementById('logoutButton');

    // Nested Leads Tabs
    const statusSubTab = document.getElementById('statusSubTab');
    const disbursementSubTab = document.getElementById('disbursementSubTab');
    const statusContent = document.getElementById('statusContent');
    const disbursementContent = document.getElementById('disbursementContent');

    // Statistics Elements
    const statusCountContainer = document.getElementById('statusCountContainer');
    const allTimeDisbursementElement = document.getElementById('allTimeDisbursement');

    // Table Containers
    const leadsStatusTableBody = document.getElementById('leadsStatusTableBody');
    const disbursementTableBody = document.getElementById('disbursementTableBody');

    // Proof Modal Elements
    const proofModal = document.getElementById('proofModal');
    const proofImage = document.getElementById('proofImage');
    const closeModalButton = document.getElementById('closeModalButton');

    // --- Data Variables ---
    let leadsStatusData = []; // Will be populated by loadLeads()
    let disbursementData = []; // Will be populated by loadDisbursements()

    // --- Load Disbursements Data from API ---
    async function loadDisbursements() {
        try {
            const res = await fetch('/api/disbursements', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Gagal ambil data disbursements.');

            disbursementData = data.map(disbursement => ({
                id: disbursement.id,
                name: disbursement.name,
                phone: disbursement.phone,
                amount: disbursement.amount,
                date: disbursement.date,
                proof: disbursement.proof
            }));

            console.log('Disbursements from server:', disbursementData);
            
            // Render data jika tab disbursement sedang aktif
            if (!disbursementContent.classList.contains('hidden')) {
                renderDisbursementTab();
            }

        } catch (err) {
            console.error('Error fetching disbursements:', err);
            // Show error message in UI
            if (disbursementTableBody) {
                disbursementTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="py-4 px-4 text-center text-red-600">
                            Gagal memuat data disbursement: ${err.message}
                        </td>
                    </tr>
                `;
            }
        }
    }

    // --- Load Leads Data from API ---
    async function loadLeads() {
        try {
            const res = await fetch('/api/leads', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Gagal ambil data leads.');

            leadsStatusData = data.map(lead => ({
                id: lead.id,
                name: lead.full_name,
                phone: lead.whatsapp_number,
                status: lead.status || 'registration'
            }));

            console.log('Leads from server:', leadsStatusData);
            
            // Render data jika tab leads sedang aktif
            if (!leadsContent.classList.contains('hidden')) {
                renderStatusTab();
            }

        } catch (err) {
            console.error('Error fetching leads:', err);
            // Show error message in UI
            if (leadsStatusTableBody) {
                leadsStatusTableBody.innerHTML = `
                    <tr>
                        <td colspan="3" class="py-4 px-4 text-center text-red-600">
                            Gagal memuat data leads: ${err.message}
                        </td>
                    </tr>
                `;
            }
        }
    }

    const STATUS_ORDER = ['registration', 'consultation', 'payment', 'disbursement'];
    const STATUS_COLORS = {
        registration: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-500' },
        consultation: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-500' },
        payment: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-500' },
        disbursement: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-500' },
    };

    // --- Main Tab Switching Logic ---
    function showMainTab(tabId ) {
        document.querySelectorAll('.main-tab-link').forEach(tab => {
            tab.classList.remove('border-indigo-500', 'text-indigo-600');
            tab.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        });
        document.querySelectorAll('.main-tab-pane').forEach(pane => {
            pane.classList.add('hidden');
        });

        if (tabId === 'profile') {
            profileTab.classList.add('border-indigo-500', 'text-indigo-600');
            profileTab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            profileContent.classList.remove('hidden');
        } else if (tabId === 'leads') {
            leadsTab.classList.add('border-indigo-500', 'text-indigo-600');
            leadsTab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            leadsContent.classList.remove('hidden');
            // Show default sub-tab when Leads tab is opened
            showLeadsSubTab('status');
        }
    }

    profileTab.addEventListener('click', (e) => {
        e.preventDefault();
        showMainTab('profile');
    });

    leadsTab.addEventListener('click', (e) => {
        e.preventDefault();
        showMainTab('leads');
    });

    // --- Nested Leads Tab Switching Logic ---
    function showLeadsSubTab(subTabId) {
        document.querySelectorAll('.leads-sub-tab-link').forEach(tab => {
            tab.classList.remove('border-indigo-500', 'text-indigo-600');
            tab.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        });
        document.querySelectorAll('.leads-sub-tab-pane').forEach(pane => {
            pane.classList.add('hidden');
        });

        if (subTabId === 'status') {
            statusSubTab.classList.add('border-indigo-500', 'text-indigo-600');
            statusSubTab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            statusContent.classList.remove('hidden');
            // Load leads data and disbursement data for total calculation, then render
            Promise.all([loadLeads(), loadDisbursements()]).then(() => renderStatusTab());
        } else if (subTabId === 'disbursement') {
            disbursementSubTab.classList.add('border-indigo-500', 'text-indigo-600');
            disbursementSubTab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            disbursementContent.classList.remove('hidden');
            // Load disbursement data and render when disbursement tab is shown
            loadDisbursements().then(() => renderDisbursementTab());
        }
    }

    statusSubTab.addEventListener('click', (e) => {
        e.preventDefault();
        showLeadsSubTab('status');
    });

    disbursementSubTab.addEventListener('click', (e) => {
        e.preventDefault();
        showLeadsSubTab('disbursement');
    });

    // --- Render Status Tab Content ---
    function renderStatusTab() {
        // Calculate Status Count
        const statusCounts = leadsStatusData.reduce((acc, lead) => {
            acc[lead.status] = (acc[lead.status] || 0) + 1;
            return acc;
        }, {});

        statusCountContainer.innerHTML = ''; // Clear previous counts
        STATUS_ORDER.forEach(status => {
            const count = statusCounts[status] || 0;
            const statusName = status.charAt(0).toUpperCase() + status.slice(1); // Capitalize first letter
            const countElement = document.createElement('div');
            countElement.className = `p-4 rounded-lg shadow-sm ${STATUS_COLORS[status].bg} ${STATUS_COLORS[status].text}`;
            countElement.innerHTML = `<p class="text-sm font-medium">${statusName}</p><p class="text-2xl font-bold">${count}</p>`;
            statusCountContainer.appendChild(countElement);
        });

        // Calculate All Time Disbursement
        const totalDisbursement = disbursementData.reduce((sum, item) => sum + item.amount, 0);
        allTimeDisbursementElement.textContent = `Rp ${totalDisbursement.toLocaleString('id-ID')}`;

        // Render Leads Status Table
        leadsStatusTableBody.innerHTML = ''; // Clear previous table rows
        leadsStatusData.forEach(lead => {
            const row = document.createElement('tr');
            row.className = 'border-b last:border-b-0';
            row.innerHTML = `
                <td class="py-3 px-4">${lead.name}</td>
                <td class="py-3 px-4">${lead.phone}</td>
                <td class="py-3 px-4">
                    ${generateStatusBreadcrumb(lead.status)}
                </td>
            `;
            leadsStatusTableBody.appendChild(row);
        });
    }

    function generateStatusBreadcrumb(currentStatus) {
        let breadcrumbHtml = '<div class="flex items-center space-x-1 text-sm">';
        let isCurrentOrPast = true;

        STATUS_ORDER.forEach((status, index) => {
            const isActive = status === currentStatus;
            const isCompleted = isCurrentOrPast && STATUS_ORDER.indexOf(status) < STATUS_ORDER.indexOf(currentStatus);
            const colorClass = STATUS_COLORS[status];

            let itemClass = `px-2 py-1 rounded-full border ${colorClass.border} ${colorClass.bg} ${colorClass.text}`;
            if (isActive) {
                itemClass += ' font-semibold';
                isCurrentOrPast = false; // All subsequent statuses are future
            } else if (isCompleted) {
                itemClass += ' opacity-75'; // Dim completed steps
            } else {
                itemClass += ' opacity-50'; // Dim future steps
            }

            breadcrumbHtml += `<span class="${itemClass}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
            if (index < STATUS_ORDER.length - 1) {
                breadcrumbHtml += `<span class="text-gray-400">›</span>`;
            }
        });
        breadcrumbHtml += '</div>';
        return breadcrumbHtml;
    }

    // --- Render Disbursement Tab Content ---
    function renderDisbursementTab() {
        disbursementTableBody.innerHTML = ''; // Clear previous table rows
        disbursementData.forEach(item => {
            const row = document.createElement('tr');
            row.className = 'border-b last:border-b-0';
            row.innerHTML = `
                <td class="py-3 px-4">${item.name}</td>
                <td class="py-3 px-4">${item.phone}</td>
                <td class="py-3 px-4">Rp ${item.amount.toLocaleString('id-ID')}</td>
                <td class="py-3 px-4">${item.date}</td>
                <td class="py-3 px-4">
                    <button class="view-proof-button px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300 text-sm" data-proof-url="${item.proof}">
                        Lihat Bukti
                    </button>
                </td>
            `;
            disbursementTableBody.appendChild(row);
        });

        // Add event listeners for view proof buttons
        document.querySelectorAll('.view-proof-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const proofUrl = e.target.dataset.proofUrl;
                proofImage.src = proofUrl;
                proofModal.classList.remove('hidden');
            });
        });
    }

    // --- Proof Modal Logic ---
    closeModalButton.addEventListener('click', () => {
        proofModal.classList.add('hidden');
        proofImage.src = ''; // Clear image source
    });

    proofModal.addEventListener('click', (e) => {
        if (e.target === proofModal) { // Close if clicked outside image
            proofModal.classList.add('hidden');
            proofImage.src = '';
        }
    });

    // --- QR Code Generation (Existing) ---
    const affiliateId = "COLLECTOR123"; // Example ID
    const affiliateBaseUrl = "http://localhost:3000/affiliate/"; // Base URL for affiliate link
    const fullAffiliateLink = affiliateBaseUrl + affiliateId;
    affiliateLinkInput.value = fullAffiliateLink;

    if (qrcodeContainer ) {
        new QRCode(qrcodeContainer, {
            text: fullAffiliateLink,
            width: 256,
            height: 256,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
    }

    // --- Copy Link Functionality (Existing) ---
    copyLinkButton.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(affiliateLinkInput.value);
            alert('Link affiliate berhasil disalin!');
        } catch (err) {
            console.error('Gagal menyalin link: ', err);
            alert('Gagal menyalin link. Silakan salin manual.');
        }
    });

    // --- Logout Logic (Existing) ---
    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Anda telah logout.');
        window.location.href = '/api/logout'; 
    });

    // --- Save Profile Changes (Existing) ---
   

    // --- Initial Load ---
    showMainTab('profile'); // Show profile tab by default on load

    // Ambil affiliate_code dari sesi (ini akan memerlukan endpoint API baru untuk mendapatkan data sesi)
    // Untuk sementara, kita akan buat endpoint di server.js untuk mendapatkan data user dari sesi
    async function fetchUserData() {
        try {
            const response = await fetch('/api/user-data'); // Endpoint baru
            if (response.ok) {
                const userData = await response.json();
                // Fetch config (e.g., affiliateBaseUrl)
                const configRes = await fetch('/config');
                const configData = await configRes.json();
                const affiliateBaseUrl = configData.affiliateBaseUrl;
                
                if (userData && userData.affiliate_code) {
                    const affiliateId = userData.affiliate_code; // Gunakan kode affiliate dari sesi
                    const fullAffiliateLink = affiliateBaseUrl + affiliateId;
                    affiliateLinkInput.value = fullAffiliateLink;

                    if (qrcodeContainer ) {
                        qrcodeContainer.innerHTML = ''; // Clear previous QR code
                        new QRCode(qrcodeContainer, {
                            text: fullAffiliateLink,
                            width: 256,
                            height: 256,
                            colorDark : "#000000",
                            colorLight : "#ffffff",
                            correctLevel : QRCode.CorrectLevel.H
                        });
                    }
                    // Update nama dan email di profil
                    document.getElementById('collectorName').value = userData.name || 'Nama Kolektor';
                    document.getElementById('collectorEmail').value = userData.email || 'email@example.com';
                    document.getElementById('collectorPhone').value = userData.phone || '08123456789';
                    document.getElementById('collectorAddress').value = userData.address;
                    document.getElementById('collectorAccNumber').value = userData.account_number;
                    document.getElementById('collectorAccName').value = userData.account_name;
                    document.getElementById('collectorBankName').value = userData.bank_name;

                } else {
                    console.warn('Affiliate code tidak ditemukan di data pengguna.');
                    affiliateLinkInput.value = 'Kode Affiliate Tidak Tersedia';
                }
            } else {
                console.error('Gagal mengambil data pengguna:', response.statusText);
                // Mungkin redirect ke login jika sesi tidak valid
                // window.location.href = '/login';
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    }

    fetchUserData(); // Panggil fungsi ini saat DOMContentLoaded
});

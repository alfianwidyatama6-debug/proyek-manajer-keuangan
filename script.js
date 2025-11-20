document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const balanceEl = document.getElementById('balance');
    const incomeEl = document.getElementById('total-income');
    const expenseEl = document.getElementById('total-expense');
    const listEl = document.getElementById('transaction-list');
    const form = document.getElementById('transaction-form');
    const textInput = document.getElementById('text');
    const amountInput = document.getElementById('amount');
    const dateInput = document.getElementById('date');
    const categoryInput = document.getElementById('category');
    const typeInput = document.getElementById('type-select');
    const monthFilter = document.getElementById('month-filter');
    
    // Edit & Buttons
    const submitBtn = document.getElementById('submit-btn');
    const cancelBtn = document.getElementById('cancel-edit');
    const editIdInput = document.getElementById('edit-id');
    const exportBtn = document.getElementById('export-btn');
    const resetBtn = document.getElementById('reset-btn');

    // Chart Contexts
    // Pastikan ID 'expenseChart' dan 'trendChart' ada di HTML Anda
    const ctxExpense = document.getElementById('expenseChart') ? document.getElementById('expenseChart').getContext('2d') : null;
    const ctxTrend = document.getElementById('trendChart') ? document.getElementById('trendChart').getContext('2d') : null;

    // --- STATE & VARIABLES ---
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    let expenseChartInstance = null;
    let trendChartInstance = null;

    // Daftar Kategori
    const categories = {
        expense: ['Makanan', 'Transportasi', 'Tagihan', 'Hiburan', 'Belanja', 'Kesehatan', 'Pendidikan', 'Sedekah', 'Lainnya'],
        income: ['Gaji', 'Bonus', 'Freelance', 'Investasi', 'Hadiah', 'Lainnya']
    };

    // --- INIT ---
    function init() {
        dateInput.valueAsDate = new Date();
        const now = new Date();
        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        monthFilter.value = currentMonthStr;

        updateCategories(); // Dipanggil langsung
        updateUI();
    }

    // --- HELPER FUNCTIONS ---

    // FUNGSI INI TIDAK PERLU WINDOW. KARENA DIPANGGIL SECARA INTERNAL
    function updateCategories() {
        const type = typeInput.value;
        categoryInput.innerHTML = '';
        categories[type].forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.innerText = cat;
            categoryInput.appendChild(option);
        });
    }

    amountInput.addEventListener('input', function(e) {
        // Hanya izinkan angka, lalu format
        let value = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    });
    
    // Tambahkan listener untuk Type agar Category ikut berubah
    typeInput.addEventListener('change', updateCategories);

    // --- CORE LOGIC: FILTERING ---
    function getFilteredTransactions() {
        const selectedMonth = monthFilter.value;
        if (!selectedMonth) return transactions;
        return transactions.filter(t => t.date.startsWith(selectedMonth));
    }

    // --- CRUD OPERATIONS ---
    function saveTransaction(e) {
        e.preventDefault();
        const text = textInput.value.trim();
        // Hapus titik sebelum parsing
        const rawAmount = amountInput.value.replace(/\./g, ''); 
        const date = dateInput.value;

        if (text === '' || rawAmount === '' || date === '') {
            alert('Mohon lengkapi semua data');
            return;
        }
        
        // Pastikan amount adalah integer positif yang valid
        const amount = parseInt(rawAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Jumlah transaksi harus berupa angka positif.');
            return;
        }

        const type = typeInput.value;
        const category = categoryInput.value;
        const editId = editIdInput.value;

        if (editId) {
            const index = transactions.findIndex(t => t.id == editId);
            if (index !== -1) {
                // Pastikan tipe data id konsisten (number)
                transactions[index] = { id: parseInt(editId), text, amount, type, category, date }; 
            }
            exitEditMode();
        } else {
            const transaction = {
                id: Date.now(),
                text, amount, type, category, date
            };
            transactions.push(transaction);
        }

        updateLocalStorage();
        updateUI();
        
        textInput.value = '';
        amountInput.value = '';
    }
    
    // FUNGSI INI HARUS GLOBAL (WINDOW.) AGAR BISA DIPANGGIL DARI INLINE HTML
    window.removeTransaction = function(id) {
        if(confirm('Hapus transaksi ini?')) {
            transactions = transactions.filter(t => t.id !== id);
            updateLocalStorage();
            updateUI();
        }
    }
    
    // FUNGSI INI HARUS GLOBAL (WINDOW.) AGAR BISA DIPANGGIL DARI INLINE HTML
    window.editTransaction = function(id) {
        const t = transactions.find(t => t.id === id);
        if (!t) return;

        textInput.value = t.text;
        // Format angka saat mengisi input
        amountInput.value = t.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); 
        typeInput.value = t.type;
        dateInput.value = t.date;
        updateCategories(); // Panggil agar kategori baru terisi
        categoryInput.value = t.category;
        editIdInput.value = t.id;

        submitBtn.innerText = 'Update';
        submitBtn.style.background = '#e67e22';
        cancelBtn.style.display = 'block';
        
        if(window.innerWidth < 768) {
            document.querySelector('.form-section').scrollIntoView({behavior: 'smooth'});
        }
    }

    function exitEditMode() {
        editIdInput.value = '';
        submitBtn.innerText = 'Simpan';
        submitBtn.style.background = '';
        cancelBtn.style.display = 'none';
        textInput.value = '';
        amountInput.value = '';
        dateInput.valueAsDate = new Date();
        updateCategories(); // Reset kategori setelah edit selesai
    }

    cancelBtn.addEventListener('click', exitEditMode);
    monthFilter.addEventListener('change', updateUI);

    // --- UI UPDATE MANAGER ---
    function updateUI() {
        const filteredData = getFilteredTransactions();
        
        const amounts = filteredData.map(t => t.type === 'income' ? t.amount : -t.amount);
        const total = amounts.reduce((acc, item) => (acc += item), 0);
        const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0);
        const expense = amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) * -1;

        balanceEl.innerText = formatRupiah(total);
        incomeEl.innerText = formatRupiah(income);
        expenseEl.innerText = formatRupiah(expense);

        listEl.innerHTML = '';
        // Sorting berdasarkan tanggal terbaru
        const sortedData = [...filteredData].sort((a, b) => new Date(b.date) - new Date(a.date)); 
        
        if (sortedData.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px;">Tidak ada data di bulan ini.</p>';
        }

        sortedData.forEach(t => {
            const item = document.createElement('li');
            item.classList.add(t.type);
            const sign = t.type === 'income' ? '+' : '-';
            const dateFormatted = new Date(t.date + 'T00:00:00').toLocaleDateString('id-ID', {day:'numeric', month:'short'}); // Fix parsing date
            
            item.innerHTML = `
                <div>
                    <h4>${t.text} <span class="history-date">${dateFormatted}</span></h4>
                    <small>${t.category}</small>
                </div>
                <div style="text-align:right;">
                    <span style="font-weight:bold; display:block;">${sign} ${formatRupiah(t.amount)}</span>
                    <div style="margin-top:5px;">
                        <button class="action-btn edit-btn" onclick="editTransaction(${t.id})"><i class="fa-solid fa-pen"></i></button>
                        <button class="action-btn delete-btn" style="color:#ff7675; margin-left:5px;" onclick="removeTransaction(${t.id})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
            listEl.appendChild(item);
        });

        generateAIInsight(income, expense, filteredData);

        renderCharts(filteredData);
    }

    // --- LOGIKA AI CERDAS (DIPERBAIKI) ---
    function generateAIInsight(inc, exp, transactions) {
        // Pengecekan elemen
        const iconEl = document.getElementById('persona-icon');
        const descEl = document.getElementById('persona-desc');
        if (!iconEl || !descEl) return;
        
        // 1. Hitung total per kategori pengeluaran
        let categoryTotals = {};
        transactions.forEach(t => {
            if(t.type === 'expense') {
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
            }
        });

        // Array saran (Insight List)
        let insights = [];

        // A. Logika Kondisi Kritis
        if (inc === 0 && exp === 0) {
            setAI('😴', 'Data masih kosong nih. Yuk catat transaksi pertamamu!'); return;
        }
        if (exp > inc) {
            setAI('🚨', 'Waspada! Pengeluaranmu lebih besar dari pemasukan (Besar Pasak daripada Tiang). Rem belanjaan!'); return;
        }
        if (inc > 0 && (inc - exp) / inc < 0.1) {
            insights.push({ icon: '💸', text: 'Sisa saldomu tipis banget (di bawah 10%). Mode hemat aktif!' });
        }
        
        // Cek apakah ada pengeluaran sebelum menghitung persentase
        if (exp > 0) {
            // B. Logika Kategori Spesifik (Cerdas)
            
            const totalMakanan = categoryTotals['Makanan'] || 0;
            // MAKANAN (Jika > 40% pengeluaran)
            if (totalMakanan > 0 && (totalMakanan / exp) > 0.4) {
                const foodMsgs = [
                    "Waduh, 40% uangmu habis di perut! Coba masak sendiri yuk, lebih hemat.",
                    "Jajan boleh, tapi ingat tabungan. Kurangi pesan antar makanan ya!",
                    "Boros di makanan nih. Bawa bekal ke kantor/sekolah bisa jadi solusi."
                ];
                insights.push({ icon: '🍔', text: randomPick(foodMsgs) });
            }

            // HIBURAN & BELANJA (Jika > 30% pengeluaran)
            if (((categoryTotals['Hiburan'] || 0) + (categoryTotals['Belanja'] || 0)) > (exp * 0.3)) {
                const shopMsgs = [
                    "Self-reward itu perlu, tapi jangan sampai boncos ya!",
                    "Coba terapkan aturan 'tunggu 24 jam' sebelum checkout barang keinginan.",
                    "Kurangi 'healing' yang menguras dompet. Cari hobi gratisan yuk!"
                ];
                insights.push({ icon: '🛍️', text: randomPick(shopMsgs) });
            }
            
            const totalTransportasi = categoryTotals['Transportasi'] || 0;
            // TRANSPORTASI (Jika > 25% pengeluaran)
            if (totalTransportasi > 0 && (totalTransportasi / exp) > 0.25) {
                 insights.push({ icon: '🚖', text: "Biaya transportasimu lumayan bengkak. Ada opsi nebeng atau kendaraan umum?" });
            }
        } // End if (exp > 0)

        // PENDIDIKAN (Positive Reinforcement - Berapapun jumlahnya)
        if (categoryTotals['Pendidikan'] && categoryTotals['Pendidikan'] > 0) {
            insights.push({ icon: '🎓', text: "Investasi masa depan (Pendidikan) itu penting banget. Semangat belajarnya!" });
        }

        // SEDEKAH (Positive Reinforcement)
        if (categoryTotals['Sedekah'] && categoryTotals['Sedekah'] > 0) {
            insights.push({ icon: '🤲', text: "Harta tidak akan berkurang karena sedekah. Keren!" });
        }

        // KESEHATAN
        if (categoryTotals['Kesehatan'] && categoryTotals['Kesehatan'] > 0) {
            insights.push({ icon: '💊', text: "Kesehatan itu mahal. Semoga lekas pulih / tetap sehat ya!" });
        }

        // C. Logika Hemat (Default jika tidak ada isu besar)
        if (inc > 0 && exp < inc) {
            if ((inc - exp) / inc > 0.5) {
                insights.push({ icon: '👑', text: "Luar biasa! Kamu berhasil menabung lebih dari 50% pendapatanmu." });
            } else if (insights.length === 0) { 
                // Hanya tambahkan jika tidak ada insight lain yang lebih spesifik
                insights.push({ icon: '✅', text: "Keuanganmu cukup stabil. Pertahankan dan jangan lupa menabung." });
            }
        }
        
        // D. PEMILIHAN SARAN
        // Jika ada insight spesifik, tampilkan yang pertama. Jika tidak ada (setelah cek kritis), fallback ke saran default/hemat.
        const selected = insights.length > 0 ? insights[0] : { icon: '🤔', text: 'Terus catat keuanganmu agar insight AI makin akurat!'};
        setAI(selected.icon, selected.text);
    }

    function setAI(icon, text) {
        document.getElementById('persona-icon').innerText = icon;
        document.getElementById('persona-desc').innerText = text;
    }

    function randomPick(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    // --- CHART.JS IMPLEMENTATION ---
    function renderCharts(data) {
        // Cek apakah konteks chart ada sebelum render
        if (!ctxExpense || !ctxTrend) return;
        
        // ... (Logika Chart.js Anda sudah benar) ...
        const expenseData = data.filter(t => t.type === 'expense');
        const expenseCats = {};
        expenseData.forEach(t => {
            expenseCats[t.category] = (expenseCats[t.category] || 0) + t.amount;
        });

        const daysInMonth = {};
        data.forEach(t => {
            const day = parseInt(t.date.split('-')[2]);
            if (!daysInMonth[day]) daysInMonth[day] = 0;
            if (t.type === 'income') daysInMonth[day] += t.amount;
            else daysInMonth[day] -= t.amount;
        });
        
        const labels = Object.keys(daysInMonth).sort((a,b) => a-b);
        const trendData = labels.map(day => daysInMonth[day]);

        if (expenseChartInstance) expenseChartInstance.destroy();
        expenseChartInstance = new Chart(ctxExpense, {
            type: 'doughnut',
            data: {
                labels: Object.keys(expenseCats),
                datasets: [{
                    data: Object.values(expenseCats),
                    backgroundColor: ['#ff7675', '#fab1a0', '#ffeaa7', '#55efc4', '#74b9ff', '#a29bfe', '#dfe6e9', '#00b894', '#636e72'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } } }
        });

        if (trendChartInstance) trendChartInstance.destroy();
        trendChartInstance = new Chart(ctxTrend, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Net Flow',
                    data: trendData,
                    borderColor: '#6c5ce7',
                    backgroundColor: 'rgba(108, 92, 231, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }

    // --- EXPORT TO CSV ---
    exportBtn.addEventListener('click', () => {
        if(transactions.length === 0) { alert('Tidak ada data.'); return; }
        let csvContent = "data:text/csv;charset=utf-8,ID,Tanggal,Deskripsi,Kategori,Tipe,Jumlah\n";
        // Gunakan filter bulanan jika ada, atau semua transaksi
        const dataToExport = getFilteredTransactions(); 
        
        dataToExport.forEach(t => {
            csvContent += `${t.id},${t.date},"${t.text.replace(/"/g, '""')}",${t.category},${t.type},${t.amount}\n`; // Handle double quotes in text
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `laporan_keuangan_${monthFilter.value || 'all'}.csv`); // Ubah nama file
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    resetBtn.addEventListener('click', () => {
        if(confirm('Hapus SEMUA data permanen? Tindakan ini tidak dapat dibatalkan.')) {
            transactions = [];
            updateLocalStorage();
            init();
        }
    });

    function updateLocalStorage() { localStorage.setItem('transactions', JSON.stringify(transactions)); }
    function formatRupiah(num) { 
        // Pastikan input adalah number
        const numValue = typeof num === 'string' ? parseFloat(num) : num;
        if (isNaN(numValue)) return 'Rp 0';
        return 'Rp ' + numValue.toFixed(0).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.'); 
    }

    form.addEventListener('submit', saveTransaction);
    init();
});

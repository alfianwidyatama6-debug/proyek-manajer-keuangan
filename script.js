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
    const ctxExpense = document.getElementById('expenseChart').getContext('2d');
    const ctxTrend = document.getElementById('trendChart').getContext('2d');

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

        updateCategories();
        updateUI();
    }

    // --- HELPER FUNCTIONS ---
    window.updateCategories = function() {
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
        let value = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    });

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
        const rawAmount = amountInput.value.replace(/\./g, '');
        const date = dateInput.value;

        if (text === '' || rawAmount === '' || date === '') {
            alert('Mohon lengkapi semua data');
            return;
        }

        const amount = parseInt(rawAmount);
        const type = typeInput.value;
        const category = categoryInput.value;
        const editId = editIdInput.value;

        if (editId) {
            const index = transactions.findIndex(t => t.id == editId);
            if (index !== -1) {
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

    window.removeTransaction = function(id) {
        if(confirm('Hapus transaksi ini?')) {
            transactions = transactions.filter(t => t.id !== id);
            updateLocalStorage();
            updateUI();
        }
    }

    window.editTransaction = function(id) {
        const t = transactions.find(t => t.id === id);
        if (!t) return;

        textInput.value = t.text;
        amountInput.value = t.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        typeInput.value = t.type;
        dateInput.value = t.date;
        updateCategories();
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
        const sortedData = [...filteredData].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (sortedData.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px;">Tidak ada data di bulan ini.</p>';
        }

        sortedData.forEach(t => {
            const item = document.createElement('li');
            item.classList.add(t.type);
            const sign = t.type === 'income' ? '+' : '-';
            const dateFormatted = new Date(t.date).toLocaleDateString('id-ID', {day:'numeric', month:'short'});
            
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

        // Panggil AI Cerdas Baru
        generateAIInsight(income, expense, filteredData);

        renderCharts(filteredData);
    }

    // --- LOGIKA AI CERDAS (DIPERBARUI) ---
    function generateAIInsight(inc, exp, transactions) {
        const iconEl = document.getElementById('persona-icon');
        const descEl = document.getElementById('persona-desc');
        
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

        // B. Logika Kategori Spesifik (Cerdas)
        
        // MAKANAN (Jika > 40% pengeluaran)
        if (categoryTotals['Makanan'] && (categoryTotals['Makanan'] / exp) > 0.4) {
            const foodMsgs = [
                "Waduh, 40% uangmu habis di perut! Coba masak sendiri yuk, lebih hemat.",
                "Jajan boleh, tapi ingat tabungan. Kurangi pesan antar makanan ya!",
                "Boros di makanan nih. Bawa bekal ke kantor/sekolah bisa jadi solusi."
            ];
            insights.push({ icon: '🍔', text: randomPick(foodMsgs) });
        }

        // HIBURAN & BELANJA (Jika > 30% pengeluaran)
        if ((categoryTotals['Hiburan'] || 0) + (categoryTotals['Belanja'] || 0) > (exp * 0.3)) {
            const shopMsgs = [
                "Self-reward itu perlu, tapi jangan sampai boncos ya!",
                "Coba terapkan aturan 'tunggu 24 jam' sebelum checkout barang keinginan.",
                "Kurangi 'healing' yang menguras dompet. Cari hobi gratisan yuk!"
            ];
            insights.push({ icon: '🛍️', text: randomPick(shopMsgs) });
        }

        // TRANSPORTASI (Jika > 25% pengeluaran)
        if (categoryTotals['Transportasi'] && (categoryTotals['Transportasi'] / exp) > 0.25) {
             insights.push({ icon: '🚖', text: "Biaya transportasimu lumayan bengkak. Ada opsi nebeng atau kendaraan umum?" });
        }

        // PENDIDIKAN (Positive Reinforcement - Berapapun jumlahnya)
        if (categoryTotals['Pendidikan'] && categoryTotals['Pendidikan'] > 0) {
            insights.push({ icon: '🎓', text: "Investasi leher ke atas (Pendidikan) itu gapapa mahal. Semangat belajarnya!" });
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
        if (inc > 0 && (inc - exp) / inc > 0.5) {
            insights.push({ icon: '👑', text: "Luar biasa! Kamu berhasil menabung lebih dari 50% pendapatanmu." });
        } else {
            insights.push({ icon: '✅', text: "Keuanganmu cukup stabil. Pertahankan dan jangan lupa menabung." });
        }

        // D. PEMILIHAN SARAN (Prioritas: Kategori > Umum)
        // Kita ambil saran dari array insights. Jika ada saran kategori (makanan/pendidikan dll), itu akan muncul duluan karena urutan push di atas.
        // Namun agar variatif, jika ada banyak insight, kita ambil yang paling relevan (index 0 atau 1).
        
        const selected = insights[0]; // Ambil prioritas teratas yang ditemukan
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
        transactions.forEach(t => {
            csvContent += `${t.id},${t.date},"${t.text}",${t.category},${t.type},${t.amount}\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "laporan_keuangan.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    resetBtn.addEventListener('click', () => {
        if(confirm('Hapus SEMUA data permanen?')) {
            transactions = [];
            updateLocalStorage();
            init();
        }
    });

    function updateLocalStorage() { localStorage.setItem('transactions', JSON.stringify(transactions)); }
    function formatRupiah(num) { return 'Rp ' + num.toFixed(0).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.'); }

    form.addEventListener('submit', saveTransaction);
    init();
});

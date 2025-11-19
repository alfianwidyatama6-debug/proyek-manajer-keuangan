document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const balanceEl = document.getElementById('balance');
    const incomeEl = document.getElementById('total-income');
    const expenseEl = document.getElementById('total-expense');
    const listEl = document.getElementById('transaction-list');
    const form = document.getElementById('transaction-form');
    
    // Inputs
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

    // Chart Contexts (Safe check)
    const expenseChartEl = document.getElementById('expenseChart');
    const trendChartEl = document.getElementById('trendChart');
    const ctxExpense = expenseChartEl ? expenseChartEl.getContext('2d') : null;
    const ctxTrend = trendChartEl ? trendChartEl.getContext('2d') : null;

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
        // Set tanggal hari ini (Format YYYY-MM-DD yang aman untuk input date)
        const now = new Date();
        const localDate = now.toLocaleDateString('en-CA'); // Format: YYYY-MM-DD
        dateInput.value = localDate;
        
        // Set filter bulan saat ini
        const currentMonthStr = localDate.slice(0, 7); // Ambil YYYY-MM
        monthFilter.value = currentMonthStr;

        updateCategories();
        updateUI();
    }

    // --- HELPER FUNCTIONS ---
    
    // [FIX] Fungsi update kategori dipisah agar bisa dipanggil event listener
    function updateCategories() {
        const type = typeInput.value;
        // Simpan kategori yang sedang dipilih saat ini (jika ada/sedang edit)
        const currentVal = categoryInput.value; 
        
        categoryInput.innerHTML = '';
        categories[type].forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.innerText = cat;
            categoryInput.appendChild(option);
        });

        // Jika kategori sebelumnya ada di daftar baru, pilih kembali (UX improvement)
        if (currentVal && categories[type].includes(currentVal)) {
            categoryInput.value = currentVal;
        }
    }

    // [FIX] Event Listener untuk Type Select (Penting!)
    typeInput.addEventListener('change', updateCategories);

    // Input Formatter (Hanya angka dan titik)
    amountInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/[^0-9]/g, '');
        // Mencegah 0 di depan kecuali angka itu sendiri 0 (opsional, tapi lebih rapi)
        if (value.length > 1 && value.startsWith('0')) value = value.substring(1);
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
        const rawAmount = amountInput.value.replace(/\./g, ''); // Hapus titik separator
        const date = dateInput.value;

        if (text === '' || rawAmount === '' || date === '') {
            alert('Mohon lengkapi semua data');
            return;
        }

        const amount = parseInt(rawAmount, 10);
        
        // Validasi jumlah tidak boleh 0
        if (amount <= 0) {
            alert('Jumlah uang harus lebih besar dari 0');
            return;
        }

        const type = typeInput.value;
        const category = categoryInput.value;
        const editId = editIdInput.value;

        if (editId) {
            // Mode Edit
            const index = transactions.findIndex(t => t.id == editId);
            if (index !== -1) {
                transactions[index] = { id: parseInt(editId), text, amount, type, category, date };
            }
            exitEditMode();
        } else {
            // Mode Tambah Baru
            const transaction = {
                id: Date.now(),
                text, amount, type, category, date
            };
            transactions.push(transaction);
        }

        updateLocalStorage();
        updateUI();
        
        // Reset form sederhana
        textInput.value = '';
        amountInput.value = '';
        textInput.focus();
    }

    // Global function attached to window for HTML onclick events
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

        // Isi form dengan data lama
        textInput.value = t.text;
        amountInput.value = t.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        typeInput.value = t.type;
        dateInput.value = t.date;
        
        // Update opsi kategori sesuai tipe dulu
        updateCategories();
        // Baru set nilainya
        categoryInput.value = t.category;
        editIdInput.value = t.id;

        // Ubah tampilan tombol
        submitBtn.innerText = 'Update Transaksi';
        submitBtn.style.background = '#e67e22'; // Warna Orange untuk edit
        cancelBtn.style.display = 'inline-block';
        
        // Scroll ke form di HP
        if(window.innerWidth < 768) {
            form.scrollIntoView({behavior: 'smooth'});
        }
    }

    function exitEditMode() {
        editIdInput.value = '';
        submitBtn.innerText = 'Tambah Transaksi';
        submitBtn.style.background = '';
        cancelBtn.style.display = 'none';
        
        // Bersihkan input
        textInput.value = '';
        amountInput.value = '';
        
        // Kembalikan tanggal ke hari ini
        const now = new Date();
        dateInput.value = now.toLocaleDateString('en-CA');
        
        // Kembalikan ke kategori default (expense)
        typeInput.value = 'expense';
        updateCategories();
    }

    cancelBtn.addEventListener('click', exitEditMode);
    monthFilter.addEventListener('change', updateUI);

    // --- UI UPDATE MANAGER ---
    function updateUI() {
        const filteredData = getFilteredTransactions();
        
        const amounts = filteredData.map(t => t.type === 'income' ? t.amount : -t.amount);
        const total = amounts.reduce((acc, item) => (acc += item), 0);
        const income = filteredData.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expense = filteredData.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

        balanceEl.innerText = formatRupiah(total);
        incomeEl.innerText = formatRupiah(income);
        expenseEl.innerText = formatRupiah(expense);

        listEl.innerHTML = '';
        // Sort data berdasarkan tanggal (terbaru di atas)
        const sortedData = [...filteredData].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (sortedData.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px;">Tidak ada data di bulan ini.</p>';
        }

        sortedData.forEach(t => {
            const item = document.createElement('li');
            item.classList.add(t.type); // class 'income' atau 'expense' untuk CSS styling
            const sign = t.type === 'income' ? '+' : '-';
            
            // Format tanggal lebih cantik
            const dateObj = new Date(t.date);
            const dateFormatted = dateObj.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'});
            
            item.innerHTML = `
                <div class="tx-info">
                    <h4>${t.text}</h4>
                    <small><i class="fa-regular fa-calendar"></i> ${dateFormatted} &bull; ${t.category}</small>
                </div>
                <div class="tx-amount">
                    <span style="font-weight:bold; display:block;">${sign} ${formatRupiah(t.amount)}</span>
                    <div class="action-group">
                        <button class="action-btn edit-btn" onclick="editTransaction(${t.id})"><i class="fa-solid fa-pen"></i></button>
                        <button class="action-btn delete-btn" onclick="removeTransaction(${t.id})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
            listEl.appendChild(item);
        });

        generateAIInsight(income, expense, filteredData);
        renderCharts(filteredData);
    }

    // --- LOGIKA AI CERDAS ---
    function generateAIInsight(inc, exp, transactions) {
        // 1. Hitung total per kategori pengeluaran
        let categoryTotals = {};
        transactions.forEach(t => {
            if(t.type === 'expense') {
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
            }
        });

        let insights = [];

        // A. Logika Kondisi Kritis
        if (inc === 0 && exp === 0) {
            setAI('😴', 'Data masih kosong nih. Yuk catat transaksi pertamamu!'); return;
        }
        if (exp > inc && inc > 0) {
            setAI('🚨', 'Waspada! Besar Pasak daripada Tiang. Stop belanja yang tidak perlu!'); return;
        }
        
        // B. Logika Kategori (Deteksi Pemborosan)
        const ratio = exp > 0 ? exp : 1; // prevent division by zero

        if (categoryTotals['Makanan'] && (categoryTotals['Makanan'] / ratio) > 0.4) {
            insights.push({ icon: '🍔', text: "40% uangmu habis buat makan. Coba masak sendiri biar lebih hemat!" });
        }
        if ((categoryTotals['Hiburan'] || 0) + (categoryTotals['Belanja'] || 0) > (ratio * 0.3)) {
            insights.push({ icon: '🛍️', text: "Budget 'Happy-Happy' sudah over 30%. Tahan diri dulu ya." });
        }
        if (categoryTotals['Transportasi'] && (categoryTotals['Transportasi'] / ratio) > 0.25) {
             insights.push({ icon: '🚖', text: "Biaya transportasimu tinggi. Ada rute alternatif yang lebih murah?" });
        }

        // C. Positive Reinforcement
        if (categoryTotals['Investasi'] && categoryTotals['Investasi'] > 0) {
             insights.push({ icon: '📈', text: "Keren! Kamu menyisihkan uang untuk investasi masa depan." });
        }
        if (categoryTotals['Sedekah'] && categoryTotals['Sedekah'] > 0) {
             insights.push({ icon: '🤲', text: "Semoga rezekimu makin lancar karena rajin bersedekah." });
        }

        // D. General Status
        if (inc > 0 && (inc - exp) / inc > 0.5) {
            insights.push({ icon: '👑', text: "Sultan Mode: Kamu berhasil menabung >50% pendapatanmu!" });
        } else if (inc > exp) {
            insights.push({ icon: '✅', text: "Keuanganmu sehat. Pertahankan cashflow positif ini." });
        }

        // Pilih saran secara acak jika ada banyak, atau ambil yang pertama
        const selected = insights.length > 0 ? insights[Math.floor(Math.random() * insights.length)] : { icon: '🤔', text: 'Terus catat pengeluaranmu agar aku bisa memberi saran.' };
        
        setAI(selected.icon, selected.text);
    }

    function setAI(icon, text) {
        const iconEl = document.getElementById('persona-icon');
        const descEl = document.getElementById('persona-desc');
        if(iconEl) iconEl.innerText = icon;
        if(descEl) descEl.innerText = text;
    }

    // --- CHART.JS IMPLEMENTATION ---
    function renderCharts(data) {
        // Cek apakah canvas tersedia
        if (!ctxExpense || !ctxTrend) return;

        const expenseData = data.filter(t => t.type === 'expense');
        const expenseCats = {};
        expenseData.forEach(t => {
            expenseCats[t.category] = (expenseCats[t.category] || 0) + t.amount;
        });

        // Chart Trend Harian
        const daysInMonth = {};
        data.forEach(t => {
            // Ambil tanggal (1-31)
            const day = parseInt(t.date.split('-')[2]);
            if (!daysInMonth[day]) daysInMonth[day] = 0;
            
            // Net Flow harian (Masuk - Keluar)
            if (t.type === 'income') daysInMonth[day] += t.amount;
            else daysInMonth[day] -= t.amount;
        });
        
        const labels = Object.keys(daysInMonth).sort((a,b) => a-b);
        const trendData = labels.map(day => daysInMonth[day]);

        // Destroy old charts if exist
        if (expenseChartInstance) expenseChartInstance.destroy();
        expenseChartInstance = new Chart(ctxExpense, {
            type: 'doughnut',
            data: {
                labels: Object.keys(expenseCats),
                datasets: [{
                    data: Object.values(expenseCats),
                    backgroundColor: ['#ff7675', '#fab1a0', '#ffeaa7', '#55efc4', '#74b9ff', '#a29bfe', '#dfe6e9', '#00b894', '#636e72'],
                    borderWidth: 1
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: {size: 11} } } 
                } 
            }
        });

        if (trendChartInstance) trendChartInstance.destroy();
        trendChartInstance = new Chart(ctxTrend, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Net Flow Harian',
                    data: trendData,
                    borderColor: '#6c5ce7',
                    backgroundColor: 'rgba(108, 92, 231, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                scales: { y: { beginAtZero: false } } 
            }
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
        link.setAttribute("download", `Laporan_Keuangan_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    resetBtn.addEventListener('click', () => {
        if(confirm('Hapus SEMUA data secara permanen? Tindakan ini tidak bisa dibatalkan.')) {
            transactions = [];
            updateLocalStorage();
            init();
        }
    });

    function updateLocalStorage() { localStorage.setItem('transactions', JSON.stringify(transactions)); }
    function formatRupiah(num) { 
        return 'Rp ' + num.toFixed(0).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.'); 
    }

    form.addEventListener('submit', saveTransaction);
    
    // Jalankan aplikasi
    init();
});

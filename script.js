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

    const categories = {
        expense: ['Makanan', 'Transportasi', 'Tagihan', 'Hiburan', 'Belanja', 'Kesehatan', 'Pendidikan', 'Lainnya'],
        income: ['Gaji', 'Bonus', 'Freelance', 'Investasi', 'Hadiah', 'Lainnya']
    };

    // --- INITIALIZATION ---
    function init() {
        // Set tanggal hari ini di input form
        dateInput.valueAsDate = new Date();
        
        // Set filter bulan ke bulan ini
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
    // Fungsi ini mengambil transaksi hanya untuk bulan yang dipilih di filter
    function getFilteredTransactions() {
        const selectedMonth = monthFilter.value; // format "YYYY-MM"
        if (!selectedMonth) return transactions;

        return transactions.filter(t => {
            return t.date.startsWith(selectedMonth);
        });
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
        
        // Reset Form simple
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
        
        // Scroll ke form jika di hp
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
    monthFilter.addEventListener('change', updateUI); // Update saat filter ganti

    // --- UI UPDATE MANAGER ---
    function updateUI() {
        const filteredData = getFilteredTransactions();
        
        // 1. Hitung Total
        const amounts = filteredData.map(t => t.type === 'income' ? t.amount : -t.amount);
        const total = amounts.reduce((acc, item) => (acc += item), 0);
        const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0);
        const expense = amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) * -1;

        balanceEl.innerText = formatRupiah(total);
        incomeEl.innerText = formatRupiah(income);
        expenseEl.innerText = formatRupiah(expense);

        // 2. Render List
        listEl.innerHTML = '';
        // Sort berdasarkan tanggal terbaru
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

        // 3. Update AI Persona
        updatePersona(income, expense);

        // 4. Render Charts
        renderCharts(filteredData);
    }

    function updatePersona(inc, exp) {
        const icon = document.getElementById('persona-icon');
        const desc = document.getElementById('persona-desc');
        
        if (inc === 0 && exp === 0) {
            icon.innerText = '😴'; desc.innerText = 'Data kosong. Yuk mulai catat!';
        } else if (exp > inc) {
            icon.innerText = '🚨'; desc.innerText = 'Waspada! Pengeluaran lebih besar dari pemasukan.';
        } else if ((inc - exp) / inc > 0.5) {
            icon.innerText = '👑'; desc.innerText = 'Sultan! Kamu hemat lebih dari 50% pendapatan.';
        } else {
            icon.innerText = '✅'; desc.innerText = 'Keuangan stabil. Pertahankan!';
        }
    }

    // --- CHART.JS IMPLEMENTATION ---
    function renderCharts(data) {
        // A. DATA PREPARATION FOR EXPENSE PIE CHART
        const expenseData = data.filter(t => t.type === 'expense');
        const expenseCats = {};
        expenseData.forEach(t => {
            expenseCats[t.category] = (expenseCats[t.category] || 0) + t.amount;
        });

        // B. DATA PREPARATION FOR TREND LINE CHART (Harian)
        // Group by Date (1-31)
        const daysInMonth = {};
        data.forEach(t => {
            const day = parseInt(t.date.split('-')[2]); // Ambil tanggalnya saja
            if (!daysInMonth[day]) daysInMonth[day] = 0;
            if (t.type === 'income') daysInMonth[day] += t.amount;
            else daysInMonth[day] -= t.amount;
        });
        
        const labels = Object.keys(daysInMonth).sort((a,b) => a-b);
        const trendData = labels.map(day => daysInMonth[day]);

        // C. RENDER EXPENSE CHART (Doughnut)
        if (expenseChartInstance) expenseChartInstance.destroy(); // Hapus chart lama agar tidak numpuk
        
        expenseChartInstance = new Chart(ctxExpense, {
            type: 'doughnut',
            data: {
                labels: Object.keys(expenseCats),
                datasets: [{
                    data: Object.values(expenseCats),
                    backgroundColor: ['#ff7675', '#fab1a0', '#ffeaa7', '#55efc4', '#74b9ff', '#a29bfe', '#dfe6e9'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } }
            }
        });

        // D. RENDER TREND CHART (Line)
        if (trendChartInstance) trendChartInstance.destroy();

        trendChartInstance = new Chart(ctxTrend, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Arus Kas (Net)',
                    data: trendData,
                    borderColor: '#6c5ce7',
                    backgroundColor: 'rgba(108, 92, 231, 0.1)',
                    fill: true,
                    tension: 0.4 // Membuat garis melengkung halus
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // --- EXPORT TO CSV ---
    exportBtn.addEventListener('click', () => {
        if(transactions.length === 0) { alert('Tidak ada data untuk diunduh.'); return; }
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "ID,Tanggal,Deskripsi,Kategori,Tipe,Jumlah\n"; // Header

        transactions.forEach(t => {
            const row = `${t.id},${t.date},"${t.text}",${t.category},${t.type},${t.amount}`;
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "laporan_keuangan.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // --- RESET ---
    resetBtn.addEventListener('click', () => {
        if(confirm('PERINGATAN: Semua data akan dihapus permanen!')) {
            transactions = [];
            updateLocalStorage();
            updateUI();
        }
    });

    // --- UTILS ---
    function updateLocalStorage() { localStorage.setItem('transactions', JSON.stringify(transactions)); }
    function formatRupiah(num) { return 'Rp ' + num.toFixed(0).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.'); }

    form.addEventListener('submit', saveTransaction);
    init();
});

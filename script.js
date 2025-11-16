document.addEventListener('DOMContentLoaded', () => {
    // Selektor DOM
    const balanceEl = document.getElementById('balance');
    const incomeEl = document.getElementById('total-income');
    const expenseEl = document.getElementById('total-expense');
    const listEl = document.getElementById('transaction-list');
    const form = document.getElementById('transaction-form');
    const textInput = document.getElementById('text');
    const amountInput = document.getElementById('amount');
    const categoryInput = document.getElementById('category');
    const dailyBudgetEl = document.getElementById('daily-budget');

    // Mengambil data dari Local Storage atau set default array kosong
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

    // --- FUNGSI UTAMA ---

    // Fungsi untuk menambah transaksi
    function addTransaction(e) {
        e.preventDefault();

        const type = document.querySelector('input[name="type"]:checked').value;

        // Validasi sederhana
        if (textInput.value.trim() === '' || amountInput.value.trim() === '') {
            alert('Mohon isi deskripsi dan jumlah transaksi.');
            return;
        }

        // Buat objek transaksi baru
        const transaction = {
            id: generateID(),
            text: textInput.value,
            amount: +amountInput.value,
            type: type,
            category: categoryInput.value
        };

        // Tambahkan ke array
        transactions.push(transaction);

        // Tambahkan ke DOM
        addTransactionToDOM(transaction);

        // Perbarui semua nilai ringkasan
        updateValues();

        // Perbarui Local Storage
        updateLocalStorage();

        // Kosongkan form
        textInput.value = '';
        amountInput.value = '';
    }

    // Fungsi untuk menampilkan transaksi di DOM
    function addTransactionToDOM(transaction) {
        const item = document.createElement('li');
        item.classList.add(transaction.type); // 'income' or 'expense'
        
        const sign = transaction.type === 'income' ? '+' : '-';
        
        item.innerHTML = `
            <div class="transaction-details">
                <span class="transaction-text">${transaction.text}</span>
                <span class="transaction-category">${transaction.category}</span>
            </div>
            <span class="transaction-amount">${sign}${formatCurrency(transaction.amount)}</span>
            <button class="delete-btn" onclick="removeTransaction(${transaction.id})">X</button>
        `;
        
        listEl.appendChild(item);
    }

    // Fungsi untuk menghapus transaksi
    window.removeTransaction = function(id) {
        // Filter transaksi, buang yang id-nya cocok
        transactions = transactions.filter(t => t.id !== id);
        
        // Perbarui local storage
        updateLocalStorage();
        
        // Inisialisasi ulang aplikasi
        init();
    }

    // Fungsi untuk memperbarui nilai ringkasan (Saldo, Pemasukan, Pengeluaran)
    function updateValues() {
        const amounts = transactions.map(t => t.type === 'income' ? t.amount : -t.amount);
        
        const total = amounts.reduce((acc, item) => (acc += item), 0);
        
        const income = amounts
            .filter(item => item > 0)
            .reduce((acc, item) => (acc += item), 0);
            
        const expense = amounts
            .filter(item => item < 0)
            .reduce((acc, item) => (acc += item), 0) * -1; // Ubah jadi positif
            
        balanceEl.innerText = formatCurrency(total);
        incomeEl.innerText = formatCurrency(income);
        expenseEl.innerText = formatCurrency(expense);

        // Panggil update fitur unik
        updateDailyBudget(income, expense);
    }

    // --- FITUR UNIK: SARAN BUDGET HARIAN ---
    function updateDailyBudget(totalIncome, totalExpense) {
        // Hanya hitung jika ada pemasukan
        if (totalIncome === 0) {
            dailyBudgetEl.innerText = 'Rp 0';
            return;
        }

        // Dapatkan data tanggal saat ini
        const today = new Date();
        const currentDay = today.getDate();
        
        // Dapatkan total hari dalam bulan ini
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        
        const remainingDays = daysInMonth - currentDay + 1; // Termasuk hari ini
        
        // Hitung sisa budget
        // Asumsi: Pemasukan adalah bulanan.
        const remainingBudget = totalIncome - totalExpense;

        if (remainingBudget <= 0) {
            dailyBudgetEl.innerText = "Over Budget!";
            dailyBudgetEl.style.color = "var(--expense-color)";
            return;
        }
        
        if (remainingDays <= 0) {
            dailyBudgetEl.innerText = formatCurrency(remainingBudget); // Sisa budget di akhir bulan
            return;
        }

        // Hitung budget harian
        const dailyAllowance = remainingBudget / remainingDays;
        
        dailyBudgetEl.style.color = "white";
        dailyBudgetEl.innerText = formatCurrency(dailyAllowance);
    }

    // Fungsi untuk menyimpan ke Local Storage
    function updateLocalStorage() {
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }

    // Fungsi Inisialisasi Aplikasi
    function init() {
        listEl.innerHTML = ''; // Kosongkan list
        transactions.forEach(addTransactionToDOM); // Isi list dari data
        updateValues(); // Update ringkasan
    }

    // --- HELPER FUNCTIONS ---

    // Fungsi untuk menghasilkan ID unik (sederhana)
    function generateID() {
        return Math.floor(Math.random() * 1000000);
    }

    // Fungsi untuk format mata uang Rupiah
    function formatCurrency(num) {
        return 'Rp ' + num.toFixed(0).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    }

    // --- EVENT LISTENERS ---
    form.addEventListener('submit', addTransaction);

    // --- Mulai Aplikasi ---
    init();
});

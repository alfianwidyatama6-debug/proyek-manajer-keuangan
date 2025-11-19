document.addEventListener('DOMContentLoaded', () => {
    // --- DOM SELECTORS ---
    const balanceEl = document.getElementById('balance');
    const incomeEl = document.getElementById('total-income');
    const expenseEl = document.getElementById('total-expense');
    const listEl = document.getElementById('transaction-list');
    const form = document.getElementById('transaction-form');
    const textInput = document.getElementById('text');
    const amountInput = document.getElementById('amount');
    const categoryInput = document.getElementById('category');
    const dailyBudgetEl = document.getElementById('daily-budget');
    
    // Elemen Laporan
    const personaTitle = document.getElementById('persona-title');
    const personaDesc = document.getElementById('persona-desc');
    const personaIcon = document.getElementById('persona-icon');
    const categoryListEl = document.getElementById('category-list');

    // --- DATA STATE ---
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

    // --- CORE FUNCTIONS ---

    function addTransaction(e) {
        e.preventDefault();
        const type = document.querySelector('input[name="type"]:checked').value;

        if (textInput.value.trim() === '' || amountInput.value.trim() === '') {
            alert('Mohon isi deskripsi dan jumlah transaksi.');
            return;
        }

        const transaction = {
            id: generateID(),
            text: textInput.value,
            amount: +amountInput.value,
            type: type,
            category: categoryInput.value
        };

        transactions.push(transaction);
        addTransactionToDOM(transaction);
        updateValues();
        updateLocalStorage();

        textInput.value = '';
        amountInput.value = '';
    }

    function addTransactionToDOM(transaction) {
        const item = document.createElement('li');
        item.classList.add(transaction.type);
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

    window.removeTransaction = function(id) {
        transactions = transactions.filter(t => t.id !== id);
        updateLocalStorage();
        init();
    }

    function updateValues() {
        const amounts = transactions.map(t => t.type === 'income' ? t.amount : -t.amount);
        
        const total = amounts.reduce((acc, item) => (acc += item), 0);
        const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0);
        const expense = amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) * -1;

        balanceEl.innerText = formatCurrency(total);
        incomeEl.innerText = formatCurrency(income);
        expenseEl.innerText = formatCurrency(expense);

        // Update Fitur Tambahan
        updateDailyBudget(income, expense);
        updateMonthlyReport(income, expense);
    }

    // --- FITUR 1: DAILY BUDGET ---
    function updateDailyBudget(totalIncome, totalExpense) {
        if (totalIncome === 0) {
            dailyBudgetEl.innerText = 'Rp 0';
            return;
        }
        const today = new Date();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const remainingDays = daysInMonth - today.getDate() + 1;
        const remainingBudget = totalIncome - totalExpense;

        if (remainingBudget <= 0) {
            dailyBudgetEl.innerText = "Over Budget!";
        } else {
            const dailyAllowance = remainingBudget / remainingDays;
            dailyBudgetEl.innerText = formatCurrency(dailyAllowance);
        }
    }

    // --- FITUR 2: LAPORAN BULANAN (PERSONA & KATEGORI) ---
    function updateMonthlyReport(totalIncome, totalExpense) {
        // A. Logika Persona
        let persona = { icon: '🤔', title: 'Si Pengamat', desc: 'Belum ada cukup data.' };

        if (totalIncome === 0 && totalExpense === 0) {
            // Default
        } else if (totalExpense > totalIncome) {
            persona = { icon: '🚨', title: 'Si Besar Pasak', desc: 'Pengeluaranmu lebih besar dari pemasukan. Rem belanjaan!' };
        } else {
            const savingsRatio = (totalIncome - totalExpense) / totalIncome;
            if (savingsRatio > 0.5) {
                persona = { icon: '👑', title: 'Sultan Hemat', desc: 'Wow! Kamu menabung >50% penghasilanmu.' };
            } else if (savingsRatio > 0.2) {
                persona = { icon: '🌱', title: 'Si Bijak', desc: 'Keuangan sehat. Tabunganmu aman.' };
            } else {
                persona = { icon: '💸', title: 'Si "YOLO"', desc: 'Hati-hati, sisa saldomu sangat tipis.' };
            }
        }

        // Analisis Kategori untuk override Persona
        const categories = {};
        transactions.forEach(t => {
            if (t.type === 'expense') {
                categories[t.category] = (categories[t.category] || 0) + t.amount;
            }
        });

        let maxCategory = null;
        let maxVal = 0;
        for (const [cat, val] of Object.entries(categories)) {
            if (val > maxVal) { maxVal = val; maxCategory = cat; }
        }

        if (totalExpense > 0 && maxCategory === 'makanan' && (maxVal / totalExpense) > 0.4) {
            persona = { icon: '🍔', title: 'Raja Kuliner', desc: 'Uangmu habis di perut. Ingat diet dompet!' };
        }

        // Render Persona
        personaIcon.innerText = persona.icon;
        personaTitle.innerText = persona.title;
        personaDesc.innerText = persona.desc;

        // B. Render Bar Kategori
        categoryListEl.innerHTML = '';
        if (Object.keys(categories).length === 0) {
             categoryListEl.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px;">Belum ada pengeluaran.</p>';
        } else {
            const sortedCats = Object.entries(categories).sort((a, b) => b[1] - a[1]);

            sortedCats.forEach(([cat, val]) => {
                const percentage = ((val / totalExpense) * 100).toFixed(1);
                const catItem = document.createElement('div');
                catItem.classList.add('cat-item');
                catItem.innerHTML = `
                    <div class="cat-header">
                        <span style="text-transform:capitalize">${cat}</span>
                        <span>${percentage}% (${formatCurrency(val)})</span>
                    </div>
                    <div class="progress-bg">
                        <div class="progress-fill ${cat}" style="width: ${percentage}%"></div>
                    </div>
                `;
                categoryListEl.appendChild(catItem);
            });
        }
    }

    // --- UTILS ---
    function updateLocalStorage() {
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }

    function init() {
        listEl.innerHTML = '';
        transactions.forEach(addTransactionToDOM);
        updateValues();
    }

    function generateID() {
        return Math.floor(Math.random() * 1000000);
    }

    function formatCurrency(num) {
        return 'Rp ' + num.toFixed(0).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    }

    // --- EVENTS ---
    form.addEventListener('submit', addTransaction);
    init();
});

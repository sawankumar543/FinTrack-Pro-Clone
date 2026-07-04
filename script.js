document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. STATE MANAGEMENT (LocalStorage) ---
    // Fetch the logged-in user saved from login.html
    let userProfile = JSON.parse(localStorage.getItem('user')) || { username: 'Guest', currency: '$' };
    
    // Create a unique storage key for THIS specific user
    let storageKey = `transactions_${userProfile.username}`;
    let transactions = JSON.parse(localStorage.getItem(storageKey)) || [];
    let myChart = null;

    // --- 2. DOM ELEMENTS ---
    const tableBody = document.getElementById('transactionTableBody');
    const balanceEl = document.getElementById('displayBalance');
    const incomeEl = document.getElementById('displayIncome');
    const expenseEl = document.getElementById('displayExpense');
    const countEl = document.getElementById('displayCount');
    const typeFilter = document.getElementById('typeFilter');
    const currentMonthTotalEl = document.getElementById('currentMonthTotal');
    const topCategoryText = document.getElementById('topCategoryText');
    
    // Settings Elements
    const topbarName = document.getElementById('topbarName');
    const settingsForm = document.getElementById('settingsForm');
    const settingNameInput = document.getElementById('settingName');
    const settingCurrencyInput = document.getElementById('settingCurrency');
    const exportDataBtn = document.getElementById('exportDataBtn');
    const importDataBtn = document.getElementById('importDataBtn');
    const importFileInput = document.getElementById('importFileInput');

    // Modal Elements
    const modal = document.getElementById('transactionModal');
    const addBtn = document.getElementById('openAddModalBtn');
    const closeBtn = document.querySelector('.close-modal');
    const form = document.getElementById('transactionForm');
    const modalTitle = document.getElementById('modalTitle');
    const searchInput = document.getElementById('searchInput');

    // Logout Button
    const logoutBtn = document.getElementById('logoutBtn');
    const themeStatusLabel = document.getElementById('themeStatusLabel');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('user'); // Clear the session
            window.location.replace('login.html'); // Redirect to login
        });
    }

    function updateThemeStatus() {
        const darkActive = document.body.classList.contains('dark-theme');
        if (themeStatusLabel) {
            themeStatusLabel.style.display = darkActive ? 'inline-block' : 'none';
        }
        if (logoutBtn) {
            if (darkActive) {
                logoutBtn.classList.add('dark-mode-logout');
            } else {
                logoutBtn.classList.remove('dark-mode-logout');
            }
        }
    }

    // --- 3. INITIALIZATION ---
    function initProfile() {
        // Apply profile to UI using username from the auth object
        topbarName.innerText = userProfile.username;
        settingNameInput.value = userProfile.username;
        settingCurrencyInput.value = userProfile.currency || '$';
    }
    initProfile();

    const generateID = () => Math.floor(Math.random() * 1000000000);

    // --- 4. CRUD OPERATIONS ---
    function updateUI(dataToRender = transactions) {
        tableBody.innerHTML = ''; 
        
        let totalIncome = 0;
        let totalExpense = 0;
        const cur = userProfile.currency || '$';

        dataToRender.forEach(tx => {
            if (tx.type === 'income') {
                totalIncome += tx.amount;
            } else {
                totalExpense += tx.amount;
            }

            const sign = tx.type === 'income' ? '+' : '-';
            const colorClass = tx.type === 'income' ? 'text-green' : 'text-red';
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td>${tx.date}</td>
                <td><strong>${tx.description}</strong></td>
                <td><span class="tag">${tx.category}</span></td>
                <td class="${colorClass}">${sign}${cur}${tx.amount.toFixed(2)}</td>
                <td>
                    <button class="action-btn btn-edit" onclick="editTransaction(${tx.id})"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn btn-delete" onclick="deleteTransaction(${tx.id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Update Summary Cards with correct currency
        const balance = totalIncome - totalExpense;
        balanceEl.innerText = `${balance < 0 ? '-' : ''}${cur}${Math.abs(balance).toFixed(2)}`;
        incomeEl.innerText = `${cur}${totalIncome.toFixed(2)}`;
        expenseEl.innerText = `${cur}${totalExpense.toFixed(2)}`;
        countEl.innerText = dataToRender.length;

        // Save to the USER-SPECIFIC key
        localStorage.setItem(storageKey, JSON.stringify(transactions));
        updateChart(totalIncome, totalExpense);

        const monthSnapshot = getCurrentMonthSnapshot(transactions);
        currentMonthTotalEl.innerText = `${cur}${monthSnapshot.monthTotal.toFixed(2)}`;
        topCategoryText.innerText = monthSnapshot.topCategory;
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const id = document.getElementById('txId').value;
        const type = document.getElementById('txType').value;
        const description = document.getElementById('txDescription').value;
        const amount = parseFloat(document.getElementById('txAmount').value);
        const date = document.getElementById('txDate').value;
        const category = document.getElementById('txCategory').value;

        const newTx = {
            id: id ? parseInt(id) : generateID(),
            type, description, amount, date, category
        };

        if (id) {
            transactions = transactions.map(tx => tx.id === newTx.id ? newTx : tx);
        } else {
            transactions.push(newTx);
        }
        
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        closeModal();
        updateUI();
    });

    window.deleteTransaction = (id) => {
        if(confirm('Are you sure you want to delete this transaction?')) {
            transactions = transactions.filter(tx => tx.id !== id);
            updateUI();
        }
    };

    window.editTransaction = (id) => {
        const tx = transactions.find(t => t.id === id);
        if(!tx) return;

        document.getElementById('txId').value = tx.id;
        document.getElementById('txType').value = tx.type;
        document.getElementById('txDescription').value = tx.description;
        document.getElementById('txAmount').value = tx.amount;
        document.getElementById('txDate').value = tx.date;
        document.getElementById('txCategory').value = tx.category;

        modalTitle.innerText = "Edit Transaction";
        modal.classList.add('active');
    };

    // --- 5. SETTINGS FORM LOGIC ---
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newName = settingNameInput.value;
        const newCurrency = settingCurrencyInput.value;
        
        // If the user changes their name, we need to migrate their data to the new key
        if (newName !== userProfile.username) {
            const newStorageKey = `transactions_${newName}`;
            localStorage.setItem(newStorageKey, JSON.stringify(transactions));
            localStorage.removeItem(storageKey); // Clean up old data
            storageKey = newStorageKey; // Update active key
        }

        userProfile = {
            username: newName,
            currency: newCurrency
        };
        
        // Save back to the 'user' key so authentication state retains the updated info
        localStorage.setItem('user', JSON.stringify(userProfile)); 
        
        initProfile(); // Update header
        updateUI();    // Redraw table and cards
        alert('Settings saved successfully!');
    });

    // --- 6. UI INTERACTIVITY ---
    const openModal = () => {
        form.reset();
        document.getElementById('txId').value = ''; 
        document.getElementById('txDate').valueAsDate = new Date();
        modalTitle.innerText = "Add Transaction";
        modal.classList.add('active');
    };
    const closeModal = () => modal.classList.remove('active');

    addBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });

    document.getElementById('resetDataBtn').addEventListener('click', () => {
        if(confirm('WARNING: This will delete all your transaction data permanently!')) {
            transactions = [];
            updateUI();
        }
    });

    // --- 7. CHART.JS ---
    function updateChart(income, expense) {
        const cashCtx = document.getElementById('cashFlowChart').getContext('2d');
        if (myChart) { myChart.destroy(); }
        myChart = new Chart(cashCtx, {
            type: 'bar',
            data: {
                labels: ['Income vs Expenses'],
                datasets: [
                    { label: 'Income', data: [income], backgroundColor: '#16a34a', borderRadius: 4 },
                    { label: 'Expenses', data: [expense], backgroundColor: '#991b1b', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } },
                plugins: { legend: { position: 'top' } }
            }
        });
    }

    function getCurrentMonthSnapshot(data) {
        const now = new Date();
        const monthly = data.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
        });

        const monthTotal = monthly.reduce((sum, tx) => sum + tx.amount, 0);
        const topCategory = monthly.reduce((acc, tx) => {
            acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
            return acc;
        }, {});

        const sortedCategories = Object.entries(topCategory).sort((a, b) => b[1] - a[1]);
        return { monthTotal, topCategory: sortedCategories[0] ? sortedCategories[0][0] : 'None' };
    }

    exportDataBtn.addEventListener('click', () => {
        const dataStr = JSON.stringify({ user: userProfile, transactions }, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fintrack_${userProfile.username}_data.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    importDataBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const imported = JSON.parse(reader.result);
                if (!imported.transactions || !Array.isArray(imported.transactions)) {
                    throw new Error('Invalid file format');
                }
                transactions = imported.transactions.map(tx => ({
                    ...tx,
                    amount: parseFloat(tx.amount)
                }));
                transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                updateUI();
                alert('Import successful. Your data has been restored.');
            } catch (err) {
                alert('Failed to import transactions. Please select a valid JSON export file.');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    });

    // --- 8. THEME & NAVIGATION ---
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
        darkModeToggle.checked = true;
    }
    updateThemeStatus();

    darkModeToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }
        updateThemeStatus();
    });

    const navItems = document.querySelectorAll('.nav-menu .nav-item[data-target]');
    const views = document.querySelectorAll('.view-section');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-menu .nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            views.forEach(view => view.classList.remove('active'));
            document.getElementById(item.getAttribute('data-target')).classList.add('active');
        });
    });

    // --- 9. FILTERS ---
    function applyFilters() {
        const term = searchInput.value.toLowerCase();
        const filterType = typeFilter.value; // 'all', 'income', or 'expense'

        const filtered = transactions.filter(tx => {
            const matchesSearch = tx.description.toLowerCase().includes(term) || 
                                  tx.category.toLowerCase().includes(term);
            const matchesType = (filterType === 'all') || (tx.type === filterType);
            return matchesSearch && matchesType;
        });
        
        updateUI(filtered);
    }
    
    searchInput.addEventListener('input', applyFilters);
    typeFilter.addEventListener('change', applyFilters);

    // Initial Render
    updateUI();
});
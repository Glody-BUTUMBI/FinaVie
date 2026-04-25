/* ============================================================
  FinanceVert — app.js
  Full personal finance management SPA
   ============================================================ */

'use strict';

// ===== STATE =====
const STATE_KEY = 'financevert_state';
let state = {
  users: {},           // { email: { password, firstName, lastName } }
  currentUser: null,   // email string
  data: {}             // { [email]: { transactions, goals, budgets, banks, notifications } }
};

function getUserData() {
  return state.data[state.currentUser] || {};
}
function setUserData(patch) {
  state.data[state.currentUser] = { ...getUserData(), ...patch };
  saveState();
}
function saveState() {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch(e) {}
}
function loadState() {
  try {
    const s = localStorage.getItem(STATE_KEY);
    if (s) state = JSON.parse(s);
  } catch(e) {}
}

// ===== AUTH =====
function showPanel(id) {
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.add('hidden'));
  const el = document.getElementById(id);
  el.classList.remove('hidden');
  el.style.animation = 'none';
  requestAnimationFrame(() => { el.style.animation = 'fadeSlideUp 0.5s cubic-bezier(0.4,0,0.2,1) both'; });
}

function togglePW(icon) {
  const input = icon.previousElementSibling;
  if (input.type === 'password') { input.type = 'text'; icon.classList.replace('fa-eye','fa-eye-slash'); }
  else { input.type = 'password'; icon.classList.replace('fa-eye-slash','fa-eye'); }
}

function handleRegister() {
  const fn = document.getElementById('reg-firstname').value.trim();
  const ln = document.getElementById('reg-lastname').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const pw = document.getElementById('reg-password').value;
  const cpw = document.getElementById('reg-confirm').value;
  const errEl = document.getElementById('reg-error');
  errEl.classList.add('hidden');

  if (!fn || !ln) return showError(errEl, 'Veuillez remplir tous les champs.');
  if (!email || !email.includes('@')) return showError(errEl, 'Email invalide.');
  if (pw.length < 8) return showError(errEl, 'Le mot de passe doit contenir au moins 8 caractères.');
  if (pw !== cpw) return showError(errEl, 'Les mots de passe ne correspondent pas.');
  if (state.users[email]) return showError(errEl, 'Un compte existe déjà avec cet email.');

  state.users[email] = { password: btoa(pw), firstName: fn, lastName: ln };
  state.data[email] = getDefaultUserData();
  state.currentUser = email;
  saveState();
  launchApp();
}

function handleLogin() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pw = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');

  if (!email || !pw) return showError(errEl, 'Veuillez remplir tous les champs.');
  const user = state.users[email];
  if (!user) return showError(errEl, 'Aucun compte trouvé avec cet email.');
  if (user.password !== btoa(pw)) return showError(errEl, 'Mot de passe incorrect.');

  state.currentUser = email;
  saveState();
  launchApp();
}

function handleLogout() {
  state.currentUser = null;
  saveState();
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth-overlay').classList.remove('hidden');
  showPanel('landing-page');
  destroyCharts();
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

function getDefaultUserData() {
  return {
    transactions: [],
    goals: [],
    budgets: [],
    banks: [],
    notifications: [
      { icon: 'fa-solid fa-chart-line', text: 'Bienvenue sur FinanceVert ! Commencez par lier un compte bancaire.', time: 'Il y a 1 min' },
      { icon: 'fa-solid fa-bullseye', text: 'Créez votre premier objectif financier.', time: 'Il y a 2 min' },
      { icon: 'fa-solid fa-shield-halved', text: 'Votre compte est sécurisé avec le chiffrement 256-bit SSL.', time: 'Il y a 3 min' }
    ]
  };
}

// ===== LAUNCH APP =====
function launchApp() {
  const overlay = document.getElementById('auth-overlay');
  overlay.style.opacity = '0';
  setTimeout(() => {
    overlay.classList.add('hidden');
    overlay.style.opacity = '';
  }, 500);
  document.getElementById('app').classList.remove('hidden');
  initApp();
}

function initApp() {
  const user = state.users[state.currentUser];
  const name = user ? `${user.firstName} ${user.lastName}` : 'Utilisateur';
  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : 'U';

  document.getElementById('sidebar-name').textContent = name;
  document.getElementById('sidebar-avatar').textContent = initials;
  document.getElementById('user-mini').textContent = initials;
  document.getElementById('settings-avatar').textContent = initials;
  document.getElementById('greeting').textContent = `Bonjour, ${user ? user.firstName : 'Utilisateur'} ! 👋`;

  const setFn = document.getElementById('set-firstname');
  const setLn = document.getElementById('set-lastname');
  const setEm = document.getElementById('set-email');
  if (setFn) setFn.value = user ? user.firstName : '';
  if (setLn) setLn.value = user ? user.lastName : '';
  if (setEm) setEm.value = state.currentUser || '';

  // Set today's date in tx form
  const txDate = document.getElementById('tx-date');
  if (txDate) txDate.valueAsDate = new Date();

  setupNav();
  updateNotifBadge();
  renderNotifications();
  // Defer chart rendering until the page has visible dimensions
  requestAnimationFrame(() => {
    renderDashboard();
  });
  renderTransactions();
  renderBudgets();
  renderGoals();
  renderBanks();
  renderAnalytics();
  updateBankAccountsSelect();
}

// ===== NAVIGATION =====
function setupNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const page = item.dataset.page;
      navigateTo(page);
      if (window.innerWidth < 768) closeSidebar();
    });
  });
}

function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  const navItem = document.querySelector(`[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');

  const titles = {
    dashboard: 'Tableau de bord', transactions: 'Transactions', budgets: 'Budgets',
    goals: 'Objectifs', banks: 'Comptes bancaires', analytics: 'Analyses',
    security: 'Sécurité', settings: 'Paramètres'
  };
  document.getElementById('topbar-title').textContent = titles[page] || page;

  // Sync mobile bottom nav
  document.querySelectorAll('.mobile-nav-item[data-page]').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });
  if (page === 'analytics') {
    // Use rAF so the page is visible (has dimensions) before Chart.js measures it
    requestAnimationFrame(() => renderAnalytics());
  }
  if (page === 'dashboard') {
    requestAnimationFrame(() => renderDashboard());
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const isOpen = sidebar.classList.toggle('open');
  overlay.classList.toggle('visible', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('visible');
  document.body.style.overflow = '';
}

function mobileNavTo(page, btn) {
  document.querySelectorAll('.mobile-nav-item[data-page]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  navigateTo(page);
}

// ===== NOTIFICATIONS =====
function toggleNotifications() {
  document.getElementById('notif-dropdown').classList.toggle('hidden');
}
function updateNotifBadge() {
  const n = (getUserData().notifications || []).length;
  const badge = document.getElementById('notif-badge');
  badge.textContent = n;
  badge.style.display = n > 0 ? 'flex' : 'none';
}
function renderNotifications() {
  const list = document.getElementById('notif-list');
  const notifs = getUserData().notifications || [];
  if (!notifs.length) { list.innerHTML = '<div class="notif-item"><span class="notif-item-text">Aucune notification</span></div>'; return; }
  list.innerHTML = notifs.map(n => `
    <div class="notif-item">
      <i class="${n.icon}"></i>
      <div><div class="notif-item-text">${n.text}</div><div class="notif-item-time">${n.time}</div></div>
    </div>`).join('');
}
function clearNotifications() {
  setUserData({ notifications: [] });
  updateNotifBadge();
  renderNotifications();
  document.getElementById('notif-dropdown').classList.add('hidden');
}

// ===== DASHBOARD =====
// Centralised chart registry — keyed by canvas id
const CHARTS = {};

function safeDestroyChart(id) {
  // 1) destroy from our registry
  if (CHARTS[id]) {
    try { CHARTS[id].destroy(); } catch(e) {}
    delete CHARTS[id];
  }
  // 2) safety-net: Chart.js may still hold a reference on the canvas
  const canvas = document.getElementById(id);
  if (canvas) {
    const existing = Chart.getChart(canvas);
    if (existing) {
      try { existing.destroy(); } catch(e) {}
    }
    // wipe the canvas so the next render starts clean
    canvas.width = canvas.width;
  }
}

function destroyCharts() {
  ['main-chart','pie-chart','bar-chart','savings-chart'].forEach(safeDestroyChart);
}

function renderDashboard() {
  const d = getUserData();
  const txs = d.transactions || [];
  const now = new Date();
  const thisMonth = txs.filter(t => {
    const td = new Date(t.date);
    return td.getMonth() === now.getMonth() && td.getFullYear() === now.getFullYear();
  });
  const income = thisMonth.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
  const expenses = thisMonth.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
  const banks = d.banks || [];
  const totalBalance = banks.reduce((s, b) => s + (b.balance || 0), 0) + income - expenses;
  const goals = d.goals || [];
  const totalSavings = goals.reduce((s, g) => s + (g.current || 0), 0);

  animateValue('stat-balance', totalBalance);
  animateValue('stat-income', income);
  animateValue('stat-expenses', expenses);
  animateValue('stat-savings', totalSavings);

  const lastMonth = txs.filter(t => {
    const td = new Date(t.date);
    const lm = new Date(now.getFullYear(), now.getMonth()-1, 1);
    return td.getMonth() === lm.getMonth() && td.getFullYear() === lm.getFullYear();
  });
  const lastIncome = lastMonth.filter(t => t.type==='income').reduce((s,t)=>s+t.amount,0);
  const pct = lastIncome > 0 ? ((income - lastIncome)/lastIncome*100).toFixed(1) : 0;
  const changeEl = document.getElementById('stat-balance-change');
  if (changeEl) {
    changeEl.textContent = `${pct > 0 ? '+' : ''}${pct}% vs mois dernier`;
    changeEl.className = 'stat-change ' + (pct >= 0 ? 'positive' : 'negative');
  }

  renderRecentTransactions(txs.slice().reverse().slice(0, 5));
  renderDashboardGoals(goals);
  renderMainChart('month');
  renderPieChart(expenses > 0 ? thisMonth.filter(t=>t.type==='expense') : []);
}

function animateValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseFloat(el.dataset.val || 0);
  el.dataset.val = value;
  const dur = 800;
  const startTime = performance.now();
  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / dur, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (value - start) * eased;
    el.textContent = formatCurrency(current);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function renderRecentTransactions(txs) {
  const list = document.getElementById('recent-tx-list');
  if (!list) return;
  if (!txs.length) {
    list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-receipt"></i><p>Aucune transaction</p></div>';
    return;
  }
  list.innerHTML = txs.map((t,i) => `
    <div class="tx-item" style="animation-delay:${i*0.08}s">
      <div class="tx-icon ${t.type}"><i class="${getCatIcon(t.category)}"></i></div>
      <div class="tx-info">
        <div class="tx-desc">${t.description}</div>
        <div class="tx-cat">${t.category}</div>
      </div>
      <div class="tx-amount ${t.type}">${t.type==='income'?'+':'-'}${formatCurrency(t.amount)}</div>
      <div class="tx-date">${formatDate(t.date)}</div>
    </div>`).join('');
}

function renderDashboardGoals(goals) {
  const list = document.getElementById('dashboard-goals-list');
  if (!list) return;
  if (!goals.length) {
    list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-bullseye"></i><p>Aucun objectif</p></div>';
    return;
  }
  list.innerHTML = goals.slice(0,4).map(g => {
    const pct = Math.min(100, Math.round((g.current/g.target)*100));
    return `<div class="dash-goal-item">
      <div class="dash-goal-top">
        <div class="dash-goal-name">${g.emoji} ${g.name}</div>
        <div class="dash-goal-pct">${pct}%</div>
      </div>
      <div class="dash-prog-bar"><div class="dash-prog-fill" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
}

let chartPeriod = 'month';
function setChartPeriod(period, btn) {
  chartPeriod = period;
  document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderMainChart(period);
}

function renderMainChart(period) {
  const ctx = document.getElementById('main-chart');
  if (!ctx) return;
  safeDestroyChart('main-chart');

  const txs = (getUserData().transactions || []);
  const { labels, incomeData, expenseData } = buildChartData(txs, period);

  CHARTS['main-chart'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Revenus', data: incomeData, borderColor: '#22c55e',
          backgroundColor: 'rgba(34,197,94,0.08)', tension: 0.4, fill: true,
          pointBackgroundColor: '#22c55e', pointRadius: 4, pointHoverRadius: 7
        },
        {
          label: 'Dépenses', data: expenseData, borderColor: '#eab308',
          backgroundColor: 'rgba(234,179,8,0.06)', tension: 0.4, fill: true,
          pointBackgroundColor: '#eab308', pointRadius: 4, pointHoverRadius: 7
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#86efac', font: { family: 'DM Sans', size: 12 } } },
        tooltip: {
          backgroundColor: 'rgba(10,25,15,0.95)', borderColor: 'rgba(74,222,128,0.2)',
          borderWidth: 1, titleColor: '#f0fdf4', bodyColor: '#86efac',
          callbacks: { label: ctx => ` ${formatCurrency(ctx.raw)}` }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(74,222,128,0.07)' }, ticks: { color: '#86efac', font: { size: 11 } } },
        y: { grid: { color: 'rgba(74,222,128,0.07)' }, ticks: { color: '#86efac', callback: v => formatCurrency(v) } }
      },
      animation: { duration: 700, easing: 'easeInOutQuart' }
    }
  });
}

function buildChartData(txs, period) {
  const now = new Date();
  let labels=[], incomeData=[], expenseData=[];
  if (period === 'week') {
    for (let i=6; i>=0; i--) {
      const d = new Date(now); d.setDate(d.getDate()-i);
      const ds = d.toISOString().split('T')[0];
      labels.push(['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d.getDay()]);
      const dayTx = txs.filter(t => t.date === ds);
      incomeData.push(dayTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0));
      expenseData.push(dayTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));
    }
  } else if (period === 'month') {
    const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    for (let i=5; i>=0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      labels.push(months[d.getMonth()]);
      const mTx = txs.filter(t => { const td = new Date(t.date); return td.getMonth()===d.getMonth()&&td.getFullYear()===d.getFullYear(); });
      incomeData.push(mTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0));
      expenseData.push(mTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));
    }
  } else {
    for (let i=4; i>=0; i--) {
      const yr = now.getFullYear()-i;
      labels.push(yr.toString());
      const yTx = txs.filter(t => new Date(t.date).getFullYear()===yr);
      incomeData.push(yTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0));
      expenseData.push(yTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));
    }
  }
  return { labels, incomeData, expenseData };
}

function renderPieChart(expenseTxs) {
  const ctx = document.getElementById('pie-chart');
  if (!ctx) return;
  safeDestroyChart('pie-chart');

  const cats = {};
  expenseTxs.forEach(t => { cats[t.category] = (cats[t.category]||0) + t.amount; });
  const labels = Object.keys(cats);
  const data = Object.values(cats);
  const colors = ['#22c55e','#eab308','#3b82f6','#a855f7','#f97316','#06b6d4','#ec4899'];

  const legendEl = ctx.closest('.glass-card')?.querySelector('.pie-legend') || document.getElementById('pie-legend');

  if (!labels.length) {
    if (legendEl) legendEl.innerHTML = '<p style="color:var(--text-sec);font-size:0.85rem;text-align:center;padding:1rem 0">Aucune dépense ce mois</p>';
    ctx.style.display = 'none';
    return;
  }
  ctx.style.display = 'block';

  CHARTS['pie-chart'] = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors.slice(0,labels.length), borderWidth: 2, borderColor: 'rgba(10,25,15,0.8)', hoverOffset: 8 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10,25,15,0.95)', borderColor: 'rgba(74,222,128,0.2)', borderWidth: 1,
          callbacks: { label: ctx => ` ${ctx.label}: ${formatCurrency(ctx.raw)}` }
        }
      },
      animation: { duration: 700 }
    }
  });

  const total = data.reduce((s,v)=>s+v,0);
  if (legendEl) {
    legendEl.innerHTML = labels.map((l,i) => `
      <div class="pie-legend-item">
        <div class="pie-dot" style="background:${colors[i]}"></div>
        <span>${l}</span>
        <span style="margin-left:auto;font-weight:600">${Math.round(data[i]/total*100)}%</span>
      </div>`).join('');
  }
}

// ===== TRANSACTIONS =====
let currentTxType = 'expense';
function setTxType(type) {
  currentTxType = type;
  document.getElementById('type-expense').classList.toggle('active', type==='expense');
  document.getElementById('type-income').classList.toggle('active', type==='income');
  const catSel = document.getElementById('tx-category');
  if (type === 'income') {
    catSel.innerHTML = '<option value="Salaire">Salaire</option><option value="Freelance">Freelance</option><option value="Investissement">Investissement</option><option value="Autres">Autres</option>';
  } else {
    catSel.innerHTML = '<option value="Alimentation">Alimentation</option><option value="Logement">Logement</option><option value="Transport">Transport</option><option value="Loisirs">Loisirs</option><option value="Santé">Santé</option><option value="Autres">Autres</option>';
  }
}

function addTransaction() {
  const amount = parseFloat(document.getElementById('tx-amount').value);
  const desc = document.getElementById('tx-desc').value.trim();
  const cat = document.getElementById('tx-category').value;
  const date = document.getElementById('tx-date').value;
  const account = document.getElementById('tx-account').value;

  if (!amount || amount <= 0) return showToast('Montant invalide.','error');
  if (!desc) return showToast('Description requise.','error');
  if (!date) return showToast('Date requise.','error');

  const tx = { id: uid(), type: currentTxType, amount, description: desc, category: cat, date, account };
  const d = getUserData();
  const txs = [tx, ...(d.transactions||[])];
  setUserData({ transactions: txs });

  // Update bank balance
  if (account !== 'Principal') {
    const banks = (d.banks||[]).map(b => {
      if (b.name === account) {
        b.balance = (b.balance||0) + (currentTxType==='income' ? amount : -amount);
      }
      return b;
    });
    setUserData({ banks });
  }

  addNotif(`fa-solid fa-receipt`, `Transaction ajoutée : ${desc} — ${formatCurrency(amount)}`);
  closeModal('add-transaction-modal');
  showToast('Transaction ajoutée avec succès !','success');
  resetTxForm();
  renderDashboard();
  renderTransactions();
  renderBudgets();
  renderBanks();
}

function resetTxForm() {
  document.getElementById('tx-amount').value = '';
  document.getElementById('tx-desc').value = '';
  document.getElementById('tx-date').valueAsDate = new Date();
  setTxType('expense');
}

function renderTransactions() {
  filterTransactions();
}

function filterTransactions() {
  const search = (document.getElementById('tx-search')?.value||'').toLowerCase();
  const catFilter = document.getElementById('tx-category-filter')?.value||'';
  const typeFilter = document.getElementById('tx-type-filter')?.value||'';
  const txs = getUserData().transactions||[];

  const filtered = txs.filter(t => {
    const matchSearch = !search || t.description.toLowerCase().includes(search) || t.category.toLowerCase().includes(search);
    const matchCat = !catFilter || t.category === catFilter;
    const matchType = !typeFilter || t.type === typeFilter;
    return matchSearch && matchCat && matchType;
  });

  const tbody = document.getElementById('tx-table-body');
  const emptyEl = document.getElementById('tx-empty');
  if (!tbody) return;

  if (!filtered.length) {
    tbody.innerHTML = '';
    emptyEl?.classList.remove('hidden');
    return;
  }
  emptyEl?.classList.add('hidden');

  tbody.innerHTML = filtered.map((t,i) => `
    <tr style="animation:fadeSlideUp 0.3s ease ${i*0.05}s both">
      <td>${formatDate(t.date)}</td>
      <td><span style="display:flex;align-items:center;gap:0.5rem"><i class="${getCatIcon(t.category)}" style="color:var(--green-bright)"></i>${t.description}</span></td>
      <td><span class="cat-badge">${t.category}</span></td>
      <td style="color:var(--text-sec);font-size:0.85rem">${t.account||'Principal'}</td>
      <td class="${t.type==='income'?'amount-positive':'amount-negative'}">${t.type==='income'?'+':'-'}${formatCurrency(t.amount)}</td>
      <td><div class="tx-actions"><button class="delete-btn" onclick="deleteTransaction('${t.id}')"><i class="fa-solid fa-trash"></i></button></div></td>
    </tr>`).join('');
}

function deleteTransaction(id) {
  const txs = (getUserData().transactions||[]).filter(t=>t.id!==id);
  setUserData({ transactions: txs });
  renderTransactions();
  renderDashboard();
  renderBudgets();
  showToast('Transaction supprimée.','info');
}

function exportTransactions() {
  const txs = getUserData().transactions||[];
  if (!txs.length) return showToast('Aucune transaction à exporter.','info');
  const csv = ['Date,Description,Catégorie,Compte,Type,Montant',
    ...txs.map(t => `${t.date},"${t.description}",${t.category},${t.account||'Principal'},${t.type},${t.amount}`)
  ].join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'transactions_financevert.csv'; a.click();
  showToast('Export CSV téléchargé !','success');
}

// ===== GOALS =====
let selectedGoalIcon = '🌴';
let contributeGoalId = null;

function selectGoalIcon(el, emoji) {
  selectedGoalIcon = emoji;
  document.querySelectorAll('.goal-icon-opt').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
}

function addGoal() {
  const name = document.getElementById('goal-name').value.trim();
  const target = parseFloat(document.getElementById('goal-target').value);
  const current = parseFloat(document.getElementById('goal-current').value)||0;
  const deadline = document.getElementById('goal-deadline').value;

  if (!name) return showToast('Nom requis.','error');
  if (!target||target<=0) return showToast('Montant cible invalide.','error');

  const goal = { id: uid(), name, emoji: selectedGoalIcon, target, current, deadline };
  const goals = [...(getUserData().goals||[]), goal];
  setUserData({ goals });
  addNotif('fa-solid fa-bullseye', `Nouvel objectif créé : ${name}`);
  closeModal('add-goal-modal');
  showToast('Objectif créé !','success');
  document.getElementById('goal-name').value='';
  document.getElementById('goal-target').value='';
  document.getElementById('goal-current').value='';
  document.getElementById('goal-deadline').value='';
  renderGoals();
  renderDashboard();
}

function openContributeModal(id) {
  contributeGoalId = id;
  document.getElementById('contribute-amount').value='';
  openModal('contribute-goal-modal');
}

function contributeGoal() {
  const amount = parseFloat(document.getElementById('contribute-amount').value);
  if (!amount||amount<=0) return showToast('Montant invalide.','error');
  const goals = (getUserData().goals||[]).map(g => {
    if (g.id === contributeGoalId) g.current = Math.min(g.target, (g.current||0)+amount);
    return g;
  });
  setUserData({ goals });
  closeModal('contribute-goal-modal');
  showToast(`+${formatCurrency(amount)} ajouté à l'objectif !`,'success');
  renderGoals();
  renderDashboard();
}

function deleteGoal(id) {
  const goals = (getUserData().goals||[]).filter(g=>g.id!==id);
  setUserData({ goals });
  renderGoals();
  renderDashboard();
  showToast('Objectif supprimé.','info');
}

function renderGoals() {
  const goals = getUserData().goals||[];
  const grid = document.getElementById('goals-grid');
  if (!grid) return;
  if (!goals.length) {
    grid.innerHTML = '<div class="glass-card empty-state"><i class="fa-solid fa-bullseye"></i><p>Aucun objectif. Créez-en un !</p></div>';
    return;
  }
  grid.innerHTML = goals.map((g,i) => {
    const pct = Math.min(100, Math.round((g.current/g.target)*100));
    const daysLeft = g.deadline ? Math.max(0, Math.round((new Date(g.deadline)-Date.now())/(1000*60*60*24))) : null;
    return `<div class="goal-card" style="animation-delay:${i*0.1}s">
      <div class="goal-header">
        <div class="goal-emoji">${g.emoji}</div>
        <div>
          <div class="goal-name">${g.name}</div>
          <div class="goal-deadline">${daysLeft !== null ? `${daysLeft} jours restants` : 'Sans limite'}</div>
        </div>
      </div>
      <div class="goal-progress-text">
        <span>${formatCurrency(g.current)}</span>
        <span style="color:var(--text-sec)">${formatCurrency(g.target)}</span>
      </div>
      <div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${pct}%"></div></div>
      <div style="text-align:center;font-family:var(--font-display);font-size:1.4rem;font-weight:800;color:${pct>=100?'var(--green-bright)':'var(--text-sec)'};margin-bottom:1rem">${pct}%${pct>=100?' 🎉':''}</div>
      <div class="goal-actions">
        <button class="btn-primary" onclick="openContributeModal('${g.id}')"><i class="fa-solid fa-plus"></i> Contribuer</button>
        <button class="btn-ghost" onclick="deleteGoal('${g.id}')"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

// ===== BUDGETS =====
function addBudget() {
  const category = document.getElementById('budget-category').value;
  const limit = parseFloat(document.getElementById('budget-limit').value);
  if (!limit||limit<=0) return showToast('Limite invalide.','error');

  const budgets = getUserData().budgets||[];
  if (budgets.find(b=>b.category===category)) return showToast('Un budget existe déjà pour cette catégorie.','error');

  budgets.push({ id: uid(), category, limit });
  setUserData({ budgets });
  closeModal('add-budget-modal');
  showToast('Budget créé !','success');
  renderBudgets();
}

function deleteBudget(id) {
  setUserData({ budgets: (getUserData().budgets||[]).filter(b=>b.id!==id) });
  renderBudgets();
  showToast('Budget supprimé.','info');
}

function renderBudgets() {
  const budgets = getUserData().budgets||[];
  const txs = getUserData().transactions||[];
  const grid = document.getElementById('budgets-grid');
  if (!grid) return;
  if (!budgets.length) {
    grid.innerHTML = '<div class="glass-card empty-state"><i class="fa-solid fa-chart-pie"></i><p>Aucun budget. Créez-en un !</p></div>';
    return;
  }
  const now = new Date();
  const monthExpenses = txs.filter(t => {
    const d = new Date(t.date);
    return t.type==='expense' && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
  });

  grid.innerHTML = budgets.map((b,i) => {
    const spent = monthExpenses.filter(t=>t.category===b.category).reduce((s,t)=>s+t.amount,0);
    const pct = Math.min(100, Math.round(spent/b.limit*100));
    const status = pct>=100?'over':pct>=80?'warn':'ok';
    const statusText = pct>=100 ? '⚠️ Dépassé !' : pct>=80 ? '⚡ Proche de la limite' : `✅ ${100-pct}% disponible`;
    return `<div class="budget-card" style="animation-delay:${i*0.1}s">
      <div class="budget-header">
        <div class="budget-name"><i class="${getCatIcon(b.category)}" style="color:var(--green-bright)"></i> ${b.category}</div>
        <button class="budget-delete" onclick="deleteBudget('${b.id}')"><i class="fa-solid fa-trash"></i></button>
      </div>
      <div class="budget-amounts">
        <span class="budget-spent">${formatCurrency(spent)} dépensés</span>
        <span class="budget-limit">/ ${formatCurrency(b.limit)}</span>
      </div>
      <div class="budget-bar"><div class="budget-fill ${status}" style="width:${pct}%"></div></div>
      <div class="budget-status ${status}">${statusText}</div>
    </div>`;
  }).join('');
}

// ===== BANKS =====
let selectedBank = { name: '', icon: '' };

function selectBank(el, name, icon) {
  document.querySelectorAll('.bank-pick-item').forEach(e=>e.classList.remove('active'));
  el.classList.add('active');
  selectedBank = { name, icon };
}

function addBank() {
  const name = document.getElementById('bank-name').value.trim();
  const balance = parseFloat(document.getElementById('bank-balance').value)||0;
  const iban = document.getElementById('bank-iban').value.trim();

  if (!name) return showToast('Nom de compte requis.','error');

  const bank = { id: uid(), name, bankName: selectedBank.name||'Banque', icon: selectedBank.icon||'fa-solid fa-university', balance, iban };
  const banks = [...(getUserData().banks||[]), bank];
  setUserData({ banks });
  addNotif('fa-solid fa-university', `Compte bancaire lié : ${name} — ${selectedBank.name||'Banque'}`);
  closeModal('add-bank-modal');
  showToast('Compte bancaire lié avec succès !','success');
  document.getElementById('bank-name').value='';
  document.getElementById('bank-balance').value='';
  document.getElementById('bank-iban').value='';
  selectedBank = { name:'', icon:'' };
  document.querySelectorAll('.bank-pick-item').forEach(e=>e.classList.remove('active'));
  renderBanks();
  updateBankAccountsSelect();
  renderDashboard();
}

function deleteBank(id) {
  setUserData({ banks: (getUserData().banks||[]).filter(b=>b.id!==id) });
  renderBanks();
  updateBankAccountsSelect();
  renderDashboard();
  showToast('Compte supprimé.','info');
}

function renderBanks() {
  const banks = getUserData().banks||[];
  const grid = document.getElementById('banks-grid');
  if (!grid) return;
  if (!banks.length) {
    grid.innerHTML = '<div class="glass-card empty-state"><i class="fa-solid fa-university"></i><p>Aucun compte lié. Commencez par en ajouter un !</p></div>';
    return;
  }
  grid.innerHTML = banks.map((b,i) => `
    <div class="bank-card pulse-glow" style="animation-delay:${i*0.12}s">
      <button class="bank-delete" onclick="deleteBank('${b.id}')"><i class="fa-solid fa-trash"></i></button>
      <div class="bank-card-header">
        <div class="bank-icon-wrap"><i class="${b.icon}"></i></div>
        <div>
          <div class="bank-card-name">${b.name}</div>
          <div class="bank-card-bank">${b.bankName}</div>
        </div>
      </div>
      <div class="bank-card-balance">${formatCurrency(b.balance)}</div>
      ${b.iban ? `<div class="bank-card-iban">${maskIBAN(b.iban)}</div>` : ''}
      <div class="bank-linked-badge"><i class="fa-solid fa-link"></i> Compte lié</div>
    </div>`).join('');
}

function maskIBAN(iban) {
  return iban.replace(/(.{4})/g, '$1 ').trim().replace(/\S{4}(?=\S{4}\s*$)/, '••••');
}

function updateBankAccountsSelect() {
  const sel = document.getElementById('tx-account');
  if (!sel) return;
  const banks = getUserData().banks||[];
  sel.innerHTML = '<option value="Principal">Compte principal</option>' +
    banks.map(b=>`<option value="${b.name}">${b.name} (${b.bankName})</option>`).join('');
}

// ===== ANALYTICS =====
function renderAnalytics() {
  const txs = getUserData().transactions||[];
  const now = new Date();
  const months = ['Jan','Fév','Mar','Avr','Mai','Jun'];
  const incData=[], expData=[], savData=[];

  for (let i=5; i>=0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const mTx = txs.filter(t=>{ const td=new Date(t.date); return td.getMonth()===d.getMonth()&&td.getFullYear()===d.getFullYear(); });
    const inc = mTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const exp = mTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    incData.push(inc);
    expData.push(exp);
    savData.push(Math.max(0, inc-exp));
  }

  const barCtx = document.getElementById('bar-chart');
  if (barCtx) {
    safeDestroyChart('bar-chart');
    CHARTS['bar-chart'] = new Chart(barCtx, {
      type:'bar',
      data:{ labels: months,
        datasets:[
          { label:'Revenus', data:incData, backgroundColor:'rgba(34,197,94,0.5)', borderColor:'#22c55e', borderWidth:1, borderRadius:6 },
          { label:'Dépenses', data:expData, backgroundColor:'rgba(234,179,8,0.4)', borderColor:'#eab308', borderWidth:1, borderRadius:6 }
        ]},
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ labels:{ color:'#86efac', font:{family:'DM Sans',size:12} } }, tooltip:{ backgroundColor:'rgba(10,25,15,0.95)', borderColor:'rgba(74,222,128,0.2)', borderWidth:1, callbacks:{ label:ctx=>` ${formatCurrency(ctx.raw)}` } } },
        scales:{ x:{ grid:{ color:'rgba(74,222,128,0.07)' }, ticks:{ color:'#86efac' } }, y:{ grid:{ color:'rgba(74,222,128,0.07)' }, ticks:{ color:'#86efac', callback:v=>formatCurrency(v) } } }
      }
    });
  }

  const savCtx = document.getElementById('savings-chart');
  if (savCtx) {
    safeDestroyChart('savings-chart');
    CHARTS['savings-chart'] = new Chart(savCtx, {
      type:'line',
      data:{ labels: months, datasets:[{ label:'Épargne nette', data:savData, borderColor:'#22c55e', backgroundColor:'rgba(34,197,94,0.1)', tension:0.4, fill:true, pointBackgroundColor:'#22c55e', pointRadius:5 }] },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ labels:{ color:'#86efac', font:{family:'DM Sans',size:12} } }, tooltip:{ backgroundColor:'rgba(10,25,15,0.95)', borderColor:'rgba(74,222,128,0.2)', borderWidth:1, callbacks:{ label:ctx=>` ${formatCurrency(ctx.raw)}` } } },
        scales:{ x:{ grid:{ color:'rgba(74,222,128,0.07)' }, ticks:{ color:'#86efac' } }, y:{ grid:{ color:'rgba(74,222,128,0.07)' }, ticks:{ color:'#86efac', callback:v=>formatCurrency(v) } } }
      }
    });
  }

  // Stats
  const totalInc = txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const totalExp = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const avgMonthExp = txs.length ? (totalExp/6).toFixed(2) : 0;
  const biggest = txs.filter(t=>t.type==='expense').sort((a,b)=>b.amount-a.amount)[0];

  const statsList = document.getElementById('analytics-stats-list');
  if (statsList) {
    statsList.innerHTML = [
      ['Total revenus', formatCurrency(totalInc), '#22c55e'],
      ['Total dépenses', formatCurrency(totalExp), '#fca5a5'],
      ['Épargne nette', formatCurrency(totalInc-totalExp), '#22c55e'],
      ['Dépense moy/mois', formatCurrency(avgMonthExp), '#eab308'],
      ['Nb. transactions', txs.length, '#86efac'],
      ['Plus grosse dépense', biggest ? `${biggest.description} — ${formatCurrency(biggest.amount)}` : 'N/A', '#fca5a5'],
    ].map(([l,v,c]) => `<div class="analytics-stat-item"><span class="analytics-stat-label">${l}</span><span class="analytics-stat-value" style="color:${c}">${v}</span></div>`).join('');
  }
}

// ===== SECURITY =====
function changePassword() {
  const cur = document.getElementById('sec-current-pw').value;
  const nw = document.getElementById('sec-new-pw').value;
  const cf = document.getElementById('sec-confirm-pw').value;
  const user = state.users[state.currentUser];
  if (!user) return;
  if (user.password !== btoa(cur)) return showToast('Mot de passe actuel incorrect.','error');
  if (nw.length < 8) return showToast('Le nouveau mot de passe doit contenir au moins 8 caractères.','error');
  if (nw !== cf) return showToast('Les mots de passe ne correspondent pas.','error');
  user.password = btoa(nw);
  saveState();
  document.getElementById('sec-current-pw').value='';
  document.getElementById('sec-new-pw').value='';
  document.getElementById('sec-confirm-pw').value='';
  showToast('Mot de passe mis à jour avec succès !','success');
  addNotif('fa-solid fa-lock','Votre mot de passe a été modifié.');
}

function toggle2FA(checkbox) {
  showToast(checkbox.checked ? 'Double authentification activée !' : 'Double authentification désactivée.', 'info');
}

// ===== SETTINGS =====
function saveSettings() {
  const fn = document.getElementById('set-firstname').value.trim();
  const ln = document.getElementById('set-lastname').value.trim();
  const em = document.getElementById('set-email').value.trim().toLowerCase();
  if (!fn||!ln) return showToast('Prénom et nom requis.','error');
  const user = state.users[state.currentUser];
  if (user) { user.firstName=fn; user.lastName=ln; }
  saveState();
  document.getElementById('sidebar-name').textContent=`${fn} ${ln}`;
  const initials=`${fn[0]}${ln[0]}`;
  document.getElementById('sidebar-avatar').textContent=initials;
  document.getElementById('user-mini').textContent=initials;
  document.getElementById('settings-avatar').textContent=initials;
  document.getElementById('greeting').textContent=`Bonjour, ${fn} ! 👋`;
  showToast('Profil mis à jour !','success');
}

function saveCurrency() {
  showToast('Devise mise à jour !','info');
}

function toggleDarkMode(cb) {
  showToast(cb.checked ? 'Mode sombre activé.' : 'Mode clair activé.','info');
}

function confirmResetData() {
  openConfirmDialog('Réinitialiser les données','Êtes-vous sûr de vouloir supprimer toutes vos transactions, objectifs, budgets et comptes bancaires ? Cette action est irréversible.', () => {
    setUserData(getDefaultUserData());
    destroyCharts();
    renderDashboard();
    renderTransactions();
    renderBudgets();
    renderGoals();
    renderBanks();
    renderAnalytics();
    showToast('Toutes les données ont été réinitialisées.','info');
  });
}

function confirmDeleteAccount() {
  openConfirmDialog('Supprimer le compte','Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Cette action est irréversible.', () => {
    delete state.users[state.currentUser];
    delete state.data[state.currentUser];
    state.currentUser = null;
    saveState();
    handleLogout();
    showToast('Compte supprimé.','info');
  });
}

// ===== MODAL HELPERS =====
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  document.body.style.overflow='hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  document.body.style.overflow='';
}

let confirmCallback = null;
function openConfirmDialog(title, message, cb) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  confirmCallback = cb;
  openModal('confirm-modal');
}
document.getElementById('confirm-action-btn').addEventListener('click', () => {
  if (confirmCallback) { confirmCallback(); confirmCallback=null; }
  closeModal('confirm-modal');
});

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      closeModal(overlay.id);
    }
  });
});

// Close notif dropdown on outside click
document.addEventListener('click', e => {
  const dropdown = document.getElementById('notif-dropdown');
  const notifBtn = document.querySelector('.notif-btn');
  if (dropdown && !dropdown.contains(e.target) && !notifBtn.contains(e.target)) {
    dropdown.classList.add('hidden');
  }
  if (window.innerWidth < 768) {
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.getElementById('hamburger');
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !hamburger.contains(e.target)) {
      closeSidebar();
    }
  }
});

// ===== TOAST =====
function showToast(msg, type='info') {
  const icons = { success:'fa-solid fa-circle-check', error:'fa-solid fa-circle-xmark', info:'fa-solid fa-circle-info' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="${icons[type]}"></i><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ===== NOTIFICATIONS =====
function addNotif(icon, text) {
  const notifs = getUserData().notifications||[];
  notifs.unshift({ icon, text, time: 'À l\'instant' });
  if (notifs.length > 20) notifs.pop();
  setUserData({ notifications: notifs });
  updateNotifBadge();
  renderNotifications();
}

// ===== HELPERS =====
function uid() { return Math.random().toString(36).substr(2,9)+Date.now().toString(36); }
function formatCurrency(v) {
  return parseFloat(v||0).toLocaleString('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' €';
}
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {day:'2-digit',month:'2-digit',year:'numeric'});
}
function getCatIcon(cat) {
  const icons = {
    Alimentation:'fa-solid fa-utensils', Logement:'fa-solid fa-house', Transport:'fa-solid fa-car',
    Loisirs:'fa-solid fa-gamepad', Santé:'fa-solid fa-heart-pulse', Salaire:'fa-solid fa-briefcase',
    Freelance:'fa-solid fa-laptop', Investissement:'fa-solid fa-chart-line', Autres:'fa-solid fa-tag'
  };
  return icons[cat]||'fa-solid fa-tag';
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => closeModal(m.id));
    document.getElementById('notif-dropdown').classList.add('hidden');
  }
});

// ===== INIT =====
loadState();
if (state.currentUser && state.users[state.currentUser]) {
  document.getElementById('auth-overlay').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  initApp();
} else {
  showPanel('landing-page');
}

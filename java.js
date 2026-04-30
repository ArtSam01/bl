// ══════════════════════════════════
// STATE
// ══════════════════════════════════
let currentUser = null;
let openDropdown = null;
 
// ── STORAGE HELPERS ──
function getS(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

function setS(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}
 
// ── TOAST ──
function showToast(msg, dur=2800) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}
 
// ══════════════════════════════════
// AUTH
// ══════════════════════════════════
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((b,i) => b.classList.toggle('active', (tab==='login' && i===0)||(tab==='register' && i===1)));
  document.getElementById('loginPanel').style.display = tab==='login' ? '' : 'none';
  document.getElementById('registerPanel').style.display = tab==='register' ? '' : 'none';
}
 
// Convierte email a clave para storage
function emailToKey(email) {
  return 'u_' + email.toLowerCase().replace(/[^a-z0-9]/g, '_');
}
 
// Hash simple sin btoa ni crypto (100% compatible)
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return 'h' + Math.abs(h).toString(16) + str.length.toString(16);
}
 
async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass = document.getElementById('loginPass').value;
  const err = document.getElementById('loginError');
  err.classList.remove('show');
 
  if (!email || !pass) { err.textContent='Completa todos los campos.'; err.classList.add('show'); return; }
 
  const users = getS('users') || {};
  const uid = emailToKey(email);
  const user = users[uid];
 
  if (!user) { err.textContent='Correo no registrado.'; err.classList.add('show'); return; }
 
  const passHash = simpleHash(pass);
  if (user.pass !== passHash) {
    err.textContent = 'Contraseña incorrecta.'; err.classList.add('show'); return;
  }
 
  currentUser = { uid, email, name: user.name, role: user.role || 'user' };
  bootApp();
}
 
async function doRegister() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const pass = document.getElementById('regPass').value;
  const pass2 = document.getElementById('regPass2').value;
  const err = document.getElementById('registerError');
  err.classList.remove('show');
 
  if (!name || !email || !pass) { err.textContent='Completa todos los campos.'; err.classList.add('show'); return; }
  if (pass !== pass2) { err.textContent='Las contraseñas no coinciden.'; err.classList.add('show'); return; }
  if (pass.length < 6) { err.textContent='Contraseña muy corta (mínimo 6 caracteres).'; err.classList.add('show'); return; }
 
  const users = await getS('users', true) || {};
  const uid = emailToKey(email);
  if (users[uid]) { err.textContent='Este correo ya está registrado.'; err.classList.add('show'); return; }
 
  const passHash = simpleHash(pass);
  const isAdmin = Object.keys(users).length === 0;
  users[uid] = { name, email, pass: passHash, role: isAdmin ? 'admin' : 'user', createdAt: new Date().toISOString() };
  await setS('users', users, true);
 
  currentUser = { uid, email, name, role: isAdmin ? 'admin' : 'user' };
  showToast('¡Cuenta creada! Bienvenida 🦋');
  bootApp();
}
 
function bootApp() {
  document.getElementById('authView').classList.remove('active');
  document.getElementById('appView').classList.add('active');
  // Admin menu: solo visible si es admin
  const adminNav = document.getElementById('nav-admin');
  adminNav.style.display = (currentUser.role === 'admin') ? 'flex' : 'none';
  // User chip
  document.querySelector('.avatar').textContent = currentUser.name[0].toUpperCase();
  document.querySelector('.user-chip-name').textContent = currentUser.name;
  showPage('mylist');
}
 
async function doLogout() {
  currentUser = null;
  document.getElementById('appView').classList.remove('active');
  document.getElementById('authView').classList.add('active');
  document.getElementById('nav-admin').style.display = 'none';
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').classList.remove('show');
  switchAuthTab('login');
}
 
// ══════════════════════════════════
// NAVIGATION
// ══════════════════════════════════
function showPage(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.getElementById('nav-' + page);
  if (navEl) navEl.classList.add('active');
  const mc = document.getElementById('mainContent');
 
  if (page === 'mylist') renderMyList(mc, 'all');
  else if (page === 'wantread') renderMyList(mc, 'pending');
  else if (page === 'completed') renderMyList(mc, 'completed');
  else if (page === 'reminders') renderReminders(mc);
  else if (page === 'stats') renderStats(mc);
  else if (page === 'admin') renderAdmin(mc);
}
 
// ══════════════════════════════════
// MANHWA CRUD
// ══════════════════════════════════
async function getManhwas() {
  return await getS(`manhwas:${currentUser.uid}`) || [];
}
async function saveManhwas(list) {
  await setS(`manhwas:${currentUser.uid}`, list);
}
 
function statusLabel(s) {
  const map = { read:'Leído', reading:'Leyendo', pending:'Pendiente', completed:'Completado' };
  return map[s] || s;
}
function statusClass(s) {
  const map = { read:'status-read', reading:'status-reading', pending:'status-pending', completed:'status-read' };
  return map[s] || '';
}
function statusCheck(s) {
  if (s==='read'||s==='completed') return '✓';
  if (s==='reading') return '▶';
  return '';
}
 
async function renderMyList(mc, filter) {
  const manhwas = await getManhwas();
  const reminders = await getReminders();
 
  let filtered = manhwas;
  if (filter === 'pending') filtered = manhwas.filter(m => m.status === 'pending');
  else if (filter === 'completed') filtered = manhwas.filter(m => m.status === 'completed' || m.status === 'read');
  else if (filter !== 'all') filtered = manhwas.filter(m => m.status === filter);
 
  const total = manhwas.length;
  const read = manhwas.filter(m => m.status === 'read' || m.status === 'completed').length;
  const pending = manhwas.filter(m => m.status === 'pending').length;
  const reading = manhwas.filter(m => m.status === 'reading').length;
 
  const pageTitle = filter === 'all' ? 'Mi lista' : filter === 'pending' ? 'Quiero leer' : 'Completados';
 
  mc.innerHTML = `
    <div class="topbar">
      <div>
        <div class="page-title">${pageTitle} <span class="cross">‡</span></div>
        <div class="page-subtitle">Aquí llevas el control de todo lo que lees.</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="user-chip" title="${currentUser.email}">
          <div class="avatar">${currentUser.name[0].toUpperCase()}</div>
          <div class="user-chip-text">
            <div class="user-chip-greeting">WELCOME BACK,</div>
            <div class="user-chip-name">${currentUser.name}</div>
          </div>
        </div>
        <button class="btn-logout" onclick="doLogout()">SALIR</button>
      </div>
    </div>
 
    <div class="stats-strip">
      <div class="stat-cell"><div class="stat-icon">📖</div><div><div class="stat-num">${total}</div><div class="stat-label">EN TOTAL</div></div></div>
      <div class="stat-cell"><div class="stat-icon">🦋</div><div><div class="stat-num">${read}</div><div class="stat-label">LEÍDOS</div></div></div>
      <div class="stat-cell"><div class="stat-icon">⏳</div><div><div class="stat-num">${pending}</div><div class="stat-label">PENDIENTES</div></div></div>
      <div class="stat-cell"><div class="stat-icon">▶️</div><div><div class="stat-num">${reading}</div><div class="stat-label">LEYENDO</div></div></div>
    </div>
 
    <div class="list-controls">
      <div class="list-tabs">
        <button class="list-tab ${filter==='all'?'active':''}" onclick="renderMyList(document.getElementById('mainContent'),'all')">Todos</button>
        <button class="list-tab ${filter==='reading'?'active':''}" onclick="renderMyList(document.getElementById('mainContent'),'reading')">Leyendo</button>
        <button class="list-tab ${filter==='pending'?'active':''}" onclick="renderMyList(document.getElementById('mainContent'),'pending')">Pendientes</button>
        <button class="list-tab ${filter==='completed'||filter==='read'?'active':''}" onclick="renderMyList(document.getElementById('mainContent'),'completed')">Completados</button>
      </div>
      <button class="btn-add" onclick="openAddManhwa()">+ Agregar nuevo</button>
    </div>
 
    <div class="manhwa-list" id="manhwaList">
      ${filtered.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📚</div>
          <h3>Sin manhwas aquí</h3>
          <p>Agrega tu primer manhwa con el botón de arriba</p>
        </div>` :
        filtered.map((m, i) => {
          const mReminders = reminders.filter(r => r.manhwa && r.manhwa.toLowerCase().includes(m.title.toLowerCase()));
          return `
          <div class="manhwa-row" id="row-${m.id}">
            <div class="manhwa-cover">
              ${m.cover ? `<img src="${m.cover}" onerror="this.parentElement.innerHTML='📖'">` : '📖'}
            </div>
            <div class="manhwa-info">
              <div class="manhwa-title">${m.title} <span class="plus-icon">+</span></div>
              ${m.author ? `<div class="manhwa-author">${m.author}</div>` : ''}
              <div class="manhwa-chapters">Cap. ${m.capStart||1} – Cap. ${m.capEnd||'?'}${m.capCurrent ? ` · <span style="color:var(--gold)">Vas en cap. ${m.capCurrent}</span>` : ''}</div>
              ${mReminders.length ? `<div class="manhwa-reminder">🔔 ${mReminders[0].msg}</div>` : ''}
            </div>
            <div class="manhwa-status">
              <div class="status-badge ${statusClass(m.status)}">
                <div class="check">${statusCheck(m.status)}</div>
                ${statusLabel(m.status)}
              </div>
              <div class="status-date">${m.date || ''}</div>
            </div>
            <div style="position:relative">
              <button class="row-menu-btn" onclick="toggleDropdown('dd-${m.id}', event)">⋮</button>
              <div class="dropdown" id="dd-${m.id}">
                <div class="dropdown-item" onclick="openEditManhwa('${m.id}')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>
                  Editar
                </div>
                <div class="dropdown-item" onclick="openReminderFor('${m.title}')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  Recordatorio
                </div>
                <div class="dropdown-item danger" onclick="deleteManhwa('${m.id}')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  Eliminar
                </div>
              </div>
            </div>
          </div>`;
        }).join('')
      }
    </div>
  `;
}
 
function openAddManhwa() {
  document.getElementById('manhwaModalTitle').textContent = 'Agregar Manhwa';
  document.getElementById('editId').value = '';
  ['mTitle','mAuthor','mCapEnd','mCapCurrent','mCover','mNotes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('mCapStart').value = '1';
  document.getElementById('mStatus').value = 'reading';
  openModal('manhwaModal');
}
 
async function openEditManhwa(id) {
  closeAllDropdowns();
  const manhwas = await getManhwas();
  const m = manhwas.find(x => x.id === id);
  if (!m) return;
  document.getElementById('manhwaModalTitle').textContent = 'Editar Manhwa';
  document.getElementById('editId').value = id;
  document.getElementById('mTitle').value = m.title || '';
  document.getElementById('mAuthor').value = m.author || '';
  document.getElementById('mCapStart').value = m.capStart || 1;
  document.getElementById('mCapEnd').value = m.capEnd || '';
  document.getElementById('mCapCurrent').value = m.capCurrent || '';
  document.getElementById('mStatus').value = m.status || 'reading';
  document.getElementById('mCover').value = m.cover || '';
  document.getElementById('mNotes').value = m.notes || '';
  openModal('manhwaModal');
}
 
async function saveManhwa() {
  const title = document.getElementById('mTitle').value.trim();
  if (!title) { showToast('El título es obligatorio'); return; }
 
  const manhwas = await getManhwas();
  const editId = document.getElementById('editId').value;
  const data = {
    title,
    author: document.getElementById('mAuthor').value.trim(),
    capStart: +document.getElementById('mCapStart').value || 1,
    capEnd: +document.getElementById('mCapEnd').value || null,
    capCurrent: +document.getElementById('mCapCurrent').value || null,
    status: document.getElementById('mStatus').value,
    cover: document.getElementById('mCover').value.trim(),
    notes: document.getElementById('mNotes').value.trim(),
    date: new Date().toLocaleDateString('es-MX', {day:'2-digit',month:'2-digit',year:'numeric'})
  };
 
  if (editId) {
    const idx = manhwas.findIndex(m => m.id === editId);
    if (idx > -1) { manhwas[idx] = { ...manhwas[idx], ...data }; }
  } else {
    data.id = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    manhwas.unshift(data);
  }
 
  await saveManhwas(manhwas);
  closeModal('manhwaModal');
  showToast(editId ? '✦ Manhwa actualizado' : '✦ Manhwa agregado');
  showPage('mylist');
}
 
async function deleteManhwa(id) {
  closeAllDropdowns();
  const manhwas = await getManhwas();
  await saveManhwas(manhwas.filter(m => m.id !== id));
  showToast('Manhwa eliminado');
  showPage('mylist');
}
 
// ══════════════════════════════════
// REMINDERS
// ══════════════════════════════════
async function getReminders() {
  return await getS(`reminders:${currentUser.uid}`) || [];
}
async function saveReminders(list) {
  await setS(`reminders:${currentUser.uid}`, list);
}
 
function openReminderFor(manhwaTitle) {
  closeAllDropdowns();
  document.getElementById('rManhwa').value = manhwaTitle || '';
  document.getElementById('rMsg').value = '';
  document.getElementById('rDate').value = '';
  document.getElementById('rNote').value = '';
  openModal('reminderModal');
}
 
async function saveReminder() {
  const manhwa = document.getElementById('rManhwa').value.trim();
  const msg = document.getElementById('rMsg').value.trim();
  if (!msg) { showToast('Escribe un mensaje para el recordatorio'); return; }
 
  const reminders = await getReminders();
  reminders.unshift({
    id: Date.now().toString(36),
    manhwa,
    msg,
    date: document.getElementById('rDate').value,
    note: document.getElementById('rNote').value.trim(),
    createdAt: new Date().toISOString()
  });
  await saveReminders(reminders);
  closeModal('reminderModal');
  showToast('🔔 Recordatorio guardado');
  showPage('reminders');
}
 
async function renderReminders(mc) {
  const reminders = await getReminders();
  mc.innerHTML = `
    <div class="topbar">
      <div>
        <div class="page-title">Recordatorios <span class="cross">✦</span></div>
        <div class="page-subtitle">No te pierdas ningún capítulo nuevo.</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="user-chip"><div class="avatar">${currentUser.name[0].toUpperCase()}</div>
          <div class="user-chip-text"><div class="user-chip-greeting">WELCOME BACK,</div><div class="user-chip-name">${currentUser.name}</div></div>
        </div>
        <button class="btn-logout" onclick="doLogout()">SALIR</button>
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:20px">
      <button class="btn-add" onclick="openReminderFor('')">+ Nuevo recordatorio</button>
    </div>
    ${reminders.length === 0 ? `
      <div class="empty-state"><div class="empty-icon">🔔</div><h3>Sin recordatorios</h3><p>Agrega recordatorios desde el menú de cada manhwa</p></div>`
    : reminders.map(r => `
      <div class="reminder-card">
        <div class="reminder-icon">🔔</div>
        <div class="reminder-info">
          ${r.manhwa ? `<div class="reminder-title">${r.manhwa}</div>` : ''}
          <div class="reminder-text">${r.msg}</div>
          ${r.date ? `<div class="reminder-time">📅 ${new Date(r.date).toLocaleString('es-MX', {dateStyle:'medium',timeStyle:'short'})}</div>` : ''}
          ${r.note ? `<div style="font-size:12px;color:var(--text3);margin-top:4px">📝 ${r.note}</div>` : ''}
        </div>
        <button class="btn-del" onclick="deleteReminder('${r.id}')" title="Eliminar">✕</button>
      </div>`).join('')}
  `;
}
 
async function deleteReminder(id) {
  const reminders = await getReminders();
  await saveReminders(reminders.filter(r => r.id !== id));
  showToast('Recordatorio eliminado');
  showPage('reminders');
}
 
// ══════════════════════════════════
// STATS
// ══════════════════════════════════
async function renderStats(mc) {
  const manhwas = await getManhwas();
  const total = manhwas.length;
  const read = manhwas.filter(m => m.status === 'read' || m.status === 'completed').length;
  const reading = manhwas.filter(m => m.status === 'reading').length;
  const pending = manhwas.filter(m => m.status === 'pending').length;
  const totalChaps = manhwas.reduce((a,m) => a + (m.capCurrent || m.capEnd || 0), 0);
 
  const authorCounts = {};
  manhwas.forEach(m => { if (m.author) authorCounts[m.author] = (authorCounts[m.author]||0)+1; });
  const topAuthors = Object.entries(authorCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
 
  mc.innerHTML = `
    <div class="topbar">
      <div>
        <div class="page-title">Stats <span class="cross">✦</span></div>
        <div class="page-subtitle">Tu historial de lectura en números.</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="user-chip"><div class="avatar">${currentUser.name[0].toUpperCase()}</div>
          <div class="user-chip-text"><div class="user-chip-greeting">WELCOME BACK,</div><div class="user-chip-name">${currentUser.name}</div></div>
        </div>
        <button class="btn-logout" onclick="doLogout()">SALIR</button>
      </div>
    </div>
 
    <div class="stats-strip" style="margin-bottom:32px">
      <div class="stat-cell"><div class="stat-icon">📚</div><div><div class="stat-num">${total}</div><div class="stat-label">TOTAL</div></div></div>
      <div class="stat-cell"><div class="stat-icon">✓</div><div><div class="stat-num">${read}</div><div class="stat-label">LEÍDOS</div></div></div>
      <div class="stat-cell"><div class="stat-icon">▶</div><div><div class="stat-num">${reading}</div><div class="stat-label">LEYENDO</div></div></div>
      <div class="stat-cell"><div class="stat-icon">📖</div><div><div class="stat-num">${totalChaps}</div><div class="stat-label">CAPS LEÍDOS</div></div></div>
    </div>
 
    <div class="section-title">DISTRIBUCIÓN DE ESTADO</div>
    <div style="display:flex;gap:16px;margin-bottom:36px;flex-wrap:wrap">
      ${[['Leídos',read,'#a0c080'],['Leyendo',reading,'#c0a060'],['Pendientes',pending,'#786868'],['Completados',manhwas.filter(m=>m.status==='completed').length,'#8b1a1a']].map(([label,val,color]) => `
        <div style="flex:1;min-width:140px;background:var(--card);border:1px solid var(--border);border-radius:3px;padding:20px">
          <div style="font-size:28px;font-family:'Cormorant Garamond',serif;color:${color}">${val}</div>
          <div style="font-size:11px;color:var(--text3);font-family:'Cinzel',serif;letter-spacing:1px;margin-top:4px">${label.toUpperCase()}</div>
          ${total > 0 ? `<div style="height:3px;background:var(--border);border-radius:2px;margin-top:12px"><div style="height:100%;width:${Math.round(val/total*100)}%;background:${color};border-radius:2px;transition:width .5s"></div></div>` : ''}
        </div>`).join('')}
    </div>
 
    ${topAuthors.length ? `
    <div class="section-title">TOP AUTORES</div>
    <div style="background:var(--card);border:1px solid var(--border);border-radius:3px;overflow:hidden">
      ${topAuthors.map(([author, count]) => `
        <div style="padding:14px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
          <span style="font-family:'Cormorant Garamond',serif;font-size:16px;color:var(--text)">${author}</span>
          <span style="font-size:12px;color:var(--red3)">${count} manhwa${count>1?'s':''}</span>
        </div>`).join('')}
    </div>` : ''}
  `;
}
 
// ══════════════════════════════════
// ADMIN
// ══════════════════════════════════
async function renderAdmin(mc) {
  if (currentUser.role !== 'admin') { mc.innerHTML = '<p style="color:var(--text3);padding:40px">Acceso denegado.</p>'; return; }
  const users = await getS('users', true) || {};
 
  const userRows = await Promise.all(Object.entries(users).map(async ([uid, u]) => {
    const manhwas = await getS(`manhwas:${uid}`) || [];
    return { uid, ...u, manhwaCount: manhwas.length };
  }));
 
  mc.innerHTML = `
    <div class="topbar">
      <div>
        <div class="page-title">Admin <span class="cross">⚙</span></div>
        <div class="page-subtitle">Panel de administración — usuarios registrados.</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="user-chip"><div class="avatar">${currentUser.name[0].toUpperCase()}</div>
          <div class="user-chip-text"><div class="user-chip-greeting">ADMIN,</div><div class="user-chip-name">${currentUser.name}</div></div>
        </div>
        <button class="btn-logout" onclick="doLogout()">SALIR</button>
      </div>
    </div>
 
    <div class="section-title">USUARIOS REGISTRADOS (${userRows.length})</div>
    <div style="background:var(--card);border:1px solid var(--border);border-radius:3px;overflow:hidden">
      <table class="admin-table">
        <thead>
          <tr>
            <th>USUARIO</th>
            <th>CORREO</th>
            <th>ROL</th>
            <th>MANHWAS</th>
            <th>REGISTRADO</th>
          </tr>
        </thead>
        <tbody>
          ${userRows.map(u => `
          <tr>
            <td style="display:flex;align-items:center;gap:10px">
              <div class="avatar" style="width:28px;height:28px;font-size:12px">${u.name[0].toUpperCase()}</div>
              <span style="color:var(--text)">${u.name}</span>
            </td>
            <td>${u.email}</td>
            <td><span class="admin-badge ${u.role}">${u.role === 'admin' ? '👑 Admin' : '👤 Usuario'}</span></td>
            <td style="color:var(--text)">${u.manhwaCount}</td>
            <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-MX') : '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}
 
// ══════════════════════════════════
// MODAL HELPERS
// ══════════════════════════════════
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
 
function toggleDropdown(id, e) {
  e.stopPropagation();
  const dd = document.getElementById(id);
  if (!dd) return;
  const isOpen = dd.classList.contains('open');
  closeAllDropdowns();
  if (!isOpen) { dd.classList.add('open'); openDropdown = id; }
}
function closeAllDropdowns() {
  document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
  openDropdown = null;
}
 
document.addEventListener('click', closeAllDropdowns);
document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
});
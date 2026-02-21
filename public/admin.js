(() => {
  const TOKEN_KEY = 'dc_admin_token';

  const loginSection    = document.getElementById('login-section');
  const dashboardSection = document.getElementById('dashboard-section');
  const tokenInput      = document.getElementById('token-input');
  const loginBtn        = document.getElementById('login-btn');
  const loginMsg        = document.getElementById('login-msg');
  const refreshBtn      = document.getElementById('refresh-btn');
  const exportBtn       = document.getElementById('export-btn');
  const logoutBtn       = document.getElementById('logout-btn');
  const statusFilter    = document.getElementById('status-filter');
  const tbody           = document.getElementById('subscribers-tbody');
  const actionMsg       = document.getElementById('action-msg');
  const countTotal      = document.getElementById('count-total');
  const count24h        = document.getElementById('count-24h');

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  }

  function showDashboard() {
    loginSection.style.display = 'none';
    dashboardSection.style.display = '';
    loadSubscribers();
  }

  function showLogin() {
    loginSection.style.display = '';
    dashboardSection.style.display = 'none';
    sessionStorage.removeItem(TOKEN_KEY);
  }

  function showActionMsg(text, type) {
    actionMsg.textContent = text;
    actionMsg.className = 'msg ' + type;
    setTimeout(() => { actionMsg.textContent = ''; }, 4000);
  }

  async function apiFetch(path, options = {}) {
    const token = getToken();
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token,
        ...(options.headers || {}),
      },
    });
    return res;
  }

  loginBtn.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    if (!token) { loginMsg.textContent = 'Token required.'; return; }

    loginBtn.disabled = true;
    loginMsg.textContent = '';

    try {
      const res = await fetch('/.netlify/functions/admin-health', {
        headers: { 'x-admin-token': token },
      });
      if (res.ok) {
        sessionStorage.setItem(TOKEN_KEY, token);
        showDashboard();
      } else {
        loginMsg.textContent = 'Invalid token.';
        loginBtn.disabled = false;
      }
    } catch {
      loginMsg.textContent = 'Network error.';
      loginBtn.disabled = false;
    }
  });

  tokenInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn.click();
  });

  logoutBtn.addEventListener('click', showLogin);
  refreshBtn.addEventListener('click', loadSubscribers);
  statusFilter.addEventListener('change', loadSubscribers);

  exportBtn.addEventListener('click', () => {
    const token = getToken();
    const url = '/.netlify/functions/admin-subscribers?export=csv';
    fetch(url, { headers: { 'x-admin-token': token } })
      .then((res) => {
        if (!res.ok) { showActionMsg('Export failed.', 'error'); return null; }
        return res.blob();
      })
      .then((blob) => {
        if (!blob) return;
        const objUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objUrl;
        link.download = 'subscribers.csv';
        link.click();
        URL.revokeObjectURL(objUrl);
      })
      .catch(() => showActionMsg('Export failed.', 'error'));
  });

  async function loadSubscribers() {
    tbody.innerHTML = '<tr><td colspan="4" class="loading">Loading…</td></tr>';
    countTotal.textContent = '—';
    count24h.textContent = '—';

    const status = statusFilter.value;

    try {
      const res = await apiFetch(
        `/.netlify/functions/admin-subscribers?status=${status}`
      );

      if (res.status === 401) { showLogin(); return; }
      if (!res.ok) { throw new Error('Request failed'); }

      const data = await res.json();
      const subscribers = data.subscribers || [];
      const now = Date.now();
      const h24 = 24 * 60 * 60 * 1000;

      const active = subscribers.filter((s) => s.status === 'active');
      const recent = subscribers.filter(
        (s) => s.status === 'active' && (now - new Date(s.created_at).getTime()) < h24
      );

      countTotal.textContent = active.length;
      count24h.textContent = recent.length;

      if (subscribers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="color:var(--text-dim)">No subscribers.</td></tr>';
        return;
      }

      tbody.innerHTML = subscribers.map((s) => `
        <tr data-id="${esc(s.id)}">
          <td>${esc(s.email)}</td>
          <td>${new Date(s.created_at).toLocaleString()}</td>
          <td><span class="badge ${esc(s.status)}">${esc(s.status)}</span></td>
          <td>
            ${s.status === 'active'
              ? `<button class="danger small deactivate-btn" data-id="${esc(s.id)}">Deactivate</button>`
              : '<span style="color:var(--text-dim)">—</span>'
            }
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('.deactivate-btn').forEach((btn) => {
        btn.addEventListener('click', () => deactivate(btn.dataset.id, btn));
      });

    } catch {
      tbody.innerHTML = '<tr><td colspan="4" style="color:var(--error)">Failed to load subscribers.</td></tr>';
    }
  }

  async function deactivate(id, btn) {
    if (!confirm('Deactivate this subscriber?')) return;
    btn.disabled = true;

    try {
      const res = await apiFetch('/.netlify/functions/admin-subscribers', {
        method: 'PATCH',
        body: JSON.stringify({ id }),
      });

      if (res.status === 401) { showLogin(); return; }

      const data = await res.json();
      if (data.ok) {
        showActionMsg('Subscriber deactivated.', 'success');
        loadSubscribers();
      } else {
        showActionMsg(data.error || 'Failed.', 'error');
        btn.disabled = false;
      }
    } catch {
      showActionMsg('Network error.', 'error');
      btn.disabled = false;
    }
  }

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Auto-login if token exists in session
  if (getToken()) {
    showDashboard();
  }
})();

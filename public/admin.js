// Elements
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const tokenInput = document.getElementById('token-input');
const loginMessage = document.getElementById('login-message');
const logoutBtn = document.getElementById('logout-btn');
const totalActiveEl = document.getElementById('total-active');
const last24hEl = document.getElementById('last-24h');
const statusFilter = document.getElementById('status-filter');
const refreshBtn = document.getElementById('refresh-btn');
const exportBtn = document.getElementById('export-btn');
const subscribersTbody = document.getElementById('subscribers-tbody');
const dashboardMessage = document.getElementById('dashboard-message');

// State
let adminToken = sessionStorage.getItem('adminToken');

// Initialize
if (adminToken) {
    showDashboard();
} else {
    showLogin();
}

// Event Listeners
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = tokenInput.value.trim();
    
    if (!token) {
        showLoginMessage('Please enter a token', 'error');
        return;
    }
    
    // Store token and verify by making a request
    adminToken = token;
    sessionStorage.setItem('adminToken', token);
    
    try {
        await loadSubscribers();
        showDashboard();
    } catch (error) {
        adminToken = null;
        sessionStorage.removeItem('adminToken');
        showLoginMessage('Invalid token', 'error');
    }
});

logoutBtn.addEventListener('click', () => {
    adminToken = null;
    sessionStorage.removeItem('adminToken');
    showLogin();
});

statusFilter.addEventListener('change', () => {
    loadSubscribers();
});

refreshBtn.addEventListener('click', () => {
    loadSubscribers();
});

exportBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('/.netlify/functions/admin-subscribers?export=csv', {
            headers: {
                'x-admin-token': adminToken,
            },
        });
        
        if (!response.ok) {
            throw new Error('Export failed');
        }
        
        const csv = await response.text();
        
        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showDashboardMessage('Export successful', 'success');
    } catch (error) {
        showDashboardMessage('Export failed', 'error');
        console.error('Export error:', error);
    }
});

// Functions
function showLogin() {
    loginSection.style.display = 'block';
    dashboardSection.style.display = 'none';
    tokenInput.value = '';
    hideLoginMessage();
}

function showDashboard() {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    loadSubscribers();
}

async function loadSubscribers() {
    const status = statusFilter.value;
    
    try {
        const response = await fetch(`/.netlify/functions/admin-subscribers?status=${status}`, {
            headers: {
                'x-admin-token': adminToken,
            },
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                adminToken = null;
                sessionStorage.removeItem('adminToken');
                showLogin();
                return;
            }
            throw new Error('Failed to load subscribers');
        }
        
        const data = await response.json();
        
        // Update stats
        totalActiveEl.textContent = data.stats.totalActive;
        last24hEl.textContent = data.stats.last24h;
        
        // Update table
        renderSubscribers(data.subscribers);
        
        hideDashboardMessage();
    } catch (error) {
        showDashboardMessage('Failed to load subscribers', 'error');
        console.error('Load error:', error);
    }
}

function renderSubscribers(subscribers) {
    if (subscribers.length === 0) {
        subscribersTbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No subscribers found</td></tr>';
        return;
    }
    
    subscribersTbody.innerHTML = subscribers.map(sub => `
        <tr>
            <td>${escapeHtml(sub.email)}</td>
            <td>${new Date(sub.created_at).toLocaleString()}</td>
            <td><span class="status-badge ${sub.status}">${sub.status}</span></td>
            <td>
                ${sub.status === 'active' ? `
                    <button class="action-btn" onclick="deactivateSubscriber('${sub.id}')">
                        Deactivate
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

async function deactivateSubscriber(id) {
    if (!confirm('Are you sure you want to deactivate this subscriber?')) {
        return;
    }
    
    try {
        const response = await fetch('/.netlify/functions/admin-subscribers', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-token': adminToken,
            },
            body: JSON.stringify({ id }),
        });
        
        if (!response.ok) {
            throw new Error('Failed to deactivate');
        }
        
        showDashboardMessage('Subscriber deactivated', 'success');
        loadSubscribers();
    } catch (error) {
        showDashboardMessage('Failed to deactivate subscriber', 'error');
        console.error('Deactivate error:', error);
    }
}

function showLoginMessage(text, type) {
    loginMessage.textContent = text;
    loginMessage.className = `message ${type}`;
    loginMessage.style.display = 'block';
}

function hideLoginMessage() {
    loginMessage.style.display = 'none';
}

function showDashboardMessage(text, type) {
    dashboardMessage.textContent = text;
    dashboardMessage.className = `message ${type}`;
    dashboardMessage.style.display = 'block';
    setTimeout(() => {
        hideDashboardMessage();
    }, 3000);
}

function hideDashboardMessage() {
    dashboardMessage.style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make deactivateSubscriber available globally
window.deactivateSubscriber = deactivateSubscriber;

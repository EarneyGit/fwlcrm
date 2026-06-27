// ============================================================
// LeadPulse CRM — SPA Router & App Bootstrap
// Hash-based routing, page lifecycle, theme management
// ============================================================

window.LP = window.LP || {};

LP.router = (() => {
  let current = 'dashboard';
  let currentPageModule = null;

  const pageMap = {
    dashboard:    LP.pages.dashboard,
    leads:        LP.pages.leads,
    clients:      LP.pages.clients,
    integrations: LP.pages.integrations,
    settings:     LP.pages.settings,
    reports:      LP.pages.reports,
    calendar:     LP.pages.calendar,
    team:         LP.pages.team,
  };

  const pageTitles = {
    dashboard:    'Dashboard',
    leads:        'Leads Inbox',
    clients:      'Clients',
    integrations: 'Integrations',
    settings:     'Settings',
    reports:      'Reports',
    calendar:     'Calendar',
    team:         'Team Management',
  };

  function navigate(page) {
    if (!pageMap[page]) page = 'dashboard';
    if (page === current && currentPageModule) return; // same page

    // Destroy current page
    if (currentPageModule?.destroy) currentPageModule.destroy();
    currentPageModule = null;

    current = page;
    window.location.hash = page;

    // Update topbar title
    const titleEl = document.getElementById('topbar-title');
    if (titleEl) titleEl.textContent = pageTitles[page] || page;

    // Animate content out then in
    const content = document.getElementById('page-content');
    if (content) {
      content.style.opacity = '0';
      content.style.transform = 'translateY(6px)';

      setTimeout(() => {
        const mod = pageMap[page];
        mod.init(content);
        currentPageModule = mod;

        content.style.transition = 'opacity 0.25s, transform 0.25s';
        content.style.opacity = '1';
        content.style.transform = 'translateY(0)';

        LP.sidebar.updateActive(page);
      }, 120);
    }

    document.title = `${pageTitles[page]} — LeadPulse CRM`;
  }

  function init() {
    // Read hash
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigate(hash);

    window.addEventListener('hashchange', () => {
      const h = window.location.hash.replace('#', '') || 'dashboard';
      navigate(h);
    });
  }

  return { navigate, init, get current() { return current; }, pageMap };
})();

// ─── API HANDLER ──────────────────────────────────────────
LP.api = (() => {
  async function getLeads() {
    const res = await fetch('/api/leads');
    if (!res.ok) throw new Error('Failed to fetch leads');
    return res.json();
  }

  async function getClients() {
    const res = await fetch('/api/clients');
    if (!res.ok) throw new Error('Failed to fetch clients');
    return res.json();
  }

  async function addManualLead(data) {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  }

  async function updateLead(id, data) {
    const res = await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data })
    });
    return res.json();
  }

  async function addActivity(data) {
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  }

  return { getLeads, getClients, addManualLead, updateLead, addActivity };
})();

// Global data store loaded from API
LP.data = { 
  leads: [], 
  clients: [],
  stats: {
    leadsToday: 42,
    leadsYesterday: 28,
    avgCPL: '₹240',
    avgResponse: '4m 12s',
    responseYesterday: '15m'
  },
  webhook: {
    url: 'https://leadpulse-crm.vercel.app/api/webhook',
    token: 'leadpulse_secure_token_2026',
    status: 'active',
    lastPing: new Date().toISOString()
  },
  auditLog: [
    { type: 'login', text: 'Agency Owner logged in', ts: new Date().toISOString() },
    { type: 'settings', text: 'CAPI tracking enabled for Prestige Builders', ts: new Date(Date.now() - 3600000).toISOString() },
    { type: 'export', text: 'Exported leads for Sri Balaji Hospitals', ts: new Date(Date.now() - 7200000).toISOString() }
  ],
  agents: [
    { id: 'ag1', name: 'Ravi Sales', role: 'Sales Rep', initials: 'RS', color: '#10b981', avatar: 'https://i.pravatar.cc/150?u=ag1' },
    { id: 'ag2', name: 'Sneha Support', role: 'Support Agent', initials: 'SS', color: '#8b5cf6', avatar: 'https://i.pravatar.cc/150?u=ag2' }
  ]
};

// Polyfill LP.stream so legacy page components don't crash when calling .on()
LP.stream = {
  on: (cb) => {
    return () => {}; // return dummy unsubscribe function
  }
};

// Initialize global data
async function initGlobalData() {
  try {
    const [clients, leads] = await Promise.all([
      LP.api.getClients(),
      LP.api.getLeads()
    ]);
    LP.data.clients = clients;
    LP.data.leads = leads;
    
    // Refresh current page
    const currentModule = LP.router.pageMap[LP.router.current];
    const content = document.getElementById('page-content');
    if (currentModule && content) {
      if (currentModule.renderTable) {
        currentModule.renderTable();
      } else if (currentModule.init) {
        currentModule.init(content);
      }
    }
  } catch (err) {
    console.error("Failed to load initial data", err);
  }
}

// Fetch on load
window.addEventListener('DOMContentLoaded', () => {
  initGlobalData();
  
  // Basic polling simulation for real-time leads until WebSockets
  setInterval(async () => {
    try {
      const prevCount = LP.data.leads.length;
      const leads = await LP.api.getLeads();
      LP.data.leads = leads;
      
      if (leads.length > prevCount) {
        LP.toast.info('New Lead', 'A new lead was received from Meta');
        LP.sidebar.updateBadge();
      }
      
      const currentModule = LP.router.pageMap[LP.router.current];
      if (currentModule && currentModule.renderTable) currentModule.renderTable();
    } catch(e) {}
  }, 15000);
});

// ─── THEME MANAGEMENT ─────────────────────────────────────
LP.theme = (() => {
  function init() {
    const saved = localStorage.getItem('lp_theme');
    if (saved === 'dark') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }

  function toggle() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('lp_theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('lp_theme', 'light');
    }
    updateBtn();
  }

  function updateBtn() {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    btn.innerHTML = isLight 
      ? '<svg viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>'
      : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
    btn.title = isLight ? 'Switch to Dark mode' : 'Switch to Light mode';
  }

  return { init, toggle, updateBtn };
})();

// ─── MOBILE SIDEBAR ───────────────────────────────────────
function openMobileSidebar() {
  const sb = document.getElementById('sidebar');
  sb.classList.add('mobile-open');

  // Overlay
  const ov = document.createElement('div');
  ov.id = 'mobile-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99;backdrop-filter:blur(2px)';
  ov.addEventListener('click', () => {
    sb.classList.remove('mobile-open');
    ov.remove();
  });
  document.body.appendChild(ov);
}

// ─── APP BOOTSTRAP ─────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Init theme
  LP.theme.init();

  // Init sidebar
  LP.sidebar.init();

  // Init toast
  LP.toast.init();

  // Wire topbar buttons
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    LP.theme.updateBtn();
    themeBtn.addEventListener('click', () => {
      LP.theme.toggle();
    });
  }

  const mobileBtn = document.getElementById('mobile-menu-btn');
  if (mobileBtn) {
    mobileBtn.addEventListener('click', openMobileSidebar);
  }

  // Init router (renders first page)
  LP.router.init();

  // Start live lead stream
  LP.stream.start();

  // Welcome toast after brief delay
  setTimeout(() => {
    LP.toast.success('LeadPulse CRM ready', 'Live lead stream active · Mumbai (ap-south-1)');
  }, 1200);

  // Demo: first fake lead after 8s to show real-time
  setTimeout(() => {
    LP.toast.show({
      type: 'lead',
      title: 'New Lead — Priya Krishnan',
      body: '📸 Instagram · Prestige Builders · Anna Nagar Premium Homes · +91 98765 XXXXX',
      duration: 7000,
    });
  }, 8000);
});

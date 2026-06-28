// ============================================================
// FWL CRM — SPA Router & App Bootstrap
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
    if (page === current && currentPageModule) return;

    if (currentPageModule?.destroy) currentPageModule.destroy();
    currentPageModule = null;

    current = page;
    window.location.hash = page;

    const titleEl = document.getElementById('topbar-title');
    if (titleEl) titleEl.textContent = pageTitles[page] || page;

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

    document.title = `${pageTitles[page]} — FWL CRM`;
  }

  function init() {
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

  async function getStats() {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  }

  async function getAgents() {
    const res = await fetch('/api/agents');
    if (!res.ok) throw new Error('Failed to fetch agents');
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

  async function convertLead(id, data) {
    const res = await fetch(`/api/leads/${id}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to convert lead');
    }
    return res.json();
  }

  return { getLeads, getClients, getStats, getAgents, addManualLead, updateLead, addActivity, convertLead };
})();

// ─── GLOBAL DATA STORE ────────────────────────────────────
LP.data = {
  leads: [],
  clients: [],
  stats: null,
  agents: [],
  webhook: {
    url: 'https://fwl-crm.vercel.app/api/webhook',
    token: 'fwl-crm_secure_token_2026',
    verifyToken: 'fwl-crm_secure_token_2026',
    status: 'active',
    lastPing: new Date().toISOString(),
    totalReceived: 0,
  },
  auditLog: [],
};

// LP.stream stub — keeps page components that call .on() from crashing.
// Real-time updates are handled by the 15s poll in initPolling().
LP.stream = {
  on: () => () => {}, // returns a no-op unsubscribe
};

// ─── GLOBAL DATA INIT ─────────────────────────────────────
async function initGlobalData() {
  try {
    const [clients, leads, stats, agents] = await Promise.all([
      LP.api.getClients(),
      LP.api.getLeads(),
      LP.api.getStats().catch(() => null),   // non-fatal if endpoint missing
      LP.api.getAgents().catch(() => []),     // non-fatal if endpoint missing
    ]);

    LP.data.clients = clients;
    LP.data.stats   = stats;
    LP.data.agents  = agents;
    LP.data.leads   = leads.map(l => {
      if (l.assignedTo || typeof l.assigned_to === 'string') {
        const agentId = l.assigned_to || l.assignedTo;
        l.assignedTo = agents.find(a => a.id === agentId) || null;
      }
      return l;
    });

    // Re-render current page with fresh data
    const currentModule = LP.router.pageMap[LP.router.current];
    const content = document.getElementById('page-content');
    if (currentModule && content) {
      if (currentModule.renderTable) {
        currentModule.renderTable();
      } else {
        currentModule.init(content);
      }
    }
  } catch (err) {
    console.error('Failed to load initial data:', err);
  }
}

// ─── POLLING (real-time until WebSockets) ─────────────────
function initPolling() {
  setInterval(async () => {
    try {
      const prevCount = LP.data.leads.length;
      const [leads, stats] = await Promise.all([
        LP.api.getLeads(),
        LP.api.getStats().catch(() => LP.data.stats),
      ]);

      LP.data.leads = leads.map(l => {
        if (typeof l.assignedTo === 'string') {
          l.assignedTo = LP.data.agents.find(a => a.id === l.assignedTo) || null;
        }
        return l;
      });
      LP.data.stats = stats;

      if (leads.length > prevCount) {
        LP.toast.info('New Lead', 'A new lead was received from Meta');
        LP.sidebar.updateBadge();
      }

      const currentModule = LP.router.pageMap[LP.router.current];
      if (currentModule?.renderTable) currentModule.renderTable();
    } catch (e) { /* silent — network blip */ }
  }, 15000);
}

// ─── GLOBAL SEARCH ────────────────────────────────────────
function initGlobalSearch() {
  const input = document.getElementById('global-search');
  if (!input) return;

  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const q = input.value.trim().toLowerCase();
      if (!q) return;

      // Navigate to leads and apply filter
      LP.router.navigate('leads');
      setTimeout(() => {
        const leadsSearchInput = document.getElementById('lead-search');
        if (leadsSearchInput) {
          leadsSearchInput.value = input.value.trim();
          leadsSearchInput.dispatchEvent(new Event('input'));
        }
      }, 200);
    }, 300);
  });
}

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
    btn.innerHTML = LP.icons.get(isLight ? 'moon' : 'sun', 'icon-md');
    btn.title = isLight ? 'Switch to Dark mode' : 'Switch to Light mode';
  }

  return { init, toggle, updateBtn };
})();

// ─── MOBILE SIDEBAR ───────────────────────────────────────
function openMobileSidebar() {
  const sb = document.getElementById('sidebar');
  sb.classList.add('mobile-open');

  const ov = document.createElement('div');
  ov.id = 'mobile-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99;backdrop-filter:blur(2px)';
  ov.addEventListener('click', () => {
    sb.classList.remove('mobile-open');
    ov.remove();
  });
  document.body.appendChild(ov);
}

// ─── APP BOOTSTRAP (single DOMContentLoaded) ──────────────
window.addEventListener('DOMContentLoaded', () => {
  // UI init
  LP.theme.init();
  LP.sidebar.init();
  LP.toast.init();

  // Topbar buttons
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    LP.theme.updateBtn();
    themeBtn.addEventListener('click', LP.theme.toggle);
  }

  const mobileBtn = document.getElementById('mobile-menu-btn');
  if (mobileBtn) mobileBtn.addEventListener('click', openMobileSidebar);

  // Router
  LP.router.init();

  // Global search
  initGlobalSearch();

  // Fetch data, then start polling
  initGlobalData().then(initPolling);

  // Welcome toast
  setTimeout(() => {
    LP.toast.success('FWL CRM ready', 'Live lead stream active · ap-southeast-1');
  }, 1200);
});

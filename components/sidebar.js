// ============================================================
// LeadPulse CRM — Sidebar Component
// ============================================================

window.LP = window.LP || {};

LP.sidebar = (() => {
  const navItems = [
    { id: 'dashboard',    icon: '<svg viewBox="0 0 24 24"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>', label: 'Dashboard',    badge: null },
    { id: 'leads',        icon: '<svg viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>', label: 'Leads',        badge: 'new' },
    { id: 'clients',      icon: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', label: 'Clients',      badge: null },
    { id: 'integrations', icon: '<svg viewBox="0 0 24 24"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>', label: 'Integrations', badge: null },
    { id: 'settings',     icon: '<svg viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>', label: 'Settings',     badge: null },
  ];

  let collapsed = false;

  function render() {
    const newCount = LP.data.leads.filter(l => l.status === 'new').length;

    const activePage = (LP.router && LP.router.current) || 'dashboard';
    const items = navItems.map(item => {
      const badgeCount = item.badge === 'new' ? newCount : null;
      return `
        <li class="nav-item ${activePage === item.id ? 'active' : ''}"
            data-page="${item.id}" role="button" tabindex="0">
          <span class="nav-icon" style="font-style:normal">${item.icon}</span>
          <span class="nav-label">${item.label}</span>
          ${badgeCount ? `<span class="nav-badge">${badgeCount}</span>` : ''}
        </li>
      `;
    }).join('');

    return `
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">
          <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </div>
        <div class="sidebar-logo-text">
          <strong>LeadPulse</strong>
          <span>PERFORMANCE CRM</span>
        </div>
        <button class="sidebar-toggle" id="sidebar-toggle-btn" title="Toggle sidebar">
          <svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
        </button>
      </div>

      <nav class="sidebar-nav">
        <div class="sidebar-section-label">Navigation</div>
        <ul style="padding:0;list-style:none">
          ${items}
        </ul>

        <div class="sidebar-section-label" style="margin-top:16px">Workspace</div>
        <ul style="padding:0;list-style:none">
          <li class="nav-item ${activePage === 'reports' ? 'active' : ''}" data-page="reports" role="button" tabindex="0">
            <span class="nav-icon"><svg viewBox="0 0 24 24"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg></span>
            <span class="nav-label">Reports</span>
          </li>
          <li class="nav-item ${activePage === 'calendar' ? 'active' : ''}" data-page="calendar" role="button" tabindex="0">
            <span class="nav-icon"><svg viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg></span>
            <span class="nav-label">Calendar</span>
          </li>
        </ul>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="user-avatar">AR</div>
          <div class="user-info">
            <div class="user-name">Agency Owner</div>
            <div class="user-role">Owner · Chennai</div>
          </div>
        </div>
      </div>
    `;
  }

  function init() {
    const el = document.getElementById('sidebar');
    if (!el) return;
    el.innerHTML = render();
    attachEvents();
  }

  function attachEvents() {
    const el = document.getElementById('sidebar');
    if (!el) return;

    // Nav items
    el.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        LP.router.navigate(page);
        // Close mobile menu
        el.classList.remove('mobile-open');
        document.getElementById('mobile-overlay')?.remove();
      });
      item.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') item.click();
      });
    });

    // Toggle
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggleCollapse);
    }
  }

  function toggleCollapse() {
    const el = document.getElementById('sidebar');
    const main = document.getElementById('main-content');
    const btn = document.getElementById('sidebar-toggle-btn');
    collapsed = !collapsed;
    el.classList.toggle('collapsed', collapsed);
    main.classList.toggle('sidebar-collapsed', collapsed);
    if (btn) {
        btn.innerHTML = collapsed ? '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>' : '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>';
    }
  }

  function updateActive(page) {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });
  }

  function updateBadge() {
    const newCount = LP.data.leads.filter(l => l.status === 'new').length;
    const badge = document.querySelector('.nav-item[data-page="leads"] .nav-badge');
    if (badge) badge.textContent = newCount;
  }

  return { init, updateActive, updateBadge, toggleCollapse };
})();

// ============================================================
// LeadPulse CRM — Sidebar Component
// ============================================================

window.LP = window.LP || {};

LP.sidebar = (() => {
  const navItems = [
    { id: 'dashboard',    icon: 'dashboard',    label: 'Dashboard',    badge: null },
    { id: 'leads',        icon: 'inbox',        label: 'Leads',        badge: 'new' },
    { id: 'clients',      icon: 'briefcase',    label: 'Clients',      badge: null },
    { id: 'integrations', icon: 'plug',         label: 'Integrations', badge: null },
    { id: 'team',         icon: 'users',        label: 'Team',         badge: null },
    { id: 'settings',     icon: 'settings',     label: 'Settings',     badge: null },
  ];

  let collapsed = false;

  function render() {
    const newCount = LP.data?.leads ? LP.data.leads.filter(l => l.status === 'new').length : 0;
    const activePage = (LP.router && LP.router.current) || 'dashboard';
    const { get } = LP.icons;

    const items = navItems.map(item => {
      const badgeCount = item.badge === 'new' && newCount > 0 ? newCount : null;
      return `
        <li class="nav-item ${activePage === item.id ? 'active' : ''}"
            data-page="${item.id}" role="button" tabindex="0">
          <span class="nav-icon">${get(item.icon, 'icon-md')}</span>
          <span class="nav-label">${item.label}</span>
          ${badgeCount ? `<span class="nav-badge tabular-nums">${badgeCount}</span>` : ''}
        </li>
      `;
    }).join('');

    return `
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">
          ${get('activity', 'icon-md')}
        </div>
        <div class="sidebar-logo-text">
          <strong>LeadPulse</strong>
          <span>PERFORMANCE CRM</span>
        </div>
        <button class="sidebar-toggle" id="sidebar-toggle-btn" title="Toggle sidebar">
          ${get(collapsed ? 'chevron-right' : 'chevron-left', 'icon-sm')}
        </button>
      </div>

      <nav class="sidebar-nav">
        <div class="sidebar-section-label">Navigation</div>
        <ul style="padding:0;list-style:none;margin:0">
          ${items}
        </ul>

        <div class="sidebar-section-label" style="margin-top:16px">Workspace</div>
        <ul style="padding:0;list-style:none;margin:0">
          <li class="nav-item ${activePage === 'reports' ? 'active' : ''}" data-page="reports" role="button" tabindex="0">
            <span class="nav-icon">${get('bar-chart-3', 'icon-md')}</span>
            <span class="nav-label">Reports</span>
          </li>
          <li class="nav-item ${activePage === 'calendar' ? 'active' : ''}" data-page="calendar" role="button" tabindex="0">
            <span class="nav-icon">${get('calendar', 'icon-md')}</span>
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
      btn.innerHTML = LP.icons.get(collapsed ? 'chevron-right' : 'chevron-left', 'icon-sm');
    }
  }

  function updateActive(page) {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });
  }

  function updateBadge() {
    const newCount = LP.data?.leads ? LP.data.leads.filter(l => l.status === 'new').length : 0;
    const badge = document.querySelector('.nav-item[data-page="leads"] .nav-badge');
    if (badge) {
      badge.textContent = newCount;
      badge.style.display = newCount > 0 ? 'inline-flex' : 'none';
    }
  }

  return { init, updateActive, updateBadge, toggleCollapse };
})();

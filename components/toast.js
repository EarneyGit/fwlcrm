// ============================================================
// LeadPulse CRM — Toast Notification System
// ============================================================

window.LP = window.LP || {};

LP.toast = (() => {
  let container;

  function init() {
    container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
  }

  function show({ type = 'lead', title, body, duration = 4000 }) {
    if (!container) init();

    const icons = {
      lead:    LP.icons.get('users', 'icon-md'),
      success: LP.icons.get('check-circle-2', 'icon-md'),
      warning: LP.icons.get('alert-circle', 'icon-md'),
      danger:  LP.icons.get('x-circle', 'icon-md'),
      info:    LP.icons.get('circle-dot', 'icon-md'),
    };

    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `
      <div class="toast-icon ${type}">${icons[type] || icons.lead}</div>
      <div style="flex:1;min-width:0">
        <div class="toast-title">${title}</div>
        ${body ? `<div class="toast-body">${body}</div>` : ''}
      </div>
      <button class="toast-close">×</button>
    `;

    el.querySelector('.toast-close').addEventListener('click', () => dismiss(el));
    container.appendChild(el);

    // Auto-dismiss
    const t = setTimeout(() => dismiss(el), duration);
    el._timer = t;

    return el;
  }

  function dismiss(el) {
    clearTimeout(el._timer);
    el.classList.add('out');
    setTimeout(() => el.remove(), 350);
  }

  function newLead(lead) {
    const sourceLabel = lead.source === 'instagram' ? '📸 Instagram' : '📘 Facebook';
    show({
      type: 'lead',
      title: `New Lead — ${lead.name}`,
      body: `${sourceLabel} · ${lead.clientName} · ${lead.phone}`,
      duration: 6000,
    });
  }

  function slaAlert(name) {
    show({
      type: 'warning',
      title: 'SLA Breach — Lead uncontacted!',
      body: `${name} has been waiting over 15 minutes`,
      duration: 8000,
    });
  }

  function success(title, body) { show({ type: 'success', title, body }); }
  function warning(title, body) { show({ type: 'warning', title, body }); }
  function info(title, body)    { show({ type: 'info',    title, body }); }

  return { init, show, newLead, slaAlert, success, warning, info };
})();

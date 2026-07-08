// ============================================================
// FWL CRM — Clients Page
// Multi-tenant client grid with token health indicators
// ============================================================

window.LP = window.LP || {};
LP.pages = LP.pages || {};

LP.pages.clients = (() => {
  function tokenHealth(client) {
    if (client.status === 'error') return {
      color: 'var(--danger)', label: 'Token Expired', dot: '#EF4444', action: 'Reconnect',
    };
    if (client.tokenDays <= 10) return {
      color: 'var(--warning)', label: `Expires in ${client.tokenDays} days`, dot: '#F59E0B', action: 'Refresh',
    };
    return {
      color: 'var(--success)', label: `${client.tokenDays} days remaining`, dot: '#10B981', action: null,
    };
  }

  function renderClientCard(c) {
    const health = tokenHealth(c);
    const leads = LP.data.leads.filter(l => l.clientId === c.id);
    const newCount = leads.filter(l => l.status === 'new').length;

    return `
      <div class="client-card" data-client-id="${c.id}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
          <div class="client-logo" style="background:linear-gradient(135deg,${c.color},${c.color}99)">
            ${c.icon}
          </div>
          <div style="text-align:right">
            ${newCount > 0
              ? `<span class="badge badge-new" style="font-size:10px">${newCount} new</span>`
              : '<span class="badge badge-success" style="font-size:10px">Up to date</span>'
            }
          </div>
        </div>
        <div class="client-name">${c.name}</div>
        <div class="client-industry">${c.industry} · ${c.city}</div>

        <div class="client-stats">
          <div>
            <div class="client-stat-value tabular-nums" style="color:${c.color}">${LP.utils.formatNumber(c.leadsToday)}</div>
            <div class="client-stat-label">Leads Today</div>
          </div>
          <div>
            <div class="client-stat-value tabular-nums">${LP.utils.formatCurrency(c.cpl)}</div>
            <div class="client-stat-label">Avg CPL</div>
          </div>
          <div>
            <div class="client-stat-value tabular-nums">${LP.utils.formatPercent(c.convRate)}</div>
            <div class="client-stat-label">Conv. Rate</div>
          </div>
          <div>
            <div class="client-stat-value tabular-nums">${LP.utils.formatNumber(c.forms)}</div>
            <div class="client-stat-label">Active Forms</div>
          </div>
        </div>

        <div class="token-health" style="color:${health.color}">
          <div class="dot" style="background:${health.dot}"></div>
          <span style="font-size:11px">${health.label}</span>
          ${health.action
            ? `<button class="btn btn-sm" style="margin-left:auto;padding:3px 8px;font-size:10px;background:rgba(239,68,68,0.12);color:var(--danger);border:1px solid rgba(239,68,68,0.2)"
                onclick="event.stopPropagation();LP.toast.info('Redirecting to Meta OAuth...','Please re-authenticate ${c.name}')">
                ${health.action}
               </button>`
            : ''
          }
        </div>

        <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" style="font-size:11px;padding:4px 8px;display:flex;align-items:center;gap:4px"
            onclick="event.stopPropagation();LP.toast.success('Sync started','Fetching latest leads from Meta Graph API for ${c.name}')">
            ${LP.icons.get('refresh-cw', 'icon-sm')} Sync Leads
          </button>
          <button class="btn btn-ghost btn-sm" style="font-size:11px;padding:4px 8px;display:flex;align-items:center;gap:4px"
            onclick="event.stopPropagation();LP.router.navigate('leads')">
            ${LP.icons.get('inbox', 'icon-sm')} View Leads
          </button>
          <button class="btn btn-ghost btn-sm" style="font-size:11px;padding:4px 8px;display:flex;align-items:center;gap:4px"
            onclick="event.stopPropagation();showClientSettings('${c.id}')">
            ${LP.icons.get('settings', 'icon-sm')} Settings
          </button>
        </div>
      </div>
    `;
  }

  function showAddClientModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-title">Add New Client</div>
        <div class="modal-subtitle">Connect a new client's Meta Ad Account to FWL CRM</div>

        <div class="form-group">
          <label class="form-label">Business Name</label>
          <input class="form-input" id="nc-name" placeholder="e.g. Prestige Builders">
        </div>
        <div class="form-group">
          <label class="form-label">Industry</label>
          <select class="form-select" id="nc-industry">
            <option>Real Estate</option>
            <option>Education</option>
            <option>Healthcare</option>
            <option>BFSI</option>
            <option>E-commerce</option>
            <option>Automobile</option>
            <option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">City</label>
          <select class="form-select" id="nc-city">
            <option>Chennai</option>
            <option>Coimbatore</option>
            <option>Madurai</option>
            <option>Trichy</option>
            <option>Salem</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Meta Ad Account ID</label>
          <input class="form-input" id="nc-account" placeholder="act_XXXXXXXXXX">
        </div>

        <div style="background:rgba(24,119,242,0.08);border:1px solid rgba(24,119,242,0.2);border-radius:8px;padding:12px;font-size:12px;color:var(--text-2);margin-bottom:16px;display:flex;align-items:flex-start;gap:8px">
          ${LP.icons.get('circle-dot', 'icon-sm')}
          <div>After adding, you'll be redirected to Meta OAuth to grant <strong>leads_retrieval</strong> permission for this account.</div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-ghost" id="nc-cancel">Cancel</button>
          <button class="btn btn-primary" id="nc-save">Add & Connect →</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#nc-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#nc-save').addEventListener('click', () => {
      const name     = overlay.querySelector('#nc-name').value.trim();
      const industry = overlay.querySelector('#nc-industry').value;
      const city     = overlay.querySelector('#nc-city').value;
      const account  = overlay.querySelector('#nc-account').value.trim();
      if (!name) { LP.toast.warning('Enter business name', ''); return; }
      const colors = ['#1877F2','#6C47FF','#10B981','#F59E0B','#EF4444','#0EA5E9'];
      const icons  = [LP.icons.get('building', 'icon-md'), LP.icons.get('briefcase', 'icon-md')];
      LP.data.clients.push({
        id: `c${Date.now()}`, name, industry, city,
        color: colors[Math.floor(Math.random()*colors.length)],
        icon: icons[Math.floor(Math.random()*icons.length)],
        accountId: account || 'act_pending',
        forms: 0, tokenDays: 0, status: 'error',
        leadsToday: 0, cpl: 0, convRate: 0, totalLeads: 0, campaigns: 0,
      });
      overlay.remove();
      LP.toast.success('Client added!', `${name} — completing Meta OAuth...`);
      // Re-render
      document.getElementById('clients-grid').innerHTML =
        LP.data.clients.map(renderClientCard).join('');
      attachCardEvents();
    });
  }

  function showClientSettings(clientId) {
    const c = LP.data.clients.find(x => x.id === clientId);
    if (!c) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:520px">
        <div class="modal-title">${c.icon} ${c.name}</div>
        <div class="modal-subtitle">Client settings & integrations</div>

        <div style="margin-bottom:16px">
          <div class="drawer-section-title">Meta Configuration</div>
          <div class="detail-row">
            <div class="detail-label">Ad Account</div>
            <div class="detail-value mono">${c.accountId}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Active Forms</div>
            <div class="detail-value">${c.forms}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Token Status</div>
            <div class="detail-value">
              <span class="badge badge-${c.status === 'connected' ? 'success' : c.status === 'warning' ? 'warning' : 'danger'}">
                ${c.status === 'connected' ? '● Connected' : c.status === 'warning' ? '⚠ Expiring' : '✕ Expired'}
              </span>
            </div>
          </div>
        </div>

        <div style="margin-bottom:16px">
          <div class="drawer-section-title">Automation Settings</div>
          ${[
            { label: 'Auto WhatsApp on new lead', on: true },
            { label: 'Round-robin assignment', on: true },
            { label: 'Push to Zoho CRM', on: false },
            { label: 'Meta CAPI feedback', on: true },
            { label: 'SLA alerts (15 min)', on: true },
          ].map(s => `
            <div class="capi-row">
              <span style="font-size:13px">${s.label}</span>
              <div class="toggle ${s.on ? 'on' : ''}" onclick="this.classList.toggle('on');LP.toast.info('Setting updated','')"></div>
            </div>
          `).join('')}
        </div>

        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Close</button>
          <button class="btn btn-primary" onclick="LP.toast.success('Settings saved','');this.closest('.modal-overlay').remove()">Save Changes</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  }

  window.showClientSettings = showClientSettings;

  function attachCardEvents() {
    document.querySelectorAll('.client-card[data-client-id]').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        showClientSettings(card.dataset.clientId);
      });
    });
  }

  function render() {
    const totalLeads = LP.data.clients.reduce((s, c) => s + c.leadsToday, 0);
    const connected  = LP.data.clients.filter(c => c.status === 'connected').length;
    const avgCPL     = Math.round(LP.data.clients.reduce((s,c) => s + c.cpl, 0) / LP.data.clients.length);

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Clients</h1>
          <div class="page-subtitle">${LP.data.clients.length} clients · ${connected} connected · ${totalLeads} leads today</div>
        </div>
        <button class="btn btn-primary" id="add-client-btn">+ Add Client</button>
      </div>

      <!-- Summary row -->
      <div class="kpi-grid stagger" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:24px">
        <div class="kpi-card" style="--kpi-color:#1877F2;--kpi-icon-bg:rgba(24,119,242,0.12)">
          <div class="kpi-icon" style="color:#1877F2">${LP.icons.get('building', 'icon-md')}</div>
          <div class="kpi-value tabular-nums">${LP.utils.formatNumber(LP.data.clients.length)}</div>
          <div class="kpi-label">Total Clients</div>
        </div>
        <div class="kpi-card" style="--kpi-color:#10B981;--kpi-icon-bg:rgba(16,185,129,0.12)">
          <div class="kpi-icon" style="color:#10B981">${LP.icons.get('plug', 'icon-md')}</div>
          <div class="kpi-value tabular-nums">${LP.utils.formatNumber(connected)}</div>
          <div class="kpi-label">Connected</div>
        </div>
        <div class="kpi-card" style="--kpi-color:#F59E0B;--kpi-icon-bg:rgba(245,158,11,0.12)">
          <div class="kpi-icon" style="color:#F59E0B">${LP.icons.get('activity', 'icon-md')}</div>
          <div class="kpi-value tabular-nums">${LP.utils.formatNumber(totalLeads)}</div>
          <div class="kpi-label">Leads Today</div>
        </div>
        <div class="kpi-card" style="--kpi-color:#6C47FF;--kpi-icon-bg:rgba(108,71,255,0.12)">
          <div class="kpi-icon" style="color:#6C47FF">${LP.icons.get('badge-indian-rupee', 'icon-md')}</div>
          <div class="kpi-value tabular-nums">${LP.utils.formatCurrency(avgCPL)}</div>
          <div class="kpi-label">Avg CPL</div>
        </div>
      </div>

      <!-- Client grid -->
      <div class="grid-auto" id="clients-grid">
        ${LP.data.clients.map(renderClientCard).join('')}
      </div>
    `;
  }

  function init(container) {
    container.innerHTML = render();
    container.classList.add('fade-in');

    document.getElementById('add-client-btn')?.addEventListener('click', showAddClientModal);
    attachCardEvents();
  }

  function destroy() {}

  return { render, init, destroy };
})();

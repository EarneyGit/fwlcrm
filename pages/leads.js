// ============================================================
// FWL CRM CRM — Leads Inbox Page
// Gmail-style table with filters, search, and drawer
// ============================================================

window.LP = window.LP || {};
LP.pages = LP.pages || {};

LP.pages.leads = (() => {
  let currentFilter = 'all';
  let currentSearch = '';
  let currentClient = 'all';
  let streamUnsub   = null;

  const statuses = ['all','new','contacted','qualified','converted','lost','nurture'];

  function timeAgo(isoStr) {
    const diff = Math.floor((Date.now() - new Date(isoStr)) / 1000);
    if (diff < 60)   return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  }

  function sourceBadge(source) {
    if (source === 'instagram') return '<span class="badge badge-ig">IG</span>';
    return '<span class="badge badge-fb">FB</span>';
  }

  function statusBadge(status) {
    if (status === 'converted') {
      return `<span class="badge badge-won">Converted ✓</span>`;
    }
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    return `<span class="badge badge-${status}">${label}</span>`;
  }

  function filteredLeads() {
    return LP.data.leads.filter(l => {
      const matchStatus = currentFilter === 'all' || l.status === currentFilter;
      const matchClient = currentClient === 'all' || l.clientId === currentClient;
      const q = currentSearch.toLowerCase();
      const matchSearch = !q ||
        l.name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.campaign.toLowerCase().includes(q) ||
        l.clientName.toLowerCase().includes(q);
      return matchStatus && matchClient && matchSearch;
    });
  }

  function countByStatus(s) {
    if (s === 'all') return LP.data.leads.length;
    return LP.data.leads.filter(l => l.status === s).length;
  }

  function renderTableRows(leads) {
    if (!leads.length) return `
      <tr><td colspan="8">
        <div class="empty-state">
          ${LP.icons.get('search', 'icon-lg')}
          <div style="margin-top:12px;font-weight:500;color:var(--text-1)">No leads found</div>
          <div style="margin-top:4px;font-size:13px;color:var(--text-3)">Try adjusting your filters or search query</div>
        </div>
      </td></tr>
    `;

    return leads.map(lead => `
      <tr class="lead-row" data-lead-id="${lead.id}" style="${lead.slaBreached ? 'background:rgba(239,68,68,0.04)' : ''}">
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,${lead.avatarColor},#6C47FF);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;flex-shrink:0">${lead.initials}</div>
            <div>
              <div class="lead-name">${lead.name}${lead.slaBreached ? ' <span style="color:var(--danger);font-size:10px">⚠ SLA</span>' : ''}</div>
              <div class="lead-phone">${lead.phone}</div>
            </div>
          </div>
        </td>
        <td>${sourceBadge(lead.source)}</td>
        <td>
          <div style="font-size:12px;max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-2)">${lead.campaign}</div>
          <div style="font-size:11px;color:var(--text-3);margin-top:2px">${lead.clientName}</div>
        </td>
        <td>
          ${statusBadge(lead.status)}
          ${lead.convertedAt ? `<div style="font-size:11px;color:var(--success);margin-top:2px;font-weight:600">₹${LP.utils.formatNumber(lead.conversionValue)}</div>` : ''}
        </td>
        <td>
          ${(() => {
            const agentId = lead.assignedTo?.id || lead.assignedTo;
            const agent = LP.data.agents.find(a => a.id === agentId);
            return agent
              ? `<div style="display:flex;align-items:center;gap:6px">
                  <div style="width:22px;height:22px;border-radius:50%;background:${agent.color};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:white">${agent.initials}</div>
                  <span style="font-size:12px">${agent.name.split(' ')[0]}</span>
                 </div>`
              : '<span style="color:var(--text-3);font-size:12px">Unassigned</span>';
          })()}
        </td>
        <td>
          <div style="font-size:12px;color:var(--text-2)">${lead.city}</div>
        </td>
        <td>
          <div style="font-size:12px;color:var(--text-2)">${LP.utils.formatRelativeTime(lead.createdAt)}</div>
        </td>
        <td onclick="event.stopPropagation()">
          <div style="display:flex;gap:4px">
            <button class="btn btn-success btn-sm" style="padding:4px 8px;font-size:11px"
              onclick="LP.toast.success('WhatsApp sent!','Template dispatched via Cloud API')">
              ${LP.icons.get('message-circle', 'icon-sm')}
            </button>
            <button class="btn btn-secondary btn-sm" style="padding:4px 8px;font-size:11px"
              onclick="LP.toast.info('Exotel calling...','Connecting to ${lead.phone}')">
              ${LP.icons.get('phone', 'icon-sm')}
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function renderTable() {
    const leads = filteredLeads();
    const tbody = document.getElementById('leads-tbody');
    if (tbody) tbody.innerHTML = renderTableRows(leads);

    const countEl = document.getElementById('leads-count');
    if (countEl) countEl.textContent = `${leads.length} lead${leads.length !== 1 ? 's' : ''}`;
  }

  function render() {
    const clientOptions = LP.data.clients.map(c =>
      `<option value="${c.id}">${c.name}</option>`
    ).join('');

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Leads Inbox</h1>
          <div class="page-subtitle">All leads from Facebook & Instagram Lead Ads</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" id="export-btn" style="display:flex;align-items:center;gap:4px">
            ${LP.icons.get('database', 'icon-sm')} Export CSV
          </button>
          <button class="btn btn-primary btn-sm" id="add-lead-btn" style="display:flex;align-items:center;gap:4px">
            ${LP.icons.get('plus', 'icon-sm')} Add Manual Lead
          </button>
        </div>
      </div>

      <!-- Filters row -->
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
        <!-- Status tabs -->
        <div class="tabs" id="status-tabs">
          ${statuses.map(s => `
            <button class="tab-btn ${s === currentFilter ? 'active' : ''}" data-status="${s}">
              ${s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              <span class="tab-count">${countByStatus(s)}</span>
            </button>
          `).join('')}
        </div>

        <!-- Client filter -->
        <select class="form-select" id="client-filter" style="width:180px;padding:6px 28px 6px 10px;font-size:12px">
          <option value="all">All Clients</option>
          ${clientOptions}
        </select>

        <!-- Search -->
        <div class="topbar-search" style="width:220px;position:relative">
          <div style="position:absolute;left:10px;top:50%;transform:translateY(-50%);display:flex;color:var(--text-3)">
            ${LP.icons.get('search', 'icon-sm')}
          </div>
          <input type="text" id="lead-search" placeholder="Search leads..." value="${currentSearch}" style="padding-left:32px">
        </div>
      </div>

      <!-- Table -->
      <div class="table-wrap">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--border)">
          <span style="font-size:12px;color:var(--text-3)" id="leads-count"></span>
          <div style="display:flex;gap:6px;align-items:center">
            <button class="btn btn-ghost btn-sm" id="bulk-wa-btn" style="display:flex;align-items:center;gap:4px">
              ${LP.icons.get('message-circle', 'icon-sm')} Bulk WhatsApp
            </button>
            <select class="form-select" style="width:140px;padding:5px 28px 5px 10px;font-size:12px" id="sort-sel">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="status">By Status</option>
            </select>
          </div>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Source</th>
              <th>Campaign</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th>City</th>
              <th>Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="leads-tbody">
          </tbody>
        </table>
      </div>
    `;
  }

  function attachEvents() {
    // Status tabs
    document.getElementById('status-tabs')?.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentFilter = btn.dataset.status;
        document.querySelectorAll('#status-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderTable();
      });
    });

    // Client filter
    document.getElementById('client-filter')?.addEventListener('change', e => {
      currentClient = e.target.value;
      renderTable();
    });

    // Search
    let searchDebounce;
    document.getElementById('lead-search')?.addEventListener('input', e => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        currentSearch = e.target.value;
        renderTable();
      }, 250);
    });

    // Sort
    document.getElementById('sort-sel')?.addEventListener('change', e => {
      const val = e.target.value;
      if (val === 'newest') LP.data.leads.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      if (val === 'oldest') LP.data.leads.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
      if (val === 'status') {
        const order = ['new','contacted','qualified','converted','lost','nurture'];
        LP.data.leads.sort((a,b) => order.indexOf(a.status) - order.indexOf(b.status));
      }
      renderTable();
    });

    // Row click → drawer
    document.getElementById('leads-tbody')?.addEventListener('click', e => {
      const row = e.target.closest('.lead-row');
      if (!row) return;
      const lead = LP.data.leads.find(l => l.id === row.dataset.leadId);
      if (lead) LP.drawer.open(lead);
    });

    // Export CSV
    document.getElementById('export-btn')?.addEventListener('click', () => {
      const leads = filteredLeads();
      const csv = [
        ['Name','Phone','Email','Status','Source','Campaign','Client','City','Received'].join(','),
        ...leads.map(l => [
          `"${l.name}"`,l.phone,l.email,l.status,l.source,`"${l.campaign}"`,`"${l.clientName}"`,l.city,l.createdAt
        ].join(',')),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `fwl-crm_leads_${Date.now()}.csv`;
      a.click(); URL.revokeObjectURL(url);
      LP.toast.success('CSV exported!', `${leads.length} leads downloaded`);
    });

    // Add manual lead
    document.getElementById('add-lead-btn')?.addEventListener('click', () => {
      showAddLeadModal();
    });

    // Bulk WhatsApp
    document.getElementById('bulk-wa-btn')?.addEventListener('click', () => {
      const count = filteredLeads().filter(l => l.status === 'new').length;
      LP.toast.success(`Bulk WhatsApp queued!`, `${count} new leads will receive template message`);
    });
  }

  function showAddLeadModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-title">Add Manual Lead</div>
        <div class="modal-subtitle">Manually add a lead not captured via Meta</div>
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input class="form-input" id="ml-name" placeholder="e.g. Priya Kumar">
        </div>
        <div class="form-group">
          <label class="form-label">Phone (+91)</label>
          <input class="form-input" id="ml-phone" placeholder="+91 98765 43210">
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" id="ml-email" placeholder="priya@gmail.com">
        </div>
        <div class="form-group">
          <label class="form-label">Client</label>
          <select class="form-select" id="ml-client">
            ${LP.data.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="ml-cancel">Cancel</button>
          <button class="btn btn-primary" id="ml-save">Add Lead</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#ml-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#ml-save').addEventListener('click', async () => {
      const name   = overlay.querySelector('#ml-name').value.trim();
      const phone  = overlay.querySelector('#ml-phone').value.trim();
      const email  = overlay.querySelector('#ml-email').value.trim();
      const cid    = overlay.querySelector('#ml-client').value;
      if (!name || !phone) { LP.toast.warning('Missing fields', 'Name and phone are required'); return; }
      
      const btn = overlay.querySelector('#ml-save');
      btn.textContent = 'Saving...';
      btn.disabled = true;

      try {
        await LP.api.addManualLead({ name, phone, email, clientId: cid });
        // Refresh leads from API
        LP.data.leads = await LP.api.getLeads();
        renderTable();
        overlay.remove();
        LP.toast.success('Lead added!', `${name} added successfully`);
        LP.sidebar.updateBadge();
      } catch (err) {
        btn.textContent = 'Add Lead';
        btn.disabled = false;
        LP.toast.warning('Error', 'Failed to add manual lead');
      }
    });
  }

  function init(container) {
    container.innerHTML = render();
    container.classList.add('fade-in');
    attachEvents();
    renderTable();

    // Live updates
    streamUnsub = LP.stream.on(() => {
      // Refresh counts in tabs
      document.querySelectorAll('#status-tabs .tab-count').forEach((el, i) => {
        el.textContent = countByStatus(statuses[i]);
      });
      // Refresh table if showing 'all' or 'new'
      if (currentFilter === 'all' || currentFilter === 'new') renderTable();
      LP.sidebar.updateBadge();
    });
  }

  function destroy() {
    if (streamUnsub) streamUnsub();
    streamUnsub = null;
  }

  return { render, init, destroy };
})();

// ============================================================
// FWL CRM CRM — Lead Detail Drawer Component
// ============================================================

window.LP = window.LP || {};

LP.drawer = (() => {
  let currentLead = null;

  const statusOptions = [
    { key: 'new',       label: 'New' },
    { key: 'contacted', label: 'Contacted' },
    { key: 'qualified', label: 'Qualified' },
    { key: 'converted', label: 'Converted ✓' },
    { key: 'lost',      label: 'Lost ✕' },
    { key: 'nurture',   label: 'Nurture' },
  ];

  function formatTs(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  function sourceBadge(source) {
    if (source === 'instagram') return '<span class="badge badge-ig">IG</span>';
    return '<span class="badge badge-fb">FB</span>';
  }

  function statusBadge(status) {
    if (!status) return '';
    return `<span class="badge badge-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
  }

  function renderActivities(activities) {
    if (!activities || !activities.length) return `
      <div class="empty-state" style="padding:16px;border:none;background:var(--surface-3)">
        ${LP.icons.get('clock', 'icon-md')}
        <div style="margin-top:8px;font-size:12px;color:var(--text-3)">No activity yet</div>
      </div>
    `;
    return activities.map(act => `
      <div class="activity-item">
        <div class="activity-dot"></div>
        <div>
          <div class="activity-text"><strong>${act.user}</strong> — ${act.text}</div>
          <div class="activity-time">${formatTs(act.ts)}</div>
        </div>
      </div>
    `).join('');
  }

  function renderFieldData(fieldData) {
    if (!fieldData || Object.keys(fieldData).length === 0) return `
      <div class="empty-state" style="padding:16px;border:none;background:var(--surface-3)">
        ${LP.icons.get('database', 'icon-md')}
        <div style="margin-top:8px;font-size:12px;color:var(--text-3)">No form data captured</div>
      </div>
    `;
    return Object.entries(fieldData).map(([k, v]) => `
      <div class="detail-row">
        <div class="detail-label">${k}</div>
        <div class="detail-value">${v}</div>
      </div>
    `).join('');
  }

  function render(lead) {
    const statusOpts = statusOptions.map(s => `
      <button class="status-opt ${lead.status === s.key ? `active-${s.key}` : ''}"
              data-status="${s.key}">${s.label}</button>
    `).join('');

    const { get } = LP.icons;

    return `
      <div class="drawer-header">
        <div class="drawer-avatar" style="background:linear-gradient(135deg,${lead.avatarColor},#6C47FF)">
          ${lead.initials}
        </div>
        <div style="flex:1;min-width:0">
          <div class="drawer-lead-name">${lead.name}</div>
          <div class="drawer-lead-meta" style="display:flex;align-items:center;gap:8px;margin-top:4px">
            ${sourceBadge(lead.source)}
            ${statusBadge(lead.status)}
            <span style="color:var(--text-3);font-size:11px">${LP.utils.formatRelativeTime(lead.createdAt)}</span>
          </div>
        </div>
        <button class="drawer-close" id="drawer-close-btn" style="background:transparent;border:none;color:var(--text-2);cursor:pointer;display:flex;align-items:center;justify-content:center">
          ${get('x-circle', 'icon-lg')}
        </button>
      </div>

      <div class="drawer-body">
        <!-- CONTACT ACTIONS -->
        <div class="drawer-section">
          <div class="drawer-section-title">Quick Actions</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-success btn-sm" id="wa-btn" style="display:flex;align-items:center;gap:4px">
              ${get('message-circle', 'icon-sm')} WhatsApp
            </button>
            <button class="btn btn-secondary btn-sm" id="call-btn" style="display:flex;align-items:center;gap:4px">
              ${get('phone', 'icon-sm')} Call Exotel
            </button>
            <button class="btn btn-ghost btn-sm" id="zoho-btn" style="display:flex;align-items:center;gap:4px">
              ${get('database', 'icon-sm')} Push to Zoho
            </button>
          </div>
        </div>

        <!-- STATUS -->
        <div class="drawer-section">
          <div class="drawer-section-title">Status Pipeline</div>
          <div class="status-select-row" id="status-opts">
            ${statusOpts}
          </div>
        </div>

        <!-- LEAD INFO -->
        <div class="drawer-section">
          <div class="drawer-section-title">Contact Details</div>
          <div class="detail-row">
            <div class="detail-label">Phone</div>
            <div class="detail-value mono">${lead.phone || '—'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Email</div>
            <div class="detail-value" style="font-size:12px">${lead.email || '—'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">City</div>
            <div class="detail-value">${lead.city || '—'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Client</div>
            <div class="detail-value">${lead.clientName || '—'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Campaign</div>
            <div class="detail-value" style="font-size:12px">${lead.campaign || '—'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Ad ID</div>
            <div class="detail-value mono text-faint">${lead.adId || '—'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Lead ID</div>
            <div class="detail-value mono text-faint" style="font-size:11px">${lead.leadgenId || '—'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Received</div>
            <div class="detail-value" style="font-size:12px">${formatTs(lead.createdAt)}</div>
          </div>
          ${lead.convertedAt ? `
          <div class="detail-row">
            <div class="detail-label">Converted</div>
            <div class="detail-value" style="font-size:12px">${formatTs(lead.convertedAt)} <strong style="color:var(--success)">(${LP.utils.formatCurrency(lead.conversionValue)})</strong></div>
          </div>` : ''}
        </div>

        <!-- FORM DATA -->
        <div class="drawer-section">
          <div class="drawer-section-title">Form Responses (Meta field_data)</div>
          ${renderFieldData(lead.fieldData)}
        </div>

        <!-- ASSIGN -->
        <div class="drawer-section">
          <div class="drawer-section-title">Assignment</div>
          <div style="display:flex;align-items:center;gap:10px">
            <select class="form-select" id="assign-select" style="flex:1">
              <option value="">— Unassigned —</option>
              ${(LP.data.agents || []).map(a => `
                <option value="${a.id}" ${(lead.assignedTo?.id || lead.assignedTo) === a.id ? 'selected' : ''}>
                  ${a.name} (${a.role})
                </option>
              `).join('')}
            </select>
            <button class="btn btn-secondary btn-sm" id="assign-btn">Assign</button>
          </div>
        </div>

        <!-- NOTES -->
        <div class="drawer-section">
          <div class="drawer-section-title">Notes</div>
          <textarea class="form-input" id="lead-note" rows="3"
            placeholder="Add a note about this lead..."
            style="resize:none;font-size:13px"></textarea>
          <button class="btn btn-ghost btn-sm" style="margin-top:8px" id="save-note-btn">
            Save Note
          </button>
        </div>

        <!-- ACTIVITY LOG -->
        <div class="drawer-section">
          <div class="drawer-section-title">Activity Timeline</div>
          <div id="activity-log">
            ${renderActivities(lead.activities)}
          </div>
        </div>
      </div>

      <div class="drawer-actions">
        ${lead.status !== 'converted' ? `
        <button class="btn btn-primary" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px" id="convert-lead-btn">
          ${get('check-circle', 'icon-sm') || '✓'} Mark Converted
        </button>
        ` : ''}
        <button class="btn btn-secondary" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px" id="capi-push-btn">
          ${get('refresh-cw', 'icon-sm')} Push to Meta CAPI
        </button>
        <button class="btn btn-ghost btn-icon" id="delete-lead-btn" title="Delete lead" style="display:flex;align-items:center;justify-content:center">
          ${get('trash-2', 'icon-md')}
        </button>
      </div>
    `;
  }

  function open(lead) {
    currentLead = lead;
    const overlay = document.getElementById('lead-drawer-overlay');
    const drawer  = document.getElementById('lead-drawer');

    drawer.innerHTML = render(lead);
    overlay.classList.add('open');
    drawer.classList.add('open');

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    attachDrawerEvents(lead);
  }

  function close() {
    const overlay = document.getElementById('lead-drawer-overlay');
    const drawer  = document.getElementById('lead-drawer');
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    document.body.style.overflow = '';
    currentLead = null;
  }

  function attachDrawerEvents(lead) {
    // Close
    document.getElementById('drawer-close-btn')?.addEventListener('click', close);
    document.getElementById('lead-drawer-overlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) close();
    });

    // Status change
    document.querySelectorAll('#status-opts .status-opt').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newStatus = btn.dataset.status;
        const oldStatus = lead.status;
        
        // Optimistic UI update
        lead.status = newStatus;
        document.querySelectorAll('#status-opts .status-opt').forEach(b => {
          b.className = `status-opt${b.dataset.status === newStatus ? ` active-${newStatus}` : ''}`;
        });

        try {
          await LP.api.updateLead(lead.id, { status: newStatus });
          await LP.api.addActivity({ lead_id: lead.id, type: 'status_change', text: `Status changed to <strong>${newStatus}</strong>` });
          
          // Refresh data
          LP.data.leads = await LP.api.getLeads();
          const updatedLead = LP.data.leads.find(l => l.id === lead.id);
          if (updatedLead) {
            document.getElementById('activity-log').innerHTML = renderActivities(updatedLead.activities);
            lead.activities = updatedLead.activities;
          }
          
          // Update badge on sidebar
          LP.sidebar.updateBadge();

          LP.toast.success(`Status updated to ${newStatus}`, lead.name);

          // If qualified, ask CAPI push
          if (newStatus === 'qualified' || newStatus === 'converted') {
            setTimeout(() => LP.toast.info('Push to Meta CAPI?', 'Click CAPI button to optimize ad delivery'), 1000);
          }
          
          // Refresh underlying page
          const mod = LP.router.pageMap[LP.router.current];
          if (mod && mod.init) {
            mod.init(document.getElementById('page-content'));
          }
        } catch (err) {
          LP.toast.warning('Error', 'Failed to update status');
          // Revert optimistic update
          lead.status = oldStatus;
          document.querySelectorAll('#status-opts .status-opt').forEach(b => {
            b.className = `status-opt${b.dataset.status === oldStatus ? ` active-${oldStatus}` : ''}`;
          });
        }
      });
    });

    // WhatsApp
    document.getElementById('wa-btn')?.addEventListener('click', () => {
      LP.toast.success('WhatsApp template sent!', `To ${lead.phone} via WhatsApp Cloud API`);
      const activity = { type: 'wa_sent', text: 'WhatsApp template sent — DLT approved', user: 'Agency Owner', ts: new Date().toISOString() };
      lead.activities.unshift(activity);
      document.getElementById('activity-log').innerHTML = renderActivities(lead.activities);
    });

    // Call
    document.getElementById('call-btn')?.addEventListener('click', () => {
      LP.toast.info('Initiating Exotel call...', `Connecting to ${lead.phone}`);
      const activity = { type: 'called', text: 'Click-to-call initiated via Exotel', user: 'Agency Owner', ts: new Date().toISOString() };
      lead.activities.unshift(activity);
      document.getElementById('activity-log').innerHTML = renderActivities(lead.activities);
    });

    // Push to Zoho
    document.getElementById('zoho-btn')?.addEventListener('click', () => {
      LP.toast.success('Lead pushed to Zoho CRM!', `${lead.name} synced successfully`);
    });

    // CAPI push (legacy stub — kept for compatibility)
    document.getElementById('capi-push-btn')?.addEventListener('click', () => {
      LP.toast.info('Use "Mark Converted" button to fire a real CAPI Purchase event', 'CAPI');
    });

    // Mark Converted — prompts for amount, calls /api/leads/[id]/convert, fires real CAPI Purchase
    document.getElementById('convert-lead-btn')?.addEventListener('click', async () => {
      const valueStr = window.prompt(`Enter deal amount in ₹ for ${lead.name}:`);
      if (valueStr === null) return; // cancelled
      const value = parseFloat(valueStr.replace(/[^0-9.]/g, ''));
      if (!value || isNaN(value)) {
        LP.toast.warning('Invalid amount', 'Please enter a valid number');
        return;
      }
      const contentName = window.prompt('Service name (e.g. "Business Consulting Package"):') || 'Service';

      const btn = document.getElementById('convert-lead-btn');
      btn.disabled = true;
      btn.textContent = 'Sending…';

      try {
        const res = await fetch(`/api/leads/${lead.id}/convert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value, content_name: contentName }),
        });
        const data = await res.json();

        if (!res.ok) {
          LP.toast.warning('Error', data.error || 'Failed to mark converted');
          btn.disabled = false;
          btn.textContent = '✓ Mark Converted';
          return;
        }

        // Update lead in memory
        lead.status = 'converted';
        lead.convertedAt = new Date().toISOString();
        lead.conversionValue = value;

        // Hide the button (lead is now converted)
        btn.closest('button')?.remove();
        btn.remove();

        // Update status badges in drawer
        document.querySelectorAll('#status-opts .status-opt').forEach(b => {
          b.className = `status-opt${b.dataset.status === 'converted' ? ' active-converted' : ''}`;
        });

        // Refresh activity log
        LP.data.leads = await LP.api.getLeads();
        const updatedLead = LP.data.leads.find(l => l.id === lead.id);
        if (updatedLead) {
          document.getElementById('activity-log').innerHTML = renderActivities(updatedLead.activities);
        }

        // Refresh underlying page
        const mod = LP.router.pageMap[LP.router.current];
        if (mod && mod.init) mod.init(document.getElementById('page-content'));

        LP.toast.success(`₹${value.toLocaleString('en-IN')} Purchase event sent to Meta!`, `${lead.name} marked converted`);
      } catch (err) {
        LP.toast.warning('Network error', err.message);
        btn.disabled = false;
        btn.textContent = '✓ Mark Converted';
      }
    });

    // Assign
    document.getElementById('assign-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('assign-btn');
      const sel = document.getElementById('assign-select');
      const agentId = sel.value;
      const agent = (LP.data.agents || []).find(a => a.id === agentId);
      
      btn.disabled = true;
      btn.textContent = '...';

      try {
        await LP.api.updateLead(lead.id, { assigned_to: agentId || null });
        if (agent) {
          await LP.api.addActivity({ lead_id: lead.id, type: 'assignment', text: `Assigned to ${agent.name}` });
        } else {
          await LP.api.addActivity({ lead_id: lead.id, type: 'assignment', text: `Unassigned` });
        }
        
        // Refresh data
        LP.data.leads = await LP.api.getLeads();
        const updatedLead = LP.data.leads.find(l => l.id === lead.id);
        if (updatedLead) {
          document.getElementById('activity-log').innerHTML = renderActivities(updatedLead.activities);
          lead.assignedTo = updatedLead.assignedTo;
        }
        
        LP.toast.success('Lead assigned', agent ? `Assigned to ${agent.name}` : 'Unassigned');
        
        // Refresh underlying page if it has renderTable
        const mod = LP.router.pageMap[LP.router.current];
        if (mod && mod.init) {
          mod.init(document.getElementById('page-content'));
        }
      } catch (err) {
        LP.toast.warning('Error', 'Failed to assign agent');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Assign';
      }
    });

    // Save note
    document.getElementById('save-note-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('save-note-btn');
      const noteInput = document.getElementById('lead-note');
      const note = noteInput?.value?.trim();
      if (!note) return;
      
      btn.disabled = true;
      btn.textContent = 'Saving...';
      
      try {
        await LP.api.addActivity({ lead_id: lead.id, type: 'note', text: `Note: "${note}"` });
        
        // Refresh data
        LP.data.leads = await LP.api.getLeads();
        const updatedLead = LP.data.leads.find(l => l.id === lead.id);
        if (updatedLead) {
          document.getElementById('activity-log').innerHTML = renderActivities(updatedLead.activities);
          lead.activities = updatedLead.activities;
        }
        
        noteInput.value = '';
        LP.toast.success('Note saved', '');
        
        // Refresh underlying page
        const mod = LP.router.pageMap[LP.router.current];
        if (mod && mod.init) {
          mod.init(document.getElementById('page-content'));
        }
      } catch (err) {
        LP.toast.warning('Error', 'Failed to save note');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Note';
      }
    });

    // Convert Lead
    document.getElementById('convert-lead-btn')?.addEventListener('click', () => {
      showConvertModal(lead);
    });

    // Delete (demo only)
    document.getElementById('delete-lead-btn')?.addEventListener('click', () => {
      if (confirm(`Delete lead for ${lead.name}?`)) {
        LP.data.leads = LP.data.leads.filter(l => l.id !== lead.id);
        close();
        LP.toast.warning('Lead deleted', 'This action is logged in the audit trail');
      }
    });
  }

  function showConvertModal(lead) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-title">Mark Lead as Converted</div>
        <div class="modal-subtitle">Fire a Purchase event to Meta CAPI</div>
        <div class="form-group">
          <label class="form-label">Deal Amount (INR)</label>
          <input class="form-input" type="number" id="conv-amount" placeholder="e.g. 15000">
        </div>
        <div class="form-group">
          <label class="form-label">Service Name</label>
          <input class="form-input" id="conv-service" placeholder="e.g. Premium Package">
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="conv-cancel">Cancel</button>
          <button class="btn btn-primary" id="conv-save">Convert Lead</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#conv-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#conv-save').addEventListener('click', async () => {
      const amountStr = overlay.querySelector('#conv-amount').value.trim();
      const service   = overlay.querySelector('#conv-service').value.trim();
      if (!amountStr || isNaN(amountStr)) { LP.toast.warning('Invalid Amount', 'Please enter a valid deal amount'); return; }
      
      const btn = overlay.querySelector('#conv-save');
      btn.textContent = 'Processing...';
      btn.disabled = true;

      try {
        await LP.api.convertLead(lead.id, { value: Number(amountStr), content_name: service });
        
        // Refresh leads from API
        LP.data.leads = await LP.api.getLeads();
        const updatedLead = LP.data.leads.find(l => l.id === lead.id);
        
        overlay.remove();
        LP.toast.success('Converted Successfully!', \`Purchase event fired for ₹\${amountStr}\`);
        
        // Update drawer if open
        if (currentLead && currentLead.id === lead.id) {
          open(updatedLead);
        }
        
        // Update page table
        const mod = LP.router.pageMap[LP.router.current];
        if (mod && mod.init) {
          mod.init(document.getElementById('page-content'));
        }
      } catch (err) {
        btn.textContent = 'Convert Lead';
        btn.disabled = false;
        LP.toast.warning('Conversion Failed', err.message);
      }
    });
  }

  return { open, close };
})();

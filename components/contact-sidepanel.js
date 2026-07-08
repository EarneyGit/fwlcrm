// ============================================================
// FWL CRM - WhatsApp CRM Side Panel Component
// Lead info, attribution, stage selector, follow-up, tags,
// notes, purchase value, quick actions - beside the chat.
// ============================================================

window.LP = window.LP || {};

LP.contactPanel = (() => {
  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const STAGES = ['new', 'contacted', 'qualified', 'converted', 'lost', 'nurture'];

  function render(conv, lead) {
    const agents = LP.data.agents || [];
    const stageOptions = STAGES.map(s =>
      '<option value="' + s + '"' + (lead && lead.status === s ? ' selected' : '') + '>' +
      s.charAt(0).toUpperCase() + s.slice(1) + '</option>'
    ).join('');
    const agentOptions = '<option value="">Unassigned</option>' + agents.map(a =>
      '<option value="' + a.id + '"' + (conv.assignedTo === a.id ? ' selected' : '') + '>' +
      esc(a.name) + '</option>'
    ).join('');

    const ref = conv.referral || {};
    const attribution = (ref.source_id || ref.headline)
      ? '<div class="detail-row"><div class="detail-label">Ad (CTWA)</div>' +
        '<div class="detail-value">' + esc(ref.headline || ref.source_id) + '</div></div>'
      : '<div class="detail-row"><div class="detail-label">Source</div>' +
        '<div class="detail-value">' + esc(conv.source || 'organic') + '</div></div>';

    if (!lead) {
      return '<div class="wa-panel-section"><div class="drawer-section-title">Contact</div>' +
             '<div class="detail-value">' + esc(conv.profileName || '+' + conv.waId) + '</div>' +
             attribution + '<div class="wa-empty">No linked lead</div></div>';
    }

    return (
      '<div class="wa-panel-section">' +
        '<div class="drawer-section-title">Lead</div>' +
        '<div class="wa-panel-name">' + esc(lead.name) + '</div>' +
        '<div class="detail-row"><div class="detail-label">Phone</div><div class="detail-value">' + esc(lead.phone || '+' + conv.waId) + '</div></div>' +
        (lead.email ? '<div class="detail-row"><div class="detail-label">Email</div><div class="detail-value">' + esc(lead.email) + '</div></div>' : '') +
        '<div class="detail-row"><div class="detail-label">Client</div><div class="detail-value">' + esc(conv.clientName || lead.clientName || '-') + '</div></div>' +
        '<div class="detail-row"><div class="detail-label">Campaign</div><div class="detail-value">' + esc(lead.campaign || conv.leadCampaign || '-') + '</div></div>' +
        attribution +
        (lead.conversionValue
          ? '<div class="detail-row"><div class="detail-label">Purchase value</div><div class="detail-value" style="color:var(--success)">' +
            LP.utils.formatCurrency(lead.conversionValue) + '</div></div>' : '') +
      '</div>' +

      '<div class="wa-panel-section">' +
        '<div class="drawer-section-title">Stage</div>' +
        '<select id="wa-stage-select" class="form-input">' + stageOptions + '</select>' +
      '</div>' +

      '<div class="wa-panel-section">' +
        '<div class="drawer-section-title">Owner</div>' +
        '<select id="wa-owner-select" class="form-input">' + agentOptions + '</select>' +
      '</div>' +

      '<div class="wa-panel-section">' +
        '<div class="drawer-section-title">Follow-up</div>' +
        '<div id="wa-followups-list" class="wa-followups"></div>' +
        '<input type="text" id="wa-fu-title" class="form-input" placeholder="Follow-up note" style="margin-bottom:6px" />' +
        '<input type="datetime-local" id="wa-fu-due" class="form-input" style="margin-bottom:6px" />' +
        '<button class="btn btn-ghost btn-sm" id="wa-fu-add" style="width:100%">Add follow-up</button>' +
      '</div>' +

      '<div class="wa-panel-section">' +
        '<div class="drawer-section-title">Internal note</div>' +
        '<textarea id="wa-note-input" class="form-input" rows="2" placeholder="Add a note..."></textarea>' +
        '<button class="btn btn-ghost btn-sm" id="wa-note-add" style="width:100%;margin-top:6px">Save note</button>' +
      '</div>' +

      '<div class="wa-panel-section">' +
        '<div class="drawer-section-title">Quick actions</div>' +
        '<div class="wa-quick-actions">' +
          '<button class="btn btn-ghost btn-sm" id="wa-open-lead">Open lead drawer</button>' +
          '<a class="btn btn-ghost btn-sm" href="tel:+' + esc(conv.waId) + '">Call</a>' +
        '</div>' +
      '</div>'
    );
  }

  async function loadFollowups(leadId) {
    const el = document.getElementById('wa-followups-list');
    if (!el || !leadId) return;
    try {
      const res = await fetch('/api/followups?leadId=' + encodeURIComponent(leadId));
      const items = await res.json();
      el.innerHTML = items.length
        ? items.map(f =>
            '<div class="wa-fu-item' + (f.overdue ? ' overdue' : '') + '" data-fu-id="' + f.id + '">' +
              '<span>' + esc(f.title) + (f.dueAt ? ' &middot; ' + new Date(f.dueAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '') + '</span>' +
              '<button class="wa-fu-done" title="Mark done">&#10003;</button>' +
            '</div>').join('')
        : '<div class="wa-empty" style="padding:4px 0">None pending</div>';

      el.querySelectorAll('.wa-fu-done').forEach(btn => {
        btn.addEventListener('click', async e => {
          const id = e.target.closest('.wa-fu-item').dataset.fuId;
          await fetch('/api/followups', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: 'done' }),
          });
          loadFollowups(leadId);
          LP.toast.success('Follow-up completed', '');
        });
      });
    } catch (_) { el.innerHTML = '<div class="wa-empty">Failed to load</div>'; }
  }

  return { render, loadFollowups };
})();

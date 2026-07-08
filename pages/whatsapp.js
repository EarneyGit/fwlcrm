// ============================================================
// FWL CRM - WhatsApp Inbox Page
// 3-pane shared team inbox: conversation list / thread / CRM panel
// ============================================================

window.LP = window.LP || {};
LP.pages = LP.pages || {};

LP.pages.whatsapp = (() => {
  let currentFilter = 'all';       // all | mine | unassigned | unread | open | closed
  let currentClient = 'all';
  let currentStage  = 'all';
  let currentOwner  = 'all';
  let currentSearch = '';
  let conversations = [];
  let activeConvId  = null;
  let activeThread  = null;
  let pollTimer     = null;

  const CHIPS = ['all', 'mine', 'unassigned', 'unread', 'open', 'closed'];
  // NOTE: "mine" uses the first active agent until real auth lands (repo has none).
  function myAgentId() {
    const a = (LP.data.agents || [])[0];
    return a ? a.id : null;
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function queryString() {
    const p = new URLSearchParams();
    if (currentFilter === 'open' || currentFilter === 'closed') p.set('status', currentFilter);
    else p.set('status', 'all');
    if (currentFilter === 'unread') p.set('unread', '1');
    if (currentFilter === 'unassigned') p.set('assigned', 'unassigned');
    if (currentFilter === 'mine' && myAgentId()) p.set('assigned', myAgentId());
    if (currentOwner !== 'all') p.set('assigned', currentOwner);
    if (currentClient !== 'all') p.set('clientId', currentClient);
    if (currentSearch) p.set('q', currentSearch);
    return p.toString();
  }

  async function fetchConversations() {
    try {
      const res = await fetch('/api/whatsapp-conversations?' + queryString());
      let list = await res.json();
      if (!Array.isArray(list)) list = [];
      if (currentStage !== 'all') list = list.filter(c => c.leadStatus === currentStage);
      conversations = list;
    } catch (_) { conversations = []; }
  }

  async function fetchThread(convId) {
    try {
      const res = await fetch('/api/whatsapp-messages?conversationId=' + encodeURIComponent(convId));
      if (!res.ok) return null;
      return await res.json();
    } catch (_) { return null; }
  }

  function convRow(c) {
    const time = c.lastMessageAt ? LP.utils.formatRelativeTime(c.lastMessageAt) : '';
    const agent = (LP.data.agents || []).find(a => a.id === c.assignedTo);
    return (
      '<div class="wa-conv-row' + (c.id === activeConvId ? ' active' : '') + (c.unreadCount > 0 ? ' unread' : '') + '" data-conv-id="' + c.id + '">' +
        '<div class="wa-conv-avatar" style="background:' + (c.clientColor || 'var(--surface-3)') + '">' +
          esc((c.profileName || c.waId || '?').charAt(0).toUpperCase()) + '</div>' +
        '<div class="wa-conv-main">' +
          '<div class="wa-conv-top">' +
            '<span class="wa-conv-name">' + esc(c.leadName || c.profileName || '+' + c.waId) + '</span>' +
            '<span class="wa-conv-time">' + time + '</span>' +
          '</div>' +
          '<div class="wa-conv-bottom">' +
            '<span class="wa-conv-preview">' + esc(c.lastBody || '') + '</span>' +
            (c.unreadCount > 0 ? '<span class="wa-conv-badge">' + c.unreadCount + '</span>' : '') +
          '</div>' +
          '<div class="wa-conv-tags">' +
            (c.clientName ? '<span class="wa-chip-mini">' + esc(c.clientName) + '</span>' : '') +
            (c.leadStatus ? '<span class="wa-chip-mini stage-' + c.leadStatus + '">' + esc(c.leadStatus) + '</span>' : '') +
            (agent ? '<span class="wa-chip-mini">' + esc(agent.initials || agent.name) + '</span>' : '<span class="wa-chip-mini dim">unassigned</span>') +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderList() {
    const el = document.getElementById('wa-conv-list');
    if (!el) return;
    el.innerHTML = conversations.length
      ? conversations.map(convRow).join('')
      : '<div class="wa-empty" style="padding:24px">No conversations' +
        (currentSearch || currentFilter !== 'all' ? ' for this filter' : ' yet.<br><br>Register the webhook in Meta to start receiving messages') + '</div>';

    el.querySelectorAll('.wa-conv-row').forEach(row => {
      row.addEventListener('click', () => openConversation(row.dataset.convId));
    });

    const countEl = document.getElementById('wa-conv-count');
    if (countEl) countEl.textContent = conversations.length;
  }

  async function renderThread() {
    const threadEl = document.getElementById('wa-thread');
    const panelEl  = document.getElementById('wa-panel');
    if (!threadEl || !panelEl) return;

    if (!activeConvId) {
      threadEl.innerHTML = '<div class="wa-empty" style="margin:auto">Select a conversation</div>';
      panelEl.innerHTML = '';
      return;
    }

    activeThread = await fetchThread(activeConvId);
    if (!activeThread) {
      threadEl.innerHTML = '<div class="wa-empty" style="margin:auto">Failed to load thread</div>';
      return;
    }

    const conv = conversations.find(c => c.id === activeConvId) || activeThread.conversation;
    const lead = (LP.data.leads || []).find(l => l.id === activeThread.conversation.leadId) || null;

    threadEl.innerHTML = LP.chatThread.render(activeThread);
    panelEl.innerHTML  = LP.contactPanel.render(conv, lead);
    LP.chatThread.scrollToBottom();
    if (lead) LP.contactPanel.loadFollowups(lead.id);
    attachThreadEvents(conv, lead);
  }

  function attachThreadEvents(conv, lead) {
    // Send freeform
    const send = async () => {
      const input = document.getElementById('wa-composer-input');
      const text = input ? input.value.trim() : '';
      if (!text) return;
      input.value = '';
      const r = await fetch('/api/whatsapp-messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: conv.id, text }),
      });
      const d = await r.json();
      if (!r.ok) LP.toast.warning('Send failed', d.error || '');
      renderThread();
    };
    document.getElementById('wa-send-btn')?.addEventListener('click', send);
    document.getElementById('wa-composer-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });

    // Template picker
    document.getElementById('wa-template-btn')?.addEventListener('click', () => {
      LP.templatePicker.open(conv.id, renderThread);
    });

    // Close / reopen
    document.getElementById('wa-close-conv')?.addEventListener('click', async () => {
      const newStatus = conv.status === 'open' ? 'closed' : 'open';
      await fetch('/api/whatsapp-conversations', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: conv.id, status: newStatus }),
      });
      LP.toast.info('Conversation ' + newStatus, '');
      refresh();
    });

    // Stage change - reuses existing /api/leads PATCH (keeps CAPI hooks)
    document.getElementById('wa-stage-select')?.addEventListener('change', async e => {
      if (!lead) return;
      const newStatus = e.target.value;
      await LP.api.updateLead(lead.id, { status: newStatus });
      await LP.api.addActivity({ lead_id: lead.id, type: 'status_change', text: 'Status changed to <strong>' + newStatus + '</strong> from WhatsApp inbox' });
      LP.toast.success('Stage updated', newStatus);
      LP.data.leads = await LP.api.getLeads();
      refresh();
    });

    // Owner change
    document.getElementById('wa-owner-select')?.addEventListener('change', async e => {
      await fetch('/api/whatsapp-conversations', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: conv.id, assignedTo: e.target.value || null }),
      });
      if (lead && e.target.value) await LP.api.updateLead(lead.id, { assigned_to: e.target.value });
      LP.toast.success('Owner updated', '');
      refresh();
    });

    // Follow-up add
    document.getElementById('wa-fu-add')?.addEventListener('click', async () => {
      if (!lead) return;
      const title = document.getElementById('wa-fu-title').value.trim();
      const due = document.getElementById('wa-fu-due').value;
      if (!title) return LP.toast.warning('Enter a follow-up note', '');
      await fetch('/api/followups', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, title, dueAt: due || null, owner: conv.assignedTo }),
      });
      document.getElementById('wa-fu-title').value = '';
      LP.toast.success('Follow-up added', title);
      LP.contactPanel.loadFollowups(lead.id);
    });

    // Internal note
    document.getElementById('wa-note-add')?.addEventListener('click', async () => {
      if (!lead) return;
      const text = document.getElementById('wa-note-input').value.trim();
      if (!text) return;
      await LP.api.addActivity({ lead_id: lead.id, type: 'note', text, user_name: 'Kawin' });
      document.getElementById('wa-note-input').value = '';
      LP.toast.success('Note saved', '');
    });

    // Open full lead drawer
    document.getElementById('wa-open-lead')?.addEventListener('click', () => {
      const fullLead = (LP.data.leads || []).find(l => l.id === (lead && lead.id));
      if (fullLead) LP.drawer.open(fullLead);
    });
  }

  async function openConversation(convId) {
    activeConvId = convId;
    // Mark read
    fetch('/api/whatsapp-conversations', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: convId, markRead: true }),
    }).catch(() => null);
    const conv = conversations.find(c => c.id === convId);
    if (conv) conv.unreadCount = 0;
    renderList();
    renderThread();
  }

  async function refresh() {
    await fetchConversations();
    renderList();
    if (activeConvId) renderThread();
  }

  function render() {
    const clients = LP.data.clients || [];
    const agents  = LP.data.agents || [];
    const chips = CHIPS.map(f =>
      '<button class="wa-chip' + (currentFilter === f ? ' active' : '') + '" data-filter="' + f + '">' +
      f.charAt(0).toUpperCase() + f.slice(1) + '</button>'
    ).join('');

    return (
      '<div class="wa-inbox">' +
        '<div class="wa-list-pane">' +
          '<div class="wa-list-header">' +
            '<input type="text" id="wa-search" class="form-input" placeholder="Search phone, name, campaign..." value="' + esc(currentSearch) + '" />' +
            '<div class="wa-chips">' + chips + '</div>' +
            '<div class="wa-selects">' +
              '<select id="wa-client-filter" class="form-input">' +
                '<option value="all">All clients</option>' +
                clients.map(c => '<option value="' + c.id + '"' + (currentClient === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') +
              '</select>' +
              '<select id="wa-stage-filter" class="form-input">' +
                '<option value="all">All stages</option>' +
                ['new','contacted','qualified','converted','lost','nurture'].map(s =>
                  '<option value="' + s + '"' + (currentStage === s ? ' selected' : '') + '>' + s + '</option>').join('') +
              '</select>' +
              '<select id="wa-owner-filter" class="form-input">' +
                '<option value="all">All owners</option>' +
                agents.map(a => '<option value="' + a.id + '"' + (currentOwner === a.id ? ' selected' : '') + '>' + esc(a.name) + '</option>').join('') +
              '</select>' +
            '</div>' +
            '<div style="font-size:11px;color:var(--text-3);padding:4px 2px"><span id="wa-conv-count">0</span> conversations</div>' +
          '</div>' +
          '<div class="wa-conv-list" id="wa-conv-list"><div class="skeleton" style="height:120px;margin:10px"></div></div>' +
        '</div>' +
        '<div class="wa-thread-pane" id="wa-thread"><div class="wa-empty" style="margin:auto">Select a conversation</div></div>' +
        '<div class="wa-panel-pane" id="wa-panel"></div>' +
      '</div>'
    );
  }

  function attachEvents(container) {
    container.querySelectorAll('.wa-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        currentFilter = chip.dataset.filter;
        container.querySelectorAll('.wa-chip').forEach(c => c.classList.toggle('active', c === chip));
        refresh();
      });
    });

    let deb;
    document.getElementById('wa-search')?.addEventListener('input', e => {
      clearTimeout(deb);
      deb = setTimeout(() => { currentSearch = e.target.value.trim(); refresh(); }, 300);
    });
    document.getElementById('wa-client-filter')?.addEventListener('change', e => { currentClient = e.target.value; refresh(); });
    document.getElementById('wa-stage-filter')?.addEventListener('change', e => { currentStage = e.target.value; refresh(); });
    document.getElementById('wa-owner-filter')?.addEventListener('change', e => { currentOwner = e.target.value; refresh(); });
  }

  function init(container) {
    container.innerHTML = render();
    attachEvents(container);
    refresh();
    pollTimer = setInterval(refresh, 10000);   // inbox-local poll
  }

  function destroy() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    activeConvId = null;
    activeThread = null;
  }

  return { init, destroy };
})();

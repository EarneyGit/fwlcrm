// ============================================================
// FWL CRM - WhatsApp Template Picker Component
// Modal listing approved templates with variable inputs.
// ============================================================

window.LP = window.LP || {};

LP.templatePicker = (() => {
  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function bodyText(t) {
    const body = (t.components || []).find(c => c.type === 'BODY');
    return body ? body.text : '';
  }
  function varCount(text) {
    const m = String(text || '').match(/\{\{\d+\}\}/g);
    return m ? new Set(m).size : 0;
  }

  // open(conversationId, onSent)
  async function open(conversationId, onSent) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'wa-tpl-overlay';
    overlay.innerHTML =
      '<div class="modal" style="max-width:520px">' +
        '<div class="modal-header"><div class="card-title">Send template</div>' +
          '<button class="btn btn-ghost btn-sm" id="wa-tpl-close">&times;</button></div>' +
        '<div class="modal-body" id="wa-tpl-body">' +
          '<div class="skeleton" style="height:80px"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#wa-tpl-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    let templates = [];
    try {
      const res = await fetch('/api/whatsapp-templates');
      templates = (await res.json()).filter(t => t.status === 'APPROVED');
    } catch (_) {}

    const body = overlay.querySelector('#wa-tpl-body');
    if (!templates.length) {
      body.innerHTML =
        '<div class="wa-empty">No approved templates synced.</div>' +
        '<button class="btn btn-primary btn-sm" id="wa-tpl-sync" style="margin-top:10px">Sync from Meta</button>';
      body.querySelector('#wa-tpl-sync').addEventListener('click', async () => {
        const r = await fetch('/api/whatsapp-templates', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sync' }),
        });
        const d = await r.json();
        if (r.ok) { LP.toast.success('Templates synced', d.synced + ' templates'); overlay.remove(); open(conversationId, onSent); }
        else LP.toast.warning('Sync failed', d.error || '');
      });
      return;
    }

    body.innerHTML = templates.map(t => {
      const text = bodyText(t);
      return '<div class="wa-tpl-item" data-tpl="' + esc(t.name) + '" data-lang="' + esc(t.language) + '" data-vars="' + varCount(text) + '">' +
        '<div style="font-weight:600">' + esc(t.name) + ' <span class="wa-msg-label">' + esc(t.language) + '</span></div>' +
        '<div style="color:var(--text-3);font-size:12px;margin-top:2px">' + esc(text).slice(0, 140) + '</div>' +
      '</div>';
    }).join('');

    body.querySelectorAll('.wa-tpl-item').forEach(item => {
      item.addEventListener('click', async () => {
        const name = item.dataset.tpl;
        const lang = item.dataset.lang;
        const vars = parseInt(item.dataset.vars, 10);
        const params = [];
        for (let v = 1; v <= vars; v++) {
          const val = prompt('Value for {{' + v + '}} in ' + name + ':');
          if (val === null) return;
          params.push(val);
        }
        const r = await fetch('/api/whatsapp-messages', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId, templateName: name, language: lang, bodyParams: params }),
        });
        const d = await r.json();
        if (r.ok) { LP.toast.success('Template sent', name); overlay.remove(); if (onSent) onSent(); }
        else LP.toast.warning('Send failed', d.error || '');
      });
    });
  }

  return { open };
})();

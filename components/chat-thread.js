// ============================================================
// FWL CRM - WhatsApp Chat Thread Component
// Renders message bubbles with delivery status + composer
// ============================================================

window.LP = window.LP || {};

LP.chatThread = (() => {
  function tickFor(status) {
    switch (status) {
      case 'read':      return '<span class="wa-tick read">&#10003;&#10003;</span>';
      case 'delivered': return '<span class="wa-tick">&#10003;&#10003;</span>';
      case 'sent':      return '<span class="wa-tick">&#10003;</span>';
      case 'failed':    return '<span class="wa-tick failed">!</span>';
      default:          return '<span class="wa-tick">&middot;</span>';
    }
  }

  function fmtTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  function fmtDay(ts) {
    return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderMessages(messages) {
    if (!messages.length) {
      return '<div class="wa-empty">No messages yet</div>';
    }
    let html = '';
    let lastDay = '';
    for (const m of messages) {
      const day = fmtDay(m.ts);
      if (day !== lastDay) {
        html += '<div class="wa-day-divider"><span>' + day + '</span></div>';
        lastDay = day;
      }
      const out = m.direction === 'out';
      const label = m.templateName
        ? '<span class="wa-msg-label">template: ' + esc(m.templateName) + '</span>'
        : (m.type && m.type !== 'text'
            ? '<span class="wa-msg-label">' + esc(m.type) + '</span>' : '');
      html += (
        '<div class="wa-bubble-row ' + (out ? 'out' : 'in') + '">' +
          '<div class="wa-bubble ' + (out ? 'out' : 'in') + (m.status === 'failed' ? ' failed' : '') + '">' +
            label +
            '<div class="wa-bubble-body">' + esc(m.body) + '</div>' +
            '<div class="wa-bubble-meta">' + fmtTime(m.ts) + (out ? ' ' + tickFor(m.status) : '') + '</div>' +
            (m.errorText ? '<div class="wa-bubble-error">' + esc(m.errorText) + '</div>' : '') +
          '</div>' +
        '</div>'
      );
    }
    return html;
  }

  function render(thread) {
    const conv = thread.conversation;
    const windowNote = conv.windowOpen
      ? '<span class="wa-window open">24h window open</span>'
      : '<span class="wa-window closed">Window closed - template required</span>';

    return (
      '<div class="wa-thread-header">' +
        '<div>' +
          '<div class="wa-thread-name">' + (conv.profileName || '+' + conv.waId) + '</div>' +
          '<div class="wa-thread-sub">+' + conv.waId + ' &middot; ' + windowNote + '</div>' +
        '</div>' +
        '<div class="wa-thread-actions">' +
          '<button class="btn btn-ghost btn-sm" id="wa-close-conv">' +
            (conv.status === 'open' ? 'Close' : 'Reopen') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="wa-thread-scroll" id="wa-thread-scroll">' + renderMessages(thread.messages) + '</div>' +
      '<div class="wa-composer">' +
        '<button class="btn btn-ghost btn-sm" id="wa-template-btn" title="Send template">Tpl</button>' +
        '<input type="text" id="wa-composer-input" class="form-input" ' +
          'placeholder="' + (conv.windowOpen ? 'Type a reply...' : '24h window closed - use a template') + '" ' +
          (conv.windowOpen ? '' : 'disabled') + ' />' +
        '<button class="btn btn-primary btn-sm" id="wa-send-btn" ' + (conv.windowOpen ? '' : 'disabled') + '>Send</button>' +
      '</div>'
    );
  }

  function scrollToBottom() {
    const el = document.getElementById('wa-thread-scroll');
    if (el) el.scrollTop = el.scrollHeight;
  }

  return { render, scrollToBottom };
})();

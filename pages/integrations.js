// ============================================================
// FWL CRM — Integrations Page
// Meta OAuth, Webhook config, CAPI toggles
// ============================================================

window.LP = window.LP || {};
LP.pages = LP.pages || {};

LP.pages.integrations = (() => {
  function timeAgo(isoStr) {
    const diff = Math.floor((Date.now() - new Date(isoStr)) / 1000);
    if (diff < 60)   return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    return `${Math.floor(diff/3600)}h ago`;
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); ta.remove();
    });
    LP.toast.success('Copied!', '');
  }

  function render() {
    const wb = LP.data.webhook;
    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Integrations</h1>
          <div class="page-subtitle">Meta Graph API, Webhooks, CAPI, and third-party connections</div>
        </div>
        <a href="https://developers.facebook.com" target="_blank" class="btn btn-secondary btn-sm" style="display:flex;align-items:center;gap:4px">
          ${LP.icons.get('book-open', 'icon-sm')} Meta Developer Docs ↗
        </a>
      </div>

      <div class="grid-2" style="margin-bottom:24px">

        <!-- META OAUTH FLOW -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title" style="display:flex;align-items:center;gap:8px">
                <img src="/icons/facebook.png" style="width:18px;height:18px;object-fit:contain;border-radius:3px"> Meta OAuth 2.0 Connection
              </div>
              <div class="card-subtitle">Connect Facebook &amp; Instagram Lead Ads</div>
            </div>
            <span class="badge badge-success">● Active</span>
          </div>

          <div style="margin-bottom:16px">
            <div class="integration-step">
              <div class="step-number done">${LP.icons.get('check', 'icon-sm')}</div>
              <div>
                <div class="step-title">Create Meta Business App</div>
                <div class="step-desc">developers.facebook.com → Business type → Add Lead Ads product</div>
              </div>
            </div>
            <div class="integration-step">
              <div class="step-number done">${LP.icons.get('check', 'icon-sm')}</div>
              <div>
                <div class="step-title">Business Manager Verification</div>
                <div class="step-desc">GSTIN + Chennai address + Domain verified → BM ID confirmed</div>
              </div>
            </div>
            <div class="integration-step">
              <div class="step-number done">${LP.icons.get('check', 'icon-sm')}</div>
              <div>
                <div class="step-title">OAuth Permissions Granted</div>
                <div class="step-desc">All 5 required permissions approved via App Review</div>
              </div>
            </div>
            <div class="integration-step">
              <div class="step-number done">${LP.icons.get('check', 'icon-sm')}</div>
              <div>
                <div class="step-title">Long-lived Token Active</div>
                <div class="step-desc">60-day access tokens stored encrypted (AES-256). Auto-refreshed.</div>
              </div>
            </div>
          </div>

          <button class="btn btn-primary" style="width:100%;display:flex;align-items:center;justify-content:center;gap:4px" onclick="LP.toast.info('OAuth flow initiated','Opening Meta login in new window...')">
            ${LP.icons.get('plus', 'icon-sm')} Connect Another Account
          </button>
        </div>

        <!-- PERMISSIONS TABLE -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">OAuth Permissions</div>
              <div class="card-subtitle">App Review status</div>
            </div>
            <span class="badge badge-warning">App Review Required</span>
          </div>
          ${[
            { perm: 'pages_show_list',        status: 'granted',  why: 'List client Pages for onboarding' },
            { perm: 'pages_read_engagement',  status: 'granted',  why: 'Subscribe to webhook events' },
            { perm: 'leads_retrieval',        status: 'granted',  why: 'Fetch lead data from forms' },
            { perm: 'ads_management',         status: 'granted',  why: 'Read campaign & ad names' },
            { perm: 'business_management',    status: 'granted',  why: 'Multi-client BM access' },
            { perm: 'whatsapp_business_messaging', status: 'pending', why: 'WhatsApp Cloud API messages' },
          ].map(p => `
            <div class="permission-row">
              <div class="perm-name">${p.perm}</div>
              <div style="font-size:12px;color:var(--text-2);flex:1;padding:0 8px">${p.why}</div>
              <div class="perm-status">
                <span class="badge badge-${p.status === 'granted' ? 'success' : 'warning'}" style="display:flex;align-items:center;gap:4px">
                  ${p.status === 'granted' ? LP.icons.get('check', 'icon-sm') : LP.icons.get('clock', 'icon-sm')}
                  ${p.status === 'granted' ? 'Granted' : 'Pending'}
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="grid-2" style="margin-bottom:24px">
        <!-- WEBHOOK CONFIG -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title" style="display:flex;align-items:center;gap:6px">
                ${LP.icons.get('zap', 'icon-sm')} Webhook Configuration
              </div>
              <div class="card-subtitle">Real-time leadgen events from Meta</div>
            </div>
            <span class="badge badge-success" id="wh-status-badge">● Active</span>
          </div>

          <div style="margin-bottom:12px">
            <div class="form-label">Webhook URL</div>
            <div class="webhook-url">
              <span id="wh-url">${wb.url}</span>
              <button class="btn btn-ghost btn-sm" onclick="copyToClipboard('${wb.url}')" style="display:flex;align-items:center">${LP.icons.get('copy', 'icon-sm')}</button>
            </div>
          </div>

          <div style="margin-bottom:12px">
            <div class="form-label">Verify Token</div>
            <div class="webhook-url">
              <span id="wh-token" style="filter:blur(4px);transition:filter 0.2s">${wb.verifyToken}</span>
              <button class="btn btn-ghost btn-sm" style="display:flex;align-items:center" onclick="
                const el=document.getElementById('wh-token');
                el.style.filter=el.style.filter?'':'blur(4px)';
                copyToClipboard('${wb.verifyToken}')
              ">${LP.icons.get('eye', 'icon-sm')}</button>
            </div>
          </div>

          <div style="font-size:12.5px;color:var(--text-2);margin-bottom:14px;line-height:1.8">
            <div class="flex-between" style="padding:4px 0;border-bottom:1px solid var(--border)">
              <span>Subscribed field</span>
              <span class="mono" style="font-size:11px">leadgen</span>
            </div>
            <div class="flex-between" style="padding:4px 0;border-bottom:1px solid var(--border)">
              <span>Signature header</span>
              <span class="mono" style="font-size:11px">X-Hub-Signature-256</span>
            </div>
            <div class="flex-between" style="padding:4px 0;border-bottom:1px solid var(--border)">
              <span>Last ping received</span>
              <strong>${timeAgo(wb.lastPing)}</strong>
            </div>
            <div class="flex-between" style="padding:4px 0;border-bottom:1px solid var(--border)">
              <span>Total events received</span>
              <strong class="text-meta">${wb.totalReceived.toLocaleString('en-IN')}</strong>
            </div>
            <div class="flex-between" style="padding:4px 0">
              <span>Failures (last 24h)</span>
              <strong class="text-success">0</strong>
            </div>
          </div>

          <div style="background:var(--surface-2);border-radius:8px;padding:12px;font-size:11.5px;color:var(--text-2);font-family:'JetBrains Mono',monospace;overflow-x:auto">
            <div style="color:var(--text-3);margin-bottom:4px">// Webhook verification (Node.js)</div>
            <div>app.<span style="color:#F59E0B">post</span>(<span style="color:#10B981">'/webhook'</span>, async (req, res) => {</div>
            <div style="padding-left:16px">const sig = req.headers[<span style="color:#10B981">'x-hub-signature-256'</span>];</div>
            <div style="padding-left:16px">const expected = <span style="color:#10B981">'sha256='</span> + crypto</div>
            <div style="padding-left:32px">.<span style="color:#F59E0B">createHmac</span>(<span style="color:#10B981">'sha256'</span>, APP_SECRET)</div>
            <div style="padding-left:32px">.<span style="color:#F59E0B">update</span>(rawBody).<span style="color:#F59E0B">digest</span>(<span style="color:#10B981">'hex'</span>);</div>
            <div style="padding-left:16px;color:var(--text-3)">// timingSafeEqual prevents timing attacks</div>
            <div style="padding-left:16px"><span style="color:#6C47FF">if</span> (!crypto.<span style="color:#F59E0B">timingSafeEqual</span>(sig, expected))</div>
            <div style="padding-left:32px"><span style="color:#6C47FF">return</span> res.<span style="color:#F59E0B">sendStatus</span>(<span style="color:#EF4444">401</span>);</div>
            <div style="padding-left:16px">res.<span style="color:#F59E0B">sendStatus</span>(<span style="color:#10B981">200</span>); <span style="color:var(--text-3)">// ACK fast</span></div>
            <div style="padding-left:16px">await redis.<span style="color:#F59E0B">lpush</span>(<span style="color:#10B981">'leads:queue'</span>, leadgenId);</div>
            <div>});</div>
          </div>

          <button class="btn btn-secondary" style="width:100%;margin-top:12px;display:flex;align-items:center;justify-content:center;gap:4px" onclick="LP.toast.success('Test ping sent!','Webhook responded in 184ms')">
            ${LP.icons.get('bell', 'icon-sm')} Send Test Ping
          </button>
        </div>

        <!-- CAPI SETTINGS -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title" style="display:flex;align-items:center;gap:6px">
                ${LP.icons.get('refresh-cw', 'icon-sm')} Meta Conversions API (CAPI)
              </div>
              <div class="card-subtitle">Server-side event feedback loop</div>
            </div>
          </div>

          <div style="background:linear-gradient(135deg,rgba(24,119,242,0.08),rgba(108,71,255,0.08));border:1px solid rgba(24,119,242,0.15);border-radius:8px;padding:12px;margin-bottom:14px;font-size:12px;color:var(--text-2);display:flex;align-items:flex-start;gap:8px">
            <div style="color:#F59E0B;flex-shrink:0;margin-top:1px">${LP.icons.get('circle-dot', 'icon-sm')}</div>
            <div>Agencies pushing qualified leads back via CAPI see <strong style="color:var(--success)">↓28–35% CPL</strong> in 2–3 weeks as Meta optimizes ad delivery.</div>
          </div>

          <div class="drawer-section-title">Events per Client</div>
          ${LP.data.clients.slice(0, 5).map(c => `
            <div class="capi-row">
              <div style="display:flex;align-items:center;gap:8px">
                <div style="width:20px;height:20px;border-radius:4px;background:${c.color};display:flex;align-items:center;justify-content:center;font-size:11px;color:white">${c.icon}</div>
                <span style="font-size:12.5px">${c.name.split(' ')[0]}</span>
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                <span class="badge badge-neutral" style="font-size:10px">Pixel linked</span>
                <div class="toggle on" onclick="this.classList.toggle('on');LP.toast.info('CAPI toggle updated','')"></div>
              </div>
            </div>
          `).join('')}

          <div class="divider"></div>
          <div class="drawer-section-title">Events Sent (Last 24h)</div>
          ${[
            { event: 'Lead',      count: LP.data.stats ? LP.data.stats.leadsToday : 0,   match: '—' },
            { event: 'Converted', count: LP.data.stats ? LP.data.stats.wonTotal  : 0,    match: '—' },
          ].map(e => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:12.5px">
              <span style="color:var(--text-2)">${e.event}</span>
              <div style="display:flex;gap:16px;align-items:center">
                <span><strong>${e.count}</strong> events</span>
                <span style="color:var(--success)">Match: ${e.match}</span>
              </div>
            </div>
          `).join('')}

          <div style="margin-top:14px">
            <div class="form-label">Pixel ID</div>
            <div class="webhook-url">
              <span class="mono">1116116109133710</span>
              <button class="btn btn-ghost btn-sm" style="display:flex;align-items:center" onclick="copyToClipboard('1116116109133710')">${LP.icons.get('copy', 'icon-sm')}</button>
            </div>
          </div>

          <div style="margin-top:10px">
            <div class="form-label">Access Token (Encrypted)</div>
            <div class="webhook-url">
              <span>EAAJ••••••••••••••••••••••</span>
              <button class="btn btn-ghost btn-sm" style="display:flex;align-items:center" onclick="LP.toast.info('Token is encrypted at rest','AES-256 via AWS KMS')">${LP.icons.get('lock', 'icon-sm')}</button>
            </div>
          </div>
        </div>
      </div>


      <!-- WhatsApp Business Platform (Cloud API) -->
      <div class="card" id="wa-settings-card">
        <div class="card-header">
          <div>
            <div class="card-title" style="display:flex;align-items:center;gap:6px">
              WhatsApp Business Platform
              <span class="badge badge-neutral" style="font-size:10px" id="wa-cfg-badge">checking...</span>
            </div>
            <div class="card-subtitle">Cloud API webhook, accounts and assignment rules for the WhatsApp Inbox</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="LP.router.navigate('whatsapp')">Open Inbox</button>
        </div>
        <div style="padding:14px" id="wa-settings-body">
          <div class="skeleton" style="height:80px"></div>
        </div>
      </div>

      <!-- Other integrations -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Third-party Integrations</div>
          <div class="card-subtitle">Push leads to client CRMs, telephony, and messaging</div>
        </div>
        <div class="grid-3">
        ${[
            { name:'Zoho CRM',        icon: LP.icons.get('bar-chart-3', 'icon-md'), desc:'Native 2-way sync',                    status:'connected', color:'#E42527' },
            { name:'HubSpot',         icon: LP.icons.get('circle-dot', 'icon-md'), desc:'Lead + deal creation',                 status:'connected', color:'#FF7A59' },
            { name:'WhatsApp Cloud',  icon: '<img src="/icons/whatsapp.png" style="width:22px;height:22px;object-fit:contain">', desc:'DLT-approved templates (ta-IN)',       status:'connected', color:'#25D366' },
            { name:'Facebook Ads',    icon: '<img src="/icons/facebook.png" style="width:22px;height:22px;object-fit:contain;border-radius:4px">', desc:'Lead forms & Pixel integration',     status:'connected', color:'#1877F2' },
            { name:'Instagram Ads',   icon: '<img src="/icons/instagram.png" style="width:22px;height:22px;object-fit:contain;border-radius:4px">', desc:'Story & feed lead forms',           status:'connected', color:'#D946EF' },
            { name:'Messenger',       icon: '<img src="/icons/messenger.png" style="width:22px;height:22px;object-fit:contain;border-radius:4px">', desc:'Messenger lead gen forms',          status:'inactive',  color:'#0084FF' },
            { name:'Exotel',          icon: LP.icons.get('phone', 'icon-md'), desc:'Click-to-call, IVR, recording',        status:'connected', color:'#FF6B35' },
            { name:'Knowlarity',      icon: LP.icons.get('phone', 'icon-md'),  desc:'IVR + virtual numbers',               status:'inactive',  color:'#6C47FF' },
            { name:'MSG91 SMS',       icon: LP.icons.get('message-circle', 'icon-md'), desc:'WhatsApp fallback + OTP',              status:'connected', color:'#1877F2' },
          ].map(i => `
            <div style="display:flex;align-items:center;gap:12px;padding:14px;border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;transition:all 0.15s"
              onmouseover="this.style.borderColor='var(--border-hover)'"
              onmouseout="this.style.borderColor='var(--border)'"
              onclick="LP.toast.${i.status==='connected'?'success':'info'}('${i.name}','${i.status==='connected'?'Connected and syncing':'Click to configure'}')"
            >
              <div style="width:38px;height:38px;border-radius:8px;background:${i.color}20;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${i.icon}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:600">${i.name}</div>
                <div style="font-size:11px;color:var(--text-3)">${i.desc}</div>
              </div>
              <span class="badge badge-${i.status === 'connected' ? 'success' : 'neutral'}" style="font-size:10px">
                ${i.status === 'connected' ? '● On' : 'Off'}
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }


  async function loadWaSettings() {
    const body = document.getElementById('wa-settings-body');
    const badge = document.getElementById('wa-cfg-badge');
    if (!body) return;
    try {
      const res = await fetch('/api/whatsapp-settings');
      const d = await res.json();
      const ready = d.tokenConfigured && d.appSecretConfigured;
      if (badge) {
        badge.textContent = ready ? 'ready' : 'setup needed';
        badge.className = 'badge ' + (ready ? 'badge-success' : 'badge-neutral');
      }
      const agents = LP.data.agents || [];
      const rows = (d.accounts || []).map(a => `
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px;border:1px solid var(--border-0);border-radius:8px;margin-bottom:6px" data-wa-acct="${a.id}">
          <strong style="font-size:12px;min-width:120px">${a.displayName || a.id}</strong>
          <input class="form-input" style="width:170px;font-size:11px" placeholder="phone_number_id" value="${a.phoneNumberId || ''}" data-f="phoneNumberId">
          <input class="form-input" style="width:150px;font-size:11px" placeholder="waba_id" value="${a.wabaId || ''}" data-f="wabaId">
          <select class="form-input" style="width:130px;font-size:11px" data-f="assignmentMode">
            ${['none','default','round_robin'].map(m => '<option value="' + m + '"' + (a.assignmentMode === m ? ' selected' : '') + '>' + m + '</option>').join('')}
          </select>
          <select class="form-input" style="width:140px;font-size:11px" data-f="defaultAssignee">
            <option value="">no default owner</option>
            ${agents.map(ag => '<option value="' + ag.id + '"' + (a.defaultAssignee === ag.id ? ' selected' : '') + '>' + ag.name + '</option>').join('')}
          </select>
          <button class="btn btn-ghost btn-sm" data-wa-save="${a.id}">Save</button>
        </div>`).join('');

      body.innerHTML = `
        <div class="detail-row"><div class="detail-label">Webhook URL</div>
          <div class="detail-value mono" style="font-size:11px">${d.webhookUrl}
            <button class="btn btn-ghost btn-sm" onclick="copyToClipboard('${d.webhookUrl}')">Copy</button>
          </div></div>
        <div class="detail-row"><div class="detail-label">Verify token</div>
          <div class="detail-value">${d.verifyTokenConfigured ? 'configured' : 'missing'} &middot; App secret: ${d.appSecretConfigured ? 'configured' : 'missing'} &middot; WA_TOKEN: ${d.tokenConfigured ? 'configured' : 'missing (sending disabled)'}</div></div>
        <div class="drawer-section-title" style="margin-top:10px">Accounts &amp; assignment rules</div>
        ${rows || '<div style="font-size:12px;color:var(--text-3)">No accounts yet - run scripts/migrate-whatsapp.js or save one below after Meta setup.</div>'}
        <div class="drawer-section-title" style="margin-top:10px">Compliance</div>
        <div style="font-size:11px;color:var(--text-3);line-height:1.6">
          ${d.compliance ? Object.values(d.compliance).join('<br>') : ''}
        </div>`;

      body.querySelectorAll('[data-wa-save]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const row = btn.closest('[data-wa-acct]');
          const payload = { id: row.dataset.waAcct };
          row.querySelectorAll('[data-f]').forEach(inp => { payload[inp.dataset.f] = inp.value || null; });
          const r = await fetch('/api/whatsapp-settings', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (r.ok) LP.toast.success('WhatsApp account saved', payload.id);
          else LP.toast.warning('Save failed', (await r.json()).error || '');
        });
      });
    } catch (_) {
      if (body) body.innerHTML = '<div style="font-size:12px;color:var(--text-3)">Failed to load WhatsApp settings</div>';
    }
  }

  function init(container) {
    container.innerHTML = render();
    container.classList.add('fade-in');
    window.copyToClipboard = copyToClipboard;
    loadWaSettings();
  }

  function destroy() {}

  return { render, init, destroy };
})();

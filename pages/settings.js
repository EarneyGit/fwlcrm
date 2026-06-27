// ============================================================
// LeadPulse CRM — Settings Page
// Agency profile, billing plans, language toggle, audit log
// ============================================================

window.LP = window.LP || {};
LP.pages = LP.pages || {};

LP.pages.settings = (() => {
  let currentLang = localStorage.getItem('lp_lang') || 'en';
  let currentPlan = localStorage.getItem('lp_plan') || 'pro';

  function formatTs(isoStr) {
    return new Date(isoStr).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  }

  function selectPlan(plan) {
    currentPlan = plan;
    localStorage.setItem('lp_plan', plan);
    document.querySelectorAll('.plan-card').forEach(c => {
      c.classList.toggle('active', c.dataset.plan === plan);
    });
    LP.toast.success('Plan selected!', plan === 'starter' ? 'Starter ₹4,999/mo' : 'Pro ₹14,999/mo');
  }

  function toggleLang() {
    currentLang = currentLang === 'en' ? 'ta' : 'en';
    localStorage.setItem('lp_lang', currentLang);
    const el = document.getElementById('lang-toggle');
    if (el) el.classList.toggle('on', currentLang === 'ta');
    const label = document.getElementById('lang-label');
    if (label) label.textContent = currentLang === 'ta' ? 'தமிழ் (Tamil)' : 'English';
    LP.toast.success(
      currentLang === 'ta' ? 'மொழி மாற்றப்பட்டது!' : 'Language changed!',
      currentLang === 'ta' ? 'Interface will display in Tamil' : 'Interface now in English'
    );
  }

  window.selectPlan = selectPlan;
  window.settingsToggleLang = toggleLang;

  function render() {
    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Settings</h1>
          <div class="page-subtitle">Agency profile, billing, and compliance configuration</div>
        </div>
        <button class="btn btn-primary" onclick="LP.toast.success('Settings saved!','All changes applied successfully')">
          Save Changes
        </button>
      </div>

      <div class="grid-2" style="margin-bottom:24px">
        <!-- Agency Profile -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Agency Profile</div>
          </div>
          <div class="form-group">
            <label class="form-label">Agency Name</label>
            <input class="form-input" value="LeadPulse Performance Agency" id="ag-name">
          </div>
          <div class="form-group">
            <label class="form-label">GST Number (GSTIN)</label>
            <input class="form-input" value="33AADCP1234F1Z5" id="ag-gstin" style="font-family:'JetBrains Mono',monospace">
          </div>
          <div class="form-group">
            <label class="form-label">Address</label>
            <textarea class="form-input" rows="2" id="ag-addr" style="resize:none">Anna Nagar, Chennai – 600 040, Tamil Nadu</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Contact Email</label>
            <input class="form-input" value="agency@leadpulse.in" id="ag-email">
          </div>
          <div class="form-group">
            <label class="form-label">WhatsApp Business Number</label>
            <input class="form-input" value="+91 98765 43210" id="ag-wa" style="font-family:'JetBrains Mono',monospace">
          </div>
        </div>

        <!-- Preferences -->
        <div style="display:flex;flex-direction:column;gap:16px">
          <!-- Language -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">Language & Region</div>
            </div>
            <div class="capi-row">
              <div>
                <div style="font-size:13px;font-weight:600">Interface Language</div>
                <div style="font-size:12px;color:var(--text-2)" id="lang-label">${currentLang === 'ta' ? 'தமிழ் (Tamil)' : 'English'}</div>
              </div>
              <div class="toggle ${currentLang === 'ta' ? 'on' : ''}" id="lang-toggle" onclick="settingsToggleLang()"></div>
            </div>
            <div class="capi-row">
              <div>
                <div style="font-size:13px;font-weight:600">Currency</div>
                <div style="font-size:12px;color:var(--text-2)">INR (₹) — Indian Rupee</div>
              </div>
              <span class="badge badge-neutral">Fixed</span>
            </div>
            <div class="capi-row">
              <div>
                <div style="font-size:13px;font-weight:600">Timezone</div>
                <div style="font-size:12px;color:var(--text-2)">IST (Asia/Kolkata) UTC+5:30</div>
              </div>
              <span class="badge badge-success">Auto</span>
            </div>
            <div class="capi-row" style="border:none">
              <div>
                <div style="font-size:13px;font-weight:600">Date Format</div>
                <div style="font-size:12px;color:var(--text-2)">DD MMM YYYY — Indian standard</div>
              </div>
            </div>
          </div>

          <!-- Notifications -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">Notification Preferences</div>
            </div>
            ${[
              { label: 'New lead toast alerts', on: true },
              { label: 'SLA breach alerts (15 min)', on: true },
              { label: 'Token expiry warnings', on: true },
              { label: 'Daily summary email (6 AM IST)', on: false },
              { label: 'WhatsApp delivery failures', on: true },
            ].map(s => `
              <div class="capi-row" style="${s === 'WhatsApp delivery failures' ? 'border:none' : ''}">
                <span style="font-size:13px">${s.label}</span>
                <div class="toggle ${s.on ? 'on' : ''}" onclick="this.classList.toggle('on');LP.toast.info('Preference updated','')"></div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Billing Plans -->
      <div class="card" style="margin-bottom:24px">
        <div class="card-header">
          <div>
            <div class="card-title">Billing Plans</div>
            <div class="card-subtitle">GST 18% applicable · Razorpay UPI/Card · HSN 998314</div>
          </div>
          <span class="badge badge-success">₹ INR Billing</span>
        </div>
        <div class="grid-2">
          <div class="plan-card ${currentPlan === 'starter' ? 'active' : ''}" data-plan="starter" onclick="selectPlan('starter')">
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--text-3);margin-bottom:12px;letter-spacing:0.08em">Starter</div>
            <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:4px">
              <div class="plan-price">₹4,999</div>
              <div class="plan-period">/month</div>
            </div>
            <div style="font-size:11px;color:var(--text-3);margin-bottom:16px">₹5,898/mo incl. 18% GST</div>
            <div style="display:flex;flex-direction:column;gap:4px">
              ${[
                'Up to 5 clients',
                '500 leads/month',
                'Meta webhook + Graph API',
                'WhatsApp Cloud API',
                'Basic analytics',
                'Email support',
              ].map(f => `<div class="plan-feature"><span class="check">✓</span>${f}</div>`).join('')}
            </div>
            <button class="btn btn-secondary" style="width:100%;margin-top:16px;font-size:13px">
              ${currentPlan === 'starter' ? '✓ Current Plan' : 'Select Starter'}
            </button>
          </div>

          <div class="plan-card popular ${currentPlan === 'pro' ? 'active' : ''}" data-plan="pro" onclick="selectPlan('pro')">
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--meta);margin-bottom:12px;letter-spacing:0.08em">Pro Agency</div>
            <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:4px">
              <div class="plan-price" style="background:linear-gradient(90deg,var(--meta),var(--violet));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">₹14,999</div>
              <div class="plan-period">/month</div>
            </div>
            <div style="font-size:11px;color:var(--text-3);margin-bottom:16px">₹17,698/mo incl. 18% GST</div>
            <div style="display:flex;flex-direction:column;gap:4px">
              ${[
                'Unlimited clients',
                'Unlimited leads',
                'Real-time webhook + CAPI',
                'WhatsApp + Exotel + IVR',
                'Zoho / HubSpot sync',
                'Tamil UI + Multi-language',
                'SLA alerts + Audit log',
                'Priority support (Chennai)',
                'Custom domain',
              ].map(f => `<div class="plan-feature"><span class="check">✓</span>${f}</div>`).join('')}
            </div>
            <button class="btn btn-primary" style="width:100%;margin-top:16px;font-size:13px">
              ${currentPlan === 'pro' ? '✓ Current Plan' : 'Upgrade to Pro →'}
            </button>
          </div>
        </div>
      </div>

      <!-- India Compliance -->
      <div class="card" style="margin-bottom:24px">
        <div class="card-header">
          <div class="card-title">🇮🇳 India Compliance & App Review</div>
          <div class="card-subtitle">Required for Meta App Review — Chennai agency</div>
        </div>
        <div class="grid-2">
          <div>
            <div class="drawer-section-title">Meta App Review Checklist</div>
            ${[
              { key: 'verify',     label: 'Business Verification — GSTIN + Domain', done: true },
              { key: 'privacy',    label: 'Privacy Policy URL — /privacy (EN + Tamil)', done: true },
              { key: 'tos',        label: 'Terms of Service — /terms', done: true },
              { key: 'deletion',   label: 'Data Deletion Callback — POST /meta/data-deletion', done: true },
              { key: 'screencast', label: 'App Review Screencast — lead retrieval + WhatsApp demo', done: false },
            ].map(item => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
                <input type="checkbox" style="accent-color:var(--meta);width:15px;height:15px;cursor:pointer"
                  ${item.done ? 'checked' : ''} id="chk-${item.key}"
                  onchange="localStorage.setItem('lp_chk_${item.key}', this.checked?'1':'0')">
                <label for="chk-${item.key}" style="cursor:pointer;flex:1">${item.label}</label>
                ${item.done ? '<span class="badge badge-success" style="font-size:10px">Done</span>' : '<span class="badge badge-warning" style="font-size:10px">Pending</span>'}
              </div>
            `).join('')}
          </div>
          <div>
            <div class="drawer-section-title">DLT Compliance (India Telecom)</div>
            <div style="font-size:12.5px;color:var(--text-2);line-height:1.9">
              <div style="padding:6px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between">
                <span>PE (Principal Entity) ID</span>
                <strong class="mono">1101826370000012345</strong>
              </div>
              <div style="padding:6px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between">
                <span>Template ID (Tamil)</span>
                <strong class="mono">1107163160000034567</strong>
              </div>
              <div style="padding:6px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between">
                <span>Template ID (English)</span>
                <strong class="mono">1107163160000034568</strong>
              </div>
              <div style="padding:6px 0;display:flex;justify-content:space-between">
                <span>Status</span>
                <span class="badge badge-success">Approved</span>
              </div>
            </div>
            <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:12px;margin-top:12px;font-size:12px;color:var(--text-2)">
              💡 Meta India reviewers expect a Chennai business address and working WhatsApp opt-in demo in the screencast.
            </div>
          </div>
        </div>
      </div>

      <!-- Security -->
      <div class="card" style="margin-bottom:24px">
        <div class="card-header">
          <div class="card-title">🔒 Security & Data</div>
        </div>
        <div class="grid-2">
          <div>
            ${[
              { label: 'Token encryption (AES-256)', value: 'AWS KMS Mumbai', ok: true },
              { label: 'Data residency', value: 'ap-south-1 only (Mumbai)', ok: true },
              { label: 'HTTPS / TLS', value: '1.3 enforced', ok: true },
              { label: 'IP allowlist', value: '203.x.x.x (Chennai)', ok: true },
              { label: 'Two-factor auth', value: 'Not configured', ok: false },
            ].map(s => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:12.5px">
                <div>
                  <span style="color:var(--text-2)">${s.label}</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                  <span>${s.value}</span>
                  <span style="color:${s.ok ? 'var(--success)' : 'var(--warning)'}">${s.ok ? '✓' : '⚠'}</span>
                </div>
              </div>
            `).join('')}
          </div>
          <div>
            <button class="btn btn-danger" style="width:100%;margin-bottom:10px" onclick="LP.toast.warning('Data deletion scheduled','All PII will be purged in 30 days per IT Act')">
              🗑 Request Data Deletion
            </button>
            <button class="btn btn-secondary" style="width:100%;margin-bottom:10px" onclick="LP.toast.success('Export started','GDPR/IT Act data export will be emailed')">
              📤 Export All Data
            </button>
            <button class="btn btn-secondary" style="width:100%" onclick="LP.toast.info('2FA setup','Enable via your Google Authenticator app')">
              🔐 Enable 2FA
            </button>
          </div>
        </div>
      </div>

      <!-- Audit Log -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Audit Log</div>
            <div class="card-subtitle">All actions for IT Act compliance (last 30 days)</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="LP.toast.success('Audit log exported!','CSV downloaded')">
            📥 Export
          </button>
        </div>
        ${LP.data.auditLog.map(entry => `
          <div class="audit-row">
            <div class="audit-time">${formatTs(entry.ts)}</div>
            <div class="audit-user">${entry.user}</div>
            <div class="audit-action">${entry.action}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function init(container) {
    container.innerHTML = render();
    container.classList.add('fade-in');
  }

  function destroy() {}

  return { render, init, destroy };
})();

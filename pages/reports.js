// ============================================================
// FWL CRM — Reports Page (fully data-driven, no fake numbers)
// ============================================================

window.LP = window.LP || {};
LP.pages = LP.pages || {};

LP.pages.reports = (() => {
  // Compute last 7 days lead volume from LP.data.leads
  function getLast7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
      const dateStr = d.toISOString().slice(0, 10);
      const count = (LP.data.leads || []).filter(l => {
        const ld = new Date(l.createdAt || l.created_at);
        return ld.toISOString().slice(0, 10) === dateStr;
      }).length;
      days.push({ label, count });
    }
    return days;
  }

  function getPipelineBreakdown() {
    const leads = LP.data.leads || [];
    const total = leads.length;
    const statuses = ['new', 'contacted', 'qualified', 'converted', 'lost'];
    const colors = {
      new: '#0EA5E9', contacted: '#F59E0B', qualified: '#8B5CF6',
      converted: '#10B981', lost: '#EF4444'
    };
    return statuses.map(s => ({
      label: s.charAt(0).toUpperCase() + s.slice(1),
      count: leads.filter(l => l.status === s).length,
      pct: total > 0 ? Math.round((leads.filter(l => l.status === s).length / total) * 100) : 0,
      color: colors[s]
    }));
  }

  function getSourceBreakdown() {
    const leads = LP.data.leads || [];
    const fb = leads.filter(l => l.source === 'facebook').length;
    const ig = leads.filter(l => l.source === 'instagram').length;
    const total = fb + ig || 1;
    return [
      { label: 'Facebook', count: fb, pct: Math.round(fb / total * 100), color: '#1877F2' },
      { label: 'Instagram', count: ig, pct: Math.round(ig / total * 100), color: '#D946EF' }
    ];
  }

  function render() {
    const s = LP.data.stats;
    const leads = LP.data.leads || [];
    const total = leads.length;

    // Compute real KPI values
    const qualifiedCount = leads.filter(l => l.status === 'qualified' || l.status === 'converted').length;
    const qualRate = total > 0 ? ((qualifiedCount / total) * 100).toFixed(1) : '0.0';
    const avgResponseMin = s ? Math.round(s.avgResponse / 60) : 0;
    const avgCPL = s ? Math.round(s.avgCPL) : 0;
    const days = getLast7Days();
    const maxDay = Math.max(...days.map(d => d.count), 1);
    const pipeline = getPipelineBreakdown();
    const sources = getSourceBreakdown();

    const isEmpty = total === 0;

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Performance Reports</h1>
          <div class="page-subtitle">Live metrics from your Meta Lead Ads — Earney Digital Service Solutions</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <div class="live-pill" style="font-size:10px;padding:3px 8px"><div class="live-dot"></div> LIVE DATA</div>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid" style="margin-bottom:24px">
        <div class="kpi-card" style="--kpi-color:var(--meta)">
          <div class="kpi-icon" style="--kpi-icon-bg:var(--meta-dim);color:var(--meta)">
            <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <div class="kpi-label">Total Leads</div>
          <div class="kpi-value tabular-nums">${LP.utils.formatNumber(total)}</div>
          <div class="kpi-delta ${s && s.leadsToday > 0 ? 'up' : 'up'}">
            +${s ? s.leadsToday : 0} today
          </div>
        </div>

        <div class="kpi-card" style="--kpi-color:var(--success)">
          <div class="kpi-icon" style="--kpi-icon-bg:var(--success-dim);color:var(--success)">
            <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="kpi-label">Qualification Rate</div>
          <div class="kpi-value tabular-nums">${isEmpty ? '—' : qualRate + '%'}</div>
          <div class="kpi-delta up">${qualifiedCount} qualified leads</div>
        </div>

        <div class="kpi-card" style="--kpi-color:var(--danger)">
          <div class="kpi-icon" style="--kpi-icon-bg:var(--danger-dim);color:var(--danger)">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="kpi-label">Avg. Response Time</div>
          <div class="kpi-value tabular-nums">${isEmpty ? '—' : (avgResponseMin < 1 ? '<1m' : avgResponseMin + 'm')}</div>
          <div class="kpi-delta up">From lead arrival to contact</div>
        </div>

        <div class="kpi-card" style="--kpi-color:var(--amber)">
          <div class="kpi-icon" style="--kpi-icon-bg:var(--amber-dim);color:var(--amber)">
            <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="kpi-label">Avg Cost Per Lead (CPL)</div>
          <div class="kpi-value tabular-nums">${isEmpty || avgCPL === 0 ? '—' : '₹' + LP.utils.formatNumber(avgCPL)}</div>
          <div class="kpi-delta up">Tracked per client campaign</div>
        </div>
      </div>

      <div class="grid-2" style="margin-bottom:24px">
        <!-- Pipeline Breakdown -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Leads by Status</div>
              <div class="card-subtitle">Pipeline breakdown — all time</div>
            </div>
            <span class="badge badge-neutral" style="font-size:10px">${total} total</span>
          </div>
          ${isEmpty ? `
            <div class="empty-state" style="height:200px;border:none;background:transparent">
              ${LP.icons.get('pie-chart', 'icon-lg')}
              <div style="margin-top:12px;font-weight:500;color:var(--text-2)">No leads yet</div>
              <div style="font-size:12px">Submit a test lead via Meta Lead Ads Testing Tool</div>
            </div>
          ` : `
            <div style="display:flex;flex-direction:column;gap:10px">
              ${pipeline.map(p => `
                <div>
                  <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
                    <span style="font-weight:500;color:${p.color}">${p.label}</span>
                    <span class="tabular-nums" style="color:var(--text-3)">${p.count} (${p.pct}%)</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width:${p.pct}%;background:${p.color}"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Source Breakdown -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Lead Source Split</div>
              <div class="card-subtitle">Facebook vs Instagram</div>
            </div>
          </div>
          ${isEmpty ? `
            <div class="empty-state" style="height:200px;border:none;background:transparent">
              ${LP.icons.get('bar-chart-3', 'icon-lg')}
              <div style="margin-top:12px;font-weight:500;color:var(--text-2)">No source data yet</div>
            </div>
          ` : `
            <div style="display:flex;flex-direction:column;gap:10px">
              ${sources.map(src => `
                <div>
                  <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
                    <div style="display:flex;align-items:center;gap:6px">
                      <div style="width:10px;height:10px;border-radius:2px;background:${src.color}"></div>
                      <span style="font-weight:500">${src.label}</span>
                    </div>
                    <span class="tabular-nums" style="color:var(--text-3)">${src.count} (${src.pct}%)</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width:${src.pct}%;background:${src.color}"></div>
                  </div>
                </div>
              `).join('')}
            </div>
            <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">
              <div style="display:flex;gap:16px">
                ${sources.map(src => `
                  <div style="flex:1;text-align:center;padding:12px;background:var(--surface-2);border-radius:8px">
                    <div style="font-size:20px;font-weight:700;color:${src.color}" class="tabular-nums">${src.count}</div>
                    <div style="font-size:11px;color:var(--text-3);margin-top:2px">${src.label}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          `}
        </div>
      </div>

      <!-- Volume Over Time — Last 7 Days -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Lead Volume — Last 7 Days</div>
            <div class="card-subtitle">Daily lead arrivals via Meta webhook</div>
          </div>
          <span class="badge badge-neutral" style="font-size:10px">
            ${days.reduce((a,b) => a + b.count, 0)} leads this week
          </span>
        </div>
        ${days.every(d => d.count === 0) ? `
          <div class="empty-state" style="height:160px;border:none;background:transparent">
            ${LP.icons.get('activity', 'icon-lg')}
            <div style="margin-top:12px;font-weight:500;color:var(--text-2)">No leads in the last 7 days</div>
            <div style="font-size:12px">Use Meta Lead Ads Testing Tool to send your first live lead</div>
          </div>
        ` : `
          <div style="display:flex;align-items:flex-end;gap:8px;padding:12px 0;height:160px">
            ${days.map(d => `
              <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:4px">
                <span style="font-size:10px;font-weight:600;color:var(--text-2)" class="tabular-nums">${d.count > 0 ? d.count : ''}</span>
                <div style="width:100%;background:var(--meta);border-radius:4px 4px 0 0;transition:height 0.4s;min-height:${d.count > 0 ? 4 : 0}px;height:${Math.max(d.count/maxDay*120, d.count > 0 ? 4 : 0)}px;opacity:0.85"></div>
                <span style="font-size:10px;color:var(--text-3)">${d.label}</span>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }

  function renderTable() {
    const content = document.getElementById('page-content');
    if (content && LP.router.current === 'calendar') return; // safety
    if (content && LP.router.current === 'reports') {
      content.innerHTML = render();
    }
  }


  async function loadWaAnalytics() {
    const el = document.getElementById('wa-analytics-card');
    if (!el) return;
    try {
      const res = await fetch('/api/analytics-whatsapp');
      if (!res.ok) throw new Error();
      const d = await res.json();
      const fr = d.avgFirstResponseSeconds != null
        ? LP.utils.formatDuration(d.avgFirstResponseSeconds) : '-';
      const kpi = (label, val, color) => `
        <div style="padding:12px;border:1px solid var(--border-0);border-radius:8px;min-width:120px;flex:1">
          <div style="font-size:11px;color:var(--text-3)">${label}</div>
          <div style="font-size:20px;font-weight:700;color:${color || 'var(--text-1)'}" class="tabular-nums">${val}</div>
        </div>`;
      el.innerHTML = `
        <div class="card-header"><div>
          <div class="card-title">WhatsApp Performance</div>
          <div class="card-subtitle">Conversations, response time and pipeline from the WhatsApp inbox</div>
        </div></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;padding:14px">
          ${kpi('Conversations', d.totals.conversations)}
          ${kpi('Open', d.totals.open, 'var(--accent)')}
          ${kpi('Unread', d.totals.unread, 'var(--warning)')}
          ${kpi('WA Leads', d.leads.total)}
          ${kpi('Converted', d.leads.converted, 'var(--success)')}
          ${kpi('Revenue', LP.utils.formatCurrency(d.leads.revenue), 'var(--success)')}
          ${kpi('Avg first response', fr)}
          ${kpi('Overdue follow-ups', d.overdueFollowups, d.overdueFollowups > 0 ? 'var(--danger)' : 'var(--text-1)')}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:0 14px 14px">
          <div>
            <div class="drawer-section-title">By owner</div>
            ${(d.byOwner || []).map(o => `
              <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border-0)">
                <span>${o.owner}</span><span class="tabular-nums">${o.conversations} conv &middot; ${o.converted} won</span>
              </div>`).join('') || '<div style="font-size:12px;color:var(--text-3)">No data</div>'}
          </div>
          <div>
            <div class="drawer-section-title">By client</div>
            ${(d.byClient || []).map(c => `
              <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border-0)">
                <span>${c.client || 'Unlinked'}</span><span class="tabular-nums">${c.conversations} conv &middot; ${LP.utils.formatCurrency(c.revenue)}</span>
              </div>`).join('') || '<div style="font-size:12px;color:var(--text-3)">No data</div>'}
          </div>
        </div>`;
    } catch (_) {
      el.innerHTML = '<div style="padding:14px;font-size:12px;color:var(--text-3)">WhatsApp analytics unavailable</div>';
    }
  }

  function init(container) {
    container.innerHTML = render() + '<div class="card" id="wa-analytics-card" style="margin-top:16px"><div class="skeleton" style="height:100px;margin:14px"></div></div>';
    loadWaAnalytics();
    container.classList.add('fade-in');
  }

  function destroy() {}

  return { render, init, destroy, renderTable };
})();

// ============================================================
// FWL CRM — Dashboard Page
// KPIs, live feed, SLA alerts, source breakdown
// ============================================================

window.LP = window.LP || {};

LP.pages = LP.pages || {};

LP.pages.dashboard = (() => {
  let streamUnsubscribe = null;
  let slaTimer = null;

  function sourceBadge(source) {
    if (source === 'instagram') return `<span class="badge badge-ig" style="padding:2px 6px;display:inline-flex;align-items:center;gap:3px"><img src="/icons/instagram.png" style="width:13px;height:13px;object-fit:contain;vertical-align:middle;border-radius:2px"> IG</span>`;
    return `<span class="badge badge-fb" style="padding:2px 6px;display:inline-flex;align-items:center;gap:3px"><img src="/icons/facebook.png" style="width:13px;height:13px;object-fit:contain;vertical-align:middle;border-radius:2px"> FB</span>`;
  }

  function renderKPIs() {
    // If stats don't exist yet, show skeleton
    if (!LP.data || !LP.data.stats) {
      return `
        <div class="kpi-grid stagger">
          ${[1,2,3,4].map(() => `
            <div class="kpi-card skeleton" style="height:120px;padding:24px;border-color:transparent"></div>
          `).join('')}
        </div>
      `;
    }

    const s = LP.data.stats;
    const { formatNumber, formatCurrency, formatDelta } = LP.utils;
    const { get } = LP.icons;

    return `
      <div class="kpi-grid stagger">
        <div class="kpi-card" style="--kpi-color:#1877F2;--kpi-icon-bg:rgba(24,119,242,0.12)">
          <div class="kpi-icon" style="color:#1877F2">${get('users', 'icon-md')}</div>
          <div class="kpi-value tabular-nums" id="kpi-leads">${formatNumber(s.leadsToday)}</div>
          <div class="kpi-label">Leads Today</div>
          <div class="kpi-delta ${s.leadsToday >= s.leadsYesterday ? 'up' : 'down'}">
            ${formatDelta(s.leadsToday - s.leadsYesterday)} vs yesterday
          </div>
          <svg class="kpi-sparkline" width="80" height="40" viewBox="0 0 80 40">
            <polyline points="0,35 15,28 30,32 45,20 60,15 75,8" fill="none" stroke="#1877F2" stroke-width="2"/>
          </svg>
        </div>
        <div class="kpi-card" style="--kpi-color:#10B981;--kpi-icon-bg:rgba(16,185,129,0.12)">
          <div class="kpi-icon" style="color:#10B981">${get('badge-indian-rupee', 'icon-md')}</div>
          <div class="kpi-value tabular-nums" id="kpi-cpl">${formatCurrency(s.avgCPL)}</div>
          <div class="kpi-label">Avg Cost Per Lead</div>
          <div class="kpi-delta up">${s.avgCPL > 0 ? 'Updated via real leads' : 'Will track once leads arrive'}</div>
          <svg class="kpi-sparkline" width="80" height="40" viewBox="0 0 80 40">
            <polyline points="0,10 15,15 30,12 45,20 60,25 75,30" fill="none" stroke="#10B981" stroke-width="2"/>
          </svg>
        </div>
        <div class="kpi-card" style="--kpi-color:#F59E0B;--kpi-icon-bg:rgba(245,158,11,0.12)">
          <div class="kpi-icon" style="color:#F59E0B">${get('clock', 'icon-md')}</div>
          <div class="kpi-value tabular-nums" id="kpi-rt">${LP.utils.formatDuration(s.avgResponse)}</div>
          <div class="kpi-label">Avg Response Time</div>
          <div class="kpi-delta up">${s.avgResponse > 0 ? 'Avg across all leads' : 'Tracked from first contact'}</div>
          <svg class="kpi-sparkline" width="80" height="40" viewBox="0 0 80 40">
            <polyline points="0,8 15,18 30,14 45,25 60,20 75,15" fill="none" stroke="#F59E0B" stroke-width="2"/>
          </svg>
        </div>
        <div class="kpi-card" style="--kpi-color:#6C47FF;--kpi-icon-bg:rgba(108,71,255,0.12)">
          <div class="kpi-icon" style="color:#6C47FF">${get('bar-chart-3', 'icon-md')}</div>
          <div class="kpi-value tabular-nums" id="kpi-conv">${s.convRate || '0%'}</div>
          <div class="kpi-label">Conversion Rate</div>
          <div class="kpi-delta up">${s.wonTotal > 0 ? s.wonTotal + ' converted deals' : 'Will track conversions'}</div>
          <svg class="kpi-sparkline" width="80" height="40" viewBox="0 0 80 40">
            <polyline points="0,30 15,25 30,28 45,18 60,14 75,10" fill="none" stroke="#6C47FF" stroke-width="2"/>
          </svg>
        </div>
      </div>
    `;
  }

  function renderSLAAlerts() {
    if (!LP.data || !LP.data.leads) return '';
    const breached = LP.data.leads.filter(l => l.status === 'new' && l.slaBreached).slice(0, 3);
    if (!breached.length) return '';

    return `
      <div class="card mb-16" style="border-color:var(--danger-dim);background:rgba(239,68,68,0.04)">
        <div class="card-header">
          <div>
            <div class="card-title status-error" style="display:flex;align-items:center;gap:6px">
              ${LP.icons.get('alert-circle', 'icon-sm')} SLA Breaches — ${breached.length} lead${breached.length > 1 ? 's' : ''} uncontacted
            </div>
            <div class="card-subtitle">Leads not contacted within 15 minutes — 71% loss risk</div>
          </div>
          <span class="badge badge-danger">${breached.length} URGENT</span>
        </div>
        ${breached.map(l => `
          <div class="sla-alert" data-lead-id="${l.id}">
            <span class="sla-icon status-error">${LP.icons.get('alert-circle', 'icon-sm')}</span>
            <div class="sla-text">
              <div class="sla-name">${l.name}</div>
              <div class="sla-sub">${l.campaign} · ${l.clientName} · ${LP.utils.formatRelativeTime(l.createdAt)}</div>
            </div>
            <span class="badge badge-fb" style="font-size:10px">${l.source === 'instagram' ? 'IG' : 'FB'}</span>
            <button class="btn btn-success btn-sm" onclick="LP.toast.success('WhatsApp sent!','Template dispatched to ${l.phone}')" style="display:flex;align-items:center;gap:4px">
              ${LP.icons.get('message-circle', 'icon-sm')} WhatsApp
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderFeedItem(lead) {
    return `
      <div class="feed-item" data-lead-id="${lead.id}">
        <div class="feed-avatar" style="background:linear-gradient(135deg,${lead.avatarColor},#6C47FF)">
          ${lead.initials}
        </div>
        <div class="feed-info">
          <div class="feed-name">${lead.name}</div>
          <div class="feed-meta">
            ${sourceBadge(lead.source)} · ${lead.clientName} · ${lead.campaign.substring(0,28)}${lead.campaign.length>28?'…':''}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div class="feed-time">${LP.utils.formatRelativeTime(lead.createdAt)}</div>
          <span class="badge badge-${lead.status}" style="margin-top:4px;display:inline-flex">${lead.status}</span>
        </div>
      </div>
    `;
  }

  function renderSourceChart() {
    if (!LP.data || !LP.data.leads) return '<div class="skeleton" style="height:200px"></div>';
    
    const fbCount = LP.data.leads.filter(l => l.source === 'facebook').length;
    const igCount = LP.data.leads.filter(l => l.source === 'instagram').length;
    const total = fbCount + igCount;
    
    const fbPct = total === 0 ? 0 : Math.round((fbCount / total) * 100);
    const igPct = total === 0 ? 0 : 100 - fbPct;

    const clientBreakdown = LP.data.clients ? LP.data.clients.slice(0, 5).map(c => ({
      name: c.name.split(' ')[0],
      value: c.leadsToday,
      color: c.color,
    })) : [];
    
    const maxVal = clientBreakdown.length ? Math.max(...clientBreakdown.map(c => c.value)) : 1;

    let sourceContent = '';
    if (total === 0) {
      sourceContent = `
        <div class="empty-state" style="height:150px;border:none;background:transparent">
          ${LP.icons.get('pie-chart', 'icon-lg')}
          <div style="margin-top:12px;font-weight:500;color:var(--text-2)">No source data</div>
          <div style="font-size:12px">Waiting for leads to arrive</div>
        </div>
      `;
    } else {
      sourceContent = `
        <div class="donut-wrap">
          <svg width="90" height="90" viewBox="0 0 90 90" style="flex-shrink:0">
            <circle cx="45" cy="45" r="38" fill="none" stroke="var(--surface-3)" stroke-width="12"/>
            <circle cx="45" cy="45" r="38" fill="none" stroke="#1877F2" stroke-width="12"
              stroke-dasharray="${fbPct * 2.39} ${(100-fbPct) * 2.39}"
              stroke-dashoffset="0" transform="rotate(-90 45 45)"/>
            <circle cx="45" cy="45" r="38" fill="none" stroke="#D946EF" stroke-width="12"
              stroke-dasharray="${igPct * 2.39} ${(100-igPct) * 2.39}"
              stroke-dashoffset="${-fbPct * 2.39}" transform="rotate(-90 45 45)"/>
            <text x="45" y="49" text-anchor="middle" fill="var(--text-1)" font-size="13" font-weight="700">${LP.utils.formatNumber(total)}</text>
          </svg>
          <div class="donut-legend">
            <div class="legend-item">
              <img src="/icons/facebook.png" style="width:16px;height:16px;object-fit:contain;border-radius:3px;flex-shrink:0">
              <div class="legend-label">Facebook</div>
              <div class="legend-value tabular-nums">${LP.utils.formatNumber(fbCount)} <span style="color:var(--text-3);font-weight:400">(${fbPct}%)</span></div>
            </div>
            <div class="legend-item">
              <img src="/icons/instagram.png" style="width:16px;height:16px;object-fit:contain;border-radius:3px;flex-shrink:0">
              <div class="legend-label">Instagram</div>
              <div class="legend-value tabular-nums">${LP.utils.formatNumber(igCount)} <span style="color:var(--text-3);font-weight:400">(${igPct}%)</span></div>
            </div>
          </div>
        </div>
      `;
    }

    let clientsContent = '';
    if (clientBreakdown.length === 0 || maxVal === 0) {
      clientsContent = `
        <div class="empty-state" style="height:150px;border:none;background:transparent">
          ${LP.icons.get('briefcase', 'icon-lg')}
          <div style="margin-top:12px;font-weight:500;color:var(--text-2)">No client activity</div>
        </div>
      `;
    } else {
      clientsContent = `
        <div class="bar-chart">
          ${clientBreakdown.map(c => `
            <div class="bar-col">
              <div class="bar" style="height:${Math.max(8, c.value/maxVal*70)}px;background:${c.color}"></div>
              <div class="bar-label">${c.name}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    return `
      <div class="grid-2" style="margin-bottom:24px">
        <!-- Source breakdown -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Lead Sources</div>
              <div class="card-subtitle">Today's split</div>
            </div>
          </div>
          ${sourceContent}
        </div>

        <!-- Client breakdown bar chart -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Top Clients Today</div>
              <div class="card-subtitle">Leads received</div>
            </div>
          </div>
          ${clientsContent}
        </div>
      </div>
    `;
  }

  function render() {
    const recentLeads = LP.data?.leads ? LP.data.leads.slice(0, 20) : [];
    
    let feedContent = '';
    if (!LP.data || !LP.data.leads) {
      feedContent = [1,2,3,4,5].map(() => `<div class="feed-item skeleton" style="height:50px;border:none"></div>`).join('');
    } else if (recentLeads.length === 0) {
      feedContent = `
        <div class="empty-state">
          ${LP.icons.get('inbox', 'icon-lg')}
          <div style="margin-top:16px;font-weight:500;color:var(--text-1)">No leads yet</div>
          <div style="margin-top:4px;font-size:13px">Your live feed will populate here</div>
        </div>
      `;
    } else {
      feedContent = recentLeads.map(renderFeedItem).join('');
    }

    const leadsTotal = LP.data?.leads ? LP.data.leads.length : 0;

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title gradient-text">Good morning, Kawin 👋</h1>
          <div class="page-subtitle">Here's what's happening with your Earney campaigns right now</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="live-pill">
            <div class="live-dot"></div>
            LIVE
          </div>
          <button class="btn btn-primary btn-sm" onclick="LP.router.navigate('leads')">
            View All Leads →
          </button>
        </div>
      </div>

      ${renderKPIs()}
      ${renderSLAAlerts()}
      ${renderSourceChart()}

      <div class="grid-2">
        <!-- Live feed -->
        <div class="card" style="grid-column:span 1;display:flex;flex-direction:column">
          <div class="card-header">
            <div>
              <div class="card-title">Live Lead Feed</div>
              <div class="card-subtitle">Real-time via Meta webhook</div>
            </div>
            <div class="live-pill" style="font-size:10px;padding:3px 8px">
              <div class="live-dot"></div> LIVE
            </div>
          </div>
          <div class="live-feed" id="live-feed" style="flex:1">
            ${feedContent}
          </div>
        </div>

        <!-- Right column -->
        <div style="display:flex;flex-direction:column;gap:16px">
          <!-- Pipeline summary -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">Pipeline Status</div>
            </div>
            ${['new','contacted','qualified','won','lost'].map(status => {
              const count = LP.data?.leads ? LP.data.leads.filter(l => l.status === status).length : 0;
              const pct = leadsTotal === 0 ? 0 : Math.round((count / leadsTotal) * 100);
              const colors = { new:'#0EA5E9', contacted:'#F59E0B', qualified:'#8B5CF6', won:'#10B981', lost:'#EF4444' };
              return `
                <div style="margin-bottom:12px">
                  <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
                    <span style="text-transform:capitalize;font-weight:500">${status}</span>
                    <span style="color:var(--text-3)" class="tabular-nums">${LP.utils.formatNumber(count)} leads (${pct}%)</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width:${pct}%;background:${colors[status]}"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Webhook status -->
          <div class="card">
            <div class="card-header">
              <div class="card-title" style="display:flex;align-items:center;gap:6px">
                ${LP.icons.get('plug', 'icon-sm')} Webhook Status
              </div>
              <span class="badge badge-success" style="display:flex;align-items:center;gap:4px">
                <div class="live-dot" style="background:var(--success);box-shadow:none"></div> Active
              </span>
            </div>
            <div style="font-size:12.5px;color:var(--text-2);line-height:1.8">
              <div class="flex-between" style="padding:4px 0;border-bottom:1px solid var(--border)">
                <span>Total received (all time)</span>
                <strong class="text-meta tabular-nums">${LP.utils.formatNumber(LP.data.stats ? LP.data.stats.totalLeads : 0)}</strong>
              </div>
              <div class="flex-between" style="padding:4px 0;border-bottom:1px solid var(--border)">
                <span>Webhook URL</span>
                <strong style="font-size:10px;color:var(--text-3)">fwl-crm.vercel.app/api/webhook</strong>
              </div>
              <div class="flex-between" style="padding:4px 0;border-bottom:1px solid var(--border)">
                <span>Failed (24h)</span>
                <strong class="text-success tabular-nums">0</strong>
              </div>
              <div class="flex-between" style="padding:4px 0">
                <span>Status</span>
                <strong class="text-success">● Active</strong>
              </div>
            </div>
          </div>

          <!-- Quick stats -->
          <div class="card">
            <div class="card-header">
              <div class="card-title" style="display:flex;align-items:center;gap:6px">
                ${LP.icons.get('activity', 'icon-sm')} CAPI Performance
              </div>
            </div>
            <div style="font-size:12.5px;color:var(--text-2);line-height:1.8">
              <div class="flex-between" style="padding:4px 0;border-bottom:1px solid var(--border)">
                <span>Pixel ID</span>
                <strong class="text-meta tabular-nums" style="font-size:10px">1116116109133710</strong>
              </div>
              <div class="flex-between" style="padding:4px 0;border-bottom:1px solid var(--border)">
                <span>Events fired today</span>
                <strong class="tabular-nums">${LP.data.stats ? LP.data.stats.leadsToday : 0}</strong>
              </div>
              <div class="flex-between" style="padding:4px 0">
                <span>Status</span>
                <strong class="text-success">● Verified &amp; Active</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function init(container) {
    container.innerHTML = render();
    container.classList.add('fade-in');

    if (!LP.data || !LP.data.leads) {
      // Data isn't loaded yet, let app.js re-render later or we can wait
      // But in this SPA, app.js already handles fetching and re-rendering via DOMContentLoaded
    }

    // Clickable SLA alerts
    container.querySelectorAll('.sla-alert[data-lead-id]').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        const lead = LP.data.leads.find(l => l.id === el.dataset.leadId);
        if (lead) LP.drawer.open(lead);
      });
    });

    // Clickable feed items
    container.querySelectorAll('.feed-item[data-lead-id]').forEach(el => {
      el.addEventListener('click', () => {
        const lead = LP.data.leads.find(l => l.id === el.dataset.leadId);
        if (lead) LP.drawer.open(lead);
      });
    });

    // Subscribe to live lead stream
    if (LP.stream) {
      streamUnsubscribe = LP.stream.on(lead => {
        // Update KPI
        const kpiEl = document.getElementById('kpi-leads');
        if (kpiEl && LP.data && LP.data.stats) {
          kpiEl.textContent = LP.utils.formatNumber(LP.data.stats.leadsToday);
          kpiEl.parentElement.style.animation = 'none';
          requestAnimationFrame(() => {
            kpiEl.parentElement.style.animation = '';
            kpiEl.parentElement.style.boxShadow = '0 0 0 3px rgba(24,119,242,0.3)';
            setTimeout(() => { kpiEl.parentElement.style.boxShadow = ''; }, 800);
          });
        }

        // Prepend to feed
        const feed = document.getElementById('live-feed');
        if (feed) {
          // Remove empty state if present
          if (feed.querySelector('.empty-state')) feed.innerHTML = '';
          const div = document.createElement('div');
          div.innerHTML = renderFeedItem(lead);
          const item = div.firstElementChild;
          item.addEventListener('click', () => LP.drawer.open(lead));
          feed.insertBefore(item, feed.firstChild);
          // Trim to 20
          while (feed.children.length > 20) feed.lastChild.remove();
        }

        // Toast
        if (LP.toast) LP.toast.newLead(lead);
      });
    }

    // SLA timer check every 60s
    slaTimer = setInterval(() => {
      if (!LP.data || !LP.data.leads) return;
      const breached = LP.data.leads.filter(l => l.status === 'new' && !l.slaBreached);
      breached.forEach(l => {
        const mins = (Date.now() - new Date(l.createdAt)) / 60000;
        if (mins > 15) {
          l.slaBreached = true;
          if (LP.toast) LP.toast.slaAlert(l.name);
        }
      });
    }, 60000);
  }

  function destroy() {
    if (streamUnsubscribe) streamUnsubscribe();
    if (slaTimer) clearInterval(slaTimer);
    streamUnsubscribe = null;
    slaTimer = null;
  }

  return { render, init, destroy };
})();

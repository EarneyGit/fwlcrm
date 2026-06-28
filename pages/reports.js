// ============================================================
// FWL CRM CRM — Reports Page
// ============================================================

window.LP = window.LP || {};
LP.pages = LP.pages || {};

LP.pages.reports = (() => {
  function render() {
    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Performance Reports</h1>
          <div class="page-subtitle">Agency-wide Meta Lead Ads metrics and SLA performance</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <select class="form-select" style="width:160px;padding:6px 28px 6px 10px;font-size:12px">
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>This Month</option>
          </select>
          <button class="btn btn-primary btn-sm">Download PDF</button>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card" style="--kpi-color:var(--meta)">
          <div class="kpi-icon" style="--kpi-icon-bg:var(--meta-dim);color:var(--meta)">
            <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <div class="kpi-label">Total Leads Generated</div>
          <div class="kpi-value">1,482</div>
          <div class="kpi-delta up"><svg width="12" height="12" viewBox="0 0 24 24"><path d="m18 15-6-6-6 6" stroke="currentColor" fill="none" stroke-width="2"/></svg> 12% vs last period</div>
        </div>

        <div class="kpi-card" style="--kpi-color:var(--success)">
          <div class="kpi-icon" style="--kpi-icon-bg:var(--success-dim);color:var(--success)">
            <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="kpi-label">Qualification Rate</div>
          <div class="kpi-value">42.8%</div>
          <div class="kpi-delta up"><svg width="12" height="12" viewBox="0 0 24 24"><path d="m18 15-6-6-6 6" stroke="currentColor" fill="none" stroke-width="2"/></svg> 3.4% vs last period</div>
        </div>

        <div class="kpi-card" style="--kpi-color:var(--danger)">
          <div class="kpi-icon" style="--kpi-icon-bg:var(--danger-dim);color:var(--danger)">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="kpi-label">Avg. Response Time</div>
          <div class="kpi-value">14m</div>
          <div class="kpi-delta down"><svg width="12" height="12" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" stroke="currentColor" fill="none" stroke-width="2"/></svg> 2m slower</div>
        </div>

        <div class="kpi-card" style="--kpi-color:var(--amber)">
          <div class="kpi-icon" style="--kpi-icon-bg:var(--amber-dim);color:var(--amber)">
            <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="kpi-label">Est. Cost Per Lead (CPL)</div>
          <div class="kpi-value">₹145.50</div>
          <div class="kpi-delta up"><svg width="12" height="12" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" stroke="currentColor" fill="none" stroke-width="2"/></svg> ₹12 cheaper</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Leads by Status</div>
              <div class="card-subtitle">Pipeline breakdown across all clients</div>
            </div>
          </div>
          <div style="height:250px;display:flex;align-items:center;justify-content:center;color:var(--text-3);border:1px dashed var(--border-1);border-radius:var(--radius-sm)">
            <div style="text-align:center">
              <svg viewBox="0 0 24 24" style="width:32px;height:32px;stroke:currentColor;fill:none;opacity:0.5;margin-bottom:8px"><path d="M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z"/></svg>
              <div>Chart rendering engine ready</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Volume Over Time</div>
              <div class="card-subtitle">Daily lead velocity</div>
            </div>
          </div>
          <div style="height:250px;display:flex;align-items:flex-end;gap:12px;padding:20px;background:var(--surface-2);border-radius:var(--radius-sm)">
            <!-- Fake bar chart -->
            <div style="flex:1;background:var(--meta);height:40%;border-radius:4px 4px 0 0;opacity:0.8"></div>
            <div style="flex:1;background:var(--meta);height:60%;border-radius:4px 4px 0 0;opacity:0.8"></div>
            <div style="flex:1;background:var(--meta);height:30%;border-radius:4px 4px 0 0;opacity:0.8"></div>
            <div style="flex:1;background:var(--meta);height:80%;border-radius:4px 4px 0 0;opacity:0.8"></div>
            <div style="flex:1;background:var(--meta);height:50%;border-radius:4px 4px 0 0;opacity:0.8"></div>
            <div style="flex:1;background:var(--meta);height:90%;border-radius:4px 4px 0 0;opacity:0.8"></div>
            <div style="flex:1;background:var(--meta);height:100%;border-radius:4px 4px 0 0;opacity:0.8"></div>
          </div>
        </div>
      </div>
    `;
  }

  function init(container) {
    container.innerHTML = render();
    container.classList.add('fade-in');
  }

  function destroy() {
    // cleanup if needed
  }

  return { render, init, destroy };
})();

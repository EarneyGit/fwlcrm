// ============================================================
// LeadPulse CRM — Calendar Page
// ============================================================

window.LP = window.LP || {};
LP.pages = LP.pages || {};

LP.pages.calendar = (() => {
  function render() {
    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Workspace Calendar</h1>
          <div class="page-subtitle">Upcoming follow-ups, client meetings, and scheduled webhooks</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-secondary btn-sm">Today</button>
          <button class="btn btn-primary btn-sm">+ New Event</button>
        </div>
      </div>

      <div class="card" style="min-height:500px">
        <div class="card-header" style="border-bottom:1px solid var(--border-0);padding-bottom:14px;margin-bottom:0">
          <div>
            <div class="card-title" style="font-size:16px">June 2026</div>
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn btn-ghost btn-sm" style="padding:4px 8px"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
            <button class="btn btn-ghost btn-sm" style="padding:4px 8px"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>
          </div>
        </div>
        
        <!-- Calendar Grid Mockup -->
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--border-0);border-bottom:1px solid var(--border-0)">
          ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => 
            `<div style="padding:10px;text-align:center;font-size:11px;font-weight:600;color:var(--text-3);text-transform:uppercase;background:var(--surface-1)">${day}</div>`
          ).join('')}
          
          <!-- Mock Days -->
          ${Array.from({length: 35}).map((_, i) => {
            const dayNum = (i + 1) - 2; // Offset to start month on Wednesday
            const isCurrentMonth = dayNum > 0 && dayNum <= 30;
            const isToday = dayNum === 28;
            const hasEvent = isCurrentMonth && (dayNum === 5 || dayNum === 14 || dayNum === 28 || dayNum === 29);
            
            return `
              <div style="min-height:100px;background:var(--surface-1);padding:8px;${isCurrentMonth ? '' : 'opacity:0.4'}">
                <div style="display:flex;justify-content:flex-end">
                  <span style="font-size:12px;font-weight:600;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:50%;${isToday ? 'background:var(--accent);color:white' : 'color:var(--text-2)'}">
                    ${dayNum > 0 ? (dayNum <= 30 ? dayNum : dayNum - 30) : 31 + dayNum}
                  </span>
                </div>
                ${hasEvent ? `
                  <div style="margin-top:4px;display:flex;flex-direction:column;gap:4px">
                    ${dayNum === 28 ? `
                      <div style="font-size:10.5px;padding:4px 6px;background:var(--meta-dim);color:var(--meta);border-radius:4px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                        10:00 AM - UrbanSpace Follow-up
                      </div>
                      <div style="font-size:10.5px;padding:4px 6px;background:var(--danger-dim);color:var(--danger);border-radius:4px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                        SLA Review (Critical)
                      </div>
                    ` : `
                      <div style="font-size:10.5px;padding:4px 6px;background:var(--surface-2);color:var(--text-2);border-radius:4px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                        Client sync
                      </div>
                    `}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function init(container) {
    container.innerHTML = render();
    container.classList.add('fade-in');
  }

  function destroy() {
    // cleanup
  }

  return { render, init, destroy };
})();

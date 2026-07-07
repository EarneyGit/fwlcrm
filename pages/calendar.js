// ============================================================
// FWL CRM — Calendar Page (real current date, no hardcoded month)
// ============================================================

window.LP = window.LP || {};
LP.pages = LP.pages || {};

LP.pages.calendar = (() => {
  let currentYear;
  let currentMonth; // 0-indexed

  function monthName(year, month) {
    return new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  // Get SLA-breached new leads as "events" for calendar days
  function getLeadEvents() {
    const events = {};
    (LP.data.leads || []).forEach(lead => {
      const d = new Date(lead.createdAt || lead.created_at);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const day = d.getDate();
        if (!events[day]) events[day] = [];
        events[day].push(lead);
      }
    });
    return events;
  }

  function render() {
    const today = new Date();
    if (currentYear === undefined) currentYear = today.getFullYear();
    if (currentMonth === undefined) currentMonth = today.getMonth();

    const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth();
    const todayDate = today.getDate();

    // First day of month (0=Sun, adjust to Mon-start)
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const startOffset = (firstDay === 0 ? 6 : firstDay - 1); // Mon = 0
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrev = new Date(currentYear, currentMonth, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const leadEvents = getLeadEvents();
    const totalLeadsThisMonth = Object.values(leadEvents).reduce((a, b) => a + b.length, 0);

    let cells = '';
    for (let i = 0; i < totalCells; i++) {
      let dayNum, isCurrentMonthDay, isPrev;
      if (i < startOffset) {
        dayNum = daysInPrev - startOffset + i + 1;
        isCurrentMonthDay = false;
        isPrev = true;
      } else if (i >= startOffset + daysInMonth) {
        dayNum = i - startOffset - daysInMonth + 1;
        isCurrentMonthDay = false;
        isPrev = false;
      } else {
        dayNum = i - startOffset + 1;
        isCurrentMonthDay = true;
        isPrev = false;
      }

      const isToday = isCurrentMonth && isCurrentMonthDay && dayNum === todayDate;
      const dayLeads = isCurrentMonthDay ? (leadEvents[dayNum] || []) : [];
      const hasLeads = dayLeads.length > 0;

      cells += `
        <div style="min-height:90px;background:var(--surface-1);padding:6px;${!isCurrentMonthDay ? 'opacity:0.35' : ''}${isToday ? ';background:rgba(24,119,242,0.04);outline:1px solid var(--meta);border-radius:2px' : ''}">
          <div style="display:flex;justify-content:flex-end">
            <span style="font-size:12px;font-weight:600;width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:50%;${isToday ? 'background:var(--meta);color:white' : 'color:var(--text-2)'}">
              ${dayNum}
            </span>
          </div>
          ${hasLeads ? `
            <div style="margin-top:3px;display:flex;flex-direction:column;gap:3px">
              ${dayLeads.slice(0, 2).map(l => `
                <div style="font-size:10px;padding:3px 5px;background:var(--meta-dim);color:var(--meta);border-radius:3px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer"
                  onclick="(function(){var lead=LP.data.leads.find(x=>x.id==='${l.id}');if(lead)LP.drawer.open(lead);})()"
                >
                  ${LP.icons.get('user', 'icon-sm')} ${l.name ? l.name.split(' ')[0] : 'Lead'}
                </div>
              `).join('')}
              ${dayLeads.length > 2 ? `<div style="font-size:10px;color:var(--text-3);padding-left:4px">+${dayLeads.length - 2} more</div>` : ''}
            </div>
          ` : ''}
        </div>
      `;
    }

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Workspace Calendar</h1>
          <div class="page-subtitle">Lead arrivals and follow-ups for ${monthName(currentYear, currentMonth)}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-secondary btn-sm" id="cal-today-btn">Today</button>
        </div>
      </div>

      <div class="card" style="min-height:500px">
        <div class="card-header" style="border-bottom:1px solid var(--border);padding-bottom:14px;margin-bottom:0">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="card-title" style="font-size:16px">${monthName(currentYear, currentMonth)}</div>
            ${totalLeadsThisMonth > 0 ? `<span class="badge badge-success" style="font-size:10px">${totalLeadsThisMonth} leads this month</span>` : ''}
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn btn-ghost btn-sm" id="cal-prev" style="padding:4px 10px">
              <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <button class="btn btn-ghost btn-sm" id="cal-next" style="padding:4px 10px">
              <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </div>

        <!-- Day headers -->
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--border);border-bottom:1px solid var(--border)">
          ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day =>
            `<div style="padding:8px;text-align:center;font-size:11px;font-weight:600;color:var(--text-3);text-transform:uppercase;background:var(--surface-1)">${day}</div>`
          ).join('')}
        </div>

        <!-- Calendar cells -->
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--border)">
          ${cells}
        </div>

        ${totalLeadsThisMonth === 0 ? `
          <div style="padding:20px;text-align:center;color:var(--text-3);font-size:13px;border-top:1px solid var(--border)">
            ${LP.icons.get('inbox', 'icon-sm')} No leads received this month yet — submit a test via Meta Lead Ads Testing Tool
          </div>
        ` : ''}
      </div>
    `;
  }

  function attachEvents(container) {
    container.querySelector('#cal-prev')?.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      container.innerHTML = render();
      attachEvents(container);
    });
    container.querySelector('#cal-next')?.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      container.innerHTML = render();
      attachEvents(container);
    });
    container.querySelector('#cal-today-btn')?.addEventListener('click', () => {
      const t = new Date();
      currentYear = t.getFullYear();
      currentMonth = t.getMonth();
      container.innerHTML = render();
      attachEvents(container);
    });
  }

  function init(container) {
    const today = new Date();
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();
    container.innerHTML = render();
    container.classList.add('fade-in');
    attachEvents(container);
  }

  function destroy() {}

  return { render, init, destroy };
})();

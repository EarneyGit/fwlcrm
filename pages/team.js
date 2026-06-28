// ============================================================
// LeadPulse CRM — Team Management Page
// Agent assignment and activity tracking
// ============================================================

window.LP = window.LP || {};
LP.pages = LP.pages || {};

LP.pages.team = (() => {
  let selectedAgentId = null;

  function timeAgo(isoStr) {
    return LP.utils.formatRelativeTime(isoStr);
  }

  function getAgentLeads(agentId) {
    return LP.data.leads.filter(l => l.assignedTo === agentId);
  }

  function getAgentActivities(agentId) {
    const leads = getAgentLeads(agentId);
    let activities = [];
    leads.forEach(lead => {
      if (lead.activities && lead.activities.length) {
        lead.activities.forEach(a => {
          activities.push({
            ...a,
            leadName: lead.name,
            leadId: lead.id
          });
        });
      }
    });
    return activities.sort((a, b) => new Date(b.ts) - new Date(a.ts));
  }

  function renderAgentsList() {
    return LP.data.agents.map(a => {
      const isSelected = a.id === selectedAgentId;
      const count = getAgentLeads(a.id).length;
      return `
        <div class="agent-card ${isSelected ? 'active' : ''}" data-id="${a.id}" style="padding:12px;border:1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'};border-radius:8px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;gap:12px;background:${isSelected ? 'rgba(6,182,212,0.05)' : '#fff'}">
          <img src="${a.avatar}" alt="${a.name}" style="width:40px;height:40px;border-radius:50%">
          <div style="flex:1">
            <div style="font-weight:600;font-size:14px">${a.name}</div>
            <div style="font-size:12px;color:var(--text-3)">${count} assigned lead${count !== 1 ? 's' : ''}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderActivitiesList(activities) {
    if (activities.length === 0) {
      return `<div style="padding:20px;text-align:center;color:var(--text-3);font-size:13px">No activities found for this agent's leads.</div>`;
    }
    return activities.map(a => `
      <div style="display:flex;gap:12px;margin-bottom:16px;font-size:13px">
        <div style="margin-top:2px;color:var(--primary);display:flex;align-items:center;justify-content:center">
          ${a.type === 'note' ? LP.icons.get('pencil', 'icon-sm') : (a.type === 'status' || a.type === 'status_change' ? LP.icons.get('refresh-cw', 'icon-sm') : LP.icons.get('user', 'icon-sm'))}
        </div>
        <div style="flex:1">
          <div style="margin-bottom:4px">
            <strong style="color:var(--text-1)">${a.user}</strong> 
            <span style="color:var(--text-2)">on lead</span> 
            <a href="#leads" onclick="event.preventDefault();LP.drawer.open(LP.data.leads.find(l=>l.id==='${a.leadId}'))" style="color:var(--primary);text-decoration:none;font-weight:500">${a.leadName}</a>
          </div>
          <div style="color:var(--text-2);background:#f9fafb;padding:8px 12px;border-radius:6px;border:1px solid var(--border)">
            ${a.text}
          </div>
          <div style="margin-top:4px;font-size:11px;color:var(--text-3)">${timeAgo(a.ts)}</div>
        </div>
      </div>
    `).join('');
  }

  function renderLeadsList(leads) {
    if (leads.length === 0) {
      return `<div style="padding:20px;text-align:center;color:var(--text-3);font-size:13px">No leads assigned.</div>`;
    }
    return `
      <table class="data-table" style="margin-top:0">
        <thead>
          <tr>
            <th>Lead</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${leads.map(l => `
            <tr class="lead-row" data-lead-id="${l.id}" style="cursor:pointer">
              <td>
                <div style="font-weight:500;color:var(--text-1)">${l.name}</div>
                <div style="font-size:11px;color:var(--text-3)">${l.phone}</div>
              </td>
              <td><span class="badge" style="background:#f1f5f9;color:#475569">${l.status}</span></td>
              <td style="color:var(--text-3)">${timeAgo(l.createdAt)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  function render() {
    if (!selectedAgentId && LP.data.agents.length > 0) {
      selectedAgentId = LP.data.agents[0].id;
    }

    const agent = LP.data.agents.find(a => a.id === selectedAgentId);
    let rightPanel = '';
    
    if (agent) {
      const leads = getAgentLeads(agent.id);
      const activities = getAgentActivities(agent.id);
      rightPanel = `
        <div style="display:flex;gap:24px;align-items:flex-start">
          <!-- Leads List -->
          <div class="card" style="flex:1">
            <div style="padding:16px;border-bottom:1px solid var(--border);font-weight:600">Assigned Leads</div>
            <div style="padding:0">
              ${renderLeadsList(leads)}
            </div>
          </div>
          <!-- Activity Timeline -->
          <div class="card" style="flex:1">
            <div style="padding:16px;border-bottom:1px solid var(--border);font-weight:600">Recent Activities</div>
            <div style="padding:16px;max-height:500px;overflow-y:auto">
              ${renderActivitiesList(activities)}
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Team Management</h1>
          <div class="page-subtitle">Assign leads to agents and track their activities</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" id="add-agent-btn" style="display:flex;align-items:center;gap:4px">
            ${LP.icons.get('plus', 'icon-sm')} Add New Agent
          </button>
        </div>
      </div>
      <div style="display:flex;gap:24px;align-items:flex-start">
        <div style="width:280px;flex-shrink:0">
          <div class="card" style="padding:16px">
            <h3 style="margin:0 0 16px 0;font-size:14px;color:var(--text-2)">Agents</h3>
            <div id="agents-list">
              ${renderAgentsList()}
            </div>
          </div>
        </div>
        <div style="flex:1" id="agent-details">
          ${rightPanel}
        </div>
      </div>
    `;
  }

  function init(container) {
    container.innerHTML = render();
    container.classList.add('fade-in');

    // Agent selection
    container.querySelectorAll('.agent-card').forEach(card => {
      card.addEventListener('click', () => {
        selectedAgentId = card.dataset.id;
        init(container); // Re-render whole page
      });
    });

    // Lead click
    container.querySelectorAll('.lead-row').forEach(row => {
      row.addEventListener('click', () => {
        const lead = LP.data.leads.find(l => l.id === row.dataset.leadId);
        if (lead) LP.drawer.open(lead);
      });
    });

    // Add Agent Button
    document.getElementById('add-agent-btn')?.addEventListener('click', () => {
      showAddAgentModal(container);
    });
  }

  function showAddAgentModal(container) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px;background:var(--surface-1);border:1px solid var(--border-3);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.5);transform:scale(0.95);opacity:0;transition:all 0.3s cubic-bezier(0.16,1,0.3,1);position:relative">
        
        <div style="padding:24px 24px 16px 24px;border-bottom:1px solid var(--border-0)">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <h2 style="margin:0;font-size:18px;font-weight:600;display:flex;align-items:center;gap:8px">
              <span style="color:var(--accent)">${LP.icons.get('user-plus', 'icon-md')}</span>
              Invite Team Member
            </h2>
            <button class="btn btn-ghost btn-sm" id="agent-close-x" style="padding:4px;color:var(--text-3)">${LP.icons.get('x-circle', 'icon-md')}</button>
          </div>
          <p style="margin:6px 0 0 0;font-size:13px;color:var(--text-2)">Add a new agent to your LeadPulse workspace to start assigning leads.</p>
        </div>

        <div style="padding:24px">
          <div style="margin-bottom:20px">
            <label class="form-label" style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-3);margin-bottom:8px">Full Name</label>
            <div style="position:relative">
              <div style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-3)">
                ${LP.icons.get('user', 'icon-sm')}
              </div>
              <input type="text" id="new-agent-name" class="form-input" placeholder="e.g. Rahul Sharma" style="padding-left:36px;height:44px">
            </div>
          </div>
          
          <div style="margin-bottom:20px">
            <label class="form-label" style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-3);margin-bottom:8px">Role</label>
            <div style="position:relative">
              <div style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-3)">
                ${LP.icons.get('briefcase', 'icon-sm')}
              </div>
              <select id="new-agent-role" class="form-select" style="padding-left:36px;height:44px">
                <option value="Sales Rep">Sales Rep</option>
                <option value="Support Agent">Support Agent</option>
                <option value="Account Manager">Account Manager</option>
              </select>
            </div>
          </div>

          <div style="margin-bottom:24px">
            <label class="form-label" style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-3);margin-bottom:8px">Avatar Accent Color</label>
            <div style="display:flex;align-items:center;gap:12px">
              <input type="color" id="new-agent-color" value="#06B6D4" style="width:44px;height:44px;border:none;border-radius:8px;cursor:pointer;background:none;padding:0">
              <span style="font-size:12px;color:var(--text-2)">This color will be used for the agent's profile ring.</span>
            </div>
          </div>

          <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:32px">
            <button class="btn btn-ghost" id="agent-cancel-btn" style="flex:1">Cancel</button>
            <button class="btn btn-primary" id="agent-save-btn" style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px">
              ${LP.icons.get('mail', 'icon-sm')} Send Invite
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Make it visible
    requestAnimationFrame(() => {
      overlay.querySelector('.modal').style.transform = 'scale(1)';
      overlay.querySelector('.modal').style.opacity = '1';
      overlay.classList.add('open');
    });

    const close = () => {
      overlay.querySelector('.modal').style.transform = 'scale(0.95)';
      overlay.querySelector('.modal').style.opacity = '0';
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 300);
    };

    overlay.querySelector('#agent-close-x').addEventListener('click', close);
    overlay.querySelector('#agent-cancel-btn').addEventListener('click', close);

    overlay.querySelector('#agent-save-btn').addEventListener('click', () => {
      const name = document.getElementById('new-agent-name').value.trim();
      const role = document.getElementById('new-agent-role').value;
      const color = document.getElementById('new-agent-color').value;

      if (!name) return LP.toast.warning('Name required', 'Please enter a name for the agent');

      const id = 'ag_' + Date.now();
      const initials = name.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();
      
      LP.data.agents.push({
        id,
        name,
        role,
        initials,
        color,
        avatar: `https://i.pravatar.cc/150?u=${id}`
      });

      LP.toast.success('Agent Added', `${name} has been added to the team`);
      close();
      init(container); // Re-render the page to show new agent
    });
  }

  return { render, init, destroy: () => {} };
})();

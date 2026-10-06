import React, { useState, useEffect } from 'react';
import MetricCard from './MetricCard';
import AgentPanel from './AgentPanel';
import { fetchDashboardMetrics, fetchRecentActivity, fetchRecentTasks, fetchOrganogramData } from '../services/AgentService';
import { Bot, CheckCircle2, CircleDashed, ArrowUpCircle } from 'lucide-react';
import './AgentPanel.css';

const Dashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [organogram, setOrganogram] = useState(null);

  useEffect(() => {
    // Load mock data
    fetchDashboardMetrics().then(setMetrics);
    fetchRecentActivity().then(setActivities);
    fetchRecentTasks().then(setTasks);
    fetchOrganogramData().then(setOrganogram);
  }, []);

  const renderTaskIcon = (status) => {
    switch(status) {
      case 'done': return <CheckCircle2 size={16} color="var(--accent-green)" />;
      case 'in-progress': return <CircleDashed size={16} color="var(--accent-orange)" />;
      case 'todo': return <ArrowUpCircle size={16} color="var(--accent-orange)" />;
      default: return <CircleDashed size={16} color="var(--text-muted)" />;
    }
  };

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-header">
        <h1 className="header-title">DASHBOARD</h1>
      </header>

      <div className="dashboard-content">
        <div className="metrics-grid">
          <MetricCard 
            title="Agents Enabled" 
            value={metrics?.agentsEnabled || '-'} 
            icon={<Bot size={18} color="var(--text-muted)" />}
            subtitle={`${metrics?.agentsRunning || 0} running, ${metrics?.agentsPaused || 0} paused`}
            subValues={`${metrics?.agentsErrors || 0} errors`}
          />
          <MetricCard 
            title="Tasks In Progress" 
            value={metrics?.tasksInProgress || '-'} 
            icon={<CircleDashed size={18} color="var(--text-muted)" />}
            subtitle={`${metrics?.tasksOpen || 0} open, ${metrics?.tasksBlocked || 0} blocked`}
          />
          <MetricCard 
            title="Month Spend" 
            value={`$${metrics?.monthSpend || '0.00'}`} 
            subtitle="Unlimited budget"
          />
          <MetricCard 
            title="Pending Approvals" 
            value={metrics?.pendingApprovals || '-'} 
            subtitle={`${metrics?.staleTasks || 0} stale tasks`}
          />
        </div>

        <div className="lists-grid">
          <div className="list-section">
            <h3>RECENT ACTIVITY</h3>
            <div className="list-container glass-panel">
              {activities.map(act => (
                <div key={act.id} className="list-item">
                  <div className="item-left">
                    <span className="agent-badge">{act.agent.substring(0, 2).toUpperCase()}</span>
                    <span className="item-action"><b>{act.agent}</b> {act.action}</span>
                  </div>
                  <span className="item-time">{act.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="list-section">
            <h3>RECENT TASKS</h3>
            <div className="list-container glass-panel">
              {tasks.map(task => (
                <div key={task.id} className="list-item">
                  <div className="item-left">
                    <div className="task-icon">{renderTaskIcon(task.status)}</div>
                    <span className="item-action">{task.title}</span>
                  </div>
                  <span className="item-time">{task.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Painel de Agentes DDM */}
        <AgentPanel />

        <div className="organogram-section">
          <h3>ORGANOGRAM (AGENTS ECOSYSTEM)</h3>
          <div className="organogram-container glass-panel">
            {organogram && (
              <div className="org-tree">
                {/* CEO Node */}
                <div className="org-node ceo">
                  <div className="node-header">
                    <span className="node-name">{organogram.name}</span>
                  </div>
                  <div className="node-role">{organogram.role}</div>
                  <div className="node-stats">
                    <div className="stat-box"><span className="stat-val">{organogram.stats.agents}</span><span className="stat-label">Agents</span></div>
                    <div className="stat-box"><span className="stat-val">{organogram.stats.skills}</span><span className="stat-label">Skills</span></div>
                    <div className="stat-box"><span className="stat-val">{organogram.stats.squads}</span><span className="stat-label">Squads</span></div>
                    <div className="stat-box"><span className="stat-val">{organogram.stats.mcps}</span><span className="stat-label">MCPs</span></div>
                  </div>
                </div>

                {/* Children Nodes */}
                <div className="org-children">
                  {organogram.children.map(child => (
                    <div key={child.id} className="child-wrapper">
                      <div className={`org-node ${child.id === 'aurea' ? 'cqo' : 'coo'}`}>
                        <div className="node-header">
                          <span className="node-name">{child.name}</span>
                        </div>
                        <div className="node-role">{child.role}</div>
                        <div className="node-stats">
                          <div className="stat-box"><span className="stat-val">{child.stats.agents}</span><span className="stat-label">Agents</span></div>
                          <div className="stat-box"><span className="stat-val">{child.stats.skills}</span><span className="stat-label">Skills</span></div>
                          <div className="stat-box"><span className="stat-val">{child.stats.squads}</span><span className="stat-label">Squads</span></div>
                          <div className="stat-box"><span className="stat-val">{child.stats.mcps}</span><span className="stat-label">MCPs</span></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

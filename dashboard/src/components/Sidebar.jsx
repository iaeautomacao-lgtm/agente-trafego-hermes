import { NavLink } from 'react-router-dom';
import './Sidebar.css';

function Sidebar({ agents, projects, connected, health }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">DDM Agents</span>
        </div>
        <div className="connection-status">
          <span className={`dot ${connected ? 'online' : 'offline'}`}></span>
          <span className={`dot ${health?.hermes ? 'online' : 'offline'}`}></span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">📊</span>
            Dashboard
          </NavLink>
        </div>

        <div className="nav-section">
          <span className="nav-label">GESTÃO</span>
          <NavLink to="/projects" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">📁</span>
            Projetos
            <span className="nav-badge">{projects?.length || 0}</span>
          </NavLink>
          <NavLink to="/issues" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">📋</span>
            Issues
          </NavLink>
          <NavLink to="/goals" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">🎯</span>
            Goals
          </NavLink>
        </div>

        <div className="nav-section">
          <span className="nav-label">AGENTES</span>
          {agents?.sort((a, b) => a.order - b.order).map(agent => (
            <NavLink 
              key={agent.id}
              to={`/agent/${agent.id}`}
              className={({ isActive }) => `nav-item agent-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{agent.icon}</span>
              <span className="agent-name">{agent.name}</span>
              <span className={`status-indicator ${agent.status}`}></span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="footer-stats">
          <span>{agents?.length || 0} agentes</span>
          <span>•</span>
          <span>{projects?.length || 0} projetos</span>
        </div>
        <span className="version">v2.0.0</span>
      </div>
    </aside>
  );
}

export default Sidebar;

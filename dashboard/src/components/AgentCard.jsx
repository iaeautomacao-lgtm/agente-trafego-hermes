import { useState } from 'react';
import './AgentCard.css';

function AgentCard({ agent, onClick, onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);

  const statusText = {
    idle: 'Aguardando',
    running: 'Executando...',
    success: 'Concluído',
    error: 'Erro'
  };

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    onEdit?.();
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    onDelete?.();
  };

  return (
    <div 
      className={`agent-card ${agent.status}`}
      style={{ '--agent-color': agent.color }}
      onClick={onClick}
    >
      <div className="agent-card-header">
        <span className="agent-card-icon">{agent.icon}</span>
        <div className="agent-card-actions">
          <span className={`agent-status ${agent.status}`}>
            {agent.status === 'running' && <span className="pulse"></span>}
            {statusText[agent.status] || agent.status}
          </span>
          <button className="menu-btn" onClick={handleMenuClick}>⋮</button>
          {showMenu && (
            <div className="dropdown-menu">
              <button onClick={handleEdit}>✏️ Editar</button>
              <button onClick={handleDelete} className="danger">🗑️ Excluir</button>
            </div>
          )}
        </div>
      </div>
      
      <h3 className="agent-card-name">{agent.name}</h3>
      <p className="agent-card-role">{agent.role}</p>
      
      <div className="agent-card-stats">
        <div className="stat">
          <span className="stat-value">{agent.metrics?.totalRuns || 0}</span>
          <span className="stat-label">runs</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            {agent.metrics?.totalRuns > 0 
              ? Math.round((agent.metrics.successCount / agent.metrics.totalRuns) * 100)
              : 100}%
          </span>
          <span className="stat-label">sucesso</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            {agent.metrics?.avgDuration 
              ? Math.round(agent.metrics.avgDuration / 1000) + 's'
              : '-'}
          </span>
          <span className="stat-label">média</span>
        </div>
      </div>

      <button className="agent-card-btn">
        ▶ Executar
      </button>
    </div>
  );
}

export default AgentCard;

import './FlowDiagram.css';

function FlowDiagram({ agents, flows }) {
  const mainFlow = flows?.find(f => f.id === 'campanha-completa');
  const flowAgents = mainFlow?.steps?.map(id => agents?.find(a => a.id === id)).filter(Boolean) || [];

  return (
    <div className="flow-diagram">
      <div className="flow-container">
        {flowAgents.map((agent, idx) => (
          <div key={agent.id} className="flow-node-wrapper">
            {idx > 0 && (
              <div className="flow-connector">
                <div className="connector-line"></div>
                <div className="connector-arrow">→</div>
              </div>
            )}
            <div 
              className={`flow-node ${agent.status}`}
              style={{ '--agent-color': agent.color }}
            >
              <div className="node-icon">{agent.icon}</div>
              <div className="node-content">
                <span className="node-name">{agent.name}</span>
                <span className="node-role">{agent.role}</span>
              </div>
              <div className={`node-status ${agent.status}`}>
                {agent.status === 'running' && <span className="status-pulse"></span>}
              </div>
            </div>
          </div>
        ))}
        
        {/* Final node */}
        <div className="flow-node-wrapper">
          <div className="flow-connector">
            <div className="connector-line"></div>
            <div className="connector-arrow">→</div>
          </div>
          <div className="flow-node final">
            <div className="node-icon">✓</div>
            <div className="node-content">
              <span className="node-name">Aprovação</span>
              <span className="node-role">Humano</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flow-legend">
        <div className="legend-item">
          <span className="legend-dot idle"></span>
          <span>Aguardando</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot running"></span>
          <span>Executando</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot success"></span>
          <span>Concluído</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot error"></span>
          <span>Erro</span>
        </div>
      </div>
    </div>
  );
}

export default FlowDiagram;

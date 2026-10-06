import './ActivityFeed.css';

function ActivityFeed({ history }) {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'agora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m atrás`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  if (!history || history.length === 0) {
    return (
      <div className="activity-feed empty">
        <span className="empty-icon">📭</span>
        <p>Nenhuma atividade ainda</p>
      </div>
    );
  }

  return (
    <div className="activity-feed">
      {history.slice(0, 10).map((item, idx) => (
        <div key={idx} className={`activity-item ${item.success ? 'success' : 'error'}`}>
          <div className="activity-icon">
            {item.success ? '✓' : '✗'}
          </div>
          <div className="activity-content">
            <div className="activity-header">
              <span className="activity-agent">{item.agentName}</span>
              <span className="activity-time">{formatTime(item.timestamp)}</span>
            </div>
            <p className="activity-preview">
              {item.input?.substring(0, 80)}...
            </p>
            {item.tokens && (
              <span className="activity-tokens">{item.tokens} tokens</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ActivityFeed;

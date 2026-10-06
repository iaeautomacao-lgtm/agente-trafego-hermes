import { useRef, useEffect } from 'react';
import './Terminal.css';

function Terminal({ logs, onClear }) {
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const levelColors = {
    debug: 'log-debug',
    info: 'log-info',
    warn: 'log-warn',
    error: 'log-error'
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="terminal">
      <div className="terminal-header">
        <span className="terminal-title">
          <span className="terminal-icon">▤</span>
          TERMINAL — Logs em tempo real
        </span>
        <div className="terminal-actions">
          <span className="log-count">{logs?.length || 0} logs</span>
          <button className="btn btn-ghost btn-sm" onClick={onClear}>Limpar</button>
        </div>
      </div>
      <div className="terminal-body" ref={containerRef}>
        {(!logs || logs.length === 0) ? (
          <div className="terminal-empty">
            <span>Aguardando logs...</span>
            <span className="blink">_</span>
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={log.id || i} className={`log-line ${levelColors[log.level] || ''}`}>
              <span className="log-time">{formatTime(log.timestamp)}</span>
              <span className={`log-level ${log.level}`}>{log.level.toUpperCase()}</span>
              <span className="log-agent">[{log.agentId}]</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Terminal;

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Terminal from '../components/Terminal';
import ExecutionModal from '../components/ExecutionModal';
import api from '../services/api';
import './AgentDetail.css';

function AgentDetail({ agents, logs: globalLogs, onRefresh }) {
  const { id } = useParams();
  const [agent, setAgent] = useState(null);
  const [history, setHistory] = useState([]);
  const [usage, setUsage] = useState(null);
  const [agentLogs, setAgentLogs] = useState([]);
  const [modal, setModal] = useState(false);
  const [executing, setExecuting] = useState(false);

  const filteredLogs = globalLogs?.filter(l => l.agentId === id) || [];

  useEffect(() => {
    const found = agents?.find(a => a.id === id);
    setAgent(found);
    loadAgentData();
  }, [id, agents]);

  const loadAgentData = async () => {
    try {
      const [historyRes, usageRes, logsRes] = await Promise.all([
        api.getHistory(100),
        api.getAgentUsage(id),
        api.getAgentLogs(id, 50)
      ]);
      setHistory(historyRes.history?.filter(h => h.agentId === id) || []);
      setUsage(usageRes.usage);
      setAgentLogs(logsRes.logs || []);
    } catch (e) {
      console.error('Load agent data error:', e);
    }
  };

  const handleExecute = async (input) => {
    setExecuting(true);
    try {
      await api.executeAgent(id, input);
      setModal(false);
      await loadAgentData();
      onRefresh?.();
    } catch (err) {
      alert(`Erro: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  if (!agent) {
    return (
      <div className="page">
        <div className="loading">Carregando agente...</div>
      </div>
    );
  }

  const successRate = agent.metrics?.totalRuns > 0 
    ? Math.round((agent.metrics.successCount / agent.metrics.totalRuns) * 100)
    : 100;

  return (
    <div className="page agent-detail">
      <header className="page-header">
        <div className="agent-header">
          <Link to="/" className="back-link">← Voltar</Link>
          <div className="agent-title">
            <span className="agent-icon" style={{ background: agent.color }}>{agent.icon}</span>
            <div>
              <h1>{agent.name}</h1>
              <p className="agent-skill">{agent.skill}</p>
            </div>
          </div>
        </div>
        <div className="page-actions">
          <span className={`status-badge ${agent.status === 'running' ? 'warning' : agent.status === 'error' ? 'offline' : 'online'}`}>
            {agent.status === 'running' ? '● Executando' : agent.status === 'error' ? '● Erro' : '● Pronto'}
          </span>
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            ▶ Executar
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <section className="stats-grid grid-4">
        <div className="stat-card">
          <span className="stat-value">{agent.metrics?.totalRuns || 0}</span>
          <span className="stat-label">Execuções</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{successRate}%</span>
          <span className="stat-label">Taxa de Sucesso</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{(usage?.tokens || 0).toLocaleString()}</span>
          <span className="stat-label">Tokens Usados</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">${(usage?.cost || 0).toFixed(4)}</span>
          <span className="stat-label">Custo Total</span>
        </div>
      </section>

      {/* Description */}
      <section className="info-section card">
        <h3>Sobre</h3>
        <p>{agent.description}</p>
        <div className="info-grid">
          <div>
            <span className="info-label">Role</span>
            <span className="info-value">{agent.role}</span>
          </div>
          <div>
            <span className="info-label">Inputs</span>
            <span className="info-value">{agent.inputs?.join(', ')}</span>
          </div>
          <div>
            <span className="info-label">Outputs</span>
            <span className="info-value">{agent.outputs?.join(', ')}</span>
          </div>
          <div>
            <span className="info-label">Tempo Médio</span>
            <span className="info-value">{agent.metrics?.avgDuration ? `${Math.round(agent.metrics.avgDuration / 1000)}s` : '-'}</span>
          </div>
        </div>
      </section>

      {/* Terminal */}
      <section className="terminal-section">
        <h3>Logs do Agente</h3>
        <Terminal logs={[...agentLogs, ...filteredLogs]} />
      </section>

      {/* History */}
      <section className="history-section card">
        <h3>Histórico de Execuções</h3>
        {history.length === 0 ? (
          <p className="empty-state">Nenhuma execução ainda</p>
        ) : (
          <div className="history-list">
            {history.slice(0, 10).map((item, idx) => (
              <div key={idx} className={`history-item ${item.success ? 'success' : 'error'}`}>
                <div className="history-header">
                  <span className={`history-status ${item.success ? 'success' : 'error'}`}>
                    {item.success ? '✓' : '✗'}
                  </span>
                  <span className="history-time">
                    {new Date(item.timestamp).toLocaleString('pt-BR')}
                  </span>
                  <span className="history-tokens">{item.tokens} tokens</span>
                </div>
                <div className="history-input">
                  <strong>Input:</strong> {item.input?.substring(0, 100)}...
                </div>
                {!item.success && item.error && (
                  <div className="history-error">Erro: {item.error}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal */}
      {modal && (
        <ExecutionModal
          type="agent"
          data={agent}
          onClose={() => setModal(false)}
          onExecute={handleExecute}
          executing={executing}
        />
      )}
    </div>
  );
}

export default AgentDetail;

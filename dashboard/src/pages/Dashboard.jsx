import { useState, useEffect } from 'react';
import SensorCard from '../components/SensorCard';
import AgentCard from '../components/AgentCard';
import ActivityFeed from '../components/ActivityFeed';
import Terminal from '../components/Terminal';
import FlowEditor from '../components/FlowEditor';
import TokenUsageChart from '../components/TokenUsageChart';
import ExecutionModal from '../components/ExecutionModal';
import AgentForm from '../components/AgentForm';
import api from '../services/api';
import './Dashboard.css';

function Dashboard({ agents, flows, projects, health, wsConnected, logs, clearLogs, onRefresh }) {
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [usage, setUsage] = useState(null);
  const [modal, setModal] = useState({ open: false, type: null, data: null });
  const [executing, setExecuting] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [editAgent, setEditAgent] = useState(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const [metricsRes, historyRes, usageRes] = await Promise.all([
        api.getMetrics(),
        api.getHistory(20),
        api.getUsage()
      ]);
      setMetrics(metricsRes.metrics);
      setHistory(historyRes.history || []);
      setUsage(usageRes.usage);
    } catch (e) {
      console.error('Load metrics error:', e);
    }
  };

  const openModal = (type, data) => {
    setModal({ open: true, type, data });
  };

  const closeModal = () => {
    setModal({ open: false, type: null, data: null });
  };

  const handleExecute = async (input) => {
    setExecuting(true);
    try {
      if (modal.type === 'agent') {
        await api.executeAgent(modal.data.id, input);
      } else if (modal.type === 'flow') {
        await api.executeFlow(modal.data.id, input);
      }
      closeModal();
      await loadMetrics();
      onRefresh?.();
    } catch (err) {
      alert(`Erro: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const handleSaveAgent = async (agentData) => {
    try {
      if (editAgent) {
        await api.updateAgent(editAgent.id, agentData);
      } else {
        await api.createAgent(agentData);
      }
      setShowAgentForm(false);
      setEditAgent(null);
      onRefresh?.();
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (!confirm('Excluir este agente?')) return;
    try {
      await api.deleteAgent(agentId);
      onRefresh?.();
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };

  return (
    <div className="page dashboard">
      <header className="page-header">
        <div>
          <h1>CENTRAL DE COMANDO</h1>
          <p className="page-subtitle">Sistema de Orquestração de Agentes DDM</p>
        </div>
        <div className="page-actions">
          <span className={`status-badge ${wsConnected ? 'online' : 'offline'}`}>
            {wsConnected ? '● WebSocket' : '○ Desconectado'}
          </span>
          <span className={`status-badge ${health?.hermes ? 'online' : 'offline'}`}>
            {health?.hermes ? '● Hermes' : '○ Hermes Offline'}
          </span>
          <button className="btn btn-secondary" onClick={() => setShowTerminal(!showTerminal)}>
            {showTerminal ? '✕ Terminal' : '▤ Terminal'}
          </button>
          <button className="btn btn-secondary" onClick={() => { loadMetrics(); onRefresh?.(); }}>
            ⟳ Atualizar
          </button>
        </div>
      </header>

      {/* Sensors */}
      <section className="sensors grid-4">
        <SensorCard 
          icon="🤖" 
          label="AGENTS" 
          value={metrics?.agents?.total || agents?.length || 0}
          sub={`${metrics?.agents?.active || 0} ativos`}
          color="var(--accent-blue)"
        />
        <SensorCard 
          icon="⚡" 
          label="EXECUÇÕES" 
          value={metrics?.runs?.total || 0}
          sub={`${metrics?.runs?.successRate || 100}% sucesso`}
          color="var(--accent-green)"
        />
        <SensorCard 
          icon="🪙" 
          label="TOKENS" 
          value={usage?.totalTokens?.toLocaleString() || 0}
          sub={`$${(usage?.totalCost || 0).toFixed(4)}`}
          color="var(--accent-yellow)"
        />
        <SensorCard 
          icon="📁" 
          label="PROJETOS" 
          value={projects?.length || 0}
          sub={`${flows?.length || 0} fluxos`}
          color="var(--accent-purple)"
        />
      </section>

      {/* Terminal (collapsible) */}
      {showTerminal && (
        <section className="terminal-section">
          <Terminal logs={logs} onClear={clearLogs} />
        </section>
      )}

      {/* Flow Editor */}
      <section className="flow-section">
        <FlowEditor 
          agents={agents} 
          flows={flows} 
          onExecuteFlow={(flow) => openModal('flow', flow)}
        />
      </section>

      {/* Token Usage Chart */}
      <section className="chart-section">
        <TokenUsageChart />
      </section>

      {/* Agents Grid */}
      <section className="agents-section">
        <div className="section-header">
          <h2>AGENTES</h2>
          <button className="btn btn-primary" onClick={() => setShowAgentForm(true)}>
            + Novo Agente
          </button>
        </div>
        <div className="agents-grid">
          {agents?.sort((a, b) => a.order - b.order).map(agent => (
            <AgentCard 
              key={agent.id}
              agent={agent}
              onClick={() => openModal('agent', agent)}
              onEdit={() => { setEditAgent(agent); setShowAgentForm(true); }}
              onDelete={() => handleDeleteAgent(agent.id)}
            />
          ))}
        </div>
      </section>

      {/* Activity Feed */}
      <section className="activity-section">
        <div className="section-header">
          <h2>ATIVIDADE RECENTE</h2>
        </div>
        <ActivityFeed history={history} />
      </section>

      {/* Execution Modal */}
      {modal.open && (
        <ExecutionModal
          type={modal.type}
          data={modal.data}
          onClose={closeModal}
          onExecute={handleExecute}
          executing={executing}
        />
      )}

      {/* Agent Form Modal */}
      {showAgentForm && (
        <AgentForm
          agent={editAgent}
          onSave={handleSaveAgent}
          onCancel={() => { setShowAgentForm(false); setEditAgent(null); }}
        />
      )}
    </div>
  );
}

export default Dashboard;

import React, { useState, useEffect } from 'react';
import { fetchDDMAgents, executeAgent, executeFullFlow, checkHealth } from '../services/AgentService';
import { Play, Loader2, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, Send, Wifi, WifiOff } from 'lucide-react';
import './AgentPanel.css';

const AgentPanel = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(null);
  const [flowRunning, setFlowRunning] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking');

  useEffect(() => {
    loadAgents();
    checkApiHealth();
    
    // Refresh a cada 10 segundos
    const interval = setInterval(() => {
      loadAgents();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const loadAgents = async () => {
    const data = await fetchDDMAgents();
    setAgents(data);
    setLoading(false);
  };

  const checkApiHealth = async () => {
    const health = await checkHealth();
    setApiStatus(health.status === 'healthy' ? 'online' : 
                 health.status === 'degraded' ? 'degraded' : 'offline');
  };

  const handleOpenModal = (agent) => {
    setSelectedAgent(agent);
    setInputText('');
    setOutputText('');
    setShowModal(true);
  };

  const handleExecuteAgent = async () => {
    if (!selectedAgent || !inputText.trim()) return;
    
    setExecuting(selectedAgent.id);
    setOutputText('Executando...');
    
    try {
      const result = await executeAgent(selectedAgent.id, inputText);
      setOutputText(result.success ? result.output : `Erro: ${result.error}`);
      await loadAgents();
    } catch (error) {
      setOutputText(`Erro: ${error.message}`);
    }
    
    setExecuting(null);
  };

  const handleExecuteFlow = async () => {
    const briefing = prompt('Digite o briefing da campanha:');
    if (!briefing) return;
    
    setFlowRunning(true);
    
    try {
      const result = await executeFullFlow(briefing);
      
      if (result.success) {
        alert(`Fluxo concluído com sucesso!\n\nResultados:\n${result.results.map(r => `- ${r.name}: OK`).join('\n')}`);
      } else {
        alert(`Fluxo interrompido: ${result.error}`);
      }
      
      await loadAgents();
    } catch (error) {
      alert(`Erro: ${error.message}`);
    }
    
    setFlowRunning(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return <Loader2 size={16} className="spin" color="var(--accent-blue)" />;
      case 'completed':
        return <CheckCircle2 size={16} color="var(--accent-green)" />;
      case 'error':
        return <AlertCircle size={16} color="var(--accent-red)" />;
      case 'offline':
        return <WifiOff size={16} color="var(--text-muted)" />;
      default:
        return <div className="status-dot idle" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'running': return 'Executando...';
      case 'completed': return 'Concluído';
      case 'error': return 'Erro';
      case 'offline': return 'Offline';
      default: return 'Aguardando';
    }
  };

  if (loading) {
    return <div className="agent-panel loading">Carregando agentes...</div>;
  }

  return (
    <div className="agent-panel">
      <div className="panel-header">
        <div className="header-left">
          <h2>AGENTES DE TRÁFEGO PAGO</h2>
          <div className={`api-status ${apiStatus}`}>
            {apiStatus === 'online' ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{apiStatus === 'online' ? 'API Online' : apiStatus === 'degraded' ? 'Hermes Offline' : 'API Offline'}</span>
          </div>
        </div>
        <div className="header-actions">
          <button 
            className="btn-refresh"
            onClick={() => { loadAgents(); checkApiHealth(); }}
          >
            <RefreshCw size={16} />
          </button>
          <button 
            className="btn-execute-flow"
            onClick={handleExecuteFlow}
            disabled={flowRunning || apiStatus === 'offline'}
          >
            {flowRunning ? (
              <>
                <Loader2 size={16} className="spin" />
                Executando Fluxo...
              </>
            ) : (
              <>
                <Play size={16} />
                Executar Fluxo Completo
              </>
            )}
          </button>
        </div>
      </div>

      <div className="agents-flow">
        {agents.sort((a, b) => a.order - b.order).map((agent, index) => (
          <React.Fragment key={agent.id}>
            <div 
              className={`agent-card ${agent.status}`}
              style={{ '--agent-color': agent.color }}
              onClick={() => handleOpenModal(agent)}
            >
              <div className="agent-header">
                <span className="agent-icon">{agent.icon}</span>
                <span className="agent-name">{agent.name}</span>
                <div className="agent-status">
                  {getStatusIcon(agent.status)}
                </div>
              </div>
              
              <div className="agent-role">{agent.role}</div>
              <div className="agent-description">{agent.description}</div>
              
              <div className="agent-meta">
                <div className="meta-item">
                  <span className="meta-label">Skill:</span>
                  <span className="meta-value">{agent.skill}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Status:</span>
                  <span className={`meta-value status-${agent.status}`}>
                    {getStatusText(agent.status)}
                  </span>
                </div>
              </div>

              <div className="agent-io">
                <div className="io-section">
                  <span className="io-label">Input:</span>
                  <span className="io-value">{agent.inputs.join(', ')}</span>
                </div>
                <div className="io-section">
                  <span className="io-label">Output:</span>
                  <span className="io-value">{agent.outputs.join(', ')}</span>
                </div>
              </div>

              <button 
                className="btn-execute"
                onClick={(e) => { e.stopPropagation(); handleOpenModal(agent); }}
                disabled={agent.status === 'running' || apiStatus === 'offline'}
              >
                <Play size={14} />
                Executar
              </button>

              {agent.lastRun && (
                <div className="agent-last-run">
                  Última execução: {new Date(agent.lastRun).toLocaleTimeString()}
                </div>
              )}
            </div>

            {index < agents.length - 1 && (
              <div className="flow-arrow">
                <ArrowRight size={24} color="var(--text-muted)" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="flow-legend">
        <div className="legend-item">
          <div className="status-dot idle" />
          <span>Aguardando</span>
        </div>
        <div className="legend-item">
          <Loader2 size={14} className="spin" color="var(--accent-blue)" />
          <span>Executando</span>
        </div>
        <div className="legend-item">
          <CheckCircle2 size={14} color="var(--accent-green)" />
          <span>Concluído</span>
        </div>
        <div className="legend-item">
          <AlertCircle size={14} color="var(--accent-red)" />
          <span>Erro</span>
        </div>
      </div>

      {/* Modal de Execução */}
      {showModal && selectedAgent && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-icon">{selectedAgent.icon}</span>
              <h3>{selectedAgent.name}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="input-section">
                <label>Input ({selectedAgent.inputs.join(', ')}):</label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Digite o ${selectedAgent.inputs[0]} aqui...`}
                  rows={6}
                />
              </div>
              
              <button 
                className="btn-send"
                onClick={handleExecuteAgent}
                disabled={executing === selectedAgent.id || !inputText.trim()}
              >
                {executing === selectedAgent.id ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Enviar para {selectedAgent.name}
                  </>
                )}
              </button>
              
              {outputText && (
                <div className="output-section">
                  <label>Output ({selectedAgent.outputs.join(', ')}):</label>
                  <div className="output-content">
                    <pre>{outputText}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentPanel;

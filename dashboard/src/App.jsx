import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import AgentDetail from './pages/AgentDetail';
import Projects from './pages/Projects';
import Issues from './pages/Issues';
import Goals from './pages/Goals';
import useWebSocket from './hooks/useWebSocket';
import api from './services/api';
import './App.css';

function App() {
  const [agents, setAgents] = useState([]);
  const [flows, setFlows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [health, setHealth] = useState({ hermes: false });
  const [loading, setLoading] = useState(true);

  // WebSocket
  const handleWsMessage = useCallback((msg) => {
    if (msg.type === 'agent:start' || msg.type === 'agent:complete') {
      loadAgents();
    }
  }, []);
  
  const { connected, logs, clearLogs } = useWebSocket(handleWsMessage);

  const loadAgents = async () => {
    try {
      const res = await api.getAgents();
      setAgents(res.agents || []);
    } catch (e) {
      console.error('Load agents error:', e);
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [agentsRes, flowsRes, projectsRes, healthRes] = await Promise.all([
        api.getAgents(),
        api.getFlows(),
        api.getProjects(),
        api.getHealth()
      ]);
      setAgents(agentsRes.agents || []);
      setFlows(flowsRes.flows || []);
      setProjects(projectsRes.projects || []);
      setHealth(healthRes);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app">
        <Sidebar 
          agents={agents} 
          projects={projects}
          connected={connected}
          health={health}
        />
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={
              <Dashboard 
                agents={agents}
                flows={flows}
                projects={projects}
                health={health}
                wsConnected={connected}
                logs={logs}
                clearLogs={clearLogs}
                onRefresh={loadData}
              />
            } />
            <Route path="/agent/:id" element={
              <AgentDetail 
                agents={agents}
                logs={logs}
                onRefresh={loadAgents}
              />
            } />
            <Route path="/projects" element={
              <Projects 
                projects={projects}
                agents={agents}
                onRefresh={loadData}
              />
            } />
            <Route path="/issues" element={
              <Issues 
                agents={agents}
                projects={projects}
                onRefresh={loadData}
              />
            } />
            <Route path="/goals" element={
              <Goals onRefresh={loadData} />
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

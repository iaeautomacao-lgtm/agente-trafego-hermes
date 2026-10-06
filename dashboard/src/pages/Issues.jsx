import { useState, useEffect } from 'react';
import api from '../services/api';
import './Issues.css';

function Issues({ agents, projects, onRefresh }) {
  const [issues, setIssues] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', assignedTo: '' });

  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    try {
      const res = await api.getIssues();
      setIssues(res.issues || []);
    } catch (e) {
      console.error('Load issues error:', e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createIssue(form);
      setShowForm(false);
      setForm({ title: '', description: '', priority: 'medium', assignedTo: '' });
      loadIssues();
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.updateIssue(id, { status });
      loadIssues();
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };

  const filteredIssues = filter === 'all' 
    ? issues 
    : issues.filter(i => i.status === filter);

  const priorityColors = {
    low: 'var(--text-dim)',
    medium: 'var(--accent-yellow)',
    high: 'var(--accent-red)'
  };

  return (
    <div className="page issues-page">
      <header className="page-header">
        <h1>ISSUES</h1>
        <div className="page-actions">
          <select 
            className="form-select filter-select"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option value="all">Todas</option>
            <option value="open">Abertas</option>
            <option value="in_progress">Em Progresso</option>
            <option value="done">Concluídas</option>
          </select>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Nova Issue
          </button>
        </div>
      </header>

      {/* Form */}
      {showForm && (
        <div className="form-card card">
          <h3>Nova Issue</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Título</label>
              <input
                type="text"
                className="form-input"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Prioridade</label>
                <select
                  className="form-select"
                  value={form.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Atribuir a</label>
                <select
                  className="form-select"
                  value={form.assignedTo}
                  onChange={e => setForm({ ...form, assignedTo: e.target.value })}
                >
                  <option value="">Nenhum</option>
                  {agents?.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Descrição</label>
              <textarea
                className="form-textarea"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">Criar</button>
            </div>
          </form>
        </div>
      )}

      {/* Issues List */}
      <div className="issues-list">
        {filteredIssues.map(issue => {
          const agent = agents?.find(a => a.id === issue.assignedTo);
          return (
            <div key={issue.id} className={`issue-card ${issue.status}`}>
              <div className="issue-left">
                <span className="issue-id">{issue.id}</span>
                <span 
                  className="issue-priority"
                  style={{ background: priorityColors[issue.priority] }}
                ></span>
              </div>
              <div className="issue-content">
                <h4>{issue.title}</h4>
                {issue.description && <p>{issue.description}</p>}
                <div className="issue-meta">
                  {agent && (
                    <span className="issue-assignee">{agent.icon} {agent.name}</span>
                  )}
                  <span className="issue-date">
                    {new Date(issue.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
              <div className="issue-actions">
                <select
                  className="form-select status-select"
                  value={issue.status}
                  onChange={e => updateStatus(issue.id, e.target.value)}
                >
                  <option value="open">Aberta</option>
                  <option value="in_progress">Em Progresso</option>
                  <option value="done">Concluída</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {filteredIssues.length === 0 && (
        <div className="empty-state card">
          <p>Nenhuma issue encontrada</p>
        </div>
      )}
    </div>
  );
}

export default Issues;

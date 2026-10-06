import { useState, useEffect } from 'react';
import api from '../services/api';
import './Projects.css';

function Projects({ projects: initialProjects, agents, onRefresh }) {
  const [projects, setProjects] = useState(initialProjects || []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', agents: [] });

  useEffect(() => {
    setProjects(initialProjects || []);
  }, [initialProjects]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createProject(form);
      setShowForm(false);
      setForm({ name: '', description: '', agents: [] });
      onRefresh?.();
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir projeto?')) return;
    try {
      await api.deleteProject(id);
      onRefresh?.();
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };

  return (
    <div className="page projects-page">
      <header className="page-header">
        <h1>PROJETOS</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Novo Projeto
        </button>
      </header>

      {/* Form */}
      {showForm && (
        <div className="form-card card">
          <h3>Novo Projeto</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nome</label>
              <input
                type="text"
                className="form-input"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
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

      {/* Projects List */}
      <div className="projects-grid">
        {projects.map(project => (
          <div key={project.id} className="project-card card">
            <div className="project-header">
              <h3>{project.name}</h3>
              <span className={`status-badge ${project.status === 'active' ? 'online' : 'offline'}`}>
                {project.status}
              </span>
            </div>
            <p className="project-desc">{project.description}</p>
            <div className="project-agents">
              {project.agents?.map(agentId => {
                const agent = agents?.find(a => a.id === agentId);
                return agent ? (
                  <span key={agentId} className="agent-tag">{agent.icon} {agent.name}</span>
                ) : null;
              })}
            </div>
            <div className="project-footer">
              <span className="project-date">
                {new Date(project.createdAt).toLocaleDateString('pt-BR')}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(project.id)}>
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && !showForm && (
        <div className="empty-state card">
          <p>Nenhum projeto ainda</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            Criar primeiro projeto
          </button>
        </div>
      )}
    </div>
  );
}

export default Projects;

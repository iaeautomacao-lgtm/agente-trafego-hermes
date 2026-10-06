import { useState, useEffect } from 'react';
import api from '../services/api';
import './Goals.css';

function Goals({ onRefresh }) {
  const [goals, setGoals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', target: '', unit: '', deadline: '' });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const res = await api.getGoals();
      setGoals(res.goals || []);
    } catch (e) {
      console.error('Load goals error:', e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createGoal({ ...form, target: Number(form.target) });
      setShowForm(false);
      setForm({ title: '', target: '', unit: '', deadline: '' });
      loadGoals();
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };

  const updateProgress = async (id, current) => {
    try {
      await api.updateGoal(id, { current: Number(current) });
      loadGoals();
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };

  return (
    <div className="page goals-page">
      <header className="page-header">
        <h1>GOALS</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Nova Meta
        </button>
      </header>

      {/* Form */}
      {showForm && (
        <div className="form-card card">
          <h3>Nova Meta</h3>
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
                <label className="form-label">Meta</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.target}
                  onChange={e => setForm({ ...form, target: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unidade</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ex: campanhas, %"
                  value={form.unit}
                  onChange={e => setForm({ ...form, unit: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Prazo</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.deadline}
                  onChange={e => setForm({ ...form, deadline: e.target.value })}
                />
              </div>
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

      {/* Goals Grid */}
      <div className="goals-grid">
        {goals.map(goal => {
          const progress = Math.min((goal.current / goal.target) * 100, 100);
          const isComplete = goal.current >= goal.target;
          
          return (
            <div key={goal.id} className={`goal-card card ${isComplete ? 'complete' : ''}`}>
              <div className="goal-header">
                <span className="goal-icon">{isComplete ? '✓' : '🎯'}</span>
                <h3>{goal.title}</h3>
              </div>
              
              <div className="goal-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${progress}%`,
                      background: isComplete ? 'var(--accent-green)' : 'var(--accent-blue)'
                    }}
                  ></div>
                </div>
                <div className="progress-text">
                  <span className="progress-current">{goal.current}</span>
                  <span className="progress-sep">/</span>
                  <span className="progress-target">{goal.target} {goal.unit}</span>
                </div>
              </div>

              <div className="goal-footer">
                {goal.deadline && (
                  <span className="goal-deadline">
                    Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                  </span>
                )}
                <div className="goal-actions">
                  <input
                    type="number"
                    className="progress-input"
                    value={goal.current}
                    onChange={e => updateProgress(goal.id, e.target.value)}
                    min="0"
                    max={goal.target * 2}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {goals.length === 0 && !showForm && (
        <div className="empty-state card">
          <p>Nenhuma meta definida</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            Criar primeira meta
          </button>
        </div>
      )}
    </div>
  );
}

export default Goals;

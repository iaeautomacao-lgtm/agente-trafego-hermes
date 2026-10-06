import { useState } from 'react';
import './AgentForm.css';

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', 
  '#EF4444', '#06B6D4', '#EC4899', '#6B7280'
];

const ICONS = ['📊', '✍️', '✅', '📈', '🤖', '⚡', '🎯', '💡', '🔧', '📋'];

function AgentForm({ agent, onSave, onCancel }) {
  const [form, setForm] = useState({
    id: agent?.id || '',
    name: agent?.name || '',
    skill: agent?.skill || '',
    role: agent?.role || '',
    description: agent?.description || '',
    icon: agent?.icon || '🤖',
    color: agent?.color || '#3B82F6',
    inputs: agent?.inputs?.join(', ') || 'input',
    outputs: agent?.outputs?.join(', ') || 'output'
  });

  const isEdit = Boolean(agent?.id);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...form,
      inputs: form.inputs.split(',').map(s => s.trim()).filter(Boolean),
      outputs: form.outputs.split(',').map(s => s.trim()).filter(Boolean)
    };
    
    onSave(data);
  };

  return (
    <div className="agent-form-overlay" onClick={onCancel}>
      <div className="agent-form" onClick={e => e.stopPropagation()}>
        <header className="form-header">
          <h2>{isEdit ? 'Editar Agente' : 'Novo Agente'}</h2>
          <button className="btn-close" onClick={onCancel}>✕</button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="form-body">
            {/* Icon & Color */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Ícone</label>
                <div className="icon-picker">
                  {ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      className={`icon-option ${form.icon === icon ? 'selected' : ''}`}
                      onClick={() => setForm({ ...form, icon })}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Cor</label>
                <div className="color-picker">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`color-option ${form.color === color ? 'selected' : ''}`}
                      style={{ background: color }}
                      onClick={() => setForm({ ...form, color })}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* ID & Name */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">ID (único)</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.id}
                  onChange={e => setForm({ ...form, id: e.target.value.toLowerCase().replace(/\s/g, '-') })}
                  disabled={isEdit}
                  placeholder="meu-agente"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Meu Agente"
                  required
                />
              </div>
            </div>

            {/* Skill & Role */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Skill (Hermes)</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.skill}
                  onChange={e => setForm({ ...form, skill: e.target.value })}
                  placeholder="ddm-meu-agente"
                  required
                />
                <span className="form-hint">Nome da skill registrada no Hermes</span>
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  placeholder="Análise, Criação, etc"
                />
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Descrição</label>
              <textarea
                className="form-textarea"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="O que este agente faz..."
                rows={3}
              />
            </div>

            {/* Inputs & Outputs */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Inputs (separados por vírgula)</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.inputs}
                  onChange={e => setForm({ ...form, inputs: e.target.value })}
                  placeholder="briefing, dados"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Outputs (separados por vírgula)</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.outputs}
                  onChange={e => setForm({ ...form, outputs: e.target.value })}
                  placeholder="plano, relatorio"
                />
              </div>
            </div>
          </div>

          <footer className="form-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {isEdit ? 'Salvar' : 'Criar Agente'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default AgentForm;

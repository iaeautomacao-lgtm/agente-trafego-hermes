import { useState } from 'react';
import './ExecutionModal.css';

function ExecutionModal({ type, data, onClose, onExecute, executing }) {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onExecute(input);
    }
  };

  const getPlaceholder = () => {
    if (type === 'flow') {
      return 'Digite o briefing inicial para o fluxo...';
    }
    if (data?.inputs?.[0] === 'briefing') {
      return 'Cole o briefing da campanha aqui...\n\nExemplo:\nObjetivo: Re-engajamento alunos\nInstituição: Faculdade XYZ\nOrçamento: R$ 3.000/mês\nPeríodo: Julho 2024';
    }
    if (data?.inputs?.[0] === 'plano_campanha') {
      return 'Cole o plano de campanha gerado pelo Estrategista...';
    }
    if (data?.inputs?.[0] === 'pack_criativos') {
      return 'Cole o pack de criativos gerado pelo Criativo...';
    }
    if (data?.inputs?.[0] === 'relatorio_meta') {
      return 'Cole os dados do Meta Ads Manager (CSV ou tabela)...';
    }
    return 'Digite o input para o agente...';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <div className="modal-title">
            <span className="modal-icon">{data?.icon || '🔄'}</span>
            <div>
              <h2>{type === 'flow' ? data?.name : `Executar ${data?.name}`}</h2>
              <p className="modal-subtitle">
                {type === 'flow' 
                  ? data?.description 
                  : `Skill: ${data?.skill}`}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {type === 'flow' && (
              <div className="flow-steps">
                <span className="flow-label">Fluxo:</span>
                {data?.steps?.map((step, i) => (
                  <span key={step}>
                    {i > 0 && ' → '}
                    <span className="flow-step">{step}</span>
                  </span>
                ))}
              </div>
            )}

            <label className="input-label">
              {type === 'flow' ? 'Briefing inicial' : `Input (${data?.inputs?.join(', ')})`}
            </label>
            <textarea
              className="input-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={getPlaceholder()}
              rows={12}
              disabled={executing}
              autoFocus
            />

            {data?.outputs && (
              <p className="output-info">
                Output esperado: <code>{data.outputs.join(', ')}</code>
              </p>
            )}
          </div>

          <footer className="modal-footer">
            <button 
              type="button" 
              className="btn-cancel" 
              onClick={onClose}
              disabled={executing}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-execute"
              disabled={!input.trim() || executing}
            >
              {executing ? (
                <>
                  <span className="spinner"></span>
                  Executando...
                </>
              ) : (
                <>▶ Executar</>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default ExecutionModal;

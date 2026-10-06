/**
 * Serviço de Agentes DDM - Integração Real com Backend/Hermes
 * Dashboard de Tráfego Pago
 */

const API_BASE = '/api';

// ============================================================================
// CONFIGURAÇÃO DOS AGENTES DDM (espelho do backend)
// ============================================================================

export const DDM_AGENTS = [
  {
    id: 'estrategista',
    name: 'Estrategista',
    skill: 'ddm-estrategista-trafego',
    role: 'Planejamento',
    description: 'Transforma briefings em planos de campanha estruturados',
    color: '#3B82F6',
    icon: '📊',
    order: 1,
    inputs: ['briefing'],
    outputs: ['plano_campanha']
  },
  {
    id: 'criativo',
    name: 'Criativo',
    skill: 'ddm-criativo-anuncios',
    role: 'Produção',
    description: 'Produz copies e briefs visuais para Meta Ads',
    color: '#8B5CF6',
    icon: '✨',
    order: 2,
    inputs: ['plano_campanha'],
    outputs: ['pack_criativos']
  },
  {
    id: 'compliance',
    name: 'Compliance',
    skill: 'ddm-compliance-anuncios',
    role: 'Controle',
    description: 'Revisa criativos (Meta Ads, LGPD, ética DDM)',
    color: '#10B981',
    icon: '✅',
    order: 3,
    inputs: ['pack_criativos'],
    outputs: ['parecer_compliance']
  },
  {
    id: 'dados',
    name: 'Dados',
    skill: 'ddm-dados-campanhas',
    role: 'Inteligência',
    description: 'Analisa métricas e gera hipóteses para próximo ciclo',
    color: '#F59E0B',
    icon: '📈',
    order: 4,
    inputs: ['relatorio_meta'],
    outputs: ['analise_dados']
  }
];

// ============================================================================
// FUNÇÕES DE API - AGENTES
// ============================================================================

/**
 * Busca lista de agentes com status atual
 */
export const fetchDDMAgents = async () => {
  try {
    const response = await fetch(`${API_BASE}/agents`);
    const data = await response.json();
    
    if (data.success) {
      return data.agents;
    }
    
    console.error('Erro ao buscar agentes:', data.error);
    return DDM_AGENTS; // Fallback para config local
  } catch (error) {
    console.error('Erro de conexão:', error);
    // Retorna agentes locais com status idle
    return DDM_AGENTS.map(agent => ({
      ...agent,
      status: 'offline',
      lastRun: null,
      lastOutput: null,
      metrics: { totalRuns: 0, successRate: 100, avgDuration: 0 }
    }));
  }
};

/**
 * Executa um agente específico
 * @param {string} agentId - ID do agente
 * @param {object} input - Dados de entrada
 */
export const executeAgent = async (agentId, input) => {
  try {
    const response = await fetch(`${API_BASE}/agents/${agentId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: typeof input === 'string' ? input : JSON.stringify(input) })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Erro ao executar agente ${agentId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Executa fluxo completo: Estrategista → Criativo → Compliance
 * @param {string} briefing - Briefing da campanha
 */
export const executeFullFlow = async (briefing) => {
  try {
    const response = await fetch(`${API_BASE}/agents/flow/full`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ briefing })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao executar fluxo completo:', error);
    return {
      success: false,
      error: error.message,
      results: []
    };
  }
};

/**
 * Executa análise de dados
 * @param {string} relatorio - Relatório do Meta Ads
 */
export const executeDataAnalysis = async (relatorio) => {
  try {
    const response = await fetch(`${API_BASE}/agents/flow/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relatorio })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao executar análise:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Reseta status de um agente
 */
export const resetAgent = async (agentId) => {
  try {
    const response = await fetch(`${API_BASE}/agents/${agentId}/reset`, {
      method: 'POST'
    });
    return await response.json();
  } catch (error) {
    console.error(`Erro ao resetar agente ${agentId}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Verifica saúde da API e integração com Hermes
 */
export const checkHealth = async () => {
  try {
    const response = await fetch(`${API_BASE}/agents/meta/health`);
    return await response.json();
  } catch (error) {
    return {
      success: false,
      hermes: { available: false },
      status: 'offline'
    };
  }
};

// ============================================================================
// FUNÇÕES DE API - DASHBOARD
// ============================================================================

/**
 * Busca métricas do dashboard
 */
export const fetchDashboardMetrics = async () => {
  try {
    const [metricsRes, agentsRes] = await Promise.all([
      fetch(`${API_BASE}/metrics`),
      fetch(`${API_BASE}/agents`)
    ]);
    
    const metrics = await metricsRes.json();
    const agentsData = await agentsRes.json();
    
    const agents = agentsData.agents || [];
    
    return {
      agentsEnabled: agents.length,
      agentsRunning: agents.filter(a => a.status === 'running').length,
      agentsPaused: agents.filter(a => a.status === 'paused').length,
      agentsErrors: agents.filter(a => a.status === 'error').length,
      tasksInProgress: metrics.tasksInProgress || 0,
      tasksOpen: metrics.tasksOpen || 0,
      tasksBlocked: metrics.tasksBlocked || 0,
      monthSpend: metrics.monthSpend || 0,
      pendingApprovals: metrics.pendingApprovals || 0,
      staleTasks: metrics.staleTasks || 0
    };
  } catch (error) {
    console.error('Erro ao buscar métricas:', error);
    return {
      agentsEnabled: 4,
      agentsRunning: 0,
      agentsPaused: 0,
      agentsErrors: 0,
      tasksInProgress: 0,
      tasksOpen: 0,
      tasksBlocked: 0,
      monthSpend: 0,
      pendingApprovals: 0,
      staleTasks: 0
    };
  }
};

/**
 * Busca atividade recente
 */
export const fetchRecentActivity = async () => {
  try {
    const response = await fetch(`${API_BASE}/agents/meta/history`);
    const data = await response.json();
    
    if (data.success && data.history) {
      return data.history.map((item, index) => ({
        id: item.id || index,
        agent: item.agent,
        action: item.action,
        time: formatTimeAgo(item.time)
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao buscar atividade:', error);
    return [
      { id: 1, agent: 'Sistema', action: 'Aguardando conexão com servidor...', time: 'agora' }
    ];
  }
};

/**
 * Busca tarefas recentes (placeholder - implementar quando tiver backend de tarefas)
 */
export const fetchRecentTasks = async () => {
  return [
    { id: 1, title: 'Aguardando primeira execução', time: '-', status: 'todo' }
  ];
};

/**
 * Busca dados do organograma
 */
export const fetchOrganogramData = async () => {
  try {
    const response = await fetch(`${API_BASE}/agents`);
    const data = await response.json();
    
    const agents = data.agents || DDM_AGENTS;
    
    return {
      id: 'orquestrador',
      name: 'Orquestrador',
      role: 'COORDENADOR DE TRÁFEGO PAGO',
      model: 'Hermes',
      stats: { 
        agents: agents.length, 
        skills: agents.length + 1, 
        squads: 1, 
        mcps: agents.length 
      },
      children: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        role: agent.role.toUpperCase(),
        model: 'Hermes Skill',
        stats: { agents: 1, skills: 1, squads: 0, mcps: 1 },
        children: []
      }))
    };
  } catch (error) {
    console.error('Erro ao buscar organograma:', error);
    return {
      id: 'orquestrador',
      name: 'Orquestrador',
      role: 'COORDENADOR DE TRÁFEGO PAGO (Offline)',
      model: 'Hermes',
      stats: { agents: 4, skills: 5, squads: 1, mcps: 5 },
      children: DDM_AGENTS.map(agent => ({
        id: agent.id,
        name: agent.name,
        role: agent.role.toUpperCase(),
        model: 'Hermes Skill',
        stats: { agents: 1, skills: 1, squads: 0, mcps: 1 },
        children: []
      }))
    };
  }
};

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Formata timestamp para "X ago"
 */
function formatTimeAgo(timestamp) {
  if (!timestamp) return '-';
  
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

/**
 * Retorna fluxo visual dos agentes
 */
export const getAgentFlow = () => {
  return [
    { from: 'briefing', to: 'estrategista', label: 'briefing' },
    { from: 'estrategista', to: 'criativo', label: 'plano_campanha' },
    { from: 'criativo', to: 'compliance', label: 'pack_criativos' },
    { from: 'compliance', to: 'humano', label: 'parecer' },
    { from: 'humano', to: 'publicacao', label: 'aprovação' },
    { from: 'publicacao', to: 'dados', label: 'métricas' },
    { from: 'dados', to: 'estrategista', label: 'hipóteses', dashed: true }
  ];
};

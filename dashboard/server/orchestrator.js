/**
 * Orchestrator - Motor execução agentes com logging e tokens
 */
import { executeSkill } from './hermes-bridge.js';
import * as state from './state-manager.js';
import { logger } from './logger.js';
import { trackUsage } from './token-tracker.js';
import { EventEmitter } from 'events';

export const events = new EventEmitter();

export async function runAgent(agentId, input) {
  const agent = state.getAgent(agentId);
  if (!agent) throw new Error(`Agent not found: ${agentId}`);
  
  logger.info(agentId, `Iniciando execução`, { skill: agent.skill });
  logger.debug(agentId, `Input: ${input.substring(0, 200)}...`);
  
  state.updateAgent(agentId, { status: 'running', lastRunStart: new Date().toISOString() });
  events.emit('agent:start', { agentId, input });
  
  try {
    const result = await executeSkill(agent.skill, input);
    
    // Track tokens
    const usage = trackUsage(agentId, input, result.output || '', 'claude-sonnet-4');
    logger.info(agentId, `Tokens: ${usage.totalTokens} (~$${usage.cost.toFixed(4)})`);
    
    const status = result.success ? 'success' : 'error';
    
    if (result.success) {
      logger.info(agentId, `Execução concluída com sucesso`, { duration: result.duration });
    } else {
      logger.error(agentId, `Execução falhou: ${result.error}`);
    }
    
    state.updateAgent(agentId, { 
      status,
      lastRun: new Date().toISOString(),
      lastOutput: result.output?.substring(0, 5000),
      lastError: result.error
    });
    state.updateAgentMetrics(agentId, result.success, result.duration);
    
    state.addHistory({
      agentId,
      agentName: agent.name,
      input: input.substring(0, 500),
      output: result.output?.substring(0, 5000),
      success: result.success,
      error: result.error,
      duration: result.duration,
      tokens: usage.totalTokens,
      cost: usage.cost
    });
    
    if (result.success && agent.outputs?.[0]) {
      state.setContext(agent.outputs[0], result.output);
    }
    
    events.emit('agent:complete', { agentId, result, usage });
    
    setTimeout(() => {
      const current = state.getAgent(agentId);
      if (current?.status !== 'running') {
        state.updateAgent(agentId, { status: 'idle' });
      }
    }, 5000);
    
    return { agentId, ...result, usage };
    
  } catch (err) {
    logger.error(agentId, `Erro fatal: ${err.message}`);
    state.updateAgent(agentId, { status: 'error', lastError: err.message });
    events.emit('agent:error', { agentId, error: err.message });
    throw err;
  }
}

export async function runFlow(flowId, initialInput) {
  const flow = state.getFlow(flowId);
  if (!flow) throw new Error(`Flow not found: ${flowId}`);
  
  logger.info('orchestrator', `Iniciando fluxo: ${flow.name}`, { steps: flow.steps });
  
  state.setState({ currentFlow: flowId, currentStep: 0 });
  events.emit('flow:start', { flowId, flow });
  
  const results = [];
  let currentInput = initialInput;
  
  for (let i = 0; i < flow.steps.length; i++) {
    const agentId = flow.steps[i];
    state.setState({ currentStep: i });
    
    logger.info('orchestrator', `Etapa ${i + 1}/${flow.steps.length}: ${agentId}`);
    
    try {
      const result = await runAgent(agentId, currentInput);
      results.push(result);
      
      if (!result.success) {
        logger.error('orchestrator', `Fluxo interrompido em ${agentId}`);
        events.emit('flow:error', { flowId, step: i, agentId, error: result.error });
        break;
      }
      
      currentInput = result.output;
      
    } catch (err) {
      logger.error('orchestrator', `Erro no fluxo: ${err.message}`);
      results.push({ agentId, success: false, error: err.message });
      break;
    }
  }
  
  const success = results.every(r => r.success);
  logger.info('orchestrator', `Fluxo ${success ? 'concluído' : 'falhou'}`, { 
    flowId, 
    steps: results.length,
    success 
  });
  
  state.setState({ currentFlow: null, currentStep: null });
  events.emit('flow:complete', { flowId, results, success });
  
  return { flowId, results, success };
}

export function getMetrics() {
  const agents = state.getAgents();
  const history = state.getHistory(100);
  
  const totalRuns = agents.reduce((sum, a) => sum + a.metrics.totalRuns, 0);
  const successRuns = agents.reduce((sum, a) => sum + a.metrics.successCount, 0);
  const activeAgents = agents.filter(a => a.status === 'running').length;
  
  const dayAgo = Date.now() - 86400000;
  const recentRuns = history.filter(h => new Date(h.timestamp) > dayAgo);
  
  return {
    agents: {
      total: agents.length,
      active: activeAgents,
      idle: agents.length - activeAgents
    },
    runs: {
      total: totalRuns,
      success: successRuns,
      failed: totalRuns - successRuns,
      successRate: totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 100
    },
    recent: {
      last24h: recentRuns.length,
      lastRun: history[0]?.timestamp || null
    }
  };
}

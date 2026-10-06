/**
 * State Manager - Persiste estado agentes
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');

function loadJSON(file) {
  const path = join(DATA_DIR, file);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function saveJSON(file, data) {
  writeFileSync(join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

// Agentes
export function getAgents() {
  return loadJSON('agents.json')?.agents || [];
}

export function getAgent(id) {
  return getAgents().find(a => a.id === id);
}

export function updateAgent(id, updates) {
  const data = loadJSON('agents.json');
  const idx = data.agents.findIndex(a => a.id === id);
  if (idx >= 0) {
    data.agents[idx] = { ...data.agents[idx], ...updates };
    saveJSON('agents.json', data);
  }
  return data.agents[idx];
}

export function updateAgentMetrics(id, success, duration) {
  const data = loadJSON('agents.json');
  const agent = data.agents.find(a => a.id === id);
  if (agent) {
    agent.metrics.totalRuns++;
    if (success) agent.metrics.successCount++;
    else agent.metrics.failCount++;
    agent.metrics.avgDuration = Math.round(
      (agent.metrics.avgDuration * (agent.metrics.totalRuns - 1) + duration) / agent.metrics.totalRuns
    );
    saveJSON('agents.json', data);
  }
  return agent;
}

// Flows
export function getFlows() {
  return loadJSON('agents.json')?.flows || [];
}

export function getFlow(id) {
  return getFlows().find(f => f.id === id);
}

// History
export function getHistory(limit = 50) {
  const data = loadJSON('history.json');
  return (data?.executions || []).slice(-limit).reverse();
}

export function addHistory(entry) {
  const data = loadJSON('history.json') || { executions: [] };
  data.executions.push({
    ...entry,
    id: `exec_${Date.now()}`,
    timestamp: new Date().toISOString()
  });
  // Keep last 500
  if (data.executions.length > 500) {
    data.executions = data.executions.slice(-500);
  }
  saveJSON('history.json', data);
  return entry;
}

// State
export function getState() {
  return loadJSON('state.json') || {};
}

export function setState(updates) {
  const state = getState();
  const newState = { ...state, ...updates, lastActivity: new Date().toISOString() };
  saveJSON('state.json', newState);
  return newState;
}

export function setContext(key, value) {
  const state = getState();
  state.context = state.context || {};
  state.context[key] = value;
  saveJSON('state.json', state);
}

export function getContext(key) {
  return getState().context?.[key];
}

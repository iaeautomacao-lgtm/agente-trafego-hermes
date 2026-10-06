/**
 * Routes: Agents API
 */
import { Router } from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as state from '../state-manager.js';
import * as orchestrator from '../orchestrator.js';
import { checkHermes } from '../hermes-bridge.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENTS_FILE = join(__dirname, '../data/agents.json');

const router = Router();

function loadAgentsFile() {
  return JSON.parse(readFileSync(AGENTS_FILE, 'utf-8'));
}

function saveAgentsFile(data) {
  writeFileSync(AGENTS_FILE, JSON.stringify(data, null, 2));
}

// GET /agents - Lista todos
router.get('/', (req, res) => {
  const agents = state.getAgents();
  res.json({ success: true, agents });
});

// GET /agents/metrics - Métricas gerais
router.get('/metrics', (req, res) => {
  const metrics = orchestrator.getMetrics();
  res.json({ success: true, metrics });
});

// GET /agents/history - Histórico execuções
router.get('/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const history = state.getHistory(limit);
  res.json({ success: true, history });
});

// GET /agents/state - Estado atual
router.get('/state', (req, res) => {
  const st = state.getState();
  res.json({ success: true, state: st });
});

// GET /agents/health - Health check
router.get('/health', async (req, res) => {
  const hermesOk = await checkHermes();
  res.json({
    success: true,
    hermes: hermesOk,
    timestamp: new Date().toISOString()
  });
});

// GET /agents/flows/list - Lista fluxos
router.get('/flows/list', (req, res) => {
  const flows = state.getFlows();
  res.json({ success: true, flows });
});

// POST /agents/flows/:id/execute - Executa fluxo
router.post('/flows/:id/execute', async (req, res) => {
  const { id } = req.params;
  const { input } = req.body;
  
  if (!input) {
    return res.status(400).json({ success: false, error: 'Input required' });
  }
  
  try {
    const result = await orchestrator.runFlow(id, input);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /agents/:id - Detalhes agente
router.get('/:id', (req, res) => {
  const agent = state.getAgent(req.params.id);
  if (!agent) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }
  res.json({ success: true, agent });
});

// POST /agents - Criar novo agente
router.post('/', (req, res) => {
  const { id, name, skill, role, description, icon, color, inputs, outputs } = req.body;
  
  if (!id || !name || !skill) {
    return res.status(400).json({ success: false, error: 'id, name, skill required' });
  }
  
  const data = loadAgentsFile();
  
  // Check duplicate
  if (data.agents.find(a => a.id === id)) {
    return res.status(400).json({ success: false, error: 'Agent ID already exists' });
  }
  
  const newAgent = {
    id,
    name,
    skill,
    role: role || 'Custom',
    description: description || '',
    icon: icon || '🤖',
    color: color || '#6B7280',
    order: data.agents.length + 1,
    inputs: inputs || ['input'],
    outputs: outputs || ['output'],
    status: 'idle',
    metrics: { totalRuns: 0, successCount: 0, failCount: 0, avgDuration: 0 }
  };
  
  data.agents.push(newAgent);
  saveAgentsFile(data);
  
  res.json({ success: true, agent: newAgent });
});

// PUT /agents/:id - Atualizar agente
router.put('/:id', (req, res) => {
  const data = loadAgentsFile();
  const idx = data.agents.findIndex(a => a.id === req.params.id);
  
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }
  
  // Prevent changing id
  const { id, metrics, ...updates } = req.body;
  data.agents[idx] = { ...data.agents[idx], ...updates };
  saveAgentsFile(data);
  
  res.json({ success: true, agent: data.agents[idx] });
});

// DELETE /agents/:id - Remover agente
router.delete('/:id', (req, res) => {
  const data = loadAgentsFile();
  const idx = data.agents.findIndex(a => a.id === req.params.id);
  
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }
  
  data.agents.splice(idx, 1);
  saveAgentsFile(data);
  
  res.json({ success: true });
});

// POST /agents/:id/execute - Executa agente individual
router.post('/:id/execute', async (req, res) => {
  const { id } = req.params;
  const { input } = req.body;
  
  if (!input) {
    return res.status(400).json({ success: false, error: 'Input required' });
  }
  
  const agent = state.getAgent(id);
  if (!agent) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }
  
  try {
    const result = await orchestrator.runAgent(id, input);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

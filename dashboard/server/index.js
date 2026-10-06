/**
 * DDM Agents Orchestrator API
 */
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import agentsRouter from './routes/agents.js';
import projectsRouter from './routes/projects.js';
import issuesRouter from './routes/issues.js';
import goalsRouter from './routes/goals.js';
import logsRouter from './routes/logs.js';
import usageRouter from './routes/usage.js';
import { initWebSocket } from './websocket.js';
import { events } from './orchestrator.js';

process.stdin.on('error', () => {});

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/agents', agentsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/issues', issuesRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/usage', usageRouter);

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'DDM Agents API', timestamp: new Date().toISOString() });
});

// Root
app.get('/', (req, res) => {
  res.json({
    name: 'DDM Agents Orchestrator',
    version: '2.0.0',
    endpoints: [
      'GET  /api/agents',
      'POST /api/agents',
      'GET  /api/agents/:id',
      'PUT  /api/agents/:id',
      'DELETE /api/agents/:id',
      'POST /api/agents/:id/execute',
      'GET  /api/agents/flows/list',
      'POST /api/agents/flows/:id/execute',
      'GET  /api/agents/metrics',
      'GET  /api/agents/history',
      'GET  /api/projects',
      'GET  /api/issues',
      'GET  /api/goals',
      'GET  /api/logs',
      'GET  /api/usage',
      'WS   /ws'
    ]
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Not found: ${req.method} ${req.path}` });
});

// WebSocket
initWebSocket(server);

// Event logging
events.on('agent:start', ({ agentId }) => console.log(`▶ [${agentId}] started`));
events.on('agent:complete', ({ agentId, result }) => 
  console.log(`${result.success ? '✓' : '✗'} [${agentId}] ${result.duration}ms`));
events.on('flow:start', ({ flowId }) => console.log(`⚡ Flow ${flowId} started`));
events.on('flow:complete', ({ flowId, success }) => 
  console.log(`${success ? '✓' : '✗'} Flow ${flowId} complete`));

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║         DDM AGENTS ORCHESTRATOR v2.0                  ║
╠═══════════════════════════════════════════════════════╣
║  HTTP: http://localhost:${PORT}                          ║
║  WS:   ws://localhost:${PORT}/ws                         ║
╠═══════════════════════════════════════════════════════╣
║  Endpoints:                                           ║
║    /api/agents      Agents CRUD + Execute             ║
║    /api/projects    Projects                          ║
║    /api/issues      Issues/Tasks                      ║
║    /api/goals       Goals/KPIs                        ║
║    /api/logs        Logs                              ║
║    /api/usage       Token Usage                       ║
╚═══════════════════════════════════════════════════════╝
`);
});

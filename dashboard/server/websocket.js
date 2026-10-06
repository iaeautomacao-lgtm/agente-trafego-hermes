/**
 * WebSocket Server - Real-time updates
 */
import { WebSocketServer } from 'ws';
import { logEvents } from './logger.js';
import { events as orchestratorEvents } from './orchestrator.js';

let wss = null;
const clients = new Set();

export function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });
  
  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`[WS] Client connected (${clients.size} total)`);
    
    // Send welcome
    ws.send(JSON.stringify({ type: 'connected', clients: clients.size }));
    
    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[WS] Client disconnected (${clients.size} total)`);
    });
    
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        handleMessage(ws, msg);
      } catch (e) {
        // ignore
      }
    });
  });
  
  // Forward log events
  logEvents.on('log', (entry) => {
    broadcast({ type: 'log', data: entry });
  });
  
  // Forward orchestrator events
  orchestratorEvents.on('agent:start', (data) => {
    broadcast({ type: 'agent:start', data });
  });
  
  orchestratorEvents.on('agent:complete', (data) => {
    broadcast({ type: 'agent:complete', data });
  });
  
  orchestratorEvents.on('agent:error', (data) => {
    broadcast({ type: 'agent:error', data });
  });
  
  orchestratorEvents.on('flow:start', (data) => {
    broadcast({ type: 'flow:start', data });
  });
  
  orchestratorEvents.on('flow:complete', (data) => {
    broadcast({ type: 'flow:complete', data });
  });
  
  console.log('[WS] WebSocket server initialized');
}

function broadcast(message) {
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === 1) { // OPEN
      client.send(data);
    }
  }
}

function handleMessage(ws, msg) {
  switch (msg.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
    case 'subscribe':
      // Could implement per-agent subscriptions
      break;
  }
}

export function sendToClient(ws, message) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}

export { broadcast };

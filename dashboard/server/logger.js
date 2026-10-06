/**
 * Logger - Sistema de logs detalhados
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGS_FILE = join(__dirname, 'data/logs.json');

export const logEvents = new EventEmitter();

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

function loadLogs() {
  if (!existsSync(LOGS_FILE)) return { logs: [] };
  return JSON.parse(readFileSync(LOGS_FILE, 'utf-8'));
}

function saveLogs(data) {
  writeFileSync(LOGS_FILE, JSON.stringify(data, null, 2));
}

export function log(level, agentId, message, meta = {}) {
  const entry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    level,
    agentId,
    message,
    meta,
    timestamp: new Date().toISOString()
  };
  
  // Save to file
  const data = loadLogs();
  data.logs.push(entry);
  
  // Keep last 1000 logs
  if (data.logs.length > 1000) {
    data.logs = data.logs.slice(-1000);
  }
  saveLogs(data);
  
  // Emit for WebSocket
  logEvents.emit('log', entry);
  
  // Console
  const color = { debug: '\x1b[90m', info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m' }[level];
  console.log(`${color}[${level.toUpperCase()}]\x1b[0m [${agentId}] ${message}`);
  
  return entry;
}

export const logger = {
  debug: (agentId, msg, meta) => log('debug', agentId, msg, meta),
  info: (agentId, msg, meta) => log('info', agentId, msg, meta),
  warn: (agentId, msg, meta) => log('warn', agentId, msg, meta),
  error: (agentId, msg, meta) => log('error', agentId, msg, meta)
};

export function getLogs(options = {}) {
  const { agentId, level, limit = 100, offset = 0 } = options;
  let logs = loadLogs().logs;
  
  if (agentId) {
    logs = logs.filter(l => l.agentId === agentId);
  }
  if (level) {
    const minLevel = LOG_LEVELS[level] || 0;
    logs = logs.filter(l => LOG_LEVELS[l.level] >= minLevel);
  }
  
  return logs.slice(-limit - offset, logs.length - offset).reverse();
}

export function clearLogs(agentId = null) {
  if (agentId) {
    const data = loadLogs();
    data.logs = data.logs.filter(l => l.agentId !== agentId);
    saveLogs(data);
  } else {
    saveLogs({ logs: [] });
  }
}

/**
 * Token Tracker - Contagem tokens e custos
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const USAGE_FILE = join(__dirname, 'data/usage.json');

// Preços por 1K tokens (estimativa)
const PRICING = {
  'claude-sonnet-4': { input: 0.003, output: 0.015 },
  'claude-opus-4': { input: 0.015, output: 0.075 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'default': { input: 0.002, output: 0.010 }
};

function loadUsage() {
  if (!existsSync(USAGE_FILE)) {
    return { totalTokens: 0, totalCost: 0, byAgent: {}, byDay: {}, history: [] };
  }
  return JSON.parse(readFileSync(USAGE_FILE, 'utf-8')).usage;
}

function saveUsage(usage) {
  writeFileSync(USAGE_FILE, JSON.stringify({ usage }, null, 2));
}

export function trackUsage(agentId, inputText, outputText, model = 'default') {
  const usage = loadUsage();
  
  // Estimativa tokens (4 chars = 1 token aprox)
  const inputTokens = Math.ceil((inputText?.length || 0) / 4);
  const outputTokens = Math.ceil((outputText?.length || 0) / 4);
  const totalTokens = inputTokens + outputTokens;
  
  // Custo
  const pricing = PRICING[model] || PRICING.default;
  const cost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1000;
  
  // Update totals
  usage.totalTokens += totalTokens;
  usage.totalCost += cost;
  
  // By agent
  if (!usage.byAgent[agentId]) {
    usage.byAgent[agentId] = { tokens: 0, cost: 0, runs: 0 };
  }
  usage.byAgent[agentId].tokens += totalTokens;
  usage.byAgent[agentId].cost += cost;
  usage.byAgent[agentId].runs += 1;
  
  // By day
  const today = new Date().toISOString().split('T')[0];
  if (!usage.byDay[today]) {
    usage.byDay[today] = { tokens: 0, cost: 0, runs: 0 };
  }
  usage.byDay[today].tokens += totalTokens;
  usage.byDay[today].cost += cost;
  usage.byDay[today].runs += 1;
  
  // History (last 100)
  usage.history.push({
    agentId,
    inputTokens,
    outputTokens,
    totalTokens,
    cost: Math.round(cost * 10000) / 10000,
    model,
    timestamp: new Date().toISOString()
  });
  if (usage.history.length > 100) {
    usage.history = usage.history.slice(-100);
  }
  
  saveUsage(usage);
  
  return { inputTokens, outputTokens, totalTokens, cost };
}

export function getUsage() {
  return loadUsage();
}

export function getUsageByAgent(agentId) {
  const usage = loadUsage();
  return usage.byAgent[agentId] || { tokens: 0, cost: 0, runs: 0 };
}

export function getUsageLast7Days() {
  const usage = loadUsage();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0];
    days.push({
      date: key,
      ...( usage.byDay[key] || { tokens: 0, cost: 0, runs: 0 })
    });
  }
  return days;
}

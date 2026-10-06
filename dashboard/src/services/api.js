/**
 * API Client completo
 */
const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Agents
  getAgents: () => request('/agents'),
  getAgent: (id) => request(`/agents/${id}`),
  createAgent: (agent) => request('/agents', { method: 'POST', body: JSON.stringify(agent) }),
  updateAgent: (id, data) => request(`/agents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAgent: (id) => request(`/agents/${id}`, { method: 'DELETE' }),
  executeAgent: (id, input) => request(`/agents/${id}/execute`, { method: 'POST', body: JSON.stringify({ input }) }),
  
  // Metrics & State
  getMetrics: () => request('/agents/metrics'),
  getHistory: (limit = 50) => request(`/agents/history?limit=${limit}`),
  getState: () => request('/agents/state'),
  getHealth: () => request('/agents/health'),
  
  // Flows
  getFlows: () => request('/agents/flows/list'),
  executeFlow: (id, input) => request(`/agents/flows/${id}/execute`, { method: 'POST', body: JSON.stringify({ input }) }),
  
  // Projects
  getProjects: () => request('/projects'),
  getProject: (id) => request(`/projects/${id}`),
  createProject: (data) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id, data) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  
  // Issues
  getIssues: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return request(`/issues${params ? '?' + params : ''}`);
  },
  getIssue: (id) => request(`/issues/${id}`),
  createIssue: (data) => request('/issues', { method: 'POST', body: JSON.stringify(data) }),
  updateIssue: (id, data) => request(`/issues/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIssue: (id) => request(`/issues/${id}`, { method: 'DELETE' }),
  
  // Goals
  getGoals: () => request('/goals'),
  getGoal: (id) => request(`/goals/${id}`),
  createGoal: (data) => request('/goals', { method: 'POST', body: JSON.stringify(data) }),
  updateGoal: (id, data) => request(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGoal: (id) => request(`/goals/${id}`, { method: 'DELETE' }),
  
  // Logs
  getLogs: (options = {}) => {
    const params = new URLSearchParams(options).toString();
    return request(`/logs${params ? '?' + params : ''}`);
  },
  getAgentLogs: (agentId, limit = 100) => request(`/logs/${agentId}?limit=${limit}`),
  clearLogs: (agentId = null) => request(agentId ? `/logs/${agentId}` : '/logs', { method: 'DELETE' }),
  
  // Usage
  getUsage: () => request('/usage'),
  getUsageChart: () => request('/usage/chart'),
  getAgentUsage: (agentId) => request(`/usage/${agentId}`)
};

export default api;

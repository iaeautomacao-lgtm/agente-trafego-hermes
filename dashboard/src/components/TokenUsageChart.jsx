import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import api from '../services/api';
import './TokenUsageChart.css';

function TokenUsageChart() {
  const [chartData, setChartData] = useState([]);
  const [usage, setUsage] = useState(null);
  const [view, setView] = useState('tokens'); // tokens | cost

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [chartRes, usageRes] = await Promise.all([
        api.getUsageChart(),
        api.getUsage()
      ]);
      
      const days = chartRes.days || [];
      setChartData(days.map(d => ({
        ...d,
        date: new Date(d.date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })
      })));
      setUsage(usageRes.usage);
    } catch (e) {
      console.error('Load chart error:', e);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    
    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{label}</p>
        {view === 'tokens' ? (
          <p className="tooltip-value">{payload[0].value.toLocaleString()} tokens</p>
        ) : (
          <p className="tooltip-value">${payload[0].value.toFixed(4)}</p>
        )}
        <p className="tooltip-runs">{payload[0].payload.runs} execuções</p>
      </div>
    );
  };

  return (
    <div className="token-chart card">
      <div className="chart-header">
        <h3>USO DE TOKENS</h3>
        <div className="chart-controls">
          <button 
            className={`chart-btn ${view === 'tokens' ? 'active' : ''}`}
            onClick={() => setView('tokens')}
          >
            Tokens
          </button>
          <button 
            className={`chart-btn ${view === 'cost' ? 'active' : ''}`}
            onClick={() => setView('cost')}
          >
            Custo
          </button>
        </div>
      </div>

      <div className="chart-stats">
        <div className="stat">
          <span className="stat-value">{(usage?.totalTokens || 0).toLocaleString()}</span>
          <span className="stat-label">Total Tokens</span>
        </div>
        <div className="stat">
          <span className="stat-value">${(usage?.totalCost || 0).toFixed(4)}</span>
          <span className="stat-label">Total Gasto</span>
        </div>
        <div className="stat">
          <span className="stat-value">{usage?.history?.length || 0}</span>
          <span className="stat-label">Execuções</span>
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" />
            <XAxis 
              dataKey="date" 
              stroke="#71717a" 
              fontSize={11}
              tickLine={false}
            />
            <YAxis 
              stroke="#71717a" 
              fontSize={11}
              tickLine={false}
              tickFormatter={v => view === 'cost' ? `$${v}` : v.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={view === 'tokens' ? 'tokens' : 'cost'}
              stroke={view === 'tokens' ? '#3B82F6' : '#10B981'}
              strokeWidth={2}
              fillOpacity={1}
              fill={view === 'tokens' ? 'url(#colorTokens)' : 'url(#colorCost)'}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Per-agent breakdown */}
      {usage?.byAgent && Object.keys(usage.byAgent).length > 0 && (
        <div className="agent-breakdown">
          <h4>Por Agente</h4>
          <div className="breakdown-list">
            {Object.entries(usage.byAgent).map(([agentId, data]) => (
              <div key={agentId} className="breakdown-item">
                <span className="breakdown-name">{agentId}</span>
                <span className="breakdown-tokens">{data.tokens.toLocaleString()} tokens</span>
                <span className="breakdown-cost">${data.cost.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TokenUsageChart;

import { Handle, Position } from 'reactflow';
import './AgentNode.css';

function AgentNode({ data }) {
  const { agent, isFirst, isLast, isFinal } = data;
  
  return (
    <div 
      className={`agent-node ${agent.status} ${isFinal ? 'final' : ''}`}
      style={{ '--node-color': agent.color }}
    >
      {!isFirst && <Handle type="target" position={Position.Left} />}
      
      <div className="node-icon">{agent.icon}</div>
      <div className="node-info">
        <span className="node-name">{agent.name}</span>
        <span className="node-role">{agent.role}</span>
      </div>
      
      {agent.status === 'running' && (
        <div className="node-running">
          <span className="running-dot"></span>
        </div>
      )}
      
      {!isFinal && <Handle type="source" position={Position.Right} />}
    </div>
  );
}

export default AgentNode;

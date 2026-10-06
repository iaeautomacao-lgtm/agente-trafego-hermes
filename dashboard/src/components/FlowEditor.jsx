import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import AgentNode from './AgentNode';
import './FlowEditor.css';

const nodeTypes = { agent: AgentNode };

function FlowEditor({ agents, flows, onExecuteFlow }) {
  const mainFlow = flows?.find(f => f.id === 'campanha-completa');
  
  const initialNodes = useMemo(() => {
    if (!mainFlow || !agents) return [];
    
    const flowAgents = mainFlow.steps
      .map(id => agents.find(a => a.id === id))
      .filter(Boolean);
    
    const nodes = flowAgents.map((agent, idx) => ({
      id: agent.id,
      type: 'agent',
      position: { x: idx * 280, y: 100 },
      data: { 
        agent,
        isFirst: idx === 0,
        isLast: idx === flowAgents.length - 1
      }
    }));
    
    // Add final approval node
    nodes.push({
      id: 'approval',
      type: 'agent',
      position: { x: flowAgents.length * 280, y: 100 },
      data: {
        agent: {
          id: 'approval',
          name: 'Aprovação',
          role: 'Humano',
          icon: '✓',
          color: '#10B981',
          status: 'idle'
        },
        isFinal: true
      }
    });
    
    return nodes;
  }, [agents, mainFlow]);

  const initialEdges = useMemo(() => {
    if (!mainFlow) return [];
    
    const edges = [];
    const allSteps = [...mainFlow.steps, 'approval'];
    
    for (let i = 0; i < allSteps.length - 1; i++) {
      edges.push({
        id: `e-${allSteps[i]}-${allSteps[i + 1]}`,
        source: allSteps[i],
        target: allSteps[i + 1],
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#3B82F6', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3B82F6' }
      });
    }
    
    return edges;
  }, [mainFlow]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((event, node) => {
    if (node.data.agent && node.data.agent.id !== 'approval') {
      console.log('Clicked agent:', node.data.agent.name);
    }
  }, []);

  return (
    <div className="flow-editor">
      <div className="flow-editor-header">
        <h3>FLUXO DE CAMPANHA</h3>
        <div className="flow-editor-actions">
          {mainFlow && (
            <button 
              className="btn btn-primary"
              onClick={() => onExecuteFlow?.(mainFlow)}
            >
              ▶ Executar Fluxo Completo
            </button>
          )}
        </div>
      </div>
      <div className="flow-editor-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#2a2a35" gap={20} />
          <Controls />
          <MiniMap 
            nodeColor={(node) => node.data?.agent?.color || '#6B7280'}
            maskColor="rgba(0,0,0,0.8)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

export default FlowEditor;

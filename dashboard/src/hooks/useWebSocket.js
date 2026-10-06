/**
 * WebSocket Hook - Real-time updates
 */
import { useEffect, useRef, useState, useCallback } from 'react';

export function useWebSocket(onMessage) {
  const ws = useRef(null);
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState([]);
  const reconnectTimeout = useRef(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:3001/ws`;
    
    ws.current = new WebSocket(wsUrl);
    
    ws.current.onopen = () => {
      setConnected(true);
      console.log('[WS] Connected');
    };
    
    ws.current.onclose = () => {
      setConnected(false);
      console.log('[WS] Disconnected, reconnecting...');
      reconnectTimeout.current = setTimeout(connect, 3000);
    };
    
    ws.current.onerror = (err) => {
      console.error('[WS] Error:', err);
    };
    
    ws.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        // Store logs
        if (msg.type === 'log') {
          setLogs(prev => [...prev.slice(-99), msg.data]);
        }
        
        // Forward to callback
        if (onMessage) {
          onMessage(msg);
        }
      } catch (e) {
        console.error('[WS] Parse error:', e);
      }
    };
  }, [onMessage]);

  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return { connected, logs, send, clearLogs };
}

export default useWebSocket;

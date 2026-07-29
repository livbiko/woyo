import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function useSocket() {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const s = io(API_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,  // never give up on flaky connections
      reconnectionDelay: 1000,         // start retrying after 1s
      reconnectionDelayMax: 30000,     // cap backoff at 30s
      timeout: 10000,                  // detect failed connection attempt in 10s
      pingInterval: 10000,             // heartbeat every 10s
      pingTimeout: 25000,              // mark disconnected if no pong in 25s
    });

    s.on('connect',       () => setConnected(true));
    s.on('disconnect',    () => setConnected(false));
    s.on('connect_error', () => setConnected(false));

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    };
  }, [token]);

  return { socketRef, socket, connected };
}

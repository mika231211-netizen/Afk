import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL ||
      window.location.origin.replace(':5173', ':3001');

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socketRef.current = socket;
    return () => socket.disconnect();
  }, []);

  const on = (event, handler) => socketRef.current?.on(event, handler);
  const off = (event, handler) => socketRef.current?.off(event, handler);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, on, off }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);

/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/socketContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import io, { Socket } from "socket.io-client";

type Socket = any;

// Definisikan tipe untuk context
interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

// Buat context dengan nilai default
const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

// Hook untuk menggunakan socket dalam komponen
export const useSocket = () => useContext(SocketContext);

// Provider component
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Inisialisasi socket connection
    const socketInstance = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001"
    );

    // Event handlers
    const onConnect = () => {
      console.log("Socket connected!");
      setIsConnected(true);
    };

    const onDisconnect = () => {
      console.log("Socket disconnected!");
      setIsConnected(false);
    };

    // Register event handlers
    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);

    // Save socket to state
    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.off("connect", onConnect);
      socketInstance.off("disconnect", onDisconnect);
      socketInstance.disconnect();
    };
  }, []);

  // Return provider dengan socket dan status koneksi
  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

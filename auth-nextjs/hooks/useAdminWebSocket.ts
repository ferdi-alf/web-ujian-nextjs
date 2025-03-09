/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useAdminWebSocket.ts
import { useEffect, useRef, useCallback } from "react";
import { mutate } from "swr";

interface WebSocketOptions {
  onMessage?: (data: any) => void;
  mutateKeys?: string[];
}

export function useAdminWebSocket({
  onMessage,
  mutateKeys = [],
}: WebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket("ws://localhost:8050/ws/admin");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("WebSocket received:", data);

      // Panggil handler pesan kustom jika ada
      if (onMessage) {
        onMessage(data);
      }

      // Mutate SWR cache untuk semua key yang ditentukan
      mutateKeys.forEach((key) => {
        mutate(key);
      });
    };

    ws.onopen = () => console.log("WebSocket connected");
    ws.onclose = () => {
      console.log("WebSocket disconnected");
      // Reconnect logic (optional)
      setTimeout(connect, 3000);
    };
    ws.onerror = (error) => console.error("WebSocket error:", error);

    wsRef.current = ws;
  }, [onMessage, mutateKeys]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    websocket: wsRef.current,
  };
}

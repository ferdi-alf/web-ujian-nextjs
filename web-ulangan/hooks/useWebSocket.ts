"use client";

import { useEffect, useState } from "react";

interface CheatingEvent {
  ujianId: string;
  siswaDetailId: string;
  type: string;
  timeStamp: number;
}

export function useWebSocket(url: string) {
  const [events, setEvents] = useState<CheatingEvent[]>([]);

  useEffect(() => {
    const socket = new WebSocket(url);

    socket.onmessage = (event) => {
      try {
        const data: CheatingEvent = JSON.parse(event.data);
        setEvents((prev) => [data, ...prev]);
      } catch (error) {
        console.error("Error parsing Websocket message:", error);
      }
    };

    socket.onclose = () => console.log("Websocket closed");
    socket.onerror = (error) => console.error("WebSocket error:", error);

    return () => socket.close();
  }, [url]);

  return events;
}

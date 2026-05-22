import { useEffect, useRef, useState } from 'react';

interface SnipingEvent {
  stationId: string;
  stationName?: string;
  oldCount?: number;
  newCount?: number;
  message?: string;
  timestamp?: string;
}

const API_BASE_URL = 'https://ddarungway-server.onrender.com/api';

export function useSniping(stationId: string) {
  const [events, setEvents] = useState<SnipingEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!stationId) {
      return;
    }

    const url = stationId === 'global' 
      ? `${API_BASE_URL}/notifications/global`
      : `${API_BASE_URL}/notifications/sniping/${stationId}`;
    
    const source = new EventSource(url);
    sourceRef.current = source;

    source.onopen = () => setConnected(true);

    source.addEventListener('station_updated', (event) => {
      try {
        const parsed = JSON.parse(event.data) as SnipingEvent;
        setEvents((prev) => [parsed, ...prev].slice(0, 20));
      } catch {
        // 서버에서 비정상 payload를 보내면 무시합니다.
      }
    });

    source.onerror = () => setConnected(false);

    return () => {
      source.close();
      sourceRef.current = null;
      setConnected(false);
    };
  }, [stationId]);

  const clearEvents = () => setEvents([]);

  return {
    connected,
    events,
    clearEvents,
  };
}

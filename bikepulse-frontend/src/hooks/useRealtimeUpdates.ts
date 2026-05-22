import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { UIStation } from './useStations';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { tokenStorage } from '../services/storage/tokenStorage';

interface SSEEvent {
  stationId: string;
  stationName?: string;
  availableBikes: number;
  message?: string;
  type?: string;
  title?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';

/**
 * 전역 및 개인 실시간 이벤트를 수신하여 캐시를 정밀 업데이트하는 훅
 */
export function useRealtimeUpdates() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const globalSourceRef = useRef<EventSource | null>(null);
  const personalSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // 1. 전역 채널 구독
    const globalUrl = `${API_BASE_URL}/notifications/global`;
    const globalSource = new EventSource(globalUrl);
    globalSourceRef.current = globalSource;

    globalSource.addEventListener('station_updated', (event) => {
      try {
        const data = JSON.parse(event.data) as SSEEvent;
        const { stationId, availableBikes, stationName, message } = data;

        queryClient.setQueryData<UIStation[]>(['stations'], (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((station) =>
            station.id === stationId ? { ...station, availableBikes } : station
          );
        });

        if (message || (stationName && availableBikes > 0)) {
          const displayMessage = message || `[${stationName}] 자전거가 입고되었습니다! (현재 ${availableBikes}대)`;
          toast.success(displayMessage, { id: `sse-update-${stationId}`, duration: 3000, icon: '🚲' });
        }
      } catch (err) {
        console.error('Global SSE parsing error:', err);
      }
    });

    // 2. 개인 채널 구독 (로그인 시)
    if (accessToken) {
      const token = tokenStorage.getAccessToken();
      // SSE는 커스텀 헤더를 지원하지 않으므로 쿼리 파라미터로 토큰을 보내거나 (백엔드 처리 필요)
      // 여기서는 백엔드가 쿠키나 다른 방식으로 인증을 처리한다고 가정하거나, 
      // SSE 연결 URL에 토큰을 포함하는 방식을 사용할 수 있습니다.
      // 일단 백엔드에서 query token을 지원하도록 수정했다고 가정하고 구현합니다.
      const personalUrl = `${API_BASE_URL}/notifications/subscribe?token=${token}`;
      const personalSource = new EventSource(personalUrl);
      personalSourceRef.current = personalSource;

      personalSource.addEventListener('personal_notification', (event) => {
        try {
          const data = JSON.parse(event.data);
          // 스토어에 추가
          addNotification(data);
          
          // Toast 표시
          toast(data.message, {
            icon: data.type === 'SNIPING' ? '🚲' : '🔔',
            duration: 4000,
            style: { borderLeft: '4px solid #f97316' }
          });
        } catch (err) {
          console.error('Personal SSE parsing error:', err);
        }
      });
    }

    return () => {
      globalSourceRef.current?.close();
      personalSourceRef.current?.close();
    };
  }, [queryClient, accessToken, addNotification]);

  return null;
}

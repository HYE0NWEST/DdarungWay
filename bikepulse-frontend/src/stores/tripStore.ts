import { AxiosError } from 'axios';
import { create } from 'zustand';
import { apiClient } from '../services/api/client';
import { handleApiError } from '../services/error/handleApiError';
import type { AsyncStatus, Trip, Station } from './types';

interface TripStats {
  totalTrips: number;
  totalDistance: number;
  totalDuration: number;
  totalCarbonReduction: number;
  averageSpeed: number;
  favoriteStation: string;
}

interface TripState {
  status: AsyncStatus;
  currentTrip: Trip | null;
  stats: TripStats | null;
  history: Trip[];
  error: string | null;
  // ✅ 여정 중 정류소 정보 유지
  startStation: Station | null;
  destStation: Station | null;
  
  fetchCurrentTrip: () => Promise<void>;
  reserveBike: (startStationId: string) => Promise<void>;
  startTrip: (startStationId: string) => Promise<void>;
  completeTrip: (tripId: string, payload: { endStationId: string; distance: number }) => Promise<void>;
  cancelTrip: (tripId: string, reason: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  reportIssue: (payload: { stationId: string; tripId?: string; issueType: string; description?: string }) => Promise<void>;
  
  // ✅ 상태 업데이트 액션
  setStartStation: (station: Station | null) => void;
  setDestStation: (station: Station | null) => void;
}

export const useTripStore = create<TripState>((set) => ({
  status: 'idle',
  currentTrip: null,
  stats: null,
  history: [],
  error: null,
  startStation: null,
  destStation: null,

  setStartStation: (station) => set({ startStation: station }),
  setDestStation: (station) => set({ destStation: station }),

  fetchCurrentTrip: async () => {
    try {
      const { data } = await apiClient.get('/trips/current');
      const trip = data.data.trip || null;
      set({ currentTrip: trip });
      
      // ✅ 만약 주행 중인데 시작 정류소 정보가 없다면 복구 시도 (추후 필요시)
    } catch {
      set({ currentTrip: null });
    }
  },

  reserveBike: async (startStationId) => {
    set({ status: 'loading', error: null });
    try {
      const { data } = await apiClient.post('/trips/reserve', { startStationId });
      set({ status: 'success', currentTrip: data.data.trip as Trip });
    } catch (error) {
      handleApiError(error);
      set({ status: 'error', error: '자전거 예약 실패' });
    }
  },

  startTrip: async (startStationId) => {
    set({ status: 'loading', error: null });
    try {
      const { data } = await apiClient.post('/trips/start', { startStationId });
      set({ status: 'success', currentTrip: data.data.trip as Trip });
    } catch (error) {
      handleApiError(error);
      set({ status: 'error', error: '대여 시작 실패' });
    }
  },

  completeTrip: async (tripId, payload) => {
    set({ status: 'loading', error: null });
    try {
      await apiClient.patch(`/trips/${tripId}/complete`, payload);
      set({ status: 'success', currentTrip: null, startStation: null, destStation: null });
    } catch (error: unknown) {
      handleApiError(error);
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        set({ currentTrip: null, status: 'idle', startStation: null, destStation: null });
      } else {
        set({ status: 'error', error: '반납 처리 실패' });
      }
    }
  },

  cancelTrip: async (tripId: string, reason: string) => {
    set({ status: 'loading', error: null });
    try {
      await apiClient.patch(`/trips/${tripId}/cancel`, { reason });
      set({ status: 'success', currentTrip: null, startStation: null, destStation: null });
    } catch (error: unknown) {
      handleApiError(error);
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        set({ currentTrip: null, status: 'idle', startStation: null, destStation: null });
      } else {
        set({ status: 'error', error: '대여 취소 실패' });
      }
    }
  },

  fetchStats: async () => {
    set({ status: 'loading', error: null });
    try {
      // 통계와 함께 현재 주행 정보도 동기화
      const [statsRes, currentRes] = await Promise.all([
        apiClient.get('/trips/stats'),
        apiClient.get('/trips/current').catch(() => ({ data: { data: { trip: null } } }))
      ]);

      set({
        status: 'success',
        stats: statsRes.data.data.stats as TripStats,
        history: (statsRes.data.data.history ?? []) as Trip[],
        currentTrip: currentRes.data.data.trip || null
      });
    } catch (error) {
      handleApiError(error);
      set({ status: 'error', error: '통계 조회 실패' });
    }
  },

  reportIssue: async (payload) => {
    set({ status: 'loading', error: null });
    try {
      await apiClient.post('/reports', payload);
      set({ status: 'success' });
    } catch (error) {
      handleApiError(error);
      set({ status: 'error', error: '고장 신고 실패' });
      throw error;
    }
  },
}));

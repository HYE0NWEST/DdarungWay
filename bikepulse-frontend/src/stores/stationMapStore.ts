import { create } from 'zustand';
import { apiClient } from '../services/api/client';
import { handleApiError } from '../services/error/handleApiError';
import type { AsyncStatus, Station } from './types';

function normalizeStation(raw: Record<string, unknown>): Station {
  const rack =
    (raw.totalDocks as number | undefined) ??
    (raw.totalRackCount as number | undefined) ??
    (raw.rackCount as number | undefined) ??
    (raw.parkingBikeTotCnt as number | undefined) ?? 0;
  
  const bikeCount =
    (raw.availableBikes as number | undefined) ??
    (raw.bikeCount as number | undefined) ??
    (raw.currentBikeCount as number | undefined) ??
    (raw.parkingBikeTotCnt as number | undefined) ?? 0;

  const location = raw.location as Station['location'] | undefined;
  const lat = raw.stationLatitude as number | undefined;
  const lng = raw.stationLongitude as number | undefined;

  return {
    stationId: String(raw.stationId ?? raw.station_id ?? ''),
    name: String(raw.name ?? raw.stationName ?? ''),
    district: (raw.district as string | undefined) ?? (raw.gu as string | undefined),
    address: String(raw.address ?? ''),
    totalDocks: rack,
    availableBikes: bikeCount,
    location:
      location ?? {
        type: 'Point',
        coordinates: (typeof lat === 'number' && typeof lng === 'number') 
          ? [lng, lat] as [number, number] 
          : [0, 0] as [number, number]
      },
    predictedAvailability: raw.predictedAvailability as number | null | undefined,
    trend: raw.trend as string | undefined,
    confidence: raw.confidence as number | undefined,
  };
}

interface StationMapState {
  status: AsyncStatus;
  stations: Station[];
  recommendations: Station[];
  searchResults: Station[];
  selectedStation: Station | null;
  error: string | null;
  fetchStations: (page?: number, limit?: number) => Promise<void>;
  searchStations: (keyword: string) => Promise<void>;
  fetchRecommendations: (lat: number, lng: number, radius?: number) => Promise<void>;
  setSelectedStation: (stationId: string) => void;
}

export const useStationMapStore = create<StationMapState>((set, get) => ({
  status: 'idle',
  stations: [],
  recommendations: [],
  searchResults: [],
  selectedStation: null,
  error: null,

  fetchStations: async (page = 1, limit = 50) => {
    set({ status: 'loading', error: null });
    try {
      const { data } = await apiClient.get('/stations', { params: { page, limit } });
      const normalized = (data.data as Array<Record<string, unknown>>).map(normalizeStation);
      set({ status: 'success', stations: normalized });
    } catch (error) {
      handleApiError(error);
      set({ status: 'error', error: '정류소 목록 조회 실패' });
    }
  },

  searchStations: async (keyword: string) => {
    if (!keyword.trim()) {
      set({ searchResults: [] });
      return;
    }
    set({ status: 'loading', error: null });
    try {
      const { data } = await apiClient.get('/stations', { params: { search: keyword, limit: 10 } });
      const normalized = (data.data as Array<Record<string, unknown>>).map(normalizeStation);
      set({ status: 'success', searchResults: normalized });
    } catch (error) {
      handleApiError(error);
      set({ status: 'error', error: '검색 실패' });
    }
  },

  fetchRecommendations: async (lat, lng, radius = 500) => {
    set({ status: 'loading', error: null });
    try {
      const { data } = await apiClient.get('/recommend', { params: { lat, lng, radius } });
      const normalized = (data.data as Array<Record<string, unknown>>).map(normalizeStation);
      set({ status: 'success', recommendations: normalized });
    } catch (error) {
      handleApiError(error);
      set({ status: 'error', error: '추천 정류소 조회 실패' });
    }
  },

  setSelectedStation: (stationId) => {
    // ✅ 버그 수정: stations와 recommendations 모두에서 검색
    const { stations, recommendations } = get();
    const target =
      stations.find((station) => station.stationId === stationId) ??
      recommendations.find((station) => station.stationId === stationId) ??
      null;
    set({ selectedStation: target });
  },
}));

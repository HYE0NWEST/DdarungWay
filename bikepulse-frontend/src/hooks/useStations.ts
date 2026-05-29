import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api/client';

export interface UIStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  availableBikes: number;
  totalDocks: number;
  shared: number;
  congestionStatus: string;
  address?: string;
  predictedAvailability?: number | null;
  confidence?: number;
}

interface RawStation {
  stationId: string;
  name: string;
  location: {
    coordinates: [number, number];
  };
  availableBikes: number;
  totalDocks: number;
  shared?: number;
  congestionStatus?: string;
  address?: string;
  predictedAvailability?: number | null;
  confidence?: number;
}

export function useStations() {
  return useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const { data } = await apiClient.get('/stations');
      // 백엔드 응답 구조에 따라 data.data 또는 data 등으로 접근
      return data.data as RawStation[];
    },
    select: (data): UIStation[] => {
      return data.map((station) => ({
        id: station.stationId,
        name: station.name,
        lat: station.location.coordinates[1],
        lng: station.location.coordinates[0],
        availableBikes: station.availableBikes,
        totalDocks: station.totalDocks,
        shared: station.shared || 0,
        congestionStatus: station.congestionStatus || '데이터 없음',
        address: station.address,
        predictedAvailability: station.predictedAvailability,
        confidence: station.confidence,
      }));
    },
  });
}

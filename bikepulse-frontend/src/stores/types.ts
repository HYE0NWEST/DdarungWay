export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface User {
  _id: string;
  email: string;
  username?: string;
  socialProvider: 'local' | 'kakao' | 'google'; // ✅ 소셜 로그인 구분 추가
  activePass?: string | null;
  passExpiresAt?: string | null;
}

export type TripStatus = 'RESERVED' | 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Trip {
  _id: string;
  userId: string;
  startStationId: string;
  startStationName?: string;
  endStationId?: string;
  endStationName?: string;
  status: TripStatus;
  startTime?: string;
  endTime?: string;
  reservationExpiresAt?: string;
  duration?: number;
  distance?: number;
  cancellationReason?: string;
}

export interface PaymentItem {
  _id: string;
  ticketType: string;
  amount: number;
  status: string;
  createdAt: string;
}

export interface Station {
  stationId: string;
  name: string;
  district?: string;
  address?: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  totalDocks: number;
  availableBikes: number;
}

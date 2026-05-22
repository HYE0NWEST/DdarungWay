import { create } from 'zustand';
import { apiClient } from '../services/api/client';
import { tokenStorage } from '../services/storage/tokenStorage';
import { handleApiError } from '../services/error/handleApiError';
import { queryClient } from '../lib/queryClient';
import type { AsyncStatus, User } from './types';

interface AuthState {
  status: AsyncStatus;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
  setAuth: (accessToken: string, refreshToken: string, user: User) => void;
  login: (payload: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  hydrateTokens: () => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'idle',
  user: null,
  accessToken: null,
  refreshToken: null,
  error: null,

  setAuth: (accessToken, refreshToken, user) => {
    tokenStorage.setAccessToken(accessToken);
    tokenStorage.setRefreshToken(refreshToken);
    set({ accessToken, refreshToken, user, status: 'success' });
  },

  hydrateTokens: () => {
    set({
      accessToken: tokenStorage.getAccessToken(),
      refreshToken: tokenStorage.getRefreshToken(),
    });
  },

  fetchProfile: async () => {
    try {
      const { data } = await apiClient.get('/users/profile');
      const userData = data.data;
      set({ 
        user: {
          ...userData,
          username: userData.name || userData.username 
        } 
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  },

  login: async (payload) => {
    set({ status: 'loading', error: null });
    try {
      const { data } = await apiClient.post('/auth/login', payload);
      const accessToken = data.accessToken as string;
      const refreshToken = data.refreshToken as string;
      const user = data.data?.user as User;

      tokenStorage.setAccessToken(accessToken);
      tokenStorage.setRefreshToken(refreshToken);

      set({
        status: 'success',
        accessToken,
        refreshToken,
        user: {
          ...user,
          socialProvider: user.socialProvider || 'local' // ✅ 제공자 정보 명시적 저장
        },
      });
    } catch (error) {
      handleApiError(error);
      set({ status: 'error', error: '로그인 실패' });
    }
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // 서버 오류와 무관하게 로컬 인증 정보는 정리합니다.
    } finally {
      get().reset();
    }
  },

  reset: () => {
    tokenStorage.clear();
    queryClient.clear(); // TanStack Query 캐시 초기화
    set({
      status: 'idle',
      user: null,
      accessToken: null,
      refreshToken: null,
      error: null,
    });
  }
}));

// 전역 이벤트 리스너: API Interceptor 등에서 인증 만료 시 호출
if (typeof window !== 'undefined') {
  window.addEventListener('auth:expired', () => {
    useAuthStore.getState().reset();
    // 필요 시 로그인 페이지로 리다이렉트 로직 추가 가능
    window.location.href = '/login';
  });
}

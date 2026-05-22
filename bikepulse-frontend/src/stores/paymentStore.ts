import { create } from 'zustand';
import { apiClient } from '../services/api/client';
import { handleApiError } from '../services/error/handleApiError';
import type { AsyncStatus, PaymentItem } from './types';

interface ActiveTicket {
  ticketType: string;
  expiresAt: string;
}

interface PaymentState {
  status: AsyncStatus;
  history: PaymentItem[];
  activeTicket: ActiveTicket | null;
  pendingAmount: number | null;
  error: string | null;
  confirmPayment: (payload: {
    paymentKey: string;
    orderId: string;
    amount: number;
    ticketType: string;
  }) => Promise<void>;
  fetchHistory: () => Promise<void>;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  status: 'idle',
  history: [],
  activeTicket: null,
  pendingAmount: null,
  error: null,

  confirmPayment: async (payload) => {
    set({ status: 'loading', error: null });
    try {
      const { data } = await apiClient.post('/payments/confirm', payload);
      const user = data.data.user as { activePass: string; passExpiresAt: string };

      set({
        status: 'success',
        activeTicket: {
          ticketType: user.activePass,
          expiresAt: user.passExpiresAt,
        },
      });
    } catch (error) {
      handleApiError(error);
      set({ status: 'error', error: '결제 승인 실패' });
    }
  },

  fetchHistory: async () => {
    set({ status: 'loading', error: null });
    try {
      const { data } = await apiClient.get('/payments/history');
      set({
        status: 'success',
        history: (data.data ?? []) as PaymentItem[],
      });
    } catch (error) {
      handleApiError(error);
      set({ status: 'error', error: '결제 내역 조회 실패' });
    }
  },
}));

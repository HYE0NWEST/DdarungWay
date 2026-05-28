import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';
import { apiClient } from '../services/api/client';
import { usePaymentStore } from '../stores/paymentStore';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../components/ui/button';

export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { fetchHistory } = usePaymentStore();
  const hasProcessedRef = useRef(false); // ✅ 두 번 호출 방지 (Strict Mode 대응)

  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');
  const errorMsg = searchParams.get('message'); // 에러 시 토스가 전달하는 파라미터
  const errorCode = searchParams.get('code');

  useEffect(() => {
    // 1. 에러 콜백인 경우 (사용자 취소 등)
    if (errorCode || errorMsg) {
      if (errorCode === 'PAYC_USER_CANCEL') {
        toast('결제를 취소하셨습니다.');
      } else {
        toast.error(errorMsg || '결제 중 오류가 발생했습니다.');
      }
      return; // 에러 화면 렌더링 유지
    }

    // 2. 정상 파라미터가 없으면 튕겨내기
    if (!paymentKey || !orderId || !amount) {
      if (!hasProcessedRef.current) {
        toast.error('잘못된 접근입니다.');
        navigate('/payment', { replace: true });
      }
      return;
    }

    // 3. 서버 승인 (Confirm) 요청
    const processConfirm = async () => {
      if (hasProcessedRef.current) return;
      hasProcessedRef.current = true;

      try {
        const savedTicketStr = sessionStorage.getItem('ddarungway_pending_ticket');
        const savedTicket = savedTicketStr ? JSON.parse(savedTicketStr) : null;

        if (!savedTicket) {
          toast.error('이용권 정보를 찾을 수 없습니다. 결제가 취소될 수 있습니다.');
          // 실제로는 여기서 취소 API를 부르는 것이 안전하지만, 테스트용이므로 생략
          return;
        }

        // 백엔드로 승인 요청
        await apiClient.post('/payments/confirm', {
          paymentKey,
          orderId,
          amount: Number(amount),
          ticketType: savedTicket.ticketType,
        });

        toast.success('이용권 구매가 완료되었습니다!', { id: 'payment-success', duration: 4000 });
        sessionStorage.removeItem('ddarungway_pending_ticket');
        void fetchHistory();
        
        // 약간의 딜레이 후 메인으로 이동
        setTimeout(() => {
          navigate('/home', { replace: true });
        }, 3000);

      } catch (error: unknown) {
        console.error('Payment confirmation error:', error);
        const axiosError = error as AxiosError<{ message?: string }>;
        toast.error(axiosError.response?.data?.message || '결제 승인 중 오류가 발생했습니다.', { id: 'payment-error' });
      }
    };

    void processConfirm();
  }, [searchParams, navigate, fetchHistory, paymentKey, orderId, amount, errorMsg, errorCode]);

  // 에러 화면 렌더링
  if (errorCode || errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center animate-in fade-in zoom-in duration-500">
        <XCircle className="w-20 h-20 text-red-500 mb-6" />
        <h1 className="text-2xl font-black text-neutral-900 mb-2">결제 실패</h1>
        <p className="text-neutral-500 font-bold mb-8">
          {errorMsg || '결제를 완료하지 못했습니다.'}
        </p>
        <Button onClick={() => navigate('/payment', { replace: true })} className="w-full max-w-xs py-6 rounded-2xl bg-neutral-900 text-white font-black">
          다시 시도하기
        </Button>
      </div>
    );
  }

  // 로딩/성공 대기 화면 렌더링
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center animate-in fade-in zoom-in duration-500">
      <CheckCircle2 className="w-24 h-24 text-primary-500 mb-6 animate-pulse" />
      <h1 className="text-3xl font-black text-neutral-900 mb-2">결제 처리 중...</h1>
      <p className="text-neutral-500 font-bold mb-8">
        안전하게 결제를 완료하고 있습니다.<br/>잠시만 기다려주세요.
      </p>
      <div className="w-8 h-8 border-4 border-gray-200 border-t-primary-500 rounded-full animate-spin" />
    </div>
  );
}
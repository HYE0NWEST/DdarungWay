import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ANONYMOUS, loadPaymentWidget } from '@tosspayments/payment-widget-sdk';
import toast from 'react-hot-toast';
import { ChevronLeft } from 'lucide-react';
import { usePaymentStore } from '../stores/paymentStore';
import { useAuthStore } from '../stores/authStore';

const TICKETS = [
  { ticketType: 'DAILY_1H', label: '1일권 (1시간)', amount: 1000 },
  { ticketType: 'DAILY_2H', label: '1일권 (2시간)', amount: 2000 },
  { ticketType: 'REGULAR_30D_1H', label: '30일 정기권 (1시간)', amount: 5000 },
] as const;

export function PaymentPage() {
  const navigate = useNavigate();
  // 환경 변수 로딩 이슈로 인한 하드코딩 (Client Key는 공개되어도 안전함)
  const clientKey = 'test_ck_5OWRapdA8dQNAJmyj7AP3o1zEqZK';
  const { history } = usePaymentStore();
  const { user } = useAuthStore();
  
  const [selectedTicket, setSelectedTicket] = useState<(typeof TICKETS)[number]>(TICKETS[0]);
  const [widgetReady, setWidgetReady] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentWidgetRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentMethodsWidgetRef = useRef<any>(null);

  // ✅ 1. 토스 결제 위젯 초기화
  useEffect(() => {
    if (!clientKey) {
      console.error('Toss Client Key is missing in .env');
      toast.error('결제 시스템 설정이 누락되었습니다.');
      return;
    }

    let isMounted = true;

    const initWidget = async () => {
      try {
        // SDK 로드 시작
        const widget = await loadPaymentWidget(clientKey, ANONYMOUS);
        if (!isMounted) return;
        
        paymentWidgetRef.current = widget;

        // 결제 UI 렌더링
        const paymentMethodsWidget = widget.renderPaymentMethods(
          '#payment-method',
          { value: selectedTicket.amount },
          { variantKey: 'DEFAULT' }
        );
        paymentMethodsWidgetRef.current = paymentMethodsWidget;

        // 약관 UI 렌더링
        await widget.renderAgreement('#agreement', { variantKey: 'AGREEMENT' });

        // ✅ 위젯 렌더링 완료 이벤트 대기
        paymentMethodsWidget.on('ready', () => {
          if (isMounted) {
            setWidgetReady(true);
          }
        });

      } catch (error: unknown) {
        console.error('Widget init error:', error);
        if (isMounted) {
          const err = error as Error;
          const msg = err.message || '';
          if (msg.includes('401') || msg.includes('인증')) {
            toast.error('결제 키 인증에 실패했습니다. .env 파일의 클라이언트 키를 확인해주세요.', { duration: 6000 });
          } else {
            toast.error('결제창을 불러오는 데 실패했습니다.');
          }
        }
      }
    };

    const timer = setTimeout(() => {
      void initWidget();
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientKey]); 

  // ✅ 2. 금액 변경 시 위젯 업데이트
  useEffect(() => {
    if (widgetReady && paymentMethodsWidgetRef.current && typeof paymentMethodsWidgetRef.current.updateAmount === 'function') {
      void paymentMethodsWidgetRef.current.updateAmount(selectedTicket.amount);
    }
  }, [selectedTicket.amount, widgetReady]);

  // ✅ 3. 결제 요청 실행 (새로운 성공 페이지로 리다이렉트)
  const handlePaymentRequest = async () => {
    if (!paymentWidgetRef.current || !widgetReady) {
      toast.error('결제 준비가 되지 않았습니다. 잠시만 기다려주세요.');
      return;
    }

    setIsRequesting(true);
    try {
      const orderId = `ddarungway-${crypto.randomUUID().slice(0, 8)}-${Date.now()}`;
      
      // 승인 페이지에서 쓸 수 있도록 세션 스토리지에 저장
      sessionStorage.setItem('ddarungway_pending_ticket', JSON.stringify(selectedTicket));

      // ✅ 성공/실패 시 PaymentSuccessPage로 이동하게 설정
      await paymentWidgetRef.current.requestPayment({
        orderId,
        orderName: selectedTicket.label,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/success`, // 에러 파라미터도 같은 페이지에서 처리
        customerEmail: user?.email || 'user@ddarungway.com',
        customerName: user?.username || 'DdarungWay User',
      });
    } catch (error) {
      setIsRequesting(false);
      const tossError = error as { code: string; message: string };
      if (tossError.code === 'USER_CANCEL') {
        toast('결제가 취소되었습니다.');
      } else {
        console.error('Payment request error:', error);
        toast.error(tossError.message || '결제 요청 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 animate-in fade-in duration-500">
      {/* Header */}
      <header className="bg-white px-4 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-black text-neutral-900">이용권 결제</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="container" style={{ maxWidth: '840px', margin: '0 auto' }}>
          <div className="page-head centered mt-8 mb-12">
            <p className="eyebrow text-primary-500 font-black mb-2">BIKE PASS</p>
            <h1 className="text-4xl font-black mb-3">자전거 이용권 결제</h1>
            <p className="muted text-lg">따릉이와 함께하는 스마트한 이동, 지금 시작하세요.</p>
          </div>

          <div className="grid two-col" style={{ gap: '48px', alignItems: 'start', marginTop: '48px' }}>
            {/* 왼쪽: 이용권 선택 */}
            <div className="ticket-selection">
              <h3 className="section-title">1. 이용권 종류 선택</h3>
              <div className="ticket-grid">
                {TICKETS.map((ticket) => {
                  const isSelected = selectedTicket.ticketType === ticket.ticketType;
                  return (
                    <div 
                      key={ticket.ticketType}
                      className={`ticket-card glass ${isSelected ? 'active border-primary-500 bg-primary-50' : 'border-gray-100 hover:border-gray-200'}`}
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div className="check-icon w-6 h-6 flex items-center justify-center">
                        {isSelected ? (
                          <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center text-white text-[10px]">
                            ✓
                          </div>
                        ) : (
                          <div className="w-5 h-5 border-2 border-gray-200 rounded-full" />
                        )}
                      </div>
                      <div className="ticket-info ml-2">
                        <strong className="text-neutral-700">{ticket.label}</strong>
                        <p className="price text-xl font-black">{ticket.amount.toLocaleString()}원</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="history-section" style={{ marginTop: '40px' }}>
                <h3 className="section-title">최근 결제 내역</h3>
                <div className="history-list">
                  {history.length === 0 ? (
                    <p className="muted">결제 내역이 없습니다.</p>
                  ) : (
                    history.slice(0, 3).map((item) => (
                      <div key={item._id} className="history-item glass">
                        <span className="type">{item.ticketType}</span>
                        <span className="date">{new Date(item.createdAt).toLocaleDateString()}</span>
                        <span className="amount">{item.amount.toLocaleString()}원</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 오른쪽: 결제 위젯 및 버튼 */}
            <div className="payment-method-area">
              <h3 className="section-title">2. 결제 수단 확인</h3>
              <div className="glass widget-container">
                {!widgetReady && (
                  <div className="loading-placeholder">
                    <div className="spinner" />
                    <p>결제 시스템을 불러오는 중...</p>
                  </div>
                )}
                <div id="payment-method" />
                <div id="agreement" />
              </div>

              <button
                className="btn btn-primary btn-pay"
                disabled={!widgetReady || isRequesting}
                onClick={handlePaymentRequest}
              >
                {isRequesting ? '결제 요청 중...' : `${selectedTicket.amount.toLocaleString()}원 결제하기`}
              </button>
              
              <p className="security-hint">
                🔒 모든 결제 정보는 암호화되어 안전하게 처리됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .payment-page { padding-bottom: 80px; }
        .section-title { font-size: 1.25rem; font-weight: 850; margin-bottom: 24px; color: var(--text-main); }
        
        .ticket-grid { display: grid; gap: 16px; }
        .ticket-card { 
          padding: 24px; 
          border-radius: 20px; 
          display: flex; 
          align-items: center; 
          gap: 16px; 
          cursor: pointer; 
          transition: all 0.2s;
          border: 2px solid transparent;
        }
        .ticket-card:hover { transform: translateY(-2px); border-color: var(--border-main); }
        .ticket-card.active { border-color: var(--primary); background: var(--primary-soft); }
        .ticket-card .check-icon { font-size: 1.2rem; }
        .ticket-card strong { display: block; font-size: 1.1rem; margin-bottom: 4px; }
        .ticket-card .price { font-size: 1.4rem; font-weight: 900; color: var(--text-main); }
        .ticket-card.active .price { color: var(--primary); }

        .widget-container { border-radius: 24px; padding: 12px; min-height: 400px; position: relative; }
        .loading-placeholder { position: absolute; inset: 0; display: flex; flexDirection: column; alignItems: center; justifyContent: center; gap: 12px; }
        .spinner { width: 30px; height: 30px; border: 3px solid var(--border-light); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .btn-pay { 
          width: 100%; 
          margin-top: 24px; 
          padding: 22px; 
          font-size: 1.4rem; 
          font-weight: 900; 
          border-radius: 24px; 
          background: linear-gradient(135deg, var(--primary) 0%, #2980b9 100%);
          box-shadow: 0 12px 24px rgba(52, 152, 219, 0.3);
          border: none;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .btn-pay:hover:not(:disabled) { 
          transform: translateY(-4px); 
          box-shadow: 0 16px 32px rgba(52, 152, 219, 0.4);
        }
        .btn-pay:active:not(:disabled) {
          transform: translateY(0);
        }
        .btn-pay:disabled {
          opacity: 0.6;
          filter: grayscale(1);
          cursor: not-allowed;
        }
        .security-hint { text-align: center; margin-top: 16px; font-size: 0.85rem; color: var(--muted); }

        .history-list { display: grid; gap: 12px; }
        .history-item { padding: 16px 20px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; }
        .history-item .amount { font-weight: 800; color: var(--text-main); }
        .history-item .date { color: var(--muted); font-size: 0.8rem; }
      `}</style>
    </div>
  );
}

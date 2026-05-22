import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard, Clock, ChevronRight, Info, HelpCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../services/api/client';
import { useAuthStore } from '../stores/authStore';
import type { User } from '../stores/types';
import { usePaymentStore } from '../stores/paymentStore';
import { Skeleton } from '../components/ui/skeleton';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

export function ManagePassPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { history, fetchHistory } = usePaymentStore();
  const [loading, setLoading] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('toss');

  // ✅ 결제 수단 목록
  const paymentMethods = [
    { id: 'toss', name: '토스페이', icon: '🔵', desc: '빠르고 안전한 간편결제' },
    { id: 'kakao', name: '카카오페이', icon: '🟡', desc: '국민 메신저 간편결제' },
    { id: 'naver', name: '네이버페이', icon: '🟢', desc: '포인트 적립이 강력한 결제' },
    { id: 'card', name: '신용/체크카드', icon: '💳', desc: '일반 카드 결제' },
  ];

  useEffect(() => {
    const init = async () => {
      try {
        // 1. 최신 유저 프로필 가져와서 이용권 정보 동기화
        const { data } = await apiClient.get('/users/profile');
        useAuthStore.setState({ user: data.data as User });
        
        // 2. 결제 내역 로드
        await fetchHistory();
      } catch (error) {
        console.error('Failed to sync pass data:', error);
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [fetchHistory]);

  const isActive = user?.passExpiresAt ? new Date(user.passExpiresAt) > new Date() : false;

  const passExpiresAt = user?.passExpiresAt;
  const remainingDays = useMemo(() => {
    if (!passExpiresAt) return 0;
    const diff = new Date(passExpiresAt).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [passExpiresAt]);

  const ticketLabel = useMemo(() => {
    const type = user?.activePass;
    if (type === 'DAILY_1H') return '1일권 (1시간)';
    if (type === 'DAILY_2H') return '1일권 (2시간)';
    if (type === 'REGULAR_30D_1H') return '30일 정기권 (1시간)';
    return '보유 중인 이용권 없음';
  }, [user]);

  const handleChangePaymentMethod = (methodId: string) => {
    setSelectedMethod(methodId);
    const methodName = paymentMethods.find(m => m.id === methodId)?.name;
    toast.success(`${methodName}(으)로 기본 결제 수단이 변경되었습니다.`);
    setShowPaymentMethodModal(false);
  };

  if (loading) return <ManagePassSkeleton />;

  return (
    <div className="flex flex-col h-full bg-gray-50 animate-in fade-in duration-500">
      {/* Header */}
      <header className="bg-white px-4 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-black text-neutral-900">이용권 관리</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-10">
        {/* 🎫 현재 이용권 상태 카드 */}
        <Card className={`border-none overflow-hidden relative shadow-xl ${isActive ? 'bg-primary-500' : 'bg-neutral-800'}`}>
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Clock size={100} className="text-white" />
          </div>
          <CardContent className="p-8 text-white">
            <div className="flex items-center gap-2 mb-6">
              <Badge className="bg-white/20 text-white border-none font-black text-[10px] uppercase tracking-widest">
                {isActive ? 'Active' : 'Expired'}
              </Badge>
              {isActive && remainingDays <= 3 && (
                <Badge className="bg-amber-400 text-amber-900 border-none font-black text-[10px]">
                  만료 임박
                </Badge>
              )}
            </div>
            
            <h2 className="text-3xl font-black mb-2">{ticketLabel}</h2>
            {isActive ? (
              <div className="space-y-1">
                <p className="text-primary-100 font-bold opacity-80">
                  만료일: {new Date(user!.passExpiresAt!).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-4xl font-black mt-4">{remainingDays}일 남음</p>
              </div>
            ) : (
              <p className="text-neutral-400 font-bold">이용권을 구매하고 라이딩을 시작해보세요!</p>
            )}

            <button 
              onClick={() => navigate('/payment')}
              className={`w-full mt-8 py-4 rounded-2xl font-black text-sm transition-all ${isActive ? 'bg-white text-primary-600 shadow-lg' : 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'}`}
            >
              {isActive ? '이용권 연장하기' : '이용권 구매하러 가기'}
            </button>
          </CardContent>
        </Card>

        {/* 💳 등록된 결제 수단 */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] ml-2">결제 수단 정보</h3>
          <div className="bg-white rounded-[28px] p-5 flex items-center justify-between shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                {selectedMethod === 'card' ? <CreditCard size={24} /> : <span className="text-2xl">{paymentMethods.find(m => m.id === selectedMethod)?.icon}</span>}
              </div>
              <div>
                <p className="text-sm font-black text-neutral-800">{paymentMethods.find(m => m.id === selectedMethod)?.name} 간편결제</p>
                <p className="text-[10px] text-neutral-400 font-bold">기본 결제 수단으로 등록됨</p>
              </div>
            </div>
            <button 
              onClick={() => setShowPaymentMethodModal(true)}
              className="text-[10px] font-black text-primary-500 bg-primary-50 px-3 py-2 rounded-xl active:scale-95 transition-transform"
            >
              변경
            </button>
          </div>
        </div>

        {/* 📜 최근 결제 내역 (축소형) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">최근 결제 내역</h3>
            {history.length > 0 && (
              <button 
                onClick={() => setShowHistoryModal(true)}
                className="text-[10px] font-bold text-neutral-400 flex items-center gap-1 hover:text-primary-500 transition-colors"
              >
                전체보기 <ChevronRight size={12} />
              </button>
            )}
          </div>
          <div className="space-y-2">
            {history.slice(0, 2).map((item) => (
              <div key={item._id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-neutral-400">
                    <Info size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-neutral-800">{item.ticketType}</p>
                    <p className="text-[10px] text-neutral-400 font-bold">{new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className="text-sm font-black text-neutral-900">{item.amount.toLocaleString()}원</p>
              </div>
            ))}
            {history.length === 0 && (
              <div className="text-center py-6 bg-white rounded-2xl border border-dashed border-gray-200">
                <p className="text-[10px] font-bold text-gray-400">최근 결제 내역이 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* 💡 안내 및 규정 */}
        <div className="bg-gray-100/50 rounded-[28px] p-6 space-y-4">
          <div className="flex items-start gap-3">
            <HelpCircle size={18} className="text-neutral-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-xs font-black text-neutral-700">환불 및 취소 규정</p>
              <ul className="text-[10px] text-neutral-500 font-bold space-y-1.5 leading-relaxed">
                <li>• 이용권 구매 후 7일 이내, 미사용 시 전액 환불 가능합니다.</li>
                <li>• 이용을 시작한 경우 남은 기간에 따라 부분 환불이 가능하나 수수료가 발생할 수 있습니다.</li>
                <li>• 초과 요금 미납 시 자전거 대여 서비스 이용이 제한됩니다.</li>
              </ul>
            </div>
          </div>
          <button 
            onClick={() => navigate('/profile/support')}
            className="w-full text-center text-[10px] font-black text-neutral-400 underline underline-offset-4 hover:text-primary-500 transition-colors"
          >
            고객센터에 문의하기
          </button>
        </div>
      </div>

      {/* ✅ 결제 수단 변경 모달 */}
      {showPaymentMethodModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
              <h3 className="text-lg font-black text-neutral-900 uppercase tracking-tight">결제 수단 변경</h3>
              <button onClick={() => setShowPaymentMethodModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              {paymentMethods.map((method) => (
                <button 
                  key={method.id}
                  onClick={() => handleChangePaymentMethod(method.id)}
                  className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${selectedMethod === method.id ? 'border-primary-500 bg-primary-50' : 'border-gray-50 bg-white hover:border-gray-200'}`}
                >
                  <div className="flex items-center gap-4 text-left">
                    <span className="text-2xl">{method.icon}</span>
                    <div>
                      <p className="text-sm font-black text-neutral-800">{method.name}</p>
                      <p className="text-[10px] text-neutral-400 font-bold">{method.desc}</p>
                    </div>
                  </div>
                  {selectedMethod === method.id && (
                    <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center text-white text-[10px]">
                      ✓
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="p-6 pt-2">
              <Button 
                onClick={() => setShowPaymentMethodModal(false)}
                className="w-full py-4 rounded-2xl bg-neutral-100 text-neutral-500 font-black"
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ 전체 결제 내역 모달 */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-black text-neutral-900 uppercase tracking-tight">전체 결제 내역</h3>
              <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.map((item) => (
                <div key={item._id} className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary-500 shadow-sm">
                      <CreditCard size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-neutral-800">{item.ticketType}</p>
                      <p className="text-[10px] text-neutral-400 font-bold">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-neutral-900">{item.amount.toLocaleString()}원</p>
                </div>
              ))}
            </div>

            <div className="p-6">
              <Button 
                onClick={() => setShowHistoryModal(false)}
                className="w-full py-4 rounded-2xl bg-neutral-900 text-white font-black"
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}

function ManagePassSkeleton() {
  return (
    <div className="p-4 space-y-6">
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-64 w-full rounded-[32px]" />
      <Skeleton className="h-24 w-full rounded-[28px]" />
      <div className="space-y-2">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    </div>
  );
}

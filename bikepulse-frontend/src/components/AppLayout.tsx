import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { BottomNav } from './BottomNav';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import { useTripStore } from '../stores/tripStore';
import { FloatingTripCard } from './FloatingTripCard';
import { NotificationBell } from './NotificationBell';

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken, user, hydrateTokens, fetchProfile } = useAuthStore();
  const { fetchCurrentTrip } = useTripStore();

  // 실시간 업데이트 구독 시작
  useRealtimeUpdates();

  useEffect(() => {
    hydrateTokens();
  }, [hydrateTokens]);

  // 로그인 상태일 때 현재 주행 정보 및 유저 프로필 가져오기 (세션 복구)
  useEffect(() => {
    if (accessToken) {
      void fetchCurrentTrip();
      
      // 유저 정보가 없으면 가져오기
      if (!user) {
        void fetchProfile();
      }
    }
  }, [accessToken, fetchCurrentTrip, user, fetchProfile]);

  // 📡 네트워크 상태 감지 (오프라인 경고)
  useEffect(() => {
    const handleOffline = () => toast.error('인터넷 연결이 불안정합니다. 네트워크를 확인해주세요.', { id: 'network', icon: '📡', duration: 5000 });
    const handleOnline = () => toast.success('인터넷 연결이 복구되었습니다.', { id: 'network', icon: '✅', duration: 3000 });

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // 초기 로딩 시 오프라인 상태면 즉시 알림
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // 로그인 페이지나 콜백 페이지, 랜딩 페이지에서는 하단 네비게이션을 숨김
  const hideNavPaths = ['/login', '/signup', '/auth/kakao/callback', '/auth/google/callback'];
  const isLandingPage = location.pathname === '/';
  const shouldHideNav = isLandingPage || hideNavPaths.some(path => location.pathname.startsWith(path));
  const shouldHideHeader = isLandingPage;

  return (
    <div className="flex flex-col h-screen h-[100dvh] max-w-md mx-auto bg-white shadow-2xl overflow-hidden relative">
      {/* Top Bar (Optional, can be customized per page or kept global) */}
      {!shouldHideHeader && (
        <header className="h-14 border-b border-gray-100 flex items-center justify-between px-4 sticky top-0 bg-white/80 backdrop-blur-md z-40">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate('/home')}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-primary-500 animate-pulse" />
            <h1 className="font-bold text-lg text-neutral-900 tracking-tight">DdarungWay</h1>
          </div>
          
          {/* User Status / Notifications can go here */}
          <div className="flex items-center gap-1">
            <NotificationBell />
            {accessToken ? (
              <div 
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 pr-3 rounded-full transition-colors"
                onClick={() => navigate('/profile')}
              >
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center border border-primary-200">
                  <span className="text-xs font-bold text-primary-700">
                    {user?.username?.[0] || 'U'}
                  </span>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => navigate('/login')}
                className="text-sm font-semibold text-primary-500 px-3 py-1.5 hover:bg-primary-50 rounded-lg transition-colors"
              >
                로그인
              </button>
            )}
          </div>
        </header>
      )}
      
      {/* Main Content Area */}
      <main className={`flex-1 ${shouldHideNav ? '' : 'pb-24'} relative overflow-y-auto`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="w-full h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      
      {/* Bottom Navigation */}
      {!shouldHideNav && <BottomNav />}

      {/* Floating Trip Card (for active sessions) */}
      {location.pathname !== '/trip' && <FloatingTripCard />}
      
      <Toaster 
        position="top-center" 
        containerStyle={{ top: 60 }}
        toastOptions={{
          style: {
            borderRadius: '12px',
            background: '#333',
            color: '#fff',
            fontSize: '14px'
          }
        }} 
      />
    </div>
  );
}

export default AppLayout;

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bike, 
  ChevronRight, 
  TrendingUp, 
  Leaf, 
  Navigation,
  ArrowUpRight,
  History,
  MapPin,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useTripStore } from '../stores/tripStore';
import { useStationMapStore } from '../stores/stationMapStore';
import { Card, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { loadKakaoMap } from '../services/map/mapUtils';
import type { Station } from '../stores/types';

import { useUIStore } from '../stores/uiStore';

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { stats, status, fetchStats } = useTripStore();
  const { recommendations, fetchRecommendations, status: stationStatus } = useStationMapStore();
  const { setSelectedStationId, setBottomSheetOpen } = useUIStore();
  
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleStationClick = (station: Station) => {
    setSelectedStationId(station.stationId);
    setBottomSheetOpen(true);
    navigate('/map', { 
      state: { 
        centerLat: station.location.coordinates[1], 
        centerLng: station.location.coordinates[0] 
      } 
    });
  };

  const refreshNearbyStations = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('위치 정보를 지원하지 않는 브라우저입니다.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationError(null);
        void fetchRecommendations(pos.coords.latitude, pos.coords.longitude, 800);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setLocationError('위치 권한을 허용하면 주변 정류소를 볼 수 있어요.');
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, [fetchRecommendations]);

  useEffect(() => {
    void fetchStats();
    
    // 🗺️ 내 주변 정류소 정보 가져오기
    void (async () => {
      refreshNearbyStations();
    })();
    
    // 🗺️ 카카오맵 미리 불러오기 (Preloading)
    const kakaoAppKey = import.meta.env.VITE_KAKAO_MAP_APP_KEY as string | undefined;
    if (kakaoAppKey) {
      loadKakaoMap(kakaoAppKey).catch(err => console.error('Map preload failed:', err));
    }
  }, [fetchStats, refreshNearbyStations]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "좋은 아침이에요";
    if (hour < 18) return "즐거운 오후예요";
    return "행복한 밤이에요";
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <div className="flex-1 overflow-y-auto pb-32 scrollbar-hide">
        {/* 1. 상단 인사말 */}
        <div className="px-6 pt-6 pb-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-0.5"
          >
            <p className="text-xs font-black text-primary-600 uppercase tracking-tighter">{greeting()} 🚲</p>
            <h1 className="text-xl font-black text-neutral-900 leading-tight">
              {user?.username || '사용자'}님, 안녕하세요!
            </h1>
          </motion.div>
        </div>

        {/* 2. 메인 CTA 버튼 */}
        <div className="px-6 mb-6">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/map')}
            className="w-full bg-neutral-900 rounded-[32px] p-7 flex flex-col items-start gap-4 shadow-xl shadow-neutral-900/10 relative overflow-hidden group transition-all"
          >
            <div className="absolute right-[-10px] top-[-10px] opacity-5 group-hover:scale-110 transition-transform duration-700 text-white">
              <Navigation size={160} />
            </div>
            
            <motion.div 
              initial={{ rotate: -10 }}
              animate={{ rotate: 0 }}
              className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/20"
            >
              <Bike size={24} />
            </motion.div>
            
            <div className="text-left space-y-1 relative z-10">
              <h2 className="text-xl font-black text-white">지도에서 자전거 찾기</h2>
              <p className="text-neutral-500 text-xs font-bold">주변의 대여 가능한 자전거 확인</p>
            </div>
            
            <div className="w-full flex justify-end relative z-10">
              <div className="px-4 py-2 rounded-full bg-white/5 flex items-center gap-2 text-white text-[10px] font-black uppercase tracking-widest group-hover:bg-primary-500 transition-colors duration-300">
                Start Now
                <ChevronRight size={14} />
              </div>
            </div>
          </motion.button>
        </div>

        <div className="px-6 space-y-8">
          {/* 3. 라이딩 통계 섹션 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">내 라이딩 스탯</h3>
              <motion.div
                animate={{ y: [0, -2, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <TrendingUp size={12} className="text-neutral-300" />
              </motion.div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {status === 'loading' && !stats ? (
                <>
                  <Skeleton className="h-24 rounded-[24px]" />
                  <Skeleton className="h-24 rounded-[24px]" />
                </>
              ) : (
                <>
                  <StatCard 
                    icon={<Navigation size={16} />} 
                    label="총 거리" 
                    value={`${stats?.totalDistance?.toFixed(1) || 0}km`} 
                    color="text-blue-500"
                    delay={0.1}
                  />
                  <StatCard 
                    icon={<Leaf size={16} />} 
                    label="탄소 절감" 
                    value={`${stats?.totalCarbonReduction?.toFixed(2) || 0}kg`} 
                    color="text-green-500"
                    delay={0.2}
                  />
                </>
              )}
            </div>
          </section>

          {/* 4. 내 주변 정류소 실시간 현황 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <MapPin size={12} className="text-primary-500" />
                <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">주변 실시간 현황</h3>
              </div>
              <button 
                onClick={refreshNearbyStations}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-neutral-300 active:rotate-180 transition-transform duration-500"
              >
                <RefreshCw size={12} />
              </button>
            </div>

            <div className="space-y-2">
              {stationStatus === 'loading' ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 rounded-[24px]" />
                  <Skeleton className="h-20 rounded-[24px]" />
                </div>
              ) : locationError ? (
                <div className="p-8 bg-white rounded-[24px] border border-gray-100 text-center space-y-2">
                  <AlertCircle size={24} className="mx-auto text-gray-200" />
                  <p className="text-[10px] font-bold text-neutral-400">{locationError}</p>
                </div>
              ) : recommendations.length === 0 ? (
                <div className="p-8 bg-white rounded-[24px] border border-gray-100 text-center">
                  <p className="text-[10px] font-bold text-neutral-400">주변 800m 내에 정류소가 없습니다.</p>
                </div>
              ) : (
                recommendations.slice(0, 2).map((station, i) => (
                  <motion.div
                    key={station.stationId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => handleStationClick(station)}
                    className="bg-white p-4 rounded-[24px] border border-gray-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        station.availableBikes > 3 ? 'bg-primary-50 text-primary-500' : 'bg-orange-50 text-orange-500'
                      }`}>
                        <Bike size={18} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h4 className="text-sm font-black text-neutral-800 line-clamp-1">{station.name}</h4>
                        <p className="text-[10px] font-bold text-neutral-400 line-clamp-1">{station.address || '서울시 공공자전거'}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                            station.predictedAvailability != null 
                              ? 'bg-blue-50 border-blue-100 text-blue-600' 
                              : 'bg-gray-50 border-gray-100 text-neutral-400'
                          }`}>
                            <span className="text-[9px] font-black uppercase tracking-tighter">
                              {station.predictedAvailability != null 
                                ? `예측 ${station.predictedAvailability}%` 
                                : '분석 중'}
                            </span>
                            {station.predictedAvailability != null && (
                              <span className="text-[8px] opacity-80">
                                {(station.confidence || 0) > 0.7 ? '⭐⭐⭐' : (station.confidence || 0) > 0.3 ? '⭐⭐' : '⭐'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col justify-between h-full">
                      <p className={`text-lg font-black ${
                        station.availableBikes > 0 ? 'text-neutral-900' : 'text-red-400'
                      }`}>
                        {station.availableBikes}
                        <span className="text-[10px] text-neutral-400 ml-1 font-bold">대</span>
                      </p>
                      <div className="flex items-center gap-1 justify-end mt-2">
                         <div className={`w-1.5 h-1.5 rounded-full ${
                           station.availableBikes > 5 ? 'bg-green-400' : station.availableBikes > 0 ? 'bg-orange-400' : 'bg-red-400'
                         }`} />
                         <span className="text-[9px] font-black text-neutral-300 uppercase">Status</span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </section>

          {/* 5. 바로가기 메뉴 */}
          <section className="grid grid-cols-2 gap-3 pb-8">
             <motion.button 
               whileTap={{ scale: 0.95 }}
               onClick={() => navigate('/profile/history')}
               className="bg-white p-5 rounded-[24px] border border-gray-100 flex flex-col items-center gap-3 shadow-sm transition-all hover:border-primary-500/20"
             >
               <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-neutral-500">
                 <History size={18} />
               </div>
               <span className="text-xs font-black text-neutral-700">이용 내역</span>
             </motion.button>
             <motion.button 
               whileTap={{ scale: 0.95 }}
               onClick={() => navigate('/payment')}
               className="bg-white p-5 rounded-[24px] border border-gray-100 flex flex-col items-center gap-3 shadow-sm transition-all hover:border-primary-500/20"
             >
               <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-neutral-500">
                 <ArrowUpRight size={18} />
               </div>
               <span className="text-xs font-black text-neutral-700">이용권 구매</span>
             </motion.button>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, delay = 0 }: { icon: React.ReactNode, label: string, value: string, color: string, delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex-1"
    >
      <Card className="border-none shadow-sm rounded-[24px] bg-white overflow-hidden active:bg-gray-50 transition-colors h-full">
        <CardContent className="p-5 flex flex-col gap-3">
          <div className={`w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center ${color}`}>
            {icon}
          </div>
          <div>
            <p className="text-[9px] font-black text-neutral-400 uppercase tracking-tight">{label}</p>
            <p className="text-lg font-black text-neutral-800 tracking-tight">{value}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

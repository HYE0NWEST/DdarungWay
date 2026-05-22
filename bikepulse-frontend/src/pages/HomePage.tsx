import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bike, 
  ChevronRight, 
  TrendingUp, 
  Leaf, 
  Navigation,
  ArrowUpRight,
  Clock,
  History
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useTripStore } from '../stores/tripStore';
import { Card, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { loadKakaoMap } from '../services/map/mapUtils';

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { stats, status, fetchStats } = useTripStore();

  useEffect(() => {
    void fetchStats();
    
    // 🗺️ 카카오맵 미리 불러오기 (Preloading)
    const kakaoAppKey = import.meta.env.VITE_KAKAO_MAP_APP_KEY as string | undefined;
    if (kakaoAppKey) {
      loadKakaoMap(kakaoAppKey).catch(err => console.error('Map preload failed:', err));
    }
  }, [fetchStats]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "좋은 아침이에요";
    if (hour < 18) return "즐거운 오후예요";
    return "행복한 밤이에요";
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50 overflow-hidden">
      {/* 1. 상단 인사말 - 컴팩트하게 조정 */}
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

      {/* 2. 메인 CTA 버튼 - 높이 최적화 */}
      <div className="px-6 mb-4">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/map')}
          className="w-full bg-neutral-900 rounded-[28px] p-6 flex flex-col items-start gap-3 shadow-xl shadow-neutral-900/10 relative overflow-hidden group transition-all"
        >
          <div className="absolute right-[-10px] top-[-10px] opacity-5 group-hover:scale-110 transition-transform duration-700">
            <Navigation size={140} />
          </div>
          
          <motion.div 
            initial={{ rotate: -10 }}
            animate={{ rotate: 0 }}
            className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/20"
          >
            <Bike size={20} />
          </motion.div>
          
          <div className="text-left space-y-0.5 relative z-10">
            <h2 className="text-lg font-black text-white">지도에서 자전거 찾기</h2>
            <p className="text-neutral-500 text-[10px] font-bold">주변의 대여 가능한 자전거 확인</p>
          </div>
          
          <div className="w-full flex justify-end relative z-10">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white group-hover:bg-primary-500 transition-colors duration-300">
              <ChevronRight size={16} />
            </div>
          </div>
        </motion.button>
      </div>

      <div className="flex-1 px-6 space-y-4 min-h-0">
        {/* 3. 라이딩 통계 섹션 - 더 촘촘하게 배치 */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">내 라이딩 스탯</h3>
            <motion.div
              animate={{ y: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <TrendingUp size={12} className="text-neutral-300" />
            </motion.div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {status === 'loading' && !stats ? (
              <>
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
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
                <StatCard 
                  icon={<Clock size={16} />} 
                  label="이용 시간" 
                  value={`${stats?.totalDuration || 0}분`} 
                  color="text-orange-500"
                  delay={0.3}
                />
                <StatCard 
                  icon={<Bike size={16} />} 
                  label="이용 횟수" 
                  value={`${stats?.totalTrips || 0}회`} 
                  color="text-primary-500"
                  delay={0.4}
                />
              </>
            )}
          </div>
        </section>

        {/* 4. 바로가기 메뉴 - 컴팩트하게 구성 */}
        <section className="grid grid-cols-2 gap-2 pb-6">
           <motion.button 
             whileTap={{ scale: 0.95 }}
             onClick={() => navigate('/profile/history')}
             className="bg-white p-4 rounded-[20px] border border-gray-100 flex items-center gap-2 shadow-sm transition-all"
           >
             <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-neutral-500">
               <History size={14} />
             </div>
             <span className="text-[11px] font-black text-neutral-700">이용 내역</span>
           </motion.button>
           <motion.button 
             whileTap={{ scale: 0.95 }}
             onClick={() => navigate('/payment')}
             className="bg-white p-4 rounded-[20px] border border-gray-100 flex items-center gap-2 shadow-sm transition-all"
           >
             <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-neutral-500">
               <ArrowUpRight size={14} />
             </div>
             <span className="text-[11px] font-black text-neutral-700">이용권 구매</span>
           </motion.button>
        </section>
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
    >
      <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden active:bg-gray-50 transition-colors">
        <CardContent className="p-4 flex flex-col gap-2">
          <div className={`w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center ${color}`}>
            {icon}
          </div>
          <div>
            <p className="text-[9px] font-black text-neutral-400 uppercase tracking-tight">{label}</p>
            <p className="text-base font-black text-neutral-800">{value}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

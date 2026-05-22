import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '../stores/authStore';
import { useTripStore } from '../stores/tripStore';
import { Skeleton } from '../components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Bike, MapPin, Leaf, Route, LogOut, ChevronRight, Settings, Trophy, TrendingUp, X, Bell, Heart, HelpCircle } from 'lucide-react';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState<'distance' | 'count' | null>(null);
  const [showLevelInfo, setShowLevelInfo] = useState(false);
  
  const { history: tripHistory, fetchStats, stats, currentTrip } = useTripStore();
  const { logout } = useAuthStore();

  // ✅ 에코 레벨 정의
  const ecoLevels = useMemo(() => [
    { level: 1, min: 0, max: 5, label: '그린 라이더', color: '#82ccdd' },
    { level: 2, min: 5, max: 15, label: '에코 라이더', color: '#78e08f' },
    { level: 3, min: 15, max: 30, label: '가디언 라이더', color: '#38ada9' },
    { level: 4, min: 30, max: 50, label: '히어로 라이더', color: '#079992' },
    { level: 5, min: 50, max: Infinity, label: '레전드 라이더', color: '#f8c291' },
  ], []);

  const currentLevel = useMemo(() => {
    const reduction = stats?.totalCarbonReduction || 0;
    return ecoLevels.find(l => reduction >= l.min && reduction < l.max) || ecoLevels[ecoLevels.length - 1];
  }, [stats?.totalCarbonReduction, ecoLevels]);

  const nextLevel = useMemo(() => {
    return ecoLevels[currentLevel.level] || null;
  }, [currentLevel, ecoLevels]);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        await fetchStats();
      } catch (error) {
        toast.error('프로필 정보 로드 실패');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    void fetchProfileData();
  }, [fetchStats]);

  // 차트 데이터 가공 (최근 5일간의 추이, 데이터 없는 날은 0으로 표시)
  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();
    
    // 1. 최근 5일간의 날짜 배열 생성 (오늘 포함)
    for (let i = 4; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
      
      // 2. 해당 날짜의 주행 기록 합산
      const dayTrips = tripHistory.filter(trip => {
        if (!trip.startTime) return false;
        return new Date(trip.startTime).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) === dateStr;
      });

      const dayDistance = dayTrips.reduce((acc, curr) => acc + (curr.distance || 0), 0);
      
      // 3. 해당 날짜까지의 누적 이용 횟수 계산
      const totalTripsUntilThisDate = tripHistory.filter(t => {
        if (!t.startTime) return false;
        // startTime이 해당 날짜 d와 같거나 이전인 경우만 카운트
        const tDate = new Date(t.startTime);
        tDate.setHours(0, 0, 0, 0);
        const compareDate = new Date(d);
        compareDate.setHours(0, 0, 0, 0);
        return tDate <= compareDate;
      }).length;

      data.push({
        date: dateStr,
        distance: parseFloat(dayDistance.toFixed(1)),
        count: totalTripsUntilThisDate
      });
    }

    return data;
  }, [tripHistory]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('안전하게 로그아웃되었습니다.');
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  const reduction = stats?.totalCarbonReduction || 0;
  const carbonProgress = nextLevel 
    ? Math.min(((reduction - currentLevel.min) / (currentLevel.max - currentLevel.min)) * 100, 100)
    : 100;

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      {/* 1. 유저 히어로 섹션 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-primary-500/30">
            {user?.username?.[0] || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-neutral-900">{user?.username}</h2>
            </div>
            <p className="text-sm text-neutral-500 font-medium">{user?.email}</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/profile/settings')}
          className="p-2 text-neutral-400 hover:text-primary-500 transition-colors"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* 2. 현재 주행 중인 상태 */}
      {currentTrip && (currentTrip.status === 'STARTED' || currentTrip.status === 'IN_PROGRESS') && (
        <Card className="border-none bg-primary-500 text-white shadow-lg overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Riding Now</span>
              </div>
              <button 
                onClick={() => {
                  if (confirm('대여를 취소하시겠습니까?')) {
                    void useTripStore.getState().cancelTrip(currentTrip._id, '사용자 변심').then(() => fetchStats());
                  }
                }}
                className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded hover:bg-white/30"
              >
                대여취소
              </button>
            </div>
            <CardTitle className="text-xl font-black">{currentTrip.startStationName}에서 대여 중</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button 
              onClick={() => navigate('/trip')}
              className="w-full bg-white text-primary-600 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-inner"
            >
              <MapPin size={16} />
              실시간 경로 및 반납소 찾기
            </button>
          </CardContent>
        </Card>
      )}

      {/* 3. 탄소 절감 대시보드 */}
      <Card 
        className="border-none shadow-2xl overflow-hidden relative cursor-pointer active:scale-[0.98] transition-all"
        style={{ backgroundColor: '#16a085' }} // 더 진한 청록/녹색 계열로 가독성 확보
        onClick={() => setShowLevelInfo(true)}
      >
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Leaf size={80} />
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-100 mb-1">
              <Trophy size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Earth Guardian</span>
            </div>
            <Badge className="bg-white/20 text-white border-none text-[10px] font-black">
              Lv.{currentLevel.level} {currentLevel.label}
            </Badge>
          </div>
          <CardTitle className="text-2xl font-black text-white">환경을 지키는 라이딩</CardTitle>
          <CardDescription className="text-green-50 font-medium opacity-90">
            현재까지 <span className="text-amber-300 font-black">{reduction}kg</span>의 탄소를 줄였습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* ✅ 대비가 확실한 Amber 색상 프로그레스 바 */}
            <div className="h-3 w-full bg-black/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)] transition-all duration-1000" 
                style={{ width: `${carbonProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-green-100 uppercase tracking-tighter opacity-80">
              <span>{currentLevel.label}</span>
              <span>{nextLevel ? `${nextLevel.label} (목표: ${currentLevel.max}kg)` : '최고 레벨'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. 주요 통계 그리드 & 차트 섹션 */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Card 
            className={`border-none transition-all cursor-pointer ${activeChart === 'distance' ? 'ring-2 ring-blue-500 shadow-md' : 'bg-white shadow-sm hover:shadow-md'}`}
            onClick={() => setActiveChart(activeChart === 'distance' ? null : 'distance')}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center mb-2">
                <Route size={20} />
              </div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase">누적 거리</p>
              <p className="text-xl font-black text-neutral-900">{stats?.totalDistance || 0} <span className="text-xs font-bold text-neutral-400">km</span></p>
              <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-blue-500">
                <TrendingUp size={10} />
                <span>트렌드 보기</span>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`border-none transition-all cursor-pointer ${activeChart === 'count' ? 'ring-2 ring-primary-500 shadow-md' : 'bg-white shadow-sm hover:shadow-md'}`}
            onClick={() => setActiveChart(activeChart === 'count' ? null : 'count')}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-500 flex items-center justify-center mb-2">
                <Bike size={20} />
              </div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase">이용 횟수</p>
              <p className="text-xl font-black text-neutral-900">{stats?.totalTrips || 0} <span className="text-xs font-bold text-neutral-400">회</span></p>
              <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-primary-500">
                <TrendingUp size={10} />
                <span>성장 곡선</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 인터랙티브 차트 */}
        {activeChart && (
          <Card className="border-none bg-white shadow-xl animate-in zoom-in-95 duration-300">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-black text-neutral-800 uppercase tracking-wider">
                  {activeChart === 'distance' ? '최근 주행 거리 추이' : '누적 이용 횟수'}
                </CardTitle>
                <button onClick={() => setActiveChart(null)} className="text-xs text-neutral-400 font-bold hover:text-neutral-600">닫기</button>
              </div>
            </CardHeader>
            <CardContent className="h-64 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                {activeChart === 'distance' ? (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorDistance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fontWeight: 700, fill: '#a3a3a3'}}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fontWeight: 700, fill: '#a3a3a3'}}
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold'}}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="distance" 
                      name="주행 거리(km)"
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorDistance)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                ) : (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fontWeight: 700, fill: '#a3a3a3'}}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fontWeight: 700, fill: '#a3a3a3'}}
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold'}}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      name="누적 이용 횟수"
                      stroke="#10b981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorCount)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 5. 주행 기록 목록 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-black text-neutral-900 uppercase text-xs tracking-widest">최근 이용 내역</h3>
          <button onClick={() => navigate('/profile/history')} className="text-xs font-bold text-primary-500 flex items-center">
            전체보기 <ChevronRight size={14} />
          </button>
        </div>

        <div className="space-y-3">
          {tripHistory.slice(0, 3).map((trip, i) => (
            <Card key={i} className="border-none bg-white shadow-sm overflow-hidden">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-neutral-400">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-neutral-900">{trip.startStationName}</p>
                    <p className="text-[10px] text-neutral-400 font-bold">{new Date(trip.startTime!).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-neutral-900">+{trip.distance}km</p>
                  <p className="text-[10px] text-primary-500 font-black">{trip.duration}분</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {tripHistory.length === 0 && (
            <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <p className="text-sm font-bold text-gray-400">아직 주행 기록이 없어요.</p>
            </div>
          )}
        </div>
      </div>

      {/* 6. 메뉴 리스트 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <button 
          onClick={() => navigate('/profile/settings')}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50"
        >
          <div className="flex items-center gap-3">
            <div className="text-neutral-400"><Settings size={18} /></div>
            <span className="text-sm font-bold text-neutral-700">프로필 설정</span>
          </div>
          <ChevronRight size={16} className="text-neutral-300" />
        </button>
        <button 
          onClick={() => navigate('/profile/favorites')}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50"
        >
          <div className="flex items-center gap-3">
            <div className="text-red-400"><Heart size={18} fill="currentColor" /></div>
            <span className="text-sm font-bold text-neutral-700">관심 정류소</span>
          </div>
          <ChevronRight size={16} className="text-neutral-300" />
        </button>
        <button 
          onClick={() => navigate('/profile/settings/notifications')}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50"
        >
          <div className="flex items-center gap-3">
            <div className="text-neutral-400"><Bell size={18} /></div>
            <span className="text-sm font-bold text-neutral-700">알림 설정</span>
          </div>
          <ChevronRight size={16} className="text-neutral-300" />
        </button>
        <button 
          onClick={() => navigate('/profile/support')}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50"
        >
          <div className="flex items-center gap-3">
            <div className="text-neutral-400"><HelpCircle size={18} /></div>
            <span className="text-sm font-bold text-neutral-700">고객센터 (공지/FAQ)</span>
          </div>
          <ChevronRight size={16} className="text-neutral-300" />
        </button>
        <button 
          onClick={handleLogout}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="text-neutral-400"><LogOut size={18} /></div>
            <span className="text-sm font-bold text-neutral-700">로그아웃</span>
          </div>
          <ChevronRight size={16} className="text-neutral-300" />
        </button>
      </div>

      {/* 7. 에코 레벨 정보 모달 */}
      {showLevelInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-sm border-none shadow-2xl bg-white overflow-hidden">
            <CardHeader className="pb-2 relative">
              <button 
                onClick={() => setShowLevelInfo(false)}
                className="absolute top-4 right-4 p-2 text-neutral-400 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <CardTitle className="text-xl font-black text-neutral-900 flex items-center gap-2">
                <Leaf className="text-green-500" />
                에코 레벨 가이드
              </CardTitle>
              <CardDescription className="font-bold">라이딩을 통해 지구를 지켜주세요!</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                {ecoLevels.map((lvl) => (
                  <div 
                    key={lvl.level}
                    className={`flex items-center gap-4 p-3 rounded-2xl border-2 transition-all ${currentLevel.level === lvl.level ? 'border-green-500 bg-green-50' : 'border-transparent bg-gray-50'}`}
                  >
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-black shadow-inner"
                      style={{ backgroundColor: lvl.color }}
                    >
                      Lv.{lvl.level}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-neutral-900">{lvl.label}</p>
                      <p className="text-[10px] text-neutral-500 font-bold">
                        {lvl.max === Infinity ? `${lvl.min}kg 이상` : `${lvl.min}kg ~ ${lvl.max}kg`}
                      </p>
                    </div>
                    {currentLevel.level === lvl.level && (
                      <Badge className="bg-green-500 text-white border-none font-bold text-[10px]">현재</Badge>
                    )}
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 p-4 rounded-2xl">
                <p className="text-[11px] text-blue-700 font-bold leading-relaxed">
                  💡 탄소 절감량은 주행 거리 1km당 <span className="underline">0.232kg</span>을 기준으로 계산됩니다. 꾸준한 라이딩으로 더 높은 레벨에 도전해보세요!
                </p>
              </div>
              <button 
                onClick={() => setShowLevelInfo(false)}
                className="w-full py-4 bg-neutral-900 text-white font-black rounded-2xl hover:bg-neutral-800 transition-colors"
              >
                확인 완료
              </button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    </div>
  );
}

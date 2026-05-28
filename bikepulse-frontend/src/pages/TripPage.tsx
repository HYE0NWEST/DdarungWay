import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  ChevronRight, 
  Search, 
  X, 
  ChevronLeft, 
  Bike, 
  Clock, 
  Navigation, 
  Flame,
  CheckCircle2,
  AlertCircle,
  QrCode,
  AlertTriangle,
  Plus,
  Minus
} from 'lucide-react';
import { useTripStore } from '../stores/tripStore';
import { useStationMapStore } from '../stores/stationMapStore';
import { apiClient } from '../services/api/client';
import { loadKakaoMap, getStationLatLng, calculateDistance } from '../services/map/mapUtils';
import { vibrate } from '../lib/utils';
import type { Station } from '../stores/types';
import type { KakaoMapInstance, KakaoMarkerInstance, KakaoPolylineInstance, KakaoCustomOverlayInstance } from '../types/kakao';

interface TripSummary {
  time: string;
  start: string;
  end: string;
  distance: string;
  carbon: string;
}

export function TripPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const kakaoMapRef = useRef<KakaoMapInstance | null>(null);
  const markersRef = useRef<KakaoMarkerInstance[]>([]);
  const overlaysRef = useRef<KakaoCustomOverlayInstance[]>([]);
  const kakaoAppKey = import.meta.env.VITE_KAKAO_MAP_APP_KEY as string | undefined;

  const { 
    status, 
    currentTrip, 
    reserveBike, 
    startTrip, 
    completeTrip, 
    cancelTrip, 
    fetchCurrentTrip, 
    reportIssue,
    startStation,
    destStation,
    setStartStation,
    setDestStation
  } = useTripStore();
  const { recommendations, searchResults, fetchRecommendations, searchStations } = useStationMapStore();

  // ✅ 상태 관리
  const state = location.state as { startStation?: Station; destStation?: Station } | null;
  const [mapReady, setMapReady] = useState(false);

  // ✅ 초기 상태 설정 (네비게이션 파라미터가 있는 경우)
  useEffect(() => {
    if (state?.startStation) setStartStation(state.startStation);
    if (state?.destStation) setDestStation(state.destStation);
  }, [state, setStartStation, setDestStation]);

  // ✅ 주행 중 페이지 복귀 시 정보 복구 시도
  useEffect(() => {
    if (currentTrip && recommendations.length > 0) {
      if (!startStation && currentTrip.startStationId) {
        const foundStart = recommendations.find(s => s.stationId === currentTrip.startStationId);
        if (foundStart) setStartStation(foundStart);
      }
      if (!destStation && currentTrip.endStationId) {
        const foundDest = recommendations.find(s => s.stationId === currentTrip.endStationId);
        if (foundDest) setDestStation(foundDest);
      }
    }
  }, [currentTrip, recommendations, startStation, destStation, setStartStation, setDestStation]);
  const [rideTime, setRideTime] = useState(0);
  const [reserveTimeLeft, setReserveTimeLeft] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [lastTripResult, setLastTripResult] = useState<TripSummary | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState('tire');
  const [reportDesc, setReportDesc] = useState('');
  const routePolylineRef = useRef<KakaoPolylineInstance | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const lastQrErrorRef = useRef<number>(0);

  // ✅ 유틸리티 함수
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleZoomIn = () => {
    if (!kakaoMapRef.current) return;
    const currentLevel = kakaoMapRef.current.getLevel();
    if (currentLevel > 1) {
      kakaoMapRef.current.setLevel(currentLevel - 1);
    }
  };

  const handleZoomOut = () => {
    if (!kakaoMapRef.current) return;
    const currentLevel = kakaoMapRef.current.getLevel();
    if (currentLevel < 14) {
      kakaoMapRef.current.setLevel(currentLevel + 1);
    }
  };

  // ✅ 대여 및 여정 관련 핸들러
  const handleStartRental = async () => {
    if (!startStation || !destStation) return toast.error('출발지와 목적지를 선택해주세요.', { id: 'trip-selection-error' });
    try {
      const { data: p } = await apiClient.get('/users/profile');
      if (!p.data.activePass || new Date(p.data.passExpiresAt) <= new Date()) {
        toast.error('이용권이 만료되었습니다.', { id: 'pass-expired-error' });
        return navigate('/payment');
      }
      await reserveBike(startStation.stationId);
      vibrate([50, 50]);
      toast.success('자전거가 10분간 예약되었습니다! 🚲', { id: 'trip-reserved' });
    } catch { /* store handles error */ }
  };

  const handleUnlockBike = useCallback(async () => {
    const stationId = currentTrip?.startStationId || startStation?.stationId;
    if (!stationId) return;
    try {
      await startTrip(stationId);
      vibrate([50, 50, 50]);
      toast.success('대여가 시작되었습니다. 즐거운 라이딩 되세요!', { id: 'trip-started' });
    } catch { toast.error('잠금 해제에 실패했습니다.', { id: 'unlock-error' }); }
  }, [currentTrip, startStation, startTrip]);

  const handleTestRent = async () => {
    const stationId = startStation?.stationId || currentTrip?.startStationId;
    if (!stationId) return toast.error('출발지 정보가 없습니다.', { id: 'test-rent-error' });
    try {
      await startTrip(stationId);
      toast.success('[테스트] 즉시 대여가 시작되었습니다.', { id: 'trip-started' });
    } catch { /* store handles error */ }
  };

  const handleReturn = async () => {
    const activeDest = destStation || (currentTrip?.endStationId ? { stationId: currentTrip.endStationId, name: currentTrip.endStationName } : null);
    if (!currentTrip || !activeDest) return toast.error('반납처를 선택해주세요.', { id: 'return-error' });
    const p1 = startStation ? getStationLatLng(startStation) : null;
    const p2 = getStationLatLng(activeDest as Station);
    const dist = p1 && p2 ? calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng) : 2.0;
    const distStr = dist.toFixed(1);
    await completeTrip(currentTrip._id, { endStationId: activeDest.stationId, distance: parseFloat(distStr) });
    vibrate([50, 100, 50]);
    setLastTripResult({
      time: formatTime(rideTime),
      start: currentTrip.startStationName || '-',
      end: activeDest.name || '-',
      distance: `${distStr}km`,
      carbon: (parseFloat(distStr) * 0.232).toFixed(2)
    });
    setShowSummary(true);
  };

  const handleCancel = async () => {
    if (!currentTrip) return;
    vibrate(30);
    if (currentTrip.status === 'RESERVED') {
      if (window.confirm('예약을 취소하시겠습니까?')) {
        await cancelTrip(currentTrip._id, '사용자 예약 취소');
        toast.success('예약이 취소되었습니다.', { id: 'trip-cancelled' });
        navigate('/home');
      }
      return;
    }
    const isEarly = rideTime < 120;
    const message = isEarly 
      ? '대여를 취소하시겠습니까?\n2분 이내 취소 시 주행 기록에 합산되지 않습니다.'
      : '이미 2분 이상 주행 중입니다. 정말 취소하시겠습니까?';
    if (window.confirm(message)) {
      await cancelTrip(currentTrip._id, isEarly ? '사용자 변심' : '주행 중 취소');
      navigate('/home');
    }
  };

  const handleReportSubmit = async () => {
    if (!currentTrip) return;
    try {
      await reportIssue({
        stationId: currentTrip.startStationId,
        tripId: currentTrip._id,
        issueType: reportType,
        description: reportDesc
      });
      toast.success('고장 신고가 접수되었습니다.', { id: 'report-submitted' });
      setIsReportModalOpen(false);
      setReportDesc('');
    } catch {
      // 에러는 store에서 처리됨
    }
  };

  // ✅ QR 스캐너 시작
  const handleOpenScanner = () => {
    setIsScannerOpen(true);
    vibrate(50);
  };

  // ✅ QR 스캔 성공 처리
  const handleQrScanSuccess = useCallback((decodedText: string) => {
    console.log('QR Scanned:', decodedText);
    
    // ✅ 서울 따릉이 QR 검증 로직 (SPB- 로 시작하거나 포함하는지 확인)
    if (!decodedText.includes('SPB-')) {
      const now = Date.now();
      if (now - lastQrErrorRef.current > 3000) { // 3초에 한 번만 에러 메시지 띄움
        toast.error('유효한 따릉이 QR 코드가 아닙니다.', { id: 'qr-error' });
        lastQrErrorRef.current = now;
        vibrate(50);
      }
      return; // 조건에 맞지 않으면 스캐너를 닫지 않고 계속 스캔
    }

    setIsScannerOpen(false);
    vibrate([100, 50, 100]);
    toast.success('따릉이 QR 코드가 확인되었습니다!', { id: 'qr-success' });
    void handleUnlockBike();
  }, [handleUnlockBike, setIsScannerOpen]);

  useEffect(() => {
    if (isScannerOpen) {
      const timer = setTimeout(() => {
        const scanner = new Html5QrcodeScanner(
          'reader',
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          false
        );
        scanner.render(handleQrScanSuccess, () => {});
        scannerRef.current = scanner;
      }, 100);
      return () => clearTimeout(timer);
    } else if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
  }, [isScannerOpen, handleQrScanSuccess]);

  // ✅ 검색 관련 상태
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // ✅ 경로 기반 고정 데이터 계산
  const routeMetrics = useMemo(() => {
    if (!startStation || !destStation) return { distance: 0, calories: 0, estTime: 0 };
    const p1 = getStationLatLng(startStation);
    const p2 = getStationLatLng(destStation);
    if (!p1 || !p2) return { distance: 0, calories: 0, estTime: 0 };
    
    const distance = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    const calories = Math.floor(distance * 35);
    const estTime = Math.ceil((distance / 15) * 60);
    
    return { distance: parseFloat(distance.toFixed(1)), calories, estTime };
  }, [startStation, destStation]);

  const { distance: estimatedDistance, calories } = routeMetrics;

  // ✅ 데이터 초기 로드
  useEffect(() => {
    void fetchCurrentTrip();
  }, [fetchCurrentTrip]);

  // ✅ 외부 클릭 시 검색 결과 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearching(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ 디바운싱 검색
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchKeyword.trim()) {
        void searchStations(searchKeyword);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchKeyword, searchStations]);

  // ✅ 검색 결과 선택 처리
  const handleSelectSearchResult = (station: Station) => {
    const pos = getStationLatLng(station);
    if (!pos || !kakaoMapRef.current) return;
    kakaoMapRef.current.panTo(new window.kakao!.maps.LatLng(pos.lat, pos.lng));
    
    if (!currentTrip) {
      if (!startStation || (startStation && destStation)) {
        setStartStation(station);
        setDestStation(null);
      } else {
        setDestStation(station);
      }
    } else {
      setDestStation(station);
    }
    setSearchKeyword('');
    setIsSearching(false);
    void fetchRecommendations(pos.lat, pos.lng, 2000);
  };

  // ✅ 경로 조회 및 표시
  const drawRoute = useCallback(async (start: Station, end: Station) => {
    if (!kakaoMapRef.current || !window.kakao?.maps) return;
    try {
      const startCoords = getStationLatLng(start);
      const endCoords = getStationLatLng(end);
      if (!startCoords || !endCoords) return;

      const { data } = await apiClient.post('/routes/pedestrian', {
        startX: startCoords.lng,
        startY: startCoords.lat,
        endX: endCoords.lng,
        endY: endCoords.lat,
      });

      const coords = data.data.coordinates as [number, number][];
      const path = coords.map(([lng, lat]) => new window.kakao!.maps.LatLng(lat, lng));

      if (routePolylineRef.current) routePolylineRef.current.setMap(null);
      const polyline = new window.kakao!.maps.Polyline({
        path,
        strokeWeight: 6,
        strokeColor: '#3498db',
        strokeOpacity: 0.8,
        strokeStyle: 'solid',
      });
      polyline.setMap(kakaoMapRef.current);
      routePolylineRef.current = polyline;

      const bounds = new window.kakao!.maps.LatLngBounds();
      path.forEach(p => bounds.extend(p));
      
      // ✅ UI에 가려지지 않도록 화면 맞춤 (setBounds는 인자를 1개만 받으므로 기본형 사용)
      kakaoMapRef.current!.setBounds(bounds);
    } catch (error) {
      console.error('Route drawing error:', error);
    }
  }, []);

  useEffect(() => {
    if (startStation && destStation && mapReady) {
      void drawRoute(startStation, destStation);
    } else if (!destStation && routePolylineRef.current) {
       routePolylineRef.current.setMap(null);
       routePolylineRef.current = null;
    }
  }, [startStation, destStation, mapReady, drawRoute]);

  // ✅ 실시간 타이머 (주행용)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (currentTrip && (currentTrip.status === 'STARTED' || currentTrip.status === 'IN_PROGRESS') && currentTrip.startTime) {
      const startTime = new Date(currentTrip.startTime).getTime();
      interval = setInterval(() => {
        setRideTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentTrip]);

  // ✅ 실시간 타이머 (예약용)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (currentTrip && currentTrip.status === 'RESERVED' && currentTrip.reservationExpiresAt) {
      const expiresAt = new Date(currentTrip.reservationExpiresAt).getTime();
      const updateTimer = () => {
        const diff = Math.floor((expiresAt - Date.now()) / 1000);
        if (diff <= 0) {
          setReserveTimeLeft(0);
          clearInterval(interval);
          toast.error('예약 시간이 만료되었습니다.');
          void fetchCurrentTrip();
          navigate('/home');
        } else {
          setReserveTimeLeft(diff);
        }
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    }
    return () => clearInterval(interval);
  }, [currentTrip, fetchCurrentTrip, navigate]);

  // ✅ 카카오맵 초기화
  const initMap = useCallback(() => {
    if (!kakaoAppKey || !mapRef.current || kakaoMapRef.current) return;
    loadKakaoMap(kakaoAppKey).then(() => {
      const initialLat = startStation?.location?.coordinates[1] ?? 37.5665;
      const initialLng = startStation?.location?.coordinates[0] ?? 126.978;
      const mapInstance = new window.kakao!.maps.Map(mapRef.current!, {
        center: new window.kakao!.maps.LatLng(initialLat, initialLng),
        level: 4,
      });
      kakaoMapRef.current = mapInstance;
      window.kakao!.maps.event.addListener(mapInstance, 'dragend', () => {
        const center = mapInstance.getCenter();
        void fetchRecommendations(center.getLat(), center.getLng(), 2000);
      });
      setMapReady(true);
      void fetchRecommendations(initialLat, initialLng, 2000);
    }).catch(err => console.error('Map init error:', err));
  }, [kakaoAppKey, startStation, fetchRecommendations]);

  useEffect(() => {
    initMap();
  }, [initMap]);

  // ✅ 마커 업데이트 (최적화: 경로 확정 시 주변 마커 숨김)
  useEffect(() => {
    if (!mapReady || !kakaoMapRef.current || !window.kakao?.maps) return;
    markersRef.current.forEach(m => m.setMap(null));
    overlaysRef.current.forEach(o => o.setMap(null));
    markersRef.current = [];
    overlaysRef.current = [];

    const isRouteActive = (startStation && destStation) || currentTrip;

    recommendations.forEach(station => {
      const pos = getStationLatLng(station);
      if (!pos) return;
      const isStart = station.stationId === (startStation?.stationId || currentTrip?.startStationId);
      const isDest = station.stationId === (destStation?.stationId || currentTrip?.endStationId);
      const availableBikes = Number(station.availableBikes || 0);
      const totalDocks = Number(station.totalDocks || 0);
      const usageRate = totalDocks > 0 ? (availableBikes / totalDocks) * 100 : 0;

      // ✅ 경로가 확정되었을 때는 시작지와 목적지 마커만 표시
      if (isRouteActive && !isStart && !isDest) return;

      // 상태 클래스 결정
      let statusClass = ''; // 기본 초록 (5대 이상 또는 25% 초과)
      if (availableBikes === 0) statusClass = 'empty'; // 회색
      else if (availableBikes === 1) statusClass = 'few'; // 빨강
      else if (availableBikes < 5 && usageRate <= 25) statusClass = 'moderate'; // 주황

      const content = document.createElement('div');
      content.className = `custom-marker ${isStart ? 'start' : isDest ? 'dest' : ''} ${statusClass}`;
      content.innerHTML = `<span>${availableBikes}</span>`;
      const overlay = new window.kakao!.maps.CustomOverlay({
        position: new window.kakao!.maps.LatLng(pos.lat, pos.lng),
        content,
        map: kakaoMapRef.current,
        zIndex: isStart || isDest ? 50 : 10
      });
      overlaysRef.current.push(overlay);

      const inv = new window.kakao!.maps.Marker({
        position: new window.kakao!.maps.LatLng(pos.lat, pos.lng),
        map: kakaoMapRef.current,
        image: new window.kakao!.maps.MarkerImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', new window.kakao!.maps.Size(32, 32)),
        opacity: 0,
        zIndex: 100
      });

      window.kakao!.maps.event.addListener(inv, 'click', () => {
        if (!currentTrip) {
          if (!startStation || (startStation && destStation)) {
            setStartStation(station);
            setDestStation(null);
          } else {
            setDestStation(station);
          }
        } else {
          setDestStation(station);
        }
      });
      markersRef.current.push(inv);
    });
  }, [mapReady, recommendations, startStation, destStation, currentTrip, setStartStation, setDestStation]);

  return (
    <div className="relative w-full h-full bg-neutral-100 overflow-hidden">
      <div ref={mapRef} className="absolute inset-0 z-0" />
      
      <div className="absolute top-0 left-0 right-0 p-6 z-10 pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          <button onClick={() => navigate(-1)} className="w-12 h-12 bg-white/80 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg border border-white/40 active:scale-90 transition-all">
            <ChevronLeft size={24} className="text-neutral-800" />
          </button>
          
          <AnimatePresence>
            {isPanelCollapsed && currentTrip && (
              <motion.button initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onClick={() => setIsPanelCollapsed(false)}
                className={`px-5 py-3 ${currentTrip.status === 'RESERVED' ? 'bg-neutral-800' : 'bg-primary-500'} rounded-2xl shadow-xl text-white flex items-center gap-3 active:scale-95 transition-all`}
              >
                <div className={`w-2 h-2 rounded-full bg-white ${currentTrip.status === 'RESERVED' ? '' : 'animate-pulse'}`} />
                <span className="font-black tabular-nums text-sm">
                  {currentTrip.status === 'RESERVED' ? formatTime(reserveTimeLeft) : formatTime(rideTime)}
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 🔍 줌 컨트롤 버튼 */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-[100] flex flex-col gap-2 pointer-events-auto">
        <button 
          onClick={handleZoomIn}
          className="w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl border border-white/20 active:scale-95 transition-all"
          aria-label="Zoom In"
        >
          <Plus size={24} className="text-neutral-800" />
        </button>
        <button 
          onClick={handleZoomOut}
          className="w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl border border-white/20 active:scale-95 transition-all"
          aria-label="Zoom Out"
        >
          <Minus size={24} className="text-neutral-800" />
        </button>
      </div>

      {(!currentTrip || currentTrip.status === 'RESERVED') && !isPanelCollapsed && (
        <div className="absolute top-24 left-0 right-0 px-6 z-10" ref={searchContainerRef}>
          <div className="bg-white/90 backdrop-blur-2xl rounded-[24px] p-2 shadow-xl border border-white/40">
            <div className="flex items-center px-4 py-2 gap-3">
              <Search size={18} className="text-neutral-400" />
              <input className="flex-1 bg-transparent border-none outline-none font-bold text-sm text-neutral-800" placeholder="어디로 갈까요?" value={searchKeyword} onChange={e => { setSearchKeyword(e.target.value); setIsSearching(true); }} onFocus={() => setIsSearching(true)} />
              {searchKeyword && <button onClick={() => { setSearchKeyword(''); setIsSearching(false); }}><X size={16} className="text-neutral-300" /></button>}
            </div>
            <AnimatePresence>
              {isSearching && searchResults.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="max-h-60 overflow-y-auto pt-2 border-t border-neutral-100">
                    {searchResults.map(s => (
                      <button key={s.stationId} onClick={() => handleSelectSearchResult(s)} className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                        <div className="text-left"><p className="font-black text-sm text-neutral-800">{s.name}</p><p className="text-[10px] text-neutral-400 font-bold">{s.address || s.district}</p></div>
                        <div className="bg-primary-50 px-2 py-1 rounded-lg"><span className="text-[10px] font-black text-primary-600">{s.availableBikes}대</span></div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-6 z-20 pointer-events-none">
        <AnimatePresence mode="wait">
          {!currentTrip ? (
            <motion.div key="selection" initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="bg-white/95 backdrop-blur-2xl rounded-[40px] p-8 shadow-2xl border border-white/40 pointer-events-auto">
              <div className="space-y-6">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest">출발지</p>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className={`font-black whitespace-nowrap marquee-text ${startStation ? 'text-neutral-800' : 'text-neutral-300 italic'}`}>
                          {startStation?.name || '정류소를 선택하세요'}
                        </p>
                      </div>
                      {startStation && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setStartStation(null); }} 
                          className="p-1.5 bg-neutral-100 rounded-full text-neutral-500 shrink-0 active:scale-90 transition-transform"
                        >
                          <X size={12} strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <ChevronRight size={16} className="text-neutral-200 mt-4 shrink-0" />
                  
                  <div className="flex-1 space-y-1 text-right min-w-0">
                    <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest">목적지</p>
                    <div className="flex items-center justify-end gap-2 min-w-0">
                      {destStation && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setDestStation(null); }} 
                          className="p-1.5 bg-neutral-100 rounded-full text-neutral-500 shrink-0 active:scale-90 transition-transform"
                        >
                          <X size={12} strokeWidth={3} />
                        </button>
                      )}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className={`font-black whitespace-nowrap marquee-text ${destStation ? 'text-primary-500' : 'text-neutral-300 italic'}`}>
                          {destStation?.name || '정류소를 선택하세요'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {startStation && destStation ? (
                  <button onClick={handleStartRental} disabled={status === 'loading'} className="w-full py-6 bg-neutral-900 rounded-[24px] text-white font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                    <Bike size={24} /> {status === 'loading' ? '준비 중...' : '자전거 예약 및 경로 시작'}
                  </button>
                ) : (
                  <div className="py-6 px-4 bg-neutral-50 rounded-[24px] flex items-center gap-3 border border-neutral-100"><AlertCircle size={20} className="text-neutral-400" /><p className="text-sm font-bold text-neutral-500">지도에서 <strong>{startStation ? '목적지' : '출발지'}</strong>를 클릭해주세요.</p></div>
                )}
              </div>
            </motion.div>
          ) : isPanelCollapsed ? null : (
            <motion.div key={currentTrip.status} initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className={`rounded-[40px] p-8 shadow-2xl border pointer-events-auto relative ${currentTrip.status === 'RESERVED' ? 'bg-white/95 border-white/40' : 'bg-neutral-900 border-white/10 text-white'}`}>
              {/* 🔼 개선된 패널 핸들 (더 잘 보이게 수정) */}
              <div className="absolute top-0 left-0 right-0 h-8 flex items-center justify-center cursor-pointer" onClick={() => setIsPanelCollapsed(true)}>
                <div className={`w-12 h-1.5 rounded-full transition-colors ${currentTrip.status === 'RESERVED' ? 'bg-neutral-200 group-hover:bg-neutral-300' : 'bg-white/20 group-hover:bg-white/40'}`} />
              </div>

              {currentTrip.status === 'RESERVED' ? (
                <div className="space-y-6 pt-2">
                  <div className="text-center space-y-2">
                    <p className="text-xs font-black text-primary-500 uppercase tracking-widest">자전거 선점 완료!</p>
                    <h2 className="text-xl font-black text-neutral-900">10분 내에 자전거 정류소에 도착해 주세요.</h2>
                    <h1 className="text-5xl font-black text-neutral-900 tracking-tighter tabular-nums">{formatTime(reserveTimeLeft)}</h1>
                  </div>
                  <div className="bg-neutral-50 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600"><Bike size={24} /></div>
                    <div className="flex-1"><p className="text-[10px] font-bold text-neutral-400">나의 예약 정류소</p><p className="text-sm font-black text-neutral-800">{currentTrip.startStationName}</p></div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      <button onClick={handleCancel} className="px-6 py-5 bg-neutral-100 rounded-[24px] text-neutral-600 font-black text-sm">예약 취소</button>
                      <button onClick={handleOpenScanner} disabled={status === 'loading'} className="flex-1 py-5 bg-primary-500 rounded-[24px] text-white font-black text-lg shadow-lg">도착했습니다! 대여 시작</button>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsReportModalOpen(true)}
                        className="px-4 py-5 bg-red-50 text-red-500 rounded-[24px] font-black text-sm flex items-center gap-2 active:scale-95 transition-all"
                      >
                        <AlertTriangle size={16} />
                        고장 신고
                      </button>
                      <button 
                        onClick={handleTestRent} 
                        className="flex-1 py-5 bg-amber-50 border-2 border-dashed border-amber-200 rounded-[24px] text-amber-600 font-black text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        👑 [교수님 전용] 즉시 대여
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 pt-2">
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.3em]">Riding Time</p>
                    <h1 className="text-6xl font-black text-white tracking-tighter tabular-nums">{formatTime(rideTime)}</h1>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-2xl p-4 text-center"><Navigation size={16} className="text-blue-400 mx-auto mb-2" /><p className="text-[10px] font-bold text-neutral-500 mb-1">거리(km)</p><p className="text-lg font-black text-white">{estimatedDistance}</p></div>
                    <div className="bg-white/5 rounded-2xl p-4 text-center"><Flame size={16} className="text-orange-400 mx-auto mb-2" /><p className="text-[10px] font-bold text-neutral-500 mb-1">칼로리</p><p className="text-lg font-black text-white">{calories}</p></div>
                    <div className="bg-white/5 rounded-2xl p-4 text-center"><Clock size={16} className="text-primary-400 mx-auto mb-2" /><p className="text-[10px] font-bold text-neutral-500 mb-1">예상시간</p><p className="text-lg font-black text-white">{routeMetrics.estTime}m</p></div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleCancel} className="px-6 py-5 bg-white/10 rounded-[24px] text-white font-black text-sm">취소</button>
                    <button onClick={handleReturn} className="flex-1 py-5 bg-primary-500 rounded-[24px] text-white font-black text-lg shadow-lg">반납하기</button>
                  </div>
                  
                  <button 
                    onClick={() => setIsReportModalOpen(true)}
                    className="w-full py-4 bg-red-500/10 text-red-500 rounded-[20px] font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <AlertTriangle size={14} />
                    주행 중 자전거 고장 신고
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 6. QR 스캐너 모달 */}
      <AnimatePresence>
        {isScannerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[110] bg-black/90 flex flex-col items-center justify-center p-6 pointer-events-auto"
          >
            <div className="w-full max-w-sm bg-white rounded-[40px] overflow-hidden shadow-2xl relative">
              <button 
                onClick={() => setIsScannerOpen(false)}
                className="absolute top-6 right-6 z-20 p-2 bg-neutral-100 rounded-full text-neutral-800 active:scale-90 transition-transform"
              >
                <X size={20} />
              </button>
              
              <div className="p-10 text-center space-y-6">
                <div className="space-y-2">
                  <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-500 mx-auto mb-4">
                    <QrCode size={32} />
                  </div>
                  <h3 className="text-xl font-black text-neutral-900">QR 코드 스캔</h3>
                  <p className="text-xs text-neutral-500 font-bold leading-relaxed">
                    자전거에 부착된 QR 코드를<br />사각형 영역 안에 맞춰주세요.
                  </p>
                </div>
                
                <div id="reader" className="w-full aspect-square bg-neutral-100 rounded-[32px] overflow-hidden border-4 border-neutral-50 shadow-inner" />
                
                <button 
                  onClick={() => setIsScannerOpen(false)}
                  className="w-full py-4 text-sm font-black text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. 고장 신고 모달 */}
      <AnimatePresence>
        {isReportModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[120] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-end pointer-events-auto"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full bg-white rounded-t-[40px] p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-neutral-900">고장 신고하기</h3>
                <button onClick={() => setIsReportModalOpen(false)} className="p-2 bg-neutral-100 rounded-full"><X size={20} /></button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'tire', label: '타이어' },
                  { id: 'chain', label: '체인' },
                  { id: 'brake', label: '브레이크' },
                  { id: 'saddle', label: '안장' },
                  { id: 'terminal', label: '단말기' },
                  { id: 'other', label: '기타' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setReportType(item.id)}
                    className={`py-4 rounded-2xl font-black text-xs transition-all ${
                      reportType === item.id ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-neutral-50 text-neutral-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <textarea
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
                placeholder="상세한 고장 내용을 입력해 주세요 (선택)"
                className="w-full h-32 bg-neutral-50 rounded-2xl p-4 text-sm font-bold border-none outline-none resize-none placeholder:text-neutral-300"
              />

              <button
                onClick={handleReportSubmit}
                disabled={status === 'loading'}
                className="w-full py-5 bg-neutral-900 text-white rounded-[24px] font-black text-lg active:scale-95 transition-all"
              >
                신고 접수
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSummary && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[100] bg-white flex flex-col p-6 pt-16 overflow-y-auto">
            <div className="flex-1 flex flex-col items-center text-center space-y-10">
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 12 }} className="w-20 h-20 bg-green-50 rounded-[28px] flex items-center justify-center text-green-500"><CheckCircle2 size={40} /></motion.div>
              <div className="space-y-2"><h2 className="text-2xl font-black text-neutral-900 leading-tight">라이딩 완료!</h2><p className="text-neutral-500 font-bold text-sm">오늘도 지구를 시원하게 만들었네요.</p></div>
              <div className="w-full grid grid-cols-2 gap-3"><SummaryTile label="주행 시간" value={lastTripResult?.time || ''} /><SummaryTile label="이동 거리" value={lastTripResult?.distance || ''} /><SummaryTile label="탄소 절감" value={`${lastTripResult?.carbon}kg`} color="text-green-500" /><SummaryTile label="소비 칼로리" value={`${calories}kcal`} color="text-orange-500" /></div>
            </div>
            <button onClick={() => { setShowSummary(false); navigate('/home'); }} className="mt-6 w-full py-5 bg-neutral-900 rounded-[22px] text-white font-black text-base active:scale-95 transition-all shadow-lg">확인</button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-marker { width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; color: white; background: #2ecc71; transition: all 0.3s; }
        .custom-marker.start { background: #3498db; width: 36px; height: 36px; font-size: 12px; z-index: 50; }
        .custom-marker.dest { background: #e74c3c; width: 36px; height: 36px; font-size: 12px; z-index: 50; }
        .custom-marker.empty { background: #95a5a6; }
        .custom-marker.few { background: #e74c3c; }
        .custom-marker.moderate { background: #e67e22; }

        .marquee-text {
          display: inline-block;
          animation: scroll-left-right 10s linear infinite alternate;
          padding-right: 20px;
        }

        @keyframes scroll-left-right {
          0% { transform: translateX(0); }
          100% { transform: translateX(-40%); }
        }
      `}</style>
    </div>
  );
}

function SummaryTile({ label, value, color = "text-neutral-800" }: { label: string, value: string, color?: string }) {
  return (
    <div className="bg-neutral-50 rounded-[24px] p-5 text-center space-y-1">
      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{label}</p>
      <p className={`text-xl font-black ${color}`}>{value}</p>
    </div>
  );
}

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ChevronLeft } from 'lucide-react';

import { useTripStore } from '../stores/tripStore';
import { useStationMapStore } from '../stores/stationMapStore';
import { apiClient } from '../services/api/client';
import { loadKakaoMap, getStationLatLng, calculateDistance } from '../services/map/mapUtils';
import { vibrate } from '../lib/utils';
import type { Station } from '../stores/types';
import type { KakaoMapInstance, KakaoPolylineInstance, KakaoCustomOverlayInstance } from '../types/kakao';

// 하위 컴포넌트 임포트
import { TripMap } from '../components/trip/TripMap';
import { TripSearchBar } from '../components/trip/TripSearchBar';
import { TripStatusPanel } from '../components/trip/TripStatusPanel';
import { TripModals } from '../components/trip/TripModals';
import type { TripSummary } from '../components/trip/TripSummaryModal';

export function TripPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const kakaoMapRef = useRef<KakaoMapInstance | null>(null);
  const markersRef = useRef<KakaoMarkerInstance[]>([]);
  const overlaysRef = useRef<KakaoCustomOverlayInstance[]>([]);
  const routePolylineRef = useRef<KakaoPolylineInstance | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const lastQrErrorRef = useRef<number>(0);

  const kakaoAppKey = import.meta.env.VITE_KAKAO_MAP_APP_KEY as string | undefined;

  const { 
    status, currentTrip, reserveBike, startTrip, completeTrip, 
    cancelTrip, fetchCurrentTrip, reportIssue, startStation, 
    destStation, setStartStation, setDestStation 
  } = useTripStore();
  
  const { recommendations, searchResults, fetchRecommendations } = useStationMapStore();

  // ✅ 로컬 UI 상태
  const [mapReady, setMapReady] = useState(false);
  const [rideTime, setRideTime] = useState(0);
  const [reserveTimeLeft, setReserveTimeLeft] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [lastTripResult, setLastTripResult] = useState<TripSummary | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState('tire');
  const [reportDesc, setReportDesc] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // ✅ 초기 설정 및 데이터 로드
  useEffect(() => {
    const state = location.state as { startStation?: Station; destStation?: Station } | null;
    if (state?.startStation) setStartStation(state.startStation);
    if (state?.destStation) setDestStation(state.destStation);
    void fetchCurrentTrip();
  }, [location.state, setStartStation, setDestStation, fetchCurrentTrip]);

  // ✅ 주행 중 정보 복구
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

  // ✅ 타이머 관리 (주행/예약)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (currentTrip && (currentTrip.status === 'STARTED' || currentTrip.status === 'IN_PROGRESS') && currentTrip.startTime) {
      const startTime = new Date(currentTrip.startTime).getTime();
      interval = setInterval(() => setRideTime(Math.floor((Date.now() - startTime) / 1000)), 1000);
    }
    return () => clearInterval(interval);
  }, [currentTrip]);

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
          void fetchCurrentTrip().then(() => navigate('/home'));
        } else setReserveTimeLeft(diff);
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    }
    return () => clearInterval(interval);
  }, [currentTrip, fetchCurrentTrip, navigate]);

  // ✅ 핸들러 정의
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleZoomIn = () => {
    if (!kakaoMapRef.current) return;
    const level = kakaoMapRef.current.getLevel();
    if (level > 1) kakaoMapRef.current.setLevel(level - 1);
  };

  const handleZoomOut = () => {
    if (!kakaoMapRef.current) return;
    const level = kakaoMapRef.current.getLevel();
    if (level < 14) kakaoMapRef.current.setLevel(level + 1);
  };

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
    const message = isEarly ? '대여를 취소하시겠습니까?\n2분 이내 취소 시 주행 기록에 합산되지 않습니다.' : '이미 2분 이상 주행 중입니다. 정말 취소하시겠습니까?';
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
    } catch { /* error handled in store */ }
  };

  const handleQrScanSuccess = useCallback((decodedText: string) => {
    if (!decodedText.includes('SPB-')) {
      const now = Date.now();
      if (now - lastQrErrorRef.current > 3000) {
        toast.error('유효한 따릉이 QR 코드가 아닙니다.', { id: 'qr-error' });
        lastQrErrorRef.current = now;
        vibrate(50);
      }
      return;
    }
    setIsScannerOpen(false);
    vibrate([100, 50, 100]);
    toast.success('따릉이 QR 코드가 확인되었습니다!', { id: 'qr-success' });
    void handleUnlockBike();
  }, [handleUnlockBike]);

  useEffect(() => {
    if (isScannerOpen) {
      const timer = setTimeout(() => {
        const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 }, false);
        scanner.render(handleQrScanSuccess, () => {});
        scannerRef.current = scanner;
      }, 100);
      return () => clearTimeout(timer);
    } else if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
  }, [isScannerOpen, handleQrScanSuccess]);

  const handleSelectSearchResult = (station: Station) => {
    const pos = getStationLatLng(station);
    if (!pos || !kakaoMapRef.current) return;
    kakaoMapRef.current.panTo(new window.kakao!.maps.LatLng(pos.lat, pos.lng));
    if (!currentTrip) {
      if (!startStation || (startStation && destStation)) { setStartStation(station); setDestStation(null); }
      else setDestStation(station);
    } else setDestStation(station);
    setSearchKeyword('');
    setIsSearching(false);
    void fetchRecommendations(pos.lat, pos.lng, 2000);
  };

  // ✅ 경로 계산 (useMemo)
  const routeMetrics = useMemo(() => {
    if (!startStation || !destStation) return { distance: 0, calories: 0, estTime: 0 };
    const p1 = getStationLatLng(startStation);
    const p2 = getStationLatLng(destStation);
    if (!p1 || !p2) return { distance: 0, calories: 0, estTime: 0 };
    const distance = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    return { 
      distance: parseFloat(distance.toFixed(1)), 
      calories: Math.floor(distance * 35), 
      estTime: Math.ceil((distance / 15) * 60) 
    };
  }, [startStation, destStation]);

  // ✅ 지도 로직
  const drawRoute = useCallback(async (start: Station, end: Station) => {
    if (!kakaoMapRef.current || !window.kakao?.maps) return;
    try {
      const s = getStationLatLng(start);
      const e = getStationLatLng(end);
      if (!s || !e) return;
      const { data } = await apiClient.post('/routes/pedestrian', { startX: s.lng, startY: s.lat, endX: e.lng, endY: e.lat });
      const path = (data.data.coordinates as [number, number][]).map(([lng, lat]) => new window.kakao!.maps.LatLng(lat, lng));
      if (routePolylineRef.current) routePolylineRef.current.setMap(null);
      const polyline = new window.kakao!.maps.Polyline({ 
        path, 
        strokeWeight: 6, 
        strokeColor: '#22c55e', 
        strokeOpacity: 0.8 
      });
      polyline.setMap(kakaoMapRef.current);
      routePolylineRef.current = polyline;
      const bounds = new window.kakao!.maps.LatLngBounds();
      path.forEach(p => bounds.extend(p));
      kakaoMapRef.current.setBounds(bounds);
    } catch (err) { console.error('Route error:', err); }
  }, []);

  useEffect(() => {
    if (startStation && destStation && mapReady) void drawRoute(startStation, destStation);
    else if (!destStation && routePolylineRef.current) { routePolylineRef.current.setMap(null); routePolylineRef.current = null; }
  }, [startStation, destStation, mapReady, drawRoute]);

  const initMap = useCallback((el: HTMLDivElement) => {
    if (!kakaoAppKey || kakaoMapRef.current) return;
    loadKakaoMap(kakaoAppKey).then(() => {
      const lat = startStation?.location?.coordinates[1] ?? 37.5665;
      const lng = startStation?.location?.coordinates[0] ?? 126.978;
      const map = new window.kakao!.maps.Map(el, { center: new window.kakao!.maps.LatLng(lat, lng), level: 4 });
      kakaoMapRef.current = map;
      window.kakao!.maps.event.addListener(map, 'dragend', () => {
        const c = map.getCenter();
        void fetchRecommendations(c.getLat(), c.getLng(), 2000);
      });
      setMapReady(true);
      void fetchRecommendations(lat, lng, 2000);
    }).catch(console.error);
  }, [kakaoAppKey, startStation, fetchRecommendations]);

  useEffect(() => {
    if (!mapReady || !kakaoMapRef.current || !window.kakao?.maps) return;
    overlaysRef.current.forEach(o => o.setMap(null));
    overlaysRef.current = [];

    const isRouteActive = (startStation && destStation) || currentTrip;
    recommendations.forEach(station => {
      const pos = getStationLatLng(station);
      if (!pos) return;
      const isStart = station.stationId === (startStation?.stationId || currentTrip?.startStationId);
      const isDest = station.stationId === (destStation?.stationId || currentTrip?.endStationId);
      if (isRouteActive && !isStart && !isDest) return;

      const bikes = Number(station.availableBikes || 0);
      const docks = Number(station.totalDocks || 0);
      const rate = docks > 0 ? (bikes / docks) * 100 : 0;
      const statusClass = bikes === 0 ? 'empty' : bikes === 1 ? 'few' : (bikes < 5 && rate <= 25) ? 'moderate' : '';

      const content = document.createElement('div');
      content.className = `custom-marker ${statusClass}`;
      content.innerHTML = `<span>${bikes}</span>`;
      
      // ✅ 오버레이 자체에 클릭 이벤트 추가
      content.style.cursor = 'pointer';
      content.onclick = () => {
        if (!currentTrip) {
          if (!startStation || (startStation && destStation)) { setStartStation(station); setDestStation(null); }
          else setDestStation(station);
        } else setDestStation(station);
      };

      overlaysRef.current.push(new window.kakao!.maps.CustomOverlay({ 
        position: new window.kakao!.maps.LatLng(pos.lat, pos.lng), 
        content, 
        map: kakaoMapRef.current, 
        zIndex: isStart || isDest ? 50 : 10 
      }));
    });
  }, [mapReady, recommendations, startStation, destStation, currentTrip, setStartStation, setDestStation]);

  return (
    <div className="relative w-full h-full bg-neutral-100 overflow-hidden">
      <TripMap ref={mapRef} onMapInit={initMap} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
      
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

      {(!currentTrip || currentTrip.status === 'RESERVED') && (
        <TripSearchBar 
          containerRef={searchContainerRef}
          keyword={searchKeyword}
          onKeywordChange={setSearchKeyword}
          isSearching={isSearching}
          onSearchFocus={() => setIsSearching(true)}
          onSearchClose={() => { setSearchKeyword(''); setIsSearching(false); }}
          searchResults={searchResults}
          onSelectResult={handleSelectSearchResult}
        />
      )}

      <TripStatusPanel 
        currentTrip={currentTrip}
        startStation={startStation}
        destStation={destStation}
        isPanelCollapsed={isPanelCollapsed}
        onCollapse={() => setIsPanelCollapsed(true)}
        onClearStart={() => setStartStation(null)}
        onClearDest={() => setDestStation(null)}
        onStartRental={handleStartRental}
        onCancel={handleCancel}
        onReturn={handleReturn}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenReport={() => setIsReportModalOpen(true)}
        onTestRent={() => void handleUnlockBike()}
        status={status}
        reserveTimeLeft={reserveTimeLeft}
        rideTime={rideTime}
        estimatedDistance={routeMetrics.distance}
        calories={routeMetrics.calories}
        estTime={routeMetrics.estTime}
        formatTime={formatTime}
      />

      <TripModals 
        isScannerOpen={isScannerOpen}
        onCloseScanner={() => setIsScannerOpen(false)}
        isReportModalOpen={isReportModalOpen}
        onCloseReport={() => setIsReportModalOpen(false)}
        reportType={reportType}
        onReportTypeChange={setReportType}
        reportDesc={reportDesc}
        onReportDescChange={setReportDesc}
        onReportSubmit={handleReportSubmit}
        showSummary={showSummary}
        onCloseSummary={() => { setShowSummary(false); navigate('/home'); }}
        lastTripResult={lastTripResult}
        calories={routeMetrics.calories}
        status={status}
      />

      <style>{`
        .custom-marker { width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; color: white; background: #2ecc71; transition: all 0.3s; }
        .custom-marker.empty { background: #95a5a6; }
        .custom-marker.few { background: #e74c3c; }
        .custom-marker.moderate { background: #e67e22; }
        .marquee-text { display: inline-block; animation: scroll-left-right 10s linear infinite alternate; padding-right: 20px; }
        @keyframes scroll-left-right { 0% { transform: translateX(0); } 100% { transform: translateX(-40%); } }
      `}</style>
    </div>
  );
}

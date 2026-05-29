import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, X, Navigation, Plus, Minus } from 'lucide-react';
import { loadKakaoMap } from '../services/map/mapUtils';
import { useStations } from '../hooks/useStations';
import { useUIStore } from '../stores/uiStore';
import type { KakaoMapInstance } from '../types/kakao';

export function MapPage() {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<KakaoMapInstance | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  
  const { data: stations, isLoading } = useStations();
  const { setSelectedStationId, setBottomSheetOpen } = useUIStore();

  const kakaoAppKey = import.meta.env.VITE_KAKAO_MAP_APP_KEY;

  // 1. 카카오맵 스크립트 로드 및 지도 초기화
  useEffect(() => {
    if (!kakaoAppKey) {
      console.error('VITE_KAKAO_MAP_APP_KEY is missing');
      return;
    }

    loadKakaoMap(kakaoAppKey).then(() => {
      if (!mapContainerRef.current || !window.kakao) return;

      const center = new window.kakao.maps.LatLng(37.5665, 126.9780); // 기본 서울 시청
      const options = {
        center,
        level: 3,
      };

      const map = new window.kakao.maps.Map(mapContainerRef.current, options);
      kakaoMapRef.current = map;
      setIsMapLoaded(true);

      // GPS 위치 가져오기
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            const userPos = new window.kakao!.maps.LatLng(userLat, userLng);
            
            map.setCenter(userPos);
            
            // 내 위치 마커 표시
            new window.kakao!.maps.Marker({
              position: userPos,
              map: map,
              image: new window.kakao!.maps.MarkerImage(
                'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png',
                new window.kakao!.maps.Size(31, 35)
              )
            });
          },
          (err) => console.warn('Geolocation failed:', err),
          { enableHighAccuracy: true }
        );
      }
    }).catch(err => {
      console.error('Failed to load Kakao Map:', err);
    });
  }, [kakaoAppKey]);

  // 2. 정류소 데이터가 로드되면 마커 표시 (최적화 버전)
  const markerMapRef = useRef<Map<string, { marker: { setMap: (map: KakaoMapInstance | null) => void }, content: HTMLDivElement }>>(new Map());

  useEffect(() => {
    if (!isMapLoaded || !kakaoMapRef.current || !stations || !window.kakao) return;

    const map = kakaoMapRef.current;
    const currentStationIds = new Set(stations.map(s => s.id));

    // 1. 사라진 정류소 마커 제거
    markerMapRef.current.forEach((value, id) => {
      if (!currentStationIds.has(id)) {
        value.marker.setMap(null);
        markerMapRef.current.delete(id);
      }
    });

    // 2. 신규 생성 및 기존 마커 업데이트
    stations.forEach((station) => {
      const existing = markerMapRef.current.get(station.id);
      const availableBikes = Number(station.availableBikes || 0);
      const totalDocks = Number(station.totalDocks || 0);
      const usageRate = totalDocks > 0 ? (availableBikes / totalDocks) * 100 : 0;

      // 색상 결정 로직 (회색, 빨간색, 주황색, 초록색)
      let bgColor = '#95a5a6'; // 없음 (회색 - 0대)
      if (availableBikes >= 5 || usageRate > 25) bgColor = '#2ecc71'; // 여유 (초록)
      else if (availableBikes >= 2 || usageRate > 10) bgColor = '#e67e22'; // 보통 (주황)
      else if (availableBikes >= 1) bgColor = '#e74c3c'; // 부족 (빨강)

      if (existing) {
        // 기존 마커가 있으면 숫자와 배경색 업데이트
        if (existing.content.innerHTML !== `${availableBikes}`) {
          existing.content.innerHTML = `${availableBikes}`;
        }
        if (existing.content.style.backgroundColor !== bgColor) {
          existing.content.style.backgroundColor = bgColor;
        }
      } else {
        // 새 마커 생성
        const content = document.createElement('div');
        content.className = 'station-marker';
        content.style.width = '24px';
        content.style.height = '24px';
        content.style.borderRadius = '50%';
        content.style.border = '3px solid white';
        content.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        content.style.display = 'flex';
        content.style.alignItems = 'center';
        content.style.justifyContent = 'center';
        content.style.fontSize = '8px';
        content.style.fontWeight = 'bold';
        content.style.color = 'white';
        content.style.backgroundColor = bgColor;
        content.innerHTML = `${availableBikes}`;
        content.style.cursor = 'pointer';

        const markerPosition = new window.kakao!.maps.LatLng(station.lat, station.lng);
        
        content.onclick = () => {
          setSelectedStationId(station.id);
          setBottomSheetOpen(true);
          map.panTo(markerPosition);
        };

        const overlay = new window.kakao!.maps.CustomOverlay({
          position: markerPosition,
          content: content,
          map: map,
          zIndex: 10
        });

        markerMapRef.current.set(station.id, { marker: overlay, content });
      }
    });
  }, [isMapLoaded, stations, setSelectedStationId, setBottomSheetOpen]);

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

  return (
    <div className="relative w-full h-full">
      {/* 🧭 플로팅 뒤로 가기 버튼 */}
      <button 
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 z-[100] w-12 h-12 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-xl border border-white/20 active:scale-95 transition-all"
      >
        <ChevronLeft size={24} className="text-neutral-800" />
      </button>

      {/* 🔍 줌 컨트롤 버튼 */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-[100] flex flex-col bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 overflow-hidden divide-y divide-gray-100">
        <button 
          onClick={handleZoomIn}
          className="w-12 h-12 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors"
          aria-label="Zoom In"
        >
          <Plus size={24} className="text-neutral-800" />
        </button>
        <button 
          onClick={handleZoomOut}
          className="w-12 h-12 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors"
          aria-label="Zoom Out"
        >
          <Minus size={24} className="text-neutral-800" />
        </button>
      </div>

      {/* 지도 컨테이너 */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* 로딩 인디케이터 (지도 스켈레톤) */}
      {(isLoading || !isMapLoaded) && (
        <div className="absolute inset-0 bg-gray-100 z-50 flex flex-col items-center justify-center">
          {/* 지도 뼈대 느낌의 배경 */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
             <div className="w-full h-full bg-[radial-gradient(#e5e7eb_2px,transparent_2px)] [background-size:24px_24px]" />
          </div>
          
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-primary-500 opacity-50" />
            </div>
            <p className="text-sm font-black text-neutral-400">지도를 그리는 중...</p>
          </div>
        </div>
      )}

      {/* 바텀 시트 */}
      <StationBottomSheet />

      <style>{`
        .station-marker { transition: transform 0.2s; cursor: pointer; }
        .station-marker:hover { transform: scale(1.1); }
      `}</style>
    </div>
  );
}

function StationBottomSheet() {
  const navigate = useNavigate();
  const { 
    selectedStationId, 
    isBottomSheetOpen, 
    closeBottomSheet, 
    favoriteStations, 
    toggleFavoriteStation 
  } = useUIStore();
  const { data: stations } = useStations();

  const selectedStation = stations?.find(s => s.id === selectedStationId);
  const isFavorite = selectedStation ? favoriteStations.includes(selectedStation.id) : false;

  if (!isBottomSheetOpen || !selectedStation) return null;

  const handleStartRental = () => {
    closeBottomSheet();
    navigate('/trip', { 
      state: { 
        startStation: {
          stationId: selectedStation.id,
          name: selectedStation.name,
          location: {
            type: 'Point',
            coordinates: [selectedStation.lng, selectedStation.lat]
          },
          totalDocks: selectedStation.totalDocks,
          availableBikes: selectedStation.availableBikes
        } 
      } 
    });
  };

  const noBikes = selectedStation.availableBikes === 0;

  return (
    <div className="absolute bottom-4 left-4 right-4 bg-white rounded-2xl shadow-2xl p-6 z-50 animate-in slide-in-from-bottom-10 duration-300">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">{selectedStation.name}</h2>
          <p className="text-sm text-neutral-500">{selectedStation.address || '상세 주소 정보 없음'}</p>
        </div>
        <button 
          onClick={closeBottomSheet}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} className="text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-primary-50 p-4 rounded-xl flex flex-col justify-center">
          <p className="text-xs text-primary-600 font-semibold mb-1">대여 가능</p>
          <p className="text-2xl font-bold text-primary-700">{selectedStation.availableBikes}대</p>
        </div>
        
        <button 
          onClick={() => toggleFavoriteStation(selectedStation.id)}
          className={`p-4 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
            isFavorite ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-gray-50 text-gray-400 border border-gray-100'
          }`}
        >
          <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
          <span className="text-xs font-bold">{isFavorite ? '관심 해제' : '관심 등록'}</span>
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <button 
          disabled={noBikes}
          onClick={handleStartRental}
          className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-neutral-200 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
        >
          <Navigation size={20} />
          이 정류소에서 출발하기
        </button>

        {noBikes && (
          <p className="text-center text-xs text-red-500 font-bold">현재 대여 가능한 자전거가 없습니다.</p>
        )}
      </div>
    </div>
  );
}

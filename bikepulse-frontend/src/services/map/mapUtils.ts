import type { Station } from '../../stores/types';

export function getStationLatLng(station: Station) {
  const coords = station.location?.coordinates;
  if (!coords || coords.length !== 2) return null;
  return { lat: coords[1], lng: coords[0] };
}

/**
 * 하버사인 거리 계산 (km)
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // 지구 반지름 (km)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function loadKakaoMap(appKey: string) {
  return new Promise<void>((resolve, reject) => {
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => resolve());
      return;
    }

    const scriptId = 'kakao-map-script-shared';
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      window.kakao?.maps?.load(() => resolve());
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`;
    script.async = true;

    script.onload = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => resolve());
      } else {
        reject(new Error('카카오 맵 객체를 찾을 수 없습니다.'));
      }
    };
    script.onerror = () => reject(new Error('카카오 맵 스크립트 로딩 실패'));
    document.head.appendChild(script);
  });
}

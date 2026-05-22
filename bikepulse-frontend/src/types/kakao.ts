export interface KakaoLatLng {
  getLat: () => number;
  getLng: () => number;
}

export interface KakaoLatLngBounds {
  extend: (latLng: KakaoLatLng) => void;
}

export interface KakaoMapInstance {
  getCenter: () => KakaoLatLng;
  setCenter: (latLng: KakaoLatLng) => void;
  getLevel: () => number;
  setLevel: (level: number) => void;
  panTo: (latLng: KakaoLatLng) => void;
  setBounds: (bounds: KakaoLatLngBounds) => void;
}

export interface KakaoMarkerImageInstance {
  readonly __brand: 'KakaoMarkerImage';
}

export interface KakaoMarkerInstance {
  setMap: (map: KakaoMapInstance | null) => void;
  setZIndex: (value: number) => void;
  setImage: (image: KakaoMarkerImageInstance) => void;
}

export interface KakaoPolylineInstance {
  setMap: (map: KakaoMapInstance | null) => void;
}

export interface KakaoCustomOverlayInstance {
  setMap: (map: KakaoMapInstance | null) => void;
  setPosition: (latLng: KakaoLatLng) => void;
  getPosition: () => KakaoLatLng;
}

export interface KakaoSizeInstance {
  readonly __brand: 'KakaoSize';
}

declare global {
  interface Window {
    kakao?: {
      maps: {
        load: (callback: () => void) => void;
        LatLng: new (lat: number, lng: number) => KakaoLatLng;
        LatLngBounds: new () => KakaoLatLngBounds;
        Map: new (container: HTMLElement, options: Record<string, unknown>) => KakaoMapInstance;
        Marker: new (options: Record<string, unknown>) => KakaoMarkerInstance;
        Polyline: new (options: Record<string, unknown>) => KakaoPolylineInstance;
        MarkerImage: new (src: string, size: KakaoSizeInstance, options?: Record<string, unknown>) => KakaoMarkerImageInstance;
        Size: new (width: number, height: number) => KakaoSizeInstance;
        CustomOverlay: new (options: Record<string, unknown>) => KakaoCustomOverlayInstance;
        event: {
          addListener: (target: unknown, type: string, handler: () => void) => void;
        };
      };
    };
  }
}

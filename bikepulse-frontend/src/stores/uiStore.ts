import { create } from 'zustand';

interface UIState {
  selectedStationId: string | null;
  isBottomSheetOpen: boolean;
  favoriteStations: string[]; // ✅ 관심 정류소 ID 리스트
  setSelectedStationId: (id: string | null) => void;
  setBottomSheetOpen: (open: boolean) => void;
  closeBottomSheet: () => void;
  toggleFavoriteStation: (id: string) => void; // ✅ 관심 정류소 토글 기능
}

export const useUIStore = create<UIState>((set) => ({
  selectedStationId: null,
  isBottomSheetOpen: false,
  favoriteStations: JSON.parse(localStorage.getItem('favorite_stations') || '[]'),
  setSelectedStationId: (id) => set({ selectedStationId: id }),
  setBottomSheetOpen: (open) => set({ isBottomSheetOpen: open }),
  closeBottomSheet: () => set({ selectedStationId: null, isBottomSheetOpen: false }),
  toggleFavoriteStation: (id) => set((state) => {
    const isFavorite = state.favoriteStations.includes(id);
    const updated = isFavorite 
      ? state.favoriteStations.filter(favId => favId !== id)
      : [...state.favoriteStations, id];
    
    localStorage.setItem('favorite_stations', JSON.stringify(updated));
    return { favoriteStations: updated };
  }),
}));

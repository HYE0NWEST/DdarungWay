import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, Trash2, MapPin } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { useStations } from '../hooks/useStations';
import { Card, CardContent } from '../components/ui/card';

export function ProfileFavoritesPage() {
  const navigate = useNavigate();
  const { favoriteStations, toggleFavoriteStation } = useUIStore();
  const { data: stations } = useStations();

  const favoriteList = stations?.filter(s => favoriteStations.includes(s.id)) || [];

  return (
    <div className="p-4 space-y-6 pb-24 min-h-full bg-gray-50/30">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft size={24} className="text-neutral-800" />
        </button>
        <h1 className="text-xl font-black text-neutral-900">관심 정류소</h1>
      </div>

      {favoriteList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-300">
            <Heart size={40} />
          </div>
          <div className="space-y-1">
            <p className="text-neutral-500 font-bold">등록된 관심 정류소가 없습니다.</p>
            <p className="text-neutral-400 text-xs font-medium">지도에서 하트 아이콘을 눌러 등록해보세요!</p>
          </div>
          <button 
            onClick={() => navigate('/map')}
            className="px-6 py-3 bg-primary-500 text-white font-black rounded-xl text-sm shadow-lg shadow-primary-500/20 active:scale-95 transition-all"
          >
            지도에서 정류소 찾기
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {favoriteList.map((station) => (
            <Card key={station.id} className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardContent className="p-4 flex items-center justify-between">
                <div 
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => {
                    useUIStore.getState().setSelectedStationId(station.id);
                    useUIStore.getState().setBottomSheetOpen(true);
                    navigate('/map');
                  }}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-500 flex-shrink-0">
                    <MapPin size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-neutral-800 text-sm truncate">{station.name}</p>
                    <p className="text-[10px] text-neutral-400 font-bold truncate">{station.address || '상세 주소 없음'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-primary-500 bg-primary-50 px-1.5 py-0.5 rounded">
                        대여 가능 {station.availableBikes}대
                      </span>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavoriteStation(station.id);
                  }}
                  className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </CardContent>
            </Card>
          ))}
          <p className="text-[10px] text-center text-neutral-400 font-bold pt-4">
            정류소를 클릭하면 지도로 바로 이동합니다.
          </p>
        </div>
      )}
    </div>
  );
}

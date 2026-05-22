import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { useTripStore } from '../stores/tripStore';

export function TripHistoryPage() {
  const { history } = useTripStore();
  const navigate = useNavigate();

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronRight className="rotate-180 text-gray-600" size={20} />
        </button>
        <h1 className="text-xl font-black">이용 히스토리</h1>
      </div>
      
      {history.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <p className="text-gray-400 font-bold">이용 내역이 없습니다.</p>
        </div>
      ) : (
        history.map((trip, i) => (
          <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-neutral-800">
                  {trip.startStationName} → {
                    trip.status === 'CANCELLED' ? (
                      <span className="text-gray-400">취소됨</span>
                    ) : (
                      trip.endStationName || (trip.status === 'COMPLETED' ? '알 수 없음' : '주행 중')
                    )
                  }
                </p>
                <p className="text-[10px] text-gray-400 font-bold mt-1">
                  {trip.startTime ? new Date(trip.startTime).toLocaleString() : '-'}
                </p>
              </div>
              <div className="text-right">
                {trip.status === 'CANCELLED' ? (
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-black px-2 py-0.5 bg-red-50 text-red-500 rounded-full border border-red-100">CANCELED</span>
                    <p className="text-[9px] text-gray-300 font-bold">{trip.cancellationReason || '단순 변심'}</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-black text-primary-500">+{trip.distance || 0}km</p>
                    <p className="text-[10px] font-bold text-gray-400">{trip.duration || 0}분 소요</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

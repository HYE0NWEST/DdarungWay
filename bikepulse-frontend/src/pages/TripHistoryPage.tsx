import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Clock, Calendar } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { useTripStore } from '../stores/tripStore';

export function TripHistoryPage() {
  const { history } = useTripStore();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <div className="px-6 pt-10 pb-6 bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-neutral-800 active:scale-90 transition-all"
          >
            <ChevronRight className="rotate-180" size={20} />
          </button>
          <h1 className="text-xl font-black text-neutral-900">이용 히스토리</h1>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-[32px] border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-4">
              <Clock size={32} />
            </div>
            <p className="text-neutral-400 font-bold">이용 내역이 없습니다.</p>
          </div>
        ) : (
          history.map((trip, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border-none shadow-sm hover:shadow-md transition-all rounded-[28px] overflow-hidden bg-white active:scale-[0.98]">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary-500" />
                      <p className="text-sm font-black text-neutral-800">
                        {trip.startStationName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-200" />
                      <p className="text-sm font-black text-neutral-800">
                        {trip.status === 'CANCELLED' ? (
                          <span className="text-red-400">취소됨</span>
                        ) : (
                          trip.endStationName || (trip.status === 'COMPLETED' ? '알 수 없음' : '주행 중...')
                        )}
                      </p>
                    </div>
                    <p className="text-[10px] text-neutral-300 font-bold mt-2 flex items-center gap-1">
                      <Calendar size={10} />
                      {trip.startTime ? new Date(trip.startTime).toLocaleString() : '-'}
                    </p>
                  </div>
                  <div className="text-right">
                    {trip.status === 'CANCELLED' ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[9px] font-black px-2 py-1 bg-red-50 text-red-500 rounded-lg border border-red-100 uppercase tracking-tighter">Canceled</span>
                        <p className="text-[9px] text-neutral-300 font-bold">{trip.cancellationReason || '단순 변심'}</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-lg font-black text-primary-500 flex items-center justify-end gap-1">
                          <span className="text-[10px] text-neutral-300 tracking-tighter uppercase">Dist</span>
                          {trip.distance?.toFixed(1) || 0}km
                        </p>
                        <p className="text-[10px] font-black text-neutral-400 bg-gray-50 px-2 py-1 rounded-lg inline-block">
                          {trip.duration || 0}분 소요
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

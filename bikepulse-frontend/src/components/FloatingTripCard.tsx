import { useTripStore } from '../stores/tripStore';
import { Bike, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export function FloatingTripCard() {
  const navigate = useNavigate();
  const { currentTrip, status } = useTripStore();
  const [rideTime, setRideTime] = useState(0);

  useEffect(() => {
    let interval: number;
    if (currentTrip && currentTrip.startTime) {
      const startTime = new Date(currentTrip.startTime).getTime();
      interval = window.setInterval(() => {
        setRideTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentTrip]);

  if (!currentTrip) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReturnClick = () => {
    toast('반납을 위해 이용 페이지로 이동합니다. 정류소를 선택해주세요.');
    navigate('/trip');
  };

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-48px)] max-w-[340px] animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-neutral-900/95 backdrop-blur-md text-white rounded-[24px] shadow-2xl p-4 border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary-500 p-2 rounded-xl shadow-lg shadow-primary-500/20">
              <Bike size={18} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse" />
                <p className="text-[9px] text-gray-400 font-black uppercase tracking-wider">Riding</p>
              </div>
              <p className="text-base font-black font-mono tracking-tight">{formatTime(rideTime)}</p>
            </div>
          </div>
          <button 
            onClick={() => {
               toast('주행 상세 정보를 불러옵니다.');
               navigate('/trip');
            }}
            className="text-[10px] font-black bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-all active:scale-95 text-gray-300"
          >
            상세보기
          </button>
        </div>

        <div className="flex items-center gap-2 py-2 px-3 bg-white/5 rounded-2xl mb-3 border border-white/5">
          <div className="flex-1 min-w-0">
            <p className="text-[8px] text-gray-500 font-black uppercase mb-0.5">FROM</p>
            <p className="text-[11px] font-bold truncate">{currentTrip.startStationName}</p>
          </div>
          <div className="flex-shrink-0 flex items-center justify-center">
            <ArrowRight size={12} className="text-gray-600" />
          </div>
          <div className="flex-1 text-right min-w-0">
            <p className="text-[8px] text-gray-500 font-black uppercase mb-0.5">TO</p>
            <p className="text-[11px] font-bold truncate text-primary-400">정류소 선택</p>
          </div>
        </div>

        <button 
          onClick={handleReturnClick}
          disabled={status === 'loading'}
          className="w-full bg-white text-neutral-900 font-black py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-all active:scale-[0.97] shadow-lg text-sm"
        >
          <CheckCircle2 size={16} />
          {status === 'loading' ? '처리 중...' : '반납하기'}
        </button>
      </div>
    </div>
  );
}

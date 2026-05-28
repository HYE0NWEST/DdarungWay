import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Bike, 
  ChevronRight, 
  AlertCircle, 
  AlertTriangle, 
  Navigation, 
  Flame, 
  Clock 
} from 'lucide-react';
import type { Station, Trip } from '../../stores/types';

interface TripStatusPanelProps {
  currentTrip: Trip | null;
  startStation: Station | null;
  destStation: Station | null;
  isPanelCollapsed: boolean;
  onCollapse: () => void;
  onClearStart: () => void;
  onClearDest: () => void;
  onStartRental: () => void;
  onCancel: () => void;
  onReturn: () => void;
  onOpenScanner: () => void;
  onOpenReport: () => void;
  onTestRent: () => void;
  status: 'idle' | 'loading' | 'success' | 'error';
  reserveTimeLeft: number;
  rideTime: number;
  estimatedDistance: number;
  calories: number;
  estTime: number;
  formatTime: (sec: number) => string;
}

export const TripStatusPanel = ({
  currentTrip,
  startStation,
  destStation,
  isPanelCollapsed,
  onCollapse,
  onClearStart,
  onClearDest,
  onStartRental,
  onCancel,
  onReturn,
  onOpenScanner,
  onOpenReport,
  onTestRent,
  status,
  reserveTimeLeft,
  rideTime,
  estimatedDistance,
  calories,
  estTime,
  formatTime
}: TripStatusPanelProps) => {
  return (
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
                        onClick={(e) => { e.stopPropagation(); onClearStart(); }} 
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
                        onClick={(e) => { e.stopPropagation(); onClearDest(); }} 
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
                <button onClick={onStartRental} disabled={status === 'loading'} className="w-full py-6 bg-neutral-900 rounded-[24px] text-white font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                  <Bike size={24} /> {status === 'loading' ? '준비 중...' : '자전거 예약 및 경로 시작'}
                </button>
              ) : (
                <div className="py-6 px-4 bg-neutral-50 rounded-[24px] flex items-center gap-3 border border-neutral-100">
                  <AlertCircle size={20} className="text-neutral-400" />
                  <p className="text-sm font-bold text-neutral-500">지도에서 <strong>{startStation ? '목적지' : '출발지'}</strong>를 클릭해주세요.</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : isPanelCollapsed ? null : (
          <motion.div key={currentTrip.status} initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className={`rounded-[40px] p-8 shadow-2xl border pointer-events-auto relative ${currentTrip.status === 'RESERVED' ? 'bg-white/95 border-white/40' : 'bg-neutral-900 border-white/10 text-white'}`}>
            {/* 🔼 개선된 패널 핸들 */}
            <div className="absolute top-0 left-0 right-0 h-8 flex items-center justify-center cursor-pointer" onClick={onCollapse}>
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
                    <button onClick={onCancel} className="px-6 py-5 bg-neutral-100 rounded-[24px] text-neutral-600 font-black text-sm">예약 취소</button>
                    <button onClick={onOpenScanner} disabled={status === 'loading'} className="flex-1 py-5 bg-primary-500 rounded-[24px] text-white font-black text-lg shadow-lg">도착했습니다! 대여 시작</button>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={onOpenReport}
                      className="px-4 py-5 bg-red-50 text-red-500 rounded-[24px] font-black text-sm flex items-center gap-2 active:scale-95 transition-all"
                    >
                      <AlertTriangle size={16} />
                      고장 신고
                    </button>
                    <button 
                      onClick={onTestRent} 
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
                  <div className="bg-white/5 rounded-2xl p-4 text-center"><Clock size={16} className="text-primary-400 mx-auto mb-2" /><p className="text-[10px] font-bold text-neutral-500 mb-1">예상시간</p><p className="text-lg font-black text-white">{estTime}m</p></div>
                </div>
                <div className="flex gap-3">
                  <button onClick={onCancel} className="px-6 py-5 bg-white/10 rounded-[24px] text-white font-black text-sm">취소</button>
                  <button onClick={onReturn} className="flex-1 py-5 bg-primary-500 rounded-[24px] text-white font-black text-lg shadow-lg">반납하기</button>
                </div>
                
                <button 
                  onClick={onOpenReport}
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
  );
};

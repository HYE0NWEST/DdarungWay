import { motion, AnimatePresence } from 'framer-motion';
import { X, QrCode, CheckCircle2 } from 'lucide-react';
import type { TripSummary } from './TripSummaryModal';

interface TripModalsProps {
  isScannerOpen: boolean;
  onCloseScanner: () => void;
  isReportModalOpen: boolean;
  onCloseReport: () => void;
  reportType: string;
  onReportTypeChange: (type: string) => void;
  reportDesc: string;
  onReportDescChange: (desc: string) => void;
  onReportSubmit: () => void;
  showSummary: boolean;
  onCloseSummary: () => void;
  lastTripResult: TripSummary | null;
  calories: number;
  status: 'idle' | 'loading' | 'success' | 'error';
}

export const TripModals = ({
  isScannerOpen,
  onCloseScanner,
  isReportModalOpen,
  onCloseReport,
  reportType,
  onReportTypeChange,
  reportDesc,
  onReportDescChange,
  onReportSubmit,
  showSummary,
  onCloseSummary,
  lastTripResult,
  calories,
  status
}: TripModalsProps) => {
  return (
    <>
      {/* QR 스캐너 모달 */}
      <AnimatePresence>
        {isScannerOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[110] bg-black/90 flex flex-col items-center justify-center p-6 pointer-events-auto">
            <div className="w-full max-w-sm bg-white rounded-[40px] overflow-hidden shadow-2xl relative">
              <button onClick={onCloseScanner} className="absolute top-6 right-6 z-20 p-2 bg-neutral-100 rounded-full text-neutral-800 active:scale-90 transition-transform">
                <X size={20} />
              </button>
              <div className="p-10 text-center space-y-6">
                <div className="space-y-2">
                  <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-500 mx-auto mb-4">
                    <QrCode size={32} />
                  </div>
                  <h3 className="text-xl font-black text-neutral-900">QR 코드 스캔</h3>
                  <p className="text-xs text-neutral-500 font-bold leading-relaxed">자전거에 부착된 QR 코드를<br />사각형 영역 안에 맞춰주세요.</p>
                </div>
                <div id="reader" className="w-full aspect-square bg-neutral-100 rounded-[32px] overflow-hidden border-4 border-neutral-50 shadow-inner" />
                <button onClick={onCloseScanner} className="w-full py-4 text-sm font-black text-neutral-400 hover:text-neutral-600 transition-colors">닫기</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 고장 신고 모달 */}
      <AnimatePresence>
        {isReportModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[120] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-end pointer-events-auto">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="w-full bg-white rounded-t-[40px] p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-neutral-900">고장 신고하기</h3>
                <button onClick={onCloseReport} className="p-2 bg-neutral-100 rounded-full"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['tire', 'chain', 'brake', 'saddle', 'terminal', 'other'].map((id) => {
                  const labels: Record<string, string> = { tire: '타이어', chain: '체인', brake: '브레이크', saddle: '안장', terminal: '단말기', other: '기타' };
                  return (
                    <button key={id} onClick={() => onReportTypeChange(id)} className={`py-4 rounded-2xl font-black text-xs transition-all ${reportType === id ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-neutral-50 text-neutral-400'}`}>
                      {labels[id]}
                    </button>
                  );
                })}
              </div>
              <textarea value={reportDesc} onChange={(e) => onReportDescChange(e.target.value)} placeholder="상세한 고장 내용을 입력해 주세요 (선택)" className="w-full h-32 bg-neutral-50 rounded-2xl p-4 text-sm font-bold border-none outline-none resize-none placeholder:text-neutral-300" />
              <button onClick={onReportSubmit} disabled={status === 'loading'} className="w-full py-5 bg-neutral-900 text-white rounded-[24px] font-black text-lg active:scale-95 transition-all">신고 접수</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 주행 요약 모달 */}
      <AnimatePresence>
        {showSummary && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[100] bg-white flex flex-col p-6 pt-16 overflow-y-auto pointer-events-auto">
            <div className="flex-1 flex flex-col items-center text-center space-y-10">
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 12 }} className="w-20 h-20 bg-green-50 rounded-[28px] flex items-center justify-center text-green-500">
                <CheckCircle2 size={40} />
              </motion.div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-neutral-900 leading-tight">라이딩 완료!</h2>
                <p className="text-neutral-500 font-bold text-sm">오늘도 지구를 시원하게 만들었네요.</p>
              </div>
              <div className="w-full grid grid-cols-2 gap-3">
                <SummaryTile label="주행 시간" value={lastTripResult?.time || ''} />
                <SummaryTile label="이동 거리" value={lastTripResult?.distance || ''} />
                <SummaryTile label="탄소 절감" value={`${lastTripResult?.carbon}kg`} color="text-green-500" />
                <SummaryTile label="소비 칼로리" value={`${calories}kcal`} color="text-orange-500" />
              </div>
            </div>
            <button onClick={onCloseSummary} className="mt-6 w-full py-5 bg-neutral-900 rounded-[22px] text-white font-black text-base active:scale-95 transition-all shadow-lg">확인</button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

function SummaryTile({ label, value, color = "text-neutral-800" }: { label: string, value: string, color?: string }) {
  return (
    <div className="bg-neutral-50 rounded-[24px] p-5 text-center space-y-1">
      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{label}</p>
      <p className={`text-xl font-black ${color}`}>{value}</p>
    </div>
  );
}

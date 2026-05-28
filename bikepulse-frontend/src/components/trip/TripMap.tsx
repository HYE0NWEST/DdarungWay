import { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';

interface TripMapProps {
  onMapInit: (el: HTMLDivElement) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export const TripMap = forwardRef<HTMLDivElement, TripMapProps>(({ onMapInit, onZoomIn, onZoomOut }, ref) => {
  const innerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => innerRef.current!);

  useEffect(() => {
    if (innerRef.current) {
      onMapInit(innerRef.current);
    }
  }, [onMapInit]);

  return (
    <>
      <div ref={innerRef} className="absolute inset-0 z-0" />
      
      {/* 🔍 줌 컨트롤 버튼 */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-[100] flex flex-col gap-2 pointer-events-auto">
        <button 
          onClick={onZoomIn}
          className="w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl border border-white/20 active:scale-95 transition-all"
          aria-label="Zoom In"
        >
          <Plus size={24} className="text-neutral-800" />
        </button>
        <button 
          onClick={onZoomOut}
          className="w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl border border-white/20 active:scale-95 transition-all"
          aria-label="Zoom Out"
        >
          <Minus size={24} className="text-neutral-800" />
        </button>
      </div>
    </>
  );
});

TripMap.displayName = 'TripMap';

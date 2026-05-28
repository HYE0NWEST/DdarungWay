import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Station } from '../../stores/types';

interface TripSearchBarProps {
  keyword: string;
  onKeywordChange: (val: string) => void;
  isSearching: boolean;
  onSearchFocus: () => void;
  onSearchClose: () => void;
  searchResults: Station[];
  onSelectResult: (station: Station) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const TripSearchBar = ({
  keyword,
  onKeywordChange,
  isSearching,
  onSearchFocus,
  onSearchClose,
  searchResults,
  onSelectResult,
  containerRef
}: TripSearchBarProps) => {
  return (
    <div className="absolute top-24 left-0 right-0 px-6 z-10" ref={containerRef}>
      <div className="bg-white/90 backdrop-blur-2xl rounded-[24px] p-2 shadow-xl border border-white/40">
        <div className="flex items-center px-4 py-2 gap-3">
          <Search size={18} className="text-neutral-400" />
          <input 
            className="flex-1 bg-transparent border-none outline-none font-bold text-sm text-neutral-800" 
            placeholder="어디로 갈까요?" 
            value={keyword} 
            onChange={e => onKeywordChange(e.target.value)} 
            onFocus={onSearchFocus} 
          />
          {keyword && (
            <button onClick={onSearchClose}>
              <X size={16} className="text-neutral-300" />
            </button>
          )}
        </div>
        <AnimatePresence>
          {isSearching && searchResults.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="max-h-60 overflow-y-auto pt-2 border-t border-neutral-100">
                {searchResults.map(s => (
                  <button key={s.stationId} onClick={() => onSelectResult(s)} className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                    <div className="text-left">
                      <p className="font-black text-sm text-neutral-800">{s.name}</p>
                      <p className="text-[10px] text-neutral-400 font-bold">{s.address || s.district}</p>
                    </div>
                    <div className="bg-primary-50 px-2 py-1 rounded-lg">
                      <span className="text-[10px] font-black text-primary-600">{s.availableBikes}대</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

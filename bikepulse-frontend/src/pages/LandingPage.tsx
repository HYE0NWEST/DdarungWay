import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bike, MapPin, Leaf, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';

const ONBOARDING_DATA = [
  {
    title: "가장 가까운 자전거",
    description: "내 주변 100m 안의 모든 자전거를\n실시간으로 확인하고 바로 대여하세요.",
    icon: <MapPin className="text-primary-500" size={48} />,
    color: "bg-blue-50"
  },
  {
    title: "환경을 지키는 라이딩",
    description: "라이딩을 통해 절감한 탄소량을 확인하고\n지구 가디언 레벨을 높여보세요.",
    icon: <Leaf className="text-green-500" size={48} />,
    color: "bg-green-50"
  },
  {
    title: "단 3초면 끝나는 대여",
    description: "복잡한 과정 없이 버튼 한 번으로\n간편하게 대여하고 반납하세요.",
    icon: <Bike className="text-primary-500" size={48} />,
    color: "bg-primary-50"
  }
];

export function LandingPage() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  // ✅ 자동 슬라이드 및 무한 루프 로직
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ONBOARDING_DATA.length);
    }, 3000); // 3초마다 전환

    return () => clearInterval(timer);
  }, []);

  const handleStart = () => {
    navigate('/signup');
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* 1. 상단 비주얼 영역 */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="flex flex-col items-center text-center space-y-8"
          >
            <div className={`w-32 h-32 rounded-[40px] ${ONBOARDING_DATA[currentIndex].color} flex items-center justify-center shadow-inner`}>
              {ONBOARDING_DATA[currentIndex].icon}
            </div>
            
            <div className="space-y-4 px-4">
              <h1 className="text-3xl font-black text-neutral-900 leading-tight">
                {ONBOARDING_DATA[currentIndex].title}
              </h1>
              <p className="text-neutral-500 font-bold leading-relaxed whitespace-pre-wrap text-sm">
                {ONBOARDING_DATA[currentIndex].description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* 페이지 인디케이터 (Dots) */}
        <div className="absolute bottom-10 flex gap-2">
          {ONBOARDING_DATA.map((_, index) => (
            <div 
              key={index}
              className={`h-2 rounded-full transition-all duration-500 ${index === currentIndex ? 'w-8 bg-primary-500' : 'w-2 bg-neutral-200'}`}
            />
          ))}
        </div>
      </div>

      {/* 2. 하단 액션 영역 */}
      <div className="p-8 space-y-4 bg-gray-50/50 border-t border-gray-100 rounded-t-[40px]">
        <Button 
          onClick={handleStart}
          className="w-full py-7 rounded-2xl bg-neutral-900 text-white font-black text-lg shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          시작하기
          <ChevronRight size={20} />
        </Button>
        
        <div className="flex flex-col items-center space-y-4 pt-2">
          <p className="text-xs font-bold text-neutral-400">
            이미 계정이 있으신가요?
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="text-primary-600 font-black text-sm underline underline-offset-4"
          >
            기존 계정으로 로그인하기
          </button>
        </div>
      </div>
    </div>
  );
}


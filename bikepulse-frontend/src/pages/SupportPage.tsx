import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronDown, MessageCircle, ChevronRight } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

interface NoticeItem {
  id: number;
  title: string;
  date: string;
  content: string;
}

const NOTICES: NoticeItem[] = [
  {
    id: 1,
    title: "DdarungWay 서비스 런칭 안내",
    date: "2026.05.22",
    content: "안녕하세요, DdarungWay입니다. 더 똑똑하고 친환경적인 서울 라이딩을 위한 DdarungWay 서비스가 정식 출시되었습니다. 많은 이용 부탁드립니다!"
  },
  {
    id: 2,
    title: "신규 예약 시스템 업데이트 공지",
    date: "2026.05.20",
    content: "이제 자전거를 미리 10분간 찜해둘 수 있는 예약 시스템이 추가되었습니다. 정류소 도착 전 미리 자전거를 선점해 보세요."
  },
  {
    id: 3,
    title: "이용권 가격 개편 및 혜택 안내",
    date: "2026.05.15",
    content: "정기권 이용 시 탄소 절감 포인트 2배 적립 이벤트가 진행 중입니다. 자세한 내용은 이용권 구매 페이지를 확인해 주세요."
  }
];

const FAQS: FAQItem[] = [
  {
    question: "예약은 어떻게 하나요?",
    answer: "지도에서 정류소를 선택한 후 '출발하기' 버튼을 누르고, 경로를 설정한 뒤 '자전거 예약' 버튼을 클릭하면 10분간 자전거가 선점됩니다."
  },
  {
    question: "QR 코드가 인식이 안 돼요.",
    answer: "카메라 렌즈를 깨끗이 닦거나, 주변 조명을 밝게 해주세요. 만약 지속적으로 인식이 안 될 경우 '교수님 전용' 버튼이나 고장 신고를 이용해 주세요."
  },
  {
    question: "반납 처리가 제대로 안 됐어요.",
    answer: "반납 구역 내에서 '반납하기' 버튼을 눌렀는지 확인해 주세요. 통신 장애로 인해 처리가 지연될 경우 고객센터로 문의 바랍니다."
  },
  {
    question: "이용권 결제 수단은 무엇이 있나요?",
    answer: "현재 카카오페이와 신용카드 결제를 지원하고 있습니다. 추후 네이버페이 등 다양한 결제 수단이 추가될 예정입니다."
  }
];

export function SupportPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'notice' | 'faq'>('notice');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="flex flex-col h-full bg-gray-50/50 overflow-hidden">
      {/* 상단 헤더 */}
      <div className="px-6 pt-10 pb-6 bg-white border-b border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-neutral-800 active:scale-90 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-black text-neutral-900">고객센터</h1>
        </div>

        {/* 탭 메뉴 */}
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('notice')}
            className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${
              activeTab === 'notice' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'
            }`}
          >
            공지사항
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${
              activeTab === 'faq' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'
            }`}
          >
            자주 묻는 질문
          </button>
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto p-6 pb-20">
        <AnimatePresence mode="wait">
          {activeTab === 'notice' ? (
            <motion.div
              key="notice"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {NOTICES.map((notice) => (
                <div key={notice.id} className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="px-2 py-1 bg-primary-50 rounded-lg text-[9px] font-black text-primary-600 uppercase">Announcement</div>
                    <span className="text-[10px] font-bold text-neutral-300">{notice.date}</span>
                  </div>
                  <h3 className="text-base font-black text-neutral-800">{notice.title}</h3>
                  <p className="text-xs text-neutral-500 font-bold leading-relaxed">{notice.content}</p>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="faq"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {FAQS.map((faq, index) => (
                <div key={index} className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full p-5 flex items-center justify-between text-left"
                  >
                    <span className="text-sm font-black text-neutral-700 pr-4">{faq.question}</span>
                    <motion.div
                      animate={{ rotate: expandedFaq === index ? 180 : 0 }}
                      className="text-neutral-300 shrink-0"
                    >
                      <ChevronDown size={18} />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {expandedFaq === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-gray-50"
                      >
                        <div className="p-5 bg-gray-50/50 text-xs text-neutral-500 font-bold leading-relaxed">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1:1 문의 버튼 */}
        <div className="mt-8">
          <button 
            onClick={() => toast.success('1:1 문의 기능은 현재 준비 중입니다. 잠시만 기다려 주세요!', { icon: '💬' })}
            className="w-full bg-neutral-900 p-6 rounded-[28px] flex items-center justify-between group active:scale-95 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <MessageCircle size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-white">1:1 문의하기</p>
                <p className="text-[10px] text-neutral-500 font-bold">궁금한 점을 남겨주시면 답변해 드려요</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white group-hover:bg-primary-500 transition-colors">
              <ChevronRight size={16} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

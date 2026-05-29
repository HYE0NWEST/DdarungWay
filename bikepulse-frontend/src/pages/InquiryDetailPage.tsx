import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  Clock, 
  User, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { apiClient } from '../services/api/client';
import { Skeleton } from '../components/ui/skeleton';

interface InquiryDetail {
  _id: string;
  title: string;
  content: string;
  category: string;
  status: 'pending' | 'answered';
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
}

export function InquiryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inquiry, setInquiry] = useState<InquiryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get(`/inquiries/${id}`);
        setInquiry(response.data.data.inquiry);
      } catch (err) {
        console.error('Failed to fetch inquiry detail:', err);
        setError('문의 상세 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchDetail();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="px-6 pt-10 pb-6 border-b border-gray-100">
          <Skeleton className="w-10 h-10 rounded-xl mb-4" />
          <Skeleton className="h-8 w-3/4 rounded-lg" />
        </div>
        <div className="p-6 space-y-6">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error || !inquiry) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <AlertCircle size={48} className="text-red-300 mb-4" />
        <p className="text-neutral-500 font-bold mb-6">{error || '문의를 찾을 수 없습니다.'}</p>
        <button 
          onClick={() => navigate(-1)}
          className="px-8 py-3 bg-neutral-900 text-white rounded-xl font-black text-sm"
        >
          뒤로 가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      {/* Header */}
      <div className="px-6 pt-10 pb-6 bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-neutral-800 active:scale-90 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-black text-neutral-900 line-clamp-1">{inquiry.title}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
        {/* User Question */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <User size={14} className="text-neutral-400" />
            <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">나의 문의</h3>
          </div>
          <div className="bg-white p-6 rounded-[32px] rounded-tl-none shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-primary-600 bg-primary-50 px-2 py-1 rounded-lg uppercase">
                {inquiry.category}
              </span>
              <span className="text-[10px] font-bold text-neutral-300">
                {new Date(inquiry.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-sm font-bold text-neutral-700 leading-relaxed whitespace-pre-wrap">
              {inquiry.content}
            </p>
          </div>
        </section>

        {/* System Answer */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <ShieldCheck size={14} className={`text-orange-500 ${inquiry.status === 'answered' ? 'text-primary-500' : ''}`} />
            <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">운영진 답변</h3>
          </div>
          
          {inquiry.status === 'answered' ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-neutral-900 p-6 rounded-[32px] rounded-tr-none shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-white/50 uppercase tracking-tighter">Official Response</span>
                <span className="text-[10px] font-bold text-white/30">
                  {inquiry.answeredAt ? new Date(inquiry.answeredAt).toLocaleString() : ''}
                </span>
              </div>
              <p className="text-sm font-bold text-white leading-relaxed whitespace-pre-wrap">
                {inquiry.answer}
              </p>
            </motion.div>
          ) : (
            <div className="bg-white p-8 rounded-[32px] rounded-tr-none border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
              <Clock size={32} className="text-orange-200 mb-3 animate-pulse" />
              <p className="text-sm font-black text-neutral-400">답변을 준비하고 있습니다</p>
              <p className="text-[10px] text-neutral-300 font-bold mt-1">조금만 더 기다려 주세요!</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

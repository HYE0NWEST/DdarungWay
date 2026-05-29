import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  Plus, 
  MessageSquare, 
  Clock, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { apiClient } from '../services/api/client';
import { Skeleton } from '../components/ui/skeleton';

interface Inquiry {
  _id: string;
  title: string;
  content: string;
  category: string;
  status: 'pending' | 'answered';
  createdAt: string;
}

export function InquiryPage() {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInquiries = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/inquiries');
      setInquiries(response.data.data.inquiries);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch inquiries:', err);
      setError('문의 내역을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initFetch = async () => {
      await fetchInquiries();
    };
    void initFetch();
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      {/* Header */}
      <div className="px-6 pt-10 pb-6 bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/profile/support')}
              className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-neutral-800 active:scale-90 transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-xl font-black text-neutral-900">1:1 문의 내역</h1>
          </div>
          <button
            onClick={() => navigate('/profile/support/inquiry/new')}
            className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-500/20 active:scale-90 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 pb-24">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-[28px]" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle size={48} className="text-red-300 mb-4" />
            <p className="text-neutral-500 font-bold">{error}</p>
            <button 
              onClick={() => void fetchInquiries()}
              className="mt-4 text-primary-500 font-black text-sm"
            >
              다시 시도
            </button>
          </div>
        ) : inquiries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mb-6">
              <MessageSquare size={40} />
            </div>
            <h3 className="text-lg font-black text-neutral-800 mb-2">문의 내역이 없습니다</h3>
            <p className="text-sm text-neutral-400 font-bold mb-8">
              궁금한 점이 있으시면<br />새로운 문의를 남겨주세요.
            </p>
            <button
              onClick={() => navigate('/profile/support/inquiry/new')}
              className="px-8 py-4 bg-neutral-900 text-white rounded-2xl font-black text-sm active:scale-95 transition-all"
            >
              문의하기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {inquiries.map((inquiry) => (
              <motion.div
                key={inquiry._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/profile/support/inquiry/${inquiry._id}`)}
                className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 active:scale-[0.98] transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                    inquiry.status === 'answered' 
                      ? 'bg-primary-50 text-primary-600' 
                      : 'bg-orange-50 text-orange-600'
                  }`}>
                    {inquiry.status === 'answered' ? 'Answered' : 'Pending'}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-300">
                    <Clock size={10} />
                    {new Date(inquiry.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <h3 className="text-base font-black text-neutral-800 mb-2 line-clamp-1 group-hover:text-primary-600 transition-colors">
                  {inquiry.title}
                </h3>
                <p className="text-xs text-neutral-400 font-bold line-clamp-2 leading-relaxed">
                  {inquiry.content}
                </p>
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-[10px] font-black text-neutral-300 uppercase tracking-wider">
                    Category: {inquiry.category}
                  </span>
                  <div className="text-neutral-300">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

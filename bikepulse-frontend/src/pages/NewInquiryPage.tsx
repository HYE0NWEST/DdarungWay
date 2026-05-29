import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  ChevronLeft, 
  Send,
  HelpCircle,
  Type,
  AlignLeft,
  Tag
} from 'lucide-react';
import { apiClient } from '../services/api/client';

const CATEGORIES = [
  { id: 'trip', label: '이용/대여', icon: '🚲' },
  { id: 'payment', label: '결제/환불', icon: '💳' },
  { id: 'account', label: '계정/인증', icon: '👤' },
  { id: 'bug', label: '오류신고', icon: '🐛' },
  { id: 'other', label: '기타', icon: '💬' },
];

export function NewInquiryPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'other'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('제목과 내용을 모두 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post('/inquiries', formData);
      toast.success('문의가 접수되었습니다.');
      navigate('/profile/support/inquiry', { replace: true });
    } catch (err) {
      console.error('Failed to submit inquiry:', err);
      toast.error('문의 접수 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 pt-10 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-neutral-800 active:scale-90 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-black text-neutral-900">1:1 문의하기</h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-6 overflow-y-auto pb-24">
        <div className="space-y-8">
          {/* Category Select */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Tag size={14} className="text-primary-500" />
              <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">문의 유형 선택</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat.id })}
                  className={`py-3 px-2 rounded-2xl flex flex-col items-center gap-1.5 transition-all border ${
                    formData.category === cat.id
                      ? 'bg-neutral-900 border-neutral-900 text-white shadow-lg'
                      : 'bg-white border-gray-100 text-neutral-400'
                  }`}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-[11px] font-black">{cat.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Title Input */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Type size={14} className="text-primary-500" />
              <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">문의 제목</h3>
            </div>
            <input
              type="text"
              placeholder="제목을 입력해주세요"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-5 bg-gray-50 rounded-[24px] border border-transparent focus:bg-white focus:border-primary-500/30 focus:ring-4 focus:ring-primary-500/5 transition-all text-sm font-bold text-neutral-800 outline-none"
            />
          </section>

          {/* Content Textarea */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <AlignLeft size={14} className="text-primary-500" />
              <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">문의 내용</h3>
            </div>
            <textarea
              placeholder="문의하실 내용을 자세히 적어주세요. 신속하고 정확하게 답변해 드릴게요."
              rows={8}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full p-5 bg-gray-50 rounded-[24px] border border-transparent focus:bg-white focus:border-primary-500/30 focus:ring-4 focus:ring-primary-500/5 transition-all text-sm font-bold text-neutral-800 outline-none resize-none leading-relaxed"
            />
          </section>

          {/* Guide Box */}
          <div className="p-5 bg-blue-50/50 rounded-[24px] border border-blue-100 flex gap-4">
            <HelpCircle size={20} className="text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-black text-blue-900 tracking-tight">도움말</p>
              <p className="text-[10px] text-blue-700/70 font-bold leading-relaxed">
                문의 내용은 주말/공휴일을 제외하고 최대 48시간 이내에 답변해 드립니다. 개인정보가 포함되지 않도록 주의해 주세요.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-12">
          <button
            disabled={isSubmitting}
            className={`w-full py-5 rounded-[24px] font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 ${
              isSubmitting 
                ? 'bg-gray-100 text-gray-400' 
                : 'bg-primary-500 text-white shadow-primary-500/20'
            }`}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
            ) : (
              <>
                <Send size={18} />
                문의 접수하기
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

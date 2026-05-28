import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';
import { apiClient } from '../services/api/client';
import { Button } from '../components/ui/button';
import { ChevronLeft } from 'lucide-react';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!email) {
      toast.error('이메일을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { email });
      toast.success('임시 비밀번호가 이메일로 발송되었습니다.');
      navigate('/login');
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || '비밀번호 초기화 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white animate-in fade-in duration-500">
      <header className="px-4 py-4 flex items-center justify-between sticky top-0 z-10 bg-white">
        <button onClick={() => navigate('/login')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-black text-neutral-900">비밀번호 찾기</h1>
        <div className="w-10" />
      </header>

      <section className="p-6 flex flex-col justify-center min-h-[70vh]">
        <div className="max-w-sm mx-auto w-full space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight">비밀번호를 잊으셨나요?</h2>
            <p className="text-neutral-500 font-bold text-sm">
              가입하신 이메일을 입력하시면<br/>임시 비밀번호를 보내드립니다.
            </p>
          </div>
          
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-neutral-400 uppercase tracking-widest ml-1">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@ddarungway.com"
                required
                className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary-500 transition-all outline-none"
              />
            </div>
            <Button 
              className="w-full py-7 rounded-2xl bg-primary-500 text-white font-black text-lg shadow-lg shadow-primary-500/30 hover:bg-primary-600 transition-all active:scale-95 mt-2" 
              type="submit" 
              disabled={loading}
            >
              {loading ? '전송 중...' : '임시 비밀번호 받기'}
            </Button>
          </form>

          <div className="text-center pt-4">
            <button 
              onClick={() => navigate('/login')}
              className="text-sm font-bold text-neutral-400 hover:text-primary-500 transition-colors"
            >
              비밀번호가 기억나셨나요? <span className="text-primary-500">로그인하기</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

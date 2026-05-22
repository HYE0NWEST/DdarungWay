import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/button';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, status } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleKakaoLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/kakao`;
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/google`;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await login({ email, password });
    if (useAuthStore.getState().accessToken) {
      toast.success('로그인 성공');
      navigate('/home');
    }
  };

  return (
    <section className="p-6 flex flex-col justify-center min-h-[85vh] animate-in fade-in duration-500">
      <div className="max-w-sm mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black text-primary-500 tracking-tight">DdarungWay</h1>
          <p className="text-neutral-500 font-bold uppercase text-[10px] tracking-[0.2em]">로그인하여 시작하기</p>
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
          <div className="space-y-1.5">
            <label className="text-xs font-black text-neutral-400 uppercase tracking-widest ml-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
              className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary-500 transition-all outline-none"
            />
          </div>
          <Button 
            className="w-full py-7 rounded-2xl bg-primary-500 text-white font-black text-lg shadow-lg shadow-primary-500/30 hover:bg-primary-600 transition-all active:scale-95 mt-2" 
            type="submit" 
            disabled={status === 'loading'}
          >
            {status === 'loading' ? '로그인 중...' : '로그인'}
          </Button>
        </form>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-[10px] font-black uppercase tracking-widest">OR</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <div className="grid gap-3">
          <button 
            type="button" 
            onClick={handleKakaoLogin}
            className="w-full py-4 rounded-2xl bg-[#FEE500] text-[#191919] font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-all active:scale-[0.98]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.558 1.707 4.8 4.27 6.054l-.841 3.08c-.05.187.058.388.24.448.06.02.124.03.187.03.127 0 .248-.063.318-.176l3.541-5.636c.433.064.877.095 1.285.095 4.97 0 9-3.185 9-7.115S16.97 3 12 3z"/>
            </svg>
            <span className="text-sm">카카오로 시작하기</span>
          </button>
          
          <button 
            type="button" 
            onClick={handleGoogleLogin}
            className="w-full py-4 rounded-2xl bg-white border border-gray-200 text-gray-600 font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-all active:scale-[0.98]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-sm">Google 계정으로 로그인</span>
          </button>
        </div>

        <div className="text-center pt-4">
          <button 
            onClick={() => navigate('/signup')}
            className="text-sm font-bold text-neutral-400 hover:text-primary-500 transition-colors"
          >
            계정이 없으신가요? <span className="text-primary-500">회원가입</span>
          </button>
        </div>
      </div>
    </section>
  );
}

import { AxiosError } from 'axios';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api/client';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/button';

export function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/signup', {
        email: formData.email,
        password: formData.password,
        username: formData.username
      });
      toast.success('회원가입이 완료되었습니다! 로그인해주세요.');
      navigate('/login');
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || '회원가입 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-8 flex flex-col justify-center min-h-[80vh]">
      <div className="text-center">
        <h1 className="text-3xl font-black text-primary-500">DdarungWay</h1>
        <p className="text-neutral-500 font-bold mt-2">새로운 여정을 시작해보세요</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-black text-neutral-400 uppercase tracking-widest ml-1">이름</label>
          <input 
            type="text" 
            placeholder="홍길동"
            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary-500 transition-all outline-none"
            value={formData.username}
            onChange={e => setFormData({...formData, username: e.target.value})}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-black text-neutral-400 uppercase tracking-widest ml-1">이메일</label>
          <input 
            type="email" 
            placeholder="example@ddarungway.com"
            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary-500 transition-all outline-none"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-black text-neutral-400 uppercase tracking-widest ml-1">비밀번호</label>
          <input 
            type="password" 
            placeholder="••••••••"
            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary-500 transition-all outline-none"
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-black text-neutral-400 uppercase tracking-widest ml-1">비밀번호 확인</label>
          <input 
            type="password" 
            placeholder="••••••••"
            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary-500 transition-all outline-none"
            value={formData.confirmPassword}
            onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
            required
          />
        </div>

        <Button 
          type="submit" 
          disabled={loading}
          className="w-full py-7 rounded-2xl bg-primary-500 text-white font-black text-lg shadow-lg shadow-primary-500/30 hover:bg-primary-600 transition-all active:scale-95"
        >
          {loading ? '처리 중...' : '회원가입'}
        </Button>
      </form>

      <div className="text-center">
        <button 
          onClick={() => navigate('/login')}
          className="text-sm font-bold text-neutral-400 hover:text-primary-500 transition-colors"
        >
          이미 계정이 있으신가요? 로그인하기
        </button>
      </div>
    </div>
  );
}

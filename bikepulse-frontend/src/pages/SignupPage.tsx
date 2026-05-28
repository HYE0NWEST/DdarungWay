import { AxiosError } from 'axios';
import { useState, useEffect } from 'react';
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
  
  // 이메일 인증 관련 상태
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // 타이머 로직
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setFormData({ ...formData, email: newEmail });
    
    // 이메일이 변경되면 인증 상태 초기화
    if (isCodeSent || isVerified || verificationCode || timeLeft > 0) {
      setIsCodeSent(false);
      setIsVerified(false);
      setVerificationCode('');
      setTimeLeft(0);
    }
  };

  const handleSendCode = async () => {
    if (!formData.email) {
      toast.error('이메일을 입력해주세요.');
      return;
    }
    
    setLoading(true);
    try {
      await apiClient.post('/auth/send-code', { email: formData.email });
      toast.success('인증번호가 발송되었습니다.');
      setIsCodeSent(true);
      setTimeLeft(180); // 3분
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || '발송 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      toast.error('인증번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/verify-code', { 
        email: formData.email, 
        code: verificationCode 
      });
      toast.success('이메일 인증이 완료되었습니다.');
      setIsVerified(true);
      setTimeLeft(0);
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message || '인증 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) {
      toast.error('이메일 인증이 필요합니다.');
      return;
    }
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
        <h1 className="text-3xl font-black text-primary-500">BikePulse</h1>
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
          <div className="flex gap-2">
            <input 
              type="email" 
              placeholder="example@bikepulse.com"
              className="flex-1 p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary-500 transition-all outline-none disabled:opacity-50"
              value={formData.email}
              onChange={handleEmailChange}
              required
              disabled={isVerified}
            />
            <button
              type="button"
              onClick={handleSendCode}
              disabled={loading || isVerified}
              className="px-4 bg-primary-500 text-white rounded-2xl font-black text-sm hover:bg-primary-600 transition-all disabled:bg-neutral-200"
            >
              {isCodeSent ? '재발송' : '인증'}
            </button>
          </div>
        </div>

        {isCodeSent && !isVerified && (
          <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="text-xs font-black text-neutral-400 uppercase tracking-widest ml-1 flex justify-between">
              인증번호 
              <span className="text-primary-500">{formatTime(timeLeft)}</span>
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="6자리 숫자 입력"
                maxLength={6}
                className="flex-1 p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value)}
              />
              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={loading || timeLeft === 0}
                className="px-4 bg-neutral-800 text-white rounded-2xl font-black text-sm hover:bg-neutral-900 transition-all"
              >
                확인
              </button>
            </div>
          </div>
        )}

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
          disabled={loading || !isVerified}
          className="w-full py-7 rounded-2xl bg-primary-500 text-white font-black text-lg shadow-lg shadow-primary-500/30 hover:bg-primary-600 transition-all active:scale-95 disabled:bg-neutral-200 disabled:shadow-none mt-4"
        >
          {loading ? '처리 중...' : '회원가입 완료'}
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

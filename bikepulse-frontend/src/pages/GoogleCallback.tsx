import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiClient } from '../services/api/client';
import { useAuthStore } from '../stores/authStore';

export function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const isProcessed = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');

    if (!code) {
      toast.error('구글 로그인 인가 코드가 없습니다.', { id: 'google-error' });
      navigate('/login');
      return;
    }

    if (isProcessed.current) return;
    isProcessed.current = true;

    const processLogin = async () => {
      try {
        const { data } = await apiClient.post('/auth/google', { code });
        
        // authStore에 토큰과 사용자 정보 저장
        setAuth(data.accessToken, data.refreshToken, data.data.user);
        
        toast.success('구글 로그인 성공!', { id: 'google-success' });
        navigate('/home');
      } catch (error) {
        console.error('Google login error:', error);
        toast.error('구글 로그인 처리 중 오류가 발생했습니다.', { id: 'google-error' });
        navigate('/login');
      }
    };

    void processLogin();
  }, [searchParams, navigate, setAuth]);

  return (
    <section className="auth-page">
      <div className="glass auth-card" style={{ textAlign: 'center' }}>
        <p className="eyebrow">AUTHENTICATING</p>
        <h1>구글 로그인 중...</h1>
        <p className="muted" style={{ marginTop: '20px' }}>
          잠시만 기다려주세요. 안전하게 로그인 처리를 진행 중입니다.
        </p>
      </div>
    </section>
  );
}

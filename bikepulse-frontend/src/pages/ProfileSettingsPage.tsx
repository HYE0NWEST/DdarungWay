import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronLeft, User, Camera, Shield, ChevronRight, LogOut, Lock, X } from 'lucide-react';
import { apiClient } from '../services/api/client';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/button';

export function ProfileSettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [username, setUsername] = useState(user?.username || '');
  const [prevUsername, setPrevUsername] = useState(user?.username);
  const [isSaving, setIsSaving] = useState(false);
  
  // ✅ 프로필 정보 로드 시 초기값 동기화
  if (user?.username !== prevUsername) {
    setPrevUsername(user?.username);
    setUsername(user?.username || '');
  }
  
  // ✅ 비밀번호 변경 모달 상태
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdData, setPwdData] = useState({ current: '', new: '', confirm: '' });
  const [isPwdSaving, setIsPwdSaving] = useState(false);

  const handleUpdateProfile = async () => {
    if (!username.trim()) {
      toast.error('이름을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.patch('/users/profile', { username });
      toast.success('프로필이 업데이트되었습니다.');
      // 전역 상태 업데이트
      const { data } = await apiClient.get('/users/profile');
      // 백엔드 응답이 { data: { name, email, socialProvider ... } } 형태일 수 있으므로 매핑 필요
      const updatedUser = data.data;
      if (user) {
        useAuthStore.setState({ 
          user: { 
            ...user, 
            username: updatedUser.name || updatedUser.username,
            socialProvider: updatedUser.socialProvider
          }
        });
      }
    } catch (error) {
      toast.error('업데이트 실패');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!pwdData.current || !pwdData.new) {
      toast.error('비밀번호를 입력해주세요.');
      return;
    }
    if (pwdData.new !== pwdData.confirm) {
      toast.error('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsPwdSaving(true);
    try {
      await apiClient.patch('/users/password', {
        currentPassword: pwdData.current,
        newPassword: pwdData.new
      });
      toast.success('비밀번호가 성공적으로 변경되었습니다.');
      setShowPwdModal(false);
      setPwdData({ current: '', new: '', confirm: '' });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || '변경 실패';
      toast.error(msg);
    } finally {
      setIsPwdSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 animate-in fade-in duration-500">
      {/* Header */}
      <header className="bg-white px-4 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-black text-neutral-900">설정</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-10">
        {/* Profile Section */}
        <div className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-100">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center border-4 border-white shadow-md">
                <span className="text-3xl font-black text-primary-600">{username?.[0] || 'U'}</span>
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-primary-500 rounded-full text-white border-2 border-white shadow-sm">
                <Camera size={16} />
              </button>
            </div>
            <div className="w-full space-y-1.5">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">이름</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                placeholder="이름 입력"
              />
            </div>
            <Button 
              onClick={handleUpdateProfile}
              disabled={isSaving}
              className="w-full py-6 rounded-2xl bg-primary-500 text-white font-black shadow-lg shadow-primary-500/20"
            >
              {isSaving ? '저장 중...' : '프로필 저장'}
            </Button>
          </div>
        </div>

        {/* Menu Groups */}
        <div className="space-y-4">
          <div className="bg-white rounded-[28px] overflow-hidden shadow-sm border border-gray-100">
            {user?.socialProvider === 'local' && (
              <MenuButton icon={<Shield size={18} />} label="비밀번호 변경" onClick={() => setShowPwdModal(true)} />
            )}
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <h2 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] ml-2">기타</h2>
          <div className="bg-white rounded-[28px] overflow-hidden shadow-sm border border-gray-100">
            <MenuButton icon={<User size={18} />} label="이용권 관리" onClick={() => navigate('/profile/pass')} />
            <button 
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="w-full p-5 flex items-center justify-between hover:bg-red-50 transition-colors text-red-500"
            >
              <div className="flex items-center gap-4">
                <LogOut size={18} />
                <span className="text-sm font-bold">로그아웃</span>
              </div>
              <ChevronRight size={16} className="text-red-200" />
            </button>
          </div>
        </div>

        <div className="text-center pt-4">
          <p className="text-[10px] font-bold text-gray-300">DdarungWay v1.0.0</p>
        </div>
      </div>

      {/* ✅ 비밀번호 변경 모달 */}
      {showPwdModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-neutral-900 flex items-center gap-2">
                <Lock className="text-primary-500" size={20} />
                비밀번호 변경
              </h3>
              <button onClick={() => setShowPwdModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-neutral-400 uppercase ml-1">현재 비밀번호</label>
                <input 
                  type="password" 
                  value={pwdData.current}
                  onChange={e => setPwdData({...pwdData, current: e.target.value})}
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-neutral-400 uppercase ml-1">새 비밀번호</label>
                <input 
                  type="password" 
                  value={pwdData.new}
                  onChange={e => setPwdData({...pwdData, new: e.target.value})}
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-neutral-400 uppercase ml-1">새 비밀번호 확인</label>
                <input 
                  type="password" 
                  value={pwdData.confirm}
                  onChange={e => setPwdData({...pwdData, confirm: e.target.value})}
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>

            <Button 
              onClick={handleUpdatePassword}
              disabled={isPwdSaving}
              className="w-full py-6 rounded-2xl bg-primary-500 text-white font-black shadow-lg shadow-primary-500/20"
            >
              {isPwdSaving ? '변경 중...' : '비밀번호 변경하기'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
    >
      <div className="flex items-center gap-4">
        <div className="text-neutral-400">{icon}</div>
        <span className="text-sm font-bold text-neutral-700">{label}</span>
      </div>
      <ChevronRight size={16} className="text-neutral-200" />
    </button>
  );
}

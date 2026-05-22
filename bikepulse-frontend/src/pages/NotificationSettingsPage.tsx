import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Moon, Bike, CreditCard, Megaphone } from 'lucide-react';
import { useNotificationStore } from '../stores/notificationStore';

export function NotificationSettingsPage() {
  const navigate = useNavigate();
  const { settings, fetchSettings, updateSettings } = useNotificationStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (!settings) return <div className="p-8 text-center">불러오는 중...</div>;

  const toggleSetting = (key: keyof typeof settings) => {
    if (key === 'dnd') return; // DND는 별도 처리
    updateSettings({ [key]: !settings[key] });
  };

  const toggleDnd = () => {
    updateSettings({
      dnd: { ...settings.dnd, enabled: !settings.dnd.enabled }
    });
  };

  const updateDndTime = (key: 'startTime' | 'endTime', value: string) => {
    updateSettings({
      dnd: { ...settings.dnd, [key]: value }
    });
  };

  return (
    <div className="min-h-full bg-gray-50 pb-10">
      <header className="sticky top-0 bg-white border-b border-gray-100 h-14 flex items-center px-4 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-center font-bold text-lg mr-8">알림 설정</h1>
      </header>

      <div className="p-4 space-y-6">
        {/* 방해 금지 모드 */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-4 flex items-center justify-between border-b border-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Moon className="text-indigo-500" size={20} />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">방해 금지 모드</h2>
                <p className="text-xs text-gray-500">지정한 시간에는 알림을 받지 않습니다.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings.dnd.enabled}
                onChange={toggleDnd}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>
          
          {settings.dnd.enabled && (
            <div className="p-4 bg-gray-50/50 flex items-center justify-around">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">시작</span>
                <input 
                  type="time" 
                  value={settings.dnd.startTime}
                  onChange={(e) => updateDndTime('startTime', e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold"
                />
              </div>
              <div className="w-4 h-[2px] bg-gray-300 mt-4" />
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">종료</span>
                <input 
                  type="time" 
                  value={settings.dnd.endTime}
                  onChange={(e) => updateDndTime('endTime', e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold"
                />
              </div>
            </div>
          )}
        </section>

        {/* 알림 항목별 설정 */}
        <div className="space-y-3">
          <h3 className="px-1 text-sm font-bold text-gray-400">항목별 알림 수신</h3>
          
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {/* 관심 정류소 */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                  <Bike className="text-primary-500" size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">관심 정류소 입고 알림</h2>
                  <p className="text-xs text-gray-500">스나이핑 중인 곳에 자전거가 오면 알려요.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.sniping}
                  onChange={() => toggleSetting('sniping')}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>

            {/* 대여/반납/결제 */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <CreditCard className="text-blue-500" size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">이용 및 결제 안내</h2>
                  <p className="text-xs text-gray-500">대여, 반납, 결제 내역을 실시간으로 알려요.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.trip}
                  onChange={() => toggleSetting('trip')}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>

            {/* 마케팅 */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Megaphone className="text-orange-500" size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">이벤트 및 혜택 알림</h2>
                  <p className="text-xs text-gray-500">새로운 이벤트와 맞춤 혜택을 알려요.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.marketing}
                  onChange={() => toggleSetting('marketing')}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="p-4 text-center">
          <p className="text-xs text-gray-400">
            알림 설정은 기기별로 적용되지 않고 계정별로 통합 관리됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

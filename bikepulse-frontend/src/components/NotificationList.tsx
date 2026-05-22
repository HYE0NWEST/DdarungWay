import { useNavigate } from 'react-router-dom';
import { Check, Info, Bike, CreditCard, Settings, BellOff } from 'lucide-react';
import { useNotificationStore, type Notification } from '../stores/notificationStore';

interface NotificationListProps {
  onClose: () => void;
}

export function NotificationList({ onClose }: NotificationListProps) {
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead, isLoading } = useNotificationStore();

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'SNIPING': return <Bike className="text-primary-500" size={18} />;
      case 'TRIP': return <Info className="text-blue-500" size={18} />;
      case 'PAYMENT': return <CreditCard className="text-green-500" size={18} />;
      case 'MARKETING': return <Check className="text-purple-500" size={18} />;
      default: return <Info className="text-gray-500" size={18} />;
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }
    
    // 알림 타입에 따라 이동 (예시)
    if (notification.type === 'SNIPING' && notification.data?.stationId) {
      navigate(`/map?stationId=${notification.data.stationId}`);
    } else if (notification.type === 'TRIP') {
      navigate('/trip');
    }
    
    onClose();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) return '방금 전';
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}시간 전`;
    return `${Math.floor(diffInMinutes / 1440)}일 전`;
  };

  return (
    <div className="flex flex-col max-h-[400px]">
      <div className="flex items-center justify-between p-4 border-b border-gray-50 bg-gray-50/50">
        <h3 className="font-bold text-gray-900">알림</h3>
        <div className="flex gap-2">
          <button 
            onClick={() => markAllAsRead()}
            className="text-xs text-primary-600 hover:text-primary-700 font-semibold"
          >
            모두 읽음
          </button>
          <button 
            onClick={() => {
              navigate('/profile/settings/notifications');
              onClose();
            }}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
          >
            <Settings size={14} className="text-gray-500" />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">불러오는 중...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center gap-3">
            <BellOff size={32} className="text-gray-200" />
            <p className="text-sm text-gray-500">새로운 알림이 없습니다.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => handleNotificationClick(n)}
              className={`p-4 border-b border-gray-50 cursor-pointer transition-colors flex gap-3 ${
                n.isRead ? 'bg-white' : 'bg-primary-50/30'
              } hover:bg-gray-50`}
            >
              <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                n.isRead ? 'bg-gray-100' : 'bg-primary-100'
              }`}>
                {getIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <p className={`text-sm font-bold truncate ${n.isRead ? 'text-gray-600' : 'text-gray-900'}`}>
                    {n.title}
                  </p>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">
                    {formatTime(n.createdAt)}
                  </span>
                </div>
                <p className={`text-xs mt-1 leading-relaxed ${n.isRead ? 'text-gray-500' : 'text-gray-700'}`}>
                  {n.message}
                </p>
              </div>
              {!n.isRead && (
                <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
              )}
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => {
          // navigate('/notifications'); // 전체 알림 페이지가 있다면
          onClose();
        }}
        className="p-3 text-center text-xs text-gray-500 hover:bg-gray-50 border-t border-gray-50 font-medium"
      >
        닫기
      </button>
    </div>
  );
}

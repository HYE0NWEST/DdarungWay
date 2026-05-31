import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // 다음 렌더링에서 폴백 UI가 보이도록 상태를 업데이트합니다.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 에러 로깅 서비스에 에러를 기록할 수 있습니다 (예: Sentry)
    console.error('Uncaught error:', error, errorInfo);

    // 🚀 버전 불일치(새 배포)로 인한 청크 로드 실패 자동 복구 로직
    const isChunkError = 
      error.message.includes('Failed to fetch dynamically imported module') || 
      error.message.includes('ChunkLoadError');

    if (isChunkError) {
      const lastReload = sessionStorage.getItem('last-chunk-fix-reload');
      const now = Date.now();
      
      // 10초 이내에 재시도한 적이 없다면 자동 새로고침하여 새 버전 로드
      if (!lastReload || now - parseInt(lastReload) > 10000) {
        sessionStorage.setItem('last-chunk-fix-reload', now.toString());
        console.info('새 버전 배포 감지: 청크를 다시 로드하기 위해 페이지를 새로고침합니다.');
        window.location.reload();
      }
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload(); // 앱을 초기 상태로 복구하기 위해 새로고침
  };

  private goHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/home';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mx-auto">
              <AlertTriangle size={40} />
            </div>
            
            <div className="space-y-3">
              <h1 className="text-2xl font-black text-neutral-900">문제가 발생했습니다</h1>
              <p className="text-neutral-500 font-bold leading-relaxed">
                시스템에서 예기치 못한 오류가 발생했습니다.<br />
                잠시 후 다시 시도해 주세요.
              </p>
              {this.state.error && (
                <div className="bg-red-50 p-4 rounded-2xl mt-4">
                  <p className="text-[10px] font-mono text-red-400 break-all text-left">
                    Error: {this.state.error.message}
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-3 pt-4">
              <Button 
                onClick={this.handleReset}
                className="w-full py-7 rounded-2xl bg-neutral-900 text-white font-black text-lg flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl"
              >
                <RefreshCcw size={20} />
                새로고침하여 복구하기
              </Button>
              <button 
                onClick={this.goHome}
                className="w-full py-4 text-neutral-400 font-bold text-sm hover:text-neutral-600 transition-colors flex items-center justify-center gap-2"
              >
                <Home size={16} />
                홈으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

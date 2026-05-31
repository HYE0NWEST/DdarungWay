import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { lazy, type ComponentType } from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 📱 모바일 햅틱(진동) 피드백 유틸리티
export function vibrate(pattern: number | number[] = 50) {
  if (typeof window !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

/**
 * 🔄 청크 로드 실패 시 자동 재시도를 포함한 Lazy Loading 유틸리티
 * 새 버전 배포 후 구버전 청크(JS 파일)가 404를 반환할 때 페이지를 새로고침하여 복구합니다.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      return await componentImport();
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        // 첫 번째 시도 실패 시 세션 스토리지에 기록 후 강제 새로고침
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
        return { default: (() => null) as unknown as T };
      }

      // 새로고침 후에도 실패하면 에러를 던져 ErrorBoundary에서 처리하도록 함
      throw error;
    }
  });
}
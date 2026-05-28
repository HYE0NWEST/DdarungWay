import { AxiosError } from 'axios';
import toast from 'react-hot-toast';

export function handleApiError(error: unknown) {
  const axiosError = error as AxiosError<{ message?: string }>;
  const status = axiosError.response?.status;
  const message = axiosError.response?.data?.message;

  switch (status) {
    case 400: {
      const msg400 = message ?? '입력값을 확인해주세요.';
      toast.error(msg400, { id: msg400 });
      break;
    }
    case 401:
      toast.error('로그인이 필요합니다.', { id: 'unauthorized' });
      break;
    case 402:
      toast.error('미수금 결제가 필요합니다.', { id: 'payment-required' });
      break;
    case 403:
      toast.error('권한이 없습니다.', { id: 'forbidden' });
      break;
    case 409: {
      const msg409 = '다른 사용자가 처리 중입니다. 잠시 후 다시 시도해주세요.';
      toast(msg409, { id: msg409 });
      break;
    }
    default: {
      const msgDefault = message ?? '서버 오류가 발생했습니다.';
      toast.error(msgDefault, { id: msgDefault });
      break;
    }
  }
}

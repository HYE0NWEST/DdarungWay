import { AxiosError } from 'axios';
import toast from 'react-hot-toast';

export function handleApiError(error: unknown) {
  const axiosError = error as AxiosError<{ message?: string }>;
  const status = axiosError.response?.status;
  const message = axiosError.response?.data?.message;

  switch (status) {
    case 400:
      toast.error(message ?? '입력값을 확인해주세요.');
      break;
    case 401:
      toast.error('로그인이 필요합니다.');
      break;
    case 402:
      toast.error('미수금 결제가 필요합니다.');
      break;
    case 403:
      toast.error('권한이 없습니다.');
      break;
    case 409:
      toast('다른 사용자가 처리 중입니다. 잠시 후 다시 시도해주세요.');
      break;
    default:
      toast.error(message ?? '서버 오류가 발생했습니다.');
      break;
  }
}

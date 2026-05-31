/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';

// 로딩 화면을 위한 간단한 컴포넌트
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-4 border-gray-200 border-t-primary-500 rounded-full animate-spin" />
  </div>
);

// Lazy Loading 적용 (컴포넌트 선언만 하여 lint 에러 방지)
const HomePageComp = lazy(() => import('../pages/HomePage').then(module => ({ default: module.HomePage })));
const LoginPageComp = lazy(() => import('../pages/LoginPage').then(module => ({ default: module.LoginPage })));
const SignupPageComp = lazy(() => import('../pages/SignupPage').then(module => ({ default: module.SignupPage })));
const ForgotPasswordPageComp = lazy(() => import('../pages/ForgotPasswordPage').then(module => ({ default: module.ForgotPasswordPage })));
const MapPageComp = lazy(() => import('../pages/MapPage').then(module => ({ default: module.MapPage })));
const PaymentPageComp = lazy(() => import('../pages/PaymentPage').then(module => ({ default: module.PaymentPage })));
const PaymentSuccessPageComp = lazy(() => import('../pages/PaymentSuccessPage').then(module => ({ default: module.PaymentSuccessPage })));
const ProfilePageComp = lazy(() => import('../pages/ProfilePage').then(module => ({ default: module.ProfilePage })));
const TripPageComp = lazy(() => import('../pages/TripPage').then(module => ({ default: module.TripPage })));
const KakaoCallbackComp = lazy(() => import('../pages/KakaoCallback').then(module => ({ default: module.KakaoCallback })));
const GoogleCallbackComp = lazy(() => import('../pages/GoogleCallback').then(module => ({ default: module.GoogleCallback })));
const ProfileSettingsPageComp = lazy(() => import('../pages/ProfileSettingsPage').then(module => ({ default: module.ProfileSettingsPage })));
const ManagePassPageComp = lazy(() => import('../pages/ManagePassPage').then(module => ({ default: module.ManagePassPage })));
const SupportPageComp = lazy(() => import('../pages/SupportPage').then(module => ({ default: module.SupportPage })));
const NotificationSettingsPageComp = lazy(() => import('../pages/NotificationSettingsPage').then(module => ({ default: module.NotificationSettingsPage })));
const TripHistoryPageComp = lazy(() => import('../pages/TripHistoryPage').then(module => ({ default: module.TripHistoryPage })));
const LandingPageComp = lazy(() => import('../pages/LandingPage').then(module => ({ default: module.LandingPage })));
const ProfileFavoritesPageComp = lazy(() => import('../pages/ProfileFavoritesPage').then(module => ({ default: module.ProfileFavoritesPage })));
const InquiryPageComp = lazy(() => import('../pages/InquiryPage').then(module => ({ default: module.InquiryPage })));
const NewInquiryPageComp = lazy(() => import('../pages/NewInquiryPage').then(module => ({ default: module.NewInquiryPage })));
const InquiryDetailPageComp = lazy(() => import('../pages/InquiryDetailPage').then(module => ({ default: module.InquiryDetailPage })));

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { 
        element: (
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        ),
        children: [
          { index: true, element: <LandingPageComp /> },
          { path: 'home', element: <HomePageComp /> },
          { path: 'login', element: <LoginPageComp /> },
          { path: 'signup', element: <SignupPageComp /> },
          { path: 'forgot-password', element: <ForgotPasswordPageComp /> },
          { path: 'auth/kakao/callback', element: <KakaoCallbackComp /> },
          { path: 'auth/google/callback', element: <GoogleCallbackComp /> },
          { path: 'map', element: <MapPageComp /> },
          { path: 'trip', element: <TripPageComp /> },
          { path: 'payment', element: <PaymentPageComp /> },
          { path: 'payment/success', element: <PaymentSuccessPageComp /> },
          { path: 'profile', element: <ProfilePageComp /> },
          { path: 'profile/history', element: <TripHistoryPageComp /> },
          { path: 'profile/favorites', element: <ProfileFavoritesPageComp /> },
          { path: 'profile/settings', element: <ProfileSettingsPageComp /> },
          { path: 'profile/settings/notifications', element: <NotificationSettingsPageComp /> },
          { path: 'profile/pass', element: <ManagePassPageComp /> },
          { path: 'profile/support', element: <SupportPageComp /> },
          { path: 'profile/support/inquiry', element: <InquiryPageComp /> },
          { path: 'profile/support/inquiry/new', element: <NewInquiryPageComp /> },
          { path: 'profile/support/inquiry/:id', element: <InquiryDetailPageComp /> },
        ]
      }
    ],
  },
]);

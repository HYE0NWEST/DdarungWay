import { lazy, Suspense } from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';

// 로딩 화면을 위한 간단한 컴포넌트
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-4 border-gray-200 border-t-primary-500 rounded-full animate-spin" />
  </div>
);

// Lazy Loading 적용
const HomePage = lazy(() => import('../pages/HomePage').then(module => ({ default: module.HomePage })));
const LoginPage = lazy(() => import('../pages/LoginPage').then(module => ({ default: module.LoginPage })));
const SignupPage = lazy(() => import('../pages/SignupPage').then(module => ({ default: module.SignupPage })));
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage').then(module => ({ default: module.ForgotPasswordPage })));
const MapPage = lazy(() => import('../pages/MapPage').then(module => ({ default: module.MapPage })));
const PaymentPage = lazy(() => import('../pages/PaymentPage').then(module => ({ default: module.PaymentPage })));
const ProfilePage = lazy(() => import('../pages/ProfilePage').then(module => ({ default: module.ProfilePage })));
const TripPage = lazy(() => import('../pages/TripPage').then(module => ({ default: module.TripPage })));
const KakaoCallback = lazy(() => import('../pages/KakaoCallback').then(module => ({ default: module.KakaoCallback })));
const GoogleCallback = lazy(() => import('../pages/GoogleCallback').then(module => ({ default: module.GoogleCallback })));
const ProfileSettingsPage = lazy(() => import('../pages/ProfileSettingsPage').then(module => ({ default: module.ProfileSettingsPage })));
const ManagePassPage = lazy(() => import('../pages/ManagePassPage').then(module => ({ default: module.ManagePassPage })));
const SupportPage = lazy(() => import('../pages/SupportPage').then(module => ({ default: module.SupportPage })));
const NotificationSettingsPage = lazy(() => import('../pages/NotificationSettingsPage').then(module => ({ default: module.NotificationSettingsPage })));
const TripHistoryPage = lazy(() => import('../pages/TripHistoryPage').then(module => ({ default: module.TripHistoryPage })));
const LandingPage = lazy(() => import('../pages/LandingPage').then(module => ({ default: module.LandingPage })));
const ProfileFavoritesPage = lazy(() => import('../pages/ProfileFavoritesPage').then(module => ({ default: module.ProfileFavoritesPage })));

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
          { index: true, element: <LandingPage /> },
          { path: 'home', element: <HomePage /> },
          { path: 'login', element: <LoginPage /> },
          { path: 'signup', element: <SignupPage /> },
          { path: 'forgot-password', element: <ForgotPasswordPage /> },
          { path: 'auth/kakao/callback', element: <KakaoCallback /> },
          { path: 'auth/google/callback', element: <GoogleCallback /> },
          { path: 'map', element: <MapPage /> },
          { path: 'trip', element: <TripPage /> },
          { path: 'payment', element: <PaymentPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'profile/history', element: <TripHistoryPage /> },
          { path: 'profile/favorites', element: <ProfileFavoritesPage /> },
          { path: 'profile/settings', element: <ProfileSettingsPage /> },
          { path: 'profile/settings/notifications', element: <NotificationSettingsPage /> },
          { path: 'profile/pass', element: <ManagePassPage /> },
          { path: 'profile/support', element: <SupportPage /> },
        ]
      }
    ],
  },
]);

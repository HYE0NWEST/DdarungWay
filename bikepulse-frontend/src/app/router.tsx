import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { MapPage } from '../pages/MapPage';
import { PaymentPage } from '../pages/PaymentPage';
import { ProfilePage } from '../pages/ProfilePage';
import { TripPage } from '../pages/TripPage';
import { KakaoCallback } from '../pages/KakaoCallback';
import { GoogleCallback } from '../pages/GoogleCallback';
import { ProfileSettingsPage } from '../pages/ProfileSettingsPage';
import { ManagePassPage } from '../pages/ManagePassPage';
import { SupportPage } from '../pages/SupportPage';
import { NotificationSettingsPage } from '../pages/NotificationSettingsPage';
import { TripHistoryPage } from '../pages/TripHistoryPage';
import { LandingPage } from '../pages/LandingPage';
import { HomePage } from '../pages/HomePage';
import { ProfileFavoritesPage } from '../pages/ProfileFavoritesPage';

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: '/home', element: <HomePage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
      { path: '/auth/kakao/callback', element: <KakaoCallback /> },
      { path: '/auth/google/callback', element: <GoogleCallback /> },
      { path: '/map', element: <MapPage /> },
      { path: '/trip', element: <TripPage /> },
      { path: '/payment', element: <PaymentPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/profile/history', element: <TripHistoryPage /> },
      { path: '/profile/favorites', element: <ProfileFavoritesPage /> },
      { path: '/profile/settings', element: <ProfileSettingsPage /> },
      { path: '/profile/settings/notifications', element: <NotificationSettingsPage /> },
      { path: '/profile/pass', element: <ManagePassPage /> },
      { path: '/profile/support', element: <SupportPage /> },
    ],
  },
]);


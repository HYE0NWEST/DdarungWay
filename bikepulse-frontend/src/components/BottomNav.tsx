import { NavLink } from 'react-router-dom';
import { Home, Map, Bike, CreditCard, User } from 'lucide-react';

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-200 flex justify-around items-center h-16 pb-safe z-50">
      <NavLink
        to="/home"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center w-full h-full transition-colors ${
            isActive ? 'text-primary-500' : 'text-gray-500 hover:text-primary-600'
          }`
        }
      >
        <Home size={24} />
        <span className="text-xs mt-1 font-medium">홈</span>
      </NavLink>

      <NavLink
        to="/map"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center w-full h-full transition-colors ${
            isActive ? 'text-primary-500' : 'text-gray-500 hover:text-primary-600'
          }`
        }
      >
        <Map size={24} />
        <span className="text-xs mt-1 font-medium">지도</span>
      </NavLink>

      <NavLink
        to="/trip"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center w-full h-full transition-colors ${
            isActive ? 'text-primary-500' : 'text-gray-500 hover:text-primary-600'
          }`
        }
      >
        <Bike size={24} />
        <span className="text-xs mt-1 font-medium">이용</span>
      </NavLink>

      <NavLink
        to="/payment"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center w-full h-full transition-colors ${
            isActive ? 'text-primary-500' : 'text-gray-500 hover:text-primary-600'
          }`
        }
      >
        <CreditCard size={24} />
        <span className="text-xs mt-1 font-medium">결제</span>
      </NavLink>

      <NavLink
        to="/profile"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center w-full h-full transition-colors ${
            isActive ? 'text-primary-500' : 'text-gray-500 hover:text-primary-600'
          }`
        }
      >
        <User size={24} />
        <span className="text-xs mt-1 font-medium">마이</span>
      </NavLink>
    </nav>
  );
}

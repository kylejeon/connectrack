
import { ReactNode, useEffect, useState } from 'react';

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const user = localStorage.getItem('user');
      if (user) {
        setIsAuthenticated(true);
      } else {
        // 로그인 페이지로 리다이렉트
        if (window.REACT_APP_NAVIGATE) {
          window.REACT_APP_NAVIGATE('/login');
        } else {
          // navigate가 아직 준비되지 않은 경우 잠시 후 다시 시도
          setTimeout(() => {
            if (window.REACT_APP_NAVIGATE) {
              window.REACT_APP_NAVIGATE('/login');
            } else {
              // navigate가 여전히 준비되지 않은 경우 window.location 사용
              window.location.href = '/login';
            }
          }, 100);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <i className="ri-loader-4-line animate-spin text-2xl text-blue-600"></i>
          <span className="text-gray-600">로딩 중...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

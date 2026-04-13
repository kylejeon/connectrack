
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // 외부 클릭 시 드롭다운 닫기
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      // 활동 로그 추가
      await supabase
        .from('activities')
        .insert({
          activity_type: '로그아웃',
          description: `${user?.name}님이 로그아웃했습니다.`,
          user_name: user?.name
        });
    } catch (error) {
      console.error('로그아웃 로그 추가 실패:', error);
    }

    // 로컬 스토리지에서 사용자 정보 제거
    localStorage.removeItem('user');
    
    // 로그인 페이지로 이동
    window.REACT_APP_NAVIGATE('/login');
  };

  const handleUserManagement = () => {
    setIsOpen(false);
    window.REACT_APP_NAVIGATE('/users');
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors"
      >
        <span className="text-white text-sm font-medium">
          {user.name?.charAt(0) || '사'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
          {/* 사용자 정보 */}
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email || user.username}</p>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
              user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {user.role === 'admin' ? '관리자' : '사용자'}
            </span>
          </div>

          {/* 메뉴 항목 */}
          {user.role === 'admin' && (
            <button
              onClick={handleUserManagement}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              <i className="ri-user-settings-line mr-2"></i>
              사용자 관리
            </button>
          )}
          
          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            <i className="ri-logout-circle-line mr-2"></i>
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}

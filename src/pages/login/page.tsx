
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', formData.username)
        .eq('password', formData.password)
        .single();

      if (error || !data) {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.');
        return;
      }

      // 로그인 성공 시 사용자 정보를 localStorage에 저장
      localStorage.setItem('user', JSON.stringify(data));
      
      // 활동 로그 추가
      await supabase
        .from('activities')
        .insert({
          activity_type: '로그인',
          description: `${data.name}님이 로그인했습니다.`,
          user_name: data.name
        });

      // 홈페이지로 이동
      window.REACT_APP_NAVIGATE('/');
    } catch (error) {
      console.error('로그인 오류:', error);
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <h1 className="text-4xl font-bold text-gray-900" style={{ fontFamily: '"Pacifico", serif' }}>
              ConnecTrack
            </h1>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            계정에 로그인
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            컴퓨터 관리 시스템에 로그인하세요
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                사용자명
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-9 00 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="사용자명"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-9 00 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="비밀번호"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-7   00 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {loading ? (
                <div className="flex items-center">
                  <i className="ri-loader-4-line animate-spin mr-2"></i>
                  로그인 중...
                </div>
              ) : (
                '로그인'
              )}
            </button>
          </div>

          <div className="text-center">
            <div className="text-sm text-gray-600">
              Support: qa_team@connecteve.com
            </div>
          </div>
        </form>

        {/* Footer */}
        <footer className="mt-8">
          <div className="text-center text-sm text-gray-500">
            ©2025 CONNECTEVE Co., Ltd. All right reserved.
          </div>
        </footer>
      </div>
    </div>
  );
}

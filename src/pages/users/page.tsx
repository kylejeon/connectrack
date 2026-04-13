
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import ProfileDropdown from '../../components/feature/ProfileDropdown';

interface User {
  id: number;
  username: string;
  password: string;
  role: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user',
    name: '',
    email: ''
  });

  // 현재 로그인한 사용자 정보
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    // 관리자가 아니면 홈으로 리다이렉트
    if (currentUser.role !== 'admin') {
      window.REACT_APP_NAVIGATE('/');
      return;
    }
    
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        // 사용자 수정
        const { error } = await supabase
          .from('users')
          .update({
            username: formData.username,
            password: formData.password,
            role: formData.role,
            name: formData.name,
            email: formData.email,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingUser.id);

        if (error) throw error;

        // 활동 로그 추가
        await supabase
          .from('activities')
          .insert({
            activity_type: '사용자 수정',
            description: `사용자 "${formData.name}"이 수정되었습니다.`,
            user_name: currentUser.name
          });
      } else {
        // 새 사용자 추가
        const { error } = await supabase
          .from('users')
          .insert({
            username: formData.username,
            password: formData.password,
            role: formData.role,
            name: formData.name,
            email: formData.email
          });

        if (error) throw error;

        // 활동 로그 추가
        await supabase
          .from('activities')
          .insert({
            activity_type: '사용자 추가',
            description: `새 사용자 "${formData.name}"이 추가되었습니다.`,
            user_name: currentUser.name
          });
      }

      await fetchUsers();
      handleCloseModal();
    } catch (error) {
      console.error('사용자 저장 실패:', error);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: user.password,
      role: user.role,
      name: user.name,
      email: user.email || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`"${user.name}" 사용자를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (error) throw error;

      // 활동 로그 추가
      await supabase
        .from('activities')
        .insert({
          activity_type: '사용자 삭제',
          description: `사용자 "${user.name}"이 삭제되었습니다.`,
          user_name: currentUser.name
        });

      await fetchUsers();
    } catch (error) {
      console.error('사용자 삭제 실패:', error);
    }
  };

  const handleAddNew = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      role: 'user',
      name: '',
      email: ''
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      role: 'user',
      name: '',
      email: ''
    });
  };

  const getRoleColor = (role: string) => {
    return role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
  };

  const getRoleText = (role: string) => {
    return role === 'admin' ? '관리자' : '사용자';
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => window.REACT_APP_NAVIGATE('/')}
                className="text-2xl font-bold text-gray-900 cursor-pointer"
                style={{ fontFamily: '"Pacifico", serif' }}
              >
                ConnecTrack
              </button>
            </div>
            <nav className="flex space-x-8">
              <button 
                onClick={() => window.REACT_APP_NAVIGATE('/')}
                className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium cursor-pointer whitespace-nowrap"
              >
                대시보드
              </button>
              <button 
                onClick={() => window.REACT_APP_NAVIGATE('/inventory')}
                className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium cursor-pointer whitespace-nowrap"
              >
                재고 관리
              </button>
              <button 
                onClick={() => window.REACT_APP_NAVIGATE('/installation')}
                className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium cursor-pointer whitespace-nowrap"
              >
                설치 관리
              </button>
              <button 
                onClick={() => window.REACT_APP_NAVIGATE('/orders')}
                className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium cursor-pointer whitespace-nowrap"
              >
                발주 관리
              </button>
              <button className="text-blue-600 hover:text-blue-700 px-3 py-2 text-sm font-medium whitespace-nowrap">
                사용자 관리
              </button>
            </nav>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-500 cursor-pointer">
                <i className="ri-notification-line text-xl"></i>
              </button>
              <ProfileDropdown />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">사용자 관리</h2>
              <button
                onClick={handleAddNew}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 cursor-pointer whitespace-nowrap"
              >
                <i className="ri-add-line mr-2"></i>
                새 사용자 추가
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사용자 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    아이디
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    권한
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이메일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    가입일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {user.name.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {getRoleText(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        <i className="ri-edit-line mr-1"></i>
                        수정
                      </button>
                      {user.username !== 'admin' && (
                        <button
                          onClick={() => handleDelete(user)}
                          className="text-red-600 hover:text-red-700 cursor-pointer"
                        >
                          <i className="ri-delete-bin-line mr-1"></i>
                          삭제
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="text-center py-8">
              <i className="ri-user-line text-4xl text-gray-300 mb-4"></i>
              <p className="text-gray-500">등록된 사용자가 없습니다.</p>
            </div>
          )}
        </div>

        {/* 사용자 추가/수정 모달 */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingUser ? '사용자 수정' : '새 사용자 추가'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="사용자 이름을 입력하세요"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">사용자명</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="로그인 아이디를 입력하세요"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="비밀번호를 입력하세요"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">권한</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">사용자</option>
                    <option value="admin">관리자</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="이메일을 입력하세요 (선택사항)"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer whitespace-nowrap"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer whitespace-nowrap"
                  >
                    {editingUser ? '수정' : '추가'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm text-gray-500">
            ©2025 CONNECTEVE Co., Ltd. All right reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

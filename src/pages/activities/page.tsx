
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import ProfileDropdown from '../../components/feature/ProfileDropdown'

export default function Activities() {
  const [activities, setActivities] = useState([])
  const [filteredActivities, setFilteredActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  // 알림 관련 상태 추가
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [lastReadTime, setLastReadTime] = useState<string | null>(null)

  useEffect(() => {
    fetchActivities()
    fetchNotifications() // 알림 데이터 로드 추가

    // 로컬 스토리지에서 마지막 읽음 시간 가져오기
    const savedLastReadTime = localStorage.getItem('notifications_last_read')
    if (savedLastReadTime) {
      setLastReadTime(savedLastReadTime)
    }
  }, [])

  useEffect(() => {
    filterActivities()
  }, [activities, searchText, typeFilter, dateFilter])

  // 알림 데이터를 가져오는 함수 추가
  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .not('activity_type', 'in', '("로그인","로그아웃")')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      // 현재 로그인한 사용자 정보 가져오기
      const userData = localStorage.getItem('user');
      const currentUser = userData ? JSON.parse(userData) : null;

      // 마지막 읽음 시간 이후의 활동만 알림으로 처리하고, 본인이 수행한 활동은 제외
      const savedLastReadTime = localStorage.getItem('notifications_last_read')
      const lastRead = savedLastReadTime ? new Date(savedLastReadTime) : new Date(0)

      const recentNotifications = (data || []).filter(activity => {
        const activityDate = new Date(activity.created_at)
        return activityDate > lastRead && activity.user_name !== currentUser?.name;
      })

      setNotifications(recentNotifications)
      setUnreadCount(recentNotifications.length)
    } catch (error) {
      console.error('알림 데이터 로드 실패:', error)
    }
  }

  // 알림 토글 함수 추가
  const toggleNotifications = () => {
    setShowNotifications(!showNotifications)
    if (!showNotifications) {
      // 알림을 열 때 현재 시간을 마지막 읽음 시간으로 저장
      const currentTime = new Date().toISOString()
      localStorage.setItem('notifications_last_read', currentTime)
      setLastReadTime(currentTime)
      setUnreadCount(0)
    }
  }

  // "전체 보기" 클릭 시 읽음 처리 함수 추가
  const handleViewAllNotifications = () => {
    const currentTime = new Date().toISOString()
    localStorage.setItem('notifications_last_read', currentTime)
    setLastReadTime(currentTime)
    setUnreadCount(0)
    // 이미 활동 로그 페이지이므로 새로고침
    window.location.reload()
  }

  const filterActivities = () => {
    let filtered = activities

    // 유형 필터
    if (typeFilter) {
      filtered = filtered.filter(activity => activity.activity_type === typeFilter)
    }

    // 텍스트 검색
    if (searchText) {
      const searchLower = searchText.toLowerCase()
      filtered = filtered.filter(activity =>
        activity.description.toLowerCase().includes(searchLower) ||
        activity.activity_type.toLowerCase().includes(searchLower) ||
        activity.user_name.toLowerCase().includes(searchLower)
      )
    }

    setFilteredActivities(filtered)
  }

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .not('activity_type', 'in', '("로그인","로그아웃")')
        .order('created_at', { ascending: false })

      if (error) throw error
      setActivities(data || [])
    } catch (error) {
      console.error('활동 데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 활동 설명에서 활동 유형을 추출하는 함수
  const extractActionFromDescription = (description: string) => {
    if (description.includes('추가되었습니다') || description.includes('재고에 추가')) return '재고 추가'
    if (description.includes('삭제되었습니다') || description.includes('재고에서 삭제')) return '재고 삭제'
    if (description.includes('상태가') && description.includes('변경되었습니다')) return '상태 변경'
    if (description.includes('설치가 등록되었습니다') || description.includes('설치가 완료되었습니다')) return '설치 등록'
    if (description.includes('회수되어') || description.includes('회수가 예약되었습니다')) return '회수 처리'
    if (description.includes('발주가 등록되었습니다') || description.includes('발주')) return '발주 등록'
    if (description.includes('로그인')) return '로그인'
    return '기타'
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case '발주 등록':
        return 'ri-shopping-cart-line'
      case '발주 수정':
        return 'ri-edit-line'
      case '발주 삭제':
        return 'ri-delete-bin-line'
      case '배송 완료':
        return 'ri-check-double-line'
      case '재고 입고':
        return 'ri-add-box-line'
      case '재고 출고':
        return 'ri-subtract-line'
      case '재고 추가':
        return 'ri-add-box-line'
      case '재고 삭제':
        return 'ri-delete-bin-line'
      case '설치 등록':
        return 'ri-add-circle-line'
      case '설치 수정':
        return 'ri-edit-line'
      case '설치 완료':
        return 'ri-checkbox-multiple-line'
      case '회수 완료':
        return 'ri-checkbox-circle-line'
      default:
        return 'ri-information-line'
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case '발주 등록':
        return 'bg-blue-100 text-blue-800'
      case '발주 수정':
        return 'bg-yellow-100 text-yellow-800'
      case '발주 삭제':
        return 'bg-red-100 text-red-800'
      case '배송 완료':
        return 'bg-green-100 text-green-800'
      case '재고 입고':
        return 'bg-green-100 text-green-800'
      case '재고 출고':
        return 'bg-orange-100 text-orange-800'
      case '재고 추가':
        return 'bg-green-100 text-green-800'
      case '재고 삭제':
        return 'bg-red-100 text-red-800'
      case '설치 등록':
        return 'bg-blue-100 text-blue-800'
      case '설치 수정':
        return 'bg-yellow-100 text-yellow-800'
      case '설치 완료':
        return 'bg-green-100 text-green-800'
      case '회수 완료':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">데이터를 불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: '"Pacifico", serif' }}>
                ConnecTrack
              </h1>
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
                활동 로그
              </button>
            </nav>
            <div className="flex items-center space-x-4">
              {/* 알림 버튼 추가 */}
              <div className="relative">
                <button
                  onClick={toggleNotifications}
                  className="p-2 text-gray-400 hover:text-gray-500 cursor-pointer relative"
                >
                  <i className="ri-notification-line text-xl"></i>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* 알림 드롭다운 */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-gray-900">최근 알림</h3>
                        <button
                          onClick={handleViewAllNotifications}
                          className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
                        >
                          새로고침
                        </button>
                      </div>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {notifications.length > 0 ? (
                        notifications.map((notification: any) => (
                          <div key={notification.id} className="px-4 py-3 hover:bg-gray-50">
                            <div className="flex items-start space-x-3">
                              <div className={`p-1.5 rounded-lg ${getActivityColor(notification.activity_type)}`}>
                                <i className={`${getActivityIcon(notification.activity_type)} text-sm`}></i>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 line-clamp-2">{notification.description}</p>
                                <div className="mt-1 flex items-center space-x-2">
                                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getActivityColor(notification.activity_type)}`}>
                                    {notification.activity_type}
                                  </span>
                                  <span className="text-xs text-gray-500">•</span>
                                  <span className="text-xs text-gray-500">{formatDate(notification.created_at)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center">
                          <i className="ri-notification-off-line text-3xl text-gray-300 mb-2"></i>
                          <p className="text-sm text-gray-500">새로운 알림이 없습니다</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <ProfileDropdown />
            </div>
          </div>
        </div>
      </header>

      {/* 알림 드롭다운이 열려있을 때 배경 클릭으로 닫기 */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        ></div>
      )}

      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">시스템 활동</h1>
              <p className="mt-1 text-sm text-gray-500">시스템 활동 로그를 확인합니다</p>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 검색 및 필터 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">텍스트 검색</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="활동 내용, 유형, 사용자명으로 검색..."
                />
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>
            </div>
            <div className="lg:w-40">
              <label className="block text-sm font-medium text-gray-700 mb-2">유형 필터</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">전체</option>
                <option value="발주 등록">발주 등록</option>
                <option value="발주 수정">발주 수정</option>
                <option value="발주 삭제">발주 삭제</option>
                <option value="배송 완료">배송 완료</option>
                <option value="재고 출고">재고 출고</option>
                <option value="재고 추가">재고 추가</option>
                <option value="재고 삭제">재고 삭제</option>
                <option value="설치 등록">설치 등록</option>
                <option value="설치 수정">설치 수정</option>
                <option value="설치 완료">설치 완료</option>
                <option value="회수 완료">회수 완료</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchText('')
                  setTypeFilter('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer whitespace-nowrap"
              >
                <i className="ri-refresh-line mr-2"></i>
                초기화
              </button>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            총 {activities.length}개 중 {filteredActivities.length}개 표시
          </div>
        </div>

        {/* 활동 로그 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">최근 활동</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredActivities.map((activity) => (
              <div key={activity.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg ${getActivityColor(activity.activity_type)}`}>
                    <i className={`${getActivityIcon(activity.activity_type)} text-lg`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                        <div className="mt-1 flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getActivityColor(activity.activity_type)}`}>
                            <i className={`${getActivityIcon(activity.activity_type)} mr-1`}></i>
                            {activity.activity_type}
                          </span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-500">{activity.user_name}</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(activity.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm text-gray-500">
            ©2025 CONNECTEVE Co., Ltd. All right reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

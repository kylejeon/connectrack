
import { useState, useEffect } from 'react'
import { supabase, type Computer } from '../../lib/supabase'
import ProfileDropdown from '../../components/feature/ProfileDropdown'

export default function Inventory() {
  const [computers, setComputers] = useState<Computer[]>([])
  const [filteredComputers, setFilteredComputers] = useState<Computer[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showInstallationDetailModal, setShowInstallationDetailModal] = useState(false)
  const [editingComputer, setEditingComputer] = useState<Computer | null>(null)
  const [selectedComputerInstallation, setSelectedComputerInstallation] = useState<any>(null)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // 알림 관련 상태 추가
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [lastReadTime, setLastReadTime] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    serial_number: '',
    cpu: '',
    ram: '',
    storage: '',
    location: '',
    status: '사용가능' as Computer['status']
  })

  // 현재 로그인한 사용자 정보 추가
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    fetchComputers()
    fetchNotifications() // 알림 데이터 로드 추가

    // 로컬 스토리지에서 마지막 읽음 시간 가져오기
    const savedLastReadTime = localStorage.getItem('notifications_last_read')
    if (savedLastReadTime) {
      setLastReadTime(savedLastReadTime)
    }
  }, [])

  useEffect(() => {
    filterComputers()
  }, [computers, searchText, statusFilter])

  // 알림 데이터를 가져오는 함수 추가
  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      // 마지막 읽음 시간 이후의 활동만 알림으로 처리
      const savedLastReadTime = localStorage.getItem('notifications_last_read')
      const lastRead = savedLastReadTime ? new Date(savedLastReadTime) : new Date(0)

      const recentNotifications = (data || []).filter(activity => {
        const activityDate = new Date(activity.created_at)
        return activityDate > lastRead
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
    window.REACT_APP_NAVIGATE('/activities')
  }

  // 활동 유형별 아이콘 가져오기 함수 추가
  const getActivityIcon = (type: string) => {
    switch (type) {
      case '재고 추가': return 'ri-add-box-line'
      case '재고 삭제': return 'ri-delete-bin-line'
      case '설치 등록': return 'ri-tools-line'
      case '설치 수정': return 'ri-edit-line'
      case '설치 완료': return 'ri-checkbox-multiple-line'
      case '회수 예약': return 'ri-calendar-schedule-line'
      case '회수 완료': return 'ri-checkbox-circle-line'
      case '발주 등록': return 'ri-shopping-cart-line'
      case '발주 수정': return 'ri-edit-2-line'
      case '발주 상태 변경': return 'ri-refresh-line'
      case '입고 완료': return 'ri-truck-line'
      case '배송 완료': return 'ri-check-double-line'
      case '사용자 추가': return 'ri-user-add-line'
      case '로그인': return 'ri-login-circle-line'
      case '로그아웃': return 'ri-logout-circle-line'
      default: return 'ri-information-line'
    }
  }

  // 활동 유형별 색상 가져오기 함수 추가
  const getActivityColor = (type: string) => {
    switch (type) {
      case '재고 추가': return 'text-blue-600 bg-blue-100'
      case '재고 삭제': return 'text-red-600 bg-red-100'
      case '설치 등록': return 'text-green-600 bg-green-100'
      case '설치 수정': return 'text-green-600 bg-green-100'
      case '설치 완료': return 'text-green-600 bg-green-100'
      case '회수 예약': return 'text-yellow-600 bg-yellow-100'
      case '회수 완료': return 'text-green-600 bg-green-100'
      case '발주 등록': return 'text-purple-600 bg-purple-100'
      case '발주 수정': return 'text-purple-600 bg-purple-100'
      case '발주 상태 변경': return 'text-purple-600 bg-purple-100'
      case '입고 완료': return 'text-indigo-600 bg-indigo-100'
      case '배송 완료': return 'text-teal-600 bg-teal-100'
      case '사용자 추가': return 'text-pink-600 bg-pink-100'
      case '로그인': return 'text-orange-600 bg-orange-100'
      case '로그아웃': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  // 날짜 포맷팅 함수 추가
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filterComputers = () => {
    let filtered = computers

    // 상태 필터
    if (statusFilter) {
      filtered = filtered.filter(computer => computer.status === statusFilter)
    }

    // 텍스트 검색
    if (searchText) {
      const searchLower = searchText.toLowerCase()
      filtered = filtered.filter(computer => 
        computer.brand.toLowerCase().includes(searchLower) ||
        computer.model.toLowerCase().includes(searchLower) ||
        computer.serial_number.toLowerCase().includes(searchLower) ||
        computer.cpu.toLowerCase().includes(searchLower) ||
        computer.ram.toLowerCase().includes(searchLower) ||
        computer.storage.toLowerCase().includes(searchLower) ||
        computer.location.toLowerCase().includes(searchLower)
      )
    }

    setFilteredComputers(filtered)
  }

  const fetchComputers = async () => {
    try {
      const { data, error } = await supabase
        .from('computers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setComputers(data || [])
    } catch (error) {
      console.error('컴퓨터 데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (computer: Computer) => {
    setEditingComputer(computer)
    setFormData({
      brand: computer.brand,
      model: computer.model,
      serial_number: computer.serial_number,
      cpu: computer.cpu,
      ram: computer.ram,
      storage: computer.storage,
      location: computer.location,
      status: computer.status
    })
    setShowEditModal(true)
  }

  const handleAdd = () => {
    setFormData({
      brand: '',
      model: '',
      serial_number: '',
      cpu: '',
      ram: '',
      storage: '',
      location: '창고',
      status: '사용가능'
    })
    setShowAddModal(true)
  }

  const handleSave = async () => {
    if (!editingComputer) return

    try {
      const { error } = await supabase
        .from('computers')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingComputer.id)

      if (error) throw error

      // 상태가 '수리중' 또는 '폐기'로 변경된 경우 활동 로그 추가
      if (formData.status !== editingComputer.status && (formData.status === '수리중' || formData.status === '폐기')) {
        await supabase
          .from('activities')
          .insert({
            activity_type: '재고관리',
            description: `${editingComputer.brand} ${editingComputer.model} (S/N: ${editingComputer.serial_number})의 상태가 ${formData.status}로 변경되었습니다`,
            user_name: '관리자'
          })
      }

      await fetchComputers()
      setShowEditModal(false)
      setEditingComputer(null)
    } catch (error) {
      console.error('컴퓨터 정보 수정 실패:', error)
    }
  }

  const handleAddComputer = async () => {
    try {
      const { error } = await supabase
        .from('computers')
        .insert(formData)

      if (error) throw error

      // 활동 로그 추가
      await supabase
        .from('activities')
        .insert({
          activity_type: '재고 추가',
          description: `새 컴퓨터가 재고에 추가되었습니다: ${formData.brand} ${formData.model} (S/N: ${formData.serial_number})`,
          user_name: '관리자'
        })

      await fetchComputers()
      setShowAddModal(false)
    } catch (error) {
      console.error('컴퓨터 추가 실패:', error)
    }
  }

  const handleDelete = async (computerId: number) => {
    if (!confirm('정말로 이 컴퓨터를 삭제하시겠습니까?')) return

    try {
      // 설치 중인 컴퓨터인지 확인
      const { data: installations } = await supabase
        .from('installations')
        .select('*')
        .eq('computer_id', computerId)
        .in('status', ['설치중', '설치완료'])

      if (installations && installations.length > 0) {
        alert('설치 중이거나 설치 완료된 컴퓨터는 삭제할 수 없습니다.')
        return
      }

      // 삭제할 컴퓨터 정보 가져오기
      const computerToDelete = computers.find(c => c.id === computerId)

      const { error } = await supabase
        .from('computers')
        .delete()
        .eq('id', computerId)

      if (error) throw error

      // 활동 로그 추가
      await supabase
        .from('activities')
        .insert({
          activity_type: '재고 삭제',
          description: `컴퓨터가 재고에서 삭제되었습니다: ${computerToDelete?.brand} ${computerToDelete?.model} (S/N: ${computerToDelete?.serial_number})`,
          user_name: '관리자'
        })

      await fetchComputers()
    } catch (error) {
      console.error('컴퓨터 삭제 실패:', error)
    }
  }

  const fetchInstallationDetail = async (computerId: number) => {
    try {
      const { data, error } = await supabase
        .from('installations')
        .select(`
          *,
          computers (
            brand,
            model,
            serial_number,
            cpu,
            ram,
            storage
          )
        `)
        .eq('computer_id', computerId)
        .in('status', ['설치중', '설치완료', '회수예정'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) throw error
      setSelectedComputerInstallation(data)
      setShowInstallationDetailModal(true)
    } catch (error) {
      console.error('설치 정보 로드 실패:', error)
      alert('설치 정보를 찾을 수 없습니다.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case '사용가능': return 'text-green-600 bg-green-100'
      case '사용중': return 'text-blue-600 bg-blue-100'
      case '수리중': return 'text-yellow-600 bg-yellow-100'
      case '폐기': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getPurposeColor = (purpose: string) => {
    switch (purpose) {
      case '데모': return 'text-purple-600 bg-purple-100'
      case '연구': return 'text-green-600 bg-green-100'
      case '과제': return 'text-blue-600 bg-blue-100'
      case '계약': return 'text-orange-600 bg-orange-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getInstallationStatusColor = (status: string) => {
    switch (status) {
      case '설치완료': return 'text-green-600 bg-green-100'
      case '설치중': return 'text-blue-600 bg-blue-100'
      case '회수완료': return 'text-gray-600 bg-gray-100'
      case '회수예정': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
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
              <button className="text-blue-600 hover:text-blue-700 px-3 py-2 text-sm font-medium whitespace-nowrap">
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
              <button 
                onClick={() => window.REACT_APP_NAVIGATE('/activities')}
                className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium cursor-pointer whitespace-nowrap"
              >
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
                          전체 보기
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
              <h1 className="text-2xl font-bold text-gray-900">재고 관리</h1>
              <p className="mt-1 text-sm text-gray-500">컴퓨터 재고 현황을 관리합니다</p>
            </div>
            <button 
              onClick={handleAdd}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 whitespace-nowrap cursor-pointer"
            >
              <i className="ri-add-line mr-2"></i>
              새 재고 추가
            </button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <i className="ri-computer-line text-blue-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">전체 재고</p>
                <p className="text-2xl font-bold text-gray-900">{computers.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <i className="ri-check-line text-green-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">사용가능</p>
                <p className="text-2xl font-bold text-gray-900">
                  {computers.filter(c => c.status === '사용가능').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <i className="ri-play-line text-blue-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">사용중</p>
                <p className="text-2xl font-bold text-gray-900">
                  {computers.filter(c => c.status === '사용중').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <i className="ri-tools-line text-yellow-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">수리중</p>
                <p className="text-2xl font-bold text-gray-900">
                  {computers.filter(c => c.status === '수리중').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <i className="ri-close-line text-red-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">폐기</p>
                <p className="text-2xl font-bold text-gray-900">
                  {computers.filter(c => c.status === '폐기').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">텍스트 검색</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="브랜드, 모델, 시리얼번호, 사양 등으로 검색..."
                />
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>
            </div>
            <div className="md:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">상태 필터</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체 상태</option>
                <option value="사용가능">사용가능</option>
                <option value="사용중">사용중</option>
                <option value="수리중">수리중</option>
                <option value="폐기">폐기</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchText('')
                  setStatusFilter('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer whitespace-nowrap"
              >
                <i className="ri-refresh-line mr-2"></i>
                초기화
              </button>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            총 {computers.length}개 중 {filteredComputers.length}개 표시
          </div>
        </div>

        {/* 재고 테이블 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">재고 목록</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    브랜드/모델
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    시리얼 번호
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사양
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    위치
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredComputers.map((computer) => (
                  <tr key={computer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{computer.brand}</div>
                        <div className="text-sm text-gray-500">{computer.model}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {computer.serial_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{computer.cpu}</div>
                      <div className="text-sm text-gray-500">{computer.ram} / {computer.storage}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {computer.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(computer.status)}`}>
                        {computer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {computer.status === '사용중' && (
                        <button
                          onClick={() => fetchInstallationDetail(computer.id)}
                          className="text-green-600 hover:text-green-900 mr-4 cursor-pointer"
                        >
                          상세
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(computer)}
                        className="text-blue-600 hover:text-blue-900 mr-4 cursor-pointer"
                      >
                        수정
                      </button>
                      {currentUser.role === 'admin' && (
                        <button 
                          onClick={() => handleDelete(computer.id)}
                          className="text-red-600 hover:text-red-900 cursor-pointer"
                        >
                          삭제
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 설치 상세 정보 모달 */}
      {showInstallationDetailModal && selectedComputerInstallation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">설치 상세 정보</h3>
              <button
                onClick={() => setShowInstallationDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* 설치 기본 정보 */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">설치 기본 정보</h4>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">설치번호</label>
                    <p className="text-sm text-gray-900">{selectedComputerInstallation.installation_number}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">용도</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPurposeColor(selectedComputerInstallation.purpose)}`}>
                      {selectedComputerInstallation.purpose}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">설치일</label>
                    <p className="text-sm text-gray-900">{selectedComputerInstallation.installation_date}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">회수 예정일</label>
                    <p className="text-sm text-gray-900">{selectedComputerInstallation.return_date || '미정'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">상태</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getInstallationStatusColor(selectedComputerInstallation.status)}`}>
                      {selectedComputerInstallation.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">설치 담당자</label>
                    <p className="text-sm text-gray-900">{selectedComputerInstallation.technician}</p>
                  </div>
                </div>
              </div>

              {/* 컴퓨터 정보 */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">컴퓨터 정보</h4>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">브랜드</label>
                    <p className="text-sm text-gray-900">{selectedComputerInstallation.computers?.brand}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">모델</label>
                    <p className="text-sm text-gray-900">{selectedComputerInstallation.computers?.model}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">시리얼 번호</label>
                    <p className="text-sm text-gray-900">{selectedComputerInstallation.computers?.serial_number}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">CPU</label>
                    <p className="text-sm text-gray-900">{selectedComputerInstallation.computers?.cpu}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">RAM</label>
                    <p className="text-sm text-gray-900">{selectedComputerInstallation.computers?.ram}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">저장소</label>
                    <p className="text-sm text-gray-900">{selectedComputerInstallation.computers?.storage}</p>
                  </div>
                </div>
              </div>

              {/* 설치 사이트 정보 */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">설치 사이트 정보</h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">사이트명</label>
                    <p className="text-sm text-gray-900">{selectedComputerInstallation.site_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">주소</label>
                    <p className="text-sm text-gray-900">{selectedComputerInstallation.site_address}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">사이트 담당자</label>
                    <p className="text-sm text-gray-900">{selectedComputerInstallation.site_manager}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">연락처</label>
                    <p className="text-sm text-gray-900">{selectedComputerInstallation.site_contact}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowInstallationDetailModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer whitespace-nowrap"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 새 재고 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">새 재고 추가</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">브랜드</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="브랜드를 입력하세요"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">모델명</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="모델명을 입력하세요"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">시리얼 번호</label>
                <input
                  type="text"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="시리얼 번호를 입력하세요"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPU</label>
                <input
                  type="text"
                  value={formData.cpu}
                  onChange={(e) => setFormData({...formData, cpu: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="CPU 정보를 입력하세요"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RAM</label>
                  <input
                    type="text"
                    value={formData.ram}
                    onChange={(e) => setFormData({...formData, ram: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="예: 16GB"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">저장소</label>
                  <input
                    type="text"
                    value={formData.storage}
                    onChange={(e) => setFormData({...formData, storage: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="예: 512GB SSD"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">위치</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="보관 위치를 입력하세요"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as Computer['status']})}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="사용가능">사용가능</option>
                  <option value="사용중">사용중</option>
                  <option value="수리중">수리중</option>
                  <option value="폐기">폐기</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer whitespace-nowrap"
              >
                취소
              </button>
              <button
                onClick={handleAddComputer}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer whitespace-nowrap"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">재고 정보 수정</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">브랜드</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">모델명</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">시리얼 번호</label>
                <input
                  type="text"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPU</label>
                <input
                  type="text"
                  value={formData.cpu}
                  onChange={(e) => setFormData({...formData, cpu: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RAM</label>
                  <input
                    type="text"
                    value={formData.ram}
                    onChange={(e) => setFormData({...formData, ram: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">저장소</label>
                  <input
                    type="text"
                    value={formData.storage}
                    onChange={(e) => setFormData({...formData, storage: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">위치</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as Computer['status']})}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="사용가능">사용가능</option>
                  <option value="사용중">사용중</option>
                  <option value="수리중">수리중</option>
                  <option value="폐기">폐기</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer whitespace-nowrap"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer whitespace-nowrap"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

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

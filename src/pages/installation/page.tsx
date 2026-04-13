import { useState, useEffect } from 'react'
import { supabase, type Installation, type Computer } from '../../lib/supabase'
import ProfileDropdown from '../../components/feature/ProfileDropdown'

export default function Installation() {
  const [installations, setInstallations] = useState<Installation[]>([])
  const [filteredInstallations, setFilteredInstallations] = useState<Installation[]>([])
  const [computers, setComputers] = useState<Computer[]>([])
  const [loading, setLoading] = useState(true)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedInstallation, setSelectedInstallation] = useState<Installation | null>(null)
  const [editingInstallation, setEditingInstallation] = useState<Installation | null>(null)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [purposeFilter, setPurposeFilter] = useState('')

  // 알림 관련 상태 추가
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [lastReadTime, setLastReadTime] = useState<string | null>(null)

  const [newInstallationData, setNewInstallationData] = useState({
    computer_id: '',
    purpose: '',
    installation_date: '',
    return_date: '',
    technician: '',
    site_name: '',
    site_address: '',
    site_manager: '',
    site_contact: '',
    products: [] as string[]
  })
  const [editInstallationData, setEditInstallationData] = useState({
    purpose: '',
    installation_date: '',
    return_date: '',
    technician: '',
    site_name: '',
    site_address: '',
    site_manager: '',
    site_contact: '',
    products: [] as string[]
  })

  useEffect(() => {
    fetchInstallations()
    fetchAvailableComputers()
    fetchNotifications() // 알림 데이터 로드 추가

    // 로컬 스토리지에서 마지막 읽음 시간 가져오기
    const savedLastReadTime = localStorage.getItem('notifications_last_read')
    if (savedLastReadTime) {
      setLastReadTime(savedLastReadTime)
    }
  }, [])

  useEffect(() => {
    filterInstallations()
  }, [installations, searchText, statusFilter, purposeFilter])

  const filterInstallations = () => {
    let filtered = installations

    // 상태 필터
    if (statusFilter) {
      filtered = filtered.filter(installation => installation.status === statusFilter)
    }

    // 용도 필터
    if (purposeFilter) {
      filtered = filtered.filter(installation => installation.purpose === purposeFilter)
    }

    // 텍스트 검색
    if (searchText) {
      const searchLower = searchText.toLowerCase()
      filtered = filtered.filter(installation => 
        installation.installation_number.toLowerCase().includes(searchLower) ||
        installation.site_name.toLowerCase().includes(searchLower) ||
        installation.site_manager.toLowerCase().includes(searchLower) ||
        installation.technician.toLowerCase().includes(searchLower) ||
        installation.computers?.brand.toLowerCase().includes(searchLower) ||
        installation.computers?.model.toLowerCase().includes(searchLower) ||
        installation.computers?.serial_number.toLowerCase().includes(searchLower)
      )
    }

    setFilteredInstallations(filtered)
  }

  const fetchInstallations = async () => {
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
        .order('created_at', { ascending: false })

      if (error) throw error
      setInstallations(data || [])
    } catch (error) {
      console.error('설치 데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableComputers = async () => {
    try {
      const { data, error } = await supabase
        .from('computers')
        .select('*')
        .eq('status', '사용가능')
        .order('brand', { ascending: true })

      if (error) throw error
      setComputers(data || [])
    } catch (error) {
      console.error('사용가능한 컴퓨터 로드 실패:', error)
    }
  }

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

  const handleDetail = (installation: Installation) => {
    setSelectedInstallation(installation)
    setShowDetailModal(true)
  }

  const handleEdit = (installation: Installation) => {
    setEditingInstallation(installation)
    setEditInstallationData({
      purpose: installation.purpose,
      installation_date: installation.installation_date,
      return_date: installation.return_date || '',
      technician: installation.technician,
      site_name: installation.site_name,
      site_address: installation.site_address,
      site_manager: installation.site_manager,
      site_contact: installation.site_contact,
      products: installation.products ? installation.products.split(', ').filter(p => p.trim() !== '') : []
    })
    setShowEditModal(true)
  }

  const updateInstallationStatus = async (installationId: number, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('installations')
        .update({ status: newStatus })
        .eq('id', installationId)

      if (error) throw error

      // 현재 로그인한 사용자 정보 가져오기
      const userData = localStorage.getItem('user');
      const currentUser = userData ? JSON.parse(userData) : null;

      // 회수완료 시 컴퓨터 상태를 '사용가능'으로 변경하고 위치를 '창고'로 복원
      if (newStatus === '회수완료') {
        const installation = installations.find(i => i.id === installationId)
        if (installation) {
          await supabase
            .from('computers')
            .update({ status: '사용가능', location: '창고' })
            .eq('id', installation.computer_id)

          // 활동 로그 추가 - "회수 완료" 유형으로 변경
          await supabase
            .from('activities')
            .insert({
              activity_type: '회수 완료',
              description: `설치번호 ${installation.installation_number} - ${installation.site_name}의 ${installation.computers?.brand} ${installation.computers?.model} (S/N: ${installation.computers?.serial_number}) 장비가 회수되어 재고로 반환되었습니다`,
              user_name: currentUser?.name || '사용자'
            })
        }
      }

      // 설치완료 상태 변경 시 활동 로그 추가 - "설치 완료" 유형으로 변경
      if (newStatus === '설치완료') {
        const installation = installations.find(i => i.id === installationId)
        if (installation) {
          await supabase
            .from('activities')
            .insert({
              activity_type: '설치 완료',
              description: `설치번호 ${installation.installation_number} - ${installation.site_name}에 ${installation.computers?.brand} ${installation.computers?.model} (S/N: ${installation.computers?.serial_number}) 설치가 완료되었습니다`,
              user_name: currentUser?.name || '사용자'
            })
        }
      }

      await fetchInstallations()
      await fetchAvailableComputers()
    } catch (error) {
      console.error('설치 상태 업데이트 실패:', error)
    }
  }

  const handleAddInstallation = async () => {
    try {
      // 현재 년월 가져오기 (YYYYMM 형식)
      const now = new Date()
      const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`

      // 해당 월의 설치 개수 조회
      const { data: monthlyInstallations, error: countError } = await supabase
        .from('installations')
        .select('installation_number')
        .like('installation_number', `INST-${yearMonth}-%`)
        .order('created_at', { ascending: false })

      if (countError) throw countError

      // 다음 인덱스 계산
      const nextIndex = (monthlyInstallations?.length || 0) + 1
      const installationNumber = `INST-${yearMonth}-${String(nextIndex).padStart(3, '0')}`

      // 설치 등록
      const { error: installationError } = await supabase
        .from('installations')
        .insert({
          installation_number: installationNumber,
          computer_id: parseInt(newInstallationData.computer_id),
          purpose: newInstallationData.purpose,
          installation_date: newInstallationData.installation_date,
          return_date: newInstallationData.return_date || null,
          status: '설치중',
          technician: newInstallationData.technician,
          site_name: newInstallationData.site_name,
          site_address: newInstallationData.site_address,
          site_manager: newInstallationData.site_manager,
          site_contact: newInstallationData.site_contact,
          products: newInstallationData.products.join(', ')
        })

      if (installationError) throw installationError

      // 컴퓨터 상태를 '사용중'으로 변경하고 위치를 사이트명으로 업데이트
      const { error: computerError } = await supabase
        .from('computers')
        .update({ 
          status: '사용중',
          location: newInstallationData.site_name
        })
        .eq('id', parseInt(newInstallationData.computer_id))

      if (computerError) throw computerError

      // 선택된 컴퓨터 정보 가져오기
      const selectedComputer = computers.find(c => c.id === parseInt(newInstallationData.computer_id))

      // 현재 로그인한 사용자 정보 가져오기
      const userData = localStorage.getItem('user');
      const currentUser = userData ? JSON.parse(userData) : null;

      // 활동 로그 추가
      await supabase
        .from('activities')
        .insert({
          activity_type: '설치 등록',
          description: `설치번호 ${installationNumber} - ${newInstallationData.site_name}에 ${selectedComputer?.brand} ${selectedComputer?.model} (S/N: ${selectedComputer?.serial_number}) 설치가 등록되었습니다 (제품: ${newInstallationData.products.join(', ')})`,
          user_name: currentUser?.name || '사용자'
        })

      await fetchInstallations()
      await fetchAvailableComputers()
      setShowAddModal(false)
      setNewInstallationData({
        computer_id: '',
        purpose: '',
        installation_date: '',
        return_date: '',
        technician: '',
        site_name: '',
        site_address: '',
        site_manager: '',
        site_contact: '',
        products: []
      })
    } catch (error) {
      console.error('설치 등록 실패:', error)
    }
  }

  const handleUpdateInstallation = async () => {
    if (!editingInstallation) return

    try {
      const { error } = await supabase
        .from('installations')
        .update({
          purpose: editInstallationData.purpose,
          installation_date: editInstallationData.installation_date,
          return_date: editInstallationData.return_date || null,
          technician: editInstallationData.technician,
          site_name: editInstallationData.site_name,
          site_address: editInstallationData.site_address,
          site_manager: editInstallationData.site_manager,
          site_contact: editInstallationData.site_contact,
          products: editInstallationData.products.join(', '),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingInstallation.id)

      if (error) throw error

      // 현재 로그인한 사용자 정보 가져오기
      const userData = localStorage.getItem('user');
      const currentUser = userData ? JSON.parse(userData) : null;

      // 활동 로그 추가
      await supabase
        .from('activities')
        .insert({
          activity_type: '설치 수정',
          description: `설치번호 ${editingInstallation.installation_number} - ${editingInstallation.computers?.brand} ${editingInstallation.computers?.model} (S/N: ${editingInstallation.computers?.serial_number}) 설치 정보가 수정되었습니다`,
          user_name: currentUser?.name || '사용자'
        })

      await fetchInstallations()
      setShowEditModal(false)
      setEditingInstallation(null)
    } catch (error) {
      console.error('설치 정보 수정 실패:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case '설치완료':
        return 'text-green-600 bg-green-100'
      case '설치중':
        return 'text-blue-600 bg-blue-100'
      case '회수완료':
        return 'text-gray-600 bg-gray-100'
      case '회수예정':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getPurposeColor = (purpose: string) => {
    switch (purpose) {
      case '데모':
        return 'text-purple-600 bg-purple-100'
      case '연구':
        return 'text-green-600 bg-green-100'
      case '과제':
        return 'text-blue-600 bg-blue-100'
      case '계약':
        return 'text-orange-600 bg-orange-100'
      default:
        return 'text-gray-600 bg-gray-100'
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
                onClick={() => window.REACT_APP_NAVIGATE?.('/')}
                className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium cursor-pointer whitespace-nowrap"
              >
                대시보드
              </button>
              <button 
                onClick={() => window.REACT_APP_NAVIGATE?.('/inventory')}
                className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium cursor-pointer whitespace-nowrap"
              >
                재고 관리
              </button>
              <button className="text-blue-600 hover:text-blue-700 px-3 py-2 text-sm font-medium whitespace-nowrap">
                설치 관리
              </button>
              <button 
                onClick={() => window.REACT_APP_NAVIGATE?.('/orders')}
                className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium cursor-pointer whitespace-nowrap"
              >
                발주 관리
              </button>
              <button 
                onClick={() => window.REACT_APP_NAVIGATE?.('/activities')}
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

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">설치 관리</h1>
              <p className="mt-1 text-sm text-gray-500">컴퓨터 설치 현황을 관리합니다</p>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 whitespace-nowrap cursor-pointer"
            >
              <i className="ri-add-line mr-2"></i>
              새 설치 등록
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <i className="ri-computer-line text-blue-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">전체 설치</p>
                <p className="text-2xl font-bold text-gray-900">{installations.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <i className="ri-check-line text-green-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">설치완료</p>
                <p className="text-2xl font-bold text-gray-900">
                  {installations.filter(i => i.status === '설치완료').length}
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
                <p className="text-sm font-medium text-gray-500">설치중</p>
                <p className="text-2xl font-bold text-gray-900">
                  {installations.filter(i => i.status === '설치중').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <i className="ri-time-line text-yellow-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">회수예정</p>
                <p className="text-2xl font-bold text-gray-900">
                  {installations.filter(i => i.status === '회수예정').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
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
                  placeholder="설치번호, 사이트명, 담당자, 컴퓨터 정보 등으로 검색..."
                />
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>
            </div>
            <div className="lg:w-40">
              <label className="block text-sm font-medium text-gray-700 mb-2">상태 필터</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체 상태</option>
                <option value="설치중">설치중</option>
                <option value="설치완료">설치완료</option>
                <option value="회수예정">회수예정</option>
                <option value="회수완료">회수완료</option>
              </select>
            </div>
            <div className="lg:w-40">
              <label className="block text-sm font-medium text-gray-700 mb-2">용도 필터</label>
              <select
                value={purposeFilter}
                onChange={(e) => setPurposeFilter(e.target.value)}
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체 용도</option>
                <option value="데모">데모</option>
                <option value="연구">연구</option>
                <option value="과제">과제</option>
                <option value="계약">계약</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchText('')
                  setStatusFilter('')
                  setPurposeFilter('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer whitespace-nowrap"
              >
                <i className="ri-refresh-line mr-2"></i>
                초기화
              </button>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            총 {installations.length}개 중 {filteredInstallations.length}개 표시
          </div>
        </div>

        {/* Installation Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">설치 목록</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    설치번호
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    컴퓨터 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    설치 용도
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    설치 사이트
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    제품명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    설치일
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
                {filteredInstallations.map((installation) => (
                  <tr key={installation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{installation.installation_number}</div>
                        <div className="text-sm text-gray-500">담당자: {installation.technician}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {installation.computers?.brand} {installation.computers?.model}
                        </div>
                        <div className="text-sm text-gray-500">{installation.computers?.serial_number}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPurposeColor(installation.purpose)}`}>
                        {installation.purpose}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{installation.site_name}</div>
                        <div className="text-sm text-gray-500">{installation.site_manager}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {installation.products ? installation.products : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">{installation.installation_date}</div>
                        {installation.return_date && (
                          <div className="text-sm text-gray-500">회수: {installation.return_date}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={installation.status}
                        onChange={(e) => updateInstallationStatus(installation.id, e.target.value)}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border-none cursor-pointer pr-8 ${getStatusColor(installation.status)}`}
                      >
                        <option value="설치중">설치중</option>
                        <option value="설치완료">설치완료</option>
                        <option value="회수예정">회수예정</option>
                        <option value="회수완료">회수완료</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDetail(installation)}
                        className="text-blue-600 hover:text-blue-900 mr-4 cursor-pointer"
                      >
                        상세
                      </button>
                      <button
                        onClick={() => handleEdit(installation)}
                        className="text-green-600 hover:text-green-900 cursor-pointer"
                      >
                        수정
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* End of Installation Table */}

        {/* Add Installation Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">새 설치 등록</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설치할 컴퓨터</label>
                  <select
                    value={newInstallationData.computer_id}
                    onChange={(e) => setNewInstallationData({...newInstallationData, computer_id: e.target.value})}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">컴퓨터를 선택하세요</option>
                    {computers.map((computer) => (
                      <option key={computer.id} value={computer.id}>
                        {computer.brand} {computer.model} ({computer.serial_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설치 용도</label>
                  <select
                    value={newInstallationData.purpose}
                    onChange={(e) => setNewInstallationData({...newInstallationData, purpose: e.target.value})}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">설치 용도를 선택하세요</option>
                    <option value="데모">데모</option>
                    <option value="연구">연구</option>
                    <option value="과제">과제</option>
                    <option value="계약">계약</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">설치일</label>
                    <input
                      type="date"
                      value={newInstallationData.installation_date}
                      onChange={(e) => setNewInstallationData({...newInstallationData, installation_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">회수 예정일</label>
                    <input
                      type="date"
                      value={newInstallationData.return_date}
                      onChange={(e) => setNewInstallationData({...newInstallationData, return_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설치 담당자</label>
                  <input
                    type="text"
                    value={newInstallationData.technician}
                    onChange={(e) => setNewInstallationData({...newInstallationData, technician: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="담당자명을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설치 사이트명</label>
                  <input
                    type="text"
                    value={newInstallationData.site_name}
                    onChange={(e) => setNewInstallationData({...newInstallationData, site_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="설치 사이트명을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설치 주소</label>
                  <input
                    type="text"
                    value={newInstallationData.site_address}
                    onChange={(e) => setNewInstallationData({...newInstallationData, site_address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="설치 주소를 입력하세요"
                  />
                </div>

                {/* 제품명 다중 선택 추가 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">제품명</label>
                  <div className="relative">
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white min-h-[40px] flex flex-wrap gap-1 items-center">
                      {newInstallationData.products.length > 0 ? (
                        newInstallationData.products.map((product, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {product}
                            <button
                              type="button"
                              onClick={() => {
                                const updatedProducts = newInstallationData.products.filter((_, i) => i !== index)
                                setNewInstallationData({...newInstallationData, products: updatedProducts})
                              }}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              <i className="ri-close-line text-xs"></i>
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500 text-sm">제품을 선택하세요</span>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {['KOA', 'Metric', 'ALI', 'RUO'].map((product) => (
                        <label key={product} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newInstallationData.products.includes(product)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewInstallationData({
                                  ...newInstallationData,
                                  products: [...newInstallationData.products, product]
                                })
                              } else {
                                setNewInstallationData({
                                  ...newInstallationData,
                                  products: newInstallationData.products.filter(p => p !== product)
                                })
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{product}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">사이트 담당자</label>
                  <input
                    type="text"
                    value={newInstallationData.site_manager}
                    onChange={(e) => setNewInstallationData({...newInstallationData, site_manager: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="사이트 담당자명을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">사이트 연락처</label>
                  <input
                    type="text"
                    value={newInstallationData.site_contact}
                    onChange={(e) => setNewInstallationData({...newInstallationData, site_contact: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="연락처를 입력하세요"
                  />
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
                  onClick={handleAddInstallation}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer whitespace-nowrap"
                >
                  설치 등록
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedInstallation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">설치 상세 정보</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Installation Basic Info */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">설치 기본 정보</h4>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">설치번호</label>
                      <p className="text-sm text-gray-900">{selectedInstallation.installation_number}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">용도</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPurposeColor(selectedInstallation.purpose)}`}>
                        {selectedInstallation.purpose}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">설치일</label>
                      <p className="text-sm text-gray-900">{selectedInstallation.installation_date}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">회수 예정일</label>
                      <p className="text-sm text-gray-900">{selectedInstallation.return_date || '미정'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">상태</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedInstallation.status)}`}>
                        {selectedInstallation.status}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">설치 담당자</label>
                      <p className="text-sm text-gray-900">{selectedInstallation.technician}</p>
                    </div>
                  </div>
                </div>

                {/* Computer Info */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">컴퓨터 정보</h4>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">브랜드</label>
                      <p className="text-sm text-gray-900">{selectedInstallation.computers?.brand}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">모델</label>
                      <p className="text-sm text-gray-900">{selectedInstallation.computers?.model}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">시리얼 번호</label>
                      <p className="text-sm text-gray-900">{selectedInstallation.computers?.serial_number}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">CPU</label>
                      <p className="text-sm text-gray-900">{selectedInstallation.computers?.cpu}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">RAM</label>
                      <p className="text-sm text-gray-900">{selectedInstallation.computers?.ram}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">저장소</label>
                      <p className="text-sm text-gray-900">{selectedInstallation.computers?.storage}</p>
                    </div>
                  </div>
                </div>

                {/* Site Info */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">설치 사이트 정보</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">사이트명</label>
                      <p className="text-sm text-gray-900">{selectedInstallation.site_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">제품명</label>
                      <p className="text-sm text-gray-900">
                        {selectedInstallation.products ? selectedInstallation.products : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">주소</label>
                      <p className="text-sm text-gray-900">{selectedInstallation.site_address}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">사이트 담당자</label>
                      <p className="text-sm text-gray-900">{selectedInstallation.site_manager}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">연락처</label>
                      <p className="text-sm text-gray-900">{selectedInstallation.site_contact}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer whitespace-nowrap"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingInstallation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">설치 정보 수정</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">설치 기본 정보</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">설치번호:</span>
                      <span className="ml-2 font-medium">{editingInstallation.installation_number}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">컴퓨터:</span>
                      <span className="ml-2 font-medium">
                        {editingInstallation.computers?.brand} {editingInstallation.computers?.model}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설치 용도</label>
                  <select
                    value={editInstallationData.purpose}
                    onChange={(e) => setEditInstallationData({...editInstallationData, purpose: e.target.value})}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="데모">데모</option>
                    <option value="연구">연구</option>
                    <option value="과제">과제</option>
                    <option value="계약">계약</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">설치일</label>
                    <input
                      type="date"
                      value={editInstallationData.installation_date}
                      onChange={(e) => setEditInstallationData({...editInstallationData, installation_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">회수 예정일</label>
                    <input
                      type="date"
                      value={editInstallationData.return_date}
                      onChange={(e) => setEditInstallationData({...editInstallationData, return_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설치 담당자</label>
                  <input
                    type="text"
                    value={editInstallationData.technician}
                    onChange={(e) => setEditInstallationData({...editInstallationData, technician: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="담당자명을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설치 사이트명</label>
                  <input
                    type="text"
                    value={editInstallationData.site_name}
                    onChange={(e) => setEditInstallationData({...editInstallationData, site_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="설치 사이트명을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설치 주소</label>
                  <input
                    type="text"
                    value={editInstallationData.site_address}
                    onChange={(e) => setEditInstallationData({...editInstallationData, site_address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="설치 주소를 입력하세요"
                  />
                </div>

                {/* 제품명 다중 선택 추가 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">제품명</label>
                  <div className="relative">
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white min-h-[40px] flex flex-wrap gap-1 items-center">
                      {editInstallationData.products.length > 0 ? (
                        editInstallationData.products.map((product, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {product}
                            <button
                              type="button"
                              onClick={() => {
                                const updatedProducts = editInstallationData.products.filter((_, i) => i !== index)
                                setEditInstallationData({...editInstallationData, products: updatedProducts})
                              }}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              <i className="ri-close-line text-xs"></i>
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500 text-sm">제품을 선택하세요</span>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {['KOA', 'Metric', 'ALI', 'RUO'].map((product) => (
                        <label key={product} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editInstallationData.products.includes(product)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditInstallationData({
                                  ...editInstallationData,
                                  products: [...editInstallationData.products, product]
                                })
                              } else {
                                setEditInstallationData({
                                  ...editInstallationData,
                                  products: editInstallationData.products.filter(p => p !== product)
                                })
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{product}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">사이트 담당자</label>
                  <input
                    type="text"
                    value={editInstallationData.site_manager}
                    onChange={(e) => setEditInstallationData({...editInstallationData, site_manager: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="사이트 담당자명을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">사이트 연락처</label>
                  <input
                    type="text"
                    value={editInstallationData.site_contact}
                    onChange={(e) => setEditInstallationData({...editInstallationData, site_contact: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="연락처를 입력하세요"
                  />
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
                  onClick={handleUpdateInstallation}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer whitespace-nowrap"
                >
                  수정 완료
                </button>
              </div>
            </div>
          </div>
        )}
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

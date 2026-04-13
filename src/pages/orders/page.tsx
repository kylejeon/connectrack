
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import ProfileDropdown from '../../components/feature/ProfileDropdown'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [editingOrder, setEditingOrder] = useState(null)
  const [orderItems, setOrderItems] = useState([])
  const [editOrderItems, setEditOrderItems] = useState([])
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // 알림 관련 상태 추가
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [lastReadTime, setLastReadTime] = useState<string | null>(null)

  const [newOrderData, setNewOrderData] = useState({
    supplier: '',
    order_date: '',
    delivery_date: '',
    items: [{ brand: '', model: '', cpu: '', ram: '', storage: '', quantity: 1, unit_price: 0 }]
  })

  const [editOrderData, setEditOrderData] = useState({
    supplier: '',
    order_date: '',
    delivery_date: '',
    items: []
  })

  useEffect(() => {
    fetchOrders()
    fetchNotifications() // 알림 데이터 로드 추가
    
    // 로컬 스토리지에서 마지막 읽음 시간 가져오기
    const savedLastReadTime = localStorage.getItem('notifications_last_read')
    if (savedLastReadTime) {
      setLastReadTime(savedLastReadTime)
    }
  }, [])

  useEffect(() => {
    filterOrders()
  }, [orders, searchText, statusFilter])

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

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('발주 데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrderItems = async (orderId: number) => {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)

      if (error) throw error

      const items = (data || []).map(item => ({
        id: item.id,
        brand: item.brand,
        model: item.model,
        cpu: item.cpu,
        ram: item.ram,
        storage: item.storage,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      }))

      setOrderItems(items || [])
    } catch (error) {
      console.error('발주 상세 항목 로드 실패:', error)
    }
  }

  const handleDetail = async (order) => {
    setSelectedOrder(order)
    await fetchOrderItems(order.id)
    setShowDetailModal(true)
  }

  const handleEdit = async (order) => {
    setEditingOrder(order)
    setEditOrderData({
      supplier: order.supplier,
      order_date: order.order_date,
      delivery_date: order.delivery_date || '',
      items: [] // 초기화
    })
    
    // 먼저 데이터를 로드한 후 모달을 열기
    await fetchEditOrderItems(order.id)
    setShowEditModal(true)
  }

  const fetchEditOrderItems = async (orderId: number) => {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)

      if (error) throw error

      const items = (data || []).map(item => ({
        id: item.id,
        brand: item.brand || '',
        model: item.model || '',
        cpu: item.cpu || '',
        ram: item.ram || '',
        storage: item.storage || '',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0
      }))

      setEditOrderItems(data || [])
      // 데이터를 가져온 후 즉시 상태 업데이트
      setEditOrderData(prev => ({ 
        ...prev, 
        items: items
      }))
    } catch (error) {
      console.error('발주 수정용 상세 항목 로드 실패:', error)
      // 에러 발생 시 빈 배열로 설정
      setEditOrderData(prev => ({ 
        ...prev, 
        items: []
      }))
    }
  }

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error

      // 배송완료 상태 변경 시 활동 로그 추가
      if (newStatus === '배송완료') {
        const order = orders.find(o => o.id === orderId)
        if (order) {
          // 현재 로그인한 사용자 정보 가져오기
          const userData = localStorage.getItem('user')
          const currentUser = userData ? JSON.parse(userData) : null
          
          await supabase
            .from('activities')
            .insert({
              activity_type: '배송 완료',
              description: `발주번호 ${order.order_number} - ${order.supplier} 발주가 배송완료되었습니다`,
              user_name: currentUser?.name || '사용자'
            })
        }
      }

      await fetchOrders()
    } catch (error) {
      console.error('발주 상태 업데이트 실패:', error)
    }
  }

  const addOrderItem = () => {
    setNewOrderData({
      ...newOrderData,
      items: [...newOrderData.items, { brand: '', model: '', cpu: '', ram: '', storage: '', quantity: 1, unit_price: 0 }]
    })
  }

  const removeOrderItem = (index: number) => {
    const newItems = newOrderData.items.filter((_, i) => i !== index)
    setNewOrderData({ ...newOrderData, items: newItems })
  }

  const updateOrderItem = (index: number, field: string, value: any) => {
    const newItems = [...newOrderData.items]
    const parsedValue = (field === 'quantity' || field === 'unit_price')
      ? (Number(value) || 0)
      : value
    newItems[index] = { ...newItems[index], [field]: parsedValue }
    setNewOrderData({ ...newOrderData, items: newItems })
  }

  const addEditOrderItem = () => {
    setEditOrderData({
      ...editOrderData,
      items: [...editOrderData.items, { brand: '', model: '', cpu: '', ram: '', storage: '', quantity: 1, unit_price: 0 }]
    })
  }

  const removeEditOrderItem = (index: number) => {
    const newItems = editOrderData.items.filter((_, i) => i !== index)
    setEditOrderData({ ...editOrderData, items: newItems })
  }

  const updateEditOrderItem = (index: number, field: string, value: any) => {
    const newItems = [...editOrderData.items]
    const parsedValue = (field === 'quantity' || field === 'unit_price')
      ? (Number(value) || 0)
      : value
    newItems[index] = { ...newItems[index], [field]: parsedValue }
    setEditOrderData({ ...editOrderData, items: newItems })
  }

  const handleAddOrder = async () => {
    try {
      const totalAmount = newOrderData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
      
      // 현재 년월 가져오기 (YYYYMM 형식)
      const now = new Date()
      const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
      
      // 해당 월의 발주 개수 조회
      const { data: monthlyOrders, error: countError } = await supabase
        .from('orders')
        .select('order_number')
        .like('order_number', `ORD-${yearMonth}-%`)
        .order('created_at', { ascending: false })

      if (countError) throw countError

      // 다음 인덱스 계산
      const nextIndex = (monthlyOrders?.length || 0) + 1
      const orderNumber = `ORD-${yearMonth}-${String(nextIndex).padStart(3, '0')}`

      // 발주 생성
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          supplier: newOrderData.supplier,
          order_date: newOrderData.order_date,
          delivery_date: newOrderData.delivery_date || null,
          status: '주문완료',
          total_amount: totalAmount
        })
        .select()
        .single()

      if (orderError) throw orderError

      // 발주 항목 생성
      const orderItemsData = newOrderData.items.map(item => ({
        order_id: orderData.id,
        product_name: `${item.brand} ${item.model}`, // product_name 필드 추가
        brand: item.brand,
        model: item.model,
        cpu: item.cpu,
        ram: item.ram,
        storage: item.storage,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData)

      if (itemsError) throw itemsError

      // 활동 로그 추가
      await supabase
        .from('activities')
        .insert({
          activity_type: '발주 등록',
          description: `발주번호 ${orderNumber} - ${newOrderData.supplier}에 새 발주가 등록되었습니다 (총 ${newOrderData.items.length}개 항목)`,
          user_name: '관리자'
        })

      await fetchOrders()
      setShowAddModal(false)
      setNewOrderData({
        supplier: '',
        order_date: '',
        delivery_date: '',
        items: [{ brand: '', model: '', cpu: '', ram: '', storage: '', quantity: 1, unit_price: 0 }]
      })
    } catch (error) {
      console.error('발주 등록 실패:', error)
    }
  }

  const handleUpdateOrder = async () => {
    if (!editingOrder) return

    try {
      const totalAmount = editOrderData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          supplier: editOrderData.supplier,
          order_date: editOrderData.order_date,
          delivery_date: editOrderData.delivery_date || null,
          total_amount: totalAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingOrder.id)

      if (orderError) throw orderError

      // 기존 발주 항목 삭제
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', editingOrder.id)

      if (deleteError) throw deleteError

      // 새 발주 항목 생성
      const orderItemsData = editOrderData.items.map(item => ({
        order_id: editingOrder.id,
        product_name: `${item.brand} ${item.model}`, // product_name 필드 추가
        brand: item.brand,
        model: item.model,
        cpu: item.cpu,
        ram: item.ram,
        storage: item.storage,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData)

      if (itemsError) throw itemsError

      // 현재 로그인한 사용자 정보 가져오기
      const userData = localStorage.getItem('user')
      const currentUser = userData ? JSON.parse(userData) : null

      // 활동 로그 추가
      await supabase
        .from('activities')
        .insert({
          activity_type: '발주 수정',
          description: `발주번호 ${editingOrder.order_number} - ${editOrderData.supplier} 발주 정보가 수정되었습니다`,
          user_name: currentUser?.name || '사용자'
        })

      await fetchOrders()
      setShowEditModal(false)
      setEditingOrder(null)
    } catch (error) {
      console.error('발주 정보 수정 실패:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case '주문완료': return 'text-blue-600 bg-blue-100'
      case '배송중': return 'text-yellow-600 bg-yellow-100'
      case '배송완료': return 'text-green-600 bg-green-100'
      case '취소': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount)
  }

  const filterOrders = () => {
    let filtered = orders

    // 상태 필터
    if (statusFilter) {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    // 텍스트 검색
    if (searchText) {
      const searchLower = searchText.toLowerCase()
      filtered = filtered.filter(order => 
        order.order_number.toLowerCase().includes(searchLower) ||
        order.supplier.toLowerCase().includes(searchLower) ||
        order.order_date.includes(searchText) ||
        order.delivery_date?.includes(searchText)
      )
    }

    setFilteredOrders(filtered)
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
              <button className="text-blue-600 hover:text-blue-700 px-3 py-2 text-sm font-medium whitespace-nowrap">
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

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">발주 관리</h1>
              <p className="mt-1 text-sm text-gray-500">발주 현황을 관리합니다</p>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-7
              whitespace-nowrap cursor-pointer"
            >
              <i className="ri-add-line mr-2"></i>
              새 발주 등록
            </button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <i className="ri-shopping-cart-line text-blue-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">전체 발주</p>
                <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <i className="ri-check-line text-blue-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">주문완료</p>
                <p className="text-2xl font-bold text-gray-900">
                  {orders.filter(o => o.status === '주문완료').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <i className="ri-truck-line text-yellow-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">배송중</p>
                <p className="text-2xl font-bold text-gray-900">
                  {orders.filter(o => o.status === '배송중').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <i className="ri-check-double-line text-green-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">배송완료</p>
                <p className="text-2xl font-bold text-gray-900">
                  {orders.filter(o => o.status === '배송완료').length}
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-5"
                  placeholder="발주번호, 공급업체, 날짜 등으로 검색..."
                />
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>
            </div>
            <div className="md:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">상태 필터</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-5"
              >
                <option value="">전체 상태</option>
                <option value="주문완료">주문완료</option>
                <option value="배송중">배송중</option>
                <option value="배송완료">배송완료</option>
                <option value="취소">취소</option>
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
            총 {orders.length}개 중 {filteredOrders.length}개 표시
          </div>
        </div>

        {/* 발주 테이블 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">발주 목록</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    발주번호
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    공급업체
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    주문일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    배송일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    금액
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
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.supplier}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.order_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.delivery_date || '미정'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border-none cursor-pointer pr-8 ${getStatusColor(order.status)}`}
                      >
                        <option value="주문완료">주문완료</option>
                        <option value="배송중">배송중</option>
                        <option value="배송완료">배송완료</option>
                        <option value="취소">취소</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDetail(order)}
                        className="text-blue-600 hover:text-blue-900 mr-4 cursor-pointer"
                      >
                        상세
                      </button>
                      <button
                        onClick={() => handleEdit(order)}
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
      </div>

      {/* 새 발주 등록 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">새 발주 등록</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* 발주 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">공급업체</label>
                  <input
                    type="text"
                    value={newOrderData.supplier}
                    onChange={(e) => setNewOrderData({...newOrderData, supplier: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="공급업체명을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">주문일</label>
                  <input
                    type="date"
                    value={newOrderData.order_date}
                    onChange={(e) => setNewOrderData({...newOrderData, order_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">배송 예정일</label>
                  <input
                    type="date"
                    value={newOrderData.delivery_date}
                    onChange={(e) => setNewOrderData({...newOrderData, delivery_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 주문 항목 */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-md font-medium text-gray-900">주문 항목</h4>
                  <button
                    onClick={addOrderItem}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-add-line mr-1"></i>
                    항목 추가
                  </button>
                </div>
                
                <div className="space-y-3">
                  {newOrderData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">브랜드</label>
                        <input
                          type="text"
                          value={item.brand}
                          onChange={(e) => updateOrderItem(index, 'brand', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="브랜드"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">모델명</label>
                        <input
                          type="text"
                          value={item.model}
                          onChange={(e) => updateOrderItem(index, 'model', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="모델명"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">CPU</label>
                        <input
                          type="text"
                          value={item.cpu}
                          onChange={(e) => updateOrderItem(index, 'cpu', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="CPU"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">RAM</label>
                        <input
                          type="text"
                          value={item.ram}
                          onChange={(e) => updateOrderItem(index, 'ram', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="RAM"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">저장소</label>
                        <input
                          type="text"
                          value={item.storage}
                          onChange={(e) => updateOrderItem(index, 'storage', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="저장소"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">수량</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateOrderItem(index, 'quantity', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="1"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">단가</label>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateOrderItem(index, 'unit_price', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                        />
                      </div>
                      <div className="col-span-1">
                        {newOrderData.items.length > 1 && (
                          <button
                            onClick={() => removeOrderItem(index)}
                            className="w-full bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 cursor-pointer"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 총 금액 */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">총 주문 금액</span>
                    <span className="text-lg font-bold text-blue-600">
                      {formatCurrency(newOrderData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0))}
                    </span>
                  </div>
                </div>
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
                onClick={handleAddOrder}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer whitespace-nowrap"
              >
                발주 등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">발주 상세 정보</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* 발주 기본 정보 */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">발주 기본 정보</h4>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">발주번호</label>
                    <p className="text-sm text-gray-900">{selectedOrder.order_number}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">공급업체</label>
                    <p className="text-sm text-gray-900">{selectedOrder.supplier}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">주문일</label>
                    <p className="text-sm text-gray-900">{selectedOrder.order_date}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">배송일</label>
                    <p className="text-sm text-gray-900">{selectedOrder.delivery_date || '미정'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">상태</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">총 주문 금액</label>
                    <p className="text-sm text-gray-900 font-semibold">{formatCurrency(selectedOrder.total_amount)}</p>
                  </div>
                </div>
              </div>

              {/* 주문 제품 목록 */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">주문 제품 목록</h4>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">브랜드</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">모델명</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">사양</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">수량</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">단가</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">소계</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {orderItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.brand || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.model || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div>{item.cpu || '-'}</div>
                            <div className="text-xs text-gray-500">{item.ram || '-'} / {item.storage || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}개</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(item.unit_price)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{formatCurrency(item.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 총 주문 금액 */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">총 주문 금액</span>
                  <span className="text-xl font-bold text-blue-600">{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
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

      {/* 발주 수정 모달 */}
      {showEditModal && editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">발주 정보 수정</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">발주 기본 정보</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">발주번호:</span>
                    <span className="ml-2 font-medium">{editingOrder.order_number}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">현재 상태:</span>
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(editingOrder.status)}`}>
                      {editingOrder.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* 발주 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">공급업체</label>
                  <input
                    type="text"
                    value={editOrderData.supplier}
                    onChange={(e) => setEditOrderData({...editOrderData, supplier: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="공급업체명을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">주문일</label>
                  <input
                    type="date"
                    value={editOrderData.order_date}
                    onChange={(e) => setEditOrderData({...editOrderData, order_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">배송 예정일</label>
                  <input
                    type="date"
                    value={editOrderData.delivery_date}
                    onChange={(e) => setEditOrderData({...editOrderData, delivery_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 주문 항목 */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-md font-medium text-gray-900">주문 항목</h4>
                  <button
                    onClick={addEditOrderItem}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-add-line mr-1"></i>
                    항목 추가
                  </button>
                </div>
                
                <div className="space-y-3">
                  {editOrderData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">브랜드</label>
                        <input
                          type="text"
                          value={item.brand || ''}
                          onChange={(e) => updateEditOrderItem(index, 'brand', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="브랜드"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">모델명</label>
                        <input
                          type="text"
                          value={item.model || ''}
                          onChange={(e) => updateEditOrderItem(index, 'model', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="모델명"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">CPU</label>
                        <input
                          type="text"
                          value={item.cpu || ''}
                          onChange={(e) => updateEditOrderItem(index, 'cpu', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="CPU"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">RAM</label>
                        <input
                          type="text"
                          value={item.ram || ''}
                          onChange={(e) => updateEditOrderItem(index, 'ram', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="RAM"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">저장소</label>
                        <input
                          type="text"
                          value={item.storage || ''}
                          onChange={(e) => updateEditOrderItem(index, 'storage', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="저장소"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">수량</label>
                        <input
                          type="number"
                          value={item.quantity || 1}
                          onChange={(e) => updateEditOrderItem(index, 'quantity', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="1"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">단가</label>
                        <input
                          type="number"
                          value={item.unit_price || 0}
                          onChange={(e) => updateEditOrderItem(index, 'unit_price', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                        />
                      </div>
                      <div className="col-span-1">
                        <button
                          onClick={() => removeEditOrderItem(index)}
                          className="w-full bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 cursor-pointer"
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 총 금액 */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">총 주문 금액</span>
                    <span className="text-lg font-bold text-blue-600">
                      {formatCurrency(editOrderData.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0))}
                    </span>
                  </div>
                </div>
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
                onClick={handleUpdateOrder}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer whitespace-nowrap"
              >
                수정 완료
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

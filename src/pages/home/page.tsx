
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import ProfileDropdown from '../../components/feature/ProfileDropdown';

export default function Home() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [stats, setStats] = useState({
    totalInventory: 0,
    installedComputers: 0,
    recoveryScheduled: 0,
    orderRequests: 0,
    underRepair: 0
  });

  // 알림 관련 상태 추가
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadTime, setLastReadTime] = useState<string | null>(null); // 마지막 읽음 시간 추가

  // 빠른 작업 모달 상태들
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showInstallationModal, setShowInstallationModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  // 재고 추가 관련 상태
  const [inventoryFormData, setInventoryFormData] = useState({
    brand: '',
    model: '',
    serial_number: '',
    service_tag: '',
    cpu: '',
    ram: '',
    storage: '',
    location: '창고',
    status: '사용가능' as const
  });

  // 설치 등록 관련 상태
  const [computers, setComputers] = useState([]);
  const [installationFormData, setInstallationFormData] = useState({
    computer_id: '',
    purpose: '',
    installation_date: '',
    return_date: '',
    technician: '',
    site_name: '',
    site_address: '',
    site_manager: '',
    site_contact: ''
  });

  // 발주 등록 관련 상태
  const [orderFormData, setOrderFormData] = useState({
    supplier: '',
    order_date: '',
    delivery_date: '',
    items: [{ brand: '', model: '', cpu: '', ram: '', storage: '', quantity: 1, unit_price: 0 }]
  });

  // 회수 예약 관련 상태
  const [installations, setInstallations] = useState([]);
  const [showTimelineRecoveryModal, setShowTimelineRecoveryModal] = useState(false);
  const [selectedTimelineItem, setSelectedTimelineItem] = useState(null);
  
  // 실제 회수 타임라인 데이터 상태 추가
  const [recoveryTimelineData, setRecoveryTimelineData] = useState([]);

  // 최근 활동 데이터 상태 추가
  const [recentActivities, setRecentActivities] = useState([]);

  // 설치 사이트 지도 데이터 상태 추가
  const [installationSites, setInstallationSites] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchAvailableComputers();
    fetchActiveInstallations();
    fetchRecoveryTimelineData();
    fetchRecentActivities();
    fetchNotifications(); // 알림 데이터 로드 추가
    fetchInstallationSites(); // 설치 사이트 데이터 로드 추가
    
    // 로컬 스토리지에서 마지막 읽음 시간 가져오기
    const savedLastReadTime = localStorage.getItem('notifications_last_read');
    if (savedLastReadTime) {
      setLastReadTime(savedLastReadTime);
    }
  }, []);

  // 알림 데이터를 가져하는 함수 수정
  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .not('activity_type', 'in', '("로그인","로그아웃")')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // 현재 로그인한 사용자 정보 가져오기
      const userData = localStorage.getItem('user');
      const currentUser = userData ? JSON.parse(userData) : null;

      // 마지막 읽음 시간 이후의 활동만 알림으로 처리하고, 본인이 수행한 활동은 제외
      const savedLastReadTime = localStorage.getItem('notifications_last_read');
      const lastRead = savedLastReadTime ? new Date(savedLastReadTime) : new Date(0);
      
      const recentNotifications = (data || []).filter(activity => {
        const activityDate = new Date(activity.created_at);
        return activityDate > lastRead && activity.user_name !== currentUser?.name;
      });

      setNotifications(recentNotifications);
      setUnreadCount(recentNotifications.length);
    } catch (error) {
      console.error('알림 데이터 로드 실패:', error);
    }
  };

  // 알림 토글 함수 수정
  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      // 알림을 열 때 현재 시간을 마지막 읽음 시간으로 저장
      const currentTime = new Date().toISOString();
      localStorage.setItem('notifications_last_read', currentTime);
      setLastReadTime(currentTime);
      setUnreadCount(0);
    }
  };

  // "전체 보기" 클릭 시 읽음 처리 함수 수정
  const handleViewAllNotifications = () => {
    const currentTime = new Date().toISOString();
    localStorage.setItem('notifications_last_read', currentTime);
    setLastReadTime(currentTime);
    setUnreadCount(0);
    window.REACT_APP_NAVIGATE('/activities');
  };

  // 최근 활동 데이터를 가져는 함수 추가
  const fetchRecentActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .not('activity_type', 'in', '("로그인","로그아웃")')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentActivities(data || []);
    } catch (error) {
      console.error('최근 활동 데이터 로드 실패:', error);
    }
  };

  // 기존 fetchStats 함수
  const fetchStats = async () => {
    try {
      // 사용가능한 컴퓨터 개수 (보유중)
      const { data: availableComputers, error: availableError } = await supabase
        .from('computers')
        .select('*')
        .eq('status', '사용가능');

      if (availableError) throw availableError;

      // 설치완료 상태인 컴퓨터 개수
      const { data: installedComputers, error: installedError } = await supabase
        .from('installations')
        .select('*')
        .eq('status', '설치완료');

      if (installedError) throw installedError;

      // 회수예정 상태인 컴퓨터 개수
      const { data: recoveryScheduled, error: recoveryError } = await supabase
        .from('installations')
        .select('*')
        .eq('status', '회수예정');

      if (recoveryError) throw recoveryError;

      // 배송완료 이외의 발주 개수 (발주 건수가 아닌 실제 발주된 항목 개수)
      const { data: pendingOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .neq('status', '배송완료');

      if (ordersError) throw ordersError;

      // 배송완료가 아닌 발주 건수를 카운트
      const orderRequestsCount = pendingOrders?.length || 0;

      // 수리중 상태인 컴퓨터 개수
      const { data: allComputers, error: allComputersError } = await supabase
        .from('computers')
        .select('*');

      if (allComputersError) throw allComputersError;

      const underRepairCount = allComputers?.filter(c => c.status === '수리중').length || 0;

      setStats({
        totalInventory: availableComputers?.length || 0,
        installedComputers: installedComputers?.length || 0,
        recoveryScheduled: recoveryScheduled?.length || 0,
        orderRequests: orderRequestsCount,
        underRepair: underRepairCount
      });

    } catch (error) {
      console.error('통계 데이터 로드 실패:', error);
    }
  };

  // 기존 fetchAvailableComputers 함수
  const fetchAvailableComputers = async () => {
    try {
      const { data, error } = await supabase
        .from('computers')
        .select('*')
        .eq('status', '사용가능')
        .order('brand', { ascending: true });

      if (error) throw error;
      setComputers(data || []);
    } catch (error) {
      console.error('사용가능한 컴퓨터 로드 실패:', error);
    }
  };

  // 기존 fetchActiveInstallations 함수 (이미 포함)
  const fetchActiveInstallations = async () => {
    try {
      const { data, error } = await supabase
        .from('installations')
        .select(`
          *,
          computers (
            brand,
            model,
            serial_number
          )
        `)
        .in('purpose', ['데모', '연구', '과제'])
        .eq('status', '설치완료')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInstallations(data || []);
    } catch (error) {
      console.error('활성 설치 데이터 로드 실패:', error);
    }
  };

  // 실제 회수 타임라인 데이터를 가져는 함수 수정
  const fetchRecoveryTimelineData = async () => {
    try {
      const { data, error } = await supabase
        .from('installations')
        .select(`
          *,
          computers (
            brand,
            model,
            serial_number
          )
        `)
        .eq('status', '설치완료')
        .order('return_date', { ascending: true });

      if (error) throw error;

      // 회수일까지 남은 일수 계산하여 타임라인 데이터 생성
      const timelineData = (data || []).map(installation => {
        // return_date가 없는 경우 설치일로부터 30일 후를 기본 회수일로 설정
        const returnDate = installation.return_date 
          ? new Date(installation.return_date)
          : new Date(new Date(installation.installation_date).getTime() + 30 * 24 * 60 * 60 * 1000);
        
        const today = new Date();
        const diffTime = returnDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // 설치일부터 회수일까지의 총 기간 계산
        const installDate = new Date(installation.installation_date);
        const totalDays = Math.ceil((returnDate.getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24));
        const progressDays = totalDays - daysLeft;
        const progressPercent = Math.max(10, Math.min(100, (progressDays / totalDays) * 100));

        return {
          id: installation.id,
          company: installation.site_name,
          model: `${installation.computers?.brand} ${installation.computers?.model}`,
          installDate: installation.installation_date,
          recoveryDate: returnDate.toISOString().split('T')[0],
          type: installation.purpose,
          daysLeft: Math.max(0, daysLeft),
          status: daysLeft <= 7 ? 'urgent' : 'active',
          progressPercent: Math.round(progressPercent),
          installation: installation,
          installationStatus: installation.status,
          hasReturnDate: !!installation.return_date // 회수일 설정 여부 추가
        };
      });

      setRecoveryTimelineData(timelineData);
    } catch (error) {
      console.error('회수 타임라인 데이터 로드 실패:', error);
    }
  };

  // 회수 타임라인 정렬
  const recoveryTimeline = recoveryTimelineData.sort((a, b) => a.daysLeft - b.daysLeft);

  // 타임라인 회수 예약 함수
  const handleTimelineRecoverySchedule = (item: any) => {
    setSelectedTimelineItem(item);
    setShowTimelineRecoveryModal(true);
  };

  const handleTimelineRecoverySubmit = async (recoveryDate: string, recoveryTechnician: string) => {
    try {
      // 설치 상태를 '회수예정'으로 변경
      await supabase
        .from('installations')
        .update({ 
          status: '회수예정',
          return_date: recoveryDate
        })
        .eq('id', selectedTimelineItem?.installation?.id);

      // 현재 로그인한 사용자 정보 가져오기
      const userData = localStorage.getItem('user');
      const currentUser = userData ? JSON.parse(userData) : null;

      // 활동 로그 추가
      await supabase
        .from('activities')
        .insert({
          activity_type: '회수 예약',
          description: `설치번호 ${selectedTimelineItem?.installation?.installation_number} - ${selectedTimelineItem?.company}의 ${selectedTimelineItem?.model} 회수가 예약되었습니다 (담당자: ${recoveryTechnician}, 예정일: ${recoveryDate})`,
          user_name: currentUser?.name || '사용자'
        });

      // 데이터 새로깍
      await fetchStats();
      await fetchRecoveryTimelineData();
      await fetchActiveInstallations();
      await fetchRecentActivities(); // 최근 활동 새로고침 추가

      setShowTimelineRecoveryModal(false);
      setSelectedTimelineItem(null);
    } catch (error) {
      console.error('타임라인 회수 예약 실패:', error);
    }
  };

  // 기존 핸들러 함수들
  const handleNewInventory = () => {
    setInventoryFormData({
      brand: '',
      model: '',
      serial_number: '',
      service_tag: '',
      cpu: '',
      ram: '',
      storage: '',
      location: '창고',
      status: '사용가능'
    });
    setShowInventoryModal(true);
  };

  const handleInstallationRequest = () => {
    setInstallationFormData({
      computer_id: '',
      purpose: '',
      installation_date: '',
      return_date: '',
      technician: '',
      site_name: '',
      site_address: '',
      site_manager: '',
      site_contact: ''
    });
    setShowInstallationModal(true);
  };

  const handleOrderRequest = () => {
    setOrderFormData({
      supplier: '',
      order_date: '',
      delivery_date: '',
      items: [{ brand: '', model: '', cpu: '', ram: '', storage: '', quantity: 1, unit_price: 0 }]
    });
    setShowOrderModal(true);
  };

  const handleRecoverySchedule = () => {
    setShowRecoveryModal(true);
  };

  // 재고 추가 함수
  const handleAddInventory = async () => {
    try {
      const { error } = await supabase
        .from('computers')
        .insert(inventoryFormData);

      if (error) throw error;

      // 현재 로그인한 사용자 정보 가져오기
      const userData = localStorage.getItem('user');
      const currentUser = userData ? JSON.parse(userData) : null;

      // 활동 로그 추가
      await supabase
        .from('activities')
        .insert({
          activity_type: '재고 추가',
          description: `새 컴퓨터가 재고에 추가되었습니다: ${inventoryFormData.brand} ${inventoryFormData.model} (S/N: ${inventoryFormData.serial_number})`,
          user_name: currentUser?.name || '사용자'
        });

      await fetchStats();
      await fetchAvailableComputers();
      await fetchRecentActivities(); // 최근 활동 새로고침 추가
      setShowInventoryModal(false);
    } catch (error) {
      console.error('컴퓨터 추가 실패:', error);
    }
  };

  // 발주 등록 함수
  const handleAddOrder = async () => {
    try {
      // 현재 년월 가져오기 (YYYYMM 형식)
      const now = new Date();
      const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      // 해당 월의 발주 개수 조회
      const { data: monthlyOrders, error: countError } = await supabase
        .from('orders')
        .select('order_number')
        .like('order_number', `ORD-${yearMonth}-%`)
        .order('created_at', { ascending: false });

      if (countError) throw countError;

      // 다음 인덱스 계산
      const nextIndex = (monthlyOrders?.length || 0) + 1;
      const orderNumber = `ORD-${yearMonth}-${String(nextIndex).padStart(3, '0')}`;

      const totalAmount = orderFormData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

      // 발주 생성
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          supplier: orderFormData.supplier,
          order_date: orderFormData.order_date,
          delivery_date: orderFormData.delivery_date || null,
          status: '주문완료',
          total_amount: totalAmount
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 발주 항목 생성
      const orderItemsData = orderFormData.items.map(item => ({
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
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) throw itemsError;

      // 현재 로그인한 사용자 정보 가져오기
      const userData = localStorage.getItem('user');
      const currentUser = userData ? JSON.parse(userData) : null;

      // 활동 로그 추가
      await supabase
        .from('activities')
        .insert({
          activity_type: '발주 등록',
          description: `발주번호 ${orderNumber} - ${orderFormData.supplier}에 새 발주가 등록되었습니다 (총 ${orderFormData.items.length}개 항목)`,
          user_name: currentUser?.name || '사용자'
        });

      await fetchStats();
      await fetchRecentActivities(); // 최근 활동 새로고침 추가
      setShowOrderModal(false);
    } catch (error) {
      console.error('발주 등록 실패:', error);
    }
  };

  // 설치 등록 함수
  const handleAddInstallation = async () => {
    try {
      // 현재 년월 가져오기 (YYYYMM 형식)
      const now = new Date();
      const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      // 해당 월의 설치 개수 조회
      const { data: monthlyInstallations, error: countError } = await supabase
        .from('installations')
        .select('installation_number')
        .like('installation_number', `INST-${yearMonth}-%`)
        .order('created_at', { ascending: false });

      if (countError) throw countError;

      // 다음 인덱스 계산
      const nextIndex = (monthlyInstallations?.length || 0) + 1;
      const installationNumber = `INST-${yearMonth}-${String(nextIndex).padStart(3, '0')}`;

      // 설치 등록
      const { error: installationError } = await supabase
        .from('installations')
        .insert({
          installation_number: installationNumber,
          computer_id: parseInt(installationFormData.computer_id),
          purpose: installationFormData.purpose,
          installation_date: installationFormData.installation_date,
          return_date: installationFormData.return_date || null,
          status: '설치중',
          technician: installationFormData.technician,
          site_name: installationFormData.site_name,
          site_address: installationFormData.site_address,
          site_manager: installationFormData.site_manager,
          site_contact: installationFormData.site_contact
        });

      if (installationError) throw installationError;

      // 컴퓨터 상태를 '사용중'으로 변경하고 위치를 사이트명으로 업데이트
      const { error: computerError } = await supabase
        .from('computers')
        .update({ 
          status: '사용중',
          location: installationFormData.site_name
        })
        .eq('id', parseInt(installationFormData.computer_id));

      if (computerError) throw computerError;

      // 선택된 컴퓨터 정보 가져기
      const selectedComputer = computers.find(c => c.id === parseInt(installationFormData.computer_id));

      // 현재 로그인한 사용자 정보 가져오기
      const userData = localStorage.getItem('user');
      const currentUser = userData ? JSON.parse(userData) : null;

      // 활동 로그 추가
      await supabase
        .from('activities')
        .insert({
          activity_type: '설치 등록',
          description: `설치번호 ${installationNumber} - ${installationFormData.site_name}에 ${selectedComputer?.brand} ${selectedComputer?.model} (S/N: ${selectedComputer?.serial_number}) 설치가 등록되었습니다`,
          user_name: currentUser?.name || '사용자'
        });

      await fetchStats();
      await fetchAvailableComputers();
      await fetchActiveInstallations();
      await fetchRecentActivities(); // 최근 활동 새로고침 추가
      setShowInstallationModal(false);
    } catch (error) {
      console.error('설치 등록 실패:', error);
    }
  };

  // 발주 항목 관련 함수들
  const addOrderItem = () => {
    setOrderFormData({
      ...orderFormData,
      items: [...orderFormData.items, { brand: '', model: '', cpu: '', ram: '', storage: '', quantity: 1, unit_price: 0 }]
    });
  };

  const removeOrderItem = (index: number) => {
    const newItems = orderFormData.items.filter((_, i) => i !== index);
    setOrderFormData({ ...orderFormData, items: newItems });
  };

  const updateOrderItem = (index: number, field: string, value: any) => {
    const newItems = [...orderFormData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setOrderFormData({ ...orderFormData, items: newItems });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const getPurposeColor = (purpose: string) => {
    switch (purpose) {
      case '데모': return 'text-purple-600 bg-purple-100';
      case '연구': return 'text-green-600 bg-green-100';
      case '과제': return 'text-blue-600 bg-blue-100';
      case '계약': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '설치완료': return 'text-green-600 bg-green-100';
      case '설치중': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // 활동 유형별 아이콘 가져오기 함수
  const getActivityIcon = (type: string) => {
    switch (type) {
      case '재고 추가': return 'ri-add-box-line';
      case '재고 삭제': return 'ri-delete-bin-line';
      case '설치 등록': return 'ri-tools-line';
      case '설치 수정': return 'ri-edit-line';
      case '설치 완료': return 'ri-checkbox-multiple-line';
      case '회수 예약': return 'ri-calendar-schedule-line';
      case '회수 완료': return 'ri-checkbox-circle-line';
      case '발주 등록': return 'ri-shopping-cart-line';
      case '발주 수정': return 'ri-edit-2-line';
      case '발주 상태 변경': return 'ri-refresh-line';
      case '입고 완료': return 'ri-truck-line';
      case '배송 완료': return 'ri-check-double-line';
      case '사용자 추가': return 'ri-user-add-line';
      case '로그인': return 'ri-login-circle-line';
      case '로그아웃': return 'ri-logout-circle-line';
      default: return 'ri-information-line';
    }
  };

  // 활동 유형별 색상 가져오기 함수
  const getActivityColor = (type: string) => {
    switch (type) {
      case '재고 추가': return 'text-blue-600 bg-blue-100';
      case '재고 삭제': return 'text-red-600 bg-red-100';
      case '설치 등록': return 'text-green-600 bg-green-100';
      case '설치 수정': return 'text-green-600 bg-green-100';
      case '설치 완료': return 'text-green-600 bg-green-100';
      case '회수 예약': return 'text-yellow-600 bg-yellow-100';
      case '회수 완료': return 'text-green-600 bg-green-100';
      case '발주 등록': return 'text-purple-600 bg-purple-100';
      case '발주 수정': return 'text-purple-600 bg-purple-100';
      case '발주 상태 변경': return 'text-purple-600 bg-purple-100';
      case '입고 완료': return 'text-indigo-600 bg-indigo-100';
      case '배송 완료': return 'text-teal-600 bg-teal-100';
      case '사용자 추가': return 'text-pink-600 bg-pink-100';
      case '로그인': return 'text-orange-600 bg-orange-100';
      case '로그아웃': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 설치 사이트 데이터를 가져는 함수 추가
  const fetchInstallationSites = async () => {
    try {
      const { data, error } = await supabase
        .from('installations')
        .select(`
          *,
          computers (
            brand,
            model,
            serial_number
          )
        `)
        .eq('status', '설치완료')
        .not('site_address', 'is', null)
        .neq('site_address', '')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInstallationSites(data || []);
    } catch (error) {
      console.error('설치 사이트 데이터 로드 실패:', error);
    }
  };

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
              <button className="text-blue-600 hover:text-blue-700 px-3 py-2 text-sm font-medium whitespace-nowrap">
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
              <button 
                onClick={() => window.REACT_APP_NAVIGATE('/activities')}
                className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium cursor-pointer whitespace-nowrap"
              >
                활동 로그
              </button>
            </nav>
            <div className="flex items-center space-x-4">
              {/* 알림 버튼 수정 */}
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="ri-computer-line text-blue-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">보유중</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalInventory}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="ri-settings-line text-green-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">설치된 컴퓨터</p>
                <p className="text-3xl font-bold text-gray-900">{stats.installedComputers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="ri-download-line text-orange-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">회수 예정</p>
                <p className="text-3xl font-bold text-gray-900">{stats.recoveryScheduled}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="ri-shopping-cart-line text-purple-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">발주 요청</p>
                <p className="text-3xl font-bold text-gray-900">{stats.orderRequests}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <i className="ri-tools-line text-red-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">수리중</p>
                <p className="text-3xl font-bold text-gray-900">{stats.underRepair}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 설치 사이트 위치 섹션 - 구글 마이맵으로 변경 */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">설치 사이트 위치</h2>
              <button 
                onClick={() => window.REACT_APP_NAVIGATE('/installation')}
                className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer whitespace-nowrap"
              >
                설치 관리
              </button>
            </div>
          </div>
          <div className="p-6">
            {installationSites.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 지도 영역 - 구글 마이맵 임베디드 */}
                <div className="bg-gray-100 rounded-lg overflow-hidden">
                  <div id="googleMap" className="w-full h-96">
                    <div className="w-full h-full relative">
                      <iframe
                        id="mapFrame"
                        src="https://www.google.com/maps/d/u/0/embed?mid=1qBUbw0jGRR785_6sJTQqS9l5GplIzTs"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="설치 사이트 위치"
                      ></iframe>
                      
                      {/* 지도 새창으로 보기 버튼 */}
                      <div className="absolute top-4 right-4">
                        <button
                          onClick={() => {
                            window.open('https://www.google.com/maps/d/u/0/edit?mid=1qBUbw0jGRR785_6sJTQqS9l5GplIzTs&usp=sharing', '_blank');
                          }}
                          className="bg-white bg-opacity-90 hover:bg-opacity-100 px-3 py-2 rounded-lg shadow-sm cursor-pointer"
                          title="새창에서 지도 보기"
                        >
                          <i className="ri-external-link-line text-gray-700"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 사이트 목록 */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-md font-medium text-gray-900">설치 완료 사이트</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">총</span>
                      <span className="text-lg font-bold text-blue-600">{installationSites.length}</span>
                      <span className="text-sm text-gray-500">개</span>
                    </div>
                  </div>
                  
                  {/* 용도별 통계 */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {['데모', '연구', '과제', '계약'].map(purpose => {
                      const count = installationSites.filter(site => site.purpose === purpose).length;
                      return (
                        <div key={purpose} className="text-center">
                          <div className={`text-xs px-2 py-1 rounded ${getPurposeColor(purpose)}`}>
                            {purpose}
                          </div>
                          <div className="text-sm font-medium text-gray-900 mt-1">{count}</div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {installationSites.map((site: any, index: number) => (
                    <div key={site.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">#{index + 1}</span>
                            <h4 className="text-sm font-semibold text-gray-900">{site.site_name}</h4>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPurposeColor(site.purpose)}`}>
                              {site.purpose}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            <i className="ri-map-pin-line mr-1 text-red-500"></i>
                            {site.site_address}
                          </p>
                          <p className="text-sm text-gray-500 mb-1">
                            <i className="ri-computer-line mr-1 text-blue-500"></i>
                            {site.computers?.brand} {site.computers?.model}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>
                              <i className="ri-user-line mr-1"></i>
                              {site.site_manager}
                            </span>
                            <span>
                              <i className="ri-calendar-line mr-1"></i>
                              {site.installation_date}
                            </span>
                          </div>
                        </div>
                        {/* 버튼 영역 - 단일 버튼 */}
                        <div className="flex flex-col space-y-1">
                          <button
                            onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(site.site_address)}`, '_blank')}
                            className="text-blue-600 hover:text-blue-700 cursor-pointer p-1"
                            title="개별 지도 보기"
                          >
                            <i className="ri-map-pin-2-line text-lg"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <i className="ri-map-pin-line text-4xl text-gray-300 mb-4"></i>
                <p className="text-gray-500">설치 완료된 사이트가 없습니다.</p>
                <p className="text-sm text-gray-400 mt-1">설치 관리에서 설치를 완료하고 주소를 입력하면 지도에 표시됩니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* 라이선스 만료 타임라인 */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">라이선스 만료 타임라인</h2>
              <button 
                onClick={() => window.REACT_APP_NAVIGATE('/installation')}
                className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer whitespace-nowrap"
              >
                전체 보기
              </button>
            </div>
          </div>
          <div className="p-6">
            {recoveryTimeline.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {recoveryTimeline.slice(0, 20).map((item) => (
                    <div key={item.id} className={`border-l-4 pl-4 pr-4 py-3 rounded-r-lg ${
                      item.installationStatus === '회수예정' 
                        ? 'border-orange-500 bg-orange-50'
                        : item.status === 'urgent' 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-blue-500 bg-blue-50'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.type === '데모' ? 'bg-purple-100 text-purple-800' : 
                              item.type === '연구' ? 'bg-green-100 text-green-800' : 
                              item.type === '과제' ? 'bg-blue-100 text-blue-800' :
                              item.type === '계약' ? 'bg-orange-100 text-orange-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {item.type}
                            </span>
                            {item.installationStatus === '회수예정' && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                회수예정
                              </span>
                            )}
                            <h3 className="text-sm font-semibold text-gray-900">
                              {item.company}
                              {item.installation?.products && (
                                <span className="text-gray-500 font-normal"> ({item.installation.products})</span>
                              )}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">{item.model}</p>
                          <div className="flex items-center text-xs text-gray-500 space-x-4">
                            <span>출고: {item.installDate}</span>
                            <span>회수: {item.hasReturnDate ? item.recoveryDate : '-'}</span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className={`text-lg font-bold ${
                            item.installationStatus === '회수예정'
                              ? 'text-orange-600'
                              : item.status === 'urgent' 
                                ? 'text-red-600' 
                                : 'text-blue-600'
                          }`}>
                            {item.daysLeft}일
                          </div>
                          <div className="text-xs text-gray-500">남음</div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            item.installationStatus === '회수예정'
                              ? 'bg-orange-500'
                              : item.status === 'urgent' 
                                ? 'bg-red-500' 
                                : 'bg-blue-500'
                          }`}
                          style={{ width: `${item.progressPercent}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">
                          진행률: {item.progressPercent}%
                        </span>
                        {item.installationStatus === '회수예정' ? (
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500 whitespace-nowrap">
                            <i className="ri-check-line mr-1"></i>
                            예약완료
                          </span>
                        ) : (
                          <button 
                            onClick={() => handleTimelineRecoverySchedule(item)}
                            className={`text-xs px-2 py-1 rounded cursor-pointer whitespace-nowrap ${
                              item.status === 'urgent' 
                                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                          >
                            <i className="ri-calendar-schedule-line mr-1"></i>
                            회수 예약
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <i className="ri-calendar-line text-4xl text-gray-300 mb-4"></i>
                <p className="text-gray-500">설치 완료된 항목이 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">빠른 작업</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button 
                onClick={handleNewInventory}
                className="flex items-center justify-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-3 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <i className="ri-add-line text-lg"></i>
                <span>새 재고 등록</span>
              </button>
              <button 
                onClick={handleInstallationRequest}
                className="flex items-center justify-center space-x-2 bg-green-50 hover:bg-green-100 text-green-700 px-4 py-3 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <i className="ri-computer-line text-lg"></i>
                <span>설치 요청</span>
              </button>
              <button 
                onClick={handleOrderRequest}
                className="flex items-center justify-center space-x-2 bg-orange-50 hover:bg-orange-100 text-orange-700 px-4 py-3 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <i className="ri-shopping-cart-line text-lg"></i>
                <span>발주 요청</span>
              </button>
              <button 
                onClick={handleRecoverySchedule}
                className="flex items-center justify-center space-x-2 bg-purple-50 hover:bg-purple-100 text-purple-700 px-4 py-3 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <i className="ri-download-line text-lg"></i>
                <span>회수 예약</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">최근 활동</h2>
              <button 
                onClick={() => window.REACT_APP_NAVIGATE('/activities')}
                className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer whitespace-nowrap"
              >
                전체 보기
              </button>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {recentActivities.length > 0 ? (
              recentActivities.slice(0, 5).map((activity: any) => (
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
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getActivityColor(activity.activity_type)}`}>
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
              ))
            ) : (
              <div className="p-6 text-center">
                <i className="ri-history-line text-4xl text-gray-300 mb-4"></i> 
                <p className="text-gray-500">최근 활동이 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* 새 재고 추가 모달 */}
        {showInventoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">새 재고 추가</h3>
                <button
                  onClick={() => setShowInventoryModal(false)}
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
                    value={inventoryFormData.brand}
                    onChange={(e) => setInventoryFormData({...inventoryFormData, brand: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="브랜드를 입력하세요"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">모델명</label>
                  <input
                    type="text"
                    value={inventoryFormData.model}
                    onChange={(e) => setInventoryFormData({...inventoryFormData, model: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="모델명을 입력하세요"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">시리얼 번호</label>
                  <input
                    type="text"
                    value={inventoryFormData.serial_number}
                    onChange={(e) => setInventoryFormData({...inventoryFormData, serial_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="시리얼 번호를 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">서비스 태그</label>
                  <input
                    type="text"
                    value={inventoryFormData.service_tag}
                    onChange={(e) => setInventoryFormData({...inventoryFormData, service_tag: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="서비스 태그를 입력하세요"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPU</label>
                  <input
                    type="text"
                    value={inventoryFormData.cpu}
                    onChange={(e) => setInventoryFormData({...inventoryFormData, cpu: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="CPU 정보를 입력하세요"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">RAM</label>
                    <input
                      type="text"
                      value={inventoryFormData.ram}
                      onChange={(e) => setInventoryFormData({...inventoryFormData, ram: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="예: 16GB"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">저장소</label>
                    <input
                      type="text"
                      value={inventoryFormData.storage}
                      onChange={(e) => setInventoryFormData({...inventoryFormData, storage: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="예: 512GB SSD"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">위치</label>
                  <input
                    type="text"
                    value={inventoryFormData.location}
                    onChange={(e) => setInventoryFormData({...inventoryFormData, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="보관 위치를 입력하세요"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                  <select
                    value={inventoryFormData.status}
                    onChange={(e) => setInventoryFormData({...inventoryFormData, status: e.target.value as any})}
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
                  onClick={() => setShowInventoryModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer whitespace-nowrap"
                >
                  취소
                </button>
                <button
                  onClick={handleAddInventory}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer whitespace-nowrap"
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 새 설치 등록 모달 */}
        {showInstallationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">새 설치 등록</h3>
                <button
                  onClick={() => setShowInstallationModal(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설치할 컴퓨터</label>
                  <select
                    value={installationFormData.computer_id}
                    onChange={(e) => setInstallationFormData({...installationFormData, computer_id: e.target.value})}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">컴퓨터를 선택하세요</option>
                    {computers.map((computer: any) => (
                      <option key={computer.id} value={computer.id}>
                        {computer.brand} {computer.model} ({computer.serial_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설치 용도</label>
                  <select
                    value={installationFormData.purpose}
                    onChange={(e) => setInstallationFormData({...installationFormData, purpose: e.target.value})}
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
                      value={installationFormData.installation_date}
                      onChange={(e) => setInstallationFormData({...installationFormData, installation_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">회수 예정일</label>
                    <input
                      type="date"
                      value={installationFormData.return_date}
                      onChange={(e) => setInstallationFormData({...installationFormData, return_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설치 담당자</label>
                  <input
                    type="text"
                    value={installationFormData.technician}
                    onChange={(e) => setInstallationFormData({...installationFormData, technician: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="담당자명을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설치 사이트명</label>
                  <input
                    type="text"
                    value={installationFormData.site_name}
                    onChange={(e) => setInstallationFormData({...installationFormData, site_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="설치 사이트명을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설치 주소</label>
                  <input
                    type="text"
                    value={installationFormData.site_address}
                    onChange={(e) => setInstallationFormData({ ...installationFormData, site_address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="설치 주소를 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">사이트 담당자</label>
                  <input
                    type="text"
                    value={installationFormData.site_manager}
                    onChange={(e) => setInstallationFormData({...installationFormData, site_manager: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="사이트 담당자명을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">사이트 연락처</label>
                  <input
                    type="text"
                    value={installationFormData.site_contact}
                    onChange={(e) => setInstallationFormData({...installationFormData, site_contact: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="연락처를 입력하세요"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowInstallationModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer whitespace-nowrap"
                >
                  취소
                </button>
                <button
                  onClick={handleAddInstallation}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer whitespace-nowrap"
                >설치 등록</button>
              </div>
            </div>
          </div>
        )}

        {/* 새 발주 등록 모달 */}
        {showOrderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">새 발주 등록</h3>
                <button
                  onClick={() => setShowOrderModal(false)}
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
                      value={orderFormData.supplier}
                      onChange={(e) => setOrderFormData({...orderFormData, supplier: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="공급업체명을 입력하세요"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">주문일</label>
                    <input
                      type="date"
                      value={orderFormData.order_date}
                      onChange={(e) => setOrderFormData({...orderFormData, order_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">배송 예정일</label>
                    <input
                      type="date"
                      value={orderFormData.delivery_date}
                      onChange={(e) => setOrderFormData({...orderFormData, delivery_date: e.target.value})}
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
                      <i className="ri-add-line mr-1"></i>항목 추가
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {orderFormData.items.map((item, index) => (
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
                            onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="1"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">단가</label>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateOrderItem(index, 'unit_price', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="0"
                          />
                        </div>                      
                        <div className="col-span-1">
                          {orderFormData.items.length > 1 && (
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
                        {formatCurrency(orderFormData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer whitespace-nowrap"
                >취소</button>
                <button
                  onClick={handleAddOrder}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer whitespace-nowrap"
                >발주 등록</button>
              </div>
            </div>
          </div>
        )}

        {/* 회수 예약 모달 */}
        {showRecoveryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">회수 예약</h3>
                <button
                  onClick={() => setShowRecoveryModal(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-600">데모, 연구, 과제 용도이면서 설치완료 상태인 컴퓨터 목록입니다. 회수 예약할 항목을 선택하세요.</p>
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
                        설치일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {installations.map((installation: any) => (
                      <RecoveryScheduleRow 
                        key={installation.id} 
                        installation={installation} 
                        onScheduleRecovery={handleTimelineRecoverySchedule} 
                        getPurposeColor={getPurposeColor}
                      />
                    ))}
                    {installations.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center">
                          <div className="text-center py-8">
                            <i className="ri-computer-line text-4xl text-gray-300 mb-4"></i>
                            <p className="text-gray-500">회수 예약 가능한 설치 항목이 없습니다.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowRecoveryModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer whitespace-nowrap"
                >닫기</button>
              </div>
            </div>
          </div>
        )}

        {/* 타임라인 회수 예약 모달 */}
        {showTimelineRecoveryModal && selectedTimelineItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">회수 예약</h3>
                <button
                  onClick={() => setShowTimelineRecoveryModal(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              
              <div className="mb-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">회수 대상</h4>
                  <div className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-500">설치 사이트:</span>
                      <span className="font-medium">{selectedTimelineItem?.company}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-500">모델:</span>
                      <span className="font-medium">{selectedTimelineItem?.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">용도:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedTimelineItem?.type === '데모' ? 'bg-purple-100 text-purple-800' : 
                        selectedTimelineItem?.type === '연구' ? 'bg-green-100 text-green-800' : 
                        selectedTimelineItem?.type === '과제' ? 'bg-blue-100 text-blue-800' :
                        selectedTimelineItem?.type === '계약' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {selectedTimelineItem?.type}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <TimelineRecoveryForm 
                onSubmit={handleTimelineRecoverySubmit}
                onCancel={() => setShowTimelineRecoveryModal(false)}
              />
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

// 타임라인 회수 예약 폼 컴포넌트
function TimelineRecoveryForm({ onSubmit, onCancel }: any) {
  const [recoveryDate, setRecoveryDate] = useState('');
  const [recoveryTechnician, setRecoveryTechnician] = useState('');

  const handleSubmit = () => {
    if (!recoveryDate || !recoveryTechnician) {
      alert('회수 예정일과 담당자를 모두 입력해주세요.');
      return;
    }

    onSubmit(recoveryDate, recoveryTechnician);
    setRecoveryDate('');
    setRecoveryTechnician('');
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">회수 예정일</label>
        <input
          type="date"
          value={recoveryDate}
          onChange={(e) => setRecoveryDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">회수 담당자</label>
        <input
          type="text"
          value={recoveryTechnician}
          onChange={(e) => setRecoveryTechnician(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="담당자명을 입력하세요"
        />
      </div>
      
      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer whitespace-nowrap"
        >취소</button>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer whitespace-nowrap"
        >예약 확정</button>
      </div>
    </div>
  );
}

// 회수 예약 행 컴포넌트
function RecoveryScheduleRow({ installation, onScheduleRecovery, getPurposeColor }: any) {
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [recoveryDate, setRecoveryDate] = useState('');
  const [recoveryTechnician, setRecoveryTechnician] = useState('');

  const handleSubmitSchedule = async () => {
    if (!recoveryDate || !recoveryTechnician) {
      alert('회수 예정일과 담당자를 모두 입력해주세요.');
      return;
    }

    try {
      // 설치 상태를 '회수예정'으로 변경
      await supabase
        .from('installations')
        .update({ 
          status: '회수예정',
          return_date: recoveryDate
        })
        .eq('id', installation.id);

      // 현재 로그인한 사용자 정보 가져기
      const userData = localStorage.getItem('user');
      const currentUser = userData ? JSON.parse(userData) : null;

      // 활동 로그 추가
      await supabase
        .from('activities')
        .insert({
          activity_type: '회수 예약',
          description: `설치번호 ${installation.installation_number} - ${installation.site_name}의 ${installation.computers?.brand} ${installation.computers?.model} (S/N: ${installation.computers?.serial_number}) 회수가 예약되었습니다 (담당자: ${recoveryTechnician}, 예정일: ${recoveryDate})`,
          user_name: currentUser?.name || '사용자'
        });

      // 페이지 새로깍
      window.location.reload();
      
      setShowScheduleForm(false);
      setRecoveryDate('');
      setRecoveryTechnician('');
    } catch (error) {
      console.error('회수 예약 실패:', error);
      alert('회수 예약에 실패했습니다.');
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">
            {installation.installation_number}
          </div>
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
        <div className="text-sm text-gray-900">{installation.installation_date}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        {!showScheduleForm ? (
          <button
            onClick={() => setShowScheduleForm(true)}
            className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700 cursor-pointer"
          >
            <i className="ri-calendar-schedule-line mr-1"></i>
            회수 예약
          </button>
        ) : (
          <div className="space-y-2 min-w-[200px]">
            <div>
              <input
                type="date"
                value={recoveryDate}
                onChange={(e) => setRecoveryDate(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="회수 예정일"
              />
            </div>
            <div>
              <input
                type="text"
                value={recoveryTechnician}
                onChange={(e) => setRecoveryTechnician(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="회수 담당자"
              />
            </div>
            <div className="flex space-x-1">
              <button
                onClick={handleSubmitSchedule}
                className="flex-1 bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 cursor-pointer whitespace-nowrap"
              >
                확인
              </button>
              <button
                onClick={() => {
                  setShowScheduleForm(false);
                  setRecoveryDate('');
                  setRecoveryTechnician('');
                }}
                className="flex-1 bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600 cursor-pointer whitespace-nowrap"
              > 
                취소
              </button>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}


import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 데이터베이스 타입 정의
export interface Computer {
  id: number
  brand: string
  model: string
  serial_number: string
  cpu: string
  ram: string
  storage: string
  location: string
  status: '사용가능' | '사용중' | '수리중' | '폐기'
  created_at: string
  updated_at: string
}

export interface Installation {
  id: number
  installation_number: string
  computer_id: number
  purpose: string
  installation_date: string
  return_date: string | null
  status: '설치완료' | '설치중' | '회수완료' | '회수예정'
  technician: string
  site_name: string
  site_address: string
  site_manager: string
  site_contact: string
  created_at: string
  updated_at: string
  computers?: Computer
}

export interface Order {
  id: number
  order_number: string
  supplier: string
  order_date: string
  delivery_date: string | null
  status: '주문완료' | '배송중' | '배송완료' | '취소'
  total_amount: number
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: number
  order_id: number
  product_name: string
  brand: string
  model: string
  cpu: string
  ram: string
  storage: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

export interface Activity {
  id: number
  activity_type: string
  description: string
  user_name: string
  created_at: string
}

export interface User {
  id: number
  username: string
  password: string
  role: string
  name: string
  email: string | null
  created_at: string
  updated_at: string
}

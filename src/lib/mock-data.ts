import type { OrderStatus } from '@/types/database.types'

export interface MockOrder {
  id: string
  platformOrderId: string
  product: {
    name: string
    sku: string
    image: string
  }
  customer: {
    name: string
    initials: string
    color: string
  }
  date: string
  total: number
  quantity: number
  status: OrderStatus
  supplierStatus?: 'Pending' | 'Sent' | 'Acknowledged' | 'Processing' | 'Error'
  deliveryStatus?: 'Not Shipped' | 'Packing' | 'Shipped' | 'In Transit' | 'Delivered'
}

export const mockOrders: MockOrder[] = [
  {
    id: 'ord-001',
    platformOrderId: 'ORD-7829',
    product: {
      name: 'Smart Watch Strap',
      sku: 'WS-2023-B',
      image: '/placeholder-product.jpg',
    },
    customer: { name: 'John Doe', initials: 'JD', color: 'bg-indigo-500' },
    date: '2024-01-05T13:45:00',
    total: 24990,
    quantity: 1,
    status: 'New',
    supplierStatus: 'Pending',
    deliveryStatus: 'Not Shipped',
  },
  {
    id: 'ord-002',
    platformOrderId: 'ORD-7828',
    product: {
      name: 'Wireless Earbuds Pro',
      sku: 'AP-PRO-W',
      image: '/placeholder-product.jpg',
    },
    customer: { name: 'Sarah Smith', initials: 'SS', color: 'bg-pink-500' },
    date: '2024-01-05T12:30:00',
    total: 129000,
    quantity: 1,
    status: 'Shipped',
    supplierStatus: 'Acknowledged',
    deliveryStatus: 'In Transit',
  },
  {
    id: 'ord-003',
    platformOrderId: 'ORD-7827',
    product: {
      name: 'RGB Mech Keyboard',
      sku: 'KB-RGB-87',
      image: '/placeholder-product.jpg',
    },
    customer: { name: 'Mike Kowalski', initials: 'MK', color: 'bg-teal-500' },
    date: '2024-01-05T11:15:00',
    total: 89990,
    quantity: 1,
    status: 'Shipped',
    supplierStatus: 'Acknowledged',
    deliveryStatus: 'Shipped',
  },
  {
    id: 'ord-004',
    platformOrderId: 'ORD-7826',
    product: {
      name: 'Urban Runners',
      sku: 'SH-URB-42',
      image: '/placeholder-product.jpg',
    },
    customer: { name: 'Emma Lee', initials: 'EL', color: 'bg-orange-500' },
    date: '2024-01-04T18:00:00',
    total: 115500,
    quantity: 1,
    status: 'Cancelled',
    supplierStatus: 'Error',
    deliveryStatus: 'Not Shipped',
  },
  {
    id: 'ord-005',
    platformOrderId: 'ORD-7825',
    product: {
      name: 'Aluminum Laptop Stand',
      sku: 'AC-LS-AL',
      image: '/placeholder-product.jpg',
    },
    customer: { name: 'David Miller', initials: 'DM', color: 'bg-cyan-600' },
    date: '2024-01-04T16:20:00',
    total: 45000,
    quantity: 1,
    status: 'Ordered',
    supplierStatus: 'Sent',
    deliveryStatus: 'Packing',
  },
  {
    id: 'ord-006',
    platformOrderId: 'ORD-7824',
    product: {
      name: 'USB-C Hub 7-in-1',
      sku: 'HB-7IN1-C',
      image: '/placeholder-product.jpg',
    },
    customer: { name: '김민수', initials: '김민', color: 'bg-purple-500' },
    date: '2024-01-04T14:10:00',
    total: 35000,
    quantity: 2,
    status: 'New',
    supplierStatus: 'Pending',
    deliveryStatus: 'Not Shipped',
  },
  {
    id: 'ord-007',
    platformOrderId: 'ORD-7823',
    product: {
      name: 'Wireless Mouse',
      sku: 'WM-BLK-01',
      image: '/placeholder-product.jpg',
    },
    customer: { name: '박지영', initials: '박지', color: 'bg-rose-500' },
    date: '2024-01-04T10:30:00',
    total: 29000,
    quantity: 1,
    status: 'Shipped',
    supplierStatus: 'Acknowledged',
    deliveryStatus: 'Delivered',
  },
]

export interface MockSupplier {
  id: string
  name: string
  contactNumber: string
  contactMethod: 'SMS' | 'Kakao'
  productCount: number
  lastOrderDate: string
}

export const mockSuppliers: MockSupplier[] = [
  {
    id: 'sup-001',
    name: 'TechWholesale Ltd.',
    contactNumber: '010-1234-5678',
    contactMethod: 'Kakao',
    productCount: 45,
    lastOrderDate: '2024-01-05',
  },
  {
    id: 'sup-002',
    name: '디지털허브',
    contactNumber: '010-9876-5432',
    contactMethod: 'SMS',
    productCount: 28,
    lastOrderDate: '2024-01-04',
  },
  {
    id: 'sup-003',
    name: 'AliExpress Partner',
    contactNumber: '010-5555-1234',
    contactMethod: 'Kakao',
    productCount: 120,
    lastOrderDate: '2024-01-05',
  },
]

export interface KPIData {
  dailyRevenue: number
  revenueChange: number
  newOrders: number
  pendingOrders: number
  fulfillmentRate: number
  fulfillmentChange: number
  aiTasksRunning: number
  aiTasksProgress: number
}

export const mockKPIData: KPIData = {
  dailyRevenue: 1240500,
  revenueChange: 12,
  newOrders: 42,
  pendingOrders: 8,
  fulfillmentRate: 98,
  fulfillmentChange: 1,
  aiTasksRunning: 3,
  aiTasksProgress: 67,
}

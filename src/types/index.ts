export interface Customer {
  id?: number
  name: string
  phone?: string
  address?: string
  vehicle_info?: string
  notes?: string
  // 新增字段
  vehicle_brand?: string      // 车辆品牌
  vehicle_model?: string      // 车辆型号
  vin?: string                // 车架号
  engine_number?: string      // 发动机号
  purchase_date?: string      // 购车日期
  vehicle_color?: string      // 车辆颜色
  insurance_date?: string     // 保险购买日期
  insurance_company?: string  // 所属保险公司
  license_plate?: string      // 车牌号
  // 客户档案扩展字段
  contact_person?: string     // 联系人
  contact_phone?: string      // 联系电话
  invoice_title?: string      // 发票抬头
  tax_id?: string             // 税号
  bank_name?: string          // 开户行
  bank_account?: string       // 账号
  created_at?: string
}

export interface Part {
  id?: number
  code: string
  name: string
  english_name?: string
  spec?: string
  vehicle_qty?: number
  unit: string
  cost_price: number
  sale_price: number
  stock_qty: number
  min_stock: number
  category?: string
  location?: string
  vehicle_models?: string     // 适用车型（逗号分隔）
  notes?: string              // 备注
  created_at?: string
}

export interface Supplier {
  id?: number
  name: string
  contact?: string
  phone?: string
  address?: string
  notes?: string
  created_at?: string
}

export interface InOrder {
  id?: number
  order_no: string
  supplier_id?: number
  total_amount: number
  status: 'draft' | 'completed' | 'cancelled'
  remark?: string
  created_at?: string
}

export interface InOrderItem {
  id?: number
  order_id: number
  part_id: number
  qty: number
  unit_price: number
  amount: number
}

export interface OutOrder {
  id?: number
  order_no: string
  type: 'sale' | 'repair' | 'other'
  customer_id?: number
  work_order_id?: number
  total_amount: number
  status: 'draft' | 'completed' | 'cancelled'
  remark?: string
  created_at?: string
}

export interface OutOrderItem {
  id?: number
  order_id: number
  part_id: number
  qty: number
  unit_price: number
  amount: number
}

export interface WorkOrder {
  id?: number
  order_no: string
  customer_id: number
  vehicle_info?: string
  fault_desc?: string
  repair_advice?: string
  priority?: 'normal' | 'urgent'
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  total_parts_amount: number
  total_labor_amount: number
  total_amount: number
  remark?: string
  created_at?: string
  completed_at?: string
}

export interface WorkOrderPart {
  id?: number
  work_order_id: number
  part_id: number
  qty: number
  unit_price: number
  amount: number
}

export interface WorkOrderLabor {
  id?: number
  work_order_id: number
  name: string
  hours: number
  unit_price: number
  amount: number
  technician?: string
}

export interface StockLog {
  id?: number
  part_id: number
  type: 'in' | 'out' | 'adjust'
  qty: number
  before_qty: number
  after_qty: number
  ref_type?: string
  ref_id?: number
  remark?: string
  created_at?: string
}

export interface PartWithStock extends Part {
  stock_status: 'normal' | 'warning' | 'out_of_stock'
}

export interface WorkOrderDetail extends WorkOrder {
  customer_name?: string
  customer_phone?: string
  parts?: (WorkOrderPart & { part_name: string; part_code: string; part_spec?: string; part_unit: string })[]
  labors?: WorkOrderLabor[]
}

export interface DashboardStats {
  total_parts: number
  low_stock_count: number
  out_of_stock_count: number
  total_customers: number
  pending_work_orders: number
  in_progress_work_orders: number
  today_in_amount: number
  today_out_amount: number
}
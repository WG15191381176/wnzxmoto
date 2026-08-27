import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { select, selectOne, execute, transaction, generateOrderNo } from '@/utils/db'
import Sql from '@tauri-apps/plugin-sql'
import { usePartsStore } from './parts'
import { useCustomersStore } from './customers'
import type { WorkOrder, WorkOrderPart, WorkOrderLabor, WorkOrderDetail } from '@/types'

export const useWorkOrdersStore = defineStore('workOrders', () => {
  const workOrders = ref<WorkOrder[]>([])
  const loading = ref(false)
  const statusFilter = ref<'all' | 'open' | 'in_progress' | 'completed' | 'cancelled'>('all')
  const searchQuery = ref('')

  // 分页
  const page = ref(1)
  const pageSize = ref(50)
  const total = ref(0)

  const filteredWorkOrders = computed(() => {
    let result = workOrders.value
    if (statusFilter.value !== 'all') {
      result = result.filter(w => w.status === statusFilter.value)
    }
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(w =>
        w.order_no.toLowerCase().includes(q) ||
        (w.vehicle_info?.toLowerCase().includes(q) ?? false)
      )
    }
    return result
  })

  const stats = computed(() => ({
    total: workOrders.value.length,
    open: workOrders.value.filter(w => w.status === 'open').length,
    in_progress: workOrders.value.filter(w => w.status === 'in_progress').length,
    completed: workOrders.value.filter(w => w.status === 'completed').length,
  }))

  const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)

  async function loadWorkOrders(opts?: { page?: number; pageSize?: number; status?: string; search?: string }) {
    loading.value = true
    try {
      if (opts?.page !== undefined) page.value = opts.page
      if (opts?.pageSize !== undefined) pageSize.value = opts.pageSize
      if (opts?.status !== undefined) statusFilter.value = opts.status as typeof statusFilter.value
      if (opts?.search !== undefined) searchQuery.value = opts.search

      const conditions: string[] = []
      const params: unknown[] = []
      if (statusFilter.value !== 'all') {
        conditions.push('status = ?')
        params.push(statusFilter.value)
      }
      if (searchQuery.value) {
        conditions.push('(order_no LIKE ? OR vehicle_info LIKE ?)')
        const kw = `%${searchQuery.value}%`
        params.push(kw, kw)
      }
      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

      const countResult = await select<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM work_orders ${whereClause}`, params)
      total.value = countResult[0]?.cnt ?? 0

      const offset = (page.value - 1) * pageSize.value
      params.push(pageSize.value, offset)
      workOrders.value = await select<WorkOrder>(
        `SELECT * FROM work_orders ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        params
      )
    } finally {
      loading.value = false
    }
  }

  function setPage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages.value) {
      page.value = newPage
      loadWorkOrders()
    }
  }

  function setPageSize(newSize: number) {
    pageSize.value = newSize
    page.value = 1
    loadWorkOrders()
  }

  async function getWorkOrderDetail(id: number): Promise<WorkOrderDetail | null> {
    const order = await selectOne<WorkOrder>('SELECT * FROM work_orders WHERE id = ?', [id])
    if (!order) return null

    const customer = await selectOne<{ name: string; phone: string }>(
      'SELECT name, phone FROM customers WHERE id = ?', [order.customer_id]
    )

    const parts = await select<WorkOrderPart & { part_name: string; part_code: string; part_spec: string; part_unit: string }>(
      `SELECT wop.*, p.name as part_name, p.code as part_code, p.spec as part_spec, p.unit as part_unit
       FROM work_order_parts wop
       JOIN parts p ON p.id = wop.part_id
       WHERE wop.work_order_id = ?`,
      [id]
    )

    const labors = await select<WorkOrderLabor>(
      'SELECT * FROM work_order_labors WHERE work_order_id = ?',
      [id]
    )

    return {
      ...order,
      customer_name: customer?.name,
      customer_phone: customer?.phone,
      parts,
      labors,
    }
  }

  async function createWorkOrder(
    customerId: number,
    vehicleInfo: string,
    remark?: string
  ): Promise<number> {
    const orderNo = generateOrderNo('WO')
    const result = await execute(
      `INSERT INTO work_orders (order_no, customer_id, vehicle_info, status, remark)
       VALUES (?, ?, ?, 'open', ?)`,
      [orderNo, customerId, vehicleInfo, remark]
    )
    await loadWorkOrders()
    return result.lastInsertId
  }

  async function updateWorkOrderStatus(id: number, status: WorkOrder['status']): Promise<void> {
    const updates: Record<string, unknown> = { status }
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString()
    }
    const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ')
    await execute(`UPDATE work_orders SET ${setClause} WHERE id = ?`, [...Object.values(updates), id])
    await loadWorkOrders()
  }

  async function addWorkOrderPart(
    workOrderId: number,
    partId: number,
    qty: number,
    unitPrice: number
  ): Promise<void> {
    const partsStore = usePartsStore()
    const amount = qty * unitPrice

    await transaction(async (db) => {
      await db.execute(
        `INSERT INTO work_order_parts (work_order_id, part_id, qty, unit_price, amount)
         VALUES (?, ?, ?, ?, ?)`,
        [workOrderId, partId, qty, unitPrice, amount]
      )

      const part = await db.select<{ stock_qty: number }>('SELECT stock_qty FROM parts WHERE id = ?', [partId])
      const beforeQty = part[0]?.stock_qty ?? 0
      if (beforeQty < qty) throw new Error('库存不足')

      const afterQty = beforeQty - qty
      await db.execute('UPDATE parts SET stock_qty = ? WHERE id = ?', [afterQty, partId])

      await db.execute(
        `INSERT INTO stock_logs (part_id, type, qty, before_qty, after_qty, ref_type, ref_id, remark)
         VALUES (?, 'out', ?, ?, ?, 'work_order', ?, ?)`,
        [partId, qty, beforeQty, afterQty, workOrderId, `工单领料`]
      )

      await recalcWorkOrderTotals(db, workOrderId)
    })
    partsStore.loadParts()
  }

  async function removeWorkOrderPart(workOrderId: number, partItemId: number): Promise<void> {
    const partsStore = usePartsStore()

    await transaction(async (db) => {
      const partItem = await db.select<WorkOrderPart>('SELECT * FROM work_order_parts WHERE id = ?', [partItemId])
      if (!partItem[0]) throw new Error('明细不存在')

      await db.execute('DELETE FROM work_order_parts WHERE id = ?', [partItemId])

      const part = await db.select<{ stock_qty: number }>('SELECT stock_qty FROM parts WHERE id = ?', [partItem[0].part_id])
      const beforeQty = part[0]?.stock_qty ?? 0
      const afterQty = beforeQty + partItem[0].qty
      await db.execute('UPDATE parts SET stock_qty = ? WHERE id = ?', [afterQty, partItem[0].part_id])

      await db.execute(
        `INSERT INTO stock_logs (part_id, type, qty, before_qty, after_qty, ref_type, ref_id, remark)
         VALUES (?, 'in', ?, ?, ?, 'work_order', ?, ?)`,
        [partItem[0].part_id, partItem[0].qty, beforeQty, afterQty, workOrderId, `工单退料`]
      )

      await recalcWorkOrderTotals(db, workOrderId)
    })
    partsStore.loadParts()
  }

  async function addWorkOrderLabor(
    workOrderId: number,
    labor: Omit<WorkOrderLabor, 'id' | 'work_order_id' | 'amount'>
  ): Promise<void> {
    const amount = labor.hours * labor.unit_price

    await transaction(async (db) => {
      await db.execute(
        `INSERT INTO work_order_labors (work_order_id, name, hours, unit_price, amount, technician)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [workOrderId, labor.name, labor.hours, labor.unit_price, amount, labor.technician]
      )
      await recalcWorkOrderTotals(db, workOrderId)
    })
  }

  async function removeWorkOrderLabor(workOrderId: number, laborId: number): Promise<void> {
    await transaction(async (db) => {
      await db.execute('DELETE FROM work_order_labors WHERE id = ?', [laborId])
      await recalcWorkOrderTotals(db, workOrderId)
    })
  }

async function recalcWorkOrderTotals(db: Sql, workOrderId: number): Promise<void> {
  const partsResult = await db.select<{ total: number }>(
    'SELECT COALESCE(SUM(amount), 0) as total FROM work_order_parts WHERE work_order_id = ?',
    [workOrderId]
  )
  const laborsResult = await db.select<{ total: number }>(
    'SELECT COALESCE(SUM(amount), 0) as total FROM work_order_labors WHERE work_order_id = ?',
    [workOrderId]
  )

    const totalPartsAmount = partsResult[0]?.total ?? 0
    const totalLaborAmount = laborsResult[0]?.total ?? 0
    const totalAmount = totalPartsAmount + totalLaborAmount

    await db.execute(
      `UPDATE work_orders SET total_parts_amount = ?, total_labor_amount = ?, total_amount = ? WHERE id = ?`,
      [totalPartsAmount, totalLaborAmount, totalAmount, workOrderId]
    )
  }

  async function completeWorkOrder(workOrderId: number): Promise<void> {
    await updateWorkOrderStatus(workOrderId, 'completed')
  }

  async function deleteWorkOrder(id: number): Promise<void> {
    await transaction(async (db) => {
      await db.execute('DELETE FROM work_order_parts WHERE work_order_id = ?', [id])
      await db.execute('DELETE FROM work_order_labors WHERE work_order_id = ?', [id])
      await db.execute('DELETE FROM work_orders WHERE id = ?', [id])
    })
    await loadWorkOrders()
  }

  async function updateWorkOrder(id: number, data: Partial<WorkOrder>): Promise<void> {
    const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'created_at' && k !== 'completed_at')
    if (fields.length === 0) return
    const setClause = fields.map(f => `${f} = ?`).join(', ')
    const values = fields.map(f => (data as any)[f])
    values.push(id)
    await execute(`UPDATE work_orders SET ${setClause} WHERE id = ?`, values)
    await loadWorkOrders()
  }

  async function deleteWorkOrderParts(workOrderId: number): Promise<void> {
    await transaction(async (db) => {
      // 获取要删除的配件明细，用于恢复库存
      const parts = await db.select<WorkOrderPart[]>('SELECT * FROM work_order_parts WHERE work_order_id = ?', [workOrderId])
      for (const part of parts) {
        await db.execute('UPDATE parts SET stock_qty = stock_qty + ? WHERE id = ?', [part.qty, part.part_id])
        const p = await db.select<{ stock_qty: number }>('SELECT stock_qty FROM parts WHERE id = ?', [part.part_id])
        const afterQty = p[0]?.stock_qty ?? part.qty
        await db.execute(
          `INSERT INTO stock_logs (part_id, type, qty, before_qty, after_qty, ref_type, ref_id, remark)
           VALUES (?, 'in', ?, ?, ?, 'work_order', ?, ?)`,
          [part.part_id, part.qty, afterQty - part.qty, afterQty, workOrderId, `工单删除退料`]
        )
      }
      await db.execute('DELETE FROM work_order_parts WHERE work_order_id = ?', [workOrderId])
    })
    const partsStore = usePartsStore()
    partsStore.loadParts()
  }

  async function deleteWorkOrderLabors(workOrderId: number): Promise<void> {
    await transaction(async (db) => {
      await db.execute('DELETE FROM work_order_labors WHERE work_order_id = ?', [workOrderId])
    })
  }

  return {
    workOrders,
    loading,
    statusFilter,
    searchQuery,
    page,
    pageSize,
    total,
    totalPages,
    filteredWorkOrders,
    stats,
    loadWorkOrders,
    setPage,
    setPageSize,
    getWorkOrderDetail,
    createWorkOrder,
    updateWorkOrderStatus,
    updateWorkOrder,
    addWorkOrderPart,
    removeWorkOrderPart,
    addWorkOrderLabor,
    removeWorkOrderLabor,
    completeWorkOrder,
    deleteWorkOrder,
    deleteWorkOrderParts,
    deleteWorkOrderLabors,
  }
})
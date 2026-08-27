import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { select, selectOne, execute, transaction, generateOrderNo } from '@/utils/db'
import { usePartsStore } from './parts'
import { useSuppliersStore } from './suppliers'
import type { InOrder, InOrderItem, OutOrder, OutOrderItem, StockLog, Part } from '@/types'
import { exportInOrderGuide } from '@/utils/excel'

export const useStockStore = defineStore('stock', () => {
  const inOrders = ref<InOrder[]>([])
  const outOrders = ref<OutOrder[]>([])
  const stockLogs = ref<StockLog[]>([])
  const loading = ref(false)

  // 入库单分页
  const inOrderPage = ref(1)
  const inOrderPageSize = ref(50)
  const inOrderTotal = ref(0)
  const inOrderSearch = ref('')
  const inOrderStatusFilter = ref('')

  // 出库单分页
  const outOrderPage = ref(1)
  const outOrderPageSize = ref(50)
  const outOrderTotal = ref(0)
  const outOrderSearch = ref('')
  const outOrderStatusFilter = ref('')
  const outOrderTypeFilter = ref('')

  // 库存流水分页
  const stockLogPage = ref(1)
  const stockLogPageSize = ref(50)
  const stockLogTotal = ref(0)
  const stockLogPartId = ref<number | undefined>(undefined)
  const stockLogTypeFilter = ref('')

  const inOrderStats = computed(() => ({
    total: inOrders.value.length,
    draft: inOrders.value.filter(o => o.status === 'draft').length,
    completed: inOrders.value.filter(o => o.status === 'completed').length,
  }))

  const outOrderStats = computed(() => ({
    total: outOrders.value.length,
    draft: outOrders.value.filter(o => o.status === 'draft').length,
    completed: outOrders.value.filter(o => o.status === 'completed').length,
  }))

  const inOrderTotalPages = computed(() => Math.ceil(inOrderTotal.value / inOrderPageSize.value) || 1)
  const outOrderTotalPages = computed(() => Math.ceil(outOrderTotal.value / outOrderPageSize.value) || 1)
  const stockLogTotalPages = computed(() => Math.ceil(stockLogTotal.value / stockLogPageSize.value) || 1)

  async function loadInOrders(opts?: { page?: number; pageSize?: number; search?: string; status?: string }) {
    loading.value = true
    try {
      if (opts?.page !== undefined) inOrderPage.value = opts.page
      if (opts?.pageSize !== undefined) inOrderPageSize.value = opts.pageSize
      if (opts?.search !== undefined) inOrderSearch.value = opts.search
      if (opts?.status !== undefined) inOrderStatusFilter.value = opts.status

      const conditions: string[] = []
      const params: unknown[] = []
      if (inOrderSearch.value) {
        conditions.push('(order_no LIKE ? OR remark LIKE ?)')
        const kw = `%${inOrderSearch.value}%`
        params.push(kw, kw)
      }
      if (inOrderStatusFilter.value) {
        conditions.push('status = ?')
        params.push(inOrderStatusFilter.value)
      }
      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

      const countResult = await select<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM in_orders ${whereClause}`, params)
      inOrderTotal.value = countResult[0]?.cnt ?? 0

      const offset = (inOrderPage.value - 1) * inOrderPageSize.value
      params.push(inOrderPageSize.value, offset)
      inOrders.value = await select<InOrder>(
        `SELECT * FROM in_orders ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        params
      )
    } finally {
      loading.value = false
    }
  }

  async function loadOutOrders(opts?: { page?: number; pageSize?: number; search?: string; status?: string; type?: string }) {
    loading.value = true
    try {
      if (opts?.page !== undefined) outOrderPage.value = opts.page
      if (opts?.pageSize !== undefined) outOrderPageSize.value = opts.pageSize
      if (opts?.search !== undefined) outOrderSearch.value = opts.search
      if (opts?.status !== undefined) outOrderStatusFilter.value = opts.status
      if (opts?.type !== undefined) outOrderTypeFilter.value = opts.type

      const conditions: string[] = []
      const params: unknown[] = []
      if (outOrderSearch.value) {
        conditions.push('(order_no LIKE ? OR remark LIKE ?)')
        const kw = `%${outOrderSearch.value}%`
        params.push(kw, kw)
      }
      if (outOrderStatusFilter.value) {
        conditions.push('status = ?')
        params.push(outOrderStatusFilter.value)
      }
      if (outOrderTypeFilter.value) {
        conditions.push('type = ?')
        params.push(outOrderTypeFilter.value)
      }
      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

      const countResult = await select<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM out_orders ${whereClause}`, params)
      outOrderTotal.value = countResult[0]?.cnt ?? 0

      const offset = (outOrderPage.value - 1) * outOrderPageSize.value
      params.push(outOrderPageSize.value, offset)
      outOrders.value = await select<OutOrder>(
        `SELECT * FROM out_orders ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        params
      )
    } finally {
      loading.value = false
    }
  }

  async function loadStockLogs(opts?: { page?: number; pageSize?: number; partId?: number; type?: string }) {
    if (opts?.page !== undefined) stockLogPage.value = opts.page
    if (opts?.pageSize !== undefined) stockLogPageSize.value = opts.pageSize
    if (opts?.partId !== undefined) stockLogPartId.value = opts.partId
    if (opts?.type !== undefined) stockLogTypeFilter.value = opts.type

    const conditions: string[] = []
    const params: unknown[] = []
    if (stockLogPartId.value) {
      conditions.push('part_id = ?')
      params.push(stockLogPartId.value)
    }
    if (stockLogTypeFilter.value) {
      conditions.push('type = ?')
      params.push(stockLogTypeFilter.value)
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const countResult = await select<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM stock_logs ${whereClause}`, params)
    stockLogTotal.value = countResult[0]?.cnt ?? 0

    const offset = (stockLogPage.value - 1) * stockLogPageSize.value
    params.push(stockLogPageSize.value, offset)
    stockLogs.value = await select<StockLog>(
      `SELECT * FROM stock_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      params
    )
  }

  function setInOrderPage(page: number) {
    if (page >= 1 && page <= inOrderTotalPages.value) {
      inOrderPage.value = page
      loadInOrders()
    }
  }

  function setInOrderPageSize(size: number) {
    inOrderPageSize.value = size
    inOrderPage.value = 1
    loadInOrders()
  }

  function setOutOrderPage(page: number) {
    if (page >= 1 && page <= outOrderTotalPages.value) {
      outOrderPage.value = page
      loadOutOrders()
    }
  }

  function setOutOrderPageSize(size: number) {
    outOrderPageSize.value = size
    outOrderPage.value = 1
    loadOutOrders()
  }

  function setStockLogPage(page: number) {
    if (page >= 1 && page <= stockLogTotalPages.value) {
      stockLogPage.value = page
      loadStockLogs()
    }
  }

  function setStockLogPageSize(size: number) {
    stockLogPageSize.value = size
    stockLogPage.value = 1
    loadStockLogs()
  }

  async function getInOrder(id: number) {
    const order = await selectOne<InOrder>('SELECT * FROM in_orders WHERE id = ?', [id])
    if (!order) return null
    const items = await select<InOrderItem>('SELECT * FROM in_order_items WHERE order_id = ?', [id])
    // 关联配件信息
    const partsStore = usePartsStore()
    const itemsWithPart = items.map(item => {
      const part = partsStore.parts.find(p => p.id === item.part_id)
      return {
        ...item,
        part_code: part?.code || '',
        part_name: part?.name || '',
        part_spec: part?.spec || '',
        part_unit: part?.unit || '',
        part_location: part?.location || '',
        part_cost_price: part?.cost_price || 0,
      }
    })
    return { ...order, items: itemsWithPart }
  }

  async function getOutOrder(id: number) {
    const order = await selectOne<OutOrder>('SELECT * FROM out_orders WHERE id = ?', [id])
    if (!order) return null
    const items = await select<OutOrderItem>('SELECT * FROM out_order_items WHERE order_id = ?', [id])
    return { ...order, items }
  }

  async function createInOrder(supplierId: number | undefined, items: Omit<InOrderItem, 'id' | 'order_id'>[], remark?: string) {
    const partsStore = usePartsStore()
    const orderNo = generateOrderNo('IN')
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)

    await transaction(async (db) => {
      const orderResult = await db.execute(
        `INSERT INTO in_orders (order_no, supplier_id, total_amount, status, remark)
         VALUES (?, ?, ?, 'completed', ?)`,
        [orderNo, supplierId || null, totalAmount, remark]
      )
      const orderId = orderResult.lastInsertId

      for (const item of items) {
        await db.execute(
          `INSERT INTO in_order_items (order_id, part_id, qty, unit_price, amount)
           VALUES (?, ?, ?, ?, ?)`,
          [orderId, item.part_id, item.qty, item.unit_price, item.amount]
        )
        await db.execute('UPDATE parts SET stock_qty = stock_qty + ? WHERE id = ?', [item.qty, item.part_id])
        const part = await db.select<{ stock_qty: number }>('SELECT stock_qty FROM parts WHERE id = ?', [item.part_id])
        const afterQty = part[0]?.stock_qty ?? item.qty
        await db.execute(
          `INSERT INTO stock_logs (part_id, type, qty, before_qty, after_qty, ref_type, ref_id, remark)
           VALUES (?, 'in', ?, ?, ?, 'in_order', ?, ?)`,
          [item.part_id, item.qty, afterQty - item.qty, afterQty, orderId, `入库单: ${orderNo}`]
        )
      }
    })
    await loadInOrders()
    partsStore.loadParts()
  }

  async function createOutOrder(
    type: 'sale' | 'repair' | 'other',
    customerId: number | undefined,
    workOrderId: number | undefined,
    items: Omit<OutOrderItem, 'id' | 'order_id'>[],
    remark?: string
  ) {
    const partsStore = usePartsStore()
    const orderNo = generateOrderNo(type === 'repair' ? 'WO' : type === 'sale' ? 'SO' : 'OO')
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)

    await transaction(async (db) => {
      const orderResult = await db.execute(
        `INSERT INTO out_orders (order_no, type, customer_id, work_order_id, total_amount, status, remark)
         VALUES (?, ?, ?, ?, ?, 'completed', ?)`,
        [orderNo, type, customerId || null, workOrderId || null, totalAmount, remark]
      )
      const orderId = orderResult.lastInsertId

      for (const item of items) {
        const part = await db.select<{ stock_qty: number }>('SELECT stock_qty FROM parts WHERE id = ?', [item.part_id])
        const beforeQty = part[0]?.stock_qty ?? 0
        if (beforeQty < item.qty) throw new Error(`配件库存不足 (ID: ${item.part_id})`)

        await db.execute(
          `INSERT INTO out_order_items (order_id, part_id, qty, unit_price, amount)
           VALUES (?, ?, ?, ?, ?)`,
          [orderId, item.part_id, item.qty, item.unit_price, item.amount]
        )
        const afterQty = beforeQty - item.qty
        await db.execute('UPDATE parts SET stock_qty = ? WHERE id = ?', [afterQty, item.part_id])
        await db.execute(
          `INSERT INTO stock_logs (part_id, type, qty, before_qty, after_qty, ref_type, ref_id, remark)
           VALUES (?, 'out', ?, ?, ?, 'out_order', ?, ?)`,
          [item.part_id, item.qty, beforeQty, afterQty, orderId, `出库单: ${orderNo}`]
        )
      }
    })
    await loadOutOrders()
    partsStore.loadParts()
  }

  // 导出入库指导单
  function exportInOrderGuideSheet(orderId: number) {
    return getInOrder(orderId).then(order => {
      if (!order || !order.items) {
        throw new Error('入库单不存在或无明细')
      }

      const guideItems = order.items.map(item => ({
        partCode: item.part_code,
        partName: item.part_name,
        spec: item.part_spec,
        unit: item.part_unit,
        location: item.part_location || '待分配',
        qty: item.qty,
        costPrice: item.unit_price,
      }))

      // 获取供应商名称
      let supplierName = ''
      if (order.supplier_id) {
        const suppliersStore = useSuppliersStore()
        const supplier = suppliersStore.suppliers.find(s => s.id === order.supplier_id)
        if (supplier) supplierName = supplier.name
      }

      exportInOrderGuide(guideItems, order.order_no, supplierName)
    })
  }

  return {
    inOrders,
    outOrders,
    stockLogs,
    loading,
    inOrderStats,
    outOrderStats,
    // 入库单分页
    inOrderPage,
    inOrderPageSize,
    inOrderTotal,
    inOrderTotalPages,
    inOrderSearch,
    inOrderStatusFilter,
    // 出库单分页
    outOrderPage,
    outOrderPageSize,
    outOrderTotal,
    outOrderTotalPages,
    outOrderSearch,
    outOrderStatusFilter,
    outOrderTypeFilter,
    // 库存流水分页
    stockLogPage,
    stockLogPageSize,
    stockLogTotal,
    stockLogTotalPages,
    stockLogPartId,
    stockLogTypeFilter,
    loadInOrders,
    loadOutOrders,
    loadStockLogs,
    setInOrderPage,
    setInOrderPageSize,
    setOutOrderPage,
    setOutOrderPageSize,
    setStockLogPage,
    setStockLogPageSize,
    getInOrder,
    getOutOrder,
    createInOrder,
    createOutOrder,
    exportInOrderGuideSheet,
  }
})
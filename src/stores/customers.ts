import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { select, selectOne, execute, generateOrderNo } from '@/utils/db'
import type { Customer } from '@/types'

export const useCustomersStore = defineStore('customers', () => {
  const customers = ref<Customer[]>([])
  const loading = ref(false)
  const searchQuery = ref('')

  // 分页
  const page = ref(1)
  const pageSize = ref(50)
  const total = ref(0)

  const filteredCustomers = computed(() => {
    if (!searchQuery.value) return customers.value
    const q = searchQuery.value.toLowerCase()
    return customers.value.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.phone?.toLowerCase().includes(q) ?? false) ||
      (c.vehicle_info?.toLowerCase().includes(q) ?? false) ||
      (c.vin?.toLowerCase().includes(q) ?? false) ||
      (c.license_plate?.toLowerCase().includes(q) ?? false)
    )
  })

  const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)

  async function loadCustomers(opts?: { page?: number; pageSize?: number; search?: string }) {
    loading.value = true
    try {
      if (opts?.page !== undefined) page.value = opts.page
      if (opts?.pageSize !== undefined) pageSize.value = opts.pageSize
      if (opts?.search !== undefined) searchQuery.value = opts.search

      const conditions: string[] = []
      const params: unknown[] = []
      if (searchQuery.value) {
        conditions.push('(name LIKE ? OR phone LIKE ? OR vehicle_info LIKE ? OR vin LIKE ? OR license_plate LIKE ?)')
        const kw = `%${searchQuery.value}%`
        params.push(kw, kw, kw, kw, kw)
      }
      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

      const countResult = await select<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM customers ${whereClause}`, params)
      total.value = countResult[0]?.cnt ?? 0

      const offset = (page.value - 1) * pageSize.value
      params.push(pageSize.value, offset)
      customers.value = await select<Customer>(
        `SELECT * FROM customers ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        params
      )
    } finally {
      loading.value = false
    }
  }

  function setPage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages.value) {
      page.value = newPage
      loadCustomers()
    }
  }

  function setPageSize(newSize: number) {
    pageSize.value = newSize
    page.value = 1
    loadCustomers()
  }

  async function getCustomer(id: number): Promise<Customer | null> {
    return selectOne<Customer>('SELECT * FROM customers WHERE id = ?', [id])
  }

  async function createCustomer(customer: Omit<Customer, 'id' | 'created_at'>): Promise<number> {
    const result = await execute(
      `INSERT INTO customers (name, phone, address, vehicle_info, notes, vehicle_brand, vehicle_model, vin, engine_number, purchase_date, vehicle_color, insurance_date, insurance_company, license_plate, contact_person, contact_phone, invoice_title, tax_id, bank_name, bank_account)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer.name, customer.phone, customer.address, customer.vehicle_info, customer.notes, customer.vehicle_brand, customer.vehicle_model, customer.vin, customer.engine_number, customer.purchase_date, customer.vehicle_color, customer.insurance_date, customer.insurance_company, customer.license_plate, customer.contact_person, customer.contact_phone, customer.invoice_title, customer.tax_id, customer.bank_name, customer.bank_account]
    )
    await loadCustomers()
    return result.lastInsertId
  }

  async function updateCustomer(id: number, customer: Partial<Customer>): Promise<void> {
    const fields = Object.keys(customer).filter(k => k !== 'id' && k !== 'created_at')
    if (fields.length === 0) return
    const setClause = fields.map(f => `${f} = ?`).join(', ')
    const values = fields.map(f => (customer as any)[f])
    values.push(id)
    await execute(`UPDATE customers SET ${setClause} WHERE id = ?`, values)
    await loadCustomers()
  }

  async function deleteCustomer(id: number): Promise<void> {
    await execute('DELETE FROM customers WHERE id = ?', [id])
    await loadCustomers()
  }

  // Excel 导入客户
  async function importCustomersFromExcel(rows: any[]): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0
    let failed = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2
      try {
        if (!row.name) {
          errors.push(`第 ${rowNum} 行：客户姓名为必填项`)
          failed++
          continue
        }

        const customer: Omit<Customer, 'id' | 'created_at'> = {
          name: String(row.name).trim(),
          phone: row.phone ? String(row.phone).trim() : '',
          address: row.address ? String(row.address).trim() : '',
          vehicle_info: row.vehicle_info ? String(row.vehicle_info).trim() : '',
          notes: row.notes ? String(row.notes).trim() : '',
          vehicle_brand: row.vehicle_brand ? String(row.vehicle_brand).trim() : '',
          vehicle_model: row.vehicle_model ? String(row.vehicle_model).trim() : '',
          vin: row.vin ? String(row.vin).trim() : '',
          engine_number: row.engine_number ? String(row.engine_number).trim() : '',
          purchase_date: row.purchase_date ? String(row.purchase_date).trim() : '',
          vehicle_color: row.vehicle_color ? String(row.vehicle_color).trim() : '',
          insurance_date: row.insurance_date ? String(row.insurance_date).trim() : '',
          insurance_company: row.insurance_company ? String(row.insurance_company).trim() : '',
          license_plate: row.license_plate ? String(row.license_plate).trim() : ''
        }

        await createCustomer(customer)
        success++
      } catch (error: any) {
        errors.push(`第 ${rowNum} 行：${error.message}`)
        failed++
      }
    }

    return { success, failed, errors }
  }

  return {
    customers,
    loading,
    searchQuery,
    page,
    pageSize,
    total,
    totalPages,
    filteredCustomers,
    loadCustomers,
    setPage,
    setPageSize,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    importCustomersFromExcel,
  }
})
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  ElCard,
  ElTable,
  ElTableColumn,
  ElButton,
  ElInput,
  ElSelect,
  ElOption,
  ElTag,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInputNumber,
  ElMessage,
  ElDescriptions,
  ElDescriptionsItem,
  ElDivider,
  ElPagination,
} from 'element-plus'
import { Plus, Edit, Delete, Search, Check, Close, Document, User, Tools, Download, Upload } from '@element-plus/icons-vue'
import { usePartsStore } from '@/stores/parts'
import { useCustomersStore } from '@/stores/customers'
import { useStockStore } from '@/stores/stock'
import { generateOrderNo } from '@/utils/db'
import type { OutOrder, OutOrderItem, Part } from '@/types'

const router = useRouter()
const partsStore = usePartsStore()
const customersStore = useCustomersStore()
const stockStore = useStockStore()

const searchForm = ref({ keyword: '', type: '', status: '' })
const listLoading = ref(false)
const outOrders = ref<OutOrder[]>([])

const dialogVisible = ref(false)
const dialogTitle = ref('')
const currentOrder = ref<OutOrder>({ order_no: '', type: 'sale', customer_id: undefined, work_order_id: undefined, total_amount: 0, status: 'draft', remark: '' })
const orderItems = ref<OutOrderItem[]>([])
const partsOptions = ref<Part[]>([])
const isEditing = ref(false)
const rules = ref({
  type: [{ required: true, message: '请选择出库类型', trigger: 'change' }],
})

const formRef = ref()

const typeLabelMap = computed(() => ({ sale: '销售', repair: '维修', other: '其他' }))
const customerMap = computed(() => {
  const map: Record<number, string> = {}
  customersStore.customers.forEach(c => { map[c.id!] = c.name })
  return map
})
const partMap = computed(() => {
  const map: Record<number, Part> = {}
  partsOptions.value.forEach(p => { map[p.id!] = p })
  return map
})

const statusTagMap: Record<string, { type: 'warning' | 'info' | 'success' | 'danger' | 'primary'; text: string }> = {
  draft: { type: 'info', text: '草稿' },
  completed: { type: 'success', text: '已完成' },
  cancelled: { type: 'danger', text: '已取消' },
}

function getStatusTag(status: string) {
  return statusTagMap[status] || { type: 'info', text: status }
}

async function loadData() {
  listLoading.value = true
  try {
    await Promise.all([
      partsStore.loadParts(),
      customersStore.loadCustomers(),
      stockStore.loadOutOrders({
        page: stockStore.outOrderPage,
        pageSize: stockStore.outOrderPageSize,
        search: searchForm.value.keyword,
        status: searchForm.value.status,
        type: searchForm.value.type,
      }),
    ])
    outOrders.value = stockStore.outOrders
    partsOptions.value = partsStore.parts
  } finally {
    listLoading.value = false
  }
}

function onSearch() {
  stockStore.outOrderPage = 1
  loadData()
}

function onPageChange(page: number) {
  stockStore.setOutOrderPage(page)
}

function onPageSizeChange(size: number) {
  stockStore.setOutOrderPageSize(size)
}

function openAddDialog(type: 'sale' | 'repair' | 'other' = 'sale') {
  isEditing.value = false
  const typeMap = { sale: '销售出库', repair: '维修领料', other: '其他出库' }
  dialogTitle.value = `新建${typeMap[type]}`
  currentOrder.value = { order_no: generateOrderNo(type === 'repair' ? 'WO' : type === 'sale' ? 'SO' : 'OO'), type, customer_id: undefined, work_order_id: undefined, total_amount: 0, status: 'draft', remark: '' }
  orderItems.value = []
  partsStore.loadAllParts()
  dialogVisible.value = true
}

async function handleSubmit(formRef: any) {
  if (!formRef) return
  formRef.validate(async (valid: boolean) => {
    if (!valid) return
    try {
      if (orderItems.value.length === 0) {
        ElMessage.warning('请至少添加一条出库明细')
        return
      }
      await stockStore.createOutOrder(
        currentOrder.value.type,
        currentOrder.value.customer_id,
        currentOrder.value.work_order_id,
        orderItems.value,
        currentOrder.value.remark
      )
      ElMessage.success('出库成功')
      dialogVisible.value = false
      await loadData()
    } catch (error: any) {
      console.error('[OutOrders] 保存失败:', error)
      ElMessage.error(error.message || '操作失败')
    }
  })
}

function addItem() {
  orderItems.value.push({ order_id: 0, part_id: 0, qty: 1, unit_price: 0, amount: 0 })
}

function removeItem(index: number) {
  orderItems.value.splice(index, 1)
  calcTotal()
}

function calcTotal() {
  currentOrder.value.total_amount = orderItems.value.reduce((sum, item) => sum + item.amount, 0)
}

function onPartChange(item: OutOrderItem, partId: number) {
  const part = partsOptions.value.find(p => p.id === partId)
  if (part) {
    item.unit_price = part.sale_price
    item.amount = item.qty * item.unit_price
    calcTotal()
  }
}

function onQtyChange(item: OutOrderItem) {
  item.amount = item.qty * item.unit_price
  calcTotal()
}

function viewDetail(row: OutOrder) {
  router.push(`/inventory/out/detail/${row.id}`)
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="page-container">
    <!-- 页面头部操作按钮 -->
    <template #header-actions>
      <div class="flex gap-2">
        <el-button type="primary" icon="Plus" @click="openAddDialog('sale')">销售出库</el-button>
        <el-button type="primary" icon="Tools" @click="openAddDialog('repair')">维修领料</el-button>
        <el-button type="primary" icon="Document" @click="openAddDialog('other')">其他出库</el-button>
      </div>
    </template>

    <!-- 搜索栏 -->
    <el-form :model="searchForm" inline class="mb-4 search-form wps-card wps-card__body" style="padding: 16px;">
      <el-form-item>
        <el-input v-model="searchForm.keyword" placeholder="单号/备注" prefix-icon="Search" clearable style="width: 240px" @keyup.enter="onSearch" />
      </el-form-item>
      <el-form-item>
        <el-select v-model="searchForm.type" placeholder="全部类型" style="width: 140px" @change="onSearch" filterable>
          <el-option label="销售出库" value="sale" />
          <el-option label="维修领料" value="repair" />
          <el-option label="其他出库" value="other" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-select v-model="searchForm.status" placeholder="全部状态" style="width: 140px" @change="onSearch" filterable>
          <el-option label="草稿" value="draft" />
          <el-option label="已完成" value="completed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button icon="Search" @click="onSearch">搜索</el-button>
        <el-button @click="searchForm.keyword=''; searchForm.type=''; searchForm.status=''; onSearch()">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 出库单列表 -->
    <el-card class="wps-card">
      <el-table :data="outOrders" border size="small" style="width: 100%" v-loading="listLoading" row-key="id">
        <el-table-column prop="order_no" label="出库单号" width="180" />
        <el-table-column label="类型" width="110">
          <template #default="scope">
            <el-tag effect="light" size="small">{{ typeLabelMap[(scope.row as OutOrder).type as keyof typeof typeLabelMap] || (scope.row as OutOrder).type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="客户/工单" width="150">
          <template #default="scope">
            <template v-if="(scope.row as OutOrder).type === 'sale' && (scope.row as OutOrder).customer_id">
              <el-tag type="info" effect="light" size="small">
                <User class="mr-1" />
                {{ customerMap[(scope.row as OutOrder).customer_id!] || '未知' }}
              </el-tag>
            </template>
            <template v-else-if="(scope.row as OutOrder).type === 'repair' && (scope.row as OutOrder).work_order_id">
              <el-tag type="warning" effect="light" size="small">
                <Tools class="mr-1" />
                工单 #{{ (scope.row as OutOrder).work_order_id }}
              </el-tag>
            </template>
            <template v-else>-</template>
          </template>
        </el-table-column>
        <el-table-column prop="total_amount" label="总金额" width="110">
          <template #default="scope">¥{{ Number((scope.row as OutOrder).total_amount).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="statusTagMap[(scope.row as OutOrder).status]?.type || 'info'" effect="light" size="small">{{ statusTagMap[(scope.row as OutOrder).status]?.text || '未知' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="scope">{{ (scope.row as OutOrder).created_at?.slice(0, 16).replace('T', ' ') }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" link @click="viewDetail(scope.row as OutOrder)"><Document />详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="stockStore.outOrderPage"
        v-model:page-size="stockStore.outOrderPageSize"
        :page-sizes="[20, 50, 100, 200]"
        :total="stockStore.outOrderTotal"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="onPageChange"
        @page-size-change="onPageSizeChange"
        class="mt-4"
      />
    </el-card>

    <!-- 新建/编辑出库单弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="800px" destroy-on-close>
      <el-form :model="currentOrder" :rules="rules" label-width="100px" class="mb-4" ref="formRef">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="出库单号" prop="order_no">
              <el-input v-model="currentOrder.order_no" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="出库类型" prop="type">
              <el-select v-model="currentOrder.type" placeholder="请选择类型" style="width: 100%" disabled>
                <el-option label="销售出库" value="sale" />
                <el-option label="维修领料" value="repair" />
                <el-option label="其他出库" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="currentOrder.type === 'sale'">
            <el-form-item label="客户" prop="customer_id">
              <el-select v-model="currentOrder.customer_id" placeholder="请选择客户" style="width: 100%" filterable>
                <el-option v-for="c in customersStore.customers" :key="c.id" :label="c.name + (c.phone ? ' - ' + c.phone : '')" :value="c.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="currentOrder.type === 'repair'">
            <el-form-item label="关联工单" prop="work_order_id">
              <el-input v-model="currentOrder.work_order_id" placeholder="工单ID" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="currentOrder.remark" type="textarea" :rows="2" placeholder="请输入备注" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <el-divider>出库明细</el-divider>
      <div class="mb-2 flex justify-end">
        <el-button size="small" icon="Plus" @click="addItem">添加明细</el-button>
      </div>

      <el-table :data="orderItems" border size="small" style="width: 100%" row-key="part_id">
        <el-table-column label="配件编码" width="140">
          <template #default="{ row }">
            <el-select v-model="row.part_id" style="width: 100%" placeholder="请选择配件" filterable @change="val => onPartChange(row as OutOrderItem, val)">
              <el-option v-for="p in partsOptions" :key="p.id" :label="p.name + ' (' + p.code + ') - 库存:' + p.stock_qty + p.unit" :value="p.id" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="中文名称" width="160">
          <template #default="{ row }">
            {{ partMap[(row as OutOrderItem).part_id!]?.name || '' }}
          </template>
        </el-table-column>
        <el-table-column label="英文名称" width="160">
          <template #default="{ row }">
            {{ partMap[(row as OutOrderItem).part_id!]?.english_name || '' }}
          </template>
        </el-table-column>
        <el-table-column label="规格" width="120">
          <template #default="{ row }">
            {{ partMap[(row as OutOrderItem).part_id!]?.spec || '' }}
          </template>
        </el-table-column>
        <el-table-column label="库存" width="90">
          <template #default="{ row }">
            <span :class="partMap[(row as OutOrderItem).part_id!]?.stock_qty <= 0 ? 'stock-out' : 'stock-normal'">{{ partMap[(row as OutOrderItem).part_id!]?.stock_qty || 0 }}{{ partMap[(row as OutOrderItem).part_id!]?.unit || '' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="单位" width="80">
          <template #default="{ row }">
            {{ partMap[(row as OutOrderItem).part_id!]?.unit || '' }}
          </template>
        </el-table-column>
        <el-table-column label="单价" width="100">
          <template #default="{ row }">
            <el-input-number v-model="row.unit_price" :precision="2" :min="0" :step="0.01" style="width: 100%" @change="onQtyChange(row as OutOrderItem)" />
          </template>
        </el-table-column>
        <el-table-column label="数量" width="100">
          <template #default="{ row }">
            <el-input-number v-model="row.qty" :min="1" :step="1" style="width: 100%" @change="onQtyChange(row as OutOrderItem)" />
          </template>
        </el-table-column>
        <el-table-column label="金额" width="110">
          <template #default="{ row }">¥{{ (row as OutOrderItem).amount.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ row, $index }">
            <el-button size="small" type="danger" link @click="removeItem($index)"><Delete /></el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="flex justify-end mt-4">
        <el-descriptions border :column="2" size="small">
          <el-descriptions-item label="合计金额">
            <span class="text-xl font-bold text-primary-600">¥{{ Number(currentOrder.total_amount).toFixed(2) }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit(formRef)">确认出库</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-container :deep(.el-card) {
  margin-bottom: 16px;
}

.page-container :deep(.el-table) {
  font-size: 13px;
}

.page-container :deep(.el-table__header-wrapper th) {
  background: var(--wps-bg-ribbon, #f8f9fa);
  color: var(--wps-text-tertiary, #6b7280);
  font-weight: 600;
  font-size: 12px;
}

.page-container :deep(.el-table__row:hover td) {
  background: var(--wps-bg-tertiary, #e8edf3);
}

.page-container :deep(.el-pagination) {
  padding-top: 16px;
  border-top: 1px solid var(--wps-border-light, #e0e6ed);
  margin-top: 8px;
}
</style>
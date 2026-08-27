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
import { Plus, Edit, Delete, Search, Check, Close, Document, Van } from '@element-plus/icons-vue'
import { usePartsStore } from '@/stores/parts'
import { useSuppliersStore } from '@/stores/suppliers'
import { useStockStore } from '@/stores/stock'
import { generateOrderNo } from '@/utils/db'
import type { InOrder, InOrderItem, Part } from '@/types'

const router = useRouter()
const partsStore = usePartsStore()
const suppliersStore = useSuppliersStore()
const stockStore = useStockStore()

const searchForm = ref({ keyword: '', status: '' })
const listLoading = ref(false)
const inOrders = ref<InOrder[]>([])

const dialogVisible = ref(false)
const dialogTitle = ref('')
const currentOrder = ref<InOrder>({ order_no: '', supplier_id: undefined, total_amount: 0, status: 'draft', remark: '' })
const orderItems = ref<InOrderItem[]>([])
const partsOptions = ref<Part[]>([])
const isEditing = ref(false)
const rules = ref({ supplier_id: [{ required: true, message: '请选择供应商', trigger: 'change' }] })

const formRef = ref()

const supplierMap = computed(() => {
  const map: Record<number, string> = {}
  suppliersStore.suppliers.forEach(s => { map[s.id!] = s.name })
  return map
})

const statusTagMap: Record<string, { type: 'warning' | 'info' | 'success' | 'danger' | 'primary'; text: string }> = {
  draft: { type: 'info', text: '草稿' },
  completed: { type: 'success', text: '已完成' },
  cancelled: { type: 'danger', text: '已取消' },
}

const partMap = computed(() => {
  const map: Record<number, Part> = {}
  partsOptions.value.forEach(p => { map[p.id!] = p })
  return map
})

function getStatusTag(status: string) {
  return statusTagMap[status] || { type: 'info', text: status }
}

async function loadData() {
  listLoading.value = true
  try {
    await Promise.all([
      partsStore.loadParts(),
      suppliersStore.loadSuppliers(),
      stockStore.loadInOrders({
        page: stockStore.inOrderPage,
        pageSize: stockStore.inOrderPageSize,
        search: searchForm.value.keyword,
        status: searchForm.value.status,
      }),
    ])
    inOrders.value = stockStore.inOrders
    partsOptions.value = partsStore.parts
  } finally {
    listLoading.value = false
  }
}

function onSearch() {
  stockStore.inOrderPage = 1
  loadData()
}

function onPageChange(page: number) {
  stockStore.setInOrderPage(page)
}

function onPageSizeChange(size: number) {
  stockStore.setInOrderPageSize(size)
}

function openAddDialog() {
  isEditing.value = false
  dialogTitle.value = '新建入库单'
  currentOrder.value = { order_no: generateOrderNo('IN'), supplier_id: undefined, total_amount: 0, status: 'draft', remark: '' }
  orderItems.value = []
  partsStore.loadAllParts()
  dialogVisible.value = true
}

function openEditDialog(row: InOrder) {
  if (row.status !== 'draft') {
    ElMessage.warning('仅草稿状态可编辑')
    return
  }
  isEditing.value = true
  dialogTitle.value = '编辑入库单'
  currentOrder.value = { ...row }
  partsStore.loadAllParts()
  loadOrderItems(row.id!)
  dialogVisible.value = true
}

async function loadOrderItems(orderId: number) {
  orderItems.value = []
}

async function handleSubmit(formRef: any) {
  if (!formRef) return
  formRef.validate(async (valid: boolean) => {
    if (!valid) return
    if (orderItems.value.length === 0) {
      ElMessage.warning('请至少添加一条入库明细')
      return
    }
    try {
      await stockStore.createInOrder(
        currentOrder.value.supplier_id,
        orderItems.value,
        currentOrder.value.remark
      )
      ElMessage.success(isEditing.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      await loadData()
    } catch (error: any) {
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

function onPartChange(item: InOrderItem, partId: number) {
  const part = partsOptions.value.find(p => p.id === partId)
  if (part) {
    item.unit_price = part.cost_price
    item.amount = item.qty * item.unit_price
    calcTotal()
  }
}

function onQtyChange(item: InOrderItem) {
  item.amount = item.qty * item.unit_price
  calcTotal()
}

function viewDetail(row: InOrder) {
  router.push(`/inventory/in/detail/${row.id}`)
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
        <!-- 移除导入Excel、下载模板、新建入库单按钮，仅保留导出功能（如需导出可在Ribbon菜单操作） -->
      </div>
    </template>

    <!-- 搜索栏 -->
    <el-form :model="searchForm" inline class="mb-4 search-form wps-card wps-card__body" style="padding: 16px;">
      <el-form-item>
        <el-input v-model="searchForm.keyword" placeholder="单号/备注" prefix-icon="Search" clearable style="width: 240px" @keyup.enter="onSearch" />
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
        <el-button @click="searchForm.keyword=''; searchForm.status=''; onSearch()">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 入库单列表 -->
    <el-card class="wps-card">
      <el-table :data="inOrders" border size="small" style="width: 100%" v-loading="listLoading" row-key="id">
        <el-table-column prop="order_no" label="入库单号" width="180" />
        <el-table-column label="供应商" width="150">
          <template #default="scope">
            {{ supplierMap[(scope.row as InOrder).supplier_id!] || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="total_amount" label="总金额" width="110">
          <template #default="scope">¥{{ Number((scope.row as InOrder).total_amount).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="statusTagMap[(scope.row as InOrder).status]?.type || 'info'" effect="light" size="small">{{ statusTagMap[(scope.row as InOrder).status]?.text || '未知' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="scope">{{ (scope.row as InOrder).created_at?.slice(0, 16).replace('T', ' ') }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" link @click="viewDetail(scope.row as InOrder)"><Document />详情</el-button>
            <el-button size="small" link @click="openEditDialog(scope.row as InOrder)"><Edit />编辑</el-button>
            <el-button size="small" icon="Download" @click="exportGuideSheet(scope.row as InOrder)" :disabled="(scope.row as InOrder).status !== 'completed'">导出指导单</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="stockStore.inOrderPage"
        v-model:page-size="stockStore.inOrderPageSize"
        :page-sizes="[20, 50, 100, 200]"
        :total="stockStore.inOrderTotal"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="onPageChange"
        @page-size-change="onPageSizeChange"
        class="mt-4"
      />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="800px" destroy-on-close>
      <el-form :model="currentOrder" :rules="rules" label-width="100px" class="mb-4" ref="formRef">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="入库单号" prop="order_no">
              <el-input v-model="currentOrder.order_no" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供应商" prop="supplier_id">
              <el-select v-model="currentOrder.supplier_id" placeholder="请选择供应商" style="width: 100%" filterable>
                <el-option v-for="s in suppliersStore.suppliers" :key="s.id" :label="s.name" :value="s.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="currentOrder.remark" type="textarea" :rows="2" placeholder="请输入备注" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <el-divider>入库明细</el-divider>
      <div class="mb-2 flex justify-end">
        <el-button size="small" icon="Plus" @click="addItem">添加明细</el-button>
      </div>

      <el-table :data="orderItems" border size="small" style="width: 100%" row-key="part_id">
        <el-table-column label="配件编码" width="140">
          <template #default="{ row }">
            <el-select v-model="row.part_id" style="width: 100%" placeholder="请选择配件" filterable @change="val => onPartChange(row as InOrderItem, val)">
              <el-option v-for="p in partsOptions" :key="p.id" :label="p.name + ' (' + p.code + ')'" :value="p.id" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="中文名称" width="160">
          <template #default="{ row }">
            {{ partMap[row.part_id!]?.name || '' }}
          </template>
        </el-table-column>
        <el-table-column label="英文名称" width="160">
          <template #default="{ row }">
            {{ partMap[row.part_id!]?.english_name || '' }}
          </template>
        </el-table-column>
        <el-table-column label="规格" width="120">
          <template #default="{ row }">
            {{ partMap[row.part_id!]?.spec || '' }}
          </template>
        </el-table-column>
        <el-table-column label="单位" width="80">
          <template #default="{ row }">
            {{ partMap[row.part_id!]?.unit || '' }}
          </template>
        </el-table-column>
        <el-table-column label="单价" width="100">
          <template #default="{ row }">
            <el-input-number v-model="row.unit_price" :precision="2" :min="0" :step="0.01" style="width: 100%" @change="onQtyChange(row as InOrderItem)" />
          </template>
        </el-table-column>
        <el-table-column label="数量" width="100">
          <template #default="{ row }">
            <el-input-number v-model="row.qty" :min="1" :step="1" style="width: 100%" @change="onQtyChange(row as InOrderItem)" />
          </template>
        </el-table-column>
        <el-table-column label="金额" width="110">
          <template #default="{ row }">¥{{ row.amount.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ row, $index }">
            <el-button size="small" type="danger" link @click="removeItem($index)"><Delete /></el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="flex justify-end mt-4">
        <el-descriptions border :column="2" :size="small">
          <el-descriptions-item label="合计金额">
            <span class="text-xl font-bold text-primary-600">¥{{ Number(currentOrder.total_amount).toFixed(2) }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit(formRef)">保存入库</el-button>
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
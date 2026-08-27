<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElCard, ElTable, ElTableColumn, ElButton, ElInput, ElSelect, ElOption, ElTag, ElDialog, ElForm, ElFormItem, ElInputNumber, ElDatePicker, ElMessage, ElMessageBox, ElDivider, ElDescriptions, ElDescriptionsItem, ElPagination } from 'element-plus'
import { Plus, Edit, Delete, Search, Check, Close, Document, Tools, User, Clock, DataBoard, Delete as DeleteIcon, Minus } from '@element-plus/icons-vue'
import { useWorkOrdersStore } from '@/stores/workOrders'
import { useCustomersStore } from '@/stores/customers'
import { usePartsStore } from '@/stores/parts'
import { generateOrderNo } from '@/utils/db'
import type { WorkOrder, WorkOrderPart, WorkOrderLabor, Part } from '@/types'

const router = useRouter()
const workOrdersStore = useWorkOrdersStore()
const customersStore = useCustomersStore()
const partsStore = usePartsStore()

const searchForm = ref({ keyword: '', status: '' })
const listLoading = ref(false)

const detailDialogVisible = ref(false)
const detailTitle = ref('')
const currentWorkOrder = ref<WorkOrder | null>(null)
const workOrderParts = ref<(WorkOrderPart & { part_name: string; part_code: string; part_spec?: string; part_unit: string })[]>([])
const workOrderLabors = ref<WorkOrderLabor[]>([])

// 新建工单表单
const createDialogVisible = ref(false)
const createFormRef = ref()
const createForm = ref({ customer_id: undefined as number | undefined, vehicle_info: '', remark: '' })
const createRules = ref({ customer_id: [{ required: true, message: '请选择客户', trigger: 'change' }] })

// 添加配件弹窗
const addPartDialogVisible = ref(false)
const addPartFormRef = ref()
const addPartForm = ref({ part_id: undefined as number | undefined, qty: 1, unit_price: 0 })
const partsOptions = ref<Part[]>([])

// 添加工时弹窗
const addLaborDialogVisible = ref(false)
const addLaborFormRef = ref()
const addLaborForm = ref({ name: '', hours: 1, unit_price: 0, technician: '' })

const customerMap = computed(() => {
  const map: Record<number, { name: string; phone: string }> = {}
  customersStore.customers.forEach(c => { map[c.id!] = { name: c.name, phone: c.phone || '' } })
  return map
})
const partMap = computed(() => {
  const map: Record<number, Part> = {}
  partsOptions.value.forEach(p => { map[p.id!] = p })
  return map
})

// 类型化表格数据 - 解决 el-table-column prop 类型推断问题
const tableData = computed<WorkOrder[]>(() => workOrdersStore.filteredWorkOrders)

async function loadData() {
  listLoading.value = true
  try {
    await Promise.all([
      workOrdersStore.loadWorkOrders({
        page: workOrdersStore.page,
        pageSize: workOrdersStore.pageSize,
        search: searchForm.value.keyword,
        status: searchForm.value.status,
      }),
      customersStore.loadCustomers(),
      partsStore.loadParts(),
    ])
    partsOptions.value = partsStore.parts.filter(p => p.stock_qty > 0)
  } finally {
    listLoading.value = false
  }
}

function onSearch() {
  workOrdersStore.page = 1
  loadData()
}

function onPageChange(page: number) {
  workOrdersStore.setPage(page)
}

function onPageSizeChange(size: number) {
  workOrdersStore.setPageSize(size)
}

function openCreateDialog() {
  createDialogVisible.value = true
}

async function handleCreate(formRef: any) {
  if (!formRef) return
  formRef.validate(async (valid: boolean) => {
    if (!valid) return
    try {
      const id = await workOrdersStore.createWorkOrder(
        createForm.value.customer_id!,
        createForm.value.vehicle_info,
        createForm.value.remark
      )
      ElMessage.success('工单创建成功')
      createDialogVisible.value = false
      createForm.value = { customer_id: undefined, vehicle_info: '', remark: '' }
      await loadData()
      // 直接打开详情
      await openDetail(id)
    } catch (error: any) {
      ElMessage.error(error.message || '创建失败')
    }
  })
}

async function openDetail(id: number) {
  const detail = await workOrdersStore.getWorkOrderDetail(id)
  if (!detail) return
  currentWorkOrder.value = detail
  workOrderParts.value = detail.parts || []
  workOrderLabors.value = detail.labors || []
  detailTitle.value = `工单详情 - ${detail.order_no}`
  detailDialogVisible.value = true
}

function openEdit(id: number) {
  router.push(`/work-orders/edit/${id}`)
}

async function updateStatus(status: WorkOrder['status']) {
  if (!currentWorkOrder.value) return
  try {
    await workOrdersStore.updateWorkOrderStatus(currentWorkOrder.value.id!, status)
    ElMessage.success('状态更新成功')
    await openDetail(currentWorkOrder.value.id!)
  } catch (error: any) {
    ElMessage.error(error.message || '更新失败')
  }
}

function openAddPartDialog() {
  addPartForm.value = { part_id: undefined, qty: 1, unit_price: 0 }
  addPartDialogVisible.value = true
}

async function handleAddPart(formRef: any) {
  if (!formRef || !currentWorkOrder.value) return
  formRef.validate(async (valid: boolean) => {
    if (!valid) return
    try {
      await workOrdersStore.addWorkOrderPart(
        currentWorkOrder.value.id!,
        addPartForm.value.part_id!,
        addPartForm.value.qty,
        addPartForm.value.unit_price
      )
      ElMessage.success('配件添加成功')
      addPartDialogVisible.value = false
      await openDetail(currentWorkOrder.value.id!)
    } catch (error: any) {
      ElMessage.error(error.message || '添加失败')
    }
  })
}

function onPartSelect(partId: number) {
  const part = partsOptions.value.find(p => p.id === partId)
  if (part) {
    addPartForm.value.unit_price = part.sale_price
  }
}

function openAddLaborDialog() {
  addLaborForm.value = { name: '', hours: 1, unit_price: 0, technician: '' }
  addLaborDialogVisible.value = true
}

async function handleAddLabor(formRef: any) {
  if (!formRef || !currentWorkOrder.value) return
  formRef.validate(async (valid: boolean) => {
    if (!valid) return
    try {
      await workOrdersStore.addWorkOrderLabor(currentWorkOrder.value.id!, addLaborForm.value)
      ElMessage.success('工时添加成功')
      addLaborDialogVisible.value = false
      await openDetail(currentWorkOrder.value.id!)
    } catch (error: any) {
      ElMessage.error(error.message || '添加失败')
    }
  })
}

async function removePart(partItemId: number) {
  if (!currentWorkOrder.value) return
  try {
    await ElMessageBox.confirm('确定移除该配件吗？库存将恢复。', '提示', { type: 'warning' })
    await workOrdersStore.removeWorkOrderPart(currentWorkOrder.value.id!, partItemId)
    ElMessage.success('移除成功')
    await openDetail(currentWorkOrder.value.id!)
  } catch (e) { }
}

async function removeLabor(laborId: number) {
  if (!currentWorkOrder.value) return
  try {
    await ElMessageBox.confirm('确定删除该工时项目吗？', '提示', { type: 'warning' })
    await workOrdersStore.removeWorkOrderLabor(currentWorkOrder.value.id!, laborId)
    ElMessage.success('删除成功')
    await openDetail(currentWorkOrder.value.id!)
  } catch (e) { }
}

const statusTagMap: Record<string, { type: 'warning' | 'info' | 'success' | 'danger' | 'primary'; text: string }> = {
  open: { type: 'info', text: '待派单' },
  in_progress: { type: 'warning', text: '维修中' },
  completed: { type: 'success', text: '已完成' },
  cancelled: { type: 'danger', text: '已取消' },
}

function getStatusTag(status: string) {
  return statusTagMap[status] || { type: 'info', text: status }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <el-card class="detail-section">
    <template #header>
      <div class="flex justify-between items-center">
        <h3 class="detail-section-title m-0">工单列表</h3>
        <el-button type="primary" icon="Plus" @click="openCreateDialog">新建工单</el-button>
      </div>
    </template>

    <el-form :model="searchForm" inline class="mb-4 search-form">
      <el-form-item>
        <el-input v-model="searchForm.keyword" placeholder="工单号/车辆" prefix-icon="Search" clearable style="width: 240px" @keyup.enter="onSearch" />
      </el-form-item>
      <el-form-item>
        <el-select v-model="searchForm.status" placeholder="全部状态" style="width: 140px" @change="onSearch">
          <el-option label="待派单" value="open" />
          <el-option label="维修中" value="in_progress" />
          <el-option label="已完成" value="completed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button icon="Search" @click="onSearch">搜索</el-button>
        <el-button @click="searchForm.keyword=''; searchForm.status=''; onSearch()">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="tableData" border size="small" style="width: 100%" v-loading="listLoading">
      <el-table-column prop="order_no" label="工单号" width="160" />
      <el-table-column label="客户" width="140">
        <template #default="scope">
          <el-tag effect="light" size="small">
            <User class="mr-1" />
            {{ customerMap[scope.row.customer_id]?.name || '未知' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="vehicle_info" label="车辆信息" minWidth="180" />
      <el-table-column label="状态" width="110">
        <template #default="scope">
          <el-tag :type="statusTagMap[scope.row.status]?.type || 'info'" effect="light">{{ statusTagMap[scope.row.status]?.text || '未知' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="total_parts_amount" label="配件金额" width="100">
        <template #default="scope">¥{{ Number(scope.row.total_parts_amount).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="total_labor_amount" label="工时金额" width="100">
        <template #default="scope">¥{{ Number(scope.row.total_labor_amount).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="total_amount" label="合计" width="100">
        <template #default="scope"><span class="font-bold">¥{{ Number(scope.row.total_amount).toFixed(2) }}</span></template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="160">
        <template #default="scope">{{ scope.row.created_at?.slice(0, 16).replace('T', ' ') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="scope">
          <el-button size="small" type="primary" link @click="openDetail(scope.row.id!)"><Document />详情</el-button>
          <el-button size="small" link @click="openEdit(scope.row.id!)"><Edit />编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination
      v-model:current-page="workOrdersStore.page"
      v-model:page-size="workOrdersStore.pageSize"
      :page-sizes="[20, 50, 100, 200]"
      :total="workOrdersStore.total"
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="onPageChange"
      @page-size-change="onPageSizeChange"
      class="mt-4"
    />

    <!-- 新建工单弹窗 -->
    <el-dialog v-model="createDialogVisible" title="新建维修工单" width="560px" destroy-on-close>
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="100px">
        <el-form-item label="客户" prop="customer_id">
          <el-select v-model="createForm.customer_id" placeholder="请选择客户" style="width: 100%" filterable>
            <el-option v-for="c in customersStore.customers" :key="c.id" :label="c.name + (c.phone ? ' - ' + c.phone : '')" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="车辆信息">
          <el-input v-model="createForm.vehicle_info" placeholder="车型/车牌/VIN" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="createForm.remark" type="textarea" :rows="2" placeholder="故障描述等" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="createDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleCreate(createFormRef)">创建工单</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 工单详情弹窗 -->
    <el-dialog v-model="detailDialogVisible" :title="detailTitle" width="900px" destroy-on-close>
      <div v-if="currentWorkOrder" class="space-y-4">
        <!-- 基本信息 -->
        <el-card>
          <el-descriptions border :column="4" size="small">
            <el-descriptions-item label="工单号">{{ currentWorkOrder.order_no }}</el-descriptions-item>
            <el-descriptions-item label="客户">{{ customerMap[currentWorkOrder.customer_id]?.name }}</el-descriptions-item>
            <el-descriptions-item label="电话">{{ customerMap[currentWorkOrder.customer_id]?.phone }}</el-descriptions-item>
            <el-descriptions-item label="车辆">{{ currentWorkOrder.vehicle_info }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="statusTagMap[currentWorkOrder.status]?.type || 'info'" effect="light">{{ statusTagMap[currentWorkOrder.status]?.text || '未知' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ currentWorkOrder.created_at?.slice(0, 16).replace('T', ' ') }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="4">{{ currentWorkOrder.remark || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 操作按钮 -->
        <div class="flex gap-2" v-if="currentWorkOrder.status !== 'completed' && currentWorkOrder.status !== 'cancelled'">
<el-button type="primary" icon="Plus" @click="openAddPartDialog">添加配件</el-button>
<el-button type="primary" icon="Clock" @click="openAddLaborDialog">添加工时</el-button>
          <el-button v-if="currentWorkOrder.status === 'open'" type="success" @click="updateStatus('in_progress')">开始维修</el-button>
          <el-button v-if="currentWorkOrder.status === 'in_progress'" type="success" @click="updateStatus('completed')">完工结算</el-button>
        </div>

        <!-- 配件明细 -->
        <el-card>
          <template #header>
            <div class="flex justify-between items-center">
              <h4 class="m-0">配件明细 (合计: ¥{{ Number(currentWorkOrder.total_parts_amount).toFixed(2) }})</h4>
            </div>
          </template>
          <el-table :data="workOrderParts" border size="small" style="width: 100%" v-if="workOrderParts.length > 0">
            <el-table-column prop="part_code" label="编码" width="120" />
            <el-table-column prop="part_name" label="名称" minWidth="160" />
            <el-table-column prop="part_spec" label="规格" width="120" />
            <el-table-column prop="part_unit" label="单位" width="70" />
            <el-table-column prop="unit_price" label="单价" width="90">
              <template #default="scope">¥{{ scope.row.unit_price.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="qty" label="数量" width="80" />
            <el-table-column prop="amount" label="金额" width="90">
              <template #default="scope">¥{{ scope.row.amount.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="scope">
                <el-button size="small" type="danger" link @click="removePart(scope.row.id!)"><DeleteIcon /></el-button>
              </template>
            </el-table-column>
          </el-table>
          <div v-else class="text-center py-4 text-gray-400">暂无配件</div>
        </el-card>

        <!-- 工时明细 -->
        <el-card>
          <template #header>
            <div class="flex justify-between items-center">
              <h4 class="m-0">工时明细 (合计: ¥{{ Number(currentWorkOrder.total_labor_amount).toFixed(2) }})</h4>
            </div>
          </template>
          <el-table :data="workOrderLabors" border size="small" style="width: 100%" v-if="workOrderLabors.length > 0">
            <el-table-column prop="name" label="工时项目" minWidth="180" />
            <el-table-column prop="hours" label="工时(h)" width="90" />
            <el-table-column prop="unit_price" label="单价/时" width="90">
              <template #default="scope">¥{{ scope.row.unit_price.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="technician" label="技师" width="100" />
            <el-table-column prop="amount" label="金额" width="90">
              <template #default="scope">¥{{ scope.row.amount.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="scope">
                <el-button size="small" type="danger" link @click="removeLabor(scope.row.id!)"><DeleteIcon /></el-button>
              </template>
            </el-table-column>
          </el-table>
          <div v-else class="text-center py-4 text-gray-400">暂无工时</div>
        </el-card>

        <!-- 合计 -->
        <el-card style="background: #f0fdf4;">
          <el-descriptions border :column="4" size="small">
            <el-descriptions-item label="配件合计">¥{{ Number(currentWorkOrder.total_parts_amount).toFixed(2) }}</el-descriptions-item>
            <el-descriptions-item label="工时合计">¥{{ Number(currentWorkOrder.total_labor_amount).toFixed(2) }}</el-descriptions-item>
            <el-descriptions-item label="应收总额" :span="2">
              <span class="text-2xl font-bold text-primary-600">¥{{ Number(currentWorkOrder.total_amount).toFixed(2) }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="detailDialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 添加配件弹窗 -->
    <el-dialog v-model="addPartDialogVisible" title="添加配件" width="560px" destroy-on-close>
      <el-form ref="addPartFormRef" :model="addPartForm" label-width="100px">
        <el-form-item label="配件" prop="part_id">
          <el-select v-model="addPartForm.part_id" placeholder="请选择配件" style="width: 100%" filterable @change="onPartSelect">
            <el-option v-for="p in partsOptions" :key="p.id" :label="p.name + ' (' + p.code + ') - 库存:' + p.stock_qty + p.unit" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="单价" prop="unit_price">
          <el-input-number v-model="addPartForm.unit_price" :precision="2" :min="0" :step="0.01" style="width: 100%" />
        </el-form-item>
        <el-form-item label="数量" prop="qty">
          <el-input-number v-model="addPartForm.qty" :min="1" :step="1" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="addPartDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleAddPart(addPartFormRef)">确定添加</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 添加工时弹窗 -->
    <el-dialog v-model="addLaborDialogVisible" title="添加工时" width="560px" destroy-on-close>
      <el-form ref="addLaborFormRef" :model="addLaborForm" label-width="100px">
        <el-form-item label="工时项目" prop="name">
          <el-select v-model="addLaborForm.name" placeholder="请选择或输入" style="width: 100%" filterable>
            <el-option label="发动机大修" value="发动机大修" />
            <el-option label="变速箱维修" value="变速箱维修" />
            <el-option label="刹车系统维修" value="刹车系统维修" />
            <el-option label="悬挂系统维修" value="悬挂系统维修" />
            <el-option label="电路检查维修" value="电路检查维修" />
            <el-option label="保养服务" value="保养服务" />
            <el-option label="诊断检测" value="诊断检测" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="工时数" prop="hours">
          <el-input-number v-model="addLaborForm.hours" :min="0.5" :step="0.5" :precision="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="单价/时" prop="unit_price">
          <el-input-number v-model="addLaborForm.unit_price" :precision="2" :min="0" :step="0.01" style="width: 100%" />
        </el-form-item>
        <el-form-item label="技师">
          <el-input v-model="addLaborForm.technician" placeholder="维修技师姓名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="addLaborDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleAddLabor(addLaborFormRef)">确定添加</el-button>
        </div>
      </template>
    </el-dialog>
  </el-card>
</template>
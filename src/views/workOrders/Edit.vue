<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElCard, ElButton, ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElTag, ElDescriptions, ElDescriptionsItem, ElDivider, ElTable, ElTableColumn, ElInputNumber, ElMessage, ElMessageBox, ElDialog } from 'element-plus'
import { ArrowLeft, Edit, Delete, Plus, Printer, Check, Close } from '@element-plus/icons-vue'
import { useWorkOrdersStore } from '@/stores/workOrders'
import { useCustomersStore } from '@/stores/customers'
import { usePartsStore } from '@/stores/parts'
import type { WorkOrder, WorkOrderPart, WorkOrderLabor } from '@/types'

const router = useRouter()
const route = useRoute()
const workOrdersStore = useWorkOrdersStore()
const customersStore = useCustomersStore()
const partsStore = usePartsStore()

const loading = ref(true)
const saving = ref(false)
const workOrderId = computed(() => Number(route.params.id))

// 基本信息表单
const form = ref<Partial<WorkOrder>>({
  customer_id: undefined,
  vehicle_info: '',
  fault_desc: '',
  repair_advice: '',
  remark: '',
  priority: 'normal',
})

// 配件明细
const partItems = ref<(WorkOrderPart & { 
  part_name: string; 
  part_code: string; 
  part_spec: string; 
  part_unit: string;
  work_order_id: number 
})[]>([])
// 工时明细
const laborItems = ref<(WorkOrderLabor & { id?: number })[]>([])

const partDialogVisible = ref(false)
const laborDialogVisible = ref(false)
const editingPartIndex = ref<number | null>(null)
const editingLaborIndex = ref<number | null>(null)

const partForm = ref({
  part_id: undefined as number | undefined,
  qty: 1,
  unit_price: 0,
})

const laborForm = ref({
  name: '',
  hours: 1,
  unit_price: 0,
  technician: '',
})

const partRules = ref({
  part_id: [{ required: true, message: '请选择配件', trigger: 'change' }],
  qty: [{ required: true, message: '请输入数量', trigger: 'blur' }],
  unit_price: [{ required: true, message: '请输入单价', trigger: 'blur' }],
})

const laborRules = ref({
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  hours: [{ required: true, message: '请输入工时', trigger: 'blur' }],
  unit_price: [{ required: true, message: '请输入单价', trigger: 'blur' }],
})

const partFormRef = ref()
const laborFormRef = ref()

// 计算属性
const totalPartsAmount = computed(() =>
  partItems.value.reduce((sum, item) => sum + item.qty * item.unit_price, 0)
)

const totalLaborAmount = computed(() =>
  laborItems.value.reduce((sum, item) => sum + item.hours * item.unit_price, 0)
)

const totalAmount = computed(() => totalPartsAmount.value + totalLaborAmount.value)

const customerMap = computed(() => {
  const map: Record<number, string> = {}
  customersStore.customers.forEach(c => { map[c.id!] = c.name })
  return map
})

const partOptions = computed(() =>
  partsStore.parts.map(p => ({
    id: p.id,
    label: `${p.name} (${p.code})${p.spec ? ' - ' + p.spec : ''} - 库存: ${p.stock_qty}${p.unit}`,
    sale_price: p.sale_price,
    unit: p.unit,
  }))
)

const statusOptions = [
  { value: 'open', label: '待接单' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

const priorityOptions = [
  { value: 'normal', label: '普通' },
  { value: 'urgent', label: '紧急' },
]

async function loadDetail() {
  loading.value = true
  try {
    await Promise.all([
      customersStore.loadCustomers(),
      partsStore.loadParts(),
    ])

    const detail = await workOrdersStore.getWorkOrderDetail(workOrderId.value)
    if (!detail) {
      ElMessage.error('工单不存在')
      router.back()
      return
    }

    form.value = {
      customer_id: detail.customer_id,
      vehicle_info: detail.vehicle_info || '',
      fault_desc: detail.fault_desc || '',
      repair_advice: detail.repair_advice || '',
      remark: detail.remark || '',
      priority: detail.priority || 'normal',
    }

    partItems.value = (detail.parts || []).map((p: any) => ({
      id: p.id,
      work_order_id: p.work_order_id,
      part_id: p.part_id,
      qty: p.qty,
      unit_price: p.unit_price,
      amount: p.amount,
      part_name: p.part_name,
      part_code: p.part_code,
      part_spec: p.part_spec,
      part_unit: p.part_unit,
    }))

    laborItems.value = detail.labors || []
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.back()
}

async function handleSave() {
  saving.value = true
  try {
    // 更新基本信息
    await workOrdersStore.updateWorkOrder(workOrderId.value, form.value)

    // 同步配件明细（这里简化处理：删除重建，实际可优化为增量更新）
    // 注意：实际项目中建议做增量同步，这里为了简化采用全量替换
    await syncParts()
    await syncLabors()

    ElMessage.success('保存成功')
    router.push(`/work-orders/detail/${workOrderId.value}`)
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function syncParts() {
  // 删除现有明细
  await workOrdersStore.deleteWorkOrderParts(workOrderId.value)
  // 重新添加
  for (const item of partItems.value) {
    await workOrdersStore.addWorkOrderPart(workOrderId.value, item.part_id!, item.qty, item.unit_price)
  }
}

async function syncLabors() {
  // 删除现有明细
  await workOrdersStore.deleteWorkOrderLabors(workOrderId.value)
  // 重新添加
  for (const item of laborItems.value) {
    await workOrdersStore.addWorkOrderLabor(workOrderId.value, {
      name: item.name,
      hours: item.hours,
      unit_price: item.unit_price,
      technician: item.technician,
    })
  }
}

async function handleComplete() {
  try {
    await ElMessageBox.confirm('确定将工单标记为已完成吗？', '确认完成', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await workOrdersStore.completeWorkOrder(workOrderId.value)
    ElMessage.success('工单已完成')
    await loadDetail()
  } catch (e) {
    // 用户取消
  }
}

async function handleDelete() {
  try {
    await ElMessageBox.confirm('确定删除该工单吗？此操作不可恢复！', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await workOrdersStore.deleteWorkOrder(workOrderId.value)
    ElMessage.success('删除成功')
    router.push('/work-orders/list')
  } catch (e) {
    // 用户取消
  }
}

function handlePrint() {
  window.print()
}

// 配件明细操作
function openAddPartDialog() {
  editingPartIndex.value = null
  partForm.value = { part_id: undefined, qty: 1, unit_price: 0 }
  partDialogVisible.value = true
}

function openEditPartDialog(index: number, row: any) {
  editingPartIndex.value = index
  partForm.value = { part_id: row.part_id, qty: row.qty, unit_price: row.unit_price }
  partDialogVisible.value = true
}

async function handlePartSubmit(formRef: any) {
  if (!formRef) return
  formRef.validate(async (valid: boolean) => {
    if (!valid) return
    const part = partsStore.parts.find(p => p.id === partForm.value.part_id)
    const item = {
      work_order_id: workOrderId.value,
      part_id: partForm.value.part_id!,
      qty: partForm.value.qty,
      unit_price: partForm.value.unit_price,
      amount: partForm.value.qty * partForm.value.unit_price,
      part_name: part?.name || '',
      part_code: part?.code || '',
      part_spec: part?.spec || '',
      part_unit: part?.unit || '',
    }

    if (editingPartIndex.value !== null) {
      partItems.value[editingPartIndex.value] = item
    } else {
      partItems.value.push(item)
    }
    partDialogVisible.value = false
  })
}

function removePart(index: number) {
  ElMessageBox.confirm('确定删除该配件明细吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    partItems.value.splice(index, 1)
  }).catch(() => {})
}

function onPartChange(partId: number) {
  const part = partsStore.parts.find(p => p.id === partId)
  if (part) {
    partForm.value.unit_price = part.sale_price
  }
}

// 工时明细操作
function openAddLaborDialog() {
  editingLaborIndex.value = null
  laborForm.value = { name: '', hours: 1, unit_price: 0, technician: '' }
  laborDialogVisible.value = true
}

function openEditLaborDialog(index: number, row: WorkOrderLabor) {
  editingLaborIndex.value = index
  laborForm.value = { ...row, technician: row.technician || '' }
  laborDialogVisible.value = true
}

function handleLaborSubmit(formRef: any) {
  if (!formRef) return
  formRef.validate((valid: boolean) => {
    if (!valid) return
    const item = {
      id: editingLaborIndex.value !== null ? laborItems.value[editingLaborIndex.value].id : undefined,
      work_order_id: workOrderId.value,
      name: laborForm.value.name,
      hours: laborForm.value.hours,
      unit_price: laborForm.value.unit_price,
      amount: laborForm.value.hours * laborForm.value.unit_price,
      technician: laborForm.value.technician || '',
    }

    if (editingLaborIndex.value !== null) {
      laborItems.value[editingLaborIndex.value] = item
    } else {
      laborItems.value.push(item)
    }
    laborDialogVisible.value = false
  })
}

function removeLabor(index: number) {
  ElMessageBox.confirm('确定删除该工时明细吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    laborItems.value.splice(index, 1)
  }).catch(() => {})
}

onMounted(() => {
  loadDetail()
})
</script>

<template>
  <div class="p-6" v-if="!loading">
    <!-- 返回按钮 + 标题 -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <ElButton circle @click="goBack" class="hover:bg-gray-100">
          <ArrowLeft />
        </ElButton>
        <h1 class="text-2xl font-bold text-gray-900">编辑工单</h1>
        <ElTag v-if="form.priority === 'urgent'" type="danger">紧急</ElTag>
      </div>
      <div class="flex items-center gap-2">
        <ElButton type="success" @click="handleComplete" :icon="Check" v-if="form.status !== 'completed'">标记完成</ElButton>
        <ElButton type="danger" @click="handleDelete" :icon="Delete">删除</ElButton>
        <ElButton @click="handlePrint" :icon="Printer">打印</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSave">保存</ElButton>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 基本信息 -->
      <ElCard class="lg:col-span-2">
        <template #header>
          <span>基本信息</span>
        </template>
        <el-form :model="form" label-width="100px" class="space-y-4">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="客户" prop="customer_id">
                <el-select v-model="form.customer_id" placeholder="请选择客户" style="width: 100%" filterable clearable>
                  <el-option v-for="c in customersStore.customers" :key="c.id" :label="c.name + (c.phone ? ' - ' + c.phone : '')" :value="c.id" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="优先级" prop="priority">
                <el-select v-model="form.priority" placeholder="请选择" style="width: 100%">
                  <el-option v-for="o in priorityOptions" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="车辆信息" prop="vehicle_info">
            <el-input v-model="form.vehicle_info" placeholder="品牌 型号 车牌号 VIN码等" />
          </el-form-item>
          <el-form-item label="故障描述" prop="fault_desc">
            <el-input v-model="form.fault_desc" type="textarea" :rows="3" placeholder="客户反映的故障现象" />
          </el-form-item>
          <el-form-item label="维修建议" prop="repair_advice">
            <el-input v-model="form.repair_advice" type="textarea" :rows="3" placeholder="初步诊断和维修建议" />
          </el-form-item>
          <el-form-item label="备注" prop="remark">
            <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="其他备注信息" />
          </el-form-item>
        </el-form>
      </ElCard>

      <!-- 费用汇总 -->
      <ElCard>
        <template #header>
          <span>费用汇总</span>
        </template>
        <ElDescriptions border direction="vertical">
          <ElDescriptionsItem label="配件费">
            <span class="font-medium">¥{{ totalPartsAmount.toFixed(2) }}</span>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="工时费">
            <span class="font-medium">¥{{ totalLaborAmount.toFixed(2) }}</span>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="合计金额" :span="2">
            <span class="text-2xl font-bold text-green-600">¥{{ totalAmount.toFixed(2) }}</span>
          </ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <!-- 配件明细 -->
      <ElCard class="lg:col-span-3">
        <template #header>
          <div class="flex items-center justify-between">
            <span>配件明细 ({{ partItems.length }})</span>
            <ElButton size="small" type="primary" :icon="Plus" @click="openAddPartDialog">添加配件</ElButton>
          </div>
        </template>
        <div class="overflow-x-auto" v-if="partItems.length > 0">
          <el-table :data="partItems" border size="small" style="width: 100%">
            <el-table-column prop="part_code" label="编码" width="120" />
            <el-table-column prop="part_name" label="名称" min-width="160" />
            <el-table-column prop="part_spec" label="规格" min-width="120" />
            <el-table-column prop="part_unit" label="单位" width="80" />
            <el-table-column label="单价" width="100">
              <template #default="scope">¥{{ Number(scope.row.unit_price).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="qty" label="数量" width="90" />
            <el-table-column label="金额" width="110">
              <template #default="scope"><span class="font-medium">¥{{ Number(scope.row.amount).toFixed(2) }}</span></template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row, $index }">
                <ElButton size="small" type="primary" link @click="openEditPartDialog($index, row)"><Edit />编辑</ElButton>
                <ElButton size="small" type="danger" link @click="removePart($index)"><Delete />删除</ElButton>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div v-else class="text-center text-gray-400 py-8">
          暂无配件明细，点击上方"添加配件"录入
        </div>
      </ElCard>

      <!-- 工时明细 -->
      <ElCard class="lg:col-span-3">
        <template #header>
          <div class="flex items-center justify-between">
            <span>工时明细 ({{ laborItems.length }})</span>
            <ElButton size="small" type="primary" :icon="Plus" @click="openAddLaborDialog">添加工时</ElButton>
          </div>
        </template>
        <div class="overflow-x-auto" v-if="laborItems.length > 0">
          <el-table :data="laborItems" border size="small" style="width: 100%">
            <el-table-column prop="name" label="项目" min-width="180" />
            <el-table-column prop="hours" label="工时" width="90" />
            <el-table-column label="单价" width="100">
              <template #default="scope">¥{{ Number(scope.row.unit_price).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="金额" width="110">
              <template #default="scope"><span class="font-medium">¥{{ Number(scope.row.amount).toFixed(2) }}</span></template>
            </el-table-column>
            <el-table-column prop="technician" label="技师" width="120" />
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row, $index }">
                <ElButton size="small" type="primary" link @click="openEditLaborDialog($index, row as WorkOrderLabor)"><Edit />编辑</ElButton>
                <ElButton size="small" type="danger" link @click="removeLabor($index)"><Delete />删除</ElButton>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div v-else class="text-center text-gray-400 py-8">
          暂无工时明细，点击上方"添加工时"录入
        </div>
      </ElCard>
    </div>

    <!-- 添加/编辑配件弹窗 -->
    <el-dialog v-model="partDialogVisible" :title="editingPartIndex !== null ? '编辑配件' : '添加配件'" width="500px" destroy-on-close>
      <el-form :model="partForm" :rules="partRules" label-width="100px" ref="partFormRef">
        <el-form-item label="配件" prop="part_id">
          <el-select v-model="partForm.part_id" placeholder="请选择配件" style="width: 100%" filterable @change="onPartChange">
            <el-option v-for="p in partOptions" :key="p.id" :label="p.label" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="数量" prop="qty">
          <el-input-number v-model="partForm.qty" :min="1" :step="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="单价" prop="unit_price">
          <el-input-number v-model="partForm.unit_price" :precision="2" :min="0" :step="0.01" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="partDialogVisible = false">取消</ElButton>
          <ElButton type="primary" @click="handlePartSubmit(partFormRef)">确定</ElButton>
        </div>
      </template>
    </el-dialog>

    <!-- 添加/编辑工时弹窗 -->
    <el-dialog v-model="laborDialogVisible" :title="editingLaborIndex !== null ? '编辑工时' : '添加工时'" width="500px" destroy-on-close>
      <el-form :model="laborForm" :rules="laborRules" label-width="100px" ref="laborFormRef">
        <el-form-item label="项目" prop="name">
          <el-input v-model="laborForm.name" placeholder="如：更换机油、四轮定位、发动机大修" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="工时" prop="hours">
              <el-input-number v-model="laborForm.hours" :precision="1" :min="0.1" :step="0.5" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单价" prop="unit_price">
              <el-input-number v-model="laborForm.unit_price" :precision="2" :min="0" :step="0.01" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="技师" prop="technician">
          <el-input v-model="laborForm.technician" placeholder="负责技师姓名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="laborDialogVisible = false">取消</ElButton>
          <ElButton type="primary" @click="handleLaborSubmit(laborFormRef)">确定</ElButton>
        </div>
      </template>
    </el-dialog>
  </div>

  <div v-else class="flex justify-center items-center h-64">加载中...</div>
</template>

<style scoped>
@media print {
  .no-print { display: none !important; }
  .el-card { box-shadow: none !important; border: 1px solid #ddd !important; }
  .el-button { display: none !important; }
  .el-dialog { display: none !important; }
}
</style>
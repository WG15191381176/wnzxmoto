<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElCard, ElDescriptions, ElDescriptionsItem, ElButton, ElTag, ElDivider, ElTable, ElTableColumn, ElSpace } from 'element-plus'
import { ArrowLeft, Download, Printer, Edit } from '@element-plus/icons-vue'
import { useStockStore } from '@/stores/stock'
import { useSuppliersStore } from '@/stores/suppliers'
import { exportInOrderGuide } from '@/utils/excel'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const stockStore = useStockStore()
const suppliersStore = useSuppliersStore()

const loading = ref(true)
const detail = ref<any>(null)

const statusTags: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'primary'> = {
  draft: 'info',
  completed: 'success',
  cancelled: 'danger'
}
const statusLabels: Record<string, string> = {
  draft: '草稿',
  completed: '已完成',
  cancelled: '已取消'
}

async function loadDetail() {
  loading.value = true
  try {
    const id = Number(route.params.id)
    detail.value = await stockStore.getInOrder(id)
    await suppliersStore.loadSuppliers()
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.back()
}

function handlePrint() {
  window.print()
}

async function handleExportGuide() {
  if (!detail.value) return
  try {
    await stockStore.exportInOrderGuideSheet(detail.value.id!)
    ElMessage.success('入库指导单导出成功')
  } catch (error: any) {
    ElMessage.error(error.message)
  }
}

function getSupplierName(supplierId?: number) {
  if (!supplierId) return '-'
  const supplier = suppliersStore.suppliers.find(s => s.id === supplierId)
  return supplier?.name || '-'
}

function getStatusTag(status: string) {
  return statusTags[status] || 'info'
}

function getStatusLabel(status: string) {
  return statusLabels[status] || status
}

onMounted(() => {
  loadDetail()
})
</script>

<template>
  <div class="p-6" v-if="!loading && detail">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <ElButton circle @click="goBack" class="hover:bg-gray-100">
          <ArrowLeft />
        </ElButton>
        <h1 class="text-2xl font-bold text-gray-900">入库单详情</h1>
        <ElTag :type="getStatusTag(detail.status)" size="large">
          {{ getStatusLabel(detail.status) }}
        </ElTag>
      </div>
      <div class="flex items-center gap-2">
        <ElButton @click="handleExportGuide" :icon="Download">导出指导单</ElButton>
        <ElButton @click="handlePrint" :icon="Printer">打印</ElButton>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <ElCard class="lg:col-span-2">
        <template #header>
          <span>基本信息</span>
        </template>
        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="入库单号">{{ detail.order_no }}</ElDescriptionsItem>
          <ElDescriptionsItem label="创建时间">{{ detail.created_at ? new Date(detail.created_at).toLocaleString() : '' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="供应商">{{ getSupplierName(detail.supplier_id) }}</ElDescriptionsItem>
          <ElDescriptionsItem label="总金额"><span class="text-xl font-bold text-green-600">¥{{ Number(detail.total_amount).toFixed(2) }}</span></ElDescriptionsItem>
          <ElDescriptionsItem label="状态">
            <ElTag :type="getStatusTag(detail.status)">{{ getStatusLabel(detail.status) }}</ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="备注" :span="2">{{ detail.remark || '-' }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard>
        <template #header>
          <span>统计</span>
        </template>
        <ElDescriptions border direction="vertical">
          <ElDescriptionsItem label="明细行数">{{ detail.items?.length || 0 }}</ElDescriptionsItem>
          <ElDescriptionsItem label="总数量">{{ detail.items?.reduce((sum: number, item: any) => sum + item.qty, 0) || 0 }}</ElDescriptionsItem>
          <ElDescriptionsItem label="总金额"><span class="text-xl font-bold text-primary-600">¥{{ Number(detail.total_amount).toFixed(2) }}</span></ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <ElCard class="lg:col-span-3">
        <template #header>
          <div class="flex items-center justify-between">
            <span>入库明细 ({{ detail.items?.length || 0 }})</span>
          </div>
        </template>
        <div class="overflow-x-auto" v-if="detail.items && detail.items.length > 0">
          <el-table :data="detail.items" border size="small" style="width: 100%">
            <el-table-column prop="part_code" label="配件编码" width="130" />
            <el-table-column prop="part_name" label="配件名称" min-width="180" />
            <el-table-column prop="part_spec" label="规格" width="120" />
            <el-table-column prop="part_unit" label="单位" width="70" />
            <el-table-column prop="part_location" label="货位" width="120" />
            <el-table-column label="进价" width="100">
              <template #default="scope">¥{{ Number(scope.row.unit_price).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="数量" width="90">
              <template #default="scope"><span class="font-medium text-green-600">+{{ scope.row.qty }}</span></template>
            </el-table-column>
            <el-table-column label="金额" width="110">
              <template #default="scope"><span class="font-medium">¥{{ Number(scope.row.amount).toFixed(2) }}</span></template>
            </el-table-column>
            <el-table-column label="建议货位" width="120">
              <template #default="scope">{{ scope.row.part_location || '待分配' }}</template>
            </el-table-column>
          </el-table>
        </div>
        <div v-else class="text-center text-gray-400 py-8">暂无明细数据</div>
      </ElCard>
    </div>
  </div>

  <div v-else-if="loading" class="flex justify-center items-center h-64">加载中...</div>
  <div v-else class="flex justify-center items-center h-64 text-gray-400">入库单不存在</div>
</template>

<style scoped>
@media print {
  .no-print { display: none !important; }
  .el-card { box-shadow: none !important; border: 1px solid #ddd !important; }
  .el-button { display: none !important; }
}
</style>
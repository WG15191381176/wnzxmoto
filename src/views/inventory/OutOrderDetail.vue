<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElCard, ElDescriptions, ElDescriptionsItem, ElButton, ElTag, ElDivider, ElTable, ElTableColumn, ElSpace } from 'element-plus'
import { ArrowLeft, Download, Printer, User, Tools } from '@element-plus/icons-vue'
import { useStockStore } from '@/stores/stock'
import { useCustomersStore } from '@/stores/customers'
import { exportToExcel } from '@/utils/excel'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const stockStore = useStockStore()
const customersStore = useCustomersStore()

const loading = ref(true)
const detail = ref<any>(null)

const typeLabelMap = { sale: '销售出库', repair: '维修领料', other: '其他出库' }
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
    detail.value = await stockStore.getOutOrder(id)
    await customersStore.loadCustomers()
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

function handleExport() {
  if (!detail.value || !detail.value.items) return
  const data = detail.value.items.map((item: any, index: number) => ({
    序号: index + 1,
    配件编码: item.part_code,
    配件名称: item.part_name,
    规格: item.part_spec,
    单位: item.part_unit,
    单价: item.unit_price,
    数量: item.qty,
    金额: item.amount,
  }))
  exportToExcel(data, [
    { key: '序号', label: '序号', width: 8 },
    { key: '配件编码', label: '配件编码', width: 15 },
    { key: '配件名称', label: '配件名称', width: 25 },
    { key: '规格', label: '规格', width: 15 },
    { key: '单位', label: '单位', width: 8 },
    { key: '单价', label: '单价', width: 10 },
    { key: '数量', label: '数量', width: 8 },
    { key: '金额', label: '金额', width: 12 },
  ], `出库单明细_${detail.value.order_no}`)
  ElMessage.success('导出成功')
}

function getCustomerName(customerId?: number) {
  if (!customerId) return '-'
  const customer = customersStore.customers.find(c => c.id === customerId)
  return customer?.name || '-'
}

function getStatusTag(status: string) {
  return statusTags[status] || 'info'
}

function getStatusLabel(status: string) {
  return statusLabels[status] || status
}

function getTypeIcon(type: string) {
  return type === 'sale' ? User : type === 'repair' ? Tools : ''
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
        <h1 class="text-2xl font-bold text-gray-900">出库单详情</h1>
        <ElTag :type="getStatusTag(detail.status)" size="large">
          {{ getStatusLabel(detail.status) }}
        </ElTag>
      </div>
      <div class="flex items-center gap-2">
        <ElButton @click="handleExport" :icon="Download">导出明细</ElButton>
        <ElButton @click="handlePrint" :icon="Printer">打印</ElButton>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <ElCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <span>基本信息</span>
            <ElTag effect="light" size="small">
              <component :is="getTypeIcon(detail.type)" class="mr-1" v-if="getTypeIcon(detail.type)" />
              {{ typeLabelMap[detail.type as keyof typeof typeLabelMap] || detail.type }}
            </ElTag>
          </div>
        </template>
        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="出库单号">{{ detail.order_no }}</ElDescriptionsItem>
          <ElDescriptionsItem label="创建时间">{{ detail.created_at ? new Date(detail.created_at).toLocaleString() : '' }}</ElDescriptionsItem>
          <ElDescriptionsItem v-if="detail.type === 'sale'" label="客户">{{ getCustomerName(detail.customer_id) }}</ElDescriptionsItem>
          <ElDescriptionsItem v-else-if="detail.type === 'repair'" label="关联工单">{{ detail.work_order_id ? '#' + detail.work_order_id : '-' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="总金额"><span class="text-xl font-bold text-red-600">¥{{ Number(detail.total_amount).toFixed(2) }}</span></ElDescriptionsItem>
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
          <span>出库明细 ({{ detail.items?.length || 0 }})</span>
        </template>
        <div class="overflow-x-auto" v-if="detail.items && detail.items.length > 0">
          <el-table :data="detail.items" border size="small" style="width: 100%">
            <el-table-column prop="part_code" label="配件编码" width="130" />
            <el-table-column prop="part_name" label="配件名称" min-width="180" />
            <el-table-column prop="part_spec" label="规格" width="120" />
            <el-table-column prop="part_unit" label="单位" width="70" />
            <el-table-column label="单价" width="100">
              <template #default="scope">¥{{ Number(scope.row.unit_price).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="数量" width="90">
              <template #default="scope"><span class="font-medium text-red-600">-{{ scope.row.qty }}</span></template>
            </el-table-column>
            <el-table-column label="金额" width="110">
              <template #default="scope"><span class="font-medium">¥{{ Number(scope.row.amount).toFixed(2) }}</span></template>
            </el-table-column>
          </el-table>
        </div>
        <div v-else class="text-center text-gray-400 py-8">暂无明细数据</div>
      </ElCard>
    </div>
  </div>

  <div v-else-if="loading" class="flex justify-center items-center h-64">加载中...</div>
  <div v-else class="flex justify-center items-center h-64 text-gray-400">出库单不存在</div>
</template>

<style scoped>
@media print {
  .no-print { display: none !important; }
  .el-card { box-shadow: none !important; border: 1px solid #ddd !important; }
  .el-button { display: none !important; }
}
</style>
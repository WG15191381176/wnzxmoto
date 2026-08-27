<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElCard, ElDescriptions, ElDescriptionsItem, ElButton, ElTag } from 'element-plus'
import { ArrowLeft, Edit, Printer } from '@element-plus/icons-vue'
import { useWorkOrdersStore } from '@/stores/workOrders'

const router = useRouter()
const route = useRoute()
const workOrdersStore = useWorkOrdersStore()

const loading = ref(true)
const detail = ref<any>(null)

const statusTags: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'primary'> = {
  open: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'danger'
}

const statusLabels: Record<string, string> = {
  open: '待接单',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消'
}

async function loadDetail() {
  loading.value = true
  try {
    const id = Number(route.params.id)
    detail.value = await workOrdersStore.getWorkOrderDetail(id)
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.back()
}

function handleEdit() {
  router.push(`/work-orders/edit/${route.params.id}`)
}

function handlePrint() {
  window.print()
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
    <!-- 返回按钮 + 标题 -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <ElButton circle @click="goBack" class="hover:bg-gray-100">
          <ArrowLeft />
        </ElButton>
        <h1 class="text-2xl font-bold text-gray-900">工单详情</h1>
        <ElTag :type="statusTags[detail.status] || 'info'" size="large">
          {{ statusLabels[detail.status] || detail.status }}
        </ElTag>
      </div>
      <div class="flex items-center gap-2">
        <ElButton @click="handleEdit" :icon="Edit">编辑</ElButton>
        <ElButton @click="handlePrint" :icon="Printer">打印</ElButton>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 基本信息 -->
      <ElCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <span>基本信息</span>
            <ElTag v-if="detail.priority === 'urgent'" type="danger">紧急</ElTag>
          </div>
        </template>
        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="工单编号">{{ detail.order_no }}</ElDescriptionsItem>
          <ElDescriptionsItem label="创建时间">{{ detail.created_at ? new Date(detail.created_at).toLocaleString() : '' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="客户">{{ detail.customer_name || '走客' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="联系电话">{{ detail.customer_phone || '' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="车辆信息">{{ detail.vehicle_info || '' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="故障描述" :span="2">{{ detail.fault_desc || '' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="维修建议" :span="2">{{ detail.repair_advice || '' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="备注" :span="2">{{ detail.remark || '' }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <!-- 费用汇总 -->
      <ElCard>
        <template #header>
          <span>费用汇总</span>
        </template>
        <ElDescriptions border direction="vertical">
          <ElDescriptionsItem label="配件费">{{ detail.total_parts_amount || 0 }} 元</ElDescriptionsItem>
          <ElDescriptionsItem label="工时费">{{ detail.total_labor_amount || 0 }} 元</ElDescriptionsItem>
          <ElDescriptionsItem label="其他费用">{{ detail.other_total || 0 }} 元</ElDescriptionsItem>
          <ElDescriptionsItem label="折扣">{{ detail.discount || 0 }} 元</ElDescriptionsItem>
          <ElDescriptionsItem label="实收金额" :span="2">
            <span class="text-2xl font-bold text-green-600">{{ (detail.total_amount || 0).toFixed(2) }} 元</span>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="支付状态">
            <ElTag :type="detail.paid ? 'success' : 'warning'">
              {{ detail.paid ? '已结算' : '未结算' }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="支付方式" v-if="detail.paid">{{ detail.pay_method || '' }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>

      <!-- 配件明细 -->
      <ElCard class="lg:col-span-3">
        <template #header>
          <span>配件明细 ({{ detail.parts?.length || 0 }})</span>
        </template>
        <div class="overflow-x-auto" v-if="detail.parts && detail.parts.length > 0">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 text-left text-gray-500">
                <th class="p-3">配件编码</th>
                <th class="p-3">配件名称</th>
                <th class="p-3">规格</th>
                <th class="p-3">单位</th>
                <th class="p-3 text-right">单价</th>
                <th class="p-3 text-right">数量</th>
                <th class="p-3 text-right">小计</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in detail.parts" :key="item.id" class="border-t hover:bg-gray-50">
                <td class="p-3">{{ item.part_code }}</td>
                <td class="p-3">{{ item.part_name }}</td>
                <td class="p-3">{{ item.part_spec || '' }}</td>
                <td class="p-3">{{ item.part_unit }}</td>
                <td class="p-3 text-right">{{ item.unit_price }} 元</td>
                <td class="p-3 text-right">{{ item.qty }}</td>
                <td class="p-3 text-right font-medium">{{ (item.unit_price * item.qty).toFixed(2) }} 元</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="text-center text-gray-400 py-8">暂无配件明细</div>
      </ElCard>

      <!-- 工时明细 -->
      <ElCard class="lg:col-span-3" v-if="detail.labors && detail.labors.length > 0">
        <template #header>
          <span>工时明细 ({{ detail.labors.length }})</span>
        </template>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 text-left text-gray-500">
                <th class="p-3">项目</th>
                <th class="p-3">工时</th>
                <th class="p-3 text-right">单价</th>
                <th class="p-3 text-right">金额</th>
                <th class="p-3">技师</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="labor in detail.labors" :key="labor.id" class="border-t hover:bg-gray-50">
                <td class="p-3">{{ labor.name }}</td>
                <td class="p-3">{{ labor.hours }}</td>
                <td class="p-3 text-right">{{ labor.unit_price }} 元</td>
                <td class="p-3 text-right font-medium">{{ labor.amount.toFixed(2) }} 元</td>
                <td class="p-3">{{ labor.technician || '' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ElCard>
    </div>
  </div>

  <div v-else-if="loading" class="flex justify-center items-center h-64">加载中...</div>
  <div v-else class="flex justify-center items-center h-64 text-gray-400">工单不存在</div>
</template>

<style scoped>
/* 打印样式 */
@media print {
  .no-print { display: none !important; }
  .el-card { box-shadow: none !important; border: 1px solid #ddd !important; }
}
</style>
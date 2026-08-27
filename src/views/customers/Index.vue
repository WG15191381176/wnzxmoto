<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElCard, ElTabs, ElTabPane, ElRow, ElCol, ElStatistic, ElButton, ElTag } from 'element-plus'
import { User, DataAnalysis, Document } from '@element-plus/icons-vue'
import { useCustomersStore } from '@/stores/customers'
import { useRouter } from 'vue-router'
import List from './List.vue'

const router = useRouter()
const customersStore = useCustomersStore()
const activeTab = ref('list')

const stats = computed(() => ({
  total: customersStore.customers.length,
}))

onMounted(() => {
  customersStore.loadCustomers()
})
</script>

<template>
  <div>
    <el-card class="mb-6">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card">
            <div class="stat-icon" style="background: #dbeafe; color: #2563eb;"><User /></div>
            <div class="stat-info">
              <h3>客户总数</h3>
              <el-statistic :value="stats.total" />
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card">
            <div class="stat-icon" style="background: #dcfce7; color: #16a34a;"><DataAnalysis /></div>
            <div class="stat-info">
              <h3>本月新增</h3>
              <el-statistic :value="0" />
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card">
            <div class="stat-icon" style="background: #fce7f3; color: #db2777;"><Document /></div>
            <div class="stat-info">
              <h3>有工单客户</h3>
              <el-statistic :value="0" />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>

    <el-tabs v-model="activeTab" type="card">
      <el-tab-pane label="客户列表" name="list"><List /></el-tab-pane>
    </el-tabs>
  </div>
</template>
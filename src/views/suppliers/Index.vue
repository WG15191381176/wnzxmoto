<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElCard, ElTabs, ElTabPane, ElRow, ElCol, ElStatistic, ElButton, ElTag } from 'element-plus'
import { Van, DataAnalysis, Box } from '@element-plus/icons-vue'
import { useSuppliersStore } from '@/stores/suppliers'
import { useRouter } from 'vue-router'
import List from './List.vue'

const router = useRouter()
const suppliersStore = useSuppliersStore()
const activeTab = ref('list')

const stats = computed(() => ({
  total: suppliersStore.suppliers.length,
}))

onMounted(() => {
  suppliersStore.loadSuppliers()
})
</script>

<template>
  <div>
    <el-card class="mb-6">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card">
            <div class="stat-icon" style="background: #fef3c7; color: #f59e0b;"><Van /></div>
            <div class="stat-info">
              <h3>供应商总数</h3>
              <el-statistic :value="stats.total" />
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card">
            <div class="stat-icon" style="background: #dcfce7; color: #16a34a;"><DataAnalysis /></div>
            <div class="stat-info">
              <h3>本月采购额</h3>
              <el-statistic :value="0" />
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :lg="6">
          <el-card class="stat-card">
            <div class="stat-icon" style="background: #dbeafe; color: #2563eb;"><Box /></div>
            <div class="stat-info">
              <h3>待入库单据</h3>
              <el-statistic :value="0" />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>

    <el-tabs v-model="activeTab" type="card">
      <el-tab-pane label="供应商列表" name="list"><List /></el-tab-pane>
    </el-tabs>
  </div>
</template>
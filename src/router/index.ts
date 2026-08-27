import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { title: '仪表盘', icon: 'Monitor' },
  },
  {
    path: '/inventory',
    name: 'Inventory',
    component: () => import('@/views/inventory/Index.vue'),
    meta: { title: '库存管理', icon: 'Box' },
    children: [
      { path: '', redirect: 'parts' },
      { path: 'parts', name: 'Parts', component: () => import('@/views/inventory/Parts.vue'), meta: { title: '配件列表' } },
      { path: 'in', name: 'InOrders', component: () => import('@/views/inventory/InOrders.vue'), meta: { title: '入库管理' } },
      { path: 'in/detail/:id', name: 'InOrderDetail', component: () => import('@/views/inventory/InOrderDetail.vue'), meta: { title: '入库单详情', hidden: true } },
      { path: 'out', name: 'OutOrders', component: () => import('@/views/inventory/OutOrders.vue'), meta: { title: '出库管理' } },
      { path: 'out/detail/:id', name: 'OutOrderDetail', component: () => import('@/views/inventory/OutOrderDetail.vue'), meta: { title: '出库单详情', hidden: true } },
      { path: 'logs', name: 'StockLogs', component: () => import('@/views/inventory/StockLogs.vue'), meta: { title: '库存流水' } },
    ],
  },
  {
    path: '/customers',
    name: 'Customers',
    component: () => import('@/views/customers/Index.vue'),
    meta: { title: '客户档案', icon: 'User' },
    children: [
      { path: '', redirect: 'list' },
      { path: 'list', name: 'CustomerList', component: () => import('@/views/customers/List.vue'), meta: { title: '客户列表' } },
    ],
  },
  {
    path: '/work-orders',
    name: 'WorkOrders',
    component: () => import('@/views/workOrders/Index.vue'),
    meta: { title: '维修工单', icon: 'Tool' },
    children: [
      { path: '', redirect: 'list' },
      { path: 'list', name: 'WorkOrderList', component: () => import('@/views/workOrders/List.vue'), meta: { title: '工单列表' } },
      { path: 'detail/:id', name: 'WorkOrderDetail', component: () => import('@/views/workOrders/Detail.vue'), meta: { title: '工单详情', hidden: true } },
      { path: 'edit/:id', name: 'WorkOrderEdit', component: () => import('@/views/workOrders/Edit.vue'), meta: { title: '编辑工单', hidden: true } },
    ],
  },
  {
    path: '/suppliers',
    name: 'Suppliers',
    component: () => import('@/views/suppliers/Index.vue'),
    meta: { title: '供应商管理', icon: 'Truck' },
    children: [
      { path: '', redirect: 'list' },
      { path: 'list', name: 'SupplierList', component: () => import('@/views/suppliers/List.vue'), meta: { title: '供应商列表' } },
    ],
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
    meta: { title: '系统设置', icon: 'Setting' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title as string} - 进销存管理系统`
  next()
})

export default router
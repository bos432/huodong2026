<template>
  <div class="courses-page">
    <div class="page-header">
      <h2>课程管理</h2>
      <div class="header-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="平台/全部商家" style="width: 220px" @change="changeTenant">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantOptionLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-button type="primary" @click="createCourse">新增课程</el-button>
      </div>
    </div>

    <el-table :data="courses" stripe style="width:100%;" empty-text="暂无课程">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="封面" width="80">
        <template #default><div style="width:48px;height:48px;background:#f0ebe3;border-radius:8px;display:flex;align-items:center;justify-content:center;">📚</div></template>
      </el-table-column>
      <el-table-column prop="title" label="课程名称" min-width="160" />
      <el-table-column prop="teacherName" label="讲师" width="120" />
      <el-table-column v-if="isPlatformAdmin()" label="所属商家" min-width="160" show-overflow-tooltip>
        <template #default="{row}">{{ tenantDisplayName(row) }}</template>
      </el-table-column>
      <el-table-column prop="price" label="价格" width="80"><template #default="{row}">¥{{ row.price }}</template></el-table-column>
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{row}"><el-tag :type="row.status==='published'?'success':'info'">{{ row.status==='published'?'已发布':'草稿' }}</el-tag></template>
      </el-table-column>
      <el-table-column label="创建时间" width="170"><template #default="{row}">{{ formatDateTime(row.createdAt) }}</template></el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{row}">
          <el-button size="small" @click="editCourse(row)">编辑</el-button>
          <el-button size="small" @click="manageChapters(row)">章节</el-button>
          <el-button size="small" type="danger" @click="deleteCourse(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showForm" :title="editing ? '编辑课程' : '新增课程'" width="600px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="课程名称"><el-input v-model="form.title" /></el-form-item>
        <el-form-item v-if="isPlatformAdmin()" label="所属商家">
          <el-select v-model="form.tenantId" clearable filterable placeholder="平台课程">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantOptionLabel(tenant)" :value="tenant.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="讲师名称"><el-input v-model="form.teacherName" /></el-form-item>
        <el-form-item label="价格"><el-input-number v-model="form.price" :min="0" /></el-form-item>
        <el-form-item label="原价"><el-input-number v-model="form.originalPrice" :min="0" /></el-form-item>
        <el-form-item label="状态"><el-select v-model="form.status"><el-option label="草稿" value="draft" /><el-option label="已发布" value="published" /></el-select></el-form-item>
        <el-form-item label="课程介绍"><el-input v-model="form.description" type="textarea" :rows="4" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="showForm = false">取消</el-button><el-button type="primary" :loading="saving" @click="saveCourse">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="showChapters" :title="'章节管理 - ' + (currentCourse?.title || '')" width="700px">
      <el-button type="primary" size="small" style="margin-bottom:16px;" @click="addChapter">新增章节</el-button>
      <div v-for="(ch, ci) in chapters" :key="ci" style="border:1px solid #eee;border-radius:8px;padding:12px;margin-bottom:8px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <el-input v-model="ch.title" style="width:300px;" placeholder="章节名称" />
          <div><el-button size="small" @click="addLesson(ch)">+课时</el-button><el-button size="small" type="danger" @click="deleteChapter(ci)">删除</el-button></div>
        </div>
        <div v-for="(ls, li) in ch.lessons" :key="li" style="display:flex;align-items:center;gap:8px;margin-left:24px;padding:4px 0;">
          <el-input v-model="ls.title" style="flex:1;" placeholder="课时名称" /><el-input v-model="ls.duration" style="width:80px;" placeholder="时长" /><el-switch v-model="ls.isFree" active-text="免费" /><el-button size="small" type="danger" @click="ch.lessons.splice(li,1)">×</el-button>
        </div>
      </div>
      <template #footer><el-button @click="showChapters = false">关闭</el-button><el-button type="primary" @click="saveChapters">保存章节</el-button></template>
    </el-dialog>

    <el-divider />

    <div class="page-header order-header">
      <h3>课程订单</h3>
      <div class="order-filters">
        <el-select v-model="orderFilters.status" clearable placeholder="全部状态" style="width: 140px" @change="loadOrders">
          <el-option label="待付款" value="pending_payment" />
          <el-option label="已支付" value="paid" />
          <el-option label="已关闭" value="closed" />
        </el-select>
        <el-select v-if="isPlatformAdmin()" v-model="orderFilters.tenantId" clearable filterable placeholder="平台/全部商家" style="width: 220px" @change="loadOrders">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantOptionLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-input v-model="orderFilters.keyword" clearable placeholder="订单号/课程/手机号" style="width: 220px" @keyup.enter="loadOrders" @clear="loadOrders" />
        <el-button :loading="orderLoading" @click="loadOrders">刷新</el-button>
      </div>
    </div>

    <el-table v-loading="orderLoading" :data="courseOrders" stripe style="width:100%;" empty-text="暂无课程订单">
      <el-table-column prop="orderNo" label="订单号" width="190" />
      <el-table-column label="课程" min-width="180"><template #default="{row}">{{ row.course?.title || "-" }}</template></el-table-column>
      <el-table-column label="用户" min-width="150">
        <template #default="{row}">
          <div>{{ row.user?.phone || "-" }}</div>
          <small>{{ row.user?.nickname || "H5 用户" }}</small>
        </template>
      </el-table-column>
      <el-table-column label="金额" width="100"><template #default="{row}">¥{{ money(row.amount) }}</template></el-table-column>
      <el-table-column label="支付方式" width="130"><template #default="{row}">{{ paymentMethodLabel(row.paymentMethod) }}</template></el-table-column>
      <el-table-column label="状态" width="110"><template #default="{row}"><el-tag :type="courseOrderStatusType(row.status)">{{ courseOrderStatusText(row.status) }}</el-tag></template></el-table-column>
      <el-table-column label="付款截止" width="170"><template #default="{row}">{{ formatDateTime(row.expiresAt) }}</template></el-table-column>
      <el-table-column label="创建时间" width="170"><template #default="{row}">{{ formatDateTime(row.createdAt) }}</template></el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{row}">
          <el-button size="small" type="success" :disabled="!canConfirmCourseOrder(row)" @click="confirmCourseOrder(row)">确认收款</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="pagination">
      <el-pagination
        v-model:current-page="orderFilters.page"
        v-model:page-size="orderFilters.pageSize"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        :total="orderTotal"
        @size-change="loadOrders"
        @current-change="loadOrders"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";
import { isPlatformAdmin } from "../permissions";

const route = useRoute();
const router = useRouter();
const courses = ref<any[]>([]);
const tenants = ref<any[]>([]);
const showForm = ref(false);
const editing = ref(false);
const form = ref<any>({ title:"", teacherName:"", price:0, originalPrice:0, status:"draft", description:"" });
const saving = ref(false);
const showChapters = ref(false);
const currentCourse = ref<any>(null);
const chapters = ref<any[]>([]);
const courseOrders = ref<any[]>([]);
const orderLoading = ref(false);
const orderTotal = ref(0);
const routeTenantId = () => {
  const tenantId = typeof route.query.tenantId === "string" ? Number(route.query.tenantId) : undefined;
  return isPlatformAdmin() && tenantId && Number.isFinite(tenantId) ? tenantId : undefined;
};
const filters = reactive({ tenantId: routeTenantId() as number | undefined });
const orderFilters = reactive({ status: "pending_payment", keyword: "", tenantId: routeTenantId() as number | undefined, page: 1, pageSize: 20 });

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-CN", { hour12: false });
}

async function load() {
  try {
    courses.value = await api.get<any, any[]>("/admin/courses", { params: { tenantId: isPlatformAdmin() ? filters.tenantId || undefined : undefined } });
  } catch (error: any) {
    ElMessage.error(error.message || "加载课程失败");
  }
}

async function loadTenants() {
  tenants.value = isPlatformAdmin() ? await api.get<any, any[]>("/admin/tenants") : [];
}

function tenantOptionLabel(tenant: any) {
  return `${tenant.name || tenant.code}（${tenant.code}）`;
}

function tenantDisplayName(row: any) {
  return row.tenant?.name || row.tenant?.code || "平台/未归属";
}

function changeTenant() {
  orderFilters.tenantId = filters.tenantId;
  const query = { ...route.query };
  if (filters.tenantId) query.tenantId = String(filters.tenantId);
  else delete query.tenantId;
  router.replace({ path: route.path, query });
  load();
  loadOrders();
}

function createCourse() {
  editing.value = false;
  form.value = { title:"", teacherName:"", price:0, originalPrice:0, status:"draft", description:"", tenantId: filters.tenantId };
  showForm.value = true;
}

function money(value: string | number | undefined) {
  return Number(value || 0).toFixed(2);
}

function paymentMethodLabel(value?: string) {
  const labels: Record<string, string> = { free: "免费", wechat: "微信支付", alipay: "支付宝", balance: "余额支付", offline: "线下收款" };
  return value ? labels[value] || value : "-";
}

function courseOrderStatusText(value?: string) {
  const labels: Record<string, string> = { pending_payment: "待付款", paid: "已支付", closed: "已关闭" };
  return value ? labels[value] || value : "-";
}

function courseOrderStatusType(value?: string) {
  if (value === "paid") return "success";
  if (value === "closed") return "info";
  return "warning";
}

function canConfirmCourseOrder(row: any) {
  return row.paymentMethod === "offline" && row.status === "pending_payment" && !(row.expiresAt && new Date(row.expiresAt).getTime() <= Date.now());
}

async function loadOrders() {
  orderLoading.value = true;
  try {
    const result = await api.get<any, { items: any[]; total: number }>("/admin/course-orders", {
      params: {
        status: orderFilters.status || undefined,
        keyword: orderFilters.keyword.trim() || undefined,
        tenantId: isPlatformAdmin() ? orderFilters.tenantId || undefined : undefined,
        page: orderFilters.page,
        pageSize: orderFilters.pageSize
      }
    });
    courseOrders.value = result.items || [];
    orderTotal.value = result.total || 0;
  } catch (error: any) {
    ElMessage.error(error.message || "加载课程订单失败");
  } finally {
    orderLoading.value = false;
  }
}

async function confirmCourseOrder(row: any) {
  try {
    await ElMessageBox.confirm(`确认课程订单 ${row.orderNo} 已完成线下收款？确认后用户会获得课程学习权限。`, "确认课程收款", { type: "warning", confirmButtonText: "确认收款", cancelButtonText: "再核对一下" });
    await api.post(`/admin/course-orders/${row.id}/confirm-offline-payment`);
    ElMessage.success("已确认收款，学习权限已开通");
    await loadOrders();
  } catch (error: any) {
    if (error === "cancel") return;
    ElMessage.error(error.message || "确认收款失败");
  }
}

async function saveCourse() {
  if (!form.value.title?.trim()) return ElMessage.error("请输入课程名称");
  try {
    saving.value = true;
    const payload = {
      ...form.value,
      title: form.value.title.trim(),
      teacherName: form.value.teacherName?.trim() || null,
      description: form.value.description?.trim() || null,
      price: Number(form.value.price || 0),
      originalPrice: Number(form.value.originalPrice || 0)
    };
    if (isPlatformAdmin()) payload.tenantId = form.value.tenantId || null;
    if (editing.value && form.value.id) {
      await api.patch("/admin/courses/" + form.value.id, payload);
    } else {
      await api.post("/admin/courses", payload);
    }
    showForm.value = false;
    editing.value = false;
    form.value = { title:"", teacherName:"", price:0, originalPrice:0, status:"draft", description:"" };
    await load();
    ElMessage.success("课程已保存");
  } catch (error: any) {
    ElMessage.error(error.message || "保存课程失败");
  } finally {
    saving.value = false;
  }
}

function editCourse(row: any) {
  form.value = { ...row, tenantId: row.tenant?.id };
  editing.value = true;
  showForm.value = true;
}

async function deleteCourse(row: any) {
  try {
    await ElMessageBox.confirm(`确认删除课程「${row.title}」？`, "删除课程", { type: "warning" });
    await api.delete("/admin/courses/" + row.id);
    await load();
    ElMessage.success("课程已删除");
  } catch (error: any) {
    if (error === "cancel") return;
    ElMessage.error(error.message || "删除课程失败");
  }
}

async function manageChapters(row: any) {
  try {
    currentCourse.value = row;
    const chs = await api.get<any, any[]>("/admin/courses/" + row.id + "/chapters");
    for (const ch of chs) {
      ch.lessons = await api.get<any, any[]>("/admin/course-chapters/" + ch.id + "/lessons");
    }
    chapters.value = chs;
    showChapters.value = true;
  } catch (error: any) {
    ElMessage.error(error.message || "加载章节失败");
  }
}

function addChapter() {
  chapters.value.push({ courseId: currentCourse.value?.id, title: "", sortOrder: chapters.value.length, lessons: [] });
}

function addLesson(ch: any) {
  ch.lessons.push({ chapterId: ch.id, title: "", duration: "", isFree: false });
}

async function deleteChapter(ci: number) {
  try {
    const ch = chapters.value[ci];
    if (ch.id) await api.delete("/admin/course-chapters/" + ch.id);
    chapters.value.splice(ci, 1);
  } catch (error: any) {
    ElMessage.error(error.message || "删除章节失败");
  }
}

async function saveChapters() {
  try {
    for (const ch of chapters.value) {
      if (ch.id) {
        await api.patch("/admin/course-chapters/" + ch.id, { title: ch.title, sortOrder: ch.sortOrder });
      } else {
        const savedChapter = await api.post<any, any>("/admin/course-chapters", { courseId: currentCourse.value?.id, title: ch.title, sortOrder: ch.sortOrder });
        ch.id = savedChapter?.id;
      }
      for (const ls of ch.lessons) {
        if (ls.id) {
          await api.patch("/admin/course-lessons/" + ls.id, { title: ls.title, duration: ls.duration, isFree: ls.isFree });
        } else if (ls.title) {
          await api.post("/admin/course-lessons", { chapterId: ch.id, title: ls.title, duration: ls.duration, isFree: ls.isFree });
        }
      }
    }
    await load();
    ElMessage.success("章节已保存");
  } catch (error: any) {
    ElMessage.error(error.message || "保存章节失败");
  }
}

onMounted(() => {
  loadTenants();
  load();
  loadOrders();
});

watch(() => route.query.tenantId, () => {
  const nextTenantId = routeTenantId();
  if (filters.tenantId === nextTenantId && orderFilters.tenantId === nextTenantId) return;
  filters.tenantId = nextTenantId;
  orderFilters.tenantId = nextTenantId;
  load();
  loadOrders();
});
</script>

<style scoped>
.courses-page { padding: 24px; }
.page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
.header-actions { display:flex; gap:12px; align-items:center; }
.order-header { margin-top: 12px; }
.order-filters { display:flex; gap:12px; align-items:center; }
.pagination { display:flex; justify-content:flex-end; padding-top:16px; }
small { color:#667085; display:block; line-height:1.5; }
</style>

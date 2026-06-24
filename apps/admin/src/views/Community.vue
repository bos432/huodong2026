<template>
  <div class="community-page">
    <div class="page-header">
      <h2>慢π运营</h2>
      <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="平台/全部商家" style="width: 240px" @change="changeTenant">
        <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantOptionLabel(tenant)" :value="tenant.id" />
      </el-select>
    </div>
    <el-alert
      type="info"
      title="共修动态/文章会展示在 H5 首页「共修动态」和共修页「学员动态」；用户点赞、评论后，可在这里审核评论。"
      show-icon
      :closable="false"
      class="page-alert"
    />
    <el-tabs v-model="activeTab">
      <el-tab-pane label="共修活动" name="activities">
        <el-button type="primary" size="small" style="margin-bottom:16px;" @click="showForm = true">新增活动</el-button>
        <el-table :data="activities" stripe style="width:100%;" empty-text="暂无共修活动">
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="title" label="活动名称" min-width="160" />
          <el-table-column v-if="isPlatformAdmin()" label="所属商家" min-width="160" show-overflow-tooltip><template #default="{row}">{{ tenantDisplayName(row) }}</template></el-table-column>
          <el-table-column label="开始时间" width="170"><template #default="{row}">{{ formatDateTime(row.startTime) }}</template></el-table-column>
          <el-table-column prop="location" label="地点" width="120" />
          <el-table-column prop="registeredCount" label="报名数" width="80" />
          <el-table-column prop="status" label="状态" width="80"><template #default="{row}"><el-tag :type="row.status==='published'?'success':'info'">{{ row.status==='published'?'已发布':'草稿' }}</el-tag></template></el-table-column>
          <el-table-column label="操作" width="200"><template #default="{row}"><el-button size="small" @click="editActivity(row)">编辑</el-button><el-button size="small" type="danger" @click="deleteActivity(row)">删除</el-button></template></el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="打卡任务" name="checkin">
        <el-button type="primary" size="small" style="margin-bottom:16px;" @click="showCheckinForm = true">新增打卡任务</el-button>
        <el-alert
          v-if="duplicateCheckinGroups.length"
          type="warning"
          :title="`检测到 ${duplicateCheckinGroups.length} 组同日重复打卡任务，请保留一条并删除多余记录；系统已阻止继续新增同商家同日期任务。`"
          show-icon
          :closable="false"
          class="page-alert"
        />
        <el-table :data="checkinTasks" stripe style="width:100%;" empty-text="暂无打卡任务">
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="date" label="日期" width="120" />
          <el-table-column label="重复状态" width="100"><template #default="{row}"><el-tag :type="isDuplicateCheckinTask(row) ? 'danger' : 'success'">{{ isDuplicateCheckinTask(row) ? '重复' : '正常' }}</el-tag></template></el-table-column>
          <el-table-column prop="title" label="任务名称" min-width="200" />
          <el-table-column v-if="isPlatformAdmin()" label="所属商家" min-width="160" show-overflow-tooltip><template #default="{row}">{{ tenantDisplayName(row) }}</template></el-table-column>
          <el-table-column prop="completedCount" label="完成数" width="80" />
          <el-table-column label="操作" width="200"><template #default="{row}"><el-button size="small" @click="editCheckin(row)">编辑</el-button><el-button size="small" type="danger" @click="deleteCheckin(row)">删除</el-button></template></el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="共修动态/文章" name="posts">
        <div class="tab-toolbar">
          <el-button type="primary" size="small" @click="showPostForm = true">发布动态/文章</el-button>
          <el-select v-model="postFilters.status" clearable placeholder="审核状态" size="small" style="width: 130px" @change="load">
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
          <el-select v-model="postFilters.source" clearable placeholder="来源" size="small" style="width: 130px" @change="load">
            <el-option label="官方动态" value="official" />
            <el-option label="参与者心得" value="participant" />
          </el-select>
          <el-input v-model="postFilters.activityId" clearable placeholder="活动ID" size="small" style="width: 110px" @change="load" @clear="load" @keyup.enter="load" />
          <el-button size="small" @click="load">查询</el-button>
          <el-button size="small" text @click="resetPostFilters">重置</el-button>
          <span>后台发布内容与用户动态统一进入前台动态流，适合公告、文章、活动花絮和学员案例。</span>
        </div>
        <el-table :data="posts" stripe style="width:100%;" empty-text="暂无共修动态">
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="userId" label="用户ID" width="80" />
          <el-table-column label="来源" width="110"><template #default="{row}"><el-tag :type="row.source === 'participant' ? 'warning' : 'info'">{{ row.source === 'participant' ? '参与者心得' : '官方动态' }}</el-tag></template></el-table-column>
          <el-table-column label="关联活动" min-width="180" show-overflow-tooltip><template #default="{row}">{{ row.activity?.title || '-' }}</template></el-table-column>
          <el-table-column prop="content" label="内容" min-width="300" show-overflow-tooltip />
          <el-table-column v-if="isPlatformAdmin()" label="所属商家" min-width="160" show-overflow-tooltip><template #default="{row}">{{ tenantDisplayName(row) }}</template></el-table-column>
          <el-table-column label="审核" width="100"><template #default="{row}"><el-tag :type="postStatusTag(row.status)">{{ postStatusText(row.status) }}</el-tag></template></el-table-column>
          <el-table-column label="展示" width="90"><template #default="{row}"><el-tag :type="row.visible === false ? 'info' : 'success'">{{ row.visible === false ? '隐藏' : '展示' }}</el-tag></template></el-table-column>
          <el-table-column prop="reviewRemark" label="审核备注" min-width="160" show-overflow-tooltip />
          <el-table-column prop="likes" label="点赞" width="60" />
          <el-table-column prop="shareCount" label="分享" width="60" />
          <el-table-column prop="createdAt" label="时间" width="160" />
          <el-table-column label="操作" width="250">
            <template #default="{row}">
              <el-button size="small" type="success" :disabled="row.status === 'approved'" @click="openPostReview(row, 'approved', true)">通过</el-button>
              <el-button size="small" type="warning" :disabled="row.status === 'rejected'" @click="openPostReview(row, 'rejected', false)">拒绝</el-button>
              <el-button size="small" @click="openPostReview(row, row.status || 'pending', !row.visible)">{{ row.visible === false ? '展示' : '下架' }}</el-button>
              <el-button size="small" type="danger" @click="deletePost(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="点赞评论/评论审核" name="comments">
        <el-table :data="comments" stripe style="width:100%;" empty-text="暂无评论">
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="postId" label="动态ID" width="80" />
          <el-table-column prop="userId" label="用户ID" width="80" />
          <el-table-column prop="content" label="评论内容" min-width="300" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{row}">
              <el-tag :type="row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'">{{ statusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="时间" width="160" />
          <el-table-column label="操作" width="180">
            <template #default="{row}">
              <el-button size="small" type="success" :disabled="row.status === 'approved'" @click="reviewComment(row, 'approved')">通过</el-button>
              <el-button size="small" type="danger" :disabled="row.status === 'rejected'" @click="reviewComment(row, 'rejected')">拒绝</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="showForm" :title="editingActivity ? '编辑活动' : '新增活动'" width="500px">
      <el-form :model="activityForm" label-width="80px">
        <el-form-item label="活动名称"><el-input v-model="activityForm.title" /></el-form-item>
        <el-form-item v-if="isPlatformAdmin()" label="所属商家">
          <el-select v-model="activityForm.tenantId" clearable filterable placeholder="平台共修">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantOptionLabel(tenant)" :value="tenant.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始时间"><el-date-picker v-model="activityForm.startTime" type="datetime" format="YYYY-MM-DD HH:mm" /></el-form-item>
        <el-form-item label="地点"><el-input v-model="activityForm.location" /></el-form-item>
        <el-form-item label="状态"><el-select v-model="activityForm.status"><el-option label="草稿" value="draft" /><el-option label="已发布" value="published" /></el-select></el-form-item>
        <el-form-item label="介绍"><el-input v-model="activityForm.description" type="textarea" :rows="4" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="showForm = false">取消</el-button><el-button type="primary" :loading="savingActivity" @click="saveActivity">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="showCheckinForm" :title="editingCheckin ? '编辑打卡任务' : '新增打卡任务'" width="500px">
      <el-form :model="checkinForm" label-width="80px">
        <el-form-item label="日期"><el-date-picker v-model="checkinForm.date" type="date" /></el-form-item>
        <el-form-item v-if="isPlatformAdmin()" label="所属商家">
          <el-select v-model="checkinForm.tenantId" clearable filterable placeholder="平台打卡">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantOptionLabel(tenant)" :value="tenant.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="任务名称"><el-input v-model="checkinForm.title" /></el-form-item>
        <el-form-item label="说明"><el-input v-model="checkinForm.description" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="showCheckinForm = false">取消</el-button><el-button type="primary" :loading="savingCheckin" @click="saveCheckin">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="showPostForm" title="发布共修动态/文章" width="560px">
      <el-form :model="postForm" label-width="92px">
        <el-form-item v-if="isPlatformAdmin()" label="所属商家">
          <el-select v-model="postForm.tenantId" clearable filterable placeholder="平台动态">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantOptionLabel(tenant)" :value="tenant.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="展示状态">
          <el-switch v-model="postForm.visible" active-text="前台展示" inactive-text="先隐藏" />
        </el-form-item>
        <el-form-item label="关联活动ID">
          <el-input-number v-model="postForm.activityId" :min="0" placeholder="可选" />
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input v-model="postForm.content" type="textarea" :rows="7" maxlength="2000" show-word-limit placeholder="可发布共修文章、活动回顾、学员案例、运营公告等内容" />
        </el-form-item>
        <el-form-item label="图片地址">
          <el-input v-model="postForm.imagesText" type="textarea" :rows="3" placeholder="可选。每行一个图片地址，也支持用逗号分隔。" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPostForm = false">取消</el-button>
        <el-button type="primary" :loading="savingPost" @click="savePost">发布</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showPostReviewDialog" title="审核共修动态" width="520px">
      <el-form :model="postReviewForm" label-width="88px">
        <el-form-item label="动态ID">
          <span>{{ postReviewForm.id || "-" }}</span>
        </el-form-item>
        <el-form-item label="审核状态">
          <el-select v-model="postReviewForm.status" style="width: 180px" @change="syncReviewVisibility">
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="前台展示">
          <el-switch v-model="postReviewForm.visible" active-text="展示" inactive-text="隐藏" :disabled="postReviewForm.status === 'rejected'" />
        </el-form-item>
        <el-form-item label="审核备注">
          <el-input v-model="postReviewForm.reviewRemark" type="textarea" :rows="4" maxlength="500" show-word-limit placeholder="可填写通过说明、驳回原因或下架原因，便于运营追踪。" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPostReviewDialog = false">取消</el-button>
        <el-button type="primary" :loading="savingPostReview" @click="submitPostReview">保存审核结果</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";
import { isPlatformAdmin } from "../permissions";

const route = useRoute();
const router = useRouter();
const activeTab = ref("activities");
const tenants = ref<any[]>([]);
const activities = ref<any[]>([]);
const checkinTasks = ref<any[]>([]);
const posts = ref<any[]>([]);
const comments = ref<any[]>([]);
const showForm = ref(false);
const editingActivity = ref(false);
const activityForm = ref<any>({ title:"", startTime:"", location:"", status:"draft", description:"" });
const savingActivity = ref(false);
const showCheckinForm = ref(false);
const editingCheckin = ref(false);
const checkinForm = ref<any>({ date:"", title:"", description:"" });
const savingCheckin = ref(false);
const showPostForm = ref(false);
const savingPost = ref(false);
const postForm = ref<any>({ content: "", imagesText: "", visible: true });
const showPostReviewDialog = ref(false);
const savingPostReview = ref(false);
const postReviewForm = ref<any>({ id: undefined, status: "pending", visible: true, reviewRemark: "" });
const postFilters = reactive({ status: "", source: "", activityId: "" });
const duplicateCheckinGroups = computed(() => {
  const groups = new Map<string, any[]>();
  for (const task of checkinTasks.value) {
    const key = checkinTaskDuplicateKey(task);
    if (!key) continue;
    const rows = groups.get(key) || [];
    rows.push(task);
    groups.set(key, rows);
  }
  return Array.from(groups.values()).filter((rows) => rows.length > 1);
});
const routeTenantId = () => {
  const tenantId = typeof route.query.tenantId === "string" ? Number(route.query.tenantId) : undefined;
  return isPlatformAdmin() && tenantId && Number.isFinite(tenantId) ? tenantId : undefined;
};
const filters = reactive({ tenantId: routeTenantId() as number | undefined });

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-CN", { hour12: false });
}

function formatLocalDate(value?: string | Date | null) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function load() {
  try {
    const params = { tenantId: isPlatformAdmin() ? filters.tenantId || undefined : undefined };
    const activityId = Number(postFilters.activityId || 0) || undefined;
    const postParams = { ...params, status: postFilters.status || undefined, source: postFilters.source || undefined, activityId };
    const [actRows, chkRows, postRows, commentRows] = await Promise.all([
      api.get<any, any[]>("/admin/community-activities", { params }),
      api.get<any, any[]>("/admin/checkin-tasks", { params }),
      api.get<any, any[]>("/admin/community-posts", { params: postParams }),
      api.get<any, any[]>("/admin/community-post-comments", { params })
    ]);
    activities.value = actRows;
    checkinTasks.value = chkRows;
    posts.value = postRows;
    comments.value = commentRows;
  } catch (error: any) {
    ElMessage.error(error.message || "加载共修数据失败");
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

function checkinTaskDuplicateKey(row: any) {
  const date = formatLocalDate(row?.date);
  if (!date) return "";
  const tenantId = row?.tenant?.id || row?.tenantId || "platform";
  return `${tenantId}:${date}`;
}

function isDuplicateCheckinTask(row: any) {
  const key = checkinTaskDuplicateKey(row);
  if (!key) return false;
  return checkinTasks.value.filter((task) => checkinTaskDuplicateKey(task) === key).length > 1;
}

function findDuplicateCheckinTask(dto: any) {
  const key = checkinTaskDuplicateKey({ date: dto.date, tenantId: dto.tenantId || "platform" });
  if (!key) return null;
  const currentId = Number(dto.id || 0);
  return checkinTasks.value.find((task) => Number(task.id) !== currentId && checkinTaskDuplicateKey(task) === key) || null;
}

function changeTenant() {
  const query = { ...route.query };
  if (filters.tenantId) query.tenantId = String(filters.tenantId);
  else delete query.tenantId;
  router.replace({ path: route.path, query });
  load();
}

function resetPostFilters() {
  postFilters.status = "";
  postFilters.source = "";
  postFilters.activityId = "";
  load();
}

async function saveActivity() {
  if (!activityForm.value.title?.trim()) return ElMessage.error("请输入活动名称");
  try {
    savingActivity.value = true;
    const dto = { ...activityForm.value };
    dto.title = dto.title.trim();
    dto.location = dto.location?.trim() || null;
    dto.description = dto.description?.trim() || null;
    if (typeof dto.startTime === "object" && dto.startTime?.toISOString) dto.startTime = dto.startTime.toISOString();
    if (isPlatformAdmin()) dto.tenantId = dto.tenantId || null;
    if (editingActivity.value && dto.id) {
      await api.patch("/admin/community-activities/" + dto.id, dto);
    } else {
      await api.post("/admin/community-activities", dto);
    }
    showForm.value = false;
    editingActivity.value = false;
    activityForm.value = { title:"", startTime:"", location:"", status:"draft", description:"", tenantId: filters.tenantId };
    await load();
    ElMessage.success("共修活动已保存");
  } catch (error: any) {
    ElMessage.error(error.message || "保存共修活动失败");
  } finally {
    savingActivity.value = false;
  }
}

function editActivity(row: any) {
  activityForm.value = { ...row, tenantId: row.tenant?.id };
  editingActivity.value = true;
  showForm.value = true;
}

async function deleteActivity(row: any) {
  try {
    await ElMessageBox.confirm(`确认删除共修活动「${row.title}」？`, "删除共修活动", { type: "warning" });
    await api.delete("/admin/community-activities/" + row.id);
    await load();
    ElMessage.success("共修活动已删除");
  } catch (error: any) {
    if (error === "cancel") return;
    ElMessage.error(error.message || "删除共修活动失败");
  }
}

async function saveCheckin() {
  if (!checkinForm.value.date) return ElMessage.error("请选择打卡日期");
  if (!checkinForm.value.title?.trim()) return ElMessage.error("请输入任务名称");
  try {
    savingCheckin.value = true;
    const dto = { ...checkinForm.value };
    dto.title = dto.title.trim();
    dto.description = dto.description?.trim() || null;
    if (typeof dto.date === "object") dto.date = formatLocalDate(dto.date);
    else dto.date = formatLocalDate(dto.date);
    if (isPlatformAdmin()) dto.tenantId = dto.tenantId || null;
    const duplicate = findDuplicateCheckinTask(dto);
    if (duplicate) {
      const scope = duplicate.tenant?.name || duplicate.tenant?.code || "平台";
      ElMessage.error(`${scope} ${dto.date} 已有打卡任务「${duplicate.title}」，请编辑已有任务或删除重复任务`);
      return;
    }
    if (editingCheckin.value && dto.id) {
      await api.patch("/admin/checkin-tasks/" + dto.id, dto);
    } else {
      await api.post("/admin/checkin-tasks", dto);
    }
    showCheckinForm.value = false;
    editingCheckin.value = false;
    checkinForm.value = { date:"", title:"", description:"", tenantId: filters.tenantId };
    await load();
    ElMessage.success("打卡任务已保存");
  } catch (error: any) {
    ElMessage.error(error.message || "保存打卡任务失败");
  } finally {
    savingCheckin.value = false;
  }
}

function editCheckin(row: any) {
  checkinForm.value = { ...row, tenantId: row.tenant?.id };
  editingCheckin.value = true;
  showCheckinForm.value = true;
}

async function deleteCheckin(row: any) {
  try {
    await ElMessageBox.confirm(`确认删除打卡任务「${row.title}」？`, "删除打卡任务", { type: "warning" });
    await api.delete("/admin/checkin-tasks/" + row.id);
    await load();
    ElMessage.success("打卡任务已删除");
  } catch (error: any) {
    if (error === "cancel") return;
    ElMessage.error(error.message || "删除打卡任务失败");
  }
}

async function deletePost(row: any) {
  try {
    await ElMessageBox.confirm("确认删除这条学员动态？", "删除动态", { type: "warning" });
    await api.delete("/admin/community-posts/" + row.id);
    await load();
    ElMessage.success("动态已删除");
  } catch (error: any) {
    if (error === "cancel") return;
    ElMessage.error(error.message || "删除动态失败");
  }
}

function parseImageUrls(value: string) {
  return String(value || "")
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function savePost() {
  if (!postForm.value.content?.trim()) return ElMessage.error("请输入动态/文章内容");
  try {
    savingPost.value = true;
    const dto: any = {
      content: postForm.value.content.trim(),
      images: parseImageUrls(postForm.value.imagesText),
      visible: postForm.value.visible !== false,
      activityId: Number(postForm.value.activityId || 0) || null
    };
    if (isPlatformAdmin()) dto.tenantId = postForm.value.tenantId || null;
    await api.post("/admin/community-posts", dto);
    showPostForm.value = false;
    postForm.value = { content: "", imagesText: "", visible: true, tenantId: filters.tenantId };
    await load();
    ElMessage.success("共修动态已发布");
  } catch (error: any) {
    ElMessage.error(error.message || "发布共修动态失败");
  } finally {
    savingPost.value = false;
  }
}

function postStatusText(status: string) {
  if (status === "approved") return "已通过";
  if (status === "rejected") return "已拒绝";
  return "待审核";
}

function postStatusTag(status: string) {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "warning";
}

function syncReviewVisibility() {
  if (postReviewForm.value.status === "rejected") postReviewForm.value.visible = false;
  if (postReviewForm.value.status === "approved") postReviewForm.value.visible = true;
}

function openPostReview(row: any, status: "approved" | "rejected" | "pending", visible?: boolean) {
  postReviewForm.value = {
    id: row.id,
    status,
    visible: visible === undefined ? row.visible !== false : visible,
    reviewRemark: row.reviewRemark || ""
  };
  syncReviewVisibility();
  showPostReviewDialog.value = true;
}

async function submitPostReview() {
  if (!postReviewForm.value.id) return;
  try {
    savingPostReview.value = true;
    const status = postReviewForm.value.status as "approved" | "rejected" | "pending";
    await api.patch("/admin/community-posts/" + postReviewForm.value.id, {
      status,
      visible: postReviewForm.value.visible,
      reviewRemark: postReviewForm.value.reviewRemark?.trim() || ""
    });
    showPostReviewDialog.value = false;
    await load();
    ElMessage.success(status === "approved" ? "动态已通过" : status === "rejected" ? "动态已拒绝" : "动态已更新");
  } catch (error: any) {
    ElMessage.error(error.message || "审核动态失败");
  } finally {
    savingPostReview.value = false;
  }
}

function statusText(status: string) {
  if (status === "approved") return "已通过";
  if (status === "rejected") return "已拒绝";
  return "待审核";
}

async function reviewComment(row: any, status: "approved" | "rejected") {
  try {
    await api.patch("/admin/community-post-comments/" + row.id, { status });
    await load();
    ElMessage.success(status === "approved" ? "评论已通过" : "评论已拒绝");
  } catch (error: any) {
    ElMessage.error(error.message || "审核评论失败");
  }
}

watch(showForm, (visible) => {
  if (visible && !editingActivity.value) activityForm.value.tenantId = filters.tenantId;
});

watch(showCheckinForm, (visible) => {
  if (visible && !editingCheckin.value) checkinForm.value.tenantId = filters.tenantId;
});

watch(showPostForm, (visible) => {
  if (visible) postForm.value.tenantId = filters.tenantId;
});

watch(() => route.query.tenantId, () => {
  const nextTenantId = routeTenantId();
  if (filters.tenantId === nextTenantId) return;
  filters.tenantId = nextTenantId;
  load();
});

onMounted(() => {
  loadTenants();
  load();
});
</script>

<style scoped>
.community-page { padding: 24px; }
.page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; gap: 16px; }
.page-alert { margin-bottom: 16px; }
.tab-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; color: #64748b; font-size: 13px; }
</style>

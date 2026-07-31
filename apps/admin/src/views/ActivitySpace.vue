<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { api } from "../api";

type AnnouncementStatus = "draft" | "published" | "cancelled";

const activities = ref<any[]>([]);
const selectedId = ref<number>();
const announcements = ref<any[]>([]);
const posts = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const editingId = ref<number>();
const form = ref<{ title: string; content: string; status: AnnouncementStatus; pinned: boolean; publishAt: string }>({
  title: "",
  content: "",
  status: "published",
  pinned: false,
  publishAt: ""
});

const submitLabel = computed(() => {
  if (form.value.status === "draft") return editingId.value ? "保存草稿" : "存为草稿";
  if (form.value.status === "cancelled") return "停止发布";
  return editingId.value ? "保存公告" : "发布公告";
});

function resetForm() {
  editingId.value = undefined;
  form.value = { title: "", content: "", status: "published", pinned: false, publishAt: "" };
}

function statusLabel(status: AnnouncementStatus) {
  return { draft: "草稿", published: "已发布", cancelled: "已停止" }[status] || status;
}

function statusType(status: AnnouncementStatus) {
  return { draft: "info", published: "success", cancelled: "danger" }[status] as "info" | "success" | "danger";
}

function formatTime(value?: string) {
  if (!value) return "未设置";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}

async function loadOptions() {
  const result: any = await api.get("/admin/reviews/options");
  activities.value = result?.activities || [];
  if (!selectedId.value) selectedId.value = activities.value[0]?.id;
}

async function load() {
  if (!selectedId.value) return;
  loading.value = true;
  try {
    const [notice, post]: any = await Promise.all([
      api.get(`/admin/activities/${selectedId.value}/space/announcements`),
      api.get("/admin/activity-space-posts", { params: { activityId: selectedId.value, pageSize: 50 } })
    ]);
    announcements.value = notice || [];
    posts.value = post?.items || [];
  } finally {
    loading.value = false;
  }
}

function editAnnouncement(item: any) {
  editingId.value = item.id;
  form.value = {
    title: item.title || "",
    content: item.content || "",
    status: item.status || "draft",
    pinned: Boolean(item.pinned),
    publishAt: item.publishAt ? String(item.publishAt).replace("T", " ").slice(0, 19) : ""
  };
}

async function saveAnnouncement() {
  if (!selectedId.value || !form.value.title.trim() || !form.value.content.trim()) {
    ElMessage.error("请填写公告标题和内容");
    return;
  }

  saving.value = true;
  try {
    const payload = {
      title: form.value.title.trim(),
      content: form.value.content.trim(),
      status: form.value.status,
      pinned: form.value.pinned,
      publishAt: form.value.status === "published" ? form.value.publishAt || null : null
    };
    const url = editingId.value
      ? `/admin/activities/${selectedId.value}/space/announcements/${editingId.value}`
      : `/admin/activities/${selectedId.value}/space/announcements`;
    await (editingId.value ? api.patch(url, payload) : api.post(url, payload));
    ElMessage.success(form.value.status === "draft" ? "草稿已保存" : form.value.status === "cancelled" ? "公告已停止发布" : "活动公告已保存");
    resetForm();
    await load();
  } finally {
    saving.value = false;
  }
}

async function moderate(row: any, status: string) {
  await api.patch(`/admin/activity-space-posts/${row.id}`, { status, adminReply: row.adminReply || "" });
  ElMessage.success(status === "hidden" ? "已隐藏" : "已通过并回复");
  await load();
}

watch(selectedId, () => {
  resetForm();
  void load();
});

onMounted(async () => {
  await loadOptions();
  await load();
});
</script>

<template>
  <section class="activity-space-admin">
    <el-card>
      <template #header>活动空间运营</template>
      <el-select v-model="selectedId" filterable placeholder="选择活动" class="activity-select">
        <el-option v-for="item in activities" :key="item.id" :label="item.title" :value="item.id" />
      </el-select>
    </el-card>

    <el-row :gutter="16">
      <el-col :md="10">
        <el-card>
          <template #header>{{ editingId ? "编辑活动公告" : "发布活动公告" }}</template>
          <el-form label-position="top">
            <el-form-item label="标题">
              <el-input v-model="form.title" maxlength="160" show-word-limit />
            </el-form-item>
            <el-form-item label="内容">
              <el-input v-model="form.content" type="textarea" :rows="7" maxlength="20000" show-word-limit />
            </el-form-item>
            <el-form-item label="发布状态">
              <el-select v-model="form.status" class="form-control">
                <el-option label="草稿（仅后台可见）" value="draft" />
                <el-option label="发布" value="published" />
                <el-option label="停止发布" value="cancelled" :disabled="!editingId" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="form.status === 'published'" label="发布时间">
              <el-date-picker v-model="form.publishAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="留空立即发布" class="form-control" />
              <div class="field-tip">设置未来时间后，报名用户会在指定时间看到这条公告。</div>
            </el-form-item>
            <el-form-item>
              <el-checkbox v-model="form.pinned">置顶</el-checkbox>
            </el-form-item>
            <div class="form-actions">
              <el-button v-if="editingId" @click="resetForm">取消编辑</el-button>
              <el-button type="success" :loading="saving" @click="saveAnnouncement">{{ submitLabel }}</el-button>
            </div>
          </el-form>
        </el-card>
      </el-col>

      <el-col :md="14">
        <el-card v-loading="loading">
          <template #header>活动公告</template>
          <el-empty v-if="!announcements.length && !loading" description="暂无活动公告" />
          <el-timeline v-else>
            <el-timeline-item v-for="item in announcements" :key="item.id" :timestamp="formatTime(item.publishAt || item.createdAt)">
              <div class="announcement-title">
                <strong>{{ item.title }}</strong>
                <span class="announcement-tags">
                  <el-tag size="small" :type="statusType(item.status)">{{ statusLabel(item.status) }}</el-tag>
                  <el-tag v-if="item.pinned" size="small" type="warning">置顶</el-tag>
                </span>
              </div>
              <p>{{ item.content }}</p>
              <el-button link type="primary" @click="editAnnouncement(item)">编辑</el-button>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>

    <el-card>
      <template #header>活动问答审核</template>
      <el-table :data="posts" v-loading="loading">
        <el-table-column prop="activity.title" label="活动" min-width="160" />
        <el-table-column prop="user.nickname" label="参与者" width="110" />
        <el-table-column prop="content" label="内容" min-width="260" />
        <el-table-column prop="reportCount" label="举报" width="80" />
        <el-table-column label="主办方回复" min-width="220">
          <template #default="{ row }">
            <el-input v-model="row.adminReply" type="textarea" :rows="2" maxlength="500" placeholder="可填写回复后通过" />
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" />
        <el-table-column label="操作" width="170">
          <template #default="{ row }">
            <el-button link type="success" @click="moderate(row, 'visible')">{{ row.status === "pending" ? "通过" : "保存回复" }}</el-button>
            <el-button link type="danger" @click="moderate(row, 'hidden')">隐藏</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </section>
</template>

<style scoped>
.activity-space-admin { display: grid; gap: 16px; }
.el-row { margin: 0 !important; }
.el-card { margin-bottom: 0; }
.activity-select { width: min(100%, 360px); }
.form-control { width: 100%; }
.field-tip { margin-top: 6px; color: #7a857f; font-size: 12px; line-height: 1.5; }
.form-actions, .announcement-title, .announcement-tags { display: flex; align-items: center; gap: 8px; }
.announcement-title { justify-content: space-between; }
.announcement-tags { flex-wrap: wrap; }
p { white-space: pre-wrap; color: #526057; line-height: 1.55; }
</style>

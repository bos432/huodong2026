<template>
  <div class="community-page">
    <div class="page-header"><h2>共修管理</h2></div>
    <el-tabs v-model="activeTab">
      <el-tab-pane label="共修活动" name="activities">
        <el-button type="primary" size="small" style="margin-bottom:16px;" @click="showForm = true">新增活动</el-button>
        <el-table :data="activities" stripe style="width:100%;" empty-text="暂无共修活动">
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="title" label="活动名称" min-width="160" />
          <el-table-column label="开始时间" width="170"><template #default="{row}">{{ formatDateTime(row.startTime) }}</template></el-table-column>
          <el-table-column prop="location" label="地点" width="120" />
          <el-table-column prop="registeredCount" label="报名数" width="80" />
          <el-table-column prop="status" label="状态" width="80"><template #default="{row}"><el-tag :type="row.status==='published'?'success':'info'">{{ row.status==='published'?'已发布':'草稿' }}</el-tag></template></el-table-column>
          <el-table-column label="操作" width="200"><template #default="{row}"><el-button size="small" @click="editActivity(row)">编辑</el-button><el-button size="small" type="danger" @click="deleteActivity(row)">删除</el-button></template></el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="打卡任务" name="checkin">
        <el-button type="primary" size="small" style="margin-bottom:16px;" @click="showCheckinForm = true">新增打卡任务</el-button>
        <el-table :data="checkinTasks" stripe style="width:100%;" empty-text="暂无打卡任务">
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="date" label="日期" width="120" />
          <el-table-column prop="title" label="任务名称" min-width="200" />
          <el-table-column prop="completedCount" label="完成数" width="80" />
          <el-table-column label="操作" width="200"><template #default="{row}"><el-button size="small" @click="editCheckin(row)">编辑</el-button><el-button size="small" type="danger" @click="deleteCheckin(row)">删除</el-button></template></el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="学员动态" name="posts">
        <el-table :data="posts" stripe style="width:100%;" empty-text="暂无学员动态">
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="userId" label="用户ID" width="80" />
          <el-table-column prop="content" label="内容" min-width="300" show-overflow-tooltip />
          <el-table-column prop="likes" label="点赞" width="60" />
          <el-table-column prop="createdAt" label="时间" width="160" />
          <el-table-column label="操作" width="100"><template #default="{row}"><el-button size="small" type="danger" @click="deletePost(row)">删除</el-button></template></el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="showForm" :title="editingActivity ? '编辑活动' : '新增活动'" width="500px">
      <el-form :model="activityForm" label-width="80px">
        <el-form-item label="活动名称"><el-input v-model="activityForm.title" /></el-form-item>
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
        <el-form-item label="任务名称"><el-input v-model="checkinForm.title" /></el-form-item>
        <el-form-item label="说明"><el-input v-model="checkinForm.description" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="showCheckinForm = false">取消</el-button><el-button type="primary" :loading="savingCheckin" @click="saveCheckin">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";

const activeTab = ref("activities");
const activities = ref<any[]>([]);
const checkinTasks = ref<any[]>([]);
const posts = ref<any[]>([]);
const showForm = ref(false);
const editingActivity = ref(false);
const activityForm = ref<any>({ title:"", startTime:"", location:"", status:"draft", description:"" });
const savingActivity = ref(false);
const showCheckinForm = ref(false);
const editingCheckin = ref(false);
const checkinForm = ref<any>({ date:"", title:"", description:"" });
const savingCheckin = ref(false);

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-CN", { hour12: false });
}

async function load() {
  try {
    const [actRows, chkRows, postRows] = await Promise.all([
      api.get<any, any[]>("/admin/community-activities"),
      api.get<any, any[]>("/admin/checkin-tasks"),
      api.get<any, any[]>("/admin/community-posts")
    ]);
    activities.value = actRows;
    checkinTasks.value = chkRows;
    posts.value = postRows;
  } catch (error: any) {
    ElMessage.error(error.message || "加载共修数据失败");
  }
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
    if (editingActivity.value && dto.id) {
      await api.patch("/admin/community-activities/" + dto.id, dto);
    } else {
      await api.post("/admin/community-activities", dto);
    }
    showForm.value = false;
    editingActivity.value = false;
    activityForm.value = { title:"", startTime:"", location:"", status:"draft", description:"" };
    await load();
    ElMessage.success("共修活动已保存");
  } catch (error: any) {
    ElMessage.error(error.message || "保存共修活动失败");
  } finally {
    savingActivity.value = false;
  }
}

function editActivity(row: any) {
  activityForm.value = { ...row };
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
  if (!checkinForm.value.title?.trim()) return ElMessage.error("请输入任务名称");
  try {
    savingCheckin.value = true;
    const dto = { ...checkinForm.value };
    dto.title = dto.title.trim();
    dto.description = dto.description?.trim() || null;
    if (typeof dto.date === "object" && dto.date?.toISOString) dto.date = dto.date.toISOString().split("T")[0];
    if (editingCheckin.value && dto.id) {
      await api.patch("/admin/checkin-tasks/" + dto.id, dto);
    } else {
      await api.post("/admin/checkin-tasks", dto);
    }
    showCheckinForm.value = false;
    editingCheckin.value = false;
    checkinForm.value = { date:"", title:"", description:"" };
    await load();
    ElMessage.success("打卡任务已保存");
  } catch (error: any) {
    ElMessage.error(error.message || "保存打卡任务失败");
  } finally {
    savingCheckin.value = false;
  }
}

function editCheckin(row: any) {
  checkinForm.value = { ...row };
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

onMounted(load);
</script>

<style scoped>
.community-page { padding: 24px; }
.page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
</style>

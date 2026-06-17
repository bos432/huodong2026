<template>
  <div class="courses-page">
    <div class="page-header">
      <h2>课程管理</h2>
      <el-button type="primary" @click="showForm = true">新增课程</el-button>
    </div>

    <el-table :data="courses" stripe style="width:100%;" empty-text="暂无课程">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="封面" width="80">
        <template #default><div style="width:48px;height:48px;background:#f0ebe3;border-radius:8px;display:flex;align-items:center;justify-content:center;">📚</div></template>
      </el-table-column>
      <el-table-column prop="title" label="课程名称" min-width="160" />
      <el-table-column prop="teacherName" label="讲师" width="120" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";

const courses = ref<any[]>([]);
const showForm = ref(false);
const editing = ref(false);
const form = ref<any>({ title:"", teacherName:"", price:0, originalPrice:0, status:"draft", description:"" });
const saving = ref(false);
const showChapters = ref(false);
const currentCourse = ref<any>(null);
const chapters = ref<any[]>([]);

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-CN", { hour12: false });
}

async function load() {
  try {
    courses.value = await api.get<any, any[]>("/admin/courses");
  } catch (error: any) {
    ElMessage.error(error.message || "加载课程失败");
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
  form.value = { ...row };
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

onMounted(load);
</script>

<style scoped>
.courses-page { padding: 24px; }
.page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
</style>

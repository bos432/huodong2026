<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";

const loading = ref(false);
const saving = ref(false);
const form = reactive({
  registrationEnabled: true,
  registrationDisabledMessage: "",
  offlinePaymentInstructions: "",
  customerServiceName: "",
  customerServicePhone: "",
  customerServiceWechat: "",
  refundInstructions: "",
  invoiceInstructions: ""
});

function isRegistrationEnabled(value: unknown) {
  return value !== false && value !== 0 && value !== "0";
}

async function load() {
  loading.value = true;
  try {
    const data = await api.get<any, any>("/admin/settings/operation");
    Object.assign(form, {
      registrationEnabled: isRegistrationEnabled(data.registrationEnabled),
      registrationDisabledMessage: data.registrationDisabledMessage || "报名通道暂时关闭，请稍后再试或联系主办方。",
      offlinePaymentInstructions: data.offlinePaymentInstructions || "",
      customerServiceName: data.customerServiceName || "",
      customerServicePhone: data.customerServicePhone || "",
      customerServiceWechat: data.customerServiceWechat || "",
      refundInstructions: data.refundInstructions || "",
      invoiceInstructions: data.invoiceInstructions || ""
    });
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!form.registrationEnabled && !form.registrationDisabledMessage.trim()) return ElMessage.error("请填写暂停报名提示");
  if (!form.offlinePaymentInstructions.trim()) return ElMessage.error("请填写线下付款说明");
  if (!form.refundInstructions.trim()) return ElMessage.error("请填写退款说明");
  await ElMessageBox.confirm(form.registrationEnabled ? "确认保存运营设置？新报名通道将保持开启，用户可继续提交报名。" : "确认暂停新报名？用户仍可浏览活动，但不能提交新的报名。已产生的报名、订单、审核和签到不受影响。", "保存运营设置", { type: form.registrationEnabled ? "info" : "warning", confirmButtonText: "确认保存", cancelButtonText: "再检查一下" });
  saving.value = true;
  try {
    await api.post("/admin/settings/operation", form);
    ElMessage.success("运营设置已保存");
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>运营设置</h2>
      <div class="toolbar-actions">
        <el-button @click="load">刷新</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存设置</el-button>
      </div>
    </div>

    <el-alert class="page-hint" :type="form.registrationEnabled ? 'info' : 'warning'" :closable="false" show-icon title="运营设置会实时影响用户端" :description="form.registrationEnabled ? '当前保存后允许新报名。请确保线下付款、退款和客服说明准确。' : '当前准备暂停新报名。请确认暂停提示足够清楚，避免用户误解。'" />

    <div class="table-card" v-loading="loading">
      <el-form label-width="120px" class="setting-form">
        <el-form-item label="报名通道">
          <div class="switch-row">
            <el-switch v-model="form.registrationEnabled" active-text="允许新报名" inactive-text="暂停新报名" />
            <el-tag :type="form.registrationEnabled ? 'success' : 'warning'" effect="plain">
              {{ form.registrationEnabled ? "用户可正常提交报名" : "用户只能浏览活动，不能提交新报名" }}
            </el-tag>
          </div>
        </el-form-item>
        <el-form-item label="暂停提示" :required="!form.registrationEnabled">
          <el-input
            v-model="form.registrationDisabledMessage"
            type="textarea"
            :rows="3"
            maxlength="300"
            show-word-limit
            placeholder="例如：报名通道暂时关闭，请稍后再试或联系主办方。"
          />
        </el-form-item>
        <el-form-item label="线下付款说明" required>
          <el-input v-model="form.offlinePaymentInstructions" type="textarea" :rows="5" maxlength="1000" show-word-limit />
        </el-form-item>
        <el-form-item label="客服名称">
          <el-input v-model="form.customerServiceName" maxlength="100" placeholder="例如：活动运营客服" />
        </el-form-item>
        <el-form-item label="客服电话">
          <el-input v-model="form.customerServicePhone" maxlength="40" placeholder="例如：13800000000" />
        </el-form-item>
        <el-form-item label="客服微信">
          <el-input v-model="form.customerServiceWechat" maxlength="80" placeholder="例如：activity_service" />
        </el-form-item>
        <el-form-item label="退款说明" required>
          <el-input v-model="form.refundInstructions" type="textarea" :rows="4" maxlength="1000" show-word-limit />
        </el-form-item>
        <el-form-item label="发票说明">
          <el-input v-model="form.invoiceInstructions" type="textarea" :rows="3" maxlength="1000" show-word-limit />
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.toolbar-actions { display: flex; align-items: center; gap: 10px; }
.page-hint { margin-bottom: 14px; }
.setting-form { max-width: 860px; }
.switch-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
</style>

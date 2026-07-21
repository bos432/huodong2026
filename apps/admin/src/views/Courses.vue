<template>
  <div class="courses-page">
    <div class="page-header">
      <h2>课程管理</h2>
      <div class="header-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="平台/全部商家" style="width: 220px" @change="changeTenant">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantOptionLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-button :loading="learningRemindersRunning" @click="runLearningReminders">学习提醒</el-button><el-button @click="openResourceLogs">资源访问审计</el-button><el-button @click="showTeachers = true">{{ teacherScoped ? "讲师资料" : "讲师管理" }}</el-button><el-button type="primary" @click="createCourse">新增课程</el-button>
      </div>
    </div>

    <el-alert v-if="pageError" class="page-alert" type="error" show-icon :closable="false" :title="pageError">
      <template #default><el-button size="small" @click="load">重新加载</el-button></template>
    </el-alert>

    <div class="overview-grid">
      <div v-for="item in overviewCards" :key="item.label" class="overview-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>

    <el-table v-loading="pageLoading" :data="courses" stripe style="width:100%;" empty-text="暂无课程">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="封面" width="80">
        <template #default="{row}">
          <img v-if="row.coverUrl" :src="row.coverUrl" class="course-cover" alt="" />
          <div v-else class="course-cover placeholder">课</div>
        </template>
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
      <el-table-column label="操作" width="310" fixed="right">
        <template #default="{row}">
          <el-button size="small" @click="editCourse(row)">编辑</el-button>
          <el-button size="small" @click="manageChapters(row)">章节</el-button>
          <el-button size="small" @click="manageAssessments(row)">考核</el-button>
          <el-button size="small" @click="openCourseInsights(row)">数据</el-button>
          <el-button size="small" @click="openCourseOperations(row)">运营</el-button>
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
        <el-form-item label="讲师档案"><el-select v-model="form.teacherId" clearable filterable placeholder="选择讲师"><el-option v-for="teacher in teachers" :key="teacher.id" :label="teacher.name" :value="teacher.id" /></el-select></el-form-item>
        <el-form-item label="讲师名称"><el-input v-model="form.teacherName" /></el-form-item>
        <el-form-item label="讲师头像"><el-input v-model="form.teacherAvatar" maxlength="500" /></el-form-item>
        <el-form-item label="封面地址"><el-input v-model="form.coverUrl" maxlength="500" /></el-form-item>
        <el-form-item label="分类ID"><el-input-number v-model="form.categoryId" :min="0" /></el-form-item>
        <el-form-item label="标签"><el-input v-model="form.tagsText" placeholder="用逗号分隔，例如：茶道,入门,共修" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sortOrder" :min="0" :max="9999" /></el-form-item>
        <el-form-item label="评分/热度">
          <div class="inline-fields">
            <el-input-number v-model="form.rating" :min="0" :max="5" :precision="1" />
            <el-input-number v-model="form.reviewCount" :min="0" placeholder="评价数" />
            <el-input-number v-model="form.hotCount" :min="0" placeholder="热度" />
          </div>
        </el-form-item>
        <el-form-item label="价格"><el-input-number v-model="form.price" :min="0" /></el-form-item>
        <el-form-item label="原价"><el-input-number v-model="form.originalPrice" :min="0" /></el-form-item>
        <el-form-item label="准入方式"><el-select v-model="form.accessMode"><el-option label="免费/付费" value="price" /><el-option label="会员专享" value="member" /><el-option label="兑换码专享" value="redeem" /></el-select></el-form-item>
        <el-form-item v-if="form.accessMode === 'member'" label="最低等级"><el-select v-model="form.requiredMemberLevelId" clearable placeholder="按等级权益判断"><el-option v-for="level in courseMemberLevels" :key="level.id" :label="level.name" :value="level.id" /></el-select></el-form-item>
        <el-form-item label="完成阈值"><el-input-number v-model="form.completionThreshold" :min="1" :max="100" /><span class="form-hint">%</span></el-form-item>
        <el-form-item label="状态"><el-select v-model="form.status"><el-option label="草稿" value="draft" /><el-option label="已发布" value="published" /></el-select></el-form-item>
        <el-form-item label="课程介绍"><el-input v-model="form.description" type="textarea" :rows="4" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="showForm = false">取消</el-button><el-button type="primary" :loading="saving" @click="saveCourse">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="showChapters" :title="'章节管理 - ' + (currentCourse?.title || '')" width="700px">
      <el-button type="primary" size="small" style="margin-bottom:16px;" @click="addChapter">新增章节</el-button>
      <div v-for="(ch, ci) in chapters" :key="ci" style="border:1px solid #eee;border-radius:8px;padding:12px;margin-bottom:8px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div class="chapter-title-row">
            <el-input-number v-model="ch.sortOrder" :min="0" size="small" />
            <el-input v-model="ch.title" style="width:300px;" placeholder="章节名称" />
          </div>
          <div>
            <el-button size="small" @click="moveChapter(ci, -1)">上移</el-button>
            <el-button size="small" @click="moveChapter(ci, 1)">下移</el-button>
            <el-button size="small" @click="addLesson(ch)">+课时</el-button>
            <el-button size="small" type="danger" @click="deleteChapter(ci)">删除</el-button>
          </div>
        </div>
        <div v-for="(ls, li) in ch.lessons" :key="li" class="lesson-editor">
          <el-input-number v-model="ls.sortOrder" :min="0" size="small" style="width:90px;" />
          <el-input v-model="ls.title" style="flex:1;" placeholder="课时名称" />
          <el-input v-model="ls.duration" style="width:80px;" placeholder="时长" />
          <el-select v-model="ls.contentType" style="width:110px"><el-option label="视频" value="video" /><el-option label="音频" value="audio" /><el-option label="图文" value="article" /><el-option label="附件" value="attachment" /></el-select>
          <el-select v-model="ls.status" style="width:100px"><el-option label="已发布" value="published" /><el-option label="草稿" value="draft" /></el-select>
          <el-switch v-model="ls.isFree" active-text="试看" />
          <el-button size="small" @click="moveLesson(ch, li, -1)">上移</el-button>
          <el-button size="small" @click="moveLesson(ch, li, 1)">下移</el-button>
          <el-button size="small" type="danger" @click="ch.lessons.splice(li,1)">×</el-button>
          <el-input v-if="ls.contentType === 'video'" v-model="ls.videoUrl" class="resource-input" placeholder="视频资源地址" />
          <el-upload v-if="ls.contentType === 'video'" :show-file-list="false" :before-upload="(file: File) => uploadLessonResource(file, ls, 'video')"><el-button>上传视频</el-button></el-upload>
          <el-input v-if="ls.contentType === 'audio'" v-model="ls.audioUrl" class="resource-input" placeholder="音频资源地址" />
          <el-upload v-if="ls.contentType === 'audio'" :show-file-list="false" :before-upload="(file: File) => uploadLessonResource(file, ls, 'audio')"><el-button>上传音频</el-button></el-upload>
          <el-input v-if="ls.contentType === 'attachment'" v-model="ls.attachmentUrl" class="resource-input" placeholder="附件资源地址" />
          <el-input v-if="ls.contentType === 'attachment'" v-model="ls.attachmentName" style="width:180px" placeholder="附件名称" />
          <el-upload v-if="ls.contentType === 'attachment'" :show-file-list="false" :before-upload="(file: File) => uploadLessonResource(file, ls, 'attachment')"><el-button>上传附件</el-button></el-upload>
          <el-input v-if="ls.contentType === 'article'" v-model="ls.content" type="textarea" :rows="2" class="resource-input" placeholder="图文正文" />
        </div>
      </div>
      <template #footer><el-button @click="showChapters = false">关闭</el-button><el-button type="primary" @click="saveChapters">保存章节</el-button></template>
    </el-dialog>

    <el-dialog v-model="showTeachers" :title="teacherScoped ? '讲师资料' : '讲师管理'" width="760px">
      <el-button v-if="!teacherScoped" type="primary" size="small" class="teacher-add" @click="editTeacher()">新增讲师</el-button>
      <el-table :data="teachers" stripe empty-text="暂无讲师"><el-table-column prop="name" label="姓名" width="130" /><el-table-column prop="title" label="头衔" min-width="150" /><el-table-column label="后台账号" min-width="170"><template #default="{ row }">{{ row.adminUser?.username || "未绑定" }}</template></el-table-column><el-table-column prop="status" label="状态" width="100" /><el-table-column prop="bio" label="简介" min-width="220" show-overflow-tooltip /><el-table-column label="操作" width="130"><template #default="{ row }"><el-button link type="primary" @click="editTeacher(row)">编辑</el-button><el-button v-if="!teacherScoped" link type="danger" @click="removeTeacher(row)">删除</el-button></template></el-table-column></el-table>
    </el-dialog>
    <el-dialog v-model="showTeacherForm" :title="teacherForm.id ? '编辑讲师' : '新增讲师'" width="560px"><el-form :model="teacherForm" label-width="90px"><el-form-item label="姓名"><el-input v-model="teacherForm.name" maxlength="80" /></el-form-item><el-form-item label="后台账号"><el-select v-model="teacherForm.adminUserId" clearable filterable :disabled="teacherScoped" placeholder="选择仅本人课程账号"><el-option v-for="account in teacherAccountOptions" :key="account.id" :label="account.linkedTeacher && account.linkedTeacher.id !== teacherForm.id ? `${account.username}（已绑定 ${account.linkedTeacher.name}）` : account.username" :value="account.id" :disabled="Boolean(account.linkedTeacher && account.linkedTeacher.id !== teacherForm.id)" /></el-select></el-form-item><el-form-item label="头衔"><el-input v-model="teacherForm.title" maxlength="120" /></el-form-item><el-form-item label="头像"><el-input v-model="teacherForm.avatarUrl" maxlength="500" /></el-form-item><el-form-item label="状态"><el-select v-model="teacherForm.status"><el-option label="启用" value="active" /><el-option label="停用" value="disabled" /></el-select></el-form-item><el-form-item label="简介"><el-input v-model="teacherForm.bio" type="textarea" :rows="4" maxlength="5000" show-word-limit /></el-form-item></el-form><template #footer><el-button @click="showTeacherForm=false">取消</el-button><el-button type="primary" :loading="teacherSaving" @click="saveTeacher">保存</el-button></template></el-dialog>
    <el-dialog v-model="showResourceLogs" title="课程资源访问审计" width="980px"><el-alert v-if="resourceLogsError" class="operations-alert" type="error" show-icon :closable="false" :title="resourceLogsError"><template #default><el-button size="small" @click="openResourceLogs">重新加载</el-button></template></el-alert><el-table v-loading="resourceLogsLoading" :data="resourceLogs" stripe max-height="560" empty-text="暂无资源访问记录"><el-table-column prop="course.title" label="课程" min-width="180" /><el-table-column prop="lessonId" label="课时ID" width="90" /><el-table-column prop="userId" label="用户ID" width="90" /><el-table-column prop="resourceType" label="资源类型" width="100" /><el-table-column prop="clientIp" label="IP" width="140" /><el-table-column prop="userAgent" label="终端" min-width="220" show-overflow-tooltip /><el-table-column label="访问时间" width="180"><template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template></el-table-column></el-table></el-dialog>
    <el-dialog v-model="showAssessments" :title="`课程考核 - ${assessmentCourse?.title || ''}`" width="1080px"><el-alert v-if="assessmentError" class="operations-alert" type="error" show-icon :closable="false" :title="assessmentError"><template #default><el-button size="small" @click="reloadAssessments">重新加载</el-button></template></el-alert><div class="assessment-toolbar"><el-button type="primary" :disabled="assessmentLoading" @click="editAssessment()">新增考核</el-button><el-button :loading="attemptsLoading" @click="loadAttempts">提交记录</el-button><el-button :loading="retakeGranting" :disabled="assessmentLoading" @click="grantRetake">补考授权</el-button><el-button v-if="canExportCourse" :loading="attemptExporting" @click="exportAttempts">导出成绩</el-button></div><el-table v-loading="assessmentLoading" :data="assessments" stripe><el-table-column prop="title" label="名称" min-width="180" /><el-table-column prop="type" label="类型" width="90" /><el-table-column prop="passScore" label="通过线%" width="100" /><el-table-column prop="maxAttempts" label="次数" width="80" /><el-table-column prop="status" label="状态" width="100" /><el-table-column label="截止时间" width="170"><template #default="{row}">{{ formatDateTime(row.dueAt) }}</template></el-table-column><el-table-column label="操作" width="170"><template #default="{row}"><el-button link type="primary" :disabled="assessmentLoading" @click="editAssessment(row)">编辑</el-button><el-button link :disabled="assessmentLoading" @click="manageQuestions(row)">题目</el-button></template></el-table-column></el-table></el-dialog>
    <el-dialog v-model="showAssessmentForm" title="考核设置" width="620px"><el-form :model="assessmentForm" label-width="100px"><el-form-item label="名称"><el-input v-model="assessmentForm.title" maxlength="160" /></el-form-item><el-form-item label="类型"><el-select v-model="assessmentForm.type"><el-option label="测验" value="quiz" /><el-option label="作业" value="assignment" /></el-select></el-form-item><el-form-item label="通过线"><el-input-number v-model="assessmentForm.passScore" :min="1" :max="100" />%</el-form-item><el-form-item label="最大次数"><el-input-number v-model="assessmentForm.maxAttempts" :min="1" :max="20" /></el-form-item><el-form-item label="截止时间"><el-date-picker v-model="assessmentForm.dueAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item><el-form-item label="允许逾期"><el-switch v-model="assessmentForm.allowLateSubmission" /></el-form-item><el-form-item label="状态"><el-select v-model="assessmentForm.status"><el-option label="草稿" value="draft" /><el-option label="发布" value="published" /><el-option label="关闭" value="closed" /></el-select></el-form-item><el-form-item label="说明"><el-input v-model="assessmentForm.description" type="textarea" maxlength="5000" show-word-limit /></el-form-item></el-form><template #footer><el-button @click="showAssessmentForm=false">取消</el-button><el-button type="primary" :loading="assessmentSaving" @click="saveAssessment">保存</el-button></template></el-dialog>
    <el-dialog v-model="showQuestions" :title="`题目管理 - ${currentAssessment?.title || ''}`" width="1080px"><el-alert v-if="questionError" class="operations-alert" type="error" show-icon :closable="false" :title="questionError"><template #default><el-button size="small" @click="reloadQuestions">重新加载</el-button></template></el-alert><el-button type="primary" class="teacher-add" :disabled="questionLoading" @click="editQuestion()">新增题目</el-button><el-table v-loading="questionLoading" :data="questions" stripe><el-table-column prop="sortOrder" label="排序" width="70" /><el-table-column prop="type" label="类型" width="90" /><el-table-column prop="stem" label="题干" min-width="280" show-overflow-tooltip /><el-table-column prop="score" label="分值" width="80" /><el-table-column label="操作" width="130"><template #default="{row}"><el-button link type="primary" :disabled="questionActionId!==null" @click="editQuestion(row)">编辑</el-button><el-button link type="danger" :loading="questionActionId===row.id" :disabled="questionActionId!==null" @click="removeQuestion(row)">删除</el-button></template></el-table-column></el-table></el-dialog>
    <el-dialog v-model="showQuestionForm" title="题目编辑" width="720px"><el-form :model="questionForm" label-width="90px"><el-form-item label="类型"><el-select v-model="questionForm.type"><el-option label="单选" value="single" /><el-option label="多选" value="multiple" /><el-option label="判断" value="boolean" /><el-option label="问答" value="essay" /></el-select></el-form-item><el-form-item label="题干"><el-input v-model="questionForm.stem" type="textarea" maxlength="10000" show-word-limit /></el-form-item><el-form-item v-if="questionForm.type !== 'essay'" label="选项"><el-input v-model="questionForm.optionsText" type="textarea" placeholder="每行一个选项，例如 A=选项内容" /></el-form-item><el-form-item v-if="questionForm.type !== 'essay'" label="答案"><el-input v-model="questionForm.correctText" placeholder="多个答案用逗号分隔" /></el-form-item><el-form-item label="分值"><el-input-number v-model="questionForm.score" :min="0" /></el-form-item><el-form-item label="排序"><el-input-number v-model="questionForm.sortOrder" :min="0" /></el-form-item><el-form-item label="解析"><el-input v-model="questionForm.explanation" type="textarea" maxlength="5000" show-word-limit /></el-form-item></el-form><template #footer><el-button @click="showQuestionForm=false">取消</el-button><el-button type="primary" :loading="questionSaving" @click="saveQuestion">保存</el-button></template></el-dialog>
    <el-dialog v-model="showAttempts" title="考核提交记录" width="1080px"><el-alert v-if="attemptsError" class="operations-alert" type="error" show-icon :closable="false" :title="attemptsError"><template #default><el-button size="small" @click="loadAttempts">重新加载</el-button></template></el-alert><el-table v-loading="attemptsLoading" :data="attempts" stripe max-height="560"><el-table-column prop="attempt_userId" label="用户ID" width="90" /><el-table-column prop="assessment_title" label="考核" min-width="180" /><el-table-column prop="attempt_attemptNo" label="次数" width="70" /><el-table-column prop="attempt_status" label="状态" width="110" /><el-table-column prop="attempt_totalScore" label="得分" width="80" /><el-table-column label="提交时间" width="170"><template #default="{row}">{{ formatDateTime(row.attempt_submittedAt) }}</template></el-table-column><el-table-column label="操作" width="130"><template #default="{row}"><el-button link type="primary" :loading="attemptDetailId===row.attempt_id" :disabled="attemptDetailId!==null" @click="quickReview(row,'grade')">批改</el-button><el-button link type="warning" :disabled="attemptDetailId!==null" @click="quickReview(row,'return')">退回</el-button></template></el-table-column></el-table></el-dialog>
    <el-dialog v-model="showReview" title="逐题批改" width="900px"><div v-if="reviewDetail"><div v-for="item in reviewDetail.questions" :key="item.id" class="review-question"><strong>{{ item.stem }}（{{ item.score }}分）</strong><div class="review-answer">学员答案：{{ item.answer?.essayAnswer || (item.answer?.answer || []).join('、') || '未作答' }}</div><div v-if="item.correctAnswer" class="review-standard">标准答案：{{ item.correctAnswer.join('、') }}</div><div v-if="item.type==='essay'" class="review-fields"><el-input-number v-model="reviewScores[item.id].score" :min="0" :max="Number(item.score)" /><el-input v-model="reviewScores[item.id].feedback" placeholder="逐题反馈" /></div><el-tag v-else :type="item.answer?.correct?'success':'danger'">{{ item.answer?.correct?'正确':'错误' }} · {{ item.answer?.score || 0 }}分</el-tag></div><el-input v-model="reviewRemark" type="textarea" :rows="3" placeholder="总评" /></div><template #footer><el-button type="warning" :loading="reviewSubmitting" :disabled="reviewSubmitting" @click="submitReview('return')">退回补交</el-button><el-button type="primary" :loading="reviewSubmitting" :disabled="reviewSubmitting" @click="submitReview('grade')">完成批改</el-button></template></el-dialog>

    <el-dialog v-model="showCourseOperations" :title="`课程运营 - ${operationsCourse?.title || ''}`" width="1100px"><el-alert v-if="courseOperationsError" class="operations-alert" type="warning" show-icon :closable="false" :title="courseOperationsError"><template #default><el-button size="small" @click="loadCourseOperations">重新同步</el-button></template></el-alert><el-tabs v-model="operationsTab" v-loading="courseOperationsLoading"><el-tab-pane label="评价" name="reviews"><el-table :data="courseReviews"><el-table-column prop="userId" label="用户ID" width="90" /><el-table-column prop="rating" label="评分" width="70" /><el-table-column prop="content" label="评价" min-width="300" /><el-table-column prop="status" label="状态" width="100" /><el-table-column label="操作" width="180"><template #default="{row}"><el-button link type="success" :loading="courseOperationActionKey===`review:${row.id}`" :disabled="courseOperationActionKey!==''" @click="moderateReview(row,'approved')">通过</el-button><el-button link type="danger" :disabled="courseOperationActionKey!==''" @click="moderateReview(row,'rejected')">拒绝</el-button><el-button link :disabled="courseOperationActionKey!==''" @click="replyReview(row)">回复</el-button></template></el-table-column></el-table></el-tab-pane><el-tab-pane label="答疑" name="qa"><el-table :data="courseQa"><el-table-column prop="title" label="问题" min-width="220" /><el-table-column prop="content" label="描述" min-width="280" /><el-table-column prop="answer" label="答复" min-width="280" /><el-table-column label="操作" width="90"><template #default="{row}"><el-button link type="primary" :loading="courseOperationActionKey===`qa:${row.id}`" :disabled="courseOperationActionKey!==''" @click="answerQa(row)">答复</el-button></template></el-table-column></el-table></el-tab-pane><el-tab-pane label="公告" name="announcements"><el-button type="primary" class="teacher-add" @click="editCourseAnnouncement()">新增公告</el-button><el-table :data="courseAnnouncements"><el-table-column prop="title" label="标题" min-width="260" /><el-table-column prop="status" label="状态" width="100" /><el-table-column label="发布时间" width="180"><template #default="{row}">{{ formatDateTime(row.publishAt) }}</template></el-table-column><el-table-column label="操作" width="90"><template #default="{row}"><el-button link @click="editCourseAnnouncement(row)">编辑</el-button></template></el-table-column></el-table></el-tab-pane><el-tab-pane label="证书" name="certificate"><el-form :model="certificateTemplate" label-width="120px"><el-form-item label="证书名称"><el-input v-model="certificateTemplate.name" /></el-form-item><el-form-item label="发证单位"><el-input v-model="certificateTemplate.issuerName" /></el-form-item><el-form-item label="完成阈值"><el-input-number v-model="certificateTemplate.completionThreshold" :min="1" :max="100" />%</el-form-item><el-form-item label="要求考核通过"><el-switch v-model="certificateTemplate.requireAssessmentPass" /></el-form-item><el-form-item label="启用"><el-switch v-model="certificateTemplate.enabled" /></el-form-item><el-button type="primary" :loading="certificateSaving" @click="saveCertificateTemplate">保存模板</el-button></el-form></el-tab-pane><el-tab-pane label="退款" name="refunds"><el-table :data="courseRefunds"><el-table-column prop="refundNo" label="退款单号" min-width="180" /><el-table-column prop="order.orderNo" label="订单号" min-width="180" /><el-table-column label="金额" width="100"><template #default="{row}">¥{{ (Number(row.amountFen||0)/100).toFixed(2) }}</template></el-table-column><el-table-column prop="reason" label="原因" min-width="220" /><el-table-column prop="status" label="状态" width="100" /><el-table-column label="操作" width="130"><template #default="{row}"><el-button v-if="row.status==='pending'" link type="success" :loading="courseRefundActionId===row.id" :disabled="courseRefundActionId!==null" @click="reviewCourseRefund(row,'approve')">通过</el-button><el-button v-if="row.status==='pending'" link type="danger" :disabled="courseRefundActionId!==null" @click="reviewCourseRefund(row,'reject')">拒绝</el-button></template></el-table-column></el-table></el-tab-pane></el-tabs></el-dialog>
    <el-dialog v-model="showCourseAnnouncementForm" title="课程公告" width="640px"><el-form :model="courseAnnouncementForm" label-width="90px"><el-form-item label="标题"><el-input v-model="courseAnnouncementForm.title" /></el-form-item><el-form-item label="内容"><el-input v-model="courseAnnouncementForm.content" type="textarea" :rows="6" /></el-form-item><el-form-item label="状态"><el-select v-model="courseAnnouncementForm.status"><el-option label="草稿" value="draft" /><el-option label="发布" value="published" /><el-option label="取消" value="cancelled" /></el-select></el-form-item><el-form-item label="发布时间"><el-date-picker v-model="courseAnnouncementForm.publishAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item><el-form-item label="通知学员"><el-switch v-model="courseAnnouncementForm.notifyLearners" /></el-form-item></el-form><template #footer><el-button @click="showCourseAnnouncementForm=false">取消</el-button><el-button type="primary" :loading="courseAnnouncementSaving" @click="saveCourseAnnouncement">保存</el-button></template></el-dialog>

    <el-dialog v-model="showCourseInsights" class="course-insights-dialog" :title="`课程数据 - ${insightCourse?.title || ''}`" width="1180px">
      <el-alert v-if="courseInsightsError" class="operations-alert" type="error" show-icon :closable="false" :title="courseInsightsError"><template #default><el-button size="small" @click="reloadCourseInsights">重新加载</el-button></template></el-alert>
      <div class="insight-toolbar"><span>完成阈值 {{ courseInsightSummary?.course?.completionThreshold || insightCourse?.completionThreshold || 100 }}%</span><el-button v-if="canExportCourse" :loading="courseInsightsExporting" @click="exportCourseInsights">导出经营与学员数据</el-button></div>
      <div v-loading="courseInsightsLoading" class="insight-grid">
        <div v-for="item in courseInsightCards" :key="item.label" class="insight-metric"><span>{{ item.label }}</span><strong>{{ item.value }}</strong></div>
      </div>
      <div class="insight-filters">
        <el-select v-model="courseLearnerFilters.status" clearable placeholder="全部学习状态" @change="resetAndLoadCourseLearners"><el-option label="未开始" value="not_started" /><el-option label="学习中" value="in_progress" /><el-option label="已完课" value="completed" /></el-select>
        <el-select v-model="courseLearnerFilters.sortBy" @change="resetAndLoadCourseLearners"><el-option label="最近学习" value="lastLearnedAt" /><el-option label="获得权限" value="grantedAt" /><el-option label="学习进度" value="progress" /></el-select>
        <el-select v-model="courseLearnerFilters.sortOrder" @change="resetAndLoadCourseLearners"><el-option label="降序" value="desc" /><el-option label="升序" value="asc" /></el-select>
        <el-input v-model="courseLearnerFilters.keyword" clearable placeholder="用户ID/昵称/手机号" @keyup.enter="resetAndLoadCourseLearners" @clear="resetAndLoadCourseLearners" />
        <el-button :loading="courseLearnersLoading" @click="resetAndLoadCourseLearners">查询</el-button>
      </div>
      <el-table v-loading="courseLearnersLoading" :data="courseLearners" stripe empty-text="暂无课程学员">
        <el-table-column label="学员" min-width="170"><template #default="{row}"><div>{{ row.user?.nickname || `用户 ${row.user?.id}` }}</div><small>{{ maskPhone(row.user?.phone) }} · ID {{ row.user?.id }}</small></template></el-table-column>
        <el-table-column label="状态" width="100"><template #default="{row}"><el-tag :type="learnerStatusType(row.completionStatus)">{{ learnerStatusLabel(row.completionStatus) }}</el-tag></template></el-table-column>
        <el-table-column label="进度" width="170"><template #default="{row}"><el-progress :percentage="Number(row.progress || 0)" :stroke-width="8" /></template></el-table-column>
        <el-table-column label="毛额/退款/净额" width="180"><template #default="{row}"><div>{{ moneyFen(row.grossAmountFen) }} / {{ moneyFen(row.refundAmountFen) }}</div><small>净额 {{ moneyFen(row.netAmountFen) }}</small></template></el-table-column>
        <el-table-column label="订单" width="100"><template #default="{row}">{{ row.paidOrderCount }}/{{ row.orderCount }}</template></el-table-column>
        <el-table-column label="证书" min-width="170"><template #default="{row}"><span v-if="row.certificate">{{ row.certificate.certificateNo || "已生成" }}<small>{{ row.certificate.status === "active" ? "有效" : "已撤销" }}</small></span><span v-else>-</span></template></el-table-column>
        <el-table-column label="获得权限" width="170"><template #default="{row}">{{ formatDateTime(row.grantedAt) }}</template></el-table-column>
        <el-table-column label="最近学习" width="170"><template #default="{row}">{{ formatDateTime(row.lastLearnedAt) }}</template></el-table-column>
        <el-table-column label="完课时间" width="170"><template #default="{row}">{{ formatDateTime(row.completedAt) }}</template></el-table-column>
      </el-table>
      <div class="pagination"><el-pagination v-model:current-page="courseLearnerFilters.page" v-model:page-size="courseLearnerFilters.pageSize" :page-sizes="[10,20,50,100]" layout="total, sizes, prev, pager, next" :total="courseLearnerTotal" @size-change="loadCourseLearners" @current-change="loadCourseLearners" /></div>
    </el-dialog>

    <template v-if="canViewCourseOrders">
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
          <div>{{ maskPhone(row.user?.phone) }}</div>
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
          <el-button v-if="canManageCourseOrders" size="small" type="success" :disabled="!canConfirmCourseOrder(row)" @click="confirmCourseOrder(row)">确认收款</el-button>
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { api, downloadFile } from "../api";
import { hasPermission, isPlatformAdmin } from "../permissions";
import { maskPhone } from "../privacy";

const route = useRoute();
const router = useRouter();
const courses = ref<any[]>([]);
const teachers = ref<any[]>([]);
const teacherAccountOptions = ref<any[]>([]);
const teacherScoped = hasPermission("course.teacher_scope");
const canExportCourse = hasPermission("course.export");
const canViewCourseOrders = hasPermission("course_order.view");
const canManageCourseOrders = hasPermission("course_order.manage");
const memberLevels = ref<any[]>([]);
const showTeachers = ref(false);
const showTeacherForm = ref(false);
const teacherForm = ref<any>({ name:"", title:"", avatarUrl:"", bio:"", status:"active", adminUserId: undefined });
const teacherSaving = ref(false);
const showResourceLogs = ref(false);
const resourceLogsLoading = ref(false);
const resourceLogsError = ref("");
const resourceLogs = ref<any[]>([]);
const showAssessments=ref(false),showAssessmentForm=ref(false),showQuestions=ref(false),showQuestionForm=ref(false),showAttempts=ref(false);
const assessmentCourse=ref<any>(),currentAssessment=ref<any>(),assessments=ref<any[]>([]),questions=ref<any[]>([]),attempts=ref<any[]>([]);
const assessmentForm=ref<any>({}),questionForm=ref<any>({});
const assessmentLoading=ref(false),assessmentSaving=ref(false),assessmentError=ref("");
const questionLoading=ref(false),questionSaving=ref(false),questionError=ref(""),questionActionId=ref<number|null>(null);
const attemptsLoading=ref(false),attemptsError=ref(""),attemptDetailId=ref<number|null>(null),retakeGranting=ref(false);
const showReview=ref(false),reviewDetail=ref<any>(),reviewRemark=ref("");const reviewScores=reactive<Record<number,{score:number;feedback:string}>>({});
const showCourseOperations=ref(false),operationsCourse=ref<any>(),operationsTab=ref("reviews"),courseReviews=ref<any[]>([]),courseQa=ref<any[]>([]),courseAnnouncements=ref<any[]>([]),courseRefunds=ref<any[]>([]);const certificateTemplate=ref<any>({name:"",issuerName:"",completionThreshold:100,requireAssessmentPass:false,enabled:true});const showCourseAnnouncementForm=ref(false),courseAnnouncementForm=ref<any>({});
const courseOperationsLoading=ref(false),courseOperationsError=ref(""),courseAnnouncementSaving=ref(false),learningRemindersRunning=ref(false);
const attemptExporting=ref(false),reviewSubmitting=ref(false),certificateSaving=ref(false),courseRefundActionId=ref<number|null>(null);
const courseOperationActionKey=ref("");
const canManageCourseRefunds=hasPermission("order.refund");
const showCourseInsights=ref(false),insightCourse=ref<any>(),courseInsightSummary=ref<any>(),courseLearners=ref<any[]>([]);
const courseInsightsLoading=ref(false),courseLearnersLoading=ref(false),courseInsightsExporting=ref(false),courseInsightsError=ref("");
const courseLearnerTotal=ref(0);
const courseLearnerFilters=reactive({status:"",keyword:"",sortBy:"lastLearnedAt",sortOrder:"desc",page:1,pageSize:20});
const tenants = ref<any[]>([]);
const overview = ref<any>({ kpis: {}, todos: [], alerts: [] });
const pageLoading = ref(false);
const pageError = ref("");
const showForm = ref(false);
const editing = ref(false);
const emptyCourseForm = () => ({ title:"", teacherId: undefined, teacherName:"", teacherAvatar:"", coverUrl:"", categoryId: undefined, tagsText:"", sortOrder:0, rating:0, reviewCount:0, hotCount:0, price:0, originalPrice:0, accessMode:"price", requiredMemberLevelId:undefined, completionThreshold:100, status:"draft", description:"" });
const form = ref<any>(emptyCourseForm());
const courseMemberLevels = computed(() => {
  if (!isPlatformAdmin()) return memberLevels.value;
  const tenantId = Number(form.value.tenantId || 0);
  return memberLevels.value.filter((level) => tenantId ? Number(level.tenant?.id || level.tenantId || 0) === tenantId : !(level.tenant?.id || level.tenantId));
});
watch(() => form.value.tenantId, () => {
  if (form.value.requiredMemberLevelId && !courseMemberLevels.value.some((level) => Number(level.id) === Number(form.value.requiredMemberLevelId))) form.value.requiredMemberLevelId = undefined;
});
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
const overviewCards = computed(() => {
  const kpis = overview.value?.kpis || {};
  return [
    { label: "已发布", value: kpis.published || 0 },
    { label: "草稿", value: kpis.draft || 0 },
    { label: "课程订单", value: kpis.totalOrders || 0 },
    { label: "待确认收款", value: kpis.pendingOfflineOrders || 0 },
    { label: "付费课程", value: kpis.paidCourses || 0 },
    { label: "免费课程", value: kpis.freeCourses || 0 },
    { label: "课程毛额", value: moneyFen(kpis.grossAmountFen) },
    { label: "已退金额", value: moneyFen(kpis.refundAmountFen) },
    { label: "课程净额", value: moneyFen(kpis.netAmountFen) }
  ];
});
const courseInsightCards = computed(() => {
  const kpis = courseInsightSummary.value?.kpis || {};
  return [
    { label:"课程订单", value:kpis.orderCount || 0 }, { label:"有效支付", value:kpis.paidOrderCount || 0 }, { label:"课程毛额", value:moneyFen(kpis.grossAmountFen) },
    { label:"退款金额", value:moneyFen(kpis.refundAmountFen) }, { label:"课程净额", value:moneyFen(kpis.netAmountFen) }, { label:"课程学员", value:kpis.learnerCount || 0 },
    { label:"已完课", value:kpis.completedLearnerCount || 0 }, { label:"完课率", value:`${Number(kpis.completionRate || 0).toFixed(2)}%` }, { label:"平均进度", value:`${Number(kpis.averageProgress || 0).toFixed(2)}%` },
    { label:"有效证书", value:kpis.activeCertificateCount || 0 }
  ];
});

function moneyFen(value: unknown) {
  return `¥${(Number(value || 0) / 100).toFixed(2)}`;
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-CN", { hour12: false });
}

async function load() {
  pageLoading.value = true;
  pageError.value = "";
  try {
    const params = { tenantId: isPlatformAdmin() ? filters.tenantId || undefined : undefined };
    const [overviewData, courseRows, teacherRows, levelRows, teacherAccounts] = await Promise.all([
      api.get<any, any>("/admin/courses/overview", { params }),
      api.get<any, any[]>("/admin/courses", { params }), api.get<any, any[]>("/admin/course-teachers", { params }), api.get<any, any[]>("/admin/course-member-level-options", { params }), api.get<any, any[]>("/admin/course-teacher-account-options", { params })
    ]);
    overview.value = overviewData || { kpis: {}, todos: [], alerts: [] };
    courses.value = courseRows || [];
    teachers.value = teacherRows || [];
    memberLevels.value = levelRows || [];
    teacherAccountOptions.value = teacherAccounts || [];
  } catch (error: any) {
    pageError.value = error.message || "课程数据加载失败";
    ElMessage.error(error.message || "加载课程失败");
  } finally {
    pageLoading.value = false;
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
  if (canViewCourseOrders) loadOrders();
}

function createCourse() {
  editing.value = false;
  form.value = { ...emptyCourseForm(), tenantId: filters.tenantId };
  showForm.value = true;
}

function parseTags(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 10);
  return String(value || "").split(/[,，、\s]+/).map((item) => item.trim()).filter(Boolean).slice(0, 10);
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
      teacherAvatar: form.value.teacherAvatar?.trim() || null,
      coverUrl: form.value.coverUrl?.trim() || null,
      categoryId: Number(form.value.categoryId || 0) || null,
      tags: parseTags(form.value.tagsText ?? form.value.tags),
      sortOrder: Number(form.value.sortOrder || 0),
      rating: Number(form.value.rating || 0),
      reviewCount: Number(form.value.reviewCount || 0),
      hotCount: Number(form.value.hotCount || 0),
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
    form.value = emptyCourseForm();
    await load();
    ElMessage.success("课程已保存");
  } catch (error: any) {
    ElMessage.error(error.message || "保存课程失败");
  } finally {
    saving.value = false;
  }
}

function editCourse(row: any) {
  form.value = { ...row, teacherId: row.teacher?.id || undefined, requiredMemberLevelId: row.requiredMemberLevel?.id || undefined, tagsText: Array.isArray(row.tags) ? row.tags.join(",") : "", tenantId: row.tenant?.id };
  editing.value = true;
  showForm.value = true;
}

function learnerStatusLabel(value?: string) { return value === "completed" ? "已完课" : value === "in_progress" ? "学习中" : "未开始"; }
function learnerStatusType(value?: string) { return value === "completed" ? "success" : value === "in_progress" ? "warning" : "info"; }

async function openCourseInsights(course:any){
  insightCourse.value=course;showCourseInsights.value=true;courseLearnerFilters.status="";courseLearnerFilters.keyword="";courseLearnerFilters.sortBy="lastLearnedAt";courseLearnerFilters.sortOrder="desc";courseLearnerFilters.page=1;
  await reloadCourseInsights();
}
async function reloadCourseInsights(){
  if(!insightCourse.value?.id)return;
  courseInsightsLoading.value=true;courseInsightsError.value="";
  try { const [summary]=await Promise.all([api.get<any,any>(`/admin/courses/${insightCourse.value.id}/insights`),loadCourseLearners()]);courseInsightSummary.value=summary; }
  catch(error:any){courseInsightsError.value=error.message||"课程数据加载失败";ElMessage.error(courseInsightsError.value);}
  finally{courseInsightsLoading.value=false;}
}
async function loadCourseLearners(){
  if(!insightCourse.value?.id||courseLearnersLoading.value)return;
  courseLearnersLoading.value=true;
  try { const result=await api.get<any,any>(`/admin/courses/${insightCourse.value.id}/learners`,{params:{status:courseLearnerFilters.status||undefined,keyword:courseLearnerFilters.keyword.trim()||undefined,sortBy:courseLearnerFilters.sortBy,sortOrder:courseLearnerFilters.sortOrder,page:courseLearnerFilters.page,pageSize:courseLearnerFilters.pageSize}});courseLearners.value=result.items||[];courseLearnerTotal.value=Number(result.total||0); }
  catch(error:any){courseInsightsError.value=error.message||"课程学员加载失败";ElMessage.error(courseInsightsError.value);}
  finally{courseLearnersLoading.value=false;}
}
function resetAndLoadCourseLearners(){courseLearnerFilters.page=1;void loadCourseLearners();}
async function exportCourseInsights(){
  if(!insightCourse.value?.id||courseInsightsExporting.value)return;
  courseInsightsExporting.value=true;
  try { const params=new URLSearchParams();if(courseLearnerFilters.status)params.set("status",courseLearnerFilters.status);if(courseLearnerFilters.keyword.trim())params.set("keyword",courseLearnerFilters.keyword.trim());params.set("sortBy",courseLearnerFilters.sortBy);params.set("sortOrder",courseLearnerFilters.sortOrder);await downloadFile(`/admin/courses/${insightCourse.value.id}/insights/export?${params.toString()}`,`课程${insightCourse.value.id}-经营与学员数据.xlsx`);ElMessage.success("课程数据已导出"); }
  catch(error:any){ElMessage.error(error.message||"课程数据导出失败");}
  finally{courseInsightsExporting.value=false;}
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
  chapters.value.push({ courseId: currentCourse.value?.id, title: "", sortOrder: chapters.value.length + 1, lessons: [] });
}

function addLesson(ch: any) {
  ch.lessons.push({ chapterId: ch.id, title: "", duration: "", contentType:"video", status:"published", isFree: false, sortOrder: ch.lessons.length + 1 });
}

function editTeacher(row?: any) { teacherForm.value = row ? { ...row, adminUserId: row.adminUser?.id || undefined, tenantId: row.tenant?.id } : { name:"", title:"", avatarUrl:"", bio:"", status:"active", adminUserId: undefined, tenantId: filters.tenantId }; showTeacherForm.value = true; }
async function saveTeacher() {
  if (teacherSaving.value) return;
  if (!teacherForm.value.name?.trim()) return ElMessage.error("请输入讲师姓名");
  teacherSaving.value = true;
  try {
    const payload = { name: teacherForm.value.name.trim(), title: teacherForm.value.title?.trim() || null, bio: teacherForm.value.bio?.trim() || null, avatarUrl: teacherForm.value.avatarUrl?.trim() || null, status: teacherForm.value.status, adminUserId: teacherForm.value.adminUserId || null, tenantId: isPlatformAdmin() ? teacherForm.value.tenantId || filters.tenantId || null : undefined };
    teacherForm.value.id ? await api.patch(`/admin/course-teachers/${teacherForm.value.id}`, payload) : await api.post("/admin/course-teachers", payload);
    showTeacherForm.value=false;
    await load();
    ElMessage.success("讲师已保存");
  } catch (error: any) {
    ElMessage.error(error.message || "保存讲师失败");
  } finally {
    teacherSaving.value = false;
  }
}
async function removeTeacher(row:any) { try { await ElMessageBox.confirm(`确认删除讲师「${row.name}」？`, "删除讲师", { type:"warning" }); await api.delete(`/admin/course-teachers/${row.id}`); await load(); } catch (error:any) { if (error !== "cancel") ElMessage.error(error.message || "删除讲师失败"); } }
async function uploadLessonResource(file: File, lesson: any, type: "video" | "audio" | "attachment") { if (!currentCourse.value?.id) { ElMessage.error("请先保存课程再上传资源"); return false; } const formData = new FormData(); formData.append("file", file); try { const result = await api.post<any, any>(`/admin/course-resources/upload?type=${type}&courseId=${currentCourse.value.id}`, formData, { headers:{ "Content-Type":"multipart/form-data" } }); if (type === "video") lesson.videoUrl = result.url; if (type === "audio") lesson.audioUrl = result.url; if (type === "attachment") { lesson.attachmentUrl = result.url; lesson.attachmentName ||= result.originalName; } ElMessage.success("资源已加密上传"); } catch (error:any) { ElMessage.error(error.message || "资源上传失败"); } return false; }
async function openResourceLogs() { showResourceLogs.value=true; resourceLogsLoading.value=true; resourceLogsError.value=""; try { resourceLogs.value = await api.get<any, any[]>("/admin/course-resource-access-logs", { params:{ tenantId:isPlatformAdmin() ? filters.tenantId || undefined : undefined } }); } catch (error:any) { resourceLogsError.value=error.message||"资源访问审计加载失败"; ElMessage.error(resourceLogsError.value); } finally { resourceLogsLoading.value=false; } }
async function manageAssessments(course:any){assessmentCourse.value=course;showAssessments.value=true;await reloadAssessments();}
async function reloadAssessments(){
  if (!assessmentCourse.value?.id || assessmentLoading.value) return;
  assessmentLoading.value=true; assessmentError.value="";
  try { assessments.value=await api.get<any,any[]>("/admin/course-assessments",{params:{courseId:assessmentCourse.value.id}}); }
  catch(error:any){ assessmentError.value=error.message||"考核加载失败"; ElMessage.error(assessmentError.value); }
  finally { assessmentLoading.value=false; }
}
function editAssessment(row?:any){assessmentForm.value=row?{...row,courseId:assessmentCourse.value.id}:{courseId:assessmentCourse.value.id,title:"",type:"quiz",passScore:60,maxAttempts:1,dueAt:"",allowLateSubmission:false,status:"draft",description:""};showAssessmentForm.value=true;}
async function saveAssessment(){
  if (assessmentSaving.value) return;
  const f=assessmentForm.value;
  if(!f.title?.trim())return ElMessage.warning("请输入考核名称");
  assessmentSaving.value=true;
  try { const payload={courseId: assessmentCourse.value.id,title:f.title.trim(),type:f.type,description:f.description?.trim()||null,passScore:Number(f.passScore||60),maxAttempts:Number(f.maxAttempts||1),dueAt:f.dueAt||null,allowLateSubmission:Boolean(f.allowLateSubmission),status:f.status,sortOrder:Number(f.sortOrder||0)}; f.id?await api.patch(`/admin/course-assessments/${f.id}`,payload):await api.post("/admin/course-assessments",payload);showAssessmentForm.value=false;await reloadAssessments();ElMessage.success("考核已保存"); }
  catch(error:any){ ElMessage.error(error.message||"保存考核失败"); }
  finally { assessmentSaving.value=false; }
}
async function manageQuestions(row:any){currentAssessment.value=row;showQuestions.value=true;await reloadQuestions();}
async function reloadQuestions(){
  if (!currentAssessment.value?.id || questionLoading.value) return;
  questionLoading.value=true; questionError.value="";
  try { questions.value=await api.get<any,any[]>(`/admin/course-assessments/${currentAssessment.value.id}/questions`); }
  catch(error:any){ questionError.value=error.message||"题目加载失败"; ElMessage.error(questionError.value); }
  finally { questionLoading.value=false; }
}
function editQuestion(row?:any){questionForm.value=row?{...row,optionsText:(row.options||[]).map((x:any)=>`${x.key}=${x.text}`).join("\n"),correctText:(row.correctAnswer||[]).join(",")}:{assessmentId:currentAssessment.value.id,type:"single",stem:"",optionsText:"A=\nB=",correctText:"A",score:10,sortOrder:questions.value.length+1,explanation:""};showQuestionForm.value=true;}
async function saveQuestion(){
  if (questionSaving.value) return;
  const f=questionForm.value;
  if(!String(f.stem||"").trim()) return ElMessage.warning("请输入题干");
  const options=String(f.optionsText||"").split(/\r?\n/).map((line:string,index:number)=>{const [key,...rest]=line.split("=");return{key:(key||String.fromCharCode(65+index)).trim(),text:rest.join("=").trim()}}).filter((x:any)=>x.text);
  const correctAnswer=String(f.correctText||"").split(/[,，]/).map((x:string)=>x.trim()).filter(Boolean);
  if (f.type !== "essay" && (!options.length || !correctAnswer.length)) return ElMessage.warning("选择题请填写选项和标准答案");
  if (f.type === "multiple" && correctAnswer.length < 2) return ElMessage.warning("多选题至少需要两个标准答案");
  if (Number(f.score || 0) <= 0) return ElMessage.warning("题目分值必须大于 0");
  if (f.type !== "essay" && correctAnswer.some((key:string)=>!options.some((option:any)=>option.key===key))) return ElMessage.warning("标准答案必须来自题目选项");
  questionSaving.value=true;
  try { const payload={assessmentId:currentAssessment.value.id,type:f.type,stem:String(f.stem).trim(),options,correctAnswer,score:Number(f.score),sortOrder:Number(f.sortOrder),explanation:String(f.explanation||"").trim()||null}; f.id?await api.patch(`/admin/course-questions/${f.id}`,payload):await api.post("/admin/course-questions",payload);showQuestionForm.value=false;await reloadQuestions();ElMessage.success("题目已保存"); }
  catch(error:any){ ElMessage.error(error.message||"保存题目失败"); }
  finally { questionSaving.value=false; }
}
async function removeQuestion(row:any){if(questionActionId.value!==null)return;try{await ElMessageBox.confirm(`确认删除题目「${row.stem||row.id}」？`,"删除题目",{type:"warning"});questionActionId.value=row.id;await api.delete(`/admin/course-questions/${row.id}`);await reloadQuestions();ElMessage.success("题目已删除");}catch(error:any){if(error!=="cancel"&&error!=="close")ElMessage.error(error.message||"删除题目失败");}finally{questionActionId.value=null;}}
async function loadAttempts(){if(attemptsLoading.value)return;attemptsLoading.value=true;attemptsError.value="";try{attempts.value=await api.get<any,any[]>("/admin/course-assessment-attempts",{params:{courseId:assessmentCourse.value.id}});showAttempts.value=true;}catch(error:any){attemptsError.value=error.message||"提交记录加载失败";ElMessage.error(attemptsError.value);}finally{attemptsLoading.value=false;}}
async function grantRetake(){
  if(retakeGranting.value)return;
  if(!assessments.value.length)return ElMessage.warning("请先创建考核");
  try {
    const assessmentInput=await ElMessageBox.prompt("请输入考核 ID", "补考授权", {inputValue:String(assessments.value[0].id),inputPattern:/^\d+$/,inputErrorMessage:"请输入有效考核 ID"});
    const assessmentId=Number(assessmentInput.value);
    if(!assessments.value.some(item=>item.id===assessmentId))return ElMessage.warning("该考核不属于当前课程");
    const userInput=await ElMessageBox.prompt("请输入学员用户 ID", "补考授权", {inputPattern:/^\d+$/,inputErrorMessage:"请输入有效用户 ID"});
    const attemptsInput=await ElMessageBox.prompt("请输入额外作答次数（0-20）", "补考授权", {inputValue:"1",inputPattern:/^(?:[0-9]|1[0-9]|20)$/,inputErrorMessage:"请输入 0-20"});
    const lateInput=await ElMessageBox.prompt("可选：逾期补交截止时间，例如 2026-07-31 23:59:59；不需要可留空", "补考授权", {inputValue:""});
    const reasonInput=await ElMessageBox.prompt("请输入授权原因", "补考授权", {inputValue:"人工补考授权",inputValidator:value=>String(value||"").trim()?true:"请填写授权原因"});
    retakeGranting.value=true;
    await api.post(`/admin/course-assessments/${assessmentId}/grants`,{userId:Number(userInput.value),additionalAttempts:Number(attemptsInput.value),lateUntil:String(lateInput.value||"").trim()||null,reason:String(reasonInput.value||"").trim()});
    ElMessage.success("补考授权已保存");
  } catch(error:any) { if(error!=="cancel"&&error!=="close")ElMessage.error(error.message||"补考授权失败"); }
  finally { retakeGranting.value=false; }
}
async function exportAttempts(){if(attemptExporting.value)return;attemptExporting.value=true;try{const params=new URLSearchParams();if(assessmentCourse.value?.id)params.set("courseId",String(assessmentCourse.value.id));if(assessmentCourse.value?.tenantId)params.set("tenantId",String(assessmentCourse.value.tenantId));await downloadFile(`/admin/course-assessment-attempts-export${params.size?`?${params.toString()}`:""}`,`课程${assessmentCourse.value?.id||""}-考核成绩.csv`);ElMessage.success("成绩已导出");}catch(error:any){ElMessage.error(error.message||"成绩导出失败");}finally{attemptExporting.value=false;}}
async function quickReview(row:any,action:string){
  if(attemptDetailId.value!==null)return;
  attemptDetailId.value=Number(row.attempt_id);
  try { reviewDetail.value=await api.get<any,any>(`/admin/course-assessment-attempts/${row.attempt_id}`);reviewRemark.value=reviewDetail.value.attempt.reviewRemark||"";Object.keys(reviewScores).forEach(key=>delete reviewScores[Number(key)]);for(const item of reviewDetail.value.questions){reviewScores[item.id]={score:Number(item.answer?.score||0),feedback:item.answer?.feedback||""};}showReview.value=true;if(action==="return")reviewRemark.value ||= "请补充完善后重新提交"; }
  catch(error:any){ElMessage.error(error.message||"加载提交详情失败");}
  finally {attemptDetailId.value=null;}
}
async function submitReview(action:string){if(reviewSubmitting.value||!reviewDetail.value?.attempt?.id)return;reviewSubmitting.value=true;try{if(action==="return"&&!reviewRemark.value.trim())return ElMessage.warning("退回补交必须填写原因");const answerScores=Object.fromEntries(Object.entries(reviewScores).map(([id,value])=>[id,value]));await api.post(`/admin/course-assessment-attempts/${reviewDetail.value.attempt.id}/review`,{action,answerScores,reviewRemark:reviewRemark.value.trim()});showReview.value=false;await loadAttempts();ElMessage.success(action==="return"?"已退回补交":"批改完成");}catch(error:any){ElMessage.error(error.message||"批改提交失败");}finally{reviewSubmitting.value=false;}}
async function openCourseOperations(course:any){operationsCourse.value=course;showCourseOperations.value=true;certificateTemplate.value={name:`${course.title}结业证书`,issuerName:"",completionThreshold:Number(course.completionThreshold||100),requireAssessmentPass:false,enabled:true};await loadCourseOperations();}
async function loadCourseOperations(){if(!operationsCourse.value?.id||courseOperationsLoading.value)return;const courseId=operationsCourse.value.id;courseOperationsLoading.value=true;courseOperationsError.value="";const requests=[api.get<any,any[]>("/admin/course-reviews",{params:{courseId}}),api.get<any,any[]>("/admin/course-qa",{params:{courseId}}),api.get<any,any[]>("/admin/course-announcements",{params:{courseId}}),api.get<any,any>(`/admin/courses/${courseId}/certificate-template`)];if(canManageCourseRefunds)requests.push(api.get<any,any[]>("/admin/course-refunds",{params:{courseId}}));const results=await Promise.allSettled(requests);courseReviews.value=results[0].status==="fulfilled"?results[0].value:[];courseQa.value=results[1].status==="fulfilled"?results[1].value:[];courseAnnouncements.value=results[2].status==="fulfilled"?results[2].value:[];if(results[3].status==="fulfilled"&&results[3].value)certificateTemplate.value={...certificateTemplate.value,...results[3].value};courseRefunds.value=canManageCourseRefunds&&results[4]?.status==="fulfilled"?results[4].value:[];const failed=results.filter(item=>item.status==="rejected");if(failed.length)courseOperationsError.value=`课程运营有 ${failed.length} 项同步失败，请重试。`;courseOperationsLoading.value=false;}
async function moderateReview(row:any,status:string){const key=`review:${row.id}`;if(courseOperationActionKey.value)return;courseOperationActionKey.value=key;try{await api.patch(`/admin/course-reviews/${row.id}`,{status});await loadCourseOperations();ElMessage.success(status==="approved"?"评价已通过":"评价已拒绝");}catch(error:any){ElMessage.error(error.message||"评价审核失败");}finally{courseOperationActionKey.value="";}}
async function replyReview(row:any){const key=`review:${row.id}`;if(courseOperationActionKey.value)return;try{const input=await ElMessageBox.prompt("请输入课程方回复","回复评价",{inputValue:row.reply||"",inputType:"textarea",inputValidator:value=>String(value||"").trim()?true:"回复内容不能为空"});courseOperationActionKey.value=key;await api.patch(`/admin/course-reviews/${row.id}`,{status:row.status,reply:String(input.value||"").trim()});await loadCourseOperations();ElMessage.success("评价回复已保存");}catch(error:any){if(error!=="cancel"&&error!=="close")ElMessage.error(error.message||"评价回复失败");}finally{courseOperationActionKey.value="";}}
async function answerQa(row:any){const key=`qa:${row.id}`;if(courseOperationActionKey.value)return;try{const input=await ElMessageBox.prompt("请输入答复内容","课程答疑",{inputValue:row.answer||"",inputType:"textarea",inputValidator:value=>String(value||"").trim()?true:"答复内容不能为空"});courseOperationActionKey.value=key;await api.patch(`/admin/course-qa/${row.id}/answer`,{answer:String(input.value||"").trim()});await loadCourseOperations();ElMessage.success("答疑已回复");}catch(error:any){if(error!=="cancel"&&error!=="close")ElMessage.error(error.message||"答疑回复失败");}finally{courseOperationActionKey.value="";}}
function editCourseAnnouncement(row?:any){courseAnnouncementForm.value=row?{...row,courseId:operationsCourse.value.id}:{courseId:operationsCourse.value.id,title:"",content:"",status:"draft",publishAt:"",notifyLearners:true};showCourseAnnouncementForm.value=true;}
async function saveCourseAnnouncement(){if(courseAnnouncementSaving.value)return;const f=courseAnnouncementForm.value;if(!String(f.title||"").trim()||!String(f.content||"").trim())return ElMessage.warning("请填写公告标题和内容");courseAnnouncementSaving.value=true;try{const payload={courseId:operationsCourse.value.id,title:String(f.title).trim(),content:String(f.content).trim(),status:f.status,publishAt:f.publishAt||null,expiresAt:f.expiresAt||null,notifyLearners:Boolean(f.notifyLearners)};const saved:any=f.id?await api.patch(`/admin/course-announcements/${f.id}`,payload):await api.post("/admin/course-announcements",payload);let noticeResult:any=null;if(saved.status==="published"&&saved.notifyLearners)noticeResult=await api.post(`/admin/course-announcements/${saved.id}/notify`);showCourseAnnouncementForm.value=false;await loadCourseOperations();if(noticeResult)ElMessage.success(`公告已保存，通知成功 ${noticeResult.sentCount||0} 条，失败 ${noticeResult.failedCount||0} 条`);else ElMessage.success("公告已保存");}catch(error:any){ElMessage.error(error.message||"公告保存失败");}finally{courseAnnouncementSaving.value=false;}}
async function saveCertificateTemplate(){if(certificateSaving.value)return;if(!String(certificateTemplate.value.name||"").trim())return ElMessage.warning("请填写证书名称");certificateSaving.value=true;try{await api.put(`/admin/courses/${operationsCourse.value.id}/certificate-template`,certificateTemplate.value);ElMessage.success("证书模板已保存");}catch(error:any){ElMessage.error(error.message||"证书模板保存失败");}finally{certificateSaving.value=false;}}
async function reviewCourseRefund(row:any,action:string){if(courseRefundActionId.value!==null)return;try{let reviewRemark="";if(action==="reject"){const input=await ElMessageBox.prompt("请输入拒绝退款原因","拒绝课程退款",{inputType:"textarea",inputValidator:value=>Boolean(String(value||"").trim())||"请填写拒绝原因"});reviewRemark=String(input.value||"").trim();}else await ElMessageBox.confirm(`确认通过退款单 ${row.refundNo||row.id}？通过后可能立即向支付渠道发起退款。`,"通过课程退款",{type:"warning"});courseRefundActionId.value=row.id;const saved:any=await api.post(`/admin/course-refunds/${row.id}/review`,{action,reviewRemark});await loadCourseOperations();ElMessage.success(action==="approve"?(saved.status==="processing"?"已审核，等待退款通道确认":"退款已完成"):"退款已拒绝");}catch(error:any){if(error!=="cancel"&&error!=="close")ElMessage.error(error.message||"课程退款审核失败");}finally{courseRefundActionId.value=null;}}
async function runLearningReminders(){if(learningRemindersRunning.value)return;try{const input=await ElMessageBox.prompt("连续多少天未学习时发送提醒？","学习提醒",{inputValue:"7",inputPattern:/^(?:[1-9]|[1-8]\d|90)$/,inputErrorMessage:"请输入 1-90 天"});learningRemindersRunning.value=true;const result:any=await api.post("/admin/course-learning-reminders/run",{idleDays:Number(input.value)});ElMessage.success(`已检查 ${result.checkedCount||0} 人，发送成功 ${result.sentCount||0} 条，失败 ${result.failedCount||0} 条`);}catch(error:any){if(error!=="cancel"&&error!=="close")ElMessage.error(error.message||"学习提醒发送失败");}finally{learningRemindersRunning.value=false;}}

function reorderRows(rows: any[]) {
  rows.forEach((row, index) => row.sortOrder = index + 1);
}

function moveChapter(index: number, delta: number) {
  const next = index + delta;
  if (next < 0 || next >= chapters.value.length) return;
  const [row] = chapters.value.splice(index, 1);
  chapters.value.splice(next, 0, row);
  reorderRows(chapters.value);
}

function moveLesson(ch: any, index: number, delta: number) {
  const rows = ch.lessons || [];
  const next = index + delta;
  if (next < 0 || next >= rows.length) return;
  const [row] = rows.splice(index, 1);
  rows.splice(next, 0, row);
  reorderRows(rows);
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
      if (!String(ch.title || "").trim()) return ElMessage.error("章节标题不能为空");
      for (const ls of ch.lessons || []) {
        if (!String(ls.title || "").trim()) return ElMessage.error("课时标题不能为空");
      }
      if (ch.id) {
        await api.patch("/admin/course-chapters/" + ch.id, { title: ch.title.trim(), sortOrder: Number(ch.sortOrder || 0) });
      } else {
        const savedChapter = await api.post<any, any>("/admin/course-chapters", { courseId: currentCourse.value?.id, title: ch.title.trim(), sortOrder: Number(ch.sortOrder || 0) });
        ch.id = savedChapter?.id;
      }
      for (const ls of ch.lessons) {
        const lessonPayload = { title: ls.title.trim(), duration: ls.duration, contentType: ls.contentType || "video", status: ls.status || "published", videoUrl: ls.videoUrl || null, audioUrl: ls.audioUrl || null, attachmentUrl: ls.attachmentUrl || null, attachmentName: ls.attachmentName || null, content: ls.content || null, isFree: ls.isFree, sortOrder: Number(ls.sortOrder || 0) };
        if (ls.id) {
          await api.patch("/admin/course-lessons/" + ls.id, lessonPayload);
        } else {
          await api.post("/admin/course-lessons", { chapterId: ch.id, ...lessonPayload });
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
  if (canViewCourseOrders) loadOrders();
});

watch(() => route.query.tenantId, () => {
  const nextTenantId = routeTenantId();
  if (filters.tenantId === nextTenantId && orderFilters.tenantId === nextTenantId) return;
  filters.tenantId = nextTenantId;
  orderFilters.tenantId = nextTenantId;
  load();
  if (canViewCourseOrders) loadOrders();
});
</script>

<style scoped>
.courses-page { padding: 24px; }
.page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
.header-actions { display:flex; gap:12px; align-items:center; }
.overview-grid { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.overview-card { padding: 14px 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; display: grid; gap: 6px; }
.overview-card span { color: #667085; font-size: 13px; }
.overview-card strong { color: #111827; font-size: 24px; }
.course-cover { width:48px; height:48px; object-fit:cover; border-radius:8px; background:#f0ebe3; display:flex; align-items:center; justify-content:center; color:#7c2d12; font-weight:900; }
.inline-fields { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.chapter-title-row { display:flex; align-items:center; gap:8px; }
.lesson-editor { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-left:24px; padding:8px 0; border-bottom:1px solid #edf0f5; }
.resource-input { flex:1 1 420px; }
.teacher-add { margin-bottom:12px; }
.operations-alert { margin-bottom:12px; }
.assessment-toolbar { display:flex; gap:10px; margin-bottom:12px; }
.insight-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; color:#475467; }
.insight-grid { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:10px; margin-bottom:16px; }
.insight-metric { border-bottom:2px solid #d0d5dd; padding:10px 4px; display:grid; gap:4px; }
.insight-metric span { color:#667085; font-size:13px; }
.insight-metric strong { color:#101828; font-size:20px; }
.insight-filters { display:grid; grid-template-columns:160px 150px 110px minmax(220px,1fr) auto; gap:10px; margin-bottom:12px; }
.review-question { display:grid; gap:10px; padding:16px 0; border-bottom:1px solid #edf0f5; }
.review-answer { color:#344054; white-space:pre-wrap; }
.review-standard { color:#067647; }
.review-fields { display:grid; grid-template-columns:140px 1fr; gap:10px; }
.order-header { margin-top: 12px; }
.order-filters { display:flex; gap:12px; align-items:center; }
.pagination { display:flex; justify-content:flex-end; padding-top:16px; }
small { color:#667085; display:block; line-height:1.5; }
.form-hint { margin-left:8px; color:#667085; }
@media (max-width: 1100px) {
  .overview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .page-header, .header-actions, .order-filters { align-items: stretch; flex-direction: column; }
  .insight-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .insight-filters { grid-template-columns:1fr; }
  .insight-toolbar { align-items:stretch; flex-direction:column; }
}
:deep(.course-insights-dialog) { max-width:calc(100vw - 32px); }
</style>

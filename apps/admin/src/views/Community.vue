<template>
  <div class="community-page">
    <div class="page-header">
      <h2>慢π运营</h2>
      <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="平台/全部商家" style="width: 240px" @change="changeTenant">
        <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantOptionLabel(tenant)" :value="tenant.id" />
      </el-select>
    </div>
    <el-alert v-if="tenantLoadError" type="error" :title="tenantLoadError" show-icon :closable="false" class="page-alert">
      <template #default><el-button size="small" @click="loadTenants">重新加载商家</el-button></template>
    </el-alert>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" class="page-alert">
      <template #default><el-button size="small" :loading="loading" @click="load">重新加载</el-button></template>
    </el-alert>
    <el-alert
      type="info"
      title="共修动态/文章会展示在 H5 首页「共修动态」和共修页「学员动态」；用户点赞、评论后，可在这里审核评论。"
      show-icon
      :closable="false"
      class="page-alert"
    />
    <div class="overview-grid">
      <div v-for="item in communityMetricCards" :key="item.label" class="overview-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>
    <div v-if="communityAlerts.length || forumAlerts.length" class="alert-stack">
      <el-alert v-for="item in [...communityAlerts, ...forumAlerts]" :key="item.message" :type="item.level || 'warning'" :title="item.message" show-icon :closable="false" />
    </div>
    <el-tabs v-model="activeTab" v-loading="loading">
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
          <el-table-column label="操作" width="250"><template #default="{row}"><el-button size="small" :loading="memberLoading && membersActivity?.id === row.id" :disabled="memberLoading || Boolean(actionKey)" @click="openMembers(row)">成员</el-button><el-button size="small" :disabled="Boolean(actionKey)" @click="editActivity(row)">编辑</el-button><el-button size="small" type="danger" :loading="actionKey === `activity:delete:${row.id}`" :disabled="Boolean(actionKey)" @click="deleteActivity(row)">删除</el-button></template></el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="打卡任务" name="checkin">
        <el-button type="primary" size="small" style="margin-bottom:16px;" @click="showCheckinForm = true">新增打卡任务</el-button>
        <el-alert
          v-if="duplicateCheckinGroups.length"
          type="warning"
          :title="`检测到 ${duplicateCheckinGroups.length} 组同一共学活动的同日重复打卡任务，请保留一条并删除多余记录；系统已阻止继续新增同活动同日期任务。`"
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
          <el-table-column label="操作" width="200"><template #default="{row}"><el-button size="small" :disabled="Boolean(actionKey)" @click="editCheckin(row)">编辑</el-button><el-button size="small" type="danger" :loading="actionKey === `checkin-task:delete:${row.id}`" :disabled="Boolean(actionKey)" @click="deleteCheckin(row)">删除</el-button></template></el-table-column>
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
          <el-table-column label="操作" width="340">
            <template #default="{row}">
              <el-button size="small" type="success" :disabled="row.status === 'approved'" @click="openPostReview(row, 'approved', true)">通过</el-button>
              <el-button size="small" type="warning" :disabled="row.status === 'rejected'" @click="openPostReview(row, 'rejected', false)">拒绝</el-button>
              <el-button size="small" @click="openPostReview(row, row.status || 'pending', !row.visible)">{{ row.visible === false ? '展示' : '下架' }}</el-button>
              <el-button size="small" :loading="actionKey === `post:convert:${row.id}`" :disabled="Boolean(actionKey)" @click="convertPostToForum(row)">转帖子</el-button>
              <el-button size="small" type="danger" :loading="actionKey === `post:delete:${row.id}`" :disabled="Boolean(actionKey)" @click="deletePost(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="社交资料审核" name="social-profiles">
        <div class="tab-toolbar"><span>用户资料审核通过后，才会在对应商家的“社交拓展”广场公开；公开接口不返回手机号等敏感信息。</span></div>
        <el-table :data="socialProfiles" stripe style="width:100%;" empty-text="暂无社交资料">
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column label="用户" min-width="150"><template #default="{row}"><strong>{{ row.displayName }}</strong><div class="muted-line">用户ID {{ row.userId }}</div></template></el-table-column>
          <el-table-column v-if="isPlatformAdmin()" label="所属商家" min-width="150"><template #default="{row}">{{ tenantDisplayName(row) }}</template></el-table-column>
          <el-table-column label="身份" min-width="180" show-overflow-tooltip><template #default="{row}">{{ [row.roleTitle, row.industry, row.city].filter(Boolean).join(' · ') || '-' }}</template></el-table-column>
          <el-table-column prop="introduction" label="自我介绍" min-width="240" show-overflow-tooltip />
          <el-table-column label="可提供" min-width="180" show-overflow-tooltip><template #default="{row}">{{ (row.offers || []).join('、') }}</template></el-table-column>
          <el-table-column label="希望拓展" min-width="180" show-overflow-tooltip><template #default="{row}">{{ (row.needs || []).join('、') }}</template></el-table-column>
          <el-table-column label="状态" width="100"><template #default="{row}"><el-tag :type="row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'">{{ statusText(row.status) }}</el-tag></template></el-table-column>
          <el-table-column prop="reviewRemark" label="审核说明" min-width="150" show-overflow-tooltip />
          <el-table-column label="操作" width="170"><template #default="{row}"><el-button size="small" type="success" :loading="actionKey === `social:approved:${row.id}`" :disabled="row.status === 'approved' || Boolean(actionKey)" @click="reviewSocialProfile(row, 'approved')">通过</el-button><el-button size="small" type="danger" :loading="actionKey === `social:rejected:${row.id}`" :disabled="row.status === 'rejected' || Boolean(actionKey)" @click="reviewSocialProfile(row, 'rejected')">拒绝</el-button></template></el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="打卡审核" name="checkin-review"><el-button size="small" :loading="checkinReviewLoading" :disabled="Boolean(actionKey)" @click="loadCheckinReviews">刷新</el-button><el-alert v-if="checkinReviewError" type="error" :title="checkinReviewError" show-icon :closable="false" class="section-alert"><template #default><el-button size="small" @click="loadCheckinReviews">重试</el-button></template></el-alert><el-table v-loading="checkinReviewLoading" :data="checkinReviews" stripe><el-table-column prop="checkin_userId" label="用户ID" width="90" /><el-table-column prop="checkin_date" label="日期" width="120" /><el-table-column prop="checkin_content" label="内容" min-width="280" /><el-table-column prop="checkin_status" label="状态" width="100" /><el-table-column label="操作" width="150"><template #default="{row}"><el-button v-if="row.checkin_status==='pending'" link type="success" :loading="actionKey === `checkin-review:approve:${row.checkin_id}`" :disabled="Boolean(actionKey)" @click="reviewCheckin(row,'approve')">通过</el-button><el-button v-if="row.checkin_status==='pending'" link type="danger" :loading="actionKey === `checkin-review:reject:${row.checkin_id}`" :disabled="Boolean(actionKey)" @click="reviewCheckin(row,'reject')">拒绝</el-button></template></el-table-column></el-table></el-tab-pane>
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
              <el-button size="small" type="success" :loading="actionKey === `comment:approved:${row.id}`" :disabled="row.status === 'approved' || Boolean(actionKey)" @click="reviewComment(row, 'approved')">通过</el-button>
              <el-button size="small" type="danger" :loading="actionKey === `comment:rejected:${row.id}`" :disabled="row.status === 'rejected' || Boolean(actionKey)" @click="reviewComment(row, 'rejected')">拒绝</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="论坛管理" name="forum">
        <div class="overview-grid forum-overview">
          <div v-for="item in forumMetricCards" :key="item.label" class="overview-card">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
        <el-tabs v-model="forumTab" class="forum-tabs">
          <el-tab-pane label="版块管理" name="categories">
            <div class="tab-toolbar">
              <el-button type="primary" size="small" @click="openForumCategory()">新增版块</el-button>
              <span>版块可按商家隔离，默认审核制；关闭版块后前台不再展示发帖入口。</span>
            </div>
            <el-table :data="forumCategories" stripe style="width:100%;" empty-text="暂无论坛版块">
              <el-table-column prop="id" label="ID" width="70" />
              <el-table-column prop="name" label="版块" min-width="150" />
              <el-table-column prop="description" label="简介" min-width="220" show-overflow-tooltip />
              <el-table-column v-if="isPlatformAdmin()" label="所属商家" min-width="160" show-overflow-tooltip><template #default="{row}">{{ tenantDisplayName(row) }}</template></el-table-column>
              <el-table-column label="发帖权限" width="100"><template #default="{row}">{{ forumPostPermissionText(row.postPermission) }}</template></el-table-column>
              <el-table-column label="审核模式" width="100"><template #default="{row}">{{ forumAuditModeText(row.auditMode) }}</template></el-table-column>
              <el-table-column label="版主" width="80"><template #default="{row}">{{ moderatorCount(row.id) }}</template></el-table-column>
              <el-table-column prop="sortOrder" label="排序" width="80" />
              <el-table-column label="状态" width="90"><template #default="{row}"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template></el-table-column>
              <el-table-column label="操作" width="250">
                <template #default="{row}">
                  <el-button size="small" @click="openForumCategory(row)">编辑</el-button>
                  <el-button size="small" @click="openForumModerators(row)">版主</el-button>
                  <el-button size="small" type="danger" :loading="actionKey === `forum-category:delete:${row.id}`" :disabled="Boolean(actionKey)" @click="deleteForumCategory(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="帖子审核" name="topics">
            <div class="tab-toolbar">
              <el-select v-model="forumFilters.topicStatus" clearable placeholder="帖子状态" size="small" style="width: 130px" @change="load">
                <el-option label="待审核" value="pending" />
                <el-option label="已通过" value="approved" />
                <el-option label="已拒绝" value="rejected" />
                <el-option label="已隐藏" value="hidden" />
              </el-select>
              <el-select v-model="forumFilters.categoryId" clearable placeholder="版块" size="small" style="width: 160px" @change="load">
                <el-option v-for="item in forumCategories" :key="item.id" :label="item.name" :value="String(item.id)" />
              </el-select>
              <el-input v-model="forumFilters.keyword" clearable placeholder="标题/内容" size="small" style="width: 180px" @change="load" @clear="load" @keyup.enter="load" />
              <el-button size="small" @click="load">查询</el-button>
            </div>
            <el-table :data="forumTopics" stripe style="width:100%;" empty-text="暂无论坛帖子">
              <el-table-column prop="id" label="ID" width="70" />
              <el-table-column label="帖子" min-width="260" show-overflow-tooltip>
                <template #default="{row}">
                  <strong>{{ row.title }}</strong>
                  <div class="muted-line">{{ row.category?.name || '未分版块' }} · {{ row.user?.nickname || (row.user?.phone ? maskPhone(row.user.phone) : ('用户' + (row.userId || '-'))) }}</div>
                </template>
              </el-table-column>
              <el-table-column v-if="isPlatformAdmin()" label="所属商家" min-width="150" show-overflow-tooltip><template #default="{row}">{{ tenantDisplayName(row) }}</template></el-table-column>
              <el-table-column label="状态" width="90"><template #default="{row}"><el-tag :type="forumStatusTag(row.status)">{{ forumStatusText(row.status) }}</el-tag></template></el-table-column>
              <el-table-column label="运营" width="170"><template #default="{row}"><el-tag v-if="row.pinned" type="danger">置顶</el-tag><el-tag v-if="row.featured" type="warning" style="margin-left:4px;">精华</el-tag><el-tag v-if="row.locked" type="info" style="margin-left:4px;">已锁</el-tag></template></el-table-column>
              <el-table-column label="数据" width="150"><template #default="{row}">浏览 {{ row.viewCount || 0 }} / 回复 {{ row.replyCount || 0 }} / 收藏 {{ row.favoriteCount || 0 }}</template></el-table-column>
              <el-table-column prop="createdAt" label="时间" width="160" />
              <el-table-column label="操作" width="410">
                <template #default="{row}">
                  <el-button size="small" type="success" :loading="actionKey === `topic:approved:${row.id}`" :disabled="row.status === 'approved' || Boolean(actionKey)" @click="reviewForumTopic(row, 'approved')">通过</el-button>
                  <el-button size="small" type="warning" :loading="actionKey === `topic:rejected:${row.id}`" :disabled="row.status === 'rejected' || Boolean(actionKey)" @click="reviewForumTopic(row, 'rejected')">拒绝</el-button>
                  <el-button size="small" :loading="actionKey === `topic:pin:${row.id}`" :disabled="Boolean(actionKey)" @click="toggleForumTopicPin(row)">{{ row.pinned ? '取消置顶' : '置顶' }}</el-button>
                  <el-button size="small" :loading="actionKey === `topic:feature:${row.id}`" :disabled="Boolean(actionKey)" @click="toggleForumTopicFeature(row)">{{ row.featured ? '取消精华' : '精华' }}</el-button>
                  <el-button size="small" :type="row.locked ? 'success' : 'info'" :loading="actionKey === `topic:lock:${row.id}`" :disabled="Boolean(actionKey)" @click="toggleForumTopicLock(row)">{{ row.locked ? '解锁' : '锁帖' }}</el-button>
                  <el-button size="small" type="danger" :loading="actionKey === `topic:hidden:${row.id}`" :disabled="Boolean(actionKey)" @click="reviewForumTopic(row, 'hidden')">隐藏</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="回复审核" name="replies">
            <div class="tab-toolbar">
              <el-select v-model="forumFilters.replyStatus" clearable placeholder="回复状态" size="small" style="width: 130px" @change="load">
                <el-option label="待审核" value="pending" />
                <el-option label="已通过" value="approved" />
                <el-option label="已拒绝" value="rejected" />
                <el-option label="已隐藏" value="hidden" />
              </el-select>
              <el-input v-model="forumFilters.topicId" clearable placeholder="帖子ID" size="small" style="width: 110px" @change="load" @clear="load" @keyup.enter="load" />
              <el-button size="small" @click="load">查询</el-button>
            </div>
            <el-table :data="forumReplies" stripe style="width:100%;" empty-text="暂无论坛回复">
              <el-table-column prop="id" label="ID" width="70" />
              <el-table-column label="帖子" min-width="180" show-overflow-tooltip><template #default="{row}">{{ row.topic?.title || '-' }}</template></el-table-column>
              <el-table-column prop="content" label="回复内容" min-width="260" show-overflow-tooltip />
              <el-table-column label="楼层" width="80"><template #default="{row}">{{ row.floorNo ? `${row.floorNo}楼` : '楼中楼' }}</template></el-table-column>
              <el-table-column label="层级" width="90"><template #default="{row}">{{ row.parent ? '楼中楼' : '主回复' }}</template></el-table-column>
              <el-table-column label="状态" width="90"><template #default="{row}"><el-tag :type="forumStatusTag(row.status)">{{ forumStatusText(row.status) }}</el-tag></template></el-table-column>
              <el-table-column prop="createdAt" label="时间" width="160" />
              <el-table-column label="操作" width="230">
                <template #default="{row}">
                  <el-button size="small" type="success" :loading="actionKey === `reply:approved:${row.id}`" :disabled="row.status === 'approved' || Boolean(actionKey)" @click="reviewForumReply(row, 'approved')">通过</el-button>
                  <el-button size="small" type="warning" :loading="actionKey === `reply:rejected:${row.id}`" :disabled="row.status === 'rejected' || Boolean(actionKey)" @click="reviewForumReply(row, 'rejected')">拒绝</el-button>
                  <el-button size="small" type="danger" :loading="actionKey === `reply:hidden:${row.id}`" :disabled="Boolean(actionKey)" @click="reviewForumReply(row, 'hidden')">隐藏</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="举报处理" name="reports">
            <div class="tab-toolbar">
              <el-select v-model="forumFilters.reportStatus" clearable placeholder="处理状态" size="small" style="width: 130px" @change="load">
                <el-option label="待处理" value="pending" />
                <el-option label="已处理" value="resolved" />
                <el-option label="已驳回" value="rejected" />
              </el-select>
              <el-button size="small" @click="load">查询</el-button>
            </div>
            <el-table :data="forumReports" stripe style="width:100%;" empty-text="暂无举报">
              <el-table-column prop="id" label="ID" width="70" />
              <el-table-column label="举报对象" min-width="220" show-overflow-tooltip><template #default="{row}">{{ forumReportTarget(row) }}</template></el-table-column>
              <el-table-column prop="type" label="类型" width="120" />
              <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
              <el-table-column label="状态" width="90"><template #default="{row}"><el-tag :type="forumReportStatusTag(row.status)">{{ forumReportStatusText(row.status) }}</el-tag></template></el-table-column>
              <el-table-column prop="handleRemark" label="处理备注" min-width="160" show-overflow-tooltip />
              <el-table-column prop="createdAt" label="时间" width="160" />
              <el-table-column label="操作" width="200">
                <template #default="{row}">
                  <el-button size="small" type="danger" :loading="actionKey === `forum-report:resolved:${row.id}`" :disabled="row.status === 'resolved' || Boolean(actionKey)" @click="handleForumReport(row, 'resolved')">处理并隐藏</el-button>
                  <el-button size="small" :loading="actionKey === `forum-report:rejected:${row.id}`" :disabled="row.status === 'rejected' || Boolean(actionKey)" @click="handleForumReport(row, 'rejected')">驳回</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </el-tab-pane>
      <el-tab-pane label="内容治理" name="governance">
        <el-tabs v-model="governanceTab">
          <el-tab-pane label="关键词规则" name="keywords">
            <div class="tab-toolbar"><el-button type="primary" size="small" @click="openKeywordRule()">新增规则</el-button><span>支持进审核、拒绝发布和自动替换。</span></div>
            <el-table :data="contentKeywordRules" stripe empty-text="暂无关键词规则">
              <el-table-column prop="keyword" label="关键词" min-width="160" />
              <el-table-column label="作用域" width="110"><template #default="{row}">{{ governanceScopeText(row.scope) }}</template></el-table-column>
              <el-table-column label="处置" width="110"><template #default="{row}">{{ keywordActionText(row.action) }}</template></el-table-column>
              <el-table-column prop="replacement" label="替换内容" min-width="130" />
              <el-table-column v-if="isPlatformAdmin()" label="所属商家" min-width="150"><template #default="{row}">{{ tenantDisplayName(row) }}</template></el-table-column>
              <el-table-column label="状态" width="90"><template #default="{row}"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template></el-table-column>
              <el-table-column label="操作" width="150"><template #default="{row}"><el-button size="small" :disabled="Boolean(actionKey)" @click="openKeywordRule(row)">编辑</el-button><el-button size="small" type="danger" :loading="actionKey === `keyword:delete:${row.id}`" :disabled="Boolean(actionKey)" @click="deleteKeywordRule(row)">删除</el-button></template></el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="社区举报" name="community-reports">
            <el-table :data="communityContentReports" stripe empty-text="暂无社区举报">
              <el-table-column prop="reporterId" label="举报人" width="90" />
              <el-table-column label="对象" width="120"><template #default="{row}">{{ row.targetType === 'post' ? '动态' : '评论' }} #{{ row.targetId }}</template></el-table-column>
              <el-table-column prop="targetUserId" label="被举报用户" width="110" />
              <el-table-column prop="type" label="类型" width="100" />
              <el-table-column prop="description" label="说明" min-width="240" show-overflow-tooltip />
              <el-table-column label="状态" width="90"><template #default="{row}"><el-tag :type="row.status === 'pending' ? 'warning' : row.status === 'resolved' ? 'success' : 'info'">{{ forumReportStatusText(row.status) }}</el-tag></template></el-table-column>
              <el-table-column label="操作" width="210"><template #default="{row}"><el-button v-if="row.status === 'pending'" size="small" type="danger" :loading="actionKey === `community-report:hide:${row.id}`" :disabled="Boolean(actionKey)" @click="reviewCommunityReport(row, 'hide')">处理并隐藏</el-button><el-button v-if="row.status === 'pending'" size="small" type="warning" :loading="actionKey === `community-report:sanction:${row.id}`" :disabled="Boolean(actionKey)" @click="reviewCommunityReport(row, 'sanction')">处罚</el-button><el-button v-if="row.status === 'pending'" size="small" :loading="actionKey === `community-report:reject:${row.id}`" :disabled="Boolean(actionKey)" @click="reviewCommunityReport(row, 'reject')">驳回</el-button></template></el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="账号处罚" name="sanctions">
            <div class="tab-toolbar"><el-button type="danger" size="small" @click="openSanction()">新增处罚</el-button><span>禁言会阻止社区或论坛发布，处罚可设置到期时间。</span></div>
            <el-table :data="contentSanctions" stripe empty-text="暂无处罚记录">
              <el-table-column prop="userId" label="用户ID" width="90" />
              <el-table-column label="类型" width="90"><template #default="{row}">{{ row.type === 'ban' ? '禁用' : '禁言' }}</template></el-table-column>
              <el-table-column label="作用域" width="100"><template #default="{row}">{{ governanceScopeText(row.scope) }}</template></el-table-column>
              <el-table-column prop="reason" label="原因" min-width="240" show-overflow-tooltip />
              <el-table-column label="截止时间" width="170"><template #default="{row}">{{ row.endsAt ? formatDateTime(row.endsAt) : '长期' }}</template></el-table-column>
              <el-table-column label="状态" width="90"><template #default="{row}"><el-tag :type="row.status === 'active' ? 'danger' : 'info'">{{ sanctionStatusText(row.status) }}</el-tag></template></el-table-column>
              <el-table-column label="操作" width="100"><template #default="{row}"><el-button v-if="row.status === 'active'" size="small" type="success" :loading="actionKey === `sanction:revoke:${row.id}`" :disabled="Boolean(actionKey)" @click="revokeSanction(row)">解除</el-button></template></el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="用户申诉" name="appeals">
            <el-table :data="contentAppeals" stripe empty-text="暂无申诉">
              <el-table-column prop="userId" label="用户ID" width="90" />
              <el-table-column prop="reason" label="申诉说明" min-width="280" show-overflow-tooltip />
              <el-table-column label="关联处罚" width="120"><template #default="{row}">{{ row.sanction?.id ? `#${row.sanction.id}` : '-' }}</template></el-table-column>
              <el-table-column label="状态" width="90"><template #default="{row}"><el-tag :type="row.status === 'pending' ? 'warning' : row.status === 'approved' ? 'success' : 'info'">{{ appealStatusText(row.status) }}</el-tag></template></el-table-column>
              <el-table-column prop="handleRemark" label="处理说明" min-width="200" show-overflow-tooltip />
              <el-table-column label="操作" width="170"><template #default="{row}"><el-button v-if="row.status === 'pending'" size="small" type="success" :loading="actionKey === `appeal:approved:${row.id}`" :disabled="Boolean(actionKey)" @click="reviewAppeal(row, 'approved')">通过</el-button><el-button v-if="row.status === 'pending'" size="small" type="danger" :loading="actionKey === `appeal:rejected:${row.id}`" :disabled="Boolean(actionKey)" @click="reviewAppeal(row, 'rejected')">驳回</el-button></template></el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
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
        <el-form-item label="结束时间"><el-date-picker v-model="activityForm.endTime" type="datetime" format="YYYY-MM-DD HH:mm" /></el-form-item>
        <el-form-item label="加入方式"><el-select v-model="activityForm.joinMode"><el-option label="直接加入" value="open" /><el-option label="审核加入" value="approval" /><el-option label="邀请码" value="invite" /></el-select></el-form-item>
        <el-form-item label="人数上限"><el-input-number v-model="activityForm.memberLimit" :min="0" /></el-form-item>
        <el-form-item v-if="activityForm.joinMode==='invite'" label="邀请码"><el-input v-model="activityForm.inviteCode" /></el-form-item>
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
        <el-form-item label="共学活动"><el-select v-model="checkinForm.activityId" clearable filterable><el-option v-for="item in activities" :key="item.id" :label="item.title" :value="item.id" /></el-select></el-form-item>
        <el-form-item label="打卡类型"><el-select v-model="checkinForm.checkinType"><el-option label="文字" value="text" /><el-option label="图片" value="image" /><el-option label="问答" value="question" /><el-option label="位置" value="location" /></el-select></el-form-item>
        <el-form-item label="需要审核"><el-switch v-model="checkinForm.requireApproval" /></el-form-item>
        <el-form-item label="允许补卡"><el-switch v-model="checkinForm.allowMakeup" /></el-form-item>
        <el-form-item v-if="checkinForm.allowMakeup" label="补卡期限"><el-input-number v-model="checkinForm.makeupWithinDays" :min="1" :max="30" /> 天</el-form-item>
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
    <el-dialog v-model="showMembers" :title="`共学成员 - ${membersActivity?.title || ''}`" width="860px"><el-alert v-if="memberError" type="error" :title="memberError" show-icon :closable="false" class="section-alert"><template #default><el-button size="small" @click="reloadMembers">重试</el-button></template></el-alert><el-table v-loading="memberLoading" :data="activityMembers" stripe><el-table-column prop="userId" label="用户ID" width="90" /><el-table-column prop="status" label="状态" width="110" /><el-table-column prop="applyRemark" label="申请说明" min-width="260" /><el-table-column label="申请时间" width="180"><template #default="{row}">{{ formatDateTime(row.createdAt) }}</template></el-table-column><el-table-column label="操作" width="150"><template #default="{row}"><el-button v-if="row.status==='pending'" link type="success" :loading="actionKey === `member:approve:${row.id}`" :disabled="Boolean(actionKey)" @click="reviewMember(row,'approve')">通过</el-button><el-button v-if="row.status==='pending'" link type="danger" :loading="actionKey === `member:reject:${row.id}`" :disabled="Boolean(actionKey)" @click="reviewMember(row,'reject')">拒绝</el-button></template></el-table-column></el-table></el-dialog>

    <el-dialog v-model="showForumCategoryDialog" :title="forumCategoryForm.id ? '编辑论坛版块' : '新增论坛版块'" width="540px">
      <el-form :model="forumCategoryForm" label-width="92px">
        <el-form-item v-if="isPlatformAdmin()" label="所属商家">
          <el-select v-model="forumCategoryForm.tenantId" clearable filterable placeholder="平台版块">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantOptionLabel(tenant)" :value="tenant.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="版块名称" required><el-input v-model="forumCategoryForm.name" maxlength="80" /></el-form-item>
        <el-form-item label="简介"><el-input v-model="forumCategoryForm.description" type="textarea" :rows="3" maxlength="255" show-word-limit /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="forumCategoryForm.sortOrder" :min="0" :max="9999" /></el-form-item>
        <el-form-item label="发帖权限">
          <el-radio-group v-model="forumCategoryForm.postPermission">
            <el-radio-button value="user">用户可发</el-radio-button>
            <el-radio-button value="admin">仅运营发</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审核模式">
          <el-radio-group v-model="forumCategoryForm.auditMode">
            <el-radio-button value="pre">先审后发</el-radio-button>
            <el-radio-button value="post">先发后审</el-radio-button>
            <el-radio-button value="closed">关闭发帖</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="状态"><el-switch v-model="forumCategoryForm.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showForumCategoryDialog = false">取消</el-button>
        <el-button type="primary" :loading="savingForumCategory" @click="saveForumCategory">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showForumModeratorDialog" :title="`版主设置·${moderatorCategory?.name || ''}`" width="620px">
      <div class="tab-toolbar">
        <el-select v-model="selectedModeratorAdminId" filterable placeholder="选择运营管理员" style="width: 320px">
          <el-option v-for="item in forumModeratorCandidates" :key="item.id" :label="`${item.username}（${item.role}）`" :value="item.id" />
        </el-select>
        <el-button type="primary" :loading="actionKey === 'moderator:add'" :disabled="!selectedModeratorAdminId || Boolean(actionKey)" @click="addForumModerator">添加版主</el-button>
      </div>
      <el-table :data="categoryModerators" stripe empty-text="暂无版主">
        <el-table-column prop="admin.username" label="账号" min-width="160" />
        <el-table-column prop="admin.role" label="角色" width="120" />
        <el-table-column label="权限" min-width="220"><template #default="{row}">{{ (row.permissions || []).join('、') }}</template></el-table-column>
        <el-table-column label="操作" width="90"><template #default="{row}"><el-button size="small" type="danger" :loading="actionKey === `moderator:remove:${row.id}`" :disabled="Boolean(actionKey)" @click="removeForumModerator(row)">移除</el-button></template></el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="showKeywordDialog" :title="keywordForm.id ? '编辑关键词规则' : '新增关键词规则'" width="520px">
      <el-form :model="keywordForm" label-width="90px">
        <el-form-item v-if="isPlatformAdmin()" label="所属商家"><el-select v-model="keywordForm.tenantId" clearable filterable placeholder="平台全局"><el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantOptionLabel(tenant)" :value="tenant.id" /></el-select></el-form-item>
        <el-form-item label="关键词" required><el-input v-model="keywordForm.keyword" maxlength="120" /></el-form-item>
        <el-form-item label="作用域"><el-select v-model="keywordForm.scope"><el-option label="全部" value="all" /><el-option label="社区" value="community" /><el-option label="论坛" value="forum" /></el-select></el-form-item>
        <el-form-item label="匹配方式"><el-radio-group v-model="keywordForm.matchMode"><el-radio-button value="contains">包含</el-radio-button><el-radio-button value="exact">完全相等</el-radio-button></el-radio-group></el-form-item>
        <el-form-item label="处置"><el-select v-model="keywordForm.action"><el-option label="转人工审核" value="review" /><el-option label="拒绝发布" value="reject" /><el-option label="自动替换" value="mask" /></el-select></el-form-item>
        <el-form-item v-if="keywordForm.action === 'mask'" label="替换为"><el-input v-model="keywordForm.replacement" placeholder="留空则替换为 *" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="keywordForm.enabled" /></el-form-item>
      </el-form>
      <template #footer><el-button :disabled="Boolean(actionKey)" @click="showKeywordDialog = false">取消</el-button><el-button type="primary" :loading="actionKey === 'keyword:save'" :disabled="Boolean(actionKey)" @click="saveKeywordRule">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="showSanctionDialog" title="新增账号处罚" width="520px">
      <el-form :model="sanctionForm" label-width="90px">
        <el-form-item v-if="isPlatformAdmin()" label="所属商家"><el-select v-model="sanctionForm.tenantId" clearable filterable placeholder="平台全局"><el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantOptionLabel(tenant)" :value="tenant.id" /></el-select></el-form-item>
        <el-form-item label="用户ID" required><el-input-number v-model="sanctionForm.userId" :min="1" /></el-form-item>
        <el-form-item label="处罚类型"><el-radio-group v-model="sanctionForm.type"><el-radio-button value="mute">禁言</el-radio-button><el-radio-button value="ban">禁用</el-radio-button></el-radio-group></el-form-item>
        <el-form-item label="作用域"><el-select v-model="sanctionForm.scope"><el-option label="全部" value="all" /><el-option label="社区" value="community" /><el-option label="论坛" value="forum" /></el-select></el-form-item>
        <el-form-item label="截止时间"><el-date-picker v-model="sanctionForm.endsAt" type="datetime" clearable placeholder="留空为长期" /></el-form-item>
        <el-form-item label="原因" required><el-input v-model="sanctionForm.reason" type="textarea" :rows="4" maxlength="500" show-word-limit /></el-form-item>
      </el-form>
      <template #footer><el-button :disabled="Boolean(actionKey)" @click="showSanctionDialog = false">取消</el-button><el-button type="danger" :loading="actionKey === 'sanction:create'" :disabled="Boolean(actionKey)" @click="createSanction">确认处罚</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";
import { isPlatformAdmin } from "../permissions";
import { maskPhone } from "../privacy";

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const loadError = ref("");
const tenantLoadError = ref("");
const actionKey = ref("");
const activeTab = ref("activities");
const forumTab = ref("categories");
const governanceTab = ref("keywords");
const tenants = ref<any[]>([]);
const activities = ref<any[]>([]);
const checkinTasks = ref<any[]>([]);
const posts = ref<any[]>([]);
const comments = ref<any[]>([]);
const socialProfiles = ref<any[]>([]);
const communityOverview = ref<any>({ kpis: {}, todos: [], alerts: [] });
const forumOverview = ref<any>({ kpis: {}, todos: [], alerts: [] });
const forumCategories = ref<any[]>([]);
const forumTopics = ref<any[]>([]);
const forumReplies = ref<any[]>([]);
const forumReports = ref<any[]>([]);
const contentKeywordRules = ref<any[]>([]);
const communityContentReports = ref<any[]>([]);
const contentSanctions = ref<any[]>([]);
const contentAppeals = ref<any[]>([]);
const forumModerators = ref<any[]>([]);
const forumModeratorCandidates = ref<any[]>([]);
const showForm = ref(false);
const editingActivity = ref(false);
const activityForm = ref<any>({ title:"", startTime:"", endTime:"", joinMode:"open", memberLimit:undefined, inviteCode:"", location:"", status:"draft", description:"" });
const savingActivity = ref(false);
const showCheckinForm = ref(false);
const editingCheckin = ref(false);
const checkinForm = ref<any>({ date:"", activityId:undefined, title:"", description:"", checkinType:"text", requireApproval:false, allowMakeup:false, makeupWithinDays:3 });
const showMembers=ref(false),membersActivity=ref<any>(),activityMembers=ref<any[]>([]),checkinReviews=ref<any[]>([]);
const memberLoading = ref(false);
const memberError = ref("");
const checkinReviewLoading = ref(false);
const checkinReviewError = ref("");
const savingCheckin = ref(false);
const showPostForm = ref(false);
const savingPost = ref(false);
const postForm = ref<any>({ content: "", imagesText: "", visible: true });
const showPostReviewDialog = ref(false);
const savingPostReview = ref(false);
const postReviewForm = ref<any>({ id: undefined, status: "pending", visible: true, reviewRemark: "" });
const postFilters = reactive({ status: "", source: "", activityId: "" });
const forumFilters = reactive({ topicStatus: "", categoryId: "", keyword: "", replyStatus: "", topicId: "", reportStatus: "pending" });
const showForumCategoryDialog = ref(false);
const savingForumCategory = ref(false);
const forumCategoryForm = ref<any>({ name: "", description: "", sortOrder: 0, enabled: true, postPermission: "user", auditMode: "pre" });
const showForumModeratorDialog = ref(false);
const moderatorCategory = ref<any>(null);
const selectedModeratorAdminId = ref<number>();
const categoryModerators = computed(() => forumModerators.value.filter((item) => item.category?.id === moderatorCategory.value?.id));
const showKeywordDialog = ref(false);
const keywordForm = ref<any>({ keyword: "", scope: "all", matchMode: "contains", action: "review", replacement: "", enabled: true });
const showSanctionDialog = ref(false);
const sanctionForm = ref<any>({ userId: undefined, type: "mute", scope: "all", endsAt: null, reason: "" });
const communityAlerts = computed(() => Array.isArray(communityOverview.value?.alerts) ? communityOverview.value.alerts : []);
const forumAlerts = computed(() => Array.isArray(forumOverview.value?.alerts) ? forumOverview.value.alerts : []);
const communityMetricCards = computed(() => {
  const kpis = communityOverview.value?.kpis || {};
  return [
    { label: "共修活动", value: kpis.activities || 0 },
    { label: "打卡任务", value: kpis.checkinTasks || 0 },
    { label: "待审核动态", value: kpis.pendingPosts || 0 },
    { label: "待审核评论", value: kpis.pendingComments || 0 },
    { label: "今日互动", value: kpis.todayInteraction || 0 }
  ];
});
const forumMetricCards = computed(() => {
  const kpis = forumOverview.value?.kpis || {};
  return [
    { label: "论坛版块", value: kpis.categories || 0 },
    { label: "帖子总数", value: kpis.topics || 0 },
    { label: "待审核帖子", value: kpis.pendingTopics || 0 },
    { label: "待审核回复", value: kpis.pendingReplies || 0 },
    { label: "待处理举报", value: kpis.pendingReports || 0 },
    { label: "今日论坛互动", value: kpis.todayInteraction || 0 }
  ];
});
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
  if (loading.value) return;
  loading.value = true;
  loadError.value = "";
  try {
    const params = { tenantId: isPlatformAdmin() ? filters.tenantId || undefined : undefined };
    const activityId = Number(postFilters.activityId || 0) || undefined;
    const postParams = { ...params, status: postFilters.status || undefined, source: postFilters.source || undefined, activityId };
    const forumTopicParams = {
      ...params,
      status: forumFilters.topicStatus || undefined,
      categoryId: Number(forumFilters.categoryId || 0) || undefined,
      keyword: forumFilters.keyword.trim() || undefined
    };
    const forumReplyParams = {
      ...params,
      status: forumFilters.replyStatus || undefined,
      topicId: Number(forumFilters.topicId || 0) || undefined
    };
    const forumReportParams = { ...params, status: forumFilters.reportStatus || undefined };
    const [communityOverviewData, actRows, chkRows, postRows, commentRows, socialRows, communityReportRows, keywordRows, sanctionRows, appealRows] = await Promise.all([
      api.get<any, any>("/admin/community/overview", { params }),
      api.get<any, any[]>("/admin/community-activities", { params }),
      api.get<any, any[]>("/admin/checkin-tasks", { params }),
      api.get<any, any[]>("/admin/community-posts", { params: postParams }),
      api.get<any, any[]>("/admin/community-post-comments", { params }),
      api.get<any, any[]>("/admin/social-profiles", { params }),
      api.get<any, any[]>("/admin/community-content-reports", { params: { ...params, status: "pending" } }),
      api.get<any, any[]>("/admin/content-keyword-rules", { params }),
      api.get<any, any[]>("/admin/content-sanctions", { params }),
      api.get<any, any[]>("/admin/content-appeals", { params })
    ]);
    const forumResults = await Promise.allSettled([
      api.get<any, any>("/admin/forum/overview", { params }),
      api.get<any, any[]>("/admin/forum/categories", { params }),
      api.get<any, any[]>("/admin/forum/moderators", { params }),
      api.get<any, any[]>("/admin/forum/topics", { params: forumTopicParams }),
      api.get<any, any[]>("/admin/forum/replies", { params: forumReplyParams }),
      api.get<any, any[]>("/admin/forum/reports", { params: forumReportParams })
    ]);
    const forumValue = <T,>(index: number, fallback: T): T => forumResults[index]?.status === "fulfilled" ? forumResults[index].value as T : fallback;
    communityOverview.value = communityOverviewData || { kpis: {}, todos: [], alerts: [] };
    forumOverview.value = forumValue(0, { kpis: {}, todos: [], alerts: [] });
    activities.value = actRows;
    checkinTasks.value = chkRows;
    posts.value = postRows;
    comments.value = commentRows;
    socialProfiles.value = socialRows;
    forumCategories.value = forumValue(1, []);
    forumModerators.value = forumValue(2, []);
    forumTopics.value = forumValue(3, []);
    forumReplies.value = forumValue(4, []);
    forumReports.value = forumValue(5, []);
    communityContentReports.value = communityReportRows;
    contentKeywordRules.value = keywordRows;
    contentSanctions.value = sanctionRows;
    contentAppeals.value = appealRows;
  } catch (error: any) {
    loadError.value = error.message || "加载共修数据失败";
  } finally {
    loading.value = false;
  }
}

function moderatorCount(categoryId: number) {
  return forumModerators.value.filter((item) => item.category?.id === categoryId).length;
}

async function openForumModerators(category: any) {
  moderatorCategory.value = category;
  selectedModeratorAdminId.value = undefined;
  try {
    forumModeratorCandidates.value = await api.get<any, any[]>("/admin/forum/moderator-candidates", { params: { tenantId: category.tenant?.id || undefined } });
    showForumModeratorDialog.value = true;
  } catch (error: any) {
    ElMessage.error(error.message || "加载版主候选人失败");
  }
}

async function addForumModerator() {
  if (!moderatorCategory.value?.id || !selectedModeratorAdminId.value || actionKey.value) return;
  actionKey.value = "moderator:add";
  try {
    await api.post(`/admin/forum/categories/${moderatorCategory.value.id}/moderators`, { adminId: selectedModeratorAdminId.value });
    selectedModeratorAdminId.value = undefined;
    await load();
    ElMessage.success("版主已添加");
  } catch (error: any) {
    ElMessage.error(error.message || "添加版主失败");
  } finally {
    actionKey.value = "";
  }
}

async function removeForumModerator(row: any) {
  if (actionKey.value) return;
  actionKey.value = `moderator:remove:${row.id}`;
  try {
    await ElMessageBox.confirm(`确认移除版主「${row.admin?.username || row.id}」？`, "移除版主", { type: "warning" });
    await api.delete(`/admin/forum/moderators/${row.id}`);
    await load();
    ElMessage.success("版主已移除");
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "移除版主失败");
  } finally {
    actionKey.value = "";
  }
}

function governanceScopeText(scope: string) {
  return scope === "community" ? "社区" : scope === "forum" ? "论坛" : "全部";
}

function keywordActionText(action: string) {
  return action === "reject" ? "拒绝发布" : action === "mask" ? "自动替换" : "转人工审核";
}

function sanctionStatusText(status: string) {
  return status === "active" ? "生效中" : status === "revoked" ? "已解除" : "已到期";
}

function appealStatusText(status: string) {
  return status === "approved" ? "已通过" : status === "rejected" ? "已驳回" : "待处理";
}

async function reviewCommunityReport(row: any, action: "hide" | "sanction" | "reject") {
  if (actionKey.value) return;
  actionKey.value = `community-report:${action}:${row.id}`;
  try {
    const result = await ElMessageBox.prompt("请填写处理说明", action === "reject" ? "驳回举报" : action === "sanction" ? "处罚并隐藏" : "处理并隐藏", { inputType: "textarea", inputValidator: (value) => Boolean(String(value || "").trim()) || "请填写处理说明" });
    await api.post(`/admin/community-content-reports/${row.id}/review`, {
      status: action === "reject" ? "rejected" : "resolved",
      action: action === "reject" ? "none" : action,
      sanctionType: action === "sanction" ? "mute" : undefined,
      handleRemark: String(result.value || "").trim()
    });
    await load();
    ElMessage.success("举报已处理");
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "处理举报失败");
  } finally {
    actionKey.value = "";
  }
}

function openKeywordRule(row?: any) {
  keywordForm.value = row ? { ...row, tenantId: row.tenant?.id || null } : { keyword: "", scope: "all", matchMode: "contains", action: "review", replacement: "", enabled: true, tenantId: filters.tenantId || null };
  showKeywordDialog.value = true;
}

async function saveKeywordRule() {
  if (!keywordForm.value.keyword?.trim()) return ElMessage.error("请填写关键词");
  if (actionKey.value) return;
  actionKey.value = "keyword:save";
  try {
    const dto = {
      keyword: keywordForm.value.keyword.trim(),
      scope: keywordForm.value.scope,
      matchMode: keywordForm.value.matchMode,
      action: keywordForm.value.action,
      replacement: keywordForm.value.replacement?.trim() || null,
      enabled: Boolean(keywordForm.value.enabled),
      tenantId: isPlatformAdmin() ? keywordForm.value.tenantId || null : undefined
    };
    if (keywordForm.value.id) await api.patch(`/admin/content-keyword-rules/${keywordForm.value.id}`, dto);
    else await api.post("/admin/content-keyword-rules", dto);
    showKeywordDialog.value = false;
    await load();
    ElMessage.success("关键词规则已保存");
  } catch (error: any) {
    ElMessage.error(error.message || "保存关键词规则失败");
  } finally {
    actionKey.value = "";
  }
}

async function deleteKeywordRule(row: any) {
  if (actionKey.value) return;
  actionKey.value = `keyword:delete:${row.id}`;
  try {
    await ElMessageBox.confirm(`确认删除关键词「${row.keyword}」？`, "删除规则", { type: "warning" });
    await api.delete(`/admin/content-keyword-rules/${row.id}`);
    await load();
    ElMessage.success("规则已删除");
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "删除规则失败");
  } finally {
    actionKey.value = "";
  }
}

function openSanction() {
  sanctionForm.value = { userId: undefined, type: "mute", scope: "all", endsAt: null, reason: "", tenantId: filters.tenantId || null };
  showSanctionDialog.value = true;
}

async function createSanction() {
  if (!sanctionForm.value.userId) return ElMessage.error("请填写用户ID");
  if (!sanctionForm.value.reason?.trim()) return ElMessage.error("请填写处罚原因");
  if (actionKey.value) return;
  actionKey.value = "sanction:create";
  try {
    await api.post("/admin/content-sanctions", { ...sanctionForm.value, reason: sanctionForm.value.reason.trim() });
    showSanctionDialog.value = false;
    await load();
    ElMessage.success("处罚已生效");
  } catch (error: any) {
    ElMessage.error(error.message || "创建处罚失败");
  } finally {
    actionKey.value = "";
  }
}

async function revokeSanction(row: any) {
  if (actionKey.value) return;
  actionKey.value = `sanction:revoke:${row.id}`;
  try {
    const result = await ElMessageBox.prompt("请填写解除说明", "解除处罚", { inputValue: "人工审核后解除", inputType: "textarea", inputValidator: (value) => Boolean(String(value || "").trim()) || "请填写解除说明" });
    await api.post(`/admin/content-sanctions/${row.id}/revoke`, { remark: String(result.value || "").trim() });
    await load();
    ElMessage.success("处罚已解除");
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "解除处罚失败");
  } finally {
    actionKey.value = "";
  }
}

async function reviewAppeal(row: any, status: "approved" | "rejected") {
  if (actionKey.value) return;
  actionKey.value = `appeal:${status}:${row.id}`;
  try {
    const result = await ElMessageBox.prompt("请填写处理说明", status === "approved" ? "通过申诉" : "驳回申诉", { inputType: "textarea", inputValidator: (value) => Boolean(String(value || "").trim()) || "请填写处理说明" });
    await api.post(`/admin/content-appeals/${row.id}/review`, { status, handleRemark: String(result.value || "").trim() });
    await load();
    ElMessage.success("申诉已处理");
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "处理申诉失败");
  } finally {
    actionKey.value = "";
  }
}

async function loadTenants() {
  tenantLoadError.value = "";
  try {
    tenants.value = isPlatformAdmin() ? await api.get<any, any[]>("/admin/tenants") : [];
  } catch (error: any) {
    tenants.value = [];
    tenantLoadError.value = error.message || "商家列表加载失败";
  }
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
  const activityId = Number(row?.activityId || row?.activity?.id || 0) || "unassigned";
  return `${tenantId}:${activityId}:${date}`;
}

function isDuplicateCheckinTask(row: any) {
  const key = checkinTaskDuplicateKey(row);
  if (!key) return false;
  return checkinTasks.value.filter((task) => checkinTaskDuplicateKey(task) === key).length > 1;
}

function findDuplicateCheckinTask(dto: any) {
  const key = checkinTaskDuplicateKey({ date: dto.date, tenantId: dto.tenantId || "platform", activityId: dto.activityId });
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
    activityForm.value = { title:"", startTime:"", endTime:"", joinMode:"open", memberLimit:undefined, inviteCode:"", location:"", status:"draft", description:"", tenantId: filters.tenantId };
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
  if (actionKey.value) return;
  actionKey.value = `activity:delete:${row.id}`;
  try {
    await ElMessageBox.confirm(`确认删除共修活动「${row.title}」？`, "删除共修活动", { type: "warning" });
    await api.delete("/admin/community-activities/" + row.id);
    await load();
    ElMessage.success("共修活动已删除");
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "删除共修活动失败");
  } finally {
    actionKey.value = "";
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
      const activity = duplicate.activity?.title || activities.value.find((item) => Number(item.id) === Number(dto.activityId))?.title || "未关联活动";
      ElMessage.error(`${scope}的共学活动「${activity}」在 ${dto.date} 已有打卡任务「${duplicate.title}」，请编辑已有任务或删除重复任务`);
      return;
    }
    if (editingCheckin.value && dto.id) {
      await api.patch("/admin/checkin-tasks/" + dto.id, dto);
    } else {
      await api.post("/admin/checkin-tasks", dto);
    }
    showCheckinForm.value = false;
    editingCheckin.value = false;
    checkinForm.value = { date:"", activityId:undefined, title:"", description:"", checkinType:"text", requireApproval:false, allowMakeup:false, makeupWithinDays:3, tenantId: filters.tenantId };
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
  if (actionKey.value) return;
  actionKey.value = `checkin-task:delete:${row.id}`;
  try {
    await ElMessageBox.confirm(`确认删除打卡任务「${row.title}」？`, "删除打卡任务", { type: "warning" });
    await api.delete("/admin/checkin-tasks/" + row.id);
    await load();
    ElMessage.success("打卡任务已删除");
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "删除打卡任务失败");
  } finally {
    actionKey.value = "";
  }
}

async function deletePost(row: any) {
  if (actionKey.value) return;
  actionKey.value = `post:delete:${row.id}`;
  try {
    await ElMessageBox.confirm("确认删除这条学员动态？", "删除动态", { type: "warning" });
    await api.delete("/admin/community-posts/" + row.id);
    await load();
    ElMessage.success("动态已删除");
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "删除动态失败");
  } finally {
    actionKey.value = "";
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

async function openMembers(row: any) {
  if (!row?.id || memberLoading.value) return;
  membersActivity.value = row;
  showMembers.value = true;
  memberLoading.value = true;
  memberError.value = "";
  try {
    activityMembers.value = await api.get<any, any[]>(`/admin/community-activities/${row.id}/members`);
  } catch (error: any) {
    activityMembers.value = [];
    memberError.value = error.message || "共学成员加载失败";
  } finally {
    memberLoading.value = false;
  }
}

async function reloadMembers() {
  if (membersActivity.value) await openMembers(membersActivity.value);
}

async function reviewMember(row: any, action: "approve" | "reject") {
  if (actionKey.value) return;
  actionKey.value = `member:${action}:${row.id}`;
  try {
    await api.post(`/admin/community-activity-members/${row.id}/review`, { action });
    await reloadMembers();
    ElMessage.success(action === "approve" ? "成员已通过" : "成员已拒绝");
  } catch (error: any) {
    ElMessage.error(error.message || "成员审核失败");
  } finally {
    actionKey.value = "";
  }
}

async function loadCheckinReviews() {
  if (checkinReviewLoading.value) return;
  checkinReviewLoading.value = true;
  checkinReviewError.value = "";
  try {
    checkinReviews.value = await api.get<any, any[]>("/admin/community-checkins", { params: { tenantId: filters.tenantId } });
  } catch (error: any) {
    checkinReviews.value = [];
    checkinReviewError.value = error.message || "打卡审核列表加载失败";
  } finally {
    checkinReviewLoading.value = false;
  }
}

async function reviewCheckin(row: any, action: "approve" | "reject") {
  if (actionKey.value) return;
  actionKey.value = `checkin-review:${action}:${row.checkin_id}`;
  try {
    await api.post(`/admin/community-checkins/${row.checkin_id}/review`, { action });
    await loadCheckinReviews();
    ElMessage.success(action === "approve" ? "打卡已通过" : "打卡已拒绝");
  } catch (error: any) {
    ElMessage.error(error.message || "打卡审核失败");
  } finally {
    actionKey.value = "";
  }
}

function forumStatusText(status: string) {
  if (status === "approved") return "已通过";
  if (status === "rejected") return "已拒绝";
  if (status === "hidden") return "已隐藏";
  return "待审核";
}

function forumStatusTag(status: string) {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  if (status === "hidden") return "info";
  return "warning";
}

function forumReportStatusText(status: string) {
  if (status === "resolved") return "已处理";
  if (status === "rejected") return "已驳回";
  return "待处理";
}

function forumReportStatusTag(status: string) {
  if (status === "resolved") return "success";
  if (status === "rejected") return "info";
  return "warning";
}

function forumAuditModeText(value: string) {
  if (value === "post") return "先发后审";
  if (value === "closed") return "关闭发帖";
  return "先审后发";
}

function forumPostPermissionText(value: string) {
  return value === "admin" ? "仅运营" : "用户可发";
}

function forumReportTarget(row: any) {
  if (row.reply) return `回复 #${row.reply.id}：${row.reply.content || ""}`;
  if (row.topic) return `帖子 #${row.topic.id}：${row.topic.title || ""}`;
  return "-";
}

function openForumCategory(row?: any) {
  forumCategoryForm.value = row
    ? { ...row, tenantId: row.tenant?.id }
    : { name: "", description: "", sortOrder: 0, enabled: true, postPermission: "user", auditMode: "pre", tenantId: filters.tenantId };
  showForumCategoryDialog.value = true;
}

async function saveForumCategory() {
  if (!forumCategoryForm.value.name?.trim()) return ElMessage.error("请输入版块名称");
  try {
    savingForumCategory.value = true;
    const dto: any = {
      name: forumCategoryForm.value.name.trim(),
      description: forumCategoryForm.value.description?.trim() || "",
      sortOrder: Number(forumCategoryForm.value.sortOrder || 0),
      enabled: forumCategoryForm.value.enabled !== false,
      postPermission: forumCategoryForm.value.postPermission || "user",
      auditMode: forumCategoryForm.value.auditMode || "pre"
    };
    if (isPlatformAdmin()) dto.tenantId = forumCategoryForm.value.tenantId || null;
    if (forumCategoryForm.value.id) await api.patch(`/admin/forum/categories/${forumCategoryForm.value.id}`, dto);
    else await api.post("/admin/forum/categories", dto);
    showForumCategoryDialog.value = false;
    await load();
    ElMessage.success("论坛版块已保存");
  } catch (error: any) {
    ElMessage.error(error.message || "保存论坛版块失败");
  } finally {
    savingForumCategory.value = false;
  }
}

async function deleteForumCategory(row: any) {
  if (actionKey.value) return;
  actionKey.value = `forum-category:delete:${row.id}`;
  try {
    await ElMessageBox.confirm(`确认删除论坛版块「${row.name}」？已有帖子时建议停用，不建议删除。`, "删除论坛版块", { type: "warning" });
    await api.delete(`/admin/forum/categories/${row.id}`);
    await load();
    ElMessage.success("论坛版块已删除");
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "删除论坛版块失败");
  } finally {
    actionKey.value = "";
  }
}

async function convertPostToForum(row: any) {
  if (actionKey.value) return;
  actionKey.value = `post:convert:${row.id}`;
  try {
    await ElMessageBox.confirm("确认把这条共修动态转成论坛帖子？原动态会保留，论坛会新增一条帖子。", "转为论坛帖子", { type: "info" });
    await api.post(`/admin/forum/topics/${row.id}/convert-from-community-post`, {});
    activeTab.value = "forum";
    forumTab.value = "topics";
    await load();
    ElMessage.success("已转为论坛帖子");
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "转为论坛帖子失败");
  } finally {
    actionKey.value = "";
  }
}

async function reviewForumTopic(row: any, status: "approved" | "rejected" | "hidden") {
  if (actionKey.value) return;
  actionKey.value = `topic:${status}:${row.id}`;
  try {
    let reviewRemark = row.reviewRemark || "";
    if (status !== "approved") {
      const result = await ElMessageBox.prompt("可填写审核备注", status === "hidden" ? "隐藏帖子" : "拒绝帖子", {
        inputValue: reviewRemark,
        inputType: "textarea",
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        inputValidator: (value) => Boolean(String(value || "").trim()) || "请填写审核备注"
      });
      reviewRemark = String(result.value || "").trim();
    }
    await api.patch(`/admin/forum/topics/${row.id}`, { status, reviewRemark });
    await load();
    ElMessage.success(status === "approved" ? "帖子已通过" : status === "hidden" ? "帖子已隐藏" : "帖子已拒绝");
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "审核帖子失败");
  } finally {
    actionKey.value = "";
  }
}

async function toggleForumTopicPin(row: any) {
  if (actionKey.value) return;
  actionKey.value = `topic:pin:${row.id}`;
  try {
    await api.post(`/admin/forum/topics/${row.id}/pin`, { pinned: !row.pinned });
    await load();
    ElMessage.success(row.pinned ? "已取消置顶" : "帖子已置顶");
  } catch (error: any) {
    ElMessage.error(error.message || "更新置顶失败");
  } finally {
    actionKey.value = "";
  }
}

async function toggleForumTopicFeature(row: any) {
  if (actionKey.value) return;
  actionKey.value = `topic:feature:${row.id}`;
  try {
    await api.post(`/admin/forum/topics/${row.id}/feature`, { featured: !row.featured });
    await load();
    ElMessage.success(row.featured ? "已取消精华" : "帖子已设为精华");
  } catch (error: any) {
    ElMessage.error(error.message || "更新精华失败");
  } finally {
    actionKey.value = "";
  }
}

async function toggleForumTopicLock(row: any) {
  if (actionKey.value) return;
  actionKey.value = `topic:lock:${row.id}`;
  try {
    let reason = "";
    if (!row.locked) {
      const result = await ElMessageBox.prompt("请填写锁帖原因", "锁定帖子", {
        inputValue: "话题已结束，暂停回复",
        inputType: "textarea",
        confirmButtonText: "锁定",
        cancelButtonText: "取消",
        inputValidator: (value) => Boolean(String(value || "").trim()) || "请填写锁帖原因"
      });
      reason = String(result.value || "").trim();
    } else {
      await ElMessageBox.confirm("确认解锁该帖子并恢复用户回复？", "解锁帖子", { type: "info" });
    }
    await api.post(`/admin/forum/topics/${row.id}/lock`, { locked: !row.locked, reason });
    await load();
    ElMessage.success(row.locked ? "帖子已解锁" : "帖子已锁定");
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "更新锁帖状态失败");
  } finally {
    actionKey.value = "";
  }
}

async function reviewForumReply(row: any, status: "approved" | "rejected" | "hidden") {
  if (actionKey.value) return;
  actionKey.value = `reply:${status}:${row.id}`;
  try {
    let reviewRemark = row.reviewRemark || "";
    if (status !== "approved") {
      const result = await ElMessageBox.prompt("可填写审核备注", status === "hidden" ? "隐藏回复" : "拒绝回复", {
        inputValue: reviewRemark,
        inputType: "textarea",
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        inputValidator: (value) => Boolean(String(value || "").trim()) || "请填写审核备注"
      });
      reviewRemark = String(result.value || "").trim();
    }
    await api.patch(`/admin/forum/replies/${row.id}`, { status, reviewRemark });
    await load();
    ElMessage.success(status === "approved" ? "回复已通过" : status === "hidden" ? "回复已隐藏" : "回复已拒绝");
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "审核回复失败");
  } finally {
    actionKey.value = "";
  }
}

async function handleForumReport(row: any, status: "resolved" | "rejected") {
  if (actionKey.value) return;
  actionKey.value = `forum-report:${status}:${row.id}`;
  try {
    const result = await ElMessageBox.prompt("填写处理备注", status === "resolved" ? "处理举报" : "驳回举报", {
      inputValue: row.handleRemark || "",
      inputType: "textarea",
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      inputValidator: (value) => Boolean(String(value || "").trim()) || "请填写处理备注"
    });
    await api.patch(`/admin/forum/reports/${row.id}`, { status, handleRemark: String(result.value || "").trim(), hideTarget: status === "resolved" });
    await load();
    ElMessage.success(status === "resolved" ? "举报已处理" : "举报已驳回");
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "处理举报失败");
  } finally {
    actionKey.value = "";
  }
}

function statusText(status: string) {
  if (status === "approved") return "已通过";
  if (status === "rejected") return "已拒绝";
  return "待审核";
}

async function reviewComment(row: any, status: "approved" | "rejected") {
  if (actionKey.value) return;
  actionKey.value = `comment:${status}:${row.id}`;
  try {
    await api.patch("/admin/community-post-comments/" + row.id, { status });
    await load();
    ElMessage.success(status === "approved" ? "评论已通过" : "评论已拒绝");
  } catch (error: any) {
    ElMessage.error(error.message || "审核评论失败");
  } finally {
    actionKey.value = "";
  }
}

async function reviewSocialProfile(row: any, status: "approved" | "rejected") {
  if (actionKey.value) return;
  actionKey.value = `social:${status}:${row.id}`;
  try {
    let reviewRemark = "";
    if (status === "rejected") {
      const result = await ElMessageBox.prompt("请填写需要用户修改的内容", "拒绝社交资料", { inputType: "textarea", inputValidator: (value) => Boolean(String(value || "").trim()) || "请填写审核说明" });
      reviewRemark = String(result.value || "").trim();
    }
    await api.patch(`/admin/social-profiles/${row.id}`, { status, visible: status === "approved", reviewRemark });
    await load();
    ElMessage.success(status === "approved" ? "社交资料已通过" : "社交资料已退回修改");
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "审核社交资料失败");
  } finally {
    actionKey.value = "";
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

watch(activeTab, (tab) => {
  if (tab === "checkin-review" && !checkinReviewLoading.value) void loadCheckinReviews();
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
.overview-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.overview-card { min-width: 0; padding: 14px 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; display: grid; gap: 6px; }
.overview-card span { color: #667085; font-size: 13px; }
.overview-card strong { color: #111827; font-size: 24px; line-height: 1.2; }
.forum-overview { grid-template-columns: repeat(6, minmax(0, 1fr)); margin-top: 4px; }
.alert-stack { display: grid; gap: 8px; margin-bottom: 16px; }
.tab-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; color: #64748b; font-size: 13px; }
.forum-tabs { margin-top: 8px; }
.muted-line { margin-top: 4px; color: #667085; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 1100px) {
  .overview-grid,
  .forum-overview { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .tab-toolbar { flex-wrap: wrap; }
}
</style>

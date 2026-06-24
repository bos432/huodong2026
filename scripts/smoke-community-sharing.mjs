const baseUrl = process.env.API_BASE || "http://localhost:3000/api";
const runId = Date.now();

async function api(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok || body?.code !== 0) throw new Error(`${options.method || "GET"} ${path} failed: ${body?.message || text || res.status}`);
  return body.data;
}

async function upload(path, fileName, mimeType, bytes, headers = {}) {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mimeType }), fileName);
  const res = await fetch(`${baseUrl}${path}`, { method: "POST", headers, body: form });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok || body?.code !== 0) throw new Error(`POST ${path} failed: ${body?.message || text || res.status}`);
  return body.data;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

function futureDate(days, hour = 10) {
  const date = new Date(Date.now() + days * 86400000);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString().slice(0, 19).replace("T", " ");
}

async function h5Login(phone, nickname) {
  const code = await api("/public/auth/h5-code", {
    method: "POST",
    body: JSON.stringify({ phone })
  });
  assert(code.verificationToken, "H5 verification token missing");
  const login = await api("/public/auth/h5-login", {
    method: "POST",
    body: JSON.stringify({ phone, nickname, verificationToken: code.verificationToken, verificationCode: code.devCode || "000000" })
  });
  assert(login.userAccessToken, "H5 user access token missing");
  return { ...(login.user || login), userAccessToken: login.userAccessToken, headers: auth(login.userAccessToken) };
}

function activityPayload() {
  return {
    title: `心得分享烟测活动 ${runId}`,
    coverUrl: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
    description: "用于验证参与者活动心得发布、审核、公开展示和分享统计。",
    notice: "自动烟测活动，保留用于验收追踪。",
    location: "烟测书院共修空间",
    startTime: futureDate(7, 14),
    endTime: futureDate(7, 16),
    registrationDeadline: futureDate(6, 20),
    capacity: 30,
    price: 0,
    status: "open",
    featured: false,
    requireReview: false,
    allowCancel: true,
    fields: [
      { label: "姓名", type: "text", required: true, sortOrder: 1, options: [] },
      { label: "手机号", type: "phone", required: true, sortOrder: 2, options: [] },
      { label: "备注", type: "remark", required: false, sortOrder: 3, options: [] }
    ],
    hosts: [{ name: "心得烟测主理人", title: "运营测试", avatarUrl: "", bio: "用于自动化验证。", sortOrder: 1 }],
    sections: [{ type: "highlights", title: "烟测亮点", content: "验证活动参与后发布心得。", sortOrder: 1 }]
  };
}

function answers(fields = []) {
  return fields.map((field) => {
    let value = `心得烟测 ${runId}`;
    if (String(field.label || "").includes("姓名")) value = `心得用户${String(runId).slice(-4)}`;
    if (String(field.label || "").includes("手机") || field.type === "phone") value = `139${String(runId).slice(-8)}`;
    return { fieldId: field.id, label: field.label, type: field.type, value };
  });
}

function pngBytes() {
  return Uint8Array.from(Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64"
  ));
}

async function main() {
  console.log(`Community sharing smoke target: ${baseUrl}`);
  const health = await api("/health");
  assert(health.api === "up" && health.database === "up", "Health check failed");

  const login = await api("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: process.env.SMOKE_ADMIN_USERNAME || "admin", password: process.env.SMOKE_ADMIN_PASSWORD || "Admin123456" })
  });
  assert(login.token, "Admin token missing");
  const adminHeaders = auth(login.token);

  const activity = await api("/admin/activities", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify(activityPayload())
  });
  assert(activity.id && activity.fields?.length, "Activity should be created with fields");

  const user = await h5Login(`139${String(runId).slice(-8)}`, `心得烟测用户${String(runId).slice(-4)}`);
  const registered = await api(`/public/activities/${activity.id}/register`, {
    method: "POST",
    headers: user.headers,
    body: JSON.stringify({ answers: answers(activity.fields) })
  });
  assert(registered.registration?.id, "Registration id missing");

  const code = await api(`/public/me/registrations/${registered.registration.id}/check-in-code`, { headers: user.headers });
  assert(code.code, "Check-in code missing");
  await api("/admin/check-ins", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ code: code.code, remark: "心得分享烟测签到" })
  });

  const postable = await api("/public/me/community/postable-activities", { headers: user.headers });
  assert(Array.isArray(postable) && postable.some((item) => item.id === activity.id), "Checked-in activity should be postable");

  const uploaded = await upload("/public/me/community/post-images", `community-smoke-${runId}.png`, "image/png", pngBytes(), user.headers);
  assert(uploaded.url?.includes("/uploads/community-posts/"), "Community post image upload should return uploads URL");

  const content = `这是一次自动化心得烟测：现场共修流程清晰，适合新同学理解活动价值。${runId}`;
  const created = await api("/public/community/posts", {
    method: "POST",
    headers: user.headers,
    body: JSON.stringify({
      activityId: activity.id,
      content,
      images: [uploaded.url],
      city: "烟测城市",
      tags: ["烟测", "心得"],
      posterConfig: { theme: "classic" }
    })
  });
  assert(created.post?.id, "Participant post id missing");
  assert(created.post.status === "pending", "Participant post should be pending before review");
  assert(created.post.source === "participant", "Participant post should keep participant source");

  const publicBefore = await api(`/public/community/posts?activityId=${activity.id}`, { headers: user.headers });
  assert(!publicBefore.some((item) => item.id === created.post.id), "Pending post should not be publicly visible");

  const pending = await api(`/admin/community-posts?status=pending&source=participant&activityId=${activity.id}&limit=20`, { headers: adminHeaders });
  assert(pending.some((item) => item.id === created.post.id), "Admin pending list should include participant post");

  const approved = await api(`/admin/community-posts/${created.post.id}`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ status: "approved", visible: true, reviewRemark: "心得分享烟测通过" })
  });
  assert(approved.status === "approved" && approved.visible === true && approved.approvedAt, "Approved post should be visible with approvedAt");

  const publicAfter = await api(`/public/community/posts?activityId=${activity.id}`, { headers: user.headers });
  assert(publicAfter.some((item) => item.id === created.post.id && item.activity?.id === activity.id), "Approved post should be publicly visible with activity");

  const detail = await api(`/public/community/posts/${created.post.id}`, { headers: user.headers });
  assert(detail.id === created.post.id && detail.activity?.title === activity.title, "Public post detail should include activity title");

  const share = await api(`/public/community/posts/${created.post.id}/share`, { method: "POST", headers: user.headers });
  assert(Number(share.shareCount || 0) >= 1, "Share count should increase");

  const visualSection = await api("/admin/homepage/sections?pageKey=home", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      type: "testimonial_feed",
      title: `心得烟测模块 ${runId}`,
      subtitle: "用于验证 H5 装修视觉配置可保存并公开读取",
      enabled: true,
      sortOrder: 880,
      config: { source: "participant", limit: 3, link: "/pages/community/index" },
      layout: {
        primaryColor: "#5b8c5a",
        accentColor: "#0f766e",
        textColor: "#173b28",
        mutedColor: "#4b6b57",
        backgroundColor: "#f0fdf4",
        fontStyle: "system",
        density: "compact",
        buttonStyle: "pill",
        cardStyle: "outlined",
        dividerStyle: "line",
        borderRadius: 8,
        spacingBottom: 18
      }
    })
  });
  assert(visualSection.layout?.primaryColor === "#5b8c5a" && visualSection.type === "testimonial_feed", "Visual homepage section should save layout controls");

  const homepage = await api("/public/homepage", { headers: user.headers });
  const publicSection = (homepage.sections || []).find((item) => item.id === visualSection.id);
  assert(publicSection?.layout?.primaryColor === "#5b8c5a", "Public homepage should expose visual layout controls");
  assert(Array.isArray(publicSection?.data?.posts), "Public testimonial section should include posts data");

  console.log("Community sharing smoke test passed.");
  console.log(JSON.stringify({ activityId: activity.id, registrationId: registered.registration.id, postId: created.post.id, homepageSectionId: visualSection.id }, null, 2));
}

main().catch((error) => {
  console.error("\nCommunity sharing smoke test failed:");
  console.error(error.message);
  process.exitCode = 1;
});

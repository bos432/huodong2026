const API_BASE = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const TENANT_CODE = "qiwai-showcase";
const stamp = Date.now();

function assert(condition, message) { if (!condition) throw new Error(message); }
async function raw(path, { method = "GET", token, body, tenantCode = TENANT_CODE } = {}) {
  const response = await fetch(`${API_BASE}${path}`, { method, headers: { "content-type": "application/json", "x-tenant-code": tenantCode, ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload, text };
}
async function request(path, options = {}) {
  const result = await raw(path, options);
  assert(result.response.ok && result.payload?.code === 0, `${options.method || "GET"} ${path} failed (${result.response.status}): ${result.text}`);
  return result.payload.data;
}

const ops = await request("/admin/auth/login", { method: "POST", body: { username: "showcase_ops", password: "Qiwai123456" } });
const authorLogin = await request("/public/auth/password-login", { method: "POST", body: { phone: "13990000002", password: "Qiwai123456" } });
const commenterPhone = `1318${String(stamp).slice(-7)}`;
const commenterLogin = await request("/public/auth/password-login", { method: "POST", body: { phone: commenterPhone, password: "Qiwai123456" } });
const author = { id: Number(authorLogin.user.id), phone: authorLogin.user.phone, token: authorLogin.userAccessToken };
const commenter = { id: Number(commenterLogin.user.id), phone: commenterPhone, token: commenterLogin.userAccessToken };

const postable = await request(`/public/me/community/postable-activities?tenantCode=${TENANT_CODE}`, { token: author.token });
assert(postable.length > 0, "retained checked-in member has no postable activity");
const activity = postable[0];
const content = `08.02 社区互动验收保留 ${stamp}，记录活动现场学习与交流收获。`;
const created = await request(`/public/community/posts?tenantCode=${TENANT_CODE}`, { method: "POST", token: author.token, body: { activityId: activity.id, content, images: ["https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80"], city: "演示城市", tags: ["08.02验收", "社区互动"] } });
const postId = Number(created.post.id);
assert(created.post.status === "pending", "participant post was not submitted for review");
await request(`/admin/community-posts/${postId}`, { method: "PATCH", token: ops.token, body: { status: "approved", visible: true, reviewRemark: "08.02 动态审核通过" } });

const publicPosts = await request(`/public/community/posts?tenantCode=${TENANT_CODE}`, { token: commenter.token });
assert(publicPosts.some((item) => item.id === postId && item.content === content), "approved post is missing from public community list");

const commentCreated = await request(`/public/community/posts/${postId}/comments?tenantCode=${TENANT_CODE}`, { method: "POST", token: commenter.token, body: { content: "这条活动心得很有启发，感谢分享。", mentionUserIds: [author.id, author.id] } });
const commentId = Number(commentCreated.comment.id);
await request(`/admin/community-post-comments/${commentId}`, { method: "PATCH", token: ops.token, body: { status: "approved", reviewRemark: "08.02 评论审核通过" } });
const replyCreated = await request(`/public/community/posts/${postId}/comments?tenantCode=${TENANT_CODE}`, { method: "POST", token: author.token, body: { parentId: commentId, content: "感谢交流，我们继续一起学习。", mentionUserIds: [commenter.id] } });
const replyId = Number(replyCreated.comment.id);
await request(`/admin/community-post-comments/${replyId}`, { method: "PATCH", token: ops.token, body: { status: "approved", reviewRemark: "08.02 回复审核通过" } });
const comments = await request(`/public/community/posts/${postId}/comments?tenantCode=${TENANT_CODE}`, { token: commenter.token });
assert(comments.length === 2 && comments.some((item) => item.id === commentId) && comments.some((item) => item.id === replyId && item.parentId === commentId), "approved comment thread is incomplete");

const likeResults = await Promise.all(Array.from({ length: 8 }, () => request(`/public/community/posts/${postId}/like?tenantCode=${TENANT_CODE}`, { method: "POST", token: commenter.token, body: {} })));
let detail = await request(`/public/community/posts/${postId}?tenantCode=${TENANT_CODE}`, { token: commenter.token });
assert(detail.likes >= 0 && detail.liked === (detail.likes > 0), "like detail state is inconsistent after concurrent toggles");
if (!detail.liked) await request(`/public/community/posts/${postId}/like?tenantCode=${TENANT_CODE}`, { method: "POST", token: commenter.token, body: {} });

const favoriteResults = await Promise.all(Array.from({ length: 8 }, () => request(`/public/community/posts/${postId}/favorite?tenantCode=${TENANT_CODE}`, { method: "POST", token: commenter.token, body: {} })));
detail = await request(`/public/community/posts/${postId}?tenantCode=${TENANT_CODE}`, { token: commenter.token });
if (!detail.favorited) await request(`/public/community/posts/${postId}/favorite?tenantCode=${TENANT_CODE}`, { method: "POST", token: commenter.token, body: {} });

const followed = await request(`/public/community/users/${author.id}/follow?tenantCode=${TENANT_CODE}`, { method: "POST", token: commenter.token, body: {} });
assert(followed.following === true, "follow did not become active");
const favorites = await request(`/public/me/community/favorites?tenantCode=${TENANT_CODE}`, { token: commenter.token });
const follows = await request(`/public/me/community/follows?tenantCode=${TENANT_CODE}`, { token: commenter.token });
assert(favorites.some((item) => item.id === postId && item.favorited === true), "favorited post is missing from personal favorites");
assert(follows.length > 0, "followed author is missing from personal follows");

const authorNotifications = await request(`/public/me/community/notifications?tenantCode=${TENANT_CODE}`, { token: author.token });
const commenterNotifications = await request(`/public/me/community/notifications?tenantCode=${TENANT_CODE}`, { token: commenter.token });
assert(authorNotifications.some((item) => item.postId === postId && ["comment", "mention", "like", "follow"].includes(item.type)), "author interaction notifications are missing");
assert(authorNotifications.filter((item) => item.postId === postId && item.type === "like").length === 1, "concurrent like toggles generated duplicate notifications");
assert(commenterNotifications.some((item) => item.postId === postId && ["reply", "mention"].includes(item.type)), "commenter reply or mention notification is missing");
const unread = commenterNotifications.find((item) => item.postId === postId && !item.readAt);
assert(unread, "no unread interaction notification found");
const read = await request(`/public/me/community/notifications/${unread.id}/read?tenantCode=${TENANT_CODE}`, { method: "POST", token: commenter.token, body: {} });
assert(read.readAt, "notification read state was not saved");

const myPosts = await request(`/public/me/community/posts?tenantCode=${TENANT_CODE}`, { token: author.token });
assert(myPosts.some((item) => item.id === postId), "author post is missing from personal content center");
const crossTenant = await raw(`/public/community/posts/${postId}?tenantCode=qiwai-hangzhou`, { token: commenter.token, tenantCode: "qiwai-hangzhou" });
assert(crossTenant.response.status === 404 || (crossTenant.response.status === 200 && crossTenant.payload?.data === null), `cross-tenant post detail was visible: ${crossTenant.text}`);

await request(`/public/me/community/posts/${postId}?tenantCode=${TENANT_CODE}`, { method: "DELETE", token: author.token, body: {} });
const deletedDetail = await raw(`/public/community/posts/${postId}?tenantCode=${TENANT_CODE}`, { token: commenter.token });
const afterDeletePosts = await request(`/public/community/posts?tenantCode=${TENANT_CODE}`, { token: commenter.token });
const afterDeleteFavorites = await request(`/public/me/community/favorites?tenantCode=${TENANT_CODE}`, { token: commenter.token });
const afterDeleteMine = await request(`/public/me/community/posts?tenantCode=${TENANT_CODE}`, { token: author.token });
assert((deletedDetail.response.status === 404 || (deletedDetail.response.status === 200 && deletedDetail.payload?.data === null)) && !afterDeletePosts.some((item) => item.id === postId) && !afterDeleteFavorites.some((item) => item.id === postId) && !afterDeleteMine.some((item) => item.id === postId), "soft-deleted post remains visible in a public or personal list");

console.log(JSON.stringify({ ok: true, author: { id: author.id, phone: author.phone }, commenter: { id: commenter.id, phone: commenter.phone }, activityId: activity.id, postId, commentId, replyId, concurrentLikes: likeResults.length, concurrentFavorites: favoriteResults.length, authorNotificationCount: authorNotifications.length, commenterNotificationCount: commenterNotifications.length, readNotificationId: unread.id, crossTenantStatus: crossTenant.response.status, deletedDetailStatus: deletedDetail.response.status }, null, 2));

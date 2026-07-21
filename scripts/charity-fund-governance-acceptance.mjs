const baseUrl = String(process.env.API_BASE_URL || "http://localhost:3000/api").replace(/\/$/, "");
const requesterToken = String(process.env.CHARITY_REQUESTER_TOKEN || "").trim();
const reviewerToken = String(process.env.CHARITY_REVIEWER_TOKEN || "").trim();
const payerToken = String(process.env.CHARITY_PAYER_TOKEN || "").trim();
const tenantCode = String(process.env.TENANT_CODE || "").trim();

if (!requesterToken || !reviewerToken || !payerToken || !tenantCode) throw new Error("CHARITY_REQUESTER_TOKEN, CHARITY_REVIEWER_TOKEN, CHARITY_PAYER_TOKEN and TENANT_CODE are required");

async function rawRequest(path, token, method = "GET", data) {
  const url = `${baseUrl}${path}${path.includes("?") ? "&" : "?"}tenantCode=${encodeURIComponent(tenantCode)}`;
  const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: data === undefined ? undefined : JSON.stringify(data) });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload };
}

async function request(path, token, method = "GET", data) {
  const result = await rawRequest(path, token, method, data);
  if (!result.response.ok) throw new Error(`${method} ${path} failed (${result.response.status}): ${JSON.stringify(result.payload)}`);
  return result.payload?.code === 0 ? result.payload.data : result.payload;
}

const stamp = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const project = await request("/admin/charity/projects", requesterToken, "POST", { title: `10.01 公益治理验收 ${stamp}`, targetAmount: 0.02, description: `保留验收项目 ${stamp}`, publicVisible: true });
if (project.status !== "draft" || !project.projectNo) throw new Error("new charity project must start as a numbered draft");
const draftPublicProjects = await request("/public/charity/projects", requesterToken);
if (draftPublicProjects.some((row) => row.id === project.id)) throw new Error("draft charity project leaked to the public list");

const submitKey = `charity-project-submit:${stamp}`;
await request(`/admin/charity/projects/${project.id}/actions`, requesterToken, "POST", { action: "submit", remark: "提交公益项目审核", businessKey: submitKey });
const selfReview = await rawRequest(`/admin/charity/projects/${project.id}/review`, requesterToken, "POST", { decision: "approve", remark: "申请人不能自审", businessKey: `charity-project-self-review:${stamp}` });
if (selfReview.response.ok) throw new Error("charity project applicant was allowed to review their own project");
const reviewedProject = await request(`/admin/charity/projects/${project.id}/review`, reviewerToken, "POST", { decision: "approve", remark: "项目资料与预算验收通过", businessKey: `charity-project-review:${stamp}` });
if (reviewedProject.status !== "approved") throw new Error("charity project review did not approve the project");
await request(`/admin/charity/projects/${project.id}/actions`, requesterToken, "POST", { action: "start_execution", remark: "进入项目执行", businessKey: `charity-project-start:${stamp}` });

const disbursement = await request(`/admin/charity/projects/${project.id}/disbursements`, requesterToken, "POST", { amount: 0.01, stageNo: 1, remark: `第一阶段拨款 ${stamp}`, publicVisible: true, businessKey: `charity-disbursement-request:${stamp}` });
if (disbursement.disbursement?.status !== "pending_review") throw new Error("new disbursement must wait for review");
const disbursementId = disbursement.disbursement.id;
const selfDisbursementReview = await rawRequest(`/admin/charity/disbursements/${disbursementId}/review`, requesterToken, "POST", { decision: "approve", remark: "申请人不能复核", businessKey: `charity-disbursement-self-review:${stamp}` });
if (selfDisbursementReview.response.ok) throw new Error("charity disbursement requester was allowed to review their own request");
const [approved, approvedReplay] = await Promise.all([
  request(`/admin/charity/disbursements/${disbursementId}/review`, reviewerToken, "POST", { decision: "approve", remark: "预算与余额复核通过", businessKey: `charity-disbursement-review:${stamp}` }),
  request(`/admin/charity/disbursements/${disbursementId}/review`, reviewerToken, "POST", { decision: "approve", remark: "预算与余额复核并发重放", businessKey: `charity-disbursement-review:${stamp}` })
]);
if (approved.status !== "approved") throw new Error("disbursement approval did not reserve funds");
if (approvedReplay.id !== disbursementId || approvedReplay.status !== "approved") throw new Error("disbursement review replay was not idempotent");

const missingEvidence = await rawRequest(`/admin/charity/disbursements/${disbursementId}/pay`, payerToken, "POST", { businessKey: `charity-disbursement-missing-proof:${stamp}` });
if (missingEvidence.response.ok) throw new Error("disbursement payment without evidence was accepted");
const reviewerPayment = await rawRequest(`/admin/charity/disbursements/${disbursementId}/pay`, reviewerToken, "POST", { paidReference: `CHARITY-REVIEWER-${stamp}`, remark: "复核人不能付款", businessKey: `charity-disbursement-reviewer-pay:${stamp}` });
if (reviewerPayment.response.ok) throw new Error("charity disbursement reviewer was allowed to pay the same request");
const [paid, paidReplay] = await Promise.all([
  request(`/admin/charity/disbursements/${disbursementId}/pay`, payerToken, "POST", { paidReference: `CHARITY-${stamp}`, remark: "验收付款", businessKey: `charity-disbursement-pay:${stamp}` }),
  request(`/admin/charity/disbursements/${disbursementId}/pay`, payerToken, "POST", { paidReference: `CHARITY-${stamp}`, remark: "验收付款并发重放", businessKey: `charity-disbursement-pay:${stamp}` })
]);
if (paid.disbursement?.status !== "paid") throw new Error("approved disbursement was not paid");
if (paidReplay.disbursement?.id !== disbursementId || paidReplay.disbursement?.status !== "paid") throw new Error("disbursement payment replay was not idempotent");

const cancellable = await request(`/admin/charity/projects/${project.id}/disbursements`, requesterToken, "POST", { amount: 0.01, stageNo: 2, remark: `第二阶段取消验收 ${stamp}`, publicVisible: true, businessKey: `charity-disbursement-cancel-request:${stamp}` });
const cancellableId = cancellable.disbursement.id;
const budgetOverrun = await rawRequest(`/admin/charity/projects/${project.id}/disbursements`, requesterToken, "POST", { amount: 0.01, stageNo: 3, remark: "超过项目预算", businessKey: `charity-disbursement-overrun:${stamp}` });
if (budgetOverrun.response.ok) throw new Error("charity project budget overrun was accepted");
await request(`/admin/charity/disbursements/${cancellableId}/review`, reviewerToken, "POST", { decision: "approve", remark: "取消前冻结验收", businessKey: `charity-disbursement-cancel-review:${stamp}` });
const [cancelled, cancelledReplay] = await Promise.all([
  request(`/admin/charity/disbursements/${cancellableId}/cancel`, payerToken, "POST", { remark: "验收取消并释放冻结金额", businessKey: `charity-disbursement-cancel:${stamp}` }),
  request(`/admin/charity/disbursements/${cancellableId}/cancel`, payerToken, "POST", { remark: "验收取消并发重放", businessKey: `charity-disbursement-cancel:${stamp}` })
]);
if (cancelled.status !== "cancelled") throw new Error("approved disbursement was not cancelled");
if (cancelledReplay.id !== cancellableId || cancelledReplay.status !== "cancelled") throw new Error("disbursement cancellation replay was not idempotent");

const detail = await request(`/admin/charity/projects/${project.id}/updates`, reviewerToken);
for (const action of ["created", "submit", "review_approved", "start_execution", "disbursement_requested", "disbursement_review_approve", "disbursement_paid", "disbursement_cancelled"]) if (!detail.events?.some((event) => event.action === action)) throw new Error(`project event missing: ${action}`);
const summary = await request("/admin/charity/summary", reviewerToken);
if (summary.ledgerIntegrity?.consistent !== true) throw new Error(`charity ledger integrity failed: ${JSON.stringify(summary.ledgerIntegrity)}`);
const transactions = await request("/admin/charity/transactions", reviewerToken);
const retainedTransactions = transactions.filter((row) => row.disbursement?.id === disbursementId || row.project?.id === project.id);
if (!retainedTransactions.some((row) => row.type === "project_disbursement" && row.entryHash)) throw new Error("paid disbursement did not create a hashed fund ledger entry");
const publicDetail = await request(`/public/charity/projects/${project.id}/updates`, requesterToken);
if (!publicDetail.disbursements?.some((row) => row.id === disbursementId && row.status === "paid")) throw new Error("paid disbursement was not publicly disclosed");
if (publicDetail.disbursements?.some((row) => row.id === cancellableId)) throw new Error("cancelled disbursement leaked into public disclosure");
for (const key of ["applicant", "reviewer", "submitBusinessKey", "reviewBusinessKey", "applicationSnapshot"]) if (key in publicDetail.project) throw new Error(`public charity project leaked internal field: ${key}`);
const publicPaidDisbursement = publicDetail.disbursements.find((row) => row.id === disbursementId);
for (const key of ["requestedBy", "reviewedBy", "paidBy", "businessKey", "reviewBusinessKey", "payBusinessKey", "requestSnapshot"]) if (key in publicPaidDisbursement) throw new Error(`public charity disbursement leaked internal field: ${key}`);
if (publicPaidDisbursement.paidReference === `CHARITY-${stamp}`) throw new Error("public charity project leaked the full payment reference");
const publicSummary = await request("/public/charity/summary", requesterToken);
if (!Array.isArray(publicSummary.fundEntries) || !publicSummary.fundEntries.some((row) => row.type === "project_disbursement" && row.project?.projectNo === project.projectNo)) throw new Error("public fund source disclosure is missing the paid project entry");
if (publicSummary.fundEntries.some((row) => row.paidReference === `CHARITY-${stamp}`)) throw new Error("public fund disclosure leaked the full payment reference");

console.log(JSON.stringify({ testedAt: new Date().toISOString(), tenantCode, retainedProjectId: project.id, retainedProjectNo: project.projectNo, retainedDisbursementId: disbursementId, retainedCancelledDisbursementId: cancellableId, retainedTransactionIds: retainedTransactions.map((row) => row.id), fundBalanceAmount: summary.fundBalanceAmount, reservedAmount: summary.reservedAmount, availableAmount: summary.availableAmount, ledgerIntegrity: summary.ledgerIntegrity, passed: true }, null, 2));

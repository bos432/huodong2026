import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, LessThan, MoreThanOrEqual } from 'typeorm';
import { AiOperationDraft } from '../../entities/ai-operation-draft.entity';
import { AdminUser } from '../../entities/admin-user.entity';
import { AdminOperationLog } from '../../entities/admin-operation-log.entity';
import { aiDraftInput, aiDraftSnapshot, aiDraftHash, aiEndpoint, AI_DRAFT_SYSTEM } from '../../shared/ai-draft-policy';

@Injectable()
export class AiOperationService {
  constructor(private readonly config: ConfigService, private readonly dataSource: DataSource) {}
  private settings() {
    const base = this.config.get<string>('AI_API_BASE', '').trim(); const model = this.config.get<string>('AI_MODEL', '').trim();
    const apiKey = this.config.get<string>('AI_API_KEY', '').trim();
    const enabled = this.config.get('AI_ENABLED', 'false') === 'true';
    let endpoint: ReturnType<typeof aiEndpoint> | null = null;
    let error = '';
    if (base) try { endpoint = aiEndpoint(base, this.config.get('NODE_ENV', 'production'), this.config.get('AI_ALLOW_LOCAL_TEST_SERVER', 'false') === 'true'); } catch (e: any) { error = e.message; }
    if (model.length > 120) error = '模型名称过长';
    const limit = Math.max(1, Math.min(100, Number(this.config.get('AI_REQUESTS_PER_ADMIN_DAY', 20)) || 20));
    const timeout = Math.max(1000, Math.min(60000, Number(this.config.get('AI_REQUEST_TIMEOUT_MS', 45000)) || 45000));
    return { endpoint, model, apiKey, limit, timeout, configured: Boolean(enabled && endpoint && model && apiKey && !error), error: error || 'AI服务未启用或配置不完整' };
  }
  preview(activity: Record<string, any>, value: unknown) {
    let input: ReturnType<typeof aiDraftInput>;
    try { input = aiDraftInput(value); } catch (e: any) { throw new BadRequestException(e.message); }
    const snapshot = aiDraftSnapshot(activity, input); const config = this.settings();
    return { source: snapshot, previewHash: aiDraftHash({ snapshot, endpoint: config.endpoint?.url || null, model: config.model }), configured: config.configured, providerHost: config.endpoint?.host || null, model: config.model || null,
      simulation: config.endpoint?.simulation || false, dailyLimit: config.limit, configurationMessage: config.configured ? null : config.error };
  }
  async list(activity: Record<string, any>) {
    const tenantScopeKey = activity.tenant?.id ? `tenant:${activity.tenant.id}` : 'platform';
    await this.expire(activity.id, tenantScopeKey);
    const items = await this.dataSource.getRepository(AiOperationDraft).find({ where: { activityId: activity.id, tenantScopeKey }, order: { id: 'DESC' }, take: 20 });
    return { items, configured: this.settings().configured };
  }
  private async expire(activityId: number, tenantScopeKey: string) {
    await this.dataSource.getRepository(AiOperationDraft).update({ activityId, tenantScopeKey, status: 'pending', createdAt: LessThan(new Date(Date.now() - 120000)) }, { status: 'failed', error: '生成状态已超时；未自动重试，服务商可能已计费' });
  }
  async generate(activity: Record<string, any>, value: any, actor: { id?: number; username?: string; tenantId?: number | null }) {
    if (!actor.id) throw new ForbiddenException('请先登录');
    const preview = this.preview(activity, value);
    if (value?.consent !== true || typeof value?.requestKey !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(value.requestKey)) throw new BadRequestException('请确认发送预览资料，并提供唯一请求编号');
    if (value.previewHash !== preview.previewHash) throw new ConflictException('活动资料已变化，请重新预览后确认');
    const config = this.settings();
    if (!config.configured || !config.endpoint) throw new ServiceUnavailableException(config.error);
    const tenantScopeKey = activity.tenant?.id ? `tenant:${activity.tenant.id}` : 'platform';
    const repo = this.dataSource.getRepository(AiOperationDraft);
    const reserved = await this.dataSource.transaction(async manager => {
      const admin = await manager.getRepository(AdminUser).findOne({ where: { id: actor.id, enabled: true }, loadEagerRelations: false, lock: { mode: 'pessimistic_write' } });
      if (!admin) throw new ForbiddenException('账号已失效');
      const drafts = manager.getRepository(AiOperationDraft);
      const existing = await drafts.findOneBy({ requestKey: value.requestKey });
      if (existing) {
        if (existing.actorId !== actor.id || existing.activityId !== activity.id || existing.tenantScopeKey !== tenantScopeKey) throw new NotFoundException('请求不存在');
        if (existing.payloadHash !== preview.previewHash) throw new ConflictException('同一请求编号不能更换内容');
        return { row: existing, fresh: false };
      }
      if (await drafts.count({ where: { actorId: actor.id, createdAt: MoreThanOrEqual(new Date(Date.now() - 86400000)) } }) >= config.limit) throw new HttpException('已达到24小时内AI请求次数上限', 429);
      const row = await drafts.save(drafts.create({ requestKey: value.requestKey, actorId: actor.id, activityId: activity.id, tenantScopeKey, mode: preview.source.mode,
        payloadHash: preview.previewHash, sourceSnapshot: preview.source, model: config.model, providerHost: config.endpoint!.host, simulation: config.endpoint!.simulation, status: 'pending' }));
      await manager.getRepository(AdminOperationLog).save({ adminId: actor.id, adminUsername: actor.username || null, tenantId: activity.tenant?.id || null,
        action: 'ai.draft_request', targetType: 'activity', targetId: String(activity.id), summary: '确认生成AI运营草稿', detail: { draftId: row.id, mode: row.mode, simulation: row.simulation } });
      return { row, fresh: true };
    });
    if (!reserved.fresh) { await this.expire(activity.id, tenantScopeKey); return repo.findOneByOrFail({ id: reserved.row.id }); }
    const id = reserved.row.id;
    try {
      const response = await fetch(config.endpoint.url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(config.timeout),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: config.model, stream: false, max_tokens: 2048, messages: [{ role: 'system', content: AI_DRAFT_SYSTEM }, { role: 'user', content: JSON.stringify(preview.source) }] }) });
      if (!response.ok) throw new Error(`AI服务响应异常（HTTP ${response.status}），未自动重试`);
      const reader = response.body?.getReader(); if (!reader) throw new Error('AI服务返回空响应');
      const decoder = new TextDecoder(); let content = ''; let bytes = 0;
      try {
        while (true) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.byteLength; if (bytes > 131072) throw new Error('AI响应超过安全长度'); content += decoder.decode(chunk.value, { stream: true }); }
        content += decoder.decode();
      } finally { await reader.cancel().catch(() => undefined); }
      let result: any; try { result = JSON.parse(content); } catch { throw new Error('AI服务返回的格式无效'); }
      const choice = result.choices?.[0]; const text = choice?.message?.content;
      if (typeof text !== 'string' || !text.trim() || text.length > 12000 || choice.finish_reason === 'length') throw new Error('AI草稿为空、过长或被截断，请核对后重新发起请求');
      const usage = Number(result.usage?.total_tokens);
      await repo.update({ id, status: 'pending' }, { status: 'succeeded', text, error: null, totalTokens: Number.isSafeInteger(usage) && usage >= 0 && usage <= 10000000 ? usage : null });
    } catch (e: any) {
      const safe = typeof e?.message === 'string' && e.message.startsWith('AI') ? e.message : 'AI请求失败或超时，未自动重试；服务商可能已计费';
      await repo.update({ id, status: 'pending' }, { status: 'failed', error: safe.slice(0, 255) });
    }
    return repo.findOneByOrFail({ id });
  }
}

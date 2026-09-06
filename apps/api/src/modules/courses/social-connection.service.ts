import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, In, MoreThanOrEqual } from 'typeorm';
import { SocialConnection } from '../../entities/social-connection.entity';
import { SocialConnectionEvent } from '../../entities/social-connection-event.entity';
import { SocialProfile } from '../../entities/social-profile.entity';
import { User } from '../../entities/user.entity';
import { CONNECTION_EXPIRY_MS, connectionActions, connectionRequestState } from '../../shared/social-connection-policy';

@Injectable()
export class SocialConnectionService {
  constructor(private readonly dataSource: DataSource) {}

  private scope(tenantId: number | null) { return tenantId ? `tenant:${tenantId}` : 'platform'; }
  private async lockUsers(manager: EntityManager, low: number, high: number) {
    // A fixed order also serializes reverse-direction requests and FK checks.
    for (const id of [low, high]) if (!(await manager.getRepository(User).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } }))) throw new NotFoundException('同行资料不存在或暂不可见');
  }
  private async approved(manager: EntityManager, scope: string, ids: number[]) {
    const profiles = await manager.getRepository(SocialProfile).find({ where: { tenantScopeKey: scope, userId: In(ids), status: 'approved', visible: true }, loadEagerRelations: false });
    if (profiles.length !== ids.length) throw new ForbiddenException('双方需要先通过资料审核并开启公开展示');
    return profiles;
  }
  private view(row: SocialConnection, userId: number, profiles: SocialProfile[]) {
    const otherId = row.lowUserId === userId ? row.highUserId : row.lowUserId;
    const other = profiles.find(profile => profile.userId === otherId);
    const mine = profiles.find(profile => profile.userId === userId);
    const ownBlocked = row.lowUserId === userId ? row.lowBlocked : row.highBlocked;
    const otherBlocked = row.lowUserId === userId ? row.highBlocked : row.lowBlocked;
    const available = Boolean(other && mine && !ownBlocked && !otherBlocked);
    const expired = row.status === 'pending' && Date.now() - +row.requestedAt >= CONNECTION_EXPIRY_MS;
    return { id: row.id, revision: row.revision, incoming: row.requesterId !== userId, intent: row.intent,
      status: ownBlocked ? 'blocked' : !available ? 'unavailable' : expired ? 'expired' : row.status,
      otherUserId: available ? otherId : null, displayName: available ? other!.displayName : '资料暂不可见',
      requestedAt: row.requestedAt, updatedAt: row.updatedAt,
      actions: connectionActions(row, userId).filter(action => action !== 'accept' || available) };
  }
  private async event(manager: EntityManager, row: SocialConnection, actorId: number, action: string) {
    await manager.getRepository(SocialConnectionEvent).save({ connectionId: row.id, actorId, action, revision: row.revision });
  }
  async request(userId: number, tenantId: number | null, targetUserId: unknown, intent: unknown) {
    if (!Number.isSafeInteger(targetUserId) || Number(targetUserId) < 1 || targetUserId === userId) throw new BadRequestException('请选择其他同行');
    if (!['activity', 'reading', 'collaboration'].includes(String(intent))) throw new BadRequestException('请选择有效的同行意向');
    const [lowUserId, highUserId] = [userId, Number(targetUserId)].sort((a, b) => a - b);
    const tenantScopeKey = this.scope(tenantId);
    return this.dataSource.transaction(async manager => {
      await this.lockUsers(manager, lowUserId, highUserId);
      const profiles = await this.approved(manager, tenantScopeKey, [lowUserId, highUserId]);
      const repo = manager.getRepository(SocialConnection);
      let row = await repo.findOne({ where: { tenantScopeKey, lowUserId, highUserId }, lock: { mode: 'pessimistic_write' } });
      const state = connectionRequestState(row);
      if (state === 'blocked') throw new ForbiddenException('暂不可建立连接');
      if (state === 'cooldown') throw new BadRequestException('请尊重对方意愿，7天后才可再次申请');
      if (state === 'existing') return this.view(row!, userId, profiles);
      if (await repo.count({ where: { requesterId: userId, requestedAt: MoreThanOrEqual(new Date(Date.now() - 86400000)) } }) >= 10) throw new BadRequestException('24小时内最多发起10个新申请');
      row = await repo.save(repo.create({ ...(row || {}), tenantId, tenantScopeKey, lowUserId, highUserId, requesterId: userId,
        intent: intent as SocialConnection['intent'], status: 'pending', requestedAt: new Date(), closedAt: null, revision: (row?.revision || 0) + 1 }));
      await this.event(manager, row, userId, 'request');
      return this.view(row, userId, profiles);
    });
  }
  async act(userId: number, tenantId: number | null, id: number, action: unknown, revision: unknown) {
    if (typeof action !== 'string' || !['accept', 'decline', 'withdraw', 'disconnect', 'block', 'unblock'].includes(action) || !Number.isSafeInteger(revision) || Number(revision) < 1) throw new BadRequestException('操作或版本无效');
    const scope = this.scope(tenantId);
    const first = await this.dataSource.getRepository(SocialConnection).findOneBy({ id, tenantScopeKey: scope });
    if (!first || userId !== first.lowUserId && userId !== first.highUserId) throw new NotFoundException('申请不存在');
    return this.dataSource.transaction(async manager => {
      await this.lockUsers(manager, first.lowUserId, first.highUserId);
      const repo = manager.getRepository(SocialConnection);
      const row = await repo.findOne({ where: { id, tenantScopeKey: scope }, lock: { mode: 'pessimistic_write' } });
      if (!row) throw new NotFoundException('申请不存在');
      if (row.revision !== revision) throw new ConflictException('申请状态已变化，请刷新后操作');
      if (!connectionActions(row, userId).includes(action)) throw new BadRequestException('当前状态不允许此操作');
      if (action === 'accept') await this.approved(manager, scope, [row.lowUserId, row.highUserId]);
      if (action === 'block' || action === 'unblock') {
        if (userId === row.lowUserId) row.lowBlocked = action === 'block'; else row.highBlocked = action === 'block';
        row.status = 'disconnected'; row.closedAt = new Date();
      } else {
        row.status = ({ accept: 'accepted', decline: 'declined', withdraw: 'withdrawn', disconnect: 'disconnected' } as const)[action as 'accept' | 'decline' | 'withdraw' | 'disconnect'];
        row.closedAt = action === 'accept' ? null : new Date();
      }
      row.revision += 1;
      const saved = await repo.save(row); await this.event(manager, saved, userId, action);
      const profiles = await manager.getRepository(SocialProfile).find({ where: { userId: In([row.lowUserId, row.highUserId]), tenantScopeKey: scope, status: 'approved', visible: true }, loadEagerRelations: false });
      return this.view(saved, userId, profiles);
    });
  }
  async list(userId: number, tenantId: number | null, page: number, view: string) {
    if (!Number.isSafeInteger(page) || page < 1 || page > 10000 || !['all', 'incoming', 'outgoing', 'connected', 'blocked'].includes(view)) throw new BadRequestException('列表筛选无效');
    const scope = this.scope(tenantId);
    const builder = this.dataSource.getRepository(SocialConnection).createQueryBuilder('c').where('c.tenantScopeKey = :scope', { scope }).andWhere('(c.lowUserId = :userId OR c.highUserId = :userId)', { userId });
    if (view === 'incoming' || view === 'outgoing') builder.andWhere(`c.requesterId ${view === 'incoming' ? '<>' : '='} :userId`, { userId }).andWhere("c.status = 'pending'").andWhere('c.requestedAt > :expiry', { expiry: new Date(Date.now() - CONNECTION_EXPIRY_MS) }).andWhere('c.lowBlocked = 0 AND c.highBlocked = 0');
    if (view === 'connected') builder.andWhere("c.status = 'accepted'").andWhere('c.lowBlocked = 0 AND c.highBlocked = 0');
    if (view === 'blocked') builder.andWhere('(c.lowUserId = :userId AND c.lowBlocked = 1 OR c.highUserId = :userId AND c.highBlocked = 1)', { userId });
    const [rows, total] = await builder.orderBy('c.updatedAt', 'DESC').addOrderBy('c.id', 'DESC').skip((page - 1) * 20).take(20).getManyAndCount();
    const ids = Array.from(new Set(rows.flatMap(row => [row.lowUserId, row.highUserId])));
    const profiles = ids.length ? await this.dataSource.getRepository(SocialProfile).find({ where: { tenantScopeKey: scope, userId: In(ids), status: 'approved', visible: true }, loadEagerRelations: false }) : [];
    return { items: rows.map(row => this.view(row, userId, profiles)), total, page, pageSize: 20 };
  }
}

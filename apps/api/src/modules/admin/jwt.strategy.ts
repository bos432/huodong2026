import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { InjectRepository } from "@nestjs/typeorm";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Repository } from "typeorm";
import { Tenant } from "../../entities/tenant.entity";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_SECRET", "dev-secret-change-me")
    });
  }

  async validate(payload: { sub: number; username: string; role: string; tenantId?: number | null }) {
    if (payload.tenantId) {
      const tenant = await this.tenants.findOne({ where: { id: payload.tenantId, enabled: true } });
      if (!tenant) throw new UnauthorizedException("Current tenant not found or disabled");
    }
    return { id: payload.sub, username: payload.username, role: payload.role, tenantId: payload.tenantId ?? null };
  }
}

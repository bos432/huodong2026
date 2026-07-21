import { Module } from "@nestjs/common";
import { MemberPointsService } from "./member-points.service";

@Module({
  providers: [MemberPointsService],
  exports: [MemberPointsService]
})
export class MemberPointsModule {}

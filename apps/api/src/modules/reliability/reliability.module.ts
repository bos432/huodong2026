import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BusinessJob } from "../../entities/business-job.entity";
import { BusinessJobService } from "./business-job.service";

@Global()
@Module({ imports: [TypeOrmModule.forFeature([BusinessJob])], providers: [BusinessJobService], exports: [BusinessJobService] })
export class ReliabilityModule {}

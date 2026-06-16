import { Module } from "@nestjs/common";
import { InstallController, InstallPageController } from "./install.controller";
import { InstallService } from "./install.service";

@Module({
  controllers: [InstallPageController, InstallController],
  providers: [InstallService],
  exports: [InstallService]
})
export class InstallModule {}

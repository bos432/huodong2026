import { Body, Controller, Get, Headers, Post, Res } from "@nestjs/common";
import { Response } from "express";
import { InstallerAdminDto, InstallerDbDto, InstallerWriteConfigDto } from "./install.dto";
import { installedPageHtml, installPageHtml } from "./install.page";
import { InstallService } from "./install.service";

@Controller()
export class InstallPageController {
  constructor(private readonly service: InstallService) {}

  @Get(["install", "install.php"])
  page(@Res() res: Response) {
    res.type("html").send(this.service.installed() ? installedPageHtml : installPageHtml);
  }
}

@Controller("install")
export class InstallController {
  constructor(private readonly service: InstallService) {}

  @Get("status")
  status() {
    return this.service.status();
  }

  @Post("check-db")
  checkDb(@Headers("x-installer-token") token: string | undefined, @Body() dto: InstallerDbDto) {
    this.service.assertToken(token);
    return this.service.checkDb(dto);
  }

  @Post("write-config")
  writeConfig(@Headers("x-installer-token") token: string | undefined, @Body() dto: InstallerWriteConfigDto) {
    this.service.assertToken(token);
    return this.service.writeConfig(dto);
  }

  @Post("run-migrations")
  runMigrations(@Headers("x-installer-token") token: string | undefined) {
    this.service.assertToken(token);
    return this.service.runMigrations();
  }

  @Post("create-admin")
  createAdmin(@Headers("x-installer-token") token: string | undefined, @Body() dto: InstallerAdminDto) {
    this.service.assertToken(token);
    return this.service.createAdmin(dto);
  }

  @Post("finalize")
  finalize(@Headers("x-installer-token") token: string | undefined) {
    this.service.assertToken(token);
    return this.service.finalize();
  }
}

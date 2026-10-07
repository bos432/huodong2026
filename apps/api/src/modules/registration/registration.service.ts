import { Injectable } from "@nestjs/common";
import { Registration } from "../../entities/registration.entity";
import { PublicActivityMapper, toPublicRegistration } from "./public-registration.mapper";

/** Bounded registration read service; access checks and persistence stay in the compatibility service. */
@Injectable()
export class RegistrationService {
  toPublicSummary(registration: Registration, toActivity: PublicActivityMapper) {
    return toPublicRegistration(registration, toActivity);
  }
}

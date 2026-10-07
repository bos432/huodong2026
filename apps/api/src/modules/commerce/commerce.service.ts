import { Injectable } from "@nestjs/common";
import { Order } from "../../entities/order.entity";
import { PublicOrderMapperDependencies, toPublicOrderSummary } from "./public-order.mapper";

/** Bounded commerce read service; payment creation and callbacks remain in the compatibility service. */
@Injectable()
export class CommerceService {
  toPublicOrderSummary(order: Order | null | undefined, dependencies: PublicOrderMapperDependencies) {
    return toPublicOrderSummary(order, dependencies);
  }
}

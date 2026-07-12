import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventBusService } from "@platform/events";

import { SupplementsRepository } from "./supplements.repository";
import type {
  CreateSupplementDto,
  LogIntakeDto,
  SupplementIntakeResponseDto,
  SupplementResponseDto,
} from "./dto/supplement-dtos";

@Injectable()
export class SupplementsService {
  constructor(
    private readonly repo: SupplementsRepository,
    private readonly events: EventBusService,
  ) {}

  create(
    userId: string,
    dto: CreateSupplementDto,
  ): Promise<SupplementResponseDto> {
    return this.repo.create(userId, dto);
  }

  list(userId: string): Promise<SupplementResponseDto[]> {
    return this.repo.listActive(userId);
  }

  async deactivate(userId: string, id: string): Promise<void> {
    await this.getOwned(userId, id);
    await this.repo.deactivate(id);
  }

  async logIntake(
    userId: string,
    supplementId: string,
    dto: LogIntakeDto,
  ): Promise<SupplementIntakeResponseDto> {
    const supplement = await this.getOwned(userId, supplementId);
    if (!supplement.active) {
      throw new ConflictException({
        code: "SUPPLEMENT_INACTIVE",
        message: "This supplement has been removed from the list",
      });
    }
    const intake = await this.repo.logIntake(
      userId,
      supplementId,
      dto.taken_at ? new Date(dto.taken_at) : undefined,
    );
    await this.events.publish("supplement.taken", {
      user_id: userId,
      supplement_id: supplementId,
      taken_at: intake.taken_at.toISOString(),
    });
    return intake;
  }

  async intakes(
    userId: string,
    supplementId: string,
  ): Promise<SupplementIntakeResponseDto[]> {
    await this.getOwned(userId, supplementId);
    return this.repo.listIntakes(userId, supplementId);
  }

  private async getOwned(
    userId: string,
    id: string,
  ): Promise<SupplementResponseDto> {
    const supplement = await this.repo.findOwned(userId, id);
    if (!supplement) {
      throw new NotFoundException({
        code: "SUPPLEMENT_NOT_FOUND",
        message: "Supplement not found",
      });
    }
    return supplement;
  }
}

import { Injectable } from "@nestjs/common";
import { EventBusService } from "@platform/events";

import { ProfileRepository } from "../profile/profile.repository";
import { WeightRepository } from "./weight.repository";
import type { CreateWeightEntryDto } from "./dto/create-weight-entry.dto";
import type { WeightEntryResponseDto } from "./dto/weight-entry-response.dto";

@Injectable()
export class WeightService {
  constructor(
    private readonly repo: WeightRepository,
    private readonly profiles: ProfileRepository,
    private readonly events: EventBusService,
  ) {}

  async log(
    userId: string,
    dto: CreateWeightEntryDto,
  ): Promise<WeightEntryResponseDto> {
    const entry = await this.repo.create(
      userId,
      dto.weight_kg,
      dto.measured_at ? new Date(dto.measured_at) : undefined,
    );
    // Keep the profile's current weight in sync with the newest measurement
    // (a backfilled older entry must not overwrite it).
    const latest = await this.repo.latest(userId);
    if (latest && latest.id === entry.id) {
      await this.profiles.updateCurrentWeight(userId, entry.weight_kg);
    }
    await this.events.publish("weight.logged", {
      user_id: userId,
      weight_kg: entry.weight_kg,
      measured_at: entry.measured_at.toISOString(),
    });
    return entry;
  }

  list(
    userId: string,
    from?: string,
    to?: string,
  ): Promise<WeightEntryResponseDto[]> {
    return this.repo.list(
      userId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }
}

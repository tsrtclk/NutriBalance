import { Injectable, NotFoundException } from "@nestjs/common";
import { EventBusService } from "@platform/events";

import {
  computeTargets,
  type ActivityLevel,
  type Goal,
  type Sex,
  type Targets,
} from "@platform/domain";

import { ProfileRepository } from "./profile.repository";
import type { ProfileResponseDto } from "./dto/profile-response.dto";
import type { UpsertProfileDto } from "./dto/upsert-profile.dto";

const MS_PER_WEEK = 7 * 24 * 3600 * 1000;

@Injectable()
export class ProfileService {
  constructor(
    private readonly repo: ProfileRepository,
    private readonly events: EventBusService,
  ) {}

  async upsert(
    userId: string,
    dto: UpsertProfileDto,
  ): Promise<ProfileResponseDto> {
    const profile = await this.repo.upsert(userId, dto);
    await this.events.publish("profile.updated", {
      user_id: userId,
      goal: profile.goal,
    });
    return profile;
  }

  async get(userId: string): Promise<ProfileResponseDto> {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw this.notFound();
    return profile;
  }

  /** É1 — daily targets, recomputed on read (never stored; can't go stale). */
  async targets(
    userId: string,
    now = new Date(),
  ): Promise<Targets & { profile: ProfileResponseDto }> {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw this.notFound();

    const weeksToTarget = profile.target_date
      ? (new Date(profile.target_date).getTime() - now.getTime()) / MS_PER_WEEK
      : undefined;

    const targets = computeTargets({
      sex: profile.sex as Sex,
      ageYears: this.ageYears(profile.birth_date, now),
      heightCm: profile.height_cm,
      weightKg: profile.weight_kg,
      activityLevel: profile.activity_level as ActivityLevel,
      goal: profile.goal as Goal,
      targetWeightKg: profile.target_weight_kg ?? undefined,
      weeksToTarget:
        weeksToTarget != null && weeksToTarget > 0 ? weeksToTarget : undefined,
    });
    return { ...targets, profile };
  }

  private ageYears(birthDateIso: string, now: Date): number {
    const birth = new Date(birthDateIso);
    const years =
      (now.getTime() - birth.getTime()) / (365.25 * 24 * 3600 * 1000);
    return Math.floor(years);
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      code: "PROFILE_NOT_FOUND",
      message: "Profile not set up yet — complete onboarding first",
    });
  }
}

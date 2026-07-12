import { Injectable } from "@nestjs/common";
import { PrismaService } from "@platform/service-kit";
import type { Exercise } from "@platform/prisma-client";

import type { CreateExerciseDto } from "./dto/create-exercise.dto";
import type { ExerciseResponseDto } from "./dto/exercise-response.dto";

@Injectable()
export class ExercisesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Library rows (owner null) + the caller's custom exercises. */
  async list(
    userId: string,
    muscleGroup?: string,
    equipment?: string,
  ): Promise<ExerciseResponseDto[]> {
    const rows = await this.prisma.exercise.findMany({
      where: {
        OR: [{ owner_id: null }, { owner_id: userId }],
        ...(muscleGroup ? { muscle_group: muscleGroup } : {}),
        ...(equipment ? { equipment } : {}),
      },
      orderBy: [{ muscle_group: "asc" }, { name: "asc" }],
    });
    return rows.map((r) => this.toDto(r));
  }

  async findAccessible(
    userId: string,
    id: string,
  ): Promise<ExerciseResponseDto | null> {
    const row = await this.prisma.exercise.findFirst({
      where: { id, OR: [{ owner_id: null }, { owner_id: userId }] },
    });
    return row ? this.toDto(row) : null;
  }

  async createCustom(
    userId: string,
    dto: CreateExerciseDto,
  ): Promise<ExerciseResponseDto> {
    const row = await this.prisma.exercise.create({
      data: { owner_id: userId, ...dto },
    });
    return this.toDto(row);
  }

  private toDto(row: Exercise): ExerciseResponseDto {
    return {
      id: row.id,
      owner_id: row.owner_id,
      name: row.name,
      muscle_group: row.muscle_group,
      equipment: row.equipment,
      instructions: row.instructions,
      media_url: row.media_url,
    };
  }
}

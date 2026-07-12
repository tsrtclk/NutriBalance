import { ConflictException, NotFoundException } from "@nestjs/common";

import { SupplementsService } from "../src/modules/supplements/supplements.service";
import type { SupplementsRepository } from "../src/modules/supplements/supplements.repository";
import type {
  SupplementIntakeResponseDto,
  SupplementResponseDto,
} from "../src/modules/supplements/dto/supplement-dtos";

const ALICE = "00000000-0000-4000-8000-000000000001";
const BOB = "00000000-0000-4000-8000-000000000002";

class FakeSupplementsRepo {
  supplements: SupplementResponseDto[] = [];
  intakes: SupplementIntakeResponseDto[] = [];
  private seq = 0;

  async create(
    userId: string,
    dto: { name: string; dosage: string; times: string[] },
  ) {
    const row: SupplementResponseDto = {
      id: `00000000-0000-4000-8000-00000000030${this.seq++}`,
      user_id: userId,
      active: true,
      created_at: new Date(),
      ...dto,
    };
    this.supplements.push(row);
    return row;
  }

  async listActive(userId: string) {
    return this.supplements.filter((s) => s.user_id === userId && s.active);
  }

  async findOwned(userId: string, id: string) {
    return (
      this.supplements.find((s) => s.id === id && s.user_id === userId) ?? null
    );
  }

  async deactivate(id: string) {
    const s = this.supplements.find((x) => x.id === id);
    if (s) s.active = false;
  }

  async logIntake(userId: string, supplementId: string, takenAt?: Date) {
    const s = this.supplements.find((x) => x.id === supplementId);
    const intake: SupplementIntakeResponseDto = {
      id: `00000000-0000-4000-8000-00000000040${this.intakes.length}`,
      supplement_id: supplementId,
      supplement_name: s?.name ?? "?",
      taken_at: takenAt ?? new Date(),
    };
    this.intakes.push(intake);
    return intake;
  }

  async listIntakes(_userId: string, supplementId: string) {
    return this.intakes.filter((i) => i.supplement_id === supplementId);
  }
}

function makeService() {
  const repo = new FakeSupplementsRepo();
  const events = { publish: jest.fn().mockResolvedValue(undefined) };
  const service = new SupplementsService(
    repo as unknown as SupplementsRepository,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    events as any,
  );
  return { service, repo, events };
}

const CREATINE = { name: "Créatine", dosage: "5 g", times: ["08:00"] };

describe("SupplementsService", () => {
  it("logs an intake and emits supplement.taken", async () => {
    const { service, events } = makeService();
    const supp = await service.create(ALICE, CREATINE);
    const intake = await service.logIntake(ALICE, supp.id, {});
    expect(intake.supplement_name).toBe("Créatine");
    expect(events.publish).toHaveBeenCalledWith(
      "supplement.taken",
      expect.objectContaining({ user_id: ALICE, supplement_id: supp.id }),
    );
    expect(await service.intakes(ALICE, supp.id)).toHaveLength(1);
  });

  it("another user's supplement is invisible (404 on intake and history)", async () => {
    const { service } = makeService();
    const supp = await service.create(ALICE, CREATINE);
    await expect(service.logIntake(BOB, supp.id, {})).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.intakes(BOB, supp.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it("deactivation hides the supplement from the list but keeps history readable", async () => {
    const { service } = makeService();
    const supp = await service.create(ALICE, CREATINE);
    await service.logIntake(ALICE, supp.id, {});
    await service.deactivate(ALICE, supp.id);

    expect(await service.list(ALICE)).toEqual([]);
    // History remains for the owner…
    expect(await service.intakes(ALICE, supp.id)).toHaveLength(1);
    // …but new intakes on a removed supplement are refused.
    await expect(service.logIntake(ALICE, supp.id, {})).rejects.toThrow(
      ConflictException,
    );
  });
});

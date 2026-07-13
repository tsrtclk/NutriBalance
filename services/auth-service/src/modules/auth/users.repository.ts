import { Injectable } from "@nestjs/common";
import { PrismaService } from "@platform/service-kit";
import type { User } from "@platform/prisma-client";

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: {
    email: string;
    password_hash: string;
    full_name: string;
    locale?: string;
  }): Promise<User> {
    return this.prisma.user.create({ data });
  }

  /** É12 RGPD — every user-owned table cascades; audit_logs SetNull. */
  delete(id: string): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }
}

import bcrypt from "bcryptjs";

import { prisma } from "@/server/db/prisma";

const BCRYPT_ROUNDS = 12;

export class EmailAlreadyInUseError extends Error {
  constructor() {
    super("An account with that email already exists.");
    this.name = "EmailAlreadyInUseError";
  }
}

export const AuthService = {
  async signup(params: { name: string; email: string; password: string }) {
    const email = params.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new EmailAlreadyInUseError();

    const passwordHash = await bcrypt.hash(params.password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: { name: params.name.trim(), email, passwordHash },
    });

    return user;
  },

  async verifyCredentials(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user || !user.passwordHash) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    return user;
  },
};

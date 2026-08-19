"use server";

import { z } from "zod";
import { AuthError } from "next-auth";

import { signIn, signOut } from "@/server/auth";
import { AuthService, EmailAlreadyInUseError } from "@/server/services/auth-service";

export type FormActionState = { error: string | null };

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export async function loginAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/app",
    });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    // NEXT_REDIRECT is thrown by signIn on success and must propagate.
    throw error;
  }
}

const signupSchema = z.object({
  name: z.string().min(1, "Name is required.").max(120),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function signupAction(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await AuthService.signup(parsed.data);
  } catch (error) {
    if (error instanceof EmailAlreadyInUseError) {
      return { error: error.message };
    }
    throw error;
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/onboarding",
    });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created, but sign-in failed. Try logging in." };
    }
    throw error;
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

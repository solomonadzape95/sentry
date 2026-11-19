"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { APP_NAME, APP_PROFILE } from "@/lib/config";
import { prisma } from "@/lib/db";
import { emailDeliveryConfigured, sendMail } from "@/lib/email";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { getSessionPersona } from "@/lib/session";
import {
  createOpaqueToken,
  hashToken,
  INVITE_TTL_MS,
  RESET_TTL_MS,
} from "@/lib/tokens";
import { can, isRole } from "@/lib/authz";

export type FormState =
  | {
      error?: string;
      message?: string;
      devLink?: string;
      fieldErrors?: Record<string, string>;
    }
  | undefined;

const emailSchema = z.string().trim().toLowerCase().email();
const passwordSchema = z.string().min(1).max(200);

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/home";
}

function demoLink(path: string): string | undefined {
  return APP_PROFILE === "demo" ? path : undefined;
}

export async function signInAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!email.success || !password.success) {
    return { error: "Enter your email address and password." };
  }

  try {
    await signIn("credentials", {
      email: email.data,
      password: password.data,
      redirectTo: safeNext(formData.get("next")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error instanceof CredentialsSignin && error.code === "suspended") {
        return { error: "This account is suspended. Contact your network administrator." };
      }
      return { error: "That email and password combination did not work." };
    }
    throw error;
  }

  return undefined;
}

export async function signOutAction() {
  await signOut({ redirectTo: "/sign-in" });
}

export async function requestPasswordResetAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: "Enter a valid email address." };

  const user = await prisma.user.findUnique({ where: { email: email.data } });
  let link: string | undefined;

  if (user && user.status === "ACTIVE") {
    const { token, hash } = createOpaqueToken();
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      },
    });
    link = `/reset-password?token=${encodeURIComponent(token)}`;
    await sendMail({
      to: user.email,
      subject: `Reset your ${APP_NAME} password`,
      text: `Use this link within one hour to reset your password:\n\n${link}\n\nIf you did not request this, ignore this email.`,
    });
  }

  return {
    message: "If an account exists for that email, a reset link is on its way.",
    devLink: link ? demoLink(link) : undefined,
  };
}

export async function resetPasswordAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const token = formData.get("token");
  const password = formData.get("password");
  const confirm = formData.get("confirm");
  if (typeof token !== "string" || !token) {
    return { error: "This reset link is invalid. Request a new one." };
  }
  if (typeof password !== "string" || password !== confirm) {
    return { error: "The two passwords do not match." };
  }
  const problem = passwordProblem(password);
  if (problem) return { error: problem };

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    return { error: "This reset link has expired or has already been used." };
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        status: "ACTIVE",
        sessionEpoch: { increment: 1 },
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId, id: { not: record.id } },
    }),
    prisma.auditLog.create({
      data: {
        userId: record.userId,
        entity: "User",
        entityId: record.userId,
        action: "PASSWORD_RESET",
      },
    }),
  ]);

  redirect("/sign-in?reset=1");
}

export async function acceptInviteAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const token = formData.get("token");
  const name = formData.get("name");
  const password = formData.get("password");
  const confirm = formData.get("confirm");

  if (typeof token !== "string" || !token) {
    return { error: "This invitation link is invalid." };
  }
  if (typeof name !== "string" || name.trim().length < 2) {
    return { error: "Enter your full name." };
  }
  if (typeof password !== "string" || password !== confirm) {
    return { error: "The two passwords do not match." };
  }
  const problem = passwordProblem(password);
  if (problem) return { error: problem };

  const invite = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (
    !invite ||
    invite.acceptedAt ||
    invite.revokedAt ||
    invite.expiresAt <= new Date()
  ) {
    return { error: "This invitation has expired or has already been used." };
  }

  const existing = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existing) {
    return { error: "An account already exists for this email. Sign in instead." };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: name.trim(),
        email: invite.email,
        role: invite.role,
        title: invite.title ?? invite.role.replaceAll("_", " ").toLowerCase(),
        passwordHash,
        status: "ACTIVE",
        emailVerified: new Date(),
        memberships:
          invite.facilityId && isRole(invite.role)
            ? {
                create: {
                  facilityId: invite.facilityId,
                  role: invite.role,
                  isPrimary: true,
                },
              }
            : undefined,
      },
    });

    await tx.invitation.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        facilityId: invite.facilityId,
        userId: created.id,
        entity: "User",
        entityId: created.id,
        action: "INVITE_ACCEPTED",
        detail: JSON.stringify({ role: invite.role }),
      },
    });
    return created;
  });

  try {
    await signIn("credentials", {
      email: user.email,
      password,
      redirectTo: "/home",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/sign-in?invited=1");
    }
    throw error;
  }
  return undefined;
}

export async function changePasswordAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const persona = await getSessionPersona();
  if (!persona) return { error: "Sign in to change your password." };

  const current = formData.get("current");
  const password = formData.get("password");
  const confirm = formData.get("confirm");
  if (typeof current !== "string" || typeof password !== "string" || password !== confirm) {
    return { error: "The two new passwords do not match." };
  }
  const problem = passwordProblem(password);
  if (problem) return { error: problem };

  const valid = await verifyPassword(current, persona.passwordHash);
  if (!valid) return { error: "Your current password is incorrect." };

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: persona.id },
      data: { passwordHash, sessionEpoch: { increment: 1 } },
    }),
    prisma.auditLog.create({
      data: {
        userId: persona.id,
        entity: "User",
        entityId: persona.id,
        action: "PASSWORD_CHANGED",
      },
    }),
  ]);

  redirect("/sign-in?changed=1");
}

export async function revokeSessionsAction() {
  const persona = await getSessionPersona();
  if (!persona) redirect("/sign-in");
  await prisma.user.update({
    where: { id: persona.id },
    data: { sessionEpoch: { increment: 1 } },
  });
  await prisma.auditLog.create({
    data: {
      userId: persona.id,
      entity: "User",
      entityId: persona.id,
      action: "SESSIONS_REVOKED",
    },
  });
  await signOut({ redirectTo: "/sign-in?revoked=1" });
}

export async function createInviteAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const persona = await getSessionPersona();
  if (!persona || !can(persona.role, "admin:manage")) {
    return { error: "Only a network authority can invite staff." };
  }

  const email = emailSchema.safeParse(formData.get("email"));
  const name = formData.get("name");
  const role = formData.get("role");
  const title = formData.get("title");
  const facilityId = formData.get("facilityId");
  if (!email.success) return { error: "Enter a valid email address." };
  if (typeof name !== "string" || name.trim().length < 2) {
    return { error: "Enter the person's full name." };
  }
  if (typeof role !== "string" || !isRole(role)) {
    return { error: "Choose a valid role." };
  }
  if (APP_PROFILE !== "demo" && !emailDeliveryConfigured()) {
    return { error: "Email delivery is not configured. Set RESEND_API_KEY before inviting staff." };
  }

  const needsFacility = role === "INVENTORY_OFFICER" || role === "FACILITY_MANAGER";
  if (needsFacility && (typeof facilityId !== "string" || !facilityId)) {
    return { error: "Choose a facility for this role." };
  }

  const existing = await prisma.user.findUnique({ where: { email: email.data } });
  if (existing) return { error: "A user with that email already exists." };

  const pendingInvite = await prisma.invitation.findFirst({
    where: {
      email: email.data,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (pendingInvite) {
    return { error: "A pending invitation already exists for that email." };
  }

  if (needsFacility) {
    const facility = await prisma.facility.findUnique({ where: { id: facilityId as string } });
    if (!facility) return { error: "Facility not found." };
  }

  const { token, hash } = createOpaqueToken();
  const invitation = await prisma.invitation.create({
    data: {
      email: email.data,
      name: name.trim(),
      role,
      title: typeof title === "string" && title.trim() ? title.trim() : null,
      facilityId: needsFacility ? (facilityId as string) : null,
      invitedById: persona.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  const link = `/invite/${encodeURIComponent(token)}`;
  const delivery = await sendMail({
    to: email.data,
    subject: `You are invited to ${APP_NAME}`,
    text: `Hello ${name.trim()},\n\nYou have been invited to ${APP_NAME}. Set your password here:\n\n${link}\n\nThis link expires in 7 days.`,
  });

  if (!delivery.delivered && APP_PROFILE !== "demo") {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { revokedAt: new Date() },
    });
    return { error: "Email delivery failed. The invitation was revoked; try again." };
  }

  await prisma.auditLog.create({
    data: {
      facilityId: needsFacility ? (facilityId as string) : null,
      userId: persona.id,
      entity: "Invitation",
      entityId: email.data,
      action: "INVITE_SENT",
      detail: JSON.stringify({ role, email: email.data }),
    },
  });

  return {
    message: delivery.delivered
      ? "Invitation sent."
      : "Invitation created. Copy the link below and send it to the user.",
    devLink: demoLink(link),
  };
}

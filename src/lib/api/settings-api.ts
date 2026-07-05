import type { User } from "@/lib/types/user";
import { graphqlRequest } from "@/lib/graphql/client";
import {
  CHANGE_EMAIL_MUTATION,
  CHANGE_PASSWORD_MUTATION,
  RESEND_VERIFICATION_EMAIL_MUTATION,
} from "@/lib/graphql/operations";

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await graphqlRequest<{ changePassword: boolean }>(CHANGE_PASSWORD_MUTATION, {
    currentPassword,
    newPassword,
  });
}

export async function changeEmail(currentPassword: string, email: string): Promise<User> {
  const data = await graphqlRequest<{ changeEmail: User }>(CHANGE_EMAIL_MUTATION, {
    currentPassword,
    email,
  });
  return data.changeEmail;
}

export async function resendVerificationEmail(): Promise<void> {
  await graphqlRequest<{ resendVerificationEmail: boolean }>(RESEND_VERIFICATION_EMAIL_MUTATION);
}

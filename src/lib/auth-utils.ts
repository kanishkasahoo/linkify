import { auth } from "@/auth";

const authorizedGitHubId = process.env.AUTHORIZED_GITHUB_ID;

const isAuthorizedId = (value?: string | number | null) => {
  if (!authorizedGitHubId) {
    return false;
  }

  if (value === undefined || value === null) {
    return false;
  }

  return String(value) === authorizedGitHubId;
};

export async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!isAuthorizedId(session.user.id ?? null)) {
    throw new Error("Unauthorized");
  }

  return session;
}

import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

const authorizedGitHubId = process.env.AUTHORIZED_GITHUB_ID

const isAuthorizedId = (value?: string | number | null) => {
  if (!authorizedGitHubId) {
    return false
  }

  if (value === undefined || value === null) {
    return false
  }

  return String(value) === authorizedGitHubId
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID ?? "",
      clientSecret: process.env.AUTH_GITHUB_SECRET ?? "",
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    signIn({ profile }) {
      return isAuthorizedId(profile?.id ?? null)
    },
    jwt({ token, profile }) {
      if (profile?.id) {
        token.githubId = String(profile.id)
      }

      return token
    },
    session({ session, token }) {
      const githubId =
        typeof token.githubId === "string" ? token.githubId : token.sub ?? ""

      if (isAuthorizedId(githubId)) {
        session.user.id = githubId
      }

      return session
    },
    authorized({ auth }) {
      return isAuthorizedId(auth?.user?.id ?? null)
    },
  },
})

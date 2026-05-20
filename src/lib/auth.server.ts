import crypto from "node:crypto";
import { createCookieSessionStorage, redirect } from "react-router";

const SESSION_KEY = "user";
const OAUTH_STATE_KEY = "oauth_state";
const CALLBACK_URL_KEY = "callback_url";

type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

const getRequiredEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
};

const getMissingOAuthConfig = () =>
  ["AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET", "AUTHORIZED_GITHUB_ID"].filter(
    (name) => !process.env[name],
  );

const getAppUrl = (request: Request) => {
  const configured = process.env.APP_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return new URL(request.url).origin;
};

const getGitHubRedirectUri = (request: Request) => {
  const configured = process.env.AUTH_GITHUB_REDIRECT_URI;
  if (configured) {
    return configured;
  }
  return `${getAppUrl(request)}/auth/github/callback`;
};

const sessionSecret = process.env.SESSION_SECRET || process.env.AUTH_SECRET;

if (!sessionSecret) {
  throw new Error("SESSION_SECRET or AUTH_SECRET is required");
}

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__linkify_session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [sessionSecret],
    secure: process.env.NODE_ENV === "production",
  },
});

export const getSession = (request: Request) =>
  sessionStorage.getSession(request.headers.get("Cookie"));

export const getUser = async (
  request: Request,
): Promise<SessionUser | null> => {
  const session = await getSession(request);
  const user = session.get(SESSION_KEY);
  if (!user || typeof user !== "object") {
    return null;
  }
  return user as SessionUser;
};

export const requireUser = async (request: Request) => {
  const user = await getUser(request);
  if (user) {
    return user;
  }

  const url = new URL(request.url);
  const callbackUrl = `${url.pathname}${url.search}`;
  throw redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
};

export const startGitHubLogin = async (request: Request) => {
  const session = await getSession(request);
  const url = new URL(request.url);
  const callbackUrl = url.searchParams.get("callbackUrl");
  const safeCallbackUrl =
    isSafeCallbackUrl(callbackUrl) && callbackUrl ? callbackUrl : "/dashboard";
  const missingConfig = getMissingOAuthConfig();

  if (missingConfig.length > 0) {
    console.error(
      `Missing GitHub OAuth configuration: ${missingConfig.join(", ")}`,
    );
    return redirect(
      `/login?error=Configuration&callbackUrl=${encodeURIComponent(safeCallbackUrl)}`,
    );
  }

  const state = crypto.randomBytes(24).toString("hex");
  session.set(OAUTH_STATE_KEY, state);
  session.set(CALLBACK_URL_KEY, safeCallbackUrl);

  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", getRequiredEnv("AUTH_GITHUB_ID"));
  authUrl.searchParams.set("redirect_uri", getGitHubRedirectUri(request));
  authUrl.searchParams.set("scope", "read:user user:email");
  authUrl.searchParams.set("state", state);

  return redirect(authUrl.toString(), {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
};

export const completeGitHubLogin = async (request: Request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const session = await getSession(request);
  const callbackUrl = session.get(CALLBACK_URL_KEY) || "/dashboard";
  const expectedState = session.get(OAUTH_STATE_KEY);
  session.unset(OAUTH_STATE_KEY);
  session.unset(CALLBACK_URL_KEY);

  const missingConfig = getMissingOAuthConfig();
  if (missingConfig.length > 0) {
    console.error(
      `Missing GitHub OAuth configuration: ${missingConfig.join(", ")}`,
    );
    return redirect("/login?error=Configuration", {
      headers: {
        "Set-Cookie": await sessionStorage.commitSession(session),
      },
    });
  }

  if (!code || !state || state !== expectedState) {
    return redirect("/login?error=AccessDenied", {
      headers: {
        "Set-Cookie": await sessionStorage.commitSession(session),
      },
    });
  }

  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: getRequiredEnv("AUTH_GITHUB_ID"),
        client_secret: getRequiredEnv("AUTH_GITHUB_SECRET"),
        code,
        redirect_uri: getGitHubRedirectUri(request),
      }),
    },
  );

  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: string;
    error?: string;
  };

  if (!tokenPayload.access_token) {
    return redirect("/login?error=OAuthCallback");
  }

  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenPayload.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "linkify",
    },
  });

  const profile = (await userResponse.json()) as {
    id?: number;
    name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
    login?: string | null;
  };

  const authorizedId = getRequiredEnv("AUTHORIZED_GITHUB_ID");
  if (!profile.id || String(profile.id) !== authorizedId) {
    return redirect("/login?error=AccessDenied");
  }

  session.set(SESSION_KEY, {
    id: String(profile.id),
    name: profile.name || profile.login || null,
    email: profile.email || null,
    image: profile.avatar_url || null,
  } satisfies SessionUser);

  return redirect(isSafeCallbackUrl(callbackUrl) ? callbackUrl : "/dashboard", {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
};

export const logout = async (request: Request) => {
  const session = await getSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
};

export const isSafeCallbackUrl = (value?: string | null) => {
  if (!value) {
    return false;
  }
  return (
    value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
  );
};

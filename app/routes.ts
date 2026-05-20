import {
  index,
  layout,
  prefix,
  type RouteConfig,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("auth/github", "routes/auth.github.tsx"),
  route("auth/github/callback", "routes/auth.github.callback.tsx"),
  route("logout", "routes/logout.tsx"),
  route("healthz", "routes/healthz.ts"),
  ...prefix("resources", [route("qr/:slug", "routes/resources.qr.$slug.tsx")]),
  layout("routes/dashboard.tsx", [
    route("dashboard", "routes/dashboard._index.tsx"),
    route("dashboard/links", "routes/dashboard.links.tsx"),
    route("dashboard/links/:id", "routes/dashboard.links.$id.tsx"),
  ]),
  route(":slug", "routes/$.tsx"),
] satisfies RouteConfig;

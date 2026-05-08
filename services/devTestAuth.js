export function resolveRequestUserId(req) {
  const sessionUserId = req.session?.userId;
  const isProd = process.env.NODE_ENV === "production";
  const headerUserId = Number(req.headers["x-test-user-id"]);

  if (!isProd && Number.isFinite(headerUserId) && headerUserId > 0) {
    return headerUserId;
  }

  return sessionUserId || 1;
}


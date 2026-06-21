// Vercel Edge Middleware — HTTP Basic Auth gate in front of the whole app.
// Runs at the edge before any HTML/asset is served, so the password is a real
// barrier (unlike a client-side prompt, which ships the app to the browser).
//
// Configure on Vercel: set BASIC_AUTH_PASSWORD (and optionally BASIC_AUTH_USER,
// default "beatlab") as Production env vars. With no password configured the
// gate fails closed (503) rather than silently exposing the app.

export const config = {
  // Gate every path except Vercel's internal routes.
  matcher: "/((?!_vercel/).*)",
};

export default function middleware(request: Request): Response | undefined {
  const password = process.env.BASIC_AUTH_PASSWORD;
  const user = process.env.BASIC_AUTH_USER ?? "beatlab";

  if (!password) {
    return new Response("Auth not configured.", { status: 503 });
  }

  const header = request.headers.get("authorization");
  if (header) {
    const expected = `Basic ${btoa(`${user}:${password}`)}`;
    // Length check first so the equality compare is on equal-length strings.
    if (header.length === expected.length && header === expected) {
      return undefined; // authorized — continue to the app
    }
  }

  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Beat Lab", charset="UTF-8"',
    },
  });
}

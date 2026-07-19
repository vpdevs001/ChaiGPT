import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Routes that may be accessed without authentication: the sign-in flow and the
 * Inngest webhook endpoint.
 */
const isPublicRoute = createRouteMatcher(["/sign-in(.*)"]);

/**
 * Clerk auth middleware.
 *
 * Protects every request except those matching {@link isPublicRoute}, redirecting
 * unauthenticated users to sign in.
 */
export default clerkMiddleware(
  async (auth, req) => {
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
  },
  // Passed directly (rather than via NEXT_PUBLIC_CLERK_SIGN_IN_URL) because the env var
  // resolves empty on Next.js 16's Node-runtime proxy.ts (Clerk issue #8302), which makes
  // auth.protect() redirect back to the same page instead of /sign-in.
  { signInUrl: "/sign-in" },
);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Always run for Clerk-specific frontend API routes
    "/__clerk/(.*)",
  ],
};

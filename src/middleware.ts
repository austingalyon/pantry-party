import { clerkMiddleware, createRouteMatcher } from "@clerk/astro/server";

const isProtectedRoute = createRouteMatcher(["/room(.*)", "/create-room"]);

export const onRequest = clerkMiddleware((auth, context) => {
  if (isProtectedRoute(context.request)) {
    auth().protect();
  }
});

# Clerk + Astro + React Islands: Avoiding Multiple ClerkProvider Errors

## The Problem

When using `@clerk/astro` with React islands (`client:only="react"`), you'll hit this error if your React components create their own `ClerkProvider`:

```
@clerk/clerk-react: You've added multiple <ClerkProvider> components in your React component tree.
```

This happens because:

1. `@clerk/astro` (configured in `astro.config.mjs`) initializes Clerk at the **Astro page level** — it manages the Clerk instance globally via `<script>` tags and the middleware.
2. Each React island with `client:only="react"` is an **independent React root** — it has no parent React context.
3. If each island wraps its content in `<ClerkProvider>` (from `@clerk/clerk-react`), multiple Clerk instances are created on the same page. Clerk detects this and throws.

This is especially problematic when you have multiple islands on one page — for example, a navbar dietary profile button AND a room content area.

## The Solution

Use `@clerk/astro/react` instead of `@clerk/clerk-react`.

`@clerk/astro/react` exports React hooks (`useAuth`, `SignedIn`, `SignedOut`, etc.) that connect to the **Astro-level Clerk instance** — no `ClerkProvider` needed in your React components.

### Before (broken)

```tsx
// ConvexClientProvider.tsx — WRONG
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

export default function ConvexClientProvider({ children }) {
  const convex = useMemo(() => new ConvexReactClient(url), []);

  return (
    <ClerkProvider publishableKey={...}>          {/* <-- Creates duplicate Clerk instance */}
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

### After (working)

```tsx
// ConvexClientProvider.tsx — CORRECT
import { useAuth } from "@clerk/astro/react";               // <-- Astro's Clerk hooks
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

export default function ConvexClientProvider({ children }) {
  const convex = useMemo(() => new ConvexReactClient(url), []);

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}                                              {/* No ClerkProvider needed */}
    </ConvexProviderWithClerk>
  );
}
```

## Key Rules

1. **Never import from `@clerk/clerk-react`** in an Astro project using `@clerk/astro`. Always use `@clerk/astro/react` for React hooks.

2. **Never wrap React islands in `<ClerkProvider>`**. The Astro integration already provides Clerk at the page level.

3. **`useClerk()` is not available** from `@clerk/astro/react`. If you need the Clerk instance directly (e.g., to call `openSignIn()`), use the global: `(window as any).Clerk?.openSignIn()`.

4. **Convex + Clerk integration** works fine — `ConvexProviderWithClerk` accepts a `useAuth` prop that works with `@clerk/astro/react`'s `useAuth` hook.

## Middleware Gotcha

`@clerk/astro`'s middleware API also differs from Next.js:

- `auth().protect()` **does not exist**. The equivalent is `auth().redirectToSignIn()`.
- `redirectToSignIn()` does a **full-page redirect** to Clerk's hosted sign-in page. If your app uses Clerk's modal sign-in (`<SignInButton mode="modal" />`), this breaks the UX.
- **Our approach**: We use a client-side `AuthGate` component instead of middleware route protection. It checks `useAuth().isSignedIn` and opens the sign-in modal if needed.

```tsx
// AuthGate.tsx
import { useAuth } from "@clerk/astro/react";
import { useEffect } from "react";

export default function AuthGate({ children }) {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      (window as any).Clerk?.openSignIn();
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) return <div>Loading...</div>;
  if (!isSignedIn) return <div>Please sign in to continue.</div>;
  return <>{children}</>;
}
```

## Stack Reference

- Astro 5.x with `output: 'server'`
- `@clerk/astro` (Astro integration — provides Clerk at page level)
- `@clerk/astro/react` (React hooks that connect to Astro's Clerk)
- `convex/react-clerk` (Convex + Clerk bridge)
- React islands via `client:only="react"`

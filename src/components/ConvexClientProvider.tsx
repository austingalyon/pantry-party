import { useAuth } from "@clerk/astro/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { useMemo } from "react";

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => {
    const url = import.meta.env.PUBLIC_CONVEX_URL;
    if (!url) {
      throw new Error("PUBLIC_CONVEX_URL is not set. Add it to your .env.local file.");
    }
    return new ConvexReactClient(url);
  }, []);

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}

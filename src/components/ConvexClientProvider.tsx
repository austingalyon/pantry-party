import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { useMemo } from "react";

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => {
    const url = import.meta.env.PUBLIC_CONVEX_URL;
    console.log("ConvexClientProvider - Convex URL:", url);
    if (!url) {
      console.error("PUBLIC_CONVEX_URL is not set. Please add it to your .env.local file.");
      // Return a dummy client for development
      return new ConvexReactClient("http://127.0.0.1:3210");
    }
    return new ConvexReactClient(url);
  }, []);

  return <ConvexProviderWithClerk client={convex} useAuth={useAuth}>{children}</ConvexProviderWithClerk>;
}

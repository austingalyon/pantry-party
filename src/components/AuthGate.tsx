import { useAuth, useClerk } from "@clerk/clerk-react";
import { useEffect } from "react";
import type { ReactNode } from "react";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      clerk.openSignIn();
    }
  }, [isLoaded, isSignedIn, clerk]);

  if (!isLoaded) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (!isSignedIn) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please sign in to continue.</p>
      </div>
    );
  }

  return <>{children}</>;
}

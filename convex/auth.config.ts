import type { AuthConfig } from "convex/server";

const authConfig: AuthConfig = {
  providers: [
    {
      // Replace with your own Clerk Issuer URL from your "convex" JWT template
      // or with `process.env.CLERK_JWT_ISSUER_DOMAIN`
      // and configure CLERK_JWT_ISSUER_DOMAIN on the Convex Dashboard
      // See https://docs.convex.dev/auth/clerk#configuring-dev-and-prod-instances
      // domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      domain: "https://handy-sheepdog-31.clerk.accounts.dev/",
      applicationID: "convex",
    },
  ]
};

export default authConfig;
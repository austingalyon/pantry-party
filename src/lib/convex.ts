import { ConvexReactClient } from "convex/react";

const CONVEX_URL = import.meta.env.PUBLIC_CONVEX_URL || "";

export const convex = new ConvexReactClient(CONVEX_URL);

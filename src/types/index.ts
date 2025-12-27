// Re-export all types
export * from "./resume";

// User types
export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
};


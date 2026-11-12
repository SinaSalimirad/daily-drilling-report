import z from "zod";

// Reusable numeric configuration
export const numericConfig = {
  precision: 12,
  scale: 3,
  mode: "number",
} as const;

// Required text fields: trimmed, non-empty, and within the varchar(255) column limit.
export const requiredText = z.string().trim().min(1).max(255);

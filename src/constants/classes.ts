export const CLASS_CODES = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
  "D1",
  "D2",
  "E1",
  "E2",
] as const;

export type ClassCode = (typeof CLASS_CODES)[number];

export function isClassCode(value: unknown): value is ClassCode {
  return (
    typeof value === "string" &&
    (CLASS_CODES as readonly string[]).includes(value.trim().toUpperCase())
  );
}


/**
 * Sistem Desain Terpusat (Design Tokens) — Labora Clean Teal UI
 * Mengacu pada aset desain di `docs/ui` (tanpa gradasi ramai, kontras tinggi, bersih & profesional).
 */

export const COLORS = {
  // Brand Primary (Deep Teal / Emerald)
  primary: "#0E6F5C",
  primaryPressed: "#0A5849",
  primarySoft: "#E8F7F3",
  primarySurface: "#ECFDF7",
  primaryBorder: "#A7E8D8",

  // Neutrals & Surfaces (Modern Surface Polish: #F8F9FA contrast + #FFFFFF card + #E5E7EB 1px border)
  background: "#FFFFFF",
  surfaceSubtle: "#F8F9FA",
  segmentedTrack: "#F1F5F9",
  card: "#FFFFFF",
  border: "#E5E7EB",
  borderStrong: "#CBD5E1",
  divider: "#F1F5F9",

  // Typography (#111827 high-contrast dark neutral, #6B7280 muted neutral)
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  textOnPrimary: "#FFFFFF",

  // Semantic Statuses
  successText: "#0E6F5C",
  successBg: "#E8F7F3",
  successBorder: "#B7E4D8",

  warningText: "#B45309",
  warningBg: "#FEF9C3",
  warningBorder: "#FDE68A",

  dangerText: "#DC2626",
  dangerDark: "#991B1B",
  dangerBg: "#FEF2F2",
  dangerBorder: "#FECACA",

  neutralBadgeText: "#475569",
  neutralBadgeBg: "#F1F5F9",
  neutralBadgeBorder: "#E2E8F0",
} as const;

export const RADIUS = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  pill: 999,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
} as const;

export function getGreetingByHour(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 4 && hour < 11) return "Selamat pagi";
  if (hour >= 11 && hour < 15) return "Selamat siang";
  if (hour >= 15 && hour < 19) return "Selamat sore";
  return "Selamat malam";
}

export function getFirstName(fullName?: string | null): string {
  if (!fullName) return "Pengguna";
  const trimmed = fullName.trim();
  if (!trimmed) return "Pengguna";
  return trimmed.split(/\s+/)[0] || trimmed;
}

export function getDisplayName(
  fullName?: string | null,
  maxWords: number = 3,
): string {
  if (!fullName) return "Pengguna";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Pengguna";
  return parts.slice(0, maxWords).join(" ");
}

export interface Material {
  color: string;
  opacity: number;
  emissive?: string;
  roughness?: number;
}

export function hexToRgba(hex: string, opacity = 1): [number, number, number, number] {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized.padEnd(6, "0").slice(0, 6);
  const int = Number.parseInt(value, 16);
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255, opacity];
}

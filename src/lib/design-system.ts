/**
 * Contrato visual de Parley.
 *
 * Los valores de identidad viven aquí para que marca, favicon, pruebas y
 * documentación hablen el mismo idioma. Los tokens que cambian con el tema
 * continúan en `globals.css`; las pruebas afirman que ambos lados coinciden.
 */
export const PARLEY_BRAND = {
  name: "Parley",
  primary: "#4f46e5",
  primaryHover: "#4338ca",
  primarySoft: "#c7d2fe",
  primaryTint: "#eef2ff",
  primaryText: "#3730a3",
  primaryForeground: "#ffffff",
  signal: "#14b8a6",
  signalOnTile: "#5eead4",
} as const;

export const VISUAL_SCALE = {
  spacing: [4, 8, 12, 16, 24, 32, 48],
  controlHeight: { compact: 32, default: 36, comfortable: 40 },
  iconSize: { compact: 16, default: 18, prominent: 20 },
  iconStrokeWidth: 1.8,
  radius: { compact: 9, control: 12, surface: 16 },
  contentWidth: { narrow: 672, wide: 768 },
} as const;

export const MIN_CONTRAST = {
  bodyText: 4.5,
  largeTextAndUi: 3,
  focusIndicator: 3,
} as const;

type Rgb = { r: number; g: number; b: number };

function rgb(hex: string): Rgb {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error(`Color inválido: ${hex}`);
  }
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function luminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Relación WCAG; se exporta para validar cualquier futuro token o preset. */
export function contrastRatio(foreground: string, background: string): number {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))];
  const high = Math.max(...values);
  const low = Math.min(...values);
  return (high + 0.05) / (low + 0.05);
}

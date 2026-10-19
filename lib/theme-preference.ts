/**
 * FR-4.4: user theme preference. "system" follows the OS color scheme; the
 * value is stored under the "lifeos.ui.theme" localStorage key.
 */
export type ThemePreference = "light" | "dark" | "system";

export const themeOrder: readonly ThemePreference[] = [
  "light",
  "dark",
  "system",
];

export function isThemePreference(
  value: unknown,
): value is ThemePreference {
  return (
    value === "light" || value === "dark" || value === "system"
  );
}

export function nextTheme(current: ThemePreference): ThemePreference {
  const index = themeOrder.indexOf(current);
  return themeOrder[(index + 1) % themeOrder.length] ?? "system";
}

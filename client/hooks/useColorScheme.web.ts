/**
 * Laqit is a light-only app — always return "light" regardless of system preference.
 */
export function useColorScheme() {
  return "light" as const;
}

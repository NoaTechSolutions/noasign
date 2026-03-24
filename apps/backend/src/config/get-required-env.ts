export function getRequiredEnv(
  value: string | undefined,
  name: string,
): string {
  if (!value?.trim()) {
    throw new Error(`${name} is required`);
  }

  return value;
}

export type ErrorLike = { shortMessage?: string; message?: string };

export function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const e = error as ErrorLike;
    return e.shortMessage ?? e.message ?? String(error);
  }
  return String(error);
}

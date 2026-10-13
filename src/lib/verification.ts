export interface VerifyTokenResult {
  success: boolean;
  message: string | null;
  next_step: string | null;
}

export function readVerifyTokenResult(data: unknown): VerifyTokenResult | null {
  if (!data || typeof data !== 'object' || !('success' in data)) return null;

  const row = data as Record<string, unknown>;
  return {
    success: Boolean(row.success),
    message: typeof row.message === 'string' ? row.message : null,
    next_step: typeof row.next_step === 'string' ? row.next_step : null,
  };
}

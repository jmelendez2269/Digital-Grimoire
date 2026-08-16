import "server-only";

export async function measureServerOperation<T>(
  operation: string,
  run: () => Promise<T>,
  warnAfterMs = 750
): Promise<T> {
  const startedAt = performance.now();

  try {
    return await run();
  } finally {
    const durationMs = performance.now() - startedAt;
    if (durationMs >= warnAfterMs) {
      console.warn("[performance] Slow server operation", {
        operation,
        durationMs: Math.round(durationMs),
      });
    }
  }
}

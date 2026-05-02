export type RefreshError = {
  assetId: string;
  reason: string;
};

export function buildRefreshSummary(
  assetIds: string[],
  results: PromiseSettledResult<unknown>[],
  defaultErrorMessage: string,
  onError?: (error: RefreshError) => void,
) {
  const errors = results
    .map((result, index) => {
      if (result.status === 'fulfilled') {
        return null;
      }

      const error = {
        assetId: assetIds[index] ?? 'unknown',
        reason:
          result.reason instanceof Error
            ? result.reason.message
            : defaultErrorMessage,
      };

      onError?.(error);
      return error;
    })
    .filter((item): item is RefreshError => item !== null);

  const refreshed = results.length - errors.length;

  return {
    total: assetIds.length,
    refreshed,
    failed: errors.length,
    errors,
  };
}

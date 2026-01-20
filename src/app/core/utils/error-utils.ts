type ErrorDetail = {
  path?: string;
  detail?: string;
  description?: string;
  message?: string;
};

export function extractFieldErrors(error: unknown): Record<string, string> {
  const err = error as {
    error?: {
      details?: ErrorDetail[];
    };
  } | null;

  const details = err?.error?.details;
  if (!Array.isArray(details)) return {};

  return details.reduce<Record<string, string>>((acc, item) => {
    const key = String(item?.path || '').trim();
    const message = item?.detail || item?.description || item?.message || '';
    if (key && message) acc[key] = message;
    return acc;
  }, {});
}

export function extractErrorMessage(error: unknown): string {
  const err = error as {
    error?: {
      errors?: string;
      message?: string;
      details?: ErrorDetail[];
    };
    message?: string;
  } | null;

  const details = err?.error?.details;
  if (Array.isArray(details) && details.length > 0) {
    const detailMessages = details
      .map((item) => item?.detail || item?.description || item?.message || item?.path || '')
      .filter((msg) => !!msg);

    if (detailMessages.length > 0) {
      return detailMessages.join(', ');
    }
  }

  return (
    err?.error?.errors ||
    err?.error?.message ||
    err?.message ||
    'Terjadi kesalahan'
  );
}

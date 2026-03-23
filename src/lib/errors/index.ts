export class APIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = "INTERNAL_ERROR",
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "APIError";
  }
}

export function createErrorResponse(error: unknown, requestId?: string) {
  const timestamp = new Date().toISOString();

  if (error instanceof APIError) {
    return {
      body: JSON.stringify({
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
        requestId,
        timestamp,
      }),
      status: error.statusCode,
      headers: { "Content-Type": "application/json" },
    };
  }

  return {
    body: JSON.stringify({
      error: "An unexpected error occurred",
      code: "UNKNOWN_ERROR",
      statusCode: 500,
      requestId,
      timestamp,
    }),
    status: 500,
    headers: { "Content-Type": "application/json" },
  };
}

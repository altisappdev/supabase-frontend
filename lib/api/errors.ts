import axios from "axios";

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | {
          message?: string | string[];
          error?: string;
          errors?: Array<{ field?: string; errors?: string[] }>;
        }
      | undefined;

    if (typeof data?.message === "string") {
      return data.message;
    }

    if (Array.isArray(data?.message) && data.message.length > 0) {
      return data.message.join(", ");
    }

    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      const flattened = data.errors.flatMap((item) => item.errors ?? []);

      if (flattened.length > 0) {
        return flattened.join(", ");
      }
    }

    if (typeof data?.error === "string") {
      return data.error;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

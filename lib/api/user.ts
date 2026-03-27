import { apiClient } from "@/lib/api/client";
import type { ApiResponseEnvelope, UserProfile } from "@/lib/types";

export async function getCurrentUser() {
  const response = await apiClient.get<ApiResponseEnvelope<UserProfile>>("/user/me");
  return response.data.data;
}

export async function updateCurrentUser(formData: FormData) {
  const response = await apiClient.patch<ApiResponseEnvelope<UserProfile>>(
    "/user/profile",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data.data;
}

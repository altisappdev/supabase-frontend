import { apiClient } from "@/lib/api/client";
import type { ApiResponseEnvelope, Todo } from "@/lib/types";

export async function fetchTodos() {
  const response = await apiClient.get<ApiResponseEnvelope<Todo[]>>("/todo");
  return response.data.data;
}

export async function createTodo(payload: {
  title: string;
  description?: string;
  priority: Todo["priority"];
  due_date?: string;
  is_completed?: boolean;
}) {
  const response = await apiClient.post<ApiResponseEnvelope<Todo>>("/todo", payload);
  return response.data.data;
}

export async function updateTodo(
  todoId: string,
  payload: Partial<{
    title: string;
    description: string;
    priority: Todo["priority"];
    due_date: string;
    is_completed: boolean;
  }>,
) {
  const response = await apiClient.patch<ApiResponseEnvelope<Todo>>(`/todo/${todoId}`, payload);
  return response.data.data;
}

export async function deleteTodo(todoId: string) {
  await apiClient.delete(`/todo/${todoId}`);
}

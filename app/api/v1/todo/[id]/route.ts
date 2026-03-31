import { errorResponse, jsonResponse } from "@/lib/server/api-response";
import { authenticateRequest } from "@/lib/server/auth/session";
import { deleteTodo, getTodoById, updateTodo } from "@/lib/server/todo/service";
import { parseJsonBody } from "@/lib/server/request-utils";
import type { Priority } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await authenticateRequest(request);
    const todo = await getTodoById(id, auth.userId);

    return jsonResponse(todo, "Todo fetched successfully.");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await authenticateRequest(request);
    const payload = await parseJsonBody<Partial<{
      title: string;
      description: string;
      priority: Priority;
      due_date: string;
      is_completed: boolean;
    }>>(request);
    const todo = await updateTodo(id, auth.userId, payload);

    return jsonResponse(todo, "Todo updated successfully.");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await authenticateRequest(request);
    await deleteTodo(id, auth.userId);

    return jsonResponse(null, "Todo deleted successfully.");
  } catch (error) {
    return errorResponse(error);
  }
}
import { errorResponse, jsonResponse } from "@/lib/server/api-response";
import { authenticateRequest } from "@/lib/server/auth/session";
import { createTodo, getTodos } from "@/lib/server/todo/service";
import { parseJsonBody } from "@/lib/server/request-utils";
import type { Priority } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    const todos = await getTodos(auth.userId);

    return jsonResponse(todos, "Todos fetched successfully.");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    const payload = await parseJsonBody<{
      title?: string;
      description?: string;
      priority?: Priority;
      due_date?: string;
      is_completed?: boolean;
    }>(request);
    const todo = await createTodo(auth.userId, payload);

    return jsonResponse(todo, "Todo created successfully.", 201);
  } catch (error) {
    return errorResponse(error);
  }
}

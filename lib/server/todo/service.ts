import { HttpError } from "@/lib/server/errors";
import { assertNoSupabaseError, getSupabaseAdmin } from "@/lib/server/supabase/client";
import type { Priority, TodoRow } from "@/lib/server/supabase/types";

interface CreateTodoInput {
  title?: string;
  description?: string | null;
  priority?: Priority;
  due_date?: string | null;
  is_completed?: boolean;
}

export async function getTodos(userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("tbl_todos")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  assertNoSupabaseError(error, "Failed to fetch todos");
  return (data as TodoRow[]) ?? [];
}

export async function getTodoById(id: string, userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("tbl_todos")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  assertNoSupabaseError(error, "Failed to fetch todo");

  if (!data) {
    throw new HttpError(404, "Todo not found.");
  }

  return data as TodoRow;
}

export async function createTodo(userId: string, input: CreateTodoInput) {
  if (!input.title?.trim()) {
    throw new HttpError(400, "Title is required.");
  }

  if (input.priority && !["LOW", "MEDIUM", "HIGH"].includes(input.priority)) {
    throw new HttpError(400, "Priority must be LOW, MEDIUM, or HIGH.");
  }

  const { data, error } = await getSupabaseAdmin()
    .from("tbl_todos")
    .insert({
      user_id: userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      priority: input.priority || "MEDIUM",
      due_date: input.due_date ? new Date(input.due_date).toISOString() : null,
      is_completed: input.is_completed ?? false,
    })
    .select("*")
    .single();

  assertNoSupabaseError(error, "Failed to create todo");
  return data as TodoRow;
}

export async function updateTodo(
  id: string,
  userId: string,
  input: Partial<CreateTodoInput>,
) {
  await getTodoById(id, userId);

  const payload: Record<string, unknown> = {};

  if (input.title !== undefined) {
    if (!input.title.trim()) {
      throw new HttpError(400, "Title is required.");
    }

    payload.title = input.title.trim();
  }

  if (input.description !== undefined) {
    payload.description = input.description?.trim() || null;
  }

  if (input.priority !== undefined) {
    if (!["LOW", "MEDIUM", "HIGH"].includes(input.priority)) {
      throw new HttpError(400, "Priority must be LOW, MEDIUM, or HIGH.");
    }

    payload.priority = input.priority;
  }

  if (input.due_date !== undefined) {
    payload.due_date = input.due_date ? new Date(input.due_date).toISOString() : null;
  }

  if (input.is_completed !== undefined) {
    payload.is_completed = input.is_completed;
  }

  if (Object.keys(payload).length === 0) {
    return getTodoById(id, userId);
  }

  const { data, error } = await getSupabaseAdmin()
    .from("tbl_todos")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  assertNoSupabaseError(error, "Failed to update todo");
  return data as TodoRow;
}

export async function deleteTodo(id: string, userId: string) {
  await getTodoById(id, userId);

  const { error } = await getSupabaseAdmin()
    .from("tbl_todos")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  assertNoSupabaseError(error, "Failed to delete todo");
  return true;
}

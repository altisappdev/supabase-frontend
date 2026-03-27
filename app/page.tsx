"use client";

import { useEffect, useMemo, useState } from "react";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { ProtectedShell } from "@/components/auth/protected-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { AppHeader } from "@/components/ui/app-header";
import { createTodo, deleteTodo, fetchTodos, updateTodo } from "@/lib/api/todos";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { Priority, Todo } from "@/lib/types";

type TodoFormState = {
  title: string;
  description: string;
  priority: Priority;
  dueDate: string;
  isCompleted: boolean;
};

type TodoFilter = "ALL" | "OPEN" | "DONE";

const emptyForm: TodoFormState = {
  title: "",
  description: "",
  priority: "MEDIUM",
  dueDate: "",
  isCompleted: false,
};

function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function formatDate(value: string | null) {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getPriorityColor(priority: Priority) {
  switch (priority) {
    case "HIGH":
      return "error";
    case "LOW":
      return "info";
    default:
      return "warning";
  }
}

export default function DashboardPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { status } = useAuth();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [form, setForm] = useState<TodoFormState>(emptyForm);
  const [activeFilter, setActiveFilter] = useState<TodoFilter>("ALL");
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [isLoadingTodos, setIsLoadingTodos] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionTodoId, setActionTodoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    async function loadTodos() {
      setIsLoadingTodos(true);

      try {
        const response = await fetchTodos();
        setTodos(response);
      } catch (error) {
        enqueueSnackbar(getApiErrorMessage(error, "Unable to load todos."), {
          variant: "error",
          autoHideDuration: 1500,
        });
      } finally {
        setIsLoadingTodos(false);
      }
    }

    void loadTodos();
  }, [enqueueSnackbar, status]);

  const filteredTodos = useMemo(() => {
    let filtered = todos;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(todo =>
        todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (todo.description && todo.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply status filter
    if (activeFilter === "OPEN") {
      filtered = filtered.filter((todo) => !todo.is_completed);
    } else if (activeFilter === "DONE") {
      filtered = filtered.filter((todo) => todo.is_completed);
    }

    return filtered;
  }, [activeFilter, todos, searchQuery]);

  const stats = useMemo(
    () => [
      { label: "Total", value: todos.length },
      { label: "Open", value: todos.filter((todo) => !todo.is_completed).length },
      { label: "Completed", value: todos.filter((todo) => todo.is_completed).length },
    ],
    [todos],
  );

  function resetForm() {
    setForm(emptyForm);
    setEditingTodoId(null);
    setShowAddForm(false);
  }

  function startEdit(todo: Todo) {
    setEditingTodoId(todo.id);
    setForm({
      title: todo.title,
      description: todo.description ?? "",
      priority: todo.priority,
      dueDate: toDateTimeLocalValue(todo.due_date),
      isCompleted: todo.is_completed,
    });
    setShowAddForm(true);
  }

  async function handleSubmit() {
    if (!form.title.trim()) {
      enqueueSnackbar("Title is required.", { variant: "warning", autoHideDuration: 1500 });
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      priority: form.priority,
      due_date: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      is_completed: form.isCompleted,
    };

    setIsSubmitting(true);

    try {
      if (editingTodoId) {
        const updatedTodo = await updateTodo(editingTodoId, payload);
        setTodos((currentTodos) =>
          currentTodos.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo)),
        );
        enqueueSnackbar("Todo updated successfully.", { variant: "success", autoHideDuration: 1500 });
      } else {
        const createdTodo = await createTodo(payload);
        setTodos((currentTodos) => [createdTodo, ...currentTodos]);
        enqueueSnackbar("Todo created successfully.", { variant: "success", autoHideDuration: 1500 });
      }

      resetForm();
    } catch (error) {
      enqueueSnackbar(getApiErrorMessage(error, "Unable to save the todo."), {
        variant: "error",
        autoHideDuration: 1500,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(todoId: string) {
    setActionTodoId(todoId);

    try {
      await deleteTodo(todoId);
      setTodos((currentTodos) => currentTodos.filter((todo) => todo.id !== todoId));

      if (editingTodoId === todoId) {
        resetForm();
      }

      enqueueSnackbar("Todo deleted successfully.", { variant: "success", autoHideDuration: 1500 });
    } catch (error) {
      enqueueSnackbar(getApiErrorMessage(error, "Unable to delete the todo."), {
        variant: "error",
        autoHideDuration: 1500,
      });
    } finally {
      setActionTodoId(null);
    }
  }

  async function handleToggle(todo: Todo) {
    setActionTodoId(todo.id);

    try {
      const updatedTodo = await updateTodo(todo.id, {
        is_completed: !todo.is_completed,
      });

      setTodos((currentTodos) =>
        currentTodos.map((currentTodo) =>
          currentTodo.id === updatedTodo.id ? updatedTodo : currentTodo,
        ),
      );
      enqueueSnackbar(
        updatedTodo.is_completed ? "Todo marked as completed." : "Todo moved back to active.",
        { variant: "success", autoHideDuration: 1500 },
      );
    } catch (error) {
      enqueueSnackbar(getApiErrorMessage(error, "Unable to update the todo."), {
        variant: "error",
        autoHideDuration: 1500,
      });
    } finally {
      setActionTodoId(null);
    }
  }

  return (
    <ProtectedShell>
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
        <AppHeader title="Todos" subtitle="Plan your work with a clean, focused list." />

        <Stack spacing={3}>
          <Card variant="outlined">
            <CardContent>
              <Grid container spacing={2}>
                {stats.map((stat) => (
                  <Grid item xs={4} key={stat.label}>
                    <Typography variant="caption" color="text.secondary">
                      {stat.label}
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {stat.value}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by title or description"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <Stack direction="row" spacing={1}>
                  {(["ALL", "OPEN", "DONE"] as TodoFilter[]).map((filter) => (
                    <Button
                      key={filter}
                      variant={activeFilter === filter ? "contained" : "outlined"}
                      onClick={() => setActiveFilter(filter)}
                      size="small"
                    >
                      {filter}
                    </Button>
                  ))}
                </Stack>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowAddForm((value) => !value)}>
                  {showAddForm ? "Close" : "Add Todo"}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {showAddForm ? (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {editingTodoId ? "Edit Todo" : "Create Todo"}
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Title"
                    value={form.title}
                    onChange={(event) => setForm((currentForm) => ({ ...currentForm, title: event.target.value }))}
                  />
                  <TextField
                    fullWidth
                    label="Description"
                    value={form.description}
                    onChange={(event) =>
                      setForm((currentForm) => ({ ...currentForm, description: event.target.value }))
                    }
                    multiline
                    rows={3}
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Priority</InputLabel>
                        <Select
                          value={form.priority}
                          label="Priority"
                          onChange={(event) =>
                            setForm((currentForm) => ({
                              ...currentForm,
                              priority: event.target.value as Priority,
                            }))
                          }
                        >
                          <MenuItem value="LOW">Low</MenuItem>
                          <MenuItem value="MEDIUM">Medium</MenuItem>
                          <MenuItem value="HIGH">High</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        type="datetime-local"
                        label="Due date"
                        value={form.dueDate}
                        onChange={(event) =>
                          setForm((currentForm) => ({ ...currentForm, dueDate: event.target.value }))
                        }
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </Grid>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={form.isCompleted}
                        onChange={(event) =>
                          setForm((currentForm) => ({ ...currentForm, isCompleted: event.target.checked }))
                        }
                      />
                    }
                    label="Mark as completed"
                  />
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" onClick={() => void handleSubmit()} disabled={isSubmitting}>
                      {isSubmitting ? "Saving..." : editingTodoId ? "Update" : "Create"}
                    </Button>
                    <Button variant="outlined" onClick={resetForm}>
                      Cancel
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ) : null}

          {isLoadingTodos ? (
            <Stack spacing={2}>
              <Skeleton variant="rounded" height={80} />
              <Skeleton variant="rounded" height={80} />
              <Skeleton variant="rounded" height={80} />
            </Stack>
          ) : filteredTodos.length === 0 ? (
            <Card variant="outlined">
              <CardContent sx={{ textAlign: "center", py: 6 }}>
                <Typography variant="h6">{searchQuery ? "No matching todos" : "No todos yet"}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {searchQuery ? "Try a different search term." : "Create your first todo to start."}
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Stack spacing={1.5}>
              {filteredTodos.map((todo) => {
                const isBusy = actionTodoId === todo.id;
                return (
                  <Card variant="outlined" key={todo.id} sx={{ opacity: isBusy ? 0.65 : 1 }}>
                    <CardContent>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <Checkbox
                          checked={todo.is_completed}
                          onChange={() => void handleToggle(todo)}
                          disabled={isBusy}
                          icon={<RadioButtonUncheckedIcon />}
                          checkedIcon={<CheckCircleIcon />}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Typography
                              variant="subtitle1"
                              sx={{
                                textDecoration: todo.is_completed ? "line-through" : "none",
                                color: todo.is_completed ? "text.secondary" : "text.primary",
                              }}
                            >
                              {todo.title}
                            </Typography>
                            <Chip size="small" label={todo.priority} color={getPriorityColor(todo.priority)} />
                          </Stack>
                          {todo.description ? (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {todo.description}
                            </Typography>
                          ) : null}
                          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                            {todo.due_date ? (
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <CalendarTodayIcon fontSize="inherit" />
                                <Typography variant="caption">{formatDate(todo.due_date)}</Typography>
                              </Stack>
                            ) : null}
                            <Typography variant="caption" color="text.secondary">
                              Created {formatDate(todo.created_at)}
                            </Typography>
                          </Stack>
                        </Box>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" onClick={() => startEdit(todo)}>
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => void handleDelete(todo.id)}
                            disabled={isBusy}
                            color="error"
                          >
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Container>
    </ProtectedShell>
  );
}

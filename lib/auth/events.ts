export const AUTH_EVENT_NAME = "todo-auth-state-change";

type AuthEventType = "tokens-updated" | "logged-out";

export function dispatchAuthEvent(type: AuthEventType) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(AUTH_EVENT_NAME, {
      detail: { type },
    }),
  );
}

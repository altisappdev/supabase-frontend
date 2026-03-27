"use client";

import { useMemo } from "react";
import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { SnackbarProvider } from "notistack";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { AuthProvider } from "@/components/providers/auth-provider";

function buildTheme(mode: "light" | "dark") {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: mode === "dark" ? "#78f0cb" : "#0c7a63",
        light: mode === "dark" ? "#9affdb" : "#0f8d73",
        dark: mode === "dark" ? "#56c0a8" : "#0a5f4c",
        contrastText: "#ffffff",
      },
      secondary: {
        main: mode === "dark" ? "#ffb38f" : "#ff7a59",
        light: mode === "dark" ? "#ffc3a5" : "#ff8a6b",
        dark: mode === "dark" ? "#ff936f" : "#e56a48",
        contrastText: "#ffffff",
      },
      background: {
        default: mode === "dark" ? "#071118" : "#f2f7f9",
        paper: mode === "dark" ? "#10222b" : "#ffffff",
      },
      text: {
        primary: mode === "dark" ? "#eff8fc" : "#112233",
        secondary: mode === "dark" ? "#9cb7c2" : "#5d7381",
      },
      success: {
        main: mode === "dark" ? "#4ade80" : "#22c55e",
        light: mode === "dark" ? "#6ee7a0" : "#4ade80",
        dark: mode === "dark" ? "#22c55e" : "#16a34a",
      },
      warning: {
        main: mode === "dark" ? "#fbbf24" : "#f59e0b",
        light: mode === "dark" ? "#fcd34d" : "#fbbf24",
        dark: mode === "dark" ? "#f59e0b" : "#d97706",
      },
      error: {
        main: mode === "dark" ? "#f87171" : "#ef4444",
        light: mode === "dark" ? "#fca5a5" : "#f87171",
        dark: mode === "dark" ? "#ef4444" : "#dc2626",
      },
      info: {
        main: mode === "dark" ? "#60a5fa" : "#3b82f6",
        light: mode === "dark" ? "#93c5fd" : "#60a5fa",
        dark: mode === "dark" ? "#3b82f6" : "#2563eb",
      },
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: "var(--font-body), sans-serif",
      h1: {
        fontFamily: "var(--font-heading), sans-serif",
        fontWeight: 700,
        fontSize: "3.5rem",
        lineHeight: 1.2,
        letterSpacing: "-0.02em",
      },
      h2: {
        fontFamily: "var(--font-heading), sans-serif",
        fontWeight: 700,
        fontSize: "2.5rem",
        lineHeight: 1.3,
        letterSpacing: "-0.02em",
      },
      h3: {
        fontFamily: "var(--font-heading), sans-serif",
        fontWeight: 600,
        fontSize: "2rem",
        lineHeight: 1.4,
        letterSpacing: "-0.01em",
      },
      h4: {
        fontFamily: "var(--font-heading), sans-serif",
        fontWeight: 600,
        fontSize: "1.5rem",
        lineHeight: 1.4,
        letterSpacing: "-0.01em",
      },
      h5: {
        fontFamily: "var(--font-heading), sans-serif",
        fontWeight: 600,
        fontSize: "1.25rem",
        lineHeight: 1.4,
      },
      h6: {
        fontFamily: "var(--font-heading), sans-serif",
        fontWeight: 600,
        fontSize: "1.125rem",
        lineHeight: 1.4,
      },
      body1: {
        fontSize: "1rem",
        lineHeight: 1.6,
      },
      body2: {
        fontSize: "0.875rem",
        lineHeight: 1.5,
      },
      caption: {
        fontSize: "0.75rem",
        lineHeight: 1.4,
        letterSpacing: "0.05em",
      },
      button: {
        textTransform: "none",
        fontWeight: 600,
        fontSize: "0.875rem",
        borderRadius: 8,
      },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: mode === "dark"
              ? "0 10px 40px rgba(0, 0, 0, 0.3)"
              : "0 10px 40px rgba(0, 0, 0, 0.08)",
            backdropFilter: "blur(24px)",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            padding: "12px 24px",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow: "0 8px 25px rgba(0, 0, 0, 0.15)",
            },
          },
          contained: {
            background:
              "linear-gradient(135deg, var(--mui-palette-primary-main), var(--mui-palette-primary-dark))",
            color: "var(--mui-palette-primary-contrastText)",
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: 12,
              transition: "all 0.2s ease-in-out",
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: mode === "dark" ? "#4ade80" : "#0c7a63",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: mode === "dark" ? "#4ade80" : "#0c7a63",
                borderWidth: 2,
              },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            fontSize: "0.75rem",
            borderRadius: 16,
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            boxShadow: mode === "dark"
              ? "0 8px 32px rgba(0, 0, 0, 0.3)"
              : "0 8px 32px rgba(0, 0, 0, 0.12)",
          },
        },
      },
    },
  });
}

function MuiThemeBridge({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  const theme = useMemo(
    () => buildTheme(resolvedTheme === "dark" ? "dark" : "light"),
    [resolvedTheme],
  );

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <MuiThemeBridge>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <SnackbarProvider
            maxSnack={3}
            autoHideDuration={4500}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <AuthProvider>{children}</AuthProvider>
          </SnackbarProvider>
        </LocalizationProvider>
      </MuiThemeBridge>
    </NextThemesProvider>
  );
}

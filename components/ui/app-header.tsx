"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import { Avatar, Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { useAuth } from "@/components/providers/auth-provider";

interface AppHeaderProps {
  title: string;
  subtitle: string;
}

const navItems = [
  { href: "/", label: "Todos", icon: ChecklistRoundedIcon },
  { href: "/profile", label: "Profile", icon: PersonRoundedIcon },
];

function getInitials(firstName?: string | null, lastName?: string | null, email?: string | null) {
  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((value) => value!.trim().charAt(0).toUpperCase())
    .join("");

  if (initials) {
    return initials.slice(0, 2);
  }

  return (email || "U").slice(0, 2).toUpperCase();
}

export function AppHeader({ title, subtitle }: AppHeaderProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const initials = getInitials(user?.first_name, user?.last_name, user?.email);
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "Authenticated user";

  return (
    <Box sx={{ mb: 3 }}>
      <Card variant="outlined">
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  {title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {subtitle}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36 }}>{initials}</Avatar>
                <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                  {fullName}
                </Typography>
                <Button variant="outlined" startIcon={<LogoutRoundedIcon />} onClick={() => void logout()}>
                  Logout
                </Button>
              </Stack>
            </Stack>

            <Stack direction="row" spacing={1}>
              {navItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <Button
                    key={href}
                    component={Link}
                    href={href}
                    variant={isActive ? "contained" : "outlined"}
                    startIcon={<Icon fontSize="small" />}
                    size="small"
                  >
                    {label}
                  </Button>
                );
              })}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

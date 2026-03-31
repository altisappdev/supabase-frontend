"use client";

import { ChangeEvent, useEffect, useState } from "react";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { ProtectedShell } from "@/components/auth/protected-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { AppHeader } from "@/components/ui/app-header";
import { updateCurrentUser } from "@/lib/api/user";
import { getApiErrorMessage } from "@/lib/api/errors";

interface ProfileFormState {
  first_name: string;
  last_name: string;
  email: string;
  phone_no: string;
}

const emptyProfileForm: ProfileFormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone_no: "",
};

function formatLongDate(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ProfilePage() {
  const { enqueueSnackbar } = useSnackbar();
  const { user, setSessionUser } = useAuth();

  const [form, setForm] = useState<ProfileFormState>(emptyProfileForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    setForm({
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      email: user.email ?? "",
      phone_no: user.phone_no ?? "",
    });
  }, [user]);

  useEffect(() => {
    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setImagePreview(objectUrl);

      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }

    setImagePreview(user?.image_url ?? null);
  }, [selectedFile, user?.image_url]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  }

  async function handleSaveProfile() {
    const formData = new FormData();
    formData.append("first_name", form.first_name.trim());
    formData.append("last_name", form.last_name.trim());
    formData.append("email", form.email.trim().toLowerCase());
    formData.append("phone_no", form.phone_no.trim());

    if (selectedFile) {
      formData.append("image", selectedFile);
    }

    setIsSaving(true);

    try {
      const updatedUser = await updateCurrentUser(formData);
      setSessionUser(updatedUser);
      setSelectedFile(null);
      enqueueSnackbar("Profile updated successfully.", { variant: "success", autoHideDuration: 1500 });
    } catch (error) {
      enqueueSnackbar(getApiErrorMessage(error, "Unable to update your profile."), {
        variant: "error",
        autoHideDuration: 1500,
      });
    } finally {
      setIsSaving(false);
    }
  }

  const displayName = [form.first_name, form.last_name].filter(Boolean).join(" ") || "Your profile";

  return (
    <ProtectedShell>
      <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
        <AppHeader
          title="Profile"
          subtitle="Update your account details and profile image."
        />

        <Grid container spacing={2} sx={{ width: "100%" }}>
          <Grid size={12}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
                  <Box textAlign="center">
                    <Avatar
                      src={imagePreview || undefined}
                      sx={{
                        width: 96,
                        height: 96,
                        bgcolor: "primary.main",
                        fontSize: "2rem",
                        fontWeight: "bold",
                        mx: "auto",
                        mb: 1,
                      }}
                    >
                      {displayName.charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {displayName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user?.email || "No email"}
                    </Typography>
                  </Box>

                  <Stack spacing={1} sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip size="small" label={`Role: ${user?.role.title || "Unknown"}`} />
                      <Chip size="small" label={`Auth: ${user?.auth_method || "Unknown"}`} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Created: {formatLongDate(user?.created_at)}
                    </Typography>
                    <Button component="label" variant="outlined" startIcon={<CameraAltRoundedIcon />} sx={{ width: "fit-content" }}>
                      Upload image
                      <input type="file" accept="image/*" onChange={handleFileChange} hidden />
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={12}>
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">Edit details</Typography>
                  <Grid container spacing={2} sx={{ width: "100%" }}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="First name"
                        value={form.first_name}
                        onChange={(event) =>
                          setForm((currentForm) => ({
                            ...currentForm,
                            first_name: event.target.value,
                          }))
                        }
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Last name"
                        value={form.last_name}
                        onChange={(event) =>
                          setForm((currentForm) => ({
                            ...currentForm,
                            last_name: event.target.value,
                          }))
                        }
                      />
                    </Grid>
                    <Grid size={12}>
                      <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={form.email}
                        onChange={(event) =>
                          setForm((currentForm) => ({
                            ...currentForm,
                            email: event.target.value,
                          }))
                        }
                      />
                    </Grid>
                    <Grid size={12}>
                      <TextField
                        fullWidth
                        label="Phone number"
                        value={form.phone_no}
                        onChange={(event) =>
                          setForm((currentForm) => ({
                            ...currentForm,
                            phone_no: event.target.value,
                          }))
                        }
                      />
                    </Grid>
                  </Grid>

                  <Button variant="contained" onClick={() => void handleSaveProfile()} disabled={isSaving} sx={{ width: "fit-content" }}>
                    {isSaving ? "Saving..." : "Save profile"}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </ProtectedShell>
  );
}
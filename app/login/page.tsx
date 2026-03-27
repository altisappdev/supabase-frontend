"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Stack,
  TextField,
  Typography,
  Chip,
} from "@mui/material";
import { useAuth } from "@/components/providers/auth-provider";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSnackbar } from "notistack";
import { checkUserCredential, sendEmailOtp } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api/errors";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function LoginPage() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { login, status } = useAuth();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState<boolean | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [router, status]);

  async function handleSendOtp() {
    const cleanEmail = normalizeEmail(email);

    if (!isValidEmail(cleanEmail)) {
      enqueueSnackbar("Please enter a valid email address.", {
        variant: "warning",
        autoHideDuration: 1500,
      });
      return;
    }

    setIsSendingOtp(true);

    try {
      const checkResult = await checkUserCredential(cleanEmail);
      await sendEmailOtp(cleanEmail);
      setEmail(cleanEmail);
      setIsExistingUser(checkResult.is_exists);
      setOtpSent(true);
      enqueueSnackbar(
        checkResult.is_exists
          ? "OTP sent. Enter the code to continue."
          : "OTP sent. Add your name and code to finish creating your account.",
        { variant: "success", autoHideDuration: 1500 },
      );
    } catch (error) {
      enqueueSnackbar(getApiErrorMessage(error, "Unable to send OTP."), {
        variant: "error",
        autoHideDuration: 1500,
      });
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function handleLogin() {
    const cleanEmail = normalizeEmail(email);

    if (!otp.trim()) {
      enqueueSnackbar("Enter the OTP to continue.", {
        variant: "warning",
        autoHideDuration: 1500,
      });
      return;
    }

    if (isExistingUser === false && (!firstName.trim() || !lastName.trim())) {
      enqueueSnackbar("First name and last name are required for a new account.", {
        variant: "warning",
        autoHideDuration: 1500,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await login({
        email: cleanEmail,
        otp: otp.trim(),
        first_name: isExistingUser ? undefined : firstName.trim(),
        last_name: isExistingUser ? undefined : lastName.trim(),
      });

      enqueueSnackbar("You are signed in.", { variant: "success", autoHideDuration: 1500 });
      router.replace("/");
    } catch (error) {
      enqueueSnackbar(getApiErrorMessage(error, "Unable to sign you in."), {
        variant: "error",
        autoHideDuration: 1500,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "loading" || status === "authenticated") {
    return (
      <LoadingScreen
        title="Preparing your access"
        subtitle="We are checking whether you already have an active session."
      />
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 8 } }}>
      <Card variant="outlined">
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={3}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" fontWeight={700}>
                Sign in with OTP
              </Typography>
              <Chip size="small" label="Email OTP" />
            </Stack>

            <TextField
              fullWidth
              label="Email address"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />

            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={() => void handleSendOtp()}
              disabled={isSendingOtp}
            >
              {isSendingOtp ? "Sending OTP..." : otpSent ? "Resend OTP" : "Send OTP"}
            </Button>

            {otpSent ? (
              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                      {isExistingUser ? "User login" : "New user registration"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {"If OTP not received use 111111"}
                    </Typography>
                    {isExistingUser === false ? (
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="First name"
                            value={firstName}
                            onChange={(event) => setFirstName(event.target.value)}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Last name"
                            value={lastName}
                            onChange={(event) => setLastName(event.target.value)}
                          />
                        </Grid>
                      </Grid>
                    ) : null}

                    <TextField
                      fullWidth
                      label="OTP"
                      value={otp}
                      onChange={(event) => setOtp(event.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="Enter the 6 digit code"
                      inputProps={{ maxLength: 6 }}
                    />

                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      onClick={() => void handleLogin()}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Verifying access..." : isExistingUser ? "Login" : "Create account and login"}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ) : (
              <Alert severity="info">Send OTP to continue.</Alert>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}

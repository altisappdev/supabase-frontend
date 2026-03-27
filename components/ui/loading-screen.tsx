"use client";

import CircularProgress from "@mui/material/CircularProgress";
import { Box, Card, CardContent, Typography } from "@mui/material";

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
}

export function LoadingScreen({
  title = "Loading your workspace",
  subtitle = "Please wait while we prepare the app.",
}: LoadingScreenProps) {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
      <Card variant="outlined" sx={{ width: "100%", maxWidth: 560 }}>
        <CardContent sx={{ textAlign: "center", py: 6 }}>
          <CircularProgress thickness={4.2} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {subtitle}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

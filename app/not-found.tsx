import Link from "next/link";
import { Typography, Button, Box, Container, Card, CardContent } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";

export default function NotFound() {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "70vh",
        }}
      >
        <Card variant="outlined" sx={{ width: "100%" }}>
          <CardContent sx={{ textAlign: "center", py: 6 }}>
            <Typography variant="h2" sx={{ fontWeight: 700, color: "primary.main" }}>
              404
            </Typography>
            <Typography variant="h5" sx={{ mt: 1 }}>
              Page not found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 3 }}>
              The page you are looking for does not exist.
            </Typography>
            <Link href="/" style={{ textDecoration: "none" }}>
              <Button variant="contained" startIcon={<HomeIcon />}>
                Go Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
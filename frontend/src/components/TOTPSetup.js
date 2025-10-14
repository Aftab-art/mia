import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Divider,
} from "@mui/material";
import { QrCode, Security } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";

const TOTPSetup = ({ onComplete }) => {
  const { setupTOTP, verifyTOTP } = useAuth();
  const [step, setStep] = useState(1); // 1: Setup, 2: Verify
  const [setupData, setSetupData] = useState(null);
  const [totpCode, setTotpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSetup = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await setupTOTP();

      if (result.success) {
        setSetupData(result.data);
        setStep(2);
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError("Failed to setup TOTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!totpCode || totpCode.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await verifyTOTP(totpCode);

      if (result.success) {
        onComplete();
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError("Failed to verify TOTP code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: "auto" }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <Security sx={{ mr: 1, fontSize: 30 }} />
          <Typography variant="h4">Setup Two-Factor Authentication</Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {step === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Step 1: Generate QR Code
            </Typography>

            <Typography variant="body1" paragraph>
              Click the button below to generate a QR code that you can scan
              with your authenticator app.
            </Typography>

            <Typography variant="body2" color="text.secondary" paragraph>
              Supported apps:
            </Typography>

            <Box component="ul" sx={{ pl: 2, mb: 3 }}>
              <li>Google Authenticator</li>
              <li>Microsoft Authenticator</li>
              <li>Authy</li>
              <li>1Password</li>
            </Box>

            <Button
              variant="contained"
              size="large"
              onClick={handleSetup}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <QrCode />}
              fullWidth
            >
              {loading ? "Generating..." : "Generate QR Code"}
            </Button>
          </Box>
        )}

        {step === 2 && setupData && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Step 2: Scan QR Code
            </Typography>

            <Typography variant="body1" paragraph>
              Scan the QR code below with your authenticator app:
            </Typography>

            <Box textAlign="center" mb={3}>
              <img
                src={setupData.qr_code}
                alt="TOTP QR Code"
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                }}
              />
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                If you can't scan the QR code, you can manually enter this
                secret key in your authenticator app:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  mt: 1,
                  fontFamily: "monospace",
                  bgcolor: "grey.100",
                  p: 1,
                  borderRadius: 1,
                }}
              >
                {setupData.secret}
              </Typography>
            </Alert>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Step 3: Verify Setup
            </Typography>

            <Typography variant="body1" paragraph>
              Enter the 6-digit code from your authenticator app to verify the
              setup:
            </Typography>

            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="TOTP Code"
                  value={totpCode}
                  onChange={(e) =>
                    setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="123456"
                  inputProps={{
                    maxLength: 6,
                    style: {
                      textAlign: "center",
                      fontSize: "1.5rem",
                      letterSpacing: "0.2em",
                    },
                  }}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleVerify}
                  disabled={loading || totpCode.length !== 6}
                  fullWidth
                >
                  {loading ? <CircularProgress size={20} /> : "Verify"}
                </Button>
              </Grid>
            </Grid>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              The code changes every 30 seconds. If it doesn't work, wait for
              the next code.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default TOTPSetup;

import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  Divider,
  Chip,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import {
  Person,
  Security,
  Settings,
  Edit,
  Save,
  Cancel,
  QrCode,
  Face,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import Camera from "./Camera";
import TOTPSetup from "./TOTPSetup";

const Profile = () => {
  const { user, registerFace, setupTOTP } = useAuth();
  const [profile, setProfile] = useState(user);
  const [editing, setEditing] = useState(false);
  const [showFaceSetup, setShowFaceSetup] = useState(false);
  const [showTOTPSetup, setShowTOTPSetup] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setProfile(user);
  }, [user]);

  const handleEdit = () => {
    setEditing(true);
    setError("");
    setSuccess("");
  };

  const handleCancel = () => {
    setEditing(false);
    setProfile(user);
    setError("");
    setSuccess("");
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");

    try {
      // Here you would typically call an API to update the profile
      // For now, we'll just simulate success
      setSuccess("Profile updated successfully!");
      setEditing(false);
    } catch (error) {
      setError("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleFaceRegistration = async (imageData) => {
    setLoading(true);
    setError("");

    try {
      const result = await registerFace(imageData);

      if (result.success) {
        setSuccess("Face recognition set up successfully!");
        setShowFaceSetup(false);
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError("Face registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Here you would typically call an API to change password
      // For now, we'll just simulate success
      setSuccess("Password changed successfully!");
      setShowChangePassword(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      setError("Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const getSecurityLevel = () => {
    if (!profile) return { level: "Basic", color: "error", score: 0 };

    let score = 1; // Base score for username/password

    if (profile.face_registered) score += 2;
    if (profile.totp_enabled) score += 2;

    if (score >= 5) return { level: "Excellent", color: "success", score };
    if (score >= 3) return { level: "Good", color: "warning", score };
    return { level: "Basic", color: "error", score };
  };

  const securityLevel = getSecurityLevel();

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Profile Settings
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Profile Information */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  mb={3}
                >
                  <Box display="flex" alignItems="center">
                    <Person sx={{ mr: 1 }} />
                    <Typography variant="h6">Profile Information</Typography>
                  </Box>

                  {!editing ? (
                    <Button
                      variant="outlined"
                      startIcon={<Edit />}
                      onClick={handleEdit}
                    >
                      Edit
                    </Button>
                  ) : (
                    <Box display="flex" gap={1}>
                      <Button
                        variant="contained"
                        startIcon={<Save />}
                        onClick={handleSave}
                        disabled={loading}
                      >
                        Save
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<Cancel />}
                        onClick={handleCancel}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                    </Box>
                  )}
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Username"
                      value={profile?.username || ""}
                      disabled={!editing}
                      variant={editing ? "outlined" : "filled"}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      value={profile?.full_name || ""}
                      disabled={!editing}
                      variant={editing ? "outlined" : "filled"}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      value={profile?.email || ""}
                      disabled={!editing}
                      variant={editing ? "outlined" : "filled"}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      value={profile?.phone_number || ""}
                      disabled={!editing}
                      variant={editing ? "outlined" : "filled"}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Member Since"
                      value={
                        profile?.created_at
                          ? new Date(profile.created_at).toLocaleDateString()
                          : ""
                      }
                      disabled
                      variant="filled"
                    />
                  </Grid>
                </Grid>

                <Box mt={3}>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => setShowChangePassword(true)}
                  >
                    Change Password
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Security Settings */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={3}>
                  <Security sx={{ mr: 1 }} />
                  <Typography variant="h6">Security</Typography>
                </Box>

                <Box mb={3}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Security Level
                  </Typography>
                  <Chip
                    label={`${securityLevel.level} (${securityLevel.score}/5)`}
                    color={securityLevel.color}
                    size="large"
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box mb={2}>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    mb={1}
                  >
                    <Box display="flex" alignItems="center">
                      <Face sx={{ mr: 1, fontSize: 20 }} />
                      <Typography variant="body2">Face Recognition</Typography>
                    </Box>
                    <Chip
                      label={profile?.face_registered ? "Enabled" : "Disabled"}
                      color={profile?.face_registered ? "success" : "default"}
                      size="small"
                    />
                  </Box>

                  {!profile?.face_registered && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setShowFaceSetup(true)}
                      fullWidth
                    >
                      Setup Face Recognition
                    </Button>
                  )}
                </Box>

                <Box mb={2}>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    mb={1}
                  >
                    <Box display="flex" alignItems="center">
                      <QrCode sx={{ mr: 1, fontSize: 20 }} />
                      <Typography variant="body2">
                        TOTP Authentication
                      </Typography>
                    </Box>
                    <Chip
                      label={profile?.totp_enabled ? "Enabled" : "Disabled"}
                      color={profile?.totp_enabled ? "success" : "default"}
                      size="small"
                    />
                  </Box>

                  {!profile?.totp_enabled && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setShowTOTPSetup(true)}
                      fullWidth
                    >
                      Setup TOTP
                    </Button>
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Account Status
                  </Typography>
                  <Chip
                    label={profile?.is_active ? "Active" : "Inactive"}
                    color={profile?.is_active ? "success" : "error"}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Face Setup Dialog */}
        <Dialog
          open={showFaceSetup}
          onClose={() => setShowFaceSetup(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Setup Face Recognition</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" paragraph>
              Please position your face clearly in front of the camera for
              registration.
            </Typography>
            <Camera onCapture={handleFaceRegistration} loading={loading} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowFaceSetup(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>

        {/* TOTP Setup Dialog */}
        <Dialog
          open={showTOTPSetup}
          onClose={() => setShowTOTPSetup(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
          <DialogContent>
            <TOTPSetup onComplete={() => setShowTOTPSetup(false)} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowTOTPSetup(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>

        {/* Change Password Dialog */}
        <Dialog
          open={showChangePassword}
          onClose={() => setShowChangePassword(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Change Password</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label="Current Password"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    currentPassword: e.target.value,
                  })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                label="New Password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    newPassword: e.target.value,
                  })
                }
                margin="normal"
                helperText="Minimum 8 characters"
              />
              <TextField
                fullWidth
                label="Confirm New Password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    confirmPassword: e.target.value,
                  })
                }
                margin="normal"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowChangePassword(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleChangePassword}
              disabled={loading}
            >
              Change Password
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default Profile;

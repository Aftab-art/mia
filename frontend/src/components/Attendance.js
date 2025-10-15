import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import {
  Login,
  Logout,
  CalendarToday,
  TrendingUp,
  LocationOn,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import Camera from "./Camera";
import AttendanceChart from "./AttendanceChart";
import axios from "axios";

const Attendance = () => {
  const { user, refreshUser } = useAuth();
  const [todayStatus, setTodayStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [location, setLocation] = useState("");

  useEffect(() => {
    fetchTodayStatus();
    // Refresh user data to ensure face_registered status is up to date
    if (refreshUser) {
      refreshUser();
    }
  }, []);

  const fetchTodayStatus = async () => {
    try {
      const response = await axios.get("/attendance/today-status");
      setTodayStatus(response.data);
    } catch (error) {
      console.error("Failed to fetch today status:", error);
      setError("Failed to load attendance status");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (imageData) => {
    setActionLoading(true);
    setError("");

    try {
      const response = await axios.post("/attendance/checkin", {
        face_image: imageData,
        location: location || null,
      });

      if (response.data.success) {
        setSuccess("Check-in successful!");
        setShowCheckInDialog(false);
        setLocation("");
        await fetchTodayStatus();
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error("Check-in failed:", error);
      setError(error.response?.data?.detail || "Check-in failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    setError("");

    try {
      const response = await axios.post("/attendance/checkout", {
        attendance_id: todayStatus?.attendance_id,
      });

      if (response.data.success) {
        setSuccess("Check-out successful!");
        await fetchTodayStatus();
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error("Check-out failed:", error);
      setError(error.response?.data?.detail || "Check-out failed");
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (hours) => {
    if (!hours) return "N/A";
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Attendance Management
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
          {/* Today's Status */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <CalendarToday sx={{ mr: 1 }} />
                  <Typography variant="h6">Today's Status</Typography>
                </Box>

                {todayStatus ? (
                  <Box>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Chip
                        label={
                          todayStatus.checked_in
                            ? "CHECKED IN"
                            : "NOT CHECKED IN"
                        }
                        color={todayStatus.checked_in ? "success" : "default"}
                        size="large"
                      />
                    </Box>

                    {todayStatus.checked_in && (
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Check-in Time: {formatTime(todayStatus.check_in_time)}
                        </Typography>

                        {todayStatus.face_image && (
                          <Box sx={{ mb: 2 }}>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              gutterBottom
                            >
                              Check-in Photo:
                            </Typography>
                            <img
                              src={todayStatus.face_image}
                              alt="Check-in face verification"
                              style={{
                                width: "120px",
                                height: "120px",
                                objectFit: "cover",
                                borderRadius: "8px",
                                border: "2px solid #1976d2",
                              }}
                            />
                          </Box>
                        )}

                        {todayStatus.checked_out ? (
                          <Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              gutterBottom
                            >
                              Check-out Time:{" "}
                              {formatTime(todayStatus.check_out_time)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Work Duration:{" "}
                              {formatDuration(todayStatus.work_duration)}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Currently at work - Duration:{" "}
                            {formatDuration(todayStatus.work_duration)}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Typography color="text.secondary">
                    No attendance data available
                  </Typography>
                )}

                <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
                  {!todayStatus?.checked_in ? (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<Login />}
                      onClick={() => setShowCheckInDialog(true)}
                      disabled={actionLoading || !user?.face_registered}
                    >
                      Check In
                    </Button>
                  ) : !todayStatus?.checked_out ? (
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<Logout />}
                      onClick={handleCheckOut}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <CircularProgress size={20} />
                      ) : (
                        "Check Out"
                      )}
                    </Button>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      You have completed your work day
                    </Typography>
                  )}
                </Box>

                {!user?.face_registered && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Face recognition must be set up before you can check in/out
                  </Alert>
                )}

                {/* Debug info */}
                {process.env.NODE_ENV === "development" && (
                  <Alert severity="info" sx={{ mt: 1, fontSize: "0.8rem" }}>
                    Debug: user.face_registered ={" "}
                    {user?.face_registered ? "true" : "false"}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Stats */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <TrendingUp sx={{ mr: 1 }} />
                  <Typography variant="h6">Quick Stats</Typography>
                </Box>

                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Security Status
                  </Typography>
                  <Box display="flex" gap={1} mb={2}>
                    <Chip
                      label="Face Recognition"
                      color={user?.face_registered ? "success" : "warning"}
                      size="small"
                    />
                    <Chip
                      label="TOTP"
                      color={user?.totp_enabled ? "success" : "warning"}
                      size="small"
                    />
                  </Box>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Current Status
                  </Typography>
                  <Typography variant="body1">
                    {todayStatus?.checked_in
                      ? todayStatus?.checked_out
                        ? "Work Completed"
                        : "Currently Working"
                      : "Not Checked In"}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Attendance Chart */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Attendance History
                </Typography>
                <AttendanceChart />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Check-in Dialog */}
        <Dialog
          open={showCheckInDialog}
          onClose={() => setShowCheckInDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Check In with Face Verification</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" paragraph>
              Please position your face clearly in front of the camera for
              verification.
            </Typography>

            <TextField
              fullWidth
              label="Location (Optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Office, Remote, Client Site"
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <LocationOn sx={{ mr: 1, color: "text.secondary" }} />
                ),
              }}
            />

            <Camera
              onCapture={handleFaceRegistration}
              loading={actionLoading}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCheckInDialog(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );

  async function handleFaceRegistration(imageData) {
    await handleCheckIn(imageData);
  }
};

export default Attendance;

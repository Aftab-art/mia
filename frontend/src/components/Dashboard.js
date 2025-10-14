import React, { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Paper,
  Alert,
  Chip,
} from "@mui/material";
import {
  Person,
  Schedule,
  Security,
  TrendingUp,
  CheckCircle,
  Warning,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import Camera from "./Camera";
import TOTPSetup from "./TOTPSetup";
import AttendanceSummary from "./AttendanceSummary";
import RecentActivity from "./RecentActivity";
import axios from "axios";

const Dashboard = () => {
  const { user, registerFace, refreshUser } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFaceSetup, setShowFaceSetup] = useState(false);
  const [showTOTPSetup, setShowTOTPSetup] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    // Refresh user data to ensure face_registered status is up to date
    if (refreshUser) {
      refreshUser();
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get("/attendance/dashboard");
      setDashboardData(response.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleFaceRegistration = async (imageData) => {
    try {
      const result = await registerFace(imageData);

      if (result.success) {
        setShowFaceSetup(false);
        await fetchDashboardData();
        // Refresh user data to update face_registered status
        if (refreshUser) {
          await refreshUser();
        }
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError("Face registration failed");
    }
  };

  const getSecurityStatus = () => {
    if (!user) return { level: "incomplete", color: "error" };

    let factors = 0;
    if (user.face_registered) factors++;
    if (user.totp_enabled) factors++;

    if (factors >= 2) return { level: "excellent", color: "success" };
    if (factors === 1) return { level: "good", color: "warning" };
    return { level: "basic", color: "error" };
  };

  const securityStatus = getSecurityStatus();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <Typography>Loading dashboard...</Typography>
      </Box>
    );
  }

  if (showFaceSetup) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4 }}>
          <Typography variant="h4" gutterBottom>
            Setup Face Recognition
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Please follow these steps to set up face recognition:
          </Typography>
          <Box component="ol" sx={{ pl: 2, mb: 2 }}>
            <li>Click "Start Camera" to begin</li>
            <li>Allow camera permissions when prompted</li>
            <li>Wait for face recognition models to load</li>
            <li>Position your face clearly in front of the camera</li>
            <li>Make sure you have good lighting</li>
            <li>Click "Capture Photo" when your face is detected</li>
          </Box>

          <Camera onCapture={handleFaceRegistration} />

          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Button variant="outlined" onClick={() => setShowFaceSetup(false)}>
              Cancel
            </Button>
          </Box>
        </Box>
      </Container>
    );
  }

  if (showTOTPSetup) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4 }}>
          <TOTPSetup
            onComplete={() => {
              setShowTOTPSetup(false);
              fetchDashboardData();
            }}
          />

          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Button variant="outlined" onClick={() => setShowTOTPSetup(false)}>
              Cancel
            </Button>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome back, {user?.full_name}!
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Security Status Card */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Security sx={{ mr: 1 }} />
                  <Typography variant="h6">Security Status</Typography>
                </Box>

                <Box display="flex" alignItems="center" mb={2}>
                  <Chip
                    label={securityStatus.level.toUpperCase()}
                    color={securityStatus.color}
                    sx={{ mr: 1 }}
                  />
                </Box>

                <Box mb={2}>
                  <Box display="flex" alignItems="center" mb={1}>
                    {user?.face_registered ? (
                      <CheckCircle color="success" sx={{ mr: 1 }} />
                    ) : (
                      <Warning color="warning" sx={{ mr: 1 }} />
                    )}
                    <Typography variant="body2">
                      Face Recognition:{" "}
                      {user?.face_registered ? "Enabled" : "Not Setup"}
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center">
                    {user?.totp_enabled ? (
                      <CheckCircle color="success" sx={{ mr: 1 }} />
                    ) : (
                      <Warning color="warning" sx={{ mr: 1 }} />
                    )}
                    <Typography variant="body2">
                      TOTP Authentication:{" "}
                      {user?.totp_enabled ? "Enabled" : "Not Setup"}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" gap={1} flexWrap="wrap">
                  {!user?.face_registered && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setShowFaceSetup(true)}
                    >
                      Setup Face Recognition
                    </Button>
                  )}

                  {!user?.totp_enabled && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setShowTOTPSetup(true)}
                    >
                      Setup TOTP
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Today's Status Card */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Schedule sx={{ mr: 1 }} />
                  <Typography variant="h6">Today's Status</Typography>
                </Box>

                {dashboardData?.today_status ? (
                  <Box>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Chip
                        label={
                          dashboardData.today_status.checked_in
                            ? "CHECKED IN"
                            : "NOT CHECKED IN"
                        }
                        color={
                          dashboardData.today_status.checked_in
                            ? "success"
                            : "default"
                        }
                        sx={{ mr: 1 }}
                      />
                    </Box>

                    {dashboardData.today_status.checked_in && (
                      <Typography variant="body2" color="text.secondary">
                        Check-in:{" "}
                        {new Date(
                          dashboardData.today_status.check_in_time
                        ).toLocaleTimeString()}
                      </Typography>
                    )}

                    {dashboardData.today_status.checked_out && (
                      <Typography variant="body2" color="text.secondary">
                        Check-out:{" "}
                        {new Date(
                          dashboardData.today_status.check_out_time
                        ).toLocaleTimeString()}
                      </Typography>
                    )}

                    {dashboardData.today_status.work_duration && (
                      <Typography variant="body2" color="text.secondary">
                        Work Duration:{" "}
                        {dashboardData.today_status.work_duration} hours
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Typography color="text.secondary">
                    No attendance data available
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Weekly Summary */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <TrendingUp sx={{ mr: 1 }} />
                  <Typography variant="h6">This Week</Typography>
                </Box>

                {dashboardData?.week_summary ? (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total Hours: {dashboardData.week_summary.total_hours}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Average per Day:{" "}
                      {dashboardData.week_summary.average_hours_per_day} hours
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Attendance Rate:{" "}
                      {dashboardData.week_summary.attendance_rate}%
                    </Typography>
                  </Box>
                ) : (
                  <Typography color="text.secondary">
                    No weekly data available
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Monthly Summary */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Person sx={{ mr: 1 }} />
                  <Typography variant="h6">This Month</Typography>
                </Box>

                {dashboardData?.month_summary ? (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total Days: {dashboardData.month_summary.total_days}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Hours: {dashboardData.month_summary.total_hours}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Attendance Rate:{" "}
                      {dashboardData.month_summary.attendance_rate}%
                    </Typography>
                  </Box>
                ) : (
                  <Typography color="text.secondary">
                    No monthly data available
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                <RecentActivity records={dashboardData?.recent_records || []} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Dashboard;

import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  LinearProgress,
} from "@mui/material";
import { CheckCircle, Schedule, Timer, TrendingUp } from "@mui/icons-material";

const AttendanceSummary = ({ attendanceData, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Today's Attendance
          </Typography>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  const {
    todayStatus,
    totalHours,
    expectedHours,
    weeklyHours,
    monthlyHours,
    attendanceRate,
  } = attendanceData || {};

  const getStatusColor = (status) => {
    switch (status) {
      case "checked_in":
        return "success";
      case "checked_out":
        return "default";
      case "late":
        return "warning";
      case "absent":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "checked_in":
        return <CheckCircle />;
      case "checked_out":
        return <Schedule />;
      case "late":
        return <Timer />;
      default:
        return <Schedule />;
    }
  };

  return (
    <Grid container spacing={3}>
      {/* Today's Status */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <Typography variant="h6" component="div">
                Today's Status
              </Typography>
              {todayStatus && (
                <Chip
                  icon={getStatusIcon(todayStatus)}
                  label={todayStatus.replace("_", " ").toUpperCase()}
                  color={getStatusColor(todayStatus)}
                  sx={{ ml: 2 }}
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {todayStatus === "checked_in"
                ? "You're currently checked in"
                : todayStatus === "checked_out"
                ? "You've completed your work day"
                : todayStatus === "late"
                ? "You were late today"
                : "No attendance recorded today"}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Today's Hours */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Today's Hours
            </Typography>
            <Box display="flex" alignItems="center" mb={1}>
              <Typography variant="h4" color="primary">
                {totalHours || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                / {expectedHours || 8} hrs
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={((totalHours || 0) / (expectedHours || 8)) * 100}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Weekly Hours */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <TrendingUp color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">This Week</Typography>
            </Box>
            <Typography variant="h4" color="primary">
              {weeklyHours || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              hours worked
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Monthly Hours */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <TrendingUp color="secondary" sx={{ mr: 1 }} />
              <Typography variant="h6">This Month</Typography>
            </Box>
            <Typography variant="h4" color="secondary">
              {monthlyHours || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              hours worked
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Attendance Rate */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <CheckCircle color="success" sx={{ mr: 1 }} />
              <Typography variant="h6">Attendance Rate</Typography>
            </Box>
            <Typography variant="h4" color="success">
              {attendanceRate || 0}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              this month
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default AttendanceSummary;

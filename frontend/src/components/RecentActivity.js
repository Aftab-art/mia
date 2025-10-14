import React from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Paper,
  Divider,
} from "@mui/material";
import {
  Login,
  Logout,
  Schedule,
  Security,
  CheckCircle,
  Warning,
} from "@mui/icons-material";

const RecentActivity = ({ records = [] }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case "check_in":
        return <Login color="success" />;
      case "check_out":
        return <Logout color="primary" />;
      case "face_verified":
        return <Security color="success" />;
      case "totp_verified":
        return <CheckCircle color="success" />;
      default:
        return <Schedule />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case "check_in":
        return "success";
      case "check_out":
        return "primary";
      case "face_verified":
        return "success";
      case "totp_verified":
        return "success";
      default:
        return "default";
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const formatDuration = (hours) => {
    if (!hours) return null;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  // Transform attendance records to activity items
  const activityItems = records
    .map((record) => {
      const items = [];

      // Check-in activity
      items.push({
        id: `${record.id}-checkin`,
        type: "check_in",
        time: record.check_in_time,
        description: `Checked in at ${formatTime(record.check_in_time)}`,
        details: record.face_verified
          ? "Face verified"
          : "No face verification",
        status: record.face_verified ? "verified" : "unverified",
      });

      // Check-out activity (if exists)
      if (record.check_out_time) {
        items.push({
          id: `${record.id}-checkout`,
          type: "check_out",
          time: record.check_out_time,
          description: `Checked out at ${formatTime(record.check_out_time)}`,
          details: `Work duration: ${formatDuration(record.work_duration)}`,
          status: "completed",
        });
      }

      return items;
    })
    .flat()
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 10);

  if (activityItems.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Schedule sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          No recent activity
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your attendance records will appear here
        </Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={1}>
      <List>
        {activityItems.map((item, index) => (
          <React.Fragment key={item.id}>
            <ListItem>
              <ListItemIcon>{getActivityIcon(item.type)}</ListItemIcon>
              <ListItemText
                primary={
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography variant="body1">{item.description}</Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        label={formatDate(item.time)}
                        size="small"
                        variant="outlined"
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatTime(item.time)}
                      </Typography>
                    </Box>
                  </Box>
                }
                secondary={
                  <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                    <Typography variant="body2" color="text.secondary">
                      {item.details}
                    </Typography>
                    {item.status === "verified" && (
                      <Chip
                        label="Verified"
                        size="small"
                        color="success"
                        icon={<CheckCircle />}
                      />
                    )}
                    {item.status === "unverified" && (
                      <Chip
                        label="Unverified"
                        size="small"
                        color="warning"
                        icon={<Warning />}
                      />
                    )}
                    {item.status === "completed" && (
                      <Chip
                        label="Completed"
                        size="small"
                        color="primary"
                        icon={<CheckCircle />}
                      />
                    )}
                  </Box>
                }
              />
            </ListItem>
            {index < activityItems.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default RecentActivity;

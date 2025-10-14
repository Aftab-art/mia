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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
} from "@mui/material";
import {
  AdminPanelSettings,
  People,
  Security,
  TrendingUp,
  CheckCircle,
  Warning,
  Block,
  LockOpen,
  Visibility,
} from "@mui/icons-material";
import axios from "axios";

const AdminPanel = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchDashboardData();
    fetchUsers();
  }, [currentPage]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get("/admin/dashboard");
      setDashboardData(response.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setError("Failed to load dashboard data");
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/admin/users?skip=${(currentPage - 1) * 10}&limit=10`
      );
      setUsers(response.data);
      // In a real app, you'd get total count from the API
      setTotalPages(Math.ceil(response.data.length / 10));
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId, action) => {
    try {
      setLoading(true);
      let response;

      switch (action) {
        case "activate":
          response = await axios.put(`/admin/users/${userId}/activate`);
          break;
        case "unlock":
          response = await axios.put(`/admin/users/${userId}/unlock`);
          break;
        default:
          throw new Error("Invalid action");
      }

      setSuccess(response.data.message);
      await fetchUsers();
      await fetchDashboardData();
    } catch (error) {
      console.error("Failed to perform user action:", error);
      setError("Failed to perform action");
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = async (userId) => {
    try {
      const response = await axios.get(`/admin/users/${userId}`);
      setSelectedUser(response.data);
      setShowUserDetails(true);
    } catch (error) {
      console.error("Failed to fetch user details:", error);
      setError("Failed to load user details");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && !dashboardData) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <Typography>Loading admin panel...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <AdminPanelSettings sx={{ mr: 1, fontSize: 30 }} />
          <Typography variant="h4">Admin Panel</Typography>
        </Box>

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

        {/* Dashboard Stats */}
        {dashboardData && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <People sx={{ mr: 1, color: "primary.main" }} />
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Total Users
                      </Typography>
                      <Typography variant="h4">
                        {dashboardData.user_stats?.total_users || 0}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <CheckCircle sx={{ mr: 1, color: "success.main" }} />
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Active Users
                      </Typography>
                      <Typography variant="h4">
                        {dashboardData.user_stats?.active_users || 0}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <Security sx={{ mr: 1, color: "warning.main" }} />
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Face Recognition
                      </Typography>
                      <Typography variant="h4">
                        {dashboardData.user_stats?.users_with_face || 0}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <TrendingUp sx={{ mr: 1, color: "info.main" }} />
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Today's Check-ins
                      </Typography>
                      <Typography variant="h4">
                        {dashboardData.attendance_stats?.today_checkins || 0}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Users Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              User Management
            </Typography>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Username</TableCell>
                    <TableCell>Full Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Security</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Chip
                            label={user.is_active ? "Active" : "Inactive"}
                            color={user.is_active ? "success" : "error"}
                            size="small"
                          />
                          {user.locked_until && (
                            <Chip label="Locked" color="warning" size="small" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Chip
                            label="Face"
                            color={user.face_registered ? "success" : "default"}
                            size="small"
                          />
                          <Chip
                            label="TOTP"
                            color={user.totp_enabled ? "success" : "default"}
                            size="small"
                          />
                        </Box>
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <IconButton
                            size="small"
                            onClick={() => handleViewUser(user.id)}
                            title="View Details"
                          >
                            <Visibility fontSize="small" />
                          </IconButton>

                          <IconButton
                            size="small"
                            onClick={() =>
                              handleUserAction(user.id, "activate")
                            }
                            title={user.is_active ? "Deactivate" : "Activate"}
                            color={user.is_active ? "error" : "success"}
                          >
                            <Block fontSize="small" />
                          </IconButton>

                          {user.locked_until && (
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleUserAction(user.id, "unlock")
                              }
                              title="Unlock Account"
                              color="primary"
                            >
                              <LockOpen fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(event, page) => setCurrentPage(page)}
                color="primary"
              />
            </Box>
          </CardContent>
        </Card>

        {/* User Details Dialog */}
        <Dialog
          open={showUserDetails}
          onClose={() => setShowUserDetails(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            User Details - {selectedUser?.user?.username}
          </DialogTitle>
          <DialogContent>
            {selectedUser && (
              <Box>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Username"
                      value={selectedUser.user.username}
                      disabled
                      variant="filled"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      value={selectedUser.user.full_name}
                      disabled
                      variant="filled"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      value={selectedUser.user.email}
                      disabled
                      variant="filled"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={selectedUser.user.phone_number || "Not provided"}
                      disabled
                      variant="filled"
                    />
                  </Grid>
                </Grid>

                <Typography variant="h6" gutterBottom>
                  Recent Attendance
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Check In</TableCell>
                        <TableCell>Check Out</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Verified</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedUser.recent_attendance
                        ?.slice(0, 5)
                        .map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>
                              {new Date(
                                record.check_in_time
                              ).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {new Date(
                                record.check_in_time
                              ).toLocaleTimeString()}
                            </TableCell>
                            <TableCell>
                              {record.check_out_time
                                ? new Date(
                                    record.check_out_time
                                  ).toLocaleTimeString()
                                : "Not checked out"}
                            </TableCell>
                            <TableCell>
                              {record.work_duration
                                ? `${record.work_duration}h`
                                : "N/A"}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={record.face_verified ? "Yes" : "No"}
                                color={
                                  record.face_verified ? "success" : "default"
                                }
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  Recent Login Attempts
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>IP Address</TableCell>
                        <TableCell>Success</TableCell>
                        <TableCell>Reason</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedUser.recent_logins?.slice(0, 5).map((login) => (
                        <TableRow key={login.id}>
                          <TableCell>{formatDate(login.timestamp)}</TableCell>
                          <TableCell>{login.ip_address}</TableCell>
                          <TableCell>
                            <Chip
                              label={login.success ? "Success" : "Failed"}
                              color={login.success ? "success" : "error"}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{login.failure_reason || "N/A"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowUserDetails(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default AdminPanel;

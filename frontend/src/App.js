import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, Link as RouterLink } from "react-router-dom";
import {
  Container,
  Box,
  Typography,
  AppBar,
  Toolbar,
  Button,
  Tabs,
  Tab,
} from "@mui/material";
import { useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import Attendance from "./components/Attendance";
import Profile from "./components/Profile";
import AdminPanel from "./components/AdminPanel";
import LoadingSpinner from "./components/LoadingSpinner";

function App() {
  const { user, loading, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" sx={{ backgroundColor: "#1976d2" }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            MFA Attendance System
          </Typography>

          {user && (
            <>
              <Tabs value={false} sx={{ mr: 2 }}>
                <Tab
                  label="Dashboard"
                  component={RouterLink}
                  to="/dashboard"
                  sx={{ color: "white" }}
                />
                <Tab
                  label="Attendance"
                  component={RouterLink}
                  to="/attendance"
                  sx={{ color: "white" }}
                />
                <Tab
                  label="Profile"
                  component={RouterLink}
                  to="/profile"
                  sx={{ color: "white" }}
                />
                {user.is_admin && (
                  <Tab
                    label="Admin"
                    component={RouterLink}
                    to="/admin"
                    sx={{ color: "white" }}
                  />
                )}
              </Tabs>

              <Typography variant="body2" sx={{ marginRight: 2 }}>
                Welcome, {user.full_name}
              </Typography>
              <Typography variant="body2" sx={{ marginRight: 2 }}>
                {formatDate(currentTime)} {formatTime(currentTime)}
              </Typography>
              <Button color="inherit" onClick={logout}>
                Logout
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/dashboard" /> : <Login />}
          />
          <Route
            path="/register"
            element={user ? <Navigate to="/dashboard" /> : <Register />}
          />
          <Route
            path="/dashboard"
            element={user ? <Dashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/attendance"
            element={user ? <Attendance /> : <Navigate to="/login" />}
          />
          <Route
            path="/profile"
            element={user ? <Profile /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin"
            element={
              user && user.is_admin ? (
                <AdminPanel />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
          <Route
            path="/"
            element={<Navigate to={user ? "/dashboard" : "/login"} />}
          />
        </Routes>
      </Container>
    </Box>
  );
}

export default App;

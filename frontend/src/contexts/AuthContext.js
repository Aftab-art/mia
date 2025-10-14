import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Configure axios defaults
  axios.defaults.baseURL = "http://localhost:8000/api";

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (token) {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        const response = await axios.get("/auth/profile");
        setUser(response.data);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("access_token");
      delete axios.defaults.headers.common["Authorization"];
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post("/auth/login", {
        username,
        password,
      });

      const { access_token, ...userData } = response.data;

      localStorage.setItem("access_token", access_token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;

      // Get full user profile
      const profileResponse = await axios.get("/auth/profile");
      setUser(profileResponse.data);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error("Login failed:", error);
      return {
        success: false,
        message: error.response?.data?.detail || "Login failed",
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post("/auth/register", userData);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error("Registration failed:", error);
      return {
        success: false,
        message: error.response?.data?.detail || "Registration failed",
      };
    }
  };

  const verifyFace = async (faceImage) => {
    try {
      const response = await axios.post("/auth/verify-face", {
        face_image: faceImage,
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error("Face verification failed:", error);
      return {
        success: false,
        message: error.response?.data?.detail || "Face verification failed",
      };
    }
  };

  const verifyTOTP = async (totpCode) => {
    try {
      const response = await axios.post("/auth/verify-totp", {
        totp_code: totpCode,
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error("TOTP verification failed:", error);
      return {
        success: false,
        message: error.response?.data?.detail || "TOTP verification failed",
      };
    }
  };

  const registerFace = async (faceImage) => {
    try {
      const response = await axios.post("/auth/register-face", {
        face_image: faceImage,
      });

      // Update user profile to reflect face registration
      const profileResponse = await axios.get("/auth/profile");
      setUser(profileResponse.data);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error("Face registration failed:", error);
      return {
        success: false,
        message: error.response?.data?.detail || "Face registration failed",
      };
    }
  };

  const setupTOTP = async () => {
    try {
      const response = await axios.post("/auth/setup-totp");
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error("TOTP setup failed:", error);
      return {
        success: false,
        message: error.response?.data?.detail || "TOTP setup failed",
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("access_token");
      delete axios.defaults.headers.common["Authorization"];
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await axios.get("/auth/profile");
      setUser(response.data);
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    verifyFace,
    verifyTOTP,
    registerFace,
    setupTOTP,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;

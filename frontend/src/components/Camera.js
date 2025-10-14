import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { CameraAlt, Stop } from "@mui/icons-material";
import faceRecognitionService from "../services/faceRecognitionService";

const Camera = ({ onCapture, onError, loading = false }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState("");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [capturedImage, setCapturedImage] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const getAvailableCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );

      const cameras = videoDevices.map((device) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
        isBuiltIn:
          !device.label.toLowerCase().includes("droidcam") &&
          !device.label.toLowerCase().includes("virtual") &&
          !device.label.toLowerCase().includes("obs") &&
          !device.label.toLowerCase().includes("obs virtual camera"),
        isDroidCam: device.label.toLowerCase().includes("droidcam"),
        originalLabel: device.label,
      }));

      setAvailableCameras(cameras);
      console.log("Available cameras:", cameras);
      console.log(
        "Camera details:",
        cameras.map((c) => ({
          deviceId: c.deviceId,
          label: c.label,
          isBuiltIn: c.isBuiltIn,
          isDroidCam: c.label.toLowerCase().includes("droidcam"),
        }))
      );

      // Aggressively avoid DroidCam and select built-in camera
      const builtInCamera = cameras.find((camera) => camera.isBuiltIn);
      const droidCam = cameras.find((camera) => camera.isDroidCam);

      if (builtInCamera) {
        setSelectedCamera(builtInCamera.deviceId);
        console.log("✅ Selected built-in camera:", builtInCamera.label);
      } else if (cameras.length > 1) {
        // If no built-in camera found, select any non-DroidCam camera
        const nonDroidCam = cameras.find((camera) => !camera.isDroidCam);
        if (nonDroidCam) {
          setSelectedCamera(nonDroidCam.deviceId);
          console.log("⚠️ Selected alternative camera:", nonDroidCam.label);
        } else {
          setSelectedCamera(cameras[0].deviceId);
          console.log("⚠️ Only DroidCam available:", cameras[0].label);
        }
      } else if (cameras.length > 0) {
        setSelectedCamera(cameras[0].deviceId);
      }

      // Warn about DroidCam
      if (droidCam) {
        console.warn(
          "⚠️ DroidCam detected - this may interfere with camera access"
        );
      }

      return cameras;
    } catch (error) {
      console.error("Error getting cameras:", error);
      return [];
    }
  }, []);

  const initializeFaceRecognition = useCallback(async () => {
    try {
      console.log("🤖 Initializing face recognition models...");
      await faceRecognitionService.initialize();
      setModelsLoaded(true);
      console.log("✅ Face recognition models loaded");
      startFaceDetection();
    } catch (error) {
      console.error("❌ Face recognition initialization failed:", error);
      setError(
        "Failed to initialize face recognition. Please refresh the page and try again."
      );
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError("");
      console.log("🎥 Requesting camera access...");

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access not supported in this browser");
      }

      // Get available cameras if not already loaded
      if (availableCameras.length === 0) {
        await getAvailableCameras();
      }

      // Force built-in camera selection
      let deviceId = selectedCamera;

      // If no camera selected or DroidCam is selected, try to find built-in camera
      if (
        !deviceId ||
        availableCameras.find((c) => c.deviceId === deviceId)?.isDroidCam
      ) {
        const builtInCamera = availableCameras.find((c) => c.isBuiltIn);
        if (builtInCamera) {
          deviceId = builtInCamera.deviceId;
          setSelectedCamera(deviceId); // Update selection
          console.log(
            "🔄 Auto-switching to built-in camera:",
            builtInCamera.label
          );
        }
      }

      if (deviceId) {
        const selectedCameraInfo = availableCameras.find(
          (c) => c.deviceId === deviceId
        );
        console.log("📹 Using camera:", selectedCameraInfo?.label || deviceId);
        console.log(
          "📹 Camera type:",
          selectedCameraInfo?.isBuiltIn ? "Built-in" : "Virtual/DroidCam"
        );
      }

      // Try to get the camera stream with explicit device selection
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
            deviceId: deviceId ? { exact: deviceId } : undefined,
          },
        });
      } catch (deviceError) {
        console.error("❌ Failed to access selected camera:", deviceError);

        // Fallback: try without device ID (let browser choose)
        console.log("🔄 Trying fallback without device selection...");
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
        });
      }

      console.log("✅ Camera access granted");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        videoRef.current.onloadedmetadata = () => {
          console.log("📹 Video metadata loaded, starting playback...");
          videoRef.current
            .play()
            .then(() => {
              console.log("✅ Video playback started");
              setIsStreaming(true);
              // Initialize face recognition models first
              initializeFaceRecognition();
            })
            .catch((playError) => {
              console.error("❌ Video playback failed:", playError);
              setError("Failed to start video playback");
            });
        };

        videoRef.current.onerror = (videoError) => {
          console.error("❌ Video error:", videoError);
          setError("Video playback error occurred");
        };
      }
    } catch (err) {
      console.error("❌ Camera access error:", err);
      let errorMessage = "Unable to access camera.";

      if (err.name === "NotAllowedError") {
        errorMessage =
          "Camera access denied. Please allow camera permissions and try again.";
      } else if (err.name === "NotFoundError") {
        errorMessage =
          "No camera found. Please connect a camera and try again.";
      } else if (err.name === "NotSupportedError") {
        errorMessage = "Camera not supported in this browser.";
      }

      setError(errorMessage);
      if (onError) onError(errorMessage);
    }
  }, [onError]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
    setFaceDetected(false);
    setDetectionStatus("");
  }, []);

  const startFaceDetection = useCallback(async () => {
    if (!videoRef.current || !isStreaming || !modelsLoaded) return;

    try {
      const detection = await faceRecognitionService.detectSingleFace(
        videoRef.current
      );

      if (detection) {
        const validation =
          faceRecognitionService.validateFaceDetection(detection);

        if (validation.valid) {
          setFaceDetected(true);
          setDetectionStatus("Face detected ✓");
        } else {
          setFaceDetected(false);
          setDetectionStatus(validation.message);
        }
      } else {
        setFaceDetected(false);
        setDetectionStatus("No face detected");
      }
    } catch (error) {
      console.error("Face detection error:", error);
      setDetectionStatus("Face detection error");
    }

    // Continue detection
    if (isStreaming && modelsLoaded) {
      setTimeout(startFaceDetection, 500);
    }
  }, [isStreaming, modelsLoaded]);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) {
      setError("Camera not ready. Please wait for camera to start.");
      return;
    }

    console.log("📸 Starting photo capture...");
    console.log("Face detected:", faceDetected);
    console.log("Models loaded:", modelsLoaded);

    try {
      // First, capture the image directly from video
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      context.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.8);

      console.log("✅ Image captured successfully");

      // If face detection is working, try to validate the face
      if (modelsLoaded && faceDetected) {
        console.log("🔍 Face detection is working, validating...");
        try {
          const result = await faceRecognitionService.captureAndDetectFace(
            videoRef.current
          );

          if (result.detection) {
            const validation = faceRecognitionService.validateFaceDetection(
              result.detection
            );

            if (validation.valid) {
              console.log("✅ Face validation passed");
              setCapturedImage(imageData);
              setShowPreview(true);
              setError("");
              return;
            } else {
              console.log("⚠️ Face validation failed:", validation.message);
              setError(validation.message);
              return;
            }
          } else {
            console.log("⚠️ No face detected in captured image");
            setError("No face detected in captured image");
            return;
          }
        } catch (faceError) {
          console.error("Face detection error:", faceError);
          // Continue with basic capture even if face detection fails
        }
      } else {
        console.log(
          "ℹ️ Face detection not working, proceeding with basic capture"
        );
      }

      // If face detection is not working or not required, proceed with basic capture
      console.log("📸 Proceeding with basic photo capture");
      setCapturedImage(imageData);
      setShowPreview(true);
      setError("");
    } catch (error) {
      console.error("❌ Capture error:", error);
      setError("Failed to capture image: " + error.message);
      if (onError) onError(error.message);
    }
  }, [faceDetected, modelsLoaded, onCapture, onError]);

  useEffect(() => {
    // Load available cameras when component mounts
    getAvailableCameras();

    return () => {
      stopCamera();
    };
  }, [stopCamera, getAvailableCameras]);

  const toggleCamera = () => {
    if (isStreaming) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const forceBuiltInCamera = async () => {
    try {
      console.log("🔧 Force starting built-in camera...");
      setError("");

      // Stop any existing camera
      if (isStreaming) {
        stopCamera();
        // Wait a bit for cleanup
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Force built-in camera specifically, avoid DroidCam
      await getAvailableCameras();
      const builtInCamera = availableCameras.find((c) => c.isBuiltIn);

      let stream;
      if (builtInCamera) {
        console.log("🎯 Forcing built-in camera:", builtInCamera.label);
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
            deviceId: { exact: builtInCamera.deviceId },
          },
        });
      } else {
        console.log("⚠️ No built-in camera found, trying default...");
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
        });
      }

      console.log("✅ Force camera access granted");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        videoRef.current.onloadedmetadata = () => {
          console.log("📹 Force video metadata loaded, starting playback...");
          videoRef.current
            .play()
            .then(() => {
              console.log("✅ Force video playback started");
              setIsStreaming(true);
              initializeFaceRecognition();
            })
            .catch((playError) => {
              console.error("❌ Force video playback failed:", playError);
              setError("Failed to start video playback");
            });
        };
      }
    } catch (err) {
      console.error("❌ Force camera access error:", err);
      setError(
        "Failed to access camera. Please check permissions and try again."
      );
    }
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 500, mx: "auto" }}>
      <Paper elevation={3} sx={{ p: 2, textAlign: "center" }}>
        <Typography variant="h6" gutterBottom>
          Camera Access
        </Typography>

        {availableCameras.length > 1 && !isStreaming && (
          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Camera</InputLabel>
              <Select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                label="Select Camera"
              >
                {availableCameras.map((camera) => (
                  <MenuItem key={camera.deviceId} value={camera.deviceId}>
                    {camera.isBuiltIn ? "✅ " : "⚠️ "}
                    {camera.label}{" "}
                    {camera.isBuiltIn
                      ? "(Built-in - Recommended)"
                      : "(Virtual Camera)"}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {availableCameras.some((c) => c.isDroidCam) && !isStreaming && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {/* <Typography variant="body2">
              <strong>🚨 DroidCam is interfering with your camera!</strong>
              <br />
              You're seeing "Start DroidCam" instead of your face because
              DroidCam is taking over.
              <br />
              <br />
              <strong>To fix this permanently:</strong>
              <br />
              1. Close DroidCam desktop app completely
              <br />
              2. Click "🔧 Force Camera" button below
              <br />
              3. Or disable DroidCam in Windows Device Manager
            </Typography> */}
            <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                color="warning"
                size="small"
                onClick={forceBuiltInCamera}
              >
                🔧 Start Camera (Recommended)
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  const builtInCamera = availableCameras.find(
                    (c) => c.isBuiltIn
                  );
                  if (builtInCamera) {
                    setSelectedCamera(builtInCamera.deviceId);
                    console.log(
                      "🔄 Selected built-in camera:",
                      builtInCamera.label
                    );
                  }
                }}
              >
                Select Built-in Camera
              </Button>
            </Box>
          </Alert>
        )}

        <Box sx={{ position: "relative", mb: 2 }}>
          {!showPreview ? (
            <>
              <video
                ref={videoRef}
                width="100%"
                height="auto"
                style={{
                  maxWidth: "100%",
                  borderRadius: "8px",
                  display: isStreaming ? "block" : "none",
                }}
                muted
              />

              {!isStreaming && (
                <Box
                  sx={{
                    width: "100%",
                    height: 300,
                    bgcolor: "grey.200",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "8px",
                  }}
                >
                  <Typography color="text.secondary">
                    Camera not active
                  </Typography>
                </Box>
              )}
            </>
          ) : (
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h6" gutterBottom>
                📸 Your Captured Photo
              </Typography>
              <img
                src={capturedImage}
                alt="Captured"
                style={{
                  width: "100%",
                  maxHeight: "300px",
                  objectFit: "contain",
                  border: "2px solid #1976d2",
                  borderRadius: "8px",
                }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Review your photo before proceeding
              </Typography>
            </Box>
          )}

          <canvas ref={canvasRef} style={{ display: "none" }} />
        </Box>

        {!modelsLoaded && isStreaming && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Loading face recognition models...
          </Alert>
        )}

        {detectionStatus && modelsLoaded && (
          <Alert severity={faceDetected ? "success" : "warning"} sx={{ mb: 2 }}>
            {detectionStatus}
          </Alert>
        )}

        {isStreaming && !modelsLoaded && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Loading face recognition models... You can still capture photos.
          </Alert>
        )}

        {isStreaming && modelsLoaded && !detectionStatus && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Face detection active. Position your face clearly in the camera
            view.
          </Alert>
        )}

        {isStreaming && modelsLoaded && !faceDetected && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Camera ready! You can capture photos even if face detection isn't
            working.
          </Alert>
        )}

        <Box
          sx={{
            display: "flex",
            gap: 2,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {/* <Button
            variant={isStreaming ? "outlined" : "contained"}
            onClick={toggleCamera}
            startIcon={isStreaming ? <Stop /> : <CameraAlt />}
            disabled={loading}
          >
            {isStreaming ? "Stop Camera" : "Start Camera"}
          </Button> */}

          {!isStreaming && (
            <Button
              variant="outlined"
              color="warning"
              onClick={forceBuiltInCamera}
              disabled={loading}
            >
              🔧 Force Camera
            </Button>
          )}

          {isStreaming && !showPreview && (
            <Button
              variant="contained"
              color="primary"
              onClick={capturePhoto}
              disabled={loading}
              startIcon={
                loading ? <CircularProgress size={20} /> : <CameraAlt />
              }
            >
              {loading ? "Processing..." : "Capture Photo"}
            </Button>
          )}

          {showPreview && (
            <>
              <Button
                variant="contained"
                color="success"
                onClick={() => {
                  if (onCapture) {
                    onCapture(capturedImage);
                  }
                  setShowPreview(false);
                  setCapturedImage(null);
                }}
                disabled={loading}
              >
                ✅ Use This Photo
              </Button>

              <Button
                variant="outlined"
                color="secondary"
                onClick={() => {
                  setShowPreview(false);
                  setCapturedImage(null);
                }}
                disabled={loading}
              >
                🔄 Retake Photo
              </Button>
            </>
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Make sure your face is clearly visible and well-lit
        </Typography>

        {/* Debug Information */}
        <Box sx={{ mt: 2, p: 1, bgcolor: "grey.100", borderRadius: 1 }}>
          <Typography variant="caption" display="block">
            <strong>Debug Info:</strong>
          </Typography>
          <Typography variant="caption" display="block">
            Available Cameras: {availableCameras.length}
          </Typography>
          <Typography variant="caption" display="block">
            Selected Camera: {selectedCamera ? "Selected" : "None"}
          </Typography>
          <Typography variant="caption" display="block">
            Streaming: {isStreaming ? "Yes" : "No"}
          </Typography>
          <Typography variant="caption" display="block">
            Models Loaded: {modelsLoaded ? "Yes" : "No"}
          </Typography>
          {availableCameras.length > 0 && (
            <Typography variant="caption" display="block">
              Cameras:{" "}
              {availableCameras
                .map(
                  (c) => `${c.label}(${c.isBuiltIn ? "Built-in" : "Virtual"})`
                )
                .join(", ")}
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default Camera;

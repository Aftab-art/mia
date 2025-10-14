import * as faceapi from "face-api.js";

class FaceRecognitionService {
  constructor() {
    this.isInitialized = false;
    this.modelsLoaded = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Load face-api.js models
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        faceapi.nets.faceExpressionNet.loadFromUri("/models"),
      ]);

      this.modelsLoaded = true;
      this.isInitialized = true;
      console.log("Face recognition models loaded successfully");
    } catch (error) {
      console.error("Failed to load face recognition models:", error);
      throw new Error("Failed to initialize face recognition");
    }
  }

  async detectFaces(imageElement) {
    if (!this.modelsLoaded) {
      await this.initialize();
    }

    try {
      const detections = await faceapi
        .detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors()
        .withFaceExpressions();

      return detections;
    } catch (error) {
      console.error("Face detection failed:", error);
      throw new Error("Face detection failed");
    }
  }

  async detectSingleFace(imageElement) {
    if (!this.modelsLoaded) {
      await this.initialize();
    }

    try {
      const detection = await faceapi
        .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      return detection;
    } catch (error) {
      console.error("Single face detection failed:", error);
      throw new Error("Single face detection failed");
    }
  }

  calculateFaceMatch(faceDescriptor1, faceDescriptor2, threshold = 0.6) {
    const distance = faceapi.euclideanDistance(
      faceDescriptor1,
      faceDescriptor2
    );
    return distance <= threshold;
  }

  async captureImageFromVideo(videoElement) {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;

        context.drawImage(videoElement, 0, 0);

        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        resolve(imageData);
      } catch (error) {
        reject(error);
      }
    });
  }

  async captureAndDetectFace(videoElement) {
    try {
      const imageData = await this.captureImageFromVideo(videoElement);

      // Create image element for face detection
      const img = new Image();
      img.crossOrigin = "anonymous";

      return new Promise((resolve, reject) => {
        img.onload = async () => {
          try {
            const detection = await this.detectSingleFace(img);
            resolve({
              imageData,
              detection,
            });
          } catch (error) {
            reject(error);
          }
        };

        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = imageData;
      });
    } catch (error) {
      throw new Error("Failed to capture and detect face");
    }
  }

  validateFaceDetection(detection) {
    if (!detection) {
      return {
        valid: false,
        message: "No face detected",
      };
    }

    const { descriptor, expressions } = detection;

    if (!descriptor) {
      return {
        valid: false,
        message: "Face descriptor not available",
      };
    }

    // Check if the person is looking at the camera (basic validation)
    const { neutral, happy, sad, angry, fearful, disgusted, surprised } =
      expressions;

    // Ensure neutral expression (person is looking straight)
    if (neutral < 0.5) {
      return {
        valid: false,
        message: "Please look directly at the camera",
      };
    }

    return {
      valid: true,
      message: "Face detected successfully",
    };
  }
}

export default new FaceRecognitionService();

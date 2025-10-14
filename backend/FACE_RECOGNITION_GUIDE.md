# Face Recognition Implementation Guide

## Current Implementation

### ⚠️ Important: Demo vs Production

**Current Status**: DEMO MODE

- Uses SHA256 hash comparison
- Requires 98% byte similarity
- **Will reject different photos of the same person**
- **Only accepts exact same image**

**What This Means**:

- ✅ Different people's faces are REJECTED (secure)
- ❌ Same person's different photos are REJECTED (too strict)
- ✅ Exact same photo is ACCEPTED

---

## 🎯 Solution: Implement Real Face Recognition

For production use, you need actual face recognition that can match different photos of the same person.

### Option 1: face_recognition Library (Recommended for Python)

#### Install

```bash
pip install face-recognition
```

#### Update `auth_service.py`

```python
import face_recognition
import numpy as np

def setup_face_recognition(self, user_id: int, face_image_base64: str) -> bool:
    """Setup face recognition with actual face encoding"""
    user = self.db.query(User).filter(User.id == user_id).first()
    if not user:
        return False

    try:
        # Decode base64 image
        import base64
        from PIL import Image
        from io import BytesIO

        image_data = base64.b64decode(face_image_base64.split(',')[1])
        image = Image.open(BytesIO(image_data))
        image_array = np.array(image)

        # Get face encodings
        face_encodings = face_recognition.face_encodings(image_array)

        if len(face_encodings) == 0:
            return False  # No face found

        # Store the first face encoding
        face_encoding = face_encodings[0]

        # Convert to bytes for storage
        encoding_bytes = face_encoding.tobytes()
        user.face_encoding = encoding_bytes
        user.face_registered = True
        self.db.commit()
        return True

    except Exception as e:
        print(f"Face recognition setup error: {e}")
        return False

def verify_face(self, user_id: int, face_image_base64: str) -> bool:
    """Verify face using actual face recognition"""
    user = self.db.query(User).filter(User.id == user_id).first()
    if not user or not user.face_encoding:
        return False

    try:
        # Decode base64 image
        import base64
        from PIL import Image
        from io import BytesIO
        import numpy as np

        image_data = base64.b64decode(face_image_base64.split(',')[1])
        image = Image.open(BytesIO(image_data))
        image_array = np.array(image)

        # Get face encodings from current image
        current_encodings = face_recognition.face_encodings(image_array)

        if len(current_encodings) == 0:
            return False  # No face found

        current_encoding = current_encodings[0]

        # Convert stored encoding back to numpy array
        stored_encoding = np.frombuffer(user.face_encoding, dtype=np.float64)

        # Compare faces
        matches = face_recognition.compare_faces(
            [stored_encoding],
            current_encoding,
            tolerance=0.6  # Lower = more strict (0.6 is recommended)
        )

        # Calculate face distance (lower = more similar)
        face_distance = face_recognition.face_distance([stored_encoding], current_encoding)[0]

        print(f"Face verification for {user.username}:")
        print(f"  - Face distance: {face_distance:.3f}")
        print(f"  - Match: {'✅ YES' if matches[0] else '❌ NO'}")

        return matches[0]

    except Exception as e:
        print(f"Face verification error: {e}")
        return False
```

### Option 2: DeepFace Library (More Accurate)

#### Install

```bash
pip install deepface
```

#### Implementation

```python
from deepface import DeepFace
import cv2
import numpy as np

def verify_face_deepface(self, user_id: int, face_image_base64: str) -> bool:
    """Verify face using DeepFace"""
    user = self.db.query(User).filter(User.id == user_id).first()
    if not user or not user.face_encoding:
        return False

    try:
        # Decode images
        current_img = self._base64_to_cv2(face_image_base64)
        stored_img = self._base64_to_cv2(user.face_encoding)

        # Verify faces
        result = DeepFace.verify(
            current_img,
            stored_img,
            model_name='VGG-Face',  # or 'Facenet', 'OpenFace', 'DeepFace'
            distance_metric='cosine'
        )

        print(f"Face verification for {user.username}:")
        print(f"  - Distance: {result['distance']:.3f}")
        print(f"  - Threshold: {result['threshold']:.3f}")
        print(f"  - Match: {'✅ YES' if result['verified'] else '❌ NO'}")

        return result['verified']

    except Exception as e:
        print(f"Face verification error: {e}")
        return False
```

### Option 3: FaceNet (TensorFlow)

```python
from keras_facenet import FaceNet
import cv2

embedder = FaceNet()

def get_face_embedding(self, image):
    """Get face embedding using FaceNet"""
    # Detect face
    detections = embedder.extract(image, threshold=0.95)
    if len(detections) == 0:
        return None
    return detections[0]['embedding']

def verify_face_facenet(self, user_id: int, face_image_base64: str) -> bool:
    """Verify using FaceNet embeddings"""
    # Get embeddings
    current_embedding = self.get_face_embedding(current_image)
    stored_embedding = self.get_face_embedding(stored_image)

    if current_embedding is None or stored_embedding is None:
        return False

    # Calculate cosine similarity
    from scipy.spatial.distance import cosine
    distance = cosine(current_embedding, stored_embedding)

    # Threshold: <0.4 = same person, >0.6 = different person
    return distance < 0.4
```

---

## 🔧 Quick Fix for Demo

If you want to keep the demo simple but allow it to work, you have two options:

### Option A: Use Exact Same Image for Testing

1. Save the registration photo
2. Use the exact same image for check-in
3. This will pass the 98% similarity threshold

### Option B: Lower the Threshold (Not Recommended)

```python
# In auth_service.py, line 186
similarity_threshold = 0.10  # 10% similarity (very permissive)
```

**Warning**: This will accept almost any image, including different people!

---

## 📊 Similarity Thresholds Explained

### Hash-Based (Current System)

- `1.0` (100%) = Exact same image
- `0.98` (98%) = Almost exact
- `<0.10` (10%) = Different images

### Real Face Recognition

- `0.6` = Default threshold (good balance)
- `0.4` = Strict (fewer false positives)
- `0.8` = Lenient (fewer false negatives)

---

## ✅ Recommended Implementation Steps

1. **Install face_recognition**:

   ```bash
   pip install face-recognition dlib cmake
   ```

2. **Update `auth_service.py`** with the code from Option 1 above

3. **Test with different photos** of the same person

4. **Adjust tolerance** based on your security needs

5. **Add error handling** for edge cases:
   - No face detected
   - Multiple faces detected
   - Poor image quality
   - Lighting issues

---

## 🎯 Current Behavior

**With 98% Threshold (Current)**:

- ✅ Blocks different people ✅
- ❌ Blocks same person's different photos ❌
- ✅ Allows exact same image ✅

**With Real Face Recognition**:

- ✅ Blocks different people ✅
- ✅ Allows same person's different photos ✅
- ✅ Allows exact same image ✅

---

## 📝 Note

The current implementation is **intentionally strict** to demonstrate security. For production:

1. **Use real face recognition library** (face_recognition recommended)
2. **Test with multiple photos** of each person
3. **Fine-tune threshold** for your use case
4. **Add liveness detection** to prevent photo spoofing
5. **Consider privacy** - encrypt face data at rest

---

## Support

For implementing real face recognition:

1. Check library documentation
2. Test with sample images first
3. Monitor false positive/negative rates
4. Adjust threshold as needed

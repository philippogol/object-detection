import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Button, Alert } from 'react-native';
import Canvas from 'react-native-canvas'; // Import react-native-canvas
import { Camera, useCameraDevice, useCameraPermission, useMicrophonePermission, Frame } from 'react-native-vision-camera';
import { runOnUI } from 'react-native-reanimated';
import '@tensorflow/tfjs'; // Import TensorFlow.js
import '@tensorflow/tfjs-react-native'; // Import TensorFlow.js for React Native
import * as cocoSsd from '@tensorflow-models/coco-ssd'; // Import COCO-SSD
import { Tensor } from '@tensorflow/tfjs-core';

// Initialize TensorFlow.js and COCO-SSD
const initializeTensorFlow = async () => {
  await tf.ready(); // Ensure TensorFlow.js is ready
  const model = await cocoSsd.load(); // Load COCO-SSD model
  console.log('COCO-SSD model loaded.');
  return model;
};

// Function to convert camera frame to Tensor
const convertFrameToTensor = async (frame: Frame): Promise<Tensor> => {
  // Implement frame to Tensor conversion logic
  // Placeholder for actual implementation
  // return tf.browser.fromPixels(imageBuffer);
  return tf.zeros([frame.height, frame.width, 3]); // Dummy tensor for illustration
};

// Function to draw bounding boxes on canvas
const drawBoundingBoxes = (predictions: any[], canvas: any) => {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  predictions.forEach(prediction => {
    const [x, y, width, height] = prediction.bbox;
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);
    ctx.font = '16px Arial';
    ctx.fillStyle = 'red';
    ctx.fillText(prediction.class, x, y > 10 ? y - 5 : 10);
  });
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<boolean>(false);
  const [microphonePermissionStatus, setMicrophonePermissionStatus] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [model, setModel] = useState<any>(null); // TensorFlow model state
  const [predictions, setPredictions] = useState<any[]>([]); // Store predictions

  const device = useCameraDevice('back');
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
  const { hasPermission: hasMicrophonePermission, requestPermission: requestMicrophonePermission } = useMicrophonePermission();
  const canvasRef = useRef<Canvas>(null);

  useEffect(() => {
    const requestPermissions = async () => {
      const cameraStatus = await requestCameraPermission();
      setCameraPermissionStatus(cameraStatus);

      const microphoneStatus = await requestMicrophonePermission();
      setMicrophonePermissionStatus(microphoneStatus);

      if (cameraStatus && microphoneStatus) {
        const loadedModel = await initializeTensorFlow();
        setModel(loadedModel);
      }

      setLoading(false);
    };

    requestPermissions();
  }, [requestCameraPermission, requestMicrophonePermission]);

  const frameProcessor = async (frame: Frame) => {
    'worklet';

    if (!model) {
      console.log('Model not loaded');
      return;
    }

    try {
      const tensor = await convertFrameToTensor(frame);
      const predictions = await model.detect(tensor);
      setPredictions(predictions);

      runOnUI(() => {
        if (canvasRef.current) {
          drawBoundingBoxes(predictions, canvasRef.current);
        }
      });
    } catch (error) {
      console.error('Error processing frame:', error);
    }
  };

  if (loading) return <PermissionsPage />;
  if (!cameraPermissionStatus) {
    return (
      <View style={styles.container}>
        <Text>Permissions are not granted</Text>
        <Button
          title="Request Permissions"
          onPress={async () => {
            const cameraStatus = await requestCameraPermission();
            const microphoneStatus = await requestMicrophonePermission();

            setCameraPermissionStatus(cameraStatus);
            setMicrophonePermissionStatus(microphoneStatus);

            if (!cameraStatus) {
              Alert.alert('Permissions Required', 'You need to grant camera and microphone permissions.');
            }
          }}
        />
      </View>
    );
  }

  if (device == null) return <NoCameraDeviceError />;

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <Button
          title={isCameraActive ? "Stop Camera" : "Start Camera"}
          onPress={() => setIsCameraActive(prevState => !prevState)}
        />
      </View>
      {isCameraActive && (
        <>
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            frameProcessor={frameProcessor} // Add frame processor here
          />
          <Canvas ref={canvasRef} style={StyleSheet.absoluteFill} /> {/* Draw bounding boxes here */}
        </>
      )}
    </View>
  );
};

const PermissionsPage: React.FC = () => (
  <View style={styles.container}>
    <Text>Requesting permissions...</Text>
  </View>
);

const NoCameraDeviceError: React.FC = () => (
  <View style={styles.container}>
    <Text>No camera device available</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  buttonContainer: {
    position: 'absolute',
    zIndex: 999,
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16, // Optional padding
  },
});

export default App;

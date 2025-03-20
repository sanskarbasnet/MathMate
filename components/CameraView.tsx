import React, { forwardRef, useImperativeHandle } from "react";
import { View, Text, StyleSheet } from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";

export interface CameraViewRef {
  takePicture: () => Promise<{
    uri: string;
    base64: string;
  } | null>;
}

const CameraViewComponent = forwardRef<CameraViewRef>((props, ref) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = React.useState<CameraType>("back");
  const cameraRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useImperativeHandle(ref, () => ({
    takePicture: async () => {
      if (cameraRef.current) {
        try {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 1,
            base64: true,
            exif: false,
            skipProcessing: true,
          });

          if (!photo.base64) {
            console.error("No base64 data in photo");
            return null;
          }

          return {
            uri: photo.uri,
            base64: photo.base64,
          };
        } catch (error) {
          console.error("Error taking picture:", error);
          return null;
        }
      }
      return null;
    },
  }));

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>
          We need your permission to use the camera
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  camera: {
    flex: 1,
    width: "100%",
  },
  permissionText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 16,
  },
});

export default CameraViewComponent;

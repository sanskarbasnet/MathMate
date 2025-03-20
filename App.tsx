import React, { useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  ScrollView,
  Modal,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import CameraViewComponent, { CameraViewRef } from "./components/CameraView";
import {
  analyzeAndSolveEquation,
  extractEquationFromImage,
} from "./utils/openaiHelper";
import MathJax from "react-native-mathjax";
import { Camera } from "expo-camera";
import { LineChart } from "react-native-chart-kit";

interface Solution {
  steps: string[];
  finalAnswer: string;
  originalEquation: string;
}

interface GraphData {
  labels: string[];
  datasets: {
    data: number[];
    color: (opacity: number) => string;
    strokeWidth: number;
  }[];
}

export default function App() {
  const cameraRef = useRef<CameraViewRef>(null);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [showGraph, setShowGraph] = useState(false);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [base64Image, setBase64Image] = useState<string>("");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleSolve = async () => {
    try {
      setIsProcessing(true);
      setLoadingMessage("Taking a picture of your equation...");

      if (cameraRef.current) {
        const photo = await cameraRef.current.takePicture();
        if (photo && photo.base64) {
          setLoadingMessage("Analyzing the image to extract the equation...");
          setBase64Image(photo.base64);
          await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate processing

          setLoadingMessage("Processing the equation with advanced AI...");
          await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate processing

          setLoadingMessage("Generating step-by-step solution...");
          const result = await analyzeAndSolveEquation(photo.base64);

          setLoadingMessage("Finalizing the solution...");
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate processing

          setSolution(result);
          setShowSolution(true);
        } else {
          console.error("Failed to capture photo with base64 data");
        }
      }
    } catch (error) {
      console.error("Error solving equation:", error);
      setLoadingMessage("Error solving equation");
    } finally {
      setIsProcessing(false);
      setLoadingMessage("");
    }
  };

  const handleGraph = async () => {
    try {
      setIsProcessing(true);
      setLoadingMessage("Taking a picture of your equation...");

      if (cameraRef.current) {
        const photo = await cameraRef.current.takePicture();
        if (photo && photo.base64) {
          setLoadingMessage("Analyzing the image to extract the equation...");
          await new Promise((resolve) => setTimeout(resolve, 1500));

          setLoadingMessage("Processing the equation...");
          const equation = await extractEquationFromImage(photo.base64);
          console.log("Extracted equation for graph:", equation);

          if (equation) {
            setLoadingMessage("Generating graph...");
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Generate points for the graph
            const cleanEquation = equation.replace(/[$\$]/g, "");
            const xValues = Array.from({ length: 21 }, (_, i) => i - 10);

            const yValues = xValues.map((x) => {
              try {
                const evalEquation = cleanEquation.replace(/x/g, x.toString());
                return new Function("return " + evalEquation)();
              } catch (error) {
                console.error("Error evaluating point:", error);
                return 0;
              }
            });

            setGraphData({
              labels: xValues.map((x) => x.toString()),
              datasets: [
                {
                  data: yValues,
                  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                  strokeWidth: 2,
                },
              ],
            });

            setShowGraph(true);
          }
        }
      }
    } catch (error) {
      console.error("Error generating graph:", error);
      setLoadingMessage("Error generating graph");
    } finally {
      setIsProcessing(false);
      setLoadingMessage("");
    }
  };

  const renderLatex = (latex: string) => {
    return (
      <MathJax
        html={latex}
        mathJaxOptions={{
          messageStyle: "none",
          extensions: ["tex2jax.js"],
          jax: ["input/TeX", "output/HTML-CSS"],
          tex2jax: {
            inlineMath: [["$", "$"]],
            displayMath: [["$$", "$$"]],
          },
          "HTML-CSS": { availableFonts: ["STIX"] },
        }}
      />
    );
  };

  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraViewComponent ref={cameraRef} />
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomContainer}>
        {/* Settings Button */}
        <TouchableOpacity style={styles.cornerButton} onPress={() => {}}>
          <Ionicons name="settings-outline" size={28} color="white" />
        </TouchableOpacity>

        {/* Main Action Buttons */}
        <View style={styles.mainButtonsContainer}>
          <TouchableOpacity
            style={[styles.mainButton, isProcessing && styles.buttonDisabled]}
            onPress={handleSolve}
            disabled={isProcessing}
          >
            <Ionicons name="calculator-outline" size={32} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mainButton, styles.graphButton]}
            onPress={handleGraph}
          >
            <Ionicons name="analytics-outline" size={32} color="white" />
          </TouchableOpacity>
        </View>

        {/* History Button */}
        <TouchableOpacity style={styles.cornerButton} onPress={() => {}}>
          <Ionicons name="time-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Loading Modal */}
      <Modal visible={isProcessing} transparent={true} animationType="fade">
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingTitle}>Solving Your Equation</Text>
            <Text style={styles.loadingMessage}>{loadingMessage}</Text>
          </View>
        </View>
      </Modal>

      {/* Solution Modal */}
      <Modal
        visible={showSolution}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSolution(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Solution</Text>
              <TouchableOpacity
                onPress={() => setShowSolution(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.solutionScroll}>
              {solution && (
                <>
                  <View style={styles.solutionCard}>
                    <Text style={styles.solutionTitle}>Original Equation:</Text>
                    {renderLatex(solution.originalEquation)}
                  </View>

                  <View style={styles.solutionCard}>
                    <Text style={styles.solutionTitle}>Steps:</Text>
                    {solution.steps.map((step, index) => (
                      <View key={index} style={styles.stepContainer}>
                        {renderLatex(step)}
                      </View>
                    ))}
                  </View>

                  <View style={styles.solutionCard}>
                    <Text style={styles.solutionTitle}>Final Answer:</Text>
                    {renderLatex(solution.finalAnswer)}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Graph Modal */}
      <Modal
        visible={showGraph}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGraph(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Graph</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowGraph(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.graphContainer}>
              {graphData && (
                <LineChart
                  data={graphData}
                  width={Dimensions.get("window").width - 40}
                  height={300}
                  chartConfig={{
                    backgroundColor: "#ffffff",
                    backgroundGradientFrom: "#ffffff",
                    backgroundGradientTo: "#ffffff",
                    decimalPlaces: 2,
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                  }}
                  bezier
                  style={styles.chart}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  cameraContainer: {
    flex: 1,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "transparent",
  },
  mainButtonsContainer: {
    flexDirection: "row",
    gap: 20,
  },
  mainButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  cornerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: "85%",
    width: "100%",
    marginTop: "5%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
  },
  closeButton: {
    padding: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
  },
  solutionScroll: {
    flex: 1,
  },
  solutionCard: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  solutionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  stepContainer: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: "white",
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    width: "80%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  loadingMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 24,
  },
  graphContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  graphButton: {
    backgroundColor: "#34C759",
  },
});

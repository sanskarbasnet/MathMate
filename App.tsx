import React, { useRef, useState, useEffect } from "react";
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
  MathMateError,
} from "./utils/openaiHelper";
import MathJax from "react-native-mathjax";
import { Camera } from "expo-camera";
import { LineChart } from "react-native-chart-kit";
import WebView from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Solution {
  steps: string[];
  finalAnswer: string;
  originalEquation: string;
}

interface GraphData {
  equation: string;
  latexEquation: string;
}

interface HistoryItem {
  id: string;
  equation: string;
  type: "solution" | "graph";
  date: string;
  data: Solution | GraphData;
  isBookmarked: boolean;
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
  const webViewRef = useRef<WebView>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isWebViewLoading, setIsWebViewLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [textSize, setTextSize] = useState<"normal" | "large" | "extraLarge">(
    "normal"
  );
  const [activeTab, setActiveTab] = useState<"general" | "privacy">("general");
  const [error, setError] = useState<{ message: string; code: string } | null>(
    null
  );
  const [showError, setShowError] = useState(false);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const savedHistory = await AsyncStorage.getItem("mathmate_history");
        if (savedHistory) {
          setHistory(JSON.parse(savedHistory));
        }
      } catch (error) {
        console.error("Error loading history:", error);
      }
    };

    loadHistory();
  }, []);

  useEffect(() => {
    console.log("showSolution state changed:", showSolution);
  }, [showSolution]);

  useEffect(() => {
    console.log("solution state changed:", solution);
  }, [solution]);

  useEffect(() => {
    console.log("showGraph state changed:", showGraph);
  }, [showGraph]);

  useEffect(() => {
    console.log("graphData state changed:", graphData);
  }, [graphData]);

  // Add useEffect to load settings when app starts
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem("mathmate_settings");
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          setHighContrastMode(settings.highContrastMode);
          setDarkMode(settings.darkMode);
          setTextSize(settings.textSize);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };

    loadSettings();
  }, []);

  // Add function to save settings
  const saveSettings = async () => {
    try {
      const settings = {
        highContrastMode,
        darkMode,
        textSize,
      };
      await AsyncStorage.setItem("mathmate_settings", JSON.stringify(settings));
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  // Add useEffect to save settings when they change
  useEffect(() => {
    saveSettings();
  }, [highContrastMode, darkMode, textSize]);

  // Add function to get dynamic styles based on settings
  const getDynamicStyles = () => {
    const baseColors = {
      background: darkMode ? "#1a1a1a" : "#ffffff",
      text: darkMode ? "#ffffff" : "#333333",
      secondaryText: darkMode ? "#cccccc" : "#666666",
      card: darkMode ? "#2d2d2d" : "#f5f5f5",
      border: darkMode ? "#404040" : "#eeeeee",
    };

    const contrastColors = highContrastMode
      ? {
          background: darkMode ? "#000000" : "#ffffff",
          text: darkMode ? "#ffffff" : "#000000",
          secondaryText: darkMode ? "#ffffff" : "#000000",
          card: darkMode ? "#1a1a1a" : "#f0f0f0",
          border: darkMode ? "#ffffff" : "#000000",
        }
      : baseColors;

    const textSizes = {
      normal: {
        title: 24,
        subtitle: 18,
        body: 16,
        small: 14,
      },
      large: {
        title: 28,
        subtitle: 22,
        body: 20,
        small: 16,
      },
      extraLarge: {
        title: 32,
        subtitle: 26,
        body: 24,
        small: 18,
      },
    };

    return {
      colors: contrastColors,
      sizes: textSizes[textSize],
    };
  };

  const dynamicStyles = getDynamicStyles();

  // Update the styles object to use dynamic values
  const currentStyles = StyleSheet.create({
    ...styles,
    container: {
      ...styles.container,
      backgroundColor: dynamicStyles.colors.background,
    },
    modalContent: {
      ...styles.modalContent,
      backgroundColor: dynamicStyles.colors.background,
    },
    modalTitle: {
      ...styles.modalTitle,
      color: dynamicStyles.colors.text,
      fontSize: dynamicStyles.sizes.title,
    },
    sectionTitle: {
      ...styles.sectionTitle,
      color: dynamicStyles.colors.text,
      fontSize: dynamicStyles.sizes.subtitle,
    },
    sectionText: {
      ...styles.sectionText,
      color: dynamicStyles.colors.secondaryText,
      fontSize: dynamicStyles.sizes.body,
    },
    settingLabel: {
      ...styles.settingLabel,
      color: dynamicStyles.colors.text,
      fontSize: dynamicStyles.sizes.body,
    },
    solutionCard: {
      ...styles.solutionCard,
      backgroundColor: dynamicStyles.colors.card,
    },
    solutionTitle: {
      ...styles.solutionTitle,
      color: dynamicStyles.colors.text,
      fontSize: dynamicStyles.sizes.subtitle,
    },
    stepContainer: {
      ...styles.stepContainer,
      backgroundColor: dynamicStyles.colors.background,
    },
    historyItem: {
      ...styles.historyItem,
      backgroundColor: dynamicStyles.colors.card,
    },
    historyDate: {
      ...styles.historyDate,
      color: dynamicStyles.colors.secondaryText,
      fontSize: dynamicStyles.sizes.small,
    },
    historyEquation: {
      ...styles.historyEquation,
      backgroundColor: dynamicStyles.colors.background,
    },
    modalHeader: {
      ...styles.modalHeader,
      borderBottomColor: dynamicStyles.colors.border,
    },
    tabContainer: {
      ...styles.tabContainer,
      borderBottomColor: dynamicStyles.colors.border,
    },
    tabText: {
      ...styles.tabText,
      color: dynamicStyles.colors.secondaryText,
      fontSize: dynamicStyles.sizes.body,
    },
    activeTabText: {
      ...styles.activeTabText,
      color: "#007AFF",
    },
    logoHeader: {
      position: "absolute",
      top: 25,
      left: 0,
      right: 0,
      height: 80,
      backgroundColor: "transparent",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2,
    },
    logoText: {
      color: "white",
      fontSize: 32,
      fontWeight: "bold",
      letterSpacing: 2,
      textShadowColor: "rgba(0, 0, 0, 0.5)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    modalHeaderButtons: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    clearButton: {
      padding: 8,
      backgroundColor: "#f5f5f5",
      borderRadius: 20,
    },
    errorContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    errorMessage: {
      fontSize: 18,
      fontWeight: "600",
      color: "#333",
      textAlign: "center",
      marginTop: 20,
      marginBottom: 10,
    },
    errorSubtext: {
      fontSize: 14,
      color: "#666",
      textAlign: "center",
      marginTop: 10,
      lineHeight: 20,
    },
    bookmarkButton: {
      padding: 8,
      backgroundColor: "#f5f5f5",
      borderRadius: 20,
    },
    bookmarkButtonActive: {
      backgroundColor: "#e3f2fd",
    },
    historyItemLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    bookmarkIcon: {
      padding: 4,
    },
  });

  // Add function to handle errors
  const handleError = (error: unknown) => {
    console.error("Error occurred:", error);
    if (error instanceof MathMateError) {
      setError({ message: error.message, code: error.code });
    } else if (error instanceof Error) {
      setError({ message: error.message, code: "UNKNOWN_ERROR" });
    } else {
      setError({
        message: "An unexpected error occurred",
        code: "UNKNOWN_ERROR",
      });
    }
    setShowError(true);
    setIsProcessing(false);
    setLoadingMessage("");
  };

  const handleSolve = async () => {
    try {
      // Reset states before starting new problem
      setSolution(null);
      setShowSolution(false);
      setError(null);
      setShowError(false);
      setIsProcessing(true);
      setLoadingMessage("Taking a picture of your equation...");

      if (cameraRef.current) {
        const photo = await cameraRef.current.takePicture();
        if (photo && photo.base64) {
          setLoadingMessage("Analyzing the image to extract the equation...");
          setBase64Image(photo.base64);
          await new Promise((resolve) => setTimeout(resolve, 1500));

          setLoadingMessage("Processing the equation with advanced AI...");
          await new Promise((resolve) => setTimeout(resolve, 1500));

          setLoadingMessage("Generating step-by-step solution...");
          const result = await analyzeAndSolveEquation(photo.base64);
          console.log(
            "Received solution result:",
            JSON.stringify(result, null, 2)
          );

          if (!result) {
            throw new Error("No result received from analyzeAndSolveEquation");
          }

          setLoadingMessage("Finalizing the solution...");
          await new Promise((resolve) => setTimeout(resolve, 1000));

          console.log("Setting solution state with:", {
            steps: result.steps,
            finalAnswer: result.finalAnswer,
            originalEquation: result.originalEquation,
          });

          setSolution(result);

          // Add a small delay before showing the modal
          setTimeout(() => {
            console.log("Setting showSolution to true");
            setShowSolution(true);
          }, 100);

          // Save to history
          await saveToHistory(result.originalEquation, "solution", result);
        } else {
          throw new Error("Failed to capture photo with base64 data");
        }
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsProcessing(false);
      setLoadingMessage("");
    }
  };

  const handleGraph = async () => {
    try {
      // Reset states before starting new problem
      setGraphData(null);
      setShowGraph(false);
      setError(null);
      setShowError(false);
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
            // Keep the LaTeX format for display
            const latexEquation = equation;
            // Remove LaTeX delimiters for Desmos
            const cleanedEquation = equation.replace(/\$/g, "").trim();

            console.log("Cleaned equation for Desmos:", cleanedEquation);
            const graphData = {
              equation: cleanedEquation,
              latexEquation: latexEquation,
            };
            console.log("Setting graph data:", graphData);

            // Add a small delay before setting states
            setTimeout(() => {
              setGraphData(graphData);
              console.log("Setting showGraph to true");
              setShowGraph(true);
            }, 100);

            // Save to history
            await saveToHistory(equation, "graph", graphData);
          }
        }
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsProcessing(false);
      setLoadingMessage("");
    }
  };

  const renderLatex = (latex: string) => {
    try {
      console.log("Rendering LaTeX:", latex);
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
    } catch (error) {
      console.error("Error rendering LaTeX:", error);
      return <Text style={{ color: "red" }}>Error rendering equation</Text>;
    }
  };

  const saveToHistory = async (
    equation: string,
    type: "solution" | "graph",
    data: Solution | GraphData
  ) => {
    try {
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        equation,
        type,
        date: new Date().toLocaleString(),
        data,
        isBookmarked: false,
      };

      const updatedHistory = [...history, newItem];
      setHistory(updatedHistory);

      // Save to AsyncStorage
      await AsyncStorage.setItem(
        "mathmate_history",
        JSON.stringify(updatedHistory)
      );
    } catch (error) {
      console.error("Error saving to history:", error);
    }
  };

  const toggleBookmark = async (id: string) => {
    try {
      const updatedHistory = history.map((item) =>
        item.id === id ? { ...item, isBookmarked: !item.isBookmarked } : item
      );
      setHistory(updatedHistory);
      await AsyncStorage.setItem(
        "mathmate_history",
        JSON.stringify(updatedHistory)
      );
    } catch (error) {
      console.error("Error toggling bookmark:", error);
    }
  };

  // Add clearHistory function
  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem("mathmate_history");
      setHistory([]);
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  };

  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={currentStyles.container}>
      <StatusBar style="light" />

      {/* Logo Header */}
      <View style={currentStyles.logoHeader}>
        <Text style={currentStyles.logoText}>MathMate</Text>
      </View>

      {/* Camera View */}
      <View style={currentStyles.cameraContainer}>
        <CameraViewComponent ref={cameraRef} />
      </View>

      {/* Bottom Buttons */}
      <View style={currentStyles.bottomContainer}>
        {/* Settings Button */}
        <TouchableOpacity
          style={currentStyles.cornerButton}
          onPress={() => setShowSettings(true)}
        >
          <Ionicons name="settings-outline" size={28} color="white" />
        </TouchableOpacity>

        {/* Main Action Buttons */}
        <View style={currentStyles.mainButtonsContainer}>
          <TouchableOpacity
            style={[
              currentStyles.mainButton,
              isProcessing && currentStyles.buttonDisabled,
            ]}
            onPress={handleSolve}
            disabled={isProcessing}
          >
            <Ionicons name="calculator-outline" size={32} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[currentStyles.mainButton, currentStyles.graphButton]}
            onPress={handleGraph}
          >
            <Ionicons name="analytics-outline" size={32} color="white" />
          </TouchableOpacity>
        </View>

        {/* History Button */}
        <TouchableOpacity
          style={currentStyles.cornerButton}
          onPress={() => setShowHistory(true)}
        >
          <Ionicons name="time-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Loading Modal */}
      <Modal visible={isProcessing} transparent={true} animationType="fade">
        <View style={currentStyles.loadingContainer}>
          <View style={currentStyles.loadingContent}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={currentStyles.loadingTitle}>
              Solving Your Equation
            </Text>
            <Text style={currentStyles.loadingMessage}>{loadingMessage}</Text>
          </View>
        </View>
      </Modal>

      {/* Solution Modal */}
      <Modal
        visible={showSolution}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          console.log("Modal onRequestClose called");
          setShowSolution(false);
        }}
      >
        <View style={currentStyles.modalContainer}>
          <View style={currentStyles.modalContent}>
            <View style={currentStyles.modalHeader}>
              <Text style={currentStyles.modalTitle}>Solution</Text>
              <TouchableOpacity
                onPress={() => {
                  console.log("Close button pressed");
                  setShowSolution(false);
                }}
                style={currentStyles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={currentStyles.solutionScroll}>
              {solution && (
                <>
                  <View style={currentStyles.solutionCard}>
                    <Text style={currentStyles.solutionTitle}>
                      Original Equation:
                    </Text>
                    {renderLatex(solution.originalEquation)}
                  </View>

                  <View style={currentStyles.solutionCard}>
                    <Text style={currentStyles.solutionTitle}>Steps:</Text>
                    {solution.steps.map((step, index) => (
                      <View key={index} style={currentStyles.stepContainer}>
                        {renderLatex(step)}
                      </View>
                    ))}
                  </View>

                  <View style={currentStyles.solutionCard}>
                    <Text style={currentStyles.solutionTitle}>
                      Final Answer:
                    </Text>
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
        onRequestClose={() => {
          console.log("Graph modal onRequestClose called");
          setShowGraph(false);
        }}
      >
        <View style={currentStyles.modalContainer}>
          <View style={currentStyles.modalContent}>
            <View style={currentStyles.modalHeader}>
              <Text style={currentStyles.modalTitle}>Graph</Text>
              <TouchableOpacity
                style={currentStyles.closeButton}
                onPress={() => {
                  console.log("Graph modal close button pressed");
                  setShowGraph(false);
                }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={currentStyles.graphContainer}>
              {isWebViewLoading && (
                <View style={currentStyles.webViewLoading}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={currentStyles.loadingText}>
                    Loading graph...
                  </Text>
                </View>
              )}
              {graphData && (
                <View style={currentStyles.solutionCard}>
                  <Text style={currentStyles.solutionTitle}>
                    Original Equation:
                  </Text>
                  {renderLatex(graphData.latexEquation)}
                </View>
              )}
              <WebView
                key={`${textSize}-${darkMode}-${highContrastMode}`}
                ref={webViewRef}
                source={{
                  html: `
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                        <script src="https://www.desmos.com/api/v1.7/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"></script>
                        <style>
                          :root {
                            --body-size: ${dynamicStyles.sizes.body}px;
                            --small-size: ${dynamicStyles.sizes.small}px;
                          }
                          html, body { 
                            margin: 0; 
                            padding: 0; 
                            height: 100%; 
                            width: 100%;
                            overflow: hidden;
                            background-color: ${dynamicStyles.colors.background};
                            font-size: var(--body-size);
                            color: ${dynamicStyles.colors.text};
                          }
                          #calculator { 
                            width: 100%; 
                            height: 100%; 
                          }
                          .dcg-label,
                          .dcg-expression-label,
                          .dcg-mq-editable-field,
                          .dcg-btn,
                          .dcg-tooltip,
                          .dcg-menu,
                          .dcg-menu-item,
                          .dcg-axis-label {
                            font-size: var(--body-size) !important;
                            color: ${dynamicStyles.colors.text} !important;
                          }
                          .dcg-axis-tick-label {
                            font-size: var(--small-size) !important;
                            color: ${dynamicStyles.colors.secondaryText} !important;
                          }
                          .dcg-expression {
                            font-size: var(--body-size) !important;
                          }
                          .dcg-expression-label {
                            font-size: var(--body-size) !important;
                          }
                          .dcg-mq-editable-field {
                            font-size: var(--body-size) !important;
                          }
                          .dcg-btn {
                            font-size: var(--body-size) !important;
                          }
                          .dcg-tooltip {
                            font-size: var(--body-size) !important;
                          }
                          .dcg-menu {
                            font-size: var(--body-size) !important;
                          }
                          .dcg-menu-item {
                            font-size: var(--body-size) !important;
                          }
                          .dcg-axis-label {
                            font-size: var(--body-size) !important;
                          }
                          .dcg-axis-tick-label {
                            font-size: var(--small-size) !important;
                          }
                          .dcg-expression-item {
                            font-size: var(--body-size) !important;
                          }
                          .dcg-expression-item .dcg-label {
                            font-size: var(--body-size) !important;
                          }
                          .dcg-expression-item .dcg-mq-editable-field {
                            font-size: var(--body-size) !important;
                          }
                          .dcg-expression-item .dcg-expression-label {
                            font-size: var(--body-size) !important;
                          }
                          .dcg-expression-item .dcg-expression {
                            font-size: var(--body-size) !important;
                          }
                          .dcg-expression-item .dcg-expression .dcg-label {
                            font-size: var(--body-size) !important;
                          }
                          .dcg-expression-item .dcg-expression .dcg-mq-editable-field {
                            font-size: var(--body-size) !important;
                          }
                          .dcg-expression-item .dcg-expression .dcg-expression-label {
                            font-size: var(--body-size) !important;
                          }
                        </style>
                      </head>
                      <body>
                        <div id="calculator"></div>
                        <script>
                          var calculator = Desmos.GraphingCalculator(
                            document.getElementById('calculator'),
                            { 
                              expressionsCollapsed: true,
                              showGrid: true,
                              showXAxis: true,
                              showYAxis: true,
                              xAxisLabel: 'x',
                              yAxisLabel: 'y',
                              fontSize: ${dynamicStyles.sizes.body},
                              backgroundColor: '${dynamicStyles.colors.background}',
                              textColor: '${dynamicStyles.colors.text}',
                              gridColor: '${dynamicStyles.colors.border}',
                              axisColor: '${dynamicStyles.colors.text}',
                              labelColor: '${dynamicStyles.colors.text}'
                            }
                          );
                          
                          // Listen for messages from React Native
                          window.addEventListener('message', function(event) {
                            console.log('Received equation in WebView:', event.data);
                            try {
                              calculator.setExpression({
                                id: 'graph1',
                                latex: event.data
                              });
                              console.log('Successfully set expression in Desmos');
                            } catch (error) {
                              console.error('Error setting expression in Desmos:', error);
                            }
                          });
                        </script>
                      </body>
                    </html>
                  `,
                }}
                style={currentStyles.desmosContainer}
                onLoadStart={() => {
                  console.log("WebView started loading");
                  setIsWebViewLoading(true);
                }}
                onLoadEnd={() => {
                  console.log(
                    "WebView loaded, sending equation:",
                    graphData?.equation
                  );
                  setIsWebViewLoading(false);
                  if (graphData?.equation) {
                    // Send the equation to Desmos
                    webViewRef.current?.postMessage(graphData.equation);
                  }
                }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                scalesPageToFit={true}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.warn("WebView error: ", nativeEvent);
                  setIsWebViewLoading(false);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal
        visible={showHistory}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHistory(false)}
      >
        <View style={currentStyles.modalContainer}>
          <View style={currentStyles.modalContent}>
            <View style={currentStyles.modalHeader}>
              <Text style={currentStyles.modalTitle}>History</Text>
              <View style={currentStyles.modalHeaderButtons}>
                <TouchableOpacity
                  style={[
                    currentStyles.bookmarkButton,
                    showBookmarksOnly && currentStyles.bookmarkButtonActive,
                  ]}
                  onPress={() => setShowBookmarksOnly(!showBookmarksOnly)}
                >
                  <Ionicons
                    name={showBookmarksOnly ? "bookmark" : "bookmark-outline"}
                    size={24}
                    color={showBookmarksOnly ? "#007AFF" : "#333"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    currentStyles.clearButton,
                    history.length === 0 && currentStyles.buttonDisabled,
                  ]}
                  onPress={clearHistory}
                  disabled={history.length === 0}
                >
                  <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={currentStyles.closeButton}
                  onPress={() => setShowHistory(false)}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={currentStyles.historyScroll}>
              {history
                .filter((item) => !showBookmarksOnly || item.isBookmarked)
                .map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={currentStyles.historyItem}
                    onPress={() => {
                      if (item.type === "solution") {
                        setSolution(item.data as Solution);
                        setShowSolution(true);
                      } else {
                        setGraphData(item.data as GraphData);
                        setShowGraph(true);
                      }
                      setShowHistory(false);
                    }}
                  >
                    <View style={currentStyles.historyItemHeader}>
                      <View style={currentStyles.historyItemLeft}>
                        <Ionicons
                          name={
                            item.type === "solution"
                              ? "calculator-outline"
                              : "analytics-outline"
                          }
                          size={24}
                          color={dynamicStyles.colors.text}
                        />
                        <Text style={currentStyles.historyDate}>
                          {item.date}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={currentStyles.bookmarkIcon}
                        onPress={() => toggleBookmark(item.id)}
                      >
                        <Ionicons
                          name={
                            item.isBookmarked ? "bookmark" : "bookmark-outline"
                          }
                          size={24}
                          color={item.isBookmarked ? "#007AFF" : "#666"}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={currentStyles.historyEquation}>
                      {item.type === "solution"
                        ? renderLatex((item.data as Solution).originalEquation)
                        : renderLatex((item.data as GraphData).latexEquation)}
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={currentStyles.modalContainer}>
          <View style={currentStyles.modalContent}>
            <View style={currentStyles.modalHeader}>
              <Text style={currentStyles.modalTitle}>Settings</Text>
              <TouchableOpacity
                style={currentStyles.closeButton}
                onPress={() => setShowSettings(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={currentStyles.tabContainer}>
              <TouchableOpacity
                style={[
                  currentStyles.tab,
                  activeTab === "general" && currentStyles.activeTab,
                ]}
                onPress={() => setActiveTab("general")}
              >
                <Text
                  style={[
                    currentStyles.tabText,
                    activeTab === "general" && currentStyles.activeTabText,
                  ]}
                >
                  General
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  currentStyles.tab,
                  activeTab === "privacy" && currentStyles.activeTab,
                ]}
                onPress={() => setActiveTab("privacy")}
              >
                <Text
                  style={[
                    currentStyles.tabText,
                    activeTab === "privacy" && currentStyles.activeTabText,
                  ]}
                >
                  Privacy & Security
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={currentStyles.settingsScroll}>
              {activeTab === "general" ? (
                <>
                  <View style={currentStyles.section}>
                    <Text style={currentStyles.sectionTitle}>
                      About MathMate
                    </Text>
                    <Text style={currentStyles.sectionText}>
                      MathMate is your personal math assistant that helps you
                      solve equations and visualize mathematical concepts
                      through graphs.
                    </Text>
                  </View>

                  <View style={currentStyles.section}>
                    <Text style={currentStyles.sectionTitle}>
                      Accessibility
                    </Text>
                    <View style={currentStyles.settingItem}>
                      <Text style={currentStyles.settingLabel}>
                        High Contrast Mode
                      </Text>
                      <TouchableOpacity
                        style={[
                          currentStyles.toggle,
                          highContrastMode && currentStyles.toggleActive,
                        ]}
                        onPress={() => setHighContrastMode(!highContrastMode)}
                      >
                        <View
                          style={[
                            currentStyles.toggleCircle,
                            highContrastMode &&
                              currentStyles.toggleCircleActive,
                          ]}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={currentStyles.settingItem}>
                      <Text style={currentStyles.settingLabel}>Dark Mode</Text>
                      <TouchableOpacity
                        style={[
                          currentStyles.toggle,
                          darkMode && currentStyles.toggleActive,
                        ]}
                        onPress={() => setDarkMode(!darkMode)}
                      >
                        <View
                          style={[
                            currentStyles.toggleCircle,
                            darkMode && currentStyles.toggleCircleActive,
                          ]}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={currentStyles.section}>
                    <Text style={currentStyles.sectionTitle}>Text Size</Text>
                    <View style={currentStyles.textSizeOptions}>
                      <TouchableOpacity
                        style={[
                          currentStyles.textSizeButton,
                          textSize === "normal" &&
                            currentStyles.textSizeButtonActive,
                        ]}
                        onPress={() => setTextSize("normal")}
                      >
                        <Text
                          style={[
                            currentStyles.textSizeButtonText,
                            textSize === "normal" &&
                              currentStyles.textSizeButtonTextActive,
                          ]}
                        >
                          Normal
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          currentStyles.textSizeButton,
                          textSize === "large" &&
                            currentStyles.textSizeButtonActive,
                        ]}
                        onPress={() => setTextSize("large")}
                      >
                        <Text
                          style={[
                            currentStyles.textSizeButtonText,
                            textSize === "large" &&
                              currentStyles.textSizeButtonTextActive,
                          ]}
                        >
                          Large
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          currentStyles.textSizeButton,
                          textSize === "extraLarge" &&
                            currentStyles.textSizeButtonActive,
                        ]}
                        onPress={() => setTextSize("extraLarge")}
                      >
                        <Text
                          style={[
                            currentStyles.textSizeButtonText,
                            textSize === "extraLarge" &&
                              currentStyles.textSizeButtonTextActive,
                          ]}
                        >
                          Extra Large
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={currentStyles.section}>
                    <Text style={currentStyles.sectionTitle}>
                      Privacy Policy
                    </Text>
                    <Text style={currentStyles.sectionText}>
                      MathMate respects your privacy. We only process
                      mathematical equations and do not store any personal
                      information. All calculations are performed using OpenAI.
                    </Text>
                  </View>

                  <View style={currentStyles.section}>
                    <Text style={currentStyles.sectionTitle}>
                      Data Collection
                    </Text>
                    <Text style={currentStyles.sectionText}>
                      We collect anonymous usage statistics to improve the app.
                      This includes: • Number of equations solved • Types of
                      equations processed • App performance metrics
                    </Text>
                  </View>

                  <View style={currentStyles.section}>
                    <Text style={currentStyles.sectionTitle}>Security</Text>
                    <Text style={currentStyles.sectionText}>
                      • All data is encrypted in transit • No personal
                      information is stored • Regular security updates • Secure
                      API communications
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={showError}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowError(false)}
      >
        <View style={currentStyles.modalContainer}>
          <View style={[currentStyles.modalContent, { maxWidth: "80%" }]}>
            <View style={currentStyles.modalHeader}>
              <Text style={[currentStyles.modalTitle, { color: "#FF3B30" }]}>
                Error
              </Text>
              <TouchableOpacity
                style={currentStyles.closeButton}
                onPress={() => setShowError(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={currentStyles.errorContent}>
              <Ionicons name="alert-circle" size={48} color="#FF3B30" />
              <Text style={currentStyles.errorMessage}>
                {error?.message || "An unexpected error occurred"}
              </Text>
              {error?.code === "NO_INTERNET" && (
                <Text style={currentStyles.errorSubtext}>
                  Please check your internet connection and try again.
                </Text>
              )}
              {error?.code === "INVALID_API_KEY" && (
                <Text style={currentStyles.errorSubtext}>
                  Please check your API key configuration.
                </Text>
              )}
              {error?.code === "RATE_LIMIT" && (
                <Text style={currentStyles.errorSubtext}>
                  Please wait a moment before trying again.
                </Text>
              )}
              {error?.code === "EXTRACTION_FAILED" && (
                <Text style={currentStyles.errorSubtext}>
                  Please try taking a clearer picture of the equation.
                </Text>
              )}
              {error?.code === "SOLUTION_FAILED" && (
                <Text style={currentStyles.errorSubtext}>
                  We couldn't generate a solution. Please try again.
                </Text>
              )}
              {error?.code === "INVALID_SOLUTION" && (
                <Text style={currentStyles.errorSubtext}>
                  The solution generated was invalid. Please try again.
                </Text>
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
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    height: "100%",
    marginTop: "10%",
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
    width: "100%",
  },
  solutionCard: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: "100%",
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
    width: "100%",
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
    width: "100%",
    height: "100%",
    backgroundColor: "white",
    position: "relative",
  },
  webViewLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  desmosContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "white",
  },
  graphButton: {
    backgroundColor: "#34C759",
  },
  historyScroll: {
    flex: 1,
    width: "100%",
  },
  historyItem: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: "100%",
  },
  historyItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 14,
    color: "#666",
  },
  historyEquation: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    width: "100%",
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 16,
    color: "#666",
  },
  activeTabText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  settingsScroll: {
    flex: 1,
    width: "100%",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  settingLabel: {
    fontSize: 16,
    color: "#333",
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e0e0e0",
    padding: 2,
  },
  toggleActive: {
    backgroundColor: "#007AFF",
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "white",
  },
  toggleCircleActive: {
    transform: [{ translateX: 22 }],
  },
  textSizeOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  textSizeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  textSizeButtonActive: {
    backgroundColor: "#007AFF",
  },
  textSizeButtonText: {
    fontSize: 14,
    color: "#666",
  },
  textSizeButtonTextActive: {
    color: "white",
    fontWeight: "600",
  },
  logoHeader: {
    position: "absolute",
    top: 25,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  logoText: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    letterSpacing: 2,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  modalHeaderButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clearButton: {
    padding: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
  },
  errorContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorMessage: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  errorSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 20,
  },
  bookmarkButton: {
    padding: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
  },
  bookmarkButtonActive: {
    backgroundColor: "#e3f2fd",
  },
  historyItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bookmarkIcon: {
    padding: 4,
  },
});

import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { analyzeAndSolveEquation, MathMateError } from "../utils/openaiHelper";
import MathJax from "react-native-mathjax";
import ErrorModal from "../components/ErrorModal";

interface Step {
  text?: string;
  latex: string;
}

export default function SolverScreen() {
  const [equation, setEquation] = useState<string>("");
  const [solution, setSolution] = useState<Step[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<{ message: string; code: string } | null>(
    null
  );
  const [showError, setShowError] = useState(false);

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

  const handleError = (error: unknown) => {
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
  };

  const handleSolve = async () => {
    if (!equation.trim()) return;

    setIsProcessing(true);
    setError(null);
    setShowError(false);
    try {
      const result = await analyzeAndSolveEquation(equation);
      if (result) {
        setSolution([
          { text: "Original Equation:", latex: result.originalEquation },
          ...result.steps.map((step) => ({ latex: step })),
          { text: "Final Answer:", latex: result.finalAnswer },
        ]);
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter your equation"
          value={equation}
          onChangeText={setEquation}
          multiline
        />
        <TouchableOpacity
          style={[styles.button, isProcessing && styles.buttonDisabled]}
          onPress={handleSolve}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>
            {isProcessing ? "Solving..." : "Solve"}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.solutionContainer}>
        {solution.map((step, index) => (
          <View key={index} style={styles.stepContainer}>
            {step.text && <Text style={styles.stepTitle}>{step.text}</Text>}
            {step.latex && renderLatex(step.latex)}
          </View>
        ))}
      </ScrollView>

      <ErrorModal
        visible={showError}
        onClose={() => setShowError(false)}
        error={error}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  inputContainer: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 15,
    fontSize: 18,
    marginBottom: 15,
    minHeight: 100,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  solutionContainer: {
    flex: 1,
    padding: 20,
  },
  stepContainer: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  stepText: {
    fontSize: 16,
    color: "#666",
  },
});

import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ErrorModalProps {
  visible: boolean;
  onClose: () => void;
  error: {
    message: string;
    code: string;
  } | null;
}

export default function ErrorModal({
  visible,
  onClose,
  error,
}: ErrorModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { maxWidth: "80%" }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: "#FF3B30" }]}>Error</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.errorContent}>
            <Ionicons name="alert-circle" size={48} color="#FF3B30" />
            <Text style={styles.errorMessage}>
              {error?.message || "An unexpected error occurred"}
            </Text>
            {error?.code === "NO_INTERNET" && (
              <Text style={styles.errorSubtext}>
                Please check your internet connection and try again.
              </Text>
            )}
            {error?.code === "INVALID_API_KEY" && (
              <Text style={styles.errorSubtext}>
                Please check your API key configuration.
              </Text>
            )}
            {error?.code === "RATE_LIMIT" && (
              <Text style={styles.errorSubtext}>
                Please wait a moment before trying again.
              </Text>
            )}
            {error?.code === "EXTRACTION_FAILED" && (
              <Text style={styles.errorSubtext}>
                Please try taking a clearer picture of the equation.
              </Text>
            )}
            {error?.code === "SOLUTION_FAILED" && (
              <Text style={styles.errorSubtext}>
                We couldn't generate a solution. Please try again.
              </Text>
            )}
            {error?.code === "INVALID_SOLUTION" && (
              <Text style={styles.errorSubtext}>
                The solution generated was invalid. Please try again.
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  },
  closeButton: {
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
});

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  BackHandler,
  Modal,
  Dimensions,
  Linking,
} from "react-native";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance, { endpoints } from "../../../configs/API";

const { width, height } = Dimensions.get("window");

const Payment = ({ route, navigation }) => {
  const {
    paymentUrl,
    subscriptionId,
    packageName,
    paymentId,
    orderId,
    amount,
    paymentMethod = "vnpay",
    bankCode = null,
  } = route.params;

  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [webViewError, setWebViewError] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [urlChangeCount, setUrlChangeCount] = useState(0);

  useEffect(() => {
    console.log("Payment component initialized with:", {
      paymentId,
      orderId,
      paymentUrl,
      paymentMethod,
      bankCode,
      amount,
    });
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (paymentStatus === "pending") {
          showCancelConfirmation();
          return true;
        }
        return false;
      }
    );

    return () => backHandler.remove();
  }, [paymentStatus]);

  const showCancelConfirmation = () => {
    Alert.alert(
      "Xác nhận hủy thanh toán",
      "Bạn có chắc muốn hủy thanh toán? Giao dịch sẽ không được hoàn thành.",
      [
        { text: "Tiếp tục thanh toán", style: "cancel" },
        {
          text: "Hủy thanh toán",
          style: "destructive",
          onPress: () => handlePaymentCancel(),
        },
      ]
    );
  };

  const handlePaymentCancel = () => {
    setPaymentStatus("cancelled");
    setStatusMessage("Thanh toán đã bị hủy");
    navigation.goBack();
  };

  const handleWebViewNavigationStateChange = (navState) => {
    const { url } = navState;
    console.log(`WebView URL changed (${urlChangeCount + 1}):`, url);
    setUrlChangeCount((prev) => prev + 1);
    // Xử lý riêng cho momo intent://
    if (paymentMethod === "momo" && url.startsWith("intent://")) {
      // Chuyển intent:// thành momo:// để Linking.openURL hoạt động
      let momoUrl = url.replace(/^intent:/, "momo:");
      // Nếu không được thì thử mở intent:// luôn
      Linking.openURL(momoUrl).catch(() => {
        Linking.openURL(url).catch(() => {
          Alert.alert(
            "Không thể mở ứng dụng MoMo",
            "Vui lòng cài đặt ứng dụng MoMo hoặc thử lại sau."
          );
        });
      });
      return false; // Ngăn WebView xử lý tiếp
    }

    // VNPay Error Detection
    const vnpayErrorPatterns = [
      /Error\.html\?code=(\d+)/i,
      /vnp_ResponseCode=(?!00)(\d+)/i,
      /payment.*error/i,
      /error.*payment/i,
      /vnp_TransactionStatus=02/i,
      /resultCode=(?!0)(\d+)/i,
    ];

    const vnpaySuccessPatterns = [
      /vnp_ResponseCode=00/i,
      /vnp_TransactionStatus=00/i,
      /payment.*success/i,
      /success.*payment/i,
      /PaymentReturn.*success/i,
      /resultCode=0/i,
    ];

    // Check for VNPay specific errors
    const errorMatch = vnpayErrorPatterns.find((pattern) => pattern.test(url));
    const successMatch = vnpaySuccessPatterns.find((pattern) =>
      pattern.test(url)
    );

    if (errorMatch) {
      console.log("VNPay error detected from URL:", url);
      const responseCodeMatch = url.match(/vnp_ResponseCode=(\d+)/i);
      const errorCodeMatch = url.match(/code=(\d+)/i);
      const resultCodeMatch = url.match(/resultCode=(\d+)/i);

      let errorMessage = "Thanh toán VNPay không thành công";
      const errorCode =
        responseCodeMatch?.[1] || errorCodeMatch?.[1] || resultCodeMatch?.[1];

      setPaymentStatus("failed");
      setStatusMessage(errorMessage);
      setTimeout(() => {
        if (paymentStatus !== "success") {
          setShowStatusModal(true);
        }
      }, 1000);
      return;
    }

    if (successMatch) {
      console.log("VNPay success detected from URL:", url);
      setPaymentStatus("success");
      setStatusMessage("Thanh toán VNPay thành công!");
      setTimeout(() => {
        setShowStatusModal(true);
      }, 1000);
      return;
    }

    // Handle return URLs
    if (
      url.includes("return") ||
      url.includes("callback") ||
      url.includes("vnpay_return")
    ) {
      console.log("VNPay return/callback URL detected");
      setTimeout(() => {
        navigation.navigate("Packages", { refresh: true });
      }, 2000);
    }
  };

  const handleWebViewError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error("WebView error:", nativeEvent);

    setWebViewError(true);
    setLoading(false);

    Alert.alert(
      "Lỗi tải trang thanh toán",
      "Không thể tải trang thanh toán. Vui lòng kiểm tra kết nối mạng và thử lại.",
      [
        {
          text: "Thử lại",
          onPress: () => {
            setWebViewError(false);
            setLoading(true);
            setUrlChangeCount(0);
          },
        },
        {
          text: "Hủy",
          style: "cancel",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const getPaymentMethodDisplayName = () => {
    return bankCode ? `VNPay - ${bankCode}` : "VNPay";
  };

  const PaymentInfo = () => (
    <View style={styles.paymentInfo}>
      <Text style={styles.infoTitle}>Thông tin thanh toán</Text>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Gói tập:</Text>
        <Text style={styles.infoValue}>{packageName}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Số tiền:</Text>
        <Text style={styles.infoValue}>
          {amount?.toLocaleString("vi-VN")} VND
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Mã đơn hàng:</Text>
        <Text style={styles.infoValue}>{orderId || paymentId}</Text>
      </View>
      {paymentDetails?.transaction_id && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mã giao dịch:</Text>
          <Text style={styles.infoValue}>{paymentDetails.transaction_id}</Text>
        </View>
      )}
      {paymentDetails?.bank_code && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ngân hàng:</Text>
          <Text style={styles.infoValue}>{paymentDetails.bank_code}</Text>
        </View>
      )}
    </View>
  );

  const StatusModal = () => (
    <Modal
      visible={showStatusModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowStatusModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text
            style={[
              styles.modalTitle,
              paymentStatus === "success"
                ? styles.successText
                : styles.errorText,
            ]}
          >
            {paymentStatus === "success" ? "✅" : "❌"}
          </Text>
          <Text style={styles.modalMessage}>{statusMessage}</Text>
          <PaymentInfo />

          {paymentStatus === "success" && paymentDetails && (
            <View style={styles.successDetails}>
              <Text style={styles.successDetailsTitle}>
                Chi tiết giao dịch VNPay
              </Text>
              {paymentDetails.payment_date && (
                <Text style={styles.successDetailsText}>
                  Thời gian:{" "}
                  {new Date(paymentDetails.payment_date).toLocaleString(
                    "vi-VN"
                  )}
                </Text>
              )}
              {paymentDetails.transaction_id && (
                <Text style={styles.successDetailsText}>
                  Mã GD: {paymentDetails.transaction_id}
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.modalButton,
              paymentStatus === "success"
                ? styles.successButton
                : styles.errorButton,
            ]}
            onPress={() => {
              setShowStatusModal(false);
              if (paymentStatus === "success") {
                navigation.navigate("Packages", { refresh: true });
              } else {
                navigation.goBack();
              }
            }}
          >
            <Text style={styles.modalButtonText}>
              {paymentStatus === "success" ? "Tiếp tục" : "Thử lại"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (webViewError) {
    return (
      <View style={styles.container}>
        <PaymentInfo />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>❌ Lỗi tải trang VNPay</Text>
          <Text style={styles.errorMessage}>
            Không thể tải trang thanh toán VNPay. Vui lòng kiểm tra kết nối
            mạng.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setWebViewError(false);
              setLoading(true);
              setUrlChangeCount(0);
            }}
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PaymentInfo />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a73e8" />
          <Text style={styles.loadingText}>
            Đang tải trang thanh toán VNPay...
          </Text>
        </View>
      )}

      <WebView
        source={{ uri: paymentUrl }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleWebViewNavigationStateChange}
        onError={handleWebViewError}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsBackForwardNavigationGestures={false}
        userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
        mixedContentMode="compatibility"
        allowsInlineMediaPlaybook={true}
        mediaPlaybackRequiresUserAction={false}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        allowsLinkPreview={false}
        originWhitelist={["*"]}
        allowsFullscreenVideo={false}
        bounces={false}
        scrollEnabled={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton]}
          onPress={showCancelConfirmation}
        >
          <Text style={styles.cancelButtonText}>Hủy thanh toán</Text>
        </TouchableOpacity>
      </View>

      <StatusModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  paymentInfo: {
    backgroundColor: "#fff",
    padding: 16,
    margin: 8,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    textAlign: "right",
  },
  webview: {
    flex: 1,
    margin: 8,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  actionContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    elevation: 5,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: "#f44336",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#f44336",
    marginBottom: 16,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: "#1a73e8",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    maxWidth: width * 0.9,
  },
  modalTitle: {
    fontSize: 48,
    marginBottom: 16,
  },
  modalMessage: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  successDetails: {
    backgroundColor: "#f0f7ff",
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
    width: "100%",
  },
  successDetailsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a73e8",
    marginBottom: 8,
    textAlign: "center",
  },
  successDetailsText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginBottom: 4,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 16,
    minWidth: 120,
  },
  successButton: {
    backgroundColor: "#4CAF50",
  },
  errorButton: {
    backgroundColor: "#f44336",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  successText: {
    color: "#4CAF50",
  },
  errorText: {
    color: "#f44336",
  },
});

export default Payment;

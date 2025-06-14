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
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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

  // Hàm xử lý thanh toán thành công
  const handlePaymentSuccess = async (transactionData = {}) => {
    try {
      setIsProcessingPayment(true);
      setPaymentStatus("success");

      // Lưu thông tin giao dịch
      const successDetails = {
        orderId: orderId || paymentId,
        amount: amount,
        paymentMethod: getPaymentMethodDisplayName(),
        transactionId: transactionData.transactionId || null,
        paymentDate: new Date().toISOString(),
        ...transactionData,
      };

      setPaymentDetails(successDetails);
      setStatusMessage("🎉 Thanh toán thành công!");

      // Hiển thị modal thành công
      setShowStatusModal(true);

      // Tự động đóng modal và chuyển trang sau 3 giây
      setTimeout(() => {
        handleNavigateBack();
      }, 3000);
    } catch (error) {
      console.error("Error handling payment success:", error);
      setPaymentStatus("failed");
      setStatusMessage("Có lỗi xảy ra khi xử lý kết quả thanh toán");
      setShowStatusModal(true);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Hàm xử lý thanh toán thất bại
  const handlePaymentFailure = (errorCode, errorMessage) => {
    setIsProcessingPayment(true);
    setPaymentStatus("failed");
    setStatusMessage(
      errorMessage || `Thanh toán thất bại: ${getVNPayErrorMessage(errorCode)}`
    );
    setShowStatusModal(true);
    setIsProcessingPayment(false);
  };

  // Hàm điều hướng trở về trang trước
  const handleNavigateBack = () => {
    setShowStatusModal(false);

    if (paymentStatus === "success") {
      // Chuyển về trang Packages với flag refresh
      navigation.navigate("Packages", {
        refresh: true,
        paymentSuccess: true,
        subscriptionId: subscriptionId,
      });
    } else {
      // Trở về trang trước
      navigation.goBack();
    }
  };

  const getVNPayErrorMessage = (errorCode) => {
    const errorMessages = {
      "00": "Giao dịch thành công",
      "07": "Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).",
      "09": "Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.",
      10: "Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần",
      11: "Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.",
      12: "Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.",
      13: "Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP). Xin quý khách vui lòng thực hiện lại giao dịch.",
      24: "Giao dịch không thành công do: Khách hàng hủy giao dịch",
      51: "Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.",
      65: "Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.",
      75: "Ngân hàng thanh toán đang bảo trì.",
      79: "Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định. Xin quý khách vui lòng thực hiện lại giao dịch",
      99: "Các lỗi khác (lỗi kết nối, lỗi dữ liệu)",
    };
    return errorMessages[errorCode] || "Lỗi không xác định";
  };

  const handleWebViewNavigationStateChange = (navState) => {
    const { url } = navState;
    console.log(`WebView URL changed (${urlChangeCount + 1}):`, url);
    setUrlChangeCount((prev) => prev + 1);

    // Ngăn xử lý duplicate khi đang process
    if (isProcessingPayment) {
      console.log("Already processing payment, skipping URL change");
      return;
    }

    // Xử lý riêng cho momo intent://
    if (paymentMethod === "momo" && url.startsWith("intent://")) {
      let momoUrl = url.replace(/^intent:/, "momo:");
      Linking.openURL(momoUrl).catch(() => {
        Linking.openURL(url).catch(() => {
          Alert.alert(
            "Không thể mở ứng dụng MoMo",
            "Vui lòng cài đặt ứng dụng MoMo hoặc thử lại sau."
          );
        });
      });
      return false;
    }

    // Chỉ xử lý VNPay khi có return URL hoặc error page
    if (!url.includes("vnpayment.vn")) {
      return;
    }

    // VNPay Error Detection
    if (url.includes("Payment/Error.html")) {
      const errorCodeMatch = url.match(/code=(\d+)/i);
      const errorCode = errorCodeMatch?.[1] || "99";

      console.log("VNPay Error Page detected:", { url, errorCode });

      setTimeout(() => {
        if (paymentStatus === "pending") {
          handlePaymentFailure(errorCode);
        }
      }, 2000);
      return;
    }

    // VNPay Success Detection
    const vnpaySuccessPatterns = [
      /vnp_ResponseCode=00/i,
      /vnp_TransactionStatus=00/i,
      /payment.*success/i,
      /success.*payment/i,
      /PaymentReturn.*success/i,
      /resultCode=0/i,
    ];

    const successMatch = vnpaySuccessPatterns.find((pattern) =>
      pattern.test(url)
    );
    if (successMatch) {
      console.log("VNPay success detected from URL:", url);

      // Parse thông tin giao dịch từ URL
      const urlParams = new URLSearchParams(url.split("?")[1] || "");
      const transactionData = {
        transactionId:
          urlParams.get("vnp_TransactionNo") || urlParams.get("vnp_TxnRef"),
        bankCode: urlParams.get("vnp_BankCode"),
        paymentDate: urlParams.get("vnp_PayDate"),
        amount: urlParams.get("vnp_Amount"),
        responseCode: urlParams.get("vnp_ResponseCode"),
      };

      handlePaymentSuccess(transactionData);
      return;
    }

    // Handle return URLs - Cải thiện xử lý callback
    if (url.includes("return") || url.includes("callback")) {
      console.log("VNPay return/callback URL detected");

      const urlParams = new URLSearchParams(url.split("?")[1] || "");
      const responseCode = urlParams.get("vnp_ResponseCode");
      const transactionStatus = urlParams.get("vnp_TransactionStatus");

      if (responseCode === "00" || transactionStatus === "00") {
        const transactionData = {
          transactionId:
            urlParams.get("vnp_TransactionNo") || urlParams.get("vnp_TxnRef"),
          bankCode: urlParams.get("vnp_BankCode"),
          paymentDate: urlParams.get("vnp_PayDate"),
          responseCode: responseCode,
        };

        handlePaymentSuccess(transactionData);
      } else if (responseCode && responseCode !== "00") {
        handlePaymentFailure(responseCode);
      }
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
            setIsProcessingPayment(false);
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
        <Text style={styles.infoLabel}>Phương thức:</Text>
        <Text style={styles.infoValue}>{getPaymentMethodDisplayName()}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Mã đơn hàng:</Text>
        <Text style={styles.infoValue}>{orderId || paymentId}</Text>
      </View>
      {paymentDetails?.transactionId && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mã giao dịch:</Text>
          <Text style={styles.infoValue}>{paymentDetails.transactionId}</Text>
        </View>
      )}
      {paymentDetails?.bankCode && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ngân hàng:</Text>
          <Text style={styles.infoValue}>{paymentDetails.bankCode}</Text>
        </View>
      )}
    </View>
  );

  const StatusModal = () => (
    <Modal
      visible={showStatusModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowStatusModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalIconContainer}>
            <Text
              style={[
                styles.modalIcon,
                paymentStatus === "success"
                  ? styles.successIcon
                  : styles.errorIcon,
              ]}
            >
              {paymentStatus === "success" ? "✅" : "❌"}
            </Text>
          </View>

          <Text
            style={[
              styles.modalTitle,
              paymentStatus === "success"
                ? styles.successText
                : styles.errorText,
            ]}
          >
            {paymentStatus === "success"
              ? "Thanh toán thành công!"
              : "Thanh toán thất bại"}
          </Text>

          <Text style={styles.modalMessage}>{statusMessage}</Text>

          <PaymentInfo />

          {paymentStatus === "success" && paymentDetails && (
            <View style={styles.successDetails}>
              <Text style={styles.successDetailsTitle}>Chi tiết giao dịch</Text>
              {paymentDetails.paymentDate && (
                <Text style={styles.successDetailsText}>
                  Thời gian:{" "}
                  {new Date(paymentDetails.paymentDate).toLocaleString("vi-VN")}
                </Text>
              )}
              {paymentDetails.transactionId && (
                <Text style={styles.successDetailsText}>
                  Mã GD: {paymentDetails.transactionId}
                </Text>
              )}
              {paymentDetails.bankCode && (
                <Text style={styles.successDetailsText}>
                  Ngân hàng: {paymentDetails.bankCode}
                </Text>
              )}
            </View>
          )}

          {paymentStatus === "success" && (
            <Text style={styles.autoCloseText}>
              Tự động chuyển trang sau 3 giây...
            </Text>
          )}

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[
                styles.modalButton,
                paymentStatus === "success"
                  ? styles.successButton
                  : styles.errorButton,
              ]}
              onPress={handleNavigateBack}
            >
              <Text style={styles.modalButtonText}>
                {paymentStatus === "success" ? "Tiếp tục" : "Thử lại"}
              </Text>
            </TouchableOpacity>
          </View>
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
              setIsProcessingPayment(false);
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
          <Text style={styles.loadingSubText}>
            Vui lòng chờ trong giây lát...
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
          disabled={isProcessingPayment}
        >
          <Text style={styles.cancelButtonText}>
            {isProcessingPayment ? "Đang xử lý..." : "Hủy thanh toán"}
          </Text>
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
    fontWeight: "600",
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 14,
    color: "#999",
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
    minWidth: width * 0.8,
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalIcon: {
    fontSize: 60,
    textAlign: "center",
  },
  successIcon: {
    color: "#4CAF50",
  },
  errorIcon: {
    color: "#f44336",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  successDetails: {
    backgroundColor: "#f0f7ff",
    padding: 16,
    borderRadius: 8,
    marginVertical: 12,
    width: "100%",
  },
  successDetailsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a73e8",
    marginBottom: 8,
    textAlign: "center",
  },
  successDetailsText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 4,
  },
  autoCloseText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  modalButtonContainer: {
    marginTop: 20,
    width: "100%",
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 120,
    width: "100%",
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

// Sửa PaymentMethodModal - Payment.js

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";

const { width } = Dimensions.get("window");

const PaymentMethodModal = ({
  visible,
  onClose,
  onSelectPayment,
  packageInfo,
}) => {
  const [selectedMethod, setSelectedMethod] = useState("momo");
  const [selectedBank, setSelectedBank] = useState("ALL"); // *** SỬA: Mặc định là "ALL" ***

  const paymentMethods = [
    {
      id: "momo",
      name: "MoMo",
      description: "Ví điện tử MoMo",
      icon: "💳",
      color: "#D82D8B",
    },
    {
      id: "vnpay",
      name: "VNPay",
      description: "Thanh toán qua VNPay",
      icon: "🏦",
      color: "#0066CC",
    },
  ];

  const popularBanks = [
    { code: "VIETCOMBANK", name: "Vietcombank", color: "#007A33" },
    { code: "TECHCOMBANK", name: "Techcombank", color: "#FF6B35" },
    { code: "BIDV", name: "BIDV", color: "#1E4A8C" },
    { code: "AGRIBANK", name: "Agribank", color: "#00A651" },
    { code: "MBBANK", name: "MB Bank", color: "#FF6B00" },
    { code: "ACB", name: "ACB", color: "#1BA1E2" },
    { code: "VIETINBANK", name: "VietinBank", color: "#E30613" },
    { code: "SACOMBANK", name: "Sacombank", color: "#0066CC" },
  ];

  const handleConfirmPayment = () => {
    // *** SỬA: Logic xử lý chọn bank cho VNPay ***
    let bankCode = null;

    if (selectedMethod === "vnpay") {
      // Nếu chọn "ALL" thì không truyền bankCode (để người dùng chọn trên trang VNPay)
      // Nếu chọn ngân hàng cụ thể thì truyền bankCode
      bankCode = selectedBank === "ALL" ? null : selectedBank;
    }

    onSelectPayment({
      method: selectedMethod,
      bankCode: bankCode,
    });
  };

  // *** SỬA: Reset selectedBank khi chuyển method ***
  const handleMethodChange = (methodId) => {
    setSelectedMethod(methodId);
    if (methodId === "vnpay") {
      setSelectedBank("ALL"); // Mặc định chọn "Tất cả ngân hàng"
    } else {
      setSelectedBank("ALL");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chọn phương thức thanh toán</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Package Info */}
            <View style={styles.packageInfo}>
              <Text style={styles.packageName}>{packageInfo?.name}</Text>
              <Text style={styles.packagePrice}>
                {packageInfo?.price?.toLocaleString("vi-VN")} VND
              </Text>
            </View>

            {/* Payment Methods */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethodItem,
                    selectedMethod === method.id &&
                      styles.selectedPaymentMethod,
                  ]}
                  onPress={() => handleMethodChange(method.id)}
                >
                  <View style={styles.methodContent}>
                    <View style={styles.methodIcon}>
                      <Text style={styles.iconText}>{method.icon}</Text>
                    </View>
                    <View style={styles.methodInfo}>
                      <Text style={styles.methodName}>{method.name}</Text>
                      <Text style={styles.methodDescription}>
                        {method.description}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.radioButton,
                      selectedMethod === method.id && styles.selectedRadio,
                      { borderColor: method.color },
                    ]}
                  >
                    {selectedMethod === method.id && (
                      <View
                        style={[
                          styles.radioButtonInner,
                          { backgroundColor: method.color },
                        ]}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Bank Selection for VNPay */}
            {selectedMethod === "vnpay" && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Chọn ngân hàng</Text>

                {/* *** SỬA: Đặt option "Tất cả ngân hàng" lên đầu *** */}
                <TouchableOpacity
                  style={[
                    styles.bankItem,
                    styles.noBankOption,
                    selectedBank === "ALL" && styles.selectedBank,
                  ]}
                  onPress={() => setSelectedBank("ALL")}
                >
                  <Text style={styles.bankName}>Tất cả ngân hàng</Text>
                  <Text style={styles.noBankText}>
                    Chọn ngân hàng trên trang thanh toán VNPay
                  </Text>
                  {selectedBank === "ALL" && (
                    <View
                      style={[
                        styles.bankSelectedIndicator,
                        { backgroundColor: "#0066CC" },
                      ]}
                    >
                      <Text style={styles.bankSelectedText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.bankGrid}>
                  {popularBanks.map((bank) => (
                    <TouchableOpacity
                      key={bank.code}
                      style={[
                        styles.bankItem,
                        selectedBank === bank.code && styles.selectedBank,
                        { borderColor: bank.color },
                      ]}
                      onPress={() => setSelectedBank(bank.code)}
                    >
                      <Text style={styles.bankName}>{bank.name}</Text>
                      {selectedBank === bank.code && (
                        <View
                          style={[
                            styles.bankSelectedIndicator,
                            { backgroundColor: bank.color },
                          ]}
                        >
                          <Text style={styles.bankSelectedText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Payment Info */}
            <View style={styles.paymentSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Phương thức:</Text>
                <Text style={styles.summaryValue}>
                  {paymentMethods.find((m) => m.id === selectedMethod)?.name}
                  {selectedMethod === "vnpay" &&
                    selectedBank &&
                    selectedBank !== "ALL" &&
                    ` - ${
                      popularBanks.find((b) => b.code === selectedBank)?.name ||
                      selectedBank
                    }`}
                  {selectedMethod === "vnpay" &&
                    selectedBank === "ALL" &&
                    ` - Tất cả ngân hàng`}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tổng thanh toán:</Text>
                <Text style={styles.summaryAmount}>
                  {packageInfo?.price?.toLocaleString("vi-VN")} VND
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                {
                  backgroundColor: paymentMethods.find(
                    (m) => m.id === selectedMethod
                  )?.color,
                },
              ]}
              onPress={handleConfirmPayment}
            >
              <Text style={styles.confirmButtonText}>Thanh toán</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Styles giữ nguyên như cũ
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    color: "#666",
  },
  packageInfo: {
    padding: 20,
    backgroundColor: "#f8f9fa",
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  packageName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a73e8",
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },
  paymentMethodItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  selectedPaymentMethod: {
    borderColor: "#1a73e8",
    backgroundColor: "#f0f7ff",
  },
  methodContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  methodDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedRadio: {
    borderColor: "#1a73e8",
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  bankGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  bankItem: {
    width: (width - 60) / 2 - 5,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#fff",
    position: "relative",
    minHeight: 60,
    justifyContent: "center",
  },
  selectedBank: {
    borderColor: "#1a73e8",
    backgroundColor: "#f0f7ff",
  },
  bankName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  noBankOption: {
    width: width - 60,
    marginBottom: 15,
  },
  noBankText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
  },
  bankSelectedIndicator: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1a73e8",
    justifyContent: "center",
    alignItems: "center",
  },
  bankSelectedText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  paymentSummary: {
    margin: 20,
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a73e8",
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "center",
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});

export default PaymentMethodModal;

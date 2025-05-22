import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { styles } from "./Styles"; // Đảm bảo import styles từ file styles.js
import CurrentPackage from "./CurrentPackage";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
const CurrentPackageView = ({
  isLoggedIn,
  userPackage,
  handleViewDetails,
  navigation,
}) => {
  // Nếu chưa đăng nhập, không hiển thị gì cả
  if (!isLoggedIn) {
    return null;
  }

  // Nếu không có gói đang sử dụng
  if (!userPackage) {
    return (
      <View style={[styles.packageCard, styles.centerContent]}>
        <Text style={{ fontSize: 16, marginBottom: 12 }}>
          Bạn chưa đăng ký gói tập nào
        </Text>
      </View>
    );
  }

  const navigateToHistory = () => {
    navigation.navigate("SubscriptionHistory", {
      isLoggedIn,
      userPackage,
      handleViewDetails,
    });
  };

  return (
    <View style={styles.currentPackageContainer}>
      <View style={styles.subscriptionHeader}>
        <Text style={styles.historyTitle}>
          {" "}
          <Icon name="medal-outline" size={20} color="#333" />
          Gói tập hiện tại
        </Text>

        <TouchableOpacity
          style={styles.viewHistoryButton}
          onPress={navigateToHistory}
        >
          <Icon
            name="history"
            size={16}
            color="#1a73e8"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.viewHistoryButtonText}>Xem lịch sử </Text>
        </TouchableOpacity>
      </View>

      {/* Hiển thị gói đang hoạt động */}
      <CurrentPackage
        userPackage={userPackage}
        handleViewDetails={handleViewDetails}
      />
    </View>
  );
};

export default CurrentPackageView;

import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert, // Thêm import Alert
} from "react-native";
import { styles } from "./Styles";
import CurrentPackage from "./CurrentPackage";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance, { endpoints } from "../../../configs/API";

const SubscriptionHistoryScreen = ({ route, navigation }) => {
  // Lấy các props từ route.params nếu có
  const { isLoggedIn, userPackage, handleViewDetails, handleRegister } =
    route.params || {};

  // State for subscription history
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState(null);
  const [loading, setLoading] = useState(false); // Thêm state loading
  const [subscriptionPagination, setSubscriptionPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    currentPage: 1,
  });

  // Định nghĩa hàm fetchSubscription bên trong component
  const fetchSubscription = async (page = 1) => {
    try {
      setSubscriptionLoading(true);
      setSubscriptionError(null);

      // Lấy access token từ AsyncStorage
      const accessToken = await AsyncStorage.getItem("accessToken");
      console.log("Access Token for subscription history:", accessToken);

      if (!accessToken) {
        console.log("No access token found for subscription history");
        throw new Error("Không tìm thấy token đăng nhập");
      }

      // Xây dựng URL với phân trang
      const url = `${endpoints.subscription}my/?page=${page}`;
      console.log("History URL for subscription:", url);

      const response = await axiosInstance.get(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log("History data for subscription:", response.data);
      console.log("Subscription history API response:", response.status);

      // Kiểm tra xem response.data có đúng định dạng không
      if (
        response.data &&
        response.data.results &&
        Array.isArray(response.data.results)
      ) {
        // Lưu thông tin phân trang
        setSubscriptionPagination({
          count: response.data.count,
          next: response.data.next,
          previous: response.data.previous,
          currentPage: page,
        });

        // Lưu danh sách subscription
        setSubscriptionHistory(response.data.results);
      } else {
        console.log("Invalid subscription data format:", response.data);
        setSubscriptionHistory([]);
      }

      setSubscriptionLoading(false);
    } catch (error) {
      console.error("Error fetching subscription history:", error);
      console.log(
        "Error details:",
        error.response ? error.response.data : "No response data"
      );
      setSubscriptionError("Không thể tải dữ liệu gói tập");
      setSubscriptionLoading(false);
      setSubscriptionHistory([]);
    }
  };
  
  const handleConfirmPayment = async (subscriptionId) => {
    try {
      Alert.alert(
        "Xác nhận thanh toán",
        "Bạn có muốn tiến hành thanh toán gói tập này?",
        [
          {
            text: "Hủy",
            style: "cancel",
          },
          {
            text: "Thanh toán",
            onPress: async () => {
              try {
                setLoading(true);

                // Lấy access token từ AsyncStorage
                const accessToken = await AsyncStorage.getItem("accessToken");
                if (!accessToken) {
                  throw new Error("Không tìm thấy token đăng nhập");
                }

                // Gọi API xác nhận thanh toán
                const paymentUrl = endpoints.verifyPayment.replace(
                  "{subscriptionId}",
                  subscriptionId
                );
                console.log("Payment verification URL:", paymentUrl);

                const response = await axiosInstance.post(
                  paymentUrl,
                  {},
                  {
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                    },
                  }
                );

                console.log("Payment verification response:", response.data);

                // Hiển thị thông báo thành công
                Alert.alert(
                  "Thanh toán thành công",
                  "Bạn đã thanh toán gói tập thành công!",
                  [
                    {
                      text: "OK",
                      onPress: () => {
                        // Cập nhật lại danh sách subscription
                        fetchSubscription(subscriptionPagination.currentPage);
                      },
                    },
                  ]
                );
              } catch (error) {
                console.error("Error confirming payment:", error);

                let errorMessage =
                  "Không thể xác nhận thanh toán. Vui lòng thử lại sau.";
                if (error.response && error.response.data) {
                  if (error.response.data.detail) {
                    errorMessage = error.response.data.detail;
                  } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                  }
                }

                Alert.alert("Lỗi thanh toán", errorMessage);
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error in payment process:", error);
      Alert.alert("Lỗi", "Đã xảy ra lỗi không xác định");
    }
  };

  const handleCancelSubscription = async (subscriptionId) => {
    try {
      console.log("handleCancelSubscription called with ID:", subscriptionId); // Thêm log để debug
      
      Alert.alert(
        "Xác nhận hủy gói tập",
        "Bạn có chắc chắn muốn hủy gói tập này không?",
        [
          {
            text: "Không",
            style: "cancel",
          },
          {
            text: "Có, hủy gói tập",
            style: "destructive",
            onPress: async () => {
              try {
                setLoading(true);

                // Lấy access token từ AsyncStorage
                const accessToken = await AsyncStorage.getItem("accessToken");
                if (!accessToken) {
                  throw new Error("Không tìm thấy token đăng nhập");
                }

                // Gọi API hủy subscription
                // Đảm bảo endpoint có định dạng đúng với API
                const cancelUrl = `${endpoints.subscription}${subscriptionId}/cancel/`;
                console.log("Canceling subscription at URL:", cancelUrl);

                const response = await axiosInstance.post(
                  cancelUrl,
                  {},
                  {
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                    },
                  }
                );

                console.log("Cancel response:", response.data);

                // Hiển thị thông báo thành công
                Alert.alert("Thành công", "Bạn đã hủy gói tập thành công", [
                  { 
                    text: "OK",
                    onPress: () => {
                      // Cập nhật lại danh sách subscription sau khi hủy thành công
                      fetchSubscription(subscriptionPagination.currentPage);
                    }
                  },
                ]);
              } catch (error) {
                console.error("Error canceling subscription:", error);

                let errorMessage =
                  "Không thể hủy gói tập. Vui lòng thử lại sau.";
                if (error.response && error.response.data) {
                  if (error.response.data.detail) {
                    errorMessage = error.response.data.detail;
                  } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                  }
                }

                Alert.alert("Lỗi", errorMessage);
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error in cancel process:", error);
      Alert.alert("Lỗi", "Đã xảy ra lỗi không xác định");
    }
  };

  // Fetch subscription history when component mounts
  useEffect(() => {
    if (isLoggedIn) {
      fetchSubscription(1);
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.packageCard, styles.centerContent]}>
          <Icon name="account-lock" size={60} color="#ccc" />
          <Text
            style={{
              fontSize: 18,
              fontWeight: "500",
              marginTop: 15,
              textAlign: "center",
            }}
          >
            Vui lòng đăng nhập để xem lịch sử gói tập
          </Text>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.primaryButton,
              { marginTop: 20 },
            ]}
            onPress={() => navigation.navigate("login")}
          >
            <Text style={styles.primaryButtonText}>Đăng nhập ngay</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "#4CAF50";
      case "pending":
        return "#FF9800";
      case "expired":
        return "#9E9E9E";
      case "cancelled":
        return "#F44336";
      default:
        return "#757575";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active":
        return "Đang hoạt động";
      case "pending":
        return "Chờ xác nhận";
      case "expired":
        return "Hết hạn";
      case "cancelled":
        return "Đã hủy";
      default:
        return "Không xác định";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return "check-circle";
      case "pending":
        return "clock-outline";
      case "expired":
        return "calendar-remove";
      case "cancelled":
        return "close-circle";
      default:
        return "help-circle";
    }
  };

  const renderActionButton = (item) => {
    if (item.status === "active") {
      return (
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.outlineButton,
              { borderColor: "#F44336", marginRight: 10 },
            ]}
            onPress={() => {
              console.log("Cancel button pressed for item:", item.id); // Thêm log để debug
              handleCancelSubscription(item.id);
            }}
          >
            <Text style={[styles.outlineButtonText, { color: "#F44336" }]}>
              Hủy
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.primaryButton,
              { backgroundColor: "#1a73e8" },
            ]}
            onPress={() => handleViewDetails(item.package.id)}
          >
            <Text style={styles.primaryButtonText}>Xem chi tiết</Text>
          </TouchableOpacity>
        </View>
      );
    }
    // Thêm các hàm xử lý hành động gói tập

    if (item.status === "pending") {
      return (
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.primaryButton,
              { backgroundColor: "#1a73e8" },
            ]}
            onPress={() => handleViewDetails(item.package.id)}
          >
            <Text style={styles.primaryButtonText}>Xem chi tiết</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.primaryButton,
              { backgroundColor: "#4CAF50" },
            ]}
            onPress={() => handleConfirmPayment(item.id)}
          >
            <Text style={styles.primaryButtonText}>Thanh toán</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.actionButtonContainer}>
        {/* <TouchableOpacity
          style={[
            styles.actionButton,
            styles.primaryButton,
            { backgroundColor: "#2196F3" },
          ]}
          onPress={() => handleRegister(item.package.id, item.package_name)}
        >
          <Text style={styles.primaryButtonText}>Đăng ký lại</Text>
        </TouchableOpacity> */}
      </View>
    );
  };

  const renderSubscriptionItem = (item) => (
    <View
      style={[
        styles.subscriptionItem,
        { borderLeftWidth: 4, borderLeftColor: getStatusColor(item.status) },
      ]}
      key={item.id}
    >
      <View
        style={[
          styles.activePackageBadge,
          { backgroundColor: getStatusColor(item.status) },
        ]}
      >
        <Icon
          name={getStatusIcon(item.status)}
          size={14}
          color="#fff"
          style={{ marginRight: 4 }}
        />
        <Text style={styles.activePackageBadgeText}>
          {getStatusText(item.status)}
        </Text>
      </View>

      <View style={styles.subscriptionHeader}>
        <Text style={styles.packageName}>{item.package_name}</Text>
      </View>

      <View style={styles.packageDetails}>
        <View style={styles.packageDetail}>
          <Text style={styles.detailLabel}>
            <Icon name="cash" size={16} color="#666" /> Giá:
          </Text>
          <Text style={[styles.detailValue, { color: "#EF6C00" }]}>
            {parseFloat(
              item.discounted_price || item.original_price
            ).toLocaleString("vi-VN")}
            đ
          </Text>
        </View>
        <View style={styles.packageDetail}>
          <Text style={styles.detailLabel}>
            <Icon name="calendar-month" size={16} color="#666" /> Thời hạn:
          </Text>
          <Text style={styles.detailValue}>
            {item.package.package_type.duration_months} tháng
          </Text>
        </View>
        <View style={styles.packageDetail}>
          <Text style={styles.detailLabel}>
            <Icon name="account-tie" size={16} color="#666" /> PT còn lại:
          </Text>
          <Text style={styles.detailValue}>
            {item.remaining_pt_sessions} buổi
          </Text>
        </View>
        <View style={styles.packageDetail}>
          <Text style={styles.detailLabel}>
            <Icon name="clock-outline" size={16} color="#666" /> Thời gian:
          </Text>
          <Text style={styles.detailValue}>
            {new Date(item.start_date).toLocaleDateString("vi-VN")} -{" "}
            {new Date(item.end_date).toLocaleDateString("vi-VN")}
          </Text>
        </View>
        {item.status === "active" && (
          <View style={styles.packageDetail}>
            <Text style={styles.detailLabel}>
              <Icon name="timer-sand" size={16} color="#666" /> Còn lại:
            </Text>
            <Text
              style={[
                styles.detailValue,
                { color: "#4CAF50", fontWeight: "bold" },
              ]}
            >
              {item.remaining_days} ngày
            </Text>
          </View>
        )}
      </View>

      {renderActionButton(item)}
    </View>
  );

  const renderPagination = () => (
    <View style={styles.paginationContainer}>
      <TouchableOpacity
        style={[
          styles.paginationButton,
          !subscriptionPagination.previous && styles.paginationButtonDisabled,
        ]}
        onPress={() =>
          fetchSubscription(subscriptionPagination.currentPage - 1)
        }
        disabled={!subscriptionPagination.previous}
      >
        <Icon name="chevron-left" size={16} color="#fff" />
        <Text style={styles.paginationButtonText}> Trang trước</Text>
      </TouchableOpacity>

      <Text style={styles.paginationInfo}>
        Trang {subscriptionPagination.currentPage} /
        {Math.ceil(
          subscriptionPagination.count / (subscriptionHistory.length || 1)
        )}
      </Text>

      <TouchableOpacity
        style={[
          styles.paginationButton,
          !subscriptionPagination.next && styles.paginationButtonDisabled,
        ]}
        onPress={() =>
          fetchSubscription(subscriptionPagination.currentPage + 1)
        }
        disabled={!subscriptionPagination.next}
      >
        <Text style={styles.paginationButtonText}>Trang sau </Text>
        <Icon name="chevron-right" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1a73e8" barStyle="light-content" />
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#1a73e8" />
          <Text style={styles.overlayText}>Đang xử lý...</Text>
        </View>
      )}
      <ScrollView
        style={styles.historyContainer}
        contentContainerStyle={{ padding: 15 }}
      >
        {/* Gói tập hiện tại */}
        {userPackage && (
          <>
            <Text style={[styles.historyTitle, { marginTop: 5 }]}>
              <Icon name="package-variant" size={20} color="#333" /> Gói tập
              hiện tại
            </Text>
            <CurrentPackage
              userPackage={userPackage}
              handleViewDetails={handleViewDetails}
            />
          </>
        )}

        <Text style={styles.historyTitle}>
          <Icon name="history" size={20} color="#333" /> Lịch sử gói tập
        </Text>

        {subscriptionError && (
          <View style={[styles.packageCard, styles.centerContent]}>
            <Icon name="alert-circle-outline" size={40} color="#F44336" />
            <Text style={[styles.errorText, { marginTop: 10 }]}>
              {subscriptionError}
            </Text>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.primaryButton,
                { marginTop: 15 },
              ]}
              onPress={() => fetchSubscription(1)}
            >
              <Text style={styles.primaryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        )}

        {subscriptionLoading && subscriptionPagination.currentPage === 1 ? (
          <View style={[styles.packageCard, styles.centerContent]}>
            <ActivityIndicator size="large" color="#1a73e8" />
            <Text style={{ marginTop: 15, color: "#666" }}>
              Đang tải lịch sử gói tập...
            </Text>
          </View>
        ) : subscriptionHistory.length === 0 ? (
          <View style={[styles.packageCard, styles.centerContent]}>
            <Icon name="package-variant-closed" size={60} color="#ccc" />
            <Text style={{ fontSize: 16, marginTop: 15 }}>
              Bạn chưa có lịch sử đăng ký gói tập
            </Text>
          </View>
        ) : (
          <>
            {subscriptionHistory.map(renderSubscriptionItem)}
            {renderPagination()}
          </>
        )}

        {subscriptionLoading && subscriptionPagination.currentPage > 1 && (
          <View style={styles.loadingMoreContainer}>
            <ActivityIndicator size="small" color="#1a73e8" />
            <Text style={styles.loadingMoreText}>Đang tải thêm...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SubscriptionHistoryScreen;
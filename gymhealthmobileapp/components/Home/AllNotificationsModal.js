import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance, { endpoints } from "../../configs/API";
const AllNotificationsModal = ({ visible, onClose, onNotificationRead }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null);

  // Reset state khi modal được mở
  useEffect(() => {
    if (visible) {
      resetAndFetchNotifications();
    }
  }, [visible]);

  const resetAndFetchNotifications = () => {
    setNotifications([]);
    setCurrentPage(1);
    setHasNextPage(true);
    setError(null);
    fetchNotifications(1);
  };
  const fetchNotifications = async (page = 1, isRefresh = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      if (isRefresh) {
        setRefreshing(true);
      }

      const accessToken = await AsyncStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("Không tìm thấy token đăng nhập");
      }

      const response = await axiosInstance.get(
        `${endpoints.notifications}my/?page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // HỖ TRỢ CẢ 2 KIỂU: array hoặc object có results
      let notificationsData = [];
      let hasNext = false;
      if (Array.isArray(response.data)) {
        notificationsData = response.data;
        hasNext = false;
      } else if (response.data && response.data.results) {
        notificationsData = response.data.results;
        hasNext = !!response.data.next;
      }

      const formattedNotifications = notificationsData.map((notification) => ({
        id: notification.id.toString(),
        message: notification.message,
        time: formatTimeAgo(notification.created_at),
        read: notification.is_read,
        type: notification.notification_type,
        title: notification.title,
        originalData: notification,
      }));

      if (page === 1) {
        setNotifications(formattedNotifications);
      } else {
        setNotifications((prev) => [...prev, ...formattedNotifications]);
      }

      setHasNextPage(hasNext);
      setCurrentPage(page);
      setError(null);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setError("Không thể tải thông báo");

      if (page === 1) {
        setNotifications([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };
  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return "Vừa xong";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} phút trước`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} giờ trước`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ngày trước`;
    } else if (diffInSeconds < 2592000) {
      const weeks = Math.floor(diffInSeconds / 604800);
      return `${weeks} tuần trước`;
    } else {
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months} tháng trước`;
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      if (!accessToken) return;

      await axiosInstance.patch(
        `${endpoints.notifications}${notificationId}/mark_as_read/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // Cập nhật state local
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId.toString()
            ? { ...notif, read: true }
            : notif
        )
      );

      // Callback để cập nhật parent component
      if (onNotificationRead) {
        onNotificationRead(notificationId);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      if (!accessToken) return;

      await axiosInstance.post(
        `${endpoints.notifications}mark_all_as_read/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // Cập nhật tất cả thông báo thành đã đọc
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true }))
      );

      // Callback để cập nhật parent component
      if (onNotificationRead) {
        onNotificationRead("all");
      }

      Alert.alert("Thành công", "Đã đánh dấu tất cả thông báo đã đọc");
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      Alert.alert("Lỗi", "Không thể đánh dấu thông báo đã đọc");
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasNextPage) {
      fetchNotifications(currentPage + 1);
    }
  };

  const handleRefresh = () => {
    resetAndFetchNotifications();
  };

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.read && styles.unreadNotification]}
      onPress={() => markNotificationAsRead(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <Text
          style={[styles.notificationTitle, !item.read && styles.unreadText]}
        >
          {item.title || "Thông báo"}
        </Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationTime}>{item.time}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>Không có thông báo nào</Text>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.footerLoaderText}>Đang tải thêm...</Text>
      </View>
    );
  };

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => resetAndFetchNotifications()}
      >
        <Text style={styles.retryButtonText}>Thử lại</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Đóng</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Tất cả thông báo</Text>

          <TouchableOpacity
            style={styles.markAllButton}
            onPress={markAllAsRead}
            disabled={notifications.every((n) => n.read)}
          >
            <Text
              style={[
                styles.markAllButtonText,
                notifications.every((n) => n.read) && styles.disabledText,
              ]}
            >
              Đọc hết
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading && notifications.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Đang tải thông báo...</Text>
          </View>
        ) : error && notifications.length === 0 ? (
          renderError()
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={
              notifications.length === 0 ? styles.emptyListContainer : null
            }
            ListEmptyComponent={renderEmptyState}
            ListFooterComponent={renderFooter}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.1}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={["#007AFF"]}
                tintColor="#007AFF"
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  markAllButton: {
    padding: 8,
  },
  markAllButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
  },
  disabledText: {
    color: "#999",
  },
  list: {
    flex: 1,
  },
  emptyListContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#dc3545",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  notificationItem: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: "#f0f8ff",
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: "#999",
  },
  unreadText: {
    color: "#007AFF",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#007AFF",
    marginLeft: 8,
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#999",
  },
  footerLoader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  footerLoaderText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
});

export default AllNotificationsModal;

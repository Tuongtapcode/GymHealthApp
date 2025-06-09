import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  FlatList,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { authAPI, endpoints } from "../../configs/API";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";

const TrainerDashboard = ({ navigation }) => {
  const userFromRedux = useSelector((state) => state.user);

  const [todaySchedule, setTodaySchedule] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    overview: { total_sessions: 0, status_breakdown: {} },
    monthly_stats: { stats: {} },
    recent_week_stats: {},
    top_members: [],
    upcoming_sessions: [],
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("Không tìm thấy token đăng nhập");
      }
      const api = authAPI(accessToken);

      // Load all data concurrently
      await Promise.all([loadTodaySchedule(api), loadDashboardStats(api)]);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      Alert.alert("Lỗi", "Không thể tải dữ liệu trang chủ");
    } finally {
      setLoading(false);
    }
  };

  const loadTodaySchedule = async (api) => {
    try {
      const response = await api.get(
        `${endpoints.workoutSessions}trainer/today-schedule/`
      );
      setTodaySchedule(response.data.sessions || []);
    } catch (error) {
      console.error("Error loading today schedule:", error);
    }
  };

  const loadDashboardStats = async (api) => {
    try {
      const response = await api.get(
        `${endpoints.workoutSessions}trainer/dashboard-stats/`
      );
      setDashboardStats(response.data);
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadDashboardData().finally(() => setRefreshing(false));
  }, []);

  const handleApproveSession = async (sessionId) => {
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      const api = authAPI(accessToken);

      await api.patch(`${endpoints.workoutSessions}${sessionId}/`, {
        status: "confirmed",
      });

      Alert.alert("Thành công", "Đã xác nhận lịch tập");
      loadDashboardData();
    } catch (error) {
      Alert.alert("Lỗi", "Không thể xác nhận lịch tập");
    }
  };

  const handleRejectSession = async (sessionId) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn từ chối lịch tập này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Từ chối",
        style: "destructive",
        onPress: async () => {
          try {
            const accessToken = await AsyncStorage.getItem("accessToken");
            const api = authAPI(accessToken);

            await api.patch(`${endpoints.workoutSessions}${sessionId}/`, {
              status: "cancelled",
            });

            Alert.alert("Thành công", "Đã từ chối lịch tập");
            loadDashboardData();
          } catch (error) {
            Alert.alert("Lỗi", "Không thể từ chối lịch tập");
          }
        },
      },
    ]);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (dateString === today.toISOString().split("T")[0]) {
      return "Hôm nay";
    } else if (dateString === tomorrow.toISOString().split("T")[0]) {
      return "Ngày mai";
    } else {
      return date.toLocaleDateString("vi-VN", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }
  };

  const StatCard = ({ title, value, icon, color = "#4CAF50", subtitle }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statIcon}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const ScheduleItem = ({ item }) => (
    <View style={styles.scheduleItem}>
      <View style={styles.scheduleTime}>
        <Text style={styles.timeText}>{item.start_time}</Text>
        <Text style={styles.timeText}>-</Text>
        <Text style={styles.timeText}>{item.end_time}</Text>
      </View>
      <View style={styles.scheduleContent}>
        <Text style={styles.memberName}>{item.member_name}</Text>
        <Text style={styles.exerciseType}>
          {item.session_type_display || item.exercise_type || "Tập cá nhân"}
        </Text>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          />
          <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>
      {item.status === "pending" && (
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApproveSession(item.id)}
          >
            <Icon name="check" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleRejectSession(item.id)}
          >
            <Icon name="close" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity
        style={styles.detailButton}
        onPress={() => navigation.navigate("schedule", { sessionId: item.id })}
      >
        <Icon name="arrow-forward-ios" size={16} color="#666" />
      </TouchableOpacity>
    </View>
  );

  const TopMemberItem = ({ item, index }) => (
    <View style={styles.topMemberItem}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>{index + 1}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name}</Text>
        <Text style={styles.memberUsername}>@{item.username}</Text>
      </View>
      <View style={styles.sessionCount}>
        <Text style={styles.sessionCountText}>{item.completed_sessions}</Text>
        <Text style={styles.sessionCountLabel}>buổi</Text>
      </View>
    </View>
  );

  const getStatusText = (status) => {
    const statusMap = {
      pending: "Chờ xác nhận",
      confirmed: "Đã xác nhận",
      completed: "Hoàn thành",
      cancelled: "Đã hủy",
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      pending: "#FF9800",
      confirmed: "#2196F3",
      completed: "#4CAF50",
      cancelled: "#757575",
    };
    return colorMap[status] || "#4CAF50";
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  const pendingCount = dashboardStats.overview.status_breakdown.pending || 0;
  const currentMonth = new Date().toLocaleDateString("vi-VN", {
    month: "long",
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.welcomeText}>Xin chào,</Text>
            <Text style={styles.trainerName}>
              {userFromRedux?.first_name} {userFromRedux?.last_name}
            </Text>
            <Text style={styles.subtitle}>Huấn luyện viên</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate("profile")}
          >
            {userFromRedux?.avatar && userFromRedux.avatar !== "" ? (
              <Image
                source={{ uri: userFromRedux.avatar }}
                style={styles.profileImage}
              />
            ) : (
              <Icon name="person" size={24} color="#4CAF50" />
            )}
          </TouchableOpacity>
        </View>
        {/* Overview Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tổng quan</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Buổi tập hôm nay"
              value={todaySchedule.length}
              icon="today"
              color="#4CAF50"
            />
            <StatCard
              title="Chờ xác nhận"
              value={pendingCount}
              icon="pending-actions"
              color="#FF9800"
            />
            <StatCard
              title="Tổng buổi tập"
              value={dashboardStats.overview.total_sessions}
              icon="fitness-center"
              color="#2196F3"
            />
            <StatCard
              title={`Tháng ${currentMonth}`}
              value={dashboardStats.monthly_stats.stats.total || 0}
              icon="calendar-month"
              color="#9C27B0"
              subtitle={`${
                dashboardStats.monthly_stats.stats.completed || 0
              } hoàn thành`}
            />
          </View>
        </View>

        {/* Recent Week Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7 ngày qua</Text>
          <View style={styles.weekStatsContainer}>
            <View style={styles.weekStatItem}>
              <Text style={styles.weekStatValue}>
                {dashboardStats.recent_week_stats.total || 0}
              </Text>
              <Text style={styles.weekStatLabel}>Tổng buổi</Text>
            </View>
            <View style={styles.weekStatItem}>
              <Text style={styles.weekStatValue}>
                {dashboardStats.recent_week_stats.completed || 0}
              </Text>
              <Text style={styles.weekStatLabel}>Hoàn thành</Text>
            </View>
            <View style={styles.weekStatItem}>
              <Text style={styles.weekStatValue}>
                {dashboardStats.recent_week_stats.upcoming || 0}
              </Text>
              <Text style={styles.weekStatLabel}>Sắp tới</Text>
            </View>
          </View>
        </View>

        {/* Today's Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lịch tập hôm nay</Text>
            <TouchableOpacity onPress={() => navigation.navigate("schedule")}>
              <Text style={styles.viewAllText}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          {todaySchedule.length > 0 ? (
            <FlatList
              data={todaySchedule}
              renderItem={({ item }) => <ScheduleItem item={item} />}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Icon name="event-available" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Không có lịch tập hôm nay</Text>
            </View>
          )}
        </View>

        {/* Upcoming Sessions */}
        {dashboardStats.upcoming_sessions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Lịch sắp tới (3 ngày)</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Schedule")}>
                <Text style={styles.viewAllText}>Xem tất cả</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={dashboardStats.upcoming_sessions}
              renderItem={({ item }) => <ScheduleItem item={item} />}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Top Members */}
        {dashboardStats.top_members.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Học viên tích cực nhất</Text>
            <FlatList
              data={dashboardStats.top_members}
              renderItem={({ item, index }) => (
                <TopMemberItem item={item} index={index} />
              )}
              keyExtractor={(item, index) => index.toString()}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate("schedule")}
            >
              <Icon name="list" size={32} color="#4CAF50" />
              <Text style={styles.actionText}>Tất cả lịch tập</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate("schedule")}
            >
              <Icon name="schedule" size={32} color="#2196F3" />
              <Text style={styles.actionText}>Quản lý lịch</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate("ratings")}
            >
              <Icon name="analytics" size={32} color="#FF9800" />
              <Text style={styles.actionText}>Đánh giá</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate("dashboard")}
            >
              <Icon name="group" size={32} color="#9C27B0" />
              <Text style={styles.actionText}>Học viên</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: "#666",
  },
  trainerName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#4CAF50",
    marginTop: 2,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  viewAllText: {
    color: "#4CAF50",
    fontSize: 14,
    fontWeight: "500",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  statIcon: {
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  statTitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: 10,
    color: "#999",
    marginTop: 1,
  },
  weekStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
  },
  weekStatItem: {
    alignItems: "center",
  },
  weekStatValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  weekStatLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  scheduleItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  scheduleTime: {
    width: 80,
    alignItems: "center",
  },
  timeText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  scheduleContent: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  exerciseType: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  status: {
    fontSize: 12,
    fontWeight: "500",
  },
  requestActions: {
    flexDirection: "row",
    marginLeft: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  approveButton: {
    backgroundColor: "#4CAF50",
  },
  rejectButton: {
    backgroundColor: "#f44336",
  },
  detailButton: {
    padding: 8,
  },
  topMemberItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  memberInfo: {
    flex: 1,
  },
  memberUsername: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  sessionCount: {
    alignItems: "center",
  },
  sessionCountText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  sessionCountLabel: {
    fontSize: 10,
    color: "#666",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    width: "48%",
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    color: "#333",
    marginTop: 8,
    textAlign: "center",
    fontWeight: "500",
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25, // làm tròn ảnh
  },
  profileButton: {
    // ... style hiện tại
    // có thể thêm padding để đảm bảo touch area đủ lớn
    padding: 8,
  },
});

export default TrainerDashboard;

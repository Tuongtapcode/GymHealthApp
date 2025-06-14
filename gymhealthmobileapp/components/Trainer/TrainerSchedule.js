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
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { authAPI, endpoints } from "../../configs/API";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import DateTimePicker from "@react-native-community/datetimepicker";

const TrainerSchedule = ({ navigation }) => {
  const userFromRedux = useSelector((state) => state.user);

  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDateRange, setSelectedDateRange] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // States for reschedule modal
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [newDate, setNewDate] = useState(new Date());
  const [newStartTime, setNewStartTime] = useState(new Date());
  const [newEndTime, setNewEndTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  const [pagination, setPagination] = useState({
    current_page: 1,
    total_count: 0,
    page_count: 0,
    has_next: false,
    has_previous: false,
  });
  const [statistics, setStatistics] = useState({
    total_sessions: 0,
    status_breakdown: {},
  });

  const statusOptions = [
    { key: "all", label: "Tất cả", color: "#666" },
    { key: "pending", label: "Chờ xác nhận", color: "#FF9800" },
    { key: "confirmed", label: "Đã xác nhận", color: "#2196F3" },
    { key: "completed", label: "Hoàn thành", color: "#4CAF50" },
    { key: "cancelled", label: "Đã hủy", color: "#757575" },
    {
      key: "reschedule_requested",
      label: "Đề xuất đổi lịch",
      color: "#9C27B0",
    },
  ];

  const dateRangeOptions = [
    { key: "all", label: "Tất cả" },
    { key: "today", label: "Hôm nay" },
    { key: "tomorrow", label: "Ngày mai" },
    { key: "this_week", label: "Tuần này" },
    { key: "next_week", label: "Tuần sau" },
    { key: "this_month", label: "Tháng này" },
  ];

  useEffect(() => {
    loadSessions();
  }, [selectedStatus, selectedDateRange]);

  useEffect(() => {
    filterSessions();
  }, [sessions, searchQuery]);

  const loadSessions = async (page = 1, isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const accessToken = await AsyncStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("Không tìm thấy token đăng nhập");
      }

      const api = authAPI(accessToken);

      const params = new URLSearchParams({
        page: page.toString(),
        page_size: "20",
      });

      if (selectedStatus !== "all") {
        params.append("status", selectedStatus);
      }

      const dateRange = getDateRange(selectedDateRange);
      if (dateRange.date_from) {
        params.append("date_from", dateRange.date_from);
      }
      if (dateRange.date_to) {
        params.append("date_to", dateRange.date_to);
      }

      const response = await api.get(
        `${endpoints.workoutSessions}trainer/all-sessions/?${params.toString()}`
      );

      let sessionsData = [];
      let paginationData = {};
      let statisticsData = {};

      if (response.data.results) {
        sessionsData = response.data.results || [];
        paginationData = {
          current_page: page,
          total_count: response.data.count || 0,
          has_next: !!response.data.next,
          has_previous: !!response.data.previous,
        };
        statisticsData = response.data.statistics || {
          total_sessions: response.data.count || 0,
          status_breakdown: {},
        };
      } else if (response.data.sessions) {
        sessionsData = response.data.sessions || [];
        paginationData = response.data.pagination || {};
        statisticsData = response.data.statistics || {};
      } else if (Array.isArray(response.data)) {
        sessionsData = response.data;
        paginationData = {
          current_page: 1,
          total_count: response.data.length,
          has_next: false,
          has_previous: false,
        };
        statisticsData = {
          total_sessions: response.data.length,
          status_breakdown: {},
        };
      } else {
        sessionsData = [];
      }

      if (page === 1 || !isLoadMore) {
        setSessions(sessionsData);
      } else {
        setSessions((prev) => [...prev, ...sessionsData]);
      }

      setPagination(paginationData);
      setStatistics(statisticsData);
    } catch (error) {
      console.error("Error loading sessions:", error);
      Alert.alert("Lỗi", `Không thể tải dữ liệu lịch tập: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const getDateRange = (range) => {
    const today = new Date();
    const result = {};

    switch (range) {
      case "today":
        result.date_from = today.toISOString().split("T")[0];
        result.date_to = today.toISOString().split("T")[0];
        break;
      case "tomorrow":
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        result.date_from = tomorrow.toISOString().split("T")[0];
        result.date_to = tomorrow.toISOString().split("T")[0];
        break;
      case "this_week":
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        result.date_from = startOfWeek.toISOString().split("T")[0];
        result.date_to = endOfWeek.toISOString().split("T")[0];
        break;
      case "next_week":
        const nextWeekStart = new Date(today);
        nextWeekStart.setDate(today.getDate() + (7 - today.getDay()));
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
        result.date_from = nextWeekStart.toISOString().split("T")[0];
        result.date_to = nextWeekEnd.toISOString().split("T")[0];
        break;
      case "this_month":
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0
        );
        result.date_from = startOfMonth.toISOString().split("T")[0];
        result.date_to = endOfMonth.toISOString().split("T")[0];
        break;
    }

    return result;
  };

  const filterSessions = () => {
    if (!searchQuery.trim()) {
      setFilteredSessions(sessions);
      return;
    }

    const filtered = sessions.filter(
      (session) =>
        session.member_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        session.exercise_type
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        session.session_type_display
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        session.session_type?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredSessions(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPagination((prev) => ({ ...prev, current_page: 1 }));
    loadSessions(1, false);
  };

  const loadMoreSessions = () => {
    if (pagination.has_next && !loading && !loadingMore) {
      const nextPage = pagination.current_page + 1;
      setPagination((prev) => ({ ...prev, current_page: nextPage }));
      loadSessions(nextPage, true);
    }
  };

  const handleConfirmSession = async (sessionId) => {
    Alert.alert(
      "Xác nhận buổi tập",
      "Bạn có chắc chắn muốn xác nhận buổi tập này không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: async () => {
            try {
              const accessToken = await AsyncStorage.getItem("accessToken");
              const api = authAPI(accessToken);

              await api.patch(
                `${endpoints.workoutSessions}${sessionId}/confirm-session/`,
                {
                  status: "confirmed",
                }
              );

              Alert.alert("Thành công", "Đã xác nhận buổi tập");
              onRefresh();
            } catch (error) {
              console.error("Error confirming session:", error);
              const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.error ||
                "Không thể xác nhận buổi tập";
              Alert.alert("Lỗi", errorMessage);
            }
          },
        },
      ]
    );
  };
  const handleStatusChange = async (
    sessionId,
    newStatus,
    confirmMessage = ""
  ) => {
    const statusMessages = {
      completed: "Bạn có chắc chắn muốn đánh dấu buổi tập này là hoàn thành?",
      cancelled: "Bạn có chắc chắn muốn hủy buổi tập này?",
    };

    const message =
      confirmMessage ||
      statusMessages[newStatus] ||
      "Bạn có chắc chắn muốn thay đổi trạng thái?";

    Alert.alert("Xác nhận", message, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xác nhận",
        style: newStatus === "cancelled" ? "destructive" : "default",
        onPress: async () => {
          try {
            const accessToken = await AsyncStorage.getItem("accessToken");
            const api = authAPI(accessToken);

            // Sử dụng endpoint khác nhau tùy theo status
            if (newStatus === "completed") {
              // Gọi API confirm-session với status completed
              await api.patch(
                `${endpoints.workoutSessions}${sessionId}/confirm-session/`,
                {
                  status: "completed",
                }
              );
            } else {
              // Gọi API thông thường cho các status khác
              await api.patch(`${endpoints.workoutSessions}${sessionId}/`, {
                status: newStatus,
              });
            }

            Alert.alert("Thành công", "Đã cập nhật trạng thái lịch tập");
            onRefresh();
          } catch (error) {
            console.error("Error updating status:", error);
            const errorMessage =
              error.response?.data?.message ||
              error.response?.data?.error ||
              "Không thể cập nhật trạng thái lịch tập";
            Alert.alert("Lỗi", errorMessage);
          }
        },
      },
    ]);
  };
  const openRescheduleModal = (session) => {
    setSelectedSession(session);
    // Set default new date/time based on current session
    const sessionDate = new Date(session.session_date);
    setNewDate(sessionDate);

    // Parse time strings and create Date objects
    const [startHour, startMinute] = session.start_time.split(":");
    const [endHour, endMinute] = session.end_time.split(":");

    const startTime = new Date(sessionDate);
    startTime.setHours(parseInt(startHour), parseInt(startMinute));
    setNewStartTime(startTime);

    const endTime = new Date(sessionDate);
    endTime.setHours(parseInt(endHour), parseInt(endMinute));
    setNewEndTime(endTime);

    setRescheduleReason("");
    setShowRescheduleModal(true);
  };

  const validateRescheduleData = () => {
    if (!rescheduleReason.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập lý do đổi lịch");
      return false;
    }

    if (newStartTime >= newEndTime) {
      Alert.alert("Lỗi", "Thời gian bắt đầu phải trước thời gian kết thúc");
      return false;
    }

    // Check if new time is at least 30 minutes
    const timeDiff = (newEndTime - newStartTime) / (1000 * 60); // minutes
    if (timeDiff < 30) {
      Alert.alert("Lỗi", "Buổi tập phải kéo dài ít nhất 30 phút");
      return false;
    }

    // Check if new date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(newDate);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      Alert.alert("Lỗi", "Không thể đặt lịch tập trong quá khứ");
      return false;
    }

    return true;
  };

  const handleRescheduleSubmit = async () => {
    if (!validateRescheduleData()) {
      return;
    }

    try {
      setSubmittingReschedule(true);
      const accessToken = await AsyncStorage.getItem("accessToken");
      const api = authAPI(accessToken);

      const rescheduleData = {
        new_date: newDate.toISOString().split("T")[0],
        new_start_time: newStartTime.toTimeString().slice(0, 5),
        new_end_time: newEndTime.toTimeString().slice(0, 5),
        reason: rescheduleReason.trim(),
      };

      await api.post(
        `${endpoints.workoutSessions}${selectedSession.id}/reschedule/`,
        rescheduleData
      );

      Alert.alert(
        "Thành công",
        "Đã gửi đề xuất đổi lịch tập đến học viên. Học viên sẽ nhận được thông báo để xác nhận."
      );
      setShowRescheduleModal(false);
      onRefresh();
    } catch (error) {
      console.error("Error rescheduling session:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Không thể gửi đề xuất đổi lịch";
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setSubmittingReschedule(false);
    }
  };

  //   const showStatusChangeOptions = (session) => {
  //     const options = [{ text: "Hủy", style: "cancel" }];

  //     if (session.status === "pending") {
  //       options.unshift(
  //         {
  //           text: "✅ Xác nhận buổi tập",
  //           onPress: () => handleConfirmSession(session.id),
  //         },
  //         {
  //           text: "📅 Đề xuất đổi lịch",
  //           onPress: () => openRescheduleModal(session),
  //         },
  //         {
  //           text: "❌ Từ chối",
  //           style: "destructive",
  //           onPress: () =>
  //             handleStatusChange(
  //               session.id,
  //               "cancelled",
  //               "Bạn có chắc chắn muốn từ chối buổi tập này?"
  //             ),
  //         }
  //       );
  //     } else if (session.status === "confirmed") {
  //       options.unshift(
  //         {
  //           text: "✅ Đánh dấu hoàn thành",
  //           onPress: () => handleStatusChange(session.id, "completed"),
  //         },
  //         {
  //           text: "📅 Đề xuất đổi lịch",
  //           onPress: () => openRescheduleModal(session),
  //         },
  //         {
  //           text: "❌ Hủy buổi tập",
  //           style: "destructive",
  //           onPress: () =>
  //             handleStatusChange(
  //               session.id,
  //               "cancelled",
  //               "Bạn có chắc chắn muốn hủy buổi tập này?"
  //             ),
  //         }
  //       );
  //     } else if (session.status === "reschedule_requested") {
  //       options.unshift(
  //         {
  //           text: "📅 Sửa đề xuất đổi lịch",
  //           onPress: () => openRescheduleModal(session),
  //         },
  //         {
  //           text: "❌ Hủy đề xuất",
  //           style: "destructive",
  //           onPress: () =>
  //             handleStatusChange(
  //               session.id,
  //               "cancelled",
  //               "Bạn có chắc chắn muốn hủy đề xuất đổi lịch?"
  //             ),
  //         }
  //       );
  //     }

  //     Alert.alert("Thao tác với buổi tập", "Chọn hành động:", options);
  //   };

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
        day: "numeric",
        month: "short",
      });
    }
  };

  const formatDateForDisplay = (date) => {
    return date.toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTimeForDisplay = (date) => {
    return date.toTimeString().slice(0, 5);
  };

  const getStatusColor = (status) => {
    const colorMap = {
      pending: "#FF9800",
      confirmed: "#2196F3",
      completed: "#4CAF50",
      cancelled: "#757575",
      rescheduled: "#9C27B0",
    };
    return colorMap[status] || "#4CAF50";
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: "Chờ xác nhận",
      confirmed: "Đã xác nhận",
      completed: "Hoàn thành",
      cancelled: "Đã hủy",
      rescheduled: "Đề xuất đổi lịch",
    };
    return statusMap[status] || status;
  };

  const getSessionTypeDisplay = (item) => {
    if (item.session_type_display) return item.session_type_display;
    if (item.exercise_type) return item.exercise_type;
    if (item.session_type === "pt_session") return "Personal Training";
    return "Tập cá nhân";
  };

  const SessionItem = ({ item }) => (
    <View style={styles.sessionItem}>
      <View style={styles.sessionHeader}>
        <View style={styles.dateTimeContainer}>
          <Text style={styles.dateText}>{formatDate(item.session_date)}</Text>
          <Text style={styles.timeText}>
            {item.start_time} - {item.end_time}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.statusButton}
          //   onPress={() => showStatusChangeOptions(item)}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          />
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {getStatusText(item.status)}
          </Text>
          <Icon
            name="keyboard-arrow-down"
            size={16}
            color={getStatusColor(item.status)}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.sessionContent}>
        <View style={styles.memberInfo}>
          <Icon name="person" size={20} color="#666" />
          <Text style={styles.memberName}>{item.member_name}</Text>
        </View>
        <View style={styles.exerciseInfo}>
          <Icon name="fitness-center" size={20} color="#666" />
          <Text style={styles.exerciseType}>{getSessionTypeDisplay(item)}</Text>
        </View>
        {item.notes && (
          <View style={styles.notesInfo}>
            <Icon name="note" size={20} color="#666" />
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}

        {item.reschedule_reason && (
          <View style={styles.rescheduleInfo}>
            <Icon name="schedule" size={20} color="#9C27B0" />
            <Text style={styles.rescheduleReasonText}>
              Lý do đổi lịch: {item.reschedule_reason}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.sessionActions}>
        {/* Nút Chi tiết - luôn hiển thị */}

        {/* Nút Nhắn tin - luôn hiển thị */}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() =>
            navigation.navigate("Chat", {
              memberId: item.member_id,
              userId: item.trainer_id,
              chatName: item.member_name,
            })
          }
        >
          <Icon name="chat" size={20} color="#2196F3" />
          <Text style={styles.actionButtonText}>Nhắn tin</Text>
        </TouchableOpacity>
        {/* Nút theo trạng thái */}
        {item.status === "pending" && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.quickConfirmButton]}
              onPress={() => handleConfirmSession(item.id)}
            >
              <Icon name="check" size={20} color="#4CAF50" />
              <Text style={[styles.actionButtonText, { color: "#4CAF50" }]}>
                Xác nhận
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rescheduleButton]}
              onPress={() => openRescheduleModal(item)}
            >
              <Icon name="schedule" size={20} color="#9C27B0" />
              <Text style={[styles.actionButtonText, { color: "#9C27B0" }]}>
                Đổi lịch
              </Text>
            </TouchableOpacity>
          </>
        )}

        {item.status === "confirmed" && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleStatusChange(item.id, "completed")}
            >
              <Icon name="check-circle" size={20} color="#4CAF50" />
              <Text style={[styles.actionButtonText, { color: "#4CAF50" }]}>
                Hoàn thành
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rescheduleButton]}
              onPress={() => openRescheduleModal(item)}
            >
              <Icon name="schedule" size={20} color="#9C27B0" />
              <Text style={[styles.actionButtonText, { color: "#9C27B0" }]}>
                Đổi lịch
              </Text>
            </TouchableOpacity>
          </>
        )}

        {item.status === "reschedule" && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.editRescheduleButton]}
              onPress={() => openRescheduleModal(item)}
            >
              <Icon name="edit" size={20} color="#9C27B0" />
              <Text style={[styles.actionButtonText, { color: "#9C27B0" }]}>
                Sửa đề xuất
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() =>
                handleStatusChange(
                  item.id,
                  "cancelled",
                  "Bạn có chắc chắn muốn hủy đề xuất đổi lịch?"
                )
              }
            >
              <Icon name="cancel" size={20} color="#f44336" />
              <Text style={[styles.actionButtonText, { color: "#f44336" }]}>
                Hủy đề xuất
              </Text>
            </TouchableOpacity>
          </>
        )}

        {item.status === "completed" && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.progressButton]}
              onPress={() =>
                navigation.navigate("schedule", {
                  screen: "TrainingProgress",
                  params: {
                    sessionId: item.id,
                    memberId: item.member_id,
                    memberName: item.member_name,
                  },
                })
              }
            >
              <Icon name="trending-up" size={20} color="#2196F3" />
              <Text style={[styles.actionButtonText, { color: "#2196F3" }]}>
                Cập nhật tiến độ
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                navigation.navigate("SessionDetail", { sessionId: item.id })
              }
            >
              <Icon name="visibility" size={20} color="#4CAF50" />
              <Text style={styles.actionButtonText}>Chi tiết</Text>
            </TouchableOpacity>
            {/* <TouchableOpacity
              style={[styles.actionButton, styles.completedStatusButton]}
              disabled={true}
            >
              <Icon name="check-circle" size={20} color="#4CAF50" />
              <Text style={[styles.actionButtonText, { color: "#4CAF50" }]}>
                Đã hoàn thành
              </Text>
            </TouchableOpacity> */}
          </>
        )}

        {item.status === "cancelled" && (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelledStatusButton]}
            disabled={true}
          >
            <Icon name="cancel" size={20} color="#757575" />
            <Text style={[styles.actionButtonText, { color: "#757575" }]}>
              Đã hủy
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const RescheduleModal = () => (
    <Modal
      visible={showRescheduleModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowRescheduleModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.rescheduleModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Đề xuất đổi lịch tập</Text>
            <TouchableOpacity onPress={() => setShowRescheduleModal(false)}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.rescheduleForm}>
            {selectedSession && (
              <View style={styles.currentSessionInfo}>
                <Text style={styles.sectionTitle}>Lịch tập hiện tại:</Text>
                <Text style={styles.currentSessionText}>
                  {formatDate(selectedSession.session_date)} -{" "}
                  {selectedSession.start_time} đến {selectedSession.end_time}
                </Text>
                <Text style={styles.currentSessionText}>
                  Với: {selectedSession.member_name}
                </Text>
              </View>
            )}

            <View style={styles.newScheduleSection}>
              <Text style={styles.sectionTitle}>Lịch tập mới:</Text>

              <TouchableOpacity
                style={styles.dateTimeSelector}
                onPress={() => setShowDatePicker(true)}
              >
                <Icon name="date-range" size={20} color="#4CAF50" />
                <Text style={styles.selectorText}>
                  Ngày: {formatDateForDisplay(newDate)}
                </Text>
                <Icon name="keyboard-arrow-right" size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateTimeSelector}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Icon name="access-time" size={20} color="#4CAF50" />
                <Text style={styles.selectorText}>
                  Bắt đầu: {formatTimeForDisplay(newStartTime)}
                </Text>
                <Icon name="keyboard-arrow-right" size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateTimeSelector}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Icon name="access-time" size={20} color="#4CAF50" />
                <Text style={styles.selectorText}>
                  Kết thúc: {formatTimeForDisplay(newEndTime)}
                </Text>
                <Icon name="keyboard-arrow-right" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.reasonSection}>
              <Text style={styles.sectionTitle}>Lý do đổi lịch: *</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Nhập lý do đổi lịch tập... (bắt buộc)"
                value={rescheduleReason}
                onChangeText={setRescheduleReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Text style={styles.helperText}>
                Học viên sẽ nhận được thông báo về đề xuất đổi lịch này
              </Text>
            </View>
          </ScrollView>

          <View style={styles.rescheduleActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowRescheduleModal(false)}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                submittingReschedule && styles.submitButtonDisabled,
              ]}
              onPress={handleRescheduleSubmit}
              disabled={submittingReschedule}
            >
              {submittingReschedule ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Gửi đề xuất</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Date/Time Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={newDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setNewDate(selectedDate);
            }
          }}
          minimumDate={new Date()}
        />
      )}

      {showStartTimePicker && (
        <DateTimePicker
          value={newStartTime}
          mode="time"
          display="default"
          onChange={(event, selectedTime) => {
            setShowStartTimePicker(false);
            if (selectedTime) {
              setNewStartTime(selectedTime);
            }
          }}
        />
      )}

      {showEndTimePicker && (
        <DateTimePicker
          value={newEndTime}
          mode="time"
          display="default"
          onChange={(event, selectedTime) => {
            setShowEndTimePicker(false);
            if (selectedTime) {
              setNewEndTime(selectedTime);
            }
          }}
        />
      )}
    </Modal>
  );

  const FilterModal = () => {
    // Tính toán số lượng từ dữ liệu sessions hiện tại
    const calculateStatusCounts = () => {
      const counts = {};
      sessions.forEach((session) => {
        const status = session.status;
        counts[status] = (counts[status] || 0) + 1;
      });

      // Thêm tổng số cho "all"
      counts["all"] = sessions.length;

      return counts;
    };

    const statusCounts = calculateStatusCounts();

    return (
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bộ lọc</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Thêm ScrollView để có thể cuộn nội dung */}
            <ScrollView
              style={styles.scrollableContent}
              showsVerticalScrollIndicator={true}
              bounces={false}
            >
              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Trạng thái</Text>
                <View style={styles.filterOptions}>
                  {statusOptions.map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.filterOption,
                        selectedStatus === option.key &&
                          styles.filterOptionSelected,
                      ]}
                      onPress={() => setSelectedStatus(option.key)}
                    >
                      <View
                        style={[
                          styles.filterDot,
                          { backgroundColor: option.color },
                        ]}
                      />
                      <Text
                        style={[
                          styles.filterOptionText,
                          selectedStatus === option.key &&
                            styles.filterOptionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {/* Hiển thị số lượng được tính từ dữ liệu thực tế */}
                      {statusCounts[option.key] ? (
                        <Text style={styles.filterCount}>
                          ({statusCounts[option.key]})
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Thời gian</Text>
                <View style={styles.filterOptions}>
                  {dateRangeOptions.map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.filterOption,
                        selectedDateRange === option.key &&
                          styles.filterOptionSelected,
                      ]}
                      onPress={() => setSelectedDateRange(option.key)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          selectedDateRange === option.key &&
                            styles.filterOptionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Nút "Áp dụng" nằm cố định ở cuối */}
            <TouchableOpacity
              style={styles.applyFilterButton}
              onPress={() => {
                setShowFilters(false);
                onRefresh();
              }}
            >
              <Text style={styles.applyFilterButtonText}>Áp dụng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  if (loading && sessions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Đang tải lịch tập...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch tập</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Icon name="filter-list" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm theo tên học viên, loại tập..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Icon name="clear" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          Tổng: {statistics.total_sessions} buổi tập
        </Text>
        <View style={styles.activeFilters}>
          {selectedStatus !== "all" && (
            <View style={styles.activeFilter}>
              <Text style={styles.activeFilterText}>
                {statusOptions.find((s) => s.key === selectedStatus)?.label}
              </Text>
            </View>
          )}
          {selectedDateRange !== "all" && (
            <View style={styles.activeFilter}>
              <Text style={styles.activeFilterText}>
                {
                  dateRangeOptions.find((d) => d.key === selectedDateRange)
                    ?.label
                }
              </Text>
            </View>
          )}
        </View>
      </View>

      <FlatList
        data={filteredSessions}
        renderItem={({ item }) => <SessionItem item={item} />}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMoreSessions}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() =>
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.loadingMoreText}>Đang tải thêm...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Icon name="event-busy" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Không có buổi tập nào</Text>
            <Text style={styles.emptySubText}>
              {searchQuery
                ? "Thử thay đổi từ khóa tìm kiếm"
                : "Hãy thử thay đổi bộ lọc hoặc kéo xuống để làm mới"}
            </Text>
          </View>
        )}
      />

      <FilterModal />
      <RescheduleModal />
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
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: "#333",
  },
  summaryContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  summaryText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  activeFilters: {
    flexDirection: "row",
  },
  activeFilter: {
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  activeFilterText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
  },
  sessionItem: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dateTimeContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  timeText: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  statusButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f8f8f8",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    marginRight: 4,
  },
  sessionContent: {
    marginBottom: 12,
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  exerciseInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  exerciseType: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  notesInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    flex: 1,
  },
  subscriptionInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  subscriptionText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  rescheduleInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    backgroundColor: "#F3E5F5",
    padding: 8,
    borderRadius: 8,
  },
  rescheduleReasonText: {
    fontSize: 14,
    color: "#9C27B0",
    marginLeft: 8,
    flex: 1,
    fontStyle: "italic",
  },
  sessionActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#f8f8f8",
  },
  quickConfirmButton: {
    backgroundColor: "#E8F5E8",
  },
  actionButtonText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
    fontWeight: "500",
  },
  loadingMore: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: "#999",
    marginTop: 16,
    fontWeight: "500",
  },
  emptySubText: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxHeight: "80%",
  },
  rescheduleModalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 0,
    width: "95%",
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  filterSection: {
    marginBottom: 24,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  filterOptions: {
    gap: 8,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#f8f8f8",
  },
  filterOptionSelected: {
    backgroundColor: "#E8F5E8",
  },
  filterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  filterOptionText: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  filterOptionTextSelected: {
    color: "#4CAF50",
    fontWeight: "500",
  },
  filterCount: {
    fontSize: 12,
    color: "#999",
  },
  applyFilterButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  applyFilterButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Reschedule modal styles
  rescheduleForm: {
    paddingHorizontal: 24,
    maxHeight: 400,
  },
  currentSessionInfo: {
    backgroundColor: "#F5F5F5",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  currentSessionText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  newScheduleSection: {
    marginBottom: 20,
  },
  dateTimeSelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    marginBottom: 12,
  },
  selectorText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    marginLeft: 12,
  },
  reasonSection: {
    marginBottom: 20,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    minHeight: 80,
  },
  helperText: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
    fontStyle: "italic",
  },
  rescheduleActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: "#4CAF50",
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
});

export default TrainerSchedule;

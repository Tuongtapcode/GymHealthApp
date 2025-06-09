import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { authAPI, endpoints } from "../../configs/API";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";

const TrainerRatingsScreen = ({ navigation }) => {
  const user = useSelector((state) => state.user);
  const [ratings, setRatings] = useState([]);
  const [averageStats, setAverageStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [responseModal, setResponseModal] = useState({
    visible: false,
    ratingId: null,
    existingResponse: null,
  });
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadRatings = async (page = 1, isLoadMore = false) => {
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

      // Sử dụng endpoint đúng với sub-path
      const url = `${
        endpoints.trainerRating
      }trainer/my_rating/?${params.toString()}`;

      console.log("=== API DEBUG ===");
      console.log("Full URL:", url);
      console.log("Base endpoint:", endpoints.trainerRating);
      console.log("Access Token exists:", !!accessToken);
      console.log("================");

      const response = await api.get(url);
      console.log("API Response:", response.data);

      // Xử lý response data
      let ratingsData = [];
      let paginationData = {};
      let statsData = null;

      if (response.data.results && Array.isArray(response.data.results)) {
        ratingsData = response.data.results;
        paginationData = {
          current_page: page,
          total_count: response.data.count || 0,
          has_next: !!response.data.next,
          has_previous: !!response.data.previous,
        };
      } else if (
        response.data.ratings &&
        Array.isArray(response.data.ratings)
      ) {
        ratingsData = response.data.ratings;
        statsData = response.data.stats || null;
        paginationData = {
          current_page: 1,
          total_count: ratingsData.length,
          has_next: false,
          has_previous: false,
        };
      } else if (Array.isArray(response.data)) {
        ratingsData = response.data;
        paginationData = {
          current_page: 1,
          total_count: response.data.length,
          has_next: false,
          has_previous: false,
        };
      } else {
        console.log("Unexpected response format:", response.data);
        ratingsData = [];
      }

      // Cập nhật state
      if (page === 1 || !isLoadMore) {
        setRatings(ratingsData);
      } else {
        setRatings((prev) => [...prev, ...ratingsData]);
      }

      setPagination(paginationData);

      if (statsData) {
        setAverageStats(statsData);
      } else if (page === 1) {
        calculateStats(ratingsData);
      }
    } catch (error) {
      console.error("=== ERROR DEBUG ===");
      console.error("Error message:", error.message);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      console.error("Failed URL:", error.config?.url);
      console.error("==================");

      let errorMessage = "Không thể tải dữ liệu đánh giá";
      if (error.response?.status === 401) {
        errorMessage = "Phiên đăng nhập đã hết hạn";
      } else if (error.response?.status === 403) {
        errorMessage = "Không có quyền truy cập";
      } else if (error.response?.status === 404) {
        errorMessage = "Không tìm thấy endpoint";
      } else if (error.response?.status === 500) {
        errorMessage = "Lỗi server, vui lòng thử lại sau";
      }

      Alert.alert("Lỗi", `${errorMessage}: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Tính toán stats từ dữ liệu ratings
  const calculateStats = (ratingsData) => {
    if (!ratingsData || ratingsData.length === 0) {
      setAverageStats({
        total_ratings: 0,
        average_knowledge: 0,
        average_communication: 0,
        average_punctuality: 0,
        average_overall: 0,
      });
      return;
    }

    const totalRatings = ratingsData.length;
    const avgKnowledge =
      ratingsData.reduce((sum, r) => sum + (r.knowledge_score || 0), 0) /
      totalRatings;
    const avgCommunication =
      ratingsData.reduce((sum, r) => sum + (r.communication_score || 0), 0) /
      totalRatings;
    const avgPunctuality =
      ratingsData.reduce((sum, r) => sum + (r.punctuality_score || 0), 0) /
      totalRatings;
    const avgOverall =
      ratingsData.reduce(
        (sum, r) => sum + (r.overall_score || r.average_score || 0),
        0
      ) / totalRatings;

    setAverageStats({
      total_ratings: totalRatings,
      average_knowledge: Math.round(avgKnowledge * 10) / 10,
      average_communication: Math.round(avgCommunication * 10) / 10,
      average_punctuality: Math.round(avgPunctuality * 10) / 10,
      average_overall: Math.round(avgOverall * 10) / 10,
    });
  };

  const fetchRatingResponse = async (ratingId) => {
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      if (!accessToken) {
        return [];
      }

      const api = authAPI(accessToken);
      // Sửa endpoint: filter theo rating_id qua query params
      const response = await api.get(
        `${endpoints.feedbackResponse}?trainer_rating=${ratingId}`
      );

      if (response.data.results) {
        return response.data.results;
      } else if (Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching response:", error);
      return [];
    }
  };
  const submitResponse = async () => {
    if (!responseText.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập nội dung phản hồi");
      return;
    }

    setSubmitting(true);
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("Không tìm thấy token đăng nhập");
      }

      const api = authAPI(accessToken);

      // Chuẩn bị dữ liệu theo serializer backend
      const responseData = {
        trainer_rating: responseModal.ratingId, // ID của trainer rating
        response_text: responseText, // Nội dung phản hồi (đúng tên field)
      };

      console.log("Sending data:", responseData);

      // Sử dụng endpoint chính xác
      const response = await api.post(endpoints.feedbackResponse, responseData);

      console.log("Response:", response.data);

      // Hiển thị thông báo thành công
      const message =
        response.data.message || "Phản hồi đã được gửi thành công";
      Alert.alert("Thành công", message);

      // Reset form và đóng modal
      setResponseModal({
        visible: false,
        ratingId: null,
        existingResponse: null,
      });
      setResponseText("");

      // Reload dữ liệu
      loadRatings();
    } catch (error) {
      console.error("Submit response error:", error);

      let errorMessage = "Không thể gửi phản hồi";

      if (error.response) {
        // Server response error
        const { status, data } = error.response;
        console.error("Server error:", status, data);

        if (data && data.error) {
          errorMessage = data.error;
        } else if (data && typeof data === "object") {
          // Handle validation errors
          const errors = [];
          Object.keys(data).forEach((key) => {
            if (Array.isArray(data[key])) {
              errors.push(`${key}: ${data[key].join(", ")}`);
            } else {
              errors.push(`${key}: ${data[key]}`);
            }
          });
          errorMessage = errors.length > 0 ? errors.join("\n") : errorMessage;
        } else if (data && data.message) {
          errorMessage = data.message;
        }

        // Specific error handling
        switch (status) {
          case 400:
            errorMessage = data.error || "Dữ liệu không hợp lệ";
            break;
          case 401:
            errorMessage = "Phiên đăng nhập đã hết hạn";
            // TODO: Redirect to login
            break;
          case 403:
            errorMessage = "Bạn không có quyền thực hiện thao tác này";
            break;
          case 404:
            errorMessage = "Không tìm thấy đánh giá này";
            break;
          case 500:
            errorMessage = "Lỗi server, vui lòng thử lại sau";
            break;
        }
      } else if (error.request) {
        // Network error
        console.error("Network error:", error.request);
        errorMessage = "Lỗi kết nối mạng, vui lòng kiểm tra internet";
      } else {
        // Other error
        console.error("Other error:", error.message);
        errorMessage = error.message || errorMessage;
      }

      Alert.alert("Lỗi", errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Hàm helper để update response (nếu cần)
  const updateResponse = async (responseId, newText) => {
    setSubmitting(true);
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("Không tìm thấy token đăng nhập");
      }

      const api = authAPI(accessToken);

      const updateData = {
        response_text: newText,
      };

      const response = await api.patch(
        `${endpoints.feedbackResponse}${responseId}/`,
        updateData
      );

      Alert.alert("Thành công", "Phản hồi đã được cập nhật");

      setResponseModal({
        visible: false,
        ratingId: null,
        existingResponse: null,
      });
      setResponseText("");
      loadRatings();
    } catch (error) {
      console.error("Update response error:", error);
      Alert.alert("Lỗi", "Không thể cập nhật phản hồi");
    } finally {
      setSubmitting(false);
    }
  };
  // Mở modal phản hồi
  const openResponseModal = async (ratingId) => {
    const existingResponses = await fetchRatingResponse(ratingId);
    const myResponse = existingResponses.find(
      (r) => r.responder && r.responder.id === user.id
    );

    setResponseModal({
      visible: true,
      ratingId,
      existingResponse: myResponse,
    });

    if (myResponse) {
      setResponseText(myResponse.content);
    } else {
      setResponseText("");
    }
  };

  // Load more function cho pagination
  const loadMoreRatings = () => {
    if (pagination.has_next && !loadingMore) {
      const nextPage = pagination.current_page + 1;
      loadRatings(nextPage, true);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRatings(1, false); // Reset về trang 1
  };

  useFocusEffect(
    useCallback(() => {
      loadRatings(1, false); // Load trang đầu tiên
    }, [])
  );

  // Render thống kê
  const renderStats = () => {
    if (!averageStats || averageStats.total_ratings === 0) {
      return (
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Thống kê đánh giá</Text>
          <Text style={styles.noRatingsText}>Chưa có đánh giá nào</Text>
        </View>
      );
    }

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>
          Thống kê đánh giá ({averageStats.total_ratings} đánh giá)
        </Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Kiến thức</Text>
            <Text style={styles.statValue}>
              {averageStats.average_knowledge}/5
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Giao tiếp</Text>
            <Text style={styles.statValue}>
              {averageStats.average_communication}/5
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Đúng giờ</Text>
            <Text style={styles.statValue}>
              {averageStats.average_punctuality}/5
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Tổng thể</Text>
            <Text style={styles.statValue}>
              {averageStats.average_overall}/5
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Render avatar component
  const renderAvatar = (userDetails) => {
    if (userDetails?.avatar) {
      return (
        <Image source={{ uri: userDetails.avatar }} style={styles.avatar} />
      );
    }
    return (
      <View style={styles.avatarPlaceholder}>
        <Icon name="person" size={24} color="#666" />
      </View>
    );
  };

  // Render từng đánh giá
  const renderRatingItem = (rating) => {
    const userDetails = rating.user_details || rating.user;
    const fullName = userDetails
      ? `${userDetails.first_name || ""} ${userDetails.last_name || ""}`.trim()
      : userDetails?.username || "Người dùng";

    // Tính điểm trung bình nếu chưa có
    const averageScore =
      rating.average_score ||
      rating.overall_score ||
      (rating.knowledge_score +
        rating.communication_score +
        rating.punctuality_score) /
        3;

    return (
      <View key={rating.id} style={styles.ratingCard}>
        <View style={styles.ratingHeader}>
          <View style={styles.userInfo}>
            {renderAvatar(userDetails)}
            <View style={styles.userTextInfo}>
              <Text style={styles.userName}>
                {rating.anonymous ? "Người dùng ẩn danh" : fullName}
              </Text>
              <Text style={styles.ratingDate}>
                {new Date(rating.created_at).toLocaleDateString("vi-VN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.responseButton}
            onPress={() => openResponseModal(rating.id)}
          >
            <Icon name="reply" size={20} color="#FF6B35" />
            <Text style={styles.responseButtonText}>Phản hồi</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scoresContainer}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Kiến thức:</Text>
            <View style={styles.scoreRating}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Icon
                  key={star}
                  name={
                    star <= rating.knowledge_score ? "star" : "star-outline"
                  }
                  size={16}
                  color={star <= rating.knowledge_score ? "#FFD700" : "#ccc"}
                />
              ))}
              <Text style={styles.scoreValue}>
                ({rating.knowledge_score}/5)
              </Text>
            </View>
          </View>

          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Giao tiếp:</Text>
            <View style={styles.scoreRating}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Icon
                  key={star}
                  name={
                    star <= rating.communication_score ? "star" : "star-outline"
                  }
                  size={16}
                  color={
                    star <= rating.communication_score ? "#FFD700" : "#ccc"
                  }
                />
              ))}
              <Text style={styles.scoreValue}>
                ({rating.communication_score}/5)
              </Text>
            </View>
          </View>

          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Đúng giờ:</Text>
            <View style={styles.scoreRating}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Icon
                  key={star}
                  name={
                    star <= rating.punctuality_score ? "star" : "star-outline"
                  }
                  size={16}
                  color={star <= rating.punctuality_score ? "#FFD700" : "#ccc"}
                />
              ))}
              <Text style={styles.scoreValue}>
                ({rating.punctuality_score}/5)
              </Text>
            </View>
          </View>

          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Điểm trung bình:</Text>
            <View style={styles.scoreRating}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Icon
                  key={star}
                  name={
                    star <= Math.round(averageScore) ? "star" : "star-outline"
                  }
                  size={16}
                  color={star <= Math.round(averageScore) ? "#FFD700" : "#ccc"}
                />
              ))}
              <Text style={styles.scoreValue}>
                ({Math.round(averageScore * 10) / 10}/5)
              </Text>
            </View>
          </View>
        </View>

        {rating.comment && (
          <View style={styles.commentContainer}>
            <Text style={styles.commentLabel}>Nhận xét:</Text>
            <Text style={styles.commentText}>{rating.comment}</Text>
          </View>
        )}

        {rating.response && (
          <View style={styles.responseContainer}>
            <Text style={styles.responseLabel}>Phản hồi của bạn:</Text>
            <Text style={styles.responseText}>{rating.response.content}</Text>
            <Text style={styles.responseDate}>
              {new Date(rating.response.created_at).toLocaleDateString("vi-VN")}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Render load more button
  const renderLoadMoreButton = () => {
    if (!pagination.has_next) return null;

    return (
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={loadMoreRatings}
        disabled={loadingMore}
      >
        {loadingMore ? (
          <ActivityIndicator size="small" color="#FF6B35" />
        ) : (
          <>
            <Icon name="expand-more" size={20} color="#FF6B35" />
            <Text style={styles.loadMoreText}>Tải thêm</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Đang tải đánh giá...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderStats()}

        <View style={styles.ratingsSection}>
          <Text style={styles.sectionTitle}>
            Đánh giá từ học viên
            {pagination.total_count > 0 && ` (${pagination.total_count})`}
          </Text>
          {ratings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="star-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Chưa có đánh giá nào</Text>
              <Text style={styles.emptySubText}>
                Các đánh giá từ học viên sẽ hiển thị tại đây
              </Text>
            </View>
          ) : (
            <>
              {ratings.map(renderRatingItem)}
              {renderLoadMoreButton()}
            </>
          )}
        </View>
      </ScrollView>

      {/* Modal phản hồi */}
      <Modal
        visible={responseModal.visible}
        animationType="slide"
        onRequestClose={() =>
          setResponseModal({
            visible: false,
            ratingId: null,
            existingResponse: null,
          })
        }
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {responseModal.existingResponse
                ? "Chỉnh sửa phản hồi"
                : "Phản hồi đánh giá"}
            </Text>
            <TouchableOpacity
              onPress={() =>
                setResponseModal({
                  visible: false,
                  ratingId: null,
                  existingResponse: null,
                })
              }
            >
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Nội dung phản hồi:</Text>
            <TextInput
              style={styles.responseInput}
              value={responseText}
              onChangeText={setResponseText}
              placeholder="Nhập phản hồi của bạn..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() =>
                  setResponseModal({
                    visible: false,
                    ratingId: null,
                    existingResponse: null,
                  })
                }
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  submitting && styles.submitButtonDisabled,
                ]}
                onPress={submitResponse}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {responseModal.existingResponse
                      ? "Cập nhật"
                      : "Gửi phản hồi"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
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
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  statsContainer: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  noRatingsText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    paddingVertical: 20,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statItem: {
    width: "48%",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FF6B35",
  },
  ratingsSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
    fontWeight: "500",
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  ratingCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userTextInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  ratingDate: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  responseButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#FF6B35",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  responseButtonText: {
    color: "#FF6B35",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "500",
  },
  scoresContainer: {
    marginBottom: 12,
  },
  scoreItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  scoreLabel: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  scoreRating: {
    flexDirection: "row",
    alignItems: "center",
  },
  scoreValue: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
  },
  commentContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B35",
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  responseContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#2196f3",
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1976d2",
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 4,
  },
  responseDate: {
    fontSize: 12,
    color: "#666",
  },
  loadMoreButton: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#FF6B35",
    flexDirection: "row",
    justifyContent: "center",
  },
  loadMoreText: {
    color: "#FF6B35",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  responseInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 24,
    backgroundColor: "#fff",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginRight: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666",
  },
  submitButton: {
    flex: 1,
    backgroundColor: "#FF6B35",
    padding: 14,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
});

export default TrainerRatingsScreen;

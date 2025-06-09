import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "@react-navigation/native";
import { authAPI, endpoints } from "../../configs/API";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TrainerRatingsScreen = ({ user }) => {
  const [ratings, setRatings] = useState([]);
  const [averageStats, setAverageStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responseModal, setResponseModal] = useState({
    visible: false,
    ratingId: null,
    existingResponse: null,
  });
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch ratings của trainer hiện tại
  const fetchTrainerRatings = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      const api = authAPI(accessToken);

      // Lấy đánh giá theo trainer_id - sử dụng query parameter
      const ratingsResponse = await api.get(
        `${endpoints.trainerRating}?trainer_id=${user.id}`
      );

      if (ratingsResponse.data) {
        const ratingsData =
          ratingsResponse.data.results || ratingsResponse.data;
        setRatings(ratingsData);

        // Fetch responses cho mỗi rating
        const ratingsWithResponses = await Promise.all(
          ratingsData.map(async (rating) => {
            try {
              const responseData = await fetchRatingResponse(rating.id, api);
              return {
                ...rating,
                responses: responseData,
                myResponse: responseData.find(
                  (r) => r.responder.id === user.id
                ),
              };
            } catch (error) {
              console.log(
                `Error fetching responses for rating ${rating.id}:`,
                error
              );
              return rating;
            }
          })
        );
        setRatings(ratingsWithResponses);
      }

      // Lấy thống kê điểm trung bình
      const statsResponse = await api.get(
        `${endpoints.trainerRating}average/?trainer_id=${user.id}`
      );

      if (statsResponse.data) {
        setAverageStats(statsResponse.data);
      }
    } catch (error) {
      console.error("Error fetching trainer ratings:", error);
      Alert.alert("Lỗi", "Không thể tải dữ liệu đánh giá");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch phản hồi của một đánh giá
  const fetchRatingResponse = async (ratingId, apiInstance = null) => {
    try {
      let api = apiInstance;
      if (!api) {
        const accessToken = await AsyncStorage.getItem("accessToken");
        api = authAPI(accessToken);
      }

      // Sử dụng feedback-response endpoint với filter theo rating
      const response = await api.get(
        `${endpoints.feedbackResponse}?trainer_rating_id=${ratingId}`
      );

      if (response.data) {
        return response.data.results || response.data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching response:", error);
      return [];
    }
  };

  // Gửi phản hồi
  const submitResponse = async () => {
    if (!responseText.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập nội dung phản hồi");
      return;
    }

    setSubmitting(true);
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      const api = authAPI(accessToken);

      let response;

      if (responseModal.existingResponse) {
        // Cập nhật phản hồi hiện có
        response = await api.put(
          `${endpoints.feedbackResponse}${responseModal.existingResponse.id}/`,
          {
            content: responseText,
            trainer_rating: responseModal.ratingId,
          }
        );
      } else {
        // Tạo phản hồi mới
        response = await api.post(endpoints.feedbackResponse, {
          content: responseText,
          trainer_rating: responseModal.ratingId,
        });
      }

      if (response.data) {
        Alert.alert(
          "Thành công",
          responseModal.existingResponse
            ? "Phản hồi đã được cập nhật"
            : "Phản hồi đã được gửi"
        );
        setResponseModal({
          visible: false,
          ratingId: null,
          existingResponse: null,
        });
        setResponseText("");
        fetchTrainerRatings(); // Refresh data
      }
    } catch (error) {
      console.error("Error submitting response:", error);
      const errorMessage =
        error.response?.data?.error || "Không thể gửi phản hồi";
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Mở modal phản hồi
  const openResponseModal = async (ratingId) => {
    const rating = ratings.find((r) => r.id === ratingId);
    const myResponse = rating?.myResponse;

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

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrainerRatings();
  };

  useFocusEffect(
    useCallback(() => {
      fetchTrainerRatings();
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

  // Render từng đánh giá
  const renderRatingItem = (rating) => {
    return (
      <View key={rating.id} style={styles.ratingCard}>
        <View style={styles.ratingHeader}>
          <View>
            <Text style={styles.userName}>
              {rating.user.full_name || rating.user.username}
            </Text>
            <Text style={styles.ratingDate}>
              {new Date(rating.created_at).toLocaleDateString("vi-VN")}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.responseButton}
            onPress={() => openResponseModal(rating.id)}
          >
            <Icon name="reply" size={20} color="#FF6B35" />
            <Text style={styles.responseButtonText}>
              {rating.myResponse ? "Sửa phản hồi" : "Phản hồi"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scoresContainer}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Kiến thức:</Text>
            <Text style={styles.scoreValue}>{rating.knowledge_score}/5</Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Giao tiếp:</Text>
            <Text style={styles.scoreValue}>
              {rating.communication_score}/5
            </Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Đúng giờ:</Text>
            <Text style={styles.scoreValue}>{rating.punctuality_score}/5</Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Tổng thể:</Text>
            <Text style={styles.scoreValue}>{rating.overall_score}/5</Text>
          </View>
        </View>

        {rating.comment && (
          <View style={styles.commentContainer}>
            <Text style={styles.commentLabel}>Nhận xét:</Text>
            <Text style={styles.commentText}>{rating.comment}</Text>
          </View>
        )}

        {rating.myResponse && (
          <View style={styles.responseContainer}>
            <Text style={styles.responseLabel}>Phản hồi của bạn:</Text>
            <Text style={styles.responseText}>{rating.myResponse.content}</Text>
            <Text style={styles.responseDate}>
              {new Date(rating.myResponse.created_at).toLocaleDateString(
                "vi-VN"
              )}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderStats()}

        <View style={styles.ratingsSection}>
          <Text style={styles.sectionTitle}>Đánh giá từ học viên</Text>
          {ratings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="star-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Chưa có đánh giá nào</Text>
            </View>
          ) : (
            ratings.map(renderRatingItem)
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
        <View style={styles.modalContainer}>
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
        </View>
      </Modal>
    </View>
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
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
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
    marginBottom: 12,
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
  },
  scoresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  scoreItem: {
    width: "50%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  scoreLabel: {
    fontSize: 14,
    color: "#666",
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FF6B35",
  },
  commentContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
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
  responseInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 24,
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

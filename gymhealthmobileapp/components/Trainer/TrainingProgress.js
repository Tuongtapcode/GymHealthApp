import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  Dimensions,
  PanResponder  
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { authAPI, endpoints } from "../../configs/API";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import { LineChart } from "react-native-chart-kit";

const TrainingProgress = ({ navigation, route }) => {
  console.log(route.params);
  const { sessionId, memberId, memberName } = route.params;
  const userFromRedux = useSelector((state) => state.user);

  // States for form data
  const [formData, setFormData] = useState({
    weight: "",
    body_fat_percentage: "",
    muscle_mass: "",
    chest: "",
    waist: "",
    hips: "",
    thighs: "",
    arms: "",
    cardio_endurance: "",
    strength_bench: "",
    strength_squat: "",
    strength_deadlift: "",
    notes: "",
  });

  // States for current session and reference data
  const [currentSessionData, setCurrentSessionData] = useState(null); // Dữ liệu của phiên hiện tại
  const [referenceData, setReferenceData] = useState(null); // Dữ liệu tham khảo (phiên mới nhất)
  const [healthInfoId, setHealthInfoId] = useState(null);

  // States for UI
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState("weight");

  // States for progress data
  const [progressHistory, setProgressHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const metrics = [
    { key: "weight", label: "Cân nặng", unit: "kg", icon: "monitor-weight" },
    {
      key: "body_fat_percentage",
      label: "Tỷ lệ mỡ",
      unit: "%",
      icon: "fitness-center",
    },
    {
      key: "muscle_mass",
      label: "Khối lượng cơ",
      unit: "kg",
      icon: "fitness-center",
    },
    { key: "chest", label: "Vòng ngực", unit: "cm", icon: "straighten" },
    { key: "waist", label: "Vòng eo", unit: "cm", icon: "straighten" },
    { key: "hips", label: "Vòng mông", unit: "cm", icon: "straighten" },
    { key: "thighs", label: "Vòng đùi", unit: "cm", icon: "straighten" },
    { key: "arms", label: "Vòng tay", unit: "cm", icon: "straighten" },
    {
      key: "cardio_endurance",
      label: "Sức bền tim mạch",
      unit: "phút",
      icon: "favorite",
    },
    {
      key: "strength_bench",
      label: "Sức mạnh Bench Press",
      unit: "kg",
      icon: "fitness-center",
    },
    {
      key: "strength_squat",
      label: "Sức mạnh Squat",
      unit: "kg",
      icon: "fitness-center",
    },
    {
      key: "strength_deadlift",
      label: "Sức mạnh Deadlift",
      unit: "kg",
      icon: "fitness-center",
    },
  ];

  useEffect(() => {
    loadSessionData();
    loadProgressHistory();
  }, []);

  // Load data for current session and reference data
  const loadSessionData = async () => {
    try {
      setLoading(true);
      const accessToken = await AsyncStorage.getItem("accessToken");
      const api = authAPI(accessToken);

      // First, check if current session has existing data
      const sessionUrl = `${endpoints.trainingProgress}session/${sessionId}`;
      console.log("Checking session data:", sessionUrl);

      let sessionData = null;
      try {
        const sessionResponse = await api.get(sessionUrl);
        if (sessionResponse.data) {
          sessionData = sessionResponse.data;
          setCurrentSessionData(sessionData);
          setHealthInfoId(sessionData.health_info);

          // Pre-fill form with current session data
          setFormData({
            weight: sessionData.weight?.toString() || "",
            body_fat_percentage:
              sessionData.body_fat_percentage?.toString() || "",
            muscle_mass: sessionData.muscle_mass?.toString() || "",
            chest: sessionData.chest?.toString() || "",
            waist: sessionData.waist?.toString() || "",
            hips: sessionData.hips?.toString() || "",
            thighs: sessionData.thighs?.toString() || "",
            arms: sessionData.arms?.toString() || "",
            cardio_endurance: sessionData.cardio_endurance?.toString() || "",
            strength_bench: sessionData.strength_bench?.toString() || "",
            strength_squat: sessionData.strength_squat?.toString() || "",
            strength_deadlift: sessionData.strength_deadlift?.toString() || "",
            notes: sessionData.notes || "",
          });
        }
      } catch (sessionError) {
        console.log("No data for current session, that's okay");
      }

      // If no session data, get latest data for reference and health_info
      if (!sessionData) {
        try {
          const latestUrl = `${endpoints.trainingProgress}latest/${memberId}`;
          console.log("Getting latest data for reference:", latestUrl);
          const latestResponse = await api.get(latestUrl);

          if (latestResponse.data) {
            setReferenceData(latestResponse.data);
            setHealthInfoId(latestResponse.data.health_info);
            // Keep form empty for new entry
          }
        } catch (latestError) {
          console.log("No previous data found, member might be new");
        }
      }
    } catch (error) {
      console.error("Error loading session data:", error);
      Alert.alert("Lỗi", "Không thể tải thông tin phiên tập");
    } finally {
      setLoading(false);
    }
  };

  const loadProgressHistory = async () => {
    try {
      setLoadingHistory(true);
      const accessToken = await AsyncStorage.getItem("accessToken");
      const api = authAPI(accessToken);

      const url = `${endpoints.trainingProgress}member/${memberId}`;
      console.log("API URL:", url);

      const response = await api.get(url);
      console.log("Response status:", response.status);

      if (response.data && Array.isArray(response.data)) {
        console.log("Data loaded successfully, length:", response.data.length);
        setProgressHistory(response.data);
      } else if (response.data && response.data.results) {
        // Fallback cho trường hợp có results
        console.log("Found results, length:", response.data.results.length);
        setProgressHistory(response.data.results);
      } else {
        console.log("No data found, setting empty array");
        setProgressHistory([]);
      }
    } catch (error) {
      console.error("Error loading progress history:", error);
      console.error("Error details:", error.response?.data);
      setProgressHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    // Check if at least one metric is filled
    const hasData = Object.keys(formData).some(
      (key) => key !== "notes" && formData[key].trim() !== ""
    );

    if (!hasData) {
      Alert.alert("Lỗi", "Vui lòng nhập ít nhất một chỉ số để cập nhật");
      return false;
    }

    // Validate numeric fields
    for (const [key, value] of Object.entries(formData)) {
      if (key !== "notes" && value.trim() !== "") {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
          const metric = metrics.find((m) => m.key === key);
          Alert.alert("Lỗi", `${metric?.label || key} phải là số dương`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (!healthInfoId) {
      Alert.alert("Lỗi", "Không tìm thấy thông tin sức khỏe của hội viên");
      return;
    }

    const isUpdate = !!currentSessionData;
    const actionText = isUpdate ? "cập nhật" : "tạo mới";

    Alert.alert(
      "Xác nhận",
      `Bạn có chắc chắn muốn ${actionText} tiến độ tập luyện không?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: async () => {
            try {
              setSubmitting(true);
              const accessToken = await AsyncStorage.getItem("accessToken");
              const api = authAPI(accessToken);

              // Prepare data for API
              const progressData = {
                health_info: healthInfoId,
                workout_session: sessionId,
                notes: formData.notes.trim(),
              };

              // Add only non-empty numeric fields
              Object.keys(formData).forEach((key) => {
                if (key !== "notes" && formData[key].trim() !== "") {
                  progressData[key] = parseFloat(formData[key]);
                }
              });

              let response;
              if (isUpdate) {
                // Update existing record using PATCH
                const updateUrl = `${endpoints.trainingProgress}${currentSessionData.id}/`;
                console.log("Updating record with PATCH:", updateUrl);
                response = await api.patch(updateUrl, progressData);
              } else {
                // Create new record using POST
                console.log(
                  "Creating new record with POST:",
                  endpoints.trainingProgress
                );
                response = await api.post(
                  endpoints.trainingProgress,
                  progressData
                );
              }

              Alert.alert(
                "Thành công",
                `Đã ${actionText} tiến độ tập luyện thành công!`,
                [
                  {
                    text: "OK",
                    onPress: () => {
                      // Reload data
                      loadSessionData();
                      loadProgressHistory();
                    },
                  },
                ]
              );
            } catch (error) {
              console.error("Error submitting progress:", error);
              const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.error ||
                "Không thể cập nhật tiến độ tập luyện";
              Alert.alert("Lỗi", errorMessage);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const renderCurrentDataSection = () => {
    const dataToShow = currentSessionData || referenceData;
    const isCurrentSession = !!currentSessionData;

    if (!dataToShow) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin tham khảo</Text>
          <View style={styles.noDataContainer}>
            <Icon name="info-outline" size={48} color="#ccc" />
            <Text style={styles.noDataText}>Chưa có dữ liệu tham khảo</Text>
            <Text style={styles.noDataSubText}>
              Đây là lần đầu tiên cập nhật tiến độ cho hội viên này
            </Text>
          </View>
        </View>
      );
    }

    const sectionTitle = isCurrentSession
      ? "Dữ liệu (phiên tập hiện tại)  "
      : "Dữ liệu (phiên gần nhất)  ";

    const statusColor = isCurrentSession ? "#4CAF50" : "#FF9800";
    const statusIcon = isCurrentSession ? "check-circle" : "info";
    const statusText = isCurrentSession
      ? "Phiên này đã có dữ liệu"
      : "Phiên chưa có dữ dữ liệu";

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          {/* <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Icon name={statusIcon} size={14} color="#fff" />
            <Text style={styles.statusText}>{statusText}</Text>
          </View> */}
        </View>

        <Text style={styles.lastUpdateText}>
          Cập nhật:{" "}
          {new Date(dataToShow.created_at).toLocaleDateString("vi-VN")}
          {isCurrentSession ? " (phiên này)" : " (phiên trước)"}
        </Text>

        <View style={styles.currentDataGrid}>
          {metrics.map((metric) => {
            const value = dataToShow[metric.key];
            if (value !== null && value !== undefined) {
              return (
                <View key={metric.key} style={styles.currentDataItem}>
                  <Icon name={metric.icon} size={16} color={statusColor} />
                  <Text style={styles.currentDataLabel}>{metric.label}</Text>
                  <Text
                    style={[styles.currentDataValue, { color: statusColor }]}
                  >
                    {value} {metric.unit}
                  </Text>
                </View>
              );
            }
            return null;
          })}
        </View>

        {dataToShow.notes && (
          <View
            style={[
              styles.currentNotesContainer,
              { borderLeftColor: statusColor },
            ]}
          >
            <Text style={styles.currentNotesLabel}>Ghi chú:</Text>
            <Text style={styles.currentNotesText}>{dataToShow.notes}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderMetricInput = (metric) => {
    const referenceValue = currentSessionData
      ? null
      : referenceData?.[metric.key];

    return (
      <View key={metric.key} style={styles.inputGroup}>
        <View style={styles.inputHeader}>
          <Icon name={metric.icon} size={20} color="#4CAF50" />
          <Text style={styles.inputLabel}>{metric.label}</Text>
          <Text style={styles.inputUnit}>({metric.unit})</Text>
          {referenceValue && (
            <Text style={styles.referenceValueHint}>
              Tham khảo: {referenceValue} {metric.unit}
            </Text>
          )}
        </View>
        <TextInput
          style={styles.input}
          value={formData[metric.key]}
          onChangeText={(value) => handleInputChange(metric.key, value)}
          placeholder={`Nhập ${metric.label.toLowerCase()}`}
          keyboardType="numeric"
        />
      </View>
    );
  };

  const getChartData = () => {
    console.log("=== GET CHART DATA ===");
    console.log("Selected metric:", selectedMetric);
    console.log("Progress history length:", progressHistory.length);

    if (progressHistory.length === 0) {
      console.log("No progress history data");
      return null;
    }

    const metric = selectedMetric;

    // Debug: xem dữ liệu của metric được chọn
    console.log(`Checking data for metric: ${metric}`);
    progressHistory.forEach((item, index) => {
      console.log(
        `Item ${index}: ${metric} = ${item[metric]} (type: ${typeof item[
          metric
        ]})`
      );
    });

    const filteredData = progressHistory.filter((item) => {
      const value = item[metric];
      const isValid =
        value !== null && value !== undefined && value !== "" && !isNaN(value);
      console.log(`Item ${item.id}: ${metric} = ${value}, isValid: ${isValid}`);
      return isValid;
    });

    console.log("Filtered data length:", filteredData.length);

    if (filteredData.length === 0) {
      console.log(`No valid data found for metric: ${metric}`);
      return null;
    }

    // Sắp xếp theo thời gian và lấy 10 điểm gần nhất
    const sortedData = filteredData
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .slice(-10);

    console.log("Final data for chart:", sortedData.length, "points");

    const chartData = {
      labels: sortedData.map((item) => {
        const date = new Date(item.created_at);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      }),
      datasets: [
        {
          data: sortedData.map((item) => parseFloat(item[metric])),
          strokeWidth: 2,
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
        },
      ],
    };

    console.log("Chart data created:", {
      labels: chartData.labels,
      dataPoints: chartData.datasets[0].data,
    });

    return chartData;
  };

  const ChartModal = () => {
    const chartData = getChartData();
    const selectedMetricInfo = metrics.find((m) => m.key === selectedMetric);

    // Tìm index của metric hiện tại
    const currentMetricIndex = metrics.findIndex(
      (m) => m.key === selectedMetric
    );

    console.log("=== CHART MODAL RENDER ===");
    console.log("Chart data exists:", !!chartData);
    console.log("Loading history:", loadingHistory);

    // Hàm xử lý swipe sang trái (metric tiếp theo)
    const handleSwipeLeft = () => {
      const nextIndex = (currentMetricIndex + 1) % metrics.length;
      console.log("Swipe left - next metric:", metrics[nextIndex].key);
      setSelectedMetric(metrics[nextIndex].key);
    };

    // Hàm xử lý swipe sang phải (metric trước đó)
    const handleSwipeRight = () => {
      const prevIndex =
        currentMetricIndex === 0 ? metrics.length - 1 : currentMetricIndex - 1;
      console.log("Swipe right - previous metric:", metrics[prevIndex].key);
      setSelectedMetric(metrics[prevIndex].key);
    };

    // Sử dụng PanResponder thay vì PanGestureHandler
    const panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Chỉ kích hoạt khi vuốt ngang (không phải dọc)
        return (
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 10
        );
      },
      onPanResponderMove: (evt, gestureState) => {
        // Có thể thêm hiệu ứng visual feedback ở đây nếu cần
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx, vx } = gestureState;

        // Swipe sang trái (chuyển sang metric tiếp theo)
        if (dx < -50 && vx < -0.3) {
          handleSwipeLeft();
        }
        // Swipe sang phải (chuyển sang metric trước đó)
        else if (dx > 50 && vx > 0.3) {
          handleSwipeRight();
        }
      },
    });

    return (
      <Modal
        visible={showChart}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowChart(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.chartModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Biểu đồ tiến bộ - {selectedMetricInfo?.label}
              </Text>
              <TouchableOpacity onPress={() => setShowChart(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.chartContainer}>
              <View style={styles.metricSelector}>
                <Text style={styles.sectionTitle}>Chọn chỉ số:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {metrics.map((metric) => (
                    <TouchableOpacity
                      key={metric.key}
                      style={[
                        styles.metricButton,
                        selectedMetric === metric.key &&
                          styles.metricButtonSelected,
                      ]}
                      onPress={() => {
                        console.log("Metric selected:", metric.key);
                        setSelectedMetric(metric.key);
                      }}
                    >
                      <Text
                        style={[
                          styles.metricButtonText,
                          selectedMetric === metric.key &&
                            styles.metricButtonTextSelected,
                        ]}
                      >
                        {metric.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Thêm chỉ báo swipe */}
              <View style={styles.swipeIndicator}>
                <Text style={styles.swipeText}>← Vuốt để chuyển chỉ số →</Text>
                <Text style={styles.swipeSubText}>
                  {currentMetricIndex + 1} / {metrics.length}
                </Text>
              </View>

              {loadingHistory ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4CAF50" />
                  <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
                </View>
              ) : chartData ? (
                <View style={styles.chartWrapper} {...panResponder.panHandlers}>
                  <LineChart
                    data={chartData}
                    width={Dimensions.get("window").width - 60}
                    height={250}
                    chartConfig={{
                      backgroundColor: "#ffffff",
                      backgroundGradientFrom: "#ffffff",
                      backgroundGradientTo: "#ffffff",
                      decimalPlaces: 1,
                      color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      style: {
                        borderRadius: 16,
                      },
                      propsForDots: {
                        r: "4",
                        strokeWidth: "2",
                        stroke: "#4CAF50",
                      },
                    }}
                    bezier
                    style={styles.chart}
                  />
                  <Text style={styles.chartUnit}>
                    Đơn vị: {selectedMetricInfo?.unit}
                  </Text>
                  <Text style={styles.dataPointsInfo}>
                    Hiển thị {chartData.datasets[0].data.length} điểm dữ liệu
                  </Text>
                </View>
              ) : (
                <View style={styles.noDataContainer}>
                  <Icon name="insert-chart" size={64} color="#ccc" />
                  <Text style={styles.noDataText}>
                    Chưa có dữ liệu cho chỉ số này
                  </Text>
                  <Text style={styles.noDataSubText}>
                    Chỉ số "{selectedMetricInfo?.label}" chưa được cập nhật
                  </Text>

                  {/* Debug info */}
                  <View style={styles.debugContainer}>
                    <Text style={styles.debugTitle}>Thông tin debug:</Text>
                    <Text style={styles.debugText}>
                      Tổng số bản ghi: {progressHistory.length}
                    </Text>
                    <Text style={styles.debugText}>
                      Chỉ số được chọn: {selectedMetric}
                    </Text>
                    {progressHistory.length > 0 && (
                      <Text style={styles.debugText}>
                        Giá trị mẫu:{" "}
                        {progressHistory[0][selectedMetric] || "null"}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {progressHistory.length > 0 && (
                <View style={styles.historySection}>
                  <Text style={styles.sectionTitle}>
                    Lịch sử cập nhật gần đây:
                  </Text>
                  {progressHistory.slice(0, 5).map((item, index) => (
                    <View key={index} style={styles.historyItem}>
                      <Text style={styles.historyDate}>
                        {new Date(item.created_at).toLocaleDateString("vi-VN")}
                      </Text>
                      <Text style={styles.historyValue}>
                        {selectedMetricInfo?.label}:{" "}
                        {item[selectedMetric] || "N/A"}{" "}
                        {selectedMetricInfo?.unit}
                      </Text>
                      {item.notes && (
                        <Text style={styles.historyNotes}>{item.notes}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Đang tải thông tin...</Text>
      </View>
    );
  }

  const isUpdating = !!currentSessionData;
  const formTitle = isUpdating
    ? "Cập nhật dữ liệu phiên này"
    : "Tạo dữ liệu mới cho phiên này";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {isUpdating ? "Cập nhật tiến độ" : "Tạo tiến độ mới"}
          </Text>
          <Text style={styles.headerSubtitle}>{memberName}</Text>
        </View>
        <TouchableOpacity
          style={styles.chartButton}
          onPress={() => setShowChart(true)}
        >
          <Icon name="insert-chart" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {renderCurrentDataSection()}

        <View style={styles.section}>
          <View style={styles.formHeader}>
            <Text style={styles.sectionTitle}>{formTitle}</Text>
            {!isUpdating && (
              <View style={styles.newEntryBadge}>
                <Icon name="add-circle" size={16} color="#2196F3" />
                <Text style={styles.newEntryText}>Tạo mới</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chỉ số cơ thể</Text>
          {metrics.slice(0, 3).map(renderMetricInput)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Số đo cơ thể</Text>
          {metrics.slice(3, 8).map(renderMetricInput)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chỉ số thể lực</Text>
          {metrics.slice(8).map(renderMetricInput)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ghi chú</Text>
          <TextInput
            style={styles.notesInput}
            value={formData.notes}
            onChangeText={(value) => handleInputChange("notes", value)}
            placeholder="Nhập ghi chú về buổi tập, cảm nhận của hội viên..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            submitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name={isUpdating ? "save" : "add"} size={20} color="#fff" />
              <Text style={styles.submitButtonText}>
                {isUpdating ? "Cập nhật tiến độ" : "Tạo tiến độ mới"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <ChartModal />
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
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  chartButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 0,
  },
  newEntryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newEntryText: {
    color: "#2196F3",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  lastUpdateText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 12,
    fontStyle: "italic",
  },
  currentDataGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  currentDataItem: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    padding: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  currentDataLabel: {
    fontSize: 12,
    color: "#333",
    marginLeft: 6,
    flex: 1,
  },
  currentDataValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  currentNotesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  currentNotesLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  currentNotesText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  noDataContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  noDataText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  noDataSubText: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginLeft: 8,
    flex: 1,
  },
  inputUnit: {
    fontSize: 12,
    color: "#666",
  },
  referenceValueHint: {
    fontSize: 10,
    color: "#FF9800",
    marginLeft: 8,
    fontStyle: "italic",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#fafafa",
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#fafafa",
    minHeight: 100,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 32,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "#cccccc",
    elevation: 0,
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  chartModalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    margin: 20,
    maxHeight: "90%",
    width: "90%",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  chartContainer: {
    padding: 20,
  },
  metricSelector: {
    marginBottom: 20,
  },
  metricButton: {
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  metricButtonSelected: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  metricButtonText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  metricButtonTextSelected: {
    color: "#fff",
  },
  chartWrapper: {
    alignItems: "center",
    marginBottom: 20,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartUnit: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  // History section styles
  historySection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  historyItem: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#4CAF50",
  },
  historyDate: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    marginBottom: 4,
  },
  historyValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    marginBottom: 2,
  },
  historyNotes: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 4,
  },
  // Thêm styles cho swipe indicator
    swipeIndicator: {
      alignItems: 'center',
      paddingVertical: 10,
      marginBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
    },
    swipeText: {
      fontSize: 14,
      color: '#666',
      fontStyle: 'italic',
    },
    swipeSubText: {
      fontSize: 12,
      color: '#999',
      marginTop: 2,
    },
    chartWrapper: {
      // Thêm padding để tạo không gian cho gesture
      paddingHorizontal: 5,
      marginVertical: 10,
    },
});

export default TrainingProgress;

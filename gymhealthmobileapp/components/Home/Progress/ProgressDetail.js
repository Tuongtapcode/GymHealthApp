import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axiosInstance, { endpoints } from "../../../configs/API";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LineChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";

const ProgressDetail = ({ route, navigation }) => {
  const { recordId } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progressRecord, setProgressRecord] = useState(null);
  const [history, setHistory] = useState([]);

  // Fetch specific progress record
  const fetchProgressRecord = async () => {
    try {
      setLoading(true);
      setError(null);

      // Lấy access token từ AsyncStorage
      const accessToken = await AsyncStorage.getItem("accessToken");

      if (!accessToken) {
        throw new Error("Không tìm thấy token đăng nhập");
      }

      const response = await axiosInstance.get(
        `${endpoints.trainingProgress}${recordId}/`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data) {
        // Format dữ liệu
        const record = response.data;
        const formattedRecord = {
          id: record.id,
          date: record.date,
          weight: record.weight,
          bodyFatPercentage: record.body_fat_percentage,
          muscleMass: record.muscle_mass,
          measurements: {
            chest: record.chest,
            waist: record.waist,
            hips: record.hips,
            thighs: record.thighs,
            arms: record.arms,
          },
          fitness: {
            cardioEndurance: record.cardio_endurance,
            strengthBench: record.strength_bench,
            strengthSquat: record.strength_squat,
            strengthDeadlift: record.strength_deadlift,
          },
          notes: record.notes,
          memberUsername: record.member_username,
          trainerUsername: record.trainer_username,
          workoutSession: record.workout_session,
          createdAt: record.created_at,
          originalData: record,
        };

        setProgressRecord(formattedRecord);

        // Fetch history for comparison
        fetchProgressHistory();
      }
    } catch (error) {
      console.error("Error fetching progress record:", error);
      setError("Không thể tải dữ liệu chi tiết");
    } finally {
      setLoading(false);
    }
  };

  // Fetch progress history to show trends
  const fetchProgressHistory = async () => {
    try {
      // Lấy access token từ AsyncStorage
      const accessToken = await AsyncStorage.getItem("accessToken");

      if (!accessToken) {
        throw new Error("Không tìm thấy token đăng nhập");
      }

      const response = await axiosInstance.get(
        endpoints.trainingProgress + "my-progress/",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data && Array.isArray(response.data)) {
        // Sắp xếp theo ngày
        const sortedRecords = response.data.sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        );

        // Format dữ liệu
        const formattedRecords = sortedRecords.map((record) => {
          return {
            id: record.id,
            date: record.date,
            weight: record.weight,
            bodyFatPercentage: record.body_fat_percentage,
            muscleMass: record.muscle_mass,
          };
        });

        setHistory(formattedRecords);
      }
    } catch (error) {
      console.error("Error fetching training progress history:", error);
    }
  };

  // Delete progress record
  const handleDelete = async () => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa dữ liệu này không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      const accessToken = await AsyncStorage.getItem("accessToken");

      if (!accessToken) {
        throw new Error("Không tìm thấy token đăng nhập");
      }

      await axiosInstance.delete(`${endpoints.trainingProgress}${recordId}/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      Alert.alert("Thành công", "Đã xóa dữ liệu tiến độ tập luyện");
      navigation.goBack();
    } catch (error) {
      console.error("Error deleting record:", error);
      setError("Không thể xóa dữ liệu");
      setLoading(false);
    }
  };

  // Load data when component mounts
  useEffect(() => {
    fetchProgressRecord();
  }, [recordId]);

  // Render weight chart
  const renderWeightChart = () => {
    if (history.length < 2) {
      return null;
    }

    // Lấy tối đa 7 điểm dữ liệu gần nhất để hiển thị
    const recentHistory = history.slice(-7);

    const data = {
      labels: recentHistory.map((item) =>
        new Date(item.date).toLocaleDateString("vi-VN", {
          day: "numeric",
          month: "numeric",
        })
      ),
      datasets: [
        {
          data: recentHistory.map((item) => item.weight),
          color: (opacity = 1) => `rgba(26, 115, 232, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };

    const chartConfig = {
      backgroundGradientFrom: "#fff",
      backgroundGradientTo: "#fff",
      decimalPlaces: 1,
      color: (opacity = 1) => `rgba(26, 115, 232, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: "6",
        strokeWidth: "2",
        stroke: "#1a73e8",
      },
    };

    const screenWidth = Dimensions.get("window").width - 32;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Thay đổi cân nặng</Text>
        <LineChart
          data={data}
          width={screenWidth}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withDots={true}
          withInnerLines={true}
          withVerticalLines={false}
        />
      </View>
    );
  };

  // Render body composition chart
  const renderBodyCompositionChart = () => {
    if (history.length < 2) {
      return null;
    }

    // Lấy tối đa 7 điểm dữ liệu gần nhất để hiển thị
    const recentHistory = history.slice(-7);

    const data = {
      labels: recentHistory.map((item) =>
        new Date(item.date).toLocaleDateString("vi-VN", {
          day: "numeric",
          month: "numeric",
        })
      ),
      datasets: [
        {
          data: recentHistory.map((item) => item.bodyFatPercentage),
          color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
          strokeWidth: 2,
        },
        {
          data: recentHistory.map((item) => item.muscleMass),
          color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      legend: ["Tỷ lệ mỡ (%)", "Tỷ lệ cơ (%)"],
    };

    const chartConfig = {
      backgroundGradientFrom: "#fff",
      backgroundGradientTo: "#fff",
      decimalPlaces: 1,
      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: "5",
        strokeWidth: "2",
      },
    };

    const screenWidth = Dimensions.get("window").width - 32;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Thay đổi thành phần cơ thể</Text>
        <LineChart
          data={data}
          width={screenWidth}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withDots={true}
          withInnerLines={true}
          withVerticalLines={false}
          legend={data.legend}
        />
      </View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1a73e8" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết tiến độ</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a73e8" />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1a73e8" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết tiến độ</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color="#d32f2f" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={fetchProgressRecord}
          >
            <Text style={styles.buttonPrimaryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // No data state
  if (!progressRecord) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1a73e8" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết tiến độ</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#999" />
          <Text style={styles.errorText}>Không tìm thấy dữ liệu</Text>
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonPrimaryText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1a73e8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết tiến độ</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() =>
              navigation.navigate("EditProgress", { record: progressRecord })
            }
          >
            <Ionicons name="create-outline" size={24} color="#1a73e8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color="#d32f2f" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={24} color="#555" />
          <Text style={styles.dateText}>
            {new Date(progressRecord.date).toLocaleDateString("vi-VN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông số cơ bản</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statsItem}>
              <Text style={styles.statsLabel}>Cân nặng</Text>
              <Text style={styles.statsValue}>{progressRecord.weight} kg</Text>
            </View>
            <View style={styles.statsItem}>
              <Text style={styles.statsLabel}>Tỷ lệ mỡ</Text>
              <Text style={styles.statsValue}>
                {progressRecord.bodyFatPercentage}%
              </Text>
            </View>
            <View style={styles.statsItem}>
              <Text style={styles.statsLabel}>Tỷ lệ cơ</Text>
              <Text style={styles.statsValue}>
                {progressRecord.muscleMass}%
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Số đo chi tiết</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statsItem}>
              <Text style={styles.statsLabel}>Ngực</Text>
              <Text style={styles.statsValue}>
                {progressRecord.measurements.chest} cm
              </Text>
            </View>
            <View style={styles.statsItem}>
              <Text style={styles.statsLabel}>Eo</Text>
              <Text style={styles.statsValue}>
                {progressRecord.measurements.waist} cm
              </Text>
            </View>
            <View style={styles.statsItem}>
              <Text style={styles.statsLabel}>Hông</Text>
              <Text style={styles.statsValue}>
                {progressRecord.measurements.hips} cm
              </Text>
            </View>
            <View style={styles.statsItem}>
              <Text style={styles.statsLabel}>Đùi</Text>
              <Text style={styles.statsValue}>
                {progressRecord.measurements.thighs} cm
              </Text>
            </View>
            <View style={styles.statsItem}>
              <Text style={styles.statsLabel}>Tay</Text>
              <Text style={styles.statsValue}>
                {progressRecord.measurements.arms} cm
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thành tích thể lực</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statsItem}>
              <Text style={styles.statsLabel}>Cardio</Text>
              <Text style={styles.statsValue}>
                {progressRecord.fitness.cardioEndurance || "Chưa ghi nhận"}
              </Text>
            </View>
            <View style={styles.statsItem}>
              <Text style={styles.statsLabel}>Đẩy ngực</Text>
              <Text style={styles.statsValue}>
                {progressRecord.fitness.strengthBench
                  ? `${progressRecord.fitness.strengthBench} kg`
                  : "Chưa ghi nhận"}
              </Text>
            </View>
            <View style={styles.statsItem}>
              <Text style={styles.statsLabel}>Squats</Text>
              <Text style={styles.statsValue}>
                {progressRecord.fitness.strengthSquat
                  ? `${progressRecord.fitness.strengthSquat} kg`
                  : "Chưa ghi nhận"}
              </Text>
            </View>
            <View style={styles.statsItem}>
              <Text style={styles.statsLabel}>Deadlift</Text>
              <Text style={styles.statsValue}>
                {progressRecord.fitness.strengthDeadlift
                  ? `${progressRecord.fitness.strengthDeadlift} kg`
                  : "Chưa ghi nhận"}
              </Text>
            </View>
          </View>
        </View>

        {renderWeightChart()}
        {renderBodyCompositionChart()}

        {progressRecord.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ghi chú</Text>
            <Text style={styles.notesText}>{progressRecord.notes}</Text>
          </View>
        )}

        {progressRecord.trainerUsername && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Thông tin phiên tập</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>HLV:</Text>
              <Text style={styles.infoValue}>
                {progressRecord.trainerUsername}
              </Text>
            </View>
            {progressRecord.workoutSession && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Buổi tập:</Text>
                <Text style={styles.infoValue}>
                  #{progressRecord.workoutSession}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 16,
  },
  backButton: {
    padding: 4,
  },
  headerActions: {
    flexDirection: "row",
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  scrollContent: {
    padding: 16,
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
    padding: 16,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  buttonPrimary: {
    backgroundColor: "#1a73e8",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
  },
  buttonPrimaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
    marginLeft: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
  },
  statsItem: {
    width: "33.33%",
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  statsLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  notesText: {
    fontSize: 15,
    color: "#444",
    lineHeight: 22,
  },
  chartContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
    textAlign: "center",
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
});

export default ProgressDetail;

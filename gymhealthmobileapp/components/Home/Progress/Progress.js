import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import { LineChart, BarChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";
import axiosInstance, { endpoints } from "../../../configs/API";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Progress = ({ navigation }) => {
  const [trainingProgress, setTrainingProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // 'overview', 'body', 'fitness', 'history'
  const [selectedTimeRange, setSelectedTimeRange] = useState("all"); // 'week', 'month', 'year', 'all'

  const screenWidth = Dimensions.get("window").width;

  useEffect(() => {
    fetchTrainingProgress();
  }, []);

  const fetchTrainingProgress = async () => {
    try {
      setLoading(true);
      setError(null);

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
        // Sắp xếp theo ngày mới nhất
        const sortedRecords = response.data.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );

        // Format dữ liệu
        const formattedRecords = sortedRecords.map((record) => {
          return {
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
        });

        setTrainingProgress(formattedRecords);
      } else {
        setTrainingProgress([]);
      }
    } catch (error) {
      console.error("Error fetching training progress:", error);
      setError("Không thể tải dữ liệu tiến triển luyện tập");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrainingProgress();
  };

  // Tính toán sự thay đổi giữa hai giá trị
  const calculateChange = (currentValue, previousValue) => {
    if (!previousValue || previousValue === 0) return null;
    return currentValue - previousValue;
  };

  // Format sự thay đổi với dấu + hoặc -
  const formatChange = (change) => {
    if (change === null) return "";
    return `${change > 0 ? "+" : ""}${change.toFixed(1)}`;
  };

  // Lọc dữ liệu theo khoảng thời gian
  const getFilteredData = () => {
    if (selectedTimeRange === "all" || trainingProgress.length === 0) {
      return trainingProgress;
    }

    const now = new Date();
    const filtered = trainingProgress.filter((record) => {
      const recordDate = new Date(record.date);

      if (selectedTimeRange === "week") {
        // 7 ngày gần nhất
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return recordDate >= weekAgo;
      } else if (selectedTimeRange === "month") {
        // 30 ngày gần nhất
        const monthAgo = new Date(now);
        monthAgo.setDate(now.getDate() - 30);
        return recordDate >= monthAgo;
      } else if (selectedTimeRange === "year") {
        // 365 ngày gần nhất
        const yearAgo = new Date(now);
        yearAgo.setDate(now.getDate() - 365);
        return recordDate >= yearAgo;
      }

      return true;
    });

    return filtered;
  };

  // Chuẩn bị dữ liệu cho biểu đồ
  const prepareChartData = () => {
    const filteredData = getFilteredData().slice(0, 10).reverse(); // Lấy 10 bản ghi và đảo ngược để hiển thị từ cũ đến mới

    // Nếu không có dữ liệu hoặc chỉ có 1 bản ghi
    if (filteredData.length === 0) {
      return {
        labels: ["Không có dữ liệu"],
        datasets: [
          { data: [0], color: () => "rgba(26, 115, 232, 1)", strokeWidth: 2 },
          { data: [0], color: () => "rgba(255, 99, 132, 1)", strokeWidth: 2 },
          { data: [0], color: () => "rgba(75, 192, 192, 1)", strokeWidth: 2 },
        ],
        legend: ["Cân nặng", "Tỷ lệ mỡ", "Tỷ lệ cơ"],
      };
    }

    const chartData = {
      labels: [],
      datasets: [
        {
          data: [],
          color: (opacity = 1) => `rgba(26, 115, 232, ${opacity})`, // màu blue cho cân nặng
          strokeWidth: 2,
        },
        {
          data: [],
          color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`, // màu red cho tỷ lệ mỡ
          strokeWidth: 2,
        },
        {
          data: [],
          color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`, // màu green cho tỷ lệ cơ
          strokeWidth: 2,
        },
      ],
      legend: ["Cân nặng", "Tỷ lệ mỡ", "Tỷ lệ cơ"],
    };

    filteredData.forEach((record) => {
      // Format ngày tháng đẹp hơn cho labels
      const date = new Date(record.date);
      chartData.labels.push(`${date.getDate()}/${date.getMonth() + 1}`);

      // Thêm dữ liệu cho các dataset
      chartData.datasets[0].data.push(record.weight);
      chartData.datasets[1].data.push(record.bodyFatPercentage);
      chartData.datasets[2].data.push(record.muscleMass);
    });

    return chartData;
  };

  // Chuẩn bị dữ liệu cho biểu đồ số đo cơ thể
  const prepareBodyMeasurementChart = () => {
    const filteredData = getFilteredData().slice(0, 5).reverse(); // Lấy 5 bản ghi gần nhất

    // Nếu không có dữ liệu hoặc chỉ có 1 bản ghi
    if (filteredData.length === 0) {
      return {
        labels: ["Không có dữ liệu"],
        datasets: [
          { data: [0] },
          { data: [0] },
          { data: [0] },
          { data: [0] },
          { data: [0] },
        ],
      };
    }

    const chartData = {
      labels: [],
      datasets: [
        { data: [] }, // Ngực
        { data: [] }, // Eo
        { data: [] }, // Hông
        { data: [] }, // Đùi
        { data: [] }, // Cánh tay
      ],
    };

    filteredData.forEach((record) => {
      // Format ngày tháng đẹp hơn cho labels
      const date = new Date(record.date);
      chartData.labels.push(`${date.getDate()}/${date.getMonth() + 1}`);

      // Thêm dữ liệu cho các dataset
      chartData.datasets[0].data.push(record.measurements.chest);
      chartData.datasets[1].data.push(record.measurements.waist);
      chartData.datasets[2].data.push(record.measurements.hips);
      chartData.datasets[3].data.push(record.measurements.thighs);
      chartData.datasets[4].data.push(record.measurements.arms);
    });

    return chartData;
  };

  // Chuẩn bị dữ liệu cho biểu đồ thể lực
  const prepareFitnessChart = () => {
    const filteredData = getFilteredData().slice(0, 5).reverse(); // Lấy 5 bản ghi gần nhất

    // Nếu không có dữ liệu
    if (filteredData.length === 0) {
      return {
        labels: ["Không có dữ liệu"],
        datasets: [{ data: [0] }, { data: [0] }, { data: [0] }, { data: [0] }],
      };
    }

    const chartData = {
      labels: [],
      datasets: [
        { data: [] }, // Cardio Endurance
        { data: [] }, // Bench Press
        { data: [] }, // Squat
        { data: [] }, // Deadlift
      ],
    };

    filteredData.forEach((record) => {
      // Format ngày tháng đẹp hơn cho labels
      const date = new Date(record.date);
      chartData.labels.push(`${date.getDate()}/${date.getMonth() + 1}`);

      // Thêm dữ liệu cho các dataset
      chartData.datasets[0].data.push(record.fitness.cardioEndurance || 0);
      chartData.datasets[1].data.push(record.fitness.strengthBench || 0);
      chartData.datasets[2].data.push(record.fitness.strengthSquat || 0);
      chartData.datasets[3].data.push(record.fitness.strengthDeadlift || 0);
    });

    return chartData;
  };

  // Hiển thị các tab điều hướng
  const renderTabs = () => {
    return (
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "overview" && styles.activeTab]}
          onPress={() => setActiveTab("overview")}
        >
          <Ionicons
            name="stats-chart"
            size={20}
            color={activeTab === "overview" ? "#1a73e8" : "#666"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "overview" && styles.activeTabText,
            ]}
          >
            Tổng quan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "body" && styles.activeTab]}
          onPress={() => setActiveTab("body")}
        >
          <Ionicons
            name="body"
            size={20}
            color={activeTab === "body" ? "#1a73e8" : "#666"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "body" && styles.activeTabText,
            ]}
          >
            Số đo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "fitness" && styles.activeTab]}
          onPress={() => setActiveTab("fitness")}
        >
          <Ionicons
            name="fitness"
            size={20}
            color={activeTab === "fitness" ? "#1a73e8" : "#666"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "fitness" && styles.activeTabText,
            ]}
          >
            Thể lực
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "history" && styles.activeTab]}
          onPress={() => setActiveTab("history")}
        >
          <Ionicons
            name="time"
            size={20}
            color={activeTab === "history" ? "#1a73e8" : "#666"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "history" && styles.activeTabText,
            ]}
          >
            Lịch sử
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render bộ lọc thời gian
  const renderTimeFilter = () => {
    return (
      <View style={styles.timeFilterContainer}>
        <Text style={styles.filterLabel}>Khoảng thời gian:</Text>
        <View style={styles.filterOptions}>
          <TouchableOpacity
            style={[
              styles.filterOption,
              selectedTimeRange === "week" && styles.selectedFilterOption,
            ]}
            onPress={() => setSelectedTimeRange("week")}
          >
            <Text
              style={[
                styles.filterOptionText,
                selectedTimeRange === "week" && styles.selectedFilterOptionText,
              ]}
            >
              Tuần
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterOption,
              selectedTimeRange === "month" && styles.selectedFilterOption,
            ]}
            onPress={() => setSelectedTimeRange("month")}
          >
            <Text
              style={[
                styles.filterOptionText,
                selectedTimeRange === "month" &&
                  styles.selectedFilterOptionText,
              ]}
            >
              Tháng
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterOption,
              selectedTimeRange === "year" && styles.selectedFilterOption,
            ]}
            onPress={() => setSelectedTimeRange("year")}
          >
            <Text
              style={[
                styles.filterOptionText,
                selectedTimeRange === "year" && styles.selectedFilterOptionText,
              ]}
            >
              Năm
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterOption,
              selectedTimeRange === "all" && styles.selectedFilterOption,
            ]}
            onPress={() => setSelectedTimeRange("all")}
          >
            <Text
              style={[
                styles.filterOptionText,
                selectedTimeRange === "all" && styles.selectedFilterOptionText,
              ]}
            >
              Tất cả
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render tabView nội dung
  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return renderOverviewTab();
      case "body":
        return renderBodyTab();
      case "fitness":
        return renderFitnessTab();
      case "history":
        return renderHistoryTab();
      default:
        return renderOverviewTab();
    }
  };

  // Render Tab Tổng quan
  const renderOverviewTab = () => {
    const chartData = prepareChartData();

    // Lấy bản ghi mới nhất và bản ghi trước đó (nếu có)
    const latestRecord = trainingProgress[0];
    const previousRecord =
      trainingProgress.length > 1 ? trainingProgress[1] : null;

    // Nếu không có dữ liệu
    if (!latestRecord) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#999" />
          <Text style={styles.noDataText}>
            Chưa có dữ liệu tiến độ tập luyện
          </Text>
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() => navigation.navigate("AddProgress")}
          >
            <Text style={styles.buttonPrimaryText}>Thêm dữ liệu</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Tính toán sự thay đổi
    const weightChange = calculateChange(
      latestRecord.weight,
      previousRecord?.weight
    );
    const fatChange = calculateChange(
      latestRecord.bodyFatPercentage,
      previousRecord?.bodyFatPercentage
    );
    const muscleChange = calculateChange(
      latestRecord.muscleMass,
      previousRecord?.muscleMass
    );

    // Tính BMI (nếu có chiều cao trong dữ liệu)
    let bmi = null;
    let bmiChange = null;
    let bmiCategory = "";

    if (latestRecord.originalData && latestRecord.originalData.height) {
      const heightInMeters = latestRecord.originalData.height / 100; // chuyển từ cm sang m
      bmi = latestRecord.weight / (heightInMeters * heightInMeters);

      // Phân loại BMI
      if (bmi < 18.5) {
        bmiCategory = "Thiếu cân";
      } else if (bmi < 25) {
        bmiCategory = "Bình thường";
      } else if (bmi < 30) {
        bmiCategory = "Thừa cân";
      } else {
        bmiCategory = "Béo phì";
      }

      if (
        previousRecord &&
        previousRecord.originalData &&
        previousRecord.originalData.height
      ) {
        const prevHeightInMeters = previousRecord.originalData.height / 100;
        const prevBmi =
          previousRecord.weight / (prevHeightInMeters * prevHeightInMeters);
        bmiChange = bmi - prevBmi;
      }
    }

    return (
      <View style={styles.tabContent}>
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Tiến độ tập luyện</Text>
          <LineChart
            data={chartData}
            width={screenWidth - 32}
            height={220}
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: "#ffffff",
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#ffffff",
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "4", strokeWidth: "1" },
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
            legend={chartData.legend}
          />
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Cân nặng</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statsValue}>{latestRecord.weight} kg</Text>
              {weightChange !== null && (
                <Text
                  style={[
                    styles.statsChange,
                    weightChange < 0
                      ? styles.positiveChange
                      : styles.negativeChange,
                  ]}
                >
                  {formatChange(weightChange)}
                </Text>
              )}
            </View>
            <Text style={styles.statsDate}>
              Cập nhật:{" "}
              {new Date(latestRecord.date).toLocaleDateString("vi-VN")}
            </Text>
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Tỷ lệ mỡ</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statsValue}>
                {latestRecord.bodyFatPercentage} %
              </Text>
              {fatChange !== null && (
                <Text
                  style={[
                    styles.statsChange,
                    fatChange < 0
                      ? styles.positiveChange
                      : styles.negativeChange,
                  ]}
                >
                  {formatChange(fatChange)}
                </Text>
              )}
            </View>
            <Text style={styles.statsDate}>
              Cập nhật:{" "}
              {new Date(latestRecord.date).toLocaleDateString("vi-VN")}
            </Text>
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Tỷ lệ cơ</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statsValue}>{latestRecord.muscleMass} %</Text>
              {muscleChange !== null && (
                <Text
                  style={[
                    styles.statsChange,
                    muscleChange > 0
                      ? styles.positiveChange
                      : styles.negativeChange,
                  ]}
                >
                  {formatChange(muscleChange)}
                </Text>
              )}
            </View>
            <Text style={styles.statsDate}>
              Cập nhật:{" "}
              {new Date(latestRecord.date).toLocaleDateString("vi-VN")}
            </Text>
          </View>

          {bmi !== null && (
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>BMI</Text>
              <View style={styles.statsRow}>
                <Text style={styles.statsValue}>{bmi.toFixed(1)}</Text>
                {bmiChange !== null && (
                  <Text
                    style={[
                      styles.statsChange,
                      bmiChange < 0
                        ? styles.positiveChange
                        : styles.negativeChange,
                    ]}
                  >
                    {formatChange(bmiChange)}
                  </Text>
                )}
              </View>
              <Text style={styles.bmiCategory}>{bmiCategory}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Render Tab Số đo
  const renderBodyTab = () => {
    const bodyChartData = prepareBodyMeasurementChart();

    // Lấy bản ghi mới nhất và bản ghi trước đó (nếu có)
    const latestRecord = trainingProgress[0];
    const previousRecord =
      trainingProgress.length > 1 ? trainingProgress[1] : null;

    // Nếu không có dữ liệu
    if (!latestRecord) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#999" />
          <Text style={styles.noDataText}>Chưa có dữ liệu số đo cơ thể</Text>
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() => navigation.navigate("AddProgress")}
          >
            <Text style={styles.buttonPrimaryText}>Thêm dữ liệu</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Số đo cơ thể</Text>
          <LineChart
            data={{
              labels: bodyChartData.labels,
              datasets: [
                {
                  data: bodyChartData.datasets[0].data,
                  color: () => "rgba(26, 115, 232, 1)", // Blue for chest
                  strokeWidth: 2,
                },
                {
                  data: bodyChartData.datasets[1].data,
                  color: () => "rgba(255, 99, 132, 1)", // Red for waist
                  strokeWidth: 2,
                },
                {
                  data: bodyChartData.datasets[2].data,
                  color: () => "rgba(75, 192, 192, 1)", // Green for hips
                  strokeWidth: 2,
                },
                {
                  data: bodyChartData.datasets[3].data,
                  color: () => "rgba(255, 159, 64, 1)", // Orange for thighs
                  strokeWidth: 2,
                },
                {
                  data: bodyChartData.datasets[4].data,
                  color: () => "rgba(153, 102, 255, 1)", // Purple for arms
                  strokeWidth: 2,
                },
              ],
              legend: ["Ngực", "Eo", "Hông", "Đùi", "Cánh tay"],
            }}
            width={screenWidth - 32}
            height={220}
            yAxisSuffix=" cm"
            chartConfig={{
              backgroundColor: "#ffffff",
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#ffffff",
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "4", strokeWidth: "1" },
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
            legend={["Ngực", "Eo", "Hông", "Đùi", "Cánh tay"]}
          />
        </View>

        <View style={styles.measurementsGrid}>
          <View style={styles.measurementItem}>
            <Text style={styles.measurementLabel}>Ngực</Text>
            <Text style={styles.measurementValue}>
              {latestRecord.measurements.chest} cm
            </Text>
            {previousRecord && (
              <Text
                style={[
                  styles.statDiff,
                  latestRecord.measurements.chest -
                    previousRecord.measurements.chest >
                  0
                    ? styles.positive
                    : null,
                ]}
              >
                {formatChange(
                  latestRecord.measurements.chest -
                    previousRecord.measurements.chest
                )}
              </Text>
            )}
          </View>

          <View style={styles.measurementItem}>
            <Text style={styles.measurementLabel}>Eo</Text>
            <Text style={styles.measurementValue}>
              {latestRecord.measurements.waist} cm
            </Text>
            {previousRecord && (
              <Text
                style={[
                  styles.statDiff,
                  latestRecord.measurements.waist -
                    previousRecord.measurements.waist <
                  0
                    ? styles.positive
                    : null,
                ]}
              >
                {formatChange(
                  latestRecord.measurements.waist -
                    previousRecord.measurements.waist
                )}
              </Text>
            )}
          </View>

          <View style={styles.measurementItem}>
            <Text style={styles.measurementLabel}>Hông</Text>
            <Text style={styles.measurementValue}>
              {latestRecord.measurements.hips} cm
            </Text>
            {previousRecord && (
              <Text
                style={[
                  styles.statDiff,
                  latestRecord.measurements.hips -
                    previousRecord.measurements.hips <
                  0
                    ? styles.positive
                    : null,
                ]}
              >
                {formatChange(
                  latestRecord.measurements.hips -
                    previousRecord.measurements.hips
                )}
              </Text>
            )}
          </View>

          <View style={styles.measurementItem}>
            <Text style={styles.measurementLabel}>Đùi</Text>
            <Text style={styles.measurementValue}>
              {latestRecord.measurements.thighs} cm
            </Text>
            {previousRecord && (
              <Text
                style={[
                  styles.statDiff,
                  latestRecord.measurements.thighs -
                    previousRecord.measurements.thighs <
                  0
                    ? styles.positive
                    : null,
                ]}
              >
                {formatChange(
                  latestRecord.measurements.thighs -
                    previousRecord.measurements.thighs
                )}
              </Text>
            )}
          </View>

          <View style={styles.measurementItem}>
            <Text style={styles.measurementLabel}>Cánh tay</Text>
            <Text style={styles.measurementValue}>
              {latestRecord.measurements.arms} cm
            </Text>
            {previousRecord && (
              <Text
                style={[
                  styles.statDiff,
                  latestRecord.measurements.arms -
                    previousRecord.measurements.arms >
                  0
                    ? styles.positive
                    : null,
                ]}
              >
                {formatChange(
                  latestRecord.measurements.arms -
                    previousRecord.measurements.arms
                )}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Render Tab Thể lực
  const renderFitnessTab = () => {
    const fitnessChartData = prepareFitnessChart();

    // Lấy bản ghi mới nhất và bản ghi trước đó (nếu có)
    const latestRecord = trainingProgress[0];
    const previousRecord =
      trainingProgress.length > 1 ? trainingProgress[1] : null;

    // Nếu không có dữ liệu
    if (!latestRecord) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#999" />
          <Text style={styles.noDataText}>Chưa có dữ liệu thể lực</Text>
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() => navigation.navigate("AddProgress")}
          >
            <Text style={styles.buttonPrimaryText}>Thêm dữ liệu</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Chỉ số thể lực</Text>
          <BarChart
            data={{
              labels: fitnessChartData.labels,
              datasets: [
                {
                  data: fitnessChartData.datasets[0].data,
                  color: () => `rgba(26, 115, 232, 1)`,
                },
                {
                  data: fitnessChartData.datasets[1].data,
                  color: () => `rgba(255, 99, 132, 1)`,
                },
                {
                  data: fitnessChartData.datasets[2].data,
                  color: () => `rgba(75, 192, 192, 1)`,
                },
                {
                  data: fitnessChartData.datasets[3].data,
                  color: () => `rgba(255, 159, 64, 1)`,
                },
              ],
              legend: ["Cardio", "Bench", "Squat", "Deadlift"],
            }}
            width={screenWidth - 32}
            height={220}
            yAxisSuffix=""
            showValuesOnTopOfBars
            chartConfig={{
              backgroundColor: "#ffffff",
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#ffffff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
            }}
            style={{ marginVertical: 8, borderRadius: 16 }}
          />
        </View>

        <View style={styles.fitnessDetailsContainer}>
          <View style={styles.fitnessDetailItem}>
            <Text style={styles.fitnessDetailLabel}>
              Cardio Endurance (phút)
            </Text>
            <Text style={styles.fitnessDetailValue}>
              {latestRecord.fitness.cardioEndurance || 0}
            </Text>
            {previousRecord && (
              <Text
                style={[
                  styles.statDiff,
                  (latestRecord.fitness.cardioEndurance || 0) -
                    (previousRecord.fitness.cardioEndurance || 0) >
                  0
                    ? styles.positive
                    : styles.negative,
                ]}
              >
                {formatChange(
                  (latestRecord.fitness.cardioEndurance || 0) -
                    (previousRecord.fitness.cardioEndurance || 0)
                )}
              </Text>
            )}
          </View>

          <View style={styles.fitnessDetailItem}>
            <Text style={styles.fitnessDetailLabel}>Bench Press (kg)</Text>
            <Text style={styles.fitnessDetailValue}>
              {latestRecord.fitness.strengthBench || 0}
            </Text>
            {previousRecord && (
              <Text
                style={[
                  styles.statDiff,
                  (latestRecord.fitness.strengthBench || 0) -
                    (previousRecord.fitness.strengthBench || 0) >
                  0
                    ? styles.positive
                    : styles.negative,
                ]}
              >
                {formatChange(
                  (latestRecord.fitness.strengthBench || 0) -
                    (previousRecord.fitness.strengthBench || 0)
                )}
              </Text>
            )}
          </View>

          <View style={styles.fitnessDetailItem}>
            <Text style={styles.fitnessDetailLabel}>Squat (kg)</Text>
            <Text style={styles.fitnessDetailValue}>
              {latestRecord.fitness.strengthSquat || 0}
            </Text>
            {previousRecord && (
              <Text
                style={[
                  styles.statDiff,
                  (latestRecord.fitness.strengthSquat || 0) -
                    (previousRecord.fitness.strengthSquat || 0) >
                  0
                    ? styles.positive
                    : styles.negative,
                ]}
              >
                {formatChange(
                  (latestRecord.fitness.strengthSquat || 0) -
                    (previousRecord.fitness.strengthSquat || 0)
                )}
              </Text>
            )}
          </View>

          <View style={styles.fitnessDetailItem}>
            <Text style={styles.fitnessDetailLabel}>Deadlift (kg)</Text>
            <Text style={styles.fitnessDetailValue}>
              {latestRecord.fitness.strengthDeadlift || 0}
            </Text>
            {previousRecord && (
              <Text
                style={[
                  styles.statDiff,
                  (latestRecord.fitness.strengthDeadlift || 0) -
                    (previousRecord.fitness.strengthDeadlift || 0) >
                  0
                    ? styles.positive
                    : styles.negative,
                ]}
              >
                {formatChange(
                  (latestRecord.fitness.strengthDeadlift || 0) -
                    (previousRecord.fitness.strengthDeadlift || 0)
                )}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Render Tab Lịch sử
  const renderHistoryTab = () => {
    if (trainingProgress.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#999" />
          <Text style={styles.noDataText}>
            Chưa có dữ liệu tiến độ tập luyện
          </Text>
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() => navigation.navigate("AddProgress")}
          >
            <Text style={styles.buttonPrimaryText}>Thêm dữ liệu</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        <View style={styles.historyList}>
          {trainingProgress.map((record) => (
            <TouchableOpacity
              key={record.id}
              style={styles.historyItem}
              onPress={() =>
                navigation.navigate("ProgressDetail", { recordId: record.id })
              }
            >
              <View style={styles.historyHeader}>
                <Text style={styles.historyDate}>
                  {new Date(record.date).toLocaleDateString("vi-VN")}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </View>

              <View style={styles.historyStats}>
                <View style={styles.historyStat}>
                  <Text style={styles.historyStatLabel}>Cân nặng</Text>
                  <Text style={styles.historyStatValue}>
                    {record.weight} kg
                  </Text>
                </View>

                <View style={styles.historyStat}>
                  <Text style={styles.historyStatLabel}>Tỷ lệ mỡ</Text>
                  <Text style={styles.historyStatValue}>
                    {record.bodyFatPercentage}%
                  </Text>
                </View>

                <View style={styles.historyStat}>
                  <Text style={styles.historyStatLabel}>Tỷ lệ cơ</Text>
                  <Text style={styles.historyStatValue}>
                    {record.muscleMass}%
                  </Text>
                </View>
              </View>

              {record.notes && (
                <View style={styles.historyNotes}>
                  <Text style={styles.historyNotesLabel}>Ghi chú:</Text>
                  <Text style={styles.historyNotesText} numberOfLines={2}>
                    {record.notes}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tiến độ tập luyện</Text>     
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate("AddProgress")}
          >
            <Ionicons name="add-circle" size={24} color="#1a73e8" />
          </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Tiến trình tập luyện</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color="#d32f2f" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={fetchTrainingProgress}
          >
            <Text style={styles.buttonPrimaryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tiến trình tập luyện</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate("AddProgress")}
        >
          <Ionicons name="add-circle" size={24} color="#1a73e8" />
        </TouchableOpacity>
      </View>

      {renderTabs()}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderTimeFilter()}
        {renderTabContent()}
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333333",
  },
  headerButton: {
    padding: 5,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    flexDirection: "row",
  },
  activeTab: {
    borderBottomColor: "#1a73e8",
  },
  tabText: {
    fontSize: 13,
    color: "#666666",
    marginLeft: 4,
  },
  activeTabText: {
    color: "#1a73e8",
    fontWeight: "500",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  timeFilterContainer: {
    margin: 16,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333333",
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
    backgroundColor: "#f0f0f0",
  },
  selectedFilterOption: {
    backgroundColor: "#1a73e8",
  },
  filterOptionText: {
    fontSize: 13,
    color: "#666666",
  },
  selectedFilterOptionText: {
    color: "#ffffff",
    fontWeight: "500",
  },
  tabContent: {
    padding: 16,
  },
  chartContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333333",
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statsCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333333",
    marginRight: 8,
  },
  statsChange: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  positiveChange: {
    color: "#4caf50",
  },
  negativeChange: {
    color: "#f44336",
  },
  statsDate: {
    fontSize: 12,
    color: "#999999",
  },
  bmiCategory: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
    color: "#1a73e8",
  },
  measurementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  measurementItem: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  measurementLabel: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 6,
  },
  measurementValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333333",
  },
  statDiff: {
    fontSize: 14,
    marginTop: 4,
  },
  positive: {
    color: "#4caf50",
  },
  negative: {
    color: "#f44336",
  },
  fitnessDetailsContainer: {
    marginTop: 8,
  },
  fitnessDetailItem: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  fitnessDetailLabel: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 6,
  },
  fitnessDetailValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333333",
  },
  historyList: {
    marginTop: 8,
  },
  historyItem: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 8,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333333",
  },
  historyStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  historyStat: {
    alignItems: "center",
  },
  historyStatLabel: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 4,
  },
  historyStatValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333333",
  },
  historyNotes: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 8,
  },
  historyNotesLabel: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 4,
  },
  historyNotesText: {
    fontSize: 14,
    color: "#333333",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 20,
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
  },
  noDataContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  noDataText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  buttonPrimary: {
    backgroundColor: "#1a73e8",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimaryText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default Progress;

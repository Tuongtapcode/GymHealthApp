// Import các thư viện cần thiết
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, ScrollView } from "react-native";
import { Calendar } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authAPI, endpoints } from "../../configs/API";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { Modal, Button } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
// Định nghĩa các loại buổi tập cho Picker
const SESSION_TYPES = [
  { label: "With PT", value: "pt_session" },
  { label: "No PT", value: "self_training" },
];

// Định nghĩa các bộ lọc trạng thái buổi tập
const FILTER_OPTIONS = [
  { label: "Tất cả", value: "all" },
  { label: "Đang đợi duyệt", value: "pending" },
  { label: "Được đề xuất", value: "rescheduled" },
  { label: "Đã được chấp nhận", value: "confirmed" },
  { label: "Đã hoàn thành", value: "completed" },
  { label: "Đã huỷ", value: "cancelled" },
];

const Schedule = () => {
  // =========================
  // ==== STATE & EFFECTS ====
  // =========================
  const navigation = useNavigation();

  // State lưu các ngày được đánh dấu trên lịch (có buổi tập)
  const [markedDates, setMarkedDates] = useState({});
  // State lưu ngày đang được chọn trên lịch (dạng yyyy-mm-dd)
  const [selected, setSelected] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  // State lưu danh sách các buổi tập lấy từ API
  const [sessions, setSessions] = useState([]);
  // State cờ để chỉ set ngày mặc định 1 lần sau khi load dữ liệu
  const [didSetDefault, setDidSetDefault] = useState(false);

  // State để chuyển đổi giữa 2 tab: dashboard (lịch) và add (thêm buổi tập)
  const [activeTab, setActiveTab] = useState("dashboard");

  // State cho form thêm buổi tập
  const [newSession, setNewSession] = useState({
    session_date: "",
    start_time: "",
    end_time: "",
    session_type: "",
    notes: "",
    trainer: "",
  });

  // State điều khiển hiển thị DateTimePicker cho từng trường
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // State lưu danh sách huấn luyện viên lấy từ API
  const [trainers, setTrainers] = useState([]);

  // State lưu lỗi validate cho từng trường khi thêm session
  const [errors, setErrors] = useState({});
  // State cho thông báo tổng nếu có trường bị bỏ trống
  const [emptyFieldAlert, setEmptyFieldAlert] = useState("");

  // Thêm state cho bộ lọc
  const [filterStatus, setFilterStatus] = useState("all");


  // Thêm state cho modal cập nhật thông tin sức khỏe
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [healthInfo, setHealthInfo] = useState({
    height: "",
    weight: "",
    health_conditions: "",
  });
  // Thêm state cho lỗi nhập liệu trong modal
  const [healthErrors, setHealthErrors] = useState({});
  //state cho modal đánh giá huấn luyện viên
  const [showTrainerRatingModal, setShowTrainerRatingModal] = useState(false);
  // State cho đánh giá huấn luyện viên
  const [score, setScore] = useState(null);
  const [knowledgeScore, setKnowledgeScore] = useState("");
  const [communicationScore, setCommunicationScore] = useState("");
  const [punctualityScore, setPunctualityScore] = useState("");
  const [trainerComment, setTrainerComment] = useState("");
  //state lấy id của trainer khi nhấn vào Trainer Rating
  const [trainerId, setTrainerId] = useState(null);
  // Lấy danh sách trainer khi chuyển sang tab Add session
  useEffect(() => {
    const fetchTrainers = async () => {
      try {
        const accessToken = await AsyncStorage.getItem("accessToken");
        const res = await authAPI(accessToken).get(endpoints.trainers);
        // API trả về object có trường results là mảng trainer
        setTrainers(Array.isArray(res.data.results) ? res.data.results : []);
      } catch (err) {
        setTrainers([]);
      }
    };
    fetchTrainers();
  }, []);

  // Lấy danh sách các buổi tập từ API khi component mount
  useEffect(() => {
    const fetchWorkoutSessions = async () => {
      try {
        const accessToken = await AsyncStorage.getItem("accessToken");
        const response = await authAPI(accessToken).get(endpoints.workoutessions);
        setSessions(response.data);

        // Đánh dấu các ngày có buổi tập trên lịch
        const marks = {};
        response.data.forEach(item => {
          if (item.session_date) {
            marks[item.session_date] = {
              marked: true,
              dotColor: "#4e5ba6",
              customStyles: { text: { color: "#4e5ba6" } },
            };
          }
        });
        setMarkedDates(marks);
      } catch (err) {
        console.error("Error fetching workout sessions:", err);
      }
    };
    fetchWorkoutSessions();
  }, []);

  // Sau khi có dữ liệu buổi tập, chỉ set ngày mặc định 1 lần (ngày gần nhất có buổi tập)
  useEffect(() => {
    if (sessions.length > 0 && !didSetDefault) {
      const today = new Date().toISOString().split('T')[0];
      // Tìm buổi tập có ngày >= hôm nay, nếu không có thì lấy ngày đầu tiên
      const found = sessions.find(s => s.session_date >= today);
      setSelected((found ? found.session_date : sessions[0].session_date).slice(0, 10));
      setDidSetDefault(true);
    }
  }, [sessions, didSetDefault]);

  // Đánh dấu các ngày có buổi tập phù hợp với filterStatus
  useEffect(() => {
    const marks = {};
    sessions.forEach(item => {
      if (!item.session_date) return;
      // Kiểm tra trạng thái theo filterStatus
      const matchStatus = filterStatus === "all" ? true : item.status === filterStatus;
      if (matchStatus) {
        marks[item.session_date] = {
          marked: true,
          dotColor: "#4e5ba6",
          customStyles: { text: { color: "#4e5ba6" } },
        };
      }
    });
    setMarkedDates(marks);
  }, [sessions, filterStatus]);

  // =========================
  // ===== TAB ADD SESSION ===
  // =========================

  // Hàm validate các trường nhập liệu khi thêm session
  const validateSession = () => {
    const newErrors = {};
    if (!newSession.session_date) newErrors.session_date = "Vui lòng chọn ngày tập.";
    if (!newSession.start_time) newErrors.start_time = "Vui lòng chọn giờ bắt đầu.";
    if (!newSession.end_time) newErrors.end_time = "Vui lòng chọn giờ kết thúc.";
    if (!newSession.session_type) newErrors.session_type = "Vui lòng chọn loại buổi tập.";
    // // Ghi chú có thể không bắt buộc
    return newErrors;
  };

  // Hàm xử lý khi nhấn Thêm buổi tập: gửi dữ liệu lên API
  const handleAddSession = async () => {
    // Validate trước khi gửi API
    const validationErrors = validateSession();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setEmptyFieldAlert("Không được bỏ trống các trường bắt buộc.");
      // Nếu có ít nhất một ô nhập liệu bị bỏ trống thì không gửi API và hiển thị lỗi
      return;
    }
    setErrors({});
    setEmptyFieldAlert("");
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      // Gửi dữ liệu lên endpoint registerworkoutessions
      await authAPI(accessToken).post(endpoints.registerworkoutessions, newSession);

      // Reset form sau khi thêm thành công
      setNewSession({
        session_date: "",
        start_time: "",
        end_time: "",
        session_type: "",
        notes: "",
        trainer: "",
      });
      setActiveTab("dashboard");

      // Reload lại danh sách buổi tập
      const response = await authAPI(accessToken).get(endpoints.workoutessions);
      setSessions(response.data);

      // Đánh dấu lại các ngày có buổi tập trên lịch
      const marks = {};
      response.data.forEach(item => {
        if (item.session_date) {
          marks[item.session_date] = {
            marked: true,
            dotColor: "#4e5ba6",
            customStyles: { text: { color: "#4e5ba6" } },
          };
        }
      });
      setMarkedDates(marks);

      alert("Thêm buổi tập thành công!");
    } catch (error) {
      // Lấy thông điệp lỗi cụ thể từ các trường bị sai trả về từ API
      let message = "Có lỗi xảy ra khi thêm buổi tập!";
      if (error.response && error.response.data) {
        const data = error.response.data;
        if (typeof data === "object" && data !== null) {
          // Lấy thông báo lỗi đầu tiên từ các trường
          const firstField = Object.keys(data)[0];
          if (firstField && Array.isArray(data[firstField]) && data[firstField].length > 0) {
            message = data[firstField][0];
          }
        } else if (typeof data === "string") {
          message = data;
        } else if (data.message) {
          message = data.message;
        }
      }
      alert(message);
      console.error(error);
    }
  };

  // Hàm xử lý chọn ngày cho DateTimePicker (Add session)
  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setNewSession({ ...newSession, session_date: selectedDate.toISOString().slice(0, 10) });
    }
  };

  // Hàm xử lý chọn giờ bắt đầu cho DateTimePicker (Add session)
  const onChangeStartTime = (event, selectedTime) => {
    setShowStartTimePicker(false);
    if (selectedTime) {
      const timeStr = selectedTime.toTimeString().slice(0, 5);
      setNewSession({ ...newSession, start_time: timeStr });
    }
  };

  // Hàm xử lý chọn giờ kết thúc cho DateTimePicker (Add session)
  const onChangeEndTime = (event, selectedTime) => {
    setShowEndTimePicker(false);
    if (selectedTime) {
      const timeStr = selectedTime.toTimeString().slice(0, 5);
      setNewSession({ ...newSession, end_time: timeStr });
    }
  };

  // =========================
  // ===== TAB DASHBOARD =====
  // =========================

  // Lọc ra các buổi tập của ngày đang chọn (Dashboard) và theo bộ lọc
  const sessionsForSelectedDate = sessions.filter(item => {
    // Lấy đúng 10 ký tự đầu (yyyy-mm-dd) để so sánh
    const sessionDay = item.session_date ? item.session_date.slice(0, 10) : "";
    const selectedDay = selected ? selected.slice(0, 10) : "";
    const matchDate = sessionDay === selectedDay;
    const matchStatus = filterStatus === "all" ? true : item.status === filterStatus;
    return matchDate && matchStatus;
  });

  // Hàm xử lý khi người dùng nhấn vào 1 ngày trên Calendar (Dashboard)
  const handleDayPress = day => {
    setSelected(day.dateString);
  };

  //các hàm xử lý sự kiện ở các buổi tập

  // Hàm hủy buổi tập
  const handleCancelSession = async (sessionId) => {
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      // Gửi request cập nhật status
      await authAPI(accessToken).patch(
        endpoints.updateStatusSession.replace("{id}", sessionId),
        { status: "cancelled" }
      );
      // Sau khi cập nhật thành công, reload lại danh sách buổi tập
      const response = await authAPI(accessToken).get(endpoints.workoutessions);
      setSessions(response.data);
      alert("Đã hủy buổi tập thành công!");
    } catch (error) {
      alert("Có lỗi khi hủy buổi tập!");
      console.error(error);
    }
  };

  // Hàm xác nhận lại buổi tập đã được reschedule
  const handleConfirmSession = async (sessionId) => {
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      // Gửi request cập nhật status
      await authAPI(accessToken).patch(
        endpoints.updateStatusSession.replace("{id}", sessionId),
        { status: "confirmed" }
      );
      // Sau khi cập nhật thành công, reload lại danh sách buổi tập
      const response = await authAPI(accessToken).get(endpoints.workoutessions);
      setSessions(response.data);
      alert("Đã xác nhận buổi tập thành công!");
    } catch (error) {
      alert("Có lỗi khi xác nhận buổi tập!");
      console.error(error);
    }
  };

  // Hàm mở modal Health Information
  const openHealthModal = () => {
    setShowHealthModal(true);
  };
  // Hàm đóng modal Health Information
  const closeHealthModal = () => {
    setShowHealthModal(false);
    setHealthInfo({
      height: "",
      weight: "",
      health_conditions: "",
    });
  };
  // Hàm mở modal đánh giá huấn luyện viên
  const openTrainerRatingModal = (trainerId) => {
    setTrainerId(trainerId);
    setShowTrainerRatingModal(true);
    console.log("trainerIdOpen:", trainerId);
  };
  // Hàm đóng modal đánh giá huấn luyện viên
  const closeTrainerRatingModal = () => {
    setTrainerId(null);
    setShowTrainerRatingModal(false);
    setScore(null);
    setKnowledgeScore(null);
    setCommunicationScore(null);
    setPunctualityScore(null);
    setTrainerComment(null);
  };
  // Hàm xử lý đánh giá huấn luyện viên
  const handleSaveTrainerRating = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      const formData = new FormData();
      formData.append("trainer", trainerId);
      formData.append("score", score);
      formData.append("knowledge_score", knowledgeScore);
      formData.append("communication_score", communicationScore);
      formData.append("punctuality_score", punctualityScore);
      formData.append("comment", trainerComment);

      await authAPI(accessToken).post(
        endpoints.createTrainerRating,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      alert("Đánh giá huấn luyện viên thành công!");
    } catch (error) {
      let message = "Có lỗi khi gửi đánh giá!";
      if (error.response && error.response.data) {
        const data = error.response.data;
        // Nếu có trường error (ví dụ như ảnh bạn gửi)
        if (data.error) {
          message = data.error;
        } else if (typeof data === "object" && data !== null) {
          const firstField = Object.keys(data)[0];
          if (firstField && Array.isArray(data[firstField]) && data[firstField].length > 0) {
            message = data[firstField][0];
          }
        } else if (typeof data === "string") {
          message = data;
        } else if (data.message) {
          message = data.message;
        }
      }
      alert(message);
    }
    closeTrainerRatingModal();
  };

  // Hàm xử lý lưu thông tin sức khỏe
  const handleSaveHealthInfo = async () => {
    const errors = validateHealthInfo();
    if (Object.keys(errors).length > 0) {
      setHealthErrors(errors);
      return;
    }
    setHealthErrors({});
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      // Tạo form data
      const formData = new FormData();
      formData.append("height", healthInfo.height);
      formData.append("weight", healthInfo.weight);
      formData.append("health_conditions", healthInfo.health_conditions);

      await authAPI(accessToken).patch(
        endpoints.updateHealthInfo,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      alert("Cập nhật thông tin sức khỏe thành công!");
      closeHealthModal();
    } catch (error) {
      alert("Có lỗi khi cập nhật thông tin sức khỏe!");
      console.error(error);
    }
  };

  // Hàm validate các trường trong modal
  const validateHealthInfo = () => {
    const errors = {};
    if (!healthInfo.height) errors.height = "Vui lòng nhập chiều cao.";
    if (!healthInfo.weight) errors.weight = "Vui lòng nhập cân nặng.";
    if (!healthInfo.health_conditions) errors.health_conditions = "Vui lòng nhập tình trạng sức khỏe.";
    return errors;
  };

  // =========================
  // ===== RENDER UI =========
  // =========================

  return (
    <View style={styles.container}>
      {/* =========================
          ==== HEADER & TABS ======
          ========================= */}
      {/* Header: tiêu đề và icon */}
      <View className="header" style={styles.header}>
        <Text style={styles.headerTitle}>Workouts</Text>
        <Ionicons name="time-outline" size={22} color="#4e5ba6" />
      </View>

      {/* Tabs: chuyển đổi giữa Dashboard và Add session */}
      <View style={styles.tabs}>
        <Text
          style={[styles.tab, activeTab === "dashboard" && styles.tabActive]}
          onPress={() => setActiveTab("dashboard")}
        >
          Dashboard
        </Text>
        <Text
          style={[styles.tab, activeTab === "add" && styles.tabActive]}
          onPress={() => setActiveTab("add")}
        >
          Add session
        </Text>
      </View>

      {/* Bộ lọc trạng thái buổi tập (chỉ hiển thị ở tab Dashboard) */}
      <View style={styles.subHeader}>
        {activeTab === "dashboard" && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: 12, marginBottom: 1 }}>
            {FILTER_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                style={{
                  paddingVertical: 6, // Khoảng cách trên/dưới của nút lọc
                  paddingHorizontal: 14, // Khoảng cách trái/phải của nút lọc
                  borderRadius: 16, // Bo tròn góc nút lọc
                  backgroundColor: filterStatus === option.value ? "#4e5ba6" : "#f2f4f8", // Đổi màu khi được chọn
                  marginRight: 8, // Khoảng cách giữa các nút lọc
                  height: 36, // Cố định chiều cao nút lọc
                  justifyContent: "center", // Căn giữa text theo chiều dọc
                  alignItems: "center", // Căn giữa text theo chiều ngang
                }}
                onPress={() => setFilterStatus(option.value)}
              >
                <Text style={{ color: filterStatus === option.value ? "#fff" : "#7a7a7a", fontWeight: "500" }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* =========================
          ==== TAB ADD SESSION ====
          ========================= */}
      {activeTab === "add" && (
        // BẮT ĐẦU CODE TAB ADD SESSION
        <ScrollView
          style={{ padding: 16, backgroundColor: "#f2f4f8", borderRadius: 8, margin: 12 }}
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontWeight: "bold", marginBottom: 8 }}>Thêm buổi tập mới</Text>
          {/* Hiển thị thông báo tổng nếu có trường bị bỏ trống */}
          {emptyFieldAlert ? (
            <Text style={{ color: "red", marginBottom: 8 }}>{emptyFieldAlert}</Text>
          ) : null}
          {/* Chọn ngày tập */}
          <Text>Ngày tập:</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowDatePicker(true)}
          >
            <Text>
              {newSession.session_date ? newSession.session_date : "Chọn ngày"}
            </Text>
          </TouchableOpacity>
          {errors.session_date && (
            <Text style={styles.errorText}>{errors.session_date}</Text>
          )}
          {showDatePicker && (
            <DateTimePicker
              value={newSession.session_date ? new Date(newSession.session_date) : new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onChangeDate}
            />
          )}

          {/* Chọn giờ bắt đầu */}
          <Text>Giờ bắt đầu:</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowStartTimePicker(true)}
          >
            <Text>
              {newSession.start_time ? newSession.start_time : "Chọn giờ bắt đầu"}
            </Text>
          </TouchableOpacity>
          {errors.start_time && (
            <Text style={styles.errorText}>{errors.start_time}</Text>
          )}
          {showStartTimePicker && (
            <DateTimePicker
              value={newSession.start_time ? new Date(`1970-01-01T${newSession.start_time}:00`) : new Date()}
              mode="time"
              is24Hour={true}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onChangeStartTime}
            />
          )}

          {/* Chọn giờ kết thúc */}
          <Text>Giờ kết thúc:</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowEndTimePicker(true)}
          >
            <Text>
              {newSession.end_time ? newSession.end_time : "Chọn giờ kết thúc"}
            </Text>
          </TouchableOpacity>
          {errors.end_time && (
            <Text style={styles.errorText}>{errors.end_time}</Text>
          )}
          {showEndTimePicker && (
            <DateTimePicker
              value={newSession.end_time ? new Date(`1970-01-01T${newSession.end_time}:00`) : new Date()}
              mode="time"
              is24Hour={true}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onChangeEndTime}
            />
          )}

          {/* Chọn loại buổi tập */}
          <Text>Loại buổi tập:</Text>
          <View style={[styles.input, { padding: 0 }]}>
            <Picker
              selectedValue={newSession.session_type}
              onValueChange={value => setNewSession({ ...newSession, session_type: value })}
            >
              <Picker.Item label="Chọn loại buổi tập" value="" />
              {SESSION_TYPES.map(type => (
                <Picker.Item key={type.value} label={type.label} value={type.value} />
              ))}
            </Picker>
          </View>
          {errors.session_type && (
            <Text style={styles.errorText}>{errors.session_type}</Text>
          )}

          {/* Chọn huấn luyện viên */}
          <Text>Huấn luyện viên:</Text>
          <View style={[styles.input, { padding: 0 }]}>
            <Picker
              selectedValue={newSession.trainer}
              onValueChange={value => setNewSession({ ...newSession, trainer: value })}
            >
              <Picker.Item label="Chọn huấn luyện viên" value="" />
              {trainers.map(trainer => (
                <Picker.Item key={trainer.id} label={`${trainer.id} - ${trainer.full_name}`} value={trainer.id} />
              ))}
            </Picker>
          </View>
          {errors.trainer && (
            <Text style={styles.errorText}>{errors.trainer}</Text>
          )}

          <TouchableOpacity
            style={{
              backgroundColor: "#ff9800",
              padding: 10,
              borderRadius: 6,
              marginBottom: 12,
              alignItems: "center",
              alignSelf: "flex-start"
            }}
            onPress={() => navigation.navigate("TrainerRating")}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Xem đánh giá huấn luyện viên</Text>
          </TouchableOpacity>

          {/* Nhập ghi chú */}
          <Text>Ghi chú:</Text>
          <TextInput
            style={styles.input}
            placeholder="Ghi chú"
            value={newSession.notes}
            onChangeText={text => setNewSession({ ...newSession, notes: text })}
          />
          {/* Nút thêm buổi tập */}
          <TouchableOpacity
            style={{ backgroundColor: "#4e5ba6", padding: 10, borderRadius: 6, marginTop: 10 }}
            onPress={handleAddSession}
          >
            <Text style={{ color: "#fff", textAlign: "center" }}>Thêm</Text>
          </TouchableOpacity>
        </ScrollView>
        // KẾT THÚC CODE TAB ADD SESSION
      )}

      {/* =========================
          ==== TAB DASHBOARD ======
          ========================= */}
      {activeTab === "dashboard" && (
        // BẮT ĐẦU CODE TAB DASHBOARD
        <>
          {/* Calendar: lịch hiển thị các ngày có buổi tập */}
          <Calendar
            current={selected}
            markedDates={{
              ...markedDates,
              ...(selected && {
                [selected]: {
                  ...(markedDates[selected] || {}),
                  selected: true,
                  selectedColor: "#b6e0e0",
                  selectedTextColor: "#4e5ba6",
                  customStyles: { text: { color: "#4e5ba6", fontWeight: "bold" } },
                },
              }),
            }}
            markingType="custom"
            theme={{
              calendarBackground: "#fff",
              textSectionTitleColor: "#b6b6b6",
              selectedDayBackgroundColor: "#b6e0e0",
              selectedDayTextColor: "#4e5ba6",
              todayTextColor: "#4e5ba6",
              dayTextColor: "#222",
              textDisabledColor: "#d9e1e8",
              arrowColor: "#4e5ba6",
              monthTextColor: "#222",
              textMonthFontWeight: "bold",
              textDayFontWeight: "400",
              textDayHeaderFontWeight: "400",
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
            }}
            renderArrow={direction => (
              <Ionicons
                name={direction === "left" ? "chevron-back-outline" : "chevron-forward-outline"}
                size={22}
                color="#4e5ba6"
              />
            )}
            hideExtraDays={false}
            firstDay={1}
            style={styles.calendar}
            // Custom từng ngày: phải dùng TouchableOpacity để bắt sự kiện nhấn ngày
            dayComponent={({ date, state, marking }) => (
              <TouchableOpacity
                onPress={() => handleDayPress({ dateString: date.dateString })}
                disabled={state === "disabled"}
                style={styles.dayContainer}
              >
                <Text
                  style={[
                    styles.dayText,
                    state === "disabled" && styles.dayDisabled,
                    marking?.selected && styles.daySelected,
                    marking?.selected && { color: "#4e5ba6" },
                  ]}
                >
                  {date.day}
                </Text>
                {/* Hiển thị icon nếu ngày này có lịch tập */}
                {marking?.marked && (
                  <Ionicons name="barbell-outline" size={16} color="#4e5ba6" style={{ marginTop: 2 }} />
                )}
              </TouchableOpacity>
            )}
          />

          {/* Hiển thị thông tin các buổi tập của ngày đang chọn */}
          <ScrollView style={{ padding: 16 }}>
            {sessionsForSelectedDate.length > 0 ? (
              sessionsForSelectedDate.map((item, idx) => {
                // Tìm huấn luyện viên tương ứng với buổi tập
                const trainer = trainers.find(t => t.id === item.trainer_id);

                return (
                  <View
                    key={item.id || idx}
                    style={{
                      backgroundColor: "#f2f4f8",
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 22,
                    }}
                  >
                    <Text style={{ fontWeight: "bold", fontSize: 16, color: "#4e5ba6" }}>
                      ID: {item.id || "Không rõ"}
                    </Text>
                    <Text style={{ fontWeight: "bold", fontSize: 15, color: "#4e5ba6" }}>
                      Member: {item.member_name || "Không rõ"}
                    </Text>
                    <Text>Day Workout: {item.session_date || "Không rõ"}</Text>
                    <Text>Time: {item.start_time || "?"} - {item.end_time || "?"}</Text>
                    <Text>Session Type: {item.session_type || "Không rõ"}</Text>
                    <Text>
                      Trainer: {trainer ? `${trainer.id} - ${trainer.full_name}` : ("Không có")}
                    </Text>
                    {/* Highlight giá trị status */}
                    <Text>
                      Status:{" "}
                      <Text
                        style={{
                          color:
                            item.status === "confirmed"
                              ? "#2ecc40"
                              : item.status === "completed"
                                ? "#2ecc40"
                                : item.status === "pending"
                                  ? "#e67e22"
                                  : item.status === "rescheduled"
                                    ? "#e67e22"
                                    : item.status === "cancelled"
                                      ? "#e74c3c"
                                      : "#4e5ba6",
                          fontWeight: "bold",
                        }}
                      >
                        {item.status || "Không rõ"}
                      </Text>
                    </Text>
                    <Text>Notes: {item.notes || "Không có"}</Text>

                    {/* Nút thao tác theo status */}
                    {item.status === "completed" && (

                      <View style={{ flexDirection: "row", marginTop: 10, gap: 10 }}>
                        <TouchableOpacity
                          style={{
                            backgroundColor: "#4e5ba6",
                            padding: 8,
                            borderRadius: 6,
                            marginTop: 10,
                            flex: 1,
                          }}
                          onPress={() => {
                            openHealthModal();
                          }}
                        >
                          <Text style={{ color: "#fff", textAlign: "center" }}>Update Health Information</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{
                            backgroundColor: "#ff9800",
                            padding: 8,
                            borderRadius: 6,
                            marginTop: 10,
                            flex: 1,
                          }}
                          onPress={() => openTrainerRatingModal(item.trainer_id)}
                        >
                          <Text style={{ color: "#fff", textAlign: "center" }}>Trainer Rating</Text>
                        </TouchableOpacity>
                      </View>

                    )}

                    {(item.status === "confirmed" || item.status === "pending") && (
                      <TouchableOpacity
                        style={{
                          backgroundColor: "#e74c3c",
                          padding: 8,
                          borderRadius: 6,
                          marginTop: 10,
                        }}
                        onPress={() => handleCancelSession(item.id)}
                      >
                        <Text style={{ color: "#fff", textAlign: "center" }}>Cancel</Text>
                      </TouchableOpacity>
                    )}

                    {item.status === "rescheduled" && (
                      <View style={{ flexDirection: "row", marginTop: 10, gap: 10 }}>
                        <TouchableOpacity
                          style={{
                            backgroundColor: "#2ecc40",
                            padding: 8,
                            borderRadius: 6,
                            flex: 1,
                            marginRight: 5,
                          }}
                          onPress={() => handleConfirmSession(item.id)}
                        >
                          <Text style={{ color: "#fff", textAlign: "center" }}>Confirm</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{
                            backgroundColor: "#e74c3c",
                            padding: 8,
                            borderRadius: 6,
                            flex: 1,
                            marginLeft: 5,
                          }}
                          onPress={() => handleCancelSession(item.id)}
                        >
                          <Text style={{ color: "#fff", textAlign: "center" }}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {(item.session_type === "pt_session") && (
                      <TouchableOpacity
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: "#64b5f6", // Xanh da trời nhạt
                          paddingVertical: 10,
                          paddingHorizontal: 18,
                          borderRadius: 24,
                          marginLeft: 5,
                          marginTop: 10,
                          alignSelf: "flex-start",
                          shadowColor: "#64b5f6",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.15,
                          shadowRadius: 4,
                          elevation: 3,
                        }}
                        activeOpacity={0.8}
                        onPress={() =>
                          navigation.navigate("Chat", { memberId: item.trainer_id, userId: item.member_id, chatName: trainer.full_name })
                        }
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={22} color="#fff" style={{ marginRight: 10 }} />
                        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16, letterSpacing: 0.5 }}>Nhắn tin</Text>
                      </TouchableOpacity>
                    )}

                  </View>
                );
              })
            ) : (
              <Text style={{ color: "#aaa", textAlign: "center" }}>
                Không có lịch tập cho ngày này.
              </Text>
            )}
          </ScrollView>
        </>
        // KẾT THÚC CODE TAB DASHBOARD
      )}

      {/* Modal cập nhật thông tin sức khỏe */}
      <ScrollView>
        <Modal
          visible={showHealthModal}
          animationType="slide"
          transparent={true}
          onRequestClose={closeHealthModal}
        >
          <View style={modalStyles.modalOverlay}>
            <View style={modalStyles.modalContainer}>
              <Text style={modalStyles.modalTitle}>Update Health Information</Text>
              <Text>Height (cm):</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={healthInfo.height}
                onChangeText={v => setHealthInfo({ ...healthInfo, height: v })}
                placeholder="Nhập chiều cao"
              />
              {healthErrors.height && (
                <Text style={styles.errorText}>{healthErrors.height}</Text>
              )}
              <Text>Weight (kg):</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={healthInfo.weight}
                onChangeText={v => setHealthInfo({ ...healthInfo, weight: v })}
                placeholder="Nhập cân nặng"
              />
              {healthErrors.weight && (
                <Text style={styles.errorText}>{healthErrors.weight}</Text>
              )}
              <Text>Health Conditions:</Text>
              <TextInput
                style={styles.input}
                value={healthInfo.health_conditions}
                onChangeText={v => setHealthInfo({ ...healthInfo, health_conditions: v })}
                placeholder="Nhập tình trạng sức khỏe"
              />
              {healthErrors.health_conditions && (
                <Text style={styles.errorText}>{healthErrors.health_conditions}</Text>
              )}
              <View style={modalStyles.modalButtonRow}>
                <TouchableOpacity
                  style={modalStyles.cancelButton}
                  onPress={closeHealthModal}
                >
                  <Text style={modalStyles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={modalStyles.saveButton}
                  onPress={handleSaveHealthInfo}
                >
                  <Text style={modalStyles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>



      {/* Modal đánh giá huấn luyện viên */}
      <ScrollView>
        <Modal
          visible={showTrainerRatingModal}
          animationType="slide"
          transparent={true}
          onRequestClose={closeTrainerRatingModal}
        >
          <View style={modalStyles.modalOverlay}>
            <View style={modalStyles.modalContainer}>
              <Text style={modalStyles.modalTitle}>Rate Your Trainer</Text>
              <Text>Score (1-5):</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={score}
                onChangeText={v => setScore(v.replace(/[^1-5]/g, ""))}
                placeholder="Enter overall score"
                maxLength={1}
              />
              <Text>Knowledge (1-5):</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={knowledgeScore}
                onChangeText={v => setKnowledgeScore(v.replace(/[^1-5]/g, ""))}
                placeholder="Enter knowledge score"
                maxLength={1}
              />
              <Text>Communication (1-5):</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={communicationScore}
                onChangeText={v => setCommunicationScore(v.replace(/[^1-5]/g, ""))}
                placeholder="Enter communication score"
                maxLength={1}
              />
              <Text>Punctuality (1-5):</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={punctualityScore}
                onChangeText={v => setPunctualityScore(v.replace(/[^1-5]/g, ""))}
                placeholder="Enter punctuality score"
                maxLength={1}
              />
              <Text>Comment:</Text>
              <TextInput
                style={styles.input}
                value={trainerComment}
                onChangeText={setTrainerComment}
                placeholder="Your comment"
                multiline
              />
              <View style={modalStyles.modalButtonRow}>
                <TouchableOpacity
                  style={modalStyles.cancelButton}
                  onPress={closeTrainerRatingModal}
                >
                  <Text style={modalStyles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={modalStyles.saveButton}
                  onPress={async () => {
                    // Validate các trường số
                    if (
                      !score || !knowledgeScore || !communicationScore || !punctualityScore ||
                      ![score, knowledgeScore, communicationScore, punctualityScore].every(
                        v => ["1", "2", "3", "4", "5"].includes(v)
                      )
                    ) {
                      alert("Vui lòng nhập đầy đủ các điểm số từ 1 đến 5!");
                      return;
                    }
                    handleSaveTrainerRating();
                  }}
                >
                  <Text style={modalStyles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>


    </View>
  );
};

// Các style cho component
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" }, // Container chính, chiếm toàn bộ màn hình
  header: {
    flexDirection: "row", // Header nằm ngang
    alignItems: "center", // Căn giữa các thành phần theo chiều dọc
    justifyContent: "space-between", // Cách đều hai bên
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222",
  },
  tabs: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 12,
    marginBottom: 8,
    marginTop: 8,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#f2f4f8",
    color: "#7a7a7a",
    fontWeight: "500",
    marginHorizontal: 2,
    fontSize: 15,
  },
  tabActive: {
    backgroundColor: "#4e5ba6",
    color: "#fff",
  },
  subHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 10,
    marginBottom: 8,
    marginTop: 6,
  },
  subHeaderText: {
    color: "#7a7a7a",
    fontSize: 15,
    fontWeight: "500",
  },
  moreText: {
    color: "#4ecdc4",
    fontWeight: "500",
    fontSize: 15,
  },
  calendar: {
    borderRadius: 12,
    marginHorizontal: 8,
    marginBottom: 8,
    elevation: 2,
    backgroundColor: "#fff",
  },
  dayContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    width: 40,
    alignSelf: "center",
  },
  dayText: {
    fontSize: 16,
    color: "#222",
  },
  dayDisabled: {
    color: "#d9e1e8",
  },
  daySelected: {
    fontWeight: "bold",
    color: "#4e5ba6",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f2f4f8",
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  navItem: {
    alignItems: "center",
    flex: 1,
  },
  navItemActive: {
    alignItems: "center",
    flex: 1,
  },
  navText: {
    color: "#b6b6b6",
    fontSize: 12,
    marginTop: 2,
  },
  navTextActive: {
    color: "#4e5ba6",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "bold",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: -4,
    marginBottom: 8,
  },
});
const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center"
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "85%",
    elevation: 5
  },
  modalTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 12
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12
  },
  cancelButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e74c3c",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 12,
    // Đổ bóng nhẹ cho nút Cancel
    shadowColor: "#e74c3c",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  cancelButtonText: {
    color: "#e74c3c",
    fontWeight: "bold"
  },
  saveButton: {
    backgroundColor: "#4e5ba6",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 6
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold"
  }
});

export default Schedule;
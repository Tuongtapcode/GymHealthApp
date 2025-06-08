import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, Image, ActivityIndicator, TextInput } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authAPI } from "../../configs/API";
import { endpoints } from "../../configs/API";

// Component hiển thị danh sách đánh giá huấn luyện viên
const TrainerRating = () => {
  // State xác định tab hiện tại: "all" (tất cả đánh giá) hoặc "my" (đánh giá của tôi)
  const [tab, setTab] = useState("all");
  // State lưu tất cả đánh giá lấy từ API
  const [allRatings, setAllRatings] = useState([]);
  // State lưu các đánh giá của bản thân
  const [myRatings, setMyRatings] = useState([]);
  // State hiển thị loading khi đang fetch dữ liệu
  const [loading, setLoading] = useState(false);
  // State cho ô tìm kiếm theo ID huấn luyện viên
  const [searchTrainerId, setSearchTrainerId] = useState("");

  // Hàm lấy tất cả đánh giá từ API
  const fetchAllRatings = async () => {
    setLoading(true);
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      const res = await authAPI(accessToken).get(endpoints.createTrainerRating);
      setAllRatings(res.data.results || []);
    } catch (e) {
      setAllRatings([]);
    }
    setLoading(false);
  };

  // Hàm lấy các đánh giá của bản thân từ API
  const fetchMyRatings = async () => {
    setLoading(true);
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      const res = await authAPI(accessToken).get(endpoints.myTrainerRating);
      setMyRatings(res.data || []);
    } catch (e) {
      setMyRatings([]);
    }
    setLoading(false);
  };

  // Khi component mount, gọi cả 2 API để lấy dữ liệu
  useEffect(() => {
    fetchAllRatings();
    fetchMyRatings();
  }, []);

  // Lọc dữ liệu theo ID trainer nếu có nhập vào ô tìm kiếm
  const filteredData = (tab === "all" ? allRatings : myRatings).filter(item =>
    searchTrainerId.trim() === "" || 
    item.trainer_details.id.toString().includes(searchTrainerId.trim())
  );

  // Hàm render từng item đánh giá
  const renderItem = ({ item }) => (
    <View style={{
      backgroundColor: "#f2f4f8",
      borderRadius: 10,
      padding: 14,
      marginBottom: 14,
      flexDirection: "row",
      alignItems: "center"
    }}>
      {/* Hiển thị avatar trainer */}
      <Image
        source={{ uri: item.trainer_details.avatar ? `https://res.cloudinary.com/duqln52pu/${item.trainer_details.avatar}` : undefined }}
        style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: "#eee" }}
      />
      <View style={{ flex: 1 }}>
        {/* Hiển thị ID và tên trainer */}
        <Text style={{ fontWeight: "bold", fontSize: 16 }}>
          ID: {item.trainer_details.id} - {item.trainer_details.first_name} {item.trainer_details.last_name}
        </Text>
        {/* Hiển thị điểm tổng và điểm trung bình */}
        <Text>Điểm: <Text style={{ fontWeight: "bold" }}>{item.score}</Text> | Trung bình: <Text style={{ fontWeight: "bold" }}>{item.average_score}</Text></Text>
        {/* Hiển thị các điểm thành phần */}
        <Text>Kiến thức: {item.knowledge_score} | Giao tiếp: {item.communication_score} | Đúng giờ: {item.punctuality_score}</Text>
        {/* Hiển thị bình luận nếu có */}
        <Text>Bình luận: {item.comment && item.comment !== "null" ? item.comment : "Không có"}</Text>
        {/* Hiển thị ngày đánh giá */}
        <Text style={{ color: "#888", fontSize: 12, marginTop: 2 }}>
          Ngày đánh giá: {new Date(item.created_at).toLocaleString()}
        </Text>
        {/* Nếu là tab "my", hiển thị nút xoá đánh giá */}
        {tab === "my" && (
          <TouchableOpacity
            style={{
              marginTop: 8,
              backgroundColor: "#e74c3c",
              paddingVertical: 6,
              paddingHorizontal: 16,
              borderRadius: 6,
              alignSelf: "flex-start"
            }}
            onPress={() => handleDeleteRating(item.id)}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Xoá</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Hàm xoá đánh giá, gọi API xoá và load lại danh sách đánh giá của tôi
  const handleDeleteRating = async (id) => {
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      await authAPI(accessToken).delete(endpoints.deleteTrainerRating.replace("{id}", id));
      alert("Xoá đánh giá thành công!");
      fetchMyRatings(); // Refresh lại danh sách đánh giá của tôi
    } catch (error) {
      alert("Xoá đánh giá thất bại!");
    }
  };

  // Dữ liệu sẽ hiển thị là allRatings hoặc myRatings tuỳ theo tab
  const dataToShow = tab === "all" ? allRatings : myRatings;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", padding: 16 }}>
      {/* Thanh chọn tab */}
      <View style={{ flexDirection: "row", marginBottom: 16 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: tab === "all" ? "#4e5ba6" : "#f2f4f8",
            padding: 10,
            borderRadius: 6,
            alignItems: "center",
            marginRight: 6
          }}
          onPress={() => setTab("all")}
        >
          <Text style={{ color: tab === "all" ? "#fff" : "#4e5ba6", fontWeight: "bold" }}>Tất cả đánh giá</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: tab === "my" ? "#4e5ba6" : "#f2f4f8",
            padding: 10,
            borderRadius: 6,
            alignItems: "center",
            marginLeft: 6
          }}
          onPress={() => setTab("my")}
        >
          <Text style={{ color: tab === "my" ? "#fff" : "#4e5ba6", fontWeight: "bold" }}>Đánh giá của tôi</Text>
        </TouchableOpacity>
      </View>

      {/* Thanh tìm kiếm theo ID trainer */}
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: "#4e5ba6",
          borderRadius: 8,
          padding: 8,
          marginBottom: 16,
        }}
        placeholder="Tìm kiếm theo ID huấn luyện viên..."
        value={searchTrainerId}
        onChangeText={setSearchTrainerId}
        keyboardType="numeric"
      />

      {/* Hiển thị loading hoặc danh sách đánh giá */}
      {loading ? (
        <ActivityIndicator size="large" color="#4e5ba6" />
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={{ textAlign: "center", color: "#888" }}>Không có đánh giá nào.</Text>}
        />
      )}
    </View>
  );
};

export default TrainerRating;
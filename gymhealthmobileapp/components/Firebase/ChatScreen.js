import React, { useState, useRef, useEffect } from "react";
import { View, TextInput, FlatList, Text, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { sendMessage, useChatMessages } from "./FirebaseChat";
import axios from "axios";
import { authAPI, endpoints } from '../../configs/API';
import AsyncStorage from "@react-native-async-storage/async-storage";

// Component màn hình chat chính
export default function ChatScreen({ route, navigation }) {
  // Lấy memberId (người chat cùng) và userId (người dùng hiện tại) từ params khi chuyển màn hình
  const { memberId, userId: userIdFromParams } = route.params;
  // State lưu userId hiện tại (ưu tiên lấy từ params)
  const [userId, setUserId] = useState(userIdFromParams || null);

  // Log để debug giá trị userId và memberId
  console.log("userId:", userId, "memberId:", memberId);

  // State lưu nội dung tin nhắn đang nhập
  const [text, setText] = useState("");
  // Lấy danh sách tin nhắn realtime giữa userId và memberId
  const messages = useChatMessages(userId, memberId);
  // Tham chiếu đến FlatList để cuộn xuống cuối khi có tin nhắn mới
  const flatListRef = useRef(null);

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Hàm gửi tin nhắn
  const handleSend = () => {
    if (text.trim() && userId) {
      sendMessage(text, userId, memberId); // Gửi tin nhắn lên Firestore
      setText(""); // Xóa nội dung ô nhập sau khi gửi
    }
  };

  // Hàm render từng tin nhắn trong danh sách
  const renderItem = ({ item }) => (
    <View
      style={[
        styles.messageContainer,
        item.senderId === userId ? styles.myMessage : styles.otherMessage, // Nếu là tin nhắn của mình thì style khác
      ]}
    >
      <Text style={styles.messageText}>{item.text}</Text>
      <Text style={styles.timeText}>
        {item.timestamp?.toDate
          ? item.timestamp.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : ""}
      </Text>
    </View>
  );

  // Nếu chưa có userId thì hiển thị loading
  if (!userId) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Đang tải thông tin người dùng...</Text>
      </View>
    );
  }

  // Giao diện chính của màn hình chat
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f2f4f8" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      {/* Danh sách tin nhắn */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      />
      {/* Ô nhập tin nhắn và nút gửi */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Nhập tin nhắn..."
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={!text.trim()}>
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Gửi</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// Định nghĩa style cho các thành phần giao diện
const styles = StyleSheet.create({
  messageContainer: {
    maxWidth: "75%",
    marginBottom: 10,
    borderRadius: 12,
    padding: 10,
    alignSelf: "flex-start",
    backgroundColor: "#e5e5ea",
  },
  myMessage: {
    backgroundColor: "#4e5ba6", // Tin nhắn của mình màu xanh
    alignSelf: "flex-end",
  },
  otherMessage: {
    backgroundColor: "#e5e5ea", // Tin nhắn của người khác màu xám nhạt
    alignSelf: "flex-start",
  },
  messageText: {
    color: "#222",
    fontSize: 16,
  },
  timeText: {
    color: "#888",
    fontSize: 11,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#eee",
  },
  input: {
    flex: 1,
    minHeight: 52, // tăng chiều cao tối thiểu cho ô nhập
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 25, // tăng padding dọc cho ô nhập
    backgroundColor: "#f9f9f9",
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: "#4e5ba6",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 25, // tăng padding dọc cho nút gửi
    justifyContent: "center",
    alignItems: "center",
  },
});
import { db } from "./FirebaseConfig"; // Import cấu hình Firestore đã khởi tạo
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

// Hàm gửi tin nhắn mới lên Firestore
export const sendMessage = async (text, senderId, receiverId) => {
  // Tạo một document mới trong collection "messages" với các trường: text, senderId, receiverId, timestamp
  await addDoc(collection(db, "messages"), {
    text,                // Nội dung tin nhắn
    senderId,            // ID người gửi
    receiverId,          // ID người nhận
    timestamp: serverTimestamp(), // Thời gian gửi (lấy từ server để đồng bộ)
  });
};

// Hook lắng nghe tin nhắn thời gian thực giữa 2 user
export const useChatMessages = (user1, user2) => {
  const [messages, setMessages] = useState([]); // State lưu danh sách tin nhắn

  useEffect(() => {
    // Tạo query lấy tất cả tin nhắn, sắp xếp theo thời gian tăng dần
    const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));

    // Đăng ký listener realtime với Firestore
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Debug: log ra senderId và receiverId của từng tin nhắn
        console.log("data.senderId", data.senderId, "data.receiverId", data.receiverId);
        // Lọc tin nhắn: chỉ lấy tin nhắn giữa user1 và user2 (cả 2 chiều)
        if (
          (data.senderId === user1 && data.receiverId === user2) ||
          (data.senderId === user2 && data.receiverId === user1)
        ) {
          msgs.push({ id: doc.id, ...data }); // Thêm tin nhắn vào mảng, kèm id
        }
      });
      setMessages(msgs); // Cập nhật state khi có thay đổi
    });

    // Hủy listener khi component unmount hoặc khi user1/user2 thay đổi
    return unsubscribe;
  }, [user1, user2]);

  return messages; // Trả về danh sách tin nhắn để sử dụng trong component chat
};
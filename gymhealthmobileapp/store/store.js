import { configureStore } from '@reduxjs/toolkit';
import MyUserReducer from '../reducers/MyUserReducer'; // Import reducer
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tạo Redux store
const store = configureStore({
  reducer: {
    user: MyUserReducer, // Gắn MyUserReducer vào key 'user'
  },
});

// Kiểm tra trạng thái đăng nhập khi ứng dụng khởi động
const initializeStore = async () => {
  try {
    const accessToken = await AsyncStorage.getItem('accessToken');
    console.log('Access Token on App Start:', accessToken);

    if (accessToken) {
      // Dispatch action để cập nhật trạng thái login
      store.dispatch({
        type: 'login',
        payload: {}, // Bạn có thể thêm thông tin người dùng nếu cần
      });
    }
  } catch (error) {
    console.error('Error checking login status:', error.message);
  }
};

initializeStore();

export default store;
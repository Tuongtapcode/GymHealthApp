import { configureStore } from '@reduxjs/toolkit';
import MyUserReducer from '../reducers/MyUserReducer'; // Import reducer
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance, { authAPI, endpoints } from '../configs/API'; // Import axiosInstance and authAPI
import { Alert } from 'react-native';

// Tạo Redux store
const store = configureStore({
  reducer: {
    user: MyUserReducer, // Gắn MyUserReducer vào key 'user'
  },
});

// Kiểm tra trạng thái đăng nhập khi ứng dụng khởi động
const initializeStore = async (navigation) => {
  try {
    const accessToken = await AsyncStorage.getItem('accessToken');
    console.log('Access Token on App Start:', accessToken);

    if (accessToken) {
      try {
        // Gọi API để lấy thông tin người dùng
        const response = await authAPI(accessToken).get(endpoints.profile);

        if (response.status >= 200 && response.status < 300) {
          const userData = response.data;
          console.log('User Data:', userData);

          // Dispatch action để lưu thông tin người dùng vào Redux store
          store.dispatch({
            type: 'login',
            payload: userData,
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error.response?.data || error.message);
        await AsyncStorage.removeItem('accessToken');
        Alert.alert('Session Expired', 'Please log in again.');
      }
    } else {
      console.log('No access token found. Redirecting to login.');
    }
  } catch (error) {
    console.error('Error initializing store:', error.message);
    Alert.alert('Error', 'An unexpected error occurred. Please try again.');
  }
};

initializeStore();

export default store;
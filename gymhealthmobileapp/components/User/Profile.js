import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';

export default function Profile({ navigation, user: propUser, updateUser }) {
  // Sử dụng prop user nếu được truyền vào, ngược lại dùng state local
  const [user, setUser] = useState(propUser || null);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    // Cập nhật state local khi prop thay đổi
    if (propUser) {
      setUser(propUser);
      setLoading(false);
    } else {
      fetchUserData();
    }
  }, [propUser]);

  const fetchUserData = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      console.log('Access Token:', accessToken);

      if (!accessToken) {
        console.log('No access token found');
        setLoading(false);
        return;
      }

      // Gọi API profile để lấy thông tin người dùng
      try {
        const response = await fetch('http://192.168.1.5:8000/profile/', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('Response Status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', errorText);
          throw new Error('Failed to fetch user profile');
        }

        const userData = await response.json();
        console.log('User Data:', userData);

        // Lưu thông tin người dùng vào state
        setUser(userData);

        // Dispatch action để cập nhật Redux state
        dispatch({
          type: 'login',
          payload: userData,
        });
      } catch (error) {
        console.error('Error fetching user data:', error.message);
        // Nếu có lỗi khi gọi API, không làm gì thêm
      }
    } catch (error) {
      console.error('Error accessing AsyncStorage:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Xóa accessToken và userData khỏi AsyncStorage
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('userData');

      // Dispatch action để cập nhật trạng thái logout
      dispatch({ type: 'logout' });

      // Cập nhật trạng thái user trong TabNavigator
      if (updateUser) {
        updateUser(null);
      }

      Alert.alert('Logout Successful', 'You have been logged out.');
      
      // KHÔNG cần điều hướng đến bất kỳ màn hình nào
      // TabNavigator sẽ tự động hiển thị các tab đăng nhập/đăng ký
    } catch (error) {
      console.error('Logout error:', error.message);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.text}>Username: {user ? user.username : 'Guest'}</Text>
      <Text style={styles.text}>Email: {user ? user.email : 'N/A'}</Text>
      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
  },
  text: {
    fontSize: 18,
    color: '#333',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
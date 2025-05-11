import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import axiosInstance, { endpoints } from '../../configs/API'; // Import axiosInstance và endpoints từ API.js
import { CLIENT_ID, CLIENT_SECRET } from '../../configs/API'; // Import CLIENT_ID và CLIENT_SECRET
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage
import { useDispatch } from 'react-redux'; // Import Redux để dispatch action

export default function Login({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch(); // Sử dụng dispatch để cập nhật Redux

  const handleLogin = async () => {
    try {
      const data = {
        grant_type: 'password', // OAuth2 grant type
        username: username.trim(), // Loại bỏ khoảng trắng thừa
        password: password.trim(),
        client_id: CLIENT_ID, // ID của ứng dụng
        client_secret: CLIENT_SECRET, // Secret của ứng dụng
      };

      const response = await axiosInstance.post(endpoints.login, data, {
        headers: {
          'Content-Type': 'application/json', // Gửi dữ liệu dạng JSON
          Accept: 'application/json',
        },
      });

      if (response.data && response.data.access_token) {
        // Lưu accessToken vào AsyncStorage
        await AsyncStorage.setItem('accessToken', response.data.access_token);

        // Dispatch action để cập nhật trạng thái login
        dispatch({
          type: 'login',
          payload: {}, // Truyền payload mặc định nếu không có dữ liệu
        });

        Alert.alert('Login Successful', 'You have successfully logged in.');
        navigation.navigate('Profile'); // Điều hướng đến màn hình Home
      } else {
        Alert.alert('Login Failed', 'Invalid username or password.');
      }
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);

      // Kiểm tra lỗi từ server
      if (error.response) {
        const status = error.response.status;
        const errorMessage = error.response.data?.error_description || error.response.data?.error || 'An error occurred.';

        switch (status) {
          case 400:
            Alert.alert('Login Failed', 'Incorrect username or password.');
            break;
          case 401:
            Alert.alert('Unauthorized', 'Incorrect username or password.');
            break;
          case 403:
            Alert.alert('Access Denied', 'You do not have permission to access this resource.');
            break;
          case 500:
            Alert.alert('Server Error', 'An internal server error occurred. Please try again later.');
            break;
          default:
            Alert.alert('Login Error', errorMessage);
            break;
        }
      } else {
        // Lỗi không có phản hồi từ server (ví dụ: mất kết nối mạng)
        Alert.alert('Network Error', 'Please check your internet connection and try again.');
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Login</Text>

      {/* Ô nhập liệu tên đăng nhập */}
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#aaa"
        value={username}
        onChangeText={setUsername}
      />

      {/* Ô nhập liệu mật khẩu */}
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#aaa"
        secureTextEntry={true}
        value={password}
        onChangeText={setPassword}
      />

      {/* Nút Đăng nhập */}
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>LOGIN</Text>
      </TouchableOpacity>

      {/* Điều hướng đến màn hình Register */}
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.switchText}>Don't have an account? Register</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#333',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchText: {
    fontSize: 14,
    color: '#007bff',
    marginTop: 10,
  },
});
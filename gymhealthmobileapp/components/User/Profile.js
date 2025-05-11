import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage
import { useDispatch } from 'react-redux'; // Import Redux hooks

export default function Home({ navigation }) {
  const [user, setUser] = useState(null); // Lưu thông tin người dùng trong state
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const accessToken = await AsyncStorage.getItem('accessToken');
        console.log('Access Token:', accessToken);

        if (!accessToken) {
          Alert.alert('Error', 'No access token found. Please log in again.');
          navigation.navigate('Login');
          return;
        }

        // Gọi API profile để lấy thông tin người dùng
        const response = await fetch('http://192.168.233.1:8000/profile/', {
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
        Alert.alert('Error', 'Failed to fetch user data.');
        navigation.navigate('Login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [dispatch, navigation]);

  const handleLogout = async () => {
    try {
      // Xóa accessToken khỏi AsyncStorage
      await AsyncStorage.removeItem('accessToken');

      // Dispatch action để cập nhật trạng thái logout
      dispatch({ type: 'logout' });

      Alert.alert('Logout Successful', 'You have been logged out.');
      navigation.navigate('Login'); // Điều hướng về màn hình Login
    } catch (error) {
      console.error('Logout error:', error.message);
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
      <Text style={styles.text}>Welcome, {user ? user.username : 'Guest'}!</Text>
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
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
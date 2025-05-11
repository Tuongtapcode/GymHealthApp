import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, ImageBackground } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider } from 'react-redux';
import store from './store/store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import màn hình Login, Register, Home
import Login from './components/User/Login';
import Register from './components/User/Register';
import Home from './components/Home/Home';
import Profile from './components/User/Profile';
const Stack = createStackNavigator();

function WelcomeScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const checkAccessToken = async () => {
      try {
        const accessToken = await AsyncStorage.getItem('accessToken');
        console.log('Access Token:', accessToken);

        if (accessToken) {
          // Điều hướng đến Home nếu accessToken tồn tại
          navigation.replace('Profile');
        } else {
          // Điều hướng đến Login nếu không có accessToken
          navigation.replace('Login');
        }
      } catch (error) {
        console.error('Error checking access token:', error.message);
        navigation.replace('Login'); // Điều hướng đến Login nếu có lỗi
      }
    };

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 4000,
      useNativeDriver: true,
    }).start(() => {
      checkAccessToken(); // Kiểm tra accessToken sau khi hiệu ứng hoàn tất
    });
  }, [fadeAnim, navigation]);

  return (
    <ImageBackground
      source={require('./assets/backgroundWellcome.jpg')}
      style={styles.background}
    >
      <View style={styles.container}>
        <Animated.Text style={[styles.welcomeText, { opacity: fadeAnim }]}>
          Welcome To Gym
        </Animated.Text>
      </View>
    </ImageBackground>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen name="Register" component={Register} />
          <Stack.Screen name="Profile" component={Profile} />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start', // Đưa nội dung lên phía trên
    paddingTop: '40%', // Đẩy nội dung xuống 1/4 màn hình
  },
  welcomeText: {
    color: '#ffffff',
    fontSize: 45,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: '#000000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
});

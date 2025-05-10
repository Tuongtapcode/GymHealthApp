import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, ImageBackground } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import màn hình Login
import Login from './components/User/Login';
import Register from './components/User/Register';
import Home from './components/Home/Home'; 

// Tạo Stack Navigator
const Stack = createStackNavigator();

function WelcomeScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current; // Giá trị ban đầu cho hiệu ứng fade

  useEffect(() => {
    // Hiệu ứng fade-in
    Animated.timing(fadeAnim, {
      toValue: 1, // Độ mờ đến 1 (hiển thị hoàn toàn)
      duration: 4000, // Thời gian hiệu ứng (2 giây)
      useNativeDriver: true,
    }).start(() => {
      // Sau khi hiệu ứng hoàn tất, chuyển sang màn hình Login
      setTimeout(() => {
        navigation.replace('Login'); // Chuyển sang component Login
      }, 1000); // Đợi 1 giây trước khi chuyển
    });
  }, [fadeAnim, navigation]);

  return (
    <ImageBackground
      source={require('./assets/backgroundWellcome.jpg')} // Đường dẫn đến ảnh nền
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
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Register" component={Register} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover', // Đảm bảo ảnh nền bao phủ toàn màn hình
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start', // Đẩy nội dung lên trên
    paddingTop: '35%', // Đẩy nội dung xuống 1/3 màn hình
  },
  welcomeText: {
    color: '#ffffff', // White text
    fontSize: 45, // Larger font size
    fontWeight: 'bold', // Bold text
    textAlign: 'center', // Centered text
    textShadowColor: '#000000', // Shadow color
    textShadowOffset: { width: 2, height: 2 }, // Shadow offset
    textShadowRadius: 5, // Shadow blur radius
  },
});

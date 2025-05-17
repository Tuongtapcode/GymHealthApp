import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  ImageBackground,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Provider } from "react-redux";
import store from "./store/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

// Import màn hình Login, Register, Home
import Login from "./components/User/Login";
import Register from "./components/User/Register";
import Home from "./components/Home/Home";
import Profile from "./components/User/Profile";
import Schedule from "./components/Home/Schedule";
import Progress from "./components/Home/Progress";
import { PaperProvider } from "react-native-paper";

// Import PackagesNavigator thay vì import trực tiếp Packages
import PackagesNavigator from "./components/Home/Packages/PackagesNavigator";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Stack navigator cho Home (giả sử bạn cần các màn hình con trong Home)
const HomeStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={Home} />
      {/* Thêm các màn hình con khác của Home nếu cần */}
    </Stack.Navigator>
  );
};

// Tab Navigator với điều kiện hiển thị tab dựa trên trạng thái đăng nhập
const TabNavigator = () => {
  // State để theo dõi trạng thái đăng nhập của người dùng
  const [user, setUser] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Kiểm tra xem người dùng đã đăng nhập chưa khi component được tạo
  useEffect(() => {
    const checkUser = async () => {
      try {
        const accessToken = await AsyncStorage.getItem("accessToken");
        console.log("TabNavigator checking token:", accessToken);

        if (accessToken) {
          // Nếu có userData trong storage, sử dụng nó
          const userData = await AsyncStorage.getItem("userData");
          if (userData) {
            setUser(JSON.parse(userData));
          } else {
            // Nếu chỉ có token mà không có userData, vẫn coi như đã đăng nhập
            setUser({ token: accessToken });
          }
        }
        setIsInitialized(true);
      } catch (error) {
        console.error("Error checking user status:", error);
        setIsInitialized(true);
      }
    };

    checkUser();
  }, []);

  // Hàm để cập nhật trạng thái người dùng (truyền xuống các component con)
  const updateUser = (userData) => {
    console.log("Updating user state:", userData);
    setUser(userData);
  };

  // Log ra trạng thái user hiện tại để debug
  useEffect(() => {
    console.log("Current user state:", user);
  }, [user]);

  // Nếu chưa khởi tạo xong, hiện loading
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#4A90E2",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarStyle: {
          paddingVertical: 5,
        },
      }}
    >
      {user === null ? (
        // Hiển thị tab đăng nhập/đăng ký khi chưa đăng nhập
        <>
          <Tab.Screen
            name="packages"
            component={PackagesNavigator} // Sử dụng PackagesNavigator thay vì Packages
            options={{
              title: "Gói tập",
              tabBarIcon: ({ color, size }) => (
                <Icon size={size} color={color} name="package-variant" />
              ),
            }}
          />
          <Tab.Screen
            name="login"
            options={{
              title: "Đăng nhập",
              tabBarIcon: ({ color, size }) => (
                <Icon size={size} color={color} name="account" />
              ),
            }}
          >
            {(props) => <Login {...props} updateUser={updateUser} />}
          </Tab.Screen>

          <Tab.Screen
            name="register"
            options={{
              title: "Đăng ký",
              tabBarIcon: ({ color, size }) => (
                <Icon size={size} color={color} name="account-plus" />
              ),
            }}
          >
            {(props) => <Register {...props} updateUser={updateUser} />}
          </Tab.Screen>
        </>
      ) : (
        // Hiển thị tab chính khi đã đăng nhập
        <>
          <Tab.Screen
            name="home"
            component={HomeStack}
            options={{
              title: "Home",
              tabBarIcon: ({ color, size }) => (
                <Icon size={size} color={color} name="home" />
              ),
            }}
          />

          <Tab.Screen
            name="packages"
            component={PackagesNavigator} // Sử dụng PackagesNavigator thay vì Packages
            options={{
              title: "Gói tập",
              tabBarIcon: ({ color, size }) => (
                <Icon size={size} color={color} name="package-variant" />
              ),
            }}
          />
          <Tab.Screen
            name="schedule"
            component={Schedule}
            options={{
              title: "Lịch tập",
              tabBarIcon: ({ color, size }) => (
                <Icon size={size} color={color} name="calendar-month" />
              ),
            }}
          />
          <Tab.Screen
            name="progress"
            component={Progress}
            options={{
              title: "Tiến độ",
              tabBarIcon: ({ color, size }) => (
                <Icon size={size} color={color} name="chart-bar" />
              ),
            }}
          />
          <Tab.Screen
            name="profile"
            options={{
              title: "Tài khoản",
              tabBarIcon: ({ color, size }) => (
                <Icon size={size} color={color} name="account" />
              ),
            }}
          >
            {(props) => (
              <Profile {...props} user={user} updateUser={updateUser} />
            )}
          </Tab.Screen>
        </>
      )}
    </Tab.Navigator>
  );
};

function WelcomeScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 4000,
      useNativeDriver: true,
    }).start(() => {
      // Luôn điều hướng đến MainTabs, logic chọn tab sẽ được xử lý bên trong TabNavigator
      navigation.replace("MainTabs");
    });
  }, [fadeAnim, navigation]);

  return (
    <ImageBackground
      source={require("./assets/backgroundWellcome.jpg")}
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
      <PaperProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="MainTabs" component={TabNavigator} />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: "cover",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start", // Đưa nội dung lên phía trên
    paddingTop: "40%", // Đẩy nội dung xuống 1/4 màn hình
  },
  welcomeText: {
    color: "#ffffff",
    fontSize: 45,
    fontWeight: "bold",
    textAlign: "center",
    textShadowColor: "#000000",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
});

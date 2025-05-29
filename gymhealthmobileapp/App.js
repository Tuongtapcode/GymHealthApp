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
import Progress from "./components/Home/Progress/Progress";
import { PaperProvider } from "react-native-paper";

// Import components cho Trainer
import TrainerDashboard from "./components/Trainer/TrainerDashboard";
import TrainerProfile from "./components/Trainer/TrainerProfile";
import TrainerSchedule from "./components/Trainer/TrainerSchedule";
// Import PackagesNavigator thay vì import trực tiếp Packages
import PackagesNavigator from "./components/Home/Packages/PackagesNavigator";
import ProgressNavigator from "./components/Home/Progress/ProgressNavigator";
import Trainer from "./components/Trainer/Trainer";
import TrainingProgress from "./components/Trainer/TrainingProgress";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Stack navigator cho Home (Member)
const HomeStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={Home} />
      <Stack.Screen name="Schedule" component={Schedule} />
      <Stack.Screen name="Profile" component={Profile} />
    </Stack.Navigator>
  );
};

// Tab Navigator cho MEMBER
const MemberTabNavigator = ({ user, updateUser }) => {
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
        component={PackagesNavigator}
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
        component={ProgressNavigator}
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
        {(props) => <Profile {...props} user={user} updateUser={updateUser} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const DashboardStack = ({ user, updateUser }) => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="DashboardMain"
        component={TrainerDashboard}
        options={{
          headerShown: false, // Vì Tab Navigator đã có header
        }}
      />
      {/* Thêm TrainingProgress vào Dashboard Stack */}
      <Stack.Screen
        name="TrainingProgress"
        component={TrainingProgress}
        options={{
          headerShown: false, // Component đã có header riêng
          title: "Cập nhật tiến độ",
        }}
      />
    </Stack.Navigator>
  );
};

// Stack Navigator cho Schedule tab
const ScheduleStack = ({ user, updateUser }) => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ScheduleMain"
        component={TrainerSchedule}
        options={{
          headerShown: false,
        }}
      />
      {/* Có thể thêm TrainingProgress vào đây nếu cần từ Schedule */}
      <Stack.Screen
        name="TrainingProgress"
        component={TrainingProgress}
        options={{
          headerShown: false,
          title: "Cập nhật tiến độ",
        }}
      />
    </Stack.Navigator>
  );
};

// Stack Navigator cho Profile tab
const ProfileStack = ({ user, updateUser }) => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfileMain"
        options={{
          headerShown: false,
        }}
      >
        {(props) => (
          <TrainerProfile {...props} user={user} updateUser={updateUser} />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

// Tab Navigator chính cho TRAINER (đã sửa)
const TrainerTabNavigator = ({ user, updateUser }) => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#FF6B35",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarStyle: {
          paddingVertical: 5,
          backgroundColor: "#fff",
        },
      }}
    >
      <Tab.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Icon size={size} color={color} name="view-dashboard" />
          ),
        }}
      >
        {(props) => (
          <DashboardStack {...props} user={user} updateUser={updateUser} />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="schedule"
        options={{
          title: "Lịch tập",
          tabBarIcon: ({ color, size }) => (
            <Icon size={size} color={color} name="calendar-clock" />
          ),
        }}
      >
        {(props) => (
          <ScheduleStack {...props} user={user} updateUser={updateUser} />
        )}
      </Tab.Screen>

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
          <ProfileStack {...props} user={user} updateUser={updateUser} />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
};
// Main Tab Navigator với điều kiện hiển thị dựa trên role
const MainTabNavigator = () => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const accessToken = await AsyncStorage.getItem("accessToken");
        const userDataString = await AsyncStorage.getItem("userData");

        console.log("TabNavigator checking token:", accessToken);

        if (accessToken && userDataString) {
          const userData = JSON.parse(userDataString);
          setUser(userData);

          // Lấy role từ Redux store hoặc từ API
          // Tạm thời lấy từ userData nếu có
          if (userData.role) {
            setUserRole(userData.role);
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

  const updateUser = (userData) => {
    console.log("Updating user state:", userData);
    setUser(userData);
    if (userData.role) {
      setUserRole(userData.role);
    }
  };

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Nếu chưa đăng nhập - hiển thị tab login/register
  if (user === null) {
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
        <Tab.Screen
          name="packages"
          component={PackagesNavigator}
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
      </Tab.Navigator>
    );
  }

  // Nếu đã đăng nhập - hiển thị tab theo role
  if (userRole === "TRAINER") {
    return <TrainerTabNavigator user={user} updateUser={updateUser} />;
  } else {
    return <MemberTabNavigator user={user} updateUser={updateUser} />;
  }
};

function WelcomeScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 4000,
      useNativeDriver: true,
    }).start(() => {
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
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
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
    justifyContent: "flex-start",
    paddingTop: "40%",
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

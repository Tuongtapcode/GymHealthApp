import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import Progress from "./Progress";
import ProgressDetail from "./ProgressDetail";
// import AddProgress from "./AddProgress";
// import EditProgress from "./EditProgress";

const Stack = createStackNavigator();
const AddProgress = () => {
    return (<View>
        <Text>AddProgress</Text>
    </View>)
}
const EditProgress = () => {
    return (<View>
        <Text>EditProgress</Text>
    </View>)
}
const ProgressNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Progress"
        component={Progress}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProgressDetail"
        component={ProgressDetail}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddProgress"
        component={AddProgress}
        options={{
          title: "Thêm tiến độ mới",
          headerStyle: {
            backgroundColor: "#1a73e8",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      />
      <Stack.Screen
        name="EditProgress"
        component={EditProgress}
        options={{
          title: "Chỉnh sửa tiến độ",
          headerStyle: {
            backgroundColor: "#1a73e8",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      />
    </Stack.Navigator>
  );
};

export default ProgressNavigator;
import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import Packages from "./Packages";
import SubscriptionHistory from "./SubscriptionHistory";
import Payment from "./Payment";

const Stack = createStackNavigator();

const PackagesNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Packages"
        component={Packages}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SubscriptionHistory"
        component={SubscriptionHistory}
        options={{
          title: "Lịch sử gói tập",
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
        name="Payment"
        component={Payment}
        options={{
          title: "Thanh toán",
          headerStyle: {
            backgroundColor: "#1a73e8",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
          headerLeft: null, // Disable back button during payment
        }}
      />
    </Stack.Navigator>
  );
};

export default PackagesNavigator;

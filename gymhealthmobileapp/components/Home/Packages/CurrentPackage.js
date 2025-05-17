import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { styles } from "./Styles";

const CurrentPackage = ({ userPackage, handleViewDetails }) => {
  // Status is always active for current package
  const statusColor = "#4CAF50";
  const statusIcon = "check-circle";
  const statusText = "Đang hoạt động";

  return (
    <View
      style={[
        styles.subscriptionItem,
        { borderLeftWidth: 4, borderLeftColor: statusColor },
      ]}
    >
      <View
        style={[
          styles.activePackageBadge,
          { backgroundColor: statusColor },
        ]}
      >
        <Icon
          name={statusIcon}
          size={14}
          color="#fff"
          style={{ marginRight: 4 }}
        />
        <Text style={styles.activePackageBadgeText}>
          {statusText}
        </Text>
      </View>

      <View style={styles.subscriptionHeader}>
        <Text style={styles.packageName}>{userPackage.name}</Text>
      </View>

      <View style={styles.packageDetails}>
        <View style={styles.packageDetail}>
          <Text style={styles.detailLabel}>
            <Icon name="cash" size={16} color="#666" /> Giá:
          </Text>
          <Text style={[styles.detailValue, { color: "#EF6C00" }]}>
            {userPackage.price}
          </Text>
        </View>
        <View style={styles.packageDetail}>
          <Text style={styles.detailLabel}>
            <Icon name="calendar-month" size={16} color="#666" /> Thời hạn:
          </Text>
          <Text style={styles.detailValue}>
            {userPackage.duration}
          </Text>
        </View>
        <View style={styles.packageDetail}>
          <Text style={styles.detailLabel}>
            <Icon name="account-tie" size={16} color="#666" /> PT còn lại:
          </Text>
          <Text style={styles.detailValue}>
            {userPackage.sessions} buổi
          </Text>
        </View>
        <View style={styles.packageDetail}>
          <Text style={styles.detailLabel}>
            <Icon name="clock-outline" size={16} color="#666" /> Thời gian:
          </Text>
          <Text style={styles.detailValue}>
            {userPackage.startDate} - {userPackage.endDate}
          </Text>
        </View>
        <View style={styles.packageDetail}>
          <Text style={styles.detailLabel}>
            <Icon name="timer-sand" size={16} color="#666" /> Còn lại:
          </Text>
          <Text
            style={[
              styles.detailValue,
              { color: "#4CAF50", fontWeight: "bold" },
            ]}
          >
            {userPackage.remainingDays} ngày
          </Text>
        </View>
      </View>

      <View style={styles.actionButtonContainer}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.primaryButton,
            { backgroundColor: "#1a73e8" },
          ]}
          onPress={() => {
            const packageId = userPackage.originalData?.package?.id;
            if (packageId) {
              handleViewDetails(packageId);
            } else {
              console.log("Cannot find package ID from user package data");
            }
          }}
        >
          <Text style={styles.primaryButtonText}>Xem chi tiết</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CurrentPackage;
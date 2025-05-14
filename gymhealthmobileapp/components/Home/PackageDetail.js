import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import {
  Modal,
  Portal,
  Text,
  Button,
  Card,
  Chip,
  Divider,
  List,
  IconButton,
} from "react-native-paper";
import HTML from "react-native-render-html";
import { useWindowDimensions } from "react-native";
import axiosInstance, { endpoints } from "../../configs/API";

const PackageDetail = ({ visible, packageId, onDismiss, onRegister }) => {
  const [packageDetail, setPackageDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { width } = useWindowDimensions();
  const [benefits, setBenefits] = useState([]);

  useEffect(() => {
    if (visible && packageId) {
      fetchPackageDetails();
    }
  }, [visible, packageId]);

  const fetchPackageDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch detailed package information
      const response = await axiosInstance.get(
        `${endpoints.packages}${packageId}/`
      );

      console.log("Package detail response:", response.data);
      setPackageDetail(response.data);

      // Lấy benefits trực tiếp từ response nếu có
      if (response.data.benefits && Array.isArray(response.data.benefits)) {
        setBenefits(response.data.benefits);
      } else {
        setBenefits([]);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching package details:", error);

      if (error.response) {
        setError(`Lỗi từ server: ${error.response.status}`);
      } else if (error.request) {
        setError(
          "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng."
        );
      } else {
        setError(`Lỗi: ${error.message}`);
      }

      setLoading(false);
    }
  };

  // Format currency (VND)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get package type label
  const getPackageTypeLabel = (type) => {
    // Kiểm tra nếu type là object (từ response mới)
    if (type && typeof type === "object" && type.name) {
      return type.name;
    }

    // Xử lý cho trường hợp cũ (nếu type là số)
    switch (type) {
      case 1:
        return "Hàng tháng";
      case 2:
        return "Hàng quý";
      case 3:
        return "Hàng năm";
      default:
        return "Khác";
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text style={styles.loadingText}>
              Đang tải thông tin chi tiết...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Button
              mode="contained"
              onPress={fetchPackageDetails}
              style={styles.retryButton}
            >
              Thử lại
            </Button>
          </View>
        ) : packageDetail ? (
          <ScrollView style={styles.scrollView}>
            <Card style={styles.card}>
              <Card.Cover
                source={{
                  uri: `https://res.cloudinary.com/duqln52pu/${packageDetail.image}`,
                }}
                style={styles.cardImage}
                resizeMode="cover"
              />

              <Card.Content style={styles.cardContent}>
                <View style={styles.headerContainer}>
                  <Text variant="headlineMedium" style={styles.title}>
                    {packageDetail.name}
                  </Text>
                  <Chip mode="outlined" style={styles.typeChip}>
                    {getPackageTypeLabel(packageDetail.package_type)}
                  </Chip>
                </View>

                <Divider style={styles.divider} />

                <View style={styles.priceContainer}>
                  <View style={styles.priceItem}>
                    <Text variant="bodyMedium">Giá mỗi tháng:</Text>
                    <Text variant="bodyLarge" style={styles.priceMonth}>
                      {formatCurrency(packageDetail.price_per_month)}
                    </Text>
                  </View>

                  <View style={styles.priceItem}>
                    <Text variant="bodyMedium">Tổng giá:</Text>
                    <Text variant="headlineSmall" style={styles.priceTotal}>
                      {formatCurrency(packageDetail.price)}
                    </Text>
                  </View>

                  <View style={styles.priceItem}>
                    <Text variant="bodyMedium">Số buổi PT:</Text>
                    <Text variant="bodyLarge" style={styles.sessions}>
                      {packageDetail.pt_sessions} buổi
                    </Text>
                  </View>
                </View>

                <Divider style={styles.divider} />

                <View style={styles.descriptionContainer}>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Mô tả
                  </Text>
                  {packageDetail.description ? (
                    <HTML
                      source={{ html: packageDetail.description }}
                      contentWidth={width - 60}
                      tagsStyles={htmlStyles}
                    />
                  ) : (
                    <Text variant="bodyMedium" style={styles.noData}>
                      Không có mô tả
                    </Text>
                  )}
                </View>

                <Divider style={styles.divider} />

                <View style={styles.benefitsContainer}>
                  <View style={styles.sectionHeader}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                      Quyền lợi
                    </Text>
                    <IconButton
                      icon="help-circle-outline" // Biểu tượng dấu ? có vòng tròn
                      size={20} // Kích thước biểu tượng
                      onPress={() => console.log("Đi đến trang quyền lợi")} // Hành động khi nhấn vào biểu tượng
                      iconColor="#6200ee" // Màu của biểu tượng
                      style={styles.helpIcon}
                    />
                  </View>
                  {benefits.length > 0 ? (
                    <List.Section style={styles.benefitsList}>
                      {benefits.map((benefit) => (
                        <List.Item
                          key={benefit.id}
                          title={benefit.name}
                          description={() => (
                            <HTML
                              source={{ html: benefit.description }}
                              contentWidth={width - 60} // Đảm bảo nội dung HTML vừa với màn hình
                              tagsStyles={htmlStyles} // Áp dụng style tùy chỉnh cho HTML
                            />
                          )}
                          left={(props) => (
                            <List.Icon
                              {...props}
                              icon="check-circle"
                              color="green"
                            />
                          )}
                          titleStyle={styles.benefitTitle}
                          style={styles.benefitItem}
                        />
                      ))}
                    </List.Section>
                  ) : (
                    <Text variant="bodyMedium" style={styles.noData}>
                      Không có quyền lợi bổ sung
                    </Text>
                  )}
                </View>
              </Card.Content>

              <Card.Actions style={styles.cardActions}>
                <Button
                  mode="outlined"
                  onPress={onDismiss}
                  style={[styles.button, styles.cancelButton]}
                >
                  Đóng
                </Button>
                <Button
                  mode="contained"
                  onPress={() => onRegister(packageDetail.id)}
                  style={[styles.button, styles.registerButton]}
                >
                  Đăng ký ngay
                </Button>
              </Card.Actions>
            </Card>
          </ScrollView>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              Không tìm thấy thông tin gói tập
            </Text>
            <Button
              mode="outlined"
              onPress={onDismiss}
              style={styles.closeButton}
            >
              Đóng
            </Button>
          </View>
        )}
      </Modal>
    </Portal>
  );
};

const htmlStyles = {
  p: {
    marginBottom: 10,
    lineHeight: 20,
  },
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: "white",
    marginHorizontal: 20,
    borderRadius: 20,
    maxHeight: "90%",
  },
  scrollView: {
    width: "100%",
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
  },
  cardImage: {
    height: 200,
  },
  cardContent: {
    padding: 16,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontWeight: "bold",
    flex: 1,
  },
  typeChip: {
    marginLeft: 10,
  },
  divider: {
    marginVertical: 15,
    height: 1,
  },
  priceContainer: {
    marginBottom: 10,
  },
  priceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 5,
  },
  priceMonth: {
    color: "#666",
  },
  priceTotal: {
    fontWeight: "bold",
    color: "#EF6C00",
  },
  sessions: {
    fontWeight: "500",
  },
  descriptionContainer: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: 10,
  },
  benefitsContainer: {
    marginBottom: 10,
  },
  benefitsList: {
    paddingHorizontal: 0,
  },
  benefitItem: {
    paddingVertical: 5,
    paddingLeft: 0,
  },
  benefitTitle: {
    fontWeight: "500",
  },
  benefitDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  noData: {
    fontStyle: "italic",
    color: "#666",
  },
  cardActions: {
    justifyContent: "space-around",
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 25,
  },
  cancelButton: {
    borderColor: "#ccc",
  },
  registerButton: {},
  loadingContainer: {
    padding: 30,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
  },
  errorContainer: {
    padding: 30,
    alignItems: "center",
  },
  errorText: {
    color: "red",
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    borderRadius: 25,
  },
  closeButton: {
    borderRadius: 25,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontWeight: "bold",
    fontSize: 16,
   
  },
  helpIcon: {
    marginLeft: 5, // Khoảng cách giữa tiêu đề và biểu tượng
    
  },
});

export default PackageDetail;

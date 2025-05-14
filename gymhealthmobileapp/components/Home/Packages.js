import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from "react-native";
import {
  Searchbar,
  Chip,
  Button,
  Card,
  Divider,
  Text as PaperText,
} from "react-native-paper";
import HTML from "react-native-render-html";
import { useWindowDimensions } from "react-native";
import axiosInstance, { endpoints } from "../../configs/API";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PackageDetail from "./PackageDetail";

const Packages = ({ navigation }) => {
  const [packages, setPackages] = useState([]);
  const [filteredPackages, setFilteredPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState(null);
  const { width } = useWindowDimensions();
  const [error, setError] = useState(null);
  
  // State cho modal chi tiết
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  
  // State cho thông tin gói tập hiện tại của user
  const [userPackage, setUserPackage] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Kiểm tra đăng nhập và lấy thông tin gói tập hiện tại
  useEffect(() => {
    checkLoginStatus();
  }, []);
  
  // Fetch packages data
  useEffect(() => {
    fetchPackages();
  }, []);

  // Kiểm tra trạng thái đăng nhập
  const checkLoginStatus = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      if (accessToken) {
        setIsLoggedIn(true);
        fetchSubscription();
      } else {
        setIsLoggedIn(false);
        setSubscriptionLoading(false);
      }
    } catch (error) {
      console.error("Error checking login status:", error);
      setIsLoggedIn(false);
      setSubscriptionLoading(false);
    }
  };

  // Lấy thông tin gói tập từ API
  const fetchSubscription = async () => {
    try {
      setSubscriptionLoading(true);
      setSubscriptionError(null);

      // Lấy access token từ AsyncStorage
      const accessToken = await AsyncStorage.getItem("accessToken");
      console.log("Access Token for subscription:", accessToken);

      if (!accessToken) {
        console.log("No access token found");
        throw new Error("Không tìm thấy token đăng nhập");
      }

      console.log("Requesting URL:", endpoints.subscription + "my/");
      const response = await axiosInstance.get(endpoints.subscription + "my/", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log("Response data:", response.data);
      console.log("Subscription API response:", response.status);

      // Lọc ra gói đang hoạt động (active) và lấy gói mới nhất
      const activeSubscriptions = response.data.results.filter(
        (sub) => sub.status === "active"
      );

      if (activeSubscriptions.length > 0) {
        // Sắp xếp theo ngày bắt đầu để lấy gói mới nhất
        const latestSubscription = activeSubscriptions.sort(
          (a, b) => new Date(b.start_date) - new Date(a.start_date)
        )[0];

        // Chuyển đổi dữ liệu để phù hợp với định dạng cũ
        const formattedPackage = {
          id: latestSubscription.id.toString(),
          name: latestSubscription.package_name,
          price: `${parseFloat(
            latestSubscription.discounted_price
          ).toLocaleString("vi-VN")}đ`,
          benefits: latestSubscription.package.benefits
            .map((b) => b.name)
            .join(", "),
          sessions: latestSubscription.remaining_pt_sessions,
          duration: `${latestSubscription.package.package_type.duration_months} tháng`,
          endDate: latestSubscription.end_date,
          startDate: latestSubscription.start_date,
          remainingDays: latestSubscription.remaining_days,
          // Lưu trữ dữ liệu gốc để sử dụng nếu cần
          originalData: latestSubscription,
        };

        setUserPackage(formattedPackage);
      } else {
        // Không có gói đang hoạt động
        setUserPackage(null);
      }

      setSubscriptionLoading(false);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      setSubscriptionError("Không thể tải dữ liệu gói tập");
      setSubscriptionLoading(false);
    }
  };

  const fetchPackages = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Thêm các filter vào params nếu có
      const requestParams = { ...params };
      
      // Thêm param active=true để chỉ lấy gói đang hoạt động
      requestParams.active = true;
      
      // Thêm package_type vào params nếu có lọc theo loại
      if (selectedType !== null) {
        requestParams.package_type = selectedType;
      }
      
      // Thêm tìm kiếm theo tên nếu có
      if (searchQuery.trim() !== "") {
        requestParams.search = searchQuery.trim();
      }

      console.log(
        "Requesting packages URL:",
        endpoints.packages,
        "with params:",
        requestParams
      );
      
      const response = await axiosInstance.get(endpoints.packages, {
        params: requestParams
      });

      console.log("Packages API response status:", response.status);
      console.log("Response data:", response.data);

      if (response.data && Array.isArray(response.data)) {
        // Định dạng dữ liệu nhận được
        const formattedPackages = response.data.map(pkg => {
          return {
            id: pkg.id,
            price_per_month: pkg.price_per_month,
            active: pkg.active,
            created_date: pkg.created_date,
            updated_date: pkg.updated_date,
            name: pkg.name,
            description: pkg.description,
            price: pkg.price,
            image: pkg.image,
            pt_sessions: pkg.pt_sessions,
            package_type: pkg.package_type,
            benefits: pkg.benefits,
            originalData: pkg // Lưu dữ liệu gốc để sử dụng nếu cần
          };
        });

        setPackages(formattedPackages);
        setFilteredPackages(formattedPackages);
      } else {
        console.log("No packages data or invalid data format");
        setPackages([]);
        setFilteredPackages([]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching packages:', error);
      
      if (error.response) {
        console.log("Server error response:", error.response.data);
        setError(`Lỗi từ server: ${error.response.status}`);
      } else if (error.request) {
        console.log("No response received:", error.request);
        setError("Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.");
      } else {
        setError(`Lỗi: ${error.message}`);
      }
      
      setLoading(false);
      
      // Nếu có demoData đã được định nghĩa, sử dụng làm fallback
      if (typeof demoData !== 'undefined') {
        console.log("Loading demo data as fallback");
        setPackages(demoData);
        setFilteredPackages(demoData);
      }
    }
  };

  // Handle search
  const onChangeSearch = (query) => {
    setSearchQuery(query);
    
    // Gọi API mới với tham số tìm kiếm
    if (query.trim() === "") {
      // Nếu xóa tìm kiếm, chỉ áp dụng bộ lọc theo loại
      fetchPackages(selectedType !== null ? { package_type: selectedType } : {});
    } else {
      // Áp dụng cả tìm kiếm và lọc theo loại nếu có
      const params = { search: query.trim() };
      if (selectedType !== null) {
        params.package_type = selectedType;
      }
      fetchPackages(params);
    }
  };

  // Filter by package type
  const filterByType = (type) => {
    setSelectedType(type);
    
    // Gọi API với bộ lọc mới
    const params = {};
    
    if (type !== null) {
      params.package_type = type;
    }
    
    if (searchQuery.trim() !== "") {
      params.search = searchQuery.trim();
    }
    
    fetchPackages(params);
  };

  // Handle registration
  const handleRegister = (packageId) => {
    console.log(`Register for package ${packageId}`);
    // Implement registration logic here
  };
  
  // Handle view details - Mở modal chi tiết
  const handleViewDetails = (packageId) => {
    console.log(`View details for package ${packageId}`);
    setSelectedPackageId(packageId);
    setDetailModalVisible(true);
  };
  
  // Đóng modal chi tiết
  const hideDetailModal = () => {
    setDetailModalVisible(false);
  };

  // Get package type label
  const getPackageTypeLabel = (type) => {
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

  // Format currency (VND)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Render package item
  const renderPackageItem = ({ item }) => (
    <Card style={styles.card} elevation={3}>
      <Card.Cover
        source={{
          uri: `https://res.cloudinary.com/duqln52pu/${item.image}`,
        }}
        style={styles.cardImage}
        resizeMode="cover"
      />
      <Card.Content style={styles.cardContent}>
        <View style={styles.typeChipContainer}>
          <Chip mode="outlined" style={styles.typeChip}>
            {getPackageTypeLabel(item.package_type)}
          </Chip>
        </View>
        <PaperText variant="titleLarge" style={styles.title}>
          {item.name}
        </PaperText>
        {/* <HTML source={{ html: item.description }} contentWidth={width - 60} /> */}

        <View style={styles.detailsRow}>
          <PaperText variant="bodySmall">Giá mỗi tháng:</PaperText>
          <Text style={styles.priceMonth}>
            {formatCurrency(item.price_per_month)}
          </Text>
        </View>

        <View style={styles.detailsRow}>
          <PaperText variant="bodySmall">Tổng giá:</PaperText>
          <Text style={styles.priceTotal}>{formatCurrency(item.price)}</Text>
        </View>

        <View style={styles.detailsRow}>
          <PaperText variant="bodySmall">Buổi PT:</PaperText>
          <Text style={styles.sessions}>{item.pt_sessions} buổi</Text>
        </View>
      </Card.Content>

      <Divider />

      <Card.Actions style={styles.cardActions}>
        <Button
          mode="outlined"
          style={[styles.btn, { marginLeft: 10 }]}
          onPress={() => handleViewDetails(item.id)}
        >
          Chi tiết
        </Button>
        <Button
          mode="contained"
          style={styles.btn}
          onPress={() => handleRegister(item.id)}
        >
          Đăng ký
        </Button>
      </Card.Actions>
    </Card>
  );

  // Render filter chips
  const renderFilterChips = () => (
    <View style={styles.filterContainer}>
      <Chip
        selected={selectedType === null}
        onPress={() => filterByType(null)}
        style={[
          styles.filterChip,
          selectedType === null ? styles.selectedChip : {},
        ]}
      >
        Tất cả
      </Chip>
      <Chip
        selected={selectedType === 1}
        onPress={() => filterByType(1)}
        style={[
          styles.filterChip,
          selectedType === 1 ? styles.selectedChip : {},
        ]}
      >
        Hàng tháng
      </Chip>
      <Chip
        selected={selectedType === 2}
        onPress={() => filterByType(2)}
        style={[
          styles.filterChip,
          selectedType === 2 ? styles.selectedChip : {},
        ]}
      >
        Hàng quý
      </Chip>
      <Chip
        selected={selectedType === 3}
        onPress={() => filterByType(3)}
        style={[
          styles.filterChip,
          selectedType === 3 ? styles.selectedChip : {},
        ]}
      >
        Hàng năm
      </Chip>
    </View>
  );

  // Component hiển thị gói tập hiện tại của người dùng
  const CurrentPackage = () => {
    if (subscriptionLoading) {
      return (
        <View style={[styles.packageCard, styles.centerContent]}>
          <ActivityIndicator size="large" color="#1a73e8" />
          <Text style={{ marginTop: 10 }}>Đang tải thông tin gói tập...</Text>
        </View>
      );
    }

    if (subscriptionError) {
      return (
        <View style={[styles.packageCard, styles.centerContent]}>
          <Text style={styles.errorText}>{subscriptionError}</Text>
          <TouchableOpacity
            style={[styles.buttonPrimary, { marginTop: 12 }]}
            onPress={fetchSubscription}
          >
            <Text style={styles.buttonPrimaryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!userPackage) {
      return (
        <View style={[styles.packageCard, styles.centerContent]}>
          <Text style={{ fontSize: 16, marginBottom: 12 }}>
            Bạn chưa đăng ký gói tập nào
          </Text>
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() => {}} // Scroll xuống các gói tập bên dưới
          >
            <Text style={styles.buttonPrimaryText}>Đăng ký ngay</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.packageCard}>
        <Text style={styles.cardTitle}>Gói tập hiện tại</Text>
        <Text style={styles.packageName}>{userPackage.name}</Text>
        <View style={styles.packageDetails}>
          <View style={styles.packageDetail}>
            <Text style={styles.detailLabel}>Giá:</Text>
            <Text style={styles.detailValue}>{userPackage.price}</Text>
          </View>
          <View style={styles.packageDetail}>
            <Text style={styles.detailLabel}>Thời hạn:</Text>
            <Text style={styles.detailValue}>{userPackage.duration}</Text>
          </View>
          <View style={styles.packageDetail}>
            <Text style={styles.detailLabel}>Buổi với PT còn lại:</Text>
            <Text style={styles.detailValue}>{userPackage.sessions} buổi</Text>
          </View>
          <View style={styles.packageDetail}>
            <Text style={styles.detailLabel}>Còn lại:</Text>
            <Text style={styles.detailValue}>
              {userPackage.remainingDays} ngày
            </Text>
          </View>
        </View>
        <Text style={styles.packageBenefits}>{userPackage.benefits}</Text>
        <TouchableOpacity
          style={styles.buttonOutline}
          onPress={() => handleViewDetails(userPackage.originalData?.package?.id)}
        >
          <Text style={styles.buttonOutlineText}>Xem chi tiết</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render package content differently based on loading state
  const renderPackageContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <PaperText variant="bodyMedium" style={styles.loadingText}>
            Đang tải gói tập...
          </PaperText>
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <PaperText variant="bodyLarge" style={styles.errorText}>
            {error}
          </PaperText>
          <Button 
            mode="contained" 
            onPress={() => fetchPackages()} 
            style={styles.retryButton}
          >
            Thử lại
          </Button>
        </View>
      );
    }
    
    if (filteredPackages.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <PaperText variant="bodyLarge" style={styles.emptyText}>
            Không tìm thấy gói tập phù hợp
          </PaperText>
        </View>
      );
    }
    
    return (
      <FlatList
        data={filteredPackages}
        renderItem={renderPackageItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.header}>
          <PaperText variant="headlineMedium" style={styles.headerTitle}>
            Gói tập
          </PaperText>
        </View>

        {/* Hiển thị gói tập hiện tại nếu người dùng đã đăng nhập */}
        {isLoggedIn && <CurrentPackage />}

        {/* Phần tiêu đề của danh sách gói tập nếu đã có gói tập hiện tại */}
        {isLoggedIn && userPackage && (
          <View style={styles.sectionHeader}>
            <PaperText variant="titleMedium" style={styles.sectionTitle}>
              Các gói tập khác
            </PaperText>
          </View>
        )}

        <Searchbar
          placeholder="Tìm kiếm gói tập..."
          onChangeText={onChangeSearch}
          value={searchQuery}
          style={styles.searchBar}
        />

        {renderFilterChips()}

        {/* Khu vực hiển thị gói tập */}
        <View style={styles.packagesContainer}>
          {renderPackageContent()}
        </View>
      </ScrollView>
      
      {/* Modal chi tiết gói tập */}
      <PackageDetail
        visible={detailModalVisible}
        packageId={selectedPackageId}
        onDismiss={hideDetailModal}
        onRegister={handleRegister}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 10,
    paddingBottom: 20,
  },
  header: {
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  headerTitle: {
    fontWeight: "bold",
  },
  searchBar: {
    marginBottom: 10,
    borderRadius: 10,
    elevation: 2,
  },
  filterContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  selectedChip: {
    backgroundColor: "#e0e0ff",
  },
  packagesContainer: {
    flex: 1,
    minHeight: 200, // Ensure there's space for content even when empty
  },
  listContainer: {
    paddingBottom: 20,
    paddingHorizontal: 5,
  },
  card: {
    marginBottom: 15,
    borderRadius: 20,
    overflow: "hidden",
    width: "100%",
  },
  cardImage: {
    height: 180,
  },
  cardContent: {
    padding: 10,
  },
  typeChipContainer: {
    position: "absolute",
    top: -20,
    right: 10,
    zIndex: 1,
  },
  typeChip: {
    backgroundColor: "#fff",
  },
  title: {
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
  },
  priceMonth: {
    fontSize: 16,
    color: "#666",
  },
  priceTotal: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#EF6C00",
  },
  sessions: {
    fontSize: 16,
    fontWeight: "500",
  },
  cardActions: {
    justifyContent: "center",
    paddingVertical: 10,
    flexDirection: "row",
  },
  btn: {
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  loadingText: {
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    minHeight: 200,
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    borderRadius: 25,
    paddingHorizontal: 30,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  emptyText: {
    color: "#666",
  },
  
  /* Thêm styles cho phần hiển thị gói tập hiện tại */
  packageCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    marginVertical: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  packageName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1a73e8",
    marginBottom: 12,
  },
  packageDetails: {
    marginBottom: 15,
  },
  packageDetail: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  detailLabel: {
    fontSize: 16,
    color: "#666",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  packageBenefits: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
    fontStyle: "italic",
  },
  buttonPrimary: {
    backgroundColor: "#1a73e8",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: "#1a73e8",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  buttonOutlineText: {
    color: "#1a73e8",
    fontSize: 16,
    fontWeight: "600",
  },
  sectionHeader: {
    marginTop: 10,
    marginBottom: 5,
    paddingHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  errorText: {
    color: "#e53935",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 10,
  },
});

export default Packages;
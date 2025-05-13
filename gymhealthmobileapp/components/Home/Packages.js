import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
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
const Packages = () => {
  const [packages, setPackages] = useState([]);
  const [filteredPackages, setFilteredPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState(null);
  const { width } = useWindowDimensions();
    const [error, setError] = useState(null);
  // Fetch packages data
  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      setError(null);

    


      console.log(
        "Requesting packages URL:",
        endpoints.packages // Đảm bảo bạn có endpoint này trong file cấu hình
      );
      
    const response = await axiosInstance.get(endpoints.packages);

      console.log("Packages API response status:", response.status);
      console.log("Response data:", response.data);

      if (response.data && Array.isArray(response.data)) {
        // Lọc chỉ lấy các gói active nếu cần
        const activePackages = response.data.filter(pkg => pkg.active);
        
        // Thêm xử lý dữ liệu nếu cần
        const formattedPackages = activePackages.map(pkg => {
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
            // Thêm các trường khác nếu cần
            originalData: pkg, // Lưu dữ liệu gốc để sử dụng nếu cần
          };
        });

        setPackages(formattedPackages);
        setFilteredPackages(formattedPackages);
      } else {
        // Không có dữ liệu hoặc dữ liệu không đúng định dạng
        console.log("No packages data or invalid data format");
        setPackages([]);
        setFilteredPackages([]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching packages:', error);
      
      // Hiển thị thông báo lỗi cụ thể
      if (error.response) {
        // Lỗi từ response của server
        console.log("Server error response:", error.response.data);
        setError(`Lỗi từ server: ${error.response.status}`);
      } else if (error.request) {
        // Không nhận được response
        console.log("No response received:", error.request);
        setError("Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.");
      } else {
        // Lỗi trong quá trình thiết lập request
        setError(`Lỗi: ${error.message}`);
      }
      
      setLoading(false);
      
      
      
      console.log("Loading demo data as fallback");
      setPackages(demoData);
      setFilteredPackages(demoData);
    }
  };
  // Handle search
  const onChangeSearch = (query) => {
    setSearchQuery(query);

    if (query.trim() === "") {
      // If search is empty, show all or filtered by type
      filterByType(selectedType);
    } else {
      // Filter by search term and possibly type
      const filtered = packages.filter(
        (pkg) =>
          pkg.name.toLowerCase().includes(query.toLowerCase()) &&
          (selectedType === null || pkg.package_type === selectedType)
      );
      setFilteredPackages(filtered);
    }
  };

  // Filter by package type
  const filterByType = (type) => {
    setSelectedType(type);

    if (type === null) {
      // Show all packages, possibly filtered by search
      if (searchQuery.trim() === "") {
        setFilteredPackages(packages);
      } else {
        const filtered = packages.filter((pkg) =>
          pkg.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredPackages(filtered);
      }
    } else {
      // Filter by type and possibly search
      const filtered = packages.filter(
        (pkg) =>
          pkg.package_type === type &&
          (searchQuery.trim() === "" ||
            pkg.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredPackages(filtered);
    }
  };

  // Handle registration - to be implemented later
  const handleRegister = (packageId) => {
    console.log(`Register for package ${packageId}`);
    // Implement registration logic here
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
    console.log(`https://res.cloudinary.com/duqln52pu/${item.image}`),
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
        <HTML source={{ html: item.description }} contentWidth={width - 60} />

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
          style={[styles.btn, { marginLeft: 10 }]} // Thêm khoảng cách giữa hai nút
          onPress={() => handleViewDetails(item.id)} // Hàm xử lý khi nhấn "Xem chi tiết"
        >
          Xem chi tiết
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <PaperText variant="headlineMedium" style={styles.headerTitle}>
          Gói tập
        </PaperText>
      </View>

      <Searchbar
        placeholder="Tìm kiếm gói tập..."
        onChangeText={onChangeSearch}
        value={searchQuery}
        style={styles.searchBar}
      />

      {renderFilterChips()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <PaperText variant="bodyMedium" style={styles.loadingText}>
            Đang tải gói tập...
          </PaperText>
        </View>
      ) : filteredPackages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <PaperText variant="bodyLarge" style={styles.emptyText}>
            Không tìm thấy gói tập phù hợp
          </PaperText>
        </View>
      ) : (
        <FlatList
          data={filteredPackages}
          renderItem={renderPackageItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 10,
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
  listContainer: {
    paddingBottom: 20, // Khoảng cách dưới cùng
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
  },
  loadingText: {
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#666",
  },
});

export default Packages;

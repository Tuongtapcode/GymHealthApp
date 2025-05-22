import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
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
import PackageDetail from "./Packages/PackageDetail";

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
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [subscriptionPagination, setSubscriptionPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    currentPage: 1,
  });

  // Kiểm tra đăng nhập và lấy thông tin gói tập hiện tại
  useEffect(() => {
    checkLoginStatus();
  }, []);

  // Thêm một useEffect để làm mới dữ liệu khi component hiển thị (khi từ màn hình đăng nhập quay lại)
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      // Kiểm tra lại trạng thái đăng nhập khi màn hình được focus
      checkLoginStatus();
    });

    return unsubscribe;
  }, [navigation]);

  // Fetch packages data
  useEffect(() => {
    fetchPackages();
  }, []);

  // Kiểm tra trạng thái đăng nhập
  const checkLoginStatus = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      const wasLoggedIn = isLoggedIn;
      const nowLoggedIn = !!accessToken;

      setIsLoggedIn(nowLoggedIn);

      // Chỉ gọi fetchSubscription nếu người dùng đã đăng nhập
      if (nowLoggedIn) {
        console.log("User is logged in, fetching subscription data");
        fetchActiveSubscription();
      } else {
        console.log("User is not logged in");
        setUserPackage(null);
        setSubscriptionLoading(false);
      }

      // Nếu trạng thái đăng nhập thay đổi, cập nhật lại danh sách gói tập
      if (wasLoggedIn !== nowLoggedIn) {
        fetchPackages();
      }
    } catch (error) {
      console.error("Error checking login status:", error);
      setIsLoggedIn(false);
      setSubscriptionLoading(false);
    }
  };

  // Lấy thông tin gói tập từ API
  const fetchActiveSubscription = async () => {
    try {
      setSubscriptionActiveLoading(true);
      setSubscriptionActiveError(null);

      // Lấy access token từ AsyncStorage

      const accessToken = await AsyncStorage.getItem("accessToken");
      console.log("Access Token for subscription:", accessToken);

      if (!accessToken) {
        console.log("No access token found");
        throw new Error("Không tìm thấy token đăng nhập");
      }

      console.log("Requesting URL:", endpoints.subscription + "active/");
      const response = await axiosInstance.get(
        endpoints.subscription + "active/",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      console.log("Response data:", response.data);
      console.log("Subscription API response:", response.status);

      // Kiểm tra xem response.data có tồn tại và có id không
      if (response.data && response.data.id) {
        // Đây là một gói tập đang hoạt động
        const subscription = response.data;

        // Chuyển đổi dữ liệu để phù hợp với định dạng cũ
        const formattedPackage = {
          id: subscription.id.toString(),
          name: subscription.package_name,
          price: `${parseFloat(subscription.discounted_price).toLocaleString(
            "vi-VN"
          )}đ`,
          benefits: subscription.package.benefits.map((b) => b.name).join(", "),
          sessions: subscription.remaining_pt_sessions,
          duration: `${subscription.package.package_type.duration_months} tháng`,
          endDate: subscription.end_date,
          startDate: subscription.start_date,
          remainingDays: subscription.remaining_days,
          // Lưu trữ dữ liệu gốc để sử dụng nếu cần
          originalData: subscription,
        };

        setUserPackage(formattedPackage);
      } else if (
        response.data &&
        response.data.results &&
        response.data.results.length > 0
      ) {
        // Trường hợp API trả về dạng array trong trường results
        const latestSubscription = response.data.results.sort(
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

      setSubscriptionActiveLoading(false);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      setSubscriptionActiveError("Không thể tải dữ liệu gói tập");
      setSubscriptionActiveLoading(false);
      setUserPackage(null);
    }
  };

  const fetchSubscription = async (page = 1) => {
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

      // Xây dựng URL với phân trang
      const url = `${endpoints.subscription}my/?page=${page}`;
      console.log("Requesting URL:", url);

      const response = await axiosInstance.get(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log("Response data:", response.data);
      console.log("Subscription API response:", response.status);

      // Kiểm tra xem response.data có đúng định dạng không
      if (
        response.data &&
        response.data.results &&
        Array.isArray(response.data.results)
      ) {
        // Lưu thông tin phân trang
        setSubscriptionPagination({
          count: response.data.count,
          next: response.data.next,
          previous: response.data.previous,
          currentPage: page,
        });

        // Lưu danh sách subscription
        setSubscriptionHistory(response.data.results);

        // Không cần lọc active subscription nữa
        setUserPackage(null);
      } else {
        console.log("Invalid subscription data format:", response.data);
        setSubscriptionHistory([]);
        setUserPackage(null);
      }

      setSubscriptionLoading(false);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      setSubscriptionError("Không thể tải dữ liệu gói tập");
      setSubscriptionLoading(false);
      setUserPackage(null);
      setSubscriptionHistory([]);
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
        params: requestParams,
      });

      console.log("Packages API response status:", response.status);
      console.log("Response data:", response.data);

      if (response.data && Array.isArray(response.data)) {
        // Định dạng dữ liệu nhận được
        const formattedPackages = response.data.map((pkg) => {
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
            originalData: pkg, // Lưu dữ liệu gốc để sử dụng nếu cần
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
      console.error("Error fetching packages:", error);

      if (error.response) {
        console.log("Server error response:", error.response.data);
        setError(`Lỗi từ server: ${error.response.status}`);
      } else if (error.request) {
        console.log("No response received:", error.request);
        setError(
          "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng."
        );
      } else {
        setError(`Lỗi: ${error.message}`);
      }

      setLoading(false);

      // Nếu có demoData đã được định nghĩa, sử dụng làm fallback
      if (typeof demoData !== "undefined") {
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
      fetchPackages(
        selectedType !== null ? { package_type: selectedType } : {}
      );
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

  const handleRegister = async (packageId, package_name) => {
    console.log(`Register for package ${packageId}`);
    // Kiểm tra xem người dùng đã đăng nhập chưa
    if (!isLoggedIn) {
      // Nếu chưa đăng nhập, chuyển đến màn hình đăng nhập
      navigation.navigate("Login", { returnTo: "Packages", packageId });
    } else {
      // Nếu đã đăng nhập, xử lý đăng ký gói
      try {
        // Hiển thị confirm dialog trước khi đăng ký
        Alert.alert(
          "Xác nhận đăng ký",
          `Bạn có chắc chắn muốn đăng ký gói tập "${package_name}" không?`,
          [
            {
              text: "Hủy",
              style: "cancel",
            },
            {
              text: "Đăng ký",
              onPress: async () => {
                try {
                  // Hiển thị loading
                  setLoading(true);

                  // Lấy access token từ AsyncStorage
                  const accessToken = await AsyncStorage.getItem("accessToken");
                  console.log("Access Token for registration:", accessToken);
                  if (!accessToken) {
                    throw new Error("Không tìm thấy token đăng nhập");
                  }

                  // Gọi API đăng ký gói tập
                  console.log(
                    "Requesting registration URL:",
                    endpoints.subscription + "register/"
                  );
                  const response = await axiosInstance.post(
                    endpoints.subscription + "register/",
                    { package: packageId },
                    {
                      headers: {
                        Authorization: `Bearer ${accessToken}`,
                      },
                    }
                  );

                  console.log("Registration response:", response.data);

                  // Lấy subscription_id từ response
                  const subscriptionId = response.data.subscription.id; // Giả sử API trả về id của subscription
                  console.log("Created subscription ID:", subscriptionId);

                  // Tắt loading sau khi đăng ký ban đầu
                  setLoading(false);

                  // Hiển thị dialog xác nhận thanh toán
                  Alert.alert(
                    "Xác nhận thanh toán",
                    "Vui lòng xác nhận thanh toán để hoàn tất đăng ký gói tập",
                    [
                      {
                        text: "Hủy",
                        style: "cancel",
                        onPress: () => {
                          console.log("Thanh toán bị hủy");
                        },
                      },
                      {
                        text: "Xác nhận thanh toán",
                        onPress: async () => {
                          try {
                            // Hiển thị loading khi xác nhận thanh toán
                            setLoading(true);

                            // Gọi API xác nhận thanh toán với subscription ID
                            console.log(
                              "Requesting payment verification URL:",
                              endpoints.verifyPayment.replace(
                                "{subscriptionId}",
                                subscriptionId
                              )
                            );

                            const verifyResponse = await axiosInstance.post(
                              endpoints.verifyPayment.replace(
                                "{subscriptionId}",
                                subscriptionId
                              ), // Thay thế {subscriptionId} bằng giá trị thực tế
                              {},
                              {
                                headers: {
                                  Authorization: `Bearer ${accessToken}`,
                                },
                              }
                            );
                            console.log(
                              "Payment verification response:",
                              verifyResponse.data
                            );

                            // Tắt loading
                            setLoading(false);

                            // Hiển thị thông báo thành công
                            Alert.alert(
                              "Đăng ký thành công",
                              "Bạn đã đăng ký và thanh toán gói tập thành công!",
                              [
                                {
                                  text: "OK",
                                  onPress: () => {
                                    // Làm mới dữ liệu đăng ký và gói tập
                                    fetchSubscription();
                                    fetchPackages();
                                  },
                                },
                              ]
                            );
                          } catch (error) {
                            // Tắt loading
                            setLoading(false);

                            console.error("Error verifying payment:", error);

                            // Hiển thị thông báo lỗi
                            let errorMessage =
                              "Đã xảy ra lỗi khi xác nhận thanh toán";

                            if (error.response) {
                              console.log("Server error:", error.response.data);

                              if (error.response.status === 400) {
                                if (error.response.data.detail) {
                                  errorMessage = error.response.data.detail;
                                } else if (error.response.data.message) {
                                  errorMessage = error.response.data.message;
                                }
                              } else if (error.response.status === 403) {
                                errorMessage =
                                  "Bạn không có quyền thực hiện hành động này";
                              } else if (error.response.status === 404) {
                                errorMessage = "Không tìm thấy gói tập";
                              }
                            }

                            Alert.alert("Lỗi thanh toán", errorMessage);
                          }
                        },
                      },
                    ]
                  );
                } catch (error) {
                  // Tắt loading
                  setLoading(false);

                  console.error("Error registering package:", error);

                  // Hiển thị thông báo lỗi
                  let errorMessage = "Đã xảy ra lỗi khi đăng ký gói tập";

                  if (error.response) {
                    // Nếu server trả về lỗi
                    console.log("Server error:", error.response.data);

                    // Kiểm tra các trường hợp lỗi cụ thể từ server
                    if (error.response.status === 400) {
                      // Xử lý các mã lỗi cụ thể từ server
                      if (error.response.data.detail) {
                        errorMessage = error.response.data.detail;
                      } else if (error.response.data.message) {
                        errorMessage = error.response.data.message;
                      }
                    } else if (error.response.status === 403) {
                      errorMessage =
                        "Bạn không có quyền thực hiện hành động này";
                    } else if (error.response.status === 404) {
                      errorMessage = "Không tìm thấy gói tập";
                    }
                  }

                  Alert.alert("Lỗi", errorMessage);
                }
              },
            },
          ]
        );
      } catch (error) {
        console.error("Error in registration process:", error);
        Alert.alert(
          "Lỗi",
          "Đã xảy ra lỗi không xác định. Vui lòng thử lại sau."
        );
      }
    }
  };
  // Handle view details - Mở modal chi tiết
  const handleViewDetails = (packageId) => {
    console.log(`View details for package ${packageId}`);
    if (packageId) {
      setSelectedPackageId(packageId);
      setDetailModalVisible(true);
    } else {
      console.log("Invalid package ID");
    }
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
          uri: item.image
            ? `https://res.cloudinary.com/duqln52pu/${item.image}`
            : "https://res.cloudinary.com/duqln52pu/placeholder-gym.jpg",
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
          onPress={() => handleRegister(item.id, item.name)}
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

  //  Component hiển thị gói tập hiện tại của người dùng
  const CurrentPackage = () => {
    // Nếu chưa đăng nhập, không hiển thị gì cả
    if (!isLoggedIn) {
      return null;
    }

    if (subscriptionActiveLoading) {
      return (
        <View style={[styles.packageCard, styles.centerContent]}>
          <ActivityIndicator size="large" color="#1a73e8" />
          <Text style={{ marginTop: 10 }}>Đang tải thông tin gói tập...</Text>
        </View>
      );
    }

    if (subscriptionActiveError) {
      return (
        <View style={[styles.packageCard, styles.centerContent]}>
          <Text style={styles.errorText}>{subscriptionError}</Text>
          <TouchableOpacity
            style={[styles.buttonPrimary, { marginTop: 12 }]}
            onPress={fetchActiveSubscription}
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
          {/* <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() => {}} // Scroll xuống các gói tập bên dưới
          >
            <Text style={styles.buttonPrimaryText}>Đăng ký ngay</Text>
          </TouchableOpacity> */}
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
          onPress={() => {
            // Kiểm tra trước khi truy cập packageId để tránh lỗi
            const packageId = userPackage.originalData?.package?.id;
            if (packageId) {
              handleViewDetails(packageId);
            } else {
              console.log("Cannot find package ID from user package data");
            }
          }}
        >
          <Text style={styles.buttonOutlineText}>Xem chi tiết</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // SubscriptionHistory Component (replacing CurrentPackage)
  const SubscriptionHistory = () => {
    // Nếu chưa đăng nhập, không hiển thị gì cả
    if (!isLoggedIn) {
      return null;
    }

    if (subscriptionLoading && subscriptionPagination.currentPage === 1) {
      return (
        <View style={[styles.packageCard, styles.centerContent]}>
          <ActivityIndicator size="large" color="#1a73e8" />
          <Text style={{ marginTop: 10 }}>Đang tải lịch sử gói tập...</Text>
        </View>
      );
    }

    if (subscriptionError && subscriptionHistory.length === 0) {
      return (
        <View style={[styles.packageCard, styles.centerContent]}>
          <Text style={styles.errorText}>{subscriptionError}</Text>
          <TouchableOpacity
            style={[styles.buttonPrimary, { marginTop: 12 }]}
            onPress={() => fetchSubscription(1)}
          >
            <Text style={styles.buttonPrimaryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (subscriptionHistory.length === 0) {
      return (
        <View style={[styles.packageCard, styles.centerContent]}>
          <Text style={{ fontSize: 16, marginBottom: 12 }}>
            Bạn chưa đăng ký gói tập nào
          </Text>
        </View>
      );
    }

    // Render từng gói tập trong lịch sử
    const renderSubscriptionItem = (item) => {
      // Xác định trạng thái để hiển thị màu và nút tương tác
      const getStatusColor = (status) => {
        switch (status) {
          case "active":
            return "#4CAF50"; // Green
          case "pending":
            return "#FF9800"; // Orange
          case "expired":
            return "#9E9E9E"; // Grey
          case "cancelled":
            return "#F44336"; // Red
          default:
            return "#757575";
        }
      };

      // Chuyển đổi trạng thái sang tiếng Việt
      const getStatusText = (status) => {
        switch (status) {
          case "active":
            return "Đang hoạt động";
          case "pending":
            return "Chờ xác nhận";
          case "expired":
            return "Hết hạn";
          case "cancelled":
            return "Đã hủy";
          default:
            return "Không xác định";
        }
      };

      // Xác định hành động có thể thực hiện dựa vào trạng thái
      const renderActionButton = (subscription) => {
        switch (subscription.status) {
          case "active":
            return (
              <TouchableOpacity
                style={[
                  styles.buttonOutline,
                  { borderColor: getStatusColor(subscription.status) },
                ]}
                onPress={() => handleViewDetails(subscription.package.id)}
              >
                <Text
                  style={[
                    styles.buttonOutlineText,
                    { color: getStatusColor(subscription.status) },
                  ]}
                >
                  Xem chi tiết
                </Text>
              </TouchableOpacity>
            );
          case "pending":
            return (
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.buttonOutline,
                    { borderColor: "#F44336", marginRight: 8, flex: 1 },
                  ]}
                  onPress={() => handleCancelSubscription(subscription.id)}
                >
                  <Text
                    style={[styles.buttonOutlineText, { color: "#F44336" }]}
                  >
                    Hủy
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.buttonPrimary,
                    { backgroundColor: "#4CAF50", flex: 1 },
                  ]}
                  onPress={() => handleConfirmPayment(subscription.id)}
                >
                  <Text style={styles.buttonPrimaryText}>Thanh toán</Text>
                </TouchableOpacity>
              </View>
            );
          case "expired":
            return (
              <TouchableOpacity
                style={[styles.buttonPrimary, { backgroundColor: "#2196F3" }]}
                onPress={() =>
                  handleRegister(
                    subscription.package.id,
                    subscription.package_name
                  )
                }
              >
                <Text style={styles.buttonPrimaryText}>Đăng ký lại</Text>
              </TouchableOpacity>
            );
          case "cancelled":
            return (
              <TouchableOpacity
                style={[styles.buttonPrimary, { backgroundColor: "#2196F3" }]}
                onPress={() =>
                  handleRegister(
                    subscription.package.id,
                    subscription.package_name
                  )
                }
              >
                <Text style={styles.buttonPrimaryText}>Đăng ký lại</Text>
              </TouchableOpacity>
            );
          default:
            return null;
        }
      };

      return (
        <View style={styles.subscriptionItem} key={item.id}>
          <View style={styles.subscriptionHeader}>
            <Text style={styles.packageName}>{item.package_name}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) },
              ]}
            >
              <Text style={styles.statusText}>
                {getStatusText(item.status)}
              </Text>
            </View>
          </View>

          <View style={styles.packageDetails}>
            <View style={styles.packageDetail}>
              <Text style={styles.detailLabel}>Giá:</Text>
              <Text style={styles.detailValue}>
                {parseFloat(
                  item.discounted_price || item.original_price
                ).toLocaleString("vi-VN")}
                đ
              </Text>
            </View>
            <View style={styles.packageDetail}>
              <Text style={styles.detailLabel}>Thời hạn:</Text>
              <Text style={styles.detailValue}>
                {item.package.package_type.duration_months} tháng
              </Text>
            </View>
            <View style={styles.packageDetail}>
              <Text style={styles.detailLabel}>PT còn lại:</Text>
              <Text style={styles.detailValue}>
                {item.remaining_pt_sessions} buổi
              </Text>
            </View>
            <View style={styles.packageDetail}>
              <Text style={styles.detailLabel}>Thời gian:</Text>
              <Text style={styles.detailValue}>
                {new Date(item.start_date).toLocaleDateString("vi-VN")} -{" "}
                {new Date(item.end_date).toLocaleDateString("vi-VN")}
              </Text>
            </View>
            {item.status === "active" && (
              <View style={styles.packageDetail}>
                <Text style={styles.detailLabel}>Còn lại:</Text>
                <Text style={styles.detailValue}>
                  {item.remaining_days} ngày
                </Text>
              </View>
            )}
          </View>

          {renderActionButton(item)}
        </View>
      );
    };

    // Render phân trang
    const renderPagination = () => {
      return (
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[
              styles.paginationButton,
              !subscriptionPagination.previous &&
                styles.paginationButtonDisabled,
            ]}
            onPress={() => {
              if (subscriptionPagination.previous) {
                fetchSubscription(subscriptionPagination.currentPage - 1);
              }
            }}
            disabled={!subscriptionPagination.previous}
          >
            <Text style={styles.paginationButtonText}>Trang trước</Text>
          </TouchableOpacity>

          <Text style={styles.paginationInfo}>
            Trang {subscriptionPagination.currentPage} /
            {Math.ceil(
              subscriptionPagination.count / (subscriptionHistory.length || 1)
            )}
          </Text>

          <TouchableOpacity
            style={[
              styles.paginationButton,
              !subscriptionPagination.next && styles.paginationButtonDisabled,
            ]}
            onPress={() => {
              if (subscriptionPagination.next) {
                fetchSubscription(subscriptionPagination.currentPage + 1);
              }
            }}
            disabled={!subscriptionPagination.next}
          >
            <Text style={styles.paginationButtonText}>Trang sau</Text>
          </TouchableOpacity>
        </View>
      );
    };

    return (
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Lịch sử gói tập</Text>

        {/* Hiển thị gói đang hoạt động (nếu có) */}
        {userPackage && (
          <View style={[styles.packageCard, styles.activePackageCard]}>
            <View style={styles.activePackageBadge}>
              <Text style={styles.activePackageBadgeText}>Đang sử dụng</Text>
            </View>
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
                <Text style={styles.detailValue}>
                  {userPackage.sessions} buổi
                </Text>
              </View>
              <View style={styles.packageDetail}>
                <Text style={styles.detailLabel}>Còn lại:</Text>
                <Text style={styles.detailValue}>
                  {userPackage.remainingDays} ngày
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.buttonOutline}
              onPress={() => {
                const packageId = userPackage.originalData?.package?.id;
                if (packageId) {
                  handleViewDetails(packageId);
                } else {
                  console.log("Cannot find package ID from user package data");
                }
              }}
            >
              <Text style={styles.buttonOutlineText}>Xem chi tiết</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Danh sách các gói tập khác */}
        {subscriptionHistory.map(renderSubscriptionItem)}

        {/* Phân trang */}
        {subscriptionHistory.length > 0 && renderPagination()}

        {/* Hiển thị loading khi đang tải trang tiếp theo */}
        {subscriptionLoading && subscriptionPagination.currentPage > 1 && (
          <View style={styles.loadingMoreContainer}>
            <ActivityIndicator size="small" color="#1a73e8" />
            <Text style={styles.loadingMoreText}>Đang tải...</Text>
          </View>
        )}
      </View>
    );
  };

  // Thêm các hàm xử lý hành động gói tập
  const handleCancelSubscription = async (subscriptionId) => {
    try {
      Alert.alert(
        "Xác nhận hủy gói tập",
        "Bạn có chắc chắn muốn hủy gói tập này không?",
        [
          {
            text: "Không",
            style: "cancel",
          },
          {
            text: "Có, hủy gói tập",
            style: "destructive",
            onPress: async () => {
              try {
                setLoading(true);

                // Lấy access token từ AsyncStorage
                const accessToken = await AsyncStorage.getItem("accessToken");
                if (!accessToken) {
                  throw new Error("Không tìm thấy token đăng nhập");
                }

                // Gọi API hủy subscription
                const cancelUrl = `${endpoints.subscription}${subscriptionId}/cancel/`;
                console.log("Canceling subscription at URL:", cancelUrl);

                const response = await axiosInstance.post(
                  cancelUrl,
                  {},
                  {
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                    },
                  }
                );

                console.log("Cancel response:", response.data);

                // Hiển thị thông báo thành công
                Alert.alert("Thành công", "Bạn đã hủy gói tập thành công", [
                  { text: "OK" },
                ]);

                // Cập nhật lại danh sách subscription
                fetchSubscription(subscriptionPagination.currentPage);
              } catch (error) {
                console.error("Error canceling subscription:", error);

                let errorMessage =
                  "Không thể hủy gói tập. Vui lòng thử lại sau.";
                if (error.response && error.response.data) {
                  if (error.response.data.detail) {
                    errorMessage = error.response.data.detail;
                  } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                  }
                }

                Alert.alert("Lỗi", errorMessage);
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error in cancel process:", error);
      Alert.alert("Lỗi", "Đã xảy ra lỗi không xác định");
    }
  };

  const handleConfirmPayment = async (subscriptionId) => {
    try {
      Alert.alert(
        "Xác nhận thanh toán",
        "Bạn có muốn tiến hành thanh toán gói tập này?",
        [
          {
            text: "Hủy",
            style: "cancel",
          },
          {
            text: "Thanh toán",
            onPress: async () => {
              try {
                setLoading(true);

                // Lấy access token từ AsyncStorage
                const accessToken = await AsyncStorage.getItem("accessToken");
                if (!accessToken) {
                  throw new Error("Không tìm thấy token đăng nhập");
                }

                // Gọi API xác nhận thanh toán
                const paymentUrl = endpoints.verifyPayment.replace(
                  "{subscriptionId}",
                  subscriptionId
                );
                console.log("Payment verification URL:", paymentUrl);

                const response = await axiosInstance.post(
                  paymentUrl,
                  {},
                  {
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                    },
                  }
                );

                console.log("Payment verification response:", response.data);

                // Hiển thị thông báo thành công
                Alert.alert(
                  "Thanh toán thành công",
                  "Bạn đã thanh toán gói tập thành công!",
                  [
                    {
                      text: "OK",
                      onPress: () => {
                        // Cập nhật lại danh sách subscription
                        fetchSubscription(subscriptionPagination.currentPage);
                      },
                    },
                  ]
                );
              } catch (error) {
                console.error("Error confirming payment:", error);

                let errorMessage =
                  "Không thể xác nhận thanh toán. Vui lòng thử lại sau.";
                if (error.response && error.response.data) {
                  if (error.response.data.detail) {
                    errorMessage = error.response.data.detail;
                  } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                  }
                }

                Alert.alert("Lỗi thanh toán", errorMessage);
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error in payment process:", error);
      Alert.alert("Lỗi", "Đã xảy ra lỗi không xác định");
    }
  };

  // Render header section with search bar and filters
  const renderHeaderSection = () => (
    <View style={styles.headerSection}>
      <View style={styles.header}>
        <PaperText variant="headlineMedium" style={styles.headerTitle}>
          Gói tập
        </PaperText>
      </View>

      {/* Hiển thị gói tập hiện tại chỉ khi người dùng đã đăng nhập */}
      <SubscriptionHistory />
      <CurrentPackage />

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
    </View>
  );

  // Render package content
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
        ListHeaderComponent={renderHeaderSection()}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Thay thế ScrollView + FlatList bằng chỉ FlatList với ListHeaderComponent */}
      {renderPackageContent()}

      {/* Modal chi tiết gói tập */}
      {selectedPackageId && (
        <PackageDetail
          visible={detailModalVisible}
          packageId={selectedPackageId}
          onDismiss={hideDetailModal}
          onRegister={handleRegister}
        />
      )}
    </SafeAreaView>
  );
};
export default Packages;
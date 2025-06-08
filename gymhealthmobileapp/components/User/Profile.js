import { useSelector } from 'react-redux';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Image, ScrollView, Animated, Modal, TextInput, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { authAPI, endpoints } from '../../configs/API'; // Import authAPI và endpoints
import { Menu, Divider } from 'react-native-paper'; // Thay đổi thư viện Menu
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native';
export default function Profile({ navigation, user: propUser, updateUser }) {
  // =======================
  // 1. State và các hàm xử lý
  // =======================

  // Các state quản lý thông tin user, sức khỏe, loading, menu, modal, form đánh giá phòng gym, v.v.
  const [user, setUser] = useState(propUser || null);
  const [healthInfo, setHealthInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHealthInfo, setShowHealthInfo] = useState(false); // State để ẩn/hiện Health Info
  const [showContactInfo, setShowPersonalInfo] = useState(false); // State để ẩn/hiện Personal Info
  const [animationHeightHealth] = useState(new Animated.Value(0)); // Giá trị hoạt ảnh cho chiều cao Health Info
  const [animationHeightContact] = useState(new Animated.Value(0)); // Giá trị hoạt ảnh cho chiều cao Personal Info
  const [menuVisible, setMenuVisible] = useState(false); // State cho menu
  const [isModalVisible, setModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // State cho chỉnh sửa thông tin cá nhân và sức khỏe
  const [editedPersonalInfo, setEditedPersonalInfo] = useState({
    email: reduxUser?.email || '',
    phone_number: reduxUser?.phone_number || '',
    address: reduxUser?.address || '',
    date_of_birth: reduxUser?.date_of_birth || '',
  });
  const [editedHealthInfo, setEditedHealthInfo] = useState({
    height: healthInfo?.height || '',
    weight: healthInfo?.weight || '',
    training_goal: healthInfo?.training_goal || '',
    health_conditions: healthInfo?.health_conditions || '',
  });

  // state cho đánh giá phòng gym
  const [gymRatings, setGymRatings] = useState([]);
  const [gymRatingScore, setGymRatingScore] = useState("");
  const [facilityScore, setFacilityScore] = useState("");
  const [serviceScore, setServiceScore] = useState("");
  const [gymRatingComment, setGymRatingComment] = useState("");
  const [gymRatingLoading, setGymRatingLoading] = useState(false);
  const [showGymRatingForm, setShowGymRatingForm] = useState(false);

  const dispatch = useDispatch();
  const reduxUser = useSelector((state) => state.user);

  // =======================
  // 2. Các hàm xử lý logic
  // =======================

  // Mở/đóng menu
  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  // Lấy thông tin user khi nhận prop mới hoặc khi mount
  useEffect(() => {
    if (propUser) {
      // setUser(reduxUser);
      setUser(propUser);
      setLoading(false);
      // fetchUserData();
      fetchHealthInfo(); // Lấy thông tin sức khỏe
      console.log('User from prop:', propUser);
      console.log('User from redux:', reduxUser);
    } else {
      fetchUserData();
    }
  }, [propUser]);

  // Lấy lại thông tin sức khỏe khi focus vào màn hình
  useFocusEffect(
    React.useCallback(() => {
      fetchHealthInfo();
    }, [])
  );

  // Đổi mật khẩu
  const handleChangePassword = () => {
    closeMenu();
    setModalVisible(true); // Hiển thị modal
  };

  // Xử lý gửi đổi mật khẩu
  const handleSubmitPasswordChange = async () => {
    // Kiểm tra hợp lệ
    let hasError = false;
    if (!newPassword) {
      setNewPasswordError('must enter!!!');
      hasError = true;
    } else {
      setNewPasswordError('');
    }
    if (!confirmPassword) {
      setConfirmPasswordError('must enter!!!');
      hasError = true;
    } else {
      setConfirmPasswordError('');
    }

    if (hasError) {
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New password and confirm password do not match.');
      return;
    }
    // Gửi request đổi mật khẩu
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (!accessToken) {
        Alert.alert('Error', 'Access token not found. Please log in again.');
        return;
      }
      const formData = new FormData();
      formData.append('password', newPassword);
      const response = await authAPI(accessToken).patch(endpoints.currentuser, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (response.status === 200) {
        Alert.alert('Success', 'Password changed successfully.');
        setModalVisible(false);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Error', 'Failed to change password. Please try again.');
      }
    } catch (error) {
      console.error('Error changing password:', error.response?.data || error.message);
      Alert.alert('Error', `An unexpected error occurred: ${error.message}`);
    }
  };

  // Đăng xuất
  const handleLogout = async () => {
    closeMenu();
    try {
      await AsyncStorage.removeItem('accessToken');
      dispatch({ type: 'logout' });
      if (updateUser) {
        updateUser(null);
      }
      Alert.alert('Logout Successful', 'You have been logged out.');
    } catch (error) {
      console.error('Logout error:', error.message);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  // Lấy thông tin user từ server
  const fetchUserData = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      console.log('Access Token profile:', accessToken);

      if (accessToken) {
        try {
          const response = await authAPI(accessToken).get(endpoints.currentuser);

          if (response.status >= 200 && response.status < 300) {
            const userData = response.data;
            console.log('User Data:', userData);
            setUser(userData);
            dispatch({
              type: 'login',
              payload: userData,
            });
          }
        } catch (error) {
          console.error('Error fetching profile:', error.response?.data || error.message);
          await AsyncStorage.removeItem('accessToken');
          Alert.alert('Session Expired', 'Please log in again.');
        }
      } else {
        console.log('No access token found.');
      }
    } catch (error) {
      console.error('Error initializing store:', error.message);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Lấy thông tin sức khỏe từ server
  const fetchHealthInfo = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      console.log('Access Token healthinfo:', accessToken);

      if (accessToken) {
        const response = await authAPI(accessToken).get(endpoints.healthinfo);
        if (response.status >= 200 && response.status < 300) {
          const healthData = response.data;
          console.log('Health Info:', healthData);
          setHealthInfo(healthData); // Lưu thông tin sức khỏe vào state
        }
      }
    } catch (error) {
      console.error('Error fetching health info:', error.response?.data || error.message);
    }
  };

  // Lấy danh sách đánh giá phòng gym
  const fetchGymRatings = async () => {
    setGymRatingLoading(true);
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      const res = await authAPI(accessToken).get(endpoints.createGymRating);
      setGymRatings(res.data.results || []);
    } catch (e) {
      setGymRatings([]);
    }
    setGymRatingLoading(false);
  };

  // Gửi đánh giá phòng gym
  const handleSubmitGymRating = async () => {
    if (!gymRatingScore || !facilityScore || !serviceScore) {
      Alert.alert("Lỗi", "Vui lòng nhập đủ các điểm đánh giá (1-5)");
      return;
    }
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      const formData = new FormData();
      formData.append("gym_id", 1);
      formData.append("score", gymRatingScore);
      formData.append("facility_score", facilityScore);
      formData.append("service_score", serviceScore);
      formData.append("comment", gymRatingComment);
      formData.append("anonymous", false);

      await authAPI(accessToken).post(endpoints.createGymRating, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      Alert.alert("Thành công", "Đã gửi đánh giá phòng gym!");
      setGymRatingScore("");
      setFacilityScore("");
      setServiceScore("");
      setGymRatingComment("");
      setShowGymRatingForm(false);
      fetchGymRatings();
    } catch (error) {
      // Xử lý lỗi trả về từ server khi gửi đánh giá
      let message = "Có lỗi khi gửi đánh giá!";
      if (error.response && error.response.data) {
        const data = error.response.data;
        if (data.error) message = data.error;
        else if (typeof data === "object" && data !== null) {
          const firstField = Object.keys(data)[0];
          if (firstField && Array.isArray(data[firstField]) && data[firstField].length > 0) {
            message = data[firstField][0];
          }
        } else if (typeof data === "string") message = data;
        else if (data.message) message = data.message;
      }
      Alert.alert("Thông Báo", message);
    }
  };

  // Lấy danh sách đánh giá khi vào màn hình
  useEffect(() => {
    fetchGymRatings();
  }, []);

  // Ẩn/hiện thông tin sức khỏe với hiệu ứng
  const handleToggleHealthInfo = () => {
    setShowHealthInfo(!showHealthInfo);
    Animated.timing(animationHeightHealth, {
      toValue: showHealthInfo ? 0 : 300,
      duration: 300,
      useNativeDriver: false,
    }).start();
    if (!showHealthInfo && !healthInfo) {
      Alert.alert('Error', 'No health information.');
    }
  };

  // Ẩn/hiện thông tin cá nhân với hiệu ứng
  const handleToggleContactInfo = () => {
    setShowPersonalInfo(!showContactInfo);
    Animated.timing(animationHeightContact, {
      toValue: showContactInfo ? 0 : 170,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  // =======================
  // 3. Render UI
  // =======================

  if (loading) {
    // Hiển thị loading khi đang lấy dữ liệu
    return (
      <View style={profileStyles.container}>
        <Text style={profileStyles.text}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={profileStyles.container}>
      {/* Menu chức năng (đổi mật khẩu, logout) */}
      <View style={profileStyles.menuContainer}>
        <Menu
          visible={menuVisible}
          onDismiss={closeMenu}
          anchor={
            <TouchableOpacity onPress={openMenu}>
              <Text style={profileStyles.menuIcon}>☰</Text>
            </TouchableOpacity>
          }
          style={profileStyles.menuStyle}
        >
          <Menu.Item
            onPress={handleChangePassword}
            title="Change Password"
            titleStyle={profileStyles.menuItemText}
          />
          <Divider />
          <Menu.Item
            onPress={handleLogout}
            title="Logout"
            titleStyle={profileStyles.menuItemText}
          />
        </Menu>
      </View>

      {/* Thông tin avatar và tên user */}
      <View style={profileStyles.profileHeader}>
        {user?.avatar && (
          <View style={profileStyles.avatarContainer}>
            <Image
              source={{ uri: user.avatar }}
              style={profileStyles.avatar}
            />
          </View>
        )}
        <View style={profileStyles.nameandrole}>
          <Text style={profileStyles.name} numberOfLines={2} ellipsizeMode="tail">
            {user?.last_name || 'last name'} {user?.first_name || 'first name'}
          </Text>
          <Text style={profileStyles.role}>{user?.role || 'role'}</Text>
        </View>
      </View>

      {/* Thông tin cá nhân (Personal Info) có thể ẩn/hiện */}
      <TouchableOpacity style={profileStyles.personalInfoTouchable} onPress={handleToggleContactInfo}>
        <Text style={profileStyles.cardTitle}>Personal Information</Text>
      </TouchableOpacity>
      <Animated.View style={[profileStyles.personalInfoContainer, { height: animationHeightContact }]}>
        {showContactInfo && (
          <>
            <View style={profileStyles.infoRow}>
              <Text style={profileStyles.infoLabel}>Email:</Text>
              <Text style={profileStyles.infoValue}>{reduxUser?.email || '...'}</Text>
            </View>
            <View style={profileStyles.infoRow}>
              <Text style={profileStyles.infoLabel}>Phone:</Text>
              <Text style={profileStyles.infoValue}>{reduxUser?.phone_number || '...'}</Text>
            </View>
            <View style={profileStyles.infoRow}>
              <Text style={profileStyles.infoLabel}>Address:</Text>
              <Text style={profileStyles.infoValue}>{reduxUser?.address || '...'}</Text>
            </View>
            <View style={profileStyles.infoRow}>
              <Text style={profileStyles.infoLabel}>Date of Birth:</Text>
              <Text style={profileStyles.infoValue}>{reduxUser?.date_of_birth || '...'}</Text>
            </View>
          </>
        )}
      </Animated.View>

      {/* Thông tin sức khỏe (Health Info) có thể ẩn/hiện */}
      <TouchableOpacity style={profileStyles.healthInfoTouchable} onPress={handleToggleHealthInfo}>
        <Text style={profileStyles.cardTitle}>Health Information</Text>
      </TouchableOpacity>
      <Animated.View style={[profileStyles.healthInfoContainer, { height: animationHeightHealth }]}>
        {showHealthInfo && (
          <>
            <View style={profileStyles.infoRow}>
              <Text style={profileStyles.infoLabel}>Height:</Text>
              <Text style={profileStyles.infoValue}>{healthInfo?.height ? `${healthInfo.height} cm` : '...'}</Text>
            </View>
            <View style={profileStyles.infoRow}>
              <Text style={profileStyles.infoLabel}>Weight:</Text>
              <Text style={profileStyles.infoValue}>{healthInfo?.weight ? `${healthInfo.weight} kg` : '...'}</Text>
            </View>
            <View style={profileStyles.infoRow}>
              <Text style={profileStyles.infoLabel}>Training Goal:</Text>
              <Text style={profileStyles.infoValue}>{healthInfo?.training_goal || '...'}</Text>
            </View>
            <View style={profileStyles.infoRow}>
              <Text style={profileStyles.infoLabel}>Health Conditions:</Text>
              <Text style={profileStyles.infoValue}>{healthInfo?.health_conditions || '...'}</Text>
            </View>
            <View style={profileStyles.infoRow}>
              <Text style={profileStyles.infoLabel}>Notes:</Text>
              <Text style={profileStyles.infoValue}>{healthInfo?.notes || '...'}</Text>
            </View>
            <View style={profileStyles.infoRow}>
              <Text style={profileStyles.infoLabel}>Body Fat Percentage:</Text>
              <Text style={profileStyles.infoValue}>{healthInfo?.body_fat_percentage ? `${healthInfo.body_fat_percentage}%` : '...'}</Text>
            </View>
            <View style={profileStyles.infoRow}>
              <Text style={profileStyles.infoLabel}>Blood Pressure:</Text>
              <Text style={profileStyles.infoValue}>{healthInfo?.blood_pressure || '...'}</Text>
            </View>
            <View style={profileStyles.infoRow}>
              <Text style={profileStyles.infoLabel}>Medical Conditions:</Text>
              <Text style={profileStyles.infoValue}>{healthInfo?.medical_conditions || '...'}</Text>
            </View>
          </>
        )}
      </Animated.View>

      {/* Modal đổi mật khẩu */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={profileStyles.modalContainer}>
          <View style={profileStyles.modalContent}>
            <Text style={profileStyles.modalTitle}>Change Password</Text>
            <TextInput
              style={profileStyles.input}
              placeholder="New Password"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            {newPasswordError ? <Text style={profileStyles.errorText}>{newPasswordError}</Text> : null}
            <TextInput
              style={profileStyles.input}
              placeholder="Confirm New Password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            {confirmPasswordError ? <Text style={profileStyles.errorText}>{confirmPasswordError}</Text> : null}
            <View style={profileStyles.modalButtons}>
              <TouchableOpacity style={profileStyles.modalButton} onPress={handleSubmitPasswordChange}>
                <Text style={profileStyles.modalButtonText}>Submit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={profileStyles.modalButton} onPress={() => setModalVisible(false)}>
                <Text style={profileStyles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Đánh giá phòng gym */}
      <View style={gymRatingStyles.container}>
        <Text style={gymRatingStyles.title}>
          Đánh giá phòng gym
        </Text>
        {/* Nút mở/đóng form đánh giá */}
        <TouchableOpacity
          style={gymRatingStyles.addButton}
          onPress={() => setShowGymRatingForm(!showGymRatingForm)}
        >
          <Text style={gymRatingStyles.addButtonText}>
            {"Thêm Đánh giá"}
          </Text>
        </TouchableOpacity>

        {/* Form đánh giá phòng gym */}
        {showGymRatingForm && (
          <View style={gymRatingStyles.form}>
            <Text style={gymRatingStyles.sectionTitle}>Điểm tổng thể (1-5):</Text>
            <TextInput
              style={gymRatingStyles.input}
              placeholder="Nhập điểm tổng thể (1-5)"
              value={gymRatingScore}
              onChangeText={v => setGymRatingScore(v.replace(/[^1-5]/g, ""))}
              keyboardType="numeric"
              maxLength={1}
            />
            <Text style={gymRatingStyles.sectionTitle}>Điểm cơ sở vật chất (1-5):</Text>
            <TextInput
              style={gymRatingStyles.input}
              placeholder="Nhập điểm cơ sở vật chất (1-5)"
              value={facilityScore}
              onChangeText={v => setFacilityScore(v.replace(/[^1-5]/g, ""))}
              keyboardType="numeric"
              maxLength={1}
            />
            <Text style={gymRatingStyles.sectionTitle}>Điểm dịch vụ (1-5):</Text>
            <TextInput
              style={gymRatingStyles.input}
              placeholder="Nhập điểm dịch vụ (1-5)"
              value={serviceScore}
              onChangeText={v => setServiceScore(v.replace(/[^1-5]/g, ""))}
              keyboardType="numeric"
              maxLength={1}
            />
            <Text style={gymRatingStyles.sectionTitle}>Bình luận:</Text>
            <TextInput
              style={gymRatingStyles.input}
              placeholder="Nhập bình luận"
              value={gymRatingComment}
              onChangeText={setGymRatingComment}
              multiline
            />
            <TouchableOpacity
              style={gymRatingStyles.submitButton}
              onPress={handleSubmitGymRating}
            >
              <Text style={gymRatingStyles.submitButtonText}>Gửi đánh giá</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Danh sách đánh giá */}
        <Text style={gymRatingStyles.sectionTitle}>Các đánh giá gần đây:</Text>
        {gymRatingLoading ? (
          <ActivityIndicator size="small" color="#4e5ba6" />
        ) : (
          gymRatings.length === 0 ? (
            <Text style={gymRatingStyles.emptyText}>Chưa có đánh giá nào.</Text>
          ) : (
            gymRatings.map(rating => (
              <View
                key={rating.id}
                style={gymRatingStyles.ratingItem}
              >
                <View style={gymRatingStyles.ratingHeader}>
                  {rating.user_details?.avatar && (
                    <Image
                      source={{ uri: `https://res.cloudinary.com/duqln52pu/${rating.user_details.avatar}` }}
                      style={gymRatingStyles.ratingAvatar}
                    />
                  )}
                  <Text style={gymRatingStyles.ratingName}>
                    {rating.user_details?.last_name} {rating.user_details?.first_name}
                  </Text>
                </View>
                <Text>
                  Điểm tổng thể: <Text style={gymRatingStyles.ratingScore}>{rating.score}</Text>
                </Text>
                <Text>
                  Cơ sở vật chất: {rating.facility_score} | Dịch vụ: {rating.service_score} | Trung bình: {rating.average_score}
                </Text>
                <Text>Bình luận: {rating.comment || "Không có"}</Text>
                <Text style={gymRatingStyles.ratingDate}>
                  Ngày: {new Date(rating.created_at).toLocaleString()}
                </Text>
              </View>
            ))
          )
        )}
      </View>

      {/* Nút logout */}
      <TouchableOpacity style={profileStyles.button} onPress={handleLogout}>
        <Text style={profileStyles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // =======================
  // 4. StyleSheet cho toàn bộ màn hình và phần đánh giá phòng gym
  // =======================
}

// Tách style ra cuối file, đổi tên thành profileStyles
const profileStyles = StyleSheet.create({
  container: {
    flexGrow: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row', // Đặt avatar và tên nằm ngang hàng
    alignItems: 'center', // Căn giữa theo trục dọc
    marginBottom: 40,
    paddingHorizontal: 0, // Loại bỏ khoảng cách hai bên
    paddingTop: 16, // Khoảng cách từ trên xuống
  },

  avatarContainer: {
    position: 'relative', // Để lớp phủ nằm chồng lên avatar
  },

  avatar: {
    width: 150,
    height: 150,
    borderRadius: 100,
    borderColor: '#007bff',
    borderWidth: 2,
    marginRight: 20, // Khoảng cách giữa avatar và tên
    marginLeft: -10, // Đảm bảo avatar sát viền màn hình
    flexShrink: 0, // Đảm bảo avatar không bị co lại
  },
  nameandrole: {
    flexDirection: 'column', // Đặt tên và vai trò nằm dọc
    flex: 1, // Cho phép phần này chiếm không gian còn lại
    marginTop: -40,
  },
  name: {
    fontSize: 29,
    color: '#333',
    fontWeight: 'bold',
    marginTop: -10, // Điều chỉnh khoảng cách trên
    flexWrap: 'wrap', // Cho phép xuống dòng khi nội dung quá dài
    maxWidth: '100%', // Đảm bảo không vượt quá chiều rộng container
    textAlign: 'left', // Căn trái nội dung
  },
  role: {
    fontSize: 15,
    color: '#007bff',
    marginTop: 10,
  },
  healthInfoTouchable: {
    width: '100%',
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007bff',
    textAlign: 'center',
  },
  healthInfoContainer: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  personalInfoTouchable: {
    width: '100%',
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  personalInfoContainer: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuIcon: {
    fontSize: 28,
    color: '#007bff',
    padding: 10,
  },
  menuContainer: {
    position: 'absolute',
    top: 10, // Khoảng cách từ trên xuống
    right: 15, // Khoảng cách từ phải sang
    zIndex: 1, // Đảm bảo menu nằm trên các thành phần khác
    marginTop: -15, // Khoảng cách từ trên xuống
    marginRight: -13, // Khoảng cách từ phải sang
    zIndex: 1, // Đảm bảo menu nằm trên các thành phần khác
    position: 'absolute',
  },
  menuStyle: {
    backgroundColor: '#f9f9f9', // Màu nền của menu
    borderRadius: 8, // Bo góc menu
    elevation: 4, // Đổ bóng cho menu
    marginTop: 45, // Đảm bảo menu cách biểu tượng một khoảng
    marginLeft: -20, // Đảm bảo menu không bị cắt
  },
  menuItemText: {
    fontSize: 16,
    color: '#333', // Màu chữ
    fontWeight: '500', // Độ đậm của chữ
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginBottom: 10,
    marginLeft: -200,
    marginTop: -10,
  },
  editButton: {
    backgroundColor: '#007bff',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

const gymRatingStyles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#007bff",
    marginBottom: 10,
    textAlign: "center",
  },
  addButton: {
    backgroundColor: "#4e5ba6",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 8,
    marginTop: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  form: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#4e5ba6",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  submitButton: {
    backgroundColor: "#4e5ba6",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 8,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptyText: {
    color: "#888",
    textAlign: "center",
  },
  ratingItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  ratingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  ratingAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: "#eee",
  },
  ratingName: {
    fontWeight: "bold",
  },
  ratingScore: {
    fontWeight: "bold",
  },
  ratingDate: {
    color: "#888",
    fontSize: 12,
  },
});
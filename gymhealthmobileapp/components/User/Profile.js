import { useSelector } from 'react-redux';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Image, ScrollView, Animated, Modal, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { authAPI, endpoints } from '../../configs/API'; // Import authAPI và endpoints
import { Menu, Divider } from 'react-native-paper'; // Thay đổi thư viện Menu
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
export default function Profile({ navigation, user: propUser, updateUser }) {
  const [user, setUser] = useState(propUser || null);
  const [healthInfo, setHealthInfo] = useState(null); // Thêm state cho thông tin sức khỏe
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

  // State để lưu thông tin chỉnh sửa
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

  const dispatch = useDispatch();
  const reduxUser = useSelector((state) => state.user);
  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  useEffect(() => {
    if (reduxUser) {
      setUser(reduxUser);
      // setUser(propUser);
      setLoading(false);
      // fetchUserData();
      fetchHealthInfo(); // Lấy thông tin sức khỏe
      console.log('User from prop:', propUser);
      console.log('User from redux:', reduxUser);
    } else {
      fetchUserData();
    }
  }, [reduxUser]);

  useFocusEffect(
    React.useCallback(() => {
      fetchHealthInfo();
    }, [])
  );


  const handleChangePassword = () => {
    closeMenu();
    setModalVisible(true); // Hiển thị modal
  };

  const handleSubmitPasswordChange = async () => {
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

  const handleToggleHealthInfo = () => {
    setShowHealthInfo(!showHealthInfo);
    Animated.timing(animationHeightHealth, {
      toValue: showHealthInfo ? 0 : 300, // Chiều cao khi ẩn hoặc hiển thị
      duration: 300, // Thời gian hoạt ảnh
      useNativeDriver: false,
    }).start();
    if (!showHealthInfo) {
      if (!healthInfo) {
        Alert.alert('Error', 'No health information.');
      }
    }
  };
  const handleToggleContactInfo = () => {
    setShowPersonalInfo(!showContactInfo);
    Animated.timing(animationHeightContact, {
      toValue: showContactInfo ? 0 : 170, // Chiều cao khi ẩn hoặc hiển thị
      duration: 300, // Thời gian hoạt ảnh
      useNativeDriver: false,
    }).start();
  };



  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* Menu */}
      <View style={styles.menuContainer}>
        <Menu
          visible={menuVisible}
          onDismiss={closeMenu}
          anchor={
            <TouchableOpacity onPress={openMenu}>
              <Text style={styles.menuIcon}>☰</Text>
            </TouchableOpacity>
          }
          style={styles.menuStyle} // Thêm style cho menu
        >
          <Menu.Item
            onPress={handleChangePassword}
            title="Change Password"
            titleStyle={styles.menuItemText} // Style cho text trong menu
          />
          <Divider />
          <Menu.Item
            onPress={handleLogout}
            title="Logout"
            titleStyle={styles.menuItemText} // Style cho text trong menu
          />
        </Menu>
      </View>




      {/* Container chứa avatar và tên */}
      <View style={styles.profileHeader}>
        {user?.avatar && (
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: user.avatar }}
              style={styles.avatar}
            />
          </View>
        )}
        <View style={styles.nameandrole}>
          <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">
            {user?.last_name || 'last name'} {user?.first_name || 'first name'}
          </Text>
          <Text style={styles.role}>{user?.role || 'role'}</Text>
        </View>
      </View>



      {/* Bọc chữ "Personal Information" trong một vùng có thể nhấn */}
      <TouchableOpacity style={styles.personalInfoTouchable} onPress={(handleToggleContactInfo)}>
        <Text style={styles.cardTitle}>Personal Information</Text>
      </TouchableOpacity>


      {/* Khung Personal Info */}
      <Animated.View style={[styles.personalInfoContainer, { height: animationHeightContact }]}>
        {showContactInfo && (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{reduxUser?.email || '...'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{reduxUser?.phone_number || '...'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address:</Text>
              <Text style={styles.infoValue}>{reduxUser?.address || '...'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date of Birth:</Text>
              <Text style={styles.infoValue}>{reduxUser?.date_of_birth || '...'}</Text>
            </View>

          </>
        )}
      </Animated.View>



      {/* Bọc chữ "Health Information" trong một vùng có thể nhấn */}
      <TouchableOpacity style={styles.healthInfoTouchable} onPress={handleToggleHealthInfo}>
        <Text style={styles.cardTitle}>Health Information</Text>
      </TouchableOpacity>

      {/* Khung Health Info */}
      <Animated.View style={[styles.healthInfoContainer, { height: animationHeightHealth }]}>
        {showHealthInfo && (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Height:</Text>
              <Text style={styles.infoValue}>{healthInfo?.height ? `${healthInfo.height} cm` : '...'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Weight:</Text>
              <Text style={styles.infoValue}>{healthInfo?.weight ? `${healthInfo.weight} kg` : '...'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Training Goal:</Text>
              <Text style={styles.infoValue}>{healthInfo?.training_goal || '...'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Health Conditions:</Text>
              <Text style={styles.infoValue}>{healthInfo?.health_conditions || '...'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Notes:</Text>
              <Text style={styles.infoValue}>{healthInfo?.notes || '...'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Body Fat Percentage:</Text>
              <Text style={styles.infoValue}>{healthInfo?.body_fat_percentage ? `${healthInfo.body_fat_percentage}%` : '...'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Blood Pressure:</Text>
              <Text style={styles.infoValue}>{healthInfo?.blood_pressure || '...'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Medical Conditions:</Text>
              <Text style={styles.infoValue}>{healthInfo?.medical_conditions || '...'}</Text>
            </View>
          </>
        )}
      </Animated.View>




      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>



      {/* Modal for changing password */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>

            <TextInput
              style={styles.input}
              placeholder="New Password"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            {newPasswordError ? <Text style={styles.errorText}>{newPasswordError}</Text> : null}
            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={handleSubmitPasswordChange}>
                <Text style={styles.modalButtonText}>Submit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
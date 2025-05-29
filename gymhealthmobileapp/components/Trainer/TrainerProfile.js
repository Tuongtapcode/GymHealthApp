import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native"
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { CommonActions } from '@react-navigation/native';

const TrainerProfile = ({ navigation, updateUser }) => {
    const dispatch = useDispatch();
    const user = useSelector(state => state?.user || null); // Safe access với fallback
    
    const handleLogout = async () => {
        Alert.alert(
            "Xác nhận đăng xuất",
            "Bạn có chắc chắn muốn đăng xuất?",
            [
                {
                    text: "Hủy",
                    style: "cancel"
                },
                {
                    text: "Đăng xuất",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Xóa tất cả dữ liệu liên quan trong AsyncStorage
                            await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData']);
                            
                            // Clear user data trước khi dispatch logout
                            if (updateUser && typeof updateUser === 'function') {
                                updateUser(null);
                            }

                            // Dispatch logout action với payload rõ ràng
                            dispatch({ 
                                type: 'LOGOUT',  // Sử dụng constant thay vì string
                                payload: null 
                            });

                            // Reset navigation stack về màn hình đăng nhập
                            navigation.dispatch(
                                CommonActions.reset({
                                    index: 0,
                                    routes: [
                                        { name: 'Login' }, // Thay 'Login' bằng tên màn hình đăng nhập của bạn
                                    ],
                                })
                            );
                            
                        } catch (error) {
                            console.error('Lỗi khi đăng xuất:', error);
                            Alert.alert('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại.');
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Trainer Profile</Text>
            
            {/* Hiển thị thông tin user an toàn */}
            {user && user.role && (
                <Text style={styles.roleText}>Role: {user.role}</Text>
            )}
            
            {/* Các thông tin profile khác sẽ được thêm vào đây */}
            
            <TouchableOpacity 
                style={styles.logoutButton} 
                onPress={handleLogout}
            >
                <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20
    },
    roleText: {
        fontSize: 16,
        marginBottom: 10,
        color: '#666'
    },
    logoutButton: {
        backgroundColor: '#ff4444',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 20
    },
    logoutText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold'
    }
});

export default TrainerProfile;
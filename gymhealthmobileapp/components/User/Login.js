import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image } from 'react-native';

export default function Login({ navigation }) {
  const [isLogin, setIsLogin] = useState(true); // Quản lý trạng thái Login/Register
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState(''); // Thêm email cho trạng thái Register

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image source={require('../../assets/logo.jpg')} style={styles.logo} />

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => setIsLogin(false)}>
          <Text style={[styles.tabText, !isLogin && styles.activeTab]}>REGISTER</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsLogin(true)}>
          <Text style={[styles.tabText, isLogin && styles.activeTab]}>LOGIN</Text>
        </TouchableOpacity>
      </View>

      {/* Ô nhập liệu tên đăng nhập */}
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#aaa"
        value={username}
        onChangeText={setUsername}
      />

      {/* Ô nhập liệu email (chỉ hiển thị khi ở trạng thái Register) */}
      {!isLogin && (
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
        />
      )}

      {/* Ô nhập liệu mật khẩu */}
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#aaa"
        secureTextEntry={true}
        value={password}
        onChangeText={setPassword}
      />

      {/* Nút Đăng nhập/Đăng ký */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => alert(isLogin ? 'Login pressed' : 'Register pressed')}
      >
        <Text style={styles.buttonText}>{isLogin ? 'LOGIN' : 'REGISTER'}</Text>
      </TouchableOpacity>

      {/* Quên mật khẩu (chỉ hiển thị khi ở trạng thái Login) */}
      {isLogin && (
        <TouchableOpacity onPress={() => alert('Forgot password pressed')}>
          <Text style={styles.forgotPassword}>Forgot password?</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#aaa',
    marginHorizontal: 10,
  },
  activeTab: {
    color: '#000',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 5,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#333',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPassword: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 10,
  },
});
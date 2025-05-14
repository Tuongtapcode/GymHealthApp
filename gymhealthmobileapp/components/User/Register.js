import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker'; // Date picker
import * as ImagePicker from 'expo-image-picker'; // Expo Image Picker
import { Picker } from '@react-native-picker/picker'; // Dropdown picker
import { Asset } from 'expo-asset'; // For accessing assets
import axiosInstance, { endpoints } from '../../configs/API';

export default function Register({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false); // Control date picker
  const [address, setAddress] = useState('');
  const [avatar, setAvatar] = useState('');
  const [role, setRole] = useState('MEMBER'); // Default value
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [trainingGoal, setTrainingGoal] = useState('weight_loss'); // Default value
  const [healthConditions, setHealthConditions] = useState('');

  // Danh sách tĩnh cho role và training_goal
  const roles = ['MEMBER', 'TRAINER'];
  const trainingGoals = [
    'weight_loss',
    'muscle_gain',
    'endurance',
    'flexibility',
    'general_fitness',
  ];

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateOfBirth(selectedDate.toISOString().split('T')[0]); // Format date as YYYY-MM-DD
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'You need to allow access to your photo library to select an avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        setAvatar(result.assets[0].uri); // Set the selected image URI
      } else {
        console.log('No image selected');
      }
    } catch (error) {
      console.error('Error picking image:', error.message);
    }
  };

  const validateInputs = () => {
    const usernamePattern = /^[\w.@+-]+$/;

    if (!username || username.length > 150 || !usernamePattern.test(username)) {
      Alert.alert('Invalid Input', 'Username must be 1-150 characters and can only contain letters, digits, and @/./+/-/_');
      return false;
    }

    if (!password || password.length < 1) {
      Alert.alert('Invalid Input', 'Password is required.');
      return false;
    }

    if (password !== password2) {
      Alert.alert('Invalid Input', 'Passwords do not match.');
      return false;
    }

    if (!email || email.length > 254 || !/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Invalid Input', 'Please enter a valid email address.');
      return false;
    }

    if (!phoneNumber || phoneNumber.length > 15 || phoneNumber.length < 1) {
      Alert.alert('Invalid Input', 'Phone number must be 1-15 characters.');
      return false;
    }

    if (!role) {
      Alert.alert('Invalid Input', 'Please select a role.');
      return false;
    }

    if (!trainingGoal) {
      Alert.alert('Invalid Input', 'Please select a training goal.');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateInputs()) {
      return;
    }

    try {
      // Tạo FormData để gửi dữ liệu
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      formData.append('password2', password2);
      formData.append('email', email);
      formData.append('first_name', firstName);
      formData.append('last_name', lastName);
      formData.append('phone_number', phoneNumber);
      formData.append('date_of_birth', dateOfBirth);
      formData.append('address', address);
      formData.append('role', role);
      formData.append('height', height);
      formData.append('weight', weight);
      formData.append('training_goal', trainingGoal);
      formData.append('health_conditions', healthConditions);

      // Thêm tệp avatar vào FormData
      if (avatar) {
        formData.append('avatar', {
          uri: avatar,
          type: 'image/jpeg', // Định dạng tệp
          name: 'avatar.jpg', // Tên tệp
        });
      } else {
        // Sử dụng ảnh mặc định từ thư mục assets
        const defaultAvatar = Asset.fromModule(require('../../assets/baseavt.jpg')).uri;
        formData.append('avatar', {
          uri: defaultAvatar,
          type: 'image/jpeg',
          name: 'baseavt.jpg',
        });
      }

      // Gửi yêu cầu POST với FormData
      const response = await axiosInstance.post(endpoints.register, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.status === 201) {
        Alert.alert('Register Successful', 'You can now log in.');
        navigation.navigate('Login'); // Điều hướng về màn hình Login sau khi đăng ký thành công
      } else {
        Alert.alert('Register Failed', 'Please check your details.');
      }
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
      Alert.alert('Register Error', error.response?.data?.error || 'An error occurred.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Register</Text>

      {/* Username */}
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#aaa"
        value={username}
        onChangeText={setUsername}
      />

      {/* Email */}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#aaa"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      {/* Password */}
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#aaa"
        secureTextEntry={true}
        value={password}
        onChangeText={setPassword}
      />

      {/* Confirm Password */}
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#aaa"
        secureTextEntry={true}
        value={password2}
        onChangeText={setPassword2}
      />

      {/* First Name */}
      <TextInput
        style={styles.input}
        placeholder="First Name"
        placeholderTextColor="#aaa"
        value={firstName}
        onChangeText={setFirstName}
      />

      {/* Last Name */}
      <TextInput
        style={styles.input}
        placeholder="Last Name"
        placeholderTextColor="#aaa"
        value={lastName}
        onChangeText={setLastName}
      />

      {/* Phone Number */}
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        placeholderTextColor="#aaa"
        keyboardType="phone-pad"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />

      {/* Date of Birth */}
      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
        <Text style={{ color: dateOfBirth ? '#333' : '#aaa' }}>
          {dateOfBirth || 'Select Date of Birth'}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {/* Address */}
      <TextInput
        style={styles.input}
        placeholder="Address"
        placeholderTextColor="#aaa"
        value={address}
        onChangeText={setAddress}
      />

      {/* Avatar Picker */}
      <TouchableOpacity onPress={handlePickImage} style={styles.input}>
        <Text style={{ color: avatar ? '#333' : '#aaa' }}>
          {avatar ? 'Avatar Selected' : 'Select Avatar'}
        </Text>
      </TouchableOpacity>

      {/* Role Picker */}
      <Picker
        selectedValue={role}
        onValueChange={(itemValue) => setRole(itemValue)}
        style={styles.input}
      >
        {roles.map((r) => (
          <Picker.Item key={r} label={r} value={r} />
        ))}
      </Picker>

      {/* Training Goal Picker */}
      <Picker
        selectedValue={trainingGoal}
        onValueChange={(itemValue) => setTrainingGoal(itemValue)}
        style={styles.input}
      >
        {trainingGoals.map((tg) => (
          <Picker.Item key={tg} label={tg} value={tg} />
        ))}
      </Picker>

      {/* Height */}
      <TextInput
        style={styles.input}
        placeholder="Height (cm)"
        placeholderTextColor="#aaa"
        keyboardType="numeric"
        value={height}
        onChangeText={setHeight}
      />

      {/* Weight */}
      <TextInput
        style={styles.input}
        placeholder="Weight (kg)"
        placeholderTextColor="#aaa"
        keyboardType="numeric"
        value={weight}
        onChangeText={setWeight}
      />

      {/* Health Conditions */}
      <TextInput
        style={styles.input}
        placeholder="Health Conditions"
        placeholderTextColor="#aaa"
        value={healthConditions}
        onChangeText={setHealthConditions}
      />

      {/* Register Button */}
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>REGISTER</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
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
});
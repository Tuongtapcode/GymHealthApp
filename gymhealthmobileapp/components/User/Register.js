import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
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
  const [address, setAddress] = useState('');
  const [avatar, setAvatar] = useState('');
  const [role, setRole] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [trainingGoal, setTrainingGoal] = useState('');
  const [healthConditions, setHealthConditions] = useState('');

  const handleRegister = async () => {
    try {
      const response = await axiosInstance.post(endpoints.register, {
        username,
        password,
        password2,
        first_name: firstName,
        last_name: lastName,
        email,
        phone_number: phoneNumber,
        date_of_birth: dateOfBirth,
        address,
        avatar,
        role,
        height,
        weight,
        training_goal: trainingGoal,
        health_conditions: healthConditions,
      });

      if (response.data && response.data.success) {
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

      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#aaa"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#aaa"
        secureTextEntry={true}
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#aaa"
        secureTextEntry={true}
        value={password2}
        onChangeText={setPassword2}
      />
      <TextInput
        style={styles.input}
        placeholder="First Name"
        placeholderTextColor="#aaa"
        value={firstName}
        onChangeText={setFirstName}
      />
      <TextInput
        style={styles.input}
        placeholder="Last Name"
        placeholderTextColor="#aaa"
        value={lastName}
        onChangeText={setLastName}
      />
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        placeholderTextColor="#aaa"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />
      <TextInput
        style={styles.input}
        placeholder="Date of Birth (YYYY-MM-DD)"
        placeholderTextColor="#aaa"
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
      />
      <TextInput
        style={styles.input}
        placeholder="Address"
        placeholderTextColor="#aaa"
        value={address}
        onChangeText={setAddress}
      />
      <TextInput
        style={styles.input}
        placeholder="Avatar URL"
        placeholderTextColor="#aaa"
        value={avatar}
        onChangeText={setAvatar}
      />
      <TextInput
        style={styles.input}
        placeholder="Role"
        placeholderTextColor="#aaa"
        value={role}
        onChangeText={setRole}
      />
      <TextInput
        style={styles.input}
        placeholder="Height (cm)"
        placeholderTextColor="#aaa"
        value={height}
        onChangeText={setHeight}
      />
      <TextInput
        style={styles.input}
        placeholder="Weight (kg)"
        placeholderTextColor="#aaa"
        value={weight}
        onChangeText={setWeight}
      />
      <TextInput
        style={styles.input}
        placeholder="Training Goal"
        placeholderTextColor="#aaa"
        value={trainingGoal}
        onChangeText={setTrainingGoal}
      />
      <TextInput
        style={styles.input}
        placeholder="Health Conditions"
        placeholderTextColor="#aaa"
        value={healthConditions}
        onChangeText={setHealthConditions}
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>REGISTER</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.switchText}>Already have an account? Login</Text>
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
  switchText: {
    fontSize: 14,
    color: '#007bff',
    marginTop: 10,
  },
});
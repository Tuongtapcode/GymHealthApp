import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';

const Trainer = ({ navigation }) => {
  // Lấy toàn bộ state từ redux
  const reduxState = useSelector(state => state);

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 16 }}>Xin chào trainer</Text>
      <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Thông tin Redux:</Text>
      <Text style={{ fontFamily: 'monospace', fontSize: 14, marginBottom: 24 }}>
        {JSON.stringify(reduxState, null, 2)}
      </Text>

    </ScrollView>
  );
};

export default Trainer;
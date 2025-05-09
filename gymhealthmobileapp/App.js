import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Welcome To App!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff', // Light blue background
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    color: '#0000ff', // Blue text
    fontSize: 24, // Larger font size
    fontWeight: 'bold', // Bold text
    textAlign: 'center', // Centered text
  },
});

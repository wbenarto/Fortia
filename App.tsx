import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Welcome to Fortia</Text>
      <Text>Key features:</Text>
      <Text>Set up weight goal</Text>
      <Text>Daily Log weight </Text>
      <Text>Daily Log food intake</Text>
      <Text>Daily Log workout </Text>
      <Text>Social Media, share goals and progress with friends</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

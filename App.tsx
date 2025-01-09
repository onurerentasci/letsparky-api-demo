import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Platform, SafeAreaView, Image } from 'react-native';
import { LoginCredentials } from './src/components/LoginCredentials';
import { DeviceList } from './src/components/DeviceList';
import { useState } from 'react';
import { UserDevice, fetchUserDevices } from './src/services/api';

export default function App() {
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentAccessToken, setCurrentAccessToken] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const isLoggedIn = Boolean(currentAccessToken);

  const handleLoginSuccess = async (accessToken: string) => {
    setCurrentAccessToken(accessToken);
    await refreshDevices(accessToken);
  };

  const refreshDevices = async (accessToken: string = currentAccessToken) => {
    setIsLoading(true);
    setError(null);
    try {
      const userDevices = await fetchUserDevices(accessToken);
      setDevices(userDevices);
    } catch (error: any) {
      setError(error);
      console.error('Failed to fetch devices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = (message: string) => {
    setStatusMessage(message);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Image 
          source={require('./assets/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>LetsParky API Demo</Text>
        <StatusBar style="auto" />
      </View>

      <View style={styles.mainContent}>
        <DeviceList 
          devices={devices}
          isLoading={isLoading}
          error={error}
          onRefresh={refreshDevices}
          onStatusUpdate={handleStatusUpdate}
          isLoggedIn={isLoggedIn}
        />
      </View>

      <View style={styles.footer}>
        <LoginCredentials 
          onLoginSuccess={handleLoginSuccess}
          statusMessage={statusMessage} 
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mainContent: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 50,
    paddingBottom: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    ...Platform.select({
      android: {
        elevation: 4,
      }
    })
  },
  logo: {
    flex:1,
    height: 30,
    width: 120,
  },
  title: {
    flex:2,
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
  },
});
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { UserDevice, updateDeviceStatus, fetchUserDevices, tokens } from '../services/api';

const statusImages = {
  ACTIVE_DOWN: require('../../assets/images/console_boucner_active_down.png'),
  ACTIVE_UP: require('../../assets/images/console_bouncer_active_up.png'),
  PASSIVE: require('../../assets/images/console_bouncer_passive.png'),
};

const getStatusImage = (status: string) => {
  switch (status) {
    case 'BLOCKED':
      return statusImages.ACTIVE_DOWN;
    case 'UNBLOCKED':
      return statusImages.ACTIVE_UP;
    default:
      return statusImages.PASSIVE;
  }
};

interface DeviceListProps {
  devices: UserDevice[];
  isLoading: boolean;
  error: Error | null;
  onRefresh: () => Promise<void>;
  onStatusUpdate?: (message: string) => void;
  isLoggedIn?: boolean; // Add this prop
}

export const DeviceList = ({ devices, isLoading, error, onRefresh, onStatusUpdate, isLoggedIn }: DeviceListProps) => {
  const [loadingDevices, setLoadingDevices] = useState<{ [key: string]: boolean }>({});

  const pollDeviceStatus = async (deviceId: string, expectedStatus: string, nickname: string) => {
    let attempts = 0;
    const maxAttempts = 10; // Maximum 10 attempts
    const pollInterval = 2000; // Poll every 2 second

    while (attempts < maxAttempts) {
      try {
        const updatedDevices = await fetchUserDevices(tokens?.accessToken || '');
        const device = updatedDevices.find(d => d.device.id === deviceId);
        
        if (device?.device.status === expectedStatus) {
          onStatusUpdate?.(`${nickname} has been ${expectedStatus.toLowerCase()}`);
          setLoadingDevices(prev => ({ ...prev, [deviceId]: false }));
          await onRefresh();
          return true;
        }
      } catch (error) {
        console.error('Error polling device status:', error);
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    onStatusUpdate?.(`Timeout waiting for ${nickname}'s status update`);
    setLoadingDevices(prev => ({ ...prev, [deviceId]: false }));
    return false;
  };

  const handleUpdateStatus = async (deviceId: string, currentStatus: string, nickname: string) => {
    try {
      setLoadingDevices(prev => ({ ...prev, [deviceId]: true }));
      const expectedStatus = currentStatus === 'BLOCKED' ? 'UNBLOCKED' : 'BLOCKED';
      
      await updateDeviceStatus(deviceId, currentStatus, {
        email: '',
        password: '',
      });

      // Start polling for status change
      pollDeviceStatus(deviceId, expectedStatus, nickname);
    } catch (err) {
      console.error('Error updating device status:', err);
      onStatusUpdate?.(`Failed to update ${nickname}'s status`);
      setLoadingDevices(prev => ({ ...prev, [deviceId]: false }));
    }
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loginPrompt}>First, please log in to see connected devices</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#F8AB16" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load devices</Text>
      </View>
    );
  }

  const renderDevice = ({ item }: { item: UserDevice }) => (
    <View style={styles.deviceCard}>
      <View style={styles.deviceHeader}>
        <Text style={styles.deviceName}>
          {item.device.nickName || item.device.serialNo}
        </Text>
        <Image
          source={getStatusImage(item.device.status)}
          style={styles.statusImage}
        />
      </View>
      <Text style={styles.deviceSerial}>S/N: {item.device.serialNo}</Text>
      <Text style={styles.deviceType}>{item.device.type}</Text>

      {/* Button to block the device */}
      <TouchableOpacity
        style={[
          styles.updateButton,
          loadingDevices[item.device.id] ? styles.buttonDisabled : styles.buttonActive
        ]}
        onPress={() => handleUpdateStatus(
          item.device.id, 
          item.device.status, 
          item.device.nickName || item.device.serialNo
        )}
        disabled={loadingDevices[item.device.id]}
      >
        {loadingDevices[item.device.id] ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.updateButtonText}>
            {item.device.status === 'BLOCKED' ? 'Unblock Device' : 'Block Device'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <Text style={styles.title}>Connected Devices</Text>
      <FlatList
        data={devices}
        renderItem={renderDevice}
        keyExtractor={item => item.id}
        style={styles.container}
        contentContainerStyle={styles.listContent}
        refreshing={isLoading}
        onRefresh={onRefresh}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomColor: "#33333377",
    borderBottomWidth: 1,
    marginHorizontal: 16,
  },
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  listContent: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
    ...Platform.select({
      android: {
        paddingBottom: 80, // Login form için ekstra padding
      }
    })
  },
  deviceCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deviceName: {
    fontSize: 32,
    fontWeight: '600',
  },
  deviceSerial: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  deviceType: {
    fontSize: 14,
    color: '#666',
  },
  statusImage: {
    width: 64,
    height: 64,
    resizeMode: 'contain',
  },
  updateButton: {
    marginTop: 8,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  updateButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  buttonActive: {
    backgroundColor: '#F8AB16',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  loginPrompt: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
});
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { login as apiLogin, refreshTokens } from '../services/api';

// Add onLoginSuccess prop type
interface LoginCredentialsProps {
  onLoginSuccess?: (accessToken: string) => void;
  statusMessage?: string;
}

const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  NETWORK_ERROR: 'Network connection error. Please check your internet connection',
  SERVER_ERROR: 'Server error. Please try again later',
  EMPTY_FIELDS: 'Please fill in all fields',
  INVALID_EMAIL: 'Please enter a valid email address',
  RATE_LIMIT: 'Too many attempts. Please try again later',
  TOKEN_EXPIRED: 'Session expired. Please login again',
  REFRESH_ERROR: 'Failed to refresh token. Please login again',
  UNAUTHORIZED: 'Unauthorized access. Please login again',
  ACCOUNT_LOCKED: 'Account locked. Please contact support',
  CONNECTION_TIMEOUT: 'Connection timeout. Please try again',
};

export const LoginCredentials = ({ onLoginSuccess, statusMessage }: LoginCredentialsProps) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [Status, setStatus] = useState<string>('');
  const [tokens, setTokens] = useState<{ 
    userId?: string;
    accessToken?: string; 
    refreshToken?: string;
  }>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');

  const handleLogin = async () => {
    if (!email || !password) {
      setStatus(ERROR_MESSAGES.EMPTY_FIELDS);
      setStatusType('error');
      return;
    }

    if (!email.includes('@')) {
      setStatus(ERROR_MESSAGES.INVALID_EMAIL);
      setStatusType('error');
      return;
    }

    setIsLoading(true);
    setStatus('Logging in...');
    setStatusType('info');
    
    try {
      const loginResponse = await apiLogin({
        email,
        password,
      });
      setTokens({
        userId: loginResponse.userId,
        accessToken: loginResponse.accessToken
      });
      setStatus('Login successful!');
      setStatusType('success');
      onLoginSuccess?.(loginResponse.accessToken);
    } catch (error: any) {
      let errorMessage = ERROR_MESSAGES.SERVER_ERROR;

      if (error?.message?.includes('401')) {
        errorMessage = ERROR_MESSAGES.INVALID_CREDENTIALS;
      } else if (error?.message?.includes('429')) {
        errorMessage = ERROR_MESSAGES.RATE_LIMIT;
      } else if (error?.message?.includes('network')) {
        errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
      } else if (error?.message?.includes('timeout')) {
        errorMessage = ERROR_MESSAGES.CONNECTION_TIMEOUT;
      } else if (error?.message?.includes('locked')) {
        errorMessage = ERROR_MESSAGES.ACCOUNT_LOCKED;
      }

      setStatus(errorMessage);
      setStatusType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    if (!tokens.accessToken) {
      setStatus(ERROR_MESSAGES.UNAUTHORIZED);
      setStatusType('error');
      return;
    }

    setIsRefreshing(true);
    setStatus('Refreshing token...');
    setStatusType('info');
    try {
      const newTokens = await refreshTokens(tokens.accessToken);
      setTokens(newTokens);
      setStatus('Token refreshed successfully!');
      setStatusType('success');
      onLoginSuccess?.(newTokens.accessToken);
    } catch (error: any) {
      let errorMessage = ERROR_MESSAGES.REFRESH_ERROR;

      if (error?.message?.includes('401')) {
        errorMessage = ERROR_MESSAGES.TOKEN_EXPIRED;
      } else if (error?.message?.includes('network')) {
        errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
      }

      setStatus(errorMessage);
      setStatusType('error');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[
        styles.statusText,
        statusType === 'success' ? styles.statusSuccess :
        statusType === 'error' ? styles.statusError :
        styles.statusInfo
      ]}>
        {statusMessage || Status || 'Please login to continue'}
      </Text>
      
      <View style={styles.inputContainer}>
        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <View style={styles.buttonWrapper}>
          <TouchableOpacity
            style={[styles.button, isLoading ? styles.buttonDisabled : styles.buttonActive]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>
        </View>
        {tokens.accessToken && (
          <View style={styles.buttonWrapper}>
            <TouchableOpacity
              style={[styles.button, isRefreshing || isLoading ? styles.buttonDisabled : styles.buttonActive]}
              onPress={handleRefreshToken}
              disabled={isRefreshing || isLoading}
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Refresh Token</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBackground} />
          <ActivityIndicator size="large" color="#F8AB16" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    ...Platform.select({
      android: {
        paddingBottom: 24,
      }
    })
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 10,
    ...Platform.select({
      android: {
        paddingBottom: 4,
      }
    })
  },
  inputGroup: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  refreshButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    borderRadius: 5,
  },
  buttonActive: {
    backgroundColor: '#F8AB16',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
    statusText: {
        marginBottom: 10,
        textAlign: 'left',
        padding: 10,
        borderRadius: 5,
        fontWeight: '500',
    },
  statusSuccess: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  statusError: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  statusInfo: {
    backgroundColor: '#f0f0f0',
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  buttonWrapper: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});
import axios from 'axios';

// API Related Interfaces
interface ApiResponse {
  statusCode: number;
  message: string;
  payload: any;
}

// Auth Related Interfaces
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  userId: string;
  accessToken: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Device Related Interfaces
export interface Device {
  id: string;
  serialNo: string;
  nickName: string;
  type: string;
  status: string;
  batteryVoltage: number | null;
  location: string | null;
  lastConnectionDate: string | null;
  gsmSignal: number | null;
}

export interface UserDevice {
  id: string;
  isFavorite: boolean;
  relationshipType: string;
  status: string;
  device: Device;
}

// Constants and State
const API_URL = 'https://api.letsparky.com/api-user';

export let tokens: {
  accessToken?: string;
  refreshToken?: string;
} | null = null;

// Error Handler
const handleApiError = (error: any) => {
  if (error.response) {
    const message = error.response.data?.message || 'API error occurred';
    return new Error(message);
  }
  return error;
};

// Login process
export const login = async ({ email, password }: LoginRequest): Promise<LoginResponse> => {
  try {
    const response = await axios.post(`${API_URL}/auth/credentials`, {
      email,
      password,
    });

    tokens = {
      accessToken: response.data.payload.accessToken,
      refreshToken: response.data.payload.refreshToken
    };

    return {
      userId: response.data.payload.userId,
      accessToken: response.data.payload.accessToken,
    };
  } catch (error) {
    tokens = null;
    throw handleApiError(error);
  }
};

// Refresh token process
export const refreshTokens = async (refreshToken: string): Promise<TokenPair> => {
  try {
    const response = await axios.post(
      `${API_URL}/auth/refresh`,
      {},
      {
        headers: { Authorization: `Bearer ${refreshToken}` }
      }
    );

    tokens = {
      accessToken: response.data.payload.accessToken,
      refreshToken: response.data.payload.refreshToken
    };

    return {
      accessToken: response.data.payload.accessToken,
      refreshToken: response.data.payload.refreshToken
    };
  } catch (error) {
    tokens = null;
    throw handleApiError(error);
  }
};

export const fetchUserDevices = async (accessToken: string): Promise<UserDevice[]> => {
  try {
    tokens = { accessToken };

    try {
      const response = await axios.get<ApiResponse>(`${API_URL}/user-device`, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`
        }
      });
      return response.data.payload;
    } catch (error: any) {
      if (error?.response?.status === 401 && tokens?.refreshToken) {
        const newTokens = await refreshTokens(tokens.refreshToken);
        
        const response = await axios.get<ApiResponse>(`${API_URL}/user-device`, {
          headers: {
            Authorization: `Bearer ${newTokens.accessToken}`
          }
        });
        return response.data.payload;
      }
      throw handleApiError(error);
    }
  } catch (error) {
    tokens = null;
    throw handleApiError(error);
  }
};

// Function to update device status
export const updateDeviceStatus = async (
  deviceId: string, 
  currentStatus: string,
  credentials: LoginRequest
): Promise<void> => {
  try {
    console.log('[updateDeviceStatus] Starting status update for device:', deviceId, 'current status:', currentStatus);

    // Ensure tokens are available. If they're null or expired, call login with the provided credentials.
    if (!tokens) {
      console.log('[updateDeviceStatus] No tokens found, logging in...');
      await login(credentials);
    }

    const isBlocked = currentStatus === 'BLOCKED';
    const endpoint = `${API_URL}/tcp-device/${deviceId}/${isBlocked ? 'unblock' : 'block'}`;

    try {
      console.log('[updateDeviceStatus] Sending request to:', endpoint);
      await axios.put(
        endpoint,
        {},
        {
          headers: {
            Authorization: `Bearer ${tokens?.accessToken}`,
          },
        }
      );
      console.log('[updateDeviceStatus] Device status updated successfully');
    } catch (error: any) {
      console.log('[updateDeviceStatus] Error occurred:', error);

      if (error?.response?.status === 401 && tokens?.refreshToken) {
        console.log('[updateDeviceStatus] Token expired, refreshing...');
        await refreshTokens(tokens.refreshToken);

        console.log('[updateDeviceStatus] Retrying status update after token refresh...');
        await axios.put(
          endpoint,
          {},
          {
            headers: {
              Authorization: `Bearer ${tokens?.accessToken}`,
            },
          }
        );
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.log('[updateDeviceStatus] Final error catch:', error);
    tokens = null;
    throw error;
  }
};
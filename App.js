import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, Text } from 'react-native'; // Import View, ActivityIndicator, Text for loading state

// Import các màn hình của bạn
import ProfileScreen from './screens/ProfileScreen';
import ForgotPasswordScreen from './screens/ForgotPassword';
import OtpVerificationScreen from './screens/OtpScreen';
import ResetPasswordScreen from './screens/ResetPassword';
import ChangePasswordScreen from './screens/ChangePassword';
import RefundReturnScreen from './screens/TraHangScreen';
import AddAddressScreen from './screens/AddAddress';
import RegisterScreen from './screens/RegisterScreen';
import LoginScreen from './screens/LoginScreen';
import UserChatScreen from './screens/ChatScreen';


import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext'; // Import SocketProvider

// Component nội dung chính của ứng dụng sau khi đã bọc Providers
const AppContent = () => {
  const { isAuthenticated, user, loading } = useAuth(); // Lấy trạng thái từ AuthContext
  const Stack = createStackNavigator();

  if (loading) {
    // Hiển thị màn hình chờ trong khi tải dữ liệu xác thực ban đầu
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f8f8' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ marginTop: 10, fontSize: 16, color: '#4a5568' }}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated && user?.role === 'user' ? (
        // Nếu người dùng đã đăng nhập và là 'user', hiển thị màn hình chat
        <Stack.Screen name='chat' component={UserChatScreen} />
      ) : (
        <>
          <Stack.Screen name='login' component={LoginScreen} />
          <Stack.Screen name='register' component={RegisterScreen} />
          <Stack.Screen name='otp' component={OtpVerificationScreen} />
          <Stack.Screen name='forgot' component={ForgotPasswordScreen} />
          <Stack.Screen name='reset' component={ResetPasswordScreen} />
         
        </>
      )}
      {/* Các màn hình mà người dùng đã đăng nhập (bất kể vai trò) có thể truy cập */}
      {isAuthenticated && (
        <>
          <Stack.Screen name='profile' component={ProfileScreen} />
          <Stack.Screen name='change' component={ChangePasswordScreen} />
          <Stack.Screen name='trahang' component={RefundReturnScreen} />
          <Stack.Screen name='address' component={AddAddressScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

// Component App chính, bọc các Providers
const App = () => {
  return (
    <NavigationContainer>
      <AuthProvider>
        <SocketProvider> 
          <AppContent />
        </SocketProvider>
      </AuthProvider>
    </NavigationContainer>
  );
};

export default App;

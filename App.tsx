import React, { useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  useColorScheme,
  Text,
} from 'react-native';
import {
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { initializeSdks } from './src/utils/initializeSdks';

import { SocketProvider } from './src/contexts/SocketContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import NotificationPopup from './src/components/NotificationPopup';
import AppNavigator from './src/navigation/AppNavigator';
import ChatBot from './src/components/ChatBot';

// ✅ NAVIGATION SERVICE FOR PUSH NOTIFICATIONS
export const navigationRef = React.createRef<NavigationContainerRef<any>>();

export const navigate = (name: string, params?: any) => {
  if (navigationRef.current) {
    console.log('🎯 [NAV] Navigating to:', name, params);
    navigationRef.current.navigate(name as any, params as any);
  } else {
    console.warn('⚠️ [NAV] Navigator not ready yet');
  }
};

const App: React.FC = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const backgroundStyle = {
    backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
    flex: 1,
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        await initializeSdks();
        console.log('All SDKs initialized successfully');
      } catch (error) {
        console.error('Error initializing SDKs:', error);
      }
    };
    initApp();
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        console.log('Người dùng đã đăng nhập:', user);
      } else {
        console.log('Người dùng đã đăng xuất');
      }
    });
    return unsubscribe;
  }, []);

  const linking = {
    prefixes: ['s7mstore://'], // URL scheme của bạn
    config: {
      screens: {
        // Ánh xạ đường dẫn trong URL với tên màn hình trong Stack Navigator
        PaymentSuccessScreen: 'PaymentSuccessScreen', // s7mstore://paymentsuccess
        OrderDetail: 'order/:orderId', // s7mstore://order/123
        // ... ánh xạ các màn hình khác nếu cần
      },
    },
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <NavigationContainer ref={navigationRef} linking={linking} fallback={<Text>Loading...</Text>}>
        <ChatBot/>
        <NotificationProvider>
          <SocketProvider>
            <AppNavigator />
            <NotificationPopup />
          </SocketProvider>
        </NotificationProvider>
      </NavigationContainer>
    </SafeAreaView>
  );
};

export default App;

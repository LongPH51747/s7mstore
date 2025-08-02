import React, { useEffect, useRef } from 'react';
import { SafeAreaView, StatusBar, useColorScheme, View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { initializeSdks } from './src/utils/initializeSdks';

import { SocketProvider } from './src/contexts/SocketContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import NotificationPopup from './src/components/NotificationPopup';
import AppNavigator from './src/navigation/AppNavigator';

// ✅ NAVIGATION SERVICE FOR PUSH NOTIFICATIONS
let _navigator: any;

export const navigationRef = (ref: any) => {
  _navigator = ref;
  // Export globally for notification deep linking
  global._navigator = ref;
};

export const navigate = (name: string, params?: any) => {
  if (_navigator) {
    console.log('🎯 [NAV] Navigating to:', name, params);
    _navigator.navigate(name, params);
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

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <NavigationContainer ref={navigationRef}>
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

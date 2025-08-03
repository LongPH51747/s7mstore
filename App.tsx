import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar, useColorScheme, View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { initializeSdks } from './src/utils/initializeSdks';

import { SocketProvider } from './src/contexts/SocketContext';
import AppNavigator from './src/navigation/AppNavigator';

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
      <NavigationContainer linking={linking} fallback={<Text>Loading...</Text>}>
        
          <SocketProvider>
            <AppNavigator />
          </SocketProvider>
       
      </NavigationContainer>
    </SafeAreaView>
  );
};

export default App;

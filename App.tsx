import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar, useColorScheme } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator.js'
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { getApp } from '@react-native-firebase/app';
import { initializeSdks } from './src/utils/initializeSdks';
import { StyleSheet, Text, View } from 'react-native'
import CartScreen from './src/screens/CartScreen'
import CheckoutScreen from './src/screens/CheckoutScreen'
import OrderDetailsScreen from './src/screens/OrderDetailScreen'
import PaymentSuccessScreen from './src/screens/PaymentSuccessScreen'
import OrdersScreen from './src/screens/OrderScreen'

const App: React.FC = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const backgroundStyle = {
    backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
    flex: 1,
  };

  useEffect(() => {
    // Initialize SDKs first
    initializeSdks();

    // Then set up auth listener
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
      
      <AppNavigator />
      {/* <CartScreen/> */}
      {/* <CheckoutScreen/> */}
      {/* <OrderDetailsScreen/> */}
      {/* <OrdersScreen/> */}
      {/* <PaymentSuccessScreen/> */}
    </SafeAreaView>
  );
};




export default App

const styles = StyleSheet.create({})

import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar, useColorScheme } from 'react-native';
// @ts-ignore
  import AppNavigator from './src/navigation/AppNavigator.js' 
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { getApp } from '@react-native-firebase/app';
import { initializeSdks } from './src/utils/initializeSdks';
import { StyleSheet, Text, View } from 'react-native'
// @ts-ignore
import {SocketProvider} from './src/contexts/SocketContext.js'

const App: React.FC = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const backgroundStyle = {
    backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
    flex: 1,
  };

  useEffect(() => {
    // Initialize SDKs first (including database)
    const initApp = async () => {
      try {
        await initializeSdks();
        console.log('All SDKs initialized successfully');
      } catch (error) {
        console.error('Error initializing SDKs:', error);
      }
    };

    initApp();

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
    <SocketProvider>
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <AppNavigator />
    </SafeAreaView>
    </SocketProvider>
  );
};




export default App

const styles = StyleSheet.create({})

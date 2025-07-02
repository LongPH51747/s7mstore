/**
 * Màn hình Chào mừng (Welcome Screen)
 * 
 * Màn hình này hiển thị khi ứng dụng khởi động và thực hiện các chức năng:
 * - Hiển thị logo của ứng dụng
 * - Kiểm tra trạng thái đăng nhập của người dùng
 * - Tự động chuyển hướng đến màn hình Home nếu đã đăng nhập
 * - Chuyển hướng đến màn hình Login nếu chưa đăng nhập
 */

import React, { useEffect } from 'react';
import { View, Image, StyleSheet, SafeAreaView, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, API_HEADERS } from '../config/api';

const WelcomeScreen = ({ navigation }) => {
  // Kiểm tra token người dùng khi component được mount
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Home');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/LogoS7MStore.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </SafeAreaView>
  );
};

// Styles cho màn hình
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 280,
    height: 280,
  },
});

export default WelcomeScreen; 
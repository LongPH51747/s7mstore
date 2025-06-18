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
import { View, Image, StyleSheet, SafeAreaView } from 'react-native';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WelcomeScreen = ({ navigation }) => {
  // Kiểm tra token người dùng khi component được mount
  useEffect(() => {
    checkUserToken();
  }, []);

  /**
   * Hàm kiểm tra token người dùng
   * - Kiểm tra token trong AsyncStorage
   * - Xác thực token với Firebase
   * - Chuyển hướng đến màn hình phù hợp
   */
  const checkUserToken = async () => {
    try {
      console.log('Kiểm tra token người dùng...');
      const token = await AsyncStorage.getItem('userToken');
      const userInfoString = await AsyncStorage.getItem('userInfo');
      let userInfo = null;
      if (userInfoString) {
        try {
          userInfo = JSON.parse(userInfoString);
        } catch (parseError) {
          console.error('Lỗi phân tích userInfo từ AsyncStorage:', parseError);
        }
      }
      
      // Tạo timer trước khi kiểm tra token
      const timer = setTimeout(() => {
        if (token && userInfo && userInfo.uid) {
          console.log('Tìm thấy token và thông tin người dùng, kiểm tra tính hợp lệ...');
          const user = auth().currentUser;
          if (user && user.uid === userInfo.uid) {
            console.log('Token và người dùng hợp lệ, chuyển đến màn hình Home');
            navigation.replace('Home');
            return;
          } else {
            console.log('Token hoặc người dùng không hợp lệ, xóa thông tin đăng nhập');
            AsyncStorage.multiRemove(['userToken', 'userInfo', 'userPhone', 'shouldAutoLogin']);
          }
        } else {
          console.log('Không tìm thấy token hoặc thông tin người dùng hợp lệ, chuyển đến màn hình Login');
          AsyncStorage.multiRemove(['userToken', 'userInfo', 'userPhone', 'shouldAutoLogin']); // Ensure all related data is cleared
        }
        
        // Nếu không có token hoặc token không hợp lệ, chuyển đến màn hình Login
        console.log('Chuyển đến màn hình Login');
        navigation.replace('Login');
      }, 1000);

      return () => clearTimeout(timer);
    } catch (error) {
      console.error('Lỗi kiểm tra token:', error);
      // Nếu có lỗi, xóa tất cả thông tin đăng nhập và chuyển đến màn hình Login
      try {
        await AsyncStorage.multiRemove(['userToken', 'userInfo', 'userPhone']);
      } catch (e) {
        console.error('Lỗi xóa thông tin đăng nhập:', e);
      }
      
      const timer = setTimeout(() => {
        navigation.replace('Login');
      }, 1000);

      return () => clearTimeout(timer);
    }
  };

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
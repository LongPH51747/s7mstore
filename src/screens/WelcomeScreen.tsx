import React, { useEffect } from 'react';
import { View, Image, StyleSheet, SafeAreaView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  Home: undefined;
};

type WelcomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Welcome'>;

interface WelcomeScreenProps {
  navigation: WelcomeScreenNavigationProp;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  useEffect(() => {
    checkUserToken();
  }, []);

  const checkUserToken = async () => {
    try {
      console.log('Kiểm tra token người dùng...');
      const token = await AsyncStorage.getItem('userToken');
      const userInfo = await AsyncStorage.getItem('userInfo');
      
      if (token) {
        console.log('Tìm thấy token, kiểm tra tính hợp lệ...');
        // Kiểm tra token còn hợp lệ không
        const user = auth().currentUser;
        if (user) {
          console.log('Token hợp lệ, chuyển đến màn hình Home');
          // Token còn hợp lệ, chuyển đến màn hình Home
          navigation.replace('Home');
          return;
        } else {
          console.log('Token không hợp lệ, xóa thông tin đăng nhập');
          // Token không hợp lệ, xóa token và thông tin người dùng
          await AsyncStorage.multiRemove(['userToken', 'userInfo', 'userPhone']);
        }
      } else {
        console.log('Không tìm thấy token');
      }
      
      // Nếu không có token hoặc token không hợp lệ, chuyển đến màn hình Login sau 3 giây
      console.log('Chuyển đến màn hình Login sau 3 giây');
      const timer = setTimeout(() => {
        navigation.replace('Login');
      }, 3000);

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
      }, 3000);

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
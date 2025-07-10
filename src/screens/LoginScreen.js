/**
 * Màn hình Đăng nhập (Login Screen)
 * 
 * Màn hình này cho phép người dùng đăng nhập với các chức năng:
 * - Đăng nhập bằng số điện thoại và OTP
 * - Đăng nhập bằng Google
 * - Xác thực người dùng
 * - Lưu thông tin đăng nhập
 * - Chuyển hướng đến màn hình Home sau khi đăng nhập thành công
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import CustomTextInput from '../components/customTextInput';
import { getAuth, signInWithCredential, GoogleAuthProvider } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT } from '../config/api'; // Import API config
import { useFocusEffect } from '@react-navigation/native'; // Nếu muốn check mỗi lần vào Login

const LoginScreen = ({ navigation }) => {
  // Cấu hình Google Sign-In khi component mount
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '649260662561-3l4i52uibivtvf20ioed5g6f98ps24o5.apps.googleusercontent.com',
      offlineAccess: true,
      scopes: ['profile', 'email']
    });
  }, []);

  // State quản lý thông tin đăng nhập
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Hàm xử lý đăng nhập bằng email và mật khẩu
   * - Gọi API backend để xác thực
   * - Lưu thông tin đăng nhập nếu thành công
   */
  const handleEmailLogin = async () => {
    console.log("Email:", email, "Password:", password);
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }
    setLoading(true);
    try {
      // Gọi API backend để xác thực
      const response = await axios.post(API_ENDPOINTS.AUTH.LOGIN_EMAIL, {
        email,
        password
      }, {
        timeout: API_TIMEOUT,
        headers: API_HEADERS,
      });
      if (response.data && response.data.user && response.data.user.access_token) {
        const backendResponseData = response.data.user;
        const backendUser = backendResponseData.user || {};
        const userInfoToStore = {
          displayName: backendUser.fullname || backendUser.displayName || '',
          email: backendUser.email || email,
          photoURL: backendUser.avatar || '',
          _id: backendUser._id,
          is_allowed: backendUser.is_allowed,
          ...backendUser
        };
        await AsyncStorage.setItem('userToken', backendResponseData.access_token);
        await AsyncStorage.setItem('shouldAutoLogin', 'true');
        await AsyncStorage.setItem('userInfo', JSON.stringify(userInfoToStore));
        navigation.replace('Home');
      } else {
        throw new Error('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
      }
    } catch (error) {
      let message = 'Đăng nhập thất bại. Vui lòng thử lại.';
      if (error.response && error.response.data && error.response.data.message) {
        message = error.response.data.message;
      }
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Hàm xử lý đăng nhập bằng Google
   * - Xác thực với Google
   * - Lấy thông tin người dùng
   * - Xác thực với backend
   * - Lưu thông tin đăng nhập
   */
  const handleGoogleLogin = async () => {
    try {
      console.log('Bắt đầu đăng nhập Google...');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      console.log('Google Play Services sẵn sàng');

      await GoogleSignin.signOut();

      const userInfo = await GoogleSignin.signIn();
      console.log('User Info:', userInfo);

      // Lấy idToken đúng cách, hỗ trợ cả hai kiểu trả về
      const idToken = userInfo?.idToken || userInfo?.data?.idToken;
      console.log('ID Token:', idToken);

      if (!idToken) {
        throw new Error('Không nhận được ID token');
      }

      const googleCredential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth(), googleCredential);
      console.log('User Credential:', userCredential);
      
      if (userCredential.user) {
        // Gọi API backend để xác thực
        try {
          console.log('Đang gọi API backend...');
          // Generate username from email (remove @gmail.com and any special characters)
          const email = userCredential.user.email;
          if (!email) {
            throw new Error('Không nhận được email từ tài khoản Google');
          }
          const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
          
          const requestData = {
            idToken: idToken,
            user: {
              email: userCredential.user.email,
              username: username, // Add username
              fullname: userCredential.user.displayName,
              avatar: userCredential.user.photoURL,
              googleId: userCredential.user.uid
            }
          };
          console.log('Request data:', requestData);

          const response = await axios.post(API_ENDPOINTS.AUTH.LOGIN_GOOGLE, 
            requestData,
            {
              timeout: API_TIMEOUT,
              headers: API_HEADERS,
            }
          );

          console.log('API Response (raw data from backend):', response.data);

          // Lưu token từ backend và thông tin người dùng vào AsyncStorage
          if (response.data && response.data.data && response.data.data.access_token) {
            const backendResponseData = response.data.data; // Access the nested data object
            const backendUser = backendResponseData.user || {};
            const userInfoToStore = {
              displayName: backendUser.fullname || userCredential.user.displayName,
              email: backendUser.email || userCredential.user.email,
              photoURL: backendUser.avatar || userCredential.user.photoURL,
              uid: userCredential.user.uid, // Keep Firebase UID as a reference
              _id: backendUser._id, // Add MongoDB _id from backend
              is_allowed: backendUser.is_allowed, // Đảm bảo có trường này
              // Add other fields from backendUser if necessary, e.g., phone, address
              ...backendUser
            };

            const userId = backendUser._id;
            if (userId) {
              try {
                // Gọi API kiểm tra trạng thái user mới nhất
                const res = await fetch(`${API_ENDPOINTS.USERS.GET_BY_ID(userId)}`, {
                  method: 'GET',
                  headers: API_HEADERS,
                });
                const userData = await res.json();
                if (!res.ok || userData.is_allowed === false || (userData.data && userData.data.is_allowed === false)) {
                  await AsyncStorage.multiRemove(['userToken', 'userInfo', 'userPhone', 'shouldAutoLogin']);
                  Alert.alert(
                    'Tài khoản bị chặn',
                    'Tài khoản của bạn đã bị chặn. Vui lòng liên hệ hỗ trợ.',
                    [{ text: 'OK', onPress: () => navigation.replace('Login') }]
                  );
                  return;
                }
              } catch (e) {
                // Nếu lỗi API, xử lý như chưa đăng nhập
                await AsyncStorage.multiRemove(['userToken', 'userInfo', 'userPhone', 'shouldAutoLogin']);
                navigation.replace('Login');
                return;
              }
            }

            await AsyncStorage.setItem('userToken', backendResponseData.access_token);
            await AsyncStorage.setItem('shouldAutoLogin', 'true');
            await AsyncStorage.setItem('userInfo', JSON.stringify(userInfoToStore));

            console.log('Đã lưu token và thông tin người dùng từ backend, chuẩn bị chuyển màn hình Home');
            navigation.replace('Home');
          } else {
            throw new Error('Không nhận được token từ server');
          }
        } catch (apiError) {
          console.error('Lỗi API chi tiết:', {
            message: apiError.message,
            response: apiError.response?.data,
            status: apiError.response?.status,
            code: apiError.code,
            requestData: apiError.config?.data
          });

          // Fallback: Nếu không thể kết nối đến backend, sử dụng Firebase token
          console.log('Sử dụng Firebase token làm fallback...');
          try {
            const firebaseIdToken = await userCredential.user.getIdToken();
            console.log('Firebase ID Token:', firebaseIdToken);
            await AsyncStorage.setItem('userToken', firebaseIdToken);
            await AsyncStorage.setItem('shouldAutoLogin', 'true');
            await AsyncStorage.setItem('userInfo', JSON.stringify({
              displayName: userCredential.user.displayName,
              email: userCredential.user.email,
              photoURL: userCredential.user.photoURL,
              uid: userCredential.user.uid
            }));

            // Kiểm tra trạng thái is_allowed (nếu có)
            const fallbackUserInfo = {
              displayName: userCredential.user.displayName,
              email: userCredential.user.email,
              photoURL: userCredential.user.photoURL,
              uid: userCredential.user.uid
            };
            if (fallbackUserInfo.is_allowed === false) {
              await AsyncStorage.multiRemove(['userToken', 'userInfo', 'userPhone', 'shouldAutoLogin']);
              Alert.alert(
                'Tài khoản bị chặn',
                'Tài khoản của bạn đã bị chặn. Vui lòng liên hệ hỗ trợ.',
                [{ text: 'OK', onPress: () => navigation.replace('Login') }]
              );
              return;
            }

            console.log('Đã lưu thông tin người dùng từ Firebase, chuẩn bị chuyển màn hình Home');
            navigation.replace('Home');
          } catch (storageError) {
            console.error('Lỗi lưu thông tin:', storageError);
            Alert.alert('Lỗi', 'Không thể lưu thông tin đăng nhập');
          }
        }
      }
    } catch (error) {
      console.error('Lỗi chi tiết:', error.code, error.message);
      let message = 'Đăng nhập Google thất bại';
      
      switch (error.code) {
        case '12501':
          message = 'Đăng nhập Google bị hủy';
          break;
        case '12502':
          message = 'Đăng nhập Google đang được tiến hành';
          break;
        case '7':
          message = 'Google Play Services không khả dụng';
          break;
        case 'DEVELOPER_ERROR':
          message = 'Lỗi cấu hình Google Sign-In. Vui lòng kiểm tra lại cấu hình.';
          break;
        default:
          message = `Lỗi: ${error.message}`;
      }
      Alert.alert('Lỗi', message);
    }
  };

  const checkUserStatus = useCallback(async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (userToken && userInfoString) {
        const userInfo = JSON.parse(userInfoString);
        const userId = userInfo._id;
        if (!userId) {
          // Không có userId, xóa token
          await AsyncStorage.multiRemove(['userToken', 'userInfo', 'userPhone', 'shouldAutoLogin']);
          return;
        }
        // Gọi API kiểm tra trạng thái user
        const response = await fetch(`${API_ENDPOINTS.USERS.GET_BY_ID(userId)}`, {
          method: 'GET',
          headers: API_HEADERS,
        });
        const data = await response.json();
        if (!response.ok || !data || data.is_allowed === false) {
          // User bị khóa hoặc không tồn tại
          await AsyncStorage.multiRemove(['userToken', 'userInfo', 'userPhone', 'shouldAutoLogin']);
          Alert.alert(
            'Tài khoản bị chặn',
            'Tài khoản của bạn đã bị chặn hoặc không tồn tại. Vui lòng liên hệ hỗ trợ.',
            [{ text: 'OK', onPress: () => navigation.replace('Login') }]
          );
          return;
        }
        // User hợp lệ, cho vào Home
        navigation.replace('Home');
      }
    } catch (error) {
      // Nếu lỗi, xóa token để tránh auto login lỗi
      await AsyncStorage.multiRemove(['userToken', 'userInfo', 'userPhone', 'shouldAutoLogin']);
    }
  }, [navigation]);

  useFocusEffect(checkUserStatus);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.formContainer}>
        {/* Logo Container */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/LogoS7MStore.png')}
            style={styles.logo}
          />
        </View>
        <View style={styles.formContent}>
          <Text style={styles.title}>Chào mừng đến với S7M Store</Text>
          
          {/* Form đăng nhập bằng email */}
          <CustomTextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Nhập email của bạn"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <CustomTextInput
            label="Mật khẩu"
            value={password}
            onChangeText={setPassword}
            placeholder="Nhập mật khẩu"
            secureTextEntry
          />
          <TouchableOpacity onPress={handleEmailLogin} style={styles.button} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</Text>
          </TouchableOpacity>

          {/* Đăng nhập bằng Google */}
          <Text style={{ textAlign: 'center', marginVertical: 10 }}>
            Hoặc đăng nhập bằng
          </Text>
          <TouchableOpacity onPress={handleGoogleLogin} style={styles.buttonGG}>
            <Image
              source={require('../assets/LogoGG.png')}
              style={styles.logoLogin}
            />
            <Text style={styles.buttonText}>Đăng nhập bằng Google</Text>
          </TouchableOpacity>

          {/* Link chuyển đến màn hình đăng ký */}
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.signupText}>
              Chưa có tài khoản? <Text style={{ color: '#3B82F6' }}>Đăng ký</Text>
            </Text>
          </TouchableOpacity>
        </View>
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
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 280,
    height: 280,
  },
  formContent: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#1F2937',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonGG: {
    flexDirection: 'row',
    backgroundColor: '#ff6e41',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  logoLogin: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  signupText: {
    textAlign: 'center',
    marginTop: 10,
  },
});

export default LoginScreen; 
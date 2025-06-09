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

import React, { useState, useEffect } from 'react';
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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [showVerification, setShowVerification] = useState(false);

  /**
   * Hàm gửi mã xác thực OTP
   * - Kiểm tra số điện thoại
   * - Format số điện thoại theo định dạng quốc tế
   * - Gửi mã xác thực qua Firebase
   */
  const handleSendCode = async () => {
    try {
      if (!phoneNumber) {
        Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
        return;
      }

      // Format số điện thoại theo định dạng quốc tế
      const formattedPhoneNumber = phoneNumber.startsWith('0') 
        ? `+84${phoneNumber.substring(1)}` 
        : phoneNumber;

      console.log('Sending verification code to:', formattedPhoneNumber);

      const confirmation = await auth().signInWithPhoneNumber(formattedPhoneNumber);
      setConfirm(confirmation);
      setShowVerification(true);
      Alert.alert('Thành công', 'Mã xác thực đã được gửi đến số điện thoại của bạn');
    } catch (error) {
      console.error('Lỗi gửi mã:', error);
      let errorMessage = 'Không thể gửi mã xác thực. Vui lòng thử lại sau.';
      
      switch (error.code) {
        case 'auth/invalid-phone-number':
          errorMessage = 'Số điện thoại không hợp lệ';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Quá nhiều yêu cầu. Vui lòng thử lại sau';
          break;
      }
      
      Alert.alert('Lỗi', errorMessage);
    }
  };

  /**
   * Hàm xác thực mã OTP và đăng nhập
   * - Kiểm tra mã xác thực
   * - Xác thực với Firebase
   * - Lưu thông tin đăng nhập
   * - Chuyển hướng đến màn hình Home
   */
  const handleVerifyAndLogin = async () => {
    try {
      if (!verificationCode) {
        Alert.alert('Lỗi', 'Vui lòng nhập mã xác thực');
        return;
      }

      // Xác thực mã
      const userCredential = await confirm.confirm(verificationCode);
      
      if (userCredential.user) {
        // Lưu token vào AsyncStorage
        const token = await userCredential.user.getIdToken();
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userPhone', phoneNumber);
        await AsyncStorage.setItem('shouldAutoLogin', 'true');
        await AsyncStorage.setItem('userInfo', JSON.stringify(userCredential.user));

        Alert.alert('Thành công', 'Đăng nhập thành công!');
        navigation.replace('Home');
      }
    } catch (error) {
      console.error('Lỗi xác thực:', error);
      let errorMessage = 'Mã xác thực không đúng. Vui lòng thử lại.';
      
      switch (error.code) {
        case 'auth/invalid-verification-code':
          errorMessage = 'Mã xác thực không hợp lệ';
          break;
        case 'auth/invalid-verification-id':
          errorMessage = 'Phiên xác thực không hợp lệ';
          break;
      }
      
      Alert.alert('Lỗi', errorMessage);
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

      const { idToken } = await GoogleSignin.getTokens();
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
              // Add other fields from backendUser if necessary, e.g., phone, address
              ...backendUser
            };

            await AsyncStorage.setItem('userToken', backendResponseData.access_token);
            await AsyncStorage.setItem('shouldAutoLogin', 'true');
            await AsyncStorage.setItem('userInfo', JSON.stringify(userInfoToStore));
            console.log('Đã lưu token và thông tin người dùng từ backend');
            Alert.alert('Thành công', 'Đăng nhập bằng Google thành công!');
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
            const firebaseToken = await userCredential.user.getIdToken();
            await AsyncStorage.setItem('userToken', firebaseToken);
            await AsyncStorage.setItem('shouldAutoLogin', 'true');
            await AsyncStorage.setItem('userInfo', JSON.stringify({
              displayName: userCredential.user.displayName,
              email: userCredential.user.email,
              photoURL: userCredential.user.photoURL,
              uid: userCredential.user.uid
            }));

            console.log('Đã lưu thông tin người dùng từ Firebase');
            Alert.alert('Thành công', 'Đăng nhập bằng Google thành công!');
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
          
          {/* Form đăng nhập */}
          {!showVerification ? (
            <>
              <CustomTextInput
                label="Số điện thoại"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Nhập số điện thoại của bạn"
                keyboardType="phone-pad"
              />
              <TouchableOpacity onPress={handleSendCode} style={styles.button}>
                <Text style={styles.buttonText}>Gửi mã xác thực</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <CustomTextInput
                label="Mã xác thực"
                value={verificationCode}
                onChangeText={setVerificationCode}
                placeholder="Nhập mã xác thực"
                keyboardType="number-pad"
              />
              <TouchableOpacity onPress={handleVerifyAndLogin} style={styles.button}>
                <Text style={styles.buttonText}>Xác thực và đăng nhập</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  setShowVerification(false);
                  setConfirm(null);
                }} 
                style={styles.resendButton}
              >
                <Text style={styles.resendText}>Gửi lại mã</Text>
              </TouchableOpacity>
            </>
          )}

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
    backgroundColor: '#1c2b38',
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
  resendButton: {
    backgroundColor: '#1c2b38',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  resendText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen; 
/**
 * Màn hình Đăng nhập (Login Screen)
 * * Màn hình này cho phép người dùng đăng nhập với các chức năng:
 * - Đăng nhập bằng số điện thoại và OTP (giữ nguyên tạm thời theo yêu cầu)
 * - Đăng nhập bằng Google: Bắt buộc xác thực với backend để lấy MongoDB _id và JWT của backend
 * - Lưu thông tin đăng nhập vào AsyncStorage
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
import auth from '@react-native-firebase/auth'; // Dùng auth() để gọi các phương thức
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT } from '../config/api'; // Import API config

// LƯU Ý QUAN TRỌNG:
// Đảm bảo bạn đã định nghĩa API_ENDPOINTS.AUTH.LOGIN_GOOGLE được cấu hình đúng trong file '../config/api.js'
// Ví dụ trong '../config/api.js':
// const API_URL = 'http://192.168.2.104:5000'; // Hoặc địa chỉ IP/domain của backend của bạn
// export const API_ENDPOINTS = {
//   AUTH: {
//     LOGIN_PHONE: `${API_URL}/auth/phone-login`, // Vẫn giữ nguyên tạm thời, sẽ cần điều chỉnh sau
//     LOGIN_GOOGLE: `${API_URL}/Lgin-user-google`, // <-- Đảm bảo endpoint này tồn tại trên backend của bạn
//   },
//   // ... các endpoints khác
// };


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
        default:
          errorMessage = `Lỗi: ${error.message || 'Không xác định'}`;
      }
      
      Alert.alert('Lỗi', errorMessage);
    }
  };

  /**
   * Hàm xác thực mã OTP và đăng nhập
   * - Kiểm tra mã xác thực
   * - Xác thực với Firebase
   * - Lưu thông tin đăng nhập (HIỆN TẠI VẪN LƯU THÔNG TIN TỪ FIREBASE AUTH, SẼ CẦN SỬA SAU)
   * - Chuyển hướng đến màn hình Home
   * * LƯU Ý QUAN TRỌNG: Phần này sẽ cần điều chỉnh TƯƠNG TỰ như handleGoogleLogin
   * để gọi backend và lấy MongoDB _id, nhưng theo yêu cầu hiện tại,
   * chúng ta giữ nguyên để tập trung vào Google Login trước.
   */
  const handleVerifyAndLogin = async () => {
    try {
      if (!verificationCode) {
        Alert.alert('Lỗi', 'Vui lòng nhập mã xác thực');
        return;
      }

      // Xác thực mã với Firebase (giữ nguyên logic cũ tạm thời)
      const userCredential = await confirm.confirm(verificationCode);
      
      if (userCredential.user) {
        // Lưu token Firebase và thông tin user Firebase vào AsyncStorage (tạm thời)
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
        default:
          errorMessage = `Lỗi: ${error.message || 'Không xác định'}`;
      }
      
      Alert.alert('Lỗi', errorMessage);
    }
  };

  /**
   * Hàm xử lý đăng nhập bằng Google
   * - Xác thực với Google Sign-In và Firebase Auth
   * - GỬI THÔNG TIN VỀ BACKEND để xác thực và lấy thông tin user MongoDB (bao gồm _id)
   * - BẮT BUỘC phải có _id từ backend để lưu thông tin đăng nhập và chuyển hướng.
   */
  const handleGoogleLogin = async () => {
    try {
      console.log('Bắt đầu đăng nhập Google...');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      console.log('Google Play Services sẵn sàng');

      // Đăng xuất Google trước để đảm bảo đăng nhập với tài khoản mới nếu cần
      await GoogleSignin.signOut();

      const userInfo = await GoogleSignin.signIn();
      console.log('User Info (from Google Signin):', userInfo);

      const { idToken } = await GoogleSignin.getTokens();
      console.log('ID Token (from Google Signin Tokens):', idToken);

      if (!idToken) {
        throw new Error('Không nhận được ID token từ Google.');
      }

      const googleCredential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth(), googleCredential);
      console.log('User Credential (from Firebase Google Auth):', userCredential);
      
      if (userCredential.user) {
        // GỌI API BACKEND để xác thực và lấy thông tin user từ MongoDB
        try {
          console.log('Đang gọi API backend cho Google Login...');
          // Generate username from email (remove @gmail.com and any special characters)
          const email = userCredential.user.email;
          if (!email) {
            throw new Error('Không nhận được email từ tài khoản Google');
          }
          // Xóa bỏ các ký tự không phải chữ cái/số khỏi username
          const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ''); 
          
          const requestData = {
            idToken: idToken, // Gửi Google ID Token (do Google cấp)
            user: { // Gửi thông tin user ban đầu để backend xử lý (tạo/cập nhật)
              email: userCredential.user.email,
              username: username,
              fullname: userCredential.user.displayName,
              avatar: userCredential.user.photoURL,
              googleId: userCredential.user.uid // Firebase UID
            }
          };
          console.log('Request data for Google Login API:', requestData);

          const response = await axios.post(
            API_ENDPOINTS.AUTH.LOGIN_GOOGLE, // Endpoint Google Login của backend
            requestData,
            {
              timeout: API_TIMEOUT,
              headers: API_HEADERS,
            }
          );

          console.log('API Response (raw data from backend for Google Login):', response.data);

          // BẮT BUỘC phải có token và thông tin người dùng từ backend (ĐẶC BIỆT LÀ _id)
          if (response.data && response.data.data && response.data.data.access_token && response.data.data.user && response.data.data.user._id) {
            const backendResponseData = response.data.data; // Truy cập đối tượng data lồng nhau
            const backendUser = backendResponseData.user || {};
            const userInfoToStore = {
              displayName: backendUser.fullname || userCredential.user.displayName,
              email: backendUser.email || userCredential.user.email,
              photoURL: backendUser.avatar || userCredential.user.photoURL,
              uid: userCredential.user.uid, // Giữ Firebase UID làm tham chiếu
              _id: backendUser._id, // *** ĐIỂM QUAN TRỌNG: MongoDB _id từ backend ***
              role: backendUser.role, // Lấy vai trò từ backend (quan trọng cho SocketProvider)
              ...backendUser // Thêm các trường khác từ backendUser nếu cần
            };

            await AsyncStorage.setItem('userToken', backendResponseData.access_token);
            await AsyncStorage.setItem('shouldAutoLogin', 'true');
            await AsyncStorage.setItem('userInfo', JSON.stringify(userInfoToStore));
            console.log('Đã lưu token và thông tin người dùng từ backend (Google Login) thành công!');
            
            Alert.alert('Thành công', 'Đăng nhập bằng Google thành công!');
            navigation.replace('Home'); // Chuyển hướng sau khi lưu thành công
          } else {
            // Trường hợp backend không trả về đủ thông tin (thiếu token, data, user hoặc _id)
            throw new Error('Không nhận được token hoặc thông tin người dùng hợp lệ (thiếu MongoDB _id) từ máy chủ sau xác thực Google.');
          }
        } catch (apiError) {
          // Xử lý lỗi khi gọi API backend cho Google Login
          console.error('Lỗi API chi tiết (Google Login):', {
            message: apiError.message,
            response: apiError.response?.data,
            status: apiError.response?.status,
            code: apiError.code,
            requestData: apiError.config?.data
          });

          // KHÔNG CÒN SỬ DỤNG FALLBACK LƯU FIREBASE TOKEN NẾU BACKEND KHÔNG TRẢ VỀ _ID
          // Nếu không thể kết nối đến backend và lấy _id, người dùng sẽ không thể sử dụng các chức năng chat.
          // Đảm bảo người dùng biết họ không thể hoàn tất đăng nhập
          Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ để hoàn tất đăng nhập Google. Vui lòng thử lại sau.');
          // Tùy chọn: Đăng xuất khỏi Firebase Auth nếu việc xác thực backend thất bại hoàn toàn
          // để tránh trạng thái không nhất quán hoặc lặp lại lỗi
          await auth().signOut(); 
          return; // Dừng quá trình đăng nhập ở đây
        }
      }
    } catch (error) {
      console.error('Lỗi tổng thể trong handleGoogleLogin:', error.code, error.message);
      let message = 'Đăng nhập Google thất bại';
      
      switch (error.code) {
        case '12501': // ERROR_CANCELED
          message = 'Đăng nhập Google bị hủy';
          break;
        case '12502': // IN_PROGRESS
          message = 'Đăng nhập Google đang được tiến hành';
          break;
        case '7': // DEVELOPER_ERROR in some contexts
          message = 'Google Play Services không khả dụng hoặc cấu hình sai.';
          break;
        case 'DEVELOPER_ERROR': // Specific Google Sign-In error code
          message = 'Lỗi cấu hình Google Sign-In. Vui lòng kiểm tra lại cấu hình Web Client ID.';
          break;
        case 'auth/internal-error': // Firebase specific error
          message = 'Lỗi nội bộ Firebase. Vui lòng thử lại.';
          break;
        default:
          message = `Lỗi: ${error.message || 'Không xác định'}`;
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

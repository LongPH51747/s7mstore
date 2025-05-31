import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import CustomTextInput from '../components/customTextInput';
import { getAuth, signInWithCredential, GoogleAuthProvider } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';

import AsyncStorage from '@react-native-async-storage/async-storage';

type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  Home: undefined;
  ProductDetail: { product: any };
};

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  // Cấu hình Google Sign-In
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '649260662561-3l4i52uibivtvf20ioed5g6f98ps24o5.apps.googleusercontent.com',
      offlineAccess: true,
      scopes: ['profile', 'email']
    });
  }, []);

  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [confirm, setConfirm] = useState<any>(null);
  const [showVerification, setShowVerification] = useState<boolean>(false);

  // Kiểm tra token khi màn hình được load
  useEffect(() => {
    checkUserToken();
  }, []);

  const checkUserToken = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        // Kiểm tra token còn hợp lệ không
        const user = auth().currentUser;
        if (user) {
          // Token còn hợp lệ, chuyển đến màn hình Home
          navigation.replace('Home');
        } else {
          // Token không hợp lệ, xóa token
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userPhone');
        }
      }
    } catch (error) {
      console.error('Lỗi kiểm tra token:', error);
    }
  };

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
    } catch (error: any) {
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

        Alert.alert('Thành công', 'Đăng nhập thành công!');
        navigation.replace('Home');
      }
    } catch (error: any) {
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

  // Xử lý đăng nhập bằng Google
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
        // Lưu token và thông tin người dùng vào AsyncStorage
        const token = await userCredential.user.getIdToken();
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userInfo', JSON.stringify({
          displayName: userCredential.user.displayName,
          email: userCredential.user.email,
          photoURL: userCredential.user.photoURL,
          uid: userCredential.user.uid
        }));

        console.log('Đã lưu token và thông tin người dùng');
        Alert.alert('Thành công', 'Đăng nhập bằng Google thành công!');
        navigation.replace('Home');
      }
    } catch (error: any) {
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
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/LogoS7MStore.png')}
            style={styles.logo}
          />
        </View>
        <View style={styles.formContent}>
          <Text style={styles.title}>Chào mừng đến với S7M Store</Text>
          
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
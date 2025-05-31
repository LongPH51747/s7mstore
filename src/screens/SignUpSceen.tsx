import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import CustomTextInput from '../components/customTextInput';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import bcrypt from 'react-native-bcrypt';
// import { v4 as uuidv4 } from 'uuid';

type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  Home: undefined;
};

type SignUpScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SignUp'>;

interface SignUpScreenProps {
  navigation: SignUpScreenNavigationProp;
}

const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [confirm, setConfirm] = useState<any>(null);
  const [showVerification, setShowVerification] = useState<boolean>(false);

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

  const handleVerifyAndSignUp = async () => {
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

        // Lưu thông tin user vào Firestore (nếu cần)
        const userData = {
          phoneNumber: phoneNumber.startsWith('0') 
            ? `+84${phoneNumber.substring(1)}` 
            : phoneNumber,
          createdAt: new Date().toISOString(),
        };

        // TODO: Implement API call to save user data to backend
        console.log('New user data:', userData);

        Alert.alert('Thành công', 'Đăng ký thành công!');
        navigation.navigate('Home');
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

  return (
    <SafeAreaView style={styles.signUpContainer}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView>
          <View style={styles.formContainer}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/LogoS7MStore.png')}
                style={styles.logo}
              />
            </View>
            <View style={styles.formContent}>
              <Text style={styles.title}>Đăng ký tài khoản S7M Store</Text>
              
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
                  <TouchableOpacity onPress={handleVerifyAndSignUp} style={styles.button}>
                    <Text style={styles.buttonText}>Xác thực và đăng ký</Text>
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
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginText}>
                Đã có tài khoản? <Text style={{ color: '#3B82F6' }}>Đăng nhập</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  signUpContainer: {
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
    width: 300,
    height: 300,
  },
  formContent: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
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
  loginText: {
    textAlign: 'center',
    margin: 30,
  },
  resendButton: {
    marginTop: 10,
    alignItems: 'center',
  },
  resendText: {
    color: '#3B82F6',
    fontSize: 14,
  },
});

export default SignUpScreen;
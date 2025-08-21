/**
 * Màn hình Đăng ký (Sign Up Screen)
 * 
 * Chức năng:
 * - Nhập thông tin đăng ký (email, tên người dùng, tên đầy đủ, mật khẩu, xác nhận mật khẩu).
 * - Gửi mã OTP để xác thực email.
 * - Xác thực OTP và gọi API đăng ký.
 * - Hiển thị Alert cho các lỗi, bao gồm trường hợp username hoặc email đã tồn tại (dựa trên phản hồi HTML hoặc JSON từ server).
 * - Logging chi tiết để debug lỗi API.
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, StatusBar, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import axios from 'axios';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT } from '../config/api';
import { useNavigation } from '@react-navigation/native';
import Loading from '../components/Loading';

const SignUpScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullname, setFullname] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '']);
  const otpInputs = [useRef(), useRef(), useRef(), useRef(), useRef()];
  const [randomCode, setRandomCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const navigation = useNavigation();

  // Kiểm tra định dạng email
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Gửi yêu cầu gửi mã OTP
  const handleSignUp = async () => {
    // Kiểm tra thông tin đầu vào
    if (!username || !fullname || !email || !password || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert('Lỗi', 'Vui lòng nhập email hợp lệ');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu không trùng khớp');
      return;
    }

    try {
      setLoading(true);
      console.log('Gửi yêu cầu gửi OTP:', { email });
      const res = await axios.post(
        API_ENDPOINTS.AUTH.SEND_VERIFICATION,
        { email },
        { timeout: API_TIMEOUT, headers: API_HEADERS }
      );
      console.log('Phản hồi API gửi OTP:', JSON.stringify(res.data, null, 2));
      const code = res?.data?.data?.randomCode || res?.data?.randomCode;
      if (code) {
        setRandomCode(code);
        setShowOtpModal(true);
        Alert.alert('Thành công', 'Mã OTP đã được gửi đến email của bạn.');
      } else {
        Alert.alert('Lỗi', 'Không thể gửi mã OTP. Vui lòng thử lại.');
      }
    } catch (error) {
      console.log('Lỗi gửi OTP:', JSON.stringify(error, null, 2));
      let errorMessage = 'Đã xảy ra lỗi khi gửi mã OTP';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      }
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý thay đổi OTP
  const handleOtpChange = (value, idx) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otpDigits];
    newOtp[idx] = value;
    setOtpDigits(newOtp);
    if (value && idx < 4) {
      otpInputs[idx + 1].current.focus();
    }
  };

  // Xác thực OTP và đăng ký
  const handleVerifyOtpAndRegister = async (otpValue) => {
    const otpToCheck = otpValue || otpDigits.join('');
    console.log('Kiểm tra OTP:', { entered: otpToCheck, expected: randomCode });
    if (otpToCheck !== randomCode) {
      Alert.alert('Lỗi', 'Mã OTP không đúng.');
      return;
    }

    try {
      setVerifying(true);
      setEmailError('');
      setUsernameError('');
      console.log('Gửi yêu cầu đăng ký:', { username, fullname, email, password });
      const response = await axios.post(API_ENDPOINTS.AUTH.REGISTER, {
        username,
        fullname,
        email,
        password
      }, {
        timeout: API_TIMEOUT,
        headers: API_HEADERS,
      });
      console.log('Phản hồi API đăng ký:', JSON.stringify(response.data, null, 2));

      if (response.data && (response.data.success || response.data.data || response.data.user || response.data.message === 'Dang ky thanh cong')) {
        setShowOtpModal(false);
        Alert.alert('Thành công', 'Tài khoản đã được tạo thành công', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('LoginScreen'),
          },
        ]);
      } else {
        throw new Error('Đăng ký thất bại. Phản hồi không như kỳ vọng.');
      }
    } catch (error) {
      console.log('Lỗi đăng ký:', JSON.stringify(error, null, 2));
      setShowOtpModal(false);
      let errorMessage = 'Đã xảy ra lỗi trong quá trình đăng ký';
      if (error.response) {
        // Xử lý phản hồi HTML
        const responseData = error.response.data;
        if (typeof responseData === 'string') {
          if (responseData.includes('Username already exists')) {
            setUsernameError('Tên người dùng đã được sử dụng');
            errorMessage = 'Tên người dùng đã được sử dụng. Vui lòng chọn tên khác.';
          } else if (responseData.includes('Email already exists')) {
            setEmailError('Email đã được sử dụng');
            errorMessage = 'Email đã được sử dụng. Vui lòng chọn email khác.';
          } else {
            errorMessage = `Lỗi server (${error.response.status}): ${responseData}`;
          }
        } else if (error.response.data?.message) {
          errorMessage = `Lỗi server (${error.response.status}): ${error.response.data.message}`;
          if (error.response.data.message.toLowerCase().includes('email')) {
            setEmailError(error.response.data.message);
            errorMessage = error.response.data.message;
          }
          if (error.response.data.message.toLowerCase().includes('username')) {
            setUsernameError(error.response.data.message);
            errorMessage = error.response.data.message;
          }
        }
      } else if (error.request) {
        errorMessage = 'Không nhận được phản hồi từ server. Vui lòng kiểm tra kết nối.';
      } else {
        errorMessage = `Lỗi: ${error.message}`;
      }
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setVerifying(false);
    }
  };

  // Gửi lại mã OTP
  const handleResendOtp = async () => {
    try {
      setVerifying(true);
      setOtpDigits(['', '', '', '', '']);
      console.log('Gửi lại yêu cầu OTP:', { email });
      const res = await axios.post(
        API_ENDPOINTS.AUTH.SEND_VERIFICATION,
        { email },
        { timeout: API_TIMEOUT, headers: API_HEADERS }
      );
      console.log('Phản hồi gửi lại OTP:', JSON.stringify(res.data, null, 2));
      const code = res?.data?.data?.randomCode || res?.data?.randomCode;
      if (code) {
        setRandomCode(code);
        Alert.alert('Thành công', 'Mã OTP đã được gửi lại.');
      } else {
        Alert.alert('Lỗi', 'Không thể gửi lại mã OTP.');
      }
    } catch (error) {
      console.log('Lỗi gửi lại OTP:', JSON.stringify(error, null, 2));
      let errorMessage = 'Đã xảy ra lỗi khi gửi lại mã OTP';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      }
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (showOtpModal && otpDigits.every(d => d.length === 1)) {
      handleVerifyOtpAndRegister(otpDigits.join(''));
    }
  }, [otpDigits, showOtpModal]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor='white' barStyle='dark-content' />
      <Image
        source={require('../../assets/image/logo.png')}
        style={styles.logo}
      />
      <Text style={styles.title}>Tạo Tài Khoản</Text>
      <View style={styles.inputContainer}>
        <Icon name="mail" size={20} color="#888" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#999"
        />
      </View>
      {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
      <View style={styles.inputContainer}>
        <Icon name="user" size={20} color="#888" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Tên người dùng"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholderTextColor="#999"
        />
      </View>
      {usernameError ? <Text style={styles.errorText}>{usernameError}</Text> : null}
      <View style={styles.inputContainer}>
        <Icon name="info" size={20} color="#888" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Họ và tên"
          value={fullname}
          onChangeText={setFullname}
          placeholderTextColor="#999"
        />
      </View>
      <View style={styles.inputContainer}>
        <Icon name="lock" size={20} color="#888" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          placeholderTextColor="#999"
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
          <Icon name={showPassword ? "eye" : "eye-off"} size={20} color="#888" />
        </TouchableOpacity>
      </View>
      <View style={styles.inputContainer}>
        <Icon name="lock" size={20} color="#888" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Xác nhận mật khẩu"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          placeholderTextColor="#999"
        />
        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
          <Icon name={showConfirmPassword ? "eye" : "eye-off"} size={20} color="#888" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={handleSignUp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Đăng ký</Text>
        )}
      </TouchableOpacity>
      <Text style={styles.orText}>hoặc tiếp tục với</Text>
      <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')}>
        <Text style={styles.bottomLink}>Đã có tài khoản? <Text style={styles.linkText}>Đăng nhập</Text></Text>
      </TouchableOpacity>
      <Modal
        visible={showOtpModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {}}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nhập mã OTP</Text>
            <Text style={styles.modalSubtitle}>
              Chúng tôi đã gửi mã xác thực vào email của bạn. Hãy kiểm tra hộp thư đến (và cả spam).
            </Text>
            <View style={styles.otpContainer}>
              {otpDigits.map((digit, idx) => (
                <TextInput
                  key={idx}
                  ref={otpInputs[idx]}
                  style={styles.otpInput}
                  value={digit}
                  onChangeText={value => handleOtpChange(value, idx)}
                  keyboardType="numeric"
                  maxLength={1}
                  returnKeyType={idx === 4 ? 'done' : 'next'}
                  onSubmitEditing={() => idx < 4 && otpInputs[idx + 1].current.focus()}
                />
              ))}
            </View>
            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResendOtp}
              disabled={verifying}
            >
              <Text style={styles.resendText}>Gửi lại mã</Text>
            </TouchableOpacity>
            {verifying && <ActivityIndicator size="small" color="#007AFF" style={styles.verifyingIndicator} />}
          </View>
        </View>
      </Modal>
      <Loading visible={loading || verifying} text={verifying ? 'Đang xác thực OTP...' : 'Đang đăng ký...'} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
    backgroundColor: 'white',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 30,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#F2F4F5',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 5,
  },
  button: {
    width: '100%',
    height: 55,
    backgroundColor: '#343A40',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  orText: {
    fontSize: 16,
    color: '#888',
    marginBottom: 20,
  },
  bottomLink: {
    fontSize: 16,
    color: '#555',
  },
  linkText: {
    color: '#343A40',
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 24,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalSubtitle: {
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    width: 40,
    height: 50,
    textAlign: 'center',
    fontSize: 20,
  },
  resendButton: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  resendText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  verifyingIndicator: {
    marginBottom: 12,
  },
});

export default SignUpScreen;
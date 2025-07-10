/**
 * Màn hình Đăng ký (Sign Up Screen)
 * 
 * Màn hình này cho phép người dùng đăng ký tài khoản mới với các chức năng:
 * - Nhập thông tin đăng ký (email, mật khẩu, xác nhận mật khẩu)
 * - Kiểm tra tính hợp lệ của thông tin
 * - Đăng ký tài khoản mới
 * - Chuyển đến màn hình đăng nhập
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT, API_BASE_URL } from '../config/api';
import axios from 'axios';


const SignUpScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullname, setFullname] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '']);
  const otpInputs = [useRef(), useRef(), useRef(), useRef(), useRef()];
  const [randomCode, setRandomCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [usernameError, setUsernameError] = useState('');

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSignUp = async () => {
    if (!username || !fullname || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      // Gọi API gửi mã xác thực về email
      const res = await axios.post(
        API_ENDPOINTS.AUTH.SEND_VERIFICATION,
        { email },
        { timeout: API_TIMEOUT, headers: API_HEADERS }
      );
      // Lưu randomCode vào state
      const code = res?.data?.data?.randomCode || res?.data?.randomCode;
      if (code) {
        setRandomCode(code);
        setShowOtpModal(true);
      } else {
        Alert.alert('Error', 'Could not send verification code.');
      }
    } catch (error) {
      console.log('Send verification error:', error, error?.response?.data);
      let errorMessage = 'An error occurred while sending verification code';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showOtpModal && otpDigits.every(d => d.length === 1)) {
      handleVerifyOtpAndRegister(otpDigits.join(''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpDigits, showOtpModal]);

  const handleOtpChange = (value, idx) => {
    if (!/^[0-9]?$/.test(value)) return; // chỉ cho nhập số hoặc rỗng
    const newOtp = [...otpDigits];
    newOtp[idx] = value;
    setOtpDigits(newOtp);
    if (value && idx < 4) {
      otpInputs[idx + 1].current.focus();
    }
  };

  const handleVerifyOtpAndRegister = async (otpValue) => {
    const otpToCheck = otpValue || otpDigits.join('');
    if (otpToCheck !== randomCode) {
      Alert.alert('Error', 'OTP is incorrect.');
      return;
    }
    try {
      setVerifying(true);
      setEmailError('');
      setUsernameError('');
      console.log('Đăng ký với:', { username, fullname, email, password, randomCode, otpToCheck });
      const response = await axios.post(API_ENDPOINTS.AUTH.REGISTER, {
        username,
        fullname,
        email,
        password
      }, {
        timeout: API_TIMEOUT,
        headers: API_HEADERS,
      });
      console.log('Đăng ký response:', response?.data);
      if (response.data && (response.data.data || response.data.user || response.data.message === 'Dang ky thanh cong')) {
        setShowOtpModal(false);
        Alert.alert('Success', 'Account created successfully', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]);
      } else {
        setShowOtpModal(false);
        throw new Error('Registration failed. Please try again.');
      }
    } catch (error) {
      setShowOtpModal(false);
      console.log('SignUp error:', error, error?.response, error?.response?.data, { randomCode, otpDigits });
      let errorMessage = 'An error occurred during sign up';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
        if (errorMessage.toLowerCase().includes('email')) {
          setEmailError(errorMessage);
        }
        if (errorMessage.toLowerCase().includes('username')) {
          setUsernameError(errorMessage);
        }
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setVerifying(true);
      setOtpDigits(['', '', '', '', '']);
      const res = await axios.post(
        API_ENDPOINTS.AUTH.SEND_VERIFICATION,
        { email },
        { timeout: API_TIMEOUT, headers: API_HEADERS }
      );
      const code = res?.data?.data?.randomCode || res?.data?.randomCode;
      if (code) {
        setRandomCode(code);
        Alert.alert('Success', 'OTP resent to your email.');
      } else {
        Alert.alert('Error', 'Could not resend verification code.');
      }
    } catch (error) {
      console.log('Resend OTP error:', error, error?.response?.data);
      let errorMessage = 'An error occurred while resending verification code';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={username}
              onChangeText={text => {
                setUsername(text);
                setUsernameError('');
              }}
              autoCapitalize="none"
            />
            {usernameError ? (
              <Text style={{ color: 'red', marginBottom: 8, marginLeft: 4 }}>{usernameError}</Text>
            ) : null}
            <TextInput
              style={styles.input}
              placeholder="Full name"
              value={fullname}
              onChangeText={setFullname}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={text => {
                setEmail(text);
                setEmailError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {emailError ? (
              <Text style={{ color: 'red', marginBottom: 8, marginLeft: 4 }}>{emailError}</Text>
            ) : null}
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating Account...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal nhập OTP */}
      <Modal
        visible={showOtpModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {}}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 24, width: '80%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Nhập mã OTP</Text>
            <Text style={{ color: '#666', marginBottom: 8, textAlign: 'center' }}>
              Chúng tôi đã gửi mã xác thực vào email của bạn. Hãy kiểm tra hộp thư đến (và cả spam).
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              {otpDigits.map((digit, idx) => (
                <TextInput
                  key={idx}
                  ref={otpInputs[idx]}
                  style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, width: 40, height: 50, textAlign: 'center', fontSize: 20 }}
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
              style={{ alignSelf: 'center', marginBottom: 12 }}
              onPress={handleResendOtp}
              disabled={verifying}
            >
              <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>Gửi lại mã</Text>
            </TouchableOpacity>
            {verifying && <ActivityIndicator size="small" color="#007AFF" style={{ marginBottom: 12 }} />}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 16,
  },
  footerLink: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SignUpScreen; 
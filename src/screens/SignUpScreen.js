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
            // Gửi mã xác thực về email
      const res = await axios.post(
                API_ENDPOINTS.AUTH.SEND_VERIFICATION,
        { email },
        { timeout: API_TIMEOUT, headers: API_HEADERS }
      );
      const code = res?.data?.data?.randomCode || res?.data?.randomCode;
      if (code) {
        setRandomCode(code);
        setShowOtpModal(true);
      } else {
        Alert.alert('Error', 'Could not send verification code.');
      }
    } catch (error) {
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
        if (!/^[0-9]?$/.test(value)) return;
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
      const response = await axios.post(API_ENDPOINTS.AUTH.REGISTER, {
        username,
        fullname,
        email,
        password
      }, {
        timeout: API_TIMEOUT,
        headers: API_HEADERS,
      });
      if (response.data && (response.data.data || response.data.user || response.data.message === 'Dang ky thanh cong')) {
        setShowOtpModal(false);
        Alert.alert('Success', 'Account created successfully', [
          {
            text: 'OK',
                        onPress: () => navigation.navigate('LoginScreen'),
          },
        ]);
      } else {
        setShowOtpModal(false);
        throw new Error('Registration failed. Please try again.');
      }
    } catch (error) {
      setShowOtpModal(false);
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
        <View style={styles.container}>
            <StatusBar backgroundColor='white' barStyle='dark-content'/>
            <Image
                source={require('../../assets/image/logo.png')}
                style={styles.logo}
            />
            <Text style={styles.title}>Create Your Account</Text>
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
            <View style={styles.inputContainer}>
                <Icon name="user" size={20} color="#888" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={username}
                    onChangeText={setUsername}
              autoCapitalize="none"
                    placeholderTextColor="#999"
                />
            </View>
            <View style={styles.inputContainer}>
                <Icon name="info" size={20} color="#888" style={styles.icon} />
            <TextInput
              style={styles.input}
                    placeholder="Full Name"
              value={fullname}
              onChangeText={setFullname}
                    placeholderTextColor="#999"
            />
            </View>
            <View style={styles.inputContainer}>
                <Icon name="lock" size={20} color="#888" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
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
              placeholder="Confirm Password"
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
                    <Text style={styles.buttonText}>Sign up</Text>
                )}
            </TouchableOpacity>
            <Text style={styles.orText}>or continue with</Text>
            <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')}>
                <Text style={styles.bottomLink}>Already have an account? <Text style={styles.linkText}>Sign in</Text></Text>
            </TouchableOpacity>
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
});

export default SignUpScreen; 
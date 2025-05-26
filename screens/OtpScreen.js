import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Keyboard,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native'; // Cần cài đặt @react-navigation/native
import Ionicons from 'react-native-vector-icons/Ionicons';

const OtpVerificationScreen = () => {
  const navigation = useNavigation();
  const [otp, setOtp] = useState(['', '', '', '', '', '']); // State cho 6 ô nhập OTP
  const [timer, setTimer] = useState(60); // Thời gian đếm ngược
  const [canResend, setCanResend] = useState(false); // Trạng thái cho phép gửi lại mã
  const inputRefs = useRef([]); // Refs để focus vào từng ô input

  // Giả định email đã được gửi từ màn hình trước
  const userEmail = 'dinhb839@gmail.com'; // Thay thế bằng email thật từ navigation params

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else {
        // Khi `timer` về 0, cho phép gửi lại mã và dừng interval
      setCanResend(true); // Hết giờ, cho phép gửi lại
      clearInterval(interval);
    }
    return () => clearInterval(interval); // Clear interval khi component unmount
  }, [timer]);// Dependency array: useEffect sẽ chạy lại khi `timer` thay đổi

  const handleChangeText = (text, index) => {
    // Chỉ cho phép nhập số
    if (!/^\d*$/.test(text)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = text;  // Cập nhật chữ số tại vị trí hiện tại
    setOtp(newOtp);

    // Tự động focus sang ô tiếp theo
    if (text.length === 1 && index < otp.length - 1) {
      inputRefs.current[index + 1].focus();
    }
    // Tự động đóng bàn phím khi nhập xong ô cuối cùng
    if (text.length === 1 && index === otp.length - 1) {
      Keyboard.dismiss();
    }
  };

  const handleKeyPress = (e, index) => {
    // Xử lý khi nhấn phím backspace ở ô trống
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const isOtpComplete = otp.every((digit) => digit.length === 1);

  const handleVerifyOtp = () => {
    if (isOtpComplete) {
      const fullOtp = otp.join('');
      console.log('Mã OTP đã nhập:', fullOtp);
      // Logic xác thực OTP thực tế với API của bạn
      // Ví dụ:
      if (fullOtp === '123456') { // Thay thế bằng mã OTP đúng từ backend
        Alert.alert('Thành công', 'Xác thực OTP thành công!');
        navigation.navigate('profile'); // Chuyển sang màn hình đặt lại mật khẩu
      } else {
        Alert.alert('Lỗi', 'Mã xác thực không hợp lệ. Vui lòng thử lại.');
         setOtp(['', '', '', '', '', '']); // Xóa mã cũ
      }
    } else {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ mã OTP.');
    }
  };

  const handleResendOtp = () => {
    // Logic gửi lại mã OTP
    Alert.alert('Gửi lại mã', 'Mã OTP mới đã được gửi đến email của bạn.');
    setTimer(60); // Đặt lại bộ đếm
    setCanResend(false); // Tắt nút gửi lại
    setOtp(['', '', '', '', '', '']); // Xóa mã cũ
    inputRefs.current[0].focus(); // Focus lại vào ô đầu tiên
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back-outline" size={26} color="black" />
      </TouchableOpacity>

      <Text style={styles.title}>Mã xác thực đã được gửi!</Text>
      <Text style={styles.description}>
        Chúng tôi đã gửi mã xác thực gồm <Text style={styles.boldText}>6 chữ số</Text> đến địa chỉ email của bạn.
        Vui lòng kiểm tra hộp thư đến (bao gồm cả thư mục Spam/Thư rác) và nhập mã dưới đây.
      </Text>
      <Text style={styles.emailHint}>Gửi đến: {userEmail}</Text>

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            style={styles.otpInput}
            keyboardType="numeric"
            maxLength={1}
            value={digit}
            onChangeText={(text) => handleChangeText(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            ref={(ref) => (inputRefs.current[index] = ref)}
            caretHidden={true} // Ẩn con trỏ nhấp nháy
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.verifyButton, !isOtpComplete && styles.verifyButtonDisabled]}
        onPress={handleVerifyOtp}
        disabled={!isOtpComplete}
      >
        <Text style={styles.verifyButtonText}>Xác Nhận</Text>
      </TouchableOpacity>

      <View style={styles.resendContainer}>
        {timer > 0 ? (
          <Text style={styles.resendText}>Gửi lại mã sau: {`00:${timer < 10 ? '0' : ''}${timer}`}</Text>
        ) : (
          <TouchableOpacity onPress={handleResendOtp} disabled={!canResend}>
            <Text style={[styles.resendLink, !canResend && styles.resendLinkDisabled]}>Gửi lại mã</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity onPress={() => console.log('Chuyển đến màn hình hỗ trợ')}>
        <Text style={styles.helpLink}>Không nhận được mã?</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 50, // Điều chỉnh padding trên để tránh thanh trạng thái
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 24,
    color: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    marginTop: 20,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  boldText: {
    fontWeight: 'bold',
  },
  emailHint: {
    fontSize: 14,
    color: '#888',
    marginBottom: 30,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginBottom: 30,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  verifyButton: {
    backgroundColor: 'black', 
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
    marginBottom: 20,
  },
  verifyButtonDisabled: {
    backgroundColor: '#a0c7f7', // Màu xám nhạt khi bị vô hiệu hóa
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resendContainer: {
    marginBottom: 15,
  },
  resendText: {
    fontSize: 15,
    color: '#666',
  },
  resendLink: {
    fontSize: 15,
    color: '#007bff',
    fontWeight: 'bold',
  },
  resendLinkDisabled: {
    color: '#aaa',
  },
  helpLink: {
    fontSize: 15,
    color: '#007bff',
    textDecorationLine: 'underline',
  },
});

export default OtpVerificationScreen;
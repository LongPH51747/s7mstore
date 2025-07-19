import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native'; // Cần cài đặt @react-navigation/native
import Ionicons from 'react-native-vector-icons/Ionicons';

/**
 * Màn hình cho phép người dùng đặt lại mật khẩu mới sau khi đã xác thực OTP thành công.
 */
const ResetPasswordScreen = () => {
  const navigation = useNavigation();

  // State cho mật khẩu mới và xác nhận mật khẩu
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // State để hiển thị thông báo lỗi (ví dụ: mật khẩu không khớp, không đủ mạnh)
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  /**
   * Hàm kiểm tra độ mạnh của mật khẩu.
   * Đây là ví dụ đơn giản, bạn có thể mở rộng các quy tắc phức tạp hơn.
   * @param {string} password - Mật khẩu cần kiểm tra.
   * @returns {string} - Thông báo lỗi nếu mật khẩu không hợp lệ, hoặc chuỗi rỗng nếu hợp lệ.
   */
  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Mật khẩu phải có ít nhất 8 ký tự.';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Mật khẩu phải chứa ít nhất một chữ cái viết hoa.';
    }
    if (!/[a-z]/.test(password)) {
      return 'Mật khẩu phải chứa ít nhất một chữ cái viết thường.';
    }
    if (!/[0-9]/.test(password)) {
      return 'Mật khẩu phải chứa ít nhất một số.';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt.';
    }
    return ''; // Mật khẩu hợp lệ
  };

  /**
   * Xử lý khi người dùng nhấn nút "Xác Nhận Mật khẩu".
   * Đây là nơi bạn sẽ gọi API để gửi mật khẩu mới lên server.
   */
  const handleResetPassword = () => {
    Keyboard.dismiss(); // Đóng bàn phím trước khi xử lý

    // Kiểm tra độ mạnh của mật khẩu mới
    const newPassError = validatePassword(newPassword);
    setPasswordError(newPassError);

    // Kiểm tra mật khẩu xác nhận có khớp không
    let confirmPassError = '';
    if (newPassword !== confirmPassword) {
      confirmPassError = 'Mật khẩu xác nhận không khớp.';
      setConfirmPasswordError(confirmPassError);
    } else {
      setConfirmPasswordError('');
    }

    // Nếu có bất kỳ lỗi nào, dừng lại và hiển thị lỗi
    if (newPassError || confirmPassError) {
      return;
    }

    // --- LOGIC GỌI API ĐẶT LẠI MẬT KHẨU ---
    // Trong thực tế, bạn sẽ gửi `newPassword` (và có thể là token xác thực OTP
    // hoặc email/tên đăng nhập) lên backend.
    // Backend sẽ hash mật khẩu mới và cập nhật vào cơ sở dữ liệu.

    console.log('Mật khẩu mới:', newPassword);
    console.log('Xác nhận mật khẩu:', confirmPassword);

    // Giả lập cuộc gọi API thành công
    Alert.alert(
      'Thành công',
      'Mật khẩu của bạn đã được đặt lại thành công. Vui lòng đăng nhập lại.',
      [
        {
          text: 'OK',
          onPress: () => navigation.navigate('ProfileScreen'), // Chuyển về màn hình profile
        },
      ]
    );

    // Giả lập cuộc gọi API thất bại (ví dụ để test lỗi)
    // Alert.alert('Lỗi', 'Có lỗi xảy ra khi đặt lại mật khẩu. Vui lòng thử lại.');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Nút quay lại màn hình trước */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
         <Ionicons name="chevron-back-outline" size={26} color="black" />
      </TouchableOpacity>

      {/* Tiêu đề chính của màn hình */}
      <Text style={styles.title}>Đặt lại Mật khẩu Mới</Text>
      <Text style={styles.description}>
        Vui lòng tạo mật khẩu mới cho tài khoản của bạn.
      </Text>

      {/* Ô nhập mật khẩu mới */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Mật khẩu mới</Text>
        <TextInput
          style={styles.input}
          placeholder="Nhập mật khẩu mới"
          secureTextEntry // Ẩn ký tự mật khẩu
          value={newPassword}
          onChangeText={(text) => {
            setNewPassword(text);
            setPasswordError(''); // Xóa lỗi khi người dùng bắt đầu nhập
          }}
        />
        {/* Hiển thị thông báo lỗi nếu có */}
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        {/* Gợi ý yêu cầu mật khẩu */}
        <Text style={styles.passwordRequirement}>
          Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
        </Text>
      </View>

      {/* Ô nhập xác nhận mật khẩu */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Xác nhận mật khẩu mới</Text>
        <TextInput
          style={styles.input}
          placeholder="Xác nhận mật khẩu mới"
          secureTextEntry // Ẩn ký tự mật khẩu
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            setConfirmPasswordError(''); // Xóa lỗi khi người dùng bắt đầu nhập
          }}
        />
        {/* Hiển thị thông báo lỗi nếu có */}
        {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
      </View>

      {/* Nút "Xác Nhận Mật khẩu" */}
      <TouchableOpacity
        style={styles.resetButton}
        onPress={handleResetPassword}
      >
        <Text style={styles.resetButtonText}>Xác Nhận Mật khẩu</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// --- Định nghĩa Stylesheet cho màn hình ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 50,
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
    marginBottom: 30,
    lineHeight: 24,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  passwordRequirement: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
    paddingHorizontal: 5,
  },
  errorText: {
    fontSize: 14,
    color: '#dc3545', // Màu đỏ cho lỗi
    marginTop: 5,
    marginBottom: 5,
    paddingHorizontal: 5,
  },
  resetButton: {
    backgroundColor: 'black',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
    marginTop: 20,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ResetPasswordScreen;
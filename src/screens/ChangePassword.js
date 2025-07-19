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
  ActivityIndicator, // Thêm để hiển thị loading
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome'; // Cần cài đặt react-native-vector-icons
import Ionicons from 'react-native-vector-icons/Ionicons'; // Cần cài đặt react-native-vector-icons

/**
 * Màn hình "Đổi Mật khẩu" (Change Password Screen).
 * Người dùng đã đăng nhập và muốn thay đổi mật khẩu hiện tại của họ.
 * Yêu cầu nhập mật khẩu cũ để xác minh.
 */
const ChangePasswordScreen = () => {
  const navigation = useNavigation();

  // GIẢ ĐỊNH EMAIL CỦA NGƯỜI DÙNG ĐÃ ĐĂNG NHẬP (Chỉ cho DEMO)
  // Trong ứng dụng thật, bạn sẽ lấy email/ID người dùng từ ngữ cảnh đăng nhập (context, redux, auth state)
  const loggedEmail = 'bao@gmail.com'; // Đảm bảo email này tồn tại trong db.json của bạn

  // States cho các trường nhập mật khẩu
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // States để hiển thị lỗi cho từng trường
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmNewPasswordError, setConfirmNewPasswordError] = useState('');
  // const [forgot, setForgot] = useState(''); // Không cần state này nữa, thay bằng error message

  // States để quản lý trạng thái ẩn/hiện mật khẩu
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false); // Thêm state cho loading

  /**
   * Hàm kiểm tra độ mạnh của mật khẩu mới.
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
   * Xử lý khi người dùng nhấn nút "Đổi Mật khẩu".
   * Đây là nơi bạn sẽ gọi API để gửi mật khẩu cũ và mật khẩu mới lên server.
   */
  const handleChangePassword = async () => {
    Keyboard.dismiss(); // Đóng bàn phím

    // Reset tất cả thông báo lỗi
    setCurrentPasswordError('');
    setNewPasswordError('');
    setConfirmNewPasswordError('');
    // setForgot(''); // Reset state này

    let hasError = false;

    // 1. Kiểm tra mật khẩu cũ có được nhập không
    if (!currentPassword.trim()) {
      setCurrentPasswordError('Vui lòng nhập mật khẩu cũ.');
      hasError = true;
    }

    // 2. Kiểm tra mật khẩu mới
    const newPassError = validatePassword(newPassword);
    if (newPassError) {
      setNewPasswordError(newPassError);
      hasError = true;
    }

    // 3. Kiểm tra xác nhận mật khẩu mới
    if (!confirmNewPassword.trim()) {
      setConfirmNewPasswordError('Vui lòng xác nhận mật khẩu mới.');
      hasError = true;
    } else if (newPassword !== confirmNewPassword) {
      setConfirmNewPasswordError('Mật khẩu xác nhận không khớp.');
      hasError = true;
    }

    // Nếu có bất kỳ lỗi nào từ các kiểm tra trên, dừng lại
    if (hasError) {
      return;
    }

    setIsLoading(true); // Bắt đầu loading

    try {
      // --- Bước 1: Lấy thông tin người dùng từ JSON Server ---
      // (Giả sử chúng ta tìm người dùng theo email)
      // Đảm bảo URL này khớp với địa chỉ JSON Server của bạn
      // Ví dụ: 'http://10.0.2.2:3000' cho Android emulator, 'http://localhost:3000' cho iOS simulator
      const JSON_SERVER_URL = 'http://192.168.100.92:3000'; // IP thực tế của bạn

      const userResponse = await fetch(`${JSON_SERVER_URL}/users?email=${loggedEmail}`);
      const users = await userResponse.json();

      if (users.length === 0) {
        Alert.alert('Lỗi', 'Không tìm thấy tài khoản người dùng với email này.');
        return;
      }

      const user = users[0]; // Lấy người dùng đầu tiên tìm thấy

      // --- Bước 2: Xác minh mật khẩu cũ (DEMO: SO SÁNH PLAIN TEXT) ---
      // CẢNH BÁO: KHÔNG LÀM NHƯ NÀY TRONG PRODUCTION THẬT SỰ VÌ LÝ DO BẢO MẬT
      if (user.password !== currentPassword) {
        setCurrentPasswordError('Mật khẩu cũ không đúng.');
        // setForgot("Bạn quên mật khẩu?"); // Có thể thêm lại nếu muốn, nhưng không nên.
        return; // Dừng lại nếu mật khẩu cũ không đúng
      }

      // --- Bước 3: Cập nhật mật khẩu mới trong db.json thông qua JSON Server ---
      const updatedUser = { ...user, password: newPassword }; // Tạo đối tượng người dùng đã cập nhật

      const updateResponse = await fetch(`${JSON_SERVER_URL}/users/${user.id}`, { // Dùng user.id để PUT vào đúng người dùng
        method: 'PUT', // Dùng PUT để cập nhật toàn bộ resource
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedUser),
      });

      if (updateResponse.ok) {
        Alert.alert('Thành công', 'Mật khẩu của bạn đã được đổi thành công.');
        navigation.navigate('ProfileScreen'); // Chuyển về màn hình profile
      } else {
        Alert.alert('Lỗi', 'Không thể đổi mật khẩu. Vui lòng thử lại sau.');
      }

    } catch (error) {
      console.error('Lỗi khi đổi mật khẩu:', error);
      Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ demo. Vui lòng kiểm tra JSON Server và kết nối mạng.');
    } finally {
      setIsLoading(false); // Kết thúc loading
    }
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
      <Text style={styles.title}>Đổi Mật khẩu</Text>
      <Text style={styles.description}>
        Vui lòng nhập mật khẩu cũ và mật khẩu mới của bạn.
      </Text>

      {/* Ô nhập Mật khẩu cũ */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Mật khẩu cũ</Text>
        <View style={styles.passwordInputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Nhập mật khẩu cũ"
            secureTextEntry={!showCurrentPassword} // Ẩn/hiện mật khẩu
            value={currentPassword}
            onChangeText={(text) => {
              setCurrentPassword(text);
              setCurrentPasswordError(''); // Xóa lỗi khi người dùng nhập
            }}
          />
          {/* Icon con mắt để toggle hiện/ẩn mật khẩu */}
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowCurrentPassword(!showCurrentPassword)}
          >
            <Icon
              name={showCurrentPassword ? 'eye' : 'eye-slash'} // Thay đổi icon
              size={20}
              color="#888"
            />
          </TouchableOpacity>
        </View>
        {currentPasswordError ? <Text style={styles.errorText}>{currentPasswordError}</Text> : null}

        {/* <Text // Không cần dòng này nếu bạn đã xử lý lỗi mật khẩu cũ bằng currentPasswordError
          onPress={() =>navigation.navigate('ForgotPasswordScreen')}
          style={{color: 'blue', fontWeight: '500'}}>{forgot}
        </Text> */}
      </View>

      {/* Ô nhập Mật khẩu mới */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Mật khẩu mới</Text>
        <View style={styles.passwordInputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Nhập mật khẩu mới"
            secureTextEntry={!showNewPassword} // Ẩn/hiện mật khẩu
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              setNewPasswordError(''); // Xóa lỗi khi người dùng nhập
            }}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowNewPassword(!showNewPassword)}
          >
            <Icon
              name={showNewPassword ? 'eye' : 'eye-slash'}
              size={20}
              color="#888"
            />
          </TouchableOpacity>
        </View>
        {newPasswordError ? <Text style={styles.errorText}>{newPasswordError}</Text> : null}
        <Text style={styles.passwordRequirement}>
          Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
        </Text>
      </View>

      {/* Ô nhập Xác nhận mật khẩu mới */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Xác nhận mật khẩu mới</Text>
        <View style={styles.passwordInputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Xác nhận mật khẩu mới"
            secureTextEntry={!showConfirmNewPassword} // Ẩn/hiện mật khẩu
            value={confirmNewPassword}
            onChangeText={(text) => {
              setConfirmNewPassword(text);
              setConfirmNewPasswordError(''); // Xóa lỗi khi người dùng nhập
            }}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
          >
            <Icon
              name={showConfirmNewPassword ? 'eye' : 'eye-slash'}
              size={20}
              color="#888"
            />
          </TouchableOpacity>
        </View>
        {confirmNewPasswordError ? <Text style={styles.errorText}>{confirmNewPasswordError}</Text> : null}
      </View>

      {/* Nút "Đổi Mật khẩu" */}
      <TouchableOpacity
        style={styles.changePasswordButton}
        onPress={handleChangePassword}
        disabled={isLoading} // Vô hiệu hóa nút khi đang loading
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" /> // Hiển thị vòng xoay loading
        ) : (
          <Text style={styles.changePasswordButtonText}>Đổi Mật khẩu</Text>
        )}
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
  passwordInputWrapper: {
    flexDirection: 'row', // Để icon và input nằm cùng hàng
    alignItems: 'center',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  input: {
    flex: 1, // Chiếm phần lớn không gian
    height: 50,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 10,
  },
  passwordRequirement: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
    paddingHorizontal: 5,
  },
  errorText: {
    fontSize: 14,
    color: '#dc3545',
    marginTop: 5,
    marginBottom: 5,
    paddingHorizontal: 5,
  },
  changePasswordButton: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
    marginTop: 20,
  },
  changePasswordButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ChangePasswordScreen;
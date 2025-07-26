import React, { useEffect, useState } from 'react';
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
import Icon from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api'; // Đảm bảo đường dẫn này đúng

/**
 * Màn hình "Đổi Mật khẩu" (Change Password Screen).
 * Người dùng đã đăng nhập và muốn thay đổi mật khẩu hiện tại của họ.
 * Yêu cầu nhập mật khẩu cũ để xác minh.
 */
const ChangePasswordScreen = () => {
  const navigation = useNavigation();

  const [userId, setUserId] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [userProvider, setUserProvider] = useState(null); // State để lưu trữ phương thức đăng nhập (local/google)
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // States cho các trường nhập mật khẩu
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // States để hiển thị lỗi cho từng trường
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmNewPasswordError, setConfirmNewPasswordError] = useState('');

  // States để quản lý trạng thái ẩn/hiện mật khẩu
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false); // Thêm state cho loading

  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        const storedUserInfo = await AsyncStorage.getItem('userInfo');

        if (storedToken && storedUserInfo) {
          setAuthToken(storedToken);
          const userInfo = JSON.parse(storedUserInfo);
          setUserId(userInfo._id);
          setUserProvider(userInfo.provider); // Lấy provider từ userInfo
          console.log('[ChangePasswordScreen] Loaded userId:', userInfo._id);
          console.log('[ChangePasswordScreen] Loaded authToken:', storedToken ? storedToken.substring(0, 30) + '...' : 'null');
          console.log('[ChangePasswordScreen] Loaded User Provider:', userInfo.provider);
        } else {
          console.warn('[ChangePasswordScreen] Auth data not found. Redirecting to Login.');
          Alert.alert("Lỗi xác thực", "Vui lòng đăng nhập lại để đổi mật khẩu.");
          navigation.replace('Login');
        }
      } catch (error) {
        console.error('[ChangePasswordScreen] Error loading auth data from AsyncStorage:', error);
        Alert.alert("Lỗi", "Không thể tải thông tin người dùng. Vui lòng thử lại.");
        navigation.replace('Login');
      } finally {
        setIsAuthLoading(false);
      }
    };
    loadAuthData();
  }, []);

  /**
   * Hàm kiểm tra độ mạnh của mật khẩu mới.
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
    Keyboard.dismiss();

    setCurrentPasswordError('');
    setNewPasswordError('');
    setConfirmNewPasswordError('');

    let hasError = false;

    if (!currentPassword.trim()) {
      setCurrentPasswordError('Vui lòng nhập mật khẩu cũ.');
      hasError = true;
    }

    const newPassError = validatePassword(newPassword);
    if (newPassError) {
      setNewPasswordError(newPassError);
      hasError = true;
    }

    if (!confirmNewPassword.trim()) {
      setConfirmNewPasswordError('Vui lòng xác nhận mật khẩu mới.');
      hasError = true;
    } else if (newPassword !== confirmNewPassword) {
      setConfirmNewPasswordError('Mật khẩu xác nhận không khớp.');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    if (currentPassword === newPassword) {
      setNewPasswordError('Mật khẩu mới không được trùng với mật khẩu cũ.');
      return;
    }

    // Kiểm tra nếu thông tin xác thực chưa được tải hoặc bị thiếu
    if (isAuthLoading || !userId || !authToken) {
      Alert.alert("Lỗi", "Thông tin xác thực chưa được tải đầy đủ. Vui lòng đợi hoặc thử lại.");
      return;
    }

    setIsLoading(true);

    try {
      const apiEndpoint = `${API_BASE_URL}/api/auth/change-password/id/${userId}`;
      console.log('[ChangePassword] Calling API:', apiEndpoint);

      const response = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          oldPassword: currentPassword,
          newPassword: newPassword,
        }),
      });

      let data;
      try {
        data = await response.json(); // Cố gắng parse JSON
      } catch (jsonParseError) {
        
        Alert.alert('Lỗi', 'Sai mật khẩu');
        setIsLoading(false);
        return; // Dừng hàm nếu không parse được JSON
      }

      console.log('[ChangePassword] API Response Status:', response.status);
      console.log('[ChangePassword] API Response Data:', data);

      if (response.ok) { // Kiểm tra status code (2xx)
        Alert.alert('Thành công', data.message || 'Mật khẩu của bạn đã được đổi thành công.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        navigation.navigate('Profile'); // Chuyển về màn hình Profile
      } else {
        // Backend trả về lỗi (ví dụ 400, 401, 500)
        let errorMessage = 'Không thể đổi mật khẩu. Vui lòng thử lại.';
        if (data && data.message) {
          errorMessage = data.message;
        } else if (response.status === 401) {
          errorMessage = 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.';
          await AsyncStorage.clear(); // Xóa token và ID
          navigation.replace('Login');
        } else if (response.status === 400) {
          errorMessage = data.message || 'Dữ liệu gửi lên không hợp lệ.';
        } else if (response.status === 500) {
          errorMessage = 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau.';
        }
        Alert.alert('Lỗi');
      }

    } catch (error) {
      // Lỗi mạng hoặc lỗi không xác định khác
      console.error('[ChangePassword] API call failed:', error);
      let userFacingError = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.';
      if (error.message.includes('Network request failed')) {
        userFacingError = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
      } else {
        userFacingError = error.message;
      }
      Alert.alert('Lỗi', userFacingError);
    } finally {
      setIsLoading(false);
    }
  };

  // Hiển thị màn hình loading trong khi tải dữ liệu xác thực
  if (isAuthLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Đang tải thông tin người dùng...</Text>
      </View>
    );
  }

  // Nếu người dùng đăng nhập bằng Google, chỉ hiển thị thông báo
  if (userProvider === 'firebase') {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back-outline" size={26} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Đổi Mật khẩu</Text>
        <View style={styles.messageContainer}>
          <Ionicons name="information-circle-outline" size={50} color="#007bff" />
          <Text style={styles.messageText}>
            Bạn đã đăng nhập bằng tài khoản Google. Không thể đổi mật khẩu qua ứng dụng.
          </Text>
          <TouchableOpacity
            style={styles.goBackButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.goBackButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Nếu người dùng đăng nhập bằng tài khoản cục bộ, hiển thị form đổi mật khẩu
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

      <TouchableOpacity onPress={() => navigation.navigate('ForgotPass')}>
        <Text style={styles.forgot}>Nếu bạn quên mật khẩu, hãy click vào đây</Text>
      </TouchableOpacity>

      {/* Nút "Đổi Mật khẩu" */}
      <TouchableOpacity
        style={styles.changePasswordButton}
        onPress={handleChangePassword}
        disabled={isLoading || isAuthLoading} // Vô hiệu hóa nút khi đang loading
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  backButton: {
    position: 'absolute',
    top: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  input: {
    flex: 1,
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
    backgroundColor: '#000000ff',
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
  // Styles for the message when logged in with Google
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    backgroundColor: '#fff',
  },
  messageText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#333',
    marginTop: 20,
    lineHeight: 26,
  },
  goBackButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 30,
  },
  goBackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  forgot: {
    color: 'black'
  }
});

export default ChangePasswordScreen;

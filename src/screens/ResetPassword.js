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
    ActivityIndicator, // Import ActivityIndicator
    StatusBar // Import StatusBar
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native'; // Cần cài đặt @react-navigation/native và import useRoute
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios'; // Import axios
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT } from '../config/api'; // Import API config

/**
 * Màn hình cho phép người dùng đặt lại mật khẩu mới sau khi đã xác thực OTP thành công.
 */
const ResetPasswordScreen = () => {
    const navigation = useNavigation();
    const route = useRoute(); // Sử dụng useRoute để lấy params
    const { email, otp } = route.params; // Lấy email và otp từ params

    // State cho mật khẩu mới và xác nhận mật khẩu
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false); // State cho trạng thái tải

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
    const handleResetPassword = async () => {
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

        setLoading(true); // Bắt đầu hiển thị trạng thái tải
        try {
            console.log('[ResetPasswordScreen] Đang gửi yêu cầu đặt lại mật khẩu cho email:', email);
            console.log('[ResetPasswordScreen] OTP:', otp); // Log OTP để kiểm tra

            // Gọi API đặt lại mật khẩu
            // API của bạn là PUT /api/auth/forget-password
            const response = await axios.put(
                API_ENDPOINTS.OTP.FORGOT_PASS_OUT_APP, // Sử dụng endpoint đổi mật khẩu bạn đã cung cấp
                {
                    email: email,
                    newPassword: newPassword,
                    // Backend của bạn cần được cập nhật để nhận OTP tại đây nếu nó là nơi xác minh OTP cuối cùng
                    // Nếu không, bạn có thể không cần gửi OTP ở đây nếu backend đã có cơ chế khác
                    // để xác minh quyền đổi mật khẩu (ví dụ: một token tạm thời từ bước xác minh OTP)
                    // Tuy nhiên, theo yêu cầu của bạn, OTP sẽ được gửi cùng với mật khẩu mới
                    otp: otp // Gửi OTP cùng với email và mật khẩu mới
                },
                {
                    timeout: API_TIMEOUT,
                    headers: API_HEADERS,
                }
            );

            console.log('[ResetPasswordScreen] Phản hồi từ API đặt lại mật khẩu:', response.data);

            if (response.status === 201 || response.status === 200) { // Giả định 201 Created hoặc 200 OK là thành công
                Alert.alert(
                    'Thành công',
                    'Mật khẩu của bạn đã được đặt lại thành công. Vui lòng đăng nhập lại.',
                    [
                        {
                            text: 'OK',
                            onPress: () => navigation.navigate('LoginScreen'), // Chuyển về màn hình đăng nhập
                        },
                    ]
                );
            } else {
                Alert.alert('Lỗi', response.data.message || 'Có lỗi xảy ra khi đặt lại mật khẩu. Vui lòng thử lại.');
            }
        } catch (error) {
            let message = 'Đã xảy ra lỗi hệ thống khi đặt lại mật khẩu. Vui lòng thử lại.';
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    // Lỗi từ server (ví dụ: OTP không hợp lệ, email không tồn tại, mật khẩu không đủ mạnh)
                    message = error.response.data.message || `Lỗi: ${error.response.status}`;
                } else if (error.request) {
                    // Yêu cầu đã được gửi nhưng không nhận được phản hồi (ví dụ: mất mạng)
                    message = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet.';
                } else {
                    // Lỗi trong quá trình thiết lập request
                    message = error.message;
                }
            } else {
                // Các loại lỗi khác
                message = error.message || message;
            }
            console.error('[ResetPasswordScreen] Lỗi:', error);
            Alert.alert('Lỗi', message);
        } finally {
            setLoading(false); // Dừng hiển thị trạng thái tải
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor='white' barStyle='dark-content' />
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
                    placeholderTextColor="#999"
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
                    placeholderTextColor="#999"
                />
                {/* Hiển thị thông báo lỗi nếu có */}
                {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
            </View>

            {/* Nút "Xác Nhận Mật khẩu" */}
            <TouchableOpacity
                style={styles.resetButton}
                onPress={handleResetPassword}
                disabled={loading} // Vô hiệu hóa nút khi đang tải
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.resetButtonText}>Xác Nhận Mật khẩu</Text>
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
        color: '#333', // Đảm bảo màu chữ dễ đọc
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

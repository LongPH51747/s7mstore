import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Image,
    Alert,
    ActivityIndicator,
    Modal,
    TouchableWithoutFeedback,
    Keyboard,
    StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Feather';

// Import các hằng số API từ file config/api.js
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT } from '../config/api';

const OTP_LENGTH = 5; // Độ dài của mã OTP thành 5 số
const OTP_EXPIRY_TIME = 600; // Thời gian OTP hết hạn thành 10 phút (600 giây)

const ForgotPasswordScreen = () => {
    const navigation = useNavigation();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setModalVisible] = useState(false);
    const [otp, setOtp] = useState(Array(OTP_LENGTH).fill('')); // Mảng để lưu từng chữ số OTP người dùng nhập
    const [backendOtp, setBackendOtp] = useState(''); // State mới để lưu OTP nhận từ backend
    const [countdown, setCountdown] = useState(OTP_EXPIRY_TIME);
    const [canResend, setCanResend] = useState(false);
    const otpInputRefs = useRef([]); // Ref cho từng ô nhập OTP

    // Hàm bắt đầu đếm ngược
    const startCountdown = () => {
        setCountdown(OTP_EXPIRY_TIME);
        setCanResend(false);
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setCanResend(true); // Cho phép gửi lại OTP
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer); // Cleanup function
    };

    // Xử lý gửi OTP (cập nhật để mở modal và lưu OTP từ backend)
    const handleSendOTP = async () => {
        if (!email || !email.includes('@') || !email.includes('.')) {
            Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ email hợp lệ.');
            return;
        }

        setLoading(true); // Bắt đầu hiển thị trạng thái tải
        try {
            console.log('[ForgotPasswordScreen] Đang gửi yêu cầu OTP cho email:', email);
            const response = await axios.post(
                API_ENDPOINTS.OTP.SEND_OTP, // Sử dụng đúng endpoint SEND_OTP theo config của bạn
                { email: email },
                {
                    timeout: API_TIMEOUT,
                    headers: API_HEADERS,
                }
            );

            console.log('[ForgotPasswordScreen] Phản hồi từ API gửi OTP:', response.data);

            // Cập nhật điều kiện kiểm tra thành công để chấp nhận cả 200 OK và 201 Created
            // Đồng thời lưu randomCode từ backend vào state
            if (response.status === 201 || response.status === 200) { 
                if (response.data && response.data.randomCode) {
                    setBackendOtp(response.data.randomCode); // LƯU MÃ OTP TỪ BACKEND
                    Alert.alert(
                        'Thành công',
                        'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư đến (và cả thư mục spam/rác).'
                    );
                    setModalVisible(true); // Mở modal
                    startCountdown(); // Bắt đầu đếm ngược
                    setOtp(Array(OTP_LENGTH).fill('')); // Reset OTP trong modal
                    otpInputRefs.current[0]?.focus(); // Focus vào ô đầu tiên
                } else {
                    Alert.alert('Lỗi', 'Không nhận được mã OTP từ máy chủ. Vui lòng thử lại.');
                }
            } else {
                // Xử lý các trường hợp phản hồi khác mà không phải lỗi HTTP
                Alert.alert('Lỗi', response.data.message || 'Đã xảy ra lỗi khi gửi OTP. Vui lòng thử lại.');
            }
        } catch (error) {
            let message = 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.';
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    // Lỗi từ server (ví dụ: email không tồn tại, lỗi server 500)
                    // Cập nhật thông báo lỗi nếu email không tồn tại
                    if (error.response.status === 400 && error.response.data.message === 'Email không tồn tại') {
                         message = 'Email này không tồn tại trong hệ thống của chúng tôi.';
                    } else {
                        message = error.response.data.message || `Lỗi: ${error.response.status}`;
                    }
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
            console.error('[ForgotPasswordScreen] Lỗi khi gửi OTP:', error);
            Alert.alert('Lỗi', message);
        } finally {
            setLoading(false); // Dừng hiển thị trạng thái tải
        }
    };

    // Xử lý nhập từng chữ số OTP
    const handleOtpChange = (text, index) => {
        if (isNaN(text)) return; // Chỉ cho phép nhập số
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);

        // Tự động chuyển focus
        if (text && index < OTP_LENGTH - 1) {
            otpInputRefs.current[index + 1]?.focus();
        } else if (!text && index > 0) {
            otpInputRefs.current[index - 1]?.focus();
        }
    };

    // Xử lý xác minh OTP (so sánh OTP trên frontend)
    const handleVerifyOTP = async () => {
        const fullOtp = otp.join('');
        if (fullOtp.length !== OTP_LENGTH) {
            Alert.alert('Lỗi', `Vui lòng nhập đủ ${OTP_LENGTH} chữ số OTP.`);
            return;
        }

        // SO SÁNH OTP NGAY TRÊN FRONTEND
        if (fullOtp === backendOtp) {
            Alert.alert('Thành công', 'Mã OTP chính xác. Bây giờ bạn có thể đặt lại mật khẩu.');
            setModalVisible(false); // Đóng modal
            console.log('[ForgotPasswordScreen] OTP đã nhập:', fullOtp, 'sẽ được chuyển tiếp đến ResetPasswordScreen.');
            // Đảm bảo bạn đã đăng ký 'ResetPasswordScreen' trong Stack Navigator của mình
            navigation.navigate('ResetPasswordScreen', { email: email, otp: fullOtp });
        } else {
            Alert.alert('Lỗi', 'Mã OTP không đúng. Vui lòng kiểm tra lại.');
            setOtp(Array(OTP_LENGTH).fill('')); // Xóa OTP đã nhập sai
            otpInputRefs.current[0]?.focus(); // Focus lại ô đầu tiên
        }
    };

    // Xử lý gửi lại OTP
    const handleResendOTP = () => {
        // Gọi lại hàm gửi OTP
        handleSendOTP();
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, alignItems: 'center', backgroundColor: 'white' }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar backgroundColor='white' barStyle='dark-content' />
            <Image style={styles.image} source={require('../../assets/image/logo.png')} />
            <View style={styles.container}>
                <Text style={styles.title}>Bạn quên mật khẩu ư ?</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Nhập email của bạn vào đây !!!"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="#999"
                />

                <Text style={styles.instruction}>
                    * Chúng tôi sẽ gửi cho bạn 1 mã OTP sau đó tiến hành nhập OTP để đổi mật khẩu
                </Text>

                <TouchableOpacity
                    onPress={handleSendOTP}
                    style={styles.submitButton}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitButtonText}>Gửi</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Modal nhập OTP */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                                <Icon name="x" size={24} color="#333" />
                            </TouchableOpacity>

                            <Text style={styles.modalTitle}>Nhập mã OTP</Text>
                            <Text style={styles.modalSubtitle}>
                                Mã OTP đã được gửi đến email của bạn: <Text style={styles.modalEmail}>{email}</Text>
                            </Text>

                            <View style={styles.otpInputContainer}>
                                {otp.map((digit, index) => (
                                    <TextInput
                                        key={index}
                                        style={styles.otpInputBox}
                                        value={digit}
                                        onChangeText={(text) => handleOtpChange(text, index)}
                                        keyboardType="number-pad"
                                        maxLength={1}
                                        ref={el => otpInputRefs.current[index] = el}
                                        onKeyPress={({ nativeEvent }) => {
                                            if (nativeEvent.key === 'Backspace' && !digit && index > 0) {
                                                otpInputRefs.current[index - 1]?.focus();
                                            }
                                        }}
                                    />
                                ))}
                            </View>

                            {countdown > 0 ? (
                                <Text style={styles.countdownText}>
                                    Mã sẽ hết hạn sau: {countdown} giây
                                </Text>
                            ) : (
                                <TouchableOpacity
                                    onPress={handleResendOTP}
                                    disabled={!canResend || loading}
                                    style={styles.resendButton}
                                >
                                    <Text style={styles.resendButtonText}>
                                        {loading ? 'Đang gửi lại...' : 'Gửi lại mã OTP'}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={styles.verifyButton}
                                onPress={handleVerifyOTP}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.verifyButtonText}>Xác nhận OTP</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        width: '100%', // Đảm bảo container chiếm toàn bộ chiều rộng
        alignItems: 'center', // Căn giữa các thành phần con
        justifyContent: 'center', // Căn giữa theo chiều dọc
    },
    image: {
        width: 200,
        height: 200,
        resizeMode: 'contain',
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 40,
        textAlign: 'center',
        color: '#333',
    },
    input: {
        height: 50,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        paddingLeft: 15,
        marginBottom: 20,
        fontSize: 16,
        width: '100%', // Đảm bảo input chiếm toàn bộ chiều rộng
        color: '#333',
    },
    instruction: {
        fontSize: 14,
        color: '#888',
        marginBottom: 20,
        textAlign: 'center',
    },
    submitButton: {
        backgroundColor: 'black',
        paddingVertical: 15,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%', // Đảm bảo button chiếm toàn bộ chiều rộng
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 25,
        width: '90%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    closeButton: {
        position: 'absolute',
        top: 15,
        right: 15,
        padding: 5,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    modalSubtitle: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginBottom: 25,
    },
    modalEmail: {
        fontWeight: 'bold',
        color: '#343A40',
    },
    otpInputContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '80%',
        marginBottom: 25,
    },
    otpInputBox: {
        width: 45,
        height: 55,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        textAlign: 'center',
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
    },
    countdownText: {
        fontSize: 16,
        color: '#888',
        marginBottom: 20,
    },
    resendButton: {
        marginTop: 10,
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
    resendButtonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '600',
    },
    verifyButton: {
        backgroundColor: '#343A40',
        paddingVertical: 15,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        marginTop: 15,
    },
    verifyButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default ForgotPasswordScreen;

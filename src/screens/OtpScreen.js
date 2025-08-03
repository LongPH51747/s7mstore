import React, { useState, useEffect, useRef, useMemo } from 'react'; // Import useMemo
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
    TouchableWithoutFeedback,
    Keyboard,
    StatusBar,
    SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import các hằng số API từ file config/api.js
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT } from '../config/api';

const OTP_LENGTH = 5; // Độ dài của mã OTP
const OTP_EXPIRY_TIME = 600; // Thời gian OTP hết hạn (10 phút = 600 giây)

const ChangePasswordLoggedInScreen = () => {
    const navigation = useNavigation();
    const [userEmail, setUserEmail] = useState(''); // Email của người dùng đã đăng nhập
    const [loading, setLoading] = useState(true); // Bắt đầu là true để hiển thị loading khi fetch email và gửi OTP
    const [otp, setOtp] = useState(Array(OTP_LENGTH).fill('')); // Mảng để lưu từng chữ số OTP người dùng nhập
    const [backendOtp, setBackendOtp] = useState(''); // State để lưu OTP nhận từ backend
    const [countdown, setCountdown] = useState(OTP_EXPIRY_TIME);
    const [canResend, setCanResend] = useState(false);
    const otpInputRefs = useRef([]); // Ref cho từng ô nhập OTP

    // Sử dụng useMemo để tính toán isOtpComplete
    const isOtpComplete = useMemo(() => {
        return otp.every((digit) => digit.length === 1);
    }, [otp]);

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

    // useEffect để lấy email từ AsyncStorage và tự động gửi OTP
    useEffect(() => {
        const fetchUserEmailAndSendOTP = async () => {
            try {
                setLoading(true);
                const userInfoString = await AsyncStorage.getItem('userInfo');
                if (userInfoString) {
                    const userInfo = JSON.parse(userInfoString);
                    if (userInfo.email) {
                        setUserEmail(userInfo.email);
                        // Tự động gửi OTP ngay sau khi lấy được email
                        await handleSendOTP(userInfo.email);
                    } else {
                        Alert.alert('Lỗi', 'Không tìm thấy email người dùng. Vui lòng đăng nhập lại.');
                        navigation.navigate('Login'); // Chuyển về màn hình đăng nhập
                    }
                } else {
                    Alert.alert('Lỗi', 'Thông tin người dùng không tồn tại. Vui lòng đăng nhập lại.');
                    navigation.navigate('Login'); // Chuyển về màn hình đăng nhập
                }
            } catch (error) {
                // Đã sửa: Đơn giản hóa cách ghi log lỗi
                console.error('[ChangePasswordLoggedInScreen] Lỗi khi lấy email từ AsyncStorage:', error.message || error);
                Alert.alert('Lỗi', 'Không thể tải thông tin người dùng. Vui lòng thử lại.');
                navigation.goBack(); // Hoặc chuyển về màn hình chính
            } finally {
                setLoading(false);
            }
        };

        fetchUserEmailAndSendOTP();
    }, []); // Chạy một lần khi component mount

    // Xử lý gửi OTP (nhận email làm tham số)
    const handleSendOTP = async (emailToSend) => {
        setLoading(true);
        try {
            console.log('[ChangePasswordLoggedInScreen] Đang gửi yêu cầu OTP cho email:', emailToSend);
            const response = await fetch(
                API_ENDPOINTS.OTP.SEND_OTP, // Sử dụng đúng endpoint SEND_OTP
                {
                    method: 'POST',
                    headers: API_HEADERS,
                    body: JSON.stringify({ email: emailToSend }),
                }
            );

            let data = null;
            const rawResponseText = await response.text();
            console.log('[ChangePasswordLoggedInScreen] Raw API Response Text:', rawResponseText);
            try {
                data = JSON.parse(rawResponseText);
            } catch (jsonParseError) {
                console.warn('[ChangePasswordLoggedInScreen] Could not parse response as JSON:', jsonParseError);
            }

            console.log('[ChangePasswordLoggedInScreen] Phản hồi từ API gửi OTP:', response.status, data);

            if (response.ok || response.status === 201 || response.status === 200) { // Kiểm tra status 2xx
                if (data && data.randomCode) {
                    setBackendOtp(data.randomCode); // LƯU MÃ OTP TỪ BACKEND
                    Alert.alert(
                        'Thành công',
                        'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư đến (và cả thư mục spam/rác).'
                    );
                    startCountdown(); // Bắt đầu đếm ngược
                    setOtp(Array(OTP_LENGTH).fill('')); // Reset OTP
                    // Focus vào ô đầu tiên sau khi gửi OTP thành công
                    if (otpInputRefs.current[0]) {
                        otpInputRefs.current[0].focus();
                    }
                } else {
                    Alert.alert('Lỗi', 'Không nhận được mã OTP từ máy chủ hoặc cấu trúc phản hồi không đúng. Vui lòng thử lại.');
                }
            } else {
                let errorMessage = 'Đã xảy ra lỗi khi gửi OTP. Vui lòng thử lại.';
                if (data && data.message) {
                    errorMessage = data.message;
                } else if (rawResponseText) {
                    errorMessage = rawResponseText;
                }

                if (response.status === 400 && errorMessage.includes('Email không tồn tại')) {
                     errorMessage = 'Email này không tồn tại trong hệ thống của chúng tôi.';
                }
                Alert.alert('Lỗi', errorMessage);
            }
        } catch (error) {
            let message = 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.';
            if (error.message.includes('Network request failed')) {
                message = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet.';
            } else {
                message = error.message;
            }
            console.error('[ChangePasswordLoggedInScreen] Lỗi khi gửi OTP:', error);
            Alert.alert('Lỗi', message);
        } finally {
            setLoading(false);
        }
    };

    // Xử lý nhập từng chữ số OTP
    const handleOtpChange = (text, index) => {
        if (isNaN(text)) return;
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);

        if (text && index < OTP_LENGTH - 1) {
            otpInputRefs.current[index + 1]?.focus();
        } else if (!text && index > 0) {
            otpInputRefs.current[index - 1]?.focus();
        }
    };

    // Xử lý xác minh OTP (so sánh OTP trên frontend)
    const handleVerifyOTP = async () => {
        if (loading) return; // Ngăn chặn double click khi đang loading

        const fullOtp = otp.join('');
        if (fullOtp.length !== OTP_LENGTH) {
            Alert.alert('Lỗi', `Vui lòng nhập đủ ${OTP_LENGTH} chữ số OTP.`);
            return;
        }

        console.log('Mã OTP đã nhập:', fullOtp);
        console.log('Mã OTP từ backend:', backendOtp);

        if (fullOtp === backendOtp) {
            Alert.alert('Thành công', 'Mã OTP chính xác. Bây giờ bạn có thể đặt lại mật khẩu.');
            console.log('[ChangePasswordLoggedInScreen] OTP đã nhập:', fullOtp, 'sẽ được chuyển tiếp đến ResetPasswordScreen.');
            navigation.navigate('ResetPasswordScreen', { email: userEmail, otp: fullOtp });
        } else {
            Alert.alert('Lỗi', 'Mã xác thực không hợp lệ. Vui lòng kiểm tra lại.');
            setOtp(Array(OTP_LENGTH).fill('')); // Xóa OTP đã nhập sai
            otpInputRefs.current[0]?.focus(); // Focus lại ô đầu tiên
        }
    };

    // Xử lý gửi lại OTP
    const handleResendOTP = () => {
        if (loading || !canResend || !userEmail) return;

        if (userEmail) {
            handleSendOTP(userEmail);
        } else {
            Alert.alert('Lỗi', 'Không tìm thấy email để gửi lại OTP. Vui lòng thử lại.');
        }
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };

    // Hiển thị loading ban đầu trong khi lấy email và gửi OTP
    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text style={styles.loadingText}>Đang lấy thông tin và gửi OTP...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.fullScreenContainer}>
            <StatusBar backgroundColor='white' barStyle='dark-content' />
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Icon name="arrow-left" size={24} color="#333" />
            </TouchableOpacity>

            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.contentContainer}>
                    <Text style={styles.title}>Mã xác thực đã được gửi!</Text>
                    <Text style={styles.subtitle}>
                        Chúng tôi đã gửi mã xác thực gồm <Text style={styles.boldText}>{OTP_LENGTH} chữ số</Text> đến địa chỉ email của bạn.
                        Vui lòng kiểm tra hộp thư đến (bao gồm cả thư mục Spam/Thư rác) và nhập mã dưới đây.
                    </Text>
                    <Text style={styles.emailHint}>Gửi đến: {userEmail}</Text>

                    <View style={styles.otpInputContainer}>
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                style={styles.otpInputBox}
                                keyboardType="number-pad"
                                maxLength={1}
                                value={digit}
                                onChangeText={(text) => handleOtpChange(text, index)}
                                onKeyPress={({ nativeEvent }) => {
                                    if (nativeEvent.key === 'Backspace' && !digit && index > 0) {
                                        otpInputRefs.current[index - 1]?.focus();
                                    }
                                }}
                                ref={el => otpInputRefs.current[index] = el}
                                autoFocus={index === 0} // Tự động focus vào ô đầu tiên
                            />
                        ))}
                    </View>

                    {countdown > 0 ? (
                        <Text style={styles.countdownText}>
                            Mã sẽ hết hạn sau: {formatTime(countdown)}
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
                        style={[styles.verifyButton, !isOtpComplete && styles.verifyButtonDisabled]}
                        onPress={handleVerifyOTP}
                        disabled={!isOtpComplete || loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.verifyButtonText}>Xác nhận OTP</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </TouchableWithoutFeedback>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
    },
    fullScreenContainer: {
        flex: 1,
        backgroundColor: 'white',
    },
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 20 : 50,
        left: 20,
        zIndex: 1,
        padding: 5,
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 25,
        paddingTop: 50,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    boldText: {
        fontWeight: 'bold',
    },
    emailHint: {
        fontSize: 14,
        color: '#888',
        marginBottom: 30,
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
    verifyButtonDisabled: {
        backgroundColor: '#a0a0a0',
    },
    verifyButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default ChangePasswordLoggedInScreen;

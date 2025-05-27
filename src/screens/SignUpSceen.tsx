import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import CustomTextInput from '../components/customTextInput';
import auth from '@react-native-firebase/auth';

type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  Home: undefined;
};

type SignUpScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SignUp'>;

interface SignUpScreenProps {
  navigation: SignUpScreenNavigationProp;
}

const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const handleSignUp = async () => {
    try {
      if (!email || !password || !confirmPassword) {
        Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ email, mật khẩu và xác nhận mật khẩu');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Lỗi', 'Mật khẩu và xác nhận mật khẩu không khớp');
        return;
      }
      await auth().createUserWithEmailAndPassword(email, password);
      Alert.alert('Thành công', 'Đăng ký thành công!');
      navigation.navigate('Login');
    } catch (error: any) {
      let message = 'Đăng ký thất bại';
      if (error.code === 'auth/invalid-email') {
        message = 'Email không hợp lệ';
      } else if (error.code === 'auth/weak-password') {
        message = 'Mật khẩu quá yếu';
      } else if (error.code === 'auth/email-already-in-use') {
        message = 'Email đã được sử dụng';
      }
      Alert.alert('Lỗi', message);
      console.error('Lỗi đăng ký:', error);
    }
  };

  return (
    <SafeAreaView style={styles.signUpContainer}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/LogoS7MStore.png')}
                style={styles.logo}
              />
            </View>
            <View style={styles.formContent}>
              <Text style={styles.title}>Đăng ký tài khoản S7M Store</Text>
              <CustomTextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Nhập email của bạn"
              />
              <CustomTextInput
                label="Mật khẩu"
                value={password}
                onChangeText={setPassword}
                placeholder="Nhập mật khẩu của bạn"
                secureTextEntry
              />
              <CustomTextInput
                label="Xác nhận mật khẩu"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Xác nhận mật khẩu"
                secureTextEntry
              />
              <TouchableOpacity onPress={handleSignUp} style={styles.button}>
                <Text style={styles.buttonText}>Đăng ký</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginText}>
                Đã có tài khoản? <Text style={{ color: '#3B82F6' }}>Đăng nhập</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  signUpContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 300,
    height: 300,
  },
  formContent: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1F2937',
  },
  button: {
    backgroundColor: '#1c2b38',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loginText: {
    textAlign: 'center',
    margin: 30,
  
  },
});

export default SignUpScreen;
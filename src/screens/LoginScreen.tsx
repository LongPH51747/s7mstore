import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  Alert,
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

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const handleLogin = async () => {
    try {
      if (!email || !password) {
        Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ email và mật khẩu');
        return;
      }
      await auth().signInWithEmailAndPassword(email, password);
      Alert.alert('Thành công', 'Đăng nhập thành công!');
      navigation.navigate('Home');
    } catch (error: any) {
      let message = 'Đăng nhập thất bại';
      if (error.code === 'auth/invalid-email') {
        message = 'Email không hợp lệ';
      } else if (error.code === 'auth/user-not-found') {
        message = 'Tài khoản không tồn tại';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Mật khẩu không đúng';
      }
      Alert.alert('Lỗi', message);
      console.error('Lỗi đăng nhập:', error);
    }
  };

  return (
    <SafeAreaView style={styles.loginContainer}>
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
              <Text style={styles.title}>Chào mừng đến với S7M Store</Text>
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
              <TouchableOpacity onPress={handleLogin} style={styles.button}>
                <Text style={styles.buttonText}>Đăng nhập</Text>
              </TouchableOpacity>

              {/* Social Login Buttons */}
              <View style={styles.socialContainer}>
                <TouchableOpacity style={styles.facebookButton}><Image style={{marginHorizontal:30}}
                source={require('../assets/LogoFB.png')}/>
                  <Text style={styles.socialButtonText}>Đăng nhập bằng Facebook</Text>

                </TouchableOpacity>
                <TouchableOpacity style={styles.googleButton}>
                <Image style={{marginHorizontal:30}}
                source={require('../assets/LogoGG.png')}/>
                  <Text style={styles.socialButtonText}>Đăng nhập bằng Google</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.signupText}>
                Chưa có tài khoản? <Text style={{ color: '#3B82F6' }}>Đăng ký</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loginContainer: {
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
  socialContainer: {
    marginTop: 16,
  },
  facebookButton: {
    flexDirection: 'row',
    
    backgroundColor: '#1877F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#fe9600',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  socialButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signupText: {
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 10,
  },
});

export default LoginScreen;
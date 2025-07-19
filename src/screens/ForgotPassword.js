import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, alignItems:'center', backgroundColor: 'white' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
       <Image style={styles.image} source={require('../../assets/image/logo.png')}/>
      <View style={styles.container}>
         
        <Text style={styles.title}>Bạn quên mật khẩu ư ?</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Nhập email của bạn vào đây !!!"
          keyboardType="email-address"
        />
        
        <Text style={styles.instruction}>* Chúng tôi sẽ gửi cho bạn 1 mã OTP sau đó tiến hành nhập OTP để đổi mật khẩu</Text>
        
        <TouchableOpacity
        onPress={() =>navigation.navigate('OtpScreen')}
        style={styles.submitButton}>
          <Text style={styles.submitButtonText}>Gửi</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  instruction: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: 'black',
    paddingVertical: 15,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  image: {
    width: 200,
    height: 200,
   
  }
});

export default ForgotPasswordScreen;

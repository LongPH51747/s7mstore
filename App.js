import React from 'react'
import ProfileScreen from './screens/ProfileScreen'
import ForgotPasswordScreen from './screens/ForgotPassword'
import OtpVerificationScreen from './screens/OtpScreen'
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import ResetPasswordScreen from './screens/ResetPassword';
import ChangePasswordScreen from './screens/ChangePassword';
import RefundReturnScreen from './screens/TraHangScreen';
import AddAddressScreen from './screens/AddAddress';
const App = () => {
    const Stack = createStackNavigator();
  return (
  <NavigationContainer>
    <Stack.Navigator initialRouteName='address' screenOptions={{headerShown: false}}>
      <Stack.Screen name='otp' component={OtpVerificationScreen}/>
      <Stack.Screen name='profile' component={ProfileScreen}/>
      <Stack.Screen name='reset' component={ResetPasswordScreen}/>
      <Stack.Screen name='forgot' component={ForgotPasswordScreen}/>
      <Stack.Screen name='change' component={ChangePasswordScreen}/>
      <Stack.Screen name='trahang' component={RefundReturnScreen}/>
      <Stack.Screen name='address' component={AddAddressScreen}/>
    </Stack.Navigator>
  </NavigationContainer>
  )
}

export default App
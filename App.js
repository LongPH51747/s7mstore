import React from 'react'
import ProfileScreen from './screens/ProfileScreen'
import ForgotPasswordScreen from './screens/ForgotPassword'
import OtpVerificationScreen from './screens/OtpScreen'
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import ResetPasswordScreen from './screens/ChangePassword';
const App = () => {
    const Stack = createStackNavigator();
  return (
  <NavigationContainer>
    <Stack.Navigator initialRouteName='reset' screenOptions={{headerShown: false}}>
      <Stack.Screen name='otp' component={OtpVerificationScreen}/>
      <Stack.Screen name='profile' component={ProfileScreen}/>
      <Stack.Screen name='reset' component={ResetPasswordScreen}/>
    </Stack.Navigator>
  </NavigationContainer>
  )
}

export default App
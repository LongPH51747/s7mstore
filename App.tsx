import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import CartScreen from './src/screens/CartScreen'
import CheckoutScreen from './src/screens/CheckoutScreen'
import OrderDetailsScreen from './src/screens/OrderDetailScreen'
import PaymentSuccessScreen from './src/screens/PaymentSuccessScreen'
import OrdersScreen from './src/screens/OrderScreen'

const App = () => {
  return (
    <CartScreen/>
    // <CheckoutScreen/>
    // <OrderDetailsScreen/>
    // <OrdersScreen/>
    // <PaymentSuccessScreen/>
  )
}

export default App

const styles = StyleSheet.create({})
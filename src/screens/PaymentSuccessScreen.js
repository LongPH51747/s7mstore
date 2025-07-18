import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';

const PaymentSuccessScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const orderId = route.params?.orderId || '24587745633248'; // Fallback to default if no orderId passed

  const handleContinue = () => {
    navigation.navigate('Home'); // Navigate to the Home screen
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.iconWrapper}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark" size={40} color="#34C759" />
        </View>
      </View>

      <Text style={styles.title}>Payment successful!</Text>
      {/* <Text style={styles.orderNumber}>Mã đơn hàng: {orderId}</Text> */}
      <Text style={styles.thankYou}>Thank you for shopping!</Text>

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default PaymentSuccessScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconWrapper: {
    marginBottom: 30,
  },
  iconCircle: {
    borderWidth: 2,
    borderColor: '#34C759',
    borderRadius: 50,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 10,
  },
  orderNumber: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 5,
  },
  thankYou: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 100,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});

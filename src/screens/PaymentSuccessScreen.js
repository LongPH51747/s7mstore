import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PaymentSuccessScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const orderId = route.params?.orderId || '24587745633248'; // Fallback to default if no orderId passed

  // Add useFocusEffect to ensure data is refreshed when returning from this screen
  useFocusEffect(
    React.useCallback(() => {
      // Set a flag to indicate that we're returning from payment success
      const setPaymentSuccessFlag = async () => {
        try {
          await AsyncStorage.setItem('returningFromPaymentSuccess', 'true');
          console.log('PaymentSuccessScreen: Set returningFromPaymentSuccess flag');
        } catch (error) {
          console.error('Error setting payment success flag:', error);
        }
      };
      
      setPaymentSuccessFlag();
      
      return () => {
        // Clean up the flag when leaving the screen
        const clearPaymentSuccessFlag = async () => {
          try {
            await AsyncStorage.removeItem('returningFromPaymentSuccess');
            console.log('PaymentSuccessScreen: Cleared returningFromPaymentSuccess flag');
          } catch (error) {
            console.error('Error clearing payment success flag:', error);
          }
        };
        
        clearPaymentSuccessFlag();
      };
    }, [])
  );

  const handleContinue = async () => {
    try {
      // Đảm bảo flag được set trước khi navigate
      await AsyncStorage.setItem('returningFromPaymentSuccess', 'true');
      console.log('PaymentSuccessScreen: Set flag before navigating to HomeScreen');
      
      // Thêm một chút delay để đảm bảo flag được set
      setTimeout(() => {
        navigation.navigate('HomeScreen');
      }, 100);
      
    } catch (error) {
      console.error('Error setting payment success flag:', error);
      // Vẫn navigate ngay cả khi có lỗi
      navigation.navigate('HomeScreen');
    }
  };

  const handleViewOrders = async () => {
    try {
      // Đảm bảo flag được set trước khi navigate
      await AsyncStorage.setItem('returningFromPaymentSuccess', 'true');
      console.log('PaymentSuccessScreen: Set flag before navigating to OrderScreen');
      
      // Thêm một chút delay để đảm bảo flag được set
      setTimeout(() => {
        navigation.navigate('OrderScreen');
      }, 100);
      
    } catch (error) {
      console.error('Error setting payment success flag:', error);
      // Vẫn navigate ngay cả khi có lỗi
      navigation.navigate('OrderScreen');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.iconWrapper}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark" size={40} color="#34C759" />
        </View>
      </View>

      <Text style={styles.title}>Payment successful!</Text>
      <Text style={styles.orderNumber}>Mã đơn hàng: {orderId}</Text>
      <Text style={styles.thankYou}>Thank you for shopping!</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Tiếp tục mua sắm</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryButton} onPress={handleViewOrders}>
          <Text style={styles.secondaryButtonText}>Xem đơn hàng</Text>
        </TouchableOpacity>
      </View>
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
    textAlign: 'center',
  },
  orderNumber: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 5,
    textAlign: 'center',
  },
  thankYou: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  secondaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});

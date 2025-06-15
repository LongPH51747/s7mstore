import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { RadioButton } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { API_ENDPOINTS, API_HEADERS } from '../config/api';

export default function CheckoutScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  const [cartItems, setCartItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [subTotalPrice, setSubTotalPrice] = useState(0);
  const [voucherAmount, setVoucherAmount] = useState(0);
  const [shippingFee, setShippingFee] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    console.log('Route Params:', route.params);
  }, [route.params]);

  useEffect(() => {
    if (route.params?.cartItems) {
      setCartItems(route.params.cartItems);
    } else if (route.params?.product && route.params?.quantity) {
      const singleProduct = {
        ...route.params.product,
        quantity: route.params.quantity,
        unit_price_item: route.params.product.selectedVariant?.variant_price || route.params.product.product_price,
        color: route.params.product.selectedVariant?.variant_color || '',
        size: route.params.product.selectedVariant?.variant_size || '',
        image: route.params.product.selectedVariant?.variant_image_url || route.params.product.product_image,
        name_product: route.params.product.product_name,
      };
      setCartItems([singleProduct]);
    }
  }, [route.params]);

  useEffect(() => {
    let subTotal = 0;
    cartItems.forEach(item => {
      subTotal += (item.unit_price_item || item.price) * item.quantity;
    });
    setSubTotalPrice(subTotal);
    setVoucherAmount(30000);
    setShippingFee(20000);
    setTotalAmount(subTotal - 30000 + 20000);
  }, [cartItems]);

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Giỏ hàng trống', 'Vui lòng thêm sản phẩm vào giỏ hàng trước khi đặt.');
      return;
    }

    try {
      console.log('Placing order with:', { cartItems, totalAmount, paymentMethod });
      await new Promise(resolve => setTimeout(resolve, 1000));
      Alert.alert('Đặt hàng thành công!', 'Đơn hàng của bạn đã được đặt.');
      navigation.navigate('PaymentSuccess');
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Lỗi', 'Không thể đặt hàng. Vui lòng thử lại.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        <Text style={styles.title}>Checkout</Text>

        {/* Địa chỉ giao hàng */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Địa chỉ giao hàng</Text>
          <TouchableOpacity style={styles.editBtn}><Text style={styles.editText}>Sửa</Text></TouchableOpacity>
          <Text style={styles.text}>Dmitriy Divnov</Text>
          <Text style={styles.text}>Brest, Belarus</Text>
          <Text style={styles.text}>+375 (29) 749-19-24</Text>
        </View>

        {/* Sản phẩm */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sản phẩm</Text>
          <TouchableOpacity style={styles.editBtn}><Text style={styles.editText}>Sửa</Text></TouchableOpacity>
          {cartItems.map((item, index) => {
            const productImageSource = (
              item.image && 
              (item.image.startsWith('http://') || 
               item.image.startsWith('https://') || 
               item.image.startsWith('data:image'))
            )
              ? { uri: item.image }
              : require('../assets/LogoGG.png');

            return (
              <View key={item.id_variant || item._id || index} style={styles.productRow}>
                <Image
                  source={productImageSource}
                  style={styles.image}
                  onError={(e) => {
                    console.error('Product image loading error:', e.nativeEvent.error);
                    e.target.setNativeProps({
                      source: require('../assets/LogoGG.png')
                    });
                  }}
                />
                <View style={styles.productDetails}>
                  <Text style={styles.productName}>{item.name_product || item.product_name}</Text>
                  <Text>Color: {item.color}</Text>
                  <Text>Size: {item.size}</Text>
                  <Text style={styles.price}>
                    {(item.unit_price_item || item.price)?.toLocaleString('vi-VN')}đ
                  </Text>
                  <Text style={styles.quantity}>Số lượng: {item.quantity}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Voucher */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>S7M Voucher</Text>
          <TouchableOpacity><Text style={styles.editText}>Chọn voucher </Text></TouchableOpacity>
        </View>

        {/* Chi tiết thanh toán */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chi tiết thanh toán</Text>
          <Text>Tổng tiền hàng: {subTotalPrice?.toLocaleString('vi-VN')}đ</Text>
          <Text>Voucher: -{voucherAmount?.toLocaleString('vi-VN')}đ</Text>
          <Text>Vận chuyển: {shippingFee?.toLocaleString('vi-VN')}đ</Text>
        </View>

        {/* Phương thức thanh toán */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          <View style={styles.radioRow}>
            <RadioButton
              value="cod"
              status={paymentMethod === 'cod' ? 'checked' : 'unchecked'}
              onPress={() => setPaymentMethod('cod')}
            />
            <Text>Thanh toán khi nhận hàng</Text>
          </View>
          <View style={styles.radioRow}>
            <RadioButton
              value="momo"
              status={paymentMethod === 'momo' ? 'checked' : 'unchecked'}
              onPress={() => setPaymentMethod('momo')}
            />
            <Text>Thanh toán qua Momo</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer cố định */}
      <View style={styles.fixedFooter}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Tổng:</Text>
          <Text style={styles.totalValue}>{totalAmount?.toLocaleString('vi-VN')}đ</Text>
        </View>
        <TouchableOpacity style={styles.orderBtn} onPress={handlePlaceOrder}>
          <Text style={styles.orderText}>Đặt hàng</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#fff' 
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 12,
    paddingBottom: 100,
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 12 
  },
  section: { 
    marginBottom: 16 
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  editBtn: { 
    position: 'absolute', 
    right: 0, 
    top: 0 
  },
  editText: { 
    color: '#007AFF',
    fontSize: 14
  },
  text: { 
    marginTop: 2,
    fontSize: 14
  },
  productRow: { 
    flexDirection: 'row', 
    marginTop: 8,
    backgroundColor: '#F6F8F9',
    padding: 8,
    borderRadius: 8
  },
  image: { 
    width: 80, 
    height: 100, 
    borderRadius: 6, 
    marginRight: 8 
  },
  productDetails: { 
    flex: 1 
  },
  productName: { 
    fontWeight: 'bold', 
    marginBottom: 2,
    fontSize: 14
  },
  price: { 
    color: 'green', 
    marginTop: 4,
    fontSize: 14,
    fontWeight: 'bold'
  },
  quantity: {
    marginTop: 4,
    fontSize: 14,
    color: '#666'
  },
  radioRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 4 
  },
  fixedFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E3E4E5',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D3180C',
  },
  orderBtn: { 
    backgroundColor: 'black', 
    paddingVertical: 10, 
    paddingHorizontal: 20, 
    borderRadius: 6 
  },
  orderText: { 
    color: '#fff', 
    fontWeight: 'bold',
    fontSize: 14
  }
});

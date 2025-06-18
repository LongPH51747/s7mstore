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
  const [voucherAmount, setVoucherAmount] = useState(0); // Placeholder for voucher logic
  const [shippingFee, setShippingFee] = useState(0); // Placeholder for shipping logic
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    if (route.params?.cartItems) {
      setCartItems(route.params.cartItems);
    } else if (route.params?.product && route.params?.quantity) { // For direct checkout of a single product
      // Assuming product passed here would have variant info within it for display
      const singleProduct = {
        ...route.params.product,
        quantity: route.params.quantity,
        // Assume price comes from selected variant in ProductDetailScreen
        unit_price_item: route.params.product.selectedVariant?.variant_price || route.params.product.product_price,
        color: route.params.product.selectedVariant?.variant_color || '',
        size: route.params.product.selectedVariant?.variant_size || '',
        image: route.params.product.selectedVariant?.variant_image_url || route.params.product.product_image, // Or base64
        name_product: route.params.product.product_name,
      };
      setCartItems([singleProduct]);
    }
  }, [route.params]);

  useEffect(() => {
    // Calculate subtotal
    let subTotal = 0;
    cartItems.forEach(item => {
      subTotal += (item.unit_price_item || item.price) * item.quantity;
    });
    setSubTotalPrice(subTotal);

    // For simplicity, fixed voucher and shipping for now. Integrate real logic later.
    setVoucherAmount(30000); // Example fixed voucher
    setShippingFee(20000); // Example fixed shipping

    // Calculate total
    let calculatedTotal = subTotal - voucherAmount + shippingFee;
    setTotalAmount(calculatedTotal);
  }, [cartItems, voucherAmount, shippingFee]);

  const handleQuantity = (type, itemId) => {
    setCartItems(prevItems => 
      prevItems.map(item => {
        if (item.id_variant === itemId || item._id === itemId) { // Use _id for product if not a variant
          let newQuantity = item.quantity;
          if (type === 'plus') newQuantity++;
          if (type === 'minus' && newQuantity > 1) newQuantity--;
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Giỏ hàng trống', 'Vui lòng thêm sản phẩm vào giỏ hàng trước khi đặt.');
      return;
    }

    try {
      // This is a placeholder for actual order placement API call
      // You would send cartItems, totalAmount, shippingAddress, paymentMethod, etc.
      console.log('Placing order with:', { cartItems, totalAmount, paymentMethod });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000)); 

      Alert.alert('Đặt hàng thành công!', 'Đơn hàng của bạn đã được đặt.');
      navigation.navigate('PaymentSuccess');

    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Lỗi', 'Không thể đặt hàng. Vui lòng thử lại.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Checkout</Text>

      {/* Địa chỉ giao hàng */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Địa chỉ giao hàng</Text>
        <TouchableOpacity style={styles.editBtn}><Text style={styles.editText}>Sửa</Text></TouchableOpacity>
        <Text style={styles.text}>Dmitriy Divnov</Text> {/* Placeholder */}
        <Text style={styles.text}>Brest, Belarus</Text> {/* Placeholder */}
        <Text style={styles.text}>+375 (29) 749-19-24</Text> {/* Placeholder */}
      </View>

      {/* Sản phẩm */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sản phẩm</Text>
        <TouchableOpacity style={styles.editBtn}><Text style={styles.editText}>Sửa</Text></TouchableOpacity>
        {cartItems.map((item, index) => (
          <View key={item.id_variant || item._id || index} style={styles.productRow}>
            <Image 
              source={{
                uri: item.image && (item.image.startsWith('http') ? item.image : `data:image/jpeg;base64,${item.image}`)
              }}
              style={styles.image}
            />
            <View style={styles.productDetails}>
              <Text style={styles.productName}>{item.name_product || item.product_name}</Text>
              <Text>Color: {item.color}</Text>
              <Text>Size: {item.size}</Text>
              <Text style={styles.price}>{item.unit_price_item?.toLocaleString('vi-VN')}đ</Text>
              <View style={styles.quantityContainer}>
                <TouchableOpacity onPress={() => handleQuantity('minus', item.id_variant || item._id)}><Text style={styles.qBtn}>-</Text></TouchableOpacity>
                <Text style={styles.quantity}>{item.quantity}</Text>
                <TouchableOpacity onPress={() => handleQuantity('plus', item.id_variant || item._id)}><Text style={styles.qBtn}>+</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
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
        <Text style={styles.total}>Total: {totalAmount?.toLocaleString('vi-VN')}đ</Text>
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

      {/* Đặt hàng */}
      <View style={styles.footer}>
        <Text style={styles.total}>Tổng: {totalAmount?.toLocaleString('vi-VN')}đ</Text>
        <TouchableOpacity style={styles.orderBtn} onPress={handlePlaceOrder}><Text style={styles.orderText}>Đặt hàng</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  editBtn: { position: 'absolute', right: 0, top: 0 },
  editText: { color: '#007AFF' },
  text: { marginTop: 4 },
  productRow: { flexDirection: 'row', marginTop: 12 },
  image: { width: 100, height: 120, borderRadius: 8, marginRight: 12 },
  productDetails: { flex: 1 },
  productName: { fontWeight: 'bold', marginBottom: 4 },
  price: { color: 'green', marginTop: 8 },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  qBtn: { fontSize: 20, paddingHorizontal: 8 },
  quantity: { marginHorizontal: 8 },
  total: { fontWeight: 'bold', marginTop: 8, fontSize: 16 },
  radioRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  orderBtn: { backgroundColor: 'black', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  orderText: { color: '#fff', fontWeight: 'bold' }
});

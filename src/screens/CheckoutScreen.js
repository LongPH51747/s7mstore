import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { RadioButton } from 'react-native-paper';

export default function CheckoutScreen() {
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('cod');

  const handleQuantity = (type) => {
    if (type === 'plus') setQuantity(quantity + 1);
    if (type === 'minus' && quantity > 1) setQuantity(quantity - 1);
  };

  const price = 120;
  const voucher = 3;
  const shipping = 2;
  const total = price - voucher + shipping;

  return (
    <ScrollView style={styles.container}>
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
        <View style={styles.productRow}>
          <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/706/706830.png' }} style={styles.image} />
          <View style={styles.productDetails}>
            <Text style={styles.productName}>Chân Váy Xòe Dáng Ngắn Sang Chảnh</Text>
            <Text>Color: Pink</Text>
            <Text>Size: XXL</Text>
            <Text style={styles.price}>120.00$</Text>
            <View style={styles.quantityContainer}>
              <TouchableOpacity onPress={() => handleQuantity('minus')}><Text style={styles.qBtn}>-</Text></TouchableOpacity>
              <Text style={styles.quantity}>{quantity}</Text>
              <TouchableOpacity onPress={() => handleQuantity('plus')}><Text style={styles.qBtn}>+</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Voucher */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>S7M Voucher</Text>
        <TouchableOpacity><Text style={styles.editText}>Chọn voucher </Text></TouchableOpacity>
      </View>

      {/* Chi tiết thanh toán */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chi tiết thanh toán</Text>
        <Text>Tổng tiền hàng: {price.toFixed(2)}$</Text>
        <Text>Voucher: -{voucher.toFixed(2)}$</Text>
        <Text>Vận chuyển: {shipping.toFixed(2)}$</Text>
        <Text style={styles.total}>Total: {total.toFixed(2)}$</Text>
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
        <Text style={styles.total}>Tổng: {total.toFixed(2)}$</Text>
        <TouchableOpacity style={styles.orderBtn}><Text style={styles.orderText}>Đặt hàng</Text></TouchableOpacity>
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

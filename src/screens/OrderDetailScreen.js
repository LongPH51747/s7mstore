import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView } from 'react-native';
import { List } from 'react-native-paper';

export default function OrderDetailsScreen() {
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>Chi tiết đơn hàng</Text>

      {/* Trạng thái */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Trạng thái</Text>
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>Đang giao</Text>
        </View>
      </View>

      {/* Thông tin đơn hàng */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
        <Text style={styles.textGray}>Mã đơn: xxxx</Text>
        <Text style={styles.textGray}>Ngày đặt hàng: 22-10-2024</Text>
      </View>

      {/* Sản phẩm */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sản phẩm</Text>
        <View style={styles.productRow}>
          <Image
            source={{ uri: 'https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/78be60e4-0d8a-4fc2-adc1-0b19eaf81f1d' }}
            style={styles.productImage}
          />
          <View style={styles.productInfo}>
            <Text style={styles.productName}>Chân Váy Xòe Dáng Ngắn Sang Chảnh...</Text>
            <Text style={styles.textGray}>Color: Pink</Text>
            <Text style={styles.textGray}>Size: XXL</Text>
            <Text style={styles.productPrice}>120.00$</Text>
          </View>
        </View>
      </View>

      {/* Thông tin khách hàng */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>
        <Text style={styles.textGray}>Dmitriy Divnov</Text>
        <Text style={styles.textGray}>Brest, Belarus</Text>
        <Text style={styles.textGray}>+375 (29) 749-19-24</Text>
      </View>

      {/* Chi tiết thanh toán */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chi tiết thanh toán</Text>
        <View style={styles.paymentRow}>
          <Text style={styles.textGray}>Tổng tiền hàng</Text>
          <Text style={styles.textGray}>120.00$</Text>
        </View>
        <View style={styles.paymentRow}>
          <Text style={styles.textGray}>Voucher</Text>
          <Text style={styles.voucher}>-3.00$</Text>
        </View>
        <View style={styles.paymentRow}>
          <Text style={styles.textGray}>Vận chuyển</Text>
          <Text style={styles.textGray}>2.00$</Text>
        </View>
        <View style={styles.paymentRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>119.00$</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
    borderTopWidth: 8,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderTopWidth: 8,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  textGray: {
    color: '#888',
    marginBottom: 4,
  },
  statusContainer: {
    backgroundColor: '#009688',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
  },
  productRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  productImage: {
    width: 100,
    height: 140,
    borderRadius: 8,
  },
  productInfo: {
    marginLeft: 12,
    flex: 1,
  },
  productName: {
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 4,
  },
  productPrice: {
    color: 'red',
    fontWeight: 'bold',
    marginTop: 4,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  voucher: {
    color: 'red',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

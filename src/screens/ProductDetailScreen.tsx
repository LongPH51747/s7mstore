import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  ProductDetail: { product: any };
  
};

type ProductDetailScreenRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;
type ProductDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ProductDetail'>;

interface Props {
  route: ProductDetailScreenRouteProp;
  navigation: ProductDetailScreenNavigationProp;
}

const COLORS = ['Black', 'White', 'Red'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL'];

const ProductDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { product } = route.params;
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedSize, setSelectedSize] = useState(SIZES[2]);
  const [quantity, setQuantity] = useState(1);
  const [descOpen, setDescOpen] = useState(true);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView>
        <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
        <View style={styles.content}>
          <View style={styles.row}>
            <Text style={styles.name}>{product.name}</Text>
            <TouchableOpacity>
              <Text style={styles.heart}>♡</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <Text style={styles.rating}>★★★★★ <Text style={styles.ratingValue}>5.0</Text></Text>
            <Text style={styles.oldPrice}>79.95$</Text>
            <Text style={styles.newPrice}>65.00$</Text>
          </View>
          {/* Color */}
          <Text style={styles.label}>Color</Text>
          <View style={styles.selectBox}>
            <Text>{selectedColor}</Text>
          </View>
          {/* Size */}
          <Text style={styles.label}>Size</Text>
          <View style={styles.sizeRow}>
            {SIZES.map(size => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.sizeBox,
                  selectedSize === size && styles.sizeBoxSelected
                ]}
                onPress={() => setSelectedSize(size)}
              >
                <Text style={selectedSize === size ? styles.sizeTextSelected : styles.sizeText}>{size}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.sizeBox}><Text>More...</Text></TouchableOpacity>
          </View>
          <Text style={styles.sizeGuide}>Size guide</Text>
          {/* Quantity & Add to cart */}
          <View style={styles.cartRow}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(q => Math.max(1, q - 1))}>
              <Text style={styles.qtyBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.qty}>{quantity}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(q => q + 1)}>
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addCartBtn}>
              <Text style={styles.addCartText}>Add to cart</Text>
            </TouchableOpacity>
          </View>
          {/* Description */}
          <TouchableOpacity style={styles.descHeader} onPress={() => setDescOpen(o => !o)}>
            <Text style={styles.label}>Description</Text>
            <Text>{descOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {descOpen && (
            <Text style={styles.desc}>
              A shirt is a profitable investment in the wardrobe. And here's why:
              {"\n"}- shirts perfectly match with any bottom
              {"\n"}- shirts made of natural fabrics are suitable for any time of the year.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  image: { width: '100%', height: 320, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  content: { padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  name: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  heart: { fontSize: 26, color: '#e74c3c', marginLeft: 8 },
  rating: { color: '#222', fontSize: 15 },
  ratingValue: { color: '#222', fontWeight: 'bold' },
  oldPrice: { color: '#aaa', textDecorationLine: 'line-through', marginLeft: 8 },
  newPrice: { color: '#e74c3c', fontWeight: 'bold', marginLeft: 8 },
  label: { fontWeight: 'bold', marginTop: 12, marginBottom: 4 },
  selectBox: { borderWidth: 1, borderColor: '#eee', borderRadius: 6, padding: 8, marginBottom: 8, width: 120 },
  sizeRow: { flexDirection: 'row', marginBottom: 4, marginTop: 4 },
  sizeBox: { borderWidth: 1, borderColor: '#eee', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8, backgroundColor: '#f7f7f7' },
  sizeBoxSelected: { backgroundColor: '#222' },
  sizeText: { color: '#222' },
  sizeTextSelected: { color: '#fff', fontWeight: 'bold' },
  sizeGuide: { color: '#aaa', fontSize: 12, marginBottom: 12 },
  cartRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  qtyBtn: { borderWidth: 1, borderColor: '#eee', borderRadius: 6, padding: 8, marginRight: 4 },
  qtyBtnText: { fontSize: 18, fontWeight: 'bold' },
  qty: { fontSize: 16, marginHorizontal: 8, minWidth: 24, textAlign: 'center' },
  addCartBtn: { backgroundColor: '#111', borderRadius: 6, paddingVertical: 12, paddingHorizontal: 24, marginLeft: 12 },
  addCartText: { color: '#fff', fontWeight: 'bold' },
  descHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  desc: { color: '#222', marginTop: 4, fontSize: 14 },
});

export default ProductDetailScreen;

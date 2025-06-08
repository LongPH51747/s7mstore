import React, { useEffect, useState } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';

import { 
  SafeAreaView, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Text, 
  StyleSheet, 
  ActivityIndicator
} from "react-native";
// Main component
const CartScreen = (props) => {
  const url = "https://0185-2405-4802-21f-72d0-c451-84e5-9b5b-457a.ngrok-free.app/api/cart/getByUserId/"
  const [idUser, setIdUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartItem, setCartItem] = useState(null);
  useEffect(()=>{
    const saveUser = async()=>{
      await AsyncStorage.setItem('idUser', '68386c1824d040c9bd6bd868');
    }
    saveUser();
  },[])

  useEffect(() => {
    const getUser = async () => {
      try {
        const storedIdUser = await AsyncStorage.getItem('idUser');
        if (storedIdUser !== null) {
          setIdUser("68386c1824d040c9bd6bd868");
        }
      } catch (error) {
        console.error('Lỗi khi lấy idUser:', error);
      }
    };
    getUser()
  }, []);

  useEffect(()=>{
    const getCart = async()=>{
      if(idUser){
        const rs = await fetch(url + idUser);
        const data = await rs.json();
        await setCart(data);
        console.log(data.cartItem);
      }else{
        // console.log("Loi getCart");
      }
    }
    getCart();
  }, [idUser]);

  useEffect(()=>{
    const listCart = async ()=>{
      console.log("TEST CARTITEM " + JSON.stringify(cart.cartItem))
      if(cart){
        const data = cart.cartItem;
        setCartItem(data);
      }else{
        console.log("Cart null");
      }
    }
    listCart();
  },[cart])

  useEffect(()=>{
    if(cartItem){
      console.log("so phan tu trong mang " + cartItem.length);
    }else{
      console.log("Loi k lay duoc cartitem")
    }
  },[cartItem])

  const renderDivider = () => (
    <View style={styles.divider} />
  );
  // Function to render a product item
  const renderProductItem = (product) => (
    <View style={styles.productContainer}>
      <Image source={{ uri: product.image }} style={styles.productImage} />
      <View style={styles.productDetails}>
        <Text style={styles.productName}>{product.name_product}</Text>
        <View style={styles.productInfo}>
          <Text style={styles.productColorLabel}>{"Color:"} {product.color}</Text>
          <Text style={styles.productSizeLabel}>{"Size:"}</Text>
          <Text style={styles.productSize}>{product.size}</Text>
        </View>
        <View style={styles.productPriceContainer}>
          <Text style={styles.discountedPrice}>{product.price}</Text>
        </View>
        <View style={styles.quantityContainer}>
          <TouchableOpacity onPress={() => alert('Decrease Quantity')}>
            <Image source={require('../images/minus.png')} style={styles.quantityIcon} />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{product.quantity}</Text>
          <TouchableOpacity onPress={() => alert('Increase Quantity')}>
            <Image source={require('../images/plus.png')} style={styles.quantityIcon} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
  return (
    !cartItem?(
      <View style={{flex:1, backgroundColor:"#FFFFFF", alignItems:"center", justifyContent:"center", flexDirection:"column", color:"black"}}>
        <ActivityIndicator size={"large"} color={'black'}/>
        <Text>Đang tải dữ liệu...</Text>
      </View>
      
    ):(
      <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => alert('Back Pressed!')}>
            <Image 
              source={{ uri: "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/3d932128-0328-4607-bacf-7a9ced0de013" }} 
              style={styles.headerIcon} 
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{"Cart"}</Text>
          <TouchableOpacity onPress={() => alert('More Options Pressed!')}>
            <Image 
              source={{ uri: "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/c5d652d4-87eb-4bb4-8eaf-62b26c7c040b" }} 
              style={styles.headerIcon}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.cartTextContainer}>
          <Text style={styles.cartText}>
            {"You have"} {cartItem.length} {"products in your Cart"}
          </Text>
        </View>
        {cartItem.map(product => renderProductItem(product))}
        {renderDivider()}
        
      </ScrollView>
      <View style={styles.fixedCheckoutContainer}>
        <View style={styles.summaryContainer}>
          <SummaryItem label="Total Price" value="133.95$" />
          <SummaryItem label="Discount" value="14.95$" />
          <SummaryItem label="Estimated delivery fees" value="Free" />
        </View>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>{"Total:"}</Text>
          <Text style={styles.totalValue}>{"119.00$"}</Text>
        </View>
          <TouchableOpacity style={styles.checkoutButton} onPress={() => alert('Checkout Pressed!')}>
            <Image 
              source={{ uri: "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/e4f67212-d4f1-4513-bc97-88e16a24676d" }} 
              style={styles.checkoutIcon} 
            />
            <Text style={styles.checkoutText}>{"Checkout"}</Text>
          </TouchableOpacity>
        </View>
    </SafeAreaView>
    )   
  );
};
// Summary item component
const SummaryItem = ({ label, value }) => (
  <View style={styles.summaryItem}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);
// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    paddingBottom: 4,
    paddingHorizontal: 12,
  },
  headerIcon: {
    width: 24,
    height: 24,
    marginVertical: 12,
    marginLeft: 12,
    marginRight: 20,
  },
  headerTitle: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 18,
    fontWeight: "bold",
    color: "#272728",
  },
  cartTextContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  cartText: {
    color: "#000000",
    fontSize: 16,
  },
  divider: {
    height: 2,
    backgroundColor: "#F2F3F4",
    marginBottom: 32,
  },
  productContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F6F8F9",
    paddingVertical: 8,
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  productImage: {
    width: 98,
    height: 127,
    marginRight: 16,
  },
  productDetails: {
    flex: 1,
    alignItems: "flex-start",
  },
  productName: {
    color: "#202325",
    fontSize: 14,
    marginRight: 36,
    flex: 1,
  },
  productInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  productColorLabel: {
    color: "#000000",
    fontSize: 14,
    marginRight: 16,
  },
  colorImage: {
    width: 20,
    height: 20,
    marginRight: 24,
  },
  productSizeLabel: {
    color: "#000000",
    fontSize: 14,
    marginRight: 20,
  },
  productSize: {
    color: "#000000",
    fontSize: 14,
  },
  productPriceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  originalPrice: {
    color: "#979C9E",
    fontSize: 14,
    fontWeight: "bold",
    marginRight: 46,
  },
  discountedPrice: {
    color: "#D3180C",
    fontSize: 16,
    fontWeight: "bold",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#E3E4E5",
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 6,
    marginTop: 13,
  },
  quantityIcon: {
    borderRadius: 8,
    width: 15,
    height: 15,
    marginHorizontal: 16,
  },
  quantityText: {
    color: "#090A0A",
    fontSize: 14,
    fontWeight: "bold",
  },
  summaryContainer: {
    marginBottom: 61,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    marginHorizontal: 24,
  },
  summaryLabel: {
    color: "#979C9E",
    fontSize: 16,
    marginRight: 4,
    flex: 1,
  },
  summaryValue: {
    color: "#979C9E",
    fontSize: 16,
    textAlign: "right",
    flex: 1,
  },
  totalContainer: {
    backgroundColor: "#F2F3F4",
    paddingVertical: 8,
    marginBottom: 16,
    marginHorizontal: 24,
  },
  totalLabel: {
    color: "#090A0A",
    fontSize: 20,
    fontWeight: "bold",
    marginRight: 4,
    flex: 1,
  },
  totalValue: {
    color: "#090A0A",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "right",
    flex: 1,
  },
  checkoutButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#090A0A",
    borderRadius: 8,
    paddingVertical: 14,
    marginHorizontal: 25,
  },

  fixedCheckoutContainer: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: '#FFFFFF',
  padding: 10,
  borderTopWidth: 1,
  borderTopColor: '#E3E4E5',
},
  checkoutIcon: {
    borderRadius: 8,
    width: 20,
    height: 20,
    marginRight: 8,
  },
  checkoutText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
export default CartScreen;
import React from "react";
import { 
  SafeAreaView, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Text, 
  StyleSheet 
} from "react-native";
// Main component
const CartScreen = (props) => {
  // Function to render the cart text
  const renderCartText = () => (
    <Text style={styles.cartText}>
      {"You have 2 products in your Cart"}
    </Text>
  );
  // Function to render a horizontal divider
  const renderDivider = () => (
    <View style={styles.divider} />
  );
  // Function to render a product item
  const renderProductItem = (product) => (
    <View style={styles.productContainer}>
      <Image source={{ uri: product.image }} style={styles.productImage} />
      <View style={styles.productDetails}>
        <Text style={styles.productName}>{product.name}</Text>
        <View style={styles.productInfo}>
          <Text style={styles.productColorLabel}>{"Color:"}</Text>
          <Image source={{ uri: product.colorImage }} style={styles.colorImage} />
          <Text style={styles.productSizeLabel}>{"Size:"}</Text>
          <Text style={styles.productSize}>{product.size}</Text>
        </View>
        <View style={styles.productPriceContainer}>
          <Text style={styles.originalPrice}>{product.originalPrice}</Text>
          <Text style={styles.discountedPrice}>{product.discountedPrice}</Text>
        </View>
        <View style={styles.quantityContainer}>
          <TouchableOpacity onPress={() => alert('Decrease Quantity')}>
            <Image source={{ uri: product.decreaseIcon }} style={styles.quantityIcon} />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{"1"}</Text>
          <TouchableOpacity onPress={() => alert('Increase Quantity')}>
            <Image source={{ uri: product.increaseIcon }} style={styles.quantityIcon} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
  // Sample product data
  const products = [
    {
      image: "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/78be60e4-0d8a-4fc2-adc1-0b19eaf81f1d",
      name: "CLAUDETTE CORSET SHIRT DRESS IN WHITE",
      colorImage: "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/db9bdf81-0d10-4112-9136-7662ff35f074",
      size: "XS",
      originalPrice: "79.95$",
      discountedPrice: "65.00$",
      decreaseIcon: "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/2857c7c7-81b4-4dd3-89e2-841fdeeef453",
      increaseIcon: "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/0e601038-4a3f-4a68-8aca-f0bbf97645ac",
    },
    {
      image: "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/5e26933e-06c7-49f6-858e-0d1eeb3d607c",
      name: "HIGH WAISTED TAILORED SUITING SHORTS IN OXY FIRE",
      colorImage: "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/79c327bd-09ac-4cce-a4f3-e0284d6973e8",
      size: "M",
      originalPrice: "79.95$",
      discountedPrice: "65.00$",
      decreaseIcon: "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/f9ea6de4-d18f-4646-a480-4fac84bd8370",
      increaseIcon: "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/593c653f-79bc-41ed-84a6-e51cd103b40c",
    }
  ];
  return (
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
          {renderCartText()}
        </View>
        {products.map(product => renderProductItem(product))}
        {renderDivider()}
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
      </ScrollView>
    </SafeAreaView>
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
    width: 20,
    height: 20,
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
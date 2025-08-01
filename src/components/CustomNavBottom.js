import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import React, { useState } from 'react'; // Import useState
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native'; // Import useNavigation hook

const CustomNavBottom = () => {
  // 1. Định nghĩa state cho activeTab
  const [activeTab, setActiveTab] = useState('Home'); // Mặc định là 'Home'

  // 2. Lấy navigation object bằng hook useNavigation
  const navigation = useNavigation();

  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity
        onPress={() => {
          setActiveTab('Home');
          navigation.navigate('HomeScreen');
        }}>
        <Icon name={activeTab === 'Home' ? 'home' : 'home-outline'} size={24} color="#000" />
        {/* Tùy chọn: Thêm Text cho nhãn */}
        {/* <Text style={{ color: activeTab === 'Home' ? '#007bff' : '#000' }}>Home</Text> */}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          setActiveTab('Search');
          navigation.navigate('SearchScreen');
        }}>
        <Icon name={activeTab === 'Search' ? 'search' : 'search-outline'} size={24} color="#000" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          setActiveTab('Cart');
          navigation.navigate('CartScreen');
        }}>
        <Icon name={activeTab === 'Cart' ? 'cart' : 'cart-outline'} size={24} color="#000" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          setActiveTab('Favorites');
          // Note: Favorites screen doesn't exist yet, you might want to create it or remove this
          // navigation.navigate('FavoritesScreen');
          console.log('Favorites screen not implemented yet');
        }}>
        <Icon name={activeTab === 'Favorites' ? 'heart' : 'heart-outline'} size={24} color="#000" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          setActiveTab('Profile');
          navigation.navigate('ProfileScreen');
        }}>
        <Icon name={activeTab === 'Profile' ? 'person' : 'person-outline'} size={24} color="#000" />
      </TouchableOpacity>
    </View>
  );
};

export default CustomNavBottom;

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    // Thêm các thuộc tính position nếu bạn muốn nó luôn ở cuối màn hình
    // position: 'absolute',
    // bottom: 0,
    // left: 0,
    // right: 0,
  },
  // heartIcon: { // thuộc tính này đang không được sử dụng
  //   fontSize: 20,
  // },
});
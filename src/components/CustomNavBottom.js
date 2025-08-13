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
    backgroundColor: '#fff',
   
  },
 
});
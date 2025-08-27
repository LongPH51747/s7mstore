import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import React, { useState } from 'react'; // Import useState
import { useNavigation } from '@react-navigation/native'; // Import useNavigation hook
import Feather from 'react-native-vector-icons/Feather';
const CustomNavBottom = () => {
  // 1. Định nghĩa state cho activeTab
  const [activeTab, setActiveTab] = useState('Home'); // Mặc định là 'Home'

  // 2. Lấy navigation object bằng hook useNavigation
  const navigation = useNavigation();

  return (
    <View style={styles.bottomNav}>
     <TouchableOpacity onPress={() => {
         setActiveTab('Home');
         navigation.navigate('HomeScreen');
       }}>
         <Feather name="home" size={24} color={activeTab === 'Home' ? '#000' : 'gray'} />
       </TouchableOpacity>
     
       <TouchableOpacity onPress={() => {
         setActiveTab('Cart');
         navigation.navigate('CartScreen');
       }}>
         <Feather name="shopping-cart" size={24} color={activeTab === 'Cart' ? '#000' : 'gray'} />
       </TouchableOpacity>
       
       <TouchableOpacity onPress={() => {
         setActiveTab('Bell');
         navigation.navigate('NotificationScreen');
       }}>
         <Feather name="bell" size={24} color={activeTab === 'Bell' ? '#000' : 'gray'} />
       </TouchableOpacity>
       
       <TouchableOpacity onPress={() => {
         setActiveTab('Profile');
         navigation.navigate('ProfileScreen');
       }}>
         <Feather name="user" size={24} color={activeTab === 'Profile' ? '#000' : 'gray'} />
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
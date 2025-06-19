import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const CustomNavBottom = () => {
  return (
    <View style={styles.bottomNav}>
            <TouchableOpacity onPress={() => {
              setActiveTab('Home');
              navigation.navigate('Home');
            }}>
              <Icon name={activeTab === 'Home' ? 'home' : 'home-outline'} size={24} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              setActiveTab('Search');
              navigation.navigate('Search');
            }}>
              <Icon name={activeTab === 'Search' ? 'search' : 'search-outline'} size={24} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              setActiveTab('Cart');
              navigation.navigate('Cart');
            }}>
              <Icon name={activeTab === 'Cart' ? 'cart' : 'cart-outline'} size={24} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              setActiveTab('Favorites');
              navigation.navigate('Favorites');
            }}>
              <Icon name={activeTab === 'Favorites' ? 'heart' : 'heart-outline'} size={24} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              setActiveTab('Profile');
              navigation.navigate('Profile');
            }}>
              <Icon name={activeTab === 'Profile' ? 'person' : 'person-outline'} size={24} color="#000" />
            </TouchableOpacity>
          </View>
  )
}

export default CustomNavBottom

const styles = StyleSheet.create({
    bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  heartIcon: {
    fontSize: 20,
  },
})
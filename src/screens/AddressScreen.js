import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT } from '../config/api'; // Import API config

const AddressScreen = () => {
  const navigation = useNavigation();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      setError(null);
      const userInfoString = await AsyncStorage.getItem('userInfo');
      const userInfo = JSON.parse(userInfoString);
      
      if (!userInfo || !userInfo._id) {
        throw new Error('User information not found');
      }

      const response = await fetch(
        API_ENDPOINTS.ADDRESS.GET_BY_USER_ID(userInfo._id)
      );

      if (!response.ok) {
        throw new Error('Failed to fetch addresses');
      }

      const data = await response.json();
      setAddresses(data);
    } catch (err) {
      setError(err.message);
      Alert.alert('Error', 'Failed to load addresses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();

    // Add focus listener to refresh addresses when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAddresses();
    });

    // Cleanup the listener when component unmounts
    return unsubscribe;
  }, [navigation]);

  const handleDeleteAddress = async (addressId) => {
    Alert.alert(
      'Xóa địa chỉ',
      'Bạn có chắc chắn muốn xóa địa chỉ này?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                API_ENDPOINTS.ADDRESS.DELETE(addressId),
                {
                  method: 'DELETE',
                }
              );

              if (!response.ok) {
                throw new Error('Failed to delete address');
              }

              // Refresh addresses after deletion
              fetchAddresses();
              Alert.alert('Thành công', 'Địa chỉ đã được xóa');
            } catch (err) {
              Alert.alert('Lỗi', 'Không thể xóa địa chỉ. Vui lòng thử lại.');
            }
          },
        },
      ]
    );
  };

  const handleSelectAddress = (address) => {
    navigation.navigate('Checkout', { selectedAddress: address });
  };

  const renderAddressItem = ({ item }) => (
    <TouchableOpacity
      style={styles.addressItem}
      onPress={() => handleSelectAddress(item)}
    >
      <View style={styles.addressContent}>
        <View style={styles.addressHeader}>
          <Text style={styles.name}>{item.fullName}</Text>
          <Text style={styles.phone}> | {item.phone_number}</Text>
          {item.is_default && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>Default</Text>
            </View>
          )}
        </View>
        <Text style={styles.addressDetail}>{item.addressDetail}</Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('UpdateAddress', { address: item })}
        >
          <Image 
            source={require('../assets/edit.png')} 
            style={styles.actionIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteAddress(item._id)}
        >
          <Image 
            source={require('../assets/delete.png')} 
            style={styles.actionIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAddresses}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Image 
            source={require('../assets/back.png')} 
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Addresses</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddAddress')}
        >
          <Image 
            source={require('../assets/addlocation.png')} 
            style={styles.addIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={addresses}
        renderItem={renderAddressItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No addresses found</Text>
            <TouchableOpacity
              style={styles.addAddressButton}
              onPress={() => navigation.navigate('AddAddress')}
            >
              <Text style={styles.addAddressText}>Add New Address</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E4E5',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    padding: 8,
  },
  addIcon: {
    width: 24,
    height: 24,
  },
  listContainer: {
    padding: 16,
  },
  addressItem: {
    flexDirection: 'row',
    backgroundColor: '#F6F8F9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  addressContent: {
    flex: 1,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  phone: {
    fontSize: 16,
    color: '#666',
  },
  addressDetail: {
    fontSize: 14,
    color: '#333',
  },
  defaultBadge: {
    backgroundColor: '#E3E4E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  actionIcon: {
    width: 20,
    height: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  addAddressButton: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  addAddressText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default AddressScreen; 
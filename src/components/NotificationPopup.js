import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useNotification } from '../contexts/NotificationContext';

const { width } = Dimensions.get('window');

const NotificationPopup = () => {
  const { showPopup, currentNotification, hidePopup } = useNotification();

  if (!showPopup || !currentNotification) {
    return null;
  }

  return (
    <Modal
      transparent={true}
      visible={showPopup}
      animationType="fade"
      onRequestClose={hidePopup}
    >
      <View style={styles.overlay}>
        <View style={styles.popupContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{currentNotification.title}</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Product Image */}
            <View style={styles.imageContainer}>
              {currentNotification.productImage ? (
                <Image
                  source={{ uri: currentNotification.productImage }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.placeholderImage}>
                  <Feather name="package" size={24} color="#007bff" />
                </View>
              )}
            </View>

            {/* Message */}
            <View style={styles.messageContainer}>
              <Text style={styles.productName}>
                {currentNotification.productName}
              </Text>
              <Text style={styles.message}>
                {currentNotification.message}
              </Text>
              {currentNotification.productPrice > 0 && (
                <Text style={styles.price}>
                  {currentNotification.productPrice.toLocaleString('vi-VN')} ₫
                </Text>
              )}
              <Text style={styles.timestamp}>
                {currentNotification.timestamp}
              </Text>
            </View>

            {/* OK Button */}
            <TouchableOpacity 
              style={styles.okButton}
              onPress={hidePopup}
            >
              <Text style={styles.okButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  popupContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  header: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  imageContainer: {
    marginRight: 12,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  placeholderImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageContainer: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007bff',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  okButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  okButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default NotificationPopup; 
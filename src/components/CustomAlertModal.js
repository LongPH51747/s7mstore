import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';

const CustomAlertModal = ({ visible, title, message, onClose, onConfirm, showConfirmButton = false, type = 'default' }) => {
    let confirmButtonColor = '#007bff'; // Màu mặc định

    switch (type) {
        case 'success':
            confirmButtonColor = '#28a745'; // Màu xanh lá cây cho thành công
            break;
        case 'error':
            confirmButtonColor = '#dc3545'; // Màu đỏ cho lỗi
            break;
        case 'warning':
            confirmButtonColor = '#ffc107'; // Màu vàng cho cảnh báo
            break;
        default:
            confirmButtonColor = '#007bff'; // Màu xanh dương mặc định
    }

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>{title}</Text>
                    <Text style={styles.modalMessage}>{message}</Text>
                    
                    <View style={styles.buttonContainer}>
                        {showConfirmButton && (
                            <TouchableOpacity
                                style={[styles.button, styles.buttonCancel]}
                                onPress={onClose}
                            >
                                <Text style={styles.textStyleCancel}>Hủy</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: confirmButtonColor }]}
                            onPress={onConfirm || onClose}
                        >
                            <Text style={styles.textStyleConfirm}>{showConfirmButton ? 'Ok' : 'OK'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '80%',
    },
    modalTitle: {
        marginBottom: 15,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    modalMessage: {
        marginBottom: 20,
        textAlign: 'center',
        fontSize: 16,
        color: '#666',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    button: {
        borderRadius: 10,
        padding: 10,
        elevation: 2,
        flex: 1,
        marginHorizontal: 5,
       
    },
    buttonCancel: {
        backgroundColor: '#E5E7EB',
    },
    textStyleConfirm: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    textStyleCancel: {
        color: '#333',
        fontWeight: 'bold',
        textAlign: 'center',
    },
});

export default CustomAlertModal;
// components/CustomAlert.js
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function CustomAlert({ visible, title, message, buttons = [], onClose }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonRow}>
            {buttons.map((btn, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.button, btn.style === 'cancel' ? styles.cancelBtn : styles.confirmBtn]}
                onPress={btn.onPress}
              >
                <Text style={styles.buttonText}>{btn.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  alertBox: { width: 300, backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center' },
  title: { fontSize: 18, fontFamily: 'Nunito-Black', marginBottom: 10 },
  message: { fontSize: 14, fontFamily: 'Nunito-Medium', textAlign: 'center', marginBottom: 20 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  button: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  cancelBtn: { backgroundColor: '#ccc' },
  confirmBtn: { backgroundColor: '#00BFA6' },
  buttonText: { color: '#fff', fontFamily: 'Nunito-Medium' }
});

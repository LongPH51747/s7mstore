import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import moment from 'moment'; // Đảm bảo đã cài đặt momentjs

const UserChatScreen = () => {
    const { 
        isSocketReady,
        messages,
        isLoadingMessages,
        messagesError,
        sendUserMessage, // Hàm gửi tin nhắn từ SocketContext
        currentUserId    // ID của người dùng hiện tại (từ SocketContext)
    } = useSocket();

    const { user } = useAuth(); // Lấy user từ AuthContext để so sánh sender ID

    const [newMessage, setNewMessage] = useState('');
    const flatListRef = useRef(null);

    // Tự động cuộn xuống cuối danh sách tin nhắn khi có tin nhắn mới
    useEffect(() => {
        if (flatListRef.current && messages.length > 0) {
            // Sử dụng setTimeout để đảm bảo FlatList đã render xong các tin nhắn mới
            setTimeout(() => {
                flatListRef.current.scrollToEnd({ animated: true });
            }, 100); 
        }
    }, [messages]);

    const handleSend = () => {
        if (!newMessage.trim()) return;
        sendUserMessage(newMessage); // Gọi hàm gửi tin nhắn từ SocketContext
        setNewMessage('');
    };

    // Hiển thị trạng thái loading hoặc lỗi
    if (!isSocketReady) {
        return (
            <SafeAreaView style={styles.statusContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.statusText}>Đang kết nối đến chat...</Text>
            </SafeAreaView>
        );
    }

    if (isLoadingMessages) {
        return (
            <SafeAreaView style={styles.statusContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.statusText}>Đang tải lịch sử trò chuyện...</Text>
            </SafeAreaView>
        );
    }

    if (messagesError) {
        return (
            <SafeAreaView style={styles.statusContainer}>
                <Text style={styles.errorText}>Lỗi: {messagesError.message || "Không thể tải lịch sử trò chuyện."}</Text>
            </SafeAreaView>
        );
    }

    // Render từng tin nhắn
    const renderMessage = ({ item: msg }) => {
        const isMyMessage = msg.sender?._id === currentUserId;
        return (
            <View style={[
                styles.messageBubble, 
                isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
            ]}>
                <Text style={[
                    styles.messageContent,
                    isMyMessage ? styles.myMessageContent : styles.otherMessageContent
                ]}>{msg.content}</Text>
                <Text style={[
                    styles.messageTime, 
                    isMyMessage ? styles.myMessageTime : styles.otherMessageTime
                ]}>
                    {moment(msg.createdAt).format('HH:mm DD/MM')}
                </Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingViewgit style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                // Tùy chỉnh keyboardVerticalOffset nếu có header hoặc footer cố định
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} 
            >
               
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Hỗ trợ Trực tuyến</Text>
                   
                </View>

               
                <FlatList
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item, index) => item._id ? item._id.toString() : index.toString()}
                    contentContainerStyle={styles.messagesContainer}
                    ref={flatListRef}
                    // onContentSizeChange và onLayout để tự động cuộn khi nội dung thay đổi/layout thay đổi
                    onContentSizeChange={() => flatListRef.current.scrollToEnd({ animated: true })}
                    onLayout={() => flatListRef.current.scrollToEnd({ animated: true })}
                    ListEmptyComponent={() => (
                        <View style={styles.noMessagesContainer}>
                            <Text style={styles.noMessagesText}>Chưa có tin nhắn nào. Bắt đầu cuộc trò chuyện!</Text>
                        </View>
                    )}
                />

              
                <View style={styles.inputForm}>
                    <TextInput
                        style={styles.textInput}
                        value={newMessage}
                        onChangeText={setNewMessage}
                        placeholder="Nhập tin nhắn của bạn..."
                        placeholderTextColor="#888"
                        editable={isSocketReady}
                    />
                    <TouchableOpacity 
                        style={[
                            styles.sendButton, 
                            (!isSocketReady || !newMessage.trim()) && styles.sendButtonDisabled
                        ]}
                        onPress={handleSend}
                        disabled={!isSocketReady || !newMessage.trim()}
                    >
                        <Text style={styles.sendButtonText}>Gửi</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </KeyboardAvoidingView>
    );
};

// Định nghĩa Styles cho React Native
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f8f8f8', // Nền tổng thể
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    statusContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
    },
    statusText: {
        marginTop: 10,
        fontSize: 16,
        color: '#4a5568',
    },
    errorText: {
        fontSize: 16,
        color: '#ef4444',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    header: {
        paddingVertical: 18,
        paddingHorizontal: 20,
        backgroundColor: '#f0f5fa', // Light blue-gray
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2c5282', // Darker blue
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    messagesContainer: {
        paddingVertical: 15,
        paddingHorizontal: 10,
        backgroundColor: '#f8f8f8',
        flexGrow: 1, // Allow content to grow and fill available space
    },
    noMessagesContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noMessagesText: {
        textAlign: 'center',
        color: '#a0aec0',
        fontSize: 16,
        padding: 20,
    },
    messageBubble: {
        maxWidth: '75%', // Limit bubble width
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20,
        marginBottom: 8,
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        // Elevation for Android
        elevation: 3, 
    },
    myMessageBubble: {
        backgroundColor: '#3b82f6', // Blue for user's messages
        alignSelf: 'flex-end', // Align user's messages to the right
        borderBottomRightRadius: 5, // Modern bubble style
    },
    otherMessageBubble: {
        backgroundColor: '#e2e8f0', // Light gray for admin's messages
        alignSelf: 'flex-start', // Align admin's messages to the left
        borderBottomLeftRadius: 5, // Modern bubble style
    },
    messageContent: {
        fontSize: 16,
        lineHeight: 22,
    },
    myMessageContent: {
        color: '#ffffff',
    },
    otherMessageContent: {
        color: '#2d3748',
    },
    messageTime: {
        fontSize: 12,
        marginTop: 5,
        textAlign: 'right',
    },
    myMessageTime: {
        color: 'rgba(255, 255, 255, 0.7)', // Lighter time for user's messages
    },
    otherMessageTime: {
        color: '#718096', // Darker time for admin's messages
    },
    inputForm: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    textInput: {
        flex: 1,
        height: 45,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 25, // Rounded corners
        fontSize: 16,
        color: '#4a5568',
        backgroundColor: '#f9fafb',
    },
    sendButton: {
        marginLeft: 10,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        backgroundColor: '#3b82f6', // Blue gradient (single color for simplicity in RN)
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4, // For Android shadow
    },
    sendButtonDisabled: {
        backgroundColor: '#93c5fd', // Lighter blue when disabled
    },
    sendButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default UserChatScreen;

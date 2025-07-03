import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    Image
} from 'react-native';
import { useSocket } from '../contexts/SocketContext';
import moment from 'moment';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native'; // Import hook tối ưu cho focus màn hình

const UserChatScreen = () => {
    // Lấy tất cả state và hàm cần thiết từ Context.
    // Cấu trúc này rất tốt vì UI và logic được tách biệt.
    const {
        isSocketReady,
        messages,
        isLoadingMessages,
        messagesError,
        sendUserMessage,
        currentUserId,
        loadingAuth,
        currentUserChatRoomId,
        markMessagesAsRead,
    } = useSocket();

    const [newMessage, setNewMessage] = useState('');
    const flatListRef = useRef(null);

    // TỐI ƯU HÓA 1: SỬ DỤNG useFocusEffect ĐỂ ĐÁNH DẤU ĐÃ ĐỌC
    // useFocusEffect chạy mỗi khi người dùng quay lại màn hình này,
    // đảm bảo logic chạy đúng lúc và hiệu quả hơn useEffect thông thường.
    useFocusEffect(
        useCallback(() => {
            if (isSocketReady && currentUserChatRoomId && currentUserId) {
                console.log(`UserChatScreen (Focused): Đánh dấu tin nhắn trong phòng ${currentUserChatRoomId} là đã đọc.`);
                markMessagesAsRead(currentUserChatRoomId);
            }
            // Không cần hàm dọn dẹp ở đây trừ khi bạn muốn làm gì đó khi màn hình mất focus
            return () => {};
        }, [isSocketReady, currentUserChatRoomId, currentUserId, markMessagesAsRead])
    );

    // Hiển thị lỗi một cách nhất quán
    useEffect(() => {
        if (messagesError && messagesError.message) {
           console.log("Lỗi chat: " ,messagesError.message)
        }
    }, [messagesError]);

    const handleSend = () => {
        if (!newMessage.trim()) return;
        sendUserMessage(newMessage);
        setNewMessage('');
    };
    
    // TỐI ƯU HÓA 2: SỬ DỤNG useCallback CHO HÀM RENDER ITEM
    // Giúp FlatList không phải render lại các item không cần thiết khi component cha re-render.
    // Cải thiện hiệu năng đáng kể với danh sách dài.
    const renderMessage = useCallback(({ item: msg }) => {
        const isMyMessage = msg.sender?._id === currentUserId;
        const messageStatus = msg.status; // 'sending', 'sent', 'failed'
        const displayTime = moment(msg.createdAt || msg.timestamp).format('HH:mm DD/MM');
        console.log('DEBUG NEW MESSAGE:', {
        isMyMessage: isMyMessage,
        senderId: msg.sender?._id,
        currentUserId: currentUserId,
        // Log thêm cả object sender để xem cấu trúc của nó
        senderObject: JSON.stringify(msg.sender), 
        messageContent: msg.content
    });
          const avatarUrl = msg.sender?.avatar || 'https://www.gravatar.com/avatar/?d=mp';

        return (
            <View style={[
            styles.messageRow,
            isMyMessage ? styles.myMessageRow : styles.otherMessageRow
        ]}>
            {/* Avatar của người gửi */}
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />

            {/* Bubble chứa nội dung tin nhắn */}
            <View style={[
                styles.messageBubble,
                isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
            ]}>
                <Text style={[
                    styles.messageContent,
                    isMyMessage ? styles.myMessageContent : styles.otherMessageContent
                ]}>{msg.content}</Text>
                <View style={styles.messageInfoRow}>
                    <Text style={[
                        styles.messageTime,
                        isMyMessage ? styles.myMessageTime : styles.otherMessageTime
                    ]}>
                        {displayTime}
                    </Text>
                    {isMyMessage && (
                        <View style={styles.messageStatusContainer}>
                            {messageStatus === 'sending' && <ActivityIndicator size="small" color={styles.myMessageTime.color} style={styles.statusIcon} />}
                            {messageStatus === 'sent' && <Icon name="checkmark-done-sharp" size={14} color={styles.myMessageTime.color} style={styles.statusIcon} />}
                            {messageStatus === 'failed' && <Icon name="warning-outline" size={14} color="#ef4444" style={styles.statusIcon} />}
                        </View>
                    )}
                </View>
            </View>
        </View>
        );
    }, [currentUserId]); // Dependency là currentUserId, vì isMyMessage phụ thuộc vào nó.

    // Các màn hình chờ (loading states)
    if (loadingAuth || !isSocketReady) {
        return (
            <SafeAreaView style={styles.statusContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.statusText}>
                    {loadingAuth ? 'Đang tải thông tin đăng nhập...' : 'Đang kết nối đến máy chủ chat...'}
                </Text>
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

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} 
            >
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Hỗ trợ Trực tuyến</Text>
                </View>

                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    // TỐI ƯU HÓA 3: CẢI THIỆN KEY EXTRACTOR
                    // Tránh dùng Math.random() vì nó sẽ tạo key mới mỗi lần render.
                    // Sử dụng index làm phương án cuối cùng.
                    keyExtractor={(item, index) => item._id?.toString() || item.tempMessageId?.toString() || `index-${index}`}
                    contentContainerStyle={styles.messagesContainer}
                    // TỐI ƯU HÓA 4: GIỮ LẠI LOGIC CUỘN TỐI ƯU
                    // onContentSizeChange là cách hiệu quả để xử lý cuộn khi có nội dung mới.
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
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
        </SafeAreaView>
    );
};

// Giữ nguyên phần styles của bạn
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f8f8f8' },
    keyboardAvoidingView: { flex: 1 },
    statusContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f8f8' },
    statusText: { marginTop: 10, fontSize: 16, color: '#4a5568' },
    errorText: { fontSize: 16, color: '#ef4444', textAlign: 'center', paddingHorizontal: 20 },
    header: { paddingVertical: 18, paddingHorizontal: 20, backgroundColor: '#f0f5fa', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c5282', textTransform: 'uppercase', letterSpacing: 0.5 },
    messagesContainer: { paddingVertical: 15, paddingHorizontal: 10, backgroundColor: '#f8f8f8', flexGrow: 1 },
    noMessagesContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    noMessagesText: { textAlign: 'center', color: '#a0aec0', fontSize: 16, padding: 20 },
    messageBubble: { maxWidth: '75%', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3 },
    myMessageBubble: { backgroundColor: '#3b82f6', alignSelf: 'flex-end', borderBottomRightRadius: 5 },
    otherMessageBubble: { backgroundColor: '#e2e8f0', alignSelf: 'flex-start', borderBottomLeftRadius: 5 },
    messageContent: { fontSize: 16, lineHeight: 22 },
    myMessageContent: { color: '#ffffff' },
    otherMessageContent: { color: '#2d3748' },
    messageInfoRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 5 },
    messageTime: { fontSize: 12 },
    myMessageTime: { color: 'rgba(255, 255, 255, 0.7)' },
    otherMessageTime: { color: '#718096' },
    messageStatusContainer: { marginLeft: 5 },
    statusIcon: {},
    inputForm: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
    textInput: { flex: 1, height: 45, paddingHorizontal: 15, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 25, fontSize: 16, color: '#4a5568', backgroundColor: '#f9fafb' },
    sendButton: { marginLeft: 10, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, backgroundColor: '#3b82f6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 4 },
    sendButtonDisabled: { backgroundColor: '#93c5fd' },
    sendButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
    messageRow: {
        flexDirection: 'row', // Sắp xếp avatar và bubble theo hàng ngang
        marginBottom: 15,
        alignItems: 'flex-end', // Căn chỉnh avatar và bubble theo đáy
    },
    // STYLE MỚI: Căn chỉnh cho hàng tin nhắn của người khác (bên trái)
    otherMessageRow: {
        justifyContent: 'flex-start', // Đẩy về bên trái
    },
    // STYLE MỚI: Căn chỉnh cho hàng tin nhắn của bạn (bên phải)
    myMessageRow: {
        justifyContent: 'flex-end', // Đẩy về bên phải
        flexDirection: 'row-reverse', // Đảo ngược thứ tự: [Bubble] [Avatar]
    },
    // STYLE MỚI: Style cho avatar hình tròn
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20, // Nửa chiều rộng/cao để tạo hình tròn
        backgroundColor: '#ccc', // Màu nền phòng khi ảnh lỗi
    },

    // STYLE ĐÃ SỬA ĐỔI: messageBubble
    messageBubble: {
        maxWidth: '75%',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20,
        // Bỏ alignSelf vì đã có messageRow xử lý
        // Thêm margin để tạo khoảng cách với avatar
        marginHorizontal: 10, 
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    myMessageBubble: {
        backgroundColor: '#3b82f6',
        borderBottomRightRadius: 5,
    },
    otherMessageBubble: {
        backgroundColor: '#e2e8f0',
        borderBottomLeftRadius: 5,
    },
});

export default UserChatScreen;
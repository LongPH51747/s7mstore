import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext'; // Import useAuth để lấy thông tin xác thực
import { Alert } from 'react-native'; // Dùng Alert của React Native

const SocketContext = createContext(null);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const { isAuthenticated, token: accessToken, logout, user } = useAuth(); // Lấy token từ AuthContext và đổi tên thành accessToken

    const socketRef = useRef(null);
    const [isSocketReady, setIsSocketReady] = useState(false);
    const isConnecting = useRef(false);

    // States để quản lý dữ liệu chat của User
    const [messages, setMessages] = useState([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [messagesError, setMessagesError] = useState(null);
    
    // Ref để lưu trữ giá trị hiện tại của user, quan trọng cho event listeners
    const latestUser = useRef(user);

    // Cập nhật ref mỗi khi user state thay đổi
    useEffect(() => {
        latestUser.current = user;
    }, [user]);

    // --- useEffect 1: Quản lý vòng đời kết nối Socket.IO ---
    useEffect(() => {
        console.log('>>> SocketContext useEffect 1 (Connection) Triggered (RN)');
        console.log('Dependencies at trigger:', { isAuthenticated, accessToken: accessToken ? 'Exists' : 'Missing', userId: user?._id });
        console.log('Current state:', {
            socketRefCurrent: socketRef.current ? 'Exists' : 'Null',
            isSocketReady,
            isConnectingCurrent: isConnecting.current
        });
        console.log('====================================================');

        // Chỉ kết nối nếu đã xác thực, có token, có user._id và chưa có socket hoặc đang không trong quá trình kết nối
        if (isAuthenticated && accessToken && user?._id && !socketRef.current && !isConnecting.current) {
            isConnecting.current = true;
            console.log('Socket: SET isConnecting.current = true (RN)');
            console.log('Socket: Attempting to initialize and connect new Socket.IO instance (RN)...');

            // Điều chỉnh URL backend cho React Native.
            // Nếu bạn dùng react-native-config, bạn có thể thay bằng `Config.API_BASE_URL`
            // Nếu không, hãy đảm bảo `process.env.REACT_APP_API_BASE_URL` được thiết lập đúng cách cho RN.
            // Hoặc hardcode tạm thời: 'http://192.168.2.104:3000'
            const API_URL = 'http://192.168.2.104:5000'; // Đã thay đổi port thành 5000
            console.log('Socket: Connecting to API_URL:', API_URL);

            const newSocket = io(API_URL, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000,
                autoConnect: false // Quan trọng: autoConnect false để connect thủ công sau khi setup listeners
            });

            socketRef.current = newSocket; 
            console.log('Socket: SET socketRef.current = newSocket (RN ID:', newSocket.id, ')');

            // --- Socket Event Listeners ---
            newSocket.on('connect', () => {
                console.log('Socket: Connected with ID:', newSocket.id, '(RN)');
                newSocket.emit('authenticate', accessToken);
            });

            newSocket.on('authenticated', () => {
                console.log('Socket: Authenticated successfully! (RN)');
                setIsSocketReady(true);
                isConnecting.current = false;
                newSocket.emit("addNewUser", user._id); // Emit để thêm user vào danh sách online
                console.log("Socket: Emitting 'addNewUser' for user:", user._id);
            });

            newSocket.on('unauthorized', (reason) => {
                console.error('Socket: Authentication failed (RN):', reason.message);
                Alert.alert('Phiên đăng nhập hết hạn', 'Vui lòng đăng nhập lại để tiếp tục.', [{ text: 'OK', onPress: logout }]);
                newSocket.disconnect();
                socketRef.current = null;
                setIsSocketReady(false);
                isConnecting.current = false;
            });

            newSocket.on('disconnect', (reason) => {
                console.warn('Socket: Disconnected (RN):', reason);
                setIsSocketReady(false);
                if (socketRef.current === newSocket) {
                    socketRef.current = null;
                }
            });

            newSocket.on('connect_error', (error) => {
                console.error('Socket: Connection error (RN):', error.message);
                setIsSocketReady(false);
                isConnecting.current = false;
                Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ chat. Vui lòng thử lại sau.', [{ text: 'OK' }]);
            });

            newSocket.on('error', (error) => {
                console.error('Socket: General error event (RN):', error);
            });

            // --- Chat-specific Listeners for User ---
            const handleReceiveMessage = (message) => {
                console.log('SocketContext (User Chat): Received new message (RN):', message);
                setMessages((prevMessages) => {
                    const isMessageAlreadyExist = prevMessages.some(msg => msg._id === message._id);
                    if (isMessageAlreadyExist) return prevMessages; // Tránh thêm tin nhắn trùng lặp
                    return [...prevMessages, message];
                });
            };
            newSocket.on('receive_message', handleReceiveMessage);
            console.log('Socket: Registered receive_message listener (RN).');


            const handleChatHistory = (history) => {
                console.log('SocketContext (User Chat): Received chat history (RN):', history);
                setMessages(history);
                setIsLoadingMessages(false);
                setMessagesError(null);
            };
            newSocket.on('chat_history', handleChatHistory);
            console.log('Socket: Registered chat_history listener (RN).');


            const handleMessageError = (errorMsg) => {
                console.error('SocketContext (User Chat): Socket Message Error (RN):', errorMsg);
                setMessagesError({ error: true, message: errorMsg.message || "Lỗi khi gửi/nhận tin nhắn." });
                setIsLoadingMessages(false);
                Alert.alert('Lỗi chat', errorMsg.message || 'Có lỗi xảy ra khi chat.', [{ text: 'OK' }]);
            };
            newSocket.on('message_error', handleMessageError);
            console.log('Socket: Registered message_error listener (RN).');

            // --- FINALLY: Connect the socket ---
            newSocket.connect();

            // Cleanup function for all listeners and socket instance
            return () => {
                console.log('Socket: Cleanup function of useEffect 1 running (RN)...');
                if (newSocket && (newSocket.connected || newSocket.connecting)) {
                    console.log('Socket: Disconnecting newSocket instance during cleanup (RN ID:', newSocket.id, ').');
                    // Unregister all listeners to prevent memory leaks
                    newSocket.off('connect');
                    newSocket.off('authenticated');
                    newSocket.off('unauthorized');
                    newSocket.off('disconnect');
                    newSocket.off('connect_error');
                    newSocket.off('error');
                    newSocket.off('receive_message', handleReceiveMessage);
                    newSocket.off('chat_history', handleChatHistory);
                    newSocket.off('message_error', handleMessageError);
                    
                    newSocket.disconnect(); // Disconnect the socket
                }
                if (socketRef.current === newSocket) {
                    socketRef.current = null;
                }
                setIsSocketReady(false);
                isConnecting.current = false;
            };
        }
        // Nếu đã đăng xuất hoặc token/user không hợp lệ, ngắt kết nối socket hiện có
        else if ((!isAuthenticated || !accessToken || !user?._id) && socketRef.current) {
            console.log('Socket: User logged out or token/user missing/invalid, explicitly disconnecting existing socket (RN)...');
            if (socketRef.current.connected) {
                socketRef.current.disconnect();
            }
            socketRef.current = null;
            setIsSocketReady(false);
            isConnecting.current = false;
        }
        else {
            console.log('Socket: Conditions NOT met for new Socket.IO connection or explicit disconnection (RN).');
        }
    }, [isAuthenticated, accessToken, user?._id, logout]); // Dependencies for reconnection logic

    // --- useEffect 2: Request chat history for user if authenticated ---
    useEffect(() => {
        if (isSocketReady && socketRef.current && latestUser.current?._id && messages.length === 0) {
            console.log('SocketContext (User Chat): Requesting chat history for user on socket ready.');
            setIsLoadingMessages(true);
            setMessagesError(null);
            // User chat history is automatically sent by backend upon authentication.
            // If you need to explicitly request it after initial load, emit 'request_chat_history' here.
            // The backend's 'authenticate' event for 'user' role should handle sending the history.
            // You may need to emit 'mark_as_read' here if that's not handled by backend on initial connect.
            if (socketRef.current.connected) {
                 // Gửi request_chat_history nếu cần, backend sẽ trả về tin nhắn
                 // Tuy nhiên, backend của bạn đã gửi lịch sử chat ngay khi user authenticate.
                 // Đoạn này chỉ cần thiết nếu bạn muốn refresh thủ công.
                // socketRef.current.emit('request_chat_history', latestUser.current.chatRoomId); 
                // socketRef.current.emit('mark_as_read', { chatRoomId: latestUser.current.chatRoomId, readerId: latestUser.current._id });
            }
        }
        else if (!isAuthenticated || !isSocketReady) {
            setMessages([]);
            setIsLoadingMessages(false);
            setMessagesError(null);
        }
    }, [isSocketReady, isAuthenticated, messages.length]); 

    // Hàm gửi tin nhắn từ User (sẽ được backend xử lý để gửi tới Admin)
    const sendUserMessage = useCallback((messageText) => {
        if (!messageText.trim() || !socketRef.current || !isSocketReady || !user?._id) {
            console.warn('Cannot send message: Socket not ready or user not authenticated (RN).');
            Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng kiểm tra kết nối.', [{ text: 'OK' }]);
            return;
        }

        const socket = socketRef.current;
        if (!socket.connected) {
            console.warn('SocketContext (User Chat): Socket not connected when trying to emit "send_message". (RN)');
            Alert.alert('Lỗi', 'Kết nối chat không sẵn sàng. Vui lòng thử lại sau giây lát.', [{ text: 'OK' }]);
            return;
        }

        const messageData = {
            content: messageText.trim(),
            messageType: 'text',
            // targetUserId không cần thiết ở đây vì backend sẽ tự xác định admin
            // và tìm chat room cho user đó với admin.
        };
        console.log('SocketContext (User Chat): Emitting "send_message" (RN):', messageData);
        socket.emit('send_message', messageData);
        
    }, [isSocketReady, user?._id]); 


    const contextValue = {
        socket: socketRef.current, 
        isSocketReady, 
        messages,
        isLoadingMessages,
        messagesError,
        sendUserMessage, // Cung cấp hàm gửi tin nhắn cho UserChatScreen
        currentUserId: user?._id // Đảm bảo currentUserId là ID của người dùng đăng nhập
    };

    return (
        <SocketContext.Provider value={contextValue}>
            {children}
        </SocketContext.Provider>
    );
};

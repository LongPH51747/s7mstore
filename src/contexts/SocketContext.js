import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { API_BASE_URL } from '../config/api';


const SocketContext = createContext(null);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) throw new Error('useSocket must be used within a SocketProvider');
    return context;
};

export const SocketProvider = ({ children }) => {
    // State xác thực và user
    const [accessToken, setAccessToken] = useState(null);
    const [user, setUser] = useState(null); 
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loadingAuth, setLoadingAuth] = useState(true);

    // State socket và chat
    const socketRef = useRef(null);
    const [isSocketReady, setIsSocketReady] = useState(false);
    const isConnecting = useRef(false);

    const [messages, setMessages] = useState([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [messagesError, setMessagesError] = useState(null);
    const [chatRooms, setChatRooms] = useState([]);

    // NEW: ChatRoomId cho user thường (user - admin)
    const [currentUserChatRoomId, setCurrentUserChatRoomId] = useState(null);

    // Refs cho giá trị mới nhất
    const latestUserRef = useRef(user);
    useEffect(() => { latestUserRef.current = user; }, [user]);
    const latestAccessTokenRef = useRef(accessToken);
    useEffect(() => { latestAccessTokenRef.current = accessToken; }, [accessToken]);
    // Ref chatRoomId cho admin
    const latestCurrentChatRoomIdRef = useRef(null); 

    // Xử lý logout local
    const handleLocalLogout = useCallback(async () => {
        try {
            await AsyncStorage.multiRemove(['userToken', 'userInfo', 'shouldAutoLogin', 'userPhone']);
            try { await getAuth().signOut(); } catch (e) { }
            setAccessToken(null);
            setUser(null);
            setIsAuthenticated(false);
            setIsAdmin(false);
            setMessages([]);
            setChatRooms([]);
            setCurrentUserChatRoomId(null);
            latestCurrentChatRoomIdRef.current = null;
            setLoadingAuth(false);
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current.removeAllListeners();
                socketRef.current = null;
            }
            setIsSocketReady(false);
            isConnecting.current = false;
        } catch (error) {
            Alert.alert("Lỗi đăng xuất", "Không thể hoàn tất đăng xuất. Vui lòng thử lại.");
        }
    }, []);

    // Load dữ liệu xác thực từ AsyncStorage
   const loadAuthDataFromAsyncStorage = useCallback(async () => {
    setLoadingAuth(true);
    try {
        const firebaseAuth = getAuth();
        const firebaseUser = firebaseAuth.currentUser; // Lấy người dùng Firebase hiện tại

        let newToken = null;
        if (firebaseUser) {
            // Bước quan trọng: Buộc Firebase làm mới token
            // 'true' nghĩa là yêu cầu làm mới token nếu cần
            newToken = await firebaseUser.getIdToken(true); 
            console.log("[Firebase] Đã làm mới và lấy token mới nhất.");
        }

        const [userToken, userInfoString] = await Promise.all([
            // Lấy token từ Firebase thay vì AsyncStorage nếu có
            newToken || AsyncStorage.getItem('userToken'), // Ưu tiên token mới từ Firebase
            AsyncStorage.getItem('userInfo'),
        ]);

        let newStoredUser = userInfoString ? JSON.parse(userInfoString) : null;
        
        // Cập nhật thông tin người dùng nếu cần, đặc biệt là role
        if (newStoredUser && firebaseUser) {
            // Cập nhật Firebase UID vào user object nếu nó chưa có hoặc khác
            newStoredUser = { ...newStoredUser, firebaseUid: firebaseUser.uid };
        }

        const newAuthStatus = !!userToken && !!newStoredUser && !!newStoredUser._id; 
        const newAdminStatus = newStoredUser?.role === 'admin';

        setAccessToken(userToken || null);
        setUser(newStoredUser);
        setIsAuthenticated(newAuthStatus);
        setIsAdmin(newAdminStatus);

        // Lưu lại token và userInfo mới (nếu có) vào AsyncStorage để sử dụng sau này
        if (userToken) {
            await AsyncStorage.setItem('userToken', userToken);
        }
        if (newStoredUser) {
            await AsyncStorage.setItem('userInfo', JSON.stringify(newStoredUser));
        }

    } catch (e) {
        console.error("[SocketContext] Lỗi khi tải dữ liệu xác thực hoặc làm mới token:", e);
        setAccessToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
        // Có thể muốn gọi handleLocalLogout() ở đây nếu lỗi nghiêm trọng
    } finally {
        setLoadingAuth(false);
    }
}, []);

    // Lắng nghe Firebase Auth
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(getAuth(), async (firebaseUser) => {
            if (firebaseUser) {
                await loadAuthDataFromAsyncStorage();
            } else {
                handleLocalLogout();
            }
        });
        return () => {
            unsubscribe();
        };
    }, [loadAuthDataFromAsyncStorage, handleLocalLogout]);

    // SOCKET.IO KẾT NỐI VÀ QUẢN LÝ LIFECYCLE
    useEffect(() => {
        setMessagesError(null);
        console.log('[SocketContext] ===== BẮT ĐẦU KẾT NỐI SOCKET =====');
        console.log('[SocketContext] API_BASE_URL:', API_BASE_URL);
        console.log('[SocketContext] accessToken:', accessToken);
        console.log('[SocketContext] isAuthenticated:', isAuthenticated);
        console.log('[SocketContext] user:', user);
        console.log('[SocketContext] user?._id:', user?._id);
        if (loadingAuth || !isAuthenticated || !accessToken || !user?._id) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current.removeAllListeners();
                socketRef.current = null;
            }
            setIsSocketReady(false);
            isConnecting.current = false;
            return;
        }

        if (socketRef.current && (socketRef.current.connected || socketRef.current.connecting) && 
            socketRef.current.handshake?.auth?.token === accessToken) {
            setIsSocketReady(true);
            isConnecting.current = false;
            return;
        }

        if (socketRef.current) {
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
            socketRef.current = null;
            isConnecting.current = false;
            setIsSocketReady(false);
        }

        if (!socketRef.current) { 
            isConnecting.current = true;
            setIsSocketReady(false);

            console.log('[SocketContext] Tạo socket mới với URL:', API_BASE_URL);
            const newSocket = io(API_BASE_URL, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000,
                autoConnect: false,
                auth: { token: accessToken, tokenType: 'firebase'},
            });

            newSocket.onAny((event, ...args) => {
                console.log('[SocketContext][SOCKET EVENT]', event, args);
            });

            socketRef.current = newSocket;

            // Listeners
            const onConnect = () => {
                console.log('[SocketContext] Đã kết nối socket thành công!');
            };
            const onAuthenticated = (data) => {
                console.log('[SocketContext] Đã authenticated:', data);
                setIsSocketReady(true);
                isConnecting.current = false;
                if (latestUserRef.current?.role === 'admin') {
                    newSocket.emit('request_chat_room_list');
                } else {
                    newSocket.emit('request_chat_history_for_user_self');
                }
            };
            const onUnauthorized = (reason) => {
                console.warn('[SocketContext] unauthorized:', reason);
                Alert.alert('Phiên đăng nhập hết hạn', 'Vui lòng đăng nhập lại để tiếp tục.', [{ text: 'OK', onPress: handleLocalLogout }]);
                if (newSocket && newSocket.connected) { newSocket.disconnect(); }
                setIsSocketReady(false);
                isConnecting.current = false;
            };
            const onDisconnect = (reason) => {
                console.warn('[SocketContext] Đã disconnect:', reason);
                setIsSocketReady(false);
                isConnecting.current = false;
            };
            const onConnectError = (error) => {
                console.error('[SocketContext] Lỗi connect_error:', error);
                setIsSocketReady(false);
                isConnecting.current = false;
                Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ chat. Vui lòng thử lại sau.', [{ text: 'OK' }]);
            };
            const onGenericError = (error) => {
                console.error('[SocketContext] Lỗi error:', error);
            };

            const onChatRoomsList = (rooms) => {
                console.log('[SocketContext] Nhận danh sách phòng chat:', rooms);
                setChatRooms(rooms.map(room => ({ ...room, roomId: room._id, userId: room.userId })));
                if (rooms.length > 0 && !latestCurrentChatRoomIdRef.current) {
                    latestCurrentChatRoomIdRef.current = rooms[0]._id || rooms[0].id;
                }
            };

            const onReceiveMessage = (message) => {
                console.log('[SocketContext] Nhận message:', message);
                setMessages((prevMessages) => {
                    if (message.tempMessageId) {
                        const existingTempMessageIndex = prevMessages.findIndex(msg => msg._id === message.tempMessageId);
                        if (existingTempMessageIndex !== -1) {
                            const updatedMessages = [...prevMessages];
                            updatedMessages[existingTempMessageIndex] = {
                                ...message,
                                _id: message._id || message.tempMessageId,
                                status: 'sent',
                                tempMessageId: undefined
                            };
                            return updatedMessages;
                        }
                    }
                    const isMessageAlreadyExist = prevMessages.some(msg => msg._id === message._id);
                    if (isMessageAlreadyExist) {
                        return prevMessages.map(msg => msg._id === message._id ? { ...msg, ...message, status: 'sent' } : msg);
                    }
                    return [...prevMessages, { ...message, status: 'sent' }];
                });
            };

            const onChatHistory = (data) => {
                console.log('[SocketContext] Dữ liệu nhận từ backend:', data);
                // data có thể là mảng (cũ) hoặc object mới { chatRoomId, messages }
                let history = [];
                let chatRoomId = null;
                if (Array.isArray(data)) {
                    history = data;
                    if (history.length > 0) chatRoomId = history[0].chatRoomId;
                } else if (data && data.messages) {
                    history = data.messages;
                    chatRoomId = data.chatRoomId;
                }
                setMessages(history.map(msg => ({ ...msg, status: 'sent' })));
                setIsLoadingMessages(false);
                setMessagesError(null);
                if (!isAdmin && chatRoomId) {
                    setCurrentUserChatRoomId(chatRoomId);
                }
            };

            const onMessageError = (errorMsg) => {
                setMessagesError({ error: true, message: errorMsg.message});
                setIsLoadingMessages(false);
                setMessages(prevMessages =>
                    prevMessages.map(msg =>
                        msg.tempMessageId === errorMsg.tempMessageId ? { ...msg, status: 'failed', error: errorMsg.message } : msg
                    )
                );
            };
            const onMessageReadStatusUpdate = (data) => {};

            newSocket.on('connect', onConnect);
            newSocket.on('authenticated', onAuthenticated); 
            newSocket.on('unauthorized', onUnauthorized);
            newSocket.on('disconnect', onDisconnect);
            newSocket.on('connect_error', onConnectError);
            newSocket.on('error', onGenericError);

            if (isAdmin) {
                newSocket.on('chat_room_list', onChatRoomsList);
                newSocket.on('chat_history', onChatHistory);
            } else {
                newSocket.on('chat_history', onChatHistory);
            }
            newSocket.on('receive_message', onReceiveMessage);
            newSocket.on('message_error', onMessageError);
            newSocket.on('message_read_status_update', onMessageReadStatusUpdate);

            newSocket.connect();

            return () => {
                if (newSocket && (newSocket.connected || newSocket.connecting)) {
                    newSocket.disconnect();
                }
                newSocket.off('connect', onConnect);
                newSocket.off('authenticated', onAuthenticated);
                newSocket.off('unauthorized', onUnauthorized);
                newSocket.off('disconnect', onDisconnect);
                newSocket.off('connect_error', onConnectError);
                newSocket.off('error', onGenericError);
                if (isAdmin) {
                    newSocket.off('chat_room_list', onChatRoomsList);
                }
                newSocket.off('chat_history', onChatHistory);
                newSocket.off('receive_message', onReceiveMessage);
                newSocket.off('message_error', onMessageError);
                newSocket.off('message_read_status_update', onMessageReadStatusUpdate);
                if (socketRef.current === newSocket) {
                    socketRef.current = null;
                }
                setIsSocketReady(false);
                isConnecting.current = false;
            };
        }
    }, [isAuthenticated, accessToken, user?._id, isAdmin, handleLocalLogout, loadingAuth]);

    // Hàm gửi tin nhắn
    const sendUserMessage = useCallback((messageText) => {
        const userId = latestUserRef.current?._id;
        const socket = socketRef.current;
        let targetIdForServer, roomIdToSend;
        if (isAdmin) {
            roomIdToSend = latestCurrentChatRoomIdRef.current;
            const selectedChatRoom = chatRooms.find(room => room._id === roomIdToSend);
            if (!selectedChatRoom || !selectedChatRoom.userId) {
                Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng chọn một phòng chat hợp lệ có người dùng.');
                return;
            }
            targetIdForServer = selectedChatRoom.userId;
        } else {
            roomIdToSend = currentUserChatRoomId;
            targetIdForServer = undefined;
        }

        if (!roomIdToSend) {
            Alert.alert('Lỗi', 'Phòng chat chưa được khởi tạo. Vui lòng đợi hoặc thử lại sau.');
            return;
        }

        if (!messageText.trim() || !socket || !socket.connected || !isSocketReady || !userId || loadingAuth) {
            Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng kiểm tra kết nối.', [{ text: 'OK' }]);
            return;
        }

        const tempMessageId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const messageData = {
            sender: userId,
            content: messageText.trim(),
            messageType: 'text',
            timestamp: new Date().toISOString(),
            tempMessageId,
            chatRoomId: roomIdToSend,
        };
        if (isAdmin) messageData.targetUserId = targetIdForServer;

        console.log('Gửi tin nhắn:', messageData);
        socket.emit('send_message', messageData);
    }, [isSocketReady, isAdmin, chatRooms, loadingAuth, currentUserChatRoomId]);

    // Hàm chọn phòng chat cho admin
    const selectChatRoom = useCallback((roomId, chattingWithUserId) => {
        if (latestCurrentChatRoomIdRef.current === roomId) {
            return;
        }
        setMessages([]);
        latestCurrentChatRoomIdRef.current = roomId;
    }, []);

    // Đánh dấu tin nhắn đã đọc
    const markMessagesAsRead = useCallback(async (chatRoomId) => {
        const readerId = latestUserRef.current?._id;
        const socket = socketRef.current;

        if (!socket || !socket.connected || !isSocketReady || !readerId || !chatRoomId || loadingAuth) {
            return;
        }

        socket.emit('mark_as_read', { chatRoomId, readerId });

        setMessages(prevMessages => 
            prevMessages.map(msg => 
                (msg.chatRoomId === chatRoomId && msg.receiver?._id === readerId && !msg.readBy?.includes(readerId))
                ? { ...msg, readBy: [...(msg.readBy || []), readerId] } 
                : msg
            )
        );

        setChatRooms(prevRooms => prevRooms.map(room => {
            if (room._id === chatRoomId) {
                if (latestUserRef.current?.role === 'user') {
                    return { ...room, unreadCountUser: 0 };
                } else if (latestUserRef.current?.role === 'admin') {
                    return { ...room, unreadCountAdmin: 0 };
                }
            }
            return room;
        }));

    }, [isSocketReady, loadingAuth]);

    const contextValue = {
        socket: socketRef.current,
        isSocketReady,
        messages,
        isLoadingMessages,
        messagesError,
        sendUserMessage,
        currentUserId: latestUserRef.current?._id,
        isAuthenticated,
        isAdmin,
        chatRooms,
        currentChatRoomId: latestCurrentChatRoomIdRef.current,
        currentUserChatRoomId, // <-- Dùng để đánh dấu đã đọc/phục vụ user gửi message
        selectChatRoom,
        markMessagesAsRead,
        loadingAuth,
    };

    return (
        <SocketContext.Provider value={contextValue}>
            {children}
        </SocketContext.Provider>
    );
};

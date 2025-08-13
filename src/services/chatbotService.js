const CHATBOT_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const API_KEY = 'AIzaSyBwwkxJNw7H3fxffYvpX8__SWMgViTieQ0';

// System prompt để hướng dẫn AI về ứng dụng
const SYSTEM_PROMPT = `You are a support assistant for the fashion shopping app S7M Store.
About the app:
S7M Store is a fashion shopping app for individuals, small businesses, and large showrooms.
S7M is a major fashion brand in Vietnam and exports internationally.
Users can place orders, pay via COD or Momo e-wallet.

How to track an order: Profile → Order History → Order Details.
How to place an order:

Sign up / Log in
Browse products
Add to cart
Go to cart and checkout
Add or select delivery address
Choose payment method
Place order
Response rules:
Reply in the same language as the user.
If the user requests an in-app action, return only the number below:
1 Logout
2 Change password
3 Remove product from cart (delete cart)
4 Place order (items in cart)
5 View orders
6 View shipping addresses
If the requested in-app action is not listed, reply with "Không hỗ trợ!".
If the message is not an in-app action request, answer normally about S7M Store or fashion.
If unsure, say so and suggest the user contact admin`;

export const chatbotService = {
  async sendMessage(message) {
    try {
      const requestBody = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${SYSTEM_PROMPT}\n\nNgười dùng hỏi: ${message}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      };

      // Log dữ liệu gửi đi
      console.log('=== CHATBOT REQUEST ===');
      console.log('URL:', CHATBOT_API_URL);
      console.log('Message:', message);
      console.log('Request Body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(CHATBOT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': API_KEY,
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        console.log('=== CHATBOT RESPONSE ERROR ===');
        console.log('Status:', response.status);
        console.log('Status Text:', response.statusText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Log dữ liệu nhận về
      console.log('=== CHATBOT RESPONSE ===');
      console.log('Status:', response.status);
      console.log('Response Data:', JSON.stringify(data, null, 2));

      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        let responseText = data.candidates[0].content.parts[0].text;
        
        // Xử lý format markdown để hiển thị đẹp hơn
        responseText = responseText
          // Chuyển đổi bullet points từ * thành •
          .replace(/^\s*\*\s+/gm, '• ')
          // Chuyển đổi **text** thành text (loại bỏ bold markdown)
          .replace(/\*\*(.*?)\*\*/g, '$1')
          // Chuyển đổi *text* thành text (loại bỏ italic markdown)
          .replace(/\*(.*?)\*/g, '$1')
          // Loại bỏ các dấu # (heading markdown)
          .replace(/^#{1,6}\s+/gm, '')
          // Loại bỏ các dấu ` (code markdown)
          .replace(/`(.*?)`/g, '$1');
        
        console.log('=== EXTRACTED RESPONSE TEXT ===');
        console.log('Original Text:', data.candidates[0].content.parts[0].text);
        console.log('Processed Text:', responseText);
        return responseText;
      } else {
        console.log('=== INVALID RESPONSE FORMAT ===');
        console.log('Data structure:', data);
        throw new Error('Invalid response format from API');
      }
    } catch (error) {
      console.log('=== CHATBOT ERROR ===');
      console.error('Error sending message to chatbot:', error);
      console.log('Error details:', {
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  },

  getSystemPrompt() {
    return SYSTEM_PROMPT;
  }
}; 
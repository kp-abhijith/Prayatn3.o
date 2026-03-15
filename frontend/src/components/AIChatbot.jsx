import React, { useState, useEffect, useRef } from 'react';

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "Hi! I'm the MediSync AI. I can help you find the right specialist or assess basic symptoms. What's bothering you today?"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to the bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const generateAIResponse = async (userText) => {
    // Show typing indicator
    setIsTyping(true);

    // 🔥 YOUR REAL GEMINI BRAIN IS CONNECTED HERE
    const apiKey = "AIzaSyDFcUL2_bX0VSXbjs9KvLZn0b9sH19mmzs"; // Make sure your FULL key is pasted here!
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
      // The "System Prompt" - This tells Gemini how to act for your Medisync app
      const prompt = `You are MediSync AI, a helpful and professional medical assistant for a hospital app. Keep your answers brief (1 to 2 sentences max). Recommend general specialties (like Cardiologist, Orthopedist, General Physician) based on the user's symptoms. The user says: "${userText}"`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      
      // Extract the exact text Gemini wrote
      const aiText = data.candidates[0].content.parts[0].text;
      
      // Print Gemini's answer to the chat window
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: aiText
      }]);

    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: "I'm experiencing high server traffic right now. Please try again!"
      }]);
    } finally {
      setIsTyping(false); // Turn off the typing animation
    }
  };

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const newUserMsg = {
      id: Date.now(),
      sender: 'user',
      text: inputValue.trim()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    
    // Trigger AI response
    generateAIResponse(newUserMsg.text);
  };

  // --- Inline Styles ---
  const styles = {
    wrapper: {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    chatWindow: {
      width: '350px',
      height: '500px',
      backgroundColor: 'var(--bg-surface)',
      borderRadius: '20px',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
      display: isOpen ? 'flex' : 'none',
      flexDirection: 'column',
      overflow: 'hidden',
      marginBottom: '16px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      transformOrigin: 'bottom right',
      animation: 'fadeIn 0.3s ease-out'
    },
    header: {
      padding: '16px 20px',
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      color: 'white',
      borderTopLeftRadius: '20px',
      borderTopRightRadius: '20px',
    },
    headerTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '16px',
      fontWeight: '600',
      letterSpacing: '0.3px',
    },
    statusDot: {
      width: '8px',
      height: '8px',
      backgroundColor: 'var(--sage)',
      borderRadius: '50%',
      boxShadow: '0 0 8px var(--sage)',
    },
    closeButton: {
      background: 'transparent',
      border: 'none',
      color: 'var(--text-muted)',
      cursor: 'pointer',
      fontSize: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'color 0.2s ease',
      padding: '4px',
    },
    messagesContainer: {
      flex: 1,
      padding: '20px',
      overflowY: 'auto',
      backgroundColor: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
    messageRow: (isUser) => ({
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      width: '100%',
    }),
    bubble: (isUser) => ({
      maxWidth: '80%',
      padding: '12px 16px',
      borderRadius: '16px',
      borderBottomRightRadius: isUser ? '4px' : '16px',
      borderBottomLeftRadius: isUser ? '16px' : '4px',
      backgroundColor: isUser ? 'var(--cool)' : 'var(--bg-surface)',
      color: isUser ? 'white' : 'white', // Both white, but bot uses surface bg
      fontSize: '14.5px',
      lineHeight: '1.5',
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
      border: isUser ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
    }),
    typingIndicator: {
      display: 'flex',
      gap: '4px',
      padding: '12px 16px',
      backgroundColor: 'var(--bg-surface)',
      borderRadius: '16px',
      borderBottomLeftRadius: '4px',
      width: 'fit-content',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    },
    dot: {
      width: '6px',
      height: '6px',
      backgroundColor: 'var(--text-muted)',
      borderRadius: '50%',
      animation: 'pulse 1.5s infinite',
    },
    inputForm: {
      padding: '16px',
      backgroundColor: 'var(--bg-surface)',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
    },
    input: {
      flex: 1,
      backgroundColor: 'var(--bg-base)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '24px',
      padding: '12px 16px',
      color: 'white',
      fontSize: '14.5px',
      outline: 'none',
      transition: 'border-color 0.2s',
    },
    sendButton: {
      backgroundColor: 'var(--cool)',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      transition: 'transform 0.2s ease',
      opacity: inputValue.trim() ? 1 : 0.5,
    },
    floatingButton: {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      backgroundColor: 'var(--cool)',
      color: 'white',
      border: 'none',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '28px',
      transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      transform: isOpen ? 'rotate(90deg) scale(0.9)' : 'rotate(0deg) scale(1)',
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
          .custom-input::placeholder {
            color: var(--text-muted);
          }
          .custom-input:focus {
            border-color: var(--cool) !important;
          }
          .hover-scale:hover {
            transform: scale(1.05);
          }
        `}
      </style>

      <div style={styles.wrapper}>
        {/* Chat Window */}
        <div style={styles.chatWindow}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerTitle}>
              <div style={styles.statusDot}></div>
              MediSync AI
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              style={styles.closeButton}
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div style={styles.messagesContainer}>
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id} style={styles.messageRow(isUser)}>
                  <div style={styles.bubble(isUser)}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div style={styles.messageRow(false)}>
                <div style={styles.typingIndicator}>
                  <div style={{...styles.dot, animationDelay: '0ms'}}></div>
                  <div style={{...styles.dot, animationDelay: '150ms'}}></div>
                  <div style={{...styles.dot, animationDelay: '300ms'}}></div>
                </div>
              </div>
            )}
            {/* Invisible div to scroll to absolute bottom */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} style={styles.inputForm}>
            <input
              type="text"
              className="custom-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              style={styles.input}
            />
            <button 
              type="submit" 
              style={styles.sendButton}
              className="hover-scale"
              disabled={!inputValue.trim()}
            >
              <svg 
                width="16" height="16" 
                viewBox="0 0 24 24" fill="none" 
                stroke="currentColor" strokeWidth="2.5" 
                strokeLinecap="round" strokeLinejoin="round"
                style={{ marginLeft: '2px' }}
              >
                <path d="M22 2L11 13"></path>
                <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
              </svg>
            </button>
          </form>
        </div>

        {/* Floating Toggle Button */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          style={styles.floatingButton}
        >
          {isOpen ? (
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
               <line x1="18" y1="6" x2="6" y2="18"></line>
               <line x1="6" y1="6" x2="18" y2="18"></line>
             </svg>
          ) : (
            <span>🤖</span>
          )}
        </button>
      </div>
    </>
  );
};

export default AIChatbot;
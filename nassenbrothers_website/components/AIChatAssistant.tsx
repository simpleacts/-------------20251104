import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { AppData, ChatMessage } from '../types';

interface AIChatAssistantProps {
    appData: AppData;
}

const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    const renderText = (txt: string) => {
        // Simple markdown parsing
        let html = txt
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
            .replace(/`([^`]+)`/g, '<code>$1</code>'); // Inline code
        
        // Handle lists
        html = html.replace(/^\* (.*$)/gm, '<li>$1</li>');
        html = html.replace(/<\/li>\n<li>/g, '</li><li>');
        html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
        
        return html;
    };

    return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderText(text) }} />;
};


const TypingIndicator: React.FC = () => (
    <div className="flex items-center space-x-1 p-2">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
    </div>
);

export const AIChatAssistant: React.FC<AIChatAssistantProps> = ({ appData }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chat, setChat] = useState<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    useEffect(() => {
        if (isOpen) {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const newChat = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: 'あなたは「捺染兄弟」というオリジナルTシャツプリント専門店の、親切で知識豊富なAIアシスタントです。ユーザーからの質問に対して、丁寧かつ分かりやすく回答してください。Tシャツの素材、プリント方法、料金、デザインのコツなど、専門的な知識を持っています。',
                },
            });
            setChat(newChat);

            if (messages.length === 0) {
                 setMessages([{
                    role: 'model',
                    parts: [{ text: 'こんにちは！オリジナルTシャツ制作について、何かお困りのことはありますか？' }]
                }]);
            }
        }
    }, [isOpen]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || !chat || isLoading) return;

        const userMessage: ChatMessage = {
            role: 'user',
            parts: [{ text: inputValue }],
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const result = await chat.sendMessageStream({ message: inputValue });
            let currentText = '';
            setMessages(prev => [...prev, { role: 'model', parts: [{ text: '' }] }]);

            for await (const chunk of result) {
                currentText += chunk.text;
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { role: 'model', parts: [{ text: currentText }] };
                    return newMessages;
                });
            }
        } catch (error) {
            console.error('AI chat error:', error);
            setMessages(prev => [...prev, { role: 'model', parts: [{ text: '申し訳ありません、エラーが発生しました。' }] }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 z-40 w-16 h-16 bg-secondary text-white rounded-full shadow-lg flex items-center justify-center transform transition-transform hover:scale-110 ${isOpen ? 'scale-0' : 'scale-100'}`}
                aria-label="AIアシスタントを開く"
            >
                <i className="fas fa-comments text-2xl"></i>
            </button>

            {/* Chat Window */}
            <div
                className={`fixed bottom-6 right-6 z-50 w-[90vw] max-w-md h-[70vh] max-h-[600px] bg-surface flex flex-col shadow-2xl transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}
                style={{ borderRadius: 'var(--base-border-radius)' }}
            >
                <header className="flex items-center justify-between p-4 border-b border-border-default flex-shrink-0">
                    <h3 className="font-bold text-text-heading flex items-center gap-2">
                        <i className="fas fa-robot text-primary"></i>
                        AIアシスタント
                    </h3>
                    <button onClick={() => setIsOpen(false)} className="text-text-secondary hover:text-text-primary">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-4 space-y-4 bg-background-subtle">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 max-w-[80%] ${msg.role === 'user' ? 'bg-secondary text-white' : 'bg-white text-text-primary border'}`} style={{ borderRadius: 'var(--base-border-radius)' }}>
                                <MarkdownRenderer text={msg.parts[0].text} />
                            </div>
                        </div>
                    ))}
                     {isLoading && (
                        <div className="flex justify-start">
                             <div className="p-3 bg-white border" style={{ borderRadius: 'var(--base-border-radius)' }}>
                                <TypingIndicator />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </main>

                <footer className="p-4 border-t border-border-default flex-shrink-0">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="質問を入力..."
                            disabled={isLoading}
                            className="w-full p-2 border border-border-default focus:ring-secondary focus:border-secondary flex-grow"
                            style={{ borderRadius: 'var(--base-border-radius)' }}
                        />
                        <button type="submit" disabled={isLoading || !inputValue.trim()} className="bg-primary text-white font-bold w-10 h-10 flex items-center justify-center flex-shrink-0 disabled:bg-gray-400" style={{ borderRadius: 'var(--base-border-radius)' }}>
                            <i className="fas fa-paper-plane"></i>
                        </button>
                    </form>
                </footer>
            </div>
        </>
    );
};

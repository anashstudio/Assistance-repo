import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Phone, 
  MoreVertical, 
  Mic, 
  MicOff, 
  Image as ImageIcon, 
  Paperclip, 
  Check, 
  CheckCheck, 
  Clock, 
  Plus, 
  X, 
  ArrowRight, 
  Sparkles, 
  Smile, 
  Play, 
  Pause, 
  Trash2, 
  PhoneCall,
  User,
  Radio,
  FileText
} from 'lucide-react';
import { ChatConversation, ChatMessage, ContactItem } from '../../types';
import { 
  getConversations, 
  saveConversations, 
  getMessages, 
  saveMessages,
  QUICK_TEMPLATES 
} from '../../services/messengerService';
import { localDB } from '../../services/db';
import { vibratePhone, triggerPhoneCall, triggerSendSms } from '../../services/device';

export const MessengerModule: React.FC = () => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showTemplates, setShowTemplates] = useState<boolean>(false);
  const [showNewChatModal, setShowNewChatModal] = useState<boolean>(false);
  const [contactsList, setContactsList] = useState<ContactItem[]>([]);
  const [newChatName, setNewChatName] = useState<string>('');
  const [newChatPhone, setNewChatPhone] = useState<string>('');
  
  // Voice Recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Audio Playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadConversations();
    localDB.getContacts().then(setContactsList);
  }, []);

  useEffect(() => {
    if (activeConvId) {
      loadMessagesForActive(activeConvId);
    }
  }, [activeConvId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    const list = await getConversations();
    setConversations(list);
    if (!activeConvId && list.length > 0) {
      setActiveConvId(list[0].id);
    }
  };

  const loadMessagesForActive = async (convId: string) => {
    const msgs = await getMessages(convId);
    setMessages(msgs);
    // Mark conversation unread as 0
    const updatedConvs = conversations.map((c) =>
      c.id === convId ? { ...c, unreadCount: 0 } : c
    );
    setConversations(updatedConvs);
    await saveConversations(updatedConvs);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  // Send text message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !activeConvId) return;

    vibratePhone(25);
    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      conversationId: activeConvId,
      sender: 'user',
      text,
      timestamp: Date.now(),
      status: 'sent',
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    setInputText('');
    await saveMessages(activeConvId, updated);

    // Update conversation last message
    const updatedConvs = conversations.map((c) =>
      c.id === activeConvId
        ? {
            ...c,
            lastMessage: text,
            lastMessageTime: Date.now(),
          }
        : c
    );
    setConversations(updatedConvs);
    await saveConversations(updatedConvs);

    // Simulate auto delivered
    setTimeout(async () => {
      const deliveredMsgs = updated.map((m) =>
        m.id === newMsg.id ? { ...m, status: 'delivered' as const } : m
      );
      setMessages(deliveredMsgs);
      await saveMessages(activeConvId, deliveredMsgs);
    }, 1000);
  };

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      vibratePhone(40);
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = reader.result as string;
          if (activeConvId) {
            const voiceMsg: ChatMessage = {
              id: 'voice_' + Date.now(),
              conversationId: activeConvId,
              sender: 'user',
              mediaType: 'voice',
              mediaUrl: base64Data,
              audioDurationSeconds: Math.max(1, recordingSeconds),
              timestamp: Date.now(),
              status: 'sent',
            };
            const updated = [...messages, voiceMsg];
            setMessages(updated);
            await saveMessages(activeConvId, updated);

            const updatedConvs = conversations.map((c) =>
              c.id === activeConvId
                ? {
                    ...c,
                    lastMessage: '🎙️ پیام صوتی (' + recordingSeconds + ' ثانیه)',
                    lastMessageTime: Date.now(),
                  }
                : c
            );
            setConversations(updatedConvs);
            await saveConversations(updatedConvs);
          }
        };
        reader.readAsDataURL(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting audio recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      vibratePhone(30);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      vibratePhone(20);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
      audioChunksRef.current = [];
    }
  };

  // Play audio note
  const handleTogglePlayAudio = (id: string, url?: string) => {
    if (!url) return;
    if (playingAudioId === id) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = url;
        audioPlayerRef.current.play();
        setPlayingAudioId(id);
        audioPlayerRef.current.onended = () => {
          setPlayingAudioId(null);
        };
      }
    }
  };

  // Image attachment
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConvId) return;

    vibratePhone(25);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Url = reader.result as string;
      const imgMsg: ChatMessage = {
        id: 'img_' + Date.now(),
        conversationId: activeConvId,
        sender: 'user',
        mediaType: 'image',
        mediaUrl: base64Url,
        text: file.name,
        timestamp: Date.now(),
        status: 'sent',
      };
      const updated = [...messages, imgMsg];
      setMessages(updated);
      await saveMessages(activeConvId, updated);

      const updatedConvs = conversations.map((c) =>
        c.id === activeConvId
          ? {
              ...c,
              lastMessage: '📷 تصویر ارسال شد',
              lastMessageTime: Date.now(),
            }
          : c
      );
      setConversations(updatedConvs);
      await saveConversations(updatedConvs);
    };
    reader.readAsDataURL(file);
  };

  // Create new conversation
  const handleCreateNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatName.trim()) return;

    vibratePhone(30);
    const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newConv: ChatConversation = {
      id: 'conv_' + Date.now(),
      participantName: newChatName.trim(),
      avatarColor: randomColor,
      lastMessage: 'گفتگوی جدید آغاز شد.',
      lastMessageTime: Date.now(),
      unreadCount: 0,
      phoneNumber: newChatPhone.trim() || undefined,
      isOnline: true,
    };

    const updated = [newConv, ...conversations];
    setConversations(updated);
    await saveConversations(updated);
    setActiveConvId(newConv.id);
    setShowNewChatModal(false);
    setNewChatName('');
    setNewChatPhone('');
  };

  const handleSelectExistingContact = (contact: ContactItem) => {
    setNewChatName(contact.name);
    setNewChatPhone(contact.phoneNumber);
  };

  const handleCallActiveContact = () => {
    if (activeConversation?.phoneNumber) {
      triggerPhoneCall(activeConversation.phoneNumber);
    }
  };

  const handleSmsActiveContact = () => {
    if (activeConversation?.phoneNumber) {
      triggerSendSms(activeConversation.phoneNumber, inputText);
    }
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatMessageTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] min-h-[500px] flex flex-col rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl overflow-hidden">
      {/* Hidden Audio Player */}
      <audio ref={audioPlayerRef} className="hidden" />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar / Conversation List */}
        <div
          className={`w-full md:w-80 border-l border-slate-800 flex flex-col bg-slate-900/95 shrink-0 ${
            activeConvId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header of list */}
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-white">پیام‌ها و گفتگوها</h3>
            </div>

            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 transition-all active:scale-95"
              title="شروع گفتگوی جدید"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Search bar */}
          <div className="p-2.5 border-b border-slate-800">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="جستجو در گفتگوها..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-8 pl-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-hidden focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                گفتگویی یافت نشد. با کلیک بر روی «+»، چت جدیدی ایجاد کنید.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === activeConvId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveConvId(conv.id);
                      vibratePhone(15);
                    }}
                    className={`p-3 flex items-center gap-3 cursor-pointer transition-colors relative ${
                      isSelected
                        ? 'bg-cyan-500/10 border-r-2 border-cyan-400'
                        : 'hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white text-xs shadow-md"
                        style={{ backgroundColor: conv.avatarColor }}
                      >
                        {conv.participantName.slice(0, 1)}
                      </div>
                      {conv.isOnline && (
                        <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold text-white truncate">
                          {conv.participantName}
                        </span>
                        <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                          {formatMessageTime(conv.lastMessageTime)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[11px] text-slate-400 truncate">
                          {conv.lastMessage}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 font-bold text-[9px] flex items-center justify-center shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        {activeConversation ? (
          <div
            className={`flex-1 flex flex-col bg-[#070b14]/70 ${
              !activeConvId ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Chat Header */}
            <div className="p-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Back button on mobile */}
                <button
                  onClick={() => setActiveConvId(null)}
                  className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>

                <div
                  className="w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-white text-xs shrink-0"
                  style={{ backgroundColor: activeConversation.avatarColor }}
                >
                  {activeConversation.participantName.slice(0, 1)}
                </div>

                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">
                    {activeConversation.participantName}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-slate-400">
                      {activeConversation.isOnline ? 'آنلاین' : 'آخرین بازدید اخیراً'}
                    </span>
                    {activeConversation.phoneNumber && (
                      <span className="text-slate-500 font-mono dir-ltr">
                        • {activeConversation.phoneNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Chat Header Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {activeConversation.phoneNumber && (
                  <>
                    <button
                      onClick={handleCallActiveContact}
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 border border-slate-700/60 transition-all active:scale-95"
                      title="تماس مستقیم با مخاطب"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleSmsActiveContact}
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400 border border-slate-700/60 transition-all active:scale-95"
                      title="ارسال پیامک معمولی به گوشی"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((msg) => {
                const isMe = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`}
                  >
                    <div
                      className={`max-w-[82%] sm:max-w-md p-3 rounded-2xl shadow-sm text-xs leading-relaxed space-y-1 ${
                        isMe
                          ? 'bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white rounded-tr-xs'
                          : 'bg-slate-800 text-slate-100 rounded-tl-xs border border-slate-700/60'
                      }`}
                    >
                      {/* Image Message */}
                      {msg.mediaType === 'image' && msg.mediaUrl && (
                        <div className="rounded-xl overflow-hidden border border-white/10 mb-1 max-h-60">
                          <img
                            src={msg.mediaUrl}
                            alt="تصویر ارسالی"
                            className="w-full h-auto object-cover"
                          />
                        </div>
                      )}

                      {/* Voice Note Message */}
                      {msg.mediaType === 'voice' && msg.mediaUrl && (
                        <div className="flex items-center gap-3 py-1 px-1">
                          <button
                            onClick={() => handleTogglePlayAudio(msg.id, msg.mediaUrl)}
                            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center shrink-0 transition-colors"
                          >
                            {playingAudioId === msg.id ? (
                              <Pause className="w-4 h-4 fill-white" />
                            ) : (
                              <Play className="w-4 h-4 fill-white translate-x-0.5" />
                            )}
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center gap-1 h-3">
                              {[40, 70, 30, 90, 60, 80, 50, 100, 45, 65, 30, 75].map((h, idx) => (
                                <div
                                  key={idx}
                                  className={`w-1 rounded-full ${
                                    playingAudioId === msg.id ? 'bg-cyan-200 animate-pulse' : 'bg-white/40'
                                  }`}
                                  style={{ height: `${h}%` }}
                                />
                              ))}
                            </div>
                            <span className="text-[10px] text-white/80 font-mono mt-1 block">
                              {msg.audioDurationSeconds || 5} ثانیه
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Text */}
                      {msg.text && (
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                      )}

                      {/* Time and Status checks */}
                      <div className="flex items-center justify-end gap-1 text-[9px] text-white/70 font-mono pt-0.5">
                        <span>{formatMessageTime(msg.timestamp)}</span>
                        {isMe && (
                          <span>
                            {msg.status === 'read' ? (
                              <CheckCheck className="w-3 h-3 text-cyan-200 inline" />
                            ) : msg.status === 'delivered' ? (
                              <CheckCheck className="w-3 h-3 text-white/70 inline" />
                            ) : (
                              <Check className="w-3 h-3 text-white/70 inline" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Templates Bar */}
            {showTemplates && (
              <div className="p-2 border-t border-slate-800 bg-slate-900/90 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {QUICK_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      handleSendMessage(tmpl);
                      setShowTemplates(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] whitespace-nowrap border border-slate-700 transition-colors"
                  >
                    {tmpl}
                  </button>
                ))}
              </div>
            )}

            {/* Input Toolbar */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/95 space-y-2">
              {isRecording ? (
                /* Live Recording UI */
                <div className="flex items-center justify-between p-2 rounded-2xl bg-rose-950/30 border border-rose-500/40 animate-pulse">
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <span>در حال ضبط پیام صوتی:</span>
                    <span className="font-mono text-white text-sm">
                      {Math.floor(recordingSeconds / 60)}:
                      {String(recordingSeconds % 60).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={cancelRecording}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                    >
                      لغو
                    </button>
                    <button
                      onClick={stopRecording}
                      className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-rose-600/30 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>ارسال وویس</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard Message Input */
                <div className="flex items-center gap-2">
                  {/* Quick templates toggle */}
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className={`p-2 rounded-xl border transition-colors ${
                      showTemplates
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                    title="پاسخ‌های آماده سریع"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>

                  {/* Attachment / Image */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
                    title="ارسال تصویر یا فایل"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />

                  {/* Text Input */}
                  <input
                    type="text"
                    placeholder="پیام خود را بنویسید..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-hidden focus:border-cyan-400"
                  />

                  {/* Mic / Send button */}
                  {inputText.trim() ? (
                    <button
                      onClick={() => handleSendMessage()}
                      className="p-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-md shadow-cyan-600/20 transition-all active:scale-95"
                      title="ارسال پیام"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={startRecording}
                      className="p-2.5 rounded-2xl bg-slate-800 hover:bg-cyan-600/30 text-slate-300 hover:text-cyan-300 border border-slate-700 transition-all active:scale-95"
                      title="ضبط پیام صوتی (Voice)"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <div className="w-16 h-16 rounded-3xl bg-slate-800/50 flex items-center justify-center mb-3">
              <MessageSquare className="w-8 h-8 text-slate-600" />
            </div>
            <h4 className="text-sm font-bold text-slate-400">گفتگویی انتخاب نشده است</h4>
            <p className="text-xs text-slate-600 mt-1 max-w-xs">
              یک مخاطب را از ستون کناری انتخاب کنید یا با کلیک بر روی «+» گفتگوی جدیدی بسازید.
            </p>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateNewChat}
            className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 space-y-4 shadow-2xl text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                شروع گفتگوی جدید
              </h4>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Pick from Contacts if available */}
            {contactsList.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-400 block font-medium">
                  انتخاب سریع از دفترچه مخاطبین:
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {contactsList.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => handleSelectExistingContact(contact)}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] shrink-0 transition-colors flex items-center gap-1"
                    >
                      <User className="w-3 h-3 text-cyan-400" />
                      <span>{contact.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  نام مخاطب یا گروه
                </label>
                <input
                  type="text"
                  placeholder="مثلاً علی رضایی، تیم پشتیبانی..."
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-cyan-400"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  شماره موبایل (جهت تماس و پیامک)
                </label>
                <input
                  type="tel"
                  placeholder="0912..."
                  value={newChatPhone}
                  onChange={(e) => setNewChatPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs dir-ltr focus:outline-hidden focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors"
              >
                شروع گفتگو
              </button>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition-colors"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

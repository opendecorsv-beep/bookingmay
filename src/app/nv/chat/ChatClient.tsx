'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ChatMessage, 
  ChatStationId, 
  ChatStationConfig, 
  CHAT_STATIONS, 
  CHAT_PRESETS, 
  ChatMessageType, 
  RESTAURANT_STAFF_LIST, 
  AuthUser 
} from '@/lib/data';
import { sendChatMessageAction, clearChatMessagesAction } from '@/app/actions';
import { supabase } from '@/lib/supabase';
import { 
  Send, 
  Bell, 
  BellOff, 
  Volume2, 
  VolumeX, 
  AlertTriangle, 
  Sparkles, 
  User, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  Crown, 
  CreditCard, 
  Utensils, 
  Wine, 
  ShieldCheck, 
  DoorOpen, 
  Clock, 
  Filter, 
  MessageSquare, 
  ChevronDown, 
  Check,
  Radio,
  Wifi,
  PhoneCall,
  Flame,
  ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface ChatClientProps {
  initialMessages: ChatMessage[];
  initialUser: AuthUser | null;
}

type ChannelFilter = 'all' | 'urgent' | 'bill' | 'kitchen' | 'my_station';

// Sound Engine using Web Audio API (100% reliable across all browsers & devices)
class SoundEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Melodic ping-dong chime for regular messages
  playChime() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Note 1: 880Hz (A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Note 2: 1320Hz (E6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, now + 0.1);
      gain2.gain.setValueAtTime(0.25, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.5);
    } catch (e) {
      // Audio autoplay restriction fallback
    }
  }

  // Attention-grabbing alert chime for urgent requests / in bill
  playUrgentAlert() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const tones = [659.25, 880, 1174.66, 880, 1318.51];
      tones.forEach((freq, idx) => {
        const t = now + idx * 0.09;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.14);
      });

      // Mobile vibration
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 250, 100, 300]);
      }
    } catch (e) {
      // Audio autoplay restriction fallback
    }
  }
}

const soundEngine = new SoundEngine();

export default function ChatClient({ initialMessages, initialUser }: ChatClientProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [activeStationId, setActiveStationId] = useState<ChatStationId>('vip_101');
  const [activeStaffName, setActiveStaffName] = useState<string>('');
  const [isStationModalOpen, setIsStationModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Form State
  const [inputText, setInputText] = useState('');
  const [isUrgentFlag, setIsUrgentFlag] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [filter, setFilter] = useState<ChannelFilter>('all');
  const [isConnected, setIsConnected] = useState(false);

  // Scroll anchor
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedStation = localStorage.getItem('may_chat_station') as ChatStationId;
      const savedStaff = localStorage.getItem('may_chat_staff');
      const savedSound = localStorage.getItem('may_chat_sound');

      if (savedStation && CHAT_STATIONS.some(s => s.id === savedStation)) {
        setActiveStationId(savedStation);
      } else {
        // First time opening: prompt station selector
        setIsStationModalOpen(true);
      }

      if (savedStaff) {
        setActiveStaffName(savedStaff);
      } else if (initialUser?.name) {
        setActiveStaffName(initialUser.name);
      } else {
        setActiveStaffName('Phục vụ');
      }

      if (savedSound !== null) {
        setSoundEnabled(savedSound === 'true');
      }
    }
  }, [initialUser]);

  // Current station config
  const currentStation = useMemo(() => {
    return CHAT_STATIONS.find(s => s.id === activeStationId) || CHAT_STATIONS[5];
  }, [activeStationId]);

  // Scroll to bottom smoothly
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('auto');
  }, []);

  // Supabase Realtime Subscription via WebSockets
  useEffect(() => {
    const channel = supabase.channel('restaurant-chat-room', {
      config: {
        broadcast: { self: false }
      }
    });

    channel
      .on('broadcast', { event: 'new-message' }, ({ payload }) => {
        const newMsg = payload as ChatMessage;
        setMessages(prev => {
          // Avoid duplicate by id
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Trigger ringtone / vibration if sound is enabled
        if (soundEnabled) {
          if (newMsg.isUrgent || newMsg.type === 'bill_request' || newMsg.type === 'urgent_call') {
            soundEngine.playUrgentAlert();
          } else {
            soundEngine.playChime();
          }
        }

        setTimeout(() => scrollToBottom('smooth'), 100);
      })
      .on('broadcast', { event: 'clear-chat' }, () => {
        setMessages([]);
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled]);

  // Detect scroll position to show / hide "scroll to bottom" button
  const handleScroll = () => {
    if (!chatScrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    setShowScrollBottom(!isNearBottom);
  };

  // Switch station
  const handleSelectStation = (stationId: ChatStationId, staffName?: string) => {
    setActiveStationId(stationId);
    localStorage.setItem('may_chat_station', stationId);

    if (staffName) {
      setActiveStaffName(staffName);
      localStorage.setItem('may_chat_staff', staffName);
    }
    setIsStationModalOpen(false);
  };

  // Toggle sound
  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('may_chat_sound', String(nextVal));
    if (nextVal) {
      soundEngine.playChime();
    }
  };

  // Send message
  const handleSendMessage = async (
    customContent?: string, 
    customType?: ChatMessageType, 
    customUrgent?: boolean
  ) => {
    const content = (customContent !== undefined ? customContent : inputText).trim();
    if (!content) return;

    const msgType = customType || (isUrgentFlag ? 'urgent_call' : 'text');
    const urgent = customUrgent !== undefined ? customUrgent : isUrgentFlag;

    setIsSending(true);

    // Build message
    const tempId = `MSG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const newMsg: ChatMessage = {
      id: tempId,
      senderStation: activeStationId,
      stationName: currentStation.shortName,
      senderName: activeStaffName || 'Nhân viên',
      channel: urgent ? 'supervisor' : (msgType === 'bill_request' ? 'cashier' : (msgType === 'rush_dish' ? 'kitchen' : 'general')),
      content,
      type: msgType,
      isUrgent: urgent,
      createdAt: new Date().toISOString(),
      roomTag: currentStation.category === 'vip' ? currentStation.shortName : undefined,
    };

    // 1. Optimistic local update
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setIsUrgentFlag(false);
    setTimeout(() => scrollToBottom('smooth'), 50);

    // 2. Broadcast via Supabase Realtime WebSocket (< 50ms)
    try {
      const channel = supabase.channel('restaurant-chat-room');
      await channel.send({
        type: 'broadcast',
        event: 'new-message',
        payload: newMsg
      });
    } catch (e) {
      console.warn('Realtime broadcast error:', e);
    }

    // 3. Save to server backend database for persistent history
    try {
      await sendChatMessageAction({
        senderStation: newMsg.senderStation,
        stationName: newMsg.stationName,
        senderName: newMsg.senderName,
        channel: newMsg.channel,
        content: newMsg.content,
        type: newMsg.type,
        isUrgent: newMsg.isUrgent,
        roomTag: newMsg.roomTag
      });
    } catch (e) {
      console.error('Server action save error:', e);
    } finally {
      setIsSending(false);
    }
  };

  // Quick Action Preset handler
  const handleQuickPreset = (preset: typeof CHAT_PRESETS[0]) => {
    // Append room tag prefix if sender is a VIP room
    let fullContent = preset.content;
    if (currentStation.category === 'vip') {
      fullContent = `[${currentStation.shortName}] ${preset.content}`;
    }
    handleSendMessage(fullContent, preset.type, preset.isUrgent);
  };

  // Quick response to an existing message (e.g. Thu Ngân bấm xác nhận)
  const handleAcknowledge = (targetMsg: ChatMessage) => {
    const text = `[${currentStation.shortName}] Đã tiếp nhận & Đang xử lý yêu cầu của ${targetMsg.stationName}!`;
    handleSendMessage(text, 'resolved', false);
  };

  // Clear chat history (Giám Sát / Admin)
  const handleClearChat = async () => {
    if (!confirm('Bạn có chắc muốn xóa lịch sử kênh chat này không?')) return;
    setMessages([]);
    try {
      const channel = supabase.channel('restaurant-chat-room');
      await channel.send({
        type: 'broadcast',
        event: 'clear-chat',
        payload: {}
      });
      await clearChatMessagesAction();
    } catch (e) {
      console.error(e);
    }
  };

  // Filter messages
  const filteredMessages = useMemo(() => {
    let list = [...messages];
    if (filter === 'urgent') {
      list = list.filter(m => m.isUrgent);
    } else if (filter === 'bill') {
      list = list.filter(m => m.type === 'bill_request' || m.type === 'bill_done' || m.senderStation === 'thu_ngan');
    } else if (filter === 'kitchen') {
      list = list.filter(m => m.type === 'rush_dish' || m.type === 'drink_ice' || m.senderStation === 'bep' || m.senderStation === 'bar');
    } else if (filter === 'my_station') {
      list = list.filter(m => 
        m.senderStation === activeStationId || 
        (m.roomTag && currentStation.shortName.includes(m.roomTag))
      );
    }
    return list;
  }, [messages, filter, activeStationId, currentStation]);

  // Station Icon Component Helper
  const renderStationIcon = (stationId: ChatStationId, className: string = "w-3.5 h-3.5") => {
    if (stationId.startsWith('vip_')) return <Crown className={className} />;
    if (stationId === 'thu_ngan') return <CreditCard className={className} />;
    if (stationId === 'bep') return <Utensils className={className} />;
    if (stationId === 'bar') return <Wine className={className} />;
    if (stationId === 'giam_sat') return <ShieldCheck className={className} />;
    if (stationId === 'le_tan') return <Bell className={className} />;
    return <DoorOpen className={className} />;
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)] min-h-[550px] bg-white rounded-2xl border border-slate-200/90 shadow-lg overflow-hidden text-slate-800">
      
      {/* 1. COMPACT TOP STATION & CONTROLS HEADER */}
      <div className="bg-slate-900 text-white px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 border-b border-slate-800 shrink-0">
        
        {/* Left: Active Station & Staff Identity Badge */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setIsStationModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold transition-all active:scale-95 text-amber-300"
            title="Bấm để đổi Trạm / Phòng VIP"
          >
            {renderStationIcon(currentStation.id, "w-4 h-4 text-amber-400 shrink-0")}
            <span className="truncate max-w-[130px] sm:max-w-[180px]">{currentStation.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          <div className="hidden sm:flex items-center gap-1 text-slate-300 text-xs bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
            <User className="w-3 h-3 text-slate-400" />
            <span className="truncate max-w-[120px] font-medium">{activeStaffName || 'Nhân viên'}</span>
          </div>

          {/* Realtime Live Pulse Indicator */}
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden md:inline">{isConnected ? 'Realtime' : 'Kết nối...'}</span>
          </div>
        </div>

        {/* Right: Sound Toggle, Change Staff & Clear Action */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleSound}
            className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all ${
              soundEnabled
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title={soundEnabled ? 'Chuông đang BẬT (bấm để tắt)' : 'Chuông đang TẮT (bấm để bật)'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-300" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline text-[11px]">{soundEnabled ? 'Chuông' : 'Mute'}</span>
          </button>

          {(initialUser?.role === 'admin' || initialUser?.role === 'supervisor') && messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800 transition-colors"
              title="Xóa tin nhắn (Dành cho Giám sát)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. CHANNEL / TOPIC FILTER TABS (COMPACT DENSE PILLS) */}
      <div className="bg-slate-100/90 border-b border-slate-200 px-3 py-1.5 flex items-center justify-between gap-1.5 overflow-x-auto scrollbar-hide shrink-0 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📢 Tất cả ({messages.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('urgent')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
              filter === 'urgent'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Khẩn cấp ({messages.filter(m => m.isUrgent).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('bill')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
              filter === 'bill'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <CreditCard className="w-3 h-3" />
            <span>Thu Ngân / Bill</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('kitchen')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
              filter === 'kitchen'
                ? 'bg-orange-600 text-white shadow-2xs'
                : 'text-orange-700 hover:bg-orange-50'
            }`}
          >
            <Utensils className="w-3 h-3" />
            <span>Bếp / Ra Món</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setFilter('my_station')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
            filter === 'my_station'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'text-amber-800 hover:bg-amber-100'
          }`}
        >
          <span>Trạm của tôi ({currentStation.shortName})</span>
        </button>
      </div>

      {/* 3. REALTIME MESSAGE FEED (COMPACT BUBBLES WITH VIBRANT STATUS) */}
      <div 
        ref={chatScrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 bg-slate-50/50 relative"
      >
        {filteredMessages.map((msg) => {
          const isMe = msg.senderStation === activeStationId;
          const isUrgent = msg.isUrgent || msg.type === 'bill_request' || msg.type === 'urgent_call';
          const timeFormatted = new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
          });

          // Station styling
          const stationCfg = CHAT_STATIONS.find(s => s.id === msg.senderStation) || CHAT_STATIONS[0];

          return (
            <div 
              key={msg.id} 
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-1 duration-200`}
            >
              {/* Sender Station Header */}
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] font-semibold text-slate-500">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded font-bold border ${stationCfg.badgeBg} ${stationCfg.color} ${stationCfg.badgeBorder}`}>
                  {renderStationIcon(msg.senderStation, "w-3 h-3")}
                  {msg.stationName}
                </span>
                <span className="text-slate-600 font-medium">• {msg.senderName}</span>
                <span className="text-slate-400 text-[10px]">({timeFormatted})</span>
              </div>

              {/* Message Bubble */}
              <div 
                className={`max-w-[88%] sm:max-w-[75%] rounded-2xl p-2.5 sm:p-3 text-xs sm:text-sm leading-relaxed transition-all shadow-xs ${
                  isUrgent 
                    ? 'bg-rose-50 border-2 border-rose-400 text-rose-950 ring-2 ring-rose-200/50 animate-pulse'
                    : isMe 
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-tr-none shadow-amber-200' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                }`}
              >
                {/* Urgent or Special Type Badge */}
                {msg.type === 'bill_request' && (
                  <div className="flex items-center gap-1 text-[11px] font-extrabold text-rose-700 bg-rose-100/90 px-2 py-0.5 rounded-md mb-1.5 border border-rose-300 w-fit">
                    <CreditCard className="w-3.5 h-3.5 text-rose-600" />
                    <span>YÊU CẦU IN TẠM TÍNH / HÓA ĐƠN</span>
                  </div>
                )}

                {msg.type === 'rush_dish' && (
                  <div className="flex items-center gap-1 text-[11px] font-extrabold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md mb-1.5 border border-amber-300 w-fit">
                    <Utensils className="w-3.5 h-3.5 text-amber-700" />
                    <span>GIỤC BẾP RA MÓN NHANH</span>
                  </div>
                )}

                {msg.type === 'urgent_call' && (
                  <div className="flex items-center gap-1 text-[11px] font-extrabold text-red-700 bg-red-100 px-2 py-0.5 rounded-md mb-1.5 border border-red-300 w-fit">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    <span>GỌI GIÁM SÁT HỖ TRỢ KHẨN CẤP</span>
                  </div>
                )}

                {msg.type === 'bill_done' && (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md mb-1.5 border border-emerald-300 w-fit">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>THU NGÂN BÁO ĐÃ XONG BILL</span>
                  </div>
                )}

                {/* Content */}
                <div className={`font-medium whitespace-pre-wrap ${isMe && !isUrgent ? 'text-white' : ''}`}>
                  {msg.content}
                </div>

                {/* Quick Acknowledge Action Button for Recipient */}
                {!isMe && isUrgent && msg.type !== 'resolved' && (
                  <div className="mt-2 pt-2 border-t border-rose-200/80 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleAcknowledge(msg)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Xác nhận đã xử lý</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredMessages.length === 0 && (
          <div className="text-center py-16 text-slate-400 space-y-2">
            <MessageSquare className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-xs font-semibold">Chưa có tin nhắn nào trong kênh này</p>
            <p className="text-[11px] text-slate-400">Chọn 1 nút gửi nhanh bên dưới hoặc gõ tin nhắn để bắt đầu trao đổi</p>
          </div>
        )}

        <div ref={messagesEndRef} />

        {/* Floating Scroll to Bottom button */}
        {showScrollBottom && (
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            className="absolute bottom-3 right-4 p-2 rounded-full bg-amber-600 hover:bg-amber-700 text-white shadow-md border border-amber-400 transition-all active:scale-90"
            title="Cuộn xuống tin mới nhất"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 4. QUICK ACTION PRESET CHIPS (1-TAP INSTANT BROADCAST) */}
      <div className="bg-slate-100/80 px-2.5 py-2 border-t border-slate-200/90 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider shrink-0 mr-1">
            Chạm Gửi Nhanh:
          </span>
          {CHAT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleQuickPreset(preset)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all active:scale-95 shrink-0 flex items-center gap-1 shadow-2xs ${preset.btnClass}`}
              title={`Gửi nhanh cho: ${preset.targetRole}`}
            >
              <span>{preset.icon}</span>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 5. CUSTOM INPUT BAR (COMPACT & INTUITIVE) */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="bg-white p-2.5 sm:p-3 border-t border-slate-200 flex items-center gap-2 shrink-0"
      >
        {/* Urgent Switch Toggle */}
        <button
          type="button"
          onClick={() => setIsUrgentFlag(!isUrgentFlag)}
          className={`px-2 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all border shrink-0 ${
            isUrgentFlag
              ? 'bg-rose-600 text-white border-rose-700 shadow-2xs animate-pulse'
              : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700 border-slate-200'
          }`}
          title="Bật cờ Khẩn cấp cho tin nhắn này"
        >
          <Flame className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Khẩn</span>
        </button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <Input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`[${currentStation.shortName}] Nhập nội dung trao đổi...`}
            className="h-10 text-xs sm:text-sm bg-slate-50 border-slate-300 focus:bg-white rounded-xl pr-10 focus-visible:ring-amber-500"
            disabled={isSending}
          />
        </div>

        {/* Send Button */}
        <Button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5 shadow-sm shrink-0 active:scale-95"
        >
          <span>Gửi</span>
          <Send className="w-3.5 h-3.5" />
        </Button>
      </form>

      {/* 6. MODAL: CHỌN TRẠM & DANH TÍNH NHÂN SỰ */}
      <Dialog open={isStationModalOpen} onOpenChange={setIsStationModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                <Crown className="w-5 h-5 text-amber-600" />
              </div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                Chọn Trạm Trực & Tên Nhân Sự
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Chọn vị trí bạn đang phục vụ để các bộ phận khác (Thu Ngân, Bếp, Giám Sát) nhận biết chính xác
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Pick Staff Name from 31 Personnel */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-amber-600" />
                <span>Họ và tên nhân sự trực ca:</span>
              </label>
              <select
                value={activeStaffName}
                onChange={(e) => {
                  setActiveStaffName(e.target.value);
                  localStorage.setItem('may_chat_staff', e.target.value);
                }}
                className="w-full text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
              >
                <option value="">-- Chọn tên bạn từ danh sách 31 nhân sự --</option>
                {RESTAURANT_STAFF_LIST.map((s) => (
                  <option key={s.stt} value={s.name}>
                    {s.name} ({s.role}{s.phone ? ` - ${s.phone}` : ''})
                  </option>
                ))}
              </select>
            </div>

            {/* Pick Station Grid */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Chọn vị trí / Phòng VIP đang phụ trách:
              </label>

              {/* VIP Tầng 1 */}
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider block mb-1">
                  👑 Phòng VIP Tầng 1
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {CHAT_STATIONS.filter(s => s.id.startsWith('vip_1')).map((station) => (
                    <button
                      key={station.id}
                      type="button"
                      onClick={() => handleSelectStation(station.id)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                        activeStationId === station.id
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                      }`}
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>{station.shortName}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* VIP Tầng 2 */}
              <div className="pt-1">
                <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider block mb-1">
                  👑 Phòng VIP Tầng 2 & Sảnh
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {CHAT_STATIONS.filter(s => s.id.startsWith('vip_2') || s.id === 'sanh').map((station) => (
                    <button
                      key={station.id}
                      type="button"
                      onClick={() => handleSelectStation(station.id)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                        activeStationId === station.id
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                      }`}
                    >
                      {station.id === 'sanh' ? <DoorOpen className="w-3.5 h-3.5 text-slate-500" /> : <Crown className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{station.shortName}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bộ Phận Hỗ Trợ (Thu Ngân, Bếp, Bar, Lễ Tân, Giám Sát) */}
              <div className="pt-1">
                <span className="text-[10px] uppercase font-bold text-purple-700 tracking-wider block mb-1">
                  🏢 Bộ Phận Quầy / Hỗ Trợ
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {CHAT_STATIONS.filter(s => s.category !== 'vip').map((station) => (
                    <button
                      key={station.id}
                      type="button"
                      onClick={() => handleSelectStation(station.id)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                        activeStationId === station.id
                          ? 'bg-purple-700 text-white border-purple-800 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50'
                      }`}
                    >
                      {renderStationIcon(station.id, "w-4 h-4 shrink-0")}
                      <span>{station.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="button"
                onClick={() => setIsStationModalOpen(false)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 rounded-xl"
              >
                Xác Nhận & Bắt Đầu Chat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

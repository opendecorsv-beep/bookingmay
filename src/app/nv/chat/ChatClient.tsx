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
  ArrowDown,
  Volume1,
  Sliders,
  X
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
export type VolumeMode = 'normal' | 'loud' | 'max_cashier';

// Sound Engine using Web Audio API with DynamicsCompressor & Harmonic Synthesis
class SoundEngine {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;

  public initAudio(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        // Master Dynamics Compressor: Pushes perceived volume to the max without distortion
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-22, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.2, this.ctx.currentTime);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    gainLevel: number,
    waveType: OscillatorType = 'triangle'
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = waveType;
    osc.frequency.setValueAtTime(freq, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.995, startTime + duration);

    gain.gain.setValueAtTime(gainLevel, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    if (this.compressor) {
      gain.connect(this.compressor);
    } else {
      gain.connect(ctx.destination);
    }

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // Melodic metallic chime for regular messages
  playChime(mode: VolumeMode = 'max_cashier') {
    try {
      const ctx = this.initAudio();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (mode === 'max_cashier') {
        // High-penetration metallic brass bell chime (C6 + E6 + G6)
        this.playTone(ctx, 1046.5, now, 0.45, 0.95, 'triangle');
        this.playTone(ctx, 1568.0, now, 0.45, 0.75, 'square');
        this.playTone(ctx, 2093.0, now, 0.35, 0.5, 'sine');

        // Second strike
        this.playTone(ctx, 1318.5, now + 0.18, 0.65, 1.0, 'triangle');
        this.playTone(ctx, 1975.5, now + 0.18, 0.65, 0.8, 'square');
        this.playTone(ctx, 2637.0, now + 0.18, 0.55, 0.5, 'sine');
      } else if (mode === 'loud') {
        this.playTone(ctx, 880, now, 0.35, 0.65, 'triangle');
        this.playTone(ctx, 1320, now + 0.12, 0.5, 0.75, 'triangle');
      } else {
        // Normal
        this.playTone(ctx, 880, now, 0.3, 0.3, 'sine');
        this.playTone(ctx, 1320, now + 0.1, 0.4, 0.35, 'sine');
      }
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Piercing alert chime / ringtone for urgent requests & bill requests
  playUrgentAlert(mode: VolumeMode = 'max_cashier') {
    try {
      const ctx = this.initAudio();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (mode === 'max_cashier') {
        // LOUD RESTAURANT POS RINGTONE: 3 rapid bursts of dual-tone alarm rings (RENG RENG RENG!)
        // Lasts ~ 1.8 seconds - IMPOSSIBLE to miss in a noisy restaurant
        const cycles = 3;
        const cycleInterval = 0.55;

        for (let c = 0; c < cycles; c++) {
          const t0 = now + c * cycleInterval;
          // Pulse 1
          this.playTone(ctx, 987.77, t0, 0.14, 0.95, 'square');
          this.playTone(ctx, 1479.98, t0, 0.14, 0.85, 'triangle');

          // Pulse 2
          this.playTone(ctx, 1174.66, t0 + 0.13, 0.14, 1.0, 'square');
          this.playTone(ctx, 1760.0, t0 + 0.13, 0.14, 0.9, 'triangle');

          // Pulse 3 (Climax ring)
          this.playTone(ctx, 1318.51, t0 + 0.26, 0.25, 1.0, 'square');
          this.playTone(ctx, 2093.0, t0 + 0.26, 0.25, 0.95, 'triangle');
        }

        // Heavy mobile vibration
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([300, 100, 300, 100, 500, 150, 500]);
        }
      } else if (mode === 'loud') {
        for (let c = 0; c < 2; c++) {
          const t0 = now + c * 0.45;
          this.playTone(ctx, 880, t0, 0.12, 0.7, 'triangle');
          this.playTone(ctx, 1175, t0 + 0.12, 0.12, 0.75, 'triangle');
          this.playTone(ctx, 1568, t0 + 0.24, 0.18, 0.8, 'triangle');
        }
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 300]);
        }
      } else {
        const tones = [659.25, 880, 1174.66, 880, 1318.51];
        tones.forEach((freq, idx) => {
          this.playTone(ctx, freq, now + idx * 0.09, 0.14, 0.35, 'triangle');
        });
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([150, 100, 200]);
        }
      }
    } catch (e) {
      console.warn('Urgent alert play error:', e);
    }
  }

  public resume() {
    this.initAudio();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
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
  const [volumeMode, setVolumeMode] = useState<VolumeMode>('max_cashier');
  const [isSoundModalOpen, setIsSoundModalOpen] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [urgentAlertBanner, setUrgentAlertBanner] = useState<{
    stationName: string;
    content: string;
    type: ChatMessageType;
  } | null>(null);
  const [soundTestPlaying, setSoundTestPlaying] = useState(false);

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
      const savedVolume = localStorage.getItem('may_chat_volume_mode') as VolumeMode;

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

      if (savedVolume && ['normal', 'loud', 'max_cashier'].includes(savedVolume)) {
        setVolumeMode(savedVolume);
      } else {
        setVolumeMode('max_cashier'); // Default to max_cashier so Thu ngân never misses alerts!
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
          const isUrgentMsg = newMsg.isUrgent || newMsg.type === 'bill_request' || newMsg.type === 'urgent_call';
          if (isUrgentMsg) {
            soundEngine.playUrgentAlert(volumeMode);
            // Show prominent visual banner for Cashier and all staff
            setUrgentAlertBanner({
              stationName: newMsg.stationName,
              content: newMsg.content,
              type: newMsg.type
            });
          } else {
            soundEngine.playChime(volumeMode);
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
  }, [soundEnabled, volumeMode]);

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

    // If selecting Thu Ngân, automatically ensure volumeMode is max_cashier
    if (stationId === 'thu_ngan') {
      setVolumeMode('max_cashier');
      setSoundEnabled(true);
      localStorage.setItem('may_chat_volume_mode', 'max_cashier');
      localStorage.setItem('may_chat_sound', 'true');
    }

    if (staffName) {
      setActiveStaffName(staffName);
      localStorage.setItem('may_chat_staff', staffName);
    }
    setIsStationModalOpen(false);
  };

  // Test ringtone
  const handleTestRingtone = (mode: VolumeMode = volumeMode) => {
    soundEngine.resume();
    setAudioUnlocked(true);
    setSoundTestPlaying(true);
    soundEngine.playUrgentAlert(mode);
    setTimeout(() => {
      setSoundTestPlaying(false);
    }, 2000);
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
    <div className={`max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)] min-h-[550px] bg-white rounded-2xl border border-slate-200/90 shadow-lg overflow-hidden text-slate-800 transition-all ${
      urgentAlertBanner ? 'ring-4 ring-rose-500 shadow-2xl' : ''
    }`}>
      
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

        {/* Right: Sound Level Button, Clear Action */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.resume();
              setAudioUnlocked(true);
              setIsSoundModalOpen(true);
            }}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              !soundEnabled
                ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                : volumeMode === 'max_cashier'
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                  : 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Bấm để cài đặt âm lượng chuông báo Thu Ngân & Thử loa"
          >
            {!soundEnabled ? (
              <VolumeX className="w-4 h-4 text-slate-400" />
            ) : volumeMode === 'max_cashier' ? (
              <div className="flex items-center gap-1">
                <Volume2 className="w-4 h-4 text-amber-300 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
              </div>
            ) : volumeMode === 'loud' ? (
              <Volume2 className="w-4 h-4 text-amber-300" />
            ) : (
              <Volume1 className="w-4 h-4 text-slate-300" />
            )}
            <span className="text-[11px] font-bold">
              {!soundEnabled ? 'Tắt Chuông' : (volumeMode === 'max_cashier' ? 'Chuông Cực Đại' : (volumeMode === 'loud' ? 'Chuông To' : 'Chuông Vừa'))}
            </span>
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

      {/* Autoplay Unlock Notice Banner */}
      {!audioUnlocked && (
        <div 
          onClick={() => {
            soundEngine.resume();
            soundEngine.playChime(volumeMode);
            setAudioUnlocked(true);
          }}
          className="bg-amber-400 hover:bg-amber-500 text-slate-950 px-3 py-1.5 text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-colors shrink-0 shadow-xs"
        >
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <Volume2 className="w-4 h-4 text-slate-950 shrink-0 animate-bounce" />
            <span className="truncate">🔔 Thu Ngân & VIP: Nhấp vào đây để KÍCH HOẠT CHUÔNG TO (Mở quyền âm thanh)</span>
          </div>
          <span className="text-[10px] bg-slate-950 text-white px-2 py-0.5 rounded-md uppercase tracking-wider font-extrabold shrink-0">
            Kích hoạt ngay
          </span>
        </div>
      )}

      {/* Urgent Message Flashing Banner for Cashier / Supervisor */}
      {urgentAlertBanner && (
        <div className="bg-rose-600 text-white px-3 py-2 text-xs flex items-center justify-between gap-2 shadow-md animate-pulse shrink-0 border-b border-rose-700 z-10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 bg-white/20 rounded-md shrink-0 text-sm">🚨</span>
            <div className="min-w-0">
              <p className="font-extrabold truncate">
                [{urgentAlertBanner.stationName}] YÊU CẦU: {urgentAlertBanner.content}
              </p>
              <span className="text-[10px] text-rose-200">Chuông báo dồn dập đang reo để Thu Ngân / Bếp xử lý ngay</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              onClick={() => {
                const target = urgentAlertBanner.stationName;
                handleSendMessage(`[${currentStation.shortName}] Đã tiếp nhận yêu cầu từ ${target}!`, 'resolved', false);
                setUrgentAlertBanner(null);
              }}
              className="bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs h-7 px-2.5 shadow-xs"
            >
              Xác Nhận Đã Nhận
            </Button>
            <button
              onClick={() => setUrgentAlertBanner(null)}
              className="text-white/80 hover:text-white p-1"
              title="Tắt cảnh báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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

      {/* Modal Cài Đặt Âm Lượng Chuông Báo Cho Thu Ngân */}
      <Dialog open={isSoundModalOpen} onOpenChange={setIsSoundModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                <Volume2 className="w-5 h-5" />
              </div>
              <DialogTitle className="text-base font-extrabold text-slate-900">
                Cài Đặt Chuông Báo Thu Ngân
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Tùy chỉnh cường độ chuông to dồn dập giúp Thu Ngân và Bếp luôn nghe rõ ngay cả khi nhà hàng đang đông đúc, ồn ào.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Toggle bật/tắt chuông */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                )}
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Bật âm thanh thông báo</span>
                  <span className="text-[10px] text-slate-500">Phát chuông khi phòng VIP gọi tính tiền, giục món</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextState = !soundEnabled;
                  setSoundEnabled(nextState);
                  localStorage.setItem('may_chat_sound', String(nextState));
                  if (nextState) {
                    soundEngine.resume();
                    soundEngine.playChime(volumeMode);
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  soundEnabled ? 'bg-amber-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    soundEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Các mức âm lượng */}
            <div className="space-y-2">
              <label className="text-[11px] uppercase font-bold text-slate-600 tracking-wider block">
                Chọn Cường Độ Chuông Báo:
              </label>

              {/* Mức 1: Cực Đại - Thu Ngân */}
              <div
                onClick={() => {
                  setVolumeMode('max_cashier');
                  setSoundEnabled(true);
                  localStorage.setItem('may_chat_volume_mode', 'max_cashier');
                  localStorage.setItem('may_chat_sound', 'true');
                  handleTestRingtone('max_cashier');
                }}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  volumeMode === 'max_cashier' && soundEnabled
                    ? 'border-amber-500 bg-amber-50/70 shadow-xs'
                    : 'border-slate-200 hover:border-amber-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🚨</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-amber-950">CỰC ĐẠI - THU NGÂN</span>
                        <span className="text-[10px] bg-red-600 text-white font-extrabold px-1.5 py-0.2 rounded-sm uppercase">
                          Khuyên dùng
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-900/80 mt-0.5 leading-snug">
                        3 hồi chuông báo dồn dập (<span className="font-bold text-amber-950">RENG RENG RENG!</span>) âm sắc bén, tần số xuyên âm thanh ồn ào.
                      </p>
                    </div>
                  </div>
                  {volumeMode === 'max_cashier' && soundEnabled && (
                    <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>

              {/* Mức 2: To Rõ */}
              <div
                onClick={() => {
                  setVolumeMode('loud');
                  setSoundEnabled(true);
                  localStorage.setItem('may_chat_volume_mode', 'loud');
                  localStorage.setItem('may_chat_sound', 'true');
                  handleTestRingtone('loud');
                }}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  volumeMode === 'loud' && soundEnabled
                    ? 'border-amber-500 bg-amber-50/70 shadow-xs'
                    : 'border-slate-200 hover:border-amber-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📢</span>
                    <div>
                      <span className="text-xs font-bold text-slate-900">CHUÔNG TO RÕ</span>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        2 hồi chuông rõ ràng, phù hợp cho phục vụ mang máy tính bảng hoặc quầy Bar.
                      </p>
                    </div>
                  </div>
                  {volumeMode === 'loud' && soundEnabled && (
                    <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>

              {/* Mức 3: Bình Thường */}
              <div
                onClick={() => {
                  setVolumeMode('normal');
                  setSoundEnabled(true);
                  localStorage.setItem('may_chat_volume_mode', 'normal');
                  localStorage.setItem('may_chat_sound', 'true');
                  handleTestRingtone('normal');
                }}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  volumeMode === 'normal' && soundEnabled
                    ? 'border-amber-500 bg-amber-50/70 shadow-xs'
                    : 'border-slate-200 hover:border-amber-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔉</span>
                    <div>
                      <span className="text-xs font-bold text-slate-900">CHUÔNG VỪA PHẢI</span>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Giai điệu ngắn 1 hồi nhẹ nhàng, thích hợp khi ở văn phòng yên tĩnh.
                      </p>
                    </div>
                  </div>
                  {volumeMode === 'normal' && soundEnabled && (
                    <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Nút Test Loa Trực Tiếp */}
            <div className="pt-2">
              <Button
                type="button"
                onClick={() => handleTestRingtone(volumeMode)}
                disabled={soundTestPlaying}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold h-11 rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                {soundTestPlaying ? (
                  <>
                    <Volume2 className="w-5 h-5 animate-ping text-white" />
                    <span>ĐANG REO CHUÔNG TEST (NGHE THỬ)...</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-5 h-5" />
                    <span>🔊 BẤM THỬ CHUÔNG THU NGÂN NGAY (TEST LOA)</span>
                  </>
                )}
              </Button>
            </div>

            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
              <span className="text-amber-600 font-bold shrink-0">💡 Lưu ý:</span>
              <span>
                Máy Thu Ngân nên kết nối loa quầy hoặc để volume thiết bị 100%. Nhấp vào màn hình ít nhất 1 lần để trình duyệt cho phép phát chuông tự động liên tục khi có bill mới.
              </span>
            </div>

            <Button
              type="button"
              onClick={() => setIsSoundModalOpen(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 rounded-xl"
            >
              Đã Xong & Lưu Cài Đặt
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Volume2, VolumeX, Hexagon, AlertCircle, MessageSquare, Users, Eye, X, Maximize2, Trash2, MapPin } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import type { Character, ChatMode } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  characterName?: string;
  isWhisper?: boolean;
  imageUrl?: string; // For inline images in chat
  imageType?: 'npc' | 'item' | 'map' | 'scene';
  isRollResult?: boolean; // For roll result messages
  isSceneChange?: boolean; // For scene transition notifications
  sceneLocation?: string; // Location name for scene change
}

// Theme presets based on location/mood
export type EnvironmentTheme = 'default' | 'cave' | 'forest' | 'ocean' | 'desert' | 'mountain' | 'tavern' | 'dungeon' | 'temple' | 'city' | 'night' | 'dawn' | 'swamp' | 'snow' | 'fire' | 'sky';

export const THEME_STYLES: Record<EnvironmentTheme, { bg: string; border: string; accent: string; glow?: string; vars?: Record<string, string> }> = {
  default: {
    bg: 'bg-zinc-950',
    border: 'border-zinc-800',
    accent: 'border-zinc-800',
    vars: { 
      '--card': '240 10% 3.9%', 
      '--border': '240 3.7% 15.9%', 
      '--muted': '240 3.7% 15.9%',
      '--primary': '38 92% 50%',
      '--ring': '38 92% 50%'
    }
  },
  cave: {
    bg: 'bg-zinc-950',
    border: 'border-zinc-800',
    accent: 'border-amber-900/40',
    glow: 'shadow-[inset_0_0_30px_rgba(180,120,40,0.05)]',
    vars: { 
      '--card': '240 10% 3.9%', 
      '--border': '240 3.7% 15.9%', 
      '--muted': '240 3.7% 15.9%',
      '--primary': '38 92% 50%',
      '--ring': '38 92% 50%'
    }
  },
  forest: {
    bg: 'bg-[#0a1a0a]',
    border: 'border-green-900/50',
    accent: 'border-green-800/40',
    glow: 'shadow-[inset_0_0_30px_rgba(34,120,34,0.08)]',
    vars: { 
      '--card': '120 45% 4%', 
      '--border': '120 45% 15%', 
      '--muted': '120 45% 12%',
      '--primary': '142 76% 36%',
      '--ring': '142 76% 36%'
    }
  },
  ocean: {
    bg: 'bg-[#0a0f1a]',
    border: 'border-blue-900/50',
    accent: 'border-blue-800/40',
    glow: 'shadow-[inset_0_0_30px_rgba(30,80,180,0.08)]',
    vars: { 
      '--card': '220 45% 4%', 
      '--border': '220 45% 15%', 
      '--muted': '220 45% 12%',
      '--primary': '217 91% 60%',
      '--ring': '217 91% 60%'
    }
  },
  desert: {
    bg: 'bg-[#1a1508]',
    border: 'border-amber-800/40',
    accent: 'border-yellow-800/30',
    glow: 'shadow-[inset_0_0_30px_rgba(200,160,40,0.06)]',
    vars: { 
      '--card': '40 45% 4%', 
      '--border': '40 45% 15%', 
      '--muted': '40 45% 12%',
      '--primary': '43 74% 66%',
      '--ring': '43 74% 66%'
    }
  },
  mountain: {
    bg: 'bg-[#0f1015]',
    border: 'border-slate-700/50',
    accent: 'border-slate-600/30',
    glow: 'shadow-[inset_0_0_30px_rgba(100,116,139,0.06)]',
    vars: { 
      '--card': '220 15% 6%', 
      '--border': '220 15% 20%', 
      '--muted': '220 15% 15%',
      '--primary': '215 20% 65%',
      '--ring': '215 20% 65%'
    }
  },
  tavern: {
    bg: 'bg-[#1a1008]',
    border: 'border-amber-800/50',
    accent: 'border-orange-800/30',
    glow: 'shadow-[inset_0_0_30px_rgba(217,119,6,0.08)]',
    vars: { 
      '--card': '25 45% 4%', 
      '--border': '25 45% 15%', 
      '--muted': '25 45% 12%',
      '--primary': '30 80% 55%',
      '--ring': '30 80% 55%'
    }
  },
  dungeon: {
    bg: 'bg-[#0a0808]',
    border: 'border-stone-800/50',
    accent: 'border-red-950/30',
    glow: 'shadow-[inset_0_0_30px_rgba(120,20,20,0.06)]',
    vars: { 
      '--card': '0 15% 4%', 
      '--border': '0 15% 15%', 
      '--muted': '0 15% 12%',
      '--primary': '0 72% 51%',
      '--ring': '0 72% 51%'
    }
  },
  temple: {
    bg: 'bg-[#0f0f18]',
    border: 'border-indigo-900/50',
    accent: 'border-purple-800/30',
    glow: 'shadow-[inset_0_0_30px_rgba(99,102,241,0.08)]',
    vars: { 
      '--card': '240 20% 6%', 
      '--border': '240 20% 20%', 
      '--muted': '240 20% 15%',
      '--primary': '262 83% 58%',
      '--ring': '262 83% 58%'
    }
  },
  city: {
    bg: 'bg-[#0f0f12]',
    border: 'border-zinc-700/50',
    accent: 'border-zinc-600/30',
    glow: 'shadow-[inset_0_0_30px_rgba(161,161,170,0.04)]',
    vars: { 
      '--card': '240 5% 6%', 
      '--border': '240 5% 20%', 
      '--muted': '240 5% 15%',
      '--primary': '240 5% 65%',
      '--ring': '240 5% 65%'
    }
  },
  night: {
    bg: 'bg-[#050510]',
    border: 'border-indigo-950/50',
    accent: 'border-blue-950/30',
    glow: 'shadow-[inset_0_0_30px_rgba(30,30,100,0.08)]',
    vars: { 
      '--card': '240 45% 2%', 
      '--border': '240 45% 10%', 
      '--muted': '240 45% 8%',
      '--primary': '230 100% 67%',
      '--ring': '230 100% 67%'
    }
  },
  dawn: {
    bg: 'bg-[#1a100f]',
    border: 'border-rose-900/40',
    accent: 'border-orange-900/30',
    glow: 'shadow-[inset_0_0_30px_rgba(225,100,50,0.06)]',
    vars: { 
      '--card': '10 45% 4%', 
      '--border': '10 45% 15%', 
      '--muted': '10 45% 12%',
      '--primary': '20 90% 60%',
      '--ring': '20 90% 60%'
    }
  },
  swamp: {
    bg: 'bg-[#0a0f08]',
    border: 'border-lime-950/50',
    accent: 'border-green-950/30',
    glow: 'shadow-[inset_0_0_30px_rgba(80,100,20,0.06)]',
    vars: { 
      '--card': '100 45% 3%', 
      '--border': '100 45% 12%', 
      '--muted': '100 45% 10%',
      '--primary': '80 60% 45%',
      '--ring': '80 60% 45%'
    }
  },
  snow: {
    bg: 'bg-[#0f1218]',
    border: 'border-sky-900/40',
    accent: 'border-cyan-800/30',
    glow: 'shadow-[inset_0_0_30px_rgba(150,200,255,0.06)]',
    vars: { 
      '--card': '210 20% 6%', 
      '--border': '210 20% 20%', 
      '--muted': '210 20% 15%',
      '--primary': '199 89% 48%',
      '--ring': '199 89% 48%'
    }
  },
  fire: {
    bg: 'bg-[#1a0808]',
    border: 'border-red-900/50',
    accent: 'border-orange-800/30',
    glow: 'shadow-[inset_0_0_30px_rgba(220,50,20,0.08)]',
    vars: { 
      '--card': '0 45% 4%', 
      '--border': '0 45% 15%', 
      '--muted': '0 45% 12%',
      '--primary': '10 80% 50%',
      '--ring': '10 80% 50%'
    }
  },
  sky: {
    bg: 'bg-[#08101a]',
    border: 'border-sky-800/40',
    accent: 'border-cyan-700/30',
    glow: 'shadow-[inset_0_0_30px_rgba(56,189,248,0.06)]',
    vars: { 
      '--card': '200 45% 4%', 
      '--border': '200 45% 15%', 
      '--muted': '200 45% 12%',
      '--primary': '199 89% 48%',
      '--ring': '199 89% 48%'
    }
  },
};

const DM_WAITING_MESSAGES = [
  "The DM is rolling dice behind the screen...",
  "The DM is trawling through their notes...",
  "The DM is consulting an ancient tome...",
  "The DM is whispering to a mysterious figure...",
  "The DM is dramatically shuffling papers...",
  "The DM is stroking their chin thoughtfully...",
  "The DM is scribbling something ominously...",
  "The DM is pretending to look up a rule...",
  "The DM is adjusting their reading glasses...",
  "The DM is cackling quietly to themselves...",
  "The DM is flipping through the Monster Manual...",
  "The DM just knocked over their miniatures...",
  "The DM is making their 'thinking' face...",
  "The DM says 'Interesting...' and writes a note...",
  "The DM is hiding something behind the screen...",
  "The DM is counting on their fingers...",
  "The DM just said 'Are you sure?' to nobody...",
  "The DM is re-reading your character sheet...",
];

// ─── Inline Dice Result Widget ──────────────────────────────────
// Parses "[ROLL RESULT] Perception: rolled 18 (14+4) [Advantage: rolled 14 and 7, kept 14]. DC 15: SUCCESS"
// and renders a compact inline dice display
function InlineDiceResult({ content }: { content: string }) {
  // Parse the roll result message (handles both ROLL RESULT and SAVING THROW RESULT)
  const match = content.match(/\[(?:ROLL RESULT|SAVING THROW RESULT)\]\s*(.+?):\s*rolled\s+(\d+)\s*\(([^)]+)\)(.*)$/);
  if (!match) return <p className="text-sm text-muted-foreground">{content}</p>;

  const [, skillName, totalStr, breakdown, rest] = match;
  const total = parseInt(totalStr);
  const advMatch = rest.match(/\[(?:Advantage|Disadvantage):\s*rolled\s+(\d+)\s+and\s+(\d+),\s*kept\s+(\d+)\]/);
  const dcMatch = rest.match(/DC\s+(\d+):\s*(SUCCESS|FAILURE)/);
  const hasAdvantage = rest.includes('Advantage');
  const hasDisadvantage = rest.includes('Disadvantage');

  // Determine if nat 20 or 1
  const baseRoll = breakdown.match(/^(\d+)/)?.[1];
  const rollValue = baseRoll ? parseInt(baseRoll) : total;
  const isNat20 = rollValue === 20 || (advMatch && parseInt(advMatch[3]) === 20);
  const isNat1 = rollValue === 1 || (advMatch && parseInt(advMatch[3]) === 1);

  return (
    <div className="flex items-center gap-3 py-1">
      {/* Die icon */}
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg flex-shrink-0',
        isNat20 ? 'bg-yellow-500/20 text-yellow-300 ring-2 ring-yellow-500/50' :
        isNat1 ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500/50' :
        'bg-primary/15 text-primary ring-1 ring-primary/30'
      )}>
        {total}
      </div>
      {/* Details */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{skillName}</span>
          {(hasAdvantage || hasDisadvantage) && (
            <span className={cn('text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded',
              hasAdvantage ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
            )}>
              {hasAdvantage ? 'ADV' : 'DIS'}
            </span>
          )}
          {dcMatch && (
            <span className={cn('text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded',
              dcMatch[2] === 'SUCCESS' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
            )}>
              DC {dcMatch[1]}: {dcMatch[2]}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {breakdown}
          {advMatch && ` (${advMatch[1]}/${advMatch[2]} → ${advMatch[3]})`}
        </span>
      </div>
    </div>
  );
}

// Tool result returned by onToolCall to signal that the AI should continue narrating
export interface ToolCallResult {
  id: string;       // The tool_call_id from the AI provider
  result: string;   // Summary of what happened (sent back to AI as context)
  forceNextTool?: string; // If set, force the AI to call this tool next (e.g. 'advanceTurn')
}

interface DMChatProps {
  campaignId: string;
  characters?: Character[];
  campaign?: { name: string; worldSetting?: string } | null;
  selectedCharacter?: Character | null;
  onSelectCharacter?: (character: Character) => void;
  suggestedActions?: string[];
  onRefreshSuggestions?: () => void;
  systemMessage?: { content: string; timestamp: number };
  onToolCall?: (toolCalls: any[]) => Promise<ToolCallResult[] | void>;
  environmentTheme?: EnvironmentTheme;
  onChatImage?: (imageUrl: string) => void;
}

export function DMChat({
  campaignId,
  characters = [],
  campaign,
  selectedCharacter,
  onSelectCharacter,
  suggestedActions = [],
  onRefreshSuggestions,
  systemMessage,
  onToolCall,
  environmentTheme = 'default',
  onChatImage,
}: DMChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('character');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const assistantMessageIdRef = useRef<string | null>(null);
  const handleSubmitRef = useRef<(() => void) | null>(null);
  const lastSystemMessageTimestamp = useRef<number>(0);
  const sendMessageDirectRef = useRef<((content: string) => Promise<void>) | null>(null);

  const theme = THEME_STYLES[environmentTheme] || THEME_STYLES.default;

  const [dmWaitingMessage, setDmWaitingMessage] = useState('');

  // Cycle through humorous DM waiting messages while loading
  useEffect(() => {
    if (!isLoading) {
      setDmWaitingMessage('');
      return;
    }
    // Pick initial message
    setDmWaitingMessage(DM_WAITING_MESSAGES[Math.floor(Math.random() * DM_WAITING_MESSAGES.length)]);

    const interval = setInterval(() => {
      setDmWaitingMessage(DM_WAITING_MESSAGES[Math.floor(Math.random() * DM_WAITING_MESSAGES.length)]);
    }, 3000);

    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/chat?campaignId=${campaignId}`);
        const data = await res.json();
        if (data.success && data.data) {
          // Filter out tool messages — they're internal tool call results, not chat content
          const chatMessages = data.data.filter((m: { role: string }) => m.role !== 'tool');
          setMessages(chatMessages.map((m: { id: string; role: string; content: string }) => {
            const isRollResult = m.content.startsWith('[ROLL RESULT]');
            const sceneMatch = m.content.match(/^\[SCENE CHANGE(?:: (.+?))?\]/);
            return {
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              isRollResult,
              isSceneChange: !!sceneMatch,
              sceneLocation: sceneMatch?.[1],
            };
          }));
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };
    loadMessages();
  }, [campaignId]);

  // Auto-scroll to bottom when messages change
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window && ttsEnabled) {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[#*_`]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Male'));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      window.speechSynthesis.speak(utterance);
    }
  }, [ttsEnabled]);

  // Add image to chat from external source (e.g., tool call generating an image)
  const addImageToChat = useCallback((imageUrl: string, imageType: 'npc' | 'item' | 'map' | 'scene', caption?: string) => {
    const imageMessage: Message = {
      id: `img-${Date.now()}`,
      role: 'assistant',
      content: caption || '',
      imageUrl,
      imageType,
    };
    setMessages(prev => [...prev, imageMessage]);
  }, []);

  // Expose addImageToChat for parent component
  useEffect(() => {
    (window as any).__addChatImage = addImageToChat;
    return () => { delete (window as any).__addChatImage; };
  }, [addImageToChat]);

  // ─── Core stream handler: reads one API response, returns pending tool results ───
  const streamOneResponse = useCallback(async (
    response: Response,
    messageId: string,
  ): Promise<{ content: string; toolResults: ToolCallResult[] }> => {
    let content = '';
    const toolResults: ToolCallResult[] = [];
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          if (line.startsWith('0:')) {
            const text = JSON.parse(line.slice(2));
            content += text;

            setMessages(prev => {
              const idx = prev.findIndex(m => m.id === messageId);
              if (idx > -1) {
                return prev.map((m, i) => i === idx ? { ...m, content } : m);
              }
              return [...prev, { id: messageId, role: 'assistant' as const, content }];
            });
          } else if (line.startsWith('1:')) {
            try {
              const toolCalls = JSON.parse(line.slice(2));
              console.log('Received tool calls:', toolCalls);
              if (onToolCall) {
                const results = await onToolCall(toolCalls);
                if (results && results.length > 0) {
                  toolResults.push(...results);
                }
              }
            } catch (parseError) {
              console.error('Failed to parse tool call JSON:', parseError);
            }
          }
        }
      }
    }
    return { content, toolResults };
  }, [onToolCall]);

  // ─── Full stream + auto-continuation loop ──────────────────────────
  // After the initial response, if there are tool results that need
  // AI continuation, we send them back and stream the follow-up.
  const processApiStream = useCallback(async (
    initialResponse: Response,
    initialMessageId: string,
  ): Promise<string> => {
    const { content, toolResults } = await streamOneResponse(initialResponse, initialMessageId);
    if (content) speak(content);

    let pendingResults = [...toolResults];
    let maxContinuations = 20; // Safety cap — must be high enough for full NPC combat rounds
    let npcActionsThisChain = 0; // Track NPC actions to prevent infinite loops
    const MAX_NPC_ACTIONS_PER_CHAIN = 8; // Max NPC turns before forcing a break

    while (pendingResults.length > 0 && maxContinuations-- > 0) {
      const results = [...pendingResults];
      pendingResults = [];

      // Brief pause to let state updates settle
      await new Promise(r => setTimeout(r, 80));

      // Use the LAST tool result's forceNextTool — it represents the latest combat state
      const forceNextTool = [...results].reverse().find(r => r.forceNextTool)?.forceNextTool;

      // Count NPC actions and break if we've exceeded the limit per chain
      // We check for both npcAction being forced OR being in results
      const isNPCStep = forceNextTool === 'npcAction' || results.some(r => r.id.includes('npcAction'));
      if (isNPCStep) {
        npcActionsThisChain++;
        if (npcActionsThisChain > MAX_NPC_ACTIONS_PER_CHAIN) {
          console.warn(`[DM Chat] NPC action limit reached (${MAX_NPC_ACTIONS_PER_CHAIN}). Breaking continuation chain to prevent infinite loop.`);
          break;
        }
      }
      const contMessageId = `assistant-${Date.now()}-cont`;

      let retryCount = 0;
      const maxRetries = 2;
      let success = false;

      while (retryCount <= maxRetries && !success) {
        try {
          const contRes = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaignId,
              toolResponses: results.map(r => ({ tool_call_id: r.id, content: r.result })),
              ...(forceNextTool ? { forceNextTool } : {}),
            }),
            signal: abortControllerRef.current?.signal,
          });

          if (!contRes.ok) {
            retryCount++;
            if (retryCount > maxRetries) {
              console.error('Continuation failed after retries, status:', contRes.status);
              break;
            }
            await new Promise(r => setTimeout(r, 500 * retryCount)); // Back off
            continue;
          }

          const continuation = await streamOneResponse(contRes, contMessageId);
          if (continuation.content) speak(continuation.content);
          pendingResults = continuation.toolResults;
          success = true;
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') break;
          retryCount++;
          if (retryCount > maxRetries) {
            console.error('Tool continuation failed after retries:', err);
            break;
          }
          await new Promise(r => setTimeout(r, 500 * retryCount));
        }
      }

      if (!success) break;
    }

    return content;
  }, [campaignId, streamOneResponse, speak]);

  // Send a message directly to the API without showing it as a user bubble
  // Used for internal messages like roll results, combat updates, etc.
  const sendMessageDirect = useCallback(async (content: string) => {
    // Use functional check to avoid stale closure on isLoading
    setIsLoading(prev => {
      if (prev) return prev; // Already loading, skip
      return true;
    });
    setError(null);

    assistantMessageIdRef.current = `assistant-${Date.now()}`;
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, message: content }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }

      await processApiStream(res, assistantMessageIdRef.current!);
      onRefreshSuggestions?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(errorMessage);
      if (assistantMessageIdRef.current) {
        setMessages(prev => {
          const msg = prev.find(m => m.id === assistantMessageIdRef.current);
          if (msg && !msg.content) return prev.filter(m => m.id !== assistantMessageIdRef.current);
          return prev;
        });
      }
    } finally {
      setIsLoading(false);
      assistantMessageIdRef.current = null;
    }
  }, [campaignId, processApiStream, onRefreshSuggestions]);

  // Keep ref in sync (avoids re-triggering effects when isLoading changes)
  useEffect(() => {
    sendMessageDirectRef.current = sendMessageDirect;
  }, [sendMessageDirect]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const messageToSend = input.trim();
    if (!messageToSend || isLoading) return;

    setError(null);
    setIsLoading(true);
    setInput('');

    const isWhisper = chatMode === 'whisper';
    const characterName = selectedCharacter?.name;

    const isRollResult = messageToSend.startsWith('[ROLL RESULT]');
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageToSend,
      characterName: isWhisper ? undefined : characterName,
      isWhisper,
      isRollResult,
    };
    setMessages(prev => [...prev, userMessage]);

    assistantMessageIdRef.current = `assistant-${Date.now()}`;
    abortControllerRef.current = new AbortController();

    let formattedMessage = messageToSend;
    if (isWhisper) {
      formattedMessage = `[WHISPER TO DM - Out of character question, do not progress the story]: ${messageToSend}`;
    } else if (characterName) {
      formattedMessage = `[${characterName} says/does]: ${messageToSend}`;
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          message: formattedMessage,
          characterId: selectedCharacter?.id,
          isWhisper,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }

      await processApiStream(res, assistantMessageIdRef.current!);
      onRefreshSuggestions?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(errorMessage);
      if (assistantMessageIdRef.current) {
        setMessages(prev => {
          const msg = prev.find(m => m.id === assistantMessageIdRef.current);
          if (msg && !msg.content) return prev.filter(m => m.id !== assistantMessageIdRef.current);
          return prev;
        });
      }
    } finally {
      setIsLoading(false);
      assistantMessageIdRef.current = null;
    }
  };

  // Update the ref when handleSubmit changes
  useEffect(() => {
    handleSubmitRef.current = () => handleSubmit();
  }, [handleSubmit]);

  // Auto-send systemMessage when it changes
  // Uses refs to avoid dependency on sendMessageDirect (which changes with isLoading)
  useEffect(() => {
    if (!systemMessage || !systemMessage.content) return;
    // Guard: only process each timestamp once to prevent infinite loops
    if (systemMessage.timestamp <= lastSystemMessageTimestamp.current) return;
    lastSystemMessageTimestamp.current = systemMessage.timestamp;

    const content = systemMessage.content;

    // Scene change notifications — inject a visible divider, don't send to AI
    const sceneMatch = content.match(/^\[SCENE CHANGE(?:: (.+?))?\]/);
    if (sceneMatch) {
      setMessages(prev => [...prev, {
        id: `scene-${Date.now()}`,
        role: 'assistant' as const,
        content: content.replace(/^\[SCENE CHANGE(?:: .+?)?\]\s*/, ''),
        isSceneChange: true,
        sceneLocation: sceneMatch[1],
      }]);
      return;
    }

    // Don't show [ROLL RESULT] or [NPC COMBAT ACTION] or [COMBAT STARTED] etc as user bubbles
    const isInternalMessage = content.startsWith('[');

    if (isInternalMessage) {
      // For roll results, show a compact inline message in chat
      const isRollResult = content.startsWith('[ROLL RESULT]') || content.startsWith('[SAVING THROW RESULT]');
      if (isRollResult) {
        setMessages(prev => [...prev, {
          id: `roll-result-${Date.now()}`,
          role: 'user' as const,
          content: content,
          isRollResult: true,
        }]);
      }

      // Send directly as context without showing as user bubble
      sendMessageDirectRef.current?.(content);
    } else {
      // Send as regular user message
      setInput(content);
      setTimeout(() => {
        handleSubmitRef.current?.();
      }, 50);
    }
  }, [systemMessage?.timestamp]);

  const clearChat = useCallback(async () => {
    if (!confirm('Clear all chat history for this campaign? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/chat', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });
      if (res.ok) {
        setMessages([]);
        setError(null);
        lastSystemMessageTimestamp.current = 0;
      }
    } catch (err) {
      console.error('Failed to clear chat:', err);
    }
  }, [campaignId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleActionClick = (action: string) => {
    setInput(action);
    inputRef.current?.focus();
  };

  // Custom image renderer for markdown
  const MarkdownImage = ({ src, alt }: { src?: string; alt?: string }) => {
    if (!src) return null;
    return (
      <div
        className="rounded-lg overflow-hidden my-2 cursor-pointer group relative inline-block"
        onClick={() => setLightboxUrl(src)}
      >
        <img
          src={src}
          alt={alt || 'Generated image'}
          className="max-w-full max-h-64 object-cover rounded-lg transition-transform group-hover:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={cn('flex flex-col h-full rounded-lg border transition-all duration-700', theme.bg, theme.border, theme.glow)}>
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 && !isLoading && (
              <div className="text-center text-muted-foreground py-16 flex flex-col items-center gap-4">
                <Hexagon className="w-16 h-16 opacity-30" />
                <p className="text-2xl font-medieval text-foreground/80">Your adventure awaits...</p>
                <p className="text-sm max-w-xs">
                  The world is set. Your character stands ready. What happens next is up to you.
                </p>
                <button
                  onClick={() => {
                    setMessages([]); // Clear local state for immediate feedback
                    const prompt = `[NEW SESSION] The adventure begins. Set the opening scene for "${campaign?.name || 'the campaign'}" in ${campaign?.worldSetting || 'a fantasy world'}. Call setScene with the initial location, then provide a vivid opening narration.`;
                    sendMessageDirectRef.current?.(prompt);
                  }}
                  className="mt-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 font-medieval"
                >
                  Begin Adventure
                </button>
              </div>
            )}

            {messages.filter(m => (m.role as string) !== 'tool').map(message => {
              // Scene change divider
              if (message.isSceneChange) {
                return (
                  <div key={message.id} className="flex items-center gap-3 py-3 my-2">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                      <MapPin className="w-3 h-3 text-primary" />
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                        {message.sceneLocation || 'New Scene'}
                      </span>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                  </div>
                );
              }

              // Find avatar for character messages
              const charAvatar = message.role === 'user' && message.characterName
                ? characters.find(c => c.name === message.characterName)?.portraitUrl
                : undefined;

              return (
              <div
                key={message.id}
                className={cn('flex gap-2', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {/* Character avatar for user messages */}
                {message.role === 'user' && charAvatar && (
                  <div className="flex-shrink-0 self-end order-2">
                    <img src={charAvatar} alt={message.characterName || ''} className="w-8 h-8 rounded-full object-cover border border-primary/30" />
                  </div>
                )}

                <div
                  className={cn(
                    'max-w-[75%] rounded-lg px-4 py-3',
                    message.isRollResult
                      ? 'bg-transparent border-0 px-0 py-1'
                      : message.role === 'user'
                      ? message.isWhisper
                        ? 'bg-amber-500/20 border border-amber-500/50 text-foreground'
                        : 'bg-primary text-primary-foreground'
                      : 'bg-muted/80',
                    message.role === 'user' && charAvatar ? 'order-1' : ''
                  )}
                >
                  {message.role === 'user' && (message.characterName || message.isWhisper) && (
                    <div className="text-xs opacity-70 mb-1 font-medium">
                      {message.isWhisper ? (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Whisper to DM
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          {!charAvatar && <Users className="w-3 h-3" />}
                          {message.characterName}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Inline image in message */}
                  {message.imageUrl && (
                    <div
                      className="rounded-lg overflow-hidden mb-2 cursor-pointer group relative"
                      onClick={() => setLightboxUrl(message.imageUrl!)}
                    >
                      <img
                        src={message.imageUrl}
                        alt={message.imageType || 'Generated image'}
                        className="max-w-full max-h-48 object-cover rounded-lg transition-transform group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                      </div>
                      {message.imageType && (
                        <Badge className="absolute top-2 left-2 text-xs capitalize" variant="secondary">
                          {message.imageType}
                        </Badge>
                      )}
                    </div>
                  )}

                  {message.isRollResult ? (
                    <InlineDiceResult content={message.content} />
                  ) : message.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {message.content ? (
                        <ReactMarkdown
                          components={{
                            img: ({ src, alt }) => <MarkdownImage src={typeof src === 'string' ? src : undefined} alt={typeof alt === 'string' ? alt : undefined} />,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      ) : (
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {dmWaitingMessage || 'Thinking...'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
              </div>
              );
            })}

            {isLoading && !messages.some(m => m.id === assistantMessageIdRef.current) && (
              <div className="flex justify-start">
                <div className="max-w-[75%] rounded-lg px-4 py-3 bg-muted/80">
                  <span className="flex items-center gap-2 text-muted-foreground text-sm italic">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {dmWaitingMessage || 'The DM is preparing...'}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Error</p>
                  <p className="text-sm">{error}</p>
                  {(error.includes('API key') || error.includes('provider') || error.includes('decrypt') || error.includes('configured')) && (
                    <p className="text-sm mt-2">
                      Please check your AI settings in{' '}
                      <Button variant="link" asChild className="p-0 h-auto">
                        <Link href="/settings">Global Settings</Link>
                      </Button>
                      .
                    </p>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {suggestedActions.length > 0 && !isLoading && (
          <div className="px-4 py-2 border-t border-inherit">
            <div className="flex flex-wrap gap-2">
              {suggestedActions.map((action, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => handleActionClick(action)}
                  disabled={isLoading}
                >
                  {action}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Mode & Character Selector */}
        <div className="px-4 py-2 border-t border-inherit bg-black/10">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Mode:</span>
              <div className="flex rounded-md border">
                <Button
                  type="button"
                  variant={chatMode === 'character' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-r-none h-7 px-3"
                  onClick={() => setChatMode('character')}
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  In Character
                </Button>
                <Button
                  type="button"
                  variant={chatMode === 'whisper' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-l-none h-7 px-3 border-l"
                  onClick={() => setChatMode('whisper')}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Whisper to DM
                </Button>
              </div>
            </div>

            {chatMode === 'character' && characters.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Speaking as:</span>
                <Select
                  value={selectedCharacter?.id || ''}
                  onValueChange={(value) => {
                    const char = characters.find(c => c.id === value);
                    if (char && onSelectCharacter) {
                      onSelectCharacter(char);
                    }
                  }}
                >
                  <SelectTrigger className="w-[180px] h-7 text-sm">
                    <SelectValue placeholder="Select character" />
                  </SelectTrigger>
                  <SelectContent>
                    {characters.map((char) => (
                      <SelectItem key={char.id} value={char.id}>
                        <span className="flex items-center gap-2">
                          <Users className="w-3 h-3" />
                          {char.name}
                          <Badge variant="outline" className="ml-1 text-xs">
                            Lvl {char.level} {char.class}
                          </Badge>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {chatMode === 'whisper' && (
              <Badge variant="secondary" className="text-xs">
                <Eye className="w-3 h-3 mr-1" />
                Out of character - won't progress story
              </Badge>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-inherit">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={chatMode === 'whisper' ? "Ask the DM something (out of character)..." : `What does ${selectedCharacter?.name || 'your character'} do?`}
              className="min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={isLoading || !input.trim()}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
              <Button
                type="button"
                variant={ttsEnabled ? 'default' : 'outline'}
                size="icon"
                onClick={() => setTtsEnabled(!ttsEnabled)}
                title={ttsEnabled ? 'Disable voice' : 'Enable voice'}
              >
                {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={clearChat}
                title="Clear chat history"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Lightbox for chat images */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="w-6 h-6" />
          </Button>
          <img
            src={lightboxUrl}
            alt="Enlarged image"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

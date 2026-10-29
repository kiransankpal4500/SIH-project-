/**
 * OceanScope AI Research Assistant (Phases 1, 2, 3)
 * Professional scientific research interface grounded in real GEBCO, INCOIS HYCOM,
 * and Argo profiling data with automated Google Gemini reasoning.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useOceanContext } from '../../store/OceanContext';
import {
  assistantService,
  ChatMessage,
  AssistantStatusResponse,
} from '../../services/assistantService';
import {
  Sparkles,
  Send,
  RotateCcw,
  MapPin,
  Layers,
  Thermometer,
  Droplets,
  Compass,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Activity,
  ArrowRight,
  Database,
  Info,
  Clock,
  ShieldCheck,
  Scale,
  FileText,
  BarChart3,
} from 'lucide-react';
import { formatCoordinates, formatValue } from '../../utils/formatters';
import { LocationCompareTab } from './components/LocationCompareTab';
import { DepthLabTab } from './components/DepthLabTab';
import { ReportGeneratorTab } from './components/ReportGeneratorTab';

type ResearchLabTab = 'chat' | 'compare' | 'depth' | 'report';

const SUGGESTED_QUESTIONS = [
  'What is the ocean depth at this location?',
  'Explain the temperature and salinity here.',
  'What do the ocean currents indicate?',
  'Analyze relationship between temperature, salinity, and mixed layer depth.',
  'Correlate seafloor bathymetry with current velocity patterns.',
  'Evaluate sea surface height vs. subsurface stratification.',
];


export const AssistantPage: React.FC = () => {
  const { state } = useOceanContext();
  const location = useLocation();

  // Determine active coordinates from OceanContext or URL parameters
  const [activeCoords, setActiveCoords] = useState<{ lat: number; lon: number } | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const latStr = params.get('lat');
      const lonStr = params.get('lon');
      if (latStr && lonStr) {
        const lat = parseFloat(latStr);
        const lon = parseFloat(lonStr);
        if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
      }
    }
    if (state.selectedRiskLocation) {
      return { lat: state.selectedRiskLocation.lat, lon: state.selectedRiskLocation.lon };
    }
    if (state.selectedLiveArgoProfile?.latitude != null && state.selectedLiveArgoProfile?.longitude != null) {
      return {
        lat: state.selectedLiveArgoProfile.latitude,
        lon: state.selectedLiveArgoProfile.longitude,
      };
    }
    return null;
  });

  // Keep coords updated if OceanContext changes
  useEffect(() => {
    if (state.selectedRiskLocation) {
      setActiveCoords({ lat: state.selectedRiskLocation.lat, lon: state.selectedRiskLocation.lon });
    } else if (state.selectedLiveArgoProfile?.latitude != null && state.selectedLiveArgoProfile?.longitude != null) {
      setActiveCoords({
        lat: state.selectedLiveArgoProfile.latitude,
        lon: state.selectedLiveArgoProfile.longitude,
      });
    }
  }, [state.selectedRiskLocation, state.selectedLiveArgoProfile]);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        'Welcome to the **OceanScope AI Research Assistant**.\n\n' +
        'I analyze multidimensional oceanographic telemetry—including GEBCO bathymetric grids, INCOIS HYCOM numerical model forecasts, and in-situ Argo profiling floats.\n\n' +
        'Select a location on the 3D globe or ask any general physical oceanography question below.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [activeTab, setActiveTab] = useState<ResearchLabTab>('chat');
  const [inputQuestion, setInputQuestion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [serviceStatus, setServiceStatus] = useState<AssistantStatusResponse | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [expandedDataMsgId, setExpandedDataMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Fetch backend assistant readiness status
  useEffect(() => {
    let mounted = true;
    assistantService
      .getStatus()
      .then((res) => {
        if (mounted) setServiceStatus(res);
      })
      .catch((err) => {
        console.warn('[AssistantPage] Status check error:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSendMessage = async (customText?: string) => {
    const questionToSend = (customText || inputQuestion).trim();
    if (!questionToSend || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: questionToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setGlobalError(null);
    setIsLoading(true);

    // Build bounded conversation history
    const conversationHistory = messages
      .filter((m) => !m.isError)
      .slice(-10)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    try {
      const response = await assistantService.sendMessage({
        question: questionToSend,
        latitude: activeCoords?.lat,
        longitude: activeCoords?.lon,
        depth: state.selectedDepth,
        conversation_history: conversationHistory,
      });

      const assistantMsg: ChatMessage = {
        id: response.request_id || `asst-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dataContext: response.data_context,
        sources: response.sources,
        timestamps: response.timestamps,
        limitations: response.limitations,
        requestId: response.request_id,
        modelUsed: response.metadata?.model,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('[AssistantPage] Query error:', err);
      const errorMsgText = err.message || 'Failed to communicate with research assistant service';
      setGlobalError(errorMsgText);

      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `**Service Alert:** ${errorMsgText}. Please check the backend connection or try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewConversation = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content:
          'New research session started. How can I assist with your oceanographic investigation today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setInputQuestion('');
    setGlobalError(null);
  };

  const toggleDataContext = (msgId: string) => {
    setExpandedDataMsgId((prev) => (prev === msgId ? null : msgId));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-8">
      {/* ─── HEADER BAR ─── */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-[0_2px_10px_rgba(15,23,42,0.06)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-[#E0F2FE] text-[#0B84C6] rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-[#172033] tracking-tight">
              OceanScope AI Research Assistant
            </h1>
            {serviceStatus?.gemini_active ? (
              <span className="px-2 py-0.5 bg-[#DCFCE7] text-[#15803D] text-[11px] font-semibold rounded-full flex items-center gap-1 border border-[#BBF7D0]">
                <CheckCircle2 className="w-3 h-3" />
                Gemini Active
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-[#EFF6FF] text-[#0B84C6] text-[11px] font-semibold rounded-full border border-[#BFDBFE]">
                Phase 2/3 Ready
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748B]">
            Investigate oceanographic conditions, bathymetry, and physical parameters using verified observational data and numerical models.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleNewConversation}
            className="px-3 py-2 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#172033] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            title="Start fresh conversation"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#64748B]" />
            <span>New Chat</span>
          </button>
          <Link
            to="/explorer"
            className="px-3 py-2 bg-[#0B84C6] hover:bg-[#0284C7] text-[#FFFFFF] text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            title="Open 3D Globe Explorer"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Globe Explorer</span>
          </Link>
        </div>
      </div>

      {/* ─── SPATIAL CONTEXT PANEL (Connected to OceanContext) ─── */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 shadow-[0_2px_10px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#F1F5F9] text-[#0B84C6] rounded-md">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                Current Research Location
              </div>
              <div className="text-base font-bold text-[#172033]">
                {activeCoords
                  ? formatCoordinates(activeCoords.lat, activeCoords.lon)
                  : 'No coordinates selected in Explorer'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs">
              <span className="text-[#64748B] text-[10px] block">Depth Level</span>
              <span className="font-semibold text-[#172033]">{state.selectedDepth}m</span>
            </div>

            <div className="px-2.5 py-1 bg-[#EFF6FF] border border-[#BFDBFE] rounded-md text-xs">
              <span className="text-[#64748B] text-[10px] block">Telemetry Mode</span>
              <span className="font-semibold text-[#0B84C6]">
                {state.isLiveDataMode ? 'INCOIS ERDDAP Live' : 'INCOIS HYCOM Forecast'}
              </span>
            </div>

            <div className="px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs">
              <span className="text-[#64748B] text-[10px] block">Bathymetry Grid</span>
              <span className="font-semibold text-[#172033]">GEBCO 2024</span>
            </div>

            {!activeCoords && (
              <Link
                to="/explorer"
                className="text-xs text-[#0B84C6] hover:underline font-semibold flex items-center gap-1 ml-2"
              >
                <span>Select location on globe</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ─── RESEARCH LAB TAB NAVIGATION ─── */}
      <div className="flex border-b border-[#E2E8F0] gap-1 bg-[#FFFFFF] px-3 pt-2 rounded-xl shadow-[0_2px_10px_rgba(15,23,42,0.04)] print:hidden">
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'chat'
              ? 'border-[#0B84C6] text-[#0B84C6] bg-[#F0F9FF]'
              : 'border-transparent text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Research Chat</span>
        </button>

        <button
          onClick={() => setActiveTab('compare')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'compare'
              ? 'border-[#0B84C6] text-[#0B84C6] bg-[#F0F9FF]'
              : 'border-transparent text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC]'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Location Comparison</span>
        </button>

        <button
          onClick={() => setActiveTab('depth')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'depth'
              ? 'border-[#0B84C6] text-[#0B84C6] bg-[#F0F9FF]'
              : 'border-transparent text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC]'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Vertical Depth Lab</span>
        </button>

        <button
          onClick={() => setActiveTab('report')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'report'
              ? 'border-[#0B84C6] text-[#0B84C6] bg-[#F0F9FF]'
              : 'border-transparent text-[#64748B] hover:text-[#172033] hover:bg-[#F8FAFC]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Report Generator</span>
        </button>
      </div>

      {/* ─── TAB 1: CHAT CONVERSATION AREA ─── */}
      {activeTab === 'chat' && (
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl shadow-[0_2px_10px_rgba(15,23,42,0.06)] flex flex-col h-[560px] overflow-hidden">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#F8FAFC]/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3.5 text-xs sm:text-sm leading-relaxed shadow-xs transition-all ${
                    msg.role === 'user'
                      ? 'bg-[#0B84C6] text-[#FFFFFF] rounded-br-xs'
                      : msg.isError
                      ? 'bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded-bl-xs'
                      : 'bg-[#FFFFFF] border border-[#E2E8F0] text-[#172033] rounded-bl-xs'
                  }`}
                >
                  {/* Assistant Origin Tag */}
                  {msg.role === 'assistant' && (
                    <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#F1F5F9] text-[11px] text-[#64748B]">
                      <span className={`flex items-center gap-1 font-semibold ${msg.modelUsed?.includes('Fallback') ? 'text-[#D97706]' : 'text-[#0B84C6]'}`}>
                        {msg.modelUsed?.includes('Fallback') ? (
                          <AlertCircle className="w-3 h-3 text-[#D97706]" />
                        ) : (
                          <Sparkles className="w-3 h-3 text-[#0B84C6]" />
                        )}
                        {msg.modelUsed || 'OceanScope Assistant'}
                      </span>
                      <span className="flex items-center gap-1 text-[10px]">
                        <Clock className="w-2.5 h-2.5" />
                        {msg.timestamp}
                      </span>
                    </div>
                  )}

                  {/* Safe Markdown-like Formatted Body */}
                  <FormattedMessageContent content={msg.content} isUser={msg.role === 'user'} />

                  {/* Retry Option for Fallback Messages */}
                  {msg.role === 'assistant' && msg.modelUsed?.includes('Fallback') && (
                    <div className="mt-2.5 pt-2 border-t border-[#E2E8F0]/60 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[#D97706] font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        AI synthesis unavailable. Raw telemetry preserved.
                      </span>
                      <button
                        onClick={() => {
                          const idx = messages.indexOf(msg);
                          const prevUser = messages.slice(0, idx).reverse().find((m) => m.role === 'user');
                          if (prevUser) {
                            handleSendMessage(prevUser.content);
                          }
                        }}
                        className="px-2.5 py-1 bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#0B84C6] border border-[#BFDBFE] rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors"
                        title="Retry sending inquiry to Gemini"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Retry Synthesis</span>
                      </button>
                    </div>
                  )}

                  {/* Supporting Real Data Context Drawer (Phase 2 & 3) */}
                  {msg.dataContext && Object.keys(msg.dataContext).length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[#E2E8F0]/70">
                      <button
                        onClick={() => toggleDataContext(msg.id)}
                        className="text-[11px] font-semibold text-[#0B84C6] hover:text-[#0284C7] flex items-center justify-between w-full py-1"
                      >
                        <span className="flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          <span>Supporting Telemetry ({Object.keys(msg.dataContext).length} parameters)</span>
                        </span>
                        {expandedDataMsgId === msg.id ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {expandedDataMsgId === msg.id && (
                        <div className="mt-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 text-xs space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            {msg.dataContext.bathymetry?.value != null && (
                              <div className="p-1.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded">
                                <span className="text-[#64748B] block text-[10px]">Seabed Depth</span>
                                <span className="font-bold text-[#172033]">
                                  {msg.dataContext.bathymetry.value} m
                                </span>
                              </div>
                            )}
                            {msg.dataContext.temperature?.value != null && (
                              <div className="p-1.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded">
                                <span className="text-[#64748B] block text-[10px]">Temperature</span>
                                <span className="font-bold text-[#DC2626]">
                                  {formatValue(msg.dataContext.temperature.value, '°C')}
                                </span>
                              </div>
                            )}
                            {msg.dataContext.salinity?.value != null && (
                              <div className="p-1.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded">
                                <span className="text-[#64748B] block text-[10px]">Salinity</span>
                                <span className="font-bold text-[#0B84C6]">
                                  {formatValue(msg.dataContext.salinity.value, 'PSU')}
                                </span>
                              </div>
                            )}
                            {msg.dataContext.current?.speed_m_s != null && (
                              <div className="p-1.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded">
                                <span className="text-[#64748B] block text-[10px]">Current Velocity</span>
                                <span className="font-bold text-[#172033]">
                                  {msg.dataContext.current.speed_m_s.toFixed(3)} m/s
                                </span>
                              </div>
                            )}
                          </div>

                          {msg.sources && msg.sources.length > 0 && (
                            <div className="text-[10px] text-[#64748B] pt-1 border-t border-[#E2E8F0]">
                              <strong>Sources:</strong> {msg.sources.join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start">
                <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl rounded-bl-xs px-4 py-3 text-xs shadow-xs flex items-center gap-2.5 text-[#64748B]">
                  <div className="w-2 h-2 rounded-full bg-[#0B84C6] animate-ping" />
                  <span>Querying real GEBCO & HYCOM telemetry and synthesizing response...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ─── SUGGESTED QUESTIONS CHIPS ─── */}
          <div className="px-4 py-2 bg-[#FFFFFF] border-t border-[#E2E8F0] overflow-x-auto flex items-center gap-1.5 shrink-0 scrollbar-none">
            <span className="text-[11px] font-semibold text-[#64748B] shrink-0 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#0B84C6]" />
              Suggestions:
            </span>
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                disabled={isLoading}
                className="px-2.5 py-1 bg-[#F1F5F9] hover:bg-[#E0F2FE] hover:text-[#0B84C6] text-[#475569] text-xs rounded-full whitespace-nowrap transition-colors shrink-0 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          {/* ─── INPUT AREA ─── */}
          <div className="p-3 bg-[#FFFFFF] border-t border-[#E2E8F0] flex items-end gap-2 shrink-0">
            <textarea
              ref={textareaRef}
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about ocean depth, temperature, currents, bathymetry, or parameter relationships... (Enter to send)"
              rows={2}
              disabled={isLoading}
              className="flex-1 resize-none bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#172033] focus:outline-hidden focus:ring-2 focus:ring-[#0B84C6] focus:bg-[#FFFFFF] transition-all disabled:opacity-50"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputQuestion.trim() || isLoading}
              className="px-4 py-2.5 bg-[#0B84C6] hover:bg-[#0284C7] disabled:bg-[#94A3B8] text-[#FFFFFF] rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs shrink-0 self-stretch justify-center"
              title="Send inquiry"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── TAB 2: LOCATION COMPARISON ─── */}
      {activeTab === 'compare' && (
        <LocationCompareTab activeCoords={activeCoords} activeDepth={state.selectedDepth} />
      )}

      {/* ─── TAB 3: VERTICAL DEPTH LAB ─── */}
      {activeTab === 'depth' && (
        <DepthLabTab
          activeCoords={activeCoords}
          onAskInChat={(q) => {
            setActiveTab('chat');
            handleSendMessage(q);
          }}
        />
      )}

      {/* ─── TAB 4: RESEARCH REPORT GENERATOR ─── */}
      {activeTab === 'report' && (
        <ReportGeneratorTab activeCoords={activeCoords} activeDepth={state.selectedDepth} />
      )}
    </div>
  );
};


/* ─── Safe Formatted Content Renderer ─── */
const FormattedMessageContent: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  if (isUser) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  // Parse lines for markdown styling
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5 font-normal leading-relaxed text-[#172033]">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-sm font-bold text-[#0B84C6] mt-2 mb-1">
              {trimmed.substring(4)}
            </h3>
          );
        }
        if (trimmed.startsWith('#### ')) {
          return (
            <h4 key={idx} className="text-xs font-bold text-[#172033] mt-2 mb-1 uppercase tracking-wide">
              {trimmed.substring(5)}
            </h4>
          );
        }
        if (trimmed.startsWith('> [!WARNING]')) {
          return (
            <div key={idx} className="p-2.5 bg-[#FFFBEB] border-l-4 border-[#F59E0B] rounded-r-lg text-xs text-[#92400E] font-semibold my-1.5 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-[#F59E0B] shrink-0" />
              <span>Service Advisory</span>
            </div>
          );
        }
        if (trimmed.startsWith('> [!NOTE]')) {
          return (
            <div key={idx} className="p-2.5 bg-[#EFF6FF] border-l-4 border-[#0B84C6] rounded-r-lg text-xs text-[#1E40AF] font-semibold my-1.5 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#0B84C6] shrink-0" />
              <span>Oceanographic Note</span>
            </div>
          );
        }
        if (trimmed.startsWith('> ')) {
          const isWarning = trimmed.includes('Unavailable') || trimmed.includes('Warning') || trimmed.includes('Error');
          return (
            <div key={idx} className={`p-2.5 border-l-4 rounded-r-lg text-xs my-1.5 ${
              isWarning ? 'bg-[#FFFBEB] border-[#F59E0B] text-[#92400E]' : 'bg-[#F1F5F9] border-[#0B84C6] text-[#475569] italic'
            }`}>
              <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed.substring(2)) }} />
            </div>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-1.5 text-xs pl-1">
              <span className="text-[#0B84C6]">•</span>
              <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed.substring(2)) }} />
            </div>
          );
        }
        if (trimmed.match(/^\d+\.\s/)) {
          return (
            <div key={idx} className="flex items-start gap-1.5 text-xs pl-1">
              <span className="font-semibold text-[#0B84C6]">{trimmed.split(' ')[0]}</span>
              <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed.replace(/^\d+\.\s/, '')) }} />
            </div>
          );
        }
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        return (
          <p key={idx} className="text-xs sm:text-[13px]" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} />
        );
      })}
    </div>
  );
};

function formatInlineMarkdown(text: string): string {
  // Bold **text**
  let out = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italics *text*
  out = out.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Inline code `code`
  out = out.replace(/`(.*?)`/g, '<code class="px-1 py-0.5 bg-[#F1F5F9] rounded text-[11px] font-mono text-[#0B84C6]">$1</code>');
  return out;
}

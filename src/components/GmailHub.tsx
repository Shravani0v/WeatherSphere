import React, { useState, useEffect } from 'react';
import { 
  googleSignIn, 
  getAccessToken, 
  logout, 
  initAuth 
} from '../lib/firebase';
import { User } from 'firebase/auth';
import { 
  Mail, 
  Send, 
  Inbox, 
  FileText, 
  Trash2, 
  Plus, 
  Search, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  FolderHeart, 
  Reply, 
  Sparkles, 
  Clock, 
  ArrowLeft, 
  ExternalLink, 
  FolderPlus,
  Compass,
  FileCode,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { WeatherDataPayload } from '../types';

interface GmailHubProps {
  weatherData: WeatherDataPayload | null;
}

interface GmailMessageHeader {
  name: string;
  value: string;
}

interface GmailMessageDetail {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  labels: string[];
}

interface GmailLabel {
  id: string;
  name: string;
  type: string;
}

export const GmailHub: React.FC<GmailHubProps> = ({ weatherData }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Mail states
  const [messages, setMessages] = useState<any[]>([]);
  const [labels, setLabels] = useState<GmailLabel[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [isLoadingLabels, setIsLoadingLabels] = useState<boolean>(false);
  const [activeFolder, setActiveFolder] = useState<string>('INBOX');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Selected email reader state
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [selectedMsgDetail, setSelectedMsgDetail] = useState<GmailMessageDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  // Composer states
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [composeTo, setComposeTo] = useState<string>('');
  const [composeSubject, setComposeSubject] = useState<string>('');
  const [composeBody, setComposeBody] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('forecast');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Label Creator states
  const [newLabelName, setNewLabelName] = useState<string>('');
  const [isCreatingLabel, setIsCreatingLabel] = useState<boolean>(false);

  // Initialize auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch messages and labels when token or activeFolder changes
  useEffect(() => {
    if (token) {
      fetchMessages();
      fetchLabels();
    }
  }, [token, activeFolder]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Google authorization failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    const confirmed = window.confirm('Are you sure you want to disconnect your Google Mail account?');
    if (!confirmed) return;
    try {
      await logout();
      setUser(null);
      setToken(null);
      setNeedsAuth(true);
      setMessages([]);
      setLabels([]);
      setSelectedMsgDetail(null);
      setSelectedMsgId(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const fetchLabels = async () => {
    if (!token) return;
    setIsLoadingLabels(true);
    try {
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch labels');
      const data = await res.json();
      setLabels(data.labels || []);
    } catch (err) {
      console.error('Failed fetching labels:', err);
    } finally {
      setIsLoadingLabels(false);
    }
  };

  const fetchMessages = async (queryOverride?: string) => {
    if (!token) return;
    setIsLoadingMessages(false);
    setIsLoadingMessages(true);
    try {
      const q = queryOverride !== undefined ? queryOverride : searchQuery;
      let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15`;
      
      const parts = [];
      if (activeFolder && activeFolder !== 'SEARCH') {
        parts.push(`labelIds=${activeFolder}`);
      }
      if (q) {
        parts.push(`q=${encodeURIComponent(q)}`);
      }
      if (parts.length > 0) {
        url += `&${parts.join('&')}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch message list');
      const listData = await res.json();
      
      if (!listData.messages || listData.messages.length === 0) {
        setMessages([]);
        setIsLoadingMessages(false);
        return;
      }

      // Fetch headers and summaries for individual messages in parallel
      const detailedMessages = await Promise.all(
        listData.messages.slice(0, 10).map(async (msg: any) => {
          try {
            const detailRes = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!detailRes.ok) return { id: msg.id, snippet: 'Snippet unavailable' };
            const detailData = await detailRes.json();
            
            const headers = detailData.payload?.headers || [];
            const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)';
            const from = headers.find((h: any) => h.name === 'From')?.value || '(Unknown)';
            const date = headers.find((h: any) => h.name === 'Date')?.value || '';
            
            return {
              id: msg.id,
              threadId: msg.threadId,
              snippet: detailData.snippet,
              subject,
              from,
              date,
              labelIds: detailData.labelIds || []
            };
          } catch {
            return { id: msg.id, snippet: 'Failed to load details' };
          }
        })
      );

      setMessages(detailedMessages);
    } catch (err) {
      console.error('Failed fetching Gmail message headers:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const decodeBase64Url = (str: string): string => {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    try {
      return decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch {
      try {
        return atob(base64);
      } catch {
        return "Unable to render message content.";
      }
    }
  };

  const getMessageBody = (payload: any): string => {
    if (!payload) return "";
    if (payload.body && payload.body.data) {
      return decodeBase64Url(payload.body.data);
    }
    if (payload.parts) {
      const htmlPart = payload.parts.find((part: any) => part.mimeType === "text/html");
      if (htmlPart && htmlPart.body && htmlPart.body.data) {
        return decodeBase64Url(htmlPart.body.data);
      }
      const plainPart = payload.parts.find((part: any) => part.mimeType === "text/plain");
      if (plainPart && plainPart.body && plainPart.body.data) {
        return decodeBase64Url(plainPart.body.data);
      }
      for (const part of payload.parts) {
        const body = getMessageBody(part);
        if (body) return body;
      }
    }
    return "";
  };

  const loadMessageDetail = async (msgId: string) => {
    if (!token) return;
    setIsLoadingDetail(true);
    setSelectedMsgId(msgId);
    setSelectedMsgDetail(null);
    try {
      const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to retrieve email details');
      const data = await res.json();
      
      const headers = data.payload?.headers || [];
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)';
      const from = headers.find((h: any) => h.name === 'From')?.value || '(Unknown)';
      const to = headers.find((h: any) => h.name === 'To')?.value || '';
      const date = headers.find((h: any) => h.name === 'Date')?.value || '';
      const body = getMessageBody(data.payload) || data.snippet || '(No content)';
      
      setSelectedMsgDetail({
        id: data.id,
        threadId: data.threadId,
        snippet: data.snippet,
        subject,
        from,
        to,
        date,
        body,
        labels: data.labelIds || []
      });
    } catch (err) {
      console.error('Failed to load message detail:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const createCustomLabel = async () => {
    if (!newLabelName.trim() || !token) return;
    
    const confirmed = window.confirm(`Are you sure you want to create a new Gmail label named "${newLabelName}"?`);
    if (!confirmed) return;

    setIsCreatingLabel(true);
    try {
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newLabelName.trim(),
          messageListVisibility: 'show',
          labelListVisibility: 'labelShow'
        })
      });
      if (res.ok) {
        setNewLabelName('');
        await fetchLabels();
      } else {
        const errData = await res.json();
        alert(`Failed to create label: ${errData.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Label creation failed:', err);
    } finally {
      setIsCreatingLabel(false);
    }
  };

  const handleTrashMessage = async (msgId: string) => {
    const confirmed = window.confirm('Are you sure you want to move this email message to Gmail Trash?');
    if (!confirmed) return;

    try {
      const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}/trash`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSelectedMsgDetail(null);
        setSelectedMsgId(null);
        await fetchMessages();
      } else {
        throw new Error('Failed to trash message');
      }
    } catch (err) {
      console.error('Trashing message failed:', err);
      alert('Could not delete email message. Please try again.');
    }
  };

  // Compose templates builder
  useEffect(() => {
    if (weatherData) {
      generateTemplateBody(selectedTemplate);
    }
  }, [selectedTemplate, weatherData]);

  const generateTemplateBody = (templateType: string) => {
    if (!weatherData) return;
    
    const cityName = weatherData.location.name;
    const currentTemp = weatherData.current.temp;
    const currentText = weatherData.current.conditionText;
    const aqiVal = weatherData.aqi.aqiUS;
    const aqiStatus = weatherData.aqi.status;
    const aiSummary = weatherData.ai.summary;

    let subject = '';
    let body = '';

    if (templateType === 'forecast') {
      subject = `[WeatherSphere] Meteorological Forecast & Briefing - ${cityName}`;
      body = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #f8fafc; color: #1e293b;">
          <h2 style="color: #2563eb; font-size: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">WeatherSphere Meteorological Briefing</h2>
          <p style="font-size: 14px;">Here is your live meteorological digest for <strong>${cityName}, ${weatherData.location.country}</strong>:</p>
          
          <div style="background-color: #ffffff; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 16px; text-align: center;">
            <div style="font-size: 36px; font-weight: bold; color: #1e293b; margin: 4px 0;">${currentTemp}°C</div>
            <div style="font-size: 16px; font-weight: 600; color: #3b82f6; text-transform: capitalize;">${currentText}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
              Feels Like: ${weatherData.current.feelsLike}°C &bull; Humidity: ${weatherData.current.humidity}% &bull; Wind: ${weatherData.current.windSpeed} km/h
            </div>
          </div>

          <div style="margin-bottom: 16px;">
            <strong style="color: #475569; display: block; margin-bottom: 4px;">Air Quality Index:</strong>
            <span style="display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: bold; background-color: #f0fdf4; color: #16a34a;">
              AQI ${aqiVal} (${aqiStatus})
            </span>
          </div>

          <div style="background-color: #f1f5f9; padding: 14px; border-radius: 8px; font-style: italic; font-size: 13px; color: #334155; margin-bottom: 16px; border-left: 4px solid #2563eb;">
            "${aiSummary}"
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 12px; color: #64748b; text-align: center;">
            This dispatch was sent on behalf of the WeatherSphere Co-Pilot Portal.
          </div>
        </div>
      `;
    } else if (templateType === 'agriculture') {
      subject = `[WeatherSphere] Soil, Crop & Planting Dispatch - ${cityName}`;
      const crops = weatherData.ai.agriculture.cropSuggestions.join(', ') || 'leafy greens, legumes';
      const agriAdvice = weatherData.ai.agriculture.advice;
      
      body = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #fdfcf7; color: #1e293b;">
          <h2 style="color: #15803d; font-size: 20px; border-bottom: 2px solid #16a34a; padding-bottom: 8px;">WeatherSphere Agricultural Intelligence</h2>
          <p style="font-size: 14px;">Soil transpiration and gardening forecast for <strong>${cityName}</strong>:</p>

          <div style="background-color: #f0fdf4; padding: 14px; border-radius: 10px; border: 1px solid #dcfce7; margin-bottom: 16px;">
            <strong style="color: #166534; font-size: 14px; display: block; margin-bottom: 6px;">Farming Suitability: ${weatherData.ai.agriculture.farmingSuitability}</strong>
            <p style="font-size: 13px; margin: 0; color: #14532d;">${agriAdvice}</p>
          </div>

          <div style="margin-bottom: 16px;">
            <strong style="color: #475569; display: block; margin-bottom: 4px;">Recommended Crops for Current Conditions:</strong>
            <p style="font-size: 14px; margin: 0; font-weight: 600; color: #166534;">${crops}</p>
          </div>

          <div style="background-color: #f8fafc; padding: 12px; border-radius: 8px; font-size: 13px; color: #475569; border-left: 4px solid #16a34a;">
            <strong>Irrigation Requirement:</strong> ${weatherData.ai.agriculture.irrigationNeeded ? 'High - active manual watering is recommended.' : 'Minimal - precipitation levels are currently adequate.'}
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 12px; color: #64748b; text-align: center; margin-top: 20px;">
            This dispatch was sent on behalf of the WeatherSphere Agricultural Module.
          </div>
        </div>
      `;
    } else if (templateType === 'severe') {
      subject = `⚠️ [CRITICAL WEATHER ALERT] Severe Conditions Notification - ${cityName}`;
      body = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fecaca; border-radius: 16px; background-color: #fffaf0; color: #1e293b;">
          <h2 style="color: #dc2626; font-size: 20px; border-bottom: 2px solid #ef4444; padding-bottom: 8px; margin-top: 0; display: flex; align-items: center; gap: 8px;">
            ⚠️ Severe Weather Hazard Alert
          </h2>
          <p style="font-size: 14px;">This is a system-generated hazard notification for <strong>${cityName}, ${weatherData.location.country}</strong>:</p>

          <div style="background-color: #fef2f2; padding: 14px; border-radius: 10px; border: 1px solid #fee2e2; margin-bottom: 16px;">
            <strong style="color: #991b1b; display: block; margin-bottom: 6px;">Active Meteorological Factors:</strong>
            <ul style="font-size: 13px; margin: 0; padding-left: 20px; color: #7f1d1d;">
              <li>Current Temp: <strong>${currentTemp}°C</strong></li>
              <li>Atmospheric Condition: <strong>${currentText}</strong></li>
              <li>Wind Force: <strong>${weatherData.current.windSpeed} km/h</strong></li>
              <li>Precipitation Accumulation: <strong>${weatherData.current.precipitation} mm</strong></li>
            </ul>
          </div>

          <div style="background-color: #fffbeb; padding: 12px; border-radius: 8px; font-size: 13px; color: #92400e; border-left: 4px solid #f59e0b; margin-bottom: 16px;">
            <strong>AI Co-Pilot Risk Summary:</strong><br/>
            ${weatherData.ai.risks.storm.level === 'High' || weatherData.ai.risks.flood.level === 'High' 
              ? 'Warning: High probability of localized flooding or dangerous storm conditions. Avoid low-lying sectors.'
              : 'Moderate advisory in effect. Secure outdoor structures and monitor local reports.'}
          </div>

          <div style="font-size: 12px; color: #ef4444; text-align: center; font-weight: bold; border-top: 1px solid #fee2e2; padding-top: 12px;">
            PLEASE TAKE IMMEDIATE PRECAUTIONS AND SECURE PROPERTY.
          </div>
        </div>
      `;
    }

    setComposeSubject(subject);
    setComposeBody(body);
  };

  const makeRawEmail = (to: string, subject: string, htmlBody: string) => {
    const emailParts = [
      `To: ${to}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${subject}`,
      '',
      htmlBody
    ];
    const email = emailParts.join('\r\n');
    return btoa(unescape(encodeURIComponent(email)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!composeTo.trim()) {
      setSendError('Recipient address is required.');
      return;
    }

    const confirmed = window.confirm(`Send Weather dispatch to "${composeTo}"?`);
    if (!confirmed) return;

    setIsSending(true);
    setSendSuccess(null);
    setSendError(null);

    try {
      const raw = makeRawEmail(composeTo.trim(), composeSubject, composeBody);
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw })
      });

      if (res.ok) {
        setSendSuccess('Meteorological dispatch successfully sent via your Gmail!');
        setComposeTo('');
        // Refresh sent folder if we are viewing it
        if (activeFolder === 'SENT') {
          await fetchMessages();
        }
        setTimeout(() => {
          setIsComposing(false);
          setSendSuccess(null);
        }, 2000);
      } else {
        const errData = await res.json();
        setSendError(errData.error?.message || 'Failed to dispatch email.');
      }
    } catch (err: any) {
      console.error('Email dispatch failed:', err);
      setSendError('Failed to dispatch email through Google servers.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateDraft = async () => {
    if (!token) return;

    if (!composeTo.trim()) {
      setSendError('Please provide a recipient before saving a draft.');
      return;
    }

    const confirmed = window.confirm('Save this weather dispatch as a draft in Gmail?');
    if (!confirmed) return;

    setIsSending(true);
    setSendSuccess(null);
    setSendError(null);

    try {
      const raw = makeRawEmail(composeTo.trim(), composeSubject, composeBody);
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: { raw }
        })
      });

      if (res.ok) {
        setSendSuccess('Draft saved successfully to your Gmail!');
        setTimeout(() => {
          setIsComposing(false);
          setSendSuccess(null);
        }, 1500);
      } else {
        const errData = await res.json();
        setSendError(errData.error?.message || 'Failed to save draft.');
      }
    } catch (err) {
      console.error('Draft save failed:', err);
      setSendError('Failed to save draft in Google Mail.');
    } finally {
      setIsSending(false);
    }
  };

  const triggerSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveFolder('SEARCH');
    fetchMessages();
  };

  // Login View (Auth Required)
  if (needsAuth) {
    return (
      <div id="gmail-landing-section" className="flex flex-col items-center justify-center p-8 md:p-16 max-w-4xl mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl space-y-6">
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-full animate-pulse">
          <Mail size={48} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-display font-semibold text-slate-900 dark:text-slate-100">
            Gmail Integration Hub
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm">
            Authorize Gmail with secure OAuth integration. Generate weather alerts, send custom agricultural briefs, and view dispatches directly in your inbox with a single click.
          </p>
        </div>

        <button 
          id="google-sign-in-button"
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="gsi-material-button flex items-center justify-center bg-white border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-6 py-3 rounded-xl shadow-md hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50"
        >
          <div className="gsi-material-button-state"></div>
          <div className="gsi-material-button-content-wrapper flex items-center gap-3">
            <div className="gsi-material-button-icon">
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 block">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
            </div>
            <span className="gsi-material-button-contents text-sm font-semibold">
              {isLoggingIn ? 'Connecting Securely...' : 'Connect Google Mail'}
            </span>
          </div>
        </button>

        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
          <span>Secure OAuth Sign-In via Google Firebase</span>
        </div>
      </div>
    );
  }

  // Authenticated Dashboard
  return (
    <div id="gmail-hub-container" className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/40 dark:bg-slate-900/40 rounded-3xl p-4 md:p-6 border border-slate-200/50 dark:border-slate-800/40">
      
      {/* 1. Folder Navigation Sidebar (lg:col-span-3) */}
      <div className="lg:col-span-3 space-y-6">
        {/* User profile details */}
        <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
              {user?.displayName ? user.displayName.charAt(0) : 'G'}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                {user?.displayName || 'Authorized User'}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                {user?.email}
              </p>
            </div>
          </div>
          <button 
            id="gmail-logout-btn"
            onClick={handleLogout}
            title="Disconnect Google Account"
            className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Quick Compose Action Button */}
        <button
          id="gmail-compose-trigger"
          onClick={() => {
            setIsComposing(true);
            setSelectedTemplate('forecast');
            if (weatherData) {
              generateTemplateBody('forecast');
            }
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-95 transition-all"
        >
          <Plus size={15} />
          Compose Weather Dispatch
        </button>

        {/* Folder selectors */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider pl-2">
            Folders
          </div>
          {[
            { id: 'INBOX', label: 'Inbox', icon: Inbox },
            { id: 'SENT', label: 'Sent Mail', icon: Send },
            { id: 'DRAFT', label: 'Drafts', icon: FileText },
            { id: 'TRASH', label: 'Trash', icon: Trash2 },
          ].map(folder => {
            const Icon = folder.icon;
            const isSelected = activeFolder === folder.id;
            return (
              <button
                key={folder.id}
                onClick={() => {
                  setActiveFolder(folder.id);
                  setSelectedMsgDetail(null);
                  setSelectedMsgId(null);
                  setIsComposing(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-blue-600/10 border-blue-500/20 dark:border-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-950/40 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={14} />
                  <span>{folder.label}</span>
                </div>
                <ChevronRight size={12} className={isSelected ? 'text-blue-500' : 'text-slate-400'} />
              </button>
            );
          })}
        </div>

        {/* Labels Creator & List */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between pl-2">
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
              Labels
            </span>
            {isLoadingLabels && <RefreshCw size={10} className="animate-spin text-slate-400" />}
          </div>

          {/* Quick Create Label */}
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="New Label Name..."
              value={newLabelName}
              onChange={e => setNewLabelName(e.target.value)}
              className="flex-1 bg-white dark:bg-slate-950 text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={createCustomLabel}
              disabled={isCreatingLabel || !newLabelName.trim()}
              title="Create Label"
              className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all disabled:opacity-50"
            >
              <FolderPlus size={14} />
            </button>
          </div>

          <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
            {labels.filter(l => l.type === 'user').map(label => {
              const isSelected = activeFolder === label.id;
              return (
                <button
                  key={label.id}
                  onClick={() => {
                    setActiveFolder(label.id);
                    setSelectedMsgDetail(null);
                    setSelectedMsgId(null);
                    setIsComposing(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-left truncate transition-all ${
                    isSelected
                      ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-950/40 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span className="truncate">{label.name}</span>
                </button>
              );
            })}
            {labels.filter(l => l.type === 'user').length === 0 && (
              <div className="text-[10px] text-slate-400 font-mono pl-2">No custom labels</div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Message List Panel (lg:col-span-4) */}
      <div className="lg:col-span-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-4 flex flex-col h-[600px]">
        {/* Search Header */}
        <form onSubmit={triggerSearch} className="relative mb-4">
          <input
            type="text"
            placeholder="Search Gmail..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900/50 text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          {searchQuery && (
            <button 
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveFolder('INBOX');
              }}
              className="absolute right-2.5 top-2.5 text-[10px] text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </form>

        <div className="flex items-center justify-between mb-3 pl-1">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {activeFolder === 'SEARCH' ? 'Search Results' : activeFolder}
          </h3>
          <button 
            onClick={() => fetchMessages()}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-all"
            title="Refresh inbox list"
          >
            <RefreshCw size={13} className={isLoadingMessages ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Messages list container */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {isLoadingMessages ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(idx => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/30 animate-pulse space-y-2">
                  <div className="h-3 w-1/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  <div className="h-2 w-2/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded"></div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2 text-slate-400 dark:text-slate-500">
              <Mail size={32} className="opacity-40" />
              <p className="text-xs font-semibold">No emails found</p>
              <p className="text-[10px] font-mono">Folder: {activeFolder}</p>
            </div>
          ) : (
            messages.map(msg => {
              const isSelected = selectedMsgId === msg.id;
              return (
                <button
                  key={msg.id}
                  onClick={() => {
                    setIsComposing(false);
                    loadMessageDetail(msg.id);
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-all space-y-1.5 block ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50'
                      : 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:border-slate-200 dark:hover:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                      {msg.from.split(' <')[0]}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                      {msg.date ? new Date(msg.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                    {msg.subject}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {msg.snippet}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Composer / Message Detail Panel (lg:col-span-5) */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-4 md:p-6 h-[600px] flex flex-col overflow-hidden">
        
        {/* COMPOSER MODE */}
        {isComposing && (
          <form onSubmit={handleSendEmail} className="flex-1 flex flex-col space-y-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Send size={14} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Compose Dispatch
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsComposing(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-2 py-1 bg-slate-50 dark:bg-slate-900 rounded-lg"
              >
                Cancel
              </button>
            </div>

            {/* Template Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold block">
                Quick Weather Templates
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'forecast', label: 'Meteorological Briefing', icon: Sparkles },
                  { id: 'agriculture', label: 'Soil & Sprout Plan', icon: SproutIcon },
                  { id: 'severe', label: 'Safety Warning', icon: AlertTriangle }
                ].map(tmpl => {
                  const Icon = tmpl.icon;
                  const isSel = selectedTemplate === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      disabled={!weatherData}
                      onClick={() => setSelectedTemplate(tmpl.id)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[10px] text-center font-bold gap-1 transition-all ${
                        isSel
                          ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 shadow-sm'
                          : 'border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      <Icon size={12} className={isSel ? 'text-blue-500' : 'text-slate-400'} />
                      <span className="leading-tight truncate w-full">{tmpl.label}</span>
                    </button>
                  );
                })}
              </div>
              {!weatherData && (
                <div className="text-[9px] text-yellow-600 font-mono mt-1">
                  💡 Select a city on the dashboard to populate these real template values!
                </div>
              )}
            </div>

            {/* Form Inputs */}
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              <div>
                <input
                  type="email"
                  placeholder="To (recipient email)..."
                  required
                  value={composeTo}
                  onChange={e => setComposeTo(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/40 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Subject..."
                  required
                  value={composeSubject}
                  onChange={e => setComposeSubject(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/40 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-mono text-slate-400 block">HTML Content Preview</span>
                <textarea
                  value={composeBody}
                  onChange={e => setComposeBody(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/40 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-52 font-mono"
                  placeholder="HTML Content of weather update..."
                />
              </div>
            </div>

            {/* Feedback notifications */}
            {sendSuccess && (
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 p-2.5 rounded-xl border border-green-200 dark:border-green-900/50">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>{sendSuccess}</span>
              </div>
            )}
            {sendError && (
              <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-2.5 rounded-xl border border-red-200 dark:border-red-900/50">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{sendError}</span>
              </div>
            )}

            {/* Submit Actions */}
            <div className="flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <button
                type="button"
                onClick={handleCreateDraft}
                disabled={isSending || !composeTo}
                className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all active:scale-95 disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                type="submit"
                disabled={isSending || !composeTo}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSending ? 'Sending Dispatch...' : 'Send via Gmail'}
              </button>
            </div>
          </form>
        )}

        {/* MESSAGE DETAIL READER MODE */}
        {!isComposing && selectedMsgId && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {isLoadingDetail ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3 animate-pulse">
                <RefreshCw size={24} className="animate-spin text-blue-500" />
                <p className="text-xs text-slate-400 font-mono">Retrieving full dispatch content...</p>
              </div>
            ) : selectedMsgDetail ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden space-y-4">
                
                {/* Header Actions */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedMsgDetail(null);
                        setSelectedMsgId(null);
                      }}
                      className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200"
                    >
                      <ArrowLeft size={14} />
                    </button>
                    <span className="text-[10px] font-mono text-slate-400">EMAIL READER</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setComposeTo(selectedMsgDetail.from.includes('<') ? selectedMsgDetail.from.split('<')[1].replace('>', '') : selectedMsgDetail.from);
                        setComposeSubject(`Re: ${selectedMsgDetail.subject}`);
                        setComposeBody(`<br/><br/>On ${selectedMsgDetail.date}, ${selectedMsgDetail.from} wrote:<br/><blockquote style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 0;">${selectedMsgDetail.body}</blockquote>`);
                        setIsComposing(true);
                      }}
                      title="Reply"
                      className="p-1.5 text-slate-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-all"
                    >
                      <Reply size={14} />
                    </button>
                    <button
                      onClick={() => handleTrashMessage(selectedMsgDetail.id)}
                      title="Move to Trash"
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Email Metadata */}
                <div className="space-y-1.5 shrink-0">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {selectedMsgDetail.subject}
                  </h3>
                  <div className="flex flex-col text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">From:</span> {selectedMsgDetail.from}
                    </div>
                    {selectedMsgDetail.to && (
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">To:</span> {selectedMsgDetail.to}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      {selectedMsgDetail.date ? new Date(selectedMsgDetail.date).toLocaleString() : ''}
                    </div>
                  </div>
                </div>

                {/* Email HTML/Text Content Reader */}
                <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/40 p-4 overflow-y-auto">
                  {selectedMsgDetail.body.includes('</') || selectedMsgDetail.body.includes('<div') ? (
                    <div 
                      className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-w-full overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: selectedMsgDetail.body }}
                    />
                  ) : (
                    <pre className="text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed whitespace-pre-wrap break-all">
                      {selectedMsgDetail.body}
                    </pre>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500">
                <AlertTriangle size={32} className="text-rose-500 opacity-60 mb-2 animate-bounce" />
                <p className="text-xs font-semibold">Failed to load content</p>
                <button 
                  onClick={() => loadMessageDetail(selectedMsgId)}
                  className="mt-2 text-[10px] text-blue-500 hover:underline"
                >
                  Retry Loading
                </button>
              </div>
            )}
          </div>
        )}

        {/* DEFAULT PLACEHOLDER STATE */}
        {!isComposing && !selectedMsgId && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-2xl">
              <Compass size={32} className="animate-spin-slow" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Select an Email or Compose
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                Choose any item from your list on the left to read its full meteorological contents, or launch a fresh compose template.
              </p>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

// Simple Sprout Icon fallback
const SproutIcon = (props: any) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={props.size || 24} 
    height={props.size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={props.className}
  >
    <path d="M7 20h10" />
    <path d="M10 20c0-1.7 1.3-3 3-3h1" />
    <path d="M12 20V11c0-2.2 1.8-4 4-4" />
    <path d="M12 11c-2.2 0-4 1.8-4 4v5" />
    <path d="M12 14c2.2 0 4-1.8 4-4" />
    <path d="M7 14c-2.2 0-4 1.8-4 4h4" />
  </svg>
);

export default GmailHub;

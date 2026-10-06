import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Save, Check, Settings, Radio, Clock, Shuffle, Key, Lock, Phone, Eye, EyeOff, ShieldCheck, MessageSquare } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    sms_provider: 'mock',
    whatsapp_provider: 'meta',
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_sms_from: '',
    meta_whatsapp_phone_number_id: '',
    meta_whatsapp_access_token: '',
    chat_link_expiry_minutes: '60',
    auto_assignment_mode: 'least_busy',
    business_hours: '08:00 - 20:00 EST'
  });

  const [showAuthToken, setShowAuthToken] = useState(false);
  const [showMetaToken, setShowMetaToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.get('/settings');
        if (res.data.settings) {
          setSettings((prev) => ({ ...prev, ...res.data.settings }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await api.put('/settings', { settings });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading system settings...</div>;
  }

  const isMetaActive = (settings.whatsapp_provider || 'meta') === 'meta';
  const isTwilioActive = settings.sms_provider === 'twilio';

  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-11 h-11 rounded-2xl bg-telecom-50 flex items-center justify-center text-telecom-600">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">System & API Gateway Configuration</h3>
            <p className="text-xs text-slate-500">Configure SMS providers, Meta WhatsApp Business API keys, and auto-routing policies</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-600 font-medium">
            {error}
          </div>
        )}

        {savedSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
            <span>Settings and Meta WhatsApp API credentials updated and applied successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          {/* Section 1: SMS Gateway Provider */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-telecom-600" />
              <span>SMS Gateway Provider</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                settings.sms_provider === 'mock' 
                  ? 'border-telecom-500 bg-telecom-50/50 ring-2 ring-telecom-500/20 shadow-xs' 
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}>
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                  <input
                    type="radio"
                    name="sms_provider"
                    value="mock"
                    checked={settings.sms_provider === 'mock'}
                    onChange={(e) => handleChange('sms_provider', e.target.value)}
                    className="text-telecom-600 focus:ring-telecom-500"
                  />
                  <span>Mock SMS Provider (Dev/Testing)</span>
                </div>
                <p className="text-[11px] text-slate-500 pl-5 leading-relaxed">
                  Logs all SMS dispatches cleanly to server terminal with instant clickable chat URLs.
                </p>
              </label>

              <label className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                settings.sms_provider === 'twilio' 
                  ? 'border-telecom-500 bg-telecom-50/50 ring-2 ring-telecom-500/20 shadow-xs' 
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}>
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                  <input
                    type="radio"
                    name="sms_provider"
                    value="twilio"
                    checked={settings.sms_provider === 'twilio'}
                    onChange={(e) => handleChange('sms_provider', e.target.value)}
                    className="text-telecom-600 focus:ring-telecom-500"
                  />
                  <span>Twilio SMS Gateway (Production)</span>
                </div>
                <p className="text-[11px] text-slate-500 pl-5 leading-relaxed">
                  Dispatches live cellular SMS to customer phone numbers via Twilio REST API.
                </p>
              </label>
            </div>
          </div>

          {/* Section 2: WhatsApp Gateway Provider (Meta WhatsApp Direct) */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp API Gateway Provider</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                isMetaActive 
                  ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs' 
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}>
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                  <input
                    type="radio"
                    name="whatsapp_provider"
                    value="meta"
                    checked={isMetaActive}
                    onChange={(e) => handleChange('whatsapp_provider', e.target.value)}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Official Meta WhatsApp Cloud API</span>
                </div>
                <p className="text-[11px] text-slate-500 pl-5 leading-relaxed">
                  Dispatches direct bulk WhatsApp broadcasts via official Meta Cloud API (`graph.facebook.com`).
                </p>
              </label>

              <label className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                settings.whatsapp_provider === 'mock' 
                  ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs' 
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}>
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                  <input
                    type="radio"
                    name="whatsapp_provider"
                    value="mock"
                    checked={settings.whatsapp_provider === 'mock'}
                    onChange={(e) => handleChange('whatsapp_provider', e.target.value)}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Mock WhatsApp API (Dev/Testing)</span>
                </div>
                <p className="text-[11px] text-slate-500 pl-5 leading-relaxed">
                  Simulates WhatsApp dispatches with console logs and direct wa.me preview links.
                </p>
              </label>
            </div>
          </div>

          {/* Section 3: API Credentials Box */}
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-900">Official API Gateway Credentials</h4>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                {isMetaActive ? 'Meta Cloud API Active' : 'Mock Mode Active'}
              </span>
            </div>

            {/* Meta WhatsApp Cloud API Credentials */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  💬 Meta WhatsApp Business Cloud API Credentials
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Meta Phone Number ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 109283746591029"
                    value={settings.meta_whatsapp_phone_number_id || ''}
                    onChange={(e) => handleChange('meta_whatsapp_phone_number_id', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">From Meta Meta Business Suite & Developer Portal</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Meta Permanent Access Token</label>
                  <div className="relative">
                    <input
                      type={showMetaToken ? 'text' : 'password'}
                      placeholder="EAAG..."
                      value={settings.meta_whatsapp_access_token || ''}
                      onChange={(e) => handleChange('meta_whatsapp_access_token', e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMetaToken(!showMetaToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showMetaToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">System User Permanent Access Token</span>
                </div>
              </div>
            </div>

            {/* Twilio SMS Credentials */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-telecom-700 uppercase tracking-wider">
                  📱 Twilio Cellular SMS Gateway Credentials
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-telecom-600" /> Account SID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ACa1b2c3d4e5f67890..."
                    value={settings.twilio_account_sid || ''}
                    onChange={(e) => handleChange('twilio_account_sid', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-telecom-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-telecom-600" /> Auth Token
                  </label>
                  <div className="relative">
                    <input
                      type={showAuthToken ? 'text' : 'password'}
                      placeholder="e.g. 9876543210..."
                      value={settings.twilio_auth_token || ''}
                      onChange={(e) => handleChange('twilio_auth_token', e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-telecom-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAuthToken(!showAuthToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showAuthToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-telecom-600" /> SMS Sender Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +18005550199"
                    value={settings.twilio_sms_from || ''}
                    onChange={(e) => handleChange('twilio_sms_from', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-telecom-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Chat Link Expiry */}
          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-telecom-600" /> Chat Link Expiry Duration (Minutes)
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Customer chat links expire automatically after this timeframe for security.
            </p>
            <input
              type="number"
              min="5"
              max="1440"
              value={settings.chat_link_expiry_minutes || '60'}
              onChange={(e) => handleChange('chat_link_expiry_minutes', e.target.value)}
              className="w-48 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-telecom-500"
            />
          </div>

          {/* Section 5: Auto Assignment Policy */}
          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
              <Shuffle className="w-4 h-4 text-telecom-600" /> Incoming Chat Auto-Assignment Policy
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Determines how incoming chats from invites are routed if the inviting agent is unavailable.
            </p>
            <select
              value={settings.auto_assignment_mode || 'least_busy'}
              onChange={(e) => handleChange('auto_assignment_mode', e.target.value)}
              className="w-full sm:w-80 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-telecom-500 cursor-pointer"
            >
              <option value="least_busy">Least-Busy Agent (Recommended)</option>
              <option value="round_robin">Round-Robin Rotation</option>
            </select>
          </div>

          {/* Section 6: Business Hours */}
          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
              Official Operating Hours
            </label>
            <input
              type="text"
              value={settings.business_hours || '08:00 - 20:00 EST'}
              onChange={(e) => handleChange('business_hours', e.target.value)}
              placeholder="08:00 - 20:00 EST"
              className="w-full sm:w-80 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-telecom-500"
            />
          </div>

          {/* Submit Action Bar */}
          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-7 py-3 bg-telecom-600 hover:bg-telecom-700 text-white rounded-2xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Configuration...' : 'Save All Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

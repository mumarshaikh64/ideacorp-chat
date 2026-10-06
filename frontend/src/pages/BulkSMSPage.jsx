import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { 
  Send, 
  UploadCloud, 
  FileText, 
  Download, 
  Sparkles, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone, 
  TrendingUp, 
  Eye, 
  Radio, 
  ExternalLink,
  ClipboardList
} from 'lucide-react';
import confetti from 'canvas-confetti';

const DEFAULT_EAND_TEMPLATE = `Greetings!

With ideacorp, an authorized channel partner of e&, you can get a postpaid number with your Freedom Plan — 250 / 325 / 500.( All with discounted prices)

☑️ 0509900011

Enjoy our plan with all the benefits included in your package.

✨ If you are interested in seeing more Gold & Platinum numbers, we’ll be happy to assist you in finding a great number!

💬 Chat with an Agent 👤: {link}`;

export default function BulkSMSPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);

  // Form State
  const [campaignName, setCampaignName] = useState('');
  const [channel, setChannel] = useState('sms'); // 'sms' | 'whatsapp'
  const [inputMode, setInputMode] = useState('paste'); // 'paste' | 'csv'
  const [pastedText, setPastedText] = useState('');
  const [parsedRecipients, setParsedRecipients] = useState([]);
  const [template, setTemplate] = useState(DEFAULT_EAND_TEMPLATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultMessage, setResultMessage] = useState(null);
  const [error, setError] = useState(null);

  // Details Modal
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignRecipients, setCampaignRecipients] = useState([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const fileInputRef = useRef(null);

  const fetchCampaigns = async () => {
    setIsLoadingCampaigns(true);
    try {
      const res = await api.get('/campaigns');
      setCampaigns(res.data.campaigns || []);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Parse pasted numbers
  useEffect(() => {
    if (inputMode === 'paste') {
      const lines = pastedText.split(/[\n,;]+/);
      const parsed = [];
      const seen = new Set();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Extract phone and optional name (format: +1555..., Alex Johnson)
        const parts = trimmed.split(/[\t|]/);
        const rawPhone = parts[0]?.trim();
        const rawName = parts[1]?.trim() || '';

        // Basic phone number sanitation
        const cleanPhone = rawPhone.replace(/[^\d+]/g, '');
        if (cleanPhone.length >= 7 && !seen.has(cleanPhone)) {
          seen.add(cleanPhone);
          parsed.push({
            phone: cleanPhone,
            name: rawName || `Customer ${cleanPhone.slice(-4)}`
          });
        }
      }
      setParsedRecipients(parsed);
    }
  }, [pastedText, inputMode]);

  // Handle CSV Upload
  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text !== 'string') return;

      const lines = text.split(/\r?\n/);
      const parsed = [];
      const seen = new Set();

      // Check if first line is header
      let startIndex = 0;
      if (lines[0] && (lines[0].toLowerCase().includes('phone') || lines[0].toLowerCase().includes('mobile'))) {
        startIndex = 1;
      }

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i]?.trim();
        if (!line) continue;

        const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        const phone = cols[0]?.replace(/[^\d+]/g, '');
        const name = cols[1] || '';
        const notes = cols[2] || '';

        if (phone && phone.length >= 7 && !seen.has(phone)) {
          seen.add(phone);
          parsed.push({ phone, name, notes });
        }
      }

      setParsedRecipients(parsed);
    };
    reader.readAsText(file);
  };

  // Download Sample CSV
  const handleDownloadSampleCSV = () => {
    const csvContent = "phone,name,notes\n+15550192834,Alex Johnson,Interested in 5G Max Plan\n+15550183742,Elena Rostova,Device Trade-In Inquiry\n+15550172651,David Chen,eSIM Roaming Support\n+15550998877,Marcus Vance,Business Multi-Line Quote";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'telecom_bulk_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const insertVariable = (varName) => {
    setTemplate(prev => `${prev} {${varName}}`);
  };

  // Dispatch Campaign
  const handleLaunchCampaign = async (e) => {
    e.preventDefault();
    if (!campaignName.trim()) {
      setError('Campaign name is required');
      return;
    }
    if (parsedRecipients.length === 0) {
      setError('Please add at least one valid recipient phone number');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResultMessage(null);
    setProgress(20);

    const progressInterval = setInterval(() => {
      setProgress(p => (p < 85 ? p + 15 : p));
    }, 300);

    // Ensure {link} is present in template so the customer receives their chat link
    let finalTemplate = template.trim();
    if (!finalTemplate.includes('{link}')) {
      if (finalTemplate.includes('💬 Chat with an Agent 👤')) {
        finalTemplate = finalTemplate.replace('💬 Chat with an Agent 👤', '💬 Chat with an Agent 👤: {link}');
      } else {
        finalTemplate += '\n\n💬 Chat with an Agent 👤: {link}';
      }
    }

    try {
      const res = await api.post('/campaigns/bulk', {
        name: campaignName,
        channel: channel,
        template: finalTemplate,
        recipients: parsedRecipients
      });

      clearInterval(progressInterval);
      setProgress(100);
      setResultMessage(res.data.message);
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });

      // Reset form
      setCampaignName('');
      setPastedText('');
      setParsedRecipients([]);
      if (fileInputRef.current) fileInputRef.current.value = '';

      fetchCampaigns();
    } catch (err) {
      clearInterval(progressInterval);
      setError(err.response?.data?.error || 'Failed to dispatch bulk campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetails = async (campaign) => {
    setSelectedCampaign(campaign);
    setIsDetailsOpen(true);
    setIsLoadingDetails(true);
    try {
      const res = await api.get(`/campaigns/${campaign.id}`);
      setCampaignRecipients(res.data.recipients || []);
    } catch (err) {
      console.error('Failed to load campaign details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-telecom-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-telecom-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-telecom-500/20 text-telecom-300 text-xs font-semibold mb-3 border border-telecom-500/30">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Mass SMS Broadcast Engine</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Bulk SMS Campaigns</h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Dispatch thousands of personalized SMS messages instantly. Each recipient receives their own 
              unique, cryptographically signed link to connect with your live sales desk.
            </p>
          </div>

          <div className="flex gap-3 bg-slate-800/60 backdrop-blur-md p-3 rounded-2xl border border-slate-700/60">
            <div className="text-center px-4 border-r border-slate-700">
              <span className="block text-xl font-bold text-white">{campaigns.length}</span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Campaigns</span>
            </div>
            <div className="text-center px-4">
              <span className="block text-xl font-bold text-telecom-400">
                {campaigns.reduce((acc, c) => acc + (parseInt(c.sent_count, 10) || 0), 0)}
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">SMS Sent</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Campaign Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 7 Columns: Campaign Configuration */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-telecom-600" />
              <span>New Bulk Broadcast</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Step 1 of 2</span>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-600 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {resultMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{resultMessage}</span>
            </div>
          )}

          <form onSubmit={handleLaunchCampaign} className="space-y-5">
            {/* Broadcast Channel Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Dispatch Gateway Channel <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setChannel('sms')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                    channel === 'sms'
                      ? 'border-telecom-500 bg-telecom-50/60 ring-2 ring-telecom-500/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 text-slate-600'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                    channel === 'sms' ? 'bg-telecom-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    📱
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-900">SMS (Cellular)</span>
                    <span className="text-[10px] text-slate-500 block leading-tight">Direct SMS Carrier Gateway</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setChannel('whatsapp')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                    channel === 'whatsapp'
                      ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 text-slate-600'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                    channel === 'whatsapp' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    💬
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-900">WhatsApp API</span>
                    <span className="text-[10px] text-slate-500 block leading-tight">WhatsApp Business API</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Campaign Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Campaign Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 5G Unlimited Promo - September 2026"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-telecom-500 focus:bg-white"
              />
            </div>

            {/* Recipient Source Mode Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Target Recipients ({parsedRecipients.length} Ready)
                </label>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setInputMode('paste')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      inputMode === 'paste'
                        ? 'bg-white text-slate-800 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Paste Numbers
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('csv')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      inputMode === 'csv'
                        ? 'bg-white text-slate-800 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    CSV File
                  </button>
                </div>
              </div>

              {/* Mode A: Paste Numbers */}
              {inputMode === 'paste' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400">
                      Format: <code>Phone | Name</code> or just <code>Phone</code>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPastedText("+15550192834 | Alex Johnson\n+15550183742 | Elena Rostova\n+15550172651 | David Chen\n+15550998877 | Marcus Vance");
                        setCampaignName("5G Ultra Fast Upgrade Promo");
                      }}
                      className="text-[11px] font-bold text-telecom-600 hover:text-telecom-700 bg-telecom-50 hover:bg-telecom-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-telecom-500" />
                      <span>Fill Sample Data</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="+15550192834 | Alex Johnson&#10;+15550183742 | Elena Rostova&#10;+15550172651 | David Chen"
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-telecom-500 focus:bg-white"
                  />
                </div>
              ) : (
                /* Mode B: CSV Upload */
                <div className="border-2 border-dashed border-slate-200 hover:border-telecom-400 rounded-2xl p-6 text-center bg-slate-50/60 transition-colors">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleCSVUpload}
                    accept=".csv,text/csv"
                    className="hidden"
                  />
                  <UploadCloud className="w-8 h-8 text-telecom-600 mx-auto mb-2 animate-bounce" />
                  <p className="text-xs font-bold text-slate-700">Click to upload CSV spreadsheet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Supports columns: phone, name, notes</p>

                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
                    >
                      Browse File
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSampleCSV}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-telecom-600 hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Sample CSV</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Message Template Editor */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  SMS Message Template
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400">Insert tag:</span>
                  <button
                    type="button"
                    onClick={() => insertVariable('name')}
                    className="px-2 py-0.5 bg-telecom-50 text-telecom-700 border border-telecom-200 rounded text-[11px] font-mono font-semibold hover:bg-telecom-100"
                  >
                    &#123;name&#125;
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariable('link')}
                    className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[11px] font-mono font-semibold hover:bg-emerald-100"
                  >
                    &#123;link&#125;
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplate(DEFAULT_EAND_TEMPLATE)}
                    className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[11px] font-semibold hover:bg-slate-200"
                  >
                    Reset Template
                  </button>
                </div>
              </div>
              <textarea
                rows={9}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-telecom-500 focus:bg-white resize-y font-sans leading-relaxed"
              />

              {/* Explanatory Guide for {name} and {link} */}
              <div className="mt-2.5 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs space-y-2">
                <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                  📌 How Tags Work:
                </p>
                <div className="flex items-start gap-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono font-bold text-[10px] flex-shrink-0 mt-0.5">
                    &#123;name&#125;
                  </span>
                  <p className="text-slate-600 text-[11px] leading-tight">
                    <strong>Customer Name:</strong> Automatically taken from your CSV file or pasted list (e.g. <em>Alex Johnson</em>). If no name is provided, defaults to <em>Valued Customer</em>.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono font-bold text-[10px] flex-shrink-0 mt-0.5">
                    &#123;link&#125;
                  </span>
                  <p className="text-slate-600 text-[11px] leading-tight">
                    <strong>Unique Secure Chat Link:</strong> Automatically generated by the backend for each customer (e.g. <code>http://localhost:5173/c/eyJh...</code>). <u>You do not need to create or paste any links yourself!</u>
                  </p>
                </div>
              </div>
            </div>

            {/* Launch Action */}
            <div className="pt-2">
              {isSubmitting && (
                <div className="mb-3 space-y-1">
                  <div className="flex justify-between text-xs text-slate-500 font-medium">
                    <span>Dispatching SMS batch...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-telecom-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || parsedRecipients.length === 0}
                className="w-full py-3.5 bg-telecom-600 hover:bg-telecom-700 active:scale-[0.99] text-white rounded-2xl text-sm font-bold shadow-lg shadow-telecom-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSubmitting 
                    ? `Broadcasting to ${parsedRecipients.length} numbers...` 
                    : `Dispatch Campaign to ${parsedRecipients.length} Recipient${parsedRecipients.length === 1 ? '' : 's'}`}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Right 5 Columns: Smartphone SMS Live Preview */}
        <div className="lg:col-span-5 flex flex-col items-center justify-start space-y-4">
          <div className="w-full text-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-telecom-600" /> Customer Phone Preview
            </span>
          </div>

          {/* Smartphone Mockup Frame */}
          <div className="w-72 bg-slate-900 rounded-[38px] p-3 shadow-2xl border-4 border-slate-800 relative">
            {/* Speaker & Camera Notch */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-950 rounded-full flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
            </div>

            {/* Screen */}
            <div className="bg-slate-100 rounded-[28px] overflow-hidden pt-8 pb-4 px-3 min-h-[460px] flex flex-col justify-between">
              {/* Message Header */}
              <div className="text-center pb-2 border-b border-slate-200">
                <span className="text-[11px] font-bold text-slate-700 block">ideacorp • e& Partner</span>
                <span className="text-[9px] text-slate-400">Verified Sender • 88201</span>
              </div>

              {/* Chat Bubble */}
              <div className="my-auto space-y-2 py-2">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3 shadow-xs text-xs text-slate-800">
                  <div className="leading-relaxed whitespace-pre-wrap break-words text-[11px] text-slate-800">
                    {(() => {
                      let text = template
                        .replace(/\{name\}/gi, parsedRecipients[0]?.name || 'Valued Customer');

                      if (!text.includes('{link}')) {
                        if (text.includes('💬 Chat with an Agent 👤')) {
                          text = text.replace('💬 Chat with an Agent 👤', '💬 Chat with an Agent 👤: {link}');
                        } else {
                          text += '\n\n💬 Chat with an Agent 👤: {link}';
                        }
                      }

                      const parts = text.split('{link}');
                      return parts.map((part, index) => (
                        <React.Fragment key={index}>
                          {part}
                          {index < parts.length - 1 && (
                            <span
                              className="inline-block text-blue-600 underline font-semibold break-all bg-blue-50/70 px-1 py-0.5 rounded cursor-pointer hover:text-blue-800"
                              title="Customer's unique chat link"
                            >
                              https://chat.ideacrop.com/c/3a8f9b...
                            </span>
                          )}
                        </React.Fragment>
                      ));
                    })()}
                  </div>

                  {/* Rich Link Card Mockup (like iOS / Android iMessage preview) */}
                  <div className="mt-2.5 p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-telecom-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                      💬
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-slate-800 truncate">Chat with an Agent 👤</p>
                      <p className="text-[8.5px] text-telecom-600 truncate font-mono">chat.ideacrop.com • Tap to start chat</p>
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  </div>

                  <span className="block text-[9px] text-slate-400 text-right mt-1.5">
                    Just now • SMS
                  </span>
                </div>
              </div>

              {/* Phone Footer */}
              <div className="bg-slate-200/80 rounded-xl p-2 text-center text-[10px] text-slate-500 font-medium">
                Tap link to open direct browser chat
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign History & Conversion Metrics Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-slate-700" />
            <h3 className="text-base font-bold text-slate-800">Campaign Broadcast History</h3>
          </div>
          <button
            onClick={fetchCampaigns}
            className="text-xs font-semibold text-telecom-600 hover:text-telecom-700"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Campaign Name</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Dispatched Date</th>
                <th className="py-3 px-4">Sender Agent</th>
                <th className="py-3 px-4">Sent / Total</th>
                <th className="py-3 px-4">Chats Initiated</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoadingCampaigns ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">Loading campaign logs...</td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-slate-400">
                    No bulk campaigns dispatched yet. Create your first campaign above!
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => {
                  const sent = parseInt(c.sent_count, 10) || 0;
                  const total = parseInt(c.total_count, 10) || 0;
                  const initiated = parseInt(c.chats_initiated, 10) || 0;
                  const conversion = sent > 0 ? ((initiated / sent) * 100).toFixed(1) : '0.0';
                  const isWa = c.channel === 'whatsapp';

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {c.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isWa
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          <span>{isWa ? '💬' : '📱'}</span>
                          <span>{isWa ? 'WhatsApp' : 'SMS'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(c.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {c.agent_name || 'System'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold">
                        <span className="text-emerald-600">{sent}</span> / {total}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-indigo-600">{initiated}</span>{' '}
                        <span className="text-[11px] text-slate-400 font-mono">({conversion}%)</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          c.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenDetails(c)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-telecom-50 hover:text-telecom-700 text-slate-700 rounded-xl font-semibold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Recipients</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign Details Modal */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={`Campaign Recipients - ${selectedCampaign?.name}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs flex justify-between">
            <div>
              <span className="text-slate-400 font-medium">Total Dispatched: </span>
              <span className="font-bold text-slate-800">{selectedCampaign?.sent_count} SMS</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Customer Chats Started: </span>
              <span className="font-bold text-indigo-600">{selectedCampaign?.chats_initiated}</span>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Chat Status</th>
                  <th className="py-2.5 px-3 text-right">Secure Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoadingDetails ? (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-slate-400">Loading recipients...</td>
                  </tr>
                ) : campaignRecipients.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-slate-400">No recipient records.</td>
                  </tr>
                ) : (
                  campaignRecipients.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-mono font-medium">{r.customer_phone}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{r.customer_name || 'Customer'}</td>
                      <td className="py-2.5 px-3">
                        {r.used_at ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" /> Chat Started
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Invite Pending</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <a
                          href={`/c/${r.token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-telecom-600 hover:underline"
                        >
                          <span>Open Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsDetailsOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

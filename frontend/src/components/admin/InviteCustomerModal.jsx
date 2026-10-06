import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import api from '../../services/api';
import { Send, Copy, Check, ExternalLink, Smartphone, Megaphone, Users, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function InviteCustomerModal({ isOpen, onClose, onSuccess, initialPromoNumber = '' }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'bulk'

  // Single Form State
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  // Bulk Form State
  const [bulkNumbers, setBulkNumbers] = useState('');
  const [bulkCampaignName, setBulkCampaignName] = useState('');

  React.useEffect(() => {
    if (isOpen && initialPromoNumber) {
      const defaultTemplateWithNumber = `Greetings!\n\nWith ideacorp, an authorized channel partner of e&, you can get a postpaid number with your Freedom Plan — 250 / 325 / 500.( All with discounted prices)\n\n☑️ ${initialPromoNumber}\n\nEnjoy our plan with all the benefits included in your package.\n\n✨ If you are interested in seeing more Gold & Platinum numbers, we’ll be happy to assist you in finding a great number!\n\n💬 Chat with an Agent 👤: {link}`;
      setCustomMessage(defaultTemplateWithNumber);
    }
  }, [isOpen, initialPromoNumber]);

  // Channel State
  const [channel, setChannel] = useState('sms'); // 'sms' | 'whatsapp'

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedInvite, setGeneratedInvite] = useState(null);
  const [bulkSuccessSummary, setBulkSuccessSummary] = useState(null);
  const [copied, setCopied] = useState(false);

  // Single Invite Submit
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    if (!phone) {
      setError('Phone number is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.post('/invites', {
        phone,
        customerName,
        notes,
        customMessage,
        channel
      });

      setGeneratedInvite(res.data.invite);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      if (onSuccess) onSuccess(res.data.invite);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send invite');
    } finally {
      setIsLoading(false);
    }
  };

  // Bulk Submit
  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    const lines = bulkNumbers.split(/[\n,;]+/);
    const parsed = [];
    const seen = new Set();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(/[\t|]/);
      const cleanPhone = (parts[0] || '').replace(/[^\d+]/g, '');
      const rawName = parts[1]?.trim() || '';

      if (cleanPhone.length >= 7 && !seen.has(cleanPhone)) {
        seen.add(cleanPhone);
        parsed.push({
          phone: cleanPhone,
          name: rawName || `Customer ${cleanPhone.slice(-4)}`
        });
      }
    }

    if (parsed.length === 0) {
      setError('Please enter at least one valid phone number');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.post('/campaigns/bulk', {
        name: bulkCampaignName.trim() || `Quick ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} Campaign ${new Date().toLocaleDateString()}`,
        template: customMessage || undefined,
        recipients: parsed,
        channel
      });

      setBulkSuccessSummary(res.data);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to dispatch bulk campaign');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedInvite?.chatLink) return;
    navigator.clipboard.writeText(generatedInvite.chatLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setPhone('');
    setCustomerName('');
    setNotes('');
    setCustomMessage('');
    setBulkNumbers('');
    setBulkCampaignName('');
    setGeneratedInvite(null);
    setBulkSuccessSummary(null);
    setError(null);
    onClose();
  };

  const handleGoToBulkStudio = () => {
    resetForm();
    navigate('/admin/campaigns');
  };

  return (
    <Modal isOpen={isOpen} onClose={resetForm} title="Customer SMS Chat Invite" maxWidth="max-w-lg">
      {/* Top Tabs Switcher */}
      {!generatedInvite && !bulkSuccessSummary && (
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => { setActiveTab('single'); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'single'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Single Customer</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('bulk'); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'bulk'
                ? 'bg-white text-telecom-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5 text-telecom-600" />
            <span>Bulk SMS Broadcast</span>
          </button>
        </div>
      )}

      {/* 1. Single Result View */}
      {generatedInvite ? (
        <div className="space-y-4 text-center py-2">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-6 h-6 stroke-[3]" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-800">SMS Chat Invite Dispatched!</h4>
            <p className="text-xs text-slate-500 mt-1">
              Sent to <span className="font-semibold text-slate-700">{generatedInvite.customerPhone}</span>.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Direct Customer Secure Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generatedInvite.chatLink}
                className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 select-all"
              />
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium transition-colors flex-shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <a
              href={generatedInvite.chatLink}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-telecom-600 hover:bg-telecom-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <span>Open Customer View</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            {generatedInvite.waDirectLink && (
              <a
                href={generatedInvite.waDirectLink}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                <span>💬 Open WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={resetForm}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      ) : bulkSuccessSummary ? (
        /* 2. Bulk Result View */
        <div className="space-y-4 text-center py-2">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-6 h-6 stroke-[3]" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-800">Bulk Campaign Broadcasted!</h4>
            <p className="text-xs text-slate-500 mt-1">
              Dispatched to <span className="font-bold text-emerald-600">{bulkSuccessSummary.totalDispatched}</span> customers.
              Each recipient received their own unique secure chat link!
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleGoToBulkStudio}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-telecom-600 hover:bg-telecom-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <span>View Campaign Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetForm}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      ) : activeTab === 'single' ? (
        /* 3. Single Customer Tab */
        <form onSubmit={handleSingleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-medium">
              {error}
            </div>
          )}

          {/* Channel Choice */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Dispatch Channel
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChannel('sms')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  channel === 'sms'
                    ? 'border-telecom-500 bg-telecom-50 text-telecom-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>📱 SMS Carrier</span>
              </button>
              <button
                type="button"
                onClick={() => setChannel('whatsapp')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  channel === 'whatsapp'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>💬 WhatsApp API</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer Mobile Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Smartphone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                placeholder="+1 555 019 2834"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-telecom-500 focus:bg-white"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">E.164 formatted number (e.g. +1...)</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Name (Optional)
              </label>
              <input
                type="text"
                placeholder="Alex Johnson"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-telecom-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Interest / Notes
              </label>
              <input
                type="text"
                placeholder="5G Plan / eSIM Upgrade"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-telecom-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Custom SMS Greeting (Optional)
              </label>
              <button
                type="button"
                onClick={() => setCustomMessage(`Greetings!

With ideacorp, an authorized channel partner of e&, you can get a postpaid number with your Freedom Plan — 250 / 325 / 500.( All with discounted prices)

☑️ 0509900011

Enjoy our plan with all the benefits included in your package.

✨ If you are interested in seeing more Gold & Platinum numbers, we’ll be happy to assist you in finding a great number!

💬 Chat with an Agent 👤: {link}`)}
                className="text-[11px] font-semibold text-telecom-600 hover:text-telecom-700 hover:underline"
              >
                Use e& Promo Template
              </button>
            </div>
            <textarea
              rows={4}
              placeholder="Leave blank for default e& Freedom Plan template, or customize here..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-telecom-500 focus:bg-white resize-y"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-telecom-600 hover:bg-telecom-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Sending SMS...' : 'Send SMS Invite'}</span>
            </button>
          </div>
        </form>
      ) : (
        /* 4. Bulk Quick Dispatch Tab */
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Campaign Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. VIP Promo Blast"
              value={bulkCampaignName}
              onChange={(e) => setBulkCampaignName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-telecom-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Paste Customer Numbers <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              placeholder="+15550192834 | Alex Johnson&#10;+15550183742 | Elena Rostova&#10;+15550172651"
              value={bulkNumbers}
              onChange={(e) => setBulkNumbers(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-telecom-500 focus:bg-white"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Paste numbers separated by line breaks or commas.
            </p>
          </div>

          <div className="p-3 bg-telecom-50/60 border border-telecom-100 rounded-xl flex items-center justify-between">
            <span className="text-xs text-telecom-800 font-medium">
              Need to upload a CSV file or customize templates?
            </span>
            <button
              type="button"
              onClick={handleGoToBulkStudio}
              className="text-xs font-bold text-telecom-600 hover:text-telecom-800 flex items-center gap-1 flex-shrink-0"
            >
              <span>Full Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !bulkNumbers.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-telecom-600 hover:bg-telecom-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Dispatching Batch...' : 'Send Bulk Invites'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

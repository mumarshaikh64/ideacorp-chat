import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useChatStore } from '../../store/chatStore';
import { ArrowRightLeft, User, AlertCircle } from 'lucide-react';
import Badge from '../common/Badge';

export default function TransferModal({ isOpen, onClose, conversation }) {
  const { availableAgents, fetchAvailableAgents, transferChat } = useChatStore();
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableAgents();
      setSelectedAgentId('');
      setReason('');
      setError(null);
    }
  }, [isOpen, fetchAvailableAgents]);

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!selectedAgentId) {
      setError('Please select an agent to transfer this chat to');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await transferChat(conversation.id, selectedAgentId, reason);

    setIsSubmitting(false);
    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Failed to transfer chat');
    }
  };

  if (!conversation) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transfer Live Chat">
      <form onSubmit={handleTransfer} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <p className="text-xs text-slate-500">Active Customer:</p>
          <p className="text-sm font-bold text-slate-800">
            {conversation.customer_name || 'Customer'} ({conversation.customer_phone || ''})
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Select Destination Agent <span className="text-rose-500">*</span>
          </label>

          {availableAgents.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              No other agents are currently marked Online. You can ask an agent to switch to Online status first.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {availableAgents.map((agent) => (
                <label
                  key={agent.id}
                  className={`flex items-center justify-between p-3 rounded-xl border text-sm cursor-pointer transition-all ${
                    selectedAgentId === agent.id
                      ? 'border-telecom-500 bg-telecom-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="transferAgent"
                      value={agent.id}
                      checked={selectedAgentId === agent.id}
                      onChange={(e) => setSelectedAgentId(e.target.value)}
                      className="text-telecom-600 focus:ring-telecom-500"
                    />
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{agent.name}</p>
                        <p className="text-[11px] text-slate-400">{agent.email}</p>
                      </div>
                    </div>
                  </div>
                  <Badge variant={agent.status} size="sm">
                    {agent.status}
                  </Badge>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Reason / Context for Transfer (Customer & Agent will see this)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Customer needs technical eSIM provisioning specialist..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-telecom-500 focus:bg-white resize-none"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !selectedAgentId}
            className="flex items-center gap-2 px-5 py-2 bg-telecom-600 hover:bg-telecom-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Transferring...' : 'Transfer Chat'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

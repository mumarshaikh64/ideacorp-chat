import React from 'react';
import { MessageSquare, ArrowRight, X } from 'lucide-react';

export default function IncomingChatAlert({ alert, onAccept, onDismiss }) {
  if (!alert) return null;

  return (
    <div className="fixed top-5 right-5 z-50 max-w-sm w-full bg-white rounded-2xl shadow-2xl border-2 border-telecom-500 p-4 animate-in slide-in-from-top-4 duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-telecom-100 flex items-center justify-center text-telecom-600 flex-shrink-0 animate-bounce">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              {alert.transferredFrom ? 'Transferred Chat Incoming' : 'New Customer Connected!'}
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              {alert.customer?.name || 'Customer'} ({alert.customer?.phone || ''})
            </p>
            {alert.transferredFrom && (
              <p className="text-xs text-amber-600 font-medium mt-1">
                From: {alert.transferredFrom} {alert.reason ? `("${alert.reason}")` : ''}
              </p>
            )}
            {alert.initialOption && (
              <span className="inline-block mt-1 text-[11px] bg-telecom-50 text-telecom-700 px-2 py-0.5 rounded font-medium">
                Topic: {alert.initialOption}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={onAccept}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-telecom-600 hover:bg-telecom-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          Open Chat <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDismiss}
          className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

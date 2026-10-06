import React from 'react';
import { Radio, Zap, Smartphone, ArrowRight, ShieldCheck, CreditCard, Sparkles } from 'lucide-react';

export default function WelcomeScreen({ agent, customer, onStartChat }) {
  const quickTopics = [
    {
      id: '5g_plans',
      title: 'Unlimited 5G Max Plans',
      desc: 'Blazing fast speeds, hotspot & international data',
      icon: Zap,
      color: 'from-amber-500 to-orange-500'
    },
    {
      id: 'esim',
      title: 'Instant eSIM Activation',
      desc: 'Activate a digital SIM card in under 3 minutes',
      icon: Radio,
      color: 'from-telecom-500 to-cyan-500'
    },
    {
      id: 'device_upgrade',
      title: 'Device Upgrade & Trade-In',
      desc: 'Get up to $800 off the newest 5G smartphones',
      icon: Smartphone,
      color: 'from-purple-500 to-indigo-500'
    },
    {
      id: 'billing_support',
      title: 'Billing & Account Help',
      desc: 'Inquire about recent statements, roaming, or add-ons',
      icon: CreditCard,
      color: 'from-emerald-500 to-teal-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-telecom-950 text-white flex flex-col justify-between p-4 sm:p-6 max-w-md mx-auto">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-telecom-500 to-telecom-300 flex items-center justify-center text-white shadow-lg shadow-telecom-500/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">IdeaCrop Mobile</h2>
              <p className="text-[11px] text-telecom-400 font-medium">5G Ultra Wideband Support</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[11px] font-semibold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Live Help</span>
          </div>
        </div>

        {/* Assigned Agent greeting card */}
        <div className="mt-6 bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-telecom-600 to-indigo-600 flex items-center justify-center text-lg font-bold text-white border-2 border-slate-700">
                {agent?.name ? agent.name.charAt(0) : 'S'}
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Your Dedicated Specialist</p>
              <h3 className="text-sm font-bold text-white">{agent?.name || 'Sales Representative'}</h3>
              <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">● Ready to assist you</p>
            </div>
          </div>
        </div>

        {/* Welcome Text */}
        <div className="mt-6">
          <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight">
            Hello {customer?.name || 'there'}! 👋
          </h1>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            Welcome to your priority telecom sales & customer support room. Select an option below or start a live conversation immediately.
          </p>
        </div>

        {/* Quick Options */}
        <div className="mt-5 space-y-2.5">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Quick Topics
          </p>
          {quickTopics.map((topic) => {
            const Icon = topic.icon;
            return (
              <button
                key={topic.id}
                onClick={() => onStartChat(topic.title)}
                className="w-full text-left bg-slate-800/40 hover:bg-slate-800/80 active:bg-slate-800 border border-slate-700/50 hover:border-telecom-500/50 rounded-2xl p-3.5 flex items-center justify-between transition-all group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${topic.color} flex items-center justify-center text-white flex-shrink-0 shadow-md`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-telecom-300 transition-colors">
                      {topic.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{topic.desc}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-telecom-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Start Chat CTA */}
      <div className="pt-6">
        <button
          onClick={() => onStartChat()}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-telecom-500 to-indigo-600 hover:from-telecom-600 hover:to-indigo-700 active:scale-[0.99] text-white rounded-2xl font-bold text-sm shadow-xl shadow-telecom-600/30 flex items-center justify-center gap-2 transition-all"
        >
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span>Start Live Chat Now</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Encrypted Session • No Login Required</span>
        </div>
      </div>
    </div>
  );
}

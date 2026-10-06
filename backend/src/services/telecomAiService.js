/**
 * Telecom AI Sales & Customer Support Knowledge Base Engine
 * Official knowledge base for ideacorp (Authorized Channel Partner of e& / Etisalat UAE).
 * 
 * Supports bilingual conversational resolution (English & Roman Urdu),
 * intelligent intent scoring, contextual quick-reply options, and human escalation detection.
 */

const TelecomNumber = require('../models/TelecomNumber');

class TelecomAiService {
  constructor() {
    this.knowledgeBase = [
      // 1. Postpaid Plans & Rental
      {
        id: 'postpaid_plans',
        category: 'plans',
        keywords: ['plan', 'plans', 'postpaid', 'package', 'packages', 'freedom', 'offer', 'offers', 'rates', 'price', 'kitne ka hai', 'konse plan', 'discount'],
        answerEn: `With ideacorp, an authorized channel partner of e&, we offer the latest **Freedom Postpaid Plans — 250 / 325 / 500** at exclusive discounted prices!\n\n• **Freedom 250**: Ideal for regular daily local calling, generous 5G data allowance & flexi minutes.\n• **Freedom 325**: High-speed unlimited local calls, higher 5G data bucket, international flexi minutes & roaming options.\n• **Freedom 500**: Premium flagship package with high-speed unlimited 5G data, extensive international calling & VIP special number eligibility.\n\nAll plans include 5G ultra-wideband speeds and door-to-door delivery within 24 hours.`,
        answerUr: `ideacorp (authorized channel partner of e&) ke sath aap ko **Freedom Postpaid Plans — 250 / 325 / 500** par special discounted prices milti hain!\n\n• **Freedom 250**: Daily calling aur high-speed 5G data ke liye best option.\n• **Freedom 325**: Unlimited local calls, bara data quota aur international flexi minutes.\n• **Freedom 500**: Flagship VIP plan with unlimited 5G data, international minutes aur Gold/Platinum number eligibility.\n\nTamam packages me 24 hours door-to-door delivery shamil hai.`,
        options: [
          { label: '✨ Gold & Platinum Numbers', key: 'special_numbers' },
          { label: '🚚 24h Doorstep Delivery', key: 'delivery_info' },
          { label: '👨‍💼 Talk to Sales Specialist', key: 'request_human' }
        ]
      },

      // 2. Data & Speed Allowances
      {
        id: 'data_and_speed',
        category: 'plans',
        keywords: ['data', 'gb', 'internet', 'speed', 'mbps', 'unlimited data', 'fast', 'slow', 'kitna data', 'speed kitni'],
        answerEn: `Yes, all our Freedom Postpaid plans come with high-speed 5G data allowances!\n\n• Freedom 250 & 325 include substantial 5G high-speed monthly data buckets.\n• Freedom 500 features heavy/unlimited data connectivity.\n• Speed tiers range from 3 Mbps, 10 Mbps, 50 Mbps up to completely uncapped maximum 5G speeds.\n\nIf you exceed your allowance, additional high-speed booster packs are available on-demand in the My Etisalat (e& UAE) app.`,
        answerUr: `Jee bilkul, tamam Freedom Plans me high-speed 5G data shamil hai!\n\n• Freedom 250 aur 325 me baray monthly 5G data buckets milte hain.\n• Freedom 500 me heavy/unlimited data connectivity di jaati hai.\n• Speed options 3 Mbps, 10 Mbps, 50 Mbps se le kar uncapped 5G maximum speeds tak dastiyab hain.\n\nAgar data khatam ho jaye toh aap My Etisalat app se instant booster add-on le sakte hain.`,
        options: [
          { label: '📋 View All Plans', key: 'postpaid_plans' },
          { label: '👨‍💼 Talk to Sales Specialist', key: 'request_human' }
        ]
      },

      // 3. Local & International Minutes
      {
        id: 'minutes_calling',
        category: 'plans',
        keywords: ['minutes', 'minute', 'call', 'calling', 'local', 'international', 'flexi', 'bahir call', 'pakistan', 'india', 'philippines', 'egypt', 'local call'],
        answerEn: `Depending on the package selected:\n\n• **Local Calls**: Selected Freedom plans include unlimited local calls or extensive local minute allocations across all UAE networks.\n• **International Minutes**: Selected plans come with flexi minutes that can be used for both local calls and calling major international destinations (India, Pakistan, Egypt, Philippines, etc.), or you can add tailored country-specific bundles!`,
        answerUr: `Aap ke selected package ke mutabiq calling benefits miltay hain:\n\n• **Local Calling**: Freedom plans me UAE ke tamam networks par unlimited ya extensive local minutes shamil hain.\n• **International Minutes**: Selected plans me Flexi Minutes aate hain jin se aap local aur international (Pakistan, India, Egypt wagera) dono calls kar sakte hain.`,
        options: [
          { label: '📋 View Freedom Plans', key: 'postpaid_plans' },
          { label: '👨‍💼 Talk to Sales Specialist', key: 'request_human' }
        ]
      },

      // 4. Contract Period & Early Cancellation
      {
        id: 'contract_and_cancellation',
        category: 'contract',
        keywords: ['contract', 'period', 'cancel', 'cancellation', 'exit fee', 'penalty', 'khareed', 'kitne mahine', 'chhor sakta hoon', 'cancel contract', '12 months', '6 months'],
        answerEn: `• **Contract Commitment**: The standard commitment for Freedom promotional postpaid plans is **12 months**.\n• **Can I cancel after 6 months?**: The contract is strictly for 12 months. If you choose to terminate before 12 months, applicable exit charges apply:\n  👉 **Exit Charges = 1 month advance bill + remaining days of current month + 5% VAT**.\n  ⚠️ Early cancellation also forfeits the number associated with the contract.\n• **After 12 Months**: The contract expires and the plan continues month-to-month, or you can switch/cancel without penalty.`,
        answerUr: `• **Contract ki muddat**: Promotional Freedom postpaid plans ka standard contract **12 months** ka hota hai.\n• **Kiya 6 months baad cancel kar sakte hain?**: Contract 12 months se pehle cancel nahi kiya ja sakta baghair penalty ke. Agar aap pehle cancel karein toh exit charges apply honge:\n  👉 **Exit Charges = 1 month advance bill + remaining days + 5% VAT**.\n  ⚠️ Pehle cancel karne par number bhi forfeit (lose) ho jata hai.\n• 12 months complete hone ke baad koi cancellation penalty nahi hoti.`,
        options: [
          { label: '📄 Document Requirements', key: 'documents_info' },
          { label: '👨‍💼 Talk to Sales Specialist', key: 'request_human' }
        ]
      },

      // 5. Special / VIP Numbers (Gold, Platinum & Series Sequences)
      {
        id: 'special_numbers',
        category: 'numbers',
        keywords: [
          'special number', 'gold number', 'platinum number', 'silver number', 'vip number', 
          'choose number', 'number select', 'pasand ka number', '050', '054', '056', 
          'accha number', 'khobsurat number', 'series', 'sequence', 'number', 'numbers', 
          'number chahiye', 'numbers dikhao', 'vip', 'deal', 'series number', 'sequence series',
          'konsa number', 'number list'
        ],
        answerEn: `✨ **Exclusive Gold, Platinum & Sequence Series Numbers**:\n\nWe offer an exclusive collection of VIP mobile numbers (starting with 050, 054, and 056). Each number comes with a **3-day (72 hours) reservation hold** so you have ample time to finalize your package before it is assigned.`,
        answerUr: `✨ **Exclusive Gold, Platinum aur Sequence Series Numbers**:\n\nideacorp ke paas premium VIP mobile numbers (050, 054, 056) ki taza collection dastiyab hai. Har number par **3 din (72 ghante) ki booking guarantee** milti hai taake aap ka pasandida number kisi aur ko na mil sakay!`,
        options: [
          { label: '💬 Talk to Agent for Booking', key: 'request_human' },
          { label: '📋 View Freedom Plans', key: 'postpaid_plans' }
        ]
      },

      // 6. Delivery Timeline & Doorstep Service
      {
        id: 'delivery_info',
        category: 'delivery',
        keywords: ['delivery', 'deliver', 'when will you deliver', 'office', 'branch', 'location', 'kab milega', 'kahan ana hoga', 'address', 'ghar par'],
        answerEn: `🚚 **Doorstep Delivery Within 24 Hours!**\n\n• **Timeline**: Your SIM card is delivered directly to your doorstep anywhere in the UAE within 24 hours of confirmation.\n• **Office / Branch Visits**: Our services are provided 100% online through our convenient door-to-door delivery model. You do NOT need to visit any physical office or queue in branches!\n• Our authorized representative will visit your home or office location at your convenience to complete the biometric registration.`,
        answerUr: `🚚 **24 Hours Ke Andar Doorstep Delivery!**\n\n• **Time**: Aap ka SIM card pure UAE me aap ke doorstep par 24 ghante ke andar deliver ho jata hai.\n• **Office / Branch**: Hum 100% door-to-door service provide karte hain. Aap ko kisi branch ya office jane ki bilkul zaroorat nahi!\n• Hamara authorized representative aap ke address par aa kar biometric verification complete karega.`,
        options: [
          { label: '📄 Required Documents', key: 'documents_info' },
          { label: '👨‍💼 Book a Delivery Slot', key: 'request_human' }
        ]
      },

      // 7. Emirates ID & Document Requirements
      {
        id: 'documents_info',
        category: 'documents',
        keywords: ['document', 'documents', 'emirates id', 'id', 'eid', 'visa', 'passport', 'kaunse document', 'kia chahiye', 'original id'],
        answerEn: `📄 **Document Requirements for UAE Postpaid Activation**:\n\n• **Original Physical Emirates ID**: The customer MUST have their valid, original physical Emirates ID present at delivery.\n• **Biometric Requirement**: A digital copy alone is NOT acceptable because biometric fingerprint verification is conducted on-site through the official telecom registration device.\n• **No extra paperwork**: No salary certificate or extra documents required! Only your valid original Emirates ID.`,
        answerUr: `📄 **Zaroori Documents**:\n\n• **Original Physical Emirates ID**: Delivery ke waqt customer ka apna original, valid physical Emirates ID hona laazmi hai.\n• **Biometric Zaroori Hai**: Sirf photo ya digital copy kafi nahi kyunki delivery ke waqt fingerprint biometric scan hota hai.\n• Koi salary certificate ya extra documents nahi chahiye, sirf original Emirates ID kafi hai.`,
        options: [
          { label: '🚚 Delivery Details', key: 'delivery_info' },
          { label: '👨‍💼 Talk to Sales Specialist', key: 'request_human' }
        ]
      },

      // 8. Eligibility: Emirati vs Expat Line Limits & Age
      {
        id: 'eligibility_limits',
        category: 'eligibility',
        keywords: ['two numbers', 'multiple numbers', 'how many numbers', 'expat', 'emirati', 'local', 'kitne number', 'dusra number', 'age', '18 years', 'under my id', 'limit'],
        answerEn: `• **Age Limit**: You must be at least **18 years old** to register a SIM card in your own name.\n• **Local Emirati Limit**: UAE Nationals (Emiratis) can register up to **7 postpaid lines** under their Emirates ID.\n• **Expatriate Limit**: Expats can hold up to a total of **5 lines** (combining both prepaid and postpaid lines) across the network, subject to AECB credit clearance.\n• If you already have 2 numbers and are an expat, you can still acquire additional numbers as long as your total count remains within the 5-line limit.`,
        answerUr: `• **Age Requirement**: Aap ki umar kam az kam **18 saal** honi chahiye.\n• **Local Emirati**: UAE Nationals apne Emirates ID par **7 postpaid lines** tak le sakte hain.\n• **Expats**: Expatriates ke liye total **5 lines** (prepaid + postpaid mila kar) allowed hain.\n• Agar aap ke paas pehle se 2 numbers hain toh aap mazeed numbers le sakte hain jab tak total 5 lines ka limit exceed na ho.`,
        options: [
          { label: '✨ Check Available Numbers', key: 'special_numbers' },
          { label: '👨‍💼 Talk to Sales Specialist', key: 'request_human' }
        ]
      },

      // 9. Keeping Existing Number / Porting from du (MNP)
      {
        id: 'porting_mnp',
        category: 'porting',
        keywords: ['port', 'porting', 'du', 'keep number', 'same number', 'switch', 'change network', 'number wahi rahega', 'du se etisalat'],
        answerEn: `🔁 **Yes! You can easily port your existing number to Etisalat (e&)!**\n\n• If you are currently using **du** (or another operator), you can keep your exact mobile number completely unchanged.\n• Everything remains the same—your contacts, digits, and WhatsApp—only your network carrier transitions to Etisalat.\n• You can enjoy our full promotional Freedom Plan discounts on your ported line!`,
        answerUr: `🔁 **Jee bilkul! Aap apna existing du number Etisalat (e&) par switch karwa sakte hain!**\n\n• Aap ka mobile number 100% wahi same rahega, koi digit change nahi hoga.\n• Sirf aap ka network du se switch ho kar Etisalat ho jayega.\n• Aap ko hamare discounted Freedom Postpaid packages usi same number par mil jayenge!`,
        options: [
          { label: '📋 View Freedom Plans', key: 'postpaid_plans' },
          { label: '👨‍💼 Request Number Porting', key: 'request_human' }
        ]
      },

      // 10. Activation Fee, Delivery Fee & Hidden Charges
      {
        id: 'fees_and_charges',
        category: 'billing',
        keywords: ['activation fee', 'delivery fee', 'hidden charges', 'extra charge', 'koi charge hai', 'delivery free hai', 'free delivery', 'charges'],
        answerEn: `• **Activation Fee**: **NONE (0 AED)**. There is no activation or connection fee.\n• **Delivery Fee**: **FREE (0 AED)**. Doorstep delivery across the UAE is completely free of charge.\n• **Hidden Charges**: **NO hidden charges whatsoever**. You only pay for your selected package monthly rental + standard UAE 5% VAT.`,
        answerUr: `• **Activation Fee**: **Bilkul FREE (0 AED)**. Koi activation charges nahi hain.\n• **Delivery Charges**: **Free Doorstep Delivery (0 AED)** pure UAE me.\n• **Hidden Charges**: **Koi hidden fees nahi hai**. Aap sirf apne selected package ka monthly bill + 5% UAE VAT ada karte hain.`,
        options: [
          { label: '📋 View Freedom Plans', key: 'postpaid_plans' },
          { label: '👨‍💼 Talk to Sales Specialist', key: 'request_human' }
        ]
      },

      // 11. Upfront Payment & AECB Score
      {
        id: 'aecb_upfront_payment',
        category: 'billing',
        keywords: ['deposit', 'advance', 'upfront', 'aecb', 'credit score', 'advance payment', 'paise pehle', 'deposit kitna'],
        answerEn: `• **Is there an advance payment or deposit?**: Any upfront payment is determined strictly by your **AECB (Al Etihad Credit Bureau) credit score** and telecom history.\n• If required, upfront payment typically ranges from minimum 50% to maximum one month rental as per AECB guidelines.\n• The exact amount is calculated automatically in the system and fully confirmed with you before finalizing your order.\n• **Payment Method**: Accepted via credit or debit card through the official secure payment link.`,
        answerUr: `• **Kiya advance payment ya deposit hai?**: Advance deposit customer ke **AECB (Credit Bureau) score** par depend karta hai.\n• AECB score ke mutabiq minimum 50% ya maximum 1 month rental upfront hota hai jo system confirm karta hai.\n• **Payment**: Sirf official credit/debit card secure channel ke zariye hoti hai.`,
        options: [
          { label: '📄 Document Requirements', key: 'documents_info' },
          { label: '👨‍💼 Check My Eligibility', key: 'request_human' }
        ]
      },

      // 12. Credit Limit & Excess Usage
      {
        id: 'credit_limit',
        category: 'billing',
        keywords: ['credit limit', 'excess', 'more data', 'more minutes', 'extra bill', '600 numbers', 'limit kitni'],
        answerEn: `• **Credit Limit Facility**: Each postpaid connection is equipped with a customizable credit limit ranging from **100 AED to 1500 AED**.\n• If you make premium calls (such as numbers starting with 600) or consume extra minutes/data, charges are adjusted within your credit limit to protect you from unexpected high bills.\n• You can monitor and adjust your limit anytime inside the My Etisalat (e& UAE) app.`,
        answerUr: `• **Credit Limit Facility**: Har postpaid line par **100 AED se 1500 AED** tak credit limit hoti hai.\n• Agar aap extra minutes use karein ya 600 numbers par call karein toh charges is credit limit se adjust hote hain taake unexpect bill na aye.\n• Aap My Etisalat app me apni credit limit kabhi bhi check ya adjust kar sakte hain.`,
        options: [
          { label: '📋 View Freedom Plans', key: 'postpaid_plans' },
          { label: '👨‍💼 Talk to Sales Specialist', key: 'request_human' }
        ]
      },

      // 13. Physical SIM vs eSIM
      {
        id: 'sim_type_esim',
        category: 'sim',
        keywords: ['esim', 'physical sim', 'sim card', 'e-sim', 'qr code', 'digital sim', 'iphone esim'],
        answerEn: `📱 **Both Physical SIM & eSIM are supported!**\n\n• **Physical SIM**: Delivered to your doorstep within 24 hours with on-site biometric verification.\n• **eSIM**: If your smartphone supports eSIM (such as iPhone XR or newer, Samsung Galaxy S20+, etc.), we can activate an instant eSIM via QR code after verification!`,
        answerUr: `📱 **Physical SIM aur eSIM dono available hain!**\n\n• **Physical SIM**: 24 ghante ke andar aap ke ghar deliver hoti hai biometric ke sath.\n• **eSIM**: Agar aap ka mobile eSIM compatible hai toh verification ke baad foran QR code ke zariye instant activate ho sakti hai!`,
        options: [
          { label: '🚚 Delivery Info', key: 'delivery_info' },
          { label: '👨‍💼 Talk to Sales Specialist', key: 'request_human' }
        ]
      },

      // 14. Trust, Security & Official e& Partnership
      {
        id: 'trust_and_authority',
        category: 'trust',
        keywords: ['trust', 'scam', 'fraud', 'etisalat', 'authorized', 'channel partner', 'asli hai', 'kaise yaqeen', 'who are you', 'ideacorp'],
        answerEn: `🔒 **Why You Can Trust ideacorp**:\n\n• **Official Authorized Partner**: ideacorp is an authorized direct channel partner of **e& (Etisalat UAE)**.\n• **Official Telecom Verification**: All applications are registered and authenticated directly on the official e& telecom portal.\n• **Biometric Safety**: Biometric scanning is performed using official certified telecom equipment.\n• **Security Reminder**: We will NEVER ask you for your online banking passwords, credit card CVV/PIN, or confidential OTPs over chat.`,
        answerUr: `🔒 **Aap Ham Par Mukammal Aitmaad Kar Sakte Hain**:\n\n• **Official Channel Partner**: ideacorp **e& (Etisalat UAE)** ka official authorized channel partner hai.\n• **Official Portal**: Tamam registration aur biometric official e& telecom portal par conduct hoti hai.\n• **Security**: Hum kabhi bhi aap se OTP, bank passwords ya ATM PIN nahi maangtay.`,
        options: [
          { label: '📋 View Freedom Plans', key: 'postpaid_plans' },
          { label: '👨‍💼 Talk to Sales Specialist', key: 'request_human' }
        ]
      },

      // 15. Roaming & Travel
      {
        id: 'roaming_support',
        category: 'roaming',
        keywords: ['roaming', 'outside uae', 'travel', 'international use', 'bahir use', 'india me chalegi', 'roaming pack'],
        answerEn: `✈️ **International Roaming**:\n\n• Yes, your postpaid line supports worldwide roaming across 100+ partner networks.\n• When traveling abroad, incoming calls and roaming data are billed according to international roaming rates unless an active roaming package is enabled.\n• You can easily activate affordable daily or weekly roaming packs directly via the My Etisalat (e& UAE) app before your trip!`,
        answerUr: `✈️ **International Roaming**:\n\n• Jee bilkul, aap UAE se bahir bhi ye SIM use kar sakte hain.\n• Bahir travel karne se pehle aap My Etisalat app se roaming bundle activate kar sakte hain taake cheap rates milen.`,
        options: [
          { label: '📋 View Freedom Plans', key: 'postpaid_plans' },
          { label: '👨‍💼 Talk to Sales Specialist', key: 'request_human' }
        ]
      },

      // 16. Pro-rata Billing Explanation
      {
        id: 'prorata_billing',
        category: 'billing',
        keywords: ['pro-rata', 'prorata', 'first bill', 'pehla bill', 'billing cycle', 'bill kab aye ga'],
        answerEn: `📅 **What does Pro-Rata Payment mean?**\n\n• Pro-rata means in your first bill, you **only pay for the exact number of days you actually used the service** during the initial month!\n• For example, if your line is activated on the 20th of a 30-day month, you only pay for the remaining 10 days rather than a full month.`,
        answerUr: `📅 **Pro-Rata Billing Kiya Hoti Hai?**\n\n• Pro-rata ka matlab hai ke pehle maheene me aap sirf un dino ke paise ada karte hain jin dino aap ne service use ki hai.\n• Agar aap ki line month ke darmiyan me activate hoti hai toh poore maheene ka nahi balke sirf bache hue dino ka bill aata hai.`,
        options: [
          { label: '📋 View Freedom Plans', key: 'postpaid_plans' },
          { label: '👨‍💼 Talk to Sales Specialist', key: 'request_human' }
        ]
      },

      // 17. Callback Request
      {
        id: 'callback_request',
        category: 'support',
        keywords: ['call back', 'call me', 'phone par baat', 'callback', 'phone karein', 'call karlo'],
        answerEn: `📞 **Callback Arrangement**:\n\nWe will gladly arrange a prompt phone call with our dedicated sales specialist! Please share your convenient time and contact number, or click below to chat live right now.`,
        answerUr: `📞 **Call Back Arrangement**:\n\nHum aap ko jald se jald call karwa dete hain! Aap apna convenient time aur number share karein ya foran live sales agent se chat karne ke liye niche click karein.`,
        options: [
          { label: '👨‍💼 Talk to Live Agent Now', key: 'request_human' },
          { label: '📋 View Freedom Plans', key: 'postpaid_plans' }
        ]
      }
    ];

    // Escalation trigger keywords indicating the customer wants a human
    this.humanTriggers = [
      'human', 'agent', 'insaan', 'person', 'representative', 'sales person', 
      'sales rep', 'specialist', 'real person', 'baat karni', 'connect me', 
      'transfer', 'live agent', 'banda', 'operator', 'call me'
    ];
  }

  /**
   * Check if the customer's message explicitly requests human escalation
   */
  isHumanEscalation(message) {
    if (!message) return false;
    const lower = String(message).toLowerCase().trim();
    return this.humanTriggers.some(trigger => lower.includes(trigger));
  }

  /**
   * Detect whether query is predominantly Roman Urdu or English
   */
  detectLanguage(text) {
    const urduKeywords = [
      'kya', 'kia', 'kaun', 'kitna', 'kitne', 'hai', 'hain', 'mein', 'mera', 'meri', 
      'mujhe', 'chahiye', 'karna', 'karni', 'bhai', 'jani', 'aap', 'pehle', 'baad', 
      'sakta', 'sakti', 'hoga', 'hogi', 'paise', 'ghar', 'wahi', 'kaise', 'bilkul'
    ];
    const lower = text.toLowerCase();
    const count = urduKeywords.filter(k => lower.includes(k)).length;
    return count >= 1 ? 'ur' : 'en';
  }

  /**
   * Resolve an automated response based on Telecom Knowledge Base
   * @param {string} userMessage - Customer question
   * @returns {Object} { text, options, intent, isHumanRequest, numbers }
   */
  async getResponse(userMessage) {
    const raw = String(userMessage || '').trim();
    const lower = raw.toLowerCase();
    const lang = this.detectLanguage(lower);

    // 1. Check for explicit human agent requests
    if (this.isHumanEscalation(lower)) {
      const text = lang === 'ur'
        ? `Ji bilkul! Main aap ko foran hamare Dedicated Sales Specialist se connect kar raha hoon 👨‍💼. Ek moment hold karein...`
        : `Connecting you with our dedicated Sales Specialist right now! 👨‍💼 Please hold on for just a moment...`;

      return {
        text,
        isHumanRequest: true,
        intent: 'human_escalation',
        options: [
          { label: '👨‍💼 Connect to Live Specialist', key: 'request_human' }
        ]
      };
    }

    // 2. Score knowledge base articles
    let bestMatch = null;
    let highestScore = 0;

    for (const item of this.knowledgeBase) {
      let score = 0;
      for (const kw of item.keywords) {
        if (lower.includes(kw)) {
          score += kw.length; // weight longer, more specific keywords
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = item;
      }
    }

    // 3. Return best matching telecom response
    if (bestMatch && highestScore >= 3) {
      let text = lang === 'ur' ? bestMatch.answerUr : bestMatch.answerEn;
      let options = [...bestMatch.options];
      let numbers = null;

      // Special Sequence / Series Numbers Showcase Integration
      const isNumberInquiry = bestMatch.id === 'special_numbers' || 
        /(series|sequence|numbers?|gold|platinum|silver|vip|deal)/i.test(lower);

      if (isNumberInquiry) {
        try {
          const sampleSeries = await TelecomNumber.getSampleSeries({ limit: 6 });
          if (sampleSeries && sampleSeries.length > 0) {
            numbers = sampleSeries;
            const seriesLines = sampleSeries.map(s => {
              const icon = s.category?.toLowerCase().includes('platinum') ? '💎' 
                : s.category?.toLowerCase().includes('gold') ? '✨' 
                : '🥈';
              return `• ${icon} **${s.mssid}** (${s.category}) — Available`;
            }).join('\n');

            if (lang === 'ur') {
              text = `${text}\n\n📱 **Dastiyab VIP & Sequence Series Numbers (Live Pool):**\n${seriesLines}\n\n🔒 **3 Din (72 Ghante) Ki Booking Guarantee:**\nAap in me se koi bhi number **3 din tak book** karwa sakte hain. Agar aap 3 din me number activate karwa len toh permanently aap ka ho jata hai. Agar na bikay toh 3 din baad wapis pool me release ho jata hai!`;
            } else {
              text = `${text}\n\n📱 **Available VIP & Sequence Series Numbers (Live Pool):**\n${seriesLines}\n\n🔒 **3-Day (72 Hours) Booking Policy:**\nYou can reserve any number for **3 days**. If finalized, it is locked permanently to you. If unsold after 3 days, it automatically returns to the open pool.`;
            }

            options = [
              ...sampleSeries.slice(0, 3).map(s => ({
                label: `🔒 Book ${s.mssid}`,
                key: `book_${s.mssid}`,
                mssid: s.mssid
              })),
              { label: '👨‍💼 Speak to Agent for Booking', key: 'request_human' },
              { label: '📋 View Freedom Plans', key: 'postpaid_plans' }
            ];
          }
        } catch (seriesErr) {
          console.error('[AI Series Numbers Showcase Error]', seriesErr.message);
        }
      }

      return {
        text,
        isHumanRequest: false,
        intent: bestMatch.id,
        options,
        numbers
      };
    }

    // 4. Courteous telecom greeting / fallback
    const fallbackEn = `Hello! I am your **ideacorp Telecom AI Assistant** 🤖.\n\nWith ideacorp, an authorized channel partner of e&, we offer the **Freedom Postpaid Plans (250 / 325 / 500)** with exclusive discounts, Gold & Platinum numbers, and 24h doorstep delivery across the UAE.\n\nHow may I help you today? You can choose a topic below or speak directly to a live sales specialist:`;
    const fallbackUr = `Assalam-o-Alaikum! Main **ideacorp Telecom AI Assistant** hoon 🤖.\n\nideacorp (authorized channel partner of e&) ke sath aap ko **Freedom Postpaid Plans (250 / 325 / 500)** par special discounts, Gold/Platinum VIP numbers, aur 24 ghante ke andar doorstep delivery milti hai.\n\nAap niche diye gaye options me se select kar sakte hain ya live human agent se baat kar sakte hain:`;

    return {
      text: lang === 'ur' ? fallbackUr : fallbackEn,
      isHumanRequest: false,
      intent: 'general_welcome',
      options: [
        { label: '📋 View Freedom Plans', key: 'postpaid_plans' },
        { label: '✨ Gold & Platinum Numbers', key: 'special_numbers' },
        { label: '🚚 24h Doorstep Delivery', key: 'delivery_info' },
        { label: '👨‍💼 Talk to Live Specialist', key: 'request_human' }
      ]
    };
  }
}

module.exports = new TelecomAiService();

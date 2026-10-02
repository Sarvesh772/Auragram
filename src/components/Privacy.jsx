import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

const sections = [
  ['Who we are', 'Auragram is operated by Sarvesh Kumar. In this policy, “Auragram”, “we”, “us” and “our” mean the Auragram social SaaS platform and its operator.'],
  ['Information we collect', 'We collect account and profile information such as your email address, username, display name, avatar and bio. We process content you choose to upload or send, including posts, photos, videos, comments, messages and support requests. We also receive usage and technical information such as device/browser details, approximate activity timestamps, crash logs and interactions needed to operate, secure and improve the service.'],
  ['How we use information', 'We use information to authenticate accounts, provide feeds and profiles, deliver messaging and notifications, enforce Free and Premium feature limits, process support requests, prevent abuse, maintain security, measure product performance and communicate service updates.'],
  ['Storage and service providers', 'Auragram uses Supabase Authentication, database services and storage to operate accounts and user content. We may use infrastructure, analytics, email, customer-support and payment providers as service processors. Providers receive only the information needed for their contracted function and are expected to protect it.'],
  ['Premium payments', 'Premium subscriptions may be processed through RBI-regulated or otherwise authorised payment gateways, including the provider shown at checkout. Auragram does not store raw card numbers, CVV, UPI PINs or banking passwords on its servers. Payment providers process payment credentials under their own policies; Auragram receives transaction and subscription status needed to provide Premium benefits and support.'],
  ['Cookies and similar technologies', 'We use essential local storage, cookies or similar technologies for authentication, preferences, session continuity, security and basic usage measurement. You can control cookies through your browser, but disabling essential technologies may affect sign-in or core features.'],
  ['Security and retention', 'We use HTTPS, access controls, row-level database policies and operational safeguards designed to protect information. No online service can guarantee absolute security. We retain information for as long as needed to provide the service, meet legal obligations, resolve disputes, enforce agreements and maintain legitimate business records, then delete or anonymise it where reasonably possible.'],
  ['Your choices and rights', 'Subject to applicable law, you may access, correct or delete profile information, manage content through the app, request account deletion, withdraw optional permissions and ask about processing of your data. Contact us to make a privacy request; we may verify your identity before acting. You may also complain to your local data-protection authority.'],
  ['Children and third-party links', 'Auragram is not directed to children who cannot legally use the service. Do not create an account if you are not permitted to do so. Links to third-party websites or services are governed by their own terms and privacy notices.'],
  ['Contact and updates', 'For privacy questions or data requests, email support@auragram.in. We may update this policy as Auragram changes. The “Last updated” date shows when the current version was published.']
];

const sectionsHi = [
  ['हम कौन हैं', 'Auragram, Sarvesh Kumar द्वारा संचालित है। इस नीति में “Auragram”, “हम” और “हमारा” का अर्थ Auragram सोशल SaaS प्लेटफ़ॉर्म और उसका संचालक है।'],
  ['हम कौन-सी जानकारी एकत्र करते हैं', 'हम खाता और प्रोफ़ाइल जानकारी एकत्र करते हैं, जैसे आपका ईमेल पता, उपयोगकर्ता नाम (username), प्रदर्शित नाम, अवतार और बायो। जो सामग्री आप अपलोड या भेजना चुनते हैं — पोस्ट, फ़ोटो, वीडियो, टिप्पणियाँ, संदेश और सहायता अनुरोध — उसे हम संसाधित करते हैं। हम उपयोग और तकनीकी जानकारी भी प्राप्त करते हैं, जैसे डिवाइस/ब्राउज़र का विवरण, गतिविधि के अनुमानित समय, क्रैश लॉग और सेवा को चलाने, सुरक्षित रखने और बेहतर बनाने के लिए आवश्यक इंटरैक्शन।'],
  ['हम जानकारी का उपयोग कैसे करते हैं', 'हम जानकारी का उपयोग खातों को प्रमाणित करने, फ़ीड और प्रोफ़ाइल उपलब्ध कराने, मैसेजिंग और सूचनाएँ भेजने, Free और Premium सुविधाओं की सीमाएँ लागू करने, सहायता अनुरोध संसाधित करने, दुरुपयोग रोकने, सुरक्षा बनाए रखने, उत्पाद का प्रदर्शन मापने और सेवा से जुड़े अपडेट बताने के लिए करते हैं।'],
  ['भंडारण और सेवा प्रदाता', 'Auragram खातों और उपयोगकर्ता सामग्री को चलाने के लिए Supabase Authentication, डेटाबेस सेवाओं और स्टोरेज का उपयोग करता है। हम अवसंरचना, एनालिटिक्स, ईमेल, ग्राहक-सहायता और भुगतान प्रदाताओं को सेवा प्रोसेसर के रूप में उपयोग कर सकते हैं। प्रदाताओं को केवल उनके तय कार्य के लिए आवश्यक जानकारी ही मिलती है और उनसे उसकी सुरक्षा की अपेक्षा की जाती है।'],
  ['प्रीमियम भुगतान', 'प्रीमियम सदस्यता RBI-नियंत्रित या अन्यथा अधिकृत भुगतान गेटवे के माध्यम से संसाधित की जा सकती है, जिसमें चेकआउट पर दिखाया गया प्रदाता शामिल है। Auragram अपने सर्वर पर कच्चे कार्ड नंबर, CVV, UPI PIN या बैंकिंग पासवर्ड संग्रहीत नहीं करता। भुगतान प्रदाता भुगतान क्रेडेंशियल्स को अपनी नीतियों के अनुसार संसाधित करते हैं; Auragram को प्रीमियम लाभ और सहायता देने के लिए आवश्यक लेनदेन और सदस्यता की स्थिति प्राप्त होती है।'],
  ['कुकीज़ और समान तकनीकें', 'हम प्रमाणीकरण (login), प्राथमिकताओं, सत्र निरंतरता, सुरक्षा और बुनियादी उपयोग माप के लिए आवश्यक लोकल स्टोरेज, कुकीज़ या समान तकनीकों का उपयोग करते हैं। आप अपने ब्राउज़र से कुकीज़ नियंत्रित कर सकते हैं, लेकिन आवश्यक तकनीकें बंद करने से साइन-इन या मुख्य सुविधाएँ प्रभावित हो सकती हैं।'],
  ['सुरक्षा और डेटा प्रतिधारण', 'हम जानकारी की सुरक्षा के लिए HTTPS, एक्सेस नियंत्रण, रो-लेवल डेटाबेस नीतियाँ और परिचालन सुरक्षा उपायों का उपयोग करते हैं। कोई भी ऑनलाइन सेवा पूर्ण सुरक्षा की गारंटी नहीं दे सकती। हम जानकारी उतने समय तक रखते हैं जितना सेवा देने, कानूनी दायित्व पूरे करने, विवाद सुलझाने, समझौतों को लागू करने और वैध व्यावसायिक रिकॉर्ड रखने के लिए आवश्यक हो, और उसके बाद जहाँ उचित रूप से संभव हो उसे हटा देते हैं या अनाम कर देते हैं।'],
  ['आपके विकल्प और अधिकार', 'लागू कानून के अधीन, आप प्रोफ़ाइल जानकारी देख, सुधार या हटा सकते हैं, ऐप के माध्यम से सामग्री प्रबंधित कर सकते हैं, खाता हटाने का अनुरोध कर सकते हैं, वैकल्पिक अनुमतियाँ वापस ले सकते हैं और अपने डेटा के प्रसंस्करण के बारे में पूछ सकते हैं। गोपनीयता से जुड़े अनुरोध के लिए हमसे संपर्क करें; कार्रवाई से पहले हम आपकी पहचान सत्यापित कर सकते हैं। आप अपने स्थानीय डेटा-संरक्षण प्राधिकरण से शिकायत भी कर सकते हैं।'],
  ['बच्चे और तीसरे पक्ष के लिंक', 'Auragram उन बच्चों के लिए नहीं है जो कानूनी रूप से इस सेवा का उपयोग नहीं कर सकते। यदि आपको खाता बनाने की अनुमति नहीं है, तो खाता न बनाएँ। तीसरे पक्ष की वेबसाइटों या सेवाओं के लिंक उनकी अपनी शर्तों और गोपनीयता सूचनाओं द्वारा नियंत्रित होते हैं।'],
  ['संपर्क और अपडेट', 'गोपनीयता से जुड़े प्रश्न या डेटा अनुरोध के लिए support@auragram.in पर ईमेल करें। Auragram में बदलाव के साथ हम इस नीति को अपडेट कर सकते हैं। “अंतिम अपडेट” तिथि दर्शाती है कि वर्तमान संस्करण कब प्रकाशित हुआ।']
];

export default function Privacy({ onBack }) {
  const [hindi, setHindi] = useState(false);
  const list = hindi ? sectionsHi : sections;

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-white md:p-8">
      <div className="mx-auto max-w-3xl">
        <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800">
          <ArrowLeft className="h-4 w-4" /> {hindi ? 'वापस' : 'Back'}
        </button>
        <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 md:p-10">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-950/50">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black">{hindi ? 'गोपनीयता नीति' : 'Privacy Policy'}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">{hindi ? 'अंतिम अपडेट: 2 अक्टूबर 2026' : 'Last updated: 2 October 2026'}</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold dark:bg-slate-800">
              <button onClick={() => setHindi(false)} className={!hindi ? 'rounded-lg bg-white px-2 py-1 text-purple-600 shadow-sm dark:bg-slate-700' : 'px-2 py-1 text-slate-500'}>English</button>
              <button onClick={() => setHindi(true)} className={hindi ? 'rounded-lg bg-white px-2 py-1 text-purple-600 shadow-sm dark:bg-slate-700' : 'px-2 py-1 text-slate-500'}>हिन्दी</button>
            </div>
          </div>
          {list.map(([title, body]) => (
            <section key={title} className="border-t border-slate-100 py-5 dark:border-slate-800">
              <h2 className="text-lg font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

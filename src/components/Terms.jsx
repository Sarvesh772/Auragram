import React, { useState } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';

const sections = [
  ['Acceptance and operator', 'These Terms and Conditions govern your use of Auragram, a social SaaS platform operated by Sarvesh Kumar. By creating an account or using Auragram, you agree to these Terms and our Privacy Policy.'],
  ['Eligibility and account responsibility', 'You must be legally permitted to use the service and provide accurate, current account information. Keep your password and sign-in methods confidential, promptly report unauthorised access, and do not use another person\'s account. You are responsible for activity performed through your account.'],
  ['Free and Premium features', 'Free accounts may upload videos up to 2 minutes and 1080p, use up to 2 bio links, a 90-character bio and 500-character captions, with standard support. Premium accounts may receive a verified profile badge, videos up to 7 minutes and 2K, up to 5 bio links, a 150-character bio, 1,500-character captions and priority support. Limits and benefits are subject to the plan shown at checkout and may change prospectively.'],
  ['Fair use and uploads', 'Upload or share only material you own or are authorised to use. Do not upload unlawful, fraudulent, abusive, hateful, sexually exploitative, threatening, defamatory, infringing or malicious content; scrape the service; impersonate others; spam users; or bypass technical, storage or plan limits. We may review, restrict or remove content that violates these Terms or creates risk.'],
  ['Payments and subscriptions', 'Premium pricing, billing period and taxes are shown before checkout. Payments are handled by the third-party gateway presented in the app; Auragram does not store raw card numbers, CVV, UPI PINs or banking passwords. Refunds, cancellations and eligibility are governed by the separate Refund & Cancellation Policy.'],
  ['Your content and our licence', 'You retain ownership of content you submit. You grant Auragram a limited, non-exclusive, worldwide licence to host, store, reproduce, format, display and transmit that content only as needed to operate, secure and improve the service and provide it to your selected audience.'],
  ['Auragram intellectual property', 'Auragram names, logos, interface, software, design and original materials belong to Sarvesh Kumar or our licensors. Except for the rights expressly granted in these Terms, you may not copy, modify, distribute, reverse engineer or commercially exploit them.'],
  ['Moderation, suspension and termination', 'We may suspend, limit or terminate accounts or remove content for violations, fraud, security concerns, legal requests or prolonged inactivity. You may stop using the service or request account deletion. Clauses concerning ownership, payment obligations, liability and disputes survive termination where applicable.'],
  ['Availability and liability', 'Auragram is provided on an as-available basis. We work to keep the service reliable but do not promise uninterrupted access, error-free operation or permanent availability of any feature. To the extent permitted by law, Sarvesh Kumar is not liable for indirect or consequential loss arising from use of the service.'],
  ['Changes and contact', 'We may update these Terms when the service or law changes. Material updates will be communicated through the app or website where reasonably possible. Continued use after the effective date means you accept the updated Terms. Questions can be sent to support@auragram.in.']
];

const sectionsHi = [
  ['स्वीकृति और संचालक', 'ये नियम और शर्तें Auragram के आपके उपयोग को नियंत्रित करती हैं, जो Sarvesh Kumar द्वारा संचालित एक सोशल SaaS प्लेटफ़ॉर्म है। Auragram पर खाता बनाकर या इसका उपयोग करके, आप इन शर्तों और हमारी गोपनीयता नीति से सहमत होते हैं।'],
  ['पात्रता और खाते की ज़िम्मेदारी', 'सेवा का उपयोग करने की कानूनी अनुमति आपके पास होनी चाहिए और आपको सही, वर्तमान खाता जानकारी देनी चाहिए। अपना पासवर्ड और साइन-इन तरीके गोपनीय रखें, अनधिकृत पहुँच की तुरंत सूचना दें, और किसी अन्य व्यक्ति के खाते का उपयोग न करें। आपके खाते से की गई गतिविधि की ज़िम्मेदारी आपकी है।'],
  ['Free और Premium सुविधाएँ', 'Free खाते 2 मिनट और 1080p तक के वीडियो अपलोड कर सकते हैं, 2 bio लिंक, 90-अक्षर का bio और 500-अक्षर के कैप्शन के साथ, सामान्य सहायता के साथ। Premium खातों को सत्यापित प्रोफ़ाइल बैज, 7 मिनट और 2K तक के वीडियो, 5 bio लिंक तक, 150-अक्षर का bio, 1,500-अक्षर के कैप्शन और प्राथमिकता सहायता मिल सकती है। सीमाएँ और लाभ चेकआउट पर दिखाए गए प्लान के अधीन हैं और भविष्य में बदल सकते हैं।'],
  ['उचित उपयोग और अपलोड', 'केवल वही सामग्री अपलोड या साझा करें जिसका आप मालिक हैं या जिसका उपयोग करने के लिए आपको अधिकार है। अवैध, धोखाधड़ी वाली, दुर्व्यवहारपूर्ण, घृणास्पद, यौन-शोषणकारी, धमकी भरी, मानहानिकारक, अधिकार-उल्लंघनकारी या हानिकारक सामग्री अपलोड न करें; सेवा को स्क्रैप न करें; दूसरों का रूप धारण न करें; उपयोगकर्ताओं को स्पैम न करें; और तकनीकी, भंडारण या प्लान सीमाएँ न तोड़ें। जो सामग्री इन शर्तों का उल्लंघन करती है या जोखिम पैदा करती है, उसे हम जाँच, प्रतिबंधित या हटा सकते हैं।'],
  ['भुगतान और सदस्यता', 'Premium की कीमत, बिलिंग अवधि और कर चेकआउट से पहले दिखाए जाते हैं। भुगतान ऐप में दिखाए गए तीसरे पक्ष के गेटवे द्वारा संभाले जाते हैं; Auragram कच्चे कार्ड नंबर, CVV, UPI PIN या बैंकिंग पासवर्ड संग्रहीत नहीं करता। रिफ़ंड, रद्दीकरण और पात्रता अलग Refund & Cancellation Policy द्वारा नियंत्रित होते हैं।'],
  ['आपकी सामग्री और हमारा लाइसेंस', 'आप जो सामग्री सबमिट करते हैं उसका स्वामित्व आपके पास रहता है। आप Auragram को एक सीमित, गैर-अनन्य, विश्वव्यापी लाइसेंस देते हैं — उस सामग्री को होस्ट, संग्रहीत, पुनरुत्पादित, प्रारूपित, प्रदर्शित और प्रसारित करने के लिए — केवल सेवा चलाने, सुरक्षित रखने और बेहतर बनाने तथा आपके चुने हुए दर्शकों तक पहुँचाने के लिए आवश्यक सीमा तक।'],
  ['Auragram की बौद्धिक संपदा', 'Auragram के नाम, लोगो, इंटरफ़ेस, सॉफ़्टवेयर, डिज़ाइन और मूल सामग्री Sarvesh Kumar या हमारे लाइसेंसदाताओं की हैं। इन शर्तों में स्पष्ट रूप से दिए गए अधिकारों के अलावा, आप इन्हें कॉपी, संशोधित, वितरित, रिवर्स-इंजीनियर या व्यावसायिक रूप से उपयोग नहीं कर सकते।'],
  ['मॉडरेशन, निलंबन और समाप्ति', 'उल्लंघन, धोखाधड़ी, सुरक्षा चिंताओं, कानूनी अनुरोधों या लंबे समय तक निष्क्रियता के लिए हम खातों को निलंबित, सीमित या समाप्त कर सकते हैं, या सामग्री हटा सकते हैं। आप सेवा का उपयोग बंद कर सकते हैं या खाता हटाने का अनुरोध कर सकते हैं। स्वामित्व, भुगतान दायित्वों, दायित्व और विवादों से जुड़े प्रावधान लागू होने पर समाप्ति के बाद भी बने रहते हैं।'],
  ['उपलब्धता और दायित्व', 'Auragram “जैसी उपलब्ध हो” के आधार पर प्रदान किया जाता है। हम सेवा को भरोसेमंद रखने का प्रयास करते हैं, लेकिन निर्बाध पहुँच, त्रुटि-रहित संचालन या किसी सुविधा की स्थायी उपलब्धता का वादा नहीं करते। कानून द्वारा अनुमत सीमा तक, सेवा के उपयोग से होने वाली अप्रत्यक्ष या परिणामी हानि के लिए Sarvesh Kumar उत्तरदायी नहीं है।'],
  ['बदलाव और संपर्क', 'सेवा या कानून बदलने पर हम इन शर्तों को अपडेट कर सकते हैं। महत्वपूर्ण अपडेट जहाँ उचित रूप से संभव हो, ऐप या वेबसाइट के माध्यम से बताए जाएँगे। प्रभावी तिथि के बाद सेवा का उपयोग जारी रखने का अर्थ है कि आप अपडेट की गई शर्तों को स्वीकार करते हैं। प्रश्न support@auragram.in पर भेजे जा सकते हैं।']
];

export default function Terms({ onBack }) {
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
                <FileText className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black">{hindi ? 'नियम और शर्तें' : 'Terms & Conditions'}</h1>
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

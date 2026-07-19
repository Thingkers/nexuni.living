import type { DiscoveryItem, DiscoveryKind, LocalizedText } from '@/features/discovery/types'

const text = (en: string, bn: string): LocalizedText => ({ en, bn })
const location = (
  areaSlug: string,
  area: LocalizedText,
  campus: LocalizedText,
  latitude: number,
  longitude: number,
) => ({ areaSlug, area, campus, latitude, longitude, approximate: true })

export const BOOKS: DiscoveryItem[] = [
  {
    id: 'book-cse-discrete',
    slug: 'discrete-mathematics-seventh-edition',
    kind: 'book',
    title: text('Discrete Mathematics, 7th Edition', 'ডিসক্রিট ম্যাথমেটিক্স, ৭ম সংস্করণ'),
    summary: text('Clean CSE textbook with highlighted key formulas.', 'গুরুত্বপূর্ণ সূত্র হাইলাইট করা পরিচ্ছন্ন সিএসই পাঠ্যবই।'),
    description: text('A well-kept course copy suitable for first- and second-year CSE students. Pickup is available near AIUB.', 'প্রথম ও দ্বিতীয় বর্ষের সিএসই শিক্ষার্থীদের উপযোগী ভালো অবস্থার বই। এআইইউবির কাছে সংগ্রহ করা যাবে।'),
    location: location('kuratoli', text('Kuratoli', 'কুড়াতলী'), text('AIUB', 'এআইইউবি'), 23.8259, 90.4204),
    tags: [text('CSE', 'সিএসই'), text('Mathematics', 'গণিত')],
    category: 'textbook',
    categoryLabel: text('Textbook', 'পাঠ্যবই'),
    featured: true,
    priceBdt: 650,
    priceLabel: text('৳650 · negotiable', '৳৬৫০ · আলোচনা সাপেক্ষ'),
    attributes: [
      { label: text('Condition', 'অবস্থা'), value: text('Good', 'ভালো') },
      { label: text('Course', 'কোর্স'), value: text('Discrete Mathematics', 'ডিসক্রিট ম্যাথমেটিক্স') },
    ],
  },
  {
    id: 'book-accounting',
    slug: 'financial-accounting-fundamentals',
    kind: 'book',
    title: text('Financial Accounting Fundamentals', 'ফাইন্যান্সিয়াল অ্যাকাউন্টিং ফান্ডামেন্টালস'),
    summary: text('BBA reference copy with solved examples.', 'সমাধানসহ বিবিএ রেফারেন্স বই।'),
    description: text('Useful for introductory accounting courses with chapter notes and practice questions.', 'প্রাথমিক অ্যাকাউন্টিং কোর্সের জন্য অধ্যায়ভিত্তিক নোট ও অনুশীলনীসহ সহায়ক বই।'),
    location: location('bashundhara', text('Bashundhara R/A', 'বসুন্ধরা আবাসিক এলাকা'), text('NSU', 'এনএসইউ'), 23.8151, 90.4295),
    tags: [text('BBA', 'বিবিএ'), text('Accounting', 'অ্যাকাউন্টিং')],
    category: 'textbook',
    categoryLabel: text('Textbook', 'পাঠ্যবই'),
    priceBdt: 480,
    priceLabel: text('৳480', '৳৪৮০'),
    attributes: [
      { label: text('Condition', 'অবস্থা'), value: text('Fair', 'মোটামুটি') },
      { label: text('Department', 'বিভাগ'), value: text('Business', 'ব্যবসায় শিক্ষা') },
    ],
  },
  {
    id: 'book-ielts',
    slug: 'cambridge-ielts-practice-set',
    kind: 'book',
    title: text('Cambridge IELTS Practice Set', 'ক্যামব্রিজ আইইএলটিএস প্র্যাকটিস সেট'),
    summary: text('Three practice books with audio access notes.', 'অডিও অ্যাক্সেস নোটসহ তিনটি অনুশীলনী বই।'),
    description: text('A compact preparation bundle for students planning an IELTS test within the next semester.', 'আগামী সেমিস্টারে আইইএলটিএস পরীক্ষার প্রস্তুতি নেওয়া শিক্ষার্থীদের জন্য সংক্ষিপ্ত প্রস্তুতি সেট।'),
    location: location('nikunja', text('Nikunja 2', 'নিকুঞ্জ ২'), text('AIUB', 'এআইইউবি'), 23.8315, 90.4153),
    tags: [text('IELTS', 'আইইএলটিএস'), text('English', 'ইংরেজি')],
    category: 'reference',
    categoryLabel: text('Reference', 'রেফারেন্স'),
    featured: true,
    priceBdt: 900,
    priceLabel: text('৳900 for set', 'সেট ৳৯০০'),
    attributes: [
      { label: text('Condition', 'অবস্থা'), value: text('Like new', 'প্রায় নতুন') },
      { label: text('Books', 'বই'), value: text('3-volume set', '৩ খণ্ডের সেট') },
    ],
  },
  {
    id: 'book-civil-drawing',
    slug: 'engineering-drawing-workbook',
    kind: 'book',
    title: text('Engineering Drawing Workbook', 'ইঞ্জিনিয়ারিং ড্রয়িং ওয়ার্কবুক'),
    summary: text('Large-format workbook for architecture and civil courses.', 'আর্কিটেকচার ও সিভিল কোর্সের বড় আকারের ওয়ার্কবুক।'),
    description: text('Includes geometric construction exercises and mostly unused drawing sheets.', 'জ্যামিতিক নির্মাণ অনুশীলন ও অধিকাংশ অব্যবহৃত ড্রয়িং শিট রয়েছে।'),
    location: location('badda', text('Badda', 'বাড্ডা'), text('BRAC University', 'ব্র্যাক বিশ্ববিদ্যালয়'), 23.7805, 90.4266),
    tags: [text('Civil', 'সিভিল'), text('Architecture', 'আর্কিটেকচার')],
    category: 'workbook',
    categoryLabel: text('Workbook', 'ওয়ার্কবুক'),
    priceBdt: 350,
    priceLabel: text('৳350', '৳৩৫০'),
    attributes: [
      { label: text('Condition', 'অবস্থা'), value: text('Good', 'ভালো') },
      { label: text('Format', 'ধরন'), value: text('A3 workbook', 'এ৩ ওয়ার্কবুক') },
    ],
  },
]

export const SERVICES: DiscoveryItem[] = [
  {
    id: 'service-print',
    slug: 'campus-print-and-bind',
    kind: 'service',
    title: text('Campus Print & Bind', 'ক্যাম্পাস প্রিন্ট অ্যান্ড বাইন্ড'),
    summary: text('Fast thesis, assignment and color printing.', 'দ্রুত থিসিস, অ্যাসাইনমেন্ট ও রঙিন প্রিন্টিং।'),
    description: text('Student-focused print shop with same-day spiral binding and document delivery around Kuratoli.', 'কুড়াতলী এলাকায় একই দিনে স্পাইরাল বাইন্ডিং ও ডকুমেন্ট ডেলিভারিসহ শিক্ষার্থীবান্ধব প্রিন্ট শপ।'),
    location: location('kuratoli', text('Kuratoli', 'কুড়াতলী'), text('AIUB', 'এআইইউবি'), 23.8249, 90.4212),
    tags: [text('Printing', 'প্রিন্টিং'), text('Binding', 'বাইন্ডিং')],
    category: 'printing',
    categoryLabel: text('Printing', 'প্রিন্টিং'),
    featured: true,
    priceLabel: text('From ৳2 per page', 'প্রতি পৃষ্ঠা ৳২ থেকে'),
    attributes: [
      { label: text('Hours', 'সময়'), value: text('8:00 AM–10:00 PM', 'সকাল ৮টা–রাত ১০টা') },
      { label: text('Student offer', 'শিক্ষার্থী অফার'), value: text('10% off bulk jobs', 'বাল্ক কাজে ১০% ছাড়') },
    ],
  },
  {
    id: 'service-laundry',
    slug: 'nikunja-student-laundry',
    kind: 'service',
    title: text('Nikunja Student Laundry', 'নিকুঞ্জ স্টুডেন্ট লন্ড্রি'),
    summary: text('Wash, fold and weekly pickup plans.', 'ধোয়া, ভাঁজ ও সাপ্তাহিক পিকআপ পরিকল্পনা।'),
    description: text('Affordable laundry packages designed for mess and shared-flat residents.', 'মেস ও শেয়ারড ফ্ল্যাটে থাকা শিক্ষার্থীদের জন্য সাশ্রয়ী লন্ড্রি প্যাকেজ।'),
    location: location('nikunja', text('Nikunja 2', 'নিকুঞ্জ ২'), text('AIUB', 'এআইইউবি'), 23.8308, 90.4161),
    tags: [text('Laundry', 'লন্ড্রি'), text('Pickup', 'পিকআপ')],
    category: 'laundry',
    categoryLabel: text('Laundry', 'লন্ড্রি'),
    priceLabel: text('Plans from ৳499', 'প্যাকেজ ৳৪৯৯ থেকে'),
    attributes: [
      { label: text('Hours', 'সময়'), value: text('9:00 AM–9:00 PM', 'সকাল ৯টা–রাত ৯টা') },
      { label: text('Turnaround', 'সময় লাগে'), value: text('24–48 hours', '২৪–৪৮ ঘণ্টা') },
    ],
  },
  {
    id: 'service-food',
    slug: 'bashundhara-meal-box',
    kind: 'service',
    title: text('Bashundhara Meal Box', 'বসুন্ধরা মিল বক্স'),
    summary: text('Monthly lunch and dinner subscriptions.', 'মাসিক দুপুর ও রাতের খাবার সাবস্ক্রিপশন।'),
    description: text('Home-style rotating meals with vegetarian and high-protein options for students.', 'শিক্ষার্থীদের জন্য নিরামিষ ও উচ্চ-প্রোটিন বিকল্পসহ ঘরোয়া খাবারের পরিবর্তনশীল মেনু।'),
    location: location('bashundhara', text('Bashundhara R/A', 'বসুন্ধরা আবাসিক এলাকা'), text('NSU', 'এনএসইউ'), 23.8139, 90.4302),
    tags: [text('Food', 'খাবার'), text('Subscription', 'সাবস্ক্রিপশন')],
    category: 'food',
    categoryLabel: text('Food', 'খাবার'),
    featured: true,
    priceLabel: text('From ৳85 per meal', 'প্রতি মিল ৳৮৫ থেকে'),
    attributes: [
      { label: text('Delivery', 'ডেলিভারি'), value: text('Daily campus delivery', 'প্রতিদিন ক্যাম্পাস ডেলিভারি') },
      { label: text('Menu', 'মেনু'), value: text('7-day rotation', '৭ দিনের পরিবর্তনশীল মেনু') },
    ],
  },
  {
    id: 'service-repair',
    slug: 'student-device-repair',
    kind: 'service',
    title: text('Student Device Repair', 'স্টুডেন্ট ডিভাইস রিপেয়ার'),
    summary: text('Laptop diagnostics and phone repair near Badda.', 'বাড্ডার কাছে ল্যাপটপ ডায়াগনস্টিক ও ফোন মেরামত।'),
    description: text('Transparent diagnostic fees and student-priced common repairs with written estimates.', 'লিখিত হিসাবসহ স্বচ্ছ ডায়াগনস্টিক ফি ও শিক্ষার্থী মূল্যে সাধারণ মেরামত।'),
    location: location('badda', text('Badda', 'বাড্ডা'), text('BRAC University', 'ব্র্যাক বিশ্ববিদ্যালয়'), 23.7812, 90.4258),
    tags: [text('Repair', 'মেরামত'), text('Laptop', 'ল্যাপটপ')],
    category: 'repair',
    categoryLabel: text('Device repair', 'ডিভাইস মেরামত'),
    priceLabel: text('Diagnosis from ৳300', 'ডায়াগনস্টিক ৳৩০০ থেকে'),
    attributes: [
      { label: text('Hours', 'সময়'), value: text('10:00 AM–8:00 PM', 'সকাল ১০টা–রাত ৮টা') },
      { label: text('Warranty', 'ওয়ারেন্টি'), value: text('7-day service warranty', '৭ দিনের সার্ভিস ওয়ারেন্টি') },
    ],
  },
]

export const JOBS: DiscoveryItem[] = [
  {
    id: 'job-campus-ambassador',
    slug: 'campus-ambassador-aiub',
    kind: 'job',
    title: text('Campus Ambassador', 'ক্যাম্পাস অ্যাম্বাসেডর'),
    summary: text('Flexible student community role around AIUB.', 'এআইইউবিকেন্দ্রিক নমনীয় স্টুডেন্ট কমিউনিটি ভূমিকা।'),
    description: text('Help coordinate student events, collect feedback and represent a growing education platform on campus.', 'স্টুডেন্ট ইভেন্ট সমন্বয়, মতামত সংগ্রহ এবং ক্যাম্পাসে একটি বর্ধনশীল শিক্ষা প্ল্যাটফর্মের প্রতিনিধিত্ব করুন।'),
    location: location('kuratoli', text('Kuratoli', 'কুড়াতলী'), text('AIUB', 'এআইইউবি'), 23.8263, 90.4201),
    tags: [text('Marketing', 'মার্কেটিং'), text('Community', 'কমিউনিটি')],
    category: 'part-time',
    categoryLabel: text('Part-time', 'পার্ট-টাইম'),
    featured: true,
    priceLabel: text('৳8,000–12,000 / month', 'মাসে ৳৮,০০০–১২,০০০'),
    attributes: [
      { label: text('Organization', 'প্রতিষ্ঠান'), value: text('EduConnect BD', 'এডুকানেক্ট বিডি') },
      { label: text('Schedule', 'সময়সূচি'), value: text('10 hours/week', 'সপ্তাহে ১০ ঘণ্টা') },
    ],
  },
  {
    id: 'job-design-intern',
    slug: 'junior-ui-design-intern',
    kind: 'job',
    title: text('Junior UI Design Intern', 'জুনিয়র ইউআই ডিজাইন ইন্টার্ন'),
    summary: text('Hybrid product-design internship for current students.', 'বর্তমান শিক্ষার্থীদের জন্য হাইব্রিড প্রোডাক্ট ডিজাইন ইন্টার্নশিপ।'),
    description: text('Support wireframes, design systems and usability reviews with a small product team.', 'ছোট প্রোডাক্ট দলের সঙ্গে ওয়্যারফ্রেম, ডিজাইন সিস্টেম ও ব্যবহারযোগ্যতা পর্যালোচনায় সহায়তা করুন।'),
    location: location('bashundhara', text('Bashundhara R/A', 'বসুন্ধরা আবাসিক এলাকা'), text('NSU', 'এনএসইউ'), 23.8148, 90.4287),
    tags: [text('Figma', 'ফিগমা'), text('Design', 'ডিজাইন')],
    category: 'internship',
    categoryLabel: text('Internship', 'ইন্টার্নশিপ'),
    featured: true,
    priceLabel: text('৳12,000 stipend', '৳১২,০০০ স্টাইপেন্ড'),
    attributes: [
      { label: text('Organization', 'প্রতিষ্ঠান'), value: text('Northstar Labs', 'নর্থস্টার ল্যাবস') },
      { label: text('Work mode', 'কাজের ধরন'), value: text('Hybrid', 'হাইব্রিড') },
    ],
  },
  {
    id: 'job-tutor',
    slug: 'weekend-english-tutor',
    kind: 'job',
    title: text('Weekend English Tutor', 'সাপ্তাহিক ছুটির ইংরেজি টিউটর'),
    summary: text('Small-group tutoring for secondary students.', 'মাধ্যমিক শিক্ষার্থীদের ছোট দলে পড়ানো।'),
    description: text('Teach spoken English and writing fundamentals in two weekend sessions near Nikunja.', 'নিকুঞ্জের কাছে সাপ্তাহিক ছুটিতে দুই সেশনে স্পোকেন ইংলিশ ও লেখার ভিত্তি শেখান।'),
    location: location('nikunja', text('Nikunja 2', 'নিকুঞ্জ ২'), text('AIUB', 'এআইইউবি'), 23.8321, 90.4148),
    tags: [text('Teaching', 'শিক্ষাদান'), text('English', 'ইংরেজি')],
    category: 'part-time',
    categoryLabel: text('Part-time', 'পার্ট-টাইম'),
    priceLabel: text('৳500 / hour', 'ঘণ্টায় ৳৫০০'),
    attributes: [
      { label: text('Organization', 'প্রতিষ্ঠান'), value: text('Bright Path Learning', 'ব্রাইট পাথ লার্নিং') },
      { label: text('Schedule', 'সময়সূচি'), value: text('Friday & Saturday', 'শুক্র ও শনিবার') },
    ],
  },
  {
    id: 'job-support',
    slug: 'remote-customer-support-assistant',
    kind: 'job',
    title: text('Remote Customer Support Assistant', 'রিমোট কাস্টমার সাপোর্ট সহকারী'),
    summary: text('Evening remote shift suitable for students.', 'শিক্ষার্থীদের উপযোগী সন্ধ্যার রিমোট শিফট।'),
    description: text('Respond to customer questions through chat and maintain simple support records.', 'চ্যাটে গ্রাহকের প্রশ্নের উত্তর দিন এবং সাধারণ সাপোর্ট রেকর্ড সংরক্ষণ করুন।'),
    location: location('badda', text('Badda', 'বাড্ডা'), text('BRAC University', 'ব্র্যাক বিশ্ববিদ্যালয়'), 23.7798, 90.4272),
    tags: [text('Remote', 'রিমোট'), text('Communication', 'যোগাযোগ')],
    category: 'part-time',
    categoryLabel: text('Part-time', 'পার্ট-টাইম'),
    priceLabel: text('৳10,000 / month', 'মাসে ৳১০,০০০'),
    attributes: [
      { label: text('Organization', 'প্রতিষ্ঠান'), value: text('ShopDesk', 'শপডেস্ক') },
      { label: text('Work mode', 'কাজের ধরন'), value: text('Remote', 'রিমোট') },
    ],
  },
]

export const DISCOVERY_ITEMS: DiscoveryItem[] = [...BOOKS, ...SERVICES, ...JOBS]

export function getDiscoveryItems(kind: DiscoveryKind) {
  return DISCOVERY_ITEMS.filter((item) => item.kind === kind)
}

export function getDiscoveryItem(kind: DiscoveryKind, slug: string) {
  return DISCOVERY_ITEMS.find((item) => item.kind === kind && item.slug === slug)
}

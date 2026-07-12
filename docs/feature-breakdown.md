# 🇧🇩 Bangladesh-Wide Expansion: সম্পূর্ণ Feature Breakdown

> আপনার বর্তমান প্রজেক্টের (auth, listings, booking, messaging, reviews, admin, PWA) উপর ভিত্তি করে — প্রতিটা নতুন ফিচার, তার sub-feature, প্রয়োজনীয় DB table এবং dependency সহ। ক্রম অনুযায়ী implement করলে একটার উপর আরেকটা দাঁড়াবে।

---

## 📍 Phase 1 — Foundation (মাস ১–৩)

---

### 1. 🎓 University & Locality Data Model

**কেন প্রথমে:** এটাই পুরো expansion-এর মেরুদণ্ড। পরের প্রায় সব ফিচার (search, landing pages, roommate matching, services) এই ডেটার উপর নির্ভর করবে।

#### 1.1 `universities` Table
* কলাম: `id`, `name`, `name_bn` (বাংলা নাম), `slug` (du, buet, brac), `type` (public/private), `city`, `division`, `lat`, `lng`, `aliases` (jsonb array — "DU", "ঢাবি", "Dhaka University"), `logo_url`, `website`, `is_active`
* শুরুতে ৩০–৪০টা প্রধান বিশ্ববিদ্যালয়ের seed data (Dhaka north দিয়ে শুরু)
* Admin panel-এ university CRUD পেজ

#### 1.2 `localities` Table
* কলাম: `id`, `name`, `name_bn`, `slug`, `thana`, `city`, `division`, `lat`, `lng`, `parent_university_ids` (কোন কোন ক্যাম্পাসের কাছে)
* জনপ্রিয় স্টুডেন্ট এলাকা seed করুন: ফার্মগেট, মিরপুর-১০, বোর্ড বাজার, মোহাম্মদপুর, বসুন্ধরা ইত্যাদি
* Locality ↔ University many-to-many junction table (দূরত্ব/commute time সহ)

#### 1.3 User Profile-এ University সংযুক্তি
* Signup ফর্মে university dropdown (free-text এর বদলে) — searchable, alias দিয়েও খোঁজা যাবে
* বিদ্যমান ইউজারদের জন্য migration: পুরনো text university নামগুলো নতুন table-এ map করা
* Profile-এ `university_id` foreign key

#### 1.4 Room/Listing-এ Location Tagging
* প্রতিটা রুমে `locality_id` + `nearest_university_ids` (auto-calculate lat/lng থেকে, PostGIS বা Haversine formula)
* পুরনো listing গুলোর জন্য backfill script

#### 1.5 Campus Proximity Engine
* "X বিশ্ববিদ্যালয় থেকে Y কিমি/মিনিট" ব্যাজ প্রতিটা রুম কার্ডে
* Haversine দিয়ে সরল দূরত্ব (v1) → পরে walking time API (v2)
* Search filter: "Within 15 min of BRAC"

**Dependency:** নেই — এটা দিয়েই শুরু করুন
**আপনার যা reuse হবে:** Leaflet map, location picker, বিদ্যমান listing schema

---

### 2. 🔍 Locality-First Search & Discovery

#### 2.1 Unified Search Bar Upgrade
* বর্তমান hero search-এ university + locality suggestion যোগ করুন
* Autocomplete-এ তিন ধরনের রেজাল্ট: 🎓 University, 📍 Area, 🏠 Room title
* বাংলা ও ইংরেজি — দুই ভাষাতেই সার্চ কাজ করবে (aliases column কাজে লাগবে)

#### 2.2 "Near My Campus" Default Filter
* লগইন করা ইউজারের `university_id` অনুযায়ী default রেজাল্ট
* GPS permission নিলে "আমার কাছাকাছি" অপশন
* Filter bar-এ university selector (multi-select)

#### 2.3 Area Guide Pages (`/areas/farmgate`)
* প্রতি locality-র পেজ: গড় ভাড়ার রেঞ্জ (আপনার নিজের listing ডেটা থেকে auto-calculate), transport info, কাছের ক্যাম্পাস, ওই এলাকার সব listing
* Admin-editable "নিরাপত্তা ও টিপস" সেকশন (পরে user-generated)

#### 2.4 University Landing Pages (`/universities/du`)
* SEO-optimized পেজ: বিশ্ববিদ্যালয়ের তথ্য, কাছের এলাকাগুলো, সেখানকার listing, গড় ভাড়া
* Next.js-এ static generation (ISR) + meta tags + structured data (JSON-LD)
* Sitemap-এ সব university/area পেজ যোগ

**Dependency:** Feature 1
**আপনার যা reuse হবে:** listing grid, filter system, infinite scroll

---

### 3. 🌐 Bangla Language (i18n)

#### 3.1 UI Translation
* `next-intl` বা `next-i18next` সেটআপ — `bn` ও `en` locale
* Language toggle (header-এ), preference localStorage + profile-এ save
* সব static UI text translation file-এ সরানো (ধাপে ধাপে — আগে public পেজ, পরে dashboard)

#### 3.2 Listing Fields-এ বাংলা
* Room title/description-এ বাংলা লেখার সাপোর্ট (এখনই কাজ করে, শুধু font/validation check)
* Optional: `title_bn`, `description_bn` আলাদা ফিল্ড (owner চাইলে দুই ভাষায় দেবে)
* বাংলা সংখ্যা ফরম্যাটিং (৳৫,০০০) — একটা utility function

#### 3.3 বাংলা Search Normalization
* "মিরপুর" আর "Mirpur" — দুটোই একই রেজাল্ট দেবে (aliases + transliteration map)

**Dependency:** নেই — Feature 1-এর সাথে parallel-এ করা যায়
**টিপ:** প্রথমে ৫টা সবচেয়ে ব্যবহৃত পেজ (home, search, room detail, signup, booking) translate করুন

---

### 4. 🤝 Roommate Matching

#### 4.1 Roommate Profile
* নতুন table `roommate_profiles`: `user_id`, `looking_in_localities`, `budget_min/max`, `gender_preference`, `university_id`, `habits` (jsonb — smoking, sleep schedule, cleanliness, guests), `bio`, `move_in_date`, `is_active`
* Profile তৈরির wizard (৩ ধাপ: basics → preferences → habits)

#### 4.2 Roommate Board (`/roommates`)
* Card grid — ফিল্টার: এলাকা, বিশ্ববিদ্যালয়, বাজেট, gender
* "আমার সাথে match %" স্কোর (সাধারণ weighted scoring — এলাকা মিল ৩০%, বাজেট ২৫%, habits ২৫%, university ২০%)

#### 4.3 Contact Flow
* "মেসেজ পাঠান" → আপনার বিদ্যমান inbox-এই conversation খুলবে
* শুধু verified user-রা contact করতে পারবে (আপনার pending/approved system reuse)
* Roommate profile-এও report অপশন

#### 4.4 Listing-এর সাথে সংযোগ
* Room detail পেজে: "এই রুমের জন্য roommate খুঁজছেন? পোস্ট করুন"
* "Seat available, roommate চাই" টাইপ listing (আপনার seat-based booking-এর সাথে মিলবে)

**Dependency:** Feature 1 (locality data)
**আপনার যা reuse হবে:** messaging, verification, report system, profile pages

---

### 5. 🧑‍💼 Campus Moderator / Ambassador Tools

#### 5.1 Role Expansion
* বর্তমান admin/user-এর সাথে নতুন role: `moderator` — `moderator_scopes` table (`user_id`, `university_id` বা `locality_id`)
* Middleware-এ scope-based permission (মডারেটর শুধু নিজের ক্যাম্পাসের content দেখবে)

#### 5.2 Moderator Dashboard (Admin panel-এর লাইট ভার্সন)
* নিজের এলাকার: pending listings, reports, verification requests
* Action log — মডারেটর কী approve/reject করলো তার audit trail (নতুন `moderation_logs` table)
* Admin panel-এ মডারেটর performance view

#### 5.3 Ambassador Program Support
* Referral code system: `referral_codes` table, signup-এ code field
* Ambassador-এর dashboard: কতজন signup, কতটা listing এলো তার কোড দিয়ে

**Dependency:** নেই (আপনার role-based middleware আছেই)
**আপনার যা reuse হবে:** admin panel components, user management, report queue

---

## 📍 Phase 2 — Housing Enhancements + Retention (মাস ৪–৬)

---

### 6. 🏠 Housing Feature Upgrades

#### 6.1 উন্নত Filters
* Female-only / family-hostel টগল (listing-এ নতুন boolean/enum ফিল্ড)
* Amenity filters: AC, generator, security guard, parking, lift, WiFi (jsonb `amenities` column + filter UI)
* Short-term/সেমিস্টার sublet: `stay_type` enum (permanent / sublet / short_term) + `available_until` date

#### 6.2 Mess Meal Plan Module
* Listing type `mess` হলে অতিরিক্ত সেকশন: `meal_plans` (jsonb) — breakfast/lunch/dinner, veg/non-veg, monthly rate, daily rate, off-days
* Room detail পেজে meal timing table
* Filter: "খাবারসহ মেস"

#### 6.3 Rent Transparency Card
* আপনার বিদ্যমান bills ডেটা দিয়ে "মোট মাসিক খরচ" breakdown কম্পোনেন্ট — ভাড়া + গ্যাস + বিদ্যুৎ + WiFi + খাবার = মোট
* Listing card-এ "সর্বমোট ৳X/মাস" ব্যাজ

#### 6.4 WhatsApp / Phone CTA
* Owner profile-এ optional WhatsApp number (verified phone থেকে আলাদা)
* Room detail-এ "WhatsApp-এ কথা বলুন" বাটন (`wa.me` link) — click event track করুন (analytics table বা Vercel Analytics custom event)
* Privacy: শুধু logged-in + approved user-রা নম্বর দেখবে

#### 6.5 Group Booking
* Booking modal-এ "কয়টা সিট?" (১–৪) — আপনার atomic seat booking logic extend করে multi-seat atomic reservation
* "বন্ধুদের invite করুন" — booking link শেয়ার, বাকিরা join করলে গ্রুপ complete

#### 6.6 Parent / Shareable View
* Room + owner contact-এর read-only public link (`/share/rooms/xyz?token=...`) — signed token, expiry সহ
* "অভিভাবককে পাঠান" বাটন room detail-এ
* লিংকে booking বা messaging নেই — শুধু তথ্য

#### 6.7 Broker-Free Badge
* Owner verification-এ "আমি সরাসরি মালিক" declaration + প্রমাণ (utility bill/দলিলের ছবি — admin verify করবে)
* Verified হলে listing-এ "✓ সরাসরি মালিক" ব্যাজ

**Dependency:** নেই — যেকোনোটা আলাদাভাবে করা যায়
**আপনার যা reuse হবে:** booking system, bills ডেটা, verification queue, image upload

---

### 7. 🛡️ Trust at Scale

#### 7.1 Tiered Verification
* Verification levels: `email_verified` → `student_id_verified` → `phone_verified` (OTP) → `nid_verified` (owner-দের জন্য optional)
* প্রতি লেভেলে profile-এ ব্যাজ; কিছু action-এ minimum level লাগবে (যেমন booking = phone verified)
* Phone OTP: SMS gateway (SSLWireless / BulkSMS BD / Twilio) — `otp_codes` table, rate limit (আপনার Upstash আছেই)

#### 7.2 Owner Reputation Score
* Auto-calculated metrics: গড় response time (messages থেকে), booking completion rate, review average, report count
* Owner profile ও listing card-এ score/ব্যাজ ("দ্রুত সাড়া দেন", "৯৫% booking সম্পন্ন")
* Nightly cron job-এ recalculate (আপনার cron setup আছেই)

#### 7.3 Dispute Resolution Workflow
* বিদ্যমান report system extend: report → `open` → `under_review` → `resolved` / `action_taken` স্ট্যাটাস
* দুই পক্ষের সাথে admin-এর thread (আপনার messaging reuse)
* Resolution outcome log + repeat offender flag

**Dependency:** Feature 5 (মডারেটররাই প্রথম স্তরের রিভিউ করবে)

---

### 8. 📚 Used Books Marketplace

**Architecture নোট:** এখানেই `rooms` → generalized `listings` refactor শুরু করুন (Section 12 দেখুন), নাহলে প্রতি vertical-এ নতুন table বানাতে হবে।

#### 8.1 Book Listing
* ফিল্ড: title, author, course code (CSE 101), university, department, semester, condition (new/good/fair), price, negotiable?, ছবি
* Post flow আপনার room posting-এর মতোই (image compression reuse)

#### 8.2 Browse & Search (`/books`)
* Filter: university, department, course code, price range
* Course code autocomplete (জনপ্রিয় course-এর ছোট seed list)
* "আমার ক্যাম্পাসের বই" default

#### 8.3 Transaction Flow
* Buy request → chat (আপনার messaging) → মিলে meetup — কোনো payment integration লাগবে না v1-এ
* "বিক্রি হয়ে গেছে" mark + auto-archive
* Seller rating (আপনার review system-এর generalized ভার্সন)

**Dependency:** Feature 12 (listings refactor) — অথবা দ্রুত শিপ করতে আলাদা `book_listings` table (পরে merge)

---

### 9. 🗂️ Local Services Directory

#### 9.1 Service Places
* Table `service_places`: name, category (প্রিন্ট/লন্ড্রি/খাবার/ফার্মেসি), locality_id, lat/lng, phone, hours, price notes, ছবি
* Moderator/admin যোগ করবে (v1); পরে user-suggested + approval queue

#### 9.2 Directory UI (`/services`)
* Category tab + locality filter + আপনার Leaflet map-এ pin
* Room detail পেজে "আশেপাশে কী আছে" widget (কাছের ৫টা service)
* Rating/review (generalized review system)

**Dependency:** Feature 1, Feature 5 (moderators content দেবে)

---

### 10. 📊 Owner Analytics + 📱 SMS Notifications

#### 10.1 Area-Based Owner Analytics
* আপনার Recharts dashboard extend: "আপনার এলাকায় গড় ভাড়া", "এই এলাকায় কত search হচ্ছে", listing views vs area average
* Admin-এর জন্য supply gap map: কোন locality-তে search বেশি কিন্তু listing কম (heatmap — Leaflet layer)
* নতুন `search_events` table (query, locality, timestamp) — search log করা শুরু করুন এখনই

#### 10.2 SMS Notifications
* Booking confirm/reject + OTP-র জন্য SMS (7.1-এর gateway reuse)
* User settings-এ channel preference: email / push / SMS
* SMS credit cost বাঁচাতে শুধু critical event-এ

**Dependency:** 10.2-এর জন্য Feature 7.1-এর SMS gateway

---

## 📍 Phase 3 — Platform Play (মাস ৭–১২)

---

### 11. 💼 Jobs, 🚌 Transport, 💳 Escrow

#### 11.1 Part-time Jobs & Internships Board
* Listing type `job`: title, employer, type (part-time/intern), location/locality, salary range, "near X university", apply method (link/phone/chat)
* Employer account type (light verification) + moderator approval
* Filter + saved jobs (আপনার favorites system reuse)

#### 11.2 Transport Guides
* `bus_routes` table: route name, stops (jsonb array of locality/landmark), universities served
* UI: "মিরপুর → DU" search করলে সম্ভাব্য বাস + ভাড়ার আনুমানিক রেঞ্জ
* Community contribution: "এই রুটে তথ্য যোগ করুন" → moderation queue
* Carpool board: roommate board-এর মতোই — route, schedule, seat, contact via chat

#### 11.3 bKash/Nagad Escrow (সবচেয়ে জটিল — সবার শেষে)
* Phase A: bKash Payment Gateway integration (merchant account লাগবে) — শুধু advance deposit collect
* Phase B: Escrow logic — deposit hold → check-in confirm (দুই পক্ষ) → owner-কে release; dispute হলে admin resolve
* নতুন tables: `payments`, `escrow_holds`, `payout_requests`
* ⚠️ আইনি/লাইসেন্স দিক আগে যাচাই করুন (PSP নিয়ম); বিকল্প: শুধু "payment tracking" (টাকা platform-এর মধ্য দিয়ে না গিয়ে দুই পক্ষ confirm করবে)

#### 11.4 University Admin API
* Read-only API key system: বিশ্ববিদ্যালয় কর্তৃপক্ষ নিজের ক্যাম্পাসের verified listing stats দেখবে
* Rate-limited public endpoints (Upstash reuse)

---

## 🏗️ 12. Architecture Refactor: `rooms` → `listings`

**কখন:** Phase 2-এর শুরুতে (Books marketplace-এর আগে)। এটা এক sprint-এর কাজ নয় — ধাপে ধাপে:

1. নতুন `listings` table: `id`, `listing_type` (housing/book/service/job), `title`, `description`, `price`, `locality_id`, `owner_id`, common fields
2. Type-specific detail tables: `listing_housing_details` (আপনার বর্তমান rooms কলামগুলো), `listing_book_details`, ইত্যাদি (অথবা jsonb `details` column — দ্রুত কিন্তু query কঠিন; আমার পরামর্শ: আলাদা detail table)
3. `rooms` → `listings + listing_housing_details` migration script + backward-compatible view
4. Reviews, favorites, reports, images — সব polymorphic করা: `target_type` + `target_id` (অথবা `listing_id` FK যেহেতু সবই listing)
5. RLS policies নতুন table-এ port করা (আপনার ৯টা migration-এর অভিজ্ঞতা কাজে লাগবে)
6. Unified search index (Postgres full-text + trigram, বাংলা সহ)

---

## 💰 13. Monetization Features (Phase 2 শেষ থেকে)

* **Featured listing:** `featured_until` timestamp + payment record; search-এ boost + "Featured" ব্যাজ; bKash checkout দিয়ে self-serve কেনা
* **Verification badge (premium):** owner-দের paid "Trusted Owner" tier — দ্রুত verification + প্রোফাইল হাইলাইট
* **Local ads:** `sponsored_places` — area guide ও search পেজে চিহ্নিত স্লট (স্পষ্টভাবে "Sponsored" লেবেল)
* **Service commission:** পরে — আগে directory-তে traffic আসুক

---

## ✅ প্রস্তাবিত Implementation Order (এক নজরে)

| ক্রম | ফিচার | কারণ |
|---|---|---|
| ১ | Universities + Localities data model (Ft 1) | সবকিছুর ভিত্তি |
| ২ | Bangla i18n (Ft 3) | Parallel-এ চলতে পারে |
| ৩ | Locality search + landing pages (Ft 2) | SEO আগে শুরু হলে ফল আগে |
| ৪ | Roommate matching (Ft 4) | দ্রুত user value, সব reuse |
| ৫ | Moderator tools (Ft 5) | Scale-এর আগে দরকার |
| ৬ | Housing upgrades (Ft 6) | ছোট ছোট শিপযোগ্য টুকরা |
| ৭ | Tiered verification + reputation (Ft 7) | Trust ভিত্তি |
| ৮ | Listings refactor (Ft 12) | নতুন vertical-এর দরজা খোলে |
| ৯ | Books marketplace (Ft 8) | প্রথম নতুন vertical |
| ১০ | Services directory (Ft 9) | Moderator-চালিত content |
| ১১ | Analytics + SMS (Ft 10) | Retention + owner value |
| ১২ | Jobs, transport (Ft 11.1–11.2) | Platform সম্প্রসারণ |
| ১৩ | Monetization (Ft 13) | Traffic থাকলে তবেই |
| ১৪ | Escrow (Ft 11.3) | সবচেয়ে জটিল, সবার শেষে |

---

## 🧰 আপনার Stack-এ যা যা লাগবে (নতুন)

* **i18n:** next-intl / next-i18next
* **SMS:** SSLWireless বা BulkSMS BD (দেশি) — OTP + notifications
* **Geo query:** PostGIS extension (Supabase-এ built-in আছে) — proximity search-এর জন্য Haversine-এর চেয়ে ভালো
* **Full-text search:** Postgres `pg_trgm` + `tsvector` (বাংলা সাপোর্টসহ)
* **Payment:** bKash PGW merchant API (Phase 3)
* বাকি সব — Supabase Realtime, Resend, Upstash, Recharts, Leaflet, Sentry — যা আছে তাই যথেষ্ট

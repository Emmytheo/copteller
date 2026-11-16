# Copteller Google Forms & Google Apps Script Implementation Guide

**Purpose:** Guide an AI agent (or engineer) to write a clean, runnable **Google Apps Script (`Code.gs`)** that programmatically generates shareable **Google Forms** (plus a companion **Google Sheet Field Matrix**) representing Copteller's Cooperative Registration, Admin Onboarding, and Member Onboarding flows.

**Primary Business Goal:** Share the generated Google Forms with **Copteller stakeholders** (Abia MFB Compliance/Risk, Operations, Cooperative Leaders, and Product/Engineering) so they can review every proposed data point and submit structured feedback on **what data should be collected, made required/optional, modified, or removed**.

---

## 1. Architecture & Deliverables the Agent Must Build

Create a standalone Google Apps Script project containing one main script (modularized cleanly into helper functions) with a single entry point `createCoptellerStakeholderForms()` that outputs:

1. **Form 1 — Cooperative Registration & Admin Onboarding Form**
   - Covers Cooperative Identity, Classification, Location, Leadership/Admin Account Owner, Authorized Product Templates, Baseline Financial/Fee Rules, and Compliance/Governance Review.
2. **Form 2 — Cooperative Member Onboarding & Enrollment Form**
   - Covers Member Identity & KYC, Contact & Address, Joining an Existing Cooperative (or Quick-Registering a New One), Sector-Specific Profiling (with **conditional page branching**), Product/Scheme Preferences, Wallet/Notification Preferences, and Guarantor/Risk Inputs.
3. **Companion Google Sheet (`Copteller Stakeholder Data Dictionary & Review Matrix`)**
   - Automatically linked as response destination for the forms (or separate tabs inside one workbook) AND pre-populated with a **Field Review Matrix** tab listing every field, its exact Copteller schema column/collection, current status (`Live UI`, `DB Schema Only`, `Proposed Gap`), and stakeholder sign-off columns (`Keep / Modify / Remove`, `Required?`, `Reviewer Notes`).

### Built-in Stakeholder Review Toggle
Include a top-level configuration constant in the script:

```javascript
const CONFIG = {
  INCLUDE_STAKEHOLDER_REVIEW_PROMPTS: true,
  COLLECT_SENSITIVE_FIELDS_IN_GOOGLE_FORM: false, // Safety switch for BVN/PIN/Password notes
  APP_NAME: 'Copteller (Abia MFB Cooperative OS)',
  VERSION: '1.0',
};
```

When `INCLUDE_STAKEHOLDER_REVIEW_PROMPTS` is `true`:
- Append a concise **Section Feedback** block at the end of every major form section:
  1. `GridItem` / `CheckboxItem`: *"Which fields in this section should be REQUIRED vs OPTIONAL vs REMOVED?"* or *"Any fields missing from this section?"*
  2. `ParagraphTextItem`: *"Stakeholder comments / regulatory notes for this section"*
- Add a final **Stakeholder Sign-Off** page capturing Reviewer Name, Role (`Bank Compliance`, `Cooperative Admin`, `Operations`, `Product/Tech`, `Investor/Partner`), and overall approval status (`Approved as-is`, `Approved with edits`, `Needs revision`).

---

## 2. Security & Privacy Rules for the Google Form

Because Google Forms are often shared externally for stakeholder review and testing:

1. **Never ask for real login passwords or real 4-digit transaction PINs.**
   - In Copteller's live web app, `/copteller/auth` collects `password` and `onboarding/member` Step 4 collects a 4-digit transaction PIN.
   - In the Google Form, **replace** those with descriptive/preference items (e.g., *"Preferred Security & Transaction Authorization Method (Multi-select: 4-Digit Transaction PIN, SMS OTP, Biometric/Passkey, Union Admin Co-Sign)"*) and add a clear notice that real credentials are never collected via Google Forms.
2. **Handle BVN / NIN carefully.**
   - During **Stakeholder Review Mode**, describe the field format (`11-digit numeric string`) and mark the Google Form input **optional** with placeholder help text (*"For stakeholder review only — do NOT enter your real personal BVN"*), while documenting the production validation rule (`^\d{11}$`) in the question help text and Schema Matrix.

---

## 3. Source-of-Truth Copteller Data Dictionary

All field names, options, defaults, and discrepancies below are verified directly against the Copteller codebase (`copteller/`).

### A. Form 1 — Cooperative Registration & Admin Onboarding

**Primary Code Sources:**
- `collections/Cooperatives.ts`
- `app/(copteller)/copteller/onboarding/admin/page.tsx`
- `app/api/copteller/admin/cooperatives/route.ts`
- `app/(copteller)/copteller/(portal)/admin/settings/page.tsx`
- `app/api/copteller/admin/settings/route.ts`
- `collections/CoptellerProductTypes.ts`
- `collections/CoptellerMemberships.ts`
- `scripts/copteller-profiles-schema.sql`
- `components/copteller/printable-form.tsx`

#### Section 1.1: Admin / Union Leader Account Owner
In `POST /api/copteller/admin/cooperatives`, creating a cooperative requires a `union_leader` (`customers` record) and creates/links a `coop_admin` profile in `public.copteller_profiles`.

| Form Question | Google Form Item Type | Validation / Options | Copteller Field & Location | Status |
|---|---|---|---|---|
| Primary Admin Full Name | `TextItem` (Required) | Split into First + Last Name in DB | `customers.firstName`, `customers.lastName` / `copteller_profiles.display_name` | Live UI (`/copteller/auth`) |
| Admin Work Email Address | `TextItem` (Required) | `requireTextIsEmail()` | `customers.email` (unique) | Live UI (`/copteller/auth`) |
| Admin Mobile Phone Number | `TextItem` (Required) | Nigerian format (`+234` / 11 digits) | `customers.phone_number` | Currently hardcoded fallback `'0803 000 0000'` in `POST /admin/cooperatives` — **surface to stakeholders** |
| Admin Role / Title in Cooperative | `MultipleChoiceItem` (Required) | `Cooperative Admin (admin)`, `Chairperson (chairperson)`, `Treasurer (treasurer)`, `Secretary (secretary)`, `Patron / Guarantor (patron)` | `copteller_memberships.role` (`admin`, `chairperson`, `treasurer`, `secretary`, `patron`) | Schema supports officers; onboarding UI only uses `coop_admin` |
| Additional Executive Officers (Treasurer / Secretary) | `ParagraphTextItem` (Optional) | Name, Email, Phone for 2nd/3rd signatories | Stored via `copteller_memberships` | **Recommended Gap** (for Maker-Checker / multi-signatory governance) |

#### Section 1.2: Cooperative Identity & Classification

| Form Question | Google Form Item Type | Validation / Exact Options | Copteller Field & Location | Status |
|---|---|---|---|---|
| Official Cooperative / Trade Guild Name | `TextItem` (Required) | Non-empty, unique | `cooperatives.name` (`unique: true`) | Live UI (`onboarding/admin`) |
| Brief Description & Mission | `ParagraphTextItem` (Optional) | Free text | `cooperatives.description` | Live UI (`onboarding/admin`) |
| Cooperative Type | `MultipleChoiceItem` (Required) | Use **all 11** values from `Cooperatives.ts`:<br>• Thrift & Credit Society (`thrift_credit`)<br>• Multipurpose Cooperative (`multipurpose`)<br>• Agricultural Cooperative (`agricultural`)<br>• Transport / Fleet Cooperative (`transport`)<br>• Trade & Commerce Union (`trade`)<br>• Professional Cooperative (`professional`)<br>• Housing Cooperative (`housing`)<br>• Consumer Cooperative (`consumer`)<br>• Women's Cooperative (`women`)<br>• Youth Cooperative (`youth`)<br>• Other (`other`) | `cooperatives.cooperative_type` (default `'multipurpose'`) | **Gap Note:** `women`, `youth`, `other` exist in `Cooperatives.ts` but are missing from `onboarding/admin/page.tsx` buttons |
| Primary Industry Sector | `ListItem` (Dropdown, Required) | Use **all 13** values from `Cooperatives.ts`:<br>• Transport / Logistics (`transport`)<br>• Agriculture / Agro-Allied (`agriculture`)<br>• Commerce / Market Trade (`commerce`)<br>• Artisan / Craft Workers (`artisan`)<br>• Health & Wellness (`health`)<br>• Education Workers (`education`)<br>• Technology / Digital (`technology`)<br>• Professional Services (`professional`)<br>• Housing / Real Estate (`housing`)<br>• Manufacturing / Production (`manufacturing`)<br>• Energy / Utilities (`energy`)<br>• Financial Services (`financial_services`)<br>• Other (`other`) | `cooperatives.sector` (default `'commerce'`) | **Bug/Gap Note:** `onboarding/admin` currently maps `health`, `education`, etc. to `'other'` and omits `'energy'` & `'financial_services'` |
| Specific Trade Segment / Sub-Sector | `TextItem` (Optional) | e.g., `"Keke Operators"`, `"Crop Farmers"`, `"Garment Makers"` | `cooperatives.segment` | Schema exists (`Cooperatives.ts`); missing from `onboarding/admin` UI |

#### Section 1.3: Registration & Physical Location

| Form Question | Google Form Item Type | Validation / Notes | Copteller Field & Location | Status |
|---|---|---|---|---|
| CAC or State Cooperative Society Registration Number | `TextItem` (Optional) | e.g., `RC123456` or State Coop Registry No. | `cooperatives.registration_number` | Live UI (`onboarding/admin`); note `onboarding/member` sends `reg_number` (mismatch!) |
| State of Operation | `TextItem` (Required) | e.g., `Abia` (or Nigerian State dropdown) | `cooperatives.state` | Live UI (`onboarding/admin`) |
| Local Government Area (LGA) | `TextItem` (Required) | e.g., `Aba North` | `cooperatives.lga` | Live UI (`onboarding/admin`) |
| Physical Office / Meeting House Address | `ParagraphTextItem` (Optional/Recommended) | Street address | `cooperatives.address` | Live UI (`onboarding/admin`) |
| Maximum Member Capacity | `TextItem` (Optional) | Integer >= 1 (UI default: `100`) | `cooperatives.max_members` | Live UI (`onboarding/admin` Step 3) |

#### Section 1.4: Authorized Financial Products & Scheme Configuration

| Form Question | Google Form Item Type | Exact Options / Notes | Copteller Field & Location | Status |
|---|---|---|---|---|
| Financial Product Templates to Offer Members | `CheckboxItem` (Required, >= 1) | From `CoptellerProductTypes.ts`:<br>• Ajo / Rotational Thrift (`ajo_rotation`)<br>• Hire Purchase / Asset Lease (`hire_purchase`)<br>• Micro Loan (`micro_loan`)<br>• Government / Enterprise Grant (`grant`)<br>• Cooperative Bond / Fixed Savings (`cooperative_bond`)<br>• Group Savings Drive (`savings_drive`)<br>• Insurance Premium Pool (`insurance_pool`) | `cooperatives.authorized_product_types` (M2M relationship to `copteller-product-types`) | Live UI (`onboarding/admin` Step 2 loads active templates from DB) |
| Primary Contribution / Collection Frequency | `MultipleChoiceItem` (Required) | `Daily (daily)`, `Weekly (weekly)`, `Bi-Weekly (biweekly)`, `Monthly (monthly)` | `cooperatives.cycleFrequency` (default `'weekly'`) | Schema exists (`Cooperatives.ts`); missing from `onboarding/admin` UI |
| Enable Investor Marketplace Listing? | `MultipleChoiceItem` (Optional) | `Yes — Allow investors to fund our schemes (true)`, `No — Internal members only (false)` | `cooperatives.marketplaceEnabled` (default `false`) | Schema exists; missing from `onboarding/admin` UI |
| Enable Automated Wallet Deductions (Cron)? | `MultipleChoiceItem` (Optional) | `Yes (true)`, `No — Manual collection only (false)` | `cooperatives.metadata.enable_auto_deductions` | Live in Admin Settings (`/admin/settings`), not in onboarding |

#### Section 1.5: Baseline Fees, Dues & Financial Rules
*Note for Stakeholder Review:* Copteller's UI captures Naira (`₦`), while the database stores Kobo (`amount_naira * 100`).

| Form Question | Google Form Item Type | Validation / Default | Copteller Field & Location | Status |
|---|---|---|---|---|
| Default Cycle Contribution Amount (₦) | `TextItem` | Number >= 0 (Schema default: `₦10,000` / Settings default: `₦20,000`) | `cooperatives.defaultContributionAmount` (Kobo in schema; note `admin/settings/route.ts` reads/writes raw number) | Schema + Admin Settings |
| One-Time Membership Entry Fee (₦) | `TextItem` | Number >= 0 (Admin UI default: `₦2,000`) | `cooperatives.membership_fee_kobo` (`₦ * 100`) | Live UI (`onboarding/admin` Step 3) |
| Recurring Monthly Operational Dues (₦) | `TextItem` | Number >= 0 (Admin UI default: `₦1,000`) | `cooperatives.monthly_dues_kobo` (`₦ * 100`) | Live UI (`onboarding/admin` Step 3) |
| Late Payment Penalty Flat Fee (₦) | `TextItem` | Number >= 0 (Default: `₦500` in onboarding, `₦1,500` in Settings) | `cooperatives.late_payment_penalty_kobo` (`₦ * 100`) | Live UI (`onboarding/admin` + Settings) |
| Platform Escrow Clearing Fee (%) | `TextItem` | Decimal `0–100` (Default: `1.5%`) | `cooperatives.escrowFeePercent` | Live UI (`onboarding/admin` Step 3) |
| Investor Yield Split (%) | `TextItem` | Decimal `0–100` (Default: `80%` to investors) | `cooperatives.investorYieldSplitPercent` | Live UI (`onboarding/admin` Step 3) |
| Maximum Capital Pool Size Limit (₦) | `TextItem` | Number >= 0 (Settings default: `₦50,000,000`) | `cooperatives.metadata.max_pool_size` | Live in Admin Settings (`/admin/settings`) |

#### Section 1.6: Supporting Compliance Documents & Declaration (Stakeholder Review Gap)
> **Important Apps Script Limitation:** `FormApp` does **not** support creating Google Forms `File Upload` questions via script. Add a `SectionHeaderItem` listing the required documents and either:
> - Provide a `TextItem` for *"Link to Supporting Documents Folder (Google Drive / URL)"*, OR
> - Add a `[MANUAL ACTION REQUIRED]` note telling the form owner to insert File Upload questions in the Google Forms UI for:
>   1. CAC Certificate / State Cooperative Registration Certificate
>   2. Cooperative Byelaws / Constitution
>   3. Executive Resolution & Authorised Signatories Mandate
>   4. Valid ID of Primary Union Leader

Plus add the Declaration `CheckboxItem` matching `PrintableForm`:
- *"I declare that all cooperative details are accurate and agree to Abia Microfinance Bank licensing and escrow clearing guidelines."*

---

### B. Form 2 — Cooperative Member Onboarding & Enrollment Form

**Primary Code Sources:**
- `collections/Customers.ts`
- `collections/CoptellerMemberships.ts`
- `collections/CoptellerContracts.ts`
- `collections/CoptellerProductTypes.ts`
- `app/(copteller)/copteller/onboarding/member/page.tsx`
- `app/(copteller)/copteller/(portal)/admin/members/page.tsx`
- `app/api/copteller/memberships/route.ts`
- `app/api/copteller/admin/operators/route.ts`
- `app/api/copteller/verify-identity/route.ts`
- `components/copteller/printable-form.tsx`

#### Section 2.1: Member Personal Identity & KYC

| Form Question | Google Form Item Type | Validation / Options | Copteller Field & Location | Status |
|---|---|---|---|---|
| First Name | `TextItem` (Required) | Non-empty text | `customers.firstName` | Live UI (`onboarding/member`, `admin/members`) |
| Last Name (Surname) | `TextItem` (Required) | Non-empty text | `customers.lastName` | Live UI (`onboarding/member`, `admin/members`) |
| Email Address | `TextItem` (Required) | `requireTextIsEmail()` | `customers.email` (unique) | Live UI (`/copteller/auth`, `admin/members`) |
| Phone Number (+234) | `TextItem` (Required) | 10–11 numeric digits / Nigerian mobile | `customers.phone_number` | Live UI (`onboarding/member`, `admin/members`) |
| Date of Birth | `DateItem` (Optional for review, Required in KYC) | Calendar date | `customers.dob` | Live UI (`onboarding/member` Step 1) |
| Gender | `MultipleChoiceItem` (Optional) | `Male (0)`, `Female (1)` | `customers.gender` (`'0'` / `'1'`) | **Gap:** Exists in `Customers.ts`, missing from `onboarding/member` UI |
| Residential Home Address | `ParagraphTextItem` (Optional) | Street, Town/City, LGA, State | `customers.address` | **Gap:** Exists in `Customers.ts` & `PrintableForm`, missing from `onboarding/member` UI |
| Bank Verification Number (BVN) | `TextItem` (Optional in review mode) | Help text: `11-digit numeric (^\d{11}$)` — *Do NOT enter real BVN during stakeholder review* | `customers.bvn` (unique), `POST /api/copteller/verify-identity` | Live UI (`onboarding/member` Step 1) |
| National Identification Number (NIN) | `TextItem` (Optional) | 11-digit NIN | Accepted by `POST /api/copteller/verify-identity` (`nin` param) | **Gap:** API accepts `nin`, but `Customers.ts` has no dedicated `nin` field and onboarding UI doesn't ask for it |

#### Section 2.2: Cooperative Selection vs New Cooperative Registration (Branching Point)
Use `MultipleChoiceItem` with `createChoice(..., targetPage)`:
- **Option A:** *"Join an Existing Active Cooperative"* -> Route to **Section 2.3A (Existing Cooperative & Occupation Sector)**
- **Option B:** *"Register a New Cooperative (Member-Initiated)"* -> Route to **Section 2.3B (Quick Cooperative Registration)**

**Section 2.3A — Join Existing Cooperative:**
- **Cooperative Name / Search** (`TextItem` or `ListItem` placeholder list of sample coops + `"Other / Not Listed"`).
- **Primary Occupation Sector** (`MultipleChoiceItem`, Required — used to route to sector-specific page!):
  1. `Transport / Logistics` -> **Branch to Section 2.4T (Transport Details)**
  2. `Agriculture / Agro-Allied` -> **Branch to Section 2.4A (Agriculture Details)**
  3. `Commerce / Market Trade` -> **Branch to Section 2.4C (Commerce Details)**
  4. `Artisan / Craft Workers` -> **Branch to Section 2.4R (Artisan Details)**
  5. `Health & Wellness` / `Education Workers` / `Technology / Digital` / `Professional Services` / `Housing / Real Estate` / `Manufacturing / Production` / `Energy / Utilities` / `Financial Services` / `Other` -> **Branch directly to Section 2.5 (Product & Financial Preferences)**

**Section 2.3B — Register New Cooperative (Quick Create from Member Onboarding Step 2):**
- Cooperative Name (`newCoopName` — Required)
- Cooperative Registration Number (`newCoopReg` — Optional)
- State (`newCoopState`) & LGA (`newCoopLga`)
- Occupation Sector (`newCoopSector` — `MultipleChoiceItem` routing to 2.4T/2.4A/2.4C/2.4R or 2.5)

#### Section 2.4: Conditional Sector-Specific Member Profiling
These exact fields exist in `app/(copteller)/copteller/(portal)/admin/members/page.tsx` (lines 622–706) and `app/api/copteller/admin/operators/route.ts` (`FALLBACK_OPERATORS`).
> **Important Code Gap to Highlight for Stakeholders:** Currently, `admin/members/page.tsx` captures these fields in `metadata`, **but** `POST /api/copteller/admin/operators` does not yet persist `metadata` into Postgres/Payload, and self-service `onboarding/member` doesn't ask them at all unless defined on a product's dynamic `form_schema`!

1. **Page 2.4T — Transport / Logistics (`sector === 'transport'`)** -> *After page: Go to Section 2.5*
   - Driver's License Number (`metadata.licenseNumber`, Required in admin modal, e.g. `DL-182910`)
   - Vehicle / Tricycle Plate Number (`metadata.vehicleReg`, Required in admin modal, e.g. `ABA-499`)
   - Vehicle Type (`metadata.vehicleType` — `MultipleChoiceItem`: `TVS King (Tricycle)`, `Bajaj (Tricycle)`, `Haojin (Motorcycle)`, `Commercial Bus / Van`, `Other`)
   - Chassis / Engine Number (`metadata.chassisNumber` / `engineNumber`, Required in admin modal)
   - Primary Operating Route / Corridor (`route`, e.g., `"Aba North - Ariaria Market Corridor"` — present in `operators/route.ts`)

2. **Page 2.4A — Agriculture / Agro-Allied (`sector === 'agriculture'`)** -> *After page: Go to Section 2.5*
   - Farm Size in Hectares (`metadata.farmSize`, numeric >= 0)
   - Primary Crops / Livestock (`metadata.cropType`, e.g., `Cassava, Maize`)
   - Farm Community / LGA (`metadata.farmLocation`, e.g., `Obingwa LGA`)

3. **Page 2.4C — Commerce / Market Trade (`sector === 'commerce'`)** -> *After page: Go to Section 2.5*
   - Market Name & Shop / Stall ID (`metadata.shopId`, e.g., `ART-B2-99`)
   - Primary Trade Goods / Category (`metadata.tradeType`, e.g., `Leather Materials`)
   - Business CAC Registration Number (`metadata.businessCAC`, Optional, e.g., `RC-991029`)

4. **Page 2.4R — Artisan / Craft Workers (`sector === 'artisan'`)** -> *After page: Go to Section 2.5*
   - Artisan Guild / Association Name (`metadata.guildName`, e.g., `Shoe Makers Association`)
   - Trade Certification / Skill ID (`metadata.certificationNumber`, e.g., `CERT-2024-910`)
   - Workshop Address (`metadata.workshopLocation`)

#### Section 2.5: Product Selection, Contract Intent & Contribution Preferences

| Form Question | Google Form Item Type | Exact Options / Notes | Copteller Field & Location | Status |
|---|---|---|---|---|
| Which Cooperative Product(s) Are You Applying For? | `CheckboxItem` (Required) | `Ajo / Rotational Thrift (ajo_rotation)`, `Hire Purchase / Asset Lease (hire_purchase)`, `Micro Loan (micro_loan)`, `Government / Enterprise Grant (grant)`, `Cooperative Bond / Fixed Savings (cooperative_bond)`, `Group Savings Drive (savings_drive)`, `Insurance Premium Pool (insurance_pool)` | `selectedProduct` / `CoptellerContracts.contract_type` | Live UI (`onboarding/member` Step 2) |
| Preferred Contribution / Repayment Frequency | `MultipleChoiceItem` | `Daily`, `Weekly`, `Bi-Weekly`, `Monthly`, `Quarterly`, `Lump Sum` | `CoptellerContracts.repayment_frequency` & `PrintableForm` | `CoptellerContracts.ts` & `PrintableForm` |
| Target Initial Wallet Top-Up / Contribution Amount (₦) | `MultipleChoiceItem` / `TextItem` | `₦2,000`, `₦5,000`, `₦10,000`, `Custom Amount` | `onboarding/member` Step 3 (`fundAmount`) / `admin/members` (`initialBalance`) | Live UI (`onboarding/member` Step 3) |
| Preferred Wallet Funding Method | `MultipleChoiceItem` | `Bank Transfer (Virtual Account)`, `Card Payment`, `USSD` | `onboarding/member` Step 3 (`paymentMethod`) | Live UI (`transfer`/`card` active; `ussd` type defined in state) |
| If Applying for Hire Purchase / Asset Lease: Requested Asset Name & Estimated Value (₦) | `ParagraphTextItem` (Optional) | e.g., `"TVS King Keke — ₦1,400,000"` | `CoptellerContracts.asset_name`, `asset_identifier`, `asset_value` | Schema (`CoptellerContracts.ts`) |
| Cooperative Shares Desired | `TextItem` (Optional) | Integer >= 0 | `CoptellerMemberships.shares_owned` | Schema (`CoptellerMemberships.ts`) |

#### Section 2.6: Guarantor, Risk & Notifications (Including Identified Gaps)

| Form Question | Google Form Item Type | Options / Notes | Copteller Field & Location | Status |
|---|---|---|---|---|
| Guarantor Full Name | `TextItem` (Optional / Conditional) | Required when product has `requires_guarantor: true` | `CoptellerProductTypes.requires_guarantor`, `FALLBACK_OPERATORS.guarantor` | **Gap:** Enforced in Product schema, missing in Member onboarding UI |
| Guarantor Phone Number & Relationship | `TextItem` (Optional / Conditional) | e.g., `"0802... (Elder / Spouse / Business Partner)"` | `FALLBACK_OPERATORS.guarantorPhone` | **Gap:** Present in sample data, missing from onboarding UI |
| Next of Kin Name, Relationship & Phone | `ParagraphTextItem` (Optional) | Recommended banking KYC/estate compliance field | *Not yet in schema* | **Proposed Banking Gap** for stakeholder input |
| Preferred Notification Channels | `CheckboxItem` | `SMS Transaction Alerts`, `Push Notifications (Ajo/HP reminders)`, `Email Statements`, `WhatsApp Alerts` | `onboarding/member` Step 4 (`smsAlerts`, `pushAlerts`) | Live UI (`smsAlerts`, `pushAlerts`) |
| Preferred Transaction Authorization Method | `MultipleChoiceItem` | `4-Digit Transaction PIN`, `PIN + SMS OTP`, `Biometric` *(Note: do NOT enter real PINs here)* | `onboarding/member` Step 4 (PIN setup) | Security-safe equivalent for review |
| Member Declaration | `CheckboxItem` (Required) | *"I declare that all information provided is accurate and authorize Copteller / Abia Microfinance Bank to process cooperative escrow debits and credits per cooperative bylaws."* | `PrintableForm` Part D | Matches printable A4 form |

---

## 4. Technical Guide for Google Apps Script (`FormApp` + `SpreadsheetApp`)

Tell the agent to follow these strict Apps Script rules so the generated `Code.gs` runs cleanly on the first attempt without runtime errors:

### 4.1 Branching Rules (`PageBreakItem` Ordering)
In Google Apps Script, `choice` navigation requires the target `PageBreakItem` reference to exist **before** calling `item.setChoices([...])`.
**Required pattern:**
1. Build Form 2's static `PageBreakItem` anchors (or create pages in order, keep variables `pageTransport`, `pageAgri`, `pageCommerce`, `pageArtisan`, `pageProducts`, `pageSecurity`).
2. Add questions to each page after its `PageBreakItem` is created, OR create the `MultipleChoiceItem` placeholder first, create all target `PageBreakItem`s with their questions, and then wire `sectorMcq.setChoices([...])` at the end!
3. **Critical routing fix:** Every conditional branch page (Transport, Agriculture, Commerce, Artisan) MUST call:
   ```javascript
   pageAgri.setGoToPage(pageProducts); // Actually set on the *previous* page's PageBreakItem!
   ```
   Wait — **pay close attention to how `FormApp` sets "Continue to page"**:
   In Google Forms API, `targetPage.setGoToPage(nextPage)` controls what happens at the **end of `targetPage`**? **NO — `pageBreakItem` marks the START of a page, and `pageBreakItem.setGoToPage(destinationPage)` controls where the form goes when the user finishes the section *immediately BEFORE* that `pageBreakItem`!**
   **DOUBLE-CHECK THIS:**
   - A `PageBreakItem` object `P` represents the header of a new page AND the "After section [previous]" dropdown at the bottom of the preceding section!
   - Therefore, if the order of sections is:
     `[Section 2.4T Header (pTransport)] -> Transport Qs -> [Section 2.4A Header (pAgri)] -> Agri Qs -> [Section 2.4C Header (pCommerce)] -> Commerce Qs -> [Section 2.4R Header (pArtisan)] -> Artisan Qs -> [Section 2.5 Header (pProducts)]`
   - Then:
     - To make Transport users skip Agri/Commerce/Artisan and jump straight to `pProducts`, you MUST set `pAgri.setGoToPage(pProducts)` (because `pAgri` is the section break right after Transport questions!).
     - To make Agri users skip Commerce/Artisan, set `pCommerce.setGoToPage(pProducts)`.
     - To make Commerce users skip Artisan, set `pArtisan.setGoToPage(pProducts)`.
     - Artisan naturally flows into `pProducts`.
   - Remind the agent of this exact `PageBreakItem` quirk — getting it backwards is the #1 bug in Google Apps Script branching forms!

### 4.2 Validation Builders (`FormApp.createTextValidation()`)
Always chain `.build()` at the end of validation builders:
```javascript
const bvnValidation = FormApp.createTextValidation()
  .setHelpText('BVN must be exactly 11 numeric digits (do not enter a real personal BVN during stakeholder review).')
  .requireTextMatchesPattern('^\\d{11}$')
  .build();
bvnItem.setValidation(bvnValidation);

const emailValidation = FormApp.createTextValidation()
  .setHelpText('Enter a valid email address.')
  .requireTextIsEmail()
  .build();
emailItem.setValidation(emailValidation);

const nonNegNumberValidation = FormApp.createTextValidation()
  .setHelpText('Enter a numeric value greater than or equal to 0.')
  .requireNumberGreaterThanOrEqualTo(0)
  .build();
```

### 4.3 Linking to Google Sheets & Generating the Review Matrix
```javascript
const ss = SpreadsheetApp.create('Copteller Onboarding — Responses & Stakeholder Field Matrix');
coopForm.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
memberForm.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
```
Then create a formatted `"Field Review Matrix"` sheet inside `ss` with frozen header row, auto-resized columns, data validation dropdowns (`Keep as Required`, `Keep as Optional`, `Modify / Clarify`, `Remove`, `Add New`), and color-coded status tags:
- Columns: `Form`, `Section`, `Question Label`, `Input Type`, `Options / Validation`, `Copteller Table / Collection`, `Copteller Field Name`, `Current Implementation Status`, `Stakeholder Decision (Dropdown)`, `Stakeholder Notes`.

### 4.4 Drive Organization & Logging
- Put both Forms and the Spreadsheet inside a single Google Drive folder (`DriveApp.createFolder('Copteller Stakeholder Onboarding Review Pack')`), moving created files into that folder (`DriveApp.getFileById(id).moveTo(folder)`).
- `Logger.log(...)` all 5 URLs clearly:
  - Drive Folder URL
  - Cooperative Registration Form (Shareable Respondent URL via `getPublishedUrl()`, Editor URL via `getEditUrl()`)
  - Member Onboarding Form (Respondent URL, Editor URL)
  - Companion Spreadsheet URL (`ss.getUrl()`)

---

## 5. Known Copteller Codebase Discrepancies to Flag for Stakeholders

The agent MUST highlight these real discrepancies in both the Form Section Help Texts (where relevant) and the `"Field Review Matrix"` sheet so stakeholders can make explicit product decisions:

1. **Cooperative Types mismatch**: `collections/Cooperatives.ts` defines `women` (`Women's Cooperative`), `youth` (`Youth Cooperative`), and `other`, whereas `onboarding/admin/page.tsx` only displays 8 of the 11 types.
2. **Sector collapse bug/gap**: `Cooperatives.ts` and `CoptellerProductTypes.ts` define 13 sectors (including `health`, `education`, `technology`, `professional`, `housing`, `manufacturing`, `energy`, `financial_services`), but `onboarding/admin/page.tsx` collapses several of them into `'other'`, and `onboarding/member/page.tsx` only lists 10.
3. **Kobo vs Naira inconsistency**: `Cooperatives.ts` and `POST /api/copteller/admin/cooperatives` expect `membership_fee_kobo`, `monthly_dues_kobo`, `late_payment_penalty_kobo` in Kobo (`₦ * 100`), while `admin/settings/route.ts` reads/writes `default_contribution_amount` directly without `* 100` conversion.
4. **Registration number key mismatch**: `onboarding/admin/page.tsx` submits `registration_number` (matching `Cooperatives.ts`), while `onboarding/member/page.tsx` quick-create sends `reg_number`.
5. **Missing KYC & Guarantor fields in self-service UI**: `Customers.ts` defines `gender` and `address`, `/api/copteller/verify-identity` accepts `nin`, and `CoptellerProductTypes.ts` defines `requires_guarantor` / `collateral_type`, yet `onboarding/member/page.tsx` does not capture `gender`, `address`, `nin`, Next of Kin, or Guarantor details.
6. **Sector-specific member metadata persistence**: `admin/members/page.tsx` collects detailed Transport/Agriculture/Commerce/Artisan fields in a `metadata` payload, but `POST /api/copteller/admin/operators` only destructures core fields and does not persist `metadata`.
7. **Cooperative governance officers & document uploads**: `CoptellerMemberships.ts` includes `chairperson`, `treasurer`, `secretary`, `patron` roles, and `PrintableForm` includes Passport Photo + Union Leader / Bank Auditor signatures, none of which have dedicated onboarding inputs or file-upload storage yet.

---

## 6. Agent Execution Checklist & Prompt Template

When instructing another agent to write the Apps Script using this guide, require it to:
1. Deliver a complete, single-file `Code.gs` (with modular functions: `createCooperativeForm_()`, `createMemberForm_()`, `populateReviewMatrixSheet_()`, `addStakeholderReviewBlock_()`, `wireBranching_()`).
2. Double-check every `PageBreakItem.setGoToPage(...)` call against Google Apps Script's *"bottom of previous section"* rule.
3. Exclude real password/PIN collection and guard `BVN`/`NIN` with stakeholder-review notices.
4. Include a `README` / setup snippet explaining how to paste into `https://script.google.com`, select `createCoptellerStakeholderForms`, authorize Google Forms / Sheets / Drive scopes, and copy the resulting respondent URLs from Execution Log to share with stakeholders.

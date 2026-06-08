/* ─── Stakeholder Seed Data ─────────────────────────────────── */

export type StakeholderType = "employee" | "subcontractor" | "vendor" | "external";

export interface Stakeholder {
  id: string;
  name: string;
  job_title: string;
  code: string;
  phone: string;
  email: string;
  department: string;
  company: string;
  type: StakeholderType;
}

/* Unique ID from code */
const mkId = (code: string | number) => `stk-${code}`;

export const SEED_STAKEHOLDERS: Stakeholder[] = [
  // ═══════ EMPLOYEES ═══════
  { id: mkId(84),  name: "محمود هشام علي محمود البطراوي", job_title: "Chairman", code: "84", phone: "01224387313", email: "elbatrawih@pzoneinternational.com", department: "General Management", company: "P.zone", type: "employee" },
  { id: mkId(8),   name: "مهدى محمد قاسم مهدى الشيخ", job_title: "Deputy General Managers", code: "8", phone: "01006606738", email: "alshaikhm@pzoneinternational.com", department: "General Management", company: "P.zone", type: "employee" },
  { id: mkId(144), name: "ماهيتاب هشام نبيه محجوب", job_title: "Executive Assistant Of CEO", code: "144", phone: "01024557766", email: "mahgoubm@pzoneinternational.com", department: "General Management", company: "P.zone", type: "employee" },
  { id: mkId(154), name: "ايهاب انور محمد زكى حسن", job_title: "Chief Financial Officer", code: "154", phone: "01099858877", email: "anware@pzoneinternational.com", department: "Financial", company: "P.zone", type: "employee" },
  { id: mkId(6),   name: "محمود سيد محمود سابق", job_title: "Treasury Manager", code: "6", phone: "01014522283", email: "sabekm@pzoneinternational.com", department: "Financial", company: "P.zone", type: "employee" },
  { id: mkId(3),   name: "محمد السعيد محمود محمد", job_title: "Account Manager", code: "3", phone: "01006022901", email: "Elsaiedm@pzoneinternational.com", department: "Financial", company: "P.zone", type: "employee" },
  { id: mkId(72),  name: "حازم نصر نصر حسن", job_title: "Accounts Payable Section Head", code: "72", phone: "01022146800", email: "nasrh@pzoneinternational.com", department: "Financial", company: "P.zone", type: "employee" },
  { id: mkId(45),  name: "عمرو جمال محمد", job_title: "Accounts Receievable Section Head", code: "45", phone: "01050859540", email: "Gamala@pzoneinternational.com", department: "Financial", company: "P.zone", type: "employee" },
  { id: mkId(153), name: "احمد طارق حداد ابراهيم", job_title: "Treasury Admin", code: "153", phone: "01022836366", email: "tareka@pzoneinternational.com", department: "Financial", company: "P.zone", type: "employee" },
  { id: mkId(171), name: "سيف طارق عبدالعال حسنى توكل", job_title: "Accounts Payable Accountant", code: "171", phone: "01044553102", email: "tawakols@pzoneinternational.com", department: "Financial", company: "P.zone", type: "employee" },
  { id: mkId(191), name: "عبدالرحمن عمرو فاروق حسين", job_title: "Accountant", code: "191", phone: "01044992835", email: "amra@pzoneinternational.com", department: "Financial", company: "P.zone", type: "employee" },
  { id: mkId(207), name: "مينا مكرم شارونى واصف", job_title: "Treasury Accountant", code: "207", phone: "01044553101", email: "makramm@pzoneinternational.com", department: "Financial", company: "P.zone", type: "employee" },
  { id: mkId(193), name: "عبدالرحمن ابراهيم كمال", job_title: "Commercial Specialist", code: "193", phone: "01044992839", email: "ebrahimr@pzoneinternational.com", department: "Contracts", company: "P.zone", type: "employee" },
  { id: mkId(19),  name: "مصطفى عمر كامل على", job_title: "Projects Coordinator & Cost Control Manager", code: "19", phone: "01022844113", email: "omarm@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(50),  name: "حسن عبدالمطلب حسن", job_title: "Cost Controller", code: "50", phone: "01064076660", email: "shohaibh@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(83),  name: "عبد الله سيد احمد عبد الله", job_title: "Accountant", code: "83", phone: "01094333241", email: "sayedahmeda@pzoneinternational.com", department: "Financial", company: "P.zone", type: "employee" },
  { id: mkId(128), name: "نادين عبدالرحيم على احمد", job_title: "Tendering Manager", code: "128", phone: "01025554469", email: "abdelrehimn@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(190), name: "محمد حسن عبدالتواب شهيب", job_title: "Subcontractor Specialist", code: "190", phone: "01044992838", email: "Tawabm@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(56),  name: "امير مصطفى سليمان محمد", job_title: "Documents Control Manager", code: "56", phone: "01066220351", email: "mostafaa@pzoneinternational.com", department: "Technical Office", company: "P.zone", type: "employee" },
  { id: mkId(168), name: "سيف حاتم زكريا عبدالمنعم", job_title: "Junior Documents Controller", code: "168", phone: "01070540097", email: "hatems@pzoneinternational.com", department: "Technical Office", company: "P.zone", type: "employee" },
  { id: mkId(205), name: "محمد فتوح رضوان محمود", job_title: "Senior Documents Controller", code: "205", phone: "01099500196", email: "fatouhm@pzoneinternational.com", department: "Technical Office", company: "P.zone", type: "employee" },
  { id: mkId(222), name: "شروق محمد زكريا السيد", job_title: "Junior Documents Controller", code: "222", phone: "01050377796", email: "zakarias@pzoneinternational.com", department: "Technical Office", company: "P.zone", type: "employee" },
  { id: mkId(132), name: "احمد السيد محمود السيد", job_title: "ERP Manager", code: "132", phone: "01004593857", email: "", department: "ERP", company: "P.zone", type: "employee" },
  { id: mkId(31),  name: "عمرو فيصل اسماعيل ابراهيم العربي", job_title: "ERP Operator", code: "31", phone: "01033316306", email: "faisala@pzoneinternational.com", department: "ERP", company: "P.zone", type: "employee" },
  { id: mkId(30),  name: "خالد اسماعيل ابراهيم محمد", job_title: "Cairo Area Manager", code: "30", phone: "01061777803", email: "ismaelkh@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(91),  name: "احمد محمد شحاتة عبدالجليل", job_title: "Project Manager", code: "91", phone: "01022855665", email: "mohameda@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(25),  name: "عبد الرحمن حمدى ابراهيم عزب", job_title: "Electrical Construction Manager", code: "25", phone: "01050222189", email: "azaba@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(79),  name: "بسام البدرى عبد اللطيف احمد", job_title: "Civil Site Engineer", code: "79", phone: "01033316581", email: "elbadryb@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(41),  name: "اسامه محمد ابراهيم السيد شاهين", job_title: "Civil Site Engineer", code: "41", phone: "010066605687", email: "Shahino@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(90),  name: "محمد شعبان زايد محمد", job_title: "Project Manager", code: "90", phone: "01009577796", email: "", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(96),  name: "خالد اشرف على", job_title: "Civil Site Engineer", code: "96", phone: "1008690007", email: "ashrafk@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(92),  name: "مصطفى عادل عبدالرحمن محمود عوض", job_title: "Civil Site Engineer", code: "92", phone: "01080015695", email: "abdelrahman@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(138), name: "محمد حمدى فتحى ابوالغيث", job_title: "Civil Site Engineer", code: "138", phone: "01070474455", email: "", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(122), name: "وائل سعيد محمود ضحا", job_title: "Mechanical Site Engineer", code: "122", phone: "01099500362", email: "Saeedw@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(152), name: "ابراهيم جمعة ابراهيم عبدالرحمن", job_title: "Mechanical Site Engineer", code: "152", phone: "01099132221", email: "gomaai@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(151), name: "مصطفى امير احمد مختار", job_title: "Civil Site Engineer", code: "151", phone: "01050390804", email: "amirm@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(184), name: "مينا سمير توفيق ابراهيم", job_title: "Project Manager", code: "184", phone: "01099858552", email: "samirm@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(195), name: "ابراهيم حسن عبدالعليم سيد", job_title: "Civil Site Engineer", code: "195", phone: "01044992836", email: "", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(178), name: "محمد حسن على ابوالليل السيد", job_title: "Safety Man", code: "178", phone: "01066220439", email: "", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(213), name: "عبدالرحمن سعد مبروك", job_title: "Mechanical Site Engineer", code: "213", phone: "1014822888", email: "saada@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(226), name: "بولا موريس فوزى مسعود", job_title: "MEP Coordinator", code: "226", phone: "01069826535", email: "morisb@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(221), name: "عبدالرحمن صبحى عبدالعزيز", job_title: "Architectural Site Engineer", code: "221", phone: "1026881672", email: "sobhia@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(224), name: "ناجى نسيم ناشد فهيم", job_title: "Construction Manager", code: "224", phone: "1270088815", email: "", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(86),  name: "طارق علي محمود البطراوي", job_title: "Procurement Head", code: "86", phone: "01001415055", email: "elbatrawit@pzoneinternational.com", department: "Procurement", company: "P.zone", type: "employee" },
  { id: mkId(5),   name: "احمد اسماعيل ابراهيم محمد", job_title: "Senior Procurement Executive", code: "5", phone: "01006606736", email: "ismaila@pzoneinternational.com", department: "Procurement", company: "P.zone", type: "employee" },
  { id: mkId(7),   name: "محمد اسماعيل عبد الغنى", job_title: "Supply Chain Executive", code: "7", phone: "01090043223", email: "noneattiam@pzoneinternational.com", department: "Procurement", company: "P.zone", type: "employee" },
  { id: mkId(29),  name: "حمدى حامد ابراهيم محمد على", job_title: "Procurement Cost Controller", code: "29", phone: "", email: "", department: "Procurement", company: "P.zone", type: "employee" },
  { id: mkId(155), name: "ناهد محمود محمد رشاد", job_title: "Section Head Planning Engineer/N.C", code: "155", phone: "01080015693", email: "rashedn@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(173), name: "ندى جمال محمد عبدالشافى", job_title: "Planning Consultant", code: "173", phone: "01050222179", email: "gamaln@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(57),  name: "اية السيد محمد فاروز", job_title: "Technical Office Manager", code: "57", phone: "01066220357", email: "sayeda@pzoneinternational.com", department: "Technical Office", company: "P.zone", type: "employee" },
  { id: mkId(345), name: "مصطفي محمد مصطفي محمد سليم", job_title: "Projects Director", code: "345", phone: "01044992837", email: "selimm@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(283), name: "احمد وجيه عبدالعليم فرج", job_title: "Projects Manager", code: "283", phone: "1060464641", email: "waheha@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(282), name: "مدحت فؤاد عبدالعزيز", job_title: "Senior Civil Site Engineer", code: "282", phone: "1021066699", email: "fouadme@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(285), name: "الحسن محمد محمد الحسن", job_title: "Senior Coordinator Civil Engineer", code: "285", phone: "1031348800", email: "masouda@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(288), name: "احمد ماهر فهمي السيد", job_title: "Senior Civil Site Engineer", code: "288", phone: "1080015704", email: "mahera@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(218), name: "خالد جوده عبدالعزيز محمد", job_title: "IT Manager", code: "218", phone: "01080100543", email: "elmalahk@pzoneinternational.com", department: "IT Department", company: "P.zone", type: "employee" },
  { id: mkId(131), name: "محمد سعد محمد محجوب", job_title: "Personnel & Payroll Specialist", code: "131", phone: "1099500347", email: "saadm@pzoneinternational.com", department: "Administration", company: "P.zone", type: "employee" },
  { id: mkId(89),  name: "احمد محمد السحاتى", job_title: "Senior Surveyor", code: "89", phone: "01009745550", email: "sahatym@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(22),  name: "محمد على عبدالله", job_title: "Quality Control Manager", code: "22", phone: "1006058881", email: "alim@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(245), name: "مصطفى محمد سعد سيد احمد", job_title: "Mechanical Site Engineer", code: "245", phone: "01044553105", email: "Saidm@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(329), name: "نرمين جمال محمود احمد", job_title: "Section Head Planning Engineer/Cairo", code: "329", phone: "01021111762", email: "mahmoudn@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(334), name: "محمد عربي مصطفى سيد", job_title: "Senior Electrical Site Engineer", code: "334", phone: "01022833009", email: "arabym@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },
  { id: mkId(290), name: "عماد محمد كردي محمد", job_title: "Civil Site Engineer", code: "290", phone: "1009411160", email: "Kordye@pzoneinternational.com", department: "Construction", company: "P.zone", type: "employee" },

  // ═══════ EXTERNAL STAKEHOLDERS ═══════
  { id: mkId("ext-1"), name: "Osama Lotfy", job_title: "Senior Manager - Projects", code: "", phone: "01220043896", email: "olotfy@emaar.eg", department: "", company: "Emaar", type: "external" },
  { id: mkId("ext-2"), name: "Monaem Algamal", job_title: "Mechanical Department - Projects", code: "", phone: "01005313289", email: "melgamal@emaar.eg", department: "", company: "Emaar", type: "external" },
  { id: mkId("ext-3"), name: "Ahmed Khalil", job_title: "Mechanical Department - Projects", code: "", phone: "01278680916", email: "ahmedradwan@emaar.eg", department: "", company: "Emaar", type: "external" },
  { id: mkId("ext-4"), name: "Ehab M. Reda", job_title: "Contracts - Commercial Department", code: "", phone: "01273866663", email: "ehabr@emaar.eg", department: "", company: "Emaar", type: "external" },
  { id: mkId("ext-5"), name: "Evram Rafat", job_title: "Projects Manager", code: "", phone: "01143353755", email: "evram.refaat@hassanallam.com", department: "", company: "Hassan Allam Construction", type: "external" },
  { id: mkId("ext-6"), name: "Ahmed Elnoby", job_title: "MEP Project Manager", code: "", phone: "01067255503", email: "ahmed.elnoby@hassanallam.com", department: "", company: "Hassan Allam Construction", type: "external" },
  { id: mkId("ext-7"), name: "Mahmoud Elkadousy", job_title: "Technical Manager", code: "", phone: "01068802201", email: "mahmoud.elkadousy@hassanallam.com", department: "", company: "Hassan Allam Construction", type: "external" },
];

/* ─── Department list for filters ─── */
export const DEPARTMENTS = [
  "General Management",
  "Financial",
  "Contracts",
  "Construction",
  "Technical Office",
  "Procurement",
  "ERP",
  "IT Department",
  "Administration",
  "Service Department",
  "Human Resource",
];

/* ─── Project manager-eligible roles ─── */
export const PM_ELIGIBLE_TITLES = [
  "Chairman",
  "Deputy General Managers",
  "Projects Director",
  "Projects Manager",
  "Project Manager",
  "project Manager",
  "Cairo Area Manager",
  "Construction Manager",
  "Electrical Construction Manager",
  "Projects Coordinator & Cost Control Manager",
  "Senior Civil Site Engineer",
  "Senior Coordinator Civil Engineer",
  "MEP Coordinator",
  "Technical Office Manager",
];

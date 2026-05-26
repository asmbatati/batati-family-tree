import type { Locale } from "./config";

export type Dictionary = {
  brand: { name: string; tagline: string };
  nav: { home: string; about: string; tree: string; sources: string; events: string; insights: string };
  home: {
    heroTitle: string;
    heroSubtitle: string;
    ctaTree: string;
    ctaAbout: string;
    sectionsTitle: string;
    cards: {
      about: { title: string; desc: string };
      tree: { title: string; desc: string };
      sources: { title: string; desc: string };
      events: { title: string; desc: string };
      insights: { title: string; desc: string };
    };
  };
  about: {
    title: string;
    rootsTitle: string;
    rootsBody: string;
    virtuesTitle: string;
    virtuesBody: string;
    lineageTitle: string;
    lineageBody: string;
    historyTitle: string;
    historyBody: string;
  };
  tree: {
    title: string;
    subtitle: string;
    views: {
      tree: string;
      focus: string;
      layers: string;
      focusEmpty: string;
    };
    search: {
      placeholder: string;
      noResults: string;
      results: string;
    };
    actions: {
      expandAll: string;
      collapseAll: string;
      focusOn: string;
    };
    layers: {
      title: string;
      men: string;
      women: string;
      spouses: string;
      milk: string;
      extended: string;
    };
    focus: {
      title: string;
      hint: string;
      clear: string;
    };
    relations: {
      father: string;
      mother: string;
      son: string;
      daughter: string;
      brother: string;
      sister: string;
      spouse: string;
      milk: string;
      uncleP: string; // عم
      uncleM: string; // خال
      auntP: string;  // عمة
      auntM: string;  // خالة
      cousin: string;
    };
    add: {
      title: string;
      choose: string;
      save: string;
      cancel: string;
      nameArLabel: string;
      nameEnLabel: string;
      saving: string;
      notEditor: string;
      forPerson: string;
    };
  };
  sources: {
    title: string;
    subtitle: string;
    add: string;
    columns: { title: string; author: string; year: string; type: string; link: string };
  };
  events: {
    title: string;
    subtitle: string;
    upcoming: string;
    past: string;
    types: { wedding: string; birth: string; death: string; gathering: string; other: string };
  };
  insights: {
    title: string;
    subtitle: string;
    cards: {
      totalPeople: string;
      totalRelationships: string;
      avgChildren: string;
      oldestLiving: string;
      mostConnected: string;
    };
  };
  person: {
    profile: string;
    born: string;
    died: string;
    location: string;
    occupation: string;
    bio: string;
    relationships: string;
    addRelative: string;
    edit: string;
    close: string;
  };
  common: {
    save: string;
    cancel: string;
    edit: string;
    delete: string;
    confirm: string;
    loading: string;
    error: string;
    search: string;
    backHome: string;
  };
  footer: {
    rights: string;
    builtWith: string;
  };
  auth: {
    signIn: string;
    signOut: string;
    loginTitle: string;
    loginSubtitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    sendLink: string;
    sending: string;
    linkSent: string;
    linkSentHint: string;
    notConfigured: string;
    editor: string;
    notEditor: string;
    notEditorHint: string;
  };
};

const ar: Dictionary = {
  brand: { name: "البطاطي", tagline: "شجرة العائلة — تاريخ ونسب" },
  nav: { home: "الرئيسية", about: "عن العائلة", tree: "الشجرة", sources: "المصادر", events: "الأحداث", insights: "تحليلات" },
  home: {
    heroTitle: "موقع البطاطي",
    heroSubtitle: "منصة حديثة لتوثيق شجرة عائلة البطاطي بطبقات تفاعلية، ومصادر، وأحداث، وتحليلات.",
    ctaTree: "افتح الشجرة",
    ctaAbout: "تعرّف على العائلة",
    sectionsTitle: "أقسام المنصة",
    cards: {
      about: { title: "عن العائلة", desc: "الجذور، النسب، التاريخ والمناقب." },
      tree: { title: "شجرة العائلة", desc: "تصور تفاعلي بطبقات: رجال، نساء، أزواج، رضاعة." },
      sources: { title: "المصادر", desc: "كتب ووثائق وروايات شفوية موثقة." },
      events: { title: "الأحداث", desc: "أفراح، أعراس، وفيات، ولقاءات عائلية." },
      insights: { title: "تحليلات", desc: "إحصائيات وروابط مكتشفة بين الأشخاص." }
    }
  },
  about: {
    title: "عن عائلة البطاطي",
    rootsTitle: "الجذور",
    rootsBody:
      "عائلة البطاطي عائلة عريقة ذات جذور موثقة، وفيما يلي مساحة لتعبئة المعلومات التعريفية عن الجذور والقبيلة والمنطقة الأصلية. (يمكن تحرير هذا النص من ملف المحتوى لاحقاً.)",
    virtuesTitle: "المناقب",
    virtuesBody:
      "هذه مساحة لتوثيق مناقب العائلة وأبرز شخصياتها وإنجازاتهم عبر الأجيال.",
    lineageTitle: "النسب",
    lineageBody:
      "يُعرض هنا شجرة النسب الرئيسية مع الإشارة إلى المصادر، ويمكن التعمق في كل فرع من خلال صفحة الشجرة.",
    historyTitle: "التاريخ",
    historyBody:
      "نقاط مفصلية في تاريخ العائلة: الانتقالات، اللقاءات، الأحداث المهمة، وروابطها بالأحداث التاريخية الأوسع."
  },
  tree: {
    title: "شجرة العائلة",
    subtitle: "تنقّل بين الطبقات، واضغط على أي اسم للتركيز عليه وعرض روابطه.",
    views: {
      tree: "شجرة",
      focus: "تركيز",
      layers: "بطبقات",
      focusEmpty: "اختر شخصاً من الشجرة لعرض روابطه."
    },
    search: {
      placeholder: "ابحث عن شخص…",
      noResults: "لا توجد نتائج",
      results: "نتيجة"
    },
    actions: {
      expandAll: "توسيع الكل",
      collapseAll: "طيّ الكل",
      focusOn: "تركيز عليه"
    },
    layers: {
      title: "الطبقات",
      men: "الرجال",
      women: "النساء",
      spouses: "الأزواج",
      milk: "الرضاعة",
      extended: "الأقارب الموسّعون"
    },
    focus: {
      title: "وضع التركيز",
      hint: "اضغط على شخص ليصبح مركز الشجرة وتظهر روابطه بألوان ورموز مختلفة.",
      clear: "إلغاء التركيز"
    },
    relations: {
      father: "الأب",
      mother: "الأم",
      son: "ابن",
      daughter: "ابنة",
      brother: "أخ",
      sister: "أخت",
      spouse: "زوج/زوجة",
      milk: "أخ/أخت بالرضاعة",
      uncleP: "عم",
      uncleM: "خال",
      auntP: "عمة",
      auntM: "خالة",
      cousin: "ابن/ابنة عم/خال"
    },
    add: {
      title: "إضافة",
      choose: "اختر نوع الرابط",
      save: "حفظ",
      cancel: "إلغاء",
      nameArLabel: "الاسم بالعربية",
      nameEnLabel: "الاسم بالإنجليزية (اختياري)",
      saving: "جارٍ الحفظ…",
      notEditor: "تحتاج صلاحية محرر لإضافة الأقارب.",
      forPerson: "كقريب لـ"
    }
  },
  sources: {
    title: "المصادر",
    subtitle: "قائمة الكتب والوثائق والروايات الشفوية التي تستند إليها معلومات الشجرة.",
    add: "إضافة مصدر",
    columns: { title: "العنوان", author: "المؤلف", year: "السنة", type: "النوع", link: "الرابط" }
  },
  events: {
    title: "أحداث وإعلانات",
    subtitle: "أعراس، أفراح، وفيات، ولقاءات عائلية — كل ما يهم العائلة.",
    upcoming: "القادمة",
    past: "السابقة",
    types: { wedding: "زفاف", birth: "ولادة", death: "وفاة", gathering: "لقاء عائلي", other: "أخرى" }
  },
  insights: {
    title: "تحليلات وروابط",
    subtitle: "إحصائيات تلقائية حول العائلة وروابط مكتشفة بين الأشخاص.",
    cards: {
      totalPeople: "إجمالي الأشخاص",
      totalRelationships: "إجمالي الروابط",
      avgChildren: "متوسط عدد الأبناء",
      oldestLiving: "الأكبر سناً",
      mostConnected: "الأكثر اتصالاً"
    }
  },
  person: {
    profile: "البروفايل",
    born: "تاريخ الميلاد",
    died: "تاريخ الوفاة",
    location: "المكان",
    occupation: "المهنة",
    bio: "نبذة",
    relationships: "الروابط",
    addRelative: "إضافة قريب",
    edit: "تحرير",
    close: "إغلاق"
  },
  common: {
    save: "حفظ",
    cancel: "إلغاء",
    edit: "تحرير",
    delete: "حذف",
    confirm: "تأكيد",
    loading: "جارٍ التحميل…",
    error: "حدث خطأ",
    search: "بحث",
    backHome: "العودة للرئيسية"
  },
  footer: {
    rights: "جميع الحقوق محفوظة لعائلة البطاطي",
    builtWith: "بُني بـ Next.js و Supabase"
  },
  auth: {
    signIn: "تسجيل الدخول",
    signOut: "تسجيل الخروج",
    loginTitle: "تسجيل دخول المحررين",
    loginSubtitle: "أدخل بريدك الإلكتروني وسنرسل لك رابط دخول. لا يحتاج كلمة سر.",
    emailLabel: "البريد الإلكتروني",
    emailPlaceholder: "name@example.com",
    sendLink: "أرسل رابط الدخول",
    sending: "جاري الإرسال…",
    linkSent: "تم الإرسال ✓",
    linkSentHint: "افتح بريدك واضغط على الرابط للدخول. قد يصل خلال دقيقة.",
    notConfigured: "لم يتم إعداد Supabase بعد. أضف مفاتيح البيئة وأعد التشغيل.",
    editor: "محرر",
    notEditor: "أنت مسجّل الدخول كقارئ.",
    notEditorHint: "لا يمكنك التعديل حتى يضيفك المشرف لقائمة المحررين."
  }
};

const en: Dictionary = {
  brand: { name: "Al-Batati", tagline: "Family Tree — Heritage & Lineage" },
  nav: { home: "Home", about: "About", tree: "Tree", sources: "Sources", events: "Events", insights: "Insights" },
  home: {
    heroTitle: "The Al-Batati Family",
    heroSubtitle: "A modern platform documenting the Al-Batati family tree with layered visualization, sources, events, and insights.",
    ctaTree: "Open the tree",
    ctaAbout: "About the family",
    sectionsTitle: "Sections",
    cards: {
      about: { title: "About", desc: "Roots, lineage, history, and virtues." },
      tree: { title: "Family tree", desc: "Interactive layered view: men, women, spouses, milk-ties." },
      sources: { title: "Sources", desc: "Books, documents, and oral histories." },
      events: { title: "Events", desc: "Weddings, births, gatherings, and announcements." },
      insights: { title: "Insights", desc: "Auto-discovered statistics and connections." }
    }
  },
  about: {
    title: "About the Al-Batati family",
    rootsTitle: "Roots",
    rootsBody:
      "The Al-Batati family is an established family with documented roots. This is a placeholder for the family's introduction, origin, and tribal context. Edit this content from the content file.",
    virtuesTitle: "Virtues & merits",
    virtuesBody:
      "A space to document the virtues, notable figures, and achievements of the family across generations.",
    lineageTitle: "Lineage",
    lineageBody:
      "The main lineage tree is shown here with references to sources. Each branch can be explored from the tree page.",
    historyTitle: "History",
    historyBody:
      "Key historical milestones for the family: migrations, gatherings, important events, and ties to wider historical context."
  },
  tree: {
    title: "Family tree",
    subtitle: "Toggle layers and click any name to focus on it and view its relationships.",
    views: {
      tree: "Tree",
      focus: "Focus",
      layers: "Layers",
      focusEmpty: "Pick a person from the tree to see their relationships."
    },
    search: {
      placeholder: "Search a person…",
      noResults: "No results",
      results: "result(s)"
    },
    actions: {
      expandAll: "Expand all",
      collapseAll: "Collapse all",
      focusOn: "Focus on"
    },
    layers: {
      title: "Layers",
      men: "Men",
      women: "Women",
      spouses: "Spouses",
      milk: "Milk ties",
      extended: "Extended kin"
    },
    focus: {
      title: "Focus mode",
      hint: "Click on a person to center the tree on them and reveal relationships with distinct colors and icons.",
      clear: "Clear focus"
    },
    relations: {
      father: "Father",
      mother: "Mother",
      son: "Son",
      daughter: "Daughter",
      brother: "Brother",
      sister: "Sister",
      spouse: "Spouse",
      milk: "Milk sibling",
      uncleP: "Uncle (paternal)",
      uncleM: "Uncle (maternal)",
      auntP: "Aunt (paternal)",
      auntM: "Aunt (maternal)",
      cousin: "Cousin"
    },
    add: {
      title: "Add",
      choose: "Choose relationship type",
      save: "Save",
      cancel: "Cancel",
      nameArLabel: "Name (Arabic)",
      nameEnLabel: "Name (English, optional)",
      saving: "Saving…",
      notEditor: "You need editor permission to add relatives.",
      forPerson: "as a relative of"
    }
  },
  sources: {
    title: "Sources",
    subtitle: "Books, documents, and oral histories backing the tree's information.",
    add: "Add source",
    columns: { title: "Title", author: "Author", year: "Year", type: "Type", link: "Link" }
  },
  events: {
    title: "Events & announcements",
    subtitle: "Weddings, births, deaths, and family gatherings — everything that matters to the family.",
    upcoming: "Upcoming",
    past: "Past",
    types: { wedding: "Wedding", birth: "Birth", death: "Death", gathering: "Gathering", other: "Other" }
  },
  insights: {
    title: "Insights & connections",
    subtitle: "Automatic statistics about the family and discovered connections between people.",
    cards: {
      totalPeople: "Total people",
      totalRelationships: "Total relationships",
      avgChildren: "Avg. children",
      oldestLiving: "Oldest",
      mostConnected: "Most connected"
    }
  },
  person: {
    profile: "Profile",
    born: "Born",
    died: "Died",
    location: "Location",
    occupation: "Occupation",
    bio: "Biography",
    relationships: "Relationships",
    addRelative: "Add relative",
    edit: "Edit",
    close: "Close"
  },
  common: {
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    confirm: "Confirm",
    loading: "Loading…",
    error: "Error",
    search: "Search",
    backHome: "Back to home"
  },
  footer: {
    rights: "All rights reserved — Al-Batati Family",
    builtWith: "Built with Next.js and Supabase"
  },
  auth: {
    signIn: "Sign in",
    signOut: "Sign out",
    loginTitle: "Editor sign-in",
    loginSubtitle: "Enter your email — we'll send you a one-time link. No password required.",
    emailLabel: "Email",
    emailPlaceholder: "name@example.com",
    sendLink: "Send magic link",
    sending: "Sending…",
    linkSent: "Sent ✓",
    linkSentHint: "Open the email and click the link to sign in. May take a minute.",
    notConfigured: "Supabase isn't configured. Add the env keys and restart.",
    editor: "Editor",
    notEditor: "Signed in as viewer.",
    notEditorHint: "You can't edit until an admin adds you to the editors list."
  }
};

const dictionaries: Record<Locale, Dictionary> = { ar, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

import type { Locale } from "./config";

export type Dictionary = {
  brand: { name: string; tagline: string };
  nav: { home: string; about: string; tree: string; sources: string; events: string; insights: string; relate: string };
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
    redactedFemale: string;
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
      filters: {
        title: string;
        parents: string;
        children: string;
        siblings: string;
        spouses: string;
        milk: string;
        extended: string;
        females: string;
      };
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
      modeNew: string;
      modeExisting: string;
      pickExisting: string;
      pickExistingHint: string;
      autoSpouseHint: string;
      duplicateError: string;
      siblingsStepTitle: string;
      siblingsStepHint: string;
      skip: string;
      noSiblings: string;
      placeholderFather: string;
      placeholderMother: string;
      placeholderSpouse: string;
      linkStep: {
        titleSiblings: string;  hintSiblings: string;  emptySiblings: string;
        titleChildren: string;  hintChildren: string;  emptyChildren: string;
        titleParents: string;   hintParents: string;   emptyParents: string;
        titleSpouses: string;   hintSpouses: string;   emptySpouses: string;
        alsoSetMother: string;
        alsoSetFather: string;
      };
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
      topName: string;
      topDualName: string;
      largestFamily: string;
      totalMale: string;
      totalFemale: string;
      deepestGen: string;
      namesOnce: string;
    };
    byGeneration: {
      title: string;
      gen: string;
      count: string;
      males: string;
      females: string;
      timeframe: string;
      note: string;
    };
    timesUsed: string;
    children: string;
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
    phone: string;
    email: string;
    website: string;
    contact: string;
  };
  editPerson: {
    title: string;
    sectionIdentity: string;
    sectionDates: string;
    sectionContact: string;
    sectionBio: string;
    sectionFamily: string;
    titleAr: string;
    titleEn: string;
    gender: string;
    male: string;
    female: string;
    status: string;
    statusLiving: string;
    statusDeceased: string;
    statusUnknown: string;
    birthYear: string;
    deathYear: string;
    birthOrder: string;
    generation: string;
    photoUrl: string;
    occupationAr: string;
    occupationEn: string;
    bioAr: string;
    bioEn: string;
    familyAr: string;
    familyEn: string;
    save: string;
    cancel: string;
    saving: string;
    saveError: string;
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
  relate: {
    title: string;
    subtitle: string;
    person1: string;
    person2: string;
    pickPerson: string;
    pickAnother: string;
    sameWarning: string;
    noPath: string;
    pathFound: string;
    steps: string;
    via: string;
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
  nav: { home: "الرئيسية", about: "عن العائلة", tree: "الشجرة", sources: "المصادر", events: "الأحداث", insights: "تحليلات", relate: "ابحث عن رابط" },
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
    redactedFemale: "محجوبة",
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
      clear: "إلغاء التركيز",
      filters: {
        title: "إظهار",
        parents: "الأبوين",
        children: "الأبناء",
        siblings: "الإخوة",
        spouses: "الأزواج",
        milk: "إخوة الرضاعة",
        extended: "الأعمام والأخوال",
        females: "الإناث"
      }
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
      forPerson: "كقريب لـ",
      modeNew: "شخص جديد",
      modeExisting: "شخص موجود",
      pickExisting: "ابحث واختر…",
      pickExistingHint: "اختر شخصاً موجوداً مسبقاً لإنشاء الرابط فقط دون إضافة شخص جديد.",
      autoSpouseHint: "سيتم ربطه/ربطها تلقائياً مع الوالد/الوالدة الموجود (كزوج/زوجة) إن أمكن.",
      duplicateError: "هذه العلاقة موجودة بالفعل.",
      siblingsStepTitle: "أي من الإخوة أبناء/بنات لهذا الشخص أيضاً؟",
      siblingsStepHint: "اختر الإخوة الذين يشاركون نفس الوالد/الوالدة، وسيتم ربطهم تلقائياً.",
      skip: "تخطي",
      noSiblings: "لا يوجد إخوة معروفون.",
      placeholderFather: "إضافة أب",
      placeholderMother: "إضافة أم",
      placeholderSpouse: "إضافة زوج/ة",
      linkStep: {
        titleSiblings: "أي من الإخوة أبناء/بنات لهذا الشخص أيضاً؟",
        hintSiblings:  "اختر الإخوة الذين يشاركون نفس الوالد/الوالدة، وسيتم ربطهم تلقائياً.",
        emptySiblings: "لا يوجد إخوة معروفون.",
        titleChildren: "أي من الأبناء له/لها نفس الزوج/ة الجديد؟",
        hintChildren:  "اختر الأبناء الذين يتشاركون هذا الزوج/ة كوالد/والدة. سيتم ربطهم تلقائياً.",
        emptyChildren: "لا يوجد أبناء بدون والد/والدة محدد.",
        titleParents:  "أي من الوالدين هما والدا/والدتا الأخ الجديد؟",
        hintParents:   "اختر الوالدين المشتركين بينك وبين الأخ الجديد، وسيتم ربطه تلقائياً.",
        emptyParents:  "لا يوجد والدان معروفان.",
        titleSpouses:  "أي زوج/ة هو الوالد/ة الآخر/ة لهذا الابن/البنت؟",
        hintSpouses:   "اختر الزوج/ة التي هي الوالد/ة الآخر/ة للابن/البنت الجديد.",
        emptySpouses:  "لا يوجد أزواج معرّفون.",
        alsoSetMother: "إضافة الأم في نفس الوقت (اختياري):",
        alsoSetFather: "إضافة الأب في نفس الوقت (اختياري):"
      }
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
      mostConnected: "الأكثر اتصالاً",
      topName: "الاسم الأكثر شيوعاً",
      topDualName: "الاسم الثنائي الأكثر شيوعاً",
      largestFamily: "الأكثر إنجاباً",
      totalMale: "إجمالي الذكور",
      totalFemale: "إجمالي الإناث",
      deepestGen: "أحدث جيل",
      namesOnce: "أسماء بلا تكرار"
    },
    byGeneration: {
      title: "تفصيل الأجيال",
      gen: "الجيل",
      count: "العدد",
      males: "ذكور",
      females: "إناث",
      timeframe: "المرحلة الزمنية التقريبية",
      note: "تقدير تقريبي بافتراض ~25 سنة لكل جيل، مع أحدث جيل حوالي 2025م."
    },
    timesUsed: "مرة",
    children: "أبناء"
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
    close: "إغلاق",
    phone: "هاتف",
    email: "بريد إلكتروني",
    website: "موقع/حساب",
    contact: "تواصل"
  },
  editPerson: {
    title: "تحرير معلومات الشخص",
    sectionIdentity: "الهوية",
    sectionDates: "التواريخ والترتيب",
    sectionContact: "التواصل",
    sectionBio: "السيرة",
    sectionFamily: "العائلة",
    titleAr: "اللقب (عربي)",
    titleEn: "اللقب (إنجليزي)",
    gender: "النوع",
    male: "ذكر",
    female: "أنثى",
    status: "الحالة",
    statusLiving: "حي",
    statusDeceased: "متوفى",
    statusUnknown: "غير معروف",
    birthYear: "سنة الميلاد",
    deathYear: "سنة الوفاة",
    birthOrder: "ترتيب الميلاد",
    generation: "الجيل",
    photoUrl: "رابط الصورة",
    occupationAr: "المهنة (عربي)",
    occupationEn: "المهنة (إنجليزي)",
    bioAr: "السيرة (عربي)",
    bioEn: "السيرة (إنجليزي)",
    familyAr: "العائلة (عربي)",
    familyEn: "العائلة (إنجليزي)",
    save: "حفظ",
    cancel: "إلغاء",
    saving: "جارٍ الحفظ…",
    saveError: "فشل الحفظ"
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
  relate: {
    title: "اكتشف صلة القرابة",
    subtitle: "اختر شخصين وسنعرض أقصر سلسلة من العلاقات تربط بينهما.",
    person1: "الشخص الأول",
    person2: "الشخص الثاني",
    pickPerson: "ابحث واختر شخصاً…",
    pickAnother: "اختر شخصاً آخر",
    sameWarning: "الشخصان متطابقان.",
    noPath: "لا توجد صلة معروفة بين هذين الشخصين في البيانات الحالية.",
    pathFound: "تم إيجاد سلسلة بطول",
    steps: "خطوات",
    via: "عبر"
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
  nav: { home: "Home", about: "About", tree: "Tree", sources: "Sources", events: "Events", insights: "Insights", relate: "Relate" },
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
    redactedFemale: "(hidden)",
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
      clear: "Clear focus",
      filters: {
        title: "Show",
        parents: "Parents",
        children: "Children",
        siblings: "Siblings",
        spouses: "Spouses",
        milk: "Milk-siblings",
        extended: "Uncles & aunts",
        females: "Females"
      }
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
      forPerson: "as a relative of",
      modeNew: "New person",
      modeExisting: "Existing person",
      pickExisting: "Search and pick…",
      pickExistingHint: "Pick a person who's already in the tree — only the relationship is created.",
      autoSpouseHint: "Will be auto-linked with the existing parent (as spouse) if one exists.",
      duplicateError: "This relationship already exists.",
      siblingsStepTitle: "Which of these siblings are also children of this person?",
      siblingsStepHint: "Pick siblings who share the same parent — they'll be linked too.",
      skip: "Skip",
      noSiblings: "No known siblings.",
      placeholderFather: "Add father",
      placeholderMother: "Add mother",
      placeholderSpouse: "Add spouse",
      linkStep: {
        titleSiblings: "Which of these siblings are also children of this person?",
        hintSiblings:  "Pick siblings who share the same parent — they'll be linked too.",
        emptySiblings: "No known siblings.",
        titleChildren: "Which of these children are also children of this spouse?",
        hintChildren:  "Pick the children whose other parent is this new spouse. They'll be linked too.",
        emptyChildren: "No children without a known second parent.",
        titleParents:  "Which of these parents are also this sibling's parents?",
        hintParents:   "Pick the parents shared with the new sibling. They'll be linked too.",
        emptyParents:  "No known parents.",
        titleSpouses:  "Which spouse is this child's other parent?",
        hintSpouses:   "Pick the spouse who is the child's other parent.",
        emptySpouses:  "No known spouses.",
        alsoSetMother: "Also set the mother (optional):",
        alsoSetFather: "Also set the father (optional):"
      }
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
      mostConnected: "Most connected",
      topName: "Most common name",
      topDualName: "Most common dual name",
      largestFamily: "Largest family",
      totalMale: "Total males",
      totalFemale: "Total females",
      deepestGen: "Latest generation",
      namesOnce: "Unique names"
    },
    byGeneration: {
      title: "By generation",
      gen: "Gen",
      count: "Count",
      males: "Males",
      females: "Females",
      timeframe: "Approx. timeframe",
      note: "Rough estimate assuming ~25 years per generation, latest generation around 2025."
    },
    timesUsed: "× times",
    children: "children"
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
    close: "Close",
    phone: "Phone",
    email: "Email",
    website: "Website / social",
    contact: "Contact"
  },
  editPerson: {
    title: "Edit person",
    sectionIdentity: "Identity",
    sectionDates: "Dates & order",
    sectionContact: "Contact",
    sectionBio: "Biography",
    sectionFamily: "Family",
    titleAr: "Honorific (Arabic)",
    titleEn: "Honorific (English)",
    gender: "Gender",
    male: "Male",
    female: "Female",
    status: "Status",
    statusLiving: "Living",
    statusDeceased: "Deceased",
    statusUnknown: "Unknown",
    birthYear: "Birth year",
    deathYear: "Death year",
    birthOrder: "Birth order",
    generation: "Generation",
    photoUrl: "Photo URL",
    occupationAr: "Occupation (Arabic)",
    occupationEn: "Occupation (English)",
    bioAr: "Bio (Arabic)",
    bioEn: "Bio (English)",
    familyAr: "Family (Arabic)",
    familyEn: "Family (English)",
    save: "Save",
    cancel: "Cancel",
    saving: "Saving…",
    saveError: "Save failed"
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
  relate: {
    title: "Find the connection",
    subtitle: "Pick two people; we'll find the shortest chain of relationships between them.",
    person1: "First person",
    person2: "Second person",
    pickPerson: "Search and pick a person…",
    pickAnother: "Pick another person",
    sameWarning: "Same person on both sides.",
    noPath: "No known connection between these two in the current data.",
    pathFound: "Found a chain of length",
    steps: "steps",
    via: "via"
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

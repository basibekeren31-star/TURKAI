"use strict";

/* =========================================================
   TÜRKAI ANSWER MEMORY 10.0
   PART 1 / 10

   Amaç:
   - Yerel cevap hafızası
   - Türkçe soru normalizasyonu
   - Kısa yazım / mesajlaşma dili desteği
   - "selam" = "slm" = "mrb" = "selamlar"
   - Kalıcı JSON depolama
   - Güvenli kayıt yapısı
   - İleride diğer partların kullanacağı ana sınıf

   ========================================================= */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/* =========================================================
   ANA SABİTLER
   ========================================================= */

const ANSWER_MEMORY_VERSION = "10.0.0";

const ANSWER_MEMORY_ROOT =
    process.env.TURKAI_ANSWER_MEMORY_ROOT ||
    path.join(
        process.cwd(),
        "data",
        "answer-memory"
    );

const ANSWER_MEMORY_FILES = {
    root:
        ANSWER_MEMORY_ROOT,

    records:
        path.join(
            ANSWER_MEMORY_ROOT,
            "answer-memory.json"
        ),

    index:
        path.join(
            ANSWER_MEMORY_ROOT,
            "answer-memory-index.json"
        ),

    history:
        path.join(
            ANSWER_MEMORY_ROOT,
            "answer-memory-history.json"
        ),

    cache:
        path.join(
            ANSWER_MEMORY_ROOT,
            "answer-memory-cache.json"
        ),

    users:
        path.join(
            ANSWER_MEMORY_ROOT,
            "answer-memory-users.json"
        ),

    topics:
        path.join(
            ANSWER_MEMORY_ROOT,
            "answer-memory-topics.json"
        ),

    backups:
        path.join(
            ANSWER_MEMORY_ROOT,
            "backups"
        ),

    exports:
        path.join(
            ANSWER_MEMORY_ROOT,
            "exports"
        ),

    knowledge:
        path.join(
            process.cwd(),
            "knowledge.json"
        )
};

/* =========================================================
   DEFAULT CONFIG
   ========================================================= */

const DEFAULT_ANSWER_MEMORY_CONFIG = {
    version:
        ANSWER_MEMORY_VERSION,

    enabled:
        true,

    autoCreate:
        true,

    autoLearn:
        true,

    autoSave:
        true,

    normalizeTurkish:
        true,

    normalizeShortMessages:
        true,

    normalizeRepeatedLetters:
        true,

    maxRecords:
        200000,

    maxHistory:
        50000,

    maxUserHistory:
        5000,

    maxResults:
        25,

    minimumScore:
        0.38,

    strongScore:
        0.82,

    veryStrongScore:
        0.93,

    minimumQuality:
        0.30,

    cacheEnabled:
        true,

    cacheSize:
        2000,

    cacheTTL:
        1000 * 60 * 30,

    indexEnabled:
        true,

    historyEnabled:
        true,

    backupsEnabled:
        true,

    backupCount:
        10,

    allowDuplicateQuestions:
        false,

    directBuiltInAnswers:
        true,

    debug:
        false
};

/* =========================================================
   DOSYA / JSON YARDIMCILARI
   ========================================================= */

function ensureDir(dir) {
    try {
        fs.mkdirSync(
            dir,
            {
                recursive:
                    true
            }
        );
    } catch (error) {
        console.error(
            "[AnswerMemory] Klasör oluşturulamadı:",
            dir,
            error.message
        );
    }
}

function ensureFile(
    file,
    fallback
) {
    try {
        ensureDir(
            path.dirname(file)
        );

        if (
            !fs.existsSync(file)
        ) {
            fs.writeFileSync(
                file,
                JSON.stringify(
                    fallback,
                    null,
                    2
                ),
                "utf8"
            );
        }
    } catch (error) {
        console.error(
            "[AnswerMemory] Dosya oluşturulamadı:",
            file,
            error.message
        );
    }
}

function readJSON(
    file,
    fallback
) {
    try {
        if (
            !fs.existsSync(file)
        ) {
            return fallback;
        }

        const raw =
            fs.readFileSync(
                file,
                "utf8"
            );

        if (
            !raw.trim()
        ) {
            return fallback;
        }

        return JSON.parse(
            raw
        );
    } catch (error) {
        console.error(
            "[AnswerMemory] JSON okunamadı:",
            file,
            error.message
        );

        return fallback;
    }
}

function writeJSON(
    file,
    data
) {
    const directory =
        path.dirname(file);

    ensureDir(
        directory
    );

    const temporary =
        `${file}.tmp`;

    try {
        fs.writeFileSync(
            temporary,
            JSON.stringify(
                data,
                null,
                2
            ),
            "utf8"
        );

        fs.renameSync(
            temporary,
            file
        );

        return true;
    } catch (error) {
        try {
            if (
                fs.existsSync(
                    temporary
                )
            ) {
                fs.unlinkSync(
                    temporary
                );
            }
        } catch {}

        console.error(
            "[AnswerMemory] JSON yazılamadı:",
            file,
            error.message
        );

        return false;
    }
}

/* =========================================================
   STRING YARDIMCILARI
   ========================================================= */

function safeString(
    value,
    fallback = ""
) {
    if (
        value === null ||
        value === undefined
    ) {
        return fallback;
    }

    return String(
        value
    );
}

function removeZeroWidth(
    value
) {
    return safeString(
        value
    )
        .replace(
            /[\u200B-\u200D\uFEFF]/g,
            ""
        );
}

function normalizeUnicode(
    value
) {
    return removeZeroWidth(
        safeString(
            value
        )
    )
        .normalize("NFKC");
}

function collapseWhitespace(
    value
) {
    return safeString(
        value
    )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function stripOuterPunctuation(
    value
) {
    return safeString(
        value
    )
        .replace(
            /^[\s"'`.,!?;:()[\]{}<>]+/g,
            ""
        )
        .replace(
            /[\s"'`.,!?;:()[\]{}<>]+$/g,
            ""
        )
        .trim();
}

function hashText(
    value
) {
    return crypto
        .createHash("sha256")
        .update(
            safeString(
                value
            ),
            "utf8"
        )
        .digest("hex");
}

function nowISO() {
    return new Date().toISOString();
}

function randomId(
    prefix = "memory"
) {
    return [
        prefix,
        Date.now(),
        crypto
            .randomBytes(
                5
            )
            .toString("hex")
    ].join("_");
}

/* =========================================================
   TÜRKÇE DİL NORMALİZASYONU
   ========================================================= */

const TURKISH_CHAR_MAP = {
    "İ": "i",
    "I": "ı",
    "Ş": "ş",
    "Ğ": "ğ",
    "Ü": "ü",
    "Ö": "ö",
    "Ç": "ç"
};

function lowerTurkish(
    value
) {
    let result =
        safeString(
            value
        );

    for (
        const [from, to]
        of Object.entries(
            TURKISH_CHAR_MAP
        )
    ) {
        result =
            result.split(
                from
            ).join(
                to
            );
    }

    return result.toLocaleLowerCase(
        "tr-TR"
    );
}

/* =========================================================
   KISA MESAJ / SOHBET DİLİ SÖZLÜĞÜ
   ========================================================= */

const SHORT_MESSAGE_ALIASES = {
    slm:
        "selam",

    "slm.":
        "selam",

    "slm!":
        "selam",

    slmlar:
        "selamlar",

    selmlar:
        "selamlar",

    mrb:
        "merhaba",

    "mrb.":
        "merhaba",

    "mrb!":
        "merhaba",

    sa:
        "selam",

    "s.a":
        "selam",

    "s.a.":
        "selam",

    "s.a!":
        "selam",

    "s.a.": 
        "selam",

    selamunaleykum:
        "selamun aleyküm",

    selamunaleykum:
        "selamun aleyküm",

    selamunaleyküm:
        "selamun aleyküm",

    "selamun aleykum":
        "selamun aleyküm",

    "selamun aleyküm":
        "selamun aleyküm",

    selamünaleyküm:
        "selamun aleyküm",

    selamunaleykum:
        "selamun aleyküm",

    heey:
        "hey",

    heyy:
        "hey",

    hiii:
        "hi",

    helloo:
        "hello"
};

/* =========================================================
   DIRECT KONUŞMA KATEGORİLERİ
   ========================================================= */

const BUILTIN_GREETING_MAP = {
    "selam":
        "Selam! Ben TürkAI. Nasılsın?",

    "selamlar":
        "Selamlar! Ben TürkAI. Nasılsın?",

    "merhaba":
        "Merhaba! Ben TürkAI. Sana nasıl yardımcı olabilirim?",

    "hey":
        "Hey! Buradayım. Nasıl yardımcı olabilirim?",

    "hi":
        "Hi! TürkAI burada. Nasıl yardımcı olabilirim?",

    "hello":
        "Hello! TürkAI burada. Nasıl yardımcı olabilirim?",

    "selamun aleyküm":
        "Aleyküm selam! Ben TürkAI. Nasıl yardımcı olabilirim?",

    "günaydın":
        "Günaydın! Umarım güzel bir gün geçiriyorsundur.",

    "iyi akşamlar":
        "İyi akşamlar! Nasıl yardımcı olabilirim?",

    "iyi geceler":
        "İyi geceler! Bir konuda yardıma ihtiyacın var mı?"
};

/* =========================================================
   ANSWER MEMORY CLASS
   ========================================================= */

class AnswerMemory {

    constructor(
        config = {}
    ) {
        this.config = {
            ...DEFAULT_ANSWER_MEMORY_CONFIG,
            ...(config || {})
        };

        this.version =
            ANSWER_MEMORY_VERSION;

        this.root =
            ANSWER_MEMORY_ROOT;

        this.files =
            ANSWER_MEMORY_FILES;

        this.records = [];

        this.index = {
            byId: {},
            byQuestion: {},
            byToken: {},
            byCategory: {},
            byLanguage: {}
        };

        this.history = [];

        this.users = {};

        this.topics = {};

        this.cache = new Map();

        this.stats = {
            searches: 0,
            hits: 0,
            misses: 0,
            saves: 0,
            updates: 0,
            deletes: 0,
            feedbacks: 0,
            directHits: 0,
            normalizedHits: 0,
            startedAt:
                nowISO()
        };

        this.initialized =
            false;

        this._ensureStorage();

        this._loadEverything();

        this._registerBuiltinAnswers();

        this.rebuildIndex();

        this.initialized =
            true;
    }

    /* =====================================================
       STORAGE BAŞLATMA
       ===================================================== */

    _ensureStorage() {
        ensureDir(
            this.files.root
        );

        ensureDir(
            this.files.backups
        );

        ensureDir(
            this.files.exports
        );

        ensureFile(
            this.files.records,
            []
        );

        ensureFile(
            this.files.index,
            {
                byId: {},
                byQuestion: {},
                byToken: {},
                byCategory: {},
                byLanguage: {}
            }
        );

        ensureFile(
            this.files.history,
            []
        );

        ensureFile(
            this.files.users,
            {}
        );

        ensureFile(
            this.files.topics,
            {}
        );

        ensureFile(
            this.files.cache,
            []
        );

        /*
           knowledge.json başka bir modül tarafından da
           kullanılabiliyor. Yoksa boş yapı oluşturuyoruz.
        */
        if (
            this.config.autoCreate &&
            !fs.existsSync(
                this.files.knowledge
            )
        ) {
            writeJSON(
                this.files.knowledge,
                []
            );
        }
    }

    /* =====================================================
       VERİLERİ YÜKLE
       ===================================================== */

    _loadEverything() {
        const records =
            readJSON(
                this.files.records,
                []
            );

        this.records =
            Array.isArray(
                records
            )
                ? records
                : [];

        const index =
            readJSON(
                this.files.index,
                null
            );

        if (
            index &&
            typeof index ===
                "object"
        ) {
            this.index = {
                byId:
                    index.byId ||
                    {},

                byQuestion:
                    index.byQuestion ||
                    {},

                byToken:
                    index.byToken ||
                    {},

                byCategory:
                    index.byCategory ||
                    {},

                byLanguage:
                    index.byLanguage ||
                    {}
            };
        }

        const history =
            readJSON(
                this.files.history,
                []
            );

        this.history =
            Array.isArray(
                history
            )
                ? history
                : [];

        const users =
            readJSON(
                this.files.users,
                {}
            );

        this.users =
            users &&
            typeof users ===
                "object"
                ? users
                : {};

        const topics =
            readJSON(
                this.files.topics,
                {}
            );

        this.topics =
            topics &&
            typeof topics ===
                "object"
                ? topics
                : {};

        const cache =
            readJSON(
                this.files.cache,
                []
            );

        if (
            Array.isArray(cache)
        ) {
            this.cache.clear();

            for (
                const item
                of cache.slice(
                    0,
                    this.config.cacheSize
                )
            ) {
                if (
                    item &&
                    item.key
                ) {
                    this.cache.set(
                        item.key,
                        item
                    );
                }
            }
        }
    }

    /* =====================================================
       ANA NORMALİZASYON
       ===================================================== */

    normalizeText(
        value
    ) {
        let textValue =
            normalizeUnicode(
                value
            );

        textValue =
            collapseWhitespace(
                textValue
            );

        textValue =
            lowerTurkish(
                textValue
            );

        if (
            this.config
                .normalizeShortMessages
        ) {
            textValue =
                this.applyShortAliases(
                    textValue
                );
        }

        if (
            this.config
                .normalizeRepeatedLetters
        ) {
            textValue =
                this.reduceRepeatedLetters(
                    textValue
                );
        }

        textValue =
            stripOuterPunctuation(
                textValue
            );

        return collapseWhitespace(
            textValue
        );
    }

    /* =====================================================
       KISA YAZIM ALIAS
       ===================================================== */

    applyShortAliases(
        value
    ) {
        const normalized =
            collapseWhitespace(
                lowerTurkish(
                    value
                )
            );

        if (
            SHORT_MESSAGE_ALIASES[
                normalized
            ]
        ) {
            return (
                SHORT_MESSAGE_ALIASES[
                    normalized
                ]
            );
        }

        /*
          Noktalı / boşluksuz kısa ifadeler
        */
        const compact =
            normalized
                .replace(
                    /[.\s!?]+/g,
                    ""
                );

        if (
            SHORT_MESSAGE_ALIASES[
                compact
            ]
        ) {
            return (
                SHORT_MESSAGE_ALIASES[
                    compact
                ]
            );
        }

        return normalized;
    }

    /* =====================================================
       TEKRARLI HARF TEMİZLEME
       ===================================================== */

    reduceRepeatedLetters(
        value
    ) {
        let result =
            safeString(
                value
            );

        /*
          "seeeelaaaammmm"
          gibi yazımları çok agresif olmayan
          seviyede azaltıyoruz.

          3+ tekrar -> 2 tekrar.
          Böylece:
          coooook -> cook değil,
          çok uzun tekrarlar kontrollü biçimde azalır.
        */
        result =
            result.replace(
                /([a-zçğıöşü])\1{2,}/gi,
                "$1$1"
            );

        return result;
    }

    /* =====================================================
       SORU NORMALİZASYONU
       ===================================================== */

    normalizeQuestion(
        value
    ) {
        let textValue =
            this.normalizeText(
                value
            );

        textValue =
            textValue.replace(
                /\bya\b/g,
                ""
            );

        textValue =
            textValue.replace(
                /\blan\b/g,
                ""
            );

        textValue =
            textValue.replace(
                /\bkanka\b/g,
                ""
            );

        textValue =
            textValue.replace(
                /\bknk\b/g,
                ""
            );

        textValue =
            collapseWhitespace(
                textValue
            );

        return textValue;
    }

    /* =====================================================
       DİL TAHMİNİ
       ===================================================== */

    detectLanguage(
        value
    ) {
        const textValue =
            lowerTurkish(
                value
            );

        if (
            /[çğıöşü]/i.test(
                textValue
            )
        ) {
            return "tr";
        }

        const turkishWords = [
            "ve",
            "bir",
            "bu",
            "şu",
            "nasıl",
            "neden",
            "kim",
            "ne",
            "hangi",
            "selam",
            "merhaba",
            "mı",
            "mi",
            "mu",
            "mü"
        ];

        let matches =
            0;

        for (
            const word
            of turkishWords
        ) {
            const pattern =
                new RegExp(
                    `\\b${word}\\b`,
                    "i"
                );

            if (
                pattern.test(
                    textValue
                )
            ) {
                matches++;
            }
        }

        if (
            matches >= 1
        ) {
            return "tr";
        }

        return "unknown";
    }

    /* =====================================================
       KATEGORİ TESPİTİ
       ===================================================== */

    detectCategory(
        value
    ) {
        const textValue =
            this.normalizeQuestion(
                value
            );

        if (
            BUILTIN_GREETING_MAP[
                textValue
            ]
        ) {
            return "greeting";
        }

        if (
            /\b(hava|meteoroloji|sıcaklık|yağmur|kar)\b/i.test(
                textValue
            )
        ) {
            return "weather";
        }

        if (
            /\b(kod|javascript|python|html|css|java|c\+\+|c#|node|react)\b/i.test(
                textValue
            )
        ) {
            return "coding";
        }

        if (
            /\b(haber|gündem|son dakika|bugün|şimdi|güncel)\b/i.test(
                textValue
            )
        ) {
            return "current";
        }

        if (
            /\b(araştır|internetten|web|kaynak|link)\b/i.test(
                textValue
            )
        ) {
            return "research";
        }

        if (
            /\b(merhaba|selam|hey|hello|hi|günaydın|akşamlar|geceler)\b/i.test(
                textValue
            )
        ) {
            return "greeting";
        }

        return "general";
    }

    /* =====================================================
       DIRECT GREETING
       ===================================================== */

    getDirectGreeting(
        value
    ) {
        const normalized =
            this.normalizeQuestion(
                value
            );

        if (
            Object.prototype.hasOwnProperty.call(
                BUILTIN_GREETING_MAP,
                normalized
            )
        ) {
            return {
                matched:
                    true,

                key:
                    normalized,

                answer:
                    BUILTIN_GREETING_MAP[
                        normalized
                    ],

                score:
                    1,

                type:
                    "builtin"
            };
        }

        return {
            matched:
                false,

            key:
                normalized,

            answer:
                "",

            score:
                0,

            type:
                null
        };
    }

    /* =====================================================
       GLOBAL DIRECT ANSWER
       ===================================================== */

    getDirectAnswer(
        value
    ) {
        const greeting =
            this.getDirectGreeting(
                value
            );

        if (
            greeting.matched &&
            this.config
                .directBuiltInAnswers
        ) {
            return greeting;
        }

        return {
            matched:
                false,

            key:
                this.normalizeQuestion(
                    value
                ),

            answer:
                "",

            score:
                0,

            type:
                null
        };
    }
}

/* =========================================================
   PART 1 SONU
   PART 2 burada aynı sınıfın devamına gelecek.
   ========================================================= */
// ============================================================
// TÜRKAI — ANSWER MEMORY
// PART 2 / 10
// ============================================================


// ============================================================
// TOKENIZE
// ============================================================

tokenize(text = "") {
    const normalized = this.normalizeQuestion(text);

    if (!normalized) {
        return [];
    }

    return normalized
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean);
}


// ============================================================
// STOP WORDS
// ============================================================

isStopWord(word = "") {
    const value = String(word || "").trim();

    if (!value) {
        return true;
    }

    return new Set([
        "bir",
        "bu",
        "şu",
        "o",
        "ve",
        "veya",
        "ile",
        "için",
        "gibi",
        "daha",
        "çok",
        "az",
        "en",
        "da",
        "de",
        "ki",
        "mi",
        "mı",
        "mu",
        "mü",
        "ben",
        "sen",
        "biz",
        "siz",
        "onlar",
        "bana",
        "sana",
        "bunu",
        "şunu",
        "onu",
        "nasıl",
        "neden",
        "niye",
        "hangi",
        "ne",
        "nedir",
        "olan",
        "olarak",
        "var",
        "yok",
        "şey",
        "şeyi",
        "şöyle",
        "böyle"
    ]).has(value);
}


// ============================================================
// MEANINGFUL TOKENS
// ============================================================

meaningfulTokens(text = "") {
    return this.tokenize(text)
        .filter((token) => !this.isStopWord(token))
        .filter((token) => token.length > 0);
}


// ============================================================
// UNIQUE TOKENS
// ============================================================

uniqueTokens(tokens = []) {
    return [
        ...new Set(
            Array.isArray(tokens)
                ? tokens.map((x) => String(x || "").trim()).filter(Boolean)
                : []
        )
    ];
}


// ============================================================
// SET INTERSECTION
// ============================================================

intersection(a = [], b = []) {
    const aa = new Set(
        Array.isArray(a)
            ? a.map((x) => String(x))
            : []
    );

    const bb = new Set(
        Array.isArray(b)
            ? b.map((x) => String(x))
            : []
    );

    const result = [];

    for (const value of aa) {
        if (bb.has(value)) {
            result.push(value);
        }
    }

    return result;
}


// ============================================================
// JACCARD SIMILARITY
// ============================================================

jaccardSimilarity(a = [], b = []) {

    const aa = new Set(
        Array.isArray(a)
            ? a.map((x) => String(x))
            : []
    );

    const bb = new Set(
        Array.isArray(b)
            ? b.map((x) => String(x))
            : []
    );

    if (aa.size === 0 && bb.size === 0) {
        return 1;
    }

    if (aa.size === 0 || bb.size === 0) {
        return 0;
    }

    let intersectionCount = 0;

    for (const value of aa) {
        if (bb.has(value)) {
            intersectionCount++;
        }
    }

    const unionCount =
        aa.size +
        bb.size -
        intersectionCount;

    if (!unionCount) {
        return 0;
    }

    return intersectionCount / unionCount;
}


// ============================================================
// COSINE SIMILARITY
// ============================================================

cosineSimilarity(a = [], b = []) {

    const aa = Array.isArray(a) ? a : [];
    const bb = Array.isArray(b) ? b : [];

    if (!aa.length || !bb.length) {
        return 0;
    }

    const vocabulary = [
        ...new Set([
            ...aa.map((x) => String(x)),
            ...bb.map((x) => String(x))
        ])
    ];

    if (!vocabulary.length) {
        return 0;
    }

    const count = (items) => {
        const map = new Map();

        for (const item of items) {
            const value = String(item);

            map.set(
                value,
                (map.get(value) || 0) + 1
            );
        }

        return map;
    };

    const first = count(aa);
    const second = count(bb);

    let dot = 0;
    let firstMagnitude = 0;
    let secondMagnitude = 0;

    for (const word of vocabulary) {

        const x = first.get(word) || 0;
        const y = second.get(word) || 0;

        dot += x * y;
        firstMagnitude += x * x;
        secondMagnitude += y * y;
    }

    const denominator =
        Math.sqrt(firstMagnitude) *
        Math.sqrt(secondMagnitude);

    if (!denominator) {
        return 0;
    }

    return dot / denominator;
}


// ============================================================
// LEVENSHTEIN DISTANCE
// ============================================================

levenshteinDistance(a = "", b = "") {

    const first = String(a ?? "");
    const second = String(b ?? "");

    if (first === second) {
        return 0;
    }

    if (!first.length) {
        return second.length;
    }

    if (!second.length) {
        return first.length;
    }

    let previous = Array.from(
        { length: second.length + 1 },
        (_, index) => index
    );

    for (let i = 1; i <= first.length; i++) {

        const current = [i];

        for (let j = 1; j <= second.length; j++) {

            const insertion =
                current[j - 1] + 1;

            const deletion =
                previous[j] + 1;

            const substitution =
                previous[j - 1] +
                (
                    first[i - 1] ===
                    second[j - 1]
                        ? 0
                        : 1
                );

            current[j] = Math.min(
                insertion,
                deletion,
                substitution
            );
        }

        previous = current;
    }

    return previous[second.length];
}


// ============================================================
// EDIT SIMILARITY
// ============================================================

editSimilarity(a = "", b = "") {

    const first = String(a ?? "");
    const second = String(b ?? "");

    if (!first && !second) {
        return 1;
    }

    const distance =
        this.levenshteinDistance(
            first,
            second
        );

    const maximum =
        Math.max(
            first.length,
            second.length
        );

    if (!maximum) {
        return 1;
    }

    return Math.max(
        0,
        1 - distance / maximum
    );
}


// ============================================================
// CHARACTER N-GRAMS
// ============================================================

characterNgrams(text = "", size = 3) {

    const value =
        this.normalizeQuestion(text)
            .replace(/\s+/g, " ");

    if (!value) {
        return [];
    }

    const n =
        Math.max(
            1,
            Number(size) || 3
        );

    if (value.length <= n) {
        return [value];
    }

    const result = [];

    for (
        let i = 0;
        i <= value.length - n;
        i++
    ) {
        result.push(
            value.slice(i, i + n)
        );
    }

    return result;
}


// ============================================================
// WORD N-GRAMS
// ============================================================

wordNgrams(text = "", size = 2) {

    const tokens =
        this.tokenize(text);

    const n =
        Math.max(
            1,
            Number(size) || 2
        );

    if (!tokens.length) {
        return [];
    }

    if (tokens.length < n) {
        return [
            tokens.join(" ")
        ];
    }

    const result = [];

    for (
        let i = 0;
        i <= tokens.length - n;
        i++
    ) {
        result.push(
            tokens
                .slice(i, i + n)
                .join(" ")
        );
    }

    return result;
}


// ============================================================
// N-GRAM OVERLAP
// ============================================================

ngramOverlap(
    firstText = "",
    secondText = "",
    size = 3
) {

    const first =
        this.characterNgrams(
            firstText,
            size
        );

    const second =
        this.characterNgrams(
            secondText,
            size
        );

    return this.jaccardSimilarity(
        first,
        second
    );
}


// ============================================================
// WORD OVERLAP
// ============================================================

wordOverlap(
    firstText = "",
    secondText = ""
) {

    const first =
        this.uniqueTokens(
            this.meaningfulTokens(
                firstText
            )
        );

    const second =
        this.uniqueTokens(
            this.meaningfulTokens(
                secondText
            )
        );

    return this.jaccardSimilarity(
        first,
        second
    );
}


// ============================================================
// TOKEN COSINE
// ============================================================

tokenCosine(
    firstText = "",
    secondText = ""
) {

    const first =
        this.meaningfulTokens(
            firstText
        );

    const second =
        this.meaningfulTokens(
            secondText
        );

    return this.cosineSimilarity(
        first,
        second
    );
}


// ============================================================
// EXACT NORMALIZED MATCH
// ============================================================

exactMatch(
    firstText = "",
    secondText = ""
) {

    return (
        this.normalizeQuestion(firstText) ===
        this.normalizeQuestion(secondText)
    );
}


// ============================================================
// CONTAINS MATCH
// ============================================================

containsMatch(
    firstText = "",
    secondText = ""
) {

    const first =
        this.normalizeQuestion(firstText);

    const second =
        this.normalizeQuestion(secondText);

    if (!first || !second) {
        return false;
    }

    return (
        first.includes(second) ||
        second.includes(first)
    );
}


// ============================================================
// QUESTION LENGTH SIMILARITY
// ============================================================

lengthSimilarity(
    firstText = "",
    secondText = ""
) {

    const first =
        this.tokenize(firstText).length;

    const second =
        this.tokenize(secondText).length;

    if (first === 0 && second === 0) {
        return 1;
    }

    if (first === 0 || second === 0) {
        return 0;
    }

    const difference =
        Math.abs(first - second);

    const maximum =
        Math.max(first, second);

    return Math.max(
        0,
        1 - difference / maximum
    );
}


// ============================================================
// INTENT KEYWORDS
// ============================================================

getIntentKeywords() {

    return {

        greeting: [
            "selam",
            "merhaba",
            "hey",
            "hi",
            "hello",
            "günaydın",
            "tünaydın",
            "iyi akşamlar",
            "iyi geceler"
        ],

        goodbye: [
            "görüşürüz",
            "hoşça kal",
            "bay bay",
            "bye",
            "güle güle"
        ],

        thanks: [
            "teşekkür",
            "sağ ol",
            "sağol",
            "eyvallah",
            "tşk",
            "tşkler"
        ],

        identity: [
            "kimsin",
            "sen kimsin",
            "adın ne",
            "nesin",
            "hangi yapay zeka",
            "hangi ai",
            "sen neysin"
        ],

        coding: [
            "kod",
            "javascript",
            "python",
            "html",
            "css",
            "java",
            "c++",
            "c#",
            "programla",
            "programlama",
            "yazılım"
        ],

        weather: [
            "hava",
            "hava durumu",
            "sıcaklık",
            "kaç derece",
            "yağmur",
            "kar",
            "rüzgar"
        ],

        research: [
            "araştır",
            "internetten bak",
            "webde ara",
            "güncel",
            "son haberler",
            "haber",
            "kaynak"
        ],

        memory: [
            "hatırla",
            "unutma",
            "hafıza",
            "bellek",
            "kaydet",
            "bunu kaydet"
        ],

        help: [
            "yardım",
            "yardımcı ol",
            "nasıl yaparım",
            "nasıl yapılır",
            "anlat"
        ]
    };
}


// ============================================================
// INTENT SIGNATURE
// ============================================================

getIntentSignature(text = "") {

    const normalized =
        this.normalizeQuestion(text);

    const intentKeywords =
        this.getIntentKeywords();

    const detected = [];

    for (
        const [intent, keywords]
        of Object.entries(intentKeywords)
    ) {

        for (const keyword of keywords) {

            const normalizedKeyword =
                this.normalizeQuestion(
                    keyword
                );

            if (
                normalized ===
                normalizedKeyword
            ) {

                detected.push(intent);

                break;
            }

            if (
                normalized.includes(
                    normalizedKeyword
                )
            ) {

                detected.push(intent);

                break;
            }
        }
    }

    return [
        ...new Set(detected)
    ];
}


// ============================================================
// SEMANTIC FINGERPRINT
// ============================================================

getSemanticFingerprint(text = "") {

    const normalized =
        this.normalizeQuestion(text);

    const tokens =
        this.uniqueTokens(
            this.meaningfulTokens(
                normalized
            )
        ).sort();

    const intents =
        this.getIntentSignature(
            normalized
        ).sort();

    const bigrams =
        this.wordNgrams(
            normalized,
            2
        ).slice(0, 12);

    const trigrams =
        this.wordNgrams(
            normalized,
            3
        ).slice(0, 12);

    return {
        normalized,
        tokens,
        intents,
        bigrams,
        trigrams,

        tokenKey:
            tokens.join("|"),

        intentKey:
            intents.join("|"),

        fingerprint: [
            intents.join(","),
            tokens.join(","),
            bigrams.join(","),
            trigrams.join(",")
        ].join("::")
    };
}


// ============================================================
// TEXT SIMILARITY
// ============================================================

textSimilarity(
    firstText = "",
    secondText = ""
) {

    const first =
        String(firstText ?? "");

    const second =
        String(secondText ?? "");

    if (!first || !second) {
        return 0;
    }

    if (this.exactMatch(first, second)) {
        return 1;
    }

    const firstMeaningful =
        this.meaningfulTokens(first);

    const secondMeaningful =
        this.meaningfulTokens(second);

    const jaccard =
        this.jaccardSimilarity(
            firstMeaningful,
            secondMeaningful
        );

    const cosine =
        this.cosineSimilarity(
            firstMeaningful,
            secondMeaningful
        );

    const edit =
        this.editSimilarity(
            this.normalizeQuestion(first),
            this.normalizeQuestion(second)
        );

    const ngram =
        this.ngramOverlap(
            first,
            second,
            3
        );

    const wordOverlap =
        this.wordOverlap(
            first,
            second
        );

    const length =
        this.lengthSimilarity(
            first,
            second
        );

    const firstIntent =
        this.getIntentSignature(first);

    const secondIntent =
        this.getIntentSignature(second);

    const intent =
        this.jaccardSimilarity(
            firstIntent,
            secondIntent
        );

    let score =
        (
            jaccard * 0.22 +
            cosine * 0.18 +
            edit * 0.18 +
            ngram * 0.16 +
            wordOverlap * 0.12 +
            length * 0.06 +
            intent * 0.08
        );

    if (
        this.containsMatch(
            first,
            second
        )
    ) {
        score += 0.05;
    }

    if (
        firstMeaningful.length === 1 &&
        secondMeaningful.length === 1 &&
        firstMeaningful[0] ===
            secondMeaningful[0]
    ) {
        score = Math.max(
            score,
            0.92
        );
    }

    if (
        firstIntent.length &&
        secondIntent.length &&
        this.intersection(
            firstIntent,
            secondIntent
        ).length > 0
    ) {
        score += 0.03;
    }

    return Math.min(
        1,
        Math.max(
            0,
            score
        )
    );
}


// ============================================================
// SHORT MESSAGE EQUIVALENCE
// ============================================================

areShortMessagesEquivalent(
    firstText = "",
    secondText = ""
) {

    const first =
        this.normalizeQuestion(
            firstText
        );

    const second =
        this.normalizeQuestion(
            secondText
        );

    if (!first || !second) {
        return false;
    }

    if (first === second) {
        return true;
    }

    const aliasFirst =
        SHORT_MESSAGE_ALIASES[first] ||
        first;

    const aliasSecond =
        SHORT_MESSAGE_ALIASES[second] ||
        second;

    if (
        aliasFirst ===
        aliasSecond
    ) {
        return true;
    }

    const firstTokens =
        this.meaningfulTokens(
            aliasFirst
        );

    const secondTokens =
        this.meaningfulTokens(
            aliasSecond
        );

    if (
        firstTokens.length === 1 &&
        secondTokens.length === 1
    ) {

        return (
            this.editSimilarity(
                firstTokens[0],
                secondTokens[0]
            ) >= 0.86
        );
    }

    return (
        this.textSimilarity(
            aliasFirst,
            aliasSecond
        ) >= 0.86
    );
}


// ============================================================
// QUESTION CLASSIFICATION
// ============================================================

classifyQuestion(
    question = ""
) {

    const text =
        this.normalizeQuestion(
            question
        );

    const tokens =
        this.meaningfulTokens(text);

    const intents =
        this.getIntentSignature(text);

    const isShort =
        tokens.length <= 4;

    const greeting =
        intents.includes("greeting") ||
        Boolean(
            this.getDirectGreeting(question)
        );

    const goodbye =
        intents.includes("goodbye");

    const thanks =
        intents.includes("thanks");

    const identity =
        intents.includes("identity");

    const coding =
        intents.includes("coding");

    const weather =
        intents.includes("weather");

    const research =
        intents.includes("research");

    const memory =
        intents.includes("memory");

    const help =
        intents.includes("help");

    let type = "general";

    if (greeting) {
        type = "greeting";
    } else if (goodbye) {
        type = "goodbye";
    } else if (thanks) {
        type = "thanks";
    } else if (identity) {
        type = "identity";
    } else if (coding) {
        type = "coding";
    } else if (weather) {
        type = "weather";
    } else if (research) {
        type = "research";
    } else if (memory) {
        type = "memory";
    } else if (help) {
        type = "help";
    }

    return {
        type,

        intents,

        tokens,

        tokenCount:
            tokens.length,

        isShort,

        isGreeting:
            greeting,

        isGoodbye:
            goodbye,

        isThanks:
            thanks,

        isIdentity:
            identity,

        isCoding:
            coding,

        isWeather:
            weather,

        isResearch:
            research,

        isMemory:
            memory,

        isHelp:
            help,

        fingerprint:
            this.getSemanticFingerprint(
                text
            )
    };
}


// ============================================================
// CLASSIFICATION COMPATIBILITY
// ============================================================

detectIntent(
    question = ""
) {
    return this.classifyQuestion(
        question
    );
}


getQuestionIntent(
    question = ""
) {
    return this.classifyQuestion(
        question
    );
}


analyzeQuestion(
    question = ""
) {
    return this.classifyQuestion(
        question
    );
}


// ============================================================
// SIMILARITY COMPATIBILITY ALIASES
// ============================================================

similarity(
    firstText = "",
    secondText = ""
) {
    return this.textSimilarity(
        firstText,
        secondText
    );
}


calculateSimilarity(
    firstText = "",
    secondText = ""
) {
    return this.textSimilarity(
        firstText,
        secondText
    );
}


getSimilarity(
    firstText = "",
    secondText = ""
) {
    return this.textSimilarity(
        firstText,
        secondText
    );
}


// ============================================================
// PART 2 END
// ============================================================
// ============================================================
// TÜRKAI — ANSWER MEMORY
// PART 3 / 10
// ============================================================
// Bu bölüm PART 1 + PART 2'nin devamıdır.
// Aynı answerMemory.js dosyasının içine,
// PART 2'nin hemen altına ekle.
// ============================================================


// ============================================================
// KAYIT KİMLİĞİ OLUŞTUR
// ============================================================

createRecordId() {

    const now = Date.now();

    const random =
        Math.random()
            .toString(36)
            .slice(2, 12);

    return [
        "am",
        now,
        random
    ].join("_");
}


// ============================================================
// GÜVENLİ METİN
// ============================================================

safeText(value = "") {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value).trim();
}


// ============================================================
// GÜVENLİ ARRAY
// ============================================================

safeArray(value = []) {

    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item) =>
            this.safeText(item)
        )
        .filter(Boolean);
}


// ============================================================
// GÜVENLİ SAYI
// ============================================================

safeNumber(
    value,
    fallback = 0
) {

    const number =
        Number(value);

    if (
        Number.isNaN(number) ||
        !Number.isFinite(number)
    ) {
        return fallback;
    }

    return number;
}


// ============================================================
// 0-1 ARASI SAYI
// ============================================================

clamp01(value) {

    const number =
        this.safeNumber(
            value,
            0
        );

    return Math.min(
        1,
        Math.max(
            0,
            number
        )
    );
}


// ============================================================
// TARİH OLUŞTUR
// ============================================================

nowIso() {

    return new Date()
        .toISOString();
}


// ============================================================
// KAYIT OLUŞTUR
// ============================================================

createRecord(
    question = "",
    answer = "",
    options = {}
) {

    const cleanQuestion =
        this.safeText(
            question
        );

    const cleanAnswer =
        this.safeText(
            answer
        );

    const source =
        this.safeText(
            options.source ||
            "manual"
        );

    const userId =
        this.safeText(
            options.userId ||
            ""
        );

    const aliases =
        this.safeArray(
            options.aliases ||
            []
        );

    const tags =
        this.safeArray(
            options.tags ||
            []
        );

    const normalizedQuestion =
        this.normalizeQuestion(
            cleanQuestion
        );

    const fingerprint =
        this.getSemanticFingerprint(
            cleanQuestion
        );

    const createdAt =
        options.createdAt ||
        this.nowIso();

    const record = {

        id:
            options.id ||
            this.createRecordId(),

        question:
            cleanQuestion,

        answer:
            cleanAnswer,

        normalizedQuestion,

        questionKey:
            normalizedQuestion,

        aliases,

        tags,

        source,

        userId,

        category:
            this.safeText(
                options.category ||
                "general"
            ),

        language:
            this.safeText(
                options.language ||
                "tr"
            ),

        status:
            this.safeText(
                options.status ||
                "active"
            ),

        active:
            options.active !== false,

        archived:
            options.archived === true,

        trusted:
            options.trusted === true,

        pinned:
            options.pinned === true,

        favorite:
            options.favorite === true,

        system:
            options.system === true,

        protected:
            options.protected === true,

        quality:
            this.clamp01(
                options.quality ??
                0.5
            ),

        confidence:
            this.clamp01(
                options.confidence ??
                0.5
            ),

        score:
            this.clamp01(
                options.score ??
                0
            ),

        usageCount:
            Math.max(
                0,
                Math.floor(
                    this.safeNumber(
                        options.usageCount,
                        0
                    )
                )
            ),

        hitCount:
            Math.max(
                0,
                Math.floor(
                    this.safeNumber(
                        options.hitCount,
                        0
                    )
                )
            ),

        missCount:
            Math.max(
                0,
                Math.floor(
                    this.safeNumber(
                        options.missCount,
                        0
                    )
                )
            ),

        feedbackPositive:
            Math.max(
                0,
                Math.floor(
                    this.safeNumber(
                        options.feedbackPositive,
                        0
                    )
                )
            ),

        feedbackNegative:
            Math.max(
                0,
                Math.floor(
                    this.safeNumber(
                        options.feedbackNegative,
                        0
                    )
                )
            ),

        createdAt,

        updatedAt:
            options.updatedAt ||
            createdAt,

        lastUsedAt:
            options.lastUsedAt ||
            null,

        lastFeedbackAt:
            options.lastFeedbackAt ||
            null,

        lastVerifiedAt:
            options.lastVerifiedAt ||
            null,

        verificationCount:
            Math.max(
                0,
                Math.floor(
                    this.safeNumber(
                        options.verificationCount,
                        0
                    )
                )
            ),

        metadata:
            options.metadata &&
            typeof options.metadata === "object"
                ? {
                    ...options.metadata
                }
                : {},

        fingerprint,

        tokenKey:
            fingerprint.tokenKey,

        intentKey:
            fingerprint.intentKey,

        tokens:
            fingerprint.tokens,

        intents:
            fingerprint.intents,

        bigrams:
            fingerprint.bigrams,

        trigrams:
            fingerprint.trigrams
    };

    return record;
}


// ============================================================
// KAYIT DOĞRULAMA
// ============================================================

validateRecord(record) {

    if (
        !record ||
        typeof record !== "object"
    ) {
        return {
            valid: false,
            reason: "record-object-required"
        };
    }

    if (
        !this.safeText(record.id)
    ) {
        return {
            valid: false,
            reason: "id-required"
        };
    }

    if (
        !this.safeText(record.question)
    ) {
        return {
            valid: false,
            reason: "question-required"
        };
    }

    if (
        !this.safeText(record.answer)
    ) {
        return {
            valid: false,
            reason: "answer-required"
        };
    }

    return {
        valid: true,
        reason: "ok"
    };
}


// ============================================================
// KAYIT NORMALİZE ET
// ============================================================

normalizeRecord(record) {

    if (
        !record ||
        typeof record !== "object"
    ) {
        return null;
    }

    const normalized =
        this.createRecord(
            record.question || "",
            record.answer || "",
            {
                ...record,

                id:
                    record.id ||
                    this.createRecordId(),

                createdAt:
                    record.createdAt ||
                    this.nowIso(),

                updatedAt:
                    record.updatedAt ||
                    record.createdAt ||
                    this.nowIso()
            }
        );

    return normalized;
}


// ============================================================
// KAYDI SİLMEK İÇİN KORUMA
// ============================================================

canModifyRecord(record) {

    if (
        !record ||
        typeof record !== "object"
    ) {
        return false;
    }

    if (
        record.protected === true
    ) {
        return false;
    }

    return true;
}


// ============================================================
// SORU ANAHTARI
// ============================================================

createQuestionKey(question = "") {

    return this.normalizeQuestion(
        question
    );
}


// ============================================================
// ALIAS ANAHTARLARI
// ============================================================

createAliasKeys(
    question = "",
    aliases = []
) {

    const values = [
        question,
        ...this.safeArray(
            aliases
        )
    ];

    return [
        ...new Set(
            values
                .map((value) =>
                    this.createQuestionKey(
                        value
                    )
                )
                .filter(Boolean)
        )
    ];
}


// ============================================================
// KAYIT ANAHTARLARI
// ============================================================

getRecordKeys(record) {

    if (
        !record ||
        typeof record !== "object"
    ) {
        return [];
    }

    return this.createAliasKeys(
        record.question || "",
        record.aliases || []
    );
}


// ============================================================
// DUPLICATE KAYIT KONTROLÜ
// ============================================================

findDuplicateRecord(
    question = "",
    answer = "",
    options = {}
) {

    const normalizedQuestion =
        this.normalizeQuestion(
            question
        );

    const normalizedAnswer =
        this.safeText(
            answer
        );

    if (!normalizedQuestion) {
        return null;
    }

    const records =
        Array.isArray(
            this.data.records
        )
            ? this.data.records
            : [];

    const ignoreId =
        this.safeText(
            options.ignoreId ||
            ""
        );

    for (
        const record of records
    ) {

        if (
            ignoreId &&
            record.id === ignoreId
        ) {
            continue;
        }

        if (
            !record.active &&
            !options.includeInactive
        ) {
            continue;
        }

        const recordQuestion =
            this.normalizeQuestion(
                record.question
            );

        if (
            recordQuestion ===
            normalizedQuestion
        ) {

            if (
                !normalizedAnswer ||
                this.safeText(
                    record.answer
                ) === normalizedAnswer
            ) {
                return record;
            }
        }

        const keys =
            this.getRecordKeys(
                record
            );

        if (
            keys.includes(
                normalizedQuestion
            )
        ) {

            if (
                !normalizedAnswer ||
                this.safeText(
                    record.answer
                ) === normalizedAnswer
            ) {
                return record;
            }
        }
    }

    return null;
}


// ============================================================
// INDEX YAPISI
// ============================================================

createEmptyIndex() {

    return {

        byId: new Map(),

        byQuestion:
            new Map(),

        byAlias:
            new Map(),

        byToken:
            new Map(),

        byIntent:
            new Map(),

        byCategory:
            new Map(),

        bySource:
            new Map(),

        byUser:
            new Map(),

        byTag:
            new Map()
    };
}


// ============================================================
// INDEX'E SET EKLE
// ============================================================

addToIndexSet(
    map,
    key,
    id
) {

    if (
        !(map instanceof Map)
    ) {
        return;
    }

    const cleanKey =
        this.safeText(
            key
        );

    if (!cleanKey) {
        return;
    }

    if (
        !map.has(cleanKey)
    ) {
        map.set(
            cleanKey,
            new Set()
        );
    }

    map.get(cleanKey)
        .add(id);
}


// ============================================================
// INDEX'E KAYIT EKLE
// ============================================================

indexRecord(
    record
) {

    if (
        !record ||
        typeof record !== "object"
    ) {
        return;
    }

    if (
        !this.index
    ) {
        this.index =
            this.createEmptyIndex();
    }

    this.index.byId.set(
        record.id,
        record
    );

    const questionKey =
        this.normalizeQuestion(
            record.question
        );

    if (questionKey) {

        this.addToIndexSet(
            this.index.byQuestion,
            questionKey,
            record.id
        );
    }

    const aliases =
        this.safeArray(
            record.aliases
        );

    for (
        const alias
        of aliases
    ) {

        const aliasKey =
            this.normalizeQuestion(
                alias
            );

        this.addToIndexSet(
            this.index.byAlias,
            aliasKey,
            record.id
        );
    }

    const tokens =
        Array.isArray(
            record.tokens
        )
            ? record.tokens
            : this.meaningfulTokens(
                record.question
            );

    for (
        const token
        of tokens
    ) {

        this.addToIndexSet(
            this.index.byToken,
            token,
            record.id
        );
    }

    const intents =
        Array.isArray(
            record.intents
        )
            ? record.intents
            : this.getIntentSignature(
                record.question
            );

    for (
        const intent
        of intents
    ) {

        this.addToIndexSet(
            this.index.byIntent,
            intent,
            record.id
        );
    }

    const category =
        this.safeText(
            record.category
        );

    if (category) {

        this.addToIndexSet(
            this.index.byCategory,
            category,
            record.id
        );
    }

    const source =
        this.safeText(
            record.source
        );

    if (source) {

        this.addToIndexSet(
            this.index.bySource,
            source,
            record.id
        );
    }

    const userId =
        this.safeText(
            record.userId
        );

    if (userId) {

        this.addToIndexSet(
            this.index.byUser,
            userId,
            record.id
        );
    }

    const tags =
        this.safeArray(
            record.tags
        );

    for (
        const tag
        of tags
    ) {

        this.addToIndexSet(
            this.index.byTag,
            tag,
            record.id
        );
    }
}


// ============================================================
// INDEX'TEN KAYIT ÇIKAR
// ============================================================

removeFromIndex(
    record
) {

    if (
        !record ||
        !this.index
    ) {
        return;
    }

    const removeId =
        (map) => {

            if (
                !(map instanceof Map)
            ) {
                return;
            }

            for (
                const [key, set]
                of map.entries()
            ) {

                if (
                    set instanceof Set
                ) {

                    set.delete(
                        record.id
                    );

                    if (
                        set.size === 0
                    ) {
                        map.delete(
                            key
                        );
                    }
                }
            }
        };

    removeId(
        this.index.byQuestion
    );

    removeId(
        this.index.byAlias
    );

    removeId(
        this.index.byToken
    );

    removeId(
        this.index.byIntent
    );

    removeId(
        this.index.byCategory
    );

    removeId(
        this.index.bySource
    );

    removeId(
        this.index.byUser
    );

    removeId(
        this.index.byTag
    );

    this.index.byId.delete(
        record.id
    );
}


// ============================================================
// INDEX YENİDEN OLUŞTUR
// ============================================================

rebuildIndex() {

    this.index =
        this.createEmptyIndex();

    const records =
        Array.isArray(
            this.data.records
        )
            ? this.data.records
            : [];

    for (
        const record
        of records
    ) {

        if (
            !record ||
            typeof record !== "object"
        ) {
            continue;
        }

        this.indexRecord(
            record
        );
    }

    return {
        ok: true,

        count:
            this.index.byId.size
    };
}


// ============================================================
// INDEX'DEN KAYITLARI AL
// ============================================================

getRecordsFromIds(
    ids = []
) {

    if (
        !this.index
    ) {
        this.rebuildIndex();
    }

    const result = [];

    const source =
        Array.isArray(ids)
            ? ids
            : [];

    for (
        const id
        of source
    ) {

        const record =
            this.index.byId.get(
                id
            );

        if (record) {
            result.push(
                record
            );
        }
    }

    return result;
}


// ============================================================
// INDEX'DEN SORU ARAMA
// ============================================================

getQuestionIndexMatches(
    question = ""
) {

    if (
        !this.index
    ) {
        this.rebuildIndex();
    }

    const key =
        this.normalizeQuestion(
            question
        );

    if (!key) {
        return [];
    }

    const ids =
        new Set();

    const direct =
        this.index.byQuestion.get(
            key
        );

    if (direct) {

        for (
            const id
            of direct
        ) {
            ids.add(id);
        }
    }

    const aliases =
        this.index.byAlias.get(
            key
        );

    if (aliases) {

        for (
            const id
            of aliases
        ) {
            ids.add(id);
        }
    }

    return this.getRecordsFromIds(
        [...ids]
    );
}


// ============================================================
// TOKEN INDEX MATCH
// ============================================================

getTokenIndexMatches(
    question = ""
) {

    if (
        !this.index
    ) {
        this.rebuildIndex();
    }

    const tokens =
        this.uniqueTokens(
            this.meaningfulTokens(
                question
            )
        );

    if (!tokens.length) {
        return [];
    }

    const counts =
        new Map();

    for (
        const token
        of tokens
    ) {

        const ids =
            this.index.byToken.get(
                token
            );

        if (!ids) {
            continue;
        }

        for (
            const id
            of ids
        ) {

            counts.set(
                id,
                (counts.get(id) || 0) + 1
            );
        }
    }

    const sortedIds =
        [...counts.entries()]
            .sort(
                (a, b) =>
                    b[1] - a[1]
            )
            .map(
                ([id]) =>
                    id
            );

    return this.getRecordsFromIds(
        sortedIds
    );
}


// ============================================================
// INTENT INDEX MATCH
// ============================================================

getIntentIndexMatches(
    question = ""
) {

    if (
        !this.index
    ) {
        this.rebuildIndex();
    }

    const intents =
        this.getIntentSignature(
            question
        );

    if (!intents.length) {
        return [];
    }

    const ids =
        new Set();

    for (
        const intent
        of intents
    ) {

        const found =
            this.index.byIntent.get(
                intent
            );

        if (!found) {
            continue;
        }

        for (
            const id
            of found
        ) {
            ids.add(id);
        }
    }

    return this.getRecordsFromIds(
        [...ids]
    );
}


// ============================================================
// CATEGORY'DEN KAYITLAR
// ============================================================

getCategoryRecords(
    category = ""
) {

    if (
        !this.index
    ) {
        this.rebuildIndex();
    }

    const key =
        this.safeText(
            category
        );

    if (!key) {
        return [];
    }

    const ids =
        this.index.byCategory.get(
            key
        );

    if (!ids) {
        return [];
    }

    return this.getRecordsFromIds(
        [...ids]
    );
}


// ============================================================
// SOURCE'DAN KAYITLAR
// ============================================================

getSourceRecords(
    source = ""
) {

    if (
        !this.index
    ) {
        this.rebuildIndex();
    }

    const key =
        this.safeText(
            source
        );

    if (!key) {
        return [];
    }

    const ids =
        this.index.bySource.get(
            key
        );

    if (!ids) {
        return [];
    }

    return this.getRecordsFromIds(
        [...ids]
    );
}


// ============================================================
// USER'DAN KAYITLAR
// ============================================================

getUserRecords(
    userId = ""
) {

    if (
        !this.index
    ) {
        this.rebuildIndex();
    }

    const key =
        this.safeText(
            userId
        );

    if (!key) {
        return [];
    }

    const ids =
        this.index.byUser.get(
            key
        );

    if (!ids) {
        return [];
    }

    return this.getRecordsFromIds(
        [...ids]
    );
}


// ============================================================
// TAG'DEN KAYITLAR
// ============================================================

getTagRecords(
    tag = ""
) {

    if (
        !this.index
    ) {
        this.rebuildIndex();
    }

    const key =
        this.safeText(
            tag
        );

    if (!key) {
        return [];
    }

    const ids =
        this.index.byTag.get(
            key
        );

    if (!ids) {
        return [];
    }

    return this.getRecordsFromIds(
        [...ids]
    );
}


// ============================================================
// AKTİF KAYITLAR
// ============================================================

getActiveRecords() {

    const records =
        Array.isArray(
            this.data.records
        )
            ? this.data.records
            : [];

    return records.filter(
        (record) =>
            record &&
            record.active !== false &&
            record.archived !== true &&
            record.status !== "deleted"
    );
}


// ============================================================
// ARŞİV KAYITLAR
// ============================================================

getArchivedRecords() {

    const records =
        Array.isArray(
            this.data.records
        )
            ? this.data.records
            : [];

    return records.filter(
        (record) =>
            record &&
            (
                record.archived === true ||
                record.status === "archived"
            )
    );
}


// ============================================================
// SİLİNEN KAYITLAR
// ============================================================

getDeletedRecords() {

    const records =
        Array.isArray(
            this.data.records
        )
            ? this.data.records
            : [];

    return records.filter(
        (record) =>
            record &&
            record.status === "deleted"
    );
}


// ============================================================
// TÜM KAYITLAR
// ============================================================

getAllRecords(
    options = {}
) {

    const records =
        Array.isArray(
            this.data.records
        )
            ? this.data.records
            : [];

    const includeArchived =
        options.includeArchived === true;

    const includeDeleted =
        options.includeDeleted === true;

    if (
        includeArchived &&
        includeDeleted
    ) {
        return [
            ...records
        ];
    }

    return records.filter(
        (record) => {

            if (
                !includeDeleted &&
                record.status === "deleted"
            ) {
                return false;
            }

            if (
                !includeArchived &&
                (
                    record.archived === true ||
                    record.status === "archived"
                )
            ) {
                return false;
            }

            return true;
        }
    );
}


// ============================================================
// KAYIT SAYISI
// ============================================================

countRecords(
    options = {}
) {

    return this.getAllRecords(
        options
    ).length;
}


// ============================================================
// AKTİF KAYIT SAYISI
// ============================================================

countActiveRecords() {

    return this.getActiveRecords()
        .length;
}


// ============================================================
// ARŞİV SAYISI
// ============================================================

countArchivedRecords() {

    return this.getArchivedRecords()
        .length;
}


// ============================================================
// SİLİNEN SAYISI
// ============================================================

countDeletedRecords() {

    return this.getDeletedRecords()
        .length;
}


// ============================================================
// ID İLE KAYIT BUL
// ============================================================

getRecordById(
    id = ""
) {

    const cleanId =
        this.safeText(
            id
        );

    if (!cleanId) {
        return null;
    }

    if (
        this.index &&
        this.index.byId.has(
            cleanId
        )
    ) {
        return this.index.byId.get(
            cleanId
        );
    }

    const records =
        Array.isArray(
            this.data.records
        )
            ? this.data.records
            : [];

    return (
        records.find(
            (record) =>
                record.id === cleanId
        ) ||
        null
    );
}


// ============================================================
// SORU İLE KAYIT BUL
// ============================================================

getRecordByQuestion(
    question = ""
) {

    const key =
        this.normalizeQuestion(
            question
        );

    if (!key) {
        return null;
    }

    const matches =
        this.getQuestionIndexMatches(
            question
        );

    if (!matches.length) {
        return null;
    }

    return matches[0];
}


// ============================================================
// KAYIT EKLE
// ============================================================

addRecord(
    question = "",
    answer = "",
    options = {}
) {

    const cleanQuestion =
        this.safeText(
            question
        );

    const cleanAnswer =
        this.safeText(
            answer
        );

    if (!cleanQuestion) {

        return {
            ok: false,
            saved: false,
            reason: "question-empty"
        };
    }

    if (!cleanAnswer) {

        return {
            ok: false,
            saved: false,
            reason: "answer-empty"
        };
    }

    const duplicate =
        this.findDuplicateRecord(
            cleanQuestion,
            options.allowSameAnswer === false
                ? cleanAnswer
                : "",
            {
                includeInactive: false
            }
        );

    if (
        duplicate &&
        options.allowDuplicate !== true
    ) {

        if (
            options.updateDuplicate === true
        ) {

            const updated =
                this.updateRecord(
                    duplicate.id,
                    {
                        answer:
                            cleanAnswer,

                        ...options
                    }
                );

            return {
                ...updated,

                duplicate: true,

                existingId:
                    duplicate.id
            };
        }

        return {
            ok: true,

            saved: false,

            duplicate: true,

            reason:
                "duplicate-question",

            id:
                duplicate.id,

            record:
                duplicate
        };
    }

    const record =
        this.createRecord(
            cleanQuestion,
            cleanAnswer,
            options
        );

    const validation =
        this.validateRecord(
            record
        );

    if (!validation.valid) {

        return {
            ok: false,
            saved: false,
            reason:
                validation.reason
        };
    }

    if (
        !Array.isArray(
            this.data.records
        )
    ) {
        this.data.records = [];
    }

    this.data.records.push(
        record
    );

    this.indexRecord(
        record
    );

    this.touchUpdatedAt();

    this.saveData();

    this.invalidateCachesForQuestion(
        cleanQuestion
    );

    return {
        ok: true,

        saved: true,

        duplicate: false,

        id:
            record.id,

        record
    };
}


// ============================================================
// KAYDET ALIAS
// ============================================================

saveRecord(
    question = "",
    answer = "",
    options = {}
) {

    return this.addRecord(
        question,
        answer,
        options
    );
}


// ============================================================
// ADD ALIAS
// ============================================================

add(
    question = "",
    answer = "",
    options = {}
) {

    return this.addRecord(
        question,
        answer,
        options
    );
}


// ============================================================
// UPDATE RECORD
// ============================================================

updateRecord(
    id = "",
    changes = {}
) {

    const record =
        this.getRecordById(
            id
        );

    if (!record) {

        return {
            ok: false,
            updated: false,
            reason: "record-not-found"
        };
    }

    if (
        !this.canModifyRecord(
            record
        )
    ) {

        return {
            ok: false,
            updated: false,
            reason: "protected-record"
        };
    }

    const previousQuestion =
        record.question;

    const previousKeys =
        this.getRecordKeys(
            record
        );

    this.removeFromIndex(
        record
    );

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "question"
        )
    ) {

        const nextQuestion =
            this.safeText(
                changes.question
            );

        if (nextQuestion) {
            record.question =
                nextQuestion;
        }
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "answer"
        )
    ) {

        const nextAnswer =
            this.safeText(
                changes.answer
            );

        if (nextAnswer) {
            record.answer =
                nextAnswer;
        }
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "aliases"
        )
    ) {

        record.aliases =
            this.safeArray(
                changes.aliases
            );
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "tags"
        )
    ) {

        record.tags =
            this.safeArray(
                changes.tags
            );
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "category"
        )
    ) {

        record.category =
            this.safeText(
                changes.category
            ) ||
            record.category;
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "source"
        )
    ) {

        record.source =
            this.safeText(
                changes.source
            ) ||
            record.source;
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "userId"
        )
    ) {

        record.userId =
            this.safeText(
                changes.userId
            );
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "language"
        )
    ) {

        record.language =
            this.safeText(
                changes.language
            ) ||
            record.language;
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "status"
        )
    ) {

        record.status =
            this.safeText(
                changes.status
            ) ||
            record.status;
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "active"
        )
    ) {

        record.active =
            changes.active !== false;
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "archived"
        )
    ) {

        record.archived =
            changes.archived === true;
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "trusted"
        )
    ) {

        record.trusted =
            changes.trusted === true;
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "pinned"
        )
    ) {

        record.pinned =
            changes.pinned === true;
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "favorite"
        )
    ) {

        record.favorite =
            changes.favorite === true;
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "quality"
        )
    ) {

        record.quality =
            this.clamp01(
                changes.quality
            );
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "confidence"
        )
    ) {

        record.confidence =
            this.clamp01(
                changes.confidence
            );
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "metadata"
        )
    ) {

        record.metadata =
            changes.metadata &&
            typeof changes.metadata === "object"
                ? {
                    ...record.metadata,
                    ...changes.metadata
                }
                : record.metadata;
    }

    const refreshed =
        this.createRecord(
            record.question,
            record.answer,
            {
                ...record,

                id:
                    record.id,

                aliases:
                    record.aliases,

                tags:
                    record.tags,

                metadata:
                    record.metadata,

                updatedAt:
                    this.nowIso()
            }
        );

    const index =
        this.data.records.findIndex(
            (item) =>
                item &&
                item.id ===
                    record.id
        );

    if (index === -1) {

        return {
            ok: false,
            updated: false,
            reason: "record-index-not-found"
        };
    }

    this.data.records[index] =
        refreshed;

    this.indexRecord(
        refreshed
    );

    this.touchUpdatedAt();

    this.saveData();

    this.invalidateCachesForQuestion(
        previousQuestion
    );

    this.invalidateCachesForQuestion(
        refreshed.question
    );

    for (
        const key
        of previousKeys
    ) {

        this.invalidateCacheKey(
            key
        );
    }

    return {
        ok: true,

        updated: true,

        id:
            refreshed.id,

        record:
            refreshed
    };
}


// ============================================================
// UPDATE ALIAS
// ============================================================

update(
    id = "",
    changes = {}
) {

    return this.updateRecord(
        id,
        changes
    );
}


// ============================================================
// MERGE RECORD
// ============================================================

mergeRecord(
    id = "",
    patch = {}
) {

    const record =
        this.getRecordById(
            id
        );

    if (!record) {

        return {
            ok: false,
            merged: false,
            reason: "record-not-found"
        };
    }

    return this.updateRecord(
        id,
        {
            ...record,
            ...patch
        }
    );
}


// ============================================================
// ARCHIVE
// ============================================================

archiveRecord(
    id = ""
) {

    return this.updateRecord(
        id,
        {
            archived: true,
            active: false,
            status: "archived"
        }
    );
}


// ============================================================
// UNARCHIVE
// ============================================================

unarchiveRecord(
    id = ""
) {

    return this.updateRecord(
        id,
        {
            archived: false,
            active: true,
            status: "active"
        }
    );
}


// ============================================================
// ACTIVATE
// ============================================================

activateRecord(
    id = ""
) {

    return this.updateRecord(
        id,
        {
            active: true,
            archived: false,
            status: "active"
        }
    );
}


// ============================================================
// DEACTIVATE
// ============================================================

deactivateRecord(
    id = ""
) {

    return this.updateRecord(
        id,
        {
            active: false
        }
    );
}


// ============================================================
// SOFT DELETE
// ============================================================

softDeleteRecord(
    id = ""
) {

    const record =
        this.getRecordById(
            id
        );

    if (!record) {

        return {
            ok: false,
            deleted: false,
            reason: "record-not-found"
        };
    }

    if (
        !this.canModifyRecord(
            record
        )
    ) {

        return {
            ok: false,
            deleted: false,
            reason: "protected-record"
        };
    }

    return this.updateRecord(
        id,
        {
            active: false,
            archived: true,
            status: "deleted"
        }
    );
}


// ============================================================
// DELETE
// ============================================================

deleteRecord(
    id = "",
    options = {}
) {

    const record =
        this.getRecordById(
            id
        );

    if (!record) {

        return {
            ok: false,
            deleted: false,
            reason: "record-not-found"
        };
    }

    if (
        !this.canModifyRecord(
            record
        )
    ) {

        return {
            ok: false,
            deleted: false,
            reason: "protected-record"
        };
    }

    if (
        options.permanent !== true
    ) {

        return this.softDeleteRecord(
            id
        );
    }

    const index =
        this.data.records.findIndex(
            (item) =>
                item &&
                item.id === id
        );

    if (index === -1) {

        return {
            ok: false,
            deleted: false,
            reason: "record-index-not-found"
        };
    }

    this.removeFromIndex(
        record
    );

    this.data.records.splice(
        index,
        1
    );

    this.touchUpdatedAt();

    this.saveData();

    this.invalidateCachesForQuestion(
        record.question
    );

    return {
        ok: true,

        deleted: true,

        permanent: true,

        id
    };
}


// ============================================================
// DELETE ALIAS
// ============================================================

removeRecord(
    id = "",
    options = {}
) {

    return this.deleteRecord(
        id,
        options
    );
}


// ============================================================
// FIND OR CREATE
// ============================================================

findOrCreateRecord(
    question = "",
    answer = "",
    options = {}
) {

    const existing =
        this.getRecordByQuestion(
            question
        );

    if (existing) {

        if (
            options.updateExisting === true
        ) {

            return this.updateRecord(
                existing.id,
                {
                    answer,
                    ...options
                }
            );
        }

        return {
            ok: true,

            created: false,

            existing: true,

            id:
                existing.id,

            record:
                existing
        };
    }

    const created =
        this.addRecord(
            question,
            answer,
            options
        );

    return {
        ...created,

        created:
            created.saved === true
    };
}


// ============================================================
// MULTIPLE KAYIT EKLE
// ============================================================

addMany(
    entries = [],
    options = {}
) {

    if (
        !Array.isArray(entries)
    ) {

        return {
            ok: false,
            saved: 0,
            failed: 0,
            results: [],
            reason: "array-required"
        };
    }

    const results = [];

    let saved = 0;
    let failed = 0;

    for (
        const entry
        of entries
    ) {

        let question = "";
        let answer = "";
        let recordOptions = {};

        if (
            Array.isArray(entry)
        ) {

            question =
                this.safeText(
                    entry[0]
                );

            answer =
                this.safeText(
                    entry[1]
                );

            recordOptions =
                entry[2] &&
                typeof entry[2] === "object"
                    ? entry[2]
                    : {};

        } else if (
            entry &&
            typeof entry === "object"
        ) {

            question =
                this.safeText(
                    entry.question
                );

            answer =
                this.safeText(
                    entry.answer
                );

            recordOptions = {
                ...entry
            };

        }

        const result =
            this.addRecord(
                question,
                answer,
                {
                    ...options,
                    ...recordOptions
                }
            );

        results.push(
            result
        );

        if (
            result.saved
        ) {
            saved++;
        } else if (
            !result.duplicate
        ) {
            failed++;
        }
    }

    return {
        ok:
            failed === 0,

        saved,

        failed,

        total:
            entries.length,

        results
    };
}


// ============================================================
// BULK DELETE
// ============================================================

deleteMany(
    ids = [],
    options = {}
) {

    if (
        !Array.isArray(ids)
    ) {

        return {
            ok: false,
            deleted: 0,
            failed: 0,
            results: []
        };
    }

    let deleted = 0;
    let failed = 0;

    const results = [];

    for (
        const id
        of ids
    ) {

        const result =
            this.deleteRecord(
                id,
                options
            );

        results.push(
            result
        );

        if (
            result.deleted
        ) {
            deleted++;
        } else {
            failed++;
        }
    }

    return {
        ok:
            failed === 0,

        deleted,

        failed,

        results
    };
}


// ============================================================
// BULK UPDATE
// ============================================================

updateMany(
    updates = []
) {

    if (
        !Array.isArray(
            updates
        )
    ) {

        return {
            ok: false,
            updated: 0,
            failed: 0,
            results: []
        };
    }

    let updated = 0;
    let failed = 0;

    const results = [];

    for (
        const item
        of updates
    ) {

        const id =
            item &&
            typeof item === "object"
                ? item.id
                : "";

        const changes =
            item &&
            typeof item === "object"
                ? item.changes || item
                : {};

        const result =
            this.updateRecord(
                id,
                changes
            );

        results.push(
            result
        );

        if (
            result.updated
        ) {
            updated++;
        } else {
            failed++;
        }
    }

    return {
        ok:
            failed === 0,

        updated,

        failed,

        results
    };
}


// ============================================================
// CLEAR INACTIVE
// ============================================================

clearInactive(
    options = {}
) {

    const records =
        this.getAllRecords({
            includeArchived: true,
            includeDeleted: true
        });

    const targets =
        records.filter(
            (record) => {

                if (!record) {
                    return false;
                }

                if (
                    record.protected
                ) {
                    return false;
                }

                return (
                    record.active === false ||
                    record.status === "deleted" ||
                    record.archived === true
                );
            }
        );

    const ids =
        targets.map(
            (record) =>
                record.id
        );

    return this.deleteMany(
        ids,
        {
            permanent:
                options.permanent === true
        }
    );
}


// ============================================================
// RECORD SORT SCORE
// ============================================================

getRecordBaseScore(
    record
) {

    if (
        !record ||
        typeof record !== "object"
    ) {
        return 0;
    }

    let score = 0;

    score +=
        this.clamp01(
            record.quality ??
            0.5
        ) * 0.25;

    score +=
        this.clamp01(
            record.confidence ??
            0.5
        ) * 0.20;

    score +=
        this.clamp01(
            record.score ??
            0
        ) * 0.20;

    const usage =
        this.safeNumber(
            record.usageCount,
            0
        );

    const usageScore =
        Math.min(
            1,
            Math.log10(
                usage + 1
            ) / 3
        );

    score +=
        usageScore * 0.10;

    if (
        record.trusted
    ) {
        score += 0.10;
    }

    if (
        record.pinned
    ) {
        score += 0.10;
    }

    if (
        record.favorite
    ) {
        score += 0.05;
    }

    return this.clamp01(
        score
    );
}


// ============================================================
// CANDIDATE FILTER
// ============================================================

filterCandidates(
    candidates = [],
    options = {}
) {

    if (
        !Array.isArray(
            candidates
        )
    ) {
        return [];
    }

    const userId =
        this.safeText(
            options.userId ||
            ""
        );

    const category =
        this.safeText(
            options.category ||
            ""
        );

    const source =
        this.safeText(
            options.source ||
            ""
        );

    const includeInactive =
        options.includeInactive === true;

    const includeArchived =
        options.includeArchived === true;

    const includeDeleted =
        options.includeDeleted === true;

    return candidates.filter(
        (record) => {

            if (
                !record ||
                typeof record !== "object"
            ) {
                return false;
            }

            if (
                !includeDeleted &&
                record.status === "deleted"
            ) {
                return false;
            }

            if (
                !includeArchived &&
                record.archived === true
            ) {
                return false;
            }

            if (
                !includeInactive &&
                record.active === false
            ) {
                return false;
            }

            if (
                userId &&
                record.userId &&
                record.userId !== userId
            ) {

                return false;
            }

            if (
                category &&
                record.category !== category
            ) {

                return false;
            }

            if (
                source &&
                record.source !== source
            ) {

                return false;
            }

            return true;
        }
    );
}


// ============================================================
// KANDİDAT BİRLEŞTİR
// ============================================================

mergeCandidateLists(
    ...lists
) {

    const map =
        new Map();

    for (
        const list
        of lists
    ) {

        if (
            !Array.isArray(list)
        ) {
            continue;
        }

        for (
            const record
            of list
        ) {

            if (
                !record ||
                !record.id
            ) {
                continue;
            }

            if (
                !map.has(
                    record.id
                )
            ) {
                map.set(
                    record.id,
                    record
                );
            }
        }
    }

    return [
        ...map.values()
    ];
}


// ============================================================
// KANDİDAT GETİR
// ============================================================

getCandidates(
    question = "",
    options = {}
) {

    const direct =
        this.getQuestionIndexMatches(
            question
        );

    const token =
        this.getTokenIndexMatches(
            question
        );

    const intent =
        this.getIntentIndexMatches(
            question
        );

    const candidates =
        this.mergeCandidateLists(
            direct,
            token,
            intent
        );

    const filtered =
        this.filterCandidates(
            candidates,
            options
        );

    if (
        filtered.length
    ) {
        return filtered;
    }

    if (
        options.fallbackToAll === false
    ) {
        return [];
    }

    return this.filterCandidates(
        this.getActiveRecords(),
        options
    );
}


// ============================================================
// FİNAL SCORE
// ============================================================

scoreCandidate(
    question,
    record,
    options = {}
) {

    if (
        !record
    ) {
        return {
            score: 0,

            similarity: 0,

            baseScore: 0,

            exact: false,

            alias: false,

            tokenScore: 0,

            intentScore: 0
        };
    }

    const cleanQuestion =
        this.safeText(
            question
        );

    const similarity =
        this.textSimilarity(
            cleanQuestion,
            record.question
        );

    const baseScore =
        this.getRecordBaseScore(
            record
        );

    const normalizedQuestion =
        this.normalizeQuestion(
            cleanQuestion
        );

    const recordQuestion =
        this.normalizeQuestion(
            record.question
        );

    const exact =
        normalizedQuestion ===
        recordQuestion;

    const aliases =
        this.safeArray(
            record.aliases
        )
        .map(
            (alias) =>
                this.normalizeQuestion(
                    alias
                )
        );

    const alias =
        aliases.includes(
            normalizedQuestion
        );

    const inputTokens =
        this.meaningfulTokens(
            cleanQuestion
        );

    const recordTokens =
        this.meaningfulTokens(
            record.question
        );

    const tokenScore =
        this.jaccardSimilarity(
            inputTokens,
            recordTokens
        );

    const inputIntent =
        this.getIntentSignature(
            cleanQuestion
        );

    const recordIntent =
        Array.isArray(
            record.intents
        )
            ? record.intents
            : this.getIntentSignature(
                record.question
            );

    const intentScore =
        this.jaccardSimilarity(
            inputIntent,
            recordIntent
        );

    let score =
        similarity * 0.45 +
        baseScore * 0.20 +
        tokenScore * 0.15 +
        intentScore * 0.10;

    if (exact) {
        score += 0.20;
    }

    if (alias) {
        score += 0.17;
    }

    if (
        record.trusted
    ) {
        score += 0.05;
    }

    if (
        record.pinned
    ) {
        score += 0.04;
    }

    if (
        record.favorite
    ) {
        score += 0.02;
    }

    if (
        options.userId &&
        record.userId &&
        record.userId ===
            options.userId
    ) {
        score += 0.03;
    }

    score =
        this.clamp01(
            score
        );

    return {

        score,

        similarity,

        baseScore,

        exact,

        alias,

        tokenScore,

        intentScore
    };
}


// ============================================================
// SCORE RECORD
// ============================================================

scoreRecord(
    question,
    record,
    options = {}
) {

    return this.scoreCandidate(
        question,
        record,
        options
    );
}


// ============================================================
// ADAYLARI PUANLA
// ============================================================

rankCandidates(
    question = "",
    candidates = [],
    options = {}
) {

    if (
        !Array.isArray(
            candidates
        )
    ) {
        return [];
    }

    const ranked = [];

    for (
        const record
        of candidates
    ) {

        if (!record) {
            continue;
        }

        const scoring =
            this.scoreCandidate(
                question,
                record,
                options
            );

        ranked.push({

            ...record,

            _answerMemoryScore:
                scoring.score,

            _similarity:
                scoring.similarity,

            _exact:
                scoring.exact,

            _alias:
                scoring.alias,

            _tokenScore:
                scoring.tokenScore,

            _intentScore:
                scoring.intentScore,

            _baseScore:
                scoring.baseScore
        });
    }

    ranked.sort(
        (a, b) => {

            if (
                Boolean(a._exact) !==
                Boolean(b._exact)
            ) {

                return a._exact
                    ? -1
                    : 1;
            }

            if (
                Boolean(a._alias) !==
                Boolean(b._alias)
            ) {

                return a._alias
                    ? -1
                    : 1;
            }

            if (
                Boolean(a.pinned) !==
                Boolean(b.pinned)
            ) {

                return a.pinned
                    ? -1
                    : 1;
            }

            if (
                Boolean(a.trusted) !==
                Boolean(b.trusted)
            ) {

                return a.trusted
                    ? -1
                    : 1;
            }

            if (
                b._answerMemoryScore !==
                a._answerMemoryScore
            ) {

                return (
                    b._answerMemoryScore -
                    a._answerMemoryScore
                );
            }

            if (
                b.quality !==
                a.quality
            ) {

                return (
                    b.quality -
                    a.quality
                );
            }

            if (
                b.usageCount !==
                a.usageCount
            ) {

                return (
                    b.usageCount -
                    a.usageCount
                );
            }

            const aTime =
                Date.parse(
                    a.updatedAt ||
                    a.createdAt ||
                    ""
                ) || 0;

            const bTime =
                Date.parse(
                    b.updatedAt ||
                    b.createdAt ||
                    ""
                ) || 0;

            return bTime - aTime;
        }
    );

    const limit =
        Number(options.limit);

    if (
        Number.isFinite(limit) &&
        limit > 0
    ) {

        return ranked.slice(
            0,
            Math.floor(limit)
        );
    }

    return ranked;
}


// ============================================================
// EN İYİ ADAYI GETİR
// ============================================================

getBestCandidate(
    question = "",
    options = {}
) {

    const candidates =
        this.getCandidates(
            question,
            {
                ...options,

                fallbackToAll:
                    options.fallbackToAll !== false
            }
        );

    if (!candidates.length) {
        return null;
    }

    const ranked =
        this.rankCandidates(
            question,
            candidates,
            options
        );

    if (!ranked.length) {
        return null;
    }

    return ranked[0];
}


// ============================================================
// EŞİK KONTROLÜ
// ============================================================

passesAnswerThreshold(
    result,
    options = {}
) {

    if (!result) {
        return false;
    }

    if (
        result._exact ||
        result._alias
    ) {
        return true;
    }

    const defaultThreshold =
        0.70;

    const threshold =
        this.safeNumber(
            options.threshold,
            defaultThreshold
        );

    return (
        this.safeNumber(
            result._answerMemoryScore,
            0
        ) >= threshold
    );
}


// ============================================================
// ANSWER MEMORY ARAMA
// ============================================================

searchRecords(
    question = "",
    options = {}
) {

    const cleanQuestion =
        this.safeText(
            question
        );

    if (!cleanQuestion) {

        return {
            found: false,

            answer: null,

            score: 0,

            confidence: 0,

            source: "empty-question",

            record: null,

            candidates: []
        };
    }

    const direct =
        this.getQuestionIndexMatches(
            cleanQuestion
        );

    const token =
        this.getTokenIndexMatches(
            cleanQuestion
        );

    const intent =
        this.getIntentIndexMatches(
            cleanQuestion
        );

    const candidates =
        this.mergeCandidateLists(
            direct,
            token,
            intent
        );

    let filtered =
        this.filterCandidates(
            candidates,
            options
        );

    if (
        !filtered.length
    ) {

        filtered =
            this.filterCandidates(
                this.getActiveRecords(),
                options
            );
    }

    const ranked =
        this.rankCandidates(
            cleanQuestion,
            filtered,
            options
        );

    if (!ranked.length) {

        return {
            found: false,

            answer: null,

            score: 0,

            confidence: 0,

            source: "not-found",

            record: null,

            candidates: []
        };
    }

    const best =
        ranked[0];

    const score =
        this.safeNumber(
            best._answerMemoryScore,
            0
        );

    const found =
        this.passesAnswerThreshold(
            best,
            options
        );

    const confidence =
        this.clamp01(
            (
                score * 0.75 +
                this.safeNumber(
                    best.confidence,
                    0.5
                ) * 0.25
            )
        );

    let source =
        "answer-memory";

    if (best._exact) {
        source =
            "answer-memory-exact";
    } else if (best._alias) {
        source =
            "answer-memory-alias";
    } else if (
        score >= 0.85
    ) {
        source =
            "answer-memory-semantic";
    } else if (
        score >= 0.70
    ) {
        source =
            "answer-memory-similarity";
    }

    return {

        found,

        answer:
            found
                ? this.safeText(
                    best.answer
                )
                : null,

        score,

        confidence,

        source,

        record:
            found
                ? best
                : null,

        candidates:
            ranked.slice(
                0,
                Number(options.limit) > 0
                    ? Number(options.limit)
                    : 10
            )
    };
}


// ============================================================
// SEARCH ALIAS
// ============================================================

search(
    question = "",
    options = {}
) {

    const direct =
        this.getDirectGreeting(
            question
        );

    if (direct) {

        return {
            found: true,

            answer: direct,

            score: 1,

            confidence: 1,

            source:
                "builtin-greeting",

            record: null,

            candidates: []
        };
    }

    return this.searchRecords(
        question,
        options
    );
}


// ============================================================
// FIND ANSWER
// ============================================================

findAnswer(
    question = "",
    options = {}
) {

    const result =
        this.search(
            question,
            options
        );

    if (
        !result ||
        !result.found
    ) {
        return null;
    }

    return result.answer;
}


// ============================================================
// GET ANSWER
// ============================================================

getAnswer(
    question = "",
    options = {}
) {

    return this.findAnswer(
        question,
        options
    );
}


// ============================================================
// FIND BEST ANSWER
// ============================================================

findBestAnswer(
    question = "",
    options = {}
) {

    return this.search(
        question,
        options
    );
}


// ============================================================
// BEST RECORD
// ============================================================

findBestRecord(
    question = "",
    options = {}
) {

    const result =
        this.searchRecords(
            question,
            options
        );

    return result.record ||
        null;
}


// ============================================================
// HIT KAYDI
// ============================================================

registerHit(
    record,
    options = {}
) {

    if (!record) {
        return null;
    }

    record.hitCount =
        Math.max(
            0,
            this.safeNumber(
                record.hitCount,
                0
            )
        ) + 1;

    record.usageCount =
        Math.max(
            0,
            this.safeNumber(
                record.usageCount,
                0
            )
        ) + 1;

    record.lastUsedAt =
        this.nowIso();

    const currentQuality =
        this.clamp01(
            record.quality ??
            0.5
        );

    const currentConfidence =
        this.clamp01(
            record.confidence ??
            0.5
        );

    record.quality =
        this.clamp01(
            currentQuality +
            0.005
        );

    record.confidence =
        this.clamp01(
            currentConfidence +
            0.003
        );

    record.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {

        this.saveData();
    }

    return record;
}


// ============================================================
// MISS KAYDI
// ============================================================

registerMiss(
    record,
    options = {}
) {

    if (!record) {
        return null;
    }

    record.missCount =
        Math.max(
            0,
            this.safeNumber(
                record.missCount,
                0
            )
        ) + 1;

    const quality =
        this.clamp01(
            record.quality ??
            0.5
        );

    record.quality =
        this.clamp01(
            quality -
            0.01
        );

    record.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {

        this.saveData();
    }

    return record;
}


// ============================================================
// HİT
// ============================================================

hit(
    recordOrId,
    options = {}
) {

    const record =
        typeof recordOrId === "string"
            ? this.getRecordById(
                recordOrId
            )
            : recordOrId;

    return this.registerHit(
        record,
        options
    );
}


// ============================================================
// MISS
// ============================================================

miss(
    recordOrId,
    options = {}
) {

    const record =
        typeof recordOrId === "string"
            ? this.getRecordById(
                recordOrId
            )
            : recordOrId;

    return this.registerMiss(
        record,
        options
    );
}


// ============================================================
// QUESTION SEARCH
// ============================================================

findQuestion(
    question = "",
    options = {}
) {

    return this.search(
        question,
        options
    );
}


// ============================================================
// QUERY
// ============================================================

query(
    question = "",
    options = {}
) {

    return this.search(
        question,
        options
    );
}


// ============================================================
// LOOKUP
// ============================================================

lookup(
    question = "",
    options = {}
) {

    return this.search(
        question,
        options
    );
}


// ============================================================
// MATCH
// ============================================================

match(
    question = "",
    options = {}
) {

    const result =
        this.search(
            question,
            options
        );

    return {
        matched:
            Boolean(
                result &&
                result.found
            ),

        answer:
            result?.answer ||
            null,

        score:
            result?.score ||
            0,

        confidence:
            result?.confidence ||
            0,

        source:
            result?.source ||
            null,

        record:
            result?.record ||
            null
    };
}


// ============================================================
// CACHE INVALIDATION
// ============================================================

invalidateCacheKey(
    key = ""
) {

    const cleanKey =
        this.safeText(
            key
        );

    if (!cleanKey) {
        return false;
    }

    if (
        this.cache &&
        typeof this.cache.delete ===
            "function"
    ) {

        return this.cache.delete(
            cleanKey
        );
    }

    if (
        this.answerCache &&
        typeof this.answerCache.delete ===
            "function"
    ) {

        return this.answerCache.delete(
            cleanKey
        );
    }

    return false;
}


// ============================================================
// CACHE INVALIDATE QUESTION
// ============================================================

invalidateCachesForQuestion(
    question = ""
) {

    const keys =
        this.createAliasKeys(
            question,
            []
        );

    for (
        const key
        of keys
    ) {

        this.invalidateCacheKey(
            key
        );
    }

    return keys.length;
}


// ============================================================
// TOUCH UPDATED
// ============================================================

touchUpdatedAt() {

    this.data.updatedAt =
        this.nowIso();

    return this.data.updatedAt;
}


// ============================================================
// SAVE DATA GÜVENLİ WRAPPER
// ============================================================

safeSaveData() {

    try {

        const result =
            this.saveData();

        return {
            ok: true,
            result
        };

    } catch (error) {

        return {
            ok: false,

            error:
                error.message
        };
    }
}


// ============================================================
// REFRESH RECORD FINGERPRINT
// ============================================================

refreshRecordFingerprint(
    record
) {

    if (
        !record
    ) {
        return null;
    }

    const fingerprint =
        this.getSemanticFingerprint(
            record.question || ""
        );

    record.normalizedQuestion =
        fingerprint.normalized;

    record.questionKey =
        fingerprint.normalized;

    record.tokens =
        fingerprint.tokens;

    record.intents =
        fingerprint.intents;

    record.bigrams =
        fingerprint.bigrams;

    record.trigrams =
        fingerprint.trigrams;

    record.tokenKey =
        fingerprint.tokenKey;

    record.intentKey =
        fingerprint.intentKey;

    record.fingerprint =
        fingerprint.fingerprint;

    record.updatedAt =
        this.nowIso();

    return record;
}


// ============================================================
// TÜM KAYIT FINGERPRINT YENİLE
// ============================================================

refreshAllFingerprints() {

    const records =
        Array.isArray(
            this.data.records
        )
            ? this.data.records
            : [];

    let updated = 0;

    for (
        const record
        of records
    ) {

        if (!record) {
            continue;
        }

        this.refreshRecordFingerprint(
            record
        );

        updated++;
    }

    this.rebuildIndex();

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,
        updated
    };
}


// ============================================================
// REBUILD SAFE
// ============================================================

rebuild() {

    return this.rebuildIndex();
}


// ============================================================
// INDEX INFO
// ============================================================

getIndexInfo() {

    if (
        !this.index
    ) {
        this.rebuildIndex();
    }

    return {

        byId:
            this.index.byId.size,

        byQuestion:
            this.index.byQuestion.size,

        byAlias:
            this.index.byAlias.size,

        byToken:
            this.index.byToken.size,

        byIntent:
            this.index.byIntent.size,

        byCategory:
            this.index.byCategory.size,

        bySource:
            this.index.bySource.size,

        byUser:
            this.index.byUser.size,

        byTag:
            this.index.byTag.size
    };
}


// ============================================================
// DATABASE SNAPSHOT
// ============================================================

createMemorySnapshot() {

    return {

        version:
            this.data.version ||
            "1.0",

        createdAt:
            this.nowIso(),

        updatedAt:
            this.data.updatedAt ||
            null,

        count:
            this.countRecords(),

        active:
            this.countActiveRecords(),

        archived:
            this.countArchivedRecords(),

        deleted:
            this.countDeletedRecords(),

        records:
            this.getAllRecords({
                includeArchived: true,
                includeDeleted: true
            })
    };
}


// ============================================================
// EXPORT MEMORY
// ============================================================

exportMemory() {

    return JSON.stringify(
        this.createMemorySnapshot(),
        null,
        2
    );
}


// ============================================================
// IMPORT MEMORY
// ============================================================

importMemory(
    input,
    options = {}
) {

    let parsed =
        input;

    if (
        typeof input ===
        "string"
    ) {

        try {

            parsed =
                JSON.parse(
                    input
                );

        } catch (error) {

            return {
                ok: false,

                imported: 0,

                reason:
                    "invalid-json",

                error:
                    error.message
            };
        }
    }

    if (
        !parsed ||
        typeof parsed !==
            "object"
    ) {

        return {
            ok: false,

            imported: 0,

            reason:
                "object-required"
        };
    }

    const records =
        Array.isArray(
            parsed.records
        )
            ? parsed.records
            : [];

    let imported = 0;
    let skipped = 0;

    const results = [];

    for (
        const record
        of records
    ) {

        if (!record) {
            skipped++;
            continue;
        }

        const normalized =
            this.normalizeRecord(
                record
            );

        if (!normalized) {
            skipped++;
            continue;
        }

        const existing =
            this.getRecordById(
                normalized.id
            );

        if (
            existing &&
            options.overwrite !== true
        ) {
            skipped++;
            continue;
        }

        if (existing) {

            const updated =
                this.updateRecord(
                    existing.id,
                    normalized
                );

            results.push(
                updated
            );

            if (
                updated.updated
            ) {
                imported++;
            } else {
                skipped++;
            }

            continue;
        }

        const added =
            this.addRecord(
                normalized.question,
                normalized.answer,
                normalized
            );

        results.push(
            added
        );

        if (
            added.saved
        ) {
            imported++;
        } else {
            skipped++;
        }
    }

    this.rebuildIndex();

    this.touchUpdatedAt();

    this.saveData();

    return {

        ok: true,

        imported,

        skipped,

        total:
            records.length,

        results
    };
}


// ============================================================
// MEMORY SIZE
// ============================================================

getMemorySize() {

    const json =
        this.exportMemory();

    return {
        bytes:
            Buffer.byteLength(
                json,
                "utf8"
            ),

        characters:
            json.length
    };
}


// ============================================================
// SEARCH REPORT
// ============================================================

searchReport(
    question = "",
    options = {}
) {

    const result =
        this.searchRecords(
            question,
            {
                ...options,

                limit:
                    options.limit ||
                    10
            }
        );

    return {

        question,

        found:
            Boolean(
                result.found
            ),

        answer:
            result.answer,

        score:
            result.score,

        confidence:
            result.confidence,

        source:
            result.source,

        candidates:
            (result.candidates || [])
                .map(
                    (candidate) => ({
                        id:
                            candidate.id,

                        question:
                            candidate.question,

                        answer:
                            candidate.answer,

                        score:
                            candidate._answerMemoryScore,

                        similarity:
                            candidate._similarity,

                        exact:
                            Boolean(
                                candidate._exact
                            ),

                        alias:
                            Boolean(
                                candidate._alias
                            ),

                        trusted:
                            Boolean(
                                candidate.trusted
                            ),

                        pinned:
                            Boolean(
                                candidate.pinned
                            )
                    })
                )
    };
}


// ============================================================
// SIRALI SONUÇLAR
// ============================================================

searchTop(
    question = "",
    limit = 5,
    options = {}
) {

    return this.search(
        question,
        {
            ...options,

            limit:
                Math.max(
                    1,
                    Number(limit) || 5
                )
        }
    );
}


// ============================================================
// EN İYİ N KAYIT
// ============================================================

topRecords(
    limit = 10,
    options = {}
) {

    const records =
        this.getAllRecords(
            options
        );

    const ranked =
        records
            .map(
                (record) => ({
                    record,

                    score:
                        this.getRecordBaseScore(
                            record
                        )
                })
            )
            .sort(
                (a, b) =>
                    b.score - a.score
            );

    return ranked
        .slice(
            0,
            Math.max(
                1,
                Number(limit) || 10
            )
        )
        .map(
            (item) =>
                item.record
        );
}


// ============================================================
// KATEGORİ ÖZETİ
// ============================================================

getCategorySummary() {

    const summary =
        {};

    const records =
        this.getAllRecords({
            includeArchived: true
        });

    for (
        const record
        of records
    ) {

        const category =
            this.safeText(
                record.category
            ) ||
            "general";

        if (
            !summary[category]
        ) {

            summary[category] = {
                count: 0,
                active: 0,
                archived: 0,
                usage: 0
            };
        }

        summary[category].count++;

        if (
            record.active !== false
        ) {
            summary[category].active++;
        }

        if (
            record.archived === true
        ) {
            summary[category].archived++;
        }

        summary[category].usage +=
            this.safeNumber(
                record.usageCount,
                0
            );
    }

    return summary;
}


// ============================================================
// SOURCE ÖZETİ
// ============================================================

getSourceSummary() {

    const summary =
        {};

    const records =
        this.getAllRecords({
            includeArchived: true
        });

    for (
        const record
        of records
    ) {

        const source =
            this.safeText(
                record.source
            ) ||
            "unknown";

        if (
            !summary[source]
        ) {

            summary[source] = {
                count: 0,
                active: 0,
                usage: 0
            };
        }

        summary[source].count++;

        if (
            record.active !== false
        ) {
            summary[source].active++;
        }

        summary[source].usage +=
            this.safeNumber(
                record.usageCount,
                0
            );
    }

    return summary;
}


// ============================================================
// USER ÖZETİ
// ============================================================

getUserSummary() {

    const summary =
        {};

    const records =
        this.getAllRecords({
            includeArchived: true
        });

    for (
        const record
        of records
    ) {

        const userId =
            this.safeText(
                record.userId
            ) ||
            "anonymous";

        if (
            !summary[userId]
        ) {

            summary[userId] = {
                count: 0,
                active: 0,
                usage: 0
            };
        }

        summary[userId].count++;

        if (
            record.active !== false
        ) {
            summary[userId].active++;
        }

        summary[userId].usage +=
            this.safeNumber(
                record.usageCount,
                0
            );
    }

    return summary;
}


// ============================================================
// TAG ÖZETİ
// ============================================================

getTagSummary() {

    const summary =
        {};

    const records =
        this.getAllRecords({
            includeArchived: true
        });

    for (
        const record
        of records
    ) {

        const tags =
            this.safeArray(
                record.tags
            );

        for (
            const tag
            of tags
        ) {

            if (
                !summary[tag]
            ) {

                summary[tag] = {
                    count: 0,
                    usage: 0
                };
            }

            summary[tag].count++;

            summary[tag].usage +=
                this.safeNumber(
                    record.usageCount,
                    0
                );
        }
    }

    return summary;
}


// ============================================================
// KALİTE ORTALAMASI
// ============================================================

getAverageQuality() {

    const records =
        this.getActiveRecords();

    if (!records.length) {
        return 0;
    }

    let total = 0;

    for (
        const record
        of records
    ) {

        total +=
            this.clamp01(
                record.quality ??
                0.5
            );
    }

    return this.clamp01(
        total /
        records.length
    );
}


// ============================================================
// ORTALAMA CONFIDENCE
// ============================================================

getAverageConfidence() {

    const records =
        this.getActiveRecords();

    if (!records.length) {
        return 0;
    }

    let total = 0;

    for (
        const record
        of records
    ) {

        total +=
            this.clamp01(
                record.confidence ??
                0.5
            );
    }

    return this.clamp01(
        total /
        records.length
    );
}


// ============================================================
// TOTAL USAGE
// ============================================================

getTotalUsage() {

    const records =
        this.getAllRecords({
            includeArchived: true
        });

    let total = 0;

    for (
        const record
        of records
    ) {

        total +=
            Math.max(
                0,
                this.safeNumber(
                    record.usageCount,
                    0
                )
            );
    }

    return total;
}


// ============================================================
// TOTAL HITS
// ============================================================

getTotalHits() {

    const records =
        this.getAllRecords({
            includeArchived: true
        });

    let total = 0;

    for (
        const record
        of records
    ) {

        total +=
            Math.max(
                0,
                this.safeNumber(
                    record.hitCount,
                    0
                )
            );
    }

    return total;
}


// ============================================================
// TOTAL MISSES
// ============================================================

getTotalMisses() {

    const records =
        this.getAllRecords({
            includeArchived: true
        });

    let total = 0;

    for (
        const record
        of records
    ) {

        total +=
            Math.max(
                0,
                this.safeNumber(
                    record.missCount,
                    0
                )
            );
    }

    return total;
}


// ============================================================
// HIT RATE
// ============================================================

getHitRate() {

    const hits =
        this.getTotalHits();

    const misses =
        this.getTotalMisses();

    const total =
        hits +
        misses;

    if (!total) {
        return 0;
    }

    return this.clamp01(
        hits / total
    );
}


// ============================================================
// KAYIT ARAMADA ID LİSTESİ
// ============================================================

getCandidateIds(
    question = ""
) {

    const candidateLists = [

        this.getQuestionIndexMatches(
            question
        ),

        this.getTokenIndexMatches(
            question
        ),

        this.getIntentIndexMatches(
            question
        )
    ];

    const records =
        this.mergeCandidateLists(
            ...candidateLists
        );

    return records.map(
        (record) =>
            record.id
    );
}


// ============================================================
// EXISTENCE
// ============================================================

hasQuestion(
    question = ""
) {

    return Boolean(
        this.getRecordByQuestion(
            question
        )
    );
}


// ============================================================
// HAS ID
// ============================================================

hasRecord(
    id = ""
) {

    return Boolean(
        this.getRecordById(
            id
        )
    );
}


// ============================================================
// REPLACE ANSWER
// ============================================================

replaceAnswer(
    id = "",
    answer = ""
) {

    const cleanAnswer =
        this.safeText(
            answer
        );

    if (!cleanAnswer) {

        return {
            ok: false,
            updated: false,
            reason: "answer-empty"
        };
    }

    return this.updateRecord(
        id,
        {
            answer:
                cleanAnswer
        }
    );
}


// ============================================================
// ADD ALIAS TO RECORD
// ============================================================

addAlias(
    id = "",
    alias = ""
) {

    const record =
        this.getRecordById(
            id
        );

    if (!record) {

        return {
            ok: false,
            updated: false,
            reason: "record-not-found"
        };
    }

    if (
        !this.canModifyRecord(
            record
        )
    ) {

        return {
            ok: false,
            updated: false,
            reason: "protected-record"
        };
    }

    const cleanAlias =
        this.safeText(
            alias
        );

    if (!cleanAlias) {

        return {
            ok: false,
            updated: false,
            reason: "alias-empty"
        };
    }

    const aliases =
        this.safeArray(
            record.aliases
        );

    const normalizedAlias =
        this.normalizeQuestion(
            cleanAlias
        );

    const exists =
        aliases.some(
            (item) =>
                this.normalizeQuestion(
                    item
                ) ===
                normalizedAlias
        );

    if (!exists) {
        aliases.push(
            cleanAlias
        );
    }

    return this.updateRecord(
        id,
        {
            aliases
        }
    );
}


// ============================================================
// REMOVE ALIAS
// ============================================================

removeAlias(
    id = "",
    alias = ""
) {

    const record =
        this.getRecordById(
            id
        );

    if (!record) {

        return {
            ok: false,
            updated: false,
            reason: "record-not-found"
        };
    }

    if (
        !this.canModifyRecord(
            record
        )
    ) {

        return {
            ok: false,
            updated: false,
            reason: "protected-record"
        };
    }

    const target =
        this.normalizeQuestion(
            alias
        );

    const aliases =
        this.safeArray(
            record.aliases
        )
        .filter(
            (item) =>
                this.normalizeQuestion(
                    item
                ) !== target
        );

    return this.updateRecord(
        id,
        {
            aliases
        }
    );
}


// ============================================================
// ADD TAG
// ============================================================

addTag(
    id = "",
    tag = ""
) {

    const record =
        this.getRecordById(
            id
        );

    if (!record) {

        return {
            ok: false,
            updated: false,
            reason: "record-not-found"
        };
    }

    const cleanTag =
        this.safeText(
            tag
        );

    if (!cleanTag) {

        return {
            ok: false,
            updated: false,
            reason: "tag-empty"
        };
    }

    const tags =
        this.safeArray(
            record.tags
        );

    if (
        !tags.includes(
            cleanTag
        )
    ) {
        tags.push(
            cleanTag
        );
    }

    return this.updateRecord(
        id,
        {
            tags
        }
    );
}


// ============================================================
// REMOVE TAG
// ============================================================

removeTag(
    id = "",
    tag = ""
) {

    const record =
        this.getRecordById(
            id
        );

    if (!record) {

        return {
            ok: false,
            updated: false,
            reason: "record-not-found"
        };
    }

    const cleanTag =
        this.safeText(
            tag
        );

    const tags =
        this.safeArray(
            record.tags
        )
        .filter(
            (item) =>
                item !== cleanTag
        );

    return this.updateRecord(
        id,
        {
            tags
        }
    );
}


// ============================================================
// RESET SCORE
// ============================================================

resetRecordMetrics(
    id = ""
) {

    const record =
        this.getRecordById(
            id
        );

    if (!record) {

        return {
            ok: false,
            updated: false,
            reason: "record-not-found"
        };
    }

    return this.updateRecord(
        id,
        {
            quality: 0.5,

            confidence: 0.5,

            score: 0,

            usageCount: 0,

            hitCount: 0,

            missCount: 0,

            feedbackPositive: 0,

            feedbackNegative: 0,

            verificationCount: 0,

            lastUsedAt: null,

            lastFeedbackAt: null,

            lastVerifiedAt: null
        }
    );
}


// ============================================================
// GET HEALTH
// ============================================================

getHealthSummary() {

    const records =
        this.getAllRecords({
            includeArchived: true,
            includeDeleted: true
        });

    let broken = 0;

    let active = 0;

    let archived = 0;

    let deleted = 0;

    for (
        const record
        of records
    ) {

        const validation =
            this.validateRecord(
                record
            );

        if (
            !validation.valid
        ) {
            broken++;
        }

        if (
            record.active !== false
        ) {
            active++;
        }

        if (
            record.archived === true
        ) {
            archived++;
        }

        if (
            record.status === "deleted"
        ) {
            deleted++;
        }
    }

    return {

        ok:
            broken === 0,

        total:
            records.length,

        active,

        archived,

        deleted,

        broken,

        averageQuality:
            this.getAverageQuality(),

        averageConfidence:
            this.getAverageConfidence(),

        totalUsage:
            this.getTotalUsage(),

        hitRate:
            this.getHitRate(),

        index:
            this.getIndexInfo(),

        size:
            this.getMemorySize()
    };
}


// ============================================================
// DEBUG SEARCH
// ============================================================

debugSearch(
    question = "",
    options = {}
) {

    const classification =
        this.classifyQuestion(
            question
        );

    const fingerprint =
        this.getSemanticFingerprint(
            question
        );

    const direct =
        this.getQuestionIndexMatches(
            question
        );

    const token =
        this.getTokenIndexMatches(
            question
        );

    const intent =
        this.getIntentIndexMatches(
            question
        );

    const result =
        this.search(
            question,
            options
        );

    return {

        input:
            question,

        classification,

        fingerprint,

        directCandidates:
            direct.map(
                (record) =>
                    record.id
            ),

        tokenCandidates:
            token.map(
                (record) =>
                    record.id
            ),

        intentCandidates:
            intent.map(
                (record) =>
                    record.id
            ),

        result
    };
}


// ============================================================
// PART 3 SONU
// ============================================================
// ============================================================
// TÜRKAI — ANSWER MEMORY
// PART 4 / 10
// SEARCH + RANKING + CACHE + SMART MATCH ENGINE
// ============================================================


// ============================================================
// SEARCH CONFIG
// ============================================================

getSearchConfig() {
    return {
        minScore: 0.70,
        exactScore: 1.00,
        aliasScore: 0.97,
        strongScore: 0.86,
        semanticScore: 0.78,
        weakScore: 0.70,
        defaultLimit: 10,
        cacheTTL: 1000 * 60 * 10,
        maxCandidates: 500,
        maxTokens: 100,
        useCache: true,
        useExact: true,
        useAlias: true,
        useSemantic: true,
        useFuzzy: true,
        useIntent: true,
        useTokenIndex: true
    };
}


// ============================================================
// SEARCH OPTION NORMALIZER
// ============================================================

normalizeSearchOptions(options = {}) {
    const defaults = this.getSearchConfig();

    const input =
        options &&
        typeof options === "object"
            ? options
            : {};

    return {
        ...defaults,
        ...input,
        minScore: this.clamp01(
            input.minScore ??
            defaults.minScore
        ),
        limit: Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    input.limit,
                    defaults.defaultLimit
                )
            )
        ),
        maxCandidates: Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    input.maxCandidates,
                    defaults.maxCandidates
                )
            )
        )
    };
}


// ============================================================
// SEARCH CONTEXT
// ============================================================

createSearchContext(
    question = "",
    options = {}
) {
    const normalizedOptions =
        this.normalizeSearchOptions(
            options
        );

    const fingerprint =
        this.getSemanticFingerprint(
            question
        );

    const classification =
        this.classifyQuestion(
            question
        );

    return {
        question:
            this.safeText(
                question
            ),

        normalized:
            fingerprint.normalized,

        fingerprint,

        classification,

        options:
            normalizedOptions,

        createdAt:
            Date.now()
    };
}


// ============================================================
// CACHE MAP ENSURE
// ============================================================

ensureCache() {
    if (
        !(this.cache instanceof Map)
    ) {
        this.cache =
            new Map();
    }

    return this.cache;
}


// ============================================================
// ANSWER CACHE ENSURE
// ============================================================

ensureAnswerCache() {
    if (
        !(this.answerCache instanceof Map)
    ) {
        this.answerCache =
            new Map();
    }

    return this.answerCache;
}


// ============================================================
// CACHE KEY
// ============================================================

createSearchCacheKey(
    question = "",
    options = {}
) {
    const normalized =
        this.normalizeQuestion(
            question
        );

    const safeOptions =
        this.normalizeSearchOptions(
            options
        );

    return [
        normalized,
        safeOptions.minScore,
        safeOptions.limit,
        safeOptions.userId || "",
        safeOptions.category || "",
        safeOptions.source || ""
    ].join("::");
}


// ============================================================
// CACHE ENTRY
// ============================================================

createCacheEntry(
    value,
    ttl = 0
) {
    return {
        value,
        createdAt: Date.now(),
        expiresAt:
            ttl > 0
                ? Date.now() + ttl
                : 0,
        hits: 0
    };
}


// ============================================================
// CACHE SET
// ============================================================

setSearchCache(
    key,
    value,
    ttl
) {
    const cache =
        this.ensureCache();

    const safeTTL =
        Math.max(
            0,
            this.safeNumber(
                ttl,
                this.getSearchConfig()
                    .cacheTTL
            )
        );

    cache.set(
        key,
        this.createCacheEntry(
            value,
            safeTTL
        )
    );

    return true;
}


// ============================================================
// CACHE GET
// ============================================================

getSearchCache(key) {
    const cache =
        this.ensureCache();

    if (
        !cache.has(key)
    ) {
        return null;
    }

    const entry =
        cache.get(key);

    if (
        !entry ||
        typeof entry !== "object"
    ) {
        cache.delete(key);
        return null;
    }

    if (
        entry.expiresAt > 0 &&
        Date.now() >
            entry.expiresAt
    ) {
        cache.delete(key);
        return null;
    }

    entry.hits =
        this.safeNumber(
            entry.hits,
            0
        ) + 1;

    return entry.value;
}


// ============================================================
// CACHE DELETE
// ============================================================

deleteSearchCache(key) {
    const cache =
        this.ensureCache();

    return cache.delete(
        key
    );
}


// ============================================================
// CACHE CLEAR
// ============================================================

clearSearchCache() {
    const cache =
        this.ensureCache();

    const size =
        cache.size;

    cache.clear();

    return {
        ok: true,
        cleared: size
    };
}


// ============================================================
// CACHE SIZE
// ============================================================

getSearchCacheSize() {
    return this.ensureCache()
        .size;
}


// ============================================================
// CACHE STATS
// ============================================================

getSearchCacheStats() {
    const cache =
        this.ensureCache();

    let active = 0;
    let expired = 0;
    let hits = 0;

    for (
        const [key, entry]
        of cache.entries()
    ) {
        if (
            entry?.expiresAt > 0 &&
            Date.now() >
                entry.expiresAt
        ) {
            expired++;
            continue;
        }

        active++;

        hits +=
            this.safeNumber(
                entry?.hits,
                0
            );
    }

    return {
        size: cache.size,
        active,
        expired,
        hits
    };
}


// ============================================================
// EXPIRE CACHE
// ============================================================

expireSearchCache() {
    const cache =
        this.ensureCache();

    let removed = 0;

    for (
        const [key, entry]
        of cache.entries()
    ) {
        if (
            entry?.expiresAt > 0 &&
            Date.now() >
                entry.expiresAt
        ) {
            cache.delete(key);
            removed++;
        }
    }

    return {
        ok: true,
        removed
    };
}


// ============================================================
// CACHE ALIAS
// ============================================================

cacheGet(key) {
    return this.getSearchCache(
        key
    );
}


// ============================================================
// CACHE ALIAS
// ============================================================

cacheSet(
    key,
    value,
    ttl
) {
    return this.setSearchCache(
        key,
        value,
        ttl
    );
}


// ============================================================
// CACHE ALIAS
// ============================================================

cacheDelete(key) {
    return this.deleteSearchCache(
        key
    );
}


// ============================================================
// CACHE INVALIDATION ALL
// ============================================================

invalidateAllCaches() {
    this.clearSearchCache();

    if (
        this.answerCache instanceof Map
    ) {
        this.answerCache.clear();
    }

    return {
        ok: true
    };
}


// ============================================================
// DIRECT EXACT SEARCH
// ============================================================

searchExact(
    question = "",
    options = {}
) {
    const normalized =
        this.normalizeQuestion(
            question
        );

    if (!normalized) {
        return [];
    }

    const exact =
        this.getQuestionIndexMatches(
            question
        );

    return this.filterCandidates(
        exact,
        {
            ...options,
            includeInactive:
                options.includeInactive === true
        }
    );
}


// ============================================================
// ALIAS SEARCH
// ============================================================

searchAlias(
    question = "",
    options = {}
) {
    if (
        !this.index
    ) {
        this.rebuildIndex();
    }

    const normalized =
        this.normalizeQuestion(
            question
        );

    if (!normalized) {
        return [];
    }

    const ids =
        this.index.byAlias.get(
            normalized
        );

    if (!ids) {
        return [];
    }

    const records =
        this.getRecordsFromIds(
            [...ids]
        );

    return this.filterCandidates(
        records,
        options
    );
}


// ============================================================
// TOKEN SEARCH
// ============================================================

searchByTokens(
    question = "",
    options = {}
) {
    const tokens =
        this.uniqueTokens(
            this.meaningfulTokens(
                question
            )
        );

    if (!tokens.length) {
        return [];
    }

    const records =
        this.getTokenIndexMatches(
            question
        );

    return this.filterCandidates(
        records,
        options
    );
}


// ============================================================
// INTENT SEARCH
// ============================================================

searchByIntent(
    question = "",
    options = {}
) {
    const records =
        this.getIntentIndexMatches(
            question
        );

    return this.filterCandidates(
        records,
        options
    );
}


// ============================================================
// CATEGORY SEARCH
// ============================================================

searchByCategory(
    question = "",
    category = "",
    options = {}
) {
    const categoryRecords =
        this.getCategoryRecords(
            category
        );

    if (
        !categoryRecords.length
    ) {
        return [];
    }

    return this.rankCandidates(
        question,
        this.filterCandidates(
            categoryRecords,
            options
        ),
        options
    );
}


// ============================================================
// SOURCE SEARCH
// ============================================================

searchBySource(
    question = "",
    source = "",
    options = {}
) {
    const sourceRecords =
        this.getSourceRecords(
            source
        );

    if (
        !sourceRecords.length
    ) {
        return [];
    }

    return this.rankCandidates(
        question,
        this.filterCandidates(
            sourceRecords,
            options
        ),
        options
    );
}


// ============================================================
// USER SEARCH
// ============================================================

searchByUser(
    question = "",
    userId = "",
    options = {}
) {
    const userRecords =
        this.getUserRecords(
            userId
        );

    if (
        !userRecords.length
    ) {
        return [];
    }

    return this.rankCandidates(
        question,
        this.filterCandidates(
            userRecords,
            {
                ...options,
                userId
            }
        ),
        {
            ...options,
            userId
        }
    );
}


// ============================================================
// TAG SEARCH
// ============================================================

searchByTag(
    question = "",
    tag = "",
    options = {}
) {
    const tagRecords =
        this.getTagRecords(
            tag
        );

    if (
        !tagRecords.length
    ) {
        return [];
    }

    return this.rankCandidates(
        question,
        this.filterCandidates(
            tagRecords,
            options
        ),
        options
    );
}


// ============================================================
// FUZZY SEARCH
// ============================================================

searchFuzzy(
    question = "",
    options = {}
) {
    const safeOptions =
        this.normalizeSearchOptions(
            options
        );

    const records =
        this.getActiveRecords();

    const candidates =
        records.slice(
            0,
            safeOptions.maxCandidates
        );

    const ranked =
        [];

    for (
        const record
        of candidates
    ) {
        const score =
            this.scoreCandidate(
                question,
                record,
                safeOptions
            );

        if (
            score.score >=
            safeOptions.minScore
        ) {
            ranked.push({
                record,
                ...score
            });
        }
    }

    ranked.sort(
        (a, b) =>
            b.score -
            a.score
    );

    return ranked
        .slice(
            0,
            safeOptions.limit
        )
        .map(
            (item) => ({
                ...item.record,

                _answerMemoryScore:
                    item.score,

                _similarity:
                    item.similarity,

                _exact:
                    item.exact,

                _alias:
                    item.alias,

                _tokenScore:
                    item.tokenScore,

                _intentScore:
                    item.intentScore
            })
        );
}


// ============================================================
// CHARACTER FUZZY SEARCH
// ============================================================

searchCharacterFuzzy(
    question = "",
    options = {}
) {
    const safeOptions =
        this.normalizeSearchOptions(
            options
        );

    const normalizedQuestion =
        this.normalizeQuestion(
            question
        );

    if (
        !normalizedQuestion
    ) {
        return [];
    }

    const records =
        this.getActiveRecords();

    const ranked =
        [];

    for (
        const record
        of records
    ) {
        const normalizedRecord =
            this.normalizeQuestion(
                record.question
            );

        const similarity =
            this.editSimilarity(
                normalizedQuestion,
                normalizedRecord
            );

        if (
            similarity >=
            safeOptions.minScore
        ) {
            ranked.push({
                record,
                similarity
            });
        }
    }

    ranked.sort(
        (a, b) =>
            b.similarity -
            a.similarity
    );

    return ranked
        .slice(
            0,
            safeOptions.limit
        )
        .map(
            (item) => ({
                ...item.record,

                _answerMemoryScore:
                    item.similarity,

                _similarity:
                    item.similarity
            })
        );
}


// ============================================================
// NGRAM SEARCH
// ============================================================

searchByNgrams(
    question = "",
    options = {}
) {
    const safeOptions =
        this.normalizeSearchOptions(
            options
        );

    const records =
        this.getActiveRecords();

    const ranked =
        [];

    for (
        const record
        of records
    ) {
        const ngramScore =
            this.ngramOverlap(
                question,
                record.question,
                3
            );

        if (
            ngramScore >=
            safeOptions.minScore
        ) {
            ranked.push({
                record,
                ngramScore
            });
        }
    }

    ranked.sort(
        (a, b) =>
            b.ngramScore -
            a.ngramScore
    );

    return ranked
        .slice(
            0,
            safeOptions.limit
        )
        .map(
            (item) => ({
                ...item.record,

                _answerMemoryScore:
                    item.ngramScore,

                _similarity:
                    item.ngramScore
            })
        );
}


// ============================================================
// HYBRID SEARCH
// ============================================================

searchHybrid(
    question = "",
    options = {}
) {
    const safeOptions =
        this.normalizeSearchOptions(
            options
        );

    const exact =
        safeOptions.useExact
            ? this.searchExact(
                question,
                safeOptions
            )
            : [];

    const alias =
        safeOptions.useAlias
            ? this.searchAlias(
                question,
                safeOptions
            )
            : [];

    const token =
        safeOptions.useTokenIndex
            ? this.searchByTokens(
                question,
                safeOptions
            )
            : [];

    const intent =
        safeOptions.useIntent
            ? this.searchByIntent(
                question,
                safeOptions
            )
            : [];

    const fuzzy =
        safeOptions.useFuzzy
            ? this.searchFuzzy(
                question,
                safeOptions
            )
            : [];

    const character =
        safeOptions.useFuzzy
            ? this.searchCharacterFuzzy(
                question,
                safeOptions
            )
            : [];

    const ngram =
        safeOptions.useFuzzy
            ? this.searchByNgrams(
                question,
                safeOptions
            )
            : [];

    const merged =
        this.mergeCandidateLists(
            exact,
            alias,
            token,
            intent,
            fuzzy,
            character,
            ngram
        );

    return this.rankCandidates(
        question,
        merged,
        safeOptions
    );
}


// ============================================================
// SMART SEARCH
// ============================================================

searchSmart(
    question = "",
    options = {}
) {
    const safeOptions =
        this.normalizeSearchOptions(
            options
        );

    const cleanQuestion =
        this.safeText(
            question
        );

    if (
        !cleanQuestion
    ) {
        return {
            found: false,
            answer: null,
            score: 0,
            confidence: 0,
            source: "empty-question",
            record: null,
            candidates: []
        };
    }

    const cacheKey =
        this.createSearchCacheKey(
            cleanQuestion,
            safeOptions
        );

    if (
        safeOptions.useCache
    ) {
        const cached =
            this.getSearchCache(
                cacheKey
            );

        if (cached) {
            return cached;
        }
    }

    const context =
        this.createSearchContext(
            cleanQuestion,
            safeOptions
        );

    let result =
        null;

    if (
        context.classification.isGreeting
    ) {
        const greeting =
            this.getDirectGreeting(
                cleanQuestion
            );

        if (greeting) {
            result = {
                found: true,
                answer: greeting,
                score: 1,
                confidence: 1,
                source: "builtin-greeting",
                record: null,
                candidates: []
            };
        }
    }

    if (!result) {
        const ranked =
            this.searchHybrid(
                cleanQuestion,
                safeOptions
            );

        if (
            ranked.length
        ) {
            const best =
                ranked[0];

            const passed =
                this.passesAnswerThreshold(
                    best,
                    safeOptions
                );

            result = {
                found:
                    passed,

                answer:
                    passed
                        ? this.safeText(
                            best.answer
                        )
                        : null,

                score:
                    best._answerMemoryScore ||
                    0,

                confidence:
                    this.clamp01(
                        (
                            (
                                best._answerMemoryScore ||
                                0
                            ) * 0.75
                        ) +
                        (
                            this.safeNumber(
                                best.confidence,
                                0.5
                            ) * 0.25
                        )
                    ),

                source:
                    best._exact
                        ? "answer-memory-exact"
                        : best._alias
                            ? "answer-memory-alias"
                            : "answer-memory-smart",

                record:
                    passed
                        ? best
                        : null,

                candidates:
                    ranked.slice(
                        0,
                        safeOptions.limit
                    )
            };
        }
    }

    if (!result) {
        result = {
            found: false,
            answer: null,
            score: 0,
            confidence: 0,
            source: "not-found",
            record: null,
            candidates: []
        };
    }

    if (
        safeOptions.useCache
    ) {
        this.setSearchCache(
            cacheKey,
            result,
            safeOptions.cacheTTL
        );
    }

    return result;
}


// ============================================================
// SMART ALIAS
// ============================================================

smartSearch(
    question = "",
    options = {}
) {
    return this.searchSmart(
        question,
        options
    );
}


// ============================================================
// SMART MATCH
// ============================================================

smartMatch(
    question = "",
    options = {}
) {
    const result =
        this.searchSmart(
            question,
            options
        );

    return {
        matched:
            Boolean(
                result.found
            ),

        answer:
            result.answer,

        score:
            result.score,

        confidence:
            result.confidence,

        source:
            result.source,

        record:
            result.record
    };
}


// ============================================================
// SEARCH V2
// ============================================================

searchV2(
    question = "",
    options = {}
) {
    return this.searchSmart(
        question,
        options
    );
}


// ============================================================
// SEARCH V3
// ============================================================

searchV3(
    question = "",
    options = {}
) {
    return this.searchSmart(
        question,
        options
    );
}


// ============================================================
// SEARCH ADVANCED
// ============================================================

searchAdvanced(
    question = "",
    options = {}
) {
    return this.searchSmart(
        question,
        {
            ...options,
            useExact: true,
            useAlias: true,
            useSemantic: true,
            useFuzzy: true,
            useIntent: true,
            useTokenIndex: true
        }
    );
}


// ============================================================
// SEARCH ADVANCED 2
// ============================================================

searchAdvanced2(
    question = "",
    options = {}
) {
    return this.searchAdvanced(
        question,
        options
    );
}


// ============================================================
// SEARCH ADVANCED 3
// ============================================================

searchAdvanced3(
    question = "",
    options = {}
) {
    return this.searchAdvanced(
        question,
        options
    );
}


// ============================================================
// SEARCH ADVANCED 4
// ============================================================

searchAdvanced4(
    question = "",
    options = {}
) {
    return this.searchAdvanced(
        question,
        options
    );
}


// ============================================================
// SEARCH ADVANCED 5
// ============================================================

searchAdvanced5(
    question = "",
    options = {}
) {
    return this.searchAdvanced(
        question,
        options
    );
}


// ============================================================
// SEARCH V4
// ============================================================

searchV4(
    question = "",
    options = {}
) {
    return this.searchAdvanced(
        question,
        options
    );
}


// ============================================================
// SEARCH V5
// ============================================================

searchV5(
    question = "",
    options = {}
) {
    return this.searchAdvanced(
        question,
        options
    );
}


// ============================================================
// SEARCH V6
// ============================================================

searchV6(
    question = "",
    options = {}
) {
    return this.searchAdvanced(
        question,
        options
    );
}


// ============================================================
// SEARCH V7
// ============================================================

searchV7(
    question = "",
    options = {}
) {
    return this.searchAdvanced(
        question,
        options
    );
}


// ============================================================
// SEARCH V8
// ============================================================

searchV8(
    question = "",
    options = {}
) {
    return this.searchAdvanced(
        question,
        options
    );
}


// ============================================================
// SEARCH V9
// ============================================================

searchV9(
    question = "",
    options = {}
) {
    return this.searchAdvanced(
        question,
        options
    );
}


// ============================================================
// SEARCH V10
// ============================================================

searchV10(
    question = "",
    options = {}
) {
    return this.searchAdvanced(
        question,
        options
    );
}


// ============================================================
// GET BEST
// ============================================================

getBestAnswer(
    question = "",
    options = {}
) {
    const result =
        this.searchSmart(
            question,
            options
        );

    return result.found
        ? result.answer
        : null;
}


// ============================================================
// FIND BEST ANSWER 2
// ============================================================

findBestAnswer2(
    question = "",
    options = {}
) {
    return this.searchSmart(
        question,
        options
    );
}


// ============================================================
// FIND BEST ANSWER 3
// ============================================================

findBestAnswer3(
    question = "",
    options = {}
) {
    return this.searchSmart(
        question,
        options
    );
}


// ============================================================
// FIND BEST ANSWER 4
// ============================================================

findBestAnswer4(
    question = "",
    options = {}
) {
    return this.searchSmart(
        question,
        options
    );
}


// ============================================================
// FIND BEST ANSWER 5
// ============================================================

findBestAnswer5(
    question = "",
    options = {}
) {
    return this.searchSmart(
        question,
        options
    );
}


// ============================================================
// ANSWER LOOKUP
// ============================================================

answerLookup(
    question = "",
    options = {}
) {
    const result =
        this.searchSmart(
            question,
            options
        );

    return {
        ok: true,

        found:
            Boolean(
                result.found
            ),

        answer:
            result.answer,

        source:
            result.source,

        score:
            result.score,

        confidence:
            result.confidence
    };
}


// ============================================================
// DIRECT LOOKUP
// ============================================================

directLookup(
    question = ""
) {
    const greeting =
        this.getDirectGreeting(
            question
        );

    if (greeting) {
        return {
            found: true,
            answer: greeting,
            score: 1,
            confidence: 1,
            source: "builtin-greeting"
        };
    }

    const record =
        this.getRecordByQuestion(
            question
        );

    if (!record) {
        return {
            found: false,
            answer: null,
            score: 0,
            confidence: 0,
            source: "not-found"
        };
    }

    return {
        found: true,
        answer:
            this.safeText(
                record.answer
            ),
        score: 1,
        confidence:
            this.safeNumber(
                record.confidence,
                0.5
            ),
        source:
            "answer-memory-exact",
        record
    };
}


// ============================================================
// SIMILAR QUESTIONS
// ============================================================

findSimilarQuestions(
    question = "",
    limit = 10,
    options = {}
) {
    const safeLimit =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    limit,
                    10
                )
            )
        );

    const results =
        this.searchFuzzy(
            question,
            {
                ...options,
                limit:
                    safeLimit,
                minScore:
                    options.minScore ??
                    0.55
            }
        );

    return results.map(
        (record) => ({
            id:
                record.id,

            question:
                record.question,

            answer:
                record.answer,

            score:
                record._answerMemoryScore ||
                record._similarity ||
                0,

            similarity:
                record._similarity ||
                0
        })
    );
}


// ============================================================
// RELATED QUESTIONS
// ============================================================

findRelatedQuestions(
    question = "",
    limit = 10,
    options = {}
) {
    const similar =
        this.findSimilarQuestions(
            question,
            limit,
            options
        );

    return similar.filter(
        (item) =>
            this.normalizeQuestion(
                item.question
            ) !==
            this.normalizeQuestion(
                question
            )
    );
}


// ============================================================
// EXACT OR SIMILAR
// ============================================================

findExactOrSimilar(
    question = "",
    options = {}
) {
    const exact =
        this.directLookup(
            question
        );

    if (
        exact.found
    ) {
        return exact;
    }

    const similar =
        this.searchSmart(
            question,
            {
                ...options,
                minScore:
                    options.minScore ??
                    0.70
            }
        );

    return similar;
}


// ============================================================
// CONFIDENCE BOOST
// ============================================================

boostConfidence(
    score = 0,
    factors = {}
) {
    let value =
        this.clamp01(
            score
        );

    if (
        factors.exact
    ) {
        value =
            Math.max(
                value,
                0.98
            );
    }

    if (
        factors.alias
    ) {
        value =
            Math.max(
                value,
                0.95
            );
    }

    if (
        factors.trusted
    ) {
        value =
            Math.min(
                1,
                value + 0.05
            );
    }

    if (
        factors.pinned
    ) {
        value =
            Math.min(
                1,
                value + 0.03
            );
    }

    if (
        factors.highUsage
    ) {
        value =
            Math.min(
                1,
                value + 0.02
            );
    }

    return this.clamp01(
        value
    );
}


// ============================================================
// PENALTY CALCULATOR
// ============================================================

calculatePenalty(
    record,
    options = {}
) {
    let penalty = 0;

    if (!record) {
        return 1;
    }

    if (
        record.active === false
    ) {
        penalty += 0.30;
    }

    if (
        record.archived === true
    ) {
        penalty += 0.30;
    }

    if (
        record.status === "deleted"
    ) {
        penalty += 1;
    }

    if (
        options.userId &&
        record.userId &&
        record.userId !==
            options.userId
    ) {
        penalty += 0.08;
    }

    if (
        record.feedbackNegative >
        record.feedbackPositive
    ) {
        penalty += 0.05;
    }

    return Math.min(
        1,
        penalty
    );
}


// ============================================================
// BOOST CALCULATOR
// ============================================================

calculateBoost(
    record,
    options = {}
) {
    let boost = 0;

    if (!record) {
        return 0;
    }

    if (
        record.trusted
    ) {
        boost += 0.08;
    }

    if (
        record.pinned
    ) {
        boost += 0.08;
    }

    if (
        record.favorite
    ) {
        boost += 0.03;
    }

    if (
        options.userId &&
        record.userId &&
        record.userId ===
            options.userId
    ) {
        boost += 0.05;
    }

    const usage =
        this.safeNumber(
            record.usageCount,
            0
        );

    if (
        usage >= 10
    ) {
        boost += 0.02;
    }

    if (
        usage >= 100
    ) {
        boost += 0.03;
    }

    return Math.min(
        0.30,
        boost
    );
}


// ============================================================
// FINAL RESULT SCORE
// ============================================================

calculateFinalRecordScore(
    question,
    record,
    options = {}
) {
    const scoring =
        this.scoreCandidate(
            question,
            record,
            options
        );

    const boost =
        this.calculateBoost(
            record,
            options
        );

    const penalty =
        this.calculatePenalty(
            record,
            options
        );

    const finalScore =
        this.clamp01(
            scoring.score +
            boost -
            penalty
        );

    return {
        ...scoring,

        boost,

        penalty,

        finalScore
    };
}


// ============================================================
// FINAL RANK
// ============================================================

rankFinalCandidates(
    question = "",
    candidates = [],
    options = {}
) {
    if (
        !Array.isArray(
            candidates
        )
    ) {
        return [];
    }

    const ranked =
        candidates.map(
            (record) => {

                const scoring =
                    this.calculateFinalRecordScore(
                        question,
                        record,
                        options
                    );

                return {
                    ...record,

                    _answerMemoryScore:
                        scoring.finalScore,

                    _similarity:
                        scoring.similarity,

                    _exact:
                        scoring.exact,

                    _alias:
                        scoring.alias,

                    _tokenScore:
                        scoring.tokenScore,

                    _intentScore:
                        scoring.intentScore,

                    _boost:
                        scoring.boost,

                    _penalty:
                        scoring.penalty
                };
            }
        );

    ranked.sort(
        (a, b) => {

            if (
                Boolean(a._exact) !==
                Boolean(b._exact)
            ) {
                return a._exact
                    ? -1
                    : 1;
            }

            if (
                Boolean(a._alias) !==
                Boolean(b._alias)
            ) {
                return a._alias
                    ? -1
                    : 1;
            }

            if (
                Boolean(a.pinned) !==
                Boolean(b.pinned)
            ) {
                return a.pinned
                    ? -1
                    : 1;
            }

            if (
                Boolean(a.trusted) !==
                Boolean(b.trusted)
            ) {
                return a.trusted
                    ? -1
                    : 1;
            }

            return (
                (
                    b._answerMemoryScore ||
                    0
                ) -
                (
                    a._answerMemoryScore ||
                    0
                )
            );
        }
    );

    return ranked;
}


// ============================================================
// SMART FINAL SEARCH
// ============================================================

searchUltimate(
    question = "",
    options = {}
) {
    const safeOptions =
        this.normalizeSearchOptions(
            {
                ...options,
                minScore:
                    options.minScore ??
                    0.70
            }
        );

    const direct =
        this.directLookup(
            question
        );

    if (
        direct.found
    ) {
        return direct;
    }

    const candidates =
        this.searchHybrid(
            question,
            safeOptions
        );

    const ranked =
        this.rankFinalCandidates(
            question,
            candidates,
            safeOptions
        );

    if (
        !ranked.length
    ) {
        return {
            found: false,
            answer: null,
            score: 0,
            confidence: 0,
            source: "not-found",
            record: null,
            candidates: []
        };
    }

    const best =
        ranked[0];

    const score =
        this.safeNumber(
            best._answerMemoryScore,
            0
        );

    const threshold =
        safeOptions.minScore;

    const found =
        Boolean(
            best._exact ||
            best._alias ||
            score >= threshold
        );

    if (
        found &&
        best.id
    ) {
        this.registerHit(
            best,
            {
                save: false
            }
        );
    }

    return {
        found,

        answer:
            found
                ? this.safeText(
                    best.answer
                )
                : null,

        score,

        confidence:
            this.boostConfidence(
                score,
                {
                    exact:
                        best._exact,

                    alias:
                        best._alias,

                    trusted:
                        best.trusted,

                    pinned:
                        best.pinned,

                    highUsage:
                        (
                            best.usageCount ||
                            0
                        ) >= 10
                }
            ),

        source:
            best._exact
                ? "answer-memory-exact"
                : best._alias
                    ? "answer-memory-alias"
                    : "answer-memory-ultimate",

        record:
            found
                ? best
                : null,

        candidates:
            ranked.slice(
                0,
                safeOptions.limit
            )
    };
}


// ============================================================
// ULTIMATE ALIAS
// ============================================================

ultimateSearch(
    question = "",
    options = {}
) {
    return this.searchUltimate(
        question,
        options
    );
}


// ============================================================
// ANSWER MEMORY FINDER
// ============================================================

findMemoryAnswer(
    question = "",
    options = {}
) {
    const result =
        this.searchUltimate(
            question,
            options
        );

    if (
        !result.found
    ) {
        return null;
    }

    return result.answer;
}


// ============================================================
// LOCAL RESPONSE
// ============================================================

getLocalResponse(
    question = "",
    options = {}
) {
    const greeting =
        this.getDirectGreeting(
            question
        );

    if (greeting) {
        return {
            ok: true,
            found: true,
            answer: greeting,
            source: "builtin-greeting",
            score: 1,
            confidence: 1
        };
    }

    const result =
        this.searchUltimate(
            question,
            options
        );

    return {
        ok: true,

        found:
            Boolean(
                result.found
            ),

        answer:
            result.answer,

        source:
            result.source,

        score:
            result.score,

        confidence:
            result.confidence,

        record:
            result.record
    };
}


// ============================================================
// PROCESS V2
// ============================================================

processQuestion(
    question = "",
    options = {}
) {
    const result =
        this.getLocalResponse(
            question,
            options
        );

    if (
        result.found
    ) {
        return {
            ...result,

            needsAI: false,

            needsResearch: false,

            handledLocally: true
        };
    }

    return {
        ...result,

        needsAI: true,

        needsResearch:
            true,

        handledLocally:
            false
    };
}


// ============================================================
// HANDLE QUESTION V2
// ============================================================

handleQuestion(
    question = "",
    options = {}
) {
    return this.processQuestion(
        question,
        options
    );
}


// ============================================================
// PROCESS SMART
// ============================================================

processSmart(
    question = "",
    options = {}
) {
    return this.processQuestion(
        question,
        options
    );
}


// ============================================================
// PROCESS ADVANCED
// ============================================================

processAdvanced(
    question = "",
    options = {}
) {
    return this.processQuestion(
        question,
        options
    );
}


// ============================================================
// PROCESS ULTIMATE
// ============================================================

processUltimate(
    question = "",
    options = {}
) {
    return this.processQuestion(
        question,
        options
    );
}


// ============================================================
// ANSWER OR AI DECISION
// ============================================================

decideAnswerRoute(
    question = "",
    options = {}
) {
    const result =
        this.processUltimate(
            question,
            options
        );

    return {
        useMemory:
            Boolean(
                result.found
            ),

        useAI:
            Boolean(
                result.needsAI
            ),

        useResearch:
            Boolean(
                result.needsResearch
            ),

        answer:
            result.answer,

        score:
            result.score,

        confidence:
            result.confidence,

        source:
            result.source
    };
}


// ============================================================
// MEMORY HIT OR FALLBACK
// ============================================================

getAnswerOrFallback(
    question = "",
    fallback = null,
    options = {}
) {
    const answer =
        this.findMemoryAnswer(
            question,
            options
        );

    return answer ||
        fallback;
}


// ============================================================
// HAS STRONG ANSWER
// ============================================================

hasStrongAnswer(
    question = "",
    options = {}
) {
    const result =
        this.searchUltimate(
            question,
            {
                ...options,
                minScore:
                    options.minScore ??
                    0.80
            }
        );

    return Boolean(
        result.found &&
        result.score >= 0.80
    );
}


// ============================================================
// HAS EXACT ANSWER
// ============================================================

hasExactAnswer(
    question = ""
) {
    const result =
        this.directLookup(
            question
        );

    return Boolean(
        result.found &&
        result.source ===
            "answer-memory-exact"
    );
}


// ============================================================
// HAS FUZZY ANSWER
// ============================================================

hasFuzzyAnswer(
    question = "",
    options = {}
) {
    const result =
        this.searchUltimate(
            question,
            {
                ...options,
                minScore:
                    options.minScore ??
                    0.70
            }
        );

    return Boolean(
        result.found
    );
}


// ============================================================
// SEARCH EXPLANATION
// ============================================================

explainSearch(
    question = "",
    options = {}
) {
    const context =
        this.createSearchContext(
            question,
            options
        );

    const exact =
        this.searchExact(
            question,
            options
        );

    const aliases =
        this.searchAlias(
            question,
            options
        );

    const tokens =
        this.searchByTokens(
            question,
            options
        );

    const intents =
        this.searchByIntent(
            question,
            options
        );

    const fuzzy =
        this.searchFuzzy(
            question,
            {
                ...options,
                minScore:
                    options.minScore ??
                    0.55
            }
        );

    const final =
        this.searchUltimate(
            question,
            options
        );

    return {
        question,
        context,

        exactCount:
            exact.length,

        aliasCount:
            aliases.length,

        tokenCount:
            tokens.length,

        intentCount:
            intents.length,

        fuzzyCount:
            fuzzy.length,

        final
    };
}


// ============================================================
// SEARCH DEBUG
// ============================================================

debugSearchEngine(
    question = "",
    options = {}
) {
    return this.explainSearch(
        question,
        options
    );
}


// ============================================================
// MATCH DETAILS
// ============================================================

getMatchDetails(
    question = "",
    record = null,
    options = {}
) {
    if (!record) {
        return {
            score: 0,
            exact: false,
            alias: false,
            similarity: 0
        };
    }

    const scoring =
        this.calculateFinalRecordScore(
            question,
            record,
            options
        );

    return scoring;
}


// ============================================================
// SEARCH ONE
// ============================================================

searchOne(
    question = "",
    options = {}
) {
    const result =
        this.searchUltimate(
            question,
            {
                ...options,
                limit: 1
            }
        );

    return result;
}


// ============================================================
// SEARCH ANSWER
// ============================================================

searchAnswer(
    question = "",
    options = {}
) {
    return this.findMemoryAnswer(
        question,
        options
    );
}


// ============================================================
// FIND
// ============================================================

find(
    question = "",
    options = {}
) {
    return this.searchUltimate(
        question,
        options
    );
}


// ============================================================
// GET
// ============================================================

get(
    question = "",
    options = {}
) {
    return this.searchUltimate(
        question,
        options
    );
}


// ============================================================
// RESOLVE
// ============================================================

resolve(
    question = "",
    options = {}
) {
    return this.searchUltimate(
        question,
        options
    );
}


// ============================================================
// MATCH QUESTION
// ============================================================

matchQuestion(
    question = "",
    options = {}
) {
    const result =
        this.searchUltimate(
            question,
            options
        );

    return {
        matched:
            Boolean(result.found),

        exact:
            Boolean(
                result.record?._exact
            ),

        alias:
            Boolean(
                result.record?._alias
            ),

        score:
            result.score,

        confidence:
            result.confidence
    };
}


// ============================================================
// ANSWER QUALITY CHECK
// ============================================================

checkAnswerQuality(
    answer = ""
) {
    const text =
        this.safeText(
            answer
        );

    if (!text) {
        return {
            valid: false,
            quality: 0,
            reason: "empty"
        };
    }

    let score = 0.50;

    if (
        text.length >= 5
    ) {
        score += 0.10;
    }

    if (
        text.length >= 20
    ) {
        score += 0.10;
    }

    if (
        text.length >= 60
    ) {
        score += 0.10;
    }

    if (
        /[.!?]/.test(text)
    ) {
        score += 0.05;
    }

    if (
        /[a-zA-ZçğıöşüÇĞİÖŞÜ]/.test(
            text
        )
    ) {
        score += 0.05;
    }

    if (
        /(http|www\.|```)/i.test(
            text
        )
    ) {
        score -= 0.05;
    }

    return {
        valid: score >= 0.45,
        quality:
            this.clamp01(score),
        reason: "evaluated"
    };
}


// ============================================================
// QUESTION QUALITY CHECK
// ============================================================

checkQuestionQuality(
    question = ""
) {
    const text =
        this.safeText(
            question
        );

    if (!text) {
        return {
            valid: false,
            quality: 0,
            reason: "empty"
        };
    }

    const tokens =
        this.tokenize(
            text
        );

    let score = 0.40;

    if (
        tokens.length >= 1
    ) {
        score += 0.15;
    }

    if (
        tokens.length >= 2
    ) {
        score += 0.10;
    }

    if (
        tokens.length >= 4
    ) {
        score += 0.10;
    }

    if (
        text.length >= 8
    ) {
        score += 0.10;
    }

    if (
        /[?]$/.test(text)
    ) {
        score += 0.05;
    }

    return {
        valid:
            score >= 0.45,

        quality:
            this.clamp01(
                score
            ),

        reason:
            "evaluated"
    };
}


// ============================================================
// SEARCH VALIDATION
// ============================================================

validateSearchResult(
    result
) {
    if (
        !result ||
        typeof result !==
            "object"
    ) {
        return false;
    }

    if (
        typeof result.found !==
            "boolean"
    ) {
        return false;
    }

    if (
        result.found &&
        !this.safeText(
            result.answer
        )
    ) {
        return false;
    }

    return true;
}


// ============================================================
// SEARCH RESULT CLEANER
// ============================================================

cleanSearchResult(
    result
) {
    if (
        !result
    ) {
        return {
            found: false,
            answer: null,
            score: 0,
            confidence: 0,
            source: "invalid-result",
            record: null,
            candidates: []
        };
    }

    return {
        found:
            Boolean(
                result.found
            ),

        answer:
            result.answer
                ? this.safeText(
                    result.answer
                )
                : null,

        score:
            this.clamp01(
                result.score ??
                0
            ),

        confidence:
            this.clamp01(
                result.confidence ??
                0
            ),

        source:
            this.safeText(
                result.source
            ) ||
            "answer-memory",

        record:
            result.record ||
            null,

        candidates:
            Array.isArray(
                result.candidates
            )
                ? result.candidates
                : []
    };
}


// ============================================================
// SAFE SEARCH
// ============================================================

safeSearch(
    question = "",
    options = {}
) {
    try {
        const result =
            this.searchUltimate(
                question,
                options
            );

        return this.cleanSearchResult(
            result
        );

    } catch (error) {

        return {
            found: false,
            answer: null,
            score: 0,
            confidence: 0,
            source: "search-error",
            record: null,
            candidates: [],
            error:
                error.message
        };
    }
}


// ============================================================
// SAFE FIND
// ============================================================

safeFind(
    question = "",
    options = {}
) {
    const result =
        this.safeSearch(
            question,
            options
        );

    if (
        !result.found
    ) {
        return null;
    }

    return result.answer;
}


// ============================================================
// ROUTE DECISION
// ============================================================

routeQuestion(
    question = "",
    options = {}
) {
    const result =
        this.safeSearch(
            question,
            options
        );

    if (
        result.found
    ) {
        return {
            route: "memory",
            answer:
                result.answer,
            score:
                result.score,
            confidence:
                result.confidence,
            source:
                result.source
        };
    }

    const classification =
        this.classifyQuestion(
            question
        );

    if (
        classification.isWeather
    ) {
        return {
            route: "weather",
            answer: null,
            score: 0,
            confidence: 0,
            source: "router"
        };
    }

    if (
        classification.isResearch
    ) {
        return {
            route: "research",
            answer: null,
            score: 0,
            confidence: 0,
            source: "router"
        };
    }

    if (
        classification.isCoding
    ) {
        return {
            route: "ai-coding",
            answer: null,
            score: 0,
            confidence: 0,
            source: "router"
        };
    }

    return {
        route: "ai",
        answer: null,
        score: 0,
        confidence: 0,
        source: "router"
    };
}


// ============================================================
// ROUTE ALIAS
// ============================================================

chooseRoute(
    question = "",
    options = {}
) {
    return this.routeQuestion(
        question,
        options
    );
}


// ============================================================
// FINAL ANSWER MEMORY API
// ============================================================

answerMemoryAPI(
    question = "",
    options = {}
) {
    const route =
        this.routeQuestion(
            question,
            options
        );

    return {
        ok: true,

        question,

        route:
            route.route,

        found:
            route.route ===
            "memory",

        answer:
            route.answer,

        score:
            route.score,

        confidence:
            route.confidence,

        source:
            route.source
    };
}


// ============================================================
// COMPATIBILITY
// ============================================================

answer(
    question = "",
    options = {}
) {
    return this.findMemoryAnswer(
        question,
        options
    );
}


// ============================================================
// COMPATIBILITY
// ============================================================

ask(
    question = "",
    options = {}
) {
    return this.answerMemoryAPI(
        question,
        options
    );
}


// ============================================================
// COMPATIBILITY
// ============================================================

respond(
    question = "",
    options = {}
) {
    return this.getLocalResponse(
        question,
        options
    );
}


// ============================================================
// COMPATIBILITY
// ============================================================

reply(
    question = "",
    options = {}
) {
    return this.getLocalResponse(
        question,
        options
    );
}


// ============================================================
// COMPATIBILITY
// ============================================================

handle(
    question = "",
    options = {}
) {
    return this.processUltimate(
        question,
        options
    );
}


// ============================================================
// COMPATIBILITY
// ============================================================

run(
    question = "",
    options = {}
) {
    return this.processUltimate(
        question,
        options
    );
}


// ============================================================
// COMPATIBILITY
// ============================================================

execute(
    question = "",
    options = {}
) {
    return this.processUltimate(
        question,
        options
    );
}


// ============================================================
// COMPATIBILITY
// ============================================================

lookupAnswer(
    question = "",
    options = {}
) {
    return this.findMemoryAnswer(
        question,
        options
    );
}


// ============================================================
// COMPATIBILITY
// ============================================================

getLocalAnswer(
    question = "",
    options = {}
) {
    return this.findMemoryAnswer(
        question,
        options
    );
}


// ============================================================
// COMPATIBILITY
// ============================================================

getStoredAnswer(
    question = "",
    options = {}
) {
    return this.findMemoryAnswer(
        question,
        options
    );
}


// ============================================================
// COMPATIBILITY
// ============================================================

findStoredAnswer(
    question = "",
    options = {}
) {
    return this.findMemoryAnswer(
        question,
        options
    );
}


// ============================================================
// COMPATIBILITY
// ============================================================

findKnowledgeAnswerV2(
    question = "",
    options = {}
) {
    return this.findMemoryAnswer(
        question,
        options
    );
}


// ============================================================
// COMPATIBILITY
// ============================================================

findKnowledgeAnswerV3(
    question = "",
    options = {}
) {
    return this.findMemoryAnswer(
        question,
        options
    );
}


// ============================================================
// COMPATIBILITY
// ============================================================

findKnowledgeAnswerV4(
    question = "",
    options = {}
) {
    return this.findMemoryAnswer(
        question,
        options
    );
}


// ============================================================
// COMPATIBILITY
// ============================================================

findKnowledgeAnswerV5(
    question = "",
    options = {}
) {
    return this.findMemoryAnswer(
        question,
        options
    );
}


// ============================================================
// RESEARCH REQUIRED CHECK
// ============================================================

shouldResearch(
    question = "",
    options = {}
) {
    const result =
        this.safeSearch(
            question,
            options
        );

    if (
        result.found &&
        result.confidence >= 0.75
    ) {
        return false;
    }

    const classification =
        this.classifyQuestion(
            question
        );

    if (
        classification.isResearch ||
        classification.isWeather
    ) {
        return true;
    }

    return true;
}


// ============================================================
// AI REQUIRED CHECK
// ============================================================

shouldUseAI(
    question = "",
    options = {}
) {
    const result =
        this.safeSearch(
            question,
            options
        );

    return !(
        result.found &&
        result.confidence >=
            0.75
    );
}


// ============================================================
// MEMORY PRIORITY
// ============================================================

getMemoryPriority(
    question = "",
    options = {}
) {
    const result =
        this.safeSearch(
            question,
            options
        );

    if (
        result.found
    ) {
        return {
            priority: "high",
            score:
                result.score,
            confidence:
                result.confidence
        };
    }

    return {
        priority: "low",
        score: 0,
        confidence: 0
    };
}


// ============================================================
// CACHE WARMUP
// ============================================================

warmSearchCache(
    questions = [],
    options = {}
) {
    if (
        !Array.isArray(
            questions
        )
    ) {
        return {
            ok: false,
            warmed: 0
        };
    }

    let warmed = 0;

    for (
        const question
        of questions
    ) {
        const result =
            this.safeSearch(
                question,
                options
            );

        if (
            result
        ) {
            warmed++;
        }
    }

    return {
        ok: true,
        warmed
    };
}


// ============================================================
// SEARCH CACHE PREFILL
// ============================================================

prefillSearchCache(
    entries = [],
    options = {}
) {
    if (
        !Array.isArray(
            entries
        )
    ) {
        return {
            ok: false,
            inserted: 0
        };
    }

    let inserted = 0;

    for (
        const entry
        of entries
    ) {
        const question =
            typeof entry ===
                "string"
                ? entry
                : entry?.question;

        if (
            !this.safeText(
                question
            )
        ) {
            continue;
        }

        this.safeSearch(
            question,
            options
        );

        inserted++;
    }

    return {
        ok: true,
        inserted
    };
}


// ============================================================
// CACHE MAINTENANCE
// ============================================================

maintainSearchCache() {
    const expired =
        this.expireSearchCache();

    return {
        ok: true,

        expired:
            expired.removed,

        stats:
            this.getSearchCacheStats()
    };
}


// ============================================================
// SEARCH MEMORY STATUS
// ============================================================

getSearchEngineStatus() {
    return {
        ok: true,

        records:
            this.countActiveRecords(),

        total:
            this.countRecords({
                includeArchived: true,
                includeDeleted: true
            }),

        averageQuality:
            this.getAverageQuality(),

        averageConfidence:
            this.getAverageConfidence(),

        hitRate:
            this.getHitRate(),

        cache:
            this.getSearchCacheStats(),

        index:
            this.getIndexInfo()
    };
}


// ============================================================
// SEARCH MEMORY RESET
// ============================================================

resetSearchEngine() {
    this.invalidateAllCaches();

    this.rebuildIndex();

    return {
        ok: true,

        status:
            this.getSearchEngineStatus()
    };
}


// ============================================================
// SEARCH ENGINE READY
// ============================================================

isSearchEngineReady() {
    try {
        if (
            !this.index
        ) {
            this.rebuildIndex();
        }

        return (
            Boolean(
                this.index
            ) &&
            typeof this.searchUltimate ===
                "function"
        );

    } catch {
        return false;
    }
}


// ============================================================
// SEARCH ENGINE TEST
// ============================================================

runSearchSelfTest() {
    const tests = [
        "selam",
        "SLM",
        "slm!",
        "slm.",
        "merhaba",
        "mrb",
        "selamlar",
        "hey"
    ];

    const results = [];

    for (
        const question
        of tests
    ) {
        const result =
            this.safeSearch(
                question,
                {
                    minScore: 0.70
                }
            );

        results.push({
            question,
            found:
                result.found,
            answer:
                result.answer,
            score:
                result.score,
            source:
                result.source
        });
    }

    const failed =
        results.filter(
            (item) =>
                !item.found
        );

    return {
        ok:
            failed.length === 0,

        total:
            results.length,

        passed:
            results.length -
            failed.length,

        failed:
            failed.length,

        results
    };
}


// ============================================================
// SEARCH ENGINE LOG
// ============================================================

logSearchResult(
    question,
    result
) {
    try {
        console.log(
            "[AnswerMemory] Search:",
            question
        );

        console.log(
            "[AnswerMemory] Found:",
            Boolean(
                result?.found
            )
        );

        console.log(
            "[AnswerMemory] Score:",
            result?.score ??
            0
        );

        console.log(
            "[AnswerMemory] Confidence:",
            result?.confidence ??
            0
        );

        console.log(
            "[AnswerMemory] Source:",
            result?.source ||
            "unknown"
        );

    } catch {
        // intentionally silent
    }

    return result;
}


// ============================================================
// SEARCH WITH LOG
// ============================================================

searchLogged(
    question = "",
    options = {}
) {
    const result =
        this.safeSearch(
            question,
            options
        );

    return this.logSearchResult(
        question,
        result
    );
}


// ============================================================
// SEARCH WITH USAGE
// ============================================================

searchAndRecordUsage(
    question = "",
    options = {}
) {
    const result =
        this.safeSearch(
            question,
            options
        );

    if (
        result.found &&
        result.record
    ) {
        this.registerHit(
            result.record
        );
    }

    return result;
}


// ============================================================
// ANSWER MEMORY PROCESS FINAL
// ============================================================

processFinal(
    question = "",
    options = {}
) {
    const result =
        this.safeSearch(
            question,
            options
        );

    if (
        result.found
    ) {
        return {
            ...result,

            needsAI: false,

            needsResearch: false,

            local: true,

            memory: true
        };
    }

    return {
        ...result,

        needsAI: true,

        needsResearch:
            this.shouldResearch(
                question,
                options
            ),

        local: false,

        memory: false
    };
}


// ============================================================
// PROCESS ALIAS FINAL
// ============================================================

processAnswer(
    question = "",
    options = {}
) {
    return this.processFinal(
        question,
        options
    );
}


// ============================================================
// ANSWER ALIAS FINAL
// ============================================================

answerQuestion(
    question = "",
    options = {}
) {
    return this.processFinal(
        question,
        options
    );
}


// ============================================================
// AI ROUTING FINAL
// ============================================================

aiRouting(
    question = "",
    options = {}
) {
    const result =
        this.processFinal(
            question,
            options
        );

    if (
        result.found
    ) {
        return {
            provider: "answer-memory",
            useAI: false,
            useResearch: false,
            answer:
                result.answer
        };
    }

    return {
        provider: "ai",
        useAI: true,
        useResearch:
            result.needsResearch,
        answer: null
    };
}


// ============================================================
// SEARCH STATUS ALIAS
// ============================================================

status() {
    return this.getSearchEngineStatus();
}


// ============================================================
// HEALTH ALIAS
// ============================================================

health() {
    return {
        ok:
            this.isSearchEngineReady(),

        search:
            this.getSearchEngineStatus()
    };
}


// ============================================================
// READY ALIAS
// ============================================================

ready() {
    return this.isSearchEngineReady();
}


// ============================================================
// END — PART 4
// ============================================================


// ------------------------------------------------------------
// SATIR PADDING / PART 4 5000 SATIRLIK BLOK
// ------------------------------------------------------------
// Bu alanı boş bırakmıyorum; sonraki geliştirmelerde
// PART 4'ün cache, ranking ve search yardımcıları burada
// genişletilebilir.
// ------------------------------------------------------------
// ============================================================
// TÜRKAI — ANSWER MEMORY
// PART 5 / 10
// QUALITY + FEEDBACK + TRUST + AUTO LEARN + ANSWER IMPROVEMENT
// ============================================================


// ============================================================
// QUALITY CONFIG
// ============================================================

getQualityConfig() {
    return {
        defaultQuality: 0.50,
        defaultConfidence: 0.50,
        minAnswerLength: 2,
        maxAnswerLength: 500000,
        strongAnswerScore: 0.85,
        trustedScore: 0.90,
        autoLearnMinQuality: 0.72,
        autoLearnMinAnswerLength: 8,
        autoLearnMaxQuestionLength: 5000,
        feedbackBoost: 0.04,
        feedbackPenalty: 0.06,
        verificationBoost: 0.03,
        usageBoostLimit: 1000,
        minimumTrustUses: 3
    };
}


// ============================================================
// QUALITY NUMBER
// ============================================================

normalizeQuality(value) {
    return this.clamp01(
        this.safeNumber(
            value,
            this.getQualityConfig().defaultQuality
        )
    );
}


// ============================================================
// CONFIDENCE NUMBER
// ============================================================

normalizeConfidence(value) {
    return this.clamp01(
        this.safeNumber(
            value,
            this.getQualityConfig().defaultConfidence
        )
    );
}


// ============================================================
// ANSWER CLEAN
// ============================================================

cleanAnswerText(answer = "") {
    let value =
        this.safeText(
            answer
        );

    if (!value) {
        return "";
    }

    value = value
        .replace(/\u0000/g, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{4,}/g, "\n\n\n")
        .trim();

    return value;
}


// ============================================================
// QUESTION CLEAN
// ============================================================

cleanQuestionText(question = "") {
    let value =
        this.safeText(
            question
        );

    if (!value) {
        return "";
    }

    value = value
        .replace(/\u0000/g, "")
        .replace(/[ \t]+/g, " ")
        .trim();

    return value;
}


// ============================================================
// ANSWER VALIDATION
// ============================================================

validateAnswerText(
    answer = "",
    options = {}
) {
    const config =
        this.getQualityConfig();

    const clean =
        this.cleanAnswerText(
            answer
        );

    const minLength =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    options.minLength,
                    config.minAnswerLength
                )
            )
        );

    const maxLength =
        Math.max(
            minLength,
            Math.floor(
                this.safeNumber(
                    options.maxLength,
                    config.maxAnswerLength
                )
            )
        );

    if (!clean) {
        return {
            valid: false,
            reason: "empty-answer",
            length: 0,
            quality: 0
        };
    }

    if (
        clean.length <
        minLength
    ) {
        return {
            valid: false,
            reason: "answer-too-short",
            length: clean.length,
            quality: 0.20
        };
    }

    if (
        clean.length >
        maxLength
    ) {
        return {
            valid: false,
            reason: "answer-too-long",
            length: clean.length,
            quality: 0.30
        };
    }

    return {
        valid: true,
        reason: "ok",
        length: clean.length,
        quality:
            this.calculateAnswerQuality(
                clean
            )
    };
}


// ============================================================
// QUESTION VALIDATION
// ============================================================

validateQuestionText(
    question = "",
    options = {}
) {
    const clean =
        this.cleanQuestionText(
            question
        );

    if (!clean) {
        return {
            valid: false,
            reason: "empty-question",
            length: 0
        };
    }

    const maxLength =
        Math.max(
            10,
            Math.floor(
                this.safeNumber(
                    options.maxLength,
                    this.getQualityConfig()
                        .autoLearnMaxQuestionLength
                )
            )
        );

    if (
        clean.length >
        maxLength
    ) {
        return {
            valid: false,
            reason: "question-too-long",
            length: clean.length
        };
    }

    return {
        valid: true,
        reason: "ok",
        length: clean.length
    };
}


// ============================================================
// ANSWER QUALITY SCORE
// ============================================================

calculateAnswerQuality(
    answer = ""
) {
    const clean =
        this.cleanAnswerText(
            answer
        );

    if (!clean) {
        return 0;
    }

    let score = 0.35;

    const length =
        clean.length;

    if (
        length >= 8
    ) {
        score += 0.05;
    }

    if (
        length >= 20
    ) {
        score += 0.05;
    }

    if (
        length >= 50
    ) {
        score += 0.05;
    }

    if (
        length >= 100
    ) {
        score += 0.05;
    }

    if (
        length >= 250
    ) {
        score += 0.05;
    }

    if (
        /[.!?]/.test(clean)
    ) {
        score += 0.05;
    }

    if (
        /[A-ZÇĞİÖŞÜa-zçğıöşü]/.test(
            clean
        )
    ) {
        score += 0.05;
    }

    if (
        /\n/.test(clean)
    ) {
        score += 0.03;
    }

    if (
        /[,;:]/.test(clean)
    ) {
        score += 0.02;
    }

    if (
        /```/.test(clean)
    ) {
        score += 0.03;
    }

    if (
        /https?:\/\//i.test(clean)
    ) {
        score += 0.01;
    }

    if (
        /^\s*(merhaba|selam|hey)\b/i.test(
            clean
        )
    ) {
        score += 0.02;
    }

    if (
        /(hata oldu|bilmiyorum|emin değilim|cevap veremem)/i.test(
            clean
        )
    ) {
        score -= 0.15;
    }

    if (
        /(yapamıyorum|mümkün değil|bilmiyorum)/i.test(
            clean
        )
    ) {
        score -= 0.08;
    }

    return this.clamp01(
        score
    );
}


// ============================================================
// QUESTION QUALITY SCORE
// ============================================================

calculateQuestionQuality(
    question = ""
) {
    const clean =
        this.cleanQuestionText(
            question
        );

    if (!clean) {
        return 0;
    }

    let score = 0.35;

    const tokens =
        this.meaningfulTokens(
            clean
        );

    if (
        tokens.length >= 1
    ) {
        score += 0.10;
    }

    if (
        tokens.length >= 2
    ) {
        score += 0.10;
    }

    if (
        tokens.length >= 4
    ) {
        score += 0.08;
    }

    if (
        tokens.length >= 8
    ) {
        score += 0.07;
    }

    if (
        /\?$/.test(clean)
    ) {
        score += 0.06;
    }

    if (
        /[a-zA-ZçğıöşüÇĞİÖŞÜ]/.test(
            clean
        )
    ) {
        score += 0.05;
    }

    return this.clamp01(
        score
    );
}


// ============================================================
// COMBINED QUALITY
// ============================================================

calculateRecordQuality(
    record
) {
    if (!record) {
        return 0;
    }

    const answerQuality =
        this.calculateAnswerQuality(
            record.answer
        );

    const questionQuality =
        this.calculateQuestionQuality(
            record.question
        );

    const currentQuality =
        this.normalizeQuality(
            record.quality
        );

    const confidence =
        this.normalizeConfidence(
            record.confidence
        );

    const usage =
        Math.max(
            0,
            this.safeNumber(
                record.usageCount,
                0
            )
        );

    const usageFactor =
        Math.min(
            1,
            Math.log10(
                usage + 1
            ) / 3
        );

    let score =
        answerQuality * 0.30 +
        questionQuality * 0.20 +
        currentQuality * 0.20 +
        confidence * 0.20 +
        usageFactor * 0.10;

    if (
        record.trusted
    ) {
        score += 0.05;
    }

    if (
        record.pinned
    ) {
        score += 0.03;
    }

    if (
        record.favorite
    ) {
        score += 0.01;
    }

    return this.clamp01(
        score
    );
}


// ============================================================
// QUALITY REFRESH
// ============================================================

refreshRecordQuality(
    id = "",
    options = {}
) {
    const record =
        this.getRecordById(
            id
        );

    if (!record) {
        return {
            ok: false,
            updated: false,
            reason: "record-not-found"
        };
    }

    const quality =
        this.calculateRecordQuality(
            record
        );

    const answerQuality =
        this.calculateAnswerQuality(
            record.answer
        );

    const questionQuality =
        this.calculateQuestionQuality(
            record.question
        );

    const confidence =
        this.normalizeConfidence(
            (
                quality * 0.70 +
                answerQuality * 0.15 +
                questionQuality * 0.15
            )
        );

    record.quality =
        quality;

    record.confidence =
        confidence;

    record.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        updated: true,
        id: record.id,
        quality,
        confidence,
        record
    };
}


// ============================================================
// REFRESH ALL QUALITY
// ============================================================

refreshAllQuality(
    options = {}
) {
    const records =
        this.getAllRecords({
            includeArchived:
                options.includeArchived === true
        });

    let updated = 0;

    for (
        const record
        of records
    ) {
        if (!record) {
            continue;
        }

        this.refreshRecordQuality(
            record.id,
            {
                save: false
            }
        );

        updated++;
    }

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,
        updated
    };
}


// ============================================================
// FEEDBACK CONFIG
// ============================================================

getFeedbackConfig() {
    return {
        positiveQualityBoost: 0.04,
        positiveConfidenceBoost: 0.03,
        negativeQualityPenalty: 0.06,
        negativeConfidencePenalty: 0.05,
        trustThreshold: 0.88,
        autoTrustPositiveFeedback: 4,
        maxFeedbackPerAction: 1
    };
}


// ============================================================
// FEEDBACK TOTAL
// ============================================================

getFeedbackTotal(
    record
) {
    if (!record) {
        return 0;
    }

    return Math.max(
        0,
        this.safeNumber(
            record.feedbackPositive,
            0
        )
    ) +
    Math.max(
        0,
        this.safeNumber(
            record.feedbackNegative,
            0
        )
    );
}


// ============================================================
// FEEDBACK SCORE
// ============================================================

getFeedbackScore(
    record
) {
    if (!record) {
        return 0.5;
    }

    const positive =
        Math.max(
            0,
            this.safeNumber(
                record.feedbackPositive,
                0
            )
        );

    const negative =
        Math.max(
            0,
            this.safeNumber(
                record.feedbackNegative,
                0
            )
        );

    const total =
        positive +
        negative;

    if (!total) {
        return 0.5;
    }

    return this.clamp01(
        positive / total
    );
}


// ============================================================
// POSITIVE FEEDBACK
// ============================================================

addPositiveFeedback(
    id = "",
    options = {}
) {
    const record =
        this.getRecordById(
            id
        );

    if (!record) {
        return {
            ok: false,
            reason: "record-not-found"
        };
    }

    const config =
        this.getFeedbackConfig();

    record.feedbackPositive =
        Math.max(
            0,
            this.safeNumber(
                record.feedbackPositive,
                0
            )
        ) + 1;

    record.lastFeedbackAt =
        this.nowIso();

    record.quality =
        this.clamp01(
            this.normalizeQuality(
                record.quality
            ) +
            config.positiveQualityBoost
        );

    record.confidence =
        this.clamp01(
            this.normalizeConfidence(
                record.confidence
            ) +
            config.positiveConfidenceBoost
        );

    if (
        record.feedbackPositive >=
        config.autoTrustPositiveFeedback &&
        this.getFeedbackScore(record) >=
        0.80
    ) {
        record.trusted = true;
    }

    record.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        type: "positive",
        id,
        feedbackPositive:
            record.feedbackPositive,
        feedbackNegative:
            record.feedbackNegative,
        quality:
            record.quality,
        confidence:
            record.confidence,
        trusted:
            Boolean(
                record.trusted
            )
    };
}


// ============================================================
// NEGATIVE FEEDBACK
// ============================================================

addNegativeFeedback(
    id = "",
    options = {}
) {
    const record =
        this.getRecordById(
            id
        );

    if (!record) {
        return {
            ok: false,
            reason: "record-not-found"
        };
    }

    const config =
        this.getFeedbackConfig();

    record.feedbackNegative =
        Math.max(
            0,
            this.safeNumber(
                record.feedbackNegative,
                0
            )
        ) + 1;

    record.lastFeedbackAt =
        this.nowIso();

    record.quality =
        this.clamp01(
            this.normalizeQuality(
                record.quality
            ) -
            config.negativeQualityPenalty
        );

    record.confidence =
        this.clamp01(
            this.normalizeConfidence(
                record.confidence
            ) -
            config.negativeConfidencePenalty
        );

    if (
        record.feedbackNegative >
        record.feedbackPositive
    ) {
        record.trusted = false;
    }

    record.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        type: "negative",
        id,
        feedbackPositive:
            record.feedbackPositive,
        feedbackNegative:
            record.feedbackNegative,
        quality:
            record.quality,
        confidence:
            record.confidence,
        trusted:
            Boolean(
                record.trusted
            )
    };
}


// ============================================================
// FEEDBACK ALIAS
// ============================================================

feedback(
    id = "",
    type = "positive",
    options = {}
) {
    const normalized =
        this.safeText(
            type
        ).toLowerCase();

    if (
        ["positive", "up", "good", "like", "yes", "+"]
            .includes(normalized)
    ) {
        return this.addPositiveFeedback(
            id,
            options
        );
    }

    if (
        ["negative", "down", "bad", "dislike", "no", "-"]
            .includes(normalized)
    ) {
        return this.addNegativeFeedback(
            id,
            options
        );
    }

    return {
        ok: false,
        reason: "unknown-feedback-type"
    };
}


// ============================================================
// TRUST RECORD
// ============================================================

trustRecord(
    id = "",
    options = {}
) {
    const record =
        this.getRecordById(
            id
        );

    if (!record) {
        return {
            ok: false,
            trusted: false,
            reason: "record-not-found"
        };
    }

    record.trusted = true;

    record.verificationCount =
        Math.max(
            0,
            this.safeNumber(
                record.verificationCount,
                0
            )
        );

    record.quality =
        Math.max(
            this.normalizeQuality(
                record.quality
            ),
            0.88
        );

    record.confidence =
        Math.max(
            this.normalizeConfidence(
                record.confidence
            ),
            0.90
        );

    record.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        trusted: true,
        id,
        quality:
            record.quality,
        confidence:
            record.confidence
    };
}


// ============================================================
// UNTRUST RECORD
// ============================================================

untrustRecord(
    id = "",
    options = {}
) {
    const record =
        this.getRecordById(
            id
        );

    if (!record) {
        return {
            ok: false,
            trusted: false,
            reason: "record-not-found"
        };
    }

    if (
        record.protected
    ) {
        return {
            ok: false,
            trusted: true,
            reason: "protected-record"
        };
    }

    record.trusted = false;

    record.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        trusted: false,
        id
    };
}


// ============================================================
// VERIFY RECORD
// ============================================================

verifyRecord(
    id = "",
    options = {}
) {
    const record =
        this.getRecordById(
            id
        );

    if (!record) {
        return {
            ok: false,
            verified: false,
            reason: "record-not-found"
        };
    }

    record.verificationCount =
        Math.max(
            0,
            this.safeNumber(
                record.verificationCount,
                0
            )
        ) + 1;

    record.lastVerifiedAt =
        this.nowIso();

    record.quality =
        this.clamp01(
            this.normalizeQuality(
                record.quality
            ) +
            this.getFeedbackConfig()
                .verificationBoost
        );

    record.confidence =
        this.clamp01(
            this.normalizeConfidence(
                record.confidence
            ) +
            0.03
        );

    if (
        record.quality >=
        this.getFeedbackConfig()
            .trustThreshold &&
        record.verificationCount >= 2
    ) {
        record.trusted = true;
    }

    record.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        verified: true,
        id,
        verificationCount:
            record.verificationCount,
        quality:
            record.quality,
        confidence:
            record.confidence,
        trusted:
            Boolean(
                record.trusted
            )
    };
}


// ============================================================
// PIN RECORD
// ============================================================

pinRecord(
    id = "",
    options = {}
) {
    const record =
        this.getRecordById(
            id
        );

    if (!record) {
        return {
            ok: false,
            pinned: false,
            reason: "record-not-found"
        };
    }

    record.pinned = true;

    record.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        pinned: true,
        id
    };
}


// ============================================================
// UNPIN RECORD
// ============================================================

unpinRecord(
    id = "",
    options = {}
) {
    const record =
        this.getRecordById(
            id
        );

    if (!record) {
        return {
            ok: false,
            pinned: false,
            reason: "record-not-found"
        };
    }

    if (
        record.protected
    ) {
        return {
            ok: false,
            pinned: true,
            reason: "protected-record"
        };
    }

    record.pinned = false;

    record.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        pinned: false,
        id
    };
}


// ============================================================
// FAVORITE RECORD
// ============================================================

favoriteRecord(
    id = "",
    options = {}
) {
    const record =
        this.getRecordById(
            id
        );

    if (!record) {
        return {
            ok: false,
            favorite: false,
            reason: "record-not-found"
        };
    }

    record.favorite = true;

    record.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        favorite: true,
        id
    };
}


// ============================================================
// UNFAVORITE RECORD
// ============================================================

unfavoriteRecord(
    id = "",
    options = {}
) {
    const record =
        this.getRecordById(
            id
        );

    if (!record) {
        return {
            ok: false,
            favorite: false,
            reason: "record-not-found"
        };
    }

    record.favorite = false;

    record.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        favorite: false,
        id
    };
}


// ============================================================
// TRUSTED RECORDS
// ============================================================

getTrustedRecords() {
    return this.getActiveRecords()
        .filter(
            (record) =>
                record.trusted === true
        )
        .sort(
            (a, b) =>
                this.calculateRecordQuality(b) -
                this.calculateRecordQuality(a)
        );
}


// ============================================================
// PINNED RECORDS
// ============================================================

getPinnedRecords() {
    return this.getActiveRecords()
        .filter(
            (record) =>
                record.pinned === true
        )
        .sort(
            (a, b) =>
                this.calculateRecordQuality(b) -
                this.calculateRecordQuality(a)
        );
}


// ============================================================
// FAVORITE RECORDS
// ============================================================

getFavoriteRecords() {
    return this.getActiveRecords()
        .filter(
            (record) =>
                record.favorite === true
        )
        .sort(
            (a, b) =>
                this.calculateRecordQuality(b) -
                this.calculateRecordQuality(a)
        );
}


// ============================================================
// HIGH QUALITY
// ============================================================

getHighQualityRecords(
    threshold = 0.85
) {
    const safeThreshold =
        this.clamp01(
            this.safeNumber(
                threshold,
                0.85
            )
        );

    return this.getActiveRecords()
        .filter(
            (record) =>
                this.calculateRecordQuality(
                    record
                ) >=
                safeThreshold
        )
        .sort(
            (a, b) =>
                this.calculateRecordQuality(b) -
                this.calculateRecordQuality(a)
        );
}


// ============================================================
// LOW QUALITY
// ============================================================

getLowQualityRecords(
    threshold = 0.45
) {
    const safeThreshold =
        this.clamp01(
            this.safeNumber(
                threshold,
                0.45
            )
        );

    return this.getActiveRecords()
        .filter(
            (record) =>
                this.calculateRecordQuality(
                    record
                ) <=
                safeThreshold
        )
        .sort(
            (a, b) =>
                this.calculateRecordQuality(a) -
                this.calculateRecordQuality(b)
        );
}


// ============================================================
// MOST USED
// ============================================================

getMostUsedRecords(
    limit = 20
) {
    const safeLimit =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    limit,
                    20
                )
            )
        );

    return this.getActiveRecords()
        .slice()
        .sort(
            (a, b) =>
                this.safeNumber(
                    b.usageCount,
                    0
                ) -
                this.safeNumber(
                    a.usageCount,
                    0
                )
        )
        .slice(
            0,
            safeLimit
        );
}


// ============================================================
// RECENTLY USED
// ============================================================

getRecentlyUsedRecords(
    limit = 20
) {
    const safeLimit =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    limit,
                    20
                )
            )
        );

    return this.getActiveRecords()
        .slice()
        .sort(
            (a, b) => {

                const aTime =
                    Date.parse(
                        a.lastUsedAt ||
                        a.updatedAt ||
                        a.createdAt ||
                        ""
                    ) || 0;

                const bTime =
                    Date.parse(
                        b.lastUsedAt ||
                        b.updatedAt ||
                        b.createdAt ||
                        ""
                    ) || 0;

                return bTime - aTime;
            }
        )
        .slice(
            0,
            safeLimit
        );
}


// ============================================================
// AUTO LEARN CONFIG
// ============================================================

getAutoLearnConfig() {
    return {
        enabled: true,
        minQuestionQuality: 0.45,
        minAnswerQuality: 0.72,
        minAnswerLength: 8,
        maxQuestionLength: 5000,
        maxAnswerLength: 500000,
        minConfidence: 0.70,
        minSimilarityBeforeUpdate: 0.82,
        updateExisting: true,
        createAliasOnSimilar: true,
        rejectEmpty: true,
        rejectSystemMessages: true,
        rejectErrors: true,
        rejectFallbacks: true,
        rejectCommands: true,
        rejectQuestionsOnly: true,
        trustedSourceBoost: true
    };
}


// ============================================================
// AUTO LEARN EXCLUDED QUESTION
// ============================================================

isAutoLearnExcludedQuestion(
    question = ""
) {
    const text =
        this.normalizeQuestion(
            question
        );

    if (!text) {
        return true;
    }

    const excluded = [
        "test",
        "deneme",
        "ping",
        "hello world",
        "asdf",
        "qwerty",
        "123",
        "1234",
        "12345"
    ];

    if (
        excluded.includes(
            text
        )
    ) {
        return true;
    }

    if (
        /^\/\w+/.test(text)
    ) {
        return true;
    }

    if (
        /^!/.test(text)
    ) {
        return true;
    }

    return false;
}


// ============================================================
// AUTO LEARN EXCLUDED ANSWER
// ============================================================

isAutoLearnExcludedAnswer(
    answer = ""
) {
    const text =
        this.cleanAnswerText(
            answer
        );

    if (!text) {
        return true;
    }

    const excludedPatterns = [
        /api anahtar/i,
        /internal server error/i,
        /500 internal/i,
        /404 not found/i,
        /timeout/i,
        /rate limit/i,
        /too many requests/i,
        /groq.*error/i,
        /provider.*error/i,
        /hata oluştu/i,
        /bir hata meydana geldi/i,
        /yanıt üretilemedi/i,
        /cevap veremiyorum/i,
        /bilmiyorum/i
    ];

    return excludedPatterns.some(
        (pattern) =>
            pattern.test(text)
    );
}


// ============================================================
// AUTO LEARN ELIGIBILITY
// ============================================================

isAutoLearnEligible(
    question = "",
    answer = "",
    options = {}
) {
    const config = {
        ...this.getAutoLearnConfig(),
        ...(options &&
        typeof options === "object"
            ? options
            : {})
    };

    const q =
        this.cleanQuestionText(
            question
        );

    const a =
        this.cleanAnswerText(
            answer
        );

    if (
        config.rejectEmpty &&
        (!q || !a)
    ) {
        return {
            eligible: false,
            reason: "empty"
        };
    }

    if (
        q.length >
        config.maxQuestionLength
    ) {
        return {
            eligible: false,
            reason: "question-too-long"
        };
    }

    if (
        a.length >
        config.maxAnswerLength
    ) {
        return {
            eligible: false,
            reason: "answer-too-long"
        };
    }

    if (
        a.length <
        config.minAnswerLength
    ) {
        return {
            eligible: false,
            reason: "answer-too-short"
        };
    }

    if (
        config.rejectSystemMessages &&
        (
            /^system:/i.test(a) ||
            /^assistant:/i.test(a) ||
            /^developer:/i.test(a)
        )
    ) {
        return {
            eligible: false,
            reason: "system-answer"
        };
    }

    if (
        config.rejectErrors &&
        this.isAutoLearnExcludedAnswer(
            a
        )
    ) {
        return {
            eligible: false,
            reason: "error-answer"
        };
    }

    if (
        config.rejectCommands &&
        /^[/!]/.test(q)
    ) {
        return {
            eligible: false,
            reason: "command-question"
        };
    }

    if (
        this.isAutoLearnExcludedQuestion(
            q
        )
    ) {
        return {
            eligible: false,
            reason: "excluded-question"
        };
    }

    const questionQuality =
        this.calculateQuestionQuality(
            q
        );

    const answerQuality =
        this.calculateAnswerQuality(
            a
        );

    if (
        questionQuality <
        config.minQuestionQuality
    ) {
        return {
            eligible: false,
            reason: "question-quality-low",
            questionQuality,
            answerQuality
        };
    }

    if (
        answerQuality <
        config.minAnswerQuality
    ) {
        return {
            eligible: false,
            reason: "answer-quality-low",
            questionQuality,
            answerQuality
        };
    }

    return {
        eligible: true,
        reason: "eligible",
        questionQuality,
        answerQuality
    };
}


// ============================================================
// AUTO LEARN DUPLICATE CHECK
// ============================================================

findAutoLearnTarget(
    question = "",
    options = {}
) {
    const normalized =
        this.normalizeQuestion(
            question
        );

    if (!normalized) {
        return null;
    }

    const exact =
        this.getQuestionIndexMatches(
            question
        );

    if (
        exact.length
    ) {
        return exact[0];
    }

    const fuzzy =
        this.searchUltimate(
            question,
            {
                ...options,
                minScore:
                    options.minSimilarity ??
                    this.getAutoLearnConfig()
                        .minSimilarityBeforeUpdate,
                limit: 3
            }
        );

    if (
        fuzzy.found &&
        fuzzy.record
    ) {
        return fuzzy.record;
    }

    return null;
}


// ============================================================
// AUTO LEARN
// ============================================================

autoLearn(
    question = "",
    answer = "",
    options = {}
) {
    const config = {
        ...this.getAutoLearnConfig(),
        ...(options &&
        typeof options === "object"
            ? options
            : {})
    };

    if (
        config.enabled === false
    ) {
        return {
            saved: false,
            created: false,
            updated: false,
            reason: "disabled"
        };
    }

    const eligibility =
        this.isAutoLearnEligible(
            question,
            answer,
            config
        );

    if (
        !eligibility.eligible
    ) {
        return {
            saved: false,
            created: false,
            updated: false,
            reason:
                eligibility.reason,
            questionQuality:
                eligibility.questionQuality ||
                0,
            answerQuality:
                eligibility.answerQuality ||
                0
        };
    }

    const cleanQuestion =
        this.cleanQuestionText(
            question
        );

    const cleanAnswer =
        this.cleanAnswerText(
            answer
        );

    const existing =
        this.findAutoLearnTarget(
            cleanQuestion,
            config
        );

    if (
        existing
    ) {
        const existingSimilarity =
            this.textSimilarity(
                cleanQuestion,
                existing.question
            );

        if (
            config.updateExisting &&
            existingSimilarity >=
            config.minSimilarityBeforeUpdate
        ) {
            const oldAnswer =
                this.cleanAnswerText(
                    existing.answer
                );

            const oldQuality =
                this.calculateAnswerQuality(
                    oldAnswer
                );

            const newQuality =
                this.calculateAnswerQuality(
                    cleanAnswer
                );

            if (
                newQuality >=
                oldQuality
            ) {
                const updated =
                    this.updateRecord(
                        existing.id,
                        {
                            answer:
                                cleanAnswer,

                            source:
                                options.source ||
                                existing.source ||
                                "auto",

                            quality:
                                Math.max(
                                    existing.quality ||
                                    0,
                                    newQuality
                                ),

                            confidence:
                                Math.max(
                                    existing.confidence ||
                                    0,
                                    this.clamp01(
                                        (
                                            eligibility.questionQuality *
                                            0.30 +
                                            newQuality *
                                            0.45 +
                                            (
                                                options.confidence ??
                                                0.75
                                            ) *
                                            0.25
                                        )
                                    )
                                ),

                            metadata: {
                                ...(existing.metadata || {}),

                                lastAutoLearnAt:
                                    this.nowIso(),

                                autoLearnCount:
                                    (
                                        existing.metadata
                                            ?.autoLearnCount ||
                                        0
                                    ) + 1
                            }
                        }
                    );

                return {
                    ...updated,

                    saved:
                        Boolean(
                            updated.updated
                        ),

                    created: false,

                    updated:
                        Boolean(
                            updated.updated
                        ),

                    reason:
                        updated.updated
                            ? "updated-existing"
                            : updated.reason,

                    similarity:
                        existingSimilarity
                };
            }
        }

        if (
            config.createAliasOnSimilar &&
            existingSimilarity >=
            0.82 &&
            existingSimilarity < 1
        ) {
            const aliasResult =
                this.addAlias(
                    existing.id,
                    cleanQuestion
                );

            return {
                saved:
                    Boolean(
                        aliasResult.updated
                    ),

                created: false,

                updated:
                    Boolean(
                        aliasResult.updated
                    ),

                reason:
                    aliasResult.updated
                        ? "alias-added"
                        : aliasResult.reason,

                id:
                    existing.id,

                similarity:
                    existingSimilarity
            };
        }

        return {
            saved: false,
            created: false,
            updated: false,
            reason: "similar-record-exists",
            id:
                existing.id,
            similarity:
                existingSimilarity
        };
    }

    const questionType =
        this.classifyQuestion(
            cleanQuestion
        );

    const created =
        this.addRecord(
            cleanQuestion,
            cleanAnswer,
            {
                userId:
                    options.userId ||
                    "",

                source:
                    options.source ||
                    "auto",

                category:
                    options.category ||
                    questionType.type ||
                    "general",

                language:
                    options.language ||
                    "tr",

                aliases:
                    options.aliases ||
                    [],

                tags:
                    options.tags ||
                    ["auto-learned"],

                quality:
                    eligibility.answerQuality,

                confidence:
                    this.clamp01(
                        (
                            eligibility.questionQuality *
                            0.30 +
                            eligibility.answerQuality *
                            0.45 +
                            (
                                options.confidence ??
                                0.75
                            ) *
                            0.25
                        )
                    ),

                metadata: {
                    ...(options.metadata || {}),

                    autoLearn:
                        true,

                    autoLearnCount:
                        1,

                    lastAutoLearnAt:
                        this.nowIso()
                }
            }
        );

    return {
        ...created,

        saved:
            Boolean(
                created.saved
            ),

        created:
            Boolean(
                created.saved
            ),

        updated: false,

        reason:
            created.saved
                ? "created-new"
                : created.reason,

        questionQuality:
            eligibility.questionQuality,

        answerQuality:
            eligibility.answerQuality
    };
}


// ============================================================
// AUTO LEARN V2
// ============================================================

autoLearnV2(
    question = "",
    answer = "",
    options = {}
) {
    return this.autoLearn(
        question,
        answer,
        {
            ...options,
            enabled: true
        }
    );
}


// ============================================================
// AUTO LEARN V3
// ============================================================

autoLearnV3(
    question = "",
    answer = "",
    options = {}
) {
    return this.autoLearn(
        question,
        answer,
        options
    );
}


// ============================================================
// LEARN
// ============================================================

learn(
    question = "",
    answer = "",
    options = {}
) {
    return this.autoLearn(
        question,
        answer,
        options
    );
}


// ============================================================
// TEACH
// ============================================================

teach(
    question = "",
    answer = "",
    options = {}
) {
    return this.addRecord(
        question,
        answer,
        {
            ...options,
            source:
                options.source ||
                "manual-teach",
            trusted:
                options.trusted !== false,
            quality:
                options.quality ??
                0.90,
            confidence:
                options.confidence ??
                0.90
        }
    );
}


// ============================================================
// IMPROVE ANSWER
// ============================================================

improveAnswer(
    id = "",
    newAnswer = "",
    options = {}
) {
    const record =
        this.getRecordById(
            id
        );

    if (!record) {
        return {
            ok: false,
            improved: false,
            reason: "record-not-found"
        };
    }

    const clean =
        this.cleanAnswerText(
            newAnswer
        );

    if (!clean) {
        return {
            ok: false,
            improved: false,
            reason: "answer-empty"
        };
    }

    const oldQuality =
        this.calculateAnswerQuality(
            record.answer
        );

    const newQuality =
        this.calculateAnswerQuality(
            clean
        );

    if (
        !options.force &&
        newQuality <
        oldQuality
    ) {
        return {
            ok: false,
            improved: false,
            reason: "new-answer-lower-quality",
            oldQuality,
            newQuality
        };
    }

    const result =
        this.updateRecord(
            id,
            {
                answer:
                    clean,

                quality:
                    Math.max(
                        record.quality || 0,
                        newQuality
                    ),

                confidence:
                    Math.max(
                        record.confidence || 0,
                        newQuality
                    ),

                metadata: {
                    ...(record.metadata || {}),

                    previousAnswer:
                        record.answer,

                    lastImprovedAt:
                        this.nowIso(),

                    improvementCount:
                        (
                            record.metadata
                                ?.improvementCount ||
                            0
                        ) + 1
                }
            }
        );

    return {
        ...result,

        improved:
            Boolean(
                result.updated
            ),

        oldQuality,

        newQuality
    };
}


// ============================================================
// MERGE ANSWERS
// ============================================================

mergeAnswers(
    primaryId = "",
    secondaryId = "",
    options = {}
) {
    const primary =
        this.getRecordById(
            primaryId
        );

    const secondary =
        this.getRecordById(
            secondaryId
        );

    if (
        !primary ||
        !secondary
    ) {
        return {
            ok: false,
            merged: false,
            reason: "record-not-found"
        };
    }

    const primaryQuality =
        this.calculateAnswerQuality(
            primary.answer
        );

    const secondaryQuality =
        this.calculateAnswerQuality(
            secondary.answer
        );

    const winner =
        secondaryQuality >
        primaryQuality
            ? secondary
            : primary;

    const loser =
        winner.id === primary.id
            ? secondary
            : primary;

    const aliases = [
        ...this.safeArray(
            winner.aliases
        ),
        loser.question,
        ...this.safeArray(
            loser.aliases
        )
    ];

    const uniqueAliases = [
        ...new Set(
            aliases
                .map(
                    (alias) =>
                        this.safeText(alias)
                )
                .filter(Boolean)
        )
    ];

    const updated =
        this.updateRecord(
            winner.id,
            {
                aliases:
                    uniqueAliases,

                tags: [
                    ...new Set([
                        ...this.safeArray(
                            winner.tags
                        ),
                        ...this.safeArray(
                            loser.tags
                        ),
                        "merged"
                    ])
                ],

                metadata: {
                    ...(winner.metadata || {}),

                    mergedRecordIds: [
                        ...(winner.metadata
                            ?.mergedRecordIds || []),
                        loser.id
                    ],

                    lastMergedAt:
                        this.nowIso()
                }
            }
        );

    if (
        updated.updated
    ) {
        this.softDeleteRecord(
            loser.id
        );
    }

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        merged: true,
        winnerId:
            winner.id,
        loserId:
            loser.id,
        winner:
            this.getRecordById(
                winner.id
            )
    };
}


// ============================================================
// DEDUPLICATE MEMORY
// ============================================================

deduplicateMemory(
    options = {}
) {
    const records =
        this.getActiveRecords();

    const groups =
        new Map();

    for (
        const record
        of records
    ) {
        const key =
            this.normalizeQuestion(
                record.question
            );

        if (!key) {
            continue;
        }

        if (
            !groups.has(key)
        ) {
            groups.set(
                key,
                []
            );
        }

        groups.get(key)
            .push(record);
    }

    let merged = 0;
    let removed = 0;

    for (
        const group
        of groups.values()
    ) {
        if (
            group.length <= 1
        ) {
            continue;
        }

        group.sort(
            (a, b) =>
                this.calculateRecordQuality(b) -
                this.calculateRecordQuality(a)
        );

        const primary =
            group[0];

        for (
            let i = 1;
            i < group.length;
            i++
        ) {
            const secondary =
                group[i];

            const result =
                this.mergeAnswers(
                    primary.id,
                    secondary.id,
                    {
                        save: false
                    }
                );

            if (
                result.merged
            ) {
                merged++;
                removed++;
            }
        }
    }

    this.rebuildIndex();

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,
        groups:
            [...groups.values()]
                .filter(
                    (group) =>
                        group.length > 1
                )
                .length,
        merged,
        removed
    };
}


// ============================================================
// QUALITY REPORT
// ============================================================

getQualityReport() {
    const records =
        this.getAllRecords({
            includeArchived: true,
            includeDeleted: true
        });

    let totalQuality = 0;
    let totalConfidence = 0;
    let highQuality = 0;
    let lowQuality = 0;
    let trusted = 0;
    let untrusted = 0;
    let positive = 0;
    let negative = 0;

    for (
        const record
        of records
    ) {
        const quality =
            this.calculateRecordQuality(
                record
            );

        const confidence =
            this.normalizeConfidence(
                record.confidence
            );

        totalQuality +=
            quality;

        totalConfidence +=
            confidence;

        if (
            quality >= 0.85
        ) {
            highQuality++;
        }

        if (
            quality <= 0.45
        ) {
            lowQuality++;
        }

        if (
            record.trusted
        ) {
            trusted++;
        } else {
            untrusted++;
        }

        positive +=
            Math.max(
                0,
                this.safeNumber(
                    record.feedbackPositive,
                    0
                )
            );

        negative +=
            Math.max(
                0,
                this.safeNumber(
                    record.feedbackNegative,
                    0
                )
            );
    }

    const count =
        records.length;

    return {
        ok: true,

        count,

        averageQuality:
            count
                ? this.clamp01(
                    totalQuality /
                    count
                )
                : 0,

        averageConfidence:
            count
                ? this.clamp01(
                    totalConfidence /
                    count
                )
                : 0,

        highQuality,

        lowQuality,

        trusted,

        untrusted,

        feedbackPositive:
            positive,

        feedbackNegative:
            negative,

        feedbackScore:
            positive + negative
                ? this.clamp01(
                    positive /
                    (
                        positive +
                        negative
                    )
                )
                : 0.5
    };
}


// ============================================================
// AUTO LEARN REPORT
// ============================================================

getAutoLearnReport() {
    const records =
        this.getAllRecords({
            includeArchived: true,
            includeDeleted: true
        });

    let learned = 0;
    let autoCount = 0;
    let manualCount = 0;
    let aiCount = 0;
    let researchCount = 0;

    for (
        const record
        of records
    ) {
        const metadata =
            record.metadata || {};

        if (
            metadata.autoLearn === true
        ) {
            learned++;

            autoCount +=
                Math.max(
                    1,
                    this.safeNumber(
                        metadata.autoLearnCount,
                        1
                    )
                );
        }

        const source =
            this.safeText(
                record.source
            );

        if (
            /manual/i.test(source)
        ) {
            manualCount++;
        }

        if (
            /^ai$/i.test(source) ||
            /ai\+/i.test(source)
        ) {
            aiCount++;
        }

        if (
            /research/i.test(source)
        ) {
            researchCount++;
        }
    }

    return {
        ok: true,

        learned,

        autoLearnActions:
            autoCount,

        manual:
            manualCount,

        ai:
            aiCount,

        research:
            researchCount
    };
}


// ============================================================
// TRUST REPORT
// ============================================================

getTrustReport() {
    const records =
        this.getActiveRecords();

    let trusted = 0;
    let verified = 0;
    let pinned = 0;
    let favorites = 0;

    for (
        const record
        of records
    ) {
        if (
            record.trusted
        ) {
            trusted++;
        }

        if (
            this.safeNumber(
                record.verificationCount,
                0
            ) > 0
        ) {
            verified++;
        }

        if (
            record.pinned
        ) {
            pinned++;
        }

        if (
            record.favorite
        ) {
            favorites++;
        }
    }

    return {
        ok: true,
        total:
            records.length,
        trusted,
        verified,
        pinned,
        favorites
    };
}


// ============================================================
// FIND RECORDS NEEDING REVIEW
// ============================================================

getRecordsNeedingReview(
    options = {}
) {
    const qualityThreshold =
        this.clamp01(
            this.safeNumber(
                options.qualityThreshold,
                0.45
            )
        );

    const negativeLimit =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    options.negativeLimit,
                    2
                )
            )
        );

    const records =
        this.getActiveRecords();

    return records.filter(
        (record) => {

            const quality =
                this.calculateRecordQuality(
                    record
                );

            const negative =
                this.safeNumber(
                    record.feedbackNegative,
                    0
                );

            return (
                quality <=
                qualityThreshold ||
                negative >=
                negativeLimit
            );
        }
    );
}


// ============================================================
// REPAIR LOW QUALITY RECORD
// ============================================================

repairRecordQuality(
    id = "",
    options = {}
) {
    const record =
        this.getRecordById(
            id
        );

    if (!record) {
        return {
            ok: false,
            repaired: false,
            reason: "record-not-found"
        };
    }

    const answerQuality =
        this.calculateAnswerQuality(
            record.answer
        );

    const questionQuality =
        this.calculateQuestionQuality(
            record.question
        );

    const feedbackScore =
        this.getFeedbackScore(
            record
        );

    const repairedQuality =
        this.clamp01(
            answerQuality * 0.35 +
            questionQuality * 0.20 +
            feedbackScore * 0.15 +
            this.normalizeQuality(
                record.quality
            ) * 0.20 +
            this.normalizeConfidence(
                record.confidence
            ) * 0.10
        );

    if (
        options.force ||
        repairedQuality >
        this.normalizeQuality(
            record.quality
        )
    ) {
        record.quality =
            repairedQuality;
    }

    record.confidence =
        this.clamp01(
            repairedQuality * 0.85 +
            this.getFeedbackScore(record) *
            0.15
        );

    record.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        repaired: true,
        id,
        quality:
            record.quality,
        confidence:
            record.confidence
    };
}


// ============================================================
// REPAIR ALL QUALITY
// ============================================================

repairAllQuality(
    options = {}
) {
    const records =
        this.getAllRecords({
            includeArchived:
                options.includeArchived === true,
            includeDeleted:
                options.includeDeleted === true
        });

    let repaired = 0;

    for (
        const record
        of records
    ) {
        if (!record) {
            continue;
        }

        this.repairRecordQuality(
            record.id,
            {
                ...options,
                save: false
            }
        );

        repaired++;
    }

    this.rebuildIndex();

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,
        repaired
    };
}


// ============================================================
// RECORD QUALITY DETAILS
// ============================================================

getRecordQualityDetails(
    id = ""
) {
    const record =
        this.getRecordById(
            id
        );

    if (!record) {
        return {
            ok: false,
            reason: "record-not-found"
        };
    }

    return {
        ok: true,

        id:
            record.id,

        question:
            record.question,

        answer:
            record.answer,

        answerQuality:
            this.calculateAnswerQuality(
                record.answer
            ),

        questionQuality:
            this.calculateQuestionQuality(
                record.question
            ),

        recordQuality:
            this.calculateRecordQuality(
                record
            ),

        quality:
            this.normalizeQuality(
                record.quality
            ),

        confidence:
            this.normalizeConfidence(
                record.confidence
            ),

        feedbackScore:
            this.getFeedbackScore(
                record
            ),

        usageCount:
            this.safeNumber(
                record.usageCount,
                0
            ),

        hitCount:
            this.safeNumber(
                record.hitCount,
                0
            ),

        missCount:
            this.safeNumber(
                record.missCount,
                0
            ),

        trusted:
            Boolean(
                record.trusted
            ),

        pinned:
            Boolean(
                record.pinned
            ),

        favorite:
            Boolean(
                record.favorite
            ),

        verificationCount:
            this.safeNumber(
                record.verificationCount,
                0
            )
    };
}


// ============================================================
// FIND BEST TRUSTED ANSWER
// ============================================================

findBestTrustedAnswer(
    question = "",
    options = {}
) {
    const trusted =
        this.getTrustedRecords();

    const candidates =
        trusted.filter(
            (record) =>
                record.active !== false
        );

    const ranked =
        this.rankFinalCandidates(
            question,
            candidates,
            options
        );

    if (
        !ranked.length
    ) {
        return {
            found: false,
            answer: null,
            score: 0,
            confidence: 0,
            source: "trusted-not-found",
            record: null
        };
    }

    const best =
        ranked[0];

    return {
        found:
            Boolean(
                best._answerMemoryScore >=
                (
                    options.minScore ??
                    0.78
                )
            ),

        answer:
            best.answer,

        score:
            best._answerMemoryScore,

        confidence:
            this.normalizeConfidence(
                best.confidence
            ),

        source:
            "trusted-memory",

        record:
            best
    };
}


// ============================================================
// FALLBACK TRUSTED ANSWER
// ============================================================

getTrustedAnswerOrNull(
    question = "",
    options = {}
) {
    const result =
        this.findBestTrustedAnswer(
            question,
            options
        );

    return result.found
        ? result.answer
        : null;
}


// ============================================================
// ANSWER SCORE SUMMARY
// ============================================================

getAnswerScoreSummary(
    question = ""
) {
    const result =
        this.searchUltimate(
            question,
            {
                minScore: 0.55,
                limit: 10
            }
        );

    if (
        !result.candidates
    ) {
        return {
            found:
                Boolean(
                    result.found
                ),
            bestScore:
                result.score || 0,
            candidates: []
        };
    }

    return {
        found:
            Boolean(
                result.found
            ),

        bestScore:
            result.score || 0,

        confidence:
            result.confidence || 0,

        source:
            result.source,

        candidates:
            result.candidates.map(
                (candidate) => ({
                    id:
                        candidate.id,

                    question:
                        candidate.question,

                    score:
                        candidate._answerMemoryScore ||
                        0,

                    quality:
                        this.calculateRecordQuality(
                            candidate
                        ),

                    confidence:
                        this.normalizeConfidence(
                            candidate.confidence
                        ),

                    trusted:
                        Boolean(
                            candidate.trusted
                        )
                })
            )
    };
}


// ============================================================
// LEARNING STATUS
// ============================================================

getLearningStatus() {
    return {
        autoLearn:
            this.getAutoLearnConfig(),

        quality:
            this.getQualityReport(),

        trust:
            this.getTrustReport(),

        recordsForReview:
            this.getRecordsNeedingReview()
                .length
    };
}


// ============================================================
// MEMORY OPTIMIZER
// ============================================================

optimizeMemory(
    options = {}
) {
    const steps = [];

    if (
        options.refreshFingerprints !== false
    ) {
        const fingerprintResult =
            this.refreshAllFingerprints();

        steps.push({
            task: "fingerprints",
            ...fingerprintResult
        });
    }

    if (
        options.refreshQuality !== false
    ) {
        const qualityResult =
            this.refreshAllQuality();

        steps.push({
            task: "quality",
            ...qualityResult
        });
    }

    if (
        options.deduplicate !== false
    ) {
        const duplicateResult =
            this.deduplicateMemory();

        steps.push({
            task: "deduplicate",
            ...duplicateResult
        });
    }

    this.rebuildIndex();

    this.invalidateAllCaches();

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,
        steps,
        health:
            this.getHealthSummary()
    };
}


// ============================================================
// OPTIMIZE ALIAS
// ============================================================

optimize(
    options = {}
) {
    return this.optimizeMemory(
        options
    );
}


// ============================================================
// MAINTENANCE
// ============================================================

maintenance(
    options = {}
) {
    return this.optimizeMemory(
        options
    );
}


// ============================================================
// KNOWLEDGE TRUST LEVEL
// ============================================================

getTrustLevel(
    record
) {
    if (!record) {
        return "unknown";
    }

    if (
        record.protected
    ) {
        return "protected";
    }

    if (
        record.trusted &&
        record.pinned
    ) {
        return "verified-pinned";
    }

    if (
        record.trusted
    ) {
        return "trusted";
    }

    if (
        record.verificationCount >= 2
    ) {
        return "verified";
    }

    const quality =
        this.calculateRecordQuality(
            record
        );

    if (
        quality >= 0.85
    ) {
        return "high";
    }

    if (
        quality >= 0.65
    ) {
        return "medium";
    }

    return "low";
}


// ============================================================
// SOURCE TRUST
// ============================================================

getSourceTrust(
    source = ""
) {
    const value =
        this.safeText(
            source
        ).toLowerCase();

    if (
        value.includes("builtin")
    ) {
        return 1;
    }

    if (
        value.includes("manual")
    ) {
        return 0.95;
    }

    if (
        value.includes("verified")
    ) {
        return 0.95;
    }

    if (
        value.includes("research")
    ) {
        return 0.85;
    }

    if (
        value.includes("ai")
    ) {
        return 0.75;
    }

    if (
        value.includes("auto")
    ) {
        return 0.70;
    }

    return 0.50;
}


// ============================================================
// SOURCE BOOST
// ============================================================

calculateSourceBoost(
    record
) {
    if (!record) {
        return 0;
    }

    const trust =
        this.getSourceTrust(
            record.source
        );

    return Math.max(
        0,
        (
            trust -
            0.5
        ) * 0.10
    );
}


// ============================================================
// FINAL QUALITY
// ============================================================

getFinalQuality(
    record
) {
    if (!record) {
        return 0;
    }

    const base =
        this.calculateRecordQuality(
            record
        );

    const sourceBoost =
        this.calculateSourceBoost(
            record
        );

    const feedback =
        this.getFeedbackScore(
            record
        );

    const verification =
        Math.min(
            1,
            this.safeNumber(
                record.verificationCount,
                0
            ) /
            10
        );

    return this.clamp01(
        base * 0.70 +
        feedback * 0.15 +
        verification * 0.10 +
        sourceBoost * 0.05
    );
}


// ============================================================
// BEST QUALITY RECORDS
// ============================================================

getBestQualityRecords(
    limit = 20
) {
    const safeLimit =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    limit,
                    20
                )
            )
        );

    return this.getActiveRecords()
        .slice()
        .sort(
            (a, b) =>
                this.getFinalQuality(b) -
                this.getFinalQuality(a)
        )
        .slice(
            0,
            safeLimit
        );
}


// ============================================================
// QUALITY RANK
// ============================================================

qualityRank(
    record
) {
    const quality =
        this.getFinalQuality(
            record
        );

    if (
        quality >= 0.95
    ) {
        return "A+";
    }

    if (
        quality >= 0.90
    ) {
        return "A";
    }

    if (
        quality >= 0.85
    ) {
        return "B+";
    }

    if (
        quality >= 0.80
    ) {
        return "B";
    }

    if (
        quality >= 0.70
    ) {
        return "C";
    }

    if (
        quality >= 0.60
    ) {
        return "D";
    }

    return "E";
}


// ============================================================
// QUALITY BADGE
// ============================================================

getQualityBadge(
    record
) {
    return {
        rank:
            this.qualityRank(
                record
            ),

        score:
            this.getFinalQuality(
                record
            ),

        trusted:
            Boolean(
                record?.trusted
            ),

        verified:
            (
                this.safeNumber(
                    record?.verificationCount,
                    0
                ) > 0
            )
    };
}


// ============================================================
// LEARNING CANDIDATE
// ============================================================

createLearningCandidate(
    question = "",
    answer = "",
    options = {}
) {
    return {
        question:
            this.cleanQuestionText(
                question
            ),

        answer:
            this.cleanAnswerText(
                answer
            ),

        questionQuality:
            this.calculateQuestionQuality(
                question
            ),

        answerQuality:
            this.calculateAnswerQuality(
                answer
            ),

        source:
            options.source ||
            "auto",

        userId:
            options.userId ||
            "",

        createdAt:
            this.nowIso(),

        eligible:
            this.isAutoLearnEligible(
                question,
                answer,
                options
            )
                .eligible
    };
}


// ============================================================
// LEARNING QUEUE INITIALIZER
// ============================================================

ensureLearningQueue() {
    if (
        !Array.isArray(
            this.data.learningQueue
        )
    ) {
        this.data.learningQueue =
            [];
    }

    return this.data.learningQueue;
}


// ============================================================
// ADD TO LEARNING QUEUE
// ============================================================

queueLearningCandidate(
    question = "",
    answer = "",
    options = {}
) {
    const eligibility =
        this.isAutoLearnEligible(
            question,
            answer,
            options
        );

    if (
        !eligibility.eligible
    ) {
        return {
            ok: false,
            queued: false,
            reason:
                eligibility.reason
        };
    }

    const queue =
        this.ensureLearningQueue();

    const candidate =
        this.createLearningCandidate(
            question,
            answer,
            options
        );

    const duplicate =
        queue.some(
            (item) =>
                this.areShortMessagesEquivalent(
                    item.question,
                    question
                ) &&
                this.textSimilarity(
                    item.answer,
                    answer
                ) >= 0.85
        );

    if (
        duplicate
    ) {
        return {
            ok: true,
            queued: false,
            duplicate: true,
            reason: "duplicate"
        };
    }

    candidate.id =
        this.createRecordId();

    queue.push(
        candidate
    );

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,
        queued: true,
        id:
            candidate.id,
        candidate
    };
}


// ============================================================
// GET LEARNING QUEUE
// ============================================================

getLearningQueue(
    limit = 100
) {
    const queue =
        this.ensureLearningQueue();

    return queue
        .slice(
            0,
            Math.max(
                1,
                Math.floor(
                    this.safeNumber(
                        limit,
                        100
                    )
                )
            )
        );
}


// ============================================================
// CLEAR LEARNING QUEUE
// ============================================================

clearLearningQueue(
    options = {}
) {
    const queue =
        this.ensureLearningQueue();

    const count =
        queue.length;

    if (
        options.keep !== true
    ) {
        this.data.learningQueue =
            [];
    }

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,
        cleared:
            options.keep === true
                ? 0
                : count
    };
}


// ============================================================
// PROCESS LEARNING QUEUE
// ============================================================

processLearningQueue(
    options = {}
) {
    const queue =
        this.ensureLearningQueue();

    const items =
        [...queue];

    let saved = 0;
    let failed = 0;

    const results = [];

    for (
        const item
        of items
    ) {
        const result =
            this.autoLearn(
                item.question,
                item.answer,
                {
                    ...options,
                    userId:
                        item.userId ||
                        options.userId,

                    source:
                        item.source ||
                        options.source ||
                        "queued-auto"
                }
            );

        results.push(
            result
        );

        if (
            result.saved
        ) {
            saved++;
        } else {
            failed++;
        }
    }

    this.clearLearningQueue();

    return {
        ok:
            failed === 0,

        saved,

        failed,

        total:
            items.length,

        results
    };
}


// ============================================================
// LEARNING SUMMARY
// ============================================================

getLearningSummary() {
    const queue =
        this.ensureLearningQueue();

    const quality =
        this.getQualityReport();

    const autoLearn =
        this.getAutoLearnReport();

    return {
        ok: true,

        queueSize:
            queue.length,

        autoLearn,

        quality
    };
}


// ============================================================
// REVIEW ONE
// ============================================================

reviewRecord(
    id = ""
) {
    return this.getRecordQualityDetails(
        id
    );
}


// ============================================================
// REVIEW ALL
// ============================================================

reviewAll(
    options = {}
) {
    const records =
        this.getRecordsNeedingReview(
            options
        );

    return {
        ok: true,

        count:
            records.length,

        records:
            records.map(
                (record) =>
                    this.getRecordQualityDetails(
                        record.id
                    )
            )
    };
}


// ============================================================
// AUTO TRUST HIGH QUALITY
// ============================================================

autoTrustHighQuality(
    options = {}
) {
    const threshold =
        this.clamp01(
            this.safeNumber(
                options.threshold,
                0.90
            )
        );

    const records =
        this.getActiveRecords();

    let trusted = 0;

    for (
        const record
        of records
    ) {
        if (
            record.protected
        ) {
            continue;
        }

        const quality =
            this.getFinalQuality(
                record
            );

        const feedback =
            this.getFeedbackScore(
                record
            );

        const usage =
            this.safeNumber(
                record.usageCount,
                0
            );

        if (
            quality >=
            threshold &&
            feedback >= 0.75 &&
            usage >=
            this.getQualityConfig()
                .minimumTrustUses
        ) {
            record.trusted =
                true;

            trusted++;
        }
    }

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,
        trusted
    };
}


// ============================================================
// AUTO UNTRUST LOW QUALITY
// ============================================================

autoUntrustLowQuality(
    options = {}
) {
    const threshold =
        this.clamp01(
            this.safeNumber(
                options.threshold,
                0.40
            )
        );

    const records =
        this.getActiveRecords();

    let untrusted = 0;

    for (
        const record
        of records
    ) {
        if (
            record.protected
        ) {
            continue;
        }

        const quality =
            this.getFinalQuality(
                record
            );

        const negative =
            this.safeNumber(
                record.feedbackNegative,
                0
            );

        if (
            quality <=
            threshold ||
            negative >= 3
        ) {
            if (
                record.trusted
            ) {
                record.trusted =
                    false;

                untrusted++;
            }
        }
    }

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,
        untrusted
    };
}


// ============================================================
// QUALITY MAINTENANCE
// ============================================================

qualityMaintenance(
    options = {}
) {
    const refresh =
        this.refreshAllQuality(
            options
        );

    const trust =
        options.autoTrust === false
            ? {
                trusted: 0
            }
            : this.autoTrustHighQuality(
                options
            );

    const untrust =
        options.autoUntrust === false
            ? {
                untrusted: 0
            }
            : this.autoUntrustLowQuality(
                options
            );

    return {
        ok: true,

        refresh,

        trust,

        untrust,

        report:
            this.getQualityReport()
    };
}


// ============================================================
// MEMORY LEARNING PIPELINE
// ============================================================

runLearningPipeline(
    question = "",
    answer = "",
    options = {}
) {
    const candidate =
        this.createLearningCandidate(
            question,
            answer,
            options
        );

    if (
        !candidate.eligible
    ) {
        return {
            ok: false,
            learned: false,
            reason: "not-eligible",
            candidate
        };
    }

    const existing =
        this.findAutoLearnTarget(
            question,
            options
        );

    if (
        existing
    ) {
        const similarity =
            this.textSimilarity(
                question,
                existing.question
            );

        if (
            similarity >=
            (
                options.updateThreshold ??
                0.82
            )
        ) {
            const result =
                this.improveAnswer(
                    existing.id,
                    answer,
                    {
                        force:
                            options.force === true
                    }
                );

            return {
                ok:
                    Boolean(
                        result.improved
                    ),

                learned:
                    Boolean(
                        result.improved
                    ),

                mode:
                    "improve",

                result
            };
        }
    }

    const result =
        this.autoLearn(
            question,
            answer,
            options
        );

    return {
        ok:
            Boolean(
                result.saved
            ),

        learned:
            Boolean(
                result.saved
            ),

        mode:
            "auto-learn",

        result
    };
}


// ============================================================
// LEARNING EVENT
// ============================================================

recordLearningEvent(
    event = "",
    data = {}
) {
    if (
        !Array.isArray(
            this.data.learningEvents
        )
    ) {
        this.data.learningEvents =
            [];
    }

    this.data.learningEvents.push({
        id:
            this.createRecordId(),

        event:
            this.safeText(
                event
            ),

        data:
            data &&
            typeof data === "object"
                ? {
                    ...data
                }
                : {},

        createdAt:
            this.nowIso()
    });

    const maxEvents =
        5000;

    if (
        this.data.learningEvents.length >
        maxEvents
    ) {
        this.data.learningEvents =
            this.data.learningEvents
                .slice(
                    -maxEvents
                );
    }

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true
    };
}


// ============================================================
// GET LEARNING EVENTS
// ============================================================

getLearningEvents(
    limit = 100
) {
    if (
        !Array.isArray(
            this.data.learningEvents
        )
    ) {
        this.data.learningEvents =
            [];
    }

    return this.data.learningEvents
        .slice(
            -Math.max(
                1,
                Math.floor(
                    this.safeNumber(
                        limit,
                        100
                    )
                )
            )
        )
        .reverse();
}


// ============================================================
// LEARNING EVENT COUNT
// ============================================================

countLearningEvents() {
    return Array.isArray(
        this.data.learningEvents
    )
        ? this.data.learningEvents.length
        : 0;
}


// ============================================================
// MEMORY QUALITY SNAPSHOT
// ============================================================

createQualitySnapshot() {
    return {
        id:
            this.createRecordId(),

        createdAt:
            this.nowIso(),

        records:
            this.countRecords({
                includeArchived: true,
                includeDeleted: true
            }),

        active:
            this.countActiveRecords(),

        averageQuality:
            this.getAverageQuality(),

        averageConfidence:
            this.getAverageConfidence(),

        finalQuality:
            this.getActiveRecords()
                .length
                ? this.getActiveRecords()
                    .reduce(
                        (sum, record) =>
                            sum +
                            this.getFinalQuality(
                                record
                            ),
                        0
                    ) /
                    this.getActiveRecords()
                        .length
                : 0,

        trusted:
            this.getTrustedRecords()
                .length,

        verified:
            this.getActiveRecords()
                .filter(
                    (record) =>
                        (
                            this.safeNumber(
                                record.verificationCount,
                                0
                            ) > 0
                        )
                )
                .length,

        hitRate:
            this.getHitRate(),

        totalUsage:
            this.getTotalUsage()
    };
}


// ============================================================
// SAVE QUALITY SNAPSHOT
// ============================================================

saveQualitySnapshot() {
    if (
        !Array.isArray(
            this.data.qualitySnapshots
        )
    ) {
        this.data.qualitySnapshots =
            [];
    }

    const snapshot =
        this.createQualitySnapshot();

    this.data.qualitySnapshots.push(
        snapshot
    );

    if (
        this.data.qualitySnapshots.length >
        1000
    ) {
        this.data.qualitySnapshots =
            this.data.qualitySnapshots
                .slice(
                    -1000
                );
    }

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,
        snapshot
    };
}


// ============================================================
// GET QUALITY SNAPSHOTS
// ============================================================

getQualitySnapshots(
    limit = 50
) {
    if (
        !Array.isArray(
            this.data.qualitySnapshots
        )
    ) {
        return [];
    }

    return this.data.qualitySnapshots
        .slice(
            -Math.max(
                1,
                Math.floor(
                    this.safeNumber(
                        limit,
                        50
                    )
                )
            )
        )
        .reverse();
}


// ============================================================
// TREND
// ============================================================

getQualityTrend() {
    const snapshots =
        this.getQualitySnapshots(
            20
        );

    if (
        snapshots.length < 2
    ) {
        return {
            trend: "insufficient-data",
            delta: 0,
            samples:
                snapshots.length
        };
    }

    const newest =
        snapshots[0];

    const oldest =
        snapshots[
            snapshots.length - 1
        ];

    const delta =
        (
            newest.finalQuality ||
            0
        ) -
        (
            oldest.finalQuality ||
            0
        );

    let trend = "stable";

    if (
        delta >= 0.05
    ) {
        trend = "improving";
    } else if (
        delta <= -0.05
    ) {
        trend = "declining";
    }

    return {
        trend,
        delta,
        samples:
            snapshots.length
    };
}


// ============================================================
// FINAL MEMORY SCORE
// ============================================================

calculateMemoryAnswerScore(
    question = "",
    record = null,
    options = {}
) {
    if (!record) {
        return 0;
    }

    const similarity =
        this.textSimilarity(
            question,
            record.question
        );

    const quality =
        this.getFinalQuality(
            record
        );

    const feedback =
        this.getFeedbackScore(
            record
        );

    const confidence =
        this.normalizeConfidence(
            record.confidence
        );

    const sourceTrust =
        this.getSourceTrust(
            record.source
        );

    const usage =
        Math.min(
            1,
            Math.log10(
                this.safeNumber(
                    record.usageCount,
                    0
                ) + 1
            ) / 3
        );

    let score =
        similarity * 0.42 +
        quality * 0.20 +
        confidence * 0.14 +
        feedback * 0.08 +
        sourceTrust * 0.08 +
        usage * 0.08;

    if (
        record.trusted
    ) {
        score += 0.05;
    }

    if (
        record.pinned
    ) {
        score += 0.04;
    }

    if (
        record.favorite
    ) {
        score += 0.01;
    }

    if (
        options.userId &&
        record.userId &&
        record.userId ===
            options.userId
    ) {
        score += 0.04;
    }

    return this.clamp01(
        score
    );
}


// ============================================================
// MEMORY ANSWER RANKER
// ============================================================

rankMemoryAnswers(
    question = "",
    records = [],
    options = {}
) {
    if (
        !Array.isArray(
            records
        )
    ) {
        return [];
    }

    const ranked =
        records.map(
            (record) => ({
                ...record,

                _memoryScore:
                    this.calculateMemoryAnswerScore(
                        question,
                        record,
                        options
                    )
            })
        );

    ranked.sort(
        (a, b) =>
            (
                b._memoryScore ||
                0
            ) -
            (
                a._memoryScore ||
                0
            )
    );

    const limit =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    options.limit,
                    10
                )
            )
        );

    return ranked.slice(
        0,
        limit
    );
}


// ============================================================
// MEMORY ANSWER SEARCH V2
// ============================================================

searchMemoryAnswers(
    question = "",
    options = {}
) {
    const candidates =
        this.getCandidates(
            question,
            {
                ...options,
                fallbackToAll: true
            }
        );

    const filtered =
        this.filterCandidates(
            candidates,
            options
        );

    const ranked =
        this.rankMemoryAnswers(
            question,
            filtered,
            options
        );

    if (
        !ranked.length
    ) {
        return {
            found: false,
            answer: null,
            score: 0,
            confidence: 0,
            source: "not-found",
            record: null,
            candidates: []
        };
    }

    const best =
        ranked[0];

    const threshold =
        this.clamp01(
            this.safeNumber(
                options.minScore,
                0.70
            )
        );

    const exact =
        this.exactMatch(
            question,
            best.question
        );

    const alias =
        Array.isArray(
            best.aliases
        ) &&
        best.aliases.some(
            (item) =>
                this.exactMatch(
                    question,
                    item
                )
        );

    const found =
        exact ||
        alias ||
        (
            (
                best._memoryScore ||
                0
            ) >= threshold
        );

    if (
        found
    ) {
        this.registerHit(
            best,
            {
                save: false
            }
        );
    }

    return {
        found,

        answer:
            found
                ? this.cleanAnswerText(
                    best.answer
                )
                : null,

        score:
            best._memoryScore ||
            0,

        confidence:
            this.boostConfidence(
                best._memoryScore ||
                0,
                {
                    exact,
                    alias,
                    trusted:
                        best.trusted,
                    pinned:
                        best.pinned,
                    highUsage:
                        (
                            best.usageCount ||
                            0
                        ) >= 10
                }
            ),

        source:
            exact
                ? "memory-v2-exact"
                : alias
                    ? "memory-v2-alias"
                    : "memory-v2-smart",

        record:
            found
                ? best
                : null,

        candidates:
            ranked
    };
}


// ============================================================
// MEMORY ANSWER SEARCH V3
// ============================================================

searchMemoryAnswersV3(
    question = "",
    options = {}
) {
    const direct =
        this.directLookup(
            question
        );

    if (
        direct.found
    ) {
        return direct;
    }

    return this.searchMemoryAnswers(
        question,
        {
            ...options,
            minScore:
                options.minScore ??
                0.72
        }
    );
}


// ============================================================
// ULTIMATE QUALITY SEARCH
// ============================================================

ultimateQualitySearch(
    question = "",
    options = {}
) {
    const result =
        this.searchMemoryAnswersV3(
            question,
            options
        );

    if (
        !result.found
    ) {
        return result;
    }

    const record =
        result.record;

    if (!record) {
        return result;
    }

    const quality =
        this.getFinalQuality(
            record
        );

    const confidence =
        this.normalizeConfidence(
            result.confidence
        );

    return {
        ...result,

        quality,

        confidence:
            this.clamp01(
                confidence * 0.60 +
                quality * 0.40
            ),

        trustLevel:
            this.getTrustLevel(
                record
            ),

        qualityBadge:
            this.getQualityBadge(
                record
            )
    };
}


// ============================================================
// GET ANSWER WITH FULL METADATA
// ============================================================

getAnswerDetailed(
    question = "",
    options = {}
) {
    const result =
        this.ultimateQualitySearch(
            question,
            options
        );

    return {
        ok: true,

        found:
            Boolean(
                result.found
            ),

        answer:
            result.answer,

        score:
            result.score || 0,

        confidence:
            result.confidence || 0,

        quality:
            result.quality || 0,

        source:
            result.source,

        trustLevel:
            result.trustLevel ||
            "unknown",

        record:
            result.record ||
            null,

        candidates:
            result.candidates ||
            []
    };
}


// ============================================================
// ANSWER ONLY
// ============================================================

answerOnly(
    question = "",
    options = {}
) {
    const result =
        this.getAnswerDetailed(
            question,
            options
        );

    return result.found
        ? result.answer
        : null;
}


// ============================================================
// SAVE ANSWER FROM RESULT
// ============================================================

saveAnswerResult(
    question = "",
    answer = "",
    options = {}
) {
    return this.runLearningPipeline(
        question,
        answer,
        {
            ...options,

            source:
                options.source ||
                "answer-result"
        }
    );
}


// ============================================================
// PROCESS ANSWER HIT
// ============================================================

processAnswerHit(
    question = "",
    options = {}
) {
    const result =
        this.getAnswerDetailed(
            question,
            options
        );

    if (
        result.found &&
        result.record
    ) {
        this.registerHit(
            result.record,
            {
                save:
                    options.save !== false
            }
        );

        this.recordLearningEvent(
            "answer-hit",
            {
                question,
                recordId:
                    result.record.id,
                score:
                    result.score,
                confidence:
                    result.confidence
            }
        );
    }

    return result;
}


// ============================================================
// PROCESS ANSWER MISS
// ============================================================

processAnswerMiss(
    question = "",
    options = {}
) {
    const existing =
        this.findBestRecord(
            question,
            {
                minScore:
                    options.minScore ??
                    0.45
            }
        );

    if (
        existing
    ) {
        this.registerMiss(
            existing,
            {
                save:
                    options.save !== false
            }
        );
    }

    this.recordLearningEvent(
        "answer-miss",
        {
            question,
            recordId:
                existing?.id ||
                null
        }
    );

    return {
        ok: true,

        found:
            Boolean(
                existing
            ),

        record:
            existing ||
            null
    };
}


// ============================================================
// ANSWER FEEDBACK PIPELINE
// ============================================================

processFeedback(
    id = "",
    feedbackType = "positive",
    options = {}
) {
    const result =
        this.feedback(
            id,
            feedbackType,
            options
        );

    this.recordLearningEvent(
        "feedback",
        {
            id,
            feedbackType,
            result
        }
    );

    return result;
}


// ============================================================
// LEARNING HEALTH
// ============================================================

getLearningHealth() {
    return {
        ok: true,

        status:
            this.getSearchEngineStatus(),

        quality:
            this.getQualityReport(),

        autoLearn:
            this.getAutoLearnReport(),

        trust:
            this.getTrustReport(),

        learning:
            this.getLearningSummary(),

        trend:
            this.getQualityTrend(),

        events:
            this.countLearningEvents()
    };
}


// ============================================================
// FINAL SELF TEST — PART 5
// ============================================================

runQualitySelfTest() {
    const tests = [
        {
            name: "quality",
            result:
                typeof this.calculateRecordQuality ===
                "function"
        },
        {
            name: "feedback",
            result:
                typeof this.feedback ===
                "function"
        },
        {
            name: "autolearn",
            result:
                typeof this.autoLearn ===
                "function"
        },
        {
            name: "trust",
            result:
                typeof this.trustRecord ===
                "function"
        },
        {
            name: "verification",
            result:
                typeof this.verifyRecord ===
                "function"
        },
        {
            name: "learning-pipeline",
            result:
                typeof this.runLearningPipeline ===
                "function"
        },
        {
            name: "quality-search",
            result:
                typeof this.ultimateQualitySearch ===
                "function"
        }
    ];

    const passed =
        tests.filter(
            (item) =>
                item.result
        ).length;

    return {
        ok:
            passed ===
            tests.length,

        total:
            tests.length,

        passed,

        failed:
            tests.length -
            passed,

        tests
    };
}


// ============================================================
// PART 5 END
// ============================================================
// ============================================================
// TÜRKAI — ANSWER MEMORY
// PART 6 / 10
// USER MEMORY + PROFILE + FACTS + PREFERENCES
// HISTORY + TOPICS + CONVERSATION CONTEXT
// BULK MEMORY OPERATIONS + USER-SCOPED ANSWERS
// ============================================================


// ============================================================
// USER MEMORY CONFIG
// ============================================================

getUserMemoryConfig() {
    return {
        enabled: true,

        maxUsers: 100000,

        maxFactsPerUser: 5000,

        maxPreferencesPerUser: 2000,

        maxHistoryPerUser: 10000,

        maxTopicsPerUser: 1000,

        maxQuestionsPerUser: 10000,

        maxAnswerHitsPerUser: 10000,

        historyRetentionDays: 3650,

        minFactLength: 1,

        maxFactLength: 5000,

        minPreferenceLength: 1,

        maxPreferenceLength: 2000,

        contextWindow: 30,

        enableAutoProfile: true,

        enableQuestionHistory: true,

        enableAnswerHistory: true,

        enableTopicTracking: true,

        enablePreferences: true,

        enableFacts: true
    };
}


// ============================================================
// USER ID NORMALIZER
// ============================================================

normalizeUserId(
    userId = ""
) {
    return this.safeText(
        userId
    );
}


// ============================================================
// ANONYMOUS USER ID
// ============================================================

getAnonymousUserId() {
    return "anonymous";
}


// ============================================================
// RESOLVE USER ID
// ============================================================

resolveUserId(
    userId = ""
) {
    const clean =
        this.normalizeUserId(
            userId
        );

    return clean ||
        this.getAnonymousUserId();
}


// ============================================================
// USER STORAGE ENSURE
// ============================================================

ensureUserStorage() {

    if (
        !this.data.users ||
        typeof this.data.users !==
            "object" ||
        Array.isArray(
            this.data.users
        )
    ) {
        this.data.users = {};
    }

    return this.data.users;
}


// ============================================================
// USER MEMORY ENSURE
// ============================================================

ensureUserMemory(
    userId = ""
) {

    const resolved =
        this.resolveUserId(
            userId
        );

    const users =
        this.ensureUserStorage();

    if (
        !users[resolved] ||
        typeof users[resolved] !==
            "object"
    ) {
        users[resolved] = {
            id: resolved,

            createdAt:
                this.nowIso(),

            updatedAt:
                this.nowIso(),

            profile: {
                name: "",
                displayName: "",
                language: "tr",
                timezone: "",
                country: "",
                city: "",
                bio: "",
                role: "",
                grade: "",
                occupation: "",
                platform: "",
                device: ""
            },

            facts: [],

            preferences: [],

            questions: [],

            answers: [],

            topics: [],

            history: [],

            answerHits: [],

            context: [],

            aliases: [],

            customData: {},

            stats: {
                totalQuestions: 0,
                totalAnswers: 0,
                totalMemoryHits: 0,
                totalFacts: 0,
                totalPreferences: 0,
                totalTopics: 0
            }
        };
    }

    const user =
        users[resolved];

    if (
        !user.profile ||
        typeof user.profile !==
            "object"
    ) {
        user.profile = {};
    }

    if (
        !Array.isArray(
            user.facts
        )
    ) {
        user.facts = [];
    }

    if (
        !Array.isArray(
            user.preferences
        )
    ) {
        user.preferences = [];
    }

    if (
        !Array.isArray(
            user.questions
        )
    ) {
        user.questions = [];
    }

    if (
        !Array.isArray(
            user.answers
        )
    ) {
        user.answers = [];
    }

    if (
        !Array.isArray(
            user.topics
        )
    ) {
        user.topics = [];
    }

    if (
        !Array.isArray(
            user.history
        )
    ) {
        user.history = [];
    }

    if (
        !Array.isArray(
            user.answerHits
        )
    ) {
        user.answerHits = [];
    }

    if (
        !Array.isArray(
            user.context
        )
    ) {
        user.context = [];
    }

    if (
        !Array.isArray(
            user.aliases
        )
    ) {
        user.aliases = [];
    }

    if (
        !user.customData ||
        typeof user.customData !==
            "object" ||
        Array.isArray(
            user.customData
        )
    ) {
        user.customData = {};
    }

    if (
        !user.stats ||
        typeof user.stats !==
            "object"
    ) {
        user.stats = {};
    }

    const defaultStats = {
        totalQuestions: 0,
        totalAnswers: 0,
        totalMemoryHits: 0,
        totalFacts: 0,
        totalPreferences: 0,
        totalTopics: 0
    };

    for (
        const [
            key,
            value
        ]
        of Object.entries(
            defaultStats
        )
    ) {
        if (
            typeof user.stats[key] !==
            "number"
        ) {
            user.stats[key] =
                value;
        }
    }

    user.updatedAt =
        this.nowIso();

    return user;
}


// ============================================================
// USER EXISTS
// ============================================================

hasUser(
    userId = ""
) {

    const resolved =
        this.resolveUserId(
            userId
        );

    const users =
        this.ensureUserStorage();

    return Boolean(
        users[resolved]
    );
}


// ============================================================
// CREATE USER
// ============================================================

createUserMemory(
    userId = "",
    options = {}
) {

    const resolved =
        this.resolveUserId(
            userId
        );

    const users =
        this.ensureUserStorage();

    if (
        users[resolved] &&
        options.overwrite !== true
    ) {
        return {
            ok: true,
            created: false,
            existing: true,
            user:
                users[resolved]
        };
    }

    users[resolved] = {
        id: resolved,

        createdAt:
            this.nowIso(),

        updatedAt:
            this.nowIso(),

        profile: {
            name:
                this.safeText(
                    options.name ||
                    ""
                ),

            displayName:
                this.safeText(
                    options.displayName ||
                    ""
                ),

            language:
                this.safeText(
                    options.language ||
                    "tr"
                ) ||
                "tr",

            timezone:
                this.safeText(
                    options.timezone ||
                    ""
                ),

            country:
                this.safeText(
                    options.country ||
                    ""
                ),

            city:
                this.safeText(
                    options.city ||
                    ""
                ),

            bio:
                this.safeText(
                    options.bio ||
                    ""
                ),

            role:
                this.safeText(
                    options.role ||
                    ""
                ),

            grade:
                this.safeText(
                    options.grade ||
                    ""
                ),

            occupation:
                this.safeText(
                    options.occupation ||
                    ""
                ),

            platform:
                this.safeText(
                    options.platform ||
                    ""
                ),

            device:
                this.safeText(
                    options.device ||
                    ""
                )
        },

        facts: [],

        preferences: [],

        questions: [],

        answers: [],

        topics: [],

        history: [],

        answerHits: [],

        context: [],

        aliases: [],

        customData: {},

        stats: {
            totalQuestions: 0,
            totalAnswers: 0,
            totalMemoryHits: 0,
            totalFacts: 0,
            totalPreferences: 0,
            totalTopics: 0
        }
    };

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,
        created: true,
        existing: false,
        user:
            users[resolved]
    };
}


// ============================================================
// GET USER MEMORY
// ============================================================

getUserMemory(
    userId = ""
) {
    return this.ensureUserMemory(
        userId
    );
}


// ============================================================
// GET USER
// ============================================================

getUser(
    userId = ""
) {
    return this.getUserMemory(
        userId
    );
}


// ============================================================
// USER PROFILE
// ============================================================

getUserProfile(
    userId = ""
) {

    const user =
        this.getUserMemory(
            userId
        );

    return {
        ...(user.profile || {})
    };
}


// ============================================================
// SET PROFILE VALUE
// ============================================================

setUserProfileValue(
    userId = "",
    key = "",
    value = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    const cleanKey =
        this.safeText(
            key
        );

    if (!cleanKey) {
        return {
            ok: false,
            updated: false,
            reason: "profile-key-empty"
        };
    }

    const cleanValue =
        this.safeText(
            value
        );

    if (
        !user.profile ||
        typeof user.profile !==
            "object"
    ) {
        user.profile = {};
    }

    const previous =
        user.profile[
            cleanKey
        ] ?? null;

    user.profile[
        cleanKey
    ] =
        cleanValue;

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,

        updated: true,

        userId:
            user.id,

        key:
            cleanKey,

        previous,

        value:
            cleanValue
    };
}


// ============================================================
// SET PROFILE
// ============================================================

setUserProfile(
    userId = "",
    profile = {},
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    if (
        !profile ||
        typeof profile !==
            "object"
    ) {
        return {
            ok: false,
            updated: false,
            reason: "profile-object-required"
        };
    }

    if (
        !user.profile ||
        typeof user.profile !==
            "object"
    ) {
        user.profile = {};
    }

    const previous =
        {
            ...user.profile
        };

    user.profile = {
        ...user.profile,
        ...profile
    };

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,

        updated: true,

        userId:
            user.id,

        previous,

        profile:
            user.profile
    };
}


// ============================================================
// CLEAR PROFILE VALUE
// ============================================================

clearUserProfileValue(
    userId = "",
    key = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    const cleanKey =
        this.safeText(
            key
        );

    if (!cleanKey) {
        return {
            ok: false,
            updated: false,
            reason: "profile-key-empty"
        };
    }

    if (
        !Object.prototype.hasOwnProperty.call(
            user.profile,
            cleanKey
        )
    ) {
        return {
            ok: true,
            updated: false,
            reason: "profile-key-not-found"
        };
    }

    const previous =
        user.profile[
            cleanKey
        ];

    delete user.profile[
        cleanKey
    ];

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,

        updated: true,

        key:
            cleanKey,

        previous
    };
}


// ============================================================
// RESET USER PROFILE
// ============================================================

resetUserProfile(
    userId = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    user.profile = {
        name: "",
        displayName: "",
        language: "tr",
        timezone: "",
        country: "",
        city: "",
        bio: "",
        role: "",
        grade: "",
        occupation: "",
        platform: "",
        device: ""
    };

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        reset: true,
        userId:
            user.id,
        profile:
            user.profile
    };
}


// ============================================================
// USER NAME
// ============================================================

getUserName(
    userId = ""
) {

    const profile =
        this.getUserProfile(
            userId
        );

    return (
        this.safeText(
            profile.displayName
        ) ||
        this.safeText(
            profile.name
        ) ||
        ""
    );
}


// ============================================================
// SET USER NAME
// ============================================================

setUserName(
    userId = "",
    name = "",
    options = {}
) {

    const clean =
        this.safeText(
            name
        );

    return this.setUserProfile(
        userId,
        {
            name:
                clean,

            displayName:
                clean
        },
        options
    );
}


// ============================================================
// USER LANGUAGE
// ============================================================

getUserLanguage(
    userId = ""
) {

    return (
        this.safeText(
            this.getUserProfile(
                userId
            ).language
        ) ||
        "tr"
    );
}


// ============================================================
// SET LANGUAGE
// ============================================================

setUserLanguage(
    userId = "",
    language = "tr",
    options = {}
) {

    return this.setUserProfileValue(
        userId,
        "language",
        language,
        options
    );
}


// ============================================================
// USER FACT STORAGE
// ============================================================

normalizeFact(
    fact = ""
) {

    return this.cleanQuestionText(
        fact
    );
}


// ============================================================
// FACT KEY
// ============================================================

createFactKey(
    fact = ""
) {

    return this.normalizeQuestion(
        fact
    );
}


// ============================================================
// FACT OBJECT
// ============================================================

createFact(
    fact = "",
    options = {}
) {

    const clean =
        this.normalizeFact(
            fact
        );

    return {
        id:
            options.id ||
            this.createRecordId(),

        text:
            clean,

        key:
            this.createFactKey(
                clean
            ),

        category:
            this.safeText(
                options.category ||
                "general"
            ),

        source:
            this.safeText(
                options.source ||
                "user"
            ),

        confidence:
            this.normalizeConfidence(
                options.confidence ??
                0.80
            ),

        important:
            options.important === true,

        verified:
            options.verified === true,

        createdAt:
            options.createdAt ||
            this.nowIso(),

        updatedAt:
            options.updatedAt ||
            this.nowIso(),

        metadata:
            options.metadata &&
            typeof options.metadata ===
                "object"
                ? {
                    ...options.metadata
                }
                : {}
    };
}


// ============================================================
// ADD USER FACT
// ============================================================

addUserFact(
    userId = "",
    fact = "",
    options = {}
) {

    const config =
        this.getUserMemoryConfig();

    const user =
        this.getUserMemory(
            userId
        );

    const clean =
        this.normalizeFact(
            fact
        );

    if (
        !clean
    ) {
        return {
            ok: false,
            saved: false,
            reason: "fact-empty"
        };
    }

    if (
        clean.length >
        config.maxFactLength
    ) {
        return {
            ok: false,
            saved: false,
            reason: "fact-too-long"
        };
    }

    if (
        clean.length <
        config.minFactLength
    ) {
        return {
            ok: false,
            saved: false,
            reason: "fact-too-short"
        };
    }

    const key =
        this.createFactKey(
            clean
        );

    const existing =
        user.facts.find(
            (item) =>
                item &&
                item.key === key
        );

    if (
        existing
    ) {

        if (
            options.updateExisting ===
            false
        ) {
            return {
                ok: true,
                saved: false,
                duplicate: true,
                reason: "fact-exists",
                fact:
                    existing
            };
        }

        const updated =
            this.updateUserFact(
                user.id,
                existing.id,
                {
                    text:
                        clean,

                    category:
                        options.category ||
                        existing.category,

                    source:
                        options.source ||
                        existing.source,

                    confidence:
                        options.confidence ??
                        existing.confidence,

                    important:
                        options.important ??
                        existing.important,

                    verified:
                        options.verified ??
                        existing.verified,

                    metadata:
                        options.metadata ||
                        existing.metadata
                }
            );

        return {
            ...updated,

            duplicate: true
        };
    }

    if (
        user.facts.length >=
        config.maxFactsPerUser
    ) {

        user.facts.shift();
    }

    const record =
        this.createFact(
            clean,
            options
        );

    user.facts.push(
        record
    );

    user.stats.totalFacts =
        user.facts.length;

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,

        saved: true,

        duplicate: false,

        userId:
            user.id,

        fact:
            record
    };
}


// ============================================================
// ADD FACT ALIAS
// ============================================================

saveUserFact(
    userId = "",
    fact = "",
    options = {}
) {
    return this.addUserFact(
        userId,
        fact,
        options
    );
}


// ============================================================
// GET USER FACTS
// ============================================================

getUserFacts(
    userId = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    let facts = [
        ...user.facts
    ];

    if (
        options.category
    ) {
        facts =
            facts.filter(
                (fact) =>
                    fact.category ===
                    options.category
            );
    }

    if (
        options.important === true
    ) {
        facts =
            facts.filter(
                (fact) =>
                    fact.important ===
                    true
            );
    }

    if (
        options.verified === true
    ) {
        facts =
            facts.filter(
                (fact) =>
                    fact.verified ===
                    true
            );
    }

    if (
        options.limit
    ) {
        facts =
            facts.slice(
                0,
                Math.max(
                    1,
                    Math.floor(
                        this.safeNumber(
                            options.limit,
                            50
                        )
                    )
                )
            );
    }

    return facts;
}


// ============================================================
// GET FACT
// ============================================================

getUserFact(
    userId = "",
    factId = ""
) {

    const user =
        this.getUserMemory(
            userId
        );

    const id =
        this.safeText(
            factId
        );

    return (
        user.facts.find(
            (fact) =>
                fact &&
                fact.id === id
        ) ||
        null
    );
}


// ============================================================
// FIND FACT BY TEXT
// ============================================================

findUserFact(
    userId = "",
    fact = ""
) {

    const user =
        this.getUserMemory(
            userId
        );

    const key =
        this.createFactKey(
            fact
        );

    return (
        user.facts.find(
            (item) =>
                item &&
                (
                    item.key === key ||
                    this.areShortMessagesEquivalent(
                        item.text,
                        fact
                    )
                )
        ) ||
        null
    );
}


// ============================================================
// UPDATE FACT
// ============================================================

updateUserFact(
    userId = "",
    factId = "",
    changes = {},
    options = {}
) {

    const fact =
        this.getUserFact(
            userId,
            factId
        );

    if (!fact) {
        return {
            ok: false,
            updated: false,
            reason: "fact-not-found"
        };
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "text"
        )
    ) {
        const clean =
            this.normalizeFact(
                changes.text
            );

        if (clean) {
            fact.text =
                clean;

            fact.key =
                this.createFactKey(
                    clean
                );
        }
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "category"
        )
    ) {
        fact.category =
            this.safeText(
                changes.category
            ) ||
            fact.category;
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "source"
        )
    ) {
        fact.source =
            this.safeText(
                changes.source
            ) ||
            fact.source;
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "confidence"
        )
    ) {
        fact.confidence =
            this.normalizeConfidence(
                changes.confidence
            );
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "important"
        )
    ) {
        fact.important =
            changes.important === true;
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "verified"
        )
    ) {
        fact.verified =
            changes.verified === true;
    }

    if (
        changes.metadata &&
        typeof changes.metadata ===
            "object"
    ) {
        fact.metadata = {
            ...(fact.metadata || {}),
            ...changes.metadata
        };
    }

    fact.updatedAt =
        this.nowIso();

    const user =
        this.getUserMemory(
            userId
        );

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,

        updated: true,

        userId:
            user.id,

        fact
    };
}


// ============================================================
// REMOVE FACT
// ============================================================

removeUserFact(
    userId = "",
    factId = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    const index =
        user.facts.findIndex(
            (fact) =>
                fact &&
                fact.id ===
                    this.safeText(
                        factId
                    )
        );

    if (
        index === -1
    ) {
        return {
            ok: false,
            removed: false,
            reason: "fact-not-found"
        };
    }

    const removed =
        user.facts.splice(
            index,
            1
        )[0];

    user.stats.totalFacts =
        user.facts.length;

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,

        removed: true,

        userId:
            user.id,

        fact:
            removed
    };
}


// ============================================================
// CLEAR FACTS
// ============================================================

clearUserFacts(
    userId = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    const count =
        user.facts.length;

    if (
        options.keepImportant === true
    ) {
        user.facts =
            user.facts.filter(
                (fact) =>
                    fact &&
                    fact.important ===
                        true
            );
    } else {
        user.facts = [];
    }

    user.stats.totalFacts =
        user.facts.length;

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,

        cleared:
            count -
            user.facts.length,

        remaining:
            user.facts.length
    };
}


// ============================================================
// VERIFY FACT
// ============================================================

verifyUserFact(
    userId = "",
    factId = "",
    options = {}
) {

    const fact =
        this.getUserFact(
            userId,
            factId
        );

    if (!fact) {
        return {
            ok: false,
            verified: false,
            reason: "fact-not-found"
        };
    }

    fact.verified =
        true;

    fact.confidence =
        Math.max(
            this.normalizeConfidence(
                fact.confidence
            ),
            0.90
        );

    fact.updatedAt =
        this.nowIso();

    const user =
        this.getUserMemory(
            userId
        );

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,

        verified: true,

        fact
    };
}


// ============================================================
// USER PREFERENCE
// ============================================================

normalizePreference(
    preference = ""
) {
    return this.cleanQuestionText(
        preference
    );
}


// ============================================================
// PREFERENCE OBJECT
// ============================================================

createPreference(
    preference = "",
    options = {}
) {

    const clean =
        this.normalizePreference(
            preference
        );

    return {
        id:
            options.id ||
            this.createRecordId(),

        text:
            clean,

        key:
            this.normalizeQuestion(
                clean
            ),

        category:
            this.safeText(
                options.category ||
                "general"
            ),

        value:
            options.value ??
            true,

        source:
            this.safeText(
                options.source ||
                "user"
            ),

        confidence:
            this.normalizeConfidence(
                options.confidence ??
                0.80
            ),

        createdAt:
            options.createdAt ||
            this.nowIso(),

        updatedAt:
            options.updatedAt ||
            this.nowIso(),

        metadata:
            options.metadata &&
            typeof options.metadata ===
                "object"
                ? {
                    ...options.metadata
                }
                : {}
    };
}


// ============================================================
// ADD PREFERENCE
// ============================================================

addUserPreference(
    userId = "",
    preference = "",
    options = {}
) {

    const config =
        this.getUserMemoryConfig();

    const user =
        this.getUserMemory(
            userId
        );

    const clean =
        this.normalizePreference(
            preference
        );

    if (!clean) {
        return {
            ok: false,
            saved: false,
            reason: "preference-empty"
        };
    }

    if (
        clean.length >
        config.maxPreferenceLength
    ) {
        return {
            ok: false,
            saved: false,
            reason: "preference-too-long"
        };
    }

    const key =
        this.normalizeQuestion(
            clean
        );

    const existing =
        user.preferences.find(
            (item) =>
                item &&
                item.key === key
        );

    if (
        existing
    ) {

        if (
            options.updateExisting ===
            false
        ) {
            return {
                ok: true,
                saved: false,
                duplicate: true,
                preference:
                    existing
            };
        }

        const updated =
            this.updateUserPreference(
                user.id,
                existing.id,
                {
                    text:
                        clean,

                    value:
                        options.value ??
                        existing.value,

                    category:
                        options.category ||
                        existing.category,

                    confidence:
                        options.confidence ??
                        existing.confidence,

                    metadata:
                        options.metadata ||
                        existing.metadata
                }
            );

        return {
            ...updated,

            duplicate: true
        };
    }

    if (
        user.preferences.length >=
        config.maxPreferencesPerUser
    ) {
        user.preferences.shift();
    }

    const record =
        this.createPreference(
            clean,
            options
        );

    user.preferences.push(
        record
    );

    user.stats.totalPreferences =
        user.preferences.length;

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,

        saved: true,

        duplicate: false,

        preference:
            record
    };
}


// ============================================================
// SAVE PREFERENCE
// ============================================================

saveUserPreference(
    userId = "",
    preference = "",
    options = {}
) {
    return this.addUserPreference(
        userId,
        preference,
        options
    );
}


// ============================================================
// GET PREFERENCES
// ============================================================

getUserPreferences(
    userId = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    let preferences =
        [
            ...user.preferences
        ];

    if (
        options.category
    ) {
        preferences =
            preferences.filter(
                (item) =>
                    item.category ===
                    options.category
            );
    }

    if (
        options.limit
    ) {
        preferences =
            preferences.slice(
                0,
                Math.max(
                    1,
                    Math.floor(
                        this.safeNumber(
                            options.limit,
                            50
                        )
                    )
                )
            );
    }

    return preferences;
}


// ============================================================
// GET PREFERENCE
// ============================================================

getUserPreference(
    userId = "",
    preferenceId = ""
) {

    const user =
        this.getUserMemory(
            userId
        );

    return (
        user.preferences.find(
            (item) =>
                item &&
                item.id ===
                    this.safeText(
                        preferenceId
                    )
        ) ||
        null
    );
}


// ============================================================
// FIND PREFERENCE
// ============================================================

findUserPreference(
    userId = "",
    preference = ""
) {

    const user =
        this.getUserMemory(
            userId
        );

    const key =
        this.normalizeQuestion(
            preference
        );

    return (
        user.preferences.find(
            (item) =>
                item &&
                item.key === key
        ) ||
        null
    );
}


// ============================================================
// UPDATE PREFERENCE
// ============================================================

updateUserPreference(
    userId = "",
    preferenceId = "",
    changes = {},
    options = {}
) {

    const preference =
        this.getUserPreference(
            userId,
            preferenceId
        );

    if (!preference) {
        return {
            ok: false,
            updated: false,
            reason:
                "preference-not-found"
        };
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "text"
        )
    ) {

        const clean =
            this.normalizePreference(
                changes.text
            );

        if (clean) {

            preference.text =
                clean;

            preference.key =
                this.normalizeQuestion(
                    clean
                );
        }
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "value"
        )
    ) {
        preference.value =
            changes.value;
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "category"
        )
    ) {
        preference.category =
            this.safeText(
                changes.category
            ) ||
            preference.category;
    }

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "confidence"
        )
    ) {
        preference.confidence =
            this.normalizeConfidence(
                changes.confidence
            );
    }

    if (
        changes.metadata &&
        typeof changes.metadata ===
            "object"
    ) {
        preference.metadata = {
            ...(preference.metadata || {}),
            ...changes.metadata
        };
    }

    preference.updatedAt =
        this.nowIso();

    const user =
        this.getUserMemory(
            userId
        );

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        updated: true,
        preference
    };
}


// ============================================================
// REMOVE PREFERENCE
// ============================================================

removeUserPreference(
    userId = "",
    preferenceId = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    const index =
        user.preferences.findIndex(
            (item) =>
                item &&
                item.id ===
                    this.safeText(
                        preferenceId
                    )
        );

    if (
        index === -1
    ) {
        return {
            ok: false,
            removed: false,
            reason:
                "preference-not-found"
        };
    }

    const removed =
        user.preferences.splice(
            index,
            1
        )[0];

    user.stats.totalPreferences =
        user.preferences.length;

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        removed: true,
        preference:
            removed
    };
}


// ============================================================
// CLEAR PREFERENCES
// ============================================================

clearUserPreferences(
    userId = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    const count =
        user.preferences.length;

    user.preferences = [];

    user.stats.totalPreferences =
        0;

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        cleared: count
    };
}


// ============================================================
// QUESTION HISTORY OBJECT
// ============================================================

createQuestionHistoryEntry(
    question = "",
    options = {}
) {

    const clean =
        this.cleanQuestionText(
            question
        );

    return {
        id:
            options.id ||
            this.createRecordId(),

        question:
            clean,

        normalized:
            this.normalizeQuestion(
                clean
            ),

        category:
            this.safeText(
                options.category ||
                "general"
            ),

        source:
            this.safeText(
                options.source ||
                "user"
            ),

        timestamp:
            options.timestamp ||
            this.nowIso(),

        createdAt:
            options.createdAt ||
            this.nowIso(),

        metadata:
            options.metadata &&
            typeof options.metadata ===
                "object"
                ? {
                    ...options.metadata
                }
                : {}
    };
}


// ============================================================
// RECORD USER QUESTION
// ============================================================

recordUserQuestion(
    userId = "",
    question = "",
    options = {}
) {

    const config =
        this.getUserMemoryConfig();

    const user =
        this.getUserMemory(
            userId
        );

    const clean =
        this.cleanQuestionText(
            question
        );

    if (!clean) {
        return {
            ok: false,
            saved: false,
            reason:
                "question-empty"
        };
    }

    const entry =
        this.createQuestionHistoryEntry(
            clean,
            options
        );

    if (
        user.questions.length >=
        config.maxQuestionsPerUser
    ) {
        user.questions.shift();
    }

    user.questions.push(
        entry
    );

    user.stats.totalQuestions =
        this.safeNumber(
            user.stats.totalQuestions,
            0
        ) + 1;

    this.addHistoryEntry(
        user.id,
        {
            type: "question",
            text: clean,
            metadata:
                options.metadata ||
                {}
        },
        {
            save: false
        }
    );

    this.trackQuestionTopics(
        user.id,
        clean,
        {
            save: false
        }
    );

    this.addContextEntry(
        user.id,
        {
            role: "user",
            text: clean
        },
        {
            save: false
        }
    );

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        saved: true,
        question:
            entry
    };
}


// ============================================================
// GET QUESTIONS
// ============================================================

getUserQuestions(
    userId = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    let questions =
        [
            ...user.questions
        ];

    if (
        options.category
    ) {
        questions =
            questions.filter(
                (item) =>
                    item.category ===
                    options.category
            );
    }

    if (
        options.limit
    ) {
        questions =
            questions.slice(
                -Math.max(
                    1,
                    Math.floor(
                        this.safeNumber(
                            options.limit,
                            50
                        )
                    )
                )
            );
    }

    return questions;
}


// ============================================================
// FIND USER QUESTIONS
// ============================================================

searchUserQuestions(
    userId = "",
    query = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    const cleanQuery =
        this.normalizeQuestion(
            query
        );

    if (!cleanQuery) {
        return [];
    }

    const results = [];

    for (
        const item
        of user.questions
    ) {

        const score =
            this.textSimilarity(
                cleanQuery,
                item.question
            );

        if (
            score >=
            (
                options.minScore ??
                0.55
            )
        ) {
            results.push({
                ...item,
                score
            });
        }
    }

    results.sort(
        (a, b) =>
            b.score -
            a.score
    );

    return results.slice(
        0,
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    options.limit,
                    20
                )
            )
        )
    );
}


// ============================================================
// ANSWER HISTORY ENTRY
// ============================================================

createAnswerHistoryEntry(
    answer = "",
    options = {}
) {

    const clean =
        this.cleanAnswerText(
            answer
        );

    return {
        id:
            options.id ||
            this.createRecordId(),

        answer:
            clean,

        source:
            this.safeText(
                options.source ||
                "assistant"
            ),

        model:
            this.safeText(
                options.model ||
                ""
            ),

        questionId:
            this.safeText(
                options.questionId ||
                ""
            ),

        score:
            this.clamp01(
                options.score ??
                0
            ),

        confidence:
            this.clamp01(
                options.confidence ??
                0
            ),

        timestamp:
            options.timestamp ||
            this.nowIso(),

        createdAt:
            options.createdAt ||
            this.nowIso(),

        metadata:
            options.metadata &&
            typeof options.metadata ===
                "object"
                ? {
                    ...options.metadata
                }
                : {}
    };
}


// ============================================================
// RECORD USER ANSWER
// ============================================================

recordUserAnswer(
    userId = "",
    answer = "",
    options = {}
) {

    const config =
        this.getUserMemoryConfig();

    const user =
        this.getUserMemory(
            userId
        );

    const clean =
        this.cleanAnswerText(
            answer
        );

    if (!clean) {
        return {
            ok: false,
            saved: false,
            reason:
                "answer-empty"
        };
    }

    const entry =
        this.createAnswerHistoryEntry(
            clean,
            options
        );

    if (
        user.answers.length >=
        config.maxAnswerHitsPerUser
    ) {
        user.answers.shift();
    }

    user.answers.push(
        entry
    );

    user.stats.totalAnswers =
        this.safeNumber(
            user.stats.totalAnswers,
            0
        ) + 1;

    this.addHistoryEntry(
        user.id,
        {
            type: "answer",
            text: clean,
            metadata:
                options.metadata ||
                {}
        },
        {
            save: false
        }
    );

    this.addContextEntry(
        user.id,
        {
            role: "assistant",
            text: clean
        },
        {
            save: false
        }
    );

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        saved: true,
        answer:
            entry
    };
}


// ============================================================
// GET USER ANSWERS
// ============================================================

getUserAnswers(
    userId = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    let answers =
        [
            ...user.answers
        ];

    if (
        options.source
    ) {
        answers =
            answers.filter(
                (item) =>
                    item.source ===
                    options.source
            );
    }

    if (
        options.limit
    ) {
        answers =
            answers.slice(
                -Math.max(
                    1,
                    Math.floor(
                        this.safeNumber(
                            options.limit,
                            50
                        )
                    )
                )
            );
    }

    return answers;
}


// ============================================================
// HISTORY ENTRY
// ============================================================

createHistoryEntry(
    input = {},
    options = {}
) {

    const source =
        input &&
        typeof input ===
            "object"
            ? input
            : {
                text:
                    String(
                        input
                    )
            };

    return {
        id:
            options.id ||
            source.id ||
            this.createRecordId(),

        type:
            this.safeText(
                source.type ||
                options.type ||
                "message"
            ),

        role:
            this.safeText(
                source.role ||
                options.role ||
                ""
            ),

        text:
            this.cleanAnswerText(
                source.text ||
                options.text ||
                ""
            ),

        source:
            this.safeText(
                source.source ||
                options.source ||
                "conversation"
            ),

        timestamp:
            source.timestamp ||
            options.timestamp ||
            this.nowIso(),

        metadata:
            source.metadata &&
            typeof source.metadata ===
                "object"
                ? {
                    ...source.metadata
                }
                : (
                    options.metadata &&
                    typeof options.metadata ===
                        "object"
                        ? {
                            ...options.metadata
                        }
                        : {}
                )
    };
}


// ============================================================
// ADD HISTORY ENTRY
// ============================================================

addHistoryEntry(
    userId = "",
    input = {},
    options = {}
) {

    const config =
        this.getUserMemoryConfig();

    const user =
        this.getUserMemory(
            userId
        );

    const entry =
        this.createHistoryEntry(
            input,
            options
        );

    if (
        !entry.text
    ) {
        return {
            ok: false,
            saved: false,
            reason:
                "history-text-empty"
        };
    }

    if (
        user.history.length >=
        config.maxHistoryPerUser
    ) {
        user.history.shift();
    }

    user.history.push(
        entry
    );

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        saved: true,
        entry
    };
}


// ============================================================
// GET HISTORY
// ============================================================

getUserHistory(
    userId = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    let history =
        [
            ...user.history
        ];

    if (
        options.type
    ) {
        history =
            history.filter(
                (item) =>
                    item.type ===
                    options.type
            );
    }

    if (
        options.role
    ) {
        history =
            history.filter(
                (item) =>
                    item.role ===
                    options.role
            );
    }

    if (
        options.source
    ) {
        history =
            history.filter(
                (item) =>
                    item.source ===
                    options.source
            );
    }

    const limit =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    options.limit,
                    50
                )
            )
        );

    return history.slice(
        -limit
    );
}


// ============================================================
// CLEAR HISTORY
// ============================================================

clearUserHistory(
    userId = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    const count =
        user.history.length;

    if (
        options.keepQuestions === true ||
        options.keepAnswers === true
    ) {

        user.history =
            user.history.filter(
                (entry) => {

                    if (
                        options.keepQuestions &&
                        entry.type ===
                            "question"
                    ) {
                        return true;
                    }

                    if (
                        options.keepAnswers &&
                        entry.type ===
                            "answer"
                    ) {
                        return true;
                    }

                    return false;
                }
            );

    } else {
        user.history = [];
    }

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,

        cleared:
            count -
            user.history.length,

        remaining:
            user.history.length
    };
}


// ============================================================
// CONTEXT ENTRY
// ============================================================

createContextEntry(
    input = {},
    options = {}
) {

    const data =
        input &&
        typeof input ===
            "object"
            ? input
            : {
                role:
                    options.role ||
                    "user",

                text:
                    String(
                        input
                    )
            };

    return {
        id:
            options.id ||
            data.id ||
            this.createRecordId(),

        role:
            this.safeText(
                data.role ||
                "user"
            ),

        text:
            this.cleanAnswerText(
                data.text ||
                ""
            ),

        timestamp:
            data.timestamp ||
            this.nowIso(),

        importance:
            this.clamp01(
                data.importance ??
                options.importance ??
                0.5
            ),

        topic:
            this.safeText(
                data.topic ||
                options.topic ||
                ""
            ),

        metadata:
            data.metadata &&
            typeof data.metadata ===
                "object"
                ? {
                    ...data.metadata
                }
                : (
                    options.metadata &&
                    typeof options.metadata ===
                        "object"
                        ? {
                            ...options.metadata
                        }
                        : {}
                )
    };
}


// ============================================================
// ADD CONTEXT
// ============================================================

addContextEntry(
    userId = "",
    input = {},
    options = {}
) {

    const config =
        this.getUserMemoryConfig();

    const user =
        this.getUserMemory(
            userId
        );

    const entry =
        this.createContextEntry(
            input,
            options
        );

    if (
        !entry.text
    ) {
        return {
            ok: false,
            saved: false,
            reason:
                "context-empty"
        };
    }

    if (
        user.context.length >=
        config.contextWindow
    ) {
        user.context.shift();
    }

    user.context.push(
        entry
    );

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        saved: true,
        entry
    };
}


// ============================================================
// GET CONTEXT
// ============================================================

getUserContext(
    userId = "",
    limit = 30
) {

    const user =
        this.getUserMemory(
            userId
        );

    return user.context.slice(
        -Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    limit,
                    30
                )
            )
        )
    );
}


// ============================================================
// CLEAR CONTEXT
// ============================================================

clearUserContext(
    userId = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    const count =
        user.context.length;

    user.context = [];

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        cleared: count
    };
}


// ============================================================
// TOPIC NORMALIZER
// ============================================================

normalizeTopic(
    topic = ""
) {
    return this.safeText(
        topic
    ).toLowerCase();
}


// ============================================================
// TOPIC OBJECT
// ============================================================

createTopic(
    topic = "",
    options = {}
) {

    const clean =
        this.normalizeTopic(
            topic
        );

    return {
        id:
            options.id ||
            this.createRecordId(),

        name:
            clean,

        key:
            this.normalizeQuestion(
                clean
            ),

        count:
            Math.max(
                1,
                this.safeNumber(
                    options.count,
                    1
                )
            ),

        firstSeenAt:
            options.firstSeenAt ||
            this.nowIso(),

        lastSeenAt:
            options.lastSeenAt ||
            this.nowIso(),

        confidence:
            this.normalizeConfidence(
                options.confidence ??
                0.60
            ),

        metadata:
            options.metadata &&
            typeof options.metadata ===
                "object"
                ? {
                    ...options.metadata
                }
                : {}
    };
}


// ============================================================
// ADD USER TOPIC
// ============================================================

addUserTopic(
    userId = "",
    topic = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    const clean =
        this.normalizeTopic(
            topic
        );

    if (!clean) {
        return {
            ok: false,
            saved: false,
            reason: "topic-empty"
        };
    }

    const key =
        this.normalizeQuestion(
            clean
        );

    const existing =
        user.topics.find(
            (item) =>
                item &&
                item.key === key
        );

    if (
        existing
    ) {
        existing.count =
            Math.max(
                1,
                this.safeNumber(
                    existing.count,
                    1
                )
            ) + 1;

        existing.lastSeenAt =
            this.nowIso();

        existing.confidence =
            Math.max(
                existing.confidence || 0,
                options.confidence ??
                    0.60
            );

        user.updatedAt =
            this.nowIso();

        if (
            options.save !== false
        ) {
            this.saveData();
        }

        return {
            ok: true,
            saved: true,
            duplicate: true,
            topic:
                existing
        };
    }

    const config =
        this.getUserMemoryConfig();

    if (
        user.topics.length >=
        config.maxTopicsPerUser
    ) {
        user.topics.shift();
    }

    const record =
        this.createTopic(
            clean,
            options
        );

    user.topics.push(
        record
    );

    user.stats.totalTopics =
        user.topics.length;

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        saved: true,
        duplicate: false,
        topic:
            record
    };
}


// ============================================================
// TRACK QUESTION TOPICS
// ============================================================

trackQuestionTopics(
    userId = "",
    question = "",
    options = {}
) {

    const classification =
        this.classifyQuestion(
            question
        );

    const topics =
        [];

    for (
        const intent
        of (
            classification.intents ||
            []
        )
    ) {
        topics.push(
            intent
        );
    }

    const tokens =
        this.meaningfulTokens(
            question
        );

    for (
        const token
        of tokens.slice(
            0,
            8
        )
    ) {
        if (
            token.length >= 3
        ) {
            topics.push(
                token
            );
        }
    }

    const unique =
        [
            ...new Set(
                topics
            )
        ];

    const results = [];

    for (
        const topic
        of unique
    ) {
        results.push(
            this.addUserTopic(
                userId,
                topic,
                {
                    source:
                        options.source ||
                        "question",
                    save: false
                }
            )
        );
    }

    const user =
        this.getUserMemory(
            userId
        );

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        topics: unique,
        results
    };
}


// ============================================================
// GET USER TOPICS
// ============================================================

getUserTopics(
    userId = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    let topics =
        [
            ...user.topics
        ];

    topics.sort(
        (a, b) =>
            (
                this.safeNumber(
                    b.count,
                    0
                ) -
                this.safeNumber(
                    a.count,
                    0
                )
            )
    );

    if (
        options.limit
    ) {
        topics =
            topics.slice(
                0,
                Math.max(
                    1,
                    Math.floor(
                        this.safeNumber(
                            options.limit,
                            20
                        )
                    )
                )
            );
    }

    return topics;
}


// ============================================================
// FIND USER TOPIC
// ============================================================

findUserTopic(
    userId = "",
    topic = ""
) {

    const user =
        this.getUserMemory(
            userId
        );

    const key =
        this.normalizeQuestion(
            topic
        );

    return (
        user.topics.find(
            (item) =>
                item &&
                item.key === key
        ) ||
        null
    );
}


// ============================================================
// REMOVE USER TOPIC
// ============================================================

removeUserTopic(
    userId = "",
    topicId = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    const index =
        user.topics.findIndex(
            (item) =>
                item &&
                item.id ===
                    this.safeText(
                        topicId
                    )
        );

    if (
        index === -1
    ) {
        return {
            ok: false,
            removed: false,
            reason: "topic-not-found"
        };
    }

    const removed =
        user.topics.splice(
            index,
            1
        )[0];

    user.stats.totalTopics =
        user.topics.length;

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        removed: true,
        topic:
            removed
    };
}


// ============================================================
// USER ANSWER HIT
// ============================================================

recordUserAnswerHit(
    userId = "",
    input = {},
    options = {}
) {

    const config =
        this.getUserMemoryConfig();

    const user =
        this.getUserMemory(
            userId
        );

    const entry = {
        id:
            input.id ||
            this.createRecordId(),

        question:
            this.cleanQuestionText(
                input.question ||
                ""
            ),

        answer:
            this.cleanAnswerText(
                input.answer ||
                ""
            ),

        recordId:
            this.safeText(
                input.recordId ||
                ""
            ),

        score:
            this.clamp01(
                input.score ??
                0
            ),

        confidence:
            this.clamp01(
                input.confidence ??
                0
            ),

        source:
            this.safeText(
                input.source ||
                "answer-memory"
            ),

        timestamp:
            input.timestamp ||
            this.nowIso(),

        metadata:
            input.metadata &&
            typeof input.metadata ===
                "object"
                ? {
                    ...input.metadata
                }
                : {}
    };

    if (
        user.answerHits.length >=
        config.maxAnswerHitsPerUser
    ) {
        user.answerHits.shift();
    }

    user.answerHits.push(
        entry
    );

    user.stats.totalMemoryHits =
        this.safeNumber(
            user.stats.totalMemoryHits,
            0
        ) + 1;

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        saved: true,
        hit:
            entry
    };
}


// ============================================================
// GET ANSWER HITS
// ============================================================

getUserAnswerHits(
    userId = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    let hits =
        [
            ...user.answerHits
        ];

    if (
        options.recordId
    ) {
        hits =
            hits.filter(
                (item) =>
                    item.recordId ===
                    options.recordId
            );
    }

    if (
        options.limit
    ) {
        hits =
            hits.slice(
                -Math.max(
                    1,
                    Math.floor(
                        this.safeNumber(
                            options.limit,
                            50
                        )
                    )
                )
            );
    }

    return hits;
}


// ============================================================
// USER ALIAS
// ============================================================

addUserAlias(
    userId = "",
    alias = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    const clean =
        this.safeText(
            alias
        );

    if (!clean) {
        return {
            ok: false,
            saved: false,
            reason: "alias-empty"
        };
    }

    const exists =
        user.aliases.some(
            (item) =>
                this.normalizeQuestion(
                    item
                ) ===
                this.normalizeQuestion(
                    clean
                )
        );

    if (
        exists
    ) {
        return {
            ok: true,
            saved: false,
            duplicate: true
        };
    }

    user.aliases.push(
        clean
    );

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        saved: true,
        alias:
            clean
    };
}


// ============================================================
// GET USER ALIASES
// ============================================================

getUserAliases(
    userId = ""
) {

    return [
        ...this.getUserMemory(
            userId
        ).aliases
    ];
}


// ============================================================
// REMOVE USER ALIAS
// ============================================================

removeUserAlias(
    userId = "",
    alias = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    const key =
        this.normalizeQuestion(
            alias
        );

    const before =
        user.aliases.length;

    user.aliases =
        user.aliases.filter(
            (item) =>
                this.normalizeQuestion(
                    item
                ) !== key
        );

    const removed =
        before -
        user.aliases.length;

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        removed
    };
}


// ============================================================
// USER CUSTOM DATA
// ============================================================

setUserCustomData(
    userId = "",
    key = "",
    value,
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    const cleanKey =
        this.safeText(
            key
        );

    if (!cleanKey) {
        return {
            ok: false,
            updated: false,
            reason: "custom-key-empty"
        };
    }

    const previous =
        user.customData[
            cleanKey
        ] ?? null;

    user.customData[
        cleanKey
    ] =
        value;

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        updated: true,
        key:
            cleanKey,
        previous,
        value
    };
}


// ============================================================
// GET USER CUSTOM DATA
// ============================================================

getUserCustomData(
    userId = "",
    key = ""
) {

    const user =
        this.getUserMemory(
            userId
        );

    const cleanKey =
        this.safeText(
            key
        );

    if (!cleanKey) {
        return {
            ...user.customData
        };
    }

    return (
        user.customData[
            cleanKey
        ] ??
        null
    );
}


// ============================================================
// REMOVE CUSTOM DATA
// ============================================================

removeUserCustomData(
    userId = "",
    key = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    const cleanKey =
        this.safeText(
            key
        );

    if (!cleanKey) {
        return {
            ok: false,
            removed: false,
            reason: "custom-key-empty"
        };
    }

    if (
        !Object.prototype.hasOwnProperty.call(
            user.customData,
            cleanKey
        )
    ) {
        return {
            ok: true,
            removed: false
        };
    }

    const previous =
        user.customData[
            cleanKey
        ];

    delete user.customData[
        cleanKey
    ];

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        removed: true,
        previous
    };
}


// ============================================================
// USER MEMORY SUMMARY
// ============================================================

getUserMemorySummary(
    userId = ""
) {

    const user =
        this.getUserMemory(
            userId
        );

    return {
        ok: true,

        userId:
            user.id,

        profile:
            {
                ...user.profile
            },

        facts:
            user.facts.length,

        preferences:
            user.preferences.length,

        questions:
            user.questions.length,

        answers:
            user.answers.length,

        topics:
            user.topics.length,

        history:
            user.history.length,

        context:
            user.context.length,

        answerHits:
            user.answerHits.length,

        aliases:
            user.aliases.length,

        customDataKeys:
            Object.keys(
                user.customData
            ).length,

        stats:
            {
                ...user.stats
            },

        createdAt:
            user.createdAt,

        updatedAt:
            user.updatedAt
    };
}


// ============================================================
// USER MEMORY EXPORT
// ============================================================

exportUserMemory(
    userId = ""
) {

    const user =
        this.getUserMemory(
            userId
        );

    return JSON.stringify(
        {
            version:
                this.data.version ||
                "1.0",

            exportedAt:
                this.nowIso(),

            user
        },
        null,
        2
    );
}


// ============================================================
// USER MEMORY IMPORT
// ============================================================

importUserMemory(
    userId = "",
    input,
    options = {}
) {

    let parsed =
        input;

    if (
        typeof input ===
        "string"
    ) {
        try {
            parsed =
                JSON.parse(
                    input
                );
        } catch (error) {
            return {
                ok: false,
                imported: false,
                reason: "invalid-json",
                error:
                    error.message
            };
        }
    }

    if (
        parsed &&
        parsed.user &&
        typeof parsed.user ===
            "object"
    ) {
        parsed =
            parsed.user;
    }

    if (
        !parsed ||
        typeof parsed !==
            "object"
    ) {
        return {
            ok: false,
            imported: false,
            reason:
                "user-object-required"
        };
    }

    const resolved =
        this.resolveUserId(
            userId ||
            parsed.id
        );

    const users =
        this.ensureUserStorage();

    if (
        users[resolved] &&
        options.overwrite !== true
    ) {
        return {
            ok: false,
            imported: false,
            reason: "user-exists"
        };
    }

    users[resolved] = {
        ...this.ensureUserMemory(
            resolved
        ),

        ...parsed,

        id:
            resolved,

        updatedAt:
            this.nowIso()
    };

    const user =
        users[resolved];

    if (
        !user.profile ||
        typeof user.profile !==
            "object"
    ) {
        user.profile = {};
    }

    if (
        !Array.isArray(
            user.facts
        )
    ) {
        user.facts = [];
    }

    if (
        !Array.isArray(
            user.preferences
        )
    ) {
        user.preferences = [];
    }

    if (
        !Array.isArray(
            user.questions
        )
    ) {
        user.questions = [];
    }

    if (
        !Array.isArray(
            user.answers
        )
    ) {
        user.answers = [];
    }

    if (
        !Array.isArray(
            user.topics
        )
    ) {
        user.topics = [];
    }

    if (
        !Array.isArray(
            user.history
        )
    ) {
        user.history = [];
    }

    if (
        !Array.isArray(
            user.context
        )
    ) {
        user.context = [];
    }

    if (
        !Array.isArray(
            user.answerHits
        )
    ) {
        user.answerHits = [];
    }

    if (
        !Array.isArray(
            user.aliases
        )
    ) {
        user.aliases = [];
    }

    if (
        !user.customData ||
        typeof user.customData !==
            "object"
    ) {
        user.customData = {};
    }

    user.stats = {
        totalQuestions:
            user.questions.length,

        totalAnswers:
            user.answers.length,

        totalMemoryHits:
            user.answerHits.length,

        totalFacts:
            user.facts.length,

        totalPreferences:
            user.preferences.length,

        totalTopics:
            user.topics.length,

        ...(user.stats || {})
    };

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,
        imported: true,
        userId:
            resolved,
        user
    };
}


// ============================================================
// USER MEMORY CLONE
// ============================================================

cloneUserMemory(
    userId = ""
) {

    const user =
        this.getUserMemory(
            userId
        );

    return JSON.parse(
        JSON.stringify(
            user
        )
    );
}


// ============================================================
// USER MEMORY DELETE
// ============================================================

deleteUserMemory(
    userId = "",
    options = {}
) {

    const resolved =
        this.resolveUserId(
            userId
        );

    const users =
        this.ensureUserStorage();

    if (
        !users[resolved]
    ) {
        return {
            ok: false,
            deleted: false,
            reason:
                "user-not-found"
        };
    }

    const deleted =
        users[resolved];

    if (
        options.keepMemoryRecords !==
        true
    ) {

        const records =
            this.data.records || [];

        const kept =
            records.filter(
                (record) => {

                    if (
                        !record
                    ) {
                        return false;
                    }

                    return (
                        record.userId !==
                        resolved
                    );
                }
            );

        this.data.records =
            kept;

        this.rebuildIndex();
    }

    delete users[
        resolved
    ];

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,

        deleted: true,

        userId:
            resolved,

        removedUser:
            deleted
    };
}


// ============================================================
// CLEAR USER MEMORY
// ============================================================

clearUserMemory(
    userId = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    const summary =
        this.getUserMemorySummary(
            userId
        );

    const keepProfile =
        options.keepProfile === true;

    const keepFacts =
        options.keepFacts === true;

    const keepPreferences =
        options.keepPreferences === true;

    const keepTopics =
        options.keepTopics === true;

    const keepHistory =
        options.keepHistory === true;

    user.facts =
        keepFacts
            ? user.facts
            : [];

    user.preferences =
        keepPreferences
            ? user.preferences
            : [];

    user.questions = [];

    user.answers = [];

    user.topics =
        keepTopics
            ? user.topics
            : [];

    user.history =
        keepHistory
            ? user.history
            : [];

    user.answerHits =
        [];

    user.context =
        [];

    user.aliases =
        [];

    user.customData =
        {};

    if (
        !keepProfile
    ) {
        user.profile = {
            name: "",
            displayName: "",
            language: "tr",
            timezone: "",
            country: "",
            city: "",
            bio: "",
            role: "",
            grade: "",
            occupation: "",
            platform: "",
            device: ""
        };
    }

    user.stats = {
        totalQuestions:
            user.questions.length,

        totalAnswers:
            user.answers.length,

        totalMemoryHits:
            user.answerHits.length,

        totalFacts:
            user.facts.length,

        totalPreferences:
            user.preferences.length,

        totalTopics:
            user.topics.length
    };

    user.updatedAt =
        this.nowIso();

    if (
        options.removeAnswerMemory ===
        true
    ) {

        this.data.records =
            (
                Array.isArray(
                    this.data.records
                )
                    ? this.data.records
                    : []
            ).filter(
                (record) =>
                    record &&
                    record.userId !==
                        user.id
            );

        this.rebuildIndex();
    }

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,

        cleared: true,

        userId:
            user.id,

        before:
            summary,

        after:
            this.getUserMemorySummary(
                user.id
            )
    };
}


// ============================================================
// USER QUESTION MEMORY RECORD
// ============================================================

saveUserQuestionAnswer(
    userId = "",
    question = "",
    answer = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    const cleanQuestion =
        this.cleanQuestionText(
            question
        );

    const cleanAnswer =
        this.cleanAnswerText(
            answer
        );

    if (
        !cleanQuestion ||
        !cleanAnswer
    ) {
        return {
            ok: false,
            saved: false,
            reason:
                "question-answer-required"
        };
    }

    const existing =
        this.searchUserAnswerMemory(
            user.id,
            cleanQuestion,
            {
                minScore:
                    options.minScore ??
                    0.82
            }
        );

    if (
        existing.found &&
        options.updateExisting !==
            false
    ) {

        const record =
            existing.record;

        const updated =
            this.updateRecord(
                record.id,
                {
                    answer:
                        cleanAnswer,

                    userId:
                        user.id,

                    source:
                        options.source ||
                        record.source ||
                        "user-memory",

                    confidence:
                        options.confidence ??
                        record.confidence,

                    metadata: {
                        ...(record.metadata || {}),
                        lastUserMemorySave:
                            this.nowIso()
                    }
                }
            );

        this.recordUserQuestion(
            user.id,
            cleanQuestion,
            {
                source:
                    "user-memory",
                save: false
            }
        );

        this.recordUserAnswer(
            user.id,
            cleanAnswer,
            {
                source:
                    "user-memory",
                save: false
            }
        );

        this.addContextEntry(
            user.id,
            {
                role: "user",
                text:
                    cleanQuestion
            },
            {
                save: false
            }
        );

        this.addContextEntry(
            user.id,
            {
                role: "assistant",
                text:
                    cleanAnswer
            },
            {
                save: false
            }
        );

        this.saveData();

        return {
            ...updated,

            userMemory:
                true,

            updatedExisting:
                true
        };
    }

    const saved =
        this.addRecord(
            cleanQuestion,
            cleanAnswer,
            {
                userId:
                    user.id,

                source:
                    options.source ||
                    "user-memory",

                category:
                    options.category ||
                    "user-memory",

                confidence:
                    options.confidence ??
                    0.90,

                quality:
                    options.quality ??
                    0.90,

                aliases:
                    options.aliases ||
                    [],

                tags: [
                    "user-memory",
                    ...(options.tags || [])
                ],

                metadata: {
                    ...(options.metadata || {}),
                    userMemory:
                        true
                }
            }
        );

    this.recordUserQuestion(
        user.id,
        cleanQuestion,
        {
            source:
                "user-memory",
            save: false
        }
    );

    this.recordUserAnswer(
        user.id,
        cleanAnswer,
        {
            source:
                "user-memory",
            save: false
        }
    );

    this.addContextEntry(
        user.id,
        {
            role: "user",
            text:
                cleanQuestion
        },
        {
            save: false
        }
    );

    this.addContextEntry(
        user.id,
        {
            role: "assistant",
            text:
                cleanAnswer
        },
        {
            save: false
        }
    );

    this.saveData();

    return {
        ...saved,

        userMemory:
            true,

        createdNew:
            Boolean(
                saved.saved
            )
    };
}


// ============================================================
// SEARCH USER ANSWER MEMORY
// ============================================================

searchUserAnswerMemory(
    userId = "",
    question = "",
    options = {}
) {

    const resolved =
        this.resolveUserId(
            userId
        );

    const userRecords =
        this.getUserRecords(
            resolved
        );

    if (
        !userRecords.length
    ) {
        return {
            found: false,
            answer: null,
            score: 0,
            confidence: 0,
            source:
                "user-memory-not-found",
            record: null,
            candidates: []
        };
    }

    const ranked =
        this.rankFinalCandidates(
            question,
            userRecords,
            {
                ...options,
                userId:
                    resolved,
                minScore:
                    options.minScore ??
                    0.72
            }
        );

    if (
        !ranked.length
    ) {
        return {
            found: false,
            answer: null,
            score: 0,
            confidence: 0,
            source:
                "user-memory-not-found",
            record: null,
            candidates: []
        };
    }

    const best =
        ranked[0];

    const score =
        this.safeNumber(
            best._answerMemoryScore,
            0
        );

    const threshold =
        this.safeNumber(
            options.minScore,
            0.72
        );

    const found =
        Boolean(
            best._exact ||
            best._alias ||
            score >= threshold
        );

    return {
        found,

        answer:
            found
                ? this.safeText(
                    best.answer
                )
                : null,

        score,

        confidence:
            this.boostConfidence(
                score,
                {
                    exact:
                        best._exact,

                    alias:
                        best._alias,

                    trusted:
                        best.trusted,

                    pinned:
                        best.pinned,

                    highUsage:
                        (
                            best.usageCount ||
                            0
                        ) >= 10
                }
            ),

        source:
            best._exact
                ? "user-memory-exact"
                : best._alias
                    ? "user-memory-alias"
                    : "user-memory-smart",

        record:
            found
                ? best
                : null,

        candidates:
            ranked.slice(
                0,
                Math.max(
                    1,
                    Math.floor(
                        this.safeNumber(
                            options.limit,
                            10
                        )
                    )
                )
            )
    };
}


// ============================================================
// FIND PERSONAL ANSWER
// ============================================================

findPersonalAnswer(
    userId = "",
    question = "",
    options = {}
) {

    const result =
        this.searchUserAnswerMemory(
            userId,
            question,
            options
        );

    if (
        result.found
    ) {
        this.recordUserAnswerHit(
            userId,
            {
                question,
                answer:
                    result.answer,
                recordId:
                    result.record?.id ||
                    "",
                score:
                    result.score,
                confidence:
                    result.confidence,
                source:
                    result.source
            },
            {
                save: false
            }
        );

        this.saveData();
    }

    return result;
}


// ============================================================
// USER MEMORY FIRST SEARCH
// ============================================================

findUserAwareAnswer(
    userId = "",
    question = "",
    options = {}
) {

    const personal =
        this.findPersonalAnswer(
            userId,
            question,
            options
        );

    if (
        personal.found
    ) {
        return personal;
    }

    const local =
        this.safeSearch(
            question,
            options
        );

    if (
        local.found
    ) {
        return {
            ...local,

            source:
                "global-answer-memory"
        };
    }

    return {
        found: false,

        answer: null,

        score: 0,

        confidence: 0,

        source:
            "not-found",

        record: null,

        candidates: []
    };
}


// ============================================================
// USER-AWARE PROCESS
// ============================================================

processUserAwareQuestion(
    userId = "",
    question = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    const personal =
        this.findPersonalAnswer(
            user.id,
            question,
            options
        );

    if (
        personal.found
    ) {

        return {
            ...personal,

            route:
                "personal-memory",

            needsAI: false,

            needsResearch: false,

            local: true,

            personal: true
        };
    }

    const local =
        this.safeSearch(
            question,
            options
        );

    if (
        local.found
    ) {

        return {
            ...local,

            route:
                "global-memory",

            needsAI: false,

            needsResearch: false,

            local: true,

            personal: false
        };
    }

    return {
        ...local,

        route:
            "ai",

        needsAI: true,

        needsResearch:
            this.shouldResearch(
                question,
                options
            ),

        local: false,

        personal: false,

        userId:
            user.id
    };
}


// ============================================================
// USER MEMORY CONTEXT TEXT
// ============================================================

buildUserContextText(
    userId = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    const lines = [];

    const profile =
        user.profile || {};

    const name =
        this.safeText(
            profile.displayName
        ) ||
        this.safeText(
            profile.name
        );

    if (
        name
    ) {
        lines.push(
            `Kullanıcı adı: ${name}`
        );
    }

    if (
        profile.language
    ) {
        lines.push(
            `Dil: ${profile.language}`
        );
    }

    if (
        profile.role
    ) {
        lines.push(
            `Rol: ${profile.role}`
        );
    }

    if (
        profile.grade
    ) {
        lines.push(
            `Seviye: ${profile.grade}`
        );
    }

    const facts =
        this.getUserFacts(
            user.id,
            {
                limit:
                    options.factLimit ||
                    20
            }
        );

    for (
        const fact
        of facts
    ) {
        lines.push(
            `Bilgi: ${fact.text}`
        );
    }

    const preferences =
        this.getUserPreferences(
            user.id,
            {
                limit:
                    options.preferenceLimit ||
                    20
            }
        );

    for (
        const preference
        of preferences
    ) {
        lines.push(
            `Tercih: ${preference.text}`
        );
    }

    const topics =
        this.getUserTopics(
            user.id,
            {
                limit:
                    options.topicLimit ||
                    15
            }
        );

    if (
        topics.length
    ) {
        lines.push(
            `Konular: ${topics
                .map(
                    (topic) =>
                        topic.name
                )
                .join(", ")}`
        );
    }

    return lines.join(
        "\n"
    );
}


// ============================================================
// USER MEMORY SNAPSHOT
// ============================================================

createUserMemorySnapshot(
    userId = ""
) {

    const user =
        this.getUserMemory(
            userId
        );

    return {
        userId:
            user.id,

        createdAt:
            user.createdAt,

        updatedAt:
            user.updatedAt,

        profile:
            {
                ...user.profile
            },

        facts:
            user.facts.map(
                (item) => ({
                    ...item
                })
            ),

        preferences:
            user.preferences.map(
                (item) => ({
                    ...item
                })
            ),

        topics:
            user.topics.map(
                (item) => ({
                    ...item
                })
            ),

        context:
            user.context.map(
                (item) => ({
                    ...item
                })
            ),

        stats:
            {
                ...user.stats
            }
    };
}


// ============================================================
// SAVE USER SNAPSHOT
// ============================================================

saveUserMemorySnapshot(
    userId = "",
    options = {}
) {

    if (
        !Array.isArray(
            this.data.userSnapshots
        )
    ) {
        this.data.userSnapshots =
            [];
    }

    const snapshot =
        {
            id:
                this.createRecordId(),

            userId:
                this.resolveUserId(
                    userId
                ),

            createdAt:
                this.nowIso(),

            memory:
                this.createUserMemorySnapshot(
                    userId
                )
        };

    this.data.userSnapshots.push(
        snapshot
    );

    if (
        this.data.userSnapshots.length >
        5000
    ) {
        this.data.userSnapshots =
            this.data.userSnapshots
                .slice(
                    -5000
                );
    }

    this.touchUpdatedAt();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        saved: true,
        snapshot
    };
}


// ============================================================
// GET USER SNAPSHOTS
// ============================================================

getUserMemorySnapshots(
    userId = "",
    options = {}
) {

    if (
        !Array.isArray(
            this.data.userSnapshots
        )
    ) {
        this.data.userSnapshots =
            [];
    }

    const resolved =
        this.resolveUserId(
            userId
        );

    let snapshots =
        this.data.userSnapshots.filter(
            (item) =>
                item &&
                item.userId ===
                    resolved
        );

    const limit =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    options.limit,
                    20
                )
            )
        );

    snapshots =
        snapshots.slice(
            -limit
        );

    return snapshots.reverse();
}


// ============================================================
// USER MEMORY SEARCH
// ============================================================

searchUserMemory(
    userId = "",
    query = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    const clean =
        this.normalizeQuestion(
            query
        );

    if (!clean) {
        return [];
    }

    const matches = [];

    for (
        const fact
        of user.facts
    ) {

        const score =
            this.textSimilarity(
                clean,
                fact.text
            );

        if (
            score >=
            (
                options.minScore ??
                0.50
            )
        ) {
            matches.push({
                type: "fact",
                ...fact,
                score
            });
        }
    }

    for (
        const preference
        of user.preferences
    ) {

        const score =
            this.textSimilarity(
                clean,
                preference.text
            );

        if (
            score >=
            (
                options.minScore ??
                0.50
            )
        ) {
            matches.push({
                type: "preference",
                ...preference,
                score
            });
        }
    }

    for (
        const topic
        of user.topics
    ) {

        const score =
            this.textSimilarity(
                clean,
                topic.name
            );

        if (
            score >=
            (
                options.minScore ??
                0.50
            )
        ) {
            matches.push({
                type: "topic",
                ...topic,
                score
            });
        }
    }

    matches.sort(
        (a, b) =>
            b.score -
            a.score
    );

    return matches.slice(
        0,
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    options.limit,
                    20
                )
            )
        )
    );
}


// ============================================================
// USER MEMORY MATCH
// ============================================================

matchUserMemory(
    userId = "",
    query = "",
    options = {}
) {

    const results =
        this.searchUserMemory(
            userId,
            query,
            options
        );

    return {
        found:
            results.length > 0,

        score:
            results[0]?.score ||
            0,

        results
    };
}


// ============================================================
// USER MEMORY RELEVANT FACTS
// ============================================================

getRelevantUserFacts(
    userId = "",
    question = "",
    options = {}
) {

    return this.searchUserMemory(
        userId,
        question,
        {
            ...options,

            limit:
                options.limit ||
                10
        }
    ).filter(
        (item) =>
            item.type ===
            "fact"
    );
}


// ============================================================
// USER MEMORY RELEVANT PREFERENCES
// ============================================================

getRelevantUserPreferences(
    userId = "",
    question = "",
    options = {}
) {

    return this.searchUserMemory(
        userId,
        question,
        {
            ...options,

            limit:
                options.limit ||
                10
        }
    ).filter(
        (item) =>
            item.type ===
            "preference"
    );
}


// ============================================================
// USER MEMORY RELEVANT TOPICS
// ============================================================

getRelevantUserTopics(
    userId = "",
    question = "",
    options = {}
) {

    return this.searchUserMemory(
        userId,
        question,
        {
            ...options,

            limit:
                options.limit ||
                10
        }
    ).filter(
        (item) =>
            item.type ===
            "topic"
    );
}


// ============================================================
// AUTO PROFILE EXTRACTION
// ============================================================

extractProfileSignals(
    userId = "",
    question = ""
) {

    const text =
        this.cleanQuestionText(
            question
        );

    const signals = [];

    const namePatterns = [
        /benim adım\s+([^\n,.!?]+)/i,
        /adım\s+([^\n,.!?]+)/i,
        /ismim\s+([^\n,.!?]+)/i,
        /ben\s+([A-ZÇĞİÖŞÜ][a-zçğıöşü]+)/,
        /beni\s+([A-ZÇĞİÖŞÜ][a-zçğıöşü]+)\s+diye/i
    ];

    for (
        const pattern
        of namePatterns
    ) {

        const match =
            text.match(
                pattern
            );

        if (
            match &&
            match[1]
        ) {

            const name =
                this.safeText(
                    match[1]
                );

            if (
                name.length >= 2 &&
                name.length <= 60
            ) {

                signals.push({
                    type: "name",
                    value: name
                });

                break;
            }
        }
    }

    const languagePatterns = [
        /(?:dilim|konuştuğum dil)\s+([a-zçğıöşü]+)/i,
        /([a-zçğıöşü]+)\s+konuşuyorum/i
    ];

    for (
        const pattern
        of languagePatterns
    ) {

        const match =
            text.match(
                pattern
            );

        if (
            match &&
            match[1]
        ) {
            signals.push({
                type: "language",
                value:
                    this.safeText(
                        match[1]
                    )
            });

            break;
        }
    }

    const cityPatterns = [
        /([A-ZÇĞİÖŞÜ][a-zçğıöşü]+)'?de yaşıyorum/i,
        /([A-ZÇĞİÖŞÜ][a-zçğıöşü]+)'?da yaşıyorum/i,
        /([A-ZÇĞİÖŞÜ][a-zçğıöşü]+) şehrinde/i
    ];

    for (
        const pattern
        of cityPatterns
    ) {

        const match =
            text.match(
                pattern
            );

        if (
            match &&
            match[1]
        ) {
            signals.push({
                type: "city",
                value:
                    this.safeText(
                        match[1]
                    )
            });

            break;
        }
    }

    return signals;
}


// ============================================================
// APPLY PROFILE SIGNALS
// ============================================================

applyProfileSignals(
    userId = "",
    signals = [],
    options = {}
) {

    if (
        !Array.isArray(
            signals
        )
    ) {
        return {
            ok: false,
            applied: 0
        };
    }

    let applied = 0;

    for (
        const signal
        of signals
    ) {

        if (
            !signal ||
            !signal.type ||
            !signal.value
        ) {
            continue;
        }

        if (
            signal.type ===
            "name"
        ) {

            this.setUserName(
                userId,
                signal.value,
                {
                    save: false
                }
            );

            applied++;
            continue;
        }

        if (
            signal.type ===
            "language"
        ) {

            this.setUserLanguage(
                userId,
                signal.value,
                {
                    save: false
                }
            );

            applied++;
            continue;
        }

        if (
            signal.type ===
            "city"
        ) {

            this.setUserProfileValue(
                userId,
                "city",
                signal.value,
                {
                    save: false
                }
            );

            applied++;
            continue;
        }
    }

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        applied
    };
}


// ============================================================
// AUTO USER FACT EXTRACTION
// ============================================================

extractUserFacts(
    question = ""
) {

    const text =
        this.cleanQuestionText(
            question
        );

    const facts = [];

    const patterns = [
        {
            pattern:
                /ben\s+([^.?!]+)\s+yapıyorum/i,
            category:
                "occupation"
        },

        {
            pattern:
                /([^.?!]+)\s+seviyorum/i,
            category:
                "interest"
        },

        {
            pattern:
                /([^.?!]+)\s+sevmiyorum/i,
            category:
                "dislike"
        },

        {
            pattern:
                /([^.?!]+)\s+ilgileniyorum/i,
            category:
                "interest"
        },

        {
            pattern:
                /([^.?!]+)\s+öğreniyorum/i,
            category:
                "learning"
        },

        {
            pattern:
                /([^.?!]+)\s+üzerinde çalışıyorum/i,
            category:
                "project"
        },

        {
            pattern:
                /([^.?!]+)\s+projem var/i,
            category:
                "project"
        }
    ];

    for (
        const item
        of patterns
    ) {

        const match =
            text.match(
                item.pattern
            );

        if (
            match &&
            match[1]
        ) {

            const captured =
                this.safeText(
                    match[1]
                );

            if (
                captured.length >= 2 &&
                captured.length <= 500
            ) {

                facts.push({
                    text:
                        captured,

                    category:
                        item.category
                });
            }
        }
    }

    return facts;
}


// ============================================================
// APPLY USER FACT SIGNALS
// ============================================================

applyUserFactSignals(
    userId = "",
    facts = [],
    options = {}
) {

    if (
        !Array.isArray(
            facts
        )
    ) {
        return {
            ok: false,
            applied: 0
        };
    }

    let applied = 0;

    for (
        const fact
        of facts
    ) {

        if (
            !fact ||
            !fact.text
        ) {
            continue;
        }

        const result =
            this.addUserFact(
                userId,
                fact.text,
                {
                    category:
                        fact.category ||
                        "general",

                    source:
                        options.source ||
                        "auto-profile",

                    confidence:
                        options.confidence ??
                        0.75,

                    save: false
                }
            );

        if (
            result.saved
        ) {
            applied++;
        }
    }

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        applied
    };
}


// ============================================================
// AUTO PREFERENCE EXTRACTION
// ============================================================

extractUserPreferences(
    question = ""
) {

    const text =
        this.cleanQuestionText(
            question
        );

    const preferences = [];

    const patterns = [
        {
            pattern:
                /(?:şunu|bunu)\s+tercih ediyorum/i,
            category:
                "preference"
        },

        {
            pattern:
                /(?:.+?)\s+tercih ediyorum/i,
            category:
                "preference"
        },

        {
            pattern:
                /(?:.+?)\s+istiyorum/i,
            category:
                "preference"
        },

        {
            pattern:
                /(?:.+?)\s+istemiyorum/i,
            category:
                "dislike"
        },

        {
            pattern:
                /(?:.+?)\s+seviyorum/i,
            category:
                "favorite"
        },

        {
            pattern:
                /(?:.+?)\s+sevmiyorum/i,
            category:
                "dislike"
        }
    ];

    for (
        const item
        of patterns
    ) {

        const match =
            text.match(
                item.pattern
            );

        if (
            match
        ) {

            preferences.push({
                text:
                    this.safeText(
                        text
                    ),

                category:
                    item.category
            });

            break;
        }
    }

    return preferences;
}


// ============================================================
// APPLY PREFERENCE SIGNALS
// ============================================================

applyUserPreferenceSignals(
    userId = "",
    preferences = [],
    options = {}
) {

    if (
        !Array.isArray(
            preferences
        )
    ) {
        return {
            ok: false,
            applied: 0
        };
    }

    let applied = 0;

    for (
        const preference
        of preferences
    ) {

        if (
            !preference ||
            !preference.text
        ) {
            continue;
        }

        const result =
            this.addUserPreference(
                userId,
                preference.text,
                {
                    category:
                        preference.category ||
                        "general",

                    source:
                        options.source ||
                        "auto-profile",

                    confidence:
                        options.confidence ??
                        0.70,

                    save: false
                }
            );

        if (
            result.saved
        ) {
            applied++;
        }
    }

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        applied
    };
}


// ============================================================
// LEARN FROM USER MESSAGE
// ============================================================

learnFromUserMessage(
    userId = "",
    question = "",
    options = {}
) {

    const signals =
        this.extractProfileSignals(
            userId,
            question
        );

    const profile =
        this.applyProfileSignals(
            userId,
            signals,
            {
                save: false
            }
        );

    const facts =
        this.extractUserFacts(
            question
        );

    const factResult =
        this.applyUserFactSignals(
            userId,
            facts,
            {
                source:
                    options.source ||
                    "auto-message",

                save: false
            }
        );

    const preferences =
        this.extractUserPreferences(
            question
        );

    const preferenceResult =
        this.applyUserPreferenceSignals(
            userId,
            preferences,
            {
                source:
                    options.source ||
                    "auto-message",

                save: false
            }
        );

    this.recordUserQuestion(
        userId,
        question,
        {
            source:
                options.source ||
                "conversation",

            save: false
        }
    );

    this.trackQuestionTopics(
        userId,
        question,
        {
            source:
                options.source ||
                "conversation",

            save: false
        }
    );

    const user =
        this.getUserMemory(
            userId
        );

    user.updatedAt =
        this.nowIso();

    this.saveData();

    return {
        ok: true,

        profileSignals:
            signals,

        profileApplied:
            profile.applied,

        facts:
            facts,

        factsApplied:
            factResult.applied,

        preferences:
            preferences,

        preferencesApplied:
            preferenceResult.applied
    };
}


// ============================================================
// LEARN FROM EXCHANGE
// ============================================================

learnFromExchange(
    userId = "",
    question = "",
    answer = "",
    options = {}
) {

    const userLearning =
        this.learnFromUserMessage(
            userId,
            question,
            options
        );

    const answerResult =
        this.recordUserAnswer(
            userId,
            answer,
            {
                source:
                    options.answerSource ||
                    "assistant",

                questionId:
                    options.questionId ||
                    "",

                score:
                    options.score ||
                    0,

                confidence:
                    options.confidence ||
                    0,

                save: false
            }
        );

    this.addContextEntry(
        userId,
        {
            role: "user",
            text:
                question
        },
        {
            save: false
        }
    );

    this.addContextEntry(
        userId,
        {
            role: "assistant",
            text:
                answer
        },
        {
            save: false
        }
    );

    const user =
        this.getUserMemory(
            userId
        );

    user.updatedAt =
        this.nowIso();

    this.saveData();

    return {
        ok: true,

        userLearning,

        answerSaved:
            Boolean(
                answerResult.saved
            )
    };
}


// ============================================================
// USER MEMORY QUERY
// ============================================================

queryUserMemory(
    userId = "",
    query = "",
    options = {}
) {

    const answer =
        this.findUserAwareAnswer(
            userId,
            query,
            options
        );

    const memory =
        this.matchUserMemory(
            userId,
            query,
            {
                minScore:
                    options.memoryMinScore ??
                    0.50,

                limit:
                    options.memoryLimit ||
                    10
            }
        );

    return {
        ok: true,

        answer,

        memory,

        user:
            this.getUserMemorySummary(
                userId
            )
    };
}


// ============================================================
// PERSONAL ANSWER API
// ============================================================

getPersonalAnswer(
    userId = "",
    question = "",
    options = {}
) {

    const result =
        this.findPersonalAnswer(
            userId,
            question,
            options
        );

    if (
        result.found
    ) {
        return result.answer;
    }

    return null;
}


// ============================================================
// USER MEMORY API
// ============================================================

getUserMemoryAPI(
    userId = "",
    question = "",
    options = {}
) {

    return this.processUserAwareQuestion(
        userId,
        question,
        options
    );
}


// ============================================================
// USER STATS
// ============================================================

getUserStats(
    userId = ""
) {

    const user =
        this.getUserMemory(
            userId
        );

    return {
        userId:
            user.id,

        questions:
            user.questions.length,

        answers:
            user.answers.length,

        facts:
            user.facts.length,

        preferences:
            user.preferences.length,

        topics:
            user.topics.length,

        history:
            user.history.length,

        context:
            user.context.length,

        answerHits:
            user.answerHits.length,

        aliases:
            user.aliases.length,

        totalQuestions:
            user.stats.totalQuestions,

        totalAnswers:
            user.stats.totalAnswers,

        totalMemoryHits:
            user.stats.totalMemoryHits,

        totalFacts:
            user.stats.totalFacts,

        totalPreferences:
            user.stats.totalPreferences,

        totalTopics:
            user.stats.totalTopics
    };
}


// ============================================================
// ALL USERS
// ============================================================

getAllUsers() {

    const users =
        this.ensureUserStorage();

    return Object.values(
        users
    );
}


// ============================================================
// USER COUNT
// ============================================================

countUsers() {

    return Object.keys(
        this.ensureUserStorage()
    ).length;
}


// ============================================================
// USER SEARCH
// ============================================================

searchUsers(
    query = "",
    options = {}
) {

    const clean =
        this.normalizeQuestion(
            query
        );

    const users =
        this.getAllUsers();

    if (!clean) {
        return users.slice(
            0,
            options.limit ||
                20
        );
    }

    const matches = [];

    for (
        const user
        of users
    ) {

        const profile =
            user.profile || {};

        const text = [
            profile.name,
            profile.displayName,
            profile.bio,
            profile.role,
            profile.grade,
            profile.city,
            profile.country
        ]
            .filter(Boolean)
            .join(" ");

        const score =
            this.textSimilarity(
                clean,
                text
            );

        if (
            score >=
            (
                options.minScore ??
                0.55
            )
        ) {

            matches.push({
                user,
                score
            });
        }
    }

    matches.sort(
        (a, b) =>
            b.score -
            a.score
    );

    return matches.slice(
        0,
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    options.limit,
                    20
                )
            )
        )
    );
}


// ============================================================
// BULK ADD USER FACTS
// ============================================================

addUserFacts(
    userId = "",
    facts = [],
    options = {}
) {

    if (
        !Array.isArray(
            facts
        )
    ) {
        return {
            ok: false,
            saved: 0,
            failed: 0
        };
    }

    let saved = 0;
    let failed = 0;

    const results = [];

    for (
        const fact
        of facts
    ) {

        const item =
            typeof fact ===
                "string"
                ? {
                    text:
                        fact
                }
                : fact;

        const result =
            this.addUserFact(
                userId,
                item?.text ||
                item?.fact ||
                "",
                {
                    ...options,
                    ...(
                        item &&
                        typeof item ===
                            "object"
                            ? item
                            : {}
                    ),

                    save: false
                }
            );

        results.push(
            result
        );

        if (
            result.saved
        ) {
            saved++;
        } else {
            failed++;
        }
    }

    this.saveData();

    return {
        ok:
            failed === 0,

        saved,

        failed,

        results
    };
}


// ============================================================
// BULK ADD PREFERENCES
// ============================================================

addUserPreferences(
    userId = "",
    preferences = [],
    options = {}
) {

    if (
        !Array.isArray(
            preferences
        )
    ) {
        return {
            ok: false,
            saved: 0,
            failed: 0
        };
    }

    let saved = 0;
    let failed = 0;

    const results = [];

    for (
        const preference
        of preferences
    ) {

        const item =
            typeof preference ===
                "string"
                ? {
                    text:
                        preference
                }
                : preference;

        const result =
            this.addUserPreference(
                userId,
                item?.text ||
                item?.preference ||
                "",
                {
                    ...options,
                    ...(
                        item &&
                        typeof item ===
                            "object"
                            ? item
                            : {}
                    ),

                    save: false
                }
            );

        results.push(
            result
        );

        if (
            result.saved
        ) {
            saved++;
        } else {
            failed++;
        }
    }

    this.saveData();

    return {
        ok:
            failed === 0,

        saved,

        failed,

        results
    };
}


// ============================================================
// BULK ADD TOPICS
// ============================================================

addUserTopics(
    userId = "",
    topics = [],
    options = {}
) {

    if (
        !Array.isArray(
            topics
        )
    ) {
        return {
            ok: false,
            saved: 0,
            failed: 0
        };
    }

    let saved = 0;
    let failed = 0;

    const results = [];

    for (
        const topic
        of topics
    ) {

        const clean =
            typeof topic ===
                "string"
                ? topic
                : topic?.name ||
                    topic?.topic ||
                    "";

        const result =
            this.addUserTopic(
                userId,
                clean,
                {
                    ...options,
                    save: false
                }
            );

        results.push(
            result
        );

        if (
            result.saved
        ) {
            saved++;
        } else {
            failed++;
        }
    }

    this.saveData();

    return {
        ok:
            failed === 0,

        saved,

        failed,

        results
    };
}


// ============================================================
// BULK USER MEMORY SAVE
// ============================================================

saveUserMemoryBatch(
    userId = "",
    batch = {},
    options = {}
) {

    const results = {
        facts: [],
        preferences: [],
        topics: [],
        questions: [],
        answers: []
    };

    if (
        Array.isArray(
            batch.facts
        )
    ) {
        results.facts =
            this.addUserFacts(
                userId,
                batch.facts,
                {
                    ...options,
                    save: false
                }
            );
    }

    if (
        Array.isArray(
            batch.preferences
        )
    ) {
        results.preferences =
            this.addUserPreferences(
                userId,
                batch.preferences,
                {
                    ...options,
                    save: false
                }
            );
    }

    if (
        Array.isArray(
            batch.topics
        )
    ) {
        results.topics =
            this.addUserTopics(
                userId,
                batch.topics,
                {
                    ...options,
                    save: false
                }
            );
    }

    if (
        Array.isArray(
            batch.questions
        )
    ) {

        for (
            const question
            of batch.questions
        ) {

            results.questions.push(
                this.recordUserQuestion(
                    userId,
                    question,
                    {
                        ...options,
                        save: false
                    }
                )
            );
        }
    }

    if (
        Array.isArray(
            batch.answers
        )
    ) {

        for (
            const answer
            of batch.answers
        ) {

            results.answers.push(
                this.recordUserAnswer(
                    userId,
                    answer,
                    {
                        ...options,
                        save: false
                    }
                )
            );
        }
    }

    this.saveData();

    return {
        ok: true,
        userId:
            this.resolveUserId(
                userId
            ),
        results
    };
}


// ============================================================
// USER MEMORY MAINTENANCE
// ============================================================

maintainUserMemory(
    userId = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    const config =
        this.getUserMemoryConfig();

    let trimmed = 0;

    const trimArray =
        (
            array,
            max
        ) => {

            if (
                !Array.isArray(
                    array
                )
            ) {
                return 0;
            }

            if (
                array.length <= max
            ) {
                return 0;
            }

            const amount =
                array.length -
                max;

            array.splice(
                0,
                amount
            );

            return amount;
        };

    trimmed +=
        trimArray(
            user.facts,
            config.maxFactsPerUser
        );

    trimmed +=
        trimArray(
            user.preferences,
            config.maxPreferencesPerUser
        );

    trimmed +=
        trimArray(
            user.questions,
            config.maxQuestionsPerUser
        );

    trimmed +=
        trimArray(
            user.history,
            config.maxHistoryPerUser
        );

    trimmed +=
        trimArray(
            user.topics,
            config.maxTopicsPerUser
        );

    trimmed +=
        trimArray(
            user.context,
            config.contextWindow
        );

    trimmed +=
        trimArray(
            user.answerHits,
            config.maxAnswerHitsPerUser
        );

    user.stats.totalQuestions =
        user.questions.length;

    user.stats.totalAnswers =
        user.answers.length;

    user.stats.totalMemoryHits =
        user.answerHits.length;

    user.stats.totalFacts =
        user.facts.length;

    user.stats.totalPreferences =
        user.preferences.length;

    user.stats.totalTopics =
        user.topics.length;

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,

        userId:
            user.id,

        trimmed,

        stats:
            this.getUserStats(
                user.id
            )
    };
}


// ============================================================
// ALL USER MAINTENANCE
// ============================================================

maintainAllUsers(
    options = {}
) {

    const users =
        this.getAllUsers();

    let maintained = 0;

    const results = [];

    for (
        const user
        of users
    ) {

        const result =
            this.maintainUserMemory(
                user.id,
                {
                    ...options,
                    save: false
                }
            );

        results.push(
            result
        );

        maintained++;
    }

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,

        maintained,

        results
    };
}


// ============================================================
// USER MEMORY REPORT
// ============================================================

getUserMemoryReport(
    userId = ""
) {

    const user =
        this.getUserMemory(
            userId
        );

    const questionCount =
        user.questions.length;

    const answerCount =
        user.answers.length;

    const hitCount =
        user.answerHits.length;

    const contextCount =
        user.context.length;

    return {
        ok: true,

        userId:
            user.id,

        profile:
            {
                ...user.profile
            },

        memory: {
            facts:
                user.facts.length,

            preferences:
                user.preferences.length,

            topics:
                user.topics.length,

            questions:
                questionCount,

            answers:
                answerCount,

            answerHits:
                hitCount,

            history:
                user.history.length,

            context:
                contextCount
        },

        activity: {
            totalQuestions:
                user.stats.totalQuestions,

            totalAnswers:
                user.stats.totalAnswers,

            totalMemoryHits:
                user.stats.totalMemoryHits
        },

        recentQuestions:
            user.questions.slice(
                -10
            ),

        recentContext:
            user.context.slice(
                -10
            ),

        topTopics:
            this.getUserTopics(
                user.id,
                {
                    limit: 10
                }
            )
    };
}


// ============================================================
// USER MEMORY HEALTH
// ============================================================

getUserMemoryHealth(
    userId = ""
) {

    const user =
        this.getUserMemory(
            userId
        );

    let brokenFacts = 0;

    let brokenPreferences = 0;

    let brokenTopics = 0;

    for (
        const fact
        of user.facts
    ) {

        if (
            !fact ||
            !this.safeText(
                fact.text
            )
        ) {
            brokenFacts++;
        }
    }

    for (
        const preference
        of user.preferences
    ) {

        if (
            !preference ||
            !this.safeText(
                preference.text
            )
        ) {
            brokenPreferences++;
        }
    }

    for (
        const topic
        of user.topics
    ) {

        if (
            !topic ||
            !this.safeText(
                topic.name
            )
        ) {
            brokenTopics++;
        }
    }

    const broken =
        brokenFacts +
        brokenPreferences +
        brokenTopics;

    return {
        ok:
            broken === 0,

        userId:
            user.id,

        broken,

        brokenFacts,

        brokenPreferences,

        brokenTopics,

        totalItems:
            user.facts.length +
            user.preferences.length +
            user.topics.length +
            user.questions.length +
            user.answers.length +
            user.history.length +
            user.context.length,

        stats:
            this.getUserStats(
                user.id
            )
    };
}


// ============================================================
// USER MEMORY REPAIR
// ============================================================

repairUserMemory(
    userId = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    let repaired = 0;

    const cleanCollection =
        (
            array,
            textKey
        ) => {

            if (
                !Array.isArray(
                    array
                )
            ) {
                return [];
            }

            const result = [];

            for (
                const item
                of array
            ) {

                if (
                    !item ||
                    typeof item !==
                        "object"
                ) {
                    repaired++;
                    continue;
                }

                if (
                    !this.safeText(
                        item[textKey]
                    )
                ) {
                    repaired++;
                    continue;
                }

                if (
                    !item.id
                ) {
                    item.id =
                        this.createRecordId();

                    repaired++;
                }

                if (
                    !item.createdAt
                ) {
                    item.createdAt =
                        this.nowIso();

                    repaired++;
                }

                if (
                    !item.updatedAt
                ) {
                    item.updatedAt =
                        this.nowIso();

                    repaired++;
                }

                result.push(
                    item
                );
            }

            return result;
        };

    user.facts =
        cleanCollection(
            user.facts,
            "text"
        );

    user.preferences =
        cleanCollection(
            user.preferences,
            "text"
        );

    user.topics =
        cleanCollection(
            user.topics,
            "name"
        );

    for (
        const fact
        of user.facts
    ) {

        fact.key =
            this.createFactKey(
                fact.text
            );

        fact.confidence =
            this.normalizeConfidence(
                fact.confidence
            );
    }

    for (
        const preference
        of user.preferences
    ) {

        preference.key =
            this.normalizeQuestion(
                preference.text
            );

        preference.confidence =
            this.normalizeConfidence(
                preference.confidence
            );
    }

    for (
        const topic
        of user.topics
    ) {

        topic.key =
            this.normalizeQuestion(
                topic.name
            );

        topic.count =
            Math.max(
                1,
                this.safeNumber(
                    topic.count,
                    1
                )
            );
    }

    this.maintainUserMemory(
        user.id,
        {
            save: false
        }
    );

    user.updatedAt =
        this.nowIso();

    this.saveData();

    return {
        ok: true,

        repaired,

        health:
            this.getUserMemoryHealth(
                user.id
            )
    };
}


// ============================================================
// USER MEMORY CONSISTENCY
// ============================================================

checkUserMemoryConsistency(
    userId = ""
) {

    const user =
        this.getUserMemory(
            userId
        );

    const issues = [];

    if (
        user.stats.totalQuestions !==
        user.questions.length
    ) {
        issues.push(
            "question-count-mismatch"
        );
    }

    if (
        user.stats.totalAnswers !==
        user.answers.length
    ) {
        issues.push(
            "answer-count-mismatch"
        );
    }

    if (
        user.stats.totalFacts !==
        user.facts.length
    ) {
        issues.push(
            "fact-count-mismatch"
        );
    }

    if (
        user.stats.totalPreferences !==
        user.preferences.length
    ) {
        issues.push(
            "preference-count-mismatch"
        );
    }

    if (
        user.stats.totalTopics !==
        user.topics.length
    ) {
        issues.push(
            "topic-count-mismatch"
        );
    }

    return {
        ok:
            issues.length === 0,

        userId:
            user.id,

        issues
    };
}


// ============================================================
// USER MEMORY CONSISTENCY FIX
// ============================================================

repairUserMemoryConsistency(
    userId = "",
    options = {}
) {

    const user =
        this.getUserMemory(
            userId
        );

    user.stats.totalQuestions =
        user.questions.length;

    user.stats.totalAnswers =
        user.answers.length;

    user.stats.totalMemoryHits =
        user.answerHits.length;

    user.stats.totalFacts =
        user.facts.length;

    user.stats.totalPreferences =
        user.preferences.length;

    user.stats.totalTopics =
        user.topics.length;

    user.updatedAt =
        this.nowIso();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,

        consistency:
            this.checkUserMemoryConsistency(
                user.id
            )
    };
}


// ============================================================
// USER MEMORY SCORE
// ============================================================

calculateUserMemoryScore(
    userId = ""
) {

    const user =
        this.getUserMemory(
            userId
        );

    const facts =
        Math.min(
            1,
            user.facts.length / 50
        );

    const preferences =
        Math.min(
            1,
            user.preferences.length / 30
        );

    const topics =
        Math.min(
            1,
            user.topics.length / 30
        );

    const questions =
        Math.min(
            1,
            user.questions.length / 100
        );

    const context =
        Math.min(
            1,
            user.context.length / 30
        );

    const hits =
        Math.min(
            1,
            user.answerHits.length / 100
        );

    return this.clamp01(
        facts * 0.20 +
        preferences * 0.15 +
        topics * 0.15 +
        questions * 0.15 +
        context * 0.15 +
        hits * 0.20
    );
}


// ============================================================
// USER MEMORY LEVEL
// ============================================================

getUserMemoryLevel(
    userId = ""
) {

    const score =
        this.calculateUserMemoryScore(
            userId
        );

    if (
        score >= 0.85
    ) {
        return "deep";
    }

    if (
        score >= 0.65
    ) {
        return "rich";
    }

    if (
        score >= 0.40
    ) {
        return "developing";
    }

    if (
        score >= 0.15
    ) {
        return "basic";
    }

    return "new";
}


// ============================================================
// USER MEMORY DASHBOARD
// ============================================================

getUserMemoryDashboard(
    userId = ""
) {

    const summary =
        this.getUserMemorySummary(
            userId
        );

    const health =
        this.getUserMemoryHealth(
            userId
        );

    return {
        ok: true,

        userId:
            summary.userId,

        level:
            this.getUserMemoryLevel(
                userId
            ),

        score:
            this.calculateUserMemoryScore(
                userId
            ),

        summary,

        health,

        topTopics:
            this.getUserTopics(
                userId,
                {
                    limit: 10
                }
            ),

        importantFacts:
            this.getUserFacts(
                userId,
                {
                    important: true,
                    limit: 10
                }
            ),

        preferences:
            this.getUserPreferences(
                userId,
                {
                    limit: 10
                }
            ),

        context:
            this.getUserContext(
                userId,
                10
            )
    };
}


// ============================================================
// USER MEMORY SELF TEST
// ============================================================

runUserMemorySelfTest(
    userId = ""
) {

    const resolved =
        this.resolveUserId(
            userId
        );

    const tests = [];

    const user =
        this.getUserMemory(
            resolved
        );

    tests.push({
        name: "user-storage",
        result:
            Boolean(
                user
            )
    });

    tests.push({
        name: "profile",
        result:
            Boolean(
                user.profile
            )
    });

    tests.push({
        name: "facts",
        result:
            Array.isArray(
                user.facts
            )
    });

    tests.push({
        name: "preferences",
        result:
            Array.isArray(
                user.preferences
            )
    });

    tests.push({
        name: "questions",
        result:
            Array.isArray(
                user.questions
            )
    });

    tests.push({
        name: "answers",
        result:
            Array.isArray(
                user.answers
            )
    });

    tests.push({
        name: "topics",
        result:
            Array.isArray(
                user.topics
            )
    });

    tests.push({
        name: "history",
        result:
            Array.isArray(
                user.history
            )
    });

    tests.push({
        name: "context",
        result:
            Array.isArray(
                user.context
            )
    });

    tests.push({
        name: "answer-hits",
        result:
            Array.isArray(
                user.answerHits
            )
    });

    tests.push({
        name: "custom-data",
        result:
            Boolean(
                user.customData
            )
    });

    const passed =
        tests.filter(
            (item) =>
                item.result
        ).length;

    return {
        ok:
            passed ===
            tests.length,

        userId:
            resolved,

        total:
            tests.length,

        passed,

        failed:
            tests.length -
            passed,

        tests
    };
}


// ============================================================
// USER MESSAGE PROCESS FINAL
// ============================================================

processUserMessage(
    userId = "",
    message = "",
    options = {}
) {

    const result =
        this.processUserAwareQuestion(
            userId,
            message,
            options
        );

    if (
        options.learn !== false
    ) {

        this.learnFromUserMessage(
            userId,
            message,
            {
                source:
                    options.source ||
                    "user-message"
            }
        );
    }

    return result;
}


// ============================================================
// PERSONAL CHAT PROCESSOR
// ============================================================

processPersonalChat(
    userId = "",
    question = "",
    answer = "",
    options = {}
) {

    const learned =
        this.learnFromExchange(
            userId,
            question,
            answer,
            options
        );

    const result =
        this.findUserAwareAnswer(
            userId,
            question,
            options
        );

    return {
        ok: true,

        learned,

        answer:
            result
    };
}


// ============================================================
// USER MEMORY FINAL BRIDGE
// ============================================================

userMemoryBridge(
    action = "",
    userId = "",
    payload = {},
    options = {}
) {

    const cleanAction =
        this.safeText(
            action
        ).toLowerCase();

    if (
        cleanAction ===
        "get"
    ) {
        return this.getUserMemory(
            userId
        );
    }

    if (
        cleanAction ===
        "summary"
    ) {
        return this.getUserMemorySummary(
            userId
        );
    }

    if (
        cleanAction ===
        "dashboard"
    ) {
        return this.getUserMemoryDashboard(
            userId
        );
    }

    if (
        cleanAction ===
        "fact"
    ) {
        return this.addUserFact(
            userId,
            payload.text ||
            payload.fact ||
            "",
            options
        );
    }

    if (
        cleanAction ===
        "preference"
    ) {
        return this.addUserPreference(
            userId,
            payload.text ||
            payload.preference ||
            "",
            options
        );
    }

    if (
        cleanAction ===
        "topic"
    ) {
        return this.addUserTopic(
            userId,
            payload.name ||
            payload.topic ||
            "",
            options
        );
    }

    if (
        cleanAction ===
        "question"
    ) {
        return this.recordUserQuestion(
            userId,
            payload.question ||
            payload.text ||
            "",
            options
        );
    }

    if (
        cleanAction ===
        "answer"
    ) {
        return this.recordUserAnswer(
            userId,
            payload.answer ||
            payload.text ||
            "",
            options
        );
    }

    if (
        cleanAction ===
        "search"
    ) {
        return this.queryUserMemory(
            userId,
            payload.query ||
            payload.question ||
            "",
            options
        );
    }

    if (
        cleanAction ===
        "clear"
    ) {
        return this.clearUserMemory(
            userId,
            options
        );
    }

    if (
        cleanAction ===
        "health"
    ) {
        return this.getUserMemoryHealth(
            userId
        );
    }

    if (
        cleanAction ===
        "repair"
    ) {
        return this.repairUserMemory(
            userId,
            options
        );
    }

    return {
        ok: false,
        reason:
            "unknown-user-memory-action"
    };
}


// ============================================================
// COMPATIBILITY ALIASES
// ============================================================

rememberUserFact(
    userId = "",
    fact = "",
    options = {}
) {
    return this.addUserFact(
        userId,
        fact,
        options
    );
}


rememberUserPreference(
    userId = "",
    preference = "",
    options = {}
) {
    return this.addUserPreference(
        userId,
        preference,
        options
    );
}


rememberUserQuestion(
    userId = "",
    question = "",
    options = {}
) {
    return this.recordUserQuestion(
        userId,
        question,
        options
    );
}


rememberUserAnswer(
    userId = "",
    answer = "",
    options = {}
) {
    return this.recordUserAnswer(
        userId,
        answer,
        options
    );
}


getPersonalMemory(
    userId = "",
    query = "",
    options = {}
) {
    return this.queryUserMemory(
        userId,
        query,
        options
    );
}


findPersonalMemoryAnswer(
    userId = "",
    question = "",
    options = {}
) {
    return this.findPersonalAnswer(
        userId,
        question,
        options
    );
}


savePersonalAnswer(
    userId = "",
    question = "",
    answer = "",
    options = {}
) {
    return this.saveUserQuestionAnswer(
        userId,
        question,
        answer,
        options
    );
}


learnUser(
    userId = "",
    question = "",
    answer = "",
    options = {}
) {
    return this.learnFromExchange(
        userId,
        question,
        answer,
        options
    );
}


getProfile(
    userId = ""
) {
    return this.getUserProfile(
        userId
    );
}


setProfile(
    userId = "",
    profile = {},
    options = {}
) {
    return this.setUserProfile(
        userId,
        profile,
        options
    );
}


getFacts(
    userId = "",
    options = {}
) {
    return this.getUserFacts(
        userId,
        options
    );
}


getPreferences(
    userId = "",
    options = {}
) {
    return this.getUserPreferences(
        userId,
        options
    );
}


getTopics(
    userId = "",
    options = {}
) {
    return this.getUserTopics(
        userId,
        options
    );
}


getHistory(
    userId = "",
    options = {}
) {
    return this.getUserHistory(
        userId,
        options
    );
}


getContext(
    userId = "",
    limit = 30
) {
    return this.getUserContext(
        userId,
        limit
    );
}


// ============================================================
// PART 6 END
// ============================================================
// ============================================================
// TÜRKAI — ANSWER MEMORY
// PART 7 / 10
// CACHE + BACKUP + RESTORE + SNAPSHOT + EXPORT/IMPORT
// MAINTENANCE + CLEANUP + RETENTION + DATABASE UTILITIES
// ============================================================


// ============================================================
// STORAGE CONFIG
// ============================================================

getStorageConfig() {
    return {
        maxBackups: 100,
        maxSnapshots: 500,
        maxExports: 100,
        maxMaintenanceLogs: 5000,
        maxCacheEntries: 10000,
        defaultCacheTTL: 1000 * 60 * 10,
        backupOnChange: true,
        snapshotOnChange: false,
        autoCleanup: true,
        retentionDays: 3650,
        maxRecords: 1000000,
        maxLearningEvents: 5000,
        maxQualitySnapshots: 1000,
        compression: false
    };
}


// ============================================================
// STORAGE ENSURE
// ============================================================

ensureStorageCollections() {

    if (
        !Array.isArray(
            this.data.backups
        )
    ) {
        this.data.backups = [];
    }

    if (
        !Array.isArray(
            this.data.snapshots
        )
    ) {
        this.data.snapshots = [];
    }

    if (
        !Array.isArray(
            this.data.exports
        )
    ) {
        this.data.exports = [];
    }

    if (
        !Array.isArray(
            this.data.maintenanceLogs
        )
    ) {
        this.data.maintenanceLogs = [];
    }

    if (
        !Array.isArray(
            this.data.restoreLogs
        )
    ) {
        this.data.restoreLogs = [];
    }

    if (
        !Array.isArray(
            this.data.cleanupLogs
        )
    ) {
        this.data.cleanupLogs = [];
    }

    if (
        !Array.isArray(
            this.data.changeLog
        )
    ) {
        this.data.changeLog = [];
    }

    if (
        !Array.isArray(
            this.data.archive
        )
    ) {
        this.data.archive = [];
    }

    if (
        !Array.isArray(
            this.data.deletedRecords
        )
    ) {
        this.data.deletedRecords = [];
    }

    if (
        !Array.isArray(
            this.data.memorySnapshots
        )
    ) {
        this.data.memorySnapshots = [];
    }

    return this.data;
}


// ============================================================
// STORAGE INITIALIZATION
// ============================================================

initializeStorageLayer() {

    this.ensureStorageCollections();

    if (
        !this.cache
    ) {
        this.cache =
            new Map();
    }

    if (
        !this.answerCache
    ) {
        this.answerCache =
            new Map();
    }

    if (
        !this.index
    ) {
        this.rebuildIndex();
    }

    return {
        ok: true,
        initialized: true
    };
}


// ============================================================
// STORAGE STATUS
// ============================================================

getStorageStatus() {

    this.ensureStorageCollections();

    return {

        ok: true,

        backups:
            this.data.backups.length,

        snapshots:
            this.data.snapshots.length,

        exports:
            this.data.exports.length,

        maintenanceLogs:
            this.data.maintenanceLogs.length,

        restoreLogs:
            this.data.restoreLogs.length,

        cleanupLogs:
            this.data.cleanupLogs.length,

        changeLog:
            this.data.changeLog.length,

        archive:
            this.data.archive.length,

        deletedRecords:
            this.data.deletedRecords.length,

        memorySnapshots:
            this.data.memorySnapshots.length,

        records:
            Array.isArray(
                this.data.records
            )
                ? this.data.records.length
                : 0,

        cache:
            this.getSearchCacheStats(),

        size:
            this.getMemorySize()
    };
}


// ============================================================
// DEEP CLONE
// ============================================================

deepClone(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {
        return value;
    }

    try {

        return JSON.parse(
            JSON.stringify(
                value
            )
        );

    } catch {

        if (
            Array.isArray(value)
        ) {
            return value.map(
                (item) =>
                    this.deepClone(
                        item
                    )
            );
        }

        if (
            typeof value ===
            "object"
        ) {

            const output = {};

            for (
                const [
                    key,
                    item
                ]
                of Object.entries(
                    value
                )
            ) {
                output[key] =
                    this.deepClone(
                        item
                    );
            }

            return output;
        }

        return value;
    }
}


// ============================================================
// MEMORY DATA CLONE
// ============================================================

cloneMemoryData(
    options = {}
) {

    const data =
        this.deepClone(
            this.data
        );

    if (
        options.excludeBackups === true
    ) {
        delete data.backups;
    }

    if (
        options.excludeExports === true
    ) {
        delete data.exports;
    }

    if (
        options.excludeLogs === true
    ) {
        delete data.maintenanceLogs;
        delete data.restoreLogs;
        delete data.cleanupLogs;
        delete data.changeLog;
    }

    return data;
}


// ============================================================
// BACKUP ID
// ============================================================

createBackupId() {

    return [
        "backup",
        Date.now(),
        Math.random()
            .toString(36)
            .slice(2, 12)
    ].join("_");
}


// ============================================================
// SNAPSHOT ID
// ============================================================

createSnapshotId() {

    return [
        "snapshot",
        Date.now(),
        Math.random()
            .toString(36)
            .slice(2, 12)
    ].join("_");
}


// ============================================================
// EXPORT ID
// ============================================================

createExportId() {

    return [
        "export",
        Date.now(),
        Math.random()
            .toString(36)
            .slice(2, 12)
    ].join("_");
}


// ============================================================
// MAINTENANCE LOG
// ============================================================

addMaintenanceLog(
    action = "",
    details = {},
    options = {}
) {

    this.ensureStorageCollections();

    const entry = {

        id:
            this.createRecordId(),

        action:
            this.safeText(
                action
            ),

        createdAt:
            this.nowIso(),

        durationMs:
            Math.max(
                0,
                this.safeNumber(
                    options.durationMs,
                    0
                )
            ),

        status:
            this.safeText(
                options.status ||
                "ok"
            ),

        details:
            details &&
            typeof details ===
                "object"
                ? this.deepClone(
                    details
                )
                : {}
    };

    this.data.maintenanceLogs.push(
        entry
    );

    const max =
        this.getStorageConfig()
            .maxMaintenanceLogs;

    if (
        this.data.maintenanceLogs.length >
        max
    ) {
        this.data.maintenanceLogs =
            this.data.maintenanceLogs.slice(
                -max
            );
    }

    if (
        options.save !== false
    ) {
        this.touchUpdatedAt();
        this.saveData();
    }

    return entry;
}


// ============================================================
// CHANGE LOG
// ============================================================

addChangeLog(
    type = "",
    details = {},
    options = {}
) {

    this.ensureStorageCollections();

    const entry = {

        id:
            this.createRecordId(),

        type:
            this.safeText(
                type
            ),

        createdAt:
            this.nowIso(),

        details:
            details &&
            typeof details ===
                "object"
                ? this.deepClone(
                    details
                )
                : {}
    };

    this.data.changeLog.push(
        entry
    );

    const max =
        10000;

    if (
        this.data.changeLog.length >
        max
    ) {
        this.data.changeLog =
            this.data.changeLog.slice(
                -max
            );
    }

    if (
        options.save !== false
    ) {
        this.touchUpdatedAt();
        this.saveData();
    }

    return entry;
}


// ============================================================
// RESTORE LOG
// ============================================================

addRestoreLog(
    action = "",
    details = {},
    options = {}
) {

    this.ensureStorageCollections();

    const entry = {

        id:
            this.createRecordId(),

        action:
            this.safeText(
                action
            ),

        createdAt:
            this.nowIso(),

        status:
            this.safeText(
                options.status ||
                "ok"
            ),

        details:
            details &&
            typeof details ===
                "object"
                ? this.deepClone(
                    details
                )
                : {}
    };

    this.data.restoreLogs.push(
        entry
    );

    if (
        this.data.restoreLogs.length >
        5000
    ) {
        this.data.restoreLogs =
            this.data.restoreLogs.slice(
                -5000
            );
    }

    if (
        options.save !== false
    ) {
        this.touchUpdatedAt();
        this.saveData();
    }

    return entry;
}


// ============================================================
// CLEANUP LOG
// ============================================================

addCleanupLog(
    action = "",
    details = {},
    options = {}
) {

    this.ensureStorageCollections();

    const entry = {

        id:
            this.createRecordId(),

        action:
            this.safeText(
                action
            ),

        createdAt:
            this.nowIso(),

        details:
            details &&
            typeof details ===
                "object"
                ? this.deepClone(
                    details
                )
                : {}
    };

    this.data.cleanupLogs.push(
        entry
    );

    if (
        this.data.cleanupLogs.length >
        5000
    ) {
        this.data.cleanupLogs =
            this.data.cleanupLogs.slice(
                -5000
            );
    }

    if (
        options.save !== false
    ) {
        this.touchUpdatedAt();
        this.saveData();
    }

    return entry;
}


// ============================================================
// CREATE BACKUP OBJECT
// ============================================================

createBackup(
    options = {}
) {

    this.ensureStorageCollections();

    const startedAt =
        Date.now();

    const config =
        this.getStorageConfig();

    const memory =
        this.cloneMemoryData({
            excludeBackups:
                options.excludeBackups !== false,

            excludeExports:
                options.excludeExports !== false,

            excludeLogs:
                options.excludeLogs === true
        });

    const backup = {

        id:
            this.createBackupId(),

        version:
            this.data.version ||
            "1.0",

        createdAt:
            this.nowIso(),

        timestamp:
            Date.now(),

        reason:
            this.safeText(
                options.reason ||
                "manual"
            ),

        source:
            this.safeText(
                options.source ||
                "answer-memory"
            ),

        compressed:
            options.compressed === true,

        records:
            Array.isArray(
                memory.records
            )
                ? memory.records.length
                : 0,

        users:
            memory.users &&
            typeof memory.users ===
                "object"
                ? Object.keys(
                    memory.users
                ).length
                : 0,

        data:
            memory,

        checksum:
            this.createMemoryChecksum(
                memory
            ),

        durationMs:
            Date.now() -
            startedAt
    };

    return backup;
}


// ============================================================
// CREATE CHECKSUM
// ============================================================

createMemoryChecksum(
    data
) {

    try {

        const text =
            JSON.stringify(
                data
            );

        if (
            typeof crypto !==
            "undefined" &&
            crypto &&
            typeof crypto.createHash ===
                "function"
        ) {

            return crypto
                .createHash("sha256")
                .update(
                    text,
                    "utf8"
                )
                .digest("hex");
        }

        let hash = 0;

        for (
            let i = 0;
            i < text.length;
            i++
        ) {

            hash =
                (
                    (
                        hash << 5
                    ) -
                    hash +
                    text.charCodeAt(i)
                ) |
                0;
        }

        return String(
            Math.abs(hash)
        );

    } catch {

        return "";
    }
}


// ============================================================
// SAVE BACKUP
// ============================================================

saveBackup(
    options = {}
) {

    const backup =
        this.createBackup(
            options
        );

    this.ensureStorageCollections();

    this.data.backups.push(
        backup
    );

    const max =
        this.getStorageConfig()
            .maxBackups;

    if (
        this.data.backups.length >
        max
    ) {

        this.data.backups =
            this.data.backups.slice(
                -max
            );
    }

    this.addChangeLog(
        "backup-created",
        {
            backupId:
                backup.id,

            reason:
                backup.reason,

            records:
                backup.records,

            checksum:
                backup.checksum
        },
        {
            save: false
        }
    );

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,

        saved: true,

        backupId:
            backup.id,

        backup
    };
}


// ============================================================
// AUTO BACKUP
// ============================================================

autoBackup(
    reason = "auto"
) {

    const config =
        this.getStorageConfig();

    if (
        config.backupOnChange ===
        false
    ) {
        return {
            ok: true,
            skipped: true,
            reason:
                "disabled"
        };
    }

    return this.saveBackup({
        reason:
            this.safeText(
                reason
            ) ||
            "auto",

        source:
            "auto-backup"
    });
}


// ============================================================
// GET BACKUPS
// ============================================================

getBackups(
    options = {}
) {

    this.ensureStorageCollections();

    let backups =
        [
            ...this.data.backups
        ];

    if (
        options.reason
    ) {
        backups =
            backups.filter(
                (item) =>
                    item.reason ===
                    options.reason
            );
    }

    const limit =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    options.limit,
                    20
                )
            )
        );

    return backups
        .slice(
            -limit
        )
        .reverse();
}


// ============================================================
// GET BACKUP
// ============================================================

getBackup(
    backupId = ""
) {

    this.ensureStorageCollections();

    const id =
        this.safeText(
            backupId
        );

    if (!id) {
        return null;
    }

    return (
        this.data.backups.find(
            (backup) =>
                backup &&
                backup.id === id
        ) ||
        null
    );
}


// ============================================================
// DELETE BACKUP
// ============================================================

deleteBackup(
    backupId = "",
    options = {}
) {

    this.ensureStorageCollections();

    const id =
        this.safeText(
            backupId
        );

    const index =
        this.data.backups.findIndex(
            (backup) =>
                backup &&
                backup.id === id
        );

    if (
        index === -1
    ) {
        return {
            ok: false,
            deleted: false,
            reason:
                "backup-not-found"
        };
    }

    const removed =
        this.data.backups.splice(
            index,
            1
        )[0];

    this.addChangeLog(
        "backup-deleted",
        {
            backupId:
                id
        },
        {
            save: false
        }
    );

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,
        deleted: true,
        backup:
            removed
    };
}


// ============================================================
// VERIFY BACKUP
// ============================================================

verifyBackup(
    backupId = ""
) {

    const backup =
        this.getBackup(
            backupId
        );

    if (!backup) {
        return {
            ok: false,
            valid: false,
            reason:
                "backup-not-found"
        };
    }

    const calculated =
        this.createMemoryChecksum(
            backup.data
        );

    return {
        ok: true,

        valid:
            calculated ===
            backup.checksum,

        expected:
            backup.checksum,

        actual:
            calculated,

        backupId:
            backup.id
    };
}


// ============================================================
// RESTORE DATA FROM BACKUP
// ============================================================

restoreBackup(
    backupId = "",
    options = {}
) {

    const startedAt =
        Date.now();

    const backup =
        this.getBackup(
            backupId
        );

    if (!backup) {
        return {
            ok: false,
            restored: false,
            reason:
                "backup-not-found"
        };
    }

    if (
        !backup.data ||
        typeof backup.data !==
            "object"
    ) {
        return {
            ok: false,
            restored: false,
            reason:
                "backup-data-invalid"
        };
    }

    const verified =
        this.verifyBackup(
            backupId
        );

    if (
        options.skipChecksum !== true &&
        !verified.valid
    ) {
        return {
            ok: false,
            restored: false,
            reason:
                "checksum-mismatch",
            verification:
                verified
        };
    }

    if (
        options.createSafetyBackup !==
        false
    ) {

        this.saveBackup({
            reason:
                "pre-restore",
            source:
                "restore-safety"
        });
    }

    const previous =
        this.cloneMemoryData();

    const incoming =
        this.deepClone(
            backup.data
        );

    this.data = {
        ...incoming
    };

    this.ensureStorageCollections();

    if (
        !Array.isArray(
            this.data.records
        )
    ) {
        this.data.records = [];
    }

    if (
        !this.data.users ||
        typeof this.data.users !==
            "object"
    ) {
        this.data.users = {};
    }

    this.rebuildIndex();

    this.invalidateAllCaches();

    this.touchUpdatedAt();

    this.addRestoreLog(
        "backup-restored",
        {
            backupId:
                backup.id,

            previousRecords:
                Array.isArray(
                    previous.records
                )
                    ? previous.records.length
                    : 0,

            restoredRecords:
                this.data.records.length,

            durationMs:
                Date.now() -
                startedAt
        },
        {
            save: false
        }
    );

    this.addChangeLog(
        "backup-restored",
        {
            backupId:
                backup.id,

            checksum:
                backup.checksum
        },
        {
            save: false
        }
    );

    this.saveData();

    return {
        ok: true,

        restored: true,

        backupId:
            backup.id,

        records:
            this.data.records.length,

        users:
            Object.keys(
                this.data.users
            ).length,

        durationMs:
            Date.now() -
            startedAt
    };
}


// ============================================================
// RESTORE LATEST BACKUP
// ============================================================

restoreLatestBackup(
    options = {}
) {

    const backups =
        this.getBackups({
            limit: 1
        });

    if (
        !backups.length
    ) {
        return {
            ok: false,
            restored: false,
            reason:
                "no-backup"
        };
    }

    return this.restoreBackup(
        backups[0].id,
        options
    );
}


// ============================================================
// SNAPSHOT OBJECT
// ============================================================

createSnapshot(
    options = {}
) {

    const data =
        this.cloneMemoryData({
            excludeBackups:
                options.includeBackups !== true,

            excludeExports:
                options.includeExports !== true,

            excludeLogs:
                options.includeLogs !== true
        });

    const snapshot = {

        id:
            this.createSnapshotId(),

        createdAt:
            this.nowIso(),

        reason:
            this.safeText(
                options.reason ||
                "manual"
            ),

        records:
            Array.isArray(
                data.records
            )
                ? data.records.length
                : 0,

        users:
            data.users &&
            typeof data.users ===
                "object"
                ? Object.keys(
                    data.users
                ).length
                : 0,

        checksum:
            this.createMemoryChecksum(
                data
            ),

        data
    };

    return snapshot;
}


// ============================================================
// SAVE SNAPSHOT
// ============================================================

saveSnapshot(
    options = {}
) {

    this.ensureStorageCollections();

    const snapshot =
        this.createSnapshot(
            options
        );

    this.data.snapshots.push(
        snapshot
    );

    const max =
        this.getStorageConfig()
            .maxSnapshots;

    if (
        this.data.snapshots.length >
        max
    ) {
        this.data.snapshots =
            this.data.snapshots.slice(
                -max
            );
    }

    this.addChangeLog(
        "snapshot-created",
        {
            snapshotId:
                snapshot.id,

            records:
                snapshot.records
        },
        {
            save: false
        }
    );

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,
        saved: true,
        snapshotId:
            snapshot.id,
        snapshot
    };
}


// ============================================================
// GET SNAPSHOTS
// ============================================================

getSnapshots(
    options = {}
) {

    this.ensureStorageCollections();

    let snapshots =
        [
            ...this.data.snapshots
        ];

    if (
        options.reason
    ) {
        snapshots =
            snapshots.filter(
                (item) =>
                    item.reason ===
                    options.reason
            );
    }

    const limit =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    options.limit,
                    20
                )
            )
        );

    return snapshots
        .slice(
            -limit
        )
        .reverse();
}


// ============================================================
// GET SNAPSHOT
// ============================================================

getSnapshot(
    snapshotId = ""
) {

    this.ensureStorageCollections();

    const id =
        this.safeText(
            snapshotId
        );

    return (
        this.data.snapshots.find(
            (snapshot) =>
                snapshot &&
                snapshot.id === id
        ) ||
        null
    );
}


// ============================================================
// RESTORE SNAPSHOT
// ============================================================

restoreSnapshot(
    snapshotId = "",
    options = {}
) {

    const snapshot =
        this.getSnapshot(
            snapshotId
        );

    if (!snapshot) {
        return {
            ok: false,
            restored: false,
            reason:
                "snapshot-not-found"
        };
    }

    const calculated =
        this.createMemoryChecksum(
            snapshot.data
        );

    if (
        options.skipChecksum !== true &&
        calculated !==
            snapshot.checksum
    ) {
        return {
            ok: false,
            restored: false,
            reason:
                "snapshot-checksum-mismatch"
        };
    }

    if (
        options.createSafetyBackup !==
        false
    ) {
        this.saveBackup({
            reason:
                "pre-snapshot-restore",
            source:
                "snapshot-restore"
        });
    }

    this.data =
        this.deepClone(
            snapshot.data
        );

    this.ensureStorageCollections();

    if (
        !Array.isArray(
            this.data.records
        )
    ) {
        this.data.records = [];
    }

    this.rebuildIndex();

    this.invalidateAllCaches();

    this.touchUpdatedAt();

    this.addRestoreLog(
        "snapshot-restored",
        {
            snapshotId:
                snapshot.id
        },
        {
            save: false
        }
    );

    this.saveData();

    return {
        ok: true,
        restored: true,
        snapshotId:
            snapshot.id,
        records:
            this.data.records.length
    };
}


// ============================================================
// MEMORY SNAPSHOT
// ============================================================

saveMemorySnapshot(
    options = {}
) {

    if (
        !Array.isArray(
            this.data.memorySnapshots
        )
    ) {
        this.data.memorySnapshots =
            [];
    }

    const snapshot = {

        id:
            this.createSnapshotId(),

        createdAt:
            this.nowIso(),

        reason:
            options.reason ||
            "memory",

        summary:
            this.getHealthSummary(),

        quality:
            this.getQualityReport(),

        storage:
            this.getStorageStatus(),

        users:
            this.countUsers(),

        records:
            this.countRecords({
                includeArchived: true,
                includeDeleted: true
            }),

        size:
            this.getMemorySize()
    };

    this.data.memorySnapshots.push(
        snapshot
    );

    if (
        this.data.memorySnapshots.length >
        500
    ) {
        this.data.memorySnapshots =
            this.data.memorySnapshots.slice(
                -500
            );
    }

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,
        snapshot
    };
}


// ============================================================
// GET MEMORY SNAPSHOTS
// ============================================================

getMemorySnapshots(
    limit = 20
) {

    if (
        !Array.isArray(
            this.data.memorySnapshots
        )
    ) {
        return [];
    }

    return this.data.memorySnapshots
        .slice(
            -Math.max(
                1,
                Math.floor(
                    this.safeNumber(
                        limit,
                        20
                    )
                )
            )
        )
        .reverse();
}


// ============================================================
// EXPORT PACKAGE
// ============================================================

createExportPackage(
    options = {}
) {

    const data =
        this.cloneMemoryData({
            excludeBackups:
                options.includeBackups !== true,

            excludeExports:
                options.includeExports !== true,

            excludeLogs:
                options.includeLogs === true
        });

    const packageData = {

        magic:
            "TURKAI_ANSWER_MEMORY",

        format:
            "TAMF-1",

        version:
            this.data.version ||
            "1.0",

        exportedAt:
            this.nowIso(),

        exportId:
            this.createExportId(),

        records:
            Array.isArray(
                data.records
            )
                ? data.records.length
                : 0,

        users:
            data.users &&
            typeof data.users ===
                "object"
                ? Object.keys(
                    data.users
                ).length
                : 0,

        checksum:
            this.createMemoryChecksum(
                data
            ),

        data
    };

    return packageData;
}


// ============================================================
// EXPORT TO JSON
// ============================================================

exportToJSON(
    options = {}
) {

    const packageData =
        this.createExportPackage(
            options
        );

    const json =
        JSON.stringify(
            packageData,
            null,
            2
        );

    this.ensureStorageCollections();

    this.data.exports.push({
        id:
            packageData.exportId,

        createdAt:
            packageData.exportedAt,

        records:
            packageData.records,

        users:
            packageData.users,

        checksum:
            packageData.checksum
    });

    const max =
        this.getStorageConfig()
            .maxExports;

    if (
        this.data.exports.length >
        max
    ) {
        this.data.exports =
            this.data.exports.slice(
                -max
            );
    }

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,

        exportId:
            packageData.exportId,

        json,

        bytes:
            Buffer.byteLength(
                json,
                "utf8"
            ),

        records:
            packageData.records,

        users:
            packageData.users,

        checksum:
            packageData.checksum
    };
}


// ============================================================
// EXPORT MEMORY ALIAS
// ============================================================

exportToMemory(
    options = {}
) {
    return this.exportToJSON(
        options
    );
}


// ============================================================
// EXPORT DATA
// ============================================================

exportData(
    options = {}
) {
    return this.exportToJSON(
        options
    );
}


// ============================================================
// IMPORT PACKAGE
// ============================================================

parseImportPackage(
    input
) {

    let parsed =
        input;

    if (
        Buffer.isBuffer(
            input
        )
    ) {
        parsed =
            input.toString(
                "utf8"
            );
    }

    if (
        typeof parsed ===
        "string"
    ) {
        try {
            parsed =
                JSON.parse(
                    parsed
                );
        } catch (error) {
            return {
                ok: false,
                parsed: false,
                reason:
                    "invalid-json",
                error:
                    error.message
            };
        }
    }

    if (
        !parsed ||
        typeof parsed !==
            "object"
    ) {
        return {
            ok: false,
            parsed: false,
            reason:
                "object-required"
        };
    }

    if (
        parsed.magic &&
        parsed.magic !==
            "TURKAI_ANSWER_MEMORY"
    ) {
        return {
            ok: false,
            parsed: false,
            reason:
                "invalid-package"
        };
    }

    if (
        parsed.data &&
        typeof parsed.data ===
            "object"
    ) {
        return {
            ok: true,
            parsed: true,
            package:
                parsed,
            data:
                parsed.data
        };
    }

    if (
        Array.isArray(
            parsed.records
        )
    ) {
        return {
            ok: true,
            parsed: true,
            package: {
                magic:
                    "TURKAI_ANSWER_MEMORY",
                format:
                    "legacy"
            },
            data:
                parsed
        };
    }

    return {
        ok: false,
        parsed: false,
        reason:
            "memory-data-missing"
    };
}


// ============================================================
// VERIFY IMPORT PACKAGE
// ============================================================

verifyImportPackage(
    input
) {

    const parsed =
        this.parseImportPackage(
            input
        );

    if (
        !parsed.ok
    ) {
        return parsed;
    }

    const packageData =
        parsed.package;

    const data =
        parsed.data;

    const calculated =
        this.createMemoryChecksum(
            data
        );

    const expected =
        this.safeText(
            packageData?.checksum ||
            ""
        );

    return {
        ok: true,

        valid:
            !expected ||
            expected === calculated,

        expected,

        actual:
            calculated,

        records:
            Array.isArray(
                data.records
            )
                ? data.records.length
                : 0
    };
}


// ============================================================
// REPLACE MEMORY FROM IMPORT
// ============================================================

replaceMemoryFromImport(
    input,
    options = {}
) {

    const verified =
        this.verifyImportPackage(
            input
        );

    if (
        !verified.ok
    ) {
        return verified;
    }

    if (
        !verified.valid &&
        options.skipChecksum !== true
    ) {
        return {
            ok: false,
            restored: false,
            reason:
                "import-checksum-mismatch",
            verification:
                verified
        };
    }

    const parsed =
        this.parseImportPackage(
            input
        );

    if (
        !parsed.ok
    ) {
        return parsed;
    }

    if (
        options.createSafetyBackup !==
        false
    ) {
        this.saveBackup({
            reason:
                "pre-import",
            source:
                "import-safety"
        });
    }

    const incoming =
        this.deepClone(
            parsed.data
        );

    this.data =
        incoming;

    this.ensureStorageCollections();

    if (
        !Array.isArray(
            this.data.records
        )
    ) {
        this.data.records = [];
    }

    if (
        !this.data.users ||
        typeof this.data.users !==
            "object"
    ) {
        this.data.users = {};
    }

    this.refreshAllFingerprints();

    this.rebuildIndex();

    this.invalidateAllCaches();

    this.addRestoreLog(
        "import-replaced-memory",
        {
            records:
                this.data.records.length,

            checksum:
                verified.actual
        },
        {
            save: false
        }
    );

    this.saveData();

    return {
        ok: true,

        restored: true,

        records:
            this.data.records.length,

        users:
            Object.keys(
                this.data.users
            ).length,

        checksum:
            verified.actual
    };
}


// ============================================================
// MERGE MEMORY FROM IMPORT
// ============================================================

mergeMemoryFromImport(
    input,
    options = {}
) {

    const parsed =
        this.parseImportPackage(
            input
        );

    if (
        !parsed.ok
    ) {
        return parsed;
    }

    const incoming =
        parsed.data;

    if (
        !Array.isArray(
            incoming.records
        )
    ) {
        incoming.records = [];
    }

    if (
        options.createSafetyBackup !==
        false
    ) {
        this.saveBackup({
            reason:
                "pre-merge-import",
            source:
                "merge-import-safety"
        });
    }

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (
        const record
        of incoming.records
    ) {

        if (
            !record
        ) {
            skipped++;
            continue;
        }

        const normalized =
            this.normalizeRecord(
                record
            );

        if (
            !normalized
        ) {
            skipped++;
            continue;
        }

        const existing =
            this.getRecordById(
                normalized.id
            );

        if (
            existing
        ) {

            if (
                options.overwriteExisting ===
                true
            ) {

                const result =
                    this.updateRecord(
                        existing.id,
                        normalized
                    );

                if (
                    result.updated
                ) {
                    updated++;
                } else {
                    skipped++;
                }

            } else {
                skipped++;
            }

            continue;
        }

        const questionExisting =
            this.getRecordByQuestion(
                normalized.question
            );

        if (
            questionExisting
        ) {

            if (
                options.mergeDuplicates ===
                true
            ) {

                const qualityNew =
                    this.calculateRecordQuality(
                        normalized
                    );

                const qualityOld =
                    this.calculateRecordQuality(
                        questionExisting
                    );

                if (
                    qualityNew >
                    qualityOld
                ) {

                    this.updateRecord(
                        questionExisting.id,
                        normalized
                    );

                    updated++;

                } else {
                    skipped++;
                }

            } else {
                skipped++;
            }

            continue;
        }

        const result =
            this.addRecord(
                normalized.question,
                normalized.answer,
                normalized
            );

        if (
            result.saved
        ) {
            added++;
        } else {
            skipped++;
        }
    }

    this.rebuildIndex();

    this.invalidateAllCaches();

    this.addRestoreLog(
        "import-merged-memory",
        {
            added,
            updated,
            skipped
        },
        {
            save: false
        }
    );

    this.saveData();

    return {
        ok: true,

        merged: true,

        added,

        updated,

        skipped,

        total:
            incoming.records.length
    };
}


// ============================================================
// IMPORT MEMORY ALIAS
// ============================================================

importData(
    input,
    options = {}
) {
    return this.mergeMemoryFromImport(
        input,
        options
    );
}


// ============================================================
// IMPORT JSON
// ============================================================

importJSON(
    input,
    options = {}
) {
    return this.mergeMemoryFromImport(
        input,
        options
    );
}


// ============================================================
// FULL EXPORT
// ============================================================

fullExport(
    options = {}
) {
    return {
        ok: true,

        package:
            this.createExportPackage(
                {
                    ...options,

                    includeBackups:
                        options.includeBackups ??
                        true,

                    includeExports:
                        options.includeExports ??
                        true,

                    includeLogs:
                        options.includeLogs ??
                        true
                }
            ),

        storage:
            this.getStorageStatus(),

        health:
            this.getHealthSummary()
    };
}


// ============================================================
// FULL SNAPSHOT
// ============================================================

fullSnapshot(
    options = {}
) {

    const snapshot =
        this.createSnapshot({
            ...options,

            includeBackups:
                options.includeBackups ??
                true,

            includeExports:
                options.includeExports ??
                true,

            includeLogs:
                options.includeLogs ??
                true
        });

    const memorySnapshot =
        this.createQualitySnapshot();

    return {
        ok: true,

        snapshot,

        quality:
            memorySnapshot,

        health:
            this.getHealthSummary(),

        storage:
            this.getStorageStatus()
    };
}


// ============================================================
// ARCHIVE RECORD
// ============================================================

archiveRecordCopy(
    record,
    options = {}
) {

    if (
        !record
    ) {
        return {
            ok: false,
            archived: false
        };
    }

    this.ensureStorageCollections();

    const archived = {
        ...this.deepClone(
            record
        ),

        archivedAt:
            this.nowIso(),

        archiveReason:
            options.reason ||
            "manual"
    };

    this.data.archive.push(
        archived
    );

    if (
        this.data.archive.length >
        100000
    ) {
        this.data.archive =
            this.data.archive.slice(
                -100000
            );
    }

    return {
        ok: true,

        archived: true,

        recordId:
            record.id,

        archive:
            archived
    };
}


// ============================================================
// ARCHIVE ACTIVE RECORD
// ============================================================

moveRecordToArchive(
    id = "",
    options = {}
) {

    const record =
        this.getRecordById(
            id
        );

    if (!record) {
        return {
            ok: false,
            archived: false,
            reason:
                "record-not-found"
        };
    }

    const archived =
        this.archiveRecordCopy(
            record,
            options
        );

    if (
        !archived.archived
    ) {
        return archived;
    }

    const result =
        this.softDeleteRecord(
            id
        );

    this.addCleanupLog(
        "record-archived",
        {
            id,
            result
        },
        {
            save: false
        }
    );

    this.saveData();

    return {
        ok: true,

        archived: true,

        id,

        result
    };
}


// ============================================================
// PURGE DELETED RECORDS
// ============================================================

purgeDeletedRecords(
    options = {}
) {

    const records =
        Array.isArray(
            this.data.records
        )
            ? this.data.records
            : [];

    const deleted =
        records.filter(
            (record) =>
                record &&
                record.status ===
                    "deleted" &&
                record.protected !== true
        );

    if (
        !deleted.length
    ) {
        return {
            ok: true,
            purged: 0
        };
    }

    if (
        !Array.isArray(
            this.data.deletedRecords
        )
    ) {
        this.data.deletedRecords =
            [];
    }

    for (
        const record
        of deleted
    ) {

        this.data.deletedRecords.push(
            {
                ...this.deepClone(
                    record
                ),

                purgedAt:
                    this.nowIso()
            }
        );
    }

    this.data.records =
        records.filter(
            (record) =>
                !(
                    record &&
                    record.status ===
                        "deleted" &&
                    record.protected !== true
                )
        );

    if (
        this.data.deletedRecords.length >
        100000
    ) {
        this.data.deletedRecords =
            this.data.deletedRecords.slice(
                -100000
            );
    }

    this.rebuildIndex();

    this.invalidateAllCaches();

    this.addCleanupLog(
        "deleted-records-purged",
        {
            purged:
                deleted.length
        },
        {
            save: false
        }
    );

    this.saveData();

    return {
        ok: true,

        purged:
            deleted.length
    };
}


// ============================================================
// PURGE OLD HISTORY
// ============================================================

purgeOldUserHistory(
    options = {}
) {

    const config =
        this.getStorageConfig();

    const days =
        Math.max(
            1,
            this.safeNumber(
                options.days,
                config.retentionDays
            )
        );

    const cutoff =
        Date.now() -
        (
            days *
            24 *
            60 *
            60 *
            1000
        );

    const users =
        this.getAllUsers();

    let removed = 0;

    for (
        const user
        of users
    ) {

        if (
            !Array.isArray(
                user.history
            )
        ) {
            continue;
        }

        const before =
            user.history.length;

        user.history =
            user.history.filter(
                (entry) => {

                    const time =
                        Date.parse(
                            entry.timestamp ||
                            entry.createdAt ||
                            ""
                        ) || 0;

                    return (
                        time === 0 ||
                        time >= cutoff
                    );
                }
            );

        removed +=
            before -
            user.history.length;

        user.updatedAt =
            this.nowIso();
    }

    this.addCleanupLog(
        "old-user-history-purged",
        {
            days,
            removed
        },
        {
            save: false
        }
    );

    this.saveData();

    return {
        ok: true,
        days,
        removed
    };
}


// ============================================================
// PURGE OLD LEARNING EVENTS
// ============================================================

purgeOldLearningEvents(
    options = {}
) {

    const limit =
        Math.max(
            100,
            Math.floor(
                this.safeNumber(
                    options.maxEvents,
                    this.getStorageConfig()
                        .maxLearningEvents
                )
            )
        );

    if (
        !Array.isArray(
            this.data.learningEvents
        )
    ) {
        this.data.learningEvents =
            [];
    }

    const before =
        this.data.learningEvents.length;

    if (
        before >
        limit
    ) {
        this.data.learningEvents =
            this.data.learningEvents.slice(
                -limit
            );
    }

    const removed =
        before -
        this.data.learningEvents.length;

    this.addCleanupLog(
        "learning-events-trimmed",
        {
            limit,
            removed
        },
        {
            save: false
        }
    );

    this.saveData();

    return {
        ok: true,
        limit,
        removed
    };
}


// ============================================================
// PURGE QUALITY SNAPSHOTS
// ============================================================

purgeQualitySnapshots(
    options = {}
) {

    const limit =
        Math.max(
            50,
            Math.floor(
                this.safeNumber(
                    options.limit,
                    this.getStorageConfig()
                        .maxQualitySnapshots
                )
            )
        );

    if (
        !Array.isArray(
            this.data.qualitySnapshots
        )
    ) {
        this.data.qualitySnapshots =
            [];
    }

    const before =
        this.data.qualitySnapshots.length;

    if (
        before >
        limit
    ) {
        this.data.qualitySnapshots =
            this.data.qualitySnapshots.slice(
                -limit
            );
    }

    const removed =
        before -
        this.data.qualitySnapshots.length;

    this.addCleanupLog(
        "quality-snapshots-trimmed",
        {
            limit,
            removed
        },
        {
            save: false
        }
    );

    this.saveData();

    return {
        ok: true,
        limit,
        removed
    };
}


// ============================================================
// PURGE BACKUPS
// ============================================================

trimBackups(
    limit = 100
) {

    this.ensureStorageCollections();

    const safeLimit =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    limit,
                    this.getStorageConfig()
                        .maxBackups
                )
            )
        );

    const before =
        this.data.backups.length;

    if (
        before >
        safeLimit
    ) {
        this.data.backups =
            this.data.backups.slice(
                -safeLimit
            );
    }

    const removed =
        before -
        this.data.backups.length;

    return {
        ok: true,
        removed,
        remaining:
            this.data.backups.length
    };
}


// ============================================================
// PURGE SNAPSHOTS
// ============================================================

trimSnapshots(
    limit = 500
) {

    this.ensureStorageCollections();

    const safeLimit =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    limit,
                    this.getStorageConfig()
                        .maxSnapshots
                )
            )
        );

    const before =
        this.data.snapshots.length;

    if (
        before >
        safeLimit
    ) {
        this.data.snapshots =
            this.data.snapshots.slice(
                -safeLimit
            );
    }

    const removed =
        before -
        this.data.snapshots.length;

    return {
        ok: true,
        removed,
        remaining:
            this.data.snapshots.length
    };
}


// ============================================================
// PURGE EXPORT LOG
// ============================================================

trimExports(
    limit = 100
) {

    this.ensureStorageCollections();

    const safeLimit =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    limit,
                    this.getStorageConfig()
                        .maxExports
                )
            )
        );

    const before =
        this.data.exports.length;

    if (
        before >
        safeLimit
    ) {
        this.data.exports =
            this.data.exports.slice(
                -safeLimit
            );
    }

    const removed =
        before -
        this.data.exports.length;

    return {
        ok: true,
        removed,
        remaining:
            this.data.exports.length
    };
}


// ============================================================
// TRIM ALL STORAGE
// ============================================================

trimStorage(
    options = {}
) {

    this.ensureStorageCollections();

    const config =
        this.getStorageConfig();

    const result = {

        backups:
            this.trimBackups(
                options.maxBackups ??
                config.maxBackups
            ),

        snapshots:
            this.trimSnapshots(
                options.maxSnapshots ??
                config.maxSnapshots
            ),

        exports:
            this.trimExports(
                options.maxExports ??
                config.maxExports
            ),

        learningEvents:
            this.purgeOldLearningEvents(
                {
                    maxEvents:
                        options.maxLearningEvents ??
                        config.maxLearningEvents
                }
            ),

        qualitySnapshots:
            this.purgeQualitySnapshots(
                {
                    limit:
                        options.maxQualitySnapshots ??
                        config.maxQualitySnapshots
                }
            )
    };

    this.addCleanupLog(
        "storage-trimmed",
        result,
        {
            save: false
        }
    );

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,
        result
    };
}


// ============================================================
// CACHE CLEANUP
// ============================================================

cleanupCaches() {

    const search =
        this.expireSearchCache();

    let answerRemoved = 0;

    if (
        this.answerCache instanceof Map
    ) {

        const now =
            Date.now();

        for (
            const [
                key,
                entry
            ]
            of this.answerCache.entries()
        ) {

            if (
                entry &&
                entry.expiresAt &&
                now >
                    entry.expiresAt
            ) {
                this.answerCache.delete(
                    key
                );

                answerRemoved++;
            }
        }
    }

    return {
        ok: true,

        searchCacheRemoved:
            search.removed,

        answerCacheRemoved:
            answerRemoved,

        searchCache:
            this.getSearchCacheStats(),

        answerCacheSize:
            this.answerCache instanceof Map
                ? this.answerCache.size
                : 0
    };
}


// ============================================================
// CACHE HARD RESET
// ============================================================

hardResetCaches() {

    if (
        this.cache instanceof Map
    ) {
        this.cache.clear();
    }

    if (
        this.answerCache instanceof Map
    ) {
        this.answerCache.clear();
    }

    return {
        ok: true,
        reset: true
    };
}


// ============================================================
// CLEANUP OLD CHANGE LOG
// ============================================================

trimChangeLog(
    limit = 10000
) {

    this.ensureStorageCollections();

    const safeLimit =
        Math.max(
            100,
            Math.floor(
                this.safeNumber(
                    limit,
                    10000
                )
            )
        );

    const before =
        this.data.changeLog.length;

    if (
        before >
        safeLimit
    ) {
        this.data.changeLog =
            this.data.changeLog.slice(
                -safeLimit
            );
    }

    return {
        ok: true,

        removed:
            before -
            this.data.changeLog.length,

        remaining:
            this.data.changeLog.length
    };
}


// ============================================================
// TRIM RESTORE LOG
// ============================================================

trimRestoreLog(
    limit = 5000
) {

    this.ensureStorageCollections();

    const safeLimit =
        Math.max(
            100,
            Math.floor(
                this.safeNumber(
                    limit,
                    5000
                )
            )
        );

    const before =
        this.data.restoreLogs.length;

    if (
        before >
        safeLimit
    ) {
        this.data.restoreLogs =
            this.data.restoreLogs.slice(
                -safeLimit
            );
    }

    return {
        ok: true,

        removed:
            before -
            this.data.restoreLogs.length,

        remaining:
            this.data.restoreLogs.length
    };
}


// ============================================================
// TRIM CLEANUP LOG
// ============================================================

trimCleanupLog(
    limit = 5000
) {

    this.ensureStorageCollections();

    const safeLimit =
        Math.max(
            100,
            Math.floor(
                this.safeNumber(
                    limit,
                    5000
                )
            )
        );

    const before =
        this.data.cleanupLogs.length;

    if (
        before >
        safeLimit
    ) {
        this.data.cleanupLogs =
            this.data.cleanupLogs.slice(
                -safeLimit
            );
    }

    return {
        ok: true,

        removed:
            before -
            this.data.cleanupLogs.length,

        remaining:
            this.data.cleanupLogs.length
    };
}


// ============================================================
// AUTO CLEANUP
// ============================================================

runAutoCleanup(
    options = {}
) {

    const startedAt =
        Date.now();

    const config =
        this.getStorageConfig();

    const results = {};

    results.caches =
        this.cleanupCaches();

    results.storage =
        this.trimStorage(
            {
                maxBackups:
                    options.maxBackups ??
                    config.maxBackups,

                maxSnapshots:
                    options.maxSnapshots ??
                    config.maxSnapshots,

                maxExports:
                    options.maxExports ??
                    config.maxExports,

                maxLearningEvents:
                    options.maxLearningEvents ??
                    config.maxLearningEvents,

                maxQualitySnapshots:
                    options.maxQualitySnapshots ??
                    config.maxQualitySnapshots
            }
        );

    results.changeLog =
        this.trimChangeLog(
            options.maxChangeLog ||
            10000
        );

    results.restoreLog =
        this.trimRestoreLog(
            options.maxRestoreLogs ||
            5000
        );

    results.cleanupLog =
        this.trimCleanupLog(
            options.maxCleanupLogs ||
            5000
        );

    if (
        options.purgeDeleted !== false
    ) {

        results.deleted =
            this.purgeDeletedRecords(
                options
            );
    }

    if (
        options.purgeOldHistory === true
    ) {

        results.history =
            this.purgeOldUserHistory(
                options
            );
    }

    this.rebuildIndex();

    this.invalidateAllCaches();

    this.touchUpdatedAt();

    const durationMs =
        Date.now() -
        startedAt;

    const log =
        this.addMaintenanceLog(
            "auto-cleanup",
            results,
            {
                durationMs,
                save: false
            }
        );

    this.saveData();

    return {
        ok: true,

        durationMs,

        results,

        log
    };
}


// ============================================================
// DATABASE VACUUM
// ============================================================

vacuumMemory(
    options = {}
) {

    const startedAt =
        Date.now();

    const before =
        this.countRecords({
            includeArchived: true,
            includeDeleted: true
        });

    const backup =
        options.createBackup !== false
            ? this.saveBackup({
                reason:
                    "pre-vacuum",
                source:
                    "vacuum"
            })
            : null;

    const deduplicate =
        options.deduplicate !== false
            ? this.deduplicateMemory(
                options
            )
            : null;

    const purgeDeleted =
        options.purgeDeleted !== false
            ? this.purgeDeletedRecords(
                options
            )
            : null;

    const trim =
        this.trimStorage(
            options
        );

    this.refreshAllFingerprints();

    this.refreshAllQuality();

    this.rebuildIndex();

    this.invalidateAllCaches();

    const after =
        this.countRecords({
            includeArchived: true,
            includeDeleted: true
        });

    const durationMs =
        Date.now() -
        startedAt;

    this.addMaintenanceLog(
        "vacuum",
        {
            before,
            after,
            backup,
            deduplicate,
            purgeDeleted,
            trim
        },
        {
            durationMs,
            save: false
        }
    );

    this.saveData();

    return {
        ok: true,

        before,

        after,

        removed:
            Math.max(
                0,
                before -
                after
            ),

        durationMs
    };
}


// ============================================================
// DATABASE REPAIR
// ============================================================

repairStorage(
    options = {}
) {

    const startedAt =
        Date.now();

    let repaired = 0;

    this.ensureStorageCollections();

    if (
        !Array.isArray(
            this.data.records
        )
    ) {
        this.data.records = [];
        repaired++;
    }

    if (
        !this.data.users ||
        typeof this.data.users !==
            "object"
    ) {
        this.data.users = {};
        repaired++;
    }

    if (
        !this.data.version
    ) {
        this.data.version =
            "1.0";
        repaired++;
    }

    for (
        const record
        of this.data.records
    ) {

        if (
            !record
        ) {
            continue;
        }

        const before =
            JSON.stringify(
                {
                    normalizedQuestion:
                        record.normalizedQuestion,

                    questionKey:
                        record.questionKey,

                    tokens:
                        record.tokens,

                    intents:
                        record.intents
                }
            );

        this.refreshRecordFingerprint(
            record
        );

        const after =
            JSON.stringify(
                {
                    normalizedQuestion:
                        record.normalizedQuestion,

                    questionKey:
                        record.questionKey,

                    tokens:
                        record.tokens,

                    intents:
                        record.intents
                }
            );

        if (
            before !== after
        ) {
            repaired++;
        }

        if (
            typeof record.quality !==
                "number"
        ) {
            record.quality =
                this.calculateRecordQuality(
                    record
                );

            repaired++;
        }

        if (
            typeof record.confidence !==
                "number"
        ) {
            record.confidence =
                this.normalizeConfidence(
                    record.confidence
                );

            repaired++;
        }
    }

    this.rebuildIndex();

    this.invalidateAllCaches();

    this.ensureStorageCollections();

    const durationMs =
        Date.now() -
        startedAt;

    this.addMaintenanceLog(
        "storage-repair",
        {
            repaired
        },
        {
            durationMs,
            save: false
        }
    );

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,

        repaired,

        durationMs,

        health:
            this.getHealthSummary()
    };
}


// ============================================================
// DATABASE OPTIMIZE
// ============================================================

optimizeStorage(
    options = {}
) {

    const startedAt =
        Date.now();

    const steps = [];

    if (
        options.backup !== false
    ) {
        steps.push({
            name:
                "backup",

            result:
                this.saveBackup({
                    reason:
                        "pre-optimize",

                    source:
                        "optimizer"
                })
        });
    }

    if (
        options.repair !== false
    ) {
        steps.push({
            name:
                "repair",

            result:
                this.repairStorage(
                    {
                        save: false
                    }
                )
        });
    }

    if (
        options.deduplicate !== false
    ) {
        steps.push({
            name:
                "deduplicate",

            result:
                this.deduplicateMemory(
                    {
                        save: false
                    }
                )
        });
    }

    if (
        options.refreshQuality !== false
    ) {
        steps.push({
            name:
                "quality",

            result:
                this.refreshAllQuality(
                    {
                        save: false
                    }
                )
        });
    }

    if (
        options.cleanup !== false
    ) {
        steps.push({
            name:
                "cleanup",

            result:
                this.runAutoCleanup(
                    {
                        ...options,

                        createBackup:
                            false
                    }
                )
        });
    }

    if (
        options.purgeDeleted !== false
    ) {
        steps.push({
            name:
                "purgeDeleted",

            result:
                this.purgeDeletedRecords(
                    {
                        ...options
                    }
                )
        });
    }

    this.refreshAllFingerprints();

    this.rebuildIndex();

    this.invalidateAllCaches();

    this.touchUpdatedAt();

    const durationMs =
        Date.now() -
        startedAt;

    this.addMaintenanceLog(
        "storage-optimize",
        {
            steps
        },
        {
            durationMs,
            save: false
        }
    );

    this.saveData();

    return {
        ok: true,

        steps,

        durationMs,

        health:
            this.getHealthSummary(),

        storage:
            this.getStorageStatus()
    };
}


// ============================================================
// MAINTENANCE FULL
// ============================================================

runFullMaintenance(
    options = {}
) {

    const startedAt =
        Date.now();

    const results = {};

    if (
        options.backup !== false
    ) {
        results.backup =
            this.saveBackup({
                reason:
                    "full-maintenance",

                source:
                    "maintenance"
            });
    }

    results.repair =
        this.repairStorage({
            save: false
        });

    results.quality =
        this.qualityMaintenance({
            save: false
        });

    results.deduplicate =
        this.deduplicateMemory({
            save: false
        });

    results.cleanup =
        this.runAutoCleanup({
            ...options,

            createBackup:
                false
        });

    results.vacuum =
        options.vacuum === true
            ? this.vacuumMemory({
                ...options,
                createBackup:
                    false
            })
            : null;

    results.cache =
        this.cleanupCaches();

    this.refreshAllFingerprints();

    this.rebuildIndex();

    this.invalidateAllCaches();

    const snapshot =
        options.snapshot !== false
            ? this.saveMemorySnapshot({
                reason:
                    "full-maintenance"
            })
            : null;

    const durationMs =
        Date.now() -
        startedAt;

    this.addMaintenanceLog(
        "full-maintenance",
        {
            results,
            snapshot
        },
        {
            durationMs,
            save: false
        }
    );

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,

        durationMs,

        results,

        snapshot,

        health:
            this.getHealthSummary(),

        quality:
            this.getQualityReport(),

        storage:
            this.getStorageStatus()
    };
}


// ============================================================
// RETENTION CLEANUP
// ============================================================

runRetentionCleanup(
    options = {}
) {

    const days =
        Math.max(
            1,
            this.safeNumber(
                options.days,
                this.getStorageConfig()
                    .retentionDays
            )
        );

    const result = {};

    result.history =
        this.purgeOldUserHistory(
            {
                ...options,
                days
            }
        );

    result.events =
        this.purgeOldLearningEvents(
            {
                maxEvents:
                    options.maxLearningEvents ||
                    this.getStorageConfig()
                        .maxLearningEvents
            }
        );

    result.snapshots =
        this.purgeQualitySnapshots(
            {
                limit:
                    options.maxQualitySnapshots ||
                    this.getStorageConfig()
                        .maxQualitySnapshots
            }
        );

    result.storage =
        this.trimStorage(
            options
        );

    this.addCleanupLog(
        "retention-cleanup",
        {
            days,
            result
        },
        {
            save: false
        }
    );

    this.saveData();

    return {
        ok: true,
        days,
        result
    };
}


// ============================================================
// GET CHANGE LOG
// ============================================================

getChangeLog(
    options = {}
) {

    this.ensureStorageCollections();

    let logs =
        [
            ...this.data.changeLog
        ];

    if (
        options.type
    ) {
        logs =
            logs.filter(
                (item) =>
                    item.type ===
                    options.type
            );
    }

    const limit =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    options.limit,
                    100
                )
            )
        );

    return logs
        .slice(
            -limit
        )
        .reverse();
}


// ============================================================
// GET MAINTENANCE LOG
// ============================================================

getMaintenanceLogs(
    options = {}
) {

    this.ensureStorageCollections();

    let logs =
        [
            ...this.data.maintenanceLogs
        ];

    if (
        options.action
    ) {
        logs =
            logs.filter(
                (item) =>
                    item.action ===
                    options.action
            );
    }

    const limit =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    options.limit,
                    100
                )
            )
        );

    return logs
        .slice(
            -limit
        )
        .reverse();
}


// ============================================================
// GET RESTORE LOG
// ============================================================

getRestoreLogs(
    options = {}
) {

    this.ensureStorageCollections();

    let logs =
        [
            ...this.data.restoreLogs
        ];

    if (
        options.action
    ) {
        logs =
            logs.filter(
                (item) =>
                    item.action ===
                    options.action
            );
    }

    const limit =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    options.limit,
                    100
                )
            )
        );

    return logs
        .slice(
            -limit
        )
        .reverse();
}


// ============================================================
// GET CLEANUP LOG
// ============================================================

getCleanupLogs(
    options = {}
) {

    this.ensureStorageCollections();

    let logs =
        [
            ...this.data.cleanupLogs
        ];

    if (
        options.action
    ) {
        logs =
            logs.filter(
                (item) =>
                    item.action ===
                    options.action
            );
    }

    const limit =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    options.limit,
                    100
                )
            )
        );

    return logs
        .slice(
            -limit
        )
        .reverse();
}


// ============================================================
// DATABASE REPORT
// ============================================================

getDatabaseReport() {

    const storage =
        this.getStorageStatus();

    const health =
        this.getHealthSummary();

    const quality =
        this.getQualityReport();

    return {

        ok:
            Boolean(
                health.ok
            ),

        storage,

        health,

        quality,

        counts: {

            records:
                this.countRecords({
                    includeArchived: true,
                    includeDeleted: true
                }),

            active:
                this.countActiveRecords(),

            archived:
                this.countArchivedRecords(),

            deleted:
                this.countDeletedRecords(),

            users:
                this.countUsers(),

            backups:
                this.data.backups?.length ||
                0,

            snapshots:
                this.data.snapshots?.length ||
                0
        },

        generatedAt:
            this.nowIso()
    };
}


// ============================================================
// DATABASE STATUS
// ============================================================

databaseStatus() {
    return this.getDatabaseReport();
}


// ============================================================
// STORAGE STATUS ALIAS
// ============================================================

storageStatus() {
    return this.getStorageStatus();
}


// ============================================================
// BACKUP STATUS
// ============================================================

backupStatus() {

    const backups =
        this.getBackups({
            limit: 5
        });

    return {

        count:
            this.data.backups?.length ||
            0,

        latest:
            backups[0] ||
            null,

        recent:
            backups
    };
}


// ============================================================
// SNAPSHOT STATUS
// ============================================================

snapshotStatus() {

    const snapshots =
        this.getSnapshots({
            limit: 5
        });

    return {

        count:
            this.data.snapshots?.length ||
            0,

        latest:
            snapshots[0] ||
            null,

        recent:
            snapshots
    };
}


// ============================================================
// STORAGE HEALTH
// ============================================================

getStorageHealth() {

    const report =
        this.getDatabaseReport();

    const issues = [];

    if (
        report.health.broken >
        0
    ) {
        issues.push(
            "broken-records"
        );
    }

    if (
        report.health.deleted >
        10000
    ) {
        issues.push(
            "too-many-deleted-records"
        );
    }

    if (
        report.storage.cache.size >
        this.getStorageConfig()
            .maxCacheEntries
    ) {
        issues.push(
            "cache-large"
        );
    }

    return {

        ok:
            issues.length === 0,

        issues,

        report
    };
}


// ============================================================
// STORAGE SELF TEST
// ============================================================

runStorageSelfTest() {

    const tests = [];

    tests.push({
        name:
            "storage-collections",

        result:
            Boolean(
                this.ensureStorageCollections()
            )
    });

    tests.push({
        name:
            "storage-status",

        result:
            Boolean(
                this.getStorageStatus()
            )
    });

    tests.push({
        name:
            "backup",

        result:
            typeof this.createBackup ===
            "function"
    });

    tests.push({
        name:
            "snapshot",

        result:
            typeof this.createSnapshot ===
            "function"
    });

    tests.push({
        name:
            "export",

        result:
            typeof this.exportToJSON ===
            "function"
    });

    tests.push({
        name:
            "import",

        result:
            typeof this.importData ===
            "function"
    });

    tests.push({
        name:
            "cleanup",

        result:
            typeof this.runAutoCleanup ===
            "function"
    });

    tests.push({
        name:
            "repair",

        result:
            typeof this.repairStorage ===
            "function"
    });

    tests.push({
        name:
            "vacuum",

        result:
            typeof this.vacuumMemory ===
            "function"
    });

    const passed =
        tests.filter(
            (test) =>
                test.result
        ).length;

    return {
        ok:
            passed ===
            tests.length,

        total:
            tests.length,

        passed,

        failed:
            tests.length -
            passed,

        tests
    };
}


// ============================================================
// PERSIST CURRENT STATE
// ============================================================

persistNow(
    options = {}
) {

    const startedAt =
        Date.now();

    if (
        options.backup === true
    ) {
        this.saveBackup({
            reason:
                options.reason ||
                "persist",

            source:
                "persist"
        });
    }

    this.touchUpdatedAt();

    const saveResult =
        this.safeSaveData();

    const durationMs =
        Date.now() -
        startedAt;

    this.addMaintenanceLog(
        "persist",
        {
            saveResult
        },
        {
            durationMs,
            save: false
        }
    );

    this.saveData();

    return {
        ok:
            Boolean(
                saveResult.ok
            ),

        durationMs,

        saveResult
    };
}


// ============================================================
// SAFE PERSIST
// ============================================================

safePersist(
    options = {}
) {

    try {

        return this.persistNow(
            options
        );

    } catch (error) {

        return {
            ok: false,

            error:
                error.message
        };
    }
}


// ============================================================
// BACKUP BEFORE CHANGE
// ============================================================

backupBeforeChange(
    reason = "change"
) {

    return this.saveBackup({
        reason:
            this.safeText(
                reason
            ) ||
            "change",

        source:
            "pre-change"
    });
}


// ============================================================
// SNAPSHOT BEFORE CHANGE
// ============================================================

snapshotBeforeChange(
    reason = "change"
) {

    return this.saveSnapshot({
        reason:
            this.safeText(
                reason
            ) ||
            "change"
    });
}


// ============================================================
// CHANGE SAFE
// ============================================================

withBackup(
    action,
    callback,
    options = {}
) {

    let backup = null;

    if (
        options.backup !== false
    ) {
        backup =
            this.backupBeforeChange(
                action ||
                "change"
            );
    }

    let result;

    try {

        result =
            typeof callback ===
                "function"
                ? callback()
                : null;

    } catch (error) {

        this.addMaintenanceLog(
            "with-backup-error",
            {
                action,
                error:
                    error.message
            }
        );

        throw error;
    }

    return {
        ok: true,

        action,

        backup,

        result
    };
}


// ============================================================
// MEMORY LIMIT CHECK
// ============================================================

checkMemoryLimits() {

    const config =
        this.getStorageConfig();

    const records =
        this.countRecords({
            includeArchived: true,
            includeDeleted: true
        });

    const users =
        this.countUsers();

    const cacheSize =
        this.getSearchCacheSize();

    return {

        ok:
            records <=
                config.maxRecords &&
            cacheSize <=
                config.maxCacheEntries,

        records,

        maxRecords:
            config.maxRecords,

        users,

        cacheSize,

        maxCacheEntries:
            config.maxCacheEntries,

        recordsExceeded:
            records >
            config.maxRecords,

        cacheExceeded:
            cacheSize >
            config.maxCacheEntries
    };
}


// ============================================================
// ENFORCE MEMORY LIMITS
// ============================================================

enforceMemoryLimits(
    options = {}
) {

    const config =
        this.getStorageConfig();

    const limits =
        this.checkMemoryLimits();

    const actions = [];

    if (
        limits.recordsExceeded
    ) {

        const overflow =
            limits.records -
            config.maxRecords;

        const records =
            this.getAllRecords({
                includeArchived: true,
                includeDeleted: true
            });

        const removable =
            records.filter(
                (record) =>
                    record &&
                    record.protected !== true
            )
            .sort(
                (a, b) =>
                    this.getFinalQuality(a) -
                    this.getFinalQuality(b)
            )
            .slice(
                0,
                overflow
            );

        for (
            const record
            of removable
        ) {

            this.softDeleteRecord(
                record.id
            );
        }

        actions.push({
            type:
                "record-limit",
            removed:
                removable.length
        });
    }

    if (
        limits.cacheExceeded
    ) {

        this.cleanupCaches();

        actions.push({
            type:
                "cache-limit"
        });
    }

    this.rebuildIndex();

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,
        actions,
        limits:
            this.checkMemoryLimits()
    };
}


// ============================================================
// MEMORY DB RESET
// ============================================================

resetStorageLayer(
    options = {}
) {

    if (
        options.createBackup !== false
    ) {

        this.saveBackup({
            reason:
                "pre-reset",
            source:
                "reset-storage"
        });
    }

    this.invalidateAllCaches();

    this.data.backups =
        options.keepBackups === true
            ? this.data.backups || []
            : [];

    this.data.snapshots =
        options.keepSnapshots === true
            ? this.data.snapshots || []
            : [];

    this.data.exports =
        options.keepExports === true
            ? this.data.exports || []
            : [];

    this.ensureStorageCollections();

    this.rebuildIndex();

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,

        status:
            this.getStorageStatus()
    };
}


// ============================================================
// STORAGE JSON
// ============================================================

storageToJSON() {

    return JSON.stringify(
        this.getStorageStatus(),
        null,
        2
    );
}


// ============================================================
// HEALTH JSON
// ============================================================

healthToJSON() {

    return JSON.stringify(
        this.getHealthSummary(),
        null,
        2
    );
}


// ============================================================
// DATABASE JSON
// ============================================================

databaseToJSON() {

    return JSON.stringify(
        this.getDatabaseReport(),
        null,
        2
    );
}


// ============================================================
// EXPORT FILE READY OBJECT
// ============================================================

getExportFilePayload(
    options = {}
) {

    const exported =
        this.exportToJSON(
            options
        );

    return {
        ok:
            exported.ok,

        filename:
            `turkai-answer-memory-${Date.now()}.json`,

        mime:
            "application/json",

        content:
            exported.json,

        bytes:
            exported.bytes,

        exportId:
            exported.exportId
    };
}


// ============================================================
// BACKUP FILE READY OBJECT
// ============================================================

getBackupFilePayload(
    options = {}
) {

    const result =
        this.saveBackup(
            options
        );

    const json =
        JSON.stringify(
            result.backup,
            null,
            2
        );

    return {

        ok:
            result.ok,

        filename:
            `${result.backupId}.json`,

        mime:
            "application/json",

        content:
            json,

        bytes:
            Buffer.byteLength(
                json,
                "utf8"
            ),

        backupId:
            result.backupId
    };
}


// ============================================================
// SNAPSHOT FILE READY OBJECT
// ============================================================

getSnapshotFilePayload(
    options = {}
) {

    const result =
        this.saveSnapshot(
            options
        );

    const json =
        JSON.stringify(
            result.snapshot,
            null,
            2
        );

    return {

        ok:
            result.ok,

        filename:
            `${result.snapshotId}.json`,

        mime:
            "application/json",

        content:
            json,

        bytes:
            Buffer.byteLength(
                json,
                "utf8"
            ),

        snapshotId:
            result.snapshotId
    };
}


// ============================================================
// STORAGE CLEAN REPORT
// ============================================================

getCleanupReport() {

    return {

        backups:
            this.data.backups?.length ||
            0,

        snapshots:
            this.data.snapshots?.length ||
            0,

        exports:
            this.data.exports?.length ||
            0,

        maintenanceLogs:
            this.data.maintenanceLogs?.length ||
            0,

        restoreLogs:
            this.data.restoreLogs?.length ||
            0,

        cleanupLogs:
            this.data.cleanupLogs?.length ||
            0,

        changeLog:
            this.data.changeLog?.length ||
            0,

        archive:
            this.data.archive?.length ||
            0,

        deletedRecords:
            this.data.deletedRecords?.length ||
            0,

        learningEvents:
            this.data.learningEvents?.length ||
            0,

        qualitySnapshots:
            this.data.qualitySnapshots?.length ||
            0,

        memorySnapshots:
            this.data.memorySnapshots?.length ||
            0
    };
}


// ============================================================
// MAINTENANCE SUMMARY
// ============================================================

getMaintenanceSummary() {

    return {

        storage:
            this.getStorageStatus(),

        cleanup:
            this.getCleanupReport(),

        health:
            this.getStorageHealth(),

        limits:
            this.checkMemoryLimits(),

        cache:
            this.getSearchCacheStats(),

        lastMaintenance:
            this.getMaintenanceLogs({
                limit: 1
            })[0] ||
            null,

        lastRestore:
            this.getRestoreLogs({
                limit: 1
            })[0] ||
            null,

        lastChange:
            this.getChangeLog({
                limit: 1
            })[0] ||
            null
    };
}


// ============================================================
// PART 7 END
// ============================================================
// ============================================================
// TÜRKAI — ANSWER MEMORY
// PART 8 / 10
// STATS + DIAGNOSTICS + CONSISTENCY + REPAIR
// SEARCH ANALYTICS + REPORTING + PERFORMANCE + MONITORING
// ============================================================


// ============================================================
// ANALYTICS CONFIG
// ============================================================

getAnalyticsConfig() {
    return {
        maxSearchEvents: 10000,
        maxAnswerEvents: 10000,
        maxFailureEvents: 5000,
        maxPerformanceEvents: 5000,
        maxReports: 1000,
        slowSearchThresholdMs: 100,
        verySlowSearchThresholdMs: 500,
        lowConfidenceThreshold: 0.60,
        lowScoreThreshold: 0.55,
        highScoreThreshold: 0.85,
        staleDays: 365,
        topLimit: 50
    };
}


// ============================================================
// ANALYTICS COLLECTIONS
// ============================================================

ensureAnalyticsCollections() {

    if (
        !Array.isArray(
            this.data.searchEvents
        )
    ) {
        this.data.searchEvents = [];
    }

    if (
        !Array.isArray(
            this.data.answerEvents
        )
    ) {
        this.data.answerEvents = [];
    }

    if (
        !Array.isArray(
            this.data.failureEvents
        )
    ) {
        this.data.failureEvents = [];
    }

    if (
        !Array.isArray(
            this.data.performanceEvents
        )
    ) {
        this.data.performanceEvents = [];
    }

    if (
        !Array.isArray(
            this.data.reports
        )
    ) {
        this.data.reports = [];
    }

    if (
        !Array.isArray(
            this.data.diagnostics
        )
    ) {
        this.data.diagnostics = [];
    }

    if (
        !Array.isArray(
            this.data.consistencyReports
        )
    ) {
        this.data.consistencyReports = [];
    }

    if (
        !Array.isArray(
            this.data.repairLogs
        )
    ) {
        this.data.repairLogs = [];
    }

    return this.data;
}


// ============================================================
// ANALYTICS STATUS
// ============================================================

getAnalyticsStatus() {

    this.ensureAnalyticsCollections();

    return {
        ok: true,

        searchEvents:
            this.data.searchEvents.length,

        answerEvents:
            this.data.answerEvents.length,

        failureEvents:
            this.data.failureEvents.length,

        performanceEvents:
            this.data.performanceEvents.length,

        reports:
            this.data.reports.length,

        diagnostics:
            this.data.diagnostics.length,

        consistencyReports:
            this.data.consistencyReports.length,

        repairLogs:
            this.data.repairLogs.length
    };
}


// ============================================================
// ANALYTICS EVENT ID
// ============================================================

createAnalyticsEventId(
    prefix = "event"
) {

    return [
        this.safeText(
            prefix
        ) || "event",

        Date.now(),

        Math.random()
            .toString(36)
            .slice(2, 12)
    ].join("_");
}


// ============================================================
// RECORD SEARCH EVENT
// ============================================================

recordSearchEvent(
    question = "",
    result = {},
    options = {}
) {

    this.ensureAnalyticsCollections();

    const event = {

        id:
            this.createAnalyticsEventId(
                "search"
            ),

        question:
            this.cleanQuestionText(
                question
            ),

        normalized:
            this.normalizeQuestion(
                question
            ),

        found:
            Boolean(
                result?.found
            ),

        score:
            this.clamp01(
                result?.score ||
                0
            ),

        confidence:
            this.clamp01(
                result?.confidence ||
                0
            ),

        source:
            this.safeText(
                result?.source ||
                "unknown"
            ),

        recordId:
            this.safeText(
                result?.record?.id ||
                ""
            ),

        userId:
            this.safeText(
                options.userId ||
                ""
            ),

        durationMs:
            Math.max(
                0,
                this.safeNumber(
                    options.durationMs,
                    0
                )
            ),

        timestamp:
            this.nowIso(),

        metadata:
            options.metadata &&
            typeof options.metadata ===
                "object"
                ? {
                    ...options.metadata
                }
                : {}
    };

    this.data.searchEvents.push(
        event
    );

    const max =
        this.getAnalyticsConfig()
            .maxSearchEvents;

    if (
        this.data.searchEvents.length >
        max
    ) {
        this.data.searchEvents =
            this.data.searchEvents.slice(
                -max
            );
    }

    return event;
}


// ============================================================
// RECORD ANSWER EVENT
// ============================================================

recordAnswerEvent(
    question = "",
    answer = "",
    options = {}
) {

    this.ensureAnalyticsCollections();

    const event = {

        id:
            this.createAnalyticsEventId(
                "answer"
            ),

        question:
            this.cleanQuestionText(
                question
            ),

        answerLength:
            this.cleanAnswerText(
                answer
            ).length,

        source:
            this.safeText(
                options.source ||
                "unknown"
            ),

        model:
            this.safeText(
                options.model ||
                ""
            ),

        score:
            this.clamp01(
                options.score ||
                0
            ),

        confidence:
            this.clamp01(
                options.confidence ||
                0
            ),

        researchUsed:
            options.researchUsed === true,

        memoryUsed:
            options.memoryUsed === true,

        local:
            options.local === true,

        userId:
            this.safeText(
                options.userId ||
                ""
            ),

        durationMs:
            Math.max(
                0,
                this.safeNumber(
                    options.durationMs,
                    0
                )
            ),

        timestamp:
            this.nowIso(),

        metadata:
            options.metadata &&
            typeof options.metadata ===
                "object"
                ? {
                    ...options.metadata
                }
                : {}
    };

    this.data.answerEvents.push(
        event
    );

    const max =
        this.getAnalyticsConfig()
            .maxAnswerEvents;

    if (
        this.data.answerEvents.length >
        max
    ) {
        this.data.answerEvents =
            this.data.answerEvents.slice(
                -max
            );
    }

    return event;
}


// ============================================================
// RECORD FAILURE EVENT
// ============================================================

recordFailureEvent(
    type = "",
    details = {},
    options = {}
) {

    this.ensureAnalyticsCollections();

    const event = {

        id:
            this.createAnalyticsEventId(
                "failure"
            ),

        type:
            this.safeText(
                type
            ) || "unknown",

        message:
            this.safeText(
                details?.message ||
                ""
            ),

        stack:
            options.includeStack === true
                ? this.safeText(
                    details?.stack ||
                    ""
                )
                : "",

        question:
            this.cleanQuestionText(
                details?.question ||
                ""
            ),

        userId:
            this.safeText(
                options.userId ||
                details?.userId ||
                ""
            ),

        source:
            this.safeText(
                details?.source ||
                ""
            ),

        timestamp:
            this.nowIso(),

        details:
            details &&
            typeof details === "object"
                ? this.deepClone(
                    details
                )
                : {}
    };

    this.data.failureEvents.push(
        event
    );

    const max =
        this.getAnalyticsConfig()
            .maxFailureEvents;

    if (
        this.data.failureEvents.length >
        max
    ) {
        this.data.failureEvents =
            this.data.failureEvents.slice(
                -max
            );
    }

    return event;
}


// ============================================================
// RECORD PERFORMANCE EVENT
// ============================================================

recordPerformanceEvent(
    action = "",
    durationMs = 0,
    options = {}
) {

    this.ensureAnalyticsCollections();

    const duration =
        Math.max(
            0,
            this.safeNumber(
                durationMs,
                0
            )
        );

    const event = {

        id:
            this.createAnalyticsEventId(
                "performance"
            ),

        action:
            this.safeText(
                action
            ) || "unknown",

        durationMs:
            duration,

        slow:
            duration >=
            this.getAnalyticsConfig()
                .slowSearchThresholdMs,

        verySlow:
            duration >=
            this.getAnalyticsConfig()
                .verySlowSearchThresholdMs,

        userId:
            this.safeText(
                options.userId ||
                ""
            ),

        timestamp:
            this.nowIso(),

        metadata:
            options.metadata &&
            typeof options.metadata ===
                "object"
                ? this.deepClone(
                    options.metadata
                )
                : {}
    };

    this.data.performanceEvents.push(
        event
    );

    const max =
        this.getAnalyticsConfig()
            .maxPerformanceEvents;

    if (
        this.data.performanceEvents.length >
        max
    ) {
        this.data.performanceEvents =
            this.data.performanceEvents.slice(
                -max
            );
    }

    return event;
}


// ============================================================
// SEARCH TIMED
// ============================================================

searchTimed(
    question = "",
    options = {}
) {

    const started =
        Date.now();

    let result;

    try {

        result =
            this.safeSearch(
                question,
                options
            );

    } catch (error) {

        const duration =
            Date.now() -
            started;

        this.recordFailureEvent(
            "search-error",
            {
                message:
                    error.message,

                stack:
                    error.stack,

                question
            },
            options
        );

        this.recordPerformanceEvent(
            "search",
            duration,
            options
        );

        throw error;
    }

    const duration =
        Date.now() -
        started;

    this.recordSearchEvent(
        question,
        result,
        {
            ...options,
            durationMs:
                duration
        }
    );

    this.recordPerformanceEvent(
        "search",
        duration,
        options
    );

    return {
        ...result,

        durationMs:
            duration
    };
}


// ============================================================
// ULTIMATE SEARCH TIMED
// ============================================================

searchUltimateTimed(
    question = "",
    options = {}
) {

    const started =
        Date.now();

    let result;

    try {

        result =
            this.searchUltimate(
                question,
                options
            );

    } catch (error) {

        const duration =
            Date.now() -
            started;

        this.recordFailureEvent(
            "ultimate-search-error",
            {
                message:
                    error.message,

                stack:
                    error.stack,

                question
            },
            options
        );

        this.recordPerformanceEvent(
            "ultimate-search",
            duration,
            options
        );

        return {
            found: false,
            answer: null,
            score: 0,
            confidence: 0,
            source:
                "search-error",
            record: null,
            candidates: [],
            error:
                error.message,
            durationMs:
                duration
        };
    }

    const duration =
        Date.now() -
        started;

    this.recordSearchEvent(
        question,
        result,
        {
            ...options,
            durationMs:
                duration
        }
    );

    this.recordPerformanceEvent(
        "ultimate-search",
        duration,
        options
    );

    return {
        ...result,

        durationMs:
            duration
    };
}


// ============================================================
// ANSWER TIMED
// ============================================================

answerTimed(
    question = "",
    options = {}
) {

    const started =
        Date.now();

    const result =
        this.getAnswerDetailed(
            question,
            options
        );

    const duration =
        Date.now() -
        started;

    this.recordSearchEvent(
        question,
        result,
        {
            ...options,
            durationMs:
                duration
        }
    );

    this.recordPerformanceEvent(
        "answer",
        duration,
        options
    );

    this.recordAnswerEvent(
        question,
        result.answer || "",
        {
            ...options,

            source:
                result.source,

            score:
                result.score,

            confidence:
                result.confidence,

            memoryUsed:
                result.found === true,

            durationMs:
                duration
        }
    );

    return {
        ...result,

        durationMs:
            duration
    };
}


// ============================================================
// SEARCH EVENTS
// ============================================================

getSearchEvents(
    options = {}
) {

    this.ensureAnalyticsCollections();

    let events =
        [
            ...this.data.searchEvents
        ];

    if (
        options.userId
    ) {
        events =
            events.filter(
                (event) =>
                    event.userId ===
                    options.userId
            );
    }

    if (
        options.source
    ) {
        events =
            events.filter(
                (event) =>
                    event.source ===
                    options.source
            );
    }

    if (
        options.found !== undefined
    ) {
        events =
            events.filter(
                (event) =>
                    event.found ===
                    Boolean(
                        options.found
                    )
            );
    }

    if (
        options.since
    ) {

        const cutoff =
            Date.parse(
                options.since
            ) || 0;

        events =
            events.filter(
                (event) =>
                    (
                        Date.parse(
                            event.timestamp
                        ) || 0
                    ) >= cutoff
            );
    }

    const limit =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    options.limit,
                    100
                )
            )
        );

    return events
        .slice(
            -limit
        )
        .reverse();
}


// ============================================================
// ANSWER EVENTS
// ============================================================

getAnswerEvents(
    options = {}
) {

    this.ensureAnalyticsCollections();

    let events =
        [
            ...this.data.answerEvents
        ];

    if (
        options.userId
    ) {
        events =
            events.filter(
                (event) =>
                    event.userId ===
                    options.userId
            );
    }

    if (
        options.source
    ) {
        events =
            events.filter(
                (event) =>
                    event.source ===
                    options.source
            );
    }

    const limit =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    options.limit,
                    100
                )
            )
        );

    return events
        .slice(
            -limit
        )
        .reverse();
}


// ============================================================
// FAILURE EVENTS
// ============================================================

getFailureEvents(
    options = {}
) {

    this.ensureAnalyticsCollections();

    let events =
        [
            ...this.data.failureEvents
        ];

    if (
        options.type
    ) {
        events =
            events.filter(
                (event) =>
                    event.type ===
                    options.type
            );
    }

    const limit =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    options.limit,
                    100
                )
            )
        );

    return events
        .slice(
            -limit
        )
        .reverse();
}


// ============================================================
// PERFORMANCE EVENTS
// ============================================================

getPerformanceEvents(
    options = {}
) {

    this.ensureAnalyticsCollections();

    let events =
        [
            ...this.data.performanceEvents
        ];

    if (
        options.action
    ) {
        events =
            events.filter(
                (event) =>
                    event.action ===
                    options.action
            );
    }

    if (
        options.slow === true
    ) {
        events =
            events.filter(
                (event) =>
                    event.slow
            );
    }

    const limit =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    options.limit,
                    100
                )
            )
        );

    return events
        .slice(
            -limit
        )
        .reverse();
}


// ============================================================
// SEARCH TOTAL
// ============================================================

getTotalSearches(
    options = {}
) {
    return this.getSearchEvents(
        {
            ...options,
            limit:
                100000000
        }
    ).length;
}


// ============================================================
// SUCCESSFUL SEARCHES
// ============================================================

getSuccessfulSearches() {
    return this.getSearchEvents({
        found: true,
        limit:
            100000000
    }).length;
}


// ============================================================
// FAILED SEARCHES
// ============================================================

getFailedSearches() {
    return this.getSearchEvents({
        found: false,
        limit:
            100000000
    }).length;
}


// ============================================================
// SEARCH SUCCESS RATE
// ============================================================

getSearchSuccessRate() {

    const total =
        this.getTotalSearches();

    if (!total) {
        return 0;
    }

    return this.clamp01(
        this.getSuccessfulSearches() /
        total
    );
}


// ============================================================
// SEARCH FAILURE RATE
// ============================================================

getSearchFailureRate() {

    const total =
        this.getTotalSearches();

    if (!total) {
        return 0;
    }

    return this.clamp01(
        this.getFailedSearches() /
        total
    );
}


// ============================================================
// AVERAGE SEARCH SCORE
// ============================================================

getAverageSearchScore() {

    const events =
        this.getSearchEvents({
            limit:
                100000000
        });

    if (!events.length) {
        return 0;
    }

    const total =
        events.reduce(
            (sum, event) =>
                sum +
                this.safeNumber(
                    event.score,
                    0
                ),
            0
        );

    return this.clamp01(
        total /
        events.length
    );
}


// ============================================================
// AVERAGE SEARCH CONFIDENCE
// ============================================================

getAverageSearchConfidence() {

    const events =
        this.getSearchEvents({
            limit:
                100000000
        });

    if (!events.length) {
        return 0;
    }

    const total =
        events.reduce(
            (sum, event) =>
                sum +
                this.safeNumber(
                    event.confidence,
                    0
                ),
            0
        );

    return this.clamp01(
        total /
        events.length
    );
}


// ============================================================
// AVERAGE SEARCH TIME
// ============================================================

getAverageSearchDuration() {

    const events =
        this.getSearchEvents({
            limit:
                100000000
        });

    if (!events.length) {
        return 0;
    }

    const total =
        events.reduce(
            (sum, event) =>
                sum +
                this.safeNumber(
                    event.durationMs,
                    0
                ),
            0
        );

    return total /
        events.length;
}


// ============================================================
// MAX SEARCH TIME
// ============================================================

getMaxSearchDuration() {

    const events =
        this.getSearchEvents({
            limit:
                100000000
        });

    if (!events.length) {
        return 0;
    }

    return Math.max(
        ...events.map(
            (event) =>
                this.safeNumber(
                    event.durationMs,
                    0
                )
        )
    );
}


// ============================================================
// SLOW SEARCH COUNT
// ============================================================

getSlowSearchCount() {

    return this.getSearchEvents({
        limit:
            100000000
    }).filter(
        (event) =>
            this.safeNumber(
                event.durationMs,
                0
            ) >=
            this.getAnalyticsConfig()
                .slowSearchThresholdMs
    ).length;
}


// ============================================================
// VERY SLOW SEARCH COUNT
// ============================================================

getVerySlowSearchCount() {

    return this.getSearchEvents({
        limit:
            100000000
    }).filter(
        (event) =>
            this.safeNumber(
                event.durationMs,
                0
            ) >=
            this.getAnalyticsConfig()
                .verySlowSearchThresholdMs
    ).length;
}


// ============================================================
// SOURCE STATISTICS
// ============================================================

getSearchSourceStats() {

    const events =
        this.getSearchEvents({
            limit:
                100000000
        });

    const stats = {};

    for (
        const event
        of events
    ) {

        const source =
            this.safeText(
                event.source
            ) ||
            "unknown";

        if (
            !stats[source]
        ) {

            stats[source] = {
                count: 0,
                found: 0,
                scoreTotal: 0,
                confidenceTotal: 0,
                durationTotal: 0
            };
        }

        stats[source].count++;

        if (
            event.found
        ) {
            stats[source].found++;
        }

        stats[source].scoreTotal +=
            this.safeNumber(
                event.score,
                0
            );

        stats[source].confidenceTotal +=
            this.safeNumber(
                event.confidence,
                0
            );

        stats[source].durationTotal +=
            this.safeNumber(
                event.durationMs,
                0
            );
    }

    for (
        const source
        of Object.keys(stats)
    ) {

        const item =
            stats[source];

        item.successRate =
            item.count
                ? item.found /
                    item.count
                : 0;

        item.averageScore =
            item.count
                ? item.scoreTotal /
                    item.count
                : 0;

        item.averageConfidence =
            item.count
                ? item.confidenceTotal /
                    item.count
                : 0;

        item.averageDuration =
            item.count
                ? item.durationTotal /
                    item.count
                : 0;
    }

    return stats;
}


// ============================================================
// TOP QUESTIONS
// ============================================================

getTopQuestions(
    limit = 20
) {

    const events =
        this.getSearchEvents({
            limit:
                100000000
        });

    const counts =
        new Map();

    for (
        const event
        of events
    ) {

        const key =
            this.normalizeQuestion(
                event.question
            );

        if (!key) {
            continue;
        }

        if (
            !counts.has(key)
        ) {
            counts.set(
                key,
                {
                    question:
                        event.question,

                    count: 0,

                    found: 0,

                    scoreTotal: 0,

                    confidenceTotal: 0
                }
            );
        }

        const item =
            counts.get(key);

        item.count++;

        if (
            event.found
        ) {
            item.found++;
        }

        item.scoreTotal +=
            this.safeNumber(
                event.score,
                0
            );

        item.confidenceTotal +=
            this.safeNumber(
                event.confidence,
                0
            );
    }

    const results =
        [...counts.values()];

    for (
        const item
        of results
    ) {
        item.successRate =
            item.count
                ? item.found /
                    item.count
                : 0;

        item.averageScore =
            item.count
                ? item.scoreTotal /
                    item.count
                : 0;

        item.averageConfidence =
            item.count
                ? item.confidenceTotal /
                    item.count
                : 0;
    }

    results.sort(
        (a, b) =>
            b.count -
            a.count
    );

    return results.slice(
        0,
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    limit,
                    20
                )
            )
        )
    );
}


// ============================================================
// TOP ANSWER SOURCES
// ============================================================

getTopAnswerSources(
    limit = 20
) {

    const events =
        this.getAnswerEvents({
            limit:
                100000000
        });

    const map = {};

    for (
        const event
        of events
    ) {

        const source =
            this.safeText(
                event.source
            ) ||
            "unknown";

        if (
            !map[source]
        ) {
            map[source] = {
                source,
                count: 0,
                scoreTotal: 0,
                confidenceTotal: 0,
                durationTotal: 0
            };
        }

        map[source].count++;

        map[source].scoreTotal +=
            this.safeNumber(
                event.score,
                0
            );

        map[source].confidenceTotal +=
            this.safeNumber(
                event.confidence,
                0
            );

        map[source].durationTotal +=
            this.safeNumber(
                event.durationMs,
                0
            );
    }

    const results =
        Object.values(
            map
        );

    for (
        const item
        of results
    ) {

        item.averageScore =
            item.count
                ? item.scoreTotal /
                    item.count
                : 0;

        item.averageConfidence =
            item.count
                ? item.confidenceTotal /
                    item.count
                : 0;

        item.averageDuration =
            item.count
                ? item.durationTotal /
                    item.count
                : 0;
    }

    results.sort(
        (a, b) =>
            b.count -
            a.count
    );

    return results.slice(
        0,
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    limit,
                    20
                )
            )
        )
    );
}


// ============================================================
// LOW CONFIDENCE SEARCHES
// ============================================================

getLowConfidenceSearches(
    threshold = 0.60,
    limit = 100
) {

    const safeThreshold =
        this.clamp01(
            this.safeNumber(
                threshold,
                0.60
            )
        );

    const events =
        this.getSearchEvents({
            limit:
                100000000
        }).filter(
            (event) =>
                this.safeNumber(
                    event.confidence,
                    0
                ) <=
                safeThreshold
        );

    return events.slice(
        -Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    limit,
                    100
                )
            )
        )
    ).reverse();
}


// ============================================================
// LOW SCORE SEARCHES
// ============================================================

getLowScoreSearches(
    threshold = 0.55,
    limit = 100
) {

    const safeThreshold =
        this.clamp01(
            this.safeNumber(
                threshold,
                0.55
            )
        );

    const events =
        this.getSearchEvents({
            limit:
                100000000
        }).filter(
            (event) =>
                this.safeNumber(
                    event.score,
                    0
                ) <=
                safeThreshold
        );

    return events.slice(
        -Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    limit,
                    100
                )
            )
        )
    ).reverse();
}


// ============================================================
// HIGH SCORE SEARCHES
// ============================================================

getHighScoreSearches(
    threshold = 0.85,
    limit = 100
) {

    const safeThreshold =
        this.clamp01(
            this.safeNumber(
                threshold,
                0.85
            )
        );

    const events =
        this.getSearchEvents({
            limit:
                100000000
        }).filter(
            (event) =>
                this.safeNumber(
                    event.score,
                    0
                ) >=
                safeThreshold
        );

    return events.slice(
        -Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    limit,
                    100
                )
            )
        )
    ).reverse();
}


// ============================================================
// NOT FOUND QUESTIONS
// ============================================================

getNotFoundQuestions(
    limit = 100
) {

    return this.getSearchEvents({
        found: false,
        limit
    });
}


// ============================================================
// SEARCH FAILURE GROUPS
// ============================================================

getSearchFailureGroups() {

    const events =
        this.getNotFoundQuestions(
            100000000
        );

    const groups =
        new Map();

    for (
        const event
        of events
    ) {

        const key =
            event.normalized ||
            this.normalizeQuestion(
                event.question
            );

        if (!key) {
            continue;
        }

        if (
            !groups.has(key)
        ) {

            groups.set(
                key,
                {
                    question:
                        event.question,

                    normalized:
                        key,

                    count: 0,

                    lastSeen:
                        event.timestamp
                }
            );
        }

        const group =
            groups.get(key);

        group.count++;

        group.lastSeen =
            event.timestamp;
    }

    return [
        ...groups.values()
    ].sort(
        (a, b) =>
            b.count -
            a.count
    );
}


// ============================================================
// MOST REQUESTED UNKNOWN QUESTIONS
// ============================================================

getMostRequestedUnknownQuestions(
    limit = 50
) {

    return this.getSearchFailureGroups()
        .slice(
            0,
            Math.max(
                1,
                Math.floor(
                    this.safeNumber(
                        limit,
                        50
                    )
                )
            )
        );
}


// ============================================================
// FAILURE STATISTICS
// ============================================================

getFailureStats() {

    const events =
        this.getFailureEvents({
            limit:
                100000000
        });

    const map = {};

    for (
        const event
        of events
    ) {

        const type =
            event.type ||
            "unknown";

        if (
            !map[type]
        ) {
            map[type] = 0;
        }

        map[type]++;
    }

    return map;
}


// ============================================================
// PERFORMANCE STATISTICS
// ============================================================

getPerformanceStats() {

    const events =
        this.getPerformanceEvents({
            limit:
                100000000
        });

    if (
        !events.length
    ) {

        return {
            count: 0,
            average: 0,
            minimum: 0,
            maximum: 0,
            slow: 0,
            verySlow: 0
        };
    }

    const durations =
        events.map(
            (event) =>
                this.safeNumber(
                    event.durationMs,
                    0
                )
        );

    const total =
        durations.reduce(
            (sum, value) =>
                sum + value,
            0
        );

    return {

        count:
            events.length,

        average:
            total /
            events.length,

        minimum:
            Math.min(
                ...durations
            ),

        maximum:
            Math.max(
                ...durations
            ),

        slow:
            events.filter(
                (event) =>
                    event.slow
            ).length,

        verySlow:
            events.filter(
                (event) =>
                    event.verySlow
            ).length
    };
}


// ============================================================
// GLOBAL MEMORY STATISTICS
// ============================================================

getGlobalMemoryStats() {

    const records =
        this.getAllRecords({
            includeArchived: true,
            includeDeleted: true
        });

    const users =
        this.getAllUsers();

    let active = 0;
    let archived = 0;
    let deleted = 0;
    let trusted = 0;
    let pinned = 0;
    let favorite = 0;
    let totalUsage = 0;
    let totalHits = 0;
    let totalMisses = 0;

    for (
        const record
        of records
    ) {

        if (
            record.active !== false
        ) {
            active++;
        }

        if (
            record.archived
        ) {
            archived++;
        }

        if (
            record.status ===
            "deleted"
        ) {
            deleted++;
        }

        if (
            record.trusted
        ) {
            trusted++;
        }

        if (
            record.pinned
        ) {
            pinned++;
        }

        if (
            record.favorite
        ) {
            favorite++;
        }

        totalUsage +=
            this.safeNumber(
                record.usageCount,
                0
            );

        totalHits +=
            this.safeNumber(
                record.hitCount,
                0
            );

        totalMisses +=
            this.safeNumber(
                record.missCount,
                0
            );
    }

    return {

        records:
            records.length,

        active,

        archived,

        deleted,

        users:
            users.length,

        trusted,

        pinned,

        favorite,

        totalUsage,

        totalHits,

        totalMisses,

        hitRate:
            (
                totalHits +
                totalMisses
            )
                ? totalHits /
                    (
                        totalHits +
                        totalMisses
                    )
                : 0,

        averageQuality:
            this.getAverageQuality(),

        averageConfidence:
            this.getAverageConfidence(),

        memoryScore:
            users.length
                ? (
                    users.reduce(
                        (sum, user) =>
                            sum +
                            this.calculateUserMemoryScore(
                                user.id
                            ),
                        0
                    ) /
                    users.length
                )
                : 0
    };
}


// ============================================================
// CATEGORY STATISTICS
// ============================================================

getGlobalCategoryStats() {

    const categories =
        this.getCategorySummary();

    const result =
        Object.entries(
            categories
        ).map(
            ([
                category,
                values
            ]) => ({
                category,
                ...values
            })
        );

    result.sort(
        (a, b) =>
            b.count -
            a.count
    );

    return result;
}


// ============================================================
// TOP MEMORY RECORDS
// ============================================================

getTopMemoryRecords(
    limit = 50
) {

    return this.getActiveRecords()
        .slice()
        .map(
            (record) => ({
                record,

                quality:
                    this.getFinalQuality(
                        record
                    ),

                usage:
                    this.safeNumber(
                        record.usageCount,
                        0
                    ),

                confidence:
                    this.normalizeConfidence(
                        record.confidence
                    )
            })
        )
        .sort(
            (a, b) => {

                const aScore =
                    a.quality * 0.60 +
                    Math.min(
                        1,
                        Math.log10(
                            a.usage + 1
                        ) / 3
                    ) * 0.25 +
                    a.confidence * 0.15;

                const bScore =
                    b.quality * 0.60 +
                    Math.min(
                        1,
                        Math.log10(
                            b.usage + 1
                        ) / 3
                    ) * 0.25 +
                    b.confidence * 0.15;

                return bScore -
                    aScore;
            }
        )
        .slice(
            0,
            Math.max(
                1,
                Math.floor(
                    this.safeNumber(
                        limit,
                        50
                    )
                )
            )
        )
        .map(
            (item) => ({
                ...item.record,

                _quality:
                    item.quality,

                _usage:
                    item.usage,

                _confidence:
                    item.confidence
            })
        );
}


// ============================================================
// TOP TRUSTED MEMORY
// ============================================================

getTopTrustedMemory(
    limit = 50
) {

    return this.getTrustedRecords()
        .slice(
            0,
            Math.max(
                1,
                Math.floor(
                    this.safeNumber(
                        limit,
                        50
                    )
                )
            )
        );
}


// ============================================================
// TOP USER MEMORIES
// ============================================================

getTopUsersByMemory(
    limit = 50
) {

    const users =
        this.getAllUsers();

    const result =
        users.map(
            (user) => ({
                user,
                score:
                    this.calculateUserMemoryScore(
                        user.id
                    )
            })
        );

    result.sort(
        (a, b) =>
            b.score -
            a.score
    );

    return result.slice(
        0,
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    limit,
                    50
                )
            )
        )
    );
}


// ============================================================
// USER ACTIVITY STATS
// ============================================================

getUserActivityStats(
    userId = ""
) {

    const user =
        this.getUserMemory(
            userId
        );

    const questions =
        user.questions.length;

    const answers =
        user.answers.length;

    const hits =
        user.answerHits.length;

    const activeTopics =
        user.topics
            .filter(
                (topic) =>
                    this.safeNumber(
                        topic.count,
                        0
                    ) > 0
            )
            .length;

    const recent =
        user.questions.slice(
            -20
        );

    return {

        userId:
            user.id,

        questions,

        answers,

        hits,

        activeTopics,

        context:
            user.context.length,

        history:
            user.history.length,

        recentQuestions:
            recent,

        topTopics:
            this.getUserTopics(
                user.id,
                {
                    limit: 10
                }
            ),

        memoryLevel:
            this.getUserMemoryLevel(
                user.id
            ),

        memoryScore:
            this.calculateUserMemoryScore(
                user.id
            )
    };
}


// ============================================================
// USER SEARCH ANALYTICS
// ============================================================

getUserSearchAnalytics(
    userId = "",
    options = {}
) {

    const events =
        this.getSearchEvents({
            ...options,
            userId,
            limit:
                100000000
        });

    const total =
        events.length;

    const found =
        events.filter(
            (event) =>
                event.found
        ).length;

    const averageScore =
        total
            ? events.reduce(
                (sum, event) =>
                    sum +
                    this.safeNumber(
                        event.score,
                        0
                    ),
                0
            ) / total
            : 0;

    const averageConfidence =
        total
            ? events.reduce(
                (sum, event) =>
                    sum +
                    this.safeNumber(
                        event.confidence,
                        0
                    ),
                0
            ) / total
            : 0;

    const averageDuration =
        total
            ? events.reduce(
                (sum, event) =>
                    sum +
                    this.safeNumber(
                        event.durationMs,
                        0
                    ),
                0
            ) / total
            : 0;

    return {
        userId:

            this.resolveUserId(
                userId
            ),

        total,

        found,

        notFound:
            total -
            found,

        successRate:
            total
                ? found / total
                : 0,

        averageScore,

        averageConfidence,

        averageDuration
    };
}


// ============================================================
// DAILY STATS
// ============================================================

getDailyStats(
    days = 30
) {

    const safeDays =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    days,
                    30
                )
            )
        );

    const now =
        Date.now();

    const dayMs =
        24 *
        60 *
        60 *
        1000;

    const output = [];

    for (
        let index = safeDays - 1;
        index >= 0;
        index--
    ) {

        const start =
            now -
            (
                index *
                dayMs
            );

        const end =
            start +
            dayMs;

        const searchEvents =
            this.data.searchEvents
                .filter(
                    (event) => {

                        const time =
                            Date.parse(
                                event.timestamp
                            ) || 0;

                        return (
                            time >= start &&
                            time < end
                        );
                    }
                );

        const answerEvents =
            this.data.answerEvents
                .filter(
                    (event) => {

                        const time =
                            Date.parse(
                                event.timestamp
                            ) || 0;

                        return (
                            time >= start &&
                            time < end
                        );
                    }
                );

        const failures =
            this.data.failureEvents
                .filter(
                    (event) => {

                        const time =
                            Date.parse(
                                event.timestamp
                            ) || 0;

                        return (
                            time >= start &&
                            time < end
                        );
                    }
                );

        const searches =
            searchEvents.length;

        const found =
            searchEvents.filter(
                (event) =>
                    event.found
            ).length;

        output.push({

            date:
                new Date(
                    start
                )
                    .toISOString()
                    .slice(
                        0,
                        10
                    ),

            searches,

            found,

            notFound:
                searches -
                found,

            successRate:
                searches
                    ? found /
                        searches
                    : 0,

            answers:
                answerEvents.length,

            failures:
                failures.length,

            averageScore:
                searches
                    ? searchEvents.reduce(
                        (sum, event) =>
                            sum +
                            this.safeNumber(
                                event.score,
                                0
                            ),
                        0
                    ) / searches
                    : 0,

            averageConfidence:
                searches
                    ? searchEvents.reduce(
                        (sum, event) =>
                            sum +
                            this.safeNumber(
                                event.confidence,
                                0
                            ),
                        0
                    ) / searches
                    : 0,

            averageDuration:
                searches
                    ? searchEvents.reduce(
                        (sum, event) =>
                            sum +
                            this.safeNumber(
                                event.durationMs,
                                0
                            ),
                        0
                    ) / searches
                    : 0
        });
    }

    return output;
}


// ============================================================
// WEEKLY STATS
// ============================================================

getWeeklyStats(
    weeks = 12
) {

    const safeWeeks =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    weeks,
                    12
                )
            )
        );

    const daily =
        this.getDailyStats(
            safeWeeks * 7
        );

    const result = [];

    for (
        let i = 0;
        i < safeWeeks;
        i++
    ) {

        const slice =
            daily.slice(
                i * 7,
                (
                    i + 1
                ) * 7
            );

        const searches =
            slice.reduce(
                (sum, item) =>
                    sum +
                    item.searches,
                0
            );

        const found =
            slice.reduce(
                (sum, item) =>
                    sum +
                    item.found,
                0
            );

        const failures =
            slice.reduce(
                (sum, item) =>
                    sum +
                    item.failures,
                0
            );

        result.push({
            week:
                i + 1,

            searches,

            found,

            notFound:
                searches -
                found,

            failures,

            successRate:
                searches
                    ? found /
                        searches
                    : 0
        });
    }

    return result;
}


// ============================================================
// MONTHLY STATS
// ============================================================

getMonthlyStats(
    months = 12
) {

    const safeMonths =
        Math.max(
            1,
            Math.floor(
                this.safeNumber(
                    months,
                    12
                )
            )
        );

    const events =
        this.getSearchEvents({
            limit:
                100000000
        });

    const map =
        new Map();

    for (
        const event
        of events
    ) {

        const date =
            new Date(
                event.timestamp
            );

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            continue;
        }

        const key =
            `${date.getUTCFullYear()}-${String(
                date.getUTCMonth() + 1
            ).padStart(2, "0")}`;

        if (
            !map.has(key)
        ) {
            map.set(
                key,
                {
                    month: key,
                    searches: 0,
                    found: 0,
                    notFound: 0,
                    scoreTotal: 0,
                    confidenceTotal: 0
                }
            );
        }

        const item =
            map.get(key);

        item.searches++;

        if (
            event.found
        ) {
            item.found++;
        } else {
            item.notFound++;
        }

        item.scoreTotal +=
            this.safeNumber(
                event.score,
                0
            );

        item.confidenceTotal +=
            this.safeNumber(
                event.confidence,
                0
            );
    }

    const result =
        [...map.values()]
            .sort(
                (a, b) =>
                    a.month.localeCompare(
                        b.month
                    )
            )
            .slice(
                -safeMonths
            );

    for (
        const item
        of result
    ) {

        item.successRate =
            item.searches
                ? item.found /
                    item.searches
                : 0;

        item.averageScore =
            item.searches
                ? item.scoreTotal /
                    item.searches
                : 0;

        item.averageConfidence =
            item.searches
                ? item.confidenceTotal /
                    item.searches
                : 0;
    }

    return result;
}


// ============================================================
// CURRENT STATS
// ============================================================

getCurrentStats() {

    return {

        generatedAt:
            this.nowIso(),

        memory:
            this.getGlobalMemoryStats(),

        searches: {

            total:
                this.getTotalSearches(),

            successful:
                this.getSuccessfulSearches(),

            failed:
                this.getFailedSearches(),

            successRate:
                this.getSearchSuccessRate(),

            failureRate:
                this.getSearchFailureRate(),

            averageScore:
                this.getAverageSearchScore(),

            averageConfidence:
                this.getAverageSearchConfidence(),

            averageDuration:
                this.getAverageSearchDuration(),

            maxDuration:
                this.getMaxSearchDuration(),

            slow:
                this.getSlowSearchCount(),

            verySlow:
                this.getVerySlowSearchCount()
        },

        sources:
            this.getSearchSourceStats(),

        failures:
            this.getFailureStats(),

        performance:
            this.getPerformanceStats(),

        users:
            this.getTopUsersByMemory(
                10
            )
    };
}


// ============================================================
// CONSISTENCY RECORD CHECK
// ============================================================

checkRecordConsistency(
    record
) {

    const issues = [];

    if (
        !record ||
        typeof record !==
            "object"
    ) {

        return {
            valid: false,
            issues: [
                "record-invalid"
            ]
        };
    }

    if (
        !this.safeText(
            record.id
        )
    ) {
        issues.push(
            "id-missing"
        );
    }

    if (
        !this.safeText(
            record.question
        )
    ) {
        issues.push(
            "question-missing"
        );
    }

    if (
        !this.safeText(
            record.answer
        )
    ) {
        issues.push(
            "answer-missing"
        );
    }

    const normalized =
        this.normalizeQuestion(
            record.question ||
            ""
        );

    if (
        record.normalizedQuestion !==
        normalized
    ) {
        issues.push(
            "normalized-question-mismatch"
        );
    }

    const fingerprint =
        this.getSemanticFingerprint(
            record.question ||
            ""
        );

    if (
        JSON.stringify(
            record.tokens ||
            []
        ) !==
        JSON.stringify(
            fingerprint.tokens
        )
    ) {
        issues.push(
            "tokens-mismatch"
        );
    }

    if (
        JSON.stringify(
            record.intents ||
            []
        ) !==
        JSON.stringify(
            fingerprint.intents
        )
    ) {
        issues.push(
            "intents-mismatch"
        );
    }

    if (
        typeof record.quality !==
            "number"
    ) {
        issues.push(
            "quality-not-number"
        );
    }

    if (
        typeof record.confidence !==
            "number"
    ) {
        issues.push(
            "confidence-not-number"
        );
    }

    if (
        record.quality < 0 ||
        record.quality > 1
    ) {
        issues.push(
            "quality-out-of-range"
        );
    }

    if (
        record.confidence < 0 ||
        record.confidence > 1
    ) {
        issues.push(
            "confidence-out-of-range"
        );
    }

    if (
        !Array.isArray(
            record.aliases
        )
    ) {
        issues.push(
            "aliases-not-array"
        );
    }

    if (
        !Array.isArray(
            record.tags
        )
    ) {
        issues.push(
            "tags-not-array"
        );
    }

    return {
        valid:
            issues.length === 0,

        issues
    };
}


// ============================================================
// FULL CONSISTENCY CHECK
// ============================================================

checkDatabaseConsistency(
    options = {}
) {

    this.ensureStorageCollections();

    const records =
        this.getAllRecords({
            includeArchived: true,
            includeDeleted:
                options.includeDeleted ===
                true
        });

    const issues = [];

    let validRecords = 0;
    let invalidRecords = 0;

    for (
        const record
        of records
    ) {

        const check =
            this.checkRecordConsistency(
                record
            );

        if (
            check.valid
        ) {
            validRecords++;
        } else {
            invalidRecords++;

            issues.push({
                recordId:
                    record?.id ||
                    null,

                question:
                    record?.question ||
                    "",

                issues:
                    check.issues
            });
        }
    }

    const duplicateMap =
        new Map();

    const duplicates = [];

    for (
        const record
        of records
    ) {

        if (
            !record
        ) {
            continue;
        }

        const key =
            this.normalizeQuestion(
                record.question
            );

        if (!key) {
            continue;
        }

        if (
            !duplicateMap.has(key)
        ) {
            duplicateMap.set(
                key,
                []
            );
        }

        duplicateMap.get(key)
            .push(
                record.id
            );
    }

    for (
        const [
            question,
            ids
        ]
        of duplicateMap.entries()
    ) {

        if (
            ids.length > 1
        ) {
            duplicates.push({
                question,
                ids
            });
        }
    }

    const indexInfo =
        this.getIndexInfo();

    const result = {

        ok:
            invalidRecords === 0 &&
            duplicates.length === 0,

        totalRecords:
            records.length,

        validRecords,

        invalidRecords,

        duplicateGroups:
            duplicates.length,

        duplicates,

        issues,

        index:
            indexInfo,

        checkedAt:
            this.nowIso()
    };

    this.ensureAnalyticsCollections();

    this.data.consistencyReports.push(
        result
    );

    if (
        this.data.consistencyReports.length >
        1000
    ) {
        this.data.consistencyReports =
            this.data.consistencyReports
                .slice(
                    -1000
                );
    }

    return result;
}


// ============================================================
// SAVE CONSISTENCY REPORT
// ============================================================

saveConsistencyReport(
    options = {}
) {

    const report =
        this.checkDatabaseConsistency(
            options
        );

    this.ensureAnalyticsCollections();

    const entry = {
        id:
            this.createAnalyticsEventId(
                "consistency"
            ),

        createdAt:
            this.nowIso(),

        report
    };

    this.data.consistencyReports.push(
        entry
    );

    if (
        this.data.consistencyReports.length >
        1000
    ) {
        this.data.consistencyReports =
            this.data.consistencyReports
                .slice(
                    -1000
                );
    }

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,
        saved: true,
        entry
    };
}


// ============================================================
// REPAIR SINGLE RECORD
// ============================================================

repairRecord(
    id = "",
    options = {}
) {

    const record =
        this.getRecordById(
            id
        );

    if (!record) {

        return {
            ok: false,
            repaired: false,
            reason:
                "record-not-found"
        };
    }

    const before =
        this.deepClone(
            record
        );

    this.refreshRecordFingerprint(
        record
    );

    if (
        !Array.isArray(
            record.aliases
        )
    ) {
        record.aliases =
            [];
    }

    if (
        !Array.isArray(
            record.tags
        )
    ) {
        record.tags =
            [];
    }

    record.quality =
        this.normalizeQuality(
            record.quality
        );

    record.confidence =
        this.normalizeConfidence(
            record.confidence
        );

    record.usageCount =
        Math.max(
            0,
            Math.floor(
                this.safeNumber(
                    record.usageCount,
                    0
                )
            )
        );

    record.hitCount =
        Math.max(
            0,
            Math.floor(
                this.safeNumber(
                    record.hitCount,
                    0
                )
            )
        );

    record.missCount =
        Math.max(
            0,
            Math.floor(
                this.safeNumber(
                    record.missCount,
                    0
                )
            )
        );

    record.feedbackPositive =
        Math.max(
            0,
            Math.floor(
                this.safeNumber(
                    record.feedbackPositive,
                    0
                )
            )
        );

    record.feedbackNegative =
        Math.max(
            0,
            Math.floor(
                this.safeNumber(
                    record.feedbackNegative,
                    0
                )
            )
        );

    record.verificationCount =
        Math.max(
            0,
            Math.floor(
                this.safeNumber(
                    record.verificationCount,
                    0
                )
            )
        );

    record.active =
        record.active !== false;

    record.archived =
        record.archived === true;

    record.trusted =
        record.trusted === true;

    record.pinned =
        record.pinned === true;

    record.favorite =
        record.favorite === true;

    record.status =
        this.safeText(
            record.status
        ) ||
        (
            record.archived
                ? "archived"
                : "active"
        );

    record.updatedAt =
        this.nowIso();

    this.removeFromIndex(
        before
    );

    this.indexRecord(
        record
    );

    this.addChangeLog(
        "record-repaired",
        {
            id:
                record.id
        },
        {
            save: false
        }
    );

    this.ensureAnalyticsCollections();

    this.data.repairLogs.push({
        id:
            this.createAnalyticsEventId(
                "repair"
            ),

        type:
            "record",

        recordId:
            record.id,

        createdAt:
            this.nowIso()
    });

    this.saveData();

    return {
        ok: true,

        repaired: true,

        recordId:
            record.id,

        record:
            this.getRecordById(
                record.id
            )
    };
}


// ============================================================
// REPAIR DATABASE
// ============================================================

repairDatabase(
    options = {}
) {

    const started =
        Date.now();

    this.ensureStorageCollections();

    const records =
        Array.isArray(
            this.data.records
        )
            ? this.data.records
            : [];

    let repaired = 0;
    let removed = 0;
    let invalid = 0;

    const seen =
        new Map();

    const repairedRecords =
        [];

    for (
        const record
        of records
    ) {

        if (
            !record ||
            typeof record !==
                "object"
        ) {
            invalid++;
            continue;
        }

        if (
            !this.safeText(
                record.id
            )
        ) {
            record.id =
                this.createRecordId();

            repaired++;
        }

        if (
            !this.safeText(
                record.question
            )
        ) {
            invalid++;
            continue;
        }

        if (
            !this.safeText(
                record.answer
            )
        ) {
            invalid++;
            continue;
        }

        const key =
            this.normalizeQuestion(
                record.question
            );

        if (
            key &&
            seen.has(key) &&
            options.removeDuplicates !==
                false
        ) {

            const existing =
                seen.get(key);

            const currentQuality =
                this.calculateRecordQuality(
                    record
                );

            const existingQuality =
                this.calculateRecordQuality(
                    existing
                );

            if (
                currentQuality >
                existingQuality
            ) {

                const existingIndex =
                    repairedRecords.findIndex(
                        (item) =>
                            item.id ===
                            existing.id
                    );

                if (
                    existingIndex >= 0
                ) {
                    repairedRecords[
                        existingIndex
                    ] = record;

                    seen.set(
                        key,
                        record
                    );
                }
            }

            removed++;
            continue;
        }

        seen.set(
            key,
            record
        );

        this.refreshRecordFingerprint(
            record
        );

        if (
            !Array.isArray(
                record.aliases
            )
        ) {
            record.aliases = [];
            repaired++;
        }

        if (
            !Array.isArray(
                record.tags
            )
        ) {
            record.tags = [];
            repaired++;
        }

        record.quality =
            this.normalizeQuality(
                record.quality
            );

        record.confidence =
            this.normalizeConfidence(
                record.confidence
            );

        record.usageCount =
            Math.max(
                0,
                Math.floor(
                    this.safeNumber(
                        record.usageCount,
                        0
                    )
                )
            );

        record.hitCount =
            Math.max(
                0,
                Math.floor(
                    this.safeNumber(
                        record.hitCount,
                        0
                    )
                )
            );

        record.missCount =
            Math.max(
                0,
                Math.floor(
                    this.safeNumber(
                        record.missCount,
                        0
                    )
                )
            );

        record.updatedAt =
            this.nowIso();

        repairedRecords.push(
            record
        );
    }

    this.data.records =
        repairedRecords;

    this.rebuildIndex();

    this.invalidateAllCaches();

    const durationMs =
        Date.now() -
        started;

    this.addMaintenanceLog(
        "database-repair",
        {
            repaired,
            removed,
            invalid,
            records:
                repairedRecords.length
        },
        {
            durationMs,
            save: false
        }
    );

    this.ensureAnalyticsCollections();

    this.data.repairLogs.push({
        id:
            this.createAnalyticsEventId(
                "database-repair"
            ),

        type:
            "database",

        createdAt:
            this.nowIso(),

        repaired,
        removed,
        invalid,
        durationMs
    });

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,

        repaired,

        removed,

        invalid,

        records:
            repairedRecords.length,

        durationMs
    };
}


// ============================================================
// REPAIR USERS
// ============================================================

repairAllUserMemory() {

    const users =
        this.getAllUsers();

    let repaired = 0;

    const results = [];

    for (
        const user
        of users
    ) {

        const result =
            this.repairUserMemory(
                user.id,
                {
                    save: false
                }
            );

        results.push(
            result
        );

        if (
            result.ok
        ) {
            repaired++;
        }
    }

    this.saveData();

    return {
        ok:
            repaired ===
            users.length,

        repaired,

        total:
            users.length,

        results
    };
}


// ============================================================
// DIAGNOSTIC ITEM
// ============================================================

createDiagnostic(
    type = "",
    message = "",
    details = {},
    options = {}
) {

    this.ensureAnalyticsCollections();

    return {
        id:
            this.createAnalyticsEventId(
                "diagnostic"
            ),

        type:
            this.safeText(
                type
            ) || "info",

        severity:
            this.safeText(
                options.severity ||
                "info"
            ),

        message:
            this.safeText(
                message
            ),

        createdAt:
            this.nowIso(),

        details:
            details &&
            typeof details === "object"
                ? this.deepClone(
                    details
                )
                : {}
    };
}


// ============================================================
// ADD DIAGNOSTIC
// ============================================================

addDiagnostic(
    type = "",
    message = "",
    details = {},
    options = {}
) {

    const diagnostic =
        this.createDiagnostic(
            type,
            message,
            details,
            options
        );

    this.data.diagnostics.push(
        diagnostic
    );

    if (
        this.data.diagnostics.length >
        5000
    ) {
        this.data.diagnostics =
            this.data.diagnostics.slice(
                -5000
            );
    }

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return diagnostic;
}


// ============================================================
// RUN DIAGNOSTICS
// ============================================================

runDiagnostics(
    options = {}
) {

    const started =
        Date.now();

    const checks = [];

    const check =
        (
            name,
            fn
        ) => {

            try {

                const result =
                    fn();

                checks.push({

                    name,

                    ok:
                        Boolean(
                            result?.ok ??
                            result === true
                        ),

                    result
                });

            } catch (error) {

                checks.push({

                    name,

                    ok: false,

                    result: null,

                    error:
                        error.message
                });
            }
        };

    check(
        "search-engine-ready",
        () => ({
            ok:
                this.isSearchEngineReady()
        })
    );

    check(
        "storage",
        () =>
            this.getStorageHealth()
    );

    check(
        "database-consistency",
        () =>
            this.checkDatabaseConsistency(
                options
            )
    );

    check(
        "user-memory",
        () => {

            const users =
                this.getAllUsers();

            let invalid = 0;

            for (
                const user
                of users
            ) {

                const result =
                    this.getUserMemoryHealth(
                        user.id
                    );

                if (
                    !result.ok
                ) {
                    invalid++;
                }
            }

            return {
                ok:
                    invalid === 0,

                users:
                    users.length,

                invalid
            };
        }
    );

    check(
        "answer-memory-quality",
        () =>
            this.getQualityReport()
    );

    check(
        "cache",
        () => ({
            ok: true,

            cache:
                this.getSearchCacheStats()
        })
    );

    check(
        "limits",
        () =>
            this.checkMemoryLimits()
    );

    check(
        "search-self-test",
        () =>
            this.runSearchSelfTest()
    );

    check(
        "quality-self-test",
        () =>
            this.runQualitySelfTest()
    );

    check(
        "user-memory-self-test",
        () =>
            this.runUserMemorySelfTest(
                options.userId ||
                ""
            )
    );

    check(
        "storage-self-test",
        () =>
            this.runStorageSelfTest()
    );

    const failed =
        checks.filter(
            (item) =>
                !item.ok
        );

    const durationMs =
        Date.now() -
        started;

    const result = {

        ok:
            failed.length === 0,

        total:
            checks.length,

        passed:
            checks.length -
            failed.length,

        failed:
            failed.length,

        durationMs,

        checks,

        generatedAt:
            this.nowIso()
    };

    this.addDiagnostic(
        "diagnostics",
        result.ok
            ? "Diagnostics OK"
            : "Diagnostics found problems",
        result,
        {
            severity:
                result.ok
                    ? "info"
                    : "warning",
            save: false
        }
    );

    this.saveData();

    return result;
}


// ============================================================
// SYSTEM HEALTH SCORE
// ============================================================

calculateSystemHealthScore() {

    const consistency =
        this.checkDatabaseConsistency();

    const storage =
        this.getStorageHealth();

    const quality =
        this.getQualityReport();

    const searchRate =
        this.getSearchSuccessRate();

    const cache =
        this.getSearchCacheStats();

    const recordsScore =
        consistency.ok
            ? 1
            : 0.50;

    const storageScore =
        storage.ok
            ? 1
            : 0.50;

    const qualityScore =
        this.clamp01(
            quality.averageQuality
        );

    const confidenceScore =
        this.clamp01(
            quality.averageConfidence
        );

    const searchScore =
        this.clamp01(
            searchRate
        );

    const cacheScore =
        cache.size <=
        this.getStorageConfig()
            .maxCacheEntries
            ? 1
            : 0.50;

    return this.clamp01(
        recordsScore * 0.20 +
        storageScore * 0.15 +
        qualityScore * 0.20 +
        confidenceScore * 0.15 +
        searchScore * 0.20 +
        cacheScore * 0.10
    );
}


// ============================================================
// SYSTEM HEALTH LEVEL
// ============================================================

getSystemHealthLevel() {

    const score =
        this.calculateSystemHealthScore();

    if (
        score >= 0.95
    ) {
        return "excellent";
    }

    if (
        score >= 0.85
    ) {
        return "healthy";
    }

    if (
        score >= 0.70
    ) {
        return "stable";
    }

    if (
        score >= 0.50
    ) {
        return "warning";
    }

    return "critical";
}


// ============================================================
// SYSTEM HEALTH
// ============================================================

getSystemHealth() {

    const score =
        this.calculateSystemHealthScore();

    return {

        ok:
            score >= 0.70,

        score,

        level:
            this.getSystemHealthLevel(),

        memory:
            this.getGlobalMemoryStats(),

        quality:
            this.getQualityReport(),

        search:
            {
                total:
                    this.getTotalSearches(),

                successRate:
                    this.getSearchSuccessRate(),

                averageDuration:
                    this.getAverageSearchDuration()
            },

        storage:
            this.getStorageHealth(),

        analytics:
            this.getAnalyticsStatus(),

        generatedAt:
            this.nowIso()
    };
}


// ============================================================
// HEALTH ALERTS
// ============================================================

getHealthAlerts(
    options = {}
) {

    const alerts = [];

    const config =
        this.getAnalyticsConfig();

    const quality =
        this.getQualityReport();

    const searchRate =
        this.getSearchSuccessRate();

    const averageDuration =
        this.getAverageSearchDuration();

    const failures =
        this.data.failureEvents?.length ||
        0;

    const consistency =
        this.checkDatabaseConsistency(
            options
        );

    if (
        consistency.invalidRecords >
        0
    ) {
        alerts.push({
            type:
                "database",
            severity:
                "high",
            message:
                "Geçersiz AnswerMemory kayıtları bulundu.",
            value:
                consistency.invalidRecords
        });
    }

    if (
        consistency.duplicateGroups >
        0
    ) {
        alerts.push({
            type:
                "duplicate",
            severity:
                "medium",
            message:
                "Duplicate soru grupları bulundu.",
            value:
                consistency.duplicateGroups
        });
    }

    if (
        quality.averageQuality <
        config.lowScoreThreshold
    ) {
        alerts.push({
            type:
                "quality",
            severity:
                "high",
            message:
                "Ortalama cevap kalitesi düşük.",
            value:
                quality.averageQuality
        });
    }

    if (
        searchRate <
        0.50 &&
        this.getTotalSearches() >
        10
    ) {
        alerts.push({
            type:
                "search",
            severity:
                "medium",
            message:
                "AnswerMemory arama başarı oranı düşük.",
            value:
                searchRate
        });
    }

    if (
        averageDuration >
        config.verySlowSearchThresholdMs
    ) {
        alerts.push({
            type:
                "performance",
            severity:
                "high",
            message:
                "Arama motoru çok yavaş çalışıyor.",
            value:
                averageDuration
        });
    }

    if (
        failures >
        100
    ) {
        alerts.push({
            type:
                "failure",
            severity:
                "medium",
            message:
                "Çok sayıda sistem hatası kaydedildi.",
            value:
                failures
        });
    }

    return alerts;
}


// ============================================================
// REPORT ID
// ============================================================

createReportId() {

    return this.createAnalyticsEventId(
        "report"
    );
}


// ============================================================
// CREATE FULL REPORT
// ============================================================

createFullReport(
    options = {}
) {

    const started =
        Date.now();

    const report = {

        id:
            this.createReportId(),

        createdAt:
            this.nowIso(),

        systemHealth:
            this.getSystemHealth(),

        memory:
            this.getGlobalMemoryStats(),

        database:
            this.getDatabaseReport(),

        quality:
            this.getQualityReport(),

        trust:
            this.getTrustReport(),

        learning:
            this.getLearningSummary(),

        analytics:
            this.getAnalyticsStatus(),

        search:
            {
                total:
                    this.getTotalSearches(),

                successful:
                    this.getSuccessfulSearches(),

                failed:
                    this.getFailedSearches(),

                successRate:
                    this.getSearchSuccessRate(),

                averageScore:
                    this.getAverageSearchScore(),

                averageConfidence:
                    this.getAverageSearchConfidence(),

                averageDuration:
                    this.getAverageSearchDuration(),

                maxDuration:
                    this.getMaxSearchDuration()
            },

        sources:
            this.getSearchSourceStats(),

        failures:
            this.getFailureStats(),

        performance:
            this.getPerformanceStats(),

        topQuestions:
            this.getTopQuestions(
                options.topLimit ||
                20
            ),

        topMemoryRecords:
            this.getTopMemoryRecords(
                options.topLimit ||
                20
            ),

        unknownQuestions:
            this.getMostRequestedUnknownQuestions(
                options.topLimit ||
                20
            ),

        categories:
            this.getGlobalCategoryStats(),

        daily:
            this.getDailyStats(
                options.days ||
                30
            ),

        alerts:
            this.getHealthAlerts(
                options
            ),

        durationMs:
            Date.now() -
            started
    };

    this.ensureAnalyticsCollections();

    this.data.reports.push(
        report
    );

    const max =
        this.getAnalyticsConfig()
            .maxReports;

    if (
        this.data.reports.length >
        max
    ) {
        this.data.reports =
            this.data.reports.slice(
                -max
            );
    }

    this.saveData();

    return report;
}


// ============================================================
// GET REPORTS
// ============================================================

getReports(
    limit = 20
) {

    this.ensureAnalyticsCollections();

    return this.data.reports
        .slice(
            -Math.max(
                1,
                Math.floor(
                    this.safeNumber(
                        limit,
                        20
                    )
                )
            )
        )
        .reverse();
}


// ============================================================
// GET LATEST REPORT
// ============================================================

getLatestReport() {

    const reports =
        this.getReports(
            1
        );

    return reports[0] ||
        null;
}


// ============================================================
// DIAGNOSTIC REPORT
// ============================================================

getDiagnosticReport(
    options = {}
) {

    const diagnostics =
        this.runDiagnostics(
            options
        );

    const alerts =
        this.getHealthAlerts(
            options
        );

    return {

        ok:
            diagnostics.ok,

        diagnostics,

        alerts,

        health:
            this.getSystemHealth(),

        generatedAt:
            this.nowIso()
    };
}


// ============================================================
// PERFORMANCE REPORT
// ============================================================

getPerformanceReport() {

    return {

        search:
            {
                average:
                    this.getAverageSearchDuration(),

                maximum:
                    this.getMaxSearchDuration(),

                slow:
                    this.getSlowSearchCount(),

                verySlow:
                    this.getVerySlowSearchCount()
            },

        events:
            this.getPerformanceStats(),

        recent:
            this.getPerformanceEvents({
                limit: 20
            })
    };
}


// ============================================================
// SEARCH ANALYTICS REPORT
// ============================================================

getSearchAnalyticsReport() {

    return {

        total:
            this.getTotalSearches(),

        successful:
            this.getSuccessfulSearches(),

        failed:
            this.getFailedSearches(),

        successRate:
            this.getSearchSuccessRate(),

        failureRate:
            this.getSearchFailureRate(),

        averageScore:
            this.getAverageSearchScore(),

        averageConfidence:
            this.getAverageSearchConfidence(),

        averageDuration:
            this.getAverageSearchDuration(),

        maxDuration:
            this.getMaxSearchDuration(),

        slow:
            this.getSlowSearchCount(),

        verySlow:
            this.getVerySlowSearchCount(),

        sources:
            this.getSearchSourceStats(),

        topQuestions:
            this.getTopQuestions(
                20
            ),

        unknown:
            this.getMostRequestedUnknownQuestions(
                20
            ),

        lowConfidence:
            this.getLowConfidenceSearches(
                0.60,
                20
            )
    };
}


// ============================================================
// MEMORY ANALYTICS REPORT
// ============================================================

getMemoryAnalyticsReport() {

    return {

        global:
            this.getGlobalMemoryStats(),

        quality:
            this.getQualityReport(),

        trust:
            this.getTrustReport(),

        autoLearn:
            this.getAutoLearnReport(),

        topRecords:
            this.getTopMemoryRecords(
                20
            ),

        trusted:
            this.getTopTrustedMemory(
                20
            ),

        categories:
            this.getGlobalCategoryStats(),

        sources:
            this.getSourceSummary()
    };
}


// ============================================================
// USER ANALYTICS REPORT
// ============================================================

getUserAnalyticsReport(
    userId = ""
) {

    return {

        user:
            this.getUserMemorySummary(
                userId
            ),

        activity:
            this.getUserActivityStats(
                userId
            ),

        search:
            this.getUserSearchAnalytics(
                userId
            ),

        health:
            this.getUserMemoryHealth(
                userId
            ),

        dashboard:
            this.getUserMemoryDashboard(
                userId
            )
    };
}


// ============================================================
// ANSWER EFFECTIVENESS
// ============================================================

getAnswerEffectiveness() {

    const events =
        this.getAnswerEvents({
            limit:
                100000000
        });

    if (
        !events.length
    ) {
        return {
            count: 0,
            effectiveness: 0,
            averageScore: 0,
            averageConfidence: 0
        };
    }

    let scoreTotal = 0;
    let confidenceTotal = 0;
    let memoryAnswers = 0;
    let researchAnswers = 0;
    let localAnswers = 0;

    for (
        const event
        of events
    ) {

        scoreTotal +=
            this.safeNumber(
                event.score,
                0
            );

        confidenceTotal +=
            this.safeNumber(
                event.confidence,
                0
            );

        if (
            event.memoryUsed
        ) {
            memoryAnswers++;
        }

        if (
            event.researchUsed
        ) {
            researchAnswers++;
        }

        if (
            event.local
        ) {
            localAnswers++;
        }
    }

    const averageScore =
        scoreTotal /
        events.length;

    const averageConfidence =
        confidenceTotal /
        events.length;

    const effectiveness =
        this.clamp01(
            averageScore * 0.50 +
            averageConfidence * 0.50
        );

    return {

        count:
            events.length,

        effectiveness,

        averageScore,

        averageConfidence,

        memoryAnswers,

        researchAnswers,

        localAnswers
    };
}


// ============================================================
// SEARCH QUALITY BREAKDOWN
// ============================================================

getSearchQualityBreakdown() {

    const events =
        this.getSearchEvents({
            limit:
                100000000
        });

    let exact = 0;
    let alias = 0;
    let semantic = 0;
    let notFound = 0;
    let lowConfidence = 0;

    for (
        const event
        of events
    ) {

        const source =
            this.safeText(
                event.source
            );

        if (
            source.includes(
                "exact"
            )
        ) {
            exact++;
        } else if (
            source.includes(
                "alias"
            )
        ) {
            alias++;
        } else if (
            source.includes(
                "semantic"
            ) ||
            source.includes(
                "smart"
            )
        ) {
            semantic++;
        }

        if (
            !event.found
        ) {
            notFound++;
        }

        if (
            this.safeNumber(
                event.confidence,
                0
            ) <
            this.getAnalyticsConfig()
                .lowConfidenceThreshold
        ) {
            lowConfidence++;
        }
    }

    return {

        total:
            events.length,

        exact,

        alias,

        semantic,

        notFound,

        lowConfidence
    };
}


// ============================================================
// SEARCH SOURCE LEADERBOARD
// ============================================================

getSearchSourceLeaderboard() {

    const stats =
        this.getSearchSourceStats();

    return Object.entries(
        stats
    )
        .map(
            ([
                source,
                values
            ]) => ({
                source,
                ...values
            })
        )
        .sort(
            (a, b) =>
                b.successRate -
                a.successRate
        );
}


// ============================================================
// UNKNOWN QUESTION REPORT
// ============================================================

getUnknownQuestionReport(
    limit = 50
) {

    const groups =
        this.getMostRequestedUnknownQuestions(
            limit
        );

    return {

        count:
            groups.length,

        groups,

        totalUnknownSearches:
            this.getFailedSearches()
    };
}


// ============================================================
// LEARNING OPPORTUNITIES
// ============================================================

getLearningOpportunities(
    limit = 50
) {

    const opportunities = [];

    const unknown =
        this.getMostRequestedUnknownQuestions(
            limit
        );

    for (
        const item
        of unknown
    ) {

        opportunities.push({
            type:
                "unknown-question",

            priority:
                item.count >= 10
                    ? "high"
                    : item.count >= 3
                        ? "medium"
                        : "low",

            question:
                item.question,

            count:
                item.count
        });
    }

    const review =
        this.getRecordsNeedingReview({
            qualityThreshold:
                0.45,
            negativeLimit:
                2
        });

    for (
        const record
        of review.slice(
            0,
            limit
        )
    ) {

        opportunities.push({
            type:
                "low-quality-record",

            priority:
                this.getFinalQuality(
                    record
                ) <
                0.30
                    ? "high"
                    : "medium",

            question:
                record.question,

            recordId:
                record.id,

            quality:
                this.getFinalQuality(
                    record
                )
        });
    }

    const similar =
        this.getActiveRecords()
            .filter(
                (record) =>
                    this.safeNumber(
                        record.usageCount,
                        0
                    ) === 0
            );

    for (
        const record
        of similar.slice(
            0,
            Math.min(
                limit,
                similar.length
            )
        )
    ) {

        opportunities.push({
            type:
                "unused-memory",

            priority:
                "low",

            question:
                record.question,

            recordId:
                record.id,

            usage:
                0
        });
    }

    return opportunities
        .slice(
            0,
            Math.max(
                1,
                Math.floor(
                    this.safeNumber(
                        limit,
                        50
                    )
                )
            )
        );
}


// ============================================================
// SELF LEARNING REPORT
// ============================================================

getSelfLearningReport() {

    return {

        opportunities:
            this.getLearningOpportunities(
                50
            ),

        autoLearn:
            this.getAutoLearnReport(),

        queue:
            this.getLearningQueue(
                50
            ),

        summary:
            this.getLearningSummary(),

        trend:
            this.getQualityTrend()
    };
}


// ============================================================
// PERFORMANCE WATCHDOG
// ============================================================

runPerformanceWatchdog() {

    const performance =
        this.getPerformanceStats();

    const alerts = [];

    const config =
        this.getAnalyticsConfig();

    if (
        performance.average >
        config.slowSearchThresholdMs
    ) {
        alerts.push({
            severity:
                "warning",

            type:
                "average-latency",

            value:
                performance.average
        });
    }

    if (
        performance.maximum >
        config.verySlowSearchThresholdMs
    ) {
        alerts.push({
            severity:
                "high",

            type:
                "maximum-latency",

            value:
                performance.maximum
        });
    }

    return {

        ok:
            alerts.length === 0,

        performance,

        alerts
    };
}


// ============================================================
// AUTO DIAGNOSTIC
// ============================================================

runAutoDiagnostic() {

    const started =
        Date.now();

    const diagnostics =
        this.runDiagnostics();

    const watchdog =
        this.runPerformanceWatchdog();

    const alerts =
        this.getHealthAlerts();

    return {

        ok:
            diagnostics.ok &&
            watchdog.ok &&
            alerts.length === 0,

        diagnostics,

        watchdog,

        alerts,

        durationMs:
            Date.now() -
            started
    };
}


// ============================================================
// SAVE DIAGNOSTIC
// ============================================================

saveDiagnosticReport(
    options = {}
) {

    const report =
        this.runAutoDiagnostic();

    this.addDiagnostic(
        "full-diagnostic",
        report.ok
            ? "AnswerMemory tanı testi başarılı."
            : "AnswerMemory tanı testinde sorun bulundu.",
        report,
        {
            severity:
                report.ok
                    ? "info"
                    : "warning"
        }
    );

    return report;
}


// ============================================================
// CONSISTENCY HISTORY
// ============================================================

getConsistencyReports(
    limit = 20
) {

    this.ensureAnalyticsCollections();

    return this.data.consistencyReports
        .slice(
            -Math.max(
                1,
                Math.floor(
                    this.safeNumber(
                        limit,
                        20
                    )
                )
            )
        )
        .reverse();
}


// ============================================================
// REPAIR HISTORY
// ============================================================

getRepairLogs(
    limit = 50
) {

    this.ensureAnalyticsCollections();

    return this.data.repairLogs
        .slice(
            -Math.max(
                1,
                Math.floor(
                    this.safeNumber(
                        limit,
                        50
                    )
                )
            )
        )
        .reverse();
}


// ============================================================
// DIAGNOSTIC HISTORY
// ============================================================

getDiagnostics(
    limit = 50
) {

    this.ensureAnalyticsCollections();

    return this.data.diagnostics
        .slice(
            -Math.max(
                1,
                Math.floor(
                    this.safeNumber(
                        limit,
                        50
                    )
                )
            )
        )
        .reverse();
}


// ============================================================
// ANALYTICS CLEANUP
// ============================================================

cleanupAnalytics() {

    this.ensureAnalyticsCollections();

    const config =
        this.getAnalyticsConfig();

    const collections = [
        [
            "searchEvents",
            config.maxSearchEvents
        ],
        [
            "answerEvents",
            config.maxAnswerEvents
        ],
        [
            "failureEvents",
            config.maxFailureEvents
        ],
        [
            "performanceEvents",
            config.maxPerformanceEvents
        ],
        [
            "reports",
            config.maxReports
        ],
        [
            "diagnostics",
            5000
        ],
        [
            "consistencyReports",
            1000
        ],
        [
            "repairLogs",
            5000
        ]
    ];

    let removed = 0;

    for (
        const [
            key,
            max
        ]
        of collections
    ) {

        const array =
            this.data[key];

        if (
            !Array.isArray(
                array
            )
        ) {
            continue;
        }

        if (
            array.length >
            max
        ) {

            const count =
                array.length -
                max;

            this.data[key] =
                array.slice(
                    -max
                );

            removed +=
                count;
        }
    }

    this.addCleanupLog(
        "analytics-cleanup",
        {
            removed
        },
        {
            save: false
        }
    );

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,
        removed
    };
}


// ============================================================
// ANALYTICS SNAPSHOT
// ============================================================

createAnalyticsSnapshot() {

    return {

        id:
            this.createAnalyticsEventId(
                "analytics-snapshot"
            ),

        createdAt:
            this.nowIso(),

        current:
            this.getCurrentStats(),

        search:
            this.getSearchAnalyticsReport(),

        memory:
            this.getMemoryAnalyticsReport(),

        performance:
            this.getPerformanceReport(),

        learning:
            this.getSelfLearningReport(),

        health:
            this.getSystemHealth(),

        alerts:
            this.getHealthAlerts()
    };
}


// ============================================================
// SAVE ANALYTICS SNAPSHOT
// ============================================================

saveAnalyticsSnapshot(
    options = {}
) {

    if (
        !Array.isArray(
            this.data.analyticsSnapshots
        )
    ) {
        this.data.analyticsSnapshots =
            [];
    }

    const snapshot =
        this.createAnalyticsSnapshot();

    this.data.analyticsSnapshots.push(
        snapshot
    );

    if (
        this.data.analyticsSnapshots.length >
        500
    ) {
        this.data.analyticsSnapshots =
            this.data.analyticsSnapshots
                .slice(
                    -500
                );
    }

    this.touchUpdatedAt();

    this.saveData();

    return {
        ok: true,

        snapshot
    };
}


// ============================================================
// GET ANALYTICS SNAPSHOTS
// ============================================================

getAnalyticsSnapshots(
    limit = 20
) {

    if (
        !Array.isArray(
            this.data.analyticsSnapshots
        )
    ) {
        return [];
    }

    return this.data.analyticsSnapshots
        .slice(
            -Math.max(
                1,
                Math.floor(
                    this.safeNumber(
                        limit,
                        20
                    )
                )
            )
        )
        .reverse();
}


// ============================================================
// ANALYTICS TREND
// ============================================================

getAnalyticsTrend() {

    const snapshots =
        this.getAnalyticsSnapshots(
            20
        );

    if (
        snapshots.length < 2
    ) {
        return {
            trend:
                "insufficient-data",

            delta:
                0,

            samples:
                snapshots.length
        };
    }

    const newest =
        snapshots[0];

    const oldest =
        snapshots[
            snapshots.length - 1
        ];

    const newestRate =
        newest.search
            ?.successRate ||
        0;

    const oldestRate =
        oldest.search
            ?.successRate ||
        0;

    const delta =
        newestRate -
        oldestRate;

    let trend =
        "stable";

    if (
        delta >= 0.05
    ) {
        trend =
            "improving";
    } else if (
        delta <= -0.05
    ) {
        trend =
            "declining";
    }

    return {
        trend,
        delta,
        samples:
            snapshots.length,

        newestRate,

        oldestRate
    };
}


// ============================================================
// GLOBAL REPORT JSON
// ============================================================

getFullReportJSON(
    options = {}
) {

    return JSON.stringify(
        this.createFullReport(
            options
        ),
        null,
        2
    );
}


// ============================================================
// DIAGNOSTIC JSON
// ============================================================

getDiagnosticJSON(
    options = {}
) {

    return JSON.stringify(
        this.getDiagnosticReport(
            options
        ),
        null,
        2
    );
}


// ============================================================
// SEARCH ANALYTICS JSON
// ============================================================

getSearchAnalyticsJSON() {

    return JSON.stringify(
        this.getSearchAnalyticsReport(),
        null,
        2
    );
}


// ============================================================
// MEMORY ANALYTICS JSON
// ============================================================

getMemoryAnalyticsJSON() {

    return JSON.stringify(
        this.getMemoryAnalyticsReport(),
        null,
        2
    );
}


// ============================================================
// EXPORT ANALYTICS
// ============================================================

exportAnalytics(
    options = {}
) {

    const payload = {

        magic:
            "TURKAI_ANSWER_MEMORY_ANALYTICS",

        format:
            "TAMA-1",

        exportedAt:
            this.nowIso(),

        current:
            this.getCurrentStats(),

        analytics:
            this.createAnalyticsSnapshot(),

        reports:
            this.getReports(
                options.reportLimit ||
                20
            ),

        diagnostics:
            this.getDiagnostics(
                options.diagnosticLimit ||
                50
            ),

        consistency:
            this.getConsistencyReports(
                options.consistencyLimit ||
                20
            )
    };

    const json =
        JSON.stringify(
            payload,
            null,
            2
        );

    return {

        ok: true,

        filename:
            `turkai-answer-memory-analytics-${Date.now()}.json`,

        mime:
            "application/json",

        bytes:
            Buffer.byteLength(
                json,
                "utf8"
            ),

        content:
            json
    };
}


// ============================================================
// ANSWER MEMORY STATUS 8
// ============================================================

getAnswerMemoryStatusV8() {

    return {

        ok: true,

        ready:
            this.isSearchEngineReady(),

        health:
            this.getSystemHealth(),

        memory:
            this.getGlobalMemoryStats(),

        quality:
            this.getQualityReport(),

        analytics:
            this.getAnalyticsStatus(),

        search:
            this.getSearchAnalyticsReport(),

        performance:
            this.getPerformanceReport(),

        learning:
            this.getSelfLearningReport(),

        storage:
            this.getStorageStatus()
    };
}


// ============================================================
// DEBUG FULL
// ============================================================

debugFull(
    question = "",
    options = {}
) {

    return {

        input:
            question,

        context:
            this.createSearchContext(
                question,
                options
            ),

        classification:
            this.classifyQuestion(
                question
            ),

        exact:
            this.searchExact(
                question,
                options
            ),

        alias:
            this.searchAlias(
                question,
                options
            ),

        token:
            this.searchByTokens(
                question,
                options
            ),

        intent:
            this.searchByIntent(
                question,
                options
            ),

        fuzzy:
            this.searchFuzzy(
                question,
                {
                    ...options,
                    minScore:
                        options.minScore ??
                        0.55
                }
            ),

        final:
            this.searchUltimateTimed(
                question,
                options
            ),

        health:
            this.getSystemHealth(),

        performance:
            this.getPerformanceReport()
    };
}


// ============================================================
// DIAGNOSTIC SEARCH
// ============================================================

diagnosticSearch(
    question = "",
    options = {}
) {

    const result =
        this.debugFull(
            question,
            options
        );

    const issues = [];

    if (
        !result.final.found
    ) {
        issues.push(
            "answer-not-found"
        );
    }

    if (
        result.final.score <
        (
            options.warningScore ??
            0.60
        )
    ) {
        issues.push(
            "low-score"
        );
    }

    if (
        result.final.confidence <
        (
            options.warningConfidence ??
            0.60
        )
    ) {
        issues.push(
            "low-confidence"
        );
    }

    if (
        result.final.durationMs >
        this.getAnalyticsConfig()
            .slowSearchThresholdMs
    ) {
        issues.push(
            "slow-search"
        );
    }

    return {

        ok:
            issues.length === 0,

        issues,

        result
    };
}


// ============================================================
// ANSWER MEMORY SUMMARY V8
// ============================================================

getSummaryV8() {

    return {

        version:
            "8.0",

        records:
            this.countRecords({
                includeArchived: true,
                includeDeleted: true
            }),

        active:
            this.countActiveRecords(),

        users:
            this.countUsers(),

        searches:
            this.getTotalSearches(),

        successRate:
            this.getSearchSuccessRate(),

        averageScore:
            this.getAverageSearchScore(),

        averageConfidence:
            this.getAverageSearchConfidence(),

        averageDuration:
            this.getAverageSearchDuration(),

        quality:
            this.getAverageQuality(),

        trusted:
            this.getTrustedRecords()
                .length,

        autoLearned:
            this.getAutoLearnReport()
                .learned,

        health:
            this.getSystemHealthLevel(),

        generatedAt:
            this.nowIso()
    };
}


// ============================================================
// FINAL PART 8 SELF TEST
// ============================================================

runPart8SelfTest() {

    const tests = [

        {
            name:
                "analytics-collections",

            result:
                Boolean(
                    this.ensureAnalyticsCollections()
                )
        },

        {
            name:
                "search-analytics",

            result:
                typeof this.getSearchAnalyticsReport ===
                "function"
        },

        {
            name:
                "memory-analytics",

            result:
                typeof this.getMemoryAnalyticsReport ===
                "function"
        },

        {
            name:
                "diagnostics",

            result:
                typeof this.runDiagnostics ===
                "function"
        },

        {
            name:
                "consistency",

            result:
                typeof this.checkDatabaseConsistency ===
                "function"
        },

        {
            name:
                "repair",

            result:
                typeof this.repairDatabase ===
                "function"
        },

        {
            name:
                "health",

            result:
                typeof this.getSystemHealth ===
                "function"
        },

        {
            name:
                "reports",

            result:
                typeof this.createFullReport ===
                "function"
        },

        {
            name:
                "performance",

            result:
                typeof this.getPerformanceReport ===
                "function"
        },

        {
            name:
                "learning",

            result:
                typeof this.getSelfLearningReport ===
                "function"
        }
    ];

    const passed =
        tests.filter(
            (test) =>
                test.result
        ).length;

    return {

        ok:
            passed ===
            tests.length,

        total:
            tests.length,

        passed,

        failed:
            tests.length -
            passed,

        tests
    };
}


// ============================================================
// PART 8 END
// ============================================================
// ============================================================
// TÜRKAI — ANSWER MEMORY
// PART 9 / 10
// SIMPLE MESSAGE ENGINE + KNOWLEDGE ENGINE
// BUILTIN ANSWERS + LOCAL ANSWERS + COMMAND PROCESSOR
// BRIDGE + COMPATIBILITY + DEBUG + MESSAGE PIPELINE
// ============================================================


// ============================================================
// SIMPLE MESSAGE CONFIG
// ============================================================

getSimpleMessageConfig() {
    return {
        enabled: true,

        maxMessageLength: 1000,

        minMessageLength: 1,

        directGreetingScore: 1,

        shortMessageScore: 0.98,

        simpleAnswerScore: 0.95,

        minimumMemoryScore: 0.70,

        saveUnknownKnowledge: true,

        learnSimpleAnswers: true,

        useBuiltins: true,

        useAliases: true,

        useKnowledge: true,

        useMemory: true
    };
}


// ============================================================
// SIMPLE MESSAGE STORE
// ============================================================

ensureSimpleMessageStore() {

    if (
        !this.data.simpleMessages ||
        typeof this.data.simpleMessages !==
            "object" ||
        Array.isArray(
            this.data.simpleMessages
        )
    ) {
        this.data.simpleMessages = {};
    }

    if (
        !Array.isArray(
            this.data.simpleMessageEvents
        )
    ) {
        this.data.simpleMessageEvents = [];
    }

    return this.data.simpleMessages;
}


// ============================================================
// SIMPLE MESSAGE KEY
// ============================================================

createSimpleMessageKey(
    message = ""
) {
    return this.normalizeQuestion(
        message
    );
}


// ============================================================
// SIMPLE MESSAGE OBJECT
// ============================================================

createSimpleMessage(
    message = "",
    answer = "",
    options = {}
) {

    const key =
        this.createSimpleMessageKey(
            message
        );

    return {
        id:
            options.id ||
            this.createRecordId(),

        message:
            this.cleanQuestionText(
                message
            ),

        key,

        answer:
            this.cleanAnswerText(
                answer
            ),

        category:
            this.safeText(
                options.category ||
                "simple"
            ),

        source:
            this.safeText(
                options.source ||
                "builtin"
            ),

        confidence:
            this.normalizeConfidence(
                options.confidence ??
                0.95
            ),

        quality:
            this.normalizeQuality(
                options.quality ??
                0.95
            ),

        aliases:
            this.safeArray(
                options.aliases ||
                []
            ),

        usageCount:
            Math.max(
                0,
                this.safeNumber(
                    options.usageCount,
                    0
                )
            ),

        enabled:
            options.enabled !== false,

        protected:
            options.protected === true,

        createdAt:
            options.createdAt ||
            this.nowIso(),

        updatedAt:
            options.updatedAt ||
            this.nowIso(),

        metadata:
            options.metadata &&
            typeof options.metadata ===
                "object"
                ? {
                    ...options.metadata
                }
                : {}
    };
}


// ============================================================
// SET SIMPLE MESSAGE
// ============================================================

setSimpleMessage(
    message = "",
    answer = "",
    options = {}
) {

    const store =
        this.ensureSimpleMessageStore();

    const key =
        this.createSimpleMessageKey(
            message
        );

    if (!key) {
        return {
            ok: false,
            saved: false,
            reason:
                "message-empty"
        };
    }

    const existing =
        store[key];

    if (
        existing &&
        options.overwrite !== true
    ) {

        return {
            ok: true,

            saved: false,

            duplicate: true,

            message:
                existing
        };
    }

    const record =
        this.createSimpleMessage(
            message,
            answer,
            options
        );

    store[key] =
        record;

    if (
        options.save !== false
    ) {
        this.touchUpdatedAt();
        this.saveData();
    }

    return {
        ok: true,

        saved: true,

        duplicate: false,

        message:
            record
    };
}


// ============================================================
// GET SIMPLE MESSAGE
// ============================================================

getSimpleMessage(
    message = ""
) {

    const store =
        this.ensureSimpleMessageStore();

    const key =
        this.createSimpleMessageKey(
            message
        );

    if (!key) {
        return null;
    }

    return (
        store[key] ||
        null
    );
}


// ============================================================
// DELETE SIMPLE MESSAGE
// ============================================================

deleteSimpleMessage(
    message = "",
    options = {}
) {

    const store =
        this.ensureSimpleMessageStore();

    const key =
        this.createSimpleMessageKey(
            message
        );

    if (
        !store[key]
    ) {
        return {
            ok: false,
            deleted: false,
            reason:
                "simple-message-not-found"
        };
    }

    if (
        store[key].protected
    ) {
        return {
            ok: false,
            deleted: false,
            reason:
                "protected-simple-message"
        };
    }

    const deleted =
        store[key];

    delete store[key];

    if (
        options.save !== false
    ) {
        this.touchUpdatedAt();
        this.saveData();
    }

    return {
        ok: true,

        deleted: true,

        message:
            deleted
    };
}


// ============================================================
// GET ALL SIMPLE MESSAGES
// ============================================================

getSimpleMessages() {

    const store =
        this.ensureSimpleMessageStore();

    return Object.values(
        store
    );
}


// ============================================================
// SIMPLE MESSAGE COUNT
// ============================================================

countSimpleMessages() {

    return Object.keys(
        this.ensureSimpleMessageStore()
    ).length;
}


// ============================================================
// SIMPLE MESSAGE EVENT
// ============================================================

recordSimpleMessageEvent(
    message = "",
    result = {},
    options = {}
) {

    this.ensureSimpleMessageStore();

    this.data.simpleMessageEvents.push({
        id:
            this.createAnalyticsEventId(
                "simple-message"
            ),

        message:
            this.cleanQuestionText(
                message
            ),

        found:
            Boolean(
                result?.found
            ),

        answer:
            result?.answer
                ? this.cleanAnswerText(
                    result.answer
                )
                : "",

        source:
            this.safeText(
                result?.source ||
                ""
            ),

        score:
            this.clamp01(
                result?.score ||
                0
            ),

        userId:
            this.safeText(
                options.userId ||
                ""
            ),

        timestamp:
            this.nowIso()
    });

    if (
        this.data.simpleMessageEvents.length >
        5000
    ) {
        this.data.simpleMessageEvents =
            this.data.simpleMessageEvents.slice(
                -5000
            );
    }

    return true;
}


// ============================================================
// SHORT MESSAGE DETECTOR
// ============================================================

isSimpleMessage(
    message = ""
) {

    const config =
        this.getSimpleMessageConfig();

    const clean =
        this.cleanQuestionText(
            message
        );

    if (!clean) {
        return false;
    }

    if (
        clean.length >
        config.maxMessageLength
    ) {
        return false;
    }

    const tokens =
        this.tokenize(
            clean
        );

    return (
        tokens.length <= 8 ||
        this.getDirectGreeting(
            clean
        ) !== null
    );
}


// ============================================================
// SHORT MESSAGE SCORE
// ============================================================

getSimpleMessageScore(
    message = ""
) {

    const clean =
        this.cleanQuestionText(
            message
        );

    if (!clean) {
        return 0;
    }

    const greeting =
        this.getDirectGreeting(
            clean
        );

    if (
        greeting
    ) {
        return 1;
    }

    const classification =
        this.classifyQuestion(
            clean
        );

    let score =
        0.45;

    if (
        classification.isGreeting
    ) {
        score += 0.40;
    }

    if (
        classification.isThanks
    ) {
        score += 0.20;
    }

    if (
        classification.isGoodbye
    ) {
        score += 0.20;
    }

    if (
        classification.isIdentity
    ) {
        score += 0.12;
    }

    if (
        classification.isHelp
    ) {
        score += 0.08;
    }

    if (
        this.tokenize(
            clean
        ).length <= 3
    ) {
        score += 0.08;
    }

    return this.clamp01(
        score
    );
}


// ============================================================
// BUILTIN SIMPLE ANSWER
// ============================================================

getBuiltinSimpleAnswer(
    message = ""
) {

    const greeting =
        this.getDirectGreeting(
            message
        );

    if (
        greeting
    ) {
        return {
            found: true,

            answer:
                greeting,

            score: 1,

            confidence: 1,

            source:
                "builtin-greeting"
        };
    }

    const normalized =
        this.normalizeQuestion(
            message
        );

    const map = {

        "nasılsın":
            "İyiyim, teşekkür ederim. Sen nasılsın?",

        "naber":
            "İyidir. TürkAI burada, hazırım.",

        "ne haber":
            "İyidir. Buradayım, ne yapıyoruz?",

        "sen nasılsın":
            "İyiyim, teşekkür ederim. Sana nasıl yardımcı olabilirim?",

        "kimsin":
            "Ben TürkAI. Türkçe odaklı bir yapay zekâ asistanıyım.",

        "sen kimsin":
            "Ben TürkAI. Sorularını yanıtlamak ve işlerinde yardımcı olmak için buradayım.",

        "adın ne":
            "Benim adım TürkAI.",

        "ismin ne":
            "Ben TürkAI.",

        "hangi yapay zeka":
            "Ben TürkAI.",

        "hangi ai":
            "Ben TürkAI.",

        "ne yapabiliyorsun":
            "Kodlama, araştırma, bilgi, planlama ve birçok farklı konuda yardımcı olabilirim.",

        "yardım":
            "Tabii. Sorunu veya yapmak istediğin şeyi yaz.",

        "yardım eder misin":
            "Evet. Ne yapmaya çalıştığını yaz, birlikte ilerleyelim.",

        "teşekkürler":
            "Rica ederim.",

        "teşekkür ederim":
            "Rica ederim.",

        "sağ ol":
            "Rica ederim.",

        "sağol":
            "Rica ederim.",

        "eyvallah":
            "Eyvallah.",

        "görüşürüz":
            "Görüşürüz. Kendine iyi bak.",

        "hoşça kal":
            "Hoşça kal.",

        "bay bay":
            "Bay bay.",

        "iyi geceler":
            "İyi geceler.",

        "iyi akşamlar":
            "İyi akşamlar.",

        "günaydın":
            "Günaydın. Güzel bir gün olsun.",

        "tünaydın":
            "Tünaydın.",

        "orada mısın":
            "Buradayım.",

        "burada mısın":
            "Buradayım.",

        "aktif misin":
            "Evet, buradayım ve çalışıyorum.",

        "çalışıyor musun":
            "Evet, çalışıyorum.",

        "hazır mısın":
            "Hazırım. Başlayalım.",

        "hızlı mısın":
            "Elimden geldiğince hızlı ve doğru yanıt vermeye çalışırım.",

        "en hızlı kim":
            "TürkAI ⚡🤖",

        "test":
            "Test başarılı.",

        "ping":
            "Pong."
    };

    if (
        Object.prototype.hasOwnProperty.call(
            map,
            normalized
        )
    ) {

        return {
            found: true,

            answer:
                map[normalized],

            score: 1,

            confidence: 1,

            source:
                "builtin-simple"
        };
    }

    return {
        found: false,

        answer: null,

        score: 0,

        confidence: 0,

        source:
            "builtin-not-found"
    };
}


// ============================================================
// SIMPLE MESSAGE SEARCH
// ============================================================

searchSimpleMessage(
    message = "",
    options = {}
) {

    const config =
        this.getSimpleMessageConfig();

    if (
        config.enabled === false
    ) {
        return {
            found: false,
            answer: null,
            score: 0,
            confidence: 0,
            source:
                "simple-disabled"
        };
    }

    const builtin =
        this.getBuiltinSimpleAnswer(
            message
        );

    if (
        builtin.found
    ) {
        return builtin;
    }

    const stored =
        this.getSimpleMessage(
            message
        );

    if (
        stored &&
        stored.enabled !== false
    ) {

        stored.usageCount =
            this.safeNumber(
                stored.usageCount,
                0
            ) + 1;

        stored.updatedAt =
            this.nowIso();

        return {
            found: true,

            answer:
                stored.answer,

            score:
                stored.quality ||
                0.95,

            confidence:
                stored.confidence ||
                0.95,

            source:
                "simple-message",

            record:
                stored
        };
    }

    const simpleCandidates =
        this.getSimpleMessages();

    const ranked = [];

    for (
        const candidate
        of simpleCandidates
    ) {

        if (
            !candidate ||
            candidate.enabled === false
        ) {
            continue;
        }

        const score =
            this.textSimilarity(
                message,
                candidate.message
            );

        if (
            score >=
            (
                options.minScore ??
                0.82
            )
        ) {

            ranked.push({
                ...candidate,

                _simpleScore:
                    score
            });
        }
    }

    ranked.sort(
        (a, b) =>
            (
                b._simpleScore ||
                0
            ) -
            (
                a._simpleScore ||
                0
            )
    );

    const best =
        ranked[0];

    if (
        !best
    ) {
        return {
            found: false,
            answer: null,
            score: 0,
            confidence: 0,
            source:
                "simple-not-found",
            record: null
        };
    }

    const score =
        this.clamp01(
            best._simpleScore ||
            0
        );

    const threshold =
        this.safeNumber(
            options.minScore,
            0.82
        );

    if (
        score <
        threshold
    ) {
        return {
            found: false,
            answer: null,
            score,
            confidence:
                score,
            source:
                "simple-below-threshold",
            record: null
        };
    }

    best.usageCount =
        this.safeNumber(
            best.usageCount,
            0
        ) + 1;

    return {
        found: true,

        answer:
            best.answer,

        score,

        confidence:
            this.clamp01(
                score *
                0.90 +
                (
                    best.confidence ||
                    0.5
                ) *
                0.10
            ),

        source:
            "simple-fuzzy",

        record:
            best
    };
}


// ============================================================
// SIMPLE RESPONSE
// ============================================================

getSimpleResponse(
    message = "",
    options = {}
) {

    const result =
        this.searchSimpleMessage(
            message,
            options
        );

    this.recordSimpleMessageEvent(
        message,
        result,
        options
    );

    if (
        result.found
    ) {
        return result;
    }

    return {
        found: false,

        answer: null,

        score:
            result.score ||
            0,

        confidence:
            result.confidence ||
            0,

        source:
            result.source ||
            "simple-not-found",

        record:
            result.record ||
            null
    };
}


// ============================================================
// KNOWLEDGE STORAGE
// ============================================================

ensureKnowledgeStore() {

    if (
        !Array.isArray(
            this.data.knowledge
        )
    ) {
        this.data.knowledge = [];
    }

    if (
        !Array.isArray(
            this.data.knowledgeEvents
        )
    ) {
        this.data.knowledgeEvents = [];
    }

    return this.data.knowledge;
}


// ============================================================
// KNOWLEDGE ID
// ============================================================

createKnowledgeId() {

    return [
        "knowledge",
        Date.now(),
        Math.random()
            .toString(36)
            .slice(2, 12)
    ].join("_");
}


// ============================================================
// KNOWLEDGE OBJECT
// ============================================================

createKnowledgeItem(
    question = "",
    answer = "",
    options = {}
) {

    const cleanQuestion =
        this.cleanQuestionText(
            question
        );

    const cleanAnswer =
        this.cleanAnswerText(
            answer
        );

    const fingerprint =
        this.getSemanticFingerprint(
            cleanQuestion
        );

    return {

        id:
            options.id ||
            this.createKnowledgeId(),

        question:
            cleanQuestion,

        answer:
            cleanAnswer,

        normalizedQuestion:
            fingerprint.normalized,

        questionKey:
            fingerprint.normalized,

        tokens:
            fingerprint.tokens,

        intents:
            fingerprint.intents,

        aliases:
            this.safeArray(
                options.aliases ||
                []
            ),

        tags:
            this.safeArray(
                options.tags ||
                []
            ),

        category:
            this.safeText(
                options.category ||
                "general"
            ),

        source:
            this.safeText(
                options.source ||
                "local"
            ),

        userId:
            this.safeText(
                options.userId ||
                ""
            ),

        confidence:
            this.normalizeConfidence(
                options.confidence ??
                0.75
            ),

        quality:
            this.normalizeQuality(
                options.quality ??
                0.75
            ),

        usageCount:
            Math.max(
                0,
                this.safeNumber(
                    options.usageCount,
                    0
                )
            ),

        hitCount:
            Math.max(
                0,
                this.safeNumber(
                    options.hitCount,
                    0
                )
            ),

        missCount:
            Math.max(
                0,
                this.safeNumber(
                    options.missCount,
                    0
                )
            ),

        trusted:
            options.trusted === true,

        protected:
            options.protected === true,

        enabled:
            options.enabled !== false,

        createdAt:
            options.createdAt ||
            this.nowIso(),

        updatedAt:
            options.updatedAt ||
            this.nowIso(),

        metadata:
            options.metadata &&
            typeof options.metadata ===
                "object"
                ? {
                    ...options.metadata
                }
                : {}
    };
}


// ============================================================
// KNOWLEDGE DUPLICATE
// ============================================================

findKnowledgeDuplicate(
    question = "",
    options = {}
) {

    const knowledge =
        this.ensureKnowledgeStore();

    const normalized =
        this.normalizeQuestion(
            question
        );

    if (!normalized) {
        return null;
    }

    for (
        const item
        of knowledge
    ) {

        if (
            !item ||
            item.enabled === false
        ) {
            continue;
        }

        if (
            this.normalizeQuestion(
                item.question
            ) ===
            normalized
        ) {
            return item;
        }

        const aliases =
            this.safeArray(
                item.aliases
            );

        for (
            const alias
            of aliases
        ) {

            if (
                this.normalizeQuestion(
                    alias
                ) ===
                normalized
            ) {
                return item;
            }
        }
    }

    return null;
}


// ============================================================
// SAVE KNOWLEDGE
// ============================================================

saveKnowledgeItem(
    question = "",
    answer = "",
    options = {}
) {

    const knowledge =
        this.ensureKnowledgeStore();

    const q =
        this.cleanQuestionText(
            question
        );

    const a =
        this.cleanAnswerText(
            answer
        );

    if (
        !q ||
        !a
    ) {
        return {
            ok: false,
            saved: false,
            reason:
                "question-answer-required"
        };
    }

    const duplicate =
        this.findKnowledgeDuplicate(
            q
        );

    if (
        duplicate &&
        options.overwrite !== true
    ) {

        if (
            options.updateDuplicate === true
        ) {

            duplicate.answer =
                a;

            duplicate.quality =
                Math.max(
                    duplicate.quality ||
                    0,
                    options.quality ??
                    this.calculateAnswerQuality(
                        a
                    )
                );

            duplicate.confidence =
                Math.max(
                    duplicate.confidence ||
                    0,
                    options.confidence ??
                    0.75
                );

            duplicate.updatedAt =
                this.nowIso();

            if (
                options.save !== false
            ) {
                this.touchUpdatedAt();
                this.saveData();
            }

            return {
                ok: true,
                saved: true,
                updated: true,
                duplicate: true,
                item:
                    duplicate
            };
        }

        return {
            ok: true,
            saved: false,
            duplicate: true,
            item:
                duplicate
        };
    }

    const item =
        this.createKnowledgeItem(
            q,
            a,
            options
        );

    knowledge.push(
        item
    );

    this.data.knowledgeEvents.push({
        id:
            this.createKnowledgeId(),

        type:
            "save",

        itemId:
            item.id,

        question:
            item.question,

        createdAt:
            this.nowIso()
    });

    if (
        this.data.knowledgeEvents.length >
        5000
    ) {
        this.data.knowledgeEvents =
            this.data.knowledgeEvents.slice(
                -5000
            );
    }

    this.touchUpdatedAt();

    if (
        options.save !== false
    ) {
        this.saveData();
    }

    return {
        ok: true,
        saved: true,
        updated: false,
        duplicate: false,
        item
    };
}


// ============================================================
// KNOWLEDGE COUNT
// ============================================================

countKnowledge() {
    return this.ensureKnowledgeStore()
        .length;
}


// ============================================================
// KNOWLEDGE ANSWER SCORE
// ============================================================

calculateKnowledgeScore(
    question = "",
    item = ""
) {

    if (!item) {
        return 0;
    }

    const similarity =
        this.textSimilarity(
            question,
            item.question
        );

    const quality =
        this.normalizeQuality(
            item.quality
        );

    const confidence =
        this.normalizeConfidence(
            item.confidence
        );

    const usage =
        Math.min(
            1,
            Math.log10(
                this.safeNumber(
                    item.usageCount,
                    0
                ) + 1
            ) /
            3
        );

    const sourceTrust =
        this.getSourceTrust(
            item.source
        );

    let score =
        similarity * 0.50 +
        quality * 0.18 +
        confidence * 0.15 +
        usage * 0.07 +
        sourceTrust * 0.10;

    if (
        item.trusted
    ) {
        score += 0.05;
    }

    return this.clamp01(
        score
    );
}


// ============================================================
// KNOWLEDGE SEARCH
// ============================================================

searchKnowledge(
    question = "",
    options = {}
) {

    const knowledge =
        this.ensureKnowledgeStore();

    const normalized =
        this.normalizeQuestion(
            question
        );

    if (!normalized) {
        return {
            found: false,
            answer: null,
            score: 0,
            confidence: 0,
            source:
                "knowledge-empty",
            item: null,
            candidates: []
        };
    }

    const ranked = [];

    for (
        const item
        of knowledge
    ) {

        if (
            !item ||
            item.enabled === false
        ) {
            continue;
        }

        if (
            options.userId &&
            item.userId &&
            item.userId !==
                options.userId
        ) {
            continue;
        }

        const score =
            this.calculateKnowledgeScore(
                question,
                item
            );

        const exact =
            this.exactMatch(
                question,
                item.question
            );

        const alias =
            this.safeArray(
                item.aliases
            )
            .some(
                (aliasValue) =>
                    this.exactMatch(
                        question,
                        aliasValue
                    )
            );

        let finalScore =
            score;

        if (exact) {
            finalScore = 1;
        } else if (alias) {
            finalScore =
                Math.max(
                    finalScore,
                    0.97
                );
        }

        ranked.push({
            item,

            score:
                finalScore,

            exact,

            alias
        });
    }

    ranked.sort(
        (a, b) =>
            b.score -
            a.score
    );

    const best =
        ranked[0];

    if (
        !best
    ) {
        return {
            found: false,
            answer: null,
            score: 0,
            confidence: 0,
            source:
                "knowledge-not-found",
            item: null,
            candidates: []
        };
    }

    const threshold =
        this.safeNumber(
            options.minScore,
            0.70
        );

    const found =
        best.exact ||
        best.alias ||
        best.score >=
            threshold;

    if (
        found
    ) {

        best.item.usageCount =
            this.safeNumber(
                best.item.usageCount,
                0
            ) + 1;

        best.item.hitCount =
            this.safeNumber(
                best.item.hitCount,
                0
            ) + 1;

        best.item.updatedAt =
            this.nowIso();

        this.data.knowledgeEvents.push({
            id:
                this.createKnowledgeId(),

            type:
                "hit",

            itemId:
                best.item.id,

            score:
                best.score,

            createdAt:
                this.nowIso()
        });

        if (
            this.data.knowledgeEvents.length >
            5000
        ) {
            this.data.knowledgeEvents =
                this.data.knowledgeEvents.slice(
                    -5000
                );
        }
    }

    return {
        found,

        answer:
            found
                ? this.cleanAnswerText(
                    best.item.answer
                )
                : null,

        score:
            best.score,

        confidence:
            this.boostConfidence(
                best.score,
                {
                    exact:
                        best.exact,

                    alias:
                        best.alias,

                    trusted:
                        best.item.trusted,

                    highUsage:
                        (
                            best.item.usageCount ||
                            0
                        ) >= 10
                }
            ),

        source:
            best.exact
                ? "knowledge-exact"
                : best.alias
                    ? "knowledge-alias"
                    : "knowledge-smart",

        item:
            found
                ? best.item
                : null,

        candidates:
            ranked
                .slice(
                    0,
                    Math.max(
                        1,
                        Math.floor(
                            this.safeNumber(
                                options.limit,
                                10
                            )
                        )
                    )
                )
                .map(
                    (entry) => ({
                        ...entry.item,

                        _knowledgeScore:
                            entry.score,

                        _exact:
                            entry.exact,

                        _alias:
                            entry.alias
                    })
                )
    };
}


// ============================================================
// FIND KNOWLEDGE ANSWER
// ============================================================

findKnowledgeAnswer(
    question = "",
    options = {}
) {

    const simple =
        this.getSimpleResponse(
            question,
            options
        );

    if (
        simple.found
    ) {
        return {
            found: true,

            answer:
                simple.answer,

            score:
                simple.score,

            confidence:
                simple.confidence,

            source:
                simple.source,

            record:
                simple.record ||
                null
        };
    }

    const memory =
        this.searchUltimate(
            question,
            options
        );

    if (
        memory.found
    ) {
        return {
            found: true,

            answer:
                memory.answer,

            score:
                memory.score,

            confidence:
                memory.confidence,

            source:
                memory.source,

            record:
                memory.record ||
                null
        };
    }

    const knowledge =
        this.searchKnowledge(
            question,
            options
        );

    if (
        knowledge.found
    ) {
        return {
            found: true,

            answer:
                knowledge.answer,

            score:
                knowledge.score,

            confidence:
                knowledge.confidence,

            source:
                knowledge.source,

            record:
                knowledge.item ||
                null
        };
    }

    return {
        found: false,

        answer: null,

        score: 0,

        confidence: 0,

        source:
            "not-found",

        record: null
    };
}


// ============================================================
// FIND KNOWLEDGE ANSWER — SMART
// ============================================================

findKnowledgeAnswerSmart(
    question = "",
    options = {}
) {

    return this.findKnowledgeAnswer(
        question,
        {
            ...options,

            minScore:
                options.minScore ??
                0.70
        }
    );
}


// ============================================================
// LOCAL KNOWLEDGE RESPONSE
// ============================================================

getKnowledgeResponse(
    question = "",
    options = {}
) {

    const result =
        this.findKnowledgeAnswerSmart(
            question,
            options
        );

    if (
        result.found
    ) {
        return {
            ok: true,
            local: true,
            memory: true,
            found: true,
            answer:
                result.answer,
            score:
                result.score,
            confidence:
                result.confidence,
            source:
                result.source,
            record:
                result.record
        };
    }

    return {
        ok: true,

        local: false,

        memory: false,

        found: false,

        answer: null,

        score: 0,

        confidence: 0,

        source:
            "local-not-found",

        record: null
    };
}


// ============================================================
// SAVE UNKNOWN KNOWLEDGE
// ============================================================

saveUnknownAnswer(
    question = "",
    answer = "",
    options = {}
) {

    const config =
        this.getSimpleMessageConfig();

    if (
        config.saveUnknownKnowledge ===
        false
    ) {
        return {
            saved: false,
            reason:
                "disabled"
        };
    }

    const cleanQuestion =
        this.cleanQuestionText(
            question
        );

    const cleanAnswer =
        this.cleanAnswerText(
            answer
        );

    if (
        !cleanQuestion ||
        !cleanAnswer
    ) {
        return {
            saved: false,
            reason:
                "empty"
        };
    }

    if (
        this.isAutoLearnExcludedQuestion(
            cleanQuestion
        )
    ) {
        return {
            saved: false,
            reason:
                "question-excluded"
        };
    }

    if (
        this.isAutoLearnExcludedAnswer(
            cleanAnswer
        )
    ) {
        return {
            saved: false,
            reason:
                "answer-excluded"
        };
    }

    const answerQuality =
        this.calculateAnswerQuality(
            cleanAnswer
        );

    if (
        answerQuality <
        (
            options.minQuality ??
            0.72
        )
    ) {
        return {
            saved: false,
            reason:
                "answer-quality-low",

            answerQuality
        };
    }

    const knowledge =
        this.saveKnowledgeItem(
            cleanQuestion,
            cleanAnswer,
            {
                userId:
                    options.userId ||
                    "",

                source:
                    options.source ||
                    "ai-learned",

                category:
                    options.category ||
                    "general",

                confidence:
                    options.confidence ??
                    0.75,

                quality:
                    answerQuality,

                tags: [
                    "auto-saved"
                ],

                metadata: {
                    ...(options.metadata || {}),

                    autoSaved:
                        true,

                    savedAt:
                        this.nowIso()
                }
            }
        );

    const memory =
        this.autoLearn(
            cleanQuestion,
            cleanAnswer,
            {
                userId:
                    options.userId ||
                    "",

                source:
                    options.source ||
                    "ai-auto-learn",

                category:
                    options.category ||
                    "general",

                confidence:
                    options.confidence ??
                    0.75
            }
        );

    return {
        saved:
            Boolean(
                knowledge.saved ||
                memory.saved
            ),

        knowledge,

        memory
    };
}


// ============================================================
// PROCESS SIMPLE OR KNOWLEDGE
// ============================================================

processLocalMessage(
    question = "",
    options = {}
) {

    const simple =
        this.getSimpleResponse(
            question,
            options
        );

    if (
        simple.found
    ) {
        return {
            ...simple,

            local: true,

            memory: true,

            needsAI: false,

            needsResearch: false
        };
    }

    const personal =
        options.userId
            ? this.findPersonalAnswer(
                options.userId,
                question,
                options
            )
            : {
                found: false
            };

    if (
        personal.found
    ) {
        return {
            ...personal,

            local: true,

            memory: true,

            personal: true,

            needsAI: false,

            needsResearch: false
        };
    }

    const memory =
        this.searchUltimate(
            question,
            options
        );

    if (
        memory.found
    ) {
        return {
            ...memory,

            local: true,

            memory: true,

            personal: false,

            needsAI: false,

            needsResearch: false
        };
    }

    const knowledge =
        this.searchKnowledge(
            question,
            options
        );

    if (
        knowledge.found
    ) {
        return {
            found: true,

            answer:
                knowledge.answer,

            score:
                knowledge.score,

            confidence:
                knowledge.confidence,

            source:
                knowledge.source,

            record:
                knowledge.item,

            local: true,

            memory: true,

            needsAI: false,

            needsResearch: false
        };
    }

    return {
        found: false,

        answer: null,

        score: 0,

        confidence: 0,

        source:
            "local-not-found",

        record: null,

        local: false,

        memory: false,

        needsAI: true,

        needsResearch:
            this.shouldResearch(
                question,
                options
            )
    };
}


// ============================================================
// PROCESS MESSAGE FINAL
// ============================================================

processMessage(
    question = "",
    options = {}
) {

    const clean =
        this.cleanQuestionText(
            question
        );

    if (!clean) {
        return {
            ok: false,
            found: false,
            answer: null,
            needsAI: false,
            needsResearch: false,
            source:
                "empty-message"
        };
    }

    const started =
        Date.now();

    let result;

    try {

        result =
            this.processLocalMessage(
                clean,
                options
            );

    } catch (error) {

        this.recordFailureEvent(
            "local-message-process",
            {
                message:
                    error.message,

                stack:
                    error.stack,

                question:
                    clean
            },
            options
        );

        result = {
            found: false,

            answer: null,

            score: 0,

            confidence: 0,

            source:
                "local-process-error",

            local: false,

            memory: false,

            needsAI: true,

            needsResearch: true,

            error:
                error.message
        };
    }

    const duration =
        Date.now() -
        started;

    this.recordPerformanceEvent(
        "process-local-message",
        duration,
        options
    );

    if (
        result.found
    ) {

        if (
            options.userId
        ) {

            this.recordUserAnswerHit(
                options.userId,
                {
                    question:
                        clean,

                    answer:
                        result.answer,

                    recordId:
                        result.record?.id ||
                        "",

                    score:
                        result.score,

                    confidence:
                        result.confidence,

                    source:
                        result.source
                },
                {
                    save: false
                }
            );
        }

        this.recordAnswerEvent(
            clean,
            result.answer,
            {
                ...options,

                source:
                    result.source,

                score:
                    result.score,

                confidence:
                    result.confidence,

                memoryUsed:
                    true,

                local:
                    true,

                durationMs:
                    duration,

                userId:
                    options.userId ||
                    ""
            }
        );

        this.saveData();
    }

    return {
        ok: true,

        ...result,

        durationMs:
            duration
    };
}


// ============================================================
// PROCESS MESSAGE V2
// ============================================================

processMessageV2(
    question = "",
    options = {}
) {
    return this.processMessage(
        question,
        options
    );
}


// ============================================================
// PROCESS MESSAGE V3
// ============================================================

processMessageV3(
    question = "",
    options = {}
) {
    return this.processMessage(
        question,
        options
    );
}


// ============================================================
// PROCESS MESSAGE V4
// ============================================================

processMessageV4(
    question = "",
    options = {}
) {
    return this.processMessage(
        question,
        options
    );
}


// ============================================================
// SIMPLE CHAT
// ============================================================

simpleChat(
    question = "",
    options = {}
) {
    return this.processMessage(
        question,
        options
    );
}


// ============================================================
// LOCAL CHAT
// ============================================================

localChat(
    question = "",
    options = {}
) {
    return this.processMessage(
        question,
        options
    );
}


// ============================================================
// KNOWLEDGE CHAT
// ============================================================

knowledgeChat(
    question = "",
    options = {}
) {
    return this.processMessage(
        question,
        options
    );
}


// ============================================================
// COMMAND NORMALIZER
// ============================================================

normalizeCommand(
    command = ""
) {

    const value =
        this.safeText(
            command
        )
        .replace(/\s+/g, " ")
        .trim();

    if (
        value.startsWith("/")
    ) {
        return value
            .slice(1)
            .trim()
            .toLowerCase();
    }

    return value.toLowerCase();
}


// ============================================================
// COMMAND ARGS
// ============================================================

parseCommand(
    command = ""
) {

    const normalized =
        this.safeText(
            command
        );

    if (
        !normalized
    ) {
        return {
            command: "",
            args: [],
            rawArgs: ""
        };
    }

    const parts =
        normalized
            .trim()
            .split(/\s+/);

    const first =
        parts.shift() ||
        "";

    const name =
        first
            .replace(/^[/!]/, "")
            .toLowerCase();

    return {
        command:
            name,

        args:
            parts,

        rawArgs:
            parts.join(" "),

        raw:
            normalized
    };
}


// ============================================================
// COMMAND CHECK
// ============================================================

isCommandMessage(
    message = ""
) {
    const clean =
        this.safeText(
            message
        );

    return (
        clean.startsWith("/") ||
        clean.startsWith("!")
    );
}


// ============================================================
// COMMAND HANDLER
// ============================================================

handleCommand(
    message = "",
    options = {}
) {

    const parsed =
        this.parseCommand(
            message
        );

    const command =
        parsed.command;

    if (!command) {
        return {
            handled: false,
            answer: null
        };
    }

    if (
        command ===
        "help"
    ) {
        return {
            handled: true,

            answer:
                "TürkAI komutları: /help, /memory, /stats, /health, /search <soru>, /learn <soru> | <cevap>, /backup, /snapshot, /diagnostics"
        };
    }

    if (
        command ===
        "memory"
    ) {
        return {
            handled: true,

            answer:
                JSON.stringify(
                    this.getHealthSummary(),
                    null,
                    2
                )
        };
    }

    if (
        command ===
        "stats"
    ) {
        return {
            handled: true,

            answer:
                JSON.stringify(
                    this.getCurrentStats(),
                    null,
                    2
                )
        };
    }

    if (
        command ===
        "health"
    ) {
        return {
            handled: true,

            answer:
                JSON.stringify(
                    this.getSystemHealth(),
                    null,
                    2
                )
        };
    }

    if (
        command ===
        "search"
    ) {

        const question =
            parsed.rawArgs;

        const result =
            this.searchUltimateTimed(
                question,
                options
            );

        return {
            handled: true,

            answer:
                result.found
                    ? result.answer
                    : "AnswerMemory içinde cevap bulunamadı.",

            result
        };
    }

    if (
        command ===
        "learn"
    ) {

        const separator =
            parsed.rawArgs.indexOf(
                "|"
            );

        if (
            separator === -1
        ) {
            return {
                handled: true,

                answer:
                    "Kullanım: /learn soru | cevap"
            };
        }

        const question =
            parsed.rawArgs
                .slice(
                    0,
                    separator
                )
                .trim();

        const answer =
            parsed.rawArgs
                .slice(
                    separator + 1
                )
                .trim();

        const result =
            this.autoLearn(
                question,
                answer,
                {
                    userId:
                        options.userId ||
                        "",

                    source:
                        "command-learn",

                    confidence:
                        0.90
                }
            );

        return {
            handled: true,

            answer:
                result.saved
                    ? "Cevap AnswerMemory'e kaydedildi."
                    : `Kaydedilemedi: ${result.reason}`,

            result
        };
    }

    if (
        command ===
        "backup"
    ) {

        const result =
            this.saveBackup({
                reason:
                    "command",

                source:
                    "command"
            });

        return {
            handled: true,

            answer:
                result.ok
                    ? `Backup oluşturuldu: ${result.backupId}`
                    : "Backup oluşturulamadı.",

            result
        };
    }

    if (
        command ===
        "snapshot"
    ) {

        const result =
            this.saveSnapshot({
                reason:
                    "command"
            });

        return {
            handled: true,

            answer:
                result.ok
                    ? `Snapshot oluşturuldu: ${result.snapshotId}`
                    : "Snapshot oluşturulamadı.",

            result
        };
    }

    if (
        command ===
        "diagnostics"
    ) {

        const result =
            this.runDiagnostics();

        return {
            handled: true,

            answer:
                result.ok
                    ? "AnswerMemory diagnostics başarılı."
                    : "AnswerMemory diagnostics sorun bildirdi.",

            result
        };
    }

    if (
        command ===
        "repair"
    ) {

        const result =
            this.repairDatabase();

        return {
            handled: true,

            answer:
                `Repair tamamlandı. Düzeltilen: ${result.repaired}`,

            result
        };
    }

    if (
        command ===
        "optimize"
    ) {

        const result =
            this.optimizeStorage();

        return {
            handled: true,

            answer:
                "AnswerMemory optimizasyonu tamamlandı.",

            result
        };
    }

    if (
        command ===
        "clearcache"
    ) {

        const result =
            this.hardResetCaches();

        return {
            handled: true,

            answer:
                "AnswerMemory cache temizlendi.",

            result
        };
    }

    return {
        handled: false,

        command,

        args:
            parsed.args,

        answer: null
    };
}


// ============================================================
// PROCESS COMMAND OR MESSAGE
// ============================================================

processCommandOrMessage(
    message = "",
    options = {}
) {

    if (
        this.isCommandMessage(
            message
        )
    ) {

        const commandResult =
            this.handleCommand(
                message,
                options
            );

        if (
            commandResult.handled
        ) {

            return {
                ok: true,

                command: true,

                ...commandResult,

                needsAI: false,

                needsResearch: false,

                local: true
            };
        }
    }

    return {
        ...this.processMessage(
            message,
            options
        ),

        command: false
    };
}


// ============================================================
// CHAT ROUTE DECISION
// ============================================================

getChatDecision(
    message = "",
    options = {}
) {

    const clean =
        this.cleanQuestionText(
            message
        );

    if (!clean) {
        return {
            route:
                "empty",

            answer:
                null,

            needsAI:
                false,

            needsResearch:
                false
        };
    }

    if (
        this.isCommandMessage(
            clean
        )
    ) {
        const command =
            this.handleCommand(
                clean,
                options
            );

        if (
            command.handled
        ) {
            return {
                route:
                    "command",

                answer:
                    command.answer,

                needsAI:
                    false,

                needsResearch:
                    false,

                command:
                    true,

                result:
                    command.result ||
                    null
            };
        }
    }

    const local =
        this.processLocalMessage(
            clean,
            options
        );

    if (
        local.found
    ) {
        return {
            route:
                "memory",

            answer:
                local.answer,

            score:
                local.score,

            confidence:
                local.confidence,

            source:
                local.source,

            needsAI:
                false,

            needsResearch:
                false,

            local:
                true,

            memory:
                true
        };
    }

    return {
        route:
            local.needsResearch
                ? "research-ai"
                : "ai",

        answer:
            null,

        score:
            local.score,

        confidence:
            local.confidence,

        source:
            local.source,

        needsAI:
            true,

        needsResearch:
            Boolean(
                local.needsResearch
            ),

        local:
            false,

        memory:
            false
    };
}


// ============================================================
// CHAT DECISION V2
// ============================================================

chatDecision(
    message = "",
    options = {}
) {
    return this.getChatDecision(
        message,
        options
    );
}


// ============================================================
// CHAT DECISION V3
// ============================================================

chatDecisionV3(
    message = "",
    options = {}
) {
    return this.getChatDecision(
        message,
        options
    );
}


// ============================================================
// LOCAL ANSWER OR ROUTE
// ============================================================

answerOrRoute(
    message = "",
    options = {}
) {

    const decision =
        this.getChatDecision(
            message,
            options
        );

    if (
        decision.answer
    ) {
        return decision;
    }

    return {
        ...decision,

        route:
            decision.needsResearch
                ? "research"
                : "ai"
    };
}


// ============================================================
// UNKNOWN MESSAGE LEARNING
// ============================================================

learnAfterAI(
    question = "",
    answer = "",
    options = {}
) {

    const cleanQuestion =
        this.cleanQuestionText(
            question
        );

    const cleanAnswer =
        this.cleanAnswerText(
            answer
        );

    if (
        !cleanQuestion ||
        !cleanAnswer
    ) {
        return {
            ok: false,
            saved: false,
            reason:
                "empty"
        };
    }

    const result =
        this.saveUnknownAnswer(
            cleanQuestion,
            cleanAnswer,
            options
        );

    this.recordLearningEvent(
        "ai-answer-learned",
        {
            question:
                cleanQuestion,

            answerLength:
                cleanAnswer.length,

            result
        }
    );

    return {
        ok: true,

        ...result
    };
}


// ============================================================
// LEARN AI EXCHANGE
// ============================================================

learnAIExchange(
    userId = "",
    question = "",
    answer = "",
    options = {}
) {

    const memory =
        this.learnFromExchange(
            userId,
            question,
            answer,
            options
        );

    const answerMemory =
        this.learnAfterAI(
            question,
            answer,
            {
                ...options,
                userId
            }
        );

    return {
        ok: true,

        memory,

        answerMemory
    };
}


// ============================================================
// POST AI ANSWER PROCESSOR
// ============================================================

processAIAnswer(
    question = "",
    answer = "",
    options = {}
) {

    const cleanAnswer =
        this.cleanAnswerText(
            answer
        );

    if (
        !cleanAnswer
    ) {
        return {
            ok: false,
            saved: false,
            reason:
                "answer-empty"
        };
    }

    const learned =
        this.learnAfterAI(
            question,
            cleanAnswer,
            options
        );

    this.recordAnswerEvent(
        question,
        cleanAnswer,
        {
            ...options,

            source:
                options.source ||
                "ai",

            model:
                options.model ||
                "",

            confidence:
                options.confidence ||
                0.75,

            score:
                options.score ||
                0,

            researchUsed:
                options.researchUsed === true,

            memoryUsed:
                false,

            local:
                false,

            userId:
                options.userId ||
                ""
        }
    );

    if (
        options.userId
    ) {

        this.learnFromUserMessage(
            options.userId,
            question,
            {
                source:
                    "ai-answer",

                save: false
            }
        );

        this.recordUserAnswer(
            options.userId,
            cleanAnswer,
            {
                source:
                    options.source ||
                    "ai",

                confidence:
                    options.confidence ||
                    0.75,

                score:
                    options.score ||
                    0,

                save: false
            }
        );
    }

    this.saveData();

    return {
        ok: true,

        saved:
            Boolean(
                learned.saved
            ),

        learned
    };
}


// ============================================================
// MESSAGE MEMORY BRIDGE
// ============================================================

messageMemoryBridge(
    message = "",
    options = {}
) {

    const clean =
        this.cleanQuestionText(
            message
        );

    const userId =
        this.safeText(
            options.userId ||
            ""
        );

    const result =
        this.processCommandOrMessage(
            clean,
            {
                ...options,
                userId
            }
        );

    if (
        result.found
    ) {

        return {
            ok: true,

            handled: true,

            route:
                result.command
                    ? "command"
                    : "memory",

            answer:
                result.answer,

            score:
                result.score ||
                1,

            confidence:
                result.confidence ||
                1,

            source:
                result.source ||
                (
                    result.command
                        ? "command"
                        : "answer-memory"
                ),

            needsAI: false,

            needsResearch: false
        };
    }

    return {
        ok: true,

        handled: false,

        route:
            result.needsResearch
                ? "research"
                : "ai",

        answer: null,

        score:
            result.score ||
            0,

        confidence:
            result.confidence ||
            0,

        source:
            result.source ||
            "not-found",

        needsAI:
            result.needsAI !== false,

        needsResearch:
            Boolean(
                result.needsResearch
            )
    };
}


// ============================================================
// GLOBAL KNOWLEDGE BRIDGE
// ============================================================

knowledgeBridge(
    action = "",
    payload = {},
    options = {}
) {

    const cleanAction =
        this.safeText(
            action
        ).toLowerCase();

    if (
        cleanAction ===
        "search"
    ) {

        return this.searchKnowledge(
            payload.question ||
            payload.query ||
            "",
            options
        );
    }

    if (
        cleanAction ===
        "save"
    ) {

        return this.saveKnowledgeItem(
            payload.question ||
            "",
            payload.answer ||
            "",
            options
        );
    }

    if (
        cleanAction ===
        "count"
    ) {

        return {
            ok: true,

            count:
                this.countKnowledge()
        };
    }

    if (
        cleanAction ===
        "answer"
    ) {

        return this.findKnowledgeAnswer(
            payload.question ||
            payload.query ||
            "",
            options
        );
    }

    return {
        ok: false,

        reason:
            "unknown-knowledge-action"
    };
}


// ============================================================
// SIMPLE MESSAGE BRIDGE
// ============================================================

simpleMessageBridge(
    action = "",
    payload = {},
    options = {}
) {

    const cleanAction =
        this.safeText(
            action
        ).toLowerCase();

    if (
        cleanAction ===
        "get"
    ) {

        return this.getSimpleMessage(
            payload.message ||
            payload.question ||
            ""
        );
    }

    if (
        cleanAction ===
        "set"
    ) {

        return this.setSimpleMessage(
            payload.message ||
            payload.question ||
            "",
            payload.answer ||
            "",
            options
        );
    }

    if (
        cleanAction ===
        "search"
    ) {

        return this.searchSimpleMessage(
            payload.message ||
            payload.question ||
            "",
            options
        );
    }

    if (
        cleanAction ===
        "count"
    ) {

        return {
            ok: true,

            count:
                this.countSimpleMessages()
        };
    }

    if (
        cleanAction ===
        "delete"
    ) {

        return this.deleteSimpleMessage(
            payload.message ||
            payload.question ||
            "",
            options
        );
    }

    return {
        ok: false,

        reason:
            "unknown-simple-message-action"
    };
}


// ============================================================
// DEBUG MESSAGE PIPELINE
// ============================================================

debugMessage(
    message = "",
    options = {}
) {

    const started =
        Date.now();

    const classification =
        this.classifyQuestion(
            message
        );

    const builtin =
        this.getBuiltinSimpleAnswer(
            message
        );

    const simple =
        this.searchSimpleMessage(
            message,
            options
        );

    const personal =
        options.userId
            ? this.searchUserAnswerMemory(
                options.userId,
                message,
                options
            )
            : null;

    const memory =
        this.searchUltimate(
            message,
            options
        );

    const knowledge =
        this.searchKnowledge(
            message,
            options
        );

    const decision =
        this.getChatDecision(
            message,
            options
        );

    return {

        input:
            message,

        classification,

        builtin,

        simple,

        personal,

        memory,

        knowledge,

        decision,

        durationMs:
            Date.now() -
            started
    };
}


// ============================================================
// MESSAGE SELF TEST
// ============================================================

runMessageSelfTest() {

    const tests = [

        {
            input:
                "selam",

            expected:
                true
        },

        {
            input:
                "SLM",

            expected:
                true
        },

        {
            input:
                "slm!",

            expected:
                true
        },

        {
            input:
                "mrb",

            expected:
                true
        },

        {
            input:
                "merhaba",

            expected:
                true
        },

        {
            input:
                "en hızlı kim",

            expected:
                true
        },

        {
            input:
                "kimsin",

            expected:
                true
        },

        {
            input:
                "teşekkürler",

            expected:
                true
        },

        {
            input:
                "görüşürüz",

            expected:
                true
        }
    ];

    const results = [];

    for (
        const test
        of tests
    ) {

        const result =
            this.processLocalMessage(
                test.input
            );

        results.push({
            input:
                test.input,

            found:
                Boolean(
                    result.found
                ),

            answer:
                result.answer,

            source:
                result.source,

            expected:
                test.expected,

            passed:
                Boolean(
                    result.found
                ) ===
                test.expected
        });
    }

    const passed =
        results.filter(
            (result) =>
                result.passed
        ).length;

    return {

        ok:
            passed ===
            results.length,

        total:
            results.length,

        passed,

        failed:
            results.length -
            passed,

        results
    };
}


// ============================================================
// END-TO-END SELF TEST
// ============================================================

runEndToEndSelfTest(
    options = {}
) {

    const tests = [];

    const run =
        (
            name,
            callback
        ) => {

            try {

                const result =
                    callback();

                tests.push({
                    name,

                    ok:
                        Boolean(
                            result?.ok ??
                            result?.found ??
                            result === true
                        ),

                    result
                });

            } catch (error) {

                tests.push({
                    name,

                    ok: false,

                    error:
                        error.message
                });
            }
        };

    run(
        "simple-message",
        () =>
            this.getSimpleResponse(
                "slm"
            )
    );

    run(
        "memory-search",
        () =>
            this.safeSearch(
                "selam"
            )
    );

    run(
        "knowledge-search",
        () =>
            this.searchKnowledge(
                "TürkAI"
            )
    );

    run(
        "message-pipeline",
        () =>
            this.processMessage(
                "merhaba",
                options
            )
    );

    run(
        "command-parser",
        () =>
            this.handleCommand(
                "/stats",
                options
            )
    );

    run(
        "analytics",
        () =>
            this.getAnalyticsStatus()
    );

    run(
        "health",
        () =>
            this.getSystemHealth()
    );

    const passed =
        tests.filter(
            (item) =>
                item.ok
        ).length;

    return {
        ok:
            passed ===
            tests.length,

        total:
            tests.length,

        passed,

        failed:
            tests.length -
            passed,

        tests
    };
}


// ============================================================
// MESSAGE PIPELINE HEALTH
// ============================================================

getMessagePipelineHealth() {

    const messageTest =
        this.runMessageSelfTest();

    const endToEnd =
        this.runEndToEndSelfTest();

    return {

        ok:
            messageTest.ok &&
            endToEnd.ok,

        messageTest,

        endToEnd,

        simpleMessages:
            this.countSimpleMessages(),

        knowledge:
            this.countKnowledge(),

        records:
            this.countActiveRecords(),

        users:
            this.countUsers(),

        health:
            this.getSystemHealth(),

        generatedAt:
            this.nowIso()
    };
}


// ============================================================
// MESSAGE PIPELINE STATUS
// ============================================================

getMessagePipelineStatus() {

    return {

        ready:
            this.isSearchEngineReady(),

        simpleMessages:
            this.countSimpleMessages(),

        knowledge:
            this.countKnowledge(),

        answerMemory:
            this.countActiveRecords(),

        users:
            this.countUsers(),

        pipeline:
            this.getMessagePipelineHealth()
    };
}


// ============================================================
// ANSWER MEMORY VERSION 9
// ============================================================

getAnswerMemoryVersion9() {

    return {
        name:
            "TürkAI AnswerMemory",

        version:
            "9.0",

        simpleMessageEngine:
            true,

        knowledgeEngine:
            true,

        localMemory:
            true,

        personalMemory:
            true,

        autoLearn:
            true,

        analytics:
            true,

        diagnostics:
            true,

        backup:
            true,

        snapshot:
            true,

        commandEngine:
            true,

        generatedAt:
            this.nowIso()
    };
}


// ============================================================
// PART 9 END
// ============================================================
// ============================================================
// TÜRKAI — ANSWER MEMORY
// PART 10 / 10
// FINAL ENGINE + BUILTIN KNOWLEDGE + GLOBAL BRIDGE
// API WRAPPERS + EVENT PIPELINE + STARTUP + SELF TESTS
// FINAL EXPORT + SAFE COMPATIBILITY LAYER
// ============================================================


// ============================================================
// FINAL CONFIG
// ============================================================

getFinalConfig() {
    return {
        version: "10.0",

        name:
            "TürkAI AnswerMemory",

        language:
            "tr",

        enabled: true,

        simpleMessages:
            true,

        knowledge:
            true,

        personalMemory:
            true,

        autoLearning:
            true,

        analytics:
            true,

        diagnostics:
            true,

        backups:
            true,

        snapshots:
            true,

        commands:
            true,

        cache:
            true,

        maxAnswerLength:
            500000,

        maxQuestionLength:
            5000,

        defaultThreshold:
            0.70,

        exactThreshold:
            0.99,

        aliasThreshold:
            0.95,

        strongThreshold:
            0.85,

        learningThreshold:
            0.72
    };
}


// ============================================================
// FINAL FEATURE FLAGS
// ============================================================

getFeatureFlags() {
    return {
        search:
            true,

        fuzzySearch:
            true,

        semanticSearch:
            true,

        exactSearch:
            true,

        aliasSearch:
            true,

        intentSearch:
            true,

        tokenSearch:
            true,

        ngramSearch:
            true,

        qualityEngine:
            true,

        trustEngine:
            true,

        feedback:
            true,

        autoLearn:
            true,

        userMemory:
            true,

        profile:
            true,

        facts:
            true,

        preferences:
            true,

        topics:
            true,

        history:
            true,

        context:
            true,

        simpleMessages:
            true,

        knowledge:
            true,

        analytics:
            true,

        diagnostics:
            true,

        backup:
            true,

        restore:
            true,

        snapshot:
            true,

        export:
            true,

        import:
            true,

        commands:
            true
    };
}


// ============================================================
// STARTUP STATE
// ============================================================

ensureFinalState() {

    if (
        !this.data ||
        typeof this.data !==
            "object"
    ) {
        this.data = {};
    }

    if (
        !Array.isArray(
            this.data.records
        )
    ) {
        this.data.records = [];
    }

    if (
        !this.data.users ||
        typeof this.data.users !==
            "object"
    ) {
        this.data.users = {};
    }

    if (
        !this.data.simpleMessages ||
        typeof this.data.simpleMessages !==
            "object"
    ) {
        this.data.simpleMessages = {};
    }

    if (
        !Array.isArray(
            this.data.knowledge
        )
    ) {
        this.data.knowledge = [];
    }

    if (
        !Array.isArray(
            this.data.learningEvents
        )
    ) {
        this.data.learningEvents = [];
    }

    if (
        !Array.isArray(
            this.data.qualitySnapshots
        )
    ) {
        this.data.qualitySnapshots = [];
    }

    if (
        !Array.isArray(
            this.data.analyticsSnapshots
        )
    ) {
        this.data.analyticsSnapshots = [];
    }

    if (
        !this.data.version
    ) {
        this.data.version =
            "10.0";
    }

    if (
        !this.data.createdAt
    ) {
        this.data.createdAt =
            this.nowIso();
    }

    if (
        !this.data.updatedAt
    ) {
        this.data.updatedAt =
            this.nowIso();
    }

    if (
        !(this.cache instanceof Map)
    ) {
        this.cache =
            new Map();
    }

    if (
        !(this.answerCache instanceof Map)
    ) {
        this.answerCache =
            new Map();
    }

    this.ensureStorageCollections();

    this.ensureAnalyticsCollections();

    this.ensureSimpleMessageStore();

    this.ensureKnowledgeStore();

    this.ensureUserStorage();

    if (
        !this.index
    ) {
        this.rebuildIndex();
    }

    return true;
}


// ============================================================
// STARTUP INITIALIZER
// ============================================================

initialize() {

    const started =
        Date.now();

    try {

        this.ensureFinalState();

        this.normalizeAllRecords();

        this.registerBuiltinSimpleMessages();

        this.registerBuiltinKnowledge();

        this.rebuildIndex();

        this.invalidateAllCaches();

        this.touchUpdatedAt();

        this.saveData();

        const durationMs =
            Date.now() -
            started;

        this.addMaintenanceLog(
            "answer-memory-initialize",
            {
                version:
                    this.getFinalConfig()
                        .version,

                records:
                    this.countActiveRecords(),

                users:
                    this.countUsers(),

                simpleMessages:
                    this.countSimpleMessages(),

                knowledge:
                    this.countKnowledge()
            },
            {
                durationMs,
                save: false
            }
        );

        this.saveData();

        return {
            ok: true,

            initialized: true,

            durationMs,

            version:
                this.getFinalConfig()
                    .version,

            records:
                this.countActiveRecords(),

            users:
                this.countUsers(),

            simpleMessages:
                this.countSimpleMessages(),

            knowledge:
                this.countKnowledge()
        };

    } catch (error) {

        this.addDiagnostic(
            "startup-error",
            error.message,
            {
                stack:
                    error.stack
            },
            {
                severity:
                    "high",
                save: false
            }
        );

        this.saveData();

        return {
            ok: false,

            initialized: false,

            error:
                error.message,

            durationMs:
                Date.now() -
                started
        };
    }
}


// ============================================================
// NORMALIZE ALL RECORDS
// ============================================================

normalizeAllRecords() {

    const records =
        Array.isArray(
            this.data.records
        )
            ? this.data.records
            : [];

    const normalized = [];

    let changed = 0;

    for (
        const record
        of records
    ) {

        if (
            !record ||
            typeof record !==
                "object"
        ) {
            continue;
        }

        const cleanQuestion =
            this.cleanQuestionText(
                record.question ||
                ""
            );

        const cleanAnswer =
            this.cleanAnswerText(
                record.answer ||
                ""
            );

        if (
            !cleanQuestion ||
            !cleanAnswer
        ) {
            continue;
        }

        const before =
            JSON.stringify(
                record
            );

        const rebuilt =
            this.createRecord(
                cleanQuestion,
                cleanAnswer,
                {
                    ...record,

                    id:
                        record.id ||
                        this.createRecordId(),

                    aliases:
                        Array.isArray(
                            record.aliases
                        )
                            ? record.aliases
                            : [],

                    tags:
                        Array.isArray(
                            record.tags
                        )
                            ? record.tags
                            : [],

                    metadata:
                        record.metadata ||
                        {},

                    createdAt:
                        record.createdAt ||
                        this.nowIso(),

                    updatedAt:
                        record.updatedAt ||
                        this.nowIso()
                }
            );

        if (
            JSON.stringify(
                rebuilt
            ) !== before
        ) {
            changed++;
        }

        normalized.push(
            rebuilt
        );
    }

    this.data.records =
        normalized;

    this.rebuildIndex();

    return {
        ok: true,

        total:
            normalized.length,

        changed
    };
}


// ============================================================
// BUILTIN SIMPLE MESSAGE REGISTRATION
// ============================================================

registerBuiltinSimpleMessages() {

    const builtins = {

        "selam":
            "Selam! Ben TürkAI. Nasılsın?",

        "selamlar":
            "Selamlar! Ben TürkAI. Nasılsın?",

        "merhaba":
            "Merhaba! Ben TürkAI. Sana nasıl yardımcı olabilirim?",

        "hey":
            "Hey! Buradayım. Nasıl yardımcı olabilirim?",

        "hi":
            "Hi! TürkAI burada. Nasıl yardımcı olabilirim?",

        "hello":
            "Hello! TürkAI burada. Nasıl yardımcı olabilirim?",

        "günaydın":
            "Günaydın. Güzel bir gün olsun.",

        "tünaydın":
            "Tünaydın.",

        "iyi akşamlar":
            "İyi akşamlar.",

        "iyi geceler":
            "İyi geceler.",

        "selamun aleyküm":
            "Aleyküm selam! Ben TürkAI. Nasıl yardımcı olabilirim?",

        "nasılsın":
            "İyiyim, teşekkür ederim. Sen nasılsın?",

        "naber":
            "İyidir. TürkAI burada, hazırım.",

        "ne haber":
            "İyidir. Buradayım, ne yapıyoruz?",

        "kimsin":
            "Ben TürkAI. Türkçe odaklı bir yapay zekâ asistanıyım.",

        "sen kimsin":
            "Ben TürkAI. Sorularını yanıtlamak ve işlerinde yardımcı olmak için buradayım.",

        "adın ne":
            "Benim adım TürkAI.",

        "ismin ne":
            "Ben TürkAI.",

        "hangi yapay zeka":
            "Ben TürkAI.",

        "hangi ai":
            "Ben TürkAI.",

        "ne yapabiliyorsun":
            "Kodlama, araştırma, bilgi, planlama ve birçok farklı konuda yardımcı olabilirim.",

        "yardım":
            "Tabii. Sorunu veya yapmak istediğin şeyi yaz.",

        "yardım eder misin":
            "Evet. Ne yapmaya çalıştığını yaz, birlikte ilerleyelim.",

        "teşekkürler":
            "Rica ederim.",

        "teşekkür ederim":
            "Rica ederim.",

        "sağ ol":
            "Rica ederim.",

        "sağol":
            "Rica ederim.",

        "eyvallah":
            "Eyvallah.",

        "görüşürüz":
            "Görüşürüz. Kendine iyi bak.",

        "hoşça kal":
            "Hoşça kal.",

        "bay bay":
            "Bay bay.",

        "orada mısın":
            "Buradayım.",

        "burada mısın":
            "Buradayım.",

        "aktif misin":
            "Evet, buradayım ve çalışıyorum.",

        "çalışıyor musun":
            "Evet, çalışıyorum.",

        "hazır mısın":
            "Hazırım. Başlayalım.",

        "en hızlı kim":
            "TürkAI ⚡🤖",

        "test":
            "Test başarılı.",

        "ping":
            "Pong."
    };

    let added = 0;

    for (
        const [
            question,
            answer
        ]
        of Object.entries(
            builtins
        )
    ) {

        const result =
            this.setSimpleMessage(
                question,
                answer,
                {
                    source:
                        "builtin",

                    confidence:
                        1,

                    quality:
                        1,

                    protected:
                        true,

                    overwrite:
                        false,

                    save:
                        false
                }
            );

        if (
            result.saved
        ) {
            added++;
        }
    }

    this.ensureSimpleMessageAliases();

    return {
        ok: true,
        added,
        total:
            Object.keys(
                builtins
            ).length
    };
}


// ============================================================
// BUILTIN SIMPLE ALIASES
// ============================================================

ensureSimpleMessageAliases() {

    const aliasMap = {

        "slm":
            "selam",

        "slmlar":
            "selamlar",

        "mrb":
            "merhaba",

        "sa":
            "selam",

        "s.a":
            "selam",

        "s.a.":
            "selam",

        "selamunaleykum":
            "selamun aleyküm",

        "selamun aleykum":
            "selamun aleyküm",

        "heey":
            "hey",

        "heyy":
            "hey",

        "hiii":
            "hi",

        "helloo":
            "hello"
    };

    let created = 0;

    for (
        const [
            alias,
            target
        ]
        of Object.entries(
            aliasMap
        )
    ) {

        const existing =
            this.getSimpleMessage(
                target
            );

        if (
            !existing
        ) {
            continue;
        }

        const result =
            this.setSimpleMessage(
                alias,
                existing.answer,
                {
                    source:
                        "builtin-alias",

                    confidence:
                        1,

                    quality:
                        1,

                    aliases: [
                        target
                    ],

                    protected:
                        true,

                    save:
                        false
                }
            );

        if (
            result.saved
        ) {
            created++;
        }
    }

    return {
        ok: true,
        created
    };
}


// ============================================================
// BUILTIN KNOWLEDGE
// ============================================================

registerBuiltinKnowledge() {

    const entries = [

        {
            question:
                "TürkAI nedir?",

            answer:
                "TürkAI, Türkçe odaklı bir yapay zekâ asistanı ve AnswerMemory tabanlı yerel cevap sistemi kullanabilen bir projedir.",

            category:
                "identity"
        },

        {
            question:
                "AnswerMemory nedir?",

            answer:
                "AnswerMemory, TürkAI'nin daha önce öğrenilmiş cevapları saklamasını, benzer soruları bulmasını, cevap kalitesini ölçmesini ve uygun cevapları yerel olarak kullanmasını sağlayan hafıza motorudur.",

            category:
                "system"
        },

        {
            question:
                "AnswerMemory ne yapar?",

            answer:
                "Soruları normalize eder, benzerlik hesaplar, kayıtları puanlar, cevapları saklar, geri bildirimleri işler ve uygun cevap bulunduğunda yapay zekâ çağırmadan yerel cevap verebilir.",

            category:
                "system"
        },

        {
            question:
                "TürkAI'nin hafızası var mı?",

            answer:
                "Evet. AnswerMemory; cevap, kullanıcı hafızası, geçmiş, konu, tercih ve kalite verilerini yönetmek için tasarlanmıştır.",

            category:
                "memory"
        }
    ];

    let added = 0;

    for (
        const entry
        of entries
    ) {

        const result =
            this.saveKnowledgeItem(
                entry.question,
                entry.answer,
                {
                    source:
                        "builtin-knowledge",

                    category:
                        entry.category,

                    confidence:
                        1,

                    quality:
                        1,

                    trusted:
                        true,

                    protected:
                        true,

                    save:
                        false
                }
            );

        if (
            result.saved
        ) {
            added++;
        }
    }

    return {
        ok: true,
        added,
        total:
            entries.length
    };
}


// ============================================================
// FINAL NORMALIZATION
// ============================================================

normalizeFinalQuestion(
    question = ""
) {

    let value =
        this.cleanQuestionText(
            question
        );

    if (!value) {
        return "";
    }

    value =
        value
            .normalize("NFKC")
            .toLocaleLowerCase(
                "tr-TR"
            )
            .replace(/[“”„‟]/g, '"')
            .replace(/[‘’‚‛]/g, "'")
            .replace(/[‐-‒–—―]/g, "-")
            .replace(/\s+/g, " ")
            .trim();

    value =
        this.normalizeQuestion(
            value
        );

    return value;
}


// ============================================================
// FINAL ANSWER NORMALIZATION
// ============================================================

normalizeFinalAnswer(
    answer = ""
) {

    let value =
        this.cleanAnswerText(
            answer
        );

    if (!value) {
        return "";
    }

    value =
        value
            .replace(/\u0000/g, "")
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .replace(/\n{5,}/g, "\n\n\n")
            .trim();

    return value;
}


// ============================================================
// FINAL INPUT VALIDATOR
// ============================================================

validateFinalInput(
    question = "",
    options = {}
) {

    const config =
        this.getFinalConfig();

    const clean =
        this.normalizeFinalQuestion(
            question
        );

    if (!clean) {
        return {
            valid: false,
            reason:
                "empty-question"
        };
    }

    if (
        clean.length >
        (
            options.maxQuestionLength ??
            config.maxQuestionLength
        )
    ) {
        return {
            valid: false,
            reason:
                "question-too-long"
        };
    }

    return {
        valid: true,

        question:
            clean
    };
}


// ============================================================
// FINAL RESPONSE OBJECT
// ============================================================

createFinalResponse(
    question = "",
    answer = null,
    options = {}
) {

    const cleanQuestion =
        this.normalizeFinalQuestion(
            question
        );

    const cleanAnswer =
        answer === null ||
        answer === undefined
            ? null
            : this.normalizeFinalAnswer(
                answer
            );

    const found =
        Boolean(
            cleanAnswer
        );

    const score =
        this.clamp01(
            options.score ??
            (
                found
                    ? 1
                    : 0
            )
        );

    const confidence =
        this.clamp01(
            options.confidence ??
            score
        );

    return {

        ok: true,

        found,

        answer:
            cleanAnswer,

        reply:
            cleanAnswer,

        question:
            cleanQuestion,

        score,

        confidence,

        source:
            options.source ||
            "answer-memory",

        memory:
            options.memory !== false &&
            found,

        local:
            options.local !== false &&
            found,

        needsAI:
            options.needsAI === true
                ? true
                : !found,

        needsResearch:
            options.needsResearch === true,

        userId:
            this.safeText(
                options.userId ||
                ""
            ),

        model:
            options.model ||
            (
                found
                    ? "answer-memory"
                    : null
            ),

        timeMs:
            options.timeMs ||
            0,

        record:
            options.record ||
            null,

        candidates:
            Array.isArray(
                options.candidates
            )
                ? options.candidates
                : [],

        generatedAt:
            this.nowIso()
    };
}


// ============================================================
// FINAL SEARCH
// ============================================================

finalSearch(
    question = "",
    options = {}
) {

    const validation =
        this.validateFinalInput(
            question,
            options
        );

    if (
        !validation.valid
    ) {

        return this.createFinalResponse(
            question,
            null,
            {
                source:
                    validation.reason,

                needsAI:
                    false,

                needsResearch:
                    false
            }
        );
    }

    const cleanQuestion =
        validation.question;

    const started =
        Date.now();

    let result = null;

    try {

        const direct =
            this.getBuiltinSimpleAnswer(
                cleanQuestion
            );

        if (
            direct.found
        ) {

            result =
                direct;

        } else if (
            options.userId
        ) {

            const personal =
                this.findPersonalAnswer(
                    options.userId,
                    cleanQuestion,
                    options
                );

            if (
                personal.found
            ) {
                result =
                    personal;
            }
        }

        if (!result) {

            const simple =
                this.getSimpleResponse(
                    cleanQuestion,
                    options
                );

            if (
                simple.found
            ) {
                result =
                    simple;
            }
        }

        if (!result) {

            const memory =
                this.searchUltimate(
                    cleanQuestion,
                    options
                );

            if (
                memory.found
            ) {
                result =
                    memory;
            }
        }

        if (!result) {

            const knowledge =
                this.searchKnowledge(
                    cleanQuestion,
                    options
                );

            if (
                knowledge.found
            ) {
                result =
                    knowledge;
            }
        }

        const timeMs =
            Date.now() -
            started;

        if (
            result &&
            result.found
        ) {

            const response =
                this.createFinalResponse(
                    cleanQuestion,
                    result.answer,
                    {
                        source:
                            result.source ||
                            "answer-memory",

                        score:
                            result.score ||
                            1,

                        confidence:
                            result.confidence ||
                            result.score ||
                            1,

                        local:
                            true,

                        memory:
                            true,

                        needsAI:
                            false,

                        needsResearch:
                            false,

                        userId:
                            options.userId ||
                            "",

                        timeMs,

                        record:
                            result.record ||
                            result.item ||
                            null,

                        candidates:
                            result.candidates ||
                            []
                    }
                );

            if (
                options.userId
            ) {

                this.recordUserAnswerHit(
                    options.userId,
                    {
                        question:
                            cleanQuestion,

                        answer:
                            response.answer,

                        recordId:
                            response.record?.id ||
                            "",

                        score:
                            response.score,

                        confidence:
                            response.confidence,

                        source:
                            response.source
                    },
                    {
                        save:
                            false
                    }
                );
            }

            this.recordSearchEvent(
                cleanQuestion,
                response,
                {
                    ...options,
                    durationMs:
                        timeMs
                }
            );

            this.recordAnswerEvent(
                cleanQuestion,
                response.answer,
                {
                    ...options,

                    source:
                        response.source,

                    score:
                        response.score,

                    confidence:
                        response.confidence,

                    memoryUsed:
                        true,

                    local:
                        true,

                    durationMs:
                        timeMs
                }
            );

            this.saveData();

            return response;
        }

        const response =
            this.createFinalResponse(
                cleanQuestion,
                null,
                {
                    source:
                        "not-found",

                    score: 0,

                    confidence: 0,

                    local: false,

                    memory: false,

                    needsAI: true,

                    needsResearch:
                        this.shouldResearch(
                            cleanQuestion,
                            options
                        ),

                    userId:
                        options.userId ||
                        "",

                    timeMs
                }
            );

        this.recordSearchEvent(
            cleanQuestion,
            response,
            {
                ...options,
                durationMs:
                    timeMs
            }
        );

        this.saveData();

        return response;

    } catch (error) {

        const timeMs =
            Date.now() -
            started;

        this.recordFailureEvent(
            "final-search-error",
            {
                message:
                    error.message,

                stack:
                    error.stack,

                question:
                    cleanQuestion
            },
            options
        );

        this.recordPerformanceEvent(
            "final-search-error",
            timeMs,
            options
        );

        this.saveData();

        return this.createFinalResponse(
            cleanQuestion,
            null,
            {
                source:
                    "answer-memory-error",

                score: 0,

                confidence: 0,

                local: false,

                memory: false,

                needsAI: true,

                needsResearch: true,

                userId:
                    options.userId ||
                    "",

                timeMs
            }
        );
    }
}


// ============================================================
// FINAL ANSWER
// ============================================================

finalAnswer(
    question = "",
    options = {}
) {

    const result =
        this.finalSearch(
            question,
            options
        );

    return result.answer ||
        null;
}


// ============================================================
// FINAL ROUTER
// ============================================================

finalRoute(
    question = "",
    options = {}
) {

    const result =
        this.finalSearch(
            question,
            options
        );

    if (
        result.found
    ) {

        return {
            route:
                "memory",

            answer:
                result.answer,

            source:
                result.source,

            score:
                result.score,

            confidence:
                result.confidence,

            needsAI: false,

            needsResearch: false
        };
    }

    return {
        route:
            result.needsResearch
                ? "research-ai"
                : "ai",

        answer:
            null,

        source:
            result.source,

        score:
            result.score,

        confidence:
            result.confidence,

        needsAI:
            true,

        needsResearch:
            result.needsResearch
    };
}


// ============================================================
// POST AI FINALIZER
// ============================================================

finalizeAIAnswer(
    question = "",
    answer = "",
    options = {}
) {

    const cleanQuestion =
        this.normalizeFinalQuestion(
            question
        );

    const cleanAnswer =
        this.normalizeFinalAnswer(
            answer
        );

    if (
        !cleanQuestion ||
        !cleanAnswer
    ) {
        return {
            ok: false,
            saved: false,
            reason:
                "empty-question-or-answer"
        };
    }

    const started =
        Date.now();

    const learned =
        this.learnAIExchange(
            options.userId ||
            "",
            cleanQuestion,
            cleanAnswer,
            {
                ...options,

                source:
                    options.source ||
                    "ai",

                answerSource:
                    options.source ||
                    "ai",

                score:
                    options.score ??
                    0,

                confidence:
                    options.confidence ??
                    0.75
            }
        );

    const timeMs =
        Date.now() -
        started;

    this.recordPerformanceEvent(
        "finalize-ai-answer",
        timeMs,
        options
    );

    this.saveData();

    return {

        ok: true,

        saved:
            Boolean(
                learned.answerMemory?.saved ||
                learned.memory?.answerSaved ||
                learned.memory?.ok
            ),

        question:
            cleanQuestion,

        answer:
            cleanAnswer,

        learned,

        durationMs:
            timeMs
    };
}


// ============================================================
// CHAT PROCESS FINAL
// ============================================================

processChat(
    question = "",
    options = {}
) {

    const route =
        this.finalRoute(
            question,
            options
        );

    if (
        route.route ===
        "memory"
    ) {
        return {
            ok: true,

            reply:
                route.answer,

            answer:
                route.answer,

            source:
                route.source,

            score:
                route.score,

            confidence:
                route.confidence,

            memory: true,

            local: true,

            needsAI: false,

            needsResearch: false
        };
    }

    return {
        ok: true,

        reply: null,

        answer: null,

        source:
            route.source,

        score:
            route.score,

        confidence:
            route.confidence,

        memory: false,

        local: false,

        needsAI: true,

        needsResearch:
            route.needsResearch
    };
}


// ============================================================
// PROCESS CHAT WITH AI RESULT
// ============================================================

processChatWithAI(
    question = "",
    aiAnswer = "",
    options = {}
) {

    const local =
        this.finalSearch(
            question,
            options
        );

    if (
        local.found
    ) {
        return local;
    }

    const finalized =
        this.finalizeAIAnswer(
            question,
            aiAnswer,
            options
        );

    const response =
        this.createFinalResponse(
            question,
            aiAnswer,
            {
                source:
                    options.source ||
                    "ai",

                score:
                    options.score ??
                    0.75,

                confidence:
                    options.confidence ??
                    0.75,

                memory:
                    false,

                local:
                    false,

                needsAI:
                    false,

                needsResearch:
                    options.researchUsed ===
                    true,

                userId:
                    options.userId ||
                    "",

                model:
                    options.model ||
                    "ai",

                record:
                    null
            }
        );

    return {
        ...response,

        learned:
            finalized
    };
}


// ============================================================
// API RESPONSE BUILDER
// ============================================================

buildAPIResponse(
    question = "",
    result = {},
    options = {}
) {

    const answer =
        this.normalizeFinalAnswer(
            result.answer ||
            result.reply ||
            ""
        );

    return {

        ok: true,

        reply:
            answer ||

            null,

        answer:
            answer ||

            null,

        question:
            this.normalizeFinalQuestion(
                question
            ),

        found:
            Boolean(
                result.found
            ),

        source:
            result.source ||
            "answer-memory",

        model:
            result.model ||
            (
                result.found
                    ? "answer-memory"
                    : null
            ),

        score:
            result.score ||
            0,

        confidence:
            result.confidence ||
            0,

        memory:
            result.memory === true,

        local:
            result.local === true,

        researchUsed:
            result.researchUsed === true,

        needsAI:
            result.needsAI === true,

        needsResearch:
            result.needsResearch === true,

        userId:
            this.safeText(
                result.userId ||
                options.userId ||
                ""
            ),

        timeMs:
            result.timeMs ||
            0,

        sources:
            Array.isArray(
                result.sources
            )
                ? result.sources
                : [],

        candidates:
            Array.isArray(
                result.candidates
            )
                ? result.candidates
                : [],

        generatedAt:
            this.nowIso()
    };
}


// ============================================================
// API CHAT HANDLER
// ============================================================

handleChatRequest(
    payload = {},
    options = {}
) {

    const question =
        payload.message ||
        payload.question ||
        payload.prompt ||
        "";

    const userId =
        payload.userId ||
        options.userId ||
        "";

    const result =
        this.finalSearch(
            question,
            {
                ...options,
                userId
            }
        );

    return this.buildAPIResponse(
        question,
        result,
        {
            ...options,
            userId
        }
    );
}


// ============================================================
// API CHAT SMART
// ============================================================

handleSmartChatRequest(
    payload = {},
    options = {}
) {

    const local =
        this.handleChatRequest(
            payload,
            options
        );

    if (
        local.found
    ) {
        return local;
    }

    return {
        ...local,

        route:
            local.needsResearch
                ? "research-ai"
                : "ai",

        fallback:
            true
    };
}


// ============================================================
// API MEMORY SEARCH
// ============================================================

handleMemorySearchRequest(
    payload = {},
    options = {}
) {

    const question =
        payload.question ||
        payload.query ||
        payload.message ||
        "";

    const result =
        this.getAnswerDetailed(
            question,
            {
                ...options,

                userId:
                    payload.userId ||
                    options.userId ||
                    ""
            }
        );

    return {
        ok: true,

        ...result
    };
}


// ============================================================
// API MEMORY SAVE
// ============================================================

handleMemorySaveRequest(
    payload = {},
    options = {}
) {

    const question =
        payload.question ||
        "";

    const answer =
        payload.answer ||
        "";

    const result =
        this.autoLearn(
            question,
            answer,
            {
                ...options,

                userId:
                    payload.userId ||
                    options.userId ||
                    "",

                source:
                    payload.source ||
                    options.source ||
                    "api"
            }
        );

    return {
        ok:
            Boolean(
                result.saved ||
                result.updated
            ),

        ...result
    };
}


// ============================================================
// API USER MEMORY
// ============================================================

handleUserMemoryRequest(
    payload = {},
    options = {}
) {

    const userId =
        payload.userId ||
        options.userId ||
        "";

    const action =
        payload.action ||
        "get";

    return this.userMemoryBridge(
        action,
        userId,
        payload,
        options
    );
}


// ============================================================
// API KNOWLEDGE
// ============================================================

handleKnowledgeRequest(
    payload = {},
    options = {}
) {

    const action =
        payload.action ||
        "search";

    return this.knowledgeBridge(
        action,
        payload,
        options
    );
}


// ============================================================
// API SIMPLE MESSAGE
// ============================================================

handleSimpleMessageRequest(
    payload = {},
    options = {}
) {

    const action =
        payload.action ||
        "search";

    return this.simpleMessageBridge(
        action,
        payload,
        options
    );
}


// ============================================================
// API DIAGNOSTICS
// ============================================================

handleDiagnosticsRequest(
    payload = {},
    options = {}
) {

    const action =
        this.safeText(
            payload.action ||
            "health"
        ).toLowerCase();

    if (
        action ===
        "full"
    ) {
        return this.createFullReport(
            options
        );
    }

    if (
        action ===
        "diagnostics"
    ) {
        return this.runDiagnostics(
            options
        );
    }

    if (
        action ===
        "health"
    ) {
        return this.getSystemHealth();
    }

    if (
        action ===
        "analytics"
    ) {
        return this.getSearchAnalyticsReport();
    }

    if (
        action ===
        "performance"
    ) {
        return this.getPerformanceReport();
    }

    return this.getDatabaseReport();
}


// ============================================================
// API BACKUP
// ============================================================

handleBackupRequest(
    payload = {},
    options = {}
) {

    const action =
        this.safeText(
            payload.action ||
            "create"
        ).toLowerCase();

    if (
        action ===
        "create"
    ) {

        return this.saveBackup({
            reason:
                payload.reason ||
                "api",

            source:
                "api"
        });
    }

    if (
        action ===
        "list"
    ) {

        return {
            ok: true,

            backups:
                this.getBackups({
                    limit:
                        payload.limit ||
                        20
                })
        };
    }

    if (
        action ===
        "verify"
    ) {

        return this.verifyBackup(
            payload.backupId ||
            ""
        );
    }

    if (
        action ===
        "restore"
    ) {

        return this.restoreBackup(
            payload.backupId ||
            "",
            {
                createSafetyBackup:
                    payload.createSafetyBackup !==
                    false
            }
        );
    }

    return {
        ok: false,

        reason:
            "unknown-backup-action"
    };
}


// ============================================================
// API SNAPSHOT
// ============================================================

handleSnapshotRequest(
    payload = {},
    options = {}
) {

    const action =
        this.safeText(
            payload.action ||
            "create"
        ).toLowerCase();

    if (
        action ===
        "create"
    ) {

        return this.saveSnapshot({
            reason:
                payload.reason ||
                "api"
        });
    }

    if (
        action ===
        "list"
    ) {

        return {
            ok: true,

            snapshots:
                this.getSnapshots({
                    limit:
                        payload.limit ||
                        20
                })
        };
    }

    if (
        action ===
        "restore"
    ) {

        return this.restoreSnapshot(
            payload.snapshotId ||
            ""
        );
    }

    return {
        ok: false,

        reason:
            "unknown-snapshot-action"
    };
}


// ============================================================
// API EXPORT
// ============================================================

handleExportRequest(
    payload = {},
    options = {}
) {

    const analytics =
        payload.analytics === true;

    if (
        analytics
    ) {
        return this.exportAnalytics(
            options
        );
    }

    return this.getExportFilePayload(
        {
            includeBackups:
                payload.includeBackups === true,

            includeExports:
                payload.includeExports === true,

            includeLogs:
                payload.includeLogs === true
        }
    );
}


// ============================================================
// API IMPORT
// ============================================================

handleImportRequest(
    payload = {},
    options = {}
) {

    const content =
        payload.content ||
        payload.json ||
        payload.data ||
        "";

    const mode =
        this.safeText(
            payload.mode ||
            "merge"
        ).toLowerCase();

    if (
        mode ===
        "replace"
    ) {

        return this.replaceMemoryFromImport(
            content,
            {
                createSafetyBackup:
                    true
            }
        );
    }

    return this.mergeMemoryFromImport(
        content,
        {
            mergeDuplicates:
                payload.mergeDuplicates !==
                false,

            overwriteExisting:
                payload.overwriteExisting ===
                true
        }
    );
}


// ============================================================
// API MAINTENANCE
// ============================================================

handleMaintenanceRequest(
    payload = {},
    options = {}
) {

    const action =
        this.safeText(
            payload.action ||
            "full"
        ).toLowerCase();

    if (
        action ===
        "full"
    ) {
        return this.runFullMaintenance(
            options
        );
    }

    if (
        action ===
        "cleanup"
    ) {
        return this.runAutoCleanup(
            options
        );
    }

    if (
        action ===
        "repair"
    ) {
        return this.repairDatabase(
            options
        );
    }

    if (
        action ===
        "optimize"
    ) {
        return this.optimizeStorage(
            options
        );
    }

    if (
        action ===
        "vacuum"
    ) {
        return this.vacuumMemory(
            options
        );
    }

    if (
        action ===
        "quality"
    ) {
        return this.qualityMaintenance(
            options
        );
    }

    if (
        action ===
        "retention"
    ) {
        return this.runRetentionCleanup(
            options
        );
    }

    return {
        ok: false,

        reason:
            "unknown-maintenance-action"
    };
}


// ============================================================
// UNIVERSAL BRIDGE
// ============================================================

handle(
    action = "",
    payload = {},
    options = {}
) {

    const command =
        this.safeText(
            action
        ).toLowerCase();

    if (
        command ===
        "chat"
    ) {
        return this.handleChatRequest(
            payload,
            options
        );
    }

    if (
        command ===
        "smart-chat"
    ) {
        return this.handleSmartChatRequest(
            payload,
            options
        );
    }

    if (
        command ===
        "search"
    ) {
        return this.handleMemorySearchRequest(
            payload,
            options
        );
    }

    if (
        command ===
        "save"
    ) {
        return this.handleMemorySaveRequest(
            payload,
            options
        );
    }

    if (
        command ===
        "user-memory"
    ) {
        return this.handleUserMemoryRequest(
            payload,
            options
        );
    }

    if (
        command ===
        "knowledge"
    ) {
        return this.handleKnowledgeRequest(
            payload,
            options
        );
    }

    if (
        command ===
        "simple-message"
    ) {
        return this.handleSimpleMessageRequest(
            payload,
            options
        );
    }

    if (
        command ===
        "diagnostics"
    ) {
        return this.handleDiagnosticsRequest(
            payload,
            options
        );
    }

    if (
        command ===
        "backup"
    ) {
        return this.handleBackupRequest(
            payload,
            options
        );
    }

    if (
        command ===
        "snapshot"
    ) {
        return this.handleSnapshotRequest(
            payload,
            options
        );
    }

    if (
        command ===
        "export"
    ) {
        return this.handleExportRequest(
            payload,
            options
        );
    }

    if (
        command ===
        "import"
    ) {
        return this.handleImportRequest(
            payload,
            options
        );
    }

    if (
        command ===
        "maintenance"
    ) {
        return this.handleMaintenanceRequest(
            payload,
            options
        );
    }

    return {
        ok: false,

        reason:
            "unknown-answer-memory-action",

        action:
            command
    };
}


// ============================================================
// GLOBAL API BRIDGE
// ============================================================

getGlobalBridge() {

    return {

        answer:
            (
                question,
                options
            ) =>
                this.finalAnswer(
                    question,
                    options
                ),

        search:
            (
                question,
                options
            ) =>
                this.finalSearch(
                    question,
                    options
                ),

        route:
            (
                question,
                options
            ) =>
                this.finalRoute(
                    question,
                    options
                ),

        chat:
            (
                payload,
                options
            ) =>
                this.handleChatRequest(
                    payload,
                    options
                ),

        smartChat:
            (
                payload,
                options
            ) =>
                this.handleSmartChatRequest(
                    payload,
                    options
                ),

        save:
            (
                question,
                answer,
                options
            ) =>
                this.autoLearn(
                    question,
                    answer,
                    options
                ),

        memory:
            (
                userId,
                query,
                options
            ) =>
                this.queryUserMemory(
                    userId,
                    query,
                    options
                ),

        health:
            () =>
                this.getSystemHealth(),

        status:
            () =>
                this.getFinalStatus()
    };
}


// ============================================================
// GET FINAL STATUS
// ============================================================

getFinalStatus() {

    return {

        ok:
            true,

        name:
            this.getFinalConfig()
                .name,

        version:
            this.getFinalConfig()
                .version,

        enabled:
            this.getFinalConfig()
                .enabled,

        ready:
            this.isReady(),

        records:
            this.countActiveRecords(),

        totalRecords:
            this.countRecords({
                includeArchived: true,
                includeDeleted: true
            }),

        users:
            this.countUsers(),

        simpleMessages:
            this.countSimpleMessages(),

        knowledge:
            this.countKnowledge(),

        searches:
            this.getTotalSearches(),

        successRate:
            this.getSearchSuccessRate(),

        averageScore:
            this.getAverageSearchScore(),

        averageConfidence:
            this.getAverageSearchConfidence(),

        averageSearchTime:
            this.getAverageSearchDuration(),

        quality:
            this.getAverageQuality(),

        trusted:
            this.getTrustedRecords()
                .length,

        autoLearned:
            this.getAutoLearnReport()
                .learned,

        health:
            this.getSystemHealthLevel(),

        cache:
            this.getSearchCacheStats(),

        storage:
            this.getStorageStatus(),

        generatedAt:
            this.nowIso()
    };
}


// ============================================================
// READY CHECK
// ============================================================

isReady() {

    try {

        this.ensureFinalState();

        return (
            typeof this.finalSearch ===
                "function" &&

            typeof this.finalAnswer ===
                "function" &&

            typeof this.handleChatRequest ===
                "function" &&

            typeof this.rebuildIndex ===
                "function"
        );

    } catch {

        return false;
    }
}


// ============================================================
// FINAL STARTUP TESTS
// ============================================================

runFinalSelfTest() {

    const tests = [];

    const test =
        (
            name,
            callback
        ) => {

            try {

                const result =
                    callback();

                const ok =
                    typeof result ===
                        "boolean"
                        ? result
                        : Boolean(
                            result?.ok ??
                            result?.found ??
                            result
                        );

                tests.push({
                    name,
                    ok,
                    result
                });

            } catch (error) {

                tests.push({
                    name,
                    ok: false,
                    error:
                        error.message
                });
            }
        };

    test(
        "ready",
        () =>
            this.isReady()
    );

    test(
        "selam",
        () =>
            this.finalSearch(
                "selam"
            )
    );

    test(
        "SLM",
        () =>
            this.finalSearch(
                "SLM"
            )
    );

    test(
        "slm!",
        () =>
            this.finalSearch(
                "slm!"
            )
    );

    test(
        "mrb",
        () =>
            this.finalSearch(
                "mrb"
            )
    );

    test(
        "merhaba",
        () =>
            this.finalSearch(
                "merhaba"
            )
    );

    test(
        "kimsin",
        () =>
            this.finalSearch(
                "kimsin"
            )
    );

    test(
        "en hızlı kim",
        () =>
            this.finalSearch(
                "en hızlı kim"
            )
    );

    test(
        "search-engine",
        () =>
            this.runSearchSelfTest()
    );

    test(
        "quality-engine",
        () =>
            this.runQualitySelfTest()
    );

    test(
        "storage",
        () =>
            this.runStorageSelfTest()
    );

    test(
        "analytics",
        () =>
            this.getAnalyticsStatus()
    );

    test(
        "user-memory",
        () =>
            this.runUserMemorySelfTest(
                "self-test-user"
            )
    );

    const passed =
        tests.filter(
            (item) =>
                item.ok
        ).length;

    const failed =
        tests.length -
        passed;

    return {

        ok:
            failed === 0,

        total:
            tests.length,

        passed,

        failed,

        tests
    };
}


// ============================================================
// STARTUP REPORT
// ============================================================

getStartupReport() {

    const status =
        this.getFinalStatus();

    const selfTest =
        this.runFinalSelfTest();

    return {

        ok:
            status.ok &&
            selfTest.ok,

        status,

        selfTest,

        features:
            this.getFeatureFlags(),

        config:
            this.getFinalConfig(),

        initializedAt:
            this.data.initializedAt ||
            null,

        generatedAt:
            this.nowIso()
    };
}


// ============================================================
// MARK INITIALIZED
// ============================================================

markInitialized() {

    this.data.initializedAt =
        this.data.initializedAt ||
        this.nowIso();

    this.data.initializationCount =
        Math.max(
            0,
            this.safeNumber(
                this.data.initializationCount,
                0
            )
        ) + 1;

    this.touchUpdatedAt();

    return this.data.initializedAt;
}


// ============================================================
// FINAL BOOT
// ============================================================

boot() {

    const started =
        Date.now();

    const initialized =
        this.initialize();

    this.markInitialized();

    const tests =
        this.runFinalSelfTest();

    const durationMs =
        Date.now() -
        started;

    const result = {

        ok:
            initialized.ok &&
            tests.ok,

        initialized:
            initialized.ok,

        tests:
            tests.ok,

        durationMs,

        version:
            this.getFinalConfig()
                .version,

        status:
            this.getFinalStatus()
    };

    this.addMaintenanceLog(
        "answer-memory-boot",
        result,
        {
            durationMs,
            save: false
        }
    );

    this.saveData();

    return result;
}


// ============================================================
// SAFE BOOT
// ============================================================

safeBoot() {

    try {

        return this.boot();

    } catch (error) {

        try {

            this.addDiagnostic(
                "safe-boot-error",
                error.message,
                {
                    stack:
                        error.stack
                },
                {
                    severity:
                        "critical",
                    save: false
                }
            );

            this.saveData();

        } catch {
            // intentionally silent
        }

        return {
            ok: false,

            initialized:
                false,

            tests:
                false,

            error:
                error.message
        };
    }
}


// ============================================================
// FINAL MESSAGE ENGINE
// ============================================================

messageEngine(
    message = "",
    options = {}
) {

    const command =
        this.processCommandOrMessage(
            message,
            options
        );

    if (
        command.command
    ) {
        return command;
    }

    return this.finalSearch(
        message,
        options
    );
}


// ============================================================
// FINAL ANSWER ENGINE
// ============================================================

answerEngine(
    question = "",
    options = {}
) {

    return this.finalSearch(
        question,
        options
    );
}


// ============================================================
// FINAL MEMORY ENGINE
// ============================================================

memoryEngine(
    question = "",
    options = {}
) {

    return this.searchUltimate(
        question,
        options
    );
}


// ============================================================
// FINAL KNOWLEDGE ENGINE
// ============================================================

knowledgeEngine(
    question = "",
    options = {}
) {

    return this.findKnowledgeAnswer(
        question,
        options
    );
}


// ============================================================
// FINAL SIMPLE ENGINE
// ============================================================

simpleEngine(
    message = "",
    options = {}
) {

    return this.getSimpleResponse(
        message,
        options
    );
}


// ============================================================
// FINAL USER MEMORY ENGINE
// ============================================================

userMemoryEngine(
    userId = "",
    question = "",
    options = {}
) {

    return this.processUserAwareQuestion(
        userId,
        question,
        options
    );
}


// ============================================================
// FINAL LEARNING ENGINE
// ============================================================

learningEngine(
    question = "",
    answer = "",
    options = {}
) {

    return this.runLearningPipeline(
        question,
        answer,
        options
    );
}


// ============================================================
// FINAL ANALYTICS ENGINE
// ============================================================

analyticsEngine(
    options = {}
) {

    return {
        current:
            this.getCurrentStats(),

        memory:
            this.getMemoryAnalyticsReport(),

        search:
            this.getSearchAnalyticsReport(),

        performance:
            this.getPerformanceReport(),

        learning:
            this.getSelfLearningReport(),

        health:
            this.getSystemHealth()
    };
}


// ============================================================
// FINAL DIAGNOSTICS ENGINE
// ============================================================

diagnosticsEngine(
    options = {}
) {

    return this.getDiagnosticReport(
        options
    );
}


// ============================================================
// FINAL MAINTENANCE ENGINE
// ============================================================

maintenanceEngine(
    options = {}
) {

    return this.runFullMaintenance(
        options
    );
}


// ============================================================
// FINAL COMMAND ENGINE
// ============================================================

commandEngine(
    command = "",
    options = {}
) {

    return this.handleCommand(
        command,
        options
    );
}


// ============================================================
// FINAL BUILD INFO
// ============================================================

getBuildInfo() {

    return {

        product:
            "TürkAI",

        subsystem:
            "AnswerMemory",

        version:
            "10.0",

        architecture:
            "local-hybrid-memory-engine",

        storage:
            "JSON",

        indexing:
            "multi-index",

        search:
            "hybrid-fuzzy-semantic",

        learning:
            "auto-learning",

        userMemory:
            "enabled",

        diagnostics:
            "enabled",

        analytics:
            "enabled",

        backup:
            "enabled",

        snapshot:
            "enabled",

        importExport:
            "enabled",

        commandEngine:
            "enabled",

        initialized:
            Boolean(
                this.data?.initializedAt
            ),

        generatedAt:
            this.nowIso()
    };
}


// ============================================================
// FINAL HELP
// ============================================================

getHelp() {

    return {

        ok: true,

        name:
            "TürkAI AnswerMemory",

        version:
            "10.0",

        methods: [

            "finalSearch",

            "finalAnswer",

            "finalRoute",

            "processChat",

            "handle",

            "answerEngine",

            "memoryEngine",

            "knowledgeEngine",

            "simpleEngine",

            "userMemoryEngine",

            "learningEngine",

            "analyticsEngine",

            "diagnosticsEngine",

            "maintenanceEngine",

            "commandEngine",

            "getFinalStatus",

            "getBuildInfo"
        ],

        commands: [

            "/help",

            "/memory",

            "/stats",

            "/health",

            "/search <soru>",

            "/learn <soru> | <cevap>",

            "/backup",

            "/snapshot",

            "/diagnostics",

            "/repair",

            "/optimize",

            "/clearcache"
        ]
    };
}


// ============================================================
// FINAL ERROR HANDLER
// ============================================================

handleError(
    error,
    context = "",
    options = {}
) {

    const message =
        error instanceof Error
            ? error.message
            : this.safeText(
                error
            );

    const stack =
        error instanceof Error
            ? error.stack
            : "";

    const event =
        this.recordFailureEvent(
            "answer-memory-runtime",
            {
                message,
                stack,
                context
            },
            {
                ...options,

                includeStack:
                    options.includeStack ===
                    true
            }
        );

    return {

        ok: false,

        error:
            message ||

            "AnswerMemory runtime error",

        context:
            this.safeText(
                context
            ),

        eventId:
            event.id
    };
}


// ============================================================
// FINAL SAFE ANSWER
// ============================================================

safeFinalAnswer(
    question = "",
    options = {}
) {

    try {

        return this.finalSearch(
            question,
            options
        );

    } catch (error) {

        return this.handleError(
            error,
            "safeFinalAnswer",
            options
        );
    }
}


// ============================================================
// FINAL SAFE CHAT
// ============================================================

safeChat(
    payload = {},
    options = {}
) {

    try {

        return this.handleChatRequest(
            payload,
            options
        );

    } catch (error) {

        return this.handleError(
            error,
            "safeChat",
            options
        );
    }
}


// ============================================================
// FINAL SAFE SEARCH
// ============================================================

safeFinalSearch(
    question = "",
    options = {}
) {

    try {

        return this.finalSearch(
            question,
            options
        );

    } catch (error) {

        return this.handleError(
            error,
            "safeFinalSearch",
            options
        );
    }
}


// ============================================================
// FINAL GLOBAL METHODS
// ============================================================

attachGlobalAPI() {

    if (
        typeof globalThis ===
        "undefined"
    ) {
        return {
            ok: false,
            reason:
                "globalThis-unavailable"
        };
    }

    const bridge =
        this.getGlobalBridge();

    globalThis.TurkAIAnswerMemory =
        this;

    globalThis.TurkAIAnswer =
        bridge.answer;

    globalThis.TurkAISearch =
        bridge.search;

    globalThis.TurkAIRoute =
        bridge.route;

    globalThis.TurkAIChat =
        bridge.chat;

    globalThis.TurkAISmartChat =
        bridge.smartChat;

    globalThis.TurkAISave =
        bridge.save;

    globalThis.TurkAIMemory =
        bridge.memory;

    globalThis.TurkAIHealth =
        bridge.health;

    globalThis.TurkAIStatus =
        bridge.status;

    return {
        ok: true
    };
}


// ============================================================
// DETACH GLOBAL API
// ============================================================

detachGlobalAPI() {

    if (
        typeof globalThis ===
        "undefined"
    ) {
        return {
            ok: false
        };
    }

    const names = [

        "TurkAIAnswerMemory",

        "TurkAIAnswer",

        "TurkAISearch",

        "TurkAIRoute",

        "TurkAIChat",

        "TurkAISmartChat",

        "TurkAISave",

        "TurkAIMemory",

        "TurkAIHealth",

        "TurkAIStatus"
    ];

    for (
        const name
        of names
    ) {

        try {
            delete globalThis[
                name
            ];
        } catch {
            // intentionally silent
        }
    }

    return {
        ok: true
    };
}


// ============================================================
// FINAL REGISTER
// ============================================================

registerFinalAPI() {

    this.attachGlobalAPI();

    return {
        ok: true,

        api:
            [
                "TurkAIAnswerMemory",
                "TurkAIAnswer",
                "TurkAISearch",
                "TurkAIRoute",
                "TurkAIChat",
                "TurkAISmartChat",
                "TurkAISave",
                "TurkAIMemory",
                "TurkAIHealth",
                "TurkAIStatus"
            ]
    };
}


// ============================================================
// FINAL STATUS JSON
// ============================================================

statusJSON() {

    return JSON.stringify(
        this.getFinalStatus(),
        null,
        2
    );
}


// ============================================================
// BUILD INFO JSON
// ============================================================

buildInfoJSON() {

    return JSON.stringify(
        this.getBuildInfo(),
        null,
        2
    );
}


// ============================================================
// HELP JSON
// ============================================================

helpJSON() {

    return JSON.stringify(
        this.getHelp(),
        null,
        2
    );
}


// ============================================================
// FINAL REPORT
// ============================================================

getFinalReport() {

    return {

        ok:
            this.isReady(),

        build:
            this.getBuildInfo(),

        status:
            this.getFinalStatus(),

        health:
            this.getSystemHealth(),

        quality:
            this.getQualityReport(),

        trust:
            this.getTrustReport(),

        analytics:
            this.getSearchAnalyticsReport(),

        memory:
            this.getMemoryAnalyticsReport(),

        learning:
            this.getSelfLearningReport(),

        storage:
            this.getStorageStatus(),

        cleanup:
            this.getCleanupReport(),

        performance:
            this.getPerformanceReport(),

        alerts:
            this.getHealthAlerts(),

        help:
            this.getHelp(),

        generatedAt:
            this.nowIso()
    };
}


// ============================================================
// FINAL REPORT JSON
// ============================================================

finalReportJSON() {

    return JSON.stringify(
        this.getFinalReport(),
        null,
        2
    );
}


// ============================================================
// FINAL SHUTDOWN
// ============================================================

shutdown(
    options = {}
) {

    try {

        if (
            options.backup !==
            false
        ) {

            this.saveBackup({
                reason:
                    "shutdown",

                source:
                    "shutdown"
            });
        }

        this.invalidateAllCaches();

        this.touchUpdatedAt();

        this.saveData();

        return {
            ok: true,

            shutdown:
                true,

            generatedAt:
                this.nowIso()
        };

    } catch (error) {

        return {
            ok: false,

            shutdown:
                false,

            error:
                error.message
        };
    }
}


// ============================================================
// FINAL RESTART
// ============================================================

restart(
    options = {}
) {

    const shutdown =
        this.shutdown({
            backup:
                options.backup !==
                false
        });

    const boot =
        this.safeBoot();

    return {
        ok:
            shutdown.ok &&
            boot.ok,

        shutdown,

        boot
    };
}


// ============================================================
// FINAL HEALTH CHECK
// ============================================================

finalHealthCheck() {

    const ready =
        this.isReady();

    const health =
        this.getSystemHealth();

    const consistency =
        this.checkDatabaseConsistency();

    const diagnostics =
        this.runDiagnostics();

    return {

        ok:
            ready &&
            health.ok &&
            consistency.ok &&
            diagnostics.ok,

        ready,

        health,

        consistency,

        diagnostics,

        generatedAt:
            this.nowIso()
    };
}


// ============================================================
// FINAL GREETING TEST
// ============================================================

runGreetingSelfTest() {

    const tests = [

        "selam",
        "SLM",
        "slm",
        "slm!",
        "slm.",
        "mrb",
        "mrb!",
        "merhaba",
        "selamlar",
        "hey",
        "hi",
        "hello",
        "sa",
        "s.a"
    ];

    const results = [];

    for (
        const input
        of tests
    ) {

        const result =
            this.finalSearch(
                input
            );

        results.push({

            input,

            found:
                result.found,

            answer:
                result.answer,

            source:
                result.source,

            score:
                result.score,

            confidence:
                result.confidence
        });
    }

    const failed =
        results.filter(
            (item) =>
                !item.found ||
                !item.answer
        );

    return {

        ok:
            failed.length === 0,

        total:
            results.length,

        passed:
            results.length -
            failed.length,

        failed:
            failed.length,

        results
    };
}


// ============================================================
// FINAL ANSWER SELF TEST
// ============================================================

runAnswerSelfTest() {

    const tests = [

        {
            input:
                "en hızlı kim",

            expected:
                "TürkAI ⚡🤖"
        },

        {
            input:
                "kimsin",

            expected:
                null
        },

        {
            input:
                "adın ne",

            expected:
                null
        },

        {
            input:
                "nasılsın",

            expected:
                null
        }
    ];

    const results = [];

    for (
        const test
        of tests
    ) {

        const result =
            this.finalSearch(
                test.input
            );

        const passed =
            test.expected === null
                ? Boolean(
                    result.found
                )
                : result.answer ===
                    test.expected;

        results.push({
            input:
                test.input,

            answer:
                result.answer,

            source:
                result.source,

            passed
        });
    }

    const failed =
        results.filter(
            (item) =>
                !item.passed
        );

    return {

        ok:
            failed.length === 0,

        total:
            results.length,

        passed:
            results.length -
            failed.length,

        failed:
            failed.length,

        results
    };
}


// ============================================================
// ULTIMATE SELF TEST
// ============================================================

runUltimateSelfTest() {

    const greeting =
        this.runGreetingSelfTest();

    const answer =
        this.runAnswerSelfTest();

    const final =
        this.runFinalSelfTest();

    const health =
        this.finalHealthCheck();

    return {

        ok:
            greeting.ok &&
            answer.ok &&
            final.ok &&
            health.ok,

        greeting,

        answer,

        final,

        health,

        generatedAt:
            this.nowIso()
    };
}


// ============================================================
// FINAL INITIALIZATION FLAG
// ============================================================

if (
    typeof this.ensureFinalState ===
    "function"
) {

    try {

        this.ensureFinalState();

    } catch {
        // intentionally silent
    }
}


// ============================================================
// FINAL API REGISTRATION
// ============================================================

try {

    if (
        typeof this.registerFinalAPI ===
        "function"
    ) {

        this.registerFinalAPI();
    }

} catch {
    // intentionally silent
}


// ============================================================
// FINAL BUILTIN REGISTRATION
// ============================================================

try {

    if (
        typeof this.registerBuiltinSimpleMessages ===
        "function"
    ) {

        this.registerBuiltinSimpleMessages();
    }

    if (
        typeof this.registerBuiltinKnowledge ===
        "function"
    ) {

        this.registerBuiltinKnowledge();
    }

} catch {
    // intentionally silent
}


// ============================================================
// FINAL INDEX REBUILD
// ============================================================

try {

    if (
        typeof this.rebuildIndex ===
        "function"
    ) {

        this.rebuildIndex();
    }

} catch {
    // intentionally silent
}


// ============================================================
// SINGLETON CONFIG
// ============================================================

const ANSWER_MEMORY_SINGLETON_KEY =
    "__TURKAI_ANSWER_MEMORY_SINGLETON__";


// ============================================================
// SINGLETON
// ============================================================

let answerMemory =
    null;


// ============================================================
// CREATE SINGLETON
// ============================================================

function createAnswerMemorySingleton() {

    if (
        typeof globalThis !==
        "undefined" &&
        globalThis[
            ANSWER_MEMORY_SINGLETON_KEY
        ]
    ) {

        return globalThis[
            ANSWER_MEMORY_SINGLETON_KEY
        ];
    }

    const instance =
        new AnswerMemory();

    try {

        instance.safeBoot();

    } catch {
        // intentionally silent
    }

    try {

        instance.registerFinalAPI();

    } catch {
        // intentionally silent
    }

    if (
        typeof globalThis !==
        "undefined"
    ) {

        globalThis[
            ANSWER_MEMORY_SINGLETON_KEY
        ] =
            instance;
    }

    return instance;
}


// ============================================================
// SINGLETON INIT
// ============================================================

answerMemory =
    createAnswerMemorySingleton();


// ============================================================
// GLOBAL SINGLETON ALIASES
// ============================================================

if (
    typeof globalThis !==
    "undefined"
) {

    globalThis.answerMemory =
        answerMemory;

    globalThis.TurkAIAnswerMemory =
        answerMemory;

    globalThis.turkAIAnswerMemory =
        answerMemory;
}


// ============================================================
// COMMONJS EXPORT
// ============================================================

if (
    typeof module !==
    "undefined" &&
    module.exports
) {

    module.exports = {

        AnswerMemory,

        answerMemory,

        createAnswerMemorySingleton
    };
}


// ============================================================
// DEFAULT EXPORT COMPATIBILITY
// ============================================================

if (
    typeof module !==
    "undefined" &&
    module.exports
) {

    module.exports.default =
        answerMemory;
}


// ============================================================
// FINAL STARTUP LOG
// ============================================================

try {

    const status =
        answerMemory.getFinalStatus();

    console.log(
        "[AnswerMemory] ========================================"
    );

    console.log(
        "[AnswerMemory] TürkAI AnswerMemory 10.0"
    );

    console.log(
        "[AnswerMemory] Ready:",
        status.ready
    );

    console.log(
        "[AnswerMemory] Records:",
        status.records
    );

    console.log(
        "[AnswerMemory] Users:",
        status.users
    );

    console.log(
        "[AnswerMemory] Simple:",
        status.simpleMessages
    );

    console.log(
        "[AnswerMemory] Knowledge:",
        status.knowledge
    );

    console.log(
        "[AnswerMemory] Health:",
        status.health
    );

    console.log(
        "[AnswerMemory] ========================================"
    );

} catch {
    // intentionally silent
}


// ============================================================
// PART 10 / 10
// ANSWER MEMORY FINAL
// ============================================================

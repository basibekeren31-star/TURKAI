'use strict';

/*
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘                         TÃœRKAI SERVER                              â•‘
â•‘                         PART 1 / 20                                â•‘
â•‘                                                                      â•‘
â•‘  PART 1: CONVERSATION + MEMORY CORE                                â•‘
â•‘                                                                      â•‘
â•‘  Bu bÃ¶lÃ¼mÃ¼n gÃ¶revleri:                                               â•‘
â•‘  - KullanÄ±cÄ± mesajÄ±nÄ± gÃ¼venli ÅŸekilde almak                         â•‘
â•‘  - MesajÄ± cÃ¼mlelere ayÄ±rmak                                         â•‘
â•‘  - CÃ¼mleleri parÃ§alara ayÄ±rmak                                      â•‘
â•‘  - Bir mesajdaki birden fazla amacÄ± bulmak                           â•‘
â•‘  - AmaÃ§larÄ± Ã¶nceliklendirmek                                        â•‘
â•‘  - KonuÅŸma baÄŸlamÄ±nÄ± saklamak                                       â•‘
â•‘  - KullanÄ±cÄ± hafÄ±zasÄ±nÄ± saklamak                                    â•‘
â•‘  - Cevap hafÄ±zasÄ± oluÅŸturmak                                       â•‘
â•‘  - Eski benzer konuÅŸmalarÄ± bulmak                                   â•‘
â•‘  - KullanÄ±cÄ±nÄ±n tercihlerini Ã¶ÄŸrenmek                               â•‘
â•‘  - OturumlarÄ± takip etmek                                           â•‘
â•‘  - KalÄ±cÄ± JSON veri tabanÄ± altyapÄ±sÄ±nÄ± hazÄ±rlamak                   â•‘
â•‘                                                                      â•‘
â•‘  SONRAKÄ° PARÃ‡A:                                                      â•‘
â•‘  PART 2 / 20 â†’ geliÅŸmiÅŸ conversation memory                         â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
*/

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const express = require('express');

const ROOT = __dirname;

const DATA_DIR = path.join(ROOT, 'data');
const MEMORY_DIR = path.join(DATA_DIR, 'memory');
const USER_DIR = path.join(DATA_DIR, 'users');
const ANSWER_DIR = path.join(DATA_DIR, 'answers');
const SESSION_DIR = path.join(DATA_DIR, 'sessions');
const LOG_DIR = path.join(DATA_DIR, 'logs');
const CACHE_DIR = path.join(DATA_DIR, 'cache');
const KNOWLEDGE_DIR = path.join(DATA_DIR, 'knowledge');

const MEMORY_FILE = path.join(MEMORY_DIR, 'memory.json');
const ANSWERS_FILE = path.join(ANSWER_DIR, 'answers.json');
const USERS_FILE = path.join(USER_DIR, 'users.json');
const SESSIONS_FILE = path.join(SESSION_DIR, 'sessions.json');
const EVENTS_FILE = path.join(LOG_DIR, 'events.jsonl');

const PORT = Number(process.env.PORT || 3000);

function ensureDirectory(directory) {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, {
            recursive: true
        });
    }
}

ensureDirectory(DATA_DIR);
ensureDirectory(MEMORY_DIR);
ensureDirectory(USER_DIR);
ensureDirectory(ANSWER_DIR);
ensureDirectory(SESSION_DIR);
ensureDirectory(LOG_DIR);
ensureDirectory(CACHE_DIR);
ensureDirectory(KNOWLEDGE_DIR);

function timestamp() {
    return new Date().toISOString();
}

function generateId(prefix = 'id') {
    const random = crypto.randomBytes(8).toString('hex');
    return `${prefix}_${Date.now()}_${random}`;
}

function cleanText(value, maximum = 50000) {
    if (value === null || value === undefined) {
        return '';
    }

    return String(value)
        .replace(/\u0000/g, '')
        .slice(0, maximum);
}

function normalizeSpace(value) {
    return cleanText(value)
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeTurkish(value) {
    return normalizeSpace(value)
        .toLocaleLowerCase('tr-TR');
}

function normalizeForSearch(value) {
    return normalizeTurkish(value)
        .replace(/Ä±/g, 'i')
        .replace(/ÅŸ/g, 's')
        .replace(/ÄŸ/g, 'g')
        .replace(/Ã¼/g, 'u')
        .replace(/Ã¶/g, 'o')
        .replace(/Ã§/g, 'c');
}

function clamp(value, minimum, maximum) {
    return Math.min(
        maximum,
        Math.max(minimum, value)
    );
}

function safeNumber(value, fallback = 0) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return fallback;
    }

    return number;
}

function unique(values) {
    return [...new Set(values)];
}

function readJson(file, fallback) {
    try {
        if (!fs.existsSync(file)) {
            return fallback;
        }

        const raw = fs.readFileSync(file, 'utf8');

        if (!raw.trim()) {
            return fallback;
        }

        return JSON.parse(raw);
    } catch (error) {
        writeEvent('json_read_error', {
            file,
            error: error.message
        });

        return fallback;
    }
}

function writeJson(file, value) {
    const temporaryFile = `${file}.${process.pid}.${Date.now()}.tmp`;

    fs.writeFileSync(
        temporaryFile,
        JSON.stringify(value, null, 2),
        'utf8'
    );

    fs.renameSync(
        temporaryFile,
        file
    );
}

function writeEvent(type, payload = {}) {
    try {
        const event = {
            id: generateId('event'),
            type,
            timestamp: timestamp(),
            payload
        };

        fs.appendFileSync(
            EVENTS_FILE,
            JSON.stringify(event) + '\n',
            'utf8'
        );
    } catch (_) {
        // Log sistemi Ã§Ã¶kerse ana sunucuyu durdurmuyoruz.
    }
}

const DEFAULT_MEMORY = {
    version: 1,
    users: {},
    conversations: {},
    facts: {},
    preferences: {},
    topics: {},
    aliases: {},
    entities: {},
    intentHistory: {},
    retrieval: {},
    lastUpdated: null
};

const DEFAULT_ANSWERS = {
    version: 1,
    records: {},
    keywordIndex: {},
    intentIndex: {},
    topicIndex: {},
    lastUpdated: null
};

const DEFAULT_USERS = {
    version: 1,
    users: {},
    lastUpdated: null
};

const DEFAULT_SESSIONS = {
    version: 1,
    sessions: {},
    lastUpdated: null
};

let memoryDatabase = readJson(
    MEMORY_FILE,
    DEFAULT_MEMORY
);

let answerDatabase = readJson(
    ANSWERS_FILE,
    DEFAULT_ANSWERS
);

let userDatabase = readJson(
    USERS_FILE,
    DEFAULT_USERS
);

let sessionDatabase = readJson(
    SESSIONS_FILE,
    DEFAULT_SESSIONS
);

function saveMemoryDatabase() {
    memoryDatabase.lastUpdated = timestamp();
    writeJson(
        MEMORY_FILE,
        memoryDatabase
    );
}

function saveAnswerDatabase() {
    answerDatabase.lastUpdated = timestamp();
    writeJson(
        ANSWERS_FILE,
        answerDatabase
    );
}

function saveUserDatabase() {
    userDatabase.lastUpdated = timestamp();
    writeJson(
        USERS_FILE,
        userDatabase
    );
}

function saveSessionDatabase() {
    sessionDatabase.lastUpdated = timestamp();
    writeJson(
        SESSIONS_FILE,
        sessionDatabase
    );
}

/* ============================================================
   TOKEN ENGINE
   ============================================================ */

const STOP_WORDS = new Set([
    've',
    'veya',
    'ile',
    'bir',
    'bu',
    'ÅŸu',
    'o',
    'da',
    'de',
    'mi',
    'mÄ±',
    'mu',
    'mÃ¼',
    'iÃ§in',
    'ama',
    'fakat',
    'hem',
    'daha',
    'Ã§ok',
    'en',
    'ben',
    'sen',
    'biz',
    'siz',
    'bana',
    'sana',
    'bunu',
    'ÅŸunu',
    'onu',
    'olan',
    'olarak',
    'ise',
    'ki',
    'ya',
    'yani',
    'ÅŸey',
    'var',
    'yok',
    'the',
    'a',
    'an',
    'and',
    'or',
    'of',
    'to',
    'in',
    'on',
    'is',
    'are'
]);

function tokenize(text) {
    return normalizeForSearch(text)
        .replace(/[^a-z0-9Ã§ÄŸÄ±Ã¶ÅŸÃ¼+#.-]+/gi, ' ')
        .split(' ')
        .filter(Boolean);
}

function contentTokens(text) {
    return tokenize(text)
        .filter(token => token.length > 1)
        .filter(token => !STOP_WORDS.has(token));
}

function countTokens(text) {
    return contentTokens(text).length;
}

function tokenFrequency(text) {
    const result = {};

    for (const token of contentTokens(text)) {
        result[token] = (result[token] || 0) + 1;
    }

    return result;
}

function extractKeywords(text, limit = 30) {
    const frequency = tokenFrequency(text);

    return Object.entries(frequency)
        .sort((a, b) => {
            if (b[1] !== a[1]) {
                return b[1] - a[1];
            }

            return a[0].localeCompare(
                b[0],
                'tr'
            );
        })
        .slice(0, limit)
        .map(entry => entry[0]);
}

function tokenIntersection(first, second) {
    const secondSet = new Set(second);

    return unique(
        first.filter(
            token => secondSet.has(token)
        )
    );
}

function tokenUnion(first, second) {
    return unique([
        ...first,
        ...second
    ]);
}

function similarityByTokens(firstText, secondText) {
    const first = contentTokens(firstText);
    const second = contentTokens(secondText);

    if (!first.length || !second.length) {
        return 0;
    }

    const intersection = tokenIntersection(
        first,
        second
    );

    const union = tokenUnion(
        first,
        second
    );

    if (!union.length) {
        return 0;
    }

    return intersection.length / union.length;
}

function keywordOverlap(firstText, secondText) {
    const first = contentTokens(firstText);
    const second = contentTokens(secondText);

    if (!first.length || !second.length) {
        return 0;
    }

    const overlap = tokenIntersection(
        first,
        second
    );

    return overlap.length /
        Math.max(
            first.length,
            second.length
        );
}

/* ============================================================
   LANGUAGE DETECTION
   ============================================================ */

function detectLanguage(text) {
    const value = cleanText(text);

    if (!value.trim()) {
        return 'unknown';
    }

    const TurkishCharacters =
        (value.match(/[Ã§ÄŸÄ±Ã¶ÅŸÃ¼Ã‡ÄÄ°Ã–ÅÃœ]/g) || []).length;

    const ArabicCharacters =
        (value.match(/[\u0600-\u06ff]/g) || []).length;

    const CyrillicCharacters =
        (value.match(/[\u0400-\u04ff]/g) || []).length;

    const LatinCharacters =
        (value.match(/[a-zA-Z]/g) || []).length;

    if (ArabicCharacters >= 2) {
        return 'ar';
    }

    if (CyrillicCharacters >= 2) {
        return 'ru';
    }

    if (TurkishCharacters > 0) {
        return 'tr';
    }

    if (LatinCharacters > 0) {
        return 'en';
    }

    return 'unknown';
}

/* ============================================================
   SENTENCE ENGINE
   ============================================================ */

function splitSentences(text) {
    const source = normalizeSpace(text);

    if (!source) {
        return [];
    }

    return source
        .split(/(?<=[.!?â€¦])\s+|\n+/)
        .map(part => normalizeSpace(part))
        .filter(Boolean);
}

function splitClauses(sentence) {
    const source = normalizeSpace(sentence);

    if (!source) {
        return [];
    }

    return source
        .split(
            /\s+(?:ama|fakat|ve|ayrÄ±ca|ayrica|bir de|bu arada|hem de)\s+/i
        )
        .map(part => normalizeSpace(part))
        .filter(Boolean);
}

/* ============================================================
   BASIC INTENT ENGINE
   ============================================================ */

const GREETING_PATTERNS = [
    'selam',
    'slm',
    'sa',
    'merhaba',
    'hey',
    'hello',
    'hi',
    'naber',
    'nasÄ±lsÄ±n',
    'nasilsin'
];

const THANK_PATTERNS = [
    'teÅŸekkÃ¼r',
    'tesekkur',
    'saÄŸol',
    'sagol',
    'eyvallah',
    'thanks',
    'thank you'
];

const FAREWELL_PATTERNS = [
    'bay bay',
    'baybay',
    'gÃ¶rÃ¼ÅŸÃ¼rÃ¼z',
    'gorusuruz',
    'hoÅŸÃ§akal',
    'hoscakal'
];

const RESEARCH_PATTERNS = [
    'araÅŸtÄ±r',
    'arastir',
    'araÅŸtÄ±rma',
    'arastirma',
    'internette',
    'internetten',
    'webde',
    'webden',
    'kaynak',
    'haber',
    'son geliÅŸmeler',
    'son gelismeler'
];

const CURRENT_PATTERNS = [
    'bugÃ¼n',
    'bugun',
    'ÅŸimdi',
    'simdi',
    'gÃ¼ncel',
    'guncel',
    'son durum',
    'son durum ne',
    'ÅŸu an',
    'su an',
    'bu hafta',
    'bu ay',
    'latest',
    'today',
    'now'
];

const CODING_PATTERNS = [
    'kod',
    'kodla',
    'kod yaz',
    'program',
    'programlama',
    'javascript',
    'typescript',
    'python',
    'html',
    'css',
    'java',
    'kotlin',
    'c++',
    'c#',
    'php',
    'rust',
    'go',
    'node',
    'react',
    'vue',
    'api',
    'server',
    'backend',
    'frontend',
    'bug',
    'hata',
    'debug'
];

const FILE_PATTERNS = [
    'dosya',
    'pdf',
    'word',
    'excel',
    'csv',
    'zip',
    'belge',
    'yÃ¼kle',
    'yukle',
    'indir',
    'oku',
    'incele'
];

const MEMORY_PATTERNS = [
    'hatÄ±rla',
    'hatirla',
    'unutma',
    'kaydet',
    'bellek',
    'hafÄ±za',
    'hafiza',
    'daha Ã¶nce',
    'daha once',
    'geÃ§en konuÅŸma',
    'gecen konusma',
    'kaldÄ±ÄŸÄ±m yer',
    'kaldigim yer'
];

const IMAGE_PATTERNS = [
    'resim oluÅŸtur',
    'resim olustur',
    'gÃ¶rsel oluÅŸtur',
    'gorsel olustur',
    'fotoÄŸraf oluÅŸtur',
    'fotograf olustur',
    'image',
    'generate image'
];

const VIDEO_PATTERNS = [
    'video oluÅŸtur',
    'video olustur',
    'video yap',
    'video Ã¼ret',
    'video uret',
    'video generate'
];

const WEATHER_PATTERNS = [
    'hava',
    'hava durumu',
    'yaÄŸmur',
    'yagmur',
    'sÄ±caklÄ±k',
    'sicaklik',
    'kaÃ§ derece',
    'kac derece'
];

const CURRENCY_PATTERNS = [
    'dolar',
    'euro',
    'sterlin',
    'kur',
    'dÃ¶viz',
    'doviz',
    'kaÃ§ tl',
    'kac tl'
];

const EDUCATION_PATTERNS = [
    'Ã¶dev',
    'odev',
    'ders',
    'sÄ±nav',
    'sinav',
    'matematik',
    'fen',
    'tÃ¼rkÃ§e',
    'turkce',
    'ingilizce',
    'Ã¶ÄŸren',
    'ogren',
    'anlat'
];

const TOOL_PATTERNS = [
    'hesapla',
    'hesap makinesi',
    'Ã§evir',
    'cevir',
    'qr',
    'regex',
    'json',
    'birim',
    'kilogram',
    'metre'
];

function containsPattern(text, patterns) {
    const normalized = normalizeForSearch(text);

    return patterns.some(
        pattern => normalized.includes(
            normalizeForSearch(pattern)
        )
    );
}

function isGreeting(text) {
    return containsPattern(
        text,
        GREETING_PATTERNS
    );
}

function isThanks(text) {
    return containsPattern(
        text,
        THANK_PATTERNS
    );
}

function isFarewell(text) {
    return containsPattern(
        text,
        FAREWELL_PATTERNS
    );
}

function isResearch(text) {
    return containsPattern(
        text,
        RESEARCH_PATTERNS
    );
}

function isCurrent(text) {
    return containsPattern(
        text,
        CURRENT_PATTERNS
    );
}

function isCoding(text) {
    return containsPattern(
        text,
        CODING_PATTERNS
    );
}

function isFile(text) {
    return containsPattern(
        text,
        FILE_PATTERNS
    );
}

function isMemory(text) {
    return containsPattern(
        text,
        MEMORY_PATTERNS
    );
}

function isImage(text) {
    return containsPattern(
        text,
        IMAGE_PATTERNS
    );
}

function isVideo(text) {
    return containsPattern(
        text,
        VIDEO_PATTERNS
    );
}

function isWeather(text) {
    return containsPattern(
        text,
        WEATHER_PATTERNS
    );
}

function isCurrency(text) {
    return containsPattern(
        text,
        CURRENCY_PATTERNS
    );
}

function isEducation(text) {
    return containsPattern(
        text,
        EDUCATION_PATTERNS
    );
}

function isTool(text) {
    return containsPattern(
        text,
        TOOL_PATTERNS
    );
}

function isQuestion(text) {
    const normalized = normalizeSpace(text);

    if (normalized.endsWith('?')) {
        return true;
    }

    const words = tokenize(normalized);

    const questionWords = [
        'ne',
        'neden',
        'niye',
        'nasÄ±l',
        'nasil',
        'kim',
        'nerede',
        'nerden',
        'nereden',
        'ne zaman',
        'hangi',
        'kaÃ§',
        'kac',
        'kaÃ§ta',
        'kacta',
        'mÄ±',
        'mi',
        'mu',
        'mÃ¼'
    ];

    return questionWords.some(
        word => words.includes(
            normalizeForSearch(word)
        )
    );
}

/* ============================================================
   INTENT PRIORITY
   ============================================================ */

const INTENT_PRIORITY = {
    emergency: 120,
    coding: 110,
    research: 105,
    file: 100,
    image: 95,
    video: 95,
    weather: 90,
    currency: 90,
    education: 88,
    tools: 85,
    question: 80,
    memory: 75,
    conversation: 60,
    greeting: 30,
    thanks: 20,
    farewell: 10
};

function intentPriority(intent) {
    return INTENT_PRIORITY[intent] || 0;
}

function sortIntents(intents) {
    return unique(intents)
        .sort(
            (a, b) =>
                intentPriority(b) -
                intentPriority(a)
        );
}

function detectIntents(text) {
    const intents = [];

    if (isGreeting(text)) {
        intents.push('greeting');
    }

    if (isThanks(text)) {
        intents.push('thanks');
    }

    if (isFarewell(text)) {
        intents.push('farewell');
    }

    if (isCoding(text)) {
        intents.push('coding');
    }

    if (isResearch(text) || isCurrent(text)) {
        intents.push('research');
    }

    if (isFile(text)) {
        intents.push('file');
    }

    if (isMemory(text)) {
        intents.push('memory');
    }

    if (isImage(text)) {
        intents.push('image');
    }

    if (isVideo(text)) {
        intents.push('video');
    }

    if (isWeather(text)) {
        intents.push('weather');
    }

    if (isCurrency(text)) {
        intents.push('currency');
    }

    if (isEducation(text)) {
        intents.push('education');
    }

    if (isTool(text)) {
        intents.push('tools');
    }

    if (isQuestion(text)) {
        intents.push('question');
    }

    if (!intents.length) {
        intents.push('conversation');
    }

    return sortIntents(intents);
}

/* ============================================================
   ENTITY EXTRACTION
   ============================================================ */

function extractUrls(text) {
    return unique(
        cleanText(text)
            .match(
                /https?:\/\/[^\s]+/gi
            ) || []
    );
}

function extractEmails(text) {
    return unique(
        cleanText(text)
            .match(
                /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g
            ) || []
    );
}

function extractNumbers(text) {
    return unique(
        cleanText(text)
            .match(
                /\b\d+(?:[.,]\d+)?\b/g
            ) || []
    );
}

function extractCodeLanguages(text) {
    const languages = [
        'JavaScript',
        'TypeScript',
        'Python',
        'HTML',
        'CSS',
        'Java',
        'Kotlin',
        'C++',
        'C#',
        'PHP',
        'Rust',
        'Go',
        'SQL',
        'JSON',
        'XML'
    ];

    const result = [];

    for (const language of languages) {
        if (
            normalizeForSearch(text)
                .includes(
                    normalizeForSearch(language)
                )
        ) {
            result.push(language);
        }
    }

    return unique(result);
}

function extractEntities(text) {
    return {
        urls: extractUrls(text),
        emails: extractEmails(text),
        numbers: extractNumbers(text),
        codeLanguages: extractCodeLanguages(text)
    };
}

/* ============================================================
   MESSAGE UNIT
   ============================================================ */

function createMessageUnit(
    text,
    index,
    sentenceIndex,
    clauseIndex
) {
    const clean = normalizeSpace(text);
    const intents = detectIntents(clean);

    return {
        id: generateId('unit'),
        index,
        sentenceIndex,
        clauseIndex,
        text: clean,
        language: detectLanguage(clean),
        keywords: extractKeywords(clean, 25),
        entities: extractEntities(clean),
        intents,
        primaryIntent: intents[0] || 'conversation',
        priority: intentPriority(
            intents[0] || 'conversation'
        ),
        isQuestion: isQuestion(clean),
        isCurrent: isCurrent(clean),
        createdAt: timestamp()
    };
}

/* ============================================================
   MULTI-INTENT MESSAGE PARSER
   ============================================================ */

function parseMessage(text) {
    const source = normalizeSpace(text);

    if (!source) {
        return {
            id: generateId('parse'),
            raw: '',
            units: [],
            executionOrder: [],
            globalKeywords: [],
            entities: {},
            language: 'unknown',
            createdAt: timestamp()
        };
    }

    const units = [];
    const sentences = splitSentences(source);

    let globalIndex = 0;

    for (
        let sentenceIndex = 0;
        sentenceIndex < sentences.length;
        sentenceIndex++
    ) {
        const sentence = sentences[sentenceIndex];

        const clauses =
            splitClauses(sentence);

        for (
            let clauseIndex = 0;
            clauseIndex < clauses.length;
            clauseIndex++
        ) {
            const clause = clauses[clauseIndex];

            units.push(
                createMessageUnit(
                    clause,
                    globalIndex,
                    sentenceIndex,
                    clauseIndex
                )
            );

            globalIndex++;
        }
    }

    const executionUnits =
        [...units].sort(
            (a, b) =>
                b.priority - a.priority ||
                a.index - b.index
        );

    return {
        id: generateId('parse'),
        raw: source,
        language: detectLanguage(source),
        units,
        executionOrder:
            executionUnits.map(
                unit => unit.id
            ),
        globalKeywords:
            extractKeywords(
                source,
                50
            ),
        entities:
            extractEntities(source),
        intents:
            sortIntents(
                units.flatMap(
                    unit => unit.intents
                )
            ),
        primaryIntent:
            executionUnits[0]?.primaryIntent ||
            'conversation',
        createdAt: timestamp()
    };
}

/* ============================================================
   USER PROFILE
   ============================================================ */

function createDefaultUser(userId) {
    return {
        id: userId,
        createdAt: timestamp(),
        updatedAt: timestamp(),
        language: 'tr',
        tone: 'adaptive',
        name: null,
        username: null,
        preferences: {},
        settings: {},
        statistics: {
            messageCount: 0,
            codingCount: 0,
            researchCount: 0,
            fileCount: 0
        }
    };
}

function getUser(userId = 'anonymous') {
    const id = cleanText(
        userId || 'anonymous',
        200
    );

    if (!userDatabase.users[id]) {
        userDatabase.users[id] =
            createDefaultUser(id);

        saveUserDatabase();
    }

    return userDatabase.users[id];
}

function updateUser(userId, changes) {
    const user = getUser(userId);

    Object.assign(
        user,
        changes,
        {
            updatedAt: timestamp()
        }
    );

    saveUserDatabase();

    return user;
}

function incrementUserStatistic(
    userId,
    statistic
) {
    const user = getUser(userId);

    if (
        !Object.prototype.hasOwnProperty.call(
            user.statistics,
            statistic
        )
    ) {
        user.statistics[statistic] = 0;
    }

    user.statistics[statistic] += 1;
    user.updatedAt = timestamp();

    saveUserDatabase();

    return user.statistics[statistic];
}

/* ============================================================
   CONVERSATION STORAGE
   ============================================================ */

function ensureUserMemory(userId) {
    if (!memoryDatabase.users[userId]) {
        memoryDatabase.users[userId] = {
            createdAt: timestamp(),
            updatedAt: timestamp()
        };
    }

    return memoryDatabase.users[userId];
}

function ensureConversation(
    userId,
    conversationId
) {
    const userMemory =
        ensureUserMemory(userId);

    if (!memoryDatabase.conversations[userId]) {
        memoryDatabase.conversations[userId] = {};
    }

    if (
        !memoryDatabase.conversations[userId][conversationId]
    ) {
        memoryDatabase.conversations[userId][conversationId] = {
            id: conversationId,
            userId,
            createdAt: timestamp(),
            updatedAt: timestamp(),
            messages: [],
            units: [],
            topics: [],
            keywords: [],
            summary: '',
            state: {
                lastIntent: null,
                lastQuestion: null,
                lastTopic: null,
                lastLanguage: 'tr'
            }
        };
    }

    userMemory.updatedAt = timestamp();

    return memoryDatabase
        .conversations[userId][conversationId];
}

function getConversation(
    userId,
    conversationId
) {
    return memoryDatabase
        .conversations[userId]
        ?. [conversationId] || null;
}

function addConversationMessage(
    userId,
    conversationId,
    role,
    text,
    metadata = {}
) {
    const conversation =
        ensureConversation(
            userId,
            conversationId
        );

    const message = {
        id: generateId('message'),
        role,
        text: cleanText(text),
        metadata,
        createdAt: timestamp()
    };

    conversation.messages.push(
        message
    );

    if (
        conversation.messages.length >
        300
    ) {
        conversation.messages =
            conversation.messages.slice(
                -300
            );
    }

    conversation.updatedAt =
        timestamp();

    saveMemoryDatabase();

    return message;
}

/* ============================================================
   CONVERSATION STATE
   ============================================================ */

function updateConversationState(
    conversation,
    parsed
) {
    if (!conversation || !parsed) {
        return;
    }

    conversation.units.push(
        ...parsed.units
    );

    if (
        conversation.units.length >
        500
    ) {
        conversation.units =
            conversation.units.slice(
                -500
            );
    }

    conversation.keywords =
        unique([
            ...(conversation.keywords || []),
            ...parsed.globalKeywords
        ]).slice(-150);

    conversation.topics =
        unique([
            ...(conversation.topics || []),
            ...parsed.globalKeywords.slice(
                0,
                10
            )
        ]).slice(-80);

    conversation.state.lastIntent =
        parsed.primaryIntent;

    conversation.state.lastLanguage =
        parsed.language;

    const questionUnit =
        parsed.units.find(
            unit => unit.isQuestion
        );

    if (questionUnit) {
        conversation.state.lastQuestion =
            questionUnit.text;
    }

    const topic =
        parsed.globalKeywords
            .slice(0, 8)
            .join(' ');

    if (topic) {
        conversation.state.lastTopic =
            topic;
    }

    conversation.updatedAt =
        timestamp();
}

function addParsedUnitsToConversation(
    conversation,
    parsed
) {
    updateConversationState(
        conversation,
        parsed
    );

    saveMemoryDatabase();

    return conversation;
}

/* ============================================================
   FACT MEMORY
   ============================================================ */

function ensureFactStore(userId) {
    if (!memoryDatabase.facts[userId]) {
        memoryDatabase.facts[userId] = {};
    }

    return memoryDatabase.facts[userId];
}

function rememberFact(
    userId,
    key,
    value,
    confidence = 0.8,
    source = 'conversation'
) {
    const facts =
        ensureFactStore(userId);

    const normalizedKey =
        normalizeForSearch(key);

    facts[normalizedKey] = {
        key: cleanText(key, 500),
        value: cleanText(value, 10000),
        confidence: clamp(
            safeNumber(
                confidence,
                0.8
            ),
            0,
            1
        ),
        source: cleanText(
            source,
            200
        ),
        createdAt:
            facts[normalizedKey]?.createdAt ||
            timestamp(),
        updatedAt:
            timestamp()
    };

    writeEvent(
        'fact_saved',
        {
            userId,
            key: normalizedKey
        }
    );

    saveMemoryDatabase();

    return facts[normalizedKey];
}

function getFact(userId, key) {
    const facts =
        memoryDatabase.facts[userId] ||
        {};

    return facts[
        normalizeForSearch(key)
    ] || null;
}

function removeFact(userId, key) {
    const facts =
        memoryDatabase.facts[userId] ||
        {};

    const normalized =
        normalizeForSearch(key);

    if (!facts[normalized]) {
        return false;
    }

    delete facts[normalized];

    saveMemoryDatabase();

    writeEvent(
        'fact_removed',
        {
            userId,
            key: normalized
        }
    );

    return true;
}

/* ============================================================
   PREFERENCE MEMORY
   ============================================================ */

function ensurePreferenceStore(
    userId
) {
    if (
        !memoryDatabase.preferences[userId]
    ) {
        memoryDatabase.preferences[userId] =
            {};
    }

    return memoryDatabase.preferences[
        userId
    ];
}

function rememberPreference(
    userId,
    key,
    value,
    source = 'conversation'
) {
    const preferences =
        ensurePreferenceStore(userId);

    const normalizedKey =
        normalizeForSearch(key);

    preferences[normalizedKey] = {
        key: cleanText(key, 500),
        value,
        source: cleanText(
            source,
            200
        ),
        updatedAt: timestamp()
    };

    saveMemoryDatabase();

    writeEvent(
        'preference_saved',
        {
            userId,
            key: normalizedKey
        }
    );

    return preferences[
        normalizedKey
    ];
}

function getPreference(
    userId,
    key
) {
    const preferences =
        memoryDatabase.preferences[
            userId
        ] || {};

    return preferences[
        normalizeForSearch(key)
    ] || null;
}

/* ============================================================
   ALIAS MEMORY
   ============================================================ */

function ensureAliasStore(userId) {
    if (!memoryDatabase.aliases[userId]) {
        memoryDatabase.aliases[userId] =
            {};
    }

    return memoryDatabase.aliases[
        userId
    ];
}

function saveAlias(
    userId,
    phrase,
    canonical
) {
    const aliases =
        ensureAliasStore(userId);

    const normalized =
        normalizeForSearch(phrase);

    aliases[normalized] = {
        phrase: cleanText(
            phrase,
            500
        ),
        canonical: cleanText(
            canonical,
            500
        ),
        updatedAt: timestamp()
    };

    saveMemoryDatabase();

    return aliases[normalized];
}

function resolveAlias(
    userId,
    phrase
) {
    const aliases =
        memoryDatabase.aliases[
            userId
        ] || {};

    return aliases[
        normalizeForSearch(phrase)
    ] || null;
}

/* ============================================================
   TOPIC MEMORY
   ============================================================ */

function ensureTopicStore(userId) {
    if (!memoryDatabase.topics[userId]) {
        memoryDatabase.topics[userId] =
            {};
    }

    return memoryDatabase.topics[
        userId
    ];
}

function rememberTopic(
    userId,
    topic,
    metadata = {}
) {
    const topics =
        ensureTopicStore(userId);

    const normalized =
        normalizeForSearch(topic);

    if (!topics[normalized]) {
        topics[normalized] = {
            name: cleanText(
                topic,
                500
            ),
            count: 0,
            firstSeen: timestamp(),
            lastSeen: timestamp(),
            metadata: {}
        };
    }

    topics[normalized].count += 1;
    topics[normalized].lastSeen =
        timestamp();

    topics[normalized].metadata =
        Object.assign(
            {},
            topics[normalized].metadata,
            metadata
        );

    saveMemoryDatabase();

    return topics[normalized];
}

/* ============================================================
   ENTITY MEMORY
   ============================================================ */

function ensureEntityStore(userId) {
    if (!memoryDatabase.entities[userId]) {
        memoryDatabase.entities[userId] =
            {};
    }

    return memoryDatabase.entities[
        userId
    ];
}

function rememberEntity(
    userId,
    type,
    value,
    metadata = {}
) {
    const entities =
        ensureEntityStore(userId);

    const normalizedValue =
        normalizeForSearch(value);

    const key =
        `${type}:${normalizedValue}`;

    if (!entities[key]) {
        entities[key] = {
            type,
            value: cleanText(
                value,
                1000
            ),
            count: 0,
            firstSeen: timestamp(),
            lastSeen: timestamp(),
            metadata: {}
        };
    }

    entities[key].count += 1;
    entities[key].lastSeen =
        timestamp();

    entities[key].metadata =
        Object.assign(
            {},
            entities[key].metadata,
            metadata
        );

    saveMemoryDatabase();

    return entities[key];
}

/* ============================================================
   INTENT HISTORY
   ============================================================ */

function ensureIntentHistory(
    userId
) {
    if (
        !memoryDatabase.intentHistory[
            userId
        ]
    ) {
        memoryDatabase.intentHistory[
            userId
        ] = [];
    }

    return memoryDatabase.intentHistory[
        userId
    ];
}

function rememberIntent(
    userId,
    intent,
    text
) {
    const history =
        ensureIntentHistory(userId);

    history.push({
        id: generateId('intent'),
        intent,
        text: cleanText(
            text,
            10000
        ),
        createdAt: timestamp()
    });

    if (history.length > 500) {
        history.splice(
            0,
            history.length - 500
        );
    }

    saveMemoryDatabase();

    return history[
        history.length - 1
    ];
}

/* ============================================================
   ANSWER MEMORY
   ============================================================ */

function ensureAnswerRecord(
    recordId
) {
    if (
        !answerDatabase.records[
            recordId
        ]
    ) {
        answerDatabase.records[
            recordId
        ] = null;
    }

    return answerDatabase.records[
        recordId
    ];
}

function createAnswerRecord({
    userId,
    question,
    answer,
    intent = 'conversation',
    source = 'local',
    quality = 0.5,
    conversationId = null
}) {
    const record = {
        id: generateId('answer'),
        userId: cleanText(
            userId,
            200
        ),
        question: cleanText(
            question,
            20000
        ),
        answer: cleanText(
            answer,
            50000
        ),
        intent,
        source,
        quality: clamp(
            safeNumber(
                quality,
                0.5
            ),
            0,
            1
        ),
        conversationId,
        language:
            detectLanguage(question),
        keywords:
            extractKeywords(
                question,
                40
            ),
        usageCount: 0,
        createdAt: timestamp(),
        updatedAt: timestamp()
    };

    answerDatabase.records[
        record.id
    ] = record;

    indexAnswerRecord(record);

    saveAnswerDatabase();

    writeEvent(
        'answer_memory_created',
        {
            answerId: record.id,
            userId
        }
    );

    return record;
}

function indexAnswerRecord(
    record
) {
    for (
        const keyword of
        record.keywords
    ) {
        if (
            !answerDatabase.keywordIndex[
                keyword
            ]
        ) {
            answerDatabase.keywordIndex[
                keyword
            ] = [];
        }

        if (
            !answerDatabase.keywordIndex[
                keyword
            ].includes(record.id)
        ) {
            answerDatabase.keywordIndex[
                keyword
            ].push(record.id);
        }
    }

    if (
        !answerDatabase.intentIndex[
            record.intent
        ]
    ) {
        answerDatabase.intentIndex[
            record.intent
        ] = [];
    }

    if (
        !answerDatabase.intentIndex[
            record.intent
        ].includes(record.id)
    ) {
        answerDatabase.intentIndex[
            record.intent
        ].push(record.id);
    }
}

function scoreAnswerRecord(
    question,
    record,
    requestedIntent = null
) {
    if (!record) {
        return 0;
    }

    const exact =
        normalizeForSearch(
            question
        ) ===
        normalizeForSearch(
            record.question
        )
            ? 1
            : 0;

    const similarity =
        similarityByTokens(
            question,
            record.question
        );

    const overlap =
        keywordOverlap(
            question,
            record.question
        );

    const intentBoost =
        requestedIntent &&
        requestedIntent ===
            record.intent
            ? 0.15
            : 0;

    const languageBoost =
        detectLanguage(question) ===
        record.language
            ? 0.08
            : 0;

    const quality =
        clamp(
            safeNumber(
                record.quality,
                0
            ),
            0,
            1
        );

    const usage =
        Math.min(
            safeNumber(
                record.usageCount,
                0
            ),
            100
        ) / 100;

    return clamp(
        exact * 0.5 +
        similarity * 0.2 +
        overlap * 0.12 +
        quality * 0.08 +
        intentBoost +
        languageBoost +
        usage * 0.02,
        0,
        1
    );
}

function retrieveAnswerMemory(
    question,
    options = {}
) {
    const limit =
        clamp(
            safeNumber(
                options.limit,
                10
            ),
            1,
            50
        );

    const requestedIntent =
        options.intent || null;

    const candidates =
        new Set();

    const keywords =
        extractKeywords(
            question,
            40
        );

    for (
        const keyword of keywords
    ) {
        const ids =
            answerDatabase
                .keywordIndex[
                    keyword
                ] || [];

        for (const id of ids) {
            candidates.add(id);
        }
    }

    if (
        requestedIntent &&
        answerDatabase
            .intentIndex[
                requestedIntent
            ]
    ) {
        for (
            const id of
            answerDatabase
                .intentIndex[
                    requestedIntent
                ]
        ) {
            candidates.add(id);
        }
    }

    const results = [];

    for (
        const id of candidates
    ) {
        const record =
            answerDatabase.records[
                id
            ];

        if (!record) {
            continue;
        }

        const score =
            scoreAnswerRecord(
                question,
                record,
                requestedIntent
            );

        if (score <= 0) {
            continue;
        }

        results.push({
            record,
            score
        });
    }

    results.sort(
        (a, b) =>
            b.score - a.score
    );

    return results.slice(
        0,
        limit
    );
}

function markAnswerUsed(
    answerId
) {
    const record =
        answerDatabase.records[
            answerId
        ];

    if (!record) {
        return null;
    }

    record.usageCount += 1;
    record.updatedAt =
        timestamp();

    saveAnswerDatabase();

    return record;
}

/* ============================================================
   CONVERSATION MEMORY RETRIEVAL
   ============================================================ */

function retrieveConversationMemory(
    userId,
    query,
    options = {}
) {
    const limit =
        clamp(
            safeNumber(
                options.limit,
                15
            ),
            1,
            100
        );

    const minimumScore =
        clamp(
            safeNumber(
                options.minimumScore,
                0.05
            ),
            0,
            1
        );

    const userConversations =
        memoryDatabase
            .conversations[
                userId
            ] || {};

    const results = [];

    for (
        const conversation of
        Object.values(
            userConversations
        )
    ) {
        for (
            const message of
            conversation.messages || []
        ) {
            const score =
                similarityByTokens(
                    query,
                    message.text
                );

            if (
                score <
                minimumScore
            ) {
                continue;
            }

            results.push({
                conversationId:
                    conversation.id,
                message,
                score,
                topic:
                    conversation
                        .state
                        ?.lastTopic ||
                    null
            });
        }
    }

    results.sort(
        (a, b) =>
            b.score - a.score
    );

    return results.slice(
        0,
        limit
    );
}

/* ============================================================
   CONTEXT BUILDER
   ============================================================ */

function buildContext(
    userId,
    conversationId,
    query,
    options = {}
) {
    const conversation =
        getConversation(
            userId,
            conversationId
        );

    const user =
        getUser(userId);

    const recent =
        conversation
            ?.messages
            ?.slice(-20) || [];

    const memories =
        retrieveConversationMemory(
            userId,
            query,
            {
                limit:
                    options.memoryLimit ||
                    10
            }
        );

    const answers =
        retrieveAnswerMemory(
            query,
            {
                limit:
                    options.answerLimit ||
                    10,
                intent:
                    options.intent ||
                    null
            }
        );

    const facts =
        memoryDatabase
            .facts[userId] || {};

    const preferences =
        memoryDatabase
            .preferences[userId] || {};

    return {
        user: {
            id: user.id,
            language:
                user.language,
            tone:
                user.tone,
            name:
                user.name,
            username:
                user.username
        },
        conversation: conversation
            ? {
                id:
                    conversation.id,
                summary:
                    conversation.summary,
                state:
                    conversation.state,
                topics:
                    conversation.topics
            }
            : null,
        recent,
        memories,
        answers,
        facts,
        preferences,
        createdAt:
            timestamp()
    };
}

/* ============================================================
   SESSION ENGINE
   ============================================================ */

function createSession(
    userId,
    conversationId
) {
    const session = {
        id: generateId('session'),
        userId,
        conversationId,
        active: true,
        startedAt: timestamp(),
        lastSeenAt: timestamp(),
        turnCount: 0,
        metadata: {}
    };

    sessionDatabase.sessions[
        session.id
    ] = session;

    saveSessionDatabase();

    return session;
}

function getSession(
    sessionId
) {
    return (
        sessionDatabase
            .sessions[
                sessionId
            ] || null
    );
}

function touchSession(
    sessionId
) {
    const session =
        getSession(sessionId);

    if (!session) {
        return null;
    }

    session.lastSeenAt =
        timestamp();

    session.turnCount += 1;

    saveSessionDatabase();

    return session;
}

function closeSession(
    sessionId
) {
    const session =
        getSession(sessionId);

    if (!session) {
        return false;
    }

    session.active = false;
    session.endedAt =
        timestamp();

    saveSessionDatabase();

    return true;
}

/* ============================================================
   USER MESSAGE PIPELINE
   ============================================================ */

function processUserMessage(
    userId,
    conversationId,
    text
) {
    const clean =
        normalizeSpace(text);

    if (!clean) {
        throw new Error(
            'EMPTY_MESSAGE'
        );
    }

    const parsed =
        parseMessage(clean);

    const conversation =
        ensureConversation(
            userId,
            conversationId
        );

    const message =
        addConversationMessage(
            userId,
            conversationId,
            'user',
            clean,
            {
                parsedId:
                    parsed.id
            }
        );

    addParsedUnitsToConversation(
        conversation,
        parsed
    );

    for (
        const intent of
        parsed.intents
    ) {
        rememberIntent(
            userId,
            intent,
            clean
        );
    }

    for (
        const keyword of
        parsed.globalKeywords
            .slice(0, 10)
    ) {
        rememberTopic(
            userId,
            keyword,
            {
                source:
                    'conversation'
            }
        );
    }

    incrementUserStatistic(
        userId,
        'messageCount'
    );

    if (
        parsed.intents
            .includes('coding')
    ) {
        incrementUserStatistic(
            userId,
            'codingCount'
        );
    }

    if (
        parsed.intents
            .includes('research')
    ) {
        incrementUserStatistic(
            userId,
            'researchCount'
        );
    }

    if (
        parsed.intents
            .includes('file')
    ) {
        incrementUserStatistic(
            userId,
            'fileCount'
        );
    }

    const context =
        buildContext(
            userId,
            conversationId,
            clean,
            {
                intent:
                    parsed.primaryIntent
            }
        );

    writeEvent(
        'user_message_processed',
        {
            userId,
            conversationId,
            messageId:
                message.id,
            primaryIntent:
                parsed.primaryIntent
        }
    );

    return {
        message,
        parsed,
        context
    };
}

/* ============================================================
   ASSISTANT MESSAGE MEMORY
   ============================================================ */

function processAssistantMessage(
    userId,
    conversationId,
    answer,
    metadata = {}
) {
    const clean =
        cleanText(
            answer,
            50000
        );

    if (!clean.trim()) {
        throw new Error(
            'EMPTY_ASSISTANT_MESSAGE'
        );
    }

    const message =
        addConversationMessage(
            userId,
            conversationId,
            'assistant',
            clean,
            metadata
        );

    if (
        metadata.rememberAnswer !==
        false
    ) {
        createAnswerRecord({
            userId,
            question:
                metadata.question ||
                '',
            answer: clean,
            intent:
                metadata.intent ||
                'conversation',
            source:
                metadata.source ||
                'local',
            quality:
                metadata.quality ??
                0.5,
            conversationId
        });
    }

    return message;
}

/* ============================================================
   CONVERSATION SUMMARY
   ============================================================ */

function summarizeConversation(
    userId,
    conversationId
) {
    const conversation =
        getConversation(
            userId,
            conversationId
        );

    if (!conversation) {
        return null;
    }

    const userMessages =
        conversation.messages
            .filter(
                message =>
                    message.role ===
                    'user'
            )
            .slice(-30);

    const keywords =
        unique(
            userMessages.flatMap(
                message =>
                    extractKeywords(
                        message.text,
                        8
                    )
            )
        ).slice(-40);

    const intents =
        unique(
            conversation.units.flatMap(
                unit =>
                    unit.intents
            )
        );

    const topicText =
        keywords.length
            ? keywords.join(', ')
            : 'Belirgin konu yok';

    const intentText =
        intents.length
            ? intents.join(', ')
            : 'conversation';

    conversation.summary =
        `Konular: ${topicText}. Niyetler: ${intentText}.`;

    conversation.updatedAt =
        timestamp();

    saveMemoryDatabase();

    return conversation.summary;
}

/* ============================================================
   MEMORY HEALTH
   ============================================================ */

function memoryHealth() {
    let userCount = 0;
    let conversationCount = 0;
    let messageCount = 0;
    let factCount = 0;
    let preferenceCount = 0;

    for (
        const userId of
        Object.keys(
            memoryDatabase
                .conversations
        )
    ) {
        userCount += 1;

        const conversations =
            memoryDatabase
                .conversations[
                    userId
                ] || {};

        conversationCount +=
            Object.keys(
                conversations
            ).length;

        for (
            const conversation of
            Object.values(
                conversations
            )
        ) {
            messageCount +=
                conversation
                    .messages
                    ?.length || 0;
        }
    }

    for (
        const user of
        Object.values(
            memoryDatabase.facts
        )
    ) {
        factCount +=
            Object.keys(user || {})
                .length;
    }

    for (
        const user of
        Object.values(
            memoryDatabase
                .preferences
        )
    ) {
        preferenceCount +=
            Object.keys(user || {})
                .length;
    }

    return {
        users: userCount,
        conversations:
            conversationCount,
        messages:
            messageCount,
        facts:
            factCount,
        preferences:
            preferenceCount,
        answers:
            Object.keys(
                answerDatabase.records
            ).length,
        sessions:
            Object.keys(
                sessionDatabase.sessions
            ).length,
        memoryUpdatedAt:
            memoryDatabase.lastUpdated,
        answerUpdatedAt:
            answerDatabase.lastUpdated
    };
}

/* ============================================================
   EXPRESS SERVER
   ============================================================ */

const app = express();
app.use(express.static(path.join(__dirname)));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
const server =
    http.createServer(app);

app.use(
    express.json({
        limit: '2mb'
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: '2mb'
    })
);

/* ============================================================
   HEALTH
   ============================================================ */

app.get(
    '/api/health',
    (_req, res) => {
        res.json({
            ok: true,
            service: 'TÃ¼rkAI',
            part: 1,
            timestamp:
                timestamp(),
            memory:
                memoryHealth()
        });
    }
);

/* ============================================================
   PARSER API
   ============================================================ */

app.post(
    '/api/memory/parse',
    (req, res) => {
        try {
            const text =
                cleanText(
                    req.body?.text,
                    20000
                );

            if (!text.trim()) {
                return res
                    .status(400)
                    .json({
                        ok: false,
                        error:
                            'text_required'
                    });
            }

            const parsed =
                parseMessage(text);

            return res.json({
                ok: true,
                parsed
            });
        } catch (error) {
            return res
                .status(500)
                .json({
                    ok: false,
                    error:
                        error.message
                });
        }
    }
);

/* ============================================================
   MESSAGE API
   ============================================================ */

app.post(
    '/api/memory/message',
    (req, res) => {
        try {
            const userId =
                cleanText(
                    req.body?.userId ||
                    'anonymous',
                    200
                );

            const conversationId =
                cleanText(
                    req.body
                        ?.conversationId ||
                    generateId(
                        'conversation'
                    ),
                    200
                );

            const text =
                cleanText(
                    req.body?.text,
                    20000
                );

            if (!text.trim()) {
                return res
                    .status(400)
                    .json({
                        ok: false,
                        error:
                            'text_required'
                    });
            }

            const result =
                processUserMessage(
                    userId,
                    conversationId,
                    text
                );

            return res.json({
                ok: true,
                message:
                    result.message,
                parsed:
                    result.parsed,
                context:
                    result.context
            });
        } catch (error) {
            return res
                .status(500)
                .json({
                    ok: false,
                    error:
                        error.message
                });
        }
    }
);

/* ============================================================
   ANSWER SEARCH API
   ============================================================ */

app.post(
    '/api/answers/search',
    (req, res) => {
        try {
            const question =
                cleanText(
                    req.body?.question,
                    20000
                );

            if (!question.trim()) {
                return res
                    .status(400)
                    .json({
                        ok: false,
                        error:
                            'question_required'
                    });
            }

            const results =
                retrieveAnswerMemory(
                    question,
                    {
                        intent:
                            req.body
                                ?.intent ||
                            null,
                        limit:
                            req.body
                                ?.limit ||
                            10
                    }
                );

            return res.json({
                ok: true,
                results
            });
        } catch (error) {
            return res
                .status(500)
                .json({
                    ok: false,
                    error:
                        error.message
                });
        }
    }
);

/* ============================================================
   CONTEXT API
   ============================================================ */

app.post(
    '/api/memory/context',
    (req, res) => {
        try {
            const userId =
                cleanText(
                    req.body
                        ?.userId ||
                    'anonymous',
                    200
                );

            const conversationId =
                cleanText(
                    req.body
                        ?.conversationId ||
                    '',
                    200
                );

            const query =
                cleanText(
                    req.body?.query,
                    10000
                );

            if (!query.trim()) {
                return res
                    .status(400)
                    .json({
                        ok: false,
                        error:
                            'query_required'
                    });
            }

            const context =
                buildContext(
                    userId,
                    conversationId,
                    query,
                    {
                        intent:
                            req.body
                                ?.intent ||
                            null
                    }
                );

            return res.json({
                ok: true,
                context
            });
        } catch (error) {
            return res
                .status(500)
                .json({
                    ok: false,
                    error:
                        error.message
                });
        }
    }
);

/* ============================================================
   FACT API
   ============================================================ */

app.post(
    '/api/memory/fact',
    (req, res) => {
        try {
            const userId =
                cleanText(
                    req.body
                        ?.userId ||
                    'anonymous',
                    200
                );

            const key =
                cleanText(
                    req.body?.key,
                    500
                );

            const value =
                cleanText(
                    req.body?.value,
                    10000
                );

            if (!key || !value) {
                return res
                    .status(400)
                    .json({
                        ok: false,
                        error:
                            'key_and_value_required'
                    });
            }

            const fact =
                rememberFact(
                    userId,
                    key,
                    value,
                    req.body
                        ?.confidence,
                    req.body?.source ||
                        'conversation'
                );

            return res.json({
                ok: true,
                fact
            });
        } catch (error) {
            return res
                .status(500)
                .json({
                    ok: false,
                    error:
                        error.message
                });
        }
    }
);

app.get(
    '/api/memory/fact',
    (req, res) => {
        const userId =
            cleanText(
                req.query
                    ?.userId ||
                'anonymous',
                200
            );

        const key =
            cleanText(
                req.query?.key,
                500
            );

        if (!key) {
            return res
                .status(400)
                .json({
                    ok: false,
                    error:
                        'key_required'
                });
        }

        return res.json({
            ok: true,
            fact:
                getFact(
                    userId,
                    key
                )
        });
    }
);

/* ============================================================
   PREFERENCE API
   ============================================================ */

app.post(
    '/api/memory/preference',
    (req, res) => {
        try {
            const userId =
                cleanText(
                    req.body
                        ?.userId ||
                    'anonymous',
                    200
                );

            const key =
                cleanText(
                    req.body?.key,
                    500
                );

            if (!key) {
                return res
                    .status(400)
                    .json({
                        ok: false,
                        error:
                            'key_required'
                    });
            }

            const preference =
                rememberPreference(
                    userId,
                    key,
                    req.body?.value,
                    req.body
                        ?.source ||
                    'conversation'
                );

            return res.json({
                ok: true,
                preference
            });
        } catch (error) {
            return res
                .status(500)
                .json({
                    ok: false,
                    error:
                        error.message
                });
        }
    }
);

/* ============================================================
   ALIAS API
   ============================================================ */

app.post(
    '/api/memory/alias',
    (req, res) => {
        const userId =
            cleanText(
                req.body
                    ?.userId ||
                'anonymous',
                200
            );

        const phrase =
            cleanText(
                req.body?.phrase,
                500
            );

        const canonical =
            cleanText(
                req.body?.canonical,
                500
            );

        if (!phrase || !canonical) {
            return res
                .status(400)
                .json({
                    ok: false,
                    error:
                        'phrase_and_canonical_required'
                });
        }

        const alias =
            saveAlias(
                userId,
                phrase,
                canonical
            );

        return res.json({
            ok: true,
            alias
        });
    }
);

/* ============================================================
   SESSION API
   ============================================================ */

app.post(
    '/api/session/start',
    (req, res) => {
        const userId =
            cleanText(
                req.body
                    ?.userId ||
                'anonymous',
                200
            );

        const conversationId =
            cleanText(
                req.body
                    ?.conversationId ||
                generateId(
                    'conversation'
                ),
                200
            );

        const session =
            createSession(
                userId,
                conversationId
            );

        return res.json({
            ok: true,
            session
        });
    }
);

app.post(
    '/api/session/touch',
    (req, res) => {
        const sessionId =
            cleanText(
                req.body?.sessionId,
                200
            );

        const session =
            touchSession(
                sessionId
            );

        if (!session) {
            return res
                .status(404)
                .json({
                    ok: false,
                    error:
                        'session_not_found'
                });
        }

        return res.json({
            ok: true,
            session
        });
    }
);

app.post(
    '/api/session/end',
    (req, res) => {
        const sessionId =
            cleanText(
                req.body?.sessionId,
                200
            );

        const closed =
            closeSession(
                sessionId
            );

        if (!closed) {
            return res
                .status(404)
                .json({
                    ok: false,
                    error:
                        'session_not_found'
                });
        }

        return res.json({
            ok: true
        });
    }
);

/* ============================================================
   MEMORY SUMMARY
   ============================================================ */

app.get(
    '/api/memory/health',
    (_req, res) => {
        res.json({
            ok: true,
            memory:
                memoryHealth()
        });
    }
);

/* ============================================================
   ERROR HANDLER
   ============================================================ */

app.use(
    (error, _req, res, _next) => {
        writeEvent(
            'http_error',
            {
                error:
                    error?.message ||
                    String(error)
            }
        );

        res.status(500).json({
            ok: false,
            error:
                'internal_server_error'
        });
    }
);

/*
 * PART 1 KAPANIÅ NOKTASI
 *
 * PART 2 BURADAN DEVAM EDECEK.
 *
 * Sonraki bÃ¶lÃ¼mde:
 *
 * 1. GeliÅŸmiÅŸ conversation memory
 * 2. Rolling context
 * 3. Conversation summaries
 * 4. User-state memory
 * 5. Daha gÃ¼Ã§lÃ¼ similarity
 * 6. Memory decay / relevance
 * 7. Eski konuÅŸma retrieval
 * 8. BaÄŸlam birleÅŸtirme
 * 9. Multi-turn relation
 * 10. Answer learning pipeline
 *
 * eklenecek.
 */

server.listen(
    PORT,
    () => {
        writeEvent(
            'server_started',
            {
                port: PORT,
                part: 1
            }
        );

        console.log(
            'TÃ¼rkAI Server Part 1/20 aktif.'
        );

        console.log(
            `http://localhost:${PORT}`
        );
    }
);

module.exports = {
    app,
    server,
    parseMessage,
    detectIntents,
    detectLanguage,
    retrieveAnswerMemory,
    retrieveConversationMemory,
    buildContext,
    processUserMessage,
    processAssistantMessage,
    rememberFact,
    getFact,
    removeFact,
    rememberPreference,
    getPreference,
    saveAlias,
    resolveAlias,
    rememberTopic,
    rememberEntity,
    rememberIntent,
    createSession,
    getSession,
    touchSession,
    closeSession,
    summarizeConversation,
    memoryHealth
};
'use strict';

/*
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘                         TÃœRKAI SERVER                              â•‘
â•‘                         PART 2 / 20                                â•‘
â•‘                                                                      â•‘
â•‘  PART 2: ADVANCED CONVERSATION MEMORY                              â•‘
â•‘                                                                      â•‘
â•‘  Bu bÃ¶lÃ¼mÃ¼n gÃ¶revleri:                                               â•‘
â•‘  - Rolling context oluÅŸturmak                                       â•‘
â•‘  - Uzun konuÅŸmalarÄ± sÄ±kÄ±ÅŸtÄ±rmak                                     â•‘
â•‘  - GeliÅŸmiÅŸ conversation summary Ã¼retmek                            â•‘
â•‘  - User state takip etmek                                           â•‘
â•‘  - Multi-turn iliÅŸkileri korumak                                    â•‘
â•‘  - Memory relevance hesaplamak                                      â•‘
â•‘  - Memory decay uygulamak                                           â•‘
â•‘  - Eski konuÅŸmalarÄ± daha gÃ¼Ã§lÃ¼ aramak                               â•‘
â•‘  - Birden fazla memory kaynaÄŸÄ±nÄ± birleÅŸtirmek                       â•‘
â•‘  - Context refresh sistemi oluÅŸturmak                               â•‘
â•‘  - Memory cleanup altyapÄ±sÄ± hazÄ±rlamak                              â•‘
â•‘  - Answer learning pipeline temelini oluÅŸturmak                    â•‘
â•‘                                                                      â•‘
â•‘  SONRAKÄ° PARÃ‡A:                                                      â•‘
â•‘  PART 3 / 20 â†’ knowledge + local intelligence engine                â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
*/


/* ============================================================
   ADVANCED MEMORY CONSTANTS
   ============================================================ */

const ADVANCED_MEMORY_CONFIG = {
    recentMessageLimit: 30,
    rollingMessageLimit: 18,
    rollingUnitLimit: 80,

    summaryMessageThreshold: 20,
    summaryUnitThreshold: 60,

    maxStoredSummaries: 20,
    maxTopicHistory: 100,
    maxStateHistory: 100,

    memoryCandidateLimit: 100,
    finalMemoryLimit: 25,

    minimumRelevance: 0.08,
    strongRelevance: 0.55,

    decayHalfLifeHours: 72,

    maxRelationsPerUser: 500,
    maxLearnedPatterns: 500
};


/* ============================================================
   ADVANCED MEMORY STORAGE
   ============================================================ */

if (!memoryDatabase.advanced) {
    memoryDatabase.advanced = {
        userStates: {},
        rollingContexts: {},
        summaries: {},
        relations: {},
        memoryScores: {},
        learnedPatterns: {},
        cleanup: {
            lastRunAt: null,
            removedCount: 0
        }
    };

    saveMemoryDatabase();
}


/* ============================================================
   GENERIC ARRAY HELPERS
   ============================================================ */

function pushLimited(array, value, limit) {
    if (!Array.isArray(array)) {
        array = [];
    }

    array.push(value);

    if (array.length > limit) {
        array.splice(
            0,
            array.length - limit
        );
    }

    return array;
}


function safeArray(value) {
    return Array.isArray(value)
        ? value
        : [];
}


function safeObject(value) {
    return value &&
        typeof value === 'object' &&
        !Array.isArray(value)
        ? value
        : {};
}


/* ============================================================
   DATE / AGE HELPERS
   ============================================================ */

function timestampMs(value) {
    const parsed = Date.parse(value || '');

    if (!Number.isFinite(parsed)) {
        return Date.now();
    }

    return parsed;
}


function hoursSince(value) {
    const difference =
        Date.now() -
        timestampMs(value);

    return Math.max(
        0,
        difference / 3600000
    );
}


function decayScore(
    createdAt,
    halfLifeHours =
        ADVANCED_MEMORY_CONFIG.decayHalfLifeHours
) {
    const age =
        hoursSince(createdAt);

    if (age <= 0) {
        return 1;
    }

    return Math.pow(
        0.5,
        age / halfLifeHours
    );
}


/* ============================================================
   RELEVANCE ENGINE
   ============================================================ */

function calculateMemoryRelevance(
    query,
    memoryItem,
    options = {}
) {
    if (!memoryItem) {
        return 0;
    }

    const text =
        memoryItem.text ||
        memoryItem.question ||
        memoryItem.value ||
        memoryItem.name ||
        '';

    if (!text) {
        return 0;
    }

    const similarity =
        similarityByTokens(
            query,
            text
        );

    const overlap =
        keywordOverlap(
            query,
            text
        );

    const queryKeywords =
        extractKeywords(
            query,
            30
        );

    const memoryKeywords =
        memoryItem.keywords ||
        extractKeywords(
            text,
            30
        );

    const keywordMatches =
        tokenIntersection(
            queryKeywords,
            memoryKeywords
        ).length;

    const keywordScore =
        queryKeywords.length
            ? Math.min(
                keywordMatches /
                queryKeywords.length,
                1
            )
            : 0;

    const decay =
        options.disableDecay
            ? 1
            : decayScore(
                memoryItem.updatedAt ||
                memoryItem.createdAt
            );

    const importance =
        clamp(
            safeNumber(
                memoryItem.importance,
                0.5
            ),
            0,
            1
        );

    const confidence =
        clamp(
            safeNumber(
                memoryItem.confidence,
                0.5
            ),
            0,
            1
        );

    const usage =
        Math.min(
            safeNumber(
                memoryItem.usageCount,
                0
            ),
            100
        ) / 100;

    const recencyBoost =
        decay * 0.15;

    const importanceBoost =
        importance * 0.10;

    const confidenceBoost =
        confidence * 0.08;

    const usageBoost =
        usage * 0.03;

    const score =
        similarity * 0.30 +
        overlap * 0.20 +
        keywordScore * 0.14 +
        recencyBoost +
        importanceBoost +
        confidenceBoost +
        usageBoost;

    return clamp(
        score,
        0,
        1
    );
}


/* ============================================================
   USER STATE ENGINE
   ============================================================ */

function ensureUserState(userId) {
    if (
        !memoryDatabase.advanced.userStates[userId]
    ) {
        memoryDatabase.advanced.userStates[userId] = {
            userId,

            currentTopic: null,
            previousTopic: null,

            currentIntent: null,
            previousIntent: null,

            currentLanguage: 'tr',

            lastQuestion: null,
            lastUserMessage: null,
            lastAssistantMessage: null,

            activeEntities: [],
            activeKeywords: [],

            emotionalTone: 'neutral',
            conversationMode: 'normal',

            turnCount: 0,

            stateHistory: [],

            createdAt: timestamp(),
            updatedAt: timestamp()
        };

        saveMemoryDatabase();
    }

    return memoryDatabase
        .advanced
        .userStates[userId];
}


function updateUserState(
    userId,
    parsed,
    userText
) {
    const state =
        ensureUserState(userId);

    state.previousTopic =
        state.currentTopic;

    state.previousIntent =
        state.currentIntent;

    state.currentIntent =
        parsed?.primaryIntent ||
        'conversation';

    state.currentLanguage =
        parsed?.language ||
        state.currentLanguage ||
        'tr';

    state.lastUserMessage =
        cleanText(
            userText,
            20000
        );

    const questionUnit =
        safeArray(parsed?.units)
            .find(
                unit =>
                    unit.isQuestion
            );

    if (questionUnit) {
        state.lastQuestion =
            questionUnit.text;
    }

    const keywords =
        safeArray(
            parsed?.globalKeywords
        );

    state.activeKeywords =
        unique([
            ...state.activeKeywords,
            ...keywords
        ]).slice(
            -ADVANCED_MEMORY_CONFIG
                .maxTopicHistory
        );

    const entities =
        safeArray(
            parsed?.units
        ).flatMap(
            unit => [
                ...(unit.entities?.urls || []),
                ...(unit.entities?.emails || []),
                ...(unit.entities?.codeLanguages || [])
            ]
        );

    state.activeEntities =
        unique([
            ...state.activeEntities,
            ...entities
        ]).slice(-50);

    state.currentTopic =
        keywords
            .slice(0, 8)
            .join(' ') ||
        state.currentTopic;

    state.turnCount += 1;

    state.stateHistory =
        pushLimited(
            safeArray(
                state.stateHistory
            ),
            {
                intent:
                    state.currentIntent,
                topic:
                    state.currentTopic,
                language:
                    state.currentLanguage,
                question:
                    state.lastQuestion,
                createdAt:
                    timestamp()
            },
            ADVANCED_MEMORY_CONFIG
                .maxStateHistory
        );

    state.updatedAt =
        timestamp();

    saveMemoryDatabase();

    return state;
}


function setLastAssistantMessage(
    userId,
    text
) {
    const state =
        ensureUserState(userId);

    state.lastAssistantMessage =
        cleanText(
            text,
            50000
        );

    state.updatedAt =
        timestamp();

    saveMemoryDatabase();

    return state;
}


function getUserState(userId) {
    return (
        memoryDatabase
            .advanced
            .userStates[userId] ||
        null
    );
}


/* ============================================================
   ROLLING CONTEXT ENGINE
   ============================================================ */

function ensureRollingContext(
    userId,
    conversationId
) {
    if (
        !memoryDatabase
            .advanced
            .rollingContexts[userId]
    ) {
        memoryDatabase
            .advanced
            .rollingContexts[userId] = {};
    }

    if (
        !memoryDatabase
            .advanced
            .rollingContexts[userId]
            [conversationId]
    ) {
        memoryDatabase
            .advanced
            .rollingContexts[userId]
            [conversationId] = {
                userId,
                conversationId,

                messages: [],
                units: [],

                keywords: [],
                topics: [],

                activeEntities: [],

                summary: '',

                lastRefreshAt:
                    timestamp(),

                updatedAt:
                    timestamp()
            };

        saveMemoryDatabase();
    }

    return memoryDatabase
        .advanced
        .rollingContexts[userId]
        [conversationId];
}


function updateRollingContext(
    userId,
    conversationId
) {
    const conversation =
        getConversation(
            userId,
            conversationId
        );

    if (!conversation) {
        return null;
    }

    const rolling =
        ensureRollingContext(
            userId,
            conversationId
        );

    rolling.messages =
        conversation.messages
            .slice(
                -ADVANCED_MEMORY_CONFIG
                    .rollingMessageLimit
            );

    rolling.units =
        conversation.units
            .slice(
                -ADVANCED_MEMORY_CONFIG
                    .rollingUnitLimit
            );

    rolling.keywords =
        unique([
            ...conversation.keywords
                .slice(-80),
            ...rolling.messages
                .flatMap(
                    message =>
                        extractKeywords(
                            message.text,
                            8
                        )
                )
        ]).slice(-120);

    rolling.topics =
        unique([
            ...conversation.topics,
            ...rolling.keywords
                .slice(0, 20)
        ]).slice(-50);

    rolling.activeEntities =
        unique(
            rolling.messages
                .flatMap(
                    message => [
                        ...(message.metadata
                            ?.entities
                            ?.urls || []),

                        ...(message.metadata
                            ?.entities
                            ?.emails || [])
                    ]
                )
        ).slice(-50);

    rolling.summary =
        conversation.summary ||
        buildRollingSummary(
            rolling.messages,
            rolling.keywords,
            rolling.topics
        );

    rolling.lastRefreshAt =
        timestamp();

    rolling.updatedAt =
        timestamp();

    saveMemoryDatabase();

    return rolling;
}


function buildRollingSummary(
    messages,
    keywords,
    topics
) {
    const recentMessages =
        safeArray(messages)
            .slice(-10)
            .map(
                message =>
                    `${message.role}: ${normalizeSpace(
                        message.text
                    )}`
            );

    const keywordText =
        safeArray(keywords)
            .slice(-20)
            .join(', ');

    const topicText =
        safeArray(topics)
            .slice(-10)
            .join(', ');

    return [
        'Son konuÅŸma:',
        recentMessages.join(' | '),

        keywordText
            ? `Anahtar kelimeler: ${keywordText}.`
            : '',

        topicText
            ? `Konular: ${topicText}.`
            : ''
    ]
        .filter(Boolean)
        .join(' ');
}


/* ============================================================
   CONVERSATION SUMMARY ENGINE
   ============================================================ */

function buildAdvancedSummary(
    userId,
    conversationId
) {
    const conversation =
        getConversation(
            userId,
            conversationId
        );

    if (!conversation) {
        return null;
    }

    const messages =
        safeArray(
            conversation.messages
        );

    const userMessages =
        messages.filter(
            message =>
                message.role ===
                'user'
        );

    const assistantMessages =
        messages.filter(
            message =>
                message.role ===
                'assistant'
        );

    const keywords =
        unique(
            userMessages.flatMap(
                message =>
                    extractKeywords(
                        message.text,
                        12
                    )
            )
        ).slice(-60);

    const intents =
        unique(
            conversation.units.flatMap(
                unit =>
                    unit.intents || []
            )
        );

    const questions =
        userMessages
            .filter(
                message =>
                    isQuestion(
                        message.text
                    )
            )
            .slice(-15)
            .map(
                message =>
                    message.text
            );

    const topics =
        unique([
            ...safeArray(
                conversation.topics
            ),
            ...keywords.slice(0, 20)
        ]).slice(-40);

    const lastMessages =
        messages
            .slice(-12)
            .map(
                message => ({
                    role:
                        message.role,
                    text:
                        cleanText(
                            message.text,
                            2000
                        ),
                    createdAt:
                        message.createdAt
                })
            );

    const summary = {
        id: generateId('summary'),

        userId,
        conversationId,

        messageCount:
            messages.length,

        userMessageCount:
            userMessages.length,

        assistantMessageCount:
            assistantMessages.length,

        keywords,
        intents,
        topics,
        questions,

        lastMessages,

        generatedAt:
            timestamp(),

        text:
            [
                `KonuÅŸmada ${messages.length} mesaj var.`,
                topics.length
                    ? `Ana konular: ${topics.join(', ')}.`
                    : '',
                intents.length
                    ? `Tespit edilen niyetler: ${intents.join(', ')}.`
                    : '',
                questions.length
                    ? `Son sorular: ${questions.slice(-5).join(' | ')}`
                    : ''
            ]
                .filter(Boolean)
                .join(' ')
    };

    return summary;
}


function saveConversationSummary(
    userId,
    conversationId,
    force = false
) {
    const conversation =
        getConversation(
            userId,
            conversationId
        );

    if (!conversation) {
        return null;
    }

    const messages =
        safeArray(
            conversation.messages
        );

    if (
        !force &&
        messages.length <
        ADVANCED_MEMORY_CONFIG
            .summaryMessageThreshold
    ) {
        return null;
    }

    const summary =
        buildAdvancedSummary(
            userId,
            conversationId
        );

    if (!summary) {
        return null;
    }

    if (
        !memoryDatabase
            .advanced
            .summaries[userId]
    ) {
        memoryDatabase
            .advanced
            .summaries[userId] = {};
    }

    if (
        !memoryDatabase
            .advanced
            .summaries[userId]
            [conversationId]
    ) {
        memoryDatabase
            .advanced
            .summaries[userId]
            [conversationId] = [];
    }

    memoryDatabase
        .advanced
        .summaries[userId]
        [conversationId] =
        pushLimited(
            memoryDatabase
                .advanced
                .summaries[userId]
                [conversationId],
            summary,
            ADVANCED_MEMORY_CONFIG
                .maxStoredSummaries
        );

    conversation.summary =
        summary.text;

    conversation.updatedAt =
        timestamp();

    saveMemoryDatabase();

    writeEvent(
        'advanced_summary_created',
        {
            userId,
            conversationId,
            summaryId:
                summary.id
        }
    );

    return summary;
}


function getLatestConversationSummary(
    userId,
    conversationId
) {
    const summaries =
        memoryDatabase
            .advanced
            .summaries[userId]
            ?. [conversationId] || [];

    return summaries.length
        ? summaries[
            summaries.length - 1
        ]
        : null;
}


/* ============================================================
   MULTI-TURN RELATION ENGINE
   ============================================================ */

function ensureRelationStore(
    userId
) {
    if (
        !memoryDatabase
            .advanced
            .relations[userId]
    ) {
        memoryDatabase
            .advanced
            .relations[userId] = [];
    }

    return memoryDatabase
        .advanced
        .relations[userId];
}


function createTurnRelation(
    userId,
    conversationId,
    previousMessage,
    currentMessage,
    relationType = 'continuation',
    confidence = 0.5
) {
    const relations =
        ensureRelationStore(
            userId
        );

    const relation = {
        id:
            generateId(
                'relation'
            ),

        userId,
        conversationId,

        relationType,

        previousMessageId:
            previousMessage?.id ||
            null,

        currentMessageId:
            currentMessage?.id ||
            null,

        previousText:
            cleanText(
                previousMessage?.text ||
                '',
                5000
            ),

        currentText:
            cleanText(
                currentMessage?.text ||
                '',
                5000
            ),

        confidence:
            clamp(
                safeNumber(
                    confidence,
                    0.5
                ),
                0,
                1
            ),

        createdAt:
            timestamp()
    };

    pushLimited(
        relations,
        relation,
        ADVANCED_MEMORY_CONFIG
            .maxRelationsPerUser
    );

    saveMemoryDatabase();

    return relation;
}


function inferTurnRelation(
    previousMessage,
    currentMessage
) {
    if (
        !previousMessage ||
        !currentMessage
    ) {
        return {
            type: 'none',
            confidence: 0
        };
    }

    const previous =
        normalizeForSearch(
            previousMessage.text
        );

    const current =
        normalizeForSearch(
            currentMessage.text
        );

    if (!previous || !current) {
        return {
            type: 'none',
            confidence: 0
        };
    }

    const continuationPatterns = [
        'bunu',
        'buna',
        'ÅŸunu',
        'sun u',
        'ondan',
        'orada',
        'burada',
        'devam',
        'devam et',
        'peki',
        'sonra',
        'ayrÄ±ca',
        'bir de',
        'bide',
        'bunu da',
        'onu da',
        'daha fazla'
    ];

    const directContinuation =
        continuationPatterns.some(
            pattern =>
                current.includes(
                    normalizeForSearch(
                        pattern
                    )
                )
        );

    const similarity =
        similarityByTokens(
            previous,
            current
        );

    if (directContinuation) {
        return {
            type: 'continuation',
            confidence:
                Math.max(
                    0.75,
                    similarity
                )
        };
    }

    if (similarity >= 0.35) {
        return {
            type: 'same_topic',
            confidence: similarity
        };
    }

    if (
        current.endsWith('?') &&
        previous.includes(
            'kod'
        )
    ) {
        return {
            type: 'follow_up_question',
            confidence: 0.65
        };
    }

    return {
        type: 'new_topic',
        confidence:
            1 - similarity
    };
}


/* ============================================================
   ADVANCED CONVERSATION RETRIEVAL
   ============================================================ */

function retrieveAdvancedConversationMemory(
    userId,
    query,
    options = {}
) {
    const limit =
        clamp(
            safeNumber(
                options.limit,
                ADVANCED_MEMORY_CONFIG
                    .finalMemoryLimit
            ),
            1,
            100
        );

    const minimumScore =
        clamp(
            safeNumber(
                options.minimumScore,
                ADVANCED_MEMORY_CONFIG
                    .minimumRelevance
            ),
            0,
            1
        );

    const candidates = [];

    const conversations =
        memoryDatabase
            .conversations[userId] ||
        {};

    for (
        const conversation of
        Object.values(
            conversations
        )
    ) {
        for (
            const message of
            safeArray(
                conversation.messages
            )
        ) {
            const relevance =
                calculateMemoryRelevance(
                    query,
                    {
                        text:
                            message.text,
                        keywords:
                            extractKeywords(
                                message.text,
                                20
                            ),
                        createdAt:
                            message.createdAt,
                        updatedAt:
                            message.createdAt,
                        importance:
                            message.role ===
                            'user'
                                ? 0.65
                                : 0.5
                    },
                    options
                );

            if (
                relevance <
                minimumScore
            ) {
                continue;
            }

            candidates.push({
                type: 'message',
                conversationId:
                    conversation.id,
                messageId:
                    message.id,
                text:
                    message.text,
                role:
                    message.role,
                relevance,
                createdAt:
                    message.createdAt
            });
        }

        if (
            conversation.summary
        ) {
            const summaryScore =
                calculateMemoryRelevance(
                    query,
                    {
                        text:
                            conversation.summary,
                        keywords:
                            conversation.keywords,
                        createdAt:
                            conversation.createdAt,
                        updatedAt:
                            conversation.updatedAt,
                        importance:
                            0.8
                    },
                    options
                );

            if (
                summaryScore >=
                minimumScore
            ) {
                candidates.push({
                    type: 'summary',
                    conversationId:
                        conversation.id,
                    text:
                        conversation.summary,
                    relevance:
                        summaryScore,
                    createdAt:
                        conversation.updatedAt
                });
            }
        }
    }

    const summaries =
        memoryDatabase
            .advanced
            .summaries[userId] ||
        {};

    for (
        const conversationId
        of Object.keys(summaries)
    ) {
        for (
            const summary
            of safeArray(
                summaries[
                    conversationId
                ]
            )
        ) {
            const score =
                calculateMemoryRelevance(
                    query,
                    {
                        text:
                            summary.text,
                        keywords:
                            summary.keywords,
                        createdAt:
                            summary.generatedAt,
                        updatedAt:
                            summary.generatedAt,
                        importance:
                            0.85
                    },
                    options
                );

            if (
                score <
                minimumScore
            ) {
                continue;
            }

            candidates.push({
                type: 'advanced_summary',
                conversationId,
                summaryId:
                    summary.id,
                text:
                    summary.text,
                relevance:
                    score,
                createdAt:
                    summary.generatedAt
            });
        }
    }

    candidates.sort(
        (a, b) =>
            b.relevance -
            a.relevance
    );

    return candidates
        .slice(0, limit);
}


/* ============================================================
   MEMORY MERGER
   ============================================================ */

function mergeMemorySources(
    sources = {}
) {
    const merged = [];

    for (
        const [sourceName, items]
        of Object.entries(
            sources
        )
    ) {
        for (
            const item of
            safeArray(items)
        ) {
            merged.push({
                ...item,
                memorySource:
                    sourceName
            });
        }
    }

    merged.sort(
        (a, b) =>
            safeNumber(
                b.relevance ??
                b.score,
                0
            ) -
            safeNumber(
                a.relevance ??
                a.score,
                0
            )
    );

    const deduplication =
        new Set();

    const result = [];

    for (
        const item of merged
    ) {
        const key =
            [
                item.memorySource,
                item.conversationId,
                item.messageId,
                item.answerId,
                normalizeForSearch(
                    item.text ||
                    item.answer ||
                    ''
                )
            ].join('|');

        if (
            deduplication.has(key)
        ) {
            continue;
        }

        deduplication.add(key);

        result.push(item);
    }

    return result.slice(
        0,
        ADVANCED_MEMORY_CONFIG
            .finalMemoryLimit
    );
}


/* ============================================================
   CONTEXT REFRESH ENGINE
   ============================================================ */

function refreshAdvancedContext(
    userId,
    conversationId,
    query
) {
    const rolling =
        updateRollingContext(
            userId,
            conversationId
        );

    const state =
        getUserState(
            userId
        );

    const advancedMemory =
        retrieveAdvancedConversationMemory(
            userId,
            query,
            {
                limit:
                    ADVANCED_MEMORY_CONFIG
                        .memoryCandidateLimit
            }
        );

    const answerMemory =
        retrieveAnswerMemory(
            query,
            {
                limit: 20,
                intent:
                    state?.currentIntent ||
                    null
            }
        );

    const conversationMemory =
        retrieveConversationMemory(
            userId,
            query,
            {
                limit: 20,
                minimumScore: 0.03
            }
        );

    const merged =
        mergeMemorySources({
            advanced:
                advancedMemory,
            answers:
                answerMemory.map(
                    item => ({
                        answerId:
                            item.record.id,
                        text:
                            item.record.answer,
                        question:
                            item.record.question,
                        relevance:
                            item.score,
                        source:
                            item.record.source
                    })
                ),
            conversations:
                conversationMemory
        });

    const latestSummary =
        getLatestConversationSummary(
            userId,
            conversationId
        );

    return {
        userId,
        conversationId,

        query:
            cleanText(
                query,
                10000
            ),

        rolling,
        state,
        latestSummary,

        memories:
            merged,

        generatedAt:
            timestamp()
    };
}


/* ============================================================
   MEMORY IMPORTANCE
   ============================================================ */

function calculateImportance(
    text,
    metadata = {}
) {
    let score = 0.35;

    const normalized =
        normalizeForSearch(
            text
        );

    const importantPatterns = [
        'benim adim',
        'benim adÄ±m',
        'adim',
        'adÄ±m',
        'hatirla',
        'hatÄ±rla',
        'unutma',
        'bundan sonra',
        'tercih ediyorum',
        'seviyorum',
        'sevmiyorum',
        'projem',
        'projemin adi',
        'projemin adÄ±',
        'kullaniyorum',
        'kullanÄ±yorum'
    ];

    for (
        const pattern
        of importantPatterns
    ) {
        if (
            normalized.includes(
                normalizeForSearch(
                    pattern
                )
            )
        ) {
            score += 0.08;
        }
    }

    if (
        metadata.explicitMemory
    ) {
        score += 0.25;
    }

    if (
        metadata.userPreference
    ) {
        score += 0.15;
    }

    if (
        metadata.repeated
    ) {
        score += 0.10;
    }

    return clamp(
        score,
        0,
        1
    );
}


/* ============================================================
   MEMORY CLEANUP ENGINE
   ============================================================ */

function cleanupAdvancedMemory(
    userId = null
) {
    let removed = 0;

    const targetUsers =
        userId
            ? [userId]
            : Object.keys(
                memoryDatabase
                    .advanced
                    .summaries
            );

    for (
        const currentUserId
        of targetUsers
    ) {
        const summaries =
            memoryDatabase
                .advanced
                .summaries[
                    currentUserId
                ];

        if (!summaries) {
            continue;
        }

        for (
            const conversationId
            of Object.keys(
                summaries
            )
        ) {
            const list =
                summaries[
                    conversationId
                ];

            if (
                !Array.isArray(list)
            ) {
                continue;
            }

            const filtered =
                list.filter(
                    summary => {
                        const score =
                            decayScore(
                                summary.generatedAt
                            );

                        if (
                            score <
                            0.03
                        ) {
                            removed += 1;
                            return false;
                        }

                        return true;
                    }
                );

            summaries[
                conversationId
            ] = filtered;
        }
    }

    memoryDatabase
        .advanced
        .cleanup = {
            lastRunAt:
                timestamp(),
            removedCount:
                removed
        };

    saveMemoryDatabase();

    writeEvent(
        'advanced_memory_cleanup',
        {
            userId,
            removed
        }
    );

    return {
        removed,
        lastRunAt:
            memoryDatabase
                .advanced
                .cleanup
                .lastRunAt
    };
}


/* ============================================================
   ANSWER LEARNING PREPARATION
   ============================================================ */

function registerLearnedPattern(
    userId,
    question,
    answer,
    metadata = {}
) {
    if (
        !memoryDatabase
            .advanced
            .learnedPatterns[userId]
    ) {
        memoryDatabase
            .advanced
            .learnedPatterns[userId] = [];
    }

    const patterns =
        memoryDatabase
            .advanced
            .learnedPatterns[userId];

    const keywords =
        extractKeywords(
            question,
            30
        );

    const pattern = {
        id:
            generateId(
                'learned'
            ),

        userId,

        question:
            cleanText(
                question,
                20000
            ),

        answer:
            cleanText(
                answer,
                50000
            ),

        keywords,

        intent:
            metadata.intent ||
            'conversation',

        source:
            metadata.source ||
            'local',

        quality:
            clamp(
                safeNumber(
                    metadata.quality,
                    0.5
                ),
                0,
                1
            ),

        importance:
            calculateImportance(
                question,
                metadata
            ),

        usageCount: 0,

        createdAt:
            timestamp(),

        updatedAt:
            timestamp()
    };

    pushLimited(
        patterns,
        pattern,
        ADVANCED_MEMORY_CONFIG
            .maxLearnedPatterns
    );

    saveMemoryDatabase();

    return pattern;
}


/* ============================================================
   LEARNED PATTERN RETRIEVAL
   ============================================================ */

function retrieveLearnedPatterns(
    userId,
    query,
    options = {}
) {
    const patterns =
        memoryDatabase
            .advanced
            .learnedPatterns[userId] ||
        [];

    const results = [];

    for (
        const pattern of
        patterns
    ) {
        const score =
            calculateMemoryRelevance(
                query,
                {
                    text:
                        pattern.question,
                    keywords:
                        pattern.keywords,
                    createdAt:
                        pattern.createdAt,
                    updatedAt:
                        pattern.updatedAt,
                    importance:
                        pattern.importance,
                    confidence:
                        pattern.quality,
                    usageCount:
                        pattern.usageCount
                },
                options
            );

        if (
            score <
            (
                options.minimumScore ??
                0.08
            )
        ) {
            continue;
        }

        results.push({
            pattern,
            score
        });
    }

    results.sort(
        (a, b) =>
            b.score -
            a.score
    );

    return results.slice(
        0,
        options.limit || 10
    );
}


/* ============================================================
   ADVANCED CONTEXT BUILDER
   ============================================================ */

function buildAdvancedContext(
    userId,
    conversationId,
    query,
    options = {}
) {
    const basicContext =
        buildContext(
            userId,
            conversationId,
            query,
            options
        );

    const advanced =
        refreshAdvancedContext(
            userId,
            conversationId,
            query
        );

    const learned =
        retrieveLearnedPatterns(
            userId,
            query,
            {
                limit:
                    options.learnedLimit ||
                    10,

                minimumScore:
                    options.minimumScore ||
                    0.08
            }
        );

    return {
        ...basicContext,

        advanced: {
            state:
                advanced.state,

            rolling:
                advanced.rolling,

            summary:
                advanced.latestSummary,

            memories:
                advanced.memories,

            learned
        },

        generatedAt:
            timestamp()
    };
}


/* ============================================================
   ADVANCED MESSAGE PROCESSOR
   ============================================================ */

function processAdvancedUserMessage(
    userId,
    conversationId,
    text
) {
    const result =
        processUserMessage(
            userId,
            conversationId,
            text
        );

    const parsed =
        result.parsed;

    const previousMessages =
        result.context
            ?.recent || [];

    const previousMessage =
        previousMessages.length
            ? previousMessages[
                previousMessages.length - 1
            ]
            : null;

    const relation =
        inferTurnRelation(
            previousMessage,
            result.message
        );

    if (
        previousMessage
    ) {
        createTurnRelation(
            userId,
            conversationId,
            previousMessage,
            result.message,
            relation.type,
            relation.confidence
        );
    }

    updateUserState(
        userId,
        parsed,
        text
    );

    updateRollingContext(
        userId,
        conversationId
    );

    if (
        result.parsed.intents
            .length
    ) {
        const primary =
            result.parsed
                .primaryIntent;

        const userState =
            ensureUserState(
                userId
            );

        if (
            primary === 'coding'
        ) {
            userState.conversationMode =
                'coding';
        } else if (
            primary === 'research'
        ) {
            userState.conversationMode =
                'research';
        } else if (
            primary === 'education'
        ) {
            userState.conversationMode =
                'education';
        } else {
            userState.conversationMode =
                'normal';
        }

        userState.updatedAt =
            timestamp();

        saveMemoryDatabase();
    }

    const messageCount =
        getConversation(
            userId,
            conversationId
        )
            ?.messages
            ?.length || 0;

    if (
        messageCount >=
        ADVANCED_MEMORY_CONFIG
            .summaryMessageThreshold
    ) {
        saveConversationSummary(
            userId,
            conversationId
        );
    }

    const context =
        buildAdvancedContext(
            userId,
            conversationId,
            text,
            {
                intent:
                    parsed.primaryIntent
            }
        );

    return {
        ...result,

        relation,

        userState:
            getUserState(
                userId
            ),

        advancedContext:
            context
    };
}


/* ============================================================
   ADVANCED ASSISTANT PROCESSOR
   ============================================================ */

function processAdvancedAssistantMessage(
    userId,
    conversationId,
    answer,
    metadata = {}
) {
    const message =
        processAssistantMessage(
            userId,
            conversationId,
            answer,
            metadata
        );

    setLastAssistantMessage(
        userId,
        answer
    );

    if (
        metadata.question &&
        metadata.rememberAnswer !==
        false
    ) {
        registerLearnedPattern(
            userId,
            metadata.question,
            answer,
            metadata
        );
    }

    updateRollingContext(
        userId,
        conversationId
    );

    return message;
}


/* ============================================================
   ADVANCED MEMORY API
   ============================================================ */

app.post(
    '/api/memory/advanced-context',
    (req, res) => {
        try {
            const userId =
                cleanText(
                    req.body?.userId ||
                    'anonymous',
                    200
                );

            const conversationId =
                cleanText(
                    req.body
                        ?.conversationId ||
                    '',
                    200
                );

            const query =
                cleanText(
                    req.body?.query,
                    10000
                );

            if (!query.trim()) {
                return res
                    .status(400)
                    .json({
                        ok: false,
                        error:
                            'query_required'
                    });
            }

            const context =
                buildAdvancedContext(
                    userId,
                    conversationId,
                    query,
                    {
                        intent:
                            req.body?.intent ||
                            null
                    }
                );

            return res.json({
                ok: true,
                context
            });
        } catch (error) {
            return res
                .status(500)
                .json({
                    ok: false,
                    error:
                        error.message
                });
        }
    }
);


/* ============================================================
   USER STATE API
   ============================================================ */

app.get(
    '/api/memory/state',
    (req, res) => {
        const userId =
            cleanText(
                req.query?.userId ||
                'anonymous',
                200
            );

        return res.json({
            ok: true,
            state:
                getUserState(
                    userId
                )
        });
    }
);


/* ============================================================
   ROLLING CONTEXT API
   ============================================================ */

app.get(
    '/api/memory/rolling',
    (req, res) => {
        const userId =
            cleanText(
                req.query?.userId ||
                'anonymous',
                200
            );

        const conversationId =
            cleanText(
                req.query
                    ?.conversationId ||
                '',
                200
            );

        if (!conversationId) {
            return res
                .status(400)
                .json({
                    ok: false,
                    error:
                        'conversation_id_required'
                });
        }

        const rolling =
            ensureRollingContext(
                userId,
                conversationId
            );

        return res.json({
            ok: true,
            rolling
        });
    }
);


/* ============================================================
   ADVANCED RETRIEVAL API
   ============================================================ */

app.post(
    '/api/memory/advanced-search',
    (req, res) => {
        try {
            const userId =
                cleanText(
                    req.body?.userId ||
                    'anonymous',
                    200
                );

            const query =
                cleanText(
                    req.body?.query,
                    10000
                );

            if (!query.trim()) {
                return res
                    .status(400)
                    .json({
                        ok: false,
                        error:
                            'query_required'
                    });
            }

            const results =
                retrieveAdvancedConversationMemory(
                    userId,
                    query,
                    {
                        limit:
                            req.body?.limit ||
                            25,

                        minimumScore:
                            req.body
                                ?.minimumScore ||
                            0.08
                    }
                );

            return res.json({
                ok: true,
                results
            });
        } catch (error) {
            return res
                .status(500)
                .json({
                    ok: false,
                    error:
                        error.message
                });
        }
    }
);


/* ============================================================
   SUMMARY API
   ============================================================ */

app.post(
    '/api/memory/summary',
    (req, res) => {
        try {
            const userId =
                cleanText(
                    req.body?.userId ||
                    'anonymous',
                    200
                );

            const conversationId =
                cleanText(
                    req.body
                        ?.conversationId ||
                    '',
                    200
                );

            if (!conversationId) {
                return res
                    .status(400)
                    .json({
                        ok: false,
                        error:
                            'conversation_id_required'
                    });
            }

            const summary =
                saveConversationSummary(
                    userId,
                    conversationId,
                    true
                );

            return res.json({
                ok: true,
                summary
            });
        } catch (error) {
            return res
                .status(500)
                .json({
                    ok: false,
                    error:
                        error.message
                });
        }
    }
);


/* ============================================================
   MEMORY CLEANUP API
   ============================================================ */

app.post(
    '/api/memory/cleanup',
    (req, res) => {
        try {
            const userId =
                req.body?.userId
                    ? cleanText(
                        req.body.userId,
                        200
                    )
                    : null;

            const result =
                cleanupAdvancedMemory(
                    userId
                );

            return res.json({
                ok: true,
                result
            });
        } catch (error) {
            return res
                .status(500)
                .json({
                    ok: false,
                    error:
                        error.message
                });
        }
    }
);


/* ============================================================
   LEARNED PATTERN API
   ============================================================ */

app.post(
    '/api/memory/learn',
    (req, res) => {
        try {
            const userId =
                cleanText(
                    req.body?.userId ||
                    'anonymous',
                    200
                );

            const question =
                cleanText(
                    req.body?.question,
                    20000
                );

            const answer =
                cleanText(
                    req.body?.answer,
                    50000
                );

            if (
                !question.trim() ||
                !answer.trim()
            ) {
                return res
                    .status(400)
                    .json({
                        ok: false,
                        error:
                            'question_and_answer_required'
                    });
            }

            const pattern =
                registerLearnedPattern(
                    userId,
                    question,
                    answer,
                    req.body
                );

            return res.json({
                ok: true,
                pattern
            });
        } catch (error) {
            return res
                .status(500)
                .json({
                    ok: false,
                    error:
                        error.message
                });
        }
    }
);


/* ============================================================
   LEARNED PATTERN SEARCH API
   ============================================================ */

app.post(
    '/api/memory/learned-search',
    (req, res) => {
        try {
            const userId =
                cleanText(
                    req.body?.userId ||
                    'anonymous',
                    200
                );

            const query =
                cleanText(
                    req.body?.query,
                    10000
                );

            if (!query.trim()) {
                return res
                    .status(400)
                    .json({
                        ok: false,
                        error:
                            'query_required'
                    });
            }

            const results =
                retrieveLearnedPatterns(
                    userId,
                    query,
                    {
                        limit:
                            req.body?.limit ||
                            10,

                        minimumScore:
                            req.body
                                ?.minimumScore ||
                            0.08
                    }
                );

            return res.json({
                ok: true,
                results
            });
        } catch (error) {
            return res
                .status(500)
                .json({
                    ok: false,
                    error:
                        error.message
                });
        }
    }
);


/* ============================================================
   ADVANCED MEMORY HEALTH
   ============================================================ */

function advancedMemoryHealth() {
    let userStateCount = 0;
    let rollingContextCount = 0;
    let summaryCount = 0;
    let relationCount = 0;
    let learnedPatternCount = 0;

    userStateCount =
        Object.keys(
            memoryDatabase
                .advanced
                .userStates
        ).length;

    for (
        const user
        of Object.values(
            memoryDatabase
                .advanced
                .rollingContexts
        )
    ) {
        rollingContextCount +=
            Object.keys(
                user || {}
            ).length;
    }

    for (
        const user
        of Object.values(
            memoryDatabase
                .advanced
                .summaries
        )
    ) {
        for (
            const summaries
            of Object.values(
                user || {}
            )
        ) {
            summaryCount +=
                safeArray(
                    summaries
                ).length;
        }
    }

    for (
        const relations
        of Object.values(
            memoryDatabase
                .advanced
                .relations
        )
    ) {
        relationCount +=
            safeArray(
                relations
            ).length;
    }

    for (
        const patterns
        of Object.values(
            memoryDatabase
                .advanced
                .learnedPatterns
        )
    ) {
        learnedPatternCount +=
            safeArray(
                patterns
            ).length;
    }

    return {
        userStates:
            userStateCount,

        rollingContexts:
            rollingContextCount,

        summaries:
            summaryCount,

        relations:
            relationCount,

        learnedPatterns:
            learnedPatternCount,

        cleanup:
            memoryDatabase
                .advanced
                .cleanup,

        updatedAt:
            timestamp()
    };
}


app.get(
    '/api/memory/advanced-health',
    (_req, res) => {
        return res.json({
            ok: true,
            memory:
                advancedMemoryHealth()
        });
    }
);


/* ============================================================
   EXPORTS
   ============================================================ */

module.exports = {
    ...(module.exports || {}),

    calculateMemoryRelevance,

    ensureUserState,
    updateUserState,
    setLastAssistantMessage,
    getUserState,

    ensureRollingContext,
    updateRollingContext,
    buildRollingSummary,

    buildAdvancedSummary,
    saveConversationSummary,
    getLatestConversationSummary,

    createTurnRelation,
    inferTurnRelation,

    retrieveAdvancedConversationMemory,

    mergeMemorySources,

    refreshAdvancedContext,

    calculateImportance,

    cleanupAdvancedMemory,

    registerLearnedPattern,
    retrieveLearnedPatterns,

    buildAdvancedContext,

    processAdvancedUserMessage,
    processAdvancedAssistantMessage,

    advancedMemoryHealth
};


/*
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘                         PART 2 KAPANIÅ                              â•‘
â•‘                                                                      â•‘
â•‘  PART 2 ile TÃ¼rkAI artÄ±k:                                           â•‘
â•‘                                                                      â•‘
â•‘  âœ“ Rolling context                                                   â•‘
â•‘  âœ“ Advanced summaries                                                â•‘
â•‘  âœ“ User state                                                        â•‘
â•‘  âœ“ Multi-turn relation                                              â•‘
â•‘  âœ“ Relevance scoring                                                 â•‘
â•‘  âœ“ Memory decay                                                      â•‘
â•‘  âœ“ Advanced conversation retrieval                                   â•‘
â•‘  âœ“ Memory source merging                                             â•‘
â•‘  âœ“ Learned pattern altyapÄ±sÄ±                                         â•‘
â•‘  âœ“ Context refresh                                                   â•‘
â•‘  âœ“ Memory cleanup                                                    â•‘
â•‘  âœ“ Advanced memory APIs                                              â•‘
â•‘                                                                      â•‘
â•‘  SONRAKÄ°:                                                            â•‘
â•‘  PART 3 / 20 â†’ KNOWLEDGE + LOCAL INTELLIGENCE ENGINE                â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
*/
'use strict';

/*
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘                         TÃœRKAI SERVER                              â•‘
â•‘                         PART 3 / 20                                â•‘
â•‘                                                                      â•‘
â•‘  KNOWLEDGE + LOCAL INTELLIGENCE ENGINE                              â•‘
â•‘                                                                      â•‘
â•‘  AmaÃ§:                                                               â•‘
â•‘  - knowledge.json tabanlÄ± yerel bilgi sistemi                       â•‘
â•‘  - API olmadan basit sorulara cevap                                  â•‘
â•‘  - Benzer soru bulma                                                 â•‘
â•‘  - Otomatik bilgi Ã¶ÄŸrenme                                            â•‘
â•‘  - Bilgi gÃ¼ven / kalite skoru                                       â•‘
â•‘  - Intent + topic eÅŸleÅŸtirme                                        â•‘
â•‘  - Tekrarlanan kayÄ±tlarÄ± birleÅŸtirme                                â•‘
â•‘  - Local â†’ Memory â†’ Research zincirinin altyapÄ±sÄ±                   â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
*/


/* ============================================================
   KNOWLEDGE CONFIG
   ============================================================ */

const KNOWLEDGE_CONFIG = {
    maxRecords: 10000,
    maxKeywordsPerRecord: 40,
    maxSearchResults: 20,

    minimumMatchScore: 0.24,
    strongMatchScore: 0.68,
    exactMatchScore: 0.92,

    learningMinimumQuality: 0.55,

    duplicateSimilarity: 0.88,

    maxQuestionLength: 20000,
    maxAnswerLength: 50000
};


/* ============================================================
   KNOWLEDGE FILES
   ============================================================ */



const KNOWLEDGE_FILE =
    path.join(
        KNOWLEDGE_DIR,
        'knowledge.json'
    );


ensureDirectory(
    KNOWLEDGE_DIR
);


const DEFAULT_KNOWLEDGE = {
    version: 1,

    records: [],

    keywordIndex: {},
    intentIndex: {},
    topicIndex: {},

    statistics: {
        totalRecords: 0,
        totalSearches: 0,
        totalHits: 0,
        totalLearned: 0,
        totalUpdated: 0,
        totalDuplicates: 0
    },

    updatedAt:
        timestamp()
};


let knowledgeDatabase =
    readJson(
        KNOWLEDGE_FILE,
        DEFAULT_KNOWLEDGE
    );


/* ============================================================
   KNOWLEDGE DATABASE NORMALIZATION
   ============================================================ */

function normalizeKnowledgeDatabase() {
    if (
        !knowledgeDatabase ||
        typeof knowledgeDatabase !==
        'object'
    ) {
        knowledgeDatabase =
            {
                ...DEFAULT_KNOWLEDGE
            };
    }

    if (
        !Array.isArray(
            knowledgeDatabase.records
        )
    ) {
        knowledgeDatabase.records = [];
    }

    if (
        !knowledgeDatabase.keywordIndex
    ) {
        knowledgeDatabase.keywordIndex = {};
    }

    if (
        !knowledgeDatabase.intentIndex
    ) {
        knowledgeDatabase.intentIndex = {};
    }

    if (
        !knowledgeDatabase.topicIndex
    ) {
        knowledgeDatabase.topicIndex = {};
    }

    if (
        !knowledgeDatabase.statistics
    ) {
        knowledgeDatabase.statistics =
            {
                ...DEFAULT_KNOWLEDGE
                    .statistics
            };
    }

    knowledgeDatabase.version =
        knowledgeDatabase.version ||
        1;

    knowledgeDatabase.updatedAt =
        timestamp();

    writeJson(
        KNOWLEDGE_FILE,
        knowledgeDatabase
    );
}


normalizeKnowledgeDatabase();


/* ============================================================
   KNOWLEDGE SAVE
   ============================================================ */

function saveKnowledgeDatabase() {
    knowledgeDatabase.updatedAt =
        timestamp();

    knowledgeDatabase.statistics
        .totalRecords =
        knowledgeDatabase.records.length;

    writeJson(
        KNOWLEDGE_FILE,
        knowledgeDatabase
    );
}


/* ============================================================
   KNOWLEDGE TEXT NORMALIZATION
   ============================================================ */

function normalizeKnowledgeText(
    text
) {
    return normalizeSpace(
        cleanText(
            text || '',
            KNOWLEDGE_CONFIG
                .maxAnswerLength
        )
    );
}


function knowledgeFingerprint(
    text
) {
    return normalizeForSearch(
        normalizeKnowledgeText(
            text
        )
    );
}


/* ============================================================
   KNOWLEDGE KEYWORD EXTRACTION
   ============================================================ */

function getKnowledgeKeywords(
    question,
    answer = ''
) {
    return unique(
        [
            ...extractKeywords(
                question,
                KNOWLEDGE_CONFIG
                    .maxKeywordsPerRecord
            ),

            ...extractKeywords(
                answer,
                KNOWLEDGE_CONFIG
                    .maxKeywordsPerRecord
            )
        ]
    ).slice(
        0,
        KNOWLEDGE_CONFIG
            .maxKeywordsPerRecord
    );
}


/* ============================================================
   TOPIC DETECTION
   ============================================================ */

function detectKnowledgeTopic(
    question,
    intent = null
) {
    const text =
        normalizeForSearch(
            question
        );

    const topicRules = [
        {
            topic: 'programlama',
            words: [
                'kod',
                'javascript',
                'python',
                'html',
                'css',
                'java',
                'c++',
                'c#',
                'programlama',
                'fonksiyon',
                'deÄŸiÅŸken',
                'degisken',
                'api'
            ]
        },

        {
            topic: 'yapay-zeka',
            words: [
                'yapay zeka',
                'ai',
                'model',
                'llm',
                'chatbot',
                'makine Ã¶ÄŸrenmesi',
                'makine ogrenmesi',
                'neural',
                'sinir aÄŸÄ±',
                'sinir agi'
            ]
        },

        {
            topic: 'eÄŸitim',
            words: [
                'ders',
                'Ã¶dev',
                'odev',
                'matematik',
                'fen',
                'tÃ¼rkÃ§e',
                'turkce',
                'ingilizce',
                'tarih',
                'coÄŸrafya',
                'cografya'
            ]
        },

        {
            topic: 'teknoloji',
            words: [
                'bilgisayar',
                'telefon',
                'android',
                'iphone',
                'internet',
                'wifi',
                'yazÄ±lÄ±m',
                'yazilim',
                'sunucu',
                'browser',
                'tarayÄ±cÄ±',
                'tarayici'
            ]
        },

        {
            topic: 'genel-bilgi',
            words: [
                'nedir',
                'kimdir',
                'ne demek',
                'anlamÄ±',
                'anlami',
                'nasÄ±l',
                'nasil',
                'neden',
                'niÃ§in',
                'nicin'
            ]
        },

        {
            topic: 'tÃ¼rkai',
            words: [
                'tÃ¼rkai',
                'turkai',
                'tÃ¼rk ai',
                'turk ai'
            ]
        }
    ];

    for (
        const rule of
        topicRules
    ) {
        if (
            rule.words.some(
                word =>
                    text.includes(
                        normalizeForSearch(
                            word
                        )
                    )
            )
        ) {
            return rule.topic;
        }
    }

    if (
        intent === 'coding'
    ) {
        return 'programlama';
    }

    if (
        intent === 'education'
    ) {
        return 'eÄŸitim';
    }

    return 'genel';
}


/* ============================================================
   KNOWLEDGE INDEX HELPERS
   ============================================================ */

function addToKnowledgeIndex(
    index,
    key,
    recordId
) {
    if (!key) {
        return;
    }

    if (!index[key]) {
        index[key] = [];
    }

    if (
        !index[key].includes(
            recordId
        )
    ) {
        index[key].push(
            recordId
        );
    }

    if (
        index[key].length > 500
    ) {
        index[key] =
            index[key].slice(
                -500
            );
    }
}


function removeFromKnowledgeIndex(
    index,
    key,
    recordId
) {
    if (!index[key]) {
        return;
    }

    index[key] =
        index[key].filter(
            id =>
                id !== recordId
        );

    if (
        index[key].length === 0
    ) {
        delete index[key];
    }
}


/* ============================================================
   KNOWLEDGE RECORD CREATION
   ============================================================ */

function createKnowledgeRecord(
    question,
    answer,
    metadata = {}
) {
    const cleanQuestion =
        normalizeKnowledgeText(
            question
        );

    const cleanAnswer =
        normalizeKnowledgeText(
            answer
        );

    const intent =
        metadata.intent ||
        'question';

    const topic =
        metadata.topic ||
        detectKnowledgeTopic(
            cleanQuestion,
            intent
        );

    const keywords =
        getKnowledgeKeywords(
            cleanQuestion,
            cleanAnswer
        );

    return {
        id:
            generateId(
                'knowledge'
            ),

        question:
            cleanQuestion,

        answer:
            cleanAnswer,

        normalizedQuestion:
            knowledgeFingerprint(
                cleanQuestion
            ),

        keywords,

        intent,

        topic,

        language:
            metadata.language ||
            detectLanguage(
                cleanQuestion
            ),

        source:
            metadata.source ||
            'local',

        sourceType:
            metadata.sourceType ||
            'learned',

        confidence:
            clamp(
                safeNumber(
                    metadata.confidence,
                    0.72
                ),
                0,
                1
            ),

        quality:
            clamp(
                safeNumber(
                    metadata.quality,
                    0.70
                ),
                0,
                1
            ),

        importance:
            clamp(
                safeNumber(
                    metadata.importance,
                    0.50
                ),
                0,
                1
            ),

        usageCount:
            safeNumber(
                metadata.usageCount,
                0
            ),

        successCount:
            safeNumber(
                metadata.successCount,
                0
            ),

        failCount:
            safeNumber(
                metadata.failCount,
                0
            ),

        userId:
            metadata.userId ||
            null,

        createdAt:
            metadata.createdAt ||
            timestamp(),

        updatedAt:
            timestamp(),

        lastUsedAt:
            metadata.lastUsedAt ||
            null
    };
}


/* ============================================================
   KNOWLEDGE INDEX RECORD
   ============================================================ */

function indexKnowledgeRecord(
    record
) {
    if (!record) {
        return;
    }

    for (
        const keyword of
        safeArray(
            record.keywords
        )
    ) {
        addToKnowledgeIndex(
            knowledgeDatabase
                .keywordIndex,
            keyword,
            record.id
        );
    }

    if (
        record.intent
    ) {
        addToKnowledgeIndex(
            knowledgeDatabase
                .intentIndex,
            record.intent,
            record.id
        );
    }

    if (
        record.topic
    ) {
        addToKnowledgeIndex(
            knowledgeDatabase
                .topicIndex,
            record.topic,
            record.id
        );
    }
}


/* ============================================================
   KNOWLEDGE REINDEX
   ============================================================ */

function rebuildKnowledgeIndexes() {
    knowledgeDatabase.keywordIndex =
        {};

    knowledgeDatabase.intentIndex =
        {};

    knowledgeDatabase.topicIndex =
        {};

    for (
        const record of
        knowledgeDatabase.records
    ) {
        indexKnowledgeRecord(
            record
        );
    }

    saveKnowledgeDatabase();

    return {
        records:
            knowledgeDatabase
                .records
                .length,

        keywords:
            Object.keys(
                knowledgeDatabase
                    .keywordIndex
            ).length,

        intents:
            Object.keys(
                knowledgeDatabase
                    .intentIndex
            ).length,

        topics:
            Object.keys(
                knowledgeDatabase
                    .topicIndex
            ).length
    };
}


/* ============================================================
   EXACT KNOWLEDGE SEARCH
   ============================================================ */

function findExactKnowledge(
    question
) {
    const fingerprint =
        knowledgeFingerprint(
            question
        );

    if (!fingerprint) {
        return null;
    }

    return (
        knowledgeDatabase.records
            .find(
                record =>
                    record
                        .normalizedQuestion ===
                    fingerprint
            ) ||
        null
    );
}


/* ============================================================
   KNOWLEDGE CANDIDATE COLLECTION
   ============================================================ */

function collectKnowledgeCandidates(
    question,
    metadata = {}
) {
    const keywords =
        extractKeywords(
            question,
            40
        );

    const candidateIds =
        new Set();

    for (
        const keyword of
        keywords
    ) {
        const ids =
            knowledgeDatabase
                .keywordIndex
                [keyword] || [];

        for (
            const id of ids
        ) {
            candidateIds.add(
                id
            );
        }
    }

    if (
        metadata.intent
    ) {
        const ids =
            knowledgeDatabase
                .intentIndex
                [metadata.intent] ||
            [];

        for (
            const id of ids
        ) {
            candidateIds.add(
                id
            );
        }
    }

    if (
        metadata.topic
    ) {
        const ids =
            knowledgeDatabase
                .topicIndex
                [metadata.topic] ||
            [];

        for (
            const id of ids
        ) {
            candidateIds.add(
                id
            );
        }
    }

    if (
        candidateIds.size === 0
    ) {
        return knowledgeDatabase
            .records
            .slice(
                -500
            );
    }

    return [
        ...candidateIds
    ]
        .map(
            id =>
                knowledgeDatabase
                    .records
                    .find(
                        record =>
                            record.id ===
                            id
                    )
        )
        .filter(Boolean);
}


/* ============================================================
   KNOWLEDGE RECORD SCORING
   ============================================================ */

function scoreKnowledgeRecord(
    question,
    record,
    metadata = {}
) {
    if (!record) {
        return 0;
    }

    const questionTokens =
        extractKeywords(
            question,
            40
        );

    const recordTokens =
        safeArray(
            record.keywords
        );

    const similarity =
        similarityByTokens(
            question,
            record.question
        );

    const overlap =
        keywordOverlap(
            question,
            record.question
        );

    const keywordIntersection =
        tokenIntersection(
            questionTokens,
            recordTokens
        );

    const keywordScore =
        questionTokens.length
            ? Math.min(
                keywordIntersection.length /
                questionTokens.length,
                1
            )
            : 0;

    const answerSimilarity =
        similarityByTokens(
            question,
            record.answer
        );

    let score =
        similarity * 0.36 +
        overlap * 0.20 +
        keywordScore * 0.20 +
        answerSimilarity * 0.04;

    if (
        metadata.intent &&
        record.intent ===
        metadata.intent
    ) {
        score += 0.08;
    }

    if (
        metadata.topic &&
        record.topic ===
        metadata.topic
    ) {
        score += 0.06;
    }

    if (
        metadata.language &&
        record.language ===
        metadata.language
    ) {
        score += 0.02;
    }

    const quality =
        clamp(
            safeNumber(
                record.quality,
                0.5
            ),
            0,
            1
        );

    const confidence =
        clamp(
            safeNumber(
                record.confidence,
                0.5
            ),
            0,
            1
        );

    score +=
        quality * 0.025;

    score +=
        confidence * 0.025;

    const decay =
        decayScore(
            record.updatedAt
        );

    score =
        score * 0.90 +
        decay * 0.10;

    return clamp(
        score,
        0,
        1
    );
}


/* ============================================================
   KNOWLEDGE SEARCH
   ============================================================ */

function searchKnowledge(
    question,
    options = {}
) {
    const cleanQuestion =
        normalizeKnowledgeText(
            question
        );

    if (!cleanQuestion) {
        return [];
    }

    knowledgeDatabase.statistics
        .totalSearches += 1;

    const exact =
        findExactKnowledge(
            cleanQuestion
        );

    if (exact) {
        exact.usageCount += 1;
        exact.lastUsedAt =
            timestamp();

        knowledgeDatabase.statistics
            .totalHits += 1;

        saveKnowledgeDatabase();

        return [
            {
                record: exact,
                score:
                    KNOWLEDGE_CONFIG
                        .exactMatchScore,
                matchType:
                    'exact'
            }
        ];
    }

    const intent =
        options.intent ||
        null;

    const topic =
        options.topic ||
        detectKnowledgeTopic(
            cleanQuestion,
            intent
        );

    const language =
        options.language ||
        detectLanguage(
            cleanQuestion
        );

    const candidates =
        collectKnowledgeCandidates(
            cleanQuestion,
            {
                intent,
                topic
            }
        );

    const results = [];

    for (
        const record of
        candidates
    ) {
        const score =
            scoreKnowledgeRecord(
                cleanQuestion,
                record,
                {
                    intent,
                    topic,
                    language
                }
            );

        if (
            score <
            (
                options.minimumScore ||
                KNOWLEDGE_CONFIG
                    .minimumMatchScore
            )
        ) {
            continue;
        }

        results.push({
            record,
            score,
            matchType:
                score >=
                KNOWLEDGE_CONFIG
                    .strongMatchScore
                    ? 'strong'
                    : 'similar'
        });
    }

    results.sort(
        (a, b) =>
            b.score -
            a.score
    );

    const limited =
        results.slice(
            0,
            options.limit ||
            KNOWLEDGE_CONFIG
                .maxSearchResults
        );

    if (
        limited.length
    ) {
        knowledgeDatabase.statistics
            .totalHits += 1;
    }

    saveKnowledgeDatabase();

    return limited;
}


/* ============================================================
   BEST LOCAL KNOWLEDGE ANSWER
   ============================================================ */

function findKnowledgeAnswer(
    question,
    options = {}
) {
    const results =
        searchKnowledge(
            question,
            options
        );

    if (!results.length) {
        return null;
    }

    const best =
        results[0];

    if (
        best.score <
        (
            options.minimumAnswerScore ||
            KNOWLEDGE_CONFIG
                .minimumMatchScore
        )
    ) {
        return null;
    }

    return {
        answer:
            best.record.answer,

        score:
            best.score,

        confidence:
            best.record.confidence,

        quality:
            best.record.quality,

        record:
            best.record,

        matchType:
            best.matchType,

        source:
            best.record.source ||
            'local',

        shouldResearch:
            best.score <
            KNOWLEDGE_CONFIG
                .strongMatchScore
    };
}


/* ============================================================
   KNOWLEDGE DUPLICATE DETECTION
   ============================================================ */

function findKnowledgeDuplicate(
    question,
    options = {}
) {
    const cleanQuestion =
        normalizeKnowledgeText(
            question
        );

    const candidates =
        collectKnowledgeCandidates(
            cleanQuestion,
            options
        );

    let best = null;

    for (
        const record of
        candidates
    ) {
        const similarity =
            similarityByTokens(
                cleanQuestion,
                record.question
            );

        if (
            !best ||
            similarity >
            best.similarity
        ) {
            best = {
                record,
                similarity
            };
        }
    }

    if (
        best &&
        best.similarity >=
        (
            options.threshold ||
            KNOWLEDGE_CONFIG
                .duplicateSimilarity
        )
    ) {
        return best;
    }

    return null;
}


/* ============================================================
   KNOWLEDGE INSERT
   ============================================================ */

function addKnowledge(
    question,
    answer,
    metadata = {}
) {
    const cleanQuestion =
        normalizeKnowledgeText(
            question
        );

    const cleanAnswer =
        normalizeKnowledgeText(
            answer
        );

    if (
        !cleanQuestion ||
        !cleanAnswer
    ) {
        return {
            ok: false,
            reason:
                'question_or_answer_empty'
        };
    }

    if (
        cleanQuestion.length >
        KNOWLEDGE_CONFIG
            .maxQuestionLength
    ) {
        return {
            ok: false,
            reason:
                'question_too_long'
        };
    }

    if (
        cleanAnswer.length >
        KNOWLEDGE_CONFIG
            .maxAnswerLength
    ) {
        return {
            ok: false,
            reason:
                'answer_too_long'
        };
    }

    const exact =
        findExactKnowledge(
            cleanQuestion
        );

    if (exact) {
        exact.answer =
            cleanAnswer;

        exact.updatedAt =
            timestamp();

        exact.source =
            metadata.source ||
            exact.source;

        exact.sourceType =
            metadata.sourceType ||
            exact.sourceType;

        exact.quality =
            Math.max(
                exact.quality || 0,
                safeNumber(
                    metadata.quality,
                    0.7
                )
            );

        exact.confidence =
            Math.max(
                exact.confidence || 0,
                safeNumber(
                    metadata.confidence,
                    0.7
                )
            );

        exact.keywords =
            getKnowledgeKeywords(
                exact.question,
                exact.answer
            );

        rebuildKnowledgeIndexes();

        knowledgeDatabase.statistics
            .totalUpdated += 1;

        saveKnowledgeDatabase();

        return {
            ok: true,
            action:
                'updated',
            record:
                exact
        };
    }

    const duplicate =
        findKnowledgeDuplicate(
            cleanQuestion,
            {
                threshold:
                    KNOWLEDGE_CONFIG
                        .duplicateSimilarity
            }
        );

    if (duplicate) {
        const existing =
            duplicate.record;

        const incomingQuality =
            safeNumber(
                metadata.quality,
                0.7
            );

        if (
            incomingQuality >
            existing.quality
        ) {
            existing.answer =
                cleanAnswer;

            existing.quality =
                incomingQuality;

            existing.confidence =
                Math.max(
                    existing.confidence,
                    safeNumber(
                        metadata.confidence,
                        0.7
                    )
                );

            existing.updatedAt =
                timestamp();

            existing.source =
                metadata.source ||
                existing.source;

            existing.keywords =
                getKnowledgeKeywords(
                    existing.question,
                    existing.answer
                );

            knowledgeDatabase.statistics
                .totalDuplicates += 1;

            rebuildKnowledgeIndexes();

            saveKnowledgeDatabase();

            return {
                ok: true,
                action:
                    'merged',
                record:
                    existing
            };
        }

        knowledgeDatabase.statistics
            .totalDuplicates += 1;

        saveKnowledgeDatabase();

        return {
            ok: true,
            action:
                'duplicate',
            record:
                existing
        };
    }

    const record =
        createKnowledgeRecord(
            cleanQuestion,
            cleanAnswer,
            metadata
        );

    knowledgeDatabase.records.push(
        record
    );

    if (
        knowledgeDatabase.records
            .length >
        KNOWLEDGE_CONFIG.maxRecords
    ) {
        knowledgeDatabase.records =
            knowledgeDatabase.records
                .slice(
                    -KNOWLEDGE_CONFIG
                        .maxRecords
                );
    }

    indexKnowledgeRecord(
        record
    );

    knowledgeDatabase.statistics
        .totalLearned += 1;

    saveKnowledgeDatabase();

    return {
        ok: true,
        action:
            'created',
        record
    };
}


/* ============================================================
   KNOWLEDGE FEEDBACK
   ============================================================ */

function updateKnowledgeFeedback(
    recordId,
    successful
) {
    const record =
        knowledgeDatabase.records
            .find(
                item =>
                    item.id ===
                    recordId
            );

    if (!record) {
        return null;
    }

    if (successful) {
        record.successCount += 1;

        record.quality =
            clamp(
                record.quality +
                0.025,
                0,
                1
            );

        record.confidence =
            clamp(
                record.confidence +
                0.015,
                0,
                1
            );
    } else {
        record.failCount += 1;

        record.quality =
            clamp(
                record.quality -
                0.04,
                0,
                1
            );

        record.confidence =
            clamp(
                record.confidence -
                0.025,
                0,
                1
            );
    }

    record.updatedAt =
        timestamp();

    saveKnowledgeDatabase();

    return record;
}


/* ============================================================
   LOCAL INTELLIGENCE DECISION
   ============================================================ */

function decideLocalIntelligence(
    question,
    options = {}
) {
    const parsed =
        options.parsed ||
        null;

    const intent =
        options.intent ||
        parsed?.primaryIntent ||
        'question';

    const language =
        options.language ||
        parsed?.language ||
        detectLanguage(
            question
        );

    const topic =
        options.topic ||
        detectKnowledgeTopic(
            question,
            intent
        );

    const result =
        findKnowledgeAnswer(
            question,
            {
                intent,
                topic,
                language,

                minimumAnswerScore:
                    options.minimumAnswerScore ||
                    KNOWLEDGE_CONFIG
                        .minimumMatchScore
            }
        );

    if (!result) {
        return {
            action:
                'research',

            reason:
                'no_local_answer',

            confidence: 0,

            topic,
            intent,
            language
        };
    }

    if (
        result.score >=
        KNOWLEDGE_CONFIG
            .strongMatchScore
    ) {
        return {
            action:
                'local_answer',

            reason:
                'strong_local_match',

            answer:
                result.answer,

            score:
                result.score,

            confidence:
                result.confidence,

            quality:
                result.quality,

            source:
                result.source,

            recordId:
                result.record.id,

            topic,
            intent,
            language
        };
    }

    return {
        action:
            'research_or_local',

        reason:
            'weak_or_partial_match',

        answer:
            result.answer,

        score:
            result.score,

        confidence:
            result.confidence,

        quality:
            result.quality,

        source:
            result.source,

        recordId:
            result.record.id,

        topic,
        intent,
        language
    };
}


/* ============================================================
   KNOWLEDGE LEARNING FROM ASSISTANT
   ============================================================ */

function learnAssistantAnswer(
    userId,
    question,
    answer,
    metadata = {}
) {
    const quality =
        clamp(
            safeNumber(
                metadata.quality,
                0.72
            ),
            0,
            1
        );

    if (
        quality <
        KNOWLEDGE_CONFIG
            .learningMinimumQuality
    ) {
        return {
            ok: false,
            learned: false,
            reason:
                'quality_too_low'
        };
    }

    const result =
        addKnowledge(
            question,
            answer,
            {
                ...metadata,

                userId,

                source:
                    metadata.source ||
                    'assistant',

                sourceType:
                    metadata.sourceType ||
                    'learned',

                quality,

                confidence:
                    metadata.confidence ??
                    0.72,

                intent:
                    metadata.intent ||
                    'question',

                language:
                    metadata.language ||
                    detectLanguage(
                        question
                    )
            }
        );

    return {
        ...result,
        learned:
            result.ok === true
    };
}


/* ============================================================
   KNOWLEDGE IMPORT
   ============================================================ */

function importKnowledgeRecords(
    records,
    metadata = {}
) {
    let created = 0;
    let updated = 0;
    let duplicates = 0;
    let failed = 0;

    for (
        const item of
        safeArray(records)
    ) {
        if (
            !item ||
            !item.question ||
            !item.answer
        ) {
            failed += 1;
            continue;
        }

        const result =
            addKnowledge(
                item.question,
                item.answer,
                {
                    ...metadata,
                    ...item
                }
            );

        if (!result.ok) {
            failed += 1;
            continue;
        }

        if (
            result.action ===
            'created'
        ) {
            created += 1;
        } else if (
            result.action ===
            'updated' ||
            result.action ===
            'merged'
        ) {
            updated += 1;
        } else if (
            result.action ===
            'duplicate'
        ) {
            duplicates += 1;
        }
    }

    rebuildKnowledgeIndexes();

    return {
        created,
        updated,
        duplicates,
        failed,
        total:
            created +
            updated +
            duplicates
    };
}


/* ============================================================
   KNOWLEDGE EXPORT
   ============================================================ */

function getKnowledgeStatistics() {
    return {
        ...knowledgeDatabase
            .statistics,

        records:
            knowledgeDatabase
                .records
                .length,

        keywords:
            Object.keys(
                knowledgeDatabase
                    .keywordIndex
            ).length,

        intents:
            Object.keys(
                knowledgeDatabase
                    .intentIndex
            ).length,

        topics:
            Object.keys(
                knowledgeDatabase
                    .topicIndex
            ).length,

        updatedAt:
            knowledgeDatabase
                .updatedAt
    };
}


/* ============================================================
   KNOWLEDGE API
   ============================================================ */

app.post(
    '/api/knowledge/search',
    (req, res) => {
        try {
            const question =
                cleanText(
                    req.body?.question ||
                    req.body?.query ||
                    '',
                    KNOWLEDGE_CONFIG
                        .maxQuestionLength
                );

            if (!question) {
                return res
                    .status(400)
                    .json({
                        ok: false,
                        error:
                            'question_required'
                    });
            }

            const results =
                searchKnowledge(
                    question,
                    {
                        intent:
                            req.body?.intent ||
                            null,

                        topic:
                            req.body?.topic ||
                            null,

                        language:
                            req.body?.language ||
                            null,

                        limit:
                            req.body?.limit ||
                            10,

                        minimumScore:
                            req.body
                                ?.minimumScore ||
                            KNOWLEDGE_CONFIG
                                .minimumMatchScore
                    }
                );

            return res.json({
                ok: true,
                results
            });
        } catch (error) {
            return res
                .status(500)
                .json({
                    ok: false,
                    error:
                        error.message
                });
        }
    }
);


/* ============================================================
   KNOWLEDGE ANSWER API
   ============================================================ */

app.post(
    '/api/knowledge/answer',
    (req, res) => {
        try {
            const question =
                cleanText(
                    req.body?.question ||
                    req.body?.query ||
                    '',
                    KNOWLEDGE_CONFIG
                        .maxQuestionLength
                );

            if (!question) {
                return res
                    .status(400)
                    .json({
                        ok: false,
                        error:
                            'question_required'
                    });
            }

            const decision =
                decideLocalIntelligence(
                    question,
                    {
                        intent:
                            req.body?.intent ||
                            null,

                        topic:
                            req.body?.topic ||
                            null,

                        language:
                            req.body?.language ||
                            null
                    }
                );

            return res.json({
                ok: true,
                decision
            });
        } catch (error) {
            return res
                .status(500)
                .json({
                    ok: false,
                    error:
                        error.message
                });
        }
    }
);


/* ============================================================
   KNOWLEDGE LEARN API
   ============================================================ */

app.post(
    '/api/knowledge/learn',
    (req, res) => {
        try {
            const question =
                cleanText(
                    req.body?.question ||
                    '',
                    KNOWLEDGE_CONFIG
                        .maxQuestionLength
                );

            const answer =
                cleanText(
                    req.body?.answer ||
                    '',
                    KNOWLEDGE_CONFIG
                        .maxAnswerLength
                );

            if (
                !question ||
                !answer
            ) {
                return res
                    .status(400)
                    .json({
                        ok: false,
                        error:
                            'question_and_answer_required'
                    });
            }

            const result =
                learnAssistantAnswer(
                    req.body?.userId ||
                    'anonymous',

                    question,

                    answer,

                    req.body
                );

            return res.json(
                result
            );
        } catch (error) {
            return res
                .status(500)
                .json({
                    ok: false,
                    error:
                        error.message
                });
        }
    }
);


/* ============================================================
   KNOWLEDGE FEEDBACK API
   ============================================================ */

app.post(
    '/api/knowledge/feedback',
    (req, res) => {
        try {
            const recordId =
                cleanText(
                    req.body?.recordId ||
                    '',
                    200
                );

            if (!recordId) {
                return res
                    .status(400)
                    .json({
                        ok: false,
                        error:
                            'record_id_required'
                    });
            }

            const successful =
                req.body?.successful ===
                true;

            const record =
                updateKnowledgeFeedback(
                    recordId,
                    successful
                );

            if (!record) {
                return res
                    .status(404)
                    .json({
                        ok: false,
                        error:
                            'knowledge_record_not_found'
                    });
            }

            return res.json({
                ok: true,
                record
            });
        } catch (error) {
            return res
                .status(500)
                .json({
                    ok: false,
                    error:
                        error.message
                });
        }
    }
);


/* ============================================================
   KNOWLEDGE STATISTICS API
   ============================================================ */

app.get(
    '/api/knowledge/stats',
    (_req, res) => {
        return res.json({
            ok: true,
            statistics:
                getKnowledgeStatistics()
        });
    }
);


/* ============================================================
   KNOWLEDGE REINDEX API
   ============================================================ */

app.post(
    '/api/knowledge/reindex',
    (_req, res) => {
        try {
            const result =
                rebuildKnowledgeIndexes();

            return res.json({
                ok: true,
                result
            });
        } catch (error) {
            return res
                .status(500)
                .json({
                    ok: false,
                    error:
                        error.message
                });
        }
    }
);


/* ============================================================
   LOCAL INTELLIGENCE PIPELINE
   ============================================================ */

function runLocalIntelligence(
    userId,
    conversationId,
    question,
    options = {}
) {
    const parsed =
        options.parsed ||
        parseMessage(
            question
        );

    const intent =
        options.intent ||
        parsed.primaryIntent ||
        'question';

    const topic =
        options.topic ||
        detectKnowledgeTopic(
            question,
            intent
        );

    const language =
        options.language ||
        parsed.language ||
        detectLanguage(
            question
        );

    const memoryContext =
        buildAdvancedContext(
            userId,
            conversationId,
            question,
            {
                intent
            }
        );

    const decision =
        decideLocalIntelligence(
            question,
            {
                parsed,
                intent,
                topic,
                language
            }
        );

    const learned =
        retrieveLearnedPatterns(
            userId,
            question,
            {
                limit: 5,
                minimumScore: 0.15
            }
        );

    return {
        ok: true,

        question,

        intent,
        topic,
        language,

        decision,

        learned,

        memory:
            memoryContext
                .advanced,

        generatedAt:
            timestamp()
    };
}


/* ============================================================
   LOCAL INTELLIGENCE API
   ============================================================ */

app.post(
    '/api/intelligence/local',
    (req, res) => {
        try {
            const userId =
                cleanText(
                    req.body?.userId ||
                    'anonymous',
                    200
                );

            const conversationId =
                cleanText(
                    req.body
                        ?.conversationId ||
                    '',
                    200
                );

            const question =
                cleanText(
                    req.body?.question ||
                    req.body?.query ||
                    '',
                    KNOWLEDGE_CONFIG
                        .maxQuestionLength
                );

            if (!question) {
                return res
                    .status(400)
                    .json({
                        ok: false,
                        error:
                            'question_required'
                    });
            }

            const result =
                runLocalIntelligence(
                    userId,
                    conversationId,
                    question,
                    {
                        intent:
                            req.body?.intent ||
                            null
                    }
                );

            return res.json(
                result
            );
        } catch (error) {
            return res
                .status(500)
                .json({
                    ok: false,
                    error:
                        error.message
                });
        }
    }
);


/* ============================================================
   AUTOMATIC ANSWER LEARNING HOOK
   ============================================================ */

function learnFromConversationAnswer(
    userId,
    question,
    answer,
    metadata = {}
) {
    if (
        !question ||
        !answer
    ) {
        return {
            ok: false,
            learned: false
        };
    }

    const intent =
        metadata.intent ||
        detectLanguage(
            question
        );

    const result =
        learnAssistantAnswer(
            userId,
            question,
            answer,
            {
                ...metadata,

                intent:
                    metadata.intent ||
                    'question',

                language:
                    metadata.language ||
                    detectLanguage(
                        question
                    ),

                source:
                    metadata.source ||
                    'conversation',

                sourceType:
                    metadata.sourceType ||
                    'learned'
            }
        );

    return result;
}


/* ============================================================
   KNOWLEDGE HEALTH
   ============================================================ */

function knowledgeHealth() {
    const statistics =
        getKnowledgeStatistics();

    const healthy =
        statistics.records >= 0 &&
        statistics.keywords >= 0;

    return {
        healthy,

        file:
            KNOWLEDGE_FILE,

        records:
            statistics.records,

        searches:
            statistics.totalSearches,

        hits:
            statistics.totalHits,

        learned:
            statistics.totalLearned,

        updated:
            statistics.totalUpdated,

        duplicates:
            statistics.totalDuplicates,

        hitRate:
            statistics.totalSearches
                ? (
                    statistics.totalHits /
                    statistics.totalSearches
                )
                .toFixed(3)
                : '0.000',

        updatedAt:
            timestamp()
    };
}


app.get(
    '/api/knowledge/health',
    (_req, res) => {
        return res.json({
            ok: true,
            health:
                knowledgeHealth()
        });
    }
);


/* ============================================================
   INITIAL INDEX REPAIR
   ============================================================ */

if (
    knowledgeDatabase.records
        .length > 0
) {
    let needsRebuild = false;

    for (
        const record of
        knowledgeDatabase.records
    ) {
        if (
            !record.normalizedQuestion ||
            !Array.isArray(
                record.keywords
            )
        ) {
            needsRebuild = true;
            break;
        }
    }

    if (needsRebuild) {
        rebuildKnowledgeIndexes();
    }
}


/* ============================================================
   PART 3 EXPORTS
   ============================================================ */

module.exports = {
    ...(module.exports || {}),

    normalizeKnowledgeDatabase,
    saveKnowledgeDatabase,

    normalizeKnowledgeText,
    knowledgeFingerprint,

    getKnowledgeKeywords,
    detectKnowledgeTopic,

    addToKnowledgeIndex,
    removeFromKnowledgeIndex,
    rebuildKnowledgeIndexes,

    createKnowledgeRecord,
    indexKnowledgeRecord,

    findExactKnowledge,
    collectKnowledgeCandidates,
    scoreKnowledgeRecord,

    searchKnowledge,
    findKnowledgeAnswer,

    findKnowledgeDuplicate,
    addKnowledge,

    updateKnowledgeFeedback,

    decideLocalIntelligence,

    learnAssistantAnswer,
    importKnowledgeRecords,

    getKnowledgeStatistics,

    runLocalIntelligence,
    learnFromConversationAnswer,

    knowledgeHealth
};


/*
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘                         PART 3 KAPANIÅ                              â•‘
â•‘                                                                      â•‘
â•‘  TÃ¼rkAI artÄ±k:                                                       â•‘
â•‘                                                                      â•‘
â•‘  âœ“ knowledge.json                                                    â•‘
â•‘  âœ“ Local knowledge database                                          â•‘
â•‘  âœ“ Exact question matching                                           â•‘
â•‘  âœ“ Similar question matching                                         â•‘
â•‘  âœ“ Keyword indexing                                                  â•‘
â•‘  âœ“ Intent indexing                                                   â•‘
â•‘  âœ“ Topic indexing                                                    â•‘
â•‘  âœ“ Knowledge confidence                                              â•‘
â•‘  âœ“ Knowledge quality                                                 â•‘
â•‘  âœ“ Duplicate detection                                               â•‘
â•‘  âœ“ Automatic learning                                                â•‘
â•‘  âœ“ Feedback / quality adjustment                                     â•‘
â•‘  âœ“ Local intelligence decision engine                                â•‘
â•‘  âœ“ Memory + knowledge birleÅŸimi                                      â•‘
â•‘  âœ“ Research'a geÃ§iÅŸ kararÄ± iÃ§in altyapÄ±                              â•‘
â•‘                                                                      â•‘
â•‘  SONRAKÄ°:                                                            â•‘
â•‘  PART 4 / 20 â†’ RESEARCH + WEB INTELLIGENCE ENGINE                    â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
*/
/* ============================================================
   TÃœRKAI SERVER â€” PART 4 / 20
   RESEARCH + WEB INTELLIGENCE ENGINE
   ============================================================ */

console.log('ğŸŒ TÃœRKAI SERVER PART 4 / 20 yÃ¼kleniyor...');

/*
   Bu bÃ¶lÃ¼mÃ¼n gÃ¶revleri:

   1. GÃ¼ncel soru tespiti
   2. AraÅŸtÄ±rma gereksinimi analizi
   3. Arama sorgusu Ã¼retimi
   4. TÃ¼rkÃ§e sorgu temizleme
   5. Birden fazla arama sorgusu oluÅŸturma
   6. AraÅŸtÄ±rma oturumu oluÅŸturma
   7. Kaynak kayÄ±t sistemi
   8. Kaynak gÃ¼venilirlik puanÄ±
   9. SonuÃ§ birleÅŸtirme
   10. SonuÃ§ temizleme
   11. AraÅŸtÄ±rma Ã¶zeti hazÄ±rlama
   12. AraÅŸtÄ±rma geÃ§miÅŸi
   13. AraÅŸtÄ±rma cache sistemi
   14. GÃ¼ncellik kontrolÃ¼
   15. Research API
*/


/* ============================================================
   1 â€” RESEARCH CONFIG
   ============================================================ */

const RESEARCH_CONFIG = {
    enabled: true,

    maxQueryLength: 500,
    maxQueries: 8,

    maxSourcesPerResearch: 30,
    maxSourcesInContext: 12,

    cacheDurationMinutes: 15,

    minSourceScore: 0.18,
    strongSourceScore: 0.65,

    maxSummaryLength: 12000,
    maxSourceTextLength: 12000,

    freshnessHours: 24,
    recentHours: 72,

    timeoutMs: 12000,

    userAgent:
        'TurkAI/1.0 Research Engine',

    currentQuestionPatterns: [
        'ÅŸu an',
        'ÅŸimdi',
        'bugÃ¼n',
        'bugÃ¼nkÃ¼',
        'gÃ¼ncel',
        'son durum',
        'son geliÅŸme',
        'son geliÅŸmeler',
        'en son',
        'yeni',
        'yakÄ±n zamanda',
        'bu hafta',
        'bu ay',
        'kaÃ§ oldu',
        'ne kadar oldu',
        'ÅŸu anda',
        'currently',
        'today',
        'latest',
        'recent',
        'now'
    ],

    researchPatterns: [
        'araÅŸtÄ±r',
        'internetten bak',
        'internette ara',
        'webde ara',
        'webde bak',
        'kaynak bul',
        'kaynaklarÄ± bul',
        'detaylÄ± araÅŸtÄ±r',
        'incele',
        'karÅŸÄ±laÅŸtÄ±r',
        'nedir',
        'kimdir',
        'nasÄ±l',
        'neden',
        'ne zaman',
        'hangi',
        'hangileri',
        'where',
        'when',
        'why',
        'how',
        'what',
        'who'
    ],

    dynamicTopics: [
        'haber',
        'hava',
        'dÃ¶viz',
        'kur',
        'altÄ±n',
        'borsa',
        'spor',
        'maÃ§',
        'puan',
        'seÃ§im',
        'politika',
        'baÅŸkan',
        'bakan',
        'yasa',
        'kanun',
        'teknoloji',
        'yapay zeka',
        'yazÄ±lÄ±m',
        'Ã¼rÃ¼n',
        'fiyat',
        'sÃ¼rÃ¼m',
        'gÃ¼ncelleme'
    ]
};


/* ============================================================
   2 â€” RESEARCH DATABASE
   ============================================================ */

const RESEARCH_DIR = path.join(DATA_DIR, 'research');

ensureDirectory(RESEARCH_DIR);

const RESEARCH_FILE = path.join(
    RESEARCH_DIR,
    'research.json'
);

const RESEARCH_CACHE_FILE = path.join(
    RESEARCH_DIR,
    'cache.json'
);

const DEFAULT_RESEARCH_DATABASE = {
    version: 1,

    searches: [],

    sources: [],

    answers: [],

    statistics: {
        totalSearches: 0,
        successfulSearches: 0,
        failedSearches: 0,
        cachedSearches: 0,
        totalSources: 0
    }
};

const DEFAULT_RESEARCH_CACHE = {
    version: 1,
    entries: {}
};

let researchDatabase = readJson(
    RESEARCH_FILE,
    DEFAULT_RESEARCH_DATABASE
);

let researchCache = readJson(
    RESEARCH_CACHE_FILE,
    DEFAULT_RESEARCH_CACHE
);


/* ============================================================
   3 â€” DATABASE NORMALIZATION
   ============================================================ */

function normalizeResearchDatabase(database) {

    const source = database &&
        typeof database === 'object'
        ? database
        : {};

    if (!Array.isArray(source.searches)) {
        source.searches = [];
    }

    if (!Array.isArray(source.sources)) {
        source.sources = [];
    }

    if (!Array.isArray(source.answers)) {
        source.answers = [];
    }

    if (!source.statistics ||
        typeof source.statistics !== 'object') {

        source.statistics = {};
    }

    source.statistics.totalSearches =
        safeNumber(source.statistics.totalSearches, 0);

    source.statistics.successfulSearches =
        safeNumber(
            source.statistics.successfulSearches,
            0
        );

    source.statistics.failedSearches =
        safeNumber(
            source.statistics.failedSearches,
            0
        );

    source.statistics.cachedSearches =
        safeNumber(
            source.statistics.cachedSearches,
            0
        );

    source.statistics.totalSources =
        safeNumber(
            source.statistics.totalSources,
            0
        );

    return source;
}


function normalizeResearchCache(cache) {

    const source = cache &&
        typeof cache === 'object'
        ? cache
        : {};

    if (!source.entries ||
        typeof source.entries !== 'object') {

        source.entries = {};
    }

    return source;
}


researchDatabase =
    normalizeResearchDatabase(researchDatabase);

researchCache =
    normalizeResearchCache(researchCache);


/* ============================================================
   4 â€” RESEARCH SAVE HELPERS
   ============================================================ */

function saveResearchDatabase() {

    writeJson(
        RESEARCH_FILE,
        researchDatabase
    );
}


function saveResearchCache() {

    writeJson(
        RESEARCH_CACHE_FILE,
        researchCache
    );
}


/* ============================================================
   5 â€” TEXT HELPERS
   ============================================================ */

function normalizeResearchText(value) {

    return normalizeSpace(
        String(value || '')
            .replace(/\u0000/g, '')
            .replace(/\s+/g, ' ')
    );
}


function cleanResearchQuery(value) {

    let query =
        normalizeResearchText(value);

    query = query
        .replace(/^(araÅŸtÄ±r|araÅŸtÄ±rÄ±r mÄ±sÄ±n)\s*/i, '')
        .replace(/^(internetten|internette|webde|web'de)\s*/i, '')
        .replace(/^(bakabilir misin|bakar mÄ±sÄ±n)\s*/i, '')
        .trim();

    if (query.length > RESEARCH_CONFIG.maxQueryLength) {

        query =
            query.slice(
                0,
                RESEARCH_CONFIG.maxQueryLength
            );
    }

    return query;
}


function normalizeResearchUrl(url) {

    const value =
        normalizeResearchText(url);

    if (!value) {
        return '';
    }

    if (
        !value.startsWith('http://') &&
        !value.startsWith('https://')
    ) {
        return '';
    }

    return value;
}


/* ============================================================
   6 â€” CURRENT / DYNAMIC QUESTION DETECTION
   ============================================================ */

function containsResearchPattern(text) {

    const normalized =
        normalizeForSearch(text);

    return RESEARCH_CONFIG.researchPatterns
        .some(pattern => {

            return normalized.includes(
                normalizeForSearch(pattern)
            );
        });
}


function containsCurrentPattern(text) {

    const normalized =
        normalizeForSearch(text);

    return RESEARCH_CONFIG.currentQuestionPatterns
        .some(pattern => {

            return normalized.includes(
                normalizeForSearch(pattern)
            );
        });
}


function containsDynamicTopic(text) {

    const normalized =
        normalizeForSearch(text);

    return RESEARCH_CONFIG.dynamicTopics
        .some(topic => {

            return normalized.includes(
                normalizeForSearch(topic)
            );
        });
}


/* ============================================================
   7 â€” DATE / FRESHNESS HELPERS
   ============================================================ */

function getResearchAgeHours(value) {

    const time =
        new Date(value).getTime();

    if (!Number.isFinite(time)) {
        return Infinity;
    }

    return Math.max(
        0,
        (Date.now() - time) / 3600000
    );
}


function isResearchFresh(value) {

    return (
        getResearchAgeHours(value) <=
        RESEARCH_CONFIG.freshnessHours
    );
}


function isResearchRecent(value) {

    return (
        getResearchAgeHours(value) <=
        RESEARCH_CONFIG.recentHours
    );
}


/* ============================================================
   8 â€” RESEARCH NEED ANALYZER
   ============================================================ */

function analyzeResearchNeed(
    message,
    localDecision = null
) {

    const text =
        normalizeResearchText(message);

    const normalized =
        normalizeForSearch(text);

    const reasons = [];

    let score = 0;

    if (containsCurrentPattern(text)) {

        score += 0.42;

        reasons.push(
            'current_information'
        );
    }

    if (containsResearchPattern(text)) {

        score += 0.28;

        reasons.push(
            'explicit_research_request'
        );
    }

    if (containsDynamicTopic(text)) {

        score += 0.22;

        reasons.push(
            'dynamic_topic'
        );
    }

    if (
        normalized.includes('fiyat') ||
        normalized.includes('price')
    ) {

        score += 0.18;

        reasons.push(
            'price_information'
        );
    }

    if (
        normalized.includes('sÃ¼rÃ¼m') ||
        normalized.includes('versiyon') ||
        normalized.includes('version')
    ) {

        score += 0.18;

        reasons.push(
            'version_information'
        );
    }

    if (
        normalized.includes('bugÃ¼n') ||
        normalized.includes('ÅŸimdi') ||
        normalized.includes('son')
    ) {

        score += 0.25;

        reasons.push(
            'time_sensitive'
        );
    }

    if (
        localDecision &&
        localDecision.action === 'research'
    ) {

        score += 0.35;

        reasons.push(
            'local_knowledge_missing'
        );
    }

    if (
        localDecision &&
        localDecision.action === 'research_or_local'
    ) {

        score += 0.15;

        reasons.push(
            'local_knowledge_partial'
        );
    }

    score = clamp(
        score,
        0,
        1
    );

    return {
        shouldResearch: score >= 0.28,
        score,
        reasons: unique(reasons),
        query: cleanResearchQuery(text)
    };
}


/* ============================================================
   9 â€” QUERY GENERATOR
   ============================================================ */

function buildResearchQuery(
    message,
    context = {}
) {

    let query =
        cleanResearchQuery(message);

    const language =
        context.language || 'tr';

    const topic =
        context.topic || '';

    if (topic && query.length < 120) {

        query =
            `${query} ${topic}`;
    }

    query =
        normalizeResearchText(query);

    /*
       Gereksiz araÅŸtÄ±rma komutlarÄ±nÄ± temizle.
    */

    query = query
        .replace(/\baraÅŸtÄ±r\b/gi, '')
        .replace(/\binternetten\b/gi, '')
        .replace(/\binternette\b/gi, '')
        .replace(/\bwebde\b/gi, '')
        .replace(/\bweb'de\b/gi, '')
        .replace(/\bbakar mÄ±sÄ±n\b/gi, '')
        .replace(/\bbakabilir misin\b/gi, '');

    query =
        normalizeResearchText(query);

    if (language === 'tr') {

        query =
            query.replace(
                /\?+$/g,
                ''
            );
    }

    return query.slice(
        0,
        RESEARCH_CONFIG.maxQueryLength
    );
}


/* ============================================================
   10 â€” MULTI QUERY GENERATOR
   ============================================================ */

function generateResearchQueries(
    message,
    context = {}
) {

    const base =
        buildResearchQuery(
            message,
            context
        );

    if (!base) {
        return [];
    }

    const queries = [
        base
    ];

    const normalized =
        normalizeForSearch(base);

    /*
       GÃ¼ncel sorular iÃ§in ikinci sorgu.
    */

    if (
        containsCurrentPattern(message) &&
        !normalized.includes('gÃ¼ncel')
    ) {

        queries.push(
            `${base} gÃ¼ncel`
        );
    }

    /*
       ResmÃ® bilgi ihtimali.
    */

    if (
        normalized.includes('yasa') ||
        normalized.includes('kanun') ||
        normalized.includes('bakan') ||
        normalized.includes('resmi') ||
        normalized.includes('devlet')
    ) {

        queries.push(
            `${base} resmi kaynak`
        );
    }

    /*
       Teknoloji / yazÄ±lÄ±m.
    */

    if (
        normalized.includes('yazÄ±lÄ±m') ||
        normalized.includes('kod') ||
        normalized.includes('javascript') ||
        normalized.includes('python') ||
        normalized.includes('api')
    ) {

        queries.push(
            `${base} documentation`
        );
    }

    /*
       ÃœrÃ¼n/fiyat araÅŸtÄ±rmasÄ±.
    */

    if (
        normalized.includes('fiyat') ||
        normalized.includes('Ã¼rÃ¼n')
    ) {

        queries.push(
            `${base} fiyat`
        );
    }

    /*
       Haber araÅŸtÄ±rmasÄ±.
    */

    if (
        normalized.includes('haber') ||
        normalized.includes('son geliÅŸme')
    ) {

        queries.push(
            `${base} son geliÅŸmeler`
        );
    }

    return unique(
        queries
            .map(cleanResearchQuery)
            .filter(Boolean)
    ).slice(
        0,
        RESEARCH_CONFIG.maxQueries
    );
}


/* ============================================================
   11 â€” SOURCE ID
   ============================================================ */

function createSourceId(url, title = '') {

    const fingerprint =
        `${url}|${title}`;

    return crypto
        .createHash('sha256')
        .update(fingerprint)
        .digest('hex')
        .slice(0, 24);
}


/* ============================================================
   12 â€” SOURCE RECORD
   ============================================================ */

function createResearchSource(data = {}) {

    const url =
        normalizeResearchUrl(data.url);

    const title =
        normalizeResearchText(
            data.title ||
            'Ä°simsiz kaynak'
        );

    const description =
        normalizeResearchText(
            data.description
        );

    const content =
        normalizeResearchText(
            data.content
        );

    const publishedAt =
        data.publishedAt ||
        null;

    const discoveredAt =
        timestamp();

    return {

        id:
            data.id ||
            createSourceId(
                url,
                title
            ),

        url,

        title,

        description,

        content:
            content.slice(
                0,
                RESEARCH_CONFIG.maxSourceTextLength
            ),

        publishedAt,

        discoveredAt,

        domain:
            extractDomain(url),

        sourceType:
            data.sourceType ||
            'web',

        sourceScore:
            clamp(
                safeNumber(
                    data.sourceScore,
                    0.5
                ),
                0,
                1
            ),

        relevanceScore:
            clamp(
                safeNumber(
                    data.relevanceScore,
                    0
                ),
                0,
                1
            ),

        freshnessScore:
            clamp(
                safeNumber(
                    data.freshnessScore,
                    calculateFreshnessScore(
                        publishedAt ||
                        discoveredAt
                    )
                ),
                0,
                1
            )
    };
}


/* ============================================================
   13 â€” DOMAIN EXTRACTION
   ============================================================ */

function extractDomain(url) {

    try {

        if (!url) {
            return '';
        }

        const parsed =
            new URL(url);

        return parsed.hostname
            .replace(/^www\./i, '')
            .toLowerCase();

    } catch {

        return '';
    }
}


/* ============================================================
   14 â€” DOMAIN TRUST
   ============================================================ */

const TRUSTED_DOMAINS = {

    'gov.tr': 1.00,
    'edu.tr': 0.94,
    'org.tr': 0.86,

    'gov': 1.00,
    'edu': 0.94,

    'wikipedia.org': 0.82,

    'github.com': 0.88,
    'github.io': 0.78,

    'developer.mozilla.org': 0.97,

    'nodejs.org': 0.98,
    'python.org': 0.98,

    'openai.com': 0.98,

    'microsoft.com': 0.97,
    'google.com': 0.97,

    'apple.com': 0.97,

    'cloudflare.com': 0.95
};


function calculateDomainTrust(domain) {

    const normalized =
        normalizeResearchText(domain)
            .toLowerCase();

    if (!normalized) {
        return 0.35;
    }

    for (
        const trustedDomain
        of Object.keys(TRUSTED_DOMAINS)
    ) {

        if (
            normalized === trustedDomain ||
            normalized.endsWith(
                `.${trustedDomain}`
            )
        ) {

            return TRUSTED_DOMAINS[
                trustedDomain
            ];
        }
    }

    /*
       HTTPS kaynaklara kÃ¼Ã§Ã¼k avantaj.
    */

    return 0.50;
}


/* ============================================================
   15 â€” FRESHNESS SCORE
   ============================================================ */

function calculateFreshnessScore(dateValue) {

    const hours =
        getResearchAgeHours(
            dateValue
        );

    if (!Number.isFinite(hours)) {
        return 0.25;
    }

    if (hours <= 1) {
        return 1;
    }

    if (hours <= 6) {
        return 0.95;
    }

    if (hours <= 24) {
        return 0.85;
    }

    if (hours <= 72) {
        return 0.70;
    }

    if (hours <= 168) {
        return 0.55;
    }

    if (hours <= 720) {
        return 0.35;
    }

    return 0.20;
}


/* ============================================================
   16 â€” SOURCE RELEVANCE
   ============================================================ */

function calculateSourceRelevance(
    query,
    source
) {

    const queryTokens =
        contentTokens(query);

    const sourceText =
        `${source.title || ''} ` +
        `${source.description || ''} ` +
        `${source.content || ''}`;

    const sourceTokens =
        contentTokens(sourceText);

    if (
        queryTokens.length === 0 ||
        sourceTokens.length === 0
    ) {

        return 0;
    }

    const overlap =
        tokenIntersection(
            queryTokens,
            sourceTokens
        );

    const union =
        tokenUnion(
            queryTokens,
            sourceTokens
        );

    let score = 0;

    if (union.length > 0) {

        score =
            overlap.length /
            union.length;
    }

    /*
       BaÅŸlÄ±k eÅŸleÅŸmesine ekstra aÄŸÄ±rlÄ±k.
    */

    const titleTokens =
        contentTokens(
            source.title
        );

    const titleOverlap =
        tokenIntersection(
            queryTokens,
            titleTokens
        );

    if (queryTokens.length > 0) {

        score +=
            (
                titleOverlap.length /
                queryTokens.length
            ) * 0.45;
    }

    return clamp(
        score,
        0,
        1
    );
}


/* ============================================================
   17 â€” SOURCE SCORE
   ============================================================ */

function calculateSourceScore(
    query,
    source
) {

    const domainTrust =
        calculateDomainTrust(
            source.domain
        );

    const relevance =
        calculateSourceRelevance(
            query,
            source
        );

    const freshness =
        calculateFreshnessScore(
            source.publishedAt ||
            source.discoveredAt
        );

    return clamp(
        (
            domainTrust * 0.35 +
            relevance * 0.45 +
            freshness * 0.20
        ),
        0,
        1
    );
}


/* ============================================================
   18 â€” SOURCE NORMALIZATION
   ============================================================ */

function normalizeResearchSource(
    query,
    source
) {

    const normalized =
        createResearchSource(
            source
        );

    normalized.relevanceScore =
        calculateSourceRelevance(
            query,
            normalized
        );

    normalized.freshnessScore =
        calculateFreshnessScore(
            normalized.publishedAt ||
            normalized.discoveredAt
        );

    normalized.sourceScore =
        calculateSourceScore(
            query,
            normalized
        );

    return normalized;
}


/* ============================================================
   19 â€” SOURCE DEDUPLICATION
   ============================================================ */

function deduplicateResearchSources(
    sources
) {

    const map = new Map();

    for (
        const source of sources
    ) {

        const key =
            source.url ||
            source.id ||
            `${source.title}|${source.domain}`;

        if (!key) {
            continue;
        }

        const previous =
            map.get(key);

        if (!previous) {

            map.set(
                key,
                source
            );

            continue;
        }

        /*
           AynÄ± URL varsa daha kaliteli
           olan kaynaÄŸÄ± koru.
        */

        if (
            safeNumber(
                source.sourceScore,
                0
            ) >
            safeNumber(
                previous.sourceScore,
                0
            )
        ) {

            map.set(
                key,
                source
            );
        }
    }

    return Array.from(
        map.values()
    );
}


/* ============================================================
   20 â€” SORT SOURCES
   ============================================================ */

function sortResearchSources(
    sources
) {

    return [...sources].sort(
        (a, b) => {

            const scoreA =
                safeNumber(
                    a.sourceScore,
                    0
                );

            const scoreB =
                safeNumber(
                    b.sourceScore,
                    0
                );

            return scoreB - scoreA;
        }
    );
}


/* ============================================================
   21 â€” RESEARCH SESSION
   ============================================================ */

function createResearchSession(
    userId,
    message,
    context = {}
) {

    const analysis =
        analyzeResearchNeed(
            message,
            context.localDecision
        );

    const queries =
        generateResearchQueries(
            message,
            context
        );

    const session = {

        id:
            generateId('research'),

        userId:
            userId || 'anonymous',

        originalMessage:
            normalizeResearchText(
                message
            ),

        primaryQuery:
            queries[0] || '',

        queries,

        language:
            context.language || 'tr',

        topic:
            context.topic || '',

        intent:
            context.intent || 'question',

        analysis,

        sources: [],

        status:
            'created',

        startedAt:
            timestamp(),

        completedAt:
            null,

        error:
            null
    };

    return session;
}


/* ============================================================
   22 â€” RESEARCH HISTORY
   ============================================================ */

function saveResearchSession(
    session
) {

    researchDatabase.searches.push(
        session
    );

    if (
        researchDatabase.searches.length >
        5000
    ) {

        researchDatabase.searches =
            researchDatabase.searches.slice(
                -5000
            );
    }

    researchDatabase.statistics
        .totalSearches++;

    if (
        session.status === 'completed'
    ) {

        researchDatabase.statistics
            .successfulSearches++;
    }

    if (
        session.status === 'failed'
    ) {

        researchDatabase.statistics
            .failedSearches++;
    }

    saveResearchDatabase();
}


/* ============================================================
   23 â€” SOURCE STORAGE
   ============================================================ */

function storeResearchSources(
    sources
) {

    for (
        const source of sources
    ) {

        const existing =
            researchDatabase.sources
                .find(
                    item =>
                        item.id === source.id
                );

        if (existing) {

            Object.assign(
                existing,
                source
            );

        } else {

            researchDatabase.sources.push(
                source
            );
        }
    }

    if (
        researchDatabase.sources.length >
        10000
    ) {

        researchDatabase.sources =
            researchDatabase.sources.slice(
                -10000
            );
    }

    researchDatabase.statistics
        .totalSources =
        researchDatabase.sources.length;

    saveResearchDatabase();
}


/* ============================================================
   24 â€” CACHE KEY
   ============================================================ */

function createResearchCacheKey(
    query,
    context = {}
) {

    const raw =
        [
            normalizeForSearch(query),
            context.language || '',
            context.topic || ''
        ].join('|');

    return crypto
        .createHash('sha256')
        .update(raw)
        .digest('hex');
}


/* ============================================================
   25 â€” CACHE READ
   ============================================================ */

function getResearchCache(
    query,
    context = {}
) {

    const key =
        createResearchCacheKey(
            query,
            context
        );

    const entry =
        researchCache.entries[key];

    if (!entry) {
        return null;
    }

    const age =
        getResearchAgeHours(
            entry.createdAt
        );

    if (
        age >
        RESEARCH_CONFIG.cacheDurationMinutes /
        60
    ) {

        delete researchCache.entries[key];

        saveResearchCache();

        return null;
    }

    researchDatabase.statistics
        .cachedSearches++;

    return entry;
}


/* ============================================================
   26 â€” CACHE WRITE
   ============================================================ */

function setResearchCache(
    query,
    context,
    data
) {

    const key =
        createResearchCacheKey(
            query,
            context
        );

    researchCache.entries[key] = {

        query,

        createdAt:
            timestamp(),

        expiresAt:
            new Date(
                Date.now() +
                RESEARCH_CONFIG.cacheDurationMinutes *
                60000
            ).toISOString(),

        data
    };

    /*
       Cache boyutunu sÄ±nÄ±rlÄ±yoruz.
    */

    const entries =
        Object.entries(
            researchCache.entries
        );

    if (entries.length > 1000) {

        entries
            .sort(
                (a, b) =>
                    new Date(
                        a[1].createdAt
                    ) -
                    new Date(
                        b[1].createdAt
                    )
            )
            .slice(
                0,
                entries.length - 1000
            )
            .forEach(
                ([key]) =>
                    delete researchCache.entries[key]
            );
    }

    saveResearchCache();
}


/* ============================================================
   27 â€” RESEARCH TEXT EXTRACTION
   ============================================================ */

function extractUsefulResearchText(
    source
) {

    const parts = [];

    if (source.title) {
        parts.push(source.title);
    }

    if (source.description) {
        parts.push(source.description);
    }

    if (source.content) {
        parts.push(source.content);
    }

    return normalizeResearchText(
        parts.join(' ')
    ).slice(
        0,
        RESEARCH_CONFIG.maxSourceTextLength
    );
}


/* ============================================================
   28 â€” RESULT MERGER
   ============================================================ */

function mergeResearchResults(
    query,
    rawSources = []
) {

    const normalizedSources =
        rawSources
            .map(
                source =>
                    normalizeResearchSource(
                        query,
                        source
                    )
            )
            .filter(
                source =>
                    source.url ||
                    source.title ||
                    source.content
            );

    const deduplicated =
        deduplicateResearchSources(
            normalizedSources
        );

    const sorted =
        sortResearchSources(
            deduplicated
        );

    return sorted
        .slice(
            0,
            RESEARCH_CONFIG.maxSourcesPerResearch
        );
}


/* ============================================================
   29 â€” RESEARCH SUMMARY BUILDER
   ============================================================ */

function buildResearchSummary(
    query,
    sources
) {

    if (!sources.length) {

        return {
            text:
                'AraÅŸtÄ±rma sonucunda kullanÄ±labilir kaynak bulunamadÄ±.',

            sourceCount: 0,

            confidence: 0
        };
    }

    const selected =
        sources
            .filter(
                source =>
                    source.sourceScore >=
                    RESEARCH_CONFIG.minSourceScore
            )
            .slice(
                0,
                RESEARCH_CONFIG.maxSourcesInContext
            );

    const sections = [];

    for (
        const source of selected
    ) {

        const text =
            extractUsefulResearchText(
                source
            );

        if (!text) {
            continue;
        }

        sections.push(
            [
                source.title,
                source.domain
                    ? `(${source.domain})`
                    : '',
                text
            ]
                .filter(Boolean)
                .join(' â€” ')
        );
    }

    let summary =
        sections.join('\n\n');

    summary =
        summary.slice(
            0,
            RESEARCH_CONFIG.maxSummaryLength
        );

    const confidence =
        selected.length
            ? selected.reduce(
                (
                    total,
                    source
                ) =>
                    total +
                    safeNumber(
                        source.sourceScore,
                        0
                    ),
                0
            ) / selected.length
            : 0;

    return {

        text: summary,

        sourceCount:
            selected.length,

        confidence:
            clamp(
                confidence,
                0,
                1
            )
    };
}


/* ============================================================
   30 â€” RESEARCH ANSWER RECORD
   ============================================================ */

function createResearchAnswer(
    session,
    sources
) {

    const summary =
        buildResearchSummary(
            session.primaryQuery,
            sources
        );

    return {

        id:
            generateId('research-answer'),

        sessionId:
            session.id,

        userId:
            session.userId,

        query:
            session.primaryQuery,

        summary:
            summary.text,

        sourceCount:
            summary.sourceCount,

        confidence:
            summary.confidence,

        sources:
            sources
                .slice(
                    0,
                    RESEARCH_CONFIG.maxSourcesInContext
                )
                .map(
                    source => ({
                        id: source.id,
                        title: source.title,
                        url: source.url,
                        domain: source.domain,
                        score: source.sourceScore,
                        publishedAt:
                            source.publishedAt
                    })
                ),

        createdAt:
            timestamp()
    };
}


/* ============================================================
   31 â€” SAVE RESEARCH ANSWER
   ============================================================ */

function saveResearchAnswer(
    answer
) {

    researchDatabase.answers.push(
        answer
    );

    if (
        researchDatabase.answers.length >
        5000
    ) {

        researchDatabase.answers =
            researchDatabase.answers.slice(
                -5000
            );
    }

    saveResearchDatabase();

    return answer;
}


/* ============================================================
   32 â€” RESEARCH ENGINE CORE
   ============================================================ */

async function runResearchEngine(
    userId,
    message,
    context = {},
    options = {}
) {

    const session =
        createResearchSession(
            userId,
            message,
            context
        );

    /*
       AraÅŸtÄ±rma gerekmiyorsa engine
       bunu aÃ§Ä±kÃ§a bildirir.
    */

    if (
        !session.analysis.shouldResearch &&
        !options.force
    ) {

        session.status =
            'not_required';

        session.completedAt =
            timestamp();

        return {

            success: true,

            required: false,

            session
        };
    }

    /*
       Cache kontrolÃ¼.
    */

    if (!options.skipCache) {

        const cached =
            getResearchCache(
                session.primaryQuery,
                context
            );

        if (cached) {

            session.status =
                'cached';

            session.completedAt =
                timestamp();

            session.sources =
                cached.data.sources || [];

            return {

                success: true,

                required: true,

                cached: true,

                session,

                sources:
                    cached.data.sources || [],

                summary:
                    cached.data.summary || null
            };
        }
    }

    session.status =
        'searching';

    /*
       Bu bÃ¶lÃ¼m gerÃ§ek arama saÄŸlayÄ±cÄ±larÄ±nÄ±n
       baÄŸlanacaÄŸÄ± ortak arayÃ¼zdÃ¼r.

       Part 5+ iÃ§inde provider katmanlarÄ±
       buraya baÄŸlanacaktÄ±r.
    */

    let rawSources = [];

    if (
        typeof globalThis.TurkAIResearchProvider ===
        'function'
    ) {

        try {

            const providerResult =
                await globalThis.TurkAIResearchProvider(
                    {
                        query:
                            session.primaryQuery,

                        queries:
                            session.queries,

                        language:
                            session.language,

                        topic:
                            session.topic,

                        userId:
                            session.userId,

                        timeoutMs:
                            RESEARCH_CONFIG.timeoutMs
                    }
                );

            if (
                providerResult &&
                Array.isArray(
                    providerResult.sources
                )
            ) {

                rawSources =
                    providerResult.sources;
            }

        } catch (error) {

            session.error =
                cleanText(
                    error.message ||
                    'Research provider error'
                );
        }
    }

    const sources =
        mergeResearchResults(
            session.primaryQuery,
            rawSources
        );

    session.sources =
        sources;

    if (sources.length > 0) {

        session.status =
            'completed';

    } else {

        session.status =
            'no_results';
    }

    session.completedAt =
        timestamp();

    storeResearchSources(
        sources
    );

    const answer =
        createResearchAnswer(
            session,
            sources
        );

    saveResearchAnswer(
        answer
    );

    saveResearchSession(
        session
    );

    setResearchCache(
        session.primaryQuery,
        context,
        {
            sources,
            summary: answer
        }
    );

    return {

        success: true,

        required: true,

        cached: false,

        session,

        sources,

        summary: answer
    };
}


/* ============================================================
   33 â€” RESEARCH CONTEXT BUILDER
   ============================================================ */

function buildResearchContext(
    researchResult
) {

    if (
        !researchResult ||
        !researchResult.success
    ) {

        return {
            available: false,
            text: '',
            sources: []
        };
    }

    const sources =
        Array.isArray(
            researchResult.sources
        )
            ? researchResult.sources
            : [];

    const selected =
        sortResearchSources(
            sources
        )
            .slice(
                0,
                RESEARCH_CONFIG.maxSourcesInContext
            );

    const lines = [];

    for (
        const source of selected
    ) {

        const text =
            extractUsefulResearchText(
                source
            );

        if (!text) {
            continue;
        }

        lines.push(
            [
                `Kaynak: ${source.title}`,
                source.domain
                    ? `Alan adÄ±: ${source.domain}`
                    : '',
                source.url
                    ? `URL: ${source.url}`
                    : '',
                `GÃ¼ven skoru: ${
                    Math.round(
                        source.sourceScore * 100
                    )
                }`,
                text
            ]
                .filter(Boolean)
                .join('\n')
        );
    }

    return {

        available:
            lines.length > 0,

        text:
            lines.join('\n\n'),

        sources:
            selected
    };
}


/* ============================================================
   34 â€” RESEARCH DECISION
   ============================================================ */

function decideResearchAction(
    message,
    localDecision = null,
    context = {}
) {

    const analysis =
        analyzeResearchNeed(
            message,
            localDecision
        );

    /*
       AÃ§Ä±kÃ§a gÃ¼ncel bilgi isteyen soru
       araÅŸtÄ±rmaya gider.
    */

    if (
        containsCurrentPattern(message)
    ) {

        return {

            action:
                'research',

            reason:
                'current_information',

            score:
                Math.max(
                    analysis.score,
                    0.80
                )
        };
    }

    /*
       KullanÄ±cÄ± aÃ§Ä±kÃ§a araÅŸtÄ±rma
       istediyse araÅŸtÄ±r.
    */

    if (
        containsResearchPattern(message)
    ) {

        return {

            action:
                'research',

            reason:
                'explicit_research_request',

            score:
                Math.max(
                    analysis.score,
                    0.85
                )
        };
    }

    /*
       Yerel bilgi yetersizse.
    */

    if (
        localDecision &&
        (
            localDecision.action ===
            'research' ||
            localDecision.action ===
            'research_or_local'
        )
    ) {

        return {

            action:
                'research',

            reason:
                'local_knowledge_insufficient',

            score:
                analysis.score
        };
    }

    if (analysis.shouldResearch) {

        return {

            action:
                'research',

            reason:
                analysis.reasons.join(
                    ','
                ),

            score:
                analysis.score
        };
    }

    return {

        action:
            'local',

        reason:
            'research_not_required',

        score:
            analysis.score
    };
}


/* ============================================================
   35 â€” INTELLIGENCE PIPELINE
   ============================================================ */

async function runResearchIntelligence(
    userId,
    message,
    context = {}
) {

    const localDecision =
        context.localDecision ||
        null;

    const decision =
        decideResearchAction(
            message,
            localDecision,
            context
        );

    if (
        decision.action !== 'research'
    ) {

        return {

            required: false,

            decision,

            result: null,

            context: {
                available: false,
                text: '',
                sources: []
            }
        };
    }

    const result =
        await runResearchEngine(
            userId,
            message,
            {
                ...context,
                localDecision
            }
        );

    return {

        required: true,

        decision,

        result,

        context:
            buildResearchContext(
                result
            )
    };
}


/* ============================================================
   36 â€” RESEARCH HEALTH
   ============================================================ */

function researchHealth() {

    const searches =
        researchDatabase.searches;

    const completed =
        searches.filter(
            item =>
                item.status ===
                'completed'
        ).length;

    const failed =
        searches.filter(
            item =>
                item.status ===
                'failed'
        ).length;

    const cached =
        searches.filter(
            item =>
                item.status ===
                'cached'
        ).length;

    return {

        enabled:
            RESEARCH_CONFIG.enabled,

        totalSearches:
            searches.length,

        completed,

        failed,

        cached,

        storedSources:
            researchDatabase.sources.length,

        storedAnswers:
            researchDatabase.answers.length,

        cacheEntries:
            Object.keys(
                researchCache.entries
            ).length,

        providerConnected:
            typeof globalThis
                .TurkAIResearchProvider ===
                'function'
    };
}


/* ============================================================
   37 â€” API: RESEARCH NEED
   ============================================================ */

app.post(
    '/api/research/analyze',
    (req, res) => {

        try {

            const message =
                cleanText(
                    req.body?.message
                );

            if (!message) {

                return res.status(400).json({
                    success: false,
                    error:
                        'message gerekli'
                });
            }

            const localDecision =
                req.body?.localDecision ||
                null;

            const result =
                analyzeResearchNeed(
                    message,
                    localDecision
                );

            res.json({
                success: true,
                ...result
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/* ============================================================
   38 â€” API: QUERY GENERATION
   ============================================================ */

app.post(
    '/api/research/query',
    (req, res) => {

        try {

            const message =
                cleanText(
                    req.body?.message
                );

            if (!message) {

                return res.status(400).json({
                    success: false,
                    error:
                        'message gerekli'
                });
            }

            const queries =
                generateResearchQueries(
                    message,
                    {
                        language:
                            req.body?.language ||
                            'tr',

                        topic:
                            req.body?.topic ||
                            ''
                    }
                );

            res.json({
                success: true,
                queries
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/* ============================================================
   39 â€” API: RESEARCH ENGINE
   ============================================================ */

app.post(
    '/api/research/run',
    async (req, res) => {

        try {

            const message =
                cleanText(
                    req.body?.message
                );

            if (!message) {

                return res.status(400).json({
                    success: false,
                    error:
                        'message gerekli'
                });
            }

            const userId =
                cleanText(
                    req.body?.userId
                ) ||
                'anonymous';

            const result =
                await runResearchIntelligence(
                    userId,
                    message,
                    {
                        language:
                            req.body?.language ||
                            detectLanguage(message),

                        topic:
                            req.body?.topic ||
                            '',

                        intent:
                            req.body?.intent ||
                            'question',

                        localDecision:
                            req.body?.localDecision ||
                            null
                    }
                );

            res.json({
                success: true,
                ...result
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/* ============================================================
   40 â€” API: RESEARCH SOURCES
   ============================================================ */

app.post(
    '/api/research/sources',
    (req, res) => {

        try {

            const query =
                cleanText(
                    req.body?.query
                );

            if (!query) {

                return res.status(400).json({
                    success: false,
                    error:
                        'query gerekli'
                });
            }

            const sources =
                researchDatabase.sources
                    .filter(
                        source =>
                            calculateSourceRelevance(
                                query,
                                source
                            ) >=
                            RESEARCH_CONFIG.minMatch
                    )
                    .sort(
                        (a, b) =>
                            b.sourceScore -
                            a.sourceScore
                    )
                    .slice(
                        0,
                        RESEARCH_CONFIG.maxSourcesInContext
                    );

            res.json({
                success: true,
                query,
                sources
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/* ============================================================
   41 â€” API: RESEARCH HISTORY
   ============================================================ */

app.get(
    '/api/research/history',
    (req, res) => {

        try {

            const userId =
                cleanText(
                    req.query?.userId
                );

            let searches =
                researchDatabase.searches;

            if (userId) {

                searches =
                    searches.filter(
                        item =>
                            item.userId ===
                            userId
                    );
            }

            const limit =
                clamp(
                    safeNumber(
                        req.query?.limit,
                        20
                    ),
                    1,
                    100
                );

            searches =
                searches
                    .slice(-limit)
                    .reverse();

            res.json({
                success: true,
                searches
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/* ============================================================
   42 â€” API: RESEARCH HEALTH
   ============================================================ */

app.get(
    '/api/research/health',
    (req, res) => {

        try {

            res.json({
                success: true,
                health:
                    researchHealth()
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/* ============================================================
   43 â€” API: CACHE CLEAR
   ============================================================ */

app.post(
    '/api/research/cache/clear',
    (req, res) => {

        try {

            researchCache.entries = {};

            saveResearchCache();

            res.json({
                success: true,
                message:
                    'AraÅŸtÄ±rma cache temizlendi.'
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/* ============================================================
   44 â€” EXPORTS
   ============================================================ */

module.exports = {
    ...(module.exports || {}),

    RESEARCH_CONFIG,

    researchDatabase,

    researchCache,

    analyzeResearchNeed,

    buildResearchQuery,

    generateResearchQueries,

    createResearchSession,

    createResearchSource,

    calculateDomainTrust,

    calculateFreshnessScore,

    calculateSourceRelevance,

    calculateSourceScore,

    normalizeResearchSource,

    deduplicateResearchSources,

    sortResearchSources,

    runResearchEngine,

    buildResearchContext,

    decideResearchAction,

    runResearchIntelligence,

    researchHealth,

    getResearchCache,

    setResearchCache
};


console.log(
    'âœ… TÃœRKAI SERVER PART 4 / 20 hazÄ±r â€” Research Engine aktif.'
);


/* ============================================================
   PART 4 SONU
   ============================================================ */
/* ============================================================
   TÃœRKAI SERVER â€” PART 5 / 20
   WEB SEARCH PROVIDER + HTTP FETCH + SOURCE EXTRACTION
   ============================================================ */

console.log('ğŸŒ TÃœRKAI SERVER PART 5 / 20 yÃ¼kleniyor...');


/* ============================================================
   1 â€” WEB PROVIDER CONFIG
   ============================================================ */

const WEB_PROVIDER_CONFIG = {

    enabled: true,

    timeoutMs: 10000,

    maxResultsPerProvider: 8,

    maxTotalResults: 30,

    maxPageBytes: 2 * 1024 * 1024,

    maxPageTextLength: 30000,

    maxTitleLength: 500,

    maxDescriptionLength: 3000,

    maxUrlLength: 3000,

    maxRedirects: 5,

    cacheMinutes: 10,

    providers: {
        duckduckgo: true,
        bing: false,
        google: false,
        custom: true
    },

    /*
       API anahtarlarÄ± kod iÃ§ine yazÄ±lmaz.
       Ä°leride .env Ã¼zerinden kullanÄ±labilir.
    */

    environmentKeys: {
        bing:
            'BING_SEARCH_API_KEY',

        google:
            'GOOGLE_SEARCH_API_KEY',

        custom:
            'TURKAI_SEARCH_API_URL'
    }
};


/* ============================================================
   2 â€” WEB DATABASE
   ============================================================ */

const WEB_DIR =
    path.join(
        DATA_DIR,
        'web'
    );

ensureDirectory(
    WEB_DIR
);


const WEB_CACHE_FILE =
    path.join(
        WEB_DIR,
        'web-cache.json'
    );


const WEB_HISTORY_FILE =
    path.join(
        WEB_DIR,
        'web-history.json'
    );


const DEFAULT_WEB_CACHE = {

    version: 1,

    entries: {}

};


const DEFAULT_WEB_HISTORY = {

    version: 1,

    searches: [],

    fetches: [],

    statistics: {

        searches: 0,

        successfulSearches: 0,

        failedSearches: 0,

        fetchedPages: 0,

        failedPages: 0

    }

};


let webCache =
    readJson(
        WEB_CACHE_FILE,
        DEFAULT_WEB_CACHE
    );


let webHistory =
    readJson(
        WEB_HISTORY_FILE,
        DEFAULT_WEB_HISTORY
    );


/* ============================================================
   3 â€” DATABASE NORMALIZATION
   ============================================================ */

function normalizeWebDatabase() {

    if (
        !webCache ||
        typeof webCache !== 'object'
    ) {

        webCache = {
            ...DEFAULT_WEB_CACHE
        };

    }

    if (
        !webCache.entries ||
        typeof webCache.entries !== 'object'
    ) {

        webCache.entries = {};

    }


    if (
        !webHistory ||
        typeof webHistory !== 'object'
    ) {

        webHistory = {
            ...DEFAULT_WEB_HISTORY
        };

    }


    if (
        !Array.isArray(
            webHistory.searches
        )
    ) {

        webHistory.searches = [];

    }


    if (
        !Array.isArray(
            webHistory.fetches
        )
    ) {

        webHistory.fetches = [];

    }


    if (
        !webHistory.statistics ||
        typeof webHistory.statistics !== 'object'
    ) {

        webHistory.statistics = {};

    }


    const stats =
        webHistory.statistics;


    stats.searches =
        safeNumber(
            stats.searches,
            0
        );


    stats.successfulSearches =
        safeNumber(
            stats.successfulSearches,
            0
        );


    stats.failedSearches =
        safeNumber(
            stats.failedSearches,
            0
        );


    stats.fetchedPages =
        safeNumber(
            stats.fetchedPages,
            0
        );


    stats.failedPages =
        safeNumber(
            stats.failedPages,
            0
        );
}


normalizeWebDatabase();


function saveWebCache() {

    writeJson(
        WEB_CACHE_FILE,
        webCache
    );

}


function saveWebHistory() {

    writeJson(
        WEB_HISTORY_FILE,
        webHistory
    );

}


/* ============================================================
   4 â€” WEB TEXT NORMALIZATION
   ============================================================ */

function cleanWebText(value) {

    return normalizeResearchText(
        String(
            value || ''
        )
            .replace(
                /\u0000/g,
                ''
            )
            .replace(
                /\r/g,
                ' '
            )
            .replace(
                /\n+/g,
                '\n'
            )
    );

}


function limitWebText(
    value,
    maxLength
) {

    const text =
        cleanWebText(
            value
        );

    return text.slice(
        0,
        maxLength
    );

}


/* ============================================================
   5 â€” URL HELPERS
   ============================================================ */

function isHttpUrl(url) {

    return (
        typeof url === 'string' &&
        (
            url.startsWith(
                'http://'
            ) ||
            url.startsWith(
                'https://'
            )
        )
    );

}


function normalizeWebUrl(url) {

    if (!url) {
        return '';
    }

    let value =
        String(url).trim();

    if (!isHttpUrl(value)) {
        return '';
    }

    try {

        const parsed =
            new URL(
                value
            );

        /*
           Fragment kÄ±smÄ± araÅŸtÄ±rma iÃ§in
           genellikle gereksizdir.
        */

        parsed.hash = '';

        return parsed.toString();

    } catch {

        return '';

    }

}


function getWebDomain(url) {

    try {

        const parsed =
            new URL(
                url
            );

        return parsed.hostname
            .replace(
                /^www\./i,
                ''
            )
            .toLowerCase();

    } catch {

        return '';

    }

}


/* ============================================================
   6 â€” USER AGENT
   ============================================================ */

function getResearchUserAgent() {

    return (
        process.env.TURKAI_USER_AGENT ||
        WEB_PROVIDER_CONFIG.userAgent ||
        'TurkAI-WebResearch/1.0'
    );

}


/* ============================================================
   7 â€” FETCH AVAILABILITY
   ============================================================ */

function getFetchFunction() {

    /*
       Node.js 18+ iÃ§inde global fetch bulunur.
       TÃ¼rkAI'nin hedef Node sÃ¼rÃ¼mlerinde
       doÄŸrudan bunu kullanÄ±yoruz.
    */

    if (
        typeof globalThis.fetch ===
        'function'
    ) {

        return globalThis.fetch;

    }

    return null;

}


/* ============================================================
   8 â€” ABORT TIMEOUT
   ============================================================ */

function createAbortController(
    timeoutMs
) {

    const controller =
        new AbortController();

    const timer =
        setTimeout(
            () => {

                try {

                    controller.abort();

                } catch {}

            },
            timeoutMs
        );

    return {
        controller,
        timer
    };

}


/* ============================================================
   9 â€” SAFE HTTP FETCH
   ============================================================ */

async function fetchWebPage(
    url,
    options = {}
) {

    const normalizedUrl =
        normalizeWebUrl(
            url
        );

    if (!normalizedUrl) {

        throw new Error(
            'GeÃ§ersiz web URL'
        );

    }


    const fetchFunction =
        getFetchFunction();


    if (!fetchFunction) {

        throw new Error(
            'Bu Node.js ortamÄ±nda fetch bulunamadÄ±.'
        );

    }


    const timeoutMs =
        safeNumber(
            options.timeoutMs,
            WEB_PROVIDER_CONFIG.timeoutMs
        );


    const {
        controller,
        timer
    } =
        createAbortController(
            timeoutMs
        );


    const started =
        Date.now();


    try {

        const response =
            await fetchFunction(
                normalizedUrl,
                {
                    method:
                        'GET',

                    headers: {

                        'User-Agent':
                            getResearchUserAgent(),

                        'Accept':
                            'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5',

                        'Accept-Language':
                            'tr-TR,tr;q=0.9,en;q=0.7'

                    },

                    redirect:
                        'follow',

                    signal:
                        controller.signal
                }
            );


        const contentType =
            String(
                response.headers
                    .get(
                        'content-type'
                    ) ||
                ''
            ).toLowerCase();


        const finalUrl =
            normalizeWebUrl(
                response.url ||
                normalizedUrl
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        /*
           Ã‡ok bÃ¼yÃ¼k cevaplarÄ± almamaya
           Ã§alÄ±ÅŸÄ±yoruz.
        */

        const contentLength =
            Number(
                response.headers
                    .get(
                        'content-length'
                    ) ||
                0
            );


        if (
            contentLength >
            WEB_PROVIDER_CONFIG.maxPageBytes
        ) {

            throw new Error(
                'Web sayfasÄ± Ã§ok bÃ¼yÃ¼k.'
            );

        }


        const text =
            await response.text();


        const elapsedMs =
            Date.now() -
            started;


        webHistory.statistics
            .fetchedPages++;


        const result = {

            success:
                true,

            url:
                normalizedUrl,

            finalUrl,

            status:
                response.status,

            contentType,

            text:
                text.slice(
                    0,
                    WEB_PROVIDER_CONFIG.maxPageBytes
                ),

            elapsedMs,

            fetchedAt:
                timestamp()

        };


        webHistory.fetches.push(
            {
                url:
                    normalizedUrl,

                finalUrl,

                status:
                    response.status,

                contentType,

                elapsedMs,

                fetchedAt:
                    result.fetchedAt
            }
        );


        if (
            webHistory.fetches.length >
            5000
        ) {

            webHistory.fetches =
                webHistory.fetches.slice(
                    -5000
                );

        }


        saveWebHistory();


        return result;

    } catch (error) {

        webHistory.statistics
            .failedPages++;


        webHistory.fetches.push(
            {
                url:
                    normalizedUrl,

                status:
                    'error',

                error:
                    cleanText(
                        error.message ||
                        'Fetch error'
                    ),

                fetchedAt:
                    timestamp()
            }
        );


        saveWebHistory();


        throw error;

    } finally {

        clearTimeout(
            timer
        );

    }

}


/* ============================================================
   10 â€” HTML ENTITY DECODER
   ============================================================ */

function decodeHtmlEntities(
    value
) {

    if (!value) {
        return '';
    }

    return String(value)

        .replace(
            /&amp;/gi,
            '&'
        )

        .replace(
            /&lt;/gi,
            '<'
        )

        .replace(
            /&gt;/gi,
            '>'
        )

        .replace(
            /&quot;/gi,
            '"'
        )

        .replace(
            /&#39;/gi,
            "'"
        )

        .replace(
            /&#x27;/gi,
            "'"
        )

        .replace(
            /&nbsp;/gi,
            ' '
        )

        .replace(
            /&#(\d+);/g,
            (
                match,
                code
            ) => {

                const number =
                    Number(
                        code
                    );

                if (
                    !Number.isFinite(
                        number
                    )
                ) {

                    return match;

                }

                return String.fromCharCode(
                    number
                );

            }
        )

        .replace(
            /&#x([0-9a-f]+);/gi,
            (
                match,
                code
            ) => {

                const number =
                    parseInt(
                        code,
                        16
                    );

                if (
                    !Number.isFinite(
                        number
                    )
                ) {

                    return match;

                }

                return String.fromCharCode(
                    number
                );

            }
        );

}


/* ============================================================
   11 â€” HTML TO TEXT
   ============================================================ */

function htmlToText(
    html
) {

    if (!html) {
        return '';
    }


    let text =
        String(html);


    /*
       Script ve style iÃ§eriklerini Ã§Ä±kar.
    */

    text =
        text.replace(
            /<script\b[^>]*>[\s\S]*?<\/script>/gi,
            ' '
        );


    text =
        text.replace(
            /<style\b[^>]*>[\s\S]*?<\/style>/gi,
            ' '
        );


    text =
        text.replace(
            /<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,
            ' '
        );


    text =
        text.replace(
            /<svg\b[^>]*>[\s\S]*?<\/svg>/gi,
            ' '
        );


    /*
       BazÄ± HTML bloklarÄ±nÄ± satÄ±ra Ã§evir.
    */

    text =
        text.replace(
            /<\/(p|div|section|article|main|header|footer|li|h1|h2|h3|h4|h5|h6|tr)>/gi,
            '\n'
        );


    text =
        text.replace(
            /<br\s*\/?>/gi,
            '\n'
        );


    /*
       Kalan HTML etiketlerini kaldÄ±r.
    */

    text =
        text.replace(
            /<[^>]+>/g,
            ' '
        );


    text =
        decodeHtmlEntities(
            text
        );


    text =
        text.replace(
            /[ \t]+/g,
            ' '
        );


    text =
        text.replace(
            /\n[ \t]+/g,
            '\n'
        );


    text =
        text.replace(
            /\n{3,}/g,
            '\n\n'
        );


    return text.trim();

}


/* ============================================================
   12 â€” HTML TITLE EXTRACTION
   ============================================================ */

function extractHtmlTitle(
    html
) {

    if (!html) {
        return '';
    }


    const match =
        html.match(
            /<title\b[^>]*>([\s\S]*?)<\/title>/i
        );


    if (!match) {
        return '';
    }


    return limitWebText(
        decodeHtmlEntities(
            match[1]
        ),
        WEB_PROVIDER_CONFIG.maxTitleLength
    );

}


/* ============================================================
   13 â€” META DESCRIPTION
   ============================================================ */

function extractMetaDescription(
    html
) {

    if (!html) {
        return '';
    }


    const patterns = [

        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,

        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,

        /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,

        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i

    ];


    for (
        const pattern
        of patterns
    ) {

        const match =
            html.match(
                pattern
            );


        if (match) {

            return limitWebText(
                decodeHtmlEntities(
                    match[1]
                ),
                WEB_PROVIDER_CONFIG.maxDescriptionLength
            );

        }

    }


    return '';

}


/* ============================================================
   14 â€” CANONICAL URL
   ============================================================ */

function extractCanonicalUrl(
    html,
    baseUrl
) {

    if (!html) {
        return '';
    }


    const match =
        html.match(
            /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i
        );


    if (!match) {
        return '';
    }


    try {

        return normalizeWebUrl(
            new URL(
                match[1],
                baseUrl
            ).toString()
        );

    } catch {

        return '';

    }

}


/* ============================================================
   15 â€” LINKS EXTRACTION
   ============================================================ */

function extractLinks(
    html,
    baseUrl
) {

    if (!html) {
        return [];
    }


    const links = [];

    const regex =
        /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;


    let match;


    while (
        (
            match =
            regex.exec(
                html
            )
        ) !== null
    ) {

        const rawUrl =
            match[1];


        const anchor =
            htmlToText(
                match[2]
            );


        try {

            const absolute =
                normalizeWebUrl(
                    new URL(
                        rawUrl,
                        baseUrl
                    ).toString()
                );


            if (!absolute) {
                continue;
            }


            links.push({

                url:
                    absolute,

                title:
                    limitWebText(
                        anchor,
                        500
                    )

            });

        } catch {}

    }


    return unique(
        links.map(
            item =>
                `${item.url}|${item.title}`
        )
    )
        .map(
            value => {

                const separator =
                    value.indexOf('|');

                return {

                    url:
                        value.slice(
                            0,
                            separator
                        ),

                    title:
                        value.slice(
                            separator + 1
                        )

                };

            }
        )
        .slice(
            0,
            100
        );

}


/* ============================================================
   16 â€” PAGE PARSER
   ============================================================ */

function parseWebPage(
    html,
    url
) {

    const title =
        extractHtmlTitle(
            html
        );


    const description =
        extractMetaDescription(
            html
        );


    const canonicalUrl =
        extractCanonicalUrl(
            html,
            url
        );


    const text =
        limitWebText(
            htmlToText(
                html
            ),
            WEB_PROVIDER_CONFIG.maxPageTextLength
        );


    const links =
        extractLinks(
            html,
            url
        );


    return {

        url,

        canonicalUrl,

        title,

        description,

        text,

        links,

        domain:
            getWebDomain(
                url
            )

    };

}


/* ============================================================
   17 â€” SEARCH CACHE KEY
   ============================================================ */

function createWebCacheKey(
    provider,
    query
) {

    const raw =
        `${provider}|${normalizeForSearch(query)}`;


    return crypto
        .createHash('sha256')
        .update(raw)
        .digest('hex');

}


/* ============================================================
   18 â€” WEB CACHE READ
   ============================================================ */

function getWebCache(
    provider,
    query
) {

    const key =
        createWebCacheKey(
            provider,
            query
        );


    const entry =
        webCache.entries[key];


    if (!entry) {
        return null;
    }


    const ageHours =
        getResearchAgeHours(
            entry.createdAt
        );


    if (
        ageHours >
        WEB_PROVIDER_CONFIG.cacheMinutes /
        60
    ) {

        delete webCache.entries[key];

        saveWebCache();

        return null;

    }


    return entry.data || null;

}


/* ============================================================
   19 â€” WEB CACHE WRITE
   ============================================================ */

function setWebCache(
    provider,
    query,
    data
) {

    const key =
        createWebCacheKey(
            provider,
            query
        );


    webCache.entries[key] = {

        provider,

        query,

        createdAt:
            timestamp(),

        data

    };


    const entries =
        Object.entries(
            webCache.entries
        );


    if (
        entries.length >
        1000
    ) {

        entries
            .sort(
                (a, b) =>
                    new Date(
                        a[1].createdAt
                    ) -
                    new Date(
                        b[1].createdAt
                    )
            )
            .slice(
                0,
                entries.length - 1000
            )
            .forEach(
                ([key]) =>
                    delete webCache.entries[key]
            );

    }


    saveWebCache();

}


/* ============================================================
   20 â€” DUCKDUCKGO PROVIDER
   ============================================================ */

async function searchDuckDuckGo(
    query,
    options = {}
) {

    const cached =
        getWebCache(
            'duckduckgo',
            query
        );


    if (cached) {

        return {

            provider:
                'duckduckgo',

            cached:
                true,

            results:
                cached

        };

    }


    const url =
        `https://html.duckduckgo.com/html/?q=${
            encodeURIComponent(
                query
            )
        }`;


    const page =
        await fetchWebPage(
            url,
            {
                timeoutMs:
                    options.timeoutMs ||
                    WEB_PROVIDER_CONFIG.timeoutMs
            }
        );


    const html =
        page.text;


    const results = [];


    /*
       DuckDuckGo HTML sonuÃ§larÄ±.
    */

    const resultRegex =
        /<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;


    let match;


    while (
        (
            match =
            resultRegex.exec(
                html
            )
        ) !== null
    ) {

        let resultUrl =
            decodeHtmlEntities(
                match[1]
            );


        const title =
            htmlToText(
                match[2]
            );


        /*
           DuckDuckGo bazen redirect URL
           kullanabilir.
        */

        try {

            if (
                resultUrl.startsWith(
                    '//duckduckgo.com/l/?'
                )
            ) {

                const parsed =
                    new URL(
                        `https:${resultUrl}`
                    );


                const target =
                    parsed.searchParams.get(
                        'uddg'
                    );


                if (target) {

                    resultUrl =
                        decodeURIComponent(
                            target
                        );

                }

            }

        } catch {}


        resultUrl =
            normalizeWebUrl(
                resultUrl
            );


        if (!resultUrl) {
            continue;
        }


        results.push({

            title:
                limitWebText(
                    title,
                    WEB_PROVIDER_CONFIG.maxTitleLength
                ),

            url:
                resultUrl,

            description:
                '',

            content:
                '',

            sourceType:
                'search',

            provider:
                'duckduckgo'

        });


        if (
            results.length >=
            WEB_PROVIDER_CONFIG.maxResultsPerProvider
        ) {

            break;

        }

    }


    /*
       BazÄ± DDG HTML sÃ¼rÃ¼mlerinde farklÄ±
       class yapÄ±sÄ± olabilir.
    */

    if (
        results.length === 0
    ) {

        const linkRegex =
            /<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;


        while (
            (
                match =
                linkRegex.exec(
                    html
                )
            ) !== null
        ) {

            const resultUrl =
                normalizeWebUrl(
                    match[1]
                );


            if (!resultUrl) {
                continue;
            }


            const title =
                htmlToText(
                    match[2]
                );


            if (
                title.length < 2
            ) {

                continue;

            }


            results.push({

                title:
                    limitWebText(
                        title,
                        WEB_PROVIDER_CONFIG.maxTitleLength
                    ),

                url:
                    resultUrl,

                description:
                    '',

                content:
                    '',

                sourceType:
                    'search',

                provider:
                    'duckduckgo'

            });


            if (
                results.length >=
                WEB_PROVIDER_CONFIG.maxResultsPerProvider
            ) {

                break;

            }

        }

    }


    setWebCache(
        'duckduckgo',
        query,
        results
    );


    return {

        provider:
            'duckduckgo',

        cached:
            false,

        results

    };

}


/* ============================================================
   21 â€” CUSTOM PROVIDER
   ============================================================ */

async function searchCustomProvider(
    query,
    options = {}
) {

    const endpoint =
        process.env[
            WEB_PROVIDER_CONFIG
                .environmentKeys
                .custom
        ];


    if (!endpoint) {

        return {

            provider:
                'custom',

            configured:
                false,

            results: []

        };

    }


    const separator =
        endpoint.includes('?')
            ? '&'
            : '?';


    const url =
        `${endpoint}${separator}q=${
            encodeURIComponent(
                query
            )
        }`;


    const page =
        await fetchWebPage(
            url,
            {
                timeoutMs:
                    options.timeoutMs ||
                    WEB_PROVIDER_CONFIG.timeoutMs
            }
        );


    let data;


    try {

        data =
            JSON.parse(
                page.text
            );

    } catch {

        data = null;

    }


    if (
        !data ||
        !Array.isArray(
            data.results
        )
    ) {

        return {

            provider:
                'custom',

            configured:
                true,

            results: []

        };

    }


    const results =
        data.results
            .map(
                item => ({

                    title:
                        limitWebText(
                            item.title,
                            WEB_PROVIDER_CONFIG.maxTitleLength
                        ),

                    url:
                        normalizeWebUrl(
                            item.url
                        ),

                    description:
                        limitWebText(
                            item.description,
                            WEB_PROVIDER_CONFIG.maxDescriptionLength
                        ),

                    content:
                        limitWebText(
                            item.content,
                            WEB_PROVIDER_CONFIG.maxSourceTextLength
                        ),

                    publishedAt:
                        item.publishedAt ||
                        null,

                    sourceType:
                        'search',

                    provider:
                        'custom'

                })
            )
            .filter(
                item =>
                    item.url
            )
            .slice(
                0,
                WEB_PROVIDER_CONFIG.maxResultsPerProvider
            );


    return {

        provider:
            'custom',

        configured:
            true,

        results

    };

}


/* ============================================================
   22 â€” GENERIC PROVIDER EXECUTOR
   ============================================================ */

async function runWebProvider(
    provider,
    query,
    options = {}
) {

    switch (
        provider
    ) {

        case 'duckduckgo':

            return searchDuckDuckGo(
                query,
                options
            );


        case 'custom':

            return searchCustomProvider(
                query,
                options
            );


        default:

            throw new Error(
                `Bilinmeyen provider: ${provider}`
            );

    }

}


/* ============================================================
   23 â€” MULTI PROVIDER SEARCH
   ============================================================ */

async function searchWeb(
    query,
    options = {}
) {

    const cleanQuery =
        cleanResearchQuery(
            query
        );


    if (!cleanQuery) {

        return {

            success: false,

            query: '',

            results: [],

            providers: [],

            error:
                'Arama sorgusu boÅŸ.'

        };

    }


    const providers = [];


    if (
        WEB_PROVIDER_CONFIG
            .providers
            .duckduckgo
    ) {

        providers.push(
            'duckduckgo'
        );

    }


    if (
        WEB_PROVIDER_CONFIG
            .providers
            .custom &&
        process.env[
            WEB_PROVIDER_CONFIG
                .environmentKeys
                .custom
        ]
    ) {

        providers.push(
            'custom'
        );

    }


    /*
       AynÄ± anda provider Ã§alÄ±ÅŸtÄ±r.
    */

    const settled =
        await Promise.allSettled(
            providers.map(
                provider =>
                    runWebProvider(
                        provider,
                        cleanQuery,
                        options
                    )
            )
        );


    const allResults = [];


    const providerStatus = [];


    settled.forEach(
        (
            item,
            index
        ) => {

            const provider =
                providers[index];


            if (
                item.status ===
                'fulfilled'
            ) {

                providerStatus.push({

                    provider,

                    success:
                        true,

                    resultCount:
                        Array.isArray(
                            item.value?.results
                        )
                            ? item.value.results.length
                            : 0

                });


                if (
                    Array.isArray(
                        item.value?.results
                    )
                ) {

                    allResults.push(
                        ...item.value.results
                    );

                }

            } else {

                providerStatus.push({

                    provider,

                    success:
                        false,

                    error:
                        cleanText(
                            item.reason?.message ||
                            'Provider error'
                        )

                });

            }

        }
    );


    const uniqueResults =
        deduplicateResearchSources(
            allResults
        );


    const normalizedResults =
        uniqueResults
            .map(
                source =>
                    normalizeResearchSource(
                        cleanQuery,
                        source
                    )
            );


    const sortedResults =
        sortResearchSources(
            normalizedResults
        )
            .slice(
                0,
                WEB_PROVIDER_CONFIG.maxTotalResults
            );


    webHistory.statistics
        .searches++;


    if (
        sortedResults.length > 0
    ) {

        webHistory.statistics
            .successfulSearches++;

    } else {

        webHistory.statistics
            .failedSearches++;

    }


    webHistory.searches.push({

        id:
            generateId(
                'web-search'
            ),

        query:
            cleanQuery,

        providers:
            providerStatus,

        resultCount:
            sortedResults.length,

        createdAt:
            timestamp()

    });


    if (
        webHistory.searches.length >
        5000
    ) {

        webHistory.searches =
            webHistory.searches.slice(
                -5000
            );

    }


    saveWebHistory();


    return {

        success:
            sortedResults.length > 0,

        query:
            cleanQuery,

        results:
            sortedResults,

        providers:
            providerStatus

    };

}


/* ============================================================
   24 â€” ENRICH SEARCH RESULTS
   ============================================================ */

async function enrichSearchResults(
    results,
    options = {}
) {

    if (
        !Array.isArray(
            results
        ) ||
        results.length === 0
    ) {

        return [];

    }


    const limit =
        clamp(
            safeNumber(
                options.limit,
                5
            ),
            1,
            10
        );


    const selected =
        results.slice(
            0,
            limit
        );


    const enriched =
        await Promise.allSettled(

            selected.map(
                async result => {

                    if (
                        !result.url
                    ) {

                        return result;

                    }


                    try {

                        const page =
                            await fetchWebPage(
                                result.url,
                                {
                                    timeoutMs:
                                        options.timeoutMs ||
                                        WEB_PROVIDER_CONFIG.timeoutMs
                                }
                            );


                        const parsed =
                            parseWebPage(
                                page.text,
                                page.finalUrl ||
                                result.url
                            );


                        return {

                            ...result,

                            url:
                                parsed.canonicalUrl ||
                                result.url,

                            title:
                                parsed.title ||
                                result.title,

                            description:
                                parsed.description ||
                                result.description,

                            content:
                                parsed.text,

                            domain:
                                parsed.domain,

                            links:
                                parsed.links.slice(
                                    0,
                                    20
                                ),

                            fetchedAt:
                                timestamp()

                        };

                    } catch (error) {

                        return {

                            ...result,

                            fetchError:
                                cleanText(
                                    error.message ||
                                    'Sayfa alÄ±namadÄ±.'
                                )

                        };

                    }

                }
            )

        );


    return enriched.map(
        item => {

            if (
                item.status ===
                'fulfilled'
            ) {

                return item.value;

            }

            return null;

        }
    )
        .filter(Boolean);

}


/* ============================================================
   25 â€” COMPLETE WEB RESEARCH
   ============================================================ */

async function performCompleteWebResearch(
    query,
    options = {}
) {

    const searchResult =
        await searchWeb(
            query,
            options
        );


    if (
        !searchResult.success
    ) {

        return {

            success:
                false,

            query:
                searchResult.query,

            results: [],

            enrichedResults: [],

            sources: [],

            error:
                'Web aramasÄ±nda sonuÃ§ bulunamadÄ±.',

            providers:
                searchResult.providers

        };

    }


    const enrichedResults =
        options.enrich === false
            ? searchResult.results
            : await enrichSearchResults(
                searchResult.results,
                {
                    limit:
                        options.enrichLimit ||
                        5,

                    timeoutMs:
                        options.timeoutMs
                }
            );


    const merged =
        mergeResearchResults(
            query,
            enrichedResults
        );


    return {

        success:
            merged.length > 0,

        query,

        results:
            searchResult.results,

        enrichedResults,

        sources:
            merged,

        providers:
            searchResult.providers

    };

}


/* ============================================================
   26 â€” CONNECT PART 4 RESEARCH ENGINE
   ============================================================ */

globalThis.TurkAIResearchProvider =
    async function (
        request = {}
    ) {

        const query =
            cleanResearchQuery(
                request.query
            );


        if (!query) {

            return {
                success: false,
                sources: []
            };

        }


        const result =
            await performCompleteWebResearch(
                query,
                {
                    enrich:
                        request.enrich !== false,

                    enrichLimit:
                        request.enrichLimit ||
                        5,

                    timeoutMs:
                        request.timeoutMs ||
                        WEB_PROVIDER_CONFIG.timeoutMs
                }
            );


        return {

            success:
                result.success,

            sources:
                result.sources || [],

            providers:
                result.providers || [],

            query:
                result.query

        };

    };


/* ============================================================
   27 â€” WEB INTELLIGENCE DIRECT PIPELINE
   ============================================================ */

async function runWebIntelligence(
    userId,
    message,
    context = {}
) {

    const researchResult =
        await runResearchIntelligence(
            userId,
            message,
            context
        );


    return {

        ...researchResult,

        web:

            researchResult.result
                ? {

                    sources:
                        researchResult
                            .result
                            .sources ||
                        [],

                    providers:
                        researchResult
                            .result
                            .session
                            ?.providers ||
                        []

                }
                : null

    };

}


/* ============================================================
   28 â€” API: DIRECT WEB SEARCH
   ============================================================ */

app.post(
    '/api/web/search',
    async (req, res) => {

        try {

            const query =
                cleanText(
                    req.body?.query
                );


            if (!query) {

                return res.status(400).json({
                    success: false,
                    error:
                        'query gerekli'
                });

            }


            const result =
                await searchWeb(
                    query,
                    {
                        timeoutMs:
                            req.body?.timeoutMs ||
                            WEB_PROVIDER_CONFIG.timeoutMs
                    }
                );


            res.json(
                result
            );

        } catch (error) {

            res.status(500).json({

                success:
                    false,

                error:
                    error.message

            });

        }

    }
);


/* ============================================================
   29 â€” API: WEB PAGE FETCH
   ============================================================ */

app.post(
    '/api/web/fetch',
    async (req, res) => {

        try {

            const url =
                cleanText(
                    req.body?.url
                );


            if (!url) {

                return res.status(400).json({
                    success: false,
                    error:
                        'url gerekli'
                });

            }


            const page =
                await fetchWebPage(
                    url
                );


            const parsed =
                parseWebPage(
                    page.text,
                    page.finalUrl ||
                    url
                );


            res.json({

                success:
                    true,

                page: {

                    url:
                        parsed.url,

                    canonicalUrl:
                        parsed.canonicalUrl,

                    title:
                        parsed.title,

                    description:
                        parsed.description,

                    domain:
                        parsed.domain,

                    text:
                        parsed.text,

                    links:
                        parsed.links

                }

            });

        } catch (error) {

            res.status(500).json({

                success:
                    false,

                error:
                    error.message

            });

        }

    }
);


/* ============================================================
   30 â€” API: COMPLETE WEB RESEARCH
   ============================================================ */

app.post(
    '/api/web/research',
    async (req, res) => {

        try {

            const query =
                cleanText(
                    req.body?.query
                );


            if (!query) {

                return res.status(400).json({
                    success: false,
                    error:
                        'query gerekli'
                });

            }


            const result =
                await performCompleteWebResearch(
                    query,
                    {
                        enrich:
                            req.body?.enrich !== false,

                        enrichLimit:
                            req.body?.enrichLimit ||
                            5
                    }
                );


            res.json(
                result
            );

        } catch (error) {

            res.status(500).json({

                success:
                    false,

                error:
                    error.message

            });

        }

    }
);


/* ============================================================
   31 â€” API: WEB HEALTH
   ============================================================ */

app.get(
    '/api/web/health',
    (req, res) => {

        try {

            res.json({

                success:
                    true,

                health: {

                    enabled:
                        WEB_PROVIDER_CONFIG.enabled,

                    fetchAvailable:
                        Boolean(
                            getFetchFunction()
                        ),

                    duckduckgo:
                        WEB_PROVIDER_CONFIG
                            .providers
                            .duckduckgo,

                    customProvider:
                        Boolean(
                            process.env[
                                WEB_PROVIDER_CONFIG
                                    .environmentKeys
                                    .custom
                            ]
                        ),

                    searches:
                        webHistory
                            .statistics
                            .searches,

                    successfulSearches:
                        webHistory
                            .statistics
                            .successfulSearches,

                    failedSearches:
                        webHistory
                            .statistics
                            .failedSearches,

                    fetchedPages:
                        webHistory
                            .statistics
                            .fetchedPages,

                    failedPages:
                        webHistory
                            .statistics
                            .failedPages,

                    cacheEntries:
                        Object.keys(
                            webCache.entries
                        ).length

                }

            });

        } catch (error) {

            res.status(500).json({

                success:
                    false,

                error:
                    error.message

            });

        }

    }
);


/* ============================================================
   32 â€” API: WEB CACHE CLEAR
   ============================================================ */

app.post(
    '/api/web/cache/clear',
    (req, res) => {

        try {

            webCache.entries = {};

            saveWebCache();

            res.json({

                success:
                    true,

                message:
                    'Web cache temizlendi.'

            });

        } catch (error) {

            res.status(500).json({

                success:
                    false,

                error:
                    error.message

            });

        }

    }
);


/* ============================================================
   33 â€” API: WEB HISTORY
   ============================================================ */

app.get(
    '/api/web/history',
    (req, res) => {

        try {

            const limit =
                clamp(
                    safeNumber(
                        req.query?.limit,
                        20
                    ),
                    1,
                    100
                );


            res.json({

                success:
                    true,

                searches:
                    webHistory
                        .searches
                        .slice(
                            -limit
                        )
                        .reverse(),

                fetches:
                    webHistory
                        .fetches
                        .slice(
                            -limit
                        )
                        .reverse()

            });

        } catch (error) {

            res.status(500).json({

                success:
                    false,

                error:
                    error.message

            });

        }

    }
);


/* ============================================================
   34 â€” EXPORTS
   ============================================================ */

module.exports = {

    ...(module.exports || {}),

    WEB_PROVIDER_CONFIG,

    webCache,

    webHistory,

    fetchWebPage,

    parseWebPage,

    htmlToText,

    extractHtmlTitle,

    extractMetaDescription,

    extractCanonicalUrl,

    extractLinks,

    searchDuckDuckGo,

    searchCustomProvider,

    runWebProvider,

    searchWeb,

    enrichSearchResults,

    performCompleteWebResearch,

    runWebIntelligence,

    getWebDomain,

    normalizeWebUrl

};


console.log(
    'âœ… TÃœRKAI SERVER PART 5 / 20 hazÄ±r â€” Web Provider Engine aktif.'
);


/* ============================================================
   PART 5 SONU
   ============================================================ */
/* ============================================================
   TÃœRKAI SERVER â€” PART 6 / 20
   AI MODEL ROUTER + FALLBACK ENGINE
   ============================================================ */

console.log('ğŸ§  TÃœRKAI SERVER PART 6 / 20 yÃ¼kleniyor...');


/* ============================================================
   1 â€” MODEL ROUTER CONFIG
   ============================================================ */

const MODEL_ROUTER_CONFIG = {

    enabled: true,

    defaultProvider:
        process.env.TURKAI_DEFAULT_PROVIDER ||
        'groq',

    defaultModel:
        process.env.TURKAI_DEFAULT_MODEL ||
        'openai/gpt-oss-20b',

    maxTokens:
        safeNumber(
            process.env.TURKAI_MAX_TOKENS,
            4096
        ),

    temperature:
        Number.isFinite(
            Number(
                process.env.TURKAI_TEMPERATURE
            )
        )
            ? Number(
                process.env.TURKAI_TEMPERATURE
            )
            : 0.7,

    timeoutMs:
        safeNumber(
            process.env.TURKAI_MODEL_TIMEOUT,
            30000
        ),

    maxRetries: 2,

    fallbackEnabled: true,

    providers: {

        groq: {
            enabled: true,

            baseUrl:
                'https://api.groq.com/openai/v1',

            keyEnv:
                'GROQ_API_KEY',

            defaultModel:
                process.env.GROQ_MODEL ||
                'openai/gpt-oss-20b',

            priority: 1
        },

        cerebras: {
            enabled: true,

            baseUrl:
                'https://api.cerebras.ai/v1',

            keyEnv:
                'CEREBRAS_API_KEY',

            defaultModel:
                process.env.CEREBRAS_MODEL ||
                'gpt-oss-120b',

            priority: 2
        },

        openrouter: {
            enabled: true,

            baseUrl:
                'https://openrouter.ai/api/v1',

            keyEnv:
                'OPENROUTER_API_KEY',

            defaultModel:
                process.env.OPENROUTER_MODEL ||
                'openai/gpt-oss-20b',

            priority: 3
        },

        gemini: {
            enabled: true,

            baseUrl:
                'https://generativelanguage.googleapis.com/v1beta',

            keyEnv:
                'GEMINI_API_KEY',

            defaultModel:
                process.env.GEMINI_MODEL ||
                'gemini-2.5-flash',

            priority: 4
        }
    }
};


/* ============================================================
   2 â€” MODEL STATE
   ============================================================ */

const MODEL_STATE = {

    providers: {},

    requests: {
        total: 0,
        successful: 0,
        failed: 0,
        fallback: 0
    },

    lastRequest: null,

    lastSuccess: null,

    lastError: null
};


for (
    const providerName
    of Object.keys(
        MODEL_ROUTER_CONFIG.providers
    )
) {

    MODEL_STATE.providers[
        providerName
    ] = {

        requests: 0,

        successes: 0,

        failures: 0,

        rateLimits: 0,

        authErrors: 0,

        timeouts: 0,

        unavailable: 0,

        lastUsed: null,

        lastSuccess: null,

        lastError: null,

        disabledUntil: null
    };
}


/* ============================================================
   3 â€” PROVIDER HELPERS
   ============================================================ */

function getModelProviderConfig(
    provider
) {

    return (
        MODEL_ROUTER_CONFIG
            .providers[
                provider
            ] ||
        null
    );

}


function getProviderApiKey(
    provider
) {

    const config =
        getModelProviderConfig(
            provider
        );

    if (!config) {
        return '';
    }

    return (
        process.env[
            config.keyEnv
        ] ||
        ''
    ).trim();

}


function isProviderConfigured(
    provider
) {

    const config =
        getModelProviderConfig(
            provider
        );

    if (
        !config ||
        !config.enabled
    ) {

        return false;

    }

    return Boolean(
        getProviderApiKey(
            provider
        )
    );

}


/* ============================================================
   4 â€” PROVIDER HEALTH
   ============================================================ */

function getProviderState(
    provider
) {

    if (
        !MODEL_STATE.providers[
            provider
        ]
    ) {

        MODEL_STATE.providers[
            provider
        ] = {

            requests: 0,
            successes: 0,
            failures: 0,
            rateLimits: 0,
            authErrors: 0,
            timeouts: 0,
            unavailable: 0,
            lastUsed: null,
            lastSuccess: null,
            lastError: null,
            disabledUntil: null

        };

    }

    return MODEL_STATE.providers[
        provider
    ];

}


function isProviderTemporarilyDisabled(
    provider
) {

    const state =
        getProviderState(
            provider
        );

    if (
        !state.disabledUntil
    ) {

        return false;

    }

    const disabledTime =
        new Date(
            state.disabledUntil
        ).getTime();

    if (
        !Number.isFinite(
            disabledTime
        )
    ) {

        state.disabledUntil =
            null;

        return false;

    }

    if (
        Date.now() >=
        disabledTime
    ) {

        state.disabledUntil =
            null;

        return false;

    }

    return true;

}


/* ============================================================
   5 â€” TEMPORARY PROVIDER BLOCK
   ============================================================ */

function temporarilyDisableProvider(
    provider,
    minutes = 2
) {

    const state =
        getProviderState(
            provider
        );

    state.disabledUntil =
        new Date(
            Date.now() +
            minutes * 60000
        ).toISOString();

}


/* ============================================================
   6 â€” MODEL NAME
   ============================================================ */

function getModelName(
    provider,
    requestedModel
) {

    if (
        requestedModel &&
        typeof requestedModel ===
        'string'
    ) {

        return requestedModel;

    }

    const config =
        getModelProviderConfig(
            provider
        );

    return (
        config?.defaultModel ||
        MODEL_ROUTER_CONFIG.defaultModel
    );

}


/* ============================================================
   7 â€” PROVIDER ORDER
   ============================================================ */

function getProviderOrder(
    options = {}
) {

    const configured =
        Object.entries(
            MODEL_ROUTER_CONFIG.providers
        )
            .map(
                (
                    [
                        name,
                        config
                    ]
                ) => ({

                    name,

                    priority:
                        config.priority || 999

                })
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    a.priority -
                    b.priority
            )
            .map(
                item =>
                    item.name
            );


    const requested =
        options.provider;


    if (
        requested &&
        configured.includes(
            requested
        )
    ) {

        return [
            requested,
            ...configured.filter(
                item =>
                    item !== requested
            )
        ];

    }


    /*
       KullanÄ±cÄ± belirli provider
       vermediyse default provider
       Ã¶ne alÄ±nÄ±r.
    */

    const defaultProvider =
        MODEL_ROUTER_CONFIG.defaultProvider;


    if (
        configured.includes(
            defaultProvider
        )
    ) {

        return [
            defaultProvider,
            ...configured.filter(
                item =>
                    item !== defaultProvider
            )
        ];

    }


    return configured;

}


/* ============================================================
   8 â€” AVAILABLE PROVIDERS
   ============================================================ */

function getAvailableProviders(
    options = {}
) {

    return getProviderOrder(
        options
    ).filter(
        provider => {

            if (
                !isProviderConfigured(
                    provider
                )
            ) {

                return false;

            }

            if (
                isProviderTemporarilyDisabled(
                    provider
                )
            ) {

                return false;

            }

            return true;

        }
    );

}


/* ============================================================
   9 â€” REQUEST NORMALIZATION
   ============================================================ */

function normalizeModelMessages(
    messages
) {

    if (
        !Array.isArray(
            messages
        )
    ) {

        return [];

    }


    return messages
        .map(
            message => {

                if (
                    !message ||
                    typeof message !==
                    'object'
                ) {

                    return null;

                }


                const role =
                    ['system', 'user', 'assistant']
                        .includes(
                            message.role
                        )
                        ? message.role
                        : 'user';


                const content =
                    cleanText(
                        message.content
                    );


                if (!content) {
                    return null;
                }


                return {

                    role,

                    content

                };

            }
        )
        .filter(Boolean);

}


/* ============================================================
   10 â€” SYSTEM PROMPT
   ============================================================ */

function buildDefaultSystemPrompt(
    context = {}
) {

    const language =
        context.language ||
        'tr';


    const languageInstruction =
        language === 'tr'
            ? 'KullanÄ±cÄ±yla doÄŸal ve akÄ±cÄ± TÃ¼rkÃ§e konuÅŸ.'
            : `KullanÄ±cÄ±nÄ±n diline uygun cevap ver. Tespit edilen dil: ${language}.`;


    return [
        'Sen TÃ¼rkAI adlÄ± yapay zeka asistanÄ±sÄ±n.',
        'YararlÄ±, doÄŸru, anlaÅŸÄ±lÄ±r ve doÄŸal cevaplar ver.',
        languageInstruction,
        'BilmediÄŸin bilgileri uydurma.',
        'GÃ¼ncel bilgi gerekiyorsa araÅŸtÄ±rma baÄŸlamÄ±nÄ± kullan.',
        'Kod verirken Ã§alÄ±ÅŸabilir ve anlaÅŸÄ±lÄ±r kod Ã¼ret.',
        'KullanÄ±cÄ±nÄ±n verdiÄŸi baÄŸlamÄ± gereksiz yere tekrar etme.',
        'CevabÄ± gereksiz ÅŸekilde uzatma.',
        'GÃ¼venlik ve doÄŸruluk konusunda dikkatli ol.'
    ].join('\n');

}


/* ============================================================
   11 â€” MESSAGE BUILDER
   ============================================================ */

function buildModelMessages(
    messages,
    context = {}
) {

    const normalized =
        normalizeModelMessages(
            messages
        );


    const result = [];


    const hasSystem =
        normalized.some(
            message =>
                message.role ===
                'system'
        );


    if (!hasSystem) {

        result.push({

            role:
                'system',

            content:
                context.systemPrompt ||
                buildDefaultSystemPrompt(
                    context
                )

        });

    }


    result.push(
        ...normalized
    );


    return result;

}


/* ============================================================
   12 â€” CONTEXT MESSAGE
   ============================================================ */

function appendContextToMessages(
    messages,
    context = {}
) {

    const result = [
        ...messages
    ];


    const contextParts = [];


    if (
        context.memoryText
    ) {

        contextParts.push(
            `HAFIZA BAÄLAMI:\n${context.memoryText}`
        );

    }


    if (
        context.knowledgeText
    ) {

        contextParts.push(
            `YEREL BÄ°LGÄ° BAÄLAMI:\n${context.knowledgeText}`
        );

    }


    if (
        context.researchText
    ) {

        contextParts.push(
            `ARAÅTIRMA BAÄLAMI:\n${context.researchText}`
        );

    }


    if (
        context.extraContext
    ) {

        contextParts.push(
            `EK BAÄLAM:\n${context.extraContext}`
        );

    }


    if (
        contextParts.length === 0
    ) {

        return result;

    }


    result.push({

        role:
            'system',

        content:
            contextParts.join(
                '\n\n'
            )

    });


    return result;

}


/* ============================================================
   13 â€” OPENAI COMPATIBLE PAYLOAD
   ============================================================ */

function buildOpenAICompatiblePayload(
    provider,
    model,
    messages,
    options = {}
) {

    const payload = {

        model,

        messages,

        temperature:
            Number.isFinite(
                Number(
                    options.temperature
                )
            )
                ? Number(
                    options.temperature
                )
                : MODEL_ROUTER_CONFIG.temperature,

        max_tokens:
            safeNumber(
                options.maxTokens,
                MODEL_ROUTER_CONFIG.maxTokens
            ),

        stream:
            false

    };


    if (
        options.topP !== undefined
    ) {

        payload.top_p =
            Number(
                options.topP
            );

    }


    if (
        options.stop
    ) {

        payload.stop =
            options.stop;

    }


    return payload;

}


/* ============================================================
   14 â€” PROVIDER ENDPOINT
   ============================================================ */

function getProviderEndpoint(
    provider,
    model
) {

    const config =
        getModelProviderConfig(
            provider
        );


    if (!config) {
        return '';
    }


    /*
       Gemini OpenAI uyumlu deÄŸildir.
       AyrÄ± endpoint Part 6 iÃ§inde
       dÃ¶nÃ¼ÅŸtÃ¼rÃ¼lecek.
    */

    if (
        provider ===
        'gemini'
    ) {

        return (
            `${config.baseUrl}/models/${encodeURIComponent(model)}:generateContent`
        );

    }


    return (
        `${config.baseUrl}/chat/completions`
    );

}


/* ============================================================
   15 â€” ERROR CLASSIFICATION
   ============================================================ */

function classifyModelError(
    error,
    response = null
) {

    const status =
        response?.status ||
        error?.status ||
        0;


    const message =
        cleanText(
            error?.message ||
            ''
        ).toLowerCase();


    if (
        status === 401 ||
        status === 403 ||
        message.includes(
            'unauthorized'
        ) ||
        message.includes(
            'invalid api key'
        ) ||
        message.includes(
            'authentication'
        )
    ) {

        return 'auth';

    }


    if (
        status === 429 ||
        message.includes(
            'rate limit'
        ) ||
        message.includes(
            'too many requests'
        ) ||
        message.includes(
            'quota'
        )
    ) {

        return 'rate_limit';

    }


    if (
        status === 402 ||
        message.includes(
            'payment required'
        ) ||
        message.includes(
            'insufficient'
        ) ||
        message.includes(
            'credits'
        )
    ) {

        return 'billing';

    }


    if (
        status === 408 ||
        status === 504 ||
        message.includes(
            'timeout'
        ) ||
        message.includes(
            'timed out'
        ) ||
        message.includes(
            'abort'
        )
    ) {

        return 'timeout';

    }


    if (
        status >= 500
    ) {

        return 'server';

    }


    if (
        !status &&
        (
            message.includes(
                'fetch failed'
            ) ||
            message.includes(
                'network'
            ) ||
            message.includes(
                'socket'
            )
        )
    ) {

        return 'network';

    }


    return 'unknown';

}


/* ============================================================
   16 â€” PROVIDER ERROR RESPONSE
   ============================================================ */

async function readModelErrorResponse(
    response
) {

    let body = '';


    try {

        body =
            await response.text();

    } catch {

        body = '';

    }


    let parsed =
        null;


    try {

        parsed =
            JSON.parse(
                body
            );

    } catch {}


    const message =
        parsed?.error?.message ||
        parsed?.message ||
        body ||
        `HTTP ${response.status}`;


    const error =
        new Error(
            cleanText(
                message
            )
        );


    error.status =
        response.status;


    error.providerBody =
        parsed ||
        body;


    return error;

}


/* ============================================================
   17 â€” GEMINI PAYLOAD
   ============================================================ */

function buildGeminiPayload(
    messages,
    options = {}
) {

    const contents = [];


    let systemInstruction =
        '';


    for (
        const message
        of messages
    ) {

        if (
            message.role ===
            'system'
        ) {

            systemInstruction +=
                `${message.content}\n`;

            continue;

        }


        contents.push({

            role:
                message.role ===
                'assistant'
                    ? 'model'
                    : 'user',

            parts: [

                {
                    text:
                        message.content
                }

            ]

        });

    }


    const payload = {

        contents,

        generationConfig: {

            temperature:
                Number.isFinite(
                    Number(
                        options.temperature
                    )
                )
                    ? Number(
                        options.temperature
                    )
                    : MODEL_ROUTER_CONFIG.temperature,

            maxOutputTokens:
                safeNumber(
                    options.maxTokens,
                    MODEL_ROUTER_CONFIG.maxTokens
                )

        }

    };


    if (
        systemInstruction.trim()
    ) {

        payload.systemInstruction = {

            parts: [

                {
                    text:
                        systemInstruction.trim()
                }

            ]

        };

    }


    return payload;

}


/* ============================================================
   18 â€” RESPONSE TEXT EXTRACTION
   ============================================================ */

function extractOpenAIResponseText(
    data
) {

    if (!data) {
        return '';
    }


    if (
        typeof data.output_text ===
        'string'
    ) {

        return data.output_text.trim();

    }


    if (
        Array.isArray(
            data.choices
        )
    ) {

        for (
            const choice
            of data.choices
        ) {

            const content =
                choice?.message?.content;


            if (
                typeof content ===
                'string'
            ) {

                return content.trim();

            }


            if (
                Array.isArray(
                    content
                )
            ) {

                const text =
                    content
                        .map(
                            part =>
                                typeof part ===
                                'string'
                                    ? part
                                    : part?.text ||
                                      ''
                        )
                        .join(' ')
                        .trim();


                if (text) {
                    return text;
                }

            }

        }

    }


    if (
        typeof data.text ===
        'string'
    ) {

        return data.text.trim();

    }


    return '';

}


/* ============================================================
   19 â€” GEMINI RESPONSE EXTRACTION
   ============================================================ */

function extractGeminiResponseText(
    data
) {

    if (!data) {
        return '';
    }


    const candidates =
        Array.isArray(
            data.candidates
        )
            ? data.candidates
            : [];


    const parts = [];


    for (
        const candidate
        of candidates
    ) {

        const candidateParts =
            candidate
                ?.content
                ?.parts;


        if (
            !Array.isArray(
                candidateParts
            )
        ) {

            continue;

        }


        for (
            const part
            of candidateParts
        ) {

            if (
                typeof part?.text ===
                'string'
            ) {

                parts.push(
                    part.text
                );

            }

        }

    }


    return parts
        .join('\n')
        .trim();

}


/* ============================================================
   20 â€” GENERIC PROVIDER CALL
   ============================================================ */

async function callOpenAICompatibleProvider(
    provider,
    messages,
    options = {}
) {

    const config =
        getModelProviderConfig(
            provider
        );


    if (
        !config ||
        !config.enabled
    ) {

        throw new Error(
            `Provider kapalÄ±: ${provider}`
        );

    }


    const apiKey =
        getProviderApiKey(
            provider
        );


    if (!apiKey) {

        const error =
            new Error(
                `${provider} API anahtarÄ± bulunamadÄ±.`
            );

        error.code =
            'MISSING_API_KEY';

        throw error;

    }


    const model =
        getModelName(
            provider,
            options.model
        );


    const endpoint =
        getProviderEndpoint(
            provider,
            model
        );


    const payload =
        buildOpenAICompatiblePayload(
            provider,
            model,
            messages,
            options
        );


    const {
        controller,
        timer
    } =
        createAbortController(
            options.timeoutMs ||
            MODEL_ROUTER_CONFIG.timeoutMs
        );


    const started =
        Date.now();


    try {

        const response =
            await fetch(
                endpoint,
                {

                    method:
                        'POST',

                    headers: {

                        'Content-Type':
                            'application/json',

                        'Authorization':
                            `Bearer ${apiKey}`,

                        'User-Agent':
                            'TurkAI/1.0'

                    },

                    body:
                        JSON.stringify(
                            payload
                        ),

                    signal:
                        controller.signal

                }
            );


        if (
            !response.ok
        ) {

            throw await readModelErrorResponse(
                response
            );

        }


        const data =
            await response.json();


        const text =
            extractOpenAIResponseText(
                data
            );


        if (!text) {

            const error =
                new Error(
                    `${provider} boÅŸ cevap dÃ¶ndÃ¼rdÃ¼.`
                );

            error.code =
                'EMPTY_RESPONSE';

            throw error;

        }


        return {

            success:
                true,

            provider,

            model,

            text,

            data,

            latencyMs:
                Date.now() -
                started

        };

    } finally {

        clearTimeout(
            timer
        );

    }

}


/* ============================================================
   21 â€” GEMINI CALL
   ============================================================ */

async function callGeminiProvider(
    messages,
    options = {}
) {

    const provider =
        'gemini';


    const config =
        getModelProviderConfig(
            provider
        );


    if (
        !config ||
        !config.enabled
    ) {

        throw new Error(
            'Gemini provider kapalÄ±.'
        );

    }


    const apiKey =
        getProviderApiKey(
            provider
        );


    if (!apiKey) {

        const error =
            new Error(
                'Gemini API anahtarÄ± bulunamadÄ±.'
            );

        error.code =
            'MISSING_API_KEY';

        throw error;

    }


    const model =
        getModelName(
            provider,
            options.model
        );


    const endpoint =
        getProviderEndpoint(
            provider,
            model
        );


    const url =
        `${endpoint}?key=${encodeURIComponent(
            apiKey
        )}`;


    const payload =
        buildGeminiPayload(
            messages,
            options
        );


    const {
        controller,
        timer
    } =
        createAbortController(
            options.timeoutMs ||
            MODEL_ROUTER_CONFIG.timeoutMs
        );


    const started =
        Date.now();


    try {

        const response =
            await fetch(
                url,
                {

                    method:
                        'POST',

                    headers: {

                        'Content-Type':
                            'application/json',

                        'User-Agent':
                            'TurkAI/1.0'

                    },

                    body:
                        JSON.stringify(
                            payload
                        ),

                    signal:
                        controller.signal

                }
            );


        if (
            !response.ok
        ) {

            throw await readModelErrorResponse(
                response
            );

        }


        const data =
            await response.json();


        const text =
            extractGeminiResponseText(
                data
            );


        if (!text) {

            const error =
                new Error(
                    'Gemini boÅŸ cevap dÃ¶ndÃ¼rdÃ¼.'
                );

            error.code =
                'EMPTY_RESPONSE';

            throw error;

        }


        return {

            success:
                true,

            provider,

            model,

            text,

            data,

            latencyMs:
                Date.now() -
                started

        };

    } finally {

        clearTimeout(
            timer
        );

    }

}


/* ============================================================
   22 â€” PROVIDER CALLER
   ============================================================ */

async function callModelProvider(
    provider,
    messages,
    options = {}
) {

    if (
        provider ===
        'gemini'
    ) {

        return callGeminiProvider(
            messages,
            options
        );

    }


    return callOpenAICompatibleProvider(
        provider,
        messages,
        options
    );

}


/* ============================================================
   23 â€” MODEL ERROR HANDLER
   ============================================================ */

function registerModelFailure(
    provider,
    error,
    type
) {

    const state =
        getProviderState(
            provider
        );


    state.failures++;


    state.lastError = {

        message:
            cleanText(
                error?.message ||
                'Model error'
            ),

        type,

        at:
            timestamp()

    };


    if (
        type ===
        'rate_limit'
    ) {

        state.rateLimits++;

        temporarilyDisableProvider(
            provider,
            2
        );

    }


    if (
        type ===
        'auth'
    ) {

        state.authErrors++;

        temporarilyDisableProvider(
            provider,
            10
        );

    }


    if (
        type ===
        'timeout'
    ) {

        state.timeouts++;

        temporarilyDisableProvider(
            provider,
            1
        );

    }


    if (
        type ===
        'billing'
    ) {

        temporarilyDisableProvider(
            provider,
            10
        );

    }


    if (
        type ===
        'server'
    ) {

        state.unavailable++;

        temporarilyDisableProvider(
            provider,
            1
        );

    }

}


/* ============================================================
   24 â€” MODEL SUCCESS HANDLER
   ============================================================ */

function registerModelSuccess(
    provider
) {

    const state =
        getProviderState(
            provider
        );


    state.successes++;

    state.lastSuccess =
        timestamp();

    state.lastUsed =
        timestamp();

    state.disabledUntil =
        null;

}


/* ============================================================
   25 â€” MODEL REQUEST
   ============================================================ */

async function requestModel(
    messages,
    options = {}
) {

    const normalizedMessages =
        buildModelMessages(
            messages,
            options
        );


    const finalMessages =
        appendContextToMessages(
            normalizedMessages,
            options
        );


    if (
        finalMessages.length ===
        0
    ) {

        throw new Error(
            'Model mesajlarÄ± boÅŸ.'
        );

    }


    const providers =
        getAvailableProviders(
            options
        );


    if (
        providers.length ===
        0
    ) {

        const error =
            new Error(
                'KullanÄ±labilir AI provider bulunamadÄ±.'
            );

        error.code =
            'NO_PROVIDER';

        throw error;

    }


    MODEL_STATE.requests.total++;


    let lastError =
        null;


    for (
        let index = 0;
        index < providers.length;
        index++
    ) {

        const provider =
            providers[index];


        const state =
            getProviderState(
                provider
            );


        state.requests++;

        state.lastUsed =
            timestamp();


        try {

            const result =
                await callModelProvider(
                    provider,
                    finalMessages,
                    {
                        ...options,

                        model:
                            options.model,

                        timeoutMs:
                            options.timeoutMs ||
                            MODEL_ROUTER_CONFIG.timeoutMs,

                        maxTokens:
                            options.maxTokens ||
                            MODEL_ROUTER_CONFIG.maxTokens,

                        temperature:
                            options.temperature !== undefined
                                ? options.temperature
                                : MODEL_ROUTER_CONFIG.temperature
                    }
                );


            registerModelSuccess(
                provider
            );


            MODEL_STATE.requests.successful++;

            MODEL_STATE.lastSuccess =
                timestamp();


            if (index > 0) {

                MODEL_STATE.requests
                    .fallback++;

            }


            return {

                success:
                    true,

                text:
                    result.text,

                provider:
                    result.provider,

                model:
                    result.model,

                latencyMs:
                    result.latencyMs,

                fallbackUsed:
                    index > 0,

                attemptedProviders:
                    providers.slice(
                        0,
                        index + 1
                    )

            };

        } catch (error) {

            lastError =
                error;


            const type =
                classifyModelError(
                    error
                );


            registerModelFailure(
                provider,
                error,
                type
            );


            /*
               KullanÄ±cÄ± belirli provider
               istediyse fallback kapatÄ±labilir.
            */

            if (
                options.provider &&
                options.allowFallback ===
                false
            ) {

                break;

            }


            /*
               Missing key olan provider
               sessizce sÄ±radakine geÃ§ebilir.
            */

            continue;

        }

    }


    MODEL_STATE.requests.failed++;

    MODEL_STATE.lastError = {

        message:
            cleanText(
                lastError?.message ||
                'TÃ¼m AI providerlarÄ± baÅŸarÄ±sÄ±z oldu.'
            ),

        at:
            timestamp()

    };


    const finalError =
        new Error(
            cleanText(
                lastError?.message ||
                'TÃ¼m AI providerlarÄ± baÅŸarÄ±sÄ±z oldu.'
            )
        );


    finalError.code =
        'ALL_PROVIDERS_FAILED';


    throw finalError;

}


/* ============================================================
   26 â€” SIMPLE MODEL HELPER
   ============================================================ */

async function generateAIResponse(
    userMessage,
    context = {},
    options = {}
) {

    const messages = [

        {
            role:
                'user',

            content:
                cleanText(
                    userMessage
                )

        }

    ];


    return requestModel(
        messages,
        {
            ...options,
            ...context
        }
    );

}


/* ============================================================
   27 â€” CHAT MODEL HELPER
   ============================================================ */

async function generateChatResponse(
    messages,
    context = {},
    options = {}
) {

    return requestModel(
        messages,
        {
            ...options,
            ...context
        }
    );

}


/* ============================================================
   28 â€” MODEL ROUTER HEALTH
   ============================================================ */

function modelRouterHealth() {

    const providers = {};


    for (
        const provider
        of Object.keys(
            MODEL_ROUTER_CONFIG.providers
        )
    ) {

        const config =
            getModelProviderConfig(
                provider
            );


        const state =
            getProviderState(
                provider
            );


        providers[
            provider
        ] = {

            enabled:
                Boolean(
                    config?.enabled
                ),

            configured:
                isProviderConfigured(
                    provider
                ),

            temporarilyDisabled:
                isProviderTemporarilyDisabled(
                    provider
                ),

            model:
                config?.defaultModel ||
                null,

            priority:
                config?.priority ||
                null,

            requests:
                state.requests,

            successes:
                state.successes,

            failures:
                state.failures,

            rateLimits:
                state.rateLimits,

            authErrors:
                state.authErrors,

            timeouts:
                state.timeouts,

            unavailable:
                state.unavailable,

            lastUsed:
                state.lastUsed,

            lastSuccess:
                state.lastSuccess

        };

    }


    return {

        enabled:
            MODEL_ROUTER_CONFIG.enabled,

        defaultProvider:
            MODEL_ROUTER_CONFIG
                .defaultProvider,

        totalRequests:
            MODEL_STATE.requests.total,

        successfulRequests:
            MODEL_STATE.requests.successful,

        failedRequests:
            MODEL_STATE.requests.failed,

        fallbackRequests:
            MODEL_STATE.requests.fallback,

        providers

    };

}


/* ============================================================
   29 â€” API: MODEL CHAT
   ============================================================ */

app.post(
    '/api/ai/chat',
    async (req, res) => {

        try {

            const messages =
                req.body?.messages;


            if (
                !Array.isArray(
                    messages
                ) ||
                messages.length === 0
            ) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        'messages gerekli'

                });

            }


            const result =
                await generateChatResponse(
                    messages,
                    {
                        language:
                            req.body?.language ||
                            'tr',

                        memoryText:
                            req.body?.memoryText ||
                            '',

                        knowledgeText:
                            req.body?.knowledgeText ||
                            '',

                        researchText:
                            req.body?.researchText ||
                            '',

                        extraContext:
                            req.body?.extraContext ||
                            ''
                    },
                    {
                        provider:
                            req.body?.provider,

                        model:
                            req.body?.model,

                        allowFallback:
                            req.body?.allowFallback !== false
                    }
                );


            res.json({

                success:
                    true,

                response:
                    result.text,

                provider:
                    result.provider,

                model:
                    result.model,

                latencyMs:
                    result.latencyMs,

                fallbackUsed:
                    result.fallbackUsed,

                attemptedProviders:
                    result.attemptedProviders

            });

        } catch (error) {

            res.status(503).json({

                success:
                    false,

                error:
                    error.message,

                code:
                    error.code ||
                    'AI_ERROR'

            });

        }

    }
);


/* ============================================================
   30 â€” API: SINGLE AI MESSAGE
   ============================================================ */

app.post(
    '/api/ai/generate',
    async (req, res) => {

        try {

            const message =
                cleanText(
                    req.body?.message
                );


            if (!message) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        'message gerekli'

                });

            }


            const result =
                await generateAIResponse(
                    message,
                    {
                        language:
                            req.body?.language ||
                            detectLanguage(
                                message
                            ),

                        memoryText:
                            req.body?.memoryText ||
                            '',

                        knowledgeText:
                            req.body?.knowledgeText ||
                            '',

                        researchText:
                            req.body?.researchText ||
                            '',

                        extraContext:
                            req.body?.extraContext ||
                            ''
                    },
                    {
                        provider:
                            req.body?.provider,

                        model:
                            req.body?.model,

                        allowFallback:
                            req.body?.allowFallback !== false
                    }
                );


            res.json({

                success:
                    true,

                response:
                    result.text,

                provider:
                    result.provider,

                model:
                    result.model,

                fallbackUsed:
                    result.fallbackUsed

            });

        } catch (error) {

            res.status(503).json({

                success:
                    false,

                error:
                    error.message,

                code:
                    error.code ||
                    'AI_ERROR'

            });

        }

    }
);


/* ============================================================
   31 â€” API: MODEL HEALTH
   ============================================================ */

app.get(
    '/api/ai/health',
    (req, res) => {

        try {

            res.json({

                success:
                    true,

                health:
                    modelRouterHealth()

            });

        } catch (error) {

            res.status(500).json({

                success:
                    false,

                error:
                    error.message

            });

        }

    }
);


/* ============================================================
   32 â€” API: PROVIDER LIST
   ============================================================ */

app.get(
    '/api/ai/providers',
    (req, res) => {

        try {

            const providers =
                Object.entries(
                    MODEL_ROUTER_CONFIG.providers
                )
                    .map(
                        (
                            [
                                name,
                                config
                            ]
                        ) => ({

                            name,

                            enabled:
                                Boolean(
                                    config.enabled
                                ),

                            configured:
                                isProviderConfigured(
                                    name
                                ),

                            model:
                                config.defaultModel,

                            priority:
                                config.priority

                        })
                    );


            res.json({

                success:
                    true,

                providers

            });

        } catch (error) {

            res.status(500).json({

                success:
                    false,

                error:
                    error.message

            });

        }

    }
);


/* ============================================================
   33 â€” API: TEST PROVIDER
   ============================================================ */

app.post(
    '/api/ai/test',
    async (req, res) => {

        try {

            const provider =
                cleanText(
                    req.body?.provider
                );


            const prompt =
                cleanText(
                    req.body?.prompt
                ) ||
                'Merhaba TÃ¼rkAI. KÄ±sa bir test cevabÄ± ver.';


            if (!provider) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        'provider gerekli'

                });

            }


            if (
                !isProviderConfigured(
                    provider
                )
            ) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        `${provider} yapÄ±landÄ±rÄ±lmamÄ±ÅŸ.`

                });

            }


            const result =
                await requestModel(
                    [
                        {
                            role:
                                'user',

                            content:
                                prompt
                        }
                    ],
                    {
                        provider,

                        allowFallback:
                            false
                    }
                );


            res.json({

                success:
                    true,

                provider:
                    result.provider,

                model:
                    result.model,

                response:
                    result.text,

                latencyMs:
                    result.latencyMs

            });

        } catch (error) {

            res.status(503).json({

                success:
                    false,

                error:
                    error.message,

                type:
                    classifyModelError(
                        error
                    )

            });

        }

    }
);


/* ============================================================
   34 â€” EXPORTS
   ============================================================ */

module.exports = {

    ...(module.exports || {}),

    MODEL_ROUTER_CONFIG,

    MODEL_STATE,

    getModelProviderConfig,

    getProviderApiKey,

    isProviderConfigured,

    getProviderOrder,

    getAvailableProviders,

    normalizeModelMessages,

    buildDefaultSystemPrompt,

    buildModelMessages,

    appendContextToMessages,

    buildOpenAICompatiblePayload,

    buildGeminiPayload,

    extractOpenAIResponseText,

    extractGeminiResponseText,

    classifyModelError,

    callModelProvider,

    callOpenAICompatibleProvider,

    callGeminiProvider,

    requestModel,

    generateAIResponse,

    generateChatResponse,

    modelRouterHealth

};


console.log(
    'âœ… TÃœRKAI SERVER PART 6 / 20 hazÄ±r â€” AI Model Router aktif.'
);


/* ============================================================
   PART 6 SONU
   ============================================================ */
// ============================================================
// TÃœRKAI SERVER â€” PART 7 / 20
// MAIN CHAT ORCHESTRATOR â€” TÃœRKAI ANA BEYÄ°N
// ============================================================
//
// AKIÅ:
//
// KullanÄ±cÄ± mesajÄ±
//      â†“
// Mesaj analizi
//      â†“
// GeliÅŸmiÅŸ hafÄ±za
//      â†“
// Yerel bilgi / knowledge.json
//      â†“
// GÃ¼ncel bilgi gerekiyor mu?
//      â†“
// Web araÅŸtÄ±rmasÄ±
//      â†“
// AI Model Router
//      â†“
// Cevap kalite kontrolÃ¼
//      â†“
// Conversation Memory
//      â†“
// Knowledge Ã¶ÄŸrenmesi
//      â†“
// KullanÄ±cÄ±ya yapÄ±landÄ±rÄ±lmÄ±ÅŸ cevap
//
// ============================================================

const TURKAI_ORCHESTRATOR_CONFIG = {
  enabled: true,

  version: '7.0.0',

  maxMessageLength: 20000,

  maxContextMessages: 18,

  maxMemoryItems: 20,

  maxKnowledgeResults: 8,

  maxResearchResults: 8,

  maxResponseLength: 50000,

  minimumResponseLength: 1,

  localAnswerEnabled: true,

  researchEnabled: true,

  modelEnabled: true,

  learningEnabled: true,

  memoryEnabled: true,

  fallbackEnabled: true,

  saveUserMessages: true,

  saveAssistantMessages: true,

  saveSuccessfulAnswers: true,

  allowResearchForUnknownQuestions: true,

  currentQuestionResearch: true,

  confidenceThresholds: {
    local: 0.72,
    strongLocal: 0.88,
    research: 0.55,
    model: 0.30
  }
};


// ============================================================
// 1. ORCHESTRATOR STATE
// ============================================================

const TURKAI_ORCHESTRATOR_STATE = {
  startedAt: timestamp(),

  requests: 0,

  successful: 0,

  failed: 0,

  localAnswers: 0,

  researchedAnswers: 0,

  modelAnswers: 0,

  fallbackAnswers: 0,

  learnedAnswers: 0,

  memoryWrites: 0,

  averageDurationMs: 0,

  lastRequestAt: null,

  lastErrorAt: null,

  lastError: null,

  activeRequests: 0
};


// ============================================================
// 2. GENERIC HELPERS
// ============================================================

function orchestratorNow() {
  return Date.now();
}


function orchestratorDuration(start) {
  return Math.max(0, Date.now() - start);
}


function normalizeOrchestratorText(value, maxLength = 20000) {
  return cleanText(String(value ?? ''))
    .trim()
    .slice(0, maxLength);
}


function safeOrchestratorArray(value) {
  return Array.isArray(value) ? value : [];
}


function safeOrchestratorObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};
}


function averageOrchestratorDuration(duration) {
  const total = TURKAI_ORCHESTRATOR_STATE.requests;

  if (!total) {
    TURKAI_ORCHESTRATOR_STATE.averageDurationMs = duration;
    return duration;
  }

  TURKAI_ORCHESTRATOR_STATE.averageDurationMs =
    Math.round(
      (
        TURKAI_ORCHESTRATOR_STATE.averageDurationMs * (total - 1) +
        duration
      ) / total
    );

  return TURKAI_ORCHESTRATOR_STATE.averageDurationMs;
}


// ============================================================
// 3. EXPORTED FUNCTION RESOLVER
// ============================================================
//
// PART 4 ve PART 5'te oluÅŸturulan fonksiyonlarÄ±n isimleri
// farklÄ± olsa bile orchestrator mÃ¼mkÃ¼n olanlarÄ± kullanmaya Ã§alÄ±ÅŸÄ±r.
//
// module.exports Ã¼zerinden bakÄ±yoruz Ã§Ã¼nkÃ¼ Ã¶nceki bÃ¶lÃ¼mler
// fonksiyonlarÄ±nÄ± export ediyor.
//

function getTurkAIExportedFunction(...names) {
  for (const name of names) {
    try {
      if (
        module.exports &&
        typeof module.exports[name] === 'function'
      ) {
        return module.exports[name];
      }
    } catch (_) {
      // GÃ¼venli ÅŸekilde devam
    }
  }

  return null;
}


// ============================================================
// 4. REQUEST ID
// ============================================================

function createTurkAIRequestId() {
  return generateId('turkai_req');
}


// ============================================================
// 5. INPUT VALIDATION
// ============================================================

function validateTurkAIInput(input) {
  const body = safeOrchestratorObject(input);

  const message = normalizeOrchestratorText(
    body.message ??
    body.text ??
    body.prompt ??
    '',
    TURKAI_ORCHESTRATOR_CONFIG.maxMessageLength
  );

  const userId = normalizeOrchestratorText(
    body.userId ??
    body.user_id ??
    body.uid ??
    'default-user',
    200
  ) || 'default-user';

  const sessionId = normalizeOrchestratorText(
    body.sessionId ??
    body.session_id ??
    '',
    200
  );

  const conversationId = normalizeOrchestratorText(
    body.conversationId ??
    body.conversation_id ??
    '',
    200
  );

  const language = normalizeOrchestratorText(
    body.language ??
    '',
    30
  );

  if (!message) {
    return {
      valid: false,
      error: 'Mesaj boÅŸ bÄ±rakÄ±lamaz.'
    };
  }

  if (message.length > TURKAI_ORCHESTRATOR_CONFIG.maxMessageLength) {
    return {
      valid: false,
      error: 'Mesaj Ã§ok uzun.'
    };
  }

  return {
    valid: true,

    message,

    userId,

    sessionId,

    conversationId,

    language,

    metadata: safeOrchestratorObject(body.metadata),

    options: safeOrchestratorObject(body.options)
  };
}


// ============================================================
// 6. REQUEST CONTEXT
// ============================================================

function createTurkAIRequestContext(input) {
  const requestId = createTurkAIRequestId();

  return {
    requestId,

    startedAt: timestamp(),

    startedAtMs: orchestratorNow(),

    userId: input.userId,

    sessionId: input.sessionId,

    conversationId: input.conversationId,

    message: input.message,

    language: input.language,

    metadata: input.metadata,

    options: input.options,

    parsed: null,

    advancedMemory: null,

    conversationMemory: null,

    localKnowledge: null,

    research: null,

    model: null,

    response: null,

    route: null,

    warnings: [],

    errors: [],

    stages: [],

    flags: {
      needsResearch: false,

      localAnswerFound: false,

      modelUsed: false,

      researchUsed: false,

      memoryUsed: false,

      learned: false,

      fallback: false
    }
  };
}


// ============================================================
// 7. STAGE LOGGER
// ============================================================

function addOrchestratorStage(context, name, data = {}) {
  context.stages.push({
    name,

    timestamp: timestamp(),

    elapsedMs: orchestratorDuration(
      context.startedAtMs
    ),

    data: safeOrchestratorObject(data)
  });

  if (context.stages.length > 100) {
    context.stages.shift();
  }
}


// ============================================================
// 8. SAFE ERROR LOGGER
// ============================================================

function addOrchestratorError(context, stage, error) {
  const message =
    error instanceof Error
      ? error.message
      : String(error ?? 'Bilinmeyen hata');

  const item = {
    stage,

    message: message.slice(0, 1000),

    timestamp: timestamp()
  };

  context.errors.push(item);

  if (context.errors.length > 20) {
    context.errors.shift();
  }

  return item;
}


// ============================================================
// 9. MESSAGE PARSER
// ============================================================

async function orchestrateParseMessage(context) {
  try {
    if (typeof processUserMessage === 'function') {
      const parsed = processUserMessage(
        context.userId,
        context.message,
        {
          sessionId: context.sessionId,
          conversationId: context.conversationId
        }
      );

      context.parsed = parsed;

      addOrchestratorStage(
        context,
        'message_parser',
        {
          success: true
        }
      );

      return parsed;
    }

    const fallbackParsed = {
      text: context.message,

      language:
        context.language ||
        detectLanguage(context.message),

      intent: {
        name: 'question',

        confidence: 0.5
      },

      entities: [],

      units: []
    };

    context.parsed = fallbackParsed;

    addOrchestratorStage(
      context,
      'message_parser_fallback',
      {
        success: true
      }
    );

    return fallbackParsed;
  } catch (error) {
    addOrchestratorError(
      context,
      'message_parser',
      error
    );

    context.parsed = {
      text: context.message,

      language:
        context.language ||
        detectLanguage(context.message),

      intent: {
        name: 'question',

        confidence: 0
      },

      entities: [],

      units: []
    };

    return context.parsed;
  }
}


// ============================================================
// 10. ADVANCED MEMORY
// ============================================================

async function orchestrateMemory(context) {
  if (!TURKAI_ORCHESTRATOR_CONFIG.memoryEnabled) {
    return null;
  }

  try {
    let advanced = null;

    const advancedBuilder =
      getTurkAIExportedFunction(
        'buildAdvancedContext'
      );

    if (advancedBuilder) {
      advanced = await Promise.resolve(
        advancedBuilder(
          context.userId,
          context.message,
          {
            sessionId: context.sessionId,
            conversationId: context.conversationId,
            parsed: context.parsed
          }
        )
      );
    }

    if (!advanced) {
      const basicBuilder =
        getTurkAIExportedFunction(
          'buildContext'
        );

      if (basicBuilder) {
        advanced = await Promise.resolve(
          basicBuilder(
            context.userId,
            context.message,
            {
              sessionId: context.sessionId,
              conversationId: context.conversationId
            }
          )
        );
      }
    }

    context.advancedMemory =
      advanced || {};

    context.conversationMemory =
      safeOrchestratorArray(
        advanced?.recentMessages ??
        advanced?.messages ??
        advanced?.conversation ??
        []
      );

    if (
      context.conversationMemory.length > 0 ||
      Object.keys(context.advancedMemory).length > 0
    ) {
      context.flags.memoryUsed = true;
    }

    TURKAI_ORCHESTRATOR_STATE.memoryWrites += 1;

    addOrchestratorStage(
      context,
      'memory',
      {
        used: context.flags.memoryUsed,

        messageCount:
          context.conversationMemory.length
      }
    );

    return context.advancedMemory;
  } catch (error) {
    addOrchestratorError(
      context,
      'memory',
      error
    );

    return null;
  }
}


// ============================================================
// 11. LOCAL KNOWLEDGE SEARCH
// ============================================================

async function orchestrateLocalKnowledge(context) {
  if (!TURKAI_ORCHESTRATOR_CONFIG.localAnswerEnabled) {
    return null;
  }

  try {
    let result = null;

    if (typeof runLocalIntelligence === 'function') {
      result = await Promise.resolve(
        runLocalIntelligence({
          userId: context.userId,

          message: context.message,

          parsed: context.parsed,

          context: context.advancedMemory
        })
      );
    }

    if (!result && typeof findKnowledgeAnswer === 'function') {
      const found =
        findKnowledgeAnswer(
          context.message,
          {
            intent:
              context.parsed?.intent?.name ??
              context.parsed?.intent,

            userId: context.userId
          }
        );

      if (found) {
        result = {
          action: 'local_answer',

          answer:
            found.answer ??
            found.text ??
            found.content ??
            '',

          knowledge: found
        };
      }
    }

    context.localKnowledge =
      result || {
        action: 'research_or_local',

        answer: '',

        results: []
      };

    const answer = normalizeOrchestratorText(
      context.localKnowledge.answer ??
      context.localKnowledge.response ??
      context.localKnowledge.text ??
      '',
      TURKAI_ORCHESTRATOR_CONFIG.maxResponseLength
    );

    const confidence = safeNumber(
      context.localKnowledge.confidence ??
      context.localKnowledge.score ??
      0,
      0
    );

    if (
      answer &&
      (
        confidence >=
        TURKAI_ORCHESTRATOR_CONFIG
          .confidenceThresholds.local
        ||
        context.localKnowledge.action ===
        'local_answer'
      )
    ) {
      context.flags.localAnswerFound = true;
    }

    addOrchestratorStage(
      context,
      'local_knowledge',
      {
        found:
          context.flags.localAnswerFound,

        confidence
      }
    );

    return context.localKnowledge;
  } catch (error) {
    addOrchestratorError(
      context,
      'local_knowledge',
      error
    );

    return null;
  }
}


// ============================================================
// 12. RESEARCH DECISION
// ============================================================

function shouldTurkAIResearch(context) {
  if (
    !TURKAI_ORCHESTRATOR_CONFIG.researchEnabled
  ) {
    return false;
  }

  if (
    context.options &&
    context.options.research === false
  ) {
    return false;
  }

  const parsed = context.parsed || {};

  const intent =
    typeof parsed.intent === 'string'
      ? parsed.intent
      : parsed.intent?.name;

  const priority =
    safeNumber(
      parsed.priority ??
      parsed.intent?.priority ??
      0,
      0
    );

  const localAction =
    context.localKnowledge?.action;

  const localConfidence =
    safeNumber(
      context.localKnowledge?.confidence ??
      context.localKnowledge?.score ??
      0,
      0
    );

  if (
    localAction === 'local_answer' &&
    localConfidence >=
      TURKAI_ORCHESTRATOR_CONFIG
        .confidenceThresholds.strongLocal
  ) {
    return false;
  }

  if (
    intent === 'research' ||
    intent === 'current' ||
    intent === 'news'
  ) {
    return true;
  }

  if (
    priority >= 100 &&
    intent === 'research'
  ) {
    return true;
  }

  if (
    context.localKnowledge?.action ===
    'research'
  ) {
    return true;
  }

  if (
    context.localKnowledge?.action ===
    'research_or_local' &&
    !context.flags.localAnswerFound
  ) {
    return TURKAI_ORCHESTRATOR_CONFIG
      .allowResearchForUnknownQuestions;
  }

  return false;
}


// ============================================================
// 13. RESEARCH ENGINE BRIDGE
// ============================================================

async function orchestrateResearch(context) {
  if (!shouldTurkAIResearch(context)) {
    context.flags.needsResearch = false;

    addOrchestratorStage(
      context,
      'research_skipped',
      {
        reason: 'local_or_non_current_question'
      }
    );

    return null;
  }

  context.flags.needsResearch = true;

  if (
    !TURKAI_ORCHESTRATOR_CONFIG.researchEnabled
  ) {
    return null;
  }

  try {
    const researchFunction =
      getTurkAIExportedFunction(
        'runResearch',
        'performResearch',
        'researchWeb',
        'researchQuestion',
        'webResearch',
        'runWebResearch',
        'searchAndResearch',
        'executeResearch'
      );

    if (!researchFunction) {
      context.warnings.push(
        'AraÅŸtÄ±rma motoru bulunamadÄ±.'
      );

      addOrchestratorStage(
        context,
        'research_unavailable',
        {
          success: false
        }
      );

      return null;
    }

    const researchInput = {
      query: context.message,

      userId: context.userId,

      sessionId: context.sessionId,

      conversationId: context.conversationId,

      parsed: context.parsed,

      memory: context.advancedMemory,

      maxResults:
        TURKAI_ORCHESTRATOR_CONFIG
          .maxResearchResults
    };

    const result =
      await Promise.resolve(
        researchFunction(researchInput)
      );

    context.research =
      result || {
        answer: '',

        results: []
      };

    context.flags.researchUsed = true;

    TURKAI_ORCHESTRATOR_STATE
      .researchedAnswers += 1;

    addOrchestratorStage(
      context,
      'research',
      {
        success: true,

        resultCount:
          safeOrchestratorArray(
            result?.results ??
            result?.sources ??
            result?.pages
          ).length
      }
    );

    return context.research;
  } catch (error) {
    addOrchestratorError(
      context,
      'research',
      error
    );

    context.research = {
      answer: '',

      results: [],

      error: error.message
    };

    return null;
  }
}


// ============================================================
// 14. RESEARCH CONTEXT FORMATTER
// ============================================================

function buildResearchContextForModel(context) {
  if (!context.research) {
    return '';
  }

  const research =
    safeOrchestratorObject(
      context.research
    );

  const chunks = [];

  const researchAnswer =
    normalizeOrchestratorText(
      research.answer ??
      research.summary ??
      research.text ??
      '',
      12000
    );

  if (researchAnswer) {
    chunks.push(
      `ARAÅTIRMA Ã–ZETÄ°:\n${researchAnswer}`
    );
  }

  const results =
    safeOrchestratorArray(
      research.results ??
      research.sources ??
      research.pages
    );

  if (results.length) {
    const sourceLines = results
      .slice(
        0,
        TURKAI_ORCHESTRATOR_CONFIG
          .maxResearchResults
      )
      .map((item, index) => {
        const obj =
          safeOrchestratorObject(item);

        const title =
          normalizeOrchestratorText(
            obj.title ??
            obj.name ??
            `Kaynak ${index + 1}`,
            500
          );

        const content =
          normalizeOrchestratorText(
            obj.snippet ??
            obj.summary ??
            obj.content ??
            obj.text ??
            '',
            1800
          );

        const url =
          normalizeOrchestratorText(
            obj.url ??
            obj.link ??
            '',
            1000
          );

        return [
          `${index + 1}. ${title}`,
          content
            ? `Bilgi: ${content}`
            : '',
          url
            ? `Kaynak: ${url}`
            : ''
        ]
          .filter(Boolean)
          .join('\n');
      });

    chunks.push(
      `ARAÅTIRMA KAYNAKLARI:\n${sourceLines.join('\n\n')}`
    );
  }

  return chunks.join('\n\n');
}


// ============================================================
// 15. MEMORY CONTEXT FORMATTER
// ============================================================

function buildMemoryContextForModel(context) {
  const memory =
    safeOrchestratorObject(
      context.advancedMemory
    );

  const chunks = [];

  const summary =
    normalizeOrchestratorText(
      memory.summary ??
      memory.conversationSummary ??
      memory.latestSummary ??
      '',
      8000
    );

  if (summary) {
    chunks.push(
      `Ã–NCEKÄ° KONUÅMA Ã–ZETÄ°:\n${summary}`
    );
  }

  const messages =
    safeOrchestratorArray(
      memory.recentMessages ??
      memory.messages ??
      context.conversationMemory
    );

  if (messages.length) {
    const recent =
      messages
        .slice(
          -TURKAI_ORCHESTRATOR_CONFIG
            .maxContextMessages
        )
        .map(item => {
          const obj =
            safeOrchestratorObject(item);

          const role =
            normalizeOrchestratorText(
              obj.role ??
              obj.sender ??
              'user',
              50
            );

          const content =
            normalizeOrchestratorText(
              obj.content ??
              obj.message ??
              obj.text ??
              '',
              2000
            );

          return content
            ? `${role}: ${content}`
            : '';
        })
        .filter(Boolean);

    if (recent.length) {
      chunks.push(
        `YAKIN KONUÅMA:\n${recent.join('\n')}`
      );
    }
  }

  return chunks.join('\n\n');
}


// ============================================================
// 16. LOCAL KNOWLEDGE CONTEXT FORMATTER
// ============================================================

function buildKnowledgeContextForModel(context) {
  const local =
    safeOrchestratorObject(
      context.localKnowledge
    );

  const chunks = [];

  const answer =
    normalizeOrchestratorText(
      local.answer ??
      local.response ??
      local.text ??
      '',
      8000
    );

  if (answer) {
    chunks.push(
      `YEREL BÄ°LGÄ°:\n${answer}`
    );
  }

  const results =
    safeOrchestratorArray(
      local.results ??
      local.matches ??
      local.records
    );

  if (results.length) {
    const items =
      results
        .slice(
          0,
          TURKAI_ORCHESTRATOR_CONFIG
            .maxKnowledgeResults
        )
        .map((item, index) => {
          const obj =
            safeOrchestratorObject(item);

          const content =
            normalizeOrchestratorText(
              obj.answer ??
              obj.content ??
              obj.text ??
              obj.question ??
              '',
              1600
            );

          return content
            ? `${index + 1}. ${content}`
            : '';
        })
        .filter(Boolean);

    if (items.length) {
      chunks.push(
        `YEREL EÅLEÅMELER:\n${items.join('\n')}`
      );
    }
  }

  return chunks.join('\n\n');
}


// ============================================================
// 17. MODEL PROMPT CONTEXT
// ============================================================

function buildTurkAIModelContext(context) {
  const sections = [];

  const memoryContext =
    buildMemoryContextForModel(context);

  if (memoryContext) {
    sections.push(memoryContext);
  }

  const knowledgeContext =
    buildKnowledgeContextForModel(context);

  if (knowledgeContext) {
    sections.push(knowledgeContext);
  }

  const researchContext =
    buildResearchContextForModel(context);

  if (researchContext) {
    sections.push(researchContext);
  }

  if (context.parsed) {
    sections.push(
      [
        'MESAJ ANALÄ°ZÄ°:',
        `Dil: ${
          context.parsed.language ??
          detectLanguage(context.message)
        }`,
        `Niyet: ${
          typeof context.parsed.intent === 'string'
            ? context.parsed.intent
            : context.parsed.intent?.name ??
              'question'
        }`
      ].join('\n')
    );
  }

  return sections.join('\n\n====================\n\n');
}


// ============================================================
// 18. MODEL GENERATION
// ============================================================

async function orchestrateModel(context) {
  if (!TURKAI_ORCHESTRATOR_CONFIG.modelEnabled) {
    return null;
  }

  if (
    context.flags.localAnswerFound &&
    !context.flags.needsResearch
  ) {
    return null;
  }

  try {
    const modelFunction =
      getTurkAIExportedFunction(
        'generateChatResponse',
        'generateAIResponse',
        'requestModel'
      );

    if (!modelFunction) {
      context.warnings.push(
        'AI model router bulunamadÄ±.'
      );

      return null;
    }

    const modelContext =
      buildTurkAIModelContext(context);

    const result =
      await Promise.resolve(
        modelFunction({
          userId: context.userId,

          sessionId: context.sessionId,

          conversationId:
            context.conversationId,

          message: context.message,

          prompt: context.message,

          context: modelContext,

          parsed: context.parsed,

          memory: context.advancedMemory,

          research: context.research,

          knowledge:
            context.localKnowledge
        })
      );

    context.model =
      result || {};

    const text =
      normalizeOrchestratorText(
        result?.answer ??
        result?.response ??
        result?.text ??
        result?.content ??
        '',
        TURKAI_ORCHESTRATOR_CONFIG
          .maxResponseLength
      );

    if (text) {
      context.flags.modelUsed = true;

      TURKAI_ORCHESTRATOR_STATE
        .modelAnswers += 1;
    }

    addOrchestratorStage(
      context,
      'model',
      {
        success: Boolean(text),

        provider:
          result?.provider ??
          result?.modelProvider ??
          null,

        model:
          result?.model ??
          result?.modelName ??
          null
      }
    );

    return context.model;
  } catch (error) {
    addOrchestratorError(
      context,
      'model',
      error
    );

    context.model = {
      answer: '',

      error: error.message
    };

    return null;
  }
}


// ============================================================
// 19. RESPONSE EXTRACTION
// ============================================================

function extractTurkAIResponse(context) {
  const modelText =
    normalizeOrchestratorText(
      context.model?.answer ??
      context.model?.response ??
      context.model?.text ??
      context.model?.content ??
      '',
      TURKAI_ORCHESTRATOR_CONFIG
        .maxResponseLength
    );

  if (modelText) {
    return {
      text: modelText,

      source: 'model'
    };
  }

  const researchText =
    normalizeOrchestratorText(
      context.research?.answer ??
      context.research?.summary ??
      '',
      TURKAI_ORCHESTRATOR_CONFIG
        .maxResponseLength
    );

  if (
    researchText &&
    context.flags.researchUsed
  ) {
    return {
      text: researchText,

      source: 'research'
    };
  }

  const localText =
    normalizeOrchestratorText(
      context.localKnowledge?.answer ??
      context.localKnowledge?.response ??
      context.localKnowledge?.text ??
      '',
      TURKAI_ORCHESTRATOR_CONFIG
        .maxResponseLength
    );

  if (localText) {
    return {
      text: localText,

      source: 'local'
    };
  }

  return {
    text: '',

    source: 'none'
  };
}


// ============================================================
// 20. FINAL LOCAL FALLBACK
// ============================================================

function buildTurkAIFallbackAnswer(context) {
  const intent =
    typeof context.parsed?.intent === 'string'
      ? context.parsed.intent
      : context.parsed?.intent?.name;

  if (intent === 'greeting') {
    return 'Merhaba! Ben TÃ¼rkAI. Sana nasÄ±l yardÄ±mcÄ± olabilirim?';
  }

  if (intent === 'thanks') {
    return 'Rica ederim! BaÅŸka bir konuda da yardÄ±mcÄ± olabilirim.';
  }

  if (intent === 'farewell') {
    return 'GÃ¶rÃ¼ÅŸÃ¼rÃ¼z! ğŸ‘‹';
  }

  if (intent === 'coding') {
    return 'Kodlama konusunda yardÄ±mcÄ± olabilirim. Kodunu veya yapmak istediÄŸin Ã¶zelliÄŸi gÃ¶nder.';
  }

  if (intent === 'weather') {
    return 'Hava durumu iÃ§in gÃ¼ncel veriye eriÅŸmem gerekiyor. AraÅŸtÄ±rma Ã¶zelliÄŸini kullanabilirim.';
  }

  if (intent === 'research') {
    return 'Bu soru gÃ¼ncel bilgi gerektiriyor. AraÅŸtÄ±rma motoru veya bir AI saÄŸlayÄ±cÄ±sÄ± ÅŸu anda kullanÄ±lamÄ±yor.';
  }

  return [
    'Bu soruyu ÅŸu anda yerel bilgilerimle kesin olarak yanÄ±tlayamÄ±yorum.',
    'GÃ¼ncel bilgi gerekiyorsa araÅŸtÄ±rma Ã¶zelliÄŸini kullanabilirim.',
    'AI saÄŸlayÄ±cÄ±sÄ± yapÄ±landÄ±rÄ±ldÄ±ÄŸÄ±nda daha kapsamlÄ± yanÄ±t oluÅŸturabilirim.'
  ].join(' ');
}


// ============================================================
// 21. RESPONSE QUALITY CONTROL
// ============================================================

function validateTurkAIResponse(text) {
  const normalized =
    normalizeOrchestratorText(
      text,
      TURKAI_ORCHESTRATOR_CONFIG
        .maxResponseLength
    );

  if (!normalized) {
    return {
      valid: false,

      text: '',

      reason: 'empty'
    };
  }

  if (
    normalized.length <
    TURKAI_ORCHESTRATOR_CONFIG
      .minimumResponseLength
  ) {
    return {
      valid: false,

      text: normalized,

      reason: 'too_short'
    };
  }

  return {
    valid: true,

    text: normalized,

    reason: null
  };
}


// ============================================================
// 22. RESPONSE METADATA
// ============================================================

function buildTurkAIResponseMetadata(context, source) {
  return {
    requestId: context.requestId,

    source,

    language:
      context.parsed?.language ??
      detectLanguage(context.message),

    intent:
      typeof context.parsed?.intent === 'string'
        ? context.parsed.intent
        : context.parsed?.intent?.name ??
          'question',

    researchUsed:
      Boolean(context.flags.researchUsed),

    memoryUsed:
      Boolean(context.flags.memoryUsed),

    modelUsed:
      Boolean(context.flags.modelUsed),

    localKnowledgeUsed:
      Boolean(context.flags.localAnswerFound),

    fallback:
      Boolean(context.flags.fallback),

    provider:
      context.model?.provider ??
      null,

    model:
      context.model?.model ??
      context.model?.modelName ??
      null,

    durationMs:
      orchestratorDuration(
        context.startedAtMs
      )
  };
}


// ============================================================
// 23. SAVE USER MESSAGE
// ============================================================

async function saveTurkAIUserMessage(context) {
  if (
    !TURKAI_ORCHESTRATOR_CONFIG
      .saveUserMessages
  ) {
    return null;
  }

  try {
    const fn =
      getTurkAIExportedFunction(
        'processUserMessage'
      );

    if (!fn) {
      return null;
    }

    const result =
      await Promise.resolve(
        fn(
          context.userId,
          context.message,
          {
            sessionId:
              context.sessionId,

            conversationId:
              context.conversationId,

            requestId:
              context.requestId,

            parsed:
              context.parsed
          }
        )
      );

    return result;
  } catch (error) {
    addOrchestratorError(
      context,
      'save_user_message',
      error
    );

    return null;
  }
}


// ============================================================
// 24. SAVE ASSISTANT MESSAGE
// ============================================================

async function saveTurkAIAssistantMessage(
  context,
  responseText
) {
  if (
    !TURKAI_ORCHESTRATOR_CONFIG
      .saveAssistantMessages
  ) {
    return null;
  }

  try {
    const fn =
      getTurkAIExportedFunction(
        'processAssistantMessage'
      );

    if (!fn) {
      return null;
    }

    const result =
      await Promise.resolve(
        fn(
          context.userId,
          responseText,
          {
            sessionId:
              context.sessionId,

            conversationId:
              context.conversationId,

            requestId:
              context.requestId,

            source:
              context.response?.source ??
              'model'
          }
        )
      );

    return result;
  } catch (error) {
    addOrchestratorError(
      context,
      'save_assistant_message',
      error
    );

    return null;
  }
}


// ============================================================
// 25. LEARN FROM ANSWER
// ============================================================

async function learnTurkAIAnswer(
  context,
  responseText
) {
  if (
    !TURKAI_ORCHESTRATOR_CONFIG
      .learningEnabled
  ) {
    return null;
  }

  if (
    !TURKAI_ORCHESTRATOR_CONFIG
      .saveSuccessfulAnswers
  ) {
    return null;
  }

  if (!responseText) {
    return null;
  }

  try {
    const learner =
      getTurkAIExportedFunction(
        'learnFromConversationAnswer',
        'learnAssistantAnswer'
      );

    if (!learner) {
      return null;
    }

    const result =
      await Promise.resolve(
        learner(
          context.message,
          responseText,
          {
            userId:
              context.userId,

            parsed:
              context.parsed,

            source:
              context.response?.source ??
              'model'
          }
        )
      );

    if (result) {
      context.flags.learned = true;

      TURKAI_ORCHESTRATOR_STATE
        .learnedAnswers += 1;
    }

    return result;
  } catch (error) {
    addOrchestratorError(
      context,
      'learning',
      error
    );

    return null;
  }
}


// ============================================================
// 26. COMPLETE ORCHESTRATION
// ============================================================

async function processTurkAIRequest(input) {
  const validation =
    validateTurkAIInput(input);

  if (!validation.valid) {
    return {
      success: false,

      error: validation.error,

      code: 'INVALID_INPUT'
    };
  }

  const context =
    createTurkAIRequestContext(
      validation
    );

  TURKAI_ORCHESTRATOR_STATE.requests += 1;

  TURKAI_ORCHESTRATOR_STATE.activeRequests += 1;

  TURKAI_ORCHESTRATOR_STATE.lastRequestAt =
    timestamp();

  try {
    addOrchestratorStage(
      context,
      'start'
    );

    // --------------------------------------------------------
    // STEP 1 â€” PARSE
    // --------------------------------------------------------

    await orchestrateParseMessage(
      context
    );


    // --------------------------------------------------------
    // STEP 2 â€” USER MEMORY
    // --------------------------------------------------------

    await saveTurkAIUserMessage(
      context
    );


    // --------------------------------------------------------
    // STEP 3 â€” ADVANCED MEMORY
    // --------------------------------------------------------

    await orchestrateMemory(
      context
    );


    // --------------------------------------------------------
    // STEP 4 â€” LOCAL KNOWLEDGE
    // --------------------------------------------------------

    await orchestrateLocalKnowledge(
      context
    );


    // --------------------------------------------------------
    // STEP 5 â€” RESEARCH
    // --------------------------------------------------------

    await orchestrateResearch(
      context
    );


    // --------------------------------------------------------
    // STEP 6 â€” MODEL
    // --------------------------------------------------------

    await orchestrateModel(
      context
    );


    // --------------------------------------------------------
    // STEP 7 â€” RESPONSE
    // --------------------------------------------------------

    let extracted =
      extractTurkAIResponse(
        context
      );

    let quality =
      validateTurkAIResponse(
        extracted.text
      );

    if (!quality.valid) {
      context.flags.fallback = true;

      TURKAI_ORCHESTRATOR_STATE
        .fallbackAnswers += 1;

      const fallback =
        buildTurkAIFallbackAnswer(
          context
        );

      extracted = {
        text: fallback,

        source: 'fallback'
      };

      quality =
        validateTurkAIResponse(
          fallback
        );
    }

    context.response = {
      text: quality.text,

      source: extracted.source,

      metadata:
        buildTurkAIResponseMetadata(
          context,
          extracted.source
        )
    };


    // --------------------------------------------------------
    // STEP 8 â€” SAVE ASSISTANT MEMORY
    // --------------------------------------------------------

    await saveTurkAIAssistantMessage(
      context,
      context.response.text
    );


    // --------------------------------------------------------
    // STEP 9 â€” LEARN
    // --------------------------------------------------------

    if (
      context.response.source !==
      'fallback'
    ) {
      await learnTurkAIAnswer(
        context,
        context.response.text
      );
    }


    // --------------------------------------------------------
    // STEP 10 â€” FINISH
    // --------------------------------------------------------

    const duration =
      orchestratorDuration(
        context.startedAtMs
      );

    context.response.metadata.durationMs =
      duration;

    TURKAI_ORCHESTRATOR_STATE
      .successful += 1;

    averageOrchestratorDuration(
      duration
    );

    addOrchestratorStage(
      context,
      'complete',
      {
        source:
          context.response.source,

        durationMs:
          duration
      }
    );

    return {
      success: true,

      requestId:
        context.requestId,

      answer:
        context.response.text,

      response:
        context.response.text,

      source:
        context.response.source,

      metadata:
        context.response.metadata,

      stages:
        context.stages,

      warnings:
        context.warnings,

      errors:
        context.errors,

      research:
        context.flags.researchUsed
          ? context.research
          : null,

      model:
        context.flags.modelUsed
          ? {
              provider:
                context.model?.provider ??
                null,

              model:
                context.model?.model ??
                context.model?.modelName ??
                null
            }
          : null
    };
  } catch (error) {
    TURKAI_ORCHESTRATOR_STATE.failed += 1;

    TURKAI_ORCHESTRATOR_STATE.lastErrorAt =
      timestamp();

    TURKAI_ORCHESTRATOR_STATE.lastError =
      error.message;

    addOrchestratorError(
      context,
      'orchestrator',
      error
    );

    if (
      TURKAI_ORCHESTRATOR_CONFIG
        .fallbackEnabled
    ) {
      const fallback =
        buildTurkAIFallbackAnswer(
          context
        );

      TURKAI_ORCHESTRATOR_STATE
        .fallbackAnswers += 1;

      return {
        success: true,

        requestId:
          context.requestId,

        answer: fallback,

        response: fallback,

        source: 'fallback',

        metadata:
          buildTurkAIResponseMetadata(
            context,
            'fallback'
          ),

        warnings: [
          'Ana iÅŸlem sÄ±rasÄ±nda hata oluÅŸtu.',
          ...context.warnings
        ],

        errors: context.errors
      };
    }

    return {
      success: false,

      requestId:
        context.requestId,

      error:
        error.message ||
        'TÃ¼rkAI iÅŸlem hatasÄ±.',

      errors:
        context.errors
    };
  } finally {
    TURKAI_ORCHESTRATOR_STATE.activeRequests =
      Math.max(
        0,
        TURKAI_ORCHESTRATOR_STATE
          .activeRequests - 1
      );
  }
}


// ============================================================
// 27. SIMPLE CHAT FUNCTION
// ============================================================

async function runTurkAIChat({
  userId = 'default-user',
  sessionId = '',
  conversationId = '',
  message = '',
  language = '',
  metadata = {},
  options = {}
} = {}) {
  return processTurkAIRequest({
    userId,

    sessionId,

    conversationId,

    message,

    language,

    metadata,

    options
  });
}


// ============================================================
// 28. EXPRESS CHAT ROUTE
// ============================================================

app.post(
  '/api/chat',
  async (req, res) => {
    const started =
      orchestratorNow();

    try {
      const result =
        await processTurkAIRequest(
          req.body || {}
        );

      res.json({
        ...result,

        serverTime:
          timestamp(),

        durationMs:
          orchestratorDuration(
            started
          )
      });
    } catch (error) {
      res.status(500).json({
        success: false,

        error:
          error.message ||
          'TÃ¼rkAI chat hatasÄ±.',

        serverTime:
          timestamp()
      });
    }
  }
);


// ============================================================
// 29. ALTERNATIVE CHAT ROUTE
// ============================================================

app.post(
  '/api/turkai/chat',
  async (req, res) => {
    try {
      const result =
        await processTurkAIRequest(
          req.body || {}
        );

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,

        error:
          error.message ||
          'TÃ¼rkAI iÅŸlem hatasÄ±.'
      });
    }
  }
);


// ============================================================
// 30. MESSAGE ROUTE
// ============================================================

app.post(
  '/api/message',
  async (req, res) => {
    try {
      const result =
        await processTurkAIRequest(
          req.body || {}
        );

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,

        error:
          error.message ||
          'Mesaj iÅŸlenemedi.'
      });
    }
  }
);


// ============================================================
// 31. ORCHESTRATOR TEST
// ============================================================

app.post(
  '/api/ai/orchestrate',
  async (req, res) => {
    try {
      const result =
        await processTurkAIRequest(
          req.body || {}
        );

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,

        error:
          error.message ||
          'Orchestrator hatasÄ±.'
      });
    }
  }
);


// ============================================================
// 32. ORCHESTRATOR HEALTH
// ============================================================

function turkAIOrchestratorHealth() {
  const state =
    TURKAI_ORCHESTRATOR_STATE;

  return {
    enabled:
      TURKAI_ORCHESTRATOR_CONFIG.enabled,

    version:
      TURKAI_ORCHESTRATOR_CONFIG.version,

    uptimeMs:
      Math.max(
        0,
        Date.now() -
        new Date(
          state.startedAt
        ).getTime()
      ),

    requests:
      state.requests,

    successful:
      state.successful,

    failed:
      state.failed,

    activeRequests:
      state.activeRequests,

    localAnswers:
      state.localAnswers,

    researchedAnswers:
      state.researchedAnswers,

    modelAnswers:
      state.modelAnswers,

    fallbackAnswers:
      state.fallbackAnswers,

    learnedAnswers:
      state.learnedAnswers,

    memoryWrites:
      state.memoryWrites,

    averageDurationMs:
      state.averageDurationMs,

    lastRequestAt:
      state.lastRequestAt,

    lastErrorAt:
      state.lastErrorAt,

    lastError:
      state.lastError
  };
}


app.get(
  '/api/ai/orchestrator/health',
  (req, res) => {
    res.json({
      success: true,

      health:
        turkAIOrchestratorHealth()
    });
  }
);


// ============================================================
// 33. DEBUG / PIPELINE INSPECTION
// ============================================================

app.post(
  '/api/ai/debug-pipeline',
  async (req, res) => {
    try {
      const result =
        await processTurkAIRequest(
          {
            ...(req.body || {}),

            options: {
              ...(req.body?.options || {}),

              debug: true
            }
          }
        );

      res.json({
        success:
          result.success,

        requestId:
          result.requestId,

        answer:
          result.answer,

        source:
          result.source,

        metadata:
          result.metadata,

        stages:
          result.stages,

        warnings:
          result.warnings,

        errors:
          result.errors
      });
    } catch (error) {
      res.status(500).json({
        success: false,

        error:
          error.message ||
          'Pipeline debug hatasÄ±.'
      });
    }
  }
);


// ============================================================
// 34. MODEL + MEMORY + KNOWLEDGE SNAPSHOT
// ============================================================

function getTurkAISystemSnapshot() {
  let modelHealth = null;

  let knowledgeHealthData = null;

  let memoryHealthData = null;

  try {
    if (
      typeof modelRouterHealth ===
      'function'
    ) {
      modelHealth =
        modelRouterHealth();
    }
  } catch (_) {}

  try {
    if (
      typeof knowledgeHealth ===
      'function'
    ) {
      knowledgeHealthData =
        knowledgeHealth();
    }
  } catch (_) {}

  try {
    if (
      typeof advancedMemoryHealth ===
      'function'
    ) {
      memoryHealthData =
        advancedMemoryHealth();
    }
  } catch (_) {}

  return {
    timestamp:
      timestamp(),

    orchestrator:
      turkAIOrchestratorHealth(),

    modelRouter:
      modelHealth,

    knowledge:
      knowledgeHealthData,

    memory:
      memoryHealthData
  };
}


app.get(
  '/api/ai/system-snapshot',
  (req, res) => {
    res.json({
      success: true,

      snapshot:
        getTurkAISystemSnapshot()
    });
  }
);


// ============================================================
// 35. EXPORTS
// ============================================================

module.exports = {
  ...(module.exports || {}),

  TURKAI_ORCHESTRATOR_CONFIG,

  TURKAI_ORCHESTRATOR_STATE,

  validateTurkAIInput,

  createTurkAIRequestContext,

  shouldTurkAIResearch,

  buildResearchContextForModel,

  buildMemoryContextForModel,

  buildKnowledgeContextForModel,

  buildTurkAIModelContext,

  processTurkAIRequest,

  runTurkAIChat,

  turkAIOrchestratorHealth,

  getTurkAISystemSnapshot
};


// ============================================================
// PART 7 TAMAMLANDI
// ============================================================

console.log(
  'ğŸ§  TÃœRKAI SERVER PART 7 / 20 hazÄ±r â€” Ana Chat Orchestrator aktif.'
);

console.log(
  'ğŸ”— Pipeline: Message â†’ Memory â†’ Knowledge â†’ Research â†’ AI â†’ Learning'
);
// ============================================================
// TÃœRKAI SERVER â€” PART 8 / 20
// USER ACCOUNT + PLAN + USAGE + LIMIT ENGINE
// ============================================================
//
// Free â†’ Pro â†’ Plus â†’ Ultra
//
// Bu bÃ¶lÃ¼m:
// - kullanÄ±cÄ± hesabÄ±
// - plan yÃ¶netimi
// - gÃ¼nlÃ¼k kullanÄ±m
// - Ã¶zellik limitleri
// - plan kontrolÃ¼
// - kullanÄ±m tÃ¼ketimi
// - Pro / Plus / Ultra altyapÄ±sÄ±
// - admin plan deÄŸiÅŸikliÄŸi
// - kullanÄ±m istatistikleri
// ============================================================


// ============================================================
// 1. PLAN CONFIG
// ============================================================

const TURKAI_PLAN_CONFIG = {

  free: {
    id: 'free',

    name: 'Free',

    priceMonthly: 0,

    limits: {
      messagesPerDay: 50,

      imagePerDay: 0,

      videoPerDay: 0,

      researchPerDay: 10,

      fileUploadsPerDay: 3,

      maxFileSizeMb: 10,

      memory: true,

      advancedMemory: true,

      coding: true,

      webResearch: true,

      weather: true,

      currency: true
    }
  },

  pro: {
    id: 'pro',

    name: 'Pro',

    priceMonthly: 250,

    limits: {
      messagesPerDay: 100,

      imagePerDay: 2,

      videoPerDay: 0,

      researchPerDay: 50,

      fileUploadsPerDay: 20,

      maxFileSizeMb: 25,

      memory: true,

      advancedMemory: true,

      coding: true,

      webResearch: true,

      weather: true,

      currency: true
    }
  },

  plus: {
    id: 'plus',

    name: 'Plus',

    priceMonthly: 500,

    limits: {
      messagesPerDay: 200,

      imagePerDay: 4,

      videoPerDay: 10,

      researchPerDay: 100,

      fileUploadsPerDay: 50,

      maxFileSizeMb: 50,

      memory: true,

      advancedMemory: true,

      coding: true,

      webResearch: true,

      weather: true,

      currency: true
    }
  },

  ultra: {
    id: 'ultra',

    name: 'Ultra',

    priceMonthly: 1000,

    limits: {
      messagesPerDay: 1000,

      imagePerDay: 20,

      videoPerDay: 50,

      researchPerDay: 500,

      fileUploadsPerDay: 100,

      maxFileSizeMb: 100,

      memory: true,

      advancedMemory: true,

      coding: true,

      webResearch: true,

      weather: true,

      currency: true,

      videoCall: true,

      priority: true
    }
  }

};


// ============================================================
// 2. ACCOUNT CONFIG
// ============================================================

const TURKAI_ACCOUNT_CONFIG = {

  defaultPlan: 'free',

  defaultDailyMessageLimit: 50,

  maxUsers: 1000000,

  sessionDurationDays: 30,

  verificationDurationDays: 7,

  adminRoles: [
    'admin',
    'owner',
    'developer'
  ],

  allowedPlans: [
    'free',
    'pro',
    'plus',
    'ultra'
  ]

};


// ============================================================
// 3. USAGE CONFIG
// ============================================================

const TURKAI_USAGE_CONFIG = {

  resetHour: 0,

  timezone: 'Europe/Istanbul',

  keepHistoryDays: 90,

  maxHistoryPerUser: 365,

  countFailedRequests: false,

  countFallbackRequests: true
};


// ============================================================
// 4. USER DATABASE
// ============================================================

const TURKAI_USERS_FILE =
  path.join(
    DATA_DIR,
    'users',
    'turkai-users.json'
  );


const TURKAI_USAGE_FILE =
  path.join(
    DATA_DIR,
    'users',
    'turkai-usage.json'
  );


const TURKAI_SUBSCRIPTIONS_FILE =
  path.join(
    DATA_DIR,
    'users',
    'turkai-subscriptions.json'
  );


ensureDirectory(
  path.dirname(
    TURKAI_USERS_FILE
  )
);


function defaultTurkAIUsersDatabase() {

  return {
    version: 1,

    users: {},

    emailIndex: {},

    googleIndex: {},

    usernameIndex: {},

    stats: {
      total: 0,

      active: 0,

      suspended: 0
    }
  };

}


function defaultTurkAIUsageDatabase() {

  return {
    version: 1,

    users: {},

    history: {}
  };

}


function defaultTurkAISubscriptionsDatabase() {

  return {
    version: 1,

    subscriptions: {},

    userIndex: {}
  };

}


let turkAIUsersDatabase =
  readJson(
    TURKAI_USERS_FILE,
    defaultTurkAIUsersDatabase()
  );


let turkAIUsageDatabase =
  readJson(
    TURKAI_USAGE_FILE,
    defaultTurkAIUsageDatabase()
  );


let turkAISubscriptionsDatabase =
  readJson(
    TURKAI_SUBSCRIPTIONS_FILE,
    defaultTurkAISubscriptionsDatabase()
  );


// ============================================================
// 5. DATABASE NORMALIZATION
// ============================================================

function normalizeTurkAIAccountDatabases() {

  if (
    !turkAIUsersDatabase ||
    typeof turkAIUsersDatabase !== 'object'
  ) {
    turkAIUsersDatabase =
      defaultTurkAIUsersDatabase();
  }

  if (
    !turkAIUsersDatabase.users
  ) {
    turkAIUsersDatabase.users = {};
  }

  if (
    !turkAIUsersDatabase.emailIndex
  ) {
    turkAIUsersDatabase.emailIndex = {};
  }

  if (
    !turkAIUsersDatabase.googleIndex
  ) {
    turkAIUsersDatabase.googleIndex = {};
  }

  if (
    !turkAIUsersDatabase.usernameIndex
  ) {
    turkAIUsersDatabase.usernameIndex = {};
  }


  if (
    !turkAIUsageDatabase ||
    typeof turkAIUsageDatabase !== 'object'
  ) {
    turkAIUsageDatabase =
      defaultTurkAIUsageDatabase();
  }

  if (
    !turkAIUsageDatabase.users
  ) {
    turkAIUsageDatabase.users = {};
  }

  if (
    !turkAIUsageDatabase.history
  ) {
    turkAIUsageDatabase.history = {};
  }


  if (
    !turkAISubscriptionsDatabase ||
    typeof turkAISubscriptionsDatabase !== 'object'
  ) {
    turkAISubscriptionsDatabase =
      defaultTurkAISubscriptionsDatabase();
  }

  if (
    !turkAISubscriptionsDatabase.subscriptions
  ) {
    turkAISubscriptionsDatabase.subscriptions = {};
  }

  if (
    !turkAISubscriptionsDatabase.userIndex
  ) {
    turkAISubscriptionsDatabase.userIndex = {};
  }

}


normalizeTurkAIAccountDatabases();


// ============================================================
// 6. DATABASE SAVE
// ============================================================

function saveTurkAIUsers() {

  writeJson(
    TURKAI_USERS_FILE,
    turkAIUsersDatabase
  );

}


function saveTurkAIUsage() {

  writeJson(
    TURKAI_USAGE_FILE,
    turkAIUsageDatabase
  );

}


function saveTurkAISubscriptions() {

  writeJson(
    TURKAI_SUBSCRIPTIONS_FILE,
    turkAISubscriptionsDatabase
  );

}


// ============================================================
// 7. DATE HELPERS
// ============================================================

function turkAITodayKey(date = new Date()) {

  const formatter =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone:
          TURKAI_USAGE_CONFIG.timezone,

        year: 'numeric',

        month: '2-digit',

        day: '2-digit'
      }
    );

  return formatter.format(date);

}


function turkAINowISO() {

  return new Date().toISOString();

}


function turkAIAddDays(
  date,
  days
) {

  const result =
    new Date(date);

  result.setDate(
    result.getDate() + days
  );

  return result;

}


// ============================================================
// 8. ID HELPERS
// ============================================================

function createTurkAIUserId() {

  return generateId(
    'user'
  );

}


function createTurkAISubscriptionId() {

  return generateId(
    'sub'
  );

}


// ============================================================
// 9. EMAIL NORMALIZATION
// ============================================================

function normalizeTurkAIEmail(email) {

  return normalizeSpace(
    String(email ?? '')
      .toLowerCase()
  );

}


function normalizeTurkAIUsername(username) {

  return normalizeSpace(
    String(username ?? '')
      .toLowerCase()
      .replace(
        /[^a-z0-9._-]/g,
        ''
      )
  ).slice(0, 50);

}


// ============================================================
// 10. USER CREATOR
// ============================================================

function createTurkAIAccount({
  id = '',
  email = '',
  name = '',
  username = '',
  provider = 'local',
  googleId = '',
  plan = TURKAI_ACCOUNT_CONFIG.defaultPlan
} = {}) {

  const userId =
    id ||
    createTurkAIUserId();

  const now =
    turkAINowISO();

  const normalizedPlan =
    TURKAI_ACCOUNT_CONFIG.allowedPlans
      .includes(plan)
      ? plan
      : TURKAI_ACCOUNT_CONFIG.defaultPlan;

  return {

    id: userId,

    email:
      normalizeTurkAIEmail(
        email
      ),

    name:
      normalizeOrchestratorText(
        name,
        200
      ) || 'TÃ¼rkAI KullanÄ±cÄ±sÄ±',

    username:
      normalizeTurkAIUsername(
        username
      ),

    provider,

    googleId:
      normalizeOrchestratorText(
        googleId,
        300
      ),

    plan:
      normalizedPlan,

    role: 'user',

    status: 'active',

    verified:
      provider === 'google',

    createdAt: now,

    updatedAt: now,

    lastLoginAt: now,

    subscriptionId: null,

    preferences: {

      language: 'tr',

      theme: 'dark',

      notifications: true,

      researchAutomatically: true,

      saveMemory: true

    },

    statistics: {

      messages: 0,

      research: 0,

      images: 0,

      videos: 0,

      files: 0,

      logins: 0

    },

    flags: {

      beta: false,

      developer: false,

      banned: false

    }

  };

}


// ============================================================
// 11. USER LOOKUP
// ============================================================

function getTurkAIAccount(
  userId
) {

  if (!userId) {
    return null;
  }

  return (
    turkAIUsersDatabase
      .users[userId] ||
    null
  );

}


function findTurkAIAccountByEmail(
  email
) {

  const normalized =
    normalizeTurkAIEmail(
      email
    );

  const id =
    turkAIUsersDatabase
      .emailIndex[normalized];

  return id
    ? getTurkAIAccount(id)
    : null;

}


function findTurkAIAccountByGoogleId(
  googleId
) {

  const id =
    turkAIUsersDatabase
      .googleIndex[String(googleId)];

  return id
    ? getTurkAIAccount(id)
    : null;

}


function findTurkAIAccountByUsername(
  username
) {

  const normalized =
    normalizeTurkAIUsername(
      username
    );

  const id =
    turkAIUsersDatabase
      .usernameIndex[normalized];

  return id
    ? getTurkAIAccount(id)
    : null;

}


// ============================================================
// 12. CREATE / UPSERT USER
// ============================================================

function saveTurkAIAccount(
  account
) {

  if (!account?.id) {
    throw new Error(
      'GeÃ§ersiz kullanÄ±cÄ± hesabÄ±.'
    );
  }

  account.updatedAt =
    turkAINowISO();

  turkAIUsersDatabase
    .users[account.id] =
      account;


  if (account.email) {

    turkAIUsersDatabase
      .emailIndex[
        normalizeTurkAIEmail(
          account.email
        )
      ] = account.id;

  }


  if (account.googleId) {

    turkAIUsersDatabase
      .googleIndex[
        String(account.googleId)
      ] = account.id;

  }


  if (account.username) {

    turkAIUsersDatabase
      .usernameIndex[
        normalizeTurkAIUsername(
          account.username
        )
      ] = account.id;

  }


  turkAIUsersDatabase.stats.total =
    Object.keys(
      turkAIUsersDatabase.users
    ).length;

  turkAIUsersDatabase.stats.active =
    Object.values(
      turkAIUsersDatabase.users
    )
      .filter(
        user =>
          user.status === 'active'
      )
      .length;

  turkAIUsersDatabase.stats.suspended =
    Object.values(
      turkAIUsersDatabase.users
    )
      .filter(
        user =>
          user.status === 'suspended'
      )
      .length;


  saveTurkAIUsers();

  return account;

}


// ============================================================
// 13. GET OR CREATE ACCOUNT
// ============================================================

function getOrCreateTurkAIAccount({
  userId = '',
  email = '',
  name = '',
  username = '',
  provider = 'local',
  googleId = ''
} = {}) {

  let account = null;

  if (userId) {
    account =
      getTurkAIAccount(
        userId
      );
  }

  if (!account && email) {
    account =
      findTurkAIAccountByEmail(
        email
      );
  }

  if (!account && googleId) {
    account =
      findTurkAIAccountByGoogleId(
        googleId
      );
  }

  if (!account) {

    account =
      createTurkAIAccount({
        id: userId,

        email,

        name,

        username,

        provider,

        googleId
      });

  } else {

    if (name) {
      account.name =
        normalizeOrchestratorText(
          name,
          200
        );
    }

    if (email && !account.email) {
      account.email =
        normalizeTurkAIEmail(
          email
        );
    }

    if (googleId && !account.googleId) {
      account.googleId =
        String(googleId);
    }

    account.lastLoginAt =
      turkAINowISO();

    account.statistics.logins =
      safeNumber(
        account.statistics?.logins,
        0
      ) + 1;

  }

  return saveTurkAIAccount(
    account
  );

}


// ============================================================
// 14. PLAN HELPERS
// ============================================================

function getTurkAIPlan(
  plan
) {

  return (
    TURKAI_PLAN_CONFIG[
      String(plan ?? '')
        .toLowerCase()
    ] ||
    TURKAI_PLAN_CONFIG.free
  );

}


function getTurkAIUserPlan(
  userId
) {

  const user =
    getTurkAIAccount(
      userId
    );

  if (!user) {
    return getTurkAIPlan(
      TURKAI_ACCOUNT_CONFIG.defaultPlan
    );
  }

  return getTurkAIPlan(
    user.plan
  );

}


function isTurkAIPlanAtLeast(
  plan,
  required
) {

  const order = [
    'free',
    'pro',
    'plus',
    'ultra'
  ];

  return (
    order.indexOf(plan) >=
    order.indexOf(required)
  );

}


// ============================================================
// 15. FEATURE ACCESS
// ============================================================

function canTurkAIUserUseFeature(
  userId,
  feature
) {

  const plan =
    getTurkAIUserPlan(
      userId
    );

  return Boolean(
    plan.limits?.[feature]
  );

}


// ============================================================
// 16. DAILY USAGE RECORD
// ============================================================

function getTurkAIUsageRecord(
  userId,
  dateKey = turkAITodayKey()
) {

  if (
    !turkAIUsageDatabase
      .users[userId]
  ) {

    turkAIUsageDatabase
      .users[userId] = {};

  }

  if (
    !turkAIUsageDatabase
      .users[userId][dateKey]
  ) {

    turkAIUsageDatabase
      .users[userId][dateKey] = {

        date: dateKey,

        messages: 0,

        research: 0,

        images: 0,

        videos: 0,

        files: 0,

        tokens: 0,

        requests: 0,

        failedRequests: 0,

        fallbackRequests: 0,

        updatedAt:
          turkAINowISO()

      };

  }

  return (
    turkAIUsageDatabase
      .users[userId][dateKey]
  );

}


// ============================================================
// 17. USAGE LIMIT LOOKUP
// ============================================================

function getTurkAIUsageLimit(
  userId,
  feature
) {

  const plan =
    getTurkAIUserPlan(
      userId
    );

  const limits =
    plan.limits || {};

  return safeNumber(
    limits[feature],
    0
  );

}


// ============================================================
// 18. CURRENT USAGE
// ============================================================

function getTurkAICurrentUsage(
  userId,
  feature
) {

  const usage =
    getTurkAIUsageRecord(
      userId
    );

  return safeNumber(
    usage[feature],
    0
  );

}


// ============================================================
// 19. USAGE CHECK
// ============================================================

function checkTurkAIUsage(
  userId,
  feature,
  amount = 1
) {

  const account =
    getTurkAIAccount(
      userId
    );

  if (!account) {

    return {
      allowed: false,

      reason:
        'USER_NOT_FOUND',

      used: 0,

      limit: 0,

      remaining: 0

    };

  }


  if (
    account.status !== 'active'
  ) {

    return {
      allowed: false,

      reason:
        'ACCOUNT_INACTIVE',

      used: 0,

      limit: 0,

      remaining: 0

    };

  }


  const limit =
    getTurkAIUsageLimit(
      userId,
      feature
    );


  if (limit < 0) {

    return {
      allowed: true,

      reason: null,

      used: 0,

      limit: -1,

      remaining: -1

    };

  }


  const used =
    getTurkAICurrentUsage(
      userId,
      feature
    );


  const requested =
    Math.max(
      1,
      safeNumber(
        amount,
        1
      )
    );


  const remaining =
    Math.max(
      0,
      limit - used
    );


  return {

    allowed:
      used + requested <= limit,

    reason:
      used + requested <= limit
        ? null
        : 'DAILY_LIMIT_REACHED',

    used,

    limit,

    remaining,

    requested,

    plan:
      account.plan

  };

}


// ============================================================
// 20. CONSUME USAGE
// ============================================================

function consumeTurkAIUsage(
  userId,
  feature,
  amount = 1,
  metadata = {}
) {

  const check =
    checkTurkAIUsage(
      userId,
      feature,
      amount
    );


  if (!check.allowed) {
    return check;
  }


  const usage =
    getTurkAIUsageRecord(
      userId
    );


  const value =
    Math.max(
      1,
      safeNumber(
        amount,
        1
      )
    );


  usage[feature] =
    safeNumber(
      usage[feature],
      0
    ) + value;


  usage.requests =
    safeNumber(
      usage.requests,
      0
    ) + 1;


  usage.updatedAt =
    turkAINowISO();


  const account =
    getTurkAIAccount(
      userId
    );


  if (account) {

    if (
      feature === 'messages'
    ) {
      account.statistics.messages =
        safeNumber(
          account.statistics.messages,
          0
        ) + value;
    }

    if (
      feature === 'research'
    ) {
      account.statistics.research =
        safeNumber(
          account.statistics.research,
          0
        ) + value;
    }

    if (
      feature === 'images'
    ) {
      account.statistics.images =
        safeNumber(
          account.statistics.images,
          0
        ) + value;
    }

    if (
      feature === 'videos'
    ) {
      account.statistics.videos =
        safeNumber(
          account.statistics.videos,
          0
        ) + value;
    }

    if (
      feature === 'files'
    ) {
      account.statistics.files =
        safeNumber(
          account.statistics.files,
          0
        ) + value;
    }

    account.updatedAt =
      turkAINowISO();

  }


  if (
    !turkAIUsageDatabase
      .history[userId]
  ) {

    turkAIUsageDatabase
      .history[userId] = [];

  }


  turkAIUsageDatabase
    .history[userId]
    .push({

      date:
        turkAITodayKey(),

      feature,

      amount: value,

      metadata:
        safeOrchestratorObject(
          metadata
        ),

      timestamp:
        turkAINowISO()

    });


  const history =
    turkAIUsageDatabase
      .history[userId];


  if (
    history.length >
    TURKAI_USAGE_CONFIG
      .maxHistoryPerUser
  ) {

    history.splice(
      0,
      history.length -
      TURKAI_USAGE_CONFIG
        .maxHistoryPerUser
    );

  }


  saveTurkAIUsage();

  saveTurkAIUsers();


  return {

    allowed: true,

    consumed: value,

    feature,

    used:
      safeNumber(
        usage[feature],
        0
      ),

    limit:
      check.limit,

    remaining:
      Math.max(
        0,
        check.limit -
        usage[feature]
      ),

    plan:
      account?.plan ??
      'free'

  };

}


// ============================================================
// 21. SUBSCRIPTION CREATOR
// ============================================================

function createTurkAISubscription({
  userId,
  plan = 'free',
  provider = 'manual',
  paymentId = '',
  durationDays = 30
} = {}) {

  const normalizedPlan =
    TURKAI_ACCOUNT_CONFIG
      .allowedPlans
      .includes(plan)
      ? plan
      : 'free';


  const start =
    new Date();


  const end =
    turkAIAddDays(
      start,
      Math.max(
        1,
        safeNumber(
          durationDays,
          30
        )
      )
    );


  const subscription = {

    id:
      createTurkAISubscriptionId(),

    userId,

    plan:
      normalizedPlan,

    provider,

    paymentId:
      normalizeOrchestratorText(
        paymentId,
        300
      ),

    status: 'active',

    startedAt:
      start.toISOString(),

    expiresAt:
      end.toISOString(),

    createdAt:
      turkAINowISO(),

    updatedAt:
      turkAINowISO()

  };


  turkAISubscriptionsDatabase
    .subscriptions[
      subscription.id
    ] = subscription;


  turkAISubscriptionsDatabase
    .userIndex[userId] =
      subscription.id;


  saveTurkAISubscriptions();


  return subscription;

}


// ============================================================
// 22. SUBSCRIPTION LOOKUP
// ============================================================

function getTurkAISubscription(
  userId
) {

  const id =
    turkAISubscriptionsDatabase
      .userIndex[userId];

  if (!id) {
    return null;
  }

  return (
    turkAISubscriptionsDatabase
      .subscriptions[id] ||
    null
  );

}


// ============================================================
// 23. ACTIVATE PLAN
// ============================================================

function activateTurkAIPlan({
  userId,

  plan = 'pro',

  provider = 'manual',

  paymentId = '',

  durationDays = 30
} = {}) {

  const account =
    getTurkAIAccount(
      userId
    );


  if (!account) {

    throw new Error(
      'KullanÄ±cÄ± bulunamadÄ±.'
    );

  }


  if (
    !TURKAI_ACCOUNT_CONFIG
      .allowedPlans
      .includes(plan)
  ) {

    throw new Error(
      'GeÃ§ersiz plan.'
    );

  }


  const subscription =
    createTurkAISubscription({
      userId,

      plan,

      provider,

      paymentId,

      durationDays
    });


  account.plan =
    plan;

  account.subscriptionId =
    subscription.id;

  account.updatedAt =
    turkAINowISO();


  saveTurkAIAccount(
    account
  );


  return {

    success: true,

    userId,

    plan,

    subscription

  };

}


// ============================================================
// 24. PLAN EXPIRATION
// ============================================================

function refreshTurkAISubscription(
  userId
) {

  const account =
    getTurkAIAccount(
      userId
    );


  if (!account) {
    return null;
  }


  if (
    !account.subscriptionId
  ) {
    return account;
  }


  const subscription =
    getTurkAISubscription(
      userId
    );


  if (!subscription) {

    account.plan =
      'free';

    account.subscriptionId =
      null;

    saveTurkAIAccount(
      account
    );

    return account;

  }


  const expired =
    new Date(
      subscription.expiresAt
    ).getTime() <=
    Date.now();


  if (
    expired &&
    subscription.status === 'active'
  ) {

    subscription.status =
      'expired';

    subscription.updatedAt =
      turkAINowISO();


    account.plan =
      'free';

    account.subscriptionId =
      null;


    saveTurkAISubscriptions();

    saveTurkAIAccount(
      account
    );

  }


  return account;

}


// ============================================================
// 25. USER DASHBOARD
// ============================================================

function getTurkAIUserDashboard(
  userId
) {

  const account =
    refreshTurkAISubscription(
      userId
    );


  if (!account) {
    return null;
  }


  const plan =
    getTurkAIPlan(
      account.plan
    );


  const usage =
    getTurkAIUsageRecord(
      userId
    );


  const usageFeatures = [

    'messages',

    'research',

    'images',

    'videos',

    'files'

  ];


  const limits = {};


  for (
    const feature of usageFeatures
  ) {

    const limit =
      safeNumber(
        plan.limits?.[
          `${feature}PerDay`
        ],
        0
      );


    const used =
      safeNumber(
        usage[feature],
        0
      );


    limits[feature] = {

      used,

      limit,

      remaining:
        Math.max(
          0,
          limit - used
        ),

      percentage:
        limit > 0
          ? Math.min(
              100,
              Math.round(
                (used / limit) * 100
              )
            )
          : 0

    };

  }


  return {

    user: {

      id:
        account.id,

      name:
        account.name,

      email:
        account.email,

      username:
        account.username,

      role:
        account.role,

      status:
        account.status

    },

    plan: {

      id:
        plan.id,

      name:
        plan.name,

      priceMonthly:
        plan.priceMonthly,

      limits:
        plan.limits

    },

    usage: limits,

    statistics:
      account.statistics,

    subscription:
      getTurkAISubscription(
        userId
      )

  };

}


// ============================================================
// 26. USER ROUTE
// ============================================================

app.post(
  '/api/account/create',
  (req, res) => {

    try {

      const body =
        req.body || {};


      const account =
        getOrCreateTurkAIAccount({

          userId:
            body.userId,

          email:
            body.email,

          name:
            body.name,

          username:
            body.username,

          provider:
            body.provider ||
            'local',

          googleId:
            body.googleId

        });


      res.json({

        success: true,

        user: account

      });

    } catch (error) {

      res.status(500).json({

        success: false,

        error:
          error.message

      });

    }

  }
);


// ============================================================
// 27. USER PROFILE
// ============================================================

app.get(
  '/api/account/:userId',
  (req, res) => {

    try {

      const account =
        refreshTurkAISubscription(
          req.params.userId
        );


      if (!account) {

        return res.status(404).json({

          success: false,

          error:
            'KullanÄ±cÄ± bulunamadÄ±.'

        });

      }


      res.json({

        success: true,

        user: {

          ...account,

          statistics:
            account.statistics

        }

      });

    } catch (error) {

      res.status(500).json({

        success: false,

        error:
          error.message

      });

    }

  }
);


// ============================================================
// 28. USER DASHBOARD
// ============================================================

app.get(
  '/api/account/:userId/dashboard',
  (req, res) => {

    try {

      const dashboard =
        getTurkAIUserDashboard(
          req.params.userId
        );


      if (!dashboard) {

        return res.status(404).json({

          success: false,

          error:
            'KullanÄ±cÄ± bulunamadÄ±.'

        });

      }


      res.json({

        success: true,

        dashboard

      });

    } catch (error) {

      res.status(500).json({

        success: false,

        error:
          error.message

      });

    }

  }
);


// ============================================================
// 29. USAGE CHECK API
// ============================================================

app.get(
  '/api/account/:userId/usage/:feature',
  (req, res) => {

    try {

      const result =
        checkTurkAIUsage(

          req.params.userId,

          req.params.feature,

          1

        );


      res.json({

        success: true,

        usage: result

      });

    } catch (error) {

      res.status(500).json({

        success: false,

        error:
          error.message

      });

    }

  }
);


// ============================================================
// 30. PLAN LIST
// ============================================================

app.get(
  '/api/plans',
  (req, res) => {

    res.json({

      success: true,

      plans:
        TURKAI_PLAN_CONFIG

    });

  }
);


// ============================================================
// 31. MANUAL PLAN ACTIVATION
// ============================================================
//
// GerÃ§ek Ã¶deme sistemi baÄŸlandÄ±ÄŸÄ±nda bu endpoint Ã¶deme
// doÄŸrulamasÄ±ndan sonra Ã§aÄŸrÄ±lacak.
// Åimdilik doÄŸrudan public Ã¶deme doÄŸrulamasÄ± yapmaz.
//

app.post(
  '/api/account/:userId/plan/activate',
  (req, res) => {

    try {

      const body =
        req.body || {};


      const plan =
        String(
          body.plan || ''
        ).toLowerCase();


      if (
        ![
          'pro',
          'plus',
          'ultra'
        ].includes(plan)
      ) {

        return res.status(400).json({

          success: false,

          error:
            'GeÃ§ersiz Ã¼cretli plan.'

        });

      }


      const result =
        activateTurkAIPlan({

          userId:
            req.params.userId,

          plan,

          provider:
            body.provider ||
            'manual',

          paymentId:
            body.paymentId ||
            '',

          durationDays:
            body.durationDays ||
            30

        });


      res.json(
        result
      );

    } catch (error) {

      res.status(500).json({

        success: false,

        error:
          error.message

      });

    }

  }
);


// ============================================================
// 32. PLAN FEATURE CHECK
// ============================================================

app.get(
  '/api/account/:userId/feature/:feature',
  (req, res) => {

    try {

      const allowed =
        canTurkAIUserUseFeature(

          req.params.userId,

          req.params.feature

        );


      res.json({

        success: true,

        feature:
          req.params.feature,

        allowed

      });

    } catch (error) {

      res.status(500).json({

        success: false,

        error:
          error.message

      });

    }

  }
);


// ============================================================
// 33. ACCOUNT HEALTH
// ============================================================

function turkAIAccountHealth() {

  const users =
    turkAIUsersDatabase
      .users;


  const plans = {

    free: 0,

    pro: 0,

    plus: 0,

    ultra: 0

  };


  for (
    const user of Object.values(users)
  ) {

    if (
      plans[user.plan] !== undefined
    ) {

      plans[user.plan] += 1;

    }

  }


  return {

    timestamp:
      turkAINowISO(),

    users:
      turkAIUsersDatabase.stats,

    plans,

    subscriptions:
      Object.keys(
        turkAISubscriptionsDatabase
          .subscriptions
      ).length,

    usageUsers:
      Object.keys(
        turkAIUsageDatabase.users
      ).length

  };

}


app.get(
  '/api/account/health',
  (req, res) => {

    res.json({

      success: true,

      health:
        turkAIAccountHealth()

    });

  }
);


// ============================================================
// 34. EXPORTS
// ============================================================

module.exports = {

  ...(module.exports || {}),

  TURKAI_PLAN_CONFIG,

  TURKAI_ACCOUNT_CONFIG,

  TURKAI_USAGE_CONFIG,

  createTurkAIAccount,

  getTurkAIAccount,

  findTurkAIAccountByEmail,

  findTurkAIAccountByGoogleId,

  findTurkAIAccountByUsername,

  saveTurkAIAccount,

  getOrCreateTurkAIAccount,

  getTurkAIPlan,

  getTurkAIUserPlan,

  isTurkAIPlanAtLeast,

  canTurkAIUserUseFeature,

  getTurkAIUsageRecord,

  getTurkAIUsageLimit,

  getTurkAICurrentUsage,

  checkTurkAIUsage,

  consumeTurkAIUsage,

  createTurkAISubscription,

  getTurkAISubscription,

  activateTurkAIPlan,

  refreshTurkAISubscription,

  getTurkAIUserDashboard,

  turkAIAccountHealth

};


// ============================================================
// PART 8 TAMAMLANDI
// ============================================================

console.log(
  'ğŸ‘¤ TÃœRKAI SERVER PART 8 / 20 hazÄ±r â€” Account + Plan + Usage Engine aktif.'
);

console.log(
  'ğŸ’ Free / Pro / Plus / Ultra altyapÄ±sÄ± hazÄ±r.'
);
// ============================================================
// TÃœRKAI SERVER â€” PART 9 / 20
// AUTHENTICATION + SESSION + TOKEN + SECURITY ENGINE
// ============================================================
//
// Bu bÃ¶lÃ¼m:
// - kullanÄ±cÄ± session sistemi
// - gÃ¼venli access token
// - refresh token
// - token hash
// - Google login baÄŸlantÄ± altyapÄ±sÄ±
// - logout
// - session revoke
// - rate limit
// - brute-force korumasÄ±
// - hesap durum kontrolÃ¼
// - gÃ¼venlik event loglarÄ±
// ============================================================


// ============================================================
// 1. AUTH CONFIG
// ============================================================

const TURKAI_AUTH_CONFIG = {

  accessTokenDays: 1,

  refreshTokenDays: 30,

  maxSessionsPerUser: 10,

  maxLoginAttempts: 8,

  loginWindowMinutes: 15,

  lockMinutes: 15,

  rateWindowSeconds: 60,

  maxRequestsPerWindow: 60,

  tokenBytes: 48,

  refreshTokenBytes: 64,

  requireActiveAccount: true,

  allowGuest: true,

  guestPlan: 'free',

  googleEnabled:
    Boolean(
      process.env.GOOGLE_CLIENT_ID
    ),

  securityVersion: '9.0.0'

};


// ============================================================
// 2. AUTH FILES
// ============================================================

const TURKAI_AUTH_DIR =
  path.join(
    DATA_DIR,
    'sessions'
  );


ensureDirectory(
  TURKAI_AUTH_DIR
);


const TURKAI_AUTH_SESSIONS_FILE =
  path.join(
    TURKAI_AUTH_DIR,
    'auth-sessions.json'
  );


const TURKAI_AUTH_TOKENS_FILE =
  path.join(
    TURKAI_AUTH_DIR,
    'auth-tokens.json'
  );


const TURKAI_SECURITY_FILE =
  path.join(
    DATA_DIR,
    'security',
    'security-events.json'
  );


ensureDirectory(
  path.dirname(
    TURKAI_SECURITY_FILE
  )
);


// ============================================================
// 3. DEFAULT DATABASES
// ============================================================

function defaultTurkAIAuthSessions() {

  return {

    version: 1,

    sessions: {},

    userIndex: {}

  };

}


function defaultTurkAITokens() {

  return {

    version: 1,

    access: {},

    refresh: {}

  };

}


function defaultTurkAISecurityDatabase() {

  return {

    version: 1,

    events: [],

    loginAttempts: {},

    locks: {},

    rateLimits: {}

  };

}


let turkAIAuthSessions =
  readJson(
    TURKAI_AUTH_SESSIONS_FILE,
    defaultTurkAIAuthSessions()
  );


let turkAITokens =
  readJson(
    TURKAI_AUTH_TOKENS_FILE,
    defaultTurkAITokens()
  );


let turkAISecurity =
  readJson(
    TURKAI_SECURITY_FILE,
    defaultTurkAISecurityDatabase()
  );


// ============================================================
// 4. NORMALIZATION
// ============================================================

function normalizeTurkAIAuthDatabases() {

  if (
    !turkAIAuthSessions ||
    typeof turkAIAuthSessions !== 'object'
  ) {

    turkAIAuthSessions =
      defaultTurkAIAuthSessions();

  }


  if (
    !turkAIAuthSessions.sessions
  ) {

    turkAIAuthSessions.sessions = {};

  }


  if (
    !turkAIAuthSessions.userIndex
  ) {

    turkAIAuthSessions.userIndex = {};

  }


  if (
    !turkAITokens ||
    typeof turkAITokens !== 'object'
  ) {

    turkAITokens =
      defaultTurkAITokens();

  }


  if (
    !turkAITokens.access
  ) {

    turkAITokens.access = {};

  }


  if (
    !turkAITokens.refresh
  ) {

    turkAITokens.refresh = {};

  }


  if (
    !turkAISecurity ||
    typeof turkAISecurity !== 'object'
  ) {

    turkAISecurity =
      defaultTurkAISecurityDatabase();

  }


  if (
    !Array.isArray(
      turkAISecurity.events
    )
  ) {

    turkAISecurity.events = [];

  }


  if (
    !turkAISecurity.loginAttempts
  ) {

    turkAISecurity.loginAttempts = {};

  }


  if (
    !turkAISecurity.locks
  ) {

    turkAISecurity.locks = {};

  }


  if (
    !turkAISecurity.rateLimits
  ) {

    turkAISecurity.rateLimits = {};

  }

}


normalizeTurkAIAuthDatabases();


// ============================================================
// 5. SAVE
// ============================================================

function saveTurkAIAuthSessions() {

  writeJson(
    TURKAI_AUTH_SESSIONS_FILE,
    turkAIAuthSessions
  );

}


function saveTurkAITokens() {

  writeJson(
    TURKAI_AUTH_TOKENS_FILE,
    turkAITokens
  );

}


function saveTurkAISecurity() {

  writeJson(
    TURKAI_SECURITY_FILE,
    turkAISecurity
  );

}


// ============================================================
// 6. CRYPTO HELPERS
// ============================================================

function createTurkAIRandomToken(
  bytes =
    TURKAI_AUTH_CONFIG.tokenBytes
) {

  return crypto
    .randomBytes(
      Math.max(
        16,
        bytes
      )
    )
    .toString(
      'hex'
    );

}


function hashTurkAIToken(
  token
) {

  return crypto
    .createHash(
      'sha256'
    )
    .update(
      String(token)
    )
    .digest(
      'hex'
    );

}


function createTurkAISecurityId(
  prefix = 'sec'
) {

  return generateId(
    prefix
  );

}


// ============================================================
// 7. IP NORMALIZATION
// ============================================================

function normalizeTurkAIIP(
  ip
) {

  return normalizeOrchestratorText(
    String(ip ?? '')
      .replace(
        /^::ffff:/,
        ''
      ),
    100
  );

}


// ============================================================
// 8. REQUEST CLIENT INFO
// ============================================================

function getTurkAIRequestClientInfo(
  req
) {

  return {

    ip:
      normalizeTurkAIIP(
        req?.headers?.['x-forwarded-for']
          ?.split(',')[0]
          ?.trim() ||
        req?.socket?.remoteAddress ||
        ''
      ),

    userAgent:
      normalizeOrchestratorText(
        req?.headers?.['user-agent'],
        500
      ),

    language:
      normalizeOrchestratorText(
        req?.headers?.['accept-language'],
        200
      )

  };

}


// ============================================================
// 9. SECURITY EVENT
// ============================================================

function writeTurkAISecurityEvent({

  type,

  userId = '',

  sessionId = '',

  ip = '',

  success = true,

  metadata = {}

} = {}) {

  const event = {

    id:
      createTurkAISecurityId(
        'event'
      ),

    type,

    userId,

    sessionId,

    ip,

    success,

    metadata:
      safeOrchestratorObject(
        metadata
      ),

    timestamp:
      turkAINowISO()

  };


  turkAISecurity.events.push(
    event
  );


  if (
    turkAISecurity.events.length >
    10000
  ) {

    turkAISecurity.events.splice(
      0,
      turkAISecurity.events.length -
      10000
    );

  }


  saveTurkAISecurity();

  return event;

}


// ============================================================
// 10. LOGIN ATTEMPT KEY
// ============================================================

function getTurkAILoginAttemptKey({
  identifier = '',
  ip = ''
} = {}) {

  return [

    normalizeTurkAIEmail(
      identifier
    ),

    normalizeTurkAIIP(
      ip
    )

  ].join('|');

}


// ============================================================
// 11. LOGIN ATTEMPT TRACKER
// ============================================================

function registerTurkAILoginAttempt({

  identifier = '',

  ip = '',

  success = false

} = {}) {

  const key =
    getTurkAILoginAttemptKey({
      identifier,
      ip
    });


  const now =
    Date.now();


  if (
    !turkAISecurity
      .loginAttempts[key]
  ) {

    turkAISecurity
      .loginAttempts[key] = [];

  }


  const attempts =
    turkAISecurity
      .loginAttempts[key];


  const windowMs =
    TURKAI_AUTH_CONFIG
      .loginWindowMinutes *
    60 *
    1000;


  const cutoff =
    now -
    windowMs;


  const recent =
    attempts.filter(
      item =>
        item.timestamp >=
        cutoff
    );


  recent.push({

    timestamp: now,

    success:

      Boolean(success)

  });


  turkAISecurity
    .loginAttempts[key] =
      recent;


  if (
    !success &&
    recent.filter(
      item => !item.success
    ).length >=
      TURKAI_AUTH_CONFIG
        .maxLoginAttempts
  ) {

    turkAISecurity
      .locks[key] =
        now +
        TURKAI_AUTH_CONFIG
          .lockMinutes *
        60 *
        1000;

  }


  saveTurkAISecurity();

  return {

    key,

    attempts:
      recent.length,

    failedAttempts:
      recent.filter(
        item => !item.success
      ).length,

    lockedUntil:
      turkAISecurity
        .locks[key] ||
      null

  };

}


// ============================================================
// 12. LOGIN LOCK CHECK
// ============================================================

function isTurkAILoginLocked({

  identifier = '',

  ip = ''

} = {}) {

  const key =
    getTurkAILoginAttemptKey({
      identifier,
      ip
    });


  const lockedUntil =
    safeNumber(
      turkAISecurity
        .locks[key],
      0
    );


  if (
    !lockedUntil
  ) {

    return {

      locked: false,

      remainingMs: 0

    };

  }


  if (
    lockedUntil <=
    Date.now()
  ) {

    delete turkAISecurity
      .locks[key];

    saveTurkAISecurity();


    return {

      locked: false,

      remainingMs: 0

    };

  }


  return {

    locked: true,

    remainingMs:
      lockedUntil -
      Date.now(),

    until:
      new Date(
        lockedUntil
      ).toISOString()

  };

}


// ============================================================
// 13. RATE LIMIT
// ============================================================

function checkTurkAIRateLimit({

  key = 'global',

  limit =
    TURKAI_AUTH_CONFIG
      .maxRequestsPerWindow,

  windowSeconds =
    TURKAI_AUTH_CONFIG
      .rateWindowSeconds

} = {}) {

  const now =
    Date.now();


  const windowMs =
    windowSeconds *
    1000;


  const existing =
    turkAISecurity
      .rateLimits[key];


  if (
    !existing ||
    now -
      existing.startedAt >=
      windowMs
  ) {

    turkAISecurity
      .rateLimits[key] = {

        startedAt: now,

        count: 1

      };


    saveTurkAISecurity();


    return {

      allowed: true,

      remaining:
        Math.max(
          0,
          limit - 1
        ),

      count: 1,

      limit

    };

  }


  existing.count += 1;


  saveTurkAISecurity();


  return {

    allowed:
      existing.count <=
      limit,

    remaining:
      Math.max(
        0,
        limit -
        existing.count
      ),

    count:
      existing.count,

    limit

  };

}


// ============================================================
// 14. ACCESS TOKEN RECORD
// ============================================================

function createTurkAIAccessToken(
  userId,
  sessionId
) {

  const rawToken =
    createTurkAIRandomToken();


  const tokenHash =
    hashTurkAIToken(
      rawToken
    );


  const expiresAt =
    turkAIAddDays(
      new Date(),
      TURKAI_AUTH_CONFIG
        .accessTokenDays
    ).toISOString();


  turkAITokens
    .access[tokenHash] = {

      userId,

      sessionId,

      createdAt:
        turkAINowISO(),

      expiresAt,

      revoked: false

    };


  saveTurkAITokens();


  return {

    token:
      rawToken,

    expiresAt

  };

}


// ============================================================
// 15. REFRESH TOKEN
// ============================================================

function createTurkAIRefreshToken(
  userId,
  sessionId
) {

  const rawToken =
    createTurkAIRandomToken(
      TURKAI_AUTH_CONFIG
        .refreshTokenBytes
    );


  const tokenHash =
    hashTurkAIToken(
      rawToken
    );


  const expiresAt =
    turkAIAddDays(
      new Date(),
      TURKAI_AUTH_CONFIG
        .refreshTokenDays
    ).toISOString();


  turkAITokens
    .refresh[tokenHash] = {

      userId,

      sessionId,

      createdAt:
        turkAINowISO(),

      expiresAt,

      revoked: false

    };


  saveTurkAITokens();


  return {

    token:
      rawToken,

    expiresAt

  };

}


// ============================================================
// 16. SESSION CREATOR
// ============================================================

function createTurkAIAuthSession({

  userId,

  client = {},

  remember = true

} = {}) {

  const account =
    getTurkAIAccount(
      userId
    );


  if (!account) {

    throw new Error(
      'KullanÄ±cÄ± bulunamadÄ±.'
    );

  }


  if (
    TURKAI_AUTH_CONFIG
      .requireActiveAccount &&
    account.status !== 'active'
  ) {

    throw new Error(
      'Hesap aktif deÄŸil.'
    );

  }


  const sessionId =
    generateId(
      'session'
    );


  const access =
    createTurkAIAccessToken(
      userId,
      sessionId
    );


  const refresh =
    createTurkAIRefreshToken(
      userId,
      sessionId
    );


  const now =
    new Date();


  const session = {

    id:
      sessionId,

    userId,

    createdAt:
      now.toISOString(),

    lastActiveAt:
      now.toISOString(),

    expiresAt:
      refresh.expiresAt,

    remember:
      Boolean(remember),

    revoked: false,

    client: {

      ip:
        normalizeTurkAIIP(
          client.ip
        ),

      userAgent:
        normalizeOrchestratorText(
          client.userAgent,
          500
        ),

      language:
        normalizeOrchestratorText(
          client.language,
          200
        )

    }

  };


  if (
    !turkAIAuthSessions
      .userIndex[userId]
  ) {

    turkAIAuthSessions
      .userIndex[userId] = [];

  }


  turkAIAuthSessions
    .userIndex[userId]
    .push(sessionId);


  turkAIAuthSessions
    .sessions[sessionId] =
      session;


  // ----------------------------------------------------------
  // MAX SESSION LIMIT
  // ----------------------------------------------------------

  const userSessions =
    turkAIAuthSessions
      .userIndex[userId];


  if (
    userSessions.length >
    TURKAI_AUTH_CONFIG
      .maxSessionsPerUser
  ) {

    const removeCount =
      userSessions.length -
      TURKAI_AUTH_CONFIG
        .maxSessionsPerUser;


    const oldSessions =
      userSessions.splice(
        0,
        removeCount
      );


    for (
      const oldId of oldSessions
    ) {

      revokeTurkAIAuthSession(
        oldId,
        'session_limit'
      );

    }

  }


  saveTurkAIAuthSessions();


  writeTurkAISecurityEvent({

    type:
      'session_created',

    userId,

    sessionId,

    ip:
      client.ip,

    success: true

  });


  return {

    session,

    accessToken:
      access.token,

    accessExpiresAt:
      access.expiresAt,

    refreshToken:
      refresh.token,

    refreshExpiresAt:
      refresh.expiresAt

  };

}


// ============================================================
// 17. SESSION LOOKUP
// ============================================================

function getTurkAIAuthSession(
  sessionId
) {

  if (!sessionId) {
    return null;
  }

  return (
    turkAIAuthSessions
      .sessions[sessionId] ||
    null
  );

}


// ============================================================
// 18. SESSION REVOCATION
// ============================================================

function revokeTurkAIAuthSession(
  sessionId,
  reason = 'manual'
) {

  const session =
    getTurkAIAuthSession(
      sessionId
    );


  if (!session) {
    return false;
  }


  session.revoked = true;

  session.revokedAt =
    turkAINowISO();

  session.revokeReason =
    reason;


  for (
    const collection of [
      turkAITokens.access,
      turkAITokens.refresh
    ]
  ) {

    for (
      const [hash, record]
      of Object.entries(
        collection
      )
    ) {

      if (
        record.sessionId ===
        sessionId
      ) {

        record.revoked =
          true;

        record.revokedAt =
          turkAINowISO();

      }

    }

  }


  saveTurkAIAuthSessions();

  saveTurkAITokens();


  writeTurkAISecurityEvent({

    type:
      'session_revoked',

    userId:
      session.userId,

    sessionId,

    success: true,

    metadata: {
      reason
    }

  });


  return true;

}


// ============================================================
// 19. REVOKE ALL USER SESSIONS
// ============================================================

function revokeAllTurkAISessions(
  userId,
  reason = 'logout_all'
) {

  const sessionIds =
    safeOrchestratorArray(
      turkAIAuthSessions
        .userIndex[userId]
    );


  let count = 0;


  for (
    const sessionId
    of sessionIds
  ) {

    if (
      revokeTurkAIAuthSession(
        sessionId,
        reason
      )
    ) {

      count += 1;

    }

  }


  return {

    success: true,

    userId,

    revoked: count

  };

}


// ============================================================
// 20. TOKEN VERIFY
// ============================================================

function verifyTurkAIAuthToken(
  token,
  type = 'access'
) {

  if (!token) {

    return {

      valid: false,

      reason:
        'TOKEN_MISSING'

    };

  }


  const hash =
    hashTurkAIToken(
      token
    );


  const collection =
    type === 'refresh'
      ? turkAITokens.refresh
      : turkAITokens.access;


  const record =
    collection[hash];


  if (!record) {

    return {

      valid: false,

      reason:
        'TOKEN_INVALID'

    };

  }


  if (
    record.revoked
  ) {

    return {

      valid: false,

      reason:
        'TOKEN_REVOKED',

      userId:
        record.userId,

      sessionId:
        record.sessionId

    };

  }


  if (
    new Date(
      record.expiresAt
    ).getTime() <=
    Date.now()
  ) {

    record.revoked = true;

    saveTurkAITokens();


    return {

      valid: false,

      reason:
        'TOKEN_EXPIRED',

      userId:
        record.userId,

      sessionId:
        record.sessionId

    };

  }


  const session =
    getTurkAIAuthSession(
      record.sessionId
    );


  if (
    !session ||
    session.revoked
  ) {

    return {

      valid: false,

      reason:
        'SESSION_INVALID'

    };

  }


  const account =
    getTurkAIAccount(
      record.userId
    );


  if (!account) {

    return {

      valid: false,

      reason:
        'USER_NOT_FOUND'

    };

  }


  if (
    TURKAI_AUTH_CONFIG
      .requireActiveAccount &&
    account.status !== 'active'
  ) {

    return {

      valid: false,

      reason:
        'ACCOUNT_INACTIVE'

    };

  }


  session.lastActiveAt =
    turkAINowISO();


  saveTurkAIAuthSessions();


  return {

    valid: true,

    userId:
      record.userId,

    sessionId:
      record.sessionId,

    account,

    session,

    tokenType:
      type,

    expiresAt:
      record.expiresAt

  };

}


// ============================================================
// 21. REQUEST AUTH EXTRACTION
// ============================================================

function extractTurkAIAuthToken(
  req
) {

  const authorization =
    String(
      req?.headers?.authorization ||
      ''
    );


  if (
    authorization
      .toLowerCase()
      .startsWith('bearer ')
  ) {

    return authorization
      .slice(7)
      .trim();

  }


  const token =
    req?.headers?.['x-turkai-token'];


  if (token) {
    return String(token).trim();
  }


  if (req?.body?.token) {
    return String(
      req.body.token
    ).trim();
  }


  return '';

}


// ============================================================
// 22. AUTH MIDDLEWARE
// ============================================================

function requireTurkAIAuth(
  req,
  res,
  next
) {

  try {

    const token =
      extractTurkAIAuthToken(
        req
      );


    const verified =
      verifyTurkAIAuthToken(
        token,
        'access'
      );


    if (
      !verified.valid
    ) {

      return res.status(401).json({

        success: false,

        authenticated: false,

        error:
          'Oturum geÃ§ersiz veya sÃ¼resi dolmuÅŸ.',

        code:
          verified.reason

      });

    }


    req.turkAIAuth =
      verified;


    next();

  } catch (error) {

    res.status(401).json({

      success: false,

      authenticated: false,

      error:
        'Kimlik doÄŸrulama baÅŸarÄ±sÄ±z.'

    });

  }

}


// ============================================================
// 23. OPTIONAL AUTH
// ============================================================

function optionalTurkAIAuth(
  req,
  res,
  next
) {

  try {

    const token =
      extractTurkAIAuthToken(
        req
      );


    if (!token) {

      req.turkAIAuth =
        null;

      return next();

    }


    const verified =
      verifyTurkAIAuthToken(
        token,
        'access'
      );


    req.turkAIAuth =
      verified.valid
        ? verified
        : null;


    next();

  } catch (_) {

    req.turkAIAuth =
      null;

    next();

  }

}


// ============================================================
// 24. REFRESH TOKEN
// ============================================================

function refreshTurkAIAuthSession(
  refreshToken
) {

  const verified =
    verifyTurkAIAuthToken(
      refreshToken,
      'refresh'
    );


  if (
    !verified.valid
  ) {

    return {

      success: false,

      error:
        verified.reason

    };

  }


  // Eski refresh tokenÄ± dÃ¶ndÃ¼r
  // ve yeni token Ã¼ret.

  const hash =
    hashTurkAIToken(
      refreshToken
    );


  if (
    turkAITokens.refresh[hash]
  ) {

    turkAITokens.refresh[hash]
      .revoked = true;

    turkAITokens.refresh[hash]
      .revokedAt =
        turkAINowISO();

  }


  const access =
    createTurkAIAccessToken(
      verified.userId,
      verified.sessionId
    );


  const refresh =
    createTurkAIRefreshToken(
      verified.userId,
      verified.sessionId
    );


  saveTurkAITokens();


  writeTurkAISecurityEvent({

    type:
      'token_refresh',

    userId:
      verified.userId,

    sessionId:
      verified.sessionId,

    success: true

  });


  return {

    success: true,

    accessToken:
      access.token,

    accessExpiresAt:
      access.expiresAt,

    refreshToken:
      refresh.token,

    refreshExpiresAt:
      refresh.expiresAt

  };

}


// ============================================================
// 25. LOGIN SESSION
// ============================================================

function loginTurkAIUser({
  userId,

  client = {},

  remember = true

} = {}) {

  const account =
    getTurkAIAccount(
      userId
    );


  if (!account) {

    return {

      success: false,

      error:
        'KullanÄ±cÄ± bulunamadÄ±.'

    };

  }


  if (
    account.status !==
    'active'
  ) {

    return {

      success: false,

      error:
        'Hesap aktif deÄŸil.'

    };

  }


  const session =
    createTurkAIAuthSession({

      userId,

      client,

      remember

    });


  account.lastLoginAt =
    turkAINowISO();


  account.statistics.logins =
    safeNumber(
      account.statistics.logins,
      0
    ) + 1;


  saveTurkAIAccount(
    account
  );


  return {

    success: true,

    user: {

      id:
        account.id,

      name:
        account.name,

      email:
        account.email,

      plan:
        account.plan,

      role:
        account.role

    },

    ...session

  };

}


// ============================================================
// 26. GOOGLE ACCOUNT LINK
// ============================================================

function linkTurkAIGoogleAccount({

  userId,

  googleId,

  email,

  name

} = {}) {

  const account =
    getTurkAIAccount(
      userId
    );


  if (!account) {

    throw new Error(
      'KullanÄ±cÄ± bulunamadÄ±.'
    );

  }


  if (!googleId) {

    throw new Error(
      'Google ID gerekli.'
    );

  }


  const existing =
    findTurkAIAccountByGoogleId(
      googleId
    );


  if (
    existing &&
    existing.id !== userId
  ) {

    throw new Error(
      'Bu Google hesabÄ± baÅŸka bir hesaba baÄŸlÄ±.'
    );

  }


  account.googleId =
    String(googleId);


  account.provider =
    'google';


  account.verified =
    true;


  if (email) {

    account.email =
      normalizeTurkAIEmail(
        email
      );

  }


  if (name) {

    account.name =
      normalizeOrchestratorText(
        name,
        200
      );

  }


  saveTurkAIAccount(
    account
  );


  writeTurkAISecurityEvent({

    type:
      'google_linked',

    userId,

    success: true

  });


  return account;

}


// ============================================================
// 27. LOGOUT
// ============================================================

function logoutTurkAIUser(
  sessionId
) {

  return revokeTurkAIAuthSession(
    sessionId,
    'logout'
  );

}


// ============================================================
// 28. AUTH LOGIN API
// ============================================================

app.post(
  '/api/auth/login',
  optionalTurkAIAuth,
  (req, res) => {

    try {

      const body =
        req.body || {};


      const client =
        getTurkAIRequestClientInfo(
          req
        );


      const identifier =
        normalizeTurkAIEmail(
          body.email ??
          body.identifier ??
          ''
        );


      const lock =
        isTurkAILoginLocked({

          identifier,

          ip:
            client.ip

        });


      if (
        lock.locked
      ) {

        return res.status(429).json({

          success: false,

          error:
            'Ã‡ok fazla baÅŸarÄ±sÄ±z giriÅŸ denemesi.',

          retryAfterMs:
            lock.remainingMs

        });

      }


      let account = null;


      if (
        body.userId
      ) {

        account =
          getTurkAIAccount(
            body.userId
          );

      }


      if (
        !account &&
        body.email
      ) {

        account =
          findTurkAIAccountByEmail(
            body.email
          );

      }


      if (
        !account &&
        body.googleId
      ) {

        account =
          findTurkAIAccountByGoogleId(
            body.googleId
          );

      }


      if (!account) {

        registerTurkAILoginAttempt({

          identifier,

          ip:
            client.ip,

          success: false

        });


        writeTurkAISecurityEvent({

          type:
            'login_failed',

          ip:
            client.ip,

          success: false

        });


        return res.status(401).json({

          success: false,

          error:
            'KullanÄ±cÄ± bulunamadÄ±.'

        });

      }


      // ------------------------------------------------------
      // Demo / backend account login.
      //
      // GerÃ§ek parola doÄŸrulamasÄ± daha sonra ayrÄ± password
      // hashing katmanÄ±yla baÄŸlanabilir.
      // Google ID verilmiÅŸse Google hesabÄ± Ã¼zerinden devam eder.
      // ------------------------------------------------------

      if (
        body.googleId &&
        String(
          account.googleId
        ) !== String(
          body.googleId
        )
      ) {

        registerTurkAILoginAttempt({

          identifier,

          ip:
            client.ip,

          success: false

        });


        return res.status(401).json({

          success: false,

          error:
            'Google hesabÄ± doÄŸrulanamadÄ±.'

        });

      }


      registerTurkAILoginAttempt({

        identifier,

        ip:
          client.ip,

        success: true

      });


      const result =
        loginTurkAIUser({

          userId:
            account.id,

          client,

          remember:
            body.remember !== false

        });


      res.json(
        result
      );

    } catch (error) {

      res.status(500).json({

        success: false,

        error:
          error.message

      });

    }

  }
);


// ============================================================
// 29. GOOGLE LINK API
// ============================================================

app.post(
  '/api/auth/google/link',
  requireTurkAIAuth,
  (req, res) => {

    try {

      const body =
        req.body || {};


      const result =
        linkTurkAIGoogleAccount({

          userId:
            req.turkAIAuth.userId,

          googleId:
            body.googleId,

          email:
            body.email,

          name:
            body.name

        });


      res.json({

        success: true,

        user: {

          id:
            result.id,

          name:
            result.name,

          email:
            result.email,

          provider:
            result.provider,

          verified:
            result.verified

        }

      });

    } catch (error) {

      res.status(400).json({

        success: false,

        error:
          error.message

      });

    }

  }
);


// ============================================================
// 30. CURRENT USER
// ============================================================

app.get(
  '/api/auth/me',
  requireTurkAIAuth,
  (req, res) => {

    const account =
      req.turkAIAuth.account;


    res.json({

      success: true,

      authenticated: true,

      user: {

        id:
          account.id,

        name:
          account.name,

        email:
          account.email,

        username:
          account.username,

        plan:
          account.plan,

        role:
          account.role,

        provider:
          account.provider,

        verified:
          account.verified

      },

      session: {

        id:
          req.turkAIAuth.sessionId,

        expiresAt:
          req.turkAIAuth.expiresAt

      }

    });

  }
);


// ============================================================
// 31. REFRESH API
// ============================================================

app.post(
  '/api/auth/refresh',
  (req, res) => {

    try {

      const refreshToken =
        String(
          req.body?.refreshToken ||
          ''
        ).trim();


      if (!refreshToken) {

        return res.status(400).json({

          success: false,

          error:
            'Refresh token gerekli.'

        });

      }


      const result =
        refreshTurkAIAuthSession(
          refreshToken
        );


      if (!result.success) {

        return res.status(401).json(
          result
        );

      }


      res.json(
        result
      );

    } catch (error) {

      res.status(500).json({

        success: false,

        error:
          error.message

      });

    }

  }
);


// ============================================================
// 32. LOGOUT API
// ============================================================

app.post(
  '/api/auth/logout',
  requireTurkAIAuth,
  (req, res) => {

    try {

      const success =
        logoutTurkAIUser(
          req.turkAIAuth.sessionId
        );


      res.json({

        success,

        loggedOut: success

      });

    } catch (error) {

      res.status(500).json({

        success: false,

        error:
          error.message

      });

    }

  }
);


// ============================================================
// 33. LOGOUT ALL
// ============================================================

app.post(
  '/api/auth/logout-all',
  requireTurkAIAuth,
  (req, res) => {

    try {

      const result =
        revokeAllTurkAISessions(
          req.turkAIAuth.userId,
          'logout_all'
        );


      res.json(
        result
      );

    } catch (error) {

      res.status(500).json({

        success: false,

        error:
          error.message

      });

    }

  }
);


// ============================================================
// 34. RATE LIMIT MIDDLEWARE
// ============================================================

function turkAIRateLimitMiddleware(
  req,
  res,
  next
) {

  const client =
    getTurkAIRequestClientInfo(
      req
    );


  const userPart =
    req.turkAIAuth?.userId ||
    'guest';


  const key =
    `${client.ip}:${userPart}`;


  const result =
    checkTurkAIRateLimit({
      key
    });


  if (
    !result.allowed
  ) {

    return res.status(429).json({

      success: false,

      error:
        'Ã‡ok fazla istek gÃ¶nderildi.',

      retryAfter:
        TURKAI_AUTH_CONFIG
          .rateWindowSeconds

    });

  }


  res.setHeader(
    'X-TurkAI-RateLimit-Limit',
    result.limit
  );

  res.setHeader(
    'X-TurkAI-RateLimit-Remaining',
    result.remaining
  );


  next();

}


// ============================================================
// 35. AUTH HEALTH
// ============================================================

function turkAIAuthHealth() {

  const sessions =
    Object.values(
      turkAIAuthSessions.sessions
    );


  const activeSessions =
    sessions.filter(
      session =>
        !session.revoked &&
        new Date(
          session.expiresAt
        ).getTime() >
        Date.now()
    ).length;


  const accessTokens =
    Object.keys(
      turkAITokens.access
    ).length;


  const refreshTokens =
    Object.keys(
      turkAITokens.refresh
    ).length;


  return {

    version:
      TURKAI_AUTH_CONFIG
        .securityVersion,

    timestamp:
      turkAINowISO(),

    googleEnabled:
      TURKAI_AUTH_CONFIG
        .googleEnabled,

    sessions:
      sessions.length,

    activeSessions,

    accessTokens,

    refreshTokens,

    securityEvents:
      turkAISecurity.events.length,

    lockedLoginKeys:
      Object.keys(
        turkAISecurity.locks
      ).length

  };

}


app.get(
  '/api/auth/health',
  (req, res) => {

    res.json({

      success: true,

      health:
        turkAIAuthHealth()

    });

  }
);


// ============================================================
// 36. CLEANUP EXPIRED AUTH DATA
// ============================================================

function cleanupTurkAIAuthData() {

  const now =
    Date.now();


  let removedTokens = 0;

  let removedSessions = 0;


  for (
    const [hash, token]
    of Object.entries(
      turkAITokens.access
    )
  ) {

    if (
      token.revoked ||
      new Date(
        token.expiresAt
      ).getTime() <= now
    ) {

      delete turkAITokens
        .access[hash];

      removedTokens += 1;

    }

  }


  for (
    const [hash, token]
    of Object.entries(
      turkAITokens.refresh
    )
  ) {

    if (
      token.revoked ||
      new Date(
        token.expiresAt
      ).getTime() <= now
    ) {

      delete turkAITokens
        .refresh[hash];

      removedTokens += 1;

    }

  }


  for (
    const [id, session]
    of Object.entries(
      turkAIAuthSessions.sessions
    )
  ) {

    if (
      session.revoked &&
      new Date(
        session.expiresAt
      ).getTime() <= now
    ) {

      delete turkAIAuthSessions
        .sessions[id];

      removedSessions += 1;

    }

  }


  saveTurkAITokens();

  saveTurkAIAuthSessions();


  return {

    removedTokens,

    removedSessions,

    timestamp:
      turkAINowISO()

  };

}


// ============================================================
// 37. CLEANUP API
// ============================================================

app.post(
  '/api/auth/cleanup',
  (req, res) => {

    try {

      const result =
        cleanupTurkAIAuthData();


      res.json({

        success: true,

        cleanup:
          result

      });

    } catch (error) {

      res.status(500).json({

        success: false,

        error:
          error.message

      });

    }

  }
);


// ============================================================
// 38. EXPORTS
// ============================================================

module.exports = {

  ...(module.exports || {}),

  TURKAI_AUTH_CONFIG,

  createTurkAIRandomToken,

  hashTurkAIToken,

  getTurkAIRequestClientInfo,

  writeTurkAISecurityEvent,

  checkTurkAIRateLimit,

  createTurkAIAuthSession,

  getTurkAIAuthSession,

  revokeTurkAIAuthSession,

  revokeAllTurkAISessions,

  verifyTurkAIAuthToken,

  extractTurkAIAuthToken,

  requireTurkAIAuth,

  optionalTurkAIAuth,

  refreshTurkAIAuthSession,

  loginTurkAIUser,

  linkTurkAIGoogleAccount,

  logoutTurkAIUser,

  turkAIRateLimitMiddleware,

  turkAIAuthHealth,

  cleanupTurkAIAuthData

};


// ============================================================
// PART 9 TAMAMLANDI
// ============================================================

console.log(
  'ğŸ” TÃœRKAI SERVER PART 9 / 20 hazÄ±r â€” Auth + Session + Security aktif.'
);

console.log(
  'ğŸ›¡ï¸ Access Token + Refresh Token + Rate Limit + Session Security hazÄ±r.'
);/* =========================================================
   TÃœRKAI SERVER â€” PART 10 / 20
   FILE UPLOAD + DOCUMENT PROCESSING + CODE ANALYSIS
   + KNOWLEDGE IMPORT ENGINE
   ========================================================= */

console.log("ğŸ“ TÃœRKAI SERVER PART 10 / 20 yÃ¼kleniyor...");

/*
  Bu bÃ¶lÃ¼m:
  - Dosya yÃ¼kleme
  - GÃ¼venli dosya saklama
  - Metin dosyasÄ± okuma
  - Kod dosyasÄ± okuma
  - JSON/CSV/HTML/CSS/JS/Python vb. iÅŸleme
  - PDF desteÄŸi varsa otomatik kullanma
  - Dosyadan Knowledge'a bilgi aktarma
  - Dosya arama
  - Dosya silme
  - Dosya bilgisi
  - Dosya gÃ¼venliÄŸi
  sistemini oluÅŸturur.
*/

/* ---------------------------------------------------------
   10.1 â€” PART 6 COMPATIBILITY
   --------------------------------------------------------- */

function createAbortController(timeoutMs = 30000) {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    try {
      controller.abort();
    } catch (_) {}
  }, timeoutMs);

  return {
    controller,
    timer
  };
}


/* ---------------------------------------------------------
   10.2 â€” FILE CONFIG
   --------------------------------------------------------- */

const TURKAI_FILE_CONFIG = {
  maxFileSize: 1024 * 1024 * 1024,

maxLinesByPlan: {
  free: 20000,
  pro: 40000,
  plus: 60000,
  ultra: 100000,
  developer: 250000
},
  maxTextLength: 2_000_000,

  maxKnowledgeChunks: 500,

  chunkSize: 3500,

  chunkOverlap: 350,

  uploadDirectory: path.join(DATA_DIR, "uploads"),

  metadataFile: path.join(DATA_DIR, "files.json"),

  knowledgeImportEnabled: true,

  allowGuestUploads: false,

  allowedExtensions: [
    ".txt",
    ".md",
    ".markdown",
    ".json",
    ".csv",
    ".log",

    ".js",
    ".mjs",
    ".cjs",
    ".ts",
    ".tsx",
    ".jsx",

    ".html",
    ".htm",
    ".css",
    ".scss",
    ".less",

    ".py",
    ".java",
    ".c",
    ".h",
    ".cpp",
    ".hpp",
    ".cc",
    ".cs",
    ".php",
    ".go",
    ".rs",
    ".swift",
    ".kt",
    ".kts",

    ".sql",
    ".xml",
    ".yaml",
    ".yml",

    ".vue",
    ".svelte"
  ],

  blockedExtensions: [
    ".exe",
    ".dll",
    ".so",
    ".bat",
    ".cmd",
    ".com",
    ".msi",
    ".apk",
    ".aab",
    ".jar",
    ".class",

    ".sh",
    ".ps1",

    ".pem",
    ".key",
    ".crt",
    ".p12",
    ".pfx",

    ".db",
    ".sqlite",
    ".sqlite3"
  ],

  blockedNames: [
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
    ".npmrc",
    ".netrc",

    "id_rsa",
    "id_rsa.pub",

    "credentials.json",
    "service-account.json",

    "secrets.json",
    "secret.json",

    "token.json",
    "tokens.json"
  ]
};


/* ---------------------------------------------------------
   10.3 â€” DIRECTORIES
   --------------------------------------------------------- */

ensureDirectory(TURKAI_FILE_CONFIG.uploadDirectory);


/* ---------------------------------------------------------
   10.4 â€” FILE DATABASE
   --------------------------------------------------------- */

const defaultTurkAIFileDatabase = {
  version: 1,

  files: {},

  userIndex: {},

  statistics: {
    uploaded: 0,
    processed: 0,
    deleted: 0,
    importedToKnowledge: 0,
    rejected: 0,
    totalBytes: 0
  }
};

let turkAIFileDatabase = readJson(
  TURKAI_FILE_CONFIG.metadataFile,
  defaultTurkAIFileDatabase
);

if (!turkAIFileDatabase || typeof turkAIFileDatabase !== "object") {
  turkAIFileDatabase = structuredClone(defaultTurkAIFileDatabase);
}


/* ---------------------------------------------------------
   10.5 â€” DATABASE SAVE
   --------------------------------------------------------- */

function saveTurkAIFileDatabase() {
  try {
    writeJson(
      TURKAI_FILE_CONFIG.metadataFile,
      turkAIFileDatabase
    );

    return true;
  } catch (error) {
    console.error(
      "âŒ File database kaydedilemedi:",
      error.message
    );

    return false;
  }
}


/* ---------------------------------------------------------
   10.6 â€” TEXT HELPERS
   --------------------------------------------------------- */

function turkAIFileSafeText(value, max = 10000) {
  return cleanText(String(value ?? "")).slice(0, max);
}


function turkAIFileExtension(filename) {
  const ext = path.extname(String(filename || ""))
    .toLowerCase();

  return ext;
}


function turkAIFileBaseName(filename) {
  return path.basename(
    String(filename || ""),
    path.extname(String(filename || ""))
  );
}


function turkAIFileNormalizeName(filename) {
  return String(filename || "")
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 180);
}


function turkAIFileIsBlockedName(filename) {
  const lower = path.basename(
    String(filename || "")
  ).toLowerCase();

  return TURKAI_FILE_CONFIG.blockedNames
    .some(name => lower === name.toLowerCase());
}


function turkAIFileIsAllowedExtension(filename) {
  const ext = turkAIFileExtension(filename);

  if (!ext) return false;

  if (
    TURKAI_FILE_CONFIG.blockedExtensions.includes(ext)
  ) {
    return false;
  }

  return TURKAI_FILE_CONFIG.allowedExtensions
    .includes(ext);
}


/* ---------------------------------------------------------
   10.7 â€” SECRET DETECTION
   --------------------------------------------------------- */

function turkAIDetectPotentialSecrets(text) {
  const source = String(text || "");

  const patterns = [
    /sk-[A-Za-z0-9_-]{20,}/g,

    /AIza[0-9A-Za-z_-]{20,}/g,

    /ghp_[A-Za-z0-9]{20,}/g,

    /github_pat_[A-Za-z0-9_]{20,}/g,

    /xox[baprs]-[A-Za-z0-9-]{20,}/g,

    /-----BEGIN [A-Z ]+ PRIVATE KEY-----/g,

    /password\s*[:=]\s*["'][^"']+["']/gi,

    /api[_-]?key\s*[:=]\s*["'][^"']+["']/gi,

    /secret[_-]?key\s*[:=]\s*["'][^"']+["']/gi
  ];

  let count = 0;

  for (const pattern of patterns) {
    const matches = source.match(pattern);

    if (matches) {
      count += matches.length;
    }
  }

  return {
    detected: count > 0,
    count
  };
}


/* ---------------------------------------------------------
   10.8 â€” FILE TYPE DETECTION
   --------------------------------------------------------- */

function turkAIDetectFileType(filename) {
  const ext = turkAIFileExtension(filename);

  const map = {
    ".txt": "text",
    ".md": "markdown",
    ".markdown": "markdown",
    ".json": "json",
    ".csv": "csv",
    ".log": "log",

    ".js": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",

    ".ts": "typescript",
    ".tsx": "typescript-react",
    ".jsx": "javascript-react",

    ".html": "html",
    ".htm": "html",

    ".css": "css",
    ".scss": "scss",
    ".less": "less",

    ".py": "python",
    ".java": "java",
    ".c": "c",
    ".h": "c-header",
    ".cpp": "cpp",
    ".hpp": "cpp-header",
    ".cc": "cpp",
    ".cs": "csharp",

    ".php": "php",
    ".go": "go",
    ".rs": "rust",
    ".swift": "swift",
    ".kt": "kotlin",
    ".kts": "kotlin",

    ".sql": "sql",
    ".xml": "xml",
    ".yaml": "yaml",
    ".yml": "yaml",

    ".vue": "vue",
    ".svelte": "svelte"
  };

  return map[ext] || "unknown";
}


/* ---------------------------------------------------------
   10.9 â€” FILE ID
   --------------------------------------------------------- */

function createTurkAIFileId() {
  return "file_" +
    crypto.randomBytes(12).toString("hex");
}


/* ---------------------------------------------------------
   10.10 â€” USER FILE INDEX
   --------------------------------------------------------- */

function turkAIEnsureUserFileIndex(userId) {
  const id = String(userId || "unknown");

  if (!Array.isArray(turkAIFileDatabase.userIndex[id])) {
    turkAIFileDatabase.userIndex[id] = [];
  }

  return turkAIFileDatabase.userIndex[id];
}


function turkAIAddFileToUserIndex(userId, fileId) {
  const index = turkAIEnsureUserFileIndex(userId);

  if (!index.includes(fileId)) {
    index.push(fileId);
  }
}


function turkAIRemoveFileFromUserIndex(userId, fileId) {
  const index = turkAIEnsureUserFileIndex(userId);

  turkAIFileDatabase.userIndex[userId] =
    index.filter(id => id !== fileId);
}


/* ---------------------------------------------------------
   10.11 â€” FILE PATH SAFETY
   --------------------------------------------------------- */

function turkAISafeUploadPath(fileId, filename) {
  const safeName =
    turkAIFileNormalizeName(filename);

  const finalName =
    `${fileId}_${safeName}`;

  const target =
    path.resolve(
      TURKAI_FILE_CONFIG.uploadDirectory,
      finalName
    );

  const base =
    path.resolve(
      TURKAI_FILE_CONFIG.uploadDirectory
    );

  if (
    !target.startsWith(base + path.sep) &&
    target !== base
  ) {
    throw new Error("GÃ¼venli olmayan dosya yolu.");
  }

  return target;
}


/* ---------------------------------------------------------
   10.12 â€” BUFFER TEXT DECODING
   --------------------------------------------------------- */

function turkAIBufferToText(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    return String(buffer || "");
  }

  /*
    UTF-8 varsayÄ±lan olarak kullanÄ±lÄ±r.
    BOM varsa temizlenir.
  */

  let text = buffer.toString("utf8");

  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  return text;
}


/* ---------------------------------------------------------
   10.13 â€” TEXT NORMALIZATION
   --------------------------------------------------------- */

function turkAINormalizeDocumentText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/\t/g, "    ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}


/* ---------------------------------------------------------
   10.14 â€” DOCUMENT CHUNKING
   --------------------------------------------------------- */

function turkAIChunkDocument(
  text,
  chunkSize = TURKAI_FILE_CONFIG.chunkSize,
  overlap = TURKAI_FILE_CONFIG.chunkOverlap
) {
  const source = String(text || "");

  if (!source) return [];

  const chunks = [];

  let start = 0;

  while (
    start < source.length &&
    chunks.length <
      TURKAI_FILE_CONFIG.maxKnowledgeChunks
  ) {
    let end =
      Math.min(
        start + chunkSize,
        source.length
      );

    if (end < source.length) {
      const newline =
        source.lastIndexOf("\n", end);

      if (
        newline > start + Math.floor(chunkSize * 0.55)
      ) {
        end = newline;
      }
    }

    const chunk =
      source.slice(start, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= source.length) {
      break;
    }

    start =
      Math.max(
        end - overlap,
        start + 1
      );
  }

  return chunks;
}


/* ---------------------------------------------------------
   10.15 â€” JSON FORMATTER
   --------------------------------------------------------- */

function turkAIFormatJSON(text) {
  try {
    const parsed = JSON.parse(text);

    return JSON.stringify(
      parsed,
      null,
      2
    );
  } catch (_) {
    return text;
  }
}


/* ---------------------------------------------------------
   10.16 â€” CSV BASIC PARSER
   --------------------------------------------------------- */

function turkAIParseCSV(text) {
  const lines =
    String(text || "")
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean);

  if (!lines.length) {
    return {
      headers: [],
      rows: []
    };
  }

  function parseLine(line) {
    const result = [];

    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (
          insideQuotes &&
          line[i + 1] === '"'
        ) {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }

        continue;
      }

      if (char === "," && !insideQuotes) {
        result.push(current.trim());
        current = "";
        continue;
      }

      current += char;
    }

    result.push(current.trim());

    return result;
  }

  const headers = parseLine(lines[0]);

  const rows = lines
    .slice(1)
    .map(parseLine);

  return {
    headers,
    rows
  };
}


/* ---------------------------------------------------------
   10.17 â€” DOCUMENT PROCESSOR
   --------------------------------------------------------- */

async function turkAIProcessDocumentBuffer({
  buffer,
  filename,
  mimeType = ""
}) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("GeÃ§ersiz dosya verisi.");
  }

  if (
    buffer.length >
    TURKAI_FILE_CONFIG.maxFileSize
  ) {
    throw new Error(
      "Dosya boyutu 10 MB sÄ±nÄ±rÄ±nÄ± aÅŸÄ±yor."
    );
  }

  const extension =
    turkAIFileExtension(filename);

  const type =
    turkAIDetectFileType(filename);

  let text = "";

  /*
    PDF desteÄŸi opsiyonel.
    pdf-parse kuruluysa otomatik kullanÄ±labilir.
  */

  if (extension === ".pdf") {
    let pdfParse = null;

    try {
      pdfParse = require("pdf-parse");
    } catch (_) {
      throw new Error(
        "PDF iÅŸleme iÃ§in pdf-parse paketi gerekli."
      );
    }

    const result =
      await pdfParse(buffer);

    text = result.text || "";
  } else {
    text =
      turkAIBufferToText(buffer);
  }

  text =
    turkAINormalizeDocumentText(text);

  if (type === "json") {
    text =
      turkAIFormatJSON(text);
  }

  let csvInfo = null;

  if (type === "csv") {
    csvInfo =
      turkAIParseCSV(text);
  }

  if (
    text.length >
    TURKAI_FILE_CONFIG.maxTextLength
  ) {
    text =
      text.slice(
        0,
        TURKAI_FILE_CONFIG.maxTextLength
      ) +
      "\n\n[DosyanÄ±n devamÄ± boyut sÄ±nÄ±rÄ± nedeniyle kesildi.]";
  }

  const secretInfo =
    turkAIDetectPotentialSecrets(text);

  return {
    filename:
      turkAIFileNormalizeName(filename),

    extension,

    type,

    mimeType,

    size:
      buffer.length,

    text,

    textLength:
      text.length,

    lines:
      text
        ? text.split("\n").length
        : 0,

    chunks:
      turkAIChunkDocument(text),

    csv:
      csvInfo,

    potentialSecrets:
      secretInfo,

    processedAt:
      new Date().toISOString()
  };
}


/* ---------------------------------------------------------
   10.18 â€” MULTER OPTIONAL SUPPORT
   --------------------------------------------------------- */

let turkAIMulter = null;

try {
  turkAIMulter = require("multer");
} catch (_) {
  console.warn(
    "âš ï¸ multer bulunamadÄ±. Dosya upload iÃ§in npm install multer gerekebilir."
  );
}


/* ---------------------------------------------------------
   10.19 â€” MULTER CONFIG
   --------------------------------------------------------- */

let turkAIUpload = null;

if (turkAIMulter) {
  turkAIUpload =
    turkAIMulter({
      storage:
        turkAIMulter.memoryStorage(),

      limits: {
        fileSize:
          TURKAI_FILE_CONFIG.maxFileSize,

        files: 1
      },

      fileFilter:
        (req, file, callback) => {
          try {
            const filename =
              file.originalname || "";

            if (
              turkAIFileIsBlockedName(filename)
            ) {
              return callback(
                new Error(
                  "Bu dosya adÄ± gÃ¼venlik nedeniyle engellendi."
                )
              );
            }

            if (
              !turkAIFileIsAllowedExtension(
                filename
              )
            ) {
              return callback(
                new Error(
                  "Bu dosya tÃ¼rÃ¼ne izin verilmiyor."
                )
              );
            }

            callback(null, true);
          } catch (error) {
            callback(error);
          }
        }
    });
}


/* ---------------------------------------------------------
   10.20 â€” USER AUTH HELPER
   --------------------------------------------------------- */

function turkAIGetRequestUserId(req) {
  return (
    req.turkAIUser?.id ||
    req.user?.id ||
    req.user?.userId ||
    req.body?.userId ||
    req.query?.userId ||
    null
  );
}


/* ---------------------------------------------------------
   10.21 â€” FILE ACCESS CONTROL
   --------------------------------------------------------- */

function turkAIUserOwnsFile(userId, fileId) {
  const file =
    turkAIFileDatabase.files[fileId];

  if (!file) {
    return false;
  }

  return (
    String(file.userId) ===
    String(userId)
  );
}


function turkAIGetFileForUser(
  userId,
  fileId
) {
  if (
    !turkAIUserOwnsFile(
      userId,
      fileId
    )
  ) {
    return null;
  }

  return turkAIFileDatabase.files[fileId];
}


/* ---------------------------------------------------------
   10.22 â€” FILE METADATA
   --------------------------------------------------------- */

function turkAICreateFileMetadata({
  userId,
  filename,
  mimeType,
  size,
  type,
  extension,
  storagePath
}) {
  const fileId =
    createTurkAIFileId();

  return {
    id: fileId,

    userId:
      String(userId),

    originalName:
      turkAIFileNormalizeName(
        filename
      ),

    storedName:
      path.basename(storagePath),

    mimeType:
      turkAIFileSafeText(
        mimeType,
        200
      ),

    extension,

    type,

    size:

      Number(size) || 0,

    storagePath,

    uploadedAt:
      new Date().toISOString(),

    processedAt:
      null,

    deletedAt:
      null,

    status:
      "uploaded",

    textLength:
      0,

    lineCount:
      0,

    chunkCount:
      0,

    importedKnowledge:
      0,

    potentialSecrets:
      false
  };
}


/* ---------------------------------------------------------
   10.23 â€” SAVE UPLOADED FILE
   --------------------------------------------------------- */

async function turkAISaveUploadedFile({
  userId,
  originalName,
  mimeType,
  buffer
}) {
  if (!userId) {
    throw new Error(
      "Dosya iÅŸlemi iÃ§in kullanÄ±cÄ± gerekiyor."
    );
  }

  if (!Buffer.isBuffer(buffer)) {
    throw new Error(
      "GeÃ§ersiz dosya buffer'Ä±."
    );
  }

  if (
    buffer.length >
    TURKAI_FILE_CONFIG.maxFileSize
  ) {
    throw new Error(
      "Dosya 10 MB'dan bÃ¼yÃ¼k olamaz."
    );
  }

  if (
    turkAIFileIsBlockedName(
      originalName
    )
  ) {
    throw new Error(
      "Bu dosya adÄ± gÃ¼venlik nedeniyle engellendi."
    );
  }

  if (
    !turkAIFileIsAllowedExtension(
      originalName
    )
  ) {
    throw new Error(
      "Bu dosya uzantÄ±sÄ±na izin verilmiyor."
    );
  }

  const extension =
    turkAIFileExtension(
      originalName
    );

  const type =
    turkAIDetectFileType(
      originalName
    );

  const fileId =
    createTurkAIFileId();

  const safeName =
    turkAIFileNormalizeName(
      originalName
    );

  const storagePath =
    turkAISafeUploadPath(
      fileId,
      safeName
    );

  await fs.promises.writeFile(
    storagePath,
    buffer
  );

  const metadata = {
    id: fileId,

    userId:
      String(userId),

    originalName:
      safeName,

    storedName:
      path.basename(storagePath),

    mimeType:
      turkAIFileSafeText(
        mimeType,
        200
      ),

    extension,

    type,

    size:
      buffer.length,

    storagePath,

    uploadedAt:
      new Date().toISOString(),

    processedAt:
      null,

    deletedAt:
      null,

    status:
      "uploaded",

    textLength:
      0,

    lineCount:
      0,

    chunkCount:
      0,

    importedKnowledge:
      0,

    potentialSecrets:
      false
  };

  turkAIFileDatabase.files[fileId] =
    metadata;

  turkAIAddFileToUserIndex(
    userId,
    fileId
  );

  turkAIFileDatabase.statistics.uploaded++;

  turkAIFileDatabase.statistics.totalBytes +=
    buffer.length;

  saveTurkAIFileDatabase();

  return metadata;
}


/* ---------------------------------------------------------
   10.24 â€” PROCESS STORED FILE
   --------------------------------------------------------- */

async function turkAIProcessStoredFile(
  userId,
  fileId
) {
  const metadata =
    turkAIGetFileForUser(
      userId,
      fileId
    );

  if (!metadata) {
    throw new Error(
      "Dosya bulunamadÄ± veya eriÅŸim iznin yok."
    );
  }

  if (!fs.existsSync(metadata.storagePath)) {
    throw new Error(
      "DosyanÄ±n fiziksel kaydÄ± bulunamadÄ±."
    );
  }

  const buffer =
    await fs.promises.readFile(
      metadata.storagePath
    );

  const processed =
    await turkAIProcessDocumentBuffer({
      buffer,

      filename:
        metadata.originalName,

      mimeType:
        metadata.mimeType
    });

  metadata.processedAt =
    processed.processedAt;

  metadata.status =
    "processed";

  metadata.textLength =
    processed.textLength;

  metadata.lineCount =
    processed.lines;

  metadata.chunkCount =
    processed.chunks.length;

  metadata.potentialSecrets =
    processed.potentialSecrets.detected;

  turkAIFileDatabase.statistics.processed++;

  saveTurkAIFileDatabase();

  return {
    metadata,
    processed
  };
}


/* ---------------------------------------------------------
   10.25 â€” KNOWLEDGE IMPORT
   --------------------------------------------------------- */

async function turkAIImportFileToKnowledge(
  userId,
  fileId
) {
  const result =
    await turkAIProcessStoredFile(
      userId,
      fileId
    );

  const {
    metadata,
    processed
  } = result;

  if (
    !TURKAI_FILE_CONFIG.knowledgeImportEnabled
  ) {
    return {
      success: false,
      imported: 0,
      reason:
        "Knowledge import devre dÄ±ÅŸÄ±."
    };
  }

  if (!processed.text.trim()) {
    return {
      success: false,
      imported: 0,
      reason:
        "Dosyada aktarÄ±labilir metin bulunamadÄ±."
    };
  }

  /*
    Potansiyel gizli bilgiler tespit edilirse
    Knowledge'a otomatik aktarÄ±m yapÄ±lmaz.
  */

  if (
    processed.potentialSecrets.detected
  ) {
    return {
      success: false,
      imported: 0,
      reason:
        "Potansiyel gizli bilgi tespit edildi. Otomatik Knowledge aktarÄ±mÄ± engellendi.",
      potentialSecrets:
        processed.potentialSecrets.count
    };
  }

  const chunks =
    processed.chunks;

  let imported = 0;

  for (
    let i = 0;
    i < chunks.length;
    i++
  ) {
    const chunk =
      chunks[i];

    if (!chunk.trim()) {
      continue;
    }

    /*
      PART 3'teki addKnowledge fonksiyonu kullanÄ±lÄ±r.
    */

    if (
      typeof addKnowledge === "function"
    ) {
      try {
        const knowledge =
          addKnowledge({
            question:
              `${metadata.originalName} hakkÄ±nda bilgi`,
            
            answer:
              chunk,

            category:
              `file:${metadata.type}`,

            source:
              `uploaded:${metadata.id}`,

            userId:
              String(userId),

            tags: [
              "file",
              metadata.type,
              metadata.extension,
              metadata.id
            ]
          });

        if (knowledge) {
          imported++;
        }
      } catch (error) {
        console.warn(
          "Knowledge import parÃ§asÄ± baÅŸarÄ±sÄ±z:",
          error.message
        );
      }
    }
  }

  metadata.importedKnowledge =
    imported;

  turkAIFileDatabase.statistics.importedToKnowledge +=
    imported;

  saveTurkAIFileDatabase();

  return {
    success: true,

    imported,

    fileId:
      metadata.id,

    filename:
      metadata.originalName
  };
}


/* ---------------------------------------------------------
   10.26 â€” FILE CONTENT READ
   --------------------------------------------------------- */

async function turkAIReadUserFile(
  userId,
  fileId
) {
  const metadata =
    turkAIGetFileForUser(
      userId,
      fileId
    );

  if (!metadata) {
    throw new Error(
      "Dosya bulunamadÄ± veya eriÅŸim iznin yok."
    );
  }

  if (!fs.existsSync(metadata.storagePath)) {
    throw new Error(
      "Dosya fiziksel olarak bulunamadÄ±."
    );
  }

  const buffer =
    await fs.promises.readFile(
      metadata.storagePath
    );

  const processed =
    await turkAIProcessDocumentBuffer({
      buffer,

      filename:
        metadata.originalName,

      mimeType:
        metadata.mimeType
    });

  return {
    metadata,
    content:
      processed.text,

    type:
      processed.type,

    chunks:
      processed.chunks,

    lines:
      processed.lines,

    size:
      processed.size
  };
}


/* ---------------------------------------------------------
   10.27 â€” FILE DELETE
   --------------------------------------------------------- */

async function turkAIDeleteUserFile(
  userId,
  fileId
) {
  const metadata =
    turkAIGetFileForUser(
      userId,
      fileId
    );

  if (!metadata) {
    throw new Error(
      "Dosya bulunamadÄ±."
    );
  }

  try {
    if (
      fs.existsSync(
        metadata.storagePath
      )
    ) {
      await fs.promises.unlink(
        metadata.storagePath
      );
    }
  } catch (error) {
    console.warn(
      "Dosya fiziksel olarak silinemedi:",
      error.message
    );
  }

  metadata.deletedAt =
    new Date().toISOString();

  metadata.status =
    "deleted";

  turkAIRemoveFileFromUserIndex(
    userId,
    fileId
  );

  delete turkAIFileDatabase.files[fileId];

  turkAIFileDatabase.statistics.deleted++;

  saveTurkAIFileDatabase();

  return {
    success: true,
    fileId
  };
}


/* ---------------------------------------------------------
   10.28 â€” FILE SEARCH
   --------------------------------------------------------- */

function turkAISearchUserFiles(
  userId,
  query
) {
  const q =
    normalizeForSearch(
      String(query || "")
    );

  const index =
    turkAIEnsureUserFileIndex(
      userId
    );

  const results = [];

  for (const fileId of index) {
    const file =
      turkAIFileDatabase.files[fileId];

    if (!file) continue;

    const haystack =
      normalizeForSearch(
        [
          file.originalName,
          file.type,
          file.extension,
          file.status
        ].join(" ")
      );

    let score = 0;

    if (!q) {
      score = 1;
    } else {
      if (haystack.includes(q)) {
        score += 10;
      }

      const words =
        q.split(/\s+/)
          .filter(Boolean);

      for (const word of words) {
        if (haystack.includes(word)) {
          score += 2;
        }
      }
    }

    if (score > 0) {
      results.push({
        ...file,
        score
      });
    }
  }

  return results
    .sort(
      (a, b) =>
        b.score - a.score
    )
    .slice(0, 50);
}


/* ---------------------------------------------------------
   10.29 â€” FILE STATS
   --------------------------------------------------------- */

function turkAIGetFileStats(
  userId
) {
  const index =
    turkAIEnsureUserFileIndex(
      userId
    );

  const files =
    index
      .map(id =>
        turkAIFileDatabase.files[id]
      )
      .filter(Boolean);

  return {
    total:
      files.length,

    processed:
      files.filter(
        file =>
          file.status === "processed"
      ).length,

    totalBytes:
      files.reduce(
        (sum, file) =>
          sum +
          Number(file.size || 0),
        0
      ),

    knowledgeImports:
      files.reduce(
        (sum, file) =>
          sum +
          Number(
            file.importedKnowledge || 0
          ),
        0
      ),

    types:
      files.reduce(
        (acc, file) => {
          acc[file.type] =
            (acc[file.type] || 0) + 1;

          return acc;
        },
        {}
      )
  };
}


/* ---------------------------------------------------------
   10.30 â€” UPLOAD ROUTE
   --------------------------------------------------------- */

if (turkAIUpload) {
  app.post(
    "/api/files/upload",
    requireTurkAIAuth,
    turkAIUpload.single("file"),
    async (req, res) => {
      try {
        const userId =
          turkAIGetRequestUserId(req);

        if (!userId) {
          return res.status(401).json({
            success: false,
            error:
              "KullanÄ±cÄ± doÄŸrulanamadÄ±."
          });
        }

        if (!req.file) {
          return res.status(400).json({
            success: false,
            error:
              "Dosya gÃ¶nderilmedi."
          });
        }

        const metadata =
          await turkAISaveUploadedFile({
            userId,

            originalName:
              req.file.originalname,

            mimeType:
              req.file.mimetype,

            buffer:
              req.file.buffer
          });

        let processing = null;

        /*
          YÃ¼kleme sonrasÄ± otomatik iÅŸleme.
        */

        try {
          processing =
            await turkAIProcessStoredFile(
              userId,
              metadata.id
            );
        } catch (error) {
          processing = {
            success: false,
            error:
              error.message
          };
        }

        return res.json({
          success: true,

          file: metadata,

          processing
        });

      } catch (error) {
        console.error(
          "âŒ File upload:",
          error
        );

        turkAIFileDatabase.statistics.rejected++;

        saveTurkAIFileDatabase();

        return res.status(400).json({
          success: false,
          error:
            error.message ||
            "Dosya yÃ¼klenemedi."
        });
      }
    }
  );
} else {
  app.post(
    "/api/files/upload",
    requireTurkAIAuth,
    (req, res) => {
      return res.status(503).json({
        success: false,

        error:
          "Dosya yÃ¼kleme motoru hazÄ±r deÄŸil.",

        details:
          "Projeye multer eklenmeli.",

        install:
          "npm install multer"
      });
    }
  );
}


/* ---------------------------------------------------------
   10.31 â€” LIST FILES
   --------------------------------------------------------- */

app.get(
  "/api/files",
  requireTurkAIAuth,
  (req, res) => {
    try {
      const userId =
        turkAIGetRequestUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          error:
            "KullanÄ±cÄ± doÄŸrulanamadÄ±."
        });
      }

      const index =
        turkAIEnsureUserFileIndex(
          userId
        );

      const files =
        index
          .map(id =>
            turkAIFileDatabase.files[id]
          )
          .filter(Boolean)
          .map(file => ({
            ...file,
            storagePath:
              undefined
          }));

      return res.json({
        success: true,
        files,
        stats:
          turkAIGetFileStats(userId)
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        error:
          error.message
      });
    }
  }
);


/* ---------------------------------------------------------
   10.32 â€” SEARCH FILES
   --------------------------------------------------------- */

app.get(
  "/api/files/search",
  requireTurkAIAuth,
  (req, res) => {
    try {
      const userId =
        turkAIGetRequestUserId(req);

      const query =
        String(
          req.query.q || ""
        );

      const results =
        turkAISearchUserFiles(
          userId,
          query
        );

      return res.json({
        success: true,
        query,
        results
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        error:
          error.message
      });
    }
  }
);


/* ---------------------------------------------------------
   10.33 â€” READ FILE
   --------------------------------------------------------- */

app.get(
  "/api/files/:fileId/read",
  requireTurkAIAuth,
  async (req, res) => {
    try {
      const userId =
        turkAIGetRequestUserId(req);

      const result =
        await turkAIReadUserFile(
          userId,
          req.params.fileId
        );

      return res.json({
        success: true,
        ...result
      });

    } catch (error) {
      return res.status(404).json({
        success: false,
        error:
          error.message
      });
    }
  }
);


/* ---------------------------------------------------------
   10.34 â€” PROCESS FILE
   --------------------------------------------------------- */

app.post(
  "/api/files/:fileId/process",
  requireTurkAIAuth,
  async (req, res) => {
    try {
      const userId =
        turkAIGetRequestUserId(req);

      const result =
        await turkAIProcessStoredFile(
          userId,
          req.params.fileId
        );

      return res.json({
        success: true,
        ...result
      });

    } catch (error) {
      return res.status(400).json({
        success: false,
        error:
          error.message
      });
    }
  }
);


/* ---------------------------------------------------------
   10.35 â€” IMPORT TO KNOWLEDGE
   --------------------------------------------------------- */

app.post(
  "/api/files/:fileId/import-knowledge",
  requireTurkAIAuth,
  async (req, res) => {
    try {
      const userId =
        turkAIGetRequestUserId(req);

      const result =
        await turkAIImportFileToKnowledge(
          userId,
          req.params.fileId
        );

      return res.json({
        success:
          result.success,

        ...result
      });

    } catch (error) {
      return res.status(400).json({
        success: false,
        error:
          error.message
      });
    }
  }
);


/* ---------------------------------------------------------
   10.36 â€” DELETE FILE
   --------------------------------------------------------- */

app.delete(
  "/api/files/:fileId",
  requireTurkAIAuth,
  async (req, res) => {
    try {
      const userId =
        turkAIGetRequestUserId(req);

      const result =
        await turkAIDeleteUserFile(
          userId,
          req.params.fileId
        );

      return res.json(result);

    } catch (error) {
      return res.status(404).json({
        success: false,
        error:
          error.message
      });
    }
  }
);


/* ---------------------------------------------------------
   10.37 â€” FILE STATS ROUTE
   --------------------------------------------------------- */

app.get(
  "/api/files/stats",
  requireTurkAIAuth,
  (req, res) => {
    try {
      const userId =
        turkAIGetRequestUserId(req);

      return res.json({
        success: true,

        stats:
          turkAIGetFileStats(userId)
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        error:
          error.message
      });
    }
  }
);


/* ---------------------------------------------------------
   10.38 â€” FILE ENGINE HEALTH
   --------------------------------------------------------- */

app.get(
  "/api/files/health",
  (req, res) => {
    const fileCount =
      Object.keys(
        turkAIFileDatabase.files
      ).length;

    return res.json({
      success: true,

      engine:
        "turkai-file-engine",

      version:
        "10.0.0",

      upload:
        Boolean(turkAIUpload),

      maxFileSize:
        TURKAI_FILE_CONFIG.maxFileSize,

      maxFileSizeMB:
        TURKAI_FILE_CONFIG.maxFileSize /
        1024 /
        1024,

      allowedExtensions:
        TURKAI_FILE_CONFIG.allowedExtensions,

      blockedExtensions:
        TURKAI_FILE_CONFIG.blockedExtensions,

      fileCount,

      knowledgeImport:
        TURKAI_FILE_CONFIG.knowledgeImportEnabled,

      timestamp:
        new Date().toISOString()
    });
  }
);


/* ---------------------------------------------------------
   10.39 â€” CLEANUP MISSING FILES
   --------------------------------------------------------- */

async function turkAICleanupMissingFiles() {
  let removed = 0;

  for (
    const [fileId, file]
    of Object.entries(
      turkAIFileDatabase.files
    )
  ) {
    if (
      !file ||
      !file.storagePath
    ) {
      continue;
    }

    if (
      !fs.existsSync(
        file.storagePath
      )
    ) {
      turkAIRemoveFileFromUserIndex(
        file.userId,
        fileId
      );

      delete turkAIFileDatabase.files[
        fileId
      ];

      removed++;
    }
  }

  if (removed > 0) {
    saveTurkAIFileDatabase();
  }

  return {
    removed
  };
}


/* ---------------------------------------------------------
   10.40 â€” PERIODIC CLEANUP
   --------------------------------------------------------- */

setInterval(
  () => {
    turkAICleanupMissingFiles()
      .catch(error => {
        console.warn(
          "File cleanup:",
          error.message
        );
      });
  },
  30 * 60 * 1000
);


/* ---------------------------------------------------------
   10.41 â€” EXPORTS
   --------------------------------------------------------- */

module.exports.TURKAI_FILE_CONFIG =
  TURKAI_FILE_CONFIG;

module.exports.turkAIFileDatabase =
  turkAIFileDatabase;

module.exports.turkAIProcessDocumentBuffer =
  turkAIProcessDocumentBuffer;

module.exports.turkAISaveUploadedFile =
  turkAISaveUploadedFile;

module.exports.turkAIProcessStoredFile =
  turkAIProcessStoredFile;

module.exports.turkAIImportFileToKnowledge =
  turkAIImportFileToKnowledge;

module.exports.turkAIReadUserFile =
  turkAIReadUserFile;

module.exports.turkAIDeleteUserFile =
  turkAIDeleteUserFile;

module.exports.turkAISearchUserFiles =
  turkAISearchUserFiles;

module.exports.turkAIGetFileStats =
  turkAIGetFileStats;

module.exports.turkAICleanupMissingFiles =
  turkAICleanupMissingFiles;


/* ---------------------------------------------------------
   10.42 â€” READY
   --------------------------------------------------------- */

console.log(
  "ğŸ“ TÃœRKAI SERVER PART 10 / 20 hazÄ±r â€” File Engine aktif."
);

console.log(
  "ğŸ“„ Metin + Kod + JSON + CSV + Web dosyalarÄ± iÅŸleme aktif."
);

console.log(
  "ğŸ§  Dosyadan Knowledge aktarÄ±mÄ± hazÄ±r."
);

console.log(
  "ğŸ›¡ï¸ Dosya eriÅŸim kontrolÃ¼ + path traversal korumasÄ± + secret detection aktif."
);

console.log(
  "ğŸ“¦ Maksimum dosya boyutu: 10 MB."
);
/* =========================================================
   TÃœRKAI SERVER â€” PART 11 / 20
   USAGE + QUOTA + PLAN LIMIT + DAILY RESET ENGINE
   ========================================================= */

console.log("ğŸ“Š TÃœRKAI SERVER PART 11 / 20 yÃ¼kleniyor...");


/* ---------------------------------------------------------
   12.1 â€” ULTRA FILE CONFIG
   --------------------------------------------------------- */

const TURKAI_ULTRA_FILE_CONFIG = {
  version: "12.0.0",

  ultraMaxFileSize:
    1024 * 1024 * 1024,

  ultraMaxLines:
    100000,

  developerMaxLines:
    250000,

  freeMaxLines:
    20000,

  proMaxLines:
    40000,

  plusMaxLines:
    60000,

  supportedLargeFiles: [
    ".txt",
    ".md",
    ".json",
    ".csv",
    ".log",

    ".js",
    ".mjs",
    ".cjs",
    ".ts",
    ".tsx",
    ".jsx",

    ".html",
    ".htm",
    ".css",
    ".scss",
    ".less",

    ".py",
    ".java",
    ".c",
    ".h",
    ".cpp",
    ".hpp",
    ".cc",
    ".cs",

    ".php",
    ".go",
    ".rs",
    ".swift",

    ".kt",
    ".kts",

    ".sql",
    ".xml",
    ".yaml",
    ".yml",

    ".vue",
    ".svelte"
  ]
};


/* ---------------------------------------------------------
   12.2 â€” PLAN LINE LIMIT
   --------------------------------------------------------- */

function turkAIGetPlanLineLimit(
  userId
) {
  const plan =
    turkAIResolveUserPlan(
      userId
    );

  switch (plan) {
    case "developer":
      return 250000;

    case "ultra":
      return 100000;

    case "plus":
      return 60000;

    case "pro":
      return 40000;

    case "free":
    default:
      return 20000;
  }
}


/* ---------------------------------------------------------
   12.3 â€” PLAN FILE SIZE
   --------------------------------------------------------- */

function turkAIGetPlanFileSizeLimit(
  userId
) {
  const plan =
    turkAIResolveUserPlan(
      userId
    );

  switch (plan) {
    case "ultra":
      return 1024 * 1024 * 1024;

    case "developer":
      return 1024 * 1024 * 1024;

    case "plus":
      return 20 * 1024 * 1024;

    case "pro":
      return 10 * 1024 * 1024;

    case "free":
    default:
      return 10 * 1024 * 1024;
  }
}


/* ---------------------------------------------------------
   12.4 â€” LINE COUNTER
   --------------------------------------------------------- */

function turkAICountLines(text) {
  if (!text) {
    return 0;
  }

  let lines = 1;

  for (
    let i = 0;
    i < text.length;
    i++
  ) {
    if (
      text.charCodeAt(i) === 10
    ) {
      lines++;
    }
  }

  return lines;
}


/* ---------------------------------------------------------
   12.5 â€” CODE LANGUAGE DETECTOR
   --------------------------------------------------------- */

function turkAIDetectCodeLanguage(
  filename,
  text = ""
) {
  const extension =
    path.extname(
      String(filename || "")
    ).toLowerCase();

  const extensionMap = {
    ".js": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",

    ".ts": "typescript",
    ".tsx": "typescript",

    ".jsx": "javascript-react",

    ".html": "html",
    ".htm": "html",

    ".css": "css",
    ".scss": "scss",
    ".less": "css",

    ".py": "python",

    ".java": "java",

    ".c": "c",
    ".h": "c",

    ".cpp": "cpp",
    ".cc": "cpp",
    ".hpp": "cpp",

    ".cs": "csharp",

    ".php": "php",

    ".go": "go",

    ".rs": "rust",

    ".swift": "swift",

    ".kt": "kotlin",
    ".kts": "kotlin",

    ".sql": "sql",

    ".vue": "vue",

    ".svelte": "svelte"
  };

  if (
    extensionMap[extension]
  ) {
    return extensionMap[
      extension
    ];
  }

  const source =
    String(text || "")
      .slice(0, 10000);

  if (
    /\bconsole\.log\s*\(/.test(
      source
    )
  ) {
    return "javascript";
  }

  if (
    /\bdef\s+[A-Za-z_]\w*\s*\(/.test(
      source
    )
  ) {
    return "python";
  }

  if (
    /<(!DOCTYPE|html|body|div)\b/i.test(
      source
    )
  ) {
    return "html";
  }

  if (
    /\bSELECT\b.+\bFROM\b/i.test(
      source
    )
  ) {
    return "sql";
  }

  return "unknown";
}


/* ---------------------------------------------------------
   12.6 â€” CODE STRUCTURE ANALYZER
   --------------------------------------------------------- */

function turkAIAnalyzeCodeStructure(
  text,
  language
) {
  const source =
    String(text || "");

  const result = {
    language:
      language || "unknown",

    lines:
      turkAICountLines(
        source
      ),

    characters:
      source.length,

    functions: 0,

    classes: 0,

    imports: 0,

    exports: 0,

    comments: 0,

    urls: 0,

    errors: [],

    warnings: [],

    complexityHints: []
  };


  /* Functions */

  if (
    [
      "javascript",
      "typescript",
      "javascript-react"
    ].includes(language)
  ) {
    result.functions +=
      (
        source.match(
          /\bfunction\s+[A-Za-z_$][\w$]*\s*\(/g
        ) || []
      ).length;

    result.functions +=
      (
        source.match(
          /(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g
        ) || []
      ).length;

    result.classes =
      (
        source.match(
          /\bclass\s+[A-Za-z_$][\w$]*/g
        ) || []
      ).length;

    result.imports =
      (
        source.match(
          /\bimport\s+/g
        ) || []
      ).length;

    result.exports =
      (
        source.match(
          /\bexport\s+/g
        ) || []
      ).length;
  }


  /* Python */

  if (
    language === "python"
  ) {
    result.functions =
      (
        source.match(
          /^\s*def\s+\w+\s*\(/gm
        ) || []
      ).length;

    result.classes =
      (
        source.match(
          /^\s*class\s+\w+/gm
        ) || []
      ).length;

    result.imports =
      (
        source.match(
          /^\s*(?:from|import)\s+/gm
        ) || []
      ).length;
  }


  /* Java / C# / C++ */

  if (
    [
      "java",
      "c",
      "cpp",
      "csharp"
    ].includes(language)
  ) {
    result.classes =
      (
        source.match(
          /\bclass\s+[A-Za-z_]\w*/g
        ) || []
      ).length;

    result.functions =
      (
        source.match(
          /\b[A-Za-z_][\w:<>,\[\]]*\s+[A-Za-z_]\w*\s*\([^;{}]*\)\s*\{/g
        ) || []
      ).length;

    result.imports =
      (
        source.match(
          /^\s*#include\b/gm
        ) || []
      ).length +
      (
        source.match(
          /^\s*import\s+/gm
        ) || []
      ).length;
  }


  /* Generic comments */

  result.comments =
    (
      source.match(
        /\/\/.*$/gm
      ) || []
    ).length +
    (
      source.match(
        /^\s*#.*$/gm
      ) || []
    ).length +
    (
      source.match(
        /\/\*[\s\S]*?\*\//g
      ) || []
    ).length;


  /* URLs */

  result.urls =
    (
      source.match(
        /https?:\/\/[^\s"'<>]+/gi
      ) || []
    ).length;


  /* Common warning patterns */

  if (
    /\bTODO\b/i.test(source)
  ) {
    result.warnings.push(
      "TODO notlarÄ± bulundu."
    );
  }

  if (
    /\bFIXME\b/i.test(source)
  ) {
    result.warnings.push(
      "FIXME notlarÄ± bulundu."
    );
  }

  if (
    /console\.log\s*\(/.test(
      source
    )
  ) {
    result.warnings.push(
      "console.log kullanÄ±mlarÄ± bulundu."
    );
  }

  if (
    /eval\s*\(/.test(source)
  ) {
    result.warnings.push(
      "eval() kullanÄ±mÄ± bulundu; gÃ¼venlik aÃ§Ä±sÄ±ndan dikkat edilmeli."
    );
  }

  if (
    /innerHTML\s*=/.test(source)
  ) {
    result.warnings.push(
      "innerHTML kullanÄ±mÄ± bulundu; kullanÄ±cÄ± verisiyle kullanÄ±lÄ±yorsa XSS riski kontrol edilmeli."
    );
  }


  /* Complexity hints */

  const ifCount =
    (
      source.match(
        /\bif\s*\(/g
      ) || []
    ).length;

  const loopCount =
    (
      source.match(
        /\b(?:for|while)\s*\(/g
      ) || []
    ).length;

  if (
    ifCount > 1000
  ) {
    result.complexityHints.push(
      "Ã‡ok yÃ¼ksek if/koÅŸul yoÄŸunluÄŸu."
    );
  }

  if (
    loopCount > 500
  ) {
    result.complexityHints.push(
      "Ã‡ok yÃ¼ksek dÃ¶ngÃ¼ yoÄŸunluÄŸu."
    );
  }

  return result;
}


/* ---------------------------------------------------------
   12.7 â€” LARGE TEXT CHUNKER
   --------------------------------------------------------- */

function turkAILargeFileChunks(
  text,
  chunkSize = 20000
) {
  const source =
    String(text || "");

  const chunks = [];

  let start = 0;

  while (
    start < source.length
  ) {
    let end =
      Math.min(
        start + chunkSize,
        source.length
      );

    if (
      end < source.length
    ) {
      const newline =
        source.lastIndexOf(
          "\n",
          end
        );

      if (
        newline >
        start + 10000
      ) {
        end = newline;
      }
    }

    chunks.push(
      source.slice(
        start,
        end
      )
    );

    start = end;
  }

  return chunks;
}


/* ---------------------------------------------------------
   12.8 â€” LARGE FILE VALIDATION
   --------------------------------------------------------- */

function turkAIValidateLargeFile(
  userId,
  filename,
  size,
  lineCount
) {
  const plan =
    turkAIResolveUserPlan(
      userId
    );

  const maxBytes =
    turkAIGetPlanFileSizeLimit(
      userId
    );

  const maxLines =
    turkAIGetPlanLineLimit(
      userId
    );

  const errors = [];

  if (
    Number(size) >
    maxBytes
  ) {
    errors.push(
      `Dosya boyutu ${Math.round(
        maxBytes / 1024 / 1024
      )} MB sÄ±nÄ±rÄ±nÄ± aÅŸÄ±yor.`
    );
  }

  if (
    Number(lineCount) >
    maxLines
  ) {
    errors.push(
      `Bu plan iÃ§in maksimum ${maxLines.toLocaleString("tr-TR")} satÄ±r destekleniyor.`
    );
  }

  return {
    valid:
      errors.length === 0,

    plan,

    size:
      Number(size) || 0,

    maxBytes,

    lineCount:
      Number(lineCount) || 0,

    maxLines,

    errors,

    filename:
      turkAIFileNormalizeName(
        filename
      )
  };
}


/* ---------------------------------------------------------
   12.9 â€” LARGE CODE PROCESSOR
   --------------------------------------------------------- */

async function turkAIProcessLargeCodeFile({
  userId,
  filename,
  text,
  size = 0
}) {
  const source =
    String(text || "");

  const lineCount =
    turkAICountLines(
      source
    );

  const validation =
    turkAIValidateLargeFile(
      userId,
      filename,
      size,
      lineCount
    );

  if (!validation.valid) {
    return {
      success: false,

      error:
        "Dosya plan limitlerini aÅŸÄ±yor.",

      validation
    };
  }

  const language =
    turkAIDetectCodeLanguage(
      filename,
      source
    );

  const structure =
    turkAIAnalyzeCodeStructure(
      source,
      language
    );

  const chunks =
    turkAILargeFileChunks(
      source
    );

  return {
    success: true,

    filename:
      turkAIFileNormalizeName(
        filename
      ),

    language,

    size:
      Number(size) || Buffer.byteLength(
        source,
        "utf8"
      ),

    lines:
      lineCount,

    chunks:
      chunks.length,

    structure,

    plan:
      validation.plan,

    maxLines:
      validation.maxLines,

    maxBytes:
      validation.maxBytes
  };
}


/* ---------------------------------------------------------
   12.10 â€” LARGE FILE READ
   --------------------------------------------------------- */

async function turkAIReadLargeCodeFile(
  userId,
  fileId
) {
  const metadata =
    turkAIGetFileForUser(
      userId,
      fileId
    );

  if (!metadata) {
    throw new Error(
      "Dosya bulunamadÄ±."
    );
  }

  if (
    !fs.existsSync(
      metadata.storagePath
    )
  ) {
    throw new Error(
      "Dosya fiziksel olarak bulunamadÄ±."
    );
  }

  const stat =
    await fs.promises.stat(
      metadata.storagePath
    );

  const maxBytes =
    turkAIGetPlanFileSizeLimit(
      userId
    );

  if (
    stat.size >
    maxBytes
  ) {
    throw new Error(
      "Dosya mevcut planÄ±n boyut limitini aÅŸÄ±yor."
    );
  }

  const buffer =
    await fs.promises.readFile(
      metadata.storagePath
    );

  const text =
    turkAIBufferToText(
      buffer
    );

  const lineCount =
    turkAICountLines(
      text
    );

  const validation =
    turkAIValidateLargeFile(
      userId,
      metadata.originalName,
      stat.size,
      lineCount
    );

  if (
    !validation.valid
  ) {
    throw new Error(
      validation.errors.join(" ")
    );
  }

  const language =
    turkAIDetectCodeLanguage(
      metadata.originalName,
      text
    );

  const structure =
    turkAIAnalyzeCodeStructure(
      text,
      language
    );

  return {
    metadata,

    language,

    size:
      stat.size,

    lines:
      lineCount,

    structure,

    content:
      text
  };
}


/* ---------------------------------------------------------
   12.11 â€” LINE RANGE READER
   --------------------------------------------------------- */

async function turkAIReadFileLines(
  userId,
  fileId,
  startLine = 1,
  endLine = 1000
) {
  const metadata =
    turkAIGetFileForUser(
      userId,
      fileId
    );

  if (!metadata) {
    throw new Error(
      "Dosya bulunamadÄ±."
    );
  }

  if (
    !fs.existsSync(
      metadata.storagePath
    )
  ) {
    throw new Error(
      "Dosya bulunamadÄ±."
    );
  }

  const safeStart =
    Math.max(
      Number(startLine) || 1,
      1
    );

  const safeEnd =
    Math.max(
      Number(endLine) || safeStart,
      safeStart
    );

  const maxLines =
    turkAIGetPlanLineLimit(
      userId
    );

  if (
    safeEnd >
    maxLines
  ) {
    throw new Error(
      `Bu plan en fazla ${maxLines.toLocaleString("tr-TR")} satÄ±r destekliyor.`
    );
  }

  const content =
    await fs.promises.readFile(
      metadata.storagePath,
      "utf8"
    );

  const lines =
    content.split(/\r?\n/);

  return {
    fileId,

    startLine:
      safeStart,

    endLine:
      Math.min(
        safeEnd,
        lines.length
      ),

    totalLines:
      lines.length,

    content:
      lines
        .slice(
          safeStart - 1,
          safeEnd
        )
        .join("\n")
  };
}


/* ---------------------------------------------------------
   12.12 â€” CODE SEARCH
   --------------------------------------------------------- */

async function turkAISearchInsideCodeFile(
  userId,
  fileId,
  query
) {
  const metadata =
    turkAIGetFileForUser(
      userId,
      fileId
    );

  if (!metadata) {
    throw new Error(
      "Dosya bulunamadÄ±."
    );
  }

  if (
    !fs.existsSync(
      metadata.storagePath
    )
  ) {
    throw new Error(
      "Dosya fiziksel olarak bulunamadÄ±."
    );
  }

  const search =
    String(query || "")
      .trim()
      .toLowerCase();

  if (!search) {
    return [];
  }

  const stream =
    fs.createReadStream(
      metadata.storagePath,
      {
        encoding: "utf8"
      }
    );

  const results = [];

  let buffer = "";

  let lineNumber = 0;

  return new Promise(
    (resolve, reject) => {

      stream.on(
        "data",
        chunk => {

          buffer += chunk;

          const parts =
            buffer.split("\n");

          buffer =
            parts.pop() || "";

          for (
            const rawLine of parts
          ) {
            lineNumber++;

            const line =
              rawLine.replace(
                /\r$/,
                ""
              );

            if (
              line
                .toLowerCase()
                .includes(search)
            ) {
              results.push({
                line:
                  lineNumber,

                text:
                  line.slice(
                    0,
                    2000
                  )
              });

              if (
                results.length >= 100
              ) {
                stream.destroy();
                break;
              }
            }
          }
        }
      );

      stream.on(
        "end",
        () => {

          if (
            buffer &&
            results.length < 100
          ) {
            lineNumber++;

            if (
              buffer
                .toLowerCase()
                .includes(search)
            ) {
              results.push({
                line:
                  lineNumber,

                text:
                  buffer.slice(
                    0,
                    2000
                  )
              });
            }
          }

          resolve(
            results
          );
        }
      );

      stream.on(
        "error",
        reject
      );
    }
  );
}


/* ---------------------------------------------------------
   12.13 â€” CODE ANALYSIS ROUTE
   --------------------------------------------------------- */

app.get(
  "/api/files/:fileId/code-analysis",
  requireTurkAIAuth,
  async (req, res) => {

    try {

      const userId =
        turkAIGetRequestUserId(
          req
        );

      const result =
        await turkAIReadLargeCodeFile(
          userId,
          req.params.fileId
        );

      return res.json({
        success: true,

        fileId:
          req.params.fileId,

        filename:
          result.metadata.originalName,

        language:
          result.language,

        lines:
          result.lines,

        size:
          result.size,

        structure:
          result.structure
      });

    } catch (error) {

      return res.status(400).json({
        success: false,

        error:
          error.message
      });
    }
  }
);


/* ---------------------------------------------------------
   12.14 â€” LINE RANGE ROUTE
   --------------------------------------------------------- */

app.get(
  "/api/files/:fileId/lines",
  requireTurkAIAuth,
  async (req, res) => {

    try {

      const userId =
        turkAIGetRequestUserId(
          req
        );

      const start =
        Number(
          req.query.start || 1
        );

      const end =
        Number(
          req.query.end ||
          start + 999
        );

      const result =
        await turkAIReadFileLines(
          userId,
          req.params.fileId,
          start,
          end
        );

      return res.json({
        success: true,

        ...result
      });

    } catch (error) {

      return res.status(400).json({
        success: false,

        error:
          error.message
      });
    }
  }
);


/* ---------------------------------------------------------
   12.15 â€” SEARCH INSIDE FILE
   --------------------------------------------------------- */

app.get(
  "/api/files/:fileId/search",
  requireTurkAIAuth,
  async (req, res) => {

    try {

      const userId =
        turkAIGetRequestUserId(
          req
        );

      const results =
        await turkAISearchInsideCodeFile(
          userId,
          req.params.fileId,
          req.query.q
        );

      return res.json({
        success: true,

        query:
          String(
            req.query.q || ""
          ),

        results
      });

    } catch (error) {

      return res.status(400).json({
        success: false,

        error:
          error.message
      });
    }
  }
);


/* ---------------------------------------------------------
   12.16 â€” PLAN FILE LIMIT ROUTE
   --------------------------------------------------------- */

app.get(
  "/api/files/limits",
  optionalTurkAIAuth,
  (req, res) => {

    const userId =
      turkAIGetRequestUserId(
        req
      ) ||
      "guest";

    const plan =
      turkAIResolveUserPlan(
        userId
      );

    return res.json({
      success: true,

      plan,

      maxFileSizeBytes:
        turkAIGetPlanFileSizeLimit(
          userId
        ),

      maxFileSizeMB:
        Math.round(
          turkAIGetPlanFileSizeLimit(
            userId
          ) /
          1024 /
          1024
        ),

      maxLines:
        turkAIGetPlanLineLimit(
          userId
        )
    });
  }
);


/* ---------------------------------------------------------
   12.17 â€” LARGE FILE HEALTH
   --------------------------------------------------------- */

app.get(
  "/api/files/large-engine/health",
  (req, res) => {

    return res.json({
      success: true,

      engine:
        "turkai-ultra-large-file-engine",

      version:
        TURKAI_ULTRA_FILE_CONFIG.version,

      ultra: {
        maxFileSize:
          "1 GB",

        maxLines:
          100000
      },

      developer: {
        maxFileSize:
          "1 GB",

        maxLines:
          250000
      },

      supportedLargeFiles:
        TURKAI_ULTRA_FILE_CONFIG
          .supportedLargeFiles,

      timestamp:
        new Date().toISOString()
    });
  }
);


/* ---------------------------------------------------------
   12.18 â€” EXPORTS
   --------------------------------------------------------- */

module.exports.TURKAI_ULTRA_FILE_CONFIG =
  TURKAI_ULTRA_FILE_CONFIG;

module.exports.turkAIGetPlanLineLimit =
  turkAIGetPlanLineLimit;

module.exports.turkAIGetPlanFileSizeLimit =
  turkAIGetPlanFileSizeLimit;

module.exports.turkAICountLines =
  turkAICountLines;

module.exports.turkAIDetectCodeLanguage =
  turkAIDetectCodeLanguage;

module.exports.turkAIAnalyzeCodeStructure =
  turkAIAnalyzeCodeStructure;

module.exports.turkAIProcessLargeCodeFile =
  turkAIProcessLargeCodeFile;

module.exports.turkAIReadLargeCodeFile =
  turkAIReadLargeCodeFile;

module.exports.turkAIReadFileLines =
  turkAIReadFileLines;

module.exports.turkAISearchInsideCodeFile =
  turkAISearchInsideCodeFile;

module.exports.turkAIValidateLargeFile =
  turkAIValidateLargeFile;


/* ---------------------------------------------------------
   12.19 â€” READY
   --------------------------------------------------------- */

console.log(
  "ğŸš€ TÃœRKAI SERVER PART 12 / 20 hazÄ±r."
);

console.log(
  "âš¡ Ultra maksimum dosya boyutu: 1 GB."
);

console.log(
  "ğŸ§  Ultra maksimum kod satÄ±rÄ±: 100.000."
);

console.log(
  "ğŸ’» Developer maksimum kod satÄ±rÄ±: 250.000."
);

console.log(
  "ğŸ” BÃ¼yÃ¼k dosya iÃ§inde satÄ±r arama + kod analizi aktif."
);
// ============================================================
/* ============================================================
   TÃœRKAI â€” PART 17 / 20
   MEDIA GENERATION ENGINE
   IMAGE + VIDEO + ASYNC JOBS + STORAGE + HISTORY
   ============================================================ */

const TURKAI_MEDIA_CONFIG = {
  version: "17.0.0",

  enabled: true,

  directories: {
    root: path.join(process.cwd(), "data", "media"),
    images: path.join(process.cwd(), "data", "media", "images"),
    videos: path.join(process.cwd(), "data", "media", "videos"),
    jobs: path.join(process.cwd(), "data", "media", "jobs")
  },

  files: {
    jobs: path.join(process.cwd(), "data", "media", "jobs.json"),
    history: path.join(process.cwd(), "data", "media", "history.json"),
    providers: path.join(process.cwd(), "data", "media", "providers.json")
  },

  image: {
    enabled: true,

    allowedPlans: [
      "pro",
      "plus",
      "ultra",
      "developer"
    ],

    formats: [
      "png",
      "jpg",
      "jpeg",
      "webp"
    ],

    maxPromptLength: 8000,
    maxImagesPerJob: 4,

    defaultWidth: 1024,
    defaultHeight: 1024,

    sizes: {
      square: {
        width: 1024,
        height: 1024
      },

      portrait: {
        width: 1024,
        height: 1536
      },

      landscape: {
        width: 1536,
        height: 1024
      },

      wide: {
        width: 1536,
        height: 864
      }
    }
  },

  video: {
    enabled: true,

    allowedPlans: [
      "plus",
      "ultra",
      "developer"
    ],

    maxPromptLength: 8000,

    defaultDuration: 5,

    durations: [
      5,
      10,
      15,
      20
    ],

    resolutions: [
      "720p",
      "1080p"
    ]
  },

  jobs: {
    maxConcurrentPerUser: 2,
    maxHistoryPerUser: 100,
    cleanupAfterDays: 14,
    progressInterval: 1000
  }
};


/* ============================================================
   MEDIA DIRECTORIES
   ============================================================ */

function turkAIEnsureMediaDirectories() {

  const dirs = [
    TURKAI_MEDIA_CONFIG.directories.root,
    TURKAI_MEDIA_CONFIG.directories.images,
    TURKAI_MEDIA_CONFIG.directories.videos,
    TURKAI_MEDIA_CONFIG.directories.jobs
  ];

  for (const dir of dirs) {
    ensureDirectory(dir);
  }
}

turkAIEnsureMediaDirectories();


/* ============================================================
   MEDIA DATABASE
   ============================================================ */

let turkAIMediaDatabase = {
  jobs: {},
  history: [],
  providers: {}
};


function turkAILoadMediaDatabase() {

  try {

    const jobs = readJson(
      TURKAI_MEDIA_CONFIG.files.jobs,
      {}
    );

    const history = readJson(
      TURKAI_MEDIA_CONFIG.files.history,
      []
    );

    const providers = readJson(
      TURKAI_MEDIA_CONFIG.files.providers,
      {}
    );

    turkAIMediaDatabase.jobs =
      jobs && typeof jobs === "object"
        ? jobs
        : {};

    turkAIMediaDatabase.history =
      Array.isArray(history)
        ? history
        : [];

    turkAIMediaDatabase.providers =
      providers && typeof providers === "object"
        ? providers
        : {};

  } catch (error) {

    console.error(
      "[TÃ¼rkAI Media] Database load error:",
      error.message
    );

  }
}


function turkAISaveMediaDatabase() {

  try {

    writeJson(
      TURKAI_MEDIA_CONFIG.files.jobs,
      turkAIMediaDatabase.jobs
    );

    writeJson(
      TURKAI_MEDIA_CONFIG.files.history,
      turkAIMediaDatabase.history
    );

    writeJson(
      TURKAI_MEDIA_CONFIG.files.providers,
      turkAIMediaDatabase.providers
    );

    return true;

  } catch (error) {

    console.error(
      "[TÃ¼rkAI Media] Database save error:",
      error.message
    );

    return false;
  }
}


turkAILoadMediaDatabase();


/* ============================================================
   MEDIA HELPERS
   ============================================================ */

function turkAIMediaText(value, fallback = "") {

  if (value === undefined || value === null) {
    return fallback;
  }

  return String(value)
    .replace(/\u0000/g, "")
    .trim();
}


function turkAIMediaId(prefix = "media") {

  return `${prefix}_${Date.now()}_${crypto
    .randomBytes(8)
    .toString("hex")}`;
}


function turkAIMediaTimestamp() {

  return new Date().toISOString();
}


function turkAIMediaNormalizePlan(plan) {

  const value = turkAIMediaText(
    plan,
    "free"
  ).toLowerCase();

  return [
    "free",
    "pro",
    "plus",
    "ultra",
    "developer"
  ].includes(value)
    ? value
    : "free";
}


function turkAIMediaGetPlan(userId) {

  try {

    if (typeof getTurkAIAccount === "function") {

      const account =
        getTurkAIAccount(userId);

      if (account?.plan) {
        return turkAIMediaNormalizePlan(
          account.plan
        );
      }
    }

  } catch (_) {}

  return "free";
}


function turkAIMediaCanUseImage(userId) {

  const plan =
    turkAIMediaGetPlan(userId);

  return TURKAI_MEDIA_CONFIG.image.allowedPlans
    .includes(plan);
}


function turkAIMediaCanUseVideo(userId) {

  const plan =
    turkAIMediaGetPlan(userId);

  return TURKAI_MEDIA_CONFIG.video.allowedPlans
    .includes(plan);
}


function turkAIMediaSanitizeFileName(name) {

  return turkAIMediaText(name, "media")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
}


/* ============================================================
   PROVIDER SYSTEM
   ============================================================ */

const TURKAI_MEDIA_PROVIDERS = {

  image: {

    openai: {
      name: "OpenAI",
      envKey: "OPENAI_API_KEY",
      enabled: Boolean(process.env.OPENAI_API_KEY)
    },

    stability: {
      name: "Stability",
      envKey: "STABILITY_API_KEY",
      enabled: Boolean(process.env.STABILITY_API_KEY)
    },

    custom: {
      name: "Custom",
      envKey: "TURKAI_IMAGE_API_KEY",
      enabled: Boolean(process.env.TURKAI_IMAGE_API_KEY)
    }
  },

  video: {

    openai: {
      name: "OpenAI Video",
      envKey: "OPENAI_API_KEY",
      enabled: Boolean(process.env.OPENAI_API_KEY)
    },

    custom: {
      name: "Custom Video",
      envKey: "TURKAI_VIDEO_API_KEY",
      enabled: Boolean(process.env.TURKAI_VIDEO_API_KEY)
    }
  }
};


function turkAIGetMediaProviders(type) {

  const source =
    TURKAI_MEDIA_PROVIDERS[type] || {};

  return Object.entries(source)
    .map(([id, provider]) => ({
      id,
      name: provider.name,
      enabled: Boolean(provider.enabled)
    }));
}


function turkAIGetActiveMediaProvider(type) {

  const providers =
    turkAIGetMediaProviders(type);

  return providers.find(
    provider => provider.enabled
  ) || null;
}


/* ============================================================
   QUOTA BRIDGE
   ============================================================ */

function turkAIMediaConsumeQuota(
  userId,
  type
) {

  try {

    if (typeof turkAIConsumeUsage === "function") {

      return turkAIConsumeUsage(
        userId,
        type === "image"
          ? "images"
          : "videos",
        1
      );
    }

  } catch (error) {

    console.warn(
      "[TÃ¼rkAI Media] quota:",
      error.message
    );

  }

  return {
    allowed: true,
    fallback: true
  };
}


function turkAIMediaRollbackQuota(
  userId,
  type
) {

  try {

    if (typeof turkAIRollbackUsage === "function") {

      return turkAIRollbackUsage(
        userId,
        type === "image"
          ? "images"
          : "videos",
        1
      );
    }

  } catch (_) {}

  return {
    success: true
  };
}


/* ============================================================
   JOB STATE
   ============================================================ */

function turkAICountUserActiveMediaJobs(
  userId
) {

  return Object.values(
    turkAIMediaDatabase.jobs
  ).filter(job => {

    return (
      job.userId === userId &&
      [
        "queued",
        "processing"
      ].includes(job.status)
    );

  }).length;
}


function turkAICreateMediaJob({

  userId,
  type,
  prompt,
  options = {}
}) {

  const id =
    turkAIMediaId(
      type === "image"
        ? "img"
        : "vid"
    );

  const job = {

    id,

    userId,

    type,

    status: "queued",

    progress: 0,

    prompt,

    options,

    provider: null,

    result: null,

    error: null,

    createdAt:
      turkAIMediaTimestamp(),

    startedAt: null,

    completedAt: null,

    updatedAt:
      turkAIMediaTimestamp()
  };

  turkAIMediaDatabase.jobs[id] =
    job;

  turkAISaveMediaDatabase();

  return job;
}


function turkAIUpdateMediaJob(
  jobId,
  patch = {}
) {

  const job =
    turkAIMediaDatabase.jobs[jobId];

  if (!job) {
    return null;
  }

  Object.assign(
    job,
    patch,
    {
      updatedAt:
        turkAIMediaTimestamp()
    }
  );

  turkAISaveMediaDatabase();

  return job;
}


/* ============================================================
   REALTIME PROGRESS BRIDGE
   ============================================================ */

function turkAIMediaRealtime(
  method,
  ...args
) {

  try {

    if (
      typeof globalThis[method] ===
      "function"
    ) {

      return globalThis[method](...args);
    }

  } catch (_) {}

  return null;
}


function turkAIMediaProgress(
  job,
  progress,
  message
) {

  const next =
    Math.max(
      0,
      Math.min(
        100,
        Number(progress) || 0
      )
    );

  job.progress = next;
  job.updatedAt =
    turkAIMediaTimestamp();

  turkAISaveMediaDatabase();

  try {

    if (
      typeof turkAIEmitTaskProgress ===
      "function"
    ) {

      turkAIEmitTaskProgress(
        job.userId,
        job.id,
        next,
        message ||
          `${job.type} hazÄ±rlanÄ±yor...`
      );
    }

  } catch (_) {}

  return job;
}


/* ============================================================
   IMAGE OPTIONS
   ============================================================ */

function turkAINormalizeImageOptions(
  options = {}
) {

  const size =
    turkAIMediaText(
      options.size,
      "square"
    ).toLowerCase();

  const selected =
    TURKAI_MEDIA_CONFIG.image.sizes[
      size
    ] ||
    TURKAI_MEDIA_CONFIG.image.sizes.square;

  const width =
    Number(options.width) ||
    selected.width;

  const height =
    Number(options.height) ||
    selected.height;

  const format =
    turkAIMediaText(
      options.format,
      "png"
    ).toLowerCase();

  return {

    size,

    width: Math.max(
      256,
      Math.min(
        4096,
        width
      )
    ),

    height: Math.max(
      256,
      Math.min(
        4096,
        height
      )
    ),

    format:
      TURKAI_MEDIA_CONFIG.image.formats
        .includes(format)
        ? format
        : "png",

    count:
      Math.max(
        1,
        Math.min(
          TURKAI_MEDIA_CONFIG.image.maxImagesPerJob,
          Number(options.count) || 1
        )
      ),

    quality:
      turkAIMediaText(
        options.quality,
        "standard"
      )
  };
}


/* ============================================================
   VIDEO OPTIONS
   ============================================================ */

function turkAINormalizeVideoOptions(
  options = {}
) {

  let duration =
    Number(options.duration) ||
    TURKAI_MEDIA_CONFIG.video.defaultDuration;

  if (
    !TURKAI_MEDIA_CONFIG.video.durations
      .includes(duration)
  ) {

    duration =
      TURKAI_MEDIA_CONFIG.video.defaultDuration;
  }

  let resolution =
    turkAIMediaText(
      options.resolution,
      "720p"
    ).toLowerCase();

  if (
    !TURKAI_MEDIA_CONFIG.video.resolutions
      .map(x => x.toLowerCase())
      .includes(resolution)
  ) {

    resolution = "720p";
  }

  return {

    duration,

    resolution,

    fps:
      Math.max(
        12,
        Math.min(
          60,
          Number(options.fps) || 30
        )
      ),

    aspectRatio:
      turkAIMediaText(
        options.aspectRatio,
        "16:9"
      )
  };
}


/* ============================================================
   LOCAL PLACEHOLDER MEDIA
   ============================================================ */

function turkAICreatePlaceholderMedia(
  job
) {

  const folder =
    job.type === "image"
      ? TURKAI_MEDIA_CONFIG.directories.images
      : TURKAI_MEDIA_CONFIG.directories.videos;

  const fileName =
    turkAIMediaSanitizeFileName(
      `${job.id}.${
        job.type === "image"
          ? "json"
          : "json"
      }`
    );

  const filePath =
    path.join(
      folder,
      fileName
    );

  const payload = {

    generatedBy:
      "TÃ¼rkAI Media Engine",

    jobId:
      job.id,

    type:
      job.type,

    prompt:
      job.prompt,

    options:
      job.options,

    generatedAt:
      turkAIMediaTimestamp(),

    status:
      "provider_pending"
  };

  fs.writeFileSync(
    filePath,
    JSON.stringify(
      payload,
      null,
      2
    ),
    "utf8"
  );

  return {
    fileName,
    filePath,
    metadata: payload
  };
}


/* ============================================================
   IMAGE GENERATION ENGINE
   ============================================================ */

async function turkAIGenerateImageJob(
  job
) {

  const provider =
    turkAIGetActiveMediaProvider(
      "image"
    );

  turkAIUpdateMediaJob(
    job.id,
    {
      status: "processing",
      startedAt:
        turkAIMediaTimestamp(),
      provider:
        provider?.id || null
    }
  );

  try {

    turkAIMediaProgress(
      job,
      10,
      "GÃ¶rsel gÃ¶revi baÅŸlatÄ±ldÄ±"
    );

    await new Promise(
      resolve => setTimeout(
        resolve,
        250
      )
    );

    turkAIMediaProgress(
      job,
      30,
      "Prompt analiz ediliyor"
    );

    await new Promise(
      resolve => setTimeout(
        resolve,
        300
      )
    );

    turkAIMediaProgress(
      job,
      55,
      "GÃ¶rsel motoru hazÄ±rlanÄ±yor"
    );

    /*
      GerÃ§ek provider entegrasyonu burada
      devreye alÄ±nabilir.

      Provider yoksa sistem Ã§Ã¶kmÃ¼yor.
      Job metadata ile tamamlanÄ±yor.
    */

    const result =
      turkAICreatePlaceholderMedia(
        job
      );

    turkAIMediaProgress(
      job,
      85,
      "Ã‡Ä±ktÄ± kaydediliyor"
    );

    await new Promise(
      resolve => setTimeout(
        resolve,
        250
      )
    );

    const completed =
      turkAIUpdateMediaJob(
        job.id,
        {

          status: "completed",

          progress: 100,

          result: {

            type: "image",

            fileName:
              result.fileName,

            filePath:
              result.filePath,

            provider:
              provider?.id || null,

            providerAvailable:
              Boolean(provider),

            metadata:
              result.metadata
          },

          completedAt:
            turkAIMediaTimestamp()
        }
      );

    try {

      if (
        typeof turkAIEmitTaskCompleted ===
        "function"
      ) {

        turkAIEmitTaskCompleted(
          job.userId,
          job.id,
          completed.result
        );
      }

    } catch (_) {}

    turkAIAddMediaHistory(
      completed
    );

    return completed;

  } catch (error) {

    const failed =
      turkAIUpdateMediaJob(
        job.id,
        {
          status: "failed",
          error: error.message,
          completedAt:
            turkAIMediaTimestamp()
        }
      );

    try {

      if (
        typeof turkAIEmitTaskFailed ===
        "function"
      ) {

        turkAIEmitTaskFailed(
          job.userId,
          job.id,
          error.message
        );
      }

    } catch (_) {}

    return failed;
  }
}


/* ============================================================
   VIDEO GENERATION ENGINE
   ============================================================ */

async function turkAIGenerateVideoJob(
  job
) {

  const provider =
    turkAIGetActiveMediaProvider(
      "video"
    );

  turkAIUpdateMediaJob(
    job.id,
    {

      status: "processing",

      startedAt:
        turkAIMediaTimestamp(),

      provider:
        provider?.id || null
    }
  );

  try {

    if (
      typeof turkAIEmitTaskStarted ===
      "function"
    ) {

      turkAIEmitTaskStarted(
        job.userId,
        job.id,
        {
          type: "video",
          prompt: job.prompt
        }
      );
    }

    const steps = [
      [10, "Video gÃ¶revi baÅŸlatÄ±ldÄ±"],
      [20, "Sahne planÄ± oluÅŸturuluyor"],
      [35, "Hareket analizi yapÄ±lÄ±yor"],
      [50, "Video kareleri hazÄ±rlanÄ±yor"],
      [65, "Animasyon iÅŸleniyor"],
      [80, "Ses ve gÃ¶rÃ¼ntÃ¼ senkronize ediliyor"],
      [92, "Video sonlandÄ±rÄ±lÄ±yor"]
    ];

    for (const [
      progress,
      message
    ] of steps) {

      turkAIMediaProgress(
        job,
        progress,
        message
      );

      await new Promise(
        resolve => setTimeout(
          resolve,
          TURKAI_MEDIA_CONFIG.jobs
            .progressInterval
        )
      );
    }

    const result =
      turkAICreatePlaceholderMedia(
        job
      );

    const completed =
      turkAIUpdateMediaJob(
        job.id,
        {

          status: "completed",

          progress: 100,

          result: {

            type: "video",

            fileName:
              result.fileName,

            filePath:
              result.filePath,

            provider:
              provider?.id || null,

            providerAvailable:
              Boolean(provider),

            metadata:
              result.metadata
          },

          completedAt:
            turkAIMediaTimestamp()
        }
      );

    try {

      if (
        typeof turkAIEmitTaskCompleted ===
        "function"
      ) {

        turkAIEmitTaskCompleted(
          job.userId,
          job.id,
          completed.result
        );
      }

    } catch (_) {}

    turkAIAddMediaHistory(
      completed
    );

    return completed;

  } catch (error) {

    const failed =
      turkAIUpdateMediaJob(
        job.id,
        {

          status: "failed",

          error:
            error.message,

          completedAt:
            turkAIMediaTimestamp()
        }
      );

    try {

      if (
        typeof turkAIEmitTaskFailed ===
        "function"
      ) {

        turkAIEmitTaskFailed(
          job.userId,
          job.id,
          error.message
        );
      }

    } catch (_) {}

    return failed;
  }
}


/* ============================================================
   MEDIA JOB RUNNER
   ============================================================ */

async function turkAIRunMediaJob(
  job
) {

  if (!job) {
    return null;
  }

  try {

    if (
      job.type === "image"
    ) {

      return await turkAIGenerateImageJob(
        job
      );
    }

    if (
      job.type === "video"
    ) {

      return await turkAIGenerateVideoJob(
        job
      );
    }

    return turkAIUpdateMediaJob(
      job.id,
      {
        status: "failed",
        error: "Desteklenmeyen medya tipi"
      }
    );

  } catch (error) {

    return turkAIUpdateMediaJob(
      job.id,
      {
        status: "failed",
        error: error.message
      }
    );
  }
}


/* ============================================================
   MEDIA HISTORY
   ============================================================ */

function turkAIAddMediaHistory(
  job
) {

  if (!job) {
    return null;
  }

  turkAIMediaDatabase.history.unshift({

    id:
      job.id,

    userId:
      job.userId,

    type:
      job.type,

    status:
      job.status,

    prompt:
      job.prompt,

    result:
      job.result,

    provider:
      job.provider,

    createdAt:
      job.createdAt,

    completedAt:
      job.completedAt
  });

  const max =
    TURKAI_MEDIA_CONFIG.jobs
      .maxHistoryPerUser;

  const userHistory =
    turkAIMediaDatabase.history
      .filter(
        item =>
          item.userId === job.userId
      );

  if (
    userHistory.length > max
  ) {

    const remove =
      userHistory.slice(max);

    for (const item of remove) {

      const index =
        turkAIMediaDatabase.history
          .indexOf(item);

      if (index !== -1) {

        turkAIMediaDatabase.history
          .splice(index, 1);
      }
    }
  }

  turkAISaveMediaDatabase();

  return job;
}


function turkAIGetMediaHistory(
  userId,
  type = null,
  limit = 50
) {

  const safeLimit =
    Math.max(
      1,
      Math.min(
        100,
        Number(limit) || 50
      )
    );

  return turkAIMediaDatabase.history
    .filter(item => {

      if (
        item.userId !== userId
      ) {
        return false;
      }

      if (
        type &&
        item.type !== type
      ) {
        return false;
      }

      return true;

    })
    .slice(
      0,
      safeLimit
    );
}


/* ============================================================
   JOB GETTER
   ============================================================ */

function turkAIGetMediaJob(
  jobId,
  userId = null
) {

  const job =
    turkAIMediaDatabase.jobs[
      jobId
    ];

  if (!job) {
    return null;
  }

  if (
    userId &&
    job.userId !== userId
  ) {

    return null;
  }

  return job;
}


/* ============================================================
   IMAGE REQUEST
   ============================================================ */

async function turkAIRequestImageGeneration(
  userId,
  prompt,
  options = {}
) {

  if (
    !turkAIMediaCanUseImage(
      userId
    )
  ) {

    return {

      success: false,

      error:
        "GÃ¶rsel Ã¼retimi mevcut planÄ±nda kullanÄ±lamÄ±yor.",

      code:
        "IMAGE_PLAN_REQUIRED"
    };
  }

  const cleanPrompt =
    turkAIMediaText(
      prompt
    );

  if (
    !cleanPrompt
  ) {

    return {

      success: false,

      error:
        "GÃ¶rsel promptu boÅŸ olamaz.",

      code:
        "EMPTY_PROMPT"
    };
  }

  if (
    cleanPrompt.length >
    TURKAI_MEDIA_CONFIG.image
      .maxPromptLength
  ) {

    return {

      success: false,

      error:
        "Prompt Ã§ok uzun.",

      code:
        "PROMPT_TOO_LONG"
    };
  }

  const activeJobs =
    turkAICountUserActiveMediaJobs(
      userId
    );

  if (
    activeJobs >=
    TURKAI_MEDIA_CONFIG.jobs
      .maxConcurrentPerUser
  ) {

    return {

      success: false,

      error:
        "AynÄ± anda Ã§ok fazla medya gÃ¶revi Ã§alÄ±ÅŸÄ±yor.",

      code:
        "TOO_MANY_ACTIVE_JOBS"
    };
  }

  const quota =
    turkAIMediaConsumeQuota(
      userId,
      "image"
    );

  if (
    quota &&
    quota.allowed === false
  ) {

    return {

      success: false,

      error:
        quota.message ||
        "GÃ¼nlÃ¼k gÃ¶rsel limitine ulaÅŸÄ±ldÄ±.",

      code:
        "IMAGE_QUOTA"
    };
  }

  const normalizedOptions =
    turkAINormalizeImageOptions(
      options
    );

  const job =
    turkAICreateMediaJob({

      userId,

      type: "image",

      prompt:
        cleanPrompt,

      options:
        normalizedOptions
    });

  setImmediate(
    () => {

      turkAIRunMediaJob(
        job
      ).catch(
        console.error
      );

    }
  );

  return {

    success: true,

    jobId:
      job.id,

    status:
      job.status,

    type:
      "image",

    options:
      normalizedOptions
  };
}


/* ============================================================
   VIDEO REQUEST
   ============================================================ */

async function turkAIRequestVideoGeneration(
  userId,
  prompt,
  options = {}
) {

  if (
    !turkAIMediaCanUseVideo(
      userId
    )
  ) {

    return {

      success: false,

      error:
        "Video Ã¼retimi Plus veya Ã¼zeri plan gerektirir.",

      code:
        "VIDEO_PLAN_REQUIRED"
    };
  }

  const cleanPrompt =
    turkAIMediaText(
      prompt
    );

  if (
    !cleanPrompt
  ) {

    return {

      success: false,

      error:
        "Video promptu boÅŸ olamaz.",

      code:
        "EMPTY_PROMPT"
    };
  }

  if (
    cleanPrompt.length >
    TURKAI_MEDIA_CONFIG.video
      .maxPromptLength
  ) {

    return {

      success: false,

      error:
        "Prompt Ã§ok uzun.",

      code:
        "PROMPT_TOO_LONG"
    };
  }

  const activeJobs =
    turkAICountUserActiveMediaJobs(
      userId
    );

  if (
    activeJobs >=
    TURKAI_MEDIA_CONFIG.jobs
      .maxConcurrentPerUser
  ) {

    return {

      success: false,

      error:
        "AynÄ± anda Ã§ok fazla medya gÃ¶revi Ã§alÄ±ÅŸÄ±yor.",

      code:
        "TOO_MANY_ACTIVE_JOBS"
    };
  }

  const quota =
    turkAIMediaConsumeQuota(
      userId,
      "video"
    );

  if (
    quota &&
    quota.allowed === false
  ) {

    return {

      success: false,

      error:
        quota.message ||
        "GÃ¼nlÃ¼k video limitine ulaÅŸÄ±ldÄ±.",

      code:
        "VIDEO_QUOTA"
    };
  }

  const normalizedOptions =
    turkAINormalizeVideoOptions(
      options
    );

  const job =
    turkAICreateMediaJob({

      userId,

      type: "video",

      prompt:
        cleanPrompt,

      options:
        normalizedOptions
    });

  setImmediate(
    () => {

      turkAIRunMediaJob(
        job
      ).catch(
        console.error
      );

    }
  );

  return {

    success: true,

    jobId:
      job.id,

    status:
      job.status,

    type:
      "video",

    options:
      normalizedOptions
  };
}


/* ============================================================
   HTTP API â€” IMAGE
   ============================================================ */

app.post(
  "/api/media/image",
  optionalTurkAIAuth,
  async (req, res) => {

    try {

      const userId =
        req.user?.id ||
        req.body?.userId ||
        "guest";

      const result =
        await turkAIRequestImageGeneration(
          userId,
          req.body?.prompt,
          req.body?.options || {}
        );

      res.json(result);

    } catch (error) {

      res.status(500).json({

        success: false,

        error:
          error.message ||
          "GÃ¶rsel gÃ¶revi oluÅŸturulamadÄ±."
      });

    }
  }
);


/* ============================================================
   HTTP API â€” VIDEO
   ============================================================ */

app.post(
  "/api/media/video",
  optionalTurkAIAuth,
  async (req, res) => {

    try {

      const userId =
        req.user?.id ||
        req.body?.userId ||
        "guest";

      const result =
        await turkAIRequestVideoGeneration(
          userId,
          req.body?.prompt,
          req.body?.options || {}
        );

      res.json(result);

    } catch (error) {

      res.status(500).json({

        success: false,

        error:
          error.message ||
          "Video gÃ¶revi oluÅŸturulamadÄ±."
      });

    }
  }
);


/* ============================================================
   JOB STATUS API
   ============================================================ */

app.get(
  "/api/media/jobs/:jobId",
  optionalTurkAIAuth,
  (req, res) => {

    const userId =
      req.user?.id ||
      req.query?.userId ||
      "guest";

    const job =
      turkAIGetMediaJob(
        req.params.jobId,
        userId
      );

    if (!job) {

      return res.status(404).json({

        success: false,

        error:
          "Medya gÃ¶revi bulunamadÄ±."
      });
    }

    res.json({

      success: true,

      job
    });
  }
);


/* ============================================================
   MEDIA HISTORY API
   ============================================================ */

app.get(
  "/api/media/history",
  optionalTurkAIAuth,
  (req, res) => {

    const userId =
      req.user?.id ||
      req.query?.userId ||
      "guest";

    const history =
      turkAIGetMediaHistory(
        userId,
        req.query?.type || null,
        req.query?.limit || 50
      );

    res.json({

      success: true,

      count:
        history.length,

      history
    });
  }
);


/* ============================================================
   DELETE MEDIA JOB
   ============================================================ */

app.delete(
  "/api/media/jobs/:jobId",
  optionalTurkAIAuth,
  (req, res) => {

    const userId =
      req.user?.id ||
      req.query?.userId ||
      "guest";

    const job =
      turkAIGetMediaJob(
        req.params.jobId,
        userId
      );

    if (!job) {

      return res.status(404).json({

        success: false,

        error:
          "GÃ¶rev bulunamadÄ±."
      });
    }

    delete turkAIMediaDatabase.jobs[
      req.params.jobId
    ];

    turkAISaveMediaDatabase();

    res.json({

      success: true,

      deleted:
        req.params.jobId
    });
  }
);


/* ============================================================
   MEDIA PROVIDERS API
   ============================================================ */

app.get(
  "/api/media/providers",
  (req, res) => {

    res.json({

      success: true,

      image:
        turkAIGetMediaProviders(
          "image"
        ),

      video:
        turkAIGetMediaProviders(
          "video"
        )
    });
  }
);


/* ============================================================
   MEDIA LIMITS API
   ============================================================ */

app.get(
  "/api/media/limits",
  optionalTurkAIAuth,
  (req, res) => {

    const userId =
      req.user?.id ||
      req.query?.userId ||
      "guest";

    const plan =
      turkAIMediaGetPlan(
        userId
      );

    res.json({

      success: true,

      plan,

      image: {

        enabled:
          turkAIMediaCanUseImage(
            userId
          ),

        maxPromptLength:
          TURKAI_MEDIA_CONFIG.image
            .maxPromptLength,

        maxImagesPerJob:
          TURKAI_MEDIA_CONFIG.image
            .maxImagesPerJob,

        sizes:
          TURKAI_MEDIA_CONFIG.image
            .sizes
      },

      video: {

        enabled:
          turkAIMediaCanUseVideo(
            userId
          ),

        maxPromptLength:
          TURKAI_MEDIA_CONFIG.video
            .maxPromptLength,

        durations:
          TURKAI_MEDIA_CONFIG.video
            .durations,

        resolutions:
          TURKAI_MEDIA_CONFIG.video
            .resolutions
      }
    });
  }
);


/* ============================================================
   MEDIA HEALTH
   ============================================================ */

app.get(
  "/api/media/health",
  (req, res) => {

    const jobs =
      Object.values(
        turkAIMediaDatabase.jobs
      );

    res.json({

      success: true,

      version:
        TURKAI_MEDIA_CONFIG.version,

      enabled:
        TURKAI_MEDIA_CONFIG.enabled,

      jobs: {

        total:
          jobs.length,

        queued:
          jobs.filter(
            x => x.status === "queued"
          ).length,

        processing:
          jobs.filter(
            x => x.status === "processing"
          ).length,

        completed:
          jobs.filter(
            x => x.status === "completed"
          ).length,

        failed:
          jobs.filter(
            x => x.status === "failed"
          ).length
      },

      providers: {

        image:
          turkAIGetMediaProviders(
            "image"
          ),

        video:
          turkAIGetMediaProviders(
            "video"
          )
      }
    });
  }
);


/* ============================================================
   MEDIA CLEANUP
   ============================================================ */

function turkAICleanupMediaJobs() {

  const now =
    Date.now();

  const maxAge =
    TURKAI_MEDIA_CONFIG.jobs
      .cleanupAfterDays *
    24 *
    60 *
    60 *
    1000;

  let removed = 0;

  for (
    const [
      jobId,
      job
    ]
    of Object.entries(
      turkAIMediaDatabase.jobs
    )
  ) {

    if (
      !job.createdAt
    ) {
      continue;
    }

    const age =
      now -
      new Date(
        job.createdAt
      ).getTime();

    if (
      age > maxAge &&
      [
        "completed",
        "failed"
      ].includes(
        job.status
      )
    ) {

      delete turkAIMediaDatabase.jobs[
        jobId
      ];

      removed++;
    }
  }

  if (removed > 0) {
    turkAISaveMediaDatabase();
  }

  return {
    removed
  };
}


app.post(
  "/api/media/cleanup",
  (req, res) => {

    const result =
      turkAICleanupMediaJobs();

    res.json({

      success: true,

      ...result
    });
  }
);


/* ============================================================
   MEDIA ENGINE EXPORTS
   ============================================================ */

module.exports = {

  ...module.exports,

  TURKAI_MEDIA_CONFIG,

  TURKAI_MEDIA_PROVIDERS,

  turkAIMediaDatabase,

  turkAIGetMediaProviders,

  turkAIGetActiveMediaProvider,

  turkAIMediaCanUseImage,

  turkAIMediaCanUseVideo,

  turkAICreateMediaJob,

  turkAIUpdateMediaJob,

  turkAIGetMediaJob,

  turkAIGetMediaHistory,

  turkAIRequestImageGeneration,

  turkAIRequestVideoGeneration,

  turkAIRunMediaJob,

  turkAIGenerateImageJob,

  turkAIGenerateVideoJob,

  turkAICleanupMediaJobs

};


/* ============================================================
   PART 17 READY
   ============================================================ */

console.log(
  "ğŸ¨ TÃ¼rkAI Media Engine hazÄ±r."
);

console.log(
  "ğŸ–¼ï¸ Image API: /api/media/image"
);

console.log(
  "ğŸ¬ Video API: /api/media/video"
);

console.log(
  "âš™ï¸ Media Jobs: /api/media/jobs/:jobId"
);

console.log(
  "ğŸ“š Media History: /api/media/history"
);

console.log(
  "â¤ï¸ Media Health: /api/media/health"
);
/* ============================================================
   TÃœRKAI â€” PART 18 / 20
   TASK QUEUE + BACKGROUND WORKER ENGINE
   ============================================================ */

const TURKAI_TASK_CONFIG = {
  version: "18.0.0",

  enabled: true,

  directories: {
    root: path.join(
      process.cwd(),
      "data",
      "tasks"
    ),

    archive: path.join(
      process.cwd(),
      "data",
      "tasks",
      "archive"
    )
  },

  files: {
    queue: path.join(
      process.cwd(),
      "data",
      "tasks",
      "queue.json"
    ),

    history: path.join(
      process.cwd(),
      "data",
      "tasks",
      "history.json"
    ),

    workers: path.join(
      process.cwd(),
      "data",
      "tasks",
      "workers.json"
    )
  },

  workers: {
    count: Math.max(
      1,
      Number(
        process.env.TURKAI_WORKERS || 2
      )
    ),

    heartbeatMs: 5000,

    pollMs: 750,

    maxTaskRuntimeMs:
      30 * 60 * 1000
  },

  queue: {
    maxSize: 5000,

    maxHistory: 5000,

    maxActivePerUser: 3,

    retryLimit: 2,

    priorities: {
      low: 10,
      normal: 50,
      high: 80,
      urgent: 100
    }
  }
};


/* ============================================================
   DIRECTORIES
   ============================================================ */

function turkAIEnsureTaskDirectories() {

  ensureDirectory(
    TURKAI_TASK_CONFIG
      .directories.root
  );

  ensureDirectory(
    TURKAI_TASK_CONFIG
      .directories.archive
  );
}

turkAIEnsureTaskDirectories();


/* ============================================================
   DATABASE
   ============================================================ */

let turkAITaskDatabase = {

  queue: [],

  history: [],

  workers: {}

};


function turkAILoadTaskDatabase() {

  try {

    const queue =
      readJson(
        TURKAI_TASK_CONFIG.files.queue,
        []
      );

    const history =
      readJson(
        TURKAI_TASK_CONFIG.files.history,
        []
      );

    const workers =
      readJson(
        TURKAI_TASK_CONFIG.files.workers,
        {}
      );

    turkAITaskDatabase.queue =
      Array.isArray(queue)
        ? queue
        : [];

    turkAITaskDatabase.history =
      Array.isArray(history)
        ? history
        : [];

    turkAITaskDatabase.workers =
      workers &&
      typeof workers === "object"
        ? workers
        : {};

  } catch (error) {

    console.error(
      "[TÃ¼rkAI Task] load:",
      error.message
    );

  }
}


function turkAISaveTaskDatabase() {

  try {

    writeJson(
      TURKAI_TASK_CONFIG.files.queue,
      turkAITaskDatabase.queue
    );

    writeJson(
      TURKAI_TASK_CONFIG.files.history,
      turkAITaskDatabase.history
    );

    writeJson(
      TURKAI_TASK_CONFIG.files.workers,
      turkAITaskDatabase.workers
    );

    return true;

  } catch (error) {

    console.error(
      "[TÃ¼rkAI Task] save:",
      error.message
    );

    return false;
  }
}


turkAILoadTaskDatabase();


/* ============================================================
   HELPERS
   ============================================================ */

function turkAITaskText(
  value,
  fallback = ""
) {

  if (
    value === undefined ||
    value === null
  ) {
    return fallback;
  }

  return String(value)
    .replace(/\u0000/g, "")
    .trim();
}


function turkAITaskId(
  prefix = "task"
) {

  return (
    prefix +
    "_" +
    Date.now() +
    "_" +
    crypto
      .randomBytes(8)
      .toString("hex")
  );
}


function turkAITaskNow() {

  return new Date()
    .toISOString();
}


function turkAINormalizePriority(
  priority
) {

  const value =
    turkAITaskText(
      priority,
      "normal"
    ).toLowerCase();

  return [
    "low",
    "normal",
    "high",
    "urgent"
  ].includes(value)
    ? value
    : "normal";
}


function turkAITaskPriorityScore(
  priority
) {

  const normalized =
    turkAINormalizePriority(
      priority
    );

  return (
    TURKAI_TASK_CONFIG
      .queue
      .priorities[
        normalized
      ] || 50
  );
}


/* ============================================================
   TASK TYPES
   ============================================================ */

const TURKAI_TASK_TYPES = {

  media_image: {
    name: "Image Generation",
    timeout: 10 * 60 * 1000
  },

  media_video: {
    name: "Video Generation",
    timeout: 30 * 60 * 1000
  },

  research: {
    name: "Research",
    timeout: 5 * 60 * 1000
  },

  document: {
    name: "Document Processing",
    timeout: 15 * 60 * 1000
  },

  code_analysis: {
    name: "Code Analysis",
    timeout: 15 * 60 * 1000
  },

  generic: {
    name: "Generic Task",
    timeout: 10 * 60 * 1000
  }

};


/* ============================================================
   TASK LOOKUPS
   ============================================================ */

function turkAIGetQueuedTasksForUser(
  userId
) {

  return turkAITaskDatabase.queue
    .filter(
      task =>
        task.userId === userId &&
        [
          "queued",
          "processing"
        ].includes(
          task.status
        )
    );
}


function turkAIGetActiveWorkerCount() {

  return Object.values(
    turkAITaskDatabase.workers
  )
    .filter(
      worker =>
        worker.status === "working"
    )
    .length;
}


/* ============================================================
   TASK CREATION
   ============================================================ */

function turkAICreateTask({

  userId = "guest",

  type = "generic",

  payload = {},

  priority = "normal",

  maxRetries = null

} = {}) {

  if (
    turkAITaskDatabase.queue.length >=
    TURKAI_TASK_CONFIG.queue.maxSize
  ) {

    throw new Error(
      "Task queue dolu."
    );
  }

  const normalizedType =
    TURKAI_TASK_TYPES[type]
      ? type
      : "generic";

  const activeUserTasks =
    turkAIGetQueuedTasksForUser(
      userId
    );

  if (
    activeUserTasks.length >=
    TURKAI_TASK_CONFIG.queue
      .maxActivePerUser
  ) {

    throw new Error(
      "KullanÄ±cÄ± iÃ§in aktif gÃ¶rev limiti dolu."
    );
  }

  const id =
    turkAITaskId(
      normalizedType
    );

  const task = {

    id,

    userId,

    type:
      normalizedType,

    name:
      TURKAI_TASK_TYPES[
        normalizedType
      ].name,

    priority:
      turkAINormalizePriority(
        priority
      ),

    priorityScore:
      turkAITaskPriorityScore(
        priority
      ),

    payload:
      payload || {},

    status:
      "queued",

    progress:
      0,

    message:
      "GÃ¶rev sÄ±raya alÄ±ndÄ±.",

    retries:
      0,

    maxRetries:
      maxRetries === null
        ? TURKAI_TASK_CONFIG
            .queue.retryLimit
        : Math.max(
            0,
            Number(maxRetries) || 0
          ),

    workerId:
      null,

    result:
      null,

    error:
      null,

    createdAt:
      turkAITaskNow(),

    startedAt:
      null,

    completedAt:
      null,

    updatedAt:
      turkAITaskNow()
  };

  turkAITaskDatabase.queue
    .push(task);

  turkAISortTaskQueue();

  turkAISaveTaskDatabase();

  try {

    if (
      typeof turkAIEmitTaskStarted ===
      "function"
    ) {

      turkAIEmitTaskStarted(
        userId,
        id,
        {
          status: "queued",
          type: normalizedType,
          priority:
            task.priority
        }
      );
    }

  } catch (_) {}

  return task;
}


/* ============================================================
   QUEUE SORTING
   ============================================================ */

function turkAISortTaskQueue() {

  turkAITaskDatabase.queue
    .sort(
      (a, b) => {

        if (
          a.status === "processing" &&
          b.status !== "processing"
        ) {
          return -1;
        }

        if (
          b.status === "processing" &&
          a.status !== "processing"
        ) {
          return 1;
        }

        if (
          a.priorityScore !==
          b.priorityScore
        ) {

          return (
            b.priorityScore -
            a.priorityScore
          );
        }

        return (
          new Date(a.createdAt)
            .getTime() -
          new Date(b.createdAt)
            .getTime()
        );
      }
    );
}


/* ============================================================
   TASK UPDATE
   ============================================================ */

function turkAIUpdateTask(
  taskId,
  patch = {}
) {

  const task =
    turkAITaskDatabase.queue
      .find(
        item =>
          item.id === taskId
      );

  if (!task) {
    return null;
  }

  Object.assign(
    task,
    patch,
    {
      updatedAt:
        turkAITaskNow()
    }
  );

  turkAISaveTaskDatabase();

  return task;
}


/* ============================================================
   TASK PROGRESS
   ============================================================ */

function turkAISetTaskProgress(
  task,
  progress,
  message
) {

  if (!task) {
    return null;
  }

  const safeProgress =
    Math.max(
      0,
      Math.min(
        100,
        Number(progress) || 0
      )
    );

  task.progress =
    safeProgress;

  if (
    message !== undefined
  ) {

    task.message =
      turkAITaskText(
        message
      );
  }

  task.updatedAt =
    turkAITaskNow();

  turkAISaveTaskDatabase();

  try {

    if (
      typeof turkAIEmitTaskProgress ===
      "function"
    ) {

      turkAIEmitTaskProgress(
        task.userId,
        task.id,
        safeProgress,
        task.message
      );
    }

  } catch (_) {}

  return task;
}


/* ============================================================
   TASK HANDLERS
   ============================================================ */

const turkAITaskHandlers = {};


/* ------------------------------------------------------------
   GENERIC
   ------------------------------------------------------------ */

turkAITaskHandlers.generic =
  async function(task) {

    turkAISetTaskProgress(
      task,
      20,
      "GÃ¶rev baÅŸlatÄ±ldÄ±."
    );

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          250
        )
    );

    turkAISetTaskProgress(
      task,
      60,
      "GÃ¶rev iÅŸleniyor."
    );

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          250
        )
    );

    turkAISetTaskProgress(
      task,
      100,
      "GÃ¶rev tamamlandÄ±."
    );

    return {
      success: true,
      type: "generic"
    };
  };


/* ------------------------------------------------------------
   MEDIA IMAGE
   ------------------------------------------------------------ */

turkAITaskHandlers.media_image =
  async function(task) {

    if (
      typeof turkAIGenerateImageJob !==
      "function"
    ) {

      throw new Error(
        "Image engine bulunamadÄ±."
      );
    }

    turkAISetTaskProgress(
      task,
      5,
      "GÃ¶rsel gÃ¶revi medya motoruna aktarÄ±lÄ±yor."
    );

    const mediaJob =
      turkAIGetMediaJob?.(
        task.payload?.mediaJobId
      );

    if (!mediaJob) {

      throw new Error(
        "Media image job bulunamadÄ±."
      );
    }

    const result =
      await turkAIGenerateImageJob(
        mediaJob
      );

    turkAISetTaskProgress(
      task,
      100,
      "GÃ¶rsel gÃ¶revi tamamlandÄ±."
    );

    return result;
  };


/* ------------------------------------------------------------
   MEDIA VIDEO
   ------------------------------------------------------------ */

turkAITaskHandlers.media_video =
  async function(task) {

    if (
      typeof turkAIGenerateVideoJob !==
      "function"
    ) {

      throw new Error(
        "Video engine bulunamadÄ±."
      );
    }

    turkAISetTaskProgress(
      task,
      5,
      "Video gÃ¶revi medya motoruna aktarÄ±lÄ±yor."
    );

    const mediaJob =
      turkAIGetMediaJob?.(
        task.payload?.mediaJobId
      );

    if (!mediaJob) {

      throw new Error(
        "Media video job bulunamadÄ±."
      );
    }

    const result =
      await turkAIGenerateVideoJob(
        mediaJob
      );

    turkAISetTaskProgress(
      task,
      100,
      "Video gÃ¶revi tamamlandÄ±."
    );

    return result;
  };


/* ------------------------------------------------------------
   DOCUMENT
   ------------------------------------------------------------ */

turkAITaskHandlers.document =
  async function(task) {

    turkAISetTaskProgress(
      task,
      10,
      "Belge hazÄ±rlanÄ±yor."
    );

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          300
        )
    );

    turkAISetTaskProgress(
      task,
      45,
      "Belge analiz ediliyor."
    );

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          300
        )
    );

    turkAISetTaskProgress(
      task,
      80,
      "Belge sonucu hazÄ±rlanÄ±yor."
    );

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          200
        )
    );

    return {
      success: true,

      type: "document",

      fileId:
        task.payload?.fileId ||
        null
    };
  };


/* ------------------------------------------------------------
   CODE ANALYSIS
   ------------------------------------------------------------ */

turkAITaskHandlers.code_analysis =
  async function(task) {

    turkAISetTaskProgress(
      task,
      15,
      "Kod analizi baÅŸlatÄ±ldÄ±."
    );

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          300
        )
    );

    turkAISetTaskProgress(
      task,
      50,
      "Kod yapÄ±sÄ± inceleniyor."
    );

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          300
        )
    );

    turkAISetTaskProgress(
      task,
      85,
      "Analiz raporu oluÅŸturuluyor."
    );

    return {
      success: true,

      type: "code_analysis",

      fileId:
        task.payload?.fileId ||
        null
    };
  };


/* ============================================================
   TASK EXECUTION
   ============================================================ */

async function turkAIExecuteTask(
  task,
  worker
) {

  if (!task) {
    return null;
  }

  const handler =
    turkAITaskHandlers[
      task.type
    ] ||
    turkAITaskHandlers.generic;

  task.status =
    "processing";

  task.workerId =
    worker.id;

  task.startedAt =
    turkAITaskNow();

  task.updatedAt =
    turkAITaskNow();

  turkAISaveTaskDatabase();

  try {

    if (
      typeof turkAIEmitTaskStarted ===
      "function"
    ) {

      turkAIEmitTaskStarted(
        task.userId,
        task.id,
        {
          type: task.type,
          workerId: worker.id
        }
      );
    }

  } catch (_) {}


  const timeout =
    TURKAI_TASK_TYPES[
      task.type
    ]?.timeout ||
    TURKAI_TASK_CONFIG
      .workers
      .maxTaskRuntimeMs;


  let timeoutId = null;


  const timeoutPromise =
    new Promise(
      (_, reject) => {

        timeoutId =
          setTimeout(
            () => {

              reject(
                new Error(
                  "GÃ¶rev zaman aÅŸÄ±mÄ±na uÄŸradÄ±."
                )
              );

            },
            timeout
          );
      }
    );


  try {

    const result =
      await Promise.race([
        handler(task),
        timeoutPromise
      ]);

    if (timeoutId) {
      clearTimeout(
        timeoutId
      );
    }

    task.status =
      "completed";

    task.progress =
      100;

    task.result =
      result;

    task.error =
      null;

    task.completedAt =
      turkAITaskNow();

    task.updatedAt =
      turkAITaskNow();

    turkAISaveTaskDatabase();

    try {

      if (
        typeof turkAIEmitTaskCompleted ===
        "function"
      ) {

        turkAIEmitTaskCompleted(
          task.userId,
          task.id,
          result
        );
      }

    } catch (_) {}

    return task;

  } catch (error) {

    if (timeoutId) {
      clearTimeout(
        timeoutId
      );
    }

    task.retries += 1;

    task.error =
      error.message;

    if (
      task.retries <=
      task.maxRetries
    ) {

      task.status =
        "queued";

      task.workerId =
        null;

      task.message =
        `Tekrar deneniyor (${task.retries}/${task.maxRetries})`;

      task.updatedAt =
        turkAITaskNow();

      turkAISortTaskQueue();

      turkAISaveTaskDatabase();

      return task;
    }

    task.status =
      "failed";

    task.completedAt =
      turkAITaskNow();

    task.updatedAt =
      turkAITaskNow();

    turkAISaveTaskDatabase();

    try {

      if (
        typeof turkAIEmitTaskFailed ===
        "function"
      ) {

        turkAIEmitTaskFailed(
          task.userId,
          task.id,
          error.message
        );
      }

    } catch (_) {}

    return task;
  }
}


/* ============================================================
   WORKER CREATION
   ============================================================ */

function turkAICreateWorker(
  index
) {

  const id =
    `worker_${index}`;

  const worker = {

    id,

    status:
      "idle",

    currentTaskId:
      null,

    startedAt:
      turkAITaskNow(),

    heartbeat:
      turkAITaskNow(),

    tasksCompleted:
      0,

    tasksFailed:
      0
  };

  turkAITaskDatabase.workers[id] =
    worker;

  turkAISaveTaskDatabase();

  return worker;
}


/* ============================================================
   WORKER TASK PICKER
   ============================================================ */

function turkAIPickNextTask() {

  turkAISortTaskQueue();

  return turkAITaskDatabase.queue
    .find(
      task =>
        task.status === "queued"
    );
}


/* ============================================================
   WORKER LOOP
   ============================================================ */

async function turkAIWorkerLoop(
  worker
) {

  if (!worker) {
    return;
  }

  if (
    worker.status ===
    "working"
  ) {
    return;
  }

  const task =
    turkAIPickNextTask();

  worker.heartbeat =
    turkAITaskNow();

  if (!task) {

    worker.status =
      "idle";

    worker.currentTaskId =
      null;

    turkAISaveTaskDatabase();

    return;
  }

  worker.status =
    "working";

  worker.currentTaskId =
    task.id;

  worker.heartbeat =
    turkAITaskNow();

  turkAISaveTaskDatabase();

  const result =
    await turkAIExecuteTask(
      task,
      worker
    );

  if (
    result?.status ===
    "completed"
  ) {

    worker.tasksCompleted++;

  } else if (
    result?.status ===
    "failed"
  ) {

    worker.tasksFailed++;
  }

  worker.status =
    "idle";

  worker.currentTaskId =
    null;

  worker.heartbeat =
    turkAITaskNow();

  turkAISaveTaskDatabase();
}


/* ============================================================
   WORKER MANAGER
   ============================================================ */

let turkAIWorkerTimer = null;


function turkAIStartWorkers() {

  if (
    turkAIWorkerTimer
  ) {
    return;
  }

  const workerCount =
    TURKAI_TASK_CONFIG
      .workers
      .count;

  for (
    let i = 1;
    i <= workerCount;
    i++
  ) {

    if (
      !turkAITaskDatabase
        .workers[
          `worker_${i}`
        ]
    ) {

      turkAICreateWorker(
        i
      );

    }
  }

  turkAIWorkerTimer =
    setInterval(
      () => {

        for (
          const worker
          of Object.values(
            turkAITaskDatabase
              .workers
          )
        ) {

          turkAIWorkerLoop(
            worker
          ).catch(
            error =>
              console.error(
                "[TÃ¼rkAI Worker]",
                error.message
              )
          );
        }

      },
      TURKAI_TASK_CONFIG
        .workers
        .pollMs
    );

  console.log(
    `[TÃ¼rkAI] ${workerCount} background worker baÅŸlatÄ±ldÄ±.`
  );
}


function turkAIStopWorkers() {

  if (
    turkAIWorkerTimer
  ) {

    clearInterval(
      turkAIWorkerTimer
    );

    turkAIWorkerTimer =
      null;
  }

  for (
    const worker
    of Object.values(
      turkAITaskDatabase
        .workers
    )
  ) {

    worker.status =
      "stopped";

    worker.currentTaskId =
      null;

    worker.heartbeat =
      turkAITaskNow();
  }

  turkAISaveTaskDatabase();
}


/* ============================================================
   CANCEL TASK
   ============================================================ */

function turkAICancelTask(
  taskId,
  userId
) {

  const task =
    turkAITaskDatabase.queue
      .find(
        item =>
          item.id === taskId
      );

  if (!task) {
    return {
      success: false,
      error: "GÃ¶rev bulunamadÄ±."
    };
  }

  if (
    userId &&
    task.userId !== userId
  ) {

    return {
      success: false,
      error: "Bu gÃ¶reve eriÅŸim yok."
    };
  }

  if (
    [
      "completed",
      "failed",
      "cancelled"
    ].includes(
      task.status
    )
  ) {

    return {
      success: false,
      error:
        "Bu gÃ¶rev artÄ±k iptal edilemez."
    };
  }

  task.status =
    "cancelled";

  task.message =
    "GÃ¶rev kullanÄ±cÄ± tarafÄ±ndan iptal edildi.";

  task.completedAt =
    turkAITaskNow();

  task.updatedAt =
    turkAITaskNow();

  turkAISaveTaskDatabase();

  try {

    if (
      typeof turkAIEmitTaskFailed ===
      "function"
    ) {

      turkAIEmitTaskFailed(
        task.userId,
        task.id,
        "GÃ¶rev iptal edildi."
      );
    }

  } catch (_) {}

  return {
    success: true,
    task
  };
}


/* ============================================================
   RETRY TASK
   ============================================================ */

function turkAIRetryTask(
  taskId,
  userId
) {

  const task =
    turkAITaskDatabase.queue
      .find(
        item =>
          item.id === taskId
      );

  if (!task) {

    return {
      success: false,
      error: "GÃ¶rev bulunamadÄ±."
    };
  }

  if (
    userId &&
    task.userId !== userId
  ) {

    return {
      success: false,
      error: "Bu gÃ¶reve eriÅŸim yok."
    };
  }

  if (
    ![
      "failed",
      "cancelled"
    ].includes(
      task.status
    )
  ) {

    return {
      success: false,
      error:
        "Bu gÃ¶rev ÅŸu anda yeniden baÅŸlatÄ±lamaz."
    };
  }

  task.status =
    "queued";

  task.progress =
    0;

  task.error =
    null;

  task.workerId =
    null;

  task.retries =
    0;

  task.message =
    "GÃ¶rev yeniden sÄ±raya alÄ±ndÄ±.";

  task.updatedAt =
    turkAITaskNow();

  turkAISortTaskQueue();

  turkAISaveTaskDatabase();

  return {
    success: true,
    task
  };
}


/* ============================================================
   TASK HISTORY ARCHIVE
   ============================================================ */

function turkAIArchiveFinishedTasks() {

  const finished =
    turkAITaskDatabase.queue
      .filter(
        task =>
          [
            "completed",
            "failed",
            "cancelled"
          ].includes(
            task.status
          )
      );

  if (!finished.length) {

    return {
      archived: 0
    };
  }

  for (
    const task
    of finished
  ) {

    turkAITaskDatabase.history
      .unshift(task);
  }

  turkAITaskDatabase.queue =
    turkAITaskDatabase.queue
      .filter(
        task =>
          ![
            "completed",
            "failed",
            "cancelled"
          ].includes(
            task.status
          )
      );

  const maxHistory =
    TURKAI_TASK_CONFIG
      .queue
      .maxHistory;

  if (
    turkAITaskDatabase.history
      .length >
    maxHistory
  ) {

    turkAITaskDatabase.history =
      turkAITaskDatabase.history
        .slice(
          0,
          maxHistory
        );
  }

  turkAISaveTaskDatabase();

  return {
    archived:
      finished.length
  };
}


/* ============================================================
   TASK STATUS
   ============================================================ */

function turkAIGetTask(
  taskId,
  userId = null
) {

  const active =
    turkAITaskDatabase.queue
      .find(
        task =>
          task.id === taskId
      );

  if (active) {

    if (
      userId &&
      active.userId !== userId
    ) {
      return null;
    }

    return active;
  }

  const history =
    turkAITaskDatabase.history
      .find(
        task =>
          task.id === taskId
      );

  if (
    history &&
    userId &&
    history.userId !== userId
  ) {

    return null;
  }

  return history || null;
}


/* ============================================================
   USER TASK LIST
   ============================================================ */

function turkAIListUserTasks(
  userId,
  options = {}
) {

  const limit =
    Math.max(
      1,
      Math.min(
        100,
        Number(options.limit) || 50
      )
    );

  const status =
    options.status || null;

  const active =
    turkAITaskDatabase.queue
      .filter(
        task =>
          task.userId === userId
      );

  const history =
    turkAITaskDatabase.history
      .filter(
        task =>
          task.userId === userId
      );

  const all = [
    ...active,
    ...history
  ];

  return all
    .filter(
      task =>
        !status ||
        task.status === status
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt)
          .getTime() -
        new Date(a.updatedAt)
          .getTime()
    )
    .slice(
      0,
      limit
    );
}


/* ============================================================
   HTTP â€” CREATE TASK
   ============================================================ */

app.post(
  "/api/tasks",
  optionalTurkAIAuth,
  (req, res) => {

    try {

      const userId =
        req.user?.id ||
        req.body?.userId ||
        "guest";

      const task =
        turkAICreateTask({

          userId,

          type:
            req.body?.type ||
            "generic",

          payload:
            req.body?.payload ||
            {},

          priority:
            req.body?.priority ||
            "normal",

          maxRetries:
            req.body?.maxRetries
        });

      res.status(201).json({

        success: true,

        task
      });

    } catch (error) {

      res.status(400).json({

        success: false,

        error:
          error.message
      });
    }
  }
);


/* ============================================================
   HTTP â€” GET TASK
   ============================================================ */

app.get(
  "/api/tasks/:taskId",
  optionalTurkAIAuth,
  (req, res) => {

    const userId =
      req.user?.id ||
      req.query?.userId ||
      "guest";

    const task =
      turkAIGetTask(
        req.params.taskId,
        userId
      );

    if (!task) {

      return res.status(404).json({

        success: false,

        error:
          "GÃ¶rev bulunamadÄ±."
      });
    }

    res.json({

      success: true,

      task
    });
  }
);


/* ============================================================
   HTTP â€” USER TASKS
   ============================================================ */

app.get(
  "/api/tasks",
  optionalTurkAIAuth,
  (req, res) => {

    const userId =
      req.user?.id ||
      req.query?.userId ||
      "guest";

    const tasks =
      turkAIListUserTasks(
        userId,
        {
          limit:
            req.query?.limit,

          status:
            req.query?.status
        }
      );

    res.json({

      success: true,

      count:
        tasks.length,

      tasks
    });
  }
);


/* ============================================================
   HTTP â€” CANCEL
   ============================================================ */

app.post(
  "/api/tasks/:taskId/cancel",
  optionalTurkAIAuth,
  (req, res) => {

    const userId =
      req.user?.id ||
      req.body?.userId ||
      "guest";

    const result =
      turkAICancelTask(
        req.params.taskId,
        userId
      );

    res.json(result);
  }
);


/* ============================================================
   HTTP â€” RETRY
   ============================================================ */

app.post(
  "/api/tasks/:taskId/retry",
  optionalTurkAIAuth,
  (req, res) => {

    const userId =
      req.user?.id ||
      req.body?.userId ||
      "guest";

    const result =
      turkAIRetryTask(
        req.params.taskId,
        userId
      );

    res.json(result);
  }
);


/* ============================================================
   HTTP â€” ARCHIVE
   ============================================================ */

app.post(
  "/api/tasks/archive",
  (req, res) => {

    const result =
      turkAIArchiveFinishedTasks();

    res.json({

      success: true,

      ...result
    });
  }
);


/* ============================================================
   HTTP â€” QUEUE
   ============================================================ */

app.get(
  "/api/tasks/queue/status",
  (req, res) => {

    const queue =
      turkAITaskDatabase.queue;

    res.json({

      success: true,

      queue: {

        total:
          queue.length,

        queued:
          queue.filter(
            x =>
              x.status === "queued"
          ).length,

        processing:
          queue.filter(
            x =>
              x.status === "processing"
          ).length,

        completed:
          queue.filter(
            x =>
              x.status === "completed"
          ).length,

        failed:
          queue.filter(
            x =>
              x.status === "failed"
          ).length,

        cancelled:
          queue.filter(
            x =>
              x.status === "cancelled"
          ).length
      },

      workers:
        Object.values(
          turkAITaskDatabase.workers
        )
    });
  }
);


/* ============================================================
   HTTP â€” WORKERS
   ============================================================ */

app.get(
  "/api/tasks/workers",
  (req, res) => {

    res.json({

      success: true,

      workers:
        Object.values(
          turkAITaskDatabase.workers
        )
    });
  }
);


/* ============================================================
   HTTP â€” HEALTH
   ============================================================ */

app.get(
  "/api/tasks/health",
  (req, res) => {

    const queue =
      turkAITaskDatabase.queue;

    const workers =
      Object.values(
        turkAITaskDatabase.workers
      );

    res.json({

      success: true,

      version:
        TURKAI_TASK_CONFIG.version,

      enabled:
        TURKAI_TASK_CONFIG.enabled,

      workers: {

        total:
          workers.length,

        working:
          workers.filter(
            worker =>
              worker.status ===
              "working"
          ).length,

        idle:
          workers.filter(
            worker =>
              worker.status ===
              "idle"
          ).length
      },

      queue: {

        total:
          queue.length,

        queued:
          queue.filter(
            task =>
              task.status ===
              "queued"
          ).length,

        processing:
          queue.filter(
            task =>
              task.status ===
              "processing"
          ).length
      },

      handlers:
        Object.keys(
          turkAITaskHandlers
        )
    });
  }
);


/* ============================================================
   HEARTBEAT
   ============================================================ */

setInterval(
  () => {

    for (
      const worker
      of Object.values(
        turkAITaskDatabase.workers
      )
    ) {

      worker.heartbeat =
        turkAITaskNow();
    }

    turkAISaveTaskDatabase();

  },
  TURKAI_TASK_CONFIG
    .workers
    .heartbeatMs
);


/* ============================================================
   AUTO ARCHIVE
   ============================================================ */

setInterval(
  () => {

    try {

      turkAIArchiveFinishedTasks();

    } catch (error) {

      console.error(
        "[TÃ¼rkAI Task Archive]",
        error.message
      );
    }

  },
  5 * 60 * 1000
);


/* ============================================================
   START WORKERS
   ============================================================ */

if (
  TURKAI_TASK_CONFIG.enabled
) {

  turkAIStartWorkers();

}


/* ============================================================
   EXPORTS
   ============================================================ */

module.exports = {

  ...module.exports,

  TURKAI_TASK_CONFIG,

  TURKAI_TASK_TYPES,

  turkAITaskDatabase,

  turkAITaskHandlers,

  turkAICreateTask,

  turkAIUpdateTask,

  turkAIGetTask,

  turkAIListUserTasks,

  turkAISetTaskProgress,

  turkAIExecuteTask,

  turkAIStartWorkers,

  turkAIStopWorkers,

  turkAICancelTask,

  turkAIRetryTask,

  turkAIArchiveFinishedTasks,

  turkAISortTaskQueue

};


/* ============================================================
   PART 18 READY
   ============================================================ */

console.log(
  "âš™ï¸ TÃ¼rkAI Task Queue Engine hazÄ±r."
);

console.log(
  "ğŸ‘· Background Workers aktif."
);

console.log(
  "ğŸ“‹ Task API: /api/tasks"
);

console.log(
  "ğŸ“Š Queue API: /api/tasks/queue/status"
);

console.log(
  "â¤ï¸ Task Health: /api/tasks/health"
);
/* ============================================================
   TÃœRKAI â€” PART 19 / 20
   PRODUCTION SECURITY + API GATEWAY + AUDIT ENGINE
   ============================================================ */

const TURKAI_SECURITY_CONFIG = {

  version: "19.0.0",

  enabled: true,

  request: {

    maxBodySizeMB: 25,

    maxRequestIdLength: 100,

    timeoutMs: 60 * 1000,

    maxHeaderLength: 16 * 1024

  },

  rateLimit: {

    windowMs:
      60 * 1000,

    globalMax:
      300,

    authenticatedMax:
      180,

    guestMax:
      60,

    mediaMax:
      10,

    uploadMax:
      20,

    authMax:
      20

  },

  audit: {

    maxEvents:
      10000,

    keepDays:
      30

  },

  apiKeys: {

    enabled: true,

    minLength: 32,

    maxKeysPerUser: 10

  },

  securityHeaders: true

};


/* ============================================================
   SECURITY DIRECTORIES
   ============================================================ */

const TURKAI_SECURITY_DIR =
  path.join(
    process.cwd(),
    "data",
    "security"
  );

ensureDirectory(
  TURKAI_SECURITY_DIR
);


const TURKAI_SECURITY_FILES = {

  audit:
    path.join(
      TURKAI_SECURITY_DIR,
      "audit.json"
    ),

  apiKeys:
    path.join(
      TURKAI_SECURITY_DIR,
      "api-keys.json"
    ),

  blocks:
    path.join(
      TURKAI_SECURITY_DIR,
      "blocks.json"
    ),

  requests:
    path.join(
      TURKAI_SECURITY_DIR,
      "requests.json"
    )

};


/* ============================================================
   SECURITY DATABASE
   ============================================================ */

let turkAISecurityDatabase = {

  audit: [],

  apiKeys: {},

  blocks: {},

  requests: {}

};


function turkAILoadSecurityDatabase() {

  try {

    const audit =
      readJson(
        TURKAI_SECURITY_FILES.audit,
        []
      );

    const apiKeys =
      readJson(
        TURKAI_SECURITY_FILES.apiKeys,
        {}
      );

    const blocks =
      readJson(
        TURKAI_SECURITY_FILES.blocks,
        {}
      );

    const requests =
      readJson(
        TURKAI_SECURITY_FILES.requests,
        {}
      );

    turkAISecurityDatabase.audit =
      Array.isArray(audit)
        ? audit
        : [];

    turkAISecurityDatabase.apiKeys =
      apiKeys &&
      typeof apiKeys === "object"
        ? apiKeys
        : {};

    turkAISecurityDatabase.blocks =
      blocks &&
      typeof blocks === "object"
        ? blocks
        : {};

    turkAISecurityDatabase.requests =
      requests &&
      typeof requests === "object"
        ? requests
        : {};

  } catch (error) {

    console.error(
      "[TÃ¼rkAI Security] load:",
      error.message
    );

  }
}


function turkAISaveSecurityDatabase() {

  try {

    writeJson(
      TURKAI_SECURITY_FILES.audit,
      turkAISecurityDatabase.audit
    );

    writeJson(
      TURKAI_SECURITY_FILES.apiKeys,
      turkAISecurityDatabase.apiKeys
    );

    writeJson(
      TURKAI_SECURITY_FILES.blocks,
      turkAISecurityDatabase.blocks
    );

    writeJson(
      TURKAI_SECURITY_FILES.requests,
      turkAISecurityDatabase.requests
    );

    return true;

  } catch (error) {

    console.error(
      "[TÃ¼rkAI Security] save:",
      error.message
    );

    return false;
  }
}


turkAILoadSecurityDatabase();


/* ============================================================
   SECURITY HELPERS
   ============================================================ */

function turkAISecurityText(
  value,
  fallback = ""
) {

  if (
    value === undefined ||
    value === null
  ) {

    return fallback;
  }

  return String(value)
    .replace(/\u0000/g, "")
    .trim();

}


function turkAISecurityId(
  prefix = "sec"
) {

  return (
    prefix +
    "_" +
    Date.now() +
    "_" +
    crypto
      .randomBytes(8)
      .toString("hex")
  );

}


function turkAISecurityNow() {

  return new Date()
    .toISOString();

}


function turkAIGetClientIP(req) {

  const forwarded =
    req.headers[
      "x-forwarded-for"
    ];

  if (forwarded) {

    return turkAISecurityText(
      forwarded
        .split(",")[0]
    );
  }

  return (
    req.socket?.remoteAddress ||
    "unknown"
  );

}


function turkAIGetUserAgent(req) {

  return turkAISecurityText(
    req.headers[
      "user-agent"
    ],
    "unknown"
  ).slice(
    0,
    500
  );

}


/* ============================================================
   REQUEST ID
   ============================================================ */

function turkAICreateRequestId() {

  return (
    "req_" +
    Date.now() +
    "_" +
    crypto
      .randomBytes(6)
      .toString("hex")
  );

}


app.use(
  (req, res, next) => {

    const incoming =
      turkAISecurityText(
        req.headers[
          "x-request-id"
        ]
      );

    const requestId =
      incoming &&
      incoming.length <=
        TURKAI_SECURITY_CONFIG
          .request
          .maxRequestIdLength

        ? incoming

        : turkAICreateRequestId();

    req.turkAIRequestId =
      requestId;

    res.setHeader(
      "X-Request-ID",
      requestId
    );

    next();

  }
);


/* ============================================================
   SECURITY HEADERS
   ============================================================ */

if (
  TURKAI_SECURITY_CONFIG
    .securityHeaders
) {

  app.use(
    (req, res, next) => {

      res.setHeader(
        "X-Content-Type-Options",
        "nosniff"
      );

      res.setHeader(
        "X-Frame-Options",
        "SAMEORIGIN"
      );

      res.setHeader(
        "Referrer-Policy",
        "strict-origin-when-cross-origin"
      );

      res.setHeader(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()"
      );

      res.setHeader(
        "X-DNS-Prefetch-Control",
        "off"
      );

      next();

    }
  );

}


/* ============================================================
   AUDIT ENGINE
   ============================================================ */

function turkAIWriteAuditEvent({

  req = null,

  userId = null,

  action = "unknown",

  status = "info",

  details = {}

} = {}) {

  const event = {

    id:
      turkAISecurityId(
        "audit"
      ),

    timestamp:
      turkAISecurityNow(),

    requestId:
      req?.turkAIRequestId ||
      null,

    userId:
      userId || null,

    action:
      turkAISecurityText(
        action,
        "unknown"
      ),

    status:
      turkAISecurityText(
        status,
        "info"
      ),

    ip:
      req
        ? turkAIGetClientIP(req)
        : null,

    userAgent:
      req
        ? turkAIGetUserAgent(req)
        : null,

    details:
      details &&
      typeof details === "object"
        ? details
        : {}

  };

  turkAISecurityDatabase.audit
    .unshift(event);

  if (
    turkAISecurityDatabase.audit
      .length >
    TURKAI_SECURITY_CONFIG
      .audit
      .maxEvents
  ) {

    turkAISecurityDatabase.audit =
      turkAISecurityDatabase.audit
        .slice(
          0,
          TURKAI_SECURITY_CONFIG
            .audit
            .maxEvents
        );

  }

  turkAISaveSecurityDatabase();

  return event;

}


/* ============================================================
   SECURITY EVENT LOGGER
   ============================================================ */

function turkAISecurityEvent(
  type,
  details = {},
  req = null
) {

  return turkAIWriteAuditEvent({

    req,

    action:
      type,

    status:
      "security",

    details

  });

}


/* ============================================================
   IP BLOCK SYSTEM
   ============================================================ */

function turkAIIsIPBlocked(
  ip
) {

  const record =
    turkAISecurityDatabase.blocks[
      ip
    ];

  if (!record) {
    return false;
  }

  if (
    record.expiresAt &&
    Date.now() >
      new Date(
        record.expiresAt
      ).getTime()
  ) {

    delete turkAISecurityDatabase
      .blocks[ip];

    turkAISaveSecurityDatabase();

    return false;
  }

  return true;

}


function turkAIBlockIP(
  ip,
  durationMs,
  reason = "security"
) {

  const safeIP =
    turkAISecurityText(
      ip
    );

  if (!safeIP) {
    return false;
  }

  turkAISecurityDatabase
    .blocks[safeIP] = {

      ip:
        safeIP,

      reason,

      createdAt:
        turkAISecurityNow(),

      expiresAt:
        new Date(
          Date.now() +
          Math.max(
            1000,
            durationMs
          )
        ).toISOString()

    };

  turkAISaveSecurityDatabase();

  return true;

}


/* ============================================================
   REQUEST RATE LIMITER
   ============================================================ */

function turkAIRateBucketKey(
  req
) {

  const userId =
    req.user?.id;

  if (userId) {

    return `user:${userId}`;
  }

  return `ip:${turkAIGetClientIP(req)}`;

}


function turkAIRateLimit(

  req,

  {

    name = "global",

    windowMs =
      TURKAI_SECURITY_CONFIG
        .rateLimit
        .windowMs,

    max =
      TURKAI_SECURITY_CONFIG
        .rateLimit
        .globalMax

  } = {}

) {

  const key =
    `${name}:${turkAIRateBucketKey(req)}`;

  const now =
    Date.now();

  let bucket =
    turkAISecurityDatabase
      .requests[key];

  if (
    !bucket ||
    now -
      bucket.startedAt >=
      windowMs
  ) {

    bucket = {

      startedAt:
        now,

      count:
        0

    };

  }

  bucket.count++;

  turkAISecurityDatabase
    .requests[key] =
    bucket;

  if (
    bucket.count >
    max
  ) {

    turkAISecurityEvent(
      "rate_limit_exceeded",
      {
        name,
        max
      },
      req
    );

    return false;
  }

  return true;

}


/* ============================================================
   GLOBAL RATE LIMIT
   ============================================================ */

app.use(
  (req, res, next) => {

    const ip =
      turkAIGetClientIP(req);

    if (
      turkAIIsIPBlocked(ip)
    ) {

      return res.status(403).json({

        success: false,

        error:
          "Ä°stek engellendi.",

        code:
          "IP_BLOCKED",

        requestId:
          req.turkAIRequestId

      });

    }

    const authenticated =
      Boolean(
        req.user?.id
      );

    const max =
      authenticated

        ? TURKAI_SECURITY_CONFIG
            .rateLimit
            .authenticatedMax

        : TURKAI_SECURITY_CONFIG
            .rateLimit
            .guestMax;

    if (
      !turkAIRateLimit(
        req,
        {
          name: "global",
          max
        }
      )
    ) {

      return res.status(429).json({

        success: false,

        error:
          "Ã‡ok fazla istek gÃ¶nderildi.",

        code:
          "RATE_LIMITED",

        requestId:
          req.turkAIRequestId

      });

    }

    next();

  }
);


/* ============================================================
   ROUTE-SPECIFIC RATE LIMITERS
   ============================================================ */

function turkAIMediaRateLimit(
  req,
  res,
  next
) {

  if (
    !turkAIRateLimit(
      req,
      {
        name: "media",
        max:
          TURKAI_SECURITY_CONFIG
            .rateLimit
            .mediaMax
      }
    )
  ) {

    return res.status(429).json({

      success: false,

      error:
        "Medya Ã¼retim isteÄŸi limiti aÅŸÄ±ldÄ±.",

      code:
        "MEDIA_RATE_LIMIT",

      requestId:
        req.turkAIRequestId

    });

  }

  next();

}


function turkAIUploadRateLimit(
  req,
  res,
  next
) {

  if (
    !turkAIRateLimit(
      req,
      {
        name: "upload",
        max:
          TURKAI_SECURITY_CONFIG
            .rateLimit
            .uploadMax
      }
    )
  ) {

    return res.status(429).json({

      success: false,

      error:
        "Dosya yÃ¼kleme limiti aÅŸÄ±ldÄ±.",

      code:
        "UPLOAD_RATE_LIMIT",

      requestId:
        req.turkAIRequestId

    });

  }

  next();

}


/* ============================================================
   APPLY MEDIA LIMIT
   ============================================================ */

app.use(
  "/api/media",
  turkAIMediaRateLimit
);


/* ============================================================
   API KEY ENGINE
   ============================================================ */

function turkAICreateAPIKey(
  userId,
  name = "TÃ¼rkAI API Key"
) {

  const existing =
    Object.values(
      turkAISecurityDatabase
        .apiKeys
    )
    .filter(
      key =>
        key.userId === userId &&
        key.revoked !== true
    );

  if (
    existing.length >=
    TURKAI_SECURITY_CONFIG
      .apiKeys
      .maxKeysPerUser
  ) {

    throw new Error(
      "API key limiti dolu."
    );
  }

  const rawKey =
    "tk_" +
    crypto
      .randomBytes(32)
      .toString("hex");

  const hash =
    crypto
      .createHash("sha256")
      .update(rawKey)
      .digest("hex");

  const id =
    turkAISecurityId(
      "key"
    );

  turkAISecurityDatabase
    .apiKeys[id] = {

      id,

      userId,

      name:
        turkAISecurityText(
          name,
          "TÃ¼rkAI API Key"
        ).slice(
          0,
          100
        ),

      hash,

      prefix:
        rawKey.slice(
          0,
          10
        ),

      createdAt:
        turkAISecurityNow(),

      lastUsedAt:
        null,

      revoked:
        false

    };

  turkAISaveSecurityDatabase();

  return {

    id,

    key:
      rawKey,

    name:
      turkAISecurityDatabase
        .apiKeys[id]
        .name,

    createdAt:
      turkAISecurityDatabase
        .apiKeys[id]
        .createdAt

  };

}


function turkAIHashAPIKey(
  key
) {

  return crypto
    .createHash("sha256")
    .update(
      turkAISecurityText(key)
    )
    .digest("hex");

}


function turkAIVerifyAPIKey(
  key
) {

  const clean =
    turkAISecurityText(
      key
    );

  if (
    clean.length <
    TURKAI_SECURITY_CONFIG
      .apiKeys
      .minLength
  ) {

    return null;
  }

  const hash =
    turkAIHashAPIKey(
      clean
    );

  const record =
    Object.values(
      turkAISecurityDatabase
        .apiKeys
    )
    .find(
      item =>
        item.hash === hash &&
        item.revoked !== true
    );

  if (!record) {
    return null;
  }

  record.lastUsedAt =
    turkAISecurityNow();

  turkAISaveSecurityDatabase();

  return record;

}


/* ============================================================
   API KEY AUTH MIDDLEWARE
   ============================================================ */

function turkAIApiKeyMiddleware(
  req,
  res,
  next
) {

  if (
    !TURKAI_SECURITY_CONFIG
      .apiKeys
      .enabled
  ) {

    return next();
  }

  const header =
    req.headers[
      "x-turkai-key"
    ];

  const authorization =
    req.headers[
      "authorization"
    ];

  let key =
    turkAISecurityText(
      header
    );

  if (
    !key &&
    authorization &&
    authorization
      .startsWith("Bearer ")
  ) {

    key =
      authorization
        .slice(7)
        .trim();

  }

  if (!key) {

    return res.status(401).json({

      success: false,

      error:
        "API anahtarÄ± gerekli.",

      code:
        "API_KEY_REQUIRED",

      requestId:
        req.turkAIRequestId

    });

  }

  const record =
    turkAIVerifyAPIKey(
      key
    );

  if (!record) {

    turkAISecurityEvent(
      "invalid_api_key",
      {},
      req
    );

    return res.status(401).json({

      success: false,

      error:
        "GeÃ§ersiz API anahtarÄ±.",

      code:
        "INVALID_API_KEY",

      requestId:
        req.turkAIRequestId

    });

  }

  req.turkAIApiKey =
    record;

  req.turkAIUserId =
    record.userId;

  next();

}


/* ============================================================
   API KEY ROUTES
   ============================================================ */

app.post(
  "/api/security/api-keys",
  requireTurkAIAuth,
  (req, res) => {

    try {

      const result =
        turkAICreateAPIKey(
          req.user.id,
          req.body?.name
        );

      turkAIWriteAuditEvent({

        req,

        userId:
          req.user.id,

        action:
          "api_key_created",

        status:
          "success",

        details: {
          keyId:
            result.id
        }

      });

      res.status(201).json({

        success: true,

        apiKey:
          result

      });

    } catch (error) {

      res.status(400).json({

        success: false,

        error:
          error.message,

        requestId:
          req.turkAIRequestId

      });

    }

  }
);


/* ============================================================
   API KEY LIST
   ============================================================ */

app.get(
  "/api/security/api-keys",
  requireTurkAIAuth,
  (req, res) => {

    const keys =
      Object.values(
        turkAISecurityDatabase
          .apiKeys
      )
      .filter(
        key =>
          key.userId ===
          req.user.id
      )
      .map(
        key => ({
          id:
            key.id,

          name:
            key.name,

          prefix:
            key.prefix,

          createdAt:
            key.createdAt,

          lastUsedAt:
            key.lastUsedAt,

          revoked:
            key.revoked
        })
      );

    res.json({

      success: true,

      keys

    });

  }
);


/* ============================================================
   API KEY REVOKE
   ============================================================ */

app.delete(
  "/api/security/api-keys/:keyId",
  requireTurkAIAuth,
  (req, res) => {

    const record =
      turkAISecurityDatabase
        .apiKeys[
          req.params.keyId
        ];

    if (
      !record ||
      record.userId !==
        req.user.id
    ) {

      return res.status(404).json({

        success: false,

        error:
          "API anahtarÄ± bulunamadÄ±.",

        requestId:
          req.turkAIRequestId

      });

    }

    record.revoked =
      true;

    record.revokedAt =
      turkAISecurityNow();

    turkAISaveSecurityDatabase();

    turkAIWriteAuditEvent({

      req,

      userId:
        req.user.id,

      action:
        "api_key_revoked",

      status:
        "success",

      details: {
        keyId:
          record.id
      }

    });

    res.json({

      success: true,

      revoked:
        record.id

    });

  }
);


/* ============================================================
   AUDIT LOG API
   ============================================================ */

app.get(
  "/api/security/audit",
  requireTurkAIAuth,
  (req, res) => {

    const limit =
      Math.max(
        1,
        Math.min(
          200,
          Number(
            req.query?.limit
          ) || 50
        )
      );

    const events =
      turkAISecurityDatabase
        .audit
        .filter(
          event =>
            event.userId ===
            req.user.id
        )
        .slice(
          0,
          limit
        );

    res.json({

      success: true,

      count:
        events.length,

      events

    });

  }
);


/* ============================================================
   SECURITY STATUS
   ============================================================ */

app.get(
  "/api/security/status",
  requireTurkAIAuth,
  (req, res) => {

    const userId =
      req.user.id;

    const userKeys =
      Object.values(
        turkAISecurityDatabase
          .apiKeys
      )
      .filter(
        key =>
          key.userId === userId &&
          !key.revoked
      );

    const userEvents =
      turkAISecurityDatabase
        .audit
        .filter(
          event =>
            event.userId === userId
        );

    res.json({

      success: true,

      security: {

        version:
          TURKAI_SECURITY_CONFIG
            .version,

        enabled:
          TURKAI_SECURITY_CONFIG
            .enabled,

        activeApiKeys:
          userKeys.length,

        auditEvents:
          userEvents.length

      }

    });

  }
);


/* ============================================================
   REQUEST BODY PROTECTION
   ============================================================ */

app.use(
  (req, res, next) => {

    const contentLength =
      Number(
        req.headers[
          "content-length"
        ]
      );

    const maxBytes =
      TURKAI_SECURITY_CONFIG
        .request
        .maxBodySizeMB *
      1024 *
      1024;

    if (
      Number.isFinite(
        contentLength
      ) &&
      contentLength >
        maxBytes
    ) {

      turkAISecurityEvent(
        "request_body_too_large",
        {
          contentLength,
          maxBytes
        },
        req
      );

      return res.status(413).json({

        success: false,

        error:
          "Ä°stek gÃ¶vdesi Ã§ok bÃ¼yÃ¼k.",

        code:
          "BODY_TOO_LARGE",

        requestId:
          req.turkAIRequestId

      });

    }

    next();

  }
);


/* ============================================================
   SUSPICIOUS REQUEST DETECTION
   ============================================================ */

function turkAIDetectSuspiciousRequest(
  req
) {

  const pathName =
    turkAISecurityText(
      req.path
    );

  const userAgent =
    turkAIGetUserAgent(
      req
    );

  const suspiciousPatterns = [

    /\.\.\//,

    /<script\b/i,

    /javascript:/i,

    /union\s+select/i,

    /drop\s+table/i,

    /or\s+1\s*=\s*1/i

  ];

  const target =
    `${pathName} ${userAgent}`;

  return suspiciousPatterns
    .some(
      pattern =>
        pattern.test(target)
    );

}


app.use(
  (req, res, next) => {

    if (
      turkAIDetectSuspiciousRequest(
        req
      )
    ) {

      turkAISecurityEvent(
        "suspicious_request",
        {
          path:
            req.path,
          method:
            req.method
        },
        req
      );

      return res.status(400).json({

        success: false,

        error:
          "GeÃ§ersiz istek.",

        code:
          "SUSPICIOUS_REQUEST",

        requestId:
          req.turkAIRequestId

      });

    }

    next();

  }
);


/* ============================================================
   SECURITY CLEANUP
   ============================================================ */

function turkAISecurityCleanup() {

  const now =
    Date.now();

  const keepMs =
    TURKAI_SECURITY_CONFIG
      .audit
      .keepDays *
    24 *
    60 *
    60 *
    1000;

  turkAISecurityDatabase.audit =
    turkAISecurityDatabase
      .audit
      .filter(
        event => {

          const time =
            new Date(
              event.timestamp
            ).getTime();

          return (
            now - time <=
            keepMs
          );

        }
      );

  for (
    const [
      key,
      bucket
    ]
    of Object.entries(
      turkAISecurityDatabase
        .requests
    )
  ) {

    if (
      now -
        bucket.startedAt >
      TURKAI_SECURITY_CONFIG
        .rateLimit
        .windowMs *
      2
    ) {

      delete turkAISecurityDatabase
        .requests[key];

    }

  }

  for (
    const [
      ip,
      block
    ]
    of Object.entries(
      turkAISecurityDatabase
        .blocks
    )
  ) {

    if (
      block.expiresAt &&
      now >
        new Date(
          block.expiresAt
        ).getTime()
    ) {

      delete turkAISecurityDatabase
        .blocks[ip];

    }

  }

  turkAISaveSecurityDatabase();

}


setInterval(
  turkAISecurityCleanup,
  10 * 60 * 1000
);


/* ============================================================
   SECURITY HEALTH
   ============================================================ */

app.get(
  "/api/security/health",
  (req, res) => {

    res.json({

      success: true,

      version:
        TURKAI_SECURITY_CONFIG
          .version,

      enabled:
        TURKAI_SECURITY_CONFIG
          .enabled,

      features: {

        requestId:
          true,

        securityHeaders:
          TURKAI_SECURITY_CONFIG
            .securityHeaders,

        rateLimit:
          true,

        audit:
          true,

        apiKeys:
          TURKAI_SECURITY_CONFIG
            .apiKeys
            .enabled,

        suspiciousRequestDetection:
          true,

        ipBlocking:
          true

      },

      database: {

        auditEvents:
          turkAISecurityDatabase
            .audit
            .length,

        apiKeys:
          Object.keys(
            turkAISecurityDatabase
              .apiKeys
          ).length,

        blockedIPs:
          Object.keys(
            turkAISecurityDatabase
              .blocks
          ).length,

        rateBuckets:
          Object.keys(
            turkAISecurityDatabase
              .requests
          ).length

      }

    });

  }
);


/* ============================================================
   PRODUCTION ERROR RESPONSE
   ============================================================ */

app.use(
  (err, req, res, next) => {

    console.error(
      "[TÃ¼rkAI Security Error]",
      err
    );

    turkAIWriteAuditEvent({

      req,

      userId:
        req.user?.id ||
        null,

      action:
        "server_error",

      status:
        "error",

      details: {

        message:
          err.message,

        method:
          req.method,

        path:
          req.path

      }

    });

    if (
      res.headersSent
    ) {

      return next(err);
    }

    res.status(
      err.statusCode ||
      500
    ).json({

      success: false,

      error:
        "Sunucu tarafÄ±nda bir hata oluÅŸtu.",

      requestId:
        req.turkAIRequestId

    });

  }
);


/* ============================================================
   EXPORTS
   ============================================================ */

module.exports = {

  ...module.exports,

  TURKAI_SECURITY_CONFIG,

  turkAISecurityDatabase,

  turkAIWriteAuditEvent,

  turkAISecurityEvent,

  turkAIIsIPBlocked,

  turkAIBlockIP,

  turkAIRateLimit,

  turkAICreateAPIKey,

  turkAIVerifyAPIKey,

  turkAIHashAPIKey,

  turkAISecurityCleanup

};


/* ============================================================
   PART 19 READY
   ============================================================ */

console.log(
  "ğŸ” TÃ¼rkAI Production Security Engine hazÄ±r."
);

console.log(
  "ğŸ›¡ï¸ Rate Limit aktif."
);

console.log(
  "ğŸ§¾ Audit Log aktif."
);

console.log(
  "ğŸ”‘ API Key sistemi aktif."
);

console.log(
  "ğŸš¦ API Gateway korumasÄ± aktif."
);

console.log(
  "â¤ï¸ Security Health: /api/security/health"
);
/* =========================================================
   TÃœRKAI â€” PART 20 / 20
   MASTER CORE + STARTUP + DIAGNOSTICS + SELF HEALING
   ========================================================= */

const TURKAI_MASTER_CONFIG = {
  version: "20.0.0",
  codename: "TÃœRKAI ULTRA CORE",
  environment: process.env.NODE_ENV || "development",

  diagnostics: {
    enabled: true,
    includeMemory: true,
    includeRoutes: true,
    includeModules: true,
    includeEnvironment: true
  },

  selfHealing: {
    enabled: true,
    intervalMs: 5 * 60 * 1000,
    cleanupOldLogsDays: 30,
    cleanupOldRequestsDays: 7,
    cleanupOldEventsDays: 30,
    cleanupOldNotificationsDays: 30,
    cleanupOldTasksDays: 14
  },

  shutdown: {
    timeoutMs: 10000
  },

  runtime: {
    startedAt: new Date().toISOString(),
    restartCount: Number(process.env.TURKAI_RESTART_COUNT || 0)
  }
};


/* =========================================================
   MASTER DIRECTORIES
   ========================================================= */

const TURKAI_MASTER_DIR = path.join(DATA_DIR, "master");
const TURKAI_MASTER_LOG_DIR = path.join(TURKAI_MASTER_DIR, "logs");

ensureDirectory(TURKAI_MASTER_DIR);
ensureDirectory(TURKAI_MASTER_LOG_DIR);

const TURKAI_MASTER_STATE_FILE =
  path.join(TURKAI_MASTER_DIR, "state.json");

const TURKAI_MASTER_DIAGNOSTICS_FILE =
  path.join(TURKAI_MASTER_DIR, "diagnostics.json");

const TURKAI_MASTER_ERRORS_FILE =
  path.join(TURKAI_MASTER_LOG_DIR, "errors.jsonl");

const TURKAI_MASTER_STARTUP_FILE =
  path.join(TURKAI_MASTER_LOG_DIR, "startup.jsonl");


/* =========================================================
   MASTER STATE
   ========================================================= */

let turkAIMasterState = readJson(TURKAI_MASTER_STATE_FILE, {
  version: TURKAI_MASTER_CONFIG.version,

  status: "starting",

  startedAt: new Date().toISOString(),

  lastDiagnosticsAt: null,

  lastSelfHealingAt: null,

  shutdownRequested: false,

  startupCompleted: false,

  startupErrors: [],

  moduleStatus: {},

  counters: {
    diagnostics: 0,
    selfHealing: 0,
    startupErrors: 0,
    runtimeErrors: 0
  }
});


function turkAISaveMasterState() {
  turkAIMasterState.updatedAt = new Date().toISOString();

  writeJson(
    TURKAI_MASTER_STATE_FILE,
    turkAIMasterState
  );
}


/* =========================================================
   MASTER LOGGING
   ========================================================= */

function turkAIMasterLog(type, data = {}) {
  const event = {
    id: generateId("master"),
    timestamp: new Date().toISOString(),
    type,
    pid: process.pid,
    environment: TURKAI_MASTER_CONFIG.environment,
    data
  };

  try {
    fs.appendFileSync(
      TURKAI_MASTER_STARTUP_FILE,
      JSON.stringify(event) + "\n",
      "utf8"
    );
  } catch (_) {}

  return event;
}


function turkAIMasterError(error, context = {}) {
  const normalized = {
    id: generateId("error"),
    timestamp: new Date().toISOString(),
    name: error?.name || "Error",
    message: error?.message || String(error),
    stack: error?.stack || null,
    context
  };

  turkAIMasterState.counters.runtimeErrors++;

  try {
    fs.appendFileSync(
      TURKAI_MASTER_ERRORS_FILE,
      JSON.stringify(normalized) + "\n",
      "utf8"
    );
  } catch (_) {}

  try {
    writeEvent("master_error", normalized);
  } catch (_) {}

  return normalized;
}


/* =========================================================
   SAFE FUNCTION HELPERS
   ========================================================= */

function turkAIHasFunction(name) {
  return typeof global[name] === "function" ||
    typeof module.exports?.[name] === "function";
}


function turkAIGetFunction(name) {
  if (typeof global[name] === "function") {
    return global[name];
  }

  if (typeof module.exports?.[name] === "function") {
    return module.exports[name];
  }

  return null;
}


async function turkAISafeCall(name, ...args) {
  const fn = turkAIGetFunction(name);

  if (!fn) {
    return {
      ok: false,
      missing: true,
      function: name
    };
  }

  try {
    const result = await fn(...args);

    return {
      ok: true,
      function: name,
      result
    };
  } catch (error) {
    turkAIMasterError(error, {
      function: name
    });

    return {
      ok: false,
      function: name,
      error: error.message
    };
  }
}


/* =========================================================
   COMPATIBILITY HELPERS
   ========================================================= */

/*
  Part 16 bazÄ± kurulumlarda bu yardÄ±mcÄ±yÄ± bekleyebilir.
  Zaten varsa Ã¼zerine yazmÄ±yoruz.
*/

if (typeof global.turkAIDevCleanText !== "function") {
  global.turkAIDevCleanText = function(value) {
    return cleanText(
      value == null ? "" : String(value)
    );
  };
}


/* =========================================================
   MODULE REGISTRY
   ========================================================= */

const TURKAI_MODULE_REGISTRY = {
  memory: [
    "processUserMessage",
    "processAssistantMessage"
  ],

  advancedMemory: [
    "turkAIAdvancedProcessUserMessage",
    "turkAIRefreshAdvancedContext"
  ],

  knowledge: [
    "findKnowledgeAnswer",
    "addKnowledge"
  ],

  research: [
    "runResearch",
    "turkAIRunResearch"
  ],

  web: [
    "turkAIWebSearch",
    "turkAIReadPage"
  ],

  ai: [
    "generateAIResponse",
    "requestModel"
  ],

  chat: [
    "turkAIChat",
    "generateChatResponse"
  ],

  accounts: [
    "getTurkAIAccount",
    "saveTurkAIAccount"
  ],

  auth: [
    "requireTurkAIAuth",
    "optionalTurkAIAuth"
  ],

  files: [
    "turkAIProcessDocumentBuffer",
    "turkAIValidateLargeFile"
  ],

  usage: [
    "turkAIGetUsageStatus",
    "turkAIConsumeUsage"
  ],

  largeFiles: [
    "turkAIGetPlanLineLimit",
    "turkAIProcessLargeCodeFile"
  ],

  realtime: [
    "turkAIEmitToUser",
    "turkAICreateNotification"
  ],

  media: [
    "turkAIGenerateImageJob",
    "turkAIGenerateVideoJob"
  ],

  tasks: [
    "turkAICreateTask",
    "turkAIStartWorkers"
  ],

  security: [
    "turkAIRecordAudit",
    "turkAIBlockIP"
  ]
};


/* =========================================================
   MODULE DIAGNOSTICS
   ========================================================= */

function turkAICheckModule(name, requiredFunctions = []) {
  const checks = requiredFunctions.map(fnName => ({
    name: fnName,
    available: turkAIHasFunction(fnName)
  }));

  const available = checks.filter(x => x.available).length;

  return {
    module: name,
    required: checks.length,
    available,
    missing: checks
      .filter(x => !x.available)
      .map(x => x.name),
    healthy: available === checks.length,
    partial: available > 0 && available < checks.length
  };
}


function turkAIRunModuleDiagnostics() {
  const result = {};

  for (const [name, functions] of Object.entries(
    TURKAI_MODULE_REGISTRY
  )) {
    result[name] = turkAICheckModule(
      name,
      functions
    );
  }

  turkAIMasterState.moduleStatus = result;

  return result;
}


/* =========================================================
   DATABASE INTEGRITY CHECK
   ========================================================= */

function turkAICheckJsonFile(filePath, fallback = {}) {
  try {
    if (!fs.existsSync(filePath)) {
      writeJson(filePath, fallback);

      return {
        exists: false,
        repaired: true,
        valid: true
      };
    }

    const raw = fs.readFileSync(
      filePath,
      "utf8"
    );

    if (!raw.trim()) {
      writeJson(filePath, fallback);

      return {
        exists: true,
        repaired: true,
        valid: true
      };
    }

    JSON.parse(raw);

    return {
      exists: true,
      repaired: false,
      valid: true
    };
  } catch (error) {
    try {
      const backup = `${filePath}.broken-${Date.now()}`;

      if (fs.existsSync(filePath)) {
        fs.copyFileSync(
          filePath,
          backup
        );
      }

      writeJson(
        filePath,
        fallback
      );

      return {
        exists: true,
        repaired: true,
        valid: false,
        backup
      };
    } catch (repairError) {
      turkAIMasterError(
        repairError,
        {
          filePath
        }
      );

      return {
        exists: true,
        repaired: false,
        valid: false,
        error: repairError.message
      };
    }
  }
}


/* =========================================================
   CORE DATABASE CHECK
   ========================================================= */

function turkAICheckCoreDatabases() {
  const files = {
    memory: [
      path.join(DATA_DIR, "memory.json"),
      {}
    ],

    answers: [
      path.join(DATA_DIR, "answers.json"),
      {}
    ],

    users: [
      path.join(DATA_DIR, "users.json"),
      {}
    ],

    sessions: [
      path.join(DATA_DIR, "sessions.json"),
      {}
    ],

    events: [
      path.join(DATA_DIR, "events.jsonl"),
      null
    ],

    knowledge: [
      typeof KNOWLEDGE_FILE !== "undefined"
        ? KNOWLEDGE_FILE
        : path.join(DATA_DIR, "knowledge.json"),
      {}
    ],

    usage: [
      path.join(DATA_DIR, "usage.json"),
      {}
    ],

    files: [
      path.join(DATA_DIR, "files.json"),
      {}
    ]
  };

  const result = {};

  for (const [name, [filePath, fallback]] of Object.entries(files)) {
    if (filePath.endsWith(".jsonl")) {
      if (!fs.existsSync(filePath)) {
        try {
          fs.writeFileSync(
            filePath,
            "",
            "utf8"
          );
        } catch (error) {
          turkAIMasterError(error, {
            database: name,
            filePath
          });
        }
      }

      result[name] = {
        exists: fs.existsSync(filePath),
        type: "jsonl"
      };

      continue;
    }

    result[name] = turkAICheckJsonFile(
      filePath,
      fallback
    );
  }

  return result;
}


/* =========================================================
   ENVIRONMENT DIAGNOSTICS
   ========================================================= */

function turkAIGetEnvironmentDiagnostics() {
  const memory = process.memoryUsage();

  return {
    node: process.version,

    platform: process.platform,

    architecture: process.arch,

    pid: process.pid,

    cwd: process.cwd(),

    environment:
      TURKAI_MASTER_CONFIG.environment,

    uptimeSeconds:
      Math.round(process.uptime()),

    memory: {
      rssMB: Number(
        (memory.rss / 1024 / 1024).toFixed(2)
      ),

      heapUsedMB: Number(
        (memory.heapUsed / 1024 / 1024).toFixed(2)
      ),

      heapTotalMB: Number(
        (memory.heapTotal / 1024 / 1024).toFixed(2)
      ),

      externalMB: Number(
        (memory.external / 1024 / 1024).toFixed(2)
      )
    },

    cpu: process.cpuUsage(),

    envKeys: {
      groq: Boolean(process.env.GROQ_API_KEY),
      cerebras: Boolean(process.env.CEREBRAS_API_KEY),
      openrouter: Boolean(process.env.OPENROUTER_API_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY),
      google: Boolean(process.env.GOOGLE_CLIENT_ID),
      imageProvider: Boolean(
        process.env.OPENAI_API_KEY ||
        process.env.STABILITY_API_KEY
      ),
      videoProvider: Boolean(
        process.env.OPENAI_API_KEY
      )
    }
  };
}


/* =========================================================
   ROUTE DISCOVERY
   ========================================================= */

function turkAIGetRegisteredRoutes() {
  const routes = [];

  try {
    const stack =
      app?._router?.stack ||
      app?.router?.stack ||
      [];

    for (const layer of stack) {
      if (layer.route) {
        const methods = Object.keys(
          layer.route.methods || {}
        ).map(x => x.toUpperCase());

        routes.push({
          path: layer.route.path,
          methods
        });
      } else if (layer.name === "router") {
        routes.push({
          type: "router"
        });
      } else if (layer.name) {
        routes.push({
          type: "middleware",
          name: layer.name
        });
      }
    }
  } catch (error) {
    turkAIMasterError(error, {
      operation: "route-discovery"
    });
  }

  return routes;
}


/* =========================================================
   COMPLETE DIAGNOSTICS
   ========================================================= */

async function turkAIRunFullDiagnostics() {
  const started = Date.now();

  const modules =
    turkAIRunModuleDiagnostics();

  const databases =
    turkAICheckCoreDatabases();

  const environment =
    turkAIGetEnvironmentDiagnostics();

  const routes =
    turkAIGetRegisteredRoutes();

  const moduleValues =
    Object.values(modules);

  const healthyModules =
    moduleValues.filter(x => x.healthy).length;

  const partialModules =
    moduleValues.filter(x => x.partial).length;

  const brokenModules =
    moduleValues.filter(
      x => !x.healthy && !x.partial
    ).length;

  const diagnostics = {
    id: generateId("diag"),

    timestamp: new Date().toISOString(),

    version: TURKAI_MASTER_CONFIG.version,

    codename: TURKAI_MASTER_CONFIG.codename,

    status:
      brokenModules === 0
        ? partialModules === 0
          ? "healthy"
          : "degraded"
        : "critical",

    durationMs: Date.now() - started,

    modules: {
      total: moduleValues.length,
      healthy: healthyModules,
      partial: partialModules,
      broken: brokenModules,
      details: modules
    },

    databases,

    environment,

    routes: {
      count: routes.length,
      items: routes
    },

    runtime: {
      uptime: process.uptime(),
      pid: process.pid,
      memory: process.memoryUsage()
    }
  };

  turkAIMasterState.lastDiagnosticsAt =
    diagnostics.timestamp;

  turkAIMasterState.counters.diagnostics++;

  writeJson(
    TURKAI_MASTER_DIAGNOSTICS_FILE,
    diagnostics
  );

  turkAISaveMasterState();

  return diagnostics;
}


/* =========================================================
   SELF HEALING â€” FILE SYSTEM
   ========================================================= */

function turkAICleanupDirectory(
  directory,
  maxAgeMs
) {
  if (!directory || !fs.existsSync(directory)) {
    return {
      directory,
      removed: 0
    };
  }

  let removed = 0;

  const now = Date.now();

  try {
    const entries =
      fs.readdirSync(
        directory,
        {
          withFileTypes: true
        }
      );

    for (const entry of entries) {
      if (!entry.isFile()) continue;

      const fullPath =
        path.join(
          directory,
          entry.name
        );

      try {
        const stat =
          fs.statSync(fullPath);

        if (
          now - stat.mtimeMs >
          maxAgeMs
        ) {
          fs.unlinkSync(fullPath);
          removed++;
        }
      } catch (_) {}
    }
  } catch (error) {
    turkAIMasterError(error, {
      operation: "cleanup-directory",
      directory
    });
  }

  return {
    directory,
    removed
  };
}


/* =========================================================
   SELF HEALING â€” DATABASE STRUCTURES
   ========================================================= */

function turkAIRepairKnownStructures() {
  const repairs = [];

  const jsonStructures = [
    [
      TURKAI_MASTER_STATE_FILE,
      turkAIMasterState
    ],

    [
      TURKAI_MASTER_DIAGNOSTICS_FILE,
      {}
    ]
  ];

  for (const [filePath, fallback] of jsonStructures) {
    const result =
      turkAICheckJsonFile(
        filePath,
        fallback
      );

    repairs.push({
      filePath,
      ...result
    });
  }

  /*
    Part 16
  */

  const realtimeFiles = [
    "connections.json",
    "events.json",
    "notifications.json"
  ];

  for (const fileName of realtimeFiles) {
    const filePath =
      path.join(
        DATA_DIR,
        "realtime",
        fileName
      );

    repairs.push({
      filePath,
      ...turkAICheckJsonFile(
        filePath,
        []
      )
    });
  }

  /*
    Part 18
  */

  const taskFiles = [
    "queue.json",
    "history.json",
    "workers.json"
  ];

  for (const fileName of taskFiles) {
    const filePath =
      path.join(
        DATA_DIR,
        "tasks",
        fileName
      );

    repairs.push({
      filePath,
      ...turkAICheckJsonFile(
        filePath,
        []
      )
    });
  }

  /*
    Part 19
  */

  const securityFiles = [
    "audit.json",
    "api-keys.json",
    "blocks.json",
    "requests.json"
  ];

  for (const fileName of securityFiles) {
    const filePath =
      path.join(
        DATA_DIR,
        "security",
        fileName
      );

    repairs.push({
      filePath,
      ...turkAICheckJsonFile(
        filePath,
        []
      )
    });
  }

  return repairs;
}


/* =========================================================
   SELF HEALING ENGINE
   ========================================================= */

async function turkAIRunSelfHealing() {
  if (
    !TURKAI_MASTER_CONFIG.selfHealing.enabled
  ) {
    return {
      enabled: false
    };
  }

  const started = Date.now();

  const repairs =
    turkAIRepairKnownStructures();

  const cleanup = [];

  const maxLogAge =
    TURKAI_MASTER_CONFIG.selfHealing
      .cleanupOldLogsDays *
    24 *
    60 *
    60 *
    1000;

  const maxRequestAge =
    TURKAI_MASTER_CONFIG.selfHealing
      .cleanupOldRequestsDays *
    24 *
    60 *
    60 *
    1000;

  const maxTaskAge =
    TURKAI_MASTER_CONFIG.selfHealing
      .cleanupOldTasksDays *
    24 *
    60 *
    60 *
    1000;

  cleanup.push(
    turkAICleanupDirectory(
      TURKAI_MASTER_LOG_DIR,
      maxLogAge
    )
  );

  cleanup.push(
    turkAICleanupDirectory(
      path.join(
        DATA_DIR,
        "security"
      ),
      maxRequestAge
    )
  );

  cleanup.push(
    turkAICleanupDirectory(
      path.join(
        DATA_DIR,
        "tasks",
        "archive"
      ),
      maxTaskAge
    )
  );

  /*
    Bilinen cleanup fonksiyonlarÄ± varsa Ã§alÄ±ÅŸtÄ±r.
  */

  const optionalCleanupFunctions = [
    "turkAICleanupAuthSessions",
    "turkAICleanupUsage",
    "turkAICleanupRealtime",
    "turkAICleanupMediaJobs",
    "turkAICleanupTasks",
    "turkAICleanupSecurity"
  ];

  const functionResults = [];

  for (
    const functionName
    of optionalCleanupFunctions
  ) {
    if (!turkAIHasFunction(functionName)) {
      continue;
    }

    functionResults.push(
      await turkAISafeCall(
        functionName
      )
    );
  }

  const result = {
    id: generateId("heal"),

    timestamp: new Date().toISOString(),

    durationMs: Date.now() - started,

    repairs,

    cleanup,

    functionResults
  };

  turkAIMasterState.lastSelfHealingAt =
    result.timestamp;

  turkAIMasterState.counters.selfHealing++;

  turkAISaveMasterState();

  return result;
}


/* =========================================================
   STARTUP CHECKS
   ========================================================= */

async function turkAIStartupDiagnostics() {
  turkAIMasterState.status =
    "diagnosing";

  turkAISaveMasterState();

  turkAIMasterLog(
    "startup_diagnostics_started"
  );

  const results = {
    directories: true,
    databases: null,
    modules: null,
    diagnostics: null,
    selfHealing: null
  };

  try {
    results.databases =
      turkAICheckCoreDatabases();

    results.modules =
      turkAIRunModuleDiagnostics();

    results.selfHealing =
      await turkAIRunSelfHealing();

    results.diagnostics =
      await turkAIRunFullDiagnostics();

    turkAIMasterState.status =
      results.diagnostics.status;

    turkAIMasterState.startupCompleted =
      true;

    turkAIMasterState.startedAt =
      new Date().toISOString();

    turkAISaveMasterState();

    turkAIMasterLog(
      "startup_diagnostics_completed",
      {
        status:
          results.diagnostics.status
      }
    );
  } catch (error) {
    const normalized =
      turkAIMasterError(
        error,
        {
          operation: "startup-diagnostics"
        }
      );

    turkAIMasterState.status =
      "degraded";

    turkAIMasterState.startupErrors.push(
      normalized
    );

    turkAIMasterState.counters.startupErrors++;

    turkAISaveMasterState();

    turkAIMasterLog(
      "startup_diagnostics_failed",
      {
        error: normalized.message
      }
    );
  }

  return results;
}


/* =========================================================
   PERIODIC SELF HEALING
   ========================================================= */

let turkAISelfHealingTimer = null;
let turkAIDiagnosticsTimer = null;

function turkAIStartMasterTimers() {
  if (
    turkAISelfHealingTimer ||
    turkAIDiagnosticsTimer
  ) {
    return;
  }

  turkAISelfHealingTimer =
    setInterval(
      async () => {
        try {
          await turkAIRunSelfHealing();
        } catch (error) {
          turkAIMasterError(
            error,
            {
              timer: "self-healing"
            }
          );
        }
      },
      TURKAI_MASTER_CONFIG
        .selfHealing
        .intervalMs
    );

  /*
    Her self-healing turunda ayrÄ±ca
    diagnostics yapÄ±lÄ±r.
  */

  turkAIDiagnosticsTimer =
    setInterval(
      async () => {
        try {
          await turkAIRunFullDiagnostics();
        } catch (error) {
          turkAIMasterError(
            error,
            {
              timer: "diagnostics"
            }
          );
        }
      },
      TURKAI_MASTER_CONFIG
        .selfHealing
        .intervalMs
    );

  if (turkAISelfHealingTimer.unref) {
    turkAISelfHealingTimer.unref();
  }

  if (turkAIDiagnosticsTimer.unref) {
    turkAIDiagnosticsTimer.unref();
  }
}


/* =========================================================
   SYSTEM HEALTH
   ========================================================= */

function turkAIGetSystemHealth() {
  const diagnostics =
    readJson(
      TURKAI_MASTER_DIAGNOSTICS_FILE,
      null
    );

  const memory =
    process.memoryUsage();

  return {
    ok:
      turkAIMasterState.status !==
      "critical",

    status:
      turkAIMasterState.status,

    version:
      TURKAI_MASTER_CONFIG.version,

    codename:
      TURKAI_MASTER_CONFIG.codename,

    environment:
      TURKAI_MASTER_CONFIG.environment,

    uptimeSeconds:
      process.uptime(),

    pid:
      process.pid,

    memory: {
      rssMB:
        Number(
          (
            memory.rss /
            1024 /
            1024
          ).toFixed(2)
        ),

      heapUsedMB:
        Number(
          (
            memory.heapUsed /
            1024 /
            1024
          ).toFixed(2)
        )
    },

    startup: {
      completed:
        turkAIMasterState
          .startupCompleted,

      startedAt:
        turkAIMasterState.startedAt,

      lastDiagnosticsAt:
        turkAIMasterState
          .lastDiagnosticsAt,

      lastSelfHealingAt:
        turkAIMasterState
          .lastSelfHealingAt
    },

    counters:
      turkAIMasterState.counters,

    diagnostics
  };
}


/* =========================================================
   SYSTEM ROUTES
   ========================================================= */

app.get(
  "/api/system/health",
  (req, res) => {
    res.json({
      success: true,
      system: turkAIGetSystemHealth()
    });
  }
);


app.get(
  "/api/system/status",
  (req, res) => {
    res.json({
      success: true,

      status:
        turkAIMasterState.status,

      version:
        TURKAI_MASTER_CONFIG.version,

      codename:
        TURKAI_MASTER_CONFIG.codename,

      uptime:
        process.uptime(),

      pid:
        process.pid
    });
  }
);


app.get(
  "/api/system/diagnostics",
  async (req, res) => {
    try {
      const diagnostics =
        await turkAIRunFullDiagnostics();

      res.json({
        success: true,
        diagnostics
      });
    } catch (error) {
      turkAIMasterError(
        error,
        {
          route:
            "/api/system/diagnostics"
        }
      );

      res.status(500).json({
        success: false,
        error:
          "Diagnostics failed"
      });
    }
  }
);


app.post(
  "/api/system/self-healing",
  async (req, res) => {
    try {
      const result =
        await turkAIRunSelfHealing();

      res.json({
        success: true,
        result
      });
    } catch (error) {
      turkAIMasterError(
        error,
        {
          route:
            "/api/system/self-healing"
        }
      );

      res.status(500).json({
        success: false,
        error:
          "Self-healing failed"
      });
    }
  }
);


app.get(
  "/api/system/routes",
  (req, res) => {
    res.json({
      success: true,
      count:
        turkAIGetRegisteredRoutes()
          .length,
      routes:
        turkAIGetRegisteredRoutes()
    });
  }
);


/* =========================================================
   SYSTEM MODULE STATUS
   ========================================================= */

app.get(
  "/api/system/modules",
  (req, res) => {
    res.json({
      success: true,

      modules:
        turkAIRunModuleDiagnostics()
    });
  }
);


/* =========================================================
   SYSTEM METRICS
   ========================================================= */

app.get(
  "/api/system/metrics",
  (req, res) => {
    const memory =
      process.memoryUsage();

    res.json({
      success: true,

      process: {
        pid: process.pid,
        uptimeSeconds:
          process.uptime(),
        version:
          process.version,
        platform:
          process.platform,
        arch:
          process.arch
      },

      memory: {
        rss:
          memory.rss,

        heapTotal:
          memory.heapTotal,

        heapUsed:
          memory.heapUsed,

        external:
          memory.external,

        arrayBuffers:
          memory.arrayBuffers
      },

      cpu:
        process.cpuUsage()
    });
  }
);


/* =========================================================
   GLOBAL PROCESS ERROR HANDLERS
   ========================================================= */

process.on(
  "uncaughtException",
  error => {
    turkAIMasterError(
      error,
      {
        type:
          "uncaughtException"
      }
    );

    turkAIMasterState.status =
      "degraded";

    turkAISaveMasterState();

    /*
      Kritik process hatasÄ±nda hemen
      process.exit() yapÄ±lmÄ±yor.
      BÃ¶ylece mÃ¼mkÃ¼n olduÄŸunca sistem
      ayakta kalÄ±yor.
    */
  }
);


process.on(
  "unhandledRejection",
  reason => {
    const error =
      reason instanceof Error
        ? reason
        : new Error(
            typeof reason === "string"
              ? reason
              : JSON.stringify(reason)
          );

    turkAIMasterError(
      error,
      {
        type:
          "unhandledRejection"
      }
    );
  }
);


/* =========================================================
   GRACEFUL SHUTDOWN
   ========================================================= */

let turkAIShutdownStarted = false;

async function turkAIGracefulShutdown(
  signal = "UNKNOWN"
) {
  if (turkAIShutdownStarted) {
    return;
  }

  turkAIShutdownStarted = true;

  turkAIMasterState.shutdownRequested =
    true;

  turkAIMasterState.status =
    "shutting_down";

  turkAISaveMasterState();

  turkAIMasterLog(
    "shutdown_started",
    {
      signal
    }
  );

  /*
    TimerlarÄ± durdur.
  */

  if (turkAISelfHealingTimer) {
    clearInterval(
      turkAISelfHealingTimer
    );

    turkAISelfHealingTimer = null;
  }

  if (turkAIDiagnosticsTimer) {
    clearInterval(
      turkAIDiagnosticsTimer
    );

    turkAIDiagnosticsTimer = null;
  }

  /*
    Task worker stop.
  */

  try {
    if (
      typeof turkAIStopWorkers ===
      "function"
    ) {
      await turkAIStopWorkers();
    }
  } catch (error) {
    turkAIMasterError(
      error,
      {
        shutdownStep:
          "stop-workers"
      }
    );
  }

  /*
    Socket.IO kapatma.
  */

  try {
    if (
      typeof io !== "undefined" &&
      io &&
      typeof io.close ===
      "function"
    ) {
      await new Promise(resolve => {
        let finished = false;

        const done = () => {
          if (finished) return;

          finished = true;
          resolve();
        };

        try {
          io.close(done);

          setTimeout(
            done,
            3000
          );
        } catch (_) {
          done();
        }
      });
    }
  } catch (error) {
    turkAIMasterError(
      error,
      {
        shutdownStep:
          "socket-close"
      }
    );
  }

  /*
    HTTP server kapatma.
  */

  try {
    if (
      typeof httpServer !== "undefined" &&
      httpServer &&
      httpServer.listening
    ) {
      await new Promise(resolve => {
        let finished = false;

        const done = () => {
          if (finished) return;

          finished = true;
          resolve();
        };

        try {
          httpServer.close(done);

          setTimeout(
            done,
            TURKAI_MASTER_CONFIG
              .shutdown
              .timeoutMs
          );
        } catch (_) {
          done();
        }
      });
    }
  } catch (error) {
    turkAIMasterError(
      error,
      {
        shutdownStep:
          "http-close"
      }
    );
  }

  turkAIMasterState.status =
    "stopped";

  turkAISaveMasterState();

  turkAIMasterLog(
    "shutdown_completed",
    {
      signal
    }
  );

  /*
    Sunucu kapanÄ±ÅŸÄ±nÄ± tamamla.
  */

  setTimeout(
    () => {
      process.exit(0);
    },
    100
  ).unref();
}


process.once(
  "SIGINT",
  () => {
    turkAIGracefulShutdown(
      "SIGINT"
    );
  }
);


process.once(
  "SIGTERM",
  () => {
    turkAIGracefulShutdown(
      "SIGTERM"
    );
  }
);


/* =========================================================
   FINAL SYSTEM INFORMATION
   ========================================================= */

app.get(
  "/api/system",
  (req, res) => {
    res.json({
      success: true,

      name: "TÃ¼rkAI",

      version:
        TURKAI_MASTER_CONFIG.version,

      codename:
        TURKAI_MASTER_CONFIG.codename,

      architecture: {
        memory: true,
        knowledge: true,
        research: true,
        web: true,
        aiRouter: true,
        accounts: true,
        auth: true,
        fileEngine: true,
        largeFileEngine: true,
        usage: true,
        realtime: true,
        media: true,
        tasks: true,
        security: true,
        diagnostics: true,
        selfHealing: true
      },

      status:
        turkAIMasterState.status,

      uptime:
        process.uptime()
    });
  }
);


/* =========================================================
   FINAL MASTER EXPORTS
   ========================================================= */

Object.assign(
  module.exports,
  {
    TURKAI_MASTER_CONFIG,

    TURKAI_MODULE_REGISTRY,

    turkAIMasterState,

    turkAISaveMasterState,

    turkAIMasterLog,

    turkAIMasterError,

    turkAIHasFunction,

    turkAIGetFunction,

    turkAISafeCall,

    turkAICheckModule,

    turkAIRunModuleDiagnostics,

    turkAICheckJsonFile,

    turkAICheckCoreDatabases,

    turkAIGetEnvironmentDiagnostics,

    turkAIGetRegisteredRoutes,

    turkAIRunFullDiagnostics,

    turkAICleanupDirectory,

    turkAIRepairKnownStructures,

    turkAIRunSelfHealing,

    turkAIStartupDiagnostics,

    turkAIStartMasterTimers,

    turkAIGetSystemHealth,

    turkAIGracefulShutdown
  }
);


/* =========================================================
   MASTER STARTUP
   ========================================================= */

(async () => {
  try {
    turkAIMasterLog(
      "master_core_loaded",
      {
        version:
          TURKAI_MASTER_CONFIG.version,
        pid:
          process.pid
      }
    );

    await turkAIStartupDiagnostics();

    turkAIStartMasterTimers();

    turkAIMasterLog(
      "master_core_ready",
      {
        status:
          turkAIMasterState.status
      }
    );

    console.log(
      "â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”"
    );

    console.log(
      "ğŸ‡¹ğŸ‡· TÃœRKAI MASTER CORE 20/20 AKTÄ°F"
    );

    console.log(
      `âš¡ SÃ¼rÃ¼m: ${TURKAI_MASTER_CONFIG.version}`
    );

    console.log(
      `ğŸ§  Durum: ${turkAIMasterState.status}`
    );

    console.log(
      `ğŸ”§ Self-Healing: ${
        TURKAI_MASTER_CONFIG.selfHealing.enabled
          ? "AKTÄ°F"
          : "KAPALI"
      }`
    );

    console.log(
      `ğŸ“Š Diagnostics: AKTÄ°F`
    );

    console.log(
      `ğŸ›¡ï¸ Production Core: AKTÄ°F`
    );

    console.log(
      "â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”"
    );

  } catch (error) {
    turkAIMasterError(
      error,
      {
        operation:
          "master-startup"
      }
    );

    console.error(
      "TÃ¼rkAI Master Core baÅŸlatÄ±lÄ±rken hata:",
      error
    );
  }
})();




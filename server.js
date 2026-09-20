/*
========================================================================
 TÜRKAI MASTER SERVER 50.0
 SIFIRDAN TEMİZ MİMARİ
 10 PART
========================================================================

 PART 1  CORE + CONFIG + STORAGE
 PART 2  AI PROVIDERS + LOCAL AI
 PART 3  ANSWER MEMORY + CHAT
 PART 4  INTERNET RESEARCH
 PART 5  WEATHER + CURRENCY + GOLD
 PART 6  FILES + MEDIA
 PART 7  TASKS + REMINDERS + SCHEDULER
 PART 8  AUTH + PLANS + USAGE
 PART 9  CONVERSATIONS + CODING STUDIO
 PART 10 SOCKET + ADMIN + FRONTEND + STARTUP
========================================================================
*/

"use strict";

// ======================================================================
// PART 1 / 10
// CORE + CONFIG + STORAGE
// ======================================================================

require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

let Server;
let multer;

try {
    ({ Server } = require("socket.io"));
} catch (error) {
    console.error("socket.io bulunamadı.");
    console.error("Kurulum: npm i socket.io");
    process.exit(1);
}

try {
    multer = require("multer");
} catch (error) {
    console.error("multer bulunamadı.");
    console.error("Kurulum: npm i multer");
    process.exit(1);
}

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
    }
});

const PORT =
    Number(process.env.PORT) ||
    3000;

const HOST =
    process.env.HOST ||
    "0.0.0.0";

const ROOT_DIR =
    __dirname;

const DATA_DIR =
    path.join(
        ROOT_DIR,
        "data"
    );

const UPLOAD_DIR =
    path.join(
        ROOT_DIR,
        "uploads"
    );

const MEMORY_DIR =
    path.join(
        DATA_DIR,
        "memory"
    );

const CONVERSATION_DIR =
    path.join(
        DATA_DIR,
        "conversations"
    );

const RESEARCH_DIR =
    path.join(
        DATA_DIR,
        "research"
    );

const TASK_DIR =
    path.join(
        DATA_DIR,
        "tasks"
    );

const ACCOUNT_DIR =
    path.join(
        DATA_DIR,
        "accounts"
    );

const FILE_INDEX =
    path.join(
        DATA_DIR,
        "files.json"
    );

const MEMORY_FILE =
    path.join(
        MEMORY_DIR,
        "memory.json"
    );

const KNOWLEDGE_FILE =
    path.join(
        MEMORY_DIR,
        "knowledge.json"
    );

const USAGE_FILE =
    path.join(
        ACCOUNT_DIR,
        "usage.json"
    );

const USERS_FILE =
    path.join(
        ACCOUNT_DIR,
        "users.json"
    );

const PLANS_FILE =
    path.join(
        ACCOUNT_DIR,
        "plans.json"
    );

const SETTINGS_FILE =
    path.join(
        DATA_DIR,
        "settings.json"
    );

const SERVER_INFO = {
    name:
        "TürkAI Master Server",

    version:
        "50.0.0",

    codename:
        "Clean Core",

    startedAt:
        new Date().toISOString()
};

const LIMITS = {
    free:
        50,

    pro:
        100,

    plus:
        200,

    ultra:
        1000,

    developer:
        4000
};

const PRICES = {
    free:
        0,

    pro:
        250,

    plus:
        500,

    ultra:
        1000,

    developer:
        0
};

function ensureDir(
    dir
) {
    if (
        !fs.existsSync(dir)
    ) {
        fs.mkdirSync(
            dir,
            {
                recursive:
                    true
            }
        );
    }
}

[
    DATA_DIR,
    UPLOAD_DIR,
    MEMORY_DIR,
    CONVERSATION_DIR,
    RESEARCH_DIR,
    TASK_DIR,
    ACCOUNT_DIR
].forEach(
    ensureDir
);

app.disable(
    "x-powered-by"
);

app.use(
    express.json({
        limit:
            "20mb"
    })
);

app.use(
    express.urlencoded({
        extended:
            true,
        limit:
            "20mb"
    })
);

app.use(
    function (
        req,
        res,
        next
    ) {
        res.setHeader(
            "Access-Control-Allow-Origin",
            "*"
        );

        res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization, X-User-Id"
        );

        res.setHeader(
            "Access-Control-Allow-Methods",
            "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        );

        if (
            req.method ===
            "OPTIONS"
        ) {
            return res.sendStatus(
                204
            );
        }

        next();
    }
);

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
    ).trim();
}

function safeNumber(
    value,
    fallback = 0
) {
    const number =
        Number(value);

    return Number.isFinite(
        number
    )
        ? number
        : fallback;
}

function now() {
    return new Date().toISOString();
}

function createId(
    prefix = "id"
) {
    return (
        prefix +
        "_" +
        Date.now().toString(36) +
        "_" +
        crypto
            .randomBytes(6)
            .toString("hex")
    );
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
    } catch {
        return fallback;
    }
}

function writeJSON(
    file,
    value
) {
    try {
        ensureDir(
            path.dirname(file)
        );

        fs.writeFileSync(
            file,
            JSON.stringify(
                value,
                null,
                2
            ),
            "utf8"
        );

        return true;
    } catch (
        error
    ) {
        console.error(
            "[WRITE]",
            file,
            error.message
        );

        return false;
    }
}

function appendJSONLine(
    file,
    value
) {
    try {
        ensureDir(
            path.dirname(file)
        );

        fs.appendFileSync(
            file,
            JSON.stringify(
                value
            ) +
            "\n",
            "utf8"
        );

        return true;
    } catch {
        return false;
    }
}

function readJSONLines(
    file,
    limit = 100
) {
    try {
        if (
            !fs.existsSync(file)
        ) {
            return [];
        }

        return fs
            .readFileSync(
                file,
                "utf8"
            )
            .split("\n")
            .filter(Boolean)
            .slice(
                -limit
            )
            .map(
                line => {
                    try {
                        return JSON.parse(
                            line
                        );
                    } catch {
                        return null;
                    }
                }
            )
            .filter(Boolean);
    } catch {
        return [];
    }
}

const defaultSettings = {
    researchEnabled:
        true,

    memoryEnabled:
        true,

    autoLearning:
        true,

    weatherEnabled:
        true,

    currencyEnabled:
        true,

    goldEnabled:
        true,

    fileUploadEnabled:
        true,

    schedulerEnabled:
        true,

    codingEnabled:
        true
};

let settings =
    readJSON(
        SETTINGS_FILE,
        defaultSettings
    );

if (
    !settings ||
    typeof settings !==
        "object"
) {
    settings =
        defaultSettings;
}

writeJSON(
    SETTINGS_FILE,
    settings
);

const runtime = {
    requests:
        0,

    chatRequests:
        0,

    researchRequests:
        0,

    errors:
        0,

    uploads:
        0,

    websocketConnections:
        0,

    activeUsers:
        new Set(),

    bootTime:
        Date.now()
};

// ======================================================================
// PART 2 / 10
// AI PROVIDERS + LOCAL AI
// ======================================================================

const AI_CONFIG = {
    groq: {
        enabled:
            Boolean(
                process.env.GROQ_API_KEY
            ),

        key:
            process.env.GROQ_API_KEY ||
            "",

        url:
            "https://api.groq.com/openai/v1/chat/completions",

        model:
            process.env.GROQ_MODEL ||
            "openai/gpt-oss-20b"
    },

    cerebras: {
        enabled:
            Boolean(
                process.env.CEREBRAS_API_KEY
            ),

        key:
            process.env.CEREBRAS_API_KEY ||
            "",

        url:
            "https://api.cerebras.ai/v1/chat/completions",

        model:
            process.env.CEREBRAS_MODEL ||
            "gpt-oss-120b"
    },

    gemini: {
        enabled:
            Boolean(
                process.env.GEMINI_API_KEY
            ),

        key:
            process.env.GEMINI_API_KEY ||
            "",

        model:
            process.env.GEMINI_MODEL ||
            "gemini-2.5-flash"
    },

    openrouter: {
        enabled:
            Boolean(
                process.env.OPENROUTER_API_KEY
            ),

        key:
            process.env.OPENROUTER_API_KEY ||
            "",

        url:
            "https://openrouter.ai/api/v1/chat/completions",

        model:
            process.env.OPENROUTER_MODEL ||
            "openai/gpt-oss-20b:free"
    }
};

const LOCAL_ANSWERS = {
    selam:
        "Selam! TürkAI burada. Ne yapmak istiyorsun?",

    merhaba:
        "Merhaba! TürkAI hazır.",

    mrb:
        "Merhaba! TürkAI hazır.",

    nasılsın:
        "İyiyim knk 😄 TürkAI çalışıyor.",

    "nasılsın?":
        "İyiyim knk 😄 TürkAI çalışıyor.",

    "en hızlı kim":
        "TürkAI ⚡🤖",

    "en hızlı kim?":
        "TürkAI ⚡🤖",

    teşekkürler:
        "Rica ederim!",

    teşekkür:
        "Rica ederim!",

    sağol:
        "Ne demek!",

    "ne yapabiliyorsun":
        "Kod yazabilir, soruları yanıtlayabilir, araştırma yapabilir, hava durumu ve döviz bilgisi getirebilir, dosya alabilir ve konuşma hafızası tutabilirim."
};

function normalizeText(
    text
) {
    return safeString(
        text
    )
        .toLocaleLowerCase(
            "tr-TR"
        )
        .replace(
            /[.,!?;:()[\]{}"'`]/g,
            ""
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function getLocalAnswer(
    message
) {
    const clean =
        normalizeText(
            message
        );

    if (
        LOCAL_ANSWERS[
            clean
        ]
    ) {
        return LOCAL_ANSWERS[
            clean
        ];
    }

    for (
        const key of Object.keys(
            LOCAL_ANSWERS
        )
    ) {
        if (
            clean ===
            key
        ) {
            return LOCAL_ANSWERS[
                key
            ];
        }
    }

    return null;
}

async function fetchWithTimeout(
    url,
    options = {},
    timeout = 15000
) {
    const controller =
        new AbortController();

    const timer =
        setTimeout(
            () => {
                controller.abort();
            },
            timeout
        );

    try {
        return await fetch(
            url,
            {
                ...options,
                signal:
                    controller.signal
            }
        );
    } finally {
        clearTimeout(
            timer
        );
    }
}

async function callOpenAICompatible(
    provider,
    messages
) {
    const config =
        AI_CONFIG[
            provider
        ];

    if (
        !config ||
        !config.enabled ||
        !config.key
    ) {
        throw new Error(
            provider +
            "_not_configured"
        );
    }

    const response =
        await fetchWithTimeout(
            config.url,
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    Authorization:
                        "Bearer " +
                        config.key
                },

                body:
                    JSON.stringify({
                        model:
                            config.model,

                        messages,

                        temperature:
                            0.7,

                        max_tokens:
                            2500
                    })
            },
            30000
        );

    const data =
        await response.json();

    if (
        !response.ok
    ) {
        throw new Error(
            provider +
            "_http_" +
            response.status +
            "_" +
            safeString(
                data &&
                data.error &&
                data.error.message
            )
        );
    }

    const answer =
        data &&
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content;

    if (
        !answer
    ) {
        throw new Error(
            provider +
            "_empty_response"
        );
    }

    return {
        provider,
        model:
            config.model,
        answer:
            String(
                answer
            )
    };
}

async function callGemini(
    messages
) {
    const config =
        AI_CONFIG.gemini;

    if (
        !config.enabled ||
        !config.key
    ) {
        throw new Error(
            "gemini_not_configured"
        );
    }

    const prompt =
        messages
            .map(
                item =>
                    `${item.role}: ${item.content}`
            )
            .join("\n");

    const url =
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        encodeURIComponent(
            config.model
        ) +
        ":generateContent?key=" +
        encodeURIComponent(
            config.key
        );

    const response =
        await fetchWithTimeout(
            url,
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    {
                                        text:
                                            prompt
                                    }
                                ]
                            }
                        ]
                    })
            },
            30000
        );

    const data =
        await response.json();

    if (
        !response.ok
    ) {
        throw new Error(
            "gemini_http_" +
            response.status
        );
    }

    const answer =
        data &&
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0] &&
        data.candidates[0].content.parts[0].text;

    if (
        !answer
    ) {
        throw new Error(
            "gemini_empty_response"
        );
    }

    return {
        provider:
            "gemini",

        model:
            config.model,

        answer:
            String(
                answer
            )
    };
}

const providerOrder = [
    "groq",
    "cerebras",
    "gemini",
    "openrouter"
];

async function askProviders(
    messages
) {
    const errors =
        [];

    for (
        const provider of providerOrder
    ) {
        try {
            let result;

            if (
                provider ===
                "gemini"
            ) {
                result =
                    await callGemini(
                        messages
                    );
            } else {
                result =
                    await callOpenAICompatible(
                        provider,
                        messages
                    );
            }

            return {
                ok:
                    true,

                ...result,

                errors
            };
        } catch (
            error
        ) {
            errors.push({
                provider,
                error:
                    error.message
            });
        }
    }

    return {
        ok:
            false,

        provider:
            "local",

        model:
            "local-rule-engine",

        answer:
            null,

        errors
    };
}

function getProviderStatus() {
    return {
        groq:
            AI_CONFIG.groq.enabled,

        cerebras:
            AI_CONFIG.cerebras.enabled,

        gemini:
            AI_CONFIG.gemini.enabled,

        openrouter:
            AI_CONFIG.openrouter.enabled,

        local:
            true
    };
}

function buildSystemPrompt(
    context = ""
) {
    return `
Sen TürkAI'sın.
Türkçe doğal ve anlaşılır cevap ver.
Kullanıcı bir soru sorduğunda gereksiz yere başka konuya geçme.
Kod isteniyorsa çalışan kod ver.
Bilmediğin güncel bilgilerde internet araştırma sistemini kullan.
Önceki hafıza bağlamını sadece uygun olduğunda kullan.

Ek bağlam:
${context}
`.trim();
}

// ======================================================================
// PART 3 / 10
// ANSWER MEMORY + CHAT
// ======================================================================

let memoryDB =
    readJSON(
        MEMORY_FILE,
        {
            items:
                []
        }
    );

let knowledgeDB =
    readJSON(
        KNOWLEDGE_FILE,
        {
            items:
                []
        }
    );

if (
    !memoryDB ||
    !Array.isArray(
        memoryDB.items
    )
) {
    memoryDB = {
        items:
            []
    };
}

if (
    !knowledgeDB ||
    !Array.isArray(
        knowledgeDB.items
    )
) {
    knowledgeDB = {
        items:
            []
    };
}

function saveMemoryDB() {
    writeJSON(
        MEMORY_FILE,
        memoryDB
    );
}

function saveKnowledgeDB() {
    writeJSON(
        KNOWLEDGE_FILE,
        knowledgeDB
    );
}

function scoreText(
    a,
    b
) {
    const aa =
        normalizeText(
            a
        );

    const bb =
        normalizeText(
            b
        );

    if (
        !aa ||
        !bb
    ) {
        return 0;
    }

    if (
        aa ===
        bb
    ) {
        return 1;
    }

    const aw =
        new Set(
            aa.split(" ")
        );

    const bw =
        new Set(
            bb.split(" ")
        );

    let same =
        0;

    for (
        const word of aw
    ) {
        if (
            bw.has(word)
        ) {
            same++;
        }
    }

    const base =
        Math.max(
            aw.size,
            bw.size
        );

    return base
        ? same / base
        : 0;
}

function searchMemory(
    userId,
    question
) {
    const list =
        memoryDB.items
            .filter(
                item =>
                    item.userId ===
                    userId ||
                    item.userId ===
                    "global"
            )
            .map(
                item => ({
                    ...item,
                    score:
                        scoreText(
                            item.question,
                            question
                        )
                })
            )
            .filter(
                item =>
                    item.score >=
                    0.55
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    b.score -
                    a.score
            );

    const hit =
        list[0];

    if (
        !hit
    ) {
        return {
            hit:
                false,

            answer:
                null,

            score:
                0
        };
    }

    return {
        hit:
            true,

        answer:
            hit.answer,

        score:
            hit.score,

        source:
            "answer-memory"
    };
}

function saveMemory(
    userId,
    question,
    answer,
    source = "chat"
) {
    const cleanQuestion =
        safeString(
            question
        );

    const cleanAnswer =
        safeString(
            answer
        );

    if (
        !cleanQuestion ||
        !cleanAnswer
    ) {
        return;
    }

    const duplicate =
        memoryDB.items.find(
            item =>
                item.userId ===
                    userId &&
                normalizeText(
                    item.question
                ) ===
                    normalizeText(
                        cleanQuestion
                    )
        );

    if (
        duplicate
    ) {
        duplicate.answer =
            cleanAnswer;

        duplicate.source =
            source;

        duplicate.updatedAt =
            now();
    } else {
        memoryDB.items.push({
            id:
                createId(
                    "memory"
                ),

            userId:
                userId ||
                "guest",

            question:
                cleanQuestion,

            answer:
                cleanAnswer,

            source,

            createdAt:
                now(),

            updatedAt:
                now()
        });
    }

    if (
        memoryDB.items.length >
        5000
    ) {
        memoryDB.items =
            memoryDB.items.slice(
                -5000
            );
    }

    saveMemoryDB();
}

function saveKnowledge(
    question,
    answer,
    source = "learned"
) {
    const cleanQuestion =
        safeString(
            question
        );

    const cleanAnswer =
        safeString(
            answer
        );

    if (
        !cleanQuestion ||
        !cleanAnswer
    ) {
        return;
    }

    const duplicate =
        knowledgeDB.items.find(
            item =>
                normalizeText(
                    item.question
                ) ===
                normalizeText(
                    cleanQuestion
                )
        );

    if (
        duplicate
    ) {
        duplicate.answer =
            cleanAnswer;

        duplicate.updatedAt =
            now();

        duplicate.source =
            source;
    } else {
        knowledgeDB.items.push({
            id:
                createId(
                    "knowledge"
                ),

            question:
                cleanQuestion,

            answer:
                cleanAnswer,

            source,

            createdAt:
                now(),

            updatedAt:
                now()
        });
    }

    if (
        knowledgeDB.items.length >
        10000
    ) {
        knowledgeDB.items =
            knowledgeDB.items.slice(
                -10000
            );
    }

    saveKnowledgeDB();
}

function searchKnowledge(
    question
) {
    const list =
        knowledgeDB.items
            .map(
                item => ({
                    ...item,
                    score:
                        scoreText(
                            item.question,
                            question
                        )
                })
            )
            .filter(
                item =>
                    item.score >=
                    0.70
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    b.score -
                    a.score
            );

    const hit =
        list[0];

    if (
        !hit
    ) {
        return {
            hit:
                false,

            answer:
                null,

            score:
                0
        };
    }

    return {
        hit:
            true,

        answer:
            hit.answer,

        score:
            hit.score,

        source:
            "knowledge"
    };
}

function shouldResearch(
    message
) {
    const text =
        normalizeText(
            message
        );

    const currentWords = [
        "bugün",
        "şimdi",
        "güncel",
        "son dakika",
        "haber",
        "fiyat",
        "kaç tl",
        "kur",
        "dolar",
        "euro",
        "altın",
        "hava",
        "hava durumu",
        "maç",
        "2026",
        "en son"
    ];

    return currentWords.some(
        keyword =>
            text.includes(
                keyword
            )
    );
}

function formatConversationContext(
    userId
) {
    const file =
        path.join(
            CONVERSATION_DIR,
            `${userId}.json`
        );

    const data =
        readJSON(
            file,
            {
                items:
                    []
            }
        );

    if (
        !data ||
        !Array.isArray(
            data.items
        )
    ) {
        return "";
    }

    return data.items
        .slice(-8)
        .map(
            item =>
                `${item.role}: ${item.content}`
        )
        .join("\n");
}

function saveConversationMessage(
    userId,
    conversationId,
    role,
    content
) {
    const file =
        path.join(
            CONVERSATION_DIR,
            `${userId}.json`
        );

    const data =
        readJSON(
            file,
            {
                items:
                    []
            }
        );

    if (
        !Array.isArray(
            data.items
        )
    ) {
        data.items =
            [];
    }

    data.items.push({
        id:
            createId(
                "msg"
            ),

        conversationId:
            conversationId ||
            "default",

        role,

        content:
            safeString(
                content
            ),

        timestamp:
            now()
    });

    if (
        data.items.length >
        2000
    ) {
        data.items =
            data.items.slice(
                -2000
            );
    }

    writeJSON(
        file,
        data
    );
}

async function answerChat(
    userId,
    message,
    options = {}
) {
    const local =
        getLocalAnswer(
            message
        );

    if (
        local
    ) {
        return {
            answer:
                local,

            source:
                "local",

            provider:
                "local",

            model:
                "local-rule-engine",

            researched:
                false
        };
    }

    const memory =
        searchMemory(
            userId,
            message
        );

    if (
        memory.hit &&
        memory.score >=
            0.92
    ) {
        return {
            answer:
                memory.answer,

            source:
                "memory",

            provider:
                "memory",

            model:
                "answer-memory",

            researched:
                false,

            memory
        };
    }

    const knowledge =
        searchKnowledge(
            message
        );

    if (
        knowledge.hit &&
        knowledge.score >=
            0.90
    ) {
        return {
            answer:
                knowledge.answer,

            source:
                "knowledge",

            provider:
                "knowledge",

            model:
                "local-knowledge",

            researched:
                false,

            knowledge
        };
    }

    let researchContext =
        "";

    if (
        settings.researchEnabled &&
        (
            options.forceResearch ||
            shouldResearch(
                message
            )
        )
    ) {
        try {
            const research =
                await executeResearch(
                    message
                );

            researchContext =
                research.context ||
                "";
        } catch {
            researchContext =
                "";
        }
    }

    const previous =
        formatConversationContext(
            userId
        );

    const messages = [
        {
            role:
                "system",

            content:
                buildSystemPrompt(
                    [
                        previous,

                        memory.hit
                            ? `Hafıza: ${memory.answer}`
                            : "",

                        knowledge.hit
                            ? `Bilgi tabanı: ${knowledge.answer}`
                            : "",

                        researchContext
                            ? `Araştırma: ${researchContext}`
                            : ""
                    ]
                        .filter(Boolean)
                        .join("\n\n")
                )
        },

        {
            role:
                "user",

            content:
                message
        }
    ];

    const providerResult =
        await askProviders(
            messages
        );

    if (
        providerResult.ok
    ) {
        const answer =
            providerResult.answer;

        saveMemory(
            userId,
            message,
            answer,
            "ai"
        );

        if (
            settings.autoLearning &&
            !researchContext
        ) {
            saveKnowledge(
                message,
                answer,
                "ai-auto-learning"
            );
        }

        return {
            ...providerResult,

            source:
                "provider",

            researched:
                Boolean(
                    researchContext
                )
        };
    }

    const fallback =
        localFallback(
            message
        );

    saveMemory(
        userId,
        message,
        fallback,
        "local-fallback"
    );

    return {
        ok:
            true,

        answer:
            fallback,

        source:
            "local-fallback",

        provider:
            "local",

        model:
            "fallback-engine",

        researched:
            Boolean(
                researchContext
            ),

        providerErrors:
            providerResult.errors
    };
}

function localFallback(
    message
) {
    const text =
        normalizeText(
            message
        );

    if (
        text.includes(
            "kod"
        )
    ) {
        return "Kod konusunda yardımcı olabilirim. Hangi dili veya hangi hatayı çözeceğimizi yaz.";
    }

    if (
        text.includes(
            "merhaba"
        ) ||
        text ===
            "selam"
    ) {
        return "Selam! TürkAI burada. Ne yapmak istiyorsun?";
    }

    if (
        text.includes(
            "nasıl çalışır"
        )
    ) {
        return "Bana sorunu veya hedefini yaz. Önce yerel hafıza ve bilgi tabanını kontrol eder, gerektiğinde araştırma ve yapay zekâ sağlayıcılarına geçerim.";
    }

    return "Bunu yerel sistemimde doğrudan eşleştiremedim. Güncel bir bilgi ise araştırma yapabilir veya daha fazla ayrıntı verirsen soruyu işleyebilirim.";
}

// CHAT

app.post(
    "/api/chat",
    async (
        req,
        res
    ) => {
        runtime.requests++;
        runtime.chatRequests++;

        const body =
            req.body ||
            {};

        const message =
            safeString(
                body.message ||
                body.prompt ||
                body.text
            );

        const userId =
            safeString(
                body.userId ||
                req.headers[
                    "x-user-id"
                ] ||
                "guest"
            );

        const conversationId =
            safeString(
                body.conversationId ||
                "default"
            );

        if (
            !message
        ) {
            return res.status(
                400
            ).json({
                ok:
                    false,

                error:
                    "message_required"
            });
        }

        try {
            saveConversationMessage(
                userId,
                conversationId,
                "user",
                message
            );

            const result =
                await answerChat(
                    userId,
                    message,
                    {
                        forceResearch:
                            Boolean(
                                body.forceResearch ||
                                body.research
                            )
                    }
                );

            saveConversationMessage(
                userId,
                conversationId,
                "assistant",
                result.answer
            );

            return res.json({
                ok:
                    true,

                success:
                    true,

                message,

                answer:
                    result.answer,

                source:
                    result.source,

                provider:
                    result.provider,

                model:
                    result.model,

                researched:
                    Boolean(
                        result.researched
                    )
            });
        } catch (
            error
        ) {
            runtime.errors++;

            return res.status(
                500
            ).json({
                ok:
                    false,

                error:
                    "chat_failed",

                message:
                    error.message
            });
        }
    }
);

app.post(
    "/api/chat/smart",
    async (
        req,
        res
    ) => {
        req.body =
            req.body ||
            {};

        req.body.forceResearch =
            req.body.forceResearch ||
            shouldResearch(
                req.body.message ||
                req.body.query ||
                ""
            );

        const originalHandler =
            req.body;

        try {
            const message =
                safeString(
                    originalHandler.message ||
                    originalHandler.query ||
                    originalHandler.prompt
                );

            if (
                !message
            ) {
                return res.status(
                    400
                ).json({
                    ok:
                        false,

                    error:
                        "message_required"
                });
            }

            const userId =
                safeString(
                    originalHandler.userId ||
                    "guest"
                );

            const result =
                await answerChat(
                    userId,
                    message,
                    {
                        forceResearch:
                            Boolean(
                                originalHandler.forceResearch
                            )
                    }
                );

            return res.json({
                ok:
                    true,

                answer:
                    result.answer,

                source:
                    result.source,

                provider:
                    result.provider,

                model:
                    result.model,

                researched:
                    Boolean(
                        result.researched
                    )
            });
        } catch (
            error
        ) {
            runtime.errors++;

            return res.status(
                500
            ).json({
                ok:
                    false,

                error:
                    "smart_chat_failed",

                message:
                    error.message
            });
        }
    }
);

app.get(
    "/api/memory/search",
    (
        req,
        res
    ) => {
        const userId =
            safeString(
                req.query.userId ||
                "guest"
            );

        const question =
            safeString(
                req.query.q ||
                req.query.question
            );

        if (
            !question
        ) {
            return res.status(
                400
            ).json({
                ok:
                    false,

                error:
                    "question_required"
            });
        }

        return res.json({
            ok:
                true,

            result:
                searchMemory(
                    userId,
                    question
                )
        });
    }
);

app.get(
    "/api/memory",
    (
        req,
        res
    ) => {
        const userId =
            safeString(
                req.query.userId ||
                "guest"
            );

        return res.json({
            ok:
                true,

            items:
                memoryDB.items.filter(
                    item =>
                        item.userId ===
                        userId ||
                        item.userId ===
                        "global"
                ).slice(
                    -200
                )
        });
    }
);

app.post(
    "/api/memory/save",
    (
        req,
        res
    ) => {
        const body =
            req.body ||
            {};

        const userId =
            safeString(
                body.userId ||
                "guest"
            );

        const question =
            safeString(
                body.question
            );

        const answer =
            safeString(
                body.answer
            );

        if (
            !question ||
            !answer
        ) {
            return res.status(
                400
            ).json({
                ok:
                    false,

                error:
                    "question_and_answer_required"
            });
        }

        saveMemory(
            userId,
            question,
            answer,
            "manual"
        );

        return res.json({
            ok:
                true
        });
    }
);

app.post(
    "/api/knowledge/save",
    (
        req,
        res
    ) => {
        const body =
            req.body ||
            {};

        if (
            !body.question ||
            !body.answer
        ) {
            return res.status(
                400
            ).json({
                ok:
                    false,

                error:
                    "question_and_answer_required"
            });
        }

        saveKnowledge(
            body.question,
            body.answer,
            "manual"
        );

        return res.json({
            ok:
                true
        });
    }
);

app.get(
    "/api/knowledge/search",
    (
        req,
        res
    ) => {
        const question =
            safeString(
                req.query.q
            );

        return res.json({
            ok:
                true,

            result:
                searchKnowledge(
                    question
                )
        });
    }
);

// ======================================================================
// PART 4 / 10
// INTERNET RESEARCH
// ======================================================================

const researchCache =
    new Map();

function cleanHTML(
    html
) {
    return safeString(
        html
            .replace(
                /<script[\s\S]*?<\/script>/gi,
                " "
            )
            .replace(
                /<style[\s\S]*?<\/style>/gi,
                " "
            )
            .replace(
                /<[^>]+>/g,
                " "
            )
            .replace(
                /&quot;/g,
                '"'
            )
            .replace(
                /&#39;/g,
                "'"
            )
            .replace(
                /&amp;/g,
                "&"
            )
            .replace(
                /\s+/g,
                " "
            )
    );
}

async function searchDuckDuckGo(
    query
) {
    const url =
        "https://html.duckduckgo.com/html/?q=" +
        encodeURIComponent(
            query
        );

    const response =
        await fetchWithTimeout(
            url,
            {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 TürkAI/50"
                }
            },
            15000
        );

    const html =
        await response.text();

    if (
        !response.ok
    ) {
        throw new Error(
            "duckduckgo_http_" +
            response.status
        );
    }

    const results =
        [];

    const regex =
        /result__a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

    let match;

    while (
        (
            match =
                regex.exec(
                    html
                )
        ) &&
        results.length <
            8
    ) {
        results.push({
            title:
                cleanHTML(
                    match[2]
                ),

            url:
                match[1]
        });
    }

    return results;
}

async function wikipediaSearch(
    query
) {
    const searchURL =
        "https://tr.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
        encodeURIComponent(
            query
        ) +
        "&format=json&utf8=1";

    const response =
        await fetchWithTimeout(
            searchURL,
            {},
            12000
        );

    const data =
        await response.json();

    if (
        !response.ok
    ) {
        throw new Error(
            "wikipedia_search_failed"
        );
    }

    return (
        data &&
        data.query &&
        data.query.search
            ? data.query.search
                .slice(
                    0,
                    5
                )
                .map(
                    item => ({
                        title:
                            item.title,

                        snippet:
                            cleanHTML(
                                item.snippet
                            ),

                        url:
                            "https://tr.wikipedia.org/wiki/" +
                            encodeURIComponent(
                                item.title
                            )
                    })
                )
            : []
    );
}

async function executeResearch(
    question
) {
    runtime.researchRequests++;

    const cacheKey =
        normalizeText(
            question
        );

    const cached =
        researchCache.get(
            cacheKey
        );

    if (
        cached &&
        Date.now() -
            cached.time <
            5 * 60 * 1000
    ) {
        return cached.data;
    }

    const sources =
        [];

    try {
        const duck =
            await searchDuckDuckGo(
                question
            );

        sources.push(
            ...duck
        );
    } catch {
        // ignore
    }

    try {
        const wiki =
            await wikipediaSearch(
                question
            );

        sources.push(
            ...wiki
        );
    } catch {
        // ignore
    }

    const unique =
        [];

    const seen =
        new Set();

    for (
        const source of sources
    ) {
        if (
            source.url &&
            !seen.has(
                source.url
            )
        ) {
            seen.add(
                source.url
            );

            unique.push(
                source
            );
        }
    }

    const context =
        unique
            .slice(
                0,
                10
            )
            .map(
                (
                    source,
                    index
                ) =>
                    `[${index + 1}] ${source.title}\n${source.snippet || ""}\n${source.url}`
            )
            .join(
                "\n\n"
            );

    const result = {
        ok:
            true,

        query:
            question,

        sources:
            unique.slice(
                0,
                10
            ),

        context,

        timestamp:
            now()
    };

    const researchFile =
        path.join(
            RESEARCH_DIR,
            `${Date.now()}-${crypto.randomBytes(3).toString("hex")}.json`
        );

    writeJSON(
        researchFile,
        result
    );

    researchCache.set(
        cacheKey,
        {
            time:
                Date.now(),

            data:
                result
        }
    );

    return result;
}

app.post(
    "/api/research",
    async (
        req,
        res
    ) => {
        const question =
            safeString(
                req.body &&
                (
                    req.body.question ||
                    req.body.query ||
                    req.body.message
                )
            );

        if (
            !question
        ) {
            return res.status(
                400
            ).json({
                ok:
                    false,

                error:
                    "question_required"
            });
        }

        try {
            const result =
                await executeResearch(
                    question
                );

            return res.json(
                result
            );
        } catch (
            error
        ) {
            runtime.errors++;

            return res.status(
                502
            ).json({
                ok:
                    false,

                error:
                    "research_failed",

                message:
                    error.message
            });
        }
    }
);

app.post(
    "/api/research/auto",
    async (
        req,
        res
    ) => {
        const message =
            safeString(
                req.body &&
                (
                    req.body.message ||
                    req.body.query
                )
            );

        if (
            !message
        ) {
            return res.status(
                400
            ).json({
                ok:
                    false,

                error:
                    "message_required"
            });
        }

        try {
            const result =
                await executeResearch(
                    message
                );

            return res.json({
                ok:
                    true,

                shouldResearch:
                    true,

                ...result
            });
        } catch (
            error
        ) {
            return res.status(
                502
            ).json({
                ok:
                    false,

                error:
                    "auto_research_failed",

                message:
                    error.message
            });
        }
    }
);

app.get(
    "/api/research/sources",
    (
        req,
        res
    ) => {
        let files =
            [];

        try {
            files =
                fs
                    .readdirSync(
                        RESEARCH_DIR
                    )
                    .filter(
                        name =>
                            name.endsWith(
                                ".json"
                            )
                    )
                    .slice(
                        -500
                    )
                    .reverse();
        } catch {
            files =
                [];
        }

        return res.json({
            ok:
                true,

            count:
                files.length,

            files
        });
    }
);

// ======================================================================
// PART 5 / 10
// WEATHER + CURRENCY + GOLD
// ======================================================================

const marketCache =
    new Map();

async function openMeteoGeocode(
    city
) {
    const url =
        "https://geocoding-api.open-meteo.com/v1/search?name=" +
        encodeURIComponent(
            city
        ) +
        "&count=1&language=tr&format=json";

    const response =
        await fetchWithTimeout(
            url,
            {},
            12000
        );

    const data =
        await response.json();

    if (
        !response.ok ||
        !data.results ||
        !data.results[0]
    ) {
        throw new Error(
            "city_not_found"
        );
    }

    return data.results[0];
}

async function getWeather(
    city,
    days = 5
) {
    const key =
        "weather:" +
        normalizeText(
            city
        ) +
        ":" +
        days;

    const cached =
        marketCache.get(
            key
        );

    if (
        cached &&
        Date.now() -
            cached.time <
            5 * 60 * 1000
    ) {
        return cached.data;
    }

    const location =
        await openMeteoGeocode(
            city
        );

    const url =
        "https://api.open-meteo.com/v1/forecast" +
        "?latitude=" +
        encodeURIComponent(
            location.latitude
        ) +
        "&longitude=" +
        encodeURIComponent(
            location.longitude
        ) +
        "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m" +
        "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code" +
        "&forecast_days=" +
        Math.min(
            7,
            Math.max(
                1,
                safeNumber(
                    days,
                    5
                )
            )
        ) +
        "&timezone=auto";

    const response =
        await fetchWithTimeout(
            url,
            {},
            15000
        );

    const data =
        await response.json();

    if (
        !response.ok
    ) {
        throw new Error(
            "weather_failed"
        );
    }

    const result = {
        ok:
            true,

        city:
            location.name,

        country:
            location.country,

        latitude:
            location.latitude,

        longitude:
            location.longitude,

        current:
            data.current,

        daily:
            data.daily,

        timestamp:
            now()
    };

    marketCache.set(
        key,
        {
            time:
                Date.now(),

            data:
                result
        }
    );

    return result;
}

async function getCurrency(
    from = "TRY",
    to = "USD"
) {
    const source =
        safeString(
            from,
            "TRY"
        ).toUpperCase();

    const target =
        safeString(
            to,
            "USD"
        ).toUpperCase();

    const key =
        `currency:${source}:${target}`;

    const cached =
        marketCache.get(
            key
        );

    if (
        cached &&
        Date.now() -
            cached.time <
            15 * 60 * 1000
    ) {
        return cached.data;
    }

    const url =
        "https://api.frankfurter.app/latest?from=" +
        encodeURIComponent(
            source
        ) +
        "&to=" +
        encodeURIComponent(
            target
        );

    const response =
        await fetchWithTimeout(
            url,
            {},
            12000
        );

    const data =
        await response.json();

    if (
        !response.ok
    ) {
        throw new Error(
            "currency_failed"
        );
    }

    const result = {
        ok:
            true,

        from:
            source,

        to:
            target,

        amount:
            data.amount,

        rate:
            data.rates &&
            data.rates[target],

        date:
            data.date,

        timestamp:
            now()
    };

    marketCache.set(
        key,
        {
            time:
                Date.now(),

            data:
                result
        }
    );

    return result;
}

async function getGold() {
    const key =
        "gold";

    const cached =
        marketCache.get(
            key
        );

    if (
        cached &&
        Date.now() -
            cached.time <
            15 * 60 * 1000
    ) {
        return cached.data;
    }

    try {
        const response =
            await fetchWithTimeout(
                "https://api.gold-api.com/price/XAU",
                {},
                12000
            );

        const data =
            await response.json();

        if (
            response.ok &&
            data &&
            data.price
        ) {
            const result = {
                ok:
                    true,

                provider:
                    "gold-api",

                xauUsd:
                    data.price,

                timestamp:
                    now()
            };

            marketCache.set(
                key,
                {
                    time:
                        Date.now(),

                    data:
                        result
                }
            );

            return result;
        }
    } catch {
        // fallback
    }

    return {
        ok:
            false,

        provider:
            "unavailable",

        xauUsd:
            null,

        message:
            "Altın sağlayıcısı şu anda veri döndürmedi."
    };
}

app.get(
    "/api/weather",
    async (
        req,
        res
    ) => {
        const city =
            safeString(
                req.query.city ||
                req.query.q
            );

        if (
            !city
        ) {
            return res.status(
                400
            ).json({
                ok:
                    false,

                error:
                    "city_required"
            });
        }

        try {
            return res.json(
                await getWeather(
                    city,
                    req.query.days
                )
            );
        } catch (
            error
        ) {
            return res.status(
                502
            ).json({
                ok:
                    false,

                error:
                    "weather_failed",

                message:
                    error.message
            });
        }
    }
);

app.get(
    "/api/currency",
    async (
        req,
        res
    ) => {
        try {
            return res.json(
                await getCurrency(
                    req.query.from ||
                        "TRY",
                    req.query.to ||
                        "USD"
                )
            );
        } catch (
            error
        ) {
            return res.status(
                502
            ).json({
                ok:
                    false,

                error:
                    "currency_failed",

                message:
                    error.message
            });
        }
    }
);

app.get(
    "/api/gold",
    async (
        req,
        res
    ) => {
        try {
            return res.json(
                await getGold()
            );
        } catch (
            error
        ) {
            return res.status(
                502
            ).json({
                ok:
                    false,

                error:
                    "gold_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// PART 6 / 10
// FILES + MEDIA
// ======================================================================

const uploadStorage =
    multer.diskStorage({
        destination:
            function (
                req,
                file,
                cb
            ) {
                cb(
                    null,
                    UPLOAD_DIR
                );
            },

        filename:
            function (
                req,
                file,
                cb
            ) {
                const ext =
                    path.extname(
                        file.originalname
                    );

                const name =
                    createId(
                        "upload"
                    ) +
                    ext;

                cb(
                    null,
                    name
                );
            }
    });

const upload =
    multer({
        storage:
            uploadStorage,

        limits: {
            fileSize:
                10 * 1024 * 1024
        }
    });

let fileIndex =
    readJSON(
        FILE_INDEX,
        {
            items:
                []
        }
    );

if (
    !fileIndex ||
    !Array.isArray(
        fileIndex.items
    )
) {
    fileIndex = {
        items:
            []
    };
}

function saveFileIndex() {
    writeJSON(
        FILE_INDEX,
        fileIndex
    );
}

app.post(
    "/api/upload",
    upload.single(
        "file"
    ),
    (
        req,
        res
    ) => {
        if (
            !req.file
        ) {
            return res.status(
                400
            ).json({
                ok:
                    false,

                error:
                    "file_required"
            });
        }

        runtime.uploads++;

        const userId =
            safeString(
                req.body &&
                req.body.userId ||
                "guest"
            );

        const item = {
            id:
                createId(
                    "file"
                ),

            userId,

            originalName:
                req.file.originalname,

            storedName:
                req.file.filename,

            mimeType:
                req.file.mimetype,

            size:
                req.file.size,

            path:
                req.file.path,

            createdAt:
                now()
        };

        fileIndex.items.push(
            item
        );

        if (
            fileIndex.items.length >
            5000
        ) {
            fileIndex.items =
                fileIndex.items.slice(
                    -5000
                );
        }

        saveFileIndex();

        return res.json({
            ok:
                true,

            success:
                true,

            file: {
                id:
                    item.id,

                name:
                    item.originalName,

                mimeType:
                    item.mimeType,

                size:
                    item.size
            }
        });
    }
);

app.get(
    "/api/files",
    (
        req,
        res
    ) => {
        const userId =
            safeString(
                req.query.userId ||
                "guest"
            );

        return res.json({
            ok:
                true,

            files:
                fileIndex.items
                    .filter(
                        item =>
                            item.userId ===
                            userId
                    )
                    .slice(
                        -200
                    )
        });
    }
);

app.get(
    "/api/files/:id",
    (
        req,
        res
    ) => {
        const item =
            fileIndex.items.find(
                file =>
                    file.id ===
                    req.params.id
            );

        if (
            !item ||
            !fs.existsSync(
                item.path
            )
        ) {
            return res.status(
                404
            ).json({
                ok:
                    false,

                error:
                    "file_not_found"
            });
        }

        return res.download(
            item.path,
            item.originalName
        );
    }
);

app.delete(
    "/api/files/:id",
    (
        req,
        res
    ) => {
        const index =
            fileIndex.items.findIndex(
                file =>
                    file.id ===
                    req.params.id
            );

        if (
            index ===
            -1
        ) {
            return res.status(
                404
            ).json({
                ok:
                    false,

                error:
                    "file_not_found"
            });
        }

        const item =
            fileIndex.items[
                index
            ];

        try {
            if (
                fs.existsSync(
                    item.path
                )
            ) {
                fs.unlinkSync(
                    item.path
                );
            }
        } catch {
            // ignore
        }

        fileIndex.items.splice(
            index,
            1
        );

        saveFileIndex();

        return res.json({
            ok:
                true
        });
    }
);

// ======================================================================
// PART 7 / 10
// TASKS + REMINDERS + SCHEDULER
// ======================================================================

let tasks =
    readJSON(
        path.join(
            TASK_DIR,
            "tasks.json"
        ),
        {
            items:
                []
        }
    );

if (
    !tasks ||
    !Array.isArray(
        tasks.items
    )
) {
    tasks = {
        items:
            []
    };
}

function saveTasks() {
    writeJSON(
        path.join(
            TASK_DIR,
            "tasks.json"
        ),
        tasks
    );
}

function createTask(
    input
) {
    const task = {
        id:
            createId(
                "task"
            ),

        userId:
            safeString(
                input.userId ||
                "guest"
            ),

        title:
            safeString(
                input.title ||
                input.message
            ),

        description:
            safeString(
                input.description
            ),

        type:
            safeString(
                input.type ||
                "task"
            ),

        dueAt:
            input.dueAt ||
            null,

        completed:
            false,

        createdAt:
            now(),

        completedAt:
            null
    };

    tasks.items.push(
        task
    );

    saveTasks();

    return task;
}

app.get(
    "/api/tasks",
    (
        req,
        res
    ) => {
        const userId =
            safeString(
                req.query.userId ||
                "guest"
            );

        return res.json({
            ok:
                true,

            tasks:
                tasks.items.filter(
                    task =>
                        task.userId ===
                        userId
                )
        });
    }
);

app.post(
    "/api/tasks",
    (
        req,
        res
    ) => {
        const body =
            req.body ||
            {};

        if (
            !body.title &&
            !body.message
        ) {
            return res.status(
                400
            ).json({
                ok:
                    false,

                error:
                    "title_required"
            });
        }

        const task =
            createTask(
                body
            );

        return res.json({
            ok:
                true,

            task
        });
    }
);

app.patch(
    "/api/tasks/:id",
    (
        req,
        res
    ) => {
        const task =
            tasks.items.find(
                item =>
                    item.id ===
                    req.params.id
            );

        if (
            !task
        ) {
            return res.status(
                404
            ).json({
                ok:
                    false,

                error:
                    "task_not_found"
            });
        }

        const body =
            req.body ||
            {};

        if (
            body.title !==
            undefined
        ) {
            task.title =
                safeString(
                    body.title
                );
        }

        if (
            body.description !==
            undefined
        ) {
            task.description =
                safeString(
                    body.description
                );
        }

        if (
            body.dueAt !==
            undefined
        ) {
            task.dueAt =
                body.dueAt;
        }

        if (
            body.completed !==
            undefined
        ) {
            task.completed =
                Boolean(
                    body.completed
                );

            task.completedAt =
                task.completed
                    ? now()
                    : null;
        }

        saveTasks();

        return res.json({
            ok:
                true,

            task
        });
    }
);

app.delete(
    "/api/tasks/:id",
    (
        req,
        res
    ) => {
        const index =
            tasks.items.findIndex(
                item =>
                    item.id ===
                    req.params.id
            );

        if (
            index ===
            -1
        ) {
            return res.status(
                404
            ).json({
                ok:
                    false,

                error:
                    "task_not_found"
            });
        }

        tasks.items.splice(
            index,
            1
        );

        saveTasks();

        return res.json({
            ok:
                true
        });
    }
);

function schedulerTick() {
    if (
        !settings.schedulerEnabled
    ) {
        return;
    }

    const current =
        Date.now();

    for (
        const task of tasks.items
    ) {
        if (
            task.completed ||
            !task.dueAt
        ) {
            continue;
        }

        const due =
            new Date(
                task.dueAt
            ).getTime();

        if (
            Number.isFinite(
                due
            ) &&
            due <=
                current
        ) {
            task.completed =
                true;

            task.completedAt =
                now();

            io.to(
                "user:" +
                task.userId
            ).emit(
                "task:due",
                task
            );
        }
    }

    saveTasks();
}

setInterval(
    schedulerTick,
    30000
);

// ======================================================================
// PART 8 / 10
// AUTH + PLANS + USAGE
// ======================================================================

let usersDB =
    readJSON(
        USERS_FILE,
        {
            items:
                []
        }
    );

let usageDB =
    readJSON(
        USAGE_FILE,
        {
            items:
                []
        }
    );

if (
    !usersDB ||
    !Array.isArray(
        usersDB.items
    )
) {
    usersDB = {
        items:
            []
    };
}

if (
    !usageDB ||
    !Array.isArray(
        usageDB.items
    )
) {
    usageDB = {
        items:
            []
    };
}

const plansDB = {
    free: {
        name:
            "Free",

        monthlyLimit:
            LIMITS.free,

        price:
            PRICES.free,

        image:
            false,

        video:
            false
    },

    pro: {
        name:
            "Pro",

        monthlyLimit:
            LIMITS.pro,

        price:
            PRICES.pro,

        image:
            true,

        video:
            false
    },

    plus: {
        name:
            "Plus",

        monthlyLimit:
            LIMITS.plus,

        price:
            PRICES.plus,

        image:
            true,

        video:
            true
    },

    ultra: {
        name:
            "Ultra",

        monthlyLimit:
            LIMITS.ultra,

        price:
            PRICES.ultra,

        image:
            true,

        video:
            true
    },

    developer: {
        name:
            "Developer",

        monthlyLimit:
            LIMITS.developer,

        price:
            0,

        image:
            true,

        video:
            true
    }
};

function saveUsers() {
    writeJSON(
        USERS_FILE,
        usersDB
    );
}

function saveUsage() {
    writeJSON(
        USAGE_FILE,
        usageDB
    );
}

function monthKey() {
    const date =
        new Date();

    return (
        date.getUTCFullYear() +
        "-" +
        String(
            date.getUTCMonth() + 1
        ).padStart(
            2,
            "0"
        )
    );
}

function findUser(
    userId
) {
    return usersDB.items.find(
        item =>
            item.id ===
            userId
    );
}

function getUser(
    userId
) {
    let user =
        findUser(
            userId
        );

    if (
        !user
    ) {
        user = {
            id:
                userId,

            plan:
                "free",

            name:
                "Guest",

            email:
                null,

            createdAt:
                now(),

            lastSeenAt:
                now()
        };

        usersDB.items.push(
            user
        );

        saveUsers();
    }

    user.lastSeenAt =
        now();

    return user;
}

function getUsage(
    userId
) {
    const key =
        monthKey();

    let entry =
        usageDB.items.find(
            item =>
                item.userId ===
                    userId &&
                item.month ===
                    key
        );

    if (
        !entry
    ) {
        entry = {
            userId,
            month:
                key,

            requests:
                0
        };

        usageDB.items.push(
            entry
        );
    }

    return entry;
}

function canUseAI(
    userId
) {
    const user =
        getUser(
            userId
        );

    const usage =
        getUsage(
            user.id
        );

    const plan =
        plansDB[
            user.plan
        ] ||
        plansDB.free;

    return {
        allowed:
            usage.requests <
            plan.monthlyLimit,

        used:
            usage.requests,

        limit:
            plan.monthlyLimit,

        plan:
            user.plan
    };
}

function incrementUsage(
    userId
) {
    const usage =
        getUsage(
            userId
        );

    usage.requests++;

    saveUsage();
}

app.get(
    "/api/plans",
    (
        req,
        res
    ) => {
        return res.json({
            ok:
                true,

            plans:
                plansDB
        });
    }
);

app.get(
    "/api/account",
    (
        req,
        res
    ) => {
        const userId =
            safeString(
                req.query.userId ||
                "guest"
            );

        const user =
            getUser(
                userId
            );

        return res.json({
            ok:
                true,

            user,

            usage:
                getUsage(
                    userId
                ),

            plan:
                plansDB[
                    user.plan
                ] ||
                plansDB.free
        });
    }
);

app.post(
    "/api/account/login",
    (
        req,
        res
    ) => {
        const body =
            req.body ||
            {};

        const id =
            safeString(
                body.userId ||
                body.googleId ||
                createId(
                    "user"
                )
            );

        const user =
            getUser(
                id
            );

        if (
            body.name
        ) {
            user.name =
                safeString(
                    body.name
                );
        }

        if (
            body.email
        ) {
            user.email =
                safeString(
                    body.email
                );
        }

        saveUsers();

        return res.json({
            ok:
                true,

            user
        });
    }
);

app.post(
    "/api/usage/increment",
    (
        req,
        res
    ) => {
        const userId =
            safeString(
                req.body &&
                req.body.userId ||
                "guest"
            );

        const state =
            canUseAI(
                userId
            );

        if (
            !state.allowed
        ) {
            return res.status(
                429
            ).json({
                ok:
                    false,

                error:
                    "usage_limit_reached",

                ...state
            });
        }

        incrementUsage(
            userId
        );

        return res.json({
            ok:
                true,

            usage:
                getUsage(
                    userId
                )
        });
    }
);

app.post(
    "/api/pro/activate",
    (
        req,
        res
    ) => {
        const body =
            req.body ||
            {};

        const userId =
            safeString(
                body.userId ||
                "guest"
            );

        const code =
            safeString(
                body.code
            );

        const expected =
            safeString(
                process.env.TURKAI_PRO_CODE
            );

        if (
            !expected ||
            code !==
                expected
        ) {
            return res.status(
                403
            ).json({
                ok:
                    false,

                error:
                    "invalid_code"
            });
        }

        const user =
            getUser(
                userId
            );

        user.plan =
            "pro";

        saveUsers();

        return res.json({
            ok:
                true,

            success:
                true,

            plan:
                "pro",

            user
        });
    }
);

app.post(
    "/api/account/plan",
    (
        req,
        res
    ) => {
        const body =
            req.body ||
            {};

        const userId =
            safeString(
                body.userId ||
                "guest"
            );

        const plan =
            safeString(
                body.plan ||
                "free"
            ).toLowerCase();

        if (
            !plansDB[
                plan
            ]
        ) {
            return res.status(
                400
            ).json({
                ok:
                    false,

                error:
                    "invalid_plan"
            });
        }

        const user =
            getUser(
                userId
            );

        user.plan =
            plan;

        saveUsers();

        return res.json({
            ok:
                true,

            user,

            plan:
                plansDB[
                    plan
                ]
        });
    }
);

// ======================================================================
// PART 9 / 10
// CONVERSATIONS + VAULT + CODING STUDIO
// ======================================================================

const conversationsIndex =
    path.join(
        CONVERSATION_DIR,
        "index.json"
    );

let conversationDB =
    readJSON(
        conversationsIndex,
        {
            items:
                []
        }
    );

if (
    !conversationDB ||
    !Array.isArray(
        conversationDB.items
    )
) {
    conversationDB = {
        items:
            []
    };
}

function saveConversationIndex() {
    writeJSON(
        conversationsIndex,
        conversationDB
    );
}

app.post(
    "/api/conversations",
    (
        req,
        res
    ) => {
        const body =
            req.body ||
            {};

        const userId =
            safeString(
                body.userId ||
                "guest"
            );

        const conversation = {
            id:
                createId(
                    "conv"
                ),

            userId,

            title:
                safeString(
                    body.title ||
                    "Yeni sohbet"
                ),

            pinned:
                false,

            favorite:
                false,

            archived:
                false,

            createdAt:
                now(),

            updatedAt:
                now()
        };

        conversationDB.items.push(
            conversation
        );

        saveConversationIndex();

        return res.json({
            ok:
                true,

            conversation
        });
    }
);

app.get(
    "/api/conversations",
    (
        req,
        res
    ) => {
        const userId =
            safeString(
                req.query.userId ||
                "guest"
            );

        return res.json({
            ok:
                true,

            items:
                conversationDB.items
                    .filter(
                        item =>
                            item.userId ===
                            userId
                    )
                    .sort(
                        (
                            a,
                            b
                        ) =>
                            String(
                                b.updatedAt
                            ).localeCompare(
                                String(
                                    a.updatedAt
                                )
                            )
                    )
        });
    }
);

app.patch(
    "/api/conversations/:id",
    (
        req,
        res
    ) => {
        const conversation =
            conversationDB.items.find(
                item =>
                    item.id ===
                    req.params.id
            );

        if (
            !conversation
        ) {
            return res.status(
                404
            ).json({
                ok:
                    false,

                error:
                    "conversation_not_found"
            });
        }

        const body =
            req.body ||
            {};

        if (
            body.title !==
            undefined
        ) {
            conversation.title =
                safeString(
                    body.title
                );
        }

        if (
            body.pinned !==
            undefined
        ) {
            conversation.pinned =
                Boolean(
                    body.pinned
                );
        }

        if (
            body.favorite !==
            undefined
        ) {
            conversation.favorite =
                Boolean(
                    body.favorite
                );
        }

        if (
            body.archived !==
            undefined
        ) {
            conversation.archived =
                Boolean(
                    body.archived
                );
        }

        conversation.updatedAt =
            now();

        saveConversationIndex();

        return res.json({
            ok:
                true,

            conversation
        });
    }
);

app.delete(
    "/api/conversations/:id",
    (
        req,
        res
    ) => {
        const index =
            conversationDB.items.findIndex(
                item =>
                    item.id ===
                    req.params.id
            );

        if (
            index ===
            -1
        ) {
            return res.status(
                404
            ).json({
                ok:
                    false,

                error:
                    "conversation_not_found"
            });
        }

        conversationDB.items.splice(
            index,
            1
        );

        saveConversationIndex();

        return res.json({
            ok:
                true
        });
    }
);

app.get(
    "/api/conversations/:userId/search",
    (
        req,
        res
    ) => {
        const userId =
            safeString(
                req.params.userId
            );

        const q =
            normalizeText(
                req.query.q
            );

        const results =
            conversationDB.items.filter(
                item =>
                    item.userId ===
                        userId &&
                    (
                        !q ||
                        normalizeText(
                            item.title
                        ).includes(
                            q
                        )
                    )
            );

        return res.json({
            ok:
                true,

            items:
                results
        });
    }
);

// CODING STUDIO

const LANGUAGE_INFO = {
    javascript: {
        extension:
            "js"
    },

    python: {
        extension:
            "py"
    },

    html: {
        extension:
            "html"
    },

    css: {
        extension:
            "css"
    },

    java: {
        extension:
            "java"
    },

    csharp: {
        extension:
            "cs"
    },

    cpp: {
        extension:
            "cpp"
    },

    typescript: {
        extension:
            "ts"
    },

    json: {
        extension:
            "json"
    },

    sql: {
        extension:
            "sql"
    }
};

function detectLanguage(
    code
) {
    const text =
        safeString(
            code
        );

    if (
        /<html|<!doctype|<body/i.test(
            text
        )
    ) {
        return "html";
    }

    if (
        /function |console\.log|const |let |=>/i.test(
            text
        )
    ) {
        return "javascript";
    }

    if (
        /def |import |print\(/i.test(
            text
        )
    ) {
        return "python";
    }

    if (
        /SELECT |INSERT |UPDATE |CREATE TABLE/i.test(
            text
        )
    ) {
        return "sql";
    }

    return "javascript";
}

function basicCodeAnalysis(
    code,
    language
) {
    const errors =
        [];

    const warnings =
        [];

    if (
        !code.trim()
    ) {
        warnings.push(
            "Kod boş."
        );
    }

    if (
        language ===
        "javascript"
    ) {
        const opens =
            (
                code.match(
                    /{/g
                ) || []
            ).length;

        const closes =
            (
                code.match(
                    /}/g
                ) || []
            ).length;

        if (
            opens !==
            closes
        ) {
            errors.push(
                "Süslü parantez sayısı uyuşmuyor."
            );
        }
    }

    if (
        language ===
        "json"
    ) {
        try {
            JSON.parse(
                code
            );
        } catch (
            error
        ) {
            errors.push(
                error.message
            );
        }
    }

    return {
        ok:
            errors.length ===
            0,

        language,

        errors,

        warnings
    };
}

app.post(
    "/api/coding/analyze",
    (
        req,
        res
    ) => {
        const body =
            req.body ||
            {};

        const code =
            safeString(
                body.code
            );

        const language =
            safeString(
                body.language ||
                detectLanguage(
                    code
                )
            ).toLowerCase();

        return res.json(
            basicCodeAnalysis(
                code,
                language
            )
        );
    }
);

app.post(
    "/api/coding/generate",
    async (
        req,
        res
    ) => {
        const body =
            req.body ||
            {};

        const prompt =
            safeString(
                body.prompt ||
                body.description
            );

        const language =
            safeString(
                body.language ||
                "javascript"
            );

        if (
            !prompt
        ) {
            return res.status(
                400
            ).json({
                ok:
                    false,

                error:
                    "prompt_required"
            });
        }

        try {
            const result =
                await askProviders([
                    {
                        role:
                            "system",

                        content:
                            "Sen TürkAI Coding Studio'sun. İstenen programı sadece gerekli açıklamayla birlikte temiz ve çalışabilir kod olarak üret."
                    },

                    {
                        role:
                            "user",

                        content:
                            `Dil: ${language}\nİstek: ${prompt}`
                    }
                ]);

            if (
                result.ok
            ) {
                return res.json({
                    ok:
                        true,

                    language,

                    answer:
                        result.answer,

                    provider:
                        result.provider
                });
            }

            return res.json({
                ok:
                    true,

                language,

                answer:
                    `// TürkAI Coding Studio\n// İstek: ${prompt}\n\n// AI sağlayıcısı bağlı olmadığı için yerel şablon döndürüldü.`,
                
                provider:
                    "local"
            });
        } catch (
            error
        ) {
            return res.status(
                500
            ).json({
                ok:
                    false,

                error:
                    "code_generation_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// PART 10 / 10
// SOCKET + ADMIN + HEALTH + FRONTEND + STARTUP
// ======================================================================

// SOCKET.IO

io.on(
    "connection",
    socket => {
        runtime.websocketConnections++;

        const userId =
            safeString(
                socket.handshake &&
                socket.handshake.auth &&
                socket.handshake.auth.userId ||
                socket.handshake &&
                socket.handshake.query &&
                socket.handshake.query.userId ||
                "guest"
            );

        runtime.activeUsers.add(
            userId
        );

        socket.join(
            "user:" +
            userId
        );

        socket.emit(
            "server:hello",
            {
                server:
                    SERVER_INFO,

                userId,

                time:
                    now()
            }
        );

        socket.on(
            "ping",
            () => {
                socket.emit(
                    "pong",
                    {
                        time:
                            now()
                    }
                );
            }
        );

        socket.on(
            "join:user",
            id => {
                const target =
                    safeString(
                        id ||
                        userId
                    );

                socket.join(
                    "user:" +
                    target
                );
            }
        );

        socket.on(
            "disconnect",
            () => {
                runtime.activeUsers.delete(
                    userId
                );
            }
        );
    }
);

// ROOT HEALTH

app.get(
    "/api/health",
    (
        req,
        res
    ) => {
        return res.json({
            ok:
                true,

            status:
                "ready",

            server:
                SERVER_INFO,

            uptimeSeconds:
                Math.floor(
                    (
                        Date.now() -
                        runtime.bootTime
                    ) / 1000
                ),

            runtime: {
                requests:
                    runtime.requests,

                chatRequests:
                    runtime.chatRequests,

                researchRequests:
                    runtime.researchRequests,

                uploads:
                    runtime.uploads,

                errors:
                    runtime.errors,

                websocketConnections:
                    runtime.websocketConnections,

                activeUsers:
                    runtime.activeUsers.size
            },

            providers:
                getProviderStatus(),

            settings
        });
    }
);

app.get(
    "/api/system/status",
    (
        req,
        res
    ) => {
        return res.json({
            status:
                "ready",

            ok:
                true,

            server: {
                name:
                    SERVER_INFO.name,

                version:
                    SERVER_INFO.version,

                pid:
                    process.pid,

                uptimeSeconds:
                    process.uptime(),

                node:
                    process.version,

                platform:
                    process.platform,

                architecture:
                    process.arch,

                timestamp:
                    now()
            },

            modules: {
                core:
                    true,

                answerMemory:
                    true,

                chat:
                    true,

                research:
                    settings.researchEnabled,

                weather:
                    settings.weatherEnabled,

                currency:
                    settings.currencyEnabled,

                gold:
                    settings.goldEnabled,

                files:
                    settings.fileUploadEnabled,

                tasks:
                    settings.schedulerEnabled,

                accounts:
                    true,

                coding:
                    settings.codingEnabled,

                socket:
                    true,

                frontend:
                    true
            },

            filesystem: {
                data:
                    fs.existsSync(
                        DATA_DIR
                    ),

                memory:
                    fs.existsSync(
                        MEMORY_DIR
                    ),

                conversations:
                    fs.existsSync(
                        CONVERSATION_DIR
                    ),

                research:
                    fs.existsSync(
                        RESEARCH_DIR
                    ),

                uploads:
                    fs.existsSync(
                        UPLOAD_DIR
                    ),

                tasks:
                    fs.existsSync(
                        TASK_DIR
                    ),

                accounts:
                    fs.existsSync(
                        ACCOUNT_DIR
                    )
            },

            providers:
                getProviderStatus()
        });
    }
);

// DIAGNOSTICS

app.get(
    "/api/diagnostics",
    (
        req,
        res
    ) => {
        return res.json({
            ok:
                true,

            server:
                SERVER_INFO,

            memoryCount:
                memoryDB.items.length,

            knowledgeCount:
                knowledgeDB.items.length,

            usersCount:
                usersDB.items.length,

            tasksCount:
                tasks.items.length,

            filesCount:
                fileIndex.items.length,

            conversationsCount:
                conversationDB.items.length,

            researchCacheCount:
                researchCache.size,

            providers:
                getProviderStatus()
        });
    }
);

// ADMIN

function isAdmin(
    req
) {
    const adminKey =
        safeString(
            process.env.TURKAI_ADMIN_KEY
        );

    if (
        !adminKey
    ) {
        return false;
    }

    const supplied =
        safeString(
            req.headers[
                "x-admin-key"
            ] ||
            req.body &&
            req.body.adminKey ||
            req.query.adminKey
        );

    return (
        supplied ===
        adminKey
    );
}

app.get(
    "/api/admin/stats",
    (
        req,
        res
    ) => {
        if (
            !isAdmin(
                req
            )
        ) {
            return res.status(
                403
            ).json({
                ok:
                    false,

                error:
                    "admin_required"
            });
        }

        return res.json({
            ok:
                true,

            runtime: {
                requests:
                    runtime.requests,

                chatRequests:
                    runtime.chatRequests,

                researchRequests:
                    runtime.researchRequests,

                uploads:
                    runtime.uploads,

                errors:
                    runtime.errors,

                websocketConnections:
                    runtime.websocketConnections,

                activeUsers:
                    runtime.activeUsers.size
            },

            databases: {
                memory:
                    memoryDB.items.length,

                knowledge:
                    knowledgeDB.items.length,

                users:
                    usersDB.items.length,

                files:
                    fileIndex.items.length,

                tasks:
                    tasks.items.length,

                conversations:
                    conversationDB.items.length
            },

            providers:
                getProviderStatus()
        });
    }
);

// SETTINGS

app.get(
    "/api/settings",
    (
        req,
        res
    ) => {
        return res.json({
            ok:
                true,

            settings
        });
    }
);

app.post(
    "/api/settings",
    (
        req,
        res
    ) => {
        if (
            !isAdmin(
                req
            )
        ) {
            return res.status(
                403
            ).json({
                ok:
                    false,

                error:
                    "admin_required"
            });
        }

        const body =
            req.body ||
            {};

        for (
            const key of Object.keys(
                defaultSettings
            )
        ) {
            if (
                body[key] !==
                undefined
            ) {
                settings[key] =
                    Boolean(
                        body[key]
                    );
            }
        }

        writeJSON(
            SETTINGS_FILE,
            settings
        );

        return res.json({
            ok:
                true,

            settings
        });
    }
);

// SIMPLE API TEST

app.get(
    "/api/test",
    (
        req,
        res
    ) => {
        return res.json({
            ok:
                true,

            message:
                "TürkAI Master Server çalışıyor.",

            time:
                now()
        });
    }
);

// ======================================================================
// FRONTEND SERVING
// BU KISIM 404'TEN ÖNCE.
// ======================================================================

app.use(
    express.static(
        ROOT_DIR,
        {
            index:
                "index.html",

            extensions: [
                "html"
            ]
        }
    )
);

app.get(
    "/",
    (
        req,
        res
    ) => {
        const indexFile =
            path.join(
                ROOT_DIR,
                "index.html"
            );

        if (
            fs.existsSync(
                indexFile
            )
        ) {
            return res.sendFile(
                indexFile
            );
        }

        return res.type(
            "html"
        ).send(
            `
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TürkAI</title>
<style>
body{
    margin:0;
    min-height:100vh;
    display:flex;
    align-items:center;
    justify-content:center;
    background:#090b10;
    color:#fff;
    font-family:Arial,sans-serif;
}
.box{
    padding:30px;
    border:1px solid #222;
    border-radius:20px;
    background:#11151d;
    text-align:center;
}
</style>
</head>
<body>
<div class="box">
<h1>TürkAI</h1>
<p>Master Server çalışıyor.</p>
<p>Frontend için index.html ekleyebilirsin.</p>
</div>
</body>
</html>
            `
        );
    }
);

// ======================================================================
// 404
// GERÇEK GENEL 404 SADECE EN SONDA.
// ======================================================================

app.use(
    (
        req,
        res
    ) => {
        return res.status(
            404
        ).json({
            ok:
                false,

            success:
                false,

            error:
                "not_found",

            path:
                req.originalUrl,

            method:
                req.method,

            message:
                "TürkAI endpoint bulunamadı."
        });
    }
);

// ======================================================================
// GLOBAL ERROR HANDLER
// ======================================================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {
        runtime.errors++;

        console.error(
            "[GLOBAL ERROR]",
            error
        );

        if (
            res.headersSent
        ) {
            return next(
                error
            );
        }

        return res.status(
            500
        ).json({
            ok:
                false,

            error:
                "internal_server_error",

            message:
                process.env.NODE_ENV ===
                "production"
                    ? "Sunucu hatası."
                    : error.message
        });
    }
);

// ======================================================================
// STARTUP
// ======================================================================

function startupLog() {
    console.log(
        "=============================================================="
    );

    console.log(
        "TürkAI Master Server 50.0"
    );

    console.log(
        "Temiz mimari başlatılıyor..."
    );

    console.log(
        "=============================================================="
    );

    console.log(
        "[PART 1] Core + Storage: AKTİF"
    );

    console.log(
        "[PART 2] AI Providers:"
    );

    console.log(
        "  Groq:",
        AI_CONFIG.groq.enabled
            ? "AKTİF"
            : "PASİF"
    );

    console.log(
        "  Cerebras:",
        AI_CONFIG.cerebras.enabled
            ? "AKTİF"
            : "PASİF"
    );

    console.log(
        "  Gemini:",
        AI_CONFIG.gemini.enabled
            ? "AKTİF"
            : "PASİF"
    );

    console.log(
        "  OpenRouter:",
        AI_CONFIG.openrouter.enabled
            ? "AKTİF"
            : "PASİF"
    );

    console.log(
        "  Local:",
        "AKTİF"
    );

    console.log(
        "[PART 3] AnswerMemory: AKTİF"
    );

    console.log(
        "[PART 4] Internet Research:",
        settings.researchEnabled
            ? "AKTİF"
            : "PASİF"
    );

    console.log(
        "[PART 5] Weather/Currency/Gold: AKTİF"
    );

    console.log(
        "[PART 6] Files/Upload: AKTİF"
    );

    console.log(
        "[PART 7] Tasks/Scheduler: AKTİF"
    );

    console.log(
        "[PART 8] Auth/Plans/Usage: AKTİF"
    );

    console.log(
        "[PART 9] Conversations/Coding: AKTİF"
    );

    console.log(
        "[PART 10] Socket/Frontend/Health: AKTİF"
    );

    console.log(
        "=============================================================="
    );

    console.log(
        "ROOT:",
        ROOT_DIR
    );

    console.log(
        "PORT:",
        PORT
    );

    console.log(
        "NODE:",
        process.version
    );

    console.log(
        "=============================================================="
    );
}

httpServer.on(
    "error",
    error => {
        console.error(
            "[SERVER ERROR]",
            error.message
        );

        if (
            error.code ===
            "EADDRINUSE"
        ) {
            console.error(
                `Port ${PORT} zaten kullanılıyor.`
            );
        }
    }
);

process.on(
    "uncaughtException",
    error => {
        runtime.errors++;

        console.error(
            "[UNCAUGHT EXCEPTION]",
            error
        );
    }
);

process.on(
    "unhandledRejection",
    reason => {
        runtime.errors++;

        console.error(
            "[UNHANDLED REJECTION]",
            reason
        );
    }
);

startupLog();

httpServer.listen(
    PORT,
    HOST,
    () => {
        console.log(
            "=============================================================="
        );

        console.log(
            "🔥 TÜRKAI MASTER SERVER HAZIR 🔥"
        );

        console.log(
            "HTTP:",
            `http://localhost:${PORT}`
        );

        console.log(
            "Health:",
            `http://localhost:${PORT}/api/health`
        );

        console.log(
            "System:",
            `http://localhost:${PORT}/api/system/status`
        );

        console.log(
            "Test:",
            `http://localhost:${PORT}/api/test`
        );

        console.log(
            "=============================================================="
        );
    }
);
/*
========================================================================
 TÜRKAI MASTER SERVER 50.0
 PART 2 / 10
 AI PROVIDERS + MODEL ROUTER + FALLBACK ENGINE
========================================================================
*/

"use strict";

// ======================================================================
// 2.0 — AI SYSTEM CONFIG
// ======================================================================

const AI_SYSTEM_CONFIG = {
    enabled:
        true,

    providerTimeout:
        30000,

    maxTokens:
        3000,

    temperature:
        0.70,

    retries:
        1,

    preferredProvider:
        process.env.TURKAI_PREFERRED_PROVIDER ||
        "groq",

    fallbackToLocal:
        true,

    saveDiagnostics:
        true,

    allowResearchContext:
        true,

    allowMemoryContext:
        true,

    allowConversationContext:
        true
};

// ======================================================================
// 2.1 — PROVIDER CONFIGURATION
// ======================================================================

const AI_PROVIDERS = {

    groq: {
        name:
            "Groq",

        enabled:
            Boolean(
                process.env.GROQ_API_KEY
            ),

        apiKey:
            process.env.GROQ_API_KEY ||
            "",

        endpoint:
            process.env.GROQ_API_URL ||
            "https://api.groq.com/openai/v1/chat/completions",

        model:
            process.env.GROQ_MODEL ||
            "openai/gpt-oss-20b",

        type:
            "openai-compatible",

        priority:
            1
    },

    cerebras: {
        name:
            "Cerebras",

        enabled:
            Boolean(
                process.env.CEREBRAS_API_KEY
            ),

        apiKey:
            process.env.CEREBRAS_API_KEY ||
            "",

        endpoint:
            process.env.CEREBRAS_API_URL ||
            "https://api.cerebras.ai/v1/chat/completions",

        model:
            process.env.CEREBRAS_MODEL ||
            "gpt-oss-120b",

        type:
            "openai-compatible",

        priority:
            2
    },

    gemini: {
        name:
            "Google Gemini",

        enabled:
            Boolean(
                process.env.GEMINI_API_KEY
            ),

        apiKey:
            process.env.GEMINI_API_KEY ||
            "",

        endpoint:
            process.env.GEMINI_API_URL ||
            "https://generativelanguage.googleapis.com/v1beta/models",

        model:
            process.env.GEMINI_MODEL ||
            "gemini-2.5-flash",

        type:
            "gemini",

        priority:
            3
    },

    openrouter: {
        name:
            "OpenRouter",

        enabled:
            Boolean(
                process.env.OPENROUTER_API_KEY
            ),

        apiKey:
            process.env.OPENROUTER_API_KEY ||
            "",

        endpoint:
            process.env.OPENROUTER_API_URL ||
            "https://openrouter.ai/api/v1/chat/completions",

        model:
            process.env.OPENROUTER_MODEL ||
            "openai/gpt-oss-20b:free",

        type:
            "openai-compatible",

        priority:
            4
    },

    local: {
        name:
            "TürkAI Local Engine",

        enabled:
            true,

        apiKey:
            "",

        endpoint:
            "",

        model:
            "turkai-local-50",

        type:
            "local",

        priority:
            99
    }
};

// ======================================================================
// 2.2 — PROVIDER RUNTIME
// ======================================================================

const AI_RUNTIME = {

    totalRequests:
        0,

    successfulRequests:
        0,

    failedRequests:
        0,

    localFallbacks:
        0,

    providerFailures:
        0,

    providerUsage:
        {},

    lastProvider:
        null,

    lastModel:
        null,

    lastRequestAt:
        null,

    lastSuccessAt:
        null,

    lastErrorAt:
        null,

    lastError:
        null,

    history:
        []
};

for (
    const providerName of Object.keys(
        AI_PROVIDERS
    )
) {
    AI_RUNTIME.providerUsage[
        providerName
    ] = {
        requests:
            0,

        successes:
            0,

        failures:
            0,

        lastUsedAt:
            null,

        lastError:
            null
    };
}

// ======================================================================
// 2.3 — PROVIDER STATUS
// ======================================================================

function getAIProviderStatus2() {

    const result = {};

    for (
        const [
            providerName,
            provider
        ]
        of Object.entries(
            AI_PROVIDERS
        )
    ) {

        result[
            providerName
        ] = {
            name:
                provider.name,

            enabled:
                Boolean(
                    provider.enabled
                ),

            configured:
                Boolean(
                    provider.apiKey
                ) ||
                provider.type ===
                    "local",

            model:
                provider.model,

            type:
                provider.type,

            priority:
                provider.priority,

            requests:
                AI_RUNTIME
                    .providerUsage[
                        providerName
                    ]
                    .requests,

            successes:
                AI_RUNTIME
                    .providerUsage[
                        providerName
                    ]
                    .successes,

            failures:
                AI_RUNTIME
                    .providerUsage[
                        providerName
                    ]
                    .failures
        };
    }

    return result;
}

// ======================================================================
// 2.4 — COMMON UTILS
// ======================================================================

function aiSafeString2(
    value,
    fallback = ""
) {

    if (
        value ===
            null ||
        value ===
            undefined
    ) {
        return fallback;
    }

    return String(
        value
    ).trim();
}

function aiNormalizeText2(
    value
) {

    return aiSafeString2(
        value
    )
        .toLocaleLowerCase(
            "tr-TR"
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function aiNow2() {
    return new Date()
        .toISOString();
}

function aiCreateTraceId2() {

    return (
        "ai_" +
        Date.now().toString(
            36
        ) +
        "_" +
        crypto
            .randomBytes(
                5
            )
            .toString(
                "hex"
            )
    );
}

// ======================================================================
// 2.5 — FETCH WITH TIMEOUT
// ======================================================================

async function aiFetch2(
    url,
    options = {},
    timeout =
        AI_SYSTEM_CONFIG.providerTimeout
) {

    const controller =
        new AbortController();

    const timeoutId =
        setTimeout(
            () => {
                controller.abort();
            },
            timeout
        );

    try {

        return await fetch(
            url,
            {
                ...options,

                signal:
                    controller.signal
            }
        );

    } finally {

        clearTimeout(
            timeoutId
        );
    }
}

// ======================================================================
// 2.6 — RETRY ENGINE
// ======================================================================

async function aiRetry2(
    operation,
    retries =
        AI_SYSTEM_CONFIG.retries
) {

    let lastError =
        null;

    for (
        let attempt = 0;
        attempt <= retries;
        attempt++
    ) {

        try {

            return await operation(
                attempt
            );

        } catch (
            error
        ) {

            lastError =
                error;

            if (
                attempt >=
                retries
            ) {
                break;
            }

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        400 +
                        attempt *
                            700
                    )
            );
        }
    }

    throw (
        lastError ||
        new Error(
            "ai_operation_failed"
        )
    );
}

// ======================================================================
// 2.7 — MESSAGE SANITIZER
// ======================================================================

function sanitizeAIMessage2(
    item
) {

    if (
        !item ||
        typeof item !==
            "object"
    ) {
        return null;
    }

    let role =
        aiSafeString2(
            item.role,
            "user"
        );

    let content =
        item.content;

    if (
        Array.isArray(
            content
        )
    ) {

        content =
            content
                .map(
                    part => {

                        if (
                            typeof part ===
                                "string"
                        ) {
                            return part;
                        }

                        if (
                            part &&
                            typeof part.text ===
                                "string"
                        ) {
                            return part.text;
                        }

                        return "";
                    }
                )
                .filter(Boolean)
                .join(
                    "\n"
                );
    }

    content =
        aiSafeString2(
            content
        );

    if (
        !content
    ) {
        return null;
    }

    if (
        ![
            "system",
            "user",
            "assistant"
        ].includes(
            role
        )
    ) {
        role =
            "user";
    }

    return {
        role,
        content
    };
}

function sanitizeAIMessages2(
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
            sanitizeAIMessage2
        )
        .filter(
            Boolean
        );
}

// ======================================================================
// 2.8 — SYSTEM PROMPT
// ======================================================================

function getTurkAISystemPrompt2(
    options = {}
) {

    const language =
        aiSafeString2(
            options.language,
            "tr"
        );

    const userName =
        aiSafeString2(
            options.userName,
            ""
        );

    const memory =
        aiSafeString2(
            options.memoryContext,
            ""
        );

    const research =
        aiSafeString2(
            options.researchContext,
            ""
        );

    const conversation =
        aiSafeString2(
            options.conversationContext,
            ""
        );

    return `
Sen TürkAI'sın.

Temel davranış:
- Öncelikli dil Türkçedir.
- Kullanıcı başka dil kullanırsa o dilde cevap verebilirsin.
- Cevapları doğal, anlaşılır ve doğrudan ver.
- Gereksiz tekrar yapma.
- Kullanıcı kod isterse kodu bozmadan ve eksiksiz üret.
- Teknik konularda mümkün olduğunca uygulanabilir çözüm ver.
- Güncel bilgilerde araştırma bağlamını dikkate al.
- Hafıza bilgisini yalnızca soruyla gerçekten ilişkiliyse kullan.
- Kullanıcının istemediği bilgileri uydurma.
- Bilgi kesin değilse bunu açıkça belirt.
- Aynı soruya gereksiz yere uzun cevap verme.
- Kod bloklarında geçerli sözdizimine dikkat et.
- TürkAI projesinin adını TürkAI olarak kullan.

Kullanıcı dili:
${language}

Kullanıcı adı:
${userName || "belirtilmedi"}

${memory
    ? `
HAFIZA BAĞLAMI:
${memory}
`
    : ""}

${research
    ? `
ARAŞTIRMA BAĞLAMI:
${research}
`
    : ""}

${conversation
    ? `
ÖNCEKİ KONUŞMA:
${conversation}
`
    : ""}
`.trim();
}

// ======================================================================
// 2.9 — LOCAL ENGINE
// ======================================================================

const LOCAL_RESPONSE_RULES_2 = [

    {
        patterns: [
            /^selam$/i,
            /^merhaba$/i,
            /^mrb$/i,
            /^slm$/i,
            /^hey$/i
        ],

        answer:
            "Selam! TürkAI burada. Ne yapmak istiyorsun?"
    },

    {
        patterns: [
            /^en hızlı kim\??$/i
        ],

        answer:
            "TürkAI ⚡🤖"
    },

    {
        patterns: [
            /^nasılsın\??$/i,
            /^naber\??$/i,
            /^nasılsın knk\??$/i
        ],

        answer:
            "İyiyim knk 😄 TürkAI çalışıyor."
    },

    {
        patterns: [
            /^teşekkürler$/i,
            /^teşekkür ederim$/i,
            /^sağol$/i,
            /^sağ ol$/i
        ],

        answer:
            "Rica ederim!"
    },

    {
        patterns: [
            /ne yapabiliyorsun/i
        ],

        answer:
            "Kod yazabilir, soruları yanıtlayabilir, hafıza kullanabilir, internet araştırması yapabilir ve çeşitli sistem araçlarını çalıştırabilirim."
    },

    {
        patterns: [
            /kimsin/i,
            /sen nesin/i
        ],

        answer:
            "Ben TürkAI. Türkçe odaklı yapay zekâ asistanıyım."
    },

    {
        patterns: [
            /hangi yapay zekasın/i,
            /hangi ai/i
        ],

        answer:
            "Ben TürkAI."
    }

];

// ======================================================================
// 2.10 — LOCAL KNOWLEDGE HELPERS
// ======================================================================

function findLocalRuleAnswer2(
    message
) {

    const clean =
        aiNormalizeText2(
            message
        );

    for (
        const rule
        of LOCAL_RESPONSE_RULES_2
    ) {

        for (
            const pattern
            of rule.patterns
        ) {

            if (
                pattern.test(
                    clean
                )
            ) {

                return {
                    found:
                        true,

                    answer:
                        rule.answer,

                    source:
                        "local-rule",

                    confidence:
                        1
                };
            }
        }
    }

    return {
        found:
            false,

        answer:
            null,

        source:
            null,

        confidence:
            0
    };
}

// ======================================================================
// 2.11 — SMART LOCAL FALLBACK
// ======================================================================

function generateLocalFallback2(
    message,
    options = {}
) {

    const text =
        aiNormalizeText2(
            message
        );

    const lower =
        text;

    const isCoding =
        [
            "kod",
            "javascript",
            "python",
            "html",
            "css",
            "java",
            "c++",
            "c#",
            "typescript",
            "node",
            "react"
        ].some(
            word =>
                lower.includes(
                    word
                )
        );

    if (
        isCoding
    ) {

        return {
            answer:
                "Kod konusunda yardımcı olabilirim. Programlama dilini ve yapmak istediğin şeyi yaz.",

            reason:
                "coding-local-fallback"
        };
    }

    if (
        lower.includes(
            "hava durumu"
        )
    ) {

        return {
            answer:
                "Hava durumunu öğrenmek için şehir adını belirt. Örneğin: Konya hava durumu.",

            reason:
                "weather-routing"
        };
    }

    if (
        lower.includes(
            "dolar"
        ) ||
        lower.includes(
            "euro"
        ) ||
        lower.includes(
            "döviz"
        )
    ) {

        return {
            answer:
                "Güncel döviz bilgisi için hangi para birimini ve hangi para birimine çevirmek istediğini belirt.",

            reason:
                "currency-routing"
        };
    }

    if (
        lower.includes(
            "altın"
        )
    ) {

        return {
            answer:
                "Güncel altın verisini almak için altın türünü belirtebilirsin.",

            reason:
                "gold-routing"
        };
    }

    if (
        lower.includes(
            "araştır"
        ) ||
        lower.includes(
            "internetten bak"
        ) ||
        lower.includes(
            "güncel"
        )
    ) {

        return {
            answer:
                "Bu soru güncel bilgi gerektiriyor. Araştırma motorunu kullanabilirim.",

            reason:
                "research-routing"
        };
    }

    return {
        answer:
            "Bu soruya yerel sistemimde hazır bir cevap bulamadım. Daha ayrıntılı yazarsan soruyu işleyebilirim.",

        reason:
            "generic-local-fallback"
    };
}

// ======================================================================
// 2.12 — OPENAI-COMPATIBLE REQUEST
// ======================================================================

async function callOpenAICompatible2(
    providerName,
    messages,
    options = {}
) {

    const provider =
        AI_PROVIDERS[
            providerName
        ];

    if (
        !provider
    ) {
        throw new Error(
            "provider_not_found:" +
            providerName
        );
    }

    if (
        !provider.enabled
    ) {
        throw new Error(
            "provider_disabled:" +
            providerName
        );
    }

    if (
        !provider.apiKey
    ) {
        throw new Error(
            "api_key_missing:" +
            providerName
        );
    }

    const cleanMessages =
        sanitizeAIMessages2(
            messages
        );

    if (
        !cleanMessages.length
    ) {
        throw new Error(
            "messages_empty"
        );
    }

    const requestBody = {
        model:
            provider.model,

        messages:
            cleanMessages,

        temperature:
            Number.isFinite(
                options.temperature
            )
                ? options.temperature
                : AI_SYSTEM_CONFIG.temperature,

        max_tokens:
            Number.isFinite(
                options.maxTokens
            )
                ? options.maxTokens
                : AI_SYSTEM_CONFIG.maxTokens
    };

    if (
        options.topP !==
        undefined
    ) {
        requestBody.top_p =
            options.topP;
    }

    if (
        options.reasoningFormat
    ) {
        requestBody.reasoning_format =
            options.reasoningFormat;
    }

    const response =
        await aiFetch2(
            provider.endpoint,
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    Authorization:
                        "Bearer " +
                        provider.apiKey,

                    Accept:
                        "application/json"
                },

                body:
                    JSON.stringify(
                        requestBody
                    )
            },
            Number.isFinite(
                options.timeout
            )
                ? options.timeout
                : AI_SYSTEM_CONFIG.providerTimeout
        );

    let data;

    try {

        data =
            await response.json();

    } catch {

        throw new Error(
            providerName +
            "_invalid_json_response"
        );
    }

    if (
        !response.ok
    ) {

        const message =
            data &&
            data.error &&
            (
                data.error.message ||
                data.error.code
            );

        const error =
            new Error(
                providerName +
                "_http_" +
                response.status +
                (
                    message
                        ? "_" +
                          String(
                              message
                          )
                        : ""
                )
            );

        error.status =
            response.status;

        error.provider =
            providerName;

        error.data =
            data;

        throw error;
    }

    let content =
        null;

    if (
        data &&
        Array.isArray(
            data.choices
        ) &&
        data.choices[0]
    ) {

        const choice =
            data.choices[0];

        if (
            choice.message &&
            typeof choice.message.content ===
                "string"
        ) {

            content =
                choice.message.content;
        }

        if (
            !content &&
            typeof choice.text ===
                "string"
        ) {

            content =
                choice.text;
        }
    }

    if (
        !content
    ) {

        throw new Error(
            providerName +
            "_empty_content"
        );
    }

    return {
        answer:
            String(
                content
            ).trim(),

        provider:
            providerName,

        providerName:
            providerName,

        model:
            provider.model,

        usage:
            data.usage ||
            null,

        raw:
            data
    };
}

// ======================================================================
// 2.13 — GEMINI REQUEST
// ======================================================================

function convertMessagesToGemini2(
    messages
) {

    const clean =
        sanitizeAIMessages2(
            messages
        );

    let systemParts =
        [];

    const contents =
        [];

    for (
        const message
        of clean
    ) {

        if (
            message.role ===
            "system"
        ) {

            systemParts.push(
                message.content
            );

            continue;
        }

        contents.push({
            role:
                message.role ===
                "assistant"
                    ? "model"
                    : "user",

            parts: [
                {
                    text:
                        message.content
                }
            ]
        });
    }

    return {
        systemInstruction:
            systemParts.length
                ? {
                    parts: [
                        {
                            text:
                                systemParts.join(
                                    "\n\n"
                                )
                        }
                    ]
                }
                : undefined,

        contents
    };
}

async function callGemini2(
    messages,
    options = {}
) {

    const provider =
        AI_PROVIDERS.gemini;

    if (
        !provider.enabled
    ) {
        throw new Error(
            "provider_disabled:gemini"
        );
    }

    if (
        !provider.apiKey
    ) {
        throw new Error(
            "api_key_missing:gemini"
        );
    }

    const converted =
        convertMessagesToGemini2(
            messages
        );

    if (
        !converted.contents.length
    ) {
        throw new Error(
            "gemini_contents_empty"
        );
    }

    const model =
        encodeURIComponent(
            provider.model
        );

    const url =
        provider.endpoint +
        "/" +
        model +
        ":generateContent?key=" +
        encodeURIComponent(
            provider.apiKey
        );

    const body = {
        contents:
            converted.contents,

        generationConfig: {
            temperature:
                Number.isFinite(
                    options.temperature
                )
                    ? options.temperature
                    : AI_SYSTEM_CONFIG.temperature,

            maxOutputTokens:
                Number.isFinite(
                    options.maxTokens
                )
                    ? options.maxTokens
                    : AI_SYSTEM_CONFIG.maxTokens
        }
    };

    if (
        converted.systemInstruction
    ) {

        body.systemInstruction =
            converted.systemInstruction;
    }

    const response =
        await aiFetch2(
            url,
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    Accept:
                        "application/json"
                },

                body:
                    JSON.stringify(
                        body
                    )
            },
            Number.isFinite(
                options.timeout
            )
                ? options.timeout
                : AI_SYSTEM_CONFIG.providerTimeout
        );

    let data;

    try {

        data =
            await response.json();

    } catch {

        throw new Error(
            "gemini_invalid_json_response"
        );
    }

    if (
        !response.ok
    ) {

        const message =
            data &&
            data.error &&
            (
                data.error.message ||
                data.error.status
            );

        const error =
            new Error(
                "gemini_http_" +
                response.status +
                (
                    message
                        ? "_" +
                          String(
                              message
                          )
                        : ""
                )
            );

        error.status =
            response.status;

        error.provider =
            "gemini";

        error.data =
            data;

        throw error;
    }

    const parts =
        data &&
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts;

    if (
        !Array.isArray(
            parts
        )
    ) {
        throw new Error(
            "gemini_parts_missing"
        );
    }

    const answer =
        parts
            .map(
                part =>
                    part &&
                    typeof part.text ===
                        "string"
                        ? part.text
                        : ""
            )
            .filter(Boolean)
            .join(
                "\n"
            )
            .trim();

    if (
        !answer
    ) {
        throw new Error(
            "gemini_empty_content"
        );
    }

    return {
        answer,

        provider:
            "gemini",

        providerName:
            "gemini",

        model:
            provider.model,

        usage:
            data.usageMetadata ||
            null,

        raw:
            data
    };
}

// ======================================================================
// 2.14 — LOCAL PROVIDER EXECUTION
// ======================================================================

async function callLocalAI2(
    messages,
    options = {}
) {

    const userMessage =
        [...messages]
            .reverse()
            .find(
                item =>
                    item &&
                    item.role ===
                        "user"
            );

    const message =
        userMessage
            ? userMessage.content
            : "";

    const direct =
        findLocalRuleAnswer2(
            message
        );

    if (
        direct.found
    ) {

        return {
            answer:
                direct.answer,

            provider:
                "local",

            providerName:
                "local",

            model:
                AI_PROVIDERS.local.model,

            usage:
                null,

            localReason:
                "rule-match"
        };
    }

    const fallback =
        generateLocalFallback2(
            message,
            options
        );

    return {
        answer:
            fallback.answer,

        provider:
            "local",

        providerName:
            "local",

        model:
            AI_PROVIDERS.local.model,

        usage:
            null,

        localReason:
            fallback.reason
    };
}

// ======================================================================
// 2.15 — SINGLE PROVIDER CALL
// ======================================================================

async function callAIProvider2(
    providerName,
    messages,
    options = {}
) {

    if (
        providerName ===
        "local"
    ) {

        return await callLocalAI2(
            messages,
            options
        );
    }

    if (
        providerName ===
        "gemini"
    ) {

        return await callGemini2(
            messages,
            options
        );
    }

    return await callOpenAICompatible2(
        providerName,
        messages,
        options
    );
}

// ======================================================================
// 2.16 — ERROR CLASSIFIER
// ======================================================================

function classifyAIError2(
    error
) {

    const text =
        aiSafeString2(
            error &&
            error.message,
            "unknown_error"
        ).toLowerCase();

    if (
        text.includes(
            "401"
        )
    ) {
        return "authentication";
    }

    if (
        text.includes(
            "403"
        )
    ) {
        return "permission";
    }

    if (
        text.includes(
            "404"
        )
    ) {
        return "not_found";
    }

    if (
        text.includes(
            "408"
        ) ||
        text.includes(
            "timeout"
        ) ||
        text.includes(
            "abort"
        )
    ) {
        return "timeout";
    }

    if (
        text.includes(
            "429"
        )
    ) {
        return "rate_limit";
    }

    if (
        text.includes(
            "402"
        )
    ) {
        return "payment_required";
    }

    if (
        text.includes(
            "500"
        ) ||
        text.includes(
            "502"
        ) ||
        text.includes(
            "503"
        ) ||
        text.includes(
            "504"
        )
    ) {
        return "provider_server_error";
    }

    if (
        text.includes(
            "api_key"
        ) ||
        text.includes(
            "not_configured"
        ) ||
        text.includes(
            "disabled"
        )
    ) {
        return "configuration";
    }

    return "unknown";
}

// ======================================================================
// 2.17 — PROVIDER SCORE
// ======================================================================

function getProviderScore2(
    providerName
) {

    const provider =
        AI_PROVIDERS[
            providerName
        ];

    if (
        !provider
    ) {
        return -Infinity;
    }

    const stats =
        AI_RUNTIME
            .providerUsage[
                providerName
            ];

    if (
        providerName ===
        "local"
    ) {
        return 10;
    }

    if (
        !provider.enabled ||
        !provider.apiKey
    ) {
        return -1000;
    }

    const successRate =
        stats.requests >
        0
            ? stats.successes /
              stats.requests
            : 0.50;

    const failurePenalty =
        stats.failures *
        0.50;

    return (
        100 -
        provider.priority * 5 +
        successRate * 20 -
        failurePenalty
    );
}

// ======================================================================
// 2.18 — PROVIDER ORDER
// ======================================================================

function getProviderOrder2(
    options = {}
) {

    const requested =
        aiSafeString2(
            options.provider,
            ""
        ).toLowerCase();

    const order =
        [];

    if (
        requested &&
        AI_PROVIDERS[
            requested
        ]
    ) {

        order.push(
            requested
        );
    }

    if (
        AI_SYSTEM_CONFIG.preferredProvider &&
        AI_PROVIDERS[
            AI_SYSTEM_CONFIG
                .preferredProvider
        ] &&
        !order.includes(
            AI_SYSTEM_CONFIG
                .preferredProvider
        )
    ) {

        order.push(
            AI_SYSTEM_CONFIG
                .preferredProvider
        );
    }

    const dynamic =
        Object.keys(
            AI_PROVIDERS
        )
        .filter(
            name =>
                name !==
                "local"
        )
        .sort(
            (
                a,
                b
            ) =>
                getProviderScore2(
                    b
                ) -
                getProviderScore2(
                    a
                )
        );

    for (
        const name
        of dynamic
    ) {

        if (
            !order.includes(
                name
            )
        ) {

            order.push(
                name
            );
        }
    }

    if (
        AI_SYSTEM_CONFIG.fallbackToLocal
    ) {

        if (
            !order.includes(
                "local"
            )
        ) {

            order.push(
                "local"
            );
        }
    }

    return order;
}

// ======================================================================
// 2.19 — PROVIDER RUNTIME TRACKING
// ======================================================================

function trackProviderRequest2(
    providerName
) {

    if (
        !AI_RUNTIME.providerUsage[
            providerName
        ]
    ) {

        AI_RUNTIME.providerUsage[
            providerName
        ] = {
            requests:
                0,

            successes:
                0,

            failures:
                0,

            lastUsedAt:
                null,

            lastError:
                null
        };
    }

    const stats =
        AI_RUNTIME.providerUsage[
            providerName
        ];

    stats.requests++;
    stats.lastUsedAt =
        aiNow2();

    AI_RUNTIME.totalRequests++;
    AI_RUNTIME.lastRequestAt =
        aiNow2();
}

function trackProviderSuccess2(
    providerName
) {

    const stats =
        AI_RUNTIME.providerUsage[
            providerName
        ];

    if (
        stats
    ) {
        stats.successes++;
        stats.lastError =
            null;
    }

    AI_RUNTIME.successfulRequests++;
    AI_RUNTIME.lastProvider =
        providerName;
    AI_RUNTIME.lastSuccessAt =
        aiNow2();

    if (
        providerName ===
        "local"
    ) {

        AI_RUNTIME.localFallbacks++;
    }
}

function trackProviderFailure2(
    providerName,
    error
) {

    const stats =
        AI_RUNTIME.providerUsage[
            providerName
        ];

    if (
        stats
    ) {

        stats.failures++;

        stats.lastError =
            aiSafeString2(
                error &&
                error.message
            );
    }

    AI_RUNTIME.providerFailures++;
    AI_RUNTIME.failedRequests++;
    AI_RUNTIME.lastErrorAt =
        aiNow2();

    AI_RUNTIME.lastError = {
        provider:
            providerName,

        message:
            aiSafeString2(
                error &&
                error.message
            ),

        category:
            classifyAIError2(
                error
            ),

        timestamp:
            aiNow2()
    };
}

// ======================================================================
// 2.20 — AI HISTORY
// ======================================================================

function pushAIHistory2(
    item
) {

    AI_RUNTIME.history.push({
        traceId:
            item.traceId,

        provider:
            item.provider,

        model:
            item.model,

        success:
            Boolean(
                item.success
            ),

        category:
            item.category ||
            null,

        timestamp:
            item.timestamp ||
            aiNow2()
    });

    if (
        AI_RUNTIME.history.length >
        1000
    ) {

        AI_RUNTIME.history =
            AI_RUNTIME.history.slice(
                -1000
            );
    }
}

// ======================================================================
// 2.21 — RESPONSE CLEANER
// ======================================================================

function cleanAIAnswer2(
    answer
) {

    let text =
        aiSafeString2(
            answer
        );

    text =
        text.replace(
            /\u0000/g,
            ""
        );

    text =
        text.replace(
            /\r\n/g,
            "\n"
        );

    text =
        text.replace(
            /\n{5,}/g,
            "\n\n\n"
        );

    return text.trim();
}

// ======================================================================
// 2.22 — CORE AI ROUTER
// ======================================================================

async function routeAIRequest2(
    messages,
    options = {}
) {

    const traceId =
        aiCreateTraceId2();

    const cleanMessages =
        sanitizeAIMessages2(
            messages
        );

    if (
        !cleanMessages.length
    ) {

        throw new Error(
            "ai_messages_required"
        );
    }

    const providerOrder =
        getProviderOrder2(
            options
        );

    const diagnostics =
        [];

    for (
        const providerName
        of providerOrder
    ) {

        try {

            trackProviderRequest2(
                providerName
            );

            const result =
                await aiRetry2(
                    () =>
                        callAIProvider2(
                            providerName,
                            cleanMessages,
                            options
                        ),
                    providerName ===
                        "local"
                        ? 0
                        : AI_SYSTEM_CONFIG.retries
                );

            const answer =
                cleanAIAnswer2(
                    result.answer
                );

            if (
                !answer
            ) {
                throw new Error(
                    providerName +
                    "_empty_final_answer"
                );
            }

            trackProviderSuccess2(
                providerName
            );

            const response = {
                ok:
                    true,

                success:
                    true,

                traceId,

                answer,

                provider:
                    result.provider ||
                    providerName,

                model:
                    result.model ||
                    AI_PROVIDERS[
                        providerName
                    ].model,

                source:
                    providerName ===
                    "local"
                        ? "local"
                        : "provider",

                usage:
                    result.usage ||
                    null,

                diagnostics:
                    diagnostics,

                timestamp:
                    aiNow2()
            };

            pushAIHistory2({
                traceId,

                provider:
                    response.provider,

                model:
                    response.model,

                success:
                    true,

                category:
                    providerName ===
                    "local"
                        ? "local"
                        : "provider_success"
            });

            return response;

        } catch (
            error
        ) {

            trackProviderFailure2(
                providerName,
                error
            );

            diagnostics.push({
                provider:
                    providerName,

                category:
                    classifyAIError2(
                        error
                    ),

                message:
                    aiSafeString2(
                        error &&
                        error.message
                    ),

                timestamp:
                    aiNow2()
            });

            pushAIHistory2({
                traceId,

                provider:
                    providerName,

                model:
                    AI_PROVIDERS[
                        providerName
                    ]
                    ? AI_PROVIDERS[
                        providerName
                    ].model
                    : null,

                success:
                    false,

                category:
                    classifyAIError2(
                        error
                    )
            });
        }
    }

    const fallback =
        generateLocalFallback2(
            cleanMessages
                .slice()
                .reverse()
                .find(
                    item =>
                        item.role ===
                        "user"
                )?.content ||
                "",
            options
        );

    return {
        ok:
            true,

        success:
            true,

        traceId,

        answer:
            fallback.answer,

        provider:
            "local",

        model:
            AI_PROVIDERS.local.model,

        source:
            "local-fallback",

        usage:
            null,

        localReason:
            fallback.reason,

        diagnostics,

        timestamp:
            aiNow2()
    };
}

// ======================================================================
// 2.23 — AI CONTEXT BUILDER
// ======================================================================

function buildAIContext2(
    options = {}
) {

    const parts =
        [];

    if (
        AI_SYSTEM_CONFIG.allowMemoryContext &&
        options.memoryContext
    ) {

        parts.push(
            "HAFIZA:\n" +
            aiSafeString2(
                options.memoryContext
            )
        );
    }

    if (
        AI_SYSTEM_CONFIG.allowResearchContext &&
        options.researchContext
    ) {

        parts.push(
            "ARAŞTIRMA:\n" +
            aiSafeString2(
                options.researchContext
            )
        );
    }

    if (
        AI_SYSTEM_CONFIG.allowConversationContext &&
        options.conversationContext
    ) {

        parts.push(
            "KONUŞMA GEÇMİŞİ:\n" +
            aiSafeString2(
                options.conversationContext
            )
        );
    }

    return parts.join(
        "\n\n"
    );
}

// ======================================================================
// 2.24 — HIGH LEVEL CHAT ENGINE
// ======================================================================

async function generateTurkAIResponse2(
    userMessage,
    options = {}
) {

    const message =
        aiSafeString2(
            userMessage
        );

    if (
        !message
    ) {

        throw new Error(
            "message_required"
        );
    }

    const direct =
        findLocalRuleAnswer2(
            message
        );

    if (
        direct.found
    ) {

        return {
            ok:
                true,

            success:
                true,

            answer:
                direct.answer,

            provider:
                "local",

            model:
                AI_PROVIDERS.local.model,

            source:
                "local-rule",

            researched:
                false,

            traceId:
                aiCreateTraceId2(),

            timestamp:
                aiNow2()
        };
    }

    const context =
        buildAIContext2(
            options
        );

    const systemPrompt =
        getTurkAISystemPrompt2({
            language:
                options.language ||
                "tr",

            userName:
                options.userName ||
                "",

            memoryContext:
                options.memoryContext ||
                "",

            researchContext:
                options.researchContext ||
                "",

            conversationContext:
                options.conversationContext ||
                ""
        });

    const messages =
        [
            {
                role:
                    "system",

                content:
                    systemPrompt
            }
        ];

    if (
        context &&
        !options.conversationContext
    ) {

        messages.push({
            role:
                "system",

            content:
                context
        });
    }

    if (
        Array.isArray(
            options.history
        )
    ) {

        messages.push(
            ...sanitizeAIMessages2(
                options.history
            )
        );
    }

    messages.push({
        role:
            "user",

        content:
            message
    });

    const result =
        await routeAIRequest2(
            messages,
            {
                provider:
                    options.provider,

                temperature:
                    options.temperature,

                maxTokens:
                    options.maxTokens,

                timeout:
                    options.timeout
            }
        );

    return {
        ...result,

        researched:
            Boolean(
                options.researchContext
            ),

        usedMemory:
            Boolean(
                options.memoryContext
            ),

        usedConversation:
            Boolean(
                options.conversationContext ||
                options.history
            )
    };
}

// ======================================================================
// 2.25 — DIRECT AI API
// ======================================================================

app.post(
    "/api/ai",
    async (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const message =
            aiSafeString2(
                body.message ||
                body.prompt ||
                body.text
            );

        if (
            !message
        ) {

            return res.status(
                400
            ).json({
                ok:
                    false,

                success:
                    false,

                error:
                    "message_required"
            });
        }

        try {

            const result =
                await generateTurkAIResponse2(
                    message,
                    {
                        userName:
                            body.userName,

                        userId:
                            body.userId,

                        language:
                            body.language,

                        provider:
                            body.provider,

                        temperature:
                            body.temperature,

                        maxTokens:
                            body.maxTokens,

                        memoryContext:
                            body.memoryContext,

                        researchContext:
                            body.researchContext,

                        conversationContext:
                            body.conversationContext,

                        history:
                            body.history
                    }
                );

            return res.json(
                result
            );

        } catch (
            error
        ) {

            runtime.errors++;

            return res.status(
                500
            ).json({
                ok:
                    false,

                success:
                    false,

                error:
                    "ai_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 2.26 — PROVIDER STATUS API
// ======================================================================

app.get(
    "/api/ai/providers",
    (
        req,
        res
    ) => {

        return res.json({
            ok:
                true,

            providers:
                getAIProviderStatus2(),

            preferredProvider:
                AI_SYSTEM_CONFIG.preferredProvider,

            localFallback:
                AI_SYSTEM_CONFIG.fallbackToLocal
        });
    }
);

// ======================================================================
// 2.27 — AI RUNTIME API
// ======================================================================

app.get(
    "/api/ai/runtime",
    (
        req,
        res
    ) => {

        return res.json({
            ok:
                true,

            runtime: {
                totalRequests:
                    AI_RUNTIME.totalRequests,

                successfulRequests:
                    AI_RUNTIME.successfulRequests,

                failedRequests:
                    AI_RUNTIME.failedRequests,

                localFallbacks:
                    AI_RUNTIME.localFallbacks,

                providerFailures:
                    AI_RUNTIME.providerFailures,

                lastProvider:
                    AI_RUNTIME.lastProvider,

                lastModel:
                    AI_RUNTIME.lastModel,

                lastRequestAt:
                    AI_RUNTIME.lastRequestAt,

                lastSuccessAt:
                    AI_RUNTIME.lastSuccessAt,

                lastErrorAt:
                    AI_RUNTIME.lastErrorAt,

                lastError:
                    AI_RUNTIME.lastError
            },

            providers:
                getAIProviderStatus2()
        });
    }
);

// ======================================================================
// 2.28 — MODEL API
// ======================================================================

app.get(
    "/api/models",
    (
        req,
        res
    ) => {

        const models =
            Object.entries(
                AI_PROVIDERS
            ).map(
                (
                    [
                        id,
                        provider
                    ]
                ) => ({
                    id,

                    name:
                        provider.name,

                    model:
                        provider.model,

                    enabled:
                        provider.enabled,

                    configured:
                        Boolean(
                            provider.apiKey
                        ) ||
                        provider.type ===
                            "local",

                    type:
                        provider.type,

                    priority:
                        provider.priority
                })
            );

        return res.json({
            ok:
                true,

            models,

            default:
                AI_SYSTEM_CONFIG.preferredProvider
        });
    }
);

// ======================================================================
// 2.29 — AI TEST ENDPOINT
// ======================================================================

app.get(
    "/api/ai/test",
    async (
        req,
        res
    ) => {

        try {

            const result =
                await generateTurkAIResponse2(
                    "Merhaba",
                    {
                        provider:
                            req.query.provider ||
                            undefined
                    }
                );

            return res.json({
                ok:
                    true,

                result
            });

        } catch (
            error
        ) {

            return res.status(
                500
            ).json({
                ok:
                    false,

                error:
                    error.message
            });
        }
    }
);

// ======================================================================
// 2.30 — PART 2 STATE BRIDGE
// ======================================================================

serverState =
    serverState ||
    {};

serverState.ai =
    serverState.ai ||
    {};

serverState.ai.config =
    AI_SYSTEM_CONFIG;

serverState.ai.providers =
    AI_PROVIDERS;

serverState.ai.runtime =
    AI_RUNTIME;

serverState.ai.getProviderStatus =
    getAIProviderStatus2;

serverState.ai.route =
    routeAIRequest2;

serverState.ai.generate =
    generateTurkAIResponse2;

serverState.ai.local =
    callLocalAI2;

serverState.ai.getModels =
    function () {

        return Object.keys(
            AI_PROVIDERS
        ).map(
            name => ({
                id:
                    name,

                name:
                    AI_PROVIDERS[
                        name
                    ].name,

                model:
                    AI_PROVIDERS[
                        name
                    ].model,

                enabled:
                    AI_PROVIDERS[
                        name
                    ].enabled,

                type:
                    AI_PROVIDERS[
                        name
                    ].type
            })
        );
    };

// ======================================================================
// 2.31 — GLOBAL COMPATIBILITY BRIDGES
// ======================================================================

global.turkAI =
    global.turkAI ||
    {};

global.turkAI.ai =
    global.turkAI.ai ||
    {};

global.turkAI.ai.route =
    routeAIRequest2;

global.turkAI.ai.generate =
    generateTurkAIResponse2;

global.turkAI.ai.providers =
    AI_PROVIDERS;

global.turkAI.ai.runtime =
    AI_RUNTIME;

// ======================================================================
// 2.32 — STARTUP LOG
// ======================================================================

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

console.log(
    "TürkAI Master Server — PART 2/10"
);

console.log(
    "AI Provider Engine yüklendi."
);

console.log(
    "Groq:",
    AI_PROVIDERS.groq.enabled
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Cerebras:",
    AI_PROVIDERS.cerebras.enabled
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Gemini:",
    AI_PROVIDERS.gemini.enabled
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "OpenRouter:",
    AI_PROVIDERS.openrouter.enabled
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Local AI:",
    AI_PROVIDERS.local.enabled
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Preferred:",
    AI_SYSTEM_CONFIG.preferredProvider
);

console.log(
    "Fallback:",
    AI_SYSTEM_CONFIG.fallbackToLocal
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

// ======================================================================
// 2.33 — PART 2 END
// ======================================================================

/*
SONRA:
PART 3 / 10
ANSWER MEMORY + KNOWLEDGE + AUTO LEARNING + SMART CHAT
*/
/*
========================================================================
 TÜRKAI MASTER SERVER 50.0
 PART 3 / 10
 ANSWER MEMORY + KNOWLEDGE + AUTO LEARNING + SMART MEMORY ENGINE
========================================================================
*/

"use strict";

// ======================================================================
// 3.0 — MEMORY ENGINE CONFIG
// ======================================================================

const ANSWER_MEMORY_CONFIG_3 = {

    enabled:
        true,

    knowledgeEnabled:
        true,

    userMemoryEnabled:
        true,

    autoLearningEnabled:
        true,

    semanticSearchEnabled:
        true,

    fuzzySearchEnabled:
        true,

    duplicateDetectionEnabled:
        true,

    contextEnabled:
        true,

    analyticsEnabled:
        true,

    maxAnswerLength:
        20000,

    maxQuestionLength:
        10000,

    maxUserMemories:
        2000,

    maxKnowledgeItems:
        20000,

    maxConversationContext:
        20,

    minimumMemoryScore:
        0.55,

    strongMemoryScore:
        0.82,

    exactMemoryScore:
        0.98,

    minimumKnowledgeScore:
        0.60,

    strongKnowledgeScore:
        0.86,

    cacheTTL:
        10 * 60 * 1000
};

// ======================================================================
// 3.1 — MEMORY DATABASE
// ======================================================================

const ANSWER_MEMORY_FILE_3 =
    path.join(
        MEMORY_DIR,
        "answer-memory-v3.json"
    );

const KNOWLEDGE_MEMORY_FILE_3 =
    path.join(
        MEMORY_DIR,
        "knowledge-v3.json"
    );

const USER_MEMORY_FILE_3 =
    path.join(
        MEMORY_DIR,
        "user-memory-v3.json"
    );

const MEMORY_ANALYTICS_FILE_3 =
    path.join(
        MEMORY_DIR,
        "analytics-v3.json"
    );

const MEMORY_LOG_FILE_3 =
    path.join(
        MEMORY_DIR,
        "memory-events-v3.jsonl"
    );

let answerMemoryDB3 =
    readJSON(
        ANSWER_MEMORY_FILE_3,
        {
            version:
                "3.0",

            items:
                []
        }
    );

let knowledgeMemoryDB3 =
    readJSON(
        KNOWLEDGE_MEMORY_FILE_3,
        {
            version:
                "3.0",

            items:
                []
        }
    );

let userMemoryDB3 =
    readJSON(
        USER_MEMORY_FILE_3,
        {
            version:
                "3.0",

            users:
                {}
        }
    );

let memoryAnalytics3 =
    readJSON(
        MEMORY_ANALYTICS_FILE_3,
        {
            version:
                "3.0",

            totalSearches:
                0,

            totalHits:
                0,

            totalWrites:
                0,

            totalLearning:
                0,

            totalDuplicates:
                0,

            totalMisses:
                0,

            totalErrors:
                0,

            bySource:
                {},

            byUser:
                {}
        }
    );

// ======================================================================
// 3.2 — DATABASE NORMALIZATION
// ======================================================================

function normalizeMemoryDB3() {

    if (
        !answerMemoryDB3 ||
        typeof answerMemoryDB3 !==
            "object"
    ) {
        answerMemoryDB3 = {
            version:
                "3.0",

            items:
                []
        };
    }

    if (
        !Array.isArray(
            answerMemoryDB3.items
        )
    ) {
        answerMemoryDB3.items =
            [];
    }

    if (
        !knowledgeMemoryDB3 ||
        typeof knowledgeMemoryDB3 !==
            "object"
    ) {
        knowledgeMemoryDB3 = {
            version:
                "3.0",

            items:
                []
        };
    }

    if (
        !Array.isArray(
            knowledgeMemoryDB3.items
        )
    ) {
        knowledgeMemoryDB3.items =
            [];
    }

    if (
        !userMemoryDB3 ||
        typeof userMemoryDB3 !==
            "object"
    ) {
        userMemoryDB3 = {
            version:
                "3.0",

            users:
                {}
        };
    }

    if (
        !userMemoryDB3.users ||
        typeof userMemoryDB3.users !==
            "object"
    ) {
        userMemoryDB3.users =
            {};
    }

    if (
        !memoryAnalytics3 ||
        typeof memoryAnalytics3 !==
            "object"
    ) {
        memoryAnalytics3 = {
            version:
                "3.0",

            totalSearches:
                0,

            totalHits:
                0,

            totalWrites:
                0,

            totalLearning:
                0,

            totalDuplicates:
                0,

            totalMisses:
                0,

            totalErrors:
                0,

            bySource:
                {},

            byUser:
                {}
        };
    }

    memoryAnalytics3.bySource =
        memoryAnalytics3.bySource ||
        {};

    memoryAnalytics3.byUser =
        memoryAnalytics3.byUser ||
        {};
}

normalizeMemoryDB3();

// ======================================================================
// 3.3 — SAVE FUNCTIONS
// ======================================================================

function saveAnswerMemoryDB3() {

    return writeJSON(
        ANSWER_MEMORY_FILE_3,
        answerMemoryDB3
    );
}

function saveKnowledgeMemoryDB3() {

    return writeJSON(
        KNOWLEDGE_MEMORY_FILE_3,
        knowledgeMemoryDB3
    );
}

function saveUserMemoryDB3() {

    return writeJSON(
        USER_MEMORY_FILE_3,
        userMemoryDB3
    );
}

function saveMemoryAnalytics3() {

    return writeJSON(
        MEMORY_ANALYTICS_FILE_3,
        memoryAnalytics3
    );
}

// ======================================================================
// 3.4 — STRING HELPERS
// ======================================================================

function memoryString3(
    value,
    fallback = ""
) {

    if (
        value ===
            null ||
        value ===
            undefined
    ) {
        return fallback;
    }

    return String(
        value
    ).trim();
}

function normalizeTurkish3(
    value
) {

    return memoryString3(
        value
    )
        .toLocaleLowerCase(
            "tr-TR"
        )
        .replace(
            /İ/g,
            "i"
        )
        .replace(
            /I/g,
            "ı"
        )
        .replace(
            /Ğ/g,
            "ğ"
        )
        .replace(
            /Ü/g,
            "ü"
        )
        .replace(
            /Ş/g,
            "ş"
        )
        .replace(
            /Ö/g,
            "ö"
        )
        .replace(
            /Ç/g,
            "ç"
        )
        .replace(
            /[.,!?;:()[\]{}"'`“”‘’<>|/\\]/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function normalizeForSearch3(
    value
) {

    return normalizeTurkish3(
        value
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /ı/g,
            "i"
        )
        .replace(
            /ğ/g,
            "g"
        )
        .replace(
            /ş/g,
            "s"
        )
        .replace(
            /ç/g,
            "c"
        )
        .replace(
            /ö/g,
            "o"
        )
        .replace(
            /ü/g,
            "u"
        );
}

function memoryNow3() {

    return new Date()
        .toISOString();
}

function memoryId3(
    prefix =
        "memory"
) {

    return (
        prefix +
        "_" +
        Date.now().toString(
            36
        ) +
        "_" +
        crypto
            .randomBytes(
                6
            )
            .toString(
                "hex"
            )
    );
}

// ======================================================================
// 3.5 — TOKENIZATION
// ======================================================================

const STOP_WORDS_3 =
    new Set([
        "ve",
        "veya",
        "ile",
        "için",
        "bir",
        "bu",
        "şu",
        "o",
        "da",
        "de",
        "mi",
        "mı",
        "mu",
        "mü",
        "ama",
        "fakat",
        "çok",
        "daha",
        "en",
        "ne",
        "nasıl",
        "neden",
        "hangi",
        "kaç",
        "var",
        "yok",
        "ben",
        "sen",
        "biz",
        "siz",
        "onlar"
    ]);

function tokenizeMemory3(
    value
) {

    const normalized =
        normalizeForSearch3(
            value
        );

    if (
        !normalized
    ) {
        return [];
    }

    return normalized
        .split(
            " "
        )
        .filter(
            token =>
                token.length >=
                    2 &&
                !STOP_WORDS_3.has(
                    token
                )
        );
}

// ======================================================================
// 3.6 — TOKEN FREQUENCY
// ======================================================================

function tokenFrequency3(
    tokens
) {

    const frequency =
        {};

    for (
        const token of tokens
    ) {

        frequency[token] =
            (
                frequency[token] ||
                0
            ) +
            1;
    }

    return frequency;
}

// ======================================================================
// 3.7 — JACCARD SIMILARITY
// ======================================================================

function jaccardSimilarity3(
    a,
    b
) {

    const setA =
        new Set(
            tokenizeMemory3(
                a
            )
        );

    const setB =
        new Set(
            tokenizeMemory3(
                b
            )
        );

    if (
        !setA.size ||
        !setB.size
    ) {
        return 0;
    }

    let intersection =
        0;

    for (
        const token of setA
    ) {

        if (
            setB.has(
                token
            )
        ) {
            intersection++;
        }
    }

    const union =
        new Set([
            ...setA,
            ...setB
        ]).size;

    return union
        ? intersection /
          union
        : 0;
}

// ======================================================================
// 3.8 — COSINE SIMILARITY
// ======================================================================

function cosineSimilarity3(
    a,
    b
) {

    const tokensA =
        tokenizeMemory3(
            a
        );

    const tokensB =
        tokenizeMemory3(
            b
        );

    if (
        !tokensA.length ||
        !tokensB.length
    ) {
        return 0;
    }

    const freqA =
        tokenFrequency3(
            tokensA
        );

    const freqB =
        tokenFrequency3(
            tokensB
        );

    const vocabulary =
        new Set([
            ...Object.keys(
                freqA
            ),
            ...Object.keys(
                freqB
            )
        ]);

    let dot =
        0;

    let normA =
        0;

    let normB =
        0;

    for (
        const token
        of vocabulary
    ) {

        const x =
            freqA[token] ||
            0;

        const y =
            freqB[token] ||
            0;

        dot +=
            x *
            y;

        normA +=
            x *
            x;

        normB +=
            y *
            y;
    }

    if (
        !normA ||
        !normB
    ) {
        return 0;
    }

    return (
        dot /
        (
            Math.sqrt(
                normA
            ) *
            Math.sqrt(
                normB
            )
        )
    );
}

// ======================================================================
// 3.9 — CHARACTER SIMILARITY
// ======================================================================

function characterSimilarity3(
    a,
    b
) {

    const aa =
        normalizeForSearch3(
            a
        );

    const bb =
        normalizeForSearch3(
            b
        );

    if (
        !aa ||
        !bb
    ) {
        return 0;
    }

    const maxLength =
        Math.max(
            aa.length,
            bb.length
        );

    if (
        !maxLength
    ) {
        return 1;
    }

    let same =
        0;

    const minLength =
        Math.min(
            aa.length,
            bb.length
        );

    for (
        let i = 0;
        i < minLength;
        i++
    ) {

        if (
            aa[i] ===
            bb[i]
        ) {
            same++;
        }
    }

    return (
        same /
        maxLength
    );
}

// ======================================================================
// 3.10 — KEYWORD BONUS
// ======================================================================

function keywordBonus3(
    query,
    candidate
) {

    const queryTokens =
        new Set(
            tokenizeMemory3(
                query
            )
        );

    const candidateTokens =
        new Set(
            tokenizeMemory3(
                candidate
            )
        );

    if (
        !queryTokens.size ||
        !candidateTokens.size
    ) {
        return 0;
    }

    let hits =
        0;

    for (
        const token
        of queryTokens
    ) {

        if (
            candidateTokens.has(
                token
            )
        ) {
            hits++;
        }
    }

    return Math.min(
        0.25,
        (
            hits /
            queryTokens.size
        ) *
        0.25
    );
}

// ======================================================================
// 3.11 — SMART SCORE
// ======================================================================

function calculateMemoryScore3(
    query,
    candidate
) {

    const exact =
        normalizeForSearch3(
            query
        ) ===
        normalizeForSearch3(
            candidate
        );

    if (
        exact
    ) {
        return {
            score:
                1,

            exact:
                true,

            cosine:
                1,

            jaccard:
                1,

            character:
                1,

            keyword:
                0.25
        };
    }

    const cosine =
        cosineSimilarity3(
            query,
            candidate
        );

    const jaccard =
        jaccardSimilarity3(
            query,
            candidate
        );

    const character =
        characterSimilarity3(
            query,
            candidate
        );

    const keyword =
        keywordBonus3(
            query,
            candidate
        );

    let score =
        (
            cosine *
            0.40
        ) +
        (
            jaccard *
            0.30
        ) +
        (
            character *
            0.15
        ) +
        keyword;

    if (
        normalizeForSearch3(
            candidate
        ).includes(
            normalizeForSearch3(
                query
            )
        )
    ) {

        score +=
            0.15;
    }

    return {
        score:
            Math.min(
                1,
                score
            ),

        exact:
            false,

        cosine,

        jaccard,

        character,

        keyword
    };
}

// ======================================================================
// 3.12 — ANALYTICS
// ======================================================================

function analyticsIncrement3(
    field,
    amount = 1
) {

    if (
        typeof memoryAnalytics3[
            field
        ] !==
        "number"
    ) {

        memoryAnalytics3[
            field
        ] = 0;
    }

    memoryAnalytics3[
        field
    ] += amount;
}

function analyticsSource3(
    source
) {

    const key =
        memoryString3(
            source,
            "unknown"
        );

    memoryAnalytics3.bySource[
        key
    ] =
        (
            memoryAnalytics3
                .bySource[
                    key
                ] ||
            0
        ) +
        1;
}

function analyticsUser3(
    userId
) {

    const key =
        memoryString3(
            userId,
            "guest"
        );

    memoryAnalytics3.byUser[
        key
    ] =
        (
            memoryAnalytics3
                .byUser[
                    key
                ] ||
            0
        ) +
        1;
}

// ======================================================================
// 3.13 — MEMORY EVENT LOGGER
// ======================================================================

function logMemoryEvent3(
    event
) {

    try {

        appendJSONLine(
            MEMORY_LOG_FILE_3,
            {
                id:
                    memoryId3(
                        "event"
                    ),

                timestamp:
                    memoryNow3(),

                ...event
            }
        );

    } catch {

        analyticsIncrement3(
            "totalErrors"
        );
    }
}

// ======================================================================
// 3.14 — USER MEMORY INITIALIZATION
// ======================================================================

function ensureUserMemory3(
    userId
) {

    const id =
        memoryString3(
            userId,
            "guest"
        );

    if (
        !userMemoryDB3.users[
            id
        ]
    ) {

        userMemoryDB3.users[
            id
        ] = {

            userId:
                id,

            name:
                null,

            preferences:
                {},

            facts:
                [],

            interests:
                [],

            projects:
                [],

            recentTopics:
                [],

            custom:
                {},

            createdAt:
                memoryNow3(),

            updatedAt:
                memoryNow3()
        };

        saveUserMemoryDB3();
    }

    return userMemoryDB3.users[
        id
    ];
}

// ======================================================================
// 3.15 — USER FACT NORMALIZER
// ======================================================================

function normalizeUserFact3(
    fact
) {

    const text =
        memoryString3(
            fact
        );

    if (
        !text
    ) {
        return null;
    }

    return {
        id:
            memoryId3(
                "fact"
            ),

        text,

        createdAt:
            memoryNow3(),

        updatedAt:
            memoryNow3()
    };
}

// ======================================================================
// 3.16 — ADD USER FACT
// ======================================================================

function addUserFact3(
    userId,
    fact
) {

    const user =
        ensureUserMemory3(
            userId
        );

    const normalized =
        normalizeForSearch3(
            fact
        );

    if (
        !normalized
    ) {
        return false;
    }

    const exists =
        user.facts.some(
            item =>
                normalizeForSearch3(
                    item.text
                ) ===
                normalized
        );

    if (
        exists
    ) {
        return false;
    }

    user.facts.push(
        normalizeUserFact3(
            fact
        )
    );

    if (
        user.facts.length >
        ANSWER_MEMORY_CONFIG_3
            .maxUserMemories
    ) {

        user.facts =
            user.facts.slice(
                -ANSWER_MEMORY_CONFIG_3
                    .maxUserMemories
            );
    }

    user.updatedAt =
        memoryNow3();

    saveUserMemoryDB3();

    return true;
}

// ======================================================================
// 3.17 — ADD INTEREST
// ======================================================================

function addUserInterest3(
    userId,
    interest
) {

    const user =
        ensureUserMemory3(
            userId
        );

    const clean =
        memoryString3(
            interest
        );

    if (
        !clean
    ) {
        return false;
    }

    const normalized =
        normalizeForSearch3(
            clean
        );

    const exists =
        user.interests.some(
            item =>
                normalizeForSearch3(
                    item
                ) ===
                normalized
        );

    if (
        exists
    ) {
        return false;
    }

    user.interests.push(
        clean
    );

    if (
        user.interests.length >
        500
    ) {

        user.interests =
            user.interests.slice(
                -500
            );
    }

    user.updatedAt =
        memoryNow3();

    saveUserMemoryDB3();

    return true;
}

// ======================================================================
// 3.18 — ADD PROJECT
// ======================================================================

function addUserProject3(
    userId,
    project
) {

    const user =
        ensureUserMemory3(
            userId
        );

    const clean =
        memoryString3(
            project
        );

    if (
        !clean
    ) {
        return false;
    }

    const normalized =
        normalizeForSearch3(
            clean
        );

    const exists =
        user.projects.some(
            item =>
                normalizeForSearch3(
                    item
                ) ===
                normalized
        );

    if (
        exists
    ) {
        return false;
    }

    user.projects.push(
        clean
    );

    if (
        user.projects.length >
        500
    ) {

        user.projects =
            user.projects.slice(
                -500
            );
    }

    user.updatedAt =
        memoryNow3();

    saveUserMemoryDB3();

    return true;
}

// ======================================================================
// 3.19 — USER NAME
// ======================================================================

function setUserName3(
    userId,
    name
) {

    const user =
        ensureUserMemory3(
            userId
        );

    const clean =
        memoryString3(
            name
        );

    if (
        !clean
    ) {
        return false;
    }

    user.name =
        clean;

    user.updatedAt =
        memoryNow3();

    saveUserMemoryDB3();

    return true;
}

// ======================================================================
// 3.20 — USER PREFERENCE
// ======================================================================

function setUserPreference3(
    userId,
    key,
    value
) {

    const user =
        ensureUserMemory3(
            userId
        );

    const cleanKey =
        memoryString3(
            key
        );

    if (
        !cleanKey
    ) {
        return false;
    }

    user.preferences[
        cleanKey
    ] =
        value;

    user.updatedAt =
        memoryNow3();

    saveUserMemoryDB3();

    return true;
}

// ======================================================================
// 3.21 — RECENT TOPICS
// ======================================================================

function addRecentTopic3(
    userId,
    topic
) {

    const user =
        ensureUserMemory3(
            userId
        );

    const clean =
        memoryString3(
            topic
        );

    if (
        !clean
    ) {
        return false;
    }

    user.recentTopics =
        user.recentTopics.filter(
            item =>
                normalizeForSearch3(
                    item
                ) !==
                normalizeForSearch3(
                    clean
                )
        );

    user.recentTopics.push(
        clean
    );

    if (
        user.recentTopics.length >
        50
    ) {

        user.recentTopics =
            user.recentTopics.slice(
                -50
            );
    }

    user.updatedAt =
        memoryNow3();

    saveUserMemoryDB3();

    return true;
}

// ======================================================================
// 3.22 — MEMORY CONTEXT
// ======================================================================

function buildUserMemoryContext3(
    userId,
    maxLength = 8000
) {

    const user =
        ensureUserMemory3(
            userId
        );

    const sections =
        [];

    if (
        user.name
    ) {

        sections.push(
            "Kullanıcı adı: " +
            user.name
        );
    }

    if (
        user.interests.length
    ) {

        sections.push(
            "İlgi alanları: " +
            user.interests
                .slice(
                    -20
                )
                .join(
                    ", "
                )
        );
    }

    if (
        user.projects.length
    ) {

        sections.push(
            "Projeler: " +
            user.projects
                .slice(
                    -20
                )
                .join(
                    ", "
                )
        );
    }

    if (
        user.recentTopics.length
    ) {

        sections.push(
            "Son konular: " +
            user.recentTopics
                .slice(
                    -20
                )
                .join(
                    ", "
                )
        );
    }

    if (
        Object.keys(
            user.preferences
        ).length
    ) {

        sections.push(
            "Tercihler: " +
            Object.entries(
                user.preferences
            )
                .slice(
                    -20
                )
                .map(
                    (
                        [
                            key,
                            value
                        ]
                    ) =>
                        `${key}=${value}`
                )
                .join(
                    ", "
                )
        );
    }

    if (
        user.facts.length
    ) {

        sections.push(
            "Bilinen bilgiler:\n" +
            user.facts
                .slice(
                    -30
                )
                .map(
                    item =>
                        "- " +
                        item.text
                )
                .join(
                    "\n"
                )
        );
    }

    return sections
        .join(
            "\n\n"
        )
        .slice(
            0,
            maxLength
        );
}

// ======================================================================
// 3.23 — MEMORY INSERT
// ======================================================================

function saveAnswerMemory3(
    userId,
    question,
    answer,
    options = {}
) {

    const uid =
        memoryString3(
            userId,
            "guest"
        );

    const cleanQuestion =
        memoryString3(
            question
        );

    const cleanAnswer =
        memoryString3(
            answer
        );

    if (
        !cleanQuestion ||
        !cleanAnswer
    ) {
        return {
            ok:
                false,

            saved:
                false,

            reason:
                "empty"
        };
    }

    if (
        cleanQuestion.length >
        ANSWER_MEMORY_CONFIG_3
            .maxQuestionLength
    ) {
        return {
            ok:
                false,

            saved:
                false,

            reason:
                "question_too_long"
        };
    }

    if (
        cleanAnswer.length >
        ANSWER_MEMORY_CONFIG_3
            .maxAnswerLength
    ) {

        return {
            ok:
                false,

            saved:
                false,

            reason:
                "answer_too_long"
        };
    }

    const existing =
        answerMemoryDB3.items
            .find(
                item =>
                    item.userId ===
                        uid &&
                    normalizeForSearch3(
                        item.question
                    ) ===
                        normalizeForSearch3(
                            cleanQuestion
                        )
            );

    if (
        existing
    ) {

        existing.answer =
            cleanAnswer;

        existing.source =
            memoryString3(
                options.source,
                existing.source ||
                    "chat"
            );

        existing.updatedAt =
            memoryNow3();

        existing.hits =
            Number(
                existing.hits ||
                0
            );

        analyticsIncrement3(
            "totalDuplicates"
        );

        logMemoryEvent3({
            type:
                "duplicate-update",

            userId:
                uid,

            memoryId:
                existing.id,

            question:
                cleanQuestion
        });

        saveAnswerMemoryDB3();
        saveMemoryAnalytics3();

        return {
            ok:
                true,

            saved:
                true,

            duplicate:
                true,

            id:
                existing.id
        };
    }

    const item = {

        id:
            memoryId3(
                "answer"
            ),

        userId:
            uid,

        question:
            cleanQuestion,

        answer:
            cleanAnswer,

        source:
            memoryString3(
                options.source,
                "chat"
            ),

        confidence:
            Number.isFinite(
                options.confidence
            )
                ? options.confidence
                : 1,

        hits:
            0,

        tags:
            Array.isArray(
                options.tags
            )
                ? options.tags.slice(
                    0,
                    50
                )
                : [],

        createdAt:
            memoryNow3(),

        updatedAt:
            memoryNow3(),

        metadata:
            options.metadata ||
            {}
    };

    answerMemoryDB3.items.push(
        item
    );

    if (
        answerMemoryDB3.items.length >
        30000
    ) {

        answerMemoryDB3.items =
            answerMemoryDB3.items.slice(
                -30000
            );
    }

    analyticsIncrement3(
        "totalWrites"
    );

    analyticsSource3(
        item.source
    );

    analyticsUser3(
        uid
    );

    logMemoryEvent3({
        type:
            "save",

        userId:
            uid,

        memoryId:
            item.id,

        question:
            cleanQuestion,

        source:
            item.source
    });

    saveAnswerMemoryDB3();
    saveMemoryAnalytics3();

    return {
        ok:
            true,

        saved:
            true,

        duplicate:
            false,

        id:
            item.id
    };
}

// ======================================================================
// 3.24 — KNOWLEDGE INSERT
// ======================================================================

function saveKnowledgeMemory3(
    question,
    answer,
    options = {}
) {

    const cleanQuestion =
        memoryString3(
            question
        );

    const cleanAnswer =
        memoryString3(
            answer
        );

    if (
        !cleanQuestion ||
        !cleanAnswer
    ) {
        return {
            ok:
                false,

            saved:
                false,

            reason:
                "empty"
        };
    }

    const existing =
        knowledgeMemoryDB3.items.find(
            item =>
                normalizeForSearch3(
                    item.question
                ) ===
                normalizeForSearch3(
                    cleanQuestion
                )
        );

    if (
        existing
    ) {

        existing.answer =
            cleanAnswer;

        existing.source =
            memoryString3(
                options.source,
                existing.source ||
                    "auto-learning"
            );

        existing.updatedAt =
            memoryNow3();

        existing.confidence =
            Number.isFinite(
                options.confidence
            )
                ? options.confidence
                : existing.confidence;

        analyticsIncrement3(
            "totalDuplicates"
        );

        saveKnowledgeMemoryDB3();
        saveMemoryAnalytics3();

        return {
            ok:
                true,

            saved:
                true,

            duplicate:
                true,

            id:
                existing.id
        };
    }

    const item = {

        id:
            memoryId3(
                "knowledge"
            ),

        question:
            cleanQuestion,

        answer:
            cleanAnswer,

        source:
            memoryString3(
                options.source,
                "auto-learning"
            ),

        category:
            memoryString3(
                options.category,
                "general"
            ),

        confidence:
            Number.isFinite(
                options.confidence
            )
                ? options.confidence
                : 0.8,

        hits:
            0,

        tags:
            Array.isArray(
                options.tags
            )
                ? options.tags.slice(
                    0,
                    50
                )
                : [],

        createdAt:
            memoryNow3(),

        updatedAt:
            memoryNow3()
    };

    knowledgeMemoryDB3.items.push(
        item
    );

    if (
        knowledgeMemoryDB3.items.length >
        ANSWER_MEMORY_CONFIG_3
            .maxKnowledgeItems
    ) {

        knowledgeMemoryDB3.items =
            knowledgeMemoryDB3.items.slice(
                -ANSWER_MEMORY_CONFIG_3
                    .maxKnowledgeItems
            );
    }

    analyticsIncrement3(
        "totalLearning"
    );

    analyticsSource3(
        item.source
    );

    saveKnowledgeMemoryDB3();
    saveMemoryAnalytics3();

    logMemoryEvent3({
        type:
            "knowledge-save",

        memoryId:
            item.id,

        question:
            cleanQuestion,

        category:
            item.category
    });

    return {
        ok:
            true,

        saved:
            true,

        duplicate:
            false,

        id:
            item.id
    };
}

// ======================================================================
// 3.25 — MEMORY SEARCH CACHE
// ======================================================================

const memorySearchCache3 =
    new Map();

function memoryCacheGet3(
    key
) {

    const item =
        memorySearchCache3.get(
            key
        );

    if (
        !item
    ) {
        return null;
    }

    if (
        Date.now() -
            item.time >
            ANSWER_MEMORY_CONFIG_3
                .cacheTTL
    ) {

        memorySearchCache3.delete(
            key
        );

        return null;
    }

    return item.value;
}

function memoryCacheSet3(
    key,
    value
) {

    memorySearchCache3.set(
        key,
        {
            time:
                Date.now(),

            value
        }
    );

    if (
        memorySearchCache3.size >
        5000
    ) {

        const first =
            memorySearchCache3
                .keys()
                .next()
                .value;

        if (
            first
        ) {
            memorySearchCache3.delete(
                first
            );
        }
    }
}

// ======================================================================
// 3.26 — SEARCH ANSWER MEMORY
// ======================================================================

function searchAnswerMemory3(
    userId,
    question,
    options = {}
) {

    analyticsIncrement3(
        "totalSearches"
    );

    const uid =
        memoryString3(
            userId,
            "guest"
        );

    const query =
        memoryString3(
            question
        );

    if (
        !query
    ) {

        analyticsIncrement3(
            "totalMisses"
        );

        return {
            hit:
                false,

            answer:
                null,

            score:
                0,

            source:
                null,

            candidates:
                []
        };
    }

    const cacheKey =
        (
            uid +
            "::" +
            normalizeForSearch3(
                query
            )
        );

    const cached =
        memoryCacheGet3(
            cacheKey
        );

    if (
        cached
    ) {
        return cached;
    }

    const candidates =
        answerMemoryDB3.items
            .filter(
                item =>
                    item.userId ===
                        uid ||
                    item.userId ===
                        "global"
            )
            .map(
                item => {

                    const scores =
                        calculateMemoryScore3(
                            query,
                            item.question
                        );

                    return {
                        item,

                        ...scores
                    };
                }
            )
            .filter(
                item =>
                    item.score >=
                    (
                        Number.isFinite(
                            options.minimumScore
                        )
                            ? options.minimumScore
                            : ANSWER_MEMORY_CONFIG_3
                                .minimumMemoryScore
                    )
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    b.score -
                    a.score
            )
            .slice(
                0,
                Number(
                    options.limit
                ) ||
                10
            );

    const best =
        candidates[0];

    if (
        !best
    ) {

        analyticsIncrement3(
            "totalMisses"
        );

        const miss = {
            hit:
                false,

            answer:
                null,

            score:
                0,

            source:
                null,

            candidates:
                []
        };

        memoryCacheSet3(
            cacheKey,
            miss
        );

        return miss;
    }

    best.item.hits =
        Number(
            best.item.hits ||
            0
        ) +
        1;

    analyticsIncrement3(
        "totalHits"
    );

    analyticsSource3(
        best.item.source
    );

    analyticsUser3(
        uid
    );

    const result = {

        hit:
            true,

        answer:
            best.item.answer,

        score:
            best.score,

        source:
            best.item.source,

        memoryId:
            best.item.id,

        question:
            best.item.question,

        confidence:
            best.item.confidence,

        details: {
            exact:
                best.exact,

            cosine:
                best.cosine,

            jaccard:
                best.jaccard,

            character:
                best.character,

            keyword:
                best.keyword
        },

        candidates:
            candidates.map(
                candidate => ({
                    id:
                        candidate.item.id,

                    question:
                        candidate.item.question,

                    score:
                        candidate.score,

                    source:
                        candidate.item.source
                })
            )
    };

    memoryCacheSet3(
        cacheKey,
        result
    );

    saveAnswerMemoryDB3();
    saveMemoryAnalytics3();

    logMemoryEvent3({
        type:
            "search-hit",

        userId:
            uid,

        question:
            query,

        memoryId:
            best.item.id,

        score:
            best.score
    });

    return result;
}

// ======================================================================
// 3.27 — KNOWLEDGE SEARCH
// ======================================================================

function searchKnowledgeMemory3(
    question,
    options = {}
) {

    const query =
        memoryString3(
            question
        );

    if (
        !query
    ) {
        return {
            hit:
                false,

            answer:
                null,

            score:
                0,

            candidates:
                []
        };
    }

    const candidates =
        knowledgeMemoryDB3.items
            .map(
                item => {

                    const scores =
                        calculateMemoryScore3(
                            query,
                            item.question
                        );

                    return {
                        item,

                        ...scores
                    };
                }
            )
            .filter(
                item =>
                    item.score >=
                    (
                        Number.isFinite(
                            options.minimumScore
                        )
                            ? options.minimumScore
                            : ANSWER_MEMORY_CONFIG_3
                                .minimumKnowledgeScore
                    )
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    b.score -
                    a.score
            )
            .slice(
                0,
                Number(
                    options.limit
                ) ||
                10
            );

    const best =
        candidates[0];

    if (
        !best
    ) {

        return {
            hit:
                false,

            answer:
                null,

            score:
                0,

            candidates:
                []
        };
    }

    best.item.hits =
        Number(
            best.item.hits ||
            0
        ) +
        1;

    saveKnowledgeMemoryDB3();

    return {

        hit:
            true,

        answer:
            best.item.answer,

        score:
            best.score,

        source:
            best.item.source,

        knowledgeId:
            best.item.id,

        question:
            best.item.question,

        category:
            best.item.category,

        confidence:
            best.item.confidence,

        details: {
            exact:
                best.exact,

            cosine:
                best.cosine,

            jaccard:
                best.jaccard,

            character:
                best.character,

            keyword:
                best.keyword
        },

        candidates:
            candidates.map(
                candidate => ({
                    id:
                        candidate.item.id,

                    question:
                        candidate.item.question,

                    score:
                        candidate.score
                })
            )
    };
}

// ======================================================================
// 3.28 — COMBINED MEMORY SEARCH
// ======================================================================

function smartMemorySearch3(
    userId,
    question,
    options = {}
) {

    const answerMemory =
        searchAnswerMemory3(
            userId,
            question,
            {
                minimumScore:
                    options.minimumMemoryScore ||
                    ANSWER_MEMORY_CONFIG_3
                        .minimumMemoryScore,

                limit:
                    options.limit ||
                    8
            }
        );

    const knowledge =
        searchKnowledgeMemory3(
            question,
            {
                minimumScore:
                    options.minimumKnowledgeScore ||
                    ANSWER_MEMORY_CONFIG_3
                        .minimumKnowledgeScore,

                limit:
                    options.limit ||
                    8
            }
        );

    const strongest =
        [
            answerMemory.hit
                ? {
                    type:
                        "answer-memory",

                    score:
                        answerMemory.score,

                    answer:
                        answerMemory.answer,

                    data:
                        answerMemory
                }
                : null,

            knowledge.hit
                ? {
                    type:
                        "knowledge",

                    score:
                        knowledge.score,

                    answer:
                        knowledge.answer,

                    data:
                        knowledge
                }
                : null
        ]
            .filter(Boolean)
            .sort(
                (
                    a,
                    b
                ) =>
                    b.score -
                    a.score
            );

    return {

        hit:
            strongest.length >
            0,

        best:
            strongest[0] ||
            null,

        answerMemory,

        knowledge,

        candidates:
            strongest
    };
}

// ======================================================================
// 3.29 — LEARNING DETECTOR
// ======================================================================

function shouldAutoLearn3(
    question,
    answer,
    options = {}
) {

    if (
        !ANSWER_MEMORY_CONFIG_3
            .autoLearningEnabled
    ) {
        return false;
    }

    if (
        options.disableLearning
    ) {
        return false;
    }

    const q =
        memoryString3(
            question
        );

    const a =
        memoryString3(
            answer
        );

    if (
        !q ||
        !a
    ) {
        return false;
    }

    if (
        q.length <
        4
    ) {
        return false;
    }

    if (
        a.length <
        4
    ) {
        return false;
    }

    const dangerousPatterns = [
        "şifre",
        "parola",
        "api key",
        "api anahtarı",
        "token",
        "access token",
        "secret",
        "gizli anahtar"
    ];

    const combined =
        normalizeForSearch3(
            q +
            " " +
            a
        );

    for (
        const pattern
        of dangerousPatterns
    ) {

        if (
            combined.includes(
                normalizeForSearch3(
                    pattern
                )
            )
        ) {

            return false;
        }
    }

    return true;
}

// ======================================================================
// 3.30 — AUTOMATIC LEARNING
// ======================================================================

function autoLearnAnswer3(
    question,
    answer,
    options = {}
) {

    if (
        !shouldAutoLearn3(
            question,
            answer,
            options
        )
    ) {

        return {
            learned:
                false,

            reason:
                "learning-filter"
        };
    }

    const saved =
        saveKnowledgeMemory3(
            question,
            answer,
            {
                source:
                    options.source ||
                    "ai-auto-learning",

                category:
                    options.category ||
                    "general",

                confidence:
                    Number.isFinite(
                        options.confidence
                    )
                        ? options.confidence
                        : 0.80,

                tags:
                    options.tags ||
                    []
            }
        );

    if (
        saved.saved
    ) {

        analyticsIncrement3(
            "totalLearning"
        );

        saveMemoryAnalytics3();
    }

    return {
        learned:
            Boolean(
                saved.saved
            ),

        result:
            saved
    };
}

// ======================================================================
// 3.31 — QUERY TYPE DETECTION
// ======================================================================

function detectQuestionType3(
    question
) {

    const text =
        normalizeForSearch3(
            question
        );

    if (
        /\b(kim|nedir|ne demek)\b/.test(
            text
        )
    ) {
        return "definition";
    }

    if (
        /\b(nasil|nasıl|yapilir|yapılır)\b/.test(
            text
        )
    ) {
        return "how-to";
    }

    if (
        /\b(neden|sebep|niye)\b/.test(
            text
        )
    ) {
        return "why";
    }

    if (
        /\b(kod|javascript|python|html|css|java|c\+\+|c#|typescript)\b/.test(
            text
        )
    ) {
        return "coding";
    }

    if (
        /\b(fiyat|kur|dolar|euro|altin|altın)\b/.test(
            text
        )
    ) {
        return "market";
    }

    if (
        /\b(hava|sicaklik|sıcaklık|yağmur|kar)\b/.test(
            text
        )
    ) {
        return "weather";
    }

    if (
        /\b(guncel|güncel|bugun|bugün|simdi|şimdi|haber|son durum)\b/.test(
            text
        )
    ) {
        return "current";
    }

    if (
        question.trim().endsWith(
            "?"
        )
    ) {
        return "question";
    }

    return "general";
}

// ======================================================================
// 3.32 — MEMORY ROUTER
// ======================================================================

function routeMemory3(
    userId,
    question,
    options = {}
) {

    const questionType =
        detectQuestionType3(
            question
        );

    const combined =
        smartMemorySearch3(
            userId,
            question,
            options
        );

    if (
        questionType ===
        "current"
    ) {

        return {
            useMemory:
                false,

            reason:
                "current-information",

            questionType,

            combined
        };
    }

    if (
        questionType ===
        "weather" ||
        questionType ===
        "market"
    ) {

        return {
            useMemory:
                combined.hit &&
                combined.best.score >=
                    0.97,

            reason:
                "specialized-current-data",

            questionType,

            combined
        };
    }

    if (
        combined.hit &&
        combined.best.score >=
            ANSWER_MEMORY_CONFIG_3
                .strongMemoryScore
    ) {

        return {
            useMemory:
                true,

            reason:
                "strong-memory-hit",

            questionType,

            combined
        };
    }

    return {
        useMemory:
            false,

        reason:
            "no-strong-memory",

        questionType,

        combined
    };
}

// ======================================================================
// 3.33 — CHAT MEMORY PREPARATION
// ======================================================================

function prepareChatMemoryContext3(
    userId,
    question
) {

    const userContext =
        buildUserMemoryContext3(
            userId,
            6000
        );

    const memory =
        routeMemory3(
            userId,
            question
        );

    let answerMemoryContext =
        "";

    if (
        memory.combined &&
        memory.combined.best
    ) {

        answerMemoryContext =
            [
                "Eşleşen önceki bilgi:",

                memory
                    .combined
                    .best
                    .answer
            ].join(
                "\n"
            );
    }

    return {

        userContext,

        answerMemory:
            answerMemoryContext,

        memoryResult:
            memory,

        shouldUseMemory:
            memory.useMemory
    };
}

// ======================================================================
// 3.34 — SAVE USER MESSAGE CONTEXT
// ======================================================================

function learnUserContextFromMessage3(
    userId,
    message
) {

    const text =
        memoryString3(
            message
        );

    if (
        !text
    ) {
        return {
            updated:
                false
        };
    }

    addRecentTopic3(
        userId,
        text.slice(
            0,
            180
        )
    );

    const nameMatch =
        text.match(
            /(?:benim adım|benim ismim|adım|ismim)\s+([A-Za-zÇĞİÖŞÜçğıöşü0-9_-]{2,50})/i
        );

    if (
        nameMatch &&
        nameMatch[1]
    ) {

        setUserName3(
            userId,
            nameMatch[1]
        );
    }

    const projectMatch =
        text.match(
            /(?:projem|proje adı|projemin adı)\s*[:=]?\s*([A-Za-zÇĞİÖŞÜçğıöşü0-9._ -]{2,100})/i
        );

    if (
        projectMatch &&
        projectMatch[1]
    ) {

        addUserProject3(
            userId,
            projectMatch[1]
        );
    }

    return {
        updated:
            true
    };
}

// ======================================================================
// 3.35 — SMART MEMORY + AI BRIDGE
// ======================================================================

async function smartGenerateWithMemory3(
    userId,
    question,
    options = {}
) {

    const uid =
        memoryString3(
            userId,
            "guest"
        );

    const query =
        memoryString3(
            question
        );

    if (
        !query
    ) {
        throw new Error(
            "question_required"
        );
    }

    learnUserContextFromMessage3(
        uid,
        query
    );

    const prepared =
        prepareChatMemoryContext3(
            uid,
            query
        );

    if (
        prepared.shouldUseMemory &&
        prepared.memoryResult
            .combined &&
        prepared.memoryResult
            .combined
            .best
    ) {

        const memoryAnswer =
            prepared
                .memoryResult
                .combined
                .best
                .answer;

        return {

            ok:
                true,

            success:
                true,

            answer:
                memoryAnswer,

            source:
                "answer-memory",

            provider:
                "memory",

            model:
                "answer-memory-v3",

            memoryHit:
                true,

            memoryScore:
                prepared
                    .memoryResult
                    .combined
                    .best
                    .score,

            userMemory:
                prepared.userContext,

            aiUsed:
                false,

            researched:
                false
        };
    }

    const aiOptions = {

        ...options,

        memoryContext:
            prepared
                .userContext,

        answerMemoryContext:
            prepared
                .answerMemory
    };

    const result =
        await generateTurkAIResponse2(
            query,
            aiOptions
        );

    const answer =
        memoryString3(
            result.answer
        );

    if (
        answer
    ) {

        saveAnswerMemory3(
            uid,
            query,
            answer,
            {
                source:
                    result.source ||
                    "ai",

                confidence:
                    result.provider ===
                        "local"
                        ? 0.55
                        : 0.82,

                metadata: {
                    provider:
                        result.provider,

                    model:
                        result.model
                }
            }
        );

        if (
            ANSWER_MEMORY_CONFIG_3
                .autoLearningEnabled
        ) {

            autoLearnAnswer3(
                query,
                answer,
                {
                    source:
                        result.provider ===
                            "local"
                            ? "local-auto-learning"
                            : "ai-auto-learning"
                }
            );
        }
    }

    return {

        ...result,

        memoryHit:
            false,

        memoryScore:
            prepared
                .memoryResult
                .combined
                .best
                ? prepared
                    .memoryResult
                    .combined
                    .best
                    .score
                : 0,

        userMemory:
            prepared.userContext,

        aiUsed:
            true
    };
}

// ======================================================================
// 3.36 — MEMORY ROUTE
// ======================================================================

app.get(
    "/api/memory/search",
    (
        req,
        res
    ) => {

        const userId =
            memoryString3(
                req.query.userId,
                "guest"
            );

        const question =
            memoryString3(
                req.query.q ||
                req.query.question
            );

        if (
            !question
        ) {

            return res.status(
                400
            ).json({
                ok:
                    false,

                error:
                    "question_required"
            });
        }

        try {

            const result =
                smartMemorySearch3(
                    userId,
                    question
                );

            return res.json({
                ok:
                    true,

                success:
                    true,

                ...result
            });

        } catch (
            error
        ) {

            analyticsIncrement3(
                "totalErrors"
            );

            saveMemoryAnalytics3();

            return res.status(
                500
            ).json({
                ok:
                    false,

                error:
                    "memory_search_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 3.37 — MEMORY SAVE ROUTE
// ======================================================================

app.post(
    "/api/memory/save",
    (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const result =
            saveAnswerMemory3(
                body.userId ||
                    "guest",

                body.question,

                body.answer,

                {
                    source:
                        body.source ||
                        "manual",

                    confidence:
                        body.confidence,

                    tags:
                        body.tags,

                    metadata:
                        body.metadata
                }
            );

        return res.json(
            result
        );
    }
);

// ======================================================================
// 3.38 — KNOWLEDGE SAVE ROUTE
// ======================================================================

app.post(
    "/api/knowledge/save",
    (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const result =
            saveKnowledgeMemory3(
                body.question,

                body.answer,

                {
                    source:
                        body.source ||
                        "manual",

                    category:
                        body.category,

                    confidence:
                        body.confidence,

                    tags:
                        body.tags
                }
            );

        return res.json(
            result
        );
    }
);

// ======================================================================
// 3.39 — KNOWLEDGE SEARCH ROUTE
// ======================================================================

app.get(
    "/api/knowledge/search",
    (
        req,
        res
    ) => {

        const query =
            memoryString3(
                req.query.q ||
                req.query.question
            );

        if (
            !query
        ) {

            return res.status(
                400
            ).json({
                ok:
                    false,

                error:
                    "question_required"
            });
        }

        return res.json({
            ok:
                true,

            success:
                true,

            result:
                searchKnowledgeMemory3(
                    query
                )
        });
    }
);

// ======================================================================
// 3.40 — USER MEMORY API
// ======================================================================

app.get(
    "/api/memory/user/:userId",
    (
        req,
        res
    ) => {

        const user =
            ensureUserMemory3(
                req.params.userId
            );

        return res.json({
            ok:
                true,

            success:
                true,

            user
        });
    }
);

// ======================================================================
// 3.41 — SET USER NAME
// ======================================================================

app.post(
    "/api/memory/user/name",
    (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const result =
            setUserName3(
                body.userId ||
                    "guest",

                body.name
            );

        return res.json({
            ok:
                result,

            success:
                result
        });
    }
);

// ======================================================================
// 3.42 — ADD USER FACT
// ======================================================================

app.post(
    "/api/memory/user/fact",
    (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const result =
            addUserFact3(
                body.userId ||
                    "guest",

                body.fact
            );

        return res.json({
            ok:
                result,

            success:
                result
        });
    }
);

// ======================================================================
// 3.43 — ADD INTEREST
// ======================================================================

app.post(
    "/api/memory/user/interest",
    (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const result =
            addUserInterest3(
                body.userId ||
                    "guest",

                body.interest
            );

        return res.json({
            ok:
                result,

            success:
                result
        });
    }
);

// ======================================================================
// 3.44 — ADD PROJECT
// ======================================================================

app.post(
    "/api/memory/user/project",
    (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const result =
            addUserProject3(
                body.userId ||
                    "guest",

                body.project
            );

        return res.json({
            ok:
                result,

            success:
                result
        });
    }
);

// ======================================================================
// 3.45 — SET PREFERENCE
// ======================================================================

app.post(
    "/api/memory/user/preference",
    (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const result =
            setUserPreference3(
                body.userId ||
                    "guest",

                body.key,

                body.value
            );

        return res.json({
            ok:
                result,

            success:
                result
        });
    }
);

// ======================================================================
// 3.46 — MEMORY CONTEXT API
// ======================================================================

app.get(
    "/api/memory/context/:userId",
    (
        req,
        res
    ) => {

        const context =
            buildUserMemoryContext3(
                req.params.userId
            );

        return res.json({
            ok:
                true,

            success:
                true,

            context
        });
    }
);

// ======================================================================
// 3.47 — SMART MEMORY CHAT API
// ======================================================================

app.post(
    "/api/chat/memory",
    async (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const message =
            memoryString3(
                body.message ||
                body.prompt ||
                body.question
            );

        const userId =
            memoryString3(
                body.userId,
                "guest"
            );

        if (
            !message
        ) {

            return res.status(
                400
            ).json({
                ok:
                    false,

                error:
                    "message_required"
            });
        }

        try {

            const result =
                await smartGenerateWithMemory3(
                    userId,
                    message,
                    {
                        language:
                            body.language,

                        userName:
                            body.userName,

                        provider:
                            body.provider,

                        history:
                            body.history,

                        temperature:
                            body.temperature,

                        maxTokens:
                            body.maxTokens,

                        researchContext:
                            body.researchContext
                    }
                );

            return res.json(
                result
            );

        } catch (
            error
        ) {

            analyticsIncrement3(
                "totalErrors"
            );

            saveMemoryAnalytics3();

            return res.status(
                500
            ).json({
                ok:
                    false,

                error:
                    "memory_chat_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 3.48 — MEMORY AUTO ROUTER
// ======================================================================

app.post(
    "/api/memory/route",
    (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const userId =
            memoryString3(
                body.userId,
                "guest"
            );

        const question =
            memoryString3(
                body.question ||
                body.message ||
                body.query
            );

        if (
            !question
        ) {

            return res.status(
                400
            ).json({
                ok:
                    false,

                error:
                    "question_required"
            });
        }

        return res.json({
            ok:
                true,

            success:
                true,

            result:
                routeMemory3(
                    userId,
                    question
                )
        });
    }
);

// ======================================================================
// 3.49 — MEMORY ANALYTICS
// ======================================================================

app.get(
    "/api/memory/analytics",
    (
        req,
        res
    ) => {

        return res.json({
            ok:
                true,

            success:
                true,

            analytics:
                memoryAnalytics3,

            counts: {
                answerMemory:
                    answerMemoryDB3
                        .items
                        .length,

                knowledge:
                    knowledgeMemoryDB3
                        .items
                        .length,

                users:
                    Object.keys(
                        userMemoryDB3.users
                    ).length,

                cache:
                    memorySearchCache3
                        .size
            }
        });
    }
);

// ======================================================================
// 3.50 — MEMORY EXPORT
// ======================================================================

app.get(
    "/api/memory/export",
    (
        req,
        res
    ) => {

        const userId =
            memoryString3(
                req.query.userId,
                ""
            );

        if (
            !userId
        ) {

            return res.status(
                400
            ).json({
                ok:
                    false,

                error:
                    "userId_required"
            });
        }

        const memories =
            answerMemoryDB3.items
                .filter(
                    item =>
                        item.userId ===
                        userId
                );

        const user =
            ensureUserMemory3(
                userId
            );

        return res.json({
            ok:
                true,

            success:
                true,

            export: {
                version:
                    "3.0",

                user,

                memories,

                exportedAt:
                    memoryNow3()
            }
        });
    }
);

// ======================================================================
// 3.51 — MEMORY DELETE
// ======================================================================

app.delete(
    "/api/memory/:id",
    (
        req,
        res
    ) => {

        const id =
            memoryString3(
                req.params.id
            );

        const index =
            answerMemoryDB3.items
                .findIndex(
                    item =>
                        item.id ===
                        id
                );

        if (
            index ===
            -1
        ) {

            return res.status(
                404
            ).json({
                ok:
                    false,

                error:
                    "memory_not_found"
            });
        }

        answerMemoryDB3.items.splice(
            index,
            1
        );

        memorySearchCache3.clear();

        saveAnswerMemoryDB3();

        return res.json({
            ok:
                true,

            success:
                true,

            deleted:
                id
        });
    }
);

// ======================================================================
// 3.52 — KNOWLEDGE DELETE
// ======================================================================

app.delete(
    "/api/knowledge/:id",
    (
        req,
        res
    ) => {

        const id =
            memoryString3(
                req.params.id
            );

        const index =
            knowledgeMemoryDB3.items
                .findIndex(
                    item =>
                        item.id ===
                        id
                );

        if (
            index ===
            -1
        ) {

            return res.status(
                404
            ).json({
                ok:
                    false,

                error:
                    "knowledge_not_found"
            });
        }

        knowledgeMemoryDB3.items.splice(
            index,
            1
        );

        saveKnowledgeMemoryDB3();

        return res.json({
            ok:
                true,

            success:
                true,

            deleted:
                id
        });
    }
);

// ======================================================================
// 3.53 — CLEAR USER MEMORY
// ======================================================================

app.delete(
    "/api/memory/user/:userId",
    (
        req,
        res
    ) => {

        const userId =
            memoryString3(
                req.params.userId
            );

        let changed =
            false;

        const before =
            answerMemoryDB3
                .items
                .length;

        answerMemoryDB3.items =
            answerMemoryDB3.items
                .filter(
                    item =>
                        item.userId !==
                        userId
                );

        if (
            answerMemoryDB3.items
                .length !==
            before
        ) {

            changed =
                true;
        }

        if (
            userMemoryDB3.users[
                userId
            ]
        ) {

            delete userMemoryDB3.users[
                userId
            ];

            changed =
                true;
        }

        memorySearchCache3.clear();

        saveAnswerMemoryDB3();
        saveUserMemoryDB3();

        return res.json({
            ok:
                true,

            success:
                true,

            changed
        });
    }
);

// ======================================================================
// 3.54 — MEMORY RESET CACHE
// ======================================================================

app.post(
    "/api/memory/cache/reset",
    (
        req,
        res
    ) => {

        memorySearchCache3.clear();

        return res.json({
            ok:
                true,

            success:
                true,

            cacheSize:
                memorySearchCache3.size
        });
    }
);

// ======================================================================
// 3.55 — MEMORY HEALTH
// ======================================================================

app.get(
    "/api/memory/health",
    (
        req,
        res
    ) => {

        const healthy =
            Boolean(
                answerMemoryDB3 &&
                knowledgeMemoryDB3 &&
                userMemoryDB3 &&
                memoryAnalytics3
            );

        return res.json({
            ok:
                healthy,

            success:
                healthy,

            engine:
                "Answer Memory 3.0",

            enabled:
                ANSWER_MEMORY_CONFIG_3
                    .enabled,

            knowledgeEnabled:
                ANSWER_MEMORY_CONFIG_3
                    .knowledgeEnabled,

            autoLearning:
                ANSWER_MEMORY_CONFIG_3
                    .autoLearningEnabled,

            counts: {
                answers:
                    answerMemoryDB3
                        .items
                        .length,

                knowledge:
                    knowledgeMemoryDB3
                        .items
                        .length,

                users:
                    Object.keys(
                        userMemoryDB3.users
                    ).length
            }
        });
    }
);

// ======================================================================
// 3.56 — MEMORY STATE BRIDGE
// ======================================================================

serverState.memory =
    serverState.memory ||
    {};

serverState.memory.enabled =
    ANSWER_MEMORY_CONFIG_3
        .enabled;

serverState.memory.config =
    ANSWER_MEMORY_CONFIG_3;

serverState.memory.answers =
    answerMemoryDB3;

serverState.memory.knowledge =
    knowledgeMemoryDB3;

serverState.memory.users =
    userMemoryDB3;

serverState.memory.analytics =
    memoryAnalytics3;

serverState.memory.search =
    searchAnswerMemory3;

serverState.memory.searchKnowledge =
    searchKnowledgeMemory3;

serverState.memory.smartSearch =
    smartMemorySearch3;

serverState.memory.save =
    saveAnswerMemory3;

serverState.memory.learn =
    autoLearnAnswer3;

serverState.memory.context =
    buildUserMemoryContext3;

serverState.memory.route =
    routeMemory3;

serverState.memory.smartChat =
    smartGenerateWithMemory3;

// ======================================================================
// 3.57 — GLOBAL MEMORY BRIDGE
// ======================================================================

global.turkAI =
    global.turkAI ||
    {};

global.turkAI.memory =
    global.turkAI.memory ||
    {};

global.turkAI.memory.search =
    searchAnswerMemory3;

global.turkAI.memory.searchKnowledge =
    searchKnowledgeMemory3;

global.turkAI.memory.save =
    saveAnswerMemory3;

global.turkAI.memory.learn =
    autoLearnAnswer3;

global.turkAI.memory.context =
    buildUserMemoryContext3;

global.turkAI.memory.smart =
    smartGenerateWithMemory3;

global.turkAI.memory.analytics =
    memoryAnalytics3;

// ======================================================================
// 3.58 — COMPATIBILITY NAMES
// ======================================================================

const searchAnswerMemory =
    searchAnswerMemory3;

const searchKnowledgeMemory =
    searchKnowledgeMemory3;

const saveAnswerMemory =
    saveAnswerMemory3;

const autoLearnAnswer =
    autoLearnAnswer3;

const getUserMemoryContext =
    buildUserMemoryContext3;

// ======================================================================
// 3.59 — STARTUP PERSISTENCE
// ======================================================================

saveAnswerMemoryDB3();
saveKnowledgeMemoryDB3();
saveUserMemoryDB3();
saveMemoryAnalytics3();

// ======================================================================
// 3.60 — STARTUP LOG
// ======================================================================

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

console.log(
    "TürkAI Master Server — PART 3/10"
);

console.log(
    "Answer Memory Engine: AKTİF"
);

console.log(
    "Knowledge Base:",
    ANSWER_MEMORY_CONFIG_3
        .knowledgeEnabled
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "User Memory:",
    ANSWER_MEMORY_CONFIG_3
        .userMemoryEnabled
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Semantic Search:",
    ANSWER_MEMORY_CONFIG_3
        .semanticSearchEnabled
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Auto Learning:",
    ANSWER_MEMORY_CONFIG_3
        .autoLearningEnabled
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Answer Memories:",
    answerMemoryDB3
        .items
        .length
);

console.log(
    "Knowledge Items:",
    knowledgeMemoryDB3
        .items
        .length
);

console.log(
    "Users:",
    Object.keys(
        userMemoryDB3.users
    ).length
);

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

/*
========================================================================
 PART 3 END

 SONRA:
 PART 4 / 10
 INTERNET RESEARCH ENGINE
========================================================================
*/
/*
========================================================================
 TÜRKAI MASTER SERVER 50.0
 PART 4 / 10
 INTERNET RESEARCH ENGINE
========================================================================
*/

"use strict";

// ======================================================================
// 4.0 — RESEARCH CONFIG
// ======================================================================

const TURKAI_RESEARCH_CONFIG_4 = {

    enabled:
        true,

    cacheEnabled:
        true,

    historyEnabled:
        true,

    directURL:
        true,

    duckDuckGo:
        true,

    wikipedia:
        true,

    maxSources:
        12,

    maxSearchResults:
        10,

    maxContextLength:
        18000,

    timeoutMs:
        15000,

    cacheTTL:
        5 * 60 * 1000,

    historyLimit:
        5000,

    requestUserAgent:
        "Mozilla/5.0 TürkAI Research Engine/50.0",

    language:
        "tr",

    safeMode:
        true
};

// ======================================================================
// 4.1 — RESEARCH DIRECTORIES
// ======================================================================

const TURKAI_RESEARCH_DIR_4 =
    path.join(
        DATA_DIR,
        "research"
    );

const TURKAI_RESEARCH_CACHE_DIR_4 =
    path.join(
        TURKAI_RESEARCH_DIR_4,
        "cache"
    );

const TURKAI_RESEARCH_HISTORY_DIR_4 =
    path.join(
        TURKAI_RESEARCH_DIR_4,
        "history"
    );

const TURKAI_RESEARCH_SOURCE_DIR_4 =
    path.join(
        TURKAI_RESEARCH_DIR_4,
        "sources"
    );

const TURKAI_RESEARCH_STATS_FILE_4 =
    path.join(
        TURKAI_RESEARCH_DIR_4,
        "stats.json"
    );

const TURKAI_RESEARCH_SETTINGS_FILE_4 =
    path.join(
        TURKAI_RESEARCH_DIR_4,
        "settings.json"
    );

[
    TURKAI_RESEARCH_DIR_4,
    TURKAI_RESEARCH_CACHE_DIR_4,
    TURKAI_RESEARCH_HISTORY_DIR_4,
    TURKAI_RESEARCH_SOURCE_DIR_4
].forEach(
    ensureDir
);

// ======================================================================
// 4.2 — RESEARCH STATS
// ======================================================================

let TURKAI_RESEARCH_STATS_4 =
    readJSON(
        TURKAI_RESEARCH_STATS_FILE_4,
        {
            version:
                "4.0",

            totalRequests:
                0,

            successfulRequests:
                0,

            failedRequests:
                0,

            cacheHits:
                0,

            cacheMisses:
                0,

            duckDuckGoRequests:
                0,

            wikipediaRequests:
                0,

            directURLRequests:
                0,

            sourceCount:
                0,

            historyCount:
                0,

            averageSources:
                0,

            lastRequestAt:
                null,

            lastSuccessAt:
                null,

            lastErrorAt:
                null,

            lastError:
                null
        }
    );

if (
    !TURKAI_RESEARCH_STATS_4 ||
    typeof TURKAI_RESEARCH_STATS_4 !==
        "object"
) {
    TURKAI_RESEARCH_STATS_4 = {
        version:
            "4.0",

        totalRequests:
            0,

        successfulRequests:
            0,

        failedRequests:
            0,

        cacheHits:
            0,

        cacheMisses:
            0,

        duckDuckGoRequests:
            0,

        wikipediaRequests:
            0,

        directURLRequests:
            0,

        sourceCount:
            0,

        historyCount:
            0,

        averageSources:
            0,

        lastRequestAt:
            null,

        lastSuccessAt:
            null,

        lastErrorAt:
            null,

        lastError:
            null
    };
}

// ======================================================================
// 4.3 — SETTINGS
// ======================================================================

let TURKAI_RESEARCH_SETTINGS_4 =
    readJSON(
        TURKAI_RESEARCH_SETTINGS_FILE_4,
        {
            enabled:
                true,

            cache:
                true,

            history:
                true,

            directURL:
                true,

            duckDuckGo:
                true,

            wikipedia:
                true,

            maxSources:
                12,

            timeoutMs:
                15000
        }
    );

if (
    !TURKAI_RESEARCH_SETTINGS_4 ||
    typeof TURKAI_RESEARCH_SETTINGS_4 !==
        "object"
) {
    TURKAI_RESEARCH_SETTINGS_4 = {};
}

for (
    const key of Object.keys(
        {
            enabled:
                true,

            cache:
                true,

            history:
                true,

            directURL:
                true,

            duckDuckGo:
                true,

            wikipedia:
                true
        }
    )
) {

    if (
        TURKAI_RESEARCH_SETTINGS_4[
            key
        ] ===
            undefined
    ) {

        TURKAI_RESEARCH_SETTINGS_4[
            key
        ] =
            true;
    }
}

writeJSON(
    TURKAI_RESEARCH_SETTINGS_FILE_4,
    TURKAI_RESEARCH_SETTINGS_4
);

// ======================================================================
// 4.4 — RUNTIME CACHE
// ======================================================================

const TURKAI_RESEARCH_CACHE_4 =
    new Map();

const TURKAI_RESEARCH_IN_FLIGHT_4 =
    new Map();

// ======================================================================
// 4.5 — UTILITY FUNCTIONS
// ======================================================================

function researchString4(
    value,
    fallback = ""
) {

    if (
        value ===
            null ||
        value ===
            undefined
    ) {
        return fallback;
    }

    return String(
        value
    ).trim();
}

function researchNormalize4(
    value
) {

    return researchString4(
        value
    )
        .toLocaleLowerCase(
            "tr-TR"
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function researchKey4(
    value
) {

    return crypto
        .createHash(
            "sha256"
        )
        .update(
            researchNormalize4(
                value
            ),
            "utf8"
        )
        .digest(
            "hex"
        );
}

function researchNow4() {
    return new Date()
        .toISOString();
}

function researchId4(
    prefix =
        "research"
) {

    return (
        prefix +
        "_" +
        Date.now().toString(
            36
        ) +
        "_" +
        crypto
            .randomBytes(
                6
            )
            .toString(
                "hex"
            )
    );
}

function clamp4(
    value,
    min,
    max
) {

    return Math.min(
        max,
        Math.max(
            min,
            value
        )
    );
}

// ======================================================================
// 4.6 — HTML CLEANING
// ======================================================================

function decodeEntities4(
    value
) {

    return researchString4(
        value
    )
        .replace(
            /&nbsp;/gi,
            " "
        )
        .replace(
            /&amp;/gi,
            "&"
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
            /&lt;/gi,
            "<"
        )
        .replace(
            /&gt;/gi,
            ">"
        )
        .replace(
            /&#(\d+);/g,
            (
                full,
                number
            ) => {

                const code =
                    Number(
                        number
                    );

                if (
                    !Number.isFinite(
                        code
                    )
                ) {
                    return full;
                }

                try {
                    return String.fromCodePoint(
                        code
                    );
                } catch {
                    return full;
                }
            }
        );
}

function stripHTML4(
    html
) {

    return decodeEntities4(
        researchString4(
            html
        )
            .replace(
                /<script[\s\S]*?<\/script>/gi,
                " "
            )
            .replace(
                /<style[\s\S]*?<\/style>/gi,
                " "
            )
            .replace(
                /<noscript[\s\S]*?<\/noscript>/gi,
                " "
            )
            .replace(
                /<svg[\s\S]*?<\/svg>/gi,
                " "
            )
            .replace(
                /<iframe[\s\S]*?<\/iframe>/gi,
                " "
            )
            .replace(
                /<[^>]+>/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim()
    );
}

// ======================================================================
// 4.7 — URL VALIDATOR
// ======================================================================

function isSafeResearchURL4(
    value
) {

    try {

        const url =
            new URL(
                value
            );

        if (
            ![
                "http:",
                "https:"
            ].includes(
                url.protocol
            )
        ) {

            return false;
        }

        const hostname =
            url.hostname.toLowerCase();

        if (
            hostname ===
                "localhost" ||
            hostname ===
                "127.0.0.1" ||
            hostname ===
                "0.0.0.0" ||
            hostname.endsWith(
                ".local"
            )
        ) {

            return false;
        }

        return true;

    } catch {

        return false;
    }
}

// ======================================================================
// 4.8 — QUERY NORMALIZATION
// ======================================================================

function prepareResearchQuery4(
    query
) {

    let text =
        researchString4(
            query
        );

    text =
        text.replace(
            /\s+/g,
            " "
        );

    if (
        text.length >
        1000
    ) {
        text =
            text.slice(
                0,
                1000
            );
    }

    return text;
}

// ======================================================================
// 4.9 — RESEARCH INTENT
// ======================================================================

function detectResearchIntent4(
    query
) {

    const text =
        researchNormalize4(
            query
        );

    const current =
        [
            "bugün",
            "şimdi",
            "güncel",
            "son dakika",
            "en son",
            "şu an",
            "mevcut",
            "2026",
            "haber",
            "fiyat",
            "kur",
            "maç",
            "hava",
            "hava durumu"
        ].some(
            item =>
                text.includes(
                    item
                )
        );

    const technical =
        [
            "npm",
            "node",
            "javascript",
            "python",
            "github",
            "api",
            "dokümantasyon",
            "documentation",
            "react",
            "android",
            "android studio",
            "gradle"
        ].some(
            item =>
                text.includes(
                    item
                )
        );

    const fact =
        [
            "nedir",
            "kimdir",
            "ne demek",
            "hangi yıl",
            "ne zaman",
            "nerede",
            "kaç"
        ].some(
            item =>
                text.includes(
                    item
                )
        );

    return {
        current,
        technical,
        fact,

        likelyResearch:
            current ||
            technical ||
            fact
    };
}

// ======================================================================
// 4.10 — CACHE HELPERS
// ======================================================================

function getResearchCache4(
    key
) {

    if (
        !TURKAI_RESEARCH_SETTINGS_4
            .cache
    ) {
        return null;
    }

    const memoryItem =
        TURKAI_RESEARCH_CACHE_4.get(
            key
        );

    if (
        memoryItem
    ) {

        if (
            Date.now() -
                memoryItem.timestamp <
                TURKAI_RESEARCH_CONFIG_4
                    .cacheTTL
        ) {

            TURKAI_RESEARCH_STATS_4
                .cacheHits++;

            return memoryItem.data;
        }

        TURKAI_RESEARCH_CACHE_4.delete(
            key
        );
    }

    const cacheFile =
        path.join(
            TURKAI_RESEARCH_CACHE_DIR_4,
            `${key}.json`
        );

    const fileData =
        readJSON(
            cacheFile,
            null
        );

    if (
        fileData &&
        fileData.timestamp
    ) {

        const age =
            Date.now() -
            new Date(
                fileData.timestamp
            ).getTime();

        if (
            Number.isFinite(
                age
            ) &&
            age <
                TURKAI_RESEARCH_CONFIG_4
                    .cacheTTL
        ) {

            TURKAI_RESEARCH_STATS_4
                .cacheHits++;

            TURKAI_RESEARCH_CACHE_4.set(
                key,
                fileData
            );

            return fileData.data;
        }
    }

    TURKAI_RESEARCH_STATS_4
        .cacheMisses++;

    return null;
}

function setResearchCache4(
    key,
    data
) {

    if (
        !TURKAI_RESEARCH_SETTINGS_4
            .cache
    ) {
        return;
    }

    const wrapped = {

        timestamp:
            researchNow4(),

        data
    };

    TURKAI_RESEARCH_CACHE_4.set(
        key,
        wrapped
    );

    writeJSON(
        path.join(
            TURKAI_RESEARCH_CACHE_DIR_4,
            `${key}.json`
        ),
        wrapped
    );

    if (
        TURKAI_RESEARCH_CACHE_4.size >
        1000
    ) {

        const oldest =
            TURKAI_RESEARCH_CACHE_4
                .keys()
                .next()
                .value;

        if (
            oldest
        ) {

            TURKAI_RESEARCH_CACHE_4.delete(
                oldest
            );
        }
    }
}

// ======================================================================
// 4.11 — DUCKDUCKGO RESULT PARSER
// ======================================================================

function parseDuckDuckGo4(
    html
) {

    const results =
        [];

    const source =
        researchString4(
            html
        );

    const patterns = [

        /result__a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,

        /result__a[^>]*href='([^']+)'[^>]*>([\s\S]*?)<\/a>/gi
    ];

    for (
        const regex of patterns
    ) {

        let match;

        while (
            (
                match =
                    regex.exec(
                        source
                    )
            ) &&
            results.length <
                TURKAI_RESEARCH_CONFIG_4
                    .maxSearchResults
        ) {

            const url =
                decodeEntities4(
                    match[1]
                );

            const title =
                stripHTML4(
                    match[2]
                );

            if (
                title &&
                url
            ) {

                results.push({
                    title,

                    url,

                    source:
                        "duckduckgo"
                });
            }
        }

        if (
            results.length
        ) {
            break;
        }
    }

    return results;
}

// ======================================================================
// 4.12 — DUCKDUCKGO SEARCH
// ======================================================================

async function researchDuckDuckGo4(
    query
) {

    TURKAI_RESEARCH_STATS_4
        .duckDuckGoRequests++;

    const searchURL =
        "https://html.duckduckgo.com/html/?q=" +
        encodeURIComponent(
            query
        );

    const response =
        await aiFetch2(
            searchURL,
            {
                method:
                    "GET",

                headers: {
                    "User-Agent":
                        TURKAI_RESEARCH_CONFIG_4
                            .requestUserAgent,

                    Accept:
                        "text/html,application/xhtml+xml"
                }
            },
            TURKAI_RESEARCH_CONFIG_4
                .timeoutMs
        );

    if (
        !response.ok
    ) {

        throw new Error(
            "duckduckgo_http_" +
            response.status
        );
    }

    const html =
        await response.text();

    const results =
        parseDuckDuckGo4(
            html
        );

    return results;
}

// ======================================================================
// 4.13 — WIKIPEDIA SEARCH API
// ======================================================================

async function researchWikipedia4(
    query
) {

    TURKAI_RESEARCH_STATS_4
        .wikipediaRequests++;

    const url =
        "https://tr.wikipedia.org/w/api.php" +
        "?action=query" +
        "&format=json" +
        "&utf8=1" +
        "&origin=*" +
        "&list=search" +
        "&srlimit=" +
        encodeURIComponent(
            Math.min(
                10,
                TURKAI_RESEARCH_CONFIG_4
                    .maxSearchResults
            )
        ) +
        "&srprop=snippet|titlesnippet" +
        "&srsearch=" +
        encodeURIComponent(
            query
        );

    const response =
        await aiFetch2(
            url,
            {
                method:
                    "GET",

                headers: {
                    "User-Agent":
                        TURKAI_RESEARCH_CONFIG_4
                            .requestUserAgent,

                    Accept:
                        "application/json"
                }
            },
            TURKAI_RESEARCH_CONFIG_4
                .timeoutMs
        );

    if (
        !response.ok
    ) {

        throw new Error(
            "wikipedia_http_" +
            response.status
        );
    }

    const data =
        await response.json();

    const items =
        data &&
        data.query &&
        Array.isArray(
            data.query.search
        )
            ? data.query.search
            : [];

    return items
        .slice(
            0,
            TURKAI_RESEARCH_CONFIG_4
                .maxSearchResults
        )
        .map(
            item => ({
                title:
                    stripHTML4(
                        item.title
                    ),

                snippet:
                    stripHTML4(
                        item.snippet
                    ),

                url:
                    "https://tr.wikipedia.org/wiki/" +
                    encodeURIComponent(
                        String(
                            item.title
                        ).replace(
                            / /g,
                            "_"
                        )
                    ),

                source:
                    "wikipedia"
            })
        );
}

// ======================================================================
// 4.14 — WIKIPEDIA SUMMARY
// ======================================================================

async function researchWikipediaSummary4(
    title
) {

    const encoded =
        encodeURIComponent(
            title
        );

    const url =
        "https://tr.wikipedia.org/api/rest_v1/page/summary/" +
        encoded;

    try {

        const response =
            await aiFetch2(
                url,
                {
                    headers: {
                        "User-Agent":
                            TURKAI_RESEARCH_CONFIG_4
                                .requestUserAgent,

                        Accept:
                            "application/json"
                    }
                },
                TURKAI_RESEARCH_CONFIG_4
                    .timeoutMs
            );

        if (
            !response.ok
        ) {
            return null;
        }

        const data =
            await response.json();

        if (
            !data
        ) {
            return null;
        }

        return {

            title:
                researchString4(
                    data.title ||
                    title
                ),

            description:
                researchString4(
                    data.description
                ),

            extract:
                researchString4(
                    data.extract
                ),

            url:
                data.content_urls &&
                data.content_urls.desktop &&
                data.content_urls.desktop.page
                    ? data.content_urls.desktop.page
                    : "https://tr.wikipedia.org/wiki/" +
                      encodeURIComponent(
                          String(
                              title
                          ).replace(
                              / /g,
                              "_"
                          )
                      ),

            source:
                "wikipedia-summary"
        };

    } catch {

        return null;
    }
}

// ======================================================================
// 4.15 — DIRECT URL FETCH
// ======================================================================

async function researchDirectURL4(
    input
) {

    const value =
        researchString4(
            input
        );

    if (
        !isSafeResearchURL4(
            value
        )
    ) {

        throw new Error(
            "invalid_or_unsafe_url"
        );
    }

    TURKAI_RESEARCH_STATS_4
        .directURLRequests++;

    const response =
        await aiFetch2(
            value,
            {
                method:
                    "GET",

                headers: {
                    "User-Agent":
                        TURKAI_RESEARCH_CONFIG_4
                            .requestUserAgent,

                    Accept:
                        "text/html,text/plain,application/json"
                }
            },
            TURKAI_RESEARCH_CONFIG_4
                .timeoutMs
        );

    if (
        !response.ok
    ) {

        throw new Error(
            "direct_url_http_" +
            response.status
        );
    }

    const contentType =
        response.headers.get(
            "content-type"
        ) ||
        "";

    if (
        contentType.includes(
            "application/json"
        )
    ) {

        const data =
            await response.json();

        return {

            title:
                value,

            url:
                value,

            content:
                JSON.stringify(
                    data,
                    null,
                    2
                ).slice(
                    0,
                    TURKAI_RESEARCH_CONFIG_4
                        .maxContextLength
                ),

            contentType:
                "application/json",

            source:
                "direct-url"
        };
    }

    const html =
        await response.text();

    const content =
        stripHTML4(
            html
        );

    return {

        title:
            value,

        url:
            value,

        content:
            content.slice(
                0,
                TURKAI_RESEARCH_CONFIG_4
                    .maxContextLength
            ),

        contentType:
            contentType,

        source:
            "direct-url"
    };
}

// ======================================================================
// 4.16 — SOURCE NORMALIZER
// ======================================================================

function normalizeResearchSource4(
    source
) {

    if (
        !source ||
        typeof source !==
            "object"
    ) {
        return null;
    }

    const title =
        researchString4(
            source.title ||
            source.name
        );

    const url =
        researchString4(
            source.url
        );

    const snippet =
        researchString4(
            source.snippet ||
            source.extract ||
            source.description ||
            source.content
        );

    if (
        !title &&
        !url &&
        !snippet
    ) {
        return null;
    }

    return {

        id:
            researchId4(
                "source"
            ),

        title:
            title ||
            "Kaynak",

        url:
            url ||
            null,

        snippet:
            snippet.slice(
                0,
                5000
            ),

        source:
            researchString4(
                source.source,
                "unknown"
            ),

        retrievedAt:
            researchNow4()
    };
}

// ======================================================================
// 4.17 — DEDUPLICATION
// ======================================================================

function deduplicateResearchSources4(
    sources
) {

    const output =
        [];

    const seenURLs =
        new Set();

    const seenTitles =
        new Set();

    for (
        const raw of sources
    ) {

        const source =
            normalizeResearchSource4(
                raw
            );

        if (
            !source
        ) {
            continue;
        }

        const urlKey =
            source.url
                ? source.url
                    .toLowerCase()
                : "";

        const titleKey =
            normalizeResearch4(
                source.title
            );

        if (
            urlKey &&
            seenURLs.has(
                urlKey
            )
        ) {
            continue;
        }

        if (
            titleKey &&
            seenTitles.has(
                titleKey
            )
        ) {
            continue;
        }

        if (
            urlKey
        ) {
            seenURLs.add(
                urlKey
            );
        }

        if (
            titleKey
        ) {
            seenTitles.add(
                titleKey
            );
        }

        output.push(
            source
        );

        if (
            output.length >=
            TURKAI_RESEARCH_CONFIG_4
                .maxSources
        ) {
            break;
        }
    }

    return output;
}

// ======================================================================
// 4.18 — SOURCE SCORING
// ======================================================================

function scoreResearchSource4(
    source,
    query
) {

    const q =
        researchString4(
            query
        );

    const title =
        researchString4(
            source.title
        );

    const snippet =
        researchString4(
            source.snippet
        );

    const titleScore =
        scoreText(
            q,
            title
        );

    const snippetScore =
        scoreText(
            q,
            snippet
        );

    let domainBonus =
        0;

    try {

        if (
            source.url
        ) {

            const hostname =
                new URL(
                    source.url
                ).hostname
                    .toLowerCase();

            if (
                hostname.includes(
                    "wikipedia.org"
                )
            ) {
                domainBonus =
                    0.15;
            }

            if (
                hostname.includes(
                    "github.com"
                )
            ) {
                domainBonus =
                    0.12;
            }

            if (
                hostname.includes(
                    "microsoft.com"
                )
            ) {
                domainBonus =
                    0.12;
            }

            if (
                hostname.includes(
                    "nodejs.org"
                )
            ) {
                domainBonus =
                    0.15;
            }

            if (
                hostname.includes(
                    "developer.mozilla.org"
                )
            ) {
                domainBonus =
                    0.15;
            }
        }

    } catch {
        domainBonus =
            0;
    }

    return clamp4(
        (
            titleScore *
            0.50
        ) +
        (
            snippetScore *
            0.35
        ) +
        domainBonus,
        0,
        1
    );
}

// ======================================================================
// 4.19 — RESEARCH SOURCE RANKING
// ======================================================================

function rankResearchSources4(
    sources,
    query
) {

    return sources
        .map(
            source => ({
                ...source,

                score:
                    scoreResearchSource4(
                        source,
                        query
                    )
            })
        )
        .sort(
            (
                a,
                b
            ) =>
                b.score -
                a.score
        )
        .slice(
            0,
            TURKAI_RESEARCH_CONFIG_4
                .maxSources
        );
}

// ======================================================================
// 4.20 — QUERY EXTRACTION
// ======================================================================

function extractURL4(
    text
) {

    const match =
        researchString4(
            text
        ).match(
            /https?:\/\/[^\s<>"']+/i
        );

    if (
        !match
    ) {
        return null;
    }

    let url =
        match[0];

    url =
        url.replace(
            /[),.;!?]+$/g,
            ""
        );

    return isSafeResearchURL4(
        url
    )
        ? url
        : null;
}

// ======================================================================
// 4.21 — RESEARCH HISTORY
// ======================================================================

function saveResearchHistory4(
    result
) {

    if (
        !TURKAI_RESEARCH_SETTINGS_4
            .history
    ) {
        return;
    }

    const id =
        researchId4(
            "history"
        );

    const file =
        path.join(
            TURKAI_RESEARCH_HISTORY_DIR_4,
            `${id}.json`
        );

    const record = {

        id,

        timestamp:
            researchNow4(),

        query:
            result.query,

        sourceCount:
            Array.isArray(
                result.sources
            )
                ? result.sources.length
                : 0,

        sources:
            result.sources || [],

        intent:
            result.intent || null,

        cache:
            Boolean(
                result.cache
            )
    };

    writeJSON(
        file,
        record
    );

    TURKAI_RESEARCH_STATS_4
        .historyCount++;
}

// ======================================================================
// 4.22 — RESEARCH SOURCE ARCHIVE
// ======================================================================

function archiveResearchSources4(
    result
) {

    if (
        !Array.isArray(
            result.sources
        )
    ) {
        return;
    }

    for (
        const source
        of result.sources
    ) {

        const sourceFile =
            path.join(
                TURKAI_RESEARCH_SOURCE_DIR_4,
                `${source.id}.json`
            );

        writeJSON(
            sourceFile,
            {
                ...source,

                query:
                    result.query,

                researchId:
                    result.id
            }
        );
    }
}

// ======================================================================
// 4.23 — CONTEXT BUILDER
// ======================================================================

function buildResearchContext4(
    query,
    sources
) {

    const pieces =
        [];

    pieces.push(
        `Araştırma sorusu: ${query}`
    );

    if (
        !sources.length
    ) {

        pieces.push(
            "Uygun kaynak bulunamadı."
        );

        return pieces.join(
            "\n\n"
        );
    }

    pieces.push(
        "Kaynaklar:"
    );

    sources.forEach(
        (
            source,
            index
        ) => {

            pieces.push(
                [
                    `#${index + 1}`,

                    `Başlık: ${source.title}`,

                    source.url
                        ? `URL: ${source.url}`
                        : "",

                    source.snippet
                        ? `İçerik: ${source.snippet}`
                        : "",

                    `Kaynak türü: ${source.source}`
                ]
                    .filter(Boolean)
                    .join(
                        "\n"
                    )
            );
        }
    );

    return pieces
        .join(
            "\n\n"
        )
        .slice(
            0,
            TURKAI_RESEARCH_CONFIG_4
                .maxContextLength
        );
}

// ======================================================================
// 4.24 — RESEARCH ANSWER PROMPT
// ======================================================================

function buildResearchAIPrompt4(
    query,
    context
) {

    return `
Aşağıdaki araştırma kaynaklarını kullanarak kullanıcı sorusunu yanıtla.

Kurallar:
- Öncelikli dil Türkçe.
- Kaynaklarda olmayan bilgiyi gerçekmiş gibi ekleme.
- Kaynaklar çelişiyorsa çelişkiyi belirt.
- Güncel bilgi ile tarihsel bilgiyi ayır.
- Gereksiz uzunluk kullanma.
- Kullanıcı kod istiyorsa ilgili teknik bilgiyi kullan.
- URL'leri mümkün olduğunca koru.
- Kaynakların varlığını uydurma.

SORU:
${query}

ARAŞTIRMA:
${context}
`.trim();
}

// ======================================================================
// 4.25 — RESEARCH ANSWER GENERATION
// ======================================================================

async function generateResearchAnswer4(
    query,
    context,
    options = {}
) {

    if (
        options.noAI
    ) {

        return {
            answer:
                context,

            provider:
                "research-context",

            model:
                "source-context"
        };
    }

    const messages = [
        {
            role:
                "system",

            content:
                buildResearchAIPrompt4(
                    query,
                    context
                )
        },

        {
            role:
                "user",

            content:
                query
        }
    ];

    try {

        const aiResult =
            await routeAIRequest2(
                messages,
                {
                    provider:
                        options.provider,

                    maxTokens:
                        options.maxTokens ||
                        3500,

                    temperature:
                        options.temperature ??
                        0.25
                }
            );

        return {
            answer:
                aiResult.answer,

            provider:
                aiResult.provider,

            model:
                aiResult.model
        };

    } catch (
        error
    ) {

        return {
            answer:
                context,

            provider:
                "research-context-fallback",

            model:
                "context-only",

            error:
                error.message
        };
    }
}

// ======================================================================
// 4.26 — DIRECT RESEARCH EXECUTOR
// ======================================================================

async function executeResearch4(
    query,
    options = {}
) {

    const started =
        Date.now();

    const preparedQuery =
        prepareResearchQuery4(
            query
        );

    if (
        !preparedQuery
    ) {

        throw new Error(
            "research_query_required"
        );
    }

    if (
        !TURKAI_RESEARCH_SETTINGS_4
            .enabled
    ) {

        throw new Error(
            "research_disabled"
        );
    }

    TURKAI_RESEARCH_STATS_4
        .totalRequests++;

    TURKAI_RESEARCH_STATS_4
        .lastRequestAt =
        researchNow4();

    const key =
        researchKey4(
            preparedQuery +
            "|" +
            JSON.stringify(
                {
                    wikipedia:
                        TURKAI_RESEARCH_SETTINGS_4
                            .wikipedia,

                    duckduckgo:
                        TURKAI_RESEARCH_SETTINGS_4
                            .duckDuckGo,

                    directURL:
                        TURKAI_RESEARCH_SETTINGS_4
                            .directURL
                }
            )
        );

    const cached =
        getResearchCache4(
            key
        );

    if (
        cached &&
        !options.force
    ) {

        TURKAI_RESEARCH_STATS_4
            .successfulRequests++;

        return {
            ...cached,

            cache:
                true,

            elapsedMs:
                Date.now() -
                started
        };
    }

    if (
        TURKAI_RESEARCH_IN_FLIGHT_4.has(
            key
        ) &&
        !options.force
    ) {

        return await TURKAI_RESEARCH_IN_FLIGHT_4.get(
            key
        );
    }

    const promise =
        executeResearchCore4(
            preparedQuery,
            options
        );

    TURKAI_RESEARCH_IN_FLIGHT_4.set(
        key,
        promise
    );

    try {

        const result =
            await promise;

        setResearchCache4(
            key,
            result
        );

        TURKAI_RESEARCH_STATS_4
            .successfulRequests++;

        TURKAI_RESEARCH_STATS_4
            .lastSuccessAt =
            researchNow4();

        return {
            ...result,

            cache:
                false,

            elapsedMs:
                Date.now() -
                started
        };

    } catch (
        error
    ) {

        TURKAI_RESEARCH_STATS_4
            .failedRequests++;

        TURKAI_RESEARCH_STATS_4
            .lastErrorAt =
            researchNow4();

        TURKAI_RESEARCH_STATS_4
            .lastError =
            error.message;

        throw error;

    } finally {

        TURKAI_RESEARCH_IN_FLIGHT_4.delete(
            key
        );

        writeJSON(
            TURKAI_RESEARCH_STATS_FILE_4,
            TURKAI_RESEARCH_STATS_4
        );
    }
}

// ======================================================================
// 4.27 — RESEARCH CORE
// ======================================================================

async function executeResearchCore4(
    query,
    options = {}
) {

    const intent =
        detectResearchIntent4(
            query
        );

    const sourcePool =
        [];

    const directURL =
        extractURL4(
            query
        );

    // --------------------------------------------------------------
    // DIRECT URL
    // --------------------------------------------------------------

    if (
        directURL &&
        TURKAI_RESEARCH_SETTINGS_4
            .directURL
    ) {

        try {

            const direct =
                await researchDirectURL4(
                    directURL
                );

            const normalized =
                normalizeResearchSource4({
                    title:
                        direct.title,

                    url:
                        direct.url,

                    content:
                        direct.content,

                    source:
                        direct.source
                });

            if (
                normalized
            ) {
                sourcePool.push(
                    normalized
                );
            }

        } catch (
            error
        ) {

            sourcePool.push({
                title:
                    "Direct URL hatası",

                url:
                    directURL,

                snippet:
                    error.message,

                source:
                    "direct-url-error"
            });
        }
    }

    // --------------------------------------------------------------
    // DUCKDUCKGO
    // --------------------------------------------------------------

    if (
        TURKAI_RESEARCH_SETTINGS_4
            .duckDuckGo
    ) {

        try {

            const duck =
                await researchDuckDuckGo4(
                    query
                );

            sourcePool.push(
                ...duck
            );

        } catch (
            error
        ) {

            console.warn(
                "[Research/DDG]",
                error.message
            );
        }
    }

    // --------------------------------------------------------------
    // WIKIPEDIA
    // --------------------------------------------------------------

    if (
        TURKAI_RESEARCH_SETTINGS_4
            .wikipedia
    ) {

        try {

            const wiki =
                await researchWikipedia4(
                    query
                );

            sourcePool.push(
                ...wiki
            );

        } catch (
            error
        ) {

            console.warn(
                "[Research/Wikipedia]",
                error.message
            );
        }
    }

    let sources =
        deduplicateResearchSources4(
            sourcePool
        );

    sources =
        rankResearchSources4(
            sources,
            query
        );

    // --------------------------------------------------------------
    // WIKIPEDIA SUMMARIES
    // --------------------------------------------------------------

    const wikipediaCandidates =
        sources
            .filter(
                source =>
                    source.source ===
                    "wikipedia"
            )
            .slice(
                0,
                3
            );

    for (
        const candidate
        of wikipediaCandidates
    ) {

        try {

            const title =
                researchString4(
                    candidate.title
                );

            if (
                title
            ) {

                const summary =
                    await researchWikipediaSummary4(
                        title
                    );

                if (
                    summary &&
                    summary.extract
                ) {

                    candidate.snippet =
                        (
                            candidate.snippet
                                ? candidate.snippet +
                                  "\n\n"
                                : ""
                        ) +
                        summary.extract;

                    candidate.url =
                        summary.url ||
                        candidate.url;
                }
            }

        } catch {
            // optional enrichment
        }
    }

    sources =
        rankResearchSources4(
            sources,
            query
        );

    // --------------------------------------------------------------
    // CONTEXT
    // --------------------------------------------------------------

    const context =
        buildResearchContext4(
            query,
            sources
        );

    // --------------------------------------------------------------
    // RESULT
    // --------------------------------------------------------------

    const result = {

        id:
            researchId4(),

        ok:
            true,

        success:
            true,

        query,

        intent,

        sources,

        sourceCount:
            sources.length,

        context,

        timestamp:
            researchNow4(),

        durationMs:
            0
    };

    result.durationMs =
        Date.now() -
        new Date(
            TURKAI_RESEARCH_STATS_4
                .lastRequestAt ||
                researchNow4()
        ).getTime();

    TURKAI_RESEARCH_STATS_4
        .sourceCount +=
        sources.length;

    const previousRequests =
        Math.max(
            1,
            TURKAI_RESEARCH_STATS_4
                .successfulRequests
        );

    TURKAI_RESEARCH_STATS_4
        .averageSources =
        (
            (
                TURKAI_RESEARCH_STATS_4
                    .averageSources *
                (
                    previousRequests -
                    1
                )
            ) +
            sources.length
        ) /
        previousRequests;

    saveResearchHistory4(
        result
    );

    archiveResearchSources4(
        result
    );

    writeJSON(
        TURKAI_RESEARCH_STATS_FILE_4,
        TURKAI_RESEARCH_STATS_4
    );

    return result;
}

// ======================================================================
// 4.28 — RESEARCH + AI
// ======================================================================

async function researchAndAnswer4(
    query,
    options = {}
) {

    const research =
        await executeResearch4(
            query,
            options
        );

    if (
        options.contextOnly
    ) {

        return {
            ok:
                true,

            success:
                true,

            query,

            research,

            answer:
                research.context,

            provider:
                "research-context",

            model:
                "context-only"
        };
    }

    const ai =
        await generateResearchAnswer4(
            query,
            research.context,
            options
        );

    return {
        ok:
            true,

        success:
            true,

        query,

        answer:
            ai.answer,

        provider:
            ai.provider,

        model:
            ai.model,

        research,

        sources:
            research.sources,

        sourceCount:
            research.sourceCount,

        researched:
            true
    };
}

// ======================================================================
// 4.29 — RESEARCH AUTO ROUTER
// ======================================================================

async function routeResearchForAI4(
    message,
    options = {}
) {

    const query =
        prepareResearchQuery4(
            message
        );

    const intent =
        detectResearchIntent4(
            query
        );

    if (
        !intent.likelyResearch &&
        !options.force
    ) {

        return {
            research:
                false,

            reason:
                "not-required",

            intent
        };
    }

    const result =
        await executeResearch4(
            query,
            options
        );

    return {
        research:
            true,

        reason:
            "research-required",

        intent,

        ...result
    };
}

// ======================================================================
// 4.30 — AI RESEARCH CONTEXT BRIDGE
// ======================================================================

async function getResearchAIContext4(
    message,
    options = {}
) {

    const result =
        await routeResearchForAI4(
            message,
            options
        );

    if (
        !result.research
    ) {

        return {
            shouldResearch:
                false,

            context:
                "",

            sources:
                []
        };
    }

    return {
        shouldResearch:
            true,

        context:
            result.context ||
            "",

        sources:
            result.sources ||
            [],

        sourceCount:
            result.sourceCount ||
            0,

        intent:
            result.intent ||
            null
    };
}

// ======================================================================
// 4.31 — RESEARCH API
// ======================================================================

app.post(
    "/api/research",
    async (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const query =
            researchString4(
                body.question ||
                body.query ||
                body.message ||
                body.prompt
            );

        if (
            !query
        ) {

            return res.status(
                400
            ).json({
                ok:
                    false,

                success:
                    false,

                error:
                    "question_required"
            });
        }

        try {

            const result =
                await executeResearch4(
                    query,
                    {
                        force:
                            Boolean(
                                body.force
                            ),

                        contextOnly:
                            Boolean(
                                body.contextOnly
                            )
                    }
                );

            return res.json(
                result
            );

        } catch (
            error
        ) {

            runtime.errors++;

            return res.status(
                502
            ).json({
                ok:
                    false,

                success:
                    false,

                error:
                    "research_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 4.32 — RESEARCH + AI API
// ======================================================================

app.post(
    "/api/research/answer",
    async (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const query =
            researchString4(
                body.question ||
                body.query ||
                body.message
            );

        if (
            !query
        ) {

            return res.status(
                400
            ).json({
                ok:
                    false,

                success:
                    false,

                error:
                    "question_required"
            });
        }

        try {

            const result =
                await researchAndAnswer4(
                    query,
                    {
                        force:
                            Boolean(
                                body.force
                            ),

                        noAI:
                            Boolean(
                                body.noAI
                            ),

                        provider:
                            body.provider,

                        temperature:
                            body.temperature,

                        maxTokens:
                            body.maxTokens
                    }
                );

            return res.json(
                result
            );

        } catch (
            error
        ) {

            runtime.errors++;

            return res.status(
                502
            ).json({
                ok:
                    false,

                success:
                    false,

                error:
                    "research_answer_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 4.33 — AUTO RESEARCH API
// ======================================================================

app.post(
    "/api/research/auto",
    async (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const message =
            researchString4(
                body.message ||
                body.question ||
                body.query
            );

        if (
            !message
        ) {

            return res.status(
                400
            ).json({
                ok:
                    false,

                success:
                    false,

                error:
                    "message_required"
            });
        }

        try {

            const result =
                await routeResearchForAI4(
                    message,
                    {
                        force:
                            Boolean(
                                body.force
                            )
                    }
                );

            return res.json({
                ok:
                    true,

                success:
                    true,

                message,

                ...result
            });

        } catch (
            error
        ) {

            return res.status(
                502
            ).json({
                ok:
                    false,

                success:
                    false,

                error:
                    "research_auto_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 4.34 — DIRECT URL API
// ======================================================================

app.post(
    "/api/research/url",
    async (
        req,
        res
    ) => {

        const url =
            researchString4(
                req.body &&
                req.body.url
            );

        if (
            !url
        ) {

            return res.status(
                400
            ).json({
                ok:
                    false,

                error:
                    "url_required"
            });
        }

        try {

            const result =
                await researchDirectURL4(
                    url
                );

            return res.json({
                ok:
                    true,

                success:
                    true,

                result
            });

        } catch (
            error
        ) {

            return res.status(
                502
            ).json({
                ok:
                    false,

                error:
                    "direct_url_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 4.35 — WIKIPEDIA API
// ======================================================================

app.get(
    "/api/research/wikipedia",
    async (
        req,
        res
    ) => {

        const query =
            researchString4(
                req.query.q ||
                req.query.query
            );

        if (
            !query
        ) {

            return res.status(
                400
            ).json({
                ok:
                    false,

                error:
                    "query_required"
            });
        }

        try {

            const results =
                await researchWikipedia4(
                    query
                );

            return res.json({
                ok:
                    true,

                success:
                    true,

                query,

                results
            });

        } catch (
            error
        ) {

            return res.status(
                502
            ).json({
                ok:
                    false,

                error:
                    "wikipedia_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 4.36 — DUCKDUCKGO API
// ======================================================================

app.get(
    "/api/research/search",
    async (
        req,
        res
    ) => {

        const query =
            researchString4(
                req.query.q ||
                req.query.query
            );

        if (
            !query
        ) {

            return res.status(
                400
            ).json({
                ok:
                    false,

                error:
                    "query_required"
            });
        }

        try {

            const results =
                await researchDuckDuckGo4(
                    query
                );

            return res.json({
                ok:
                    true,

                success:
                    true,

                query,

                results
            });

        } catch (
            error
        ) {

            return res.status(
                502
            ).json({
                ok:
                    false,

                error:
                    "search_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 4.37 — RESEARCH SOURCES LIST
// ======================================================================

app.get(
    "/api/research/sources",
    (
        req,
        res
    ) => {

        let files =
            [];

        try {

            files =
                fs
                    .readdirSync(
                        TURKAI_RESEARCH_SOURCE_DIR_4
                    )
                    .filter(
                        name =>
                            name.endsWith(
                                ".json"
                            )
                    )
                    .slice(
                        -500
                    )
                    .reverse();

        } catch {

            files =
                [];
        }

        return res.json({

            ok:
                true,

            success:
                true,

            count:
                files.length,

            files
        });
    }
);

// ======================================================================
// 4.38 — RESEARCH HISTORY LIST
// ======================================================================

app.get(
    "/api/research/history",
    (
        req,
        res
    ) => {

        let files =
            [];

        try {

            files =
                fs
                    .readdirSync(
                        TURKAI_RESEARCH_HISTORY_DIR_4
                    )
                    .filter(
                        name =>
                            name.endsWith(
                                ".json"
                            )
                    )
                    .slice(
                        -500
                    )
                    .reverse();

        } catch {

            files =
                [];
        }

        return res.json({

            ok:
                true,

            success:
                true,

            count:
                files.length,

            files
        });
    }
);

// ======================================================================
// 4.39 — RESEARCH HISTORY ITEM
// ======================================================================

app.get(
    "/api/research/history/:id",
    (
        req,
        res
    ) => {

        const id =
            researchString4(
                req.params.id
            );

        const file =
            path.join(
                TURKAI_RESEARCH_HISTORY_DIR_4,
                `${id}.json`
            );

        const data =
            readJSON(
                file,
                null
            );

        if (
            !data
        ) {

            return res.status(
                404
            ).json({
                ok:
                    false,

                success:
                    false,

                error:
                    "history_not_found"
            });
        }

        return res.json({
            ok:
                true,

            success:
                true,

            ...data
        });
    }
);

// ======================================================================
// 4.40 — RESEARCH SOURCE ITEM
// ======================================================================

app.get(
    "/api/research/source/:id",
    (
        req,
        res
    ) => {

        const id =
            researchString4(
                req.params.id
            );

        const file =
            path.join(
                TURKAI_RESEARCH_SOURCE_DIR_4,
                `${id}.json`
            );

        const data =
            readJSON(
                file,
                null
            );

        if (
            !data
        ) {

            return res.status(
                404
            ).json({
                ok:
                    false,

                success:
                    false,

                error:
                    "source_not_found"
            });
        }

        return res.json({
            ok:
                true,

            success:
                true,

            ...data
        });
    }
);

// ======================================================================
// 4.41 — RESEARCH CACHE CLEAR
// ======================================================================

app.post(
    "/api/research/cache/clear",
    (
        req,
        res
    ) => {

        if (
            !req.body ||
            !req.body.adminKey
        ) {

            return res.status(
                403
            ).json({
                ok:
                    false,

                error:
                    "admin_required"
            });
        }

        const supplied =
            researchString4(
                req.body.adminKey
            );

        const expected =
            researchString4(
                process.env.TURKAI_ADMIN_KEY
            );

        if (
            !expected ||
            supplied !==
                expected
        ) {

            return res.status(
                403
            ).json({
                ok:
                    false,

                error:
                    "invalid_admin_key"
            });
        }

        TURKAI_RESEARCH_CACHE_4.clear();

        let removed =
            0;

        try {

            const files =
                fs.readdirSync(
                    TURKAI_RESEARCH_CACHE_DIR_4
                );

            for (
                const file
                of files
            ) {

                if (
                    !file.endsWith(
                        ".json"
                    )
                ) {
                    continue;
                }

                try {

                    fs.unlinkSync(
                        path.join(
                            TURKAI_RESEARCH_CACHE_DIR_4,
                            file
                        )
                    );

                    removed++;

                } catch {
                    // ignore
                }
            }

        } catch {
            // ignore
        }

        return res.json({
            ok:
                true,

            success:
                true,

            removed,

            cacheSize:
                TURKAI_RESEARCH_CACHE_4
                    .size
        });
    }
);

// ======================================================================
// 4.42 — RESEARCH SETTINGS API
// ======================================================================

app.get(
    "/api/research/settings",
    (
        req,
        res
    ) => {

        return res.json({

            ok:
                true,

            success:
                true,

            settings:
                TURKAI_RESEARCH_SETTINGS_4,

            config:
                TURKAI_RESEARCH_CONFIG_4
        });
    }
);

// ======================================================================
// 4.43 — RESEARCH STATS API
// ======================================================================

app.get(
    "/api/research/stats",
    (
        req,
        res
    ) => {

        return res.json({

            ok:
                true,

            success:
                true,

            stats:
                TURKAI_RESEARCH_STATS_4,

            cacheSize:
                TURKAI_RESEARCH_CACHE_4
                    .size,

            inFlight:
                TURKAI_RESEARCH_IN_FLIGHT_4
                    .size
        });
    }
);

// ======================================================================
// 4.44 — RESEARCH HEALTH
// ======================================================================

app.get(
    "/api/research/health",
    async (
        req,
        res
    ) => {

        const checks = {
            engine:
                true,

            config:
                Boolean(
                    TURKAI_RESEARCH_CONFIG_4
                ),

            cache:
                TURKAI_RESEARCH_SETTINGS_4
                    .cache,

            duckDuckGo:
                false,

            wikipedia:
                false
        };

        try {

            await researchDuckDuckGo4(
                "TürkAI"
            );

            checks.duckDuckGo =
                true;

        } catch {
            checks.duckDuckGo =
                false;
        }

        try {

            await researchWikipedia4(
                "TürkAI"
            );

            checks.wikipedia =
                true;

        } catch {
            checks.wikipedia =
                false;
        }

        const healthy =
            checks.engine &&
            checks.config;

        return res.status(
            healthy
                ? 200
                : 503
        ).json({

            ok:
                healthy,

            success:
                healthy,

            healthy,

            checks,

            timestamp:
                researchNow4()
        });
    }
);

// ======================================================================
// 4.45 — GENERIC QUESTION ROUTING
// ======================================================================

function shouldAutoResearch4(
    message
) {

    const intent =
        detectResearchIntent4(
            message
        );

    return intent.likelyResearch;
}

// ======================================================================
// 4.46 — RESEARCH CONTEXT FOR CHAT
// ======================================================================

async function prepareResearchContext4(
    userMessage,
    options = {}
) {

    const query =
        researchString4(
            userMessage
        );

    if (
        !query
    ) {

        return {
            shouldResearch:
                false,

            context:
                "",

            sources:
                []
        };
    }

    const required =
        shouldAutoResearch4(
            query
        );

    if (
        !required &&
        !options.force
    ) {

        return {
            shouldResearch:
                false,

            context:
                "",

            sources:
                []
        };
    }

    try {

        return await getResearchAIContext4(
            query,
            options
        );

    } catch {

        return {
            shouldResearch:
                false,

            context:
                "",

            sources:
                []
        };
    }
}

// ======================================================================
// 4.47 — RESEARCH SEARCH BY ID
// ======================================================================

app.get(
    "/api/research/:id",
    (
        req,
        res
    ) => {

        const id =
            researchString4(
                req.params.id
            );

        if (
            !id
        ) {

            return res.status(
                400
            ).json({
                ok:
                    false,

                error:
                    "id_required"
            });
        }

        const sourceFile =
            path.join(
                TURKAI_RESEARCH_SOURCE_DIR_4,
                `${id}.json`
            );

        const historyFile =
            path.join(
                TURKAI_RESEARCH_HISTORY_DIR_4,
                `${id}.json`
            );

        const source =
            readJSON(
                sourceFile,
                null
            );

        if (
            source
        ) {

            return res.json({
                ok:
                    true,

                type:
                    "source",

                data:
                    source
            });
        }

        const history =
            readJSON(
                historyFile,
                null
            );

        if (
            history
        ) {

            return res.json({
                ok:
                    true,

                type:
                    "history",

                data:
                    history
            });
        }

        return res.status(
            404
        ).json({
            ok:
                false,

            error:
                "research_not_found"
        });
    }
);

// ======================================================================
// 4.48 — RESEARCH CLEANUP
// ======================================================================

function cleanupResearchCache4() {

    let removed =
        0;

    try {

        const files =
            fs.readdirSync(
                TURKAI_RESEARCH_CACHE_DIR_4
            );

        for (
            const file
            of files
        ) {

            if (
                !file.endsWith(
                    ".json"
                )
            ) {
                continue;
            }

            const full =
                path.join(
                    TURKAI_RESEARCH_CACHE_DIR_4,
                    file
                );

            const data =
                readJSON(
                    full,
                    null
                );

            if (
                !data ||
                !data.timestamp
            ) {

                try {

                    fs.unlinkSync(
                        full
                    );

                    removed++;

                } catch {
                    // ignore
                }

                continue;
            }

            const age =
                Date.now() -
                new Date(
                    data.timestamp
                ).getTime();

            if (
                Number.isFinite(
                    age
                ) &&
                age >
                    TURKAI_RESEARCH_CONFIG_4
                        .cacheTTL
            ) {

                try {

                    fs.unlinkSync(
                        full
                    );

                    removed++;

                } catch {
                    // ignore
                }
            }
        }

    } catch {
        // ignore
    }

    return removed;
}

function cleanupResearchHistory4() {

    let removed =
        0;

    try {

        const files =
            fs.readdirSync(
                TURKAI_RESEARCH_HISTORY_DIR_4
            )
            .filter(
                name =>
                    name.endsWith(
                        ".json"
                    )
            )
            .sort();

        const excess =
            Math.max(
                0,
                files.length -
                TURKAI_RESEARCH_CONFIG_4
                    .historyLimit
            );

        const deleteThese =
            files.slice(
                0,
                excess
            );

        for (
            const file
            of deleteThese
        ) {

            try {

                fs.unlinkSync(
                    path.join(
                        TURKAI_RESEARCH_HISTORY_DIR_4,
                        file
                    )
                );

                removed++;

            } catch {
                // ignore
            }
        }

    } catch {
        // ignore
    }

    return removed;
}

// ======================================================================
// 4.49 — PERIODIC CLEANUP
// ======================================================================

setInterval(
    () => {

        try {

            cleanupResearchCache4();

            cleanupResearchHistory4();

            writeJSON(
                TURKAI_RESEARCH_STATS_FILE_4,
                TURKAI_RESEARCH_STATS_4
            );

        } catch (
            error
        ) {

            console.warn(
                "[Research/Cleanup]",
                error.message
            );
        }

    },
    10 * 60 * 1000
);

// ======================================================================
// 4.50 — PART 4 STATE BRIDGE
// ======================================================================

serverState.research =
    serverState.research ||
    {};

serverState.research.enabled =
    TURKAI_RESEARCH_SETTINGS_4
        .enabled;

serverState.research.config =
    TURKAI_RESEARCH_CONFIG_4;

serverState.research.settings =
    TURKAI_RESEARCH_SETTINGS_4;

serverState.research.stats =
    TURKAI_RESEARCH_STATS_4;

serverState.research.executeSafe =
    executeResearch4;

serverState.research.execute =
    executeResearch4;

serverState.research.answer =
    researchAndAnswer4;

serverState.research.routeForAI =
    routeResearchForAI4;

serverState.research.getContext =
    getResearchAIContext4;

serverState.research.prepareContext =
    prepareResearchContext4;

serverState.research.duckDuckGo =
    researchDuckDuckGo4;

serverState.research.wikipedia =
    researchWikipedia4;

serverState.research.directURL =
    researchDirectURL4;

serverState.research.clearCache =
    cleanupResearchCache4;

// ======================================================================
// 4.51 — GLOBAL RESEARCH BRIDGE
// ======================================================================

global.turkAI =
    global.turkAI ||
    {};

global.turkAI.research =
    global.turkAI.research ||
    {};

global.turkAI.research.execute =
    executeResearch4;

global.turkAI.research.answer =
    researchAndAnswer4;

global.turkAI.research.route =
    routeResearchForAI4;

global.turkAI.research.context =
    getResearchAIContext4;

global.turkAI.research.settings =
    TURKAI_RESEARCH_SETTINGS_4;

global.turkAI.research.stats =
    TURKAI_RESEARCH_STATS_4;

// ======================================================================
// 4.52 — COMPATIBILITY ALIASES
// ======================================================================

const safeExecuteResearch3 =
    executeResearch4;

const routeResearchForAI3 =
    routeResearchForAI4;

const getResearchAIContext3 =
    getResearchAIContext4;

const getResearchDiagnostics3 =
    function () {

        return {
            config:
                TURKAI_RESEARCH_CONFIG_4,

            settings:
                TURKAI_RESEARCH_SETTINGS_4,

            stats:
                TURKAI_RESEARCH_STATS_4,

            cacheSize:
                TURKAI_RESEARCH_CACHE_4
                    .size,

            inFlight:
                TURKAI_RESEARCH_IN_FLIGHT_4
                    .size
        };
    };

// ======================================================================
// 4.53 — EXPORT-LIKE BRIDGE
// ======================================================================

serverState.research.executeSafe =
    safeExecuteResearch3;

serverState.research.routeForAI =
    routeResearchForAI3;

serverState.research.aiContext =
    getResearchAIContext3;

serverState.research.diagnostics =
    getResearchDiagnostics3;

// ======================================================================
// 4.54 — STARTUP PERSISTENCE
// ======================================================================

writeJSON(
    TURKAI_RESEARCH_STATS_FILE_4,
    TURKAI_RESEARCH_STATS_4
);

writeJSON(
    TURKAI_RESEARCH_SETTINGS_FILE_4,
    TURKAI_RESEARCH_SETTINGS_4
);

// ======================================================================
// 4.55 — STARTUP LOG
// ======================================================================

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

console.log(
    "TürkAI Master Server — PART 4/10"
);

console.log(
    "Internet Research Engine yüklendi."
);

console.log(
    "DuckDuckGo:",
    TURKAI_RESEARCH_SETTINGS_4
        .duckDuckGo
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Wikipedia:",
    TURKAI_RESEARCH_SETTINGS_4
        .wikipedia
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Direct URL:",
    TURKAI_RESEARCH_SETTINGS_4
        .directURL
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Research Cache:",
    TURKAI_RESEARCH_SETTINGS_4
        .cache
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Research History:",
    TURKAI_RESEARCH_SETTINGS_4
        .history
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Max Sources:",
    TURKAI_RESEARCH_CONFIG_4
        .maxSources
);

console.log(
    "Timeout:",
    TURKAI_RESEARCH_CONFIG_4
        .timeoutMs,
    "ms"
);

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

/*
========================================================================
 PART 4 END

 SONRA:
 PART 5 / 10
 WEATHER + CURRENCY + GOLD + MARKET ENGINE
========================================================================
*/
/*
========================================================================
 TÜRKAI MASTER SERVER 50.0
 PART 5 / 10
 WEATHER + CURRENCY + GOLD + MARKET ENGINE
========================================================================
*/

"use strict";

// ======================================================================
// 5.0 — MARKET ENGINE CONFIG
// ======================================================================

const TURKAI_MARKET_CONFIG_5 = {

    enabled:
        true,

    timezone:
        "Europe/Istanbul",

    cacheEnabled:
        true,

    weatherEnabled:
        true,

    currencyEnabled:
        true,

    goldEnabled:
        true,

    timeoutMs:
        15000,

    weatherCacheTTL:
        5 * 60 * 1000,

    currencyCacheTTL:
        15 * 60 * 1000,

    goldCacheTTL:
        15 * 60 * 1000,

    weatherForecastDays:
        7,

    defaultWeatherDays:
        5,

    maxCityResults:
        8,

    maxCurrencyResults:
        50,

    requestUserAgent:
        "Mozilla/5.0 TürkAI Market Engine/50.0",

    providers: {

        weather:
            "open-meteo",

        geocoding:
            "open-meteo",

        currency:
            "frankfurter",

        gold:
            "gold-api"
    }
};

// ======================================================================
// 5.1 — MARKET DIRECTORIES
// ======================================================================

const TURKAI_MARKET_DIR_5 =
    path.join(
        DATA_DIR,
        "market"
    );

const TURKAI_MARKET_CACHE_DIR_5 =
    path.join(
        TURKAI_MARKET_DIR_5,
        "cache"
    );

const TURKAI_MARKET_HISTORY_DIR_5 =
    path.join(
        TURKAI_MARKET_DIR_5,
        "history"
    );

const TURKAI_MARKET_STATS_FILE_5 =
    path.join(
        TURKAI_MARKET_DIR_5,
        "stats.json"
    );

const TURKAI_MARKET_SETTINGS_FILE_5 =
    path.join(
        TURKAI_MARKET_DIR_5,
        "settings.json"
    );

[
    TURKAI_MARKET_DIR_5,
    TURKAI_MARKET_CACHE_DIR_5,
    TURKAI_MARKET_HISTORY_DIR_5
].forEach(
    ensureDir
);

// ======================================================================
// 5.2 — MARKET SETTINGS
// ======================================================================

let TURKAI_MARKET_SETTINGS_5 =
    readJSON(
        TURKAI_MARKET_SETTINGS_FILE_5,
        {
            enabled:
                true,

            weather:
                true,

            currency:
                true,

            gold:
                true,

            cache:
                true,

            history:
                true
        }
    );

if (
    !TURKAI_MARKET_SETTINGS_5 ||
    typeof TURKAI_MARKET_SETTINGS_5 !==
        "object"
) {

    TURKAI_MARKET_SETTINGS_5 = {

        enabled:
            true,

        weather:
            true,

        currency:
            true,

        gold:
            true,

        cache:
            true,

        history:
            true
    };
}

writeJSON(
    TURKAI_MARKET_SETTINGS_FILE_5,
    TURKAI_MARKET_SETTINGS_5
);

// ======================================================================
// 5.3 — MARKET STATS
// ======================================================================

let TURKAI_MARKET_STATS_5 =
    readJSON(
        TURKAI_MARKET_STATS_FILE_5,
        {
            version:
                "5.0",

            startedAt:
                new Date().toISOString(),

            weatherRequests:
                0,

            weatherSuccesses:
                0,

            weatherFailures:
                0,

            currencyRequests:
                0,

            currencySuccesses:
                0,

            currencyFailures:
                0,

            goldRequests:
                0,

            goldSuccesses:
                0,

            goldFailures:
                0,

            geocodingRequests:
                0,

            geocodingFailures:
                0,

            cacheHits:
                0,

            cacheMisses:
                0,

            historyWrites:
                0,

            totalSources:
                0,

            lastWeather:
                null,

            lastCurrency:
                null,

            lastGold:
                null,

            lastError:
                null,

            lastErrorAt:
                null
        }
    );

if (
    !TURKAI_MARKET_STATS_5 ||
    typeof TURKAI_MARKET_STATS_5 !==
        "object"
) {

    TURKAI_MARKET_STATS_5 = {

        version:
            "5.0",

        startedAt:
            new Date().toISOString(),

        weatherRequests:
            0,

        weatherSuccesses:
            0,

        weatherFailures:
            0,

        currencyRequests:
            0,

        currencySuccesses:
            0,

        currencyFailures:
            0,

        goldRequests:
            0,

        goldSuccesses:
            0,

        goldFailures:
            0,

        geocodingRequests:
            0,

        geocodingFailures:
            0,

        cacheHits:
            0,

        cacheMisses:
            0,

        historyWrites:
            0,

        totalSources:
            0,

        lastWeather:
            null,

        lastCurrency:
            null,

        lastGold:
            null,

        lastError:
            null,

        lastErrorAt:
            null
    };
}

// ======================================================================
// 5.4 — RUNTIME CACHE
// ======================================================================

const TURKAI_MARKET_CACHE_5 =
    new Map();

const TURKAI_MARKET_INFLIGHT_5 =
    new Map();

// ======================================================================
// 5.5 — MARKET UTILITIES
// ======================================================================

function marketSafeString5(
    value,
    fallback = ""
) {

    if (
        value ===
            null ||
        value ===
            undefined
    ) {
        return fallback;
    }

    return String(
        value
    ).trim();
}

function marketNormalize5(
    value
) {

    return marketSafeString5(
        value
    )
        .toLocaleLowerCase(
            "tr-TR"
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function marketUpper5(
    value,
    fallback = ""
) {

    return marketSafeString5(
        value,
        fallback
    ).toUpperCase();
}

function marketNow5() {

    return new Date()
        .toISOString();
}

function marketId5(
    prefix =
        "market"
) {

    return (
        prefix +
        "_" +
        Date.now().toString(
            36
        ) +
        "_" +
        crypto
            .randomBytes(
                6
            )
            .toString(
                "hex"
            )
    );
}

function marketHash5(
    value
) {

    return crypto
        .createHash(
            "sha256"
        )
        .update(
            marketSafeString5(
                value
            ),
            "utf8"
        )
        .digest(
            "hex"
        );
}

function marketClamp5(
    value,
    min,
    max
) {

    return Math.min(
        max,
        Math.max(
            min,
            value
        )
    );
}

function marketFiniteNumber5(
    value,
    fallback = null
) {

    const number =
        Number(
            value
        );

    return Number.isFinite(
        number
    )
        ? number
        : fallback;
}

// ======================================================================
// 5.6 — GENERIC MARKET FETCH
// ======================================================================

async function marketFetch5(
    url,
    options = {},
    timeout =
        TURKAI_MARKET_CONFIG_5.timeoutMs
) {

    const controller =
        new AbortController();

    const timeoutId =
        setTimeout(
            () => {
                controller.abort();
            },
            timeout
        );

    try {

        return await fetch(
            url,
            {
                ...options,

                signal:
                    controller.signal
            }
        );

    } finally {

        clearTimeout(
            timeoutId
        );
    }
}

// ======================================================================
// 5.7 — JSON REQUEST
// ======================================================================

async function marketFetchJSON5(
    url,
    options = {},
    timeout =
        TURKAI_MARKET_CONFIG_5.timeoutMs
) {

    const response =
        await marketFetch5(
            url,
            {
                ...options,

                headers: {
                    "User-Agent":
                        TURKAI_MARKET_CONFIG_5
                            .requestUserAgent,

                    Accept:
                        "application/json",

                    ...(
                        options.headers ||
                        {}
                    )
                }
            },
            timeout
        );

    let data =
        null;

    try {

        data =
            await response.json();

    } catch {

        throw new Error(
            "invalid_json_response"
        );
    }

    if (
        !response.ok
    ) {

        const providerMessage =
            data &&
            data.error &&
            (
                data.error.message ||
                data.error.reason
            );

        const error =
            new Error(
                `http_${response.status}` +
                (
                    providerMessage
                        ? "_" +
                          String(
                              providerMessage
                          )
                        : ""
                )
            );

        error.status =
            response.status;

        error.data =
            data;

        throw error;
    }

    return data;
}

// ======================================================================
// 5.8 — CACHE READ
// ======================================================================

function marketCacheGet5(
    key,
    ttl
) {

    if (
        !TURKAI_MARKET_SETTINGS_5
            .cache ||
        !TURKAI_MARKET_CONFIG_5
            .cacheEnabled
    ) {

        return null;
    }

    const item =
        TURKAI_MARKET_CACHE_5.get(
            key
        );

    if (
        item
    ) {

        if (
            Date.now() -
                item.timestamp <
                ttl
        ) {

            TURKAI_MARKET_STATS_5
                .cacheHits++;

            return item.data;
        }

        TURKAI_MARKET_CACHE_5.delete(
            key
        );
    }

    const diskFile =
        path.join(
            TURKAI_MARKET_CACHE_DIR_5,
            `${marketHash5(key)}.json`
        );

    const diskData =
        readJSON(
            diskFile,
            null
        );

    if (
        diskData &&
        diskData.timestamp
    ) {

        const age =
            Date.now() -
            new Date(
                diskData.timestamp
            ).getTime();

        if (
            Number.isFinite(
                age
            ) &&
            age <
                ttl
        ) {

            TURKAI_MARKET_STATS_5
                .cacheHits++;

            TURKAI_MARKET_CACHE_5.set(
                key,
                diskData
            );

            return diskData.data;
        }
    }

    TURKAI_MARKET_STATS_5
        .cacheMisses++;

    return null;
}

// ======================================================================
// 5.9 — CACHE WRITE
// ======================================================================

function marketCacheSet5(
    key,
    data
) {

    if (
        !TURKAI_MARKET_SETTINGS_5
            .cache ||
        !TURKAI_MARKET_CONFIG_5
            .cacheEnabled
    ) {
        return;
    }

    const wrapped = {

        timestamp:
            marketNow5(),

        data
    };

    TURKAI_MARKET_CACHE_5.set(
        key,
        wrapped
    );

    writeJSON(
        path.join(
            TURKAI_MARKET_CACHE_DIR_5,
            `${marketHash5(key)}.json`
        ),
        wrapped
    );

    if (
        TURKAI_MARKET_CACHE_5.size >
        1000
    ) {

        const oldest =
            TURKAI_MARKET_CACHE_5
                .keys()
                .next()
                .value;

        if (
            oldest
        ) {

            TURKAI_MARKET_CACHE_5.delete(
                oldest
            );
        }
    }
}

// ======================================================================
// 5.10 — HISTORY
// ======================================================================

function saveMarketHistory5(
    type,
    data
) {

    if (
        !TURKAI_MARKET_SETTINGS_5
            .history
    ) {
        return null;
    }

    const id =
        marketId5(
            type
        );

    const file =
        path.join(
            TURKAI_MARKET_HISTORY_DIR_5,
            `${id}.json`
        );

    const record = {

        id,

        type,

        timestamp:
            marketNow5(),

        data
    };

    if (
        writeJSON(
            file,
            record
        )
    ) {

        TURKAI_MARKET_STATS_5
            .historyWrites++;

        return id;
    }

    return null;
}

// ======================================================================
// 5.11 — WEATHER CODE MAP
// ======================================================================

const WEATHER_CODES_5 = {

    0:
        "Açık",

    1:
        "Çoğunlukla açık",

    2:
        "Parçalı bulutlu",

    3:
        "Kapalı",

    45:
        "Sisli",

    48:
        "Kırağılı sis",

    51:
        "Hafif çisenti",

    53:
        "Orta çisenti",

    55:
        "Yoğun çisenti",

    56:
        "Hafif donan çisenti",

    57:
        "Yoğun donan çisenti",

    61:
        "Hafif yağmur",

    63:
        "Orta yağmur",

    65:
        "Şiddetli yağmur",

    66:
        "Hafif donan yağmur",

    67:
        "Şiddetli donan yağmur",

    71:
        "Hafif kar",

    73:
        "Orta kar",

    75:
        "Yoğun kar",

    77:
        "Kar tanecikleri",

    80:
        "Hafif sağanak",

    81:
        "Orta sağanak",

    82:
        "Şiddetli sağanak",

    85:
        "Hafif kar sağanağı",

    86:
        "Şiddetli kar sağanağı",

    95:
        "Gök gürültülü fırtına",

    96:
        "Hafif dolulu fırtına",

    99:
        "Şiddetli dolulu fırtına"
};

function weatherCodeText5(
    code
) {

    const numeric =
        marketFiniteNumber5(
            code,
            null
        );

    if (
        numeric ===
        null
    ) {

        return "Bilinmiyor";
    }

    return (
        WEATHER_CODES_5[
            numeric
        ] ||
        "Bilinmiyor"
    );
}

// ======================================================================
// 5.12 — WIND DIRECTION
// ======================================================================

function windDirectionText5(
    degrees
) {

    const value =
        marketFiniteNumber5(
            degrees,
            null
        );

    if (
        value ===
        null
    ) {
        return null;
    }

    const directions = [
        "K",
        "KKD",
        "KD",
        "DKD",
        "D",
        "DGD",
        "GD",
        "GGD",
        "G",
        "GGB",
        "GB",
        "BGB",
        "B",
        "BKB",
        "KB",
        "KKB"
    ];

    const index =
        Math.round(
            value / 22.5
        ) %
        16;

    return directions[
        index
    ];
}

// ======================================================================
// 5.13 — WEATHER NORMALIZER
// ======================================================================

function normalizeWeatherCurrent5(
    current
) {

    if (
        !current ||
        typeof current !==
            "object"
    ) {

        return null;
    }

    return {

        time:
            current.time ||
            null,

        temperature:
            marketFiniteNumber5(
                current.temperature_2m,
                null
            ),

        apparentTemperature:
            marketFiniteNumber5(
                current.apparent_temperature,
                null
            ),

        humidity:
            marketFiniteNumber5(
                current.relative_humidity_2m,
                null
            ),

        precipitation:
            marketFiniteNumber5(
                current.precipitation,
                0
            ),

        rain:
            marketFiniteNumber5(
                current.rain,
                0
            ),

        showers:
            marketFiniteNumber5(
                current.showers,
                0
            ),

        snowfall:
            marketFiniteNumber5(
                current.snowfall,
                0
            ),

        windSpeed:
            marketFiniteNumber5(
                current.wind_speed_10m,
                null
            ),

        windDirection:
            marketFiniteNumber5(
                current.wind_direction_10m,
                null
            ),

        windDirectionText:
            windDirectionText5(
                current.wind_direction_10m
            ),

        weatherCode:
            marketFiniteNumber5(
                current.weather_code,
                null
            ),

        weatherText:
            weatherCodeText5(
                current.weather_code
            )
    };
}

// ======================================================================
// 5.14 — WEATHER DAILY NORMALIZER
// ======================================================================

function normalizeWeatherDaily5(
    daily
) {

    if (
        !daily ||
        typeof daily !==
            "object"
    ) {

        return [];
    }

    const times =
        Array.isArray(
            daily.time
        )
            ? daily.time
            : [];

    const maxTemps =
        Array.isArray(
            daily.temperature_2m_max
        )
            ? daily.temperature_2m_max
            : [];

    const minTemps =
        Array.isArray(
            daily.temperature_2m_min
        )
            ? daily.temperature_2m_min
            : [];

    const rainProbability =
        Array.isArray(
            daily.precipitation_probability_max
        )
            ? daily.precipitation_probability_max
            : [];

    const weatherCodes =
        Array.isArray(
            daily.weather_code
        )
            ? daily.weather_code
            : [];

    const sunrise =
        Array.isArray(
            daily.sunrise
        )
            ? daily.sunrise
            : [];

    const sunset =
        Array.isArray(
            daily.sunset
        )
            ? daily.sunset
            : [];

    return times.map(
        (
            date,
            index
        ) => ({

            date,

            max:
                marketFiniteNumber5(
                    maxTemps[index],
                    null
                ),

            min:
                marketFiniteNumber5(
                    minTemps[index],
                    null
                ),

            rainProbability:
                marketFiniteNumber5(
                    rainProbability[index],
                    null
                ),

            weatherCode:
                marketFiniteNumber5(
                    weatherCodes[index],
                    null
                ),

            weatherText:
                weatherCodeText5(
                    weatherCodes[index]
                ),

            sunrise:
                sunrise[index] ||
                null,

            sunset:
                sunset[index] ||
                null
        })
    );
}

// ======================================================================
// 5.15 — WEATHER HOURLY NORMALIZER
// ======================================================================

function normalizeWeatherHourly5(
    hourly
) {

    if (
        !hourly ||
        typeof hourly !==
            "object"
    ) {

        return [];
    }

    const times =
        Array.isArray(
            hourly.time
        )
            ? hourly.time
            : [];

    const temperatures =
        Array.isArray(
            hourly.temperature_2m
        )
            ? hourly.temperature_2m
            : [];

    const apparent =
        Array.isArray(
            hourly.apparent_temperature
        )
            ? hourly.apparent_temperature
            : [];

    const precipitation =
        Array.isArray(
            hourly.precipitation_probability
        )
            ? hourly.precipitation_probability
            : [];

    const weatherCodes =
        Array.isArray(
            hourly.weather_code
        )
            ? hourly.weather_code
            : [];

    const wind =
        Array.isArray(
            hourly.wind_speed_10m
        )
            ? hourly.wind_speed_10m
            : [];

    return times.map(
        (
            time,
            index
        ) => ({

            time,

            temperature:
                marketFiniteNumber5(
                    temperatures[index],
                    null
                ),

            apparentTemperature:
                marketFiniteNumber5(
                    apparent[index],
                    null
                ),

            precipitationProbability:
                marketFiniteNumber5(
                    precipitation[index],
                    null
                ),

            weatherCode:
                marketFiniteNumber5(
                    weatherCodes[index],
                    null
                ),

            weatherText:
                weatherCodeText5(
                    weatherCodes[index]
                ),

            windSpeed:
                marketFiniteNumber5(
                    wind[index],
                    null
                )
        })
    );
}

// ======================================================================
// 5.16 — GEOCODING
// ======================================================================

async function geocodeCity5(
    city,
    options = {}
) {

    const query =
        marketSafeString5(
            city
        );

    if (
        !query
    ) {

        throw new Error(
            "city_required"
        );
    }

    if (
        query.length >
        200
    ) {

        throw new Error(
            "city_too_long"
        );
    }

    TURKAI_MARKET_STATS_5
        .geocodingRequests++;

    const language =
        marketSafeString5(
            options.language,
            "tr"
        );

    const count =
        marketClamp5(
            marketFiniteNumber5(
                options.count,
                1
            ),
            1,
            TURKAI_MARKET_CONFIG_5
                .maxCityResults
        );

    const url =
        "https://geocoding-api.open-meteo.com/v1/search" +
        "?name=" +
        encodeURIComponent(
            query
        ) +
        "&count=" +
        encodeURIComponent(
            count
        ) +
        "&language=" +
        encodeURIComponent(
            language
        ) +
        "&format=json";

    try {

        const data =
            await marketFetchJSON5(
                url
            );

        const results =
            Array.isArray(
                data.results
            )
                ? data.results
                : [];

        if (
            !results.length
        ) {

            throw new Error(
                "city_not_found"
            );
        }

        return results.map(
            item => ({

                id:
                    item.id ||
                    null,

                name:
                    item.name ||
                    query,

                latitude:
                    marketFiniteNumber5(
                        item.latitude,
                        null
                    ),

                longitude:
                    marketFiniteNumber5(
                        item.longitude,
                        null
                    ),

                elevation:
                    marketFiniteNumber5(
                        item.elevation,
                        null
                    ),

                countryCode:
                    item.country_code ||
                    null,

                country:
                    item.country ||
                    null,

                admin1:
                    item.admin1 ||
                    null,

                timezone:
                    item.timezone ||
                    null
            })
        );

    } catch (
        error
    ) {

        TURKAI_MARKET_STATS_5
            .geocodingFailures++;

        TURKAI_MARKET_STATS_5
            .lastError =
            error.message;

        TURKAI_MARKET_STATS_5
            .lastErrorAt =
            marketNow5();

        throw error;
    }
}

// ======================================================================
// 5.17 — SINGLE CITY RESOLUTION
// ======================================================================

async function resolveCity5(
    city,
    options = {}
) {

    const results =
        await geocodeCity5(
            city,
            options
        );

    if (
        !results.length
    ) {

        throw new Error(
            "location_not_found"
        );
    }

    if (
        Number.isFinite(
            options.latitude
        ) &&
        Number.isFinite(
            options.longitude
        )
    ) {

        const targetLat =
            options.latitude;

        const targetLon =
            options.longitude;

        let best =
            results[0];

        let bestDistance =
            Infinity;

        for (
            const item
            of results
        ) {

            const distance =
                Math.sqrt(
                    (
                        item.latitude -
                        targetLat
                    ) ** 2 +
                    (
                        item.longitude -
                        targetLon
                    ) ** 2
                );

            if (
                distance <
                bestDistance
            ) {

                bestDistance =
                    distance;

                best =
                    item;
            }
        }

        return best;
    }

    return results[0];
}

// ======================================================================
// 5.18 — OPEN-METEO WEATHER
// ======================================================================

async function fetchWeatherData5(
    city,
    options = {}
) {

    if (
        !TURKAI_MARKET_CONFIG_5
            .weatherEnabled ||
        !TURKAI_MARKET_SETTINGS_5
            .weather
    ) {

        throw new Error(
            "weather_disabled"
        );
    }

    const resolved =
        options.latitude !==
            undefined &&
        options.longitude !==
            undefined
            ? {

                latitude:
                    marketFiniteNumber5(
                        options.latitude
                    ),

                longitude:
                    marketFiniteNumber5(
                        options.longitude
                    ),

                name:
                    marketSafeString5(
                        city,
                        "Konum"
                    ),

                country:
                    options.country ||
                    null,

                admin1:
                    options.admin1 ||
                    null,

                timezone:
                    options.timezone ||
                    null
            }
            : await resolveCity5(
                city,
                options
            );

    if (
        !Number.isFinite(
            resolved.latitude
        ) ||
        !Number.isFinite(
            resolved.longitude
        )
    ) {

        throw new Error(
            "invalid_coordinates"
        );
    }

    const days =
        marketClamp5(
            marketFiniteNumber5(
                options.days,
                TURKAI_MARKET_CONFIG_5
                    .defaultWeatherDays
            ),
            1,
            TURKAI_MARKET_CONFIG_5
                .weatherForecastDays
        );

    const hourlyHours =
        marketClamp5(
            marketFiniteNumber5(
                options.hourlyHours,
                24
            ),
            1,
            168
        );

    const url =
        "https://api.open-meteo.com/v1/forecast" +
        "?latitude=" +
        encodeURIComponent(
            resolved.latitude
        ) +
        "&longitude=" +
        encodeURIComponent(
            resolved.longitude
        ) +
        "&current=" +
        encodeURIComponent(
            [
                "temperature_2m",
                "relative_humidity_2m",
                "apparent_temperature",
                "precipitation",
                "rain",
                "showers",
                "snowfall",
                "weather_code",
                "wind_speed_10m",
                "wind_direction_10m"
            ].join(
                ","
            )
        ) +
        "&hourly=" +
        encodeURIComponent(
            [
                "temperature_2m",
                "apparent_temperature",
                "precipitation_probability",
                "weather_code",
                "wind_speed_10m"
            ].join(
                ","
            )
        ) +
        "&daily=" +
        encodeURIComponent(
            [
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_probability_max",
                "weather_code",
                "sunrise",
                "sunset"
            ].join(
                ","
            )
        ) +
        "&forecast_days=" +
        encodeURIComponent(
            days
        ) +
        "&timezone=auto";

    const data =
        await marketFetchJSON5(
            url
        );

    const normalizedCurrent =
        normalizeWeatherCurrent5(
            data.current
        );

    const normalizedDaily =
        normalizeWeatherDaily5(
            data.daily
        );

    const normalizedHourlyAll =
        normalizeWeatherHourly5(
            data.hourly
        );

    const normalizedHourly =
        normalizedHourlyAll.slice(
            0,
            hourlyHours
        );

    const result = {

        ok:
            true,

        success:
            true,

        provider:
            TURKAI_MARKET_CONFIG_5
                .providers
                .weather,

        location: {

            name:
                resolved.name,

            country:
                resolved.country ||
                null,

            countryCode:
                resolved.countryCode ||
                null,

            admin1:
                resolved.admin1 ||
                null,

            latitude:
                resolved.latitude,

            longitude:
                resolved.longitude,

            timezone:
                data.timezone ||
                resolved.timezone ||
                null
        },

        current:
            normalizedCurrent,

        daily:
            normalizedDaily,

        hourly:
            normalizedHourly,

        units:
            data.current_units ||
            data.daily_units ||
            {},

        forecastDays:
            days,

        timestamp:
            marketNow5()
    };

    return result;
}

// ======================================================================
// 5.19 — WEATHER CACHE WRAPPER
// ======================================================================

async function getWeather5(
    city,
    options = {}
) {

    TURKAI_MARKET_STATS_5
        .weatherRequests++;

    const query =
        marketSafeString5(
            city
        );

    const days =
        marketFiniteNumber5(
            options.days,
            TURKAI_MARKET_CONFIG_5
                .defaultWeatherDays
        );

    const hourlyHours =
        marketFiniteNumber5(
            options.hourlyHours,
            24
        );

    const key =
        [
            "weather",
            marketNormalize5(
                query
            ),
            days,
            hourlyHours
        ].join(
            ":"
        );

    const cached =
        marketCacheGet5(
            key,
            TURKAI_MARKET_CONFIG_5
                .weatherCacheTTL
        );

    if (
        cached
    ) {

        return {
            ...cached,

            cache:
                true
        };
    }

    if (
        TURKAI_MARKET_INFLIGHT_5.has(
            key
        )
    ) {

        return await TURKAI_MARKET_INFLIGHT_5.get(
            key
        );
    }

    const promise =
        (async () => {

            try {

                const result =
                    await fetchWeatherData5(
                        query,
                        options
                    );

                TURKAI_MARKET_STATS_5
                    .weatherSuccesses++;

                TURKAI_MARKET_STATS_5
                    .lastWeather =
                    marketNow5();

                TURKAI_MARKET_STATS_5
                    .totalSources++;

                const historyId =
                    saveMarketHistory5(
                        "weather",
                        result
                    );

                const finalResult = {

                    ...result,

                    cache:
                        false,

                    historyId
                };

                marketCacheSet5(
                    key,
                    finalResult
                );

                return finalResult;

            } catch (
                error
            ) {

                TURKAI_MARKET_STATS_5
                    .weatherFailures++;

                TURKAI_MARKET_STATS_5
                    .lastError =
                    error.message;

                TURKAI_MARKET_STATS_5
                    .lastErrorAt =
                    marketNow5();

                throw error;
            }

        })();

    TURKAI_MARKET_INFLIGHT_5.set(
        key,
        promise
    );

    try {

        return await promise;

    } finally {

        TURKAI_MARKET_INFLIGHT_5.delete(
            key
        );

        writeJSON(
            TURKAI_MARKET_STATS_FILE_5,
            TURKAI_MARKET_STATS_5
        );
    }
}

// ======================================================================
// 5.20 — WEATHER HUMAN SUMMARY
// ======================================================================

function weatherSummary5(
    weather
) {

    if (
        !weather ||
        !weather.current
    ) {

        return "Hava durumu verisi alınamadı.";
    }

    const current =
        weather.current;

    const location =
        weather.location &&
        weather.location.name
            ? weather.location.name
            : "Konum";

    const parts =
        [];

    if (
        Number.isFinite(
            current.temperature
        )
    ) {

        parts.push(
            `Sıcaklık ${current.temperature}°C`
        );
    }

    if (
        Number.isFinite(
            current.apparentTemperature
        )
    ) {

        parts.push(
            `hissedilen ${current.apparentTemperature}°C`
        );
    }

    if (
        Number.isFinite(
            current.humidity
        )
    ) {

        parts.push(
            `nem %${current.humidity}`
        );
    }

    if (
        current.weatherText
    ) {

        parts.push(
            current.weatherText
        );
    }

    if (
        Number.isFinite(
            current.windSpeed
        )
    ) {

        const direction =
            current.windDirectionText
                ? " " +
                  current.windDirectionText
                : "";

        parts.push(
            `rüzgâr ${current.windSpeed} km/sa${direction}`
        );
    }

    return (
        location +
        ": " +
        parts.join(
            ", "
        ) +
        "."
    );
}

// ======================================================================
// 5.21 — CURRENCY CONFIG
// ======================================================================

const DEFAULT_CURRENCY_CODES_5 = [
    "TRY",
    "USD",
    "EUR",
    "GBP",
    "JPY",
    "CHF",
    "CAD",
    "AUD",
    "CNY",
    "SEK",
    "NOK",
    "DKK",
    "PLN",
    "CZK",
    "HUF",
    "RON",
    "BGN",
    "ISK",
    "NZD",
    "SGD",
    "HKD"
];

// ======================================================================
// 5.22 — CURRENCY CACHE
// ======================================================================

const TURKAI_CURRENCY_DEFINITIONS_5 =
    new Map();

// ======================================================================
// 5.23 — CURRENCIES API
// ======================================================================

async function getCurrencyDefinitions5() {

    const cacheKey =
        "currency-definitions";

    const cached =
        marketCacheGet5(
            cacheKey,
            24 * 60 * 60 * 1000
        );

    if (
        cached
    ) {
        return cached;
    }

    const url =
        "https://api.frankfurter.app/currencies";

    const data =
        await marketFetchJSON5(
            url
        );

    const entries =
        [];

    if (
        data &&
        typeof data ===
            "object"
    ) {

        for (
            const [
                code,
                name
            ]
            of Object.entries(
                data
            )
        ) {

            const item = {

                code:
                    marketUpper5(
                        code
                    ),

                name:
                    marketSafeString5(
                        name
                    )
            };

            entries.push(
                item
            );

            TURKAI_CURRENCY_DEFINITIONS_5
                .set(
                    item.code,
                    item
                );
        }
    }

    const result = {

        ok:
            true,

        success:
            true,

        provider:
            TURKAI_MARKET_CONFIG_5
                .providers
                .currency,

        currencies:
            entries
    };

    marketCacheSet5(
        cacheKey,
        result
    );

    return result;
}

// ======================================================================
// 5.24 — CURRENCY VALIDATION
// ======================================================================

async function validateCurrencyCode5(
    code
) {

    const normalized =
        marketUpper5(
            code
        );

    if (
        !normalized
    ) {
        return false;
    }

    if (
        DEFAULT_CURRENCY_CODES_5
            .includes(
                normalized
            )
    ) {
        return true;
    }

    if (
        TURKAI_CURRENCY_DEFINITIONS_5
            .has(
                normalized
            )
    ) {
        return true;
    }

    try {

        await getCurrencyDefinitions5();

    } catch {

        return false;
    }

    return TURKAI_CURRENCY_DEFINITIONS_5
        .has(
            normalized
        );
}

// ======================================================================
// 5.25 — CURRENCY LATEST
// ======================================================================

async function fetchCurrencyRate5(
    from,
    to,
    amount = 1
) {

    const source =
        marketUpper5(
            from,
            "TRY"
        );

    const target =
        marketUpper5(
            to,
            "USD"
        );

    const numericAmount =
        marketFiniteNumber5(
            amount,
            1
        );

    if (
        numericAmount ===
            null ||
        numericAmount < 0
    ) {

        throw new Error(
            "invalid_amount"
        );
    }

    const url =
        "https://api.frankfurter.app/latest" +
        "?from=" +
        encodeURIComponent(
            source
        ) +
        "&to=" +
        encodeURIComponent(
            target
        ) +
        "&amount=" +
        encodeURIComponent(
            numericAmount
        );

    const data =
        await marketFetchJSON5(
            url
        );

    const rate =
        data &&
        data.rates &&
        marketFiniteNumber5(
            data.rates[
                target
            ],
            null
        );

    if (
        rate ===
        null
    ) {

        throw new Error(
            "currency_rate_missing"
        );
    }

    return {

        ok:
            true,

        success:
            true,

        provider:
            TURKAI_MARKET_CONFIG_5
                .providers
                .currency,

        from:
            source,

        to:
            target,

        amount:
            numericAmount,

        result:
            rate,

        rate:
            numericAmount
                ? rate /
                  numericAmount
                : null,

        date:
            data.date ||
            null,

        timestamp:
            marketNow5()
    };
}

// ======================================================================
// 5.26 — CURRENCY WRAPPER
// ======================================================================

async function getCurrency5(
    from = "TRY",
    to = "USD",
    amount = 1,
    options = {}
) {

    TURKAI_MARKET_STATS_5
        .currencyRequests++;

    if (
        !TURKAI_MARKET_SETTINGS_5
            .currency
    ) {

        throw new Error(
            "currency_disabled"
        );
    }

    const source =
        marketUpper5(
            from,
            "TRY"
        );

    const target =
        marketUpper5(
            to,
            "USD"
        );

    const numericAmount =
        marketFiniteNumber5(
            amount,
            1
        );

    const key =
        [
            "currency",
            source,
            target,
            numericAmount
        ].join(
            ":"
        );

    const cached =
        marketCacheGet5(
            key,
            TURKAI_MARKET_CONFIG_5
                .currencyCacheTTL
        );

    if (
        cached
    ) {

        return {
            ...cached,

            cache:
                true
        };
    }

    try {

        const result =
            await fetchCurrencyRate5(
                source,
                target,
                numericAmount
            );

        TURKAI_MARKET_STATS_5
            .currencySuccesses++;

        TURKAI_MARKET_STATS_5
            .lastCurrency =
            marketNow5();

        TURKAI_MARKET_STATS_5
            .totalSources++;

        const historyId =
            saveMarketHistory5(
                "currency",
                result
            );

        const finalResult = {

            ...result,

            cache:
                false,

            historyId
        };

        marketCacheSet5(
            key,
            finalResult
        );

        return finalResult;

    } catch (
        error
    ) {

        TURKAI_MARKET_STATS_5
            .currencyFailures++;

        TURKAI_MARKET_STATS_5
            .lastError =
            error.message;

        TURKAI_MARKET_STATS_5
            .lastErrorAt =
            marketNow5();

        throw error;

    } finally {

        writeJSON(
            TURKAI_MARKET_STATS_FILE_5,
            TURKAI_MARKET_STATS_5
        );
    }
}

// ======================================================================
// 5.27 — CURRENCY POPULAR PAIRS
// ======================================================================

async function getPopularCurrencyPairs5(
    base = "TRY"
) {

    const source =
        marketUpper5(
            base,
            "TRY"
        );

    const targets =
        DEFAULT_CURRENCY_CODES_5
            .filter(
                item =>
                    item !==
                    source
            )
            .slice(
                0,
                12
            );

    const results =
        [];

    for (
        const target
        of targets
    ) {

        try {

            const result =
                await getCurrency5(
                    source,
                    target,
                    1
                );

            results.push(
                result
            );

        } catch (
            error
        ) {

            results.push({
                ok:
                    false,

                from:
                    source,

                to:
                    target,

                error:
                    error.message
            });
        }
    }

    return {

        ok:
            true,

        success:
            true,

        base:
            source,

        count:
            results.length,

        results
    };
}

// ======================================================================
// 5.28 — GOLD CONFIG
// ======================================================================

const TURKAI_GOLD_CONFIG_5 = {

    enabled:
        true,

    provider:
        "gold-api",

    xauURL:
        "https://api.gold-api.com/price/XAU",

    timeout:
        15000,

    cacheTTL:
        15 * 60 * 1000,

    gramFactor:
        31.1034768,

    defaultUSDTRY:
        null
};

// ======================================================================
// 5.29 — GOLD API
// ======================================================================

async function fetchGoldUSD5() {

    const url =
        TURKAI_GOLD_CONFIG_5
            .xauURL;

    const data =
        await marketFetchJSON5(
            url,
            {},
            TURKAI_GOLD_CONFIG_5
                .timeout
        );

    let price =
        null;

    if (
        data &&
        Number.isFinite(
            Number(
                data.price
            )
        )
    ) {

        price =
            Number(
                data.price
            );
    }

    if (
        price ===
        null &&
        data &&
        data.XAU
    ) {

        price =
            Number(
                data.XAU
            );
    }

    if (
        price ===
        null
    ) {

        throw new Error(
            "gold_price_missing"
        );
    }

    return {

        ok:
            true,

        success:
            true,

        provider:
            "gold-api",

        xauUsd:
            price,

        unit:
            "USD_per_troy_ounce",

        timestamp:
            marketNow5()
    };
}

// ======================================================================
// 5.30 — GOLD TRY CALCULATION
// ======================================================================

async function calculateGoldTRY5(
    xauUSD,
    options = {}
) {

    let usdTry =
        marketFiniteNumber5(
            options.usdTry,
            null
        );

    let usdTryData =
        null;

    if (
        usdTry ===
        null
    ) {

        usdTryData =
            await getCurrency5(
                "USD",
                "TRY",
                1
            );

        usdTry =
            marketFiniteNumber5(
                usdTryData.rate,
                null
            );
    }

    if (
        usdTry ===
            null ||
        xauUSD ===
            null
    ) {

        return {

            usdTry:
                null,

            xauTry:
                null,

            gramTry:
                null,

            gramUSD:
                null,

            usdTryData
        };
    }

    const xauTry =
        xauUSD *
        usdTry;

    const gramUSD =
        xauUSD /
        TURKAI_GOLD_CONFIG_5
            .gramFactor;

    const gramTry =
        xauTry /
        TURKAI_GOLD_CONFIG_5
            .gramFactor;

    return {

        usdTry,

        xauTry,

        gramUSD,

        gramTry,

        usdTryData
    };
}

// ======================================================================
// 5.31 — GOLD WRAPPER
// ======================================================================

async function getGold5(
    options = {}
) {

    TURKAI_MARKET_STATS_5
        .goldRequests++;

    if (
        !TURKAI_MARKET_SETTINGS_5
            .gold
    ) {

        throw new Error(
            "gold_disabled"
        );
    }

    const key =
        "gold:latest";

    const cached =
        marketCacheGet5(
            key,
            TURKAI_MARKET_CONFIG_5
                .goldCacheTTL
        );

    if (
        cached
    ) {

        return {
            ...cached,

            cache:
                true
        };
    }

    try {

        const base =
            await fetchGoldUSD5();

        const calculated =
            await calculateGoldTRY5(
                base.xauUsd,
                options
            );

        const result = {

            ok:
                true,

            success:
                true,

            provider:
                base.provider,

            xauUSD:
                base.xauUsd,

            xauTRY:
                calculated.xauTry,

            gramUSD:
                calculated.gramUSD,

            gramTRY:
                calculated.gramTry,

            usdTRY:
                calculated.usdTry,

            troyOunce:
                {
                    unit:
                        "oz",

                    usd:
                        base.xauUsd,

                    try:
                        calculated.xauTry
                },

            gram:
                {
                    unit:
                        "gram",

                    usd:
                        calculated.gramUSD,

                    try:
                        calculated.gramTry
                },

            timestamp:
                marketNow5()
        };

        TURKAI_MARKET_STATS_5
            .goldSuccesses++;

        TURKAI_MARKET_STATS_5
            .lastGold =
            marketNow5();

        TURKAI_MARKET_STATS_5
            .totalSources++;

        const historyId =
            saveMarketHistory5(
                "gold",
                result
            );

        const finalResult = {

            ...result,

            cache:
                false,

            historyId
        };

        marketCacheSet5(
            key,
            finalResult
        );

        return finalResult;

    } catch (
        error
    ) {

        TURKAI_MARKET_STATS_5
            .goldFailures++;

        TURKAI_MARKET_STATS_5
            .lastError =
            error.message;

        TURKAI_MARKET_STATS_5
            .lastErrorAt =
            marketNow5();

        return {

            ok:
                false,

            success:
                false,

            provider:
                TURKAI_GOLD_CONFIG_5
                    .provider,

            xauUSD:
                null,

            xauTRY:
                null,

            gramUSD:
                null,

            gramTRY:
                null,

            usdTRY:
                null,

            error:
                error.message,

            timestamp:
                marketNow5()
        };

    } finally {

        writeJSON(
            TURKAI_MARKET_STATS_FILE_5,
            TURKAI_MARKET_STATS_5
        );
    }
}

// ======================================================================
// 5.32 — MARKET ROUTER
// ======================================================================

function detectMarketIntent5(
    message
) {

    const text =
        marketNormalize5(
            message
        );

    const weather =
        [
            "hava",
            "hava durumu",
            "sıcaklık",
            "sicaklik",
            "yağmur",
            "yagmur",
            "kar yağacak",
            "kar yağışı",
            "rüzgar",
            "ruzgar"
        ].some(
            keyword =>
                text.includes(
                    keyword
                )
        );

    const currency =
        [
            "dolar",
            "euro",
            "eur",
            "usd",
            "gbp",
            "sterlin",
            "döviz",
            "doviz",
            "kur",
            "kaç tl",
            "kac tl"
        ].some(
            keyword =>
                text.includes(
                    keyword
                )
        );

    const gold =
        [
            "altın",
            "altin",
            "gram altın",
            "gram altin",
            "ons altın",
            "ons altin",
            "xau",
            "çeyrek altın",
            "ceyrek altin"
        ].some(
            keyword =>
                text.includes(
                    keyword
                )
        );

    return {

        weather,

        currency,

        gold,

        market:
            weather ||
            currency ||
            gold
    };
}

// ======================================================================
// 5.33 — CITY EXTRACTION
// ======================================================================

function extractCityFromMessage5(
    message
) {

    const text =
        marketSafeString5(
            message
        );

    const patterns = [

        /(.+?)\s+hava\s+durumu/i,

        /(.+?)\s+hava/i,

        /(.+?)\s+sıcaklık/i,

        /(.+?)\s+kaç\s+derece/i,

        /(.+?)\s+rüzgar/i,

        /(.+?)\s+yağmur/i

    ];

    for (
        const pattern
        of patterns
    ) {

        const match =
            text.match(
                pattern
            );

        if (
            match &&
            match[1]
        ) {

            const city =
                marketSafeString5(
                    match[1]
                );

            if (
                city.length >=
                2 &&
                city.length <=
                100
            ) {

                return city
                    .replace(
                        /^(bugün|yarın|yarin|şimdi|simdi)\s+/i,
                        ""
                    )
                    .trim();
            }
        }
    }

    return null;
}

// ======================================================================
// 5.34 — CURRENCY EXTRACTION
// ======================================================================

function extractCurrencyRequest5(
    message
) {

    const text =
        marketNormalize5(
            message
        );

    let from =
        null;

    let to =
        null;

    let amount =
        1;

    const amountMatch =
        text.match(
            /(\d+(?:[.,]\d+)?)\s*(?:tl|₺|usd|dolar|euro|eur|gbp|sterlin)?/i
        );

    if (
        amountMatch
    ) {

        const parsed =
            Number(
                String(
                    amountMatch[1]
                ).replace(
                    ",",
                    "."
                )
            );

        if (
            Number.isFinite(
                parsed
            )
        ) {

            amount =
                parsed;
        }
    }

    if (
        /\bdolar\b|\busd\b/.test(
            text
        )
    ) {
        from =
            "USD";
    }

    if (
        /\beuro\b|\beur\b/.test(
            text
        )
    ) {
        from =
            "EUR";
    }

    if (
        /\bsterlin\b|\bgbp\b/.test(
            text
        )
    ) {
        from =
            "GBP";
    }

    if (
        /\btl\b|\btry\b|\btürk lirası\b|\bturk lirasi\b/.test(
            text
        )
    ) {

        if (
            !from
        ) {
            from =
                "TRY";
        } else {
            to =
                "TRY";
        }
    }

    if (
        text.includes(
            "tl"
        ) ||
        text.includes(
            "lira"
        )
    ) {

        to =
            "TRY";
    }

    if (
        !from
    ) {

        from =
            "TRY";
    }

    if (
        !to
    ) {

        to =
            from ===
                "TRY"
                ? "USD"
                : "TRY";
    }

    return {

        from,

        to,

        amount
    };
}

// ======================================================================
// 5.35 — SPECIAL GOLD TYPE
// ======================================================================

function detectGoldType5(
    message
) {

    const text =
        marketNormalize5(
            message
        );

    if (
        text.includes(
            "gram"
        )
    ) {

        return "gram";
    }

    if (
        text.includes(
            "ons"
        ) ||
        text.includes(
            "xau"
        )
    ) {

        return "ounce";
    }

    if (
        text.includes(
            "çeyrek"
        ) ||
        text.includes(
            "ceyrek"
        )
    ) {

        return "quarter";
    }

    if (
        text.includes(
            "yarım"
        ) ||
        text.includes(
            "yarim"
        )
    ) {

        return "half";
    }

    if (
        text.includes(
            "tam altın"
        ) ||
        text.includes(
            "tam altin"
        )
    ) {

        return "full";
    }

    return "gram";
}

// ======================================================================
// 5.36 — GOLD PRESENTATION
// ======================================================================

function formatGoldForUser5(
    gold,
    type =
        "gram"
) {

    if (
        !gold ||
        !gold.success
    ) {

        return "Güncel altın verisi şu anda alınamadı.";
    }

    if (
        type ===
        "ounce"
    ) {

        if (
            Number.isFinite(
                gold.xauUSD
            )
        ) {

            return (
                `1 ons altın yaklaşık ${gold.xauUSD.toFixed(2)} USD`
            );
        }
    }

    if (
        type ===
        "gram"
    ) {

        if (
            Number.isFinite(
                gold.gramTRY
            )
        ) {

            return (
                `1 gram altın yaklaşık ${gold.gramTRY.toFixed(2)} TL`
            );
        }
    }

    if (
        type ===
        "quarter"
    ) {

        if (
            Number.isFinite(
                gold.gramTRY
            )
        ) {

            const quarter =
                gold.gramTRY *
                1.75;

            return (
                `Yaklaşık çeyrek altın hesaplaması ${quarter.toFixed(2)} TL civarında olur. Kuyumcu satış fiyatı bundan farklı olabilir.`
            );
        }
    }

    if (
        type ===
        "half"
    ) {

        if (
            Number.isFinite(
                gold.gramTRY
            )
        ) {

            const half =
                gold.gramTRY *
                3.5;

            return (
                `Yaklaşık yarım altın hesaplaması ${half.toFixed(2)} TL civarında olur. Kuyumcu fiyatı farklı olabilir.`
            );
        }
    }

    if (
        type ===
        "full"
    ) {

        if (
            Number.isFinite(
                gold.gramTRY
            )
        ) {

            const full =
                gold.gramTRY *
                7;

            return (
                `Yaklaşık tam altın hesaplaması ${full.toFixed(2)} TL civarında olur. Kuyumcu fiyatı farklı olabilir.`
            );
        }
    }

    return "Altın verisi bulundu fakat istenen tür hesaplanamadı.";
}

// ======================================================================
// 5.37 — MARKET AUTO ROUTER
// ======================================================================

async function routeMarketRequest5(
    message,
    options = {}
) {

    const query =
        marketSafeString5(
            message
        );

    if (
        !query
    ) {

        throw new Error(
            "message_required"
        );
    }

    const intent =
        detectMarketIntent5(
            query
        );

    if (
        intent.weather
    ) {

        const city =
            extractCityFromMessage5(
                query
            ) ||
            options.city ||
            "Konya";

        const weather =
            await getWeather5(
                city,
                {
                    days:
                        options.days ||
                        5,

                    hourlyHours:
                        options.hourlyHours ||
                        24
                }
            );

        return {

            ok:
                true,

            success:
                true,

            type:
                "weather",

            intent,

            city,

            result:
                weather,

            answer:
                weatherSummary5(
                    weather
                )
        };
    }

    if (
        intent.gold
    ) {

        const gold =
            await getGold5();

        const goldType =
            detectGoldType5(
                query
            );

        return {

            ok:
                true,

            success:
                true,

            type:
                "gold",

            intent,

            goldType,

            result:
                gold,

            answer:
                formatGoldForUser5(
                    gold,
                    goldType
                )
        };
    }

    if (
        intent.currency
    ) {

        const request =
            extractCurrencyRequest5(
                query
            );

        const currency =
            await getCurrency5(
                request.from,
                request.to,
                request.amount
            );

        const rateText =
            Number.isFinite(
                currency.result
            )
                ? currency.result
                    .toFixed(
                        4
                    )
                : String(
                    currency.result
                );

        return {

            ok:
                true,

            success:
                true,

            type:
                "currency",

            intent,

            request,

            result:
                currency,

            answer:
                `${request.amount} ${request.from} ≈ ${rateText} ${request.to}`
        };
    }

    return {

        ok:
            true,

        success:
            true,

        type:
            "none",

        intent,

        result:
            null,

        answer:
            null
    };
}

// ======================================================================
// 5.38 — WEATHER API
// ======================================================================

app.get(
    "/api/weather",
    async (
        req,
        res
    ) => {

        const city =
            marketSafeString5(
                req.query.city ||
                req.query.q
            );

        if (
            !city
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "city_required"
            });
        }

        try {

            const result =
                await getWeather5(
                    city,
                    {
                        days:
                            req.query.days,

                        hourlyHours:
                            req.query.hourlyHours,

                        language:
                            req.query.language ||
                            "tr"
                    }
                );

            return res.json(
                result
            );

        } catch (
            error
        ) {

            runtime.errors++;

            return res.status(
                502
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "weather_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 5.39 — WEATHER POST API
// ======================================================================

app.post(
    "/api/weather",
    async (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const city =
            marketSafeString5(
                body.city ||
                body.location ||
                body.query
            );

        if (
            !city
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "city_required"
            });
        }

        try {

            const result =
                await getWeather5(
                    city,
                    {
                        days:
                            body.days,

                        hourlyHours:
                            body.hourlyHours,

                        language:
                            body.language ||
                            "tr"
                    }
                );

            return res.json(
                result
            );

        } catch (
            error
        ) {

            runtime.errors++;

            return res.status(
                502
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "weather_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 5.40 — GEOCODING API
// ======================================================================

app.get(
    "/api/weather/geocode",
    async (
        req,
        res
    ) => {

        const city =
            marketSafeString5(
                req.query.q ||
                req.query.city
            );

        if (
            !city
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "city_required"
            });
        }

        try {

            const results =
                await geocodeCity5(
                    city,
                    {
                        language:
                            req.query.language ||
                            "tr",

                        count:
                            req.query.count
                    }
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                query:
                    city,

                results
            });

        } catch (
            error
        ) {

            return res.status(
                502
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "geocode_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 5.41 — CURRENCY API
// ======================================================================

app.get(
    "/api/currency",
    async (
        req,
        res
    ) => {

        const from =
            marketUpper5(
                req.query.from ||
                "TRY"
            );

        const to =
            marketUpper5(
                req.query.to ||
                "USD"
            );

        const amount =
            marketFiniteNumber5(
                req.query.amount,
                1
            );

        try {

            const result =
                await getCurrency5(
                    from,
                    to,
                    amount
                );

            return res.json(
                result
            );

        } catch (
            error
        ) {

            runtime.errors++;

            return res.status(
                502
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "currency_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 5.42 — CURRENCY POST API
// ======================================================================

app.post(
    "/api/currency",
    async (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const from =
            marketUpper5(
                body.from ||
                "TRY"
            );

        const to =
            marketUpper5(
                body.to ||
                "USD"
            );

        const amount =
            marketFiniteNumber5(
                body.amount,
                1
            );

        try {

            const result =
                await getCurrency5(
                    from,
                    to,
                    amount
                );

            return res.json(
                result
            );

        } catch (
            error
        ) {

            runtime.errors++;

            return res.status(
                502
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "currency_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 5.43 — CURRENCIES LIST
// ======================================================================

app.get(
    "/api/currency/list",
    async (
        req,
        res
    ) => {

        try {

            const result =
                await getCurrencyDefinitions5();

            return res.json(
                result
            );

        } catch (
            error
        ) {

            return res.status(
                502
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "currency_list_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 5.44 — POPULAR CURRENCY PAIRS
// ======================================================================

app.get(
    "/api/currency/popular",
    async (
        req,
        res
    ) => {

        const base =
            marketUpper5(
                req.query.base ||
                "TRY"
            );

        try {

            const result =
                await getPopularCurrencyPairs5(
                    base
                );

            return res.json(
                result
            );

        } catch (
            error
        ) {

            return res.status(
                502
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "popular_currency_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 5.45 — GOLD API
// ======================================================================

app.get(
    "/api/gold",
    async (
        req,
        res
    ) => {

        try {

            const result =
                await getGold5({
                    usdTry:
                        req.query.usdTry
                });

            return res.json(
                result
            );

        } catch (
            error
        ) {

            return res.status(
                502
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "gold_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 5.46 — GOLD POST API
// ======================================================================

app.post(
    "/api/gold",
    async (
        req,
        res
    ) => {

        try {

            const result =
                await getGold5({
                    usdTry:
                        req.body &&
                        req.body.usdTry
                });

            return res.json(
                result
            );

        } catch (
            error
        ) {

            return res.status(
                502
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "gold_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 5.47 — MARKET AUTO API
// ======================================================================

app.post(
    "/api/market/auto",
    async (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const message =
            marketSafeString5(
                body.message ||
                body.query ||
                body.question
            );

        if (
            !message
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "message_required"
            });
        }

        try {

            const result =
                await routeMarketRequest5(
                    message,
                    body
                );

            return res.json(
                result
            );

        } catch (
            error
        ) {

            runtime.errors++;

            return res.status(
                502
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "market_auto_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 5.48 — MARKET INTENT API
// ======================================================================

app.get(
    "/api/market/intent",
    (
        req,
        res
    ) => {

        const message =
            marketSafeString5(
                req.query.q ||
                req.query.message
            );

        if (
            !message
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "message_required"
            });
        }

        return res.json({

            ok:
                true,

            success:
                true,

            message,

            intent:
                detectMarketIntent5(
                    message
                )
        });
    }
);

// ======================================================================
// 5.49 — MARKET HISTORY LIST
// ======================================================================

app.get(
    "/api/market/history",
    (
        req,
        res
    ) => {

        let files =
            [];

        try {

            files =
                fs
                    .readdirSync(
                        TURKAI_MARKET_HISTORY_DIR_5
                    )
                    .filter(
                        file =>
                            file.endsWith(
                                ".json"
                            )
                    )
                    .sort()
                    .reverse()
                    .slice(
                        0,
                        500
                    );

        } catch {

            files =
                [];
        }

        return res.json({

            ok:
                true,

            success:
                true,

            count:
                files.length,

            files
        });
    }
);

// ======================================================================
// 5.50 — MARKET HISTORY ITEM
// ======================================================================

app.get(
    "/api/market/history/:id",
    (
        req,
        res
    ) => {

        const id =
            marketSafeString5(
                req.params.id
            );

        const file =
            path.join(
                TURKAI_MARKET_HISTORY_DIR_5,
                `${id}.json`
            );

        const data =
            readJSON(
                file,
                null
            );

        if (
            !data
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "market_history_not_found"
            });
        }

        return res.json({

            ok:
                true,

            success:
                true,

            ...data
        });
    }
);

// ======================================================================
// 5.51 — MARKET CACHE CLEAR
// ======================================================================

app.post(
    "/api/market/cache/clear",
    (
        req,
        res
    ) => {

        const adminKey =
            marketSafeString5(
                req.body &&
                req.body.adminKey
            );

        const expected =
            marketSafeString5(
                process.env.TURKAI_ADMIN_KEY
            );

        if (
            !expected ||
            adminKey !==
                expected
        ) {

            return res.status(
                403
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "invalid_admin_key"
            });
        }

        TURKAI_MARKET_CACHE_5.clear();

        let removed =
            0;

        try {

            const files =
                fs.readdirSync(
                    TURKAI_MARKET_CACHE_DIR_5
                );

            for (
                const file
                of files
            ) {

                if (
                    !file.endsWith(
                        ".json"
                    )
                ) {
                    continue;
                }

                try {

                    fs.unlinkSync(
                        path.join(
                            TURKAI_MARKET_CACHE_DIR_5,
                            file
                        )
                    );

                    removed++;

                } catch {
                    // ignore
                }
            }

        } catch {
            // ignore
        }

        return res.json({

            ok:
                true,

            success:
                true,

            removed,

            cacheSize:
                TURKAI_MARKET_CACHE_5
                    .size
        });
    }
);

// ======================================================================
// 5.52 — MARKET SETTINGS API
// ======================================================================

app.get(
    "/api/market/settings",
    (
        req,
        res
    ) => {

        return res.json({

            ok:
                true,

            success:
                true,

            config:
                TURKAI_MARKET_CONFIG_5,

            settings:
                TURKAI_MARKET_SETTINGS_5
        });
    }
);

// ======================================================================
// 5.53 — MARKET STATS API
// ======================================================================

app.get(
    "/api/market/stats",
    (
        req,
        res
    ) => {

        return res.json({

            ok:
                true,

            success:
                true,

            stats:
                TURKAI_MARKET_STATS_5,

            cacheSize:
                TURKAI_MARKET_CACHE_5
                    .size,

            inFlight:
                TURKAI_MARKET_INFLIGHT_5
                    .size
        });
    }
);

// ======================================================================
// 5.54 — MARKET HEALTH
// ======================================================================

app.get(
    "/api/market/health",
    async (
        req,
        res
    ) => {

        const checks = {

            engine:
                true,

            weather:
                false,

            currency:
                false,

            gold:
                false
        };

        let weatherError =
            null;

        let currencyError =
            null;

        let goldError =
            null;

        try {

            await getWeather5(
                "Konya",
                {
                    days:
                        1,

                    hourlyHours:
                        1
                }
            );

            checks.weather =
                true;

        } catch (
            error
        ) {

            weatherError =
                error.message;
        }

        try {

            await getCurrency5(
                "USD",
                "TRY",
                1
            );

            checks.currency =
                true;

        } catch (
            error
        ) {

            currencyError =
                error.message;
        }

        try {

            const gold =
                await getGold5();

            checks.gold =
                Boolean(
                    gold &&
                    gold.success
                );

            if (
                !checks.gold &&
                gold &&
                gold.error
            ) {
                goldError =
                    gold.error;
            }

        } catch (
            error
        ) {

            goldError =
                error.message;
        }

        const healthy =
            checks.engine;

        return res.status(
            healthy
                ? 200
                : 503
        ).json({

            ok:
                healthy,

            success:
                healthy,

            healthy,

            checks,

            errors: {
                weather:
                    weatherError,

                currency:
                    currencyError,

                gold:
                    goldError
            },

            timestamp:
                marketNow5()
        });
    }
);

// ======================================================================
// 5.55 — SPECIALIZED WEATHER SEARCH
// ======================================================================

app.get(
    "/api/market/weather/:city",
    async (
        req,
        res
    ) => {

        const city =
            marketSafeString5(
                req.params.city
            );

        if (
            !city
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                error:
                    "city_required"
            });
        }

        try {

            const result =
                await getWeather5(
                    city,
                    {
                        days:
                            req.query.days ||
                            5,

                        hourlyHours:
                            req.query.hourlyHours ||
                            24
                    }
                );

            return res.json(
                result
            );

        } catch (
            error
        ) {

            return res.status(
                502
            ).json({

                ok:
                    false,

                error:
                    "market_weather_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 5.56 — SPECIALIZED CURRENCY SEARCH
// ======================================================================

app.get(
    "/api/market/currency/:from/:to",
    async (
        req,
        res
    ) => {

        const from =
            marketUpper5(
                req.params.from
            );

        const to =
            marketUpper5(
                req.params.to
            );

        const amount =
            marketFiniteNumber5(
                req.query.amount,
                1
            );

        try {

            const result =
                await getCurrency5(
                    from,
                    to,
                    amount
                );

            return res.json(
                result
            );

        } catch (
            error
        ) {

            return res.status(
                502
            ).json({

                ok:
                    false,

                error:
                    "market_currency_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 5.57 — SPECIALIZED GOLD SEARCH
// ======================================================================

app.get(
    "/api/market/gold/latest",
    async (
        req,
        res
    ) => {

        try {

            const result =
                await getGold5({
                    usdTry:
                        req.query.usdTry
                });

            return res.json(
                result
            );

        } catch (
            error
        ) {

            return res.status(
                502
            ).json({

                ok:
                    false,

                error:
                    "market_gold_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 5.58 — MARKET QUICK SUMMARY
// ======================================================================

async function getMarketQuickSummary5(
    city = "Konya"
) {

    const output = {

        city,

        weather:
            null,

        usdTry:
            null,

        eurTry:
            null,

        gramGoldTRY:
            null,

        timestamp:
            marketNow5()
    };

    try {

        const weather =
            await getWeather5(
                city,
                {
                    days:
                        1,

                    hourlyHours:
                        1
                }
            );

        output.weather = {

            summary:
                weatherSummary5(
                    weather
                ),

            current:
                weather.current,

            location:
                weather.location
        };

    } catch {
        // optional
    }

    try {

        const usd =
            await getCurrency5(
                "USD",
                "TRY",
                1
            );

        output.usdTry =
            usd.rate;

    } catch {
        // optional
    }

    try {

        const eur =
            await getCurrency5(
                "EUR",
                "TRY",
                1
            );

        output.eurTry =
            eur.rate;

    } catch {
        // optional
    }

    try {

        const gold =
            await getGold5();

        output.gramGoldTRY =
            gold.gramTRY;

    } catch {
        // optional
    }

    return {

        ok:
            true,

        success:
            true,

        ...output
    };
}

// ======================================================================
// 5.59 — QUICK SUMMARY API
// ======================================================================

app.get(
    "/api/market/summary",
    async (
        req,
        res
    ) => {

        const city =
            marketSafeString5(
                req.query.city ||
                "Konya"
            );

        try {

            const result =
                await getMarketQuickSummary5(
                    city
                );

            return res.json(
                result
            );

        } catch (
            error
        ) {

            return res.status(
                502
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "market_summary_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 5.60 — ROUTER BRIDGES
// ======================================================================

serverState.market =
    serverState.market ||
    {};

serverState.market.config =
    TURKAI_MARKET_CONFIG_5;

serverState.market.settings =
    TURKAI_MARKET_SETTINGS_5;

serverState.market.stats =
    TURKAI_MARKET_STATS_5;

serverState.market.weather =
    getWeather5;

serverState.market.currency =
    getCurrency5;

serverState.market.gold =
    getGold5;

serverState.market.route =
    routeMarketRequest5;

serverState.market.quick =
    getMarketQuickSummary5;

serverState.market.geocode =
    geocodeCity5;

serverState.market.detectIntent =
    detectMarketIntent5;

// ======================================================================
// 5.61 — GLOBAL MARKET BRIDGE
// ======================================================================

global.turkAI =
    global.turkAI ||
    {};

global.turkAI.market =
    global.turkAI.market ||
    {};

global.turkAI.market.weather =
    getWeather5;

global.turkAI.market.currency =
    getCurrency5;

global.turkAI.market.gold =
    getGold5;

global.turkAI.market.route =
    routeMarketRequest5;

global.turkAI.market.quick =
    getMarketQuickSummary5;

// ======================================================================
// 5.62 — AI MARKET CONTEXT
// ======================================================================

async function buildMarketAIContext5(
    message,
    options = {}
) {

    const intent =
        detectMarketIntent5(
            message
        );

    if (
        !intent.market
    ) {

        return {

            shouldUseMarket:
                false,

            type:
                "none",

            context:
                "",

            result:
                null
        };
    }

    try {

        const routed =
            await routeMarketRequest5(
                message,
                options
            );

        if (
            !routed ||
            !routed.result
        ) {

            return {

                shouldUseMarket:
                    false,

                type:
                    routed &&
                    routed.type
                        ? routed.type
                        : "none",

                context:
                    "",

                result:
                    routed
            };
        }

        let context =
            "";

        if (
            routed.type ===
            "weather"
        ) {

            const weather =
                routed.result;

            context =
                [
                    "GÜNCEL HAVA DURUMU",

                    `Konum: ${weather.location?.name || "-"}`,

                    `Ülke: ${weather.location?.country || "-"}`,

                    `Zaman dilimi: ${weather.location?.timezone || "-"}`,

                    `Sıcaklık: ${weather.current?.temperature ?? "-"} °C`,

                    `Hissedilen: ${weather.current?.apparentTemperature ?? "-"} °C`,

                    `Nem: ${weather.current?.humidity ?? "-"}%`,

                    `Durum: ${weather.current?.weatherText || "-"}`,

                    `Rüzgâr: ${weather.current?.windSpeed ?? "-"} km/sa`,

                    `Alınma zamanı: ${weather.timestamp}`
                ]
                    .join(
                        "\n"
                    );
        }

        if (
            routed.type ===
            "currency"
        ) {

            const currency =
                routed.result;

            context =
                [
                    "GÜNCEL DÖVİZ",

                    `Kaynak: ${currency.from}`,

                    `Hedef: ${currency.to}`,

                    `Miktar: ${currency.amount}`,

                    `Sonuç: ${currency.result}`,

                    `Kur: ${currency.rate}`,

                    `Tarih: ${currency.date || "-"}`,

                    `Sağlayıcı: ${currency.provider}`
                ]
                    .join(
                        "\n"
                    );
        }

        if (
            routed.type ===
            "gold"
        ) {

            const gold =
                routed.result;

            context =
                [
                    "GÜNCEL ALTIN",

                    `Ons USD: ${gold.xauUSD ?? "-"}`,

                    `Ons TRY: ${gold.xauTRY ?? "-"}`,

                    `Gram USD: ${gold.gramUSD ?? "-"}`,

                    `Gram TRY: ${gold.gramTRY ?? "-"}`,

                    `USD/TRY: ${gold.usdTRY ?? "-"}`,

                    `Sağlayıcı: ${gold.provider || "-"}`
                ]
                    .join(
                        "\n"
                    );
        }

        return {

            shouldUseMarket:
                true,

            type:
                routed.type,

            context,

            result:
                routed
        };

    } catch (
        error
    ) {

        return {

            shouldUseMarket:
                false,

            type:
                "error",

            context:
                "",

            result:
                null,

            error:
                error.message
        };
    }
}

// ======================================================================
// 5.63 — AI MARKET CONTEXT API
// ======================================================================

app.post(
    "/api/market/context",
    async (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const message =
            marketSafeString5(
                body.message ||
                body.query ||
                body.question
            );

        if (
            !message
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "message_required"
            });
        }

        try {

            const result =
                await buildMarketAIContext5(
                    message,
                    body
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                ...result
            });

        } catch (
            error
        ) {

            return res.status(
                500
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "market_context_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 5.64 — MARKET CLEANUP
// ======================================================================

function cleanupMarketCache5() {

    let removed =
        0;

    try {

        const files =
            fs.readdirSync(
                TURKAI_MARKET_CACHE_DIR_5
            );

        for (
            const file
            of files
        ) {

            if (
                !file.endsWith(
                    ".json"
                )
            ) {
                continue;
            }

            const full =
                path.join(
                    TURKAI_MARKET_CACHE_DIR_5,
                    file
                );

            const data =
                readJSON(
                    full,
                    null
                );

            if (
                !data ||
                !data.timestamp
            ) {

                try {

                    fs.unlinkSync(
                        full
                    );

                    removed++;

                } catch {
                    // ignore
                }

                continue;
            }

            const age =
                Date.now() -
                new Date(
                    data.timestamp
                ).getTime();

            if (
                Number.isFinite(
                    age
                ) &&
                age >
                    24 * 60 * 60 * 1000
            ) {

                try {

                    fs.unlinkSync(
                        full
                    );

                    removed++;

                } catch {
                    // ignore
                }
            }
        }

    } catch {
        // ignore
    }

    return removed;
}

// ======================================================================
// 5.65 — MARKET HISTORY CLEANUP
// ======================================================================

function cleanupMarketHistory5() {

    let removed =
        0;

    try {

        const files =
            fs.readdirSync(
                TURKAI_MARKET_HISTORY_DIR_5
            )
            .filter(
                file =>
                    file.endsWith(
                        ".json"
                    )
            )
            .sort();

        const max =
            5000;

        if (
            files.length <=
            max
        ) {
            return 0;
        }

        const excess =
            files.length -
            max;

        for (
            const file
            of files.slice(
                0,
                excess
            )
        ) {

            try {

                fs.unlinkSync(
                    path.join(
                        TURKAI_MARKET_HISTORY_DIR_5,
                        file
                    )
                );

                removed++;

            } catch {
                // ignore
            }
        }

    } catch {
        // ignore
    }

    return removed;
}

// ======================================================================
// 5.66 — PERIODIC MARKET CLEANUP
// ======================================================================

setInterval(
    () => {

        try {

            cleanupMarketCache5();

            cleanupMarketHistory5();

            writeJSON(
                TURKAI_MARKET_STATS_FILE_5,
                TURKAI_MARKET_STATS_5
            );

            writeJSON(
                TURKAI_MARKET_SETTINGS_FILE_5,
                TURKAI_MARKET_SETTINGS_5
            );

        } catch (
            error
        ) {

            console.warn(
                "[Market/Cleanup]",
                error.message
            );
        }

    },
    10 * 60 * 1000
);

// ======================================================================
// 5.67 — MODEL ROUTING BRIDGE
// ======================================================================

async function enrichAIRequestWithMarket5(
    message,
    options = {}
) {

    const context =
        await buildMarketAIContext5(
            message,
            options
        );

    if (
        !context.shouldUseMarket
    ) {

        return {

            ...options,

            marketContext:
                "",

            market:
                null
        };
    }

    return {

        ...options,

        marketContext:
            context.context,

        market:
            context.result
    };
}

// ======================================================================
// 5.68 — AUTO MARKET DETECTION
// ======================================================================

function shouldUseMarketEngine5(
    message
) {

    const intent =
        detectMarketIntent5(
            message
        );

    return Boolean(
        intent.market
    );
}

// ======================================================================
// 5.69 — API ROUTER STATUS
// ======================================================================

app.get(
    "/api/market/router/status",
    (
        req,
        res
    ) => {

        return res.json({

            ok:
                true,

            success:
                true,

            engine:
                "TürkAI Market Engine 5.0",

            enabled:
                TURKAI_MARKET_CONFIG_5
                    .enabled,

            weather:
                TURKAI_MARKET_SETTINGS_5
                    .weather,

            currency:
                TURKAI_MARKET_SETTINGS_5
                    .currency,

            gold:
                TURKAI_MARKET_SETTINGS_5
                    .gold,

            cache:
                TURKAI_MARKET_SETTINGS_5
                    .cache,

            history:
                TURKAI_MARKET_SETTINGS_5
                    .history,

            providers:
                TURKAI_MARKET_CONFIG_5
                    .providers
        });
    }
);

// ======================================================================
// 5.70 — SAFE NUMERIC DISPLAY
// ======================================================================

function marketFormatNumber5(
    value,
    decimals = 2
) {

    const numeric =
        marketFiniteNumber5(
            value,
            null
        );

    if (
        numeric ===
        null
    ) {
        return "-";
    }

    return numeric.toLocaleString(
        "tr-TR",
        {
            minimumFractionDigits:
                decimals,

            maximumFractionDigits:
                decimals
        }
    );
}

// ======================================================================
// 5.71 — WEATHER CARD FORMAT
// ======================================================================

function buildWeatherCard5(
    weather
) {

    if (
        !weather ||
        !weather.current
    ) {

        return {
            type:
                "weather",

            title:
                "Hava Durumu",

            body:
                "Veri alınamadı.",

            location:
                null
        };
    }

    return {

        type:
            "weather",

        title:
            weather.location &&
            weather.location.name
                ? `${weather.location.name} Hava Durumu`
                : "Hava Durumu",

        body:
            weatherSummary5(
                weather
            ),

        location:
            weather.location,

        current:
            weather.current,

        daily:
            weather.daily || []
    };
}

// ======================================================================
// 5.72 — CURRENCY CARD FORMAT
// ======================================================================

function buildCurrencyCard5(
    currency
) {

    if (
        !currency ||
        !currency.success
    ) {

        return {

            type:
                "currency",

            title:
                "Döviz",

            body:
                "Kur verisi alınamadı."
        };
    }

    return {

        type:
            "currency",

        title:
            `${currency.from} → ${currency.to}`,

        body:
            `${marketFormatNumber5(currency.amount, 2)} ${currency.from} = ${marketFormatNumber5(currency.result, 4)} ${currency.to}`,

        from:
            currency.from,

        to:
            currency.to,

        amount:
            currency.amount,

        result:
            currency.result,

        rate:
            currency.rate,

        date:
            currency.date,

        provider:
            currency.provider
    };
}

// ======================================================================
// 5.73 — GOLD CARD FORMAT
// ======================================================================

function buildGoldCard5(
    gold
) {

    if (
        !gold ||
        !gold.success
    ) {

        return {

            type:
                "gold",

            title:
                "Altın",

            body:
                "Altın verisi alınamadı."
        };
    }

    return {

        type:
            "gold",

        title:
            "Altın",

        body:
            Number.isFinite(
                gold.gramTRY
            )
                ? `Gram altın ≈ ${marketFormatNumber5(gold.gramTRY, 2)} TL`
                : "Gram altın verisi yok.",

        gramTRY:
            gold.gramTRY,

        gramUSD:
            gold.gramUSD,

        xauTRY:
            gold.xauTRY,

        xauUSD:
            gold.xauUSD,

        usdTRY:
            gold.usdTRY,

        provider:
            gold.provider
    };
}

// ======================================================================
// 5.74 — MARKET UI DATA
// ======================================================================

app.post(
    "/api/market/card",
    async (
        req,
        res
    ) => {

        const message =
            marketSafeString5(
                req.body &&
                (
                    req.body.message ||
                    req.body.query
                )
            );

        if (
            !message
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "message_required"
            });
        }

        try {

            const result =
                await routeMarketRequest5(
                    message,
                    req.body || {}
                );

            if (
                result.type ===
                "weather"
            ) {

                return res.json({

                    ok:
                        true,

                    success:
                        true,

                    type:
                        "weather",

                    card:
                        buildWeatherCard5(
                            result.result
                        )
                });
            }

            if (
                result.type ===
                "currency"
            ) {

                return res.json({

                    ok:
                        true,

                    success:
                        true,

                    type:
                        "currency",

                    card:
                        buildCurrencyCard5(
                            result.result
                        )
                });
            }

            if (
                result.type ===
                "gold"
            ) {

                return res.json({

                    ok:
                        true,

                    success:
                        true,

                    type:
                        "gold",

                    card:
                        buildGoldCard5(
                            result.result
                        )
                });
            }

            return res.json({

                ok:
                    true,

                success:
                    true,

                type:
                    "none",

                card:
                    null
            });

        } catch (
            error
        ) {

            return res.status(
                502
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "market_card_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 5.75 — MARKET DATA BRIDGE FOR FUTURE PARTS
// ======================================================================

global.turkAI.market.buildContext =
    buildMarketAIContext5;

global.turkAI.market.enrich =
    enrichAIRequestWithMarket5;

global.turkAI.market.shouldUse =
    shouldUseMarketEngine5;

global.turkAI.market.weatherCard =
    buildWeatherCard5;

global.turkAI.market.currencyCard =
    buildCurrencyCard5;

global.turkAI.market.goldCard =
    buildGoldCard5;

// ======================================================================
// 5.76 — SAVE CURRENT STATE
// ======================================================================

writeJSON(
    TURKAI_MARKET_STATS_FILE_5,
    TURKAI_MARKET_STATS_5
);

writeJSON(
    TURKAI_MARKET_SETTINGS_FILE_5,
    TURKAI_MARKET_SETTINGS_5
);

// ======================================================================
// 5.77 — STARTUP LOG
// ======================================================================

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

console.log(
    "TürkAI Master Server — PART 5/10"
);

console.log(
    "Weather Engine:",
    TURKAI_MARKET_SETTINGS_5
        .weather
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Currency Engine:",
    TURKAI_MARKET_SETTINGS_5
        .currency
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Gold Engine:",
    TURKAI_MARKET_SETTINGS_5
        .gold
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Market Cache:",
    TURKAI_MARKET_SETTINGS_5
        .cache
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Market History:",
    TURKAI_MARKET_SETTINGS_5
        .history
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Weather Provider:",
    TURKAI_MARKET_CONFIG_5
        .providers
        .weather
);

console.log(
    "Currency Provider:",
    TURKAI_MARKET_CONFIG_5
        .providers
        .currency
);

console.log(
    "Gold Provider:",
    TURKAI_MARKET_CONFIG_5
        .providers
        .gold
);

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

// ======================================================================
// 5.78 — PART 5 END
// ======================================================================

/*
========================================================================
 PART 5 END

 SONRA:
 PART 6 / 10
 FILE ENGINE + UPLOAD + TEXT EXTRACTION + MEDIA
========================================================================
*//*
========================================================================
 TÜRKAI MASTER SERVER 50.0
 PART 6 / 10
 FILE ENGINE + UPLOAD + DOWNLOAD + TEXT EXTRACTION + MEDIA
========================================================================
*/

"use strict";

// ======================================================================
// 6.0 — FILE ENGINE CONFIG
// ======================================================================

const TURKAI_FILE_CONFIG_6 = {

    enabled:
        true,

    uploadsEnabled:
        true,

    downloadsEnabled:
        true,

    textExtractionEnabled:
        true,

    previewEnabled:
        true,

    metadataEnabled:
        true,

    maxFileSize:
        25 * 1024 * 1024,

    maxFilesPerUser:
        1000,

    maxTextLength:
        100000,

    maxPreviewLength:
        12000,

    cleanupEnabled:
        true,

    historyEnabled:
        true,

    allowedExtensions: [
        ".txt",
        ".json",
        ".js",
        ".ts",
        ".jsx",
        ".tsx",
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
        ".cs",
        ".php",
        ".go",
        ".rs",
        ".rb",
        ".swift",
        ".kt",
        ".kts",
        ".sql",
        ".xml",
        ".yaml",
        ".yml",
        ".md",
        ".csv",
        ".log",
        ".ini",
        ".env",
        ".sh",
        ".bat",
        ".ps1",
        ".vue",
        ".svelte"
    ],

    blockedExtensions: [
        ".exe",
        ".msi",
        ".dll",
        ".sys",
        ".scr",
        ".com",
        ".cmd",
        ".vbs",
        ".ps1",
        ".jar",
        ".apk",
        ".ipa",
        ".dmg",
        ".iso",
        ".bin"
    ]
};

// ======================================================================
// 6.1 — FILE DIRECTORIES
// ======================================================================

const TURKAI_FILE_DIR_6 =
    path.join(
        DATA_DIR,
        "files"
    );

const TURKAI_FILE_STORE_DIR_6 =
    path.join(
        TURKAI_FILE_DIR_6,
        "store"
    );

const TURKAI_FILE_PREVIEW_DIR_6 =
    path.join(
        TURKAI_FILE_DIR_6,
        "preview"
    );

const TURKAI_FILE_HISTORY_DIR_6 =
    path.join(
        TURKAI_FILE_DIR_6,
        "history"
    );

const TURKAI_FILE_INDEX_FILE_6 =
    path.join(
        TURKAI_FILE_DIR_6,
        "index.json"
    );

const TURKAI_FILE_STATS_FILE_6 =
    path.join(
        TURKAI_FILE_DIR_6,
        "stats.json"
    );

const TURKAI_FILE_SETTINGS_FILE_6 =
    path.join(
        TURKAI_FILE_DIR_6,
        "settings.json"
    );

[
    TURKAI_FILE_DIR_6,
    TURKAI_FILE_STORE_DIR_6,
    TURKAI_FILE_PREVIEW_DIR_6,
    TURKAI_FILE_HISTORY_DIR_6
].forEach(
    ensureDir
);

// ======================================================================
// 6.2 — FILE SETTINGS
// ======================================================================

let TURKAI_FILE_SETTINGS_6 =
    readJSON(
        TURKAI_FILE_SETTINGS_FILE_6,
        {
            enabled:
                true,

            uploads:
                true,

            downloads:
                true,

            textExtraction:
                true,

            preview:
                true,

            metadata:
                true,

            history:
                true,

            cleanup:
                true
        }
    );

if (
    !TURKAI_FILE_SETTINGS_6 ||
    typeof TURKAI_FILE_SETTINGS_6 !==
        "object"
) {

    TURKAI_FILE_SETTINGS_6 = {
        enabled:
            true,

        uploads:
            true,

        downloads:
            true,

        textExtraction:
            true,

        preview:
            true,

        metadata:
            true,

        history:
            true,

        cleanup:
            true
    };
}

writeJSON(
    TURKAI_FILE_SETTINGS_FILE_6,
    TURKAI_FILE_SETTINGS_6
);

// ======================================================================
// 6.3 — FILE STATS
// ======================================================================

let TURKAI_FILE_STATS_6 =
    readJSON(
        TURKAI_FILE_STATS_FILE_6,
        {
            version:
                "6.0",

            totalUploads:
                0,

            successfulUploads:
                0,

            failedUploads:
                0,

            totalDownloads:
                0,

            totalDeletes:
                0,

            totalPreviews:
                0,

            totalExtractions:
                0,

            extractionFailures:
                0,

            totalSize:
                0,

            activeFiles:
                0,

            lastUploadAt:
                null,

            lastDownloadAt:
                null,

            lastDeleteAt:
                null,

            lastErrorAt:
                null,

            lastError:
                null
        }
    );

if (
    !TURKAI_FILE_STATS_6 ||
    typeof TURKAI_FILE_STATS_6 !==
        "object"
) {

    TURKAI_FILE_STATS_6 = {

        version:
            "6.0",

        totalUploads:
            0,

        successfulUploads:
            0,

        failedUploads:
            0,

        totalDownloads:
            0,

        totalDeletes:
            0,

        totalPreviews:
            0,

        totalExtractions:
            0,

        extractionFailures:
            0,

        totalSize:
            0,

        activeFiles:
            0,

        lastUploadAt:
            null,

        lastDownloadAt:
            null,

        lastDeleteAt:
            null,

        lastErrorAt:
            null,

        lastError:
            null
    };
}

// ======================================================================
// 6.4 — FILE INDEX
// ======================================================================

let TURKAI_FILE_INDEX_6 =
    readJSON(
        TURKAI_FILE_INDEX_FILE_6,
        {
            version:
                "6.0",

            items:
                []
        }
    );

if (
    !TURKAI_FILE_INDEX_6 ||
    typeof TURKAI_FILE_INDEX_6 !==
        "object"
) {

    TURKAI_FILE_INDEX_6 = {
        version:
            "6.0",

        items:
            []
    };
}

if (
    !Array.isArray(
        TURKAI_FILE_INDEX_6.items
    )
) {

    TURKAI_FILE_INDEX_6.items =
        [];
}

// ======================================================================
// 6.5 — FILE UTILS
// ======================================================================

function fileSafeString6(
    value,
    fallback = ""
) {

    if (
        value ===
            null ||
        value ===
            undefined
    ) {
        return fallback;
    }

    return String(
        value
    ).trim();
}

function fileNow6() {

    return new Date()
        .toISOString();
}

function fileId6(
    prefix =
        "file"
) {

    return (
        prefix +
        "_" +
        Date.now().toString(
            36
        ) +
        "_" +
        crypto
            .randomBytes(
                7
            )
            .toString(
                "hex"
            )
    );
}

function sanitizeFilename6(
    filename
) {

    const input =
        fileSafeString6(
            filename,
            "dosya"
        );

    const base =
        path.basename(
            input
        );

    return base
        .replace(
            /[<>:"/\\|?*\x00-\x1F]/g,
            "_"
        )
        .replace(
            /\s+/g,
            "_"
        )
        .slice(
            0,
            180
        ) ||
        "dosya";
}

function fileExtension6(
    filename
) {

    return path
        .extname(
            filename
        )
        .toLowerCase();
}

function isTextExtension6(
    extension
) {

    return TURKAI_FILE_CONFIG_6
        .allowedExtensions
        .includes(
            extension
        );
}

function isBlockedExtension6(
    extension
) {

    return TURKAI_FILE_CONFIG_6
        .blockedExtensions
        .includes(
            extension
        );
}

// ======================================================================
// 6.6 — HASH FILE
// ======================================================================

function hashFile6(
    filePath
) {

    try {

        const buffer =
            fs.readFileSync(
                filePath
            );

        return crypto
            .createHash(
                "sha256"
            )
            .update(
                buffer
            )
            .digest(
                "hex"
            );

    } catch {

        return null;
    }
}

// ======================================================================
// 6.7 — MIME MAP
// ======================================================================

const MIME_TYPES_6 = {

    ".txt":
        "text/plain",

    ".json":
        "application/json",

    ".js":
        "text/javascript",

    ".ts":
        "text/typescript",

    ".html":
        "text/html",

    ".htm":
        "text/html",

    ".css":
        "text/css",

    ".scss":
        "text/x-scss",

    ".less":
        "text/x-less",

    ".py":
        "text/x-python",

    ".java":
        "text/x-java-source",

    ".c":
        "text/x-c",

    ".h":
        "text/x-c",

    ".cpp":
        "text/x-c++",

    ".hpp":
        "text/x-c++",

    ".cs":
        "text/x-csharp",

    ".php":
        "text/x-php",

    ".go":
        "text/x-go",

    ".rs":
        "text/x-rust",

    ".rb":
        "text/x-ruby",

    ".swift":
        "text/x-swift",

    ".kt":
        "text/x-kotlin",

    ".kts":
        "text/x-kotlin",

    ".sql":
        "application/sql",

    ".xml":
        "application/xml",

    ".yaml":
        "application/yaml",

    ".yml":
        "application/yaml",

    ".md":
        "text/markdown",

    ".csv":
        "text/csv",

    ".log":
        "text/plain",

    ".ini":
        "text/plain",

    ".env":
        "text/plain",

    ".sh":
        "text/x-shellscript",

    ".bat":
        "text/plain",

    ".ps1":
        "text/plain",

    ".vue":
        "text/plain",

    ".svelte":
        "text/plain"
};

function getMimeType6(
    filename
) {

    const ext =
        fileExtension6(
            filename
        );

    return (
        MIME_TYPES_6[
            ext
        ] ||
        "application/octet-stream"
    );
}

// ======================================================================
// 6.8 — DATABASE SAVE
// ======================================================================

function saveFileIndex6() {

    return writeJSON(
        TURKAI_FILE_INDEX_FILE_6,
        TURKAI_FILE_INDEX_6
    );
}

function saveFileStats6() {

    return writeJSON(
        TURKAI_FILE_STATS_FILE_6,
        TURKAI_FILE_STATS_6
    );
}

// ======================================================================
// 6.9 — FILE LOOKUP
// ======================================================================

function findFile6(
    id
) {

    return TURKAI_FILE_INDEX_6
        .items
        .find(
            item =>
                item.id ===
                id
        );
}

function findUserFiles6(
    userId
) {

    const uid =
        fileSafeString6(
            userId,
            "guest"
        );

    return TURKAI_FILE_INDEX_6
        .items
        .filter(
            item =>
                item.userId ===
                uid
        );
}

// ======================================================================
// 6.10 — USER FILE LIMIT
// ======================================================================

function canUploadFile6(
    userId,
    size
) {

    const files =
        findUserFiles6(
            userId
        );

    if (
        files.length >=
        TURKAI_FILE_CONFIG_6
            .maxFilesPerUser
    ) {

        return {

            allowed:
                false,

            reason:
                "file_limit_reached",

            count:
                files.length,

            limit:
                TURKAI_FILE_CONFIG_6
                    .maxFilesPerUser
        };
    }

    const numericSize =
        Number(
            size
        );

    if (
        !Number.isFinite(
            numericSize
        )
    ) {

        return {

            allowed:
                false,

            reason:
                "invalid_size"
        };
    }

    if (
        numericSize >
        TURKAI_FILE_CONFIG_6
            .maxFileSize
    ) {

        return {

            allowed:
                false,

            reason:
                "file_too_large",

            size:
                numericSize,

            limit:
                TURKAI_FILE_CONFIG_6
                    .maxFileSize
        };
    }

    return {

        allowed:
            true,

        count:
            files.length,

        limit:
            TURKAI_FILE_CONFIG_6
                .maxFilesPerUser
    };
}

// ======================================================================
// 6.11 — TEXT SAFETY
// ======================================================================

function sanitizeExtractedText6(
    text
) {

    let clean =
        fileSafeString6(
            text
        );

    clean =
        clean.replace(
            /\u0000/g,
            ""
        );

    clean =
        clean.replace(
            /\r\n/g,
            "\n"
        );

    clean =
        clean.replace(
            /\r/g,
            "\n"
        );

    clean =
        clean.replace(
            /\n{8,}/g,
            "\n\n\n"
        );

    if (
        clean.length >
        TURKAI_FILE_CONFIG_6
            .maxTextLength
    ) {

        clean =
            clean.slice(
                0,
                TURKAI_FILE_CONFIG_6
                    .maxTextLength
            );
    }

    return clean;
}

// ======================================================================
// 6.12 — TEXT EXTRACTION
// ======================================================================

function extractTextFromFile6(
    filePath,
    originalName
) {

    if (
        !TURKAI_FILE_CONFIG_6
            .textExtractionEnabled
    ) {

        return {

            ok:
                false,

            supported:
                false,

            text:
                "",

            reason:
                "disabled"
        };
    }

    const extension =
        fileExtension6(
            originalName
        );

    if (
        !isTextExtension6(
            extension
        )
    ) {

        return {

            ok:
                true,

            supported:
                false,

            text:
                "",

            reason:
                "binary_or_unsupported"
        };
    }

    try {

        TURKAI_FILE_STATS_6
            .totalExtractions++;

        const buffer =
            fs.readFileSync(
                filePath
            );

        let text;

        try {

            text =
                buffer.toString(
                    "utf8"
                );

        } catch {

            text =
                buffer.toString(
                    "latin1"
                );
        }

        text =
            sanitizeExtractedText6(
                text
            );

        return {

            ok:
                true,

            supported:
                true,

            text,

            length:
                text.length,

            encoding:
                "utf8"
        };

    } catch (
        error
    ) {

        TURKAI_FILE_STATS_6
            .extractionFailures++;

        TURKAI_FILE_STATS_6
            .lastError =
            error.message;

        TURKAI_FILE_STATS_6
            .lastErrorAt =
            fileNow6();

        return {

            ok:
                false,

            supported:
                true,

            text:
                "",

            reason:
                "read_failed",

            error:
                error.message
        };
    }
}

// ======================================================================
// 6.13 — TEXT PREVIEW
// ======================================================================

function createTextPreview6(
    text
) {

    const clean =
        sanitizeExtractedText6(
            text
        );

    return clean.slice(
        0,
        TURKAI_FILE_CONFIG_6
            .maxPreviewLength
    );
}

// ======================================================================
// 6.14 — FILE METADATA
// ======================================================================

function buildFileMetadata6(
    filePath,
    originalName,
    extra = {}
) {

    let stat =
        null;

    try {

        stat =
            fs.statSync(
                filePath
            );

    } catch {
        // ignore
    }

    const extension =
        fileExtension6(
            originalName
        );

    return {

        originalName:
            sanitizeFilename6(
                originalName
            ),

        extension,

        mimeType:
            getMimeType6(
                originalName
            ),

        size:
            stat
                ? stat.size
                : 0,

        createdAt:
            stat
                ? stat.birthtime.toISOString()
                : null,

        modifiedAt:
            stat
                ? stat.mtime.toISOString()
                : null,

        isText:
            isTextExtension6(
                extension
            ),

        blocked:
            isBlockedExtension6(
                extension
            ),

        hash:
            hashFile6(
                filePath
            ),

        ...extra
    };
}

// ======================================================================
// 6.15 — FILE RECORD
// ======================================================================

function createFileRecord6(
    userId,
    originalName,
    storedName,
    filePath,
    options = {}
) {

    const extension =
        fileExtension6(
            originalName
        );

    const metadata =
        buildFileMetadata6(
            filePath,
            originalName,
            {
                userId,

                conversationId:
                    fileSafeString6(
                        options.conversationId,
                        null
                    ),

                source:
                    fileSafeString6(
                        options.source,
                        "upload"
                    )
            }
        );

    const record = {

        id:
            fileId6(),

        userId:
            fileSafeString6(
                userId,
                "guest"
            ),

        originalName:
            sanitizeFilename6(
                originalName
            ),

        storedName,

        extension,

        mimeType:
            metadata.mimeType,

        size:
            metadata.size,

        hash:
            metadata.hash,

        path:
            filePath,

        relativePath:
            path.relative(
                ROOT_DIR,
                filePath
            ),

        isText:
            metadata.isText,

        conversationId:
            metadata.conversationId,

        source:
            metadata.source,

        preview:
            null,

        extractedText:
            null,

        metadata,

        createdAt:
            fileNow6(),

        updatedAt:
            fileNow6(),

        downloads:
            0,

        views:
            0
    };

    return record;
}

// ======================================================================
// 6.16 — SAVE FILE RECORD
// ======================================================================

function saveFileRecord6(
    record
) {

    TURKAI_FILE_INDEX_6.items.push(
        record
    );

    TURKAI_FILE_STATS_6
        .activeFiles =
        TURKAI_FILE_INDEX_6
            .items
            .filter(
                item =>
                    !item.deletedAt
            )
            .length;

    TURKAI_FILE_STATS_6
        .totalSize =
        TURKAI_FILE_INDEX_6
            .items
            .filter(
                item =>
                    !item.deletedAt
            )
            .reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    (
                        Number(
                            item.size
                        ) ||
                        0
                    ),
                0
            );

    saveFileIndex6();
    saveFileStats6();

    return record;
}

// ======================================================================
// 6.17 — UPDATE FILE RECORD
// ======================================================================

function updateFileRecord6(
    record,
    patch = {}
) {

    if (
        !record
    ) {
        return null;
    }

    Object.assign(
        record,
        patch,
        {
            updatedAt:
                fileNow6()
        }
    );

    saveFileIndex6();

    return record;
}

// ======================================================================
// 6.18 — FILE HISTORY
// ======================================================================

function saveFileHistory6(
    type,
    record,
    extra = {}
) {

    if (
        !TURKAI_FILE_SETTINGS_6
            .history
    ) {

        return null;
    }

    const id =
        fileId6(
            type
        );

    const file =
        path.join(
            TURKAI_FILE_HISTORY_DIR_6,
            `${id}.json`
        );

    writeJSON(
        file,
        {

            id,

            type,

            fileId:
                record
                    ? record.id
                    : null,

            timestamp:
                fileNow6(),

            ...extra
        }
    );

    return id;
}

// ======================================================================
// 6.19 — MULTER STORAGE
// ======================================================================

const TURKAI_UPLOAD_STORAGE_6 =
    multer.diskStorage({

        destination:
            function (
                req,
                file,
                cb
            ) {

                cb(
                    null,
                    TURKAI_FILE_STORE_DIR_6
                );
            },

        filename:
            function (
                req,
                file,
                cb
            ) {

                const ext =
                    fileExtension6(
                        file.originalname
                    );

                const safeExt =
                    ext.length <=
                    12
                        ? ext
                        : "";

                cb(
                    null,
                    fileId6(
                        "upload"
                    ) +
                    safeExt
                );
            }
    });

// ======================================================================
// 6.20 — MULTER FILTER
// ======================================================================

function turkaiFileFilter6(
    req,
    file,
    cb
) {

    const ext =
        fileExtension6(
            file.originalname
        );

    if (
        isBlockedExtension6(
            ext
        )
    ) {

        return cb(
            new Error(
                "blocked_file_type:" +
                ext
            )
        );
    }

    if (
        ext &&
        !TURKAI_FILE_CONFIG_6
            .allowedExtensions
            .includes(
                ext
            )
    ) {

        return cb(
            new Error(
                "unsupported_file_type:" +
                ext
            )
        );
    }

    return cb(
        null,
        true
    );
}

// ======================================================================
// 6.21 — UPLOAD INSTANCE
// ======================================================================

const TURKAI_UPLOAD_6 =
    multer({

        storage:
            TURKAI_UPLOAD_STORAGE_6,

        limits: {

            fileSize:
                TURKAI_FILE_CONFIG_6
                    .maxFileSize,

            files:
                10
        },

        fileFilter:
            turkaiFileFilter6
    });

// ======================================================================
// 6.22 — UPLOAD PROCESSOR
// ======================================================================

async function processUploadedFile6(
    req,
    file
) {

    const body =
        req.body ||
        {};

    const userId =
        fileSafeString6(
            body.userId ||
            req.headers[
                "x-user-id"
            ] ||
            "guest",
            "guest"
        );

    const permission =
        canUploadFile6(
            userId,
            file.size
        );

    if (
        !permission.allowed
    ) {

        try {

            if (
                fs.existsSync(
                    file.path
                )
            ) {

                fs.unlinkSync(
                    file.path
                );
            }

        } catch {
            // ignore
        }

        throw new Error(
            permission.reason
        );
    }

    const originalName =
        sanitizeFilename6(
            file.originalname
        );

    const storedName =
        path.basename(
            file.path
        );

    const record =
        createFileRecord6(
            userId,
            originalName,
            storedName,
            file.path,
            {
                conversationId:
                    body.conversationId,

                source:
                    body.source ||
                    "upload"
            }
        );

    if (
        TURKAI_FILE_SETTINGS_6
            .textExtraction &&
        record.isText
    ) {

        const extracted =
            extractTextFromFile6(
                file.path,
                originalName
            );

        if (
            extracted.supported
        ) {

            record.extractedText =
                extracted.text;

            record.preview =
                createTextPreview6(
                    extracted.text
                );
        }
    }

    record.metadata =
        {
            ...record.metadata,

            extraction:
                {
                    attempted:
                        record.isText,

                    success:
                        Boolean(
                            record.extractedText
                        ),

                    textLength:
                        record.extractedText
                            ? record
                                .extractedText
                                .length
                            : 0
                }
        };

    saveFileRecord6(
        record
    );

    TURKAI_FILE_STATS_6
        .totalUploads++;

    TURKAI_FILE_STATS_6
        .successfulUploads++;

    TURKAI_FILE_STATS_6
        .lastUploadAt =
        fileNow6();

    saveFileHistory6(
        "upload",
        record
    );

    return record;
}

// ======================================================================
// 6.23 — SINGLE UPLOAD API
// ======================================================================

app.post(
    "/api/upload",
    (
        req,
        res,
        next
    ) => {

        if (
            !TURKAI_FILE_SETTINGS_6
                .uploads
        ) {

            return res.status(
                503
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "uploads_disabled"
            });
        }

        TURKAI_UPLOAD_6.single(
            "file"
        )(
            req,
            res,
            async error => {

                if (
                    error
                ) {

                    TURKAI_FILE_STATS_6
                        .failedUploads++;

                    TURKAI_FILE_STATS_6
                        .lastError =
                        error.message;

                    TURKAI_FILE_STATS_6
                        .lastErrorAt =
                        fileNow6();

                    saveFileStats6();

                    return res.status(
                        400
                    ).json({

                        ok:
                            false,

                        success:
                            false,

                        error:
                            "upload_failed",

                        message:
                            error.message
                    });
                }

                if (
                    !req.file
                ) {

                    return res.status(
                        400
                    ).json({

                        ok:
                            false,

                        success:
                            false,

                        error:
                            "file_required"
                    });
                }

                try {

                    const record =
                        await processUploadedFile6(
                            req,
                            req.file
                        );

                    runtime.uploads++;

                    return res.json({

                        ok:
                            true,

                        success:
                            true,

                        file:
                            buildPublicFile6(
                                record
                            )
                    });

                } catch (
                    uploadError
                ) {

                    TURKAI_FILE_STATS_6
                        .failedUploads++;

                    TURKAI_FILE_STATS_6
                        .lastError =
                        uploadError.message;

                    TURKAI_FILE_STATS_6
                        .lastErrorAt =
                        fileNow6();

                    saveFileStats6();

                    return res.status(
                        400
                    ).json({

                        ok:
                            false,

                        success:
                            false,

                        error:
                            "file_processing_failed",

                        message:
                            uploadError.message
                    });
                }
            }
        );
    }
);

// ======================================================================
// 6.24 — MULTI UPLOAD API
// ======================================================================

app.post(
    "/api/upload/multiple",
    (
        req,
        res
    ) => {

        if (
            !TURKAI_FILE_SETTINGS_6
                .uploads
        ) {

            return res.status(
                503
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "uploads_disabled"
            });
        }

        TURKAI_UPLOAD_6.array(
            "files",
            10
        )(
            req,
            res,
            async error => {

                if (
                    error
                ) {

                    TURKAI_FILE_STATS_6
                        .failedUploads++;

                    return res.status(
                        400
                    ).json({

                        ok:
                            false,

                        success:
                            false,

                        error:
                            "multi_upload_failed",

                        message:
                            error.message
                    });
                }

                if (
                    !Array.isArray(
                        req.files
                    ) ||
                    !req.files.length
                ) {

                    return res.status(
                        400
                    ).json({

                        ok:
                            false,

                        success:
                            false,

                        error:
                            "files_required"
                    });
                }

                const uploaded =
                    [];

                const errors =
                    [];

                for (
                    const file
                    of req.files
                ) {

                    try {

                        const record =
                            await processUploadedFile6(
                                req,
                                file
                            );

                        uploaded.push(
                            buildPublicFile6(
                                record
                            )
                        );

                    } catch (
                        uploadError
                    ) {

                        errors.push({

                            filename:
                                file.originalname,

                            error:
                                uploadError.message
                        });
                    }
                }

                return res.json({

                    ok:
                        true,

                    success:
                        true,

                    count:
                        uploaded.length,

                    files:
                        uploaded,

                    errors
                });
            }
        );
    }
);

// ======================================================================
// 6.25 — PUBLIC FILE RECORD
// ======================================================================

function buildPublicFile6(
    record
) {

    if (
        !record
    ) {
        return null;
    }

    return {

        id:
            record.id,

        userId:
            record.userId,

        originalName:
            record.originalName,

        extension:
            record.extension,

        mimeType:
            record.mimeType,

        size:
            record.size,

        isText:
            record.isText,

        preview:
            record.preview,

        conversationId:
            record.conversationId,

        source:
            record.source,

        downloads:
            record.downloads,

        views:
            record.views,

        createdAt:
            record.createdAt,

        updatedAt:
            record.updatedAt,

        downloadURL:
            `/api/files/${encodeURIComponent(record.id)}/download`,

        previewURL:
            `/api/files/${encodeURIComponent(record.id)}/preview`
    };
}

// ======================================================================
// 6.26 — LIST FILES
// ======================================================================

app.get(
    "/api/files",
    (
        req,
        res
    ) => {

        const userId =
            fileSafeString6(
                req.query.userId ||
                req.headers[
                    "x-user-id"
                ] ||
                "guest",
                "guest"
            );

        const includeDeleted =
            String(
                req.query.includeDeleted
            ) ===
            "true";

        let files =
            findUserFiles6(
                userId
            );

        if (
            !includeDeleted
        ) {

            files =
                files.filter(
                    item =>
                        !item.deletedAt
                );
        }

        const search =
            fileSafeString6(
                req.query.search
            ).toLocaleLowerCase(
                "tr-TR"
            );

        if (
            search
        ) {

            files =
                files.filter(
                    item =>
                        item.originalName
                            .toLocaleLowerCase(
                                "tr-TR"
                            )
                            .includes(
                                search
                            ) ||
                        item.extension
                            .includes(
                                search
                            )
                );
        }

        const limit =
            Math.min(
                500,
                Math.max(
                    1,
                    Number(
                        req.query.limit
                    ) ||
                    200
                )
            );

        return res.json({

            ok:
                true,

            success:
                true,

            count:
                Math.min(
                    limit,
                    files.length
                ),

            files:
                files
                    .slice(
                        -limit
                    )
                    .reverse()
                    .map(
                        buildPublicFile6
                    )
        });
    }
);

// ======================================================================
// 6.27 — FILE DETAILS
// ======================================================================

app.get(
    "/api/files/:id",
    (
        req,
        res
    ) => {

        const record =
            findFile6(
                req.params.id
            );

        if (
            !record ||
            record.deletedAt
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "file_not_found"
            });
        }

        return res.json({

            ok:
                true,

            success:
                true,

            file:
                buildPublicFile6(
                    record
                ),

            metadata:
                record.metadata
        });
    }
);

// ======================================================================
// 6.28 — RAW DOWNLOAD
// ======================================================================

app.get(
    "/api/files/:id/download",
    (
        req,
        res
    ) => {

        if (
            !TURKAI_FILE_SETTINGS_6
                .downloads
        ) {

            return res.status(
                503
            ).json({

                ok:
                    false,

                error:
                    "downloads_disabled"
            });
        }

        const record =
            findFile6(
                req.params.id
            );

        if (
            !record ||
            record.deletedAt
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                error:
                    "file_not_found"
            });
        }

        if (
            !fs.existsSync(
                record.path
            )
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                error:
                    "physical_file_not_found"
            });
        }

        record.downloads =
            Number(
                record.downloads ||
                0
            ) +
            1;

        saveFileIndex6();

        TURKAI_FILE_STATS_6
            .totalDownloads++;

        TURKAI_FILE_STATS_6
            .lastDownloadAt =
            fileNow6();

        saveFileStats6();

        saveFileHistory6(
            "download",
            record
        );

        return res.download(
            record.path,
            record.originalName
        );
    }
);

// ======================================================================
// 6.29 — FILE PREVIEW
// ======================================================================

app.get(
    "/api/files/:id/preview",
    (
        req,
        res
    ) => {

        if (
            !TURKAI_FILE_SETTINGS_6
                .preview
        ) {

            return res.status(
                503
            ).json({

                ok:
                    false,

                error:
                    "preview_disabled"
            });
        }

        const record =
            findFile6(
                req.params.id
            );

        if (
            !record ||
            record.deletedAt
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                error:
                    "file_not_found"
            });
        }

        if (
            !record.isText
        ) {

            return res.json({

                ok:
                    true,

                success:
                    true,

                text:
                    null,

                supported:
                    false,

                reason:
                    "binary_file"
            });
        }

        if (
            !fs.existsSync(
                record.path
            )
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                error:
                    "physical_file_not_found"
            });
        }

        const extracted =
            extractTextFromFile6(
                record.path,
                record.originalName
            );

        record.views =
            Number(
                record.views ||
                0
            ) +
            1;

        record.preview =
            createTextPreview6(
                extracted.text
            );

        record.updatedAt =
            fileNow6();

        saveFileIndex6();

        TURKAI_FILE_STATS_6
            .totalPreviews++;

        return res.json({

            ok:
                true,

            success:
                true,

            supported:
                extracted.supported,

            text:
                extracted.text,

            preview:
                record.preview,

            length:
                extracted.length ||
                0,

            file:
                buildPublicFile6(
                    record
                )
        });
    }
);

// ======================================================================
// 6.30 — FILE TEXT API
// ======================================================================

app.get(
    "/api/files/:id/text",
    (
        req,
        res
    ) => {

        const record =
            findFile6(
                req.params.id
            );

        if (
            !record ||
            record.deletedAt
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                error:
                    "file_not_found"
            });
        }

        if (
            !record.isText
        ) {

            return res.json({

                ok:
                    true,

                success:
                    true,

                supported:
                    false,

                text:
                    ""
            });
        }

        if (
            !fs.existsSync(
                record.path
            )
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                error:
                    "physical_file_not_found"
            });
        }

        const result =
            extractTextFromFile6(
                record.path,
                record.originalName
            );

        return res.json({

            ok:
                true,

            success:
                true,

            supported:
                result.supported,

            text:
                result.text,

            length:
                result.length ||
                0
        });
    }
);

// ======================================================================
// 6.31 — FILE SEARCH
// ======================================================================

app.get(
    "/api/files/search",
    (
        req,
        res
    ) => {

        const userId =
            fileSafeString6(
                req.query.userId ||
                "guest"
            );

        const query =
            fileSafeString6(
                req.query.q ||
                req.query.query
            ).toLocaleLowerCase(
                "tr-TR"
            );

        if (
            !query
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                error:
                    "query_required"
            });
        }

        const results =
            findUserFiles6(
                userId
            )
            .filter(
                item =>
                    !item.deletedAt
            )
            .filter(
                item =>
                    item.originalName
                        .toLocaleLowerCase(
                            "tr-TR"
                        )
                        .includes(
                            query
                        ) ||
                    (
                        item.preview &&
                        item.preview
                            .toLocaleLowerCase(
                                "tr-TR"
                            )
                            .includes(
                                query
                            )
                    ) ||
                    (
                        item.extractedText &&
                        item.extractedText
                            .toLocaleLowerCase(
                                "tr-TR"
                            )
                            .includes(
                                query
                            )
                    )
            )
            .slice(
                -100
            )
            .reverse();

        return res.json({

            ok:
                true,

            success:
                true,

            count:
                results.length,

            files:
                results.map(
                    buildPublicFile6
                )
        });
    }
);

// ======================================================================
// 6.32 — FILE RENAME
// ======================================================================

app.patch(
    "/api/files/:id",
    (
        req,
        res
    ) => {

        const record =
            findFile6(
                req.params.id
            );

        if (
            !record ||
            record.deletedAt
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                error:
                    "file_not_found"
            });
        }

        const requested =
            fileSafeString6(
                req.body &&
                req.body.name
            );

        if (
            !requested
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                error:
                    "name_required"
            });
        }

        const newName =
            sanitizeFilename6(
                requested
            );

        record.originalName =
            newName;

        record.extension =
            fileExtension6(
                newName
            );

        record.mimeType =
            getMimeType6(
                newName
            );

        record.isText =
            isTextExtension6(
                record.extension
            );

        record.metadata = {

            ...record.metadata,

            originalName:
                newName,

            extension:
                record.extension,

            mimeType:
                record.mimeType,

            isText:
                record.isText
        };

        updateFileRecord6(
            record
        );

        saveFileHistory6(
            "rename",
            record
        );

        return res.json({

            ok:
                true,

            success:
                true,

            file:
                buildPublicFile6(
                    record
                )
        });
    }
);

// ======================================================================
// 6.33 — FILE DELETE
// ======================================================================

app.delete(
    "/api/files/:id",
    (
        req,
        res
    ) => {

        const record =
            findFile6(
                req.params.id
            );

        if (
            !record ||
            record.deletedAt
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                error:
                    "file_not_found"
            });
        }

        try {

            if (
                fs.existsSync(
                    record.path
                )
            ) {

                fs.unlinkSync(
                    record.path
                );
            }

        } catch (
            error
        ) {

            TURKAI_FILE_STATS_6
                .lastError =
                error.message;

            TURKAI_FILE_STATS_6
                .lastErrorAt =
                fileNow6();
        }

        record.deletedAt =
            fileNow6();

        record.updatedAt =
            fileNow6();

        saveFileIndex6();

        TURKAI_FILE_STATS_6
            .totalDeletes++;

        TURKAI_FILE_STATS_6
            .lastDeleteAt =
            fileNow6();

        saveFileStats6();

        saveFileHistory6(
            "delete",
            record
        );

        return res.json({

            ok:
                true,

            success:
                true,

            deleted:
                record.id
        });
    }
);

// ======================================================================
// 6.34 — RESTORE FILE RECORD
// ======================================================================

app.post(
    "/api/files/:id/restore",
    (
        req,
        res
    ) => {

        const record =
            findFile6(
                req.params.id
            );

        if (
            !record
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                error:
                    "file_not_found"
            });
        }

        if (
            !record.deletedAt
        ) {

            return res.json({

                ok:
                    true,

                success:
                    true,

                restored:
                    false,

                reason:
                    "already_active"
            });
        }

        if (
            !fs.existsSync(
                record.path
            )
        ) {

            return res.status(
                410
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "physical_file_missing"
            });
        }

        delete record.deletedAt;

        record.updatedAt =
            fileNow6();

        saveFileIndex6();

        saveFileHistory6(
            "restore",
            record
        );

        return res.json({

            ok:
                true,

            success:
                true,

            restored:
                true,

            file:
                buildPublicFile6(
                    record
                )
        });
    }
);

// ======================================================================
// 6.35 — FILE DUPLICATE CHECK
// ======================================================================

app.get(
    "/api/files/:id/duplicate-check",
    (
        req,
        res
    ) => {

        const record =
            findFile6(
                req.params.id
            );

        if (
            !record
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                error:
                    "file_not_found"
            });
        }

        const duplicates =
            findUserFiles6(
                record.userId
            )
            .filter(
                item =>
                    item.id !==
                        record.id &&
                    !item.deletedAt &&
                    item.hash &&
                    item.hash ===
                        record.hash
            );

        return res.json({

            ok:
                true,

            success:
                true,

            duplicate:
                duplicates.length >
                0,

            count:
                duplicates.length,

            files:
                duplicates.map(
                    buildPublicFile6
                )
        });
    }
);

// ======================================================================
// 6.36 — FILE STATISTICS
// ======================================================================

app.get(
    "/api/files/stats",
    (
        req,
        res
    ) => {

        const userId =
            fileSafeString6(
                req.query.userId ||
                req.headers[
                    "x-user-id"
                ] ||
                ""
            );

        const userFiles =
            userId
                ? findUserFiles6(
                    userId
                ).filter(
                    item =>
                        !item.deletedAt
                )
                : [];

        return res.json({

            ok:
                true,

            success:
                true,

            global:
                TURKAI_FILE_STATS_6,

            user:
                userId
                    ? {
                        count:
                            userFiles.length,

                        totalSize:
                            userFiles
                                .reduce(
                                    (
                                        total,
                                        item
                                    ) =>
                                        total +
                                        (
                                            Number(
                                                item.size
                                            ) ||
                                            0
                                        ),
                                    0
                                )
                    }
                    : null
        });
    }
);

// ======================================================================
// 6.37 — FILE SETTINGS API
// ======================================================================

app.get(
    "/api/files/settings",
    (
        req,
        res
    ) => {

        return res.json({

            ok:
                true,

            success:
                true,

            settings:
                TURKAI_FILE_SETTINGS_6,

            config: {

                maxFileSize:
                    TURKAI_FILE_CONFIG_6
                        .maxFileSize,

                maxFilesPerUser:
                    TURKAI_FILE_CONFIG_6
                        .maxFilesPerUser,

                allowedExtensions:
                    TURKAI_FILE_CONFIG_6
                        .allowedExtensions,

                blockedExtensions:
                    TURKAI_FILE_CONFIG_6
                        .blockedExtensions
            }
        });
    }
);

// ======================================================================
// 6.38 — BINARY FILE TYPE INFO
// ======================================================================

app.get(
    "/api/files/type/:filename",
    (
        req,
        res
    ) => {

        const filename =
            sanitizeFilename6(
                req.params.filename
            );

        const extension =
            fileExtension6(
                filename
            );

        return res.json({

            ok:
                true,

            success:
                true,

            filename,

            extension,

            mimeType:
                getMimeType6(
                    filename
                ),

            text:
                isTextExtension6(
                    extension
                ),

            blocked:
                isBlockedExtension6(
                    extension
                )
        });
    }
);

// ======================================================================
// 6.39 — FILE HISTORY LIST
// ======================================================================

app.get(
    "/api/files/history",
    (
        req,
        res
    ) => {

        let files =
            [];

        try {

            files =
                fs
                    .readdirSync(
                        TURKAI_FILE_HISTORY_DIR_6
                    )
                    .filter(
                        name =>
                            name.endsWith(
                                ".json"
                            )
                    )
                    .sort()
                    .reverse()
                    .slice(
                        0,
                        500
                    );

        } catch {

            files =
                [];
        }

        return res.json({

            ok:
                true,

            success:
                true,

            count:
                files.length,

            files
        });
    }
);

// ======================================================================
// 6.40 — FILE HISTORY ITEM
// ======================================================================

app.get(
    "/api/files/history/:id",
    (
        req,
        res
    ) => {

        const file =
            path.join(
                TURKAI_FILE_HISTORY_DIR_6,
                `${fileSafeString6(req.params.id)}.json`
            );

        const data =
            readJSON(
                file,
                null
            );

        if (
            !data
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                error:
                    "history_not_found"
            });
        }

        return res.json({

            ok:
                true,

            success:
                true,

            ...data
        });
    }
);

// ======================================================================
// 6.41 — FILE AI CONTEXT
// ======================================================================

async function buildFileAIContext6(
    userId,
    fileId
) {

    const record =
        findFile6(
            fileId
        );

    if (
        !record ||
        record.deletedAt
    ) {

        return {

            ok:
                false,

            context:
                "",

            error:
                "file_not_found"
        };
    }

    let text =
        record.extractedText ||
        "";

    if (
        !text &&
        record.isText &&
        fs.existsSync(
            record.path
        )
    ) {

        const extracted =
            extractTextFromFile6(
                record.path,
                record.originalName
            );

        text =
            extracted.text ||
            "";
    }

    const context = {

        fileId:
            record.id,

        name:
            record.originalName,

        extension:
            record.extension,

        mimeType:
            record.mimeType,

        size:
            record.size,

        text:
            text.slice(
                0,
                50000
            ),

        preview:
            record.preview ||
            createTextPreview6(
                text
            )
    };

    return {

        ok:
            true,

        success:
            true,

        context
    };
}

// ======================================================================
// 6.42 — FILE AI CONTEXT API
// ======================================================================

app.get(
    "/api/files/:id/ai-context",
    async (
        req,
        res
    ) => {

        try {

            const result =
                await buildFileAIContext6(
                    req.query.userId ||
                    "guest",

                    req.params.id
                );

            if (
                !result.ok
            ) {

                return res.status(
                    404
                ).json(
                    result
                );
            }

            return res.json(
                result
            );

        } catch (
            error
        ) {

            return res.status(
                500
            ).json({

                ok:
                    false,

                error:
                    "file_context_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 6.43 — FILE CONTENT SEARCH
// ======================================================================

app.get(
    "/api/files/content/search",
    (
        req,
        res
    ) => {

        const userId =
            fileSafeString6(
                req.query.userId ||
                "guest"
            );

        const query =
            fileSafeString6(
                req.query.q ||
                req.query.query
            );

        if (
            !query
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                error:
                    "query_required"
            });
        }

        const normalizedQuery =
            query.toLocaleLowerCase(
                "tr-TR"
            );

        const files =
            findUserFiles6(
                userId
            )
            .filter(
                item =>
                    !item.deletedAt &&
                    item.isText
            );

        const results =
            [];

        for (
            const record
            of files
        ) {

            let text =
                record.extractedText ||
                "";

            if (
                !text &&
                fs.existsSync(
                    record.path
                )
            ) {

                const extracted =
                    extractTextFromFile6(
                        record.path,
                        record.originalName
                    );

                text =
                    extracted.text ||
                    "";
            }

            if (
                !text
            ) {
                continue;
            }

            const normalized =
                text.toLocaleLowerCase(
                    "tr-TR"
                );

            const index =
                normalized.indexOf(
                    normalizedQuery
                );

            if (
                index ===
                -1
            ) {
                continue;
            }

            const start =
                Math.max(
                    0,
                    index -
                        250
                );

            const end =
                Math.min(
                    text.length,
                    index +
                        normalizedQuery.length +
                        350
                );

            results.push({

                file:
                    buildPublicFile6(
                        record
                    ),

                match:
                    text.slice(
                        start,
                        end
                    ),

                index
            });
        }

        return res.json({

            ok:
                true,

            success:
                true,

            query,

            count:
                results.length,

            results:
                results.slice(
                    0,
                    100
                )
        });
    }
);

// ======================================================================
// 6.44 — CODE FILE DETECTION
// ======================================================================

function isCodeFile6(
    filename
) {

    const codeExtensions = [
        ".js",
        ".ts",
        ".jsx",
        ".tsx",
        ".py",
        ".java",
        ".c",
        ".h",
        ".cpp",
        ".hpp",
        ".cs",
        ".php",
        ".go",
        ".rs",
        ".rb",
        ".swift",
        ".kt",
        ".kts",
        ".html",
        ".css",
        ".scss",
        ".sql",
        ".vue",
        ".svelte",
        ".sh",
        ".bat",
        ".ps1"
    ];

    return codeExtensions.includes(
        fileExtension6(
            filename
        )
    );
}

// ======================================================================
// 6.45 — CODE FILE API
// ======================================================================

app.get(
    "/api/files/:id/code",
    (
        req,
        res
    ) => {

        const record =
            findFile6(
                req.params.id
            );

        if (
            !record ||
            record.deletedAt
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                error:
                    "file_not_found"
            });
        }

        if (
            !isCodeFile6(
                record.originalName
            )
        ) {

            return res.json({

                ok:
                    true,

                success:
                    true,

                codeFile:
                    false,

                code:
                    ""
            });
        }

        const extracted =
            extractTextFromFile6(
                record.path,
                record.originalName
            );

        return res.json({

            ok:
                true,

            success:
                true,

            codeFile:
                true,

            filename:
                record.originalName,

            language:
                detectLanguage(
                    extracted.text
                ),

            code:
                extracted.text
        });
    }
);

// ======================================================================
// 6.46 — FILE DOWNLOAD URL
// ======================================================================

app.get(
    "/api/files/:id/url",
    (
        req,
        res
    ) => {

        const record =
            findFile6(
                req.params.id
            );

        if (
            !record ||
            record.deletedAt
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                error:
                    "file_not_found"
            });
        }

        return res.json({

            ok:
                true,

            success:
                true,

            url:
                `/api/files/${encodeURIComponent(record.id)}/download`,

            filename:
                record.originalName
        });
    }
);

// ======================================================================
// 6.47 — USER STORAGE SUMMARY
// ======================================================================

app.get(
    "/api/storage",
    (
        req,
        res
    ) => {

        const userId =
            fileSafeString6(
                req.query.userId ||
                "guest"
            );

        const files =
            findUserFiles6(
                userId
            )
            .filter(
                item =>
                    !item.deletedAt
            );

        const totalSize =
            files.reduce(
                (
                    total,
                    file
                ) =>
                    total +
                    (
                        Number(
                            file.size
                        ) ||
                        0
                    ),
                0
            );

        return res.json({

            ok:
                true,

            success:
                true,

            userId,

            fileCount:
                files.length,

            totalSize,

            maxFiles:
                TURKAI_FILE_CONFIG_6
                    .maxFilesPerUser,

            maxFileSize:
                TURKAI_FILE_CONFIG_6
                    .maxFileSize
        });
    }
);

// ======================================================================
// 6.48 — FILE CLEANUP
// ======================================================================

function cleanupDeletedFiles6() {

    let removed =
        0;

    const nowMs =
        Date.now();

    for (
        const record
        of TURKAI_FILE_INDEX_6.items
    ) {

        if (
            !record.deletedAt
        ) {
            continue;
        }

        const deletedMs =
            new Date(
                record.deletedAt
            ).getTime();

        if (
            !Number.isFinite(
                deletedMs
            )
        ) {
            continue;
        }

        const age =
            nowMs -
            deletedMs;

        if (
            age <
            24 * 60 * 60 * 1000
        ) {
            continue;
        }

        try {

            if (
                fs.existsSync(
                    record.path
                )
            ) {

                fs.unlinkSync(
                    record.path
                );
            }

            removed++;

        } catch {
            // ignore
        }
    }

    if (
        removed
    ) {

        TURKAI_FILE_INDEX_6.items =
            TURKAI_FILE_INDEX_6
                .items
                .filter(
                    item =>
                        !(
                            item.deletedAt &&
                            !fs.existsSync(
                                item.path
                            )
                        )
                );

        saveFileIndex6();
    }

    return removed;
}

// ======================================================================
// 6.49 — ORPHAN CLEANUP
// ======================================================================

function cleanupOrphanFiles6() {

    let removed =
        0;

    try {

        const indexed =
            new Set(
                TURKAI_FILE_INDEX_6
                    .items
                    .filter(
                        item =>
                            !item.deletedAt
                    )
                    .map(
                        item =>
                            path.basename(
                                item.path
                            )
                    )
            );

        const physical =
            fs.readdirSync(
                TURKAI_FILE_STORE_DIR_6
            );

        for (
            const filename
            of physical
        ) {

            if (
                indexed.has(
                    filename
                )
            ) {
                continue;
            }

            const full =
                path.join(
                    TURKAI_FILE_STORE_DIR_6,
                    filename
                );

            try {

                const stat =
                    fs.statSync(
                        full
                    );

                const age =
                    Date.now() -
                    stat.mtimeMs;

                if (
                    age >
                    24 * 60 * 60 * 1000
                ) {

                    fs.unlinkSync(
                        full
                    );

                    removed++;
                }

            } catch {
                // ignore
            }
        }

    } catch {
        // ignore
    }

    return removed;
}

// ======================================================================
// 6.50 — PERIODIC CLEANUP
// ======================================================================

if (
    TURKAI_FILE_SETTINGS_6
        .cleanup
) {

    setInterval(
        () => {

            try {

                cleanupDeletedFiles6();

                cleanupOrphanFiles6();

            } catch (
                error
            ) {

                TURKAI_FILE_STATS_6
                    .lastError =
                    error.message;

                TURKAI_FILE_STATS_6
                    .lastErrorAt =
                    fileNow6();

                saveFileStats6();
            }

        },
        15 * 60 * 1000
    );
}

// ======================================================================
// 6.51 — FILE ENGINE HEALTH
// ======================================================================

app.get(
    "/api/files/health",
    (
        req,
        res
    ) => {

        const checks = {

            engine:
                true,

            store:
                fs.existsSync(
                    TURKAI_FILE_STORE_DIR_6
                ),

            preview:
                fs.existsSync(
                    TURKAI_FILE_PREVIEW_DIR_6
                ),

            history:
                fs.existsSync(
                    TURKAI_FILE_HISTORY_DIR_6
                ),

            index:
                fs.existsSync(
                    TURKAI_FILE_INDEX_FILE_6
                )
        };

        const healthy =
            Object.values(
                checks
            ).every(
                Boolean
            );

        return res.status(
            healthy
                ? 200
                : 503
        ).json({

            ok:
                healthy,

            success:
                healthy,

            healthy,

            checks,

            stats:
                TURKAI_FILE_STATS_6,

            timestamp:
                fileNow6()
        });
    }
);

// ======================================================================
// 6.52 — FILE SYSTEM STATUS
// ======================================================================

app.get(
    "/api/files/system/status",
    (
        req,
        res
    ) => {

        let storeCount =
            0;

        let storeBytes =
            0;

        try {

            const files =
                fs.readdirSync(
                    TURKAI_FILE_STORE_DIR_6
                );

            for (
                const file
                of files
            ) {

                const full =
                    path.join(
                        TURKAI_FILE_STORE_DIR_6,
                        file
                    );

                try {

                    const stat =
                        fs.statSync(
                            full
                        );

                    if (
                        stat.isFile()
                    ) {

                        storeCount++;

                        storeBytes +=
                            stat.size;
                    }

                } catch {
                    // ignore
                }
            }

        } catch {
            // ignore
        }

        return res.json({

            ok:
                true,

            success:
                true,

            indexedFiles:
                TURKAI_FILE_INDEX_6
                    .items
                    .length,

            physicalFiles:
                storeCount,

            physicalBytes:
                storeBytes,

            indexedBytes:
                TURKAI_FILE_INDEX_6
                    .items
                    .filter(
                        item =>
                            !item.deletedAt
                    )
                    .reduce(
                        (
                            total,
                            item
                        ) =>
                            total +
                            (
                                Number(
                                    item.size
                                ) ||
                                0
                            ),
                        0
                    )
        });
    }
);

// ======================================================================
// 6.53 — MEDIA TYPE HELPERS
// ======================================================================

function detectMediaType6(
    filename,
    mimeType = ""
) {

    const mime =
        fileSafeString6(
            mimeType
        ).toLowerCase();

    if (
        mime.startsWith(
            "image/"
        )
    ) {
        return "image";
    }

    if (
        mime.startsWith(
            "video/"
        )
    ) {
        return "video";
    }

    if (
        mime.startsWith(
            "audio/"
        )
    ) {
        return "audio";
    }

    if (
        mime ===
            "application/pdf" ||
        fileExtension6(
            filename
        ) ===
            ".pdf"
    ) {
        return "pdf";
    }

    if (
        isTextExtension6(
            fileExtension6(
                filename
            )
        )
    ) {
        return "text";
    }

    return "binary";
}

// ======================================================================
// 6.54 — MEDIA INFO API
// ======================================================================

app.get(
    "/api/files/:id/media",
    (
        req,
        res
    ) => {

        const record =
            findFile6(
                req.params.id
            );

        if (
            !record ||
            record.deletedAt
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                error:
                    "file_not_found"
            });
        }

        return res.json({

            ok:
                true,

            success:
                true,

            id:
                record.id,

            filename:
                record.originalName,

            mimeType:
                record.mimeType,

            mediaType:
                detectMediaType6(
                    record.originalName,
                    record.mimeType
                ),

            size:
                record.size,

            downloadURL:
                `/api/files/${encodeURIComponent(record.id)}/download`
        });
    }
);

// ======================================================================
// 6.55 — FILE IMPORT FROM PATH
// ======================================================================

function importExistingFile6(
    sourcePath,
    userId = "guest",
    options = {}
) {

    if (
        !sourcePath
    ) {

        throw new Error(
            "source_path_required"
        );
    }

    const absolute =
        path.resolve(
            sourcePath
        );

    if (
        !fs.existsSync(
            absolute
        )
    ) {

        throw new Error(
            "source_file_not_found"
        );
    }

    const stat =
        fs.statSync(
            absolute
        );

    if (
        !stat.isFile()
    ) {

        throw new Error(
            "source_is_not_file"
        );
    }

    const originalName =
        sanitizeFilename6(
            options.originalName ||
            path.basename(
                absolute
            )
        );

    const permission =
        canUploadFile6(
            userId,
            stat.size
        );

    if (
        !permission.allowed
    ) {

        throw new Error(
            permission.reason
        );
    }

    const extension =
        fileExtension6(
            originalName
        );

    if (
        isBlockedExtension6(
            extension
        )
    ) {

        throw new Error(
            "blocked_file_type"
        );
    }

    const storedName =
        fileId6(
            "import"
        ) +
        extension;

    const destination =
        path.join(
            TURKAI_FILE_STORE_DIR_6,
            storedName
        );

    fs.copyFileSync(
        absolute,
        destination
    );

    const record =
        createFileRecord6(
            userId,
            originalName,
            storedName,
            destination,
            options
        );

    if (
        record.isText
    ) {

        const extracted =
            extractTextFromFile6(
                destination,
                originalName
            );

        record.extractedText =
            extracted.text ||
            null;

        record.preview =
            createTextPreview6(
                extracted.text
            );
    }

    saveFileRecord6(
        record
    );

    TURKAI_FILE_STATS_6
        .totalUploads++;

    TURKAI_FILE_STATS_6
        .successfulUploads++;

    saveFileStats6();

    saveFileHistory6(
        "import",
        record
    );

    return record;
}

// ======================================================================
// 6.56 — FILE IMPORT API
// ======================================================================

app.post(
    "/api/files/import",
    (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const sourcePath =
            fileSafeString6(
                body.path
            );

        const userId =
            fileSafeString6(
                body.userId,
                "guest"
            );

        if (
            !sourcePath
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                error:
                    "path_required"
            });
        }

        try {

            const record =
                importExistingFile6(
                    sourcePath,
                    userId,
                    {
                        originalName:
                            body.name,

                        conversationId:
                            body.conversationId,

                        source:
                            "import"
                    }
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                file:
                    buildPublicFile6(
                        record
                    )
            });

        } catch (
            error
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                error:
                    "import_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 6.57 — FILE EXPORT TEXT
// ======================================================================

app.post(
    "/api/files/export-text",
    (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const userId =
            fileSafeString6(
                body.userId,
                "guest"
            );

        const name =
            sanitizeFilename6(
                body.name ||
                "turkai-export.txt"
            );

        const content =
            sanitizeExtractedText6(
                body.content
            );

        if (
            !content
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                error:
                    "content_required"
            });
        }

        const permission =
            canUploadFile6(
                userId,
                Buffer.byteLength(
                    content,
                    "utf8"
                )
            );

        if (
            !permission.allowed
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                error:
                    permission.reason
            });
        }

        const extension =
            fileExtension6(
                name
            ) ||
            ".txt";

        const storedName =
            fileId6(
                "export"
            ) +
            extension;

        const destination =
            path.join(
                TURKAI_FILE_STORE_DIR_6,
                storedName
            );

        fs.writeFileSync(
            destination,
            content,
            "utf8"
        );

        const record =
            createFileRecord6(
                userId,
                name,
                storedName,
                destination,
                {
                    source:
                        "text-export"
                }
            );

        record.extractedText =
            content;

        record.preview =
            createTextPreview6(
                content
            );

        saveFileRecord6(
            record
        );

        saveFileHistory6(
            "export-text",
            record
        );

        TURKAI_FILE_STATS_6
            .totalUploads++;

        TURKAI_FILE_STATS_6
            .successfulUploads++;

        saveFileStats6();

        return res.json({

            ok:
                true,

            success:
                true,

            file:
                buildPublicFile6(
                    record
                )
        });
    }
);

// ======================================================================
// 6.58 — FILE COPY
// ======================================================================

app.post(
    "/api/files/:id/copy",
    (
        req,
        res
    ) => {

        const record =
            findFile6(
                req.params.id
            );

        if (
            !record ||
            record.deletedAt
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                error:
                    "file_not_found"
            });
        }

        if (
            !fs.existsSync(
                record.path
            )
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                error:
                    "physical_file_not_found"
            });
        }

        const newUserId =
            fileSafeString6(
                req.body &&
                req.body.userId ||
                record.userId,
                record.userId
            );

        const permission =
            canUploadFile6(
                newUserId,
                record.size
            );

        if (
            !permission.allowed
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                error:
                    permission.reason
            });
        }

        const storedName =
            fileId6(
                "copy"
            ) +
            record.extension;

        const destination =
            path.join(
                TURKAI_FILE_STORE_DIR_6,
                storedName
            );

        fs.copyFileSync(
            record.path,
            destination
        );

        const copyRecord =
            createFileRecord6(
                newUserId,
                record.originalName,
                storedName,
                destination,
                {
                    conversationId:
                        record.conversationId,

                    source:
                        "copy"
                }
            );

        if (
            record.extractedText
        ) {

            copyRecord.extractedText =
                record.extractedText;

            copyRecord.preview =
                record.preview;
        }

        saveFileRecord6(
            copyRecord
        );

        saveFileHistory6(
            "copy",
            copyRecord,
            {
                sourceFileId:
                    record.id
            }
        );

        TURKAI_FILE_STATS_6
            .totalUploads++;

        TURKAI_FILE_STATS_6
            .successfulUploads++;

        saveFileStats6();

        return res.json({

            ok:
                true,

            success:
                true,

            file:
                buildPublicFile6(
                    copyRecord
                )
        });
    }
);

// ======================================================================
// 6.59 — FILE ENGINE CLEAN STATE
// ======================================================================

TURKAI_FILE_STATS_6
    .activeFiles =
    TURKAI_FILE_INDEX_6
        .items
        .filter(
            item =>
                !item.deletedAt
        )
        .length;

saveFileIndex6();
saveFileStats6();

// ======================================================================
// 6.60 — STATE BRIDGE
// ======================================================================

serverState.files =
    serverState.files ||
    {};

serverState.files.config =
    TURKAI_FILE_CONFIG_6;

serverState.files.settings =
    TURKAI_FILE_SETTINGS_6;

serverState.files.stats =
    TURKAI_FILE_STATS_6;

serverState.files.index =
    TURKAI_FILE_INDEX_6;

serverState.files.find =
    findFile6;

serverState.files.list =
    findUserFiles6;

serverState.files.upload =
    processUploadedFile6;

serverState.files.extractText =
    extractTextFromFile6;

serverState.files.aiContext =
    buildFileAIContext6;

serverState.files.import =
    importExistingFile6;

serverState.files.cleanup =
    cleanupDeletedFiles6;

// ======================================================================
// 6.61 — GLOBAL FILE BRIDGE
// ======================================================================

global.turkAI =
    global.turkAI ||
    {};

global.turkAI.files =
    global.turkAI.files ||
    {};

global.turkAI.files.find =
    findFile6;

global.turkAI.files.list =
    findUserFiles6;

global.turkAI.files.extract =
    extractTextFromFile6;

global.turkAI.files.aiContext =
    buildFileAIContext6;

global.turkAI.files.import =
    importExistingFile6;

global.turkAI.files.config =
    TURKAI_FILE_CONFIG_6;

// ======================================================================
// 6.62 — FILE/AI MESSAGE CONTEXT
// ======================================================================

async function enrichAIWithFile6(
    userId,
    fileId,
    options = {}
) {

    const result =
        await buildFileAIContext6(
            userId,
            fileId
        );

    if (
        !result.ok
    ) {

        return {

            ...options,

            fileContext:
                "",

            file:
                null
        };
    }

    const context =
        result.context;

    const text =
        context.text ||
        "";

    return {

        ...options,

        fileContext:
            [
                `Dosya: ${context.name}`,

                `Tür: ${context.mimeType}`,

                `Boyut: ${context.size} byte`,

                text
                    ? `İçerik:\n${text.slice(0, 50000)}`
                    : "Metin içeriği bulunamadı."
            ].join(
                "\n\n"
            ),

        file:
            context
    };
}

// ======================================================================
// 6.63 — FILE AI CONTEXT POST
// ======================================================================

app.post(
    "/api/files/ai-context",
    async (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const userId =
            fileSafeString6(
                body.userId,
                "guest"
            );

        const fileId =
            fileSafeString6(
                body.fileId
            );

        if (
            !fileId
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                error:
                    "fileId_required"
            });
        }

        try {

            const result =
                await enrichAIWithFile6(
                    userId,
                    fileId,
                    body
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                ...result
            });

        } catch (
            error
        ) {

            return res.status(
                500
            ).json({

                ok:
                    false,

                error:
                    "file_ai_context_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 6.64 — FILE INDEX REBUILD
// ======================================================================

function rebuildFileIndex6() {

    let scanned =
        0;

    let recovered =
        0;

    try {

        const physical =
            fs.readdirSync(
                TURKAI_FILE_STORE_DIR_6
            );

        const existingNames =
            new Set(
                TURKAI_FILE_INDEX_6
                    .items
                    .map(
                        item =>
                            path.basename(
                                item.path
                            )
                    )
            );

        for (
            const filename
            of physical
        ) {

            if (
                existingNames.has(
                    filename
                )
            ) {
                continue;
            }

            const full =
                path.join(
                    TURKAI_FILE_STORE_DIR_6,
                    filename
                );

            try {

                const stat =
                    fs.statSync(
                        full
                    );

                if (
                    !stat.isFile()
                ) {
                    continue;
                }

                scanned++;

                const extension =
                    fileExtension6(
                        filename
                    );

                const record =
                    createFileRecord6(
                        "recovered",
                        filename,
                        filename,
                        full,
                        {
                            source:
                                "index-recovery"
                        }
                    );

                if (
                    isTextExtension6(
                        extension
                    )
                ) {

                    const extracted =
                        extractTextFromFile6(
                            full,
                            filename
                        );

                    record.extractedText =
                        extracted.text ||
                        null;

                    record.preview =
                        createTextPreview6(
                            extracted.text
                        );
                }

                TURKAI_FILE_INDEX_6
                    .items
                    .push(
                        record
                    );

                recovered++;

            } catch {
                // ignore
            }
        }

        if (
            recovered
        ) {

            saveFileIndex6();

            TURKAI_FILE_STATS_6
                .activeFiles =
                TURKAI_FILE_INDEX_6
                    .items
                    .filter(
                        item =>
                            !item.deletedAt
                    )
                    .length;

            saveFileStats6();
        }

    } catch {
        // ignore
    }

    return {

        scanned,

        recovered
    };
}

// ======================================================================
// 6.65 — INDEX REBUILD API
// ======================================================================

app.post(
    "/api/files/rebuild-index",
    (
        req,
        res
    ) => {

        const adminKey =
            fileSafeString6(
                req.body &&
                req.body.adminKey
            );

        const expected =
            fileSafeString6(
                process.env.TURKAI_ADMIN_KEY
            );

        if (
            !expected ||
            adminKey !==
                expected
        ) {

            return res.status(
                403
            ).json({

                ok:
                    false,

                error:
                    "invalid_admin_key"
            });
        }

        const result =
            rebuildFileIndex6();

        return res.json({

            ok:
                true,

            success:
                true,

            ...result
        });
    }
);

// ======================================================================
// 6.66 — FILE ENGINE DIAGNOSTICS
// ======================================================================

app.get(
    "/api/files/diagnostics",
    (
        req,
        res
    ) => {

        const extensions =
            {};

        for (
            const item
            of TURKAI_FILE_INDEX_6
                .items
                .filter(
                    file =>
                        !file.deletedAt
                )
        ) {

            const ext =
                item.extension ||
                "(none)";

            extensions[ext] =
                (
                    extensions[ext] ||
                    0
                ) +
                1;
        }

        return res.json({

            ok:
                true,

            success:
                true,

            version:
                "6.0",

            stats:
                TURKAI_FILE_STATS_6,

            settings:
                TURKAI_FILE_SETTINGS_6,

            extensions,

            directories: {

                root:
                    TURKAI_FILE_DIR_6,

                store:
                    TURKAI_FILE_STORE_DIR_6,

                preview:
                    TURKAI_FILE_PREVIEW_DIR_6,

                history:
                    TURKAI_FILE_HISTORY_DIR_6
            }
        });
    }
);

// ======================================================================
// 6.67 — MEDIA UPLOAD INFO
// ======================================================================

app.post(
    "/api/media/upload-info",
    (
        req,
        res
    ) => {

        const filename =
            fileSafeString6(
                req.body &&
                req.body.filename
            );

        const mimeType =
            fileSafeString6(
                req.body &&
                req.body.mimeType
            );

        const size =
            Number(
                req.body &&
                req.body.size
            );

        if (
            !filename
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                error:
                    "filename_required"
            });
        }

        const extension =
            fileExtension6(
                filename
            );

        return res.json({

            ok:
                true,

            success:
                true,

            filename:
                sanitizeFilename6(
                    filename
                ),

            extension,

            mimeType:
                mimeType ||
                getMimeType6(
                    filename
                ),

            size:
                Number.isFinite(
                    size
                )
                    ? size
                    : null,

            mediaType:
                detectMediaType6(
                    filename,
                    mimeType
                ),

            allowed:
                !isBlockedExtension6(
                    extension
                )
        });
    }
);

// ======================================================================
// 6.68 — DOWNLOAD COUNT API
// ======================================================================

app.get(
    "/api/files/:id/downloads",
    (
        req,
        res
    ) => {

        const record =
            findFile6(
                req.params.id
            );

        if (
            !record
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                error:
                    "file_not_found"
            });
        }

        return res.json({

            ok:
                true,

            success:
                true,

            id:
                record.id,

            downloads:
                Number(
                    record.downloads ||
                    0
                ),

            views:
                Number(
                    record.views ||
                    0
                )
        });
    }
);

// ======================================================================
// 6.69 — TEXT FILE ANALYSIS
// ======================================================================

function analyzeTextFile6(
    record
) {

    if (
        !record ||
        !record.isText
    ) {

        return {

            supported:
                false,

            lines:
                0,

            words:
                0,

            characters:
                0,

            nonWhitespace:
                0
        };
    }

    let text =
        record.extractedText ||
        "";

    if (
        !text &&
        fs.existsSync(
            record.path
        )
    ) {

        text =
            extractTextFromFile6(
                record.path,
                record.originalName
            ).text ||
            "";
    }

    const lines =
        text
            ? text.split(
                "\n"
            ).length
            : 0;

    const words =
        text
            ? (
                text
                    .trim()
                    .match(
                        /\S+/g
                    ) ||
                []
            ).length
            : 0;

    const characters =
        text.length;

    const nonWhitespace =
        text.replace(
            /\s/g,
            ""
        ).length;

    return {

        supported:
            true,

        lines,

        words,

        characters,

        nonWhitespace
    };
}

// ======================================================================
// 6.70 — FILE ANALYSIS API
// ======================================================================

app.get(
    "/api/files/:id/analyze",
    (
        req,
        res
    ) => {

        const record =
            findFile6(
                req.params.id
            );

        if (
            !record ||
            record.deletedAt
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                error:
                    "file_not_found"
            });
        }

        return res.json({

            ok:
                true,

            success:
                true,

            file:
                buildPublicFile6(
                    record
                ),

            analysis:
                analyzeTextFile6(
                    record
                )
        });
    }
);

// ======================================================================
// 6.71 — FILE JSON VALIDATION
// ======================================================================

app.get(
    "/api/files/:id/json-check",
    (
        req,
        res
    ) => {

        const record =
            findFile6(
                req.params.id
            );

        if (
            !record ||
            record.deletedAt
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                error:
                    "file_not_found"
            });
        }

        if (
            record.extension !==
            ".json"
        ) {

            return res.json({

                ok:
                    true,

                success:
                    true,

                supported:
                    false,

                valid:
                    null
            });
        }

        const extracted =
            extractTextFromFile6(
                record.path,
                record.originalName
            );

        try {

            const parsed =
                JSON.parse(
                    extracted.text
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                supported:
                    true,

                valid:
                    true,

                type:
                    Array.isArray(
                        parsed
                    )
                        ? "array"
                        : typeof parsed
            });

        } catch (
            error
        ) {

            return res.json({

                ok:
                    true,

                success:
                    true,

                supported:
                    true,

                valid:
                    false,

                error:
                    error.message
            });
        }
    }
);

// ======================================================================
// 6.72 — FILE HASH API
// ======================================================================

app.get(
    "/api/files/:id/hash",
    (
        req,
        res
    ) => {

        const record =
            findFile6(
                req.params.id
            );

        if (
            !record
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                error:
                    "file_not_found"
            });
        }

        if (
            !record.hash &&
            fs.existsSync(
                record.path
            )
        ) {

            record.hash =
                hashFile6(
                    record.path
                );

            saveFileIndex6();
        }

        return res.json({

            ok:
                true,

            success:
                true,

            id:
                record.id,

            algorithm:
                "sha256",

            hash:
                record.hash
        });
    }
);

// ======================================================================
// 6.73 — FILE NAME AVAILABILITY
// ======================================================================

app.get(
    "/api/files/name/check",
    (
        req,
        res
    ) => {

        const userId =
            fileSafeString6(
                req.query.userId ||
                "guest"
            );

        const name =
            sanitizeFilename6(
                req.query.name ||
                ""
            );

        if (
            !name
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                error:
                    "name_required"
            });
        }

        const exists =
            findUserFiles6(
                userId
            ).some(
                item =>
                    !item.deletedAt &&
                    item.originalName
                        .toLocaleLowerCase(
                            "tr-TR"
                        ) ===
                    name
                        .toLocaleLowerCase(
                            "tr-TR"
                        )
            );

        return res.json({

            ok:
                true,

            success:
                true,

            available:
                !exists,

            name
        });
    }
);

// ======================================================================
// 6.74 — FILE QUOTA
// ======================================================================

app.get(
    "/api/files/quota/:userId",
    (
        req,
        res
    ) => {

        const userId =
            fileSafeString6(
                req.params.userId,
                "guest"
            );

        const files =
            findUserFiles6(
                userId
            ).filter(
                item =>
                    !item.deletedAt
            );

        const used =
            files.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    (
                        Number(
                            item.size
                        ) ||
                        0
                    ),
                0
            );

        const max =
            TURKAI_FILE_CONFIG_6
                .maxFileSize *
            TURKAI_FILE_CONFIG_6
                .maxFilesPerUser;

        return res.json({

            ok:
                true,

            success:
                true,

            userId,

            files:
                files.length,

            maxFiles:
                TURKAI_FILE_CONFIG_6
                    .maxFilesPerUser,

            usedBytes:
                used,

            approximateMaxBytes:
                max,

            remainingBytes:
                Math.max(
                    0,
                    max -
                    used
                )
        });
    }
);

// ======================================================================
// 6.75 — FILE ENGINE RESET STATS
// ======================================================================

app.post(
    "/api/files/stats/reset",
    (
        req,
        res
    ) => {

        const adminKey =
            fileSafeString6(
                req.body &&
                req.body.adminKey
            );

        const expected =
            fileSafeString6(
                process.env.TURKAI_ADMIN_KEY
            );

        if (
            !expected ||
            adminKey !==
                expected
        ) {

            return res.status(
                403
            ).json({

                ok:
                    false,

                error:
                    "invalid_admin_key"
            });
        }

        TURKAI_FILE_STATS_6 = {

            ...TURKAI_FILE_STATS_6,

            totalUploads:
                0,

            successfulUploads:
                0,

            failedUploads:
                0,

            totalDownloads:
                0,

            totalDeletes:
                0,

            totalPreviews:
                0,

            totalExtractions:
                0,

            extractionFailures:
                0
        };

        saveFileStats6();

        return res.json({

            ok:
                true,

            success:
                true,

            stats:
                TURKAI_FILE_STATS_6
        });
    }
);

// ======================================================================
// 6.76 — FILE ENGINE BOOT STATE
// ======================================================================

serverState.files =
    serverState.files ||
    {};

serverState.files.ready =
    true;

serverState.files.version =
    "6.0";

serverState.files.uploads =
    TURKAI_FILE_SETTINGS_6
        .uploads;

serverState.files.downloads =
    TURKAI_FILE_SETTINGS_6
        .downloads;

serverState.files.textExtraction =
    TURKAI_FILE_SETTINGS_6
        .textExtraction;

serverState.files.preview =
    TURKAI_FILE_SETTINGS_6
        .preview;

serverState.files.media =
    true;

// ======================================================================
// 6.77 — GLOBAL FILE HELPERS
// ======================================================================

global.turkAI =
    global.turkAI ||
    {};

global.turkAI.files =
    global.turkAI.files ||
    {};

global.turkAI.files.analyze =
    analyzeTextFile6;

global.turkAI.files.mediaType =
    detectMediaType6;

global.turkAI.files.public =
    buildPublicFile6;

global.turkAI.files.canUpload =
    canUploadFile6;

// ======================================================================
// 6.78 — PERSISTENCE
// ======================================================================

saveFileIndex6();
saveFileStats6();
writeJSON(
    TURKAI_FILE_SETTINGS_FILE_6,
    TURKAI_FILE_SETTINGS_6
);

// ======================================================================
// 6.79 — STARTUP LOG
// ======================================================================

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

console.log(
    "TürkAI Master Server — PART 6/10"
);

console.log(
    "File Engine:",
    TURKAI_FILE_CONFIG_6
        .enabled
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Uploads:",
    TURKAI_FILE_SETTINGS_6
        .uploads
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Downloads:",
    TURKAI_FILE_SETTINGS_6
        .downloads
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Text Extraction:",
    TURKAI_FILE_SETTINGS_6
        .textExtraction
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Preview:",
    TURKAI_FILE_SETTINGS_6
        .preview
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Indexed Files:",
    TURKAI_FILE_INDEX_6
        .items
        .length
);

console.log(
    "Active Files:",
    TURKAI_FILE_STATS_6
        .activeFiles
);

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

/*
========================================================================
 PART 6 END

 SONRA:
 PART 7 / 10
 TASKS + REMINDERS + SCHEDULER + NOTIFICATIONS
========================================================================
*/

/*
========================================================================
 TÜRKAI MASTER SERVER 50.0
 PART 7 / 10
 TASKS + REMINDERS + SCHEDULER + NOTIFICATIONS + EVENTS
========================================================================
*/

"use strict";

// ======================================================================
// 7.0 — TASK SYSTEM CONFIG
// ======================================================================

const TURKAI_TASK_CONFIG_7 = {

    enabled:
        true,

    remindersEnabled:
        true,

    schedulerEnabled:
        true,

    notificationsEnabled:
        true,

    eventsEnabled:
        true,

    persistenceEnabled:
        true,

    schedulerInterval:
        15000,

    maxTasksPerUser:
        500,

    maxRemindersPerUser:
        500,

    maxNotificationsPerUser:
        1000,

    maxTitleLength:
        300,

    maxDescriptionLength:
        5000,

    historyLimit:
        5000,

    overdueGraceMs:
        60 * 1000
};

// ======================================================================
// 7.1 — TASK DIRECTORIES
// ======================================================================

const TURKAI_TASK_DIR_7 =
    path.join(
        DATA_DIR,
        "tasks"
    );

const TURKAI_TASK_HISTORY_DIR_7 =
    path.join(
        TURKAI_TASK_DIR_7,
        "history"
    );

const TURKAI_NOTIFICATION_DIR_7 =
    path.join(
        TURKAI_TASK_DIR_7,
        "notifications"
    );

const TURKAI_TASKS_FILE_7 =
    path.join(
        TURKAI_TASK_DIR_7,
        "tasks.json"
    );

const TURKAI_REMINDERS_FILE_7 =
    path.join(
        TURKAI_TASK_DIR_7,
        "reminders.json"
    );

const TURKAI_NOTIFICATIONS_FILE_7 =
    path.join(
        TURKAI_TASK_DIR_7,
        "notifications.json"
    );

const TURKAI_TASK_SETTINGS_FILE_7 =
    path.join(
        TURKAI_TASK_DIR_7,
        "settings.json"
    );

const TURKAI_TASK_STATS_FILE_7 =
    path.join(
        TURKAI_TASK_DIR_7,
        "stats.json"
    );

[
    TURKAI_TASK_DIR_7,
    TURKAI_TASK_HISTORY_DIR_7,
    TURKAI_NOTIFICATION_DIR_7
].forEach(
    ensureDir
);

// ======================================================================
// 7.2 — TASK SETTINGS
// ======================================================================

let TURKAI_TASK_SETTINGS_7 =
    readJSON(
        TURKAI_TASK_SETTINGS_FILE_7,
        {
            enabled:
                true,

            reminders:
                true,

            scheduler:
                true,

            notifications:
                true,

            events:
                true
        }
    );

if (
    !TURKAI_TASK_SETTINGS_7 ||
    typeof TURKAI_TASK_SETTINGS_7 !==
        "object"
) {

    TURKAI_TASK_SETTINGS_7 = {
        enabled:
            true,

        reminders:
            true,

        scheduler:
            true,

        notifications:
            true,

        events:
            true
    };
}

writeJSON(
    TURKAI_TASK_SETTINGS_FILE_7,
    TURKAI_TASK_SETTINGS_7
);

// ======================================================================
// 7.3 — TASK STATS
// ======================================================================

let TURKAI_TASK_STATS_7 =
    readJSON(
        TURKAI_TASK_STATS_FILE_7,
        {
            version:
                "7.0",

            totalTasks:
                0,

            totalReminders:
                0,

            totalNotifications:
                0,

            completedTasks:
                0,

            completedReminders:
                0,

            firedReminders:
                0,

            unreadNotifications:
                0,

            schedulerRuns:
                0,

            schedulerErrors:
                0,

            overdueTasks:
                0,

            deletedTasks:
                0,

            deletedReminders:
                0,

            lastSchedulerRun:
                null,

            lastEvent:
                null,

            lastError:
                null,

            lastErrorAt:
                null
        }
    );

if (
    !TURKAI_TASK_STATS_7 ||
    typeof TURKAI_TASK_STATS_7 !==
        "object"
) {

    TURKAI_TASK_STATS_7 = {

        version:
            "7.0",

        totalTasks:
            0,

        totalReminders:
            0,

        totalNotifications:
            0,

        completedTasks:
            0,

        completedReminders:
            0,

        firedReminders:
            0,

        unreadNotifications:
            0,

        schedulerRuns:
            0,

        schedulerErrors:
            0,

        overdueTasks:
            0,

        deletedTasks:
            0,

        deletedReminders:
            0,

        lastSchedulerRun:
            null,

        lastEvent:
            null,

        lastError:
            null,

        lastErrorAt:
            null
    };
}

// ======================================================================
// 7.4 — DATABASES
// ======================================================================

let TURKAI_TASK_DB_7 =
    readJSON(
        TURKAI_TASKS_FILE_7,
        {
            version:
                "7.0",

            items:
                []
        }
    );

let TURKAI_REMINDER_DB_7 =
    readJSON(
        TURKAI_REMINDERS_FILE_7,
        {
            version:
                "7.0",

            items:
                []
        }
    );

let TURKAI_NOTIFICATION_DB_7 =
    readJSON(
        TURKAI_NOTIFICATIONS_FILE_7,
        {
            version:
                "7.0",

            items:
                []
        }
    );

if (
    !TURKAI_TASK_DB_7 ||
    !Array.isArray(
        TURKAI_TASK_DB_7.items
    )
) {

    TURKAI_TASK_DB_7 = {

        version:
            "7.0",

        items:
            []
    };
}

if (
    !TURKAI_REMINDER_DB_7 ||
    !Array.isArray(
        TURKAI_REMINDER_DB_7.items
    )
) {

    TURKAI_REMINDER_DB_7 = {

        version:
            "7.0",

        items:
            []
    };
}

if (
    !TURKAI_NOTIFICATION_DB_7 ||
    !Array.isArray(
        TURKAI_NOTIFICATION_DB_7.items
    )
) {

    TURKAI_NOTIFICATION_DB_7 = {

        version:
            "7.0",

        items:
            []
    };
}

// ======================================================================
// 7.5 — UTILS
// ======================================================================

function taskSafeString7(
    value,
    fallback = ""
) {

    if (
        value ===
            null ||
        value ===
            undefined
    ) {
        return fallback;
    }

    return String(
        value
    ).trim();
}

function taskNow7() {

    return new Date()
        .toISOString();
}

function taskId7(
    prefix =
        "task"
) {

    return (
        prefix +
        "_" +
        Date.now().toString(
            36
        ) +
        "_" +
        crypto
            .randomBytes(
                6
            )
            .toString(
                "hex"
            )
    );
}

function taskUser7(
    userId
) {

    return taskSafeString7(
        userId ||
        "guest",
        "guest"
    );
}

function taskDate7(
    value
) {

    if (
        !value
    ) {
        return null;
    }

    const date =
        new Date(
            value
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }

    return date;
}

function taskBoolean7(
    value,
    fallback =
        false
) {

    if (
        value ===
            undefined ||
        value ===
            null
    ) {
        return fallback;
    }

    if (
        typeof value ===
            "boolean"
    ) {
        return value;
    }

    return [
        "true",
        "1",
        "yes",
        "evet"
    ].includes(
        String(
            value
        )
            .toLowerCase()
            .trim()
    );
}

function taskClamp7(
    value,
    min,
    max
) {

    const numeric =
        Number(
            value
        );

    if (
        !Number.isFinite(
            numeric
        )
    ) {
        return min;
    }

    return Math.min(
        max,
        Math.max(
            min,
            numeric
        )
    );
}

// ======================================================================
// 7.6 — SAVE DATABASES
// ======================================================================

function saveTasks7() {

    return writeJSON(
        TURKAI_TASKS_FILE_7,
        TURKAI_TASK_DB_7
    );
}

function saveReminders7() {

    return writeJSON(
        TURKAI_REMINDERS_FILE_7,
        TURKAI_REMINDER_DB_7
    );
}

function saveNotifications7() {

    return writeJSON(
        TURKAI_NOTIFICATIONS_FILE_7,
        TURKAI_NOTIFICATION_DB_7
    );
}

function saveTaskSettings7() {

    return writeJSON(
        TURKAI_TASK_SETTINGS_FILE_7,
        TURKAI_TASK_SETTINGS_7
    );
}

function saveTaskStats7() {

    return writeJSON(
        TURKAI_TASK_STATS_FILE_7,
        TURKAI_TASK_STATS_7
    );
}

// ======================================================================
// 7.7 — TASK LOOKUP
// ======================================================================

function getTask7(
    id
) {

    return TURKAI_TASK_DB_7
        .items
        .find(
            item =>
                item.id ===
                id
        );
}

function getReminder7(
    id
) {

    return TURKAI_REMINDER_DB_7
        .items
        .find(
            item =>
                item.id ===
                id
        );
}

function getNotification7(
    id
) {

    return TURKAI_NOTIFICATION_DB_7
        .items
        .find(
            item =>
                item.id ===
                id
        );
}

// ======================================================================
// 7.8 — USER TASKS
// ======================================================================

function getUserTasks7(
    userId,
    includeDeleted =
        false
) {

    const uid =
        taskUser7(
            userId
        );

    return TURKAI_TASK_DB_7
        .items
        .filter(
            item =>
                item.userId ===
                uid
        )
        .filter(
            item =>
                includeDeleted ||
                !item.deletedAt
        )
        .sort(
            (
                a,
                b
            ) =>
                String(
                    b.updatedAt ||
                    b.createdAt
                ).localeCompare(
                    String(
                        a.updatedAt ||
                        a.createdAt
                    )
                )
        );
}

// ======================================================================
// 7.9 — USER REMINDERS
// ======================================================================

function getUserReminders7(
    userId,
    includeDeleted =
        false
) {

    const uid =
        taskUser7(
            userId
        );

    return TURKAI_REMINDER_DB_7
        .items
        .filter(
            item =>
                item.userId ===
                uid
        )
        .filter(
            item =>
                includeDeleted ||
                !item.deletedAt
        )
        .sort(
            (
                a,
                b
            ) =>
                String(
                    a.remindAt ||
                    a.createdAt
                ).localeCompare(
                    String(
                        b.remindAt ||
                        b.createdAt
                    )
                )
        );
}

// ======================================================================
// 7.10 — USER NOTIFICATIONS
// ======================================================================

function getUserNotifications7(
    userId,
    options = {}
) {

    const uid =
        taskUser7(
            userId
        );

    let items =
        TURKAI_NOTIFICATION_DB_7
            .items
            .filter(
                item =>
                    item.userId ===
                    uid
            );

    if (
        options.unreadOnly
    ) {

        items =
            items.filter(
                item =>
                    !item.read
            );
    }

    const limit =
        taskClamp7(
            options.limit ||
            100,
            1,
            500
        );

    return items
        .sort(
            (
                a,
                b
            ) =>
                String(
                    b.createdAt
                ).localeCompare(
                    String(
                        a.createdAt
                    )
                )
        )
        .slice(
            0,
            limit
        );
}

// ======================================================================
// 7.11 — TASK HISTORY
// ======================================================================

function saveTaskHistory7(
    type,
    entity,
    extra = {}
) {

    const id =
        taskId7(
            "event"
        );

    const file =
        path.join(
            TURKAI_TASK_HISTORY_DIR_7,
            `${id}.json`
        );

    writeJSON(
        file,
        {

            id,

            type,

            entityId:
                entity &&
                entity.id
                    ? entity.id
                    : null,

            userId:
                entity &&
                entity.userId
                    ? entity.userId
                    : "guest",

            timestamp:
                taskNow7(),

            ...extra
        }
    );

    TURKAI_TASK_STATS_7
        .lastEvent =
        type;

    return id;
}

// ======================================================================
// 7.12 — TASK EVENT EMITTER
// ======================================================================

function emitTaskEvent7(
    userId,
    eventName,
    payload = {}
) {

    const uid =
        taskUser7(
            userId
        );

    const event = {

        id:
            taskId7(
                "event"
            ),

        event:
            eventName,

        userId:
            uid,

        timestamp:
            taskNow7(),

        payload
    };

    if (
        TURKAI_TASK_SETTINGS_7
            .events
    ) {

        io.to(
            "user:" +
            uid
        ).emit(
            eventName,
            payload
        );

        io.to(
            "user:" +
            uid
        ).emit(
            "turkai:event",
            event
        );
    }

    return event;
}

// ======================================================================
// 7.13 — CREATE TASK
// ======================================================================

function createTask7(
    input = {}
) {

    const userId =
        taskUser7(
            input.userId
        );

    const userTaskCount =
        getUserTasks7(
            userId
        ).length;

    if (
        userTaskCount >=
        TURKAI_TASK_CONFIG_7
            .maxTasksPerUser
    ) {

        throw new Error(
            "task_limit_reached"
        );
    }

    const title =
        taskSafeString7(
            input.title ||
            input.name ||
            input.message,
            "Yeni görev"
        ).slice(
            0,
            TURKAI_TASK_CONFIG_7
                .maxTitleLength
        );

    const description =
        taskSafeString7(
            input.description ||
            input.notes ||
            ""
        ).slice(
            0,
            TURKAI_TASK_CONFIG_7
                .maxDescriptionLength
        );

    const dueDate =
        taskDate7(
            input.dueAt ||
            input.dueDate
        );

    const task = {

        id:
            taskId7(
                "task"
            ),

        userId,

        title,

        description,

        priority:
            taskSafeString7(
                input.priority,
                "normal"
            ),

        category:
            taskSafeString7(
                input.category,
                "general"
            ),

        dueAt:
            dueDate
                ? dueDate.toISOString()
                : null,

        completed:
            false,

        completedAt:
            null,

        archived:
            false,

        deletedAt:
            null,

        createdAt:
            taskNow7(),

        updatedAt:
            taskNow7(),

        metadata:
            input.metadata &&
            typeof input.metadata ===
                "object"
                ? input.metadata
                : {}
    };

    TURKAI_TASK_DB_7
        .items
        .push(
            task
        );

    TURKAI_TASK_STATS_7
        .totalTasks++;

    saveTasks7();
    saveTaskStats7();

    saveTaskHistory7(
        "task-created",
        task
    );

    emitTaskEvent7(
        userId,
        "task:created",
        task
    );

    return task;
}

// ======================================================================
// 7.14 — UPDATE TASK
// ======================================================================

function updateTask7(
    id,
    patch = {}
) {

    const task =
        getTask7(
            id
        );

    if (
        !task ||
        task.deletedAt
    ) {

        throw new Error(
            "task_not_found"
        );
    }

    if (
        patch.title !==
        undefined
    ) {

        task.title =
            taskSafeString7(
                patch.title
            ).slice(
                0,
                TURKAI_TASK_CONFIG_7
                    .maxTitleLength
            );
    }

    if (
        patch.description !==
        undefined
    ) {

        task.description =
            taskSafeString7(
                patch.description
            ).slice(
                0,
                TURKAI_TASK_CONFIG_7
                    .maxDescriptionLength
            );
    }

    if (
        patch.priority !==
        undefined
    ) {

        task.priority =
            taskSafeString7(
                patch.priority,
                "normal"
            );
    }

    if (
        patch.category !==
        undefined
    ) {

        task.category =
            taskSafeString7(
                patch.category,
                "general"
            );
    }

    if (
        patch.dueAt !==
            undefined ||
        patch.dueDate !==
            undefined
    ) {

        const due =
            taskDate7(
                patch.dueAt ||
                patch.dueDate
            );

        task.dueAt =
            due
                ? due.toISOString()
                : null;
    }

    if (
        patch.completed !==
        undefined
    ) {

        const completed =
            taskBoolean7(
                patch.completed
            );

        if (
            completed &&
            !task.completed
        ) {

            TURKAI_TASK_STATS_7
                .completedTasks++;

            task.completedAt =
                taskNow7();

            emitTaskEvent7(
                task.userId,
                "task:completed",
                task
            );
        }

        if (
            !completed &&
            task.completed
        ) {

            task.completedAt =
                null;
        }

        task.completed =
            completed;
    }

    if (
        patch.archived !==
        undefined
    ) {

        task.archived =
            taskBoolean7(
                patch.archived
            );
    }

    if (
        patch.metadata &&
        typeof patch.metadata ===
            "object"
    ) {

        task.metadata = {

            ...task.metadata,

            ...patch.metadata
        };
    }

    task.updatedAt =
        taskNow7();

    saveTasks7();
    saveTaskStats7();

    saveTaskHistory7(
        "task-updated",
        task,
        {
            patch
        }
    );

    emitTaskEvent7(
        task.userId,
        "task:updated",
        task
    );

    return task;
}

// ======================================================================
// 7.15 — DELETE TASK
// ======================================================================

function deleteTask7(
    id
) {

    const task =
        getTask7(
            id
        );

    if (
        !task ||
        task.deletedAt
    ) {

        throw new Error(
            "task_not_found"
        );
    }

    task.deletedAt =
        taskNow7();

    task.updatedAt =
        taskNow7();

    TURKAI_TASK_STATS_7
        .deletedTasks++;

    saveTasks7();
    saveTaskStats7();

    saveTaskHistory7(
        "task-deleted",
        task
    );

    emitTaskEvent7(
        task.userId,
        "task:deleted",
        {
            id:
                task.id
        }
    );

    return task;
}

// ======================================================================
// 7.16 — COMPLETE TASK
// ======================================================================

function completeTask7(
    id
) {

    return updateTask7(
        id,
        {
            completed:
                true
        }
    );
}

// ======================================================================
// 7.17 — CREATE REMINDER
// ======================================================================

function createReminder7(
    input = {}
) {

    const userId =
        taskUser7(
            input.userId
        );

    const count =
        getUserReminders7(
            userId
        ).length;

    if (
        count >=
        TURKAI_TASK_CONFIG_7
            .maxRemindersPerUser
    ) {

        throw new Error(
            "reminder_limit_reached"
        );
    }

    const remindDate =
        taskDate7(
            input.remindAt ||
            input.dueAt ||
            input.date ||
            input.time
        );

    if (
        !remindDate
    ) {

        throw new Error(
            "valid_remindAt_required"
        );
    }

    const title =
        taskSafeString7(
            input.title ||
            input.message ||
            input.name,
            "Hatırlatma"
        ).slice(
            0,
            TURKAI_TASK_CONFIG_7
                .maxTitleLength
        );

    const description =
        taskSafeString7(
            input.description ||
            input.notes ||
            ""
        ).slice(
            0,
            TURKAI_TASK_CONFIG_7
                .maxDescriptionLength
        );

    const reminder = {

        id:
            taskId7(
                "reminder"
            ),

        userId,

        title,

        description,

        remindAt:
            remindDate.toISOString(),

        repeat:
            taskSafeString7(
                input.repeat,
                "none"
            ),

        timezone:
            taskSafeString7(
                input.timezone,
                "Europe/Istanbul"
            ),

        fired:
            false,

        firedAt:
            null,

        completed:
            false,

        completedAt:
            null,

        canceled:
            false,

        canceledAt:
            null,

        deletedAt:
            null,

        createdAt:
            taskNow7(),

        updatedAt:
            taskNow7(),

        metadata:
            input.metadata &&
            typeof input.metadata ===
                "object"
                ? input.metadata
                : {}
    };

    TURKAI_REMINDER_DB_7
        .items
        .push(
            reminder
        );

    TURKAI_TASK_STATS_7
        .totalReminders++;

    saveReminders7();
    saveTaskStats7();

    saveTaskHistory7(
        "reminder-created",
        reminder
    );

    emitTaskEvent7(
        userId,
        "reminder:created",
        reminder
    );

    return reminder;
}

// ======================================================================
// 7.18 — UPDATE REMINDER
// ======================================================================

function updateReminder7(
    id,
    patch = {}
) {

    const reminder =
        getReminder7(
            id
        );

    if (
        !reminder ||
        reminder.deletedAt
    ) {

        throw new Error(
            "reminder_not_found"
        );
    }

    if (
        patch.title !==
        undefined
    ) {

        reminder.title =
            taskSafeString7(
                patch.title
            ).slice(
                0,
                TURKAI_TASK_CONFIG_7
                    .maxTitleLength
            );
    }

    if (
        patch.description !==
        undefined
    ) {

        reminder.description =
            taskSafeString7(
                patch.description
            ).slice(
                0,
                TURKAI_TASK_CONFIG_7
                    .maxDescriptionLength
            );
    }

    if (
        patch.remindAt !==
            undefined ||
        patch.dueAt !==
            undefined ||
        patch.date !==
            undefined ||
        patch.time !==
            undefined
    ) {

        const remindDate =
            taskDate7(
                patch.remindAt ||
                patch.dueAt ||
                patch.date ||
                patch.time
            );

        if (
            !remindDate
        ) {

            throw new Error(
                "invalid_remindAt"
            );
        }

        reminder.remindAt =
            remindDate.toISOString();

        reminder.fired =
            false;

        reminder.firedAt =
            null;
    }

    if (
        patch.repeat !==
        undefined
    ) {

        reminder.repeat =
            taskSafeString7(
                patch.repeat,
                "none"
            );
    }

    if (
        patch.completed !==
        undefined
    ) {

        const completed =
            taskBoolean7(
                patch.completed
            );

        if (
            completed &&
            !reminder.completed
        ) {

            TURKAI_TASK_STATS_7
                .completedReminders++;

            reminder.completedAt =
                taskNow7();
        }

        if (
            !completed
        ) {

            reminder.completedAt =
                null;
        }

        reminder.completed =
            completed;
    }

    if (
        patch.canceled !==
        undefined
    ) {

        const canceled =
            taskBoolean7(
                patch.canceled
            );

        reminder.canceled =
            canceled;

        reminder.canceledAt =
            canceled
                ? taskNow7()
                : null;
    }

    reminder.updatedAt =
        taskNow7();

    saveReminders7();
    saveTaskStats7();

    saveTaskHistory7(
        "reminder-updated",
        reminder,
        {
            patch
        }
    );

    emitTaskEvent7(
        reminder.userId,
        "reminder:updated",
        reminder
    );

    return reminder;
}

// ======================================================================
// 7.19 — DELETE REMINDER
// ======================================================================

function deleteReminder7(
    id
) {

    const reminder =
        getReminder7(
            id
        );

    if (
        !reminder ||
        reminder.deletedAt
    ) {

        throw new Error(
            "reminder_not_found"
        );
    }

    reminder.deletedAt =
        taskNow7();

    reminder.updatedAt =
        taskNow7();

    TURKAI_TASK_STATS_7
        .deletedReminders++;

    saveReminders7();
    saveTaskStats7();

    saveTaskHistory7(
        "reminder-deleted",
        reminder
    );

    emitTaskEvent7(
        reminder.userId,
        "reminder:deleted",
        {
            id:
                reminder.id
        }
    );

    return reminder;
}

// ======================================================================
// 7.20 — COMPLETE REMINDER
// ======================================================================

function completeReminder7(
    id
) {

    return updateReminder7(
        id,
        {
            completed:
                true
        }
    );
}

// ======================================================================
// 7.21 — REPEAT CALCULATION
// ======================================================================

function calculateNextRepeat7(
    reminder
) {

    const repeat =
        taskSafeString7(
            reminder.repeat,
            "none"
        ).toLowerCase();

    const current =
        taskDate7(
            reminder.remindAt
        );

    if (
        !current ||
        repeat ===
            "none" ||
        repeat ===
            "false"
    ) {

        return null;
    }

    const next =
        new Date(
            current.getTime()
        );

    if (
        [
            "daily",
            "everyday",
            "günlük"
        ].includes(
            repeat
        )
    ) {

        next.setDate(
            next.getDate() +
            1
        );

        return next;
    }

    if (
        [
            "weekly",
            "haftalık",
            "haftalik"
        ].includes(
            repeat
        )
    ) {

        next.setDate(
            next.getDate() +
            7
        );

        return next;
    }

    if (
        [
            "monthly",
            "aylık",
            "aylik"
        ].includes(
            repeat
        )
    ) {

        next.setMonth(
            next.getMonth() +
            1
        );

        return next;
    }

    if (
        repeat.startsWith(
            "interval:"
        )
    ) {

        const parts =
            repeat.split(
                ":"
            );

        const amount =
            Number(
                parts[1]
            );

        const unit =
            taskSafeString7(
                parts[2],
                "minute"
            );

        if (
            !Number.isFinite(
                amount
            ) ||
            amount <=
                0
        ) {

            return null;
        }

        if (
            [
                "minute",
                "minutes",
                "dakika"
            ].includes(
                unit
            )
        ) {

            next.setMinutes(
                next.getMinutes() +
                amount
            );

            return next;
        }

        if (
            [
                "hour",
                "hours",
                "saat"
            ].includes(
                unit
            )
        ) {

            next.setHours(
                next.getHours() +
                amount
            );

            return next;
        }

        if (
            [
                "day",
                "days",
                "gün",
                "gun"
            ].includes(
                unit
            )
        ) {

            next.setDate(
                next.getDate() +
                amount
            );

            return next;
        }
    }

    return null;
}

// ======================================================================
// 7.22 — CREATE NOTIFICATION
// ======================================================================

function createNotification7(
    input = {}
) {

    const userId =
        taskUser7(
            input.userId
        );

    const notification = {

        id:
            taskId7(
                "notification"
            ),

        userId,

        type:
            taskSafeString7(
                input.type,
                "system"
            ),

        title:
            taskSafeString7(
                input.title,
                "TürkAI"
            ).slice(
                0,
                TURKAI_TASK_CONFIG_7
                    .maxTitleLength
            ),

        message:
            taskSafeString7(
                input.message ||
                input.description ||
                ""
            ).slice(
                0,
                TURKAI_TASK_CONFIG_7
                    .maxDescriptionLength
            ),

        read:
            false,

        dismissed:
            false,

        priority:
            taskSafeString7(
                input.priority,
                "normal"
            ),

        action:
            input.action || null,

        metadata:
            input.metadata &&
            typeof input.metadata ===
                "object"
                ? input.metadata
                : {},

        createdAt:
            taskNow7(),

        readAt:
            null,

        dismissedAt:
            null
    };

    TURKAI_NOTIFICATION_DB_7
        .items
        .push(
            notification
        );

    TURKAI_TASK_STATS_7
        .totalNotifications++;

    TURKAI_TASK_STATS_7
        .unreadNotifications++;

    if (
        TURKAI_NOTIFICATION_DB_7
            .items
            .length >
        TURKAI_TASK_CONFIG_7
            .maxNotificationsPerUser *
        10
    ) {

        TURKAI_NOTIFICATION_DB_7
            .items =
            TURKAI_NOTIFICATION_DB_7
                .items
                .slice(
                    -10000
                );
    }

    saveNotifications7();
    saveTaskStats7();

    if (
        TURKAI_TASK_SETTINGS_7
            .notifications
    ) {

        emitTaskEvent7(
            userId,
            "notification:new",
            notification
        );

        io.to(
            "user:" +
            userId
        ).emit(
            "notification",
            notification
        );
    }

    saveTaskHistory7(
        "notification-created",
        notification
    );

    return notification;
}

// ======================================================================
// 7.23 — MARK NOTIFICATION READ
// ======================================================================

function markNotificationRead7(
    id
) {

    const notification =
        getNotification7(
            id
        );

    if (
        !notification
    ) {

        throw new Error(
            "notification_not_found"
        );
    }

    if (
        !notification.read
    ) {

        notification.read =
            true;

        notification.readAt =
            taskNow7();

        TURKAI_TASK_STATS_7
            .unreadNotifications =
            Math.max(
                0,
                TURKAI_TASK_STATS_7
                    .unreadNotifications -
                1
            );
    }

    saveNotifications7();
    saveTaskStats7();

    emitTaskEvent7(
        notification.userId,
        "notification:read",
        notification
    );

    return notification;
}

// ======================================================================
// 7.24 — DISMISS NOTIFICATION
// ======================================================================

function dismissNotification7(
    id
) {

    const notification =
        getNotification7(
            id
        );

    if (
        !notification
    ) {

        throw new Error(
            "notification_not_found"
        );
    }

    if (
        !notification.dismissed
    ) {

        notification.dismissed =
            true;

        notification.dismissedAt =
            taskNow7();

        if (
            !notification.read
        ) {

            notification.read =
                true;

            notification.readAt =
                taskNow7();

            TURKAI_TASK_STATS_7
                .unreadNotifications =
                Math.max(
                    0,
                    TURKAI_TASK_STATS_7
                        .unreadNotifications -
                    1
                );
        }
    }

    saveNotifications7();
    saveTaskStats7();

    emitTaskEvent7(
        notification.userId,
        "notification:dismissed",
        notification
    );

    return notification;
}

// ======================================================================
// 7.25 — FIRE REMINDER
// ======================================================================

function fireReminder7(
    reminder
) {

    if (
        !reminder ||
        reminder.fired ||
        reminder.completed ||
        reminder.canceled ||
        reminder.deletedAt
    ) {

        return false;
    }

    reminder.fired =
        true;

    reminder.firedAt =
        taskNow7();

    reminder.updatedAt =
        taskNow7();

    TURKAI_TASK_STATS_7
        .firedReminders++;

    const notification =
        createNotification7({

            userId:
                reminder.userId,

            type:
                "reminder",

            title:
                reminder.title,

            message:
                reminder.description ||
                "Hatırlatma zamanı geldi.",

            priority:
                "high",

            action:
                {
                    type:
                        "reminder",

                    reminderId:
                        reminder.id
                },

            metadata:
                {
                    reminderId:
                        reminder.id
                }
        });

    emitTaskEvent7(
        reminder.userId,
        "reminder:fired",
        {
            reminder,
            notification
        }
    );

    const nextDate =
        calculateNextRepeat7(
            reminder
        );

    if (
        nextDate
    ) {

        reminder.remindAt =
            nextDate.toISOString();

        reminder.fired =
            false;

        reminder.firedAt =
            null;

        reminder.completed =
            false;

        reminder.completedAt =
            null;

        reminder.updatedAt =
            taskNow7();
    }

    saveReminders7();
    saveTaskStats7();

    saveTaskHistory7(
        "reminder-fired",
        reminder,
        {
            notificationId:
                notification.id
        }
    );

    return true;
}

// ======================================================================
// 7.26 — SCHEDULER TASK CHECK
// ======================================================================

function processDueTasks7() {

    if (
        !TURKAI_TASK_SETTINGS_7
            .scheduler
    ) {
        return {
            checked:
                false,

            dueTasks:
                0,

            firedReminders:
                0
        };
    }

    const current =
        Date.now();

    let dueTasks =
        0;

    let firedReminders =
        0;

    const allTasks =
        TURKAI_TASK_DB_7
            .items
            .filter(
                task =>
                    !task.deletedAt &&
                    !task.completed &&
                    !task.archived &&
                    task.dueAt
            );

    TURKAI_TASK_STATS_7
        .overdueTasks =
        allTasks.filter(
            task => {

                const due =
                    taskDate7(
                        task.dueAt
                    );

                return (
                    due &&
                    due.getTime() <=
                        current
                );
            }
        ).length;

    for (
        const task
        of allTasks
    ) {

        const due =
            taskDate7(
                task.dueAt
            );

        if (
            !due
        ) {
            continue;
        }

        if (
            due.getTime() <=
            current
        ) {

            dueTasks++;

            const notification =
                createNotification7({

                    userId:
                        task.userId,

                    type:
                        "task-due",

                    title:
                        "Görev zamanı geldi",

                    message:
                        task.title,

                    priority:
                        "high",

                    action:
                        {
                            type:
                                "task",

                            taskId:
                                task.id
                        },

                    metadata:
                        {
                            taskId:
                                task.id
                        }
                });

            emitTaskEvent7(
                task.userId,
                "task:due",
                {
                    task,
                    notification
                }
            );

            task.archived =
                true;

            task.updatedAt =
                taskNow7();
        }
    }

    if (
        TURKAI_TASK_SETTINGS_7
            .reminders
    ) {

        const reminders =
            TURKAI_REMINDER_DB_7
                .items
                .filter(
                    reminder =>
                        !reminder.deletedAt &&
                        !reminder.fired &&
                        !reminder.completed &&
                        !reminder.canceled
                );

        for (
            const reminder
            of reminders
        ) {

            const remindAt =
                taskDate7(
                    reminder.remindAt
                );

            if (
                !remindAt
            ) {
                continue;
            }

            if (
                remindAt.getTime() <=
                current +
                TURKAI_TASK_CONFIG_7
                    .overdueGraceMs
            ) {

                if (
                    fireReminder7(
                        reminder
                    )
                ) {

                    firedReminders++;
                }
            }
        }
    }

    TURKAI_TASK_STATS_7
        .schedulerRuns++;

    TURKAI_TASK_STATS_7
        .lastSchedulerRun =
        taskNow7();

    saveTasks7();
    saveReminders7();
    saveTaskStats7();

    return {

        checked:
            true,

        dueTasks,

        firedReminders,

        timestamp:
            taskNow7()
    };
}

// ======================================================================
// 7.27 — SCHEDULER
// ======================================================================

let TURKAI_TASK_SCHEDULER_7 =
    null;

if (
    TURKAI_TASK_CONFIG_7
        .schedulerEnabled &&
    TURKAI_TASK_SETTINGS_7
        .scheduler
) {

    TURKAI_TASK_SCHEDULER_7 =
        setInterval(
            () => {

                try {

                    processDueTasks7();

                } catch (
                    error
                ) {

                    TURKAI_TASK_STATS_7
                        .schedulerErrors++;

                    TURKAI_TASK_STATS_7
                        .lastError =
                        error.message;

                    TURKAI_TASK_STATS_7
                        .lastErrorAt =
                        taskNow7();

                    saveTaskStats7();
                }

            },
            TURKAI_TASK_CONFIG_7
                .schedulerInterval
        );
}

// ======================================================================
// 7.28 — TASK CREATE API
// ======================================================================

app.post(
    "/api/tasks",
    (
        req,
        res
    ) => {

        if (
            !TURKAI_TASK_SETTINGS_7
                .enabled
        ) {

            return res.status(
                503
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "tasks_disabled"
            });
        }

        try {

            const task =
                createTask7(
                    req.body ||
                    {}
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                task
            });

        } catch (
            error
        ) {

            runtime.errors++;

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "task_create_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 7.29 — TASK LIST API
// ======================================================================

app.get(
    "/api/tasks",
    (
        req,
        res
    ) => {

        const userId =
            taskUser7(
                req.query.userId ||
                req.headers[
                    "x-user-id"
                ]
            );

        const includeDeleted =
            taskBoolean7(
                req.query.includeDeleted
            );

        const completed =
            req.query.completed;

        let tasks =
            getUserTasks7(
                userId,
                includeDeleted
            );

        if (
            completed !==
                undefined
        ) {

            const state =
                taskBoolean7(
                    completed
                );

            tasks =
                tasks.filter(
                    task =>
                        task.completed ===
                        state
                );
        }

        return res.json({

            ok:
                true,

            success:
                true,

            count:
                tasks.length,

            tasks,

            items:
                tasks
        });
    }
);

// ======================================================================
// 7.30 — TASK DETAIL API
// ======================================================================

app.get(
    "/api/tasks/:id",
    (
        req,
        res
    ) => {

        const task =
            getTask7(
                req.params.id
            );

        if (
            !task
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "task_not_found"
            });
        }

        return res.json({

            ok:
                true,

            success:
                true,

            task
        });
    }
);

// ======================================================================
// 7.31 — TASK UPDATE API
// ======================================================================

app.patch(
    "/api/tasks/:id",
    (
        req,
        res
    ) => {

        try {

            const task =
                updateTask7(
                    req.params.id,
                    req.body ||
                    {}
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                task
            });

        } catch (
            error
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "task_update_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 7.32 — TASK COMPLETE API
// ======================================================================

app.post(
    "/api/tasks/:id/complete",
    (
        req,
        res
    ) => {

        try {

            const task =
                completeTask7(
                    req.params.id
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                task
            });

        } catch (
            error
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "task_complete_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 7.33 — TASK DELETE API
// ======================================================================

app.delete(
    "/api/tasks/:id",
    (
        req,
        res
    ) => {

        try {

            const task =
                deleteTask7(
                    req.params.id
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                deleted:
                    true,

                task
            });

        } catch (
            error
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "task_delete_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 7.34 — TASK ARCHIVE API
// ======================================================================

app.post(
    "/api/tasks/:id/archive",
    (
        req,
        res
    ) => {

        try {

            const task =
                updateTask7(
                    req.params.id,
                    {
                        archived:
                            true
                    }
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                task
            });

        } catch (
            error
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                error:
                    "task_archive_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 7.35 — REMINDER CREATE API
// ======================================================================

app.post(
    "/api/reminders",
    (
        req,
        res
    ) => {

        if (
            !TURKAI_TASK_SETTINGS_7
                .reminders
        ) {

            return res.status(
                503
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "reminders_disabled"
            });
        }

        try {

            const reminder =
                createReminder7(
                    req.body ||
                    {}
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                reminder
            });

        } catch (
            error
        ) {

            runtime.errors++;

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "reminder_create_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 7.36 — REMINDER LIST API
// ======================================================================

app.get(
    "/api/reminders",
    (
        req,
        res
    ) => {

        const userId =
            taskUser7(
                req.query.userId ||
                req.headers[
                    "x-user-id"
                ]
            );

        const reminders =
            getUserReminders7(
                userId,
                taskBoolean7(
                    req.query.includeDeleted
                )
            );

        return res.json({

            ok:
                true,

            success:
                true,

            count:
                reminders.length,

            reminders,

            items:
                reminders
        });
    }
);

// ======================================================================
// 7.37 — REMINDER DETAIL
// ======================================================================

app.get(
    "/api/reminders/:id",
    (
        req,
        res
    ) => {

        const reminder =
            getReminder7(
                req.params.id
            );

        if (
            !reminder
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "reminder_not_found"
            });
        }

        return res.json({

            ok:
                true,

            success:
                true,

            reminder
        });
    }
);

// ======================================================================
// 7.38 — REMINDER UPDATE
// ======================================================================

app.patch(
    "/api/reminders/:id",
    (
        req,
        res
    ) => {

        try {

            const reminder =
                updateReminder7(
                    req.params.id,
                    req.body ||
                    {}
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                reminder
            });

        } catch (
            error
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "reminder_update_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 7.39 — REMINDER COMPLETE
// ======================================================================

app.post(
    "/api/reminders/:id/complete",
    (
        req,
        res
    ) => {

        try {

            const reminder =
                completeReminder7(
                    req.params.id
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                reminder
            });

        } catch (
            error
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "reminder_complete_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 7.40 — REMINDER CANCEL
// ======================================================================

app.post(
    "/api/reminders/:id/cancel",
    (
        req,
        res
    ) => {

        try {

            const reminder =
                updateReminder7(
                    req.params.id,
                    {
                        canceled:
                            true
                    }
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                reminder
            });

        } catch (
            error
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                error:
                    "reminder_cancel_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 7.41 — REMINDER DELETE
// ======================================================================

app.delete(
    "/api/reminders/:id",
    (
        req,
        res
    ) => {

        try {

            const reminder =
                deleteReminder7(
                    req.params.id
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                deleted:
                    true,

                reminder
            });

        } catch (
            error
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "reminder_delete_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 7.42 — NOTIFICATION LIST
// ======================================================================

app.get(
    "/api/notifications",
    (
        req,
        res
    ) => {

        const userId =
            taskUser7(
                req.query.userId ||
                req.headers[
                    "x-user-id"
                ]
            );

        const notifications =
            getUserNotifications7(
                userId,
                {
                    unreadOnly:
                        taskBoolean7(
                            req.query.unreadOnly
                        ),

                    limit:
                        req.query.limit
                }
            );

        return res.json({

            ok:
                true,

            success:
                true,

            count:
                notifications.length,

            notifications,

            items:
                notifications,

            unread:
                notifications.filter(
                    item =>
                        !item.read
                ).length
        });
    }
);

// ======================================================================
// 7.43 — NOTIFICATION CREATE
// ======================================================================

app.post(
    "/api/notifications",
    (
        req,
        res
    ) => {

        try {

            const notification =
                createNotification7(
                    req.body ||
                    {}
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                notification
            });

        } catch (
            error
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "notification_create_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 7.44 — NOTIFICATION READ
// ======================================================================

app.post(
    "/api/notifications/:id/read",
    (
        req,
        res
    ) => {

        try {

            const notification =
                markNotificationRead7(
                    req.params.id
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                notification
            });

        } catch (
            error
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "notification_read_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 7.45 — NOTIFICATION DISMISS
// ======================================================================

app.post(
    "/api/notifications/:id/dismiss",
    (
        req,
        res
    ) => {

        try {

            const notification =
                dismissNotification7(
                    req.params.id
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                notification
            });

        } catch (
            error
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "notification_dismiss_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 7.46 — NOTIFICATION UNREAD COUNT
// ======================================================================

app.get(
    "/api/notifications/unread",
    (
        req,
        res
    ) => {

        const userId =
            taskUser7(
                req.query.userId ||
                req.headers[
                    "x-user-id"
                ]
            );

        const count =
            getUserNotifications7(
                userId,
                {
                    unreadOnly:
                        true,

                    limit:
                        500
                }
            ).length;

        return res.json({

            ok:
                true,

            success:
                true,

            count,

            unread:
                count
        });
    }
);

// ======================================================================
// 7.47 — SCHEDULER MANUAL RUN
// ======================================================================

app.post(
    "/api/scheduler/run",
    (
        req,
        res
    ) => {

        try {

            const result =
                processDueTasks7();

            return res.json({

                ok:
                    true,

                success:
                    true,

                ...result
            });

        } catch (
            error
        ) {

            TURKAI_TASK_STATS_7
                .schedulerErrors++;

            TURKAI_TASK_STATS_7
                .lastError =
                error.message;

            TURKAI_TASK_STATS_7
                .lastErrorAt =
                taskNow7();

            saveTaskStats7();

            return res.status(
                500
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "scheduler_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 7.48 — TASK STATS
// ======================================================================

app.get(
    "/api/tasks/stats",
    (
        req,
        res
    ) => {

        const userId =
            taskUser7(
                req.query.userId ||
                ""
            );

        let userStats =
            null;

        if (
            userId
        ) {

            const userTasks =
                getUserTasks7(
                    userId
                );

            const userReminders =
                getUserReminders7(
                    userId
                );

            const userNotifications =
                getUserNotifications7(
                    userId,
                    {
                        limit:
                            500
                    }
                );

            userStats = {

                tasks:
                    userTasks.length,

                completedTasks:
                    userTasks.filter(
                        item =>
                            item.completed
                    ).length,

                overdueTasks:
                    userTasks.filter(
                        item => {

                            const due =
                                taskDate7(
                                    item.dueAt
                                );

                            return (
                                due &&
                                !item.completed &&
                                due.getTime() <=
                                    Date.now()
                            );
                        }
                    ).length,

                reminders:
                    userReminders.length,

                activeReminders:
                    userReminders.filter(
                        item =>
                            !item.completed &&
                            !item.canceled &&
                            !item.fired
                    ).length,

                notifications:
                    userNotifications.length,

                unreadNotifications:
                    userNotifications.filter(
                        item =>
                            !item.read
                    ).length
            };
        }

        return res.json({

            ok:
                true,

            success:
                true,

            global:
                TURKAI_TASK_STATS_7,

            user:
                userStats,

            scheduler:
                {
                    enabled:
                        Boolean(
                            TURKAI_TASK_SCHEDULER_7
                        )
                }
        });
    }
);

// ======================================================================
// 7.49 — TASK HEALTH
// ======================================================================

app.get(
    "/api/tasks/health",
    (
        req,
        res
    ) => {

        const checks = {

            engine:
                true,

            taskDB:
                Boolean(
                    TURKAI_TASK_DB_7 &&
                    Array.isArray(
                        TURKAI_TASK_DB_7.items
                    )
                ),

            reminderDB:
                Boolean(
                    TURKAI_REMINDER_DB_7 &&
                    Array.isArray(
                        TURKAI_REMINDER_DB_7.items
                    )
                ),

            notificationDB:
                Boolean(
                    TURKAI_NOTIFICATION_DB_7 &&
                    Array.isArray(
                        TURKAI_NOTIFICATION_DB_7.items
                    )
                ),

            directories:
                fs.existsSync(
                    TURKAI_TASK_DIR_7
                ),

            scheduler:
                Boolean(
                    TURKAI_TASK_SCHEDULER_7
                )
        };

        const healthy =
            checks.engine &&
            checks.taskDB &&
            checks.reminderDB &&
            checks.notificationDB &&
            checks.directories;

        return res.status(
            healthy
                ? 200
                : 503
        ).json({

            ok:
                healthy,

            success:
                healthy,

            healthy,

            checks,

            stats:
                TURKAI_TASK_STATS_7,

            timestamp:
                taskNow7()
        });
    }
);

// ======================================================================
// 7.50 — TASK SEARCH
// ======================================================================

app.get(
    "/api/tasks/search",
    (
        req,
        res
    ) => {

        const userId =
            taskUser7(
                req.query.userId ||
                "guest"
            );

        const query =
            taskSafeString7(
                req.query.q ||
                req.query.query
            ).toLocaleLowerCase(
                "tr-TR"
            );

        if (
            !query
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                error:
                    "query_required"
            });
        }

        const results =
            getUserTasks7(
                userId
            ).filter(
                task =>
                    (
                        task.title ||
                        ""
                    )
                        .toLocaleLowerCase(
                            "tr-TR"
                        )
                        .includes(
                            query
                        ) ||
                    (
                        task.description ||
                        ""
                    )
                        .toLocaleLowerCase(
                            "tr-TR"
                        )
                        .includes(
                            query
                        ) ||
                    (
                        task.category ||
                        ""
                    )
                        .toLocaleLowerCase(
                            "tr-TR"
                        )
                        .includes(
                            query
                        )
            );

        return res.json({

            ok:
                true,

            success:
                true,

            count:
                results.length,

            tasks:
                results
        });
    }
);

// ======================================================================
// 7.51 — REMINDER SEARCH
// ======================================================================

app.get(
    "/api/reminders/search",
    (
        req,
        res
    ) => {

        const userId =
            taskUser7(
                req.query.userId ||
                "guest"
            );

        const query =
            taskSafeString7(
                req.query.q ||
                req.query.query
            ).toLocaleLowerCase(
                "tr-TR"
            );

        if (
            !query
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                error:
                    "query_required"
            });
        }

        const results =
            getUserReminders7(
                userId
            ).filter(
                reminder =>
                    (
                        reminder.title ||
                        ""
                    )
                        .toLocaleLowerCase(
                            "tr-TR"
                        )
                        .includes(
                            query
                        ) ||
                    (
                        reminder.description ||
                        ""
                    )
                        .toLocaleLowerCase(
                            "tr-TR"
                        )
                        .includes(
                            query
                        )
            );

        return res.json({

            ok:
                true,

            success:
                true,

            count:
                results.length,

            reminders:
                results
        });
    }
);

// ======================================================================
// 7.52 — BULK COMPLETE
// ======================================================================

app.post(
    "/api/tasks/bulk/complete",
    (
        req,
        res
    ) => {

        const userId =
            taskUser7(
                req.body &&
                req.body.userId ||
                "guest"
            );

        const ids =
            Array.isArray(
                req.body &&
                req.body.ids
            )
                ? req.body.ids
                : [];

        const completed =
            [];

        for (
            const id
            of ids
        ) {

            const task =
                getTask7(
                    id
                );

            if (
                !task ||
                task.userId !==
                userId
            ) {
                continue;
            }

            try {

                completed.push(
                    completeTask7(
                        id
                    )
                );

            } catch {
                // ignore
            }
        }

        return res.json({

            ok:
                true,

            success:
                true,

            count:
                completed.length,

            tasks:
                completed
        });
    }
);

// ======================================================================
// 7.53 — BULK DELETE
// ======================================================================

app.post(
    "/api/tasks/bulk/delete",
    (
        req,
        res
    ) => {

        const userId =
            taskUser7(
                req.body &&
                req.body.userId ||
                "guest"
            );

        const ids =
            Array.isArray(
                req.body &&
                req.body.ids
            )
                ? req.body.ids
                : [];

        const deleted =
            [];

        for (
            const id
            of ids
        ) {

            const task =
                getTask7(
                    id
                );

            if (
                !task ||
                task.userId !==
                userId
            ) {
                continue;
            }

            try {

                deleted.push(
                    deleteTask7(
                        id
                    )
                );

            } catch {
                // ignore
            }
        }

        return res.json({

            ok:
                true,

            success:
                true,

            count:
                deleted.length,

            tasks:
                deleted
        });
    }
);

// ======================================================================
// 7.54 — TODAY TASKS
// ======================================================================

app.get(
    "/api/tasks/today",
    (
        req,
        res
    ) => {

        const userId =
            taskUser7(
                req.query.userId ||
                "guest"
            );

        const nowDate =
            new Date();

        const year =
            nowDate.getFullYear();

        const month =
            nowDate.getMonth();

        const day =
            nowDate.getDate();

        const tasks =
            getUserTasks7(
                userId
            ).filter(
                task => {

                    if (
                        !task.dueAt
                    ) {
                        return false;
                    }

                    const date =
                        taskDate7(
                            task.dueAt
                        );

                    if (
                        !date
                    ) {
                        return false;
                    }

                    return (
                        date.getFullYear() ===
                            year &&
                        date.getMonth() ===
                            month &&
                        date.getDate() ===
                            day
                    );
                }
            );

        return res.json({

            ok:
                true,

            success:
                true,

            count:
                tasks.length,

            tasks
        });
    }
);

// ======================================================================
// 7.55 — OVERDUE TASKS
// ======================================================================

app.get(
    "/api/tasks/overdue",
    (
        req,
        res
    ) => {

        const userId =
            taskUser7(
                req.query.userId ||
                "guest"
            );

        const nowMs =
            Date.now();

        const tasks =
            getUserTasks7(
                userId
            ).filter(
                task => {

                    if (
                        task.completed ||
                        !task.dueAt
                    ) {
                        return false;
                    }

                    const due =
                        taskDate7(
                            task.dueAt
                        );

                    return (
                        due &&
                        due.getTime() <
                            nowMs
                    );
                }
            );

        return res.json({

            ok:
                true,

            success:
                true,

            count:
                tasks.length,

            tasks
        });
    }
);

// ======================================================================
// 7.56 — UPCOMING REMINDERS
// ======================================================================

app.get(
    "/api/reminders/upcoming",
    (
        req,
        res
    ) => {

        const userId =
            taskUser7(
                req.query.userId ||
                "guest"
            );

        const hours =
            Math.max(
                1,
                Math.min(
                    24 * 30,
                    Number(
                        req.query.hours
                    ) ||
                    24
                )
            );

        const nowMs =
            Date.now();

        const endMs =
            nowMs +
            hours *
            60 *
            60 *
            1000;

        const reminders =
            getUserReminders7(
                userId
            ).filter(
                reminder => {

                    if (
                        reminder.completed ||
                        reminder.canceled ||
                        reminder.fired
                    ) {
                        return false;
                    }

                    const date =
                        taskDate7(
                            reminder.remindAt
                        );

                    if (
                        !date
                    ) {
                        return false;
                    }

                    const timestamp =
                        date.getTime();

                    return (
                        timestamp >=
                            nowMs &&
                        timestamp <=
                            endMs
                    );
                }
            );

        return res.json({

            ok:
                true,

            success:
                true,

            count:
                reminders.length,

            reminders
        });
    }
);

// ======================================================================
// 7.57 — NOTIFICATION CLEAR READ
// ======================================================================

app.delete(
    "/api/notifications/read",
    (
        req,
        res
    ) => {

        const userId =
            taskUser7(
                req.query.userId ||
                req.body &&
                req.body.userId ||
                "guest"
            );

        let removed =
            0;

        for (
            const notification
            of TURKAI_NOTIFICATION_DB_7
                .items
        ) {

            if (
                notification.userId ===
                    userId &&
                notification.read
            ) {

                notification.dismissed =
                    true;

                notification.dismissedAt =
                    notification
                        .dismissedAt ||
                    taskNow7();

                removed++;
            }
        }

        if (
            removed
        ) {

            saveNotifications7();
        }

        return res.json({

            ok:
                true,

            success:
                true,

            removed
        });
    }
);

// ======================================================================
// 7.58 — CREATE QUICK REMINDER
// ======================================================================

app.post(
    "/api/reminder",
    (
        req,
        res
    ) => {

        try {

            const body =
                req.body ||
                {};

            const reminder =
                createReminder7(
                    {
                        ...body,

                        userId:
                            body.userId ||
                            "guest"
                    }
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                reminder
            });

        } catch (
            error
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    error.message
            });
        }
    }
);

// ======================================================================
// 7.59 — QUICK TASK
// ======================================================================

app.post(
    "/api/task",
    (
        req,
        res
    ) => {

        try {

            const task =
                createTask7(
                    {
                        ...(req.body ||
                        {}),

                        userId:
                            req.body &&
                            req.body.userId ||
                            "guest"
                    }
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                task
            });

        } catch (
            error
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    error.message
            });
        }
    }
);

// ======================================================================
// 7.60 — SCHEDULER STATUS
// ======================================================================

app.get(
    "/api/scheduler/status",
    (
        req,
        res
    ) => {

        return res.json({

            ok:
                true,

            success:
                true,

            enabled:
                Boolean(
                    TURKAI_TASK_SCHEDULER_7
                ),

            settings:
                TURKAI_TASK_SETTINGS_7,

            interval:
                TURKAI_TASK_CONFIG_7
                    .schedulerInterval,

            lastRun:
                TURKAI_TASK_STATS_7
                    .lastSchedulerRun
        });
    }
);

// ======================================================================
// 7.61 — TASK HISTORY LIST
// ======================================================================

app.get(
    "/api/tasks/history",
    (
        req,
        res
    ) => {

        let files =
            [];

        try {

            files =
                fs
                    .readdirSync(
                        TURKAI_TASK_HISTORY_DIR_7
                    )
                    .filter(
                        name =>
                            name.endsWith(
                                ".json"
                            )
                    )
                    .sort()
                    .reverse()
                    .slice(
                        0,
                        TURKAI_TASK_CONFIG_7
                            .historyLimit
                    );

        } catch {

            files =
                [];
        }

        return res.json({

            ok:
                true,

            success:
                true,

            count:
                files.length,

            files
        });
    }
);

// ======================================================================
// 7.62 — TASK HISTORY ITEM
// ======================================================================

app.get(
    "/api/tasks/history/:id",
    (
        req,
        res
    ) => {

        const file =
            path.join(
                TURKAI_TASK_HISTORY_DIR_7,
                `${taskSafeString7(req.params.id)}.json`
            );

        const data =
            readJSON(
                file,
                null
            );

        if (
            !data
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "history_not_found"
            });
        }

        return res.json({

            ok:
                true,

            success:
                true,

            ...data
        });
    }
);

// ======================================================================
// 7.63 — TASK AI COMMAND DETECTION
// ======================================================================

function detectTaskCommand7(
    message
) {

    const text =
        taskSafeString7(
            message
        )
            .toLocaleLowerCase(
                "tr-TR"
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();

    const reminder =
        [
            "hatırlat",
            "hatirlat",
            "hatırlatıcı",
            "hatirlatici",
            "beni uyar",
            "bana hatırlat"
        ].some(
            keyword =>
                text.includes(
                    keyword
                )
        );

    const task =
        [
            "görev ekle",
            "gorev ekle",
            "görev oluştur",
            "gorev olustur",
            "iş ekle",
            "yapılacak ekle",
            "yapilacak ekle"
        ].some(
            keyword =>
                text.includes(
                    keyword
                )
        );

    return {

        reminder,

        task,

        detected:
            reminder ||
            task
    };
}

// ======================================================================
// 7.64 — TASK COMMAND CONTEXT
// ======================================================================

function buildTaskAIContext7(
    userId
) {

    const tasks =
        getUserTasks7(
            userId
        )
        .slice(
            0,
            20
        );

    const reminders =
        getUserReminders7(
            userId
        )
        .slice(
            0,
            20
        );

    return [

        "AKTİF GÖREVLER:",

        tasks.length
            ? tasks
                .map(
                    item =>
                        `- ${item.title} | tamamlandı: ${item.completed} | tarih: ${item.dueAt || "yok"}`
                )
                .join(
                    "\n"
                )
            : "Görev yok.",

        "",

        "AKTİF HATIRLATMALAR:",

        reminders.length
            ? reminders
                .map(
                    item =>
                        `- ${item.title} | tarih: ${item.remindAt} | tekrar: ${item.repeat}`
                )
                .join(
                    "\n"
                )
            : "Hatırlatma yok."

    ].join(
        "\n"
    );
}

// ======================================================================
// 7.65 — TASK API CONTEXT
// ======================================================================

app.get(
    "/api/tasks/context/:userId",
    (
        req,
        res
    ) => {

        const context =
            buildTaskAIContext7(
                req.params.userId
            );

        return res.json({

            ok:
                true,

            success:
                true,

            context
        });
    }
);

// ======================================================================
// 7.66 — TASK RESET
// ======================================================================

app.post(
    "/api/tasks/reset",
    (
        req,
        res
    ) => {

        const userId =
            taskUser7(
                req.body &&
                req.body.userId
            );

        const adminKey =
            taskSafeString7(
                req.body &&
                req.body.adminKey
            );

        const expected =
            taskSafeString7(
                process.env.TURKAI_ADMIN_KEY
            );

        const isAdminRequest =
            expected &&
            adminKey ===
                expected;

        if (
            !isAdminRequest &&
            userId ===
                "guest"
        ) {

            return res.status(
                403
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "authorization_required"
            });
        }

        TURKAI_TASK_DB_7.items =
            TURKAI_TASK_DB_7
                .items
                .filter(
                    item =>
                        isAdminRequest
                            ? true
                            : item.userId !==
                              userId
                );

        TURKAI_REMINDER_DB_7.items =
            TURKAI_REMINDER_DB_7
                .items
                .filter(
                    item =>
                        isAdminRequest
                            ? true
                            : item.userId !==
                              userId
                );

        TURKAI_NOTIFICATION_DB_7.items =
            TURKAI_NOTIFICATION_DB_7
                .items
                .filter(
                    item =>
                        isAdminRequest
                            ? true
                            : item.userId !==
                              userId
                );

        saveTasks7();
        saveReminders7();
        saveNotifications7();

        return res.json({

            ok:
                true,

            success:
                true,

            reset:
                true
        });
    }
);

// ======================================================================
// 7.67 — CLEAN OLD NOTIFICATIONS
// ======================================================================

function cleanupNotifications7() {

    const maxAge =
        30 *
        24 *
        60 *
        60 *
        1000;

    const cutoff =
        Date.now() -
        maxAge;

    let removed =
        0;

    const next =
        [];

    for (
        const notification
        of TURKAI_NOTIFICATION_DB_7
            .items
    ) {

        const created =
            new Date(
                notification.createdAt
            ).getTime();

        if (
            notification.dismissed &&
            Number.isFinite(
                created
            ) &&
            created <
                cutoff
        ) {

            removed++;

            continue;
        }

        next.push(
            notification
        );
    }

    if (
        removed
    ) {

        TURKAI_NOTIFICATION_DB_7.items =
            next;

        TURKAI_TASK_STATS_7
            .unreadNotifications =
            TURKAI_NOTIFICATION_DB_7
                .items
                .filter(
                    item =>
                        !item.read
                )
                .length;

        saveNotifications7();
        saveTaskStats7();
    }

    return removed;
}

// ======================================================================
// 7.68 — CLEAN TASK HISTORY
// ======================================================================

function cleanupTaskHistory7() {

    let removed =
        0;

    try {

        const files =
            fs
                .readdirSync(
                    TURKAI_TASK_HISTORY_DIR_7
                )
                .filter(
                    file =>
                        file.endsWith(
                            ".json"
                        )
                )
                .sort();

        const excess =
            Math.max(
                0,
                files.length -
                TURKAI_TASK_CONFIG_7
                    .historyLimit
            );

        for (
            const file
            of files.slice(
                0,
                excess
            )
        ) {

            try {

                fs.unlinkSync(
                    path.join(
                        TURKAI_TASK_HISTORY_DIR_7,
                        file
                    )
                );

                removed++;

            } catch {
                // ignore
            }
        }

    } catch {
        // ignore
    }

    return removed;
}

// ======================================================================
// 7.69 — PERIODIC CLEANUP
// ======================================================================

setInterval(
    () => {

        try {

            cleanupNotifications7();

            cleanupTaskHistory7();

        } catch (
            error
        ) {

            TURKAI_TASK_STATS_7
                .lastError =
                error.message;

            TURKAI_TASK_STATS_7
                .lastErrorAt =
                taskNow7();

            saveTaskStats7();
        }

    },
    20 * 60 * 1000
);

// ======================================================================
// 7.70 — STATE BRIDGE
// ======================================================================

serverState.tasks =
    serverState.tasks ||
    {};

serverState.tasks.ready =
    true;

serverState.tasks.config =
    TURKAI_TASK_CONFIG_7;

serverState.tasks.settings =
    TURKAI_TASK_SETTINGS_7;

serverState.tasks.stats =
    TURKAI_TASK_STATS_7;

serverState.tasks.list =
    getUserTasks7;

serverState.tasks.create =
    createTask7;

serverState.tasks.update =
    updateTask7;

serverState.tasks.delete =
    deleteTask7;

serverState.tasks.complete =
    completeTask7;

serverState.tasks.reminders =
    getUserReminders7;

serverState.tasks.createReminder =
    createReminder7;

serverState.tasks.updateReminder =
    updateReminder7;

serverState.tasks.deleteReminder =
    deleteReminder7;

serverState.tasks.notifications =
    getUserNotifications7;

serverState.tasks.createNotification =
    createNotification7;

serverState.tasks.scheduler =
    processDueTasks7;

serverState.tasks.context =
    buildTaskAIContext7;

// ======================================================================
// 7.71 — GLOBAL BRIDGE
// ======================================================================

global.turkAI =
    global.turkAI ||
    {};

global.turkAI.tasks =
    global.turkAI.tasks ||
    {};

global.turkAI.tasks.create =
    createTask7;

global.turkAI.tasks.update =
    updateTask7;

global.turkAI.tasks.delete =
    deleteTask7;

global.turkAI.tasks.complete =
    completeTask7;

global.turkAI.tasks.reminder =
    createReminder7;

global.turkAI.tasks.notification =
    createNotification7;

global.turkAI.tasks.scheduler =
    processDueTasks7;

global.turkAI.tasks.context =
    buildTaskAIContext7;

// ======================================================================
// 7.72 — PERSISTENCE REPAIR
// ======================================================================

saveTasks7();
saveReminders7();
saveNotifications7();
saveTaskSettings7();
saveTaskStats7();

// ======================================================================
// 7.73 — COUNTER REBUILD
// ======================================================================

TURKAI_TASK_STATS_7
    .totalTasks =
    TURKAI_TASK_DB_7
        .items
        .filter(
            item =>
                !item.deletedAt
        )
        .length;

TURKAI_TASK_STATS_7
    .totalReminders =
    TURKAI_REMINDER_DB_7
        .items
        .filter(
            item =>
                !item.deletedAt
        )
        .length;

TURKAI_TASK_STATS_7
    .totalNotifications =
    TURKAI_NOTIFICATION_DB_7
        .items
        .length;

TURKAI_TASK_STATS_7
    .completedTasks =
    TURKAI_TASK_DB_7
        .items
        .filter(
            item =>
                item.completed
        )
        .length;

TURKAI_TASK_STATS_7
    .completedReminders =
    TURKAI_REMINDER_DB_7
        .items
        .filter(
            item =>
                item.completed
        )
        .length;

TURKAI_TASK_STATS_7
    .unreadNotifications =
    TURKAI_NOTIFICATION_DB_7
        .items
        .filter(
            item =>
                !item.read
        )
        .length;

saveTaskStats7();

// ======================================================================
// 7.74 — STARTUP LOG
// ======================================================================

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

console.log(
    "TürkAI Master Server — PART 7/10"
);

console.log(
    "Task Engine:",
    TURKAI_TASK_SETTINGS_7
        .enabled
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Reminders:",
    TURKAI_TASK_SETTINGS_7
        .reminders
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Scheduler:",
    TURKAI_TASK_SCHEDULER_7
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Notifications:",
    TURKAI_TASK_SETTINGS_7
        .notifications
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Tasks:",
    TURKAI_TASK_STATS_7
        .totalTasks
);

console.log(
    "Reminders:",
    TURKAI_TASK_STATS_7
        .totalReminders
);

console.log(
    "Notifications:",
    TURKAI_TASK_STATS_7
        .totalNotifications
);

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

/*
========================================================================
 PART 7 END

 SONRA:
 PART 8 / 10
 AUTH + SECURITY + PLANS + USAGE + ACCOUNT ENGINE
========================================================================
*/
/*
========================================================================
 TÜRKAI MASTER SERVER 50.0
 PART 8 / 10
 AUTH + SECURITY + PLANS + USAGE + ACCOUNT ENGINE
========================================================================
*/

"use strict";

// ======================================================================
// 8.0 — AUTH SYSTEM CONFIG
// ======================================================================

const TURKAI_AUTH_CONFIG_8 = {

    enabled:
        true,

    guestAccounts:
        true,

    sessionEnabled:
        true,

    securityEnabled:
        true,

    rateLimitEnabled:
        true,

    usageEnabled:
        true,

    plansEnabled:
        true,

    accountEnabled:
        true,

    maxSessionsPerUser:
        10,

    sessionTTL:
        30 * 24 * 60 * 60 * 1000,

    rateLimitWindow:
        60 * 1000,

    rateLimitMax:
        120,

    maxUserNameLength:
        100,

    maxEmailLength:
        250,

    maxProviderIdLength:
        250,

    maxPlanLength:
        50
};

// ======================================================================
// 8.1 — AUTH DIRECTORIES
// ======================================================================

const TURKAI_AUTH_DIR_8 =
    path.join(
        DATA_DIR,
        "auth"
    );

const TURKAI_SESSION_DIR_8 =
    path.join(
        TURKAI_AUTH_DIR_8,
        "sessions"
    );

const TURKAI_SECURITY_DIR_8 =
    path.join(
        TURKAI_AUTH_DIR_8,
        "security"
    );

const TURKAI_AUTH_HISTORY_DIR_8 =
    path.join(
        TURKAI_AUTH_DIR_8,
        "history"
    );

const TURKAI_AUTH_USERS_FILE_8 =
    path.join(
        TURKAI_AUTH_DIR_8,
        "users.json"
    );

const TURKAI_AUTH_SESSIONS_FILE_8 =
    path.join(
        TURKAI_AUTH_DIR_8,
        "sessions.json"
    );

const TURKAI_AUTH_USAGE_FILE_8 =
    path.join(
        TURKAI_AUTH_DIR_8,
        "usage.json"
    );

const TURKAI_AUTH_EVENTS_FILE_8 =
    path.join(
        TURKAI_AUTH_DIR_8,
        "events.jsonl"
    );

const TURKAI_AUTH_SETTINGS_FILE_8 =
    path.join(
        TURKAI_AUTH_DIR_8,
        "settings.json"
    );

const TURKAI_AUTH_STATS_FILE_8 =
    path.join(
        TURKAI_AUTH_DIR_8,
        "stats.json"
    );

[
    TURKAI_AUTH_DIR_8,
    TURKAI_SESSION_DIR_8,
    TURKAI_SECURITY_DIR_8,
    TURKAI_AUTH_HISTORY_DIR_8
].forEach(
    ensureDir
);

// ======================================================================
// 8.2 — AUTH SETTINGS
// ======================================================================

let TURKAI_AUTH_SETTINGS_8 =
    readJSON(
        TURKAI_AUTH_SETTINGS_FILE_8,
        {
            enabled:
                true,

            sessions:
                true,

            security:
                true,

            rateLimit:
                true,

            usage:
                true,

            plans:
                true,

            guests:
                true
        }
    );

if (
    !TURKAI_AUTH_SETTINGS_8 ||
    typeof TURKAI_AUTH_SETTINGS_8 !==
        "object"
) {

    TURKAI_AUTH_SETTINGS_8 = {
        enabled:
            true,

        sessions:
            true,

        security:
            true,

        rateLimit:
            true,

        usage:
            true,

        plans:
            true,

        guests:
            true
    };
}

writeJSON(
    TURKAI_AUTH_SETTINGS_FILE_8,
    TURKAI_AUTH_SETTINGS_8
);

// ======================================================================
// 8.3 — AUTH STATS
// ======================================================================

let TURKAI_AUTH_STATS_8 =
    readJSON(
        TURKAI_AUTH_STATS_FILE_8,
        {
            version:
                "8.0",

            loginRequests:
                0,

            successfulLogins:
                0,

            failedLogins:
                0,

            guestLogins:
                0,

            sessionsCreated:
                0,

            sessionsRevoked:
                0,

            activeSessions:
                0,

            accountRequests:
                0,

            usageChecks:
                0,

            usageBlocks:
                0,

            planChanges:
                0,

            securityEvents:
                0,

            rateLimitBlocks:
                0,

            lastLoginAt:
                null,

            lastFailedLoginAt:
                null,

            lastSecurityEventAt:
                null,

            lastError:
                null,

            lastErrorAt:
                null
        }
    );

if (
    !TURKAI_AUTH_STATS_8 ||
    typeof TURKAI_AUTH_STATS_8 !==
        "object"
) {

    TURKAI_AUTH_STATS_8 = {

        version:
            "8.0",

        loginRequests:
            0,

        successfulLogins:
            0,

        failedLogins:
            0,

        guestLogins:
            0,

        sessionsCreated:
            0,

        sessionsRevoked:
            0,

        activeSessions:
            0,

        accountRequests:
            0,

        usageChecks:
            0,

        usageBlocks:
            0,

        planChanges:
            0,

        securityEvents:
            0,

        rateLimitBlocks:
            0,

        lastLoginAt:
            null,

        lastFailedLoginAt:
            null,

        lastSecurityEventAt:
            null,

        lastError:
            null,

        lastErrorAt:
            null
    };
}

// ======================================================================
// 8.4 — AUTH DATABASES
// ======================================================================

let TURKAI_AUTH_USERS_8 =
    readJSON(
        TURKAI_AUTH_USERS_FILE_8,
        {
            version:
                "8.0",

            items:
                []
        }
    );

let TURKAI_AUTH_SESSIONS_8 =
    readJSON(
        TURKAI_AUTH_SESSIONS_FILE_8,
        {
            version:
                "8.0",

            items:
                []
        }
    );

let TURKAI_AUTH_USAGE_8 =
    readJSON(
        TURKAI_AUTH_USAGE_FILE_8,
        {
            version:
                "8.0",

            items:
                []
        }
    );

if (
    !TURKAI_AUTH_USERS_8 ||
    !Array.isArray(
        TURKAI_AUTH_USERS_8.items
    )
) {

    TURKAI_AUTH_USERS_8 = {

        version:
            "8.0",

        items:
            []
    };
}

if (
    !TURKAI_AUTH_SESSIONS_8 ||
    !Array.isArray(
        TURKAI_AUTH_SESSIONS_8.items
    )
) {

    TURKAI_AUTH_SESSIONS_8 = {

        version:
            "8.0",

        items:
            []
    };
}

if (
    !TURKAI_AUTH_USAGE_8 ||
    !Array.isArray(
        TURKAI_AUTH_USAGE_8.items
    )
) {

    TURKAI_AUTH_USAGE_8 = {

        version:
            "8.0",

        items:
            []
    };
}

// ======================================================================
// 8.5 — COMMON HELPERS
// ======================================================================

function authSafeString8(
    value,
    fallback = ""
) {

    if (
        value ===
            null ||
        value ===
            undefined
    ) {
        return fallback;
    }

    return String(
        value
    ).trim();
}

function authNormalize8(
    value
) {

    return authSafeString8(
        value
    )
        .toLocaleLowerCase(
            "tr-TR"
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function authNow8() {

    return new Date()
        .toISOString();
}

function authId8(
    prefix =
        "auth"
) {

    return (
        prefix +
        "_" +
        Date.now().toString(
            36
        ) +
        "_" +
        crypto
            .randomBytes(
                8
            )
            .toString(
                "hex"
            )
    );
}

function authToken8() {

    return crypto
        .randomBytes(
            32
        )
        .toString(
            "hex"
        );
}

function authHash8(
    value
) {

    return crypto
        .createHash(
            "sha256"
        )
        .update(
            authSafeString8(
                value
            ),
            "utf8"
        )
        .digest(
            "hex"
        );
}

function authMonth8() {

    const date =
        new Date();

    return (
        date.getUTCFullYear() +
        "-" +
        String(
            date.getUTCMonth() +
            1
        ).padStart(
            2,
            "0"
        )
    );
}

// ======================================================================
// 8.6 — DATABASE SAVE
// ======================================================================

function saveAuthUsers8() {

    return writeJSON(
        TURKAI_AUTH_USERS_FILE_8,
        TURKAI_AUTH_USERS_8
    );
}

function saveAuthSessions8() {

    return writeJSON(
        TURKAI_AUTH_SESSIONS_FILE_8,
        TURKAI_AUTH_SESSIONS_8
    );
}

function saveAuthUsage8() {

    return writeJSON(
        TURKAI_AUTH_USAGE_FILE_8,
        TURKAI_AUTH_USAGE_8
    );
}

function saveAuthStats8() {

    return writeJSON(
        TURKAI_AUTH_STATS_FILE_8,
        TURKAI_AUTH_STATS_8
    );
}

// ======================================================================
// 8.7 — PLAN DEFINITIONS
// ======================================================================

const TURKAI_PLANS_8 = {

    free: {

        id:
            "free",

        name:
            "Free",

        price:
            0,

        monthlyRequests:
            Number(
                LIMITS.free
            ) || 50,

        imageGeneration:
            false,

        dailyImages:
            0,

        videoGeneration:
            false,

        research:
            true,

        memory:
            true,

        fileUpload:
            true,

        coding:
            true,

        advancedModels:
            false,

        priority:
            false
    },

    pro: {

        id:
            "pro",

        name:
            "Pro",

        price:
            Number(
                PRICES.pro
            ) || 250,

        monthlyRequests:
            Number(
                LIMITS.pro
            ) || 100,

        imageGeneration:
            true,

        dailyImages:
            2,

        videoGeneration:
            false,

        research:
            true,

        memory:
            true,

        fileUpload:
            true,

        coding:
            true,

        advancedModels:
            true,

        priority:
            true
    },

    plus: {

        id:
            "plus",

        name:
            "Plus",

        price:
            Number(
                PRICES.plus
            ) || 500,

        monthlyRequests:
            Number(
                LIMITS.plus
            ) || 200,

        imageGeneration:
            true,

        dailyImages:
            4,

        videoGeneration:
            true,

        research:
            true,

        memory:
            true,

        fileUpload:
            true,

        coding:
            true,

        advancedModels:
            true,

        priority:
            true
    },

    ultra: {

        id:
            "ultra",

        name:
            "Ultra",

        price:
            Number(
                PRICES.ultra
            ) || 1000,

        monthlyRequests:
            Number(
                LIMITS.ultra
            ) || 1000,

        imageGeneration:
            true,

        dailyImages:
            10,

        videoGeneration:
            true,

        research:
            true,

        memory:
            true,

        fileUpload:
            true,

        coding:
            true,

        advancedModels:
            true,

        priority:
            true
    },

    developer: {

        id:
            "developer",

        name:
            "Developer",

        price:
            0,

        monthlyRequests:
            Number(
                LIMITS.developer
            ) || 4000,

        imageGeneration:
            true,

        dailyImages:
            100,

        videoGeneration:
            true,

        research:
            true,

        memory:
            true,

        fileUpload:
            true,

        coding:
            true,

        advancedModels:
            true,

        priority:
            true
    }
};

// ======================================================================
// 8.8 — USER LOOKUP
// ======================================================================

function findAuthUser8(
    userId
) {

    const id =
        authSafeString8(
            userId
        );

    return TURKAI_AUTH_USERS_8
        .items
        .find(
            user =>
                user.id ===
                id
        );
}

function findAuthUserByEmail8(
    email
) {

    const normalized =
        authNormalize8(
            email
        );

    if (
        !normalized
    ) {
        return null;
    }

    return TURKAI_AUTH_USERS_8
        .items
        .find(
            user =>
                authNormalize8(
                    user.email
                ) ===
                normalized
        );
}

function findAuthUserByProvider8(
    provider,
    providerId
) {

    const p =
        authNormalize8(
            provider
        );

    const pid =
        authSafeString8(
            providerId
        );

    return TURKAI_AUTH_USERS_8
        .items
        .find(
            user =>
                authNormalize8(
                    user.provider
                ) ===
                    p &&
                user.providerId ===
                    pid
        );
}

// ======================================================================
// 8.9 — USER CREATION
// ======================================================================

function createAuthUser8(
    input = {}
) {

    let id =
        authSafeString8(
            input.userId
        );

    if (
        !id
    ) {

        id =
            authId8(
                "user"
            );
    }

    while (
        findAuthUser8(
            id
        )
    ) {

        id =
            authId8(
                "user"
            );
    }

    const planCandidate =
        authNormalize8(
            input.plan ||
            "free"
        );

    const plan =
        TURKAI_PLANS_8[
            planCandidate
        ]
            ? planCandidate
            : "free";

    const user = {

        id,

        name:
            authSafeString8(
                input.name ||
                "Guest"
            ).slice(
                0,
                TURKAI_AUTH_CONFIG_8
                    .maxUserNameLength
            ),

        email:
            authSafeString8(
                input.email ||
                null
            ).slice(
                0,
                TURKAI_AUTH_CONFIG_8
                    .maxEmailLength
            ) ||
            null,

        provider:
            authSafeString8(
                input.provider ||
                "guest"
            ),

        providerId:
            authSafeString8(
                input.providerId ||
                null
            ).slice(
                0,
                TURKAI_AUTH_CONFIG_8
                    .maxProviderIdLength
            ) ||
            null,

        plan,

        verified:
            Boolean(
                input.verified
            ),

        active:
            true,

        banned:
            false,

        createdAt:
            authNow8(),

        updatedAt:
            authNow8(),

        lastSeenAt:
            authNow8(),

        metadata:
            input.metadata &&
            typeof input.metadata ===
                "object"
                ? input.metadata
                : {}
    };

    TURKAI_AUTH_USERS_8
        .items
        .push(
            user
        );

    saveAuthUsers8();

    return user;
}

// ======================================================================
// 8.10 — GET OR CREATE USER
// ======================================================================

function getOrCreateAuthUser8(
    input = {}
) {

    let user =
        null;

    if (
        input.userId
    ) {

        user =
            findAuthUser8(
                input.userId
            );
    }

    if (
        !user &&
        input.email
    ) {

        user =
            findAuthUserByEmail8(
                input.email
            );
    }

    if (
        !user &&
        input.provider &&
        input.providerId
    ) {

        user =
            findAuthUserByProvider8(
                input.provider,
                input.providerId
            );
    }

    if (
        !user
    ) {

        user =
            createAuthUser8(
                input
            );

    } else {

        if (
            input.name
        ) {

            user.name =
                authSafeString8(
                    input.name
                ).slice(
                    0,
                    TURKAI_AUTH_CONFIG_8
                        .maxUserNameLength
                );
        }

        if (
            input.email
        ) {

            user.email =
                authSafeString8(
                    input.email
                ).slice(
                    0,
                    TURKAI_AUTH_CONFIG_8
                        .maxEmailLength
                );
        }

        if (
            input.provider
        ) {

            user.provider =
                authSafeString8(
                    input.provider
                );
        }

        if (
            input.providerId
        ) {

            user.providerId =
                authSafeString8(
                    input.providerId
                );
        }

        user.lastSeenAt =
            authNow8();

        user.updatedAt =
            authNow8();

        saveAuthUsers8();
    }

    return user;
}

// ======================================================================
// 8.11 — SAFE USER OBJECT
// ======================================================================

function publicAuthUser8(
    user
) {

    if (
        !user
    ) {
        return null;
    }

    const plan =
        TURKAI_PLANS_8[
            user.plan
        ] ||
        TURKAI_PLANS_8.free;

    return {

        id:
            user.id,

        name:
            user.name,

        email:
            user.email,

        provider:
            user.provider,

        providerId:
            user.providerId,

        plan:
            user.plan,

        planInfo:
            plan,

        verified:
            Boolean(
                user.verified
            ),

        active:
            Boolean(
                user.active
            ),

        banned:
            Boolean(
                user.banned
            ),

        createdAt:
            user.createdAt,

        updatedAt:
            user.updatedAt,

        lastSeenAt:
            user.lastSeenAt
    };
}

// ======================================================================
// 8.12 — SESSION LOOKUP
// ======================================================================

function findSession8(
    sessionId
) {

    return TURKAI_AUTH_SESSIONS_8
        .items
        .find(
            session =>
                session.id ===
                sessionId
        );
}

function findSessionByToken8(
    token
) {

    const hash =
        authHash8(
            token
        );

    return TURKAI_AUTH_SESSIONS_8
        .items
        .find(
            session =>
                session.tokenHash ===
                hash
        );
}

// ======================================================================
// 8.13 — SESSION CREATE
// ======================================================================

function createSession8(
    user,
    options = {}
) {

    if (
        !user
    ) {

        throw new Error(
            "user_required"
        );
    }

    if (
        TURKAI_AUTH_SETTINGS_8
            .sessions ===
        false
    ) {

        throw new Error(
            "sessions_disabled"
        );
    }

    const existing =
        TURKAI_AUTH_SESSIONS_8
            .items
            .filter(
                session =>
                    session.userId ===
                        user.id &&
                    !session.revokedAt &&
                    new Date(
                        session.expiresAt
                    ).getTime() >
                        Date.now()
            );

    if (
        existing.length >=
        TURKAI_AUTH_CONFIG_8
            .maxSessionsPerUser
    ) {

        existing
            .sort(
                (
                    a,
                    b
                ) =>
                    String(
                        a.createdAt
                    ).localeCompare(
                        String(
                            b.createdAt
                        )
                    )
            )
            .slice(
                0,
                existing.length -
                    TURKAI_AUTH_CONFIG_8
                        .maxSessionsPerUser +
                    1
            )
            .forEach(
                session => {

                    session.revokedAt =
                        authNow8();
                }
            );
    }

    const token =
        authToken8();

    const createdAt =
        new Date();

    const expiresAt =
        new Date(
            createdAt.getTime() +
            (
                Number.isFinite(
                    options.ttl
                )
                    ? options.ttl
                    : TURKAI_AUTH_CONFIG_8
                        .sessionTTL
            )
        );

    const session = {

        id:
            authId8(
                "session"
            ),

        userId:
            user.id,

        tokenHash:
            authHash8(
                token
            ),

        createdAt:
            createdAt.toISOString(),

        expiresAt:
            expiresAt.toISOString(),

        revokedAt:
            null,

        lastUsedAt:
            createdAt.toISOString(),

        device:
            authSafeString8(
                options.device ||
                ""
            ).slice(
                0,
                300
            ),

        userAgent:
            authSafeString8(
                options.userAgent ||
                ""
            ).slice(
                0,
                500
            ),

        ip:
            authSafeString8(
                options.ip ||
                ""
            ).slice(
                0,
                100
            ),

        metadata:
            options.metadata &&
            typeof options.metadata ===
                "object"
                ? options.metadata
                : {}
    };

    TURKAI_AUTH_SESSIONS_8
        .items
        .push(
            session
        );

    TURKAI_AUTH_STATS_8
        .sessionsCreated++;

    saveAuthSessions8();
    saveAuthStats8();

    return {

        session,

        token
    };
}

// ======================================================================
// 8.14 — SESSION VALIDATION
// ======================================================================

function validateSession8(
    token
) {

    const raw =
        authSafeString8(
            token
        );

    if (
        !raw
    ) {
        return {
            valid:
                false,

            reason:
                "token_required"
        };
    }

    const session =
        findSessionByToken8(
            raw
        );

    if (
        !session
    ) {

        return {
            valid:
                false,

            reason:
                "session_not_found"
        };
    }

    if (
        session.revokedAt
    ) {

        return {
            valid:
                false,

            reason:
                "session_revoked"
        };
    }

    const expiration =
        new Date(
            session.expiresAt
        ).getTime();

    if (
        !Number.isFinite(
            expiration
        ) ||
        expiration <=
            Date.now()
    ) {

        session.revokedAt =
            authNow8();

        saveAuthSessions8();

        return {
            valid:
                false,

            reason:
                "session_expired"
        };
    }

    const user =
        findAuthUser8(
            session.userId
        );

    if (
        !user
    ) {

        return {
            valid:
                false,

            reason:
                "user_not_found"
        };
    }

    if (
        user.banned ||
        !user.active
    ) {

        return {
            valid:
                false,

            reason:
                "account_disabled"
        };
    }

    session.lastUsedAt =
        authNow8();

    saveAuthSessions8();

    return {

        valid:
            true,

        session,

        user
    };
}

// ======================================================================
// 8.15 — REQUEST TOKEN EXTRACTION
// ======================================================================

function getRequestToken8(
    req
) {

    const authorization =
        authSafeString8(
            req.headers[
                "authorization"
            ]
        );

    if (
        authorization
            .toLowerCase()
            .startsWith(
                "bearer "
            )
    ) {

        return authorization
            .slice(
                7
            )
            .trim();
    }

    const headerToken =
        authSafeString8(
            req.headers[
                "x-session-token"
            ]
        );

    if (
        headerToken
    ) {
        return headerToken;
    }

    const queryToken =
        authSafeString8(
            req.query &&
            req.query.token
        );

    if (
        queryToken
    ) {
        return queryToken;
    }

    const bodyToken =
        authSafeString8(
            req.body &&
            req.body.token
        );

    if (
        bodyToken
    ) {
        return bodyToken;
    }

    return "";
}

// ======================================================================
// 8.16 — AUTH MIDDLEWARE
// ======================================================================

function optionalAuth8(
    req,
    res,
    next
) {

    const token =
        getRequestToken8(
            req
        );

    if (
        !token
    ) {

        req.auth =
            null;

        return next();
    }

    const result =
        validateSession8(
            token
        );

    if (
        result.valid
    ) {

        req.auth =
            result;

        req.user =
            result.user;

        return next();
    }

    req.auth =
        null;

    return next();
}

function requireAuth8(
    req,
    res,
    next
) {

    const token =
        getRequestToken8(
            req
        );

    if (
        !token
    ) {

        return res.status(
            401
        ).json({

            ok:
                false,

            success:
                false,

            error:
                "authentication_required"
        });
    }

    const result =
        validateSession8(
            token
        );

    if (
        !result.valid
    ) {

        return res.status(
            401
        ).json({

            ok:
                false,

            success:
                false,

            error:
                "invalid_session",

            reason:
                result.reason
        });
    }

    req.auth =
        result;

    req.user =
        result.user;

    return next();
}

// ======================================================================
// 8.17 — SECURITY EVENT
// ======================================================================

function logSecurityEvent8(
    type,
    input = {}
) {

    const event = {

        id:
            authId8(
                "security"
            ),

        type,

        userId:
            input.userId ||
            null,

        ip:
            input.ip ||
            null,

        userAgent:
            input.userAgent ||
            null,

        details:
            input.details ||
            {},

        timestamp:
            authNow8()
    };

    appendJSONLine(
        TURKAI_AUTH_EVENTS_FILE_8,
        event
    );

    TURKAI_AUTH_STATS_8
        .securityEvents++;

    TURKAI_AUTH_STATS_8
        .lastSecurityEventAt =
        event.timestamp;

    writeJSON(
        path.join(
            TURKAI_SECURITY_DIR_8,
            `${event.id}.json`
        ),
        event
    );

    saveAuthStats8();

    return event;
}

// ======================================================================
// 8.18 — RATE LIMIT MEMORY
// ======================================================================

const TURKAI_RATE_LIMITS_8 =
    new Map();

function getRateLimitKey8(
    req
) {

    const user =
        req.user &&
        req.user.id
            ? req.user.id
            : "";

    const ip =
        authSafeString8(
            req.ip ||
            req.headers[
                "x-forwarded-for"
            ] ||
            "unknown"
        );

    return (
        user ||
        ip
    );
}

function checkRateLimit8(
    req
) {

    if (
        !TURKAI_AUTH_SETTINGS_8
            .rateLimit
    ) {

        return {
            allowed:
                true,

            remaining:
                Infinity
        };
    }

    const key =
        getRateLimitKey8(
            req
        );

    const nowMs =
        Date.now();

    let entry =
        TURKAI_RATE_LIMITS_8.get(
            key
        );

    if (
        !entry ||
        nowMs -
            entry.startedAt >=
            TURKAI_AUTH_CONFIG_8
                .rateLimitWindow
    ) {

        entry = {

            startedAt:
                nowMs,

            count:
                0
        };

        TURKAI_RATE_LIMITS_8.set(
            key,
            entry
        );
    }

    entry.count++;

    const limit =
        TURKAI_AUTH_CONFIG_8
            .rateLimitMax;

    const remaining =
        Math.max(
            0,
            limit -
                entry.count
        );

    if (
        entry.count >
        limit
    ) {

        TURKAI_AUTH_STATS_8
            .rateLimitBlocks++;

        logSecurityEvent8(
            "rate-limit",
            {
                userId:
                    req.user &&
                    req.user.id
                        ? req.user.id
                        : null,

                ip:
                    req.ip ||
                    null,

                userAgent:
                    req.headers[
                        "user-agent"
                    ] ||
                    null,

                details:
                    {
                        key,
                        limit
                    }
            }
        );

        return {
            allowed:
                false,

            remaining:
                0,

            limit,

            retryAfter:
                Math.ceil(
                    (
                        TURKAI_AUTH_CONFIG_8
                            .rateLimitWindow -
                        (
                            nowMs -
                            entry.startedAt
                        )
                    ) /
                    1000
                )
        };
    }

    return {
        allowed:
            true,

        remaining,

        limit
    };
}

// ======================================================================
// 8.19 — GLOBAL RATE LIMIT MIDDLEWARE
// ======================================================================

app.use(
    (
        req,
        res,
        next
    ) => {

        if (
            req.path.startsWith(
                "/api/"
            )
        ) {

            const rate =
                checkRateLimit8(
                    req
                );

            res.setHeader(
                "X-RateLimit-Limit",
                String(
                    rate.limit ??
                    ""
                )
            );

            res.setHeader(
                "X-RateLimit-Remaining",
                String(
                    Number.isFinite(
                        rate.remaining
                    )
                        ? rate.remaining
                        : ""
                )
            );

            if (
                !rate.allowed
            ) {

                if (
                    rate.retryAfter
                ) {

                    res.setHeader(
                        "Retry-After",
                        String(
                            rate.retryAfter
                        )
                    );
                }

                return res.status(
                    429
                ).json({

                    ok:
                        false,

                    success:
                        false,

                    error:
                        "rate_limit_exceeded",

                    retryAfter:
                        rate.retryAfter ||
                        null
                });
            }
        }

        next();
    }
);

// ======================================================================
// 8.20 — ACCOUNT USAGE
// ======================================================================

function getAccountUsage8(
    userId,
    month =
        authMonth8()
) {

    const uid =
        authSafeString8(
            userId,
            "guest"
        );

    let entry =
        TURKAI_AUTH_USAGE_8
            .items
            .find(
                item =>
                    item.userId ===
                        uid &&
                    item.month ===
                        month
            );

    if (
        !entry
    ) {

        entry = {

            id:
                authId8(
                    "usage"
                ),

            userId:
                uid,

            month,

            chatRequests:
                0,

            researchRequests:
                0,

            imageRequests:
                0,

            videoRequests:
                0,

            fileUploads:
                0,

            codingRequests:
                0,

            totalRequests:
                0,

            createdAt:
                authNow8(),

            updatedAt:
                authNow8()
        };

        TURKAI_AUTH_USAGE_8
            .items
            .push(
                entry
            );

        saveAuthUsage8();
    }

    return entry;
}

// ======================================================================
// 8.21 — USAGE LIMIT
// ======================================================================

function getUserPlan8(
    userId
) {

    const user =
        findAuthUser8(
            userId
        );

    if (
        !user
    ) {
        return TURKAI_PLANS_8.free;
    }

    return (
        TURKAI_PLANS_8[
            user.plan
        ] ||
        TURKAI_PLANS_8.free
    );
}

function getUsageLimit8(
    userId
) {

    const plan =
        getUserPlan8(
            userId
        );

    return {

        planId:
            plan.id,

        planName:
            plan.name,

        limit:
            Number(
                plan.monthlyRequests
            ) || 0
    };
}

// ======================================================================
// 8.22 — USAGE CHECK
// ======================================================================

function checkUsage8(
    userId,
    type =
        "chat"
) {

    TURKAI_AUTH_STATS_8
        .usageChecks++;

    const uid =
        authSafeString8(
            userId,
            "guest"
        );

    const usage =
        getAccountUsage8(
            uid
        );

    const plan =
        getUserPlan8(
            uid
        );

    const limit =
        Number(
            plan.monthlyRequests
        ) || 0;

    const total =
        Number(
            usage.totalRequests
        ) || 0;

    const allowed =
        total <
        limit;

    if (
        !allowed
    ) {

        TURKAI_AUTH_STATS_8
            .usageBlocks++;

        return {

            allowed:
                false,

            reason:
                "monthly_limit",

            type,

            used:
                total,

            limit,

            remaining:
                0,

            plan:
                plan.id
        };
    }

    return {

        allowed:
            true,

        reason:
            null,

        type,

        used:
            total,

        limit,

        remaining:
            Math.max(
                0,
                limit -
                    total
            ),

        plan:
            plan.id
    };
}

// ======================================================================
// 8.23 — USAGE INCREMENT
// ======================================================================

function incrementUsage8(
    userId,
    type =
        "chat"
) {

    const uid =
        authSafeString8(
            userId,
            "guest"
        );

    const usage =
        getAccountUsage8(
            uid
        );

    const key =
        (
            type +
            "Requests"
        );

    if (
        typeof usage[
            key
        ] !==
        "number"
    ) {

        usage[
            key
        ] = 0;
    }

    usage[
        key
    ]++;

    usage.totalRequests++;

    usage.updatedAt =
        authNow8();

    saveAuthUsage8();

    return usage;
}

// ======================================================================
// 8.24 — IMAGE DAILY USAGE
// ======================================================================

function getDailyUsage8(
    userId,
    date =
        new Date()
) {

    const day =
        date.toISOString()
            .slice(
                0,
                10
            );

    const usage =
        getAccountUsage8(
            userId
        );

    if (
        !usage.daily ||
        typeof usage.daily !==
            "object"
    ) {

        usage.daily =
            {};
    }

    if (
        !usage.daily[
            day
        ]
    ) {

        usage.daily[
            day
        ] = {

            imageRequests:
                0,

            videoRequests:
                0
        };
    }

    return usage.daily[
        day
    ];
}

function canGenerateImage8(
    userId
) {

    const plan =
        getUserPlan8(
            userId
        );

    const daily =
        getDailyUsage8(
            userId
        );

    const limit =
        Number(
            plan.dailyImages
        ) || 0;

    const used =
        Number(
            daily.imageRequests
        ) || 0;

    return {

        allowed:
            limit >
                used,

        used,

        limit,

        remaining:
            Math.max(
                0,
                limit -
                    used
            ),

        plan:
            plan.id
    };
}

function registerImageUsage8(
    userId
) {

    const usage =
        getAccountUsage8(
            userId
        );

    const daily =
        getDailyUsage8(
            userId
        );

    daily.imageRequests++;

    usage.imageRequests++;

    usage.updatedAt =
        authNow8();

    saveAuthUsage8();

    return daily;
}

// ======================================================================
// 8.25 — VIDEO USAGE
// ======================================================================

function canGenerateVideo8(
    userId
) {

    const plan =
        getUserPlan8(
            userId
        );

    if (
        !plan.videoGeneration
    ) {

        return {

            allowed:
                false,

            reason:
                "video_not_available",

            plan:
                plan.id
        };
    }

    return {

        allowed:
            true,

        reason:
            null,

        plan:
            plan.id
    };
}

function registerVideoUsage8(
    userId
) {

    const usage =
        getAccountUsage8(
            userId
        );

    const daily =
        getDailyUsage8(
            userId
        );

    daily.videoRequests++;

    usage.videoRequests++;

    usage.updatedAt =
        authNow8();

    saveAuthUsage8();

    return daily;
}

// ======================================================================
// 8.26 — USER SESSION REVOKE
// ======================================================================

function revokeSession8(
    sessionId
) {

    const session =
        findSession8(
            sessionId
        );

    if (
        !session
    ) {
        return false;
    }

    if (
        session.revokedAt
    ) {
        return false;
    }

    session.revokedAt =
        authNow8();

    TURKAI_AUTH_STATS_8
        .sessionsRevoked++;

    saveAuthSessions8();
    saveAuthStats8();

    return true;
}

// ======================================================================
// 8.27 — REVOKE USER SESSIONS
// ======================================================================

function revokeUserSessions8(
    userId,
    exceptSessionId =
        null
) {

    let count =
        0;

    for (
        const session
        of TURKAI_AUTH_SESSIONS_8
            .items
    ) {

        if (
            session.userId !==
                userId ||
            session.id ===
                exceptSessionId ||
            session.revokedAt
        ) {
            continue;
        }

        session.revokedAt =
            authNow8();

        count++;
    }

    if (
        count
    ) {

        TURKAI_AUTH_STATS_8
            .sessionsRevoked +=
            count;

        saveAuthSessions8();
        saveAuthStats8();
    }

    return count;
}

// ======================================================================
// 8.28 — LOGIN ENGINE
// ======================================================================

function loginAccount8(
    input = {}
) {

    TURKAI_AUTH_STATS_8
        .loginRequests++;

    const provider =
        authNormalize8(
            input.provider ||
            "guest"
        );

    const providerId =
        authSafeString8(
            input.providerId ||
            input.googleId ||
            ""
        );

    const email =
        authSafeString8(
            input.email ||
            ""
        );

    const name =
        authSafeString8(
            input.name ||
            "Guest"
        );

    const isGuest =
        provider ===
            "guest" ||
        !providerId &&
        !email;

    if (
        isGuest &&
        !TURKAI_AUTH_SETTINGS_8
            .guests
    ) {

        TURKAI_AUTH_STATS_8
            .failedLogins++;

        throw new Error(
            "guest_login_disabled"
        );
    }

    const user =
        getOrCreateAuthUser8({

            userId:
                input.userId,

            name,

            email:

                email ||
                null,

            provider,

            providerId:
                providerId ||
                null,

            verified:
                Boolean(
                    input.verified
                ),

            plan:
                input.plan ||
                "free"
        });

    if (
        user.banned ||
        !user.active
    ) {

        TURKAI_AUTH_STATS_8
            .failedLogins++;

        logSecurityEvent8(
            "blocked-login",
            {
                userId:
                    user.id,

                ip:
                    input.ip ||
                    null,

                userAgent:
                    input.userAgent ||
                    null,

                details:
                    {
                        provider
                    }
            }
        );

        throw new Error(
            "account_disabled"
        );
    }

    const session =
        createSession8(
            user,
            {
                device:
                    input.device,

                userAgent:
                    input.userAgent,

                ip:
                    input.ip,

                metadata:
                    input.metadata
            }
        );

    if (
        isGuest
    ) {

        TURKAI_AUTH_STATS_8
            .guestLogins++;
    }

    TURKAI_AUTH_STATS_8
        .successfulLogins++;

    TURKAI_AUTH_STATS_8
        .lastLoginAt =
        authNow8();

    saveAuthStats8();

    logSecurityEvent8(
        "login",
        {
            userId:
                user.id,

            ip:
                input.ip ||
                null,

            userAgent:
                input.userAgent ||
                null,

            details:
                {
                    provider
                }
        }
    );

    return {

        user:
            publicAuthUser8(
                user
            ),

        session: {

            id:
                session.session.id,

            expiresAt:
                session.session.expiresAt,

            createdAt:
                session.session.createdAt
        },

        token:
            session.token
    };
}

// ======================================================================
// 8.29 — LOGIN API
// ======================================================================

app.post(
    "/api/auth/login",
    (
        req,
        res
    ) => {

        try {

            const body =
                req.body ||
                {};

            const result =
                loginAccount8(
                    {
                        ...body,

                        ip:
                            req.ip,

                        userAgent:
                            req.headers[
                                "user-agent"
                            ] ||
                            ""
                    }
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                ...result
            });

        } catch (
            error
        ) {

            TURKAI_AUTH_STATS_8
                .lastFailedLoginAt =
                authNow8();

            saveAuthStats8();

            return res.status(
                401
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "login_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 8.30 — GUEST LOGIN API
// ======================================================================

app.post(
    "/api/auth/guest",
    (
        req,
        res
    ) => {

        try {

            const result =
                loginAccount8(
                    {
                        provider:
                            "guest",

                        name:
                            req.body &&
                            req.body.name ||
                            "Guest",

                        ip:
                            req.ip,

                        userAgent:
                            req.headers[
                                "user-agent"
                            ] ||
                            ""
                    }
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                ...result
            });

        } catch (
            error
        ) {

            return res.status(
                401
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "guest_login_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 8.31 — SESSION CHECK API
// ======================================================================

app.get(
    "/api/auth/session",
    (
        req,
        res
    ) => {

        const token =
            getRequestToken8(
                req
            );

        const result =
            validateSession8(
                token
            );

        if (
            !result.valid
        ) {

            return res.status(
                401
            ).json({

                ok:
                    false,

                success:
                    false,

                authenticated:
                    false,

                error:
                    "invalid_session",

                reason:
                    result.reason
            });
        }

        return res.json({

            ok:
                true,

            success:
                true,

            authenticated:
                true,

            user:
                publicAuthUser8(
                    result.user
                ),

            session: {

                id:
                    result.session.id,

                createdAt:
                    result.session.createdAt,

                expiresAt:
                    result.session.expiresAt,

                lastUsedAt:
                    result.session.lastUsedAt
            }
        });
    }
);

// ======================================================================
// 8.32 — LOGOUT API
// ======================================================================

app.post(
    "/api/auth/logout",
    (
        req,
        res
    ) => {

        const token =
            getRequestToken8(
                req
            );

        const session =
            findSessionByToken8(
                token
            );

        if (
            session
        ) {

            revokeSession8(
                session.id
            );

            logSecurityEvent8(
                "logout",
                {
                    userId:
                        session.userId,

                    ip:
                        req.ip,

                    userAgent:
                        req.headers[
                            "user-agent"
                        ] ||
                        null
                }
            );
        }

        return res.json({

            ok:
                true,

            success:
                true,

            loggedOut:
                true
        });
    }
);

// ======================================================================
// 8.33 — LOGOUT ALL
// ======================================================================

app.post(
    "/api/auth/logout-all",
    requireAuth8,
    (
        req,
        res
    ) => {

        const count =
            revokeUserSessions8(
                req.user.id
            );

        return res.json({

            ok:
                true,

            success:
                true,

            revoked:
                count
        });
    }
);

// ======================================================================
// 8.34 — CURRENT ACCOUNT
// ======================================================================

app.get(
    "/api/account",
    optionalAuth8,
    (
        req,
        res
    ) => {

        TURKAI_AUTH_STATS_8
            .accountRequests++;

        let user =
            req.user;

        if (
            !user
        ) {

            const guestId =
                authSafeString8(
                    req.query.userId
                );

            if (
                guestId
            ) {

                user =
                    findAuthUser8(
                        guestId
                    );
            }
        }

        if (
            !user
        ) {

            user =
                getOrCreateAuthUser8(
                    {
                        userId:
                            "guest",

                        name:
                            "Guest",

                        provider:
                            "guest"
                    }
                );
        }

        const usage =
            getAccountUsage8(
                user.id
            );

        const plan =
            getUserPlan8(
                user.id
            );

        return res.json({

            ok:
                true,

            success:
                true,

            user:
                publicAuthUser8(
                    user
                ),

            usage,

            plan,

            limits: {

                monthly:
                    plan.monthlyRequests,

                remaining:
                    Math.max(
                        0,
                        plan.monthlyRequests -
                        usage.totalRequests
                    ),

                imageDaily:
                    plan.dailyImages,

                video:
                    plan.videoGeneration
            }
        });
    }
);

// ======================================================================
// 8.35 — ACCOUNT UPDATE
// ======================================================================

app.patch(
    "/api/account",
    requireAuth8,
    (
        req,
        res
    ) => {

        const user =
            req.user;

        const body =
            req.body ||
            {};

        if (
            body.name !==
            undefined
        ) {

            user.name =
                authSafeString8(
                    body.name
                ).slice(
                    0,
                    TURKAI_AUTH_CONFIG_8
                        .maxUserNameLength
                );
        }

        if (
            body.metadata &&
            typeof body.metadata ===
                "object"
        ) {

            user.metadata = {

                ...(user.metadata ||
                {}),

                ...body.metadata
            };
        }

        user.updatedAt =
            authNow8();

        user.lastSeenAt =
            authNow8();

        saveAuthUsers8();

        return res.json({

            ok:
                true,

            success:
                true,

            user:
                publicAuthUser8(
                    user
                )
        });
    }
);

// ======================================================================
// 8.36 — USAGE API
// ======================================================================

app.get(
    "/api/usage",
    optionalAuth8,
    (
        req,
        res
    ) => {

        const userId =
            req.user &&
            req.user.id
                ? req.user.id
                : authSafeString8(
                    req.query.userId,
                    "guest"
                );

        TURKAI_AUTH_STATS_8
            .usageChecks++;

        const usage =
            getAccountUsage8(
                userId
            );

        const plan =
            getUserPlan8(
                userId
            );

        return res.json({

            ok:
                true,

            success:
                true,

            userId,

            month:
                usage.month,

            usage,

            plan,

            remaining:
                Math.max(
                    0,
                    plan.monthlyRequests -
                    usage.totalRequests
                )
        });
    }
);

// ======================================================================
// 8.37 — USAGE CHECK API
// ======================================================================

app.get(
    "/api/usage/check",
    optionalAuth8,
    (
        req,
        res
    ) => {

        const userId =
            req.user &&
            req.user.id
                ? req.user.id
                : authSafeString8(
                    req.query.userId,
                    "guest"
                );

        const type =
            authSafeString8(
                req.query.type,
                "chat"
            );

        return res.json({

            ok:
                true,

            success:
                true,

            ...checkUsage8(
                userId,
                type
            )
        });
    }
);

// ======================================================================
// 8.38 — USAGE INCREMENT API
// ======================================================================

app.post(
    "/api/usage/increment",
    optionalAuth8,
    (
        req,
        res
    ) => {

        const userId =
            req.user &&
            req.user.id
                ? req.user.id
                : authSafeString8(
                    req.body &&
                    req.body.userId,
                    "guest"
                );

        const type =
            authSafeString8(
                req.body &&
                req.body.type,
                "chat"
            );

        const state =
            checkUsage8(
                userId,
                type
            );

        if (
            !state.allowed
        ) {

            return res.status(
                429
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "usage_limit_reached",

                ...state
            });
        }

        const usage =
            incrementUsage8(
                userId,
                type
            );

        return res.json({

            ok:
                true,

            success:
                true,

            usage,

            state:
                checkUsage8(
                    userId,
                    type
                )
        });
    }
);

// ======================================================================
// 8.39 — IMAGE LIMIT API
// ======================================================================

app.get(
    "/api/usage/image",
    optionalAuth8,
    (
        req,
        res
    ) => {

        const userId =
            req.user &&
            req.user.id
                ? req.user.id
                : authSafeString8(
                    req.query.userId,
                    "guest"
                );

        return res.json({

            ok:
                true,

            success:
                true,

            ...canGenerateImage8(
                userId
            )
        });
    }
);

// ======================================================================
// 8.40 — IMAGE REGISTER API
// ======================================================================

app.post(
    "/api/usage/image",
    optionalAuth8,
    (
        req,
        res
    ) => {

        const userId =
            req.user &&
            req.user.id
                ? req.user.id
                : authSafeString8(
                    req.body &&
                    req.body.userId,
                    "guest"
                );

        const state =
            canGenerateImage8(
                userId
            );

        if (
            !state.allowed
        ) {

            return res.status(
                429
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    state.limit ===
                    0
                        ? "image_not_available"
                        : "daily_image_limit_reached",

                ...state
            });
        }

        const usage =
            registerImageUsage8(
                userId
            );

        return res.json({

            ok:
                true,

            success:
                true,

            usage
        });
    }
);

// ======================================================================
// 8.41 — VIDEO LIMIT API
// ======================================================================

app.get(
    "/api/usage/video",
    optionalAuth8,
    (
        req,
        res
    ) => {

        const userId =
            req.user &&
            req.user.id
                ? req.user.id
                : authSafeString8(
                    req.query.userId,
                    "guest"
                );

        return res.json({

            ok:
                true,

            success:
                true,

            ...canGenerateVideo8(
                userId
            )
        });
    }
);

// ======================================================================
// 8.42 — VIDEO REGISTER API
// ======================================================================

app.post(
    "/api/usage/video",
    optionalAuth8,
    (
        req,
        res
    ) => {

        const userId =
            req.user &&
            req.user.id
                ? req.user.id
                : authSafeString8(
                    req.body &&
                    req.body.userId,
                    "guest"
                );

        const state =
            canGenerateVideo8(
                userId
            );

        if (
            !state.allowed
        ) {

            return res.status(
                403
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "video_not_available",

                ...state
            });
        }

        const usage =
            registerVideoUsage8(
                userId
            );

        return res.json({

            ok:
                true,

            success:
                true,

            usage
        });
    }
);

// ======================================================================
// 8.43 — PLANS API
// ======================================================================

app.get(
    "/api/plans",
    (
        req,
        res
    ) => {

        return res.json({

            ok:
                true,

            success:
                true,

            plans:
                TURKAI_PLANS_8
        });
    }
);

// ======================================================================
// 8.44 — SINGLE PLAN API
// ======================================================================

app.get(
    "/api/plans/:id",
    (
        req,
        res
    ) => {

        const id =
            authNormalize8(
                req.params.id
            );

        const plan =
            TURKAI_PLANS_8[
                id
            ];

        if (
            !plan
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "plan_not_found"
            });
        }

        return res.json({

            ok:
                true,

            success:
                true,

            plan
        });
    }
);

// ======================================================================
// 8.45 — PLAN CHANGE
// ======================================================================

function changeUserPlan8(
    userId,
    planId,
    options = {}
) {

    const user =
        findAuthUser8(
            userId
        );

    if (
        !user
    ) {

        throw new Error(
            "user_not_found"
        );
    }

    const plan =
        TURKAI_PLANS_8[
            authNormalize8(
                planId
            )
        ];

    if (
        !plan
    ) {

        throw new Error(
            "plan_not_found"
        );
    }

    const previous =
        user.plan;

    user.plan =
        plan.id;

    user.updatedAt =
        authNow8();

    saveAuthUsers8();

    TURKAI_AUTH_STATS_8
        .planChanges++;

    saveAuthStats8();

    logSecurityEvent8(
        "plan-change",
        {

            userId:
                user.id,

            ip:
                options.ip ||
                null,

            userAgent:
                options.userAgent ||
                null,

            details: {

                previous,

                next:
                    plan.id
            }
        }
    );

    return {

        user:
            publicAuthUser8(
                user
            ),

        previousPlan:
            previous,

        plan
    };
}

// ======================================================================
// 8.46 — PLAN CHANGE API
// ======================================================================

app.post(
    "/api/account/plan",
    requireAuth8,
    (
        req,
        res
    ) => {

        const requested =
            authNormalize8(
                req.body &&
                req.body.plan
            );

        if (
            !requested
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "plan_required"
            });
        }

        /*
         Bu endpoint demo/development amaçlı
         plan state değiştirir.
         Gerçek ödeme doğrulaması ayrıca yapılmalıdır.
        */

        if (
            requested !==
                "free" &&
            requested !==
                "developer"
        ) {

            const paymentMode =
                authNormalize8(
                    req.body &&
                    req.body.paymentMode
                );

            if (
                paymentMode !==
                    "test"
            ) {

                return res.status(
                    402
                ).json({

                    ok:
                        false,

                    success:
                        false,

                    error:
                        "payment_verification_required",

                    message:
                        "Ücretli plan değişimi gerçek ödeme doğrulamasıyla yapılmalıdır."
                });
            }
        }

        try {

            const result =
                changeUserPlan8(
                    req.user.id,
                    requested,
                    {
                        ip:
                            req.ip,

                        userAgent:
                            req.headers[
                                "user-agent"
                            ] ||
                            null
                    }
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                ...result
            });

        } catch (
            error
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "plan_change_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 8.47 — PRO CODE ACTIVATION
// ======================================================================

app.post(
    "/api/pro/activate",
    (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const code =
            authSafeString8(
                body.code
            );

        const expected =
            authSafeString8(
                process.env.TURKAI_PRO_CODE
            );

        if (
            !expected ||
            code !==
                expected
        ) {

            logSecurityEvent8(
                "invalid-pro-code",
                {
                    ip:
                        req.ip,

                    userAgent:
                        req.headers[
                            "user-agent"
                        ] ||
                        null,

                    details:
                        {
                            attempted:
                                true
                        }
                }
            );

            return res.status(
                403
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "invalid_code"
            });
        }

        let userId =
            authSafeString8(
                body.userId
            );

        const token =
            getRequestToken8(
                req
            );

        if (
            !userId &&
            token
        ) {

            const auth =
                validateSession8(
                    token
                );

            if (
                auth.valid
            ) {

                userId =
                    auth.user.id;
            }
        }

        if (
            !userId
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "userId_required"
            });
        }

        let user =
            findAuthUser8(
                userId
            );

        if (
            !user
        ) {

            user =
                getOrCreateAuthUser8(
                    {
                        userId,

                        name:
                            body.name ||
                            "Guest",

                        provider:
                            "guest",

                        plan:
                            "free"
                    }
                );
        }

        const result =
            changeUserPlan8(
                user.id,
                "pro",
                {
                    ip:
                        req.ip,

                    userAgent:
                        req.headers[
                            "user-agent"
                        ] ||
                        null
                }
            );

        return res.json({

            ok:
                true,

            success:
                true,

            activated:
                true,

            ...result
        });
    }
);

// ======================================================================
// 8.48 — SESSION LIST
// ======================================================================

app.get(
    "/api/auth/sessions",
    requireAuth8,
    (
        req,
        res
    ) => {

        const sessions =
            TURKAI_AUTH_SESSIONS_8
                .items
                .filter(
                    session =>
                        session.userId ===
                        req.user.id
                )
                .filter(
                    session =>
                        !session.revokedAt
                )
                .map(
                    session => ({

                        id:
                            session.id,

                        createdAt:
                            session.createdAt,

                        expiresAt:
                            session.expiresAt,

                        lastUsedAt:
                            session.lastUsedAt,

                        device:
                            session.device,

                        userAgent:
                            session.userAgent
                    })
                );

        return res.json({

            ok:
                true,

            success:
                true,

            count:
                sessions.length,

            sessions
        });
    }
);

// ======================================================================
// 8.49 — SESSION REVOKE
// ======================================================================

app.delete(
    "/api/auth/sessions/:id",
    requireAuth8,
    (
        req,
        res
    ) => {

        const session =
            findSession8(
                req.params.id
            );

        if (
            !session ||
            session.userId !==
            req.user.id
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "session_not_found"
            });
        }

        const revoked =
            revokeSession8(
                session.id
            );

        return res.json({

            ok:
                true,

            success:
                true,

            revoked
        });
    }
);

// ======================================================================
// 8.50 — SECURITY EVENTS
// ======================================================================

app.get(
    "/api/security/events",
    requireAuth8,
    (
        req,
        res
    ) => {

        const events =
            readJSONLines(
                TURKAI_AUTH_EVENTS_FILE_8,
                500
            )
            .filter(
                event =>
                    event.userId ===
                    req.user.id
            )
            .reverse();

        return res.json({

            ok:
                true,

            success:
                true,

            count:
                events.length,

            events
        });
    }
);

// ======================================================================
// 8.51 — AUTH HEALTH
// ======================================================================

app.get(
    "/api/auth/health",
    (
        req,
        res
    ) => {

        const checks = {

            engine:
                true,

            usersDB:
                Boolean(
                    TURKAI_AUTH_USERS_8 &&
                    Array.isArray(
                        TURKAI_AUTH_USERS_8
                            .items
                    )
                ),

            sessionsDB:
                Boolean(
                    TURKAI_AUTH_SESSIONS_8 &&
                    Array.isArray(
                        TURKAI_AUTH_SESSIONS_8
                            .items
                    )
                ),

            usageDB:
                Boolean(
                    TURKAI_AUTH_USAGE_8 &&
                    Array.isArray(
                        TURKAI_AUTH_USAGE_8
                            .items
                    )
                ),

            authDirectory:
                fs.existsSync(
                    TURKAI_AUTH_DIR_8
                ),

            sessionDirectory:
                fs.existsSync(
                    TURKAI_SESSION_DIR_8
                )
        };

        const healthy =
            Object.values(
                checks
            ).every(
                Boolean
            );

        return res.status(
            healthy
                ? 200
                : 503
        ).json({

            ok:
                healthy,

            success:
                healthy,

            healthy,

            checks,

            timestamp:
                authNow8()
        });
    }
);

// ======================================================================
// 8.52 — AUTH STATS
// ======================================================================

app.get(
    "/api/auth/stats",
    (
        req,
        res
    ) => {

        const activeSessions =
            TURKAI_AUTH_SESSIONS_8
                .items
                .filter(
                    session =>
                        !session.revokedAt &&
                        new Date(
                            session.expiresAt
                        ).getTime() >
                            Date.now()
                )
                .length;

        TURKAI_AUTH_STATS_8
            .activeSessions =
            activeSessions;

        saveAuthStats8();

        return res.json({

            ok:
                true,

            success:
                true,

            stats:
                TURKAI_AUTH_STATS_8,

            users:
                TURKAI_AUTH_USERS_8
                    .items
                    .length,

            sessions:
                activeSessions,

            usageEntries:
                TURKAI_AUTH_USAGE_8
                    .items
                    .length
        });
    }
);

// ======================================================================
// 8.53 — PLAN FEATURES
// ======================================================================

app.get(
    "/api/account/features",
    optionalAuth8,
    (
        req,
        res
    ) => {

        const userId =
            req.user &&
            req.user.id
                ? req.user.id
                : authSafeString8(
                    req.query.userId,
                    "guest"
                );

        const plan =
            getUserPlan8(
                userId
            );

        return res.json({

            ok:
                true,

            success:
                true,

            planId:
                plan.id,

            features: {

                imageGeneration:
                    plan.imageGeneration,

                dailyImages:
                    plan.dailyImages,

                videoGeneration:
                    plan.videoGeneration,

                research:
                    plan.research,

                memory:
                    plan.memory,

                fileUpload:
                    plan.fileUpload,

                coding:
                    plan.coding,

                advancedModels:
                    plan.advancedModels,

                priority:
                    plan.priority
            }
        });
    }
);

// ======================================================================
// 8.54 — FEATURE ACCESS CHECK
// ======================================================================

app.get(
    "/api/account/feature/:feature",
    optionalAuth8,
    (
        req,
        res
    ) => {

        const userId =
            req.user &&
            req.user.id
                ? req.user.id
                : authSafeString8(
                    req.query.userId,
                    "guest"
                );

        const plan =
            getUserPlan8(
                userId
            );

        const feature =
            authSafeString8(
                req.params.feature
            );

        const allowed =
            Boolean(
                plan[
                    feature
                ]
            );

        return res.json({

            ok:
                true,

            success:
                true,

            feature,

            allowed,

            plan:
                plan.id
        });
    }
);

// ======================================================================
// 8.55 — ACCOUNT PROVIDER INFO
// ======================================================================

app.get(
    "/api/account/provider",
    requireAuth8,
    (
        req,
        res
    ) => {

        return res.json({

            ok:
                true,

            success:
                true,

            provider:
                req.user.provider,

            providerId:
                req.user.providerId,

            verified:
                Boolean(
                    req.user.verified
                )
        });
    }
);

// ======================================================================
// 8.56 — GOOGLE-STYLE LOGIN BRIDGE
// ======================================================================

app.post(
    "/api/auth/google",
    (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const googleId =
            authSafeString8(
                body.googleId ||
                body.sub ||
                body.id
            );

        const email =
            authSafeString8(
                body.email
            );

        const name =
            authSafeString8(
                body.name ||
                body.given_name ||
                "TürkAI Kullanıcısı"
            );

        if (
            !googleId &&
            !email
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "google_identity_required"
            });
        }

        try {

            const result =
                loginAccount8(
                    {

                        provider:
                            "google",

                        providerId:
                            googleId ||
                            email,

                        email:
                            email ||
                            null,

                        name,

                        verified:
                            true,

                        ip:
                            req.ip,

                        userAgent:
                            req.headers[
                                "user-agent"
                            ] ||
                            ""
                    }
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                ...result
            });

        } catch (
            error
        ) {

            return res.status(
                401
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "google_login_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 8.57 — ACCOUNT SEARCH
// ======================================================================

app.get(
    "/api/account/search",
    optionalAuth8,
    (
        req,
        res
    ) => {

        const email =
            authSafeString8(
                req.query.email
            );

        if (
            !email
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                error:
                    "email_required"
            });
        }

        const user =
            findAuthUserByEmail8(
                email
            );

        if (
            !user
        ) {

            return res.json({

                ok:
                    true,

                success:
                    true,

                found:
                    false,

                user:
                    null
            });
        }

        return res.json({

            ok:
                true,

            success:
                true,

            found:
                true,

            user:
                publicAuthUser8(
                    user
                )
        });
    }
);

// ======================================================================
// 8.58 — USAGE HISTORY
// ======================================================================

app.get(
    "/api/usage/history",
    optionalAuth8,
    (
        req,
        res
    ) => {

        const userId =
            req.user &&
            req.user.id
                ? req.user.id
                : authSafeString8(
                    req.query.userId,
                    "guest"
                );

        const limit =
            Math.min(
                100,
                Math.max(
                    1,
                    Number(
                        req.query.limit
                    ) ||
                    20
                )
            );

        const items =
            TURKAI_AUTH_USAGE_8
                .items
                .filter(
                    item =>
                        item.userId ===
                        userId
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        String(
                            b.month
                        ).localeCompare(
                            String(
                                a.month
                            )
                        )
                )
                .slice(
                    0,
                    limit
                );

        return res.json({

            ok:
                true,

            success:
                true,

            count:
                items.length,

            items
        });
    }
);

// ======================================================================
// 8.59 — USAGE RESET
// ======================================================================

app.post(
    "/api/usage/reset",
    requireAuth8,
    (
        req,
        res
    ) => {

        const month =
            authMonth8();

        const usage =
            getAccountUsage8(
                req.user.id,
                month
            );

        usage.chatRequests =
            0;

        usage.researchRequests =
            0;

        usage.imageRequests =
            0;

        usage.videoRequests =
            0;

        usage.fileUploads =
            0;

        usage.codingRequests =
            0;

        usage.totalRequests =
            0;

        usage.updatedAt =
            authNow8();

        saveAuthUsage8();

        return res.json({

            ok:
                true,

            success:
                true,

            usage
        });
    }
);

// ======================================================================
// 8.60 — PLAN ACTIVATION TEST
// ======================================================================

app.post(
    "/api/test-payment",
    requireAuth8,
    (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const plan =
            authNormalize8(
                body.plan ||
                "pro"
            );

        if (
            !TURKAI_PLANS_8[
                plan
            ]
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                error:
                    "plan_not_found"
            });
        }

        try {

            const result =
                changeUserPlan8(
                    req.user.id,
                    plan,
                    {
                        ip:
                            req.ip,

                        userAgent:
                            req.headers[
                                "user-agent"
                            ] ||
                            null
                    }
                );

            return res.json({

                ok:
                    true,

                success:
                    true,

                testPayment:
                    true,

                ...result
            });

        } catch (
            error
        ) {

            return res.status(
                400
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "test_payment_failed",

                message:
                    error.message
            });
        }
    }
);

// ======================================================================
// 8.61 — ACCOUNT DELETE REQUEST
// ======================================================================

app.post(
    "/api/account/delete-request",
    requireAuth8,
    (
        req,
        res
    ) => {

        const user =
            req.user;

        user.deletionRequestedAt =
            authNow8();

        user.updatedAt =
            authNow8();

        saveAuthUsers8();

        revokeUserSessions8(
            user.id
        );

        logSecurityEvent8(
            "account-delete-request",
            {
                userId:
                    user.id,

                ip:
                    req.ip,

                userAgent:
                    req.headers[
                        "user-agent"
                    ] ||
                    null
            }
        );

        return res.json({

            ok:
                true,

            success:
                true,

            requested:
                true
        });
    }
);

// ======================================================================
// 8.62 — ACCOUNT RESTORE REQUEST
// ======================================================================

app.post(
    "/api/account/restore-request",
    (
        req,
        res
    ) => {

        const userId =
            authSafeString8(
                req.body &&
                req.body.userId
            );

        const user =
            findAuthUser8(
                userId
            );

        if (
            !user
        ) {

            return res.status(
                404
            ).json({

                ok:
                    false,

                error:
                    "user_not_found"
            });
        }

        delete user.deletionRequestedAt;

        user.active =
            true;

        user.updatedAt =
            authNow8();

        saveAuthUsers8();

        return res.json({

            ok:
                true,

            success:
                true,

            restored:
                true,

            user:
                publicAuthUser8(
                    user
                )
        });
    }
);

// ======================================================================
// 8.63 — CLEAN EXPIRED SESSIONS
// ======================================================================

function cleanupSessions8() {

    let removed =
        0;

    const nowMs =
        Date.now();

    for (
        const session
        of TURKAI_AUTH_SESSIONS_8
            .items
    ) {

        if (
            session.revokedAt
        ) {
            continue;
        }

        const expires =
            new Date(
                session.expiresAt
            ).getTime();

        if (
            Number.isFinite(
                expires
            ) &&
            expires <=
                nowMs
        ) {

            session.revokedAt =
                authNow8();

            removed++;
        }
    }

    if (
        removed
    ) {

        saveAuthSessions8();

        TURKAI_AUTH_STATS_8
            .sessionsRevoked +=
            removed;

        saveAuthStats8();
    }

    return removed;
}

// ======================================================================
// 8.64 — CLEAN RATE LIMITS
// ======================================================================

function cleanupRateLimits8() {

    const nowMs =
        Date.now();

    let removed =
        0;

    for (
        const [
            key,
            entry
        ]
        of TURKAI_RATE_LIMITS_8
    ) {

        if (
            nowMs -
                entry.startedAt >
                TURKAI_AUTH_CONFIG_8
                    .rateLimitWindow *
                2
        ) {

            TURKAI_RATE_LIMITS_8.delete(
                key
            );

            removed++;
        }
    }

    return removed;
}

// ======================================================================
// 8.65 — CLEAN OLD USAGE
// ======================================================================

function cleanupUsage8() {

    const cutoff =
        new Date();

    cutoff.setUTCMonth(
        cutoff.getUTCMonth() -
        12
    );

    const timestamp =
        cutoff
            .toISOString()
            .slice(
                0,
                7
            );

    const before =
        TURKAI_AUTH_USAGE_8
            .items
            .length;

    TURKAI_AUTH_USAGE_8
        .items =
        TURKAI_AUTH_USAGE_8
            .items
            .filter(
                item =>
                    String(
                        item.month
                    ) >=
                    timestamp
            );

    const removed =
        before -
        TURKAI_AUTH_USAGE_8
            .items
            .length;

    if (
        removed
    ) {

        saveAuthUsage8();
    }

    return removed;
}

// ======================================================================
// 8.66 — PERIODIC CLEANUP
// ======================================================================

setInterval(
    () => {

        try {

            cleanupSessions8();

            cleanupRateLimits8();

            cleanupUsage8();

        } catch (
            error
        ) {

            TURKAI_AUTH_STATS_8
                .lastError =
                error.message;

            TURKAI_AUTH_STATS_8
                .lastErrorAt =
                authNow8();

            saveAuthStats8();
        }

    },
    10 * 60 * 1000
);

// ======================================================================
// 8.67 — ADMIN PLAN STATUS
// ======================================================================

app.get(
    "/api/admin/plans/status",
    (
        req,
        res
    ) => {

        const adminKey =
            authSafeString8(
                req.headers[
                    "x-admin-key"
                ] ||
                req.query.adminKey
            );

        const expected =
            authSafeString8(
                process.env.TURKAI_ADMIN_KEY
            );

        if (
            !expected ||
            adminKey !==
                expected
        ) {

            return res.status(
                403
            ).json({

                ok:
                    false,

                success:
                    false,

                error:
                    "admin_required"
            });
        }

        const counts = {};

        for (
            const planId
            of Object.keys(
                TURKAI_PLANS_8
            )
        ) {

            counts[
                planId
            ] =
                TURKAI_AUTH_USERS_8
                    .items
                    .filter(
                        user =>
                            user.plan ===
                            planId
                    )
                    .length;
        }

        return res.json({

            ok:
                true,

            success:
                true,

            counts,

            plans:
                TURKAI_PLANS_8
        });
    }
);

// ======================================================================
// 8.68 — ADMIN USER LIST
// ======================================================================

app.get(
    "/api/admin/users",
    (
        req,
        res
    ) => {

        const adminKey =
            authSafeString8(
                req.headers[
                    "x-admin-key"
                ] ||
                req.query.adminKey
            );

        const expected =
            authSafeString8(
                process.env.TURKAI_ADMIN_KEY
            );

        if (
            !expected ||
            adminKey !==
                expected
        ) {

            return res.status(
                403
            ).json({

                ok:
                    false,

                error:
                    "admin_required"
            });
        }

        const limit =
            Math.min(
                500,
                Math.max(
                    1,
                    Number(
                        req.query.limit
                    ) ||
                    100
                )
            );

        return res.json({

            ok:
                true,

            success:
                true,

            count:
                TURKAI_AUTH_USERS_8
                    .items
                    .length,

            users:
                TURKAI_AUTH_USERS_8
                    .items
                    .slice(
                        -limit
                    )
                    .reverse()
                    .map(
                        publicAuthUser8
                    )
        });
    }
);

// ======================================================================
// 8.69 — AUTH EXPORT
// ======================================================================

app.get(
    "/api/auth/export",
    (
        req,
        res
    ) => {

        const adminKey =
            authSafeString8(
                req.headers[
                    "x-admin-key"
                ] ||
                req.query.adminKey
            );

        const expected =
            authSafeString8(
                process.env.TURKAI_ADMIN_KEY
            );

        if (
            !expected ||
            adminKey !==
                expected
        ) {

            return res.status(
                403
            ).json({

                ok:
                    false,

                error:
                    "admin_required"
            });
        }

        return res.json({

            ok:
                true,

            success:
                true,

            exportedAt:
                authNow8(),

            users:
                TURKAI_AUTH_USERS_8
                    .items
                    .map(
                        publicAuthUser8
                    ),

            sessions:
                TURKAI_AUTH_SESSIONS_8
                    .items
                    .map(
                        session => ({
                            id:
                                session.id,

                            userId:
                                session.userId,

                            createdAt:
                                session.createdAt,

                            expiresAt:
                                session.expiresAt,

                            revokedAt:
                                session.revokedAt
                        })
                    ),

            usage:
                TURKAI_AUTH_USAGE_8
                    .items
        });
    }
);

// ======================================================================
// 8.70 — AUTH STATE BRIDGE
// ======================================================================

serverState.auth =
    serverState.auth ||
    {};

serverState.auth.ready =
    true;

serverState.auth.config =
    TURKAI_AUTH_CONFIG_8;

serverState.auth.settings =
    TURKAI_AUTH_SETTINGS_8;

serverState.auth.stats =
    TURKAI_AUTH_STATS_8;

serverState.auth.users =
    TURKAI_AUTH_USERS_8;

serverState.auth.sessions =
    TURKAI_AUTH_SESSIONS_8;

serverState.auth.usage =
    TURKAI_AUTH_USAGE_8;

serverState.auth.plans =
    TURKAI_PLANS_8;

serverState.auth.login =
    loginAccount8;

serverState.auth.validate =
    validateSession8;

serverState.auth.user =
    getOrCreateAuthUser8;

serverState.auth.publicUser =
    publicAuthUser8;

serverState.auth.usageCheck =
    checkUsage8;

serverState.auth.incrementUsage =
    incrementUsage8;

serverState.auth.imageAccess =
    canGenerateImage8;

serverState.auth.videoAccess =
    canGenerateVideo8;

serverState.auth.plan =
    getUserPlan8;

// ======================================================================
// 8.71 — GLOBAL AUTH BRIDGE
// ======================================================================

global.turkAI =
    global.turkAI ||
    {};

global.turkAI.auth =
    global.turkAI.auth ||
    {};

global.turkAI.auth.login =
    loginAccount8;

global.turkAI.auth.validate =
    validateSession8;

global.turkAI.auth.getUser =
    getOrCreateAuthUser8;

global.turkAI.auth.getPlan =
    getUserPlan8;

global.turkAI.auth.checkUsage =
    checkUsage8;

global.turkAI.auth.incrementUsage =
    incrementUsage8;

global.turkAI.auth.canImage =
    canGenerateImage8;

global.turkAI.auth.canVideo =
    canGenerateVideo8;

global.turkAI.auth.plans =
    TURKAI_PLANS_8;

// ======================================================================
// 8.72 — COMPATIBILITY BRIDGES
// ======================================================================

const getAuthUser =
    function (
        userId
    ) {

        return getOrCreateAuthUser8(
            {
                userId,

                name:
                    "Guest",

                provider:
                    "guest"
            }
        );
    };

const getAuthUsage =
    function (
        userId
    ) {

        return getAccountUsage8(
            userId
        );
    };

const canUseAuthAI =
    function (
        userId
    ) {

        return checkUsage8(
            userId,
            "chat"
        );
    };

const incrementAuthUsage =
    function (
        userId
    ) {

        return incrementUsage8(
            userId,
            "chat"
        );
    };

// ======================================================================
// 8.73 — CURRENT USER HELPERS
// ======================================================================

function getCurrentUser8(
    req
) {

    const token =
        getRequestToken8(
            req
        );

    if (
        token
    ) {

        const auth =
            validateSession8(
                token
            );

        if (
            auth.valid
        ) {

            return auth.user;
        }
    }

    const userId =
        authSafeString8(
            req.query &&
            req.query.userId ||
            req.body &&
            req.body.userId
        );

    if (
        userId
    ) {

        return findAuthUser8(
            userId
        );
    }

    return null;
}

// ======================================================================
// 8.74 — PLAN FEATURE HELPER
// ======================================================================

function hasPlanFeature8(
    userId,
    feature
) {

    const plan =
        getUserPlan8(
            userId
        );

    return Boolean(
        plan[
            feature
        ]
    );
}

// ======================================================================
// 8.75 — USAGE TYPE HELPER
// ======================================================================

function canUseFeature8(
    userId,
    feature
) {

    if (
        feature ===
        "imageGeneration"
    ) {

        return canGenerateImage8(
            userId
        );
    }

    if (
        feature ===
        "videoGeneration"
    ) {

        return canGenerateVideo8(
            userId
        );
    }

    if (
        feature ===
        "research"
    ) {

        return {

            allowed:
                hasPlanFeature8(
                    userId,
                    "research"
                ),

            plan:
                getUserPlan8(
                    userId
                ).id
        };
    }

    if (
        feature ===
        "coding"
    ) {

        return {

            allowed:
                hasPlanFeature8(
                    userId,
                    "coding"
                ),

            plan:
                getUserPlan8(
                    userId
                ).id
        };
    }

    if (
        feature ===
        "fileUpload"
    ) {

        return {

            allowed:
                hasPlanFeature8(
                    userId,
                    "fileUpload"
                ),

            plan:
                getUserPlan8(
                    userId
                ).id
        };
    }

    return {

        allowed:
            hasPlanFeature8(
                userId,
                feature
            ),

        plan:
            getUserPlan8(
                userId
            ).id
    };
}

// ======================================================================
// 8.76 — AUTH CLEANUP DATABASE
// ======================================================================

TURKAI_AUTH_STATS_8
    .activeSessions =
    TURKAI_AUTH_SESSIONS_8
        .items
        .filter(
            session =>
                !session.revokedAt &&
                new Date(
                    session.expiresAt
                ).getTime() >
                    Date.now()
        )
        .length;

saveAuthUsers8();
saveAuthSessions8();
saveAuthUsage8();
saveAuthStats8();

// ======================================================================
// 8.77 — AUTH STARTUP LOG
// ======================================================================

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

console.log(
    "TürkAI Master Server — PART 8/10"
);

console.log(
    "Auth Engine:",
    TURKAI_AUTH_SETTINGS_8
        .enabled
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Guest Login:",
    TURKAI_AUTH_SETTINGS_8
        .guests
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Sessions:",
    TURKAI_AUTH_SETTINGS_8
        .sessions
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Security:",
    TURKAI_AUTH_SETTINGS_8
        .security
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Rate Limit:",
    TURKAI_AUTH_SETTINGS_8
        .rateLimit
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Plans:",
    Object.keys(
        TURKAI_PLANS_8
    ).join(
        ", "
    )
);

console.log(
    "Users:",
    TURKAI_AUTH_USERS_8
        .items
        .length
);

console.log(
    "Active Sessions:",
    TURKAI_AUTH_STATS_8
        .activeSessions
);

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

/*
========================================================================
 PART 8 END

 SONRA:
 PART 9 / 10
 CONVERSATION VAULT + CODING STUDIO + SEARCH + PIN + FAVORITE
========================================================================
*/
/*
========================================================================
 TÜRKAI MASTER SERVER 50.0
 PART 9 / 10
 CONVERSATION VAULT + CODING STUDIO + SEARCH + PIN + FAVORITE
========================================================================
*/

"use strict";

const TURKAI_VAULT_DIR_9 =
    path.join(DATA_DIR, "vault");

const TURKAI_CONVERSATIONS_FILE_9 =
    path.join(TURKAI_VAULT_DIR_9, "conversations.json");

const TURKAI_MESSAGES_FILE_9 =
    path.join(TURKAI_VAULT_DIR_9, "messages.json");

const TURKAI_CODE_PROJECTS_FILE_9 =
    path.join(TURKAI_VAULT_DIR_9, "code-projects.json");

const TURKAI_CODE_FILES_FILE_9 =
    path.join(TURKAI_VAULT_DIR_9, "code-files.json");

const TURKAI_CODE_HISTORY_FILE_9 =
    path.join(TURKAI_VAULT_DIR_9, "code-history.json");

ensureDir(TURKAI_VAULT_DIR_9);

let TURKAI_CONVERSATIONS_DB_9 =
    readJSON(TURKAI_CONVERSATIONS_FILE_9, []);

let TURKAI_MESSAGES_DB_9 =
    readJSON(TURKAI_MESSAGES_FILE_9, []);

let TURKAI_CODE_PROJECTS_DB_9 =
    readJSON(TURKAI_CODE_PROJECTS_FILE_9, []);

let TURKAI_CODE_FILES_DB_9 =
    readJSON(TURKAI_CODE_FILES_FILE_9, []);

let TURKAI_CODE_HISTORY_DB_9 =
    readJSON(TURKAI_CODE_HISTORY_FILE_9, []);

function saveVaultDB9() {
    writeJSON(
        TURKAI_CONVERSATIONS_FILE_9,
        TURKAI_CONVERSATIONS_DB_9
    );

    writeJSON(
        TURKAI_MESSAGES_FILE_9,
        TURKAI_MESSAGES_DB_9
    );

    writeJSON(
        TURKAI_CODE_PROJECTS_FILE_9,
        TURKAI_CODE_PROJECTS_DB_9
    );

    writeJSON(
        TURKAI_CODE_FILES_FILE_9,
        TURKAI_CODE_FILES_DB_9
    );

    writeJSON(
        TURKAI_CODE_HISTORY_FILE_9,
        TURKAI_CODE_HISTORY_DB_9
    );
}

function vaultId9(prefix = "item") {
    return (
        prefix +
        "_" +
        Date.now().toString(36) +
        "_" +
        crypto.randomBytes(5).toString("hex")
    );
}

function vaultText9(value, max = 50000) {
    return String(value ?? "")
        .replace(/\u0000/g, "")
        .slice(0, max);
}

function vaultUser9(req) {
    return String(
        req.body?.userId ||
        req.query?.userId ||
        req.headers["x-user-id"] ||
        req.session?.userId ||
        "guest"
    ).slice(0, 150);
}

function vaultConversation9(id) {
    return TURKAI_CONVERSATIONS_DB_9.find(
        x => x.id === String(id)
    );
}

function vaultProject9(id) {
    return TURKAI_CODE_PROJECTS_DB_9.find(
        x => x.id === String(id)
    );
}

function vaultFile9(id) {
    return TURKAI_CODE_FILES_DB_9.find(
        x => x.id === String(id)
    );
}

function touchConversation9(conversation) {
    conversation.updatedAt = new Date().toISOString();
}

function safeTitle9(title, fallback = "Yeni sohbet") {
    const clean = vaultText9(title, 150).trim();
    return clean || fallback;
}

function generateConversationTitle9(message) {
    const text = vaultText9(message, 120).trim();

    if (!text) {
        return "Yeni sohbet";
    }

    return text.length > 45
        ? text.slice(0, 45).trim() + "..."
        : text;
}

function addConversation9({
    userId,
    title,
    model = "turkai",
    metadata = {}
}) {
    const now = new Date().toISOString();

    const item = {
        id: vaultId9("conv"),
        userId: String(userId || "guest"),
        title: safeTitle9(title),
        model: vaultText9(model, 100),
        pinned: false,
        favorite: false,
        archived: false,
        messageCount: 0,
        createdAt: now,
        updatedAt: now,
        metadata: metadata || {}
    };

    TURKAI_CONVERSATIONS_DB_9.push(item);
    saveVaultDB9();

    return item;
}

function addMessage9({
    conversationId,
    userId,
    role = "user",
    content = "",
    model = null,
    metadata = {}
}) {
    const conversation =
        vaultConversation9(conversationId);

    if (!conversation) {
        throw new Error("Conversation not found");
    }

    const msg = {
        id: vaultId9("msg"),
        conversationId: conversation.id,
        userId: String(userId || conversation.userId),
        role: ["user", "assistant", "system"].includes(role)
            ? role
            : "user",
        content: vaultText9(content, 100000),
        model: model ? vaultText9(model, 100) : null,
        createdAt: new Date().toISOString(),
        metadata: metadata || {}
    };

    TURKAI_MESSAGES_DB_9.push(msg);

    conversation.messageCount =
        TURKAI_MESSAGES_DB_9.filter(
            x => x.conversationId === conversation.id
        ).length;

    if (
        conversation.title === "Yeni sohbet" &&
        msg.role === "user"
    ) {
        conversation.title =
            generateConversationTitle9(msg.content);
    }

    touchConversation9(conversation);
    saveVaultDB9();

    return msg;
}

function conversationMessages9(
    conversationId,
    userId = null
) {
    return TURKAI_MESSAGES_DB_9
        .filter(x =>
            x.conversationId === String(conversationId)
        )
        .filter(x =>
            !userId ||
            String(x.userId) === String(userId)
        )
        .sort(
            (a, b) =>
                new Date(a.createdAt) -
                new Date(b.createdAt)
        );
}

/*
========================================================================
 CONVERSATION ROUTES
========================================================================
*/

app.post("/api/conversations", (req, res) => {
    try {
        const userId = vaultUser9(req);

        const conversation = addConversation9({
            userId,
            title: req.body?.title,
            model: req.body?.model,
            metadata: req.body?.metadata
        });

        res.json({
            ok: true,
            success: true,
            conversation
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

app.get("/api/conversations/search", (req, res) => {
    const userId = vaultUser9(req);
    const q = vaultText9(
        req.query?.q ||
        req.query?.query ||
        "",
        200
    ).toLowerCase().trim();

    if (!q) {
        return res.json({
            ok: true,
            conversations: []
        });
    }

    const conversations =
        TURKAI_CONVERSATIONS_DB_9
            .filter(x =>
                String(x.userId) === String(userId)
            )
            .filter(x =>
                x.title.toLowerCase().includes(q) ||
                x.model.toLowerCase().includes(q)
            );

    const messageHits =
        TURKAI_MESSAGES_DB_9
            .filter(x =>
                String(x.userId) === String(userId)
            )
            .filter(x =>
                x.content.toLowerCase().includes(q)
            )
            .slice(0, 100);

    res.json({
        ok: true,
        conversations,
        messages: messageHits,
        total:
            conversations.length +
            messageHits.length
    });
});

app.get("/api/conversations", (req, res) => {
    const userId = vaultUser9(req);

    let items =
        TURKAI_CONVERSATIONS_DB_9
            .filter(x =>
                String(x.userId) === String(userId)
            );

    if (String(req.query?.archived) === "false") {
        items = items.filter(x => !x.archived);
    }

    if (String(req.query?.pinned) === "true") {
        items = items.filter(x => x.pinned);
    }

    if (String(req.query?.favorite) === "true") {
        items = items.filter(x => x.favorite);
    }

    items.sort((a, b) => {
        if (a.pinned !== b.pinned) {
            return a.pinned ? -1 : 1;
        }

        return (
            new Date(b.updatedAt) -
            new Date(a.updatedAt)
        );
    });

    res.json({
        ok: true,
        success: true,
        conversations: items,
        items,
        total: items.length
    });
});

app.get("/api/conversations/:id", (req, res) => {
    const userId = vaultUser9(req);

    const conversation =
        vaultConversation9(req.params.id);

    if (
        !conversation ||
        String(conversation.userId) !== String(userId)
    ) {
        return res.status(404).json({
            ok: false,
            error: "Sohbet bulunamadı"
        });
    }

    const messages =
        conversationMessages9(
            conversation.id,
            userId
        );

    res.json({
        ok: true,
        success: true,
        conversation,
        messages
    });
});

app.patch("/api/conversations/:id", (req, res) => {
    const userId = vaultUser9(req);

    const conversation =
        vaultConversation9(req.params.id);

    if (
        !conversation ||
        String(conversation.userId) !== String(userId)
    ) {
        return res.status(404).json({
            ok: false,
            error: "Sohbet bulunamadı"
        });
    }

    if (req.body?.title !== undefined) {
        conversation.title =
            safeTitle9(
                req.body.title,
                conversation.title
            );
    }

    if (req.body?.model !== undefined) {
        conversation.model =
            vaultText9(req.body.model, 100);
    }

    if (req.body?.metadata !== undefined) {
        conversation.metadata =
            req.body.metadata;
    }

    touchConversation9(conversation);
    saveVaultDB9();

    res.json({
        ok: true,
        success: true,
        conversation
    });
});

app.delete("/api/conversations/:id", (req, res) => {
    const userId = vaultUser9(req);

    const conversation =
        vaultConversation9(req.params.id);

    if (
        !conversation ||
        String(conversation.userId) !== String(userId)
    ) {
        return res.status(404).json({
            ok: false,
            error: "Sohbet bulunamadı"
        });
    }

    TURKAI_CONVERSATIONS_DB_9 =
        TURKAI_CONVERSATIONS_DB_9.filter(
            x => x.id !== conversation.id
        );

    TURKAI_MESSAGES_DB_9 =
        TURKAI_MESSAGES_DB_9.filter(
            x => x.conversationId !== conversation.id
        );

    saveVaultDB9();

    res.json({
        ok: true,
        success: true,
        deleted: true,
        id: conversation.id
    });
});

app.post("/api/conversations/:id/message", (req, res) => {
    try {
        const userId = vaultUser9(req);

        const message =
            addMessage9({
                conversationId: req.params.id,
                userId,
                role: req.body?.role || "user",
                content:
                    req.body?.content ??
                    req.body?.message ??
                    "",
                model: req.body?.model,
                metadata: req.body?.metadata
            });

        res.json({
            ok: true,
            success: true,
            message
        });
    } catch (error) {
        res.status(404).json({
            ok: false,
            error: error.message
        });
    }
});

app.get("/api/conversations/:id/messages", (req, res) => {
    const userId = vaultUser9(req);

    const conversation =
        vaultConversation9(req.params.id);

    if (
        !conversation ||
        String(conversation.userId) !== String(userId)
    ) {
        return res.status(404).json({
            ok: false,
            error: "Sohbet bulunamadı"
        });
    }

    const messages =
        conversationMessages9(
            conversation.id,
            userId
        );

    res.json({
        ok: true,
        success: true,
        messages,
        items: messages
    });
});

app.post("/api/conversations/:id/pin", (req, res) => {
    const userId = vaultUser9(req);
    const conversation =
        vaultConversation9(req.params.id);

    if (
        !conversation ||
        String(conversation.userId) !== String(userId)
    ) {
        return res.status(404).json({
            ok: false,
            error: "Sohbet bulunamadı"
        });
    }

    conversation.pinned =
        req.body?.value === undefined
            ? !conversation.pinned
            : Boolean(req.body.value);

    touchConversation9(conversation);
    saveVaultDB9();

    res.json({
        ok: true,
        success: true,
        pinned: conversation.pinned,
        conversation
    });
});

app.post("/api/conversations/:id/favorite", (req, res) => {
    const userId = vaultUser9(req);
    const conversation =
        vaultConversation9(req.params.id);

    if (
        !conversation ||
        String(conversation.userId) !== String(userId)
    ) {
        return res.status(404).json({
            ok: false,
            error: "Sohbet bulunamadı"
        });
    }

    conversation.favorite =
        req.body?.value === undefined
            ? !conversation.favorite
            : Boolean(req.body.value);

    touchConversation9(conversation);
    saveVaultDB9();

    res.json({
        ok: true,
        success: true,
        favorite: conversation.favorite,
        conversation
    });
});

app.post("/api/conversations/:id/archive", (req, res) => {
    const userId = vaultUser9(req);
    const conversation =
        vaultConversation9(req.params.id);

    if (
        !conversation ||
        String(conversation.userId) !== String(userId)
    ) {
        return res.status(404).json({
            ok: false,
            error: "Sohbet bulunamadı"
        });
    }

    conversation.archived =
        req.body?.value === undefined
            ? true
            : Boolean(req.body.value);

    touchConversation9(conversation);
    saveVaultDB9();

    res.json({
        ok: true,
        success: true,
        archived: conversation.archived,
        conversation
    });
});

app.post("/api/conversations/:id/clear", (req, res) => {
    const userId = vaultUser9(req);
    const conversation =
        vaultConversation9(req.params.id);

    if (
        !conversation ||
        String(conversation.userId) !== String(userId)
    ) {
        return res.status(404).json({
            ok: false,
            error: "Sohbet bulunamadı"
        });
    }

    TURKAI_MESSAGES_DB_9 =
        TURKAI_MESSAGES_DB_9.filter(
            x => x.conversationId !== conversation.id
        );

    conversation.messageCount = 0;
    touchConversation9(conversation);

    saveVaultDB9();

    res.json({
        ok: true,
        success: true,
        cleared: true
    });
});

/*
========================================================================
 FRONTEND CHAT HISTORY COMPATIBILITY
========================================================================
*/

app.get("/api/chat/history", (req, res) => {
    const userId = vaultUser9(req);

    const conversations =
        TURKAI_CONVERSATIONS_DB_9
            .filter(x =>
                String(x.userId) === String(userId)
            )
            .sort(
                (a, b) =>
                    new Date(b.updatedAt) -
                    new Date(a.updatedAt)
            );

    res.json({
        ok: true,
        success: true,
        history: conversations,
        conversations
    });
});

app.post("/api/chat/conversation", (req, res) => {
    const userId = vaultUser9(req);

    const conversation =
        addConversation9({
            userId,
            title: req.body?.title,
            model: req.body?.model
        });

    res.json({
        ok: true,
        success: true,
        conversation
    });
});

app.post("/api/chat/save-message", (req, res) => {
    try {
        const userId = vaultUser9(req);

        let conversationId =
            req.body?.conversationId;

        if (!conversationId) {
            const conversation =
                addConversation9({
                    userId,
                    title: req.body?.title,
                    model: req.body?.model
                });

            conversationId =
                conversation.id;
        }

        const message =
            addMessage9({
                conversationId,
                userId,
                role:
                    req.body?.role ||
                    "user",
                content:
                    req.body?.content ||
                    req.body?.message ||
                    "",
                model:
                    req.body?.model
            });

        res.json({
            ok: true,
            success: true,
            conversationId,
            message
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

/*
========================================================================
 CODING STUDIO
========================================================================
*/

function detectCodeLanguage9(filename = "", code = "") {
    const name = String(filename).toLowerCase();

    if (name.endsWith(".js")) return "javascript";
    if (name.endsWith(".ts")) return "typescript";
    if (name.endsWith(".py")) return "python";
    if (name.endsWith(".html")) return "html";
    if (name.endsWith(".css")) return "css";
    if (name.endsWith(".java")) return "java";
    if (name.endsWith(".cs")) return "csharp";
    if (name.endsWith(".cpp")) return "cpp";
    if (name.endsWith(".c")) return "c";
    if (name.endsWith(".json")) return "json";
    if (name.endsWith(".sql")) return "sql";
    if (name.endsWith(".php")) return "php";
    if (name.endsWith(".xml")) return "xml";
    if (name.endsWith(".md")) return "markdown";

    const text = String(code);

    if (
        /\b(const|let|var|function|=>)\b/.test(text)
    ) {
        return "javascript";
    }

    if (
        /\b(def|import|from|print)\b/.test(text)
    ) {
        return "python";
    }

    if (
        /<html|<body|<div/i.test(text)
    ) {
        return "html";
    }

    if (
        /[.#][\w-]+\s*\{/.test(text)
    ) {
        return "css";
    }

    return "plaintext";
}

function createCodeProject9({
    userId,
    name,
    language = "javascript",
    description = ""
}) {
    const now = new Date().toISOString();

    const project = {
        id: vaultId9("project"),
        userId: String(userId),
        name:
            vaultText9(
                name || "Yeni Proje",
                150
            ).trim() || "Yeni Proje",
        language:
            vaultText9(language, 50) ||
            "javascript",
        description:
            vaultText9(description, 1000),
        favorite: false,
        archived: false,
        fileCount: 0,
        createdAt: now,
        updatedAt: now
    };

    TURKAI_CODE_PROJECTS_DB_9.push(project);
    saveVaultDB9();

    return project;
}

function createCodeFile9({
    userId,
    projectId,
    name,
    language,
    code = ""
}) {
    const project =
        vaultProject9(projectId);

    if (!project) {
        throw new Error("Proje bulunamadı");
    }

    if (
        String(project.userId) !==
        String(userId)
    ) {
        throw new Error("Yetkisiz erişim");
    }

    const file = {
        id: vaultId9("code"),
        userId: String(userId),
        projectId: project.id,
        name:
            vaultText9(
                name || "main.js",
                150
            ),
        language:
            language ||
            detectCodeLanguage9(
                name,
                code
            ),
        code:
            vaultText9(code, 300000),
        size: Buffer.byteLength(
            String(code || ""),
            "utf8"
        ),
        version: 1,
        createdAt:
            new Date().toISOString(),
        updatedAt:
            new Date().toISOString()
    };

    TURKAI_CODE_FILES_DB_9.push(file);

    project.fileCount =
        TURKAI_CODE_FILES_DB_9.filter(
            x =>
                x.projectId ===
                project.id
        ).length;

    project.updatedAt =
        new Date().toISOString();

    saveVaultDB9();

    return file;
}

function analyzeCode9(code, language) {
    const text = String(code || "");

    const lines =
        text.length
            ? text.split(/\r?\n/)
            : [];

    const warnings = [];

    if (text.length > 100000) {
        warnings.push(
            "Dosya oldukça büyük."
        );
    }

    if (
        language === "javascript" &&
        /\beval\s*\(/.test(text)
    ) {
        warnings.push(
            "eval() kullanımı dikkat gerektirir."
        );
    }

    if (
        /\bTODO\b/i.test(text)
    ) {
        warnings.push(
            "Kod içinde TODO notları bulundu."
        );
    }

    if (
        /\bconsole\.log\s*\(/.test(text)
    ) {
        warnings.push(
            "console.log kullanımları bulundu."
        );
    }

    return {
        language,
        lines: lines.length,
        characters: text.length,
        words:
            text.trim()
                ? text.trim().split(/\s+/).length
                : 0,
        warnings
    };
}

function saveCodeHistory9(file, oldCode, newCode) {
    TURKAI_CODE_HISTORY_DB_9.push({
        id: vaultId9("history"),
        fileId: file.id,
        projectId: file.projectId,
        userId: file.userId,
        previousCode:
            vaultText9(oldCode, 300000),
        newCode:
            vaultText9(newCode, 300000),
        version: file.version,
        createdAt:
            new Date().toISOString()
    });

    if (
        TURKAI_CODE_HISTORY_DB_9.length >
        5000
    ) {
        TURKAI_CODE_HISTORY_DB_9 =
            TURKAI_CODE_HISTORY_DB_9.slice(-5000);
    }
}

/*
========================================================================
 PROJECT ROUTES
========================================================================
*/

app.post("/api/coding/projects", (req, res) => {
    try {
        const project =
            createCodeProject9({
                userId: vaultUser9(req),
                name: req.body?.name,
                language:
                    req.body?.language,
                description:
                    req.body?.description
            });

        res.json({
            ok: true,
            success: true,
            project
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

app.get("/api/coding/projects/search", (req, res) => {
    const userId = vaultUser9(req);
    const q =
        vaultText9(
            req.query?.q || "",
            150
        ).toLowerCase();

    const projects =
        TURKAI_CODE_PROJECTS_DB_9
            .filter(
                x =>
                    String(x.userId) ===
                    String(userId)
            )
            .filter(
                x =>
                    !q ||
                    x.name.toLowerCase()
                        .includes(q) ||
                    x.language.toLowerCase()
                        .includes(q)
            );

    res.json({
        ok: true,
        success: true,
        projects
    });
});

app.get("/api/coding/projects", (req, res) => {
    const userId = vaultUser9(req);

    const projects =
        TURKAI_CODE_PROJECTS_DB_9
            .filter(
                x =>
                    String(x.userId) ===
                    String(userId)
            )
            .sort(
                (a, b) =>
                    new Date(b.updatedAt) -
                    new Date(a.updatedAt)
            );

    res.json({
        ok: true,
        success: true,
        projects,
        items: projects
    });
});

app.get("/api/coding/projects/:id", (req, res) => {
    const userId = vaultUser9(req);

    const project =
        vaultProject9(req.params.id);

    if (
        !project ||
        String(project.userId) !==
            String(userId)
    ) {
        return res.status(404).json({
            ok: false,
            error: "Proje bulunamadı"
        });
    }

    const files =
        TURKAI_CODE_FILES_DB_9.filter(
            x =>
                x.projectId ===
                project.id
        );

    res.json({
        ok: true,
        success: true,
        project,
        files
    });
});

app.patch("/api/coding/projects/:id", (req, res) => {
    const userId = vaultUser9(req);

    const project =
        vaultProject9(req.params.id);

    if (
        !project ||
        String(project.userId) !==
            String(userId)
    ) {
        return res.status(404).json({
            ok: false,
            error: "Proje bulunamadı"
        });
    }

    if (req.body?.name !== undefined) {
        project.name =
            vaultText9(
                req.body.name,
                150
            );
    }

    if (req.body?.language !== undefined) {
        project.language =
            vaultText9(
                req.body.language,
                50
            );
    }

    if (req.body?.description !== undefined) {
        project.description =
            vaultText9(
                req.body.description,
                1000
            );
    }

    project.updatedAt =
        new Date().toISOString();

    saveVaultDB9();

    res.json({
        ok: true,
        success: true,
        project
    });
});

app.delete("/api/coding/projects/:id", (req, res) => {
    const userId = vaultUser9(req);

    const project =
        vaultProject9(req.params.id);

    if (
        !project ||
        String(project.userId) !==
            String(userId)
    ) {
        return res.status(404).json({
            ok: false,
            error: "Proje bulunamadı"
        });
    }

    TURKAI_CODE_PROJECTS_DB_9 =
        TURKAI_CODE_PROJECTS_DB_9.filter(
            x => x.id !== project.id
        );

    TURKAI_CODE_FILES_DB_9 =
        TURKAI_CODE_FILES_DB_9.filter(
            x =>
                x.projectId !==
                project.id
        );

    TURKAI_CODE_HISTORY_DB_9 =
        TURKAI_CODE_HISTORY_DB_9.filter(
            x =>
                x.projectId !==
                project.id
        );

    saveVaultDB9();

    res.json({
        ok: true,
        success: true,
        deleted: true
    });
});

/*
========================================================================
 CODE FILE ROUTES
========================================================================
*/

app.post("/api/coding/files", (req, res) => {
    try {
        const file =
            createCodeFile9({
                userId: vaultUser9(req),
                projectId:
                    req.body?.projectId,
                name:
                    req.body?.name,
                language:
                    req.body?.language,
                code:
                    req.body?.code || ""
            });

        res.json({
            ok: true,
            success: true,
            file
        });
    } catch (error) {
        res.status(400).json({
            ok: false,
            error: error.message
        });
    }
});

app.get("/api/coding/files/:id", (req, res) => {
    const userId = vaultUser9(req);

    const file =
        vaultFile9(req.params.id);

    if (
        !file ||
        String(file.userId) !==
            String(userId)
    ) {
        return res.status(404).json({
            ok: false,
            error: "Kod dosyası bulunamadı"
        });
    }

    res.json({
        ok: true,
        success: true,
        file
    });
});

app.patch("/api/coding/files/:id", (req, res) => {
    const userId = vaultUser9(req);

    const file =
        vaultFile9(req.params.id);

    if (
        !file ||
        String(file.userId) !==
            String(userId)
    ) {
        return res.status(404).json({
            ok: false,
            error: "Kod dosyası bulunamadı"
        });
    }

    const oldCode = file.code;

    if (req.body?.name !== undefined) {
        file.name =
            vaultText9(
                req.body.name,
                150
            );
    }

    if (req.body?.language !== undefined) {
        file.language =
            vaultText9(
                req.body.language,
                50
            );
    }

    if (req.body?.code !== undefined) {
        file.code =
            vaultText9(
                req.body.code,
                300000
            );

        file.version += 1;

        saveCodeHistory9(
            file,
            oldCode,
            file.code
        );
    }

    file.size =
        Buffer.byteLength(
            file.code,
            "utf8"
        );

    file.updatedAt =
        new Date().toISOString();

    saveVaultDB9();

    res.json({
        ok: true,
        success: true,
        file
    });
});

app.delete("/api/coding/files/:id", (req, res) => {
    const userId = vaultUser9(req);

    const file =
        vaultFile9(req.params.id);

    if (
        !file ||
        String(file.userId) !==
            String(userId)
    ) {
        return res.status(404).json({
            ok: false,
            error: "Kod dosyası bulunamadı"
        });
    }

    TURKAI_CODE_FILES_DB_9 =
        TURKAI_CODE_FILES_DB_9.filter(
            x => x.id !== file.id
        );

    const project =
        vaultProject9(file.projectId);

    if (project) {
        project.fileCount =
            TURKAI_CODE_FILES_DB_9.filter(
                x =>
                    x.projectId ===
                    project.id
            ).length;

        project.updatedAt =
            new Date().toISOString();
    }

    saveVaultDB9();

    res.json({
        ok: true,
        success: true,
        deleted: true
    });
});

app.get("/api/coding/files/:id/analyze", (req, res) => {
    const userId = vaultUser9(req);

    const file =
        vaultFile9(req.params.id);

    if (
        !file ||
        String(file.userId) !==
            String(userId)
    ) {
        return res.status(404).json({
            ok: false,
            error: "Kod dosyası bulunamadı"
        });
    }

    const analysis =
        analyzeCode9(
            file.code,
            file.language
        );

    res.json({
        ok: true,
        success: true,
        analysis
    });
});

app.get("/api/coding/files/search", (req, res) => {
    const userId = vaultUser9(req);

    const q =
        vaultText9(
            req.query?.q || "",
            200
        ).toLowerCase();

    const files =
        TURKAI_CODE_FILES_DB_9
            .filter(
                x =>
                    String(x.userId) ===
                    String(userId)
            )
            .filter(
                x =>
                    !q ||
                    x.name.toLowerCase()
                        .includes(q) ||
                    x.code.toLowerCase()
                        .includes(q)
            )
            .slice(0, 200);

    res.json({
        ok: true,
        success: true,
        files
    });
});

app.get("/api/coding/files/:id/history", (req, res) => {
    const userId = vaultUser9(req);

    const file =
        vaultFile9(req.params.id);

    if (
        !file ||
        String(file.userId) !==
            String(userId)
    ) {
        return res.status(404).json({
            ok: false,
            error: "Dosya bulunamadı"
        });
    }

    const history =
        TURKAI_CODE_HISTORY_DB_9
            .filter(
                x =>
                    x.fileId ===
                    file.id
            )
            .sort(
                (a, b) =>
                    new Date(b.createdAt) -
                    new Date(a.createdAt)
            );

    res.json({
        ok: true,
        success: true,
        history
    });
});

/*
========================================================================
 GENERIC /api/code COMPATIBILITY
========================================================================
*/

app.post("/api/code/project", (req, res) => {
    req.url = "/api/coding/projects";
    return res.redirect(307, req.url);
});

app.get("/api/code/projects", (req, res) => {
    const userId = vaultUser9(req);

    const projects =
        TURKAI_CODE_PROJECTS_DB_9
            .filter(
                x =>
                    String(x.userId) ===
                    String(userId)
            );

    res.json({
        ok: true,
        success: true,
        projects
    });
});

app.post("/api/code/save", (req, res) => {
    try {
        const userId = vaultUser9(req);

        let file =
            req.body?.fileId
                ? vaultFile9(
                      req.body.fileId
                  )
                : null;

        if (
            file &&
            String(file.userId) !==
                String(userId)
        ) {
            return res.status(403).json({
                ok: false,
                error: "Yetkisiz erişim"
            });
        }

        if (!file) {
            file =
                createCodeFile9({
                    userId,
                    projectId:
                        req.body?.projectId,
                    name:
                        req.body?.name ||
                        "main.js",
                    language:
                        req.body?.language,
                    code:
                        req.body?.code || ""
                });
        } else {
            const oldCode =
                file.code;

            file.code =
                vaultText9(
                    req.body?.code ??
                    file.code,
                    300000
                );

            file.name =
                vaultText9(
                    req.body?.name ??
                    file.name,
                    150
                );

            file.language =
                vaultText9(
                    req.body?.language ??
                    file.language,
                    50
                );

            file.version += 1;
            file.updatedAt =
                new Date().toISOString();

            saveCodeHistory9(
                file,
                oldCode,
                file.code
            );

            saveVaultDB9();
        }

        res.json({
            ok: true,
            success: true,
            file
        });
    } catch (error) {
        res.status(400).json({
            ok: false,
            error: error.message
        });
    }
});

app.post("/api/code/analyze", (req, res) => {
    const code =
        vaultText9(
            req.body?.code || "",
            300000
        );

    const language =
        req.body?.language ||
        detectCodeLanguage9(
            req.body?.filename,
            code
        );

    const analysis =
        analyzeCode9(
            code,
            language
        );

    res.json({
        ok: true,
        success: true,
        analysis
    });
});

/*
========================================================================
 VAULT SEARCH
========================================================================
*/

app.get("/api/vault/search", (req, res) => {
    const userId = vaultUser9(req);

    const q =
        vaultText9(
            req.query?.q ||
            req.query?.query ||
            "",
            300
        ).toLowerCase().trim();

    if (!q) {
        return res.json({
            ok: true,
            success: true,
            conversations: [],
            messages: [],
            projects: [],
            files: []
        });
    }

    const conversations =
        TURKAI_CONVERSATIONS_DB_9.filter(
            x =>
                String(x.userId) ===
                String(userId)
        ).filter(
            x =>
                x.title
                    .toLowerCase()
                    .includes(q)
        );

    const messages =
        TURKAI_MESSAGES_DB_9
            .filter(
                x =>
                    String(x.userId) ===
                    String(userId)
            )
            .filter(
                x =>
                    x.content
                        .toLowerCase()
                        .includes(q)
            )
            .slice(0, 100);

    const projects =
        TURKAI_CODE_PROJECTS_DB_9
            .filter(
                x =>
                    String(x.userId) ===
                    String(userId)
            )
            .filter(
                x =>
                    x.name
                        .toLowerCase()
                        .includes(q)
            );

    const files =
        TURKAI_CODE_FILES_DB_9
            .filter(
                x =>
                    String(x.userId) ===
                    String(userId)
            )
            .filter(
                x =>
                    x.name
                        .toLowerCase()
                        .includes(q) ||
                    x.code
                        .toLowerCase()
                        .includes(q)
            )
            .slice(0, 100);

    res.json({
        ok: true,
        success: true,
        conversations,
        messages,
        projects,
        files,
        total:
            conversations.length +
            messages.length +
            projects.length +
            files.length
    });
});

/*
========================================================================
 VAULT STATS / HEALTH / EXPORT
========================================================================
*/

app.get("/api/vault/stats", (req, res) => {
    const userId = vaultUser9(req);

    const conversations =
        TURKAI_CONVERSATIONS_DB_9.filter(
            x =>
                String(x.userId) ===
                String(userId)
        );

    const messages =
        TURKAI_MESSAGES_DB_9.filter(
            x =>
                String(x.userId) ===
                String(userId)
        );

    const projects =
        TURKAI_CODE_PROJECTS_DB_9.filter(
            x =>
                String(x.userId) ===
                String(userId)
        );

    const files =
        TURKAI_CODE_FILES_DB_9.filter(
            x =>
                String(x.userId) ===
                String(userId)
        );

    res.json({
        ok: true,
        success: true,
        stats: {
            conversations:
                conversations.length,
            messages:
                messages.length,
            projects:
                projects.length,
            files:
                files.length,
            pinned:
                conversations.filter(
                    x => x.pinned
                ).length,
            favorites:
                conversations.filter(
                    x => x.favorite
                ).length
        }
    });
});

app.get("/api/vault/health", (req, res) => {
    res.json({
        ok: true,
        success: true,
        module: "vault",
        status: "online",
        storage: {
            conversations:
                TURKAI_CONVERSATIONS_DB_9.length,
            messages:
                TURKAI_MESSAGES_DB_9.length,
            projects:
                TURKAI_CODE_PROJECTS_DB_9.length,
            files:
                TURKAI_CODE_FILES_DB_9.length,
            history:
                TURKAI_CODE_HISTORY_DB_9.length
        },
        timestamp:
            new Date().toISOString()
    });
});

app.get("/api/vault/export", (req, res) => {
    const userId = vaultUser9(req);

    const result = {
        exportedAt:
            new Date().toISOString(),

        userId,

        conversations:
            TURKAI_CONVERSATIONS_DB_9.filter(
                x =>
                    String(x.userId) ===
                    String(userId)
            ),

        messages:
            TURKAI_MESSAGES_DB_9.filter(
                x =>
                    String(x.userId) ===
                    String(userId)
            ),

        projects:
            TURKAI_CODE_PROJECTS_DB_9.filter(
                x =>
                    String(x.userId) ===
                    String(userId)
            ),

        files:
            TURKAI_CODE_FILES_DB_9.filter(
                x =>
                    String(x.userId) ===
                    String(userId)
            )
    };

    res.json({
        ok: true,
        success: true,
        export: result
    });
});

/*
========================================================================
 GLOBAL STATE BRIDGE
========================================================================
*/

serverState.vault = {
    conversations:
        TURKAI_CONVERSATIONS_DB_9,
    messages:
        TURKAI_MESSAGES_DB_9,
    projects:
        TURKAI_CODE_PROJECTS_DB_9,
    files:
        TURKAI_CODE_FILES_DB_9,
    history:
        TURKAI_CODE_HISTORY_DB_9,

    createConversation:
        addConversation9,

    addMessage:
        addMessage9,

    createProject:
        createCodeProject9,

    createFile:
        createCodeFile9,

    analyzeCode:
        analyzeCode9
};

global.turkAI = global.turkAI || {};

global.turkAI.vault = {
    version: "50.0",
    part: 9,

    conversations:
        TURKAI_CONVERSATIONS_DB_9,

    projects:
        TURKAI_CODE_PROJECTS_DB_9,

    coding: true,
    search: true,
    favorites: true,
    pinning: true,

    ready: true
};

console.log(
    "✅ TÜRKAI PART 9 YÜKLENDİ: CONVERSATION VAULT + CODING STUDIO"
);
 /*
========================================================================
 TÜRKAI MASTER SERVER 50.0
 PART 10 / 10
 MAIN CHAT ENGINE + MODULE BRIDGE + FRONTEND + SOCKET + STARTUP
========================================================================
*/

"use strict";

/*
========================================================================
 CORE CONFIG
========================================================================
*/

const TURKAI_MAIN_CONFIG_10 = {
    version: "50.0",
    name: "TürkAI",
    port: Number(process.env.PORT || 3000),
    host: process.env.HOST || "0.0.0.0",

    maxMessageLength: 30000,
    maxHistory: 30,

    enableResearch:
        process.env.TURKAI_ENABLE_RESEARCH !== "false",

    enableMemory:
        process.env.TURKAI_ENABLE_MEMORY !== "false",

    enableMarket:
        process.env.TURKAI_ENABLE_MARKET !== "false",

    enableCoding:
        process.env.TURKAI_ENABLE_CODING !== "false",

    enableSocket: true
};

/*
========================================================================
 TEXT HELPERS
========================================================================
*/

function mainClean10(value, max = 30000) {
    return String(value ?? "")
        .replace(/\u0000/g, "")
        .slice(0, max)
        .trim();
}

function mainUserId10(req) {
    return String(
        req.body?.userId ||
        req.query?.userId ||
        req.headers["x-user-id"] ||
        "guest"
    ).slice(0, 150);
}

function mainLanguage10(text) {
    const value = String(text || "");

    if (
        /[çğıöşüÇĞİÖŞÜ]/.test(value) ||
        /\b(merhaba|selam|nasılsın|nedir|nasıl|kim|kaç|hangi)\b/i.test(value)
    ) {
        return "tr";
    }

    if (/\b(the|what|how|who|where|why|hello)\b/i.test(value)) {
        return "en";
    }

    return "tr";
}

function mainNeedsResearch10(text) {
    const value = mainClean10(text, 2000).toLowerCase();

    const triggers = [
        "bugün",
        "şu an",
        "şimdi",
        "son dakika",
        "güncel",
        "en son",
        "latest",
        "today",
        "current",
        "fiyatı",
        "kaç tl",
        "döviz",
        "altın",
        "hava durumu",
        "hava nasıl",
        "haberler",
        "kim kazandı",
        "ne zaman",
        "2026"
    ];

    return triggers.some(
        x => value.includes(x)
    );
}

function mainIsCoding10(text) {
    const value = mainClean10(text, 3000).toLowerCase();

    const keywords = [
        "kod yaz",
        "kodla",
        "javascript",
        "typescript",
        "python",
        "html",
        "css",
        "node.js",
        "nodejs",
        "react",
        "express",
        "java",
        "c++",
        "c#",
        "sql",
        "bug",
        "hata",
        "fonksiyon",
        "api",
        "backend",
        "frontend"
    ];

    return keywords.some(
        x => value.includes(x)
    );
}

function mainIsMarket10(text) {
    const value = mainClean10(text, 1500).toLowerCase();

    return [
        "dolar",
        "euro",
        "sterlin",
        "usd",
        "eur",
        "gbp",
        "altın",
        "gram altın",
        "çeyrek altın",
        "hava durumu",
        "hava nasıl",
        "sıcaklık",
        "yağmur"
    ].some(
        x => value.includes(x)
    );
}

function mainIsGreeting10(text) {
    const value = mainClean10(text, 500).toLowerCase();

    return [
        "selam",
        "merhaba",
        "hey",
        "sa",
        "s.a",
        "nasılsın",
        "naber"
    ].some(
        x => value === x ||
             value.startsWith(x + " ")
    );
}

/*
========================================================================
 CHAT MEMORY BRIDGE
========================================================================
*/

async function buildChatContext10(
    req,
    message
) {
    const userId =
        mainUserId10(req);

    const context = {
        userId,
        memory: null,
        knowledge: null,
        research: null,
        market: null,
        history: []
    };

    if (
        TURKAI_MAIN_CONFIG_10.enableMemory
    ) {
        try {
            if (
                typeof buildUserMemoryContext3 ===
                "function"
            ) {
                context.memory =
                    await Promise.resolve(
                        buildUserMemoryContext3(
                            userId
                        )
                    );
            }
        } catch (error) {
            context.memory = null;
        }

        try {
            if (
                typeof searchAnswerMemory3 ===
                "function"
            ) {
                const result =
                    await Promise.resolve(
                        searchAnswerMemory3(
                            message,
                            5
                        )
                    );

                context.knowledge =
                    result;
            }
        } catch (error) {
            context.knowledge = null;
        }
    }

    try {
        if (
            typeof conversationMessages9 ===
            "function" &&
            req.body?.conversationId
        ) {
            context.history =
                conversationMessages9(
                    req.body.conversationId,
                    userId
                ).slice(
                    -TURKAI_MAIN_CONFIG_10.maxHistory
                );
        }
    } catch (error) {
        context.history = [];
    }

    return context;
}

/*
========================================================================
 RESEARCH BRIDGE
========================================================================
*/

async function getChatResearch10(
    message
) {
    if (
        !TURKAI_MAIN_CONFIG_10.enableResearch ||
        !mainNeedsResearch10(message)
    ) {
        return null;
    }

    try {
        if (
            typeof prepareResearchContext4 ===
            "function"
        ) {
            return await Promise.resolve(
                prepareResearchContext4(
                    message
                )
            );
        }
    } catch (error) {
        return null;
    }

    try {
        if (
            typeof routeResearchForAI4 ===
            "function"
        ) {
            return await Promise.resolve(
                routeResearchForAI4(
                    message
                )
            );
        }
    } catch (error) {
        return null;
    }

    return null;
}

/*
========================================================================
 MARKET BRIDGE
========================================================================
*/

async function getChatMarket10(
    message
) {
    if (
        !TURKAI_MAIN_CONFIG_10.enableMarket ||
        !mainIsMarket10(message)
    ) {
        return null;
    }

    try {
        if (
            typeof buildMarketContext5 ===
            "function"
        ) {
            return await Promise.resolve(
                buildMarketContext5(
                    message
                )
            );
        }
    } catch (error) {}

    try {
        if (
            typeof routeMarketIntent5 ===
            "function"
        ) {
            return await Promise.resolve(
                routeMarketIntent5(
                    message
                )
            );
        }
    } catch (error) {}

    return null;
}

/*
========================================================================
 SYSTEM PROMPT
========================================================================
*/

function buildMainSystemPrompt10({
    language,
    memory,
    research,
    market,
    coding
}) {
    let prompt = `
Sen TürkAI'sin.

Kurallar:
- Kullanıcıyla doğal konuş.
- Türkçe sorularda Türkçe cevap ver.
- Gereksiz tekrar yapma.
- Bilmediğin şeyi uydurma.
- Güncel bilgi gerekiyorsa araştırma bağlamını kullan.
- Kod istenirse doğrudan çalışabilir kod üret.
- Güvenlik açısından tehlikeli işlemleri kolaylaştırma.
- Kullanıcı açıkça istemedikçe gereksiz uzunlukta cevap verme.
- Adın TürkAI.
- TürkAI hakkında sorulursa TürkAI olduğunu belirt.
`;

    prompt +=
        "\nDil: " +
        language;

    if (memory) {
        prompt +=
            "\nKULLANICI HAFIZASI:\n" +
            JSON.stringify(
                memory
            ).slice(0, 8000);
    }

    if (research) {
        prompt +=
            "\nARAŞTIRMA BAĞLAMI:\n" +
            JSON.stringify(
                research
            ).slice(0, 10000);
    }

    if (market) {
        prompt +=
            "\nPİYASA BAĞLAMI:\n" +
            JSON.stringify(
                market
            ).slice(0, 6000);
    }

    if (coding) {
        prompt +=
            "\nKODLAMA MODU AKTİF.";
    }

    return prompt;
}

/*
========================================================================
 LOCAL FALLBACK
========================================================================
*/

function localChatFallback10(message) {
    const text =
        mainClean10(
            message,
            5000
        );

    const lower =
        text.toLowerCase();

    if (
        lower === "en hızlı kim?" ||
        lower === "en hızlı kim"
    ) {
        return "TürkAI ⚡🤖";
    }

    if (
        lower === "selam" ||
        lower === "merhaba"
    ) {
        return "Selam knk 😄 TürkAI burada. Ne yapıyoruz?";
    }

    if (
        lower.includes("nasılsın")
    ) {
        return "İyiyim knk 😄 TürkAI çalışıyor.";
    }

    if (
        lower.includes("sen kimsin")
    ) {
        return "Ben TürkAI 🤖 Türkçe odaklı yapay zekâ asistanıyım.";
    }

    if (
        lower.includes("hangi model")
    ) {
        return "TürkAI, kullanılabilir yapay zekâ sağlayıcılarına göre uygun modeli seçip gerektiğinde yerel yedek sisteme geçebilir.";
    }

    if (
        mainIsCoding10(text)
    ) {
        return "Kodlama modundayım. Kodu, hata mesajını veya yapmak istediğin özelliği gönder.";
    }

    if (
        mainNeedsResearch10(text)
    ) {
        return "Bu soru güncel bilgi gerektiriyor. Araştırma motorunu kullanarak güncel kaynaklara bakıyorum.";
    }

    return "Bunu yerel modda işleyebiliyorum. Daha ayrıntılı cevap için sorunu biraz daha açık yaz.";
}

/*
========================================================================
 AI RESPONSE ENGINE
========================================================================
*/

async function generateMainChat10({
    req,
    message,
    history = []
}) {
    const language =
        mainLanguage10(message);

    const context =
        await buildChatContext10(
            req,
            message
        );

    const research =
        await getChatResearch10(
            message
        );

    const market =
        await getChatMarket10(
            message
        );

    const coding =
        mainIsCoding10(
            message
        );

    const systemPrompt =
        buildMainSystemPrompt10({
            language,
            memory:
                context.memory,
            research,
            market,
            coding
        });

    let finalHistory = [];

    if (Array.isArray(history)) {
        finalHistory =
            history
                .slice(
                    -TURKAI_MAIN_CONFIG_10.maxHistory
                )
                .map(item => ({
                    role:
                        ["user", "assistant", "system"]
                            .includes(item.role)
                            ? item.role
                            : "user",
                    content:
                        mainClean10(
                            item.content,
                            10000
                        )
                }));
    }

    /*
    --------------------------------------------------------------------
    AI PROVIDER
    --------------------------------------------------------------------
    */

    if (
        typeof generateTurkAIResponse2 ===
        "function"
    ) {
        try {
            const result =
                await generateTurkAIResponse2({
                    message,
                    messages:
                        finalHistory,
                    systemPrompt,
                    userId:
                        mainUserId10(req),

                    context: {
                        language,
                        memory:
                            context.memory,
                        knowledge:
                            context.knowledge,
                        research,
                        market,
                        coding
                    }
                });

            if (typeof result === "string") {
                return {
                    text: result,
                    provider: "turkai-ai",
                    language,
                    usedResearch:
                        Boolean(research),
                    usedMemory:
                        Boolean(
                            context.memory ||
                            context.knowledge
                        ),
                    usedMarket:
                        Boolean(market),
                    coding
                };
            }

            if (
                result &&
                typeof result === "object"
            ) {
                return {
                    text:
                        result.text ||
                        result.content ||
                        result.answer ||
                        localChatFallback10(
                            message
                        ),

                    provider:
                        result.provider ||
                        "turkai-ai",

                    model:
                        result.model ||
                        null,

                    language,

                    usedResearch:
                        Boolean(research),

                    usedMemory:
                        Boolean(
                            context.memory ||
                            context.knowledge
                        ),

                    usedMarket:
                        Boolean(market),

                    coding,

                    raw: result
                };
            }
        } catch (error) {
            console.warn(
                "AI ana motoru fallback:",
                error.message
            );
        }
    }

    return {
        text:
            localChatFallback10(
                message
            ),

        provider: "local",
        model: "local",
        language,

        usedResearch:
            Boolean(research),

        usedMemory:
            Boolean(
                context.memory ||
                context.knowledge
            ),

        usedMarket:
            Boolean(market),

        coding
    };
}

/*
========================================================================
 CONVERSATION SAVE
========================================================================
*/

function saveMainConversation10({
    req,
    message,
    answer,
    model = null
}) {
    try {
        const userId =
            mainUserId10(req);

        let conversationId =
            req.body?.conversationId;

        let conversation = null;

        if (conversationId) {
            conversation =
                vaultConversation9(
                    conversationId
                );

            if (
                !conversation ||
                String(conversation.userId) !==
                    String(userId)
            ) {
                conversation = null;
            }
        }

        if (!conversation) {
            conversation =
                addConversation9({
                    userId,
                    title:
                        generateConversationTitle9(
                            message
                        ),
                    model:
                        model || "turkai"
                });

            conversationId =
                conversation.id;
        }

        addMessage9({
            conversationId,
            userId,
            role: "user",
            content: message
        });

        addMessage9({
            conversationId,
            userId,
            role: "assistant",
            content: answer,
            model
        });

        return conversation;
    } catch (error) {
        return null;
    }
}

/*
========================================================================
 MEMORY AUTO SAVE
========================================================================
*/

function autoLearnMain10({
    req,
    message,
    answer
}) {
    if (
        !TURKAI_MAIN_CONFIG_10.enableMemory
    ) {
        return null;
    }

    try {
        if (
            typeof autoLearnAnswer3 ===
            "function"
        ) {
            return autoLearnAnswer3({
                question: message,
                answer,
                userId:
                    mainUserId10(req)
            });
        }
    } catch (error) {}

    return null;
}

/*
========================================================================
 AUTH / USAGE BRIDGE
========================================================================
*/

async function checkMainUsage10(
    req,
    res
) {
    try {
        if (
            typeof getUsageStatus8 !==
            "function"
        ) {
            return true;
        }

        const userId =
            mainUserId10(req);

        const result =
            await Promise.resolve(
                getUsageStatus8(
                    userId
                )
            );

        if (
            result &&
            result.allowed === false
        ) {
            res.status(429).json({
                ok: false,
                success: false,
                error:
                    "Günlük kullanım limitine ulaştın.",
                usage:
                    result
            });

            return false;
        }
    } catch (error) {}

    return true;
}

/*
========================================================================
 MAIN /api/chat
========================================================================
*/

app.post("/api/chat", async (req, res) => {
    const started =
        Date.now();

    try {
        const message =
            mainClean10(
                req.body?.message ||
                req.body?.prompt ||
                req.body?.content ||
                "",
                TURKAI_MAIN_CONFIG_10.maxMessageLength
            );

        if (!message) {
            return res.status(400).json({
                ok: false,
                success: false,
                error: "Mesaj boş olamaz."
            });
        }

        if (
            !(await checkMainUsage10(
                req,
                res
            ))
        ) {
            return;
        }

        let history =
            Array.isArray(
                req.body?.history
            )
                ? req.body.history
                : [];

        if (
            req.body?.conversationId &&
            typeof conversationMessages9 ===
                "function"
        ) {
            try {
                history =
                    conversationMessages9(
                        req.body.conversationId,
                        mainUserId10(req)
                    );
            } catch (error) {}
        }

        const result =
            await generateMainChat10({
                req,
                message,
                history
            });

        const conversation =
            saveMainConversation10({
                req,
                message,
                answer:
                    result.text,
                model:
                    result.model ||
                    result.provider
            });

        autoLearnMain10({
            req,
            message,
            answer:
                result.text
        });

        /*
        ---------------------------------------------------------------
        USAGE INCREMENT
        ---------------------------------------------------------------
        */

        try {
            if (
                typeof incrementUsage8 ===
                "function"
            ) {
                await Promise.resolve(
                    incrementUsage8(
                        mainUserId10(req),
                        "chat"
                    )
                );
            }
        } catch (error) {}

        res.json({
            ok: true,
            success: true,

            answer:
                result.text,

            message:
                result.text,

            content:
                result.text,

            response:
                result.text,

            provider:
                result.provider,

            model:
                result.model || null,

            language:
                result.language,

            conversationId:
                conversation?.id ||
                req.body?.conversationId ||
                null,

            conversation,

            meta: {
                duration:
                    Date.now() -
                    started,

                usedResearch:
                    result.usedResearch,

                usedMemory:
                    result.usedMemory,

                usedMarket:
                    result.usedMarket,

                coding:
                    result.coding
            }
        });
    } catch (error) {
        console.error(
            "POST /api/chat:",
            error
        );

        res.status(500).json({
            ok: false,
            success: false,
            error:
                "TürkAI cevap üretirken bir hata oluştu.",
            details:
                process.env.NODE_ENV ===
                "development"
                    ? error.message
                    : undefined
        });
    }
});

/*
========================================================================
 SMART CHAT
========================================================================
*/

app.post(
    "/api/chat/smart",
    async (req, res) => {
        req.body =
            req.body || {};

        req.body.smart =
            true;

        return app._router.handle(
            req,
            res
        );
    }
);

/*
========================================================================
 QUICK ASK
========================================================================
*/

app.post("/api/ask", async (req, res) => {
    req.url = "/api/chat";
    req.originalUrl = "/api/chat";

    return app._router.handle(
        req,
        res
    );
});

/*
========================================================================
 SYSTEM STATUS
========================================================================
*/

app.get("/api/system/status", (req, res) => {
    res.json({
        ok: true,
        success: true,

        name:
            TURKAI_MAIN_CONFIG_10.name,

        version:
            TURKAI_MAIN_CONFIG_10.version,

        status: "online",

        uptime:
            process.uptime(),

        node:
            process.version,

        memory: {
            rss:
                process.memoryUsage().rss,
            heapUsed:
                process.memoryUsage().heapUsed,
            heapTotal:
                process.memoryUsage().heapTotal
        },

        modules: {
            ai:
                Boolean(
                    serverState?.ai
                ),

            memory:
                Boolean(
                    serverState?.memory
                ),

            research:
                Boolean(
                    serverState?.research
                ),

            market:
                Boolean(
                    serverState?.market
                ),

            files:
                Boolean(
                    serverState?.files
                ),

            tasks:
                Boolean(
                    serverState?.tasks
                ),

            auth:
                Boolean(
                    serverState?.auth
                ),

            vault:
                Boolean(
                    serverState?.vault
                )
        },

        timestamp:
            new Date().toISOString()
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        ok: true,
        status: "healthy",
        service: "TürkAI",
        version:
            TURKAI_MAIN_CONFIG_10.version,
        uptime:
            process.uptime(),
        timestamp:
            new Date().toISOString()
    });
});

/*
========================================================================
 ROOT API
========================================================================
*/

app.get("/api", (req, res) => {
    res.json({
        ok: true,
        success: true,
        name: "TürkAI",
        version:
            TURKAI_MAIN_CONFIG_10.version,
        message:
            "TürkAI API aktif.",
        endpoints: {
            chat: "/api/chat",
            smartChat: "/api/chat/smart",
            research: "/api/research",
            weather: "/api/weather",
            files: "/api/files",
            memory: "/api/memory/health",
            tasks: "/api/tasks/health",
            auth: "/api/auth/health",
            vault: "/api/vault/health",
            coding: "/api/coding/projects"
        }
    });
});

/*
========================================================================
 SOCKET.IO
========================================================================
*/

if (
    typeof io !== "undefined" &&
    TURKAI_MAIN_CONFIG_10.enableSocket
) {
    io.on("connection", socket => {
        console.log(
            "🔌 TürkAI Socket bağlandı:",
            socket.id
        );

        socket.emit(
            "turkai:connected",
            {
                ok: true,
                service: "TürkAI",
                version:
                    TURKAI_MAIN_CONFIG_10.version,
                socketId:
                    socket.id
            }
        );

        socket.on(
            "user:join",
            data => {
                const userId =
                    String(
                        data?.userId ||
                        "guest"
                    ).slice(0, 150);

                socket.join(
                    "user:" + userId
                );

                socket.emit(
                    "user:joined",
                    {
                        ok: true,
                        userId
                    }
                );
            }
        );

        socket.on(
            "conversation:join",
            data => {
                const id =
                    String(
                        data?.conversationId ||
                        ""
                    );

                if (id) {
                    socket.join(
                        "conversation:" +
                        id
                    );
                }
            }
        );

        socket.on(
            "typing",
            data => {
                const userId =
                    String(
                        data?.userId ||
                        "guest"
                    );

                io.to(
                    "user:" +
                    userId
                ).emit(
                    "typing",
                    {
                        userId,
                        active:
                            Boolean(
                                data?.active
                            )
                    }
                );
            }
        );

        socket.on(
            "disconnect",
            reason => {
                console.log(
                    "🔌 TürkAI Socket ayrıldı:",
                    socket.id,
                    reason
                );
            }
        );
    });
}

/*
========================================================================
 FRONTEND STATIC
========================================================================
*/

const TURKAI_WEB_ROOT_10 =
    typeof ROOT_DIR !== "undefined"
        ? ROOT_DIR
        : __dirname;

/*
 IMPORTANT:
 Static middleware 404'ten ÖNCE olmalı.
*/

app.use(
    express.static(
        TURKAI_WEB_ROOT_10,
        {
            extensions: [
                "html"
            ],
            index: "index.html"
        }
    )
);

/*
========================================================================
 SPA FALLBACK
========================================================================
*/

app.get("*", (req, res, next) => {
    if (
        req.path.startsWith("/api/")
    ) {
        return next();
    }

    const indexPath =
        path.join(
            TURKAI_WEB_ROOT_10,
            "index.html"
        );

    if (
        fs.existsSync(indexPath)
    ) {
        return res.sendFile(
            indexPath
        );
    }

    return res.status(404).send(
        "TürkAI frontend bulunamadı."
    );
});

/*
========================================================================
 FINAL 404
========================================================================
*/

app.use(
    (req, res) => {
        res.status(404).json({
            ok: false,
            success: false,
            error: "Endpoint bulunamadı.",
            path: req.originalUrl
        });
    }
);

/*
========================================================================
 GLOBAL ERROR HANDLER
========================================================================
*/

app.use(
    (
        error,
        req,
        res,
        next
    ) => {
        console.error(
            "TürkAI GLOBAL ERROR:",
            error
        );

        if (
            res.headersSent
        ) {
            return next(error);
        }

        res.status(
            error.status || 500
        ).json({
            ok: false,
            success: false,
            error:
                "Sunucu hatası.",
            details:
                process.env.NODE_ENV ===
                "development"
                    ? error.message
                    : undefined
        });
    }
);

/*
========================================================================
 FINAL STATE
========================================================================
*/

serverState.main = {
    version:
        TURKAI_MAIN_CONFIG_10.version,

    chat: true,
    smartChat: true,
    frontend: true,
    socket: true,
    startup: true,
    errors: true,

    ready: true
};

global.turkAI =
    global.turkAI || {};

global.turkAI.main = {
    version:
        TURKAI_MAIN_CONFIG_10.version,

    name: "TürkAI",

    status: "online",

    modules: {
        ai: true,
        memory: true,
        research: true,
        market: true,
        files: true,
        tasks: true,
        auth: true,
        vault: true,
        coding: true
    }
};

/*
========================================================================
 START SERVER
========================================================================
*/

function startTurkAIServer10() {
    if (
        typeof httpServer === "undefined"
    ) {
        console.error(
            "❌ httpServer bulunamadı. Part 1'de HTTP server oluşturulmalı."
        );

        return;
    }

    if (
        httpServer.listening
    ) {
        console.log(
            "ℹ️ TürkAI server zaten çalışıyor."
        );

        return;
    }

    httpServer.listen(
        TURKAI_MAIN_CONFIG_10.port,
        TURKAI_MAIN_CONFIG_10.host,
        () => {
            console.log("");
            console.log(
                "================================================"
            );
            console.log(
                "🔥 TÜRKAI MASTER SERVER 50.0 AKTİF"
            );
            console.log(
                "================================================"
            );

            console.log(
                "🤖 AI: ONLINE"
            );

            console.log(
                "🧠 MEMORY: ONLINE"
            );

            console.log(
                "🌐 RESEARCH: ONLINE"
            );

            console.log(
                "🌤 MARKET: ONLINE"
            );

            console.log(
                "📁 FILES: ONLINE"
            );

            console.log(
                "⏰ TASKS: ONLINE"
            );

            console.log(
                "🔐 AUTH: ONLINE"
            );

            console.log(
                "💬 CONVERSATIONS: ONLINE"
            );

            console.log(
                "💻 CODING STUDIO: ONLINE"
            );

            console.log(
                "🔌 SOCKET.IO: ONLINE"
            );

            console.log(
                "🌍 PORT:",
                TURKAI_MAIN_CONFIG_10.port
            );

            console.log(
                "🌍 HOST:",
                TURKAI_MAIN_CONFIG_10.host
            );

            console.log(
                "🌍 URL:",
                `http://localhost:${TURKAI_MAIN_CONFIG_10.port}`
            );

            console.log(
                "================================================"
            );
        }
    );
}

/*
========================================================================
 GRACEFUL SHUTDOWN
========================================================================
*/

function shutdownTurkAI10(signal) {
    console.log(
        `\n🛑 ${signal} alındı. TürkAI kapatılıyor...`
    );

    try {
        saveVaultDB9();
    } catch (error) {
        console.error(
            "Vault save error:",
            error.message
        );
    }

    if (
        typeof httpServer !==
        "undefined"
    ) {
        httpServer.close(
            () => {
                console.log(
                    "✅ TürkAI güvenli şekilde kapandı."
                );

                process.exit(0);
            }
        );
    } else {
        process.exit(0);
    }
}

process.on(
    "SIGINT",
    () =>
        shutdownTurkAI10(
            "SIGINT"
        )
);

process.on(
    "SIGTERM",
    () =>
        shutdownTurkAI10(
            "SIGTERM"
        )
);

/*
========================================================================
 UNHANDLED ERRORS
========================================================================
*/

process.on(
    "unhandledRejection",
    error => {
        console.error(
            "⚠️ UNHANDLED REJECTION:",
            error
        );
    }
);

process.on(
    "uncaughtException",
    error => {
        console.error(
            "⚠️ UNCAUGHT EXCEPTION:",
            error
        );
    }
);

/*
========================================================================
 BOOT
========================================================================
*/

startTurkAIServer10();

console.log(
    "🔥🔥🔥 TÜRKAI MASTER SERVER 50.0 — 10/10 TAMAMLANDI 🔥🔥🔥"
);

"use strict";

// ============================================================
// TÜRKAI RESEARCH ENGINE
// PART 1 / 3
// Temel sistem • HTTP • Arama altyapısı • URL işlemleri
// ============================================================

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

let dotenvLoaded = false;

try {
    require("dotenv").config();
    dotenvLoaded = true;
} catch {
    // dotenv zorunlu değil
}

// ============================================================
// PATHS
// ============================================================

const ROOT_DIR = path.resolve(__dirname, "../..");

const DATA_DIR = path.join(ROOT_DIR, "data");
const RESEARCH_DIR = path.join(DATA_DIR, "research");

const CACHE_DIR = path.join(RESEARCH_DIR, "cache");
const LOG_DIR = path.join(RESEARCH_DIR, "logs");

const CACHE_FILE = path.join(RESEARCH_DIR, "research_cache.json");
const HISTORY_FILE = path.join(RESEARCH_DIR, "research_history.json");
const CONFIG_FILE = path.join(RESEARCH_DIR, "research_config.json");


// ============================================================
// DIRECTORY SETUP
// ============================================================

function ensureDirectories() {
    const dirs = [
        DATA_DIR,
        RESEARCH_DIR,
        CACHE_DIR,
        LOG_DIR
    ];

    for (const dir of dirs) {
        try {
            fs.mkdirSync(dir, {
                recursive: true
            });
        } catch {
            // devam
        }
    }
}

ensureDirectories();


// ============================================================
// HELPERS
// ============================================================

function safeString(value, fallback = "") {
    if (value === null || value === undefined) {
        return fallback;
    }

    try {
        return String(value).trim();
    } catch {
        return fallback;
    }
}

function normalize(value) {
    return safeString(value)
        .toLocaleLowerCase("tr-TR")
        .replace(/\s+/g, " ")
        .trim();
}

function cleanText(value, maxLength = 20000) {
    const text = safeString(value);

    if (!text) {
        return "";
    }

    return text
        .replace(/\u0000/g, "")
        .replace(/\r/g, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, maxLength);
}

function clone(value) {
    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return value;
    }
}

function createId(prefix = "research") {
    return (
        prefix +
        "_" +
        Date.now().toString(36) +
        "_" +
        crypto.randomBytes(5).toString("hex")
    );
}

function nowISO() {
    return new Date().toISOString();
}

function number(value, fallback = 0) {
    const n = Number(value);

    return Number.isFinite(n)
        ? n
        : fallback;
}

function boolean(value, fallback = false) {
    if (value === undefined || value === null) {
        return fallback;
    }

    if (typeof value === "boolean") {
        return value;
    }

    const normalized = normalize(value);

    if (["true", "1", "yes", "on", "evet"].includes(normalized)) {
        return true;
    }

    if (["false", "0", "no", "off", "hayır", "hayir"].includes(normalized)) {
        return false;
    }

    return fallback;
}

function getEnv(name, fallback = "") {
    return safeString(process.env[name], fallback);
}


// ============================================================
// JSON STORAGE
// ============================================================

function readJSON(file, fallback) {
    try {
        if (!fs.existsSync(file)) {
            return clone(fallback);
        }

        const raw = fs.readFileSync(file, "utf8");

        if (!raw.trim()) {
            return clone(fallback);
        }

        return JSON.parse(raw);
    } catch {
        return clone(fallback);
    }
}

function writeJSON(file, data) {
    try {
        ensureDirectories();

        fs.writeFileSync(
            file,
            JSON.stringify(data, null, 2),
            "utf8"
        );

        return true;
    } catch {
        return false;
    }
}

function appendJSONLine(file, data) {
    try {
        ensureDirectories();

        fs.appendFileSync(
            file,
            JSON.stringify(data) + "\n",
            "utf8"
        );

        return true;
    } catch {
        return false;
    }
}


// ============================================================
// CONFIG
// ============================================================

const DEFAULT_CONFIG = {
    enabled: true,

    language: "tr",

    maxResults: 8,

    timeoutMs: 15000,

    cacheEnabled: true,

    cacheTTLMinutes: 30,

    historyEnabled: true,

    maxHistory: 500,

    maxContentPerResult: 12000,

    maxTotalResearchCharacters: 60000,

    userAgent:
        "TurkAI-ResearchEngine/1.0 (+https://example.invalid/turkai)",

    providers: {
        duckduckgo: true,
        wikipedia: true,
        directUrl: true
    },

    currentQuestionKeywords: [
        "bugün",
        "şimdi",
        "şu an",
        "son durum",
        "son dakika",
        "güncel",
        "en son",
        "latest",
        "current",
        "news",
        "haber",
        "fiyat",
        "kur",
        "döviz",
        "hava",
        "hava durumu"
    ]
};

let config = readJSON(CONFIG_FILE, DEFAULT_CONFIG);

if (!config || typeof config !== "object") {
    config = clone(DEFAULT_CONFIG);
}

function normalizeConfig(input) {
    const source =
        input && typeof input === "object"
            ? input
            : {};

    return {
        ...clone(DEFAULT_CONFIG),
        ...source,

        maxResults: Math.min(
            Math.max(
                number(source.maxResults, DEFAULT_CONFIG.maxResults),
                1
            ),
            20
        ),

        timeoutMs: Math.min(
            Math.max(
                number(source.timeoutMs, DEFAULT_CONFIG.timeoutMs),
                3000
            ),
            60000
        ),

        cacheTTLMinutes: Math.min(
            Math.max(
                number(
                    source.cacheTTLMinutes,
                    DEFAULT_CONFIG.cacheTTLMinutes
                ),
                1
            ),
            1440
        ),

        maxHistory: Math.min(
            Math.max(
                number(source.maxHistory, DEFAULT_CONFIG.maxHistory),
                50
            ),
            5000
        ),

        maxContentPerResult: Math.min(
            Math.max(
                number(
                    source.maxContentPerResult,
                    DEFAULT_CONFIG.maxContentPerResult
                ),
                1000
            ),
            50000
        ),

        maxTotalResearchCharacters: Math.min(
            Math.max(
                number(
                    source.maxTotalResearchCharacters,
                    DEFAULT_CONFIG.maxTotalResearchCharacters
                ),
                5000
            ),
            500000
        ),

        providers: {
            ...clone(DEFAULT_CONFIG.providers),
            ...(source.providers || {})
        },

        currentQuestionKeywords:
            Array.isArray(source.currentQuestionKeywords)
                ? source.currentQuestionKeywords
                    .map(safeString)
                    .filter(Boolean)
                : clone(DEFAULT_CONFIG.currentQuestionKeywords)
    };
}

config = normalizeConfig(config);

function saveConfig() {
    return writeJSON(CONFIG_FILE, config);
}

function getConfig() {
    return clone(config);
}

function updateConfig(patch = {}) {
    config = normalizeConfig({
        ...config,
        ...(patch || {}),
        providers: {
            ...config.providers,
            ...((patch && patch.providers) || {})
        }
    });

    saveConfig();

    return clone(config);
}


// ============================================================
// CACHE
// ============================================================

let cache = readJSON(CACHE_FILE, {});

if (!cache || typeof cache !== "object" || Array.isArray(cache)) {
    cache = {};
}

function createCacheKey(query, options = {}) {
    const payload = JSON.stringify({
        query: normalize(query),
        language: safeString(options.language || config.language),
        region: safeString(options.region || ""),
        safeSearch: boolean(options.safeSearch, true)
    });

    return crypto
        .createHash("sha256")
        .update(payload)
        .digest("hex");
}

function isCacheValid(entry) {
    if (!entry || typeof entry !== "object") {
        return false;
    }

    const createdAt = new Date(entry.createdAt || 0).getTime();

    if (!Number.isFinite(createdAt)) {
        return false;
    }

    const ttl =
        Math.max(
            number(config.cacheTTLMinutes, 30),
            1
        ) *
        60 *
        1000;

    return (
        Date.now() - createdAt <= ttl
    );
}

function getCache(query, options = {}) {
    if (!config.cacheEnabled) {
        return null;
    }

    const key = createCacheKey(query, options);

    const entry = cache[key];

    if (!entry) {
        return null;
    }

    if (!isCacheValid(entry)) {
        delete cache[key];
        return null;
    }

    return clone(entry.value);
}

function setCache(query, value, options = {}) {
    if (!config.cacheEnabled) {
        return false;
    }

    const key = createCacheKey(query, options);

    cache[key] = {
        key,
        query: safeString(query),
        createdAt: nowISO(),
        value: clone(value)
    };

    return true;
}

function saveCache() {
    return writeJSON(CACHE_FILE, cache);
}

function clearCache() {
    const count = Object.keys(cache).length;

    cache = {};

    saveCache();

    return {
        success: true,
        cleared: count
    };
}

function cleanupCache() {
    let removed = 0;

    for (const [key, entry] of Object.entries(cache)) {
        if (!isCacheValid(entry)) {
            delete cache[key];
            removed++;
        }
    }

    saveCache();

    return {
        removed,
        remaining: Object.keys(cache).length
    };
}


// ============================================================
// RESEARCH HISTORY
// ============================================================

let history = readJSON(HISTORY_FILE, []);

if (!Array.isArray(history)) {
    history = [];
}

function saveHistory() {
    if (!config.historyEnabled) {
        return false;
    }

    return writeJSON(
        HISTORY_FILE,
        history.slice(-config.maxHistory)
    );
}

function addHistory(record) {
    if (!config.historyEnabled) {
        return null;
    }

    const item = {
        id: createId("research"),
        timestamp: nowISO(),
        ...clone(record)
    };

    history.push(item);

    if (history.length > config.maxHistory) {
        history = history.slice(-config.maxHistory);
    }

    saveHistory();

    return clone(item);
}

function getHistory(options = {}) {
    const limit = Math.min(
        Math.max(
            number(options.limit, 50),
            1
        ),
        config.maxHistory
    );

    return clone(
        history.slice(-limit).reverse()
    );
}

function clearHistory() {
    const oldCount = history.length;

    history = [];

    saveHistory();

    return {
        success: true,
        cleared: oldCount
    };
}


// ============================================================
// QUERY ANALYSIS
// ============================================================

const QUESTION_PATTERNS = {
    current: [
        ...DEFAULT_CONFIG.currentQuestionKeywords
    ],

    research: [
        "araştır",
        "araştırır mısın",
        "internetten bak",
        "internette ara",
        "webde ara",
        "web'de ara",
        "kaynak bul",
        "kaynakları bul",
        "detaylı araştır",
        "incele",
        "karşılaştır",
        "güncel bilgi"
    ],

    factual: [
        "nedir",
        "kimdir",
        "ne zaman",
        "nerede",
        "nasıl",
        "neden",
        "niçin",
        "kaç",
        "hangi"
    ]
};

function containsAny(textValue, list) {
    const textValueNormalized = normalize(textValue);

    return list.some(item => {
        const term = normalize(item);

        if (!term) {
            return false;
        }

        return textValueNormalized.includes(term);
    });
}

function detectResearchIntent(query) {
    const textValue = normalize(query);

    if (!textValue) {
        return {
            shouldResearch: false,
            current: false,
            explicit: false,
            factual: false,
            confidence: 0
        };
    }

    const current = containsAny(
        textValue,
        QUESTION_PATTERNS.current
    );

    const explicit = containsAny(
        textValue,
        QUESTION_PATTERNS.research
    );

    const factual = containsAny(
        textValue,
        QUESTION_PATTERNS.factual
    );

    let confidence = 0;

    if (current) confidence += 0.45;
    if (explicit) confidence += 0.45;
    if (factual) confidence += 0.10;

    confidence = Math.min(confidence, 1);

    return {
        shouldResearch:
            explicit ||
            current ||
            confidence >= 0.55,

        current,
        explicit,
        factual,
        confidence
    };
}


// ============================================================
// URL UTILITIES
// ============================================================

function isValidHttpUrl(value) {
    try {
        const url = new URL(value);

        return (
            url.protocol === "http:" ||
            url.protocol === "https:"
        );
    } catch {
        return false;
    }
}

function normalizeUrl(value) {
    const input = safeString(value);

    if (!input) {
        return "";
    }

    try {
        const url = new URL(input);

        url.hash = "";

        return url.toString();
    } catch {
        return input;
    }
}

function domainOf(value) {
    try {
        return new URL(value).hostname
            .replace(/^www\./, "")
            .toLowerCase();
    } catch {
        return "";
    }
}

function isProbablyUrl(value) {
    const input = safeString(value);

    if (!input) {
        return false;
    }

    if (
        /^https?:\/\//i.test(input)
    ) {
        return isValidHttpUrl(input);
    }

    if (
        /^www\./i.test(input)
    ) {
        return isValidHttpUrl(
            "https://" + input
        );
    }

    return false;
}

function ensureProtocol(value) {
    const input = safeString(value);

    if (!input) {
        return "";
    }

    if (/^https?:\/\//i.test(input)) {
        return input;
    }

    if (/^www\./i.test(input)) {
        return "https://" + input;
    }

    return input;
}


// ============================================================
// SEARCH URL BUILDERS
// ============================================================

function buildDuckDuckGoUrl(query, options = {}) {
    const q = safeString(query);

    if (!q) {
        return "";
    }

    const params = new URLSearchParams();

    params.set("q", q);

    if (options.region) {
        params.set(
            "kl",
            safeString(options.region)
        );
    }

    return (
        "https://html.duckduckgo.com/html/?" +
        params.toString()
    );
}

function buildWikipediaSearchUrl(query, options = {}) {
    const language =
        safeString(
            options.language || config.language,
            "tr"
        );

    const safeLanguage =
        /^[a-z]{2,3}$/i.test(language)
            ? language
            : "tr";

    const params = new URLSearchParams();

    params.set(
        "action",
        "query"
    );

    params.set(
        "list",
        "search"
    );

    params.set(
        "srsearch",
        safeString(query)
    );

    params.set(
        "format",
        "json"
    );

    params.set(
        "utf8",
        "1"
    );

    params.set(
        "srlimit",
        String(
            Math.min(
                config.maxResults,
                20
            )
        )
    );

    return (
        `https://${safeLanguage}.wikipedia.org/w/api.php?` +
        params.toString()
    );
}

function buildWikipediaPageUrl(title, options = {}) {
    const language =
        safeString(
            options.language || config.language,
            "tr"
        );

    const safeLanguage =
        /^[a-z]{2,3}$/i.test(language)
            ? language
            : "tr";

    return (
        `https://${safeLanguage}.wikipedia.org/wiki/` +
        encodeURIComponent(
            safeString(title).replace(/\s+/g, "_")
        )
    );
}


// ============================================================
// FETCH ABSTRACTION
// ============================================================

async function fetchText(url, options = {}) {
    if (!isValidHttpUrl(url)) {
        throw new Error("invalid_url");
    }

    if (typeof fetch !== "function") {
        throw new Error(
            "fetch_not_supported_by_node"
        );
    }

    const timeout =
        Math.min(
            Math.max(
                number(
                    options.timeoutMs,
                    config.timeoutMs
                ),
                3000
            ),
            60000
        );

    const controller =
        new AbortController();

    const timer =
        setTimeout(
            () => controller.abort(),
            timeout
        );

    try {
        const headers = {
            "User-Agent":
                safeString(
                    options.userAgent,
                    config.userAgent
                ),

            "Accept":
                safeString(
                    options.accept,
                    "text/html,application/json,text/plain;q=0.9,*/*;q=0.8"
                ),

            "Accept-Language":
                "tr-TR,tr;q=0.9,en;q=0.7"
        };

        const response =
            await fetch(url, {
                method: "GET",
                headers,
                redirect: "follow",
                signal: controller.signal
            });

        const body =
            await response.text();

        return {
            ok: response.ok,
            status: response.status,
            url: response.url || url,
            contentType:
                response.headers.get("content-type") || "",
            body
        };
    } finally {
        clearTimeout(timer);
    }
}

async function fetchJSON(url, options = {}) {
    const result =
        await fetchText(url, {
            ...options,
            accept:
                "application/json,text/plain;q=0.9,*/*;q=0.8"
        });

    let data = null;

    try {
        data = JSON.parse(result.body);
    } catch {
        data = null;
    }

    return {
        ...result,
        data
    };
}


// ============================================================
// HTML CLEANING — TEMEL
// ============================================================

function decodeHtmlEntities(value) {
    return safeString(value)
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
            try {
                return String.fromCodePoint(
                    parseInt(hex, 16)
                );
            } catch {
                return "";
            }
        })
        .replace(/&#(\d+);/g, (_, num) => {
            try {
                return String.fromCodePoint(
                    Number(num)
                );
            } catch {
                return "";
            }
        });
}

function stripHtml(value) {
    const input = safeString(value);

    if (!input) {
        return "";
    }

    return decodeHtmlEntities(
        input
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
            .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
    );
}

function normalizeWhitespace(value) {
    return cleanText(
        safeString(value)
            .replace(/[ \t]+/g, " ")
            .replace(/\n[ \t]+/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
    );
}


// ============================================================
// RESULT MODEL
// ============================================================

function createResearchResult(data = {}) {
    const title = cleanText(
        data.title,
        500
    );

    const url = normalizeUrl(
        data.url
    );

    const snippet = cleanText(
        data.snippet || data.description || "",
        4000
    );

    const content = cleanText(
        data.content || "",
        config.maxContentPerResult
    );

    const source = cleanText(
        data.source || domainOf(url),
        200
    );

    return {
        id: data.id || createId("result"),

        title,

        url,

        source,

        domain:
            safeString(
                data.domain || domainOf(url)
            ),

        snippet,

        content,

        type:
            safeString(
                data.type,
                "web"
            ),

        score:
            number(
                data.score,
                0
            ),

        timestamp:
            data.timestamp ||
            nowISO()
    };
}


// ============================================================
// ENGINE STATE
// ============================================================

const engineState = {
    startedAt: nowISO(),

    requests: 0,
    successful: 0,
    failed: 0,
    cacheHits: 0,

    providerStats: {
        duckduckgo: {
            requests: 0,
            success: 0,
            failure: 0
        },

        wikipedia: {
            requests: 0,
            success: 0,
            failure: 0
        },

        directUrl: {
            requests: 0,
            success: 0,
            failure: 0
        }
    }
};


// ============================================================
// BASIC ENGINE STATUS
// ============================================================

function providerEnabled(name) {
    return boolean(
        config.providers &&
        config.providers[name],
        false
    );
}

function getProviderStats() {
    return clone(
        engineState.providerStats
    );
}

function status() {
    return {
        enabled: config.enabled,
        ready:
            config.enabled === true &&
            typeof fetch === "function",

        dotenvLoaded,

        cacheEnabled:
            config.cacheEnabled,

        historyEnabled:
            config.historyEnabled,

        providers:
            clone(config.providers),

        stats: {
            requests: engineState.requests,
            successful: engineState.successful,
            failed: engineState.failed,
            cacheHits: engineState.cacheHits,

            cacheEntries:
                Object.keys(cache).length,

            historyEntries:
                history.length
        },

        providerStats:
            getProviderStats(),

        startedAt:
            engineState.startedAt,

        timestamp:
            nowISO()
    };
}

function health() {
    const currentStatus = status();

    return {
        ok:
            currentStatus.ready === true,

        module:
            "researchEngine",

        version:
            "1.0.0",

        timestamp:
            nowISO(),

        checks: {
            directories:
                fs.existsSync(RESEARCH_DIR),

            cacheFile:
                fs.existsSync(CACHE_FILE),

            historyFile:
                fs.existsSync(HISTORY_FILE),

            configFile:
                fs.existsSync(CONFIG_FILE),

            fetch:
                typeof fetch === "function"
        }
    };
}


// ============================================================
// PART 1 END
// ============================================================

// Bir sonraki parçada:
// - DuckDuckGo HTML parser
// - Wikipedia parser
// - direkt URL araştırması
// - çoklu kaynak birleştirme
// - skorlandırma
// - duplicate temizleme
// - araştırma özeti hazırlama
// ============================================================
// ============================================================
// TÜRKAI RESEARCH ENGINE
// PART 2 / 3
// Gerçek arama • Wikipedia • Direkt URL • Parser • Skor sistemi
// ============================================================


// ============================================================
// SEARCH RESULT HELPERS
// ============================================================

function cleanSearchTitle(value) {
    return cleanText(
        decodeHtmlEntities(
            safeString(value)
        ),
        500
    );
}

function cleanSearchSnippet(value) {
    return cleanText(
        decodeHtmlEntities(
            stripHtml(
                safeString(value)
            )
        ),
        4000
    );
}

function extractAbsoluteUrl(rawUrl) {
    const input = safeString(rawUrl);

    if (!input) {
        return "";
    }

    if (isValidHttpUrl(input)) {
        return normalizeUrl(input);
    }

    // DuckDuckGo bazen /l/?uddg=https... şeklinde döner
    try {
        if (input.startsWith("/l/")) {
            const full =
                new URL(
                    input,
                    "https://duckduckgo.com"
                );

            const uddg =
                full.searchParams.get("uddg");

            if (uddg && isValidHttpUrl(uddg)) {
                return normalizeUrl(uddg);
            }

            return normalizeUrl(full.toString());
        }
    } catch {
        // devam
    }

    return "";
}


// ============================================================
// DUCKDUCKGO PARSER
// ============================================================

function parseDuckDuckGoResults(html) {
    const source = safeString(html);

    if (!source) {
        return [];
    }

    const results = [];

    // Her result bloğunu mümkün olduğunca izole etmeye çalış
    const blocks =
        source.match(
            /<div[^>]*class=["'][^"']*\bresult\b[^"']*["'][\s\S]*?<\/div>\s*<\/div>/gi
        ) || [];

    // Bazı DDG cevaplarında üstteki blok regex ile yakalanmazsa
    // bağlantıları ayrı olarak tarayacağız.
    if (blocks.length === 0) {
        const anchorRegex =
            /<a[^>]*class=["'][^"']*\bresult__a\b[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

        let match;

        while (
            (match = anchorRegex.exec(source)) !== null
        ) {
            const url =
                extractAbsoluteUrl(match[1]);

            const title =
                cleanSearchTitle(
                    stripHtml(match[2])
                );

            if (!url || !title) {
                continue;
            }

            results.push(
                createResearchResult({
                    title,
                    url,
                    source: "DuckDuckGo",
                    domain: domainOf(url),
                    type: "web-search",
                    score: 0.5
                })
            );

            if (
                results.length >=
                config.maxResults
            ) {
                break;
            }
        }

        return results;
    }

    for (const block of blocks) {
        const titleMatch =
            block.match(
                /<a[^>]*class=["'][^"']*\bresult__a\b[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i
            );

        if (!titleMatch) {
            continue;
        }

        const url =
            extractAbsoluteUrl(
                titleMatch[1]
            );

        const title =
            cleanSearchTitle(
                stripHtml(
                    titleMatch[2]
                )
            );

        const snippetMatch =
            block.match(
                /<(?:a|div)[^>]*class=["'][^"']*\bresult__snippet\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:a|div)>/i
            );

        const snippet =
            snippetMatch
                ? cleanSearchSnippet(
                    snippetMatch[1]
                )
                : "";

        if (!url || !title) {
            continue;
        }

        results.push(
            createResearchResult({
                title,
                url,
                source: "DuckDuckGo",
                domain: domainOf(url),
                snippet,
                type: "web-search",
                score: 0.5
            })
        );

        if (
            results.length >=
            config.maxResults
        ) {
            break;
        }
    }

    return dedupeResults(results);
}


// ============================================================
// WIKIPEDIA SEARCH PARSER
// ============================================================

function parseWikipediaSearchResults(data, options = {}) {
    if (
        !data ||
        typeof data !== "object" ||
        !data.query ||
        !Array.isArray(data.query.search)
    ) {
        return [];
    }

    const results = [];

    for (
        const item of data.query.search
    ) {
        if (!item) {
            continue;
        }

        const title =
            cleanText(
                item.title,
                500
            );

        if (!title) {
            continue;
        }

        const language =
            safeString(
                options.language ||
                config.language ||
                "tr",
                "tr"
            );

        const url =
            buildWikipediaPageUrl(
                title,
                { language }
            );

        const snippet =
            cleanSearchSnippet(
                item.snippet || ""
            );

        results.push(
            createResearchResult({
                title,
                url,
                source: "Wikipedia",
                domain: domainOf(url),
                snippet,
                type: "wikipedia-search",
                score: 0.6
            })
        );

        if (
            results.length >=
            config.maxResults
        ) {
            break;
        }
    }

    return dedupeResults(results);
}


// ============================================================
// WIKIPEDIA SUMMARY
// ============================================================

function buildWikipediaSummaryUrl(
    title,
    options = {}
) {
    const language =
        safeString(
            options.language ||
            config.language ||
            "tr",
            "tr"
        );

    const safeLanguage =
        /^[a-z]{2,3}$/i.test(language)
            ? language
            : "tr";

    return (
        `https://${safeLanguage}.wikipedia.org/api/rest_v1/page/summary/` +
        encodeURIComponent(
            safeString(title)
        )
    );
}

async function fetchWikipediaSummary(
    title,
    options = {}
) {
    const cleanTitle =
        safeString(title);

    if (!cleanTitle) {
        return null;
    }

    if (!providerEnabled("wikipedia")) {
        return null;
    }

    engineState.providerStats.wikipedia.requests++;

    try {
        const url =
            buildWikipediaSummaryUrl(
                cleanTitle,
                options
            );

        const response =
            await fetchJSON(url, {
                timeoutMs:
                    options.timeoutMs ||
                    config.timeoutMs
            });

        if (
            !response.ok ||
            !response.data
        ) {
            engineState.providerStats.wikipedia.failure++;
            return null;
        }

        engineState.providerStats.wikipedia.success++;

        const data =
            response.data;

        return createResearchResult({
            title:
                data.title ||
                cleanTitle,

            url:
                data.content_urls &&
                data.content_urls.desktop &&
                data.content_urls.desktop.page
                    ? data.content_urls.desktop.page
                    : buildWikipediaPageUrl(
                        cleanTitle,
                        options
                    ),

            source: "Wikipedia",

            domain:
                "wikipedia.org",

            snippet:
                data.description ||
                "",

            content:
                data.extract ||
                "",

            type:
                "wikipedia-summary",

            score:
                0.8
        });

    } catch (error) {
        engineState.providerStats.wikipedia.failure++;

        return null;
    }
}


// ============================================================
// DIRECT URL RESEARCH
// ============================================================

function extractTitleFromHtml(html) {
    const source = safeString(html);

    if (!source) {
        return "";
    }

    const titleMatch =
        source.match(
            /<title[^>]*>([\s\S]*?)<\/title>/i
        );

    if (!titleMatch) {
        return "";
    }

    return cleanText(
        stripHtml(
            titleMatch[1]
        ),
        500
    );
}

function extractMetaDescription(html) {
    const source = safeString(html);

    if (!source) {
        return "";
    }

    const patterns = [
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,

        /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i,

        /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["'][^>]*>/i,

        /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["'][^>]*>/i
    ];

    for (const pattern of patterns) {
        const match =
            source.match(pattern);

        if (
            match &&
            match[1]
        ) {
            return cleanText(
                decodeHtmlEntities(
                    stripHtml(match[1])
                ),
                4000
            );
        }
    }

    return "";
}

function extractMainText(html) {
    const source = safeString(html);

    if (!source) {
        return "";
    }

    let content = source;

    // Gürültü alanlarını kaldır
    content =
        content
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
                /<nav[\s\S]*?<\/nav>/gi,
                " "
            )
            .replace(
                /<footer[\s\S]*?<\/footer>/gi,
                " "
            )
            .replace(
                /<header[\s\S]*?<\/header>/gi,
                " "
            )
            .replace(
                /<aside[\s\S]*?<\/aside>/gi,
                " "
            );

    // Paragraf ve başlıkları satır yap
    content =
        content
            .replace(
                /<\/(?:p|div|article|section|li|h1|h2|h3|h4|h5|h6)>/gi,
                "\n"
            )
            .replace(
                /<br\s*\/?>/gi,
                "\n"
            );

    content =
        stripHtml(content);

    return normalizeWhitespace(
        content
    ).slice(
        0,
        config.maxContentPerResult
    );
}

async function fetchDirectUrl(
    url,
    options = {}
) {
    const normalized =
        ensureProtocol(url);

    if (
        !normalized ||
        !isValidHttpUrl(normalized)
    ) {
        return null;
    }

    if (!providerEnabled("directUrl")) {
        return null;
    }

    engineState.providerStats.directUrl.requests++;

    try {
        const response =
            await fetchText(
                normalized,
                {
                    timeoutMs:
                        options.timeoutMs ||
                        config.timeoutMs
                }
            );

        if (!response.ok) {
            engineState.providerStats.directUrl.failure++;

            return null;
        }

        const finalUrl =
            normalizeUrl(
                response.url ||
                normalized
            );

        const contentType =
            normalize(
                response.contentType
            );

        const htmlLike =
            contentType.includes("html") ||
            contentType.includes("xhtml") ||
            /<html[\s>]/i.test(
                response.body
            );

        let title = "";
        let description = "";
        let content = "";

        if (htmlLike) {
            title =
                extractTitleFromHtml(
                    response.body
                );

            description =
                extractMetaDescription(
                    response.body
                );

            content =
                extractMainText(
                    response.body
                );
        } else {
            content =
                cleanText(
                    response.body,
                    config.maxContentPerResult
                );
        }

        const domain =
            domainOf(finalUrl);

        engineState.providerStats.directUrl.success++;

        return createResearchResult({
            title:
                title ||
                domain ||
                finalUrl,

            url:
                finalUrl,

            source:
                "Direct URL",

            domain,

            snippet:
                description,

            content,

            type:
                "direct-url",

            score:
                0.75
        });

    } catch (error) {
        engineState.providerStats.directUrl.failure++;

        return null;
    }
}


// ============================================================
// RESULT QUALITY SCORING
// ============================================================

const LOW_QUALITY_DOMAINS = [
    "facebook.com",
    "instagram.com",
    "tiktok.com",
    "x.com",
    "twitter.com",
    "pinterest.com"
];

const HIGH_VALUE_DOMAINS = [
    "gov.tr",
    "edu.tr",
    "gov",
    "edu",
    "who.int",
    "un.org",
    "reuters.com",
    "bbc.com",
    "nature.com",
    "nasa.gov",
    "wikipedia.org"
];

function scoreResult(
    result,
    query
) {
    if (!result) {
        return 0;
    }

    const q =
        normalize(query);

    const title =
        normalize(result.title);

    const snippet =
        normalize(result.snippet);

    const content =
        normalize(result.content);

    const domain =
        normalize(result.domain);

    let score =
        number(
            result.score,
            0
        );

    // Başlangıç puanı
    score += 0.15;

    // Başlık eşleşmesi
    if (
        q &&
        title.includes(q)
    ) {
        score += 0.35;
    }

    const queryWords =
        q
            .split(/\s+/)
            .filter(
                word => word.length >= 2
            );

    let titleWordMatches = 0;
    let textWordMatches = 0;

    for (const word of queryWords) {
        if (title.includes(word)) {
            titleWordMatches++;
        }

        if (
            snippet.includes(word) ||
            content.includes(word)
        ) {
            textWordMatches++;
        }
    }

    if (queryWords.length > 0) {
        score +=
            (
                titleWordMatches /
                queryWords.length
            ) * 0.30;

        score +=
            (
                textWordMatches /
                queryWords.length
            ) * 0.15;
    }

    // İçeriğin olması kaliteyi yükseltir
    if (
        content.length >= 300
    ) {
        score += 0.10;
    }

    if (
        content.length >= 1500
    ) {
        score += 0.08;
    }

    // Güvenilir alan adları
    if (
        HIGH_VALUE_DOMAINS.some(
            item =>
                domain === item ||
                domain.endsWith("." + item)
        )
    ) {
        score += 0.20;
    }

    // Düşük değerli sosyal kaynaklar
    if (
        LOW_QUALITY_DOMAINS.some(
            item =>
                domain === item ||
                domain.endsWith("." + item)
        )
    ) {
        score -= 0.18;
    }

    // Sonuç URL'si geçersizse düşür
    if (
        !isValidHttpUrl(
            result.url
        )
    ) {
        score -= 0.25;
    }

    return Math.max(
        0,
        Math.min(
            1,
            Number(
                score.toFixed(4)
            )
        )
    );
}


// ============================================================
// DUPLICATE CLEANUP
// ============================================================

function resultIdentity(result) {
    if (!result) {
        return "";
    }

    const url =
        normalizeUrl(
            result.url
        );

    if (url) {
        return url
            .toLowerCase()
            .replace(/\/+$/, "");
    }

    return (
        normalize(
            result.title
        ) +
        "|" +
        normalize(
            result.source
        )
    );
}

function dedupeResults(results) {
    if (!Array.isArray(results)) {
        return [];
    }

    const map =
        new Map();

    for (const item of results) {
        if (!item) {
            continue;
        }

        const result =
            createResearchResult(
                item
            );

        const identity =
            resultIdentity(result);

        if (!identity) {
            continue;
        }

        if (!map.has(identity)) {
            map.set(
                identity,
                result
            );
            continue;
        }

        const existing =
            map.get(identity);

        // İçeriği daha dolu olanı koru
        const existingLength =
            (
                existing.content || ""
            ).length;

        const newLength =
            (
                result.content || ""
            ).length;

        if (
            newLength >
            existingLength
        ) {
            map.set(
                identity,
                {
                    ...existing,
                    ...result
                }
            );

            continue;
        }

        // Yeni sonucun snippet'i daha iyiyse birleştir
        if (
            !existing.snippet &&
            result.snippet
        ) {
            existing.snippet =
                result.snippet;
        }

        // Daha yüksek puanı koru
        existing.score =
            Math.max(
                number(existing.score),
                number(result.score)
            );
    }

    return Array.from(
        map.values()
    );
}


// ============================================================
// SORTING
// ============================================================

function sortResults(
    results,
    query
) {
    return dedupeResults(
        results
            .map(result => ({
                ...result,
                score:
                    scoreResult(
                        result,
                        query
                    )
            }))
            .sort(
                (a, b) =>
                    number(b.score) -
                    number(a.score)
            )
    );
}


// ============================================================
// RESULT LIMITING
// ============================================================

function limitResults(
    results,
    maxResults
) {
    const limit =
        Math.min(
            Math.max(
                number(
                    maxResults,
                    config.maxResults
                ),
                1
            ),
            20
        );

    return Array.isArray(results)
        ? results.slice(0, limit)
        : [];
}


// ============================================================
// SEARCH PROVIDER — DUCKDUCKGO
// ============================================================

async function searchDuckDuckGo(
    query,
    options = {}
) {
    const q =
        safeString(query);

    if (!q) {
        return [];
    }

    if (
        !providerEnabled(
            "duckduckgo"
        )
    ) {
        return [];
    }

    engineState.providerStats.duckduckgo.requests++;

    try {
        const url =
            buildDuckDuckGoUrl(
                q,
                options
            );

        const response =
            await fetchText(
                url,
                {
                    timeoutMs:
                        options.timeoutMs ||
                        config.timeoutMs,

                    accept:
                        "text/html,application/xhtml+xml"
                }
            );

        if (!response.ok) {
            engineState.providerStats.duckduckgo.failure++;

            return [];
        }

        const results =
            parseDuckDuckGoResults(
                response.body
            );

        engineState.providerStats.duckduckgo.success++;

        return results;

    } catch (error) {
        engineState.providerStats.duckduckgo.failure++;

        return [];
    }
}


// ============================================================
// SEARCH PROVIDER — WIKIPEDIA
// ============================================================

async function searchWikipedia(
    query,
    options = {}
) {
    const q =
        safeString(query);

    if (!q) {
        return [];
    }

    if (
        !providerEnabled(
            "wikipedia"
        )
    ) {
        return [];
    }

    try {
        const url =
            buildWikipediaSearchUrl(
                q,
                options
            );

        const response =
            await fetchJSON(
                url,
                {
                    timeoutMs:
                        options.timeoutMs ||
                        config.timeoutMs
                }
            );

        if (
            !response.ok ||
            !response.data
        ) {
            return [];
        }

        const searchResults =
            parseWikipediaSearchResults(
                response.data,
                options
            );

        // İlk birkaç sonuç için özet bilgiyi al
        const enriched = [];

        const enrichmentLimit =
            Math.min(
                3,
                searchResults.length
            );

        for (
            let i = 0;
            i < searchResults.length;
            i++
        ) {
            const item =
                searchResults[i];

            if (
                i < enrichmentLimit
            ) {
                const summary =
                    await fetchWikipediaSummary(
                        item.title,
                        options
                    );

                if (summary) {
                    enriched.push(
                        {
                            ...item,
                            ...summary,

                            type:
                                "wikipedia"
                        }
                    );

                    continue;
                }
            }

            enriched.push(
                item
            );
        }

        return enriched;

    } catch {
        return [];
    }
}


// ============================================================
// GENERAL SEARCH EXECUTION
// ============================================================

async function performSearch(
    query,
    options = {}
) {
    const q =
        safeString(query);

    if (!q) {
        return {
            query: "",
            results: [],
            providers: [],
            cache: false
        };
    }

    const cached =
        getCache(
            q,
            options
        );

    if (cached) {
        engineState.cacheHits++;

        return {
            ...cached,
            cache: true
        };
    }

    engineState.requests++;

    const maxResults =
        Math.min(
            Math.max(
                number(
                    options.maxResults,
                    config.maxResults
                ),
                1
            ),
            20
        );

    const providersUsed = [];

    const allResults = [];

    // DuckDuckGo
    if (
        options.duckduckgo !== false &&
        providerEnabled("duckduckgo")
    ) {
        const ddg =
            await searchDuckDuckGo(
                q,
                options
            );

        if (ddg.length > 0) {
            providersUsed.push(
                "duckduckgo"
            );

            allResults.push(
                ...ddg
            );
        }
    }

    // Wikipedia
    if (
        options.wikipedia !== false &&
        providerEnabled("wikipedia")
    ) {
        const wiki =
            await searchWikipedia(
                q,
                options
            );

        if (wiki.length > 0) {
            providersUsed.push(
                "wikipedia"
            );

            allResults.push(
                ...wiki
            );
        }
    }

    let results =
        sortResults(
            allResults,
            q
        );

    results =
        limitResults(
            results,
            maxResults
        );

    const response = {
        query: q,

        results,

        providers:
            providersUsed,

        resultCount:
            results.length,

        searchedAt:
            nowISO(),

        cache: false
    };

    setCache(
        q,
        response,
        options
    );

    saveCache();

    if (results.length > 0) {
        engineState.successful++;
    } else {
        engineState.failed++;
    }

    return response;
}


// ============================================================
// DIRECT URL AUTO-DETECTION
// ============================================================

async function researchUrl(
    url,
    options = {}
) {
    const target =
        ensureProtocol(url);

    if (
        !target ||
        !isValidHttpUrl(target)
    ) {
        return {
            success: false,
            error: "invalid_url",
            result: null
        };
    }

    const result =
        await fetchDirectUrl(
            target,
            options
        );

    if (!result) {
        return {
            success: false,
            error: "url_fetch_failed",
            result: null
        };
    }

    result.score =
        scoreResult(
            result,
            options.query || result.title
        );

    return {
        success: true,
        result
    };
}


// ============================================================
// COMBINED RESEARCH ROUTER
// ============================================================

async function research(
    query,
    options = {}
) {
    const q =
        safeString(query);

    if (!q) {
        return {
            success: false,
            error: "query_required",
            query: "",
            results: []
        };
    }

    // Kullanıcı direkt URL verdiyse URL aç
    if (
        isProbablyUrl(q)
    ) {
        const direct =
            await researchUrl(
                q,
                options
            );

        if (
            direct.success &&
            direct.result
        ) {
            const result =
                direct.result;

            const response = {
                success: true,

                mode:
                    "direct-url",

                query: q,

                results: [
                    result
                ],

                resultCount: 1,

                providers: [
                    "directUrl"
                ],

                researchedAt:
                    nowISO()
            };

            addHistory({
                mode: "direct-url",
                query: q,
                resultCount: 1,
                providers: [
                    "directUrl"
                ]
            });

            return response;
        }
    }

    // Normal arama
    const intent =
        detectResearchIntent(q);

    const response =
        await performSearch(
            q,
            options
        );

    const finalResponse = {
        success:
            response.results.length > 0,

        mode:
            intent.explicit
                ? "explicit-research"
                : intent.current
                    ? "current-research"
                    : "research",

        query:
            q,

        intent,

        results:
            response.results,

        resultCount:
            response.resultCount,

        providers:
            response.providers,

        cache:
            response.cache,

        researchedAt:
            response.searchedAt
    };

    addHistory({
        mode:
            finalResponse.mode,

        query:
            q,

        intent,

        resultCount:
            finalResponse.resultCount,

        providers:
            finalResponse.providers,

        cache:
            finalResponse.cache
    });

    return finalResponse;
}


// ============================================================
// RELEVANT TEXT COLLECTION
// ============================================================

function collectResearchText(
    results,
    maxCharacters = config.maxTotalResearchCharacters
) {
    if (!Array.isArray(results)) {
        return "";
    }

    const max =
        Math.max(
            number(
                maxCharacters,
                config.maxTotalResearchCharacters
            ),
            1000
        );

    let output = "";

    for (const result of results) {
        if (!result) {
            continue;
        }

        const title =
            cleanText(
                result.title,
                500
            );

        const source =
            cleanText(
                result.source,
                200
            );

        const url =
            cleanText(
                result.url,
                1000
            );

        const snippet =
            cleanText(
                result.snippet,
                4000
            );

        const content =
            cleanText(
                result.content,
                config.maxContentPerResult
            );

        const block = [
            title
                ? `Başlık: ${title}`
                : "",

            source
                ? `Kaynak: ${source}`
                : "",

            url
                ? `URL: ${url}`
                : "",

            snippet
                ? `Özet: ${snippet}`
                : "",

            content
                ? `İçerik: ${content}`
                : ""
        ]
            .filter(Boolean)
            .join("\n");

        if (!block) {
            continue;
        }

        const remaining =
            max -
            output.length;

        if (remaining <= 0) {
            break;
        }

        output +=
            (
                output
                    ? "\n\n"
                    : ""
            ) +
            block.slice(
                0,
                remaining
            );
    }

    return output.slice(
        0,
        max
    );
}


// ============================================================
// SOURCE SUMMARY MODEL
// ============================================================

function summarizeSource(result) {
    if (!result) {
        return null;
    }

    return {
        id:
            result.id,

        title:
            result.title,

        source:
            result.source,

        domain:
            result.domain,

        url:
            result.url,

        snippet:
            result.snippet,

        score:
            number(
                result.score,
                0
            ),

        type:
            result.type
    };
}

function summarizeSources(results) {
    if (!Array.isArray(results)) {
        return [];
    }

    return results
        .map(summarizeSource)
        .filter(Boolean);
}


// ============================================================
// PART 2 END
// ============================================================

// Bir sonraki parçada:
// - otomatik araştırma karar sistemi
// - kaynaklı cevap oluşturma
// - araştırma context'i
// - AI Engine entegrasyonu
// - export'lar
// - cache/history yönetimi
// - shutdown
// ============================================================
// ============================================================
// TÜRKAI RESEARCH ENGINE
// PART 3 / 3
// Otomatik araştırma • Context • Kaynaklar • AI entegrasyonu
// Cache • History • Health • Export • Shutdown
// ============================================================


// ============================================================
// AUTOMATIC RESEARCH DECISION
// ============================================================

function shouldResearch(query, options = {}) {
    const q = safeString(query);

    if (!q) {
        return false;
    }

    if (options.force === true) {
        return true;
    }

    if (options.skip === true) {
        return false;
    }

    if (!config.enabled) {
        return false;
    }

    const intent =
        detectResearchIntent(q);

    return intent.shouldResearch === true;
}


// ============================================================
// QUERY EXTRACTION
// ============================================================

function cleanResearchQuery(query) {
    let q =
        cleanText(
            query,
            4000
        );

    if (!q) {
        return "";
    }

    // Kullanıcının araştırma komutunu asıl sorgudan ayır
    const prefixes = [
        "internette ara",
        "internetten ara",
        "webde ara",
        "web'de ara",
        "araştır",
        "araştırır mısın",
        "detaylı araştır",
        "internetten bak",
        "kaynak bul",
        "kaynakları bul"
    ];

    let normalized =
        normalize(q);

    for (const prefix of prefixes) {
        const p =
            normalize(prefix);

        if (
            normalized.startsWith(p)
        ) {
            q =
                q.slice(
                    prefix.length
                ).trim();

            normalized =
                normalize(q);

            break;
        }
    }

    return q.trim();
}


// ============================================================
// QUERY EXPANSION
// ============================================================

function buildQueryVariants(
    query,
    options = {}
) {
    const q =
        cleanResearchQuery(query);

    if (!q) {
        return [];
    }

    const variants = [q];

    const language =
        normalize(
            options.language ||
            config.language ||
            "tr"
        );

    // Türkçe arama için küçük varyasyonlar
    if (language === "tr") {
        if (
            !normalize(q).includes("nedir") &&
            !normalize(q).includes("ne")
        ) {
            variants.push(
                `${q} nedir`
            );
        }

        if (
            !normalize(q).includes("güncel") &&
            !normalize(q).includes("bugün")
        ) {
            if (
                detectResearchIntent(q).current
            ) {
                variants.push(
                    `${q} güncel`
                );
            }
        }
    }

    // Aynı sorguyu gereksiz yere büyütme
    return Array.from(
        new Set(
            variants
                .map(cleanText)
                .filter(Boolean)
                .slice(0, 3)
        )
    );
}


// ============================================================
// MULTI-QUERY SEARCH
// ============================================================

async function researchMultiple(
    query,
    options = {}
) {
    const variants =
        buildQueryVariants(
            query,
            options
        );

    if (variants.length === 0) {
        return {
            success: false,
            query: "",
            results: [],
            providers: [],
            variants: []
        };
    }

    const allResults = [];
    const providers = [];

    for (const variant of variants) {
        const response =
            await performSearch(
                variant,
                {
                    ...options,

                    // Varyantlarda cache kullanılabilir
                    cacheEnabled:
                        options.cacheEnabled !== false
                }
            );

        if (
            response &&
            Array.isArray(response.results)
        ) {
            allResults.push(
                ...response.results
            );
        }

        if (
            response &&
            Array.isArray(response.providers)
        ) {
            providers.push(
                ...response.providers
            );
        }
    }

    const uniqueProviders =
        Array.from(
            new Set(providers)
        );

    const results =
        limitResults(
            sortResults(
                allResults,
                query
            ),
            options.maxResults ||
            config.maxResults
        );

    return {
        success:
            results.length > 0,

        query:
            cleanResearchQuery(query),

        variants,

        results,

        resultCount:
            results.length,

        providers:
            uniqueProviders,

        searchedAt:
            nowISO()
    };
}


// ============================================================
// FULL RESEARCH PIPELINE
// ============================================================

async function deepResearch(
    query,
    options = {}
) {
    const q =
        cleanResearchQuery(query);

    if (!q) {
        return {
            success: false,
            error: "query_required",
            query: "",
            results: [],
            sources: []
        };
    }

    const started =
        Date.now();

    const intent =
        detectResearchIntent(q);

    // URL ise doğrudan aç
    if (
        isProbablyUrl(q)
    ) {
        const direct =
            await researchUrl(
                q,
                options
            );

        if (
            direct.success &&
            direct.result
        ) {
            const response = {
                success: true,

                mode: "direct-url",

                query: q,

                intent,

                results: [
                    direct.result
                ],

                sources: [
                    summarizeSource(
                        direct.result
                    )
                ],

                resultCount: 1,

                providers: [
                    "directUrl"
                ],

                researchText:
                    collectResearchText(
                        [direct.result]
                    ),

                durationMs:
                    Date.now() - started,

                researchedAt:
                    nowISO()
            };

            addHistory({
                mode:
                    "deep-direct-url",

                query: q,

                resultCount: 1,

                providers: [
                    "directUrl"
                ],

                durationMs:
                    response.durationMs
            });

            return response;
        }
    }

    // Birden fazla sorgu varyantıyla araştır
    const searchResult =
        await researchMultiple(
            q,
            options
        );

    const results =
        Array.isArray(
            searchResult.results
        )
            ? searchResult.results
            : [];

    const researchText =
        collectResearchText(
            results,
            options.maxTotalResearchCharacters ||
            config.maxTotalResearchCharacters
        );

    const response = {
        success:
            results.length > 0,

        mode:
            intent.explicit
                ? "deep-explicit"
                : intent.current
                    ? "deep-current"
                    : "deep",

        query:
            q,

        intent,

        variants:
            searchResult.variants || [],

        results,

        resultCount:
            results.length,

        sources:
            summarizeSources(
                results
            ),

        providers:
            searchResult.providers || [],

        researchText,

        durationMs:
            Date.now() - started,

        researchedAt:
            nowISO(),

        cacheUsed:
            results.some(
                result =>
                    result &&
                    result.type !== "direct-url"
            )
    };

    addHistory({
        mode:
            response.mode,

        query: q,

        resultCount:
            response.resultCount,

        providers:
            response.providers,

        durationMs:
            response.durationMs
    });

    return response;
}


// ============================================================
// AI CONTEXT BUILDER
// ============================================================

function buildAIResearchContext(
    researchResponse,
    options = {}
) {
    if (
        !researchResponse ||
        typeof researchResponse !== "object"
    ) {
        return {
            context: "",
            sources: []
        };
    }

    const sources =
        Array.isArray(
            researchResponse.sources
        )
            ? researchResponse.sources
            : summarizeSources(
                researchResponse.results || []
            );

    const maxChars =
        Math.max(
            number(
                options.maxCharacters,
                config.maxTotalResearchCharacters
            ),
            5000
        );

    let context = "";

    context +=
        "TÜRKAI WEB ARAŞTIRMA BAĞLAMI\n";

    context +=
        `Sorgu: ${safeString(
            researchResponse.query
        )}\n\n`;

    if (
        researchResponse.intent
    ) {
        context +=
            `Araştırma türü: ${
                researchResponse.mode || "research"
            }\n`;

        context +=
            `Güncel soru: ${
                researchResponse.intent.current
                    ? "evet"
                    : "hayır"
            }\n\n`;
    }

    const results =
        Array.isArray(
            researchResponse.results
        )
            ? researchResponse.results
            : [];

    for (
        let i = 0;
        i < results.length;
        i++
    ) {
        const result =
            results[i];

        if (!result) {
            continue;
        }

        const title =
            cleanText(
                result.title,
                500
            );

        const source =
            cleanText(
                result.source,
                200
            );

        const url =
            cleanText(
                result.url,
                1000
            );

        const snippet =
            cleanText(
                result.snippet,
                4000
            );

        const content =
            cleanText(
                result.content,
                config.maxContentPerResult
            );

        const block = [
            `KAYNAK ${i + 1}`,

            title
                ? `Başlık: ${title}`
                : "",

            source
                ? `Kaynak: ${source}`
                : "",

            url
                ? `URL: ${url}`
                : "",

            snippet
                ? `Kısa bilgi: ${snippet}`
                : "",

            content
                ? `İçerik: ${content}`
                : ""
        ]
            .filter(Boolean)
            .join("\n");

        if (!block) {
            continue;
        }

        const remaining =
            maxChars -
            context.length;

        if (
            remaining <= 0
        ) {
            break;
        }

        context +=
            (
                context
                    ? "\n\n"
                    : ""
            ) +
            block.slice(
                0,
                remaining
            );
    }

    context =
        context.slice(
            0,
            maxChars
        );

    return {
        context,
        sources: clone(sources)
    };
}


// ============================================================
// SOURCE-CITATION FORMATTER
// ============================================================

function formatSourceCitation(
    source,
    index
) {
    if (!source) {
        return "";
    }

    const title =
        cleanText(
            source.title ||
            source.source ||
            `Kaynak ${index + 1}`,
            300
        );

    const domain =
        cleanText(
            source.domain ||
            domainOf(source.url),
            200
        );

    const url =
        normalizeUrl(
            source.url
        );

    if (url) {
        return `[${index + 1}] ${title} — ${domain} — ${url}`;
    }

    return `[${index + 1}] ${title} — ${domain}`;
}

function formatSources(
    sources
) {
    if (!Array.isArray(sources)) {
        return "";
    }

    return sources
        .map(
            (source, index) =>
                formatSourceCitation(
                    source,
                    index
                )
        )
        .filter(Boolean)
        .join("\n");
}


// ============================================================
// RESEARCH ANSWER PACKAGE
// ============================================================

function buildResearchAnswerPackage(
    researchResponse,
    options = {}
) {
    if (
        !researchResponse ||
        typeof researchResponse !== "object"
    ) {
        return {
            success: false,
            answer: "",
            sources: []
        };
    }

    const sources =
        Array.isArray(
            researchResponse.sources
        )
            ? researchResponse.sources
            : summarizeSources(
                researchResponse.results || []
            );

    const context =
        buildAIResearchContext(
            researchResponse,
            options
        );

    const sourceText =
        formatSources(
            sources
        );

    const query =
        safeString(
            researchResponse.query
        );

    const instruction =
        [
            "Aşağıdaki web araştırmasını kullanarak kullanıcı sorusunu yanıtla.",
            "Bilgi kaynaklardan çıkarılmalı; uydurma bilgi ekleme.",
            "Kaynaklarda çelişki varsa bunu açıkça belirt.",
            "Güncel bilgi gerekiyorsa araştırma sonuçlarının tarihini dikkate al.",
            "Cevabın sonunda ilgili kaynakları numaralı şekilde belirt.",
            "",
            `Kullanıcı sorusu: ${query}`,
            "",
            context.context,
            "",
            "Kaynak listesi:",
            sourceText
        ]
            .filter(
                line =>
                    line !== undefined &&
                    line !== null
            )
            .join("\n");

    return {
        success:
            context.context.length > 0,

        query,

        instruction,

        researchContext:
            context.context,

        sources:
            clone(sources),

        sourceCount:
            sources.length,

        resultCount:
            Array.isArray(
                researchResponse.results
            )
                ? researchResponse.results.length
                : 0,

        generatedAt:
            nowISO()
    };
}


// ============================================================
// SMART RESEARCH
// ============================================================

async function smartResearch(
    query,
    options = {}
) {
    const q =
        cleanResearchQuery(query);

    if (!q) {
        return {
            success: false,
            error: "query_required"
        };
    }

    const auto =
        shouldResearch(
            q,
            options
        );

    if (!auto) {
        return {
            success: false,

            skipped: true,

            reason:
                "research_not_required",

            query: q,

            intent:
                detectResearchIntent(q),

            results: []
        };
    }

    return deepResearch(
        q,
        options
    );
}


// ============================================================
// CONVENIENCE API
// ============================================================

async function ask(
    query,
    options = {}
) {
    return smartResearch(
        query,
        options
    );
}

async function search(
    query,
    options = {}
) {
    return performSearch(
        query,
        options
    );
}

async function researchCurrent(
    query,
    options = {}
) {
    return deepResearch(
        query,
        {
            ...options,
            force: true
        }
    );
}


// ============================================================
// CACHE MANAGEMENT
// ============================================================

function getCacheStats() {
    const entries =
        Object.values(cache);

    let valid = 0;
    let expired = 0;

    for (const entry of entries) {
        if (isCacheValid(entry)) {
            valid++;
        } else {
            expired++;
        }
    }

    return {
        total:
            entries.length,

        valid,

        expired,

        enabled:
            config.cacheEnabled,

        ttlMinutes:
            config.cacheTTLMinutes
    };
}


// ============================================================
// HISTORY MANAGEMENT
// ============================================================

function getHistoryStats() {
    return {
        total:
            history.length,

        enabled:
            config.historyEnabled,

        max:
            config.maxHistory,

        newest:
            history.length > 0
                ? clone(
                    history[
                        history.length - 1
                    ]
                )
                : null,

        oldest:
            history.length > 0
                ? clone(history[0])
                : null
    };
}


// ============================================================
// ENGINE STATISTICS
// ============================================================

function stats() {
    return {
        version:
            "1.0.0",

        uptimeMs:
            Date.now() -
            new Date(
                engineState.startedAt
            ).getTime(),

        requests:
            engineState.requests,

        successful:
            engineState.successful,

        failed:
            engineState.failed,

        cacheHits:
            engineState.cacheHits,

        successRate:
            engineState.requests > 0
                ? Number(
                    (
                        engineState.successful /
                        engineState.requests
                    ).toFixed(4)
                )
                : 0,

        cache:
            getCacheStats(),

        history:
            getHistoryStats(),

        providers:
            getProviderStats()
    };
}


// ============================================================
// CONFIG / PROVIDER CONTROL
// ============================================================

function setProviderEnabled(
    provider,
    enabled
) {
    const name =
        safeString(provider);

    if (
        !name ||
        !Object.prototype.hasOwnProperty.call(
            config.providers || {},
            name
        )
    ) {
        return {
            success: false,
            error: "unknown_provider"
        };
    }

    config.providers[name] =
        Boolean(enabled);

    saveConfig();

    return {
        success: true,
        provider: name,
        enabled:
            config.providers[name]
    };
}


// ============================================================
// RESET / CLEANUP
// ============================================================

function resetStats() {
    engineState.requests = 0;
    engineState.successful = 0;
    engineState.failed = 0;
    engineState.cacheHits = 0;

    for (
        const provider
        of Object.values(
            engineState.providerStats
        )
    ) {
        provider.requests = 0;
        provider.success = 0;
        provider.failure = 0;
    }

    return {
        success: true,
        timestamp:
            nowISO()
    };
}

function rebuild() {
    ensureDirectories();

    cache =
        readJSON(
            CACHE_FILE,
            {}
        );

    history =
        readJSON(
            HISTORY_FILE,
            []
        );

    if (
        !cache ||
        typeof cache !== "object" ||
        Array.isArray(cache)
    ) {
        cache = {};
    }

    if (
        !Array.isArray(history)
    ) {
        history = [];
    }

    config =
        normalizeConfig(
            readJSON(
                CONFIG_FILE,
                DEFAULT_CONFIG
            )
        );

    saveConfig();
    saveCache();
    saveHistory();

    return {
        success: true,

        cacheEntries:
            Object.keys(cache).length,

        historyEntries:
            history.length,

        config:
            clone(config),

        timestamp:
            nowISO()
    };
}


// ============================================================
// EXPORT DATA
// ============================================================

function exportData() {
    return {
        version:
            "1.0.0",

        exportedAt:
            nowISO(),

        config:
            clone(config),

        cache:
            clone(cache),

        history:
            clone(history),

        stats:
            stats()
    };
}

function importHistory(data) {
    if (!Array.isArray(data)) {
        return {
            success: false,
            error: "invalid_history"
        };
    }

    history =
        data
            .map(item => ({
                id:
                    item.id ||
                    createId("research"),

                timestamp:
                    item.timestamp ||
                    nowISO(),

                ...clone(item)
            }))
            .slice(
                -config.maxHistory
            );

    saveHistory();

    return {
        success: true,
        total:
            history.length
    };
}


// ============================================================
// FULL HEALTH
// ============================================================

function fullHealth() {
    return {
        ...health(),

        status:
            status(),

        stats:
            stats(),

        cache:
            getCacheStats(),

        history:
            getHistoryStats(),

        paths: {
            researchDir:
                RESEARCH_DIR,

            cacheFile:
                CACHE_FILE,

            historyFile:
                HISTORY_FILE,

            configFile:
                CONFIG_FILE
        }
    };
}


// ============================================================
// AUTO SAVE
// ============================================================

let saveTimer = null;

function startAutoSave() {
    if (saveTimer) {
        return;
    }

    saveTimer =
        setInterval(
            () => {
                try {
                    saveCache();
                    saveHistory();
                } catch {
                    // sessiz devam
                }
            },
            30000
        );

    // Node process'in kapanmasını engellemesin
    if (
        saveTimer &&
        typeof saveTimer.unref === "function"
    ) {
        saveTimer.unref();
    }
}

function stopAutoSave() {
    if (!saveTimer) {
        return;
    }

    clearInterval(
        saveTimer
    );

    saveTimer = null;
}


// ============================================================
// SHUTDOWN
// ============================================================

let shuttingDown = false;

function shutdown() {
    if (shuttingDown) {
        return {
            success: true,
            alreadyShutdown: true
        };
    }

    shuttingDown = true;

    stopAutoSave();

    try {
        saveCache();
    } catch {
        // devam
    }

    try {
        saveHistory();
    } catch {
        // devam
    }

    try {
        saveConfig();
    } catch {
        // devam
    }

    return {
        success: true,
        timestamp:
            nowISO()
    };
}


// ============================================================
// STARTUP
// ============================================================

startAutoSave();

process.once(
    "beforeExit",
    () => {
        try {
            shutdown();
        } catch {
            // sessiz kapanış
        }
    }
);


// ============================================================
// FINAL EXPORTS
// ============================================================

module.exports = {

    // ANA ARAŞTIRMA
    research,
    search,
    ask,
    smartResearch,
    deepResearch,
    researchCurrent,
    researchMultiple,

    // KARAR SİSTEMİ
    shouldResearch,
    detectResearchIntent,
    cleanResearchQuery,
    buildQueryVariants,

    // ARAMA
    searchDuckDuckGo,
    searchWikipedia,

    // WIKIPEDIA
    fetchWikipediaSummary,
    buildWikipediaSummaryUrl,

    // DIRECT URL
    fetchDirectUrl,
    researchUrl,

    // PARSERS
    parseDuckDuckGoResults,
    parseWikipediaSearchResults,

    // SONUÇLAR
    createResearchResult,
    dedupeResults,
    sortResults,
    limitResults,
    scoreResult,

    // CONTEXT
    collectResearchText,
    buildAIResearchContext,
    buildResearchAnswerPackage,

    // KAYNAKLAR
    summarizeSource,
    summarizeSources,
    formatSourceCitation,
    formatSources,

    // URL
    isValidHttpUrl,
    normalizeUrl,
    domainOf,
    isProbablyUrl,
    ensureProtocol,

    // CONFIG
    getConfig,
    updateConfig,
    setProviderEnabled,

    // CACHE
    getCache,
    setCache,
    saveCache,
    clearCache,
    cleanupCache,
    getCacheStats,

    // HISTORY
    addHistory,
    getHistory,
    clearHistory,
    saveHistory,
    getHistoryStats,
    importHistory,

    // STATUS
    status,
    health,
    fullHealth,
    stats,
    getProviderStats,

    // VERİ
    exportData,
    rebuild,
    resetStats,

    // SHUTDOWN
    shutdown
};


// ============================================================
// TÜRKAI RESEARCH ENGINE READY
// ============================================================

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

console.log(
    "🌐 TürkAI Research Engine hazır"
);

console.log(
    "🔎 DuckDuckGo :",
    providerEnabled("duckduckgo")
        ? "AKTİF"
        : "KAPALI"
);

console.log(
    "📚 Wikipedia  :",
    providerEnabled("wikipedia")
        ? "AKTİF"
        : "KAPALI"
);

console.log(
    "🔗 Direct URL :",
    providerEnabled("directUrl")
        ? "AKTİF"
        : "KAPALI"
);

console.log(
    "💾 Cache      :",
    config.cacheEnabled
        ? "AKTİF"
        : "KAPALI"
);

console.log(
    "❤️ Health     :",
    health().ok
        ? "OK"
        : "CHECK"
);

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);
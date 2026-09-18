/* ============================================================
   TÜRKAI — app.js
   ULTRA APPLICATION ENGINE
   PART 1 / 2
   ============================================================ */

"use strict";

/*
===============================================================
  TÜRKAI APP CORE
  -------------------------------------------------------------
  Bu dosya:
  - API iletişimi
  - kullanıcı oturumu
  - sohbet sistemi
  - model sistemi
  - Fusion
  - araştırma
  - dosyalar
  - bellek
  - geçmiş
  - bildirimler
  - ayarlar
  - responsive davranış
  - hata yönetimi
  - güvenli UI yardımcıları

  ile ilgili ana uygulama katmanıdır.
===============================================================
*/


/* ============================================================
   01 — GLOBAL CONFIG
   ============================================================ */

const TURKAI_CONFIG = Object.freeze({

    version: "11.0.0",

    apiBase: "",

    endpoints: {
        login: "/api/login",
        register: "/api/register",
        me: "/api/me",

        chat: "/api/chat",
        chats: "/api/chats",

        research: "/api/research",

        upload: "/api/upload",
        files: "/api/files",

        memory: "/api/memory",

        profile: "/api/profile",

        feedback: "/api/feedback",
        corrections: "/api/corrections",

        notifications: "/api/notifications",

        image: "/api/image",

        payment: "/api/payment/create",

        admin: "/api/admin/dashboard"
    },

    storage: {
        token: "turkai_token",
        settings: "turkai_settings",
        chats: "turkai_chats",
        memories: "turkai_memories",
        files: "turkai_files",
        user: "turkai_user"
    },

    limits: {
        maxMessageLength: 50000,
        maxResearchLength: 10000,
        maxFileSize: 10 * 1024 * 1024,
        maxHistoryMessages: 30,
        maxStoredChats: 100
    }

});


/* ============================================================
   02 — APPLICATION STATE
   ============================================================ */

const AppState = {

    initialized: false,

    online: navigator.onLine,

    authenticated: false,

    token:
        localStorage.getItem(
            TURKAI_CONFIG.storage.token
        ) || "",

    user:
        readStorage(
            TURKAI_CONFIG.storage.user,
            null
        ),

    page: "chat",

    chat: {
        id: null,

        messages: [],

        generating: false,

        abortController: null,

        lastUserMessage: "",

        lastAssistantMessage: "",

        lastRequest: null
    },

    model: {
        selected: "turkai-fast",

        fusion: false,

        pickerOpen: false
    },

    research: {
        loading: false,

        lastQuery: "",

        lastResult: null
    },

    files: {
        loading: false,

        uploading: false,

        items: [],

        selected: null
    },

    memory: {
        enabled: true,

        items: []
    },

    history: {
        loading: false,

        items: []
    },

    notifications: {
        items: [],

        unread: 0
    },

    settings: {
        theme: "dark",

        enterToSend: true,

        compactMode: false,

        sound: false,

        notifications: true,

        memoryEnabled: true,

        autoResearch: true,

        saveHistory: true,

        reducedMotion: false
    },

    ui: {
        sidebarOpen: false,

        commandPaletteOpen: false,

        notificationsOpen: false,

        modalOpen: false,

        mobile: window.innerWidth <= 900
    },

    socket: null,

    requestCounter: 0,

    lastError: null

};


/* ============================================================
   03 — MODEL DATABASE
   ============================================================ */

const TURKAI_MODELS = [

    {
        id: "turkai-fast",

        name: "TürkAI Fast",

        icon: "bolt",

        description:
            "Günlük sorular ve hızlı yanıtlar",

        requiredPlan: "free"
    },

    {
        id: "turkai-think",

        name: "TürkAI Think",

        icon: "psychology",

        description:
            "Karmaşık düşünme ve problem çözme",

        requiredPlan: "free"
    },

    {
        id: "turkai-math",

        name: "TürkAI Math",

        icon: "calculate",

        description:
            "Matematik ve hesaplama",

        requiredPlan: "free"
    },

    {
        id: "turkai-code",

        name: "TürkAI Code",

        icon: "code",

        description:
            "Programlama ve hata ayıklama",

        requiredPlan: "pro"
    },

    {
        id: "turkai-research",

        name: "TürkAI Research",

        icon: "travel_explore",

        description:
            "Güncel internet araştırmaları",

        requiredPlan: "pro"
    },

    {
        id: "turkai-writer",

        name: "TürkAI Writer",

        icon: "edit_note",

        description:
            "Yazı, içerik ve metin üretimi",

        requiredPlan: "pro"
    },

    {
        id: "turkai-learn",

        name: "TürkAI Learn",

        icon: "school",

        description:
            "Ders ve öğretici çalışma modu",

        requiredPlan: "pro"
    },

    {
        id: "turkai-creative",

        name: "TürkAI Creative",

        icon: "palette",

        description:
            "Yaratıcı fikir ve tasarım",

        requiredPlan: "plus"
    },

    {
        id: "turkai-file",

        name: "TürkAI File",

        icon: "description",

        description:
            "Dosya ve belge analizi",

        requiredPlan: "plus"
    },

    {
        id: "turkai-security",

        name: "TürkAI Security",

        icon: "shield",

        description:
            "Savunmacı siber güvenlik",

        requiredPlan: "plus"
    },

    {
        id: "turkai-vision",

        name: "TürkAI Vision",

        icon: "visibility",

        description:
            "Görsel ve dosya analizi",

        requiredPlan: "plus"
    },

    {
        id: "turkai-ultra",

        name: "TürkAI Ultra",

        icon: "auto_awesome",

        description:
            "Gelişmiş genel amaçlı profil",

        requiredPlan: "ultra"
    }

];


const PLAN_LEVELS = Object.freeze({

    free: 0,

    pro: 1,

    plus: 2,

    ultra: 3

});


/* ============================================================
   04 — GENERIC HELPERS
   ============================================================ */

function $(selector, root = document) {

    return root.querySelector(selector);

}


function $$(selector, root = document) {

    return Array.from(
        root.querySelectorAll(selector)
    );

}


function byId(id) {

    return document.getElementById(id);

}


function sleep(ms) {

    return new Promise(
        resolve => setTimeout(resolve, ms)
    );

}


function clamp(value, min, max) {

    return Math.min(
        Math.max(value, min),
        max
    );

}


function uid(prefix = "tk") {

    return (
        prefix +
        "_" +
        Date.now() +
        "_" +
        Math.random()
            .toString(36)
            .slice(2, 9)
    );

}


function safeString(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value);

}


function escapeHTML(value) {

    return safeString(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function escapeAttribute(value) {

    return escapeHTML(value)
        .replaceAll("`", "&#96;");

}


function icon(name) {

    return `
        <span class="material-symbols-rounded">
            ${escapeHTML(name)}
        </span>
    `;

}


/* ============================================================
   05 — LOCAL STORAGE
   ============================================================ */

function readStorage(key, fallback = null) {

    try {

        const raw =
            localStorage.getItem(key);

        if (raw === null) {

            return fallback;

        }

        return JSON.parse(raw);

    } catch {

        return fallback;

    }

}


function writeStorage(key, value) {

    try {

        localStorage.setItem(
            key,
            JSON.stringify(value)
        );

        return true;

    } catch {

        return false;

    }

}


function removeStorage(key) {

    try {

        localStorage.removeItem(key);

    } catch {}

}


/* ============================================================
   06 — TOAST SYSTEM
   ============================================================ */

function ensureToastContainer() {

    let container =
        byId("turkaiToastContainer");

    if (container) {

        return container;

    }

    container =
        document.createElement("div");

    container.id =
        "turkaiToastContainer";

    container.className =
        "turkai-toast-container";

    document.body.appendChild(
        container
    );

    return container;

}


function toast(
    message,
    type = "info",
    duration = 3500
) {

    const container =
        ensureToastContainer();

    const icons = {

        success: "check_circle",

        error: "error",

        warning: "warning",

        info: "info"

    };

    const item =
        document.createElement("div");

    item.className =
        `turkai-toast turkai-toast-${type}`;

    item.innerHTML = `

        <span class="turkai-toast-icon">
            ${icon(
                icons[type] || "info"
            )}
        </span>

        <span class="turkai-toast-message">
            ${escapeHTML(message)}
        </span>

        <button
            type="button"
            class="turkai-toast-close"
            aria-label="Kapat"
        >
            ${icon("close")}
        </button>

    `;

    container.appendChild(item);

    const remove = () => {

        if (
            !item.isConnected
        ) {
            return;
        }

        item.classList.add(
            "is-leaving"
        );

        setTimeout(
            () => item.remove(),
            250
        );

    };

    $(
        ".turkai-toast-close",
        item
    )?.addEventListener(
        "click",
        remove
    );

    setTimeout(
        remove,
        duration
    );

    return item;

}


/* ============================================================
   07 — API ENGINE
   ============================================================ */

function buildURL(path) {

    return (
        TURKAI_CONFIG.apiBase +
        path
    );

}


async function apiRequest(
    path,
    options = {}
) {

    const requestId =
        ++AppState.requestCounter;

    const config = {

        method: "GET",

        headers: {},

        credentials: "same-origin",

        ...options

    };

    if (
        !config.headers
    ) {

        config.headers = {};

    }

    if (
        !(
            config.body instanceof FormData
        )
    ) {

        config.headers[
            "Content-Type"
        ] =
            "application/json";

    }

    if (
        AppState.token
    ) {

        config.headers[
            "Authorization"
        ] =
            `Bearer ${AppState.token}`;

    }

    let response;

    try {

        response =
            await fetch(
                buildURL(path),
                config
            );

    } catch (error) {

        AppState.lastError =
            error;

        throw new Error(
            "TürkAI sunucusuna bağlanılamadı."
        );

    }

    let data = null;

    const contentType =
        response.headers.get(
            "content-type"
        ) || "";

    if (
        contentType.includes(
            "application/json"
        )
    ) {

        try {

            data =
                await response.json();

        } catch {

            data = null;

        }

    } else {

        try {

            data =
                await response.text();

        } catch {

            data = null;

        }

    }

    if (
        !response.ok
    ) {

        const message =
            typeof data === "object"
                ? (
                    data?.message ||
                    data?.error ||
                    `Sunucu hatası: ${response.status}`
                )
                : (
                    safeString(data) ||
                    `Sunucu hatası: ${response.status}`
                );

        const error =
            new Error(message);

        error.status =
            response.status;

        error.data =
            data;

        error.requestId =
            requestId;

        throw error;

    }

    return data;

}


async function get(path) {

    return apiRequest(
        path,
        {
            method: "GET"
        }
    );

}


async function post(
    path,
    body
) {

    return apiRequest(
        path,
        {
            method: "POST",
            body: JSON.stringify(body)
        }
    );

}


async function patch(
    path,
    body
) {

    return apiRequest(
        path,
        {
            method: "PATCH",
            body: JSON.stringify(body)
        }
    );

}


async function del(path) {

    return apiRequest(
        path,
        {
            method: "DELETE"
        }
    );

}


/* ============================================================
   08 — BUTTON LOADING
   ============================================================ */

function buttonLoading(
    button,
    loading,
    text = "İşleniyor..."
) {

    if (!button) {

        return;

    }

    if (loading) {

        if (
            !button.dataset.originalHTML
        ) {

            button.dataset.originalHTML =
                button.innerHTML;

        }

        button.disabled =
            true;

        button.classList.add(
            "is-loading"
        );

        button.innerHTML = `

            <span class="turkai-spinner"></span>

            <span>
                ${escapeHTML(text)}
            </span>

        `;

    } else {

        button.disabled =
            false;

        button.classList.remove(
            "is-loading"
        );

        if (
            button.dataset.originalHTML
        ) {

            button.innerHTML =
                button.dataset.originalHTML;

            delete button.dataset.originalHTML;

        }

    }

}


/* ============================================================
   09 — USER / PLAN
   ============================================================ */

function currentPlan() {

    return String(
        AppState.user?.plan ||
        "free"
    ).toLowerCase();

}


function currentPlanLevel() {

    return (
        PLAN_LEVELS[
            currentPlan()
        ] ?? 0
    );

}


function getModel(
    modelId
) {

    return TURKAI_MODELS.find(
        model =>
            model.id === modelId
    );

}


function canUseModel(
    modelId
) {

    const model =
        getModel(modelId);

    if (!model) {

        return false;

    }

    const required =
        PLAN_LEVELS[
            model.requiredPlan
        ] ?? 0;

    return (
        currentPlanLevel() >=
        required
    );

}


function getAvailableModels() {

    return TURKAI_MODELS.filter(
        model =>
            canUseModel(model.id)
    );

}


function updateUserUI() {

    const user =
        AppState.user;

    if (!user) {

        return;

    }

    const name =
        user.name ||
        user.username ||
        "TürkAI Kullanıcısı";

    const email =
        user.email ||
        "";

    const plan =
        currentPlan()
            .toUpperCase();

    $$("[data-user-name]")
        .forEach(
            element => {
                element.textContent =
                    name;
            }
        );

    $$("[data-user-email]")
        .forEach(
            element => {
                element.textContent =
                    email;
            }
        );

    $$("[data-user-plan]")
        .forEach(
            element => {
                element.textContent =
                    plan;
            }
        );

    const initials =
        name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(
                part =>
                    part
                        .charAt(0)
                        .toUpperCase()
            )
            .join("");

    $$("[data-user-avatar]")
        .forEach(
            element => {

                element.textContent =
                    initials || "T";

            }
        );

    const nameInput =
        byId(
            "profileNameInput"
        );

    if (
        nameInput &&
        document.activeElement !==
            nameInput
    ) {

        nameInput.value =
            user.name ||
            user.username ||
            "";

    }

    const emailInput =
        byId(
            "profileEmailInput"
        );

    if (
        emailInput &&
        document.activeElement !==
            emailInput
    ) {

        emailInput.value =
            email;

    }

}


/* ============================================================
   10 — AUTH
   ============================================================ */

async function login(
    username,
    password
) {

    username =
        safeString(
            username
        ).trim();

    password =
        safeString(
            password
        );

    if (
        !username ||
        !password
    ) {

        toast(
            "Kullanıcı adı ve şifre gerekli.",
            "warning"
        );

        return false;

    }

    const button =
        byId(
            "loginSubmit"
        );

    buttonLoading(
        button,
        true,
        "Giriş yapılıyor..."
    );

    try {

        const result =
            await post(
                TURKAI_CONFIG.endpoints.login,
                {
                    username,
                    password
                }
            );

        const token =
            result?.token ||
            result?.accessToken ||
            "";

        if (token) {

            AppState.token =
                token;

            localStorage.setItem(
                TURKAI_CONFIG.storage.token,
                token
            );

        }

        AppState.user =
            result?.user ||
            result?.account ||
            {
                username
            };

        writeStorage(
            TURKAI_CONFIG.storage.user,
            AppState.user
        );

        AppState.authenticated =
            true;

        updateUserUI();

        hideAuthScreens();

        await loadInitialData();

        toast(
            "TürkAI'ya hoş geldin.",
            "success"
        );

        return true;

    } catch (error) {

        toast(
            error.message ||
            "Giriş başarısız.",
            "error",
            5000
        );

        return false;

    } finally {

        buttonLoading(
            button,
            false
        );

    }

}


async function register(
    username,
    email,
    password,
    adminConsent = false
) {

    username =
        safeString(
            username
        ).trim();

    email =
        safeString(
            email
        ).trim();

    password =
        safeString(
            password
        );

    if (
        username.length < 3
    ) {

        toast(
            "Kullanıcı adı en az 3 karakter olmalı.",
            "warning"
        );

        return false;

    }

    if (
        password.length < 6
    ) {

        toast(
            "Şifre en az 6 karakter olmalı.",
            "warning"
        );

        return false;

    }

    const button =
        byId(
            "registerSubmit"
        );

    buttonLoading(
        button,
        true,
        "Hesap oluşturuluyor..."
    );

    try {

        const result =
            await post(
                TURKAI_CONFIG.endpoints.register,
                {
                    username,
                    email,
                    password,

                    /*
                      Admin kalite izleme için
                      kullanıcının açık rızası.
                    */

                    adminConsent:
                        Boolean(
                            adminConsent
                        )
                }
            );

        const token =
            result?.token ||
            result?.accessToken ||
            "";

        if (token) {

            AppState.token =
                token;

            localStorage.setItem(
                TURKAI_CONFIG.storage.token,
                token
            );

        }

        AppState.user =
            result?.user ||
            {
                username,
                email,
                plan: "free"
            };

        writeStorage(
            TURKAI_CONFIG.storage.user,
            AppState.user
        );

        AppState.authenticated =
            true;

        updateUserUI();

        hideAuthScreens();

        await loadInitialData();

        toast(
            "Hesabın başarıyla oluşturuldu.",
            "success"
        );

        return true;

    } catch (error) {

        toast(
            error.message ||
            "Kayıt oluşturulamadı.",
            "error",
            5000
        );

        return false;

    } finally {

        buttonLoading(
            button,
            false
        );

    }

}


async function checkSession() {

    if (
        !AppState.token
    ) {

        AppState.authenticated =
            false;

        showAuthPanel(
            "login"
        );

        return false;

    }

    try {

        const result =
            await get(
                TURKAI_CONFIG.endpoints.me
            );

        AppState.user =
            result?.user ||
            result;

        AppState.authenticated =
            true;

        writeStorage(
            TURKAI_CONFIG.storage.user,
            AppState.user
        );

        updateUserUI();

        hideAuthScreens();

        return true;

    } catch {

        AppState.token =
            "";

        AppState.user =
            null;

        AppState.authenticated =
            false;

        removeStorage(
            TURKAI_CONFIG.storage.token
        );

        removeStorage(
            TURKAI_CONFIG.storage.user
        );

        showAuthPanel(
            "login"
        );

        return false;

    }

}


function logout() {

    AppState.token =
        "";

    AppState.user =
        null;

    AppState.authenticated =
        false;

    AppState.chat.messages =
        [];

    AppState.chat.id =
        null;

    if (
        AppState.socket
    ) {

        try {

            AppState.socket.disconnect();

        } catch {}

        AppState.socket =
            null;

    }

    removeStorage(
        TURKAI_CONFIG.storage.token
    );

    removeStorage(
        TURKAI_CONFIG.storage.user
    );

    location.reload();

}


function showAuthPanel(
    mode = "login"
) {

    const loginPanel =
        byId(
            "loginPanel"
        );

    const registerPanel =
        byId(
            "registerPanel"
        );

    if (loginPanel) {

        loginPanel.classList.toggle(
            "is-active",
            mode === "login"
        );

    }

    if (registerPanel) {

        registerPanel.classList.toggle(
            "is-active",
            mode === "register"
        );

    }

}


function hideAuthScreens() {

    [
        "authScreen",
        "loginScreen",
        "registerScreen"
    ]
        .forEach(
            id => {

                byId(id)
                    ?.classList.add(
                        "is-hidden"
                    );

            }
        );

    byId("appShell")
        ?.classList.remove(
            "is-hidden"
        );

}


/* ============================================================
   11 — SETTINGS
   ============================================================ */

function loadSettings() {

    const saved =
        readStorage(
            TURKAI_CONFIG.storage.settings,
            {}
        );

    AppState.settings = {

        ...AppState.settings,

        ...(saved || {})

    };

    applySettings();

}


function saveSettings() {

    writeStorage(
        TURKAI_CONFIG.storage.settings,
        AppState.settings
    );

    applySettings();

}


function applySettings() {

    document.body.classList.toggle(
        "compact-mode",
        Boolean(
            AppState.settings
                .compactMode
        )
    );

    document.body.dataset.theme =
        AppState.settings.theme;

    $$(
        "[data-setting]"
    )
        .forEach(
            control => {

                const key =
                    control.dataset.setting;

                if (
                    !(
                        key in
                        AppState.settings
                    )
                ) {

                    return;

                }

                if (
                    control.type ===
                    "checkbox"
                ) {

                    control.checked =
                        Boolean(
                            AppState.settings[
                                key
                            ]
                        );

                } else {

                    control.value =
                        AppState.settings[
                            key
                        ];

                }

            }
        );

}


function updateSetting(
    key,
    value
) {

    if (
        !(key in AppState.settings)
    ) {

        return;

    }

    AppState.settings[key] =
        value;

    saveSettings();

}


/* ============================================================
   12 — PAGE ENGINE
   ============================================================ */

const PAGE_TITLES = {

    chat: "Sohbet",

    research: "Araştırma",

    files: "Dosyalar",

    coding: "Kod Stüdyosu",

    memory: "Bellek",

    history: "Geçmiş",

    profile: "Profil",

    plans: "Planlar",

    settings: "Ayarlar",

    help: "Yardım",

    admin: "Admin Merkezi"

};


function showPage(
    page
) {

    if (
        !page
    ) {

        return;

    }

    AppState.page =
        page;

    $$(".screen-view")
        .forEach(
            view => {

                const matches =
                    view.id ===
                        `screen-${page}` ||
                    view.dataset.page ===
                        page;

                view.classList.toggle(
                    "is-active",
                    matches
                );

            }
        );

    $$("[data-page]")
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.page ===
                        page
                );

            }
        );

    const title =
        byId(
            "pageTitle"
        );

    if (title) {

        title.textContent =
            PAGE_TITLES[page] ||
            "TürkAI";

    }

    closeMobileSidebar();

    /*
      Sayfa özel yüklemeleri.
    */

    if (
        page === "history"
    ) {

        loadHistory();

    }

    if (
        page === "memory"
    ) {

        loadMemories();

    }

    if (
        page === "files"
    ) {

        loadFiles();

    }

    if (
        page === "profile"
    ) {

        updateUserUI();

    }

    if (
        page === "plans"
    ) {

        updatePlanUI();

    }

    if (
        page === "admin"
    ) {

        loadAdminDashboard();

    }

}


/* ============================================================
   13 — MODEL SELECTOR
   ============================================================ */

function setModel(
    modelId
) {

    const model =
        getModel(modelId);

    if (!model) {

        return false;

    }

    if (
        !canUseModel(modelId)
    ) {

        toast(
            `${model.name} için ${model.requiredPlan.toUpperCase()} plan gerekli.`,
            "warning",
            4500
        );

        showPage(
            "plans"
        );

        return false;

    }

    AppState.model.selected =
        modelId;

    updateModelSelectorUI();

    renderModelPicker();

    return true;

}


function updateModelSelectorUI() {

    const model =
        getModel(
            AppState.model.selected
        );

    if (!model) {

        return;

    }

    const selector =
        byId(
            "modelSelector"
        );

    if (selector) {

        selector.dataset.model =
            model.id;

        const name =
            $(
                "[data-model-name]",
                selector
            );

        if (name) {

            name.textContent =
                model.name;

        }

        const modelIcon =
            $(
                "[data-model-icon]",
                selector
            );

        if (modelIcon) {

            modelIcon.innerHTML =
                icon(model.icon);

        }

    }

}


function renderModelPicker() {

    const list =
        byId(
            "modelPickerList"
        );

    if (!list) {

        return;

    }

    list.innerHTML = "";

    TURKAI_MODELS
        .forEach(
            model => {

                const allowed =
                    canUseModel(
                        model.id
                    );

                const button =
                    document.createElement(
                        "button"
                    );

                button.type =
                    "button";

                button.className =
                    "model-picker-item";

                button.classList.toggle(
                    "selected",
                    model.id ===
                        AppState.model.selected
                );

                button.classList.toggle(
                    "locked",
                    !allowed
                );

                button.innerHTML = `

                    <span
                        class="model-picker-icon"
                    >
                        ${icon(
                            model.icon
                        )}
                    </span>

                    <span
                        class="model-picker-info"
                    >

                        <strong>
                            ${escapeHTML(
                                model.name
                            )}
                        </strong>

                        <small>
                            ${escapeHTML(
                                model.description
                            )}
                        </small>

                    </span>

                    <span
                        class="model-picker-status"
                    >
                        ${
                            allowed
                                ? icon(
                                    model.id ===
                                        AppState.model.selected
                                        ? "check_circle"
                                        : "chevron_right"
                                  )
                                : icon("lock")
                        }
                    </span>

                `;

                button.addEventListener(
                    "click",
                    () => {

                        if (
                            !allowed
                        ) {

                            toast(
                                `${model.name} kilitli.`,
                                "warning"
                            );

                            return;

                        }

                        setModel(
                            model.id
                        );

                        closeModelPicker();

                    }
                );

                list.appendChild(
                    button
                );

            }
        );

}


function toggleModelPicker() {

    const picker =
        byId(
            "modelPicker"
        );

    if (!picker) {

        return;

    }

    AppState.model.pickerOpen =
        !AppState.model.pickerOpen;

    picker.classList.toggle(
        "is-open",
        AppState.model.pickerOpen
    );

    if (
        AppState.model.pickerOpen
    ) {

        renderModelPicker();

    }

}


function closeModelPicker() {

    const picker =
        byId(
            "modelPicker"
        );

    AppState.model.pickerOpen =
        false;

    picker?.classList.remove(
        "is-open"
    );

}


/* ============================================================
   14 — FUSION ENGINE
   ============================================================ */

function toggleFusion(
    force = null
) {

    AppState.model.fusion =
        force === null
            ? !AppState.model.fusion
            : Boolean(force);

    $$(
        "[data-fusion-toggle]"
    )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    AppState.model.fusion
                );

                button.setAttribute(
                    "aria-pressed",
                    String(
                        AppState.model.fusion
                    )
                );

            }
        );

    const status =
        byId(
            "fusionStatus"
        );

    if (status) {

        status.textContent =
            AppState.model.fusion
                ? "Fusion açık"
                : "Fusion kapalı";

    }

}


/* ============================================================
   15 — CHAT STATE
   ============================================================ */

function createChatId() {

    return uid(
        "chat"
    );

}


function startNewChat() {

    stopGeneration();

    AppState.chat.id =
        createChatId();

    AppState.chat.messages =
        [];

    AppState.chat.lastUserMessage =
        "";

    AppState.chat.lastAssistantMessage =
        "";

    renderChatEmptyState();

    showPage(
        "chat"
    );

    const input =
        byId(
            "messageInput"
        );

    input?.focus();

}


function renderChatEmptyState() {

    const container =
        byId(
            "chatMessages"
        );

    if (!container) {

        return;

    }

    container.innerHTML = `

        <div class="chat-empty-state">

            <div class="chat-empty-icon">

                ${icon(
                    "auto_awesome"
                )}

            </div>

            <h2>
                TürkAI'ya ne yapmak istediğini söyle.
            </h2>

            <p>
                Soru sor, kod yazdır,
                araştırma başlat veya
                dosyanı analiz ettir.
            </p>

            <div
                class="suggestion-grid"
            >

                <button
                    type="button"
                    data-suggestion=
                        "Bana bir konuyu öğret."
                >
                    ${icon("school")}
                    <span>
                        Bir konu öğren
                    </span>
                </button>

                <button
                    type="button"
                    data-suggestion=
                        "Modern bir JavaScript projesi oluştur."
                >
                    ${icon("code")}
                    <span>
                        Kod yaz
                    </span>
                </button>

                <button
                    type="button"
                    data-suggestion=
                        "Güncel bir konu hakkında araştırma yap."
                >
                    ${icon("travel_explore")}
                    <span>
                        Araştır
                    </span>
                </button>

                <button
                    type="button"
                    data-suggestion=
                        "Yeni bir proje fikri geliştir."
                >
                    ${icon("lightbulb")}
                    <span>
                        Fikir geliştir
                    </span>
                </button>

            </div>

        </div>

    `;

}


function addMessage(
    role,
    content,
    options = {}
) {

    const container =
        byId(
            "chatMessages"
        );

    if (!container) {

        return null;

    }

    $(".chat-empty-state", container)
        ?.remove();

    const article =
        document.createElement(
            "article"
        );

    article.className =
        `chat-message chat-message-${role}`;

    article.dataset.messageId =
        options.id ||
        uid("message");

    article.dataset.role =
        role;

    article.innerHTML = `

        <div
            class="message-avatar"
        >
            ${
                role === "user"
                    ? icon("person")
                    : icon("auto_awesome")
            }
        </div>

        <div
            class="message-body"
        >

            <div
                class="message-meta"
            >

                <span>
                    ${
                        role === "user"
                            ? "Sen"
                            : "TürkAI"
                    }
                </span>

                ${
                    options.model
                        ? `
                            <span
                                class="message-model"
                            >
                                ${escapeHTML(
                                    options.model
                                )}
                            </span>
                        `
                        : ""
                }

            </div>

            <div
                class="message-content"
            >
                ${
                    role === "assistant"
                        ? formatAIText(
                            content
                          )
                        : escapeHTML(
                            content
                          )
                              .replaceAll(
                                  "\n",
                                  "<br>"
                              )
                }
            </div>

        </div>

    `;

    container.appendChild(
        article
    );

    if (
        role === "assistant"
    ) {

        attachMessageActions(
            article,
            content
        );

    }

    scrollChat();

    return article;

}


/* ============================================================
   16 — AI TEXT FORMATTER
   ============================================================ */

function formatAIText(
    value
) {

    let text =
        escapeHTML(
            value
        );

    if (!text) {

        return "";

    }

    /*
      Kod bloklarını önce ayırıyoruz.
    */

    const codeBlocks = [];

    text =
        text.replace(
            /```([\s\S]*?)```/g,
            (_, code) => {

                const id =
                    `code_${codeBlocks.length}`;

                codeBlocks.push(
                    code.trim()
                );

                return `
                    <div
                        class="turkai-code-block"
                        data-code-index="${id}"
                    >

                        <div
                            class="turkai-code-head"
                        >

                            <span>
                                ${icon("code")}
                                Kod
                            </span>

                            <button
                                type="button"
                                data-copy-code="${id}"
                            >
                                ${icon(
                                    "content_copy"
                                )}
                                Kopyala
                            </button>

                        </div>

                        <pre><code>${code.trim()}</code></pre>

                    </div>
                `;

            }
        );

    /*
      Başlıklar.
    */

    text =
        text.replace(
            /^### (.*)$/gm,
            "<h4>$1</h4>"
        );

    text =
        text.replace(
            /^## (.*)$/gm,
            "<h3>$1</h3>"
        );

    text =
        text.replace(
            /^# (.*)$/gm,
            "<h2>$1</h2>"
        );

    /*
      Kalın.
    */

    text =
        text.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );

    /*
      Satır içi kod.
    */

    text =
        text.replace(
            /`([^`]+)`/g,
            "<code>$1</code>"
        );

    /*
      Liste.
    */

    text =
        text.replace(
            /^\s*[-*]\s+(.*)$/gm,
            "<li>$1</li>"
        );

    /*
      Ardışık li elementlerini ul içine almak
      için basit dönüşüm.
    */

    text =
        text.replace(
            /(<li>.*<\/li>)/gs,
            "<ul>$1</ul>"
        );

    text =
        text.replace(
            /\n/g,
            "<br>"
        );

    return text;

}


/* ============================================================
   17 — MESSAGE ACTIONS
   ============================================================ */

function attachMessageActions(
    article,
    content
) {

    const body =
        $(".message-body", article);

    if (!body) {

        return;

    }

    const actions =
        document.createElement(
            "div"
        );

    actions.className =
        "message-actions";

    actions.innerHTML = `

        <button
            type="button"
            data-message-like
            title="İyi yanıt"
        >
            ${icon("thumb_up")}
        </button>

        <button
            type="button"
            data-message-dislike
            title="Yanıtı bildir"
        >
            ${icon("thumb_down")}
        </button>

        <button
            type="button"
            data-message-copy
            title="Kopyala"
        >
            ${icon("content_copy")}
        </button>

        <button
            type="button"
            data-message-regenerate
            title="Yeniden oluştur"
        >
            ${icon("refresh")}
        </button>

        <button
            type="button"
            data-message-correct
            title="Düzeltme gönder"
        >
            ${icon("edit_note")}
        </button>

    `;

    body.appendChild(
        actions
    );

    $(
        "[data-message-like]",
        actions
    )?.addEventListener(
        "click",
        () => {

            sendFeedback(
                "positive",
                content
            );

            actions
                .classList.add(
                    "feedback-sent"
                );

        }
    );

    $(
        "[data-message-dislike]",
        actions
    )?.addEventListener(
        "click",
        () => {

            openFeedbackModal(
                content
            );

        }
    );

    $(
        "[data-message-copy]",
        actions
    )?.addEventListener(
        "click",
        () => {

            copyText(
                content
            );

        }
    );

    $(
        "[data-message-regenerate]",
        actions
    )?.addEventListener(
        "click",
        () => {

            regenerateLastAnswer();

        }
    );

    $(
        "[data-message-correct]",
        actions
    )?.addEventListener(
        "click",
        () => {

            openCorrectionModal(
                content
            );

        }
    );

}


/* ============================================================
   18 — CHAT SCROLL
   ============================================================ */

function scrollChat(
    smooth = true
) {

    const container =
        byId(
            "chatMessages"
        );

    if (!container) {

        return;

    }

    requestAnimationFrame(
        () => {

            container.scrollTo({

                top:
                    container.scrollHeight,

                behavior:
                    smooth
                        ? "smooth"
                        : "auto"

            });

        }
    );

}


/* ============================================================
   19 — TYPING INDICATOR
   ============================================================ */

function showTyping() {

    removeTyping();

    const container =
        byId(
            "chatMessages"
        );

    if (!container) {

        return null;

    }

    const item =
        document.createElement(
            "article"
        );

    item.className =
        "chat-message chat-message-assistant typing-message";

    item.innerHTML = `

        <div
            class="message-avatar"
        >
            ${icon(
                "auto_awesome"
            )}
        </div>

        <div
            class="message-body"
        >

            <div
                class="message-meta"
            >
                <span>
                    TürkAI
                </span>
            </div>

            <div
                class="typing-indicator"
            >

                <span></span>
                <span></span>
                <span></span>

                <em>
                    Yanıt hazırlanıyor...
                </em>

            </div>

        </div>

    `;

    container.appendChild(
        item
    );

    scrollChat();

    return item;

}


function removeTyping() {

    $$(".typing-message")
        .forEach(
            element =>
                element.remove()
        );

}


/* ============================================================
   20 — CHAT REQUEST
   ============================================================ */

function buildChatPayload(
    message
) {

    return {

        message,

        text:
            message,

        chatId:
            AppState.chat.id,

        model:
            AppState.model.selected,

        profile:
            AppState.model.selected,

        fusion:
            AppState.model.fusion,

        memory:
            AppState.settings
                .memoryEnabled,

        autoResearch:
            AppState.settings
                .autoResearch,

        history:
            AppState.chat.messages
                .slice(
                    -TURKAI_CONFIG
                        .limits
                        .maxHistoryMessages
                ),

        user: {

            id:
                AppState.user?.id,

            username:
                AppState.user?.username

        }

    };

}


function extractAnswer(
    result
) {

    if (!result) {

        return "";

    }

    if (
        typeof result ===
        "string"
    ) {

        return result;

    }

    return (
        result.answer ||
        result.response ||
        result.text ||
        result.content ||
        result.message ||
        ""
    );

}


/* ============================================================
   21 — SEND MESSAGE
   ============================================================ */

async function sendMessage(
    explicitText = null
) {

    if (
        AppState.chat.generating
    ) {

        return;

    }

    const input =
        byId(
            "messageInput"
        );

    let message =
        explicitText !== null
            ? safeString(
                explicitText
              )
            : safeString(
                input?.value
              );

    message =
        message.trim();

    if (!message) {

        return;

    }

    if (
        message.length >
        TURKAI_CONFIG
            .limits
            .maxMessageLength
    ) {

        toast(
            "Mesaj çok uzun.",
            "warning"
        );

        return;

    }

    if (
        !AppState.authenticated
    ) {

        toast(
            "Önce giriş yapmalısın.",
            "warning"
        );

        showAuthPanel(
            "login"
        );

        return;

    }

    /*
      UI temizliği.
    */

    if (
        input &&
        explicitText === null
    ) {

        input.value =
            "";

        resizeTextarea(
            input
        );

    }

    if (
        !AppState.chat.id
    ) {

        AppState.chat.id =
            createChatId();

    }

    AppState.chat.lastUserMessage =
        message;

    AppState.chat.generating =
        true;

    const sendButton =
        byId(
            "sendButton"
        );

    sendButton?.classList.add(
        "is-generating"
    );

    /*
      Kullanıcı mesajını ekle.
    */

    addMessage(
        "user",
        message
    );

    AppState.chat.messages.push({

        id:
            uid("message"),

        role:
            "user",

        content:
            message,

        timestamp:
            Date.now()

    });

    const typing =
        showTyping();

    try {

        const payload =
            buildChatPayload(
                message
            );

        AppState.chat.lastRequest =
            payload;

        const result =
            await post(
                TURKAI_CONFIG
                    .endpoints
                    .chat,
                payload
            );

        typing?.remove();

        const answer =
            extractAnswer(
                result
            );

        if (!answer) {

            throw new Error(
                "TürkAI boş bir yanıt döndürdü."
            );

        }

        const modelName =
            result?.modelName ||
            result?.model ||
            getModel(
                AppState.model.selected
            )?.name ||
            "TürkAI";

        addMessage(
            "assistant",
            answer,
            {
                model:
                    modelName
            }
        );

        AppState.chat
            .lastAssistantMessage =
                answer;

        AppState.chat.messages.push({

            id:
                uid("message"),

            role:
                "assistant",

            content:
                answer,

            model:
                modelName,

            timestamp:
                Date.now()

        });

        /*
          Kullanım bilgisi.
        */

        updateUsage(
            result?.usage ||
            result?.limits
        );

        /*
          Sunucu chat ID döndürürse
          gerçek ID'yi kullan.
        */

        if (
            result?.chatId
        ) {

            AppState.chat.id =
                result.chatId;

        }

        /*
          Araştırma sonucu varsa sakla.
        */

        if (
            result?.research
        ) {

            AppState.research
                .lastResult =
                result.research;

        }

        /*
          Yerel geçmiş.
        */

        await saveCurrentChat();

        /*
          Kullanıcıya bilgi.
        */

        if (
            result?.fallback
        ) {

            toast(
                "TürkAI yedek yanıt sistemini kullandı.",
                "info",
                2500
            );

        }

    } catch (error) {

        typing?.remove();

        AppState.lastError =
            error;

        renderChatError(
            error
        );

    } finally {

        AppState.chat.generating =
            false;

        sendButton?.classList.remove(
            "is-generating"
        );

    }

}


/* ============================================================
   22 — CHAT ERROR
   ============================================================ */

function renderChatError(
    error
) {

    const container =
        byId(
            "chatMessages"
        );

    if (!container) {

        return;

    }

    const item =
        document.createElement(
            "div"
        );

    item.className =
        "turkai-error-message";

    const message =
        error?.message ||
        "Bilinmeyen bir hata oluştu.";

    item.innerHTML = `

        <div
            class="error-icon"
        >
            ${icon("error")}
        </div>

        <div
            class="error-content"
        >

            <strong>
                Yanıt oluşturulamadı
            </strong>

            <p>
                ${escapeHTML(
                    message
                )}
            </p>

        </div>

        <button
            type="button"
            data-chat-retry
        >
            ${icon("refresh")}
            Tekrar dene
        </button>

    `;

    container.appendChild(
        item
    );

    $(
        "[data-chat-retry]",
        item
    )?.addEventListener(
        "click",
        () => {

            item.remove();

            if (
                AppState.chat
                    .lastUserMessage
            ) {

                sendMessage(
                    AppState.chat
                        .lastUserMessage
                );

            }

        }
    );

    scrollChat();

}


/* ============================================================
   23 — STOP GENERATION
   ============================================================ */

function stopGeneration() {

    if (
        AppState.chat.abortController
    ) {

        try {

            AppState.chat
                .abortController
                .abort();

        } catch {}

    }

    AppState.chat.abortController =
        null;

    AppState.chat.generating =
        false;

    removeTyping();

}


/* ============================================================
   24 — REGENERATE
   ============================================================ */

function regenerateLastAnswer() {

    const messages =
        AppState.chat.messages;

    const lastUser =
        [...messages]
            .reverse()
            .find(
                item =>
                    item.role ===
                    "user"
            );

    if (!lastUser) {

        toast(
            "Yeniden oluşturulacak mesaj yok.",
            "warning"
        );

        return;

    }

    /*
      Son assistant cevabını
      UI'dan kaldır.
    */

    const assistantMessages =
        $$(".chat-message-assistant");

    const lastAssistant =
        assistantMessages
            .filter(
                item =>
                    !item.classList
                        .contains(
                            "typing-message"
                        )
            )
            .pop();

    lastAssistant?.remove();

    /*
      State'deki son assistant mesajını
      kaldır.
    */

    const reversed =
        [...messages]
            .reverse();

    const index =
        messages.length -
        1 -
        reversed.findIndex(
            item =>
                item.role ===
                "assistant"
        );

    if (
        index >= 0
    ) {

        messages.splice(
            index,
            1
        );

    }

    sendMessage(
        lastUser.content
    );

}


/* ============================================================
   25 — USAGE
   ============================================================ */

function updateUsage(
    usage
) {

    if (!usage) {

        return;

    }

    const used =
        Number(
            usage.used ??
            usage.count ??
            usage.current
        );

    const total =
        Number(
            usage.total ??
            usage.limit ??
            usage.max
        );

    if (
        Number.isFinite(
            used
        )
    ) {

        $$("[data-usage-used]")
            .forEach(
                element => {
                    element.textContent =
                        String(
                            used
                        );
                }
            );

    }

    if (
        Number.isFinite(
            total
        )
    ) {

        $$("[data-usage-total]")
            .forEach(
                element => {
                    element.textContent =
                        String(
                            total
                        );
                }
            );

    }

    if (
        Number.isFinite(
            used
        ) &&
        Number.isFinite(
            total
        ) &&
        total > 0
    ) {

        const percent =
            clamp(
                (
                    used /
                    total
                ) * 100,
                0,
                100
            );

        $$(
            "[data-usage-progress]"
        )
            .forEach(
                element => {

                    element.style.width =
                        `${percent}%`;

                }
            );

    }

}


/* ============================================================
   26 — CHAT SAVE
   ============================================================ */

async function saveCurrentChat() {

    if (
        !AppState.settings
            .saveHistory
    ) {

        return;

    }

    const messages =
        AppState.chat.messages;

    if (
        !messages.length
    ) {

        return;

    }

    const firstUser =
        messages.find(
            item =>
                item.role ===
                "user"
        );

    const title =
        firstUser?.content
            ?.slice(0, 80) ||
        "Yeni sohbet";

    const chat = {

        id:
            AppState.chat.id,

        title,

        messages,

        updatedAt:
            Date.now()

    };

    const current =
        readStorage(
            TURKAI_CONFIG
                .storage
                .chats,
            []
        );

    const filtered =
        current.filter(
            item =>
                item.id !==
                chat.id
        );

    filtered.unshift(
        chat
    );

    writeStorage(
        TURKAI_CONFIG
            .storage
            .chats,
        filtered.slice(
            0,
            TURKAI_CONFIG
                .limits
                .maxStoredChats
        )
    );

}


/* ============================================================
   27 — INITIAL DATA
   ============================================================ */

async function loadInitialData() {

    updateUserUI();

    renderModelPicker();

    updateModelSelectorUI();

    try {

        await Promise.allSettled([

            loadHistory(),

            loadMemories(),

            loadFiles(),

            loadNotifications()

        ]);

    } catch {}

    initializeSocket();

}


/* ============================================================
   28 — ONLINE / OFFLINE
   ============================================================ */

function updateNetworkState(
    online
) {

    AppState.online =
        online;

    document.body.dataset.network =
        online
            ? "online"
            : "offline";

    if (
        online
    ) {

        toast(
            "İnternet bağlantısı geri geldi.",
            "success",
            2200
        );

    } else {

        toast(
            "İnternet bağlantısı kesildi. Yerel özellikler kullanılabilir.",
            "warning",
            4000
        );

    }

}


/* ============================================================
   29 — TEXTAREA RESIZE
   ============================================================ */

function resizeTextarea(
    textarea
) {

    if (!textarea) {

        return;

    }

    textarea.style.height =
        "auto";

    const max =
        220;

    textarea.style.height =
        `${Math.min(
            textarea.scrollHeight,
            max
        )}px`;

}


/* ============================================================
   30 — COPY
   ============================================================ */

async function copyText(
    text
) {

    text =
        safeString(
            text
        );

    if (!text) {

        return false;

    }

    try {

        if (
            navigator.clipboard &&
            window.isSecureContext
        ) {

            await navigator
                .clipboard
                .writeText(
                    text
                );

        } else {

            const area =
                document.createElement(
                    "textarea"
                );

            area.value =
                text;

            area.style.position =
                "fixed";

            area.style.opacity =
                "0";

            document.body.appendChild(
                area
            );

            area.focus();

            area.select();

            document.execCommand(
                "copy"
            );

            area.remove();

        }

        toast(
            "Kopyalandı.",
            "success",
            1600
        );

        return true;

    } catch {

        toast(
            "Kopyalama başarısız.",
            "error"
        );

        return false;

    }

}


/* ============================================================
   31 — SIDEBAR
   ============================================================ */

function openMobileSidebar() {

    AppState.ui.sidebarOpen =
        true;

    byId("sidebar")
        ?.classList.add(
            "mobile-open"
        );

    byId("mobileOverlay")
        ?.classList.add(
            "is-active"
        );

}


function closeMobileSidebar() {

    AppState.ui.sidebarOpen =
        false;

    byId("sidebar")
        ?.classList.remove(
            "mobile-open"
        );

    byId("mobileOverlay")
        ?.classList.remove(
            "is-active"
        );

}


/* ============================================================
   32 — AUTH EVENTS
   ============================================================ */

function bindAuthEvents() {

    byId("loginForm")
        ?.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                login(
                    byId(
                        "loginUsername"
                    )?.value,
                    byId(
                        "loginPassword"
                    )?.value
                );

            }
        );

    byId("registerForm")
        ?.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                register(
                    byId(
                        "registerUsername"
                    )?.value,
                    byId(
                        "registerEmail"
                    )?.value,
                    byId(
                        "registerPassword"
                    )?.value,
                    byId(
                        "adminConsent"
                    )?.checked
                );

            }
        );

    $$(
        "[data-auth-switch]"
    )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        showAuthPanel(
                            button.dataset
                                .authSwitch
                        );

                    }
                );

            }
        );

    $$(
        "[data-logout]"
    )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    logout
                );

            }
        );

}


/* ============================================================
   33 — NAVIGATION EVENTS
   ============================================================ */

function bindNavigationEvents() {

    $$(
        "[data-page]"
    )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        showPage(
                            button.dataset.page
                        );

                    }
                );

            }
        );

    byId("newChatButton")
        ?.addEventListener(
            "click",
            startNewChat
        );

    byId("mobileMenuButton")
        ?.addEventListener(
            "click",
            openMobileSidebar
        );

    byId("mobileOverlay")
        ?.addEventListener(
            "click",
            closeMobileSidebar
        );

}


/* ============================================================
   34 — CHAT EVENTS
   ============================================================ */

function bindChatEvents() {

    const input =
        byId(
            "messageInput"
        );

    input?.addEventListener(
        "input",
        () =>
            resizeTextarea(
                input
            )
    );

    input?.addEventListener(
        "keydown",
        event => {

            if (
                event.key !==
                "Enter"
            ) {

                return;

            }

            if (
                event.shiftKey
            ) {

                return;

            }

            if (
                !AppState.settings
                    .enterToSend
            ) {

                return;

            }

            event.preventDefault();

            sendMessage();

        }
    );

    byId("sendButton")
        ?.addEventListener(
            "click",
            sendMessage
        );

    byId("modelSelector")
        ?.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                toggleModelPicker();

            }
        );

    $$(
        "[data-fusion-toggle]"
    )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () =>
                        toggleFusion()
                );

            }
        );

}


/* ============================================================
   35 — SUGGESTIONS
   ============================================================ */

function bindSuggestionEvents() {

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-suggestion]"
                );

            if (!button) {

                return;

            }

            const input =
                byId(
                    "messageInput"
                );

            if (!input) {

                return;

            }

            input.value =
                button.dataset
                    .suggestion ||
                "";

            resizeTextarea(
                input
            );

            input.focus();

        }
    );

}


/* ============================================================
   36 — RESPONSIVE
   ============================================================ */

function handleResize() {

    AppState.ui.mobile =
        window.innerWidth <=
        900;

    if (
        !AppState.ui.mobile
    ) {

        closeMobileSidebar();

    }

}


window.addEventListener(
    "resize",
    handleResize
);


/* ============================================================
   37 — NETWORK EVENTS
   ============================================================ */

window.addEventListener(
    "online",
    () =>
        updateNetworkState(
            true
        )
);

window.addEventListener(
    "offline",
    () =>
        updateNetworkState(
            false
        );


/* ============================================================
   38 — INITIAL LOCAL UI
   ============================================================ */

function initializeLocalUI() {

    loadSettings();

    renderModelPicker();

    updateModelSelectorUI();

    bindAuthEvents();

    bindNavigationEvents();

    bindChatEvents();

    bindSuggestionEvents();

    handleResize();

}


/* ============================================================
   PART 1 SONU
   ============================================================ */

/*
  PART 2 burada devam edecek.

  Bu bölümde:
  - Research
  - Files
  - Memory
  - History
  - Feedback
  - Correction
  - Profile
  - Plans
  - Notifications
  - Admin
  - Socket.IO
  - Image
  - Code Studio
  - Command Palette
  - Modal sistemi
  - Keyboard shortcuts
  - Uygulama boot sistemi

  tamamlanacak.
*/
/* ============================================================
   TÜRKAI — app.js
   PART 2 / 2
   ============================================================ */


/* ============================================================
   39 — RESEARCH ENGINE
   ============================================================ */

async function performResearch(
    query = null
) {

    const input =
        byId("researchInput");

    let text =
        query !== null
            ? safeString(query)
            : safeString(input?.value);

    text = text.trim();

    if (!text) {

        toast(
            "Araştırmak istediğin konuyu yaz.",
            "warning"
        );

        input?.focus();

        return;

    }

    if (
        text.length >
        TURKAI_CONFIG.limits.maxResearchLength
    ) {

        toast(
            "Araştırma sorgusu çok uzun.",
            "warning"
        );

        return;

    }

    if (
        AppState.research.loading
    ) {

        return;

    }

    const button =
        byId("researchButton");

    AppState.research.loading =
        true;

    AppState.research.lastQuery =
        text;

    buttonLoading(
        button,
        true,
        "Araştırılıyor..."
    );

    renderResearchLoading();

    try {

        const result =
            await post(
                TURKAI_CONFIG
                    .endpoints
                    .research,
                {
                    query: text,

                    question: text,

                    mode:
                        "turkai-research",

                    compareSources:
                        true,

                    officialSourcesOnly:
                        false,

                    user:
                        AppState.user
                            ?.username
                }
            );

        AppState.research.lastResult =
            result;

        renderResearchResult(
            result
        );

        toast(
            "Araştırma tamamlandı.",
            "success",
            2200
        );

    } catch (error) {

        renderResearchError(
            error
        );

    } finally {

        AppState.research.loading =
            false;

        buttonLoading(
            button,
            false
        );

    }

}


function renderResearchLoading() {

    const container =
        byId("researchResults");

    if (!container) {

        return;

    }

    container.innerHTML = `

        <div class="research-loading">

            <div class="research-loader">

                <span></span>
                <span></span>
                <span></span>

            </div>

            <strong>
                TürkAI araştırıyor...
            </strong>

            <p>
                Kaynaklar inceleniyor ve
                bilgiler karşılaştırılıyor.
            </p>

        </div>

    `;

}


function renderResearchError(
    error
) {

    const container =
        byId("researchResults");

    if (!container) {

        return;

    }

    container.innerHTML = `

        <div class="turkai-error-message">

            <div class="error-icon">
                ${icon("error")}
            </div>

            <div class="error-content">

                <strong>
                    Araştırma başarısız
                </strong>

                <p>
                    ${escapeHTML(
                        error?.message ||
                        "Araştırma sırasında hata oluştu."
                    )}
                </p>

            </div>

        </div>

    `;

}


function renderResearchResult(
    result
) {

    const container =
        byId("researchResults");

    if (!container) {

        return;

    }

    const answer =
        extractAnswer(result) ||
        result?.summary ||
        result?.result ||
        "Araştırma sonucu bulunamadı.";

    const sources =
        Array.isArray(
            result?.sources
        )
            ? result.sources
            : [];

    const citations =
        Array.isArray(
            result?.citations
        )
            ? result.citations
            : [];

    const sourceList =
        sources.length
            ? sources
            : citations;

    container.innerHTML = `

        <section
            class="research-result"
        >

            <header
                class="research-result-header"
            >

                <div>

                    <span
                        class="eyebrow"
                    >
                        ${icon("travel_explore")}
                        TÜRKAI RESEARCH
                    </span>

                    <h2>
                        Araştırma sonucu
                    </h2>

                </div>

                <button
                    type="button"
                    data-copy-research
                >
                    ${icon("content_copy")}
                    Kopyala
                </button>

            </header>

            <div
                class="research-answer"
            >
                ${formatAIText(answer)}
            </div>

            ${
                sourceList.length
                    ? `
                        <section
                            class="research-sources"
                        >

                            <h3>
                                ${icon("link")}
                                Kaynaklar
                            </h3>

                            <div
                                class="source-list"
                            >

                                ${sourceList
                                    .map(
                                        (
                                            source,
                                            index
                                        ) =>
                                            renderSource(
                                                source,
                                                index
                                            )
                                    )
                                    .join("")}

                            </div>

                        </section>
                    `
                    : ""
            }

        </section>

    `;

    $(
        "[data-copy-research]",
        container
    )?.addEventListener(
        "click",
        () => {

            copyText(
                answer
            );

        }
    );

}


function renderSource(
    source,
    index
) {

    if (
        typeof source ===
        "string"
    ) {

        return `

            <a
                class="source-item"
                href="${escapeAttribute(
                    source
                )}"
                target="_blank"
                rel="noopener noreferrer"
            >

                <span
                    class="source-number"
                >
                    ${index + 1}
                </span>

                <span>
                    ${escapeHTML(
                        source
                    )}
                </span>

                ${icon("open_in_new")}

            </a>

        `;

    }

    const title =
        source?.title ||
        source?.name ||
        `Kaynak ${index + 1}`;

    const url =
        source?.url ||
        source?.link ||
        "";

    const description =
        source?.description ||
        source?.snippet ||
        "";

    return `

        <a
            class="source-item"
            href="${escapeAttribute(
                url || "#"
            )}"
            ${
                url
                    ? `target="_blank" rel="noopener noreferrer"`
                    : ""
            }
        >

            <span
                class="source-number"
            >
                ${index + 1}
            </span>

            <span
                class="source-content"
            >

                <strong>
                    ${escapeHTML(title)}
                </strong>

                ${
                    description
                        ? `
                            <small>
                                ${escapeHTML(
                                    description
                                )}
                            </small>
                        `
                        : ""
                }

            </span>

            ${
                url
                    ? icon("open_in_new")
                    : icon("info")
            }

        </a>

    `;

}


/* ============================================================
   40 — FILE ENGINE
   ============================================================ */

async function loadFiles() {

    const list =
        byId("filesList");

    if (!list) {

        return;

    }

    AppState.files.loading =
        true;

    try {

        const result =
            await get(
                TURKAI_CONFIG
                    .endpoints
                    .files
            );

        const files =
            Array.isArray(result)
                ? result
                : (
                    result?.files ||
                    result?.items ||
                    []
                );

        AppState.files.items =
            files;

        writeStorage(
            TURKAI_CONFIG
                .storage
                .files,
            files
        );

        renderFiles();

    } catch {

        const local =
            readStorage(
                TURKAI_CONFIG
                    .storage
                    .files,
                []
            );

        AppState.files.items =
            Array.isArray(local)
                ? local
                : [];

        renderFiles();

    } finally {

        AppState.files.loading =
            false;

    }

}


function renderFiles() {

    const list =
        byId("filesList");

    if (!list) {

        return;

    }

    const files =
        AppState.files.items;

    if (
        !files.length
    ) {

        list.innerHTML = `

            <div
                class="empty-state"
            >

                <div>
                    ${icon("folder_open")}
                </div>

                <h3>
                    Henüz dosya yok
                </h3>

                <p>
                    Dosya yüklediğinde
                    burada görünecek.
                </p>

            </div>

        `;

        return;

    }

    list.innerHTML =
        files
            .map(
                (
                    file,
                    index
                ) =>
                    renderFileCard(
                        file,
                        index
                    )
            )
            .join("");

}


function renderFileCard(
    file,
    index
) {

    const id =
        file?.id ||
        file?._id ||
        index;

    const name =
        file?.name ||
        file?.filename ||
        "Adsız dosya";

    const size =
        formatFileSize(
            Number(
                file?.size ||
                0
            )
        );

    const type =
        file?.type ||
        file?.mimeType ||
        "Dosya";

    return `

        <article
            class="file-card"
            data-file-id="${escapeAttribute(
                id
            )}"
        >

            <div
                class="file-card-icon"
            >
                ${icon(
                    getFileIcon(type, name)
                )}
            </div>

            <div
                class="file-card-info"
            >

                <strong>
                    ${escapeHTML(name)}
                </strong>

                <span>
                    ${escapeHTML(type)}
                    ${size ? ` · ${size}` : ""}
                </span>

            </div>

            <div
                class="file-card-actions"
            >

                <button
                    type="button"
                    data-file-open
                    data-file-index="${index}"
                    title="Aç"
                >
                    ${icon("visibility")}
                </button>

                <button
                    type="button"
                    data-file-delete
                    data-file-index="${index}"
                    title="Sil"
                >
                    ${icon("delete")}
                </button>

            </div>

        </article>

    `;

}


function getFileIcon(
    type,
    name
) {

    const lower =
        `${type} ${name}`
            .toLowerCase();

    if (
        lower.includes("image") ||
        /\.(png|jpg|jpeg|webp|gif)$/i.test(name)
    ) {

        return "image";

    }

    if (
        lower.includes("pdf") ||
        /\.pdf$/i.test(name)
    ) {

        return "picture_as_pdf";

    }

    if (
        lower.includes("javascript") ||
        /\.js$/i.test(name)
    ) {

        return "javascript";

    }

    if (
        lower.includes("html") ||
        /\.html?$/i.test(name)
    ) {

        return "html";

    }

    if (
        lower.includes("css") ||
        /\.css$/i.test(name)
    ) {

        return "css";

    }

    if (
        /\.(zip|rar|7z)$/i.test(name)
    ) {

        return "folder_zip";

    }

    return "description";

}


function formatFileSize(
    bytes
) {

    if (
        !Number.isFinite(bytes) ||
        bytes <= 0
    ) {

        return "";

    }

    const units =
        [
            "B",
            "KB",
            "MB",
            "GB"
        ];

    let size =
        bytes;

    let index =
        0;

    while (
        size >= 1024 &&
        index < units.length - 1
    ) {

        size /= 1024;

        index++;

    }

    return (
        `${size.toFixed(
            size >= 10 ? 0 : 1
        )} ${units[index]}`
    );

}


/* ============================================================
   41 — FILE UPLOAD
   ============================================================ */

async function uploadFile(
    file
) {

    if (!file) {

        return;

    }

    if (
        file.size >
        TURKAI_CONFIG
            .limits
            .maxFileSize
    ) {

        toast(
            "Dosya boyutu 10 MB sınırını geçiyor.",
            "warning",
            4500
        );

        return;

    }

    if (
        AppState.files.uploading
    ) {

        return;

    }

    const button =
        byId("fileUploadButton");

    AppState.files.uploading =
        true;

    buttonLoading(
        button,
        true,
        "Yükleniyor..."
    );

    try {

        const form =
            new FormData();

        form.append(
            "file",
            file
        );

        form.append(
            "username",
            AppState.user
                ?.username || ""
        );

        form.append(
            "analyze",
            "true"
        );

        const result =
            await apiRequest(
                TURKAI_CONFIG
                    .endpoints
                    .upload,
                {
                    method: "POST",
                    body: form
                }
            );

        const uploaded =
            result?.file ||
            result;

        if (
            uploaded
        ) {

            AppState.files.items
                .unshift(
                    uploaded
                );

        }

        writeStorage(
            TURKAI_CONFIG
                .storage
                .files,
            AppState.files.items
        );

        renderFiles();

        toast(
            "Dosya başarıyla yüklendi.",
            "success"
        );

    } catch (error) {

        toast(
            error.message ||
            "Dosya yüklenemedi.",
            "error",
            4500
        );

    } finally {

        AppState.files.uploading =
            false;

        buttonLoading(
            button,
            false
        );

    }

}


/* ============================================================
   42 — FILE PREVIEW
   ============================================================ */

function openFilePreview(
    file
) {

    if (!file) {

        return;

    }

    const modal =
        byId(
            "filePreviewModal"
        );

    if (!modal) {

        return;

    }

    const title =
        $(
            "[data-file-preview-title]",
            modal
        );

    const content =
        $(
            "[data-file-preview-content]",
            modal
        );

    if (title) {

        title.textContent =
            file.name ||
            file.filename ||
            "Dosya";

    }

    let preview = "";

    if (
        file.content
    ) {

        preview =
            formatAIText(
                safeString(
                    file.content
                )
            );

    } else if (
        file.text
    ) {

        preview =
            formatAIText(
                safeString(
                    file.text
                )
            );

    } else {

        preview = `

            <div
                class="empty-state"
            >

                ${icon("description")}

                <p>
                    Bu dosya için
                    önizleme içeriği
                    bulunamadı.
                </p>

            </div>

        `;

    }

    if (content) {

        content.innerHTML =
            preview;

    }

    openModal(
        modal.id
    );

}


/* ============================================================
   43 — MEMORY ENGINE
   ============================================================ */

async function loadMemories() {

    const list =
        byId("memoryList");

    if (!list) {

        return;

    }

    try {

        const result =
            await get(
                TURKAI_CONFIG
                    .endpoints
                    .memory
            );

        const memories =
            Array.isArray(result)
                ? result
                : (
                    result?.memories ||
                    result?.items ||
                    []
                );

        AppState.memory.items =
            memories;

        writeStorage(
            TURKAI_CONFIG
                .storage
                .memories,
            memories
        );

        renderMemories();

    } catch {

        AppState.memory.items =
            readStorage(
                TURKAI_CONFIG
                    .storage
                    .memories,
                []
            );

        renderMemories();

    }

}


function renderMemories() {

    const list =
        byId("memoryList");

    if (!list) {

        return;

    }

    const memories =
        AppState.memory.items;

    if (
        !memories.length
    ) {

        list.innerHTML = `

            <div
                class="empty-state"
            >

                ${icon("psychology")}

                <h3>
                    Kayıtlı bellek yok
                </h3>

                <p>
                    TürkAI'dan açıkça
                    "bunu belleğe kaydet"
                    istediğinde burada görünür.
                </p>

            </div>

        `;

        return;

    }

    list.innerHTML =
        memories
            .map(
                memory =>
                    renderMemoryCard(
                        memory
                    )
            )
            .join("");

}


function renderMemoryCard(
    memory
) {

    const id =
        memory?.id ||
        memory?._id ||
        "";

    const content =
        memory?.content ||
        memory?.text ||
        memory?.value ||
        "";

    const date =
        memory?.createdAt ||
        memory?.updatedAt ||
        memory?.date;

    return `

        <article
            class="memory-card"
        >

            <div
                class="memory-icon"
            >
                ${icon("memory")}
            </div>

            <div
                class="memory-content"
            >

                <p>
                    ${escapeHTML(
                        content
                    )}
                </p>

                ${
                    date
                        ? `
                            <time>
                                ${formatDate(
                                    date
                                )}
                            </time>
                        `
                        : ""
                }

            </div>

            <button
                type="button"
                data-memory-delete
                data-memory-id="${escapeAttribute(
                    id
                )}"
                title="Belleği sil"
            >
                ${icon("delete")}
            </button>

        </article>

    `;

}


async function deleteMemory(
    id
) {

    if (!id) {

        return;

    }

    try {

        await del(
            `${TURKAI_CONFIG.endpoints.memory}/${encodeURIComponent(
                id
            )}`
        );

        AppState.memory.items =
            AppState.memory.items
                .filter(
                    item =>
                        String(
                            item?.id ||
                            item?._id
                        ) !==
                        String(id)
                );

        writeStorage(
            TURKAI_CONFIG
                .storage
                .memories,
            AppState.memory.items
        );

        renderMemories();

        toast(
            "Bellek silindi.",
            "success"
        );

    } catch (error) {

        toast(
            error.message ||
            "Bellek silinemedi.",
            "error"
        );

    }

}


async function clearMemory() {

    if (
        !confirm(
            "Kayıtlı belleğin tamamı silinsin mi?"
        )
    ) {

        return;

    }

    try {

        await del(
            TURKAI_CONFIG
                .endpoints
                .memory
        );

        AppState.memory.items =
            [];

        writeStorage(
            TURKAI_CONFIG
                .storage
                .memories,
            []
        );

        renderMemories();

        toast(
            "Bellek temizlendi.",
            "success"
        );

    } catch (error) {

        toast(
            error.message ||
            "Bellek temizlenemedi.",
            "error"
        );

    }

}


/* ============================================================
   44 — HISTORY
   ============================================================ */

async function loadHistory() {

    const list =
        byId("historyList");

    if (!list) {

        return;

    }

    AppState.history.loading =
        true;

    try {

        const result =
            await get(
                TURKAI_CONFIG
                    .endpoints
                    .chats
            );

        const chats =
            Array.isArray(result)
                ? result
                : (
                    result?.chats ||
                    result?.items ||
                    []
                );

        AppState.history.items =
            chats;

    } catch {

        AppState.history.items =
            readStorage(
                TURKAI_CONFIG
                    .storage
                    .chats,
                []
            );

    } finally {

        AppState.history.loading =
            false;

        renderHistory();

    }

}


function renderHistory() {

    const list =
        byId("historyList");

    if (!list) {

        return;

    }

    const chats =
        AppState.history.items;

    if (
        !chats.length
    ) {

        list.innerHTML = `

            <div
                class="empty-state"
            >

                ${icon("history")}

                <h3>
                    Sohbet geçmişi boş
                </h3>

                <p>
                    Yaptığın sohbetler
                    burada görünecek.
                </p>

            </div>

        `;

        return;

    }

    list.innerHTML =
        chats
            .map(
                (
                    chat,
                    index
                ) =>
                    `
                    <button
                        type="button"
                        class="history-item"
                        data-chat-id="${escapeAttribute(
                            chat?.id ||
                            chat?._id ||
                            index
                        )}"
                    >

                        <span
                            class="history-icon"
                        >
                            ${icon("chat")}
                        </span>

                        <span
                            class="history-content"
                        >

                            <strong>
                                ${escapeHTML(
                                    chat?.title ||
                                    chat?.name ||
                                    "Sohbet"
                                )}
                            </strong>

                            <small>
                                ${formatDate(
                                    chat?.updatedAt ||
                                    chat?.createdAt
                                )}
                            </small>

                        </span>

                        ${icon("chevron_right")}

                    </button>
                    `
            )
            .join("");

}


async function loadChat(
    chatId
) {

    if (!chatId) {

        return;

    }

    try {

        let chat;

        try {

            chat =
                await get(
                    `${
                        TURKAI_CONFIG
                            .endpoints
                            .chats
                    }/${encodeURIComponent(
                        chatId
                    )}`
                );

        } catch {

            chat =
                AppState.history.items
                    .find(
                        item =>
                            String(
                                item?.id ||
                                item?._id
                            ) ===
                            String(chatId)
                    );

        }

        if (!chat) {

            toast(
                "Sohbet bulunamadı.",
                "warning"
            );

            return;

        }

        const messages =
            chat?.messages ||
            chat?.conversation ||
            [];

        AppState.chat.id =
            chat?.id ||
            chat?._id ||
            chatId;

        AppState.chat.messages =
            Array.isArray(messages)
                ? messages
                : [];

        renderLoadedChat();

        showPage(
            "chat"
        );

    } catch (error) {

        toast(
            error.message ||
            "Sohbet açılamadı.",
            "error"
        );

    }

}


function renderLoadedChat() {

    const container =
        byId("chatMessages");

    if (!container) {

        return;

    }

    container.innerHTML =
        "";

    if (
        !AppState.chat.messages.length
    ) {

        renderChatEmptyState();

        return;

    }

    AppState.chat.messages
        .forEach(
            message => {

                addMessage(
                    message.role ||
                        "assistant",
                    message.content ||
                        message.text ||
                        "",
                    {
                        id:
                            message.id,
                        model:
                            message.model
                    }
                );

            }
        );

    scrollChat(
        false
    );

}


/* ============================================================
   45 — FEEDBACK
   ============================================================ */

let FeedbackContext = {

    content: "",

    type: "negative"

};


function openFeedbackModal(
    content
) {

    FeedbackContext.content =
        content;

    FeedbackContext.type =
        "negative";

    openModal(
        "feedbackModal"
    );

}


async function sendFeedback(
    type,
    content,
    reason = null
) {

    try {

        await post(
            TURKAI_CONFIG
                .endpoints
                .feedback,
            {

                type,

                content,

                reason,

                model:
                    AppState.model
                        .selected,

                page:
                    AppState.page

            }
        );

    } catch {

        /*
          Feedback başarısız olsa bile
          kullanıcı deneyimi bozulmasın.
        */

    }

}


async function submitFeedback() {

    const reason =
        $(
            "input[name='feedbackReason']:checked"
        )?.value ||
        null;

    await sendFeedback(
        FeedbackContext.type,
        FeedbackContext.content,
        reason
    );

    closeModal(
        "feedbackModal"
    );

    toast(
        "Geri bildirimin alındı.",
        "success"
    );

}


/* ============================================================
   46 — CORRECTIONS
   ============================================================ */

let CorrectionContext = {

    content: ""

};


function openCorrectionModal(
    content
) {

    CorrectionContext.content =
        content;

    const input =
        byId(
            "correctionInput"
        );

    if (input) {

        input.value =
            "";

    }

    openModal(
        "correctionModal"
    );

}


async function submitCorrection() {

    const input =
        byId(
            "correctionInput"
        );

    const correction =
        safeString(
            input?.value
        ).trim();

    if (!correction) {

        toast(
            "Düzeltme metnini yaz.",
            "warning"
        );

        input?.focus();

        return;

    }

    try {

        await post(
            TURKAI_CONFIG
                .endpoints
                .corrections,
            {

                original:
                    CorrectionContext.content,

                correction,

                model:
                    AppState.model
                        .selected

            }
        );

        closeModal(
            "correctionModal"
        );

        toast(
            "Düzeltmen incelemeye gönderildi.",
            "success"
        );

    } catch (error) {

        toast(
            error.message ||
            "Düzeltme gönderilemedi.",
            "error"
        );

    }

}


/* ============================================================
   47 — PROFILE
   ============================================================ */

async function saveProfile() {

    const nameInput =
        byId(
            "profileNameInput"
        );

    const emailInput =
        byId(
            "profileEmailInput"
        );

    const name =
        safeString(
            nameInput?.value
        ).trim();

    const email =
        safeString(
            emailInput?.value
        ).trim();

    if (!name) {

        toast(
            "İsim boş bırakılamaz.",
            "warning"
        );

        return;

    }

    const button =
        byId(
            "saveProfileButton"
        );

    buttonLoading(
        button,
        true,
        "Kaydediliyor..."
    );

    try {

        const result =
            await patch(
                TURKAI_CONFIG
                    .endpoints
                    .profile,
                {
                    name,
                    email
                }
            );

        AppState.user =
            result?.user ||
            {
                ...AppState.user,
                name,
                email
            };

        writeStorage(
            TURKAI_CONFIG
                .storage
                .user,
            AppState.user
        );

        updateUserUI();

        toast(
            "Profil güncellendi.",
            "success"
        );

    } catch (error) {

        toast(
            error.message ||
            "Profil güncellenemedi.",
            "error"
        );

    } finally {

        buttonLoading(
            button,
            false
        );

    }

}


/* ============================================================
   48 — PLANS
   ============================================================ */

const PLAN_DATA = {

    free: {

        name: "Free",

        price: 0,

        color: "free",

        features: [
            "Temel TürkAI sohbeti",
            "Günlük kullanım limiti",
            "Temel modeller",
            "Temel geçmiş"
        ]

    },

    pro: {

        name: "Pro",

        price: 250,

        color: "pro",

        features: [
            "Gelişmiş modeller",
            "Kod modu",
            "Research",
            "Daha yüksek kullanım",
            "Gelişmiş bellek"
        ]

    },

    plus: {

        name: "Plus",

        price: 500,

        color: "plus",

        features: [
            "Plus modeller",
            "Dosya analizi",
            "Security modu",
            "Vision modu",
            "Görsel üretim"
        ]

    },

    ultra: {

        name: "Ultra",

        price: 6000,

        color: "ultra",

        features: [
            "Ultra profil",
            "En yüksek limitler",
            "Gelişmiş özellikler",
            "Öncelikli işlem",
            "Ultra araçları"
        ]

    }

};


function updatePlanUI() {

    const plan =
        currentPlan();

    $$("[data-current-plan]")
        .forEach(
            element => {

                element.textContent =
                    plan.toUpperCase();

            }
        );

    $$("[data-plan-card]")
        .forEach(
            card => {

                const id =
                    card.dataset
                        .planCard;

                card.classList.toggle(
                    "current",
                    id === plan
                );

            }
        );

}


async function purchasePlan(
    plan
) {

    const data =
        PLAN_DATA[plan];

    if (!data) {

        return;

    }

    if (
        plan ===
        currentPlan()
    ) {

        toast(
            "Bu planı zaten kullanıyorsun.",
            "info"
        );

        return;

    }

    try {

        const result =
            await post(
                TURKAI_CONFIG
                    .endpoints
                    .payment,
                {

                    plan,

                    amount:
                        data.price,

                    currency:
                        "TRY"

                }
            );

        if (
            result?.url
        ) {

            window.location.href =
                result.url;

            return;

        }

        if (
            result?.checkoutUrl
        ) {

            window.location.href =
                result.checkoutUrl;

            return;

        }

        toast(
            result?.message ||
            "Ödeme işlemi başlatıldı.",
            "info"
        );

    } catch (error) {

        toast(
            error.message ||
            "Ödeme başlatılamadı.",
            "error"
        );

    }

}


/* ============================================================
   49 — NOTIFICATIONS
   ============================================================ */

async function loadNotifications() {

    try {

        const result =
            await get(
                TURKAI_CONFIG
                    .endpoints
                    .notifications
            );

        const items =
            Array.isArray(result)
                ? result
                : (
                    result?.notifications ||
                    result?.items ||
                    []
                );

        AppState.notifications.items =
            items;

        AppState.notifications.unread =
            items.filter(
                item =>
                    !item?.read
            ).length;

        renderNotifications();

    } catch {

        renderNotifications();

    }

}


function renderNotifications() {

    const list =
        byId(
            "notificationsList"
        );

    if (!list) {

        return;

    }

    const items =
        AppState.notifications.items;

    const button =
        byId(
            "notificationButton"
        );

    if (button) {

        button.dataset.unread =
            String(
                AppState.notifications
                    .unread
            );

    }

    if (
        !items.length
    ) {

        list.innerHTML = `

            <div
                class="empty-state compact"
            >

                ${icon("notifications_none")}

                <p>
                    Yeni bildirim yok.
                </p>

            </div>

        `;

        return;

    }

    list.innerHTML =
        items
            .slice(
                0,
                30
            )
            .map(
                item => `

                    <article
                        class="notification-item ${
                            item?.read
                                ? ""
                                : "unread"
                        }"
                    >

                        <div
                            class="notification-icon"
                        >
                            ${icon(
                                item?.icon ||
                                "notifications"
                            )}
                        </div>

                        <div>

                            <strong>
                                ${escapeHTML(
                                    item?.title ||
                                    "TürkAI"
                                )}
                            </strong>

                            <p>
                                ${escapeHTML(
                                    item?.message ||
                                    item?.content ||
                                    ""
                                )}
                            </p>

                            ${
                                item?.createdAt
                                    ? `
                                        <time>
                                            ${formatDate(
                                                item.createdAt
                                            )}
                                        </time>
                                    `
                                    : ""
                            }

                        </div>

                    </article>

                `
            )
            .join("");

}


/* ============================================================
   50 — ADMIN DASHBOARD
   ============================================================ */

async function loadAdminDashboard() {

    const container =
        byId(
            "adminDashboard"
        );

    if (!container) {

        return;

    }

    if (
        !AppState.user?.isAdmin &&
        AppState.user?.role !== "admin"
    ) {

        container.innerHTML = `

            <div
                class="empty-state"
            >

                ${icon("lock")}

                <h3>
                    Yetkisiz erişim
                </h3>

                <p>
                    Bu alan yalnızca
                    yetkili hesaplar içindir.
                </p>

            </div>

        `;

        return;

    }

    container.innerHTML = `

        <div
            class="admin-loading"
        >

            ${icon("progress_activity")}

            Yönetim verileri yükleniyor...

        </div>

    `;

    try {

        const result =
            await get(
                TURKAI_CONFIG
                    .endpoints
                    .admin
            );

        renderAdminDashboard(
            result
        );

    } catch (error) {

        container.innerHTML = `

            <div
                class="turkai-error-message"
            >

                ${icon("error")}

                <p>
                    ${escapeHTML(
                        error.message ||
                        "Admin verileri alınamadı."
                    )}
                </p>

            </div>

        `;

    }

}


function renderAdminDashboard(
    data
) {

    const container =
        byId(
            "adminDashboard"
        );

    if (!container) {

        return;

    }

    const users =
        Number(
            data?.users ??
            data?.totalUsers ??
            0
        );

    const messages =
        Number(
            data?.messages ??
            data?.totalMessages ??
            0
        );

    const research =
        Number(
            data?.research ??
            data?.researchCount ??
            0
        );

    const errors =
        Number(
            data?.errors ??
            data?.errorCount ??
            0
        );

    container.innerHTML = `

        <section
            class="admin-stats"
        >

            <article
                class="admin-stat"
            >

                <span>
                    ${icon("group")}
                </span>

                <strong>
                    ${users}
                </strong>

                <small>
                    Kullanıcı
                </small>

            </article>

            <article
                class="admin-stat"
            >

                <span>
                    ${icon("forum")}
                </span>

                <strong>
                    ${messages}
                </strong>

                <small>
                    Mesaj
                </small>

            </article>

            <article
                class="admin-stat"
            >

                <span>
                    ${icon("travel_explore")}
                </span>

                <strong>
                    ${research}
                </strong>

                <small>
                    Araştırma
                </small>

            </article>

            <article
                class="admin-stat"
            >

                <span>
                    ${icon("error")}
                </span>

                <strong>
                    ${errors}
                </strong>

                <small>
                    Hata
                </small>

            </article>

        </section>

        <section
            class="admin-panel-content"
        >

            <h3>
                ${icon("monitoring")}
                TürkAI Denetçi
            </h3>

            <p>
                Sistem; hatalı yanıt,
                gereksiz araştırma,
                teknik hata, güvenlik
                uyarısı ve kullanıcı
                geri bildirimlerini
                izleyebilir.
            </p>

        </section>

    `;

}


/* ============================================================
   51 — MODAL ENGINE
   ============================================================ */

function openModal(
    id
) {

    const modal =
        byId(id);

    if (!modal) {

        return;

    }

    modal.classList.add(
        "is-open"
    );

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    AppState.ui.modalOpen =
        true;

}


function closeModal(
    id
) {

    const modal =
        byId(id);

    if (!modal) {

        return;

    }

    modal.classList.remove(
        "is-open"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    AppState.ui.modalOpen =
        $$(".turkai-modal.is-open")
            .length > 0;

}


function bindModalEvents() {

    $$(
        "[data-modal-close]"
    )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const modal =
                            button.closest(
                                ".turkai-modal"
                            );

                        if (
                            modal?.id
                        ) {

                            closeModal(
                                modal.id
                            );

                        }

                    }
                );

            }
        );

    $$(".turkai-modal")
        .forEach(
            modal => {

                modal.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target ===
                            modal
                        ) {

                            closeModal(
                                modal.id
                            );

                        }

                    }
                );

            }
        );

}


/* ============================================================
   52 — FILE EVENTS
   ============================================================ */

function bindFileEvents() {

    const input =
        byId(
            "fileInput"
        );

    const button =
        byId(
            "fileUploadButton"
        );

    const dropzone =
        byId(
            "fileDropzone"
        );

    button?.addEventListener(
        "click",
        () => input?.click()
    );

    input?.addEventListener(
        "change",
        () => {

            const file =
                input.files?.[0];

            if (file) {

                uploadFile(
                    file
                );

            }

            input.value =
                "";

        }
    );

    if (dropzone) {

        [
            "dragenter",
            "dragover"
        ]
            .forEach(
                eventName => {

                    dropzone.addEventListener(
                        eventName,
                        event => {

                            event.preventDefault();

                            dropzone.classList.add(
                                "drag-active"
                            );

                        }
                    );

                }
            );

        [
            "dragleave",
            "drop"
        ]
            .forEach(
                eventName => {

                    dropzone.addEventListener(
                        eventName,
                        event => {

                            event.preventDefault();

                            dropzone.classList.remove(
                                "drag-active"
                            );

                        }
                    );

                }
            );

        dropzone.addEventListener(
            "drop",
            event => {

                const files =
                    Array.from(
                        event.dataTransfer
                            ?.files || []
                    );

                files.forEach(
                    uploadFile
                );

            }
        );

    }


    byId("filesList")
        ?.addEventListener(
            "click",
            event => {

                const open =
                    event.target.closest(
                        "[data-file-open]"
                    );

                if (open) {

                    const index =
                        Number(
                            open.dataset
                                .fileIndex
                        );

                    openFilePreview(
                        AppState.files
                            .items[index]
                    );

                    return;

                }

                const remove =
                    event.target.closest(
                        "[data-file-delete]"
                    );

                if (remove) {

                    const index =
                        Number(
                            remove.dataset
                                .fileIndex
                        );

                    deleteLocalFile(
                        index
                    );

                }

            }
        );

}


/* ============================================================
   53 — DELETE LOCAL FILE
   ============================================================ */

async function deleteLocalFile(
    index
) {

    const file =
        AppState.files.items[index];

    if (!file) {

        return;

    }

    const id =
        file.id ||
        file._id;

    /*
      Sunucuda özel delete endpoint'i
      yoksa yerel listeden kaldırılır.
    */

    if (
        id
    ) {

        try {

            await apiRequest(
                `${TURKAI_CONFIG.endpoints.files}/${encodeURIComponent(
                    id
                )}`,
                {
                    method: "DELETE"
                }
            );

        } catch {
            /*
              Sunucu endpoint'i bulunmuyorsa
              yerel silme yine devam eder.
            */
        }

    }

    AppState.files.items.splice(
        index,
        1
    );

    writeStorage(
        TURKAI_CONFIG.storage.files,
        AppState.files.items
    );

    renderFiles();

    toast(
        "Dosya kaldırıldı.",
        "success"
    );

}


/* ============================================================
   54 — MEMORY EVENTS
   ============================================================ */

function bindMemoryEvents() {

    byId("clearMemoryButton")
        ?.addEventListener(
            "click",
            clearMemory
        );

    byId("memoryList")
        ?.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "[data-memory-delete]"
                    );

                if (!button) {

                    return;

                }

                deleteMemory(
                    button.dataset
                        .memoryId
                );

            }
        );

}


/* ============================================================
   55 — HISTORY EVENTS
   ============================================================ */

function bindHistoryEvents() {

    byId("historyList")
        ?.addEventListener(
            "click",
            event => {

                const item =
                    event.target.closest(
                        "[data-chat-id]"
                    );

                if (!item) {

                    return;

                }

                loadChat(
                    item.dataset
                        .chatId
                );

            }
        );

}


/* ============================================================
   56 — PROFILE EVENTS
   ============================================================ */

function bindProfileEvents() {

    byId("saveProfileButton")
        ?.addEventListener(
            "click",
            saveProfile
        );

}


/* ============================================================
   57 — PLAN EVENTS
   ============================================================ */

function bindPlanEvents() {

    $$(
        "[data-plan-card]"
    )
        .forEach(
            card => {

                card.addEventListener(
                    "click",
                    event => {

                        const button =
                            event.target.closest(
                                "[data-plan-buy]"
                            );

                        if (!button) {

                            return;

                        }

                        purchasePlan(
                            card.dataset
                                .planCard
                        );

                    }
                );

            }
        );

}


/* ============================================================
   58 — RESEARCH EVENTS
   ============================================================ */

function bindResearchEvents() {

    byId("researchButton")
        ?.addEventListener(
            "click",
            () =>
                performResearch()
        );

    byId("researchInput")
        ?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    performResearch();

                }

            }
        );

}


/* ============================================================
   59 — FEEDBACK EVENTS
   ============================================================ */

function bindFeedbackEvents() {

    byId("feedbackSubmit")
        ?.addEventListener(
            "click",
            submitFeedback
        );

    byId("correctionSubmit")
        ?.addEventListener(
            "click",
            submitCorrection
        );

}


/* ============================================================
   60 — NOTIFICATION EVENTS
   ============================================================ */

function toggleNotifications() {

    const panel =
        byId(
            "notificationsPanel"
        );

    if (!panel) {

        return;

    }

    AppState.ui.notificationsOpen =
        !AppState.ui.notificationsOpen;

    panel.classList.toggle(
        "is-open",
        AppState.ui
            .notificationsOpen
    );

}


function bindNotificationEvents() {

    byId("notificationButton")
        ?.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                toggleNotifications();

            }
        );

}


/* ============================================================
   61 — IMAGE GENERATION
   ============================================================ */

async function generateImage() {

    const input =
        byId(
            "imagePrompt"
        );

    const preview =
        byId(
            "imagePreview"
        );

    const button =
        byId(
            "generateImageButton"
        );

    const prompt =
        safeString(
            input?.value
        ).trim();

    if (!prompt) {

        toast(
            "Önce bir görsel açıklaması yaz.",
            "warning"
        );

        input?.focus();

        return;

    }

    if (
        !(
            currentPlanLevel() >=
            PLAN_LEVELS.pro
        )
    ) {

        toast(
            "Görsel üretimi için Pro veya üzeri plan gerekir.",
            "warning"
        );

        showPage(
            "plans"
        );

        return;

    }

    buttonLoading(
        button,
        true,
        "Görsel hazırlanıyor..."
    );

    if (preview) {

        preview.innerHTML = `

            <div
                class="image-generation-loading"
            >

                ${icon("progress_activity")}

                <span>
                    TürkAI görseli hazırlıyor...
                </span>

            </div>

        `;

    }

    try {

        const result =
            await post(
                TURKAI_CONFIG
                    .endpoints
                    .image,
                {
                    prompt
                }
            );

        const imageUrl =
            result?.url ||
            result?.imageUrl ||
            result?.image ||
            result?.data?.url;

        if (!imageUrl) {

            throw new Error(
                "Görsel adresi alınamadı."
            );

        }

        if (preview) {

            preview.innerHTML = `

                <div
                    class="generated-image-result"
                >

                    <img
                        src="${escapeAttribute(
                            imageUrl
                        )}"
                        alt="TürkAI tarafından oluşturulan görsel"
                    >

                    <a
                        href="${escapeAttribute(
                            imageUrl
                        )}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="button"
                    >
                        ${icon("open_in_new")}
                        Görseli aç
                    </a>

                </div>

            `;

        }

    } catch (error) {

        if (preview) {

            preview.innerHTML = `

                <div
                    class="empty-state"
                >

                    ${icon("error")}

                    <p>
                        ${escapeHTML(
                            error.message ||
                            "Görsel oluşturulamadı."
                        )}
                    </p>

                </div>

            `;

        }

        toast(
            error.message ||
            "Görsel oluşturulamadı.",
            "error"
        );

    } finally {

        buttonLoading(
            button,
            false
        );

    }

}


function bindImageEvents() {

    byId("generateImageButton")
        ?.addEventListener(
            "click",
            generateImage
        );

}


/* ============================================================
   62 — CODE STUDIO
   ============================================================ */

const CODE_TEMPLATES = {

    javascript: `// TürkAI JavaScript başlangıç kodu

function selamVer(isim) {
    return "Merhaba " + isim + "!";
}

console.log(selamVer("TürkAI"));
`,

    html: `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>TürkAI Projesi</title>
</head>
<body>

    <h1>Merhaba TürkAI</h1>

</body>
</html>
`,

    css: `body {
    margin: 0;
    font-family: sans-serif;
}

h1 {
    text-align: center;
}
`,

    python: `def selam_ver(isim):
    return f"Merhaba {isim}!"

print(selam_ver("TürkAI"))
`,

    java: `public class Main {

    public static void main(String[] args) {

        System.out.println("Merhaba TürkAI");

    }

}
`,

    cpp: `#include <iostream>

int main() {

    std::cout << "Merhaba TürkAI";

    return 0;
}
`,

    csharp: `using System;

class Program
{
    static void Main()
    {
        Console.WriteLine("Merhaba TürkAI");
    }
}
`

};


function loadCodeTemplate() {

    const language =
        byId(
            "codeLanguage"
        )?.value ||
        "javascript";

    const editor =
        byId(
            "codeEditor"
        );

    if (!editor) {

        return;

    }

    if (
        !editor.value.trim()
    ) {

        editor.value =
            CODE_TEMPLATES[
                language
            ] ||
            "";

    }

}


function runCodeStudio() {

    const language =
        byId(
            "codeLanguage"
        )?.value ||
        "javascript";

    const code =
        safeString(
            byId(
                "codeEditor"
            )?.value
        );

    const output =
        byId(
            "codeOutput"
        );

    if (!output) {

        return;

    }

    if (!code.trim()) {

        output.textContent =
            "Çalıştırılacak kod yok.";

        return;

    }

    /*
      Güvenlik:
      TürkAI web uygulaması içinde
      sunucuya bağlı gerçek shell/CMD
      çalıştırmıyoruz.

      JavaScript için yalnızca güvenli
      sandbox benzeri sınırlı değerlendirme
      kullanılabilir. Diğer dillerde kod
      gönderilebilir fakat burada yerel
      derleyici varmış gibi davranılmaz.
    */

    if (
        language !==
        "javascript"
    ) {

        output.textContent =
            `${language.toUpperCase()} kodu hazır. Gerçek derleme için sunucu tarafında güvenli bir sandbox/runner gerekir.`;

        return;

    }

    try {

        const logs = [];

        const fakeConsole = {

            log(...args) {

                logs.push(
                    args
                        .map(
                            item =>
                                typeof item ===
                                "object"
                                    ? JSON.stringify(
                                        item
                                      )
                                    : String(
                                        item
                                      )
                        )
                        .join(" ")
                );

            }

        };

        /*
          Kullanıcı kodunu ana sayfa scope'una
          doğrudan sokmuyoruz.
        */

        const runner =
            new Function(
                "console",
                `"use strict";\n${code}`
            );

        runner(
            fakeConsole
        );

        output.textContent =
            logs.length
                ? logs.join("\n")
                : "Kod çalıştı. Konsol çıktısı yok.";

    } catch (error) {

        output.textContent =
            `Hata: ${error.message}`;

    }

}


function clearCodeStudio() {

    const editor =
        byId(
            "codeEditor"
        );

    const output =
        byId(
            "codeOutput"
        );

    if (editor) {

        editor.value =
            "";

    }

    if (output) {

        output.textContent =
            "";

    }

}


function copyCode() {

    copyText(
        byId(
            "codeEditor"
        )?.value ||
        ""
    );

}


function bindCodeEvents() {

    byId("codeLanguage")
        ?.addEventListener(
            "change",
            () => {

                const editor =
                    byId(
                        "codeEditor"
                    );

                if (
                    editor &&
                    !editor.value.trim()
                ) {

                    loadCodeTemplate();

                }

            }
        );

    byId("runCodeButton")
        ?.addEventListener(
            "click",
            runCodeStudio
        );

    byId("clearCodeButton")
        ?.addEventListener(
            "click",
            clearCodeStudio
        );

    byId("copyCodeButton")
        ?.addEventListener(
            "click",
            copyCode
        );

}


/* ============================================================
   63 — COMMAND PALETTE
   ============================================================ */

const COMMANDS = [

    {
        title: "Yeni sohbet",
        icon: "add_comment",
        action: () =>
            startNewChat()
    },

    {
        title: "Araştırma",
        icon: "travel_explore",
        action: () =>
            showPage("research")
    },

    {
        title: "Dosyalar",
        icon: "folder",
        action: () =>
            showPage("files")
    },

    {
        title: "Kod Stüdyosu",
        icon: "code",
        action: () =>
            showPage("coding")
    },

    {
        title: "Bellek",
        icon: "memory",
        action: () =>
            showPage("memory")
    },

    {
        title: "Geçmiş",
        icon: "history",
        action: () =>
            showPage("history")
    },

    {
        title: "Profil",
        icon: "person",
        action: () =>
            showPage("profile")
    },

    {
        title: "Planlar",
        icon: "workspace_premium",
        action: () =>
            showPage("plans")
    },

    {
        title: "Ayarlar",
        icon: "settings",
        action: () =>
            showPage("settings")
    },

    {
        title: "Yardım",
        icon: "help",
        action: () =>
            showPage("help")
    }

];


function renderCommandList(
    query = ""
) {

    const list =
        byId(
            "commandList"
        );

    if (!list) {

        return;

    }

    const normalized =
        query
            .trim()
            .toLocaleLowerCase(
                "tr-TR"
            );

    const filtered =
        COMMANDS.filter(
            command =>
                !normalized ||
                command.title
                    .toLocaleLowerCase(
                        "tr-TR"
                    )
                    .includes(
                        normalized
                    )
        );

    list.innerHTML =
        filtered
            .map(
                (
                    command,
                    index
                ) => `

                    <button
                        type="button"
                        class="command-item"
                        data-command-index="${index}"
                    >

                        <span>
                            ${icon(
                                command.icon
                            )}
                        </span>

                        <strong>
                            ${escapeHTML(
                                command.title
                            )}
                        </strong>

                        ${icon(
                            "chevron_right"
                        )}

                    </button>

                `
            )
            .join("");

    $(
        "[data-command-index]",
        list
    )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const index =
                            Number(
                                button.dataset
                                    .commandIndex
                            );

                        const command =
                            filtered[index];

                        closeCommandPalette();

                        command?.action();

                    }
                );

            }
        );

}


function openCommandPalette() {

    const palette =
        byId(
            "commandPalette"
        );

    if (!palette) {

        return;

    }

    AppState.ui
        .commandPaletteOpen =
        true;

    palette.classList.add(
        "is-open"
    );

    const input =
        byId(
            "commandSearch"
        );

    if (input) {

        input.value =
            "";

        setTimeout(
            () =>
                input.focus(),
            30
        );

    }

    renderCommandList();

}


function closeCommandPalette() {

    const palette =
        byId(
            "commandPalette"
        );

    AppState.ui
        .commandPaletteOpen =
        false;

    palette?.classList.remove(
        "is-open"
    );

}


function bindCommandPalette() {

    byId("commandButton")
        ?.addEventListener(
            "click",
            openCommandPalette
        );

    byId("commandSearch")
        ?.addEventListener(
            "input",
            event =>
                renderCommandList(
                    event.target.value
                )
        );

}


/* ============================================================
   64 — HELP SEARCH
   ============================================================ */

function bindHelpSearch() {

    const input =
        byId(
            "helpSearch"
        );

    if (!input) {

        return;

    }

    input.addEventListener(
        "input",
        () => {

            const query =
                input.value
                    .trim()
                    .toLocaleLowerCase(
                        "tr-TR"
                    );

            $$(".help-item")
                .forEach(
                    item => {

                        const text =
                            item.textContent
                                .toLocaleLowerCase(
                                    "tr-TR"
                                );

                        item.hidden =
                            Boolean(
                                query &&
                                !text.includes(
                                    query
                                )
                            );

                    }
                );

        }
    );

}


/* ============================================================
   65 — SOCKET.IO
   ============================================================ */

function initializeSocket() {

    if (
        typeof window.io !==
        "function"
    ) {

        return;

    }

    if (
        AppState.socket
    ) {

        return;

    }

    try {

        AppState.socket =
            window.io(
                {
                    transports: [
                        "websocket",
                        "polling"
                    ]
                }
            );

        AppState.socket.on(
            "connect",
            () => {

                document.body.dataset.socket =
                    "connected";

            }
        );

        AppState.socket.on(
            "disconnect",
            () => {

                document.body.dataset.socket =
                    "disconnected";

            }
        );

        /*
          Sunucu canlı yanıt / durum
          mesajları gönderirse burada
          işlenebilir.
        */

        AppState.socket.on(
            "turkai:status",
            data => {

                if (
                    data?.message
                ) {

                    toast(
                        data.message,
                        data.type ||
                            "info"
                    );

                }

            }
        );

        AppState.socket.on(
            "turkai:notification",
            notification => {

                if (!notification) {

                    return;

                }

                AppState.notifications
                    .items
                    .unshift(
                        notification
                    );

                if (
                    !notification.read
                ) {

                    AppState.notifications
                        .unread++;

                }

                renderNotifications();

            }
        );

    } catch (error) {

        console.warn(
            "TürkAI Socket.IO başlatılamadı:",
            error
        );

    }

}


/* ============================================================
   66 — KEYBOARD SHORTCUTS
   ============================================================ */

function bindKeyboardShortcuts() {

    document.addEventListener(
        "keydown",
        event => {

            const target =
                event.target;

            const isEditable =
                target instanceof
                    HTMLInputElement ||
                target instanceof
                    HTMLTextAreaElement ||
                target instanceof
                    HTMLSelectElement ||
                target?.isContentEditable;

            /*
              CTRL/CMD + K
            */

            if (
                (event.ctrlKey ||
                    event.metaKey) &&
                event.key
                    .toLowerCase() ===
                    "k"
            ) {

                event.preventDefault();

                openCommandPalette();

                return;

            }

            /*
              ESC
            */

            if (
                event.key ===
                "Escape"
            ) {

                closeModelPicker();

                closeCommandPalette();

                $$(".turkai-modal.is-open")
                    .forEach(
                        modal =>
                            closeModal(
                                modal.id
                            )
                    );

                closeMobileSidebar();

                return;

            }

            /*
              CTRL/CMD + N
            */

            if (
                (event.ctrlKey ||
                    event.metaKey) &&
                event.key
                    .toLowerCase() ===
                    "n"
            ) {

                event.preventDefault();

                startNewChat();

                return;

            }

            /*
              Eğer kullanıcı bir input'taysa
              aşağıdaki kısayolları geçme.
            */

            if (
                isEditable
            ) {

                return;

            }

            /*
              /
              sohbet alanına hızlı geçiş
            */

            if (
                event.key ===
                "/"
            ) {

                const input =
                    byId(
                        "messageInput"
                    );

                if (input) {

                    event.preventDefault();

                    showPage(
                        "chat"
                    );

                    input.focus();

                }

            }

        }
    );

}


/* ============================================================
   67 — GLOBAL CLICK HANDLER
   ============================================================ */

function bindGlobalClickHandler() {

    document.addEventListener(
        "click",
        event => {

            /*
              Model picker dışına tıklama.
            */

            if (
                AppState.model
                    .pickerOpen
            ) {

                const picker =
                    byId(
                        "modelPicker"
                    );

                const selector =
                    byId(
                        "modelSelector"
                    );

                if (
                    picker &&
                    !picker.contains(
                        event.target
                    ) &&
                    !selector?.contains(
                        event.target
                    )
                ) {

                    closeModelPicker();

                }

            }

            /*
              Bildirim paneli dışına tıklama.
            */

            if (
                AppState.ui
                    .notificationsOpen
            ) {

                const panel =
                    byId(
                        "notificationsPanel"
                    );

                const button =
                    byId(
                        "notificationButton"
                    );

                if (
                    panel &&
                    !panel.contains(
                        event.target
                    ) &&
                    !button?.contains(
                        event.target
                    )
                ) {

                    AppState.ui
                        .notificationsOpen =
                        false;

                    panel.classList.remove(
                        "is-open"
                    );

                }

            }

        }
    );

}


/* ============================================================
   68 — GLOBAL DELEGATED ACTIONS
   ============================================================ */

function bindDelegatedActions() {

    document.addEventListener(
        "click",
        event => {

            const copyCodeButton =
                event.target.closest(
                    "[data-copy-code]"
                );

            if (
                copyCodeButton
            ) {

                const id =
                    copyCodeButton.dataset
                        .copyCode;

                const block =
                    document.querySelector(
                        `[data-code-index="${CSS.escape(
                            id
                        )}"]`
                    );

                const code =
                    block?.querySelector(
                        "code"
                    )?.textContent ||
                    "";

                copyText(
                    code
                );

                return;

            }

        }
    );

}


/* ============================================================
   69 — DATE FORMAT
   ============================================================ */

function formatDate(
    value
) {

    if (!value) {

        return "";

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

        return "";

    }

    return new Intl.DateTimeFormat(
        "tr-TR",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    ).format(
        date
    );

}


/* ============================================================
   70 — OPENING SCREEN
   ============================================================ */

async function startOpening() {

    const opening =
        byId(
            "openingScreen"
        );

    if (!opening) {

        await checkSession();

        return;

    }

    opening.classList.remove(
        "is-hidden"
    );

    /*
      Kısa premium açılış.
      Kullanıcıyı gereksiz yere bekletmez.
    */

    await sleep(
        AppState.reducedMotion
            ? 100
            : 700
    );

    opening.classList.add(
        "is-finished"
    );

    await sleep(
        AppState.reducedMotion
            ? 50
            : 350
    );

    opening.classList.add(
        "is-hidden"
    );

    await checkSession();

    if (
        AppState.authenticated
    ) {

        showPage(
            AppState.page ||
            "chat"
        );

    }

}


/* ============================================================
   71 — SETTINGS EVENTS
   ============================================================ */

function bindSettingsEvents() {

    $$(
        "[data-setting]"
    )
        .forEach(
            control => {

                const key =
                    control.dataset
                        .setting;

                control.addEventListener(
                    "change",
                    () => {

                        let value;

                        if (
                            control.type ===
                            "checkbox"
                        ) {

                            value =
                                control.checked;

                        } else {

                            value =
                                control.value;

                        }

                        updateSetting(
                            key,
                            value
                        );

                    }
                );

            }
        );

}


/* ============================================================
   72 — DOCUMENT VISIBILITY
   ============================================================ */

function bindVisibilityEvents() {

    document.addEventListener(
        "visibilitychange",
        () => {

            if (
                document.hidden
            ) {

                return;

            }

            /*
              Sekme geri açıldığında
              temel verileri tazele.
            */

            if (
                AppState.authenticated
            ) {

                updateUserUI();

            }

        }
    );

}


/* ============================================================
   73 — DRAG & DROP CHAT FILE
   ============================================================ */

function bindChatDrop() {

    const chat =
        byId(
            "chatMessages"
        );

    if (!chat) {

        return;

    }

    [
        "dragenter",
        "dragover"
    ]
        .forEach(
            type => {

                chat.addEventListener(
                    type,
                    event => {

                        event.preventDefault();

                        chat.classList.add(
                            "drag-file-active"
                        );

                    }
                );

            }
        );

    [
        "dragleave",
        "drop"
    ]
        .forEach(
            type => {

                chat.addEventListener(
                    type,
                    event => {

                        event.preventDefault();

                        chat.classList.remove(
                            "drag-file-active"
                        );

                    }
                );

            }
        );

    chat.addEventListener(
        "drop",
        event => {

            const files =
                Array.from(
                    event.dataTransfer
                        ?.files || []
                );

            files.forEach(
                file =>
                    uploadFile(
                        file
                    )
            );

            if (
                files.length
            ) {

                toast(
                    `${files.length} dosya yükleme kuyruğuna alındı.`,
                    "info"
                );

            }

        }
    );

}


/* ============================================================
   74 — AUTH OPENING BUTTONS
   ============================================================ */

function bindOpeningButtons() {

    $$(
        "[data-open-login]"
    )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        showAuthPanel(
                            "login"
                        );

                    }
                );

            }
        );

    $$(
        "[data-open-register]"
    )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        showAuthPanel(
                            "register"
                        );

                    }
                );

            }
        );

}


/* ============================================================
   75 — APP INITIALIZATION
   ============================================================ */

async function initTurkAI() {

    if (
        AppState.initialized
    ) {

        return;

    }

    AppState.initialized =
        true;

    /*
      Reduced motion.
    */

    AppState.reducedMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

    /*
      Yerel UI.
    */

    initializeLocalUI();

    /*
      Diğer event sistemleri.
    */

    bindFileEvents();

    bindMemoryEvents();

    bindHistoryEvents();

    bindProfileEvents();

    bindPlanEvents();

    bindResearchEvents();

    bindFeedbackEvents();

    bindNotificationEvents();

    bindImageEvents();

    bindCodeEvents();

    bindCommandPalette();

    bindHelpSearch();

    bindModalEvents();

    bindKeyboardShortcuts();

    bindGlobalClickHandler();

    bindDelegatedActions();

    bindSettingsEvents();

    bindVisibilityEvents();

    bindChatDrop();

    bindOpeningButtons();

    /*
      İlk ekran.
    */

    renderChatEmptyState();

    /*
      Açılış + oturum.
    */

    await startOpening();

    /*
      Varsayılan sayfa.
    */

    if (
        AppState.authenticated
    ) {

        showPage(
            "chat"
        );

    }

}


/* ============================================================
   76 — PUBLIC TURKAI API
   ============================================================ */

window.TurkAI = {

    version:
        TURKAI_CONFIG.version,

    state:
        AppState,

    models:
        TURKAI_MODELS,

    login,

    register,

    logout,

    sendMessage,

    startNewChat,

    showPage,

    performResearch,

    uploadFile,

    loadFiles,

    loadMemories,

    loadHistory,

    setModel,

    toggleFusion,

    openCommandPalette,

    generateImage,

    runCodeStudio

};


/* ============================================================
   77 — START
   ============================================================ */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initTurkAI,
        {
            once: true
        }
    );

} else {

    initTurkAI();

}


/* ============================================================
   TÜRKAI APP.JS TAMAMLANDI
   ============================================================ */

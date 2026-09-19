"use strict";

/*
============================================================
 TÜRKAI 11.0
 APP.JS
 PART 1 / 3

 CORE ENGINE
 -----------------------------------------------------------
 • Global state
 • API client
 • Authentication
 • Session
 • Page navigation
 • Modal system
 • Toast system
 • Connection monitoring
 • User profile
 • Usage system
 • Chat foundation
 • Model system
 • Socket.IO foundation
 • Error handling
============================================================
*/


/* =========================================================
   001 — GLOBAL CONFIG
========================================================= */

const TURKAI = {

    name: "TürkAI",

    version: "11.0.0",

    tokenKey: "turkai_token",

    apiBase: "",

    defaultPage: "chat",

    defaultModel: "fast",

    defaultPlan: "free",

    maxMessageLength: 20000,

    requestTimeout: 120000,

    initialized: false,

    booted: false

};


/* =========================================================
   002 — GLOBAL STATE
========================================================= */

const TK = {

    user: null,

    token: null,

    sessionId: null,

    currentPage: "chat",

    currentChatId: null,

    currentModel: "fast",

    fusionEnabled: false,

    isGenerating: false,

    isResearching: false,

    isUploading: false,

    isLoading: false,

    messages: [],

    chats: [],

    memories: [],

    files: [],

    projects: [],

    notifications: [],

    settings: {

        compactMode: false,

        animations: true,

        sound: false,

        autoResearch: true,

        fusion: false,

        memory: true,

        analytics: false,

        notifications: true,

        reducedMotion: false

    },

    limits: {

        used: 0,

        total: 50

    },

    selectedFile: null,

    selectedFeedback: null,

    selectedCorrection: null,

    selectedPlan: null,

    selectedModel: null,

    socket: null,

    socketConnected: false,

    cache: {

        me: null,

        chats: null,

        memories: null,

        files: null,

        notifications: null,

        admin: null

    },

    ui: {

        sidebarOpen: false,

        notificationsOpen: false,

        modelPickerOpen: false,

        commandPaletteOpen: false,

        currentModal: null

    }

};


/* =========================================================
   003 — DOM HELPERS
========================================================= */

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


function exists(element) {

    return !!element;

}


/* =========================================================
   004 — SAFE STORAGE
========================================================= */

const Storage = {

    get(key, fallback = null) {

        try {

            const value =
                localStorage.getItem(key);

            if (
                value === null ||
                value === undefined
            ) {

                return fallback;

            }

            return value;

        } catch {

            return fallback;

        }

    },


    set(key, value) {

        try {

            localStorage.setItem(
                key,
                value
            );

            return true;

        } catch {

            return false;

        }

    },


    remove(key) {

        try {

            localStorage.removeItem(key);

            return true;

        } catch {

            return false;

        }

    },


    jsonGet(key, fallback = null) {

        try {

            const value =
                this.get(key);

            if (!value) {

                return fallback;

            }

            return JSON.parse(value);

        } catch {

            return fallback;

        }

    },


    jsonSet(key, value) {

        try {

            return this.set(
                key,
                JSON.stringify(value)
            );

        } catch {

            return false;

        }

    }

};


/* =========================================================
   005 — TOKEN
========================================================= */

function getToken() {

    return Storage.get(
        TURKAI.tokenKey,
        null
    );

}


function setToken(token) {

    TK.token = token || null;

    if (token) {

        Storage.set(
            TURKAI.tokenKey,
            token
        );

    } else {

        Storage.remove(
            TURKAI.tokenKey
        );

    }

}


function clearToken() {

    TK.token = null;

    Storage.remove(
        TURKAI.tokenKey
    );

}


/* =========================================================
   006 — API ERROR
========================================================= */

class APIError extends Error {

    constructor(
        message,
        status = 0,
        data = null
    ) {

        super(message);

        this.name = "APIError";

        this.status = status;

        this.data = data;

    }

}


/* =========================================================
   007 — API CLIENT
========================================================= */

const API = {

    async request(
        endpoint,
        options = {}
    ) {

        const controller =
            new AbortController();

        const timeout =
            setTimeout(
                () => controller.abort(),
                TURKAI.requestTimeout
            );

        const headers = {

            "Accept":
                "application/json",

            ...(options.headers || {})

        };


        if (
            options.body &&
            !(options.body instanceof FormData)
        ) {

            headers["Content-Type"] =
                "application/json";

        }


        if (TK.token) {

            headers["Authorization"] =
                `Bearer ${TK.token}`;

        }


        const url =
            endpoint.startsWith("http")
                ? endpoint
                : `${TURKAI.apiBase}${endpoint}`;


        try {

            const response =
                await fetch(
                    url,
                    {
                        ...options,
                        headers,
                        signal:
                            controller.signal
                    }
                );


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

                data =
                    await response.json();

            } else {

                const text =
                    await response.text();

                data = {
                    success:
                        response.ok,
                    message:
                        text
                };

            }


            if (
                response.status === 401
            ) {

                handleUnauthorized();

                throw new APIError(
                    data?.message ||
                    "Oturum geçersiz.",
                    401,
                    data
                );

            }


            if (!response.ok) {

                throw new APIError(
                    data?.message ||
                    data?.error ||
                    `İstek başarısız (${response.status})`,
                    response.status,
                    data
                );

            }


            return data;

        } catch (error) {

            if (
                error?.name ===
                "AbortError"
            ) {

                throw new APIError(
                    "İstek zaman aşımına uğradı.",
                    408
                );

            }


            if (
                error instanceof APIError
            ) {

                throw error;

            }


            throw new APIError(
                "Sunucuya bağlanılamadı.",
                0,
                null
            );

        } finally {

            clearTimeout(timeout);

        }

    },


    get(
        endpoint,
        options = {}
    ) {

        return this.request(
            endpoint,
            {
                ...options,
                method: "GET"
            }
        );

    },


    post(
        endpoint,
        body = null,
        options = {}
    ) {

        return this.request(
            endpoint,
            {
                ...options,
                method: "POST",
                body:
                    body instanceof FormData
                        ? body
                        : body === null
                            ? undefined
                            : JSON.stringify(body)
            }
        );

    },


    patch(
        endpoint,
        body = null,
        options = {}
    ) {

        return this.request(
            endpoint,
            {
                ...options,
                method: "PATCH",
                body:
                    body instanceof FormData
                        ? body
                        : JSON.stringify(body)
            }
        );

    },


    delete(
        endpoint,
        options = {}
    ) {

        return this.request(
            endpoint,
            {
                ...options,
                method: "DELETE"
            }
        );

    }

};


/* =========================================================
   008 — RESPONSE HELPERS
========================================================= */

function responseSuccess(response) {

    if (!response) {

        return false;

    }

    if (
        typeof response.success ===
        "boolean"
    ) {

        return response.success;

    }

    return true;

}


function responseMessage(
    response,
    fallback = "İşlem tamamlandı."
) {

    return (
        response?.message ||
        response?.error ||
        fallback
    );

}


/* =========================================================
   009 — TEXT HELPERS
========================================================= */

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        String(value ?? "");

    return div.innerHTML;

}


function cleanText(value) {

    return String(
        value ?? ""
    ).trim();

}


function truncate(
    value,
    max = 100
) {

    const text =
        cleanText(value);

    if (
        text.length <= max
    ) {

        return text;

    }

    return (
        text.slice(0, max - 1) +
        "…"
    );

}


function formatNumber(value) {

    const number =
        Number(value);

    if (
        !Number.isFinite(number)
    ) {

        return "0";

    }

    return number.toLocaleString(
        "tr-TR"
    );

}


function formatDate(
    value,
    includeTime = true
) {

    if (!value) {

        return "—";

    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "—";

    }


    return date.toLocaleString(
        "tr-TR",
        {
            dateStyle:
                "medium",
            timeStyle:
                includeTime
                    ? "short"
                    : undefined
        }
    );

}


function relativeTime(value) {

    if (!value) {

        return "";

    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    const diff =
        Date.now() -
        date.getTime();


    const seconds =
        Math.floor(
            diff / 1000
        );


    if (
        seconds < 10
    ) {

        return "şimdi";

    }


    if (
        seconds < 60
    ) {

        return `${seconds} sn önce`;

    }


    const minutes =
        Math.floor(
            seconds / 60
        );


    if (
        minutes < 60
    ) {

        return `${minutes} dk önce`;

    }


    const hours =
        Math.floor(
            minutes / 60
        );


    if (
        hours < 24
    ) {

        return `${hours} saat önce`;

    }


    const days =
        Math.floor(
            hours / 24
        );


    if (
        days < 7
    ) {

        return `${days} gün önce`;

    }


    return formatDate(
        value,
        false
    );

}


/* =========================================================
   010 — TOAST SYSTEM
========================================================= */

const Toast = {

    container: null,


    init() {

        this.container =
            byId(
                "toastContainer"
            );

    },


    show(
        message,
        type = "info",
        duration = 3500
    ) {

        if (!this.container) {

            this.container =
                byId(
                    "toastContainer"
                );

        }


        if (!this.container) {

            return;

        }


        const toast =
            document.createElement(
                "div"
            );


        toast.className =
            `toast toast-${type}`;


        const icon =
            document.createElement(
                "div"
            );


        icon.className =
            "toast-icon";


        const iconName =
            type === "success"
                ? "icon-check"
                : type === "error"
                    ? "icon-close"
                    : type === "warning"
                        ? "icon-bulb"
                        : "icon-spark";


        icon.innerHTML = `
            <svg>
                <use href="#${iconName}"></use>
            </svg>
        `;


        const content =
            document.createElement(
                "div"
            );


        content.className =
            "toast-content";


        content.innerHTML = `
            <strong>${escapeHTML(
                type === "error"
                    ? "Hata"
                    : type === "success"
                        ? "Başarılı"
                        : "TürkAI"
            )}</strong>
            <span>${escapeHTML(
                message
            )}</span>
        `;


        const close =
            document.createElement(
                "button"
            );


        close.type =
            "button";

        close.className =
            "toast-close";


        close.innerHTML = `
            <svg>
                <use href="#icon-close"></use>
            </svg>
        `;


        close.addEventListener(
            "click",
            () => {

                this.remove(
                    toast
                );

            }
        );


        toast.append(
            icon,
            content,
            close
        );


        this.container.appendChild(
            toast
        );


        requestAnimationFrame(
            () => {

                toast.classList.add(
                    "show"
                );

            }
        );


        setTimeout(
            () => {

                this.remove(
                    toast
                );

            },
            duration
        );

    },


    remove(toast) {

        if (!toast) {

            return;

        }

        toast.classList.remove(
            "show"
        );

        setTimeout(
            () => {

                toast.remove();

            },
            250
        );

    },


    success(message) {

        this.show(
            message,
            "success"
        );

    },


    error(message) {

        this.show(
            message,
            "error",
            5000
        );

    },


    warning(message) {

        this.show(
            message,
            "warning"
        );

    },


    info(message) {

        this.show(
            message,
            "info"
        );

    }

};


/* =========================================================
   011 — MODAL SYSTEM
========================================================= */

const Modal = {

    open(id) {

        const modal =
            typeof id === "string"
                ? byId(id)
                : id;


        if (!modal) {

            return;

        }


        $$(".turkai-modal").forEach(
            item => {

                item.classList.remove(
                    "active"
                );

                item.setAttribute(
                    "aria-hidden",
                    "true"
                );

            }
        );


        modal.classList.add(
            "active"
        );


        modal.setAttribute(
            "aria-hidden",
            "false"
        );


        TK.ui.currentModal =
            modal.id;


        document.body.classList.add(
            "modal-open"
        );


        const focusable =
            modal.querySelector(
                "input, textarea, button, select"
            );


        if (focusable) {

            setTimeout(
                () => {

                    try {

                        focusable.focus();

                    } catch {}

                },
                100
            );

        }

    },


    close(id) {

        const modal =
            id
                ? byId(id)
                : (
                    TK.ui.currentModal
                        ? byId(
                            TK.ui.currentModal
                        )
                        : null
                );


        if (!modal) {

            return;

        }


        modal.classList.remove(
            "active"
        );


        modal.setAttribute(
            "aria-hidden",
            "true"
        );


        TK.ui.currentModal =
            null;


        document.body.classList.remove(
            "modal-open"
        );

    },


    closeAll() {

        $$(".turkai-modal").forEach(
            modal => {

                modal.classList.remove(
                    "active"
                );

                modal.setAttribute(
                    "aria-hidden",
                    "true"
                );

            }
        );


        TK.ui.currentModal =
            null;


        document.body.classList.remove(
            "modal-open"
        );

    }

};


/* =========================================================
   012 — LOADING
========================================================= */

const Loading = {

    element: null,


    init() {

        this.element =
            byId(
                "globalLoading"
            );

    },


    show(text = "İşlemin hazırlanıyor...") {

        if (!this.element) {

            return;

        }


        const span =
            this.element.querySelector(
                ".loading-text span"
            );


        if (span) {

            span.textContent =
                text;

        }


        this.element.hidden =
            false;


        this.element.setAttribute(
            "aria-hidden",
            "false"
        );


        this.element.classList.add(
            "active"
        );

    },


    hide() {

        if (!this.element) {

            return;

        }


        this.element.classList.remove(
            "active"
        );


        this.element.setAttribute(
            "aria-hidden",
            "true"
        );


        setTimeout(
            () => {

                this.element.hidden =
                    true;

            },
            250
        );

    }

};


/* =========================================================
   013 — CONNECTION STATUS
========================================================= */

const Connection = {

    element: null,

    text: null,


    init() {

        this.element =
            byId(
                "connectionStatus"
            );

        this.text =
            byId(
                "connectionStatusText"
            );

    },


    set(
        status,
        text
    ) {

        if (!this.element) {

            return;

        }


        this.element.classList.remove(
            "online",
            "offline",
            "connecting"
        );


        this.element.classList.add(
            status
        );


        if (this.text) {

            this.text.textContent =
                text;

        }

    },


    online() {

        this.set(
            "online",
            "Bağlantı aktif"
        );

    },


    offline() {

        this.set(
            "offline",
            "Bağlantı yok"
        );

    },


    connecting() {

        this.set(
            "connecting",
            "Bağlanıyor..."
        );

    }

};


/* =========================================================
   014 — SCREEN MANAGER
========================================================= */

const Screens = {

    titles: {

        chat: "Sohbet",

        research: "Araştırma",

        files: "Dosyalar",

        coding: "Kodlama",

        memory: "Bellek",

        history: "Geçmiş",

        profile: "Profil",

        plans: "Planlar",

        settings: "Ayarlar",

        help: "Yardım",

        admin: "Admin"

    },


    show(page) {

        if (
            !page ||
            !this.titles[page]
        ) {

            page = "chat";

        }


        const target =
            byId(
                `screen-${page}`
            );


        if (!target) {

            return;

        }


        $$(".screen").forEach(
            screen => {

                screen.hidden =
                    true;

                screen.classList.remove(
                    "active"
                );

            }
        );


        target.hidden =
            false;


        requestAnimationFrame(
            () => {

                target.classList.add(
                    "active"
                );

            }
        );


        $$("[data-page]").forEach(
            button => {

                const isActive =
                    button.dataset.page ===
                    page;


                button.classList.toggle(
                    "active",
                    isActive
                );


                button.setAttribute(
                    "aria-current",
                    isActive
                        ? "page"
                        : "false"
                );

            }
        );


        TK.currentPage =
            page;


        const title =
            byId(
                "pageTitle"
            );


        if (title) {

            title.textContent =
                this.titles[page];

        }


        Storage.set(
            "turkai_last_page",
            page
        );


        closeSidebar();


        if (page === "history") {

            History.load();

        }


        if (page === "memory") {

            Memory.load();

        }


        if (page === "files") {

            Files.load();

        }


        if (page === "research") {

            const input =
                byId(
                    "researchInput"
                );

            if (input) {

                setTimeout(
                    () => input.focus(),
                    150
                );

            }

        }


        if (page === "coding") {

            const editor =
                byId(
                    "codeEditor"
                );

            if (editor) {

                setTimeout(
                    () => editor.focus(),
                    150
                );

            }

        }


        if (page === "admin") {

            Admin.load();

        }

    }

};


/* =========================================================
   015 — SIDEBAR
========================================================= */

function openSidebar() {

    const sidebar =
        byId(
            "sidebar"
        );

    const overlay =
        byId(
            "mobileOverlay"
        );


    if (sidebar) {

        sidebar.classList.add(
            "open"
        );

    }


    if (overlay) {

        overlay.classList.add(
            "active"
        );

        overlay.setAttribute(
            "aria-hidden",
            "false"
        );

    }


    TK.ui.sidebarOpen =
        true;

}


function closeSidebar() {

    const sidebar =
        byId(
            "sidebar"
        );

    const overlay =
        byId(
            "mobileOverlay"
        );


    if (sidebar) {

        sidebar.classList.remove(
            "open"
        );

    }


    if (overlay) {

        overlay.classList.remove(
            "active"
        );

        overlay.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    TK.ui.sidebarOpen =
        false;

}


/* =========================================================
   016 — NOTIFICATIONS
========================================================= */

const Notifications = {

    panel: null,

    list: null,


    init() {

        this.panel =
            byId(
                "notificationsPanel"
            );

        this.list =
            byId(
                "notificationsList"
            );

    },


    open() {

        if (!this.panel) {

            return;

        }


        this.panel.classList.add(
            "open"
        );


        this.panel.setAttribute(
            "aria-hidden",
            "false"
        );


        TK.ui.notificationsOpen =
            true;


        this.load();

    },


    close() {

        if (!this.panel) {

            return;

        }


        this.panel.classList.remove(
            "open"
        );


        this.panel.setAttribute(
            "aria-hidden",
            "true"
        );


        TK.ui.notificationsOpen =
            false;

    },


    async load() {

        try {

            const result =
                await API.get(
                    "/api/notifications"
                );


            const notifications =
                result.notifications ||
                result.data ||
                [];


            TK.notifications =
                Array.isArray(
                    notifications
                )
                    ? notifications
                    : [];


            TK.cache.notifications =
                TK.notifications;


            this.render();

        } catch (error) {

            if (
                error.status !== 401
            ) {

                this.render();

            }

        }

    },


    render() {

        if (!this.list) {

            return;

        }


        if (
            TK.notifications.length === 0
        ) {

            this.list.innerHTML = `
                <div class="notifications-empty">

                    <div class="empty-icon">
                        <svg>
                            <use href="#icon-bell"></use>
                        </svg>
                    </div>

                    <strong>
                        Bildirim yok
                    </strong>

                    <span>
                        Yeni bildirimler burada görünecek.
                    </span>

                </div>
            `;

            return;

        }


        this.list.innerHTML = "";


        TK.notifications.forEach(
            notification => {

                const item =
                    document.createElement(
                        "article"
                    );


                item.className =
                    "notification-item";


                item.innerHTML = `
                    <div class="notification-icon">
                        <svg>
                            <use href="#icon-bell"></use>
                        </svg>
                    </div>

                    <div class="notification-body">

                        <strong>
                            ${escapeHTML(
                                notification.title ||
                                "Bildirim"
                            )}
                        </strong>

                        <p>
                            ${escapeHTML(
                                notification.message ||
                                ""
                            )}
                        </p>

                        <time>
                            ${relativeTime(
                                notification.createdAt ||
                                notification.created_at
                            )}
                        </time>

                    </div>

                    <button
                        type="button"
                        class="notification-close"
                        aria-label="Bildirimi kapat"
                    >
                        <svg>
                            <use href="#icon-close"></use>
                        </svg>
                    </button>
                `;


                const close =
                    item.querySelector(
                        ".notification-close"
                    );


                close?.addEventListener(
                    "click",
                    () => {

                        item.remove();

                    }
                );


                this.list.appendChild(
                    item
                );

            }
        );


        this.updateBadge();

    },


    updateBadge() {

        const badge =
            byId(
                "notificationBadge"
            );


        if (!badge) {

            return;

        }


        const count =
            TK.notifications.filter(
                notification =>
                    !notification.read
            ).length;


        badge.textContent =
            count > 99
                ? "99+"
                : String(count);


        badge.hidden =
            count === 0;

    }

};


/* =========================================================
   017 — MODEL SYSTEM
========================================================= */

const Models = {

    profiles: {

        fast: {

            name: "TürkAI Fast",

            description:
                "Hızlı günlük sohbet",

            icon:
                "icon-spark"

        },

        think: {

            name: "TürkAI Think",

            description:
                "Derin akıl yürütme",

            icon:
                "icon-bulb"

        },

        math: {

            name: "TürkAI Math",

            description:
                "Matematik ve hesaplama",

            icon:
                "icon-bulb"

        },

        code: {

            name: "TürkAI Code",

            description:
                "Kodlama ve hata ayıklama",

            icon:
                "icon-code"

        },

        research: {

            name: "TürkAI Research",

            description:
                "Araştırma ve kaynaklar",

            icon:
                "icon-globe"

        },

        writer: {

            name: "TürkAI Writer",

            description:
                "Yazı ve içerik",

            icon:
                "icon-message"

        },

        learn: {

            name: "TürkAI Learn",

            description:
                "Öğrenme ve eğitim",

            icon:
                "icon-bulb"

        },

        creative: {

            name: "TürkAI Creative",

            description:
                "Yaratıcı çalışmalar",

            icon:
                "icon-spark"

        },

        file: {

            name: "TürkAI File",

            description:
                "Dosya analizi",

            icon:
                "icon-file"

        },

        security: {

            name: "TürkAI Security",

            description:
                "Güvenlik odaklı",

            icon:
                "icon-shield"

        },

        vision: {

            name: "TürkAI Vision",

            description:
                "Görsel analiz",

            icon:
                "icon-spark"

        },

        ultra: {

            name: "TürkAI Ultra",

            description:
                "Gelişmiş çalışma modu",

            icon:
                "icon-spark"

        }

    },


    set(model) {

        if (
            !this.profiles[model]
        ) {

            model = "fast";

        }


        TK.currentModel =
            model;


        TK.selectedModel =
            model;


        Storage.set(
            "turkai_model",
            model
        );


        this.updateUI();

    },


    updateUI() {

        const model =
            this.profiles[
                TK.currentModel
            ] ||
            this.profiles.fast;


        const selector =
            byId(
                "modelSelector"
            );


        if (selector) {

            const name =
                selector.querySelector(
                    "[data-model-name]"
                );


            if (name) {

                name.textContent =
                    model.name;

            }


            selector.dataset.model =
                TK.currentModel;

        }


        $$(".model-option").forEach(
            option => {

                option.classList.toggle(
                    "active",
                    option.dataset.model ===
                    TK.currentModel
                );

            }
        );

    },


    openPicker() {

        const picker =
            byId(
                "modelPicker"
            );


        if (!picker) {

            return;

        }


        picker.classList.add(
            "open"
        );


        picker.setAttribute(
            "aria-hidden",
            "false"
        );


        TK.ui.modelPickerOpen =
            true;

    },


    closePicker() {

        const picker =
            byId(
                "modelPicker"
            );


        if (!picker) {

            return;

        }


        picker.classList.remove(
            "open"
        );


        picker.setAttribute(
            "aria-hidden",
            "true"
        );


        TK.ui.modelPickerOpen =
            false;

    }

};


/* =========================================================
   018 — FUSION
========================================================= */

function setFusion(enabled) {

    TK.fusionEnabled =
        Boolean(enabled);


    TK.settings.fusion =
        TK.fusionEnabled;


    $$(
        "[data-fusion-toggle]"
    ).forEach(
        toggle => {

            if (
                toggle instanceof HTMLInputElement
            ) {

                toggle.checked =
                    TK.fusionEnabled;

            }


            toggle.classList.toggle(
                "active",
                TK.fusionEnabled
            );

        }
    );


    const status =
        byId(
            "fusionStatus"
        );


    if (status) {

        status.textContent =
            TK.fusionEnabled
                ? "Fusion aktif"
                : "Fusion kapalı";

    }

}


/* =========================================================
   019 — USER UI
========================================================= */

function updateUserUI() {

    const user =
        TK.user;


    if (!user) {

        return;

    }


    $$("[data-user-name]").forEach(
        element => {

            element.textContent =
                user.name ||
                user.username ||
                "Kullanıcı";

        }
    );


    $$("[data-user-email]").forEach(
        element => {

            element.textContent =
                user.email ||
                "";

        }
    );


    $$("[data-user-plan]").forEach(
        element => {

            element.textContent =
                formatPlanName(
                    user.plan ||
                    "free"
                );

        }
    );


    $$("[data-current-plan]").forEach(
        element => {

            element.textContent =
                formatPlanName(
                    user.plan ||
                    "free"
                );

        }
    );


    const initials =
        getInitials(
            user.name ||
            user.username ||
            "T"
        );


    $$("[data-user-avatar]").forEach(
        element => {

            if (
                user.avatar ||
                user.picture ||
                user.image
            ) {

                element.innerHTML = `
                    <img
                        src="${escapeHTML(
                            user.avatar ||
                            user.picture ||
                            user.image
                        )}"
                        alt=""
                    >
                `;

            } else {

                element.textContent =
                    initials;

            }

        }
    );


    $$(
        "[data-user-avatar-fallback]"
    ).forEach(
        element => {

            element.textContent =
                initials;

        }
    );


    const nameInput =
        byId(
            "profileNameInput"
        );


    if (
        nameInput &&
        !nameInput.matches(":focus")
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
        !emailInput.matches(":focus")
    ) {

        emailInput.value =
            user.email ||
            "";

    }

}


function getInitials(name) {

    const parts =
        cleanText(name)
            .split(/\s+/)
            .filter(Boolean);


    if (
        parts.length === 0
    ) {

        return "T";

    }


    if (
        parts.length === 1
    ) {

        return parts[0]
            .slice(0, 2)
            .toUpperCase();

    }


    return (
        parts[0][0] +
        parts[1][0]
    ).toUpperCase();

}


function formatPlanName(plan) {

    const names = {

        free: "Free",

        pro: "Pro",

        plus: "Plus",

        ultra: "Ultra",

        developer: "Developer"

    };


    return (
        names[
            String(plan)
                .toLowerCase()
        ] ||
        "Free"
    );

}


/* =========================================================
   020 — USAGE
========================================================= */

function updateUsage(
    used,
    total
) {

    const safeUsed =
        Math.max(
            0,
            Number(used) || 0
        );


    const safeTotal =
        Math.max(
            1,
            Number(total) || 1
        );


    TK.limits.used =
        safeUsed;

    TK.limits.total =
        safeTotal;


    $$("[data-usage-used]").forEach(
        element => {

            element.textContent =
                formatNumber(
                    safeUsed
                );

        }
    );


    $$("[data-usage-total]").forEach(
        element => {

            element.textContent =
                formatNumber(
                    safeTotal
                );

        }
    );


    const percentage =
        Math.min(
            100,
            Math.max(
                0,
                (
                    safeUsed /
                    safeTotal
                ) * 100
            )
        );


    $$(
        "[data-usage-progress]"
    ).forEach(
        element => {

            element.style.width =
                `${percentage}%`;

        }
    );

}


/* =========================================================
   021 — AUTH
========================================================= */

const Auth = {

    async init() {

        const token =
            getToken();


        if (!token) {

            this.showAuth();

            return false;

        }


        TK.token =
            token;


        try {

            await this.me();

            this.showApp();

            return true;

        } catch (error) {

            clearToken();

            this.showAuth();

            return false;

        }

    },


    showAuth() {

        const opening =
            byId(
                "openingScreen"
            );

        const auth =
            byId(
                "authScreen"
            );

        const app =
            byId(
                "appShell"
            );


        if (opening) {

            opening.hidden =
                true;

        }


        if (app) {

            app.hidden =
                true;

        }


        if (auth) {

            auth.hidden =
                false;

        }


        const login =
            byId(
                "loginScreen"
            );

        const register =
            byId(
                "registerScreen"
            );


        if (login) {

            login.hidden =
                false;

        }


        if (register) {

            register.hidden =
                true;

        }

    },


    showApp() {

        const opening =
            byId(
                "openingScreen"
            );

        const auth =
            byId(
                "authScreen"
            );

        const app =
            byId(
                "appShell"
            );


        if (opening) {

            opening.hidden =
                true;

        }


        if (auth) {

            auth.hidden =
                true;

        }


        if (app) {

            app.hidden =
                false;

        }


        const lastPage =
            Storage.get(
                "turkai_last_page",
                "chat"
            );


        Screens.show(
            Screens.titles[lastPage]
                ? lastPage
                : "chat"
        );

    },


    async me() {

        const result =
            await API.get(
                "/api/me"
            );


        const user =
            result.user ||
            result.data ||
            result;


        TK.user =
            user;


        TK.cache.me =
            user;


        if (
            result.sessionId
        ) {

            TK.sessionId =
                result.sessionId;

        }


        if (
            result.usage
        ) {

            updateUsage(
                result.usage.used,
                result.usage.total
            );

        } else if (
            result.limits
        ) {

            updateUsage(
                result.limits.used,
                result.limits.total
            );

        }


        updateUserUI();


        return user;

    },


    async login(
        username,
        password
    ) {

        if (
            !username ||
            !password
        ) {

            throw new Error(
                "Kullanıcı adı ve şifre gerekli."
            );

        }


        const result =
            await API.post(
                "/api/login",
                {
                    username,
                    password
                }
            );


        const token =
            result.token ||
            result.accessToken ||
            result.data?.token;


        if (!token) {

            throw new Error(
                responseMessage(
                    result,
                    "Giriş yapılamadı."
                )
            );

        }


        setToken(token);


        TK.user =
            result.user ||
            result.data?.user ||
            null;


        if (!TK.user) {

            await this.me();

        } else {

            updateUserUI();

        }


        this.showApp();


        await bootstrapAfterLogin();


        return true;

    },


    async register(
        username,
        email,
        password,
        adminConsent
    ) {

        const result =
            await API.post(
                "/api/register",
                {
                    username,
                    email,
                    password,
                    adminConsent:
                        Boolean(
                            adminConsent
                        )
                }
            );


        const token =
            result.token ||
            result.accessToken ||
            result.data?.token;


        if (token) {

            setToken(token);

            TK.user =
                result.user ||
                result.data?.user ||
                null;

            if (!TK.user) {

                await this.me();

            }

            this.showApp();

            await bootstrapAfterLogin();

            return true;

        }


        Toast.success(
            responseMessage(
                result,
                "Hesabın oluşturuldu."
            )
        );


        showLoginScreen();


        return true;

    },


    async logout() {

        try {

            if (TK.token) {

                await API.post(
                    "/api/logout"
                );

            }

        } catch {

            // Local logout yine devam eder.

        }


        clearToken();


        TK.user =
            null;

        TK.sessionId =
            null;

        TK.currentChatId =
            null;

        TK.messages =
            [];


        clearRuntimeState();


        this.showAuth();


        Toast.info(
            "Oturum kapatıldı."
        );

    }

};


/* =========================================================
   022 — UNAUTHORIZED
========================================================= */

function handleUnauthorized() {

    if (
        TK.user ||
        TK.token
    ) {

        clearToken();

        TK.user =
            null;

        TK.sessionId =
            null;

        Toast.warning(
            "Oturumun sona erdi. Tekrar giriş yap."
        );

    }

}


/* =========================================================
   023 — RUNTIME RESET
========================================================= */

function clearRuntimeState() {

    TK.messages = [];

    TK.chats = [];

    TK.memories = [];

    TK.files = [];

    TK.projects = [];

    TK.notifications = [];

    TK.cache = {

        me: null,

        chats: null,

        memories: null,

        files: null,

        notifications: null,

        admin: null

    };

}


/* =========================================================
   024 — AUTH SCREEN SWITCH
========================================================= */

function showLoginScreen() {

    const login =
        byId(
            "loginScreen"
        );

    const register =
        byId(
            "registerScreen"
        );


    if (login) {

        login.hidden =
            false;

    }


    if (register) {

        register.hidden =
            true;

    }

}


function showRegisterScreen() {

    const login =
        byId(
            "loginScreen"
        );

    const register =
        byId(
            "registerScreen"
        );


    if (login) {

        login.hidden =
            true;

    }


    if (register) {

        register.hidden =
            false;

    }

}


/* =========================================================
   025 — CHAT STATE
========================================================= */

const Chat = {

    async newChat() {

        TK.currentChatId =
            null;

        TK.messages =
            [];


        renderChatMessages();


        const input =
            byId(
                "messageInput"
            );


        if (input) {

            input.value = "";

            input.focus();

        }


        Screens.show(
            "chat"
        );


        updateWelcomeState(
            true
        );

    },


    async load(chatId) {

        if (!chatId) {

            return;

        }


        try {

            Loading.show(
                "Sohbet yükleniyor..."
            );


            const result =
                await API.get(
                    `/api/chats/${encodeURIComponent(
                        chatId
                    )}`
                );


            const chat =
                result.chat ||
                result.data ||
                result;


            TK.currentChatId =
                chat.id ||
                chat._id ||
                chatId;


            TK.messages =
                normalizeMessages(
                    chat.messages ||
                    []
                );


            renderChatMessages();


            updateWelcomeState(
                TK.messages.length === 0
            );


            Screens.show(
                "chat"
            );


        } catch (error) {

            Toast.error(
                error.message ||
                "Sohbet yüklenemedi."
            );

        } finally {

            Loading.hide();

        }

    },


    async send(text) {

        const message =
            cleanText(text);


        if (!message) {

            return;

        }


        if (
            TK.isGenerating
        ) {

            return;

        }


        if (
            message.length >
            TURKAI.maxMessageLength
        ) {

            Toast.warning(
                "Mesaj çok uzun."
            );

            return;

        }


        TK.isGenerating =
            true;


        updateSendState(
            true
        );


        updateWelcomeState(
            false
        );


        const userMessage = {

            id:
                createId(),

            role:
                "user",

            content:
                message,

            createdAt:
                new Date().toISOString()

        };


        TK.messages.push(
            userMessage
        );


        appendMessage(
            userMessage
        );


        clearMessageInput();


        const assistantId =
            createId();


        const assistantMessage = {

            id:
                assistantId,

            role:
                "assistant",

            content:
                "",

            createdAt:
                new Date().toISOString(),

            pending:
                true

        };


        TK.messages.push(
            assistantMessage
        );


        appendMessage(
            assistantMessage
        );


        try {

            const payload = {

                message,

                prompt:
                    message,

                model:
                    TK.currentModel,

                fusion:
                    TK.fusionEnabled,

                sessionId:
                    TK.sessionId,

                chatId:
                    TK.currentChatId,

                history:
                    TK.messages
                        .slice(-20)
                        .filter(
                            item =>
                                item.id !==
                                assistantId
                        )
                        .map(
                            item => ({
                                role:
                                    item.role,

                                content:
                                    item.content
                            })
                        )

            };


            const result =
                await API.post(
                    "/api/chat",
                    payload
                );


            const answer =
                extractAnswer(
                    result
                );


            const serverChatId =
                result.chatId ||
                result.chat?.id ||
                result.data?.chatId;


            if (serverChatId) {

                TK.currentChatId =
                    serverChatId;

            }


            assistantMessage.content =
                answer ||
                "Yanıt alınamadı.";


            assistantMessage.pending =
                false;


            updateRenderedMessage(
                assistantMessage
            );


            if (
                result.usage
            ) {

                updateUsage(
                    result.usage.used,
                    result.usage.total
                );

            }


            if (
                result.limits
            ) {

                updateUsage(
                    result.limits.used,
                    result.limits.total
                );

            }


            if (
                result.memory
            ) {

                TK.memories =
                    normalizeArray(
                        result.memory
                    );

            }


            return result;

        } catch (error) {

            assistantMessage.pending =
                false;


            assistantMessage.error =
                true;


            assistantMessage.content =
                getFriendlyError(
                    error
                );


            updateRenderedMessage(
                assistantMessage
            );


            if (
                error.status === 429
            ) {

                Toast.warning(
                    "Kullanım limitine ulaşıldı."
                );

            } else {

                Toast.error(
                    assistantMessage.content
                );

            }


            throw error;

        } finally {

            TK.isGenerating =
                false;


            updateSendState(
                false
            );

        }

    }

};


/* =========================================================
   026 — CHAT RESPONSE EXTRACTION
========================================================= */

function extractAnswer(result) {

    if (!result) {

        return "";

    }


    const candidates = [

        result.answer,

        result.response,

        result.message,

        result.text,

        result.content,

        result.reply,

        result.data?.answer,

        result.data?.response,

        result.data?.message,

        result.data?.text,

        result.data?.content,

        result.data?.reply

    ];


    for (
        const candidate of candidates
    ) {

        if (
            typeof candidate ===
                "string" &&
            candidate.trim()
        ) {

            return candidate.trim();

        }

    }


    return "";

}


/* =========================================================
   027 — MESSAGE NORMALIZATION
========================================================= */

function normalizeMessages(messages) {

    if (
        !Array.isArray(messages)
    ) {

        return [];

    }


    return messages.map(
        message => ({

            id:
                message.id ||
                message._id ||
                createId(),

            role:
                normalizeRole(
                    message.role ||
                    message.sender
                ),

            content:
                String(
                    message.content ||
                    message.text ||
                    message.message ||
                    ""
                ),

            createdAt:
                message.createdAt ||
                message.created_at ||
                new Date().toISOString(),

            pending:
                false

        })
    );

}


function normalizeRole(role) {

    const value =
        String(
            role || ""
        ).toLowerCase();


    if (
        value === "user" ||
        value === "human"
    ) {

        return "user";

    }


    return "assistant";

}


/* =========================================================
   028 — MESSAGE RENDERING
========================================================= */

function renderChatMessages() {

    const container =
        byId(
            "chatMessages"
        );


    if (!container) {

        return;

    }


    container.innerHTML = "";


    TK.messages.forEach(
        message => {

            appendMessage(
                message,
                false
            );

        }
    );


    scrollChatToBottom();

}


function appendMessage(
    message,
    scroll = true
) {

    const container =
        byId(
            "chatMessages"
        );


    if (!container) {

        return;

    }


    const article =
        createMessageElement(
            message
        );


    container.appendChild(
        article
    );


    if (scroll) {

        scrollChatToBottom();

    }

}


function createMessageElement(
    message
) {

    const article =
        document.createElement(
            "article"
        );


    article.className =
        `message message-${message.role}`;


    article.dataset.messageId =
        message.id;


    const isUser =
        message.role ===
        "user";


    article.innerHTML = `

        <div class="message-avatar">

            <div class="message-avatar-ai">

                ${
                    isUser
                        ? escapeHTML(
                            getInitials(
                                TK.user?.name ||
                                TK.user?.username ||
                                "S"
                            )
                        )
                        : `
                            <svg>
                                <use href="#icon-spark"></use>
                            </svg>
                        `
                }

            </div>

        </div>


        <div class="message-main">

            <div class="message-meta">

                <strong>
                    ${
                        isUser
                            ? escapeHTML(
                                TK.user?.name ||
                                TK.user?.username ||
                                "Sen"
                            )
                            : "TürkAI"
                    }
                </strong>

                <time>
                    ${relativeTime(
                        message.createdAt
                    )}
                </time>

            </div>


            <div
                class="message-content"
                data-message-content
            >
                ${formatMessageContent(
                    message.content
                )}
            </div>


            ${
                !isUser
                    ? `
                        <div class="message-actions">

                            <button
                                type="button"
                                data-copy-message
                                aria-label="Mesajı kopyala"
                            >
                                <svg>
                                    <use href="#icon-copy"></use>
                                </svg>
                            </button>

                            <button
                                type="button"
                                data-feedback="positive"
                                aria-label="Yararlı"
                            >
                                <svg>
                                    <use href="#icon-check"></use>
                                </svg>
                            </button>

                            <button
                                type="button"
                                data-feedback="negative"
                                aria-label="Yararsız"
                            >
                                <svg>
                                    <use href="#icon-close"></use>
                                </svg>
                            </button>

                            <button
                                type="button"
                                data-regenerate
                                aria-label="Yeniden oluştur"
                            >
                                <svg>
                                    <use href="#icon-refresh"></use>
                                </svg>
                            </button>

                            <button
                                type="button"
                                data-correction
                                aria-label="Düzelt"
                            >
                                <svg>
                                    <use href="#icon-bulb"></use>
                                </svg>
                            </button>

                        </div>
                    `
                    : ""
            }

        </div>

    `;


    return article;

}


/* =========================================================
   029 — MARKDOWN-LIKE RENDER
========================================================= */

function formatMessageContent(
    content
) {

    const text =
        String(
            content ?? ""
        );


    if (!text) {

        return `
            <span class="message-placeholder">
                <span></span>
                <span></span>
                <span></span>
            </span>
        `;

    }


    let html =
        escapeHTML(
            text
        );


    html =
        html.replace(
            /```([\s\S]*?)```/g,
            (
                match,
                code
            ) => {

                const cleaned =
                    code
                        .replace(
                            /^\w+\n/,
                            ""
                        )
                        .trim();


                return `
                    <pre class="code-block">
                        <code>${cleaned}</code>
                    </pre>
                `;

            }
        );


    html =
        html.replace(
            /`([^`]+)`/g,
            "<code>$1</code>"
        );


    html =
        html.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );


    html =
        html.replace(
            /\n/g,
            "<br>"
        );


    return html;

}


/* =========================================================
   030 — UPDATE MESSAGE
========================================================= */

function updateRenderedMessage(
    message
) {

    const article =
        document.querySelector(
            `[data-message-id="${CSS.escape(
                message.id
            )}"]`
        );


    if (!article) {

        appendMessage(
            message
        );

        return;

    }


    const content =
        article.querySelector(
            "[data-message-content]"
        );


    if (content) {

        content.innerHTML =
            formatMessageContent(
                message.content
            );

    }


    article.classList.toggle(
        "message-error",
        Boolean(
            message.error
        )
    );


    scrollChatToBottom();

}


/* =========================================================
   031 — WELCOME STATE
========================================================= */

function updateWelcomeState(
    visible
) {

    const welcome =
        byId(
            "welcomeState"
        );


    if (!welcome) {

        return;

    }


    welcome.hidden =
        !visible;


    welcome.classList.toggle(
        "hidden",
        !visible
    );

}


/* =========================================================
   032 — INPUT
========================================================= */

function clearMessageInput() {

    const input =
        byId(
            "messageInput"
        );


    if (!input) {

        return;

    }


    input.value = "";


    autoResizeTextarea(
        input
    );


    updateComposerState();

}


function autoResizeTextarea(
    textarea
) {

    if (!textarea) {

        return;

    }


    textarea.style.height =
        "auto";


    const maxHeight =
        220;


    textarea.style.height =
        `${Math.min(
            textarea.scrollHeight,
            maxHeight
        )}px`;

}


function updateComposerState() {

    const input =
        byId(
            "messageInput"
        );


    const button =
        byId(
            "sendButton"
        );


    if (!input || !button) {

        return;

    }


    const hasText =
        Boolean(
            cleanText(
                input.value
            )
        );


    button.disabled =
        !hasText ||
        TK.isGenerating;


    button.classList.toggle(
        "ready",
        hasText &&
        !TK.isGenerating
    );

}


function updateSendState(
    generating
) {

    const button =
        byId(
            "sendButton"
        );


    if (!button) {

        return;

    }


    button.disabled =
        generating;


    button.classList.toggle(
        "loading",
        generating
    );


    const icon =
        button.querySelector(
            "svg"
        );


    if (icon) {

        icon.innerHTML =
            generating
                ? `
                    <use href="#icon-stop"></use>
                `
                : `
                    <use href="#icon-send"></use>
                `;

    }

}


/* =========================================================
   033 — SCROLL
========================================================= */

function scrollChatToBottom(
    smooth = true
) {

    const container =
        byId(
            "chatMessages"
        );


    if (!container) {

        return;

    }


    container.scrollTo({

        top:
            container.scrollHeight,

        behavior:
            smooth
                ? "smooth"
                : "auto"

    });

}


/* =========================================================
   034 — FRIENDLY ERRORS
========================================================= */

function getFriendlyError(
    error
) {

    if (!error) {

        return "Beklenmeyen bir hata oluştu.";

    }


    if (
        error.status === 401
    ) {

        return "Oturumun sona ermiş. Tekrar giriş yap.";

    }


    if (
        error.status === 403
    ) {

        return "Bu işlem için yetkin bulunmuyor.";

    }


    if (
        error.status === 404
    ) {

        return "İstenen kaynak bulunamadı.";

    }


    if (
        error.status === 429
    ) {

        return "Kullanım limitine ulaştın. Biraz sonra tekrar dene.";

    }


    if (
        error.status >= 500
    ) {

        return "Sunucuda geçici bir sorun oluştu.";

    }


    return (
        error.message ||
        "İşlem sırasında bir hata oluştu."
    );

}


/* =========================================================
   035 — ID
========================================================= */

function createId() {

    if (
        typeof crypto !==
            "undefined" &&
        crypto.randomUUID
    ) {

        return crypto.randomUUID();

    }


    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .slice(2)
    );

}


/* =========================================================
   036 — ARRAY HELPERS
========================================================= */

function normalizeArray(
    value
) {

    if (
        Array.isArray(value)
    ) {

        return value;

    }


    if (
        Array.isArray(
            value?.items
        )
    ) {

        return value.items;

    }


    if (
        Array.isArray(
            value?.data
        )
    ) {

        return value.data;

    }


    return [];

}


/* =========================================================
   037 — PROFILE
========================================================= */

const Profile = {

    async save() {

        const nameInput =
            byId(
                "profileNameInput"
            );

        const emailInput =
            byId(
                "profileEmailInput"
            );


        const name =
            cleanText(
                nameInput?.value
            );


        const email =
            cleanText(
                emailInput?.value
            );


        if (!name) {

            Toast.warning(
                "İsim boş bırakılamaz."
            );

            return;

        }


        try {

            Loading.show(
                "Profil kaydediliyor..."
            );


            const result =
                await API.patch(
                    "/api/profile",
                    {
                        name,
                        email
                    }
                );


            TK.user =
                result.user ||
                result.data?.user ||
                {
                    ...TK.user,
                    name,
                    email
                };


            updateUserUI();


            Toast.success(
                responseMessage(
                    result,
                    "Profil güncellendi."
                )
            );

        } catch (error) {

            Toast.error(
                getFriendlyError(
                    error
                )
            );

        } finally {

            Loading.hide();

        }

    }

};


/* =========================================================
   038 — MEMORY FOUNDATION
========================================================= */

const Memory = {

    async load() {

        try {

            const result =
                await API.get(
                    "/api/memory"
                );


            TK.memories =
                normalizeArray(
                    result.memories ||
                    result.data ||
                    result
                );


            TK.cache.memories =
                TK.memories;


            this.render();


        } catch (error) {

            if (
                error.status !== 401
            ) {

                Toast.error(
                    "Bellek yüklenemedi."
                );

            }

        }

    },


    render() {

        const list =
            byId(
                "memoryList"
            );


        if (!list) {

            return;

        }


        const empty =
            byId(
                "memoryEmptyState"
            );


        if (
            TK.memories.length === 0
        ) {

            list.innerHTML = "";


            if (empty) {

                empty.hidden =
                    false;

            }


            return;

        }


        if (empty) {

            empty.hidden =
                true;

        }


        list.innerHTML = "";


        TK.memories.forEach(
            memory => {

                const item =
                    document.createElement(
                        "article"
                    );


                item.className =
                    "memory-item";


                item.dataset.memoryId =
                    memory.id ||
                    memory._id ||
                    "";


                item.innerHTML = `

                    <div class="memory-icon">

                        <svg>
                            <use href="#icon-memory"></use>
                        </svg>

                    </div>


                    <div class="memory-content">

                        <strong>
                            ${escapeHTML(
                                memory.title ||
                                "Bellek"
                            )}
                        </strong>

                        <p>
                            ${escapeHTML(
                                memory.content ||
                                memory.text ||
                                memory.value ||
                                ""
                            )}
                        </p>

                        <time>
                            ${relativeTime(
                                memory.createdAt ||
                                memory.created_at
                            )}
                        </time>

                    </div>


                    <button
                        type="button"
                        class="icon-button"
                        data-memory-delete
                    >

                        <svg>
                            <use href="#icon-trash"></use>
                        </svg>

                    </button>

                `;


                list.appendChild(
                    item
                );

            }
        );

    },


    async delete(id) {

        if (!id) {

            return;

        }


        try {

            await API.delete(
                `/api/memory/${encodeURIComponent(
                    id
                )}`
            );


            TK.memories =
                TK.memories.filter(
                    item =>
                        String(
                            item.id ||
                            item._id
                        ) !==
                        String(id)
                );


            this.render();


            Toast.success(
                "Bellek silindi."
            );

        } catch (error) {

            Toast.error(
                getFriendlyError(
                    error
                )
            );

        }

    },


    async clear() {

        Modal.closeAll();


        try {

            await API.delete(
                "/api/memory"
            );


            TK.memories =
                [];


            this.render();


            Toast.success(
                "Bellek temizlendi."
            );

        } catch (error) {

            Toast.error(
                getFriendlyError(
                    error
                )
            );

        }

    }

};


/* =========================================================
   039 — FILE FOUNDATION
========================================================= */

const Files = {

    async load() {

        try {

            const result =
                await API.get(
                    "/api/files"
                );


            TK.files =
                normalizeArray(
                    result.files ||
                    result.data ||
                    result
                );


            TK.cache.files =
                TK.files;


            this.render();

        } catch (error) {

            if (
                error.status !== 401
            ) {

                Toast.error(
                    "Dosyalar yüklenemedi."
                );

            }

        }

    },


    render() {

        const list =
            byId(
                "filesList"
            );


        if (!list) {

            return;

        }


        list.innerHTML = "";


        if (
            TK.files.length === 0
        ) {

            const empty =
                byId(
                    "filesEmptyState"
                );


            if (empty) {

                empty.hidden =
                    false;

            }


            return;

        }


        const empty =
            byId(
                "filesEmptyState"
            );


        if (empty) {

            empty.hidden =
                true;

        }


        TK.files.forEach(
            file => {

                const item =
                    document.createElement(
                        "article"
                    );


                item.className =
                    "file-item";


                item.dataset.fileId =
                    file.id ||
                    file._id ||
                    "";


                item.innerHTML = `

                    <div class="file-type-icon">

                        <svg>
                            <use href="#icon-file"></use>
                        </svg>

                    </div>


                    <div class="file-item-info">

                        <strong>
                            ${escapeHTML(
                                file.name ||
                                file.filename ||
                                "Dosya"
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                                file.type ||
                                file.mimeType ||
                                "Dosya"
                            )}
                            ·
                            ${formatFileSize(
                                file.size
                            )}
                        </span>

                    </div>


                    <div class="file-item-actions">

                        <button
                            type="button"
                            data-file-open
                        >

                            <svg>
                                <use href="#icon-search"></use>
                            </svg>

                        </button>

                    </div>

                `;


                list.appendChild(
                    item
                );

            }
        );

    },


    async upload(file) {

        if (!file) {

            return;

        }


        const form =
            new FormData();


        form.append(
            "file",
            file
        );


        TK.isUploading =
            true;


        try {

            Loading.show(
                "Dosya yükleniyor..."
            );


            const result =
                await API.post(
                    "/api/upload",
                    form
                );


            const uploaded =
                result.file ||
                result.data ||
                null;


            if (uploaded) {

                TK.files.unshift(
                    uploaded
                );

            }


            this.render();


            Toast.success(
                responseMessage(
                    result,
                    "Dosya yüklendi."
                )
            );

        } catch (error) {

            Toast.error(
                getFriendlyError(
                    error
                )
            );

        } finally {

            TK.isUploading =
                false;

            Loading.hide();

        }

    }

};


/* =========================================================
   040 — FILE SIZE
========================================================= */

function formatFileSize(
    bytes
) {

    const value =
        Number(bytes);


    if (
        !Number.isFinite(value) ||
        value <= 0
    ) {

        return "0 KB";

    }


    const units = [
        "B",
        "KB",
        "MB",
        "GB"
    ];


    let size =
        value;

    let index =
        0;


    while (
        size >= 1024 &&
        index <
            units.length - 1
    ) {

        size /=
            1024;

        index++;

    }


    return `${size.toFixed(
        size >= 10
            ? 0
            : 1
    )} ${units[index]}`;

}


/* =========================================================
   041 — HISTORY FOUNDATION
========================================================= */

const History = {

    async load() {

        try {

            const result =
                await API.get(
                    "/api/chats"
                );


            TK.chats =
                normalizeArray(
                    result.chats ||
                    result.data ||
                    result
                );


            TK.cache.chats =
                TK.chats;


            this.render();

        } catch (error) {

            if (
                error.status !== 401
            ) {

                Toast.error(
                    "Sohbet geçmişi yüklenemedi."
                );

            }

        }

    },


    render() {

        const list =
            byId(
                "historyList"
            );


        if (!list) {

            return;

        }


        const empty =
            byId(
                "historyEmptyState"
            );


        if (
            TK.chats.length === 0
        ) {

            list.innerHTML = "";


            if (empty) {

                empty.hidden =
                    false;

            }


            return;

        }


        if (empty) {

            empty.hidden =
                true;

        }


        list.innerHTML = "";


        TK.chats.forEach(
            chat => {

                const button =
                    document.createElement(
                        "button"
                    );


                button.type =
                    "button";


                button.className =
                    "history-item";


                button.dataset.chatId =
                    chat.id ||
                    chat._id ||
                    "";


                button.innerHTML = `

                    <div class="history-item-icon">

                        <svg>
                            <use href="#icon-message"></use>
                        </svg>

                    </div>


                    <div class="history-item-content">

                        <strong>
                            ${escapeHTML(
                                chat.title ||
                                chat.name ||
                                "Yeni sohbet"
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                                truncate(
                                    chat.preview ||
                                    chat.lastMessage ||
                                    chat.message ||
                                    "",
                                    100
                                )
                            )}
                        </span>

                        <time>
                            ${relativeTime(
                                chat.updatedAt ||
                                chat.createdAt
                            )}
                        </time>

                    </div>

                `;


                list.appendChild(
                    button
                );

            }
        );

    }

};


/* =========================================================
   042 — ADMIN FOUNDATION
========================================================= */

const Admin = {

    async load() {

        if (
            !isAdminUser()
        ) {

            Toast.warning(
                "Admin erişimi gerekli."
            );

            Screens.show(
                "chat"
            );

            return;

        }


        try {

            const result =
                await API.get(
                    "/api/admin/dashboard"
                );


            TK.cache.admin =
                result;


            this.render(
                result
            );

        } catch (error) {

            Toast.error(
                getFriendlyError(
                    error
                )
            );

        }

    },


    render(data) {

        if (!data) {

            return;

        }


        const stats =
            data.stats ||
            data;


        const mappings = {

            users:
                stats.users ??
                stats.totalUsers,

            chats:
                stats.chats ??
                stats.totalChats,

            research:
                stats.research ??
                stats.totalResearch,

            status:
                stats.status ||
                "OK"

        };


        Object.entries(
            mappings
        ).forEach(
            ([key, value]) => {

                const element =
                    document.querySelector(
                        `[data-admin-stat="${key}"]`
                    );


                if (element) {

                    element.textContent =
                        key === "status"
                            ? String(value)
                            : formatNumber(
                                value
                            );

                }

            }
        );

    }

};


/* =========================================================
   043 — ADMIN CHECK
========================================================= */

function isAdminUser() {

    if (!TK.user) {

        return false;

    }


    return Boolean(

        TK.user.isAdmin === true ||

        TK.user.admin === true ||

        TK.user.role === "admin" ||

        TK.user.role === "developer"

    );

}


/* =========================================================
   044 — RESEARCH FOUNDATION
========================================================= */

const Research = {

    async run(query) {

        const value =
            cleanText(query);


        if (!value) {

            Toast.warning(
                "Araştırma konusu yaz."
            );

            return;

        }


        if (
            TK.isResearching
        ) {

            return;

        }


        TK.isResearching =
            true;


        const button =
            byId(
                "researchPageButton"
            );


        if (button) {

            button.disabled =
                true;

        }


        try {

            Loading.show(
                "İnternette araştırılıyor..."
            );


            const result =
                await API.post(
                    "/api/research",
                    {
                        query:
                            value,

                        question:
                            value
                    }
                );


            this.render(
                result
            );


            Toast.success(
                "Araştırma tamamlandı."
            );


            return result;

        } catch (error) {

            Toast.error(
                getFriendlyError(
                    error
                )
            );

            throw error;

        } finally {

            TK.isResearching =
                false;


            if (button) {

                button.disabled =
                    false;

            }


            Loading.hide();

        }

    },


    render(result) {

        const container =
            byId(
                "researchResults"
            );


        if (!container) {

            return;

        }


        const results =
            normalizeArray(
                result?.results ||
                result?.sources ||
                result?.data ||
                []
            );


        const summary =
            result?.summary ||
            result?.answer ||
            result?.response ||
            "";


        container.innerHTML = "";


        if (summary) {

            const summaryBox =
                document.createElement(
                    "article"
                );


            summaryBox.className =
                "research-summary";


            summaryBox.innerHTML = `

                <div class="research-summary-icon">

                    <svg>
                        <use href="#icon-spark"></use>
                    </svg>

                </div>


                <div>

                    <span class="page-kicker">
                        Özet
                    </span>

                    <p>
                        ${formatMessageContent(
                            summary
                        )}
                    </p>

                </div>

            `;


            container.appendChild(
                summaryBox
            );

        }


        results.forEach(
            source => {

                const article =
                    document.createElement(
                        "article"
                    );


                article.className =
                    "research-result-card";


                const title =
                    source.title ||
                    source.name ||
                    source.url ||
                    "Kaynak";


                const url =
                    source.url ||
                    source.link ||
                    "#";


                article.innerHTML = `

                    <div class="research-result-top">

                        <div class="research-source-icon">

                            <svg>
                                <use href="#icon-globe"></use>
                            </svg>

                        </div>


                        <div class="research-source-info">

                            <strong>
                                ${escapeHTML(
                                    title
                                )}
                            </strong>

                            <span>
                                ${escapeHTML(
                                    getDomain(
                                        url
                                    )
                                )}
                            </span>

                        </div>

                    </div>


                    <p>
                        ${escapeHTML(
                            source.summary ||
                            source.snippet ||
                            source.description ||
                            ""
                        )}
                    </p>


                    <div class="research-result-footer">

                        <a
                            href="${escapeHTML(
                                url
                            )}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Kaynağı aç
                        </a>

                    </div>

                `;


                container.appendChild(
                    article
                );

            }
        );

    }

};


/* =========================================================
   045 — DOMAIN
========================================================= */

function getDomain(url) {

    try {

        return new URL(
            url
        ).hostname;

    } catch {

        return "";

    }

}


/* =========================================================
   046 — SETTINGS
========================================================= */

const Settings = {

    load() {

        const saved =
            Storage.jsonGet(
                "turkai_settings",
                {}
            );


        TK.settings = {

            ...TK.settings,

            ...(saved || {})

        };


        this.render();

    },


    save() {

        Storage.jsonSet(
            "turkai_settings",
            TK.settings
        );

    },


    render() {

        $$(
            "[data-setting]"
        ).forEach(
            row => {

                const name =
                    row.dataset.setting;


                const input =
                    row.querySelector(
                        "input"
                    );


                if (
                    input &&
                    Object.prototype.hasOwnProperty.call(
                        TK.settings,
                        name
                    )
                ) {

                    input.checked =
                        Boolean(
                            TK.settings[name]
                        );

                }

            }
        );


        document.body.classList.toggle(
            "compact-mode",
            Boolean(
                TK.settings.compactMode
            )
        );


        document.body.classList.toggle(
            "reduced-motion",
            Boolean(
                TK.settings.reducedMotion
            )
        );


        setFusion(
            TK.settings.fusion
        );

    },


    set(
        name,
        value
    ) {

        TK.settings[name] =
            Boolean(value);


        this.save();


        this.render();

    }

};


/* =========================================================
   047 — IMAGE GENERATION
========================================================= */

const ImageGenerator = {

    async generate() {

        const input =
            byId(
                "imagePrompt"
            );


        const preview =
            byId(
                "imagePreview"
            );


        const prompt =
            cleanText(
                input?.value
            );


        if (!prompt) {

            Toast.warning(
                "Önce bir görsel açıklaması yaz."
            );

            return;

        }


        try {

            Loading.show(
                "Görsel oluşturuluyor..."
            );


            const result =
                await API.post(
                    "/api/image",
                    {
                        prompt
                    }
                );


            const imageUrl =
                result.imageUrl ||
                result.url ||
                result.image ||
                result.data?.imageUrl ||
                result.data?.url;


            if (
                preview &&
                imageUrl
            ) {

                preview.innerHTML = `
                    <img
                        src="${escapeHTML(
                            imageUrl
                        )}"
                        alt="TürkAI tarafından oluşturulan görsel"
                    >
                `;

            }


            if (imageUrl) {

                Toast.success(
                    "Görsel hazır."
                );

            } else {

                Toast.warning(
                    "Sunucu görsel sonucu döndürmedi."
                );

            }


            return result;

        } catch (error) {

            Toast.error(
                getFriendlyError(
                    error
                )
            );

            throw error;

        } finally {

            Loading.hide();

        }

    }

};


/* =========================================================
   048 — SOCKET
========================================================= */

const Socket = {

    init() {

        if (
            typeof window.io !==
            "function"
        ) {

            return;

        }


        try {

            TK.socket =
                window.io(
                    {
                        transports: [
                            "websocket",
                            "polling"
                        ],

                        auth: {

                            token:
                                TK.token

                        }

                    }
                );


            TK.socket.on(
                "connect",
                () => {

                    TK.socketConnected =
                        true;

                    Connection.online();

                }
            );


            TK.socket.on(
                "disconnect",
                () => {

                    TK.socketConnected =
                        false;

                    Connection.offline();

                }
            );


            TK.socket.on(
                "connect_error",
                () => {

                    TK.socketConnected =
                        false;

                    Connection.offline();

                }
            );


            TK.socket.on(
                "notification",
                notification => {

                    TK.notifications.unshift(
                        notification
                    );


                    Notifications.render();


                    if (
                        TK.settings.notifications
                    ) {

                        Toast.info(
                            notification.message ||
                            notification.title ||
                            "Yeni bildirim"
                        );

                    }

                }
            );


            TK.socket.on(
                "usage",
                usage => {

                    if (
                        usage
                    ) {

                        updateUsage(
                            usage.used,
                            usage.total
                        );

                    }

                }
            );


        } catch {

            Connection.offline();

        }

    },


    emit(
        event,
        data
    ) {

        if (
            TK.socket &&
            TK.socketConnected
        ) {

            TK.socket.emit(
                event,
                data
            );

        }

    }

};


/* =========================================================
   049 — BOOTSTRAP
========================================================= */

async function bootstrapAfterLogin() {

    Connection.connecting();


    try {

        Settings.load();


        Models.set(
            Storage.get(
                "turkai_model",
                "fast"
            )
        );


        setFusion(
            TK.settings.fusion
        );


        Notifications.init();


        await Promise.allSettled([

            History.load(),

            Memory.load(),

            Files.load(),

            Notifications.load()

        ]);


        Socket.init();


        Connection.online();


        updateUserUI();


        updateUsage(
            TK.limits.used,
            TK.limits.total
        );


    } catch {

        Connection.offline();

    }

}


/* =========================================================
   050 — OPENING
========================================================= */

function finishOpening() {

    const opening =
        byId(
            "openingScreen"
        );


    if (!opening) {

        return;

    }


    setTimeout(
        () => {

            opening.classList.add(
                "hidden"
            );


            setTimeout(
                () => {

                    opening.hidden =
                        true;

                },
                350
            );

        },
        500
    );

}


/* =========================================================
   051 — EVENT BINDING
========================================================= */

function bindNavigationEvents() {

    $$(
        "[data-page]"
    ).forEach(
        button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();


                    const page =
                        button.dataset.page;


                    if (!page) {

                        return;

                    }


                    Screens.show(
                        page
                    );

                }
            );

        }
    );


    const mobileButton =
        byId(
            "mobileMenuButton"
        );


    mobileButton?.addEventListener(
        "click",
        () => {

            if (
                TK.ui.sidebarOpen
            ) {

                closeSidebar();

            } else {

                openSidebar();

            }

        }
    );


    byId(
        "mobileOverlay"
    )?.addEventListener(
        "click",
        closeSidebar
    );

}


/* =========================================================
   052 — AUTH EVENTS
========================================================= */

function bindAuthEvents() {

    byId(
        "loginForm"
    )?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const username =
                cleanText(
                    byId(
                        "loginUsername"
                    )?.value
                );


            const password =
                byId(
                    "loginPassword"
                )?.value || "";


            const button =
                byId(
                    "loginSubmit"
                );


            if (
                !username ||
                !password
            ) {

                Toast.warning(
                    "Kullanıcı adı ve şifre gerekli."
                );

                return;

            }


            if (button) {

                button.disabled =
                    true;

            }


            try {

                Loading.show(
                    "Giriş yapılıyor..."
                );


                await Auth.login(
                    username,
                    password
                );


                Toast.success(
                    "Hoş geldin."
                );

            } catch (error) {

                Toast.error(
                    getFriendlyError(
                        error
                    )
                );

            } finally {

                Loading.hide();


                if (button) {

                    button.disabled =
                        false;

                }

            }

        }
    );


    byId(
        "registerForm"
    )?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const username =
                cleanText(
                    byId(
                        "registerUsername"
                    )?.value
                );


            const email =
                cleanText(
                    byId(
                        "registerEmail"
                    )?.value
                );


            const password =
                byId(
                    "registerPassword"
                )?.value || "";


            const consent =
                Boolean(
                    byId(
                        "adminConsent"
                    )?.checked
                );


            if (
                !username ||
                !email ||
                !password
            ) {

                Toast.warning(
                    "Tüm alanları doldur."
                );

                return;

            }


            if (
                password.length < 6
            ) {

                Toast.warning(
                    "Şifre en az 6 karakter olmalı."
                );

                return;

            }


            try {

                Loading.show(
                    "Hesap oluşturuluyor..."
                );


                await Auth.register(
                    username,
                    email,
                    password,
                    consent
                );


                Toast.success(
                    "Hesabın hazır."
                );

            } catch (error) {

                Toast.error(
                    getFriendlyError(
                        error
                    )
                );

            } finally {

                Loading.hide();

            }

        }
    );


    $$(
        "[data-auth-switch]"
    ).forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const target =
                        button.dataset.authSwitch;


                    if (
                        target ===
                        "register"
                    ) {

                        showRegisterScreen();

                    } else {

                        showLoginScreen();

                    }

                }
            );

        }
    );


    $$(
        "[data-logout]"
    ).forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    Auth.logout();

                }
            );

        }
    );

}


/* =========================================================
   053 — CHAT EVENTS
========================================================= */

function bindChatEvents() {

    const form =
        byId(
            "chatView"
        );


    const input =
        byId(
            "messageInput"
        );


    const send =
        byId(
            "sendButton"
        );


    input?.addEventListener(
        "input",
        () => {

            autoResizeTextarea(
                input
            );

            updateComposerState();

        }
    );


    input?.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();


                if (
                    !TK.isGenerating
                ) {

                    sendMessageFromInput();

                }

            }

        }
    );


    send?.addEventListener(
        "click",
        event => {

            event.preventDefault();


            if (
                TK.isGenerating
            ) {

                return;

            }


            sendMessageFromInput();

        }
    );


    byId(
        "newChatButton"
    )?.addEventListener(
        "click",
        () => {

            Chat.newChat();

        }
    );


    $$(
        "[data-suggestion]"
    ).forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const text =
                        button.dataset.suggestion ||
                        button.textContent;


                    if (input) {

                        input.value =
                            cleanText(text);

                        autoResizeTextarea(
                            input
                        );

                        updateComposerState();

                        input.focus();

                    }

                }
            );

        }
    );


    byId(
        "modelSelector"
    )?.addEventListener(
        "click",
        () => {

            Models.openPicker();

        }
    );


    $$(".model-option").forEach(
        option => {

            option.addEventListener(
                "click",
                () => {

                    Models.set(
                        option.dataset.model
                    );

                    Models.closePicker();

                }
            );

        }
    );


    $$(
        "[data-fusion-toggle]"
    ).forEach(
        toggle => {

            toggle.addEventListener(
                "change",
                () => {

                    const value =
                        toggle instanceof
                            HTMLInputElement
                            ? toggle.checked
                            : !TK.fusionEnabled;


                    setFusion(
                        value
                    );

                    Settings.set(
                        "fusion",
                        value
                    );

                }
            );

        }
    );


    byId(
        "researchButton"
    )?.addEventListener(
        "click",
        () => {

            const value =
                cleanText(
                    input?.value
                );


            if (!value) {

                Screens.show(
                    "research"
                );

                return;

            }


            Research.run(
                value
            );

        }
    );


    byId(
        "imageButton"
    )?.addEventListener(
        "click",
        () => {

            Modal.open(
                "imageCreateModal"
            );

        }
    );


    byId(
        "voiceButton"
    )?.addEventListener(
        "click",
        () => {

            Toast.info(
                "Ses özelliği bu sürümde henüz etkin değil."
            );

        }
    );

}


function sendMessageFromInput() {

    const input =
        byId(
            "messageInput"
        );


    if (!input) {

        return;

    }


    const text =
        cleanText(
            input.value
        );


    if (!text) {

        return;

    }


    Chat.send(
        text
    ).catch(
        () => {}
    );

}


/* =========================================================
   054 — FILE EVENTS
========================================================= */

function bindFileEvents() {

    const input =
        byId(
            "fileInput"
        );


    byId(
        "fileUploadButton"
    )?.addEventListener(
        "click",
        () => {

            input?.click();

        }
    );


    input?.addEventListener(
        "change",
        () => {

            const file =
                input.files?.[0];


            if (file) {

                Files.upload(
                    file
                );

            }


            input.value =
                "";

        }
    );


    const dropzone =
        byId(
            "fileDropzone"
        );


    if (dropzone) {

        [
            "dragenter",
            "dragover"
        ].forEach(
            eventName => {

                dropzone.addEventListener(
                    eventName,
                    event => {

                        event.preventDefault();

                        dropzone.classList.add(
                            "dragging"
                        );

                    }
                );

            }
        );


        [
            "dragleave",
            "drop"
        ].forEach(
            eventName => {

                dropzone.addEventListener(
                    eventName,
                    event => {

                        event.preventDefault();

                        dropzone.classList.remove(
                            "dragging"
                        );

                    }
                );

            }
        );


        dropzone.addEventListener(
            "drop",
            event => {

                const file =
                    event.dataTransfer?.files?.[0];


                if (file) {

                    Files.upload(
                        file
                    );

                }

            }
        );

    }

}


/* =========================================================
   055 — RESEARCH EVENTS
========================================================= */

function bindResearchEvents() {

    byId(
        "researchForm"
    )?.addEventListener(
        "submit",
        event => {

            event.preventDefault();


            const input =
                byId(
                    "researchInput"
                );


            Research.run(
                input?.value
            );

        }
    );


    $$(
        "[data-research-suggestion]"
    ).forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const input =
                        byId(
                            "researchInput"
                        );


                    if (!input) {

                        return;

                    }


                    input.value =
                        button.dataset.researchSuggestion ||
                        button.textContent;


                    input.focus();

                }
            );

        }
    );

}


/* =========================================================
   056 — PROFILE EVENTS
========================================================= */

function bindProfileEvents() {

    byId(
        "saveProfileButton"
    )?.addEventListener(
        "click",
        () => {

            Profile.save();

        }
    );

}


/* =========================================================
   057 — MEMORY EVENTS
========================================================= */

function bindMemoryEvents() {

    byId(
        "clearMemoryButton"
    )?.addEventListener(
        "click",
        () => {

            if (
                TK.memories.length === 0
            ) {

                Toast.info(
                    "Temizlenecek bellek yok."
                );

                return;

            }


            Modal.open(
                "confirmModal"
            );


            const title =
                byId(
                    "confirmModalTitle"
                );


            const text =
                byId(
                    "confirmModalText"
                );


            const button =
                byId(
                    "confirmModalButton"
                );


            if (title) {

                title.textContent =
                    "Belleği temizle";

            }


            if (text) {

                text.textContent =
                    "Kayıtlı tüm bellekleri silmek istediğine emin misin?";

            }


            if (button) {

                button.onclick =
                    async () => {

                        await Memory.clear();

                    };

            }

        }
    );

}


/* =========================================================
   058 — SETTINGS EVENTS
========================================================= */

function bindSettingsEvents() {

    $$(
        "[data-setting]"
    ).forEach(
        row => {

            const input =
                row.querySelector(
                    "input"
                );


            if (!input) {

                return;

            }


            input.addEventListener(
                "change",
                () => {

                    Settings.set(
                        row.dataset.setting,
                        input.checked
                    );

                }
            );

        }
    );

}


/* =========================================================
   059 — MODAL EVENTS
========================================================= */

function bindModalEvents() {

    $$(
        "[data-modal-close]"
    ).forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    Modal.closeAll();

                }
            );

        }
    );


    byId(
        "generateImageButton"
    )?.addEventListener(
        "click",
        () => {

            ImageGenerator
                .generate()
                .catch(
                    () => {}
                );

        }
    );


    byId(
        "feedbackSubmit"
    )?.addEventListener(
        "click",
        submitFeedback
    );


    byId(
        "correctionSubmit"
    )?.addEventListener(
        "click",
        submitCorrection
    );


    byId(
        "notificationsPanel"
    )?.querySelector(
        "[data-notifications-close]"
    )?.addEventListener(
        "click",
        () => {

            Notifications.close();

        }
    );


    byId(
        "modelPicker"
    )?.querySelector(
        "[data-model-picker-close]"
    )?.addEventListener(
        "click",
        () => {

            Models.closePicker();

        }
    );

}


/* =========================================================
   060 — FEEDBACK
========================================================= */

async function submitFeedback() {

    const selected =
        document.querySelector(
            "input[name='feedbackReason']:checked"
        );


    if (!selected) {

        Toast.warning(
            "Bir seçenek seç."
        );

        return;

    }


    try {

        await API.post(
            "/api/feedback",
            {
                reason:
                    selected.value,

                messageId:
                    TK.selectedFeedback?.messageId ||
                    null,

                type:
                    TK.selectedFeedback?.type ||
                    "general"

            }
        );


        Toast.success(
            "Geri bildirimin gönderildi."
        );


        Modal.close(
            "feedbackModal"
        );


    } catch (error) {

        Toast.error(
            getFriendlyError(
                error
            )
        );

    }

}


/* =========================================================
   061 — CORRECTION
========================================================= */

async function submitCorrection() {

    const input =
        byId(
            "correctionInput"
        );


    const value =
        cleanText(
            input?.value
        );


    if (!value) {

        Toast.warning(
            "Düzeltme bilgisini yaz."
        );

        return;

    }


    try {

        await API.post(
            "/api/corrections",
            {
                correction:
                    value,

                messageId:
                    TK.selectedCorrection?.messageId ||
                    null

            }
        );


        Toast.success(
            "Düzeltmen gönderildi."
        );


        if (input) {

            input.value =
                "";

        }


        Modal.close(
            "correctionModal"
        );


    } catch (error) {

        Toast.error(
            getFriendlyError(
                error
            )
        );

    }

}


/* =========================================================
   062 — COMMAND PALETTE
========================================================= */

const Commands = {

    open() {

        Modal.open(
            "commandPalette"
        );


        TK.ui.commandPaletteOpen =
            true;


        const input =
            byId(
                "commandSearch"
            );


        if (input) {

            input.value =
                "";

            input.focus();

        }

    },


    close() {

        Modal.close(
            "commandPalette"
        );


        TK.ui.commandPaletteOpen =
            false;

    },


    execute(command) {

        this.close();


        switch (command) {

            case "new-chat":

                Chat.newChat();

                break;


            case "chat":

                Screens.show(
                    "chat"
                );

                break;


            case "research":

                Screens.show(
                    "research"
                );

                break;


            case "coding":

                Screens.show(
                    "coding"
                );

                break;


            case "files":

                Screens.show(
                    "files"
                );

                break;


            case "memory":

                Screens.show(
                    "memory"
                );

                break;


            case "settings":

                Screens.show(
                    "settings"
                );

                break;


            default:

                break;

        }

    }

};


/* =========================================================
   063 — COMMAND EVENTS
========================================================= */

function bindCommandEvents() {

    byId(
        "commandButton"
    )?.addEventListener(
        "click",
        () => {

            Commands.open();

        }
    );


    $$(
        "[data-command]"
    ).forEach(
        item => {

            item.addEventListener(
                "click",
                () => {

                    Commands.execute(
                        item.dataset.command
                    );

                }
            );

        }
    );


    byId(
        "commandSearch"
    )?.addEventListener(
        "input",
        event => {

            filterCommands(
                event.target.value
            );

        }
    );

}


/* =========================================================
   064 — COMMAND FILTER
========================================================= */

function filterCommands(
    query
) {

    const value =
        cleanText(
            query
        ).toLocaleLowerCase(
            "tr-TR"
        );


    $$(
        ".command-item"
    ).forEach(
        item => {

            const text =
                item.textContent
                    .toLocaleLowerCase(
                        "tr-TR"
                    );


            item.hidden =
                Boolean(
                    value &&
                    !text.includes(
                        value
                    )
                );

        }
    );

}


/* =========================================================
   065 — GLOBAL EVENTS
========================================================= */

function bindGlobalEvents() {

    byId(
        "notificationButton"
    )?.addEventListener(
        "click",
        () => {

            if (
                TK.ui.notificationsOpen
            ) {

                Notifications.close();

            } else {

                Notifications.open();

            }

        }
    );


    document.addEventListener(
        "click",
        event => {

            const copyButton =
                event.target.closest(
                    "[data-copy-message]"
                );


            if (copyButton) {

                copyMessageFromButton(
                    copyButton
                );

            }


            const feedback =
                event.target.closest(
                    "[data-feedback]"
                );


            if (feedback) {

                openFeedback(
                    feedback
                );

            }


            const correction =
                event.target.closest(
                    "[data-correction]"
                );


            if (correction) {

                openCorrection(
                    correction
                );

            }


            const historyItem =
                event.target.closest(
                    "[data-chat-id]"
                );


            if (
                historyItem &&
                !event.target.closest(
                    "button[data-file]"
                )
            ) {

                const chatId =
                    historyItem.dataset.chatId;


                if (chatId) {

                    Chat.load(
                        chatId
                    );

                }

            }


            const memoryDelete =
                event.target.closest(
                    "[data-memory-delete]"
                );


            if (memoryDelete) {

                const item =
                    memoryDelete.closest(
                        "[data-memory-id]"
                    );


                if (item) {

                    Memory.delete(
                        item.dataset.memoryId
                    );

                }

            }

        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                if (
                    TK.ui.modelPickerOpen
                ) {

                    Models.closePicker();

                    return;

                }


                if (
                    TK.ui.notificationsOpen
                ) {

                    Notifications.close();

                    return;

                }


                if (
                    TK.ui.commandPaletteOpen
                ) {

                    Commands.close();

                    return;

                }


                if (
                    TK.ui.currentModal
                ) {

                    Modal.closeAll();

                    return;

                }

            }


            if (
                (event.ctrlKey ||
                    event.metaKey) &&
                event.key.toLowerCase() ===
                    "k"
            ) {

                event.preventDefault();

                Commands.open();

            }


            if (
                (event.ctrlKey ||
                    event.metaKey) &&
                event.key.toLowerCase() ===
                    "n"
            ) {

                event.preventDefault();

                Chat.newChat();

            }

        }
    );

}


/* =========================================================
   066 — COPY MESSAGE
========================================================= */

async function copyMessageFromButton(
    button
) {

    const article =
        button.closest(
            "[data-message-id]"
        );


    if (!article) {

        return;

    }


    const content =
        article.querySelector(
            "[data-message-content]"
        );


    if (!content) {

        return;

    }


    const text =
        content.innerText;


    try {

        await navigator.clipboard.writeText(
            text
        );


        Toast.success(
            "Mesaj kopyalandı."
        );

    } catch {

        Toast.error(
            "Kopyalama başarısız."
        );

    }

}


/* =========================================================
   067 — FEEDBACK OPEN
========================================================= */

function openFeedback(
    button
) {

    const article =
        button.closest(
            "[data-message-id]"
        );


    TK.selectedFeedback = {

        messageId:
            article?.dataset.messageId ||
            null,

        type:
            button.dataset.feedback ||
            "general"

    };


    const selected =
        document.querySelector(
            "input[name='feedbackReason']:checked"
        );


    if (selected) {

        selected.checked =
            false;

    }


    Modal.open(
        "feedbackModal"
    );

}


/* =========================================================
   068 — CORRECTION OPEN
========================================================= */

function openCorrection(
    button
) {

    const article =
        button.closest(
            "[data-message-id]"
        );


    TK.selectedCorrection = {

        messageId:
            article?.dataset.messageId ||
            null

    };


    Modal.open(
        "correctionModal"
    );

}


/* =========================================================
   069 — IMAGE COUNTER
========================================================= */

function bindImageEvents() {

    const input =
        byId(
            "imagePrompt"
        );


    const counter =
        byId(
            "imagePromptCount"
        );


    if (
        input &&
        counter
    ) {

        input.addEventListener(
            "input",
            () => {

                counter.textContent =
                    String(
                        input.value.length
                    );

            }
        );

    }

}


/* =========================================================
   070 — HELP SEARCH
========================================================= */

function bindHelpEvents() {

    const input =
        byId(
            "helpSearch"
        );


    input?.addEventListener(
        "input",
        () => {

            const query =
                cleanText(
                    input.value
                ).toLocaleLowerCase(
                    "tr-TR"
                );


            $$(".help-item").forEach(
                item => {

                    const text =
                        (
                            item.dataset.helpTitle ||
                            ""
                        ) +
                        " " +
                        (
                            item.dataset.helpTags ||
                            ""
                        ) +
                        " " +
                        item.textContent;


                    item.hidden =
                        Boolean(
                            query &&
                            !text
                                .toLocaleLowerCase(
                                    "tr-TR"
                                )
                                .includes(
                                    query
                                )
                        );

                }
            );

        }
    );

}


/* =========================================================
   071 — CONNECTION EVENTS
========================================================= */

function bindConnectionEvents() {

    window.addEventListener(
        "online",
        () => {

            Connection.online();


            if (TK.token) {

                Socket.init();

            }

        }
    );


    window.addEventListener(
        "offline",
        () => {

            Connection.offline();

            Toast.warning(
                "İnternet bağlantın kesildi."
            );

        }
    );

}


/* =========================================================
   072 — INITIALIZATION
========================================================= */

async function initTürkAI() {

    if (
        TURKAI.initialized
    ) {

        return;

    }


    TURKAI.initialized =
        true;


    Toast.init();

    Loading.init();

    Connection.init();

    Notifications.init();


    Settings.load();


    bindNavigationEvents();

    bindAuthEvents();

    bindChatEvents();

    bindFileEvents();

    bindResearchEvents();

    bindProfileEvents();

    bindMemoryEvents();

    bindSettingsEvents();

    bindModalEvents();

    bindCommandEvents();

    bindGlobalEvents();

    bindImageEvents();

    bindHelpEvents();

    bindConnectionEvents();


    Models.set(
        Storage.get(
            "turkai_model",
            "fast"
        )
    );


    updateComposerState();


    Connection.connecting();


    await Auth.init();


    TURKAI.booted =
        true;


    finishOpening();

}


/* =========================================================
   073 — START
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            initTürkAI()
                .catch(
                    error => {

                        console.error(
                            "TürkAI başlatılamadı:",
                            error
                        );


                        Toast.error(
                            "TürkAI başlatılırken bir hata oluştu."
                        );

                    }
                );

        },
        {
            once: true
        }
    );

} else {

    initTürkAI()
        .catch(
            error => {

                console.error(
                    "TürkAI başlatılamadı:",
                    error
                );

            }
        );

}


/* =========================================================
     APP.JS PART 1 SONU
     PART 2:
     • Advanced chat
     • streaming
     • coding
     • file preview
     • history search
     • plans/payment
     • admin tools
     • notification engine
     • research UI
     • keyboard system
========================================================= */
            <!-- =========================================================
                 PART 3 / 3
                 SETTINGS + HELP + ADMIN + MODALS + SYSTEM UI
            ========================================================== -->

            <!-- =========================================================
                 SETTINGS SCREEN
            ========================================================== -->
            <section class="screen" id="screen-settings" data-screen="settings">

                <div class="page-header">
                    <div>
                        <span class="page-eyebrow">
                            SİSTEM
                        </span>

                        <h1>
                            Ayarlar
                        </h1>

                        <p>
                            TürkAI deneyimini kendi kullanımına göre düzenle.
                        </p>
                    </div>

                    <div class="page-header-actions">
                        <button
                            class="icon-button"
                            type="button"
                            data-setting-action="reset"
                            aria-label="Ayarları sıfırla"
                            title="Ayarları sıfırla"
                        >
                            <svg>
                                <use href="#icon-refresh"></use>
                            </svg>
                        </button>
                    </div>
                </div>


                <div class="settings-layout">

                    <!-- Appearance -->
                    <div class="settings-section">

                        <div class="settings-section-header">

                            <div class="settings-section-icon">
                                <svg>
                                    <use href="#icon-spark"></use>
                                </svg>
                            </div>

                            <div>
                                <h2>
                                    Görünüm
                                </h2>

                                <p>
                                    Arayüz görünümünü özelleştir.
                                </p>
                            </div>

                        </div>


                        <div class="settings-card">

                            <div class="setting-row">

                                <div class="setting-info">

                                    <div class="setting-icon">
                                        <svg>
                                            <use href="#icon-moon"></use>
                                        </svg>
                                    </div>

                                    <div>
                                        <strong>
                                            Koyu tema
                                        </strong>

                                        <span>
                                            Premium koyu arayüzü kullan.
                                        </span>
                                    </div>

                                </div>

                                <label class="toggle">
                                    <input
                                        type="checkbox"
                                        checked
                                        data-setting="darkMode"
                                    >
                                    <span class="toggle-slider"></span>
                                </label>

                            </div>


                            <div class="setting-row">

                                <div class="setting-info">

                                    <div class="setting-icon">
                                        <svg>
                                            <use href="#icon-panel"></use>
                                        </svg>
                                    </div>

                                    <div>
                                        <strong>
                                            Kompakt kenar çubuğu
                                        </strong>

                                        <span>
                                            Menü alanını küçült.
                                        </span>
                                    </div>

                                </div>

                                <label class="toggle">
                                    <input
                                        type="checkbox"
                                        data-setting="compactSidebar"
                                    >
                                    <span class="toggle-slider"></span>
                                </label>

                            </div>

                        </div>

                    </div>


                    <!-- Chat -->
                    <div class="settings-section">

                        <div class="settings-section-header">

                            <div class="settings-section-icon">
                                <svg>
                                    <use href="#icon-message"></use>
                                </svg>
                            </div>

                            <div>
                                <h2>
                                    Sohbet
                                </h2>

                                <p>
                                    Yanıt ve sohbet davranışlarını yönet.
                                </p>
                            </div>

                        </div>


                        <div class="settings-card">

                            <div class="setting-row">

                                <div class="setting-info">

                                    <div class="setting-icon">
                                        <svg>
                                            <use href="#icon-spark"></use>
                                        </svg>
                                    </div>

                                    <div>
                                        <strong>
                                            Otomatik araştırma
                                        </strong>

                                        <span>
                                            Güncel sorularda araştırma motorunu kullan.
                                        </span>
                                    </div>

                                </div>

                                <label class="toggle">
                                    <input
                                        type="checkbox"
                                        checked
                                        data-setting="autoResearch"
                                    >
                                    <span class="toggle-slider"></span>
                                </label>

                            </div>


                            <div class="setting-row">

                                <div class="setting-info">

                                    <div class="setting-icon">
                                        <svg>
                                            <use href="#icon-memory"></use>
                                        </svg>
                                    </div>

                                    <div>
                                        <strong>
                                            Bellek
                                        </strong>

                                        <span>
                                            Açıkça kaydettiğin bilgileri hatırla.
                                        </span>
                                    </div>

                                </div>

                                <label class="toggle">
                                    <input
                                        type="checkbox"
                                        checked
                                        data-setting="memory"
                                    >
                                    <span class="toggle-slider"></span>
                                </label>

                            </div>


                            <div class="setting-row">

                                <div class="setting-info">

                                    <div class="setting-icon">
                                        <svg>
                                            <use href="#icon-code"></use>
                                        </svg>
                                    </div>

                                    <div>
                                        <strong>
                                            Kod biçimlendirme
                                        </strong>

                                        <span>
                                            Kod cevaplarını düzenli göster.
                                        </span>
                                    </div>

                                </div>

                                <label class="toggle">
                                    <input
                                        type="checkbox"
                                        checked
                                        data-setting="codeFormatting"
                                    >
                                    <span class="toggle-slider"></span>
                                </label>

                            </div>

                        </div>

                    </div>


                    <!-- Privacy -->
                    <div class="settings-section">

                        <div class="settings-section-header">

                            <div class="settings-section-icon">
                                <svg>
                                    <use href="#icon-shield"></use>
                                </svg>
                            </div>

                            <div>
                                <h2>
                                    Gizlilik ve güvenlik
                                </h2>

                                <p>
                                    Hesap ve veri tercihlerini yönet.
                                </p>
                            </div>

                        </div>


                        <div class="settings-card">

                            <div class="setting-row">

                                <div class="setting-info">

                                    <div class="setting-icon">
                                        <svg>
                                            <use href="#icon-shield"></use>
                                        </svg>
                                    </div>

                                    <div>
                                        <strong>
                                            Güvenli bağlantı
                                        </strong>

                                        <span>
                                            Sunucu bağlantı durumunu kontrol et.
                                        </span>
                                    </div>

                                </div>

                                <span class="status-pill success">
                                    <span class="status-dot"></span>
                                    Aktif
                                </span>

                            </div>


                            <div class="setting-row">

                                <div class="setting-info">

                                    <div class="setting-icon">
                                        <svg>
                                            <use href="#icon-history"></use>
                                        </svg>
                                    </div>

                                    <div>
                                        <strong>
                                            Sohbet geçmişi
                                        </strong>

                                        <span>
                                            Sohbetlerinin hesapta tutulmasını yönet.
                                        </span>
                                    </div>

                                </div>

                                <label class="toggle">
                                    <input
                                        type="checkbox"
                                        checked
                                        data-setting="chatHistory"
                                    >
                                    <span class="toggle-slider"></span>
                                </label>

                            </div>

                        </div>

                    </div>

                </div>

            </section>


            <!-- =========================================================
                 HELP SCREEN
            ========================================================== -->
            <section class="screen" id="screen-help" data-screen="help">

                <div class="page-header">

                    <div>
                        <span class="page-eyebrow">
                            DESTEK
                        </span>

                        <h1>
                            Yardım Merkezi
                        </h1>

                        <p>
                            TürkAI özelliklerini keşfet ve sık sorulan sorulara bak.
                        </p>
                    </div>

                </div>


                <div class="help-search-wrapper">

                    <div class="search-box large">

                        <svg>
                            <use href="#icon-search"></use>
                        </svg>

                        <input
                            type="search"
                            id="helpSearch"
                            placeholder="Yardım konusu ara..."
                            autocomplete="off"
                        >

                        <kbd>
                            /
                        </kbd>

                    </div>

                </div>


                <div class="help-grid">

                    <article
                        class="help-item"
                        data-help-title="TürkAI nasıl kullanılır?"
                        data-help-content="Sohbet ekranından mesaj yazarak başlayabilirsin."
                    >

                        <div class="help-item-icon">
                            <svg>
                                <use href="#icon-message"></use>
                            </svg>
                        </div>

                        <div>
                            <h3>
                                Sohbet nasıl kullanılır?
                            </h3>

                            <p>
                                TürkAI ile soru sor, fikir üret veya kod yaz.
                            </p>
                        </div>

                        <svg class="help-arrow">
                            <use href="#icon-chevron-right"></use>
                        </svg>

                    </article>


                    <article
                        class="help-item"
                        data-help-title="Araştırma"
                        data-help-content="Güncel bilgileri araştırma ekranından inceleyebilirsin."
                    >

                        <div class="help-item-icon">
                            <svg>
                                <use href="#icon-search"></use>
                            </svg>
                        </div>

                        <div>
                            <h3>
                                Araştırma
                            </h3>

                            <p>
                                Güncel konuları kaynaklarla araştır.
                            </p>
                        </div>

                        <svg class="help-arrow">
                            <use href="#icon-chevron-right"></use>
                        </svg>

                    </article>


                    <article
                        class="help-item"
                        data-help-title="Dosyalar"
                        data-help-content="Belgelerini TürkAI içine yükleyip analiz edebilirsin."
                    >

                        <div class="help-item-icon">
                            <svg>
                                <use href="#icon-file"></use>
                            </svg>
                        </div>

                        <div>
                            <h3>
                                Dosyalar
                            </h3>

                            <p>
                                Belgelerini yükle ve içeriklerini incele.
                            </p>
                        </div>

                        <svg class="help-arrow">
                            <use href="#icon-chevron-right"></use>
                        </svg>

                    </article>


                    <article
                        class="help-item"
                        data-help-title="Kodlama"
                        data-help-content="Kodlama ekranında farklı programlama dilleriyle çalış."
                    >

                        <div class="help-item-icon">
                            <svg>
                                <use href="#icon-code"></use>
                            </svg>
                        </div>

                        <div>
                            <h3>
                                Kodlama
                            </h3>

                            <p>
                                Kod yaz, düzenle ve uygun ortamlarda çalıştır.
                            </p>
                        </div>

                        <svg class="help-arrow">
                            <use href="#icon-chevron-right"></use>
                        </svg>

                    </article>


                    <article
                        class="help-item"
                        data-help-title="Bellek"
                        data-help-content="Açıkça kaydettiğin bilgileri bellek alanından yönet."
                    >

                        <div class="help-item-icon">
                            <svg>
                                <use href="#icon-memory"></use>
                            </svg>
                        </div>

                        <div>
                            <h3>
                                Bellek
                            </h3>

                            <p>
                                Kaydedilen bilgilerini görüntüle ve yönet.
                            </p>
                        </div>

                        <svg class="help-arrow">
                            <use href="#icon-chevron-right"></use>
                        </svg>

                    </article>


                    <article
                        class="help-item"
                        data-help-title="Planlar"
                        data-help-content="Hesabındaki plan ve kullanım bilgilerini planlar ekranından görebilirsin."
                    >

                        <div class="help-item-icon">
                            <svg>
                                <use href="#icon-plan"></use>
                            </svg>
                        </div>

                        <div>
                            <h3>
                                Planlar
                            </h3>

                            <p>
                                Planlarını ve kullanım limitlerini incele.
                            </p>
                        </div>

                        <svg class="help-arrow">
                            <use href="#icon-chevron-right"></use>
                        </svg>

                    </article>

                </div>

            </section>


            <!-- =========================================================
                 ADMIN SCREEN
            ========================================================== -->
            <section class="screen" id="screen-admin" data-screen="admin">

                <div class="page-header">

                    <div>
                        <span class="page-eyebrow">
                            YÖNETİM
                        </span>

                        <h1>
                            Admin Merkezi
                        </h1>

                        <p>
                            TürkAI sistem durumunu ve yönetim verilerini görüntüle.
                        </p>
                    </div>

                    <div class="admin-status">

                        <span class="status-pill success">
                            <span class="status-dot"></span>
                            Sistem aktif
                        </span>

                    </div>

                </div>


                <div id="adminDashboard">

                    <div class="admin-stat-grid">

                        <div class="admin-stat-card">

                            <div class="admin-stat-icon">
                                <svg>
                                    <use href="#icon-user"></use>
                                </svg>
                            </div>

                            <div>
                                <span>
                                    Kullanıcılar
                                </span>

                                <strong data-admin-users>
                                    —
                                </strong>
                            </div>

                        </div>


                        <div class="admin-stat-card">

                            <div class="admin-stat-icon">
                                <svg>
                                    <use href="#icon-message"></use>
                                </svg>
                            </div>

                            <div>
                                <span>
                                    Mesajlar
                                </span>

                                <strong data-admin-messages>
                                    —
                                </strong>
                            </div>

                        </div>


                        <div class="admin-stat-card">

                            <div class="admin-stat-icon">
                                <svg>
                                    <use href="#icon-spark"></use>
                                </svg>
                            </div>

                            <div>
                                <span>
                                    AI istekleri
                                </span>

                                <strong data-admin-requests>
                                    —
                                </strong>
                            </div>

                        </div>


                        <div class="admin-stat-card">

                            <div class="admin-stat-icon">
                                <svg>
                                    <use href="#icon-shield"></use>
                            </div>

                            <div>
                                <span>
                                    Güvenlik
                                </span>

                                <strong>
                                    Aktif
                                </strong>
                            </div>

                        </div>

                    </div>


                    <div class="admin-grid">

                        <div class="admin-panel">

                            <div class="admin-panel-header">

                                <div>
                                    <h2>
                                        Sistem durumu
                                    </h2>

                                    <p>
                                        TürkAI servislerinin genel durumu.
                                    </p>
                                </div>

                                <svg>
                                    <use href="#icon-refresh"></use>
                                </svg>

                            </div>


                            <div class="system-status-list">

                                <div class="system-status-row">

                                    <span>
                                        API
                                    </span>

                                    <span class="status-pill success">
                                        Aktif
                                    </span>

                                </div>


                                <div class="system-status-row">

                                    <span>
                                        Socket bağlantısı
                                    </span>

                                    <span class="status-pill success">
                                        Hazır
                                    </span>

                                </div>


                                <div class="system-status-row">

                                    <span>
                                        Veritabanı
                                    </span>

                                    <span class="status-pill success">
                                        Hazır
                                    </span>

                                </div>


                                <div class="system-status-row">

                                    <span>
                                        Araştırma
                                    </span>

                                    <span class="status-pill success">
                                        Hazır
                                    </span>

                                </div>

                            </div>

                        </div>


                        <div class="admin-panel">

                            <div class="admin-panel-header">

                                <div>
                                    <h2>
                                        Son aktiviteler
                                    </h2>

                                    <p>
                                        Yönetim olayları.
                                    </p>
                                </div>

                            </div>


                            <div
                                class="admin-activity-list"
                                data-admin-activity
                            >

                                <div class="empty-state compact">

                                    <div class="empty-state-icon">
                                        <svg>
                                            <use href="#icon-history"></use>
                                        </svg>
                                    </div>

                                    <p>
                                        Aktivite verileri yükleniyor...
                                    </p>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </section>


            <!-- =========================================================
                 USAGE PANEL
            ========================================================== -->
            <div class="usage-floating-panel" id="usagePanel">

                <div class="usage-panel-header">

                    <div>
                        <span>
                            Günlük kullanım
                        </span>

                        <strong>
                            <span data-usage-used>0</span>
                            /
                            <span data-usage-total>50</span>
                        </strong>
                    </div>

                    <svg>
                        <use href="#icon-spark"></use>
                    </svg>

                </div>

                <div class="usage-progress">

                    <span
                        data-usage-progress
                        style="width:0%"
                    ></span>

                </div>

            </div>


            <!-- =========================================================
                 NOTIFICATIONS PANEL
            ========================================================== -->
            <aside
                class="notifications-panel"
                id="notificationsPanel"
                aria-hidden="true"
            >

                <div class="notifications-header">

                    <div>

                        <span class="page-eyebrow">
                            MERKEZ
                        </span>

                        <h2>
                            Bildirimler
                        </h2>

                    </div>

                    <button
                        type="button"
                        class="icon-button"
                        data-notifications-close
                        aria-label="Bildirimleri kapat"
                    >
                        <svg>
                            <use href="#icon-close"></use>
                        </svg>
                    </button>

                </div>


                <div
                    id="notificationsList"
                    class="notifications-list"
                >

                    <div class="empty-state compact">

                        <div class="empty-state-icon">
                            <svg>
                                <use href="#icon-bell"></use>
                            </svg>
                        </div>

                        <h3>
                            Bildirim yok
                        </h3>

                        <p>
                            Yeni bildirimler burada görünecek.
                        </p>

                    </div>

                </div>

            </aside>


            <!-- =========================================================
                 MODEL PICKER
            ========================================================== -->
            <div
                class="model-picker"
                id="modelPicker"
                aria-hidden="true"
            >

                <div class="model-picker-header">

                    <div>
                        <span class="page-eyebrow">
                            AI MODELİ
                        </span>

                        <h3>
                            Model seç
                        </h3>
                    </div>

                    <button
                        type="button"
                        class="icon-button"
                        data-model-picker-close
                        aria-label="Kapat"
                    >
                        <svg>
                            <use href="#icon-close"></use>
                        </svg>
                    </button>

                </div>


                <div
                    id="modelPickerList"
                    class="model-picker-list"
                >

                    <button
                        type="button"
                        class="model-option active"
                        data-model="fast"
                    >

                        <span class="model-option-icon">
                            <svg>
                                <use href="#icon-spark"></use>
                            </svg>
                        </span>

                        <span>
                            <strong>
                                Fast
                            </strong>

                            <small>
                                Hızlı cevaplar
                            </small>
                        </span>

                        <svg class="model-check">
                            <use href="#icon-check"></use>
                        </svg>

                    </button>


                    <button
                        type="button"
                        class="model-option"
                        data-model="think"
                    >

                        <span class="model-option-icon">
                            <svg>
                                <use href="#icon-bulb"></use>
                            </svg>
                        </span>

                        <span>
                            <strong>
                                Think
                            </strong>

                            <small>
                                Derin düşünme
                            </small>
                        </span>

                        <svg class="model-check">
                            <use href="#icon-check"></use>
                        </svg>

                    </button>


                    <button
                        type="button"
                        class="model-option"
                        data-model="code"
                    >

                        <span class="model-option-icon">
                            <svg>
                                <use href="#icon-code"></use>
                            </svg>
                        </span>

                        <span>
                            <strong>
                                Code
                            </strong>

                            <small>
                                Programlama
                            </small>
                        </span>

                        <svg class="model-check">
                            <use href="#icon-check"></use>
                        </svg>

                    </button>


                    <button
                        type="button"
                        class="model-option"
                        data-model="research"
                    >

                        <span class="model-option-icon">
                            <svg>
                                <use href="#icon-search"></use>
                            </svg>
                        </span>

                        <span>
                            <strong>
                                Research
                            </strong>

                            <small>
                                Kaynaklı araştırma
                            </small>
                        </span>

                        <svg class="model-check">
                            <use href="#icon-check"></use>
                        </svg>

                    </button>


                    <button
                        type="button"
                        class="model-option"
                        data-model="learn"
                    >

                        <span class="model-option-icon">
                            <svg>
                                <use href="#icon-bulb"></use>
                            </svg>
                        </span>

                        <span>
                            <strong>
                                Learn
                            </strong>

                            <small>
                                Öğrenme modu
                            </small>
                        </span>

                        <svg class="model-check">
                            <use href="#icon-check"></use>
                        </svg>

                    </button>


                    <button
                        type="button"
                        class="model-option"
                        data-model="creative"
                    >

                        <span class="model-option-icon">
                            <svg>
                                <use href="#icon-spark"></use>
                            </svg>
                        </span>

                        <span>
                            <strong>
                                Creative
                            </strong>

                            <small>
                                Yaratıcı üretim
                            </small>
                        </span>

                        <svg class="model-check">
                            <use href="#icon-check"></use>
                        </svg>

                    </button>

                </div>

            </div>


            <!-- =========================================================
                 FILE PREVIEW MODAL
            ========================================================== -->
            <div
                class="turkai-modal"
                id="filePreviewModal"
                aria-hidden="true"
            >

                <div class="modal-backdrop" data-modal-close></div>

                <div
                    class="modal-dialog file-preview-dialog"
                    role="dialog"
                    aria-modal="true"
                >

                    <div class="modal-header">

                        <div class="modal-title-area">

                            <div class="modal-icon">
                                <svg>
                                    <use href="#icon-file"></use>
                                </svg>
                            </div>

                            <div>
                                <span>
                                    DOSYA
                                </span>

                                <h2 data-file-preview-title>
                                    Dosya önizleme
                                </h2>
                            </div>

                        </div>

                        <button
                            type="button"
                            class="icon-button"
                            data-modal-close
                            aria-label="Kapat"
                        >
                            <svg>
                                <use href="#icon-close"></use>
                            </svg>
                        </button>

                    </div>


                    <div
                        class="file-preview-content"
                        data-file-preview-content
                    >
                        Dosya içeriği burada görüntülenecek.
                    </div>


                    <div class="modal-footer">

                        <button
                            type="button"
                            class="secondary-button"
                            data-modal-close
                        >
                            Kapat
                        </button>

                    </div>

                </div>

            </div>


            <!-- =========================================================
                 FEEDBACK MODAL
            ========================================================== -->
            <div
                class="turkai-modal"
                id="feedbackModal"
                aria-hidden="true"
            >

                <div class="modal-backdrop" data-modal-close></div>

                <div
                    class="modal-dialog"
                    role="dialog"
                    aria-modal="true"
                >

                    <div class="modal-header">

                        <div class="modal-title-area">

                            <div class="modal-icon">
                                <svg>
                                    <use href="#icon-message"></use>
                                </svg>
                            </div>

                            <div>
                                <span>
                                    GERİ BİLDİRİM
                                </span>

                                <h2>
                                    Yanıtı değerlendir
                                </h2>
                            </div>

                        </div>

                        <button
                            type="button"
                            class="icon-button"
                            data-modal-close
                            aria-label="Kapat"
                        >
                            <svg>
                                <use href="#icon-close"></use>
                            </svg>
                        </button>

                    </div>


                    <div class="feedback-options">

                        <label class="feedback-option">

                            <input
                                type="radio"
                                name="feedbackReason"
                                value="helpful"
                            >

                            <span>
                                <svg>
                                    <use href="#icon-check"></use>
                                </svg>

                                Faydalı
                            </span>

                        </label>


                        <label class="feedback-option">

                            <input
                                type="radio"
                                name="feedbackReason"
                                value="incorrect"
                            >

                            <span>
                                <svg>
                                    <use href="#icon-close"></use>
                                </svg>

                                Hatalı
                            </span>

                        </label>


                        <label class="feedback-option">

                            <input
                                type="radio"
                                name="feedbackReason"
                                value="incomplete"
                            >

                            <span>
                                <svg>
                                    <use href="#icon-message"></use>
                                </svg>

                                Eksik
                            </span>

                        </label>


                        <label class="feedback-option">

                            <input
                                type="radio"
                                name="feedbackReason"
                                value="other"
                            >

                            <span>
                                <svg>
                                    <use href="#icon-bulb"></use>
                                </svg>

                                Diğer
                            </span>

                        </label>

                    </div>


                    <textarea
                        id="feedbackText"
                        class="modal-textarea"
                        rows="4"
                        placeholder="İstersen daha fazla bilgi yaz..."
                    ></textarea>


                    <div class="modal-footer">

                        <button
                            type="button"
                            class="secondary-button"
                            data-modal-close
                        >
                            Vazgeç
                        </button>

                        <button
                            type="button"
                            class="primary-button"
                            id="feedbackSubmit"
                        >
                            <svg>
                                <use href="#icon-send"></use>
                            </svg>

                            Gönder
                        </button>

                    </div>

                </div>

            </div>


            <!-- =========================================================
                 CORRECTION MODAL
            ========================================================== -->
            <div
                class="turkai-modal"
                id="correctionModal"
                aria-hidden="true"
            >

                <div class="modal-backdrop" data-modal-close></div>

                <div
                    class="modal-dialog"
                    role="dialog"
                    aria-modal="true"
                >

                    <div class="modal-header">

                        <div class="modal-title-area">

                            <div class="modal-icon">
                                <svg>
                                    <use href="#icon-bulb"></use>
                                </svg>
                            </div>

                            <div>
                                <span>
                                    DÜZELTME
                                </span>

                                <h2>
                                    Yanıtı düzelt
                                </h2>
                            </div>

                        </div>

                        <button
                            type="button"
                            class="icon-button"
                            data-modal-close
                            aria-label="Kapat"
                        >
                            <svg>
                                <use href="#icon-close"></use>
                            </svg>
                        </button>

                    </div>


                    <div class="correction-info">

                        <svg>
                            <use href="#icon-bulb"></use>
                        </svg>

                        <p>
                            Yanıtın hangi bölümünün yanlış veya eksik olduğunu
                            mümkün olduğunca açık yaz.
                        </p>

                    </div>


                    <textarea
                        id="correctionInput"
                        class="modal-textarea"
                        rows="7"
                        placeholder="Örneğin: Bu bilgi güncel değil..."
                    ></textarea>


                    <div class="modal-footer">

                        <button
                            type="button"
                            class="secondary-button"
                            data-modal-close
                        >
                            Vazgeç
                        </button>

                        <button
                            type="button"
                            class="primary-button"
                            id="correctionSubmit"
                        >
                            <svg>
                                <use href="#icon-send"></use>
                            </svg>

                            Düzeltmeyi gönder
                        </button>

                    </div>

                </div>

            </div>


            <!-- =========================================================
                 IMAGE CREATION MODAL
            ========================================================== -->
            <div
                class="turkai-modal"
                id="imageCreateModal"
                aria-hidden="true"
            >

                <div class="modal-backdrop" data-modal-close></div>

                <div
                    class="modal-dialog image-dialog"
                    role="dialog"
                    aria-modal="true"
                >

                    <div class="modal-header">

                        <div class="modal-title-area">

                            <div class="modal-icon">
                                <svg>
                                    <use href="#icon-image"></use>
                                </svg>
                            </div>

                            <div>
                                <span>
                                    GÖRSEL ÜRETİM
                                </span>

                                <h2>
                                    Görsel oluştur
                                </h2>
                            </div>

                        </div>

                        <button
                            type="button"
                            class="icon-button"
                            data-modal-close
                            aria-label="Kapat"
                        >
                            <svg>
                                <use href="#icon-close"></use>
                            </svg>
                        </button>

                    </div>


                    <div class="image-create-layout">

                        <div class="image-create-form">

                            <label
                                class="field-label"
                                for="imagePrompt"
                            >
                                Prompt
                            </label>

                            <textarea
                                id="imagePrompt"
                                class="modal-textarea image-prompt"
                                rows="8"
                                placeholder="Nasıl bir görsel oluşturmak istiyorsun?"
                            ></textarea>


                            <div class="image-options">

                                <button
                                    type="button"
                                    class="image-style-option active"
                                    data-image-style="realistic"
                                >
                                    Gerçekçi
                                </button>

                                <button
                                    type="button"
                                    class="image-style-option"
                                    data-image-style="cinematic"
                                >
                                    Sinematik
                                </button>

                                <button
                                    type="button"
                                    class="image-style-option"
                                    data-image-style="illustration"
                                >
                                    İllüstrasyon
                                </button>

                            </div>


                            <button
                                type="button"
                                class="primary-button wide"
                                id="generateImageButton"
                            >

                                <svg>
                                    <use href="#icon-spark"></use>
                                </svg>

                                Görsel oluştur

                            </button>

                        </div>


                        <div
                            class="image-preview-container"
                            id="imagePreview"
                        >

                            <div class="image-preview-empty">

                                <div class="image-preview-icon">

                                    <svg>
                                        <use href="#icon-image"></use>
                                    </svg>

                                </div>

                                <h3>
                                    Önizleme
                                </h3>

                                <p>
                                    Oluşturduğun görsel burada görünecek.
                                </p>

                            </div>

                        </div>

                    </div>

                </div>

            </div>


            <!-- =========================================================
                 COMMAND PALETTE
            ========================================================== -->
            <div
                class="command-palette"
                id="commandPalette"
                aria-hidden="true"
            >

                <div
                    class="command-backdrop"
                    data-command-close
                ></div>

                <div class="command-dialog">

                    <div class="command-search">

                        <svg>
                            <use href="#icon-command"></use>
                        </svg>

                        <input
                            type="search"
                            id="commandSearch"
                            placeholder="Komut ara..."
                            autocomplete="off"
                        >

                        <kbd>
                            ESC
                        </kbd>

                    </div>


                    <div
                        id="commandList"
                        class="command-list"
                    >

                        <button
                            type="button"
                            class="command-item"
                            data-command="new-chat"
                        >

                            <span class="command-item-icon">
                                <svg>
                                    <use href="#icon-plus"></use>
                                </svg>
                            </span>

                            <span>
                                <strong>
                                    Yeni sohbet
                                </strong>

                                <small>
                                    Yeni bir sohbet başlat
                                </small>
                            </span>

                            <kbd>
                                N
                            </kbd>

                        </button>


                        <button
                            type="button"
                            class="command-item"
                            data-command="research"
                        >

                            <span class="command-item-icon">
                                <svg>
                                    <use href="#icon-search"></use>
                                </svg>
                            </span>

                            <span>
                                <strong>
                                    Araştırmaya git
                                </strong>

                                <small>
                                    Araştırma merkezini aç
                                </small>
                            </span>

                        </button>


                        <button
                            type="button"
                            class="command-item"
                            data-command="files"
                        >

                            <span class="command-item-icon">
                                <svg>
                                    <use href="#icon-file"></use>
                                </svg>
                            </span>

                            <span>
                                <strong>
                                    Dosyalar
                                </strong>

                                <small>
                                    Dosya merkezini aç
                                </small>
                            </span>

                        </button>


                        <button
                            type="button"
                            class="command-item"
                            data-command="coding"
                        >

                            <span class="command-item-icon">
                                <svg>
                                    <use href="#icon-code"></use>
                                </svg>
                            </span>

                            <span>
                                <strong>
                                    Kodlama
                                </strong>

                                <small>
                                    Kod editörünü aç
                                </small>
                            </span>

                        </button>


                        <button
                            type="button"
                            class="command-item"
                            data-command="memory"
                        >

                            <span class="command-item-icon">
                                <svg>
                                    <use href="#icon-memory"></use>
                                </svg>
                            </span>

                            <span>
                                <strong>
                                    Bellek
                                </strong>

                                <small>
                                    Bellek merkezini aç
                                </small>
                            </span>

                        </button>


                        <button
                            type="button"
                            class="command-item"
                            data-command="settings"
                        >

                            <span class="command-item-icon">
                                <svg>
                                    <use href="#icon-settings"></use>
                                </svg>
                            </span>

                            <span>
                                <strong>
                                    Ayarlar
                                </strong>

                                <small>
                                    TürkAI ayarlarını aç
                                </small>
                            </span>

                        </button>

                    </div>

                </div>

            </div>


            <!-- =========================================================
                 TOAST CONTAINER
            ========================================================== -->
            <div
                id="toastContainer"
                class="toast-container"
                aria-live="polite"
                aria-atomic="true"
            ></div>


            <!-- =========================================================
                 GLOBAL LOADING
            ========================================================== -->
            <div
                id="globalLoading"
                class="global-loading"
                aria-hidden="true"
            >

                <div class="loading-card">

                    <div class="loading-spinner"></div>

                    <strong>
                        TürkAI çalışıyor
                    </strong>

                    <span data-loading-text>
                        İşleniyor...
                    </span>

                </div>

            </div>


            <!-- =========================================================
                 MOBILE OVERLAY
            ========================================================== -->
            <div
                id="mobileOverlay"
                class="mobile-overlay"
                aria-hidden="true"
            ></div>


            <!-- =========================================================
                 CONNECTION STATUS
            ========================================================== -->
            <div
                id="connectionStatus"
                class="connection-status"
                aria-live="polite"
            >

                <span class="connection-status-dot"></span>

                <span data-connection-text>
                    Bağlantı kontrol ediliyor...
                </span>

            </div>


            <!-- =========================================================
                 HIDDEN SYSTEM DATA
            ========================================================== -->
            <div
                id="turkaiSystemState"
                hidden
                data-version="11.0.0"
                data-app="TürkAI"
            ></div>


            <!-- =========================================================
                 GLOBAL CONFIRM MODAL
            ========================================================== -->
            <div
                class="turkai-modal"
                id="confirmModal"
                aria-hidden="true"
            >

                <div class="modal-backdrop" data-modal-close></div>

                <div
                    class="modal-dialog small"
                    role="dialog"
                    aria-modal="true"
                >

                    <div class="modal-header">

                        <div class="modal-title-area">

                            <div class="modal-icon warning">
                                <svg>
                                    <use href="#icon-alert"></use>
                                </svg>
                            </div>

                            <div>
                                <span>
                                    ONAY
                                </span>

                                <h2 data-confirm-title>
                                    Emin misin?
                                </h2>
                            </div>

                        </div>

                        <button
                            type="button"
                            class="icon-button"
                            data-modal-close
                            aria-label="Kapat"
                        >
                            <svg>
                                <use href="#icon-close"></use>
                            </svg>
                        </button>

                    </div>


                    <div class="confirm-content">

                        <p data-confirm-message>
                            Bu işlem geri alınamayabilir.
                        </p>

                    </div>


                    <div class="modal-footer">

                        <button
                            type="button"
                            class="secondary-button"
                            data-modal-close
                        >
                            İptal
                        </button>

                        <button
                            type="button"
                            class="danger-button"
                            id="confirmActionButton"
                        >
                            Devam et
                        </button>

                    </div>

                </div>

            </div>


        </main>


        <!-- =============================================================
             MOBILE BOTTOM NAVIGATION
        ============================================================= -->
        <nav
            class="mobile-bottom-nav"
            id="mobileBottomNav"
            aria-label="Mobil menü"
        >

            <button
                type="button"
                class="mobile-nav-item active"
                data-page="chat"
            >

                <svg>
                    <use href="#icon-message"></use>
                </svg>

                <span>
                    Sohbet
                </span>

            </button>


            <button
                type="button"
                class="mobile-nav-item"
                data-page="research"
            >

                <svg>
                    <use href="#icon-search"></use>
                </svg>

                <span>
                    Araştır
                </span>

            </button>


            <button
                type="button"
                class="mobile-nav-item"
                data-page="files"
            >

                <svg>
                    <use href="#icon-file"></use>
                </svg>

                <span>
                    Dosyalar
                </span>

            </button>


            <button
                type="button"
                class="mobile-nav-item"
                data-page="coding"
            >

                <svg>
                    <use href="#icon-code"></use>
                </svg>

                <span>
                    Kod
                </span>

            </button>


            <button
                type="button"
                class="mobile-nav-item"
                data-page="profile"
            >

                <svg>
                    <use href="#icon-user"></use>
                </svg>

                <span>
                    Profil
                </span>

            </button>

        </nav>


        <!-- =============================================================
             SCREEN READER LIVE REGION
        ============================================================= -->
        <div
            id="ariaLive"
            class="sr-only"
            aria-live="polite"
            aria-atomic="true"
        ></div>


    </div>


    <!-- =============================================================
         APP JAVASCRIPT
         index.html → app.js → API → server.js
    ============================================================= -->

    <script src="/app.js" defer></script>


</body>
</html>

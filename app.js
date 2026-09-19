/* =========================================================
   TÜRKAI — APP.JS
   PART 1 / 2
   Core UI + Chat + Navigation + API + Modals
   ========================================================= */

"use strict";

/* =========================================================
   1. GLOBAL CONFIG
   ========================================================= */

const TURKAI = {
    version: "20.0.0",

    apiBase: "",

    state: {
        currentPage: "chat",
        currentModel: "auto",
        currentConversationId: null,
        currentUser: null,

        isSending: false,
        isOnline: navigator.onLine,
        isRecording: false,

        selectedFile: null,
        uploadedFile: null,

        sidebarOpen: false,
        modelMenuOpen: false,
        notificationOpen: false,
        userMenuOpen: false,

        activeModal: null,

        messages: []
    },

    config: {
        maxMessageLength: 50000,
        requestTimeout: 60000,
        maxFileSize: 10 * 1024 * 1024
    }
};


/* =========================================================
   2. SHORTCUTS
   ========================================================= */

const $ = (selector, parent = document) => {
    return parent.querySelector(selector);
};

const $$ = (selector, parent = document) => {
    return [...parent.querySelectorAll(selector)];
};

function byId(id) {
    return document.getElementById(id);
}

function exists(id) {
    return !!document.getElementById(id);
}


/* =========================================================
   3. DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    console.log("TürkAI App başlatılıyor...");

    initNavigation();
    initChat();
    initComposer();
    initModals();
    initMenus();
    initSidebar();
    initKeyboard();
    initOnlineState();
    initGlobalButtons();
    initCharacterCounter();
    initSuggestions();
    initFileSystem();

    restoreLocalState();

    console.log("TürkAI App hazır.");
});


/* =========================================================
   4. NAVIGATION
   ========================================================= */

function initNavigation() {

    const navItems = $$("[data-page]");

    navItems.forEach(item => {

        item.addEventListener("click", event => {

            event.preventDefault();

            const page = item.dataset.page;

            if (!page) return;

            navigateTo(page);
        });
    });
}


function navigateTo(page) {

    if (!page) return;

    TURKAI.state.currentPage = page;

    /* Tüm sayfaları kapat */

    $$(".page").forEach(section => {

        section.classList.remove("active");

        section.hidden = true;
    });


    /* Hedef sayfa */

    const target = byId(`${page}Page`) || $(`[data-page-content="${page}"]`);

    if (target) {

        target.hidden = false;
        target.classList.add("active");
    }


    /* Navigation aktifliği */

    $$("[data-page]").forEach(item => {

        item.classList.toggle(
            "active",
            item.dataset.page === page
        );
    });


    /* Chat özel */

    if (page === "chat") {

        requestAnimationFrame(() => {

            const input = byId("messageInput");

            if (input && window.innerWidth > 700) {
                input.focus();
            }

        });
    }


    /* Mobil sidebar kapat */

    closeSidebar();


    saveLocalState();
}


/* =========================================================
   5. CHAT INIT
   ========================================================= */

function initChat() {

    const sendButton =
        byId("sendButton") ||
        $(".send-button");

    if (sendButton) {

        sendButton.addEventListener("click", event => {

            event.preventDefault();

            sendMessage();
        });
    }


    /* New chat */

    const newChatButtons = [
        byId("newChatButton"),
        byId("newChat"),
        $(".new-chat-button")
    ].filter(Boolean);

    newChatButtons.forEach(button => {

        button.addEventListener("click", event => {

            event.preventDefault();

            createNewChat();
        });
    });


    /* Copy / retry delegated */

    document.addEventListener("click", event => {

        const copyButton = event.target.closest("[data-action='copy']");

        if (copyButton) {

            event.preventDefault();

            const message = copyButton.closest(".message-row");

            if (message) {

                const content =
                    $(".message-content", message) ||
                    $(".message-bubble", message);

                if (content) {
                    copyText(content.innerText || content.textContent || "");
                }
            }

            return;
        }


        const retryButton =
            event.target.closest("[data-action='retry']");

        if (retryButton) {

            event.preventDefault();

            const message = retryButton.closest(".message-row");

            if (message) {

                const text =
                    message.dataset.message ||
                    $(".message-content", message)?.innerText ||
                    "";

                if (text.trim()) {

                    const input = byId("messageInput");

                    if (input) {
                        input.value = text;
                        updateCharacterCounter();
                    }

                    sendMessage();
                }
            }
        }
    });
}


/* =========================================================
   6. COMPOSER
   ========================================================= */

function initComposer() {

    const input = byId("messageInput");

    if (!input) {
        console.warn("messageInput bulunamadı.");
        return;
    }


    input.addEventListener("keydown", event => {

        if (event.key !== "Enter") return;

        if (event.shiftKey) return;

        event.preventDefault();

        sendMessage();
    });


    input.addEventListener("input", () => {

        updateCharacterCounter();

        autoResizeInput(input);
    });
}


function autoResizeInput(input) {

    input.style.height = "auto";

    const maxHeight = 180;

    input.style.height =
        Math.min(input.scrollHeight, maxHeight) + "px";
}


function updateCharacterCounter() {

    const input = byId("messageInput");

    if (!input) return;

    const counter =
        byId("characterCounter") ||
        $("#characterCounter");

    if (!counter) return;

    const length = input.value.length;

    counter.textContent =
        `${length.toLocaleString("tr-TR")} / ${TURKAI.config.maxMessageLength.toLocaleString("tr-TR")}`;

    counter.classList.toggle(
        "warning",
        length > TURKAI.config.maxMessageLength * 0.8
    );

    counter.classList.toggle(
        "danger",
        length >= TURKAI.config.maxMessageLength
    );
}


/* =========================================================
   7. SEND MESSAGE
   ========================================================= */

async function sendMessage() {

    if (TURKAI.state.isSending) return;

    const input = byId("messageInput");

    if (!input) return;

    const text = input.value.trim();

    if (!text) {

        shakeElement(
            $(".composer-shell") || input
        );

        return;
    }


    if (text.length > TURKAI.config.maxMessageLength) {

        showToast(
            "Mesaj çok uzun.",
            "warning"
        );

        return;
    }


    TURKAI.state.isSending = true;

    disableSend(true);


    /* Hoş geldin ekranını kapat */

    hideWelcomeScreen();


    /* Kullanıcı mesajı */

    addMessage({
        role: "user",
        content: text
    });


    input.value = "";

    updateCharacterCounter();

    autoResizeInput(input);


    showTyping();


    try {

        const response = await apiRequest(
            "/api/chat",
            {
                method: "POST",

                body: {
                    message: text,
                    model: TURKAI.state.currentModel,
                    conversationId:
                        TURKAI.state.currentConversationId
                }
            }
        );


        hideTyping();


        if (!response.ok) {

            throw new Error(
                response.data?.error ||
                response.data?.message ||
                `HTTP ${response.status}`
            );
        }


        const data = response.data || {};

        const answer =
            data.answer ||
            data.response ||
            data.message ||
            data.content ||
            data.text;


        if (!answer) {

            addMessage({
                role: "assistant",
                content:
                    "Yanıt alınamadı. Sunucunun `/api/chat` endpoint'ini kontrol et."
            });

        } else {

            addMessage({
                role: "assistant",
                content: answer
            });
        }


        if (data.conversationId) {

            TURKAI.state.currentConversationId =
                data.conversationId;
        }


        saveLocalState();

    } catch (error) {

        console.error("Chat error:", error);

        hideTyping();

        addMessage({
            role: "assistant",
            content:
                `Bağlantı sırasında bir hata oluştu.\n\n\`${error.message || "Bilinmeyen hata"}\``
        });

        showToast(
            "Sunucuya bağlanılamadı.",
            "danger"
        );

    } finally {

        TURKAI.state.isSending = false;

        disableSend(false);
    }
}


/* =========================================================
   8. ADD MESSAGE
   ========================================================= */

function addMessage(message) {

    const container =
        byId("messages") ||
        $(".messages");

    if (!container) return;


    const role =
        message.role === "user"
            ? "user"
            : "assistant";


    const row = document.createElement("div");

    row.className =
        `message-row ${role}-message`;

    row.dataset.role = role;

    row.dataset.message =
        message.content || "";


    const avatar = document.createElement("div");

    avatar.className = "message-avatar";

    avatar.innerHTML =
        role === "user"
            ? `<span class="icon icon-user"></span>`
            : `<span class="icon icon-ai"></span>`;


    const bubble = document.createElement("div");

    bubble.className = "message-bubble";


    const content = document.createElement("div");

    content.className = "message-content";

    content.innerHTML =
        formatMessage(message.content || "");


    bubble.appendChild(content);


    /* Assistant actions */

    if (role === "assistant") {

        const actions =
            document.createElement("div");

        actions.className =
            "message-actions";


        actions.innerHTML = `
            <button
                type="button"
                class="message-action"
                data-action="copy"
                title="Kopyala">
                <span class="icon icon-copy"></span>
            </button>

            <button
                type="button"
                class="message-action"
                data-action="retry"
                title="Tekrar dene">
                <span class="icon icon-refresh"></span>
            </button>
        `;


        bubble.appendChild(actions);
    }


    row.appendChild(avatar);
    row.appendChild(bubble);

    container.appendChild(row);


    TURKAI.state.messages.push({
        role,
        content: message.content || ""
    });


    scrollMessages();
}


/* =========================================================
   9. MESSAGE FORMATTER
   ========================================================= */

function escapeHTML(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatMessage(text) {

    let html = escapeHTML(text);


    /* Code blocks */

    html = html.replace(
        /```([\w-]*)\n?([\s\S]*?)```/g,
        (_, language, code) => {

            const lang =
                language || "code";

            return `
                <div class="code-block">
                    <div class="code-header">
                        <span>${escapeHTML(lang)}</span>

                        <button
                            type="button"
                            class="code-copy"
                            onclick="window.turkAICopyCode(this)">
                            Kopyala
                        </button>
                    </div>

                    <pre><code>${code}</code></pre>
                </div>
            `;
        }
    );


    /* Inline code */

    html = html.replace(
        /`([^`]+)`/g,
        "<code>$1</code>"
    );


    /* Bold */

    html = html.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );


    /* Italic */

    html = html.replace(
        /\*(.*?)\*/g,
        "<em>$1</em>"
    );


    /* Link */

    html = html.replace(
        /(https?:\/\/[^\s<]+)/g,
        `<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>`
    );


    /* Satır sonları */

    html = html.replace(
        /\n/g,
        "<br>"
    );


    return html;
}


/* =========================================================
   10. COPY
   ========================================================= */

async function copyText(text) {

    try {

        await navigator.clipboard.writeText(text);

        showToast(
            "Kopyalandı.",
            "success"
        );

    } catch {

        const textarea =
            document.createElement("textarea");

        textarea.value = text;

        document.body.appendChild(textarea);

        textarea.select();

        document.execCommand("copy");

        textarea.remove();

        showToast(
            "Kopyalandı.",
            "success"
        );
    }
}


window.turkAICopyCode = function(button) {

    const block =
        button.closest(".code-block");

    const code =
        block?.querySelector("code");

    if (!code) return;

    copyText(code.innerText || code.textContent || "");
};


/* =========================================================
   11. TYPING
   ========================================================= */

function showTyping() {

    const typing =
        byId("typingIndicator");

    if (!typing) return;

    typing.hidden = false;

    typing.classList.add("active");

    scrollMessages();
}


function hideTyping() {

    const typing =
        byId("typingIndicator");

    if (!typing) return;

    typing.hidden = true;

    typing.classList.remove("active");
}


/* =========================================================
   12. WELCOME SCREEN
   ========================================================= */

function hideWelcomeScreen() {

    const welcome =
        byId("welcomeScreen") ||
        $(".welcome-screen");

    if (!welcome) return;

    welcome.classList.add("hidden");

    welcome.setAttribute(
        "aria-hidden",
        "true"
    );
}


/* =========================================================
   13. NEW CHAT
   ========================================================= */

function createNewChat() {

    TURKAI.state.currentConversationId =
        generateId();

    TURKAI.state.messages = [];


    const messages =
        byId("messages");

    if (messages) {
        messages.innerHTML = "";
    }


    hideTyping();


    const welcome =
        byId("welcomeScreen") ||
        $(".welcome-screen");

    if (welcome) {

        welcome.classList.remove("hidden");

        welcome.removeAttribute("aria-hidden");
    }


    const input =
        byId("messageInput");

    if (input) {

        input.value = "";

        updateCharacterCounter();

        autoResizeInput(input);

        input.focus();
    }


    navigateTo("chat");

    showToast(
        "Yeni sohbet hazır.",
        "success"
    );

    saveLocalState();
}


/* =========================================================
   14. GENERATE ID
   ========================================================= */

function generateId() {

    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substring(2, 10)
    );
}


/* =========================================================
   15. DISABLE SEND
   ========================================================= */

function disableSend(disabled) {

    const buttons = [
        byId("sendButton"),
        $(".send-button")
    ].filter(Boolean);


    buttons.forEach(button => {

        button.disabled = disabled;

        button.classList.toggle(
            "loading",
            disabled
        );
    });
}


/* =========================================================
   16. SCROLL
   ========================================================= */

function scrollMessages() {

    const container =
        byId("messages") ||
        $(".messages");

    if (!container) return;

    requestAnimationFrame(() => {

        container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth"
        });

    });
}


/* =========================================================
   17. API ENGINE
   ========================================================= */

async function apiRequest(
    endpoint,
    options = {}
) {

    const controller =
        new AbortController();


    const timeout =
        setTimeout(
            () => controller.abort(),
            options.timeout ||
            TURKAI.config.requestTimeout
        );


    const fetchOptions = {

        method:
            options.method || "GET",

        headers: {
            "Content-Type":
                "application/json",

            ...(options.headers || {})
        },

        credentials: "include",

        signal:
            controller.signal
    };


    if (
        options.body !== undefined &&
        fetchOptions.method !== "GET"
    ) {

        fetchOptions.body =
            JSON.stringify(options.body);
    }


    let response;

    try {

        response =
            await fetch(
                TURKAI.apiBase + endpoint,
                fetchOptions
            );

    } finally {

        clearTimeout(timeout);
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

            data = await response.json();

        } catch {

            data = null;
        }

    } else {

        try {

            const text =
                await response.text();

            data = {
                text
            };

        } catch {

            data = null;
        }
    }


    return {
        ok: response.ok,
        status: response.status,
        data,
        headers: response.headers
    };
}


/* =========================================================
   18. MODALS
   ========================================================= */

function initModals() {

    document.addEventListener("click", event => {

        const openButton =
            event.target.closest(
                "[data-modal]"
            );


        if (openButton) {

            event.preventDefault();

            openModal(
                openButton.dataset.modal
            );

            return;
        }


        const closeButton =
            event.target.closest(
                "[data-close-modal]"
            );


        if (closeButton) {

            event.preventDefault();

            closeModal();

            return;
        }


        if (
            event.target.classList.contains(
                "modal-overlay"
            )
        ) {

            closeModal();
        }
    });
}


function openModal(id) {

    if (!id) return;

    const modal =
        byId(id);

    if (!modal) {

        console.warn(
            `Modal bulunamadı: ${id}`
        );

        return;
    }


    $$(".modal-overlay").forEach(item => {

        item.classList.remove("active");

        item.hidden = true;
    });


    modal.hidden = false;

    requestAnimationFrame(() => {

        modal.classList.add("active");
    });


    TURKAI.state.activeModal = id;

    document.body.classList.add(
        "modal-open"
    );
}


function closeModal() {

    $$(".modal-overlay").forEach(modal => {

        modal.classList.remove("active");

        modal.hidden = true;
    });


    TURKAI.state.activeModal = null;

    document.body.classList.remove(
        "modal-open"
    );
}


/* =========================================================
   19. GLOBAL BUTTONS
   ========================================================= */

function initGlobalButtons() {

    /* Ayarlar */

    const settingsButtons = $$(
        "[data-action='settings']"
    );

    settingsButtons.forEach(button => {

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                openSettings();
            }
        );
    });


    /* Plans */

    $$(
        "[data-action='plans'], #plansButton, #upgradeButton"
    ).forEach(button => {

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                openPlans();
            }
        );
    });


    /* User menu */

    $$(
        "[data-action='user-menu'], #userMenuButton"
    ).forEach(button => {

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                toggleUserMenu();
            }
        );
    });


    /* Notifications */

    $$(
        "[data-action='notifications'], #notificationButton"
    ).forEach(button => {

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                toggleNotifications();
            }
        );
    });


    /* Research */

    $$(
        "[data-action='research'], #researchButton"
    ).forEach(button => {

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                navigateTo("research");
            }
        );
    });


    /* Files */

    $$(
        "[data-action='files'], #filesButton"
    ).forEach(button => {

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                navigateTo("files");
            }
        );
    });


    /* Media */

    $$(
        "[data-action='media'], #mediaButton"
    ).forEach(button => {

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                navigateTo("media");
            }
        );
    });


    /* Code */

    $$(
        "[data-action='code'], #codeButton"
    ).forEach(button => {

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                navigateTo("code");
            }
        );
    });
}


/* =========================================================
   20. SETTINGS
   ========================================================= */

function openSettings() {

    const panel =
        byId("settingsPanel") ||
        byId("settingsModal");

    if (!panel) {

        showToast(
            "Ayarlar paneli bulunamadı.",
            "warning"
        );

        return;
    }


    if (
        panel.classList.contains(
            "modal-overlay"
        )
    ) {

        openModal(panel.id);

    } else {

        panel.hidden = false;

        panel.classList.add("active");
    }
}


/* =========================================================
   21. PLANS
   ========================================================= */

function openPlans() {

    const modal =
        byId("plansModal") ||
        byId("planModal");

    if (!modal) {

        showToast(
            "Plan ekranı bulunamadı.",
            "warning"
        );

        return;
    }

    openModal(modal.id);
}


/* =========================================================
   22. USER MENU
   ========================================================= */

function toggleUserMenu() {

    const menu =
        byId("userMenu") ||
        $(".user-menu");

    if (!menu) return;


    const willOpen =
        !menu.classList.contains("active");


    closeNotificationPanel();


    menu.classList.toggle(
        "active",
        willOpen
    );

    menu.hidden = !willOpen;

    TURKAI.state.userMenuOpen =
        willOpen;
}


/* =========================================================
   23. NOTIFICATIONS
   ========================================================= */

function toggleNotifications() {

    const panel =
        byId("notificationPanel") ||
        $(".notification-panel");

    if (!panel) return;


    const willOpen =
        !panel.classList.contains("active");


    closeUserMenu();


    panel.classList.toggle(
        "active",
        willOpen
    );

    panel.hidden = !willOpen;

    TURKAI.state.notificationOpen =
        willOpen;
}


function closeNotificationPanel() {

    const panel =
        byId("notificationPanel") ||
        $(".notification-panel");

    if (!panel) return;

    panel.classList.remove("active");

    panel.hidden = true;

    TURKAI.state.notificationOpen = false;
}


function closeUserMenu() {

    const menu =
        byId("userMenu") ||
        $(".user-menu");

    if (!menu) return;

    menu.classList.remove("active");

    menu.hidden = true;

    TURKAI.state.userMenuOpen = false;
}


/* =========================================================
   24. MODEL MENU
   ========================================================= */

function initMenus() {

    const modelButton =
        byId("modelSelector") ||
        $(".model-selector");


    if (modelButton) {

        modelButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                toggleModelMenu();
            }
        );
    }


    /* Model option */

    document.addEventListener(
        "click",
        event => {

            const option =
                event.target.closest(
                    "[data-model]"
                );

            if (!option) return;

            event.preventDefault();

            selectModel(
                option.dataset.model
            );
        }
    );
}


function toggleModelMenu() {

    const menu =
        byId("modelMenu") ||
        $(".model-menu");

    if (!menu) return;


    const willOpen =
        !menu.classList.contains("active");


    closeUserMenu();
    closeNotificationPanel();


    menu.classList.toggle(
        "active",
        willOpen
    );

    menu.hidden = !willOpen;

    TURKAI.state.modelMenuOpen =
        willOpen;
}


function selectModel(model) {

    if (!model) return;

    TURKAI.state.currentModel = model;


    const label =
        byId("currentModel") ||
        $(".current-model");


    if (label) {

        const option =
            $(`[data-model="${CSS.escape(model)}"]`);

        if (option) {

            label.textContent =
                option.dataset.modelName ||
                option.textContent.trim();
        } else {

            label.textContent = model;
        }
    }


    const menu =
        byId("modelMenu") ||
        $(".model-menu");

    if (menu) {

        menu.classList.remove("active");

        menu.hidden = true;
    }


    TURKAI.state.modelMenuOpen = false;

    saveLocalState();

    showToast(
        `Model: ${model}`,
        "success"
    );
}


/* =========================================================
   25. SIDEBAR
   ========================================================= */

function initSidebar() {

    const toggleButtons = [
        byId("sidebarToggle"),
        byId("mobileMenuButton"),
        $(".mobile-menu-button"),
        $(".sidebar-toggle")
    ].filter(Boolean);


    toggleButtons.forEach(button => {

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                toggleSidebar();
            }
        );
    });


    const overlay =
        byId("mobileSidebarOverlay") ||
        $(".mobile-sidebar-overlay");


    if (overlay) {

        overlay.addEventListener(
            "click",
            closeSidebar
        );
    }
}


function toggleSidebar() {

    if (TURKAI.state.sidebarOpen) {

        closeSidebar();

    } else {

        openSidebar();
    }
}


function openSidebar() {

    TURKAI.state.sidebarOpen = true;

    document.body.classList.add(
        "sidebar-open"
    );


    const sidebar =
        byId("sidebar") ||
        $(".sidebar");


    if (sidebar) {

        sidebar.classList.add("open");
    }


    const overlay =
        byId("mobileSidebarOverlay") ||
        $(".mobile-sidebar-overlay");


    if (overlay) {

        overlay.hidden = false;

        overlay.classList.add("active");
    }
}


function closeSidebar() {

    TURKAI.state.sidebarOpen = false;

    document.body.classList.remove(
        "sidebar-open"
    );


    const sidebar =
        byId("sidebar") ||
        $(".sidebar");


    if (sidebar) {

        sidebar.classList.remove("open");
    }


    const overlay =
        byId("mobileSidebarOverlay") ||
        $(".mobile-sidebar-overlay");


    if (overlay) {

        overlay.classList.remove("active");

        overlay.hidden = true;
    }
}


/* =========================================================
   26. KEYBOARD
   ========================================================= */

function initKeyboard() {

    document.addEventListener(
        "keydown",
        event => {

            /* Escape */

            if (event.key === "Escape") {

                closeModal();

                closeUserMenu();

                closeNotificationPanel();

                closeSidebar();

                return;
            }


            /* Ctrl/Cmd + K */

            if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === "k"
            ) {

                event.preventDefault();

                const input =
                    byId("messageInput");

                if (input) {

                    input.focus();

                    input.select();
                }

                return;
            }


            /* Ctrl/Cmd + N */

            if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === "n"
            ) {

                event.preventDefault();

                createNewChat();
            }
        }
    );
}


/* =========================================================
   27. ONLINE STATE
   ========================================================= */

function initOnlineState() {

    window.addEventListener(
        "online",
        () => {

            TURKAI.state.isOnline = true;

            updateConnectionUI();

            showToast(
                "İnternet bağlantısı geri geldi.",
                "success"
            );
        }
    );


    window.addEventListener(
        "offline",
        () => {

            TURKAI.state.isOnline = false;

            updateConnectionUI();

            showToast(
                "İnternet bağlantısı kesildi.",
                "warning"
            );
        }
    );


    updateConnectionUI();
}


function updateConnectionUI() {

    const elements = $$(
        "[data-connection-status]"
    );


    elements.forEach(element => {

        element.classList.toggle(
            "offline",
            !TURKAI.state.isOnline
        );

        element.classList.toggle(
            "online",
            TURKAI.state.isOnline
        );


        const text =
            element.querySelector(
                ".connection-text"
            );


        if (text) {

            text.textContent =
                TURKAI.state.isOnline
                    ? "Bağlı"
                    : "Çevrimdışı";
        }
    });
}


/* =========================================================
   28. SUGGESTIONS
   ========================================================= */

function initSuggestions() {

    document.addEventListener(
        "click",
        event => {

            const suggestion =
                event.target.closest(
                    "[data-prompt]"
                );

            if (!suggestion) return;

            event.preventDefault();

            const prompt =
                suggestion.dataset.prompt;

            const input =
                byId("messageInput");

            if (!input) return;

            input.value = prompt;

            updateCharacterCounter();

            autoResizeInput(input);

            navigateTo("chat");

            input.focus();
        }
    );
}


/* =========================================================
   29. FILE SYSTEM
   ========================================================= */

function initFileSystem() {

    const attachButtons = $$(
        "[data-action='attach'], #attachButton, #fileButton"
    );


    attachButtons.forEach(button => {

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                openFilePicker();
            }
        );
    });


    const fileInput =
        byId("fileInput") ||
        byId("uploadInput");


    if (fileInput) {

        fileInput.addEventListener(
            "change",
            event => {

                const file =
                    event.target.files?.[0];

                if (file) {

                    handleSelectedFile(file);
                }
            }
        );
    }
}


function openFilePicker() {

    let input =
        byId("fileInput") ||
        byId("uploadInput");


    if (!input) {

        input =
            document.createElement("input");

        input.type = "file";

        input.id = "turkaiTemporaryFileInput";

        input.accept =
            ".txt,.pdf,.doc,.docx,.json,.js,.html,.css,.py,.java,.cpp,.c,.cs,.md,.csv,image/*";

        input.style.display = "none";

        document.body.appendChild(input);


        input.addEventListener(
            "change",
            event => {

                const file =
                    event.target.files?.[0];

                if (file) {

                    handleSelectedFile(file);
                }
            }
        );
    }


    input.click();
}


/* =========================================================
   30. FILE SELECT
   ========================================================= */

function handleSelectedFile(file) {

    if (!file) return;


    if (
        file.size >
        TURKAI.config.maxFileSize
    ) {

        showToast(
            "Dosya boyutu 10 MB'dan büyük olamaz.",
            "warning"
        );

        return;
    }


    TURKAI.state.selectedFile = file;


    const preview =
        byId("filePreview") ||
        $(".file-preview");


    if (preview) {

        preview.hidden = false;

        preview.classList.add("active");


        const name =
            preview.querySelector(
                "[data-file-name]"
            ) ||
            preview.querySelector(
                ".file-name"
            );


        if (name) {

            name.textContent =
                file.name;
        }


        const size =
            preview.querySelector(
                "[data-file-size]"
            ) ||
            preview.querySelector(
                ".file-size"
            );


        if (size) {

            size.textContent =
                formatFileSize(file.size);
        }
    }


    showToast(
        `${file.name} seçildi.`,
        "success"
    );
}


function formatFileSize(bytes) {

    if (!bytes) return "0 B";

    const units = [
        "B",
        "KB",
        "MB",
        "GB"
    ];

    let index = 0;

    let size = bytes;


    while (
        size >= 1024 &&
        index < units.length - 1
    ) {

        size /= 1024;

        index++;
    }


    return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}


/* =========================================================
   31. LOCAL STORAGE
   ========================================================= */

function saveLocalState() {

    try {

        localStorage.setItem(
            "turkai_state",
            JSON.stringify({
                currentModel:
                    TURKAI.state.currentModel,

                currentConversationId:
                    TURKAI.state.currentConversationId
            })
        );

    } catch (error) {

        console.warn(
            "Local state kaydedilemedi.",
            error
        );
    }
}


function restoreLocalState() {

    try {

        const raw =
            localStorage.getItem(
                "turkai_state"
            );


        if (!raw) {

            TURKAI.state.currentConversationId =
                generateId();

            return;
        }


        const saved =
            JSON.parse(raw);


        if (saved.currentModel) {

            TURKAI.state.currentModel =
                saved.currentModel;
        }


        if (saved.currentConversationId) {

            TURKAI.state.currentConversationId =
                saved.currentConversationId;

        } else {

            TURKAI.state.currentConversationId =
                generateId();
        }


    } catch {

        TURKAI.state.currentConversationId =
            generateId();
    }
}


/* =========================================================
   32. CHARACTER COUNTER INIT
   ========================================================= */

function initCharacterCounter() {

    updateCharacterCounter();

    const input =
        byId("messageInput");

    if (input) {

        autoResizeInput(input);
    }
}


/* =========================================================
   33. TOAST
   ========================================================= */

function showToast(
    message,
    type = "info"
) {

    let container =
        byId("toastContainer");


    if (!container) {

        container =
            document.createElement("div");

        container.id =
            "toastContainer";

        container.className =
            "toast-container";

        document.body.appendChild(container);
    }


    const toast =
        document.createElement("div");

    toast.className =
        `toast toast-${type}`;


    toast.innerHTML = `
        <div class="toast-icon">
            <span class="icon icon-info"></span>
        </div>

        <div class="toast-message">
            ${escapeHTML(message)}
        </div>

        <button
            type="button"
            class="toast-close"
            aria-label="Kapat">
            ×
        </button>
    `;


    container.appendChild(toast);


    requestAnimationFrame(() => {

        toast.classList.add("show");
    });


    const close =
        toast.querySelector(
            ".toast-close"
        );


    close?.addEventListener(
        "click",
        () => removeToast(toast)
    );


    setTimeout(
        () => removeToast(toast),
        3500
    );
}


function removeToast(toast) {

    if (!toast) return;

    toast.classList.remove("show");

    setTimeout(
        () => toast.remove(),
        250
    );
}


/* =========================================================
   34. SHAKE
   ========================================================= */

function shakeElement(element) {

    if (!element) return;

    element.classList.remove("shake");

    void element.offsetWidth;

    element.classList.add("shake");

    setTimeout(
        () => element.classList.remove("shake"),
        450
    );
}


/* =========================================================
   35. GLOBAL EXPORT
   ========================================================= */

window.TURKAI = TURKAI;

window.turkAI = {
    sendMessage,
    createNewChat,
    navigateTo,
    openModal,
    closeModal,
    openSettings,
    openPlans,
    showToast,
    copyText,
    apiRequest
};


console.log(
    "TürkAI App.js PART 1 yüklendi."
);
/* =========================================================
   TÜRKAI — APP.JS
   PART 2 / 2
   Research + Weather + Upload + Media + Voice + Auth
   Socket.IO + Settings + Plans + Final UI
   ========================================================= */


/* =========================================================
   36. RESEARCH ENGINE
   ========================================================= */

async function runResearch(query) {

    query = String(query || "").trim();

    if (!query) {

        showToast(
            "Araştırma konusu yaz.",
            "warning"
        );

        return;
    }


    const input =
        byId("researchInput") ||
        byId("messageInput");


    const result =
        byId("researchResults") ||
        byId("researchResult");


    if (result) {

        result.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <div>
                    <strong>Araştırılıyor...</strong>
                    <p>Güncel kaynaklar kontrol ediliyor.</p>
                </div>
            </div>
        `;
    }


    try {

        const response =
            await apiRequest(
                "/api/research",
                {
                    method: "POST",
                    body: {
                        query,
                        question: query
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                response.data?.error ||
                response.data?.message ||
                "Araştırma başarısız."
            );
        }


        const data =
            response.data || {};


        const answer =
            data.answer ||
            data.result ||
            data.response ||
            data.summary ||
            data.text ||
            "Araştırma sonucu bulunamadı.";


        if (result) {

            result.innerHTML = `
                <div class="research-result-card">
                    <div class="result-header">
                        <span class="result-status">
                            Tamamlandı
                        </span>
                    </div>

                    <div class="result-content">
                        ${formatMessage(answer)}
                    </div>
                </div>
            `;
        }


        showToast(
            "Araştırma tamamlandı.",
            "success"
        );

    } catch (error) {

        console.error(
            "Research error:",
            error
        );


        if (result) {

            result.innerHTML = `
                <div class="error-state">
                    <strong>Araştırma başarısız</strong>
                    <p>${escapeHTML(error.message)}</p>
                </div>
            `;
        }


        showToast(
            "Araştırma yapılamadı.",
            "danger"
        );
    }
}


/* =========================================================
   37. RESEARCH BUTTONS
   ========================================================= */

function initResearch() {

    const buttons = $$(
        "#startResearchButton, " +
        "#researchStartButton, " +
        "[data-action='start-research']"
    );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();


                const input =
                    byId("researchInput");


                const query =
                    input?.value?.trim();


                if (!query) {

                    showToast(
                        "Önce araştırma konusu yaz.",
                        "warning"
                    );

                    input?.focus();

                    return;
                }


                runResearch(query);
            }
        );
    });


    const input =
        byId("researchInput");


    if (input) {

        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    runResearch(
                        input.value
                    );
                }
            }
        );
    }
}


/* =========================================================
   38. WEATHER
   ========================================================= */

async function getWeather(city) {

    city =
        String(city || "").trim();


    if (!city) {

        showToast(
            "Şehir adı yaz.",
            "warning"
        );

        return;
    }


    try {

        const response =
            await apiRequest(
                `/api/weather?city=${encodeURIComponent(city)}`
            );


        if (!response.ok) {

            throw new Error(
                response.data?.error ||
                "Hava durumu alınamadı."
            );
        }


        const data =
            response.data || {};


        const target =
            byId("weatherResult") ||
            $(".weather-result");


        if (target) {

            const temperature =
                data.temperature ??
                data.temp ??
                data.current?.temperature ??
                "--";


            const description =
                data.description ||
                data.condition ||
                data.current?.condition ||
                "Bilinmiyor";


            target.innerHTML = `
                <div class="weather-card">
                    <div class="weather-city">
                        ${escapeHTML(
                            data.city || city
                        )}
                    </div>

                    <div class="weather-temperature">
                        ${escapeHTML(
                            String(temperature)
                        )}°
                    </div>

                    <div class="weather-description">
                        ${escapeHTML(
                            String(description)
                        )}
                    </div>
                </div>
            `;
        }


        showToast(
            "Hava durumu güncellendi.",
            "success"
        );

    } catch (error) {

        console.error(
            "Weather error:",
            error
        );


        showToast(
            error.message ||
            "Hava durumu alınamadı.",
            "danger"
        );
    }
}


function initWeather() {

    const button =
        byId("weatherButton") ||
        byId("getWeatherButton") ||
        $("[data-action='weather']");


    if (button) {

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();


                const input =
                    byId("weatherCity") ||
                    byId("cityInput");


                if (input) {

                    getWeather(input.value);

                } else {

                    navigateTo("chat");

                    const chatInput =
                        byId("messageInput");

                    if (chatInput) {

                        chatInput.value =
                            "Bugün hava durumu nasıl?";

                        updateCharacterCounter();

                        chatInput.focus();
                    }
                }
            }
        );
    }
}


/* =========================================================
   39. FILE UPLOAD
   ========================================================= */

async function uploadSelectedFile() {

    const file =
        TURKAI.state.selectedFile;


    if (!file) {

        showToast(
            "Önce dosya seç.",
            "warning"
        );

        return null;
    }


    const formData =
        new FormData();


    formData.append(
        "file",
        file
    );


    const preview =
        byId("filePreview") ||
        $(".file-preview");


    try {

        if (preview) {

            preview.classList.add(
                "uploading"
            );
        }


        const response =
            await fetch(
                TURKAI.apiBase +
                "/api/upload",
                {
                    method: "POST",
                    credentials: "include",
                    body: formData
                }
            );


        let data = null;


        try {

            data =
                await response.json();

        } catch {

            data = {};
        }


        if (!response.ok) {

            throw new Error(
                data.error ||
                data.message ||
                "Dosya yüklenemedi."
            );
        }


        TURKAI.state.uploadedFile =
            data;


        showToast(
            `${file.name} yüklendi.`,
            "success"
        );


        if (preview) {

            preview.classList.remove(
                "uploading"
            );

            preview.classList.add(
                "uploaded"
            );
        }


        return data;

    } catch (error) {

        console.error(
            "Upload error:",
            error
        );


        if (preview) {

            preview.classList.remove(
                "uploading"
            );
        }


        showToast(
            error.message ||
            "Dosya yüklenemedi.",
            "danger"
        );


        return null;
    }
}


/* =========================================================
   40. FILE REMOVE
   ========================================================= */

function removeSelectedFile() {

    TURKAI.state.selectedFile = null;

    TURKAI.state.uploadedFile = null;


    const preview =
        byId("filePreview") ||
        $(".file-preview");


    if (preview) {

        preview.classList.remove(
            "active",
            "uploaded",
            "uploading"
        );

        preview.hidden = true;
    }


    const input =
        byId("fileInput") ||
        byId("uploadInput");


    if (input) {

        input.value = "";
    }
}


/* =========================================================
   41. FILE ACTION EVENTS
   ========================================================= */

function initFileActions() {

    document.addEventListener(
        "click",
        event => {

            const removeButton =
                event.target.closest(
                    "[data-action='remove-file'], " +
                    "#removeFileButton"
                );


            if (removeButton) {

                event.preventDefault();

                removeSelectedFile();

                return;
            }


            const uploadButton =
                event.target.closest(
                    "[data-action='upload-file'], " +
                    "#uploadFileButton"
                );


            if (uploadButton) {

                event.preventDefault();

                uploadSelectedFile();

                return;
            }
        }
    );
}


/* =========================================================
   42. IMAGE GENERATION
   ========================================================= */

async function generateImage(prompt) {

    prompt =
        String(prompt || "").trim();


    if (!prompt) {

        showToast(
            "Görsel açıklaması yaz.",
            "warning"
        );

        return;
    }


    const result =
        byId("imageGenerationResult") ||
        byId("imageResult");


    if (result) {

        result.innerHTML = `
            <div class="media-loading">
                <div class="loading-spinner"></div>
                <strong>Görsel hazırlanıyor...</strong>
                <span>Bu işlem biraz sürebilir.</span>
            </div>
        `;
    }


    try {

        const response =
            await apiRequest(
                "/api/media/image",
                {
                    method: "POST",
                    timeout: 120000,
                    body: {
                        prompt
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                response.data?.error ||
                response.data?.message ||
                "Görsel üretilemedi."
            );
        }


        const data =
            response.data || {};


        const imageUrl =
            data.url ||
            data.imageUrl ||
            data.image ||
            data.result?.url;


        if (!imageUrl) {

            throw new Error(
                "Sunucu görsel adresi döndürmedi."
            );
        }


        if (result) {

            result.innerHTML = `
                <div class="generated-media">
                    <img
                        src="${escapeHTML(imageUrl)}"
                        alt="TürkAI tarafından oluşturulan görsel"
                        loading="lazy">

                    <div class="media-actions">
                        <a
                            href="${escapeHTML(imageUrl)}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="button">
                            Görseli aç
                        </a>
                    </div>
                </div>
            `;
        }


        showToast(
            "Görsel oluşturuldu.",
            "success"
        );


    } catch (error) {

        console.error(
            "Image generation:",
            error
        );


        if (result) {

            result.innerHTML = `
                <div class="error-state">
                    <strong>Görsel oluşturulamadı</strong>
                    <p>${escapeHTML(error.message)}</p>
                </div>
            `;
        }


        showToast(
            "Görsel oluşturulamadı.",
            "danger"
        );
    }
}


/* =========================================================
   43. VIDEO GENERATION
   ========================================================= */

async function generateVideo(prompt) {

    prompt =
        String(prompt || "").trim();


    if (!prompt) {

        showToast(
            "Video açıklaması yaz.",
            "warning"
        );

        return;
    }


    const result =
        byId("videoGenerationResult") ||
        byId("videoResult");


    if (result) {

        result.innerHTML = `
            <div class="media-loading">
                <div class="loading-spinner"></div>
                <strong>Video hazırlanıyor...</strong>
                <span>Video üretimi zaman alabilir.</span>
            </div>
        `;
    }


    try {

        const response =
            await apiRequest(
                "/api/media/video",
                {
                    method: "POST",
                    timeout: 180000,
                    body: {
                        prompt
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                response.data?.error ||
                response.data?.message ||
                "Video üretilemedi."
            );
        }


        const data =
            response.data || {};


        const videoUrl =
            data.url ||
            data.videoUrl ||
            data.video ||
            data.result?.url;


        if (!videoUrl) {

            /* Job sistemi varsa */

            const jobId =
                data.jobId ||
                data.id;


            if (jobId) {

                monitorMediaJob(
                    jobId,
                    result
                );

                return;
            }


            throw new Error(
                "Sunucu video adresi döndürmedi."
            );
        }


        if (result) {

            result.innerHTML = `
                <div class="generated-media">
                    <video
                        controls
                        playsinline
                        preload="metadata">
                        <source
                            src="${escapeHTML(videoUrl)}">
                    </video>

                    <div class="media-actions">
                        <a
                            href="${escapeHTML(videoUrl)}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="button">
                            Videoyu aç
                        </a>
                    </div>
                </div>
            `;
        }


        showToast(
            "Video oluşturuldu.",
            "success"
        );


    } catch (error) {

        console.error(
            "Video generation:",
            error
        );


        if (result) {

            result.innerHTML = `
                <div class="error-state">
                    <strong>Video oluşturulamadı</strong>
                    <p>${escapeHTML(error.message)}</p>
                </div>
            `;
        }


        showToast(
            "Video oluşturulamadı.",
            "danger"
        );
    }
}


/* =========================================================
   44. MEDIA JOB MONITOR
   ========================================================= */

async function monitorMediaJob(
    jobId,
    target
) {

    let attempts = 0;

    const maxAttempts = 120;


    const check = async () => {

        attempts++;


        if (attempts > maxAttempts) {

            if (target) {

                target.innerHTML = `
                    <div class="error-state">
                        Video işlemi zaman aşımına uğradı.
                    </div>
                `;
            }

            return;
        }


        try {

            const response =
                await apiRequest(
                    `/api/media/jobs/${encodeURIComponent(jobId)}`
                );


            const data =
                response.data || {};


            const status =
                data.status ||
                data.job?.status ||
                "processing";


            if (
                status === "completed" ||
                status === "complete" ||
                status === "success"
            ) {

                const url =
                    data.url ||
                    data.videoUrl ||
                    data.result?.url ||
                    data.job?.url;


                if (url && target) {

                    target.innerHTML = `
                        <div class="generated-media">
                            <video
                                controls
                                playsinline>
                                <source
                                    src="${escapeHTML(url)}">
                            </video>
                        </div>
                    `;
                }


                showToast(
                    "Video hazır.",
                    "success"
                );

                return;
            }


            if (
                status === "failed" ||
                status === "error"
            ) {

                throw new Error(
                    data.error ||
                    "Video üretimi başarısız."
                );
            }


            if (target) {

                const percent =
                    data.progress ??
                    data.job?.progress ??
                    0;


                target.innerHTML = `
                    <div class="media-loading">
                        <div class="loading-spinner"></div>
                        <strong>Video hazırlanıyor... ${percent}%</strong>
                    </div>
                `;
            }


            setTimeout(
                check,
                3000
            );

        } catch (error) {

            console.error(
                "Media job:",
                error
            );


            if (target) {

                target.innerHTML = `
                    <div class="error-state">
                        ${escapeHTML(error.message)}
                    </div>
                `;
            }
        }
    };


    check();
}


/* =========================================================
   45. MEDIA EVENTS
   ========================================================= */

function initMedia() {

    const imageButton =
        byId("generateImageButton");


    if (imageButton) {

        imageButton.addEventListener(
            "click",
            event => {

                event.preventDefault();


                const input =
                    byId("imagePrompt") ||
                    byId("imageGenerationPrompt");


                generateImage(
                    input?.value || ""
                );
            }
        );
    }


    const videoButton =
        byId("generateVideoButton");


    if (videoButton) {

        videoButton.addEventListener(
            "click",
            event => {

                event.preventDefault();


                const input =
                    byId("videoPrompt") ||
                    byId("videoGenerationPrompt");


                generateVideo(
                    input?.value || ""
                );
            }
        );
    }


    document.addEventListener(
        "click",
        event => {

            const imageOpen =
                event.target.closest(
                    "[data-action='generate-image']"
                );


            if (imageOpen) {

                event.preventDefault();

                openModal(
                    "imageCreateModal"
                );

                return;
            }


            const videoOpen =
                event.target.closest(
                    "[data-action='generate-video']"
                );


            if (videoOpen) {

                event.preventDefault();

                openModal(
                    "videoCreateModal"
                );
            }
        }
    );
}


/* =========================================================
   46. VOICE INPUT
   ========================================================= */

function initVoice() {

    const button =
        byId("voiceButton") ||
        $("[data-action='voice']");


    if (!button) return;


    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        button.addEventListener(
            "click",
            () => {

                showToast(
                    "Tarayıcın sesli girişi desteklemiyor.",
                    "warning"
                );
            }
        );

        return;
    }


    const recognition =
        new SpeechRecognition();


    recognition.lang =
        "tr-TR";


    recognition.continuous =
        false;


    recognition.interimResults =
        true;


    recognition.onstart = () => {

        TURKAI.state.isRecording =
            true;

        button.classList.add(
            "recording"
        );

        showToast(
            "Dinliyorum...",
            "info"
        );
    };


    recognition.onresult = event => {

        let transcript = "";


        for (
            let i = event.resultIndex;
            i < event.results.length;
            i++
        ) {

            transcript +=
                event.results[i][0].transcript;
        }


        const input =
            byId("messageInput");


        if (input) {

            input.value =
                transcript;

            updateCharacterCounter();

            autoResizeInput(input);
        }
    };


    recognition.onerror = error => {

        console.error(
            "Voice:",
            error
        );

        showToast(
            "Ses algılanamadı.",
            "warning"
        );
    };


    recognition.onend = () => {

        TURKAI.state.isRecording =
            false;

        button.classList.remove(
            "recording"
        );
    };


    button.addEventListener(
        "click",
        event => {

            event.preventDefault();


            if (
                TURKAI.state.isRecording
            ) {

                recognition.stop();

            } else {

                recognition.start();
            }
        }
    );
}


/* =========================================================
   47. AUTH
   ========================================================= */

async function loadCurrentUser() {

    try {

        const response =
            await apiRequest(
                "/api/auth/me"
            );


        if (!response.ok) {

            TURKAI.state.currentUser =
                null;

            updateUserUI();

            return;
        }


        const data =
            response.data || {};


        TURKAI.state.currentUser =
            data.user ||
            data.account ||
            data;


        updateUserUI();

    } catch (error) {

        console.warn(
            "Auth check:",
            error.message
        );

        TURKAI.state.currentUser =
            null;

        updateUserUI();
    }
}


function updateUserUI() {

    const user =
        TURKAI.state.currentUser;


    if (!user) return;


    const name =
        user.name ||
        user.displayName ||
        user.fullName ||
        "Kullanıcı";


    const email =
        user.email ||
        "";


    $$(
        "[data-user-name], .user-name"
    ).forEach(element => {

        element.textContent =
            name;
    });


    $$(
        "[data-user-email], .user-email"
    ).forEach(element => {

        element.textContent =
            email;
    });


    $$(
        "[data-user-avatar], .user-avatar"
    ).forEach(element => {

        if (
            user.avatar ||
            user.picture ||
            user.photoURL
        ) {

            element.style.backgroundImage =
                `url("${user.avatar || user.picture || user.photoURL}")`;

            element.classList.add(
                "has-image"
            );
        }
    });
}


/* =========================================================
   48. LOGOUT
   ========================================================= */

async function logoutUser() {

    try {

        const response =
            await apiRequest(
                "/api/auth/logout",
                {
                    method: "POST"
                }
            );


        if (!response.ok) {

            throw new Error(
                response.data?.error ||
                "Çıkış yapılamadı."
            );
        }


        TURKAI.state.currentUser =
            null;


        updateUserUI();


        closeUserMenu();


        showToast(
            "Çıkış yapıldı.",
            "success"
        );


    } catch (error) {

        console.error(
            "Logout:",
            error
        );


        showToast(
            error.message ||
            "Çıkış yapılamadı.",
            "danger"
        );
    }
}


/* =========================================================
   49. AUTH EVENTS
   ========================================================= */

function initAuth() {

    document.addEventListener(
        "click",
        event => {

            const logout =
                event.target.closest(
                    "[data-action='logout'], #logoutButton"
                );


            if (logout) {

                event.preventDefault();

                logoutUser();

                return;
            }


            const login =
                event.target.closest(
                    "[data-action='login'], #loginButton"
                );


            if (login) {

                event.preventDefault();

                openModal(
                    "authModal"
                );
            }
        }
    );


    loadCurrentUser();
}


/* =========================================================
   50. GOOGLE LOGIN
   ========================================================= */

function initGoogleLogin() {

    const button =
        byId("googleLoginButton") ||
        $(".google-login-button");


    if (!button) return;


    button.addEventListener(
        "click",
        async event => {

            event.preventDefault();


            if (
                window.google &&
                window.google.accounts
            ) {

                try {

                    if (
                        window.google.accounts.id
                    ) {

                        window.google.accounts.id.prompt();

                    } else {

                        showToast(
                            "Google giriş sistemi hazır değil.",
                            "warning"
                        );
                    }

                } catch (error) {

                    console.error(
                        "Google login:",
                        error
                    );

                    showToast(
                        "Google giriş başlatılamadı.",
                        "danger"
                    );
                }

            } else {

                showToast(
                    "Google bağlantısı yüklenmedi.",
                    "warning"
                );
            }
        }
    );
}


/* =========================================================
   51. SETTINGS CONTROLS
   ========================================================= */

function initSettingsControls() {

    document.addEventListener(
        "change",
        event => {

            const toggle =
                event.target.closest(
                    "[data-setting]"
                );


            if (!toggle) return;


            const setting =
                toggle.dataset.setting;


            if (
                setting === "notifications"
            ) {

                localStorage.setItem(
                    "turkai_notifications",
                    toggle.checked
                        ? "1"
                        : "0"
                );
            }


            if (
                setting === "sound"
            ) {

                localStorage.setItem(
                    "turkai_sound",
                    toggle.checked
                        ? "1"
                        : "0"
                );
            }


            if (
                setting === "memory"
            ) {

                localStorage.setItem(
                    "turkai_memory",
                    toggle.checked
                        ? "1"
                        : "0"
                );
            }


            if (
                setting === "research"
            ) {

                localStorage.setItem(
                    "turkai_research",
                    toggle.checked
                        ? "1"
                        : "0"
                );
            }


            showToast(
                "Ayar kaydedildi.",
                "success"
            );
        }
    );
}


/* =========================================================
   52. THEME
   ========================================================= */

function initTheme() {

    const saved =
        localStorage.getItem(
            "turkai_theme"
        );


    if (saved) {

        applyTheme(saved);
    }


    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-theme]"
                );


            if (!button) return;


            const theme =
                button.dataset.theme;


            applyTheme(theme);
        }
    );
}


function applyTheme(theme) {

    if (!theme) return;


    if (theme === "light") {

        document.documentElement.dataset.theme =
            "light";

    } else {

        document.documentElement.dataset.theme =
            "dark";
    }


    localStorage.setItem(
        "turkai_theme",
        theme
    );


    showToast(
        "Tema güncellendi.",
        "success"
    );
}


/* =========================================================
   53. SOCKET.IO
   ========================================================= */

function initSocket() {

    if (
        typeof window.io !==
        "function"
    ) {

        console.log(
            "Socket.IO bulunamadı; HTTP modu kullanılacak."
        );

        return;
    }


    try {

        const socket =
            window.io(
                TURKAI.apiBase || undefined,
                {
                    transports: [
                        "websocket",
                        "polling"
                    ]
                }
            );


        window.turkAISocket =
            socket;


        socket.on(
            "connect",
            () => {

                console.log(
                    "TürkAI realtime bağlantısı aktif."
                );


                $$(
                    "[data-realtime-status]"
                ).forEach(element => {

                    element.classList.add(
                        "online"
                    );
                });
            }
        );


        socket.on(
            "disconnect",
            () => {

                $$(
                    "[data-realtime-status]"
                ).forEach(element => {

                    element.classList.remove(
                        "online"
                    );
                });
            }
        );


        socket.on(
            "connect_error",
            error => {

                console.warn(
                    "Socket bağlantısı:",
                    error.message
                );
            }
        );


        /* Genel task */

        socket.on(
            "task:update",
            task => {

                updateTaskUI(task);
            }
        );


        socket.on(
            "media:progress",
            task => {

                updateTaskUI(task);
            }
        );


        socket.on(
            "notification",
            notification => {

                addNotification(
                    notification
                );
            }
        );


        socket.on(
            "chat:stream",
            payload => {

                handleChatStream(
                    payload
                );
            }
        );


    } catch (error) {

        console.warn(
            "Socket.IO başlatılamadı:",
            error
        );
    }
}


/* =========================================================
   54. CHAT STREAM
   ========================================================= */

function handleChatStream(payload) {

    if (!payload) return;


    const text =
        payload.text ||
        payload.delta ||
        payload.content ||
        "";


    if (!text) return;


    let row =
        byId("streamingAssistantMessage");


    if (!row) {

        addMessage({
            role: "assistant",
            content: ""
        });


        const messages =
            byId("messages");


        row =
            messages?.lastElementChild;


        if (row) {

            row.id =
                "streamingAssistantMessage";
        }
    }


    const content =
        row?.querySelector(
            ".message-content"
        );


    if (!content) return;


    const current =
        content.dataset.raw ||
        "";


    const updated =
        current + text;


    content.dataset.raw =
        updated;


    content.innerHTML =
        formatMessage(updated);


    scrollMessages();
}


/* =========================================================
   55. TASK UI
   ========================================================= */

function updateTaskUI(task) {

    if (!task) return;


    const progress =
        task.progress ??
        task.percent ??
        0;


    const progressBars =
        $$("[data-task-progress]");


    progressBars.forEach(bar => {

        bar.style.width =
            `${Math.max(
                0,
                Math.min(100, progress)
            )}%`;
    });


    const labels =
        $$("[data-task-status]");


    labels.forEach(label => {

        label.textContent =
            task.status ||
            `${progress}%`;
    });
}


/* =========================================================
   56. NOTIFICATIONS
   ========================================================= */

function addNotification(notification) {

    if (!notification) return;


    const title =
        notification.title ||
        "TürkAI";


    const message =
        notification.message ||
        notification.text ||
        "";


    const list =
        byId("notificationList");


    if (!list) return;


    const item =
        document.createElement("div");


    item.className =
        "notification-item";


    item.innerHTML = `
        <div class="notification-title">
            ${escapeHTML(title)}
        </div>

        <div class="notification-message">
            ${escapeHTML(message)}
        </div>
    `;


    list.prepend(item);
}


/* =========================================================
   57. INIT ALL
   ========================================================= */

function initEverything() {

    initResearch();

    initWeather();

    initFileActions();

    initMedia();

    initVoice();

    initAuth();

    initGoogleLogin();

    initSettingsControls();

    initTheme();

    initSocket();


    /* Drag & Drop */

    initDragDrop();


    /* Tool buttons */

    initExtraToolButtons();


    console.log(
        "TürkAI tüm sistemleri aktif."
    );
}


/* =========================================================
   58. DRAG & DROP
   ========================================================= */

function initDragDrop() {

    const area =
        byId("composer") ||
        $(".composer-shell") ||
        byId("chatPage");


    if (!area) return;


    ["dragenter", "dragover"].forEach(
        eventName => {

            area.addEventListener(
                eventName,
                event => {

                    event.preventDefault();

                    area.classList.add(
                        "drag-over"
                    );
                }
            );
        }
    );


    ["dragleave", "drop"].forEach(
        eventName => {

            area.addEventListener(
                eventName,
                event => {

                    event.preventDefault();

                    area.classList.remove(
                        "drag-over"
                    );
                }
            );
        }
    );


    area.addEventListener(
        "drop",
        event => {

            const file =
                event.dataTransfer
                    ?.files?.[0];


            if (file) {

                handleSelectedFile(file);
            }
        }
    );
}


/* =========================================================
   59. EXTRA TOOL BUTTONS
   ========================================================= */

function initExtraToolButtons() {

    document.addEventListener(
        "click",
        event => {

            /* Research */

            const research =
                event.target.closest(
                    "[data-tool='research']"
                );


            if (research) {

                event.preventDefault();

                navigateTo("research");

                return;
            }


            /* Weather */

            const weather =
                event.target.closest(
                    "[data-tool='weather']"
                );


            if (weather) {

                event.preventDefault();

                navigateTo("chat");


                const input =
                    byId("messageInput");


                if (input) {

                    input.value =
                        "Bugün hava durumu nasıl?";

                    updateCharacterCounter();

                    autoResizeInput(input);

                    input.focus();
                }

                return;
            }


            /* Code */

            const code =
                event.target.closest(
                    "[data-tool='code']"
                );


            if (code) {

                event.preventDefault();

                navigateTo("code");

                return;
            }


            /* Files */

            const files =
                event.target.closest(
                    "[data-tool='files']"
                );


            if (files) {

                event.preventDefault();

                navigateTo("files");

                return;
            }


            /* Media */

            const media =
                event.target.closest(
                    "[data-tool='media']"
                );


            if (media) {

                event.preventDefault();

                navigateTo("media");

                return;
            }
        }
    );
}


/* =========================================================
   60. PAGE BUTTON AUTO BIND
   ========================================================= */

function bindPageButtons() {

    const mapping = {

        chat:
            [
                "#chatButton",
                "[data-nav='chat']"
            ],

        research:
            [
                "#researchPageButton",
                "[data-nav='research']"
            ],

        files:
            [
                "#filesPageButton",
                "[data-nav='files']"
            ],

        media:
            [
                "#mediaPageButton",
                "[data-nav='media']"
            ],

        code:
            [
                "#codePageButton",
                "[data-nav='code']"
            ]
    };


    Object.entries(mapping)
        .forEach(([page, selectors]) => {

            selectors.forEach(selector => {

                $$(selector).forEach(button => {

                    button.addEventListener(
                        "click",
                        event => {

                            event.preventDefault();

                            navigateTo(page);
                        }
                    );
                });
            });
        });
}


/* =========================================================
   61. GLOBAL CLOSE MENUS
   ========================================================= */

function initOutsideClick() {

    document.addEventListener(
        "click",
        event => {

            const modelMenu =
                byId("modelMenu") ||
                $(".model-menu");


            const modelButton =
                byId("modelSelector") ||
                $(".model-selector");


            if (
                modelMenu &&
                !modelMenu.contains(event.target) &&
                !modelButton?.contains(event.target)
            ) {

                modelMenu.classList.remove(
                    "active"
                );

                modelMenu.hidden = true;

                TURKAI.state.modelMenuOpen =
                    false;
            }


            const userMenu =
                byId("userMenu") ||
                $(".user-menu");


            if (
                userMenu &&
                !userMenu.contains(event.target) &&
                !event.target.closest(
                    "[data-action='user-menu'], #userMenuButton"
                )
            ) {

                closeUserMenu();
            }


            const notification =
                byId("notificationPanel") ||
                $(".notification-panel");


            if (
                notification &&
                !notification.contains(event.target) &&
                !event.target.closest(
                    "[data-action='notifications'], #notificationButton"
                )
            ) {

                closeNotificationPanel();
            }
        }
    );
}


/* =========================================================
   62. PLAN BUTTONS
   ========================================================= */

function initPlanButtons() {

    document.addEventListener(
        "click",
        async event => {

            const button =
                event.target.closest(
                    "[data-plan]"
                );


            if (!button) return;


            event.preventDefault();


            const plan =
                button.dataset.plan;


            if (!plan) return;


            try {

                const response =
                    await apiRequest(
                        "/api/pro/activate",
                        {
                            method: "POST",
                            body: {
                                plan
                            }
                        }
                    );


                if (
                    response.ok &&
                    response.data
                ) {

                    showToast(
                        response.data.message ||
                        `${plan} plan seçildi.`,
                        "success"
                    );

                } else {

                    showToast(
                        response.data?.message ||
                        "Plan işlemi sunucu tarafından reddedildi.",
                        "warning"
                    );
                }

            } catch (error) {

                console.error(
                    "Plan:",
                    error
                );


                showToast(
                    "Plan işlemi gerçekleştirilemedi.",
                    "danger"
                );
            }
        }
    );
}


/* =========================================================
   63. HEALTH CHECK
   ========================================================= */

async function checkServerHealth() {

    try {

        const response =
            await apiRequest(
                "/api/system/health",
                {
                    timeout: 10000
                }
            );


        const healthy =
            response.ok;


        $$(
            "[data-server-health]"
        ).forEach(element => {

            element.classList.toggle(
                "healthy",
                healthy
            );

            element.classList.toggle(
                "unhealthy",
                !healthy
            );


            element.textContent =
                healthy
                    ? "Sistem aktif"
                    : "Sistem kontrol ediliyor";
        });


        return healthy;

    } catch {

        $$(
            "[data-server-health]"
        ).forEach(element => {

            element.textContent =
                "Sunucu bağlantısı yok";
        });


        return false;
    }
}


/* =========================================================
   64. GLOBAL ERROR HANDLING
   ========================================================= */

window.addEventListener(
    "error",
    event => {

        console.error(
            "TürkAI frontend error:",
            event.error || event.message
        );
    }
);


window.addEventListener(
    "unhandledrejection",
    event => {

        console.error(
            "TürkAI promise error:",
            event.reason
        );
    }
);


/* =========================================================
   65. FINAL STARTUP
   ========================================================= */

(function finalStartup() {

    try {

        initEverything();

        bindPageButtons();

        initOutsideClick();

        initPlanButtons();

        checkServerHealth();


        /* İlk sayfa */

        setTimeout(
            () => {

                navigateTo(
                    TURKAI.state.currentPage ||
                    "chat"
                );

            },
            50
        );


        console.log(
            "%c TÜRKAI 20.0 ",
            "background:#20c7d6;color:#070a0f;font-weight:800;padding:6px 12px;border-radius:8px"
        );

        console.log(
            "Frontend tamamen başlatıldı."
        );

    } catch (error) {

        console.error(
            "TürkAI startup error:",
            error
        );


        showToast(
            "Arayüz başlatılırken hata oluştu.",
            "danger"
        );
    }

})();


/* =========================================================
   66. PUBLIC API
   ========================================================= */

window.TURKAI_APP = {

    version: TURKAI.version,

    sendMessage,

    createNewChat,

    navigateTo,

    openModal,

    closeModal,

    runResearch,

    getWeather,

    generateImage,

    generateVideo,

    uploadSelectedFile,

    removeSelectedFile,

    logoutUser,

    showToast,

    checkServerHealth,

    state: TURKAI.state
};


console.log(
    "TürkAI App.js PART 2/2 yüklendi."
);


/* =========================================================
   TÜRKAI APP.JS — 20/20 COMPLETE
   ========================================================= */

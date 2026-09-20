(() => {
  "use strict";

  if (window.__TURKAI_APP_REBUILT__) return;
  window.__TURKAI_APP_REBUILT__ = true;

  /* =========================================================
     TÜRKAI FRONTEND — REBUILT
     Tek kapsam / tüm fonksiyonlar birbirine doğrudan erişir
     ========================================================= */

  const CONFIG = {
    version: "41.0.0",
    timeout: 45000,

    endpoints: {
      chatSmart: "/api/chat/smart",
      chat: "/api/chat",
      health: "/api/health",
      systemStatus: "/api/system/status",

      authMe: "/api/auth/me",
      authLogin: "/api/auth/login",
      authLogout: "/api/auth/logout",
      authRegister: "/api/auth/register",

      account: "/api/account",
      plans: "/api/plans",

      research: "/api/research",
      weather: "/api/weather",

      memorySearch: "/api/memory/search",
      memorySave: "/api/memory/save",

      files: "/api/files",
      filesUpload: "/api/files/upload",

      notifications: "/api/notifications",

      mediaImage: "/api/media/image",
      mediaVideo: "/api/media/video",

      voiceTTS: "/api/voice/tts",
      voiceSTT: "/api/voice/stt",

      adminUnlock: "/api/security/admin/unlock"
    },

    storage: {
      draft: "turkai_draft_v41",
      settings: "turkai_settings_v41",
      chats: "turkai_chats_v41",
      guest: "turkai_guest_v41",
      model: "turkai_model_v41"
    },

    defaults: {
      model: "auto",
      settings: {
        enterToSend: true,
        draftSave: true,
        autoSpeak: false,
        freshInfo: true
      }
    }
  };

  const state = {
    initialized: false,
    connected: navigator.onLine,
    sending: false,
    loading: false,

    sidebarOpen: false,
    activePanel: "chat",
    activeModal: null,

    conversationId: null,
    messages: [],

    attachments: [],
    files: [],
    notifications: [],
    plans: [],

    account: null,
    system: null,
    memoryResults: [],
    researchResults: [],
    weatherData: null,

    recording: false,
    speaking: false,

    recognition: null,
    synthUtterance: null,

    abortController: null,

    settings: {
      ...CONFIG.defaults.settings
    },

    selectedModel: "auto",

    commandItems: [],
    commandIndex: 0,

    notificationUnread: 0
  };

  const $ = (id) => document.getElementById(id);

  const el = {
    sidebar: $("sidebar"),
    mobileSidebarClose: $("mobileSidebarClose"),

    newChatButton: $("newChatButton"),
    mainNavigation: $("mainNavigation"),

    quickResearchButton: $("quickResearchButton"),
    quickMemoryButton: $("quickMemoryButton"),
    quickFilesButton: $("quickFilesButton"),
    settingsButton: $("settingsButton"),
    systemButton: $("systemButton"),
    accountButton: $("accountButton"),

    accountName: $("accountName"),
    accountPlan: $("accountPlan"),
    accountStatusDot: $("accountStatusDot"),

    sidebarToggle: $("sidebarToggle"),
    connectionDot: $("connectionDot"),
    connectionText: $("connectionText"),
    workspaceTitle: $("workspaceTitle"),
    searchButton: $("searchButton"),
    notificationButton: $("notificationButton"),
    notificationBadge: $("notificationBadge"),
    topSettingsButton: $("topSettingsButton"),
    topAccountButton: $("topAccountButton"),

    chatView: $("chatView"),
    welcomeState: $("welcomeState"),
    welcomeTitle: $("welcomeTitle"),
    messages: $("messages"),
    typingIndicator: $("typingIndicator"),

    composerArea: $("composerArea"),
    composerBox: $("composerBox"),
    messageInput: $("messageInput"),
    sendButton: $("sendButton"),
    stopButton: $("stopButton"),
    voiceButton: $("voiceButton"),
    attachmentButton: $("attachmentButton"),
    researchToolButton: $("researchToolButton"),
    weatherToolButton: $("weatherToolButton"),
    memoryToolButton: $("memoryToolButton"),
    imageToolButton: $("imageToolButton"),
    videoToolButton: $("videoToolButton"),

    attachmentPreview: $("attachmentPreview"),
    modelSelect: $("modelSelect"),
    composerTokenInfo: $("composerTokenInfo"),

    workspacePanel: $("workspacePanel"),

    researchPanel: $("researchPanel"),
    researchInput: $("researchInput"),
    researchRunButton: $("researchRunButton"),
    researchClearButton: $("researchClearButton"),
    researchStatus: $("researchStatus"),
    researchResults: $("researchResults"),

    weatherPanel: $("weatherPanel"),
    weatherInput: $("weatherInput"),
    weatherRunButton: $("weatherRunButton"),
    weatherResults: $("weatherResults"),

    memoryPanel: $("memoryPanel"),
    memoryInput: $("memoryInput"),
    memorySearchButton: $("memorySearchButton"),
    memorySaveCurrentButton: $("memorySaveCurrentButton"),
    memoryOverviewButton: $("memoryOverviewButton"),
    memoryStats: $("memoryStats"),
    memoryResults: $("memoryResults"),

    fileCenterPanel: $("fileCenterPanel"),
    fileDropZone: $("fileDropZone"),
    fileSelectButton: $("fileSelectButton"),
    refreshFilesButton: $("refreshFilesButton"),
    fileCount: $("fileCount"),
    fileList: $("fileList"),

    mediaPanel: $("mediaPanel"),
    openImageModalButton: $("openImageModalButton"),
    openVideoModalButton: $("openVideoModalButton"),

    plansPanel: $("plansPanel"),
    plansList: $("plansList"),

    notificationPanel: $("notificationPanel"),
    notificationList: $("notificationList"),
    notificationSummary: $("notificationSummary"),
    markNotificationsReadButton: $("markNotificationsReadButton"),

    systemPanel: $("systemPanel"),
    systemOverallStatus: $("systemOverallStatus"),
    refreshSystemButton: $("refreshSystemButton"),
    systemStats: $("systemStats"),

    mobileNav: $("mobileNav"),

    globalFilePicker: $("globalFilePicker"),
    dropOverlay: $("dropOverlay"),
    globalOverlay: $("globalOverlay"),
    toastStack: $("toastStack"),
    liveRegion: $("liveRegion"),

    commandCenter: $("commandCenter"),
    commandInput: $("commandInput"),
    commandList: $("commandList"),

    chatSearchPanel: $("chatSearchPanel"),
    chatSearchInput: $("chatSearchInput"),
    chatSearchResults: $("chatSearchResults"),

    settingsModal: $("settingsModal"),
    enterSendToggle: $("enterSendToggle"),
    draftSaveToggle: $("draftSaveToggle"),
    autoSpeakToggle: $("autoSpeakToggle"),
    freshInfoToggle: $("freshInfoToggle"),
    resetSettingsButton: $("resetSettingsButton"),
    saveSettingsButton: $("saveSettingsButton"),

    accountModal: $("accountModal"),
    accountModalName: $("accountModalName"),
    accountModalEmail: $("accountModalEmail"),
    accountModalVerified: $("accountModalVerified"),
    accountModalPlan: $("accountModalPlan"),
    accountModalUsage: $("accountModalUsage"),
    accountModalStatus: $("accountModalStatus"),
    loginButton: $("loginButton"),
    logoutButton: $("logoutButton"),
    accountPlansButton: $("accountPlansButton"),

    authModal: $("authModal"),
    authForm: $("authForm"),
    authIdentifier: $("authIdentifier"),
    authPassword: $("authPassword"),
    authMessage: $("authMessage"),
    guestLoginButton: $("guestLoginButton"),

    imageCreateModal: $("imageCreateModal"),
    imagePromptInput: $("imagePromptInput"),
    imageSizeSelect: $("imageSizeSelect"),
    imageQualitySelect: $("imageQualitySelect"),
    generateImageButton: $("generateImageButton"),
    imageResult: $("imageResult"),

    videoModal: $("videoModal"),
    videoPromptInput: $("videoPromptInput"),
    videoDurationSelect: $("videoDurationSelect"),
    generateVideoButton: $("generateVideoButton"),
    videoResult: $("videoResult"),

    commandHelpModal: $("commandHelpModal"),

    confirmModal: $("confirmModal"),
    confirmModalTitle: $("confirmModalTitle"),
    confirmModalText: $("confirmModalText"),
    confirmCancelButton: $("confirmCancelButton"),
    confirmActionButton: $("confirmActionButton"),

    adminUnlockModal: $("adminUnlockModal"),
    adminUnlockForm: $("adminUnlockForm"),
    adminUnlockInput: $("adminUnlockInput"),
    adminUnlockMessage: $("adminUnlockMessage"),

    adminPanel: $("adminPanel"),
    adminSystemButton: $("adminSystemButton"),
    adminUsersButton: $("adminUsersButton"),
    adminMemoryButton: $("adminMemoryButton"),
    adminLogsButton: $("adminLogsButton"),
    adminOutput: $("adminOutput"),

    systemDetailModal: $("systemDetailModal"),
    systemDetailContent: $("systemDetailContent"),

    globalLoading: $("globalLoading"),
    globalLoadingTitle: $("globalLoadingTitle"),
    globalLoadingText: $("globalLoadingText"),

    voiceStatus: $("voiceStatus"),
    voiceStatusTitle: $("voiceStatusTitle"),
    voiceStatusText: $("voiceStatusText"),
    voiceCancelButton: $("voiceCancelButton"),

    uploadStatusBar: $("uploadStatusBar"),
    uploadStatusTitle: $("uploadStatusTitle"),
    uploadStatusText: $("uploadStatusText"),
    uploadProgressBar: $("uploadProgressBar"),

    purchaseButton: $("purchaseButton"),
    proCodeInput: $("proCodeInput")
  };

  /* =========================================================
     TEMEL YARDIMCILAR
     ========================================================= */

  function exists(node) {
    return !!node;
  }

  function safeText(value, fallback = "") {
    if (value === null || value === undefined) return fallback;
    return String(value);
  }

  function escapeHTML(value) {
    return safeText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatTime(date = new Date()) {
    try {
      return new Intl.DateTimeFormat("tr-TR", {
        hour: "2-digit",
        minute: "2-digit"
      }).format(date);
    } catch {
      return new Date(date).toLocaleTimeString("tr-TR");
    }
  }

  function formatDateTime(date = new Date()) {
    try {
      return new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(date));
    } catch {
      return new Date(date).toLocaleString("tr-TR");
    }
  }

  function formatBytes(bytes) {
    const size = Number(bytes) || 0;

    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }
    if (size < 1024 * 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function generateId(prefix = "id") {
    return `${prefix}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function storageGet(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function storageRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  function announce(message) {
    if (!el.liveRegion) return;
    el.liveRegion.textContent = "";
    requestAnimationFrame(() => {
      el.liveRegion.textContent = safeText(message);
    });
  }

  /* =========================================================
     TOAST
     ========================================================= */

  function toast(message, type = "info", duration = 3200) {
    if (!el.toastStack) return;

    const item = document.createElement("div");
    item.className = `toast toast-${type}`;

    item.innerHTML = `
      <div class="toast-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <use href="#${
            type === "success"
              ? "i-check"
              : type === "error"
              ? "i-alert"
              : type === "warning"
              ? "i-alert"
              : "i-info"
          }"></use>
        </svg>
      </div>
      <div class="toast-text">${escapeHTML(message)}</div>
      <button class="toast-close" type="button" aria-label="Kapat">
        <svg viewBox="0 0 24 24">
          <use href="#i-close"></use>
        </svg>
      </button>
    `;

    item
      .querySelector(".toast-close")
      ?.addEventListener("click", () => item.remove());

    el.toastStack.appendChild(item);

    window.setTimeout(() => {
      item.style.opacity = "0";
      item.style.transform = "translateY(8px)";

      window.setTimeout(() => item.remove(), 220);
    }, duration);

    announce(message);
  }

  /* =========================================================
     LOADING
     ========================================================= */

  function showLoading(title = "TürkAI çalışıyor", message = "Hazırlanıyor...") {
    state.loading = true;

    if (el.globalLoading) {
      el.globalLoading.classList.remove("hidden");
      if (el.globalLoadingTitle) {
        el.globalLoadingTitle.textContent = title;
      }
      if (el.globalLoadingText) {
        el.globalLoadingText.textContent = message;
      }
    }
  }

  function hideLoading() {
    state.loading = false;

    if (el.globalLoading) {
      el.globalLoading.classList.add("hidden");
    }
  }

  /* =========================================================
     MODAL
     ========================================================= */

  function openModal(modal) {
    const node =
      typeof modal === "string"
        ? document.getElementById(modal)
        : modal;

    if (!node) return;

    document.querySelectorAll(".modal-shell").forEach((item) => {
      if (item !== node) {
        item.classList.add("hidden");
      }
    });

    node.classList.remove("hidden");
    state.activeModal = node.id;

    document.body.classList.add("modal-open");

    const focusTarget = node.querySelector(
      "input, textarea, select, button"
    );

    window.setTimeout(() => focusTarget?.focus(), 40);
  }

  function closeModal(modal) {
    const node =
      typeof modal === "string"
        ? document.getElementById(modal)
        : modal;

    if (!node) return;

    node.classList.add("hidden");

    if (state.activeModal === node.id) {
      state.activeModal = null;
    }

    if (
      !document.querySelector(
        ".modal-shell:not(.hidden)"
      )
    ) {
      document.body.classList.remove("modal-open");
    }
  }

  function closeAllModals() {
    document
      .querySelectorAll(".modal-shell")
      .forEach((node) => node.classList.add("hidden"));

    state.activeModal = null;
    document.body.classList.remove("modal-open");
  }

  function bindModals() {
    document.addEventListener("click", (event) => {
      const closeButton = event.target.closest(
        "[data-close-modal]"
      );

      if (closeButton) {
        closeModal(
          closeButton.getAttribute("data-close-modal")
        );
        return;
      }

      const commandClose = event.target.closest(
        "[data-close-command]"
      );

      if (commandClose) {
        closeModal("commandCenter");
        return;
      }

      const searchClose = event.target.closest(
        "[data-close-chat-search]"
      );

      if (searchClose) {
        closeModal("chatSearchPanel");
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (state.recording) {
          stopVoiceInput();
        } else {
          closeAllModals();
        }
      }
    });
  }

  /* =========================================================
     API
     ========================================================= */

  async function apiRequest(
    url,
    options = {},
    timeoutMs = CONFIG.timeout
  ) {
    const controller =
      options.signal
        ? null
        : new AbortController();

    const signal = options.signal || controller.signal;

    const timer = window.setTimeout(() => {
      controller?.abort();
    }, timeoutMs);

    const headers = new Headers(
      options.headers || {}
    );

    headers.set("Accept", "application/json, text/plain, */*");
    headers.set("X-TurkAI-Version", CONFIG.version);
    headers.set(
      "X-TurkAI-Request-ID",
      generateId("req")
    );

    let body = options.body;

    if (
      body &&
      typeof body === "object" &&
      !(body instanceof FormData) &&
      !(body instanceof Blob) &&
      !(body instanceof URLSearchParams)
    ) {
      body = JSON.stringify(body);
      headers.set(
        "Content-Type",
        "application/json; charset=UTF-8"
      );
    }

    try {
      const response = await fetch(url, {
        method: options.method || "GET",
        headers,
        body,
        credentials: "same-origin",
        cache: "no-store",
        redirect: "follow",
        signal
      });

      const contentType =
        response.headers.get("content-type") || "";

      let data;

      if (contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch {
          data = null;
        }
      } else {
        try {
          data = await response.text();
        } catch {
          data = "";
        }
      }

      if (!response.ok) {
        const message =
          typeof data === "object" && data
            ? data.error ||
              data.message ||
              data.details ||
              `HTTP ${response.status}`
            : safeText(data) ||
              `HTTP ${response.status}`;

        const error = new Error(message);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function safeRequest(
    url,
    options = {},
    fallback = null
  ) {
    try {
      return await apiRequest(url, options);
    } catch (error) {
      if (error?.name === "AbortError") {
        throw error;
      }

      return fallback;
    }
  }

  function extractAnswer(payload) {
    if (payload === null || payload === undefined) {
      return "";
    }

    if (typeof payload === "string") {
      return payload.trim();
    }

    const directKeys = [
      "answer",
      "response",
      "message",
      "text",
      "content",
      "reply"
    ];

    for (const key of directKeys) {
      if (
        typeof payload?.[key] === "string" &&
        payload[key].trim()
      ) {
        return payload[key].trim();
      }
    }

    const nestedKeys = [
      payload?.data,
      payload?.result,
      payload?.output,
      payload?.response?.data,
      payload?.result?.data
    ];

    for (const item of nestedKeys) {
      const found = extractAnswer(item);
      if (found) return found;
    }

    if (Array.isArray(payload?.choices)) {
      for (const choice of payload.choices) {
        const found =
          choice?.message?.content ||
          choice?.text;

        if (
          typeof found === "string" &&
          found.trim()
        ) {
          return found.trim();
        }
      }
    }

    return "";
  }

  function extractConversationId(payload) {
    return (
      payload?.conversationId ||
      payload?.conversation_id ||
      payload?.chatId ||
      payload?.chat_id ||
      payload?.data?.conversationId ||
      payload?.result?.conversationId ||
      null
    );
  }

  function isLocalFailureAnswer(answer) {
    const text = safeText(answer)
      .toLocaleLowerCase("tr-TR")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) return true;

    const patterns = [
      "bu soruyu yerel motorla doğrudan cevaplayamadım",
      "daha kapsamlı bir yanıt için uygun ai sağlayıcısı",
      "uygun ai sağlayıcısı veya araştırma motoru kullanılabilir",
      "yerel motorla doğrudan cevaplayamadım"
    ];

    return patterns.some((pattern) =>
      text.includes(pattern)
    );
  }

  /* =========================================================
     MARKDOWN / RICH TEXT
     ========================================================= */

  function renderRichText(value) {
    let source = safeText(value).replace(/\u0000/g, "").trim();

    if (!source) return "";

    /*
      Önce code blocklarını ayırıyoruz.
      Böylece kod içerisindeki SVG/HTML silinmez.
    */
    const codeBlocks = [];

    source = source.replace(
      /```([\w#+.\-]*)[ \t]*\n?([\s\S]*?)```/g,
      (_, language = "", code = "") => {
        const index = codeBlocks.length;

        codeBlocks.push({
          language:
            language.trim() || "code",
          code: safeText(code)
            .replace(/\r\n/g, "\n")
            .trim()
        });

        return `___TURKAI_CODE_BLOCK_${index}___`;
      }
    );

    /*
      Code dışındaki bozuk svg yazılarını temizle.
    */
    source = source.replace(
      /<svg\b[^>]*>[\s\S]*?<\/svg>/gi,
      ""
    );

    source = source.replace(
      /<\/?svg\b[^>]*>/gi,
      ""
    );

    source = source
      .replace(/\bsvgsvg\b/gi, "")
      .replace(/(^|\s)svg(?=\s|$)/gi, "$1");

    source = source.replace(
      /<script\b[^>]*>[\s\S]*?<\/script>/gi,
      ""
    );

    source = source.replace(
      /<style\b[^>]*>[\s\S]*?<\/style>/gi,
      ""
    );

    let html = escapeHTML(source);

    html = html.replace(
      /\*\*(.+?)\*\*/g,
      "<strong>$1</strong>"
    );

    html = html.replace(
      /__([^_]+?)__/g,
      "<strong>$1</strong>"
    );

    html = html.replace(
      /`([^`\n]+)`/g,
      "<code>$1</code>"
    );

    html = html.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    html = html.replace(
      /^### (.+)$/gm,
      "<h4>$1</h4>"
    );

    html = html.replace(
      /^## (.+)$/gm,
      "<h3>$1</h3>"
    );

    html = html.replace(
      /^# (.+)$/gm,
      "<h2>$1</h2>"
    );

    html = html.replace(
      /^\s*[-*] (.+)$/gm,
      "<div class=\"rich-list-item\">• $1</div>"
    );

    html = html.replace(
      /^\s*(\d+)\. (.+)$/gm,
      "<div class=\"rich-list-item\">$1. $2</div>"
    );

    html = html.replace(/\n/g, "<br>");

    codeBlocks.forEach((block, index) => {
      const safeCode = escapeHTML(block.code);
      const encodedCode = encodeURIComponent(
        block.code
      );

      const blockHTML = `
        <div class="code-block">
          <div class="code-block-header">
            <span class="code-language">
              ${escapeHTML(block.language)}
            </span>

            <button
              type="button"
              class="code-copy-button"
              data-code="${encodedCode}"
              title="Kodu kopyala"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <use href="#i-copy"></use>
              </svg>
              <span>Kopyala</span>
            </button>
          </div>

          <pre><code>${safeCode}</code></pre>
        </div>
      `;

      html = html.replace(
        `___TURKAI_CODE_BLOCK_${index}___`,
        blockHTML
      );
    });

    return html.trim();
  }

  /* =========================================================
     CHAT RENDER
     ========================================================= */

  function renderMessages() {
    if (!el.messages) return;

    el.messages.innerHTML = "";

    state.messages.forEach((message) => {
      el.messages.appendChild(
        renderMessage(message)
      );
    });

    bindMessageActions();
    scrollMessagesToBottom(false);

    const hasMessages =
      state.messages.length > 0;

    el.welcomeState?.classList.toggle(
      "hidden",
      hasMessages
    );
  }

  function renderMessage(message) {
    const row = document.createElement("div");

    row.className =
      `message-row message-${message.role || "assistant"}`;

    row.dataset.messageId =
      message.id || generateId("msg");

    const isUser = message.role === "user";

    const avatarIcon = isUser
      ? "i-user"
      : "i-logo";

    const bubble = renderRichText(
      message.content || ""
    );

    row.innerHTML = `
      <div class="message-avatar">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <use href="#${avatarIcon}"></use>
        </svg>
      </div>

      <div class="message-main">
        <div class="message-meta">
          <strong>
            ${isUser ? "Sen" : "TürkAI"}
          </strong>
          <span>
            ${formatTime(
              message.createdAt || new Date()
            )}
          </span>
        </div>

        <div class="message-content">
          <div class="message-bubble">
            ${bubble}
          </div>

          <div class="message-actions">
            ${
              isUser
                ? ""
                : `
                  <button
                    type="button"
                    class="message-action"
                    data-action="speak"
                    title="Sesli oku"
                  >
                    <svg viewBox="0 0 24 24">
                      <use href="#i-volume"></use>
                    </svg>
                  </button>
                `
            }

            <button
              type="button"
              class="message-action"
              data-action="copy"
              title="Kopyala"
            >
              <svg viewBox="0 0 24 24">
                <use href="#i-copy"></use>
              </svg>
            </button>

            ${
              !isUser
                ? `
                  <button
                    type="button"
                    class="message-action"
                    data-action="save-memory"
                    title="Hafızaya kaydet"
                  >
                    <svg viewBox="0 0 24 24">
                      <use href="#i-memory"></use>
                    </svg>
                  </button>
                `
                : ""
            }
          </div>
        </div>
      </div>
    `;

    return row;
  }

  function appendMessage(role, content, extra = {}) {
    const item = {
      id: generateId("msg"),
      role,
      content: safeText(content),
      createdAt: new Date().toISOString(),
      ...extra
    };

    state.messages.push(item);
    return item;
  }

  function scrollMessagesToBottom(smooth = true) {
    if (!el.messages) return;

    requestAnimationFrame(() => {
      el.messages.scrollTo({
        top: el.messages.scrollHeight,
        behavior: smooth ? "smooth" : "auto"
      });
    });
  }

  function bindMessageActions() {
    document
      .querySelectorAll(".message-action")
      .forEach((button) => {
        button.onclick = async () => {
          const row =
            button.closest(".message-row");

          const id =
            row?.dataset.messageId;

          const message =
            state.messages.find(
              (item) => item.id === id
            );

          if (!message) return;

          const action =
            button.dataset.action;

          if (action === "copy") {
            await copyText(message.content);
            toast(
              "Mesaj panoya kopyalandı.",
              "success"
            );
          }

          if (action === "speak") {
            speakText(message.content);
          }

          if (action === "save-memory") {
            await saveMemory(
              message.content,
              "chat"
            );
          }
        };
      });

    document
      .querySelectorAll(".code-copy-button")
      .forEach((button) => {
        button.onclick = async () => {
          const raw =
            button.dataset.code || "";

          let value = raw;

          try {
            value = decodeURIComponent(raw);
          } catch {}

          await copyText(value);

          const old =
            button.innerHTML;

          button.innerHTML = `
            <svg viewBox="0 0 24 24">
              <use href="#i-check"></use>
            </svg>
            <span>Kopyalandı</span>
          `;

          window.setTimeout(() => {
            button.innerHTML = old;
          }, 1200);
        };
      });
  }

  async function copyText(value) {
    const textValue = safeText(value);

    try {
      await navigator.clipboard.writeText(textValue);
      return true;
    } catch {
      const textarea =
        document.createElement("textarea");

      textarea.value = textValue;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);
      textarea.select();

      try {
        document.execCommand("copy");
      } catch {}

      textarea.remove();

      return true;
    }
  }

  /* =========================================================
     INPUT / DRAFT
     ========================================================= */

  function autoResizeInput() {
    if (!el.messageInput) return;

    el.messageInput.style.height = "auto";

    const maxHeight = 220;

    el.messageInput.style.height =
      `${Math.min(
        el.messageInput.scrollHeight,
        maxHeight
      )}px`;
  }

  function saveDraft() {
    if (!state.settings.draftSave) return;
    if (!el.messageInput) return;

    const value =
      el.messageInput.value || "";

    storageSet(
      CONFIG.storage.draft,
      value
    );
  }

  function loadDraft() {
    if (!el.messageInput) return;

    const value = storageGet(
      CONFIG.storage.draft,
      ""
    );

    if (
      typeof value === "string" &&
      value
    ) {
      el.messageInput.value = value;
      autoResizeInput();
    }
  }

  function clearDraft() {
    storageRemove(
      CONFIG.storage.draft
    );
  }

  /* =========================================================
     SETTINGS
     ========================================================= */

  function loadSettings() {
    const saved =
      storageGet(
        CONFIG.storage.settings,
        {}
      );

    state.settings = {
      ...CONFIG.defaults.settings,
      ...(saved || {})
    };

    state.selectedModel =
      storageGet(
        CONFIG.storage.model,
        CONFIG.defaults.model
      );

    if (el.modelSelect) {
      el.modelSelect.value =
        state.selectedModel;
    }

    syncSettingsUI();
  }

  function syncSettingsUI() {
    if (el.enterSendToggle) {
      el.enterSendToggle.checked =
        !!state.settings.enterToSend;
    }

    if (el.draftSaveToggle) {
      el.draftSaveToggle.checked =
        !!state.settings.draftSave;
    }

    if (el.autoSpeakToggle) {
      el.autoSpeakToggle.checked =
        !!state.settings.autoSpeak;
    }

    if (el.freshInfoToggle) {
      el.freshInfoToggle.checked =
        !!state.settings.freshInfo;
    }
  }

  function saveSettings() {
    state.settings = {
      enterToSend:
        !!el.enterSendToggle?.checked,

      draftSave:
        !!el.draftSaveToggle?.checked,

      autoSpeak:
        !!el.autoSpeakToggle?.checked,

      freshInfo:
        !!el.freshInfoToggle?.checked
    };

    storageSet(
      CONFIG.storage.settings,
      state.settings
    );

    toast(
      "Ayarlar kaydedildi.",
      "success"
    );
  }

  function resetSettings() {
    state.settings = {
      ...CONFIG.defaults.settings
    };

    syncSettingsUI();

    storageSet(
      CONFIG.storage.settings,
      state.settings
    );

    toast(
      "Ayarlar varsayılana döndürüldü.",
      "success"
    );
  }

  /* =========================================================
     SIDEBAR / PANELLER
     ========================================================= */

  const panelMap = {
    chat: el.chatView,
    research: el.researchPanel,
    weather: el.weatherPanel,
    memory: el.memoryPanel,
    files: el.fileCenterPanel,
    media: el.mediaPanel,
    plans: el.plansPanel,
    notifications: el.notificationPanel,
    system: el.systemPanel
  };

  function closeAllPanels() {
    Object.values(panelMap).forEach(
      (panel) =>
        panel?.classList.remove("active")
    );

    if (el.chatView) {
      el.chatView.classList.remove("hidden");
    }

    state.activePanel = "chat";
    updateNavigation("chat");
  }

  async function openPanel(panelName) {
    const name =
      panelMap[panelName]
        ? panelName
        : "chat";

    Object.entries(panelMap).forEach(
      ([key, panel]) => {
        if (!panel) return;

        if (key === name) {
          panel.classList.add("active");
          panel.classList.remove("hidden");
        } else {
          panel.classList.remove("active");
          if (key !== "chat") {
            panel.classList.add("hidden");
          }
        }
      }
    );

    if (
      name === "chat" &&
      el.chatView
    ) {
      el.chatView.classList.remove("hidden");
    } else if (el.chatView) {
      el.chatView.classList.add("hidden");
    }

    state.activePanel = name;

    updateNavigation(name);

    switch (name) {
      case "research":
        await loadResearchPanel();
        break;

      case "weather":
        break;

      case "memory":
        await loadMemoryOverview();
        break;

      case "files":
        await loadFiles();
        break;

      case "plans":
        await loadPlans();
        break;

      case "notifications":
        await loadNotifications();
        break;

      case "system":
        await loadSystemStatus();
        break;
    }

    closeMobileSidebar();
  }

  function updateNavigation(active) {
    document
      .querySelectorAll(
        "[data-panel], [data-mobile-panel]"
      )
      .forEach((button) => {
        const name =
          button.dataset.panel ||
          button.dataset.mobilePanel;

        button.classList.toggle(
          "active",
          name === active
        );
      });

    const titleMap = {
      chat: "Yeni sohbet",
      research: "Araştırma",
      weather: "Hava durumu",
      memory: "Hafıza",
      files: "Dosyalar",
      media: "Medya",
      plans: "Planlar",
      notifications: "Bildirimler",
      system: "Sistem"
    };

    if (el.workspaceTitle) {
      el.workspaceTitle.textContent =
        titleMap[active] || "TürkAI";
    }
  }

  function openSidebar() {
    if (!el.sidebar) return;

    state.sidebarOpen = true;

    el.sidebar.classList.add("open");
    document.body.classList.add(
      "sidebar-open"
    );
  }

  function closeMobileSidebar() {
    if (!el.sidebar) return;

    state.sidebarOpen = false;

    el.sidebar.classList.remove("open");
    document.body.classList.remove(
      "sidebar-open"
    );
  }

  function toggleSidebar() {
    if (state.sidebarOpen) {
      closeMobileSidebar();
    } else {
      openSidebar();
    }
  }

  /* =========================================================
     COMMANDS
     ========================================================= */

  state.commandItems = [
    {
      id: "new-chat",
      title: "Yeni sohbet",
      description: "Temiz bir sohbet başlat",
      icon: "i-plus",
      action: () => createNewChat()
    },
    {
      id: "research",
      title: "Araştırmayı aç",
      description: "Web araştırma panelini aç",
      icon: "i-search",
      action: () => openPanel("research")
    },
    {
      id: "weather",
      title: "Hava durumunu aç",
      description: "Hava durumunu kontrol et",
      icon: "i-cloud",
      action: () => openPanel("weather")
    },
    {
      id: "memory",
      title: "Hafızayı aç",
      description: "TürkAI hafıza alanına git",
      icon: "i-memory",
      action: () => openPanel("memory")
    },
    {
      id: "files",
      title: "Dosyaları aç",
      description: "Dosya merkezini aç",
      icon: "i-folder",
      action: () => openPanel("files")
    },
    {
      id: "media",
      title: "Medya",
      description: "Görsel ve video araçları",
      icon: "i-image",
      action: () => openPanel("media")
    },
    {
      id: "plans",
      title: "Planlar",
      description: "TürkAI planlarını görüntüle",
      icon: "i-crown",
      action: () => openPanel("plans")
    },
    {
      id: "notifications",
      title: "Bildirimler",
      description: "Bildirim panelini aç",
      icon: "i-bell",
      action: () => openPanel("notifications")
    },
    {
      id: "system",
      title: "Sistem",
      description: "Sunucu durumunu göster",
      icon: "i-command",
      action: () => openPanel("system")
    },
    {
      id: "settings",
      title: "Ayarlar",
      description: "TürkAI ayarlarını aç",
      icon: "i-settings",
      action: () => openModal("settingsModal")
    },
    {
      id: "account",
      title: "Hesap",
      description: "Hesap bilgilerini aç",
      icon: "i-user",
      action: () => openModal("accountModal")
    }
  ];

  function renderCommands(query = "") {
    if (!el.commandList) return;

    const normalized =
      safeText(query)
        .toLocaleLowerCase("tr-TR")
        .trim();

    const filtered =
      state.commandItems.filter(
        (item) => {
          const text = (
            item.title +
            " " +
            item.description
          ).toLocaleLowerCase("tr-TR");

          return !normalized ||
            text.includes(normalized);
        }
      );

    el.commandList.innerHTML = "";

    filtered.forEach((item, index) => {
      const button =
        document.createElement("button");

      button.type = "button";
      button.className =
        `command-item ${
          index === state.commandIndex
            ? "active"
            : ""
        }`;

      button.dataset.commandId =
        item.id;

      button.innerHTML = `
        <div class="command-item-icon">
          <svg viewBox="0 0 24 24">
            <use href="#${item.icon}"></use>
          </svg>
        </div>

        <div class="command-item-content">
          <strong>
            ${escapeHTML(item.title)}
          </strong>
          <span>
            ${escapeHTML(item.description)}
          </span>
        </div>

        <svg
          class="command-item-arrow"
          viewBox="0 0 24 24"
        >
          <use href="#i-chevron-right"></use>
        </svg>
      `;

      button.onclick = () => {
        closeModal("commandCenter");
        item.action();
      };

      el.commandList.appendChild(button);
    });

    state.commandIndex = clamp(
      state.commandIndex,
      0,
      Math.max(filtered.length - 1, 0)
    );
  }

  function openCommandCenter() {
    openModal("commandCenter");

    state.commandIndex = 0;

    if (el.commandInput) {
      el.commandInput.value = "";
    }

    renderCommands();

    window.setTimeout(() => {
      el.commandInput?.focus();
    }, 50);
  }

  /* =========================================================
     NEW CHAT
     ========================================================= */

  function createNewChat() {
    state.conversationId = null;
    state.messages = [];
    state.attachments = [];

    renderMessages();
    renderAttachments();

    clearDraft();

    if (el.messageInput) {
      el.messageInput.value = "";
      autoResizeInput();
      el.messageInput.focus();
    }

    openPanel("chat");

    toast(
      "Yeni sohbet hazır.",
      "success"
    );
  }

  /* =========================================================
     SLASH COMMAND
     ========================================================= */

  async function handleSlashCommand(message) {
    const textValue =
      safeText(message).trim();

    if (!textValue.startsWith("/")) {
      return false;
    }

    const parts =
      textValue.split(/\s+/);

    const command =
      parts[0]
        .toLocaleLowerCase("tr-TR");

    const argument =
      parts.slice(1).join(" ");

    switch (command) {
      case "/yeni":
      case "/new":
        createNewChat();
        return true;

      case "/araştır":
      case "/arastir":
      case "/research":
        openPanel("research");

        if (
          argument &&
          el.researchInput
        ) {
          el.researchInput.value =
            argument;
        }

        return true;

      case "/hava":
      case "/weather":
        openPanel("weather");

        if (
          argument &&
          el.weatherInput
        ) {
          el.weatherInput.value =
            argument;
        }

        return true;

      case "/hafıza":
      case "/hafiza":
      case "/memory":
        openPanel("memory");

        if (
          argument &&
          el.memoryInput
        ) {
          el.memoryInput.value =
            argument;
        }

        return true;

      case "/dosya":
      case "/files":
        openPanel("files");
        return true;

      case "/ayar":
      case "/ayarlar":
      case "/settings":
        openModal("settingsModal");
        return true;

      case "/hesap":
      case "/account":
        openModal("accountModal");
        return true;

      case "/sistem":
      case "/system":
        openPanel("system");
        return true;

      case "/yardım":
      case "/yardim":
      case "/help":
        openModal("commandHelpModal");
        return true;

      case "/temizle":
      case "/clear":
        state.messages = [];
        renderMessages();
        return true;

      default:
        return false;
    }
  }

  /* =========================================================
     CHAT REQUEST
     ========================================================= */

  function setSendingUI(isSending) {
    if (el.sendButton) {
      el.sendButton.disabled = isSending;

      el.sendButton.innerHTML = isSending
        ? `
          <svg viewBox="0 0 24 24">
            <use href="#i-stop"></use>
          </svg>
        `
        : `
          <svg viewBox="0 0 24 24">
            <use href="#i-send"></use>
          </svg>
        `;
    }

    if (el.stopButton) {
      el.stopButton.classList.toggle(
        "hidden",
        !isSending
      );
    }
  }

  function showTyping() {
    el.typingIndicator?.classList.remove(
      "hidden"
    );
  }

  function hideTyping() {
    el.typingIndicator?.classList.add(
      "hidden"
    );
  }

  function buildChatPayload(message) {
    const recent =
      state.messages
        .slice(-14)
        .map((item) => ({
          role: item.role,
          content: item.content
        }));

    return {
      message,
      text: message,

      model: state.selectedModel,
      mode: "chat",

      conversationId:
        state.conversationId,

      conversation_id:
        state.conversationId,

      messages: recent,

      attachments:
        state.attachments.map(
          (item) => ({
            id: item.id,
            name: item.name,
            type: item.type,
            size: item.size,
            url: item.url || null
          })
        ),

      options: {
        freshInfo:
          !!state.settings.freshInfo,

        autoResearch:
          !!state.settings.freshInfo,

        memory: true
      }
    };
  }

  async function requestChat(message) {
    const payload =
      buildChatPayload(message);

    let result = null;

    try {
      result = await apiRequest(
        CONFIG.endpoints.chatSmart,
        {
          method: "POST",
          body: payload,
          signal:
            state.abortController?.signal
        }
      );

      return result;
    } catch (error) {
      if (
        error?.name === "AbortError"
      ) {
        throw error;
      }

      if (
        error?.status !== 404 &&
        error?.status !== 405
      ) {
        /*
          Smart endpoint mevcut ama hata verdi.
          Normal chat'i yine deneyelim.
        */
      }
    }

    result = await apiRequest(
      CONFIG.endpoints.chat,
      {
        method: "POST",
        body: payload,
        signal:
          state.abortController?.signal
      }
    );

    return result;
  }

  async function researchThenChat(
    originalQuestion,
    firstAnswer
  ) {
    if (!state.settings.freshInfo) {
      return firstAnswer;
    }

    if (
      !isLocalFailureAnswer(firstAnswer)
    ) {
      return firstAnswer;
    }

    let researchData;

    try {
      researchData = await apiRequest(
        CONFIG.endpoints.research,
        {
          method: "POST",
          body: {
            query: originalQuestion,
            question: originalQuestion,
            mode: "answer",
            language: "tr"
          },
          signal:
            state.abortController?.signal
        }
      );
    } catch {
      return firstAnswer;
    }

    const researchText =
      extractResearchText(researchData);

    if (!researchText) {
      return firstAnswer;
    }

    const enrichedMessage = `
Aşağıdaki araştırma verisini kullanarak
kullanıcı sorusuna Türkçe ve doğrudan cevap ver.

Kullanıcı sorusu:
${originalQuestion}

Araştırma verisi:
${researchText}

Kurallar:
- Araştırma verisini temel al.
- Bilgi uydurma.
- Gereksiz şekilde "araştırma yapıldı" deme.
- Kullanıcının sorusuna doğrudan cevap ver.
`;

    const result =
      await apiRequest(
        CONFIG.endpoints.chat,
        {
          method: "POST",
          body: buildChatPayload(
            enrichedMessage
          ),
          signal:
            state.abortController?.signal
        }
      );

    const finalAnswer =
      extractAnswer(result);

    return finalAnswer || firstAnswer;
  }

  async function sendMessage() {
    if (state.sending) return;
    if (!el.messageInput) return;

    const message =
      el.messageInput.value.trim();

    if (!message) return;

    const slashHandled =
      await handleSlashCommand(message);

    if (slashHandled) {
      el.messageInput.value = "";
      autoResizeInput();
      clearDraft();
      return;
    }

    state.sending = true;
    state.loading = true;

    state.abortController =
      new AbortController();

    const originalText = message;

    setSendingUI(true);
    showTyping();

    el.welcomeState?.classList.add(
      "hidden"
    );

    appendMessage(
      "user",
      originalText
    );

    renderMessages();

    try {
      const result =
        await requestChat(
          originalText
        );

      let answer =
        extractAnswer(result);

      answer =
        await researchThenChat(
          originalText,
          answer
        );

      if (
        !answer ||
        isLocalFailureAnswer(answer)
      ) {
        throw new Error(
          "TürkAI bu soruya şu anda kullanılabilir bir yanıt üretemedi."
        );
      }

      const conversationId =
        extractConversationId(result);

      if (conversationId) {
        state.conversationId =
          conversationId;
      }

      appendMessage(
        "assistant",
        answer,
        {
          model:
            result?.model ||
            result?.data?.model ||
            state.selectedModel
        }
      );

      renderMessages();

      /*
        Mesaj ancak başarıyla geldikten sonra temizlenir.
        Böylece hata olduğunda kullanıcı yazdığını kaybetmez.
      */
      el.messageInput.value = "";
      autoResizeInput();
      clearDraft();

      updateComposerInfo();

      saveCurrentChat();

      if (
        state.settings.autoSpeak
      ) {
        speakText(answer);
      }
    } catch (error) {
      if (
        error?.name === "AbortError"
      ) {
        /*
          Kullanıcı durdurduysa yazıyı geri
          komut kutusuna al.
        */
        el.messageInput.value =
          originalText;

        autoResizeInput();
        saveDraft();

        toast(
          "Yanıt oluşturma durduruldu.",
          "warning"
        );

        return;
      }

      el.messageInput.value =
        originalText;

      autoResizeInput();
      saveDraft();

      toast(
        error?.message ||
          "Mesaj gönderilemedi.",
        "error",
        5000
      );

      console.error(
        "[TürkAI] Chat error:",
        error
      );
    } finally {
      state.sending = false;
      state.loading = false;

      hideTyping();
      setSendingUI(false);

      state.abortController = null;

      updateComposerInfo();

      if (
        document.visibilityState ===
        "visible"
      ) {
        el.messageInput?.focus();
      }
    }
  }

  function stopGeneration() {
    if (
      state.abortController
    ) {
      try {
        state.abortController.abort();
      } catch {}
    }

    state.sending = false;
    state.loading = false;

    hideTyping();
    setSendingUI(false);

    toast(
      "Yanıt üretimi durduruldu.",
      "warning"
    );
  }

  function updateComposerInfo() {
    if (!el.composerTokenInfo) return;

    const chars =
      el.messageInput?.value.length || 0;

    el.composerTokenInfo.textContent =
      `${chars.toLocaleString("tr-TR")} karakter`;
  }

  /* =========================================================
     SES
     ========================================================= */

  function speakText(textValue) {
    const textToSpeak =
      safeText(textValue).trim();

    if (
      !textToSpeak ||
      !("speechSynthesis" in window)
    ) {
      toast(
        "Bu cihazda sesli okuma desteklenmiyor.",
        "warning"
      );
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance =
        new SpeechSynthesisUtterance(
          textToSpeak
        );

      utterance.lang = "tr-TR";
      utterance.rate = 0.95;
      utterance.pitch = 1;

      utterance.onstart = () => {
        state.speaking = true;
      };

      utterance.onend = () => {
        state.speaking = false;
      };

      utterance.onerror = () => {
        state.speaking = false;
      };

      state.synthUtterance =
        utterance;

      window.speechSynthesis.speak(
        utterance
      );
    } catch (error) {
      console.error(
        "[TürkAI] TTS error:",
        error
      );
    }
  }

  function stopSpeaking() {
    if (
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }

    state.speaking = false;
  }

  function initSpeechRecognition() {
    const Recognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!Recognition) {
      return null;
    }

    const recognition =
      new Recognition();

    recognition.lang = "tr-TR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      state.recording = true;

      el.voiceButton?.classList.add(
        "active"
      );

      showVoiceStatus(
        "Dinliyorum",
        "Konuşabilirsiniz..."
      );
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        transcript +=
          event.results[i][0].transcript;
      }

      transcript =
        transcript.trim();

      if (transcript && el.messageInput) {
        el.messageInput.value =
          transcript;

        autoResizeInput();
        updateComposerInfo();
      }
    };

    recognition.onerror = (event) => {
      state.recording = false;

      el.voiceButton?.classList.remove(
        "active"
      );

      hideVoiceStatus();

      if (
        event?.error ===
          "not-allowed"
      ) {
        toast(
          "Mikrofon izni verilmedi.",
          "error"
        );
      } else if (
        event?.error !== "aborted"
      ) {
        toast(
          "Ses algılama başarısız oldu.",
          "error"
        );
      }
    };

    recognition.onend = () => {
      state.recording = false;

      el.voiceButton?.classList.remove(
        "active"
      );

      hideVoiceStatus();
    };

    return recognition;
  }

  function showVoiceStatus(
    title,
    message
  ) {
    if (!el.voiceStatus) return;

    el.voiceStatus.classList.remove(
      "hidden"
    );

    if (el.voiceStatusTitle) {
      el.voiceStatusTitle.textContent =
        title;
    }

    if (el.voiceStatusText) {
      el.voiceStatusText.textContent =
        message;
    }
  }

  function hideVoiceStatus() {
    el.voiceStatus?.classList.add(
      "hidden"
    );
  }

  function startVoiceInput() {
    if (!state.recognition) {
      state.recognition =
        initSpeechRecognition();
    }

    if (!state.recognition) {
      toast(
        "Tarayıcınız sesli giriş özelliğini desteklemiyor.",
        "warning"
      );
      return;
    }

    try {
      state.recognition.start();
    } catch {
      stopVoiceInput();
    }
  }

  function stopVoiceInput() {
    try {
      state.recognition?.stop();
    } catch {}

    state.recording = false;
    el.voiceButton?.classList.remove(
      "active"
    );

    hideVoiceStatus();
  }

  function toggleVoiceInput() {
    if (state.recording) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  }

  /* =========================================================
     ARAŞTIRMA
     ========================================================= */

  function extractResearchText(data) {
    if (!data) return "";

    if (typeof data === "string") {
      return data.trim();
    }

    const parts = [];

    const answer =
      extractAnswer(data);

    if (answer) {
      parts.push(answer);
    }

    const candidates = [
      data.summary,
      data.description,
      data.text,
      data.content,
      data.result?.summary,
      data.data?.summary
    ];

    candidates.forEach((item) => {
      if (
        typeof item === "string" &&
        item.trim() &&
        !parts.includes(item.trim())
      ) {
        parts.push(item.trim());
      }
    });

    const sources =
      data.sources ||
      data.results ||
      data.data?.sources ||
      data.data?.results;

    if (Array.isArray(sources)) {
      sources
        .slice(0, 8)
        .forEach((item) => {
          const title =
            item?.title ||
            item?.name ||
            "";

          const snippet =
            item?.snippet ||
            item?.description ||
            item?.summary ||
            "";

          const url =
            item?.url ||
            item?.link ||
            "";

          const line = [
            title,
            snippet,
            url
          ]
            .filter(Boolean)
            .join(" — ");

          if (line) parts.push(line);
        });
    }

    return parts.join("\n\n").trim();
  }

  async function runResearch() {
    const query =
      el.researchInput?.value.trim();

    if (!query) {
      toast(
        "Araştırmak için bir konu yaz.",
        "warning"
      );
      return;
    }

    if (el.researchRunButton) {
      el.researchRunButton.disabled = true;
    }

    if (el.researchStatus) {
      el.researchStatus.textContent =
        "Araştırılıyor...";
    }

    showLoading(
      "Araştırma yapılıyor",
      query
    );

    try {
      const data =
        await apiRequest(
          CONFIG.endpoints.research,
          {
            method: "POST",
            body: {
              query,
              question: query,
              language: "tr",
              mode: "research"
            }
          }
        );

      state.researchResults = data;

      renderResearch(data);

      if (el.researchStatus) {
        el.researchStatus.textContent =
          "Araştırma tamamlandı.";
      }
    } catch (error) {
      if (el.researchStatus) {
        el.researchStatus.textContent =
          "Araştırma başarısız.";
      }

      renderResearchError(error);

      toast(
        error?.message ||
          "Araştırma yapılamadı.",
        "error"
      );
    } finally {
      hideLoading();

      if (el.researchRunButton) {
        el.researchRunButton.disabled = false;
      }
    }
  }

  function renderResearch(data) {
    if (!el.researchResults) return;

    const answer =
      extractAnswer(data);

    const sources =
      data?.sources ||
      data?.results ||
      data?.data?.sources ||
      data?.data?.results ||
      [];

    let html = "";

    if (answer) {
      html += `
        <div class="result-card">
          <div class="result-card-title">
            Sonuç
          </div>
          <div class="result-card-text">
            ${renderRichText(answer)}
          </div>
        </div>
      `;
    }

    if (
      Array.isArray(sources) &&
      sources.length
    ) {
      html += `
        <div class="result-list">
          ${sources
            .slice(0, 20)
            .map((item) => {
              const title =
                item?.title ||
                item?.name ||
                "Kaynak";

              const desc =
                item?.snippet ||
                item?.description ||
                item?.summary ||
                "";

              const url =
                item?.url ||
                item?.link ||
                "";

              return `
                <article class="result-card">
                  <div class="result-card-title">
                    ${escapeHTML(title)}
                  </div>

                  ${
                    desc
                      ? `
                        <div class="result-card-text">
                          ${escapeHTML(desc)}
                        </div>
                      `
                      : ""
                  }

                  ${
                    url
                      ? `
                        <a
                          href="${escapeHTML(url)}"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="result-link"
                        >
                          Kaynağı aç
                        </a>
                      `
                      : ""
                  }
                </article>
              `;
            })
            .join("")}
        </div>
      `;
    }

    if (!html) {
      html = `
        <div class="empty-state">
          Araştırma sonucu bulunamadı.
        </div>
      `;
    }

    el.researchResults.innerHTML = html;
  }

  function renderResearchError(error) {
    if (!el.researchResults) return;

    el.researchResults.innerHTML = `
      <div class="empty-state">
        <strong>Araştırma başarısız.</strong>
        <div>
          ${escapeHTML(
            error?.message ||
              "Bilinmeyen hata."
          )}
        </div>
      </div>
    `;
  }

  async function loadResearchPanel() {
    if (el.researchStatus) {
      el.researchStatus.textContent =
        "Hazır.";
    }
  }

  /* =========================================================
     WEATHER
     ========================================================= */

  async function runWeather() {
    const location =
      el.weatherInput?.value.trim();

    if (!location) {
      toast(
        "Şehir yaz.",
        "warning"
      );
      return;
    }

    if (el.weatherRunButton) {
      el.weatherRunButton.disabled = true;
    }

    showLoading(
      "Hava durumu",
      location
    );

    try {
      const data =
        await apiRequest(
          CONFIG.endpoints.weather,
          {
            method: "POST",
            body: {
              city: location,
              location,
              query: location,
              language: "tr"
            }
          }
        );

      state.weatherData = data;
      renderWeather(data);
    } catch (error) {
      renderWeatherError(error);

      toast(
        error?.message ||
          "Hava durumu alınamadı.",
        "error"
      );
    } finally {
      hideLoading();

      if (el.weatherRunButton) {
        el.weatherRunButton.disabled =
          false;
      }
    }
  }

  function renderWeather(data) {
    if (!el.weatherResults) return;

    const current =
      data?.current ||
      data?.data?.current ||
      data?.result?.current ||
      data;

    const location =
      data?.location?.name ||
      data?.city ||
      current?.city ||
      el.weatherInput?.value ||
      "Konum";

    const temperature =
      current?.temperature ??
      current?.temp ??
      data?.temperature ??
      data?.temp ??
      "--";

    const condition =
      current?.condition ||
      current?.description ||
      data?.condition ||
      "Bilgi yok";

    const humidity =
      current?.humidity ??
      data?.humidity ??
      "--";

    const wind =
      current?.wind ??
      current?.windSpeed ??
      data?.wind ??
      "--";

    el.weatherResults.innerHTML = `
      <div class="weather-card result-card">
        <div class="result-card-title">
          ${escapeHTML(location)}
        </div>

        <div class="weather-main-value">
          ${escapeHTML(temperature)}°
        </div>

        <div class="result-card-text">
          ${escapeHTML(condition)}
        </div>

        <div class="weather-details">
          <div>
            <span>Nem</span>
            <strong>
              ${escapeHTML(humidity)}%
            </strong>
          </div>

          <div>
            <span>Rüzgar</span>
            <strong>
              ${escapeHTML(wind)}
            </strong>
          </div>
        </div>
      </div>
    `;
  }

  function renderWeatherError(error) {
    if (!el.weatherResults) return;

    el.weatherResults.innerHTML = `
      <div class="empty-state">
        Hava durumu alınamadı.
        <div>
          ${escapeHTML(
            error?.message || ""
          )}
        </div>
      </div>
    `;
  }

  /* =========================================================
     HAFIZA
     ========================================================= */

  async function searchMemory() {
    const query =
      el.memoryInput?.value.trim();

    if (!query) {
      await loadMemoryOverview();
      return;
    }

    if (el.memorySearchButton) {
      el.memorySearchButton.disabled =
        true;
    }

    showLoading(
      "Hafıza aranıyor",
      query
    );

    try {
      const data =
        await apiRequest(
          CONFIG.endpoints.memorySearch,
          {
            method: "POST",
            body: {
              query,
              q: query,
              text: query
            }
          }
        );

      state.memoryResults =
        Array.isArray(data)
          ? data
          : data?.results ||
            data?.data ||
            data?.items ||
            [];

      renderMemoryResults(
        state.memoryResults
      );
    } catch (error) {
      toast(
        error?.message ||
          "Hafıza aranamadı.",
        "error"
      );
    } finally {
      hideLoading();

      if (el.memorySearchButton) {
        el.memorySearchButton.disabled =
          false;
      }
    }
  }

  async function loadMemoryOverview() {
    if (!el.memoryStats) return;

    const data =
      await safeRequest(
        CONFIG.endpoints.memorySearch,
        {
          method: "POST",
          body: {
            query: "*",
            q: "*",
            overview: true
          }
        },
        null
      );

    if (!data) {
      el.memoryStats.innerHTML = `
        <div class="empty-state">
          Hafıza özeti alınamadı.
        </div>
      `;

      return;
    }

    const list =
      Array.isArray(data)
        ? data
        : data?.results ||
          data?.data ||
          data?.items ||
          [];

    state.memoryResults = list;

    const count =
      data?.count ??
      data?.total ??
      data?.stats?.count ??
      list.length;

    el.memoryStats.innerHTML = `
      <div class="memory-stat-card">
        <span>Toplam kayıt</span>
        <strong>
          ${escapeHTML(count)}
        </strong>
      </div>
    `;

    renderMemoryResults(list);
  }

  function renderMemoryResults(list) {
    if (!el.memoryResults) return;

    if (
      !Array.isArray(list) ||
      !list.length
    ) {
      el.memoryResults.innerHTML = `
        <div class="empty-state">
          Hafızada sonuç bulunamadı.
        </div>
      `;
      return;
    }

    el.memoryResults.innerHTML =
      list
        .slice(0, 50)
        .map((item) => {
          const title =
            item?.title ||
            item?.question ||
            item?.key ||
            "Hafıza kaydı";

          const content =
            item?.answer ||
            item?.content ||
            item?.value ||
            item?.text ||
            "";

          const category =
            item?.category ||
            item?.type ||
            "memory";

          return `
            <article class="result-card">
              <div class="result-card-title">
                ${escapeHTML(title)}
              </div>

              <div class="result-card-text">
                ${renderRichText(content)}
              </div>

              <div class="result-card-meta">
                ${escapeHTML(category)}
              </div>
            </article>
          `;
        })
        .join("");
  }

  async function saveMemory(
    content,
    type = "chat"
  ) {
    const value =
      safeText(content).trim();

    if (!value) return false;

    try {
      await apiRequest(
        CONFIG.endpoints.memorySave,
        {
          method: "POST",
          body: {
            content: value,
            text: value,
            answer: value,
            type
          }
        }
      );

      toast(
        "Hafızaya kaydedildi.",
        "success"
      );

      return true;
    } catch (error) {
      toast(
        error?.message ||
          "Hafızaya kaydedilemedi.",
        "error"
      );

      return false;
    }
  }

  async function saveCurrentConversationToMemory() {
    if (!state.messages.length) {
      toast(
        "Kaydedilecek sohbet yok.",
        "warning"
      );
      return;
    }

    const transcript =
      state.messages
        .map(
          (item) =>
            `${item.role === "user" ? "Kullanıcı" : "TürkAI"}: ${item.content}`
        )
        .join("\n\n");

    await saveMemory(
      transcript,
      "conversation"
    );
  }
/* =========================================================
   TÜRKAI FRONTEND 41.0 — PART 2/2
   Paneller, dosya, hafıza, araştırma, hesap, medya,
   bildirimler, sistem, admin, kısayollar ve başlangıç
   ========================================================= */

(() => {
  "use strict";

  if (window.__TURKAI_APP_PART2__) return;
  window.__TURKAI_APP_PART2__ = true;

  const T = window.TURKAI;

  if (!T) {
    console.error(
      "[TürkAI] PART 1 yüklenmeden PART 2 başlatılamadı."
    );
    return;
  }

  const state = T.state;
  const config = T.config;

  const $ = (id) => document.getElementById(id);

  const E = {
    researchInput: $("researchInput"),
    researchRunButton: $("researchRunButton"),
    researchClearButton: $("researchClearButton"),
    researchStatus: $("researchStatus"),
    researchResults: $("researchResults"),

    weatherInput: $("weatherInput"),
    weatherRunButton: $("weatherRunButton"),
    weatherResults: $("weatherResults"),

    memoryInput: $("memoryInput"),
    memorySearchButton: $("memorySearchButton"),
    memorySaveCurrentButton: $("memorySaveCurrentButton"),
    memoryOverviewButton: $("memoryOverviewButton"),
    memoryStats: $("memoryStats"),
    memoryResults: $("memoryResults"),

    fileDropZone: $("fileDropZone"),
    fileSelectButton: $("fileSelectButton"),
    refreshFilesButton: $("refreshFilesButton"),
    globalFilePicker: $("globalFilePicker"),
    fileCount: $("fileCount"),
    fileList: $("fileList"),
    attachmentPreview: $("attachmentPreview"),

    mediaPanel: $("mediaPanel"),
    openImageModalButton: $("openImageModalButton"),
    openVideoModalButton: $("openVideoModalButton"),

    imageCreateModal: $("imageCreateModal"),
    imagePromptInput: $("imagePromptInput"),
    imageSizeSelect: $("imageSizeSelect"),
    imageQualitySelect: $("imageQualitySelect"),
    generateImageButton: $("generateImageButton"),
    imageResult: $("imageResult"),

    videoModal: $("videoModal"),
    videoPromptInput: $("videoPromptInput"),
    videoDurationSelect: $("videoDurationSelect"),
    generateVideoButton: $("generateVideoButton"),
    videoResult: $("videoResult"),

    plansList: $("plansList"),

    notificationPanel: $("notificationPanel"),
    notificationList: $("notificationList"),
    notificationSummary: $("notificationSummary"),
    notificationBadge: $("notificationBadge"),
    markNotificationsReadButton: $("markNotificationsReadButton"),

    systemOverallStatus: $("systemOverallStatus"),
    systemStats: $("systemStats"),
    refreshSystemButton: $("refreshSystemButton"),
    systemDetailContent: $("systemDetailContent"),

    accountModal: $("accountModal"),
    accountModalName: $("accountModalName"),
    accountModalEmail: $("accountModalEmail"),
    accountModalVerified: $("accountModalVerified"),
    accountModalPlan: $("accountModalPlan"),
    accountModalUsage: $("accountModalUsage"),
    accountModalStatus: $("accountModalStatus"),

    authModal: $("authModal"),
    authForm: $("authForm"),
    authIdentifier: $("authIdentifier"),
    authPassword: $("authPassword"),
    authMessage: $("authMessage"),
    loginButton: $("loginButton"),
    logoutButton: $("logoutButton"),
    guestLoginButton: $("guestLoginButton"),
    accountPlansButton: $("accountPlansButton"),

    accountName: $("accountName"),
    accountPlan: $("accountPlan"),
    accountStatusDot: $("accountStatusDot"),

    chatSearchPanel: $("chatSearchPanel"),
    chatSearchInput: $("chatSearchInput"),
    chatSearchResults: $("chatSearchResults"),

    commandCenter: $("commandCenter"),
    commandInput: $("commandInput"),
    commandList: $("commandList"),

    settingsModal: $("settingsModal"),
    enterSendToggle: $("enterSendToggle"),
    draftSaveToggle: $("draftSaveToggle"),
    autoSpeakToggle: $("autoSpeakToggle"),
    freshInfoToggle: $("freshInfoToggle"),
    saveSettingsButton: $("saveSettingsButton"),
    resetSettingsButton: $("resetSettingsButton"),

    voiceStatus: $("voiceStatus"),
    voiceStatusTitle: $("voiceStatusTitle"),
    voiceStatusText: $("voiceStatusText"),
    voiceCancelButton: $("voiceCancelButton"),

    uploadStatusBar: $("uploadStatusBar"),
    uploadStatusTitle: $("uploadStatusTitle"),
    uploadStatusText: $("uploadStatusText"),
    uploadProgressBar: $("uploadProgressBar"),

    dropOverlay: $("dropOverlay"),

    adminPanel: $("adminPanel"),
    adminUnlockModal: $("adminUnlockModal"),
    adminUnlockForm: $("adminUnlockForm"),
    adminUnlockInput: $("adminUnlockInput"),
    adminUnlockMessage: $("adminUnlockMessage"),
    adminSystemButton: $("adminSystemButton"),
    adminUsersButton: $("adminUsersButton"),
    adminMemoryButton: $("adminMemoryButton"),
    adminLogsButton: $("adminLogsButton"),
    adminOutput: $("adminOutput")
  };

  /* =========================================================
     YARDIMCILAR
     ========================================================= */

  function text(value, fallback = "") {
    if (value === null || value === undefined) {
      return fallback;
    }

    return String(value);
  }

  function esc(value) {
    return text(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function bytes(value) {
    const n = Number(value) || 0;

    if (n < 1024) {
      return `${n} B`;
    }

    if (n < 1024 * 1024) {
      return `${(n / 1024).toFixed(1)} KB`;
    }

    if (n < 1024 * 1024 * 1024) {
      return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function dateText(value) {
    try {
      return new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(value));
    } catch {
      return text(value);
    }
  }

  async function request(url, options = {}, timeout) {
    return T.apiRequest(
      url,
      options,
      timeout || config.timeout
    );
  }

  function safeArray(data, keys = []) {
    if (Array.isArray(data)) {
      return data;
    }

    for (const key of keys) {
      if (Array.isArray(data?.[key])) {
        return data[key];
      }
    }

    return [];
  }

  function answerFrom(data) {
    if (!data) return "";

    if (typeof data === "string") {
      return data.trim();
    }

    return (
      data.answer ||
      data.response ||
      data.message ||
      data.text ||
      data.content ||
      data.result?.answer ||
      data.result?.response ||
      data.result?.text ||
      data.data?.answer ||
      data.data?.response ||
      data.data?.text ||
      data.data?.content ||
      ""
    );
  }

  function resultUrl(data, type) {
    if (!data) return "";

    if (type === "image") {
      return (
        data.url ||
        data.imageUrl ||
        data.image_url ||
        data.data?.url ||
        data.data?.imageUrl ||
        data.result?.url ||
        ""
      );
    }

    return (
      data.url ||
      data.videoUrl ||
      data.video_url ||
      data.data?.url ||
      data.data?.videoUrl ||
      data.result?.url ||
      ""
    );
  }

  function setLoadingButton(button, loading, label) {
    if (!button) return;

    button.disabled = loading;

    if (loading) {
      button.dataset.originalText =
        button.textContent;
      button.textContent =
        label || "Bekleyin...";
    } else if (
      button.dataset.originalText
    ) {
      button.textContent =
        button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }

  /* =========================================================
     ARAŞTIRMA
     ========================================================= */

  async function runResearch() {
    const query =
      E.researchInput?.value.trim();

    if (!query) {
      T.toast(
        "Araştırmak için bir konu yaz.",
        "warning"
      );
      return;
    }

    setLoadingButton(
      E.researchRunButton,
      true,
      "Araştırılıyor..."
    );

    if (E.researchStatus) {
      E.researchStatus.textContent =
        "Araştırma motoru çalışıyor...";
    }

    if (E.researchResults) {
      E.researchResults.innerHTML = `
        <div class="empty-state">
          <strong>Araştırma yapılıyor</strong>
          <div>
            ${esc(query)}
          </div>
        </div>
      `;
    }

    try {
      const data = await request(
        config.endpoints.research,
        {
          method: "POST",
          body: {
            query,
            question: query,
            text: query,
            language: "tr",
            mode: "research"
          }
        }
      );

      renderResearch(data);

      if (E.researchStatus) {
        E.researchStatus.textContent =
          "Araştırma tamamlandı.";
      }

      T.toast(
        "Araştırma tamamlandı.",
        "success"
      );
    } catch (error) {
      if (E.researchStatus) {
        E.researchStatus.textContent =
          "Araştırma başarısız.";
      }

      if (E.researchResults) {
        E.researchResults.innerHTML = `
          <div class="empty-state">
            <strong>Araştırma yapılamadı.</strong>
            <div>
              ${esc(
                error?.message ||
                "Bilinmeyen hata."
              )}
            </div>
          </div>
        `;
      }

      T.toast(
        error?.message ||
        "Araştırma yapılamadı.",
        "error"
      );
    } finally {
      setLoadingButton(
        E.researchRunButton,
        false
      );
    }
  }

  function renderResearch(data) {
    if (!E.researchResults) return;

    const answer =
      answerFrom(data);

    const sources = safeArray(
      data,
      [
        "sources",
        "results",
        "items",
        "data",
        "result"
      ]
    );

    let output = "";

    if (answer) {
      output += `
        <article class="result-card">
          <div class="result-card-title">
            Sonuç
          </div>
          <div class="result-card-text">
            ${T.renderRichText(answer)}
          </div>
        </article>
      `;
    }

    if (sources.length) {
      output += `
        <div class="result-list">
          ${sources
            .slice(0, 30)
            .map((source) => {
              const title =
                source?.title ||
                source?.name ||
                "Kaynak";

              const snippet =
                source?.snippet ||
                source?.description ||
                source?.summary ||
                source?.content ||
                "";

              const url =
                source?.url ||
                source?.link ||
                "";

              return `
                <article class="result-card">
                  <div class="result-card-title">
                    ${esc(title)}
                  </div>

                  ${
                    snippet
                      ? `
                        <div class="result-card-text">
                          ${esc(snippet)}
                        </div>
                      `
                      : ""
                  }

                  ${
                    url
                      ? `
                        <a
                          class="result-link"
                          href="${esc(url)}"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Kaynağı aç
                        </a>
                      `
                      : ""
                  }
                </article>
              `;
            })
            .join("")}
        </div>
      `;
    }

    if (!output) {
      output = `
        <div class="empty-state">
          Araştırma sonucu bulunamadı.
        </div>
      `;
    }

    E.researchResults.innerHTML =
      output;
  }

  async function loadResearchPanel() {
    if (E.researchStatus) {
      E.researchStatus.textContent =
        "Hazır.";
    }
  }

  /* =========================================================
     HAVA DURUMU
     ========================================================= */

  async function runWeather() {
    const location =
      E.weatherInput?.value.trim();

    if (!location) {
      T.toast(
        "Şehir veya konum yaz.",
        "warning"
      );
      return;
    }

    setLoadingButton(
      E.weatherRunButton,
      true,
      "Alınıyor..."
    );

    try {
      const data = await request(
        config.endpoints.weather,
        {
          method: "POST",
          body: {
            city: location,
            location,
            query: location,
            language: "tr"
          }
        }
      );

      state.weatherData = data;

      renderWeather(data);
    } catch (error) {
      if (E.weatherResults) {
        E.weatherResults.innerHTML = `
          <div class="empty-state">
            <strong>Hava durumu alınamadı.</strong>
            <div>
              ${esc(
                error?.message || ""
              )}
            </div>
          </div>
        `;
      }

      T.toast(
        error?.message ||
        "Hava durumu alınamadı.",
        "error"
      );
    } finally {
      setLoadingButton(
        E.weatherRunButton,
        false
      );
    }
  }

  function renderWeather(data) {
    if (!E.weatherResults) return;

    const current =
      data?.current ||
      data?.data?.current ||
      data?.result?.current ||
      data;

    const location =
      data?.location?.name ||
      data?.location ||
      data?.city ||
      current?.city ||
      E.weatherInput?.value ||
      "Konum";

    const temperature =
      current?.temperature ??
      current?.temp ??
      data?.temperature ??
      data?.temp ??
      "--";

    const feelsLike =
      current?.feelsLike ??
      current?.feels_like ??
      data?.feelsLike ??
      "--";

    const condition =
      current?.condition ||
      current?.description ||
      data?.condition ||
      data?.description ||
      "Bilgi yok";

    const humidity =
      current?.humidity ??
      data?.humidity ??
      "--";

    const wind =
      current?.windSpeed ??
      current?.wind ??
      data?.windSpeed ??
      data?.wind ??
      "--";

    E.weatherResults.innerHTML = `
      <article class="result-card weather-card">
        <div class="result-card-title">
          ${esc(location)}
        </div>

        <div class="weather-main-value">
          ${esc(temperature)}°
        </div>

        <div class="result-card-text">
          ${esc(condition)}
        </div>

        <div class="weather-details">
          <div>
            <span>Hissedilen</span>
            <strong>
              ${esc(feelsLike)}°
            </strong>
          </div>

          <div>
            <span>Nem</span>
            <strong>
              ${esc(humidity)}%
            </strong>
          </div>

          <div>
            <span>Rüzgar</span>
            <strong>
              ${esc(wind)}
            </strong>
          </div>
        </div>
      </article>
    `;
  }

  /* =========================================================
     HAFIZA
     ========================================================= */

  async function searchMemory() {
    const query =
      E.memoryInput?.value.trim();

    if (!query) {
      await loadMemoryOverview();
      return;
    }

    setLoadingButton(
      E.memorySearchButton,
      true,
      "Aranıyor..."
    );

    try {
      const data = await request(
        config.endpoints.memorySearch,
        {
          method: "POST",
          body: {
            query,
            q: query,
            text: query
          }
        }
      );

      const list = safeArray(
        data,
        [
          "results",
          "items",
          "data",
          "memories"
        ]
      );

      state.memoryResults = list;

      renderMemoryResults(list);
    } catch (error) {
      if (E.memoryResults) {
        E.memoryResults.innerHTML = `
          <div class="empty-state">
            ${esc(
              error?.message ||
              "Hafıza aranamadı."
            )}
          </div>
        `;
      }

      T.toast(
        error?.message ||
        "Hafıza aranamadı.",
        "error"
      );
    } finally {
      setLoadingButton(
        E.memorySearchButton,
        false
      );
    }
  }

  async function loadMemoryOverview() {
    try {
      const data = await request(
        config.endpoints.memorySearch,
        {
          method: "POST",
          body: {
            query: "*",
            q: "*",
            overview: true
          }
        }
      );

      const list = safeArray(
        data,
        [
          "results",
          "items",
          "data",
          "memories"
        ]
      );

      state.memoryResults = list;

      const total =
        data?.total ??
        data?.count ??
        data?.stats?.count ??
        list.length;

      if (E.memoryStats) {
        E.memoryStats.innerHTML = `
          <div class="memory-stat-card">
            <span>Toplam kayıt</span>
            <strong>
              ${esc(total)}
            </strong>
          </div>
        `;
      }

      renderMemoryResults(list);
    } catch {
      if (E.memoryStats) {
        E.memoryStats.innerHTML = `
          <div class="empty-state">
            Hafıza özeti alınamadı.
          </div>
        `;
      }
    }
  }

  function renderMemoryResults(list) {
    if (!E.memoryResults) return;

    if (
      !Array.isArray(list) ||
      list.length === 0
    ) {
      E.memoryResults.innerHTML = `
        <div class="empty-state">
          Hafızada sonuç bulunamadı.
        </div>
      `;
      return;
    }

    E.memoryResults.innerHTML =
      list
        .slice(0, 100)
        .map((item) => {
          const title =
            item?.title ||
            item?.question ||
            item?.key ||
            "Hafıza kaydı";

          const content =
            item?.answer ||
            item?.content ||
            item?.value ||
            item?.text ||
            "";

          const category =
            item?.category ||
            item?.type ||
            "memory";

          return `
            <article class="result-card">
              <div class="result-card-title">
                ${esc(title)}
              </div>

              <div class="result-card-text">
                ${T.renderRichText(content)}
              </div>

              <div class="result-card-meta">
                ${esc(category)}
              </div>
            </article>
          `;
        })
        .join("");
  }

  async function saveMemory(content, type = "chat") {
    const value =
      text(content).trim();

    if (!value) {
      return false;
    }

    try {
      await request(
        config.endpoints.memorySave,
        {
          method: "POST",
          body: {
            content: value,
            text: value,
            answer: value,
            type
          }
        }
      );

      T.toast(
        "Hafızaya kaydedildi.",
        "success"
      );

      return true;
    } catch (error) {
      T.toast(
        error?.message ||
        "Hafızaya kaydedilemedi.",
        "error"
      );

      return false;
    }
  }

  async function saveCurrentConversation() {
    if (!state.messages.length) {
      T.toast(
        "Kaydedilecek sohbet yok.",
        "warning"
      );
      return;
    }

    const transcript =
      state.messages
        .map((message) => {
          const role =
            message.role === "user"
              ? "Kullanıcı"
              : "TürkAI";

          return `${role}: ${message.content}`;
        })
        .join("\n\n");

    await saveMemory(
      transcript,
      "conversation"
    );
  }

  /* =========================================================
     DOSYA MERKEZİ
     ========================================================= */

  function renderAttachments() {
    if (!E.attachmentPreview) {
      return;
    }

    if (!state.attachments.length) {
      E.attachmentPreview.innerHTML =
        "";
      E.attachmentPreview.classList.add(
        "hidden"
      );
      return;
    }

    E.attachmentPreview.classList.remove(
      "hidden"
    );

    E.attachmentPreview.innerHTML =
      state.attachments
        .map(
          (file, index) => `
            <div class="attachment-chip">
              <div class="attachment-chip-icon">
                <svg viewBox="0 0 24 24">
                  <use href="#i-file"></use>
                </svg>
              </div>

              <div class="attachment-chip-info">
                <strong>
                  ${esc(file.name)}
                </strong>

                <span>
                  ${bytes(file.size)}
                </span>
              </div>

              <button
                type="button"
                data-remove-file="${index}"
                title="Kaldır"
              >
                <svg viewBox="0 0 24 24">
                  <use href="#i-close"></use>
                </svg>
              </button>
            </div>
          `
        )
        .join("");

    E.attachmentPreview
      .querySelectorAll(
        "[data-remove-file]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            const index =
              Number(
                button.dataset
                  .removeFile
              );

            state.attachments.splice(
              index,
              1
            );

            renderAttachments();
          }
        );
      });
  }

  function showUploadProgress(
    title,
    message,
    progress
  ) {
    const bar = E.uploadStatusBar;

    if (!bar) return;

    bar.classList.remove(
      "hidden"
    );

    if (E.uploadStatusTitle) {
      E.uploadStatusTitle.textContent =
        title;
    }

    if (E.uploadStatusText) {
      E.uploadStatusText.textContent =
        message;
    }

    if (E.uploadProgressBar) {
      E.uploadProgressBar.style.width =
        `${Math.max(
          0,
          Math.min(100, progress)
        )}%`;
    }
  }

  function hideUploadProgress() {
    E.uploadStatusBar?.classList.add(
      "hidden"
    );
  }

  async function uploadFiles(fileList) {
    const files =
      Array.from(fileList || []);

    if (!files.length) return;

    const maxSize =
      1024 * 1024 * 1024;

    const validFiles = files.filter(
      (file) =>
        Number(file.size || 0) <=
        maxSize
    );

    if (!validFiles.length) {
      T.toast(
        "Seçilen dosyalar uygun değil.",
        "error"
      );
      return;
    }

    showUploadProgress(
      "Dosyalar hazırlanıyor",
      `${validFiles.length} dosya`,
      10
    );

    /*
      Önce local attachment:
      backend upload başarısız olsa bile
      kullanıcı seçtiği dosyayı kaybetmez.
    */
    const localItems =
      validFiles.map((file) => ({
        id:
          `${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`,

        name: file.name,
        type: file.type,
        size: file.size,
        file,
        localOnly: true
      }));

    state.attachments.push(
      ...localItems
    );

    renderAttachments();

    const form =
      new FormData();

    validFiles.forEach((file) => {
      form.append(
        "files",
        file,
        file.name
      );
    });

    form.append(
      "count",
      String(validFiles.length)
    );

    if (state.conversationId) {
      form.append(
        "conversationId",
        state.conversationId
      );
    }

    try {
      showUploadProgress(
        "Yükleniyor",
        "TürkAI sunucusuna aktarılıyor...",
        35
      );

      const data =
        await request(
          config.endpoints.filesUpload,
          {
            method: "POST",
            body: form
          }
        );

      const uploaded =
        safeArray(
          data,
          [
            "files",
            "results",
            "items",
            "data"
          ]
        );

      uploaded.forEach(
        (serverFile, index) => {
          const original =
            localItems[index];

          if (!original) return;

          const target =
            state.attachments.find(
              (file) =>
                file.id ===
                original.id
            );

          if (!target) return;

          Object.assign(
            target,
            serverFile,
            {
              localOnly: false,
              file: undefined
            }
          );
        }
      );

      showUploadProgress(
        "Tamamlandı",
        "Dosyalar hazır.",
        100
      );

      T.toast(
        `${validFiles.length} dosya eklendi.`,
        "success"
      );
    } catch (error) {
      /*
        Upload endpoint yoksa bile local attachment
        korunuyor. Chat payload dosya bilgisini taşıyor.
      */
      showUploadProgress(
        "Dosyalar eklendi",
        "Sohbete bağlandı.",
        100
      );

      T.toast(
        "Dosyalar sohbete eklendi.",
        "warning"
      );

      console.warn(
        "[TürkAI] upload warning:",
        error
      );
    }

    window.setTimeout(
      hideUploadProgress,
      800
    );

    if (E.globalFilePicker) {
      E.globalFilePicker.value =
        "";
    }
  }

  async function loadFiles() {
    if (!E.fileList) return;

    try {
      const data =
        await request(
          config.endpoints.files
        );

      state.files = safeArray(
        data,
        [
          "files",
          "results",
          "items",
          "data"
        ]
      );

      renderFiles(state.files);
    } catch {
      renderFiles([]);
    }
  }

  function renderFiles(list) {
    if (!E.fileList) return;

    const files =
      Array.isArray(list)
        ? list
        : [];

    if (E.fileCount) {
      E.fileCount.textContent =
        files.length.toLocaleString(
          "tr-TR"
        );
    }

    if (!files.length) {
      E.fileList.innerHTML = `
        <div class="empty-state">
          Henüz dosya yok.
        </div>
      `;
      return;
    }

    E.fileList.innerHTML =
      files
        .map((file) => {
          const name =
            file?.name ||
            file?.filename ||
            "Dosya";

          const type =
            file?.type ||
            file?.mimeType ||
            "Dosya";

          const size =
            file?.size ||
            file?.bytes ||
            0;

          const url =
            file?.url ||
            file?.downloadUrl ||
            "";

          return `
            <article class="file-card">
              <div class="file-card-icon">
                <svg viewBox="0 0 24 24">
                  <use href="#i-file-text"></use>
                </svg>
              </div>

              <div class="file-card-main">
                <strong>
                  ${esc(name)}
                </strong>

                <span>
                  ${esc(type)}
                  ·
                  ${bytes(size)}
                </span>
              </div>

              ${
                url
                  ? `
                    <a
                      class="file-card-action"
                      href="${esc(url)}"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg viewBox="0 0 24 24">
                        <use href="#i-download"></use>
                      </svg>
                    </a>
                  `
                  : ""
              }
            </article>
          `;
        })
        .join("");
  }

  function setupDrop() {
    const zone =
      E.fileDropZone;

    if (!zone) return;

    zone.addEventListener(
      "dragenter",
      (event) => {
        event.preventDefault();

        E.dropOverlay?.classList.remove(
          "hidden"
        );
      }
    );

    zone.addEventListener(
      "dragover",
      (event) => {
        event.preventDefault();
      }
    );

    zone.addEventListener(
      "dragleave",
      (event) => {
        event.preventDefault();

        if (
          !zone.contains(
            event.relatedTarget
          )
        ) {
          E.dropOverlay?.classList.add(
            "hidden"
          );
        }
      }
    );

    zone.addEventListener(
      "drop",
      (event) => {
        event.preventDefault();

        E.dropOverlay?.classList.add(
          "hidden"
        );

        uploadFiles(
          event.dataTransfer?.files
        );
      }
    );
  }

  /* =========================================================
     MEDYA
     ========================================================= */

  function openImageModal() {
    T.openModal(
      "imageCreateModal"
    );
  }

  function openVideoModal() {
    T.openModal(
      "videoModal"
    );
  }

  async function generateImage() {
    const prompt =
      E.imagePromptInput?.value.trim();

    if (!prompt) {
      T.toast(
        "Görsel açıklaması yaz.",
        "warning"
      );
      return;
    }

    setLoadingButton(
      E.generateImageButton,
      true,
      "Oluşturuluyor..."
    );

    if (E.imageResult) {
      E.imageResult.innerHTML = `
        <div class="empty-state">
          Görsel hazırlanıyor...
        </div>
      `;
    }

    try {
      const data =
        await request(
          config.endpoints.mediaImage,
          {
            method: "POST",
            body: {
              prompt,
              size:
                E.imageSizeSelect?.value ||
                "1024x1024",
              quality:
                E.imageQualitySelect?.value ||
                "standard"
            }
          },
          90000
        );

      const url =
        resultUrl(
          data,
          "image"
        );

      if (!url) {
        throw new Error(
          "Sunucu görsel sonucu döndürmedi."
        );
      }

      if (E.imageResult) {
        E.imageResult.innerHTML = `
          <div class="generated-media-card">
            <img
              src="${esc(url)}"
              alt="TürkAI görsel sonucu"
              loading="lazy"
            />

            <div class="generated-media-actions">
              <a
                href="${esc(url)}"
                target="_blank"
                rel="noopener noreferrer"
                class="secondary-button"
              >
                <svg viewBox="0 0 24 24">
                  <use href="#i-download"></use>
                </svg>
                Görseli aç
              </a>
            </div>
          </div>
        `;
      }

      T.toast(
        "Görsel hazır.",
        "success"
      );
    } catch (error) {
      if (E.imageResult) {
        E.imageResult.innerHTML = `
          <div class="empty-state">
            <strong>Görsel oluşturulamadı.</strong>
            <div>
              ${esc(
                error?.message || ""
              )}
            </div>
          </div>
        `;
      }

      T.toast(
        error?.message ||
        "Görsel oluşturulamadı.",
        "error"
      );
    } finally {
      setLoadingButton(
        E.generateImageButton,
        false
      );
    }
  }

  async function generateVideo() {
    const prompt =
      E.videoPromptInput?.value.trim();

    if (!prompt) {
      T.toast(
        "Video açıklaması yaz.",
        "warning"
      );
      return;
    }

    setLoadingButton(
      E.generateVideoButton,
      true,
      "Hazırlanıyor..."
    );

    if (E.videoResult) {
      E.videoResult.innerHTML = `
        <div class="empty-state">
          Video hazırlanıyor...
        </div>
      `;
    }

    try {
      const data =
        await request(
          config.endpoints.mediaVideo,
          {
            method: "POST",
            body: {
              prompt,
              duration:
                E.videoDurationSelect?.value ||
                "5"
            }
          },
          120000
        );

      const url =
        resultUrl(
          data,
          "video"
        );

      if (!url) {
        throw new Error(
          "Sunucu video sonucu döndürmedi."
        );
      }

      if (E.videoResult) {
        E.videoResult.innerHTML = `
          <div class="generated-media-card">
            <video
              src="${esc(url)}"
              controls
              playsinline
              preload="metadata"
            ></video>

            <div class="generated-media-actions">
              <a
                href="${esc(url)}"
                target="_blank"
                rel="noopener noreferrer"
                class="secondary-button"
              >
                <svg viewBox="0 0 24 24">
                  <use href="#i-download"></use>
                </svg>
                Videoyu aç
              </a>
            </div>
          </div>
        `;
      }

      T.toast(
        "Video hazır.",
        "success"
      );
    } catch (error) {
      if (E.videoResult) {
        E.videoResult.innerHTML = `
          <div class="empty-state">
            <strong>Video oluşturulamadı.</strong>
            <div>
              ${esc(
                error?.message || ""
              )}
            </div>
          </div>
        `;
      }

      T.toast(
        error?.message ||
        "Video oluşturulamadı.",
        "error"
      );
    } finally {
      setLoadingButton(
        E.generateVideoButton,
        false
      );
    }
  }

  /* =========================================================
     PLANLAR
     ========================================================= */

  const DEFAULT_PLANS = [
    {
      id: "free",
      name: "Free",
      price: 0,
      description:
        "TürkAI'nin temel özellikleri.",
      features: [
        "Temel sohbet",
        "Hafıza",
        "Araştırma araçları"
      ]
    },

    {
      id: "pro",
      name: "Pro",
      price: 250,
      featured: true,
      description:
        "Daha yüksek kullanım ve gelişmiş özellikler.",
      features: [
        "Daha yüksek kullanım",
        "Gelişmiş modeller",
        "Görsel üretim"
      ]
    },

    {
      id: "plus",
      name: "Plus",
      price: 500,
      description:
        "Üretim ve medya araçları için genişletilmiş plan.",
      features: [
        "Daha yüksek limit",
        "Görsel üretim",
        "Video üretimi"
      ]
    },

    {
      id: "ultra",
      name: "Ultra",
      price: 1000,
      soon: true,
      description:
        "TürkAI'nin en kapsamlı paketi.",
      features: [
        "Ultra kullanım",
        "Genişletilmiş modeller",
        "Gelişmiş medya"
      ]
    }
  ];

  async function loadPlans() {
    let plans = [];

    try {
      const data =
        await request(
          config.endpoints.plans
        );

      plans = safeArray(
        data,
        [
          "plans",
          "items",
          "data"
        ]
      );
    } catch {
      plans = [];
    }

    state.plans =
      plans.length
        ? plans
        : DEFAULT_PLANS;

    renderPlans(
      state.plans
    );
  }

  function renderPlans(plans) {
    if (!E.plansList) return;

    E.plansList.innerHTML =
      plans
        .map((plan) => {
          const price =
            Number(plan.price) || 0;

          return `
            <article
              class="plan-card ${
                plan.featured
                  ? "featured"
                  : ""
              }"
            >
              <div class="plan-card-header">
                <div>
                  <div class="plan-card-name">
                    ${esc(
                      plan.name ||
                      plan.id
                    )}
                  </div>

                  <div class="plan-card-price">
                    ${price.toLocaleString(
                      "tr-TR"
                    )} TL${
                      price
                        ? "/ay"
                        : ""
                    }
                  </div>
                </div>

                ${
                  plan.soon
                    ? `
                      <span class="plan-badge">
                        Yakında
                      </span>
                    `
                    : plan.featured
                    ? `
                      <span class="plan-badge">
                        Öne çıkan
                      </span>
                    `
                    : ""
                }
              </div>

              <div class="plan-card-description">
                ${esc(
                  plan.description ||
                  ""
                )}
              </div>

              <div class="plan-card-features">
                ${
                  (
                    plan.features ||
                    []
                  )
                    .map(
                      (feature) => `
                        <div>
                          <svg viewBox="0 0 24 24">
                            <use href="#i-check"></use>
                          </svg>

                          <span>
                            ${esc(
                              feature
                            )}
                          </span>
                        </div>
                      `
                    )
                    .join("")
                }
              </div>

              <button
                type="button"
                class="primary-button plan-action-button"
                data-plan-id="${esc(
                  plan.id
                )}"
                ${
                  plan.soon
                    ? "disabled"
                    : ""
                }
              >
                ${
                  plan.soon
                    ? "Yakında"
                    : plan.id ===
                      "free"
                    ? "Aktif"
                    : "İncele"
                }
              </button>
            </article>
          `;
        })
        .join("");

    E.plansList
      .querySelectorAll(
        ".plan-action-button"
      )
      .forEach((button) => {
        button.onclick = () => {
          const id =
            button.dataset.planId;

          if (id === "free") {
            T.toast(
              "Free plan aktif.",
              "info"
            );
            return;
          }

          T.toast(
            `${id} planı seçildi.`,
            "info"
          );
        };
      });
  }

  /* =========================================================
     BİLDİRİMLER
     ========================================================= */

  async function loadNotifications() {
    try {
      const data =
        await request(
          config.endpoints.notifications
        );

      state.notifications =
        safeArray(
          data,
          [
            "notifications",
            "items",
            "results",
            "data"
          ]
        );
    } catch {
      state.notifications = [];
    }

    state.notificationUnread =
      state.notifications.filter(
        (item) =>
          !item?.read &&
          !item?.isRead
      ).length;

    renderNotifications();
  }

  function renderNotifications() {
    if (!E.notificationList) {
      updateNotificationBadge();
      return;
    }

    if (!state.notifications.length) {
      E.notificationList.innerHTML = `
        <div class="empty-state">
          Yeni bildirim yok.
        </div>
      `;

      if (E.notificationSummary) {
        E.notificationSummary.textContent =
          "0 okunmamış";
      }

      updateNotificationBadge();
      return;
    }

    E.notificationList.innerHTML =
      state.notifications
        .slice(0, 50)
        .map((item) => {
          const title =
            item?.title ||
            "Bildirim";

          const message =
            item?.message ||
            item?.text ||
            "";

          const created =
            item?.createdAt ||
            item?.created_at ||
            item?.date ||
            new Date();

          const unread =
            !item?.read &&
            !item?.isRead;

          return `
            <article
              class="notification-card ${
                unread ? "unread" : ""
              }"
            >
              <div class="notification-card-icon">
                <svg viewBox="0 0 24 24">
                  <use href="#i-bell"></use>
                </svg>
              </div>

              <div class="notification-card-main">
                <strong>
                  ${esc(title)}
                </strong>

                <span>
                  ${esc(message)}
                </span>

                <small>
                  ${esc(
                    dateText(
                      created
                    )
                  )}
                </small>
              </div>
            </article>
          `;
        })
        .join("");

    if (E.notificationSummary) {
      E.notificationSummary.textContent =
        `${state.notificationUnread} okunmamış`;
    }

    updateNotificationBadge();
  }

  function updateNotificationBadge() {
    const count =
      Number(
        state.notificationUnread
      ) || 0;

    if (E.notificationBadge) {
      E.notificationBadge.textContent =
        count > 99
          ? "99+"
          : String(count);

      E.notificationBadge.classList.toggle(
        "hidden",
        count === 0
      );
    }
  }

  async function markNotificationsRead() {
    state.notifications =
      state.notifications.map(
        (notification) => ({
          ...notification,
          read: true,
          isRead: true
        })
      );

    state.notificationUnread =
      0;

    renderNotifications();

    T.toast(
      "Bildirimler okundu.",
      "success"
    );

    /*
      Backend'in farklı endpoint isimlerine
      sahip olabilmesi nedeniyle UI burada kesin
      olarak güncelleniyor.
    */
    try {
      await request(
        "/api/notifications/read",
        {
          method: "POST",
          body: {}
        }
      );
    } catch {}
  }

  /* =========================================================
     SİSTEM
     ========================================================= */

  async function loadSystemStatus() {
    try {
      const data =
        await request(
          config.endpoints.systemStatus
        );

      state.system = data;

      renderSystem(data);
    } catch (error) {
      renderSystemError(error);
    }
  }

  function renderSystem(data) {
    if (!E.systemStats) return;

    const status =
      data?.status ??
      (
        data?.integration?.degraded ===
        false
          ? "ready"
          : "unknown"
      );

    const normalized =
      text(status)
        .toLocaleLowerCase(
          "tr-TR"
        );

    const ready =
      normalized === "ready" ||
      normalized === "ok" ||
      normalized === "healthy";

    if (E.systemOverallStatus) {
      E.systemOverallStatus.textContent =
        ready
          ? "Hazır"
          : text(
              status,
              "Bilinmiyor"
            );
    }

    const server =
      data?.server ||
      {};

    const modules =
      data?.modules ||
      {};

    const moduleRows =
      Object.entries(
        modules
      );

    E.systemStats.innerHTML = `
      <div class="system-card">
        <div class="system-card-title">
          Sunucu
        </div>

        <div class="system-card-row">
          <span>Durum</span>
          <strong>
            ${esc(status)}
          </strong>
        </div>

        <div class="system-card-row">
          <span>Ad</span>
          <strong>
            ${esc(
              server.name ||
              "TürkAI Master Server"
            )}
          </strong>
        </div>

        <div class="system-card-row">
          <span>Sürüm</span>
          <strong>
            ${esc(
              server.version ||
              data?.version ||
              "unknown"
            )}
          </strong>
        </div>

        <div class="system-card-row">
          <span>Port</span>
          <strong>
            ${esc(
              server.port ||
              "3000"
            )}
          </strong>
        </div>
      </div>

      <div class="system-card">
        <div class="system-card-title">
          Modüller
        </div>

        ${
          moduleRows.length
            ? moduleRows
                .map(
                  ([name, value]) => `
                    <div class="system-card-row">
                      <span>
                        ${esc(name)}
                      </span>

                      <strong>
                        ${
                          value?.available ===
                            false
                            ? "Pasif"
                            : "Aktif"
                        }
                      </strong>
                    </div>
                  `
                )
                .join("")
            : `
              <div class="empty-state">
                Modül bilgisi bulunamadı.
              </div>
            `
        }
      </div>
    `;

    if (E.systemOverallStatus) {
      E.systemOverallStatus.classList.toggle(
        "status-error",
        !ready
      );
    }
  }

  function renderSystemError(error) {
    if (E.systemOverallStatus) {
      E.systemOverallStatus.textContent =
        "Ulaşılamıyor";
    }

    if (E.systemStats) {
      E.systemStats.innerHTML = `
        <div class="empty-state">
          <strong>Sistem bilgisi alınamadı.</strong>
          <div>
            ${esc(
              error?.message || ""
            )}
          </div>
        </div>
      `;
    }
  }

  /* =========================================================
     HESAP
     ========================================================= */

  function normalizeAccount(data) {
    const raw =
      data?.account ||
      data?.user ||
      data?.data ||
      data ||
      {};

    return {
      id:
        raw.id ||
        raw.userId ||
        null,

      name:
        raw.name ||
        raw.displayName ||
        raw.username ||
        "Misafir",

      email:
        raw.email ||
        "",

      verified:
        !!(
          raw.verified ||
          raw.emailVerified
        ),

      plan:
        raw.plan ||
        raw.planName ||
        "Free",

      usage:
        raw.usage ??
        raw.used ??
        raw.monthlyUsage ??
        0,

      limit:
        raw.limit ??
        raw.maxUsage ??
        raw.monthlyLimit ??
        50,

      status:
        raw.status ||
        "active"
    };
  }

  async function loadAccount() {
    try {
      const data =
        await request(
          config.endpoints.authMe
        );

      state.account =
        normalizeAccount(data);
    } catch {
      const guest =
        localStorage.getItem(
          "turkai_guest_v41"
        );

      if (guest) {
        try {
          state.account =
            normalizeAccount(
              JSON.parse(guest)
            );
        } catch {
          state.account =
            normalizeAccount({
              name: "Misafir",
              plan: "Free",
              status: "guest"
            });
        }
      } else {
        state.account =
          normalizeAccount({
            name: "Misafir",
            plan: "Free",
            status: "guest"
          });
      }
    }

    renderAccount();
  }

  function renderAccount() {
    const account =
      state.account ||
      normalizeAccount({
        name: "Misafir",
        plan: "Free",
        status: "guest"
      });

    if (E.accountName) {
      E.accountName.textContent =
        account.name;
    }

    if (E.accountPlan) {
      E.accountPlan.textContent =
        account.plan;
    }

    if (E.accountStatusDot) {
      E.accountStatusDot.classList.toggle(
        "online",
        account.status === "active" ||
        account.status === "guest"
      );
    }

    if (E.accountModalName) {
      E.accountModalName.textContent =
        account.name;
    }

    if (E.accountModalEmail) {
      E.accountModalEmail.textContent =
        account.email ||
        "Misafir oturumu";
    }

    if (E.accountModalVerified) {
      E.accountModalVerified.textContent =
        account.verified
          ? "Doğrulanmış"
          : "Doğrulanmamış";
    }

    if (E.accountModalPlan) {
      E.accountModalPlan.textContent =
        account.plan;
    }

    if (E.accountModalUsage) {
      E.accountModalUsage.textContent =
        `${account.usage || 0} / ${
          account.limit ?? "∞"
        }`;
    }

    if (E.accountModalStatus) {
      E.accountModalStatus.textContent =
        account.status;
    }
  }

  async function loginUser() {
    const identifier =
      E.authIdentifier?.value.trim();

    const password =
      E.authPassword?.value ||
      "";

    if (!identifier || !password) {
      if (E.authMessage) {
        E.authMessage.textContent =
          "Giriş bilgilerini doldur.";
      }

      return;
    }

    if (E.authMessage) {
      E.authMessage.textContent =
        "Giriş yapılıyor...";
    }

    try {
      const data =
        await request(
          config.endpoints.authLogin,
          {
            method: "POST",
            body: {
              identifier,
              email: identifier,
              username: identifier,
              password
            }
          }
        );

      state.account =
        normalizeAccount(data);

      localStorage.setItem(
        "turkai_guest_v41",
        JSON.stringify(
          state.account
        )
      );

      renderAccount();

      T.closeModal(
        "authModal"
      );

      T.openModal(
        "accountModal"
      );

      T.toast(
        "Giriş başarılı.",
        "success"
      );
    } catch (error) {
      if (E.authMessage) {
        E.authMessage.textContent =
          error?.message ||
          "Giriş başarısız.";
      }

      T.toast(
        error?.message ||
        "Giriş yapılamadı.",
        "error"
      );
    }
  }

  async function logoutUser() {
    try {
      await request(
        config.endpoints.authLogout,
        {
          method: "POST",
          body: {}
        }
      );
    } catch {}

    localStorage.removeItem(
      "turkai_guest_v41"
    );

    state.account =
      normalizeAccount({
        name: "Misafir",
        plan: "Free",
        status: "guest",
        usage: 0,
        limit: 50
      });

    renderAccount();

    T.closeModal(
      "accountModal"
    );

    T.toast(
      "Oturum kapatıldı.",
      "success"
    );
  }

  function guestLogin() {
    state.account =
      normalizeAccount({
        name: "Misafir",
        plan: "Free",
        status: "guest",
        usage: 0,
        limit: 50
      });

    localStorage.setItem(
      "turkai_guest_v41",
      JSON.stringify(
        state.account
      )
    );

    renderAccount();

    T.closeModal(
      "authModal"
    );

    T.toast(
      "Misafir olarak devam ediliyor.",
      "success"
    );
  }

  /* =========================================================
     SOHBET ARAMA
     ========================================================= */

  function searchChat(query) {
    if (!E.chatSearchResults) {
      return;
    }

    const q =
      text(query)
        .toLocaleLowerCase(
          "tr-TR"
        )
        .trim();

    if (!q) {
      E.chatSearchResults.innerHTML = `
        <div class="empty-state">
          Sohbet içinde aramak için yaz.
        </div>
      `;

      return;
    }

    const matches =
      state.messages.filter(
        (message) =>
          text(message.content)
            .toLocaleLowerCase(
              "tr-TR"
            )
            .includes(q)
      );

    if (!matches.length) {
      E.chatSearchResults.innerHTML = `
        <div class="empty-state">
          Sonuç bulunamadı.
        </div>
      `;

      return;
    }

    E.chatSearchResults.innerHTML =
      matches
        .map(
          (message) => `
            <button
              type="button"
              class="result-card chat-search-result"
              data-chat-message="${esc(
                message.id
              )}"
            >
              <div class="result-card-title">
                ${
                  message.role ===
                  "user"
                    ? "Sen"
                    : "TürkAI"
                }
              </div>

              <div class="result-card-text">
                ${esc(
                  text(
                    message.content
                  ).slice(
                    0,
                    400
                  )
                )}
              </div>
            </button>
          `
        )
        .join("");

    E.chatSearchResults
      .querySelectorAll(
        "[data-chat-message]"
      )
      .forEach((node) => {
        node.onclick = () => {
          const id =
            node.dataset
              .chatMessage;

          T.closeModal(
            "chatSearchPanel"
          );

          const target =
            document.querySelector(
              `[data-message-id="${CSS.escape(
                id
              )}"]`
            );

          target?.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
        };
      });
  }

  /* =========================================================
     COMMAND CENTER
     ========================================================= */

  const commands = [
    {
      title: "Yeni sohbet",
      description:
        "Yeni bir konuşma başlat",
      icon: "i-plus",
      run: () =>
        T.createNewChat()
    },

    {
      title: "Araştırma",
      description:
        "Web araştırma paneli",
      icon: "i-search",
      run: () =>
        T.openPanel(
          "research"
        )
    },

    {
      title: "Hava durumu",
      description:
        "Hava durumu aracını aç",
      icon: "i-cloud",
      run: () =>
        T.openPanel(
          "weather"
        )
    },

    {
      title: "Hafıza",
      description:
        "TürkAI hafızasını aç",
      icon: "i-memory",
      run: () =>
        T.openPanel(
          "memory"
        )
    },

    {
      title: "Dosyalar",
      description:
        "Dosya merkezini aç",
      icon: "i-folder",
      run: () =>
        T.openPanel(
          "files"
        )
    },

    {
      title: "Medya",
      description:
        "Görsel ve video araçları",
      icon: "i-image",
      run: () =>
        T.openPanel(
          "media"
        )
    },

    {
      title: "Planlar",
      description:
        "TürkAI planlarını aç",
      icon: "i-crown",
      run: () =>
        T.openPanel(
          "plans"
        )
    },

    {
      title: "Bildirimler",
      description:
        "Bildirim panelini aç",
      icon: "i-bell",
      run: () =>
        T.openPanel(
          "notifications"
        )
    },

    {
      title: "Sistem",
      description:
        "Sunucu durumunu görüntüle",
      icon: "i-command",
      run: () =>
        T.openPanel(
          "system"
        )
    },

    {
      title: "Ayarlar",
      description:
        "TürkAI ayarlarını yönet",
      icon: "i-settings",
      run: () =>
        T.openModal(
          "settingsModal"
        )
    },

    {
      title: "Hesap",
      description:
        "Hesap bilgilerini aç",
      icon: "i-user",
      run: () =>
        T.openModal(
          "accountModal"
        )
    }
  ];

  function renderCommands(query = "") {
    if (!E.commandList) {
      return;
    }

    const q =
      text(query)
        .toLocaleLowerCase(
          "tr-TR"
        )
        .trim();

    const filtered =
      commands.filter(
        (command) =>
          !q ||
          `${command.title} ${command.description}`
            .toLocaleLowerCase(
              "tr-TR"
            )
            .includes(q)
      );

    E.commandList.innerHTML =
      filtered
        .map(
          (command, index) => `
            <button
              type="button"
              class="command-item ${
                index ===
                state.commandIndex
                  ? "active"
                  : ""
              }"
              data-command-index="${index}"
            >
              <div class="command-item-icon">
                <svg viewBox="0 0 24 24">
                  <use href="#${command.icon}"></use>
                </svg>
              </div>

              <div class="command-item-content">
                <strong>
                  ${esc(
                    command.title
                  )}
                </strong>

                <span>
                  ${esc(
                    command.description
                  )}
                </span>
              </div>

              <svg
                class="command-item-arrow"
                viewBox="0 0 24 24"
              >
                <use href="#i-chevron-right"></use>
              </svg>
            </button>
          `
        )
        .join("");

    E.commandList
      .querySelectorAll(
        "[data-command-index]"
      )
      .forEach((node) => {
        node.onclick = () => {
          const index =
            Number(
              node.dataset
                .commandIndex
            );

          const command =
            filtered[index];

          if (!command) return;

          T.closeModal(
            "commandCenter"
          );

          command.run();
        };
      });
  }

  /* =========================================================
     AYARLAR
     ========================================================= */

  function syncSettings() {
    if (E.enterSendToggle) {
      E.enterSendToggle.checked =
        !!state.settings.enterToSend;
    }

    if (E.draftSaveToggle) {
      E.draftSaveToggle.checked =
        !!state.settings.draftSave;
    }

    if (E.autoSpeakToggle) {
      E.autoSpeakToggle.checked =
        !!state.settings.autoSpeak;
    }

    if (E.freshInfoToggle) {
      E.freshInfoToggle.checked =
        !!state.settings.freshInfo;
    }
  }

  function saveSettings() {
    state.settings = {
      enterToSend:
        !!E.enterSendToggle?.checked,

      draftSave:
        !!E.draftSaveToggle?.checked,

      autoSpeak:
        !!E.autoSpeakToggle?.checked,

      freshInfo:
        !!E.freshInfoToggle?.checked
    };

    localStorage.setItem(
      config.storage.settings,
      JSON.stringify(
        state.settings
      )
    );

    syncSettings();

    T.closeModal(
      "settingsModal"
    );

    T.toast(
      "Ayarlar kaydedildi.",
      "success"
    );
  }

  function resetSettings() {
    state.settings = {
      ...config.defaults.settings
    };

    syncSettings();

    localStorage.setItem(
      config.storage.settings,
      JSON.stringify(
        state.settings
      )
    );

    T.toast(
      "Ayarlar sıfırlandı.",
      "success"
    );
  }

  /* =========================================================
     ADMIN
     ========================================================= */

  async function unlockAdmin() {
    const code =
      E.adminUnlockInput?.value.trim();

    if (!code) {
      if (E.adminUnlockMessage) {
        E.adminUnlockMessage.textContent =
          "Kod gerekli.";
      }

      return;
    }

    try {
      const data =
        await request(
          config.endpoints.adminUnlock,
          {
            method: "POST",
            body: { code }
          }
        );

      if (
        !(
          data?.ok ||
          data?.success ||
          data?.unlocked
        )
      ) {
        throw new Error(
          data?.message ||
          "Yetki alınamadı."
        );
      }

      state.adminUnlocked =
        true;

      T.closeModal(
        "adminUnlockModal"
      );

      E.adminPanel?.classList.remove(
        "hidden"
      );

      T.toast(
        "Admin modu aktif.",
        "success"
      );
    } catch (error) {
      if (E.adminUnlockMessage) {
        E.adminUnlockMessage.textContent =
          error?.message ||
          "Doğrulama başarısız.";
      }

      T.toast(
        "Admin doğrulaması başarısız.",
        "error"
      );
    }
  }

  async function adminRequest(
    url,
    options = {}
  ) {
    if (!state.adminUnlocked) {
      T.toast(
        "Önce admin doğrulaması gerekli.",
        "warning"
      );
      return;
    }

    try {
      const data =
        await request(
          url,
          options
        );

      if (E.adminOutput) {
        E.adminOutput.textContent =
          JSON.stringify(
            data,
            null,
            2
          );
      }

      return data;
    } catch (error) {
      if (E.adminOutput) {
        E.adminOutput.textContent =
          error?.message ||
          "İşlem başarısız.";
      }
    }
  }

  /* =========================================================
     EVENTLER
     ========================================================= */

  function bindPart2Events() {
    E.researchRunButton?.addEventListener(
      "click",
      runResearch
    );

    E.researchClearButton?.addEventListener(
      "click",
      () => {
        if (E.researchInput) {
          E.researchInput.value =
            "";
        }

        if (E.researchStatus) {
          E.researchStatus.textContent =
            "Hazır.";
        }

        if (E.researchResults) {
          E.researchResults.innerHTML = `
            <div class="empty-state">
              Araştırma sonucu burada görünecek.
            </div>
          `;
        }
      }
    );

    E.researchInput?.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter" &&
          !event.shiftKey
        ) {
          event.preventDefault();
          runResearch();
        }
      }
    );

    E.weatherRunButton?.addEventListener(
      "click",
      runWeather
    );

    E.weatherInput?.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter"
        ) {
          event.preventDefault();
          runWeather();
        }
      }
    );

    E.memorySearchButton?.addEventListener(
      "click",
      searchMemory
    );

    E.memoryOverviewButton?.addEventListener(
      "click",
      loadMemoryOverview
    );

    E.memorySaveCurrentButton?.addEventListener(
      "click",
      saveCurrentConversation
    );

    E.memoryInput?.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter"
        ) {
          event.preventDefault();
          searchMemory();
        }
      }
    );

    E.fileSelectButton?.addEventListener(
      "click",
      () =>
        E.globalFilePicker?.click()
    );

    E.globalFilePicker?.addEventListener(
      "change",
      (event) =>
        uploadFiles(
          event.target.files
        )
    );

    E.refreshFilesButton?.addEventListener(
      "click",
      loadFiles
    );

    E.openImageModalButton?.addEventListener(
      "click",
      openImageModal
    );

    E.openVideoModalButton?.addEventListener(
      "click",
      openVideoModal
    );

    E.generateImageButton?.addEventListener(
      "click",
      generateImage
    );

    E.generateVideoButton?.addEventListener(
      "click",
      generateVideo
    );

    E.markNotificationsReadButton?.addEventListener(
      "click",
      markNotificationsRead
    );

    E.refreshSystemButton?.addEventListener(
      "click",
      loadSystemStatus
    );

    E.authForm?.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();
        loginUser();
      }
    );

    E.loginButton?.addEventListener(
      "click",
      () => {
        T.closeModal(
          "accountModal"
        );

        T.openModal(
          "authModal"
        );
      }
    );

    E.logoutButton?.addEventListener(
      "click",
      logoutUser
    );

    E.guestLoginButton?.addEventListener(
      "click",
      guestLogin
    );

    E.accountPlansButton?.addEventListener(
      "click",
      () => {
        T.closeModal(
          "accountModal"
        );

        T.openPanel(
          "plans"
        );
      }
    );

    E.chatSearchInput?.addEventListener(
      "input",
      () =>
        searchChat(
          E.chatSearchInput.value
        )
    );

    E.commandInput?.addEventListener(
      "input",
      () => {
        state.commandIndex =
          0;

        renderCommands(
          E.commandInput.value
        );
      }
    );

    E.commandInput?.addEventListener(
      "keydown",
      (event) => {
        const items =
          E.commandList?.querySelectorAll(
            ".command-item"
          ) || [];

        if (!items.length) return;

        if (
          event.key ===
          "ArrowDown"
        ) {
          event.preventDefault();

          state.commandIndex =
            Math.min(
              state.commandIndex +
                1,
              items.length - 1
            );

          renderCommands(
            E.commandInput.value
          );
        }

        if (
          event.key ===
          "ArrowUp"
        ) {
          event.preventDefault();

          state.commandIndex =
            Math.max(
              state.commandIndex -
                1,
              0
            );

          renderCommands(
            E.commandInput.value
          );
        }

        if (
          event.key ===
          "Enter"
        ) {
          event.preventDefault();

          items[
            state.commandIndex
          ]?.click();
        }
      }
    );

    E.saveSettingsButton?.addEventListener(
      "click",
      saveSettings
    );

    E.resetSettingsButton?.addEventListener(
      "click",
      resetSettings
    );

    E.adminUnlockForm?.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();
        unlockAdmin();
      }
    );

    E.adminSystemButton?.addEventListener(
      "click",
      () =>
        adminRequest(
          config.endpoints.systemStatus
        )
    );

    E.adminUsersButton?.addEventListener(
      "click",
      () =>
        adminRequest(
          "/api/admin/users"
        )
    );

    E.adminMemoryButton?.addEventListener(
      "click",
      () =>
        adminRequest(
          config.endpoints.memorySearch,
          {
            method: "POST",
            body: {
              query: "*",
              overview: true
            }
          }
        )
    );

    E.adminLogsButton?.addEventListener(
      "click",
      () =>
        adminRequest(
          "/api/admin/logs"
        )
    );

    window.addEventListener(
      "online",
      () => {
        state.connected = true;
      }
    );

    window.addEventListener(
      "offline",
      () => {
        state.connected = false;

        T.toast(
          "İnternet bağlantısı kesildi.",
          "warning"
        );
      }
    );
  }

  /* =========================================================
     PERİYODİK DURUM
     ========================================================= */

  function startRefresh() {
    window.setInterval(
      async () => {
        if (
          document.hidden ||
          !navigator.onLine
        ) {
          return;
        }

        await Promise.allSettled([
          loadAccount(),
          loadNotifications(),
          loadSystemStatus()
        ]);
      },
      60000
    );
  }

  /* =========================================================
     BAŞLAT
     ========================================================= */

  async function start() {
    bindPart2Events();
    setupDrop();

    syncSettings();

    /*
      İlk veriler yükleniyor.
      Bir endpoint hata verse bile diğerleri çalışmaya devam eder.
    */
    await Promise.allSettled([
      loadAccount(),
      loadPlans(),
      loadFiles(),
      loadNotifications(),
      loadSystemStatus(),
      loadMemoryOverview(),
      loadResearchPanel()
    ]);

    T.renderMessages();

    renderAttachments();

    startRefresh();

    /*
      Part 1'in açık panel sistemi için bütün
      fonksiyonları burada global bridge olarak
      sunuyoruz.
    */
    window.TURKAI = {
      ...window.TURKAI,

      loadResearchPanel,
      runResearch,

      runWeather,

      searchMemory,
      loadMemoryOverview,
      saveMemory,
      saveCurrentConversation,

      loadFiles,
      renderFiles,
      uploadFiles,

      loadPlans,
      renderPlans,

      loadNotifications,
      markNotificationsRead,

      loadSystemStatus,
      renderSystem,

      loadAccount,
      renderAccount,

      openImageModal,
      openVideoModal,
      generateImage,
      generateVideo,

      searchChat,
      renderCommands,

      loginUser,
      logoutUser,
      guestLogin,

      startVoiceInput: T.startVoiceInput,
      stopVoiceInput: T.stopVoiceInput
    };

    console.log(
      "%cTürkAI Frontend 41.0 PART 2 hazır.",
      "font-weight:700"
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  } else {
    start();
  }
})();

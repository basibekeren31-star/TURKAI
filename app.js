(() => {
  "use strict";

  if (window.__TURKAI_40_APP__) return;
  window.__TURKAI_40_APP__ = true;

  const CONFIG = {
    version: "40.0",
    appName: "TürkAI",
    apiBase: "",
    timeout: 90000,
    storageKey: "turkai_master_40",
    userKey: "turkai_user_40",
    sessionKey: "turkai_session_40"
  };

  const state = {
    userId: "guest",
    user: null,
    account: null,

    sessionId: null,
    conversationId: null,

    conversations: [],
    messages: [],
    attachments: [],

    models: [],
    plans: [],

    selectedModel: "auto",

    research: false,
    memory: true,
    weather: false,

    sending: false,
    listening: false,
    online: navigator.onLine,

    mediaJob: null
  };

  const $ = (id) =>
    document.getElementById(id);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  /* ============================================================
     CORE HELPERS
     ============================================================ */

  function uid(prefix = "id") {
    try {
      if (
        window.crypto &&
        typeof crypto.randomUUID === "function"
      ) {
        return `${prefix}_${crypto.randomUUID()}`;
      }
    } catch {}

    return `${prefix}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeURL(value) {
    try {
      const url = new URL(
        String(value),
        location.origin
      );

      if (
        url.protocol !== "http:" &&
        url.protocol !== "https:"
      ) {
        return "#";
      }

      return url.href;
    } catch {
      return "#";
    }
  }

  function normalizeUserId(value) {
    return (
      String(value || "guest")
        .trim()
        .replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        )
        .slice(0, 90) ||
      "guest"
    );
  }

  function now() {
    return new Date().toISOString();
  }

  function formatTime(value) {
    try {
      return new Intl.DateTimeFormat(
        "tr-TR",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      ).format(new Date(value));
    } catch {
      return "";
    }
  }

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat(
        "tr-TR",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        }
      ).format(new Date(value));
    } catch {
      return "";
    }
  }

  function formatBytes(value) {
    const bytes =
      Number(value || 0);

    if (bytes <= 0) {
      return "0 B";
    }

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

    return `${size.toFixed(
      size >= 10 || index === 0
        ? 0
        : 1
    )} ${units[index]}`;
  }

  /* ============================================================
     LOCAL STORAGE
     ============================================================ */

  function saveLocal() {
    try {
      localStorage.setItem(
        CONFIG.storageKey,
        JSON.stringify({
          conversationId:
            state.conversationId,

          selectedModel:
            state.selectedModel,

          research:
            state.research,

          memory:
            state.memory,

          weather:
            state.weather,

          messages:
            state.messages.slice(-100),

          conversations:
            state.conversations.slice(
              -100
            )
        })
      );

      if (state.user) {
        localStorage.setItem(
          CONFIG.userKey,
          JSON.stringify(state.user)
        );
      }

      if (state.sessionId) {
        localStorage.setItem(
          CONFIG.sessionKey,
          state.sessionId
        );
      }
    } catch {}
  }

  function loadLocal() {
    try {
      const saved =
        JSON.parse(
          localStorage.getItem(
            CONFIG.storageKey
          ) || "null"
        );

      if (saved) {
        state.conversationId =
          saved.conversationId ||
          null;

        state.selectedModel =
          saved.selectedModel ||
          "auto";

        state.research =
          saved.research === true;

        state.memory =
          saved.memory !== false;

        state.weather =
          saved.weather === true;

        state.messages =
          Array.isArray(
            saved.messages
          )
            ? saved.messages
            : [];

        state.conversations =
          Array.isArray(
            saved.conversations
          )
            ? saved.conversations
            : [];
      }

      const savedUser =
        JSON.parse(
          localStorage.getItem(
            CONFIG.userKey
          ) || "null"
        );

      if (savedUser) {
        state.user = savedUser;
      }

      state.userId =
        normalizeUserId(
          state.user?.id ||
            state.user?.userId ||
            state.user?.email ||
            "guest"
        );

      state.sessionId =
        localStorage.getItem(
          CONFIG.sessionKey
        ) || null;
    } catch {}
  }

  /* ============================================================
     TOAST / STATUS
     ============================================================ */

  function toast(
    text,
    type = "info"
  ) {
    let stack =
      $("toastStack");

    if (!stack) {
      stack =
        document.createElement(
          "div"
        );

      stack.id =
        "toastStack";

      stack.className =
        "toast-stack";

      document.body.appendChild(
        stack
      );
    }

    const item =
      document.createElement(
        "div"
      );

    item.className =
      `toast ${type}`;

    item.innerHTML = `
      <span class="toast-indicator"></span>
      <span>${escapeHTML(
        text
      )}</span>
    `;

    stack.appendChild(item);

    requestAnimationFrame(() => {
      item.classList.add("show");
    });

    setTimeout(() => {
      item.classList.remove(
        "show"
      );

      setTimeout(() => {
        item.remove();
      }, 220);
    }, 3200);
  }

  function setStatus(
    text,
    mode = "idle"
  ) {
    if ($("statusText")) {
      $("statusText").textContent =
        text;
    }

    if ($("statusDot")) {
      $("statusDot").dataset.state =
        mode;
    }
  }

  /* ============================================================
     API ENGINE
     ============================================================ */

  async function api(
    path,
    options = {}
  ) {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => {
          controller.abort();
        },
        options.timeout ||
          CONFIG.timeout
      );

    const headers =
      new Headers(
        options.headers || {}
      );

    headers.set(
      "Accept",
      "application/json, text/plain, */*"
    );

    headers.set(
      "X-User-Id",
      state.userId ||
        "guest"
    );

    if (
      state.user?.accessToken
    ) {
      headers.set(
        "Authorization",
        `Bearer ${state.user.accessToken}`
      );
    }

    if (
      options.body &&
      !(
        options.body instanceof
        FormData
      ) &&
      !headers.has(
        "Content-Type"
      )
    ) {
      headers.set(
        "Content-Type",
        "application/json"
      );
    }

    try {
      const response =
        await fetch(
          `${CONFIG.apiBase}${path}`,
          {
            ...options,
            headers,
            credentials:
              "same-origin",
            signal:
              controller.signal
          }
        );

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      let data;

      if (
        contentType.includes(
          "application/json"
        )
      ) {
        data =
          await response.json();
      } else {
        data =
          await response.text();
      }

      if (!response.ok) {
        const error =
          new Error(
            typeof data ===
              "string"
              ? data
              : data?.message ||
                data?.error ||
                `HTTP ${response.status}`
          );

        error.status =
          response.status;

        error.data =
          data;

        throw error;
      }

      return data;
    } finally {
      clearTimeout(
        timeout
      );
    }
  }

  async function apiFirst(
    paths,
    options = {}
  ) {
    let lastError =
      null;

    for (
      const path of paths
    ) {
      try {
        return await api(
          path,
          options
        );
      } catch (error) {
        lastError =
          error;

        if (
          error.status !== 404 &&
          error.status !== 405
        ) {
          throw error;
        }
      }
    }

    throw (
      lastError ||
      new Error(
        "Endpoint bulunamadı."
      )
    );
  }

  /* ============================================================
     RESPONSE PARSING
     ============================================================ */

  function extractAnswer(
    data
  ) {
    if (
      typeof data ===
      "string"
    ) {
      return data.trim();
    }

    const candidates = [
      data?.answer,
      data?.response,
      data?.message,
      data?.content,
      data?.text,

      data?.data?.answer,
      data?.data?.response,
      data?.data?.message,
      data?.data?.content,
      data?.data?.text,

      data?.result?.answer,
      data?.result?.response,
      data?.result?.message,
      data?.result?.content,
      data?.result?.text
    ];

    const found =
      candidates.find(
        (value) =>
          typeof value ===
            "string" &&
          value.trim()
      );

    return (
      found || ""
    ).trim();
  }

  function extractSources(
    data
  ) {
    const candidates = [
      data?.sources,
      data?.references,
      data?.research?.sources,
      data?.research?.results,
      data?.data?.sources
    ];

    return (
      candidates.find(
        (value) =>
          Array.isArray(value)
      ) || []
    );
  }

  /* ============================================================
     MESSAGE RENDERING
     ============================================================ */

  function renderContent(
    text
  ) {
    let html =
      escapeHTML(text);

    const codeBlocks = [];

    html = html.replace(
      /```([\w#+.-]*)\n?([\s\S]*?)```/g,
      (_, language, code) => {
        const index =
          codeBlocks.length;

        codeBlocks.push({
          language:
            language ||
            "code",

          code:
            code.replace(
              /\n$/,
              ""
            )
        });

        return `@@CODE_${index}@@`;
      }
    );

    html = html.replace(
      /`([^`]+)`/g,
      "<code>$1</code>"
    );

    html = html.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );

    html = html.replace(
      /\*(.*?)\*/g,
      "<em>$1</em>"
    );

    html = html.replace(
      /^### (.*)$/gm,
      "<h4>$1</h4>"
    );

    html = html.replace(
      /^## (.*)$/gm,
      "<h3>$1</h3>"
    );

    html = html.replace(
      /^# (.*)$/gm,
      "<h2>$1</h2>"
    );

    html = html.replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      (_, label, url) => `
        <a
          href="${escapeHTML(
            safeURL(url)
          )}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${label}
        </a>
      `
    );

    html =
      html.replace(
        /\n/g,
        "<br>"
      );

    codeBlocks.forEach(
      (block, index) => {
        html =
          html.replace(
            `@@CODE_${index}@@`,
            `
            <div class="code-card">
              <div class="code-card-top">
                <span>${escapeHTML(
                  block.language
                )}</span>

                <button
                  type="button"
                  data-copy-code="${index}"
                >
                  Kopyala
                </button>
              </div>

              <pre><code>${escapeHTML(
                block.code
              )}</code></pre>
            </div>
          `
          );
      }
    );

    return html;
  }

  function renderSources(
    sources
  ) {
    const valid =
      sources
        .filter(
          (source) =>
            source &&
            (
              source.url ||
              source.link ||
              source.uri
            )
        )
        .slice(0, 8);

    if (!valid.length) {
      return "";
    }

    return `
      <div class="sources-box">

        <div class="sources-title">
          Kaynaklar
        </div>

        <div class="sources-list">

          ${valid
            .map((source) => {
              const url =
                source.url ||
                source.link ||
                source.uri;

              return `
                <a
                  class="source-item"
                  href="${escapeHTML(
                    safeURL(url)
                  )}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>
                    ${escapeHTML(
                      source.title ||
                      source.name ||
                      url
                    )}
                  </span>

                  <span>↗</span>
                </a>
              `;
            })
            .join("")}

        </div>

      </div>
    `;
  }

  function renderMessages() {
    const host =
      $("messageList");

    if (!host) {
      return;
    }

    host.innerHTML = "";

    const empty =
      $("emptyState");

    if (empty) {
      empty.hidden =
        state.messages.length >
        0;
    }

    for (
      const message of
      state.messages
    ) {
      const article =
        document.createElement(
          "article"
        );

      article.className =
        `message-row ${message.role}`;

      article.dataset.id =
        message.id;

      const name =
        state.user?.name ||
        state.user?.displayName ||
        "Sen";

      const avatar =
        message.role ===
        "user"
          ? name
              .slice(0, 1)
              .toUpperCase()
          : "T";

      article.innerHTML = `
        <div
          class="message-avatar ${message.role}"
        >
          ${escapeHTML(
            avatar
          )}
        </div>

        <div class="message-main">

          <div class="message-head">

            <strong>
              ${
                message.role ===
                "user"
                  ? escapeHTML(
                      name
                    )
                  : "TürkAI"
              }
            </strong>

            <span>
              ${formatTime(
                message.createdAt
              )}
            </span>

          </div>

          <div class="message-content">
            ${renderContent(
              message.content
            )}
          </div>

          ${
            message.sources?.length
              ? renderSources(
                  message.sources
                )
              : ""
          }

          ${
            message.mediaUrl
              ? `
                <div class="generated-media">

                  ${
                    message.mediaType ===
                    "video"
                      ? `
                        <video
                          controls
                          preload="metadata"
                        >
                          <source
                            src="${escapeHTML(
                              safeURL(
                                message.mediaUrl
                              )
                            )}"
                          >
                        </video>
                      `
                      : `
                        <img
                          src="${escapeHTML(
                            safeURL(
                              message.mediaUrl
                            )
                          )}"
                          alt="TürkAI çıktısı"
                        >
                      `
                  }

                </div>
              `
              : ""
          }

          ${
            message.role ===
            "assistant"
              ? `
                <div class="message-actions">

                  <button
                    type="button"
                    data-message-action="copy"
                  >
                    Kopyala
                  </button>

                  <button
                    type="button"
                    data-message-action="speak"
                  >
                    Seslendir
                  </button>

                  <button
                    type="button"
                    data-message-action="retry"
                  >
                    Yeniden üret
                  </button>

                </div>
              `
              : ""
          }

        </div>
      `;

      host.appendChild(
        article
      );
    }

    scrollBottom();
  }

  function scrollBottom() {
    const area =
      $("messageScrollArea");

    if (!area) {
      return;
    }

    requestAnimationFrame(
      () => {
        area.scrollTo({
          top:
            area.scrollHeight,

          behavior:
            "smooth"
        });
      }
    );
  }

  /* ============================================================
     CONVERSATIONS
     ============================================================ */

  async function loadConversations() {
    try {
      const data =
        await api(
          `/api/conversations?userId=${encodeURIComponent(
            state.userId
          )}`
        );

      const list =
        data?.conversations ||
        data?.items ||
        data?.data ||
        [];

      if (
        Array.isArray(list)
      ) {
        state.conversations =
          list
            .map(
              (conversation) => ({
                id:
                  conversation.id ||
                  conversation.conversationId,

                title:
                  conversation.title ||
                  "Yeni sohbet",

                createdAt:
                  conversation.createdAt,

                updatedAt:
                  conversation.updatedAt ||
                  conversation.createdAt
              })
            )
            .filter(
              (item) =>
                item.id
            );
      }

      renderConversations();
    } catch {
      renderConversations();
    }
  }

  function renderConversations() {
    const host =
      $("conversationList");

    if (!host) {
      return;
    }

    const list =
      [...state.conversations]
        .sort(
          (a, b) =>
            new Date(
              b.updatedAt ||
              b.createdAt ||
              0
            ) -
            new Date(
              a.updatedAt ||
              a.createdAt ||
              0
            )
        )
        .slice(0, 50);

    host.innerHTML =
      list.length
        ? list
            .map(
              (conversation) => `
                <button
                  type="button"
                  class="conversation-item ${
                    conversation.id ===
                    state.conversationId
                      ? "active"
                      : ""
                  }"
                  data-conversation-id="${escapeHTML(
                    conversation.id
                  )}"
                >

                  <span class="conversation-symbol">
                    +
                  </span>

                  <span class="conversation-info">

                    <strong>
                      ${escapeHTML(
                        conversation.title
                      )}
                    </strong>

                    <small>
                      ${formatDate(
                        conversation.updatedAt ||
                        conversation.createdAt
                      )}
                    </small>

                  </span>

                </button>
              `
            )
            .join("")
        : `
          <div class="sidebar-empty">
            Henüz sohbet yok
          </div>
        `;
  }

  async function createSession(
    title = "Yeni sohbet"
  ) {
    try {
      const data =
        await apiFirst(
          [
            "/api/chat/session/new",
            "/api/chat/session"
          ],
          {
            method: "POST",

            body:
              JSON.stringify({
                userId:
                  state.userId,

                title
              })
          }
        );

      state.sessionId =
        data?.session?.id ||
        data?.id ||
        data?.sessionId ||
        null;

      saveLocal();

      return state.sessionId;
    } catch {
      return null;
    }
  }

  async function createConversation(
    title = "Yeni sohbet"
  ) {
    try {
      const data =
        await api(
          "/api/conversations",
          {
            method:
              "POST",

            body:
              JSON.stringify({
                userId:
                  state.userId,

                title,

                model:
                  state.selectedModel
              })
          }
        );

      const conversation =
        data?.conversation ||
        data?.data ||
        data;

      if (
        conversation?.id
      ) {
        state.conversationId =
          conversation.id;
      }
    } catch {}

    if (
      !state.sessionId
    ) {
      await createSession(
        title
      );
    }

    if (
      !state.conversationId
    ) {
      state.conversationId =
        uid(
          "localchat"
        );
    }

    state.conversations =
      state.conversations.filter(
        (item) =>
          item.id !==
          state.conversationId
      );

    state.conversations.unshift({
      id:
        state.conversationId,

      title,

      createdAt:
        now(),

      updatedAt:
        now()
    });

    state.messages = [];

    saveLocal();
    renderMessages();
    renderConversations();

    return state.conversationId;
  }

  async function openConversation(
    id
  ) {
    const item =
      state.conversations.find(
        (conversation) =>
          conversation.id ===
          id
      );

    if (!item) {
      return;
    }

    state.conversationId =
      id;

    try {
      const data =
        await api(
          `/api/conversations/${encodeURIComponent(
            id
          )}?userId=${encodeURIComponent(
            state.userId
          )}`
        );

      const conversation =
        data?.conversation ||
        data?.data ||
        data;

      if (
        Array.isArray(
          conversation?.messages
        )
      ) {
        state.messages =
          conversation.messages.map(
            (message) => ({
              id:
                message.id ||
                uid("msg"),

              role:
                message.role,

              content:
                message.content ||
                "",

              createdAt:
                message.createdAt ||
                now(),

              sources:
                message.metadata
                  ?.sources ||
                message.sources ||
                []
            })
          );
      } else {
        state.messages = [];
      }
    } catch {
      state.messages = [];
    }

    await createSession(
      item.title
    );

    renderMessages();
    renderConversations();
    saveLocal();
  }

  async function saveConversationMessage(
    message
  ) {
    if (
      !state.conversationId ||
      String(
        state.conversationId
      ).startsWith(
        "localchat_"
      )
    ) {
      return;
    }

    try {
      await api(
        `/api/conversations/${encodeURIComponent(
          state.conversationId
        )}/messages`,
        {
          method:
            "POST",

          body:
            JSON.stringify({
              userId:
                state.userId,

              role:
                message.role,

              content:
                message.content,

              model:
                state.selectedModel,

              metadata: {
                sources:
                  message.sources ||
                  []
              }
            })
        }
      );
    } catch {}
  }

  /* ============================================================
     CHAT
     ============================================================ */

  function addMessage(
    role,
    content,
    extra = {}
  ) {
    const message = {
      id:
        uid("msg"),

      role,

      content:
        String(
          content || ""
        ),

      createdAt:
        now(),

      ...extra
    };

    state.messages.push(
      message
    );

    renderMessages();
    saveLocal();

    return message;
  }

  async function sendMessage(
    value
  ) {
    const message =
      String(value || "")
        .trim();

    if (
      !message ||
      state.sending
    ) {
      return;
    }

    if (
      !navigator.onLine
    ) {
      toast(
        "İnternet bağlantısı yok.",
        "error"
      );
      return;
    }

    if (
      !state.conversationId
    ) {
      await createConversation(
        message.slice(
          0,
          50
        ) ||
          "Yeni sohbet"
      );
    }

    if (
      !state.sessionId
    ) {
      await createSession(
        message.slice(
          0,
          50
        ) ||
          "Yeni sohbet"
      );
    }

    state.sending =
      true;

    setComposerBusy(
      true
    );

    const userMessage =
      addMessage(
        "user",
        message
      );

    await saveConversationMessage(
      userMessage
    );

    setStatus(
      "TürkAI düşünüyor",
      "busy"
    );

    showTyping(
      true
    );

    try {
      const data =
        await apiFirst(
          [
            "/api/chat/smart",
            "/api/chat",
            "/api/chat/v2"
          ],
          {
            method:
              "POST",

            body:
              JSON.stringify({
                userId:
                  state.userId,

                sessionId:
                  state.sessionId,

                conversationId:
                  state.conversationId,

                message,

                model:
                  state.selectedModel,

                language:
                  "tr-TR",

                memory:
                  state.memory,

                ignoreMemory:
                  !state.memory,

                research:
                  state.research,

                weather:
                  state.weather
              })
          }
        );

      if (
        data?.sessionId
      ) {
        state.sessionId =
          data.sessionId;
      }

      const answer =
        extractAnswer(
          data
        ) ||
        "Sunucudan boş yanıt geldi.";

      const assistant =
        addMessage(
          "assistant",
          answer,
          {
            sources:
              extractSources(
                data
              )
          }
        );

      await saveConversationMessage(
        assistant
      );

      state.conversations =
        state.conversations.map(
          (conversation) =>
            conversation.id ===
            state.conversationId
              ? {
                  ...conversation,
                  updatedAt:
                    now()
                }
              : conversation
        );

      renderConversations();

      saveLocal();

      setStatus(
        "Çevrimiçi",
        "online"
      );
    } catch (error) {
      let errorMessage =
        error?.message ||
        "Sunucuya bağlanılamadı.";

      if (
        error?.name ===
        "AbortError"
      ) {
        errorMessage =
          "İstek zaman aşımına uğradı.";
      }

      if (
        error?.status ===
        429
      ) {
        errorMessage =
          "Kullanım sınırına ulaşıldı.";
      }

      if (
        error?.status ===
        500
      ) {
        errorMessage =
          "Sunucuda işlem sırasında hata oluştu.";
      }

      addMessage(
        "assistant",
        `Yanıt oluşturulamadı.\n\n${errorMessage}`
      );

      toast(
        errorMessage,
        "error"
      );

      setStatus(
        "Sunucu hatası",
        "error"
      );
    } finally {
      showTyping(
        false
      );

      state.sending =
        false;

      setComposerBusy(
        false
      );
    }
  }

  function showTyping(
    visible
  ) {
    const element =
      $("typingIndicator");

    if (!element) {
      return;
    }

    element.hidden =
      !visible;

    if (visible) {
      scrollBottom();
    }
  }

  function setComposerBusy(
    busy
  ) {
    const button =
      $("sendButton");

    if (!button) {
      return;
    }

    button.disabled =
      busy;

    button.classList.toggle(
      "busy",
      busy
    );
  }
/* ============================================================
   TÜRKAI APP.JS 40.0
   EXTENSION / CONTINUATION
   ============================================================ */

(() => {
  "use strict";

  const TURKAI_APP = window.TURKAI;

  if (!TURKAI_APP) {
    console.warn(
      "[TürkAI] Ana uygulama bulunamadı."
    );
    return;
  }

  const state =
    TURKAI_APP.state || {};

  const $ =
    (id) =>
      document.getElementById(id);

  const $$ =
    (selector) =>
      [...document.querySelectorAll(selector)];

  /* ============================================================
     EXTRA CONFIG
     ============================================================ */

  const EXTRA = {
    healthInterval:
      30000,

    autosaveInterval:
      5000,

    maxDraftLength:
      20000,

    dragActiveClass:
      "drag-active",

    mobileBreakpoint:
      760
  };

  let healthTimer =
    null;

  let autosaveTimer =
    null;

  let lastHealth =
    null;

  let dragCounter =
    0;

  /* ============================================================
     SAFE HELPERS
     ============================================================ */

  function esc(value) {
    return String(
      value ?? ""
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );
  }

  function localNow() {
    return new Date();
  }

  function formatClock() {
    return new Intl.DateTimeFormat(
      "tr-TR",
      {
        hour:
          "2-digit",

        minute:
          "2-digit"
      }
    ).format(
      localNow()
    );
  }

  function extraToast(
    text,
    type = "info"
  ) {
    let stack =
      $("toastStack");

    if (!stack) {
      stack =
        document.createElement(
          "div"
        );

      stack.id =
        "toastStack";

      stack.className =
        "toast-stack";

      document.body.appendChild(
        stack
      );
    }

    const toast =
      document.createElement(
        "div"
      );

    toast.className =
      `toast ${type}`;

    toast.innerHTML = `
      <span class="toast-indicator"></span>
      <span>${esc(text)}</span>
    `;

    stack.appendChild(
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
        toast.classList.remove(
          "show"
        );

        setTimeout(
          () => {
            toast.remove();
          },
          200
        );
      },
      3000
    );
  }

  /* ============================================================
     DRAFT SYSTEM
     ============================================================ */

  const DRAFT_KEY =
    "turkai40_message_draft";

  function saveDraft() {
    const input =
      $("messageInput");

    if (!input) {
      return;
    }

    try {
      localStorage.setItem(
        DRAFT_KEY,
        input.value.slice(
          0,
          EXTRA.maxDraftLength
        )
      );
    } catch {}
  }

  function loadDraft() {
    const input =
      $("messageInput");

    if (!input) {
      return;
    }

    try {
      const draft =
        localStorage.getItem(
          DRAFT_KEY
        );

      if (
        draft &&
        !input.value
      ) {
        input.value =
          draft;

        resizeExtra();
      }
    } catch {}
  }

  function clearDraft() {
    try {
      localStorage.removeItem(
        DRAFT_KEY
      );
    } catch {}
  }

  function resizeExtra() {
    const input =
      $("messageInput");

    if (!input) {
      return;
    }

    input.style.height =
      "auto";

    input.style.height =
      `${Math.min(
        180,
        input.scrollHeight
      )}px`;
  }

  /* ============================================================
     COMMAND SHORTCUTS
     ============================================================ */

  const COMMANDS = {
    "/help":
      "TürkAI komut merkezi açılıyor.",

    "/research":
      "Araştırma modu açılıyor.",

    "/memory":
      "Hafıza modu açılıyor.",

    "/weather":
      "Hava durumu modu açılıyor.",

    "/clear":
      "Sohbet temizleme komutu.",

    "/new":
      "Yeni sohbet açılıyor."
  };

  function handleSlashCommand(
    text
  ) {
    const command =
      String(text || "")
        .trim()
        .split(/\s+/)[0]
        .toLocaleLowerCase(
          "tr-TR"
        );

    if (
      !COMMANDS[command]
    ) {
      return false;
    }

    switch (command) {
      case "/help":
        document
          .getElementById(
            "commandButton"
          )
          ?.click();
        break;

      case "/research":
        $("researchButton")
          ?.click();
        extraToast(
          "Araştırma modu değiştirildi.",
          "success"
        );
        break;

      case "/memory":
        $("memoryButton")
          ?.click();
        extraToast(
          "Hafıza modu değiştirildi.",
          "success"
        );
        break;

      case "/weather":
        $("weatherButton")
          ?.click();
        extraToast(
          "Hava modu değiştirildi.",
          "success"
        );
        break;

      case "/clear":
        clearCurrentChat();
        break;

      case "/new":
        awaitSafe(
          TURKAI_APP.newChat
        );
        break;
    }

    clearDraft();

    return true;
  }

  async function awaitSafe(
    fn
  ) {
    try {
      if (
        typeof fn ===
        "function"
      ) {
        await fn();
      }
    } catch {}
  }

  function clearCurrentChat() {
    state.messages =
      [];

    state.conversationId =
      null;

    state.sessionId =
      null;

    try {
      localStorage.removeItem(
        "turkai40_message_draft"
      );
    } catch {}

    try {
      const list =
        $("messageList");

      if (list) {
        list.innerHTML = `
          <div
            id="emptyState"
            class="empty-state"
          >
            <div class="empty-box">
              <div class="empty-logo">
                TA
              </div>

              <h1>
                Yeni sohbet
              </h1>

              <p>
                Yeni bir konuşma başlat.
              </p>
            </div>
          </div>
        `;
      }
    } catch {}

    extraToast(
      "Sohbet temizlendi.",
      "success"
    );
  }

  /* ============================================================
     ENTER COMMAND INTERCEPT
     ============================================================ */

  function bindCommandInput() {
    const input =
      $("messageInput");

    if (!input) {
      return;
    }

    input.addEventListener(
      "keydown",
      (event) => {
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

        const text =
          input.value.trim();

        if (
          text.startsWith(
            "/"
          )
        ) {
          if (
            handleSlashCommand(
              text
            )
          ) {
            event.preventDefault();
          }
        }
      }
    );
  }

  /* ============================================================
     KEYBOARD NAVIGATION
     ============================================================ */

  function bindKeyboardNavigation() {
    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.altKey &&
          event.key === "ArrowUp"
        ) {
          event.preventDefault();

          focusComposer();
        }

        if (
          event.ctrlKey &&
          event.shiftKey &&
          event.key === "N"
        ) {
          event.preventDefault();

          awaitSafe(
            TURKAI_APP.newChat
          );
        }
      }
    );
  }

  function focusComposer() {
    const input =
      $("messageInput");

    if (!input) {
      return;
    }

    input.focus();

    input.scrollIntoView({
      behavior:
        "smooth",

      block:
        "nearest"
    });
  }

  /* ============================================================
     DRAG & DROP UPLOAD
     ============================================================ */

  function setupDragAndDrop() {
    const zone =
      $("messageScrollArea") ||
      document.body;

    if (!zone) {
      return;
    }

    zone.addEventListener(
      "dragenter",
      (event) => {
        event.preventDefault();

        dragCounter++;

        document.body.classList.add(
          EXTRA.dragActiveClass
        );

        showDropOverlay(
          true
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

        dragCounter--;

        if (
          dragCounter <= 0
        ) {
          dragCounter = 0;

          document.body.classList.remove(
            EXTRA.dragActiveClass
          );

          showDropOverlay(
            false
          );
        }
      }
    );

    zone.addEventListener(
      "drop",
      async (event) => {
        event.preventDefault();

        dragCounter = 0;

        document.body.classList.remove(
          EXTRA.dragActiveClass
        );

        showDropOverlay(
          false
        );

        const files =
          [
            ...(event.dataTransfer
              ?.files || [])
          ];

        if (!files.length) {
          return;
        }

        extraToast(
          `${files.length} dosya algılandı.`,
          "success"
        );

        for (
          const file of
          files
        ) {
          await uploadViaOriginal(
            file
          );
        }
      }
    );
  }

  function showDropOverlay(
    visible
  ) {
    let overlay =
      $("dropOverlay");

    if (
      visible &&
      !overlay
    ) {
      overlay =
        document.createElement(
          "div"
        );

      overlay.id =
        "dropOverlay";

      overlay.innerHTML = `
        <div class="drop-overlay-card">
          <div class="drop-overlay-icon">
            ↓
          </div>

          <strong>
            Dosyayı bırak
          </strong>

          <span>
            TürkAI dosyayı yüklemeye hazırlayacak
          </span>
        </div>
      `;

      Object.assign(
        overlay.style,
        {
          position:
            "fixed",

          inset:
            "0",

          zIndex:
            "250",

          display:
            "grid",

          placeItems:
            "center",

          background:
            "rgba(5,7,11,.75)",

          backdropFilter:
            "blur(8px)",

          pointerEvents:
            "none"
        }
      );

      document.body.appendChild(
        overlay
      );
    }

    if (overlay) {
      overlay.hidden =
        !visible;
    }
  }

  async function uploadViaOriginal(
    file
  ) {
    try {
      /*
        Ana app.js içindeki upload fonksiyonunu
        doğrudan public API üzerinden tekrar kuruyoruz.
      */

      const form =
        new FormData();

      form.append(
        "file",
        file,
        file.name
      );

      form.append(
        "userId",
        state.userId ||
          "guest"
      );

      const accessToken =
        state.user?.accessToken;

      const headers = {};

      if (
        accessToken
      ) {
        headers.Authorization =
          `Bearer ${accessToken}`;
      }

      const response =
        await fetch(
          "/api/upload",
          {
            method:
              "POST",

            headers,

            body:
              form,

            credentials:
              "same-origin"
          }
        );

      const data =
        await response.json()
          .catch(
            () => ({})
          );

      if (
        !response.ok
      ) {
        throw new Error(
          data?.message ||
          data?.error ||
          `HTTP ${response.status}`
        );
      }

      if (
        Array.isArray(
          state.attachments
        )
      ) {
        state.attachments.push({
          id:
            `drop_${Date.now()}_${Math.random()
              .toString(36)
              .slice(2,7)}`,

          name:
            file.name,

          size:
            file.size,

          type:
            file.type,

          server:
            data
        });
      }

      extraToast(
        `${file.name} yüklendi.`,
        "success"
      );

    } catch (error) {
      extraToast(
        `${file.name}: ${error.message}`,
        "error"
      );
    }
  }

  /* ============================================================
     NETWORK HEALTH
     ============================================================ */

  async function checkServerHealth() {
    try {
      const response =
        await fetch(
          "/api/system/ping",
          {
            method:
              "GET",

            cache:
              "no-store",

            credentials:
              "same-origin"
          }
        );

      const data =
        await response
          .json()
          .catch(
            () => null
          );

      lastHealth = {
        ok:
          response.ok,

        status:
          response.status,

        data,

        checkedAt:
          new Date().toISOString()
      };

      updateHealthUI(
        lastHealth
      );

      return lastHealth;
    } catch (error) {
      lastHealth = {
        ok:
          false,

        status:
          0,

        error:
          error.message,

        checkedAt:
          new Date().toISOString()
      };

      updateHealthUI(
        lastHealth
      );

      return lastHealth;
    }
  }

  function updateHealthUI(
    health
  ) {
    const dot =
      $("statusDot");

    const text =
      $("statusText");

    if (!dot || !text) {
      return;
    }

    if (
      health?.ok
    ) {
      dot.dataset.state =
        "online";

      text.textContent =
        "Çevrimiçi";

      return;
    }

    if (
      health?.status ===
      0
    ) {
      dot.dataset.state =
        "error";

      text.textContent =
        "Bağlantı yok";

      return;
    }

    dot.dataset.state =
      "error";

    text.textContent =
      "Sunucu hatası";
  }

  function startHealthMonitor() {
    checkServerHealth();

    if (
      healthTimer
    ) {
      clearInterval(
        healthTimer
      );
    }

    healthTimer =
      setInterval(
        checkServerHealth,
        EXTRA.healthInterval
      );

    healthTimer.unref?.();
  }

  /* ============================================================
     AUTOSAVE
     ============================================================ */

  function autosave() {
    try {
      const input =
        $("messageInput");

      if (
        input &&
        input.value
      ) {
        saveDraft();
      }

      localStorage.setItem(
        "turkai40_runtime",
        JSON.stringify({
          lastSave:
            new Date().toISOString(),

          userId:
            state.userId ||
            "guest",

          conversationId:
            state.conversationId,

          sessionId:
            state.sessionId,

          selectedModel:
            state.selectedModel,

          research:
            Boolean(
              state.research
            ),

          memory:
            Boolean(
              state.memory
            ),

          weather:
            Boolean(
              state.weather
            )
        })
      );
    } catch {}
  }

  function startAutosave() {
    autosave();

    if (
      autosaveTimer
    ) {
      clearInterval(
        autosaveTimer
      );
    }

    autosaveTimer =
      setInterval(
        autosave,
        EXTRA.autosaveInterval
      );

    autosaveTimer.unref?.();
  }

  /* ============================================================
     WINDOW CLOSE PROTECTION
     ============================================================ */

  function bindUnloadSave() {
    window.addEventListener(
      "beforeunload",
      () => {
        try {
          saveDraft();
          autosave();
        } catch {}
      }
    );
  }

  /* ============================================================
     ONLINE / OFFLINE DETAIL
     ============================================================ */

  function bindConnectionEvents() {
    window.addEventListener(
      "online",
      () => {
        state.online =
          true;

        extraToast(
          "İnternet bağlantısı yeniden geldi.",
          "success"
        );

        checkServerHealth();
      }
    );

    window.addEventListener(
      "offline",
      () => {
        state.online =
          false;

        extraToast(
          "İnternet bağlantısı kesildi.",
          "error"
        );
      }
    );
  }

  /* ============================================================
     MOBILE VIEW HELPER
     ============================================================ */

  function setupMobileBehavior() {
    const handleResize =
      () => {
        const mobile =
          window.innerWidth <=
          EXTRA.mobileBreakpoint;

        document.body.classList.toggle(
          "is-mobile",
          mobile
        );

        if (
          mobile &&
          $("messageInput")
        ) {
          resizeExtra();
        }
      };

    handleResize();

    window.addEventListener(
      "resize",
      handleResize
    );
  }

  /* ============================================================
     PERSISTED DRAFT BADGE
     ============================================================ */

  function createDraftIndicator() {
    const input =
      $("messageInput");

    if (!input) {
      return;
    }

    let indicator =
      $("draftIndicator");

    if (!indicator) {
      indicator =
        document.createElement(
          "div"
        );

      indicator.id =
        "draftIndicator";

      indicator.textContent =
        "Taslak kaydediliyor";

      Object.assign(
        indicator.style,
        {
          fontSize:
            "8px",

          color:
            "var(--muted-2)",

          marginTop:
            "4px",

          paddingLeft:
            "8px",

          opacity:
            "0",

          transition:
            "opacity .2s ease"
        }
      );

      const parent =
        input.closest(
          ".composer"
        );

      parent?.appendChild(
        indicator
      );
    }

    input.addEventListener(
      "input",
      () => {
        indicator.style.opacity =
          "1";

        clearTimeout(
          indicator.__timer
        );

        indicator.__timer =
          setTimeout(
            () => {
              indicator.style.opacity =
                "0";
            },
            700
          );
      }
    );
  }

  /* ============================================================
     MESSAGE SEARCH
     ============================================================ */

  function localMessageSearch(
    query
  ) {
    const q =
      String(
        query || ""
      )
        .toLocaleLowerCase(
          "tr-TR"
        )
        .trim();

    if (!q) {
      return [];
    }

    return (
      state.messages || []
    )
      .filter(
        (message) =>
          String(
            message.content ||
              ""
          )
            .toLocaleLowerCase(
              "tr-TR"
            )
            .includes(q)
      )
      .map(
        (message) => ({
          id:
            message.id,

          role:
            message.role,

          content:
            message.content,

          createdAt:
            message.createdAt
        })
      );
  }

  function showLocalSearch(
    query
  ) {
    const results =
      localMessageSearch(
        query
      );

    if (!results.length) {
      extraToast(
        "Bu sohbette eşleşme bulunamadı."
      );

      return;
    }

    extraToast(
      `${results.length} mesaj bulundu.`,
      "success"
    );

    const first =
      results[0];

    const row =
      document.querySelector(
        `.message-row[data-id="${CSS.escape(
          first.id
        )}"]`
      );

    row?.scrollIntoView({
      behavior:
        "smooth",

      block:
        "center"
    });
  }

  /* ============================================================
     COPY FULL CONVERSATION
     ============================================================ */

  async function copyConversation() {
    const messages =
      Array.isArray(
        state.messages
      )
        ? state.messages
        : [];

    if (!messages.length) {
      extraToast(
        "Kopyalanacak mesaj yok."
      );

      return;
    }

    const text =
      messages
        .map(
          (message) => {
            const who =
              message.role ===
              "user"
                ? "Sen"
                : "TürkAI";

            return `${who}:\n${message.content}`;
          }
        )
        .join(
          "\n\n"
        );

    try {
      await navigator.clipboard.writeText(
        text
      );

      extraToast(
        "Sohbet panoya kopyalandı.",
        "success"
      );
    } catch {
      extraToast(
        "Sohbet kopyalanamadı.",
        "error"
      );
    }
  }

  /* ============================================================
     GLOBAL ACTIONS
     ============================================================ */

  window.TURKAI_EXTRA = {
    version:
      "40.0-extension",

    health:
      () => lastHealth,

    checkHealth:
      checkServerHealth,

    saveDraft,

    loadDraft,

    clearDraft,

    clearChat:
      clearCurrentChat,

    searchMessages:
      localMessageSearch,

    showSearchResult:
      showLocalSearch,

    copyConversation,

    focusComposer
  };

  /* ============================================================
     EXTRA EVENT SETUP
     ============================================================ */

  function setup() {
    loadDraft();

    bindCommandInput();

    bindKeyboardNavigation();

    setupDragAndDrop();

    startHealthMonitor();

    startAutosave();

    bindUnloadSave();

    bindConnectionEvents();

    setupMobileBehavior();

    createDraftIndicator();

    /*
      Arama kutusu varsa,
      Enter ile lokal sohbet araması.
    */
    const searchInput =
      $("conversationSearch");

    if (searchInput) {
      searchInput.addEventListener(
        "keydown",
        (event) => {
          if (
            event.key ===
            "Enter"
          ) {
            event.preventDefault();

            showLocalSearch(
              searchInput.value
            );
          }
        }
      );
    }

    /*
      Kullanıcı input yazarken taslak kaydet.
    */
    $("messageInput")
      ?.addEventListener(
        "input",
        saveDraft
      );

    /*
      İlk açılışta bağlantıyı doğrula.
    */
    setTimeout(
      checkServerHealth,
      400
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      setup,
      {
        once:
          true
      }
    );
  } else {
    setup();
  }

})();

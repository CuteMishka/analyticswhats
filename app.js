const zipInput = document.getElementById("zipInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusEl = document.getElementById("status");
const fileNameEl = document.getElementById("fileName");
const uploadLabel = document.querySelector(".upload");

const totalMessagesEl = document.getElementById("totalMessages");
const totalCallsEl = document.getElementById("totalCalls");
const totalMediaEl = document.getElementById("totalMedia");
const totalVideosEl = document.getElementById("totalVideos");
const participantsEl = document.getElementById("participants");
const topWordEl = document.getElementById("topWord");
const rareWordEl = document.getElementById("rareWord");
const topWordsEl = document.getElementById("topWords");
const reportEl = document.getElementById("report");
const funStatsEl = document.getElementById("funStats");

const STOP_WORDS = new Set([
  "и",
  "в",
  "во",
  "не",
  "что",
  "он",
  "на",
  "я",
  "с",
  "со",
  "как",
  "а",
  "то",
  "все",
  "она",
  "так",
  "его",
  "но",
  "да",
  "ты",
  "к",
  "у",
  "же",
  "вы",
  "за",
  "бы",
  "по",
  "ее",
  "мне",
  "было",
  "вот",
  "от",
  "меня",
  "еще",
  "нет",
  "о",
  "из",
  "ему",
  "теперь",
  "когда",
  "даже",
  "ну",
  "вдруг",
  "ли",
  "если",
  "уже",
  "или",
  "ни",
  "быть",
  "был",
  "него",
  "до",
  "вас",
  "нибудь",
  "опять",
  "уж",
  "вам",
  "ведь",
  "там",
  "потом",
  "себя",
  "ничего",
  "ей",
  "может",
  "они",
  "тут",
  "где",
  "есть",
  "надо",
  "ней",
  "для",
  "мы",
  "тебя",
  "их",
  "чем",
  "была",
  "сам",
  "чтоб",
  "без",
  "будто",
  "чего",
  "раз",
  "тоже",
  "себе",
  "под",
  "будет",
  "ж",
  "тогда",
  "кто",
  "этот",
  "того",
  "потому",
  "этого",
  "какой",
  "совсем",
  "ним",
  "здесь",
  "этом",
  "один",
  "почти",
  "мой",
  "тем",
  "чтобы",
  "нее",
  "сейчас",
  "были",
  "куда",
  "зачем",
  "всех",
  "никогда",
  "можно",
  "при",
  "наконец",
  "два",
  "об",
  "другой",
  "хоть",
  "после",
  "над",
  "больше",
  "тот",
  "через",
  "эти",
  "нас",
  "про",
  "всего",
  "них",
  "какая",
  "много",
  "разве",
  "три",
  "эту",
  "моя",
  "впрочем",
  "хорошо",
  "свою",
  "этой",
  "перед",
  "иногда",
  "лучше",
  "чуть",
  "том",
  "нельзя",
  "такой",
  "им",
  "более",
  "всегда",
  "конечно",
  "всю",
  "между",
  "the",
  "and",
  "to",
  "of",
  "a",
  "in",
  "is",
  "for",
  "on",
  "it",
  "this",
  "that",
  "with",
  "as",
  "are",
  "be",
  "at",
  "by",
  "or",
  "an",
  "from",
  "omitted",
  "отсутствует",
  "media",
  "video",
  "image",
  "sticker",
]);

const CALL_MARKERS = [
  "voice call",
  "video call",
  "voice call",
  "missed voice call",
  "missed video call",
  "звонок",
  "пропущенный звонок",
];

const MEDIA_MARKERS = [
  "media omitted",
  "<media omitted>",
  "video omitted",
  "<video omitted>",
  "image omitted",
  "<image omitted>",
  "gif omitted",
  "<gif omitted>",
  "document omitted",
  "<document omitted>",
  "sticker omitted",
  "<sticker omitted>",
  "sticker",
];

const VIDEO_MARKERS = ["video omitted", "<video omitted>", "video"];
const IMAGE_MARKERS = ["image omitted", "<image omitted>", "image"];
const STICKER_MARKERS = ["sticker omitted", "<sticker omitted>", "sticker"];

let selectedFile = null;

zipInput.addEventListener("change", () => {
  updateSelectedFile(zipInput.files?.[0] ?? null);
});

uploadLabel.addEventListener("dragover", (event) => {
  event.preventDefault();
  uploadLabel.classList.add("is-dragging");
});

uploadLabel.addEventListener("dragleave", () => {
  uploadLabel.classList.remove("is-dragging");
});

uploadLabel.addEventListener("drop", (event) => {
  event.preventDefault();
  uploadLabel.classList.remove("is-dragging");
  const droppedFile = event.dataTransfer?.files?.[0] ?? null;
  updateSelectedFile(droppedFile);
});

analyzeBtn.addEventListener("click", async () => {
  const file = selectedFile;
  if (!file) {
    return;
  }

  statusEl.textContent = "Читаем архив...";
  analyzeBtn.disabled = true;

  try {
    const zipData = await JSZip.loadAsync(file);
    const txtFiles = Object.values(zipData.files).filter(
      (entry) =>
        !entry.dir && entry.name.toLowerCase().endsWith(".txt")
    );

    if (txtFiles.length === 0) {
      throw new Error("В архиве нет .txt файла");
    }

    const chatText = await txtFiles[0].async("string");
    const stats = analyzeChat(chatText);
    if (stats.totalMessages === 0) {
      throw new Error("Не удалось распознать формат чата");
    }
    renderStats(stats);
    statusEl.textContent = "Готово! Статистика обновлена.";
  } catch (error) {
    statusEl.textContent = `Ошибка: ${error.message}`;
  } finally {
    analyzeBtn.disabled = false;
  }
});

function analyzeChat(text) {
  const messages = parseMessages(text);
  const messageCounts = {};
  const wordCounts = {};
  let totalMessages = 0;
  let totalCalls = 0;
  let totalMedia = 0;
  let totalVideos = 0;
  let totalImages = 0;
  let totalStickers = 0;
  let totalCharacters = 0;
  let maxMessageLength = 0;
  let longestMessageSender = "—";
  let emojiCount = 0;
  let longestStreak = 0;
  let currentStreak = 0;
  let lastSender = null;

  for (const { sender, message } of messages) {
    totalMessages += 1;
    messageCounts[sender] = (messageCounts[sender] || 0) + 1;

    const lowered = message.toLowerCase();
    if (containsMarker(lowered, CALL_MARKERS)) {
      totalCalls += 1;
    }
    if (containsMarker(lowered, MEDIA_MARKERS)) {
      totalMedia += 1;
    }
    if (containsMarker(lowered, VIDEO_MARKERS)) {
      totalVideos += 1;
    }
    if (containsMarker(lowered, IMAGE_MARKERS)) {
      totalImages += 1;
    }
    if (containsMarker(lowered, STICKER_MARKERS)) {
      totalStickers += 1;
    }

    const words = tokenize(message);
    for (const word of words) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }

    totalCharacters += message.length;
    emojiCount += countEmojis(message);
    if (message.length > maxMessageLength) {
      maxMessageLength = message.length;
      longestMessageSender = sender;
    }
    if (lastSender === sender) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
      lastSender = sender;
    }
    longestStreak = Math.max(longestStreak, currentStreak);
  }

  const sortedWords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]);
  const topWord = sortedWords[0]?.[0] ?? "—";
  const rareWord =
    sortedWords.length > 0
      ? sortedWords[sortedWords.length - 1][0]
      : "—";

  const avgMessageLength = totalMessages
    ? Math.round(totalCharacters / totalMessages)
    : 0;

  return {
    totalMessages,
    totalCalls,
    totalMedia,
    totalVideos,
    totalImages,
    totalStickers,
    messageCounts,
    topWord,
    rareWord,
    topWords: sortedWords.slice(0, 10),
    totalCharacters,
    avgMessageLength,
    longestMessageSender,
    maxMessageLength,
    emojiCount,
    longestStreak,
  };
}

function parseMessages(text) {
  const lines = text.split(/\r?\n/);
  const messages = [];
  for (const line of lines) {
    if (!line) {
      continue;
    }
    const parsed = parseLineHeader(line);
    if (parsed) {
      messages.push(parsed);
    } else if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      lastMessage.message = `${lastMessage.message}\n${line}`.trim();
    }
  }
  return messages;
}

function parseLineHeader(line) {
  const cleanedLine = line
    .replace(/^\uFEFF/, "")
    .replace(/^[\u200E\u200F]/, "")
    .replace(/\u202F/g, " ")
    .trim();
  const match =
    cleanedLine.match(
      /^(\d{1,4}[./-]\d{1,2}[./-]\d{1,4}),?\s(\d{1,2}:\d{2}(?::\d{2})?)(?:\s?[APMapm]{2})?\s[-–]\s([^:]+):\s(.+)$/
    ) ||
    cleanedLine.match(
      /^\[(\d{1,4}[./-]\d{1,2}[./-]\d{1,4}),?\s(\d{1,2}:\d{2}(?::\d{2})?)(?:\s?[APMapm]{2})?\]\s([^:]+):\s(.+)$/
    );

  if (!match) {
    return null;
  }

  return {
    sender: match[3].trim(),
    message: match[4].trim(),
  };
}

function tokenize(message) {
  return message
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[\d\p{P}\p{S}]+/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function containsMarker(text, markers) {
  return markers.some((marker) => text.includes(marker));
}

function renderStats(stats) {
  totalMessagesEl.textContent = stats.totalMessages.toLocaleString("ru-RU");
  totalCallsEl.textContent = stats.totalCalls.toLocaleString("ru-RU");
  totalMediaEl.textContent = stats.totalMedia.toLocaleString("ru-RU");
  totalVideosEl.textContent = stats.totalVideos.toLocaleString("ru-RU");

  participantsEl.innerHTML = "";
  const sortedParticipants = Object.entries(stats.messageCounts).sort(
    (a, b) => b[1] - a[1]
  );
  sortedParticipants.forEach(([name, count]) => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `<strong>${name}</strong><span>${count}</span>`;
    participantsEl.appendChild(item);
  });

  topWordEl.textContent = stats.topWord;
  rareWordEl.textContent = stats.rareWord;

  topWordsEl.innerHTML = "";
  stats.topWords.forEach(([word, count]) => {
    const li = document.createElement("li");
    li.textContent = `${word} — ${count}`;
    topWordsEl.appendChild(li);
  });

  reportEl.textContent = buildReport(stats);
  funStatsEl.innerHTML = renderFunStats(stats);
}

function updateSelectedFile(file) {
  if (!file) {
    fileNameEl.textContent = "Файл не выбран";
    analyzeBtn.disabled = true;
    selectedFile = null;
    return;
  }

  if (!file.name.toLowerCase().endsWith(".zip")) {
    statusEl.textContent = "Пожалуйста, выберите .zip архив";
    analyzeBtn.disabled = true;
    selectedFile = null;
    return;
  }

  selectedFile = file;
  fileNameEl.textContent = file.name;
  analyzeBtn.disabled = false;
  statusEl.textContent = "";
}

function buildReport(stats) {
  const participants = Object.keys(stats.messageCounts).length;
  return [
    `Участников: ${participants}.`,
    `Сообщений: ${stats.totalMessages}.`,
    `Медиа (без вложений): ${stats.totalMedia}, изображения: ${stats.totalImages}, видео: ${stats.totalVideos}, стикеры: ${stats.totalStickers}.`,
    `Звонки: ${stats.totalCalls}.`,
    `Самое частое слово: ${stats.topWord}.`,
    `Средняя длина сообщения: ${stats.avgMessageLength} символов.`,
  ].join(" ");
}

function renderFunStats(stats) {
  const funItems = [
    {
      title: "Самое длинное сообщение",
      value: `${stats.maxMessageLength} символов`,
      subtitle: `Автор: ${stats.longestMessageSender}`,
    },
    {
      title: "Эмодзи-шторм",
      value: `${stats.emojiCount} эмодзи`,
      subtitle: "Считаем все emoji в тексте",
    },
    {
      title: "Серия сообщений",
      value: `${stats.longestStreak} подряд`,
      subtitle: "Самая длинная серия от одного автора",
    },
  ];

  return funItems
    .map(
      (item) => `
      <div class="fun-card">
        <h4>${item.title}</h4>
        <p class="fun-value">${item.value}</p>
        <p class="fun-subtitle">${item.subtitle}</p>
      </div>
    `
    )
    .join("");
}

function countEmojis(text) {
  const matches = text.match(/\p{Extended_Pictographic}/gu);
  return matches ? matches.length : 0;
}

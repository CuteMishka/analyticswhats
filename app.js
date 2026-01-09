const zipInput = document.getElementById("zipInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusEl = document.getElementById("status");
const fileNameEl = document.getElementById("fileName");

const totalMessagesEl = document.getElementById("totalMessages");
const totalCallsEl = document.getElementById("totalCalls");
const totalMediaEl = document.getElementById("totalMedia");
const totalVideosEl = document.getElementById("totalVideos");
const participantsEl = document.getElementById("participants");
const topWordEl = document.getElementById("topWord");
const rareWordEl = document.getElementById("rareWord");
const topWordsEl = document.getElementById("topWords");

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
];

const VIDEO_MARKERS = ["video omitted", "<video omitted>", "video"];

zipInput.addEventListener("change", () => {
  const file = zipInput.files?.[0];
  if (!file) {
    fileNameEl.textContent = "Файл не выбран";
    analyzeBtn.disabled = true;
    return;
  }

  fileNameEl.textContent = file.name;
  analyzeBtn.disabled = false;
  statusEl.textContent = "";
});

analyzeBtn.addEventListener("click", async () => {
  const file = zipInput.files?.[0];
  if (!file) {
    return;
  }

  statusEl.textContent = "Читаем архив...";
  analyzeBtn.disabled = true;

  try {
    const zipData = await JSZip.loadAsync(file);
    const txtFiles = Object.values(zipData.files).filter((entry) =>
      entry.name.toLowerCase().endsWith(".txt")
    );

    if (txtFiles.length === 0) {
      throw new Error("В архиве нет .txt файла");
    }

    const chatText = await txtFiles[0].async("string");
    const stats = analyzeChat(chatText);
    renderStats(stats);
    statusEl.textContent = "Готово! Статистика обновлена.";
  } catch (error) {
    statusEl.textContent = `Ошибка: ${error.message}`;
  } finally {
    analyzeBtn.disabled = false;
  }
});

function analyzeChat(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const messageCounts = {};
  const wordCounts = {};
  let totalMessages = 0;
  let totalCalls = 0;
  let totalMedia = 0;
  let totalVideos = 0;

  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) {
      continue;
    }
    const { sender, message } = parsed;
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

    const words = tokenize(message);
    for (const word of words) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  }

  const sortedWords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]);
  const topWord = sortedWords[0]?.[0] ?? "—";
  const rareWord =
    sortedWords.length > 0
      ? sortedWords[sortedWords.length - 1][0]
      : "—";

  return {
    totalMessages,
    totalCalls,
    totalMedia,
    totalVideos,
    messageCounts,
    topWord,
    rareWord,
    topWords: sortedWords.slice(0, 10),
  };
}

function parseLine(line) {
  const match =
    line.match(
      /^(\d{1,2}[./]\d{1,2}[./]\d{2,4}),?\s(\d{1,2}:\d{2})(?:\s?[APMapm]{2})?\s[-–]\s([^:]+):\s(.+)$/
    ) ||
    line.match(
      /^\[(\d{1,2}[./]\d{1,2}[./]\d{2,4}),?\s(\d{1,2}:\d{2})(?:\s?[APMapm]{2})?\]\s([^:]+):\s(.+)$/
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
}

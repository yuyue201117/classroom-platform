
"use strict";

// 請先修改這個管理者密碼。
// 注意：這只是前端介面限制，不是真正安全的身分驗證。
const ADMIN_PASSWORD = "change-this-password";

const STORAGE_KEY = "classroom-platform-v1";
const $ = (id) => document.getElementById(id);

let isAdmin = false;
let editingAnnouncementId = null;
let toastTimer = null;

let appData = loadData();

function emptyData() {
  return {
    announcements: [],
    exams: [],
    seats: null
  };
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return emptyData();
    }

    const data = JSON.parse(saved);

    return {
      announcements: Array.isArray(data.announcements)
        ? data.announcements : [],
      exams: Array.isArray(data.exams)
        ? data.exams : [],
      seats: data.seats || null
    };
  } catch (error) {
    console.error("讀取本機資料失敗：", error);
    return emptyData();
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    return true;
  } catch (error) {
    console.error("儲存本機資料失敗：", error);
    showToast("資料儲存失敗，請檢查瀏覽器儲存空間。");
    return false;
  }
}

function createId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseLocalDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function daysUntil(dateString) {
  const target = parseLocalDate(dateString);

  if (!target) {
    return null;
  }

  const today = parseLocalDate(localDateString());
  return Math.round((target - today) / 86400000);
}

function formatDate(dateString) {
  const date = parseLocalDate(dateString);

  if (!date) {
    return "日期無效";
  }

  return date.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

// 首頁日期
function renderToday() {
  $("todayDate").textContent = new Date().toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  });
}

// 管理者介面
function renderAdmin() {
  $("adminButton").textContent = isAdmin
    ? "登出管理者"
    : "管理者登入";

  $("announcementEditor").classList.toggle("hidden", !isAdmin);
  $("examEditor").classList.toggle("hidden", !isAdmin);

  renderAnnouncements();
  renderExams();
}

$("adminButton").addEventListener("click", () => {
  if (isAdmin) {
    isAdmin = false;
    editingAnnouncementId = null;
    $("announcementForm").reset();
    $("announcementForm").querySelector('button[type="submit"]')
      .textContent = "發布公告";

    renderAdmin();
    showToast("已登出管理者模式。");
    return;
  }

  const password = window.prompt("請輸入管理者密碼：");

  if (password === null) {
    return;
  }

  if (password === ADMIN_PASSWORD) {
    isAdmin = true;
    renderAdmin();
    showToast("已進入管理者模式。");
  } else {
    showToast("密碼錯誤，無法進入管理者模式。");
  }
});

// 公告功能
function renderAnnouncements() {
  const list = $("announcementList");

  if (appData.announcements.length === 0) {
    list.innerHTML = `
      <div class="panel">
        <p>目前還沒有班級公告。</p>
        <p class="card-meta">管理者登入後可以新增公告。</p>
      </div>`;
    return;
  }

  const sorted = [...appData.announcements].sort(
    (a, b) => b.createdAt - a.createdAt
  );

  list.innerHTML = sorted.map((item) => `
    <article class="announcement-card">
      <span class="card-meta">
        公告日期：${escapeHTML(formatDate(item.date))}
      </span>
      <h3>${escapeHTML(item.title)}</h3>
      <p>${escapeHTML(item.content)}</p>
      ${isAdmin ? `
        <div class="card-actions">
          <button class="small-button"
            data-action="edit-announcement"
            data-id="${escapeHTML(item.id)}">編輯</button>
          <button class="small-button"
            data-action="delete-announcement"
            data-id="${escapeHTML(item.id)}">刪除</button>
        </div>` : ""}
    </article>
  `).join("");
}

$("announcementForm").addEventListener("submit", (event) => {
  event.preventDefault();

  if (!isAdmin) {
    showToast("請先登入管理者。");
    return;
  }

  const title = $("announcementTitle").value.trim();
  const content = $("announcementContent").value.trim();

  if (!title || !content) {
    showToast("請填寫公告標題和內容。");
    return;
  }

  if (editingAnnouncementId) {
    const item = appData.announcements.find(
      (entry) => entry.id === editingAnnouncementId
    );

    if (item) {
      item.title = title;
      item.content = content;
    }
  } else {
    appData.announcements.push({
      id: createId(),
      title,
      content,
      date: localDateString(),
      createdAt: Date.now()
    });
  }

  saveData();
  editingAnnouncementId = null;
  $("announcementForm").reset();
  $("announcementForm").querySelector('button[type="submit"]')
    .textContent = "發布公告";

  renderAnnouncements();
  showToast("公告已儲存到目前瀏覽器。");
});

$("announcementList").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button || !isAdmin) {
    return;
  }

  const id = button.dataset.id;
  const action = button.dataset.action;
  const item = appData.announcements.find(
    (entry) => entry.id === id
  );

  if (!item) {
    return;
  }

  if (action === "edit-announcement") {
    editingAnnouncementId = id;
    $("announcementTitle").value = item.title;
    $("announcementContent").value = item.content;
    $("announcementForm").querySelector('button[type="submit"]')
      .textContent = "儲存修改";

    $("announcementEditor").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  if (action === "delete-announcement") {
    if (!window.confirm(`確定刪除公告「${item.title}」嗎？`)) {
      return;
    }

    appData.announcements = appData.announcements.filter(
      (entry) => entry.id !== id
    );

    saveData();
    renderAnnouncements();
    showToast("公告已刪除。");
  }
});

// 考試倒數功能
function renderExams() {
  const list = $("examList");

  if (appData.exams.length === 0) {
    list.innerHTML = `
      <div class="panel">
        <p>目前沒有考試日期。</p>
        <p class="card-meta">管理者登入後可以新增考試。</p>
      </div>`;
    return;
  }

  const sorted = [...appData.exams].sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  list.innerHTML = sorted.map((exam) => {
    const days = daysUntil(exam.date);

    let countdown = "日期無效";

    if (days !== null) {
      if (days > 0) {
        countdown = `剩餘 ${days} 天`;
      } else if (days === 0) {
        countdown = "今天考試";
      } else {
        countdown = `已過 ${Math.abs(days)} 天`;
      }
    }

    return `
      <article class="exam-card">
        <span class="card-meta">考試日期：${escapeHTML(formatDate(exam.date))}</span>
        <h3>${escapeHTML(exam.name)}</h3>
        <div class="exam-days">${escapeHTML(countdown)}</div>
        ${isAdmin ? `
          <div class="card-actions">
            <button class="small-button"
              data-action="edit-exam"
              data-id="${escapeHTML(exam.id)}">修改</button>
            <button class="small-button"
              data-action="delete-exam"
              data-id="${escapeHTML(exam.id)}">刪除</button>
          </div>` : ""}
      </article>`;
  }).join("");
}

$("examForm").addEventListener("submit", (event) => {
  event.preventDefault();

  if (!isAdmin) {
    showToast("請先登入管理者。");
    return;
  }

  const name = $("examName").value.trim();
  const date = $("examDate").value;

  if (!name || !parseLocalDate(date)) {
    showToast("請輸入正確的考試名稱與日期。");
    return;
  }

  appData.exams.push({
    id: createId(),
    name,
    date
  });

  saveData();
  $("examForm").reset();
  renderExams();
  showToast("考試日期已新增。");
});

$("examList").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button || !isAdmin) {
    return;
  }

  const exam = appData.exams.find(
    (item) => item.id === button.dataset.id
  );

  if (!exam) {
    return;
  }

  if (button.dataset.action === "edit-exam") {
    const name = window.prompt("修改考試名稱：", exam.name);

    if (name === null) {
      return;
    }

    const cleanName = name.trim();

    if (!cleanName) {
      showToast("考試名稱不能空白。");
      return;
    }

    const date = window.prompt(
      "修改考試日期（YYYY-MM-DD）：",
      exam.date
    );

    if (date === null) {
      return;
    }

    if (!parseLocalDate(date)) {
      showToast("日期格式不正確，請使用 YYYY-MM-DD。");
      return;
    }

    exam.name = cleanName;
    exam.date = date;
    saveData();
    renderExams();
    showToast("考試資料已修改。");
  }

  if (button.dataset.action === "delete-exam") {
    if (!window.confirm(`確定刪除「${exam.name}」嗎？`)) {
      return;
    }

    appData.exams = appData.exams.filter(
      (item) => item.id !== exam.id
    );

    saveData();
    renderExams();
    showToast("考試已刪除。");
  }
});

// 座位抽籤功能
let seatState = null;

function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function renderSeats() {
  const grid = $("seatGrid");
  grid.innerHTML = "";

  if (!seatState) {
    grid.style.gridTemplateColumns = "";
    return;
  }

  grid.style.gridTemplateColumns =
    `repeat(${seatState.cols}, minmax(0, 1fr))`;

  seatState.seats.forEach((seat) => {
    const cell = document.createElement("div");
    cell.className = "seat";

    if (seat.blocked) {
      cell.classList.add("blocked");
    }

    if (seat.name) {
      cell.classList.add("drawn");
    }

    const number = document.createElement("span");
    number.className = "seat-number";
    number.textContent = `${seat.row}-${seat.col}`;

    const name = document.createElement("span");
    name.className = "seat-name";
    name.textContent = seat.blocked
      ? "不可坐"
      : seat.name || "待抽選";

    cell.append(number, name);
    grid.appendChild(cell);
  });

  $("drawNext").disabled = seatState.remaining.length === 0;
  $("resetSeats").disabled = seatState.drawn.length === 0;
}

function prepareSeats() {
  const names = $("studentNames").value
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);

  const rows = Number($("seatRows").value);
  const cols = Number($("seatCols").value);

  if (names.length === 0) {
    showToast("請至少輸入一位學生姓名。");
    return;
  }

  if (new Set(names).size !== names.length) {
    showToast("名單中有重複姓名，請先檢查。");
    return;
  }

  if (
    !Number.isInteger(rows) ||
    !Number.isInteger(cols) ||
    rows < 1 || rows > 10 ||
    cols < 1 || cols > 10
  ) {
    showToast("排數與列數必須介於 1 到 10。");
    return;
  }

  const blocked = $("blockedSeats").checked &&
    rows === 6 && cols === 6;

  const seats = [];

  for (let row = 1; row <= rows; row++) {
    for (let col = 1; col <= cols; col++) {
      const isBlocked = blocked &&
        row === 6 && (col === 1 || col === 6);

      seats.push({
        row,
        col,
        blocked: isBlocked,
        name: null
      });
    }
  }

  const availableCount = seats.filter(
    (seat) => !seat.blocked
  ).length;

  if (names.length > availableCount) {
    showToast(`有 ${names.length} 位學生，但只有 ${availableCount} 個可用座位。`);
    return;
  }

  seatState = {
    rows,
    cols,
    seats,
    remaining: shuffle(names),
    drawn: []
  };

  $("seatResult").textContent = "";
  $("seatStatus").textContent =
    `共有 ${names.length} 位學生，${availableCount} 個可用座位。`;

  renderSeats();
  showToast("座位已準備好，開始抽籤吧！");
}

function drawNextSeat() {
  if (!seatState || seatState.remaining.length === 0) {
    showToast("所有學生都已抽完。");
    return;
  }

  const name = seatState.remaining.pop();

  const availableSeats = seatState.seats.filter(
    (seat) => !seat.blocked && !seat.name
  );

  if (availableSeats.length === 0) {
    showToast("已沒有空座位。");
    return;
  }

  const seat = availableSeats[
    Math.floor(Math.random() * availableSeats.length)
  ];

  seat.name = name;
  seatState.drawn.push({
    name,
    row: seat.row,
    col: seat.col
  });

  $("seatResult").textContent =
    `抽中：${name}　座位：第 ${seat.row} 排、第 ${seat.col} 個`;

  $("seatStatus").textContent =
    `已抽出 ${seatState.drawn.length} / ${
      seatState.drawn.length + seatState.remaining.length
    } 位學生。`;

  renderSeats();

  if (seatState.remaining.length === 0) {
    $("seatStatus").textContent = "抽籤完成，所有學生均已安排座位。";
    showToast("抽籤完成！");
  }
}

function resetSeats() {
  if (!seatState) {
    return;
  }

  const names = [
    ...seatState.drawn.map((item) => item.name),
    ...seatState.remaining
  ];

  seatState.seats.forEach((seat) => {
    seat.name = null;
  });

  seatState.remaining = shuffle(names);
  seatState.drawn = [];

  $("seatResult").textContent = "";
  $("seatStatus").textContent = "已重新抽籤，可以再次開始。";

  renderSeats();
}

$("prepareSeats").addEventListener("click", prepareSeats);
$("drawNext").addEventListener("click", drawNextSeat);
$("resetSeats").addEventListener("click", resetSeats);

// 成績計算器
function addGradeRow(subject = "", score = "", weight = "1") {
  const row = document.createElement("tr");

  const subjectCell = document.createElement("td");
  const subjectInput = document.createElement("input");
  subjectInput.className = "subject-input";
  subjectInput.type = "text";
  subjectInput.maxLength = 50;
  subjectInput.placeholder = "科目名稱";
  subjectInput.value = subject;
  subjectInput.setAttribute("aria-label", "科目名稱");
  subjectCell.appendChild(subjectInput);

  const scoreCell = document.createElement("td");
  const scoreInput = document.createElement("input");
  scoreInput.type = "number";
  scoreInput.min = "0";
  scoreInput.max = "100";
  scoreInput.step = "any";
  scoreInput.placeholder = "0–100";
  scoreInput.value = score;
  scoreInput.setAttribute("aria-label", "科目成績");
  scoreCell.appendChild(scoreInput);

  const weightCell = document.createElement("td");
  const weightInput = document.createElement("input");
  weightInput.type = "number";
  weightInput.min = "0.01";
  weightInput.max = "1000";
  weightInput.step = "any";
  weightInput.value = weight;
  weightInput.setAttribute("aria-label", "科目權重");
  weightCell.appendChild(weightInput);

  const actionCell = document.createElement("td");
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "small-button";
  removeButton.textContent = "刪除";
  removeButton.setAttribute("aria-label", "刪除此科目");

  removeButton.addEventListener("click", () => {
    row.remove();

    if ($("gradeRows").children.length === 0) {
      addGradeRow();
    }

    calculateGrades();
  });

  actionCell.appendChild(removeButton);
  row.append(subjectCell, scoreCell, weightCell, actionCell);
  $("gradeRows").appendChild(row);
}

function calculateGrades() {
  const rows = [...$("gradeRows").querySelectorAll("tr")];

  let weightedTotal = 0;
  let totalWeight = 0;
  let validCount = 0;
  let hasInvalid = false;

  for (const row of rows) {
    const inputs = row.querySelectorAll("input");
    const subject = inputs[0].value.trim();
    const scoreText = inputs[1].value;
    const weightText = inputs[2].value;

    if (!subject && !scoreText && !weightText) {
      continue;
    }

    const score = Number(scoreText);
    const weight = Number(weightText);

    if (
      !subject ||
      scoreText === "" ||
      weightText === "" ||
      !Number.isFinite(score) ||
      !Number.isFinite(weight) ||
      score < 0 || score > 100 ||
      weight <= 0
    ) {
      hasInvalid = true;
      continue;
    }

    weightedTotal += score * weight;
    totalWeight += weight;
    validCount++;
  }

  if (hasInvalid) {
    $("gradeAverage").textContent = "—";
    $("gradeMessage").textContent =
      "請檢查每一列：科目不可空白、成績需為 0–100、權重必須大於 0。";
    return;
  }

  if (validCount === 0 || totalWeight === 0) {
    $("gradeAverage").textContent = "—";
    $("gradeMessage").textContent = "請至少輸入一筆完整成績。";
    return;
  }

  const average = weightedTotal / totalWeight;
  $("gradeAverage").textContent = average.toFixed(2);

  $("gradeMessage").textContent = average >= 60
    ? "依照 60 分為及格標準，目前加權平均已達及格。"
    : "依照 60 分為及格標準，目前加權平均尚未及格。";
}

$("addGrade").addEventListener("click", () => addGradeRow());
$("calculateGrades").addEventListener("click", calculateGrades);

// 啟動網站
function init() {
  renderToday();
  renderAdmin();
  addGradeRow("國文", "", "1");
  addGradeRow("英文", "", "1");
  addGradeRow("數學", "", "1");

  $("examDate").min = localDateString();
}

init();

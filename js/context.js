// DOM references grouped by the UI areas they belong to.

// Summary and stats.
const currentStreakValue = document.getElementById("current-streak-value");
const currentRateValue = document.getElementById("current-rate-value");
const totalEarnedValue = document.getElementById("total-earned-value");
const spendOpenButton = document.getElementById("spend-open-button");

// Daily actions.
const dailyCheckinButton = document.getElementById("daily-checkin-button");
const dailySkipButton = document.getElementById("daily-skip-button");

// Test / admin actions.
const testAddDayButton = document.getElementById("test-add-day-button");
const testWorkDayButton = document.getElementById("test-work-day-button");
const resetProgressButton = document.getElementById("reset-progress-button");
const todoDoneButton = document.getElementById("todo-done-button");
const adminLauncherButton = document.getElementById("admin-launcher-button");

// Calendar and history.
const wheelStatus = document.getElementById("wheel-status");
const spinWheelButton = document.getElementById("spin-wheel-button");
const calendarTitle = document.getElementById("calendar-title");
const calendarGrid = document.getElementById("calendar-grid");
const calendarPrevButton = document.getElementById("calendar-prev-button");
const calendarNextButton = document.getElementById("calendar-next-button");
const workHistorySection = document.getElementById("work-history-section");
const adminTodoPanel = document.getElementById("admin-todo-panel");
const adminTodoList = document.getElementById("admin-todo-list");
const settingsOpenButton = document.getElementById("settings-open-button");

// Todo panel.
const todoDateLabel = document.getElementById("todo-date-label");
const todoAddRow = document.getElementById("todo-add-row");
const todoInput = document.getElementById("todo-input");
const todoList = document.getElementById("todo-list");

// Information widget.
const infoCurrentRate = document.getElementById("info-current-rate");
const infoBalance = document.getElementById("info-balance");
const infoLastWorkDays = document.getElementById("info-last-work-days");

// Modals and popups.
const adminOverlay = document.getElementById("admin-overlay");
const adminCloseButton = document.getElementById("admin-close-button");
const calendarEditOverlay = document.getElementById("calendar-edit-overlay");
const calendarEditDate = document.getElementById("calendar-edit-date");
const calendarEditCloseButton = document.getElementById("calendar-edit-close-button");
const calendarEditWorkButton = document.getElementById("calendar-edit-work-button");
const calendarEditSkipButton = document.getElementById("calendar-edit-skip-button");
const workErrorOverlay = document.getElementById("work-error-overlay");
const workErrorOkButton = document.getElementById("work-error-ok-button");
const wheelPrizeOverlay = document.getElementById("wheel-prize-overlay");
const wheelPrizeMessage = document.getElementById("wheel-prize-message");
const wheelPrizeThanksButton = document.getElementById("wheel-prize-thanks-button");
const wheelOverlay = document.getElementById("wheel-overlay");
const wheelCloseButton = document.getElementById("wheel-close-button");
const wheelLeverButton = document.getElementById("wheel-lever-button");
const fortuneWheel = document.getElementById("fortune-wheel");
const wheelResultText = document.getElementById("wheel-result-text");
const settingsOverlay = document.getElementById("settings-overlay");
const settingsCloseButton = document.getElementById("settings-close-button");
const introOverlay = document.getElementById("intro-overlay");
const introCloseButton = document.getElementById("intro-close-button");
const introStartButton = document.getElementById("intro-start-button");
const introDontShowCheckbox = document.getElementById("intro-dont-show-checkbox");
const spendOverlay = document.getElementById("spend-overlay");
const spendCloseButton = document.getElementById("spend-close-button");
const spendAmountInput = document.getElementById("spend-amount-input");
const spendConfirmButton = document.getElementById("spend-confirm-button");
const spendHistoryButton = document.getElementById("spend-history-button");
const spendCancelButton = document.getElementById("spend-cancel-button");
const spendMaxNote = document.getElementById("spend-max-note");
const spendHistoryPanel = document.getElementById("spend-history-panel");
const spendHistoryList = document.getElementById("spend-history-list");

// Shared constants.
const STORAGE_KEY = "dollar-streak-95-state";
const INTRO_STORAGE_KEY = "dollar-streak-95-intro-hidden";
const TODO_STORAGE_KEY = "dollar-streak-95-todo-state";
const CYCLE_LENGTH_DAYS = 30;
const WHEEL_SPIN_DURATION_MS = 2800;
const MAX_TODO_ITEMS_PER_DAY = 8;

// Application state.
let currentStreak = 0;
let totalEarned = 0;
let todayRate = 1;
let historyDays = [];
let usedWheelMilestones = [];
let lastSpinResult = "";
let cycleStartDate = "";
let lastWorkDate = "";
let wheelPopupOpen = false;
let wheelIsSpinning = false;
let wheelRotation = 0;
let wheelSpinTimer = null;
let wheelPendingResult = "";
let wheelPendingSlotIndex = 0;
let wheelResultMessage = "Нажмите на центр, чтобы начать";
let wheelPrizePopupOpen = false;
let settingsPopupOpen = false;
let introPopupOpen = false;
let introHidden = false;
let spendPopupOpen = false;
let spendHistoryOpen = false;
let adminPopupOpen = false;
let calendarEditPopupOpen = false;
let calendarEditSelectedDateKey = "";
let adminTestCursorDateKey = getLocalDateKey();
let calendarMonthOffset = 0;
let expenseHistory = [];
let todoItems = [];
let completedTodoItems = [];
let todoNextId = 1;
let todoCompletionTimers = new Map();
let todoCompletingIds = new Set();

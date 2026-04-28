// Calendar and history helpers.

function getLatestHistoryDateKey() {
    let latestDateKey = getLocalDateKey();

    for (const entry of historyDays) {
        if (isValidDateKey(entry.dateKey) && entry.dateKey > latestDateKey) {
            latestDateKey = entry.dateKey;
        }
    }

    return latestDateKey;
}

function getHistoryEntryIndexByDateKey(dateKey) {
    return historyDays.findIndex((entry) => entry.dateKey === dateKey);
}

function getHistoryEntryByDateKey(dateKey) {
    const entryIndex = getHistoryEntryIndexByDateKey(dateKey);

    return entryIndex >= 0 ? historyDays[entryIndex] : null;
}

function getPaidSkipTargetDateKey() {
    const todayKey = getLocalDateKey();
    const todayEntry = getHistoryEntryByDateKey(todayKey);

    if (!todayEntry || todayEntry.type === "skip_day") {
        return todayKey;
    }

    return shiftDateKey(getLatestHistoryDateKey(), 1);
}

function getSkipDayCountForWeek(weekStartKey) {
    return historyDays.filter((entry) => entry.type === "skip_day" && typeof entry.dateKey === "string" && getDaysBetween(weekStartKey, entry.dateKey) >= 0 && getDaysBetween(weekStartKey, entry.dateKey) < 7).length;
}

function getSkipPenaltyPercent(skipDayCount) {
    if (skipDayCount >= 6) {
        return 100;
    }

    if (skipDayCount === 5) {
        return 75;
    }

    if (skipDayCount === 4) {
        return 50;
    }

    if (skipDayCount === 3) {
        return 25;
    }

    return 0;
}

function applyWeeklySkipPenalty(dateKey) {
    const previousBalance = totalEarned;
    const skipDayCount = getSkipDayCountForWeek(getWeekStartKey(dateKey));
    const penaltyPercent = getSkipPenaltyPercent(skipDayCount);

    if (penaltyPercent <= 0 || totalEarned <= 0) {
        return;
    }

    const penaltyAmount = Math.ceil(totalEarned * (penaltyPercent / 100));

    if (penaltyAmount > 0) {
        totalEarned = Math.max(-MAX_BALANCE_OVERDRAFT, totalEarned - penaltyAmount);
        if (previousBalance >= 0 && totalEarned < 0) {
            lastDebtAccrualDate = getLocalDateKey();
        }
    }
}

function anchorDebtAccrualIfNeeded(previousBalance) {
    if (previousBalance >= 0 && totalEarned < 0) {
        lastDebtAccrualDate = getLocalDateKey();
    }
}

function applyDailyDebtAccrual() {
    const todayKey = getLocalDateKey();

    if (!isValidDateKey(lastDebtAccrualDate)) {
        lastDebtAccrualDate = todayKey;
        return false;
    }

    if (totalEarned >= 0) {
        lastDebtAccrualDate = todayKey;
        return false;
    }

    let accrualDateKey = shiftDateKey(lastDebtAccrualDate, 1);
    let changed = false;

    while (
        isValidDateKey(accrualDateKey)
        && getDaysBetween(accrualDateKey, todayKey) >= 0
        && totalEarned < 0
    ) {
        totalEarned = Math.max(-MAX_BALANCE_OVERDRAFT, totalEarned - DAILY_DEBT_ACCRUAL);
        lastDebtAccrualDate = accrualDateKey;
        changed = true;

        if (totalEarned <= -MAX_BALANCE_OVERDRAFT) {
            lastDebtAccrualDate = todayKey;
            break;
        }

        accrualDateKey = shiftDateKey(accrualDateKey, 1);
    }

    return changed;
}

function resetFullProgressState() {
    currentStreak = 0;
    totalEarned = 0;
    todayRate = 100;
    historyDays = [];
    usedWheelMilestones = [];
    lastSpinResult = "";
    cycleStartDate = getLocalDateKey();
    lastDebtAccrualDate = getLocalDateKey();
    resetAdminTestCursor();
    expenseHistory = [];
}

// Логика сохранения и миграции старых данных.
function getActiveHistoryEntryCount() {
    return historyDays.filter((entry) => entry.type === "work").length;
}

function getLatestWorkDateKey() {
    let latestWorkDate = "";

    for (const entry of historyDays) {
        if (entry.type === "work" && isValidDateKey(entry.dateKey) && entry.dateKey > latestWorkDate) {
            latestWorkDate = entry.dateKey;
        }
    }

    return latestWorkDate;
}

function resetMainProgress() {
    currentStreak = 0;
    totalEarned = 0;
    todayRate = 100;
    historyDays = [];
    usedWheelMilestones = [];
    lastSpinResult = "";
    lastWorkDate = "";
    lastDebtAccrualDate = getLocalDateKey();
}

function loadState() {
    try {
        const savedState = window.localStorage.getItem(STORAGE_KEY);

        if (!savedState) {
            return;
        }

        const parsedState = JSON.parse(savedState);
        const storedMoneyUnit = parsedState.moneyUnit === "cents" ? "cents" : "dollars";
        const readMoney = (value) => (storedMoneyUnit === "cents" ? normalizeMoneyCents(value) : dollarsToCents(value));

        currentStreak = typeof parsedState.currentStreak === "number" ? parsedState.currentStreak : currentStreak;
        totalEarned = typeof parsedState.totalEarned === "number" ? readMoney(parsedState.totalEarned) : totalEarned;
        todayRate = typeof parsedState.todayRate === "number" ? readMoney(parsedState.todayRate) : todayRate;
        historyDays = Array.isArray(parsedState.historyDays)
            ? parsedState.historyDays.map((entry) => (
                entry && typeof entry === "object"
                    ? {
                        ...entry,
                        amount: readMoney(entry.amount)
                    }
                    : entry
            ))
            : historyDays;
        usedWheelMilestones = Array.isArray(parsedState.usedWheelMilestones) ? parsedState.usedWheelMilestones : usedWheelMilestones;
        lastSpinResult = typeof parsedState.lastSpinResult === "string" ? parsedState.lastSpinResult : lastSpinResult;
        cycleStartDate = typeof parsedState.cycleStartDate === "string" ? parsedState.cycleStartDate : cycleStartDate;
        lastWorkDate = typeof parsedState.lastWorkDate === "string" ? parsedState.lastWorkDate : lastWorkDate;
        lastDebtAccrualDate = typeof parsedState.lastDebtAccrualDate === "string" ? parsedState.lastDebtAccrualDate : lastDebtAccrualDate;
        adminTestCursorDateKey = typeof parsedState.adminTestCursorDateKey === "string" && parsedState.adminTestCursorDateKey
            ? parsedState.adminTestCursorDateKey
            : adminTestCursorDateKey;
        expenseHistory = Array.isArray(parsedState.expenseHistory)
            ? parsedState.expenseHistory.map((entry) => (
                entry && typeof entry === "object"
                    ? {
                        ...entry,
                        amount: readMoney(entry.amount)
                    }
                    : entry
            ))
            : expenseHistory;
    } catch (error) {
        // Если сохранённые данные повреждены или localStorage недоступен, остаёмся на стартовых значениях.
    }

}

function saveState() {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            moneyUnit: "cents",
            currentStreak,
            totalEarned,
            todayRate,
            historyDays,
            usedWheelMilestones,
            lastSpinResult,
            cycleStartDate,
            lastWorkDate,
            lastDebtAccrualDate,
            adminTestCursorDateKey,
            expenseHistory
        }));
    } catch (error) {
        // Сохранение отключаем молча, если localStorage недоступен.
    }
}

function loadIntroPreference() {
    try {
        introHidden = window.localStorage.getItem(INTRO_STORAGE_KEY) === "true";
    } catch (error) {
        introHidden = false;
    }
}

function saveIntroPreference() {
    try {
        window.localStorage.setItem(INTRO_STORAGE_KEY, introHidden ? "true" : "false");
    } catch (error) {
        // Игнорируем, если localStorage недоступен.
    }
}

function renderIntroPopup() {
    introOverlay.classList.toggle("is-visible", introPopupOpen);
    introOverlay.setAttribute("aria-hidden", introPopupOpen ? "false" : "true");

    if (introDontShowCheckbox) {
        introDontShowCheckbox.checked = introHidden;
    }
}

function closeIntroPopup() {
    if (introDontShowCheckbox) {
        introHidden = introDontShowCheckbox.checked;
    }

    saveIntroPreference();
    introPopupOpen = false;
    renderIntroPopup();
}

function startAppFromIntro(event) {
    if (event) {
        event.preventDefault();
    }

    closeIntroPopup();
}

function ensureHistoryDates() {
    if (!historyDays.length) {
        return false;
    }

    const lastKnownDate = (() => {
        for (let index = historyDays.length - 1; index >= 0; index -= 1) {
            if (typeof historyDays[index].dateKey === "string" && historyDays[index].dateKey) {
                return historyDays[index].dateKey;
            }
        }

        return "";
    })();

    let cursor = lastKnownDate || lastWorkDate || getLocalDateKey();
    let migrated = false;

    for (let index = historyDays.length - 1; index >= 0; index -= 1) {
        const entry = historyDays[index];

        if (typeof entry.dateKey === "string" && entry.dateKey) {
            cursor = shiftDateKey(entry.dateKey, -1);
            continue;
        }

        entry.dateKey = cursor;
        cursor = shiftDateKey(cursor, -1);
        migrated = true;
    }

    return migrated;
}

// Тестовые даты для админки.
function getNextTestDayKey() {
    if (!adminTestCursorDateKey) {
        adminTestCursorDateKey = getLocalDateKey();
    }

    return adminTestCursorDateKey;
}

function advanceAdminTestCursor() {
    adminTestCursorDateKey = shiftDateKey(getNextTestDayKey(), 1);
}

function resetAdminTestCursor() {
    adminTestCursorDateKey = getLocalDateKey();
}

// Модальные окна и всплывашки.
function showWorkError() {
    workErrorOverlay.classList.add("is-visible");
    workErrorOverlay.setAttribute("aria-hidden", "false");
}

function hideWorkError() {
    workErrorOverlay.classList.remove("is-visible");
    workErrorOverlay.setAttribute("aria-hidden", "true");
}

function getExpenseHistoryMarkup(entry) {
    return `<p class="spend-history-item">${formatDateKey(entry.dateKey)} — ${formatMoney(entry.amount)}</p>`;
}

function resetTodoRuntimeState() {
    todoItems = [];
    completedTodoItems = [];
    todoNextId = 1;
    todoCompletionTimers = new Map();
    todoCompletingIds = new Set();
}

function createTodoRecord(item, fallbackDateKey, includeCompletedDate = false) {
    const todoId = Number.isFinite(item.id) ? item.id : todoNextId++;

    todoNextId = Math.max(todoNextId, todoId + 1);

    return {
        id: todoId,
        text: item.text,
        dateKey: typeof item.dateKey === "string" ? item.dateKey : fallbackDateKey,
        ...(includeCompletedDate
            ? {
                completedDateKey: typeof item.completedDateKey === "string" ? item.completedDateKey : fallbackDateKey
            }
            : {})
    };
}

function getTodayTodoEntries() {
    const todayKey = getLocalDateKey();

    return todoItems
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.dateKey === todayKey);
}

function getTodoItemMarkup(item, index) {
    const isCompleting = todoCompletingIds.has(item.id);

    return `
        <div class="todo-item${isCompleting ? " is-completing" : ""}" data-todo-index="${index}" data-todo-id="${item.id}">
            <label class="todo-item-main">
                <input type="checkbox" data-todo-index="${index}" data-todo-id="${item.id}" ${isCompleting ? "checked disabled" : ""}>
                <span>${item.text}</span>
            </label>
            <button class="todo-delete-button" type="button" data-todo-delete-index="${index}" data-todo-id="${item.id}" aria-label="Удалить задачу" ${isCompleting ? "disabled" : ""}>×</button>
        </div>
    `;
}

function getAdminTodoMarkup(item) {
    return `
        <div class="admin-todo-entry" data-completed-id="${item.id}">
            <p class="admin-todo-item">${formatDateKey(item.completedDateKey)} — ✓ ${item.text}</p>
            <button class="admin-todo-return-button" type="button" data-completed-id="${item.id}" aria-label="Вернуть задачу в To Do">↩</button>
        </div>
    `;
}

function loadTodoState() {
    try {
        const rawTodoState = window.localStorage.getItem(TODO_STORAGE_KEY);

        if (!rawTodoState) {
            resetTodoRuntimeState();
            return;
        }

        const parsedTodoState = JSON.parse(rawTodoState);
        resetTodoRuntimeState();

        if (Array.isArray(parsedTodoState)) {
            parsedTodoState
                .filter((item) => item && typeof item.text === "string")
                .forEach((item) => {
                    if (item.done) {
                        completedTodoItems.push(createTodoRecord(item, getLocalDateKey(), true));
                        return;
                    }

                    todoItems.push(createTodoRecord(item, getLocalDateKey()));
                });
            return;
        }

        if (parsedTodoState && typeof parsedTodoState === "object") {
            const loadedItems = Array.isArray(parsedTodoState.items) ? parsedTodoState.items : [];
            const loadedCompletedItems = Array.isArray(parsedTodoState.completed) ? parsedTodoState.completed : [];
            const loadedNextId = Number(parsedTodoState.nextId);

            todoItems.push(...loadedItems
                .filter((item) => item && typeof item.text === "string")
                .map((item) => createTodoRecord(item, getLocalDateKey())));

            completedTodoItems.push(...loadedCompletedItems
                .filter((item) => item && typeof item.text === "string")
                .map((item) => createTodoRecord(item, getLocalDateKey(), true)));

            if (Number.isFinite(loadedNextId) && loadedNextId > 0) {
                todoNextId = Math.max(todoNextId, loadedNextId);
            }

            return;
        }
    } catch (error) {
        console.warn("Failed to load todo state:", error);
    }

    resetTodoRuntimeState();
}

function saveTodoState() {
    try {
        const todoState = {
            items: todoItems,
            completed: completedTodoItems,
            nextId: todoNextId
        };

        window.localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todoState));
    } catch (error) {
        console.warn("Failed to save todo state:", error);
    }
}

function renderTodoPanel() {
    if (todoDateLabel) {
        todoDateLabel.textContent = `Сегодня: ${formatDateKey(getLocalDateKey())}`;
    }

    if (!todoList) {
        return;
    }

    const todayTodos = getTodayTodoEntries();

    if (todayTodos.length === 0) {
        todoList.innerHTML = '<p class="todo-empty">Пока задач нет.</p>';
        return;
    }

    todoList.innerHTML = todayTodos
        .map(({ item, index }) => getTodoItemMarkup(item, index))
        .join("");
}

function addTodoItem() {
    const text = String(todoInput ? todoInput.value : "").trim();

    const todayKey = getLocalDateKey();
    const todayTodoCount = todoItems.filter((item) => item.dateKey === todayKey).length;

    if (!text || todayTodoCount >= MAX_TODO_ITEMS_PER_DAY) {
        return;
    }

    todoItems.push({
        id: todoNextId++,
        text,
        dateKey: todayKey
    });

    if (todoInput) {
        todoInput.value = "";
    }

    saveTodoState();
    renderTodoPanel();
    triggerRoverActivity();
}

function toggleTodoItem(index) {
    if (!Number.isFinite(index) || index < 0 || index >= todoItems.length) {
        return;
    }

    const targetItem = todoItems[index];

    if (!targetItem || targetItem.dateKey !== getLocalDateKey()) {
        return;
    }

    completeTodoItem(targetItem.id);
}

function removeTodoItem(index) {
    if (!Number.isFinite(index) || index < 0 || index >= todoItems.length) {
        return;
    }

    const targetItem = todoItems[index];

    if (!targetItem || targetItem.dateKey !== getLocalDateKey()) {
        return;
    }

    todoItems.splice(index, 1);
    saveTodoState();
    renderTodoPanel();
    renderAdminTodoPanel();
}

function completeTodoItem(todoId) {
    if (todoCompletingIds.has(todoId)) {
        return;
    }

    const todoIndex = todoItems.findIndex((item) => item.id === todoId);

    if (todoIndex < 0) {
        return;
    }

    const targetItem = todoItems[todoIndex];

    if (targetItem.dateKey !== getLocalDateKey()) {
        return;
    }

    todoCompletingIds.add(todoId);
    renderTodoPanel();

    if (todoCompletionTimers.has(todoId)) {
        window.clearTimeout(todoCompletionTimers.get(todoId));
    }

    const finishTimer = window.setTimeout(() => {
        const currentIndex = todoItems.findIndex((item) => item.id === todoId);

        todoCompletionTimers.delete(todoId);
        todoCompletingIds.delete(todoId);

        if (currentIndex < 0) {
            renderTodoPanel();
            return;
        }

        const [completedItem] = todoItems.splice(currentIndex, 1);

        completedTodoItems.unshift({
            id: completedItem.id,
            text: completedItem.text,
            dateKey: completedItem.dateKey,
            completedDateKey: getLocalDateKey()
        });

        saveTodoState();
        renderTodoPanel();
        renderAdminTodoPanel();
    }, 360);

    todoCompletionTimers.set(todoId, finishTimer);
}

function renderAdminTodoPanel() {
    if (!adminTodoPanel || !adminTodoList) {
        return;
    }

    const doneTodos = completedTodoItems.slice();

    if (doneTodos.length === 0) {
        adminTodoList.innerHTML = '<p class="admin-todo-empty">Сегодня выполненных задач нет.</p>';
    } else {
        adminTodoList.innerHTML = doneTodos
            .map((item) => getAdminTodoMarkup(item))
            .join("");
    }

    adminTodoPanel.hidden = false;
}

function restoreCompletedTodoItem(todoId) {
    if (!Number.isFinite(todoId)) {
        return;
    }

    const completedIndex = completedTodoItems.findIndex((item) => item.id === todoId);

    if (completedIndex < 0) {
        return;
    }

    const [restoredItem] = completedTodoItems.splice(completedIndex, 1);

    todoItems.unshift({
        id: restoredItem.id,
        text: restoredItem.text,
        dateKey: getLocalDateKey()
    });

    saveTodoState();
    renderTodoPanel();
    renderAdminTodoPanel();
}

// Окно траты средств.
function renderSpendPopup() {
    if (spendOpenButton) {
        spendOpenButton.disabled = totalEarned <= -MAX_BALANCE_OVERDRAFT;
        spendOpenButton.title = totalEarned > -MAX_BALANCE_OVERDRAFT ? "Потратить средства" : "Лимит овердрафта исчерпан";
    }

    if (spendMaxNote) {
        const maxSpendable = Math.max(0, totalEarned + MAX_BALANCE_OVERDRAFT);
        spendMaxNote.textContent = `Доступно к списанию: ${formatMoney(maxSpendable)}`;
    }

    if (spendAmountInput) {
        spendAmountInput.max = formatMoneyInput(Math.max(0, totalEarned + MAX_BALANCE_OVERDRAFT));
    }

    if (spendHistoryButton) {
        spendHistoryButton.textContent = spendHistoryOpen ? "Скрыть историю" : "История расходов";
        spendHistoryButton.setAttribute("aria-expanded", spendHistoryOpen ? "true" : "false");
    }

    if (spendHistoryPanel) {
        spendHistoryPanel.classList.toggle("is-visible", spendHistoryOpen);
    }

    if (spendHistoryList) {
        const recentExpenses = expenseHistory.slice().reverse();

        if (recentExpenses.length === 0) {
            spendHistoryList.innerHTML = '<p class="spend-history-empty">Пока нет расходов.</p>';
        } else {
            spendHistoryList.innerHTML = recentExpenses.map(getExpenseHistoryMarkup).join("");
        }
    }

    spendOverlay.classList.toggle("is-visible", spendPopupOpen);
    spendOverlay.setAttribute("aria-hidden", spendPopupOpen ? "false" : "true");
}

function openSpendPopup() {
    if (totalEarned <= -MAX_BALANCE_OVERDRAFT) {
        return;
    }

    spendPopupOpen = true;

    if (spendAmountInput) {
        spendAmountInput.value = "";
    }

    renderSpendPopup();

    if (spendAmountInput) {
        window.requestAnimationFrame(() => {
            spendAmountInput.focus();
        });
    }
}

function closeSpendPopup() {
    spendPopupOpen = false;
    renderSpendPopup();
}

function toggleSpendHistory() {
    spendHistoryOpen = !spendHistoryOpen;
    renderSpendPopup();
}

function confirmSpend() {
    const spendAmount = spendAmountInput ? parseMoneyInput(spendAmountInput.value) : NaN;
    const maxSpendAmount = totalEarned + MAX_BALANCE_OVERDRAFT;

    if (!Number.isFinite(spendAmount) || spendAmount <= 0 || maxSpendAmount <= 0) {
        return;
    }

    const spentAmount = Math.min(spendAmount, maxSpendAmount);
    const previousBalance = totalEarned;

    totalEarned = Math.max(-MAX_BALANCE_OVERDRAFT, totalEarned - spentAmount);
    anchorDebtAccrualIfNeeded(previousBalance);
    expenseHistory.push({
        dateKey: getLocalDateKey(),
        amount: spentAmount
    });
    closeSpendPopup();
    renderApp();
}

// Редактор календарного дня.
function renderCalendarEditPopup() {
    calendarEditOverlay.classList.toggle("is-visible", calendarEditPopupOpen);
    calendarEditOverlay.setAttribute("aria-hidden", calendarEditPopupOpen ? "false" : "true");
}

function closeCalendarEditPopup() {
    calendarEditPopupOpen = false;
    calendarEditSelectedDateKey = "";
    renderCalendarEditPopup();
}

function openCalendarEditPopup(dateKey) {
    calendarEditSelectedDateKey = dateKey;
    calendarEditPopupOpen = true;

    if (calendarEditDate) {
        calendarEditDate.textContent = formatDateKey(dateKey);
    }

    renderCalendarEditPopup();
}

function getCalendarDayMarker(entryType) {
    switch (entryType) {
        case "work":
            return '<span class="calendar-check" aria-hidden="true">✓</span>';
        case "skip_day":
            return '<span class="calendar-marker calendar-marker-skip" aria-hidden="true">✕</span>';
        default:
            return "";
    }
}

function getSkipDayOrdinalForDateKey(dateKey) {
    if (!isValidDateKey(dateKey)) {
        return 0;
    }

    const weekStartKey = getWeekStartKey(dateKey);

    return historyDays.filter((entry) => (
        entry.type === "skip_day"
        && isValidDateKey(entry.dateKey)
        && entry.dateKey >= weekStartKey
        && entry.dateKey <= dateKey
    )).length;
}

function getCalendarEditCurrentType(dateKey) {
    const entry = getHistoryEntryByDateKey(dateKey);

    return entry ? entry.type : "";
}

function setCalendarDayStatus(dateKey, newType) {
    const entryIndex = getHistoryEntryIndexByDateKey(dateKey);
    const existingEntry = entryIndex >= 0 ? historyDays[entryIndex] : null;
    const currentType = existingEntry ? existingEntry.type : "";
    const activeCountBefore = getActiveHistoryEntryCount();
    const previousBalance = totalEarned;
    let amountDelta = 0;
    let nextAmount = 0;
    let nextStreakDay = activeCountBefore;

    if (existingEntry && currentType === newType) {
        closeCalendarEditPopup();
        return;
    }

    if (newType === "skip_day") {
        nextAmount = 0;

        if (currentType === "work") {
            amountDelta = -Number(existingEntry.amount || 0);
        }
    } else if (currentType === "skip_day") {
        nextStreakDay = activeCountBefore + 1;
        nextAmount = getDailyRate(nextStreakDay);
        amountDelta = nextAmount;
    } else if (currentType === "work") {
        nextAmount = Number(existingEntry.amount || getDailyRate(activeCountBefore || 1));
    } else {
        nextStreakDay = activeCountBefore + 1;
        nextAmount = getDailyRate(nextStreakDay);
        amountDelta = nextAmount;
    }

    const nextEntry = {
        dateKey,
        type: newType,
        amount: nextAmount,
        streakDay: nextStreakDay
    };

    if (entryIndex >= 0) {
        historyDays[entryIndex] = nextEntry;
    } else {
        historyDays.push(nextEntry);
    }

    totalEarned = Math.max(-MAX_BALANCE_OVERDRAFT, totalEarned + amountDelta);
    if (newType === "skip_day") {
        applyWeeklySkipPenalty(dateKey);
    }
    anchorDebtAccrualIfNeeded(previousBalance);
    currentStreak = getWheelEligibleStreakCount();
    todayRate = getDailyRate(currentStreak);
    lastWorkDate = getLatestWorkDateKey();
    closeCalendarEditPopup();
    renderApp();
    triggerRoverActivity();
}

function setTodayDayStatus(newType) {
    ensureCycleState();
    setCalendarDayStatus(getLocalDateKey(), newType);
}

function setAdminTestDayStatus(newType) {
    ensureCycleState();

    const testDayKey = getNextTestDayKey();

    setCalendarDayStatus(testDayKey, newType);
    advanceAdminTestCursor();
    renderApp();
}

function setSelectedCalendarDayStatus(newType) {
    if (!calendarEditSelectedDateKey) {
        return;
    }

    setCalendarDayStatus(calendarEditSelectedDateKey, newType);
}

function renderAdminPopup() {
    adminOverlay.classList.toggle("is-visible", adminPopupOpen);
    adminOverlay.setAttribute("aria-hidden", adminPopupOpen ? "false" : "true");
}

function openAdminPopup() {
    adminPopupOpen = true;
    renderAdminPopup();
}

function closeAdminPopup() {
    adminPopupOpen = false;
    renderAdminPopup();
}

function resetProgressAction() {
    const confirmed = window.confirm("Вы уверены, что хотите сбросить весь прогресс?");

    if (!confirmed) {
        return;
    }

    resetFullProgressState();
    saveState();
    renderApp();
}

function renderSettingsPopup() {
    settingsOverlay.classList.toggle("is-visible", settingsPopupOpen);
    settingsOverlay.setAttribute("aria-hidden", settingsPopupOpen ? "false" : "true");
}

function openSettingsPopup() {
    settingsPopupOpen = true;
    renderSettingsPopup();
}

function closeSettingsPopup() {
    settingsPopupOpen = false;
    renderSettingsPopup();
}

function getLastWorkEntries() {
    return historyDays
        .filter((entry) => entry.type === "work")
        .slice()
        .reverse()
        .slice(0, 3);
}

function getHistoryItemMarkup(entry) {
    if (entry.type === "work") {
        return `<p class="history-note">День ${entry.streakDay} — Работа выполнена — ${formatMoney(entry.amount)}</p>`;
    }

    if (entry.type === "skip_day") {
        return `<p class="history-note">${formatDateKey(entry.dateKey)} — Пропущенный день — ${formatMoney(entry.amount)}</p>`;
    }

    return `<p class="history-note">${formatDateKey(entry.dateKey)} — Работа выполнена — ${formatMoney(entry.amount)}</p>`;
}

function renderSummaryWidgets() {
    currentStreakValue.textContent = `${currentStreak} дней`;
    currentRateValue.textContent = formatMoney(todayRate);
    totalEarnedValue.textContent = formatMoney(totalEarned);

    if (infoCurrentRate) {
        infoCurrentRate.textContent = `Текущая ставка: ${formatMoney(todayRate)}`;
    }

    if (infoBalance) {
        infoBalance.textContent = `Баланс: ${formatMoney(totalEarned)}`;
    }

    if (infoLastWorkDays) {
        const lastWorkEntries = getLastWorkEntries();

        if (lastWorkEntries.length === 0) {
            infoLastWorkDays.innerHTML = "<li>Нет данных</li>";
        } else {
            infoLastWorkDays.innerHTML = lastWorkEntries
                .map((entry) => `<li>День ${entry.streakDay} — Работа выполнена — ${formatMoney(entry.amount)}</li>`)
                .join("");
        }
    }
}


function renderHistoryWidgets() {
    renderCalendar();

    if (historyDays.length === 0) {
        workHistorySection.innerHTML = `
            <h2 class="panel-title">История работы</h2>
            <p class="history-note">Пока не записано ни одного рабочего дня.</p>
        `;
        return;
    }

    const historyItems = historyDays
        .slice()
        .reverse()
        .filter((entry) => entry.type !== "skip_day" || (typeof entry.dateKey === "string" && isWithinLastWeek(entry.dateKey)))
        .map(getHistoryItemMarkup)
        .join("");

    workHistorySection.innerHTML = `
        <h2 class="panel-title">История работы</h2>
        ${historyItems}
    `;
}

function renderCalendar() {
    if (!calendarTitle || !calendarGrid) {
        return;
    }

    const referenceDateKey = isValidDateKey(getLatestHistoryDateKey()) ? getLatestHistoryDateKey() : getLocalDateKey();
    const referenceDate = new Date(`${referenceDateKey}T00:00:00Z`);
    const fallbackDate = new Date();
    const calendarDate = Number.isNaN(referenceDate.getTime()) ? fallbackDate : referenceDate;
    calendarDate.setUTCDate(1);
    calendarDate.setUTCMonth(calendarDate.getUTCMonth() + calendarMonthOffset);
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const todayKey = getLocalDateKey();
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const entryTypesByDate = new Map(
        historyDays
            .filter((entry) => typeof entry.dateKey === "string" && entry.dateKey.startsWith(monthPrefix))
            .map((entry) => [entry.dateKey, entry.type])
    );
    const firstDayOfMonth = new Date(year, month, 1);
    const leadingBlanks = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    calendarTitle.textContent = getMonthTitle(calendarDate);

    const cells = [];

    for (let index = 0; index < leadingBlanks; index += 1) {
        cells.push('<div class="calendar-day is-empty" aria-hidden="true"></div>');
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const dayDate = new Date(year, month, day);
        const dateKey = getLocalDateKey(dayDate);
        const entryType = entryTypesByDate.get(dateKey);
        const isWorked = entryType === "work";
        const isSkipped = entryType === "skip_day";
        const skipOrdinal = isSkipped ? getSkipDayOrdinalForDateKey(dateKey) : 0;
        const isWarningSkip = isSkipped && skipOrdinal > 0 && skipOrdinal < 3;
        const isPenaltySkip = isSkipped && skipOrdinal >= 3;
        const isToday = dateKey === todayKey;
        const marker = isPenaltySkip ? getCalendarDayMarker(entryType) : "";

        cells.push(`
            <div class="calendar-day${isWorked ? " is-worked" : ""}${isWarningSkip ? " is-paid-skip" : ""}${isPenaltySkip ? " is-skipped" : ""}${isToday ? " is-today" : ""}" title="${dateKey}" data-date-key="${dateKey}" role="button" tabindex="0">
                ${marker}
                <span class="calendar-day-number">${day}</span>
            </div>
        `);
    }

    calendarGrid.innerHTML = cells.join("");
}

function changeCalendarMonth(offset) {
    calendarMonthOffset += offset;
    renderApp();
}

function ensureCycleState() {
    const todayKey = getLocalDateKey();

    if (!cycleStartDate) {
        cycleStartDate = todayKey;
        saveState();
        return;
    }

    const elapsedDays = getDaysBetween(cycleStartDate, todayKey);

    if (!Number.isFinite(elapsedDays)) {
        cycleStartDate = todayKey;
        saveState();
        return;
    }

    if (elapsedDays >= CYCLE_LENGTH_DAYS) {
        resetMainProgress();
        cycleStartDate = todayKey;
        saveState();
    }
}

function getDailyRate(streakDay) {
    if (streakDay <= 0) {
        return 100;
    }

    const cycleDay = ((streakDay - 1) % CYCLE_LENGTH_DAYS) + 1;

    if (cycleDay >= 21) {
        return 300;
    }

    if (cycleDay >= 11) {
        return 200;
    }

    return 100;
}

function getWheelProgress(dayCount) {
    const remainder = dayCount % 5;
    const daysUntilNextMilestone = remainder === 0 ? 5 : 5 - remainder;

    return `Можно покрутить через ${daysUntilNextMilestone} рабочих дней!`;
}

function getWheelEligibleStreakCount() {
    if (!historyDays.length) {
        return 0;
    }

    const entriesByDate = new Map();
    let latestDateKey = "";
    const todayKey = getLocalDateKey();

    for (const entry of historyDays) {
        if (!isValidDateKey(entry.dateKey)) {
            continue;
        }

        entriesByDate.set(entry.dateKey, entry);

        if (!latestDateKey || entry.dateKey > latestDateKey) {
            latestDateKey = entry.dateKey;
        }
    }

    if (!latestDateKey) {
        return 0;
    }

    let streak = 0;
    let cursor = latestDateKey;

    if (latestDateKey <= todayKey) {
        const gapDays = getDaysBetween(latestDateKey, todayKey);
        let onlyNeutralGap = true;

        for (let offset = 1; offset < gapDays; offset += 1) {
            if (!isWeekendDateKey(shiftDateKey(latestDateKey, offset))) {
                onlyNeutralGap = false;
                break;
            }
        }

        if (!onlyNeutralGap) {
            cursor = todayKey;
        }
    }

    while (true) {
        const entry = entriesByDate.get(cursor);

        if (entry) {
            if (entry.type === "skip_day") {
                const skipOrdinal = getSkipDayOrdinalForDateKey(cursor);

                if (skipOrdinal >= 3) {
                    break;
                }

                cursor = shiftDateKey(cursor, -1);
                continue;
            }

            if (entry.type !== "work") {
                break;
            }

            streak += 1;
            cursor = shiftDateKey(cursor, -1);
            continue;
        }

        if (isWeekendDateKey(cursor)) {
            cursor = shiftDateKey(cursor, -1);
            continue;
        }

        break;
    }

    return streak;
}

// Центральный рендер.
function safeRender(renderFn) {
    try {
        renderFn();
    } catch (error) {
        console.error(error);
    }
}

function triggerRoverActivity() {
    if (typeof window.playRoverActivity === "function") {
        window.playRoverActivity();
    }
}

const roverStage = document.getElementById("rover-stage");
const roverSecretMessage = document.getElementById("rover-secret-message");
const roverFeedPanel = document.getElementById("rover-feed-panel");
const roverFeedButton = document.getElementById("rover-feed-button");
const roverFeedVisual = document.getElementById("rover-feed-visual");
const roverFeedImage = document.getElementById("rover-feed-image");
const infoWidget = document.querySelector(".info-widget");
const infoButton = infoWidget ? infoWidget.querySelector(".info-button") : null;
const infoPanel = infoWidget ? infoWidget.querySelector(".info-panel") : null;
const totalEarnedValueClickTarget = document.getElementById("total-earned-value");
const infoBalanceClickTarget = document.getElementById("info-balance");
const balanceSong = new Audio("I_Need_A_Dollar-400402-mobiles24.mp3");
const ROVER_FEED_STORAGE_KEY = "dollar-streak-rover-feed-state";
const ROVER_FEED_DURATION_MS = 5 * 60 * 1000;
let roverClickCount = 0;
let roverSecretShown = false;
let roverSecretHideTimer = null;
let balanceClickCount = 0;
let roverFeedHideTimer = null;
let roverFeedMidnightTimer = null;
let infoPanelOpen = false;
let roverFeedState = {
    lastFedDateKey: "",
    visibleUntil: 0
};

balanceSong.preload = "auto";

function loadRoverFeedState() {
    try {
        const rawState = window.localStorage.getItem(ROVER_FEED_STORAGE_KEY);

        if (!rawState) {
            return;
        }

        const parsedState = JSON.parse(rawState);

        if (parsedState && typeof parsedState === "object") {
            roverFeedState.lastFedDateKey = typeof parsedState.lastFedDateKey === "string" ? parsedState.lastFedDateKey : "";
            roverFeedState.visibleUntil = Number(parsedState.visibleUntil) > 0 ? Number(parsedState.visibleUntil) : 0;
        }
    } catch (error) {
        // Если сохранение повреждено или недоступно, начинаем с чистого состояния.
    }
}

function saveRoverFeedState() {
    try {
        window.localStorage.setItem(ROVER_FEED_STORAGE_KEY, JSON.stringify(roverFeedState));
    } catch (error) {
        // Игнорируем недоступный localStorage.
    }
}

function isRoverFedToday() {
    return roverFeedState.lastFedDateKey === getLocalDateKey();
}

function getRoverFeedTimeUntilMidnight() {
    const now = new Date();
    const nextMidnight = new Date(now);

    nextMidnight.setHours(24, 0, 0, 0);

    return Math.max(1000, nextMidnight.getTime() - now.getTime());
}

function clearRoverFeedTimers() {
    if (roverFeedHideTimer) {
        window.clearTimeout(roverFeedHideTimer);
        roverFeedHideTimer = null;
    }

    if (roverFeedMidnightTimer) {
        window.clearTimeout(roverFeedMidnightTimer);
        roverFeedMidnightTimer = null;
    }
}

function scheduleRoverFeedTimers() {
    clearRoverFeedTimers();

    const remainingVisibilityMs = Number(roverFeedState.visibleUntil) - Date.now();

    if (Number.isFinite(remainingVisibilityMs) && remainingVisibilityMs > 0) {
        roverFeedHideTimer = window.setTimeout(() => {
            roverFeedHideTimer = null;
            roverFeedState.visibleUntil = 0;
            saveRoverFeedState();
            renderApp();
        }, remainingVisibilityMs);
    } else if (roverFeedState.visibleUntil > 0) {
        roverFeedState.visibleUntil = 0;
        saveRoverFeedState();
    }

    roverFeedMidnightTimer = window.setTimeout(() => {
        roverFeedMidnightTimer = null;
        renderApp();
    }, getRoverFeedTimeUntilMidnight());
}

function renderRoverFeedWidget() {
    const isVisible = Number(roverFeedState.visibleUntil) > Date.now();
    const showButton = !isRoverFedToday();
    const showPanel = showButton || isVisible;

    if (roverFeedPanel) {
        roverFeedPanel.hidden = !showPanel;
    }

    if (roverFeedPanel) {
        roverFeedPanel.classList.toggle("is-feeding", isVisible);
    }

    if (roverFeedButton) {
        roverFeedButton.hidden = !showButton;
        roverFeedButton.disabled = totalEarned < 1;
        roverFeedButton.title = !showButton
            ? "Можно снова после 00:00 по вашему времени"
            : totalEarned < 1
                ? "Нужно минимум $0.01"
                : "Кормление доступно один раз в сутки";
    }

    if (roverFeedVisual) {
        roverFeedVisual.hidden = !isVisible;
        roverFeedVisual.classList.toggle("is-visible", isVisible);
        roverFeedVisual.setAttribute("aria-hidden", isVisible ? "false" : "true");
    }

    if (roverFeedImage) {
        roverFeedImage.alt = isVisible ? "Корм для собачки" : "Корм спрятан";
    }
}

function renderInfoWidget() {
    if (!infoWidget || !infoPanel || !infoButton) {
        return;
    }

    infoWidget.classList.toggle("is-open", infoPanelOpen);
    infoPanel.setAttribute("aria-hidden", infoPanelOpen ? "false" : "true");
    infoButton.setAttribute("aria-expanded", infoPanelOpen ? "true" : "false");
}

function toggleInfoWidget() {
    infoPanelOpen = !infoPanelOpen;
    renderInfoWidget();
}

function closeInfoWidget() {
    if (!infoPanelOpen) {
        return;
    }

    infoPanelOpen = false;
    renderInfoWidget();
}

function feedRover() {
    if (isRoverFedToday()) {
        return;
    }

    const feedCost = 1;

    if (totalEarned < feedCost) {
        return;
    }

    totalEarned = Math.max(-MAX_BALANCE_OVERDRAFT, totalEarned - feedCost);
    roverFeedState.lastFedDateKey = getLocalDateKey();
    roverFeedState.visibleUntil = Date.now() + ROVER_FEED_DURATION_MS;
    saveRoverFeedState();
    renderApp();
    triggerRoverActivity();
}

function showRoverSecretMessage() {
    if (!roverSecretMessage || roverSecretShown) {
        return;
    }

    roverSecretShown = true;
    roverSecretMessage.hidden = false;

    if (roverSecretHideTimer) {
        window.clearTimeout(roverSecretHideTimer);
    }

    roverSecretHideTimer = window.setTimeout(() => {
        roverSecretMessage.hidden = true;
        roverSecretHideTimer = null;
    }, 5000);
}

function playBalanceSong() {
    balanceSong.currentTime = 0;

    const playPromise = balanceSong.play();

    if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
            // Автовоспроизведение может быть ограничено браузером; молча игнорируем.
        });
    }
}

function handleBalanceClick() {
    balanceClickCount += 1;

    if (balanceClickCount >= 5) {
        balanceClickCount = 0;
        playBalanceSong();
    }
}

function renderApp() {
    ensureCycleState();
    ensureHistoryDates();
    applyDailyDebtAccrual();
    currentStreak = getWheelEligibleStreakCount();
    todayRate = getDailyRate(currentStreak);
    lastWorkDate = getLatestWorkDateKey();
    if (typeof resetWheelMilestonesIfStreakBroken === "function") {
        resetWheelMilestonesIfStreakBroken();
    }

    safeRender(renderCalendar);
    safeRender(renderSummaryWidgets);
    if (typeof renderWheelStatusWidget === "function") {
        safeRender(renderWheelStatusWidget);
    }
    if (typeof renderWheelPopup === "function") {
        safeRender(renderWheelPopup);
    }
    safeRender(renderSpendPopup);
    safeRender(renderHistoryWidgets);
    safeRender(renderTodoPanel);
    safeRender(renderRoverFeedWidget);
    safeRender(renderInfoWidget);
    safeRender(renderSettingsPopup);
    safeRender(renderAdminPopup);
    safeRender(renderIntroPopup);

    scheduleRoverFeedTimers();
    saveState();
}

// Инициализация и события.
loadIntroPreference();
loadTodoState();
loadRoverFeedState();
loadState();
if (typeof initWheelFeature === "function") {
    initWheelFeature();
}
ensureCycleState();
renderApp();
introPopupOpen = !introHidden;
renderIntroPopup();

calendarGrid.addEventListener("click", (event) => {
    const dayCell = event.target.closest(".calendar-day");

    if (!dayCell || dayCell.classList.contains("is-empty")) {
        return;
    }

    openCalendarEditPopup(dayCell.dataset.dateKey);
});

calendarGrid.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
        return;
    }

    const dayCell = event.target.closest(".calendar-day");

    if (!dayCell || dayCell.classList.contains("is-empty")) {
        return;
    }

    event.preventDefault();
    openCalendarEditPopup(dayCell.dataset.dateKey);
});

if (calendarPrevButton) {
    calendarPrevButton.addEventListener("click", () => {
        changeCalendarMonth(-1);
    });
}

if (calendarNextButton) {
    calendarNextButton.addEventListener("click", () => {
        changeCalendarMonth(1);
    });
}

if (todoDoneButton) {
    todoDoneButton.addEventListener("click", renderAdminTodoPanel);
}

if (testWorkDayButton) {
    testWorkDayButton.addEventListener("click", () => {
        setAdminTestDayStatus("work");
    });
}

if (testAddDayButton) {
    testAddDayButton.addEventListener("click", () => {
        setAdminTestDayStatus("skip_day");
    });
}

if (adminOverlay) {
    adminOverlay.addEventListener("click", (event) => {
        if (event.target === adminOverlay) {
            closeAdminPopup();
        }
    });
}

if (calendarEditOverlay) {
    calendarEditOverlay.addEventListener("click", (event) => {
        if (event.target === calendarEditOverlay) {
            closeCalendarEditPopup();
        }
    });
}

if (adminLauncherButton) {
    adminLauncherButton.addEventListener("click", openAdminPopup);
}

if (adminCloseButton) {
    adminCloseButton.addEventListener("click", closeAdminPopup);
}

if (spendOpenButton) {
    spendOpenButton.addEventListener("click", openSpendPopup);
}

if (settingsOpenButton) {
    settingsOpenButton.addEventListener("click", openSettingsPopup);
}

if (todoInput) {
    todoInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            addTodoItem();
        }
    });
}

if (todoList) {
    todoList.addEventListener("change", (event) => {
        const checkbox = event.target.closest("input[type=\"checkbox\"]");

        if (!checkbox) {
            return;
        }

        const todoIndex = Number(checkbox.dataset.todoIndex);

        if (!Number.isFinite(todoIndex)) {
            return;
        }

        toggleTodoItem(todoIndex);
    });

    todoList.addEventListener("click", (event) => {
        const deleteButton = event.target.closest("button[data-todo-delete-index]");

        if (!deleteButton) {
            return;
        }

        const todoIndex = Number(deleteButton.dataset.todoDeleteIndex);

        if (!Number.isFinite(todoIndex)) {
            return;
        }

        removeTodoItem(todoIndex);
    });
}

if (adminTodoList) {
    adminTodoList.addEventListener("click", (event) => {
        const returnButton = event.target.closest("button[data-completed-id]");

        if (!returnButton) {
            return;
        }

        const todoId = Number(returnButton.dataset.completedId);

        if (!Number.isFinite(todoId)) {
            return;
        }

        restoreCompletedTodoItem(todoId);
    });
}

dailyCheckinButton.addEventListener("click", () => {
    setTodayDayStatus("work");
});

if (dailySkipButton) {
    dailySkipButton.addEventListener("click", () => {
        setTodayDayStatus("skip_day");
    });
}

if (resetProgressButton) {
    resetProgressButton.addEventListener("click", resetProgressAction);
}

if (workErrorOkButton) {
    workErrorOkButton.addEventListener("click", hideWorkError);
}

if (workErrorOverlay) {
    workErrorOverlay.addEventListener("click", (event) => {
        if (event.target === workErrorOverlay) {
            hideWorkError();
        }
    });
}
if (calendarEditCloseButton) {
    calendarEditCloseButton.addEventListener("click", closeCalendarEditPopup);
}

if (spendCloseButton) {
    spendCloseButton.addEventListener("click", closeSpendPopup);
}

if (spendCancelButton) {
    spendCancelButton.addEventListener("click", closeSpendPopup);
}

if (spendConfirmButton) {
    spendConfirmButton.addEventListener("click", confirmSpend);
}

if (spendHistoryButton) {
    spendHistoryButton.addEventListener("click", toggleSpendHistory);
}

if (spendAmountInput) {
    spendAmountInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            confirmSpend();
        }
    });
}

if (settingsCloseButton) {
    settingsCloseButton.addEventListener("click", closeSettingsPopup);
}

if (introCloseButton) {
    introCloseButton.addEventListener("click", closeIntroPopup);
}

if (introStartButton) {
    introStartButton.addEventListener("click", startAppFromIntro);
}
if (infoButton) {
    infoButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleInfoWidget();
    });
}
if (roverFeedButton) {
    roverFeedButton.addEventListener("click", feedRover);
}
if (totalEarnedValueClickTarget) {
    totalEarnedValueClickTarget.addEventListener("click", handleBalanceClick);
}
if (infoBalanceClickTarget) {
    infoBalanceClickTarget.addEventListener("click", handleBalanceClick);
}
if (infoWidget) {
    document.addEventListener("click", (event) => {
        if (!infoPanelOpen || infoWidget.contains(event.target)) {
            return;
        }

        closeInfoWidget();
    });
}
if (roverStage) {
    const handleRoverClick = () => {
        roverClickCount += 1;

        if (roverClickCount >= 5) {
            showRoverSecretMessage();
        }

        triggerRoverActivity();
    };

    roverStage.addEventListener("click", handleRoverClick);
    roverStage.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
            return;
        }

        event.preventDefault();
        handleRoverClick();
    });
}
calendarEditWorkButton.addEventListener("click", () => {
    setSelectedCalendarDayStatus("work");
});
calendarEditSkipButton.addEventListener("click", () => {
    setSelectedCalendarDayStatus("skip_day");
});

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
    const skipDayCount = getSkipDayCountForWeek(getWeekStartKey(dateKey));
    const penaltyPercent = getSkipPenaltyPercent(skipDayCount);

    if (penaltyPercent <= 0 || totalEarned <= 0) {
        return;
    }

    const penaltyAmount = Math.ceil(totalEarned * (penaltyPercent / 100));

    if (penaltyAmount > 0) {
        totalEarned = Math.max(0, totalEarned - penaltyAmount);
    }
}

function resetFullProgressState() {
    currentStreak = 0;
    totalEarned = 0;
    todayRate = 1;
    historyDays = [];
    usedWheelMilestones = [];
    lastSpinResult = "";
    cycleStartDate = getLocalDateKey();
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
    todayRate = 1;
    historyDays = [];
    usedWheelMilestones = [];
    lastSpinResult = "";
    lastWorkDate = "";
}

function loadState() {
    try {
        const savedState = window.localStorage.getItem(STORAGE_KEY);

        if (!savedState) {
            return;
        }

        const parsedState = JSON.parse(savedState);

        currentStreak = typeof parsedState.currentStreak === "number" ? parsedState.currentStreak : currentStreak;
        totalEarned = typeof parsedState.totalEarned === "number" ? parsedState.totalEarned : totalEarned;
        todayRate = typeof parsedState.todayRate === "number" ? parsedState.todayRate : todayRate;
        historyDays = Array.isArray(parsedState.historyDays) ? parsedState.historyDays : historyDays;
        usedWheelMilestones = Array.isArray(parsedState.usedWheelMilestones) ? parsedState.usedWheelMilestones : usedWheelMilestones;
        lastSpinResult = typeof parsedState.lastSpinResult === "string" ? parsedState.lastSpinResult : lastSpinResult;
        cycleStartDate = typeof parsedState.cycleStartDate === "string" ? parsedState.cycleStartDate : cycleStartDate;
        lastWorkDate = typeof parsedState.lastWorkDate === "string" ? parsedState.lastWorkDate : lastWorkDate;
        adminTestCursorDateKey = typeof parsedState.adminTestCursorDateKey === "string" && parsedState.adminTestCursorDateKey
            ? parsedState.adminTestCursorDateKey
            : adminTestCursorDateKey;
        expenseHistory = Array.isArray(parsedState.expenseHistory) ? parsedState.expenseHistory : expenseHistory;
    } catch (error) {
        // Если сохранённые данные повреждены или localStorage недоступен, остаёмся на стартовых значениях.
    }

}

function saveState() {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            currentStreak,
            totalEarned,
            todayRate,
            historyDays,
            usedWheelMilestones,
            lastSpinResult,
            cycleStartDate,
            lastWorkDate,
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
    return `<p class="spend-history-item">${formatDateKey(entry.dateKey)} — $${entry.amount}</p>`;
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
        spendOpenButton.disabled = totalEarned <= 0;
        spendOpenButton.title = totalEarned > 0 ? "Потратить средства" : "Недостаточно средств";
    }

    if (spendMaxNote) {
        spendMaxNote.textContent = `Доступно: $${totalEarned}`;
    }

    if (spendAmountInput) {
        spendAmountInput.max = String(Math.max(0, totalEarned));
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
    if (totalEarned <= 0) {
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
    const rawAmount = Number(spendAmountInput ? spendAmountInput.value : 0);
    const spendAmount = Math.floor(rawAmount);

    if (!Number.isFinite(spendAmount) || spendAmount <= 0 || totalEarned <= 0) {
        return;
    }

    const spentAmount = Math.min(spendAmount, totalEarned);

    totalEarned = Math.max(0, totalEarned - spentAmount);
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

function getCalendarEditCurrentType(dateKey) {
    const entry = getHistoryEntryByDateKey(dateKey);

    return entry ? entry.type : "";
}

function setCalendarDayStatus(dateKey, newType) {
    const entryIndex = getHistoryEntryIndexByDateKey(dateKey);
    const existingEntry = entryIndex >= 0 ? historyDays[entryIndex] : null;
    const currentType = existingEntry ? existingEntry.type : "";
    const activeCountBefore = getActiveHistoryEntryCount();
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

    totalEarned += amountDelta;
    if (newType === "skip_day") {
        applyWeeklySkipPenalty(dateKey);
    }
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
        return `<p class="history-note">День ${entry.streakDay} — Работа выполнена — $${entry.amount}</p>`;
    }

    if (entry.type === "skip_day") {
        return `<p class="history-note">${formatDateKey(entry.dateKey)} — Пропущенный день — $${entry.amount}</p>`;
    }

    return `<p class="history-note">${formatDateKey(entry.dateKey)} — Работа выполнена — $${entry.amount}</p>`;
}

function renderSummaryWidgets() {
    currentStreakValue.textContent = `${currentStreak} дней`;
    currentRateValue.textContent = `$${todayRate}`;
    totalEarnedValue.textContent = `$${totalEarned}`;

    if (infoCurrentRate) {
        infoCurrentRate.textContent = `Текущая ставка: $${todayRate}`;
    }

    if (infoBalance) {
        infoBalance.textContent = `Баланс: $${totalEarned}`;
    }

    if (infoLastWorkDays) {
        const lastWorkEntries = getLastWorkEntries();

        if (lastWorkEntries.length === 0) {
            infoLastWorkDays.innerHTML = "<li>Нет данных</li>";
        } else {
            infoLastWorkDays.innerHTML = lastWorkEntries
                .map((entry) => `<li>День ${entry.streakDay} — Работа выполнена — $${entry.amount}</li>`)
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
        const isToday = dateKey === todayKey;
        const marker = getCalendarDayMarker(entryType);

        cells.push(`
            <div class="calendar-day${isWorked ? " is-worked" : ""}${isSkipped ? " is-skipped" : ""}${isToday ? " is-today" : ""}" title="${dateKey}" data-date-key="${dateKey}" role="button" tabindex="0">
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
        return 1;
    }

    const cycleDay = ((streakDay - 1) % CYCLE_LENGTH_DAYS) + 1;

    if (cycleDay >= 21) {
        return 3;
    }

    if (cycleDay >= 11) {
        return 2;
    }

    return 1;
}

function getWheelProgress(streakDay) {
    const remainder = streakDay % 10;
    const daysUntilNextMilestone = remainder === 0 ? 10 : 10 - remainder;

    return `Можно покрутить через ${daysUntilNextMilestone} дней!`;
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
    // For normal play we count from today, for admin/test flow we allow future
    // contiguous dates to drive the same progression.
    let cursor = latestDateKey > todayKey ? latestDateKey : todayKey;

    while (true) {
        const entry = entriesByDate.get(cursor);

        if (!entry || entry.type !== "work") {
            break;
        }

        streak += 1;
        cursor = shiftDateKey(cursor, -1);
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

function renderApp() {
    ensureCycleState();
    ensureHistoryDates();
    currentStreak = getWheelEligibleStreakCount();
    todayRate = getDailyRate(currentStreak);
    lastWorkDate = getLatestWorkDateKey();

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
    safeRender(renderSettingsPopup);
    safeRender(renderAdminPopup);
    safeRender(renderIntroPopup);

    saveState();
}

// Инициализация и события.
loadIntroPreference();
loadTodoState();
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
calendarEditWorkButton.addEventListener("click", () => {
    setSelectedCalendarDayStatus("work");
});
calendarEditSkipButton.addEventListener("click", () => {
    setSelectedCalendarDayStatus("skip_day");
});

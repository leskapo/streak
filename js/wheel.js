// Wheel feature is isolated in this file.
// Rules:
// - unlocked every 10 worked days (type === "work")
// - one spin per milestone
// - reward is money only (+$3 or +$5)

function getWheelQualifiedDayCount() {
    return historyDays.filter((entry) => entry.type === "work").length;
}

function getCurrentWheelMilestone(dayCount) {
    if (dayCount < 10) {
        return 0;
    }

    return Math.floor(dayCount / 10) * 10;
}

function getAvailableWheelMilestone() {
    const dayCount = getWheelQualifiedDayCount();
    const milestone = getCurrentWheelMilestone(dayCount);

    if (!milestone) {
        return 0;
    }

    return usedWheelMilestones.includes(milestone) ? 0 : milestone;
}

function getWheelProgressText() {
    const dayCount = getWheelQualifiedDayCount();
    const remainder = dayCount % 10;
    const daysLeft = remainder === 0 ? 10 : 10 - remainder;

    return `Можно покрутить через ${daysLeft} дней!`;
}

function renderWheelStatusWidget() {
    if (!wheelStatus || !spinWheelButton) {
        return;
    }

    const availableMilestone = getAvailableWheelMilestone();
    const canOpen = availableMilestone > 0 && !wheelPopupOpen && !wheelIsSpinning;

    wheelStatus.textContent = availableMilestone > 0 ? "Уже можно покрутить!" : getWheelProgressText();
    spinWheelButton.disabled = !canOpen;
    spinWheelButton.setAttribute("aria-disabled", canOpen ? "false" : "true");
}

function renderWheelPrizePopup() {
    if (!wheelPrizeOverlay) {
        return;
    }

    wheelPrizeOverlay.classList.toggle("is-visible", wheelPrizePopupOpen);
    wheelPrizeOverlay.setAttribute("aria-hidden", wheelPrizePopupOpen ? "false" : "true");
}

function showWheelPrize(message) {
    if (wheelPrizeMessage) {
        wheelPrizeMessage.textContent = message;
    }

    wheelPrizePopupOpen = true;
    renderWheelPrizePopup();
}

function hideWheelPrize() {
    wheelPrizePopupOpen = false;
    renderWheelPrizePopup();
}

function getSpinResult() {
    return Math.random() < 0.5
        ? { amount: 3, label: "Ваш приз: +$3" }
        : { amount: 5, label: "Ваш приз: +$5" };
}

function getWheelSlotIndexForAmount(amount) {
    const slotPool = amount === 3 ? [0, 2, 4, 6] : [1, 3, 5, 7];
    return slotPool[Math.floor(Math.random() * slotPool.length)];
}

function getWheelRotationForSlotIndex(slotIndex) {
    return ((8 - slotIndex) % 8) * 45;
}

function renderWheelPopup() {
    if (!wheelOverlay || !fortuneWheel || !wheelResultText || !wheelLeverButton) {
        return;
    }

    const availableMilestone = getAvailableWheelMilestone();
    const canSpin = wheelPopupOpen && !wheelIsSpinning && availableMilestone > 0;

    wheelOverlay.classList.toggle("is-visible", wheelPopupOpen);
    wheelOverlay.setAttribute("aria-hidden", wheelPopupOpen ? "false" : "true");
    fortuneWheel.style.transform = `rotate(${wheelRotation}deg)`;
    wheelResultText.textContent = wheelResultMessage;
    wheelLeverButton.setAttribute("aria-disabled", canSpin ? "false" : "true");
    wheelLeverButton.classList.toggle("is-pulled", wheelIsSpinning);
}

function openWheelPopupFromCurrentState() {
    if (getAvailableWheelMilestone() <= 0 || wheelPopupOpen || wheelIsSpinning) {
        renderWheelStatusWidget();
        return;
    }

    wheelPopupOpen = true;
    wheelIsSpinning = false;
    wheelRotation = 0;
    wheelPendingResult = "";
    wheelPendingSlotIndex = 0;
    wheelResultMessage = "Нажмите на центр, чтобы начать";
    renderWheelPopup();
    renderWheelStatusWidget();
}

function closeWheelPopup() {
    if (wheelSpinTimer) {
        window.clearTimeout(wheelSpinTimer);
        wheelSpinTimer = null;
    }

    hideWheelPrize();
    wheelPopupOpen = false;
    wheelIsSpinning = false;
    wheelRotation = 0;
    wheelPendingResult = "";
    wheelPendingSlotIndex = 0;
    wheelResultMessage = "Нажмите на центр, чтобы начать";
    renderWheelPopup();
    renderWheelStatusWidget();
    if (typeof window.playRoverActivity === "function") {
        window.playRoverActivity();
    }
}

function finalizeWheelSpin() {
    if (!wheelPendingResult) {
        return;
    }

    wheelSpinTimer = null;
    wheelIsSpinning = false;
    const reward = wheelPendingResult;
    wheelPendingResult = "";
    wheelPendingSlotIndex = 0;
    wheelResultMessage = reward.label;
    lastSpinResult = reward.label;
    totalEarned += reward.amount;

    renderWheelPopup();
    renderApp();
    showWheelPrize(reward.label);
}

function startWheelSpin() {
    const availableMilestone = getAvailableWheelMilestone();

    if (!wheelPopupOpen || wheelIsSpinning || availableMilestone <= 0) {
        return;
    }

    wheelPendingResult = getSpinResult();
    wheelPendingSlotIndex = getWheelSlotIndexForAmount(wheelPendingResult.amount);
    usedWheelMilestones.push(availableMilestone);
    saveState();
    wheelIsSpinning = true;
    wheelResultMessage = "Вращение...";
    wheelRotation = 0;
    renderWheelPopup();

    window.requestAnimationFrame(() => {
        const extraTurns = 6 + Math.floor(Math.random() * 3);
        const resultOffset = getWheelRotationForSlotIndex(wheelPendingSlotIndex);
        wheelRotation = extraTurns * 360 + resultOffset;
        if (fortuneWheel) {
            fortuneWheel.style.transform = `rotate(${wheelRotation}deg)`;
        }
    });

    if (wheelSpinTimer) {
        window.clearTimeout(wheelSpinTimer);
    }

    wheelSpinTimer = window.setTimeout(finalizeWheelSpin, WHEEL_SPIN_DURATION_MS);
}

function initWheelFeature() {
    if (spinWheelButton) {
        spinWheelButton.addEventListener("click", openWheelPopupFromCurrentState);
    }

    if (wheelCloseButton) {
        wheelCloseButton.addEventListener("click", closeWheelPopup);
    }

    if (wheelLeverButton) {
        wheelLeverButton.addEventListener("click", startWheelSpin);
    }

    if (wheelPrizeThanksButton) {
        wheelPrizeThanksButton.addEventListener("click", closeWheelPopup);
    }

    if (wheelOverlay) {
        wheelOverlay.addEventListener("click", (event) => {
            if (event.target === wheelOverlay) {
                closeWheelPopup();
            }
        });
    }

    if (wheelPrizeOverlay) {
        wheelPrizeOverlay.addEventListener("click", (event) => {
            if (event.target === wheelPrizeOverlay) {
                closeWheelPopup();
            }
        });
    }

    renderWheelStatusWidget();
    renderWheelPopup();
    renderWheelPrizePopup();
}

window.openWheelPopupFromCurrentState = openWheelPopupFromCurrentState;
window.closeWheelPopup = closeWheelPopup;
window.startWheelSpin = startWheelSpin;
window.renderWheelStatusWidget = renderWheelStatusWidget;
window.renderWheelPopup = renderWheelPopup;
window.initWheelFeature = initWheelFeature;

// Rover mascot animation helpers.
var roverIdleImage = document.getElementById("rover-idle-image");
var roverActivityImage = document.getElementById("rover-activity-image");
var roverActivityTimer = null;
var roverPlayToken = 0;
var ROVER_ACTIVITY_DURATION_MS = 3500;
var roverActivityPreload = new Image();

roverActivityPreload.src = "pic/rover-windows-xp.gif";

function renderRoverIdleState() {
    if (!roverIdleImage || !roverActivityImage) {
        return;
    }

    roverIdleImage.classList.remove("is-hidden");
    roverIdleImage.classList.add("is-visible");
    roverActivityImage.classList.remove("is-visible");
}

function playRoverActivity() {
    if (!roverIdleImage || !roverActivityImage) {
        return;
    }

    roverPlayToken += 1;
    const activeToken = roverPlayToken;

    if (roverActivityTimer) {
        window.clearTimeout(roverActivityTimer);
        roverActivityTimer = null;
    }

    roverIdleImage.classList.add("is-hidden");
    roverActivityImage.classList.add("is-visible");
    roverActivityImage.src = `pic/rover-windows-xp.gif?play=${Date.now()}-${roverPlayToken}`;

    roverActivityTimer = window.setTimeout(() => {
        if (activeToken !== roverPlayToken) {
            return;
        }

        roverActivityTimer = null;
        renderRoverIdleState();
    }, ROVER_ACTIVITY_DURATION_MS);
}

function initRoverFeature() {
    renderRoverIdleState();
}

window.playRoverActivity = playRoverActivity;
window.initRoverFeature = initRoverFeature;

initRoverFeature();

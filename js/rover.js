// Rover decoration: idle sprite plus a short animation burst on player actions.
var roverDecoration = document.getElementById("rover-decoration");
const roverDecorationIdleSrc = "pic/смотрит.gif";
const roverDecorationActionSrc = "pic/rover-windows-xp.gif";
const ROVER_ACTION_DURATION_MS = 3300;

var roverRevealTimer = null;
var roverHideTimer = null;

function clearRoverTimers() {
    if (roverRevealTimer) {
        window.clearTimeout(roverRevealTimer);
        roverRevealTimer = null;
    }

    if (roverHideTimer) {
        window.clearTimeout(roverHideTimer);
        roverHideTimer = null;
    }
}

function pulseRoverDecoration() {
    if (!roverDecoration) {
        return;
    }

    clearRoverTimers();
    roverDecoration.src = `${roverDecorationActionSrc}?t=${Date.now()}`;

    roverRevealTimer = window.setTimeout(() => {
        roverHideTimer = window.setTimeout(() => {
            roverDecoration.src = roverDecorationIdleSrc;
            roverHideTimer = null;
        }, ROVER_ACTION_DURATION_MS);
        roverRevealTimer = null;
    }, 280);
}

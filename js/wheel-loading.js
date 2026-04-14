// Маленький лоадер у курсора во время вращения колеса.
var wheelLoadingGif = document.getElementById("wheel-loading-gif");
var wheelCursorX = window.innerWidth / 2;
var wheelCursorY = window.innerHeight / 2;
var wheelLoadingGifVisible = false;

function positionWheelLoadingGif(clientX, clientY) {
    if (!wheelLoadingGif) {
        return;
    }

    const offsetX = 16;
    const offsetY = 16;
    const maxLeft = Math.max(0, window.innerWidth - 44);
    const maxTop = Math.max(0, window.innerHeight - 44);

    wheelLoadingGif.style.left = `${Math.max(0, Math.min(clientX + offsetX, maxLeft))}px`;
    wheelLoadingGif.style.top = `${Math.max(0, Math.min(clientY + offsetY, maxTop))}px`;
}

function showWheelLoadingGif() {
    if (!wheelLoadingGif) {
        return;
    }

    wheelLoadingGifVisible = true;
    positionWheelLoadingGif(wheelCursorX, wheelCursorY);
    wheelLoadingGif.classList.add("is-visible");
}

function hideWheelLoadingGif() {
    if (!wheelLoadingGif) {
        return;
    }

    wheelLoadingGifVisible = false;
    wheelLoadingGif.classList.remove("is-visible");
}

window.addEventListener("pointermove", (event) => {
    wheelCursorX = event.clientX;
    wheelCursorY = event.clientY;

    if (wheelLoadingGifVisible) {
        positionWheelLoadingGif(wheelCursorX, wheelCursorY);
    }
});

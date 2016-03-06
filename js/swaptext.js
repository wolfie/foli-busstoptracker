'use strict';

/**
 * Swap two pieces of text in an element.
 * <p>
 * The texts are taken from the <code>data-swaptext</code> attribute of the element, separated
 * with a vertical pipe: |
 *
 * @param {HTMLElement} element
 * @param {object} [options]
 * @param {number} options.speed
 * @param {string} options.duration
 * @param {string} options.fadeOutFunction
 * @param {string} options.fadeInFunction
 */
function swapText(element, options) {
    if (!options) {
        options = {
            speed: 5000,
            duration: '1s',
            fadeOutFunction: 'cubic-bezier(0.55, 0.06, 0.68, 0.19)',
            fadeInFunction: 'cubic-bezier(0.22, 0.61, 0.36, 1)'
        };
    }

    //noinspection JSUnresolvedVariable
    var text = element.dataset.swaptext;
    if (!text) {
        element.textContent = "Can't find text to swap";
        return;
    }

    var splits = text.split('|', 2);

    if (!element.dataset.swapIsInitied) {
        element.dataset.swapIsInitied = true;
        element.style.opacity = 1;
        element.style.transitionProperty = 'opacity';
        element.style.transitionDuration = options.duration;
        element.textContent = splits[0];
    } else {
        var swapOut = function () {
            element.textContent = (element.textContent === splits[0]) ? splits[1] : splits[0];
            element.style.transitionTimingFunction = options.fadeInFunction;
            element.style.opacity = 1;
            element.removeEventListener('transitionend', swapOut);
        };

        element.addEventListener('transitionend', swapOut);
        element.style.transitionTimingFunction = options.fadeOutFunction;
        element.style.opacity = 0;
    }

    setTimeout(function () {
        swapText(element);
    }, options.speed);
}

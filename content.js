let activated = false;
let currentlyHighlighted = null;
let expandedElements = [];

const resetElements = () => {
    expandedElements.forEach(item => {
        Object.assign(item.element.style, item.originalStyles);
    });
    expandedElements = [];
};

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

const widenElement = (element, force = false) => {
    console.log(element + 'element:');

    const isAlreadyExpanded = expandedElements.some(item => item.element === element);

    // If the element has already been expanded and force is not set to true, exit the function.
    if (isAlreadyExpanded && !force) return;

    const computedStyles = window.getComputedStyle(element);
    const originalStyles = {
        width: computedStyles.width,
        position: computedStyles.position,
        left: computedStyles.left,
        zIndex: computedStyles.zIndex,
        backgroundColor: computedStyles.backgroundColor
    };
    
    console.log("🚀 ~ originalStyles:", originalStyles);
    
    const rect = element.getBoundingClientRect();
    console.log("🚀 ~ rect:", rect);
    
    const viewportCenterX = window.innerWidth / 2;
    console.log("🚀 ~ viewportCenterX:", viewportCenterX);
    
    if (originalStyles.position === "static") {
        console.log('Switching position to relative');
        element.style.position = 'relative';
        originalStyles.position = 'relative';
    }

    if (rect.left >= viewportCenterX) {
        console.log("Expanding to left");
        const rightOffset = window.innerWidth - rect.right;
        element.style.left = (originalStyles.left === "auto" ? -rightOffset : parseFloat(originalStyles.left) - rightOffset) + 'px';
    } else {
        console.log("Expanding to right");
    }

    // Adjustments for padding and borders
    const paddingLeft = parseFloat(computedStyles.paddingLeft);
    const paddingRight = parseFloat(computedStyles.paddingRight);
    const borderLeft = parseFloat(computedStyles.borderLeftWidth);
    const borderRight = parseFloat(computedStyles.borderRightWidth);
    
    element.style.width = `calc(98vw - ${paddingLeft + paddingRight + borderLeft + borderRight}px)`;   

    // Determine if the parent occupies the entire viewport width
    const parentWidth = element.parentElement.getBoundingClientRect().width;
    if (parentWidth >= window.innerWidth) {
        element.style.marginLeft = 'auto';
    } else {
        element.style.marginLeft = '.5vw';
    }

    element.style.zIndex = '9999'; 
    element.style.backgroundColor = 'white'; 
    
    if (!isAlreadyExpanded) {
        expandedElements.push({element: element, originalStyles: originalStyles});
    }
}

// Listener to reapply expanded styling after window resize
// Debounced resize listener with a timeout
window.addEventListener('resize', debounce(() => {
    setTimeout(() => {
        console.log('Expanded elements:', expandedElements);
        expandedElements.forEach(item => {
            console.log('item:', item);
            widenElement(item.element, true);
        });
    }, 2000); // This is your 2 seconds timeout
}, 250));

// Highlight elements on mouseover when activated
document.addEventListener('mouseover', e => {
    if (activated) {
        if (currentlyHighlighted) {
            currentlyHighlighted.style.outline = '';
        }
        e.target.style.outline = '2px solid red';
        currentlyHighlighted = e.target;
    }
});

// Reset elements on pressing 'Escape' key
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        resetElements();

    }
});

// Widen the clicked element
document.addEventListener('click', e => {
    if (activated) {
        e.preventDefault();
        widenElement(e.target);
    }
});

// Listen to messages from the background script
chrome.runtime.onMessage.addListener((message, sendResponse) => {
    console.log('Message received:', message);

    switch (message.action) {
        case 'queryStatus':
            sendResponse({ status: activated });
            break;
        case 'activate':
            activated = true;
            break;
        case 'deactivate':
            activated = false;
            if (currentlyHighlighted) {
                currentlyHighlighted.style.outline = '';
            }
            break;
    }
});

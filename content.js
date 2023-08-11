let activated = false;
let currentlyHighlighted = null;
let lastExpandedElement = null;


function widenElement(element) {
  let originalPosition = element.style.position;
  let originalWidth = element.style.width;
  let originalZIndex = element.style.zIndex;
  let originalBackgroundColor = element.style.backgroundColor;
  let originalLeft = element.style.left;

  const rect = element.getBoundingClientRect();
  console.log('rect',rect);
  const leftOffset = rect.left;

  element.style.width = '98vw';
  element.style.position = 'relative'; 
  element.style.zIndex = '9999'; 
  element.style.backgroundColor = 'white'; 
  element.style.left = `-${leftOffset}px`; 
  element.style.marginLeft = '.5vw';
  lastExpandedElement = element;
}

// Add a resize listener to the window
window.addEventListener('resize', function() {
  // If there's an element that was expanded, reapply the expansion
  setTimeout(() => {
    if (lastExpandedElement) {
      widenElement(lastExpandedElement);
  }
}, 2000);
});

document.addEventListener('mouseover', (e) => {
    if (activated) {
        if (currentlyHighlighted) {
            currentlyHighlighted.style.outline = '';  // Reset any previously highlighted element
        }
        e.target.style.outline = '2px solid red';
        currentlyHighlighted = e.target;
    }
});

document.addEventListener('click', (e) => {
    if (activated) {
        e.preventDefault();
        widenElement(e.target);
    }
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'activate') {
        activated = true;
    } else if (message.action === 'deactivate') {
        activated = false;
        if (currentlyHighlighted) {
            currentlyHighlighted.style.outline = '';
        }
    }
});

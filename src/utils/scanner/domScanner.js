function isVisible(el) {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();

    return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
    );
}

function summarizeElement(el) {
    const rect = el.getBoundingClientRect();

    return {
        nodeId: crypto.randomUUID(),
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        classList: el.classList.length
            ? Array.from(el.classList).slice(0, 5)
            : null,
        text: el.textContent
            ? el.textContent.trim().slice(0, 100)
            : null,
        attributes: {
            role: el.getAttribute('role'),
            ariaLabel: el.getAttribute('aria-label'),
            placeholder: el.getAttribute('placeholder'),
            name: el.getAttribute('name'),
            type: el.getAttribute('type'),
        },
        rect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
        },
        isVisible: true,
        isDisabled: el.disabled === true,
    };
}

const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, [role="button"], [onclick]';

export function scanDom() {
  const elements = Array.from(
    document.querySelectorAll(INTERACTIVE_SELECTOR)
  ).filter(isVisible);

  return elements.map((el) => {
    const ancestors = [];
    let parent = el.parentElement;
    let depth = 0;

    while (parent && depth < 3) {
      ancestors.push(summarizeElement(parent));
      parent = parent.parentElement;
      depth++;
    }

    const descendants = Array.from(el.children)
      .slice(0, 3)
      .map(summarizeElement);

    return {
      summary: summarizeElement(el),
      ancestors,
      descendants,
    };
  });
}
import { buildScanPayload } from "./utils/scanner/payloadBuilder";

class DomScanner {
    constructor(props) {
        this.partnerType = props.partnerType || 'gentoo';
    }

    init() {
        const btn = document.createElement('button');
        btn.innerText = 'Scan';
      
        Object.assign(btn.style, {
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          zIndex: 99999,
          padding: '8px 12px',
          fontSize: '12px',
        });
      
        btn.addEventListener('click', () => {
          const payload = buildScanPayload();
      
          console.group('[GENTOO SCAN]');
          console.log('PageType:', payload.meta.pageType);
          console.log('Candidates:', payload.candidates.length);
          console.log('Payload:', payload);
          console.groupEnd();
      
          window.__GENTOO_LAST_SCAN__ = payload;
        });
      
        document.body.appendChild(btn);
    }
}

// Export as a global variable
window.DomScanner = DomScanner;

(function (global, document) {
    var w = global;

    var domScanner; // Keep domScanner in closure scope

    // Create a persistent queue processor
    function createQueueProcessor() {
        var ge = function () {
            ge.q.push(Array.from(arguments));
            processQueue();
        };

        // Initialize queue
        ge.q = ge.q || [];

        ge.process = function (args) {
            var method = args[0];
            var params = args[1] || {};

            // Handle boot separately
            if (method === "boot") {
                try {
                    domScanner = new DomScanner(params);
                } catch (error) {
                    console.error("Failed to create DomScanner instance:", error);
                }
                return;
            }

            // For all other methods, ensure instance exists
            if (!domScanner) {
                console.error("DomScanner: Must call boot() before using this method");
                return;
            }

            // Process method
            switch (method) {
                case "init":
                    if (typeof domScanner.init === "function") {
                        Promise.resolve(domScanner.init(params)).catch((error) => {
                            console.error("Failed to initialize DomScanner:", error);
                        });
                    }
                    break;
                default:
                    console.error("DomScanner: Unknown method", method);
            }
        };

        return ge;
    }

    function processQueue() {
        while (w.DomScanner.q && w.DomScanner.q.length) {
            var args = w.DomScanner.q.shift();
            w.DomScanner.process(args);
        }
    }

    // Initialize or get existing DomScanner
    var existingDomScanner = w.DomScanner;
    w.DomScanner = createQueueProcessor();

    // Process any existing queue items
    if (existingDomScanner && existingDomScanner.q) {
        existingDomScanner.q.forEach(function (args) {
            w.DomScanner.process(args);
        });
    }
})(window, document);


DomScanner('boot', {
    partnerType: 'cafe24',
})

DomScanner('init', {});
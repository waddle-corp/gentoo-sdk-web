(
    function (global, document) {
        var w = global;
        if (w.GentooIO) { 
            return w.console.error("GentooIO script included twice"); 
        }; 

        // Function to inject CSS
        function injectCSS(href) {
            // Check if the CSS is already injected
            var existingLink = document.querySelector('link[href="' + href + '"]');
            if (existingLink) {
            return;
            }
    
            var link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = href;
            link.type = "text/css";
            link.onload = function() {
            console.log("GentooIO CSS loaded successfully.");
            };
            link.onerror = function() {
            console.error("Failed to load GentooIO CSS.");
            };
            document.head.appendChild(link);
        }
    
        // Inject the CSS automatically
        injectCSS("https://d32xcphivq9687.cloudfront.net/floating-button-sdk.min.css");
  
        var fb = null; 
        var ge = function () { 
            ge.c(arguments); 
        }; 
        ge.q = []; 
        ge.c = function (args) { 
            ge.q.push(args) 
        }; 
        ge.process = function (args) { 
            var method = args[0]; 
            var params = args[1]; 
            if (method === 'boot') { 
                fb = new w.FloatingButton(params); 
            } else if (method === 'update') { 
                fb.updateParameter(params); 
            } else if (method === 'unmount') {
                fb.destroy();
            }
        }; 
        w.GentooIO = ge; 
        function l() { 
            if (w.GentooIOInitialized) { return }; 
            w.GentooIOInitialized = true; 
            var s = document.createElement("script"); 
            s.type = "text/javascript"; 
            s.async = true; 
            s.src = "https://d32xcphivq9687.cloudfront.net/floating-button-sdk-cafe24.js"; 
            // s.src = "./floating-button-sdk-cafe24.js";
            s.onload = () => { 
                while (ge.q.length) { 
                    var args = ge.q.shift();
                    ge.process(args); 
                };  
                var sl = () => {handleScroll(w, sl)}
                w.addEventListener("scroll", sl) 
                w.addEventListener("message", ()=>{})
            }; 
            var x = document.getElementsByTagName("script")[0]; 
            if (x.parentNode) { 
                x.parentNode.insertBefore(s, x) 
            }; 
        }; 
        if (document.readyState === "complete") { 
            l(); 
        } else { 
            w.addEventListener("DOMContentLoaded", l); 
            w.addEventListener("load", l); 
        };
    }
)(window, document);

GentooIO('boot', {
    clientId: 'dlst',
    udid: 'd02a7e31-3727-4e72-8768-88d06d313eed',
    authCode: 'Token 65ca7bbe5995ac373b06bf3a2c09962a65403245',
    itemId: '31900',
})
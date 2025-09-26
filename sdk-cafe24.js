(
    function (global, document) {
        var w = global;
        if (w.GentooIO) { 
            return w.console.error("GentooIO script included twice"); 
        }; 
        var ge = function () { 
            ge.c(arguments); 
        }; 
        ge.q = []; 
        ge.c = function (args) { 
            ge.q.push(args) 
        }; 
        w.GentooIO = ge; 
        function l() { 
            if (w.GentooIOInitialized) { return }; 
            w.GentooIOInitialized = true; 
            var s = document.createElement("script"); 
            s.type = "text/javascript"; 
            s.async = true; 
            // s.src = "https://sdk.gentooai.com/floating-button-sdk-cafe24.js"; 
            s.src = 'https://dev-sdk.gentooai.com/floating-button-sdk-cafe24.js'; // dev
            // s.src = "./floating-button-sdk-cafe24.js"; 
            s.onload = () => { 
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
    partnerType: 'cafe24',
})

GentooIO('init', {});
(
    function (global, document) {
        var w = global;
        // Capture the wrapper origin before deferred loading clears currentScript.
        var sdkOrigin = document.currentScript?.src
            && new URL(document.currentScript.src).origin === 'https://dev-sdk.gentooai.com'
            ? 'https://dev-sdk.gentooai.com' : 'https://sdk.gentooai.com';
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
            var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 601;
            var source = '';
            source = isMobile 
                ? `${sdkOrigin}/dist/godomall-modal/floating-godomall-modal.js`
                : `${sdkOrigin}/dist/godomall/floating-godomall.js`;
            s.src = source;
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
    partnerType: 'godomall',
})

GentooIO('init', {});
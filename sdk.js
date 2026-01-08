(
    function (global, document) {
        var w = global;
        var ptid;
        if (w.GentooIO) { 
            return w.console.error("GentooIO script included twice"); 
        }; 
        var ge = function () { 
            ge.c(arguments); 
            ptid = arguments[0] === 'boot' && arguments[1].partnerId;
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
            var hostname = window.location.hostname;
            s.type = "text/javascript"; 
            s.async = true; 
            var isFastfive = hostname.includes('fastfive.co.kr') || ptid === '67615284c5ff44110dbc6613';
            var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 601;
            var source = '';
            source = isMobile && !isFastfive 
                ? `https://dev-sdk.gentooai.com/dist/gentoo-modal/floating-modal.js` 
                : 'https://dev-sdk.gentooai.com/dist/gentoo/floating.js';
            s.src = source;
            // s.src = "https://sdk.gentooai.com/dist/gentoo/floating.js"; 
            // s.src = 'https://dev-sdk.gentooai.com/dist/gentoo/floating.js'; // dev
            // s.src = "./dist/gentoo-modal/floating-modal.js"; 
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
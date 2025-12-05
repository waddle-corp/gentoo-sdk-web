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
            var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 601;
            // 🧪 Shopify 테스트용 SDK 로드
            if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
                // 로컬 개발 환경
                s.src = "./floating-button-sdk-shopifyTest.js";
            } else if (isMobile && (window.location.hostname === "7tmeab-ia.myshopify.com")) {
                // Mobile modal UI 적용 (둘리농장 테스트)
                s.src = "https://sdk.gentooai.com/dist/shopify-modal/floating-shopify-modal.js";
            } else {
                // 프로덕션 환경
                s.src = "https://sdk.gentooai.com/floating-button-sdk-shopifyTest.js"; 
            }
            // s.src = 'https://dev-sdk.gentooai.com/floating-button-sdk-shopifyTest.js'; // dev 
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

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
            // 세션별로 control:variantA:variantB=1:1:1로 할당 (sessionStorage 활용)
            var variantKey = 'gentoo-cafe24-variant';
            var variant;
            try {
                variant = sessionStorage.getItem(variantKey);
                if (!variant) {
                    // 0:control, 1:variantA, 2:variantB
                    var r = Math.floor(Math.random() * 3);
                    if (r === 0) variant = 'control';
                    else if (r === 1) variant = 'variantB';
                    else variant = 'variantC';
                    sessionStorage.setItem(variantKey, variant);
                }
            } catch (e) {
                // 세션스토리지 접근 실패시 fallback (임시, 랜덤)
                var r = Math.floor(Math.random() * 3);
                if (r === 0) variant = 'control';
                else if (r === 1) variant = 'variantB';
                else variant = 'variantC';
            }
            // s.src = "https://sdk.gentooai.com/dist/cafe24/floating-cafe24-glacier.js";
            var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 601;
            var source = isMobile ? (
                variant === 'control' ? 'https://dev-sdk.gentooai.com/floating-button-sdk-cafe24.js' : (
                    `https://dev-sdk.gentooai.com/dist/cafe24-modal/floating-cafe24-modal.js`
                )
            ) : 'https://dev-sdk.gentooai.com/floating-button-sdk-cafe24.js';
            s.src = source; // dev
            // s.src = "./dist/cafe24-modal/floating-cafe24-modal.js"; 
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
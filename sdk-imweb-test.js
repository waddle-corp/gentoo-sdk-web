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
            // 로컬 dev 환경에서는 로컬 dist 번들 로드, 그 외는 CDN
            if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
                s.src = isMobile
                    ? "./dist/imweb-modal/floating-imweb-modal.js"
                    : "./dist/imweb/floating-imweb.js";
            } else {
                s.src = isMobile
                    ? "https://dev-sdk.gentooai.com/dist/imweb-modal/floating-imweb-modal.js"
                    : "https://dev-sdk.gentooai.com/dist/imweb/floating-imweb.js";
            }
            s.onload = () => {
                w.addEventListener("message", () => { })
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

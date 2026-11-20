(function (window, document) {
    var currentScript = document.currentScript;
    if (!currentScript) return;

    var loaderUrl = new URL(currentScript.src);
    var prefix = loaderUrl.searchParams.get('path_prefix');
    if (!prefix || prefix === '/' || !prefix.startsWith('/') || !prefix.endsWith('/')) return;
    if (!window.location.pathname.startsWith(prefix)) return;

    var production = 'https://sdk.gentooai.com';
    var development = 'https://dev-sdk.gentooai.com';
    var sdkPath = '/sdk-cafe24.js';
    var origin = loaderUrl.origin === development ? development : production;

    function loadSdk() {
        if (window.GentooIO || document.querySelector('script[data-gentoo-cafe24-path-loader]')) return;
        var scripts = document.getElementsByTagName('script');
        for (var i = 0; i < scripts.length; i++) {
            if (!scripts[i].src) continue;
            var url = new URL(scripts[i].src, document.baseURI);
            if (url.pathname === sdkPath && (url.origin === production || url.origin === development)) return;
        }
        var script = document.createElement('script');
        script.async = true;
        script.dataset.gentooCafe24PathLoader = 'true';
        script.src = origin + sdkPath;
        document.head.appendChild(script);
    }

    if (document.readyState === 'complete') loadSdk();
    else window.addEventListener('load', loadSdk, { once: true });
})(window, document);

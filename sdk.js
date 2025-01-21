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
        injectCSS("https://d3qrvyizob9ouf.cloudfront.net/floating-button-sdk.css");
        
        var fb = null; 
        var ge = function () { 
            ge.c(arguments); 
        }; 
        ge.q = []; 
        ge.c = function (args) { 
            ge.q.push(args) 
        }; 
        ge.process = function (args) { 
            console.log('ge.process called', args);
            var method = args[0]; 
            var params = args[1]; 
            const parsedUrl = new URL(window.location.href);
            const pathSegments = parsedUrl.pathname.split('/');
            const transitionPage = '/' + pathSegments[1];
            const searchParams = new URLSearchParams(window.location.search);
            const utm = { utms: searchParams.get('utm_source'), utmm: searchParams.get('utm_medium'), utmcp: searchParams.get('utm_campaign'), utmct: searchParams.get('utm_content'), utmt: searchParams.get('utm_term'), tp: transitionPage };
            params.utm = utm;

            // Allow boot method anytime
            if (method === 'boot') { 
                try {
                    console.log('params', params);
                    fb = new w.FloatingButton(params); 
                } catch (error) {
                    console.error('Failed to create FloatingButton instance:', error);
                }
                return;
            }
            
            // For all other methods, ensure FloatingButton instance exists
            if (!fb) {
                console.error('GentooIO: Must call boot() before using this method');
                return;
            }

            // Process other methods
            switch (method) {
                case 'init':
                    if (typeof fb.init === 'function') {
                        Promise.resolve(fb.init()).catch(error => {
                            console.error('Failed to initialize GentooIO:', error);
                        });
                    }
                    break;
                case 'unmount':
                    try {
                        // Remove the SDK script
                        const sdkScript = document.querySelector('script[src="https://d3qrvyizob9ouf.cloudfront.net/floating-button-sdk.js"]');
                        if (sdkScript) {
                            sdkScript.parentNode.removeChild(sdkScript);
                        }
                        // Remove the CSS
                        const sdkCSS = document.querySelector('link[href="https://d3qrvyizob9ouf.cloudfront.net/floating-button-sdk.css"]');
                        if (sdkCSS) {
                            sdkCSS.parentNode.removeChild(sdkCSS);
                        }
                        // Clean up the instance
                        fb = null;
                        w.GentooIOInitialized = false;
                        console.log('GentooIO SDK removed successfully');
                    } catch (error) {
                        console.error('Failed to remove GentooIO SDK:', error);
                    }
                    break;
                case 'unmount1':
                    if (typeof fb.destroy === 'function') {
                        Promise.resolve(fb.destroy()).catch(error => {
                            console.error('Failed to unmount GentooIO:', error);
                        });
                    }
                    break;
                case 'sendLog':
                    if (typeof fb.sendLog === 'function') {
                        Promise.resolve(fb.sendLog(params)).catch(error => {
                            console.error('Failed to send GentooIO log:', error);
                        });
                    }
                    break;
                case 'setPageList':
                    if (typeof fb.setPageList === 'function') {
                        Promise.resolve(fb.setPageList(params)).catch(error => {
                            console.error('Failed to set GentooIO page list:', error);
                        });
                    }
                    break;
                default:
                    console.error('GentooIO: Unknown method', method);
            }
        }; 
        w.GentooIO = ge; 
        function l() { 
            console.log('l called', w.GentooIOInitialized);
            if (w.GentooIOInitialized) { return }; 
            w.GentooIOInitialized = true; 
            var s = document.createElement("script"); 
            s.type = "text/javascript"; 
            s.async = true; 
            s.src = "https://d3qrvyizob9ouf.cloudfront.net/floating-button-sdk.js"; 
            s.onload = () => { 
                console.log('s.onload called', w.GentooIOInitialized, ge.q);
                while (ge.q.length) { 
                    var args = ge.q.shift();
                    ge.process(args); 
                };  
                w.addEventListener("message", ()=>{})
            }; 
            var x = document.getElementsByTagName("script")[0]; 
            if (x.parentNode) { 
                x.parentNode.insertBefore(s, x) 
            }; 
        }; 
        if (document.readyState === "complete") { 
            console.log('document.readyState === "complete"');
            l(); 
        } else { 
            console.log('document.readyState !== "complete"');
            w.addEventListener("DOMContentLoaded", l); 
            w.addEventListener("load", l); 
        };
    }
)(window, document);
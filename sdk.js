(
    function (global, document) {
        var w = global;
        if (w.GentooIO) { 
            return w.console.error("GentooIO script included twice"); 
        }; 
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
            const searchParams = new URLSearchParams(window.location.search);
            const utm = { utms: searchParams.get('utm_source'), utmm: searchParams.get('utm_medium'), utmcp: searchParams.get('utm_campaign'), utmct: searchParams.get('utm_content') };
            params.utm = utm;

            // Allow boot method anytime
            if (method === 'boot') { 
                try {
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
                case 'update':
                    if (typeof fb.updateParameter === 'function') {
                        Promise.resolve(fb.updateParameter(params)).catch(error => {
                            console.error('Failed to update GentooIO parameters:', error);
                        });
                    }
                    break;
                case 'unmount':
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
                default:
                    console.error('GentooIO: Unknown method', method);
            }
        }; 
        w.GentooIO = ge; 
        function l() { 
            if (w.GentooIOInitialized) { return }; 
            w.GentooIOInitialized = true; 
            var s = document.createElement("script"); 
            s.type = "text/javascript"; 
            s.async = true; 
            s.src = "https://d32xcphivq9687.cloudfront.net/floating-button-sdk.js"; 
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
        function handleScroll(tn, sl) {  
            var st = tn.scrollY; 
            var dh = document.getElementById('gentoo-sc').clientHeight;
            var sp = st / (dh - tn.innerHeight); 
            if (sp >= 0.6) { 
                ge.process(['update', { type: 'needs' }]); 
                tn.removeEventListener('scroll', sl); 
            } 
        }; 
        if (document.readyState === "complete") { 
            l(); 
        } else { 
            w.addEventListener("DOMContentLoaded", l); 
            w.addEventListener("load", l); 
        };
    }
)(window, document);
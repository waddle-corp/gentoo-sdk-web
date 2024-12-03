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
            // s.src = "https://d32xcphivq9687.cloudfront.net/floating-button-sdk.js"; 
            s.src = "/floating-button-sdk.js"; 
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
// Console detection and prevention
(function() {
    // Function to detect and prevent console opening
    function preventConsole() {
        // Override console methods
        const consoleMethods = ['log', 'info', 'warn', 'error', 'debug'];
        consoleMethods.forEach(method => {
            console[method] = function() {
                // Optionally log to a secure server instead
                return;
            };
        });

        // Detect DevTools opening
        let devtools = function() {};
        devtools.toString = function() {
            preventConsole();
            return '';
        };

        // Check for DevTools periodically
        setInterval(function() {
            const widthThreshold = window.outerWidth - window.innerWidth > 160;
            const heightThreshold = window.outerHeight - window.innerHeight > 160;
            
            if (widthThreshold || heightThreshold) {
                preventConsole();
                // Redirect to a warning page or show a message
                window.location.href = 'about:blank';
            }
        }, 1000);
    }

    // Disable right-click context menu
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });

    // Disable keyboard shortcuts for DevTools
    document.addEventListener('keydown', function(e) {
        // F12 key
        if (e.keyCode === 123) {
            e.preventDefault();
            return false;
        }
        
        // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
        if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
            e.preventDefault();
            return false;
        }
        
        // Ctrl+U (View Source)
        if (e.ctrlKey && e.keyCode === 85) {
            e.preventDefault();
            return false;
        }

        // Ctrl+S (Save Page)
        if (e.ctrlKey && e.keyCode === 83) {
            e.preventDefault();
            return false;
        }

        // Ctrl+P (Print)
        if (e.ctrlKey && e.keyCode === 80) {
            e.preventDefault();
            return false;
        }
    });

    // Prevent drag and drop of elements
    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    });

    // Prevent selection of text
    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
        return false;
    });

    // Prevent copy
    document.addEventListener('copy', function(e) {
        e.preventDefault();
        return false;
    });

    // Prevent cut
    document.addEventListener('cut', function(e) {
        e.preventDefault();
        return false;
    });

    // Prevent paste
    document.addEventListener('paste', function(e) {
        e.preventDefault();
        return false;
    });

    // Disable view source through browser menu
    document.addEventListener('keyup', function(e) {
        // Alt+U (View Source in some browsers)
        if (e.altKey && e.keyCode === 85) {
            e.preventDefault();
            return false;
        }
    });

    // Disable browser's "View Page Source" option
    document.addEventListener('keydown', function(e) {
        // Alt+U (View Source in some browsers)
        if (e.altKey && e.keyCode === 85) {
            e.preventDefault();
            return false;
        }
    });

    // Disable browser's "Inspect Element" option
    document.addEventListener('keydown', function(e) {
        // Alt+Shift+I (Inspect Element in some browsers)
        if (e.altKey && e.shiftKey && e.keyCode === 73) {
            e.preventDefault();
            return false;
        }
    });

    // Disable browser's "Developer Tools" option
    document.addEventListener('keydown', function(e) {
        // Alt+Shift+D (Developer Tools in some browsers)
        if (e.altKey && e.shiftKey && e.keyCode === 68) {
            e.preventDefault();
            return false;
        }
    });

    // Disable browser's "Network" tab
    document.addEventListener('keydown', function(e) {
        // Alt+Shift+N (Network tab in some browsers)
        if (e.altKey && e.shiftKey && e.keyCode === 78) {
            e.preventDefault();
            return false;
        }
    });

    // Disable browser's "Elements" tab
    document.addEventListener('keydown', function(e) {
        // Alt+Shift+E (Elements tab in some browsers)
        if (e.altKey && e.shiftKey && e.keyCode === 69) {
            e.preventDefault();
            return false;
        }
    });

    // Disable browser's "Console" tab
    document.addEventListener('keydown', function(e) {
        // Alt+Shift+C (Console tab in some browsers)
        if (e.altKey && e.shiftKey && e.keyCode === 67) {
            e.preventDefault();
            return false;
        }
    });

    // Disable browser's "Sources" tab
    document.addEventListener('keydown', function(e) {
        // Alt+Shift+S (Sources tab in some browsers)
        if (e.altKey && e.shiftKey && e.keyCode === 83) {
            e.preventDefault();
            return false;
        }
    });

    // Disable browser's "Application" tab
    document.addEventListener('keydown', function(e) {
        // Alt+Shift+A (Application tab in some browsers)
        if (e.altKey && e.shiftKey && e.keyCode === 65) {
            e.preventDefault();
            return false;
        }
    });

    // Disable browser's "Security" tab
    document.addEventListener('keydown', function(e) {
        // Alt+Shift+T (Security tab in some browsers)
        if (e.altKey && e.shiftKey && e.keyCode === 84) {
            e.preventDefault();
            return false;
        }
    });

    // Disable browser's "Performance" tab
    document.addEventListener('keydown', function(e) {
        // Alt+Shift+P (Performance tab in some browsers)
        if (e.altKey && e.shiftKey && e.keyCode === 80) {
            e.preventDefault();
            return false;
        }
    });

    // Disable browser's "Memory" tab
    document.addEventListener('keydown', function(e) {
        // Alt+Shift+M (Memory tab in some browsers)
        if (e.altKey && e.shiftKey && e.keyCode === 77) {
            e.preventDefault();
            return false;
        }
    });

    // Disable browser's "Lighthouse" tab
    document.addEventListener('keydown', function(e) {
        // Alt+Shift+L (Lighthouse tab in some browsers)
        if (e.altKey && e.shiftKey && e.keyCode === 76) {
            e.preventDefault();
            return false;
        }
    });

    // Disable browser's "Audits" tab
    document.addEventListener('keydown', function(e) {
        // Alt+Shift+U (Audits tab in some browsers)
        if (e.altKey && e.shiftKey && e.keyCode === 85) {
            e.preventDefault();
            return false;
        }
    });

    // Disable browser's "Coverage" tab
    document.addEventListener('keydown', function(e) {
        // Alt+Shift+O (Coverage tab in some browsers)
        if (e.altKey && e.shiftKey && e.keyCode === 79) {
            e.preventDefault();
            return false;
        }
    });

    // Disable browser's "Rendering" tab
    document.addEventListener('keydown', function(e) {
        // Alt+Shift+R (Rendering tab in some browsers)
        if (e.altKey && e.shiftKey && e.keyCode === 82) {
            e.preventDefault();
            return false;
        }
    });

    // Disable browser's "Timeline" tab
    document.addEventListener('keydown', function(e) {
        // Alt+Shift+T (Timeline tab in some browsers)
        if (e.altKey && e.shiftKey && e.keyCode === 84) {
            e.preventDefault();
            return false;
        }
    });

    // Disable browser's "Profiles" tab
    document.addEventListener('keydown', function(e) {
        // Alt+Shift+P (Profiles tab in some browsers)
        if (e.altKey && e.shiftKey && e.keyCode === 80) {
            e.preventDefault();
            return false;
        }
    });

    // Disable browser's "JavaScript Profiler" tab
    document.addEventListener('keydown', function(e) {
        // Alt+Shift+J (JavaScript Profiler tab in some browsers)
        if (e.altKey && e.shiftKey && e.keyCode === 74) {
            e.preventDefault();
            return false;
        }
    });

    // Disable browser's "Heap Profiler" tab
    document.addEventListener('keydown', function(e) {
        // Alt+Shift+H (Heap Profiler tab in some browsers)
        if (e.altKey && e.shiftKey && e.keyCode === 72) {
            e.preventDefault();
            return false;
        }
    });

    // Disable browser's "CPU Profiler" tab
    document.addEventListener('keydown', function(e) {
        // Alt+Shift+C (CPU Profiler tab in some browsers)
        if (e.altKey && e.shiftKey && e.keyCode === 67) {
            e.preventDefault();
            return false;
        }
    });

    // Initialize console prevention
    preventConsole();
})(); 
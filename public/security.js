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
                // Optionally redirect or show warning
                // window.location.href = 'about:blank';
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

    // Initialize console prevention
    preventConsole();
})(); 
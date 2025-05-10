/**
 * Site Protection - Comprehensive
 * Combines anti-inspection, download protection, and source protection in one file
 */

(function() {
    //-------------------------------------------------------------------------
    // Anti-Inspection Protection
    //-------------------------------------------------------------------------
    
    // Disable right-click context menu
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    }, false);

    // Disable keyboard shortcuts for developer tools and saving
    document.addEventListener('keydown', function(e) {
        // Common DevTools shortcuts
        if (
            // F12 key
            e.key === 'F12' || e.keyCode === 123 ||
            
            // Ctrl+Shift+I/J/C (Chrome/Firefox/Edge DevTools)
            (e.ctrlKey && e.shiftKey && (
                e.key === 'I' || e.key === 'i' || 
                e.key === 'J' || e.key === 'j' || 
                e.key === 'C' || e.key === 'c'
            )) ||
            
            // Ctrl+Shift+K (Firefox dev tools)
            (e.ctrlKey && e.shiftKey && (e.key === 'K' || e.key === 'k')) ||
            
            // Ctrl+U (View Source)
            (e.ctrlKey && (e.key === 'U' || e.key === 'u')) ||
            
            // F5/Ctrl+R (Refresh) - Can be removed if impacting user experience
            (e.key === 'F5' || (e.ctrlKey && (e.key === 'R' || e.key === 'r'))) ||
            
            // Ctrl+S (Save)
            (e.ctrlKey && (e.key === 'S' || e.key === 's')) ||
            
            // Ctrl+Shift+S (Save As)
            (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) ||
            
            // Ctrl+P (Print)
            (e.ctrlKey && (e.key === 'P' || e.key === 'p')) ||
            
            // Ctrl+O (Open file)
            (e.ctrlKey && (e.key === 'O' || e.key === 'o')) ||
            
            // Alt+Shift+I (Firefox Responsive Design Mode)
            (e.altKey && e.shiftKey && (e.key === 'I' || e.key === 'i'))
        ) {
            e.preventDefault();
            return false;
        }
    });

    // Disable copy, cut, paste on the page
    document.addEventListener('copy', function(e) {
        // Allow copy in input fields and textareas
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return true;
        }
        e.preventDefault();
        return false;
    }, false);
    
    document.addEventListener('cut', function(e) {
        // Allow cut in input fields and textareas
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return true;
        }
        e.preventDefault();
        return false;
    }, false);
    
    document.addEventListener('paste', function(e) {
        // Allow paste in input fields and textareas
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return true;
        }
        e.preventDefault();
        return false;
    }, false);
    
    // Disable text selection
    const style = document.createElement('style');
    style.innerHTML = `
        body {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }
        
        /* Allow selection for input fields and textareas */
        input, textarea {
            -webkit-user-select: auto;
            -moz-user-select: auto;
            -ms-user-select: auto;
            user-select: auto;
        }
    `;
    document.head.appendChild(style);
    
    // Prevent text selection
    document.addEventListener('selectstart', function(e) {
        // Allow selection in input fields and textareas
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return true;
        }
        e.preventDefault();
        return false;
    }, false);

    // DevTools detection with multiple methods
    const devToolsDetector = {
        isOpen: false,
        
        // Method 1: Check window size difference
        checkWindowSizeDifference: function() {
            const threshold = 160;
            const widthThreshold = window.outerWidth - window.innerWidth > threshold;
            const heightThreshold = window.outerHeight - window.innerHeight > threshold;
            
            if (widthThreshold || heightThreshold) {
                return true;
            }
            return false;
        },
        
        // Method 2: Check for DevTools object
        checkDevToolsObject: function() {
            const devtoolsKeys = /./;
            devtoolsKeys.toString = function() {
                this.isOpen = true;
                return '';
            };
            
            console.debug(devtoolsKeys);
            return this.isOpen;
        },
        
        // Method 3: Check if debugger was triggered
        checkDebugger: function() {
            let triggered = false;
            const start = new Date().getTime();
            
            function debuggerChecker() {
                debugger;
                const debugTime = new Date().getTime() - start;
                if (debugTime > 100) {
                    triggered = true;
                }
            }
            
            debuggerChecker();
            return triggered;
        },
        
        // Main check method combining all techniques
        checkDevTools: function() {
            const methodsTriggered = [
                this.checkWindowSizeDifference(),
                this.checkDevToolsObject()
                // this.checkDebugger() // Disabled for better performance
            ];
            
            const isDevToolsOpen = methodsTriggered.some(result => result === true);
            
            if (isDevToolsOpen) {
                if (!this.isOpen) {
                    this.isOpen = true;
                    this.handleDevToolsChange(true);
                }
            } else {
                if (this.isOpen) {
                    this.isOpen = false;
                    this.handleDevToolsChange(false);
                }
            }
        },
        
        // Handle DevTools opening/closing
        handleDevToolsChange: function(isOpen) {
            if (isOpen) {
                // Add overlay
                document.body.innerHTML = '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:#fff;z-index:9999;text-align:center;padding-top:20%;font-size:24px;">Inspection is not allowed</div>';
            }
        },
        
        // Initialize detector
        init: function() {
            setInterval(this.checkDevTools.bind(this), 500);
            this.checkDevTools();
        }
    };

    // Start DevTools detector
    devToolsDetector.init();

    // Console protection
    const consoleOverrides = {
        // Store original console methods
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
        
        // Override console methods
        overrideConsole: function() {
            console.log = console.info = console.warn = console.error = console.debug = function() {
                // Display message when console is used
                document.body.innerHTML = '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:#fff;z-index:9999;text-align:center;padding-top:20%;font-size:24px;">Console access is not allowed</div>';
            };
        },
        
        // Initialize console overrides
        init: function() {
            this.overrideConsole();
        }
    };

    // Override console methods
    consoleOverrides.init();

    // Anti-debugging
    setInterval(function() {
        debugger;
    }, 100);
    
    //-------------------------------------------------------------------------
    // Download Protection
    //-------------------------------------------------------------------------
    
    // Track Ctrl+S presses
    window.ctrlSPressed = false;
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
            window.ctrlSPressed = true;
        }
    });
    
    // Block saving the web page
    window.addEventListener('beforeunload', function(e) {
        // Only block if Ctrl+S was pressed
        if (window.ctrlSPressed) {
            e.preventDefault();
            e.returnValue = '';
            window.ctrlSPressed = false;
            return '';
        }
    });
    
    // Disable HTML5 download attribute functionality
    function disableDownloadLinks() {
        const links = document.querySelectorAll('a[download]');
        links.forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                return false;
            });
        });
    }
    
    // Run immediately and also observe DOM for new download links
    window.addEventListener('DOMContentLoaded', disableDownloadLinks);
    
    // Create observer to monitor for any new download links added to the page
    const downloadObserver = new MutationObserver(function(mutations) {
        disableDownloadLinks();
    });
    
    // Start observing when DOM is ready
    window.addEventListener('DOMContentLoaded', function() {
        downloadObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
    
    // Disable Firefox-specific context menu options for images and links
    if (navigator.userAgent.includes('Firefox')) {
        document.addEventListener('contextmenu', function(e) {
            const target = e.target;
            if (target.tagName && (target.tagName === 'IMG' || target.tagName === 'A')) {
                e.preventDefault();
                return false;
            }
        });
    }
    
    // Block downloading images directly
    document.addEventListener('contextmenu', function(e) {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
            return false;
        }
    });
    
    // Add invisible overlay over images to prevent direct saving
    function protectImages() {
        const images = document.querySelectorAll('img');
        images.forEach(function(img) {
            // Skip already protected images
            if (img.hasAttribute('data-protected')) return;
            
            // Create a transparent overlay
            const overlay = document.createElement('div');
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.zIndex = '10000';
            overlay.style.backgroundColor = 'transparent';
            
            // Make the image container positioned
            const container = img.parentNode;
            if (window.getComputedStyle(container).position === 'static') {
                container.style.position = 'relative';
            }
            
            // Add the overlay
            container.appendChild(overlay);
            
            // Mark the image as protected
            img.setAttribute('data-protected', 'true');
        });
    }
    
    // Run image protection when DOM is ready
    window.addEventListener('DOMContentLoaded', protectImages);
    
    // Watch for new images
    const imageObserver = new MutationObserver(protectImages);
    window.addEventListener('DOMContentLoaded', function() {
        imageObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
    
    //-------------------------------------------------------------------------
    // Source Code Protection
    //-------------------------------------------------------------------------
    
    // Override toString methods to confuse console inspection
    Function.prototype.toString = function() {
        return 'Function code cannot be viewed';
    };
    
    // Detect network inspection
    let lastNetworkActivity = Date.now();
    const originalXHR = window.XMLHttpRequest;
    const originalFetch = window.fetch;
    
    // Check for excessive network activity (indicating dev tools network tab)
    window.XMLHttpRequest = function() {
        lastNetworkActivity = Date.now();
        return new originalXHR();
    };
    
    window.fetch = function() {
        lastNetworkActivity = Date.now();
        return originalFetch.apply(this, arguments);
    };
    
    // Periodically check for network tab activity
    setInterval(function() {
        // If there's a lot of network activity within short time, it might be DevTools
        const excessiveNetworkActivity = (Date.now() - lastNetworkActivity) < 100;
        if (excessiveNetworkActivity) {
            console.clear();
        }
    }, 1000);
    
    // Iframe protection
    if (window.self !== window.top) {
        window.top.location = window.self.location;
    }
    
    // Detect breakpoint / step debugging
    let lastTime = Date.now();
    let suspiciousDebugCount = 0;
    
    setInterval(function() {
        const currentTime = Date.now();
        const elapsedTime = currentTime - lastTime;
        
        // If the time elapsed is significantly more than expected for the interval,
        // it could indicate a breakpoint or stepping through code
        if (elapsedTime > 100) { // Normal timing should be close to the interval
            suspiciousDebugCount++;
            
            if (suspiciousDebugCount > 3) {
                // Take action on suspected debugger usage
                document.body.innerHTML = '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:#fff;z-index:9999;text-align:center;padding-top:20%;font-size:24px;">Debugging not allowed</div>';
                suspiciousDebugCount = 0;
            }
        } else {
            suspiciousDebugCount = Math.max(0, suspiciousDebugCount - 1);
        }
        
        lastTime = currentTime;
    }, 50);
    
    // Override performance API which can be used to detect DevTools
    const originalGetEntries = window.performance.getEntries;
    window.performance.getEntries = function() {
        return [];
    };
    
    // Override memory API which can reveal too much information
    if (window.performance && window.performance.memory) {
        window.performance.memory = undefined;
    }
    
    //-------------------------------------------------------------------------
    // DOM Mutation Observer (Detect page tampering)
    //-------------------------------------------------------------------------
    
    const domMutationDetector = {
        observer: null,
        
        // Initialize mutation observer
        init: function() {
            this.observer = new MutationObserver(this.handleMutations.bind(this));
            
            // Start observing when DOM is ready
            window.addEventListener('DOMContentLoaded', () => {
                // Start observing the entire document for all changes
                this.observer.observe(document.documentElement, {
                    childList: true,
                    attributes: true,
                    characterData: true,
                    subtree: true,
                    attributeOldValue: true,
                    characterDataOldValue: true
                });
            });
        },
        
        // Handle detected mutations
        handleMutations: function(mutations) {
            for (let mutation of mutations) {
                // Ignore our own style changes for anti-inspection
                if (mutation.target === style) continue;
                
                // Ignore changes to our own overlay
                if (mutation.target.id === 'anti-inspection-overlay') continue;
                
                // Check for DevTools-related modifications
                if (this.isDevToolsModification(mutation)) {
                    this.handleTampering();
                    break;
                }
            }
        },
        
        // Identify if the mutation is related to DevTools activity
        isDevToolsModification: function(mutation) {
            // Look for DevTools-specific elements or attributes
            const devToolsClasses = ['__devtools', 'devtools', 'dev-tools', 'console-panel'];
            const devToolsAttributes = ['devtoolsid', 'data-devtools'];
            
            // Check for typical DevTools-like insertions
            if (mutation.type === 'childList' && mutation.addedNodes.length) {
                for (let node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check node classes
                        if (node.classList) {
                            for (let cls of devToolsClasses) {
                                if (node.classList.contains(cls)) {
                                    return true;
                                }
                            }
                        }
                        
                        // Check attributes
                        for (let attr of devToolsAttributes) {
                            if (node.hasAttribute(attr)) {
                                return true;
                            }
                        }
                    }
                }
            }
            
            return false;
        },
        
        // Handle tampering detection
        handleTampering: function() {
            // Clear page content
            document.body.innerHTML = '<div id="anti-inspection-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:#fff;z-index:9999;text-align:center;padding-top:20%;font-size:24px;">Page tampering detected</div>';
        }
    };
    
    // Initialize DOM mutation detector
    domMutationDetector.init();
    
    // Disable drag and drop of page elements
    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    }, false);
})(); 
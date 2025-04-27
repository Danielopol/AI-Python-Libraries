// Debug helper to display console logs on the page
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    // Create debug console element
    const debugConsole = document.createElement('div');
    debugConsole.id = 'debug-console';
    debugConsole.style.cssText = 'position: fixed; bottom: 10px; right: 10px; width: 300px; max-height: 200px; overflow: auto; background: rgba(0,0,0,0.8); color: #0f0; font-family: monospace; padding: 10px; border-radius: 5px; z-index: 9999; font-size: 11px; display: none;';
    document.body.appendChild(debugConsole);
    
    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.innerHTML = 'Show Debug';
    toggleBtn.style.cssText = 'position: fixed; bottom: 10px; right: 10px; padding: 5px 10px; background: #333; color: #fff; border: none; border-radius: 3px; cursor: pointer; z-index: 10000;';
    document.body.appendChild(toggleBtn);
    
    // Toggle debug console
    toggleBtn.addEventListener('click', function() {
      if (debugConsole.style.display === 'none') {
        debugConsole.style.display = 'block';
        toggleBtn.innerHTML = 'Hide Debug';
        toggleBtn.style.bottom = '220px';
      } else {
        debugConsole.style.display = 'none';
        toggleBtn.innerHTML = 'Show Debug';
        toggleBtn.style.bottom = '10px';
      }
    });
    
    // Override console methods
    const oldLog = console.log;
    const oldError = console.error;
    const oldWarn = console.warn;
    
    function formatLog(type, args) {
      const timestamp = new Date().toLocaleTimeString();
      const logEntry = document.createElement('div');
      logEntry.className = `log-${type}`;
      
      if (type === 'error') {
        logEntry.style.color = '#f44';
      } else if (type === 'warn') {
        logEntry.style.color = '#ff0';
      }
      
      // Format args to string
      let message = '';
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (typeof arg === 'object') {
          try {
            message += JSON.stringify(arg);
          } catch (e) {
            message += '[Object]';
          }
        } else {
          message += arg;
        }
        if (i < args.length - 1) message += ' ';
      }
      
      logEntry.textContent = `[${timestamp}] ${type}: ${message}`;
      debugConsole.appendChild(logEntry);
      debugConsole.scrollTop = debugConsole.scrollHeight;
      
      // Limit log entries
      while (debugConsole.children.length > 100) {
        debugConsole.removeChild(debugConsole.firstChild);
      }
    }
    
    console.log = function() {
      formatLog('log', arguments);
      oldLog.apply(console, arguments);
    };
    
    console.error = function() {
      formatLog('error', arguments);
      oldError.apply(console, arguments);
    };
    
    console.warn = function() {
      formatLog('warn', arguments);
      oldWarn.apply(console, arguments);
    };
    
    // Add load event complete
    console.log('Debug helper loaded');
    
    // Add category path info
    const path = window.location.pathname;
    const search = window.location.search;
    console.log('Current path:', path);
    console.log('Query string:', search);
    
    // Add test function
    window.testCategoryData = function() {
      fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vSHHCGDLX5wuhG7HzMtzs9Sh_mvKKMBCxR4lQnmgVE77dxbWj65lk3-fAGMqUF45xp4FYA6J1Y_A4Ak/pub?gid=1604699992&single=true&output=csv")
        .then(response => {
          console.log('Response status:', response.status);
          console.log('Response headers:', response.headers);
          return response.text();
        })
        .then(data => {
          console.log('CSV data loaded, first 100 chars:', data.substring(0, 100));
        })
        .catch(error => {
          console.error('Error fetching CSV:', error);
        });
    };
  });
})(); 
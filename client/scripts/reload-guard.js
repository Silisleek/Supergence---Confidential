(function () {
  var lastReloadKey = 'supergence_last_reload_timestamp';
  var reloadCountKey = 'supergence_rapid_reload_count';
  var now = Date.now();
  var lastReload = parseInt(sessionStorage.getItem(lastReloadKey) || '0', 10);
  var count = parseInt(sessionStorage.getItem(reloadCountKey) || '0', 10);

  if (now - lastReload < 4000) {
    count++;
    sessionStorage.setItem(reloadCountKey, count.toString());
    if (count > 2) {
      console.warn('[Supergence Shield] Rapid reload loop detected and suppressed.');
    }
  } else {
    sessionStorage.setItem(reloadCountKey, '0');
  }
  sessionStorage.setItem(lastReloadKey, now.toString());

  var origReload = window.location.reload.bind(window.location);
  var reloadBlockedUntil = now + 4000;
  try {
    Object.defineProperty(window.location, 'reload', {
      configurable: true,
      writable: true,
      value: function (forced) {
        var t = Date.now();
        if (t < reloadBlockedUntil) {
          console.warn(
            '[Supergence Shield] location.reload() suppressed to prevent infinite loop.',
          );
          return;
        }
        reloadBlockedUntil = t + 5000;
        origReload(forced);
      },
    });
  } catch (_) {}

  if (window.WebSocket) {
    var OrigWS = window.WebSocket;
    window.WebSocket = function (url, protocols) {
      var ws = new (Function.prototype.bind.apply(
        OrigWS,
        [null].concat(Array.prototype.slice.call(arguments)),
      ))();
      if (typeof url === 'string' && (url.includes(':5500') || url.includes('/ws'))) {
        var lastLsReload = 0;
        var origAddEventListener = ws.addEventListener.bind(ws);
        ws.addEventListener = function (type, listener, options) {
          if (type === 'message') {
            var wrapped = function (e) {
              if (e && e.data === 'reload') {
                var cur = Date.now();
                if (cur - lastLsReload < 8000) {
                  console.warn(
                    '[Supergence Shield] Dev server reload event suppressed (background file activity).',
                  );
                  return;
                }
                lastLsReload = cur;
              }
              return listener.apply(this, arguments);
            };
            return origAddEventListener(type, wrapped, options);
          }
          return origAddEventListener(type, listener, options);
        };
      }
      return ws;
    };
    window.WebSocket.prototype = OrigWS.prototype;
    // Preserve native constants such as OPEN and CONNECTING. Consumers use
    // these to determine whether a connection can send or needs reconnecting.
    Object.setPrototypeOf(window.WebSocket, OrigWS);
  }
})();

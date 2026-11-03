(function () {
  var version = "2026.05.0";
  var contentResetVersion = "2026.04.0-stage-reset-2";
  var host = String(window.location.hostname || "").toLowerCase();
  var channel = "custom";

  if (host.indexOf("github.io") !== -1) {
    channel = "github-pages";
  } else if (host.indexOf("web.app") !== -1 || host.indexOf("firebaseapp.com") !== -1) {
    channel = "firebase-hosting";
  } else if (host === "localhost" || host === "127.0.0.1") {
    channel = "local";
  }

  window.FLASH_RECALL_VERSION = version;
  window.FLASH_RECALL_RELEASE_CHANNEL = channel;
  window.FLASH_RECALL_BUILD_ID = version + "-" + channel;
  window.FLASH_RECALL_CONTENT_RESET_VERSION = contentResetVersion;
  window.FLASH_RECALL_PROGRESS_LEADERBOARD_VERSION = contentResetVersion;
})();

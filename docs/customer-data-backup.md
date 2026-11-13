# Backing up Supergence data

Quit Supergence completely from its tray menu before copying data. Closing a
window may leave a process running. Keep the application closed while restoring.

The default private root is `%APPDATA%\Supergence`. Copy the entire directory to
private backup storage. If custom data or workspace paths were selected in
Settings, copy those directories too; the settings path alone does not include
external folders. Include the complete data directory, SQLite databases and their
sidecar files, credentials keys, chats, learning sources, project files and path
configuration. A database file copied alone can omit committed WAL data.

Backups contain private chats, files and credential material. Keep them private.
Do not attach them to public bug reports or include them in source releases.

To restore, keep the original data and backup intact, close the app, and copy the
complete backup into the intended private paths. Reopen Supergence with those
paths, reconnect your Sleek account, and check a retained source, conversation and
project before resuming work. An old authentication cookie is not a restored
server session. Keep the original backup until this verification succeeds.

The packaged acceptance test exercised same-version restart and a complete
closed-app backup restored into different isolated paths. It did not exercise an
installer upgrade from an older version or certify arbitrary user backups.

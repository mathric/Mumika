const DEFAULT_DB_PATH = 'sqlite.db';
let sqlite3 = require('sqlite3').verbose();
let db;

//TODO add fk = on everytime since sqlite not persist
function initDBConnection(db_path=DEFAULT_DB_PATH) {
    db = new sqlite3.Database(db_path, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
            console.error(err);
            exit(1);
        }
    });
}

function migrate() {
    //check current migration
}

initDBConnection();
migrate();

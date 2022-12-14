pragma foreign_keys = on;

create table migration (
    id INTEGER PRIMARY KEY,
    record INTEGER UNIQUE
);

create table tag (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE,
    description TEXT,
    parent_id INTEGER
);

create table image (
    id INTEGER PRIMARY KEY,
    path TEXT UNIQUE
);

create table image_tag (
    id INTEGER PRIMARY KEY,
    image_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    FOREIGN KEY(image_id) REFERENCES image(id),
    FOREIGN KEY(tag_id) REFERENCES tag(id)
);

INSERT INTO migration VALUES(NULL, 1);
-- creacion de tablas de usuarios 

CREATE TABLE users (
id SERIAL PRIMARY KEY,
username VARCHAR (50) UNIQUE NOT NULL,
email VARCHAR (255) UNIQUE NOT NULL,
password_hash VARCHAR (255) NOT NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
last_login TIMESTAMP WITH TIME ZONE
);

-- creacion de tablas de sesion para conectarlas a pg-simple
CREATE TABLE session (
sid varchar NOT NULL COLLATE "default",
sess json NOT NULL,
expire timestamp(6) NOT NULL,
CONSTRAINT session_pkey PRIMARY KEY (sid)
);

CREATE INDEX IDX_session_expire ON session (expire);
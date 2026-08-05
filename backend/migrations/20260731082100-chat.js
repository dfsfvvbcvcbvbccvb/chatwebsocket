export function up(db) {
  return db.runSql(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INT PRIMARY KEY AUTO_INCREMENT,
      login VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      userId INT NOT NULL,
      sessionId VARCHAR(255) NOT NULL
    );
    CREATE TABLE IF NOT EXISTS friends (
      id INT PRIMARY KEY AUTO_INCREMENT,
      userId INT NOT NULL,
      username VARCHAR(255) NOT NULL,
      friendId INT NOT NULL,
      friendUsername VARCHAR(255) NOT NULL
    );
    CREATE TABLE IF NOT EXISTS requests (
      id INT PRIMARY KEY AUTO_INCREMENT,
      senderId INT NOT NULL,
      receiverId INT NOT NULL,
      senderUsername VARCHAR(255) NOT NULL,
      receiverUsername VARCHAR(255) NOT NULL
    );
  `);
}

export function down(db) {
  return db.runSql(`DROP TABLE IF EXISTS accounts`);
}
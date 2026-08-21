export function up(db) {
  return db.runSql(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INT PRIMARY KEY AUTO_INCREMENT,
      login VARCHAR(255) NOT NULL UNIQUE,
      description VARCHAR(255),
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
      friendId INT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS requests (
      id INT PRIMARY KEY AUTO_INCREMENT,
      senderId INT NOT NULL,
      receiverId INT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS friends (
      id INT PRIMARY KEY AUTO_INCREMENT,
      userId1 INT NOT NULL,
      userId2 INT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INT PRIMARY KEY AUTO_INCREMENT,
      content VARCHAR(255) NOT NULL,
      senderId INT NOT NULL,
      receiverId INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS chat_group (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      ownerId INT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS group_members (
      id INT PRIMARY KEY AUTO_INCREMENT,
      groupId INT NOT NULL,
      memberId INT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS group_messages (
      id INT PRIMARY KEY AUTO_INCREMENT,
      groupId INT NOT NULL,
      senderId INT NOT NULL,
      content VARCHAR(255) NOT NULL
    );
  `);
}

export function down(db) {
  return db.runSql(`DROP TABLE IF EXISTS accounts`);
}
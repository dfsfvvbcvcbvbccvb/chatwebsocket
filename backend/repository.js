import mysql from "mysql2/promise"
import bcrypt from 'bcrypt';
import crypto from 'crypto'

let saltRounds = 10

async function getConnection() {
    return await mysql.createConnection({
           host: 'localhost',
           user: 'root',
           password: 'ez123',
           database: 'chat'
    })
}

export async function registration(formdata) {
    let connection = await getConnection()

    if (!formdata?.login || !formdata?.password || !formdata?.email) {
        return 'Заполните все поля!'
    }

    let [rows] = await connection.execute(
        `SELECT login FROM accounts WHERE email = ?`,
        [formdata?.email]
    )

    if (rows.length !== 0) {
        return 'Почта уже занята!'
    }
    let [rows2] = await connection.execute(
        `SELECT login FROM accounts WHERE login = ?`,
        [formdata?.login]
    )
    if (rows2.length !== 0) {
        await connection.end()
        return 'Пользователь с таким именем уже существует'
    }

    let hashedPassword = null

    try {
        hashedPassword = await bcrypt.hash(formdata?.password, saltRounds)
    } catch (e) {
        await connection.end()
        console.error(e)
        return 'Ошибка'
    }

    try {
        await connection.execute(
            `INSERT INTO accounts (login, email, password) VALUES (?, ?, ?)`,
            [formdata?.login, formdata?.email, hashedPassword]
        )
        await connection.end()
        return 'Успешно!'
    } catch (e) {
        await connection.end()
        console.error(e)
        return 'Ошибка!'
    }
}

export async function login(formdata) {
    let connection = await getConnection()

    if (!formdata.email || !formdata.password) {
        return 'Заполните все поля!'
    }

    let [rows] = await connection.execute(
        `SELECT password, id FROM accounts WHERE email = ?`,
        [formdata?.email]
    )


    if (rows.length === 0) {
        await connection.end()
        return 'Неверный логин или пароль!'
    }

    let hashedPassword = rows[0].password
    let isMatch = await bcrypt.compare(String(formdata?.password), String(hashedPassword))
    if (!isMatch) {
        await connection.end()
        return 'Неверный логин или пароль!'
    } else {
        let sessionId = crypto.randomBytes(32).toString('hex')
        await connection.execute(
            `INSERT INTO sessions (userId, sessionId) VALUES (?, ?)`,
            [rows[0].id, sessionId]
        )
        await connection.end()
        return {
            response: "Успешно!",
            sessionId: sessionId
        }
    }
}

export async function getUserId(formdata) {
    let connection = await getConnection()

    if (!formdata || !formdata.sessionId) {
        return
    }

    let [rows] = await connection.execute(
        `SELECT * FROM sessions WHERE sessionId = ?`,
        [formdata.sessionId]
    )

    await connection.end()

    return rows
}

export async function logout(formdata) {
    let connection = await getConnection()
    if (!formdata || !formdata.sessionId) {
        return
    }
    let [rows] = await connection.execute(
        `SELECT * FROM sessions WHERE sessionId = ?`,
        [formdata.sessionId]
    )
    if (rows.length === 0) {
        await connection.end()
        return 'Ошибка!'
    } else {
        await connection.execute(
            `DELETE FROM sessions WHERE sessionId = ?`,
            [formdata.sessionId]
        )
        await connection.end()
        return 'Успешно!'
    }
}

export async function sendRequest(formdata) {
    let connection = await getConnection()

    if (!formdata || !formdata.receiverUsername || !formdata.userId) {
        return 'Заполните все поля!'
    }

    let [rows] = await connection.execute(
        `SELECT id FROM accounts WHERE login = ?`,
        [formdata.receiverUsername]
    )

    if (rows.length === 0) {
        return 'Такого пользователя не существует'
    }

    let [rows3] = await connection.execute(
        `SELECT * FROM requests WHERE senderId = ? AND receiverId = ?`,
        [formdata.userId, rows[0].id]
    )
    let [rows4] = await connection.execute(
        `SELECT * FROM friends WHERE userId1 = ? AND userId2 = ? OR userId1 = ? AND userId2 = ?`,
        [formdata.userId, rows[0].id, rows[0].id, formdata.userId]
    )

    if (rows4.length > 0) {
        return 'Вы уже друзья с этим пользователем'
    }

    if (rows3.length > 0) {
        return 'Заявка уже отправлена!'
    }

    if (rows.length === 0) {
        await connection.end()
        return 'Пользователя с таким юзером не существует'
    }

    await connection.execute(
        `INSERT INTO requests (senderId, receiverId) VALUES (?, ?)`,
        [formdata.userId, rows[0].id]
    )
    await connection.end()
    return 'Успешно!'
}

export async function cancelRequest(formdata) {
    let connection = await getConnection()

    if (!formdata || !formdata.requestId || !formdata.userId) {
        return 'Ошибка!'
    }

    let [rows] = await connection.execute(
        `SELECT * FROM requests WHERE id = ?`,
        [formdata.requestId]
    )

    if (rows.length === 0) {
        await connection.end()
        return 'Ошибка!'
    }
    if (Number(rows[0].senderId) !== Number(formdata.userId)) {
        await connection.end()
        return 'Ошибка!'
    }

    await connection.execute(
        `DELETE FROM requests WHERE id = ?`,
        [formdata.requestId]
    )

    await connection.end()

    return 'Успешно!'
}

export async function acceptRequest(formdata) {
    let connection = await getConnection()

    if (!formdata || !formdata.requestId || !formdata.userId) {
        return 'Ошибка!'
    }

    let [rows] = await connection.execute(
        `SELECT * FROM requests WHERE id = ?`,
        [formdata.requestId]
    )

    if (rows.length === 0) {
        await connection.end()
        return 'Ошибка!'
    }
    if (Number(rows[0].receiverId) !== Number(formdata.userId)) {
        await connection.end()
        return 'Ошибка!'
    }

    await connection.execute(
        `INSERT INTO friends (userId1, userId2) VALUES (?, ?)`,
        [rows[0].senderId, rows[0].receiverId]
    )

    await connection.execute(
        `DELETE FROM requests WHERE id = ?`,
        [formdata.requestId]
    )

    await connection.end()

    return 'Успешно!'
}

export async function getRequestsBySenderId(formdata) {
    let connection = await getConnection()

    if (!formdata || !formdata.senderId) {
        return 'Ошибка!'
    }

    let [rows] = await connection.execute(
        `SELECT * FROM requests WHERE senderId = ?`,
        [formdata.senderId]
    )

    let [rows2] = await connection.execute(
        `SELECT sender.login AS senderLogin, receiver.login AS receiverLogin FROM requests
        INNER JOIN accounts AS sender ON requests.senderId = sender.id
        INNER JOIN accounts AS receiver ON requests.receiverId = receiver.id WHERE sender.id = ?`,
        [formdata.senderId]
    )
    for (let a = 0; a < rows.length; a++) {
        rows[a].senderUsername = rows2[a].senderLogin
        rows[a].receiverUsername = rows2[a].receiverLogin
    }

    if (rows.length === 0) {
        return 'Не найдено!'
    }

    return rows
}

export async function getRequestsByReceiverId(formdata) {
    let connection = await getConnection()

    if (!formdata || !formdata.receiverId) {
        await connection.end()
        return 'Ошибка!'
    }

    let [rows] = await connection.execute(
        `SELECT * FROM requests WHERE receiverId = ?`,
        [formdata.receiverId]
    )

    let [rows2] = await connection.execute(
        `SELECT sender.login AS senderLogin, receiver.login AS receiverLogin FROM requests
        INNER JOIN accounts AS sender ON requests.senderId = sender.id
        INNER JOIN accounts AS receiver ON requests.receiverId = receiver.id WHERE receiver.id = ?`,
        [formdata.receiverId]
    )

    for (let a = 0; a < rows.length; a++) {
        rows[a].senderUsername = rows2[a].senderLogin
        rows[a].receiverUsername = rows2[a].receiverLogin
    }

    if (rows.length === 0) {
        await connection.end()
        return 'Не найдено!'
    }

    await connection.end()
    return rows
}

export async function getLoginById(formdata) {
    let connection = await getConnection()

    if (!formdata || !formdata.id) {
        await connection.end()
        return 'Ошибка!'
    }

    let [rows] = await connection.execute(
        `SELECT login FROM accounts WHERE id = ?`,
        [formdata.id]
    )

    if (rows.length === 0 ) {
        await connection.end()
        return 'Не найдено!'
    }

    await connection.end()
    return rows
}  

export async function getFriends(formdata) {
    let connection = await getConnection()

    if (!formdata || !formdata.id) {
        await connection.end()
        return 'Ошибка!'
    }

    let [rows] = await connection.execute(
        `SELECT * FROM friends WHERE userId1 = ? OR userId2 = ?`,
        [formdata.id, formdata.id]
    )

    if (rows.length === 0) {
        await connection.end()
        return 'Не найдено'
    }

    let [rows2] = await connection.execute(
        `SELECT friend1.login AS friend1Login, friend2.login AS friend2Login FROM friends
        INNER JOIN accounts AS friend1 ON friends.userId1 = friend1.id
        INNER JOIN accounts AS friend2 ON friends.userId2 = friend2.id WHERE friend1.id = ? OR friend2.id = ?`,
        [formdata.id, formdata.id]
    )

    for (let a = 0; a < rows.length; a++) {
        if (rows[a].userId1 === formdata.id) {
            rows[a].friendName = rows2[a].friend2Login
        }
        if (rows[a].userId2 === formdata.id) {
            rows[a].friendName = rows2[a].friend1Login
        }
    }

    await connection.end()
    return rows
}

export async function sendMessage(formdata) {
    let connection = await getConnection()

    if (!formdata || !formdata.content || !formdata.senderId || !formdata.receiverId) {
        await connection.end()
        return 'Заполните все поля!'
    }

    try {
        await connection.execute(
            `INSERT INTO messages (content, senderId, receiverId) VALUES (?, ?, ?)`,
            [formdata.content, formdata.senderId, formdata.receiverId]
        )
        await connection.end()
        return 'Успешно!'
    } catch (e) {
        await connection.end()
        console.error(e)
        return 'Ошибка!'
    }
}

export async function getMessages(formdata) {
    let connection = await getConnection()

    if (!formdata || !formdata.senderId || !formdata.receiverId) {
        return 'Ошибка!'
    }

    let [rows] = await connection.execute(
        `SELECT * FROM messages WHERE senderId = ? AND receiverId = ?`,
        [formdata.senderId, formdata.receiverId]
    )

    if (rows.length === 0) {
        await connection.end()
        return 'Не найдено!'
    }

    await connection.end()
    return rows
}
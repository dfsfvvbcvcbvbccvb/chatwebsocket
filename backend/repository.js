import mysql from "mysql2/promise"
import bcrypt from 'bcrypt';
import crypto from 'crypto'
import { isGeneratorFunction } from 'util/types';
import { convertProcessSignalToExitCode } from "util";

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

    let [rows3] = await connection.execute(
        `SELECT * FROM requests WHERE senderId = ? AND receiverId = ?`,
        [formdata.userId, rows[0].id]
    )

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

    console.log(rows)

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


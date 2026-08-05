import mysql from "mysql2/promise"
import bcrypt from 'bcrypt';
import crypto from 'crypto'
import { isGeneratorFunction } from 'util/types';

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

    let [rows2] = await connection.execute(
        `SELECT login FROM accounts WHERE id = ?`,
        [formdata.userId]
    )

    if (rows2.length === 0) {
        await connection.end()
        return 'Ошибка!'
    }

    if (rows.length === 0) {
        await connection.end()
        return 'Пользователя с таким юзером не существует'
    }

    await connection.execute(
        `INSERT INTO requests (senderId, receiverId, senderUsername, receiverUsername) VALUES (?, ?, ?, ?)`,
        [formdata.userId, rows[0].id, rows2[0].login, formdata.receiverUsername]
    )
    await connection.end()
    return 'Успешно!'
}


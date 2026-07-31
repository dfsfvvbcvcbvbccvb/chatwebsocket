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
        return 'Пользователь с таким именем уже существует'
    }

    let hashedPassword = null

    try {
        hashedPassword = await bcrypt.hash(formdata?.password, saltRounds)
    } catch (e) {
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
        `SELECT password FROM accounts WHERE email = ?`,
        [formdata?.email]
    )

    if (rows.length === 0) {
        return 'Неверный логин или пароль!'
    }

    let hashedPassword = rows[0].password
    let isMatch = bcrypt.compare(String(formdata?.password), String(hashedPassword))
    if (!isMatch) {
        return 'Неверный логин или пароль!'
    } else {
        let sessionId = crypto.randomBytes(32).toString('hex')
        return 'Успешно!'
    }
}


import express, { response } from 'express';
import { registration, login, getUserId } from './repository.js';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = 4000;
app.use(express.json())
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }))

app.post('/api/register', async (req, res) => {
    let formdata = {
        login: req.body?.login,
        password: req.body?.password,
        email: req.body?.email
    }

    const response = await registration(formdata)
    res.json(response)
});

app.post('/api/login', async (req, res) => {
    let formdata = {
        email: req.body?.email,
        password: req.body?.password
    }

    const response = await login(formdata)

    if (!response.response) {
        res.json(response)
        return
    }
    console.log(response)

    res.cookie('login', response.sessionId, {
        maxAge: 3600000 * 24,
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
    });

    res.json('Успешно!')
});

app.post('/api/getUserId', async (req, res) => {
    let formdata = {
        sessionId: req.cookies?.login
    }
    if (formdata.sessionId === undefined) {
        return
    }
    let response = await getUserId(formdata)
    res.json(response[0].userId)
});

app.listen(PORT, () => console.log('Сервер запущен'));
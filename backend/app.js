import express, { response } from 'express';
import { registration } from './repository.js';

const app = express();
const PORT = 4000;
app.use(express.json())
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

app.listen(PORT, () => console.log('Сервер запущен'));
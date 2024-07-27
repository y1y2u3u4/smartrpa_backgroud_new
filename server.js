// server.js
import express from 'express';
import cors from 'cors';
import { handler_login, handler_run,getData_baidu,getData_tengxun } from './handler.js';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/login', handler_login);
app.post('/scrape', handler_run);
app.post('/getData_baidu', getData_baidu);
app.post('/getData_tengxun', getData_tengxun);


// const PORT = process.env.PORT || 3001;
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });

const PORT = 8082;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// server.js
import express from 'express';
import cors from 'cors';
import { handler_login, handler_run} from './handler.js';
import axios from 'axios'; // 用于 HTTP 请求

const app = express();
app.use(cors());
app.use(express.json());
app.post('/login', handler_login);
app.post('/scrape', handler_run);
// app.post('/getData_baidu', getData_baidu);
// app.post('/getData_tengxun', getData_tengxun);


// const PORT = process.env.PORT || 3001;
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });


const PORT = 8082;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

//https://ngrok.com/download
// ngrok http 8082
// ngrok http 8188 --region ap
// ngrok tcp 3389 --region ap


// nohup  node server.js > server.log 2>&1 &
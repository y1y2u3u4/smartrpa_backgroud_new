import axios from 'axios';
import { handleEvent } from './modules/eventHandler.js';
const sortedData = [
    {
        "url": "https://www.baidu.com/",
        "time": "2024-07-10T03:18:01.807Z",
        "type": "navigation"
    },
    {
        "url": "https://niklas-luhmann-archiv.de/bestand/zettelkasten/1/auszug/01?page=1",
        "time": "2024-07-10T03:19:28.416Z",
        "type": "navigation"
    },
    {
        "element": {
            "tagName": "",
            "id": "",
            "className": "",
            "name": "",
            "innerText": "",
            "leixing": "自定义0"
        },
        "time": "2024-07-10T03:18:29.565Z",
        "type": "output"
    },
    {
        "loopEvents": [
            {
                "element": {
                    "tagName": "",
                    "id": "",
                    "className": "",
                    "name": "",
                    "innerText": "",
                    "leixing": "自定义0"
                },
                "time": "2024-07-10T03:19:24.764Z",
                "type": "click"
            },
            {
                "element": {
                    "tagName": "",
                    "id": "",
                    "className": "",
                    "name": "",
                    "innerText": "",
                    "leixing": "自定义1"
                },
                "time": "2024-07-10T03:18:29.565Z",
                "type": "output"
            },
            {
                "action": "scroll",
                "direction": "up",
                "distance": 488,
                "time": "2024-07-10T03:19:28.419Z",
                "type": "scroll"
            }
        ],
        "loopCount": 50,
        "type": "loop"
    }
]

const handleEventScript = handleEvent.toString();

async function sendRequest() {
    try {
        const response = await axios.post('http://localhost:3000/scrape', {
            sortedData: sortedData,
            handleEventScript: handleEventScript
        });
        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error:', error);
    }
}

sendRequest();
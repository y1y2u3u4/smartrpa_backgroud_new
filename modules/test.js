// import { OutputFactory } from './outputHandler.js';
// const outputHandler = OutputFactory.createOutputHandler("online");
// const cookies='123'
// await outputHandler.handle(JSON.stringify(cookies, null, 2), 'login');

// import { inserttask, findTaskList } from "./notes.js";

// const TaskList = await findTaskList("大众点评数据获取_北京_体适能关建词");
// TaskList.sort((a, b) => b.id - a.id);
// const latestTask = TaskList[0];
// // console.log('TaskList', TaskList)
// console.log('latestTask', latestTask.task_cookies)
// console.log('latestTask_task_name', latestTask.task_name)

const avatarSelectors = [
    "span.semi-avatar.semi-avatar-circle.semi-avatar-small.semi-avatar-grey.semi-dropdown-showing",
    ".semi-avatar",
    "img[src*='aweme-avatar']",
    "[class*='avatar']"
];

function findAndClickAvatar() {
    let avatarElement = null;
    for (let selector of avatarSelectors) {
        avatarElement = document.querySelector(selector);
        if (avatarElement) break;
    }

    console.log('avatarElement:', avatarElement);

    if (avatarElement) {
        // 模拟鼠标悬停
        const mouseoverEvent = new MouseEvent('mouseover', {
            'view': window,
            'bubbles': true,
            'cancelable': true
        });
        avatarElement.dispatchEvent(mouseoverEvent);

        // 等待下拉菜单出现并尝试点击
        setTimeout(() => {
            // 查找所有可能的菜单项
            const menuItems = document.querySelectorAll('.semi-dropdown-menu *');
            console.log('找到的菜单项数量:', menuItems.length);

            for (let item of menuItems) {
                console.log('菜单项内容:', item.textContent.trim());
                if (item.textContent.trim() === '退出代运营状态') {
                    console.log('找到"退出代运营状态"选项');
                    item.click();
                    console.log('已点击"退出代运营状态"');
                    return;
                }
            }

            console.log('未找到"退出代运营状态"选项');
        }, 2000); // 等待2秒让下拉菜单完全加载
    } else {
        console.log('未找到头像组件');
    }
}

// 等待页面加载完成
if (document.readyState === 'complete') {
    findAndClickAvatar();
} else {
    window.addEventListener('load', findAndClickAvatar);
}

// 如果5秒后还没有找到元素,再尝试一次
setTimeout(findAndClickAvatar, 5000);


document.querySelector('#reload-button').click();

document.querySelector('.sb').click();



// 点击按钮打开下拉菜单
document.querySelector('.a1a15-a.ga7a_32 .c142-a0').click();

// 等待下拉菜单出现并选择选项
setTimeout(() => {
    const options = document.querySelectorAll('.c142-a0 .c142-b5 + div .tsBody500Medium');
    for (let option of options) {
        if (option.textContent.trim() === 'С высоким рейтингом') {
            option.click();
            break;
        }
    }
}, 500);


(function () {
    // 获取页面数量
    const pageLinks = document.querySelectorAll('.q9e .q7e');
    const pageCount = pageLinks.length;
    console.log(`总页数: ${pageCount}`);

    // 获取当前页码
    const currentPage = Array.from(pageLinks).findIndex(link => link.classList.contains('e8q')) + 1;
    console.log(`当前页码: ${currentPage}`);

    // 点击"下一页"按钮
    const nextPageButton = document.querySelector('a.eq6.b2113-a0.b2113-b6.b2113-b1');
    if (nextPageButton) {
        console.log('找到"下一页"按钮,准备点击...');
        nextPageButton.click();
        console.log('已点击"下一页"按钮');

        // 由于我们在控制台中运行,无法使用 await,所以使用 setTimeout 来检查页面变化
        setTimeout(() => {
            const newCurrentPage = Array.from(document.querySelectorAll('.q9e .q7e'))
                .findIndex(link => link.classList.contains('e8q')) + 1;
            console.log(`页面已跳转,新的当前页码: ${newCurrentPage}`);
        }, 2000); // 等待2秒后检查,您可以根据实际加载速度调整这个时间
    } else {
        console.log('未找到"下一页"按钮,可能已经是最后一页');
    }

    return { pageCount, currentPage };
})();



///点击视频上传事件
function handleUpload() {
    // 创建一个隐藏的文件输入元素
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'video/*';
    fileInput.style.display = 'none';

    // 当选择文件后触发上传
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            console.log('选择的视频文件:', file.name);
            // 这里可以添加实际的上传逻辑
            // uploadVideo(file);
        }
    });

    // 触发文件选择对话框
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
}

// 直接调用handleUpload函数
handleUpload();



///输入标题和简介

(function () {
    // 设置标题
    const titleInput = document.querySelector('input[placeholder="填写作品标题，为作品获得更多流量"]');
    if (titleInput) {
        // 定义一个新的 value 属性，以便框架能够检测到变化
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(titleInput, '你的作品标题');

        // 触发 input 和 change 事件
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        titleInput.dispatchEvent(new Event('change', { bubbles: true }));

        console.log('标题已设置');
    } else {
        console.error('未找到标题输入框');
    }

    // 设置简介
    const descriptionDiv = document.querySelector('div[data-placeholder="添加作品简介"]');
    if (descriptionDiv) {
        descriptionDiv.innerText = '这是你的作品简介内容。';
        descriptionDiv.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('简介已设置');
    } else {
        console.error('未找到简介输入区域');
    }
})();
//设置封面（记得等待 3s）
(function () {
    // 查找所有推荐封面元素
    const recommendCovers = document.querySelectorAll('.recommendCover-BicGc_');

    if (recommendCovers.length > 0) {
        console.log('找到推荐封面元素');

        // 选择第一个推荐封面
        const firstCover = recommendCovers[0];

        // 模拟点击第一个封面
        firstCover.click();
        console.log('已点击第一个推荐封面');

        // 如果需要,可以添加额外的确认步骤
        setTimeout(() => {
            // 检查是否有选中状态的标识
            const isSelected = firstCover.classList.contains('selected') ||
                firstCover.querySelector('.selected');
            if (isSelected) {
                console.log('确认第一个推荐封面已被选中');
            } else {
                console.log('无法确认封面是否已被选中,可能需要手动检查');
            }
        }, 500);
    } else {
        console.log('未找到推荐封面元素');
    }
})();
///添加标签-选择位置

(function () {
    // 找到位置选择器
    const locationSelector = document.querySelector('.semi-select.select-PJBSlx');

    if (locationSelector) {
        console.log('找到位置选择器');

        // 检查是否已经选择了位置
        const selectedText = locationSelector.querySelector('.semi-select-selection-text');
        if (selectedText && selectedText.textContent.trim() === '童心体能·跃动体育综合训练中心(瑞雪春堂店)') {
            console.log('位置已经被选择：', selectedText.textContent);
            return; // 如果已经选择了正确的位置，就不需要进一步操作
        }

        // 点击选择器以打开下拉菜单
        locationSelector.click();
        console.log('已点击位置选择器以打开下拉菜单');

        // 等待下拉菜单加载
        setTimeout(() => {
            // 查找输入框并输入搜索内容
            const inputField = locationSelector.querySelector('input');
            if (inputField) {
                inputField.value = '童心体能·跃动体育综合训练中心(瑞雪春堂店)';
                inputField.dispatchEvent(new Event('input', { bubbles: true }));
                console.log('已在搜索框中输入位置名称');

                // 再次等待，让搜索结果加载
                setTimeout(() => {
                    // 查找目标选项
                    const targetOption = Array.from(document.querySelectorAll('.semi-select-option, .option-v2-_HHRPT'))
                        .find(option => option.textContent.includes('童心体能·跃动体育综合训练中心(瑞雪春堂店)'));

                    if (targetOption) {
                        // 点击目标选项
                        targetOption.click();
                        console.log('已选择: 童心体能·跃动体育综合训练中心(瑞雪春堂店)');
                    } else {
                        console.log('未找到目标选项，请检查搜索结果');
                    }
                }, 1000); // 等待1秒让搜索结果加载
            } else {
                console.log('未找到搜索输入框');
            }
        }, 1000); // 等待1秒让下拉菜单加载
    } else {
        console.log('未找到位置选择器，请检查页面结构');
    }
})();

//不允许他人保存
(function () {
    // 查找"不允许"选项
    const disallowLabel = Array.from(document.querySelectorAll('.radio-d4zkru'))
        .find(label => label.textContent.trim() === '不允许');

    if (disallowLabel) {
        console.log('找到"不允许"选项');

        // 检查是否已经选中
        const input = disallowLabel.querySelector('input');
        if (input && !input.checked) {
            // 如果未选中,则点击选择
            disallowLabel.click();
            console.log('已点击"不允许"选项');
        } else if (input && input.checked) {
            console.log('"不允许"选项已经被选中');
        } else {
            console.log('无法确定"不允许"选项的状态');
        }
    } else {
        console.log('未找到"不允许"选项');
    }
})();
//立即发布
(function () {
    // 查找"立即发布"选项
    const immediatePublishLabel = Array.from(document.querySelectorAll('.radio-d4zkru'))
        .find(label => label.textContent.trim() === '立即发布');

    if (immediatePublishLabel) {
        console.log('找到"立即发布"选项');

        // 检查是否已经选中
        const input = immediatePublishLabel.querySelector('input');
        if (input && !input.checked) {
            // 如果未选中,则点击选择
            immediatePublishLabel.click();
            console.log('已点击"立即发布"选项');
        } else if (input && input.checked) {
            console.log('"立即发布"选项已经被选中');
        } else {
            console.log('无法确定"立即发布"选项的状态');
        }
    } else {
        console.log('未找到"立即发布"选项');
    }
})();

//定时发布
///点击
(function () {
    // 查找"定时发布"选项
    const scheduledPublishLabel = Array.from(document.querySelectorAll('.radio-d4zkru'))
        .find(label => label.textContent.trim() === '定时发布');

    if (scheduledPublishLabel) {
        console.log('找到"定时发布"选项');

        // 检查是否已经选中
        const input = scheduledPublishLabel.querySelector('input');
        if (input && !input.checked) {
            // 如果未选中,则点击选择
            scheduledPublishLabel.click();
            console.log('已点击"定时发布"选项');
        } else if (input && input.checked) {
            console.log('"定时发布"选项已经被选中');
        } else {
            console.log('无法确定"定时发布"选项的状态');
        }
    } else {
        console.log('未找到"定时发布"选项');
    }
})();
///选择时间
(function() {
    // 找到日期时间输入框
    const dateTimeInput = document.querySelector('input[format="yyyy-MM-dd HH:mm"][placeholder="日期和时间"]');
    if (!dateTimeInput) {
        console.log('未找到指定的日期时间输入框');
        return;
    }

    // 点击输入框打开日期选择器
    dateTimeInput.click();
    
    setTimeout(() => {
        // 尝试找到日期选择器中的日期（17日）
        const day17 = document.querySelector('.semi-datepicker-day[title="2024-09-17"]');
        if (day17) {
            day17.click();
            console.log('已选择17日');

            setTimeout(() => {
                // 尝试找到并点击时间选择器
                const timeSelector = document.querySelector('.semi-datepicker-switch-time');
                if (timeSelector) {
                    timeSelector.click();
                    console.log('已切换到时间选择');

                    setTimeout(() => {
                        // 尝试选择13时
                        const hour13 = Array.from(document.querySelectorAll('.semi-scrolllist-item-wheel.undefined-list-hour li'))
                            .find(item => item.textContent.trim() === '13' || item.textContent.trim() === '13时');
                        if (hour13) {
                            hour13.click();
                            console.log('已选择13时');

                            setTimeout(() => {
                                // 尝试选择00分
                                const minuteItems = document.querySelectorAll('.semi-scrolllist-item-wheel.undefined-list-minute li');
                                if (minuteItems.length > 0) {
                                    const minute57 = Array.from(minuteItems).find(item => item.textContent.trim() === '00');

                                    if (minute57) {
                                        console.log('找到57分元素:', minute57);

                                        function trySelectMinute(attempts = 0) {
                                            if (attempts >= 5) {
                                                console.log('多次尝试后仍未成功选择57分');
                                                return;
                                            }

                                            minute57.click();
                                            console.log(`第 ${attempts + 1} 次点击57分元素`);

                                            setTimeout(() => {
                                                const selectedTime = dateTimeInput.value;
                                                console.log('当前选择的时间:', selectedTime);

                                                if (selectedTime.endsWith('57')) {
                                                    console.log('成功选择57分');
                                                } else {
                                                    trySelectMinute(attempts + 1);
                                                }
                                            }, 200);
                                        }                                        

                                        trySelectMinute();
                                    } else {
                                        console.log('未找到00分选项');
                                    }
                                } else {
                                    console.log('未找到分钟选项');
                                }
                            }, 500);
                        } else {
                            console.log('未找到13时选项');
                        }
                    }, 500);
                } else {
                    console.log('未找到时间选择器');
                }
            }, 500);
        } else {
            console.log('未找到17日选项');
        }
    }, 500);
})();

//点击发布
(function () {
    // 查找"发布"按钮
    const publishButton = document.querySelector('button.button-dhlUZE.primary-cECiOJ.fixed-J9O8Yw');

    if (publishButton) {
        console.log('找到"发布"按钮');

        // 检查按钮是否可点击（不被禁用）
        if (!publishButton.disabled) {
            // 模拟点击按钮
            publishButton.click();
            console.log('已点击"发布"按钮');
        } else {
            console.log('"发布"按钮当前被禁用,无法点击');
        }
    } else {
        console.log('未找到"发布"按钮');
    }
})();


//runway
//输入提示词
// 找到文本输入区域并输入内容
const textArea = document.querySelector('div.ProseMirror');
textArea.innerHTML = '要输入的文本内容';

// 触发输入事件
const inputEvent = new Event('input', { bubbles: true });
textArea.dispatchEvent(inputEvent);

//上传图片

// 使用更详细的选择器
const button = document.querySelector('button.flex.items-center.justify-center.h-8.w-8.rounded-lg.rounded-bl-xl');
if (button) {
    button.click();
} else {
    console.log('Button not found');
}

// 创建文件输入元素并触发点击
function triggerFileUpload() {
    // 创建文件输入
    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';

    // 监听文件选择
    input.onchange = (e) => {
        const files = e.target.files;
        console.log('Selected files:', files);
    };

    // 添加到文档并触发点击
    document.body.appendChild(input);
    input.click();

    // 清理
    setTimeout(() => document.body.removeChild(input), 1000);
}

triggerFileUpload();

//复制提示词（需要增加等待和缓存逻辑）
function copyCodeContent() {
    try {
        // 1. 使用正确的选择器语法
        const codeElement = document.querySelector('.overflow-y-auto.p-4 code');
        if (!codeElement) {
            throw new Error('Code element not found');
        }

        // 2. 获取文本内容
        const textToCopy = codeElement.textContent.trim();

        // 3. 创建临时文本区域并复制
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.left = '0';
        textarea.style.top = '0';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        // 4. 执行复制
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (successful) {
            console.log('Content copied successfully:', textToCopy.slice(0, 50) + '...');
            return true;
        } else {
            throw new Error('Copy command failed');
        }

    } catch (error) {
        console.error('Copy failed:', error);
        return false;
    }
}

// 执行复制
copyCodeContent();

//选择图片
function clickSelectAssetButton() {
    try {
        // 找到 Select Asset 按钮
        const selectButton = document.querySelector('button[aria-label="Open asset selector"]');
        // 或者使用类名
        // const selectButton = document.querySelector('.KeyframesInputPanel-module__smallTertiaryButton__C9L_O');

        if (!selectButton) {
            throw new Error('Select Asset button not found');
        }

        // 创建并触发点击事件
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            buttons: 1
        });

        // 触发点击
        selectButton.dispatchEvent(clickEvent);

        console.log('Button clicked successfully');
        return true;

    } catch (error) {
        console.error('Click failed:', error);
        return false;
    }
}

// 执行点击
clickSelectAssetButton();


function triggerFileUpload() {
    try {
        // 1. 找到隐藏的文件输入框
        const fileInput = document.querySelector('input[accept*="image/jpg"]');

        if (!fileInput) {
            // 备选方案：找到上传区域并点击
            const uploadArea = document.querySelector('[data-id="drop-child-area"]');
            if (uploadArea) {
                uploadArea.click();
            } else {
                throw new Error('Upload elements not found');
            }
            return;
        }

        // 2. 创建点击事件
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            buttons: 1
        });

        // 3. 触发点击事件
        fileInput.dispatchEvent(clickEvent);

        // 4. 添加文件变化监听器（可选）
        fileInput.onchange = (event) => {
            const files = event.target.files;
            console.log('Selected files:', files);
        };

        console.log('Upload triggered successfully');
        return true;

    } catch (error) {
        console.error('Failed to trigger upload:', error);
        return false;
    }
}

// 执行上传触发
triggerFileUpload();





//输入提示词
function setPromptText(text = 'Your text here') {
    try {
        // 1. 找到编辑器容器
        const editorContainer = document.querySelector('.TextPromptEditor-module__textbox__YlZy9');
        if (!editorContainer) {
            throw new Error('Editor container not found');
        }

        // 2. 创建新的段落内容
        const content = `<p>${text}</p>`;

        // 3. 设置内容
        editorContainer.innerHTML = content;

        // 4. 触发一系列必要的事件
        const events = [
            new Event('focus', { bubbles: true }),
            new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: text
            }),
            new Event('change', { bubbles: true }),
            new Event('blur', { bubbles: true })
        ];

        events.forEach(event => {
            editorContainer.dispatchEvent(event);
        });

        // 5. 移除占位符文本（如果存在）
        const placeholder = document.querySelector('.PlaceholderText__Placeholder-sc-77ryjz-0');
        if (placeholder) {
            placeholder.style.display = 'none';
        }

        console.log('Text set successfully:', text.slice(0, 50) + '...');
        return true;

    } catch (error) {
        console.error('Failed to set text:', error);

        // 调试信息
        console.log('Debug info:', {
            editorFound: !!document.querySelector('.TextPromptEditor-module__textbox__YlZy9'),
            editorContent: document.querySelector('.TextPromptEditor-module__textbox__YlZy9')?.innerHTML,
            allEditors: document.querySelectorAll('[contenteditable="true"]')
        });

        return false;
    }
}

// 执行设置文本
setPromptText('Smooth tracking camera movement: The camera follows a model wearing a sleek, metallic-gray puffer jacket in a minimal white studio setting. The model walks confidently towards the camera, subtly turning to showcase the jacket\'s details, including zippers and pockets.');



//完成提交
function clickGenerateButton() {
    try {
        // 1. 找到 Generate 按钮
        const generateButton = document.querySelector('button[data-loading="false"]') ||
            document.querySelector('.ExploreModeGenerateButton__Button-sc-1siz82w-0');

        if (!generateButton) {
            throw new Error('Generate button not found');
        }

        // 2. 检查按钮状态
        if (generateButton.disabled || generateButton.getAttribute('data-loading') === 'true') {
            throw new Error('Button is disabled or loading');
        }

        // 3. 创建并触发点击事件
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            buttons: 1
        });

        // 4. 触发点击
        generateButton.dispatchEvent(clickEvent);

        console.log('Generate button clicked successfully');
        return true;

    } catch (error) {
        console.error('Failed to click generate button:', error);
        return false;
    }
}

// 执行点击
clickGenerateButton();


const value = '不允许';  // 或 '允许'
const downloadContent = document.querySelector('.download-content-Lci5tL');
const labels = downloadContent.querySelectorAll('.radio-d4zkru');
console.log('找到的按钮数量:', labels.length);

if (labels.length === 2) {
    const labelTexts = Array.from(labels).map(label => label.textContent.trim());
    console.log('按钮文本:', labelTexts);

    const targetIndex = value === '允许' ? 0 : 1;
    const targetLabel = labels[targetIndex];
    const otherLabel = labels[1 - targetIndex];

    const targetInput = targetLabel.querySelector('input');
    const otherInput = otherLabel.querySelector('input');

    console.log('当前状态:', {
        target: targetInput.checked,
        other: otherInput.checked
    });

    targetInput.checked = true;
    otherInput.checked = false;

    [targetInput, otherInput].forEach(input => {
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    });
}




function clickGenerateButton() {
    try {
        // 1. 找到 Generate 按钮
        const generateButton = document.querySelector('button[data-loading="false"]') ||
            document.querySelector('.ExploreModeGenerateButton__Button-sc-1siz82w-0');

        if (!generateButton) {
            throw new Error('Generate button not found');
        }

        // 2. 检查按钮状态
        if (generateButton.disabled || generateButton.getAttribute('data-loading') === 'true') {
            throw new Error('Button is disabled or loading');
        }

        // 3. 创建并触发点击事件
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            buttons: 1
        });

        // 4. 触发点击
        generateButton.dispatchEvent(clickEvent);

        console.log('Generate button clicked successfully');
        return true;

    } catch (error) {
        console.error('Failed to click generate button:', error);
        return false;
    }
}

// 执行点击
clickGenerateButton();





function clickCategoryFilter() {
    try {
        const filterButtons = Array.from(document.querySelectorAll('button.filter-chip-module_filterChip_8-rKX'));
        console.log('找到的按钮数量:', filterButtons.length);
        
        const categoryButton = filterButtons.find(button => {
            const label = button.querySelector('.filter-chip-module_label_9Swml');
            const text = label?.textContent.trim();
            console.log('按钮文本:', text);
            return text === '类别';
        });

        if (categoryButton) {
            console.log('找到类别按钮，准备点击');
            
            // 创建鼠标事件
            const mouseDown = new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                view: window,
                buttons: 1
            });
            
            const mouseUp = new MouseEvent('mouseup', {
                bubbles: true,
                cancelable: true,
                view: window,
                buttons: 1
            });
            
            const click = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window,
                buttons: 1
            });

            // 触发一系列事件
            categoryButton.dispatchEvent(mouseDown);
            categoryButton.dispatchEvent(mouseUp);
            categoryButton.dispatchEvent(click);
            
            // 尝试触发原生点击
            categoryButton.click();
            
            // 只点击可点击的元素
            const clickableElements = categoryButton.querySelectorAll('button, a, input, [role="button"]');
            clickableElements.forEach(element => {
                if (typeof element.click === 'function') {
                    element.click();
                }
            });

            console.log('点击事件已触发');
            return true;
        } else {
            console.log('未找到类别按钮');
            return false;
        }
    } catch (error) {
        console.error('点击失败:', error);
        return false;
    }
}

// 执行点击
clickCategoryFilter();

async function clickCategoryAndGetSubcategories(categoryName) {
    try {
        // 1. 查找并点击主类别
        const buttons = document.querySelectorAll('.data-content-module_label_fGS\\+z');
        let targetButton = null;
        let parentId = null;

        // 查找目标按钮
        for (const button of buttons) {
            if (button.textContent.trim() === categoryName) {
                targetButton = button.closest('.tree-item-module_item_gATir');
                parentId = targetButton.closest('.tree-item-module_treeItem_ZlZ8K').id;
                break;
            }
        }

        if (!targetButton) {
            throw new Error(`未找到类别: ${categoryName}`);
        }

        // 2. 点击主类别
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            buttons: 1
        });
        targetButton.dispatchEvent(clickEvent);
        console.log(`成功点击类别: ${categoryName}`);

        // 3. 等待子类别加载（增加等待时间并添加重试机制）
        let subcategories = [];
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 每次等待1秒

            // 4. 获取子类别
            const subcategoryElements = document.querySelectorAll(`[id^="${parentId}_"]`);
            subcategories = [];
            
            subcategoryElements.forEach(element => {
                const labelElement = element.querySelector('.data-content-module_label_fGS\\+z');
                if (labelElement) {
                    const categoryInfo = {
                        id: element.id,
                        name: labelElement.textContent.trim()
                    };
                    subcategories.push(categoryInfo);
                }
            });

            // 检查是否还有骨架屏元素
            const skeletonElements = document.querySelectorAll('.skeleton-common-base-module_skeleton_z9rfg');
            
            // 如果找到了子类别且骨架屏消失，则退出循环
            if (subcategories.length > 0 && skeletonElements.length === 0) {
                break;
            }

            attempts++;
            console.log(`尝试第 ${attempts} 次获取子类别...`);
        }

        // 5. 输出结果
        if (subcategories.length > 0) {
            console.log(`${categoryName}的子类别列表：`);
            subcategories.forEach(category => {
                console.log(`ID: ${category.id}, 名称: ${category.name}`);
            });
        } else {
            console.log(`未能获取到 ${categoryName} 的完整子类别列表`);
        }

        return subcategories;

    } catch (error) {
        console.error(`操作失败:`, error);
        return [];
    }
}

// 执行点击电子产品类别并获取子类别
clickCategoryAndGetSubcategories('电子产品');


function clickApplyButton() {
    try {
        // 1. 查找应用按钮
        const applyButton = Array.from(document.querySelectorAll('button[type="submit"]')).find(button => {
            const textSpan = button.querySelector('.button-module_text_Sj3v5');
            return textSpan && textSpan.textContent.trim() === '应用';
        });

        if (!applyButton) {
            throw new Error('未找到应用按钮');
        }

        console.log('找到应用按钮，准备点击');

        // 2. 创建点击事件
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            buttons: 1
        });

        // 3. 触发点击事件
        applyButton.dispatchEvent(clickEvent);
        
        // 4. 触发表单提交事件
        const submitEvent = new Event('submit', {
            bubbles: true,
            cancelable: true
        });
        applyButton.closest('form')?.dispatchEvent(submitEvent);

        console.log('成功点击应用按钮');
        return true;

    } catch (error) {
        console.error('点击应用按钮失败:', error);
        return false;
    }
}

// 执行点击
clickApplyButton();


async function waitForTableData() {
    try {
        console.log('等待表格数据加载...');
        
        // 最多等待30秒
        const maxWaitTime = 30000;
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            // 检查表格行是否存在且有数据
            const tableRows = document.querySelectorAll('tr.table-row-module_row_JSSv0');
            if (tableRows.length > 0) {
                console.log(`找到 ${tableRows.length} 行数据`);
                return true;
            }
            
            // 等待100毫秒后再次检查
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        throw new Error('等待表格数据超时');
    } catch (error) {
        console.error('等待表格数据失败:', error);
        return false;
    }
}

async function clickDownloadButtonWithCheck() {
    try {
        // 首先等待表格数据加载
        const dataLoaded = await waitForTableData();
        if (!dataLoaded) {
            throw new Error('表格数据未加载，无法点击下载按钮');
        }

        // 数据加载完成后，执行下载操作
        return clickDownloadButton();
    } catch (error) {
        console.error('下载操作失败:', error);
        return false;
    }
}

// 执行带检查的下载操作
clickDownloadButtonWithCheck();






function clickDownloadButton() {
    try {
        // 1. 查找下载按钮
        const downloadButton = Array.from(document.querySelectorAll('button[type="submit"]')).find(button => {
            const textSpan = button.querySelector('.button-module_text_Sj3v5');
            return textSpan && textSpan.textContent.trim() === '下载' &&
                   button.classList.contains('button-module_size-500_21fVN') &&
                   button.classList.contains('button-module_secondary_BZ2cY');
        });

        if (!downloadButton) {
            throw new Error('未找到下载按钮');
        }

        console.log('找到下载按钮，准备点击');

        // 2. 创建点击事件
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            buttons: 1
        });

        // 3. 触发点击事件
        downloadButton.dispatchEvent(clickEvent);

        // 4. 触发表单提交事件（如果需要）
        const submitEvent = new Event('submit', {
            bubbles: true,
            cancelable: true
        });
        downloadButton.closest('form')?.dispatchEvent(submitEvent);

        console.log('成功点击下载按钮');
        return true;

    } catch (error) {
        console.error('点击下载按钮失败:', error);
        return false;
    }
}

// 执行点击
clickDownloadButton();




//获取关键词的数据
async function extractPageData() {
    try {
        let allData = [];
        
        // 获取总页数
        async function getTotalPages() {
            const paginationText = document.querySelector('.sc-gOCRIc.kGtRkC')?.textContent;
            if (paginationText) {
                const match = paginationText.match(/out of (\d+)/);
                return match ? parseInt(match[1]) : 1;
            }
            return 1;
        }
        
        // 获取当前页码
        function getCurrentPage() {
            const pageInput = document.querySelector('.sc-jUiVId.jjjAfn');
            return pageInput ? parseInt(pageInput.value) : 1;
        }
        
        // 等待页面加载完成
        async function waitForPageLoad() {
            // 初始等待
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 等待表格加载完成
            let attempts = 0;
            const maxAttempts = 20; // 增加最大尝试次数
            while (attempts < maxAttempts) {
                const rows = document.querySelectorAll('[data-table-row]');
                if (rows.length > 0) {
                    // 额外等待确保数据完全加载
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return true;
                }
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }
            return false;
        }
        
        // 点击下一页按钮
        async function clickNextPage() {
            try {
                // 等待下一页按钮可用
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // 使用新的选择器获取下一页按钮
                const nextButton = document.querySelector('a[data-automation-pagination-control="control-right"]');
                console.log('下一页按钮状态:', {
                    found: !!nextButton,
                    disabled: nextButton?.getAttribute('data-automation-pagination-control-disabled'),
                    className: nextButton?.className
                });
                
                // 检查按钮是否可用（disabled属性为"false"或不存在时表示可用）
                const isDisabled = nextButton?.getAttribute('data-automation-pagination-control-disabled') === 'true';
                if (nextButton && !isDisabled) {
                    // 保存当前页码
                    const currentPageBefore = getCurrentPage();
                    
                    // 点击下一页
                    nextButton.click();
                    console.log('已点击下一页按钮');
                    
                    // 等待页面加载完成
                    const pageLoaded = await waitForPageLoad();
                    if (!pageLoaded) {
                        console.log('页面加载超时');
                        return false;
                    }
                    
                    // 多次检查页码变化
                    let attempts = 0;
                    const maxAttempts = 10;
                    while (attempts < maxAttempts) {
                        const currentPageAfter = getCurrentPage();
                        if (currentPageAfter > currentPageBefore) {
                            console.log('翻页成功:', {
                                beforePage: currentPageBefore,
                                afterPage: currentPageAfter
                            });
                            return true;
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        attempts++;
                    }
                    
                    console.log('页码未变化:', {
                        beforePage: currentPageBefore,
                        afterPage: getCurrentPage()
                    });
                    return false;
                }
                
                console.log('下一页按钮不可用，disabled:', isDisabled);
                return false;
            } catch (error) {
                console.error('翻页过程出错:', error);
                return false;
            }
        }
        
        // 获取单页数据
        async function extractCurrentPageData() {
            const rows = document.querySelectorAll('[data-table-row]');
            const uniqueRowIndices = new Set();
            
            rows.forEach(row => {
                const rowIndex = row.getAttribute('data-table-row');
                if (rowIndex !== null) {
                    uniqueRowIndices.add(parseInt(rowIndex));
                }
            });
            
            const pageData = Array.from(uniqueRowIndices).map(rowIndex => {
                // 获取关键词
                const keywordCell = document.querySelector(`[data-table-row="${rowIndex}"][data-table-col="2"]`);
                let keyword = '';
                if (keywordCell) {
                    const keywordElement = 
                        keywordCell.querySelector('.cell-innerText') || 
                        keywordCell.querySelector('.swTable-content') ||
                        keywordCell.querySelector('[data-automation="keyword-text"]') ||
                        keywordCell;
                    
                    keyword = keywordElement?.textContent?.trim() || '';
                }
                
                // 获取月度搜索量
                const monthlyVolumeCell = document.querySelector(`[data-table-row="${rowIndex}"][data-table-col="3"]`);
                const monthlyVolume = monthlyVolumeCell ? monthlyVolumeCell.querySelector('.cell-innerText')?.textContent.trim() : '';
                
                // 获取平均搜索量
                const averageVolumeCell = document.querySelector(`[data-table-row="${rowIndex}"][data-table-col="4"]`);
                const averageVolume = averageVolumeCell ? averageVolumeCell.querySelector('.cell-innerText')?.textContent.trim() : '';
                
                // 获取年趋势数据
                const volumeTrendCell = document.querySelector(`[data-table-row="${rowIndex}"][data-table-col="5"]`);
                let volumeTrend = '';
                if (volumeTrendCell && monthlyVolume) {
                    const trendBars = volumeTrendCell.querySelectorAll('[data-automation-trend-bar]');
                    const trendBarsArray = Array.from(trendBars);
                    
                    const currentVolume = parseFloat(monthlyVolume.replace('K', '')) * 1000;
                    const lastBarPercentage = parseFloat(trendBarsArray[trendBarsArray.length - 1].style.height.replace('%', '')) || 0;
                    
                    const trendValues = trendBarsArray.map(bar => {
                        const percentage = parseFloat(bar.style.height.replace('%', '')) || 0;
                        const volume = (percentage / lastBarPercentage) * currentVolume;
                        return Math.round(volume);
                    });
                    
                    volumeTrend = trendValues.join(',');
                }
                
                return {
                    rowIndex: rowIndex + 1,
                    selected: false,
                    number: (rowIndex + 1).toString(),
                    keyword,
                    monthlyVolume,
                    averageVolume,
                    volumeTrend
                };
            });
            
            return pageData.sort((a, b) => a.rowIndex - b.rowIndex);
        }
        
        // 获取所有页面数据
        const totalPages = await getTotalPages();
        let currentPage = 1;
        
        console.log(`开始获取数据，总页数: ${totalPages}`);
        
        while (currentPage <= 3) {
            console.log(`正在获取第 ${currentPage}/${totalPages} 页数据...`);
            
            // 确保当前页面已加载
            await waitForPageLoad();
            
            const pageData = await extractCurrentPageData();
            allData = allData.concat(pageData);
            
            if (currentPage < totalPages) {
                console.log(`尝试翻到第 ${currentPage + 1} 页`);
                const hasNextPage = await clickNextPage();
                if (!hasNextPage) {
                    console.log('无法翻到下一页，停止获取数据');
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 2000)); // 增加翻页后的等待时间
            }
            
            currentPage++;
        }
        
        console.log(`数据获取完成，共 ${allData.length} 条记录`);
        console.log(`数据获取`,allData);
        return allData;
        
    } catch (error) {
        console.error('提取数据时发生错误:', error);
        return [];
    }
}

extractPageData()

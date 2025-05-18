// modules/dataProcessor.js
export function matchAndReplace(arr1, arr2) {
    let isNavigationAfterEnterOrClick = false;
    const filteredData = [];

    for (const item of arr1) {
        const { type, key, value, label, element, url } = item;

        // console.log('Processing item:', item);

        if ((type === 'keydown' && key === 'Enter')) {
            isNavigationAfterEnterOrClick = true;
            filteredData.push(item);
            // console.log('Trigger event detected, adding to filteredData:', item);
        } else if (isNavigationAfterEnterOrClick && type !== 'navigation') {
            if (type === 'input' && arr2.hasOwnProperty(value)) {
                filteredData.push({ ...item, value: arr2[value] });
                // console.log('Input after trigger event, replacing value and adding to filteredData:', { ...item, value: arr2[value] });
            } else if (type === 'click' && element && element.innerText && arr2.hasOwnProperty(value)) {
                // console.log('check_111:', element);
                filteredData.push({ ...item, element: { ...element, innerText: arr2[value] } });
                // console.log('Click after trigger event, replacing innerText and adding to filteredData:', { ...item, element: { ...element, innerText: arr2[value] } });
            } else if (type === 'click' && arr2.hasOwnProperty(label)) {
                filteredData.push({ ...item, label: arr2[label] });
                // console.log('Click after trigger event, replacing label and adding to filteredData:', { ...item, label: arr2[label] });
            } else if (type === 'loop' && arr2.hasOwnProperty(loopCount)) {
                filteredData.push({ ...item, loopCount: arr2[loopCount] });
                // console.log('Click after trigger event, replacing label and adding to filteredData:', { ...item, label: arr2[label] });
            } 
            else {
                filteredData.push(item);
                // console.log('After trigger event, adding to filteredData without changes:', item);
            }
        } else if (isNavigationAfterEnterOrClick && type === 'navigation') {
            // 不添加 navigation 事件到 filteredData
            isNavigationAfterEnterOrClick = false;
            // console.log('Navigation event after trigger, reset isNavigationAfterEnterOrClick.');
        } else if (!isNavigationAfterEnterOrClick) {
            if (type === 'navigation' && arr2.hasOwnProperty(url)) {
                filteredData.push({ ...item, url: arr2[url] });
                // console.log('Navigation event, replacing url and adding to filteredData:', { ...item, url: arr2[url] });
            } else if (type === 'input' && arr2.hasOwnProperty(value)) {
                filteredData.push({ ...item, value: arr2[value] });
                // console.log('Input event, replacing value and adding to filteredData:', { ...item, value: arr2[value] });
            } else if (type === 'click' && element && arr2.hasOwnProperty(value)) {
                filteredData.push({ ...item, element: { ...element, innerText: arr2[value] } });
                // console.log('Click event, replacing innerText and adding to filteredData:', { ...item, element: { ...element, innerText: arr2[value] } });
            } else {
                filteredData.push(item);
                // console.log('Adding to filteredData without changes:', item);
            }
        }
    }

    return filteredData;
};

export class DataProcessor {
    constructor(monitorResults) {
        this.monitorResults = monitorResults;
    }

    addMonitor(page) {
        page.exposeFunction('onKeydown', (e) => {
            this.monitorResults.keydowns.push({ ...e, time: new Date() });
        });
        page.exposeFunction('onScroll', (e) => {
            this.monitorResults.scrolls.push({ ...e, time: new Date() });
        });
        page.exposeFunction('onPageClick', (e, tagName) => {
            this.monitorResults.clicks.push({ event: e, element: tagName, time: new Date() });
        });
        page.exposeFunction('onInput', (e) => {
            this.monitorResults.inputs.push({ ...e, time: new Date() });
        });
        page.on('framenavigated', async () => {
            const url = page.url();
            this.monitorResults.navigations.push({ url: url, time: new Date() });
        });
    }
}
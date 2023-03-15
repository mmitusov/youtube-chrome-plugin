//Скрипт из официальной доки хрома, который помогает нам узнать какая вкладка сейчас активна, из числа тех что сейчас открыты в браузере
export async function getActiveTabURL() {
    const tabs = await chrome.tabs.query({
        currentWindow: true,
        active: true
    });
  
    return tabs[0];
}
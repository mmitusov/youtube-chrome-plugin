import { getActiveTabURL } from "./utils.js";

//-----Порядок выполнения №3
const addNewBookmark = (bookmarks, bookmark) => {
  //Заготовки наших елементов
  const bookmarkTitleElement = document.createElement("div");
  const controlsElement = document.createElement("div");
  const newBookmarkElement = document.createElement("div"); //Этот елемента будет включать в себя/инкапсулировать два других - bookmarkTitleElemen & controlsElement

  //Приписываем параметры/свойства нашим елементам
  bookmarkTitleElement.textContent = bookmark.desc; //описание нашей закладки
  bookmarkTitleElement.className = "bookmark-title";
  controlsElement.className = "bookmark-controls";

  //Вызов который добовит кнопку, слушатель и название елемента к каждой отдельной заметке 
  setBookmarkAttributes("play", onPlay, controlsElement);
  setBookmarkAttributes("delete", onDelete, controlsElement);

  //Приписываем параметры/свойства нашим елементам
  newBookmarkElement.id = "bookmark-" + bookmark.time; //Сосздаем уникальный id-шник для каждого елемента. Потом будем использовать этот id для удаления конкретных закладок
  newBookmarkElement.className = "bookmark";
  newBookmarkElement.setAttribute("timestamp", bookmark.time);

  //Так как newBookmarkElement - должен быть родителем для двух других елементов - bookmarkTitleElemen & controlsElement
  newBookmarkElement.appendChild(bookmarkTitleElement);
  newBookmarkElement.appendChild(controlsElement);
  bookmarks.appendChild(newBookmarkElement);
};

//-----Порядок выполнения №2
const viewBookmarks = (currentBookmarks=[]) => { //currentBookmarks=[] - На всякий случай если мы ничего не передали
  //Задаем дефолтные параметры для тега "bookmarks"
  const bookmarksElement = document.getElementById("bookmarks");
  bookmarksElement.innerHTML = "";

  //Если у нас есть закладки - вызываем функцию для их отображения в popup окне при помощи функции addNewBookmark
  //Если нет - то '<i class="row">No bookmarks to show</i>'
  if (currentBookmarks.length > 0) {
    for (let i = 0; i < currentBookmarks.length; i++) {
      const bookmark = currentBookmarks[i];
      addNewBookmark(bookmarksElement, bookmark);
    }
  } else {
    bookmarksElement.innerHTML = '<i class="row">No bookmarks to show</i>';
  }

  return;
};

//-----Порядок выполнения №5.1
//Функция чтобы оживить нашу play-кнопку. При нажатии запускаем видео с timestamp из нашей закладки
const onPlay = async e => {
  const bookmarkTime = e.target.parentNode.parentNode.getAttribute("timestamp"); //"timestamp" - что мы ранее создали
  const activeTab = await getActiveTabURL(); //Таргетим открытую активную вкладку в хроме

  //Далее мы должны отправить в content.js сообщение, для манипуляции Ютуб плеера, чтобы запустить видео с того момента, который указа у нас в закладке
  //Похоже на то, что мы делали в background.js
  chrome.tabs.sendMessage(activeTab.id, {
    type: "PLAY",
    value: bookmarkTime,
  });
};

//-----Порядок выполнения №5.2
const onDelete = async e => {
  const activeTab = await getActiveTabURL(); //Таргетим открытую активную вкладку в хроме
  const bookmarkTime = e.target.parentNode.parentNode.getAttribute("timestamp");
  const bookmarkElementToDelete = document.getElementById( //Element that we want to delete
    "bookmark-" + bookmarkTime
  );

  bookmarkElementToDelete.parentNode.removeChild(bookmarkElementToDelete); //Grab the element that we want to delete

  //Далее мы должны отправить в content.js сообщение, для удаления timestamp из истории нашего браузера
  //Похоже на то, что мы делали в background.js
  chrome.tabs.sendMessage(activeTab.id, {
    type: "DELETE",
    value: bookmarkTime,
  }, viewBookmarks);
};

//-----Порядок выполнения №4
//Эта функция будет отрабатывать как для onPlay, так и для onDelete екшене
//Создаем елемент с play-иконкой, в который еще добавим слушатель событий с ивентом который должен будет отработать
const setBookmarkAttributes =  (src, eventListener, controlParentElement) => {
  const controlElement = document.createElement("img");

  controlElement.src = "assets/" + src + ".png"; //Чтобы динамически подгружать Play или Delete кнопку, в зависимости от екшена который вызывает нашу функцию
  controlElement.title = src;
  controlElement.addEventListener("click", eventListener);
  controlParentElement.appendChild(controlElement);
};

//-----Порядок выполнения №1
//DOMContentLoaded - слушатель который страбатывает как только весь HTML страницы подгрузился
//Он нужен чтобы как только страница загрузилась мы узнали об этом, и в последствии также еще подгрузили и всю историю наших видео заметок
document.addEventListener("DOMContentLoaded", async () => {
  const activeTab = await getActiveTabURL(); //берем активную вкладку
  const queryParameters = activeTab.url.split("?")[1]; //берем из нее часть ее URL
  const urlParameters = new URLSearchParams(queryParameters); //Чтобы далее иметь возможность достать уникальный id-шник

  const currentVideo = urlParameters.get("v"); //Из первоначальной части URL - достаем уникальный id-шник

  //Если открытая вкладка, это Ютуб видео, то берем из хранилища историю закладок и просматриваем их содержимое с viewBookmarks
  if (activeTab.url.includes("youtube.com/watch") && currentVideo) {
    chrome.storage.sync.get([currentVideo], (data) => {
      const currentVideoBookmarks = data[currentVideo] ? JSON.parse(data[currentVideo]) : [];

      viewBookmarks(currentVideoBookmarks);
    });
  } else {
    //Если открытая вкладка, это не то что нам нужно, то в самый родительский HTML документ ("container") нашего popup окошка мы вложим новый div
    const container = document.getElementsByClassName("container")[0];

    container.innerHTML = '<div class="title">This is not a youtube video page.</div>'; //class="title" - добавили просто для того, чтобы потом повесить на него стили, чтобы сделать сообщение немного красивее
  }
});
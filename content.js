(() => {
  let youtubeLeftControls, youtubePlayer; //Для получения доступа к прееру и его управлению (controls)
  let currentVideo = "";
  let currentVideoBookmarks = []; //Храни в себе все видео закладки, что мы создали для текущего видео

  //Порядок выполнения №4
  //Когда мы включаем видео, мы хотим подгрузить из памяти хрома всю историю уже ранее созданных/существующих заметок, если такие имеются  
  const fetchBookmarks = () => {
    return new Promise((resolve) => {
      chrome.storage.sync.get([currentVideo], (obj) => {
        resolve(obj[currentVideo] ? JSON.parse(obj[currentVideo]) : []);
      });
    });
  };

  //Порядок выполнения №3
  //Функция ответственна за то чтобы взять и сохранить инфу о том на каком промежутке временной шкалы видео сейчас находиться юзер (в секудах)  
  const addNewBookmarkEventHandler = async () => {
    const currentTime = youtubePlayer.currentTime; //Созданный Ютубом метод, чтобы разработчики могли легко вытягивать инфу о времени. Инфа изначально отображенна в СЕКУНДАХ
    //Подготовим нужную нам инфу к сохранению
    const newBookmark = {
      time: currentTime,
      desc: "Bookmark at " + getTime(currentTime), //При помощи getTime переведем секунда в стандартное ISO время - Минуты:Секунды
    };

    currentVideoBookmarks = await fetchBookmarks();

    //Спева сохраняем новую закладку в наш currentVideoBookmarks массив, далее отсортируем их все по времени (полю "time")
    //И после этого сохраним наш обновленный массив в память хрома - chrome.storage.sync.set  
    chrome.storage.sync.set({
      [currentVideo]: JSON.stringify([...currentVideoBookmarks, newBookmark].sort((a, b) => a.time - b.time))
    });
  };

  //Порядок выполнения №2
  //Функция по добавлению кнопки "Добавить в заметки" под каждое YouTube видео, если таковая отсутствует  
  const newVideoLoaded = async () => {
    //Как только ны на страничке с видео, то пробегаемся по DOM и возвращаем первый попавшийся елемент со стилем "bookmark-btn"
    const bookmarkBtnExists = document.getElementsByClassName("bookmark-btn")[0];

    currentVideoBookmarks = await fetchBookmarks();

    //Если кнопка "Добавить в заметки" отсутствует, то добавим таковую под видео
    if (!bookmarkBtnExists) {
      const bookmarkBtn = document.createElement("img"); //create img element - изначально пустой елемент-картинка для "Добавить в заметки" кнопки 

      //Добавим к нашей кнопке несколько новых атрибутов
      bookmarkBtn.src = chrome.runtime.getURL("assets/bookmark.png"); //Подвязываем картинку из источника
      bookmarkBtn.className = "ytp-button " + "bookmark-btn"; //подвяжем динамический className для стилизации с названим стилей 
      bookmarkBtn.title = "Click to bookmark current timestamp"; //Чтобы в будущем на onHover нашего елемента - показывать это сообщение

      youtubeLeftControls = document.getElementsByClassName("ytp-left-controls")[0]; //"ytp-left-controls" - под таким className храниться Ютубовстка левая часть панели управления, где находяться кнопки паузы, ползунка звука  и т.д.
      youtubePlayer = document.getElementsByClassName('video-stream')[0]; //'video-stream' - под таким className храниться Ютубовсткий плеер

      //Добавляем (injecting) вышесозданый нами елемент bookmarkBtn, в наше дом дерево. А если более конкретно, то внутрь youtubeLeftControls елемента. И повесим на него слушатель клика
      youtubeLeftControls.appendChild(bookmarkBtn);
      bookmarkBtn.addEventListener("click", addNewBookmarkEventHandler); //Отслеживаем когда юзер кликнет по добавленной кнопке после чего вызываем addNewBookmarkEventHandler
    }
    
    //Это старая залатка и она не работает. Правильная рабочая залатка написана и распологается на строке #116
    // newVideoLoaded()
  };

  //Порядок выполнения №1
  //background.js слушатель, который получает background.js объект с инфой находимся ли мы на нужной нам вкладке/страничке
  chrome.runtime.onMessage.addListener((obj, sender, response) => {
    const { type, value, videoId } = obj;

    //Если type === "NEW", то сохраняем id и запускаем newVideoLoaded() action
    if (type === "NEW") {
      currentVideo = videoId;
      newVideoLoaded();
    } else if (type === "PLAY") { //Если тип "PLAY" (.sendMessage вызывается из popup.js) - запускаем видео на конкретном timestamp
      youtubePlayer.currentTime = value;
    } else if ( type === "DELETE") {
      currentVideoBookmarks = currentVideoBookmarks.filter((b) => b.time != value);
      chrome.storage.sync.set({ [currentVideo]: JSON.stringify(currentVideoBookmarks) });

      response(currentVideoBookmarks);
    }
  });

  //Залатка - которая исправляет один баг
  //Если мы перезагрузим текущею страницу, то наш слушатель не сработает, ведь он только срабатывает при изменении URL и наша кнопка не отрисуется
  //Ведь только при изменении URL - запускается функция отрисовки кнопки
  //Поэтому, чтобы избежать такого поведения при перезагрузке - на всякий случай будем всегда лишний раз дополнительно вызывать нашу фушкцию ниже, еще раз
  let trail="&ytExt=ON";
  if(!window.location.href.includes(trail) && !window.location.href.includes("ab_channel") && window.location.href.includes("youtube.com/watch")){
    window.location.href+=trail;
  }
})();

//Порядок выполнения №5
//переводит секунды в стандартное ISO время - Минуты:Секунды
const getTime = t => {
  var date = new Date(0);
  date.setSeconds(t);

  return date.toISOString().substr(11, 8);
};

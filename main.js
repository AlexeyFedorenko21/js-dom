let ticker = null; // тикер
let game = null; // Игра
let pageId = "home"; // Текущая страница

// Старт приложения
window.addEventListener("load", ()=> {
    ticker = new Ticker();
    game = new Game();

    onboard(); // Обучение на главной странице
    random(); // Добавляем случайную генерацию на странице контактов
});

// Тикер 
class Ticker {
    #list = {
        home: new Map(),
        game: new Map(),
        contacts: new Map()
    }

    constructor() {
        this.tick();
    }

    // Добавить коллбэк на тик
    add(page, callback) {
        const id = Symbol();
        this.#list[page].set(id, callback);
        return id;
    }

    // Удалить коллбэк на тик
    delete(page, id) {
        return this.#list[page].delete(id);
    }

    // Тиковая функция
    tick() {     
        for (const [id, callback] of this.#list[pageId].entries()) {
            try {
                callback();
            } catch(err) {
                console.warn("Произошла непредвиденная ошибка");
                console.error(err);
                this.#list[pageId].delete(id);
            }
        }
        requestAnimationFrame(()=> this.tick());
    }
}

// Переключение страниц
const buttons = document.querySelectorAll("nav button"); // Получили все кнопки
const pages = document.querySelectorAll(".page"); // Получим все страницы

buttons.forEach(btn => {
    btn.addEventListener("click", ()=> {
        const oldPageId = pageId;
        pageId = btn.dataset.page;
        if (oldPageId !== pageId) { // Перелистнули на другую страницу
            window.dispatchEvent(new Event(`end ${oldPageId}`)); // Хук на то, что закончилась демонстрация страницы
        }
        pages.forEach(page => {
            if (page.id === pageId && oldPageId !== pageId) {
                window.dispatchEvent(new Event(`start ${pageId}`)); // Хук на то, что закончилась демонстрация страницы
            }
            page.classList.toggle('active', page.id === pageId);
        })
    })
});
// -----------------------------------------------------------------------------------------
// Обработка главной страницы
const btns = {
    w: document.getElementById("w"),
    a: document.getElementById("a"),
    s: document.getElementById("s"),
    d: document.getElementById("d"),
}

const change_text = (btn, bool) => {
    btns[btn].innerText = bool ? "Отпустите" : "Нажмите"
}

const map = ["KeyW", "KeyA", "KeyS", "KeyD"];

window.addEventListener("keydown", (e)=> {
    if (map.includes(e.code)) {
        change_text(e.code.replace("Key", "").toLocaleLowerCase(), true);
    }
});

window.addEventListener("keyup", (e)=> {
    if (map.includes(e.code)) {
        change_text(e.code.replace("Key", "").toLocaleLowerCase(), false);
    }
});

const m = document.getElementById("m");

function onboard() {
    let timer = 100;
    let rest = false;

    window.addEventListener("pointerdown", ()=> {
        if (rest) return;
        m.innerText = "но он уже сделан, ожидайте";
        rest = true;
    });

    const callback = ()=> {
        if (rest) {
            if (timer <= 0) {
                rest = false;
                timer = 100;
                m.innerText = "попробуйте, сейчас можно";
            } else {
               --timer;
            }
        }
    }

    const id = ticker.add("home", callback);
}

// -----------------------------------------------------------------------------------------
// Страница игры
class Game {
    #canvas;
    #ctx;
    #id;
    #keys;
    #pointer;

    #player = null;
    #light = null;
    #score = 0; // Счет игры
    #coin = null;
    #coins = {
        delay: 0,
        items: []
    }

    constructor() {
        this.#canvas = document.getElementById("c");
        this.#ctx = this.#canvas.getContext("2d");
        this.#canvas.width = 1280;
        this.#canvas.height = 720;

        // Управление
        window.addEventListener("keydown", (e) => this.keydown(e.code));
        window.addEventListener("keyup", (e) => this.keyup(e.code));
        window.addEventListener("pointerdown", (e)=> this.down(e.pointerId));
        window.addEventListener("pointerup", (e)=> this.up(e.pointerId));
        window.addEventListener("pointercancel", ()=> this.cancel());
    }

    init() {
        const ctx = this.#ctx;

        this.#id = ticker.add("game", ()=> this.tick());
        this.#score = 0;

        // Обнуляем информацию по кнопкам
        this.#keys = {
            "w" : false,
            "a" : false,
            "s" : false,
            "d" : false
        }

        // Обнуляем информацию по мыши
        this.#pointer = {
            pointerId: null,
            delay: 0
        }

        // Создаем излучение
        const light = new Image(1024, 256);
        light.onload = ()=> {
            this.#light = {
                image: light,
                pos: [100, 0],
                size: [85, 85],
                fSize: [256, 256],
                sx: 0,
                sy: 0
            }
        }
        light.src = "./images/light.png";
        
        // Создаем игрока
        const player = new Image(676, 169);
        player.onload = ()=> {
            this.#player = {
                image: player,
                pos: [0, 0],
                size: [85, 85],
                fSize: [169, 169],
                sx: 0,
                sy: 0
            };
        }
        player.src = "./images/camera.png";

        const coin = new Image();
        coin.onload = () => {
            this.#coin = {
                image: coin,
                size: [32, 32],
            }
        }
        coin.src = "./images/coin.webp";
    }

    tick() {
        if (this.#player === null || this.#light === null || this.#coin === null) return;
        if (this.#pointer.delay > 0) { // Сбрасываем задержку с мышки
            --this.#pointer.delay;
        }
        this.move();
        this.collide();
        this.render();
    }

    // Нажимаем кнопку
    keydown(code) {
        if (this.#player === null) return;
        const letter = code.replace("Key", "").toLowerCase();
        if (this.#keys.hasOwnProperty(letter)) {
            this.#keys[letter] = true;
        }
    }

    // Отпускаем кнопку
    keyup(code) {
        if (this.#player === null) return;
        const letter = code.replace("Key", "").toLowerCase();
        if (this.#keys.hasOwnProperty(letter)) {
            this.#keys[letter] = false;
        }
    }

    // Нажали на кнопку мыши
    down(id) {
        if (this.#player === null) return;
        if (this.#pointer.pointerId !== null) return; // Не фиксируем вторые касания
        if (this.#pointer.delay !== 0) return;
        this.#pointer.pointerId = id;
    }

    // Отпустили кнопку мыши
    up(id) {
        if (this.#player === null) return;
        if (this.#pointer.pointerId !== id) return;
        this.#pointer.delay = 16;
        this.#pointer.pointerId = null;
        this.animate();
    }

    // Свернули страницу, чтобы не потерялся pointerId
    cancel() {
        if (this.#player === null) return;
        this.#pointer.pointerId = null;  
    }

    // Анимация (пока простая, просто угол)
    animate() {
        if (this.#player.sx === 507) {
            this.#player.sx = 0;
            this.#light.sx = 0;
            this.#light.pos = [ 100, 0];
        } else {
            this.#player.sx += 169;
            this.#light.sx += 256;
            switch (this.#light.sx) {
                case 256:
                    this.#light.pos = [0, 100];
                    break;
                case 512:
                    this.#light.pos = [-100, 0];
                    break;
                case 768:
                    this.#light.pos = [0, -100];
                    break;
            }
        }
    }

    // Генерация коина
    createCoin() {
        if (this.#coins.delay > 0) {
            --this.#coins.delay;
            return;
        } else {
            const pos = [Math.floor(Math.random()*1240), Math.floor(Math.random()*680)];
            this.#coins.items.push({
                pos: pos,
                timer: 150
            });
            this.#coins.delay = Math.floor(Math.random()*100) + 112;
        }
    }

    // Движение
    move() {
        const {pos, size} = this.#player;
        const canvas = this.#canvas;
        const v = 5; // Скорость
        for (const key in this.#keys) {
            if (!this.#keys[key]) continue;
            switch (key) {
                case "w":
                    if (pos[1] - v > 0) {
                        pos[1] -= v;
                    } else {
                        pos[1] = 0;
                    }
                    break;
                case "s":
                    if (pos[1] + v < canvas.height - size[1]) {
                        pos[1] += v;
                    } else {
                        pos[1] = canvas.height - size[1];
                    }
                    break;
                case "a":
                    if (pos[0] - v > 0) {
                        pos[0] -= v;
                    } else {
                        pos[0] = 0;
                    }
                    break;
                case "d":
                    if (pos[0] + v < canvas.width - size[0]) {
                        pos[0] += v;
                    } else {
                        pos[0] = canvas.width - size[0];
                    }
                    break;
            }
        }
    }

    // Проверка на коллизии
    collide() {
        this.createCoin();
        for (let i = 0; i < this.#coins.items.length; i++) {
            const coin = this.#coins.items[i];
            --coin.timer;
            if (coin.timer <= 0) {
                this.#coins.items[i] = null;
                continue;
            }

            const player = this.#player;
            const light = this.#light;
            if (isCollision(player.pos[0] + light.pos[0], player.pos[1] + light.pos[1], light.size, ...coin.pos, this.#coin.size)) {
                this.#coins.items[i] = null;
                this.addScore();
            }
        }

        this.#coins.items = this.#coins.items.filter(item => item !== null);
    }

    // Увеличение счета
    addScore() {
        ++this.#score;
        const span = document.getElementById("score");
        span.innerText = `${this.#score}`;
    }

    // Рендер изображений
    render() {
        this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
        const ctx = this.#ctx;

        this.#coins.items.forEach(coin => {
            ctx.drawImage(this.#coin.image, ...coin.pos, ...this.#coin.size);
        })

        const { image, pos, size, sx, sy, fSize } = this.#player;
        const light = this.#light;

        ctx.drawImage(image, sx, sy, ...fSize, ...pos, ...size);
        ctx.drawImage(light.image, light.sx, light.sy, ...light.fSize, pos[0]+light.pos[0], pos[1]+light.pos[1], ...light.size);  
    }
    
    // Закрываем страницу с игрой
    end() {
        // Очищаем канвас
        ticker.delete("game", this.#id);
        this.#player = null;
        this.#light = null;
        this.#coin = null;
        this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    }
}

function isCollision(x1, y1, size1, x2, y2, size2) { // Касается ли объект2 объекта 1
    if (x2 + size2[0] < x1 ) return false;
    if (x1 + size1[0] < x2 ) return false;
    if (y1 + size1[1] < y2 ) return false;
    if (y2 + size2[1] < y1 ) return false;
    return true;
}

// События запуска и окончания игры
window.addEventListener("start game", ()=> game.init())
window.addEventListener("end game", ()=> game.end())

// -----------------------------------------------------------------------------------------
// Обработка страницы с формой
const form = document.getElementById('contactForm');

form.addEventListener('submit', e => {
   e.preventDefault();
   alert('Спасибо за сообщение! Ваши слова очень важны для нас.');
   form.reset();
});

const span = document.getElementById("random");
const ptimer = document.getElementById("timer");

// Балуемся с генерацией чисел
function random() {
    let timer = 0;
    let close = false;
    let type = "";
    let escapeDown = false;
    let startClose = false;
    let timerClose = 188;

    const callback = ()=> {
        if (!close) {
            if (timer <= 0) {
                const count = Math.floor(Math.random()*1000)+1;
                span.innerText = `${count}`;
                timer = Math.floor(Math.random()*100) + 75;
            } else {
                --timer;
            }
        } else {
            span.innerText = "генерация числа отключена";
        }
        if (startClose) {
            if (timerClose <= 0) {
                timerClose = 188;
                close = !close;
                startClose = false;
                type = "";
            } else {
                --timerClose;
                const ms = timerClose * 16;
                ptimer.innerText = `Ждать ещё ${Math.floor(ms/1000)}.${ms-Math.floor(ms/1000)*1000}`;
            }
        } else {
            ptimer.innerText = "";
        }
        
    }

    window.addEventListener("keydown", (e)=> {
        if (type !== "") return;
        if (escapeDown) return;
        if (e.code === "Escape") {
            startClose = true;
            escapeDown = true;
            type = "key";
        }
    });

    window.addEventListener("keyup", (e)=> {
        if (type !== "key") return;
        if (e.code === "Escape") {
            startClose = false;
            escapeDown = false;
            type = "";
            if (timerClose !== 188) {
                timerClose = 188;
            }
        }
    });

    window.addEventListener("pointerdown", ()=> {
        if (type !== "") return;
        startClose = true;
        type = "mouse";
    });

    window.addEventListener("pointerup", ()=> {
        if (type !== "mouse") return;
        startClose = false;
        type = "";
        if (timerClose !== 188) {
            timerClose = 188;
        }
    });

    window.addEventListener("pointercancel", ()=> {
        if (type !== "mouse") return;
        startClose = false;
        type = "";
        if (timerClose !== 188) {
            timerClose = 188;
        }
    })



    ticker.add("contacts", callback);
}



const container = document.getElementById('map-container');
const stage = new Konva.Stage({
    container: 'map-container',
    width: container.offsetWidth,
    height: container.offsetHeight,
    draggable: true // Разрешаем перетаскивать карту мышкой
});

const layer = new Konva.Layer();
stage.add(layer);

let currentFloorGroup = null;

// ==========================================
// 1. ПУТИ К КАРТИНКАМ (Экспорт из Figma в PNG)
// ==========================================
const floorPlans = {
    "1": "floor1.png", // Файлы должны лежать в папке с index.html
    "2": "floor2.png",
    "3": "floor3.png"
};

// ==========================================
// 2. БАЗА ДАННЫХ КООРДИНАТ КАБИНЕТОВ ИЗ FIGMA
// ==========================================
// Сюда ты вносишь X, Y, W, H, которые скопировал из Figma
const roomsData = {
    "1": [
        { id: "101", name: "Приемная комиссия", type: "rect", x: 4595, y: 3020, w: 287, h: 407 },
        { id: "102", name: "Гардероб", type: "rect", x: 4595, y: 3020, w: 287, h: 407 }
    ],
    "2": [
        { id: "201", name: "Кафедра Информационных Технологий", type: "rect", x: 150, y: 220, w: 110, h: 80 },
        { id: "202", name: "Компьютерный класс №1", type: "rect", x: 280, y: 220, w: 140, h: 80 }
    ],
    "3": [
        { id: "301", name: "Деканат", type: "rect", x: 400, y: 180, w: 100, h: 70 }
    ]
};

// ==========================================
// 3. ФУНКЦИЯ ОТРИСОВКИ КЛИКАБЕЛЬНЫХ ОБЛАСТЕЙ
// ==========================================
function drawRooms(floorNumber, targetGroup) {
    const rooms = roomsData[floorNumber] || [];

    rooms.forEach(data => {
        let roomShape;

        // Общие настройки стиля зон кабинетов
        const shapeConfig = {
            id: data.id,
            fill: 'rgba(0, 123, 255, 0.0)', // По умолчанию невидимы (прозрачны)
            stroke: '#007bff',              // Синий цвет рамки при наведении
            strokeWidth: 0,                 // Прячем рамку по умолчанию
            cursor: 'pointer'
        };

        // Если кабинет прямоугольный
        if (data.type === "rect") {
            roomShape = new Konva.Rect({
                ...shapeConfig,
                x: data.x,
                y: data.y,
                width: data.w,
                height: data.h
            });
        } 
        // Если кабинет сложной формы (полигон)
        else if (data.type === "poly") {
            roomShape = new Konva.Line({
                ...shapeConfig,
                points: data.points,
                closed: true
            });
        }

        // --- ИНТЕРАКТИВНЫЕ СОБЫТИЯ ---

        // Эффект при наведении (Подсветка кабинета)
        roomShape.on('mouseenter', () => {
            roomShape.fill('rgba(0, 123, 255, 0.25)'); // Проявляем полупрозрачный синий тон
            roomShape.strokeWidth(2);                  // Показываем контур комнаты
            layer.draw();                              // Мгновенно обновляем холст
        });

        // Эффект, когда уводим курсор с кабинета
        roomShape.on('mouseleave', () => {
            roomShape.fill('rgba(0, 123, 255, 0.0)');  // Снова делаем прозрачным
            roomShape.strokeWidth(0);                  // Скрываем контур
            layer.draw();
        });

        // Клик по кабинету
        roomShape.on('click', (e) => {
            e.cancelBubble = true; // Запрещаем карте двигаться при клике на кабинет
            
            // Выводим информацию (в будущем здесь можно сделать красивое модальное окно)
            alert(`Аудитория: ${data.id}\nНазначение: ${data.name}`);
        });

        // Добавляем созданную фигуру на слой этажа
        targetGroup.add(roomShape);
    });
}

// ==========================================
// 4. ЗАГРУЗКА ЭТАЖА И ПОДЛОЖКИ FIGMA
// ==========================================
function loadFloor(floorNumber) {
    if (currentFloorGroup) {
        currentFloorGroup.destroy(); // Стираем старый этаж перед загрузкой нового
    }

    currentFloorGroup = new Konva.Group();

    const imageObj = new Image();
    imageObj.src = floorPlans[floorNumber];

    imageObj.onload = function() {
        // Создаем изображение подложки карты
        const kImage = new Konva.Image({
            x: 0,
            y: 0,
            image: imageObj,
            width: 1200, // Жестко фиксируем ширину под Figma-координаты
            height: 1200 * (imageObj.height / imageObj.width) // Пропорциональная высота
        });

        // Добавляем картинку в группу этажа
        currentFloorGroup.add(kImage);

        // Запускаем отрисовку кликабельных зон поверх картинки
        drawRooms(floorNumber, currentFloorGroup);

        // Пушим всю группу на рабочий слой холста
        layer.add(currentFloorGroup);
        
        // Центрируем карту на экране пользователя при смене этажа
        stage.position({
            x: (stage.width() - kImage.width() * stage.scaleX()) / 2,
            y: (stage.height() - kImage.height() * stage.scaleY()) / 2
        });
        
        layer.draw();
    };

    imageObj.onerror = function() {
        console.error(`Ошибка загрузки: не найден файл ${floorPlans[floorNumber]}`);
    };
}

// ==========================================
// 5. УПРАВЛЕНИЕ КНОПКАМИ ЭТАЖЕЙ
// ==========================================
document.querySelectorAll('.floor-button').forEach(button => {
    button.addEventListener('click', (e) => {
        const activeBtn = document.querySelector('.floor-button.active');
        if (activeBtn) activeBtn.classList.remove('active');
        e.target.classList.add('active');
        
        const floor = e.target.getAttribute('data-floor');
        loadFloor(floor);
    });
});

// ==========================================
// 6. УПРАВЛЕНИЕ ЗУМОМ (КОЛЕСИКО МЫШИ)
// ==========================================
const scaleBy = 1.1;
stage.on('wheel', (e) => {
    e.evt.preventDefault();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
    };

    let newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    if (newScale < 0.1) newScale = 0.1; // Ограничение отдаления
    if (newScale > 8) newScale = 8;     // Ограничение приближения

    stage.scale({ x: newScale, y: newScale });

    const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
    layer.draw();
});

// Включаем 2-й этаж по умолчанию при старте
loadFloor("2");

// Подгоняем холст под размеры экрана при ресайзе браузера
window.addEventListener('resize', () => {
    stage.width(container.offsetWidth);
    stage.height(container.offsetHeight);
    layer.draw();
});
function drawRooms(floorNumber, targetGroup) {
    const rooms = roomsData[floorNumber] || [];

    // Указываем точную ширину твоего фрейма из Figma
    const figmaFrameWidth = 5357; 
    
    // Вычисляем коэффициент масштаба (на сколько нужно уменьшить координаты)
    const k = 1200 / figmaFrameWidth; 

    rooms.forEach(data => {
        let roomShape;

        const shapeConfig = {
            id: data.id,
            fill: 'rgba(0, 123, 255, 0.0)', // Прозрачный, пока не навели мышь
            stroke: '#007bff',              // Цвет контура при наведении
            strokeWidth: 0,                 // Контур скрыт по умолчанию
            cursor: 'pointer'
        };

        if (data.type === "rect") {
            // Автоматически пересчитываем огромные координаты Figma под наш сайт
            roomShape = new Konva.Rect({
                ...shapeConfig,
                x: data.x * k,
                y: data.y * k,
                width: data.w * k,
                height: data.h * k
            });
        } else if (data.type === "poly") {
            // Если будут полигоны, пересчитываем каждую точку в массиве
            const scaledPoints = data.points.map(p => p * k);
            roomShape = new Konva.Line({
                ...shapeConfig,
                points: scaledPoints,
                closed: true
            });
        }

        // Эффекты мыши
        roomShape.on('mouseenter', () => {
            roomShape.fill('rgba(0, 123, 255, 0.3)'); // Мягкая синяя подсветка
            roomShape.strokeWidth(2);                 // Показываем рамку кабинета
            layer.draw();                             // Перерисовываем холст
        });

        roomShape.on('mouseleave', () => {
            roomShape.fill('rgba(0, 123, 255, 0.0)');  
            roomShape.strokeWidth(0);                  
            layer.draw();
        });

        roomShape.on('click', (e) => {
            e.cancelBubble = true; 
            alert(`Аудитория: ${data.id}\nНазначение: ${data.name}`);
        });

        targetGroup.add(roomShape);
    });
}
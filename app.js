// app.js
const container = document.getElementById('map-container');
let isInitialLoad = true;

// Инициализация холста Konva
const stage = new Konva.Stage({
    container: 'map-container',
    width: container.offsetWidth,
    height: container.offsetHeight,
    draggable: true
});

const layer = new Konva.Layer();
stage.add(layer);

let currentFloorGroup = null;
const mapWidthOnSite = 1200;  // Ширина карты на сайте
const figmaFrameWidth = 5357; // Исходная ширина фрейма в Figma
const k = mapWidthOnSite / figmaFrameWidth; // Коэффициент пересчета

// Ограничение перемещения карты
stage.dragBoundFunc(function(pos) {
    const scale = stage.scaleX();
    
    // Ищем на холсте загруженное изображение этажа
    const currentImg = stage.find('Image')[0];
    const currentImgHeight = currentImg ? currentImg.height() : mapWidthOnSite * 0.75;
    
    // Вычисляем границы с запасом в 300 пикселей
    const minX = stage.width() - mapWidthOnSite * scale - 300;
    const maxX = 300;
    const minY = stage.height() - currentImgHeight * scale - 300;
    const maxY = 300;

    return {
        x: Math.max(Math.min(maxX, pos.x), minX),
        y: Math.max(Math.min(maxY, pos.y), minY)
    };
});

// Функция отрисовки кабинетов (данные берутся из config.js)
function drawRooms(floorNumber, targetGroup) {
    const rooms = roomsData[floorNumber] || [];

    rooms.forEach(data => {
        let roomShape;

        // 1. Прямоугольники
        if (data.type === "rect") {
            roomShape = new Konva.Rect({
                x: data.x * k,
                y: data.y * k,
                width: data.w * k,
                height: data.h * k,
                fill: 'rgba(0, 123, 255, 0.0)',
                stroke: '#007bff',
                strokeWidth: 0,
                cursor: 'pointer'
            });
        } 
        // 2. Многоугольники (Г-образные кабинеты, скошенные углы)
        else if (data.type === "polygon") {
            roomShape = new Konva.Line({
                // Умножаем каждую точку на коэффициент k
                points: data.points.map(point => point * k),
                closed: true, // Обязательно замыкаем линию, чтобы получилась залитая фигура
                fill: 'rgba(0, 123, 255, 0.0)',
                stroke: '#007bff',
                strokeWidth: 0,
                cursor: 'pointer'
            });
        }
        // 3. Круглые объекты
        else if (data.type === "circle") {
            roomShape = new Konva.Circle({
                x: data.x * k,
                y: data.y * k,
                radius: data.r * k,
                fill: 'rgba(0, 123, 255, 0.0)',
                stroke: '#007bff',
                strokeWidth: 0,
                cursor: 'pointer'
            });
        }

        if (!roomShape) return;

        // Эффекты при наведении мыши
        roomShape.on('mouseenter', () => {
            roomShape.fill('rgba(0, 123, 255, 0.3)');
            roomShape.strokeWidth(2);
            layer.draw();
        });

        roomShape.on('mouseleave', () => {
            roomShape.fill('rgba(0, 123, 255, 0.0)');
            roomShape.strokeWidth(0);
            layer.draw();
        });

        // Клик по кабинету — открывает модальное окно справа сверху
        roomShape.on('click tap', (e) => {
            e.cancelBubble = true; // Предотвращаем подергивание карты
            
            // Наполняем модалку данными из config.js
            document.getElementById('modal-title').innerText = data.name;
            document.getElementById('modal-desc').innerText = data.desc;
            
            // Показываем окно
            document.getElementById('room-modal').style.display = 'block';
        });

        targetGroup.add(roomShape);
    });
}

// Функция загрузки этажа
function loadFloor(floorNumber) {
    if (currentFloorGroup) currentFloorGroup.destroy();
    currentFloorGroup = new Konva.Group();

    const imageObj = new Image();
    imageObj.src = `floor${floorNumber}.png`;

    imageObj.onload = function() {
        const calculatedHeight = mapWidthOnSite * (imageObj.height / imageObj.width);

        const kImage = new Konva.Image({
            x: 0,
            y: 0,
            image: imageObj,
            width: mapWidthOnSite,
            height: calculatedHeight
        });

        currentFloorGroup.add(kImage);
        drawRooms(floorNumber, currentFloorGroup);
        layer.add(currentFloorGroup);
        
        // ЧЕТКАЯ ПРОВЕРКА: Центрируем карту ТОЛЬКО ОДИН РАЗ при самом первом открытии сайта
        if (isInitialLoad) {
            const currentScale = stage.scaleX();
            const centerX = (stage.width() - mapWidthOnSite * currentScale) / 2;
            const centerY = (stage.height() - calculatedHeight * currentScale) / 2;

            stage.position({ x: centerX, y: centerY });
            isInitialLoad = false;
        }

        layer.batchDraw();
    };
}

// Обработка кликов по кнопкам этажей
document.querySelectorAll('.floor-button').forEach(button => {
    button.addEventListener('click', (e) => {
        if (e.target.classList.contains('active')) return;

        document.querySelector('.floor-button.active').classList.remove('active');
        e.target.classList.add('active');
        loadFloor(e.target.getAttribute('data-floor'));
    });
});

// Зум колесиком мыши
stage.on('wheel', (e) => {
    e.evt.preventDefault();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
    };

    let newScale = e.evt.deltaY < 0 ? oldScale * 1.1 : oldScale / 1.1;
    newScale = Math.max(0.15, Math.min(6, newScale));

    stage.scale({ x: newScale, y: newScale });
    stage.position({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
    });
    layer.draw();
});

window.addEventListener('resize', () => {
    stage.width(container.offsetWidth);
    stage.height(container.offsetHeight);
    layer.draw();
});

// Стартуем с 1 этажа
loadFloor("1");

// Закрытие модального окна при клике на крестик
document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('room-modal').style.display = 'none';
});

// Скрывать окно, если переключаем этаж
document.querySelectorAll('.floor-button').forEach(button => {
    button.addEventListener('click', () => {
        document.getElementById('room-modal').style.display = 'none';
    });
});
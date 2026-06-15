// app.js
const container = document.getElementById('map-container');
let isInitialLoad = true;

// настройка холста Konva
const stage = new Konva.Stage({
    container: 'map-container',
    width: container.offsetWidth,
    height: container.offsetHeight,
    draggable: true
});

const layer = new Konva.Layer(); // создаем холст
stage.add(layer);

let currentFloorGroup = null;
const mapWidthOnSite = 1200;  // ширина карты на сайте
const figmaFrameWidths = {
    1: 5357,
    2: 1063,
    3: 1063,
    4: 1063
}; // ширина карт в figma
// ограничение перемещения карты
stage.dragBoundFunc(function(pos) {
    const scale = stage.scaleX();
    
    // загрузка фото на холст
    const currentImg = stage.find('Image')[0];
    const currentImgHeight = currentImg ? currentImg.height() : mapWidthOnSite * 0.75;
    
    // границы с запасом
    const minX = stage.width() - mapWidthOnSite * scale - 600;
    const maxX = 600;
    const minY = stage.height() - currentImgHeight * scale - 600;
    const maxY = 600;

    return {
        x: Math.max(Math.min(maxX, pos.x), minX),
        y: Math.max(Math.min(maxY, pos.y), minY)
    };
});

// отрисовка кабинетов на холсте
function drawRooms(floorNumber, targetGroup) {
    const rooms = roomsData[floorNumber] || [];
    
    const figmaFrameWidth = figmaFrameWidths[floorNumber];
    const k = mapWidthOnSite / figmaFrameWidth;
    
    rooms.forEach(data => {
        let roomShape;

        // 1. прямоугольники
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
        // 2. многоугольники (Г-образные кабинеты и тд.)
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
        // 3. круги
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

        // эффекты при наведении
        roomShape.on('mouseenter', () => {
            roomShape.fill('rgba(0, 123, 255, 0.3)');
            roomShape.strokeWidth(2);
            layer.draw();
        });
        // эффект при уберании
        roomShape.on('mouseleave', () => {
            roomShape.fill('rgba(0, 123, 255, 0.0)');
            roomShape.strokeWidth(0);
            layer.draw();
        });

        // логика клика
        roomShape.on('click tap', (e) => {
            e.cancelBubble = true;
            
            // наполнение модальки данными
            document.getElementById('modal-title').innerText = data.name;
            document.getElementById('modal-desc').innerText = data.desc;
            
            // Показываем окно
            document.getElementById('room-modal').style.display = 'block';
        });

        targetGroup.add(roomShape);
    });
}

// загрузка этажа
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

// обработка кликов по кнопкам этажей
document.querySelectorAll('.floor-button').forEach(button => {
    button.addEventListener('click', (e) => {
        if (e.target.classList.contains('active')) return;

        document.querySelector('.floor-button.active').classList.remove('active');
        e.target.classList.add('active');
        loadFloor(e.target.getAttribute('data-floor'));
    });
});

// зум
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

// Старт
loadFloor("1");

// закрытие окна при клике на крестик
document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('room-modal').style.display = 'none';
});

// скрывание окна при переключении этажа
document.querySelectorAll('.floor-button').forEach(button => {
    button.addEventListener('click', () => {
        document.getElementById('room-modal').style.display = 'none';
    });
});
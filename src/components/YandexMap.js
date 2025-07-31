import React, { useEffect, useRef, useState } from 'react';

const YandexMap = ({ parkings, onParkingSelect, selectedParking, onNearbySearch }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const [mapReady, setMapReady] = useState(false);
    const [searchMarker, setSearchMarker] = useState(null);
    const [customBalloon, setCustomBalloon] = useState(null); // Кастомный балун

    useEffect(() => {
        // Проверяем что Yandex Maps API загружен
        if (!window.ymaps) {
            console.error('❌ Yandex Maps API не загружен!');
            console.log('🔧 Проверьте подключение к интернету и загрузку скрипта в index.html');
            return;
        }

        console.log('✅ Yandex Maps API загружен, версия:', window.ymaps.version);

        // Инициализация карты
        if (window.ymaps && !mapInstanceRef.current) {
            window.ymaps.ready(() => {
                try {
                    console.log('🗺️ Инициализируем карту...');
                    const map = new window.ymaps.Map(mapRef.current, {
                        center: [55.76, 37.64], // Москва по умолчанию
                        zoom: 12,
                        controls: ['zoomControl', 'fullscreenControl', 'geolocationControl']
                    });

                    console.log('✅ Карта создана, центр:', map.getCenter(), 'зум:', map.getZoom());

                    // Обработчик клика по карте (всегда активен)
                    map.events.add('click', (e) => {
                        try {
                            const coords = e.get('coords');
                            if (coords && coords.length >= 2) {
                                console.log('🖱️ Клик по карте, координаты:', coords);
                                handleMapClick(coords);
                                // Закрываем кастомный балун при клике по карте
                                setCustomBalloon(null);
                            }
                        } catch (error) {
                            console.error('Ошибка при обработке клика по карте:', error);
                        }
                    });

                    // Курсор для кликов по карте
                    map.events.add('mousemove', () => {
                        try {
                            const container = map.container.getElement();
                            if (container) {
                                container.style.cursor = 'crosshair';
                            }
                        } catch (error) {
                            console.error('Ошибка при установке курсора:', error);
                        }
                    });

                    // ИСПРАВЛЕНИЕ: Добавляем обработчик изменения размеров карты
                    map.events.add('sizechange', () => {
                        console.log('📐 Размер карты изменился, закрываем балун');
                        setCustomBalloon(null); // Закрываем балун при изменении размера
                    });

                    // Принудительно обновляем размеры карты после инициализации
                    setTimeout(() => {
                        map.container.fitToViewport();
                        console.log('✅ Размеры карты обновлены после инициализации');
                    }, 500);

                    mapInstanceRef.current = map;
                    setMapReady(true);
                    console.log('🎉 Карта полностью инициализирована и готова к использованию!');
                } catch (error) {
                    console.error('❌ Ошибка при инициализации карты:', error);
                }
            });
        }
    }, []);

    useEffect(() => {
        if (mapReady && mapInstanceRef.current) {
            try {
                updateParkingsOnMap();
            } catch (error) {
                console.error('Ошибка при обновлении парковок на карте:', error);
            }
        }
    }, [parkings, mapReady, selectedParking]);

    const handleMapClick = (coords) => {
        try {
            // В Yandex Maps coords приходят в формате [lat, lng]
            const [latitude, longitude] = coords;

            if (typeof latitude !== 'number' || typeof longitude !== 'number') {
                console.error('Некорректные координаты:', coords);
                return;
            }

            console.log('🗺️ Клик по карте:', { latitude, longitude });

            // Добавляем маркер места поиска (координаты в формате Yandex: [lat, lng])
            addSearchMarker([latitude, longitude]);

            // Вызываем поиск ближайших парковок
            if (onNearbySearch && typeof onNearbySearch === 'function') {
                onNearbySearch({
                    lat: latitude,
                    lng: longitude
                });
            }
        } catch (error) {
            console.error('Ошибка в handleMapClick:', error);
        }
    };

    const addSearchMarker = (coords) => {
        try {
            const map = mapInstanceRef.current;
            if (!map || !coords || coords.length < 2) {
                console.error('Невозможно добавить маркер: некорректные данные');
                return;
            }

            console.log('🔴 Создаем маркер на координатах:', coords);

            // Удаляем предыдущий маркер поиска
            if (searchMarker) {
                console.log('🗑️ Удаляем предыдущий маркер');
                map.geoObjects.remove(searchMarker);
            }

            // Создаем новый маркер
            const marker = new window.ymaps.Placemark(coords, {
                balloonContentHeader: 'Поиск парковок',
                balloonContentBody: 'Ищем ближайшие парковки в этом районе...',
            }, {
                preset: 'islands#redIcon',
                iconColor: '#ff0000'
            });

            console.log('✅ Маркер создан, добавляем на карту');
            map.geoObjects.add(marker);
            setSearchMarker(marker);
        } catch (error) {
            console.error('Ошибка при добавлении маркера:', error);
        }
    };

    // Функция для показа кастомного балуна
    const showCustomBalloon = (parking, coords) => {
        const map = mapInstanceRef.current;
        if (!map) {
            console.error('❌ Карта не инициализирована для показа балуна');
            return;
        }

        console.log('🎯 Показываем балун для парковки:', parking.name);
        console.log('📍 Координаты на карте:', coords);

        try {
            // ИСПРАВЛЕНИЕ: Принудительно обновляем размеры карты
            map.container.fitToViewport();

            // Ждем немного чтобы размеры обновились
            setTimeout(() => {
                try {
                    // Преобразуем координаты карты в пиксели
                    const pixelCoords = map.converter.globalToPage(coords);
                    console.log('🖥️ Координаты в пикселях:', pixelCoords);

                    // Получаем размеры контейнера карты
                    const mapContainer = mapRef.current;
                    const mapRect = mapContainer.getBoundingClientRect();
                    console.log('📏 Размеры контейнера карты:', {
                        width: mapRect.width,
                        height: mapRect.height,
                        top: mapRect.top,
                        left: mapRect.left
                    });

                    // Проверяем что координаты адекватные
                    if (pixelCoords[0] < 0 || pixelCoords[0] > mapRect.width ||
                        pixelCoords[1] < 0 || pixelCoords[1] > mapRect.height) {
                        console.warn('⚠️ Координаты балуна за пределами карты:', pixelCoords);
                        // Центрируем балун если координаты неадекватные
                        pixelCoords[0] = mapRect.width / 2;
                        pixelCoords[1] = mapRect.height / 2;
                        console.log('🔧 Скорректированные координаты:', pixelCoords);
                    }

                    const balloonData = {
                        parking: parking,
                        x: pixelCoords[0],
                        y: pixelCoords[1],
                        coords: coords,
                        mapRect: mapRect
                    };

                    console.log('💾 Данные балуна:', balloonData);

                    setCustomBalloon(balloonData);

                    // Проверяем что состояние обновилось
                    setTimeout(() => {
                        console.log('⏱️ Проверка состояния балуна через 100мс...');
                        console.log('✅ Балун должен быть виден на координатах:', pixelCoords);
                    }, 100);

                } catch (innerError) {
                    console.error('❌ Ошибка при вычислении координат:', innerError);
                    // Fallback - показываем балун в центре карты
                    const mapContainer = mapRef.current;
                    const mapRect = mapContainer.getBoundingClientRect();
                    setCustomBalloon({
                        parking: parking,
                        x: mapRect.width / 2,
                        y: mapRect.height / 2,
                        coords: coords,
                        mapRect: mapRect
                    });
                    console.log('🆘 Показываем балун в центре карты как fallback');
                }
            }, 100); // 100мс задержка для обновления размеров

        } catch (error) {
            console.error('❌ Ошибка при создании балуна:', error);
        }
    };

    const updateParkingsOnMap = () => {
        try {
            const map = mapInstanceRef.current;
            if (!map) {
                console.error('Карта не инициализирована');
                return;
            }

            // Очищаем предыдущие маркеры парковок
            map.geoObjects.removeAll();

            // Возвращаем маркер поиска если он был
            if (searchMarker) {
                map.geoObjects.add(searchMarker);
            }

            if (!parkings || parkings.length === 0) {
                console.log('Нет парковок для отображения');
                return;
            }

            console.log('🗺️ Создаем маркеры для', parkings.length, 'парковок');
            const bounds = [];

            parkings.forEach((parking, index) => {
                try {
                    if (!parking.coordinates ||
                        typeof parking.coordinates.lat !== 'number' ||
                        typeof parking.coordinates.lng !== 'number') {
                        console.warn('Пропускаем парковку без корректных координат:', parking.id);
                        return;
                    }

                    const coords = [parking.coordinates.lat, parking.coordinates.lng];
                    bounds.push(coords);

                    const iconColor = selectedParking && selectedParking.id === parking.id ? '#ff0000' : '#0066ff';
                    const iconPreset = 'islands#dotIcon';

                    // Создаем простой маркер без балуна
                    const placemark = new window.ymaps.Placemark(coords, {
                        hintContent: parking.name || 'Парковка'
                    }, {
                        preset: iconPreset,
                        iconColor: iconColor
                    });

                    // Событие клика - показываем кастомный балун
                    placemark.events.add('click', function (e) {
                        console.log('🎯 Клик по маркеру:', parking.name);

                        // Останавливаем всплытие события
                        e.preventDefault();

                        // Показываем кастомный балун
                        showCustomBalloon(parking, coords);

                        // Выбираем парковку
                        if (onParkingSelect && typeof onParkingSelect === 'function') {
                            onParkingSelect(parking);
                        }
                    });

                    // Добавляем маркер прямо на карту
                    map.geoObjects.add(placemark);
                    console.log(`✅ Маркер ${index + 1} создан для:`, parking.name);

                } catch (error) {
                    console.error('Ошибка при создании маркера для парковки:', parking.id, error);
                }
            });

            console.log('✅ Все маркеры добавлены на карту');

            // Установка границ карты по всем меткам (если отсутствует маркер поиска)
            if (bounds.length > 0 && !searchMarker) {
                try {
                    console.log('🗺️ Устанавливаем границы карты по', bounds.length, 'точкам');
                    map.setBounds(bounds, {
                        checkZoomRange: true,
                        zoomMargin: 30
                    }).then(() => {
                        if (map.getZoom() > 16) {
                            map.setZoom(16);
                        }
                        console.log('✅ Границы карты установлены');
                    }).catch(error => {
                        console.error('Ошибка при установке границ карты:', error);
                    });
                } catch (error) {
                    console.error('Ошибка при установке границ карты:', error);
                }
            }
        } catch (error) {
            console.error('Ошибка в updateParkingsOnMap:', error);
        }
    };

    // Упрощенные глобальные функции (в основном для отладки)
    useEffect(() => {
        try {
            // Простая функция для создания маршрута (если понадобится в будущем)
            window.routeToParking = (parkingId) => {
                try {
                    console.log('🗺️ Создание маршрута к парковке с ID:', parkingId);
                    const parking = parkings.find(p => p.id === parkingId);
                    if (parking && parking.coordinates &&
                        typeof parking.coordinates.lat === 'number' &&
                        typeof parking.coordinates.lng === 'number') {
                        const url = `https://yandex.ru/maps/?rtext=~${parking.coordinates.lat},${parking.coordinates.lng}&rtt=auto`;
                        window.open(url, '_blank');
                        console.log('✅ Открыт маршрут к:', parking.name);
                    } else {
                        console.warn('Координаты парковки недоступны для создания маршрута');
                    }
                } catch (error) {
                    console.error('Ошибка при создании маршрута:', error);
                }
            };

            // Функция для проверки состояния карты
            window.checkMapState = () => {
                const map = mapInstanceRef.current;
                if (map) {
                    console.log('🗺️ Состояние карты:');
                    console.log('- Центр:', map.getCenter());
                    console.log('- Зум:', map.getZoom());
                    console.log('- Объектов на карте:', map.geoObjects.getLength());
                    console.log('- Парковок загружено:', parkings.length);
                    return {
                        center: map.getCenter(),
                        zoom: map.getZoom(),
                        objectsCount: map.geoObjects.getLength(),
                        parkingsCount: parkings.length
                    };
                } else {
                    console.log('❌ Карта не инициализирована');
                    return { error: 'Карта не инициализирована' };
                }
            };

            console.log('✅ Вспомогательные функции карты созданы');
        } catch (error) {
            console.error('Ошибка при создании вспомогательных функций:', error);
        }

        return () => {
            try {
                delete window.routeToParking;
                delete window.checkMapState;
                console.log('🗑️ Вспомогательные функции очищены');
            } catch (error) {
                console.error('Ошибка при очистке функций:', error);
            }
        };
    }, [parkings, onParkingSelect]);

    return (
        <div className="map-container" style={{ position: 'relative' }}>
            <div className="map-controls">
                <div className="map-hint">
                    <span>💡 Кликните по карте, чтобы найти 5 ближайших парковок в радиусе 200м</span>
                </div>
            </div>

            <div
                ref={mapRef}
                className="yandex-map"
                style={{ width: '100%', height: '500px' }}
            />

            {/* Кастомный балун */}
            {customBalloon && (
                <div
                    className="custom-balloon"
                    style={{
                        position: 'absolute',
                        left: Math.max(10, customBalloon.x - 150),
                        top: Math.max(10, customBalloon.y - 120),
                        zIndex: 9999,
                        background: '#ffffff',
                        border: '3px solid #ff0000', // Красная рамка для видимости
                        borderRadius: '10px',
                        padding: '15px',
                        minWidth: '280px',
                        maxWidth: '350px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                        fontSize: '14px',
                        pointerEvents: 'auto' // Важно для взаимодействия
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        console.log('🖱️ Клик по балуну');
                    }}
                >
                    {/* Отладочная информация
                    <div style={{
                        position: 'absolute',
                        top: '-25px',
                        left: '0',
                        background: 'yellow',
                        padding: '2px 6px',
                        fontSize: '10px',
                        borderRadius: '3px'
                    }}>
                        DEBUG: x={Math.round(customBalloon.x)}, y={Math.round(customBalloon.y)}
                    </div> */}

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            console.log('❌ Закрываем балун');
                            setCustomBalloon(null);
                        }}
                        style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: '#ff0000',
                            color: 'white',
                            border: 'none',
                            fontSize: '18px',
                            cursor: 'pointer',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ×
                    </button>

                    <h4 style={{
                        margin: '0 0 12px 0',
                        color: '#333',
                        fontSize: '16px',
                        fontWeight: 'bold'
                    }}>
                        {customBalloon.parking.name || 'Парковка'}
                    </h4>

                    {customBalloon.parking.address && (
                        <p style={{ margin: '8px 0', color: '#666', lineHeight: '1.4' }}>
                            <strong>📍 Адрес:</strong> {customBalloon.parking.address}
                        </p>
                    )}

                    {customBalloon.parking.capacity > 0 && (
                        <p style={{ margin: '8px 0', color: '#666', lineHeight: '1.4' }}>
                            <strong>🚗 Мест:</strong> {customBalloon.parking.available_spots}/{customBalloon.parking.capacity}
                        </p>
                    )}

                    {customBalloon.parking.distance !== undefined && customBalloon.parking.distance !== null && (
                        <p style={{ margin: '8px 0', color: '#666', lineHeight: '1.4' }}>
                            <strong>📏 Расстояние:</strong> {Math.round(customBalloon.parking.distance)} м
                        </p>
                    )}

                    <div style={{ marginTop: '15px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                console.log('✅ Выбираем парковку:', customBalloon.parking.name);
                                if (onParkingSelect) {
                                    onParkingSelect(customBalloon.parking);
                                }
                                setCustomBalloon(null);
                            }}
                            style={{
                                background: '#007bff',
                                color: 'white',
                                border: 'none',
                                padding: '10px 15px',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 'bold'
                            }}
                        >
                            Выбрать
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                console.log('🗺️ Открываем маршрут к:', customBalloon.parking.name);
                                window.routeToParking(customBalloon.parking.id);
                                setCustomBalloon(null);
                            }}
                            style={{
                                background: '#28a745',
                                color: 'white',
                                border: 'none',
                                padding: '10px 15px',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 'bold'
                            }}
                        >
                            Маршрут
                        </button>
                    </div>

                    {/* Указательная стрелка */}
                    <div style={{
                        position: 'absolute',
                        bottom: '-10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '0',
                        height: '0',
                        borderLeft: '10px solid transparent',
                        borderRight: '10px solid transparent',
                        borderTop: '10px solid #ff0000'
                    }}></div>
                </div>
            )}

            {/* Отладочная информация о состоянии
            {customBalloon && (
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    padding: '8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    zIndex: 10000,
                    fontFamily: 'monospace'
                }}>
                    🔍 БАЛУН АКТИВЕН<br/>
                    Парковка: {customBalloon.parking.name}<br/>
                    X: {Math.round(customBalloon.x)} Y: {Math.round(customBalloon.y)}<br/>
                    {new Date().toLocaleTimeString()}
                </div>
            )} */}
        </div>
    );
};

export default YandexMap;
import React, { useEffect, useRef, useState } from 'react';

const YandexMap = ({ parkings, onParkingSelect, selectedParking, onNearbySearch }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const [mapReady, setMapReady] = useState(false);
    const [searchMarker, setSearchMarker] = useState(null);
    const [nearbyMode, setNearbyMode] = useState(false);

    useEffect(() => {
        // Инициализация карты
        if (window.ymaps && !mapInstanceRef.current) {
            window.ymaps.ready(() => {
                const map = new window.ymaps.Map(mapRef.current, {
                    center: [55.76, 37.64], // Москва по умолчанию
                    zoom: 12,
                    controls: ['zoomControl', 'fullscreenControl', 'geolocationControl']
                });

                // Обработчик клика по карте
                map.events.add('click', (e) => {
                    if (nearbyMode) {
                        const coords = e.get('coords');
                        handleMapClick(coords);
                    }
                });

                // Изменение курсора в зависимости от режима
                map.events.add('mousemove', () => {
                    const container = map.container.getElement(); // Получаем DOM-элемент карты
                    if (nearbyMode) {
                        container.style.cursor = 'crosshair';
                    } else {
                        container.style.cursor = 'grab';
                    }
                });

                mapInstanceRef.current = map;
                setMapReady(true);
            });
        }
    }, [nearbyMode]);

    useEffect(() => {
        if (mapReady && mapInstanceRef.current) {
            updateParkingsOnMap();
        }
    }, [parkings, mapReady, selectedParking]);

    const handleMapClick = (coords) => {
        const [longitude, latitude] = coords;

        // Добавляем маркер места поиска
        addSearchMarker([longitude, latitude]);

        // Вызываем поиск ближайших парковок
        if (onNearbySearch) {
            onNearbySearch({
                lat: latitude,
                lng: longitude
            });
        }
    };

    const addSearchMarker = (coords) => {
        const map = mapInstanceRef.current;

        // Удаляем предыдущий маркер поиска
        if (searchMarker) {
            map.geoObjects.remove(searchMarker);
        }

        // Создаем новый маркер
        const marker = new window.ymaps.Placemark(coords, {
            balloonContentHeader: 'Поиск парковок',
            balloonContentBody: 'Ищем ближайшие парковки в этом районе...',
        }, {
            preset: 'islands#redSearchIcon',
            iconColor: '#ff6b6b'
        });

        map.geoObjects.add(marker);
        setSearchMarker(marker);
    };

    const toggleNearbyMode = () => {
        setNearbyMode(!nearbyMode);

        // Очищаем маркер поиска при выходе из режима
        if (nearbyMode && searchMarker) {
            mapInstanceRef.current.geoObjects.remove(searchMarker);
            setSearchMarker(null);
        }
    };

const updateParkingsOnMap = () => {
    const map = mapInstanceRef.current;

    // Удаляем все объекты из `geoObjects`, кроме маркера поиска
    map.geoObjects.each((object) => {
        if (object !== searchMarker) {
            map.geoObjects.remove(object);
        }
    });

    // Создание коллекции для новых парковок
    const collection = new window.ymaps.GeoObjectCollection();
    const bounds = [];

    parkings.forEach((parking) => {
        if (parking.coordinates && parking.coordinates.lat && parking.coordinates.lng) {
            const coords = [parking.coordinates.lat, parking.coordinates.lng];
            bounds.push(coords);

            let color = '#1e98ff'; // Цвет по умолчанию

            // Убираем логику, основанную на свободных местах
            if (parking.blocked) {
                color = '#808080'; // Серый для заблокированных парковок
            }

            // Создаем метку
            const placemark = new window.ymaps.Placemark(coords, {
                balloonContentHeader: parking.name || 'Парковка',
                balloonContentBody: `
        <div>
            <p><strong>Адрес:</strong> ${parking.address || 'Не указан'}</p>
            ${parking.subway ? `<p><strong>Метро:</strong> ${parking.subway}</p>` : ''}
            ${parking.zone_number ? `<p><strong>Зона:</strong> ${parking.zone_number}</p>` : ''}
            ${parking.blocked ? '<p style="color: red;"><strong>⚠️ Заблокирована</strong></p>' : ''}
        </div>
    `,
                balloonContentFooter: `
        <button onclick="window.selectParking('${parking.id}')" 
                style="margin-right: 8px; padding: 8px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Выбрать
        </button>
        <button onclick="window.routeToParking('${parking.id}')" 
                style="padding: 8px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Маршрут
        </button>
    `
            }, {
                preset: 'islands#circleIcon',
                // Здесь убрано использование 'available'
                iconCaption: parking.blocked ? '🚫' : ''
            });

            // Выделение выбранной парковки
            if (selectedParking && selectedParking.id === parking.id) {
                placemark.options.set('iconColor', '#ff1493'); // Розовый для выбранной
                placemark.options.set('iconCaption', '★');
            }

            // Добавление события клика на метку
            placemark.events.add('click', () => {
                onParkingSelect && onParkingSelect(parking);
            });

            collection.add(placemark);
        }
    });

    map.geoObjects.add(collection);

    // Установка границ карты по всем меткам (если отсутствует маркер поиска)
    if (bounds.length > 0 && !searchMarker) {
        map.setBounds(bounds, {
            checkZoomRange: true,
            zoomMargin: 30
        }).then(() => {
            if (map.getZoom() > 16) {
                map.setZoom(16);
            }
        });
    }
};

    // Глобальные функции для кнопок в балунах
    useEffect(() => {
        window.selectParking = (parkingId) => {
            const parking = parkings.find(p => p.id === parkingId);
            if (parking && onParkingSelect) {
                onParkingSelect(parking);
            }
        };

        window.routeToParking = (parkingId) => {
            const parking = parkings.find(p => p.id === parkingId);
            if (parking && parking.coordinates) {
                const url = `https://yandex.ru/maps/?rtext=~${parking.coordinates.lat},${parking.coordinates.lng}&rtt=auto`;
                window.open(url, '_blank');
            }
        };

        return () => {
            delete window.selectParking;
            delete window.routeToParking;
        };
    }, [parkings, onParkingSelect]);

    return (
        <div className="map-container">
            <div className="map-controls">
                <button
                    className={`nearby-btn ${nearbyMode ? 'active' : ''}`}
                    onClick={toggleNearbyMode}
                    title={nearbyMode ? 'Выйти из режима поиска' : 'Найти парковки рядом с точкой на карте'}
                >
                    {nearbyMode ? '❌ Отменить поиск' : ' Найти рядом'}
                </button>

                {nearbyMode && (
                    <div className="nearby-hint">
                        <span> Кликните на карту, чтобы найти ближайшие парковки</span>
                    </div>
                )}
            </div>

            <div
                ref={mapRef}
                className={`yandex-map ${nearbyMode ? 'search-mode' : ''}`}
                style={{ width: '100%', height: '500px' }}
            />

            <div className="map-legend">
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#32cd32' }}></span>
                    Много свободных мест
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#ff8c00' }}></span>
                    Мало свободных мест
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#ff1e1e' }}></span>
                    Нет свободных мест
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#808080' }}></span>
                    Заблокирована
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#1e98ff' }}></span>
                    Информация недоступна
                </div>
                {searchMarker && (
                    <div className="legend-item">
                        <span className="legend-color" style={{ backgroundColor: '#ff6b6b' }}></span>
                        Точка поиска
                    </div>
                )}
            </div>
        </div>
    );
};

export default YandexMap;
import React from 'react';

const ParkingDetails = ({ parking, onClose }) => {
    const handleRouteClick = () => {
        if (parking.coordinates) {
            const url = `https://yandex.ru/maps/?rtext=~${parking.coordinates.lat},${parking.coordinates.lng}&rtt=auto`;
            window.open(url, '_blank');
        }
    };

    const handleShareClick = () => {
        if (navigator.share) {
            navigator.share({
                title: parking.name,
                text: `Парковка: ${parking.name}\nАдрес: ${parking.address}`,
                url: window.location.href
            });
        } else {
            // Fallback для браузеров без поддержки Web Share API
            navigator.clipboard.writeText(`${parking.name} - ${parking.address}`);
            alert('Информация скопирована в буфер обмена');
        }
    };

    return (
        <div className="parking-details">
            <div className="details-header">
                <h2>{parking.name || 'Парковка'}</h2>
                <button onClick={onClose} className="close-btn" title="Закрыть">✕</button>
            </div>

            <div className="details-content">
                <div className="detail-item">
                    <strong> Адрес:</strong>
                    <p>{parking.address || 'Не указан'}</p>
                </div>

                {parking.subway && (
                    <div className="detail-item">
                        <strong> Ближайшее метро:</strong>
                        <p>{parking.subway}</p>
                    </div>
                )}

                {parking.zone_number && (
                    <div className="detail-item">
                        <strong>️ Номер зоны:</strong>
                        <p>{parking.zone_number}</p>
                    </div>
                )}

                {parking.coordinates && (
                    <div className="detail-item">
                        <strong> Координаты:</strong>
                        <p>{parking.coordinates.lat.toFixed(6)}, {parking.coordinates.lng.toFixed(6)}</p>
                    </div>
                )}

                {parking.capacity && (
                    <div className="detail-item">
                        <strong> Вместимость:</strong>
                        <p>{parking.capacity} мест</p>
                    </div>
                )}

                {/*
{parking.available_spots !== undefined && (
    <div className="detail-item">
        <strong> Свободные места:</strong>
        <p className={parking.available_spots > 0 ? 'available' : 'full'}>
            {parking.available_spots} мест
        </p>
    </div>
)}
*/}

                {parking.distance !== undefined && (
                    <div className="detail-item">
                        <strong> Расстояние:</strong>
                        <p className="distance-value">{parking.distance.toFixed(2)} км от точки поиска</p>
                    </div>
                )}

                {parking.price_info && (
                    <div className="detail-item">
                        <strong> Стоимость:</strong>
                        <div
                            className="price-info"
                            dangerouslySetInnerHTML={{ __html: parking.price_info }}
                        />
                    </div>
                )}

                {parking.blocked && (
                    <div className="detail-item warning">
                        <strong>⚠️ Статус:</strong>
                        <p className="blocked-text">Парковка временно заблокирована</p>
                    </div>
                )}

                <div className="detail-actions">
                    <button
                        className="action-btn route-btn"
                        onClick={handleRouteClick}
                        disabled={!parking.coordinates}
                    >
                        Построить маршрут
                    </button>
                    <button
                        className="action-btn share-btn"
                        onClick={handleShareClick}
                    >
                        Поделиться
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ParkingDetails;
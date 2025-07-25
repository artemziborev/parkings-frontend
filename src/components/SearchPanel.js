import React, { useState } from 'react';

const SearchPanel = ({ onSearch, onClearSearch, isSearching }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        // Удаляем "onlyAvailable"
        maxDistance: '',
        userLocation: null
    });
    const [gettingLocation, setGettingLocation] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();

        // Передаем текстовый запрос для поиска по названию парковки
        onSearch({ 
            query: searchQuery, 
            filters 
        });
    };

    const handleClear = () => {
        setSearchQuery('');
        setFilters({
    // Удаляем "onlyAvailable"
            maxDistance: '',
            userLocation: null
        });
        onClearSearch();
    };

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            setGettingLocation(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setFilters({
                        ...filters,
                        userLocation: location
                    });
                    setGettingLocation(false);

                    // Показываем уведомление об успешном получении локации
                    console.log('Местоположение получено:', location);
                },
                (error) => {
                    console.error('Ошибка получения геолокации:', error);
                    setGettingLocation(false);

                    let errorMessage = 'Не удалось получить текущее местоположение';
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Доступ к геолокации запрещен';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Местоположение недоступно';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Время ожидания геолокации истекло';
                            break;
                    }
                    alert(errorMessage);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 минут
                }
            );
        } else {
            alert('Геолокация не поддерживается вашим браузером');
        }
    };

    return (
        <div className="search-panel">
            <form onSubmit={handleSearch} className="search-form">
                <div className="search-input-group">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Поиск по адресу, названию, номеру зоны..."
                        className="search-input"
                    />
                    <button
                        type="submit"
                        disabled={isSearching}
                        className="search-btn"
                    >
                        {isSearching ? '' : ''} Поиск
                    </button>
                    <button
                        type="button"
                        onClick={handleClear}
                        className="clear-btn"
                    >
                        ✕ Очистить
                    </button>
                </div>

                <div className="filters">
                    {/*
<label className="filter-checkbox">
    <input
        type="checkbox"
        checked={filters.onlyAvailable}
        onChange={(e) => setFilters({
            ...filters,
            onlyAvailable: e.target.checked
        })}
    />
    Только со свободными местами
</label>
*/}

                    <div className="distance-filter">
                        <input
                            type="number"
                            value={filters.maxDistance}
                            onChange={(e) => setFilters({
                                ...filters,
                                maxDistance: e.target.value
                            })}
                            placeholder="Радиус (км)"
                            className="distance-input"
                            min="0.1"
                            max="50"
                            step="0.1"
                        />
                        <button
                            type="button"
                            onClick={getCurrentLocation}
                            disabled={gettingLocation}
                            className={`location-btn ${filters.userLocation ? 'active' : ''}`}
                            title={filters.userLocation ? 'Местоположение получено' : 'Получить текущее местоположение'}
                        >
                            {gettingLocation ? '' : filters.userLocation ? '✓' : ''}
                        </button>
                    </div>

                    {filters.userLocation && (
                        <div className="location-info">
                            Ваше местоположение: {filters.userLocation.lat.toFixed(4)}, {filters.userLocation.lng.toFixed(4)}
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
};

export default SearchPanel;
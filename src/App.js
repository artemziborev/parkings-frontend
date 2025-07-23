import React, { useState, useEffect } from 'react';
import axios from 'axios';
import YandexMap from './components/YandexMap';
import SearchPanel from './components/SearchPanel';
import ParkingDetails from './components/ParkingDetails';
import './App.css';

const API_BASE_URL = 'http://localhost:3487'; // Замените на URL вашего API

function App() {
  const [parkings, setParkings] = useState([]);
  const [filteredParkings, setFilteredParkings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [selectedParking, setSelectedParking] = useState(null);
  const [viewMode, setViewMode] = useState('map'); // 'map' или 'list'

  useEffect(() => {
    fetchParkings();
  }, []);

const fetchParkings = async () => {
    try {
        setLoading(true);

        // Обновленный URL для ручки
        const response = await axios.get('http://localhost:3847/api/v1/mos_parking/parking');

        const processedParkings = response.data.parkings.map(parking => ({
            id: parking._id,
            name: parking.name?.ru || `Парковка №${parking.zone?.number || parking._id}`,
            address: `${parking.address?.street?.ru || ''} ${parking.address?.house?.ru || ''}`.trim(),
            coordinates: parking.center ? {
                lat: parking.center.coordinates[1],
                lng: parking.center.coordinates[0]
            } : null,
            capacity: parking.spaces?.total || 0,
            available_spots: parking.spaces?.common || 0,
            zone_number: parking.zone?.number,
            subway: parking.subway?.ru,
            price_info: parking.zone?.description?.ru,
            category: parking.category?.iconName,
            blocked: parking.blocked,
            raw: parking
        }));

        setParkings(processedParkings);
        setFilteredParkings(processedParkings);
        setError(null);
    } catch (err) {
        setError('Ошибка при загрузке данных');
        console.error('Error fetching parkings:', err);
    } finally {
        setLoading(false);
    }
};

  const handleSearch = async ({ query, filters }) => {
    setSearching(true);

    try {
      let filtered = [...parkings];

      // Фильтр по тексту
      if (query.trim()) {
        const searchTerm = query.toLowerCase();
        filtered = filtered.filter(parking =>
            parking.name.toLowerCase().includes(searchTerm) ||
            parking.address.toLowerCase().includes(searchTerm) ||
            (parking.zone_number && parking.zone_number.includes(searchTerm)) ||
            (parking.subway && parking.subway.toLowerCase().includes(searchTerm))
        );
      }

      // Фильтр только свободные
      if (filters.onlyAvailable) {
        filtered = filtered.filter(parking =>
            !parking.blocked && parking.available_spots > 0
        );
      }

      // Фильтр по расстоянию
      if (filters.maxDistance && filters.userLocation && parseFloat(filters.maxDistance) > 0) {
        const maxDistanceKm = parseFloat(filters.maxDistance);
        filtered = filtered.filter(parking => {
          if (!parking.coordinates) return false;

          const distance = calculateDistance(
              filters.userLocation.lat,
              filters.userLocation.lng,
              parking.coordinates.lat,
              parking.coordinates.lng
          );

          return distance <= maxDistanceKm;
        });

        // Сортируем по расстоянию
        filtered.sort((a, b) => {
          const distanceA = calculateDistance(
              filters.userLocation.lat,
              filters.userLocation.lng,
              a.coordinates.lat,
              a.coordinates.lng
          );
          const distanceB = calculateDistance(
              filters.userLocation.lat,
              filters.userLocation.lng,
              b.coordinates.lat,
              b.coordinates.lng
          );
          return distanceA - distanceB;
        });
      }

      setFilteredParkings(filtered);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = () => {
    setFilteredParkings(parkings);
    setSelectedParking(null);
  };

  const handleNearbySearch = (clickCoords, radiusKm = 2) => {
    setSearching(true);

    try {
      // Фильтруем парковки в радиусе от клика
      const nearby = parkings.filter(parking => {
        if (!parking.coordinates) return false;

        const distance = calculateDistance(
            clickCoords.lat,
            clickCoords.lng,
            parking.coordinates.lat,
            parking.coordinates.lng
        );

        return distance <= radiusKm;
      });

      // Сортируем по расстоянию
      nearby.sort((a, b) => {
        const distanceA = calculateDistance(
            clickCoords.lat,
            clickCoords.lng,
            a.coordinates.lat,
            a.coordinates.lng
        );
        const distanceB = calculateDistance(
            clickCoords.lat,
            clickCoords.lng,
            b.coordinates.lat,
            b.coordinates.lng
        );
        return distanceA - distanceB;
      });

      // Добавляем информацию о расстоянии
      const nearbyWithDistance = nearby.map(parking => ({
        ...parking,
        distance: calculateDistance(
            clickCoords.lat,
            clickCoords.lng,
            parking.coordinates.lat,
            parking.coordinates.lng
        )
      }));

      setFilteredParkings(nearbyWithDistance);

      // Автоматически выбираем ближайшую парковку
      if (nearbyWithDistance.length > 0) {
        setSelectedParking(nearbyWithDistance[0]);
      }

    } catch (err) {
      console.error('Nearby search error:', err);
    } finally {
      setSearching(false);
    }
  };

  // Вычисление расстояния между координатами (формула гаверсинусов)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Радиус Земли в км
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleParkingSelect = (parking) => {
    setSelectedParking(parking);
  };

  if (loading) {
    return (
        <div className="App">
          <div className="loading">
            <div className="spinner"></div>
            Загрузка данных о парковках...
          </div>
        </div>
    );
  }

  return (
      <div className="App">
        <header className="App-header">
          <h1>Поиск парковок в Москве</h1>
          <div className="view-toggle">
            <button
                className={viewMode === 'map' ? 'active' : ''}
                onClick={() => setViewMode('map')}>
              ️ Карта
            </button>
            <button
                className={viewMode === 'list' ? 'active' : ''}
                onClick={() => setViewMode('list')}>
              Список
            </button>
          </div>
        </header>

        <SearchPanel
            onSearch={handleSearch}
            onClearSearch={handleClearSearch}
            isSearching={searching}
        />

        <div className="results-info">
          <p>
            Найдено парковок: <strong>{filteredParkings.length}</strong> из {parkings.length}
            {selectedParking && (
                <span className="selected-info">
              {' '} | Выбрана: {selectedParking.name}
            </span>
            )}
          </p>
        </div>

        {error && (
            <div className="error">
              {error}
              <button onClick={fetchParkings}>Повторить</button>
            </div>
        )}

        <main className="main-content">
          <div className={`content-layout ${selectedParking ? 'with-details' : ''}`}>
            <div className="map-section">
              {viewMode === 'map' ? (
                  <YandexMap
                      parkings={filteredParkings}
                      onParkingSelect={handleParkingSelect}
                      selectedParking={selectedParking}
                      onNearbySearch={handleNearbySearch}
                  />
              ) : (
                  <ParkingList
                      parkings={filteredParkings}
                      onParkingSelect={handleParkingSelect}
                      selectedParking={selectedParking}
                  />
              )}
            </div>

            {selectedParking && (
                <div className="details-section">
                  <ParkingDetails
                      parking={selectedParking}
                      onClose={() => setSelectedParking(null)}
                  />
                </div>
            )}
          </div>
        </main>
      </div>
  );
}

// Компонент списка парковок
function ParkingList({ parkings, onParkingSelect, selectedParking }) {
  if (parkings.length === 0) {
    return (
        <div className="no-data">
          <div className="no-data-icon"></div>
          <h3>Парковки не найдены</h3>
          <p>Попробуйте изменить параметры поиска или кликните на карту</p>
        </div>
    );
  }

  return (
      <div className="parking-list">
        <div className="parking-grid">
          {parkings.map((parking, index) => (
              <div
                  key={parking.id}
                  className={`parking-card ${selectedParking?.id === parking.id ? 'selected' : ''} ${parking.blocked ? 'blocked' : ''}`}
                  onClick={() => onParkingSelect(parking)}
              >
                {parking.distance !== undefined && (
                    <div className={`distance-info ${index === 0 ? 'closest' : ''}`}>
                      {parking.distance.toFixed(1)} км
                    </div>
                )}

                <div className="card-header">
                  <h3>{parking.name}</h3>
                  {parking.zone_number && (
                      <span className="zone-badge">Зона {parking.zone_number}</span>
                  )}
                  {index === 0 && parking.distance !== undefined && (
                      <span className="closest-badge">Ближайшая</span>
                  )}
                </div>

                <div className="parking-info">
                  <p><strong> Адрес:</strong> {parking.address || 'Не указан'}</p>

                  {parking.subway && (
                      <p><strong> Метро:</strong> {parking.subway}</p>
                  )}

                  {parking.capacity > 0 && (
                      <p className="capacity-info">
                        <strong> Мест:</strong>
                        <span className={parking.available_spots > 0 ? 'available' : 'full'}>
                    {parking.available_spots}/{parking.capacity}
                  </span>
                      </p>
                  )}

                  {parking.blocked && (
                      <p className="blocked-status">⚠️ Парковка заблокирована</p>
                  )}
                </div>
              </div>
          ))}
        </div>
      </div>
  );
}

export default App;
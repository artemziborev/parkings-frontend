import React, { useState, useEffect } from 'react';
import axios from 'axios';
import YandexMap from './components/YandexMap';
import SearchPanel from './components/SearchPanel';
import ParkingDetails from './components/ParkingDetails';
import './App.css';

const API_BASE_URL = 'http://localhost:3847'; // URL бэкенд API

function App() {
  const [parkings, setParkings] = useState([]);
  const [filteredParkings, setFilteredParkings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [selectedParking, setSelectedParking] = useState(null);
  const [viewMode, setViewMode] = useState('map'); // 'map' или 'list'

  useEffect(() => {
    // Пытаемся получить геолокацию пользователя
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          fetchParkings(userLocation);
        },
        (error) => {
          console.log('Геолокация недоступна, используем координаты центра Москвы');
          fetchParkings(); // Загружаем с дефолтными координатами
        }
      );
    } else {
      fetchParkings(); // Загружаем с дефолтными координатами
    }
  }, []);

const fetchParkings = async (userLocation = null) => {
    try {
        setLoading(true);
        setError(null); // Очищаем предыдущие ошибки

        let lat, long;
        
        if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
            lat = userLocation.lat;
            long = userLocation.lng;
        } else {
            // Используем координаты центра Москвы по умолчанию
            lat = 55.7558;
            long = 37.6176;
        }

        // Добавляем обязательные query параметры
        const queryParams = new URLSearchParams({
            lat: lat.toString(),
            long: long.toString(),
            limit: '100',          // Лимит на количество парковок
            distance: '50000'      // Радиус поиска в метрах (50км)
        });

        const response = await axios.get(`${API_BASE_URL}/api/v1/mos_parking/parking?${queryParams}`);

        // Проверяем ответ API
        if (!response.data || !Array.isArray(response.data.parkings)) {
          throw new Error('Некорректный ответ от API');
        }

        const processedParkings = response.data.parkings.map(parking => ({
            id: parking.id || Math.random(), // Fallback ID если отсутствует
            name: parking.parking_name || `Парковка №${parking.parking_number || parking.id || 'без номера'}`,
            address: `${parking.street || ''} ${parking.house || ''}`.trim() || 'Адрес не указан',
            coordinates: (parking.latitude && parking.longitude && 
                         typeof parking.latitude === 'number' && typeof parking.longitude === 'number') ? {
                lat: parking.latitude,
                lng: parking.longitude
            } : null, // Теперь координаты доступны из API
            capacity: parking.total_spaces || 0,
            available_spots: parking.total_spaces || 0, // В новом API нет отдельного поля для свободных мест
            zone_number: parking.parking_number || null,
            subway: null, // Недоступно в новом API
            price_info: null, // Недоступно в новом API
            category: null, // Недоступно в новом API
            blocked: false, // По умолчанию считаем не заблокированными
            distance: typeof parking.distance_meters === 'number' ? parking.distance_meters : null, // Расстояние в метрах
            raw: parking
        }));

        console.log('Загружено парковок:', processedParkings.length);
        setParkings(processedParkings);
        setFilteredParkings(processedParkings);
    } catch (err) {
        console.error('Ошибка загрузки данных:', err);
        if (err.response && err.response.status === 500) {
          setError('Ошибка сервера. Попробуйте позднее.');
        } else if (err.response && err.response.status === 404) {
          setError('API недоступно. Проверьте что backend запущен.');
        } else {
          setError('Ошибка загрузки данных. Проверьте подключение к интернету и что backend запущен на порту 3847.');
        }
    } finally {
        setLoading(false);
    }
};

  const handleSearch = async ({ query, filters }) => {
    console.log('🔍 Поиск:', query, filters);
    setSearching(true);
    setError(null); // Очищаем предыдущие ошибки

    try {
      // Если есть текстовый запрос, делаем поиск по API
      if (query && query.trim().length > 0) {
        const searchUrl = `${API_BASE_URL}/api/v1/mos_parking/parking/search?query=${encodeURIComponent(query.trim())}`;
        console.log('🌐 Поиск по API:', searchUrl);
        
        const response = await axios.get(searchUrl);

        // Проверяем ответ API
        if (!response.data || !Array.isArray(response.data.parkings)) {
          throw new Error('Некорректный ответ от API поиска');
        }

        const searchedParkings = response.data.parkings.map(parking => ({
            id: parking.id || Math.random(), // Fallback ID если отсутствует
            name: parking.parking_name || `Парковка №${parking.parking_number || parking.id || 'без номера'}`,
            address: `${parking.street || ''} ${parking.house || ''}`.trim() || 'Адрес не указан',
            coordinates: (parking.latitude && parking.longitude && 
                         typeof parking.latitude === 'number' && typeof parking.longitude === 'number') ? {
                lat: parking.latitude,
                lng: parking.longitude
            } : null, // Теперь координаты доступны из API
            capacity: parking.total_spaces || 0,
            available_spots: parking.total_spaces || 0,
            zone_number: parking.parking_number || null,
            subway: null,
            price_info: null,
            category: null,
            blocked: false,
            distance: typeof parking.distance_meters === 'number' ? parking.distance_meters : null,
            raw: parking
          }));

        console.log(`✅ Найдено по запросу "${query}":`, searchedParkings.length);
        setFilteredParkings(searchedParkings);
      } else {
        // Иначе фильтруем локально
        let filtered = [...(parkings || [])]; // Защита от undefined

        // Фильтр только свободные
        if (filters && filters.onlyAvailable) {
          filtered = filtered.filter(parking =>
              parking && !parking.blocked && parking.available_spots > 0
          );
        }

        // Фильтр по расстоянию (если есть расстояние от API)
        if (filters && filters.maxDistance && parseFloat(filters.maxDistance) > 0) {
          const maxDistanceKm = parseFloat(filters.maxDistance) * 1000; // конвертируем в метры
          
          // Используем расстояние из API
          filtered = filtered.filter(parking => {
            return parking && parking.distance !== undefined && parking.distance !== null && parking.distance <= maxDistanceKm;
          });

          // Сортируем по расстоянию (расстояние уже рассчитано на бэкенде)
          filtered.sort((a, b) => {
            const distanceA = (a && typeof a.distance === 'number') ? a.distance : Infinity;
            const distanceB = (b && typeof b.distance === 'number') ? b.distance : Infinity;
            return distanceA - distanceB;
          });
        }

        setFilteredParkings(filtered);
      }
    } catch (err) {
      console.error('❌ Ошибка поиска:', err);
      if (err.response && err.response.status === 404) {
        const searchTerm = (query && query.trim()) || 'запросу';
        setError(`По запросу "${searchTerm}" ничего не найдено. Попробуйте: "охотный", "парковка", "кутузовский"`);
        setFilteredParkings([]);
      } else {
        setError('Ошибка при поиске парковок. Проверьте подключение к интернету.');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = () => {
    setFilteredParkings(parkings);
    setSelectedParking(null);
  };

  const handleNearbySearch = async (clickCoords) => {
    console.log('🎯 Поиск ближайших парковок для координат:', clickCoords);
    setSearching(true);
    setError(null); // Очищаем предыдущие ошибки

    try {
      // Проверяем корректность координат
      if (!clickCoords || typeof clickCoords.lat !== 'number' || typeof clickCoords.lng !== 'number') {
        throw new Error('Некорректные координаты для поиска');
      }

      // Делаем запрос к API для поиска парковок в радиусе 200м с лимитом 5
      const queryParams = new URLSearchParams({
        lat: clickCoords.lat.toString(),
        long: clickCoords.lng.toString(),
        limit: '5',        // Лимит 5 парковок
        distance: '200'    // Радиус 200 метров (~2-3 минуты пешком)
      });

      const apiUrl = `${API_BASE_URL}/api/v1/mos_parking/parking?${queryParams}`;
      console.log('📡 Запрос API:', apiUrl);
      
      const response = await axios.get(apiUrl);

      // Проверяем ответ API
      if (!response.data || !Array.isArray(response.data.parkings)) {
        throw new Error('Некорректный ответ от API');
      }

      const nearbyParkings = response.data.parkings.map(parking => ({
        id: parking.id || Math.random(), // Fallback ID если отсутствует
        name: parking.parking_name || `Парковка №${parking.parking_number || parking.id || 'без номера'}`,
        address: `${parking.street || ''} ${parking.house || ''}`.trim() || 'Адрес не указан',
        coordinates: (parking.latitude && parking.longitude && 
                     typeof parking.latitude === 'number' && typeof parking.longitude === 'number') ? {
            lat: parking.latitude,
            lng: parking.longitude
        } : null, // Теперь координаты доступны из API
        capacity: parking.total_spaces || 0,
        available_spots: parking.total_spaces || 0,
        zone_number: parking.parking_number || null,
        subway: null,
        price_info: null,
        category: null,
        blocked: false,
        distance: typeof parking.distance_meters === 'number' ? parking.distance_meters : null, // Расстояние в метрах от точки клика
        raw: parking
      }));

      console.log('✅ Найдено парковок:', nearbyParkings.length);
      setFilteredParkings(nearbyParkings);

      // Автоматически выбираем ближайшую парковку
      if (nearbyParkings.length > 0) {
        setSelectedParking(nearbyParkings[0]);
        console.log('🎯 Выбрана ближайшая:', nearbyParkings[0].name);
      } else {
        console.log('😞 Парковки не найдены в радиусе 200м');
        setError('В радиусе 200 метров от выбранной точки парковки не найдены');
      }

    } catch (err) {
      console.error('❌ Ошибка поиска ближайших парковок:', err);
      if (err.response && err.response.status === 404) {
        setError('В радиусе 200 метров от выбранной точки парковки не найдены');
        setFilteredParkings([]);
      } else {
        setError('Ошибка при поиске ближайших парковок. Проверьте подключение к интернету.');
      }
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
          <img
            src="/maskot.png"
            alt="Maskot"
            className="header-maskot"
          />
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
                <div className="card-header">
                  <div className="title-section">
                    <h3>{parking.name}</h3>
                    {parking.zone_number && (
                        <span className="zone-badge">Зона {parking.zone_number}</span>
                    )}
                  </div>
                  <div className="badges-group">
                    {parking.distance !== undefined && (
                        <span className={`distance-badge ${index === 0 ? 'closest' : ''}`}>
                          {Math.round(parking.distance)} м
                        </span>
                    )}
                    {index === 0 && parking.distance !== undefined && (
                        <span className="closest-badge">Ближайшая</span>
                    )}
                  </div>
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
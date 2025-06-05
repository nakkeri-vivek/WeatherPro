// OpenWeatherMap API configuration
const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY; // API key should be set in environment variables
const API_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const GEO_API_URL = 'https://api.openweathermap.org/geo/1.0/direct';

// DOM elements
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error-message');
const weatherDiv = document.getElementById('weather-info');
const favoriteBtn = document.getElementById('favorite-btn');
const favoritesList = document.getElementById('favorites-list');
const unitBtns = document.querySelectorAll('.unit-btn');

// Modal elements
const locationModal = document.getElementById('location-modal');
const locationList = document.getElementById('location-list');
const modalClose = document.getElementById('modal-close');

// Weather display elements
const cityName = document.getElementById('city-name');
const countryEl = document.getElementById('country');
const currentDateEl = document.getElementById('current-date');
const weatherIcon = document.getElementById('weather-icon');
const temperature = document.getElementById('temperature');
const description = document.getElementById('description');
const skyStatus = document.getElementById('sky-status');
const feelsLike = document.getElementById('feels-like');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('wind-speed');
const visibility = document.getElementById('visibility');
const pressure = document.getElementById('pressure');
const uvIndex = document.getElementById('uv-index');
const sunrise = document.getElementById('sunrise');
const sunset = document.getElementById('sunset');

// Additional DOM elements for coordinates search
const coordsModal = document.getElementById('coordinates-modal');
const coordsModalClose = document.getElementById('coords-modal-close');
const searchCoordsBtn = document.getElementById('search-coords');
const latitudeInput = document.getElementById('latitude');
const longitudeInput = document.getElementById('longitude');

// State
let isCelsius = true;
let currentTemp = 0;
let currentFeelsLike = 0;
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

// Event listeners
searchBtn.addEventListener('click', handleSearch);
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});
favoriteBtn.addEventListener('click', () => {
    const cityName = document.getElementById('city-name').textContent;
    toggleFavorite(cityName);
});
modalClose.addEventListener('click', hideLocationModal);
locationModal.addEventListener('click', (e) => {
    if (e.target === locationModal) {
        hideLocationModal();
    }
});

unitBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        unitBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        isCelsius = btn.dataset.unit === 'celsius';
        updateTemperatureDisplay();
    });
});

// Load last searched city and favorites
document.addEventListener('DOMContentLoaded', () => {
    const lastCity = localStorage.getItem('lastCity');
    if (lastCity) {
        cityInput.value = lastCity;
        handleSearch();
    }
    updateFavoritesList();
});

// Event listeners for coordinates modal
coordsModalClose.addEventListener('click', hideCoordinatesModal);
coordsModal.addEventListener('click', (e) => {
    if (e.target === coordsModal) {
        hideCoordinatesModal();
    }
});

searchCoordsBtn.addEventListener('click', handleCoordinatesSearch);

/**
 * Handle the search functionality
 */
async function handleSearch() {
    const query = cityInput.value.trim();
    if (!query) return;

    showLoading();
    try {
        const locations = await fetchLocations(query);
        
        if (locations.length === 0) {
            // No location found, show coordinates modal
            hideLoading();
            showCoordinatesModal(query);
        } else {
            // Location found, get weather data
            const weatherData = await fetchWeatherByCoords(locations[0]);
            // Store the original search query to display instead of API result
            weatherData.searchedName = query;
            displayWeatherData(weatherData);
            localStorage.setItem('lastCity', query);
        }
    } catch (error) {
        console.error('Search error:', error);
        showError(error.message);
    }
}

/**
 * Fetch locations from OpenWeatherMap Geocoding API
 */
async function fetchLocations(query) {
    try {
        const response = await fetch(
            `${GEO_API_URL}?q=${encodeURIComponent(query)}&limit=1&appid=${API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error('Failed to fetch location data');
        }

        const locations = await response.json();
        return locations;
    } catch (error) {
        console.error('Geocoding error:', error);
        throw new Error('Failed to search for location. Please try again.');
    }
}

/**
 * Fetch weather data using coordinates
 */
async function fetchWeatherByCoords(location) {
    try {
        const response = await fetch(
            `${API_BASE_URL}?lat=${location.lat}&lon=${location.lon}&appid=${API_KEY}&units=metric`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch weather data');
        }

        return await response.json();
    } catch (error) {
        console.error('Weather API error:', error);
        throw new Error('Failed to fetch weather data. Please try again.');
    }
}

/**
 * Hide location modal
 */
function hideLocationModal() {
    locationModal.classList.add('hidden');
    locationList.innerHTML = ''; // Clear the list
}

/**
 * Show warning when returned location doesn't match search
 */
function showLocationWarning(location, searchQuery) {
    const message = `
        <div class="location-warning">
            <p>
                <i class="fas fa-exclamation-triangle"></i>
                The exact location "${searchQuery}" wasn't found.
            </p>
            <p>Showing results for the nearest city: ${location.name}</p>
            <div class="location-warning-actions">
                <button onclick="confirmLocation(${location.lat}, ${location.lon}, '${location.name}')" class="warning-action-btn accept">
                    <i class="fas fa-check"></i> Use this location
                </button>
                <button onclick="showCoordinatesModal('${searchQuery}')" class="warning-action-btn search-coords">
                    <i class="fas fa-search"></i> Search by coordinates
                </button>
            </div>
        </div>
    `;
    
    errorDiv.innerHTML = message;
    errorDiv.classList.remove('hidden');
    weatherDiv.classList.add('hidden');
    hideLoading();
}

/**
 * Confirm and use the suggested location
 */
async function confirmLocation(lat, lon, name) {
    errorDiv.classList.add('hidden');
    showLoading();
    try {
        const weatherData = await fetchWeatherByCoords({ lat, lon });
        displayWeatherData(weatherData);
        localStorage.setItem('lastCity', name);
    } catch (error) {
        showError(error.message);
    }
}

/**
 * Show location selector modal
 */
function showLocationSelector(locations, searchQuery) {
    hideLoading();
    
    // Add a warning message if no exact matches
    const hasExactMatch = locations.some(loc => 
        loc.name.toLowerCase() === searchQuery.toLowerCase()
    );

    const warningHtml = !hasExactMatch ? `
        <div class="location-warning-header">
            <i class="fas fa-exclamation-triangle"></i>
            The exact location "${searchQuery}" wasn't found. Please select from these nearby locations:
        </div>
    ` : '';

    locationList.innerHTML = `
        ${warningHtml}
        ${locations.map(loc => {
            // Escape special characters in the name to prevent JS errors
            const escapedName = loc.name.replace(/'/g, "\\'");
            
            // Build detailed location information
            const details = [];
            if (loc.state) details.push(loc.state);
            if (loc.country) details.push(loc.country);
            
            // Add coordinates for better identification
            const coords = `${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)}`;
            
            // Add district and local names if available
            const localNames = loc.local_names ? 
                `<span class="location-detail location-local-names">
                    ${Object.entries(loc.local_names)
                        .filter(([lang]) => ['hi', 'te', 'native'].includes(lang))
                        .map(([lang, name]) => `${name} (${lang})`)
                        .join(', ')}
                </span>` : '';

            // Add distance from searched location if available
            const distanceInfo = loc.distance ? 
                `<span class="location-distance">
                    <i class="fas fa-route"></i> ${loc.distance.toFixed(1)} km away
                </span>` : '';

            return `
                <div class="location-option" onclick="selectLocation(${loc.lat}, ${loc.lon}, '${escapedName}')">
                    <div class="location-main-info">
                        <span class="location-name">${loc.name}</span>
                        <span class="location-detail">${details.join(', ')}</span>
                    </div>
                    ${localNames}
                    <div class="location-footer">
                        <span class="location-detail location-coords">
                            <i class="fas fa-map-marker-alt"></i> ${coords}
                        </span>
                        ${distanceInfo}
                    </div>
                </div>
            `;
        }).join('')}
    `;

    locationModal.classList.remove('hidden');
}

/**
 * Handle location selection from modal
 */
async function selectLocation(lat, lon, name) {
    hideLocationModal();
    showLoading();
    
    try {
        const weatherData = await fetchWeatherByCoords({ lat, lon });
        displayWeatherData(weatherData);
        localStorage.setItem('lastCity', name);
    } catch (error) {
        showError(error.message);
    }
}

/**
 * Display weather data in the UI
 */
function displayWeatherData(data) {
    currentTemp = data.main.temp;
    currentFeelsLike = data.main.feels_like;
    
    // Use searched name if available, otherwise use API returned name
    cityName.textContent = data.searchedName || data.name;
    countryEl.textContent = data.sys.country;
    currentDateEl.textContent = formatDate(new Date());
    
    // Update weather icon and description
    weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    description.textContent = data.weather[0].description;
    skyStatus.textContent = data.weather[0].main;
    
    // Update temperatures
    updateTemperatureDisplay();
    
    // Update weather details
    humidity.textContent = `${data.main.humidity}%`;
    windSpeed.textContent = `${(data.wind.speed * 3.6).toFixed(1)} km/h`;
    visibility.textContent = `${(data.visibility / 1000).toFixed(1)} km`;
    pressure.textContent = `${data.main.pressure} hPa`;
    
    // Update sunrise and sunset times
    sunrise.textContent = formatTime(data.sys.sunrise * 1000);
    sunset.textContent = formatTime(data.sys.sunset * 1000);
    
    // Set UV Index (Note: Basic API doesn't include UV Index)
    uvIndex.textContent = 'N/A';
    
    // Update favorite button
    updateFavoriteButton(data.searchedName || data.name);
    
    hideLoading();
    hideError();
    weatherDiv.classList.remove('hidden');
}

/**
 * Update temperature displays
 */
function updateTemperatureDisplay() {
    temperature.textContent = formatTemperature(currentTemp);
    feelsLike.textContent = formatTemperature(currentFeelsLike);
    document.querySelectorAll('.unit').forEach(el => {
        el.textContent = isCelsius ? '°C' : '°F';
    });
}

/**
 * Format temperature based on selected unit
 * @param {number} temp - Temperature in Celsius
 * @returns {string} Formatted temperature
 */
function formatTemperature(temp) {
    if (!isCelsius) {
        temp = (temp * 9/5) + 32;
    }
    return Math.round(temp);
}

/**
 * Format date to display
 */
function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Format time to display
 */
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Update favorite button icon and class
 */
function updateFavoriteButton(cityName) {
    const isFavorite = favorites.some(city => city.toLowerCase() === cityName.toLowerCase());
    const favoriteBtn = document.getElementById('favorite-btn');
    const favoriteIcon = favoriteBtn.querySelector('i');
    
    if (isFavorite) {
        favoriteIcon.classList.remove('far');
        favoriteIcon.classList.add('fas');
        favoriteBtn.classList.add('active');
    } else {
        favoriteIcon.classList.remove('fas');
        favoriteIcon.classList.add('far');
        favoriteBtn.classList.remove('active');
    }
}

/**
 * Toggle favorite status
 */
function toggleFavorite(cityName) {
    const lowercaseCityName = cityName.toLowerCase();
    const index = favorites.findIndex(city => city.toLowerCase() === lowercaseCityName);
    
    if (index === -1) {
        // Add to favorites
        favorites.push(cityName);
    } else {
        // Remove from favorites
        favorites.splice(index, 1);
    }
    
    // Update localStorage
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    // Update UI
    updateFavoriteButton(cityName);
    updateFavoritesList();
}

/**
 * Update favorites list in the UI
 */
function updateFavoritesList() {
    if (favorites.length === 0) {
        favoritesList.innerHTML = `
            <p class="no-favorites">No Favorite Cities Yet</p>
            <p class="favorites-hint">Search for a city and add it to your favorites for quick access</p>
        `;
        return;
    }
    
    favoritesList.innerHTML = favorites
        .map(city => `
            <div class="favorite-city" onclick="searchCity('${city}')">
                <span class="city-name">${city}</span>
                <button class="remove-favorite" onclick="removeFavorite(event, '${city}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `)
        .join('');
}

/**
 * Remove a city from favorites
 */
function removeFavorite(event, city) {
    event.stopPropagation(); // Prevent triggering the parent's click
    const index = favorites.indexOf(city);
    if (index !== -1) {
        favorites.splice(index, 1);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        updateFavoritesList();
        // Update favorite button if this is the current city
        if (cityName.textContent === city) {
            favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
        }
    }
}

/**
 * Search for a city (used by favorite buttons)
 */
function searchCity(city) {
    cityInput.value = city;
    handleSearch();
}

// UI state management functions
function showLoading() {
    loadingDiv.classList.remove('hidden');
    weatherDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
}

function hideLoading() {
    loadingDiv.classList.add('hidden');
}

function showError(message) {
    errorDiv.querySelector('p').textContent = message;
    errorDiv.classList.remove('hidden');
    weatherDiv.classList.add('hidden');
    hideLoading();
}

function hideError() {
    errorDiv.classList.add('hidden');
}

/**
 * Show coordinates search modal
 */
function showCoordinatesModal(searchQuery) {
    const message = `We couldn't find "${searchQuery}" in our database. You can try searching with coordinates instead.`;
    document.querySelector('.coord-message').textContent = message;
    coordsModal.classList.remove('hidden');
}

/**
 * Hide coordinates modal
 */
function hideCoordinatesModal() {
    coordsModal.classList.add('hidden');
    latitudeInput.value = '';
    longitudeInput.value = '';
}

/**
 * Handle coordinates search
 */
async function handleCoordinatesSearch() {
    const lat = parseFloat(latitudeInput.value);
    const lon = parseFloat(longitudeInput.value);

    if (isNaN(lat) || isNaN(lon)) {
        showError('Please enter valid coordinates');
        return;
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        showError('Coordinates out of range. Latitude: -90 to 90, Longitude: -180 to 180');
        return;
    }

    hideCoordinatesModal();
    showLoading();

    try {
        const weatherData = await fetchWeatherByCoords({ lat, lon });
        displayWeatherData(weatherData);
        // Save the coordinates as the last search
        localStorage.setItem('lastCity', `${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    } catch (error) {
        showError(error.message);
    }
} 
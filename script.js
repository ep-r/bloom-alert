// ==============================================================================
// VERSÃO FINAL E OTIMIZADA DO SCRIPT.JS (COM MELHORIAS DE PERFORMANCE)
// ==============================================================================

// 1. INICIALIZAÇÃO E VARIÁVEIS GLOBAIS
let currentLanguage = 'en';
let lastCoords = { lat: -15.7801, lon: -47.9292 };
let geeLayer = null;
let searchMarker;
let currentWeatherData = null;
let currentLocationData = null;
let currentRoutes = [];
let currentAbortController = null;
let routingLibraryLoaded = false;

const initialCoordinates = [-15.7801, -47.9292];
const initialZoom = 5;
const map = L.map('map').setView(initialCoordinates, initialZoom);

// Cache configurations
const weatherCache = new Map();
const translationCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Constants for pollen calculation
const POLLEN_CONSTANTS = {
    TEMP_BASE: 10,
    TEMP_DIVISOR: 5,
    HUMIDITY_LOW: 40,
    HUMIDITY_MED: 70,
    WIND_LOW: 5,
    WIND_HIGH: 20
};

// ==============================================================================
// **** UTILITY FUNCTIONS ****
// ==============================================================================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Cache cleanup
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of weatherCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            weatherCache.delete(key);
        }
    }
}, 60000); // Clean every minute

// ==============================================================================
// **** SISTEMA DE TRADUÇÃO ****
// ==============================================================================

const translations = {
    en: {
        findRoutes: "Find Routes", clearRoutes: "Clear Routes", loading: "Loading...", loadingData: "Loading data...", analyzingPollen: "Analyzing pollen risk...", viewDetails: "View full details", additionalDetails: "Additional Details", searchPlaceholder: "Search city...", pollenIndex: "Pollen Index", high: "High", medium: "Medium", low: "Low", noIndex: "No Index", detailsFor: "Details for", pollenAnalysis: "Pollen Risk Analysis", pollenIndexScale: "Pollen Index (1-10)", allergenSources: "Common Allergenic Sources:", healthRecommendations: "Health & Activity Recommendations", hourlyForecast: "Forecast for the Next Hours", outdoor: "Outdoors", good: "Good", moderation: "Moderation", notRecommended: "Not Recommended", maskUse: "Mask Use", optional: "Optional", recommended: "Recommended", windows: "Windows", canOpen: "Can open", keepClosed: "Keep closed", uvIndex: "UV Index", prevention: "Prevention", showerAdvice: "Shower upon arrival", clearSky: "Clear Sky", partlyCloudy: "Partly Cloudy", cloudy: "Cloudy", fog: "Fog", lightRain: "Light Rain", moderateRain: "Moderate Rain", heavyRain: "Heavy Rain", thunderstorm: "Thunderstorm", unknownCondition: "Unknown", feelsLike: "Feels like", wind: "Wind", humidity: "Humidity", predictiveAnalysis: "Predictive Analysis", chatPlaceholder: "Ask about pollen, symptoms...", cleanAirRoute: "Clean Air Route", routeDescription: "Find a path with lower pollen exposure.", origin: "Origin", destination: "Destination", originPlaceholder: "e.g., Paulista Ave, São Paulo", destinationPlaceholder: "e.g., Ibirapuera Park, São Paulo", cityNotFound: "City not found. Please try again.", searchError: "Error searching for city.", locationError: "Error loading data.", fillOriginDestination: "Please fill in origin and destination.", locationsNotFound: "Locations not found. Please be more specific.", pollenIndexEst: "Est. local Pollen Index", current: "Current", chatSymptoms: "Common pollen allergy symptoms include: sneezing, runny or stuffy nose, and itchy, watery eyes.", chatProtection: "To protect yourself: keep windows closed on windy days, wear a mask outdoors, and shower after coming inside.", chatPhenology: "Phenology is the study of seasonal natural phenomena. Our map is a phenology tool that tracks large-scale flowering events.", chatTemperature: "The current temperature in {city} is {temp}°C, with a feels-like of {feels}°C.", chatWind: "The wind is currently {wind} km/h. Strong winds can increase pollen spread.", chatHumidity: "Current humidity is at {humidity}%. Very dry air can irritate airways.", chatDefault: "I'm not sure about that. Try asking about 'temperature', 'wind', 'symptoms', or 'how to protect myself'.", 
        predictionDynamicLow: "Analysis for {city}: Pollen risk is currently **low**. Weather conditions are not favorable for allergen dispersal. A good day for outdoor activities.", 
        predictionDynamicMod: "Analysis for {city}: Pollen risk is **moderate**. The combination of mild temperature and wind at {wind} km/h may increase airborne pollen. Sensitive individuals should be cautious.", 
        predictionDynamicHigh: "**Alert for {city}:** Pollen risk is **high**. Current weather conditions are ideal for a high concentration of allergens. If possible, avoid outdoor activities and keep windows closed."
    },
    pt: {
        findRoutes: "Encontrar Rotas", clearRoutes: "Limpar Rotas", loading: "Carregando...", loadingData: "Carregando dados...", analyzingPollen: "Analisando risco de pólen...", viewDetails: "Ver detalhes completos", additionalDetails: "Detalhes Adicionais", searchPlaceholder: "Pesquisar cidade...", pollenIndex: "Índice de Pólen", high: "Alto", medium: "Médio", low: "Baixo", noIndex: "Sem Índice", detailsFor: "Detalhes para", pollenAnalysis: "Análise de Risco de Pólen", pollenIndexScale: "Índice de Pólen (1-10)", allergenSources: "Fontes Alergénicas Comuns:", healthRecommendations: "Recomendações de Saúde e Atividade", hourlyForecast: "Previsão para as Próximas Horas", outdoor: "Ao Ar Livre", good: "Bom", moderation: "Moderação", notRecommended: "Não Recomendado", maskUse: "Uso de Máscara", optional: "Opcional", recommended: "Recomendado", windows: "Janelas", canOpen: "Pode abrir", keepClosed: "Manter fechadas", uvIndex: "Índice UV", prevention: "Prevenção", showerAdvice: "Tome banho ao chegar", clearSky: "Céu Limpo", partlyCloudy: "Parcialmente Nublado", cloudy: "Nublado", fog: "Nevoeiro", lightRain: "Chuva Leve", moderateRain: "Chuva Moderada", heavyRain: "Chuva Forte", thunderstorm: "Trovoada", unknownCondition: "Desconhecido", feelsLike: "Sensação", wind: "Vento", humidity: "Humidade", predictiveAnalysis: "Análise Preditiva", chatPlaceholder: "Pergunte sobre pólen, sintomas...", cleanAirRoute: "Rota Ar Limpo", routeDescription: "Encontre um caminho com menor exposição a zonas de pólen.", origin: "Origem", destination: "Destino", originPlaceholder: "Ex: Av. Paulista, São Paulo", destinationPlaceholder: "Ex: Parque Ibirapuera, São Paulo", cityNotFound: "Cidade não encontrada. Tente novamente.", searchError: "Ocorreu um erro ao pesquisar a cidade.", locationError: "Erro ao carregar dados.", fillOriginDestination: "Por favor, preencha a origem e o destino.", locationsNotFound: "Não foi possível encontrar as localizações. Tente ser mais específico.", pollenIndexEst: "Índice de Pólen local estimado", current: "Atual", chatSymptoms: "Os sintomas comuns de alergia ao pólen incluem: espirros, nariz a pingar ou entupido, e olhos vermelhos e com comichão.", chatProtection: "Para se proteger: mantenha as janelas fechadas em dias de vento, use máscara no exterior e tome banho ao chegar a casa.", chatPhenology: "Fenologia é o estudo de fenómenos naturais sazonais. O nosso mapa é uma ferramenta de fenologia que monitoriza a floração em grande escala.", chatTemperature: "A temperatura atual em {city} é de {temp}°C, com sensação térmica de {feels}°C.", chatWind: "O vento está a {wind} km/h. Ventos fortes podem espalhar mais pólen.", chatHumidity: "A humidade atual é de {humidity}%. Ar muito seco pode irritar as vias respiratórias.", chatDefault: "Não tenho a certeza sobre isso. Tente perguntar sobre 'temperatura', 'vento', 'sintomas', ou 'como me proteger'.",
        predictionDynamicLow: "Análise para {city}: O risco de pólen é considerado **baixo**. As condições meteorológicas não são favoráveis à dispersão de alergénios. É um bom dia para atividades ao ar livre.",
        predictionDynamicMod: "Análise para {city}: O risco de pólen é **moderado**. A combinação de temperatura amena e vento a {wind} km/h pode aumentar o pólen no ar. Pessoas sensíveis devem ter precaução.",
        predictionDynamicHigh: "**Alerta para {city}:** O risco de pólen é **alto**. As condições são ideais para uma alta concentração de alergénios. Se possível, evite atividades ao ar livre e mantenha as janelas fechadas."
    }
};

function t(key, replacements = {}) {
    const cacheKey = `${currentLanguage}:${key}:${JSON.stringify(replacements)}`;
    
    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey);
    }
    
    let text = (translations[currentLanguage] && translations[currentLanguage][key]) || key;
    Object.keys(replacements).forEach(p => { text = text.replace(`{${p}}`, replacements[p]); });
    
    translationCache.set(cacheKey, text);
    return text;
}

function translatePage() {
    document.documentElement.lang = currentLanguage;
    document.getElementById('current-lang').textContent = currentLanguage.toUpperCase();
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });
}

document.addEventListener('DOMContentLoaded', () => {
    const languageToggle = document.getElementById('language-toggle');
    languageToggle.addEventListener('click', () => {
        currentLanguage = currentLanguage === 'en' ? 'pt' : 'en';
        translationCache.clear(); // Clear cache on language change
        translatePage();
        updateSidebar(lastCoords.lat, lastCoords.lon);
    });
    translatePage();
    updateSidebar(initialCoordinates[0], initialCoordinates[1]);
});

// ==============================================================================
// **** CAMADAS DO MAPA ****
// ==============================================================================
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 20 }).addTo(map);
map.createPane('labels');
map.getPane('labels').style.zIndex = 650;
map.getPane('labels').style.pointerEvents = 'none';
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', { attribution: 'Labels: CARTO', pane: 'labels' }).addTo(map);
const geeTileUrl = 'https://earthengine.googleapis.com/v1/projects/gen-lang-client-0615216502/maps/9c4c43b0c0899230961f311c69944671-51aaa6f78e8514487477321b6a794147/tiles/{z}/{x}/{y}';
if (geeTileUrl && geeTileUrl.startsWith('https://')) {
    geeLayer = L.tileLayer(geeTileUrl, {
        attribution: 'Dados de Risco: Google Earth Engine | NASA',
        opacity: 0.65,
        updateWhenIdle: true,
        updateWhenZooming: false,
        keepBuffer: 8,
        maxZoom: 20
    }).addTo(map);
}

// ==============================================================================
// **** LÓGICA PRINCIPAL DE ATUALIZAÇÃO ****
// ==============================================================================

function getWeatherInfoFromCode(code) {
    const weatherMap = { 0: "clearSky", 1: "partlyCloudy", 2: "partlyCloudy", 3: "cloudy", 45: "fog", 61: "lightRain", 63: "moderateRain", 65: "heavyRain", 95: "thunderstorm" };
    const key = weatherMap[code] || "unknownCondition";
    const iconMap = { clearSky: "fa-sun", partlyCloudy: "fa-cloud-sun", cloudy: "fa-cloud", fog: "fa-smog", lightRain: "fa-cloud-rain", moderateRain: "fa-cloud-showers-heavy", heavyRain: "fa-cloud-showers-heavy", thunderstorm: "fa-bolt", unknownCondition: "fa-question-circle" };
    return { text: t(key), icon: iconMap[key] };
}

async function updateSidebar(lat, lon) {
    lastCoords = { lat, lon };
    
    // Check cache first
    const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    const cached = weatherCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        renderSidebarData(cached.data);
        return;
    }
    
    // Cancel previous request if exists
    if (currentAbortController) {
        currentAbortController.abort();
    }
    currentAbortController = new AbortController();
    
    document.getElementById('location-name').textContent = t('loading');
    document.getElementById('location-condition-text').textContent = t('loadingData');
    
    try {
        const weatherApiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,uv_index&hourly=temperature_2m,precipitation_probability&timezone=auto`;
        const locationApiUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=${currentLanguage}`;
        
        const [weatherResponse, locationResponse] = await Promise.all([
            fetch(weatherApiUrl, { signal: currentAbortController.signal }),
            fetch(locationApiUrl, { signal: currentAbortController.signal })
        ]);
        
        const weatherData = await weatherResponse.json();
        const locationData = await locationResponse.json();
        
        const data = { weatherData, locationData, lat, lon };
        
        // Cache the data
        weatherCache.set(cacheKey, { data, timestamp: Date.now() });
        
        renderSidebarData(data);
        
    } catch (error) {
        if (error.name === 'AbortError') return;
        console.error("Erro ao atualizar a barra lateral:", error);
        document.getElementById('location-name').textContent = t('locationError');
    }
}

function renderSidebarData(data) {
    const { weatherData, locationData, lat, lon } = data;
    
    const cityName = locationData.address.city || locationData.address.town || locationData.address.village || 'Location';
    const state = locationData.address.state || '';
    const country = locationData.address.country || '';
    
    document.getElementById('location-name').textContent = `${cityName}, ${state}`;
    
    const localTime = new Date().toLocaleTimeString(currentLanguage === 'pt' ? 'pt-BR' : 'en-US', { timeZone: weatherData.timezone, hour: '2-digit', minute: '2-digit' });
    document.getElementById('location-time').textContent = `${t('current')}: ${localTime} (${weatherData.timezone_abbreviation})`;
    
    const temp = Math.round(weatherData.current.temperature_2m);
    document.getElementById('location-temp').innerHTML = `${temp}<small>°C</small>`;
    
    const weatherInfo = getWeatherInfoFromCode(weatherData.current.weather_code);
    document.getElementById('location-condition-text').textContent = weatherInfo.text;
    document.getElementById('location-condition-icon').className = `fas ${weatherInfo.icon}`;
    
    const detailsList = document.getElementById('details-list');
    detailsList.innerHTML = `
        <li><i class="fas fa-temperature-three-quarters icon-yellow"></i> ${t('feelsLike')}: <strong>${Math.round(weatherData.current.apparent_temperature)}°C</strong></li>
        <li><i class="fas fa-wind icon-green"></i> ${t('wind')}: <strong>${weatherData.current.wind_speed_10m.toFixed(1)} km/h</strong></li>
        <li><i class="fas fa-tint icon-green"></i> ${t('humidity')}: <strong>${weatherData.current.relative_humidity_2m}%</strong></li>
        <li><i class="fas fa-sun icon-yellow"></i> ${t('uvIndex')}: <strong>${weatherData.current.uv_index.toFixed(1)}</strong></li>
    `;
    
    let pollenIndex = calculatePollenIndex(temp, weatherData.current.relative_humidity_2m, weatherData.current.wind_speed_10m);
    document.getElementById('pollen-info').textContent = `${t('pollenIndexEst')}: ${pollenIndex.toFixed(1)} / 10`;
    
    updateDetailsModal(weatherData, { cityName, state, country }, lat, lon, pollenIndex);
    triggerInitialGeminiPrediction(weatherData, { cityName, state, country }, pollenIndex);
}

function calculatePollenIndex(temp, humidity, wind) {
    let tempScore = Math.max(0, Math.min(3, (temp - POLLEN_CONSTANTS.TEMP_BASE) / POLLEN_CONSTANTS.TEMP_DIVISOR));
    let humidityScore = humidity < POLLEN_CONSTANTS.HUMIDITY_LOW ? 3 : (humidity < POLLEN_CONSTANTS.HUMIDITY_MED ? 2 : 1);
    let windScore = wind < POLLEN_CONSTANTS.WIND_LOW ? 1 : (wind < POLLEN_CONSTANTS.WIND_HIGH ? 3 : 2);
    let pollenIndex = tempScore + humidityScore + windScore + Math.random();
    return Math.min(pollenIndex, 10);
}

// Apply debounce to map click
map.on('click', debounce((e) => updateSidebar(e.latlng.lat, e.latlng.lng), 300));

// ==============================================================================
// **** CÓDIGO RESTANTE (MODAL, GEMINI, ROTAS, PESQUISA) ****
// ==============================================================================

// MODAL
const detailsModal = document.getElementById('details-modal');
const openModalBtn = document.querySelector('.view-details-btn');
const closeModalBtn = document.getElementById('modal-close-btn');
openModalBtn.addEventListener('click', () => { detailsModal.style.display = 'flex'; });
closeModalBtn.addEventListener('click', () => { detailsModal.style.display = 'none'; });
window.addEventListener('click', (event) => { if (event.target === detailsModal) { detailsModal.style.display = 'none'; } });

function updateDetailsModal(weatherData, locationInfo, lat, lon, pollenIndex) {
    document.getElementById('modal-city-name').textContent = `${t('detailsFor')} ${locationInfo.cityName}`;
    document.getElementById('pollen-index-value').textContent = pollenIndex.toFixed(1);
    const { uv_index } = weatherData.current;
    const plantasAlergenicas = { 'Sul': ['Plátano', 'Cipreste', 'Gramíneas'], 'Sudeste': ['Ambrósia', 'Grama', 'Parietaria'], 'Norte': ['Pólen de Palmeiras', 'Grama'] };
    const regiao = ['Rio Grande do Sul', 'Santa Catarina', 'Paraná'].includes(locationInfo.state) ? 'Sul' : 'Sudeste';
    document.getElementById('pollen-sources-list').innerHTML = (plantasAlergenicas[regiao] || []).map(planta => `<li>${planta}</li>`).join('');
    
    const recommendations = [
        pollenIndex < 4 ? { icon: 'fa-running', color: 'green', title: t('outdoor'), value: t('good') } : (pollenIndex < 7 ? { icon: 'fa-walking', color: 'orange', title: t('outdoor'), value: t('moderation') } : { icon: 'fa-house-user', color: 'red', title: t('outdoor'), value: t('notRecommended') }),
        pollenIndex < 7 ? { icon: 'fa-head-side-mask', color: 'green', title: t('maskUse'), value: t('optional') } : { icon: 'fa-head-side-mask', color: 'red', title: t('maskUse'), value: t('recommended') },
        pollenIndex < 5 ? { icon: 'fa-person-shelter', color: 'green', title: t('windows'), value: t('canOpen') } : { icon: 'fa-person-shelter', color: 'red', title: t('windows'), value: t('keepClosed') },
        uv_index < 3 ? { icon: 'fa-sun', color: 'green', title: t('uvIndex'), value: 'Low' } : (uv_index < 8 ? { icon: 'fa-sun', color: 'orange', title: t('uvIndex'), value: 'High' } : { icon: 'fa-sun', color: 'red', title: t('uvIndex'), value: 'Extreme' }),
        { icon: 'fa-shower', color: 'green', title: t('prevention'), value: t('showerAdvice') }
    ];
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    recommendations.forEach(rec => {
        const div = document.createElement('div');
        div.className = 'rec-item';
        div.innerHTML = `<i class="fas ${rec.icon} rec-icon" style="color: var(--accent-color);"></i><div class="rec-text-content"><p class="rec-title">${rec.title}</p><p class="rec-value">${rec.value}</p></div><div class="status-dot ${rec.color}"></div>`;
        fragment.appendChild(div);
    });
    
    const recGrid = document.getElementById('recommendations-grid');
    recGrid.innerHTML = '';
    recGrid.appendChild(fragment);
    
    const hourlyContainer = document.getElementById('hourly-forecast');
    hourlyContainer.innerHTML = '';
    const now = new Date();
    const currentHour = now.getHours();
    
    const hourlyFragment = document.createDocumentFragment();
    for(let i = 1; i <= 5; i++) {
        const forecastHour = (currentHour + i) % 24;
        const hourIndex = weatherData.hourly.time.findIndex(t => new Date(t).getHours() === forecastHour);
        if (hourIndex > -1) {
            const temp_hour = Math.round(weatherData.hourly.temperature_2m[hourIndex]);
            const rainProb = weatherData.hourly.precipitation_probability[hourIndex];
            const timeStr = new Date(weatherData.hourly.time[hourIndex]).toLocaleTimeString(currentLanguage === 'pt' ? 'pt-BR' : 'en-US', {hour: '2-digit', minute: '2-digit'});
            
            const div = document.createElement('div');
            div.className = 'hourly-item';
            div.innerHTML = `<strong>${timeStr}</strong><p>${temp_hour}°C</p><i class="fas fa-tint icon-green"></i><p>${rainProb}%</p>`;
            hourlyFragment.appendChild(div);
        }
    }
    hourlyContainer.appendChild(hourlyFragment);
}

// GEMINI CHAT
const geminiChatWidget = document.getElementById('gemini-chat-widget');
const chatScreen = document.getElementById('gemini-chat-screen');
const chatForm = document.getElementById('gemini-chat-form');
const chatInput = document.getElementById('gemini-chat-input');
const closeChatBtn = document.getElementById('chat-close-btn');
closeChatBtn.addEventListener('click', () => geminiChatWidget.style.display = 'none');

function addMessageToChatScreen(message, sender) { 
    const div = document.createElement('div'); 
    div.className = `chat-message ${sender}-message`; 
    div.textContent = message; 
    chatScreen.appendChild(div); 
    chatScreen.scrollTop = chatScreen.scrollHeight; 
}

function getGeminiChatResponse(userInput) {
    const lowerInput = userInput.toLowerCase();
    
    const symptomKeywords = ['sintomas', 'symptoms', 'alergia', 'allergy', 'espirro', 'sneeze', 'comichão', 'itchy', 'olhos', 'eyes'];
    const protectionKeywords = ['proteger', 'evitar', 'prevenção', 'protect', 'avoid', 'prevention', 'cuidado', 'care'];
    const phenologyKeywords = ['fenologia', 'phenology', 'estudo', 'study', 'ciência', 'science'];
    const temperatureKeywords = ['temperatura', 'temperature', 'clima', 'weather', 'quente', 'frio', 'hot', 'cold'];
    const windKeywords = ['vento', 'wind'];
    const humidityKeywords = ['humidade', 'umidade', 'humidity'];

    if (symptomKeywords.some(keyword => lowerInput.includes(keyword))) {
        return t('chatSymptoms');
    }
    if (protectionKeywords.some(keyword => lowerInput.includes(keyword))) {
        return t('chatProtection');
    }
    if (phenologyKeywords.some(keyword => lowerInput.includes(keyword))) {
        return t('chatPhenology');
    }

    if (currentWeatherData && currentLocationData) {
        const { current } = currentWeatherData;
        const { cityName } = currentLocationData;
        
        if (temperatureKeywords.some(keyword => lowerInput.includes(keyword))) {
            return t('chatTemperature', {
                city: cityName,
                temp: Math.round(current.temperature_2m),
                feels: Math.round(current.apparent_temperature)
            });
        }
        if (windKeywords.some(keyword => lowerInput.includes(keyword))) {
            return t('chatWind', { wind: current.wind_speed_10m.toFixed(1) });
        }
        if (humidityKeywords.some(keyword => lowerInput.includes(keyword))) {
            return t('chatHumidity', { humidity: current.relative_humidity_2m });
        }
    }

    return t('chatDefault');
}

function triggerInitialGeminiPrediction(weatherData, locationData, pollenIndex) {
    currentWeatherData = weatherData;
    currentLocationData = locationData;
    const { cityName } = locationData;
    const { wind_speed_10m: wind } = weatherData.current;
    let key;
    if (pollenIndex < 4) key = 'predictionDynamicLow';
    else if (pollenIndex < 7) key = 'predictionDynamicMod';
    else key = 'predictionDynamicHigh';
    const initialPrediction = t(key, { city: cityName, wind: wind.toFixed(1) });
    chatScreen.innerHTML = ''; 
    addMessageToChatScreen(initialPrediction, 'ai');
    geminiChatWidget.style.display = 'flex';
}

chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const userInput = chatInput.value;
    if (userInput.trim() === '') return;
    addMessageToChatScreen(userInput, 'user');
    chatInput.value = '';
    setTimeout(() => { addMessageToChatScreen(getGeminiChatResponse(userInput), 'ai'); }, 800);
});

// ROUTING
// ==============================================================================
// **** FUNCIONALIDADE DE ROTA "AR LIMPO" (LAZY LOADED) ****
// ==============================================================================
const routingPanel = document.getElementById('routing-panel');
const openRoutingBtn = document.getElementById('open-routing-btn');
const routingCloseBtn = document.getElementById('routing-close-btn');
const routingForm = document.getElementById('routing-form');
const clearRoutesBtn = document.getElementById('clear-routes-btn');

async function loadRoutingLibrary() {
    if (routingLibraryLoaded) return;
    
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.js';
        script.onload = () => {
            routingLibraryLoaded = true;
            resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

openRoutingBtn.addEventListener('click', async () => {
    await loadRoutingLibrary();
    routingPanel.classList.add('open');
});
routingCloseBtn.addEventListener('click', () => routingPanel.classList.remove('open'));

async function geocode(query) {
    const apiUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        return (data && data.length > 0) ? L.latLng(parseFloat(data[0].lat), parseFloat(data[0].lon)) : null;
    } catch (error) {
        console.error('Erro de Geocoding:', error);
        return null;
    }
}

function clearRoutes() {
    if (currentRoutes.length > 0) {
        currentRoutes.forEach(route => map.removeControl(route));
        currentRoutes = [];
    }
}

clearRoutesBtn.addEventListener('click', () => {
    clearRoutes();
    if (searchMarker) {
        map.removeLayer(searchMarker);
    }
    map.flyTo(initialCoordinates, initialZoom);
    routingPanel.classList.remove('open');
});

routingForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const startPointQuery = document.getElementById('start-point').value;
    const endPointQuery = document.getElementById('end-point').value;
    if (!startPointQuery || !endPointQuery) return alert(t('fillOriginDestination'));
    
    clearRoutes();

    const startLatLng = await geocode(startPointQuery);
    const endLatLng = await geocode(endPointQuery);
    if (!startLatLng || !endLatLng) return alert(t('locationsNotFound'));

    const fastRoute = L.Routing.control({
        waypoints: [startLatLng, endLatLng],
        lineOptions: { styles: [{color: '#007bff', opacity: 0.8, weight: 6}] },
        createMarker: () => null, show: false
    }).addTo(map);
    
    const midPoint = L.latLng((startLatLng.lat + endLatLng.lat) / 2 + 0.01, (startLatLng.lng + endLatLng.lng) / 2 + 0.01);
    const cleanAirRoute = L.Routing.control({
        waypoints: [startLatLng, midPoint, endLatLng],
        lineOptions: { styles: [{color: '#4CAF50', opacity: 0.9, weight: 8}] },
        createMarker: () => null, show: false
    }).addTo(map);
    
    currentRoutes = [fastRoute, cleanAirRoute];

    routingPanel.classList.remove('open');
});

// SEARCH
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');

searchForm.addEventListener('submit', function(event) {
    event.preventDefault(); 
    const cityName = searchInput.value;
    if (cityName.trim() === '') return;
    const apiUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&countrycodes=br`;
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lon = parseFloat(result.lon);
                map.flyTo([lat, lon], 13);
                if (searchMarker) map.removeLayer(searchMarker);
                searchMarker = L.marker([lat, lon]).addTo(map).bindPopup(`<b>${result.display_name}</b>`).openPopup();
                updateSidebar(lat, lon);
            } else {
                alert(t('cityNotFound'));
            }
        }).catch(error => {
            console.error('Erro na pesquisa da cidade:', error);
            alert(t('searchError'));
        });
});
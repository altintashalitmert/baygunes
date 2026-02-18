import axios from 'axios';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Reverse geocode: Get address from coordinates
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
        'accept-language': 'tr'
      },
      headers: {
        'User-Agent': 'BaygunesPBMS/1.0'
      }
    });
    
    const { address } = response.data;
    
    return {
      city: address.city || address.town || address.province || '',
      district: address.district || address.county || '',
      neighborhood: address.suburb || address.neighbourhood || '',
      street: address.road || address.street || '',
      fullAddress: response.data.display_name
    };
  } catch (error) {
    console.error('Reverse geocoding failed:', error.message);
    return null;
  }
};

// Forward geocode: Get coordinates from address
export const forwardGeocode = async (address) => {
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        'accept-language': 'tr'
      },
      headers: {
        'User-Agent': 'BaygunesPBMS/1.0'
      }
    });
    
    if (response.data.length === 0) {
      return null;
    }
    
    const result = response.data[0];
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name
    };
  } catch (error) {
    console.error('Forward geocoding failed:', error.message);
    return null;
  }
};

// Generate pole code from location data
export const generatePoleCode = async (latitude, longitude, street, sequenceNo) => {
  try {
    const location = await reverseGeocode(latitude, longitude);
    
    if (!location) {
      return null;
    }
    
    const cityCode = (location.city || 'XX').substring(0, 2).toUpperCase();
    const districtCode = (location.district || 'XX').substring(0, 2).toUpperCase();
    const neighborhoodCode = (location.neighborhood || 'X').substring(0, 1).toUpperCase();
    const streetCode = (street || location.street || 'X').substring(0, 1).toUpperCase();
    const seq = String(sequenceNo || 1).padStart(2, '0');
    
    return `${cityCode}${districtCode}${neighborhoodCode}${streetCode}${seq}`;
  } catch (error) {
    console.error('Pole code generation failed:', error);
    return null;
  }
};

// Search for locations
export const searchLocation = async (query, limit = 5) => {
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: query,
        format: 'json',
        limit,
        'accept-language': 'tr',
        countrycodes: 'tr' // Limit to Turkey
      },
      headers: {
        'User-Agent': 'BaygunesPBMS/1.0'
      }
    });
    
    return response.data.map(result => ({
      displayName: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      type: result.type,
      importance: result.importance
    }));
  } catch (error) {
    console.error('Location search failed:', error.message);
    return [];
  }
};

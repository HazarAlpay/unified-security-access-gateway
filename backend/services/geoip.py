import math
import requests
from typing import Any, Dict, Tuple

def get_location_from_ip(ip: str) -> Dict[str, Any]:
    """
    Get location from IP using ip-api.com.
    """
    # Keep Localhost Logic for development stability
    if ip.startswith("127.") or ip.startswith("192."):
        return {"lat": 39.93, "lon": 32.85, "city": "Ankara", "country": "TR"}

    try:
        # External API
        response = requests.get(f"http://ip-api.com/json/{ip}", timeout=5)
        data = response.json()
        
        if data.get("status") == "fail":
             return {"lat": 0.0, "lon": 0.0, "city": "Unknown", "country": "Unknown"}
             
        return {
            "lat": data.get("lat", 0.0),
            "lon": data.get("lon", 0.0),
            "city": data.get("city", "Unknown"),
            "country": data.get("countryCode", "Unknown")
        }
    except Exception:
        return {"lat": 0.0, "lon": 0.0, "city": "Unknown", "country": "Unknown"}

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees) using Haversine formula.
    Returns distance in Kilometers.
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of earth in kilometers. Use 6371
    r = 6371 
    return c * r

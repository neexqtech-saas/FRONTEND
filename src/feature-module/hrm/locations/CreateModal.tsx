import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getAdminIdForApi, getSelectedSiteId, buildApiUrlWithSite } from "../../../core/utils/apiHelpers";

// Fix for default marker icon in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface LocationModalProps {
  onLocationAdded: () => void;
  editingLocation: any;
  onLocationUpdated: () => void;
  onEditClose: () => void;
}

interface LocationFormState {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  radius: string;
}

const LocationModal: React.FC<LocationModalProps> = ({
  onLocationAdded,
  editingLocation,
  onLocationUpdated,
  onEditClose,
}) => {
  const initialFormState: LocationFormState = {
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    radius: "100",
  };

  const [formData, setFormData] = useState<LocationFormState>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.6139, 77.2090]); // Default to Delhi
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const suggestionsTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (editingLocation) {
      const lat = parseFloat(editingLocation.latitude) || 28.6139;
      const lng = parseFloat(editingLocation.longitude) || 77.2090;
      setFormData({
        name: editingLocation.name || "",
        address: editingLocation.address || "",
        latitude: editingLocation.latitude?.toString() || "",
        longitude: editingLocation.longitude?.toString() || "",
        radius: editingLocation.radius?.toString() || "100",
      });
      setMapCenter([lat, lng]);
    } else {
      setFormData(initialFormState);
      // Try to get user's current location, otherwise use default
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            setMapCenter([lat, lng]);
            setFormData((prev) => ({
              ...prev,
              latitude: lat.toFixed(6),
              longitude: lng.toFixed(6),
            }));
          },
          () => {
            // If geolocation fails, use default
            setMapCenter([28.6139, 77.2090]);
          }
        );
      }
    }
  }, [editingLocation]);

  // Update map center when coordinates change manually
  useEffect(() => {
    if (formData.latitude && formData.longitude) {
      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        setMapCenter([lat, lng]);
      }
    }
  }, [formData.latitude, formData.longitude]);

  // Fetch address suggestions as user types
  const fetchAddressSuggestions = async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    console.log("Fetching suggestions for:", trimmedQuery);
    setSearchingAddress(true);
    try {
      // Using OpenStreetMap Nominatim API for autocomplete
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmedQuery)}&limit=5&addressdetails=1`,
        {
          headers: {
            "User-Agent": "LocationManagement/1.0", // Required by Nominatim
          },
        }
      );

      const data = await response.json();
      console.log("Suggestions received:", data);

      if (data && Array.isArray(data) && data.length > 0) {
        setAddressSuggestions(data);
        setShowSuggestions(true);
        console.log("Showing", data.length, "suggestions");
      } else {
        setAddressSuggestions([]);
        setShowSuggestions(false);
        console.log("No suggestions found");
      }
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
      setAddressSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setSearchingAddress(false);
    }
  };

  // Geocode address to get latitude and longitude
  const geocodeAddress = async (address: string) => {
    if (!address || address.trim() === "") {
      return;
    }

    setGeocoding(true);
    setShowSuggestions(false);
    try {
      // Using OpenStreetMap Nominatim API (free, no API key needed)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            "User-Agent": "LocationManagement/1.0", // Required by Nominatim
          },
        }
      );

      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        setFormData((prev) => ({
          ...prev,
          latitude: parseFloat(result.lat).toFixed(6),
          longitude: parseFloat(result.lon).toFixed(6),
        }));
        toast.success("Location coordinates found!");
      } else {
        toast.warning("Could not find coordinates for this address. Please enter manually.");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      toast.error("Failed to geocode address. Please enter coordinates manually.");
    } finally {
      setGeocoding(false);
    }
  };

  // Get current location from browser
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    setGeocoding(true);
    toast.info("Getting your current location...", { autoClose: 2000 });
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        
        console.log("Location captured - Lat:", lat, "Lng:", lng, "Accuracy:", accuracy.toFixed(1), "meters");
        
        // Update form data with coordinates
        setFormData((prev) => ({
          ...prev,
          latitude: lat.toFixed(8),
          longitude: lng.toFixed(8),
        }));
        
        // Update map center to show the current location
        setMapCenter([lat, lng]);
        
        // Get address from coordinates
        reverseGeocode(lat.toFixed(8), lng.toFixed(8), false, false);
        
        // Show success message with accuracy info
        const accuracyMsg = accuracy <= 50
          ? "Current location captured! You can drag the marker on the map for exact positioning."
          : "Current location captured! Please drag the marker on the map to set the exact location.";
        
        toast.success(accuracyMsg);
        setGeocoding(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        let errorMessage = "Failed to get current location. ";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Location permission denied. Please allow location access and try again.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable. Please check your GPS/WiFi settings.";
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out. Please ensure GPS/WiFi is enabled and try again, or manually set location on the map.";
            break;
          default:
            errorMessage += "Please enter coordinates manually or set location on the map.";
            break;
        }
        
        toast.error(errorMessage);
        setGeocoding(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000, // Faster timeout (5 seconds)
        maximumAge: 30000 // Accept location up to 30 seconds old for faster response
      }
    );
  };

  // Reverse geocode to get address from coordinates
  const reverseGeocode = async (lat: string, lon: string, showToast: boolean = false, manageGeocodingState: boolean = true) => {
    if (!lat || !lon) {
      return;
    }

    // Only manage geocoding state if requested (to avoid conflicts when called from getCurrentLocation)
    if (manageGeocodingState) {
      setGeocoding(true);
    }
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        {
          headers: {
            "User-Agent": "LocationManagement/1.0",
          },
        }
      );

      const data = await response.json();

      if (data && data.display_name) {
        setFormData((prev) => ({
          ...prev,
          address: data.display_name,
        }));
        if (showToast) {
          toast.success("Address found from coordinates!");
        }
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
    } finally {
      if (manageGeocodingState) {
        setGeocoding(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Handle address autocomplete
    if (name === "address") {
      // Clear previous timeout
      if (suggestionsTimeoutRef.current !== null) {
        window.clearTimeout(suggestionsTimeoutRef.current);
      }

      // Debounce the suggestion fetch (wait 500ms after user stops typing)
      suggestionsTimeoutRef.current = window.setTimeout(() => {
        fetchAddressSuggestions(value);
      }, 500) as any;
    }
  };

  const handleAddressBlur = () => {
    // Hide suggestions after a small delay to allow click on suggestion
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const handleAddressFocus = () => {
    // Show suggestions if we have any
    if (addressSuggestions.length > 0 && formData.address.trim().length >= 3) {
      setShowSuggestions(true);
    }
  };

  const handleSuggestionSelect = (suggestion: any) => {
    const fullAddress = suggestion.display_name;
    setFormData((prev) => ({
      ...prev,
      address: fullAddress,
      latitude: parseFloat(suggestion.lat).toFixed(8),
      longitude: parseFloat(suggestion.lon).toFixed(8),
    }));
    setMapCenter([parseFloat(suggestion.lat), parseFloat(suggestion.lon)]);
    setAddressSuggestions([]);
    setShowSuggestions(false);
    toast.success("Address selected! Coordinates updated.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter location name");
      return;
    }

    if (!formData.address.trim()) {
      toast.error("Please enter address");
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      toast.error("Please enter latitude and longitude or use geocoding");
      return;
    }

    const latitude = parseFloat(formData.latitude);
    const longitude = parseFloat(formData.longitude);

    if (isNaN(latitude) || isNaN(longitude)) {
      toast.error("Please enter valid latitude and longitude");
      return;
    }

    if (latitude < -90 || latitude > 90) {
      toast.error("Latitude must be between -90 and 90");
      return;
    }

    if (longitude < -180 || longitude > 180) {
      toast.error("Longitude must be between -180 and 180");
      return;
    }

    const radius = parseInt(formData.radius) || 100;
    if (radius < 0) {
      toast.error("Radius must be a positive number");
      return;
    }

    setLoading(true);

    try {
      const token = sessionStorage.getItem("access_token");
      const admin_id = getAdminIdForApi();

      if (!admin_id) {
        toast.error("Admin ID not found. Please login again.");
        return;
      }

      const payload = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        latitude: latitude,
        longitude: longitude,
        radius: radius,
        is_active: true,
      };

      let response;

      if (editingLocation) {
        // Update existing location
        const site_id = getSelectedSiteId();
        if (!site_id) {
          toast.error("Please select a site first");
          return;
        }
        // Admin role: backend gets admin_id from request.user
        // Organization role: admin_id should be passed as query param
        const role = sessionStorage.getItem("role");
        let url = `http://127.0.0.1:8000/api/locations/${site_id}/${editingLocation.id}/`;
        if (role === "organization" && admin_id) {
          url += `?admin_id=${admin_id}`;
        }
        response = await axios.put(
          url,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        // Backend response format: { status, message, data }
        toast.success(response.data.message || "Location updated successfully!");
        onLocationUpdated();
      } else {
        // Create new location
        const site_id = getSelectedSiteId();
        if (!site_id) {
          toast.error("Please select a site first");
          return;
        }
        // Admin role: backend gets admin_id from request.user
        // Organization role: admin_id should be passed as query param
        const role = sessionStorage.getItem("role");
        let url = `http://127.0.0.1:8000/api/locations/${site_id}/`;
        if (role === "organization" && admin_id) {
          url += `?admin_id=${admin_id}`;
        }
        response = await axios.post(
          url,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        // Backend response format: { status, message, data }
        toast.success(response.data.message || "Location added successfully!");
        onLocationAdded();
      }

      // Reset form
      setFormData(initialFormState);
      
      // Close modal
      const modalElement = document.getElementById("locationModal");
      if (modalElement) {
        const modal = (window as any).bootstrap?.Modal?.getInstance(modalElement);
        if (modal) {
          modal.hide();
        }
      }
    } catch (error: any) {
      console.error("Error saving location:", error);
      toast.error(
        error.response?.data?.message || 
        error.response?.data?.detail || 
        `Failed to ${editingLocation ? "update" : "add"} location`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData(initialFormState);
    setAddressSuggestions([]);
    setShowSuggestions(false);
    if (suggestionsTimeoutRef.current) {
      clearTimeout(suggestionsTimeoutRef.current);
    }
    onEditClose();
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (suggestionsTimeoutRef.current) {
        clearTimeout(suggestionsTimeoutRef.current);
      }
    };
  }, []);

  const getModalContainer = () => document.getElementById("locationModal") || document.body;

  // Component to handle map clicks and marker drags
  const DraggableMarker: React.FC<{ position: [number, number] }> = ({ position }) => {
    const marker = useRef<L.Marker>(null);

    const eventHandlers = {
      dragend() {
        const markerInstance = marker.current;
        if (markerInstance != null) {
          const latlng = markerInstance.getLatLng();
          const newLat = latlng.lat.toFixed(6);
          const newLng = latlng.lng.toFixed(6);
          setFormData((prev) => ({
            ...prev,
            latitude: newLat,
            longitude: newLng,
          }));
          setMapCenter([latlng.lat, latlng.lng]);
          // Optionally reverse geocode to update address
          reverseGeocode(newLat, newLng);
        }
      },
    };

    return (
      <Marker
        key={`${position[0]}-${position[1]}`}
        ref={marker}
        position={position}
        draggable={true}
        eventHandlers={eventHandlers}
      />
    );
  };

  // Component to handle map clicks
  const MapClickHandler: React.FC = () => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setFormData((prev) => ({
          ...prev,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
        }));
        setMapCenter([lat, lng]);
        // Optionally reverse geocode to update address
        reverseGeocode(lat.toFixed(6), lng.toFixed(6), true);
      },
    });
    return null;
  };

  return (
    <div
      className="modal fade"
      id="locationModal"
      tabIndex={-1}
      aria-labelledby="locationModalLabel"
      aria-hidden="true"
      data-bs-backdrop="static"
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="locationModalLabel">
              {editingLocation ? "Edit Location" : "Add New Location"}
            </h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
              onClick={handleCancel}
            />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-12">
                  <div className="mb-3">
                    <label className="form-label">
                      Location Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g. Main Office, Branch Office"
                      required
                    />
                  </div>
                </div>

                <div className="col-md-12">
                  <div className="mb-3">
                    <label className="form-label">
                      Address <span className="text-danger">*</span>
                    </label>
                    <div className="position-relative">
                      <div className="input-group">
                        <input
                          ref={addressInputRef}
                          type="text"
                          className="form-control"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          onBlur={handleAddressBlur}
                          onFocus={handleAddressFocus}
                          placeholder="Start typing address... (e.g. Connaught Place, New Delhi)"
                          required
                          autoComplete="off"
                        />
                        {(searchingAddress || geocoding) && (
                          <span className="input-group-text">
                            <span className="spinner-border spinner-border-sm" />
                          </span>
                        )}
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => geocodeAddress(formData.address)}
                          disabled={geocoding || !formData.address.trim()}
                          title="Get coordinates from address"
                        >
                          {geocoding ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            <i className="ti ti-map-search" />
                          )}
                        </button>
                      </div>
                      
                      {/* Address Suggestions Dropdown */}
                      {showSuggestions && addressSuggestions.length > 0 && (
                        <div
                          className="list-group position-absolute w-100"
                          style={{
                            zIndex: 9999,
                            maxHeight: "300px",
                            overflowY: "auto",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                            border: "1px solid #ddd",
                            borderTop: "none",
                            borderRadius: "0 0 4px 4px",
                            marginTop: "0",
                            backgroundColor: "white",
                            top: "100%",
                            left: 0,
                          }}
                        >
                          {addressSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              className="list-group-item list-group-item-action"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSuggestionSelect(suggestion);
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault(); // Prevent input blur
                              }}
                              style={{ textAlign: "left", cursor: "pointer" }}
                            >
                              <div className="d-flex align-items-start">
                                <i className="ti ti-map-pin me-2 mt-1 text-primary" />
                                <div className="flex-grow-1">
                                  <div className="fw-medium">{suggestion.display_name}</div>
                                  {suggestion.address && (
                                    <small className="text-muted d-block">
                                      {suggestion.address.city || suggestion.address.town || suggestion.address.village || ""}
                                      {suggestion.address.state && `, ${suggestion.address.state}`}
                                      {suggestion.address.country && `, ${suggestion.address.country}`}
                                    </small>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <small className="text-muted">
                      {searchingAddress 
                        ? "Searching for addresses..." 
                        : "Start typing to see address suggestions (min 3 characters). Select one or click search icon."
                      }
                    </small>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">
                      Latitude <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      placeholder="e.g. 28.6139"
                      min="-90"
                      max="90"
                      required
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">
                      Longitude <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleInputChange}
                      placeholder="e.g. 77.2090"
                      min="-180"
                      max="180"
                      required
                    />
                  </div>
                </div>

                <div className="col-md-12">
                  <div className="mb-3">
                    <button
                      type="button"
                      className="btn btn-outline-info btn-sm"
                      onClick={getCurrentLocation}
                      disabled={geocoding}
                    >
                      <i className="ti ti-current-location me-1" />
                      {geocoding ? "Getting location..." : "Use Current Location"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm ms-2"
                      onClick={() => {
                        if (formData.latitude && formData.longitude) {
                          reverseGeocode(formData.latitude, formData.longitude);
                        } else {
                          toast.warning("Please enter latitude and longitude first");
                        }
                      }}
                      disabled={geocoding || !formData.latitude || !formData.longitude}
                    >
                      <i className="ti ti-arrow-back me-1" />
                      Get Address from Coordinates
                    </button>
                  </div>
                </div>

                <div className="col-md-12">
                  <div className="mb-3">
                    <label className="form-label">
                      Radius (meters) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      name="radius"
                      value={formData.radius}
                      onChange={handleInputChange}
                      placeholder="100"
                      min="1"
                      required
                    />
                    <small className="text-muted">
                      Geofencing radius in meters for location tracking
                    </small>
                  </div>
                </div>

                <div className="col-md-12">
                  <div className="mb-3">
                    <label className="form-label">
                      Location Map <span className="text-danger">*</span>
                    </label>
                    <div
                      style={{
                        height: "400px",
                        width: "100%",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      {formData.latitude && formData.longitude && !isNaN(parseFloat(formData.latitude)) && !isNaN(parseFloat(formData.longitude)) ? (
                        <MapContainer
                          key={`map-${mapCenter[0]}-${mapCenter[1]}`}
                          center={mapCenter}
                          zoom={15}
                          style={{ height: "100%", width: "100%" }}
                          scrollWheelZoom={true}
                        >
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          <MapClickHandler />
                          <DraggableMarker position={mapCenter} />
                        </MapContainer>
                      ) : (
                        <div
                          style={{
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#f5f5f5",
                            color: "#666",
                          }}
                        >
                          <div className="text-center">
                            <i className="ti ti-map-pin fs-1 mb-2" />
                            <p className="mb-0">
                              Enter coordinates or use "Use Current Location" to see map
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <small className="text-muted d-block mt-2">
                      <i className="ti ti-info-circle me-1" />
                      Click on the map or drag the marker to set the location. The marker can be dragged to adjust the position.
                    </small>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    {editingLocation ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  <>
                    <i className="ti ti-check me-1" />
                    {editingLocation ? "Update Location" : "Add Location"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LocationModal;


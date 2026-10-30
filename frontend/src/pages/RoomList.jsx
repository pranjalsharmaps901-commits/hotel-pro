import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api';

const RoomList = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('All');

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await API.get('/rooms');
        setRooms(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Error fetching room list:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  const filtered = rooms.filter((r) => {
    return categoryFilter === 'All' || r.category === categoryFilter;
  });

  return (
    <div className="container py-5 text-start">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Hotel Pro Luxury Rooms</h2>
          <p className="text-muted mb-0">Browse our available rooms and luxury suites.</p>
        </div>
        <div className="d-flex gap-2">
          <select
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Standard">Standard</option>
            <option value="Single">Single</option>
            <option value="Double">Double</option>
            <option value="Deluxe">Deluxe</option>
            <option value="Suite">Suite</option>
            <option value="Executive">Executive</option>
          </select>
          <Link to="/dashboard" className="btn btn-outline-primary btn-sm">
            Go to Dashboard &rarr;
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2 text-muted">Loading available rooms...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-5 text-center shadow-sm">
          <h4>No Rooms Found</h4>
          <p className="text-muted">No rooms currently match the selected criteria.</p>
          <div>
            <Link to="/dashboard" className="btn btn-primary btn-sm">
              Add Rooms in Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {filtered.map((room) => (
            <div key={room._id} className="col-12 col-md-6 col-lg-4">
              <div className="card h-100 shadow-sm border-0">
                <div
                  className="card-img-top bg-secondary text-white d-flex align-items-center justify-content-center"
                  style={{ height: '180px', background: 'linear-gradient(135deg, #4e73df, #224abe)' }}
                >
                  <div className="text-center">
                    <div style={{ fontSize: '2.5rem' }}>🛏️</div>
                    <div className="fw-bold">Room {room.roomNumber}</div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="badge bg-primary-subtle text-primary">{room.category}</span>
                    <span className={`badge ${room.isAvailable ? 'bg-success' : 'bg-danger'}`}>
                      {room.isAvailable ? 'Available' : 'Occupied'}
                    </span>
                  </div>
                  <h5 className="card-title fw-bold">Room {room.roomNumber}</h5>
                  <p className="card-text text-muted small">
                    Comfortable stay with air conditioning, high-speed WiFi, room service, and deluxe bedding.
                  </p>
                  <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                    <div>
                      <span className="h5 fw-bold text-success">₹{room.pricePerNight?.toLocaleString()}</span>
                      <small className="text-muted"> / night</small>
                    </div>
                    {room.isAvailable ? (
                      <Link to="/dashboard" className="btn btn-sm btn-primary">
                        Book Now
                      </Link>
                    ) : (
                      <button className="btn btn-sm btn-secondary" disabled>
                        Occupied
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomList;

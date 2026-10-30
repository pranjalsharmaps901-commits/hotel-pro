import { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../redux/authSlice';
import API from '../api';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Navigation tab: 'dashboard' | 'rooms' | 'bookings'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Real Database Data
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Modals
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Form states
  const [roomForm, setRoomForm] = useState({
    roomNumber: '',
    category: 'Deluxe',
    pricePerNight: '',
    isAvailable: true,
  });

  const [bookingForm, setBookingForm] = useState({
    room: '',
    guestName: '',
    checkInDate: '',
    checkOutDate: '',
    paymentStatus: 'Paid',
  });

  // Filters
  const [roomAvailabilityFilter, setRoomAvailabilityFilter] = useState('All');
  const [roomCategoryFilter, setRoomCategoryFilter] = useState('All');

  // Load real data from Backend / MongoDB
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [roomsRes, bookingsRes] = await Promise.all([
        API.get('/rooms').catch((err) => {
          console.warn('Rooms fetch error:', err.message);
          return { data: [] };
        }),
        API.get('/bookings').catch((err) => {
          console.warn('Bookings fetch error:', err.message);
          return { data: [] };
        }),
      ]);

      setRooms(Array.isArray(roomsRes.data) ? roomsRes.data : []);
      setBookings(Array.isArray(bookingsRes.data) ? bookingsRes.data : []);
    } catch (err) {
      console.error('Dashboard data load error:', err);
      setError('Failed to load dashboard data. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute real statistics from database data
  const stats = useMemo(() => {
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter((r) => r.isAvailable).length;
    const totalBookings = bookings.length;
    const recentBookings = [...bookings].slice(0, 5);

    return {
      totalRooms,
      availableRooms,
      totalBookings,
      recentBookings,
    };
  }, [rooms, bookings]);

  // Handle Logout
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // Notification helper
  const notifySuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Add Room
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!roomForm.roomNumber || !roomForm.pricePerNight) {
      alert('Please fill out all required fields.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await API.post('/rooms', {
        roomNumber: roomForm.roomNumber,
        category: roomForm.category,
        pricePerNight: Number(roomForm.pricePerNight),
        isAvailable: roomForm.isAvailable,
      });

      setRooms([res.data, ...rooms]);
      setShowRoomModal(false);
      setRoomForm({ roomNumber: '', category: 'Deluxe', pricePerNight: '', isAvailable: true });
      notifySuccess(`Room ${res.data.roomNumber} created successfully!`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create room');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Room Availability
  const handleToggleRoomStatus = async (room) => {
    setActionLoading(true);
    try {
      const res = await API.put(`/rooms/${room._id}`, {
        isAvailable: !room.isAvailable,
      });
      setRooms(rooms.map((r) => (r._id === room._id ? res.data : r)));
      notifySuccess(`Room ${room.roomNumber} is now marked as ${res.data.isAvailable ? 'Available' : 'Occupied'}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update room');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Room
  const handleDeleteRoom = async (roomId, roomNumber) => {
    if (!window.confirm(`Are you sure you want to delete Room ${roomNumber}?`)) {
      return;
    }
    setActionLoading(true);
    try {
      await API.delete(`/rooms/${roomId}`);
      setRooms(rooms.filter((r) => r._id !== roomId));
      notifySuccess(`Room ${roomNumber} deleted successfully.`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete room');
    } finally {
      setActionLoading(false);
    }
  };

  // Add Booking
  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!bookingForm.room || !bookingForm.checkInDate || !bookingForm.checkOutDate) {
      alert('Please select a room and check-in/check-out dates.');
      return;
    }

    if (new Date(bookingForm.checkOutDate) <= new Date(bookingForm.checkInDate)) {
      alert('Check-out date must be after check-in date.');
      return;
    }

    setActionLoading(true);
    try {
      const selectedRoom = rooms.find((r) => r._id === bookingForm.room);
      const inDate = new Date(bookingForm.checkInDate);
      const outDate = new Date(bookingForm.checkOutDate);
      const nights = Math.max(1, Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24)));
      const calculatedPrice = selectedRoom ? nights * selectedRoom.pricePerNight : 0;

      const res = await API.post('/bookings', {
        room: bookingForm.room,
        checkInDate: bookingForm.checkInDate,
        checkOutDate: bookingForm.checkOutDate,
        totalPrice: calculatedPrice,
        paymentStatus: bookingForm.paymentStatus,
      });

      setBookings([res.data, ...bookings]);
      setShowBookingModal(false);
      setBookingForm({ room: '', guestName: '', checkInDate: '', checkOutDate: '', paymentStatus: 'Paid' });
      notifySuccess('Booking created successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create booking');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Booking Payment Status
  const handleTogglePaymentStatus = async (booking) => {
    setActionLoading(true);
    const newStatus = booking.paymentStatus === 'Paid' ? 'Pending' : 'Paid';
    try {
      const res = await API.put(`/bookings/${booking._id}`, {
        paymentStatus: newStatus,
      });
      setBookings(bookings.map((b) => (b._id === booking._id ? res.data : b)));
      notifySuccess(`Payment status updated to ${newStatus}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update payment status');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Booking
  const handleDeleteBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel and delete this booking?')) {
      return;
    }
    setActionLoading(true);
    try {
      await API.delete(`/bookings/${bookingId}`);
      setBookings(bookings.filter((b) => b._id !== bookingId));
      notifySuccess('Booking cancelled and removed successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete booking');
    } finally {
      setActionLoading(false);
    }
  };

  // Seed sample rooms in MongoDB if database is empty
  const handleSeedSampleRooms = async () => {
    if (!window.confirm('Do you want to add 4 sample rooms (Deluxe, Suite, Standard) to your MongoDB Atlas database?')) {
      return;
    }
    setActionLoading(true);
    try {
      const samples = [
        { roomNumber: '101', category: 'Standard', pricePerNight: 2500, isAvailable: true },
        { roomNumber: '102', category: 'Deluxe', pricePerNight: 4500, isAvailable: true },
        { roomNumber: '201', category: 'Suite', pricePerNight: 8000, isAvailable: true },
        { roomNumber: '202', category: 'Executive', pricePerNight: 12000, isAvailable: false },
      ];

      for (const sample of samples) {
        await API.post('/rooms', sample).catch(() => null);
      }

      await fetchData();
      notifySuccess('Sample rooms added to MongoDB Atlas!');
    } catch (err) {
      alert('Error creating sample rooms: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesCategory = roomCategoryFilter === 'All' || room.category === roomCategoryFilter;
      const matchesAvailability =
        roomAvailabilityFilter === 'All' ||
        (roomAvailabilityFilter === 'Available' && room.isAvailable) ||
        (roomAvailabilityFilter === 'Booked' && !room.isAvailable);
      return matchesCategory && matchesAvailability;
    });
  }, [rooms, roomCategoryFilter, roomAvailabilityFilter]);

  return (
    <div className="dashboard-wrapper container-fluid p-0">
      <div className="row g-0">
        {/* ===================== SIDEBAR ===================== */}
        <div className="col-12 col-md-3 col-lg-2 dashboard-sidebar shadow-sm">
          <div className="sidebar-brand d-flex align-items-center">
            <span className="me-2">🏨</span> Hotel Pro
          </div>

          {/* User Profile Snippet */}
          <div className="sidebar-user d-flex align-items-center gap-3">
            <div className="user-avatar shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <h6 className="mb-0 fw-bold text-truncate" title={user?.name || 'User'}>
                {user?.name || 'User'}
              </h6>
              <small className="badge bg-primary-subtle text-primary text-uppercase" style={{ fontSize: '0.7rem' }}>
                {user?.role || 'Guest'}
              </small>
            </div>
          </div>

          {/* Sidebar Navigation */}
          <nav className="sidebar-nav">
            <button
              className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span>📊</span>
              <span>Dashboard</span>
            </button>

            <button
              className={`nav-link ${activeTab === 'rooms' ? 'active' : ''}`}
              onClick={() => setActiveTab('rooms')}
            >
              <span>🛏️</span>
              <span className="flex-grow-1">Manage Rooms</span>
              {rooms.length > 0 && (
                <span className="badge bg-light text-dark rounded-pill">{rooms.length}</span>
              )}
            </button>

            <button
              className={`nav-link ${activeTab === 'bookings' ? 'active' : ''}`}
              onClick={() => setActiveTab('bookings')}
            >
              <span>📅</span>
              <span className="flex-grow-1">Bookings</span>
              {bookings.length > 0 && (
                <span className="badge bg-light text-dark rounded-pill">{bookings.length}</span>
              )}
            </button>

            <hr className="my-3" />

            <button className="nav-link logout-link" onClick={handleLogout}>
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </nav>
        </div>

        {/* ===================== MAIN CONTENT ===================== */}
        <div className="col-12 col-md-9 col-lg-10 dashboard-content">
          {/* Top Header / Welcome Banner */}
          <div className="dashboard-header bg-white p-4 rounded-3 shadow-sm border d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <h2 className="fw-bold mb-1" style={{ color: '#2e384d' }}>
                Welcome to dashboard {user?.name || 'User'}!
              </h2>
              <p className="text-muted mb-0">Here you can manage hotel rooms and bookings.</p>
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
                onClick={() => setShowRoomModal(true)}
              >
                <span>+</span> Add Room
              </button>
              <button
                className="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
                onClick={() => setShowBookingModal(true)}
                disabled={rooms.filter((r) => r.isAvailable).length === 0}
                title={
                  rooms.filter((r) => r.isAvailable).length === 0
                    ? 'Please add available rooms first'
                    : 'Create new reservation'
                }
              >
                <span>+</span> New Booking
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {successMessage && (
            <div className="alert alert-success alert-dismissible fade show shadow-sm" role="alert">
              <strong>Success!</strong> {successMessage}
              <button type="button" className="btn-close" onClick={() => setSuccessMessage(null)}></button>
            </div>
          )}

          {error && (
            <div className="alert alert-danger alert-dismissible fade show shadow-sm" role="alert">
              <strong>Error:</strong> {error}
              <button type="button" className="btn-close" onClick={() => setError(null)}></button>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading data...</span>
              </div>
              <p className="mt-2 text-muted">Connecting to database and retrieving data...</p>
            </div>
          )}

          {!loading && (
            <>
              {/* ===================== TAB 1: DASHBOARD OVERVIEW ===================== */}
              {activeTab === 'dashboard' && (
                <>
                  {/* Summary Cards */}
                  <div className="row g-3 mb-4">
                    {/* Total Rooms */}
                    <div className="col-12 col-sm-6 col-xl-3">
                      <div className="card stat-card border-primary-subtle p-3 h-100">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="text-xs fw-bold text-primary text-uppercase mb-1" style={{ fontSize: '0.8rem' }}>
                              Total Rooms
                            </div>
                            <div className="h3 mb-0 fw-bold text-gray-800">{stats.totalRooms}</div>
                            <small className="text-muted">In property inventory</small>
                          </div>
                          <div className="stat-icon">🏨</div>
                        </div>
                      </div>
                    </div>

                    {/* Available Rooms */}
                    <div className="col-12 col-sm-6 col-xl-3">
                      <div className="card stat-card border-success-subtle p-3 h-100">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="text-xs fw-bold text-success text-uppercase mb-1" style={{ fontSize: '0.8rem' }}>
                              Available Rooms
                            </div>
                            <div className="h3 mb-0 fw-bold text-gray-800">{stats.availableRooms}</div>
                            <small className="text-muted">Ready for booking</small>
                          </div>
                          <div className="stat-icon">🟢</div>
                        </div>
                      </div>
                    </div>

                    {/* Total Bookings */}
                    <div className="col-12 col-sm-6 col-xl-3">
                      <div className="card stat-card border-info-subtle p-3 h-100">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="text-xs fw-bold text-info text-uppercase mb-1" style={{ fontSize: '0.8rem' }}>
                              Total Bookings
                            </div>
                            <div className="h3 mb-0 fw-bold text-gray-800">{stats.totalBookings}</div>
                            <small className="text-muted">Reservations recorded</small>
                          </div>
                          <div className="stat-icon">📋</div>
                        </div>
                      </div>
                    </div>

                    {/* Recent Bookings count */}
                    <div className="col-12 col-sm-6 col-xl-3">
                      <div className="card stat-card border-warning-subtle p-3 h-100">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="text-xs fw-bold text-warning text-uppercase mb-1" style={{ fontSize: '0.8rem' }}>
                              Recent Bookings
                            </div>
                            <div className="h3 mb-0 fw-bold text-gray-800">{stats.recentBookings.length}</div>
                            <small className="text-muted">Latest reservations</small>
                          </div>
                          <div className="stat-icon">⏳</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Empty state hint if database has no rooms yet */}
                  {rooms.length === 0 && (
                    <div className="card content-card p-4 text-center mb-4 border-warning">
                      <div className="empty-state-icon">🏨</div>
                      <h5 className="fw-bold">No Rooms In Database Yet</h5>
                      <p className="text-muted mx-auto" style={{ maxWidth: '500px' }}>
                        Your MongoDB Atlas database is connected, but there are no rooms configured yet. Add your first room or populate sample rooms to see full statistics in action.
                      </p>
                      <div className="d-flex justify-content-center gap-2 mt-2">
                        <button className="btn btn-primary btn-sm" onClick={() => setShowRoomModal(true)}>
                          + Add First Room
                        </button>
                        <button className="btn btn-outline-secondary btn-sm" onClick={handleSeedSampleRooms} disabled={actionLoading}>
                          {actionLoading ? 'Adding...' : '⚡ Seed 4 Sample Rooms'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Recent Bookings Table */}
                  <div className="card content-card shadow-sm">
                    <div className="card-header d-flex justify-content-between align-items-center py-3">
                      <h5 className="mb-0 fw-bold text-dark">Recent Bookings</h5>
                      <button className="btn btn-sm btn-link text-decoration-none" onClick={() => setActiveTab('bookings')}>
                        View All Bookings &rarr;
                      </button>
                    </div>
                    <div className="card-body p-0">
                      {stats.recentBookings.length === 0 ? (
                        <div className="empty-state">
                          <div className="empty-state-icon">📭</div>
                          <p className="mb-2">No bookings recorded in the database yet.</p>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setShowBookingModal(true)}
                            disabled={rooms.filter((r) => r.isAvailable).length === 0}
                          >
                            + Create First Booking
                          </button>
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-hover align-middle mb-0">
                            <thead>
                              <tr>
                                <th>Guest</th>
                                <th>Room</th>
                                <th>Check-In</th>
                                <th>Check-Out</th>
                                <th>Total</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stats.recentBookings.map((b) => (
                                <tr key={b._id}>
                                  <td>
                                    <div className="fw-bold">{b.user?.name || 'Guest User'}</div>
                                    <small className="text-muted">{b.user?.email || '-'}</small>
                                  </td>
                                  <td>
                                    <span className="badge bg-dark me-1">#{b.room?.roomNumber || 'N/A'}</span>
                                    <small className="text-muted">{b.room?.category || ''}</small>
                                  </td>
                                  <td>{new Date(b.checkInDate).toLocaleDateString()}</td>
                                  <td>{new Date(b.checkOutDate).toLocaleDateString()}</td>
                                  <td className="fw-bold text-success">₹{b.totalPrice?.toLocaleString()}</td>
                                  <td>
                                    <span
                                      className={`badge ${
                                        b.paymentStatus === 'Paid' ? 'bg-success' : 'bg-warning text-dark'
                                      }`}
                                    >
                                      {b.paymentStatus}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rooms Status Quick Glance */}
                  {rooms.length > 0 && (
                    <div className="card content-card shadow-sm">
                      <div className="card-header d-flex justify-content-between align-items-center py-3">
                        <h5 className="mb-0 fw-bold text-dark">Room Inventory Snapshot</h5>
                        <button className="btn btn-sm btn-link text-decoration-none" onClick={() => setActiveTab('rooms')}>
                          Manage All Rooms &rarr;
                        </button>
                      </div>
                      <div className="card-body">
                        <div className="row g-3">
                          {rooms.slice(0, 6).map((r) => (
                            <div key={r._id} className="col-12 col-sm-6 col-md-4">
                              <div className="p-3 border rounded-3 bg-light d-flex justify-content-between align-items-center">
                                <div>
                                  <div className="fw-bold">Room {r.roomNumber}</div>
                                  <small className="text-muted">{r.category} • ₹{r.pricePerNight}/night</small>
                                </div>
                                <span className={`badge ${r.isAvailable ? 'bg-success' : 'bg-danger'}`}>
                                  {r.isAvailable ? 'Available' : 'Occupied'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ===================== TAB 2: MANAGE ROOMS ===================== */}
              {activeTab === 'rooms' && (
                <div className="card content-card shadow-sm">
                  <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 py-3">
                    <h5 className="mb-0 fw-bold text-dark">Manage Hotel Rooms</h5>
                    <div className="d-flex flex-wrap gap-2">
                      <select
                        className="form-select form-select-sm"
                        style={{ width: 'auto' }}
                        value={roomCategoryFilter}
                        onChange={(e) => setRoomCategoryFilter(e.target.value)}
                      >
                        <option value="All">All Categories</option>
                        <option value="Standard">Standard</option>
                        <option value="Single">Single</option>
                        <option value="Double">Double</option>
                        <option value="Deluxe">Deluxe</option>
                        <option value="Suite">Suite</option>
                        <option value="Executive">Executive</option>
                      </select>

                      <select
                        className="form-select form-select-sm"
                        style={{ width: 'auto' }}
                        value={roomAvailabilityFilter}
                        onChange={(e) => setRoomAvailabilityFilter(e.target.value)}
                      >
                        <option value="All">All Statuses</option>
                        <option value="Available">Available</option>
                        <option value="Booked">Occupied</option>
                      </select>

                      <button className="btn btn-primary btn-sm" onClick={() => setShowRoomModal(true)}>
                        + Add Room
                      </button>
                    </div>
                  </div>

                  <div className="card-body p-0">
                    {filteredRooms.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-state-icon">🏨</div>
                        <p className="mb-2">No rooms match your filter criteria.</p>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => setShowRoomModal(true)}>
                          + Add a New Room
                        </button>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                          <thead>
                            <tr>
                              <th>Room #</th>
                              <th>Category</th>
                              <th>Price Per Night</th>
                              <th>Status</th>
                              <th className="text-end">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredRooms.map((r) => (
                              <tr key={r._id}>
                                <td className="fw-bold">Room {r.roomNumber}</td>
                                <td>
                                  <span className="badge bg-secondary-subtle text-secondary">{r.category}</span>
                                </td>
                                <td className="fw-bold">₹{r.pricePerNight?.toLocaleString()}</td>
                                <td>
                                  <span className={`badge ${r.isAvailable ? 'bg-success' : 'bg-danger'}`}>
                                    {r.isAvailable ? 'Available' : 'Occupied'}
                                  </span>
                                </td>
                                <td className="text-end">
                                  <button
                                    className="btn btn-sm btn-outline-secondary me-2"
                                    onClick={() => handleToggleRoomStatus(r)}
                                    disabled={actionLoading}
                                    title="Toggle room availability status"
                                  >
                                    {r.isAvailable ? 'Mark Occupied' : 'Mark Available'}
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleDeleteRoom(r._id, r.roomNumber)}
                                    disabled={actionLoading}
                                    title="Delete this room"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ===================== TAB 3: BOOKINGS ===================== */}
              {activeTab === 'bookings' && (
                <div className="card content-card shadow-sm">
                  <div className="card-header d-flex justify-content-between align-items-center py-3">
                    <h5 className="mb-0 fw-bold text-dark">Bookings & Reservations</h5>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowBookingModal(true)}
                      disabled={rooms.filter((r) => r.isAvailable).length === 0}
                    >
                      + New Booking
                    </button>
                  </div>

                  <div className="card-body p-0">
                    {bookings.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <p className="mb-2">No bookings recorded yet in MongoDB Atlas.</p>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => setShowBookingModal(true)}
                          disabled={rooms.filter((r) => r.isAvailable).length === 0}
                        >
                          + Create Reservation
                        </button>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                          <thead>
                            <tr>
                              <th>Guest</th>
                              <th>Room</th>
                              <th>Check-In</th>
                              <th>Check-Out</th>
                              <th>Total Amount</th>
                              <th>Payment</th>
                              <th className="text-end">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bookings.map((b) => (
                              <tr key={b._id}>
                                <td>
                                  <div className="fw-bold">{b.user?.name || 'Guest User'}</div>
                                  <small className="text-muted">{b.user?.email || '-'}</small>
                                </td>
                                <td>
                                  <span className="badge bg-dark me-1">#{b.room?.roomNumber || 'N/A'}</span>
                                  <small className="text-muted">{b.room?.category || ''}</small>
                                </td>
                                <td>{new Date(b.checkInDate).toLocaleDateString()}</td>
                                <td>{new Date(b.checkOutDate).toLocaleDateString()}</td>
                                <td className="fw-bold text-success">₹{b.totalPrice?.toLocaleString()}</td>
                                <td>
                                  <span
                                    className={`badge ${
                                      b.paymentStatus === 'Paid' ? 'bg-success' : 'bg-warning text-dark'
                                    }`}
                                  >
                                    {b.paymentStatus}
                                  </span>
                                </td>
                                <td className="text-end">
                                  <button
                                    className="btn btn-sm btn-outline-secondary me-2"
                                    onClick={() => handleTogglePaymentStatus(b)}
                                    disabled={actionLoading}
                                  >
                                    Mark {b.paymentStatus === 'Paid' ? 'Pending' : 'Paid'}
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleDeleteBooking(b._id)}
                                    disabled={actionLoading}
                                  >
                                    Cancel
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ===================== MODAL: ADD ROOM ===================== */}
      {showRoomModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Add New Hotel Room</h5>
                <button type="button" className="btn-close" onClick={() => setShowRoomModal(false)}></button>
              </div>
              <form onSubmit={handleCreateRoom}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Room Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 101, 202, 305"
                      value={roomForm.roomNumber}
                      onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Category *</label>
                    <select
                      className="form-select"
                      value={roomForm.category}
                      onChange={(e) => setRoomForm({ ...roomForm, category: e.target.value })}
                    >
                      <option value="Standard">Standard</option>
                      <option value="Single">Single</option>
                      <option value="Double">Double</option>
                      <option value="Deluxe">Deluxe</option>
                      <option value="Suite">Suite</option>
                      <option value="Executive">Executive</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Price Per Night (₹) *</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 3500"
                      min="0"
                      value={roomForm.pricePerNight}
                      onChange={(e) => setRoomForm({ ...roomForm, pricePerNight: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-check mb-2">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="roomAvailableCheck"
                      checked={roomForm.isAvailable}
                      onChange={(e) => setRoomForm({ ...roomForm, isAvailable: e.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="roomAvailableCheck">
                      Room is immediately available for bookings
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowRoomModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                    {actionLoading ? 'Saving...' : 'Save Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: CREATE BOOKING ===================== */}
      {showBookingModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Create New Reservation</h5>
                <button type="button" className="btn-close" onClick={() => setShowBookingModal(false)}></button>
              </div>
              <form onSubmit={handleCreateBooking}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Select Available Room *</label>
                    <select
                      className="form-select"
                      value={bookingForm.room}
                      onChange={(e) => setBookingForm({ ...bookingForm, room: e.target.value })}
                      required
                    >
                      <option value="">-- Choose a room --</option>
                      {rooms
                        .filter((r) => r.isAvailable)
                        .map((r) => (
                          <option key={r._id} value={r._id}>
                            Room {r.roomNumber} ({r.category}) - ₹{r.pricePerNight}/night
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold">Check-In Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={bookingForm.checkInDate}
                        onChange={(e) => setBookingForm({ ...bookingForm, checkInDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold">Check-Out Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={bookingForm.checkOutDate}
                        onChange={(e) => setBookingForm({ ...bookingForm, checkOutDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Payment Status</label>
                    <select
                      className="form-select"
                      value={bookingForm.paymentStatus}
                      onChange={(e) => setBookingForm({ ...bookingForm, paymentStatus: e.target.value })}
                    >
                      <option value="Paid">Paid</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowBookingModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                    {actionLoading ? 'Booking...' : 'Confirm Booking'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

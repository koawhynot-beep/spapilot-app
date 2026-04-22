import { useState, useEffect } from 'react';
import {
  Calendar, Users, Package, LayoutDashboard, Clock, AlertTriangle,
  CheckCircle, RefreshCw, Bell, User, ShieldCheck, Send, Home, Inbox,
} from 'lucide-react';
import './App.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function useFetch(url) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(load, [url]);
  return { data, loading, error, reload: load };
}

// ---- Shared UI ----

function Avatar({ initial, color, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: '#fff', fontWeight: 700,
      fontSize: size * 0.4, flexShrink: 0,
    }}>
      {initial}
    </div>
  );
}

function StatusBadge({ label, type }) {
  const colors = {
    success: { bg: '#d1fae5', text: '#065f46' },
    warning: { bg: '#fef3c7', text: '#92400e' },
    error:   { bg: '#fee2e2', text: '#991b1b' },
    info:    { bg: '#dbeafe', text: '#1e40af' },
    pending: { bg: '#f3f4f6', text: '#374151' },
  };
  const c = colors[type] || colors.info;
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 12, fontSize: 12,
      fontWeight: 600, background: c.bg, color: c.text,
    }}>
      {label}
    </span>
  );
}

function Card({ title, children, style }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: 20,
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)', ...style,
    }}>
      {title && <h3 style={{ margin: '0 0 14px', fontSize: 15, color: '#374151' }}>{title}</h3>}
      {children}
    </div>
  );
}

function LoadState({ loading, error, reload, children }) {
  if (loading) return (
    <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
      <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
      <div style={{ marginTop: 8, fontSize: 13 }}>Loading…</div>
    </div>
  );
  if (error) return (
    <div style={{ textAlign: 'center', padding: 32, color: '#ef4444' }}>
      <AlertTriangle size={20} />
      <div style={{ marginTop: 8, fontSize: 13 }}>Error: {error}</div>
      <button onClick={reload} style={{
        marginTop: 10, padding: '6px 14px', borderRadius: 8, border: '1px solid #ef4444',
        background: '#fff', color: '#ef4444', cursor: 'pointer', fontSize: 13,
      }}>Retry</button>
    </div>
  );
  return children;
}

// ---- Manager Tabs ----

function Dashboard({ staff, bookings, inventory }) {
  const lowStock = inventory.filter(i => i.stock <= i.threshold);

  const stats = [
    { label: "Today's Bookings", value: bookings.length, icon: <Calendar size={20} />, color: '#d4a574' },
    { label: 'Active Staff',     value: staff.length,    icon: <Users size={20} />,    color: '#a8c5a0' },
    { label: 'Low Stock Alerts', value: lowStock.length, icon: <Package size={20} />,  color: lowStock.length > 0 ? '#f87171' : '#a8c5a0' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {stats.map(s => (
          <Card key={s.label}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: s.color + '22', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: s.color,
              }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{s.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Upcoming Bookings">
          {bookings.slice(0, 5).map(b => {
            const member = staff.find(s => s.id === b.staffId);
            return (
              <div key={b.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', borderBottom: '1px solid #f3f4f6',
              }}>
                <div style={{ color: '#d4a574', fontWeight: 600, fontSize: 13, minWidth: 46 }}>
                  <Clock size={12} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                  {b.time}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{b.client}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{b.treatment} · {b.duration}min</div>
                </div>
                {member && <Avatar initial={member.avatar} color={member.color} size={28} />}
              </div>
            );
          })}
        </Card>

        <Card title="Inventory Alerts">
          {lowStock.length === 0
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#059669', fontSize: 13 }}>
                <CheckCircle size={16} /> All stock levels OK
              </div>
            : lowStock.map(item => (
              <div key={item.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: '1px solid #f3f4f6',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {item.stock} {item.unit} left · threshold: {item.threshold}
                  </div>
                </div>
                <StatusBadge label="Low Stock" type="warning" />
              </div>
            ))
          }
        </Card>
      </div>
    </div>
  );
}

function ScheduleView({ data, staff, loading, error, reload }) {
  return (
    <Card title="Today's Schedule">
      <LoadState loading={loading} error={error} reload={reload}>
        {data.length === 0
          ? <div style={{ color: '#9ca3af', fontSize: 13 }}>No bookings today.</div>
          : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6', color: '#6b7280', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px' }}>Time</th>
                <th style={{ padding: '8px 12px' }}>Client</th>
                <th style={{ padding: '8px 12px' }}>Treatment</th>
                <th style={{ padding: '8px 12px' }}>Duration</th>
                <th style={{ padding: '8px 12px' }}>Therapist</th>
                <th style={{ padding: '8px 12px' }}>Notes</th>
                <th style={{ padding: '8px 12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map(b => {
                const member = staff.find(s => s.id === b.staffId);
                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#d4a574' }}>{b.time}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{b.client}</td>
                    <td style={{ padding: '10px 12px', color: '#374151' }}>{b.treatment}</td>
                    <td style={{ padding: '10px 12px', color: '#6b7280' }}>{b.duration}min</td>
                    <td style={{ padding: '10px 12px' }}>
                      {member
                        ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar initial={member.avatar} color={member.color} size={26} />
                            <span>{member.name}</span>
                          </div>
                        : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 13 }}>{b.notes || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <StatusBadge label={b.status} type="success" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        }
      </LoadState>
    </Card>
  );
}

function AlertsView({ inventory, requests, inventoryLoading, requestsLoading }) {
  const lowStock = inventory.filter(i => i.stock <= i.threshold);
  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card title={`Stock Alerts (${lowStock.length})`}>
        {inventoryLoading
          ? <LoadState loading={true} />
          : lowStock.length === 0
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#059669', fontSize: 13 }}>
                <CheckCircle size={16} /> All stock levels OK
              </div>
            : lowStock.map(item => (
              <div key={item.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid #f3f4f6',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {item.stock} {item.unit} remaining · Threshold: {item.threshold} · Supplier: {item.supplier}
                  </div>
                </div>
                <StatusBadge label="Reorder Needed" type="warning" />
              </div>
            ))
        }
      </Card>

      <Card title={`Staff Requests (${pendingRequests.length} pending)`}>
        {requestsLoading
          ? <LoadState loading={true} />
          : pendingRequests.length === 0
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#059669', fontSize: 13 }}>
                <CheckCircle size={16} /> No pending requests
              </div>
            : pendingRequests.map(req => (
              <div key={req.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid #f3f4f6',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>
                    {req.type === 'dayoff' ? 'Day Off' : req.type === 'sick' ? 'Sick Day' : 'Shift Swap'} · Staff #{req.staffId}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {req.date && `${req.date} · `}
                    {req.reason || 'No reason given'}
                  </div>
                </div>
                <StatusBadge label="Pending" type="pending" />
              </div>
            ))
        }
      </Card>
    </div>
  );
}

function StaffPanel({ data, loading, error, reload }) {
  return (
    <Card title="Staff Members">
      <LoadState loading={loading} error={error} reload={reload}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {data.map(member => (
            <div key={member.id} style={{
              border: '1px solid #f3f4f6', borderRadius: 10, padding: 16,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <Avatar initial={member.avatar} color={member.color} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{member.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{member.role}</div>
                {member.birthday && (
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>
                    Birthday: {new Date(member.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                )}
                <StatusBadge label="Available" type="success" />
              </div>
            </div>
          ))}
        </div>
      </LoadState>
    </Card>
  );
}

function StockView({ data, loading, error, reload }) {
  return (
    <Card title="Inventory Management">
      <LoadState loading={loading} error={error} reload={reload}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f3f4f6', color: '#6b7280', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Item</th>
              <th style={{ padding: '8px 12px' }}>Category</th>
              <th style={{ padding: '8px 12px' }}>Stock</th>
              <th style={{ padding: '8px 12px' }}>Threshold</th>
              <th style={{ padding: '8px 12px' }}>Supplier</th>
              <th style={{ padding: '8px 12px' }}>Last Order</th>
              <th style={{ padding: '8px 12px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{item.name}</td>
                <td style={{ padding: '10px 12px', color: '#6b7280' }}>{item.category}</td>
                <td style={{ padding: '10px 12px' }}>{item.stock} {item.unit}</td>
                <td style={{ padding: '10px 12px', color: '#6b7280' }}>{item.threshold}</td>
                <td style={{ padding: '10px 12px', color: '#6b7280' }}>{item.supplier}</td>
                <td style={{ padding: '10px 12px', color: '#6b7280' }}>{item.lastOrder || '—'}</td>
                <td style={{ padding: '10px 12px' }}>
                  <StatusBadge
                    label={item.stock <= item.threshold ? 'Low Stock' : 'OK'}
                    type={item.stock <= item.threshold ? 'warning' : 'success'}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </LoadState>
    </Card>
  );
}

function SOPView() {
  const sops = [
    { id: 1, title: 'Client Greeting Protocol',  category: 'Reception'  },
    { id: 2, title: 'Treatment Room Setup',       category: 'Operations' },
    { id: 3, title: 'Sanitation Standards',       category: 'Hygiene'    },
    { id: 4, title: 'Inventory Check Procedure',  category: 'Operations' },
    { id: 5, title: 'Emergency Protocols',        category: 'Safety'     },
  ];

  return (
    <Card title="Standard Operating Procedures">
      <div style={{
        marginBottom: 16, padding: '10px 14px', background: '#fef3c7',
        borderRadius: 8, fontSize: 13, color: '#92400e',
      }}>
        <AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
        SOP management with staff acknowledgements coming in next phase (database + auth).
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sops.map(sop => (
          <div key={sop.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', border: '1px solid #f3f4f6', borderRadius: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ShieldCheck size={18} color="#d4a574" />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{sop.title}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{sop.category}</div>
              </div>
            </div>
            <StatusBadge label="Active" type="success" />
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---- Staff View Tabs ----

function TodayView({ bookings, staff, staffId }) {
  const myBookings = bookings.filter(b => b.staffId === staffId);
  const me = staff.find(s => s.id === staffId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {me && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Avatar initial={me.avatar} color={me.color} size={52} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
                Good morning, {me.name.split(' ')[0]}!
              </div>
              <div style={{ fontSize: 14, color: '#6b7280' }}>
                {me.role} · {myBookings.length} sessions today
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card title="Your Sessions Today">
        {myBookings.length === 0
          ? <div style={{ color: '#9ca3af', fontSize: 13 }}>No sessions scheduled today.</div>
          : myBookings.map(b => (
            <div key={b.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              padding: '12px 0', borderBottom: '1px solid #f3f4f6',
            }}>
              <div style={{ textAlign: 'center', minWidth: 52, color: '#d4a574', fontWeight: 700, fontSize: 15 }}>
                {b.time}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{b.client}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                  {b.treatment} · {b.duration} min
                </div>
                {b.notes && (
                  <div style={{
                    fontSize: 12, color: '#92400e', background: '#fef3c7',
                    padding: '3px 8px', borderRadius: 6, display: 'inline-block',
                  }}>
                    Note: {b.notes}
                  </div>
                )}
              </div>
              <StatusBadge label={b.status} type="success" />
            </div>
          ))
        }
      </Card>
    </div>
  );
}

function StaffScheduleView({ bookings, staffId }) {
  const myBookings = bookings.filter(b => b.staffId === staffId);

  return (
    <Card title="My Schedule">
      {myBookings.length === 0
        ? <div style={{ color: '#9ca3af', fontSize: 13 }}>No upcoming sessions.</div>
        : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f3f4f6', color: '#6b7280', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Time</th>
              <th style={{ padding: '8px 12px' }}>Client</th>
              <th style={{ padding: '8px 12px' }}>Treatment</th>
              <th style={{ padding: '8px 12px' }}>Duration</th>
              <th style={{ padding: '8px 12px' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {myBookings.map(b => (
              <tr key={b.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#d4a574' }}>{b.time}</td>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{b.client}</td>
                <td style={{ padding: '10px 12px', color: '#374151' }}>{b.treatment}</td>
                <td style={{ padding: '10px 12px', color: '#6b7280' }}>{b.duration}min</td>
                <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 13 }}>{b.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    </Card>
  );
}

function InboxView({ staffId, requests, onSubmitRequest }) {
  const [form, setForm] = useState({ type: 'dayoff', date: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const myRequests = requests.filter(r => r.staffId === staffId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmitRequest({ ...form, staffId });
    setSubmitting(false);
    setSubmitted(true);
    setForm({ type: 'dayoff', date: '', reason: '' });
    setTimeout(() => setSubmitted(false), 3000);
  };

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid #d1d5db', fontSize: 14, color: '#111827', fontFamily: 'inherit',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card title="Submit a Request">
        {submitted && (
          <div style={{
            marginBottom: 14, padding: '10px 14px', background: '#d1fae5',
            borderRadius: 8, fontSize: 13, color: '#065f46',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <CheckCircle size={16} /> Request submitted successfully!
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
              Request Type
            </label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inputStyle}>
              <option value="dayoff">Day Off</option>
              <option value="sick">Sick Day</option>
              <option value="swap">Shift Swap</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
              Date
            </label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
              Reason (optional)
            </label>
            <textarea
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              rows={3}
              placeholder="Add any details…"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '10px 20px', borderRadius: 8, border: 'none',
              background: '#d4a574', color: '#fff', fontWeight: 600, fontSize: 14,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
            }}
          >
            <Send size={15} />
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
        </form>
      </Card>

      <Card title="My Requests">
        {myRequests.length === 0
          ? <div style={{ color: '#9ca3af', fontSize: 13 }}>No requests submitted yet.</div>
          : myRequests.map(req => (
            <div key={req.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid #f3f4f6',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {req.type === 'dayoff' ? 'Day Off' : req.type === 'sick' ? 'Sick Day' : 'Shift Swap'} Request
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  {req.date && `${req.date} · `}
                  {new Date(req.createdAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </div>
                {req.reason && <div style={{ fontSize: 12, color: '#6b7280' }}>{req.reason}</div>}
              </div>
              <StatusBadge label={req.status} type="pending" />
            </div>
          ))
        }
      </Card>
    </div>
  );
}

function ProfileView({ staff, staffId }) {
  const me = staff.find(s => s.id === staffId);
  if (!me) return null;

  return (
    <Card title="My Profile">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
        <Avatar initial={me.avatar} color={me.color} size={72} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{me.name}</div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>{me.role}</div>
          </div>
          {me.birthday && (
            <div style={{ fontSize: 14, color: '#374151' }}>
              <span style={{ color: '#6b7280', marginRight: 8 }}>Birthday:</span>
              {new Date(me.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          )}
          <StatusBadge label="Active" type="success" />
        </div>
      </div>
    </Card>
  );
}

// ---- Nav config ----

const MANAGER_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'schedule',  label: 'Schedule',  icon: Calendar },
  { id: 'alerts',    label: 'Alerts',    icon: Bell },
  { id: 'staff',     label: 'Staff',     icon: Users },
  { id: 'stock',     label: 'Stock',     icon: Package },
  { id: 'sop',       label: 'SOP',       icon: ShieldCheck },
];

const STAFF_NAV = [
  { id: 'today',    label: 'Today',    icon: Home },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'inbox',    label: 'Inbox',    icon: Inbox },
  { id: 'profile',  label: 'Profile',  icon: User },
];

// ---- App ----

export default function App() {
  const [activeView, setActiveView] = useState('manager');
  const [managerTab, setManagerTab] = useState('dashboard');
  const [staffTab, setStaffTab] = useState('today');
  const [currentStaffId, setCurrentStaffId] = useState(1);

  const staffFetch     = useFetch(`${API}/api/staff`);
  const bookingsFetch  = useFetch(`${API}/api/bookings`);
  const inventoryFetch = useFetch(`${API}/api/inventory`);
  const requestsFetch  = useFetch(`${API}/api/requests`);

  const submitRequest = async (data) => {
    try {
      await fetch(`${API}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      requestsFetch.reload();
    } catch (e) {
      console.error('Failed to submit request:', e);
    }
  };

  const isManagerView = activeView === 'manager';
  const nav = isManagerView ? MANAGER_NAV : STAFF_NAV;
  const activeTab = isManagerView ? managerTab : staffTab;
  const setTab = isManagerView ? setManagerTab : setStaffTab;

  const lowStockCount = inventoryFetch.data.filter(i => i.stock <= i.threshold).length;
  const pendingCount  = requestsFetch.data.filter(r => r.status === 'pending').length;
  const alertBadge    = lowStockCount + pendingCount;

  const allLoading = staffFetch.loading || bookingsFetch.loading || inventoryFetch.loading;
  const anyError   = staffFetch.error || bookingsFetch.error || inventoryFetch.error;
  const reloadAll  = () => {
    staffFetch.reload();
    bookingsFetch.reload();
    inventoryFetch.reload();
    requestsFetch.reload();
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif", background: '#f9fafb' }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        button, select, input, textarea { font-family: inherit; }
      `}</style>

      {/* Sidebar */}
      <aside style={{
        width: 230, background: '#fff', borderRight: '1px solid #f3f4f6',
        display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0,
      }}>
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#d4a574' }}>SpaPilot</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>Management Suite</div>
        </div>

        {/* View toggle */}
        <div style={{ padding: '14px 12px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
            {['manager', 'staff'].map(v => (
              <button
                key={v}
                onClick={() => setActiveView(v)}
                style={{
                  flex: 1, padding: '7px 0', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                  background: activeView === v ? '#d4a574' : '#fff',
                  color: activeView === v ? '#fff' : '#6b7280',
                }}
              >
                {v}
              </button>
            ))}
          </div>

          {!isManagerView && staffFetch.data.length > 0 && (
            <select
              value={currentStaffId}
              onChange={e => setCurrentStaffId(Number(e.target.value))}
              style={{
                width: '100%', marginTop: 8, padding: '6px 8px', borderRadius: 6,
                border: '1px solid #e5e7eb', fontSize: 12, color: '#374151', background: '#f9fafb',
              }}
            >
              {staffFetch.data.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ padding: '12px 10px', flex: 1 }}>
          {nav.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            const badge = item.id === 'alerts' ? alertBadge : 0;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: active ? '#fef3c7' : 'transparent',
                  color: active ? '#92400e' : '#6b7280',
                  fontWeight: active ? 600 : 400, fontSize: 14, marginBottom: 4,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon size={17} />
                  {item.label}
                </span>
                {badge > 0 && (
                  <span style={{
                    background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700,
                    borderRadius: 10, padding: '1px 6px', minWidth: 18, textAlign: 'center',
                  }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6', fontSize: 11, color: '#d1d5db' }}>
          v1.0 · In-memory mode
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: 28, overflow: 'auto' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ margin: '0 0 22px', fontSize: 22, fontWeight: 700, color: '#111827' }}>
            {nav.find(n => n.id === activeTab)?.label || activeTab}
          </h2>

          {/* Manager view */}
          {isManagerView && (
            <>
              {managerTab === 'dashboard' && (
                <LoadState loading={allLoading} error={anyError} reload={reloadAll}>
                  <Dashboard
                    staff={staffFetch.data}
                    bookings={bookingsFetch.data}
                    inventory={inventoryFetch.data}
                  />
                </LoadState>
              )}
              {managerTab === 'schedule' && (
                <ScheduleView {...bookingsFetch} staff={staffFetch.data} />
              )}
              {managerTab === 'alerts' && (
                <AlertsView
                  inventory={inventoryFetch.data}
                  requests={requestsFetch.data}
                  inventoryLoading={inventoryFetch.loading}
                  requestsLoading={requestsFetch.loading}
                />
              )}
              {managerTab === 'staff' && <StaffPanel {...staffFetch} />}
              {managerTab === 'stock' && <StockView {...inventoryFetch} />}
              {managerTab === 'sop' && <SOPView />}
            </>
          )}

          {/* Staff view */}
          {!isManagerView && (
            <LoadState
              loading={staffFetch.loading || bookingsFetch.loading}
              error={staffFetch.error || bookingsFetch.error}
              reload={reloadAll}
            >
              <>
                {staffTab === 'today' && (
                  <TodayView
                    bookings={bookingsFetch.data}
                    staff={staffFetch.data}
                    staffId={currentStaffId}
                  />
                )}
                {staffTab === 'schedule' && (
                  <StaffScheduleView
                    bookings={bookingsFetch.data}
                    staffId={currentStaffId}
                  />
                )}
                {staffTab === 'inbox' && (
                  <InboxView
                    staffId={currentStaffId}
                    requests={requestsFetch.data}
                    onSubmitRequest={submitRequest}
                  />
                )}
                {staffTab === 'profile' && (
                  <ProfileView
                    staff={staffFetch.data}
                    staffId={currentStaffId}
                  />
                )}
              </>
            </LoadState>
          )}
        </div>
      </main>
    </div>
  );
}

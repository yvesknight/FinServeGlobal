import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  Target, 
  BarChart3, 
  Bell, 
  LogOut, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Plus,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

// --- Types ---
enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  TEAM_LEAD = 'TEAM_LEAD',
  HR_MANAGER = 'HR_MANAGER',
  ADMIN = 'ADMIN'
}

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  totalLeave: number;
  usedLeave: number;
}

// --- Auth Provider Hook Pattern ---
function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({ uid: firebaseUser.uid, ...userDoc.data() } as UserProfile);
        } else {
          // Initialize new user if not exists
          const newUser: UserProfile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'New Employee',
            email: firebaseUser.email || '',
            role: UserRole.EMPLOYEE,
            department: 'Unassigned',
            totalLeave: 24,
            usedLeave: 0
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
  }, []);

  const login = () => signInWithPopup(auth, new GoogleAuthProvider());
  const logout = () => signOut(auth);

  return { user, loading, login, logout };
}

// --- Main App Component ---
export default function App() {
  const { user, loading, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card max-w-md w-full p-8 text-center"
        >
          <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Users size={32} />
          </div>
          <h1 className="text-3xl font-bold font-display mb-2">FinServe EPLMS</h1>
          <p className="text-slate-500 mb-8">Employee Performance & Leave Management System</p>
          <button onClick={login} className="btn-primary w-full py-3 text-lg">
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-10">
        <div className="p-6">
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <div className="bg-primary-500 p-1.5 rounded-lg">
              <Users size={20} />
            </div>
            FinServe
          </h2>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2">
          <SidebarItem 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            icon={<BarChart3 size={20} />} 
            label="Dashboard" 
          />
          <SidebarItem 
            active={activeTab === 'leave'} 
            onClick={() => setActiveTab('leave')} 
            icon={<Calendar size={20} />} 
            label="Leave Management" 
          />
          <SidebarItem 
            active={activeTab === 'performance'} 
            onClick={() => setActiveTab('performance')} 
            icon={<Target size={20} />} 
            label="Performance" 
          />
          {(user.role === UserRole.HR_MANAGER || user.role === UserRole.ADMIN) && (
            <SidebarItem 
              active={activeTab === 'reports'} 
              onClick={() => setActiveTab('reports')} 
              icon={<Users size={20} />} 
              label="Employee Directory" 
            />
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl mb-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center font-bold text-lg">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{user.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button onClick={logout} className="w-full btn-secondary bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold font-display">
              {activeTab === 'dashboard' && 'Welcome Back,'}
              {activeTab === 'leave' && 'Leave Management'}
              {activeTab === 'performance' && 'Performance Reviews'}
              {activeTab === 'reports' && 'Employee Directory'}
            </h1>
            <p className="text-slate-500 mt-1">
              {activeTab === 'dashboard' && 'Here is what\'s happening in your department today.'}
              {activeTab === 'leave' && 'Submit, track and manage your time off requests.'}
              {activeTab === 'performance' && 'Track goals and complete performance reviews.'}
              {activeTab === 'reports' && 'Manage employee profiles and roles.'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-lg border border-slate-200 relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && <DashboardView user={user} />}
          {activeTab === 'leave' && <LeaveView user={user} />}
          {activeTab === 'performance' && <PerformanceView user={user} />}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Sub-components ---

function SidebarItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active 
          ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function DashboardView({ user }: { user: UserProfile }) {
  const [stats, setStats] = useState({ pendingLeave: 0, activeGoals: 0 });

  useEffect(() => {
    const qLeave = query(collection(db, 'leave_requests'), where('employeeId', '==', user.uid), where('status', '==', 'PENDING'));
    const unsubLeave = onSnapshot(qLeave, (snap) => setStats(prev => ({ ...prev, pendingLeave: snap.size })));
    
    const qGoals = query(collection(db, 'performance_goals'), where('employeeId', '==', user.uid), where('status', '!=', 'COMPLETED'));
    const unsubGoals = onSnapshot(qGoals, (snap) => setStats(prev => ({ ...prev, activeGoals: snap.size })));

    return () => { unsubLeave(); unsubGoals(); };
  }, [user.uid]);

  const leaveData = [
    { name: 'Used', value: user.usedLeave },
    { name: 'Remaining', value: user.totalLeave - user.usedLeave }
  ];
  
  const COLORS = ['#3b82f6', '#e2e8f0'];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 border-l-4 border-l-primary-500">
          <div className="flex justify-between items-start mb-4">
            <p className="text-slate-500 font-medium">Leave Balance</p>
            <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
              <Calendar size={20} />
            </div>
          </div>
          <h3 className="text-3xl font-bold font-display">{user.totalLeave - user.usedLeave} Days</h3>
          <p className="text-sm text-slate-400 mt-1">Available out of {user.totalLeave} annual days</p>
        </div>

        <div className="card p-6 border-l-4 border-l-amber-500">
          <div className="flex justify-between items-start mb-4">
            <p className="text-slate-500 font-medium">Active Goals</p>
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <Target size={20} />
            </div>
          </div>
          <h3 className="text-3xl font-bold font-display">{stats.activeGoals} Goals</h3>
          <p className="text-sm text-slate-400 mt-1">Items currently in progress</p>
        </div>

        <div className="card p-6 border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-start mb-4">
            <p className="text-slate-500 font-medium">Next Review</p>
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Clock size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-bold font-display">Q2 Feedback</h3>
          <p className="text-sm text-slate-400 mt-1">Scheduled for May 15, 2026</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card p-8">
          <h4 className="text-xl font-bold mb-6 font-display">Leave Utilization</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={leaveData} 
                  innerRadius={60} 
                  outerRadius={80} 
                  paddingAngle={5} 
                  dataKey="value"
                >
                  {leaveData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-xl font-bold font-display">Announcements</h4>
          <div className="space-y-4">
            <AnnouncementCard 
              type="info"
              title="New Travel Policy Update"
              time="2 hours ago"
              content="Please review the updated corporate travel and expense policy effective from next month."
            />
            <AnnouncementCard 
              type="success"
              title="Q1 Bonus Released"
              time="1 day ago"
              content="Performance-linked bonuses for Q1 have been processed. Please check your pay statements."
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AnnouncementCard({ type, title, time, content }: { type: 'info' | 'success' | 'warning', title: string, time: string, content: string }) {
  const icons = {
    info: <AlertCircle className="text-blue-500" />,
    success: <CheckCircle2 className="text-emerald-500" />,
    warning: <AlertCircle className="text-amber-500" />
  };

  return (
    <div className="card p-5 hover:shadow-md cursor-default">
      <div className="flex gap-4">
        <div className="mt-1">{icons[type]}</div>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <h5 className="font-bold text-slate-800">{title}</h5>
            <span className="text-xs text-slate-400">{time}</span>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">{content}</p>
        </div>
      </div>
    </div>
  );
}

function LeaveView({ user }: { user: UserProfile }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ startDate: '', endDate: '', type: 'ANNUAL', reason: '' });

  useEffect(() => {
    const q = query(collection(db, 'leave_requests'), where('employeeId', '==', user.uid));
    return onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds));
    });
  }, [user.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/leave/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: user.uid, ...formData })
      });
      const data = await response.json();
      if (response.ok) {
        setShowModal(false);
        setFormData({ startDate: '', endDate: '', type: 'ANNUAL', reason: '' });
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold font-display">My Leave Requests</h3>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={18} /> Request Leave
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-slate-500 font-medium text-sm">Duration</th>
              <th className="px-6 py-4 text-slate-500 font-medium text-sm">Type</th>
              <th className="px-6 py-4 text-slate-500 font-medium text-sm">Days</th>
              <th className="px-6 py-4 text-slate-500 font-medium text-sm">Status</th>
              <th className="px-6 py-4 text-slate-500 font-medium text-sm">Comment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map(req => (
              <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-700">{new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-slate-500 text-sm">{req.type}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium">{req.days}</span>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={req.status} />
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-400 max-w-xs truncate">{req.comments || '-'}</p>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                  No leave requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card w-full max-w-lg p-8">
            <h3 className="text-2xl font-bold font-display mb-6">New Leave Request</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input required type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input required type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="input-field">
                  <option value="ANNUAL">Annual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="PERSONAL">Personal Reasons</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                <textarea required rows={3} value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="input-field" placeholder="Briefly describe why you are taking leave..."></textarea>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

function PerformanceView({ user }: { user: UserProfile }) {
  const [goals, setGoals] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'performance_goals'), where('employeeId', '==', user.uid));
    return onSnapshot(q, (snap) => {
      setGoals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [user.uid]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold font-display">My Career Goals</h3>
            <span className="text-slate-400 text-sm font-medium">{goals.length} Goals Active</span>
          </div>
          
          <div className="space-y-4">
            {goals.map(goal => (
              <div key={goal.id} className="card p-6">
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-bold text-slate-800">{goal.description}</h5>
                  <StatusBadge status={goal.status} />
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Clock size={16} />
                    <span>Due {new Date(goal.deadline).toLocaleDateString()}</span>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                  <span>Assigned by Manager</span>
                </div>
              </div>
            ))}
            {goals.length === 0 && (
              <div className="card p-12 text-center text-slate-400">
                <Target size={48} className="mx-auto mb-4 opacity-20" />
                <p>No goals have been set for this period yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="card p-8 bg-primary-950 text-white border-none shadow-xl">
          <h3 className="text-2xl font-bold font-display mb-2">Self-Review Period</h3>
          <p className="text-primary-200 mb-8 leading-relaxed">
            The Q2 review cycle is now open. Reflect on your achievements and areas for growth to prepare for your review meeting.
          </p>
          
          <div className="bg-primary-900 rounded-2xl p-6 mb-8 border border-primary-800">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center font-bold text-xl">
                4.2
              </div>
              <div>
                <p className="text-primary-300 text-sm uppercase tracking-wider font-bold">Last Rating</p>
                <p className="font-bold">Excellent Performance</p>
              </div>
            </div>
            <div className="w-full bg-primary-800 h-2 rounded-full overflow-hidden">
              <div className="bg-primary-400 h-full w-[84%]"></div>
            </div>
          </div>

          <button className="w-full py-4 bg-white text-primary-950 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary-50 transition-colors">
            Start Self Review <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    APPROVED: 'bg-emerald-100 text-emerald-700',
    PENDING: 'bg-amber-100 text-amber-700',
    REJECTED: 'bg-rose-100 text-rose-700',
    ESCALATED: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    NOT_STARTED: 'bg-slate-100 text-slate-700'
  };

  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${styles[status] || styles.PENDING}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

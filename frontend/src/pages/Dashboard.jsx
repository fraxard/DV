import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  FileText,
  FolderOpen,
  Home,
  KeyRound,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Percent,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import styles from './Dashboard.module.css';
import BottomNav from '../components/BottomNav';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CATEGORY_ICONS = {
  financial: Landmark,
  investments: TrendingUp,
  investment: TrendingUp,
  documents: FileText,
  document: FileText,
  property: Home,
  real_estate: Home,
  insurance: ShieldCheck,
  digital: KeyRound,
  business: Landmark,
  vehicle: Home,
};

function getCategoryIcon(catKey) {
  const normalized = String(catKey || '').toLowerCase().trim();
  return CATEGORY_ICONS[normalized] || WalletCards;
}

function getActivityIcon(catKey) {
  const normalized = String(catKey || '').toLowerCase().trim();
  if (normalized === 'nominees') return UsersRound;
  if (normalized === 'documents') return FileText;
  if (normalized === 'allocations') return Percent;
  if (normalized === 'crypto') return Coins;
  if (normalized === 'insurance') return ShieldCheck;
  if (normalized === 'digital') return KeyRound;
  if (normalized === 'property') return Home;
  if (normalized === 'investments' || normalized === 'investment') return TrendingUp;
  if (normalized === 'financial') return Landmark;
  return WalletCards;
}

function formatCategoryName(catKey) {
  if (!catKey) return 'Asset';
  return String(catKey)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrencyAmount(amount, currency = 'INR') {
  const num = Number(amount || 0);
  const curr = String(currency || 'INR').toUpperCase();
  if (curr === 'INR') {
    return `₹${num.toLocaleString('en-IN')}`;
  }
  if (curr === 'USD') {
    return `$${num.toLocaleString('en-US')}`;
  }
  if (curr === 'EUR') {
    return `€${num.toLocaleString('de-DE')}`;
  }
  if (curr === 'GBP') {
    return `£${num.toLocaleString('en-GB')}`;
  }
  return `${curr} ${num.toLocaleString()}`;
}

const activity = [
  { time: '02:42 PM', title: 'Passport added', meta: 'Documents', icon: FileText },
  { time: '11:18 AM', title: 'Nominee updated', meta: 'People', icon: UsersRound },
  { time: 'Yesterday', title: 'Insurance policy added', meta: 'Protection', icon: ShieldCheck },
  { time: '31 Aug', title: 'Bank account added', meta: 'Financial', icon: Landmark },
];

const calendarEvents = {
  5: [{ label: 'Review nominees', type: 'review' }],
  10: [{ label: 'Insurance renewal', type: 'renewal' }],
  17: [{ label: 'Document review', type: 'review' }],
  24: [{ label: 'Legacy check-in', type: 'legacy' }],
};

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function buildCalendar(year, month) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const now = new Date();
  const [calendarDate, setCalendarDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const [selectedDay, setSelectedDay] = useState(now.getDate());

  // Phase 4A Live Dashboard Data
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);

  // Nominee summary list state
  const [nomineeSummary, setNomineeSummary] = useState({
    total_nominees: 0,
    total_assets: 0,
    nominees: [],
  });
  const [loadingNominees, setLoadingNominees] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoadingDashboard(true);
      setDashboardError(null);
      const res = await fetch(`${API_URL}/dashboard`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Failed to load dashboard data (Status ${res.status})`);
      }
      const json = await res.json();
      setDashboardData(json.data || json);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setDashboardError(err.message || 'Unable to connect to legacy engine.');
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  const fetchDashboardNominees = useCallback(async () => {
    try {
      setLoadingNominees(true);
      const res = await fetch(`${API_URL}/nominees/dashboard-summary`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setNomineeSummary(data);
      }
    } catch (err) {
      console.error('Failed to load dashboard nominees:', err);
    } finally {
      setLoadingNominees(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchDashboardNominees();
  }, [fetchDashboard, fetchDashboardNominees]);
  const location = useLocation();
  const activeNav = location.pathname === '/dashboard' ? 'Home'
    : location.pathname.startsWith('/vault') ? 'Vault'
      : location.pathname.startsWith('/nominees') ? 'Nominees'
        : location.pathname.startsWith('/activity') ? 'Activity'
          : location.pathname.startsWith('/documents') ? 'Documents'
            : location.pathname.startsWith('/settings') ? 'Settings'
              : 'Home';

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const calendar = useMemo(() => buildCalendar(year, month), [year, month]);

  const selectedEvents =
    month === now.getMonth() && year === now.getFullYear()
      ? calendarEvents[selectedDay] || []
      : [];

  const changeMonth = (delta) => {
    setCalendarDate(new Date(year, month + delta, 1));
    setSelectedDay(1);
  };

  // Extract live metrics with safe fallbacks
  const readiness = dashboardData?.readiness || { score: 0, label: 'Getting Started', components: {} };
  const assets = dashboardData?.assets || { total: 0, totalValue: 0, totalValueByCurrency: [], byCategory: [] };
  const nominees = dashboardData?.nominees || { total: 0, assigned: 0, unassigned: 0, assetsWithoutAllocation: 0 };
  const documents = dashboardData?.documents || { total: 0, assetsWithDocuments: 0, assetsWithoutDocuments: 0, coveragePercentage: 0 };
  const allocation = dashboardData?.allocation || { coveragePercentage: 0 };
  const needsAttention = dashboardData?.needsAttention || [];

  const readinessScore = Math.max(0, Math.min(100, Math.round(readiness.score || 0)));
  const readinessLabel = (readiness.label || 'Getting Started').toUpperCase();
  const attentionCount = needsAttention.length;

  const totalNomineeCount =
    dashboardData?.nominees?.total ?? nomineeSummary.total_nominees;
  const categoriesCount = assets.byCategory?.length || 0;

  // Single currency or multi-currency determination
  const isMultiCurrency = assets.totalValue === null && Array.isArray(assets.totalValueByCurrency) && assets.totalValueByCurrency.length > 1;
  const singleCurrency = assets.totalValueByCurrency?.[0]?.currency || 'INR';

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.ambientGlow} />

      {/* Compact workspace rail */}
      <aside className={styles.sidebar} aria-label="Workspace navigation">
        <div className={styles.sidebarTop}>
          <Link className={styles.logoMark} to="/dashboard" aria-label="DigiVirasat dashboard">DV</Link>

          <Link
            className={`${styles.railButton} ${activeNav === 'Home' ? styles.railButtonActive : ''}`}
            to="/dashboard"
            aria-label="Home"
          >
            <LayoutDashboard size={15} strokeWidth={1.8} />
          </Link>
          <Link
            className={`${styles.railButton} ${activeNav === 'Vault' ? styles.railButtonActive : ''}`}
            to="/vault"
            aria-label="Vault"
          >
            <FolderOpen size={15} strokeWidth={1.8} />
          </Link>
          <Link
            className={`${styles.railButton} ${activeNav === 'Nominees' ? styles.railButtonActive : ''}`}
            to="/nominees"
            aria-label="Nominees"
          >
            <UsersRound size={15} strokeWidth={1.8} />
          </Link>
          <Link
            className={`${styles.railButton} ${activeNav === 'Activity' ? styles.railButtonActive : ''}`}
            to="/activity"
            aria-label="Activity"
          >
            <ListChecks size={15} strokeWidth={1.8} />
          </Link>
          <Link
            className={`${styles.railButton} ${activeNav === 'Documents' ? styles.railButtonActive : ''}`}
            to="/documents"
            aria-label="Documents"
          >
            <FileText size={15} strokeWidth={1.8} />
          </Link>
        </div>

        <div className={styles.sidebarBottom}>
          <Link className={styles.railButton} to="/activity" aria-label="Notifications">
            <Bell size={15} strokeWidth={1.8} />
          </Link>
          <Link className={styles.profileIcon} to="/settings" aria-label="Profile">
            {(user?.full_name || user?.name || 'A').charAt(0).toUpperCase()}
          </Link>
        </div>
      </aside>

      <main className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <span className={styles.eyebrow}>PERSONAL LEGACY / HOME</span>
            <h1>Your digital legacy</h1>
          </div>
          <div className={styles.headerMeta}>
            <span><Clock3 size={12} /> Last reviewed today</span>
            <span className={styles.securePill}><ShieldCheck size={12} /> Secure</span>
          </div>
        </div>

        {dashboardError ? (
          <div className={styles.errorContainer}>
            <AlertTriangle size={24} color="#dc2626" />
            <h3>Could not load dashboard</h3>
            <p>{dashboardError}</p>
            <button
              className={styles.retryBtn}
              onClick={() => {
                fetchDashboard();
                fetchDashboardNominees();
              }}
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : (
          <div className={styles.mainGrid}>
            {/* Hero */}
            <section className={`${styles.card} ${styles.heroCard}`}>
              <div className={styles.heroPattern} />
              <div className={styles.cardTop}>
                <div>
                  <span className={styles.cardKicker}>YOUR LEGACY</span>
                  <h2>Good evening.</h2>
                </div>
                <div className={styles.heroSpark}><Sparkles size={14} /></div>
              </div>

              <div className={styles.heroMiddle}>
                <p>Your digital legacy is taking shape.</p>
                <div className={styles.heroScoreRow}>
                  {loadingDashboard ? (
                    <strong style={{ opacity: 0.5 }}>--<span>%</span></strong>
                  ) : (
                    <strong>{readinessScore}<span>%</span></strong>
                  )}
                  <div>
                    <span>{loadingDashboard ? 'LOADING...' : readinessLabel}</span>
                    <small>
                      {loadingDashboard
                        ? 'Calculating metrics...'
                        : attentionCount === 0
                          ? 'Everything is up to date'
                          : `${attentionCount} thing${attentionCount > 1 ? 's' : ''} need${attentionCount === 1 ? 's' : ''} your attention`}
                    </small>
                  </div>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressValue}
                    style={{
                      width: loadingDashboard ? '0%' : `${readinessScore}%`,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              <div className={styles.heroFooter}>
                <div>
                  <strong>{loadingDashboard ? '--' : String(assets.total).padStart(2, '0')}</strong>
                  <span>assets</span>
                </div>
                <div>
                  <strong>{loadingDashboard ? '--' : String(categoriesCount).padStart(2, '0')}</strong>
                  <span>categories</span>
                </div>
                <div>
                  <strong>{loadingDashboard && loadingNominees ? '--' : String(totalNomineeCount).padStart(2, '0')}</strong>
                  <span>nominees</span>
                </div>
                <Link className={styles.darkAction} to="/vault">Continue <ChevronRight size={12} /></Link>
              </div>
            </section>

            {/* Nominees */}
            <section className={`${styles.card} ${styles.nomineeCardPanel}`}>
              <div className={styles.cardTop}>
                <div>
                  <span className={styles.cardKicker}>PEOPLE</span>
                  <h3>Nominees</h3>
                </div>
                <span className={styles.countPill}>
                  {loadingDashboard && loadingNominees ? '--' : String(totalNomineeCount).padStart(2, '0')}
                </span>
              </div>

              <div className={styles.nomineeList}>
                {loadingNominees ? (
                  <div className={styles.emptyStateText}>
                    Loading nominees...
                  </div>
                ) : nomineeSummary.nominees.length === 0 ? (
                  <div className={styles.emptyStateText}>
                    No nominees yet. Add your trusted beneficiaries.
                    <br />
                    <Link className={styles.emptyStateLink} to="/nominees?new=1">Add first nominee</Link>
                  </div>
                ) : (
                  nomineeSummary.nominees.map((n, idx) => (
                    <div className={styles.personRow} key={n.id}>
                      <div className={`${styles.avatar} ${idx % 2 === 1 ? styles.avatarAlt : ''}`}>
                        {(n.full_name || 'N').charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.personInfo}>
                        <strong>{n.full_name}</strong>
                        <span>{n.relationship}</span>
                      </div>
                      <span className={styles.share}>
                        {parseFloat(Number(n.overall_share || 0).toFixed(2))}%
                      </span>
                    </div>
                  ))
                )}
              </div>

              <Link className={styles.textAction} to="/nominees?new=1"><Plus size={12} /> Add nominee</Link>
            </section>

            {/* Calendar */}
            <section className={`${styles.card} ${styles.calendarCard}`}>
              <div className={styles.cardTop}>
                <div>
                  <span className={styles.cardKicker}>PLAN AHEAD</span>
                  <h3>Legacy calendar</h3>
                </div>
                <CalendarDays size={15} className={styles.mutedIcon} />
              </div>

              <div className={styles.calendarToolbar}>
                <strong>{monthNames[month]} {year}</strong>
                <div>
                  <button onClick={() => changeMonth(-1)} aria-label="Previous month"><ChevronLeft size={13} /></button>
                  <button onClick={() => changeMonth(1)} aria-label="Next month"><ChevronRight size={13} /></button>
                </div>
              </div>

              <div className={styles.weekdays}>
                {weekdayNames.map((day) => <span key={day}>{day}</span>)}
              </div>

              <div className={styles.calendarGrid}>
                {calendar.map((day, index) => {
                  const hasEvent = day && month === now.getMonth() && year === now.getFullYear() && calendarEvents[day];
                  const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                  const isSelected = day === selectedDay;

                  return (
                    <button
                      key={`${day || 'empty'}-${index}`}
                      className={`${styles.dayCell} ${!day ? styles.dayEmpty : ''} ${isToday ? styles.dayToday : ''} ${isSelected ? styles.daySelected : ''}`}
                      disabled={!day}
                      onClick={() => day && setSelectedDay(day)}
                    >
                      {day}
                      {hasEvent && <i />}
                    </button>
                  );
                })}
              </div>

              <div className={styles.selectedEvent}>
                <div className={styles.eventDot} />
                <div>
                  <span>{selectedEvents[0]?.label || 'No scheduled review'}</span>
                  <small>{selectedEvents.length ? 'Scheduled legacy task' : 'Your calendar is clear'}</small>
                </div>
              </div>
            </section>

            {/* Today / Needs Attention */}
            <section className={`${styles.card} ${styles.todayCard}`}>
              <div className={styles.cardTop}>
                <div>
                  <span className={styles.cardKicker}>ATTENTION</span>
                  <h3>Today</h3>
                </div>
                <span className={styles.countPill}>
                  {loadingDashboard ? '--' : String(attentionCount).padStart(2, '0')}
                </span>
              </div>

              {loadingDashboard ? (
                <div className={styles.emptyStateText}>Loading action items...</div>
              ) : attentionCount === 0 ? (
                <div className={styles.emptyAttentionCard}>
                  <Check size={14} color="#6c8d76" />
                  <span>No outstanding actions needed. Your legacy records are completely up to date!</span>
                </div>
              ) : (
                <div className={styles.todoList}>
                  {needsAttention.slice(0, 3).map((item) => {
                    const target = item.action === 'nominees'
                      ? '/nominees?new=1'
                      : item.action === 'allocations'
                        ? '/nominees'
                        : item.action === 'documents'
                          ? '/documents?upload=1'
                          : item.action === 'verify_email'
                            ? '/verify-email'
                            : '/vault?new=asset';

                    const metaText = item.action === 'nominees'
                      ? 'Nominees'
                      : item.action === 'allocations'
                        ? 'Allocations'
                        : item.action === 'documents'
                          ? 'Documents'
                          : item.action === 'verify_email'
                            ? 'Account'
                            : 'Vault';

                    return (
                      <Link className={styles.todoRow} to={target} key={item.key}>
                        <span className={styles.todoCheck}>
                          {item.severity === 'high' ? (
                            <AlertTriangle size={11} color="#d97706" />
                          ) : (
                            <Clock3 size={11} color="#7b817d" />
                          )}
                        </span>
                        <div>
                          <strong>{item.message}</strong>
                          <span>{metaText}</span>
                        </div>
                        <span className={styles.todoTooltip}>
                          {item.message}
                        </span>
                        <ChevronRight size={12} className={styles.todoArrow} />
                      </Link>
                    );
                  })}
                </div>
              )}

              <div className={styles.cardFooterNote}>
                <span>
                  {loadingDashboard
                    ? 'Loading items...'
                    : attentionCount === 0
                      ? '0 actions remaining'
                      : `${attentionCount} action${attentionCount > 1 ? 's' : ''} remaining`}
                </span>
                <ListChecks size={12} />
              </div>
            </section>

            {/* Vault Categories */}
            <section className={`${styles.card} ${styles.vaultCard}`}>
              <div className={styles.cardTop}>
                <div>
                  <span className={styles.cardKicker}>ORGANISE</span>
                  <h3>Your vault</h3>
                </div>
                <span className={styles.countPill}>
                  {loadingDashboard ? '--' : String(assets.total).padStart(2, '0')}
                </span>
              </div>

              {loadingDashboard ? (
                <div className={styles.emptyStateText}>Loading vault categories...</div>
              ) : categoriesCount === 0 ? (
                <div className={styles.emptyStateText}>
                  No assets recorded yet.
                  <br />
                  <Link className={styles.emptyStateLink} to="/vault?new=asset">Add your first asset</Link>
                </div>
              ) : (
                <div className={styles.categoryGrid}>
                  {assets.byCategory.map(({ category, count }) => {
                    const Icon = getCategoryIcon(category);
                    return (
                      <Link
                        className={styles.categoryRow}
                        key={category}
                        to={`/vault?category=${encodeURIComponent(category)}`}
                        title={`View ${formatCategoryName(category)} assets`}
                      >
                        <span className={styles.categoryIcon}><Icon size={12} strokeWidth={1.7} /></span>
                        <span>{formatCategoryName(category)}</span>
                        <strong>{String(count).padStart(2, '0')}</strong>
                      </Link>
                    );
                  })}
                </div>
              )}

              <Link className={styles.textAction} to="/vault">View all assets <ChevronRight size={12} /></Link>
            </section>

            {/* Vault Health */}
            <section className={`${styles.card} ${styles.healthCard}`}>
              <div className={styles.cardTop}>
                <div>
                  <span className={styles.cardKicker}>STATUS</span>
                  <h3>Vault health</h3>
                </div>
                <ShieldCheck size={15} className={styles.mutedIcon} />
              </div>

              <div
                className={styles.healthRing}
                style={{
                  background: loadingDashboard
                    ? 'conic-gradient(#e7ebe8 100%, #e7ebe8 0)'
                    : `conic-gradient(#738d79 ${readinessScore}%, #e7ebe8 0)`,
                }}
              >
                <div>
                  <strong>{loadingDashboard ? '--' : readinessScore}</strong>
                  <span>%</span>
                </div>
              </div>
              <span className={styles.healthLabel}>
                {loadingDashboard ? 'Calculating...' : readiness.label || 'Getting Started'}
              </span>

              <div className={styles.miniChecks}>
                <span className={readiness.components?.verification ? '' : styles.pending}>
                  <i /> Account secured
                </span>
                <span className={nominees.total > 0 ? '' : styles.pending}>
                  <i /> Nominees added ({loadingDashboard ? '--' : nominees.total})
                </span>
                <span className={nominees.assigned > 0 ? '' : styles.pending}>
                  <i /> Allocations set ({loadingDashboard ? '--' : nominees.assigned})
                </span>
              </div>
            </section>

            {/* Quick actions */}
            <section className={`${styles.card} ${styles.quickCard}`}>
              <div className={styles.cardTop}>
                <div>
                  <span className={styles.cardKicker}>SHORTCUTS</span>
                  <h3>Quick actions</h3>
                </div>
                <Plus size={15} className={styles.mutedIcon} />
              </div>

              <div className={styles.quickGrid}>
                <Link to="/vault?new=asset"><span><WalletCards size={13} /></span>Add asset</Link>
                <Link to="/nominees?new=1"><span><UsersRound size={13} /></span>Add nominee</Link>
                <Link to="/documents?upload=1"><span><Upload size={13} /></span>Upload doc</Link>
                <Link to="/calendar?new=1"><span><CalendarDays size={13} /></span>Add date</Link>
              </div>
            </section>

            {/* Financial overview */}
            <Link className={`${styles.card} ${styles.financeCard}`} to="/vault?category=financial">
              <div className={styles.cardTop}>
                <div>
                  <span className={styles.cardKicker}>OVERVIEW</span>
                  <h3>Financial snapshot</h3>
                </div>
                <Landmark size={15} className={styles.mutedIcon} />
              </div>

              <div className={styles.financeMain}>
                <div>
                  <span>Total recorded value</span>
                  {loadingDashboard ? (
                    <strong>--</strong>
                  ) : isMultiCurrency ? (
                    <div className={styles.currencyPillRow}>
                      {assets.totalValueByCurrency.map((item) => (
                        <span key={item.currency} className={styles.currencyPill}>
                          <small>{item.currency}</small>
                          {formatCurrencyAmount(item.amount, item.currency)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <strong>
                      {formatCurrencyAmount(assets.totalValue || 0, singleCurrency)}
                    </strong>
                  )}
                </div>
                <button className={styles.eyeButton} onClick={(e) => { e.preventDefault(); }}>••••</button>
              </div>

              {/* Dynamic category breakdowns if present */}
              <div className={styles.financeBreakdown}>
                {loadingDashboard ? (
                  <div><span>Loading...</span><strong>--</strong></div>
                ) : assets.byCategory?.length === 0 ? (
                  <div><span>No assets</span><strong>0 recorded</strong></div>
                ) : (
                  assets.byCategory.slice(0, 3).map((cat) => (
                    <div key={cat.category}>
                      <span>{formatCategoryName(cat.category)}</span>
                      <strong>{formatCurrencyAmount(cat.value || 0, singleCurrency)}</strong>
                    </div>
                  ))
                )}
              </div>

              <div className={styles.financeBar}>
                {assets.byCategory && assets.byCategory.length > 0 ? (
                  assets.byCategory.slice(0, 3).map((cat, idx) => {
                    const totalCatVal = assets.byCategory.reduce((acc, c) => acc + (c.value || 0), 0);
                    const pct = totalCatVal > 0 ? Math.max(10, Math.round((cat.value / totalCatVal) * 100)) : 33;
                    return (
                      <span
                        key={cat.category || idx}
                        style={{ width: `${pct}%` }}
                      />
                    );
                  })
                ) : (
                  <span style={{ width: '100%', background: '#cbd4cd' }} />
                )}
              </div>
            </Link>

            {/* Activity */}
            <Link className={`${styles.card} ${styles.activityCard}`} to="/activity">
              <div className={styles.cardTop}>
                <div>
                  <span className={styles.cardKicker}>TIMELINE</span>
                  <h3>Recent activity</h3>
                </div>
                <span className={styles.liveDot}>LIVE</span>
              </div>

              <div className={styles.activityList}>
                {loadingDashboard ? (
                  <div className={styles.emptyStateText}>Loading activity...</div>
                ) : Array.isArray(dashboardData?.recentActivity) && dashboardData.recentActivity.length > 0 ? (
                  dashboardData.recentActivity.slice(0, 4).map((item) => {
                    const Icon = getActivityIcon(item.category);
                    return (
                      <div className={styles.activityRow} key={item.id || `${item.action}-${item.title}`}>
                        <span className={styles.activityIcon}><Icon size={12} strokeWidth={1.7} /></span>
                        <div>
                          <strong>{item.title}</strong>
                          <span>{item.categoryLabel || item.category || 'Workspace'}</span>
                        </div>
                        <time>{item.relativeTime || 'Recent'}</time>
                      </div>
                    );
                  })
                ) : (
                  <div className={styles.emptyStateText} style={{ padding: '8px 0' }}>
                    No recent activity yet.
                  </div>
                )}
              </div>
            </Link>

            {/* Smaller category cards */}
            <Link to="/documents" className={`${styles.card} ${styles.smallInfoCard} ${styles.documentsCard}`}>
              <div className={styles.cardTop}>
                <div><span className={styles.cardKicker}>ARCHIVE</span><h3>Documents</h3></div>
                <FileText size={14} className={styles.mutedIcon} />
              </div>
              <strong className={styles.bigSmallNumber}>
                {loadingDashboard ? '--' : documents.total}
              </strong>
              <div className={styles.microRows}>
                <span>Covered assets <b>{loadingDashboard ? '--' : String(documents.assetsWithDocuments).padStart(2, '0')}</b></span>
                <span>Missing docs <b>{loadingDashboard ? '--' : String(documents.assetsWithoutDocuments).padStart(2, '0')}</b></span>
                <span>Asset coverage <b>{loadingDashboard ? '--' : `${Math.round(documents.coveragePercentage)}%`}</b></span>
              </div>
            </Link>

            <Link to="/nominees" className={`${styles.card} ${styles.smallInfoCard} ${styles.protectionCard}`}>
              <div className={styles.cardTop}>
                <div><span className={styles.cardKicker}>PROTECTION</span><h3>Allocations</h3></div>
                <ShieldCheck size={14} className={styles.mutedIcon} />
              </div>
              <strong className={styles.bigSmallNumber}>
                {loadingDashboard ? '--' : `${Math.round(allocation.coveragePercentage)}`}{!loadingDashboard && <span>%</span>}
              </strong>
              <div className={styles.thinProgress}>
                <span style={{ width: `${loadingDashboard ? 0 : Math.round(allocation.coveragePercentage)}%` }} />
              </div>
              <span className={styles.smallMuted}>
                {loadingDashboard
                  ? 'Loading...'
                  : `${nominees.assigned} assigned · ${nominees.unassigned} unassigned`}
              </span>
            </Link>

            <Link to="/vault" className={`${styles.card} ${styles.smallInfoCard} ${styles.digitalCard}`}>
              <div className={styles.cardTop}>
                <div><span className={styles.cardKicker}>VAULT SUMMARY</span><h3>Coverage breakdown</h3></div>
                <KeyRound size={14} className={styles.mutedIcon} />
              </div>
              <strong className={styles.bigSmallNumber}>
                {loadingDashboard ? '--' : assets.total}
              </strong>
              <div className={styles.microRows}>
                <span>Unallocated assets <b>{loadingDashboard ? '--' : String(nominees.assetsWithoutAllocation).padStart(2, '0')}</b></span>
                <span>Documented <b>{loadingDashboard ? '--' : String(documents.assetsWithDocuments).padStart(2, '0')}</b></span>
                <span>Categories <b>{loadingDashboard ? '--' : String(categoriesCount).padStart(2, '0')}</b></span>
              </div>
            </Link>

            {/* Legacy readiness */}
            <section className={`${styles.card} ${styles.readinessCard}`}>
              <div>
                <span className={styles.cardKicker}>NEXT STEP</span>
                <h3>Legacy readiness</h3>
                <p>You're building a complete handover for the people who matter.</p>
              </div>

              <div className={styles.readinessChecklist}>
                <span className={readiness.components?.verification ? '' : styles.pendingItem}>
                  <Check size={11} /> Account secured
                </span>
                <span className={nominees.assigned > 0 ? '' : styles.pendingItem}>
                  <Check size={11} /> Nominees assigned
                </span>
                <span className={documents.total > 0 ? '' : styles.pendingItem}>
                  <Check size={11} /> Documents added
                </span>
                <span className={readinessScore >= 75 ? '' : styles.pendingItem}>
                  <Check size={11} /> Allocation complete
                </span>
                <span className={readinessScore >= 90 ? '' : styles.pendingItem}>
                  <Check size={11} /> All assets protected
                </span>
                <span className={styles.pendingItem}>
                  ○ Emergency instructions
                </span>
              </div>

              <Link className={styles.darkAction} to="/vault">Continue organising <ChevronRight size={12} /></Link>
            </section>
          </div>
        )}

        <div className={styles.pageFooter}>
          <span>DIGIVIRASAT · PRIVATE LEGACY WORKSPACE</span>
          <span>Everything important, organised.</span>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Dashboard;

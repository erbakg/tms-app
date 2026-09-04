import {
  Bell,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  FileUp,
  MapPin,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Truck,
  UsersRound,
} from 'lucide-react';
import type { JSX } from 'react';

const loads = [
  {
    id: '312KG-10024',
    broker: 'C.H. Robinson',
    route: 'Dallas, TX → Austin, TX',
    pickup: 'Today, 09:00',
    status: 'Ready for review',
    tone: 'blue',
  },
  {
    id: '312KG-10023',
    broker: 'Schneider Logistics',
    route: 'Houston, TX → Tulsa, OK',
    pickup: 'Today, 11:30',
    status: 'Driver assigned',
    tone: 'green',
  },
  {
    id: '312KG-10022',
    broker: 'TQL',
    route: 'San Antonio, TX → El Paso, TX',
    pickup: 'Tomorrow, 07:00',
    status: 'Awaiting RC',
    tone: 'amber',
  },
];

const navItems = [
  { label: 'Dispatch', icon: ClipboardCheck, active: true },
  { label: 'Loads', icon: Truck, active: false },
  { label: 'Drivers', icon: UsersRound, active: false },
  { label: 'Accounting', icon: CircleDollarSign, active: false },
];

export const App = (): JSX.Element => (
  <div className="app-shell">
    <header className="app-header">
      <div className="header-content">
        <a className="brand" href="#top" aria-label="312KG TMS home">
          <span className="brand-mark">
            <Truck size={25} strokeWidth={2.4} />
          </span>
          <span>
            312KG <strong>TMS</strong>
          </span>
        </a>
        <span className="header-divider" />
        <div className="header-title">
          <span>Dispatcher</span>
          <strong>workspace</strong>
        </div>
        <div className="header-chips">
          <span className="header-chip">
            <ShieldCheck size={15} /> Controlled access
          </span>
          <span className="header-chip">
            <CircleDollarSign size={15} /> Rate protection
          </span>
        </div>
        <div className="header-actions">
          <button className="icon-button on-dark" aria-label="Notifications">
            <Bell size={19} />
          </button>
          <button className="user-menu">
            AD <ChevronDown size={16} />
          </button>
        </div>
      </div>
    </header>

    <main id="top" className="main-content">
      <section className="page-intro">
        <div>
          <p className="eyebrow">Dispatch control center</p>
          <h1>
            Move every load with <span>clarity.</span>
          </h1>
          <p className="intro-copy">
            Review rate confirmations, validate AI data and assign drivers from one calm workspace.
          </p>
        </div>
        <button className="primary-button">
          <FileUp size={19} /> Upload rate confirmation
        </button>
      </section>

      <nav className="workspace-tabs" aria-label="Main navigation">
        {navItems.map(({ label, icon: Icon, active }) => (
          <button key={label} className={active ? 'workspace-tab active' : 'workspace-tab'}>
            <Icon size={18} /> {label}
          </button>
        ))}
      </nav>

      <section className="metric-grid" aria-label="Dispatch overview">
        <Metric label="Loads to review" value="06" helper="3 received today" accent="blue" />
        <Metric label="Drivers on route" value="18" helper="2 check-ins due" accent="green" />
        <Metric
          label="Open revenue"
          value="$42,860"
          helper="Across 14 active loads"
          accent="navy"
        />
        <Metric label="Exceptions" value="02" helper="Require attention" accent="amber" />
      </section>

      <section className="workspace-grid">
        <article className="card load-queue">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Live queue</p>
              <h2>Recent loads</h2>
            </div>
            <button className="text-button">
              View all <ChevronDown size={15} />
            </button>
          </div>
          <div className="search-field">
            <Search size={18} />
            <input aria-label="Search loads" placeholder="Search load, broker or city" />
          </div>
          <div className="load-list">
            {loads.map((load) => (
              <button key={load.id} className="load-row">
                <span className={`route-icon ${load.tone}`}>
                  <MapPin size={18} />
                </span>
                <span className="load-main">
                  <strong>{load.id}</strong>
                  <span>
                    {load.broker} · {load.route}
                  </span>
                </span>
                <span className="load-meta">
                  <span>{load.pickup}</span>
                  <span className={`status-pill ${load.tone}`}>{load.status}</span>
                </span>
                <MoreHorizontal className="row-more" size={20} />
              </button>
            ))}
          </div>
        </article>

        <aside className="load-review-panel">
          <article className="card review-card">
            <div className="review-ribbon">READY FOR REVIEW</div>
            <div className="card-heading">
              <div>
                <p className="eyebrow">New rate confirmation</p>
                <h2>312KG-10024</h2>
              </div>
              <span className="ai-badge">
                <span /> AI extracted
              </span>
            </div>
            <div className="route-summary">
              <div>
                <span className="route-dot pickup" />
                <strong>Dallas, TX</strong>
                <small>Sep 10 · 09:00</small>
              </div>
              <span className="route-line" />
              <div>
                <span className="route-dot delivery" />
                <strong>Austin, TX</strong>
                <small>Sep 11 · 15:00</small>
              </div>
            </div>
            <div className="review-form">
              <label className="form-field full-width">
                <span className="form-label">Broker load number</span>
                <span className="input-shell focused">
                  <input defaultValue="CHRW-984627" aria-label="Broker load number" />
                  <ClipboardCheck size={17} />
                </span>
              </label>
              <div className="form-field">
                <span className="form-label">Driver tracking</span>
                <span className="segmented-control" role="group" aria-label="Driver tracking">
                  <button className="segment active">Required</button>
                  <button className="segment">Not required</button>
                </span>
              </div>
              <label className="form-field">
                <span className="form-label">Rate to customer</span>
                <span className="input-shell">
                  <input defaultValue="1,200.00" aria-label="Rate to customer" />
                  <strong>USD</strong>
                </span>
              </label>
              <div className="form-callout">
                <ShieldCheck size={17} />
                <span>Rate is hidden from the driver by default.</span>
              </div>
            </div>
            <button className="review-button">
              <ClipboardCheck size={18} /> Open review
            </button>
          </article>

          <article className="profit-card">
            <div className="profit-heading">
              <span>DISPATCH READINESS</span>
              <strong>82%</strong>
            </div>
            <div className="progress-track">
              <span />
            </div>
            <p>AI data is ready. Confirm the rate and broker details before assigning a driver.</p>
          </article>
        </aside>
      </section>
    </main>
  </div>
);

interface MetricProps {
  label: string;
  value: string;
  helper: string;
  accent: 'amber' | 'blue' | 'green' | 'navy';
}

const Metric = ({ label, value, helper, accent }: MetricProps): JSX.Element => (
  <article className={`metric-card ${accent}`}>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{helper}</small>
  </article>
);

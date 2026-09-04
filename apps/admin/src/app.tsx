import {
  Bell,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  FileUp,
  LoaderCircle,
  LogOut,
  MapPin,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Truck,
  UsersRound,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent, JSX, ReactNode } from 'react';

import { api } from './api.js';
import type { DocumentExtraction, Load, LoadDetails, LoadDocument, Session } from './api.js';

const navItems = [
  { label: 'Dispatch', icon: ClipboardCheck },
  { label: 'Loads', icon: Truck },
  { label: 'Drivers', icon: UsersRound },
  { label: 'Accounting', icon: CircleDollarSign },
];

export const App = (): JSX.Element => {
  const [session, setSession] = useState<Session | null>(() => readSession());
  return session === null ? (
    <LoginScreen onAuthenticated={setSession} />
  ) : (
    <DispatcherWorkspace session={session} onLogout={() => setSession(null)} />
  );
};

const DispatcherWorkspace = ({
  session,
  onLogout,
}: {
  session: Session;
  onLogout: () => void;
}): JSX.Element => {
  const [loads, setLoads] = useState<Load[]>([]);
  const [activeTab, setActiveTab] = useState('Dispatch');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [reviewLoad, setReviewLoad] = useState<LoadDetails | null>(null);

  const refreshLoads = async (): Promise<void> => {
    setIsLoading(true);
    try {
      setLoads(await api.getLoads(session.accessToken));
      setError(null);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshLoads();
  }, [session.accessToken]);

  const openReview = async (loadId: string): Promise<void> => {
    try {
      setReviewLoad(await api.getLoad(session.accessToken, loadId));
      setError(null);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const filteredLoads = loads.filter((load) =>
    [load.internalLoadId, load.brokerLoadNumber, load.brokerName, load.commodity]
      .filter((value): value is string => value !== null && value !== undefined)
      .some((value) => value.toLowerCase().includes(query.trim().toLowerCase())),
  );
  const featuredLoad = reviewLoad ?? loads.find((load) => load.status === 'DRAFT') ?? loads[0];
  const replaceLoad = (updated: Load): void =>
    setLoads((current) =>
      current.map((load) => (load.id === updated.id ? { ...load, ...updated } : load)),
    );

  const logout = (): void => {
    sessionStorage.removeItem('312kg-session');
    onLogout();
  };

  return (
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
            <button className="user-menu" onClick={logout} title="Sign out">
              {session.user.email.slice(0, 2).toUpperCase()} <LogOut size={15} />
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
              Review rate confirmations, validate AI data and assign drivers from one calm
              workspace.
            </p>
          </div>
          <button className="primary-button" onClick={() => setIsUploadOpen(true)}>
            <FileUp size={19} /> Upload rate confirmation
          </button>
        </section>
        <nav className="workspace-tabs" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setActiveTab(label)}
              className={activeTab === label ? 'workspace-tab active' : 'workspace-tab'}
            >
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
        {error === null ? null : (
          <div className="app-error" role="alert">
            {error}
            <button onClick={() => setError(null)} aria-label="Dismiss error">
              <X size={17} />
            </button>
          </div>
        )}
        <section className="metric-grid" aria-label="Dispatch overview">
          <Metric
            label="Loads to review"
            value={String(loads.filter((load) => load.status === 'DRAFT').length).padStart(2, '0')}
            helper="Draft loads awaiting review"
            accent="blue"
          />
          <Metric
            label="Active loads"
            value={String(loads.length).padStart(2, '0')}
            helper="Loaded from the API"
            accent="green"
          />
          <Metric
            label="Confirmed loads"
            value={String(loads.filter((load) => load.status === 'CONFIRMED').length).padStart(
              2,
              '0',
            )}
            helper="Ready for assignment"
            accent="navy"
          />
          <Metric label="Exceptions" value="00" helper="No client-side exceptions" accent="amber" />
        </section>
        <section className="workspace-grid">
          <article className="card load-queue">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Live queue</p>
                <h2>{activeTab === 'Dispatch' ? 'Recent loads' : activeTab}</h2>
              </div>
              <button className="text-button" onClick={() => void refreshLoads()}>
                Refresh <ChevronDown size={15} />
              </button>
            </div>
            <div className="search-field">
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search loads"
                placeholder="Search load, broker or commodity"
              />
            </div>
            <div className="load-list">
              {isLoading ? <QueuePlaceholder text="Loading loads…" /> : null}
              {!isLoading && filteredLoads.length === 0 ? (
                <QueuePlaceholder text="No loads found. Upload a rate confirmation to start." />
              ) : null}
              {filteredLoads.map((load) => (
                <LoadRow key={load.id} load={load} onOpen={openReview} />
              ))}
            </div>
          </article>
          <aside className="load-review-panel">
            <FeaturedLoad load={featuredLoad} onOpen={openReview} />
            <article className="profit-card">
              <div className="profit-heading">
                <span>DISPATCH READINESS</span>
                <strong>
                  {featuredLoad === undefined
                    ? '0%'
                    : featuredLoad.status === 'CONFIRMED'
                      ? '100%'
                      : '82%'}
                </strong>
              </div>
              <div className="progress-track">
                <span />
              </div>
              <p>
                {featuredLoad === undefined
                  ? 'Upload a Rate Confirmation to begin review.'
                  : featuredLoad.status === 'CONFIRMED'
                    ? 'This Load is confirmed and available for driver assignment.'
                    : 'AI data is ready. Confirm broker details before assigning a driver.'}
              </p>
            </article>
          </aside>
        </section>
      </main>
      {isUploadOpen ? (
        <UploadDialog
          accessToken={session.accessToken}
          onClose={() => setIsUploadOpen(false)}
          onUploaded={(load) => {
            setLoads((current) => [load, ...current]);
            setIsUploadOpen(false);
            void openReview(load.id);
          }}
        />
      ) : null}
      {reviewLoad === null ? null : (
        <ReviewDialog
          accessToken={session.accessToken}
          load={reviewLoad}
          onClose={() => setReviewLoad(null)}
          onChanged={(updated) => {
            replaceLoad(updated);
            setReviewLoad((current) => (current === null ? null : { ...current, ...updated }));
          }}
        />
      )}
    </div>
  );
};

const LoadRow = ({
  load,
  onOpen,
}: {
  load: Load;
  onOpen: (id: string) => Promise<void>;
}): JSX.Element => {
  const tone = load.status === 'CONFIRMED' ? 'green' : 'blue';
  return (
    <button className="load-row" onClick={() => void onOpen(load.id)}>
      <span className={`route-icon ${tone}`}>
        <MapPin size={18} />
      </span>
      <span className="load-main">
        <strong>{load.internalLoadId ?? load.brokerLoadNumber ?? 'New draft'}</strong>
        <span>
          {load.brokerName ?? 'Broker not reviewed'} · {load.commodity ?? 'Commodity not reviewed'}
        </span>
      </span>
      <span className="load-meta">
        <span>{formatDate(load.createdAt)}</span>
        <span className={`status-pill ${tone}`}>
          {load.status === 'DRAFT' ? 'Ready for review' : 'Confirmed'}
        </span>
      </span>
      <MoreHorizontal className="row-more" size={20} />
    </button>
  );
};

const FeaturedLoad = ({
  load,
  onOpen,
}: {
  load?: Load;
  onOpen: (id: string) => Promise<void>;
}): JSX.Element =>
  load === undefined ? (
    <article className="card review-card empty-review">
      <FileUp size={28} />
      <h2>No Rate Confirmation yet</h2>
      <p>Upload a document to create the first draft Load.</p>
    </article>
  ) : (
    <article className="card review-card">
      <div className="review-ribbon">
        {load.status === 'DRAFT' ? 'READY FOR REVIEW' : 'CONFIRMED'}
      </div>
      <div className="card-heading">
        <div>
          <p className="eyebrow">Rate confirmation</p>
          <h2>{load.internalLoadId ?? load.brokerLoadNumber ?? 'Draft Load'}</h2>
        </div>
        <span className="ai-badge">
          <span /> {load.status === 'DRAFT' ? 'Review required' : 'Confirmed'}
        </span>
      </div>
      <div className="route-summary">
        <div>
          <span className="route-dot pickup" />
          <strong>{load.brokerName ?? 'Broker pending'}</strong>
          <small>{load.commodity ?? 'Commodity pending'}</small>
        </div>
        <span className="route-line" />
        <div>
          <span className="route-dot delivery" />
          <strong>{load.equipmentType ?? 'Equipment pending'}</strong>
          <small>{load.rate ?? 'Rate pending'}</small>
        </div>
      </div>
      <div className="review-details">
        <Detail label="Broker" value={load.brokerName ?? 'Not reviewed'} />
        <Detail label="Equipment" value={load.equipmentType ?? 'Not reviewed'} />
        <Detail label="Rate" value={load.rate ?? 'Not reviewed'} />
      </div>
      <button className="review-button" onClick={() => void onOpen(load.id)}>
        <ClipboardCheck size={18} /> Open review
      </button>
    </article>
  );

const UploadDialog = ({
  accessToken,
  onClose,
  onUploaded,
}: {
  accessToken: string;
  onClose: () => void;
  onUploaded: (load: Load) => void;
}): JSX.Element => {
  const [file, setFile] = useState<File | null>(null);
  const [brokerLoadNumber, setBrokerLoadNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (file === null) {
      setError('Choose a PDF, JPG, or PNG file.');
      return;
    }
    setIsSubmitting(true);
    try {
      onUploaded((await api.uploadRateConfirmation(accessToken, file, brokerLoadNumber)).load);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <Dialog title="Upload Rate Confirmation" onClose={onClose}>
      <form className="dialog-form" onSubmit={(event) => void submit(event)}>
        <label className="form-field">
          <span className="form-label">Rate Confirmation file</span>
          <input
            className="file-input"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setFile(event.target.files?.[0] ?? null)
            }
          />
          <small>PDF, JPG or PNG · maximum 20 MiB</small>
        </label>
        <label className="form-field">
          <span className="form-label">
            Broker load number <em>optional</em>
          </span>
          <span className="input-shell">
            <input
              value={brokerLoadNumber}
              onChange={(event) => setBrokerLoadNumber(event.target.value)}
              placeholder="For example: CHRW-984627"
            />
          </span>
        </label>
        {error === null ? null : <p className="dialog-error">{error}</p>}
        <button disabled={isSubmitting} className="primary-button form-submit">
          {isSubmitting ? <LoaderCircle className="spinner" size={19} /> : <FileUp size={19} />}
          {isSubmitting ? 'Uploading…' : 'Create draft from RC'}
        </button>
      </form>
    </Dialog>
  );
};

const ReviewDialog = ({
  accessToken,
  load,
  onClose,
  onChanged,
}: {
  accessToken: string;
  load: LoadDetails;
  onClose: () => void;
  onChanged: (load: Load) => void;
}): JSX.Element => {
  const [details, setDetails] = useState(load);
  const [brokerLoadNumber, setBrokerLoadNumber] = useState(load.brokerLoadNumber ?? '');
  const [rate, setRate] = useState(load.rate ?? '');
  const [specialInstructions, setSpecialInstructions] = useState(load.specialInstructions ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isApplyingStops, setIsApplyingStops] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<LoadDocument[]>([]);
  const [extraction, setExtraction] = useState<DocumentExtraction | null>(null);

  useEffect(() => {
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const loadExtraction = async (): Promise<void> => {
      try {
        const currentDocuments = await api.getDocuments(accessToken, details.id);
        if (!active) return;
        setDocuments(currentDocuments);
        const document = currentDocuments.find((item) => item.isCurrent);
        if (document === undefined) return;
        const currentExtraction = await api.getExtraction(accessToken, details.id, document.id);
        if (!active) return;
        setExtraction(currentExtraction);
        if (currentExtraction.status === 'PENDING' || currentExtraction.status === 'PROCESSING') {
          retryTimer = setTimeout(() => void loadExtraction(), 2_500);
        }
      } catch (requestError) {
        if (active) setError(errorMessage(requestError));
      }
    };
    void loadExtraction();
    return () => {
      active = false;
      if (retryTimer !== undefined) clearTimeout(retryTimer);
    };
  }, [accessToken, details.id]);

  const save = async (): Promise<void> => {
    setIsSaving(true);
    try {
      const updated = await api.updateLoad(accessToken, details.id, {
        brokerLoadNumber: brokerLoadNumber.trim() || null,
        rate: rate.trim() || null,
        specialInstructions: specialInstructions.trim() || null,
      });
      setDetails((current) => ({ ...current, ...updated }));
      onChanged(updated);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };
  const confirm = async (): Promise<void> => {
    setIsSaving(true);
    try {
      const updated = await api.confirmLoad(accessToken, details.id);
      setDetails((current) => ({ ...current, ...updated }));
      onChanged(updated);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };
  const applyStops = async (): Promise<void> => {
    const document = documents.find((item) => item.isCurrent);
    if (document === undefined) return;
    setIsApplyingStops(true);
    try {
      const stops = await api.applyExtractedStops(accessToken, details.id, document.id);
      setDetails((current) => ({ ...current, stops }));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsApplyingStops(false);
    }
  };
  return (
    <Dialog
      title={`Review ${details.internalLoadId ?? details.brokerLoadNumber ?? 'draft Load'}`}
      onClose={onClose}
    >
      <div className="review-dialog-route">
        {details.stops.length === 0
          ? 'Stops will appear after AI extraction or manual review.'
          : details.stops
              .map((stop) => `${stop.type}: ${stop.facilityName ?? stop.city ?? 'Pending'}`)
              .join(' → ')}
      </div>
      <ExtractionPanel
        extraction={extraction}
        canApplyStops={details.status === 'DRAFT' && details.stops.length === 0}
        isApplyingStops={isApplyingStops}
        onApplyStops={applyStops}
      />
      <div className="dialog-form">
        <label className="form-field">
          <span className="form-label">Broker load number</span>
          <span className="input-shell focused">
            <input
              value={brokerLoadNumber}
              onChange={(event) => setBrokerLoadNumber(event.target.value)}
            />
          </span>
        </label>
        <label className="form-field">
          <span className="form-label">Rate to customer</span>
          <span className="input-shell">
            <input value={rate} onChange={(event) => setRate(event.target.value)} />
            <strong>USD</strong>
          </span>
        </label>
        <label className="form-field">
          <span className="form-label">Special instructions</span>
          <textarea
            value={specialInstructions}
            onChange={(event) => setSpecialInstructions(event.target.value)}
            placeholder="Internal dispatch instructions"
          />
        </label>
        <div className="form-callout">
          <ShieldCheck size={17} />
          <span>Financial and internal fields remain hidden from the driver.</span>
        </div>
        {error === null ? null : <p className="dialog-error">{error}</p>}
        <div className="dialog-actions">
          <button className="secondary-button" disabled={isSaving} onClick={() => void save()}>
            Save review
          </button>
          {details.status === 'DRAFT' ? (
            <button className="primary-button" disabled={isSaving} onClick={() => void confirm()}>
              {isSaving ? (
                <LoaderCircle className="spinner" size={19} />
              ) : (
                <ClipboardCheck size={19} />
              )}{' '}
              Confirm Load
            </button>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
};

const ExtractionPanel = ({
  extraction,
  canApplyStops,
  isApplyingStops,
  onApplyStops,
}: {
  extraction: DocumentExtraction | null;
  canApplyStops: boolean;
  isApplyingStops: boolean;
  onApplyStops: () => Promise<void>;
}): JSX.Element => {
  if (extraction === null)
    return (
      <div className="extraction-panel loading">
        <LoaderCircle className="spinner" size={17} /> Loading AI extraction…
      </div>
    );
  if (extraction.status === 'PENDING' || extraction.status === 'PROCESSING')
    return (
      <div className="extraction-panel loading">
        <LoaderCircle className="spinner" size={17} /> AI extraction is in progress. This page
        refreshes automatically.
      </div>
    );
  if (extraction.status === 'FAILED')
    return (
      <div className="extraction-panel failed">
        <strong>AI extraction failed</strong>
        <span>{extraction.error ?? 'The document could not be processed.'}</span>
      </div>
    );
  if (extraction.result === null)
    return <div className="extraction-panel failed">AI completed without a result.</div>;
  return (
    <section className="extraction-panel">
      <div className="extraction-heading">
        <span>
          <ShieldCheck size={16} /> AI suggestions
        </span>
        <small>Review before saving</small>
      </div>
      <div className="confidence-grid">
        <ConfidenceField label="Broker" field={extraction.result.brokerName} />
        <ConfidenceField label="Rate" field={extraction.result.rate} />
        <ConfidenceField label="Equipment" field={extraction.result.equipmentType} />
      </div>
      <div className="stops-suggestion">
        <span>
          {extraction.result.stops.length} suggested stop
          {extraction.result.stops.length === 1 ? '' : 's'}
        </span>
        {canApplyStops && extraction.result.stops.length > 0 ? (
          <button
            className="secondary-button"
            disabled={isApplyingStops}
            onClick={() => void onApplyStops()}
          >
            {isApplyingStops ? (
              <LoaderCircle className="spinner" size={16} />
            ) : (
              <MapPin size={16} />
            )}{' '}
            Apply AI stops
          </button>
        ) : null}
      </div>
    </section>
  );
};

const ConfidenceField = ({
  label,
  field,
}: {
  label: string;
  field: { value: string | null; confidence: string };
}): JSX.Element => (
  <div className="confidence-field">
    <span>{label}</span>
    <strong>{field.value ?? 'Not found'}</strong>
    <small className={field.confidence.toLowerCase()}>{field.confidence.replace('_', ' ')}</small>
  </div>
);

const Dialog = ({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}): JSX.Element => (
  <div className="dialog-backdrop" role="presentation">
    <section className="dialog" role="dialog" aria-modal="true" aria-label={title}>
      <header>
        <div>
          <p className="eyebrow">Dispatcher workspace</p>
          <h2>{title}</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close dialog">
          <X size={20} />
        </button>
      </header>
      {children}
    </section>
  </div>
);
const QueuePlaceholder = ({ text }: { text: string }): JSX.Element => (
  <p className="queue-placeholder">{text}</p>
);
const Metric = ({
  label,
  value,
  helper,
  accent,
}: {
  label: string;
  value: string;
  helper: string;
  accent: 'amber' | 'blue' | 'green' | 'navy';
}): JSX.Element => (
  <article className={`metric-card ${accent}`}>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{helper}</small>
  </article>
);
const Detail = ({ label, value }: { label: string; value: string }): JSX.Element => (
  <div className="detail-row">
    <span>{label}</span>
    <strong>{value}</strong>
    <small>Ready for review</small>
  </div>
);
const formatDate = (value: string): string =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value));
const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'An unexpected error occurred.';
const readSession = (): Session | null => {
  try {
    const stored = sessionStorage.getItem('312kg-session');
    return stored === null ? null : (JSON.parse(stored) as Session);
  } catch {
    sessionStorage.removeItem('312kg-session');
    return null;
  }
};

const LoginScreen = ({
  onAuthenticated,
}: {
  onAuthenticated: (session: Session) => void;
}): JSX.Element => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const session = await api.login(email, password);
      sessionStorage.setItem('312kg-session', JSON.stringify(session));
      onAuthenticated(session);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand login-brand">
          <span className="brand-mark">
            <Truck size={25} />
          </span>
          <span>
            312KG <strong>TMS</strong>
          </span>
        </div>
        <p className="eyebrow">Secure dispatcher access</p>
        <h1>Welcome back.</h1>
        <p>Sign in to review rate confirmations and manage dispatch.</p>
        <form className="dialog-form" onSubmit={(event) => void submit(event)}>
          <label className="form-field">
            <span className="form-label">Email</span>
            <span className="input-shell">
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </span>
          </label>
          <label className="form-field">
            <span className="form-label">Password</span>
            <span className="input-shell">
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </span>
          </label>
          {error === null ? null : <p className="dialog-error">{error}</p>}
          <button className="primary-button form-submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <LoaderCircle className="spinner" size={19} />
            ) : (
              <ShieldCheck size={19} />
            )}
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
};

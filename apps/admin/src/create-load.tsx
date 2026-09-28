import {
  ArrowLeft,
  CalendarClock,
  Check,
  CircleDollarSign,
  Clock3,
  LoaderCircle,
  MapPin,
  Plus,
  Route,
  Save,
  Trash2,
  Truck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FormEvent, JSX } from 'react';

import { api, type Load, type ManualLoadInput, type Session } from './api.js';

type AppointmentMode = 'FCFS' | 'BY_APPOINTMENT';
type StopType = 'PICKUP' | 'DELIVERY';

interface StopDraft {
  id: string;
  type: StopType;
  facilityName: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  appointmentType: AppointmentMode;
  date: string;
  startTime: string;
  endTime: string;
  appointmentTime: string;
  notes: string;
}

interface CommodityDraft {
  id: string;
  fromPosition: number;
  toPosition: number;
  commodity: string;
  description: string;
  weight: string;
  units: string;
  pallets: string;
}

interface CreateLoadDraft {
  customerName: string;
  billTo: string;
  operatingCompany: string;
  enteredByName: string;
  bookedByName: string;
  bookedForTeam: string;
  brokerLoadNumber: string;
  bolNumber: string;
  pickupNumber: string;
  poNumber: string;
  consigneeReference: string;
  equipmentType: string;
  preloadedTrailer: boolean;
  preloadedTrailerNumber: string;
  flatRate: string;
  driverPayAmount: string;
  driverPayMethod: string;
  stops: StopDraft[];
  commodities: CommodityDraft[];
}

const equipmentOptions = ['Van', 'Reefer', 'Amazon', 'Power Only'];
const driverPayMethods = ['Flat pay', 'Percentage', 'CPM'];

const emptyStop = (type: StopType, index: number): StopDraft => ({
  id: `stop-${Date.now()}-${index}`,
  type,
  facilityName: '',
  addressLine1: '',
  city: '',
  state: '',
  postalCode: '',
  appointmentType: 'FCFS',
  date: '',
  startTime: '',
  endTime: '',
  appointmentTime: '',
  notes: '',
});

const emptyCommodity = (fromPosition = 1, toPosition = 2): CommodityDraft => ({
  id: `commodity-${Date.now()}-${Math.random()}`,
  fromPosition,
  toPosition,
  commodity: '',
  description: '',
  weight: '',
  units: '',
  pallets: '',
});

const initialDraft = (session: Session): CreateLoadDraft => ({
  customerName: '',
  billTo: '',
  operatingCompany: '312 KG Logistics',
  enteredByName: session.user.fullName ?? session.user.email,
  bookedByName: '',
  bookedForTeam: '',
  brokerLoadNumber: '',
  bolNumber: '',
  pickupNumber: '',
  poNumber: '',
  consigneeReference: '',
  equipmentType: 'Van',
  preloadedTrailer: false,
  preloadedTrailerNumber: '',
  flatRate: '',
  driverPayAmount: '',
  driverPayMethod: 'Flat pay',
  stops: [emptyStop('PICKUP', 0), emptyStop('DELIVERY', 1)],
  commodities: [emptyCommodity()],
});

export const CreateLoadPage = ({
  session,
  onCancel,
  onSaved,
}: {
  session: Session;
  onCancel: () => void;
  onSaved: (load: Load) => void;
}): JSX.Element => {
  const [draft, setDraft] = useState<CreateLoadDraft>(() => initialDraft(session));
  const [isSaving, setIsSaving] = useState(false);
  const [saveMode, setSaveMode] = useState<'load' | 'draft' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const routeLabels = useMemo(
    () =>
      draft.stops.map(
        (stop, index) => `${stop.type === 'PICKUP' ? 'Pickup' : 'Delivery'} ${index + 1}`,
      ),
    [draft.stops],
  );

  const update = <K extends keyof CreateLoadDraft>(field: K, value: CreateLoadDraft[K]): void => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const updateStop = (id: string, field: keyof StopDraft, value: string): void => {
    setDraft((current) => ({
      ...current,
      stops: current.stops.map((stop) => (stop.id === id ? { ...stop, [field]: value } : stop)),
    }));
  };

  const updateCommodity = (id: string, field: keyof CommodityDraft, value: string): void => {
    setDraft((current) => ({
      ...current,
      commodities: current.commodities.map((commodity) =>
        commodity.id === id ? { ...commodity, [field]: value } : commodity,
      ),
    }));
  };

  const addStop = (): void => {
    setDraft((current) => ({
      ...current,
      stops: [...current.stops, emptyStop('DELIVERY', current.stops.length)],
    }));
  };

  const removeStop = (id: string): void => {
    setDraft((current) => {
      const removedPosition = current.stops.findIndex((stop) => stop.id === id) + 1;
      const remaining = current.stops.filter((stop) => stop.id !== id);
      const normalizePosition = (position: number): number => {
        if (position > removedPosition) return position - 1;
        if (position === removedPosition) return Math.min(position, Math.max(remaining.length, 1));
        return position;
      };
      return {
        ...current,
        stops: remaining,
        commodities: current.commodities.map((commodity) => ({
          ...commodity,
          fromPosition: normalizePosition(commodity.fromPosition),
          toPosition: normalizePosition(commodity.toPosition),
        })),
      };
    });
  };

  const validate = (saveAsDraft: boolean): string | null => {
    if (draft.preloadedTrailer && draft.preloadedTrailerNumber.trim().length === 0) {
      return 'Add a trailer number when Preloaded Trailer is set to Yes.';
    }
    if (saveAsDraft) return null;
    if (!draft.customerName.trim()) return 'Customer is required before saving the load.';
    if (!draft.billTo.trim()) return 'Bill To is required before saving the load.';
    if (!draft.bookedByName.trim()) return 'Booked By is required before saving the load.';
    if (!draft.bookedForTeam.trim()) return 'Booked For is required before saving the load.';
    if (!draft.brokerLoadNumber.trim())
      return 'Customer / Load Number is required before saving the load.';
    if (draft.stops.length < 2) return 'Add at least one pickup and one delivery stop.';
    if (!draft.stops.some((stop) => stop.type === 'PICKUP')) return 'Add at least one pickup stop.';
    if (!draft.stops.some((stop) => stop.type === 'DELIVERY'))
      return 'Add at least one delivery stop.';
    const incompleteStop = draft.stops.find(
      (stop) =>
        !stop.facilityName.trim() ||
        !stop.addressLine1.trim() ||
        !stop.city.trim() ||
        !stop.state.trim() ||
        !stop.postalCode.trim(),
    );
    if (incompleteStop !== undefined)
      return 'Complete the facility and address fields for every stop.';
    if (draft.commodities.some((commodity) => !commodity.commodity.trim())) {
      return 'Add a commodity to each goods line or remove the empty line.';
    }
    if (draft.commodities.length === 0) return 'Add at least one goods / commodity line.';
    if (!draft.flatRate.trim()) return 'Flat Rate is required before saving the load.';
    return null;
  };

  const toIso = (date: string, time: string): string | null => {
    if (!date || !time) return null;
    return new Date(`${date}T${time}`).toISOString();
  };

  const buildInput = (saveAsDraft: boolean): ManualLoadInput => ({
    saveAsDraft,
    customerName: draft.customerName.trim() || undefined,
    billTo: draft.billTo.trim() || undefined,
    operatingCompany: draft.operatingCompany.trim() || undefined,
    bookedByName: draft.bookedByName.trim() || undefined,
    bookedForTeam: draft.bookedForTeam.trim() || undefined,
    brokerLoadNumber: draft.brokerLoadNumber.trim() || undefined,
    bolNumber: draft.bolNumber.trim() || undefined,
    pickupNumber: draft.pickupNumber.trim() || undefined,
    poNumber: draft.poNumber.trim() || undefined,
    consigneeReference: draft.consigneeReference.trim() || undefined,
    equipmentType: draft.equipmentType || undefined,
    preloadedTrailer: draft.preloadedTrailer,
    preloadedTrailerNumber: draft.preloadedTrailerNumber.trim() || undefined,
    stops: draft.stops.map((stop) => ({
      type: stop.type,
      facilityName: stop.facilityName.trim(),
      addressLine1: stop.addressLine1.trim(),
      city: stop.city.trim(),
      state: stop.state.trim(),
      postalCode: stop.postalCode.trim(),
      appointmentType: stop.appointmentType,
      appointmentStartAt: stop.appointmentType === 'FCFS' ? toIso(stop.date, stop.startTime) : null,
      appointmentEndAt: stop.appointmentType === 'FCFS' ? toIso(stop.date, stop.endTime) : null,
      appointmentAt:
        stop.appointmentType === 'BY_APPOINTMENT' ? toIso(stop.date, stop.appointmentTime) : null,
      instructions: stop.notes.trim() || undefined,
    })),
    commodities: draft.commodities.map((commodity) => ({
      fromPosition: commodity.fromPosition,
      toPosition: commodity.toPosition,
      commodity: commodity.commodity.trim(),
      description: commodity.description.trim() || undefined,
      weight: commodity.weight.trim() || undefined,
      units: commodity.units ? Number(commodity.units) : undefined,
      pallets: commodity.pallets ? Number(commodity.pallets) : undefined,
    })),
    rate: draft.flatRate.trim() || undefined,
    driverPayAmount: draft.driverPayAmount.trim() || undefined,
    driverPayMethod: draft.driverPayMethod || undefined,
  });

  const submit = async (saveAsDraft: boolean): Promise<void> => {
    setError(null);
    setNotice(null);
    const validationError = validate(saveAsDraft);
    if (validationError !== null) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSaveMode(saveAsDraft ? 'draft' : 'load');
    setIsSaving(true);
    try {
      const created = await api.createManualLoad(session.accessToken, buildInput(saveAsDraft));
      if (saveAsDraft) {
        setNotice('Draft saved. You can continue editing it from Loads.');
        onSaved(created);
      } else {
        onSaved(created);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save this load.');
    } finally {
      setIsSaving(false);
      setSaveMode(null);
    }
  };

  return (
    <section className="create-load-page" aria-label="Create Load">
      <div className="create-load-heading">
        <div>
          <button className="back-button" type="button" onClick={onCancel}>
            <ArrowLeft size={17} /> Back to workspace
          </button>
          <div className="create-load-title-row">
            <div>
              <p className="eyebrow">Manual entry</p>
              <h1>
                Create <span>Load</span>
              </h1>
              <p className="intro-copy">
                Book a load directly into the dispatch workflow. Add the route first, then confirm
                the money.
              </p>
            </div>
            <span className="manual-entry-badge">
              <span /> New shipment
            </span>
          </div>
        </div>
      </div>

      {error === null && notice === null ? null : (
        <div
          className={error === null ? 'create-load-alert success' : 'create-load-alert'}
          role="alert"
        >
          {error === null ? <Check size={17} /> : null}
          <span>{error ?? notice}</span>
        </div>
      )}

      <form
        className="create-load-form"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          void submit(false);
        }}
      >
        <div className="create-load-main-column">
          <SectionCard
            eyebrow="01 · General information"
            title="Who is this load for?"
            icon={<Route size={17} />}
          >
            <div className="field-grid three-up">
              <Field label="Customer" required hint="Broker or customer booked from">
                <input
                  value={draft.customerName}
                  onChange={(event) => update('customerName', event.target.value)}
                  placeholder="e.g. C.H. Robinson"
                />
              </Field>
              <Field label="Bill To" required hint="Entity receiving our invoice">
                <input
                  value={draft.billTo}
                  onChange={(event) => update('billTo', event.target.value)}
                  placeholder="e.g. 312 KG Logistics"
                />
              </Field>
              <Field label="Company" required>
                <input
                  value={draft.operatingCompany}
                  onChange={(event) => update('operatingCompany', event.target.value)}
                  placeholder="Operating company"
                />
              </Field>
              <Field label="Entered By" hint="Auto-filled from your account">
                <div className="readonly-field">
                  <Check size={15} /> {draft.enteredByName}
                </div>
              </Field>
              <Field label="Booked By" required hint="Dispatcher who booked the load">
                <input
                  value={draft.bookedByName}
                  onChange={(event) => update('bookedByName', event.target.value)}
                  placeholder="e.g. Altyn"
                />
              </Field>
              <Field label="Booked For" required hint="Team or operating group">
                <input
                  value={draft.bookedForTeam}
                  onChange={(event) => update('bookedForTeam', event.target.value)}
                  placeholder="e.g. Team 13"
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="02 · Reference numbers"
            title="Keep the broker references together"
            icon={<MapPin size={17} />}
          >
            <div className="field-grid three-up">
              <Field label="Customer / Load Number" required hint="Load number from the RC">
                <input
                  value={draft.brokerLoadNumber}
                  onChange={(event) => update('brokerLoadNumber', event.target.value)}
                  placeholder="e.g. 784521"
                />
              </Field>
              <Field label="BOL Number" optional>
                <input
                  value={draft.bolNumber}
                  onChange={(event) => update('bolNumber', event.target.value)}
                />
              </Field>
              <Field label="Pickup Number" optional>
                <input
                  value={draft.pickupNumber}
                  onChange={(event) => update('pickupNumber', event.target.value)}
                />
              </Field>
              <Field label="PO Number" optional>
                <input
                  value={draft.poNumber}
                  onChange={(event) => update('poNumber', event.target.value)}
                />
              </Field>
              <Field label="Consignee Reference" optional>
                <input
                  value={draft.consigneeReference}
                  onChange={(event) => update('consigneeReference', event.target.value)}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="03 · Equipment"
            title="Set the equipment requirements"
            icon={<Truck size={17} />}
          >
            <div className="field-grid equipment-grid">
              <Field label="Equipment Type" required>
                <select
                  value={draft.equipmentType}
                  onChange={(event) => update('equipmentType', event.target.value)}
                >
                  {equipmentOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </Field>
              <div className="field-block">
                <span className="field-label">Preloaded Trailer</span>
                <div className="segmented-control" role="group" aria-label="Preloaded trailer">
                  <button
                    type="button"
                    className={draft.preloadedTrailer ? 'selected' : ''}
                    onClick={() => update('preloadedTrailer', true)}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={!draft.preloadedTrailer ? 'selected' : ''}
                    onClick={() => update('preloadedTrailer', false)}
                  >
                    No
                  </button>
                </div>
              </div>
              {draft.preloadedTrailer ? (
                <Field label="Preloaded Trailer Number" required>
                  <input
                    value={draft.preloadedTrailerNumber}
                    onChange={(event) => update('preloadedTrailerNumber', event.target.value)}
                    placeholder="e.g. 541805"
                  />
                </Field>
              ) : (
                <div className="equipment-note">
                  <Check size={16} /> No trailer number required for this load.
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="04 · Route"
            title="Stops"
            icon={<MapPin size={17} />}
            action={
              <button className="section-action" type="button" onClick={addStop}>
                <Plus size={16} /> Add Stop
              </button>
            }
          >
            <p className="section-helper">
              Add every pickup and delivery in sequence. Each stop keeps its own appointment and
              location notes.
            </p>
            <div className="stop-editor-list">
              {draft.stops.map((stop, index) => (
                <StopEditor
                  key={stop.id}
                  stop={stop}
                  index={index}
                  canRemove={draft.stops.length > 2}
                  onChange={updateStop}
                  onRemove={() => removeStop(stop.id)}
                />
              ))}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="05 · Goods"
            title="Goods / Commodity"
            icon={<Truck size={17} />}
            action={
              <button
                className="section-action"
                type="button"
                onClick={() =>
                  update('commodities', [
                    ...draft.commodities,
                    emptyCommodity(1, Math.min(2, draft.stops.length)),
                  ])
                }
              >
                <Plus size={16} /> Add line
              </button>
            }
          >
            <p className="section-helper">
              Use flexible commodity text for anything from FAK and general freight to produce or
              melons.
            </p>
            <div className="commodity-table-head">
              <span>From</span>
              <span>To</span>
              <span>Commodity</span>
              <span>Description</span>
              <span>Weight</span>
              <span>Units</span>
              <span>Pallets</span>
              <span />
            </div>
            <div className="commodity-list">
              {draft.commodities.map((commodity) => (
                <CommodityEditor
                  key={commodity.id}
                  commodity={commodity}
                  routeLabels={routeLabels}
                  stopCount={draft.stops.length}
                  onChange={updateCommodity}
                  onRemove={() =>
                    update(
                      'commodities',
                      draft.commodities.filter((item) => item.id !== commodity.id),
                    )
                  }
                />
              ))}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="06 · Charges"
            title="Revenue and driver pay"
            icon={<CircleDollarSign size={17} />}
          >
            <div className="charges-grid">
              <div className="charge-highlight revenue-highlight">
                <span className="field-label">
                  Flat Rate <em>required</em>
                </span>
                <div className="money-input">
                  <span>$</span>
                  <input
                    inputMode="decimal"
                    value={draft.flatRate}
                    onChange={(event) => update('flatRate', event.target.value)}
                    placeholder="2,766.85"
                  />
                </div>
                <small>Total revenue billed to the customer.</small>
              </div>
              <div className="charge-highlight driver-highlight">
                <span className="field-label">
                  Driver Pay <em>separate value</em>
                </span>
                <div className="money-input">
                  <span>$</span>
                  <input
                    inputMode="decimal"
                    value={draft.driverPayAmount}
                    onChange={(event) => update('driverPayAmount', event.target.value)}
                    placeholder="830.06"
                  />
                </div>
                <div className="pay-method-row">
                  <span>Pay method</span>
                  <select
                    value={draft.driverPayMethod}
                    onChange={(event) => update('driverPayMethod', event.target.value)}
                  >
                    {driverPayMethods.map((method) => (
                      <option key={method}>{method}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="charges-note">
              <CircleDollarSign size={16} />
              <span>
                Revenue and driver pay are stored independently so future percentage, CPM, or
                flat-pay rules can be added without changing the load record.
              </span>
            </div>
          </SectionCard>
        </div>

        <CreateLoadActions
          isSaving={isSaving}
          saveMode={saveMode}
          onCancel={onCancel}
          onDraft={() => void submit(true)}
        />
      </form>
    </section>
  );
};

const SectionCard = ({
  eyebrow,
  title,
  icon,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: JSX.Element;
  action?: JSX.Element;
  children: React.ReactNode;
}): JSX.Element => (
  <section className="section-card">
    <div className="section-card-heading">
      <div className="section-title-wrap">
        <span className="section-icon">{icon}</span>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const Field = ({
  label,
  required,
  optional,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}): JSX.Element => (
  <label className="field-block">
    <span className="field-label">
      {label} {required ? <em>required</em> : null} {optional ? <small>optional</small> : null}
    </span>
    {children}
    {hint ? <span className="field-hint">{hint}</span> : null}
  </label>
);

const StopEditor = ({
  stop,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  stop: StopDraft;
  index: number;
  canRemove: boolean;
  onChange: (id: string, field: keyof StopDraft, value: string) => void;
  onRemove: () => void;
}): JSX.Element => (
  <article className="stop-editor">
    <div className="stop-editor-heading">
      <div className="stop-number">{String(index + 1).padStart(2, '0')}</div>
      <div>
        <span className={`stop-type-label ${stop.type === 'PICKUP' ? 'pickup' : 'delivery'}`}>
          {stop.type === 'PICKUP' ? 'Pickup' : 'Delivery'}
        </span>
        <strong>
          {stop.facilityName || `${stop.type === 'PICKUP' ? 'Pickup' : 'Delivery'} ${index + 1}`}
        </strong>
      </div>
      <div className="stop-type-toggle">
        <button
          type="button"
          className={stop.type === 'PICKUP' ? 'active pickup' : ''}
          onClick={() => onChange(stop.id, 'type', 'PICKUP')}
        >
          Pickup
        </button>
        <button
          type="button"
          className={stop.type === 'DELIVERY' ? 'active delivery' : ''}
          onClick={() => onChange(stop.id, 'type', 'DELIVERY')}
        >
          Delivery
        </button>
      </div>
      {canRemove ? (
        <button
          className="icon-action danger"
          type="button"
          onClick={onRemove}
          aria-label={`Remove stop ${index + 1}`}
        >
          <Trash2 size={16} />
        </button>
      ) : null}
    </div>
    <div className="stop-fields">
      <Field label="Facility / Company" required>
        <input
          value={stop.facilityName}
          onChange={(event) => onChange(stop.id, 'facilityName', event.target.value)}
          placeholder="Facility name"
        />
      </Field>
      <Field label="Street address" required>
        <input
          value={stop.addressLine1}
          onChange={(event) => onChange(stop.id, 'addressLine1', event.target.value)}
          placeholder="Street and suite"
        />
      </Field>
      <Field label="City" required>
        <input
          value={stop.city}
          onChange={(event) => onChange(stop.id, 'city', event.target.value)}
          placeholder="City"
        />
      </Field>
      <Field label="State" required>
        <input
          value={stop.state}
          onChange={(event) => onChange(stop.id, 'state', event.target.value)}
          placeholder="ST"
          maxLength={3}
        />
      </Field>
      <Field label="ZIP Code" required>
        <input
          value={stop.postalCode}
          onChange={(event) => onChange(stop.id, 'postalCode', event.target.value)}
          placeholder="ZIP"
        />
      </Field>
    </div>
    <div className="appointment-panel">
      <div className="appointment-heading">
        <span className="field-label">
          <Clock3 size={15} /> Appointment
        </span>
        <div className="appointment-toggle">
          <button
            type="button"
            className={stop.appointmentType === 'FCFS' ? 'active' : ''}
            onClick={() => onChange(stop.id, 'appointmentType', 'FCFS')}
          >
            FCFS
          </button>
          <button
            type="button"
            className={stop.appointmentType === 'BY_APPOINTMENT' ? 'active' : ''}
            onClick={() => onChange(stop.id, 'appointmentType', 'BY_APPOINTMENT')}
          >
            By Appointment
          </button>
        </div>
      </div>
      {stop.appointmentType === 'FCFS' ? (
        <div className="appointment-fields">
          <Field label="Date">
            <span className="input-with-icon">
              <CalendarClock size={15} />
              <input
                type="date"
                value={stop.date}
                onChange={(event) => onChange(stop.id, 'date', event.target.value)}
              />
            </span>
          </Field>
          <Field label="Start time">
            <input
              type="time"
              value={stop.startTime}
              onChange={(event) => onChange(stop.id, 'startTime', event.target.value)}
            />
          </Field>
          <Field label="End time">
            <input
              type="time"
              value={stop.endTime}
              onChange={(event) => onChange(stop.id, 'endTime', event.target.value)}
            />
          </Field>
        </div>
      ) : (
        <div className="appointment-fields">
          <Field label="Appointment date">
            <span className="input-with-icon">
              <CalendarClock size={15} />
              <input
                type="date"
                value={stop.date}
                onChange={(event) => onChange(stop.id, 'date', event.target.value)}
              />
            </span>
          </Field>
          <Field label="Exact time">
            <input
              type="time"
              value={stop.appointmentTime}
              onChange={(event) => onChange(stop.id, 'appointmentTime', event.target.value)}
            />
          </Field>
        </div>
      )}
    </div>
    <Field label="Stop Notes" hint="Location-specific instructions">
      <textarea
        value={stop.notes}
        onChange={(event) => onChange(stop.id, 'notes', event.target.value)}
        placeholder="e.g. PU# required at guard shack"
        rows={2}
      />
    </Field>
  </article>
);

const CommodityEditor = ({
  commodity,
  routeLabels,
  stopCount,
  onChange,
  onRemove,
}: {
  commodity: CommodityDraft;
  routeLabels: string[];
  stopCount: number;
  onChange: (id: string, field: keyof CommodityDraft, value: string) => void;
  onRemove: () => void;
}): JSX.Element => (
  <div className="commodity-row">
    <select
      aria-label="Commodity from"
      value={commodity.fromPosition}
      onChange={(event) => onChange(commodity.id, 'fromPosition', event.target.value)}
    >
      {routeLabels.map((label, index) => (
        <option key={`${label}-from`} value={index + 1}>
          {label}
        </option>
      ))}
    </select>
    <select
      aria-label="Commodity to"
      value={commodity.toPosition}
      onChange={(event) => onChange(commodity.id, 'toPosition', event.target.value)}
    >
      {routeLabels.map((label, index) => (
        <option key={`${label}-to`} value={index + 1}>
          {label}
        </option>
      ))}
    </select>
    <input
      aria-label="Goods / Commodity"
      value={commodity.commodity}
      onChange={(event) => onChange(commodity.id, 'commodity', event.target.value)}
      placeholder="FAK, produce…"
    />
    <input
      aria-label="Goods description"
      value={commodity.description}
      onChange={(event) => onChange(commodity.id, 'description', event.target.value)}
      placeholder="General freight"
    />
    <input
      aria-label="Goods weight"
      value={commodity.weight}
      onChange={(event) => onChange(commodity.id, 'weight', event.target.value)}
      placeholder="42,500 lbs"
    />
    <input
      aria-label="Goods units"
      inputMode="numeric"
      value={commodity.units}
      onChange={(event) => onChange(commodity.id, 'units', event.target.value)}
      placeholder="24"
    />
    <input
      aria-label="Goods pallets"
      inputMode="numeric"
      value={commodity.pallets}
      onChange={(event) => onChange(commodity.id, 'pallets', event.target.value)}
      placeholder="24"
    />
    <button
      className="icon-action danger"
      type="button"
      onClick={onRemove}
      disabled={stopCount < 1}
      aria-label="Remove goods line"
    >
      <Trash2 size={16} />
    </button>
  </div>
);

const CreateLoadActions = ({
  isSaving,
  saveMode,
  onCancel,
  onDraft,
}: {
  isSaving: boolean;
  saveMode: 'load' | 'draft' | null;
  onCancel: () => void;
  onDraft: () => void;
}): JSX.Element => (
  <aside className="create-load-actions">
    <div className="save-summary">
      <span className="save-summary-icon">
        <Save size={17} />
      </span>
      <div>
        <strong>Ready to dispatch?</strong>
        <small>Save Load generates the internal 312KG shipment ID.</small>
      </div>
    </div>
    <div className="action-buttons">
      <button className="secondary-button" type="button" onClick={onCancel} disabled={isSaving}>
        Cancel
      </button>
      <button className="draft-button" type="button" onClick={onDraft} disabled={isSaving}>
        {saveMode === 'draft' ? <LoaderCircle className="spinner" size={17} /> : null} Save as Draft
      </button>
      <button className="primary-button" type="submit" disabled={isSaving}>
        {saveMode === 'load' ? <LoaderCircle className="spinner" size={18} /> : <Save size={18} />}{' '}
        {saveMode === 'load' ? 'Saving Load…' : 'Save Load'}
      </button>
    </div>
  </aside>
);

// Pages/Dashboard.jsx — vista de administración (ADMIN / STAFF)
import { useEffect, useMemo, useState } from 'react';
import { Download, Pencil, Trophy, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import './Dashboard.css';

const PLAN_TONE = { Mensual: 'green', Quincenal: 'amber', Diario: 'pink' };

// Pesos colombianos: el sufijo "COP" ya identifica la moneda, así que no
// anteponemos "$" (sería redundante).
const formatCurrency = (n) =>
  `${Number(n).toLocaleString('es-CO')} COP`;

const initials = (nombre, apellido) =>
  `${nombre?.[0] ?? ''}${apellido?.[0] ?? ''}`.toUpperCase();

// "2026-06-06" en hora local (no UTC) para precargar el input de fecha.
const todayISO = () => {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
};

const fmtFecha = (value) =>
  new Date(value).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });

const toCSV = (clientes) => {
  const header = ['Cliente', 'Asistencias', 'Plan', 'Día actual', 'Duración (días)', 'Vigencia (%)'];
  const rows = clientes.map((c) => [
    `${c.nombre} ${c.apellido}`,
    c.asistencias,
    c.plan,
    c.diaActual ?? '—',
    c.diasPlan ?? '—',
    c.progreso,
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
};

const emptyForm = () => ({ clientId: '', planId: '', fecha: todayISO() });

const Dashboard = () => {
  const { user } = useAuth();
  // status: 'loading' | 'ready' | 'error'. No hay datos de ejemplo: se muestra
  // un estado de carga hasta que la API responde, así nada "parpadea".
  const [status, setStatus] = useState('loading');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [planes, setPlanes] = useState([]);

  // Modal de registro de suscripción + notificaciones
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [toast, setToast] = useState(null); // { type: 'ok'|'error', msg }

  useEffect(() => {
    let cancelled = false;
    api.dashboard
      .overview()
      .then((res) => {
        if (cancelled) return;
        setData({ metrics: res.metrics, clientes: res.clientes ?? [] });
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setStatus('error');
      });
    api.plans
      .list()
      .then((res) => !cancelled && setPlanes(res.plans ?? []))
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Recarga del panel tras registrar una suscripción.
  const reloadOverview = () =>
    api.dashboard
      .overview()
      .then((res) => {
        setData({ metrics: res.metrics, clientes: res.clientes ?? [] });
        setStatus('ready');
        setError(null);
      })
      .catch((err) => {
        setError(err);
        setStatus('error');
      });

  /* ── Auto-cierre de la notificación ── */
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── Bloqueo de scroll del fondo con modal abierto ── */
  useEffect(() => {
    document.body.style.overflow = modalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [modalOpen]);

  const metricCards = useMemo(() => {
    const m = data?.metrics ?? {};
    return [
      { key: 'clientes',    label: 'Clientes activos',      value: m.clientesActivos,      hint: 'Total vigente' },
      { key: 'asistencias', label: 'Asistencias del mes',   value: m.asistenciasMes,       hint: 'Mes en curso' },
      { key: 'suscrip',     label: 'Suscripciones activas', value: m.suscripcionesActivas, hint: 'Planes vigentes' },
      { key: 'ingresos',    label: 'Ingresos del mes',      value: m.ingresosMes != null ? formatCurrency(m.ingresosMes) : null, hint: 'Por planes vigentes' },
    ];
  }, [data]);

  const clientes = data?.clientes ?? [];
  const sinClientes = clientes.length === 0;

  // Cliente con más asistencias en el mes en curso. En caso de empate se queda
  // el primero (los clientes vienen ordenados por nombre desde la API).
  const topCliente = useMemo(() => {
    const list = data?.clientes ?? [];
    return list.reduce(
      (mejor, c) => ((c.asistencias ?? 0) > (mejor?.asistencias ?? 0) ? c : mejor),
      null,
    );
  }, [data]);

  const subtitle =
    status === 'loading' ? '· cargando…'
      : status === 'error' ? '· no se pudieron cargar los datos'
        : '· datos en vivo';

  const errorMessage =
    error?.status === 401 ? 'Inicia sesión para ver el panel.'
      : error?.status === 403 ? 'No tienes permisos para ver el panel (se requiere ADMIN o STAFF).'
        : 'No se pudieron cargar los datos. Revisa que el servidor esté activo.';

  const handleDownload = () => {
    if (!clientes.length) return;
    const csv = toCSV(clientes);
    // BOM (U+FEFF) para que Excel abra el CSV con acentos correctos.
    const blob = new Blob([String.fromCharCode(0xFEFF) + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'constanfit-clientes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Modal: registrar suscripción ── */
  const setField = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const openModal = () => {
    setForm(emptyForm());
    setFormError(null);
    setModalOpen(true);
  };

  // Vista previa del vencimiento: fecha de inicio + duración del plan elegido.
  const planSel = planes.find((p) => String(p.id) === String(form.planId));
  const vencePreview =
    planSel && form.fecha
      ? (() => {
          const end = new Date(`${form.fecha}T00:00`);
          end.setDate(end.getDate() + planSel.duracionDias);
          return fmtFecha(end);
        })()
      : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!form.clientId || !form.planId) {
      setFormError('Selecciona el cliente y el plan.');
      return;
    }

    setSaving(true);
    try {
      await api.suscripciones.create({
        clientId: Number(form.clientId),
        planId: Number(form.planId),
        startDate: new Date(`${form.fecha}T00:00`).toISOString(),
      });
      setModalOpen(false);
      setToast({ type: 'ok', msg: 'Plan actualizado.' });
      await reloadOverview();
    } catch (err) {
      setFormError(
        err?.status === 401 || err?.status === 403
          ? 'No tienes permisos para editar planes.'
          : 'No se pudo guardar el plan. Verifica que el servidor esté activo.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dash">
      <header className="dash-head">
        <div>
          <span className="dash-overline">Panel</span>
          <h1 className="dash-title">Hola, {user?.username ?? 'admin'}</h1>
          <p className="dash-subtitle">Resumen de tu gimnasio {subtitle}</p>
        </div>
      </header>

      <section className="dash-metrics" aria-label="Métricas">
        {metricCards.map(({ key, label, value, hint }) => (
          <article className="dash-stat" key={key}>
            <span className="dash-stat-label">{label}</span>
            <span className="dash-stat-value">{status === 'ready' && value != null ? value : '—'}</span>
            <span className="dash-stat-hint">{hint}</span>
          </article>
        ))}
      </section>

      {status === 'ready' && topCliente && topCliente.asistencias > 0 && (
        <section className="dash-top" aria-label="Cliente más constante del mes">
          <span className="dash-top-badge" aria-hidden>
            <Trophy size={22} strokeWidth={2.2} />
          </span>
          <div className="dash-top-main">
            <span className="dash-top-overline">Cliente más constante del mes</span>
            <span className="dash-top-name">
              <span className="client-avatar" aria-hidden>
                {initials(topCliente.nombre, topCliente.apellido)}
              </span>
              {topCliente.nombre} {topCliente.apellido}
            </span>
          </div>
          <div className="dash-top-count">
            <span className="dash-top-count-value">{topCliente.asistencias}</span>
            <span className="dash-top-count-label">asistencias</span>
          </div>
        </section>
      )}

      <section className="dash-panel" aria-label="Clientes">
        <div className="dash-panel-bar">
          <h2 className="dash-panel-title">Clientes y planes</h2>
          <button type="button" className="dash-btn dash-btn--primary" onClick={openModal}>
            <Pencil size={15} strokeWidth={2.5} aria-hidden />
            Editar plan
          </button>
        </div>

        <div className="dash-table" role="table">
          <div className="dash-row dash-row--head" role="row">
            <span role="columnheader">Cliente</span>
            <span role="columnheader" className="ta-center">Asistencias</span>
            <span role="columnheader">Plan</span>
            <span role="columnheader">Vigencia del plan</span>
          </div>

          {status === 'loading' && (
            <div className="dash-empty">Cargando datos…</div>
          )}

          {status === 'error' && (
            <div className="dash-empty">{errorMessage}</div>
          )}

          {status === 'ready' && clientes.length === 0 && (
            <div className="dash-empty">Aún no hay clientes registrados.</div>
          )}

          {status === 'ready' && clientes.map((c) => (
            <div className="dash-row" role="row" key={c.id}>
              <span role="cell" className="cell-client">
                <span className="client-avatar" aria-hidden>{initials(c.nombre, c.apellido)}</span>
                <span className="client-name">{c.nombre} {c.apellido}</span>
              </span>
              <span role="cell" className="ta-center cell-att">{c.asistencias}</span>
              <span role="cell">
                <span className={`plan-badge plan-badge--${PLAN_TONE[c.plan] ?? 'neutral'}`}>
                  {c.plan}
                </span>
              </span>
              <span role="cell" className="cell-progress">
                {c.diasPlan == null ? (
                  <span className="progress-empty">Sin plan activo</span>
                ) : (
                  <>
                    <span className="progress-meta">
                      <span>Día {c.diaActual} de {c.diasPlan}</span>
                      <span className="progress-pct">{c.progreso}%</span>
                    </span>
                    <span
                      className="progress-track"
                      title={c.diasRestantes === 0 ? 'Plan vencido' : `Vence en ${c.diasRestantes} día(s)`}
                    >
                      <span className="progress-fill" style={{ width: `${c.progreso}%` }} />
                    </span>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="dash-actions">
          <button
            type="button"
            className="dash-download"
            onClick={handleDownload}
            disabled={!clientes.length}
          >
            Descargar datos
            <Download size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </section>

      {/* ───────── Modal: Registrar suscripción ───────── */}
      {modalOpen && (
        <div className="dash-overlay" onMouseDown={() => setModalOpen(false)}>
          <div
            className="dash-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dash-modal-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header className="dash-modal-head">
              <h2 className="dash-modal-title" id="dash-modal-title">Editar plan</h2>
              <button
                type="button"
                className="dash-icon-btn"
                onClick={() => setModalOpen(false)}
                aria-label="Cerrar"
              >
                <X size={18} strokeWidth={2} aria-hidden />
              </button>
            </header>

            <form className="dash-form" onSubmit={handleSubmit}>
              <label className="dash-field">
                <span className="dash-field-label">Cliente *</span>
                <select className="dash-input" value={form.clientId} onChange={setField('clientId')} required>
                  <option value="">{sinClientes ? 'No hay clientes disponibles' : 'Selecciona un cliente'}</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
                  ))}
                </select>
              </label>

              {sinClientes && (
                <p className="dash-form-hint">Primero agrega clientes desde la sección Asistencias.</p>
              )}

              <label className="dash-field">
                <span className="dash-field-label">Plan *</span>
                <select className="dash-input" value={form.planId} onChange={setField('planId')} required>
                  <option value="">Selecciona un plan</option>
                  {planes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} · {p.duracionDias} día{p.duracionDias === 1 ? '' : 's'}
                    </option>
                  ))}
                </select>
              </label>

              <label className="dash-field">
                <span className="dash-field-label">Fecha de inicio *</span>
                <input type="date" className="dash-input" value={form.fecha} onChange={setField('fecha')} required />
              </label>

              {vencePreview && (
                <p className="dash-form-hint">El plan vence automáticamente el {vencePreview}.</p>
              )}

              {formError && <p className="dash-form-error">{formError}</p>}

              <div className="dash-modal-foot">
                <button type="button" className="dash-btn" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="dash-btn dash-btn--primary" disabled={saving || sinClientes}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────── Notificación ───────── */}
      {toast && (
        <div className={`dash-toast dash-toast--${toast.type}`} role="status">
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default Dashboard;

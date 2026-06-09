// Pages/Asistencias.jsx — Gestión de Asistencias (ADMIN / STAFF)
// Plataforma de control de asistencia con estética corporativa (SaaS).
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  X,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  SlidersHorizontal,
  UserPlus,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../lib/api';
import './Asistencias.css';

/* ───────────────────────── Utilidades de fecha ───────────────────────── */

// "2026-06-05" en hora local (no UTC) para precargar inputs de fecha.
const todayISO = () => isoLocalDate(new Date());

// Convierte un Date/ISO a "YYYY-MM-DD" en hora local.
function isoLocalDate(value) {
  const d = new Date(value);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

const fmtFecha = (iso) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const fechaLarga = () =>
  cap(
    new Date().toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  );

/* ───────────────────────── Semana (grilla) ───────────────────────── */

// Lunes (00:00 local) de la semana que contiene `d`.
function startOfWeekMon(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = x.getDay(); // 0=Dom … 6=Sáb
  x.setDate(x.getDate() + (dow === 0 ? -6 : 1 - dow));
  return x;
}

const fmtDayName = (d) => cap(d.toLocaleDateString('es-CO', { weekday: 'long' }));
const fmtDayNum = (d) => String(d.getDate()).padStart(2, '0');

// "1–6 jun 2026" (incluye ambos meses si la semana cruza de mes).
function weekRangeLabel(days) {
  const a = days[0];
  const b = days[days.length - 1];
  const mB = cap(b.toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''));
  if (a.getMonth() === b.getMonth()) {
    return `${a.getDate()}–${b.getDate()} ${mB} ${b.getFullYear()}`;
  }
  const mA = cap(a.toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''));
  return `${a.getDate()} ${mA} – ${b.getDate()} ${mB} ${b.getFullYear()}`;
}

/* ───────────────────────── Estados de asistencia ─────────────────────── */

const ESTADOS = ['PRESENTE', 'TARDANZA', 'JUSTIFICADO', 'AUSENTE'];

const ESTADO_LABEL = {
  PRESENTE: 'Presente',
  TARDANZA: 'Tardanza',
  JUSTIFICADO: 'Justificado',
  AUSENTE: 'Ausente',
};

// El modelo Asistencia aún no persiste "estado": se deriva de las notas
// (o se respeta `a.estado` si el backend lo expone en el futuro).
// Un registro existente cuenta como "Presente" salvo que las notas indiquen otra cosa.
const estadoDe = (a) => {
  if (a.estado) return String(a.estado).toUpperCase();
  const n = (a.notas ?? '').toLowerCase();
  if (/justific/.test(n)) return 'JUSTIFICADO';
  if (/tard/.test(n)) return 'TARDANZA';
  if (/ausen|falt/.test(n)) return 'AUSENTE';
  return 'PRESENTE';
};

const initials = (nombre, apellido) =>
  `${nombre?.[0] ?? ''}${apellido?.[0] ?? ''}`.toUpperCase() || '—';

/* ───────────────────────── Formulario vacío ──────────────────────────── */

const emptyForm = () => ({
  clientId: '',
  fecha: todayISO(),
  notas: '',
});

const emptyClienteForm = () => ({
  nombre: '',
  apellido: '',
  documento: '',
  celular: '',
  nacimiento: '',
});

const emptyFilters = () => ({
  fecha: '',
  desde: '',
  hasta: '',
  estado: '',
  clienteId: '',
});

const PAGE_SIZES = [10, 25, 50];

/* ════════════════════════════ Componente ═════════════════════════════ */

const Asistencias = () => {
  const [clientes, setClientes] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'

  // Búsqueda, filtros, orden y paginación
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState({ key: 'fecha', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Vista activa + semana visible de la grilla
  const [view, setView] = useState('grid'); // 'grid' | 'list'
  const [weekStart, setWeekStart] = useState(() => startOfWeekMon(new Date()));
  const [pending, setPending] = useState(() => new Set()); // celdas en proceso (key "id|fecha")
  const tempIdRef = useRef(-1); // ids optimistas mientras el backend responde

  // Modal de registro
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // Modal de alta de cliente
  const [clienteModalOpen, setClienteModalOpen] = useState(false);
  const [clienteForm, setClienteForm] = useState(emptyClienteForm);
  const [clienteSaving, setClienteSaving] = useState(false);
  const [clienteError, setClienteError] = useState(null);

  // Confirmación de borrado y notificaciones
  const [pendingDelete, setPendingDelete] = useState(null);
  const [toast, setToast] = useState(null); // { type: 'ok'|'error', msg }

  /* ── Carga inicial ── */
  useEffect(() => {
    let cancelled = false;

    api.clientes
      .list()
      .then((res) => !cancelled && setClientes(res.items ?? []))
      .catch(() => {});

    refreshAsistencias(() => cancelled);

    return () => { cancelled = true; };
  }, []);

  const loadClientes = () =>
    api.clientes
      .list()
      .then((res) => setClientes(res.items ?? []))
      .catch(() => {});

  const refreshAsistencias = (isCancelled = () => false) => {
    setStatus('loading');
    api.asistencias
      .list()
      .then((res) => {
        if (isCancelled()) return;
        setAsistencias(res.items ?? []);
        setStatus('ready');
      })
      .catch(() => !isCancelled() && setStatus('error'));
  };

  /* ── Auto-cierre de la notificación ── */
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── Bloqueo de scroll del fondo con modal abierto ── */
  useEffect(() => {
    const open = modalOpen || pendingDelete || clienteModalOpen;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [modalOpen, pendingDelete, clienteModalOpen]);

  /* ── Reset de página al cambiar la vista ── */
  useEffect(() => {
    setPage(1);
  }, [search, filters, pageSize, sort]);

  /* ── Registros enriquecidos (estado + fecha local) ── */
  const enriched = useMemo(
    () =>
      asistencias.map((a) => ({
        ...a,
        estado: estadoDe(a),
        fechaISO: isoLocalDate(a.fecha),
      })),
    [asistencias],
  );

  /* ── Grilla semanal: días visibles, mapa de celdas y filas ── */
  const weekDays = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  // key "clientId|YYYY-MM-DD" -> registro (para conocer su id al desmarcar).
  const cellMap = useMemo(() => {
    const m = new Map();
    for (const a of asistencias) m.set(`${a.clientId}|${isoLocalDate(a.fecha)}`, a);
    return m;
  }, [asistencias]);

  // clientId -> total de asistencias registradas (cuántas veces ha ido al gym).
  const visitsByClient = useMemo(() => {
    const m = new Map();
    for (const a of asistencias) m.set(a.clientId, (m.get(a.clientId) ?? 0) + 1);
    return m;
  }, [asistencias]);

  const gridClientes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = q
      ? clientes.filter((c) =>
          `${c.nombre} ${c.apellido} ${c.identificationNumber ?? ''}`.toLowerCase().includes(q),
        )
      : clientes;
    return [...arr].sort((a, b) =>
      `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`, 'es'),
    );
  }, [clientes, search]);

  const todayIso = todayISO();
  const isToday = (d) => isoLocalDate(d) === todayIso;

  const shiftWeek = (n) =>
    setWeekStart((w) => {
      const x = new Date(w);
      x.setDate(x.getDate() + n * 7);
      return x;
    });
  const goThisWeek = () => setWeekStart(startOfWeekMon(new Date()));

  /* ── Estadísticas ── */
  const stats = useMemo(() => {
    const today = todayISO();
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const hoy = enriched.filter((a) => a.fechaISO === today);
    const distintosHoy = new Set(hoy.map((a) => a.clientId)).size;
    const mes = enriched.filter((a) => a.fechaISO.startsWith(ym)).length;
    const pct = clientes.length
      ? Math.min(100, Math.round((distintosHoy / clientes.length) * 100))
      : null;

    return { hoy: hoy.length, mes, pct };
  }, [enriched, clientes]);

  /* ── Filtrado ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((a) => {
      if (q) {
        const haystack = [
          a.cliente?.nombre,
          a.cliente?.apellido,
          a.cliente?.identificationNumber,
          a.notas,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filters.fecha && a.fechaISO !== filters.fecha) return false;
      if (filters.desde && a.fechaISO < filters.desde) return false;
      if (filters.hasta && a.fechaISO > filters.hasta) return false;
      if (filters.estado && a.estado !== filters.estado) return false;
      if (filters.clienteId && String(a.clientId) !== filters.clienteId) return false;
      return true;
    });
  }, [enriched, search, filters]);

  /* ── Orden ── */
  const sorted = useMemo(() => {
    const value = (a, key) => {
      switch (key) {
        case 'visitas': return visitsByClient.get(a.clientId) ?? 0;
        case 'nombre': return `${a.cliente?.nombre ?? ''} ${a.cliente?.apellido ?? ''}`.trim().toLowerCase();
        case 'documento': return a.cliente?.identificationNumber ?? '';
        case 'fecha': return new Date(a.fecha).getTime();
        case 'estado': return a.estado;
        default: return '';
      }
    };
    const arr = [...filtered];
    arr.sort((a, b) => {
      const va = value(a, sort.key);
      const vb = value(b, sort.key);
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb), 'es');
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sort, visitsByClient]);

  /* ── Paginación ── */
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(total, safePage * pageSize);

  const activeFilters = Object.values(filters).filter(Boolean).length;

  /* ── Handlers ── */
  const setField = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));
  const setFilter = (name) => (e) => setFilters((f) => ({ ...f, [name]: e.target.value }));

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  // Deshabilitado junto con el botón "Registrar Asistencia".
  // const openModal = () => {
  //   setForm(emptyForm());
  //   setFormError(null);
  //   setModalOpen(true);
  // };

  const setCliField = (name) => (e) => setClienteForm((f) => ({ ...f, [name]: e.target.value }));

  const openClienteModal = () => {
    setClienteForm(emptyClienteForm());
    setClienteError(null);
    setClienteModalOpen(true);
  };

  const handleCreateCliente = async (e) => {
    e.preventDefault();
    setClienteError(null);

    if (
      !clienteForm.nombre.trim() ||
      !clienteForm.apellido.trim() ||
      !clienteForm.documento.trim() ||
      !clienteForm.nacimiento
    ) {
      setClienteError('Completa nombre, apellido, documento y fecha de nacimiento.');
      return;
    }

    const payload = {
      nombre: clienteForm.nombre.trim(),
      apellido: clienteForm.apellido.trim(),
      identificationNumber: clienteForm.documento.trim(),
      fechaNacimiento: new Date(`${clienteForm.nacimiento}T00:00`).toISOString(),
    };
    if (clienteForm.celular.trim()) payload.celular = clienteForm.celular.trim();

    setClienteSaving(true);
    try {
      const { item } = await api.clientes.create(payload);
      setClienteModalOpen(false);
      setToast({ type: 'ok', msg: `Cliente agregado · ${item.nombre} ${item.apellido}.` });
      loadClientes();
    } catch (err) {
      setClienteError(
        err?.status === 401 || err?.status === 403
          ? 'No tienes permisos para agregar clientes.'
          : err?.status === 409
            ? 'Ya existe un cliente con ese documento.'
            : 'No se pudo agregar el cliente. Verifica que el servidor esté activo.',
      );
    } finally {
      setClienteSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!form.clientId) {
      setFormError('Selecciona un usuario.');
      return;
    }

    const payload = {
      clientId: Number(form.clientId),
      fecha: new Date(`${form.fecha}T00:00`).toISOString(),
    };
    if (form.notas.trim()) payload.notas = form.notas.trim();

    setSaving(true);
    try {
      await api.asistencias.create(payload);
      const c = clientes.find((x) => x.id === Number(form.clientId));
      setModalOpen(false);
      setToast({
        type: 'ok',
        msg: `Asistencia registrada${c ? ` · ${c.nombre} ${c.apellido}` : ''}.`,
      });
      refreshAsistencias();
    } catch (err) {
      setFormError(
        err?.status === 401 || err?.status === 403
          ? 'No tienes permisos para registrar asistencias.'
          : 'No se pudo registrar la asistencia. Verifica que el servidor esté activo.',
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    try {
      await api.asistencias.remove(id);
      setAsistencias((list) => list.filter((a) => a.id !== id));
      setToast({ type: 'ok', msg: 'Registro eliminado.' });
    } catch {
      setToast({ type: 'error', msg: 'No se pudo eliminar el registro.' });
    } finally {
      setPendingDelete(null);
    }
  };

  /* ── Marcar / desmarcar una celda de la grilla (optimista) ── */
  const setPendingKey = (key, on) =>
    setPending((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  const toggleCell = async (cliente, day) => {
    const iso = isoLocalDate(day);
    const key = `${cliente.id}|${iso}`;
    if (pending.has(key)) return; // ya hay una petición en curso para esta celda

    const existing = cellMap.get(key);
    setPendingKey(key, true);

    if (existing) {
      // Desmarcar: quita en local y borra en el backend; revierte si falla.
      setAsistencias((list) => list.filter((a) => a.id !== existing.id));
      try {
        await api.asistencias.remove(existing.id);
      } catch {
        setAsistencias((list) => [...list, existing]);
        setToast({ type: 'error', msg: 'No se pudo quitar la asistencia.' });
      } finally {
        setPendingKey(key, false);
      }
      return;
    }

    // Marcar: inserta con id temporal y lo reemplaza por el real al responder.
    const tempId = tempIdRef.current--;
    const fechaISO = new Date(`${iso}T12:00`).toISOString();
    setAsistencias((list) => [
      ...list,
      { id: tempId, clientId: cliente.id, fecha: fechaISO, cliente, notas: null },
    ]);
    try {
      const { item } = await api.asistencias.create({ clientId: cliente.id, fecha: fechaISO });
      setAsistencias((list) => list.map((a) => (a.id === tempId ? item : a)));
    } catch (err) {
      setAsistencias((list) => list.filter((a) => a.id !== tempId));
      setToast({
        type: 'error',
        msg:
          err?.status === 401 || err?.status === 403
            ? 'No tienes permisos para registrar asistencias.'
            : 'No se pudo registrar la asistencia.',
      });
    } finally {
      setPendingKey(key, false);
    }
  };

  const clearFilters = () => {
    setFilters(emptyFilters());
    setSearch('');
  };

  const sinClientes = clientes.length === 0;

  /* ── Cabeceras ordenables ── */
  const columns = [
    { key: 'nombre', label: 'Nombre', sortable: true },
    { key: 'visitas', label: 'Visitas', sortable: true, cls: 'is-visitas' },
    { key: 'documento', label: 'Documento', sortable: true },
    { key: 'fecha', label: 'Fecha', sortable: true },
    { key: 'estado', label: 'Estado', sortable: true },
    { key: 'notas', label: 'Observaciones', sortable: false },
  ];

  const SortIcon = ({ active }) =>
    active ? (
      sort.dir === 'asc' ? (
        <ArrowUp size={13} strokeWidth={2.5} aria-hidden />
      ) : (
        <ArrowDown size={13} strokeWidth={2.5} aria-hidden />
      )
    ) : (
      <ArrowUpDown size={13} strokeWidth={2} className="ga-sort-idle" aria-hidden />
    );

  /* ════════════════════════════ Render ════════════════════════════ */

  return (
    <div className="ga">
      {/* ───────── Encabezado ───────── */}
      <header className="ga-header">
        <div className="ga-header-titles">
          <h1 className="ga-title">Gestión de Asistencias</h1>
          <p className="ga-date">{fechaLarga()}</p>
        </div>
      </header>

      {/* ───────── Panel de estadísticas ───────── */}
      <section className="ga-stats" aria-label="Resumen">
        <StatCard label="Asistencias del día" value={stats.hoy} hint="Registros de hoy" />
        <StatCard label="Registros del mes" value={stats.mes} hint="Mes en curso" />
        <StatCard
          label="Porcentaje de asistencia"
          value={stats.pct === null ? '—' : `${stats.pct}%`}
          hint="Usuarios activos hoy"
        />
      </section>

      {/* ───────── Tabla principal ───────── */}
      <section className="ga-panel">
        <div className="ga-panel-actions">
          <div className="ga-header-actions">
            <div className="ga-search">
              <Search size={17} strokeWidth={2} aria-hidden className="ga-search-ico" />
              <input
                type="search"
                className="ga-search-input"
                placeholder={
                  view === 'grid'
                    ? 'Buscar cliente…'
                    : 'Buscar por nombre, documento u observación…'
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Búsqueda global"
              />
            </div>
            <button type="button" className="ga-btn ga-btn--ghost" onClick={openClienteModal}>
              <UserPlus size={16} strokeWidth={2} aria-hidden />
              Agregar cliente
            </button>
            {/* Botón "Registrar Asistencia" deshabilitado a pedido.
            <button type="button" className="ga-btn ga-btn--primary" onClick={openModal}>
              Registrar Asistencia
            </button>
            */}
          </div>
        </div>
        {/* ───────── Selector de vista ───────── */}
        <div className="ga-viewbar">
          <div className="ga-segmented" role="tablist" aria-label="Vista de asistencias">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'grid'}
              className={`ga-seg ${view === 'grid' ? 'is-active' : ''}`}
              onClick={() => setView('grid')}
            >
              Grilla semanal
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'list'}
              className={`ga-seg ${view === 'list' ? 'is-active' : ''}`}
              onClick={() => setView('list')}
            >
              Historial
            </button>
          </div>

          {view === 'grid' ? (
            <div className="ga-weeknav">
              <button
                type="button"
                className="ga-nav-btn"
                onClick={() => shiftWeek(-1)}
                aria-label="Semana anterior"
              >
                <ChevronLeft size={18} strokeWidth={2.5} aria-hidden />
              </button>
              <span className="ga-week-label">{weekRangeLabel(weekDays)}</span>
              <button
                type="button"
                className="ga-nav-btn"
                onClick={() => shiftWeek(1)}
                aria-label="Semana siguiente"
              >
                <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
              </button>
              <button type="button" className="ga-link" onClick={goThisWeek}>
                Hoy
              </button>
            </div>
          ) : (
            <div className="ga-viewbar-right">
              <span className="ga-count">{total} registros</span>
              <button
                type="button"
                className={`ga-btn ga-btn--ghost ${showFilters ? 'is-active' : ''}`}
                onClick={() => setShowFilters((v) => !v)}
                aria-expanded={showFilters}
              >
                <SlidersHorizontal size={16} strokeWidth={2} aria-hidden />
                Filtros
                {activeFilters > 0 && <span className="ga-filter-badge">{activeFilters}</span>}
              </button>
            </div>
          )}
        </div>

        {/* ───────── Vista: Grilla semanal ───────── */}
        {view === 'grid' && (
          <div className="ga-table-wrap">
            <table className={`ga-table ga-grid ${status === 'loading' ? 'is-loading' : ''}`}>
              <thead>
                <tr>
                  <th className="ga-grid-namecol">Cliente</th>
                  {weekDays.map((d) => (
                    <th
                      key={isoLocalDate(d)}
                      className={`ga-daycol ${isToday(d) ? 'is-today' : ''}`}
                    >
                      <span className="ga-daycol-name">{fmtDayName(d)}</span>
                      <span className="ga-daycol-num">{fmtDayNum(d)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gridClientes.map((c) => (
                  <tr key={c.id}>
                    <td className="ga-grid-namecol">
                      <div className="ga-person">
                        <span className="ga-avatar" aria-hidden>
                          {initials(c.nombre, c.apellido)}
                        </span>
                        <span className="ga-person-name">
                          {c.nombre} {c.apellido}
                        </span>
                      </div>
                    </td>
                    {weekDays.map((d) => {
                      const iso = isoLocalDate(d);
                      const key = `${c.id}|${iso}`;
                      const on = cellMap.has(key);
                      const busy = pending.has(key);
                      return (
                        <td key={iso} className={`ga-daycell ${isToday(d) ? 'is-today' : ''}`}>
                          <button
                            type="button"
                            className={`ga-check ${on ? 'is-on' : ''} ${busy ? 'is-pending' : ''}`}
                            onClick={() => toggleCell(c, d)}
                            disabled={busy}
                            aria-pressed={on}
                            aria-label={`${on ? 'Quitar' : 'Marcar'} asistencia de ${c.nombre} ${c.apellido}, ${fmtDayName(d)} ${fmtDayNum(d)}`}
                          >
                            <Check size={15} strokeWidth={3} aria-hidden />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              {gridClientes.length > 0 && (
                <tfoot>
                  <tr className="ga-grid-foot">
                    <td className="ga-grid-namecol">Total por día</td>
                    {weekDays.map((d) => {
                      const iso = isoLocalDate(d);
                      const n = gridClientes.reduce(
                        (acc, c) => acc + (cellMap.has(`${c.id}|${iso}`) ? 1 : 0),
                        0,
                      );
                      return (
                        <td key={iso} className={`ga-daycell ${isToday(d) ? 'is-today' : ''}`}>
                          <span className="ga-foot-num">{n}</span>
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </table>

            {status === 'error' && (
              <div className="ga-state">
                No se pudieron cargar las asistencias. Verifica el servidor.
              </div>
            )}
            {status === 'ready' && clientes.length === 0 && (
              <div className="ga-state">
                Aún no hay clientes. Usa “Agregar cliente” para empezar a marcar.
              </div>
            )}
            {clientes.length > 0 && gridClientes.length === 0 && (
              <div className="ga-state">Ningún cliente coincide con la búsqueda.</div>
            )}
          </div>
        )}

        {/* ───────── Vista: Historial (lista) ───────── */}
        {view === 'list' && (
          <>

        {/* Panel de filtros avanzados */}
        {showFilters && (
          <div className="ga-filters">
            <div className="ga-filters-grid">
              <Field label="Fecha">
                <input type="date" className="ga-input" value={filters.fecha} onChange={setFilter('fecha')} />
              </Field>
              <Field label="Desde">
                <input type="date" className="ga-input" value={filters.desde} onChange={setFilter('desde')} />
              </Field>
              <Field label="Hasta">
                <input type="date" className="ga-input" value={filters.hasta} onChange={setFilter('hasta')} />
              </Field>
              <Field label="Estado">
                <select className="ga-input" value={filters.estado} onChange={setFilter('estado')}>
                  <option value="">Todos</option>
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>{ESTADO_LABEL[e]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Usuario">
                <select className="ga-input" value={filters.clienteId} onChange={setFilter('clienteId')}>
                  <option value="">Todos</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="ga-filters-foot">
              <button type="button" className="ga-link" onClick={clearFilters}>
                Limpiar filtros
              </button>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className="ga-table-wrap">
          <table className="ga-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={col.cls}
                    aria-sort={
                      sort.key === col.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'
                    }
                  >
                    {col.sortable ? (
                      <button type="button" className="ga-th-btn" onClick={() => toggleSort(col.key)}>
                        {col.label}
                        <SortIcon active={sort.key === col.key} />
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
                <th className="is-actions"><span className="ga-sr">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {status === 'loading' &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="ga-skel-row">
                    {columns.map((c) => (
                      <td key={c.key}><span className="ga-skel" /></td>
                    ))}
                    <td><span className="ga-skel" /></td>
                  </tr>
                ))}

              {status === 'ready' &&
                pageItems.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="ga-person">
                        <span className="ga-avatar" aria-hidden>
                          {initials(a.cliente?.nombre, a.cliente?.apellido)}
                        </span>
                        <span className="ga-person-name">
                          {a.cliente ? `${a.cliente.nombre} ${a.cliente.apellido}` : 'Usuario'}
                        </span>
                      </div>
                    </td>
                    <td
                      className="is-visitas"
                      title="Total de asistencias registradas de este cliente"
                    >
                      <span className="ga-visitas-pill">{visitsByClient.get(a.clientId) ?? 0}</span>
                    </td>
                    <td className="ga-mono">{a.cliente?.identificationNumber ?? '—'}</td>
                    <td>{fmtFecha(a.fecha)}</td>
                    <td>
                      <span className={`ga-badge ga-badge--${a.estado.toLowerCase()}`}>
                        {ESTADO_LABEL[a.estado] ?? a.estado}
                      </span>
                    </td>
                    <td className="ga-obs" title={a.notas ?? ''}>
                      {a.notas || '—'}
                    </td>
                    <td className="is-actions">
                      <button
                        type="button"
                        className="ga-icon-btn"
                        onClick={() => setPendingDelete(a)}
                        aria-label="Eliminar registro"
                        title="Eliminar"
                      >
                        <Trash2 size={16} strokeWidth={2} aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {status === 'error' && (
            <div className="ga-state">No se pudieron cargar las asistencias. Verifica el servidor.</div>
          )}
          {status === 'ready' && total === 0 && (
            <div className="ga-state">
              {activeFilters || search
                ? 'No hay registros que coincidan con los filtros.'
                : 'Aún no hay asistencias registradas.'}
            </div>
          )}
        </div>

        {/* Paginación */}
        {status === 'ready' && total > 0 && (
          <div className="ga-pagination">
            <span className="ga-page-info">
              Mostrando {from}–{to} de {total}
            </span>
            <div className="ga-page-controls">
              <label className="ga-page-size">
                Filas
                <select
                  className="ga-input ga-input--sm"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
              <div className="ga-pager">
                <button
                  type="button"
                  className="ga-btn ga-btn--ghost ga-btn--sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </button>
                <span className="ga-page-now">
                  Página {safePage} de {totalPages}
                </span>
                <button
                  type="button"
                  className="ga-btn ga-btn--ghost ga-btn--sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </section>

      {/* ───────── Modal: Registrar asistencia ───────── */}
      {modalOpen && (
        <div className="ga-overlay" onMouseDown={() => setModalOpen(false)}>
          <div
            className="ga-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ga-modal-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header className="ga-modal-head">
              <h2 className="ga-modal-title" id="ga-modal-title">Registrar asistencia</h2>
              <button
                type="button"
                className="ga-icon-btn"
                onClick={() => setModalOpen(false)}
                aria-label="Cerrar"
              >
                <X size={18} strokeWidth={2} aria-hidden />
              </button>
            </header>

            <form className="ga-form" onSubmit={handleSubmit}>
              <Field label="Usuario *">
                <select className="ga-input" value={form.clientId} onChange={setField('clientId')} required>
                  <option value="">{sinClientes ? 'No hay usuarios disponibles' : 'Selecciona un usuario'}</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.apellido}
                      {c.identificationNumber ? ` · ${c.identificationNumber}` : ''}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Fecha *">
                <input type="date" className="ga-input" value={form.fecha} onChange={setField('fecha')} required />
              </Field>

              <Field label="Observaciones (opcional)">
                <textarea
                  className="ga-input ga-textarea"
                  rows={3}
                  value={form.notas}
                  onChange={setField('notas')}
                  placeholder="Notas, justificación o detalle del registro…"
                />
              </Field>

              {formError && <p className="ga-form-error">{formError}</p>}

              <div className="ga-modal-foot">
                <button type="button" className="ga-btn ga-btn--ghost" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="ga-btn ga-btn--primary" disabled={saving || sinClientes}>
                  {saving ? 'Registrando…' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────── Modal: Agregar cliente ───────── */}
      {clienteModalOpen && (
        <div className="ga-overlay" onMouseDown={() => setClienteModalOpen(false)}>
          <div
            className="ga-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ga-cliente-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header className="ga-modal-head">
              <h2 className="ga-modal-title" id="ga-cliente-title">Agregar cliente</h2>
              <button
                type="button"
                className="ga-icon-btn"
                onClick={() => setClienteModalOpen(false)}
                aria-label="Cerrar"
              >
                <X size={18} strokeWidth={2} aria-hidden />
              </button>
            </header>

            <form className="ga-form" onSubmit={handleCreateCliente}>
              <Field label="Nombre *">
                <input className="ga-input" value={clienteForm.nombre} onChange={setCliField('nombre')} required />
              </Field>
              <Field label="Apellido *">
                <input className="ga-input" value={clienteForm.apellido} onChange={setCliField('apellido')} required />
              </Field>
              <Field label="Documento *">
                <input className="ga-input" value={clienteForm.documento} onChange={setCliField('documento')} inputMode="numeric" required />
              </Field>
              <Field label="Celular (opcional)">
                <input className="ga-input" value={clienteForm.celular} onChange={setCliField('celular')} inputMode="tel" />
              </Field>
              <Field label="Fecha de nacimiento *">
                <input type="date" className="ga-input" value={clienteForm.nacimiento} onChange={setCliField('nacimiento')} required />
              </Field>

              {clienteError && <p className="ga-form-error">{clienteError}</p>}

              <div className="ga-modal-foot">
                <button type="button" className="ga-btn ga-btn--ghost" onClick={() => setClienteModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="ga-btn ga-btn--primary" disabled={clienteSaving}>
                  {clienteSaving ? 'Guardando…' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────── Confirmación de borrado ───────── */}
      {pendingDelete && (
        <div className="ga-overlay" onMouseDown={() => setPendingDelete(null)}>
          <div
            className="ga-modal ga-modal--sm"
            role="alertdialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header className="ga-modal-head">
              <h2 className="ga-modal-title">Eliminar registro</h2>
            </header>
            <p className="ga-confirm-text">
              ¿Eliminar la asistencia de{' '}
              <strong>
                {pendingDelete.cliente
                  ? `${pendingDelete.cliente.nombre} ${pendingDelete.cliente.apellido}`
                  : 'este usuario'}
              </strong>{' '}
              del {fmtFecha(pendingDelete.fecha)}? Esta acción no se puede deshacer.
            </p>
            <div className="ga-modal-foot">
              <button type="button" className="ga-btn ga-btn--ghost" onClick={() => setPendingDelete(null)}>
                Cancelar
              </button>
              <button type="button" className="ga-btn ga-btn--danger" onClick={confirmDelete}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────── Notificación ───────── */}
      {toast && (
        <div className={`ga-toast ga-toast--${toast.type}`} role="status">
          {toast.msg}
        </div>
      )}
    </div>
  );
};

/* ───────────────────────── Subcomponentes ───────────────────────── */

const StatCard = ({ label, value, hint }) => (
  <article className="ga-stat">
    <span className="ga-stat-label">{label}</span>
    <span className="ga-stat-value">{value}</span>
    <span className="ga-stat-hint">{hint}</span>
  </article>
);

const Field = ({ label, children }) => (
  <label className="ga-field">
    <span className="ga-field-label">{label}</span>
    {children}
  </label>
);

export default Asistencias;

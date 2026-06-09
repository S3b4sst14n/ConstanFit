// Pages/Usuarios.jsx — gestión de usuarios (esta vista solo lo puede ver un ADMIN)
import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/auth-context';
import './Usuarios.css';

const ROLE_TONE = { ADMIN: 'gold', OWNER: 'green', STAFF: 'blue', CLIENT: 'neutral' };
const ROLE_LABEL = { ADMIN: 'Administrador', OWNER: 'Dueño', STAFF: 'Personal', CLIENT: 'Cliente' };

// Alcance de gestión según el rol del usuario logueado (espejo del backend):
// ADMIN gestiona a todos; DUEÑO (OWNER) solo cuentas STAFF/CLIENT. La fuente de
// verdad es el servidor; esto solo evita ofrecer acciones que serían rechazadas.
const ROLES_GESTIONABLES = { ADMIN: null, OWNER: ['STAFF', 'CLIENT'] };
const puedeGestionarRol = (miRol, rolObjetivo) => {
  const permitidos = ROLES_GESTIONABLES[miRol];
  if (permitidos === null) return true; // ADMIN
  if (!permitidos) return false;
  return permitidos.includes(rolObjetivo);
};

const initials = (name) => (name?.[0] ?? 'U').toUpperCase();

const emptyForm = () => ({ username: '', email: '', password: '', rolId: '', activo: true });

const Usuarios = () => {
  const { user: me } = useAuth();

  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [error, setError] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [toast, setToast] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // usuario o null
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const load = () =>
    Promise.all([api.usuarios.list(), api.usuarios.roles()])
      .then(([u, r]) => {
        setUsuarios(u.items ?? []);
        setRoles(r.items ?? []);
        setStatus('ready');
        setError(null);
      })
      .catch((err) => {
        setError(err);
        setStatus('error');
      });

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.usuarios.list(), api.usuarios.roles()])
      .then(([u, r]) => {
        if (cancelled) return;
        setUsuarios(u.items ?? []);
        setRoles(r.items ?? []);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [modalOpen]);

  const metrics = useMemo(() => {
    const total = usuarios.length;
    const admins = usuarios.filter((u) => u.rol === 'ADMIN').length;
    const activos = usuarios.filter((u) => u.activo).length;
    return { total, admins, activos };
  }, [usuarios]);

  /* ── Form ── */
  const setField = (name) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const openCrear = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setModalOpen(true);
  };

  const openEditar = (u) => {
    setEditing(u);
    setForm({ username: u.username, email: u.email, password: '', rolId: String(u.rolId), activo: u.activo });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!form.username.trim() || form.username.trim().length < 3) return setFormError('El usuario debe tener al menos 3 caracteres.');
    if (!form.email.trim()) return setFormError('El correo es obligatorio.');
    if (!form.rolId) return setFormError('Selecciona un rol.');
    if (!editing && form.password.length < 6) return setFormError('La contraseña debe tener al menos 6 caracteres.');
    if (editing && form.password && form.password.length < 6) return setFormError('La nueva contraseña debe tener al menos 6 caracteres.');

    setSaving(true);
    try {
      if (editing) {
        const payload = {
          username: form.username.trim(),
          email: form.email.trim(),
          rolId: Number(form.rolId),
        };
        // Solo el ADMIN controla si la cuenta puede iniciar sesión (campo `activo`).
        // El DUEÑO no envía este campo (el servidor lo rechazaría con 403).
        if (me?.role === 'ADMIN') payload.activo = form.activo;
        if (form.password) payload.password = form.password;
        await api.usuarios.update(editing.id, payload);
      } else {
        await api.usuarios.create({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          rolId: Number(form.rolId),
        });
      }
      setModalOpen(false);
      setToast({ type: 'ok', msg: editing ? 'Usuario actualizado.' : 'Usuario creado.' });
      await load();
    } catch (err) {
      setFormError(
        err?.status === 409 ? 'Ya existe un usuario con ese username o correo.'
          : err?.status === 401 || err?.status === 403 ? 'No tienes permisos (se requiere ADMIN).'
            : err?.message ?? 'No se pudo guardar el usuario.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (u) => {
    if (!window.confirm(`¿Eliminar al usuario "${u.username}"? No podrá iniciar sesión.`)) return;
    try {
      await api.usuarios.remove(u.id);
      setToast({ type: 'ok', msg: 'Usuario eliminado.' });
      await load();
    } catch (err) {
      setToast({ type: 'error', msg: err?.message ?? 'No se pudo eliminar el usuario.' });
    }
  };

  const subtitle =
    status === 'loading' ? '· cargando…'
      : status === 'error' ? '· no se pudieron cargar los datos'
        : '· datos en vivo';

  const errorMessage =
    error?.status === 401 ? 'Inicia sesión para ver esta sección.'
      : error?.status === 403 ? 'Esta sección es solo para administradores.'
        : 'No se pudieron cargar los datos. Revisa que el servidor esté activo.';

  // El DUEÑO no ve cuentas ADMIN (el servidor las filtra), así que tampoco
  // mostramos la métrica de administradores: siempre sería 0 y los delataría.
  const metricCards = [
    { key: 'total',  label: 'Usuarios',        value: metrics.total },
    ...(me?.role === 'OWNER' ? [] : [{ key: 'admins', label: 'Administradores', value: metrics.admins }]),
    { key: 'activos', label: 'Activos',        value: metrics.activos },
  ];

  return (
    <div className="usr">
      <header className="usr-head">
        <span className="usr-overline"><ShieldCheck size={13} strokeWidth={2.6} aria-hidden /> Solo administradores</span>
        <h1 className="usr-title">Gestión de usuarios</h1>
        <p className="usr-subtitle">Crea, edita roles y controla el acceso {subtitle}</p>
      </header>

      <section className="usr-metrics" aria-label="Resumen">
        {metricCards.map(({ key, label, value }) => (
          <article className="usr-stat" key={key}>
            <span className="usr-stat-label">{label}</span>
            <span className="usr-stat-value">{status === 'ready' ? value : '—'}</span>
          </article>
        ))}
      </section>

      <section className="usr-panel" aria-label="Usuarios">
        <div className="usr-panel-bar">
          <h2 className="usr-panel-title">Usuarios registrados</h2>
          <button type="button" className="usr-btn usr-btn--primary" onClick={openCrear}>
            <Plus size={16} strokeWidth={2.6} aria-hidden /> Agregar usuario
          </button>
        </div>

        <div className="usr-table" role="table">
          <div className="usr-row usr-row--head" role="row">
            <span role="columnheader">Usuario</span>
            <span role="columnheader">Correo</span>
            <span role="columnheader">Rol</span>
            <span role="columnheader" className="ta-center">Estado</span>
            <span role="columnheader" className="ta-right">Acciones</span>
          </div>

          {status === 'loading' && <div className="usr-empty">Cargando…</div>}
          {status === 'error' && <div className="usr-empty">{errorMessage}</div>}
          {status === 'ready' && usuarios.length === 0 && (
            <div className="usr-empty">No hay usuarios registrados.</div>
          )}

          {status === 'ready' && usuarios.map((u) => {
            const esYo = Number(me?.id) === Number(u.id);
            // El DUEÑO no puede tocar cuentas ADMIN/OWNER (espejo del guard del servidor).
            const gestionable = puedeGestionarRol(me?.role, u.rol);
            return (
              <div className="usr-row" role="row" key={u.id}>
                <span role="cell" className="usr-cell-user">
                  <span className="usr-avatar" aria-hidden>{initials(u.username)}</span>
                  <span className="usr-name">
                    {u.username}
                    {esYo && <span className="usr-tag">tú</span>}
                  </span>
                </span>
                <span role="cell" className="usr-email">{u.email}</span>
                <span role="cell">
                  <span className={`usr-badge usr-badge--${ROLE_TONE[u.rol] ?? 'neutral'}`}>
                    {ROLE_LABEL[u.rol] ?? u.rol}
                  </span>
                </span>
                <span role="cell" className="ta-center">
                  <span className={`usr-state ${u.activo ? 'is-on' : 'is-off'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </span>
                <span role="cell" className="ta-right usr-actions">
                  <button
                    type="button"
                    className="usr-icon-btn"
                    onClick={() => openEditar(u)}
                    disabled={!gestionable}
                    title={gestionable ? 'Editar' : 'No tienes permiso para editar esta cuenta'}
                    aria-label={`Editar ${u.username}`}
                  >
                    <Pencil size={15} strokeWidth={2.2} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="usr-icon-btn usr-icon-btn--danger"
                    onClick={() => handleEliminar(u)}
                    disabled={esYo || !gestionable}
                    title={esYo ? 'No puedes eliminar tu propia cuenta' : gestionable ? 'Eliminar' : 'No tienes permiso para eliminar esta cuenta'}
                    aria-label={`Eliminar ${u.username}`}
                  >
                    <Trash2 size={15} strokeWidth={2.2} aria-hidden />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {modalOpen && (
        <div className="usr-overlay" onMouseDown={() => setModalOpen(false)}>
          <div className="usr-modal" role="dialog" aria-modal="true" aria-labelledby="usr-modal-title" onMouseDown={(e) => e.stopPropagation()}>
            <header className="usr-modal-head">
              <h2 className="usr-modal-title" id="usr-modal-title">{editing ? 'Editar usuario' : 'Agregar usuario'}</h2>
              <button type="button" className="usr-icon-btn" onClick={() => setModalOpen(false)} aria-label="Cerrar">
                <X size={18} strokeWidth={2} aria-hidden />
              </button>
            </header>

            <form className="usr-form" onSubmit={handleSubmit}>
              <label className="usr-field">
                <span className="usr-field-label">Usuario *</span>
                <input className="usr-input" value={form.username} onChange={setField('username')} required minLength={3} />
              </label>

              <label className="usr-field">
                <span className="usr-field-label">Correo *</span>
                <input type="email" className="usr-input" value={form.email} onChange={setField('email')} required />
              </label>

              <label className="usr-field">
                <span className="usr-field-label">Rol *</span>
                <select className="usr-input" value={form.rolId} onChange={setField('rolId')} required>
                  <option value="">Selecciona un rol</option>
                  {roles
                    .filter((r) => puedeGestionarRol(me?.role, r.nombre))
                    .map((r) => (
                      <option key={r.id} value={r.id}>{ROLE_LABEL[r.nombre] ?? r.nombre}</option>
                    ))}
                </select>
              </label>

              <label className="usr-field">
                <span className="usr-field-label">
                  {editing ? 'Nueva contraseña (opcional)' : 'Contraseña *'}
                </span>
                <input
                  type="password"
                  className="usr-input"
                  value={form.password}
                  onChange={setField('password')}
                  placeholder={editing ? 'Dejar en blanco para no cambiar' : ''}
                  minLength={6}
                  required={!editing}
                />
              </label>

              {/* Solo el ADMIN puede marcar si una cuenta inicia sesión o no. */}
              {editing && me?.role === 'ADMIN' && (
                <label className="usr-check">
                  <input
                    type="checkbox"
                    checked={form.activo}
                    onChange={setField('activo')}
                    disabled={Number(me?.id) === Number(editing.id)}
                  />
                  <span>Cuenta activa (puede iniciar sesión)</span>
                </label>
              )}

              {formError && <p className="usr-form-error">{formError}</p>}

              <div className="usr-modal-foot">
                <button type="button" className="usr-btn" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="usr-btn usr-btn--primary" disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`usr-toast usr-toast--${toast.type}`} role="status">{toast.msg}</div>
      )}
    </div>
  );
};

export default Usuarios;

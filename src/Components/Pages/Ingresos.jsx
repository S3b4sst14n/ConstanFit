// Pages/Ingresos.jsx — tienda del gym: catálogo + inventario + ventas (ADMIN/STAFF)
import { useEffect, useMemo, useState } from 'react';
import { Plus, Minus, Pencil, Trash2, X, ShoppingCart, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';
import './Ingresos.css';

// Categorías fijas. El backend guarda el "slug"; aquí mostramos la etiqueta.
const CATEGORIAS = [
  { value: 'ropa',       label: 'Ropa deportiva',    tone: 'green' },
  { value: 'snacks',     label: 'Snacks/Bocadillos', tone: 'amber' },
  { value: 'preentreno', label: 'Preentreno',        tone: 'pink' },
  { value: 'agua',       label: 'Agua/Bebidas',      tone: 'blue' },
  { value: 'otro',       label: 'Otro',              tone: 'neutral' },
];
const CAT_LABEL = Object.fromEntries(CATEGORIAS.map((c) => [c.value, c.label]));
const CAT_TONE = Object.fromEntries(CATEGORIAS.map((c) => [c.value, c.tone]));

const METODOS = ['efectivo', 'tarjeta', 'transferencia', 'nequi'];
const LOW_STOCK = 5; // umbral para marcar "stock bajo"

const formatCOP = (n) => `${Number(n || 0).toLocaleString('es-CO')} COP`;

const todayISO = () => {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
};

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

const fmtFecha = (value) =>
  new Date(value).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });

const emptyVenta = () => ({ productId: '', cantidad: '1', metodoPago: 'efectivo', fecha: todayISO() });
const emptyProducto = () => ({ nombre: '', categoria: 'otro', precio: '', stock: '0', activo: true });

const Ingresos = () => {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [error, setError] = useState(null);
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [toast, setToast] = useState(null); // { type: 'ok'|'error', msg }

  // Formulario de venta
  const [venta, setVenta] = useState(emptyVenta);
  const [savingVenta, setSavingVenta] = useState(false);
  const [ventaError, setVentaError] = useState(null);

  // Modal de producto (crear / editar)
  const [prodModal, setProdModal] = useState(false);
  const [editing, setEditing] = useState(null); // producto o null
  const [prodForm, setProdForm] = useState(emptyProducto);
  const [savingProd, setSavingProd] = useState(false);
  const [prodError, setProdError] = useState(null);

  const load = () =>
    Promise.all([api.productos.list(), api.ventas.list()])
      .then(([p, v]) => {
        setProductos(p.items ?? []);
        setVentas(v.items ?? []);
        setStatus('ready');
        setError(null);
      })
      .catch((err) => {
        setError(err);
        setStatus('error');
      });

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.productos.list(), api.ventas.list()])
      .then(([p, v]) => {
        if (cancelled) return;
        setProductos(p.items ?? []);
        setVentas(v.items ?? []);
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
    document.body.style.overflow = prodModal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [prodModal]);

  /* ── Derivados ── */
  const ventasDelMes = useMemo(() => {
    const desde = monthStart();
    return ventas.filter((v) => new Date(v.fecha) >= desde);
  }, [ventas]);

  const metrics = useMemo(() => {
    const totalMes = ventasDelMes.reduce((acc, v) => acc + (v.total ?? 0), 0);
    const unidadesMes = ventasDelMes.reduce((acc, v) => acc + (v.cantidad ?? 0), 0);
    const activos = productos.filter((p) => p.activo).length;
    const stockBajo = productos.filter((p) => p.activo && p.stock <= LOW_STOCK).length;
    return { totalMes, unidadesMes, activos, stockBajo };
  }, [ventasDelMes, productos]);

  const porCategoria = useMemo(() => {
    const map = new Map();
    for (const v of ventasDelMes) {
      const cat = v.producto?.categoria ?? 'otro';
      map.set(cat, (map.get(cat) ?? 0) + (v.total ?? 0));
    }
    return CATEGORIAS.map((c) => ({ ...c, total: map.get(c.value) ?? 0 })).filter((c) => c.total > 0);
  }, [ventasDelMes]);

  const productoSel = productos.find((p) => String(p.id) === String(venta.productId));
  const cantidadNum = Math.max(0, Number(venta.cantidad) || 0);
  const totalVenta = productoSel ? productoSel.precio * cantidadNum : 0;

  /* ── Registrar venta ── */
  const setVentaField = (name) => (e) => setVenta((f) => ({ ...f, [name]: e.target.value }));

  // +/- del campo Cantidad: nunca baja de 1 y no supera el stock disponible.
  const stepCantidad = (delta) =>
    setVenta((f) => {
      let next = Math.max(1, (Number(f.cantidad) || 0) + delta);
      if (productoSel && productoSel.stock > 0) next = Math.min(next, productoSel.stock);
      return { ...f, cantidad: String(next) };
    });

  const handleVenta = async (e) => {
    e.preventDefault();
    setVentaError(null);
    if (!venta.productId) return setVentaError('Selecciona un producto.');
    if (cantidadNum < 1) return setVentaError('La cantidad debe ser al menos 1.');
    if (productoSel && cantidadNum > productoSel.stock) {
      return setVentaError(`Solo quedan ${productoSel.stock} unidades de ${productoSel.nombre}.`);
    }

    setSavingVenta(true);
    try {
      await api.ventas.create({
        productId: Number(venta.productId),
        cantidad: cantidadNum,
        metodoPago: venta.metodoPago,
        fecha: new Date(`${venta.fecha}T12:00`).toISOString(),
      });
      setToast({ type: 'ok', msg: 'Venta registrada.' });
      setVenta(emptyVenta());
      await load();
    } catch (err) {
      setVentaError(
        err?.status === 401 || err?.status === 403
          ? 'No tienes permisos para registrar ventas.'
          : err?.message ?? 'No se pudo registrar la venta.',
      );
    } finally {
      setSavingVenta(false);
    }
  };

  const handleAnularVenta = async (v) => {
    if (!window.confirm(`¿Anular la venta de ${v.cantidad}× ${v.producto?.nombre ?? 'producto'}? Se devolverá el stock.`)) return;
    try {
      await api.ventas.remove(v.id);
      setToast({ type: 'ok', msg: 'Venta anulada y stock restituido.' });
      await load();
    } catch {
      setToast({ type: 'error', msg: 'No se pudo anular la venta.' });
    }
  };

  /* ── Catálogo: crear / editar / eliminar ── */
  const setProdField = (name) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setProdForm((f) => ({ ...f, [name]: value }));
  };

  const openCrear = () => {
    setEditing(null);
    setProdForm(emptyProducto());
    setProdError(null);
    setProdModal(true);
  };

  const openEditar = (p) => {
    setEditing(p);
    setProdForm({
      nombre: p.nombre,
      categoria: p.categoria,
      precio: String(p.precio),
      stock: String(p.stock),
      activo: p.activo,
    });
    setProdError(null);
    setProdModal(true);
  };

  const handleProd = async (e) => {
    e.preventDefault();
    setProdError(null);
    if (!prodForm.nombre.trim()) return setProdError('El nombre es obligatorio.');
    if (prodForm.precio === '' || Number(prodForm.precio) < 0) return setProdError('Ingresa un precio válido.');

    const payload = {
      nombre: prodForm.nombre.trim(),
      categoria: prodForm.categoria,
      precio: Number(prodForm.precio),
      stock: Number(prodForm.stock) || 0,
      activo: prodForm.activo,
    };

    setSavingProd(true);
    try {
      if (editing) await api.productos.update(editing.id, payload);
      else await api.productos.create(payload);
      setProdModal(false);
      setToast({ type: 'ok', msg: editing ? 'Producto actualizado.' : 'Producto agregado.' });
      await load();
    } catch (err) {
      setProdError(
        err?.status === 401 || err?.status === 403
          ? 'No tienes permisos para gestionar productos.'
          : err?.message ?? 'No se pudo guardar el producto.',
      );
    } finally {
      setSavingProd(false);
    }
  };

  const handleEliminar = async (p) => {
    if (!window.confirm(`¿Eliminar "${p.nombre}" del catálogo?`)) return;
    try {
      await api.productos.remove(p.id);
      setToast({ type: 'ok', msg: 'Producto eliminado.' });
      await load();
    } catch {
      setToast({ type: 'error', msg: 'No se pudo eliminar el producto.' });
    }
  };

  const subtitle =
    status === 'loading' ? '· cargando…'
      : status === 'error' ? '· no se pudieron cargar los datos'
        : '· datos en vivo';

  const errorMessage =
    error?.status === 401 ? 'Inicia sesión para ver esta sección.'
      : error?.status === 403 ? 'No tienes permisos (se requiere ADMIN o STAFF).'
        : 'No se pudieron cargar los datos. Revisa que el servidor esté activo.';

  const metricCards = [
    { key: 'ventas',   label: 'Ventas del mes',     value: formatCOP(metrics.totalMes), hint: 'Total cobrado' },
    { key: 'unidades', label: 'Unidades vendidas',  value: metrics.unidadesMes,         hint: 'Mes en curso' },
    { key: 'catalogo', label: 'Productos activos',  value: metrics.activos,             hint: 'En catálogo' },
    { key: 'stock',    label: 'Stock bajo',         value: metrics.stockBajo,           hint: `≤ ${LOW_STOCK} unidades` },
  ];

  return (
    <div className="ing">
      <header className="ing-head">
        <span className="ing-overline">Tienda</span>
        <h1 className="ing-title">Ingresos por ventas</h1>
        <p className="ing-subtitle">Ropa, snacks, preentreno y bebidas {subtitle}</p>
      </header>

      <section className="ing-metrics" aria-label="Métricas de ventas">
        {metricCards.map(({ key, label, value, hint }) => (
          <article className={`ing-stat ${key === 'stock' && metrics.stockBajo > 0 ? 'ing-stat--warn' : ''}`} key={key}>
            <span className="ing-stat-label">{label}</span>
            <span className="ing-stat-value">{status === 'ready' ? value : '—'}</span>
            <span className="ing-stat-hint">{hint}</span>
          </article>
        ))}
      </section>

      {/* ── Registrar venta ── */}
      <section className="ing-panel" aria-label="Registrar venta">
        <div className="ing-panel-bar">
          <h2 className="ing-panel-title"><ShoppingCart size={17} strokeWidth={2.4} aria-hidden /> Registrar venta</h2>
        </div>

        <form className="ing-sale" onSubmit={handleVenta}>
          <label className="ing-field ing-field--grow">
            <span className="ing-field-label">Producto *</span>
            <select className="ing-input" value={venta.productId} onChange={setVentaField('productId')}>
              <option value="">Selecciona un producto</option>
              {productos.filter((p) => p.activo).map((p) => (
                <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                  {p.nombre} · {formatCOP(p.precio)} {p.stock <= 0 ? '· AGOTADO' : `· stock ${p.stock}`}
                </option>
              ))}
            </select>
          </label>

          {/* Cantidad con botones +/- y validación de mínimo 1 y máximo stock disponible */}
          <div className="ing-field ing-field--qty">
            <span className="ing-field-label">Cantidad *</span>
            <div className="ing-stepper">
              <button
                type="button" className="ing-stepper-btn" onClick={() => stepCantidad(-1)}
                disabled={cantidadNum <= 1} aria-label="Disminuir cantidad"
              >
                <Minus size={16} strokeWidth={2.6} aria-hidden />
              </button>
              <input
                type="number" min="1" max={productoSel?.stock ?? undefined}
                className="ing-input ing-stepper-input" value={venta.cantidad} onChange={setVentaField('cantidad')}
              />
              <button
                type="button" className="ing-stepper-btn" onClick={() => stepCantidad(1)}
                disabled={!!productoSel && cantidadNum >= productoSel.stock} aria-label="Aumentar cantidad"
              >
                <Plus size={16} strokeWidth={2.6} aria-hidden />
              </button>
            </div>
          </div>

          <label className="ing-field">
            <span className="ing-field-label">Método de pago</span>
            <select className="ing-input" value={venta.metodoPago} onChange={setVentaField('metodoPago')}>
              {METODOS.map((m) => (
                <option key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</option>
              ))}
            </select>
          </label>

          <label className="ing-field ing-field--sm">
            <span className="ing-field-label">Fecha</span>
            <input type="date" className="ing-input" value={venta.fecha} onChange={setVentaField('fecha')} />
          </label>

          <div className="ing-sale-total">
            <span className="ing-sale-total-label">Total</span>
            <span className="ing-sale-total-value">{formatCOP(totalVenta)}</span>
          </div>

          <button type="submit" className="ing-btn ing-btn--primary ing-sale-submit" disabled={savingVenta || status !== 'ready'}>
            {savingVenta ? 'Guardando…' : 'Registrar'}
          </button>
        </form>
        {ventaError && <p className="ing-form-error">{ventaError}</p>}

        {porCategoria.length > 0 && (
          <div className="ing-cat-strip" aria-label="Ventas del mes por categoría">
            {porCategoria.map((c) => (
              <span key={c.value} className={`ing-chip ing-chip--${c.tone}`}>
                {c.label}: <strong>{formatCOP(c.total)}</strong>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ── Catálogo e inventario ── */}
      <section className="ing-panel" aria-label="Catálogo">
        <div className="ing-panel-bar">
          <h2 className="ing-panel-title">Catálogo e inventario</h2>
          <button type="button" className="ing-btn ing-btn--primary" onClick={openCrear}>
            <Plus size={16} strokeWidth={2.6} aria-hidden /> Agregar producto
          </button>
        </div>

        <div className="ing-table" role="table">
          <div className="ing-row ing-row--head ing-row--prod" role="row">
            <span role="columnheader">Producto</span>
            <span role="columnheader">Categoría</span>
            <span role="columnheader" className="ta-right">Precio</span>
            <span role="columnheader" className="ta-center">Stock</span>
            <span role="columnheader" className="ta-right">Acciones</span>
          </div>

          {status === 'loading' && <div className="ing-empty">Cargando…</div>}
          {status === 'error' && <div className="ing-empty">{errorMessage}</div>}
          {status === 'ready' && productos.length === 0 && (
            <div className="ing-empty">Aún no hay productos. Agrega el primero con “Agregar producto”.</div>
          )}

          {status === 'ready' && productos.map((p) => (
            <div className={`ing-row ing-row--prod ${!p.activo ? 'is-inactive' : ''}`} role="row" key={p.id}>
              <span role="cell" className="ing-prod-name">
                {p.nombre}
                {!p.activo && <span className="ing-tag">inactivo</span>}
              </span>
              <span role="cell">
                <span className={`ing-badge ing-badge--${CAT_TONE[p.categoria] ?? 'neutral'}`}>
                  {CAT_LABEL[p.categoria] ?? p.categoria}
                </span>
              </span>
              <span role="cell" className="ta-right ing-num">{formatCOP(p.precio)}</span>
              <span role="cell" className="ta-center">
                <span className={`ing-stock ${p.stock <= 0 ? 'is-out' : p.stock <= LOW_STOCK ? 'is-low' : ''}`}>
                  {p.stock <= LOW_STOCK && <AlertTriangle size={13} strokeWidth={2.5} aria-hidden />}
                  {p.stock}
                </span>
              </span>
              <span role="cell" className="ta-right ing-actions">
                <button type="button" className="ing-icon-btn" onClick={() => openEditar(p)} aria-label={`Editar ${p.nombre}`}>
                  <Pencil size={15} strokeWidth={2.2} aria-hidden />
                </button>
                <button type="button" className="ing-icon-btn ing-icon-btn--danger" onClick={() => handleEliminar(p)} aria-label={`Eliminar ${p.nombre}`}>
                  <Trash2 size={15} strokeWidth={2.2} aria-hidden />
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Ventas recientes ── */}
      <section className="ing-panel" aria-label="Ventas recientes">
        <div className="ing-panel-bar">
          <h2 className="ing-panel-title">Ventas recientes</h2>
        </div>

        <div className="ing-table" role="table">
          <div className="ing-row ing-row--head ing-row--sale" role="row">
            <span role="columnheader">Fecha</span>
            <span role="columnheader">Producto</span>
            <span role="columnheader" className="ta-center">Cant.</span>
            <span role="columnheader" className="ta-right">Total</span>
            <span role="columnheader">Método</span>
            <span role="columnheader" className="ta-right">Acción</span>
          </div>

          {status === 'ready' && ventas.length === 0 && (
            <div className="ing-empty">Aún no hay ventas registradas.</div>
          )}

          {status === 'ready' && ventas.slice(0, 30).map((v) => (
            <div className="ing-row ing-row--sale" role="row" key={v.id}>
              <span role="cell" className="ing-num">{fmtFecha(v.fecha)}</span>
              <span role="cell" className="ing-prod-name">{v.producto?.nombre ?? '—'}</span>
              <span role="cell" className="ta-center ing-num">{v.cantidad}</span>
              <span role="cell" className="ta-right ing-num ing-total">{formatCOP(v.total)}</span>
              <span role="cell" className="ing-metodo">{v.metodoPago}</span>
              <span role="cell" className="ta-right">
                <button type="button" className="ing-icon-btn ing-icon-btn--danger" onClick={() => handleAnularVenta(v)} aria-label="Anular venta">
                  <Trash2 size={15} strokeWidth={2.2} aria-hidden />
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Modal producto ── */}
      {prodModal && (
        <div className="ing-overlay" onMouseDown={() => setProdModal(false)}>
          <div className="ing-modal" role="dialog" aria-modal="true" aria-labelledby="ing-modal-title" onMouseDown={(e) => e.stopPropagation()}>
            <header className="ing-modal-head">
              <h2 className="ing-modal-title" id="ing-modal-title">{editing ? 'Editar producto' : 'Agregar producto'}</h2>
              <button type="button" className="ing-icon-btn" onClick={() => setProdModal(false)} aria-label="Cerrar">
                <X size={18} strokeWidth={2} aria-hidden />
              </button>
            </header>

            <form className="ing-form" onSubmit={handleProd}>
              <label className="ing-field">
                <span className="ing-field-label">Nombre *</span>
                <input className="ing-input" value={prodForm.nombre} onChange={setProdField('nombre')} required />
              </label>

              <label className="ing-field">
                <span className="ing-field-label">Categoría *</span>
                <select className="ing-input" value={prodForm.categoria} onChange={setProdField('categoria')}>
                  {CATEGORIAS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </label>

              <div className="ing-form-grid">
                <label className="ing-field">
                  <span className="ing-field-label">Precio (COP) *</span>
                  <input type="number" min="0" step="100" className="ing-input" value={prodForm.precio} onChange={setProdField('precio')} required />
                </label>
                <label className="ing-field">
                  <span className="ing-field-label">Stock</span>
                  <input type="number" min="0" className="ing-input" value={prodForm.stock} onChange={setProdField('stock')} />
                </label>
              </div>

              {editing && (
                <label className="ing-check">
                  <input type="checkbox" checked={prodForm.activo} onChange={setProdField('activo')} />
                  <span>Producto activo (visible para vender)</span>
                </label>
              )}

              {prodError && <p className="ing-form-error">{prodError}</p>}

              <div className="ing-modal-foot">
                <button type="button" className="ing-btn" onClick={() => setProdModal(false)}>Cancelar</button>
                <button type="submit" className="ing-btn ing-btn--primary" disabled={savingProd}>
                  {savingProd ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`ing-toast ing-toast--${toast.type}`} role="status">{toast.msg}</div>
      )}
    </div>
  );
};

export default Ingresos;

import { prisma } from "../lib/prisma.js";

// Inicio del mes actual (hora del servidor). Se usa tanto para las métricas
// como para el conteo de asistencias por cliente, para que todo sea coherente.
function startOfMonth(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// "Plan Mensual" -> "Mensual". El mockup muestra la etiqueta corta.
function shortPlanLabel(nombre) {
  if (!nombre) return "—";
  return nombre.replace(/^plan\s+/i, "").trim() || nombre;
}

// Una suscripción está vigente si está activa y hoy cae dentro de su periodo.
function esVigente(sub, now) {
  return (
    !!sub && sub.estado === "activa" && sub.startDate <= now && sub.endDate >= now
  );
}

// De las suscripciones de un cliente (ya ordenadas por endDate desc) elige
// la que está vigente hoy; si ninguna lo está, cae a la más reciente.
function pickSubscription(suscripciones, now) {
  const vigente = suscripciones.find((s) => esVigente(s, now));
  return vigente ?? suscripciones[0] ?? null;
}

const MS_DAY = 86_400_000;

// Vigencia del plan: cuánto del periodo de la suscripción ya transcurrió.
// Devuelve el % (para el ancho de la barra) y el desglose "día X de Y".
function subscriptionTiming(sub, now) {
  if (!sub) {
    return { progreso: 0, diaActual: null, diasPlan: null, diasRestantes: null, vence: null };
  }
  const diasPlan = Math.max(
    1,
    Math.round((sub.endDate.getTime() - sub.startDate.getTime()) / MS_DAY),
  );
  const transcurridos = Math.round((now.getTime() - sub.startDate.getTime()) / MS_DAY);
  const diaActual = Math.max(0, Math.min(diasPlan, transcurridos));
  return {
    progreso: Math.round((diaActual / diasPlan) * 100),
    diaActual,
    diasPlan,
    diasRestantes: Math.max(0, diasPlan - diaActual),
    vence: sub.endDate.toISOString(),
  };
}

export async function overview(_req, res) {
  const now = new Date();
  const monthStart = startOfMonth(now);

  const [
    clientesActivos,
    asistenciasMes,
    suscripcionesActivas,
    clientes,
    asistenciasPorCliente,
  ] = await Promise.all([
    prisma.cliente.count({ where: { deletedAt: null, estado: "activo" } }),
    prisma.asistencia.count({
      where: { deletedAt: null, fecha: { gte: monthStart } },
    }),
    prisma.suscripcion.count({
      where: { deletedAt: null, estado: "activa", endDate: { gte: now } },
    }),
    prisma.cliente.findMany({
      where: { deletedAt: null },
      include: {
        suscripciones: {
          where: { deletedAt: null },
          include: { plan: true },
          orderBy: { endDate: "desc" },
        },
      },
      orderBy: { nombre: "asc" },
    }),
    prisma.asistencia.groupBy({
      by: ["clientId"],
      where: { deletedAt: null, fecha: { gte: monthStart } },
      _count: { _all: true },
    }),
  ]);

  const asistenciasMap = new Map(
    asistenciasPorCliente.map((a) => [a.clientId, a._count._all]),
  );

  // Ingresos del mes = suma del precio del plan de cada cliente con una
  // suscripción vigente hoy (no se basa en la tabla de pagos).
  let ingresosMes = 0;

  const filas = clientes.map((c) => {
    const sub = pickSubscription(c.suscripciones, now);
    if (esVigente(sub, now)) ingresosMes += sub.plan?.precio ?? 0;
    return {
      id: c.id,
      nombre: c.nombre,
      apellido: c.apellido,
      asistencias: asistenciasMap.get(c.id) ?? 0,
      plan: shortPlanLabel(sub?.plan?.nombre),
      ...subscriptionTiming(sub, now),
    };
  });

  res.json({
    metrics: {
      clientesActivos,
      asistenciasMes,
      suscripcionesActivas,
      ingresosMes,
    },
    clientes: filas,
  });
}

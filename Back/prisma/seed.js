import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

const roles = [
  { nombre: "ADMIN", descripcion: "Acceso total al sistema" },
  { nombre: "STAFF", descripcion: "Personal del gimnasio" },
  { nombre: "CLIENT", descripcion: "Cliente / miembro" },
];

const planes = [
  { nombre: "Plan Diario", precio: 3000, duracionDias: 1, descripcion: "Tienes acceso por un día completo" },
  { nombre: "Plan Quincenal", precio: 35000, duracionDias: 15, descripcion: "Entrena 15 días consecutivos." },
  { nombre: "Plan Mensual", precio: 60000, duracionDias: 30, descripcion: "Entrena todo el mes sin límites" },
];

// Clientes de ejemplo para que el dashboard tenga datos al arrancar.
// nDays = duración de su plan, asistenciasMes = check-ins a sembrar este mes.
const clientesDemo = [
  { nombre: "Carlos",    apellido: "Gómez",     planDuracion: 30, asistenciasMes: 22, diasIniciado: 22 },
  { nombre: "Andrés",    apellido: "Martínez",  planDuracion: 1,  asistenciasMes: 5,  diasIniciado: 0  },
  { nombre: "Laura",     apellido: "Rodríguez", planDuracion: 15, asistenciasMes: 20, diasIniciado: 11 },
  { nombre: "Santiago",  apellido: "Ramírez",   planDuracion: 1,  asistenciasMes: 18, diasIniciado: 0  },
  { nombre: "Valentina", apellido: "González",  planDuracion: 30, asistenciasMes: 10, diasIniciado: 9  },
];

// Productos de ejemplo para la vista de Ingresos (tienda del gym).
const productosDemo = [
  { nombre: "Camiseta ConstanFit",   categoria: "ropa",       precio: 45000, stock: 20 },
  { nombre: "Leggins deportivos",    categoria: "ropa",       precio: 60000, stock: 12 },
  { nombre: "Barra proteica",        categoria: "snacks",     precio: 6000,  stock: 40 },
  { nombre: "Preentreno (porción)",  categoria: "preentreno", precio: 8000,  stock: 30 },
  { nombre: "Agua 600ml",            categoria: "agua",       precio: 3000,  stock: 60 },
  { nombre: "Bebida hidratante",     categoria: "agua",       precio: 5000,  stock: 25 },
];

// upsert manual por "nombre" (las tablas no tienen índice único en ese campo).
async function upsertBy(model, field, value, data) {
  const existing = await model.findFirst({ where: { [field]: value } });
  if (existing) return model.update({ where: { id: existing.id }, data });
  return model.create({ data });
}

function daysAgo(n) {
  const d = new Date();
  d.setHours(8, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

async function seedClientes(planByDuracion) {
  for (const c of clientesDemo) {
    const email = `${c.nombre}.${c.apellido}@constanfit.demo`.toLowerCase();
    // Idempotente: si el cliente demo ya existe, no se vuelve a sembrar.
    let cliente = await prisma.cliente.findUnique({ where: { email } });
    if (cliente) continue;

    cliente = await prisma.cliente.create({
      data: {
        nombre: c.nombre,
        apellido: c.apellido,
        email,
        fechaNacimiento: new Date(1995, 0, 1),
        estado: "activo",
      },
    });

    const plan = planByDuracion[c.planDuracion];
    const startDate = daysAgo(c.diasIniciado);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.duracionDias);

    const suscripcion = await prisma.suscripcion.create({
      data: {
        clientId: cliente.id,
        planId: plan.id,
        estado: "activa",
        startDate,
        endDate,
      },
    });

    await prisma.pago.create({
      data: {
        clientId: cliente.id,
        suscripcionId: suscripcion.id,
        monto: plan.precio,
        metodoPago: "efectivo",
        estado: "completado",
        fechaPago: startDate,
      },
    });

    // Asistencias distribuidas en los últimos días (1 por día, este mes).
    // check_in es NOT NULL en la base real: usamos la misma fecha.
    const asistencias = Array.from({ length: c.asistenciasMes }, (_, i) => {
      const f = daysAgo(i);
      return { clientId: cliente.id, fecha: f, checkIn: f };
    });
    await prisma.asistencia.createMany({ data: asistencias });
  }
}

async function main() {
  const roleByName = {};
  for (const r of roles) {
    roleByName[r.nombre] = await upsertBy(prisma.role, "nombre", r.nombre, r);
  }

  const planByDuracion = {};
  for (const p of planes) {
    planByDuracion[p.duracionDias] = await upsertBy(prisma.plan, "nombre", p.nombre, p);
  }

  // Idempotente: no recrear el admin si ya existe ese username O ese email
  // (puede haberse renombrado el usuario sembrado conservando el correo).
  const admin = await prisma.usuario.findFirst({
    where: { OR: [{ username: "admin" }, { email: "admin@constanfit.local" }] },
  });
  if (!admin) {
    await prisma.usuario.create({
      data: {
        username: "admin",
        email: "admin@constanfit.local",
        passwordHash: await bcrypt.hash("admin123", 10),
        rolId: roleByName["ADMIN"].id,
      },
    });
  }

  await seedClientes(planByDuracion);

  for (const p of productosDemo) {
    await upsertBy(prisma.producto, "nombre", p.nombre, p);
  }

  console.log(
    "Seed listo: 3 roles + usuario admin (admin / admin123) + 3 planes + clientes demo + productos demo",
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

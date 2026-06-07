import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/httpError.js";
import { crudController } from "../lib/crud.js";

const ventaSchema = z.object({
  productId: z.number().int().positive(),
  cantidad: z.number().int().positive().default(1),
  // Si no se envía, se toma el precio actual del producto.
  precioUnitario: z.number().nonnegative().optional(),
  metodoPago: z.enum(["efectivo", "tarjeta", "transferencia", "nequi"]),
  notas: z.string().optional(),
  fecha: z.coerce.date().optional(),
});

const include = { producto: true };

const base = crudController("venta", {
  schema: ventaSchema,
  label: "Venta",
  orderBy: { fecha: "desc" },
  include,
});

// list/get se reutilizan del CRUD genérico; create y remove son propios para
// mantener el stock del producto en sincronía con las ventas.
export const { list, get } = base;

export async function create(req, res) {
  const data = ventaSchema.parse(req.body);

  const item = await prisma.$transaction(async (tx) => {
    const producto = await tx.producto.findFirst({
      where: { id: data.productId, deletedAt: null },
    });
    if (!producto) throw new HttpError(404, "Producto no encontrado");
    if (!producto.activo) throw new HttpError(400, "El producto está inactivo");
    if (producto.stock < data.cantidad) {
      throw new HttpError(400, `Stock insuficiente: quedan ${producto.stock}`);
    }

    const precioUnitario = data.precioUnitario ?? producto.precio;
    const venta = await tx.venta.create({
      data: {
        productId: data.productId,
        cantidad: data.cantidad,
        precioUnitario,
        total: precioUnitario * data.cantidad,
        metodoPago: data.metodoPago,
        notas: data.notas,
        fecha: data.fecha ?? new Date(),
      },
      include,
    });

    await tx.producto.update({
      where: { id: producto.id },
      data: { stock: { decrement: data.cantidad } },
    });

    return venta;
  });

  res.status(201).json({ item });
}

// Al anular una venta (soft delete) se devuelve el stock al producto.
export async function remove(req, res) {
  const id = Number(req.params.id);
  const venta = await base.findOr404(id);

  await prisma.$transaction([
    prisma.venta.update({ where: { id }, data: { deletedAt: new Date() } }),
    prisma.producto.update({
      where: { id: venta.productId },
      data: { stock: { increment: venta.cantidad } },
    }),
  ]);

  res.status(204).end();
}

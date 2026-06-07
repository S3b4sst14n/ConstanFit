import { prisma } from "./prisma.js";
import { HttpError } from "./httpError.js";

/**
 * Genera un controlador CRUD estándar para un modelo de Prisma.
 * Aplica soft-delete (deletedAt) por defecto: list/get filtran los borrados
 * y remove marca deletedAt en lugar de borrar la fila.
 *
 * @param {string} modelName  nombre del modelo en Prisma (ej. "cliente")
 * @param {object} opts
 * @param {import("zod").ZodObject} opts.schema   esquema Zod para create (update usa .partial())
 * @param {string} [opts.label="Recurso"]         texto para mensajes 404
 * @param {object} [opts.include]                 relaciones a incluir en las respuestas
 * @param {object} [opts.orderBy={ id: "asc" }]   orden del listado
 * @param {boolean} [opts.softDelete=true]        usar deletedAt en vez de borrado físico
 */
export function crudController(modelName, opts = {}) {
  const {
    schema,
    label = "Recurso",
    include,
    orderBy = { id: "asc" },
    softDelete = true,
  } = opts;

  const model = prisma[modelName];
  const baseWhere = softDelete ? { deletedAt: null } : {};

  async function findOr404(id) {
    if (!Number.isInteger(id)) throw new HttpError(400, "ID inválido");
    const item = await model.findFirst({ where: { id, ...baseWhere }, include });
    if (!item) throw new HttpError(404, `${label} no encontrado`);
    return item;
  }

  return {
    findOr404,

    list: async (_req, res) => {
      const items = await model.findMany({ where: baseWhere, include, orderBy });
      res.json({ items });
    },

    get: async (req, res) => {
      const item = await findOr404(Number(req.params.id));
      res.json({ item });
    },

    create: async (req, res) => {
      const data = schema.parse(req.body);
      const item = await model.create({ data, include });
      res.status(201).json({ item });
    },

    update: async (req, res) => {
      const id = Number(req.params.id);
      await findOr404(id);
      const data = schema.partial().parse(req.body);
      const item = await model.update({ where: { id }, data, include });
      res.json({ item });
    },

    remove: async (req, res) => {
      const id = Number(req.params.id);
      await findOr404(id);
      if (softDelete) {
        await model.update({ where: { id }, data: { deletedAt: new Date() } });
      } else {
        await model.delete({ where: { id } });
      }
      res.status(204).end();
    },
  };
}

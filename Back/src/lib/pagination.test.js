import { describe, it, expect } from "vitest";
import { parsePagination, buildPaginationMeta } from "./pagination.js";

describe("parsePagination", () => {
  it("devuelve null cuando no hay ?page ni ?limit (compatibilidad hacia atrás)", () => {
    expect(parsePagination({})).toBeNull();
  });

  it("lee page y limit y calcula skip/take", () => {
    expect(parsePagination({ page: "2", limit: "10" })).toEqual({
      page: 2,
      limit: 10,
      skip: 10,
      take: 10,
    });
  });

  it("con solo limit asume page 1", () => {
    expect(parsePagination({ limit: "5" })).toEqual({ page: 1, limit: 5, skip: 0, take: 5 });
  });

  it("con solo page usa el limit por defecto (20)", () => {
    expect(parsePagination({ page: "3" })).toEqual({ page: 3, limit: 20, skip: 40, take: 20 });
  });

  it("capa el limit al máximo (100) para que ?limit=99999 no traiga la tabla entera", () => {
    expect(parsePagination({ limit: "99999" })).toEqual({
      page: 1,
      limit: 100,
      skip: 0,
      take: 100,
    });
  });

  it("respeta defaultLimit y maxLimit configurables", () => {
    expect(parsePagination({ limit: "999" }, { defaultLimit: 10, maxLimit: 50 })).toEqual({
      page: 1,
      limit: 50,
      skip: 0,
      take: 50,
    });
  });

  it("normaliza page=0 y page negativa a 1", () => {
    expect(parsePagination({ page: "0", limit: "10" }).page).toBe(1);
    expect(parsePagination({ page: "-5" }).page).toBe(1);
  });

  it("ante un limit no numérico cae al valor por defecto", () => {
    expect(parsePagination({ limit: "abc" })).toEqual({ page: 1, limit: 20, skip: 0, take: 20 });
  });
});

describe("buildPaginationMeta", () => {
  it("calcula totalPages y hasMore en una página intermedia", () => {
    expect(buildPaginationMeta({ page: 1, limit: 10 }, 25, 10)).toEqual({
      total: 25,
      page: 1,
      limit: 10,
      totalPages: 3,
      hasMore: true,
    });
  });

  it("marca hasMore=false en la última página", () => {
    expect(buildPaginationMeta({ page: 3, limit: 10 }, 25, 5)).toEqual({
      total: 25,
      page: 3,
      limit: 10,
      totalPages: 3,
      hasMore: false,
    });
  });

  it("con cero resultados reporta 1 página y sin más", () => {
    expect(buildPaginationMeta({ page: 1, limit: 10 }, 0, 0)).toEqual({
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasMore: false,
    });
  });
});

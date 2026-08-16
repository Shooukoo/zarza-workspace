import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, Prisma } from '@rubus/database';
import { Role } from '../auth/domain/enums/role.enum';
import { type UserScope } from '../auth/domain/types/user-scope.type';

export interface CampoHeatmapPoint {
  campoId: string;
  nombre: string;
  poligonoGps: [number, number][] | null;
  centroid: { lat: number; lng: number };
  analysisCount: number;
  totalElementosDetectados: number;
  avgMermaPercent: number;
}

export interface CamposHeatmapResponse {
  campos: CampoHeatmapPoint[];
  sinUbicacion: number;
}

export interface AnalisisHeatmapPoint {
  id: string;
  lat: number;
  lng: number;
  fechaAnalisis: Date;
  variedad: string | null;
  porcentajeMermaGeneral: number;
  totalElementosDetectados: number;
  elementosSanos: number;
  elementosEnfermos: number;
  validacionEstado: string;
}

@Injectable()
export class MapasCalorService {
  constructor(private readonly prisma: PrismaService) {}

  private scopeWhere(scope: UserScope): Prisma.AnalysisWhereInput {
    if (scope.role === Role.PRODUCTOR) return { productorId: scope.sub };
    if (scope.role === Role.AGRONOMO) {
      return { campoId: { in: scope.camposAsignados ?? [] } };
    }
    return {};
  }

  private dateWhere(from?: string, to?: string): Prisma.AnalysisWhereInput {
    if (!from && !to) return {};
    return {
      fechaAnalisis: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    };
  }

  async getCamposHeatmap(
    scope: UserScope,
    from?: string,
    to?: string,
  ): Promise<CamposHeatmapResponse> {
    const baseWhere = {
      ...this.scopeWhere(scope),
      ...this.dateWhere(from, to),
    };

    const grouped = await this.prisma.analysis.groupBy({
      by: ['campoId'],
      where: {
        ...baseWhere,
        ubicacionLat: { not: null },
        ubicacionLng: { not: null },
      },
      _count: { _all: true },
      _sum: { totalElementosDetectados: true },
      _avg: {
        porcentajeMermaGeneral: true,
        ubicacionLat: true,
        ubicacionLng: true,
      },
    });

    const sinUbicacion = await this.prisma.analysis.count({
      where: {
        ...baseWhere,
        OR: [{ ubicacionLat: null }, { ubicacionLng: null }],
      },
    });

    if (grouped.length === 0) return { campos: [], sinUbicacion };

    const campoIds = grouped.map((g) => g.campoId);
    const camposInfo = await this.prisma.campo.findMany({
      where: { id: { in: campoIds } },
      select: { id: true, nombre: true, poligonoGps: true },
    });
    const infoById = new Map(camposInfo.map((c) => [c.id, c]));

    const campos: CampoHeatmapPoint[] = grouped.map((g) => {
      const info = infoById.get(g.campoId);
      return {
        campoId: g.campoId,
        nombre: info?.nombre ?? g.campoId,
        poligonoGps: normalizePoligono(info?.poligonoGps),
        centroid: {
          lat: g._avg.ubicacionLat ?? 0,
          lng: g._avg.ubicacionLng ?? 0,
        },
        analysisCount: g._count._all,
        totalElementosDetectados: g._sum.totalElementosDetectados ?? 0,
        avgMermaPercent: g._avg.porcentajeMermaGeneral ?? 0,
      };
    });

    return { campos, sinUbicacion };
  }

  async getAnalisisHeatmap(
    campoId: string,
    from?: string,
    to?: string,
  ): Promise<AnalisisHeatmapPoint[]> {
    const rows = await this.prisma.analysis.findMany({
      where: {
        campoId,
        ubicacionLat: { not: null },
        ubicacionLng: { not: null },
        ...this.dateWhere(from, to),
      },
      select: {
        id: true,
        ubicacionLat: true,
        ubicacionLng: true,
        fechaAnalisis: true,
        variedad: true,
        porcentajeMermaGeneral: true,
        totalElementosDetectados: true,
        elementosSanos: true,
        elementosEnfermos: true,
        validacionEstado: true,
      },
      orderBy: { fechaAnalisis: 'desc' },
    });

    return rows.map((r) => ({
      id: r.id,
      lat: r.ubicacionLat as number,
      lng: r.ubicacionLng as number,
      fechaAnalisis: r.fechaAnalisis,
      variedad: r.variedad,
      porcentajeMermaGeneral: r.porcentajeMermaGeneral,
      totalElementosDetectados: r.totalElementosDetectados,
      elementosSanos: r.elementosSanos,
      elementosEnfermos: r.elementosEnfermos,
      validacionEstado: r.validacionEstado,
    }));
  }

  async assertCampoAccessible(
    campoId: string,
    scope: UserScope,
  ): Promise<void> {
    if (scope.role === Role.ADMIN) return;

    if (scope.role === Role.AGRONOMO) {
      if (!scope.camposAsignados?.includes(campoId)) {
        throw new NotFoundException(`Campo con id "${campoId}" no encontrado`);
      }
      return;
    }

    const campo = await this.prisma.campo.findUnique({
      where: { id: campoId },
      select: { productorId: true },
    });
    if (!campo || campo.productorId !== scope.sub) {
      throw new NotFoundException(`Campo con id "${campoId}" no encontrado`);
    }
  }
}

function normalizePoligono(value: unknown): [number, number][] | null {
  if (!Array.isArray(value) || value.length < 3) return null;
  const valid = value.every(
    (p) =>
      Array.isArray(p) &&
      p.length === 2 &&
      typeof p[0] === 'number' &&
      typeof p[1] === 'number',
  );
  return valid ? (value as [number, number][]) : null;
}

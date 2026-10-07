import { describe, expect, it } from 'vitest';
import { ApiErrorBody } from '../common/index';
import {
  ActualizarConfigRequest,
  Asignacion,
  CambiarEstadoAsignacionRequest,
  ConfiguracionMatching,
  ConfirmarAsignacionRequest,
  GenerarRecomendacionRequest,
  ListarAsignacionesQuery,
  Recomendacion,
} from './index';
import {
  actualizarConfigValida,
  asignacionValida,
  configuracionVigente,
  confirmarAlternativa,
  confirmarRecomendado,
  errorRecomendacionObsoleta,
  invalidos,
  recomendacionSinCandidatos,
  recomendacionValida,
} from './fixtures';

describe('contracts/recomendaciones', () => {
  it('acepta los fixtures válidos', () => {
    expect(Recomendacion.safeParse(recomendacionValida).success).toBe(true);
    expect(Recomendacion.safeParse(recomendacionSinCandidatos).success).toBe(true);
    expect(ConfirmarAsignacionRequest.safeParse(confirmarRecomendado).success).toBe(true);
    expect(ConfirmarAsignacionRequest.safeParse(confirmarAlternativa).success).toBe(true);
    expect(Asignacion.safeParse(asignacionValida).success).toBe(true);
    expect(ConfiguracionMatching.safeParse(configuracionVigente).success).toBe(true);
    expect(ActualizarConfigRequest.safeParse(actualizarConfigValida).success).toBe(true);
    expect(ApiErrorBody.safeParse(errorRecomendacionObsoleta).success).toBe(true);
  });

  it('rechaza los fixtures inválidos', () => {
    expect(GenerarRecomendacionRequest.safeParse(invalidos.generarSinSolicitud).success).toBe(
      false,
    );
    expect(ConfirmarAsignacionRequest.safeParse(invalidos.confirmarTutorNoUuid).success).toBe(
      false,
    );
    expect(CambiarEstadoAsignacionRequest.safeParse(invalidos.cambiarEstadoActiva).success).toBe(
      false,
    );
    expect(ListarAsignacionesQuery.safeParse(invalidos.listarEstadoDesconocido).success).toBe(
      false,
    );
    expect(ActualizarConfigRequest.safeParse(invalidos.configPesoFaltante).success).toBe(false);
    expect(Recomendacion.safeParse(invalidos.recomendacionScoreFueraDeRango).success).toBe(false);
  });

  it('la query de asignaciones aplica la paginación por defecto', () => {
    expect(ListarAsignacionesQuery.parse({ estado: 'ACTIVA' })).toEqual({
      page: 1,
      pageSize: 20,
      estado: 'ACTIVA',
    });
  });
});

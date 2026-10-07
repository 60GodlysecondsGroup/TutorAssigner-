import { describe, expect, it } from 'vitest';
import {
  CandidatoDescartado,
  ConfigMatching,
  FranjaHoraria,
  ResultadoMatching,
  SolicitudMatching,
  TutorCandidato,
} from './index';
import {
  configV1,
  franjaInvalida,
  franjaValida,
  invalidos,
  resultadoSinCandidatos,
  solicitudMatchingValida,
  tutorCandidatoValido,
} from './fixtures';

describe('contracts/matching', () => {
  it('acepta los fixtures válidos', () => {
    expect(FranjaHoraria.safeParse(franjaValida).success).toBe(true);
    expect(ConfigMatching.safeParse(configV1).success).toBe(true);
    expect(SolicitudMatching.safeParse(solicitudMatchingValida).success).toBe(true);
    expect(TutorCandidato.safeParse(tutorCandidatoValido).success).toBe(true);
    expect(ResultadoMatching.safeParse(resultadoSinCandidatos).success).toBe(true);
  });

  it('rechaza los fixtures inválidos', () => {
    expect(FranjaHoraria.safeParse(franjaInvalida).success).toBe(false);
    expect(FranjaHoraria.safeParse(invalidos.franjaFinAntesInicio).success).toBe(false);
    expect(FranjaHoraria.safeParse(invalidos.franjaHoraInvalida).success).toBe(false);
    expect(TutorCandidato.safeParse(invalidos.candidatoNivelFueraDeRango).success).toBe(false);
    expect(SolicitudMatching.safeParse(invalidos.solicitudDuracionCorta).success).toBe(false);
    expect(ConfigMatching.safeParse(invalidos.configConCriterioExtra).success).toBe(false);
    expect(CandidatoDescartado.safeParse(invalidos.descartadoSinMotivos).success).toBe(false);
  });

  it('los pesos v1 suman 1', () => {
    const suma = Object.values(configV1.pesos).reduce((a, b) => a + b, 0);
    expect(suma).toBeCloseTo(1, 10);
  });
});

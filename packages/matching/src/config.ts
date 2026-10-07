import { CRITERIOS, type ConfigMatching } from '@tutorias/contracts/matching';

export const TOLERANCIA_SUMA_PESOS = 0.001;

export type ProblemaConfig = { path: string; message: string };

/**
 * Lista los problemas de una configuración (vacía si es válida): pesos ≥ 0 y finitos, suma 1
 * (± 0,001), `topN` ≥ 1 y `bloquesHorarioIdeal` ≥ 1. Los `path` sirven como `details` del 422.
 */
export function diagnosticarConfig(config: ConfigMatching): ProblemaConfig[] {
  const problemas: ProblemaConfig[] = [];
  let suma = 0;
  for (const criterio of CRITERIOS) {
    const peso = config.pesos[criterio];
    if (typeof peso !== 'number' || !Number.isFinite(peso) || peso < 0) {
      problemas.push({
        path: `pesos.${criterio}`,
        message: 'Debe ser un número mayor o igual a 0',
      });
    } else {
      suma += peso;
    }
  }
  if (problemas.length === 0 && Math.abs(suma - 1) > TOLERANCIA_SUMA_PESOS) {
    problemas.push({
      path: 'pesos',
      message: `Los pesos deben sumar 1 (suman ${Number(suma.toFixed(4))})`,
    });
  }
  if (!Number.isInteger(config.parametros.topN) || config.parametros.topN < 1) {
    problemas.push({ path: 'parametros.topN', message: 'Debe ser un entero mayor o igual a 1' });
  }
  if (
    !Number.isInteger(config.parametros.bloquesHorarioIdeal) ||
    config.parametros.bloquesHorarioIdeal < 1
  ) {
    problemas.push({
      path: 'parametros.bloquesHorarioIdeal',
      message: 'Debe ser un entero mayor o igual a 1',
    });
  }
  return problemas;
}

/** `true` si la configuración es válida (ver `diagnosticarConfig`). */
export function validarConfig(config: ConfigMatching): boolean {
  return diagnosticarConfig(config).length === 0;
}

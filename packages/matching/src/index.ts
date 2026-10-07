/**
 * @tutorias/matching — motor puro (Dev 4, fase F6). Sin Express, Knex ni I/O (regla de lint).
 *
 *   evaluar(solicitud, candidatos, config) → ResultadoMatching
 *   validarConfig(config) → boolean          diagnosticarConfig(config) → problemas
 *   franjas.*                                 también en `@tutorias/matching/franjas`
 */
export { evaluar } from './evaluar';
export {
  diagnosticarConfig,
  validarConfig,
  TOLERANCIA_SUMA_PESOS,
  type ProblemaConfig,
} from './config';
export { compararCandidatos } from './desempate';
export { CRITERIOS_V1 } from './criterios';
export * as franjas from './franjas';

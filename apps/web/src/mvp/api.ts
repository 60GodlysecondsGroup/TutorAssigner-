/** MVP de demo: tipos y hook mínimo de carga sobre el cliente HTTP compartido. */
import { useCallback, useEffect, useState } from 'react';
import type { FranjaHoraria, PreferenciasMatching } from '@tutorias/contracts/matching';
import { ApiError, request } from '../shared/api';

export type Materia = { id: string; codigo: string; nombre: string; activa: boolean };
export type Estudiante = {
  id: string;
  nombre: string;
  email: string;
  codigo: string | null;
  programa: string | null;
  semestre: number | null;
};
export type Solicitud = {
  id: string;
  estudianteId: string;
  estudianteNombre: string;
  materiaId: string;
  materiaNombre: string;
  tema: string | null;
  duracionSesionMin: number;
  preferencias: PreferenciasMatching;
  estado: 'ABIERTA' | 'ASIGNADA' | 'CANCELADA';
  franjas: FranjaHoraria[];
  createdAt: string;
};

export function mensajeError(err: unknown): string {
  if (err instanceof ApiError) {
    const detalle = err.details
      .map((d) => `${d.path ? `${d.path}: ` : ''}${d.message}`)
      .join(' · ');
    return detalle ? `${err.message} (${detalle})` : err.message;
  }
  return 'Error inesperado';
}

/** GET con estado de carga/error y `recargar()`. */
export function useCarga<T>(url: string | null) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!url) return;
    let vivo = true;
    setCargando(true);
    request<T>(url)
      .then((d) => {
        if (vivo) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: unknown) => vivo && setError(mensajeError(e)))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [url, version]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, cargando, recargar };
}

export const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const formatoFranja = (f: FranjaHoraria) => `${DIAS[f.dia - 1]} ${f.inicio}–${f.fin}`;

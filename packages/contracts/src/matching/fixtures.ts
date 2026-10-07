import type { FranjaHoraria } from './index';

export const franjaValida: FranjaHoraria = {
  dia: 1,
  inicio: '09:00',
  fin: '10:30',
};

export const franjaInvalida: FranjaHoraria = {
  dia: 1,
  inicio: '10:00',
  fin: '09:00',
};

export const invalidos = {
  franjaFinAntesInicio: {
    dia: 2,
    inicio: '14:00',
    fin: '13:00',
  },
  franjaHoraInvalida: {
    dia: 3,
    inicio: '25:00',
    fin: '26:00',
  },
};

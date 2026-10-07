import { z } from 'zod';

export const HoraHHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
  message: 'La hora debe estar en formato HH:mm',
});

export const DiaSemana = z.number().int().min(1).max(7);

export const FranjaHoraria = z
  .object({
    dia: DiaSemana,
    inicio: HoraHHMM,
    fin: HoraHHMM,
  })
  .refine(
    ({ inicio, fin }) => {
      const parse = (value: string) => {
        const [hours, minutes] = value.split(':');
        return Number(hours) * 60 + Number(minutes);
      };

      return parse(fin) > parse(inicio);
    },
    {
      message: 'La franja debe terminar después de comenzar',
      path: ['fin'],
    },
  );

export type DiaSemana = z.infer<typeof DiaSemana>;
export type HoraHHMM = z.infer<typeof HoraHHMM>;
export type FranjaHoraria = z.infer<typeof FranjaHoraria>;

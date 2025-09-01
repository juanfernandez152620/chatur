// app/api/chat/route.js

import { openai } from '@ai-sdk/openai';
import {
  streamText,
  convertToModelMessages,
  tool,
} from 'ai';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o-mini'),
    messages: convertToModelMessages(messages),
    tools: {
      // --- INICIO DE LA NUEVA HERRAMIENTA: ConsultarArticulos ---
      ConsultarArticulos: tool({
        description: 'Busca artículos o notas en el sitio web. Se puede buscar por un término clave y opcionalmente filtrar por una localidad.',
        inputSchema: z.object({
          busqueda: z.string().describe('La palabra o frase a buscar en los artículos. Por ejemplo: "gastronomía", "humita".'),
          localidad: z.string().optional().describe('Filtra los artículos por una localidad específica. Por ejemplo: "San Javier".')
        }),
        execute: async ({ busqueda, localidad }) => {
          // Reutilizamos el mismo mapa de localidades
          const localidadMap = {
            'san miguel de tucumán': 1,
            'yerba buena': 58,
            'tafí del valle': 51,
            'el cadillal': 62,
            'san javier': 56,
          };
          
          // Reemplaza '[URL_DE_TU_API]' si es diferente
          const baseUrl = 'https://tucumanturismo.gob.ar/api/v1/api/buscador';
          const params = new URLSearchParams();

          // Parámetros fijos y obligatorios
          params.append('limit', '10');
          params.append('offset', '0');
          params.append('idioma', 'ES'); // Fijamos el idioma en Español

          // Parámetro de búsqueda obligatorio
          params.append('busqueda', busqueda);
          
          if (localidad) {
            const normalizedLocalidad = localidad.toLowerCase();
            const localidadId = localidadMap[normalizedLocalidad];
            if (localidadId) {
              params.append('localidad', localidadId.toString());
            } else {
              return { error: `La localidad "${localidad}" para filtrar artículos no es válida.` };
            }
          }

          console.log(`Parámetros de la solicitud: ${params.toString()}`);
          const fullUrl = `${baseUrl}?${params.toString()}`;
          console.log(`Fetching Artículos: ${fullUrl}`);

          try {
            const response = await fetch(fullUrl);
            if (!response.ok) {
              throw new Error(`Error de red: ${response.statusText}`);
            }
            const data = await response.json();
            return data.result; 
          } catch (error) {
            console.error('Error al llamar a la API de artículos:', error);
            return { error: 'No se pudo conectar con el servicio de búsqueda de artículos.' };
          }
        },
      }),
      // --- FIN DE LA NUEVA HERRAMIENTA ---

      ConsultarPrestadores: tool({
        description: 'Consulta prestadores de servicios turísticos. Se puede filtrar por un término de búsqueda, una actividad específica (como kayak, trekking, etc.) o una localidad.',
        inputSchema: z.object({
          busqueda: z.string().optional().describe('Término de búsqueda general. Por ejemplo: "guía de montaña", "aventura".'),
          localidad: z.string().optional().describe('La localidad donde buscar el prestador. Por ejemplo: "Tafí del Valle", "El Cadillal".'),
          actividad: z.string().optional().describe('La actividad específica a buscar. Por ejemplo: "kayak", "trekking", "ciclismo".')
        }),
        execute: async ({ busqueda, localidad, actividad }) => {
          const localidadMap = {
            'san miguel de tucumán': 1,
            'yerba buena': 58,
            'tafí del valle': 51,
            'el cadillal': 62,
            'san javier': 56,
          };
          const actividadMap = {
            'kayak': 1, 'alta montaña': 2, 'cabalgata': 3, 'tirolesa': 4, 'trekking': 5, 'paracaidismo': 6, 'ciclismo': 7, 'mountain bike': 7, 'paseo en barco': 8, 'parapente': 10, 'rappel': 11, 'safari fotografico': 12, 'fotografia': 12, 'escalada': 13, 'canyoning': 14, 'senderismo': 15,
          };
          const baseUrl = 'https://tucumanturismo.gob.ar/api/v1/api/prestadores';
          const params = new URLSearchParams();
          params.append('limit', '10');
          params.append('offset', '0');
          if (busqueda) { params.append('busqueda', busqueda); }
          if (localidad) {
            const localidadId = localidadMap[localidad.toLowerCase()];
            if (localidadId) { params.append('localidad', localidadId.toString()); } 
            else { return { error: `La localidad "${localidad}" no es válida.` }; }
          }
          if (actividad) {
            const actividadId = actividadMap[actividad.toLowerCase()];
            if (actividadId) { params.append('actividad', actividadId.toString()); } 
            else { return { error: `La actividad "${actividad}" no es válida.` }; }
          }
          const fullUrl = `${baseUrl}?${params.toString()}`;
          try {
            const response = await fetch(fullUrl);
            if (!response.ok) { throw new Error(`Error de red: ${response.statusText}`); }
            const data = await response.json();
            return data.result; 
          } catch (error) {
            return { error: 'No se pudo conectar con el servicio de búsqueda de prestadores.' };
          }
        },
      }),
      ConsultCars: tool({
        description: 'Consulta agencias de alquiler de autos. Se puede filtrar por el nombre de la agencia o por la localidad donde se encuentra.',
        inputSchema: z.object({
          nombre: z.string().optional().describe('El nombre o parte del nombre de la agencia de autos a buscar.'),
          localidad: z.string().optional().describe('La localidad donde buscar la agencia. Por ejemplo: "San Miguel de Tucumán".')
        }),
        execute: async ({ nombre, localidad }) => {
          const localidadMap = {
            'san miguel de tucumán': 1, 'yerba buena': 58, 'tafí del valle': 51, 'cadillal': 62,
          };
          const baseUrl = 'https://tucumanturismo.gob.ar/api/v1/api/autos';
          const params = new URLSearchParams();
          params.append('limit', '3');
          params.append('offset', '0');
          if (nombre) { params.append('nombre', nombre); }
          if (localidad) {
            const localidadId = localidadMap[localidad.toLowerCase()];
            if (localidadId) { params.append('localidad', localidadId.toString()); } 
            else { return { error: `La localidad "${localidad}" no es válida.` }; }
          }
          const fullUrl = `${baseUrl}?${params.toString()}`;
          try {
            const response = await fetch(fullUrl);
            if (!response.ok) { throw new Error(`Error de red: ${response.statusText}`); }
            const data = await response.json();
            return data.result;
          } catch (error) {
            return { error: 'No se pudo conectar con el servicio de búsqueda de autos.' };
          }
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}

// import { openai } from '@ai-sdk/openai';
// import {
//   streamText,
//   convertToModelMessages,
//   tool,
// } from 'ai';
// import { z } from 'zod';

// export const maxDuration = 30;

// export async function POST(req) {
//   const { messages } = await req.json();

//   const result = streamText({
//     model: openai('gpt-4o-mini'),
//     messages: convertToModelMessages(messages),
//     tools: {
//       // --- INICIO DE LA NUEVA HERRAMIENTA: ConsultarPrestadores ---
//       ConsultarPrestadores: tool({
//         description: 'Consulta prestadores de servicios turísticos. Se puede filtrar por un término de búsqueda, una actividad específica (como kayak, trekking, etc.) o una localidad.',
//         inputSchema: z.object({
//           busqueda: z.string().optional().describe('Término de búsqueda general. Por ejemplo: "guía de montaña", "aventura".'),
//           localidad: z.string().optional().describe('La localidad donde buscar el prestador. Por ejemplo: "Tafí del Valle", "El Cadillal".'),
//           actividad: z.string().optional().describe('La actividad específica a buscar. Por ejemplo: "kayak", "trekking", "ciclismo".')
//         }),
//         execute: async ({ busqueda, localidad, actividad }) => {
//           // Mapeo de nombres de localidad a sus IDs.
//           const localidadMap = {
//             'san miguel de tucumán': 1,
//             'yerba buena': 58,
//             'tafí del valle': 51,
//             'el cadillal': 62,
//             'san javier': 56,
//           };

//           // Mapeo de nombres de actividades a sus IDs.
//           const actividadMap = {
//             'kayak': 1,
//             'alta montaña': 2,
//             'cabalgata': 3,
//             'tirolesa': 4,
//             'trekking': 5,
//             'paracaidismo': 6,
//             'ciclismo': 7,
//             'mountain bike': 7, // Alias para ciclismo
//             'paseo en barco': 8,
//             'parapente': 10,
//             'rappel': 11,
//             'safari fotografico': 12,
//             'fotografia': 12, // Alias
//             'escalada': 13,
//             'canyoning': 14,
//             'senderismo': 15,
//           };
          
//           const baseUrl = 'https://tucumanturismo.gob.ar/api/v1/api/prestadores';
//           const params = new URLSearchParams();

//           // Hardcodeamos limit y offset
//           params.append('limit', '10');
//           params.append('offset', '0');
          
//           if (busqueda) {
//             params.append('busqueda', busqueda);
//           }

//           if (localidad) {
//             const normalizedLocalidad = localidad.toLowerCase();
//             const localidadId = localidadMap[normalizedLocalidad];
//             if (localidadId) {
//               params.append('localidad', localidadId.toString());
//             } else {
//               return { error: `La localidad "${localidad}" no es válida.` };
//             }
//           }

//           if (actividad) {
//             const normalizedActividad = actividad.toLowerCase();
//             const actividadId = actividadMap[normalizedActividad];
//             if (actividadId) {
//               params.append('actividad', actividadId.toString());
//             } else {
//               return { error: `La actividad "${actividad}" no es válida.` };
//             }
//           }

//           const fullUrl = `${baseUrl}?${params.toString()}`;
//           console.log(`Fetching Prestadores: ${fullUrl}`);

//           try {
//             const response = await fetch(fullUrl);
//             if (!response.ok) {
//               throw new Error(`Error de red: ${response.statusText}`);
//             }
//             const data = await response.json();
//             return data.result; 
//           } catch (error) {
//             console.error('Error al llamar a la API de prestadores:', error);
//             return { error: 'No se pudo conectar con el servicio de búsqueda de prestadores.' };
//           }
//         },
//       }),
//       // --- FIN DE LA NUEVA HERRAMIENTA ---

//       ConsultCars: tool({
//         description: 'Consulta agencias de alquiler de autos. Se puede filtrar por el nombre de la agencia o por la localidad donde se encuentra.',
//         inputSchema: z.object({
//           nombre: z.string().optional().describe('El nombre o parte del nombre de la agencia de autos a buscar.'),
//           localidad: z.string().optional().describe('La localidad donde buscar la agencia. Por ejemplo: "San Miguel de Tucumán".')
//         }),
//         execute: async ({ nombre, localidad }) => {
//           const localidadMap = {
//             'san miguel de tucumán': 1,
//             'yerba buena': 58,
//             'tafí del valle': 51,
//             'cadillal': 62,
//           };

//           const baseUrl = 'https://tucumanturismo.gob.ar/api/v1/api/autos';
//           const params = new URLSearchParams();
//           params.append('limit', '3');
//           params.append('offset', '0');

//           if (nombre) {
//             params.append('nombre', nombre);
//           }

//           if (localidad) {
//             const normalizedLocalidad = localidad.toLowerCase();
//             const localidadId = localidadMap[normalizedLocalidad];
//             if (localidadId) {
//               params.append('localidad', localidadId.toString());
//             } else {
//               return { error: `La localidad "${localidad}" no es válida.` };
//             }
//           }

//           const fullUrl = `${baseUrl}?${params.toString()}`;
//           console.log(`Fetching: ${fullUrl}`);

//           try {
//             const response = await fetch(fullUrl);
//             if (!response.ok) {
//               throw new Error(`Error de red: ${response.statusText}`);
//             }
//             const data = await response.json();
//             return data.result;
//           } catch (error) {
//             console.error('Error al llamar a la API de autos:', error);
//             return { error: 'No se pudo conectar con el servicio de búsqueda de autos.' };
//           }
//         },
//       }),
//     },
//   });

//   return result.toUIMessageStreamResponse();
// }



// // app/api/chat/route.js

// import { openai } from '@ai-sdk/openai';
// import {
//   streamText,
//   convertToModelMessages,
//   tool,
// } from 'ai';
// import { z } from 'zod';

// export const maxDuration = 30;

// export async function POST(req) {
//   const { messages } = await req.json();

//   const result = streamText({
//     model: openai('gpt-4o-mini'),
//     messages: convertToModelMessages(messages),
//     tools: {
//       ConsultCars: tool({
//         description: 'Consulta agencias de alquiler de autos. Se puede filtrar por el nombre de la agencia o por la localidad donde se encuentra.',
//         inputSchema: z.object({
//           nombre: z.string().optional().describe('El nombre o parte del nombre de la agencia de autos a buscar.'),
//           localidad: z.string().optional().describe('La localidad donde buscar la agencia. Por ejemplo: "San Miguel de Tucumán".')
//         }),
//         execute: async ({ nombre, localidad }) => {
//           // Mapeo de nombres de localidad a sus IDs numéricos.
//           // ¡Puedes expandir esta lista con todas tus localidades!
//           const localidadMap = {
//             'san miguel de tucumán': 1,
//             'yerba buena': 58,
//             'tafí del valle': 51,
//             'Cadillal': 62, 
//           };

//           // Reemplaza '[URL]' con la URL base de tu API
//           const baseUrl = 'https://tucumanturismo.gob.ar/api/v1/api/autos';
//           const params = new URLSearchParams();

//           // Hardcodeamos limit y offset como pediste
//           params.append('limit', '3');
//           params.append('offset', '0');

//           if (nombre) {
//             params.append('nombre', nombre);
//           }

//           if (localidad) {
//             const normalizedLocalidad = localidad.toLowerCase();
//             const localidadId = localidadMap[normalizedLocalidad];
//             if (localidadId) {
//               params.append('localidad', localidadId.toString());
//             } else {
//               return { error: `La localidad "${localidad}" no es válida.` };
//             }
//           }

//           const fullUrl = `${baseUrl}?${params.toString()}`;
//           console.log(`Fetching: ${fullUrl}`); // Útil para debugging

//           try {
//             console.log('Llamando a la API de autos...');
//             console.log(`URL: ${fullUrl}`);
//             const response = await fetch(fullUrl);
//             if (!response.ok) {
//               throw new Error(`Error de red: ${response.statusText}`);
//             }
//             const data = await response.json();
//             console.log(data);
//             return data.result; // Devolvemos solo el array de resultados
//           } catch (error) {
//             console.error('Error al llamar a la API de autos:', error);
//             return { error: 'No se pudo conectar con el servicio de búsqueda de autos.' };
//           }
//         },
//       }),

//       weather: tool({
//         description: 'Get the weather in a location (fahrenheit)',
//         inputSchema: z.object({
//           location: z.string().describe('The location to get the weather for'),
//         }),
//         execute: async ({ location }) => {
//           const temperature = Math.round(Math.random() * (90 - 32) + 32);
//           return {
//             location,
//             temperature,
//           };
//         },
//       }),
//       convertFahrenheitToCelsius: tool({
//         description: 'Convert a temperature in fahrenheit to celsius',
//         inputSchema: z.object({
//           temperature: z
//             .number()
//             .describe('The temperature in fahrenheit to convert'),
//         }),
//         execute: async ({ temperature }) => {
//           const celsius = Math.round((temperature - 32) * (5 / 9));
//           return {
//             celsius,
//           };
//         },
//       }),
//     },
//   });

//   return result.toUIMessageStreamResponse();
// }





// // app/api/chat/route.js

// import { openai } from '@ai-sdk/openai';
// import {
//   streamText,
//   convertToModelMessages,
//   tool,
//   stepCountIs,
// } from 'ai';
// import { z } from 'zod';

// export const maxDuration = 30;

// export async function POST(req) {
//   const { messages } = await req.json();

//   const result = streamText({
//     model: openai('gpt-4o-mini'),
//     messages: convertToModelMessages(messages),
//     stopWhen: stepCountIs(5), // <-- Añadido
//     tools: {
//       weather: tool({
//         description: 'Get the weather in a location (fahrenheit)',
//         inputSchema: z.object({
//           location: z.string().describe('The location to get the weather for'),
//         }),
//         execute: async ({ location }) => {
//           const temperature = Math.round(Math.random() * (90 - 32) + 32);
//           return {
//             location,
//             temperature,
//           };
//         },
//       }),
//       convertFahrenheitToCelsius: tool({ // <-- Nueva herramienta
//         description: 'Convert a temperature in fahrenheit to celsius',
//         inputSchema: z.object({
//           temperature: z
//             .number()
//             .describe('The temperature in fahrenheit to convert'),
//         }),
//         execute: async ({ temperature }) => {
//           const celsius = Math.round((temperature - 32) * (5 / 9));
//           return {
//             celsius,
//           };
//         },
//       }),
//     },
//   });

//   return result.toUIMessageStreamResponse();
// }
